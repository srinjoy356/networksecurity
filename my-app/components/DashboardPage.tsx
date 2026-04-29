'use client';
import { useMemo, useState } from 'react';
import { useStore } from '@/store/useStore';
import { FEATURES_LIST } from '@/lib/data';
import type { Prediction } from '@/lib/data';

function MetricCard({ title, value, sub, color, icon, delta }: {
  title: string; value: string | number; sub?: string; color: string; icon: string; delta?: number;
}) {
  return (
    <div className="glass glass-hover" style={{ padding: '20px 22px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color, opacity: 0.6 }}/>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>{title}</span>
        <span style={{ fontSize: 18 }}>{icon}</span>
      </div>
      <div className="metric-num" style={{ fontSize: 34, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>{sub}</div>}
      {delta !== undefined && (
        <div style={{ fontSize: 11, color: delta >= 0 ? '#00ff88' : '#ff2244', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}% this week
        </div>
      )}
    </div>
  );
}

function ThreatFeed({ predictions, onSelect }: { predictions: Prediction[]; onSelect: (p: Prediction) => void }) {
  return (
    <div className="glass" style={{ padding: 20 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, color: '#ff2244', letterSpacing: '0.12em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="animate-pulse-glow" style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff2244', display: 'inline-block' }}/>
        LIVE THREAT FEED
      </div>
      <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {predictions.filter(p => p.prediction === 0).slice(0, 15).map(p => (
          <div key={p.id} onClick={() => onSelect(p)} style={{
            padding: '8px 12px', background: 'rgba(255,34,68,0.05)',
            border: '1px solid rgba(255,34,68,0.12)',
            cursor: 'pointer', transition: 'all 0.2s',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,34,68,0.3)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,34,68,0.12)')}
          >
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#ff2244', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{p.url}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{new Date(p.created_at).toLocaleTimeString()}</div>
            </div>
            <span className="cyber-badge badge-threat">{p.phishing_signal_count} SIG</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniDonut({ pct, color, size = 80 }: { pct: number; color: string; size?: number }) {
  const r = size * 0.38; const cx = size / 2; const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;
  return (
    <svg width={size} height={size}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={size * 0.12}/>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={size * 0.12}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`} style={{ transition: 'stroke-dasharray 1s ease' }}/>
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={size * 0.18} fontWeight="700" fill={color} fontFamily="var(--font-display)">{Math.round(pct * 100)}%</text>
    </svg>
  );
}

function FeatureHeatmap({ predictions }: { predictions: Prediction[] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const matrix = useMemo(() => FEATURES_LIST.map(feat => {
    const vals = predictions.map(p => p.features[feat] ?? 0);
    const phishCount = vals.filter(v => v === -1).length;
    const pct = vals.length > 0 ? phishCount / vals.length : 0;
    return { feat, pct, count: phishCount, total: vals.length };
  }), [predictions]);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 3 }}>
        {matrix.map((m, i) => {
          const r = Math.round(255 * m.pct + 0 * (1 - m.pct));
          const g = Math.round(0 * m.pct + 212 * (1 - m.pct));
          const b = Math.round(68 * m.pct + 255 * (1 - m.pct));
          const bg = `rgba(${r},${g},${b},${0.2 + m.pct * 0.6})`;
          return (
            <div key={i} title={`${m.feat}: ${Math.round(m.pct * 100)}%`}
              style={{ height: 18, background: bg, cursor: 'pointer', transition: 'transform 0.2s', position: 'relative' }}
              onMouseEnter={() => setHovered(m.feat)}
              onMouseLeave={() => setHovered(null)}
            >
              {hovered === m.feat && (
                <div style={{
                  position: 'absolute', bottom: '110%', left: '50%', transform: 'translateX(-50%)',
                  background: 'var(--bg-card)', border: '1px solid rgba(0,212,255,0.25)',
                  padding: '6px 10px', zIndex: 100, whiteSpace: 'nowrap',
                  fontFamily: 'var(--font-mono)', fontSize: 10,
                }}>
                  <div style={{ color: '#00d4ff' }}>{m.feat}</div>
                  <div style={{ color: 'var(--text-secondary)' }}>{Math.round(m.pct * 100)}% phishing ({m.count}/{m.total})</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>
        <span>SAFE ▶</span>
        <span>◀ THREAT</span>
      </div>
    </div>
  );
}

function PredictionModal({ prediction, onClose }: { prediction: Prediction; onClose: () => void }) {
  const isPhishing = prediction.prediction === 0;
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        background: 'var(--bg-card)', border: `1px solid ${isPhishing ? 'rgba(255,34,68,0.4)' : 'rgba(0,255,136,0.4)'}`,
        maxWidth: 680, width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: 32,
        boxShadow: isPhishing ? '0 0 40px rgba(255,34,68,0.2)' : '0 0 40px rgba(0,255,136,0.2)',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: isPhishing ? '#ff2244' : '#00ff88' }}/>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <span className={`cyber-badge ${isPhishing ? 'badge-threat' : 'badge-safe'}`} style={{ fontSize: 11, padding: '6px 14px', marginBottom: 8, display: 'inline-flex' }}>
              {isPhishing ? '🚨 THREAT DETECTED' : '✅ SAFE PASSAGE'}
            </span>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', wordBreak: 'break-all', marginTop: 6, maxWidth: 540 }}>{prediction.url}</div>
          </div>
          <button onClick={onClose} className="neon-btn" style={{ height: 32, padding: '0 16px' }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Phishing Signals', value: prediction.phishing_signal_count, color: '#ff2244', max: 30 },
            { label: 'Suspicious', value: prediction.suspicious_signal_count, color: '#ff6b00', max: 30 },
            { label: 'Risk Score', value: `${Math.round(prediction.phishing_signal_count / 30 * 100)}%`, color: '#a855f7', max: 100 },
          ].map(m => (
            <div key={m.label} style={{ padding: 16, background: `${m.color}11`, border: `1px solid ${m.color}33` }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', marginBottom: 8 }}>{m.label.toUpperCase()}</div>
              <div className="metric-num" style={{ fontSize: 28, color: m.color }}>{m.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 12 }}>FEATURE BREAKDOWN</div>
            <div style={{ maxHeight: 280, overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
              {FEATURES_LIST.map(f => {
                const v = prediction.features[f];
                return (
                  <div key={f} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '4px 8px', background: v === -1 ? 'rgba(255,34,68,0.06)' : 'rgba(0,255,136,0.04)',
                  }}>
                    <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 90 }}>{f.replace(/_/g, ' ')}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: v === -1 ? '#ff2244' : '#00ff88', fontFamily: 'var(--font-mono)' }}>{v === -1 ? '-1' : '+1'}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 12 }}>VERDICT</div>
            <div style={{ padding: 20, background: isPhishing ? 'rgba(255,34,68,0.08)' : 'rgba(0,255,136,0.06)', border: `1px solid ${isPhishing ? 'rgba(255,34,68,0.3)' : 'rgba(0,255,136,0.3)'}` }}>
              <div style={{ fontSize: 48, textAlign: 'center', marginBottom: 12 }}>{isPhishing ? '🚨' : '✅'}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {isPhishing
                  ? `${prediction.phishing_signal_count}/30 features indicate phishing activity. High-risk URL detected.`
                  : `Only ${prediction.phishing_signal_count}/30 features flagged. Domain appears legitimate.`}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { predictions, setSelectedPrediction, selectedPrediction, addXP } = useStore();
  const [localSelected, setLocalSelected] = useState<Prediction | null>(null);

  const stats = useMemo(() => {
    const total = predictions.length;
    const phishing = predictions.filter(p => p.prediction === 0).length;
    const avgPhish = total > 0 ? (predictions.reduce((a, p) => a + p.phishing_signal_count, 0) / total).toFixed(1) : 0;
    return { total, phishing, legitimate: total - phishing, avgPhish, pct: total > 0 ? phishing / total : 0 };
  }, [predictions]);

  const timeData = useMemo(() => {
    const days: Record<string, { date: string; phishing: number; legit: number }> = {};
    predictions.forEach(p => {
      const d = new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
      if (!days[d]) days[d] = { date: d, phishing: 0, legit: 0 };
      if (p.prediction === 0) days[d].phishing++; else days[d].legit++;
    });
    return Object.values(days).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-14);
  }, [predictions]);

  const featureTop = useMemo(() => {
    const freq: Record<string, number> = {};
    FEATURES_LIST.forEach(f => freq[f] = 0);
    predictions.forEach(p => FEATURES_LIST.forEach(f => { if ((p.features[f] ?? 0) === -1) freq[f]++; }));
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [predictions]);

  const handleSelect = (p: Prediction) => {
    setLocalSelected(p);
    addXP(5);
  };

  return (
    <div style={{ padding: 24 }}>
      {localSelected && <PredictionModal prediction={localSelected} onClose={() => setLocalSelected(null)} />}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: '#00d4ff', letterSpacing: '0.1em' }}>COMMAND HQ</h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>REAL-TIME THREAT INTELLIGENCE OVERVIEW</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="animate-pulse-glow" style={{ width: 8, height: 8, borderRadius: '50%', background: '#00ff88', display: 'inline-block' }}/>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#00ff88' }}>SYSTEMS OPERATIONAL</span>
        </div>
      </div>

      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <MetricCard title="TOTAL SCANS" value={stats.total} sub="all-time" color="#00d4ff" icon="◎" delta={12} />
        <MetricCard title="THREATS DETECTED" value={stats.phishing} sub={`${Math.round(stats.pct * 100)}% of total`} color="#ff2244" icon="🚨" delta={-5} />
        <MetricCard title="SAFE URLs" value={stats.legitimate} sub="verified legitimate" color="#00ff88" icon="✓" delta={8} />
        <MetricCard title="AVG SIGNALS" value={stats.avgPhish} sub="per scan" color="#a855f7" icon="⚡" />
      </div>

      {/* Main row */}
      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr 260px', gap: 14, marginBottom: 14 }}>
        {/* Donut */}
        <div className="glass" style={{ padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 14 }}>THREAT RATIO</div>
          <MiniDonut pct={stats.pct} color="#ff2244" size={120} />
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
            {[{ label: 'Phishing', count: stats.phishing, color: '#ff2244' }, { label: 'Legit', count: stats.legitimate, color: '#00ff88' }].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 6, height: 6, background: item.color, display: 'inline-block' }}/>{item.label}
                </span>
                <span style={{ color: item.color }}>{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="glass" style={{ padding: 20 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 14 }}>ACTIVITY TIMELINE</div>
          <svg width="100%" height="140" viewBox="0 0 600 140" preserveAspectRatio="none">
            {timeData.length > 1 && (() => {
              const n = timeData.length;
              const maxV = Math.max(...timeData.map(d => Math.max(d.phishing, d.legit)), 1);
              const phPts = timeData.map((d, i) => `${(i / (n - 1)) * 580 + 10},${130 - (d.phishing / maxV) * 110}`).join(' ');
              const lgPts = timeData.map((d, i) => `${(i / (n - 1)) * 580 + 10},${130 - (d.legit / maxV) * 110}`).join(' ');
              return (
                <>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ff2244" stopOpacity="0.3"/><stop offset="100%" stopColor="#ff2244" stopOpacity="0"/></linearGradient>
                    <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#00ff88" stopOpacity="0.2"/><stop offset="100%" stopColor="#00ff88" stopOpacity="0"/></linearGradient>
                  </defs>
                  <polyline points={`10,130 ${phPts} 590,130`} fill="url(#g1)" stroke="none"/>
                  <polyline points={phPts} fill="none" stroke="#ff2244" strokeWidth="1.5" strokeLinejoin="round"/>
                  <polyline points={`10,130 ${lgPts} 590,130`} fill="url(#g2)" stroke="none"/>
                  <polyline points={lgPts} fill="none" stroke="#00ff88" strokeWidth="1.5" strokeLinejoin="round"/>
                  {timeData.filter((_, i) => i % 3 === 0).map((d, i) => (
                    <text key={i} x={(timeData.indexOf(d) / (n - 1)) * 580 + 10} y={140} fontSize="8" fill="rgba(122,156,192,0.5)" textAnchor="middle" fontFamily="var(--font-mono)">{d.date}</text>
                  ))}
                </>
              );
            })()}
          </svg>
          <div style={{ display: 'flex', gap: 16, marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 10 }}>
            <span style={{ color: '#ff2244' }}>— Phishing</span>
            <span style={{ color: '#00ff88' }}>— Legitimate</span>
          </div>
        </div>

        {/* Threat feed */}
        <ThreatFeed predictions={predictions} onSelect={handleSelect} />
      </div>

      {/* Second row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        {/* Feature bar chart */}
        <div className="glass" style={{ padding: 20 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 14 }}>TOP THREAT FEATURES</div>
          {featureTop.map(([name, count]) => {
            const pct = (count / (predictions.length || 1)) * 100;
            return (
              <div key={name} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)' }}>{name.replace(/_/g, ' ')}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#ff2244' }}>{count}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, #ff2244, #a855f7)` }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Heatmap */}
        <div className="glass" style={{ padding: 20 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 14 }}>FEATURE THREAT HEATMAP (30 UCI FEATURES)</div>
          <FeatureHeatmap predictions={predictions} />
        </div>
      </div>

      {/* Recent table */}
      <div className="glass" style={{ padding: 20 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 14 }}>RECENT ACTIVITY</div>
        <table className="cyber-table">
          <thead>
            <tr>
              <th>URL</th><th>VERDICT</th><th>PHISH SIG</th><th>SUSP</th><th>TIMESTAMP</th><th></th>
            </tr>
          </thead>
          <tbody>
            {predictions.slice(0, 10).map(p => (
              <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => handleSelect(p)}>
                <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.url}</td>
                <td><span className={`cyber-badge ${p.prediction === 0 ? 'badge-threat' : 'badge-safe'}`}>{p.label}</span></td>
                <td style={{ color: '#ff2244' }}>{p.phishing_signal_count}</td>
                <td style={{ color: '#ff6b00' }}>{p.suspicious_signal_count}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{new Date(p.created_at).toLocaleString()}</td>
                <td><button className="neon-btn" style={{ padding: '4px 12px', fontSize: 9 }}>INSPECT</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
