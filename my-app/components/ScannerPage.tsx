'use client';
import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { FEATURES_LIST } from '@/lib/data';
import type { Prediction } from '@/lib/data';
import { api } from '@/lib/api';
import type { PredictUrlResponse } from '@/lib/api';

// Convert API response to store Prediction shape
function apiToPrediction(res: PredictUrlResponse): Prediction {
  return {
    id: res.log_id,
    user_id: 0,
    url: res.url,
    prediction: res.prediction,
    label: res.label,
    phishing_signal_count: res.phishing_signal_count,
    suspicious_signal_count: res.suspicious_signal_count,
    features: res.features,
    feature_vector: res.feature_vector,
    created_at: new Date().toISOString(),
  };
}

function ScanAnimation({ isPhishing }: { isPhishing: boolean | null }) {
  if (isPhishing === null) {
    // Still scanning
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: '#00d4ff', letterSpacing: '0.15em', marginBottom: 20 }}>
          ANALYZING URL...
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4, maxWidth: 400, margin: '0 auto' }}>
          {FEATURES_LIST.slice(0, 12).map((f, i) => (
            <div key={f} style={{
              height: 24,
              background: `rgba(0,212,255,0.15)`,
              border: `1px solid rgba(0,212,255,0.3)`,
              animation: `pulse-glow ${0.5 + i * 0.1}s ease-in-out infinite`,
            }}/>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div style={{ textAlign: 'center', padding: 40 }}>
      <div style={{ fontSize: 80, marginBottom: 20 }}>{isPhishing ? '🚨' : '✅'}</div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 24, letterSpacing: '0.15em',
        color: isPhishing ? '#ff2244' : '#00ff88',
        textShadow: `0 0 30px ${isPhishing ? 'rgba(255,34,68,0.8)' : 'rgba(0,255,136,0.8)'}`,
      }}>
        {isPhishing ? '⚠ THREAT DETECTED' : '✓ SAFE PASSAGE'}
      </div>
    </div>
  );
}

