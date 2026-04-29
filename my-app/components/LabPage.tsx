'use client';
import { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { MOCK_PREDICTIONS, FEATURES_LIST } from '@/lib/data';

interface LabConfig {
  knnImputer: boolean;
  standardScaler: boolean;
  smote: boolean;
  pca: boolean;
  featureSelection: boolean;
}

function DistributionChart({ data, color, label }: { data: number[]; color: string; label: string }) {
  const bins = 12;
  const min = Math.min(...data); const max = Math.max(...data);
  const range = max - min || 1;
  const counts = Array(bins).fill(0);
  data.forEach(v => {
    const b = Math.min(Math.floor(((v - min) / range) * bins), bins - 1);
    counts[b]++;
  });
  const maxCount = Math.max(...counts, 1);
  const w = 280; const h = 100; const pad = 20;

  return (
    <div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: '0.1em' }}>{label}</div>
      <svg width={w} height={h}>
        {counts.map((c, i) => {
          const bw = (w - pad) / bins;
          const bh = (c / maxCount) * (h - 20);
          return (
            <rect key={i} x={pad / 2 + i * bw + 1} y={h - 15 - bh}
              width={bw - 2} height={bh}
              fill={color} opacity={0.7} rx="1"/>
          );
        })}
        <line x1={pad / 2} y1={h - 15} x2={w - pad / 2} y2={h - 15} stroke="rgba(0,212,255,0.15)" strokeWidth="1"/>
      </svg>
    </div>
  );
}

function BeforeAfterViz({ config }: { config: LabConfig }) {
  const rawSignals = MOCK_PREDICTIONS.slice(0, 40).map(p => p.phishing_signal_count);
  const transformedSignals = useMemo(() => {
    let data = [...rawSignals];
    if (config.standardScaler) data = data.map(v => (v - 15) / 5);
    if (config.smote) { const extras = Array.from({ length: 15 }, () => rawSignals[Math.floor(Math.random() * rawSignals.length)]); data = [...data, ...extras]; }
    if (config.pca) data = data.map(v => v * 0.85 + Math.random() * 0.3);
    return data;
  }, [config, rawSignals]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <div className="glass" style={{ padding: 16, borderColor: 'rgba(255,107,0,0.2)' }}>
        <DistributionChart data={rawSignals} color="#ff6b00" label="RAW SIGNAL DISTRIBUTION" />
      </div>
      <div className="glass" style={{ padding: 16, borderColor: 'rgba(0,212,255,0.2)' }}>
        <DistributionChart data={transformedSignals} color="#00d4ff" label="TRANSFORMED DISTRIBUTION" />
      </div>
    </div>
  );
}

function ToggleSwitch({ on, onToggle, label, color, desc }: {
  on: boolean; onToggle: () => void; label: string; color: string; desc: string;
}) {
  return (
    <div
      onClick={onToggle}
      style={{
        padding: '16px 20px', cursor: 'pointer',
        background: on ? `${color}0a` : 'rgba(8,15,28,0.6)',
        border: `1px solid ${on ? color : 'rgba(0,212,255,0.1)'}`,
        transition: 'all 0.3s',
        display: 'flex', alignItems: 'center', gap: 16,
      }}
    >
      {/* Toggle */}
      <div style={{
        width: 44, height: 22, borderRadius: 11, flexShrink: 0,
        background: on ? color : 'rgba(255,255,255,0.08)',
        border: `1px solid ${on ? color : 'rgba(255,255,255,0.15)'}`,
        position: 'relative', transition: 'all 0.3s',
        boxShadow: on ? `0 0 12px ${color}66` : 'none',
      }}>
        <div style={{
          position: 'absolute', top: 2,
          left: on ? 24 : 2,
          width: 16, height: 16, borderRadius: '50%',
          background: on ? 'white' : 'rgba(255,255,255,0.3)',
          transition: 'left 0.3s',
        }}/>
      </div>
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, color: on ? color : 'var(--text-secondary)', letterSpacing: '0.1em' }}>{label}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{desc}</div>
      </div>
      {on && <span className="cyber-badge badge-safe" style={{ marginLeft: 'auto' }}>ACTIVE</span>}
    </div>
  );
}

