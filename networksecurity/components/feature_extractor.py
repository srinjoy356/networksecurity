"""
networksecurity/components/feature_extractor.py
================================================
Extracts all 30 UCI phishing-detection features from a raw URL and
returns a FeatureExtractionArtifact that can be passed straight into
the trained model pipeline.

No external paid APIs are used. Features are derived from:
  • URL string parsing         (stdlib: re, socket, ipaddress, ssl, urllib)
  • DNS A-record resolution    (dnspython with socket fallback)
  • WHOIS domain lookup        (python-whois)
  • Live HTTP page fetch       (requests + beautifulsoup4)
  • Optional local CSV files   (Tranco, PhishTank — free downloads, no key)

Install dependencies once:
    pip install requests beautifulsoup4 python-whois dnspython

Feature encoding follows the original UCI paper:
    -1 = Phishing  |  0 = Suspicious  |  1 = Legitimate
"""

import socket
import ipaddress
import ssl
import os
import csv
import sys
from urllib.parse import urlparse
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

from networksecurity.entity.config_entity import FeatureExtractionConfig
from networksecurity.entity.artifact_entity import FeatureExtractionArtifact
from networksecurity.exception.exception import NetworkSecurityException
from networksecurity.logging.logger import logging


# ── optional heavy imports (graceful degradation) ───────────────────────────
try:
    import requests
    from bs4 import BeautifulSoup
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False
    logging.warning(
        "requests / beautifulsoup4 not installed — "
        "HTML-based features will default to 1 (legitimate)."
    )

try:
    import whois
    WHOIS_AVAILABLE = True
except ImportError:
    WHOIS_AVAILABLE = False
    logging.warning(
        "python-whois not installed — "
        "WHOIS-based features will default to -1 (phishing)."
    )

try:
    import dns.resolver
    DNS_AVAILABLE = True
except ImportError:
    DNS_AVAILABLE = False
    logging.warning("dnspython not installed — using socket fallback for DNS.")


# ── constants ────────────────────────────────────────────────────────────────

#: Ordered feature names — must match phisingData.csv column order exactly.
FEATURE_NAMES: List[str] = [
    "having_IP_Address",
    "URL_Length",
    "Shortining_Service",
    "having_At_Symbol",
    "double_slash_redirecting",
    "Prefix_Suffix",
    "having_Sub_Domain",
    "SSLfinal_State",
    "Domain_registeration_length",
    "Favicon",
    "port",
    "HTTPS_token",
    "Request_URL",
    "URL_of_Anchor",
    "Links_in_tags",
    "SFH",
    "Submitting_to_email",
    "Abnormal_URL",
    "Redirect",
    "on_mouseover",
    "RightClick",
    "popUpWidnow",
    "Iframe",
    "age_of_domain",
    "DNSRecord",
    "web_traffic",
    "Page_Rank",
    "Google_Index",
    "Links_pointing_to_page",
    "Statistical_report",
]

_SHORTENERS = {
    "bit.ly", "goo.gl", "shorte.st", "go2l.ink", "x.co", "ow.ly",
    "t.co", "tinyurl.com", "tr.im", "is.gd", "cli.gs", "yfrog.com",
    "migre.me", "ff.im", "tiny.cc", "url4.eu", "twit.ac", "su.pr",
    "twurl.nl", "snipurl.com", "short.to", "BudURL.com", "ping.fm",
    "post.ly", "Just.as", "bkite.com", "snipr.com", "fic.kr",
    "loopt.us", "doiop.com", "short.ie", "kl.am", "wp.me",
    "rubyurl.com", "om.ly", "to.ly", "bit.do", "t2m.io", "qr.ae",
    "adf.ly", "dlvr.it", "youtu.be", "rb.gy", "cutt.ly",
}

_STANDARD_PORTS: Dict[str, set] = {
    "http": {80},
    "https": {443},
    "ftp": {21},
}


# ═══════════════════════════════════════════════════════════════════════════
# COMPONENT
# ═══════════════════════════════════════════════════════════════════════════