export default function ScannerPage() {
  const { predictions, addPrediction, showToast, addXP, unlockAchievement } = useStore();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Prediction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const EXAMPLES = [
    'https://secure-paypal-login.ru/account/verify',
    'https://github.com/anthropics/claude',
    'https://amazon-invoice-update.xyz/pay?id=12345',
    'https://stripe.com/billing',
    'https://signin-wellsfargo.net/secure',
  ];

  const handleScan = async () => {
    if (!url.trim()) return showToast('ENTER TARGET URL', 'error');
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const data = await api.predictUrl(url.trim());
      const prediction = apiToPrediction(data);
      addPrediction(prediction);
      setResult(prediction);
      addXP(25);
      if (prediction.prediction === 0) unlockAchievement('threat_hunter');
      showToast(
        prediction.prediction === 0
          ? '🚨 THREAT DETECTED — ENGAGE COUNTERMEASURES'
          : '✅ TARGET CLEARED — SAFE PASSAGE',
        prediction.prediction === 0 ? 'error' : 'success'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Scan failed';
      setError(msg);
      showToast(`SCAN FAILED: ${msg}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: '#ff2244', letterSpacing: '0.1em', marginBottom: 4 }}>BATTLE ZONE — URL SCANNER</h1>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginBottom: 28 }}>ANALYZE ANY URL AGAINST 30 UCI PHISHING DETECTION SIGNALS</p>

      {/* Scanner input */}
      <div className="glass" style={{ padding: 28, marginBottom: 20, borderColor: loading ? 'rgba(255,34,68,0.3)' : undefined, position: 'relative' }}>
        {loading && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #ff2244, #a855f7, #00d4ff)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s linear infinite' }}/>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontFamily: 'var(--font-display)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.12em', display: 'block', marginBottom: 8 }}>TARGET URL</label>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              className="cyber-input"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleScan()}
              placeholder="https://target.domain/path?params=..."
              style={{ fontSize: 14, flex: 1 }}
            />
            <button className="neon-btn neon-btn-red" onClick={handleScan} disabled={loading} style={{ fontSize: 11, padding: '12px 24px', whiteSpace: 'nowrap' }}>
              {loading ? '⟳ SCANNING' : '⚡ SCAN TARGET'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>LOAD EXAMPLE:</span>
          {EXAMPLES.map(ex => (
            <button key={ex} onClick={() => setUrl(ex)} className="neon-btn" style={{ fontSize: 9, padding: '5px 12px' }}>
              {ex.replace('https://', '').substring(0, 28)}...
            </button>
          ))}
        </div>
      </div>

      {/* Loading animation */}
      {loading && (
        <div className="glass" style={{ marginBottom: 20, borderColor: 'rgba(255,34,68,0.3)' }}>
          <ScanAnimation isPhishing={null} />
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="glass" style={{ padding: 20, marginBottom: 20, borderColor: 'rgba(255,34,68,0.4)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#ff2244' }}>⚠ SCAN ERROR: {error}</div>
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <div className="glass" style={{
          padding: 28,
          borderColor: result.prediction === 0 ? 'rgba(255,34,68,0.4)' : 'rgba(0,255,136,0.3)',
          boxShadow: result.prediction === 0 ? '0 0 40px rgba(255,34,68,0.1)' : '0 0 40px rgba(0,255,136,0.05)',
          position: 'relative',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: result.prediction === 0 ? '#ff2244' : '#00ff88' }}/>

          {/* Verdict banner */}
          <div style={{ textAlign: 'center', marginBottom: 28, padding: '20px 0' }}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>{result.prediction === 0 ? '🚨' : '✅'}</div>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 28, letterSpacing: '0.2em',
              color: result.prediction === 0 ? '#ff2244' : '#00ff88',
              textShadow: `0 0 30px ${result.prediction === 0 ? 'rgba(255,34,68,0.6)' : 'rgba(0,255,136,0.6)'}`,
            }}>
              {result.prediction === 0 ? 'THREAT DETECTED' : 'SAFE PASSAGE'}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)', marginTop: 8, wordBreak: 'break-all' }}>{result.url}</div>
          </div>

          {/* Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
            {[
              { label: 'Phishing Signals', value: `${result.phishing_signal_count}/30`, color: '#ff2244', pct: result.phishing_signal_count / 30 },
              { label: 'Suspicious Signals', value: `${result.suspicious_signal_count}/30`, color: '#ff6b00', pct: result.suspicious_signal_count / 30 },
              { label: 'Risk Score', value: `${Math.round(result.phishing_signal_count / 30 * 100)}%`, color: '#a855f7', pct: result.phishing_signal_count / 30 },
            ].map(m => (
              <div key={m.label} style={{ padding: 20, background: `${m.color}08`, border: `1px solid ${m.color}22`, textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 8, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 10 }}>{m.label.toUpperCase()}</div>
                <div className="metric-num" style={{ fontSize: 36, color: m.color }}>{m.value}</div>
                <div className="progress-bar" style={{ marginTop: 10 }}>
                  <div className="progress-fill" style={{ width: `${m.pct * 100}%`, background: m.color }}/>
                </div>
              </div>
            ))}
          </div>

          {/* Feature breakdown */}
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 12 }}>SIGNAL BREAKDOWN (30 UCI FEATURES)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
              {FEATURES_LIST.map(f => {
                const v = result.features[f];
                const isNeg = v === -1;
                return (
                  <div key={f} style={{
                    padding: '6px 8px',
                    background: isNeg ? 'rgba(255,34,68,0.08)' : 'rgba(0,255,136,0.05)',
                    border: `1px solid ${isNeg ? 'rgba(255,34,68,0.2)' : 'rgba(0,255,136,0.15)'}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 80 }}>
                      {f.replace(/_/g, ' ')}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: isNeg ? '#ff2244' : '#00ff88', flexShrink: 0 }}>
                      {isNeg ? '-1' : '+1'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Recent scans */}
      {predictions.length > 0 && !loading && (
        <div className="glass" style={{ padding: 20, marginTop: 20 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 14 }}>RECENT BATTLE HISTORY</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {predictions.slice(0, 5).map(p => (
              <div key={p.id} onClick={() => { setResult(p); setUrl(p.url); }} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 12px', cursor: 'pointer',
                background: p.prediction === 0 ? 'rgba(255,34,68,0.04)' : 'rgba(0,255,136,0.03)',
                border: `1px solid ${p.prediction === 0 ? 'rgba(255,34,68,0.12)' : 'rgba(0,255,136,0.1)'}`,
              }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 400 }}>{p.url}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className={`cyber-badge ${p.prediction === 0 ? 'badge-threat' : 'badge-safe'}`}>{p.label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>{p.phishing_signal_count} sig</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}