export default function LabPage() {
  const { showToast, addXP } = useStore();
  const [config, setConfig] = useState<LabConfig>({
    knnImputer: true,
    standardScaler: true,
    smote: false,
    pca: false,
    featureSelection: false,
  });
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  const toggle = (key: keyof LabConfig) => {
    setConfig(c => ({ ...c, [key]: !c[key] }));
    setApplied(false);
  };

  const applyConfig = async () => {
    setApplying(true);
    await new Promise(r => setTimeout(r, 1800));
    setApplying(false);
    setApplied(true);
    addXP(20);
    showToast('⚗ ALCHEMY COMPLETE — TRANSFORMATION APPLIED', 'success');
  };

  const activeCount = Object.values(config).filter(Boolean).length;

  const featureImportance = useMemo(() => {
    return FEATURES_LIST.map(f => ({
      name: f,
      importance: Math.random() * 0.8 + (config.featureSelection ? Math.random() * 0.5 : 0.2),
    })).sort((a, b) => b.importance - a.importance).slice(0, 12);
  }, [config.featureSelection]);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: '#ff6b00', letterSpacing: '0.1em' }}>ALCHEMY LAB</h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>DATA TRANSFORMATION WORKSHOP — TOGGLE PREPROCESSING STEPS</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className="cyber-badge badge-info">{activeCount} STEPS ACTIVE</span>
          <button
            className="neon-btn neon-btn-orange"
            onClick={applyConfig}
            disabled={applying}
            style={{ fontSize: 11, padding: '12px 24px' }}
          >
            {applying ? '⟳ APPLYING...' : '⚗ APPLY TRANSFORMATION'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20 }}>
        {/* Controls */}
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 12 }}>TRANSFORMATION CONTROLS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <ToggleSwitch
              on={config.knnImputer} onToggle={() => toggle('knnImputer')}
              label="KNN IMPUTER" color="#00d4ff"
              desc="Fill missing values using K-nearest neighbors"
            />
            <ToggleSwitch
              on={config.standardScaler} onToggle={() => toggle('standardScaler')}
              label="STANDARD SCALER" color="#a855f7"
              desc="Normalize features to zero mean, unit variance"
            />
            <ToggleSwitch
              on={config.smote} onToggle={() => toggle('smote')}
              label="SMOTE BALANCING" color="#00ff88"
              desc="Synthetic Minority Oversampling — balance classes"
            />
            <ToggleSwitch
              on={config.pca} onToggle={() => toggle('pca')}
              label="PCA REDUCTION" color="#ff6b00"
              desc="Principal Component Analysis — reduce dimensionality"
            />
            <ToggleSwitch
              on={config.featureSelection} onToggle={() => toggle('featureSelection')}
              label="FEATURE SELECTION" color="#ffcc00"
              desc="SelectKBest — keep top 20 most informative features"
            />
          </div>

          {/* Pipeline summary */}
          <div className="glass" style={{ padding: 16, marginTop: 16, borderColor: 'rgba(255,107,0,0.2)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 9, color: '#ff6b00', letterSpacing: '0.1em', marginBottom: 12 }}>ACTIVE PIPELINE</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {Object.entries(config).filter(([, v]) => v).map(([key], i) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#ff6b00' }}>{i + 1}.</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-secondary)' }}>
                    {key.replace(/([A-Z])/g, ' $1').trim().toUpperCase()}
                  </span>
                </div>
              ))}
              {activeCount === 0 && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>No steps active — raw data passthrough</span>
              )}
            </div>
          </div>

          {applied && (
            <div style={{
              marginTop: 12, padding: 14,
              background: 'rgba(0,255,136,0.06)',
              border: '1px solid rgba(0,255,136,0.25)',
              fontFamily: 'var(--font-mono)', fontSize: 11, color: '#00ff88',
            }}>
              ✓ CONFIGURATION APPLIED SUCCESSFULLY
              <div style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 4 }}>
                Accuracy impact: +{(Math.random() * 2).toFixed(1)}%
              </div>
            </div>
          )}
        </div>

        {/* Visualization */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Before/After distribution */}
          <div className="glass" style={{ padding: 20 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 14 }}>
              SIGNAL DISTRIBUTION — BEFORE vs AFTER TRANSFORMATION
            </div>
            <BeforeAfterViz config={config} />
            {config.smote && (
              <div style={{ marginTop: 12, padding: 10, background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.2)', fontFamily: 'var(--font-mono)', fontSize: 10, color: '#00ff88' }}>
                ⚡ SMOTE ACTIVE — Generating synthetic phishing samples to balance classes (50/50 ratio)
              </div>
            )}
          </div>

          {/* Feature importance */}
          <div className="glass" style={{ padding: 20 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 14 }}>
              FEATURE IMPORTANCE {config.featureSelection ? '— SelectKBest Active' : ''}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {featureImportance.map((f, i) => (
                <div key={f.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: i < 5 ? '#ff2244' : 'var(--text-secondary)' }}>
                      {i < 5 ? '▲ ' : ''}{f.name.replace(/_/g, ' ')}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>{f.importance.toFixed(3)}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{
                      width: `${f.importance * 100}%`,
                      background: i < 5 ? 'linear-gradient(90deg, #ff2244, #ff6b00)' : 'linear-gradient(90deg, #00d4ff, #a855f7)',
                    }}/>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { label: 'Records', value: config.smote ? '14,881' : '12,401', color: '#00d4ff' },
              { label: 'Features', value: config.featureSelection ? '20' : '30', color: '#a855f7' },
              { label: 'Class Balance', value: config.smote ? '50/50' : '44/56', color: '#00ff88' },
            ].map(s => (
              <div key={s.label} className="glass" style={{ padding: 14, textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 8, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 6 }}>{s.label.toUpperCase()}</div>
                <div className="metric-num" style={{ fontSize: 20, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
