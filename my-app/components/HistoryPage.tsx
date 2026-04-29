'use client';
import { useState, useMemo, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { api } from '@/lib/api';
import type { HistoryItem } from '@/lib/api';
import type { Prediction } from '@/lib/data';
import { FEATURES_LIST } from '@/lib/data';

function historyToPrediction(h: HistoryItem): Prediction {
  return {
    id: h.id,
    user_id: h.user_id,
    url: h.url,
    prediction: h.prediction,
    label: h.label,
    phishing_signal_count: h.phishing_signal_count,
    suspicious_signal_count: h.suspicious_signal_count,
    features: h.features,
    feature_vector: h.feature_vector,
    created_at: h.created_at,
  };
}

function PredictionDetail({ p, onClose }: { p: Prediction; onClose: () => void }) {
  const isPhishing = p.prediction === 0;
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        background: 'var(--bg-card)',
        border: `1px solid ${isPhishing ? 'rgba(255,34,68,0.4)' : 'rgba(0,255,136,0.3)'}`,
        maxWidth: 700, width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: 28,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <span className={`cyber-badge ${isPhishing ? 'badge-threat' : 'badge-safe'}`} style={{ fontSize: 10, padding: '5px 14px' }}>
              {isPhishing ? '🚨 THREAT' : '✅ SAFE'} · #{p.id}
            </span>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginTop: 8, wordBreak: 'break-all' }}>{p.url}</div>
          </div>
          <button onClick={onClose} className="neon-btn" style={{ padding: '4px 14px', height: 32 }}>✕ CLOSE</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Phishing Signals', value: p.phishing_signal_count, color: '#ff2244' },
            { label: 'Suspicious', value: p.suspicious_signal_count, color: '#ff6b00' },
            { label: 'Risk %', value: `${Math.round(p.phishing_signal_count / 30 * 100)}%`, color: '#a855f7' },
          ].map(m => (
            <div key={m.label} style={{ padding: 14, background: `${m.color}08`, border: `1px solid ${m.color}22`, textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 8, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 6 }}>{m.label.toUpperCase()}</div>
              <div className="metric-num" style={{ fontSize: 24, color: m.color }}>{m.value}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 3 }}>
          {FEATURES_LIST.map(f => {
            const v = p.features[f];
            return (
              <div key={f} style={{
                padding: '5px 6px',
                background: v === -1 ? 'rgba(255,34,68,0.07)' : 'rgba(0,255,136,0.04)',
                border: `1px solid ${v === -1 ? 'rgba(255,34,68,0.2)' : 'rgba(0,255,136,0.1)'}`,
                display: 'flex', justifyContent: 'space-between',
              }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 72 }}>{f.replace(/_/g, ' ')}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: v === -1 ? '#ff2244' : '#00ff88', flexShrink: 0 }}>{v === -1 ? '-1' : '+1'}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const { predictions, setPredictions, showToast } = useStore();
  const [filter, setFilter] = useState<'all' | 'phishing' | 'legitimate'>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Prediction | null>(null);
  const [sortBy, setSortBy] = useState<'time' | 'signals' | 'risk'>('time');
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Fetch real history from API whenever this page mounts
  useEffect(() => {
    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        const items = await api.history();
        setPredictions(items.map(historyToPrediction));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load history';
        showToast(`HISTORY LOAD FAILED: ${msg}`, 'error');
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return predictions
      .filter(p => filter === 'all' || (filter === 'phishing' ? p.prediction === 0 : p.prediction === 1))
      .filter(p => !search || p.url.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        if (sortBy === 'signals') return b.phishing_signal_count - a.phishing_signal_count;
        if (sortBy === 'risk') return b.phishing_signal_count - a.phishing_signal_count;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [predictions, filter, search, sortBy]);

  const stats = useMemo(() => ({
    total: predictions.length,
    threats: predictions.filter(p => p.prediction === 0).length,
    highRisk: predictions.filter(p => p.phishing_signal_count > 20).length,
    avgRisk: predictions.length > 0
      ? Math.round(predictions.reduce((a, p) => a + p.phishing_signal_count, 0) / predictions.length)
      : 0,
  }), [predictions]);

  return (
    <div style={{ padding: 24 }}>
      {selected && <PredictionDetail p={selected} onClose={() => setSelected(null)} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: '#00d4ff', letterSpacing: '0.1em' }}>THREAT LOG</h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            COMPLETE SCAN HISTORY — {loadingHistory ? 'LOADING...' : `${predictions.length} RECORDS`}
          </p>
        </div>
        <button
          className="neon-btn"
          onClick={() => {
            setLoadingHistory(true);
            api.history()
              .then(items => { setPredictions(items.map(historyToPrediction)); showToast('HISTORY REFRESHED', 'success'); })
              .catch(() => showToast('REFRESH FAILED', 'error'))
              .finally(() => setLoadingHistory(false));
          }}
          disabled={loadingHistory}
          style={{ fontSize: 9, padding: '8px 16px' }}
        >
          {loadingHistory ? '⟳ LOADING...' : '⟳ REFRESH'}
        </button>
      </div>

      {/* Loading state */}
      {loadingHistory && predictions.length === 0 && (
        <div className="glass" style={{ padding: 48, textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: '#00d4ff', letterSpacing: '0.1em' }}>⟳ FETCHING THREAT LOG...</div>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Scans', value: stats.total, color: '#00d4ff' },
          { label: 'Threats Found', value: stats.threats, color: '#ff2244' },
          { label: 'High Risk (>20)', value: stats.highRisk, color: '#ff6b00' },
          { label: 'Avg Signals', value: stats.avgRisk, color: '#a855f7' },
        ].map(s => (
          <div key={s.label} className="glass" style={{ padding: '14px 18px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 8, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 6 }}>{s.label.toUpperCase()}</div>
            <div className="metric-num" style={{ fontSize: 28, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          className="cyber-input"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search URLs..."
          style={{ maxWidth: 300, fontSize: 12 }}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          {(['all', 'phishing', 'legitimate'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="neon-btn"
              style={{
                fontSize: 9, padding: '7px 16px',
                borderColor: filter === f ? (f === 'phishing' ? '#ff2244' : f === 'legitimate' ? '#00ff88' : '#00d4ff') : 'rgba(0,212,255,0.2)',
                color: filter === f ? (f === 'phishing' ? '#ff2244' : f === 'legitimate' ? '#00ff88' : '#00d4ff') : 'var(--text-muted)',
              }}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>SORT:</span>
          {(['time', 'signals', 'risk'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className="neon-btn"
              style={{
                fontSize: 9, padding: '7px 14px',
                borderColor: sortBy === s ? '#a855f7' : 'rgba(0,212,255,0.2)',
                color: sortBy === s ? '#a855f7' : 'var(--text-muted)',
              }}
            >
              {s.toUpperCase()}
            </button>
          ))}
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>{filtered.length} RESULTS</span>
      </div>

      {/* Table */}
      <div className="glass" style={{ overflow: 'hidden' }}>
        <table className="cyber-table">
          <thead>
            <tr>
              <th>#</th>
              <th>URL</th>
              <th>VERDICT</th>
              <th>PHISH SIG</th>
              <th>SUSP SIG</th>
              <th>RISK</th>
              <th>TIMESTAMP</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const risk = Math.round(p.phishing_signal_count / 30 * 100);
              return (
                <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(p)}>
                  <td style={{ color: 'var(--text-muted)', fontSize: 10 }}>#{p.id}</td>
                  <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: p.prediction === 0 ? '#ff2244' : 'var(--text-secondary)' }}>{p.url}</td>
                  <td><span className={`cyber-badge ${p.prediction === 0 ? 'badge-threat' : 'badge-safe'}`}>{p.label}</span></td>
                  <td style={{ color: '#ff2244' }}>{p.phishing_signal_count}</td>
                  <td style={{ color: '#ff6b00' }}>{p.suspicious_signal_count}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="progress-bar" style={{ width: 60 }}>
                        <div className="progress-fill" style={{ width: `${risk}%`, background: risk > 66 ? '#ff2244' : risk > 33 ? '#ff6b00' : '#00ff88' }}/>
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: risk > 66 ? '#ff2244' : risk > 33 ? '#ff6b00' : '#00ff88' }}>{risk}%</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 10, color: 'var(--text-muted)' }}>{new Date(p.created_at).toLocaleString()}</td>
                  <td>
                    <button className="neon-btn" style={{ padding: '4px 12px', fontSize: 9 }} onClick={e => { e.stopPropagation(); setSelected(p); }}>
                      INSPECT
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && !loadingHistory && (
          <div style={{ padding: 48, textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            NO RECORDS FOUND
          </div>
        )}
      </div>
    </div>
  );
}