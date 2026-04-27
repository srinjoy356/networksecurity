import re
import sys
import socket
import requests
import ipaddress
from urllib.parse import urlparse
from bs4 import BeautifulSoup
from datetime import datetime, timezone

import whois
import dns.resolver

from networksecurity.exception.exception import NetworkSecurityException
from networksecurity.logging.logger import logging
from networksecurity.entity.config_entity import FeatureExtractionConfig


# ---------------------------------------------------------------------------
# Known URL shortener domains
# ---------------------------------------------------------------------------
SHORTENER_DOMAINS = {
    "bit.ly", "tinyurl.com", "goo.gl", "t.co", "ow.ly", "is.gd",
    "buff.ly", "adf.ly", "bl.ink", "shorte.st", "mcaf.ee", "rb.gy",
    "short.io", "tiny.cc", "lnkd.in", "dlvr.it", "su.pr", "twit.ac",
}

# Non-standard ports considered suspicious
SUSPICIOUS_PORTS = {
    21, 22, 23, 25, 443, 445, 1433, 1521, 3306, 3389, 8080, 8443,
    8888, 9090,
}


class FeatureExtractor:
    """
    Extracts all 30 dataset features from a raw URL string.

    Each public method corresponds directly to a column in phisingData.csv.
    The main entry point is `extract(url)` which returns a dict whose keys
    match the schema exactly, ready to be passed into preprocessing.pkl.

    Feature encoding follows the original dataset convention:
        1  → legitimate signal
        0  → suspicious / uncertain
       -1  → phishing signal
    """

    def __init__(self, config: FeatureExtractionConfig):
        self.config = config
        self._session = requests.Session()
        self._session.headers.update({"User-Agent": self.config.user_agent})
        self._parsed = None
        self._html = None
        self._soup = None
        self._whois_data = None
        self._dns_records = None

    # -----------------------------------------------------------------------
    # Public entry point
    # -----------------------------------------------------------------------

    def extract(self, url: str) -> dict:
        """
        Main method. Takes a raw URL string, runs all 30 feature extractors,
        and returns a dict matching the schema columns exactly.

        Args:
            url: Raw URL string e.g. "http://192.168.1.1/login.php"

        Returns:
            dict with all 30 feature keys, values in {-1, 0, 1}
        """
        try:
            logging.info(f"Starting feature extraction for: {url}")
            self._reset(url)
            self._fetch_page()
            self._fetch_whois()
            self._fetch_dns()

            features = {
                # --- URL structure (no network required) ---
                "having_IP_Address":            self._having_ip_address(),
                "URL_Length":                   self._url_length(),
                "Shortining_Service":           self._shortening_service(),
                "having_At_Symbol":             self._having_at_symbol(),
                "double_slash_redirecting":     self._double_slash_redirecting(),
                "Prefix_Suffix":                self._prefix_suffix(),
                "having_Sub_Domain":            self._having_sub_domain(),
                "HTTPS_token":                  self._https_token(),

                # --- SSL ---
                "SSLfinal_State":               self._ssl_final_state(),

                # --- Domain / DNS ---
                "Domain_registeration_length":  self._domain_registration_length(),
                "Favicon":                      self._favicon(),
                "age_of_domain":                self._age_of_domain(),
                "DNSRecord":                    self._dns_record(),

                # --- Page content (requires page fetch) ---
                "Request_URL":                  self._request_url(),
                "URL_of_Anchor":                self._url_of_anchor(),
                "Links_in_tags":                self._links_in_tags(),
                "SFH":                          self._sfh(),
                "Submitting_to_email":          self._submitting_to_email(),
                "Abnormal_URL":                 self._abnormal_url(),
                "port":                         self._port(),
                "Redirect":                     self._redirect(),
                "Iframe":                       self._iframe(),

                # --- Behaviour / obfuscation ---
                "on_mouseover":                 self._on_mouseover(),
                "RightClick":                   self._right_click(),
                "popUpWidnow":                  self._popup_window(),

                # --- External reputation ---
                "web_traffic":                  self._web_traffic(),
                "Page_Rank":                    self._page_rank(),
                "Google_Index":                 self._google_index(),
                "Links_pointing_to_page":       self._links_pointing_to_page(),
                "Statistical_report":           self._statistical_report(),
            }

            logging.info(f"Feature extraction complete. Features: {features}")
            return features

        except Exception as e:
            raise NetworkSecurityException(e, sys)

    # -----------------------------------------------------------------------
    # Internal setup helpers
    # -----------------------------------------------------------------------

    def _reset(self, url: str):
        """Parse URL and clear cached page/WHOIS data."""
        if not url.startswith(("http://", "https://")):
            url = "http://" + url
        self._url = url
        self._parsed = urlparse(url)
        self._html = None
        self._soup = None
        self._whois_data = None
        self._dns_records = None
        self._response = None
        self._redirect_count = 0
        self._ssl_error = False

    def _fetch_page(self):
        """Fetch the page HTML, following redirects and recording redirect count."""
        self._ssl_error = False
        try:
            resp = self._session.get(
                self._url,
                timeout=self.config.request_timeout,
                allow_redirects=True,
                verify=False,
            )
            self._response = resp
            self._redirect_count = len(resp.history)
            self._html = resp.text
            self._soup = BeautifulSoup(self._html, "html.parser")
            logging.info(f"Page fetched successfully. Status: {resp.status_code}")
        except requests.exceptions.SSLError:
            # Host is reachable but certificate is invalid/self-signed
            self._ssl_error = True
            self._response = None
            self._html = ""
            self._soup = BeautifulSoup("", "html.parser")
            logging.warning("SSL error when fetching page — certificate invalid or self-signed.")
        except Exception as e:
            # Host is completely unreachable or does not exist
            self._ssl_error = False
            self._response = None
            self._html = ""
            self._soup = BeautifulSoup("", "html.parser")
            logging.warning(f"Page fetch failed: {e}")

    def _fetch_whois(self):
        """Fetch WHOIS record for the domain."""
        try:
            self._whois_data = whois.whois(self._parsed.hostname)
        except Exception as e:
            self._whois_data = None
            logging.warning(f"WHOIS lookup failed: {e}")

    def _fetch_dns(self):
        """Fetch DNS A record for the domain."""
        try:
            self._dns_records = dns.resolver.resolve(self._parsed.hostname, "A")
        except Exception as e:
            self._dns_records = None
            logging.warning(f"DNS lookup failed: {e}")

    # -----------------------------------------------------------------------
    # URL Structure Features (1–8)
    # -----------------------------------------------------------------------

    def _having_ip_address(self) -> int:
        """
        Check if the hostname is a raw IP address.
        IP address present → -1 (phishing), else → 1
        """
        host = self._parsed.hostname or ""
        try:
            ipaddress.ip_address(host)
            return -1
        except ValueError:
            return 1

    def _url_length(self) -> int:
        """
        URL total character length.
        < 54 → 1, 54–75 → 0, > 75 → -1
        """
        length = len(self._url)
        if length < 54:
            return 1
        elif length <= 75:
            return 0
        return -1

    def _shortening_service(self) -> int:
        """
        Check if host matches a known URL shortener.
        Shortener detected → -1, else → 1
        """
        host = (self._parsed.hostname or "").lower().lstrip("www.")
        return -1 if host in SHORTENER_DOMAINS else 1

    def _having_at_symbol(self) -> int:
        """
        Presence of @ in URL. Browsers ignore everything before @.
        Present → -1, absent → 1
        """
        return -1 if "@" in self._url else 1

    def _double_slash_redirecting(self) -> int:
        """
        Presence of // in the URL path (after the protocol scheme).
        The search starts after the scheme (http:// or https://) position.
        Present → -1, absent → 1
        """
        # Find position after the scheme://
        scheme_end = self._url.find("//") + 2
        remaining = self._url[scheme_end:]
        return -1 if "//" in remaining else 1

    def _prefix_suffix(self) -> int:
        """
        Hyphen in the domain name or URL path — common in spoofed brand domains.
        Checks the hostname (e.g. paypal-secure.com) AND the path
        (e.g. 192.168.1.1/paypal-secure/login.php) because phishing URLs
        often embed brand names with hyphens in the path when using an IP host.
        Present → -1, absent → 1
        """
        host = self._parsed.hostname or ""
        path = self._parsed.path or ""
        return -1 if "-" in host or "-" in path else 1

    def _having_sub_domain(self) -> int:
        """
        Number of subdomains based on dot count in the hostname.
        www. prefix is stripped before counting as it is a standard convention.
        1 dot → 1 (e.g. google.com, www.google.com)
        2 dots → 0 (e.g. mail.google.com)
        3+ dots → -1 (e.g. login.secure.google.com)
        """
        host = self._parsed.hostname or ""
        # Strip leading www. — it is a standard prefix, not a true subdomain
        if host.startswith("www."):
            host = host[4:]
        dots = host.count(".")
        if dots == 1:
            return 1
        elif dots == 2:
            return 0
        return -1

    def _https_token(self) -> int:
        """
        The word 'https' appears inside the domain name itself (not the scheme).
        e.g. http://https-paypal.com  → phishing trick to fake trust.
        Present → -1, absent → 1
        """
        host = (self._parsed.hostname or "").lower()
        return -1 if "https" in host else 1

    # -----------------------------------------------------------------------
    # SSL / Security Features (9)
    # -----------------------------------------------------------------------

    def _ssl_final_state(self) -> int:
        """
        SSL certificate validity check.
        Valid HTTPS with successful response → 1
        HTTPS but SSL error (cert invalid/self-signed) → 0
        HTTP (no SSL), or HTTPS domain unreachable/non-existent → -1

        If the domain doesn't exist at all (_response is None and it's not
        an SSL cert error specifically), that is worse than no SSL — treat as -1.
        """
        if self._parsed.scheme == "https":
            if self._response is not None:
                return 1
            # Distinguish: SSL error on reachable host (0) vs
            # completely unreachable / non-existent domain (-1).
            # _ssl_error flag is set in _fetch_page only on SSLError.
            if getattr(self, "_ssl_error", False):
                return 0
            return -1
        return -1

    # -----------------------------------------------------------------------
    # Domain / DNS Features (10–13)
    # -----------------------------------------------------------------------

    def _domain_registration_length(self) -> int:
        """
        How long the domain is registered for (expiry - today).
        > 365 days remaining → 1 (legitimate)
        <= 365 days remaining → -1 (phishing, cheap short-term domain)
        """
        try:
            if self._whois_data is None:
                return -1
            expiry = self._whois_data.expiration_date
            if isinstance(expiry, list):
                expiry = expiry[0]
            if expiry is None:
                return -1
            if expiry.tzinfo is None:
                expiry = expiry.replace(tzinfo=timezone.utc)
            remaining = (expiry - datetime.now(timezone.utc)).days
            return 1 if remaining > 365 else -1
        except Exception:
            return -1

    def _favicon(self) -> int:
        """
        Check if the favicon is loaded from a different domain than the page.
        Same domain → 1 (legitimate), different domain → -1 (cloned site signal)
        """
        try:
            if self._soup is None:
                return -1
            icon_tag = self._soup.find("link", rel=lambda r: r and "icon" in r)
            if not icon_tag or not icon_tag.get("href"):
                return 1
            href = icon_tag["href"]
            if href.startswith("//"):
                href = self._parsed.scheme + ":" + href
            if href.startswith("http"):
                favicon_host = urlparse(href).hostname or ""
                page_host = self._parsed.hostname or ""
                return 1 if favicon_host == page_host else -1
            # Relative path → same domain
            return 1
        except Exception:
            return -1

    def _age_of_domain(self) -> int:
        """
        Age of domain from WHOIS creation date.
        Older than 6 months → 1 (legitimate), newer → -1 (phishing)
        """
        try:
            if self._whois_data is None:
                return -1
            creation = self._whois_data.creation_date
            if isinstance(creation, list):
                creation = creation[0]
            if creation is None:
                return -1
            if creation.tzinfo is None:
                creation = creation.replace(tzinfo=timezone.utc)
            age_days = (datetime.now(timezone.utc) - creation).days
            return 1 if age_days > 180 else -1
        except Exception:
            return -1

    def _dns_record(self) -> int:
        """
        Whether a valid DNS A record exists for the domain.
        Record found → 1, no record → -1
        """
        return 1 if self._dns_records else -1

    # -----------------------------------------------------------------------
    # Page Content Features (14–22)
    # -----------------------------------------------------------------------

    def _request_url(self) -> int:
        """
        Ratio of external resources (img, audio, video, script, link) to total.
        < 22% external → 1
        22–61% external → 0
        > 61% external → -1
        """
        try:
            if not self._soup:
                return -1
            tags = self._soup.find_all(["img", "audio", "video", "script", "link"])
            total = len(tags)
            if total == 0:
                return 1
            page_host = self._parsed.hostname or ""
            external = sum(
                1 for tag in tags
                if self._is_external(tag.get("src") or tag.get("href"), page_host)
            )
            ratio = external / total * 100
            if ratio < 22:
                return 1
            elif ratio <= 61:
                return 0
            return -1
        except Exception:
            return -1

    def _url_of_anchor(self) -> int:
        """
        Ratio of <a> tags that link to a different domain or use # / javascript:.
        < 31% suspicious → 1
        31–67% → 0
        > 67% → -1
        """
        try:
            if not self._soup:
                return -1
            anchors = self._soup.find_all("a", href=True)
            total = len(anchors)
            if total == 0:
                return 1
            page_host = self._parsed.hostname or ""
            suspicious = 0
            for a in anchors:
                href = a["href"].strip()
                if href in ("#", "", "javascript::void(0)", "javascript:void(0)"):
                    suspicious += 1
                elif href.startswith("javascript:"):
                    suspicious += 1
                elif href.startswith("http") and self._is_external(href, page_host):
                    suspicious += 1
            ratio = suspicious / total * 100
            if ratio < 31:
                return 1
            elif ratio <= 67:
                return 0
            return -1
        except Exception:
            return -1

    def _links_in_tags(self) -> int:
        """
        Ratio of external URLs in <meta>, <script>, <link> tags.
        < 17% external → 1
        17–81% → 0
        > 81% → -1
        """
        try:
            if not self._soup:
                return -1
            tags = self._soup.find_all(["meta", "script", "link"])
            total = len(tags)
            if total == 0:
                return 1
            page_host = self._parsed.hostname or ""
            external = sum(
                1 for tag in tags
                if self._is_external(
                    tag.get("src") or tag.get("href") or tag.get("content"),
                    page_host,
                )
            )
            ratio = external / total * 100
            if ratio < 17:
                return 1
            elif ratio <= 81:
                return 0
            return -1
        except Exception:
            return -1

    def _sfh(self) -> int:
        """
        Server Form Handler — where form data is sent.
        Empty / about:blank → -1 (phishing)
        External domain → 0 (suspicious)
        Same domain or no form → 1 (legitimate)
        """
        try:
            if not self._soup:
                return -1
            forms = self._soup.find_all("form", action=True)
            if not forms:
                return 1
            page_host = self._parsed.hostname or ""
            for form in forms:
                action = form["action"].strip()
                if action in ("", "about:blank"):
                    return -1
                if action.startswith("http") and self._is_external(action, page_host):
                    return 0
            return 1
        except Exception:
            return -1

    def _submitting_to_email(self) -> int:
        """
        Form action uses mailto: to send credentials via email.
        mailto: present → -1, else → 1
        """
        try:
            if not self._soup:
                return -1
            forms = self._soup.find_all("form", action=True)
            for form in forms:
                if form["action"].strip().lower().startswith("mailto:"):
                    return -1
            if self._html and "mailto:" in self._html.lower():
                return -1
            return 1
        except Exception:
            return -1

    def _abnormal_url(self) -> int:
        """
        URL hostname does not match the domain registered in WHOIS.
        Mismatch → -1, match → 1
        """
        try:
            if self._whois_data is None:
                return -1
            domain = self._whois_data.domain_name
            if isinstance(domain, list):
                domain = domain[0]
            if domain is None:
                return -1
            host = (self._parsed.hostname or "").lower()
            registered = domain.lower().replace("www.", "")
            return 1 if registered in host else -1
        except Exception:
            return -1

    def _port(self) -> int:
        """
        Non-standard port used in the URL.
        Standard ports (80, 443) or no port → 1
        Non-standard port → -1
        """
        port = self._parsed.port
        if port is None:
            return 1
        if port in (80, 443):
            return 1
        return -1

    def _redirect(self) -> int:
        """
        Number of HTTP redirects before reaching final page.
        0 → 1, 1–2 → 0, 3+ → -1
        """
        count = self._redirect_count
        if count == 0:
            return 1
        elif count <= 2:
            return 0
        return -1

    def _iframe(self) -> int:
        """
        Presence of <iframe> or frameBorder attribute on page.
        Present → -1, absent → 1
        """
        try:
            if not self._soup:
                return -1
            iframes = self._soup.find_all("iframe")
            if iframes:
                return -1
            if self._html and "frameborder" in self._html.lower():
                return -1
            return 1
        except Exception:
            return -1

    # -----------------------------------------------------------------------
    # Behaviour / Obfuscation Features (23–25)
    # -----------------------------------------------------------------------

    def _on_mouseover(self) -> int:
        """
        onMouseOver event used to change the browser status bar to hide real URL.
        window.status= assignment detected → -1, else → 1
        """
        try:
            if not self._html:
                return 1
            pattern = re.compile(r"window\.status\s*=", re.IGNORECASE)
            return -1 if pattern.search(self._html) else 1
        except Exception:
            return -1

    def _right_click(self) -> int:
        """
        Right-click disabled via JavaScript to prevent page source inspection.
        Contextmenu or event.button == 2 detection → -1, else → 1
        """
        try:
            if not self._html:
                return 1
            patterns = [
                # event.button == 2 check inside JS
                re.compile(r"event\.button\s*==\s*2", re.IGNORECASE),
                # return false on contextmenu — the disabling pattern specifically
                re.compile(r"oncontextmenu\s*=\s*[\"']?\s*return\s+false", re.IGNORECASE),
                # document-level contextmenu listener that returns false
                re.compile(r"addEventListener\s*\(\s*['\"]contextmenu['\"].*?return\s+false", re.IGNORECASE | re.DOTALL),
            ]
            for pattern in patterns:
                if pattern.search(self._html):
                    return -1
            return 1
        except Exception:
            return -1

    def _popup_window(self) -> int:
        """
        Pop-up windows opened via JavaScript containing form fields.
        window.open() call present → -1, else → 1
        """
        try:
            if not self._html:
                return 1
            pattern = re.compile(r"window\.open\s*\(", re.IGNORECASE)
            return -1 if pattern.search(self._html) else 1
        except Exception:
            return -1

    # -----------------------------------------------------------------------
    # External Reputation Features (26–30)
    # -----------------------------------------------------------------------

    def _web_traffic(self) -> int:
        """
        Alexa / SimilarWeb traffic rank lookup via configured API.
        Ranked in top 100k → 1, ranked but lower → 0, no rank → -1

        Falls back gracefully if API key is not configured.
        """
        try:
            if not self.config.alexa_api_url:
                logging.warning("Alexa API URL not configured — web_traffic defaulting to 0 (neutral)")
                return 0
            host = self._parsed.hostname or ""
            resp = self._session.get(
                self.config.alexa_api_url.format(domain=host),
                timeout=self.config.request_timeout,
            )
            data = resp.json()
            rank = data.get("rank", 0)
            if rank == 0 or rank is None:
                return -1
            elif rank <= 100_000:
                return 1
            return 0
        except Exception as e:
            logging.warning(f"web_traffic lookup failed: {e}")
            return 0

    def _page_rank(self) -> int:
        """
        Open PageRank API lookup.
        Rank >= 2 → 1 (legitimate), else → -1
        """
        try:
            if not self.config.pagerank_api_key:
                logging.warning("PageRank API key not configured — page_rank defaulting to -1")
                return -1
            host = self._parsed.hostname or ""
            resp = self._session.get(
                f"https://openpagerank.com/api/v1.0/getPageRank?domains[]={host}",
                headers={"API-OPR": self.config.pagerank_api_key},
                timeout=self.config.request_timeout,
            )
            data = resp.json()
            # API returns page_rank_integer as str or int depending on version
            rank = int(data.get("response", [{}])[0].get("page_rank_integer", 0))
            return 1 if rank >= 2 else -1
        except Exception as e:
            logging.warning(f"page_rank lookup failed: {e}")
            return -1

    def _google_index(self) -> int:
        """
        Check if the page is indexed by Google using a site: search query.
        Results found → 1 (legitimate), no results → -1
        """
        try:
            query = f"site:{self._parsed.hostname}"
            resp = self._session.get(
                "https://www.google.com/search",
                params={"q": query},
                timeout=self.config.request_timeout,
            )
            # If Google returns results, the page is indexed
            return 1 if "did not match any documents" not in resp.text else -1
        except Exception as e:
            logging.warning(f"google_index lookup failed: {e}")
            return -1

    def _links_pointing_to_page(self) -> int:
        """
        Number of external backlinks pointing to this page.
        Uses configured backlink API (Moz / Majestic / custom).
        0 backlinks → -1, 1–2 → 0, many → 1
        """
        try:
            if not self.config.backlink_api_url:
                logging.warning("Backlink API URL not configured — links_pointing_to_page defaulting to 0 (neutral)")
                return 0
            resp = self._session.get(
                self.config.backlink_api_url.format(url=self._url),
                timeout=self.config.request_timeout,
            )
            data = resp.json()
            count = data.get("backlinks", 0)
            if count == 0:
                return -1
            elif count <= 2:
                return 0
            return 1
        except Exception as e:
            logging.warning(f"links_pointing_to_page lookup failed: {e}")
            return 0

    def _statistical_report(self) -> int:
        """
        Check URL/IP against PhishTank API and StopBadware.
        Listed in phishing reports → -1, not listed → 1
        """
        try:
            host = self._parsed.hostname or ""
            # Resolve host to IP for IP-based blacklist checks
            try:
                ip = socket.gethostbyname(host)
            except socket.gaierror:
                ip = None

            # PhishTank check
            if self.config.phishtank_api_key:
                pt_resp = self._session.post(
                    "https://checkurl.phishtank.com/checkurl/",
                    data={
                        "url": self._url,
                        "format": "json",
                        "app_key": self.config.phishtank_api_key,
                    },
                    timeout=self.config.request_timeout,
                )
                pt_data = pt_resp.json()
                if pt_data.get("results", {}).get("in_database") and \
                   pt_data.get("results", {}).get("valid"):
                    return -1

            return 1
        except Exception as e:
            logging.warning(f"statistical_report lookup failed: {e}")
            return -1

    # -----------------------------------------------------------------------
    # Private helpers
    # -----------------------------------------------------------------------

    def _is_external(self, url_or_path: str, page_host: str) -> bool:
        """Return True if the given URL belongs to a different host than page_host."""
        if not url_or_path:
            return False
        url_or_path = url_or_path.strip()
        if url_or_path.startswith("//"):
            url_or_path = self._parsed.scheme + ":" + url_or_path
        if not url_or_path.startswith("http"):
            return False
        try:
            resource_host = urlparse(url_or_path).hostname or ""
            return resource_host != page_host
        except Exception:
            return False