class FeatureExtractor:
    """
    Phishing-URL feature extractor component.

    Mirrors the constructor pattern of DataIngestion / DataValidation /
    DataTransformation — takes a typed config, exposes an initiate_* method,
    and returns a typed artifact.

    Usage
    -----
    config    = FeatureExtractionConfig()
    extractor = FeatureExtractor(config)

    # Full pipeline step → FeatureExtractionArtifact (includes prediction)
    artifact = extractor.initiate_feature_extraction(url, preprocessor, classifier)

    # Or just the raw feature dict / vector (no model needed)
    features  = extractor.extract(url)
    vector    = extractor.extract_as_vector(url)
    """

    def __init__(self, feature_extraction_config: FeatureExtractionConfig):
        try:
            self.config = feature_extraction_config
            self._phishing_domains: set = set()
            self._tranco_ranks: Dict[str, int] = {}
            self._load_phishtank()
            self._load_tranco()
        except Exception as e:
            raise NetworkSecurityException(e, sys)

    # ── optional local-file loaders ─────────────────────────────────────────

    def _load_phishtank(self) -> None:
        path = self.config.phishtank_csv_path
        if not path or not os.path.isfile(path):
            return
        try:
            with open(path, newline="", encoding="utf-8", errors="ignore") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    url = row.get("url", "") or row.get("phish_url", "")
                    if url:
                        host = (urlparse(url).hostname or "").lower()
                        if host:
                            self._phishing_domains.add(host)
            logging.info(f"PhishTank: loaded {len(self._phishing_domains)} phishing domains")
        except Exception as e:
            logging.warning(f"Could not load PhishTank CSV: {e}")

    def _load_tranco(self) -> None:
        path = self.config.tranco_csv_path
        if not path or not os.path.isfile(path):
            return
        try:
            with open(path, newline="", encoding="utf-8", errors="ignore") as f:
                for line in f:
                    parts = line.strip().split(",")
                    if len(parts) >= 2:
                        try:
                            self._tranco_ranks[parts[1].strip()] = int(parts[0].strip())
                        except ValueError:
                            pass
            logging.info(f"Tranco: loaded {len(self._tranco_ranks)} ranked domains")
        except Exception as e:
            logging.warning(f"Could not load Tranco CSV: {e}")

    # ── private helpers ──────────────────────────────────────────────────────

    @staticmethod
    def _normalise_url(url: str) -> str:
        if not url.startswith(("http://", "https://")):
            return "http://" + url
        return url

    def _fetch(self, url: str) -> Tuple[Optional[object], Optional[object]]:
        if not REQUESTS_AVAILABLE or not self.config.fetch_page:
            return None, None
        try:
            resp = requests.get(
                url,
                timeout=self.config.request_timeout,
                allow_redirects=True,
                headers={"User-Agent": self.config.user_agent},
            )
            soup = BeautifulSoup(resp.text, "html.parser")
            return resp, soup
        except Exception:
            return None, None

    @staticmethod
    def _get_domain(parsed) -> str:
        return (parsed.hostname or "").lower()

    def _get_whois(self, domain: str):
        if not WHOIS_AVAILABLE:
            return None
        try:
            return whois.whois(domain)
        except Exception:
            return None

    # ── 30 feature methods ───────────────────────────────────────────────────

    def _having_IP_Address(self, parsed) -> int:
        try:
            ipaddress.ip_address(self._get_domain(parsed))
            return -1
        except ValueError:
            return 1

    def _URL_Length(self, url: str) -> int:
        n = len(url)
        if n < 54:
            return 1
        elif n <= 75:
            return 0
        return -1

    def _Shortining_Service(self, parsed) -> int:
        host = self._get_domain(parsed)
        for s in _SHORTENERS:
            if host == s or host.endswith("." + s):
                return -1
        return 1

    def _having_At_Symbol(self, url: str) -> int:
        return -1 if "@" in url else 1

    def _double_slash_redirecting(self, url: str) -> int:
        idx = url.find("//")
        rest = url[idx + 2:] if idx != -1 else url
        return -1 if "//" in rest else 1

    def _Prefix_Suffix(self, parsed) -> int:
        return -1 if "-" in self._get_domain(parsed) else 1

    def _having_Sub_Domain(self, parsed) -> int:
        host = self._get_domain(parsed).rstrip(".")
        dots = host.count(".")
        if dots == 1:
            return 1
        elif dots == 2:
            return 0
        return -1

    def _SSLfinal_State(self, parsed, resp) -> int:
        if parsed.scheme != "https":
            return -1
        if resp is not None:
            return 1
        host = self._get_domain(parsed)
        port = parsed.port or 443
        try:
            ctx = ssl.create_default_context()
            with ctx.wrap_socket(
                socket.create_connection((host, port), timeout=5),
                server_hostname=host,
            ):
                return 1
        except ssl.CertificateError:
            return 0
        except Exception:
            return 0

    def _Domain_registeration_length(self, domain: str, w) -> int:
        if w is None:
            return -1
        try:
            exp = w.expiration_date
            crt = w.creation_date
            if isinstance(exp, list):
                exp = exp[0]
            if isinstance(crt, list):
                crt = crt[0]
            if exp and crt:
                return 1 if (exp - crt).days > 365 else -1
        except Exception:
            pass
        return -1

    def _Favicon(self, parsed, soup) -> int:
        if soup is None:
            return 1
        host = self._get_domain(parsed)
        for tag in soup.find_all(
            "link", rel=lambda r: r and "icon" in " ".join(r).lower()
        ):
            href = tag.get("href", "")
            if href.startswith("http"):
                fav_host = (urlparse(href).hostname or "").lower()
                if fav_host and fav_host != host and not fav_host.endswith("." + host):
                    return -1
        return 1

    def _port(self, parsed) -> int:
        p = parsed.port
        if p is None:
            return 1
        std = _STANDARD_PORTS.get(parsed.scheme.lower(), set())
        return 1 if p in std else -1

    def _HTTPS_token(self, parsed) -> int:
        return -1 if "https" in self._get_domain(parsed) else 1

    def _Request_URL(self, parsed, soup) -> int:
        if soup is None:
            # Modal value in phishing class is -1 (55% of phishing rows).
            # Defaulting to 1 when page is unreachable badly biases the vector.
            return -1
        host = self._get_domain(parsed)
        total = external = 0
        for tag, attr in [("img", "src"), ("script", "src"), ("link", "href")]:
            for t in soup.find_all(tag):
                src = t.get(attr, "")
                if not src or src.startswith("data:"):
                    continue
                total += 1
                if src.startswith("http"):
                    h = (urlparse(src).hostname or "").lower()
                    if h and h != host and not h.endswith("." + host):
                        external += 1
        if total == 0:
            return 1
        ratio = external / total * 100
        return 1 if ratio < 22 else (0 if ratio <= 61 else -1)

    def _URL_of_Anchor(self, parsed, soup) -> int:
        if soup is None:
            # Modal value in phishing class is -1 (66% of phishing rows).
            return -1
        host = self._get_domain(parsed)
        total = unsafe = 0
        for a in soup.find_all("a", href=True):
            href = a["href"].strip()
            if not href or href.startswith("#") or href.lower().startswith("javascript"):
                unsafe += 1
                total += 1
                continue
            total += 1
            if href.startswith("http"):
                h = (urlparse(href).hostname or "").lower()
                if h and h != host and not h.endswith("." + host):
                    unsafe += 1
        if total == 0:
            return 1
        ratio = unsafe / total * 100
        return 1 if ratio < 31 else (0 if ratio <= 67 else -1)

    def _Links_in_tags(self, parsed, soup) -> int:
        if soup is None:
            # Modal value in phishing class is -1 (49% of phishing rows).
            return -1
        host = self._get_domain(parsed)
        total = external = 0
        for tag, attr in [("meta", "content"), ("link", "href"), ("script", "src")]:
            for t in soup.find_all(tag):
                val = t.get(attr, "")
                if not val or not val.startswith("http"):
                    continue
                total += 1
                h = (urlparse(val).hostname or "").lower()
                if h and h != host and not h.endswith("." + host):
                    external += 1
        if total == 0:
            return 1
        ratio = external / total * 100
        return 1 if ratio < 17 else (0 if ratio <= 81 else -1)

    def _SFH(self, parsed, soup) -> int:
        if soup is None:
            # Modal value in phishing class is -1 (87% of phishing rows).
            # This is the single strongest HTML signal — must not default to 1.
            return -1
        host = self._get_domain(parsed)
        for form in soup.find_all("form"):
            action = (form.get("action") or "").strip().lower()
            if not action or action in ("about:blank", "#", ""):
                return -1
            if action.startswith("http"):
                h = (urlparse(action).hostname or "").lower()
                if h and h != host and not h.endswith("." + host):
                    return 0
        return 1

    def _Submitting_to_email(self, soup) -> int:
        if soup is None:
            return 1
        return -1 if "mailto:" in str(soup).lower() else 1

    def _Abnormal_URL(self, parsed, w) -> int:
        if w is None:
            return -1
        host = self._get_domain(parsed)
        domain_core = host.split(".")[-2] if "." in host else host
        try:
            org = str(w.get("org", "") or "").lower()
            name = str(w.get("name", "") or "").lower()
            if domain_core in org or domain_core in name:
                return 1
        except Exception:
            pass
        return -1

    def _Redirect(self, resp) -> int:
        if resp is None:
            return 0
        return 1 if len(resp.history) >= 2 else 0

    def _on_mouseover(self, soup) -> int:
        if soup is None:
            return 1
        text = str(soup).lower()
        return -1 if ("onmouseover" in text and "window.status" in text) else 1

    def _RightClick(self, soup) -> int:
        if soup is None:
            return 1
        text = str(soup)
        for pat in ["event.button==2", "event.button === 2", "contextmenu", "oncontextmenu"]:
            if pat in text:
                return -1
        return 1

    def _popUpWidnow(self, soup) -> int:
        # note: intentional typo matches the dataset column name
        if soup is None:
            return 1
        return -1 if "window.open" in str(soup) else 1

    def _Iframe(self, soup) -> int:
        if soup is None:
            return 1
        return -1 if soup.find("iframe") else 1

    def _age_of_domain(self, domain: str, w) -> int:
        if w is None:
            return -1
        try:
            crt = w.creation_date
            if isinstance(crt, list):
                crt = crt[0]
            if crt:
                if crt.tzinfo is None:
                    crt = crt.replace(tzinfo=timezone.utc)
                age_days = (datetime.now(timezone.utc) - crt).days
                return 1 if age_days >= 180 else -1
        except Exception:
            pass
        return -1

    def _DNSRecord(self, domain: str) -> int:
        if DNS_AVAILABLE:
            try:
                dns.resolver.resolve(domain, "A")
                return 1
            except Exception:
                return -1
        try:
            socket.gethostbyname(domain)
            return 1
        except Exception:
            return -1

    def _web_traffic(self, domain: str) -> int:
        if self._tranco_ranks:
            rank = self._tranco_ranks.get(domain)
            if rank is None:
                return -1   # not in top-1M → low traffic → phishing signal
            if rank < 100_000:
                return 1
            elif rank < 1_000_000:
                return 0
            return -1
        # No Tranco list loaded.
        # Unknown traffic rank is more likely for phishing sites → -1.
        # Override to 0 (suspicious) only if DNS resolves (site exists publicly).
        try:
            socket.gethostbyname(domain)
            return 0   # resolves but rank unknown → suspicious
        except Exception:
            return -1  # doesn't resolve → phishing signal

    def _Page_Rank(self, domain: str) -> int:
        """Open PageRank public endpoint — free, no API key required."""
        if REQUESTS_AVAILABLE:
            try:
                resp = requests.get(
                    "https://openpagerank.com/api/v1.0/getPageRank",
                    params={"domains[]": domain},
                    headers={"API-OPR": ""},
                    timeout=self.config.request_timeout,
                )
                rank = resp.json()["response"][0].get("page_rank_integer", 0)
                return 1 if rank >= 4 else -1
            except Exception:
                pass
        return -1

    def _Google_Index(self, url: str, parsed) -> int:
        """
        Dataset only contains -1 or 1 for this feature (never 0).
        Proxy: domain resolves AND uses HTTPS → likely indexed (1).
        HTTP or unresolvable → not indexed (-1).
        """
        domain = self._get_domain(parsed)
        try:
            socket.gethostbyname(domain)
            # HTTPS = likely indexed; HTTP = likely not properly indexed
            return 1 if parsed.scheme == "https" else -1
        except Exception:
            return -1

    def _Links_pointing_to_page(self, domain: str, w) -> int:
        """Approximated from domain age — no backlink API needed."""
        if w is None:
            return -1
        try:
            crt = w.creation_date
            if isinstance(crt, list):
                crt = crt[0]
            if crt:
                if crt.tzinfo is None:
                    crt = crt.replace(tzinfo=timezone.utc)
                age_days = (datetime.now(timezone.utc) - crt).days
                if age_days > 730:
                    return 1
                elif age_days > 180:
                    return 0
        except Exception:
            pass
        return -1

    def _Statistical_report(self, parsed) -> int:
        host = self._get_domain(parsed)
        return -1 if host in self._phishing_domains else 1

    # ── public interface ─────────────────────────────────────────────────────

    def extract(self, url: str) -> Dict[str, int]:
        """
        Extract all 30 features from *url*.

        Returns
        -------
        dict  {feature_name: int}   — values in {-1, 0, 1}
        """
        try:
            url = self._normalise_url(url)
            parsed = urlparse(url)
            domain = self._get_domain(parsed)

            logging.info(f"Fetching page for: {url}")
            resp, soup = self._fetch(url)

            logging.info(f"Running WHOIS for: {domain}")
            w = self._get_whois(domain)

            features: Dict[str, int] = {
                "having_IP_Address":           self._having_IP_Address(parsed),
                "URL_Length":                  self._URL_Length(url),
                "Shortining_Service":          self._Shortining_Service(parsed),
                "having_At_Symbol":            self._having_At_Symbol(url),
                "double_slash_redirecting":    self._double_slash_redirecting(url),
                "Prefix_Suffix":               self._Prefix_Suffix(parsed),
                "having_Sub_Domain":           self._having_Sub_Domain(parsed),
                "SSLfinal_State":              self._SSLfinal_State(parsed, resp),
                "Domain_registeration_length": self._Domain_registeration_length(domain, w),
                "Favicon":                     self._Favicon(parsed, soup),
                "port":                        self._port(parsed),
                "HTTPS_token":                 self._HTTPS_token(parsed),
                "Request_URL":                 self._Request_URL(parsed, soup),
                "URL_of_Anchor":               self._URL_of_Anchor(parsed, soup),
                "Links_in_tags":               self._Links_in_tags(parsed, soup),
                "SFH":                         self._SFH(parsed, soup),
                "Submitting_to_email":         self._Submitting_to_email(soup),
                "Abnormal_URL":                self._Abnormal_URL(parsed, w),
                "Redirect":                    self._Redirect(resp),
                "on_mouseover":                self._on_mouseover(soup),
                "RightClick":                  self._RightClick(soup),
                "popUpWidnow":                 self._popUpWidnow(soup),
                "Iframe":                      self._Iframe(soup),
                "age_of_domain":               self._age_of_domain(domain, w),
                "DNSRecord":                   self._DNSRecord(domain),
                "web_traffic":                 self._web_traffic(domain),
                "Page_Rank":                   self._Page_Rank(domain),
                "Google_Index":                self._Google_Index(url, parsed),
                "Links_pointing_to_page":      self._Links_pointing_to_page(domain, w),
                "Statistical_report":          self._Statistical_report(parsed),
            }

            # Per-feature sanity check.
            # Most features: {-1, 0, 1}. Exceptions from the dataset:
            #   Redirect      → {0, 1}   only (never -1)
            #   Google_Index  → {-1, 1}  only (never 0)
            _redirect_valid      = {0, 1}
            _google_index_valid  = {-1, 1}
            _standard_valid      = {-1, 0, 1}
            for k, v in features.items():
                if k == "Redirect":
                    allowed = _redirect_valid
                elif k == "Google_Index":
                    allowed = _google_index_valid
                else:
                    allowed = _standard_valid
                if v not in allowed:
                    raise ValueError(
                        f"Feature '{k}' returned invalid value {v!r}. "
                        f"Expected one of {allowed}."
                    )

            return features

        except Exception as e:
            raise NetworkSecurityException(e, sys)

    def extract_as_vector(self, url: str) -> List[int]:
        """
        Returns features as an ordered list matching phisingData.csv columns.
        Pass directly into preprocessor.transform().
        """
        try:
            feat = self.extract(url)
            return [feat[name] for name in FEATURE_NAMES]
        except Exception as e:
            raise NetworkSecurityException(e, sys)

    def initiate_feature_extraction(
        self,
        url: str,
        preprocessor,
        classifier,
    ) -> FeatureExtractionArtifact:
        """
        Full pipeline step: extract → preprocess → predict.

        Parameters
        ----------
        url          : raw URL string to analyse
        preprocessor : fitted sklearn preprocessor (from preprocessor.pkl)
        classifier   : fitted sklearn classifier    (from model.pkl)

        Returns
        -------
        FeatureExtractionArtifact
        """
        try:
            import pandas as pd

            logging.info(f"Initiating feature extraction for: {url}")

            features = self.extract(url)

            # Ordered vector + DataFrame in exact training-schema column order.
            # Convert to numpy before predict → no sklearn FeatureNames warning,
            # same raw-array format the classifier was trained on.
            vector = [features[name] for name in FEATURE_NAMES]
            feature_df = pd.DataFrame([features])[FEATURE_NAMES]
            feature_array = preprocessor.transform(feature_df)         # (1, 30)
            prediction = int(classifier.predict(feature_array)[0])
            # DataTransformation replaced target -1 → 0 before training.
            # So model output: 0 = Phishing (original -1), 1 = Legitimate.
            label = "Legitimate" if prediction == 1 else "Phishing"

            phishing_signal_count   = sum(1 for v in features.values() if v == -1)
            suspicious_signal_count = sum(1 for v in features.values() if v == 0)

            artifact = FeatureExtractionArtifact(
                url=url,
                prediction=prediction,
                label=label,
                features=features,
                phishing_signal_count=phishing_signal_count,
                suspicious_signal_count=suspicious_signal_count,
                feature_vector=vector,
            )

            logging.info(
                f"Feature extraction complete | URL={url} | "
                f"Prediction={label} ({prediction}) | "
                f"Phishing signals={phishing_signal_count}/30 | "
                f"Suspicious signals={suspicious_signal_count}/30"
            )

            return artifact

        except Exception as e:
            raise NetworkSecurityException(e, sys)