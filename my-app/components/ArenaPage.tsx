'use client';
import { useState } from 'react';
import { MODEL_STATS } from '@/lib/data';
import { useStore } from '@/store/useStore';

interface ModelStat { accuracy: number; precision: number; recall: number; f1: number; auc: number; }

const MODELS: { id: string; name: string; icon: string; color: string; stats: ModelStat; desc: string }[] = [
  { id: 'randomForest', name: 'Random Forest', icon: '🌲', color: '#00ff88', stats: MODEL_STATS.randomForest, desc: 'Ensemble of 100 decision trees. Robust and interpretable. Current production champion.' },
  { id: 'xgboost', name: 'XGBoost', icon: '⚡', color: '#00d4ff', stats: MODEL_STATS.xgboost, desc: 'Gradient boosted trees with extreme regularization. Strong performance on tabular data.' },
  { id: 'svm', name: 'SVM', icon: '⬡', color: '#a855f7', stats: MODEL_STATS.svm, desc: 'Support Vector Machine with RBF kernel. Excellent boundary detection for phishing features.' },
  { id: 'logisticRegression', name: 'Logistic Regression', icon: '📈', color: '#ff6b00', stats: MODEL_STATS.logisticRegression, desc: 'Linear baseline model. Fast, interpretable, but limited feature interaction learning.' },
];

function ModelCard({ model, isChampion, isSelected, onClick }: {
  model: typeof MODELS[0];
  isChampion: boolean;
  isSelected: boolean;
  onClick: () => void;
}) {
  const metrics: { key: keyof ModelStat; label: string }[] = [
    { key: 'accuracy', label: 'ACCURACY' },
    { key: 'precision', label: 'PRECISION' },
    { key: 'recall', label: 'RECALL' },
    { key: 'f1', label: 'F1 SCORE' },
  ];

  return (
    <div
      onClick={onClick}
      style={{
        padding: 24, cursor: 'pointer',
        background: isSelected ? `${model.color}08` : 'rgba(8,15,28,0.6)',
        border: `2px solid ${isSelected || isChampion ? model.color : 'rgba(0,212,255,0.1)'}`,
        transition: 'all 0.3s', position: 'relative',
        boxShadow: isChampion ? `0 0 30px ${model.color}33` : 'none',
      }}
      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.borderColor = `${model.color}55`; }}
      onMouseLeave={e => { if (!isSelected && !isChampion) (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(0,212,255,0.1)'; }}
    >
      {isChampion && (
        <div style={{
          position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
          background: model.color, color: 'black', fontFamily: 'var(--font-display)',
          fontSize: 8, letterSpacing: '0.1em', padding: '3px 12px',
        }}>
          ★ CHAMPION
        </div>
      )}
      {isSelected && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: model.color }}/>}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <span style={{ fontSize: 28 }}>{model.icon}</span>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: model.color, letterSpacing: '0.1em' }}>{model.name.toUpperCase()}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>ML Classifier v2.0</div>
        </div>
      </div>

      {/* Metrics */}
      {metrics.map(({ key, label }) => {
        const val = model.stats[key];
        return (
          <div key={key} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>{label}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: model.color }}>{val}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${val}%`, background: model.color, opacity: 0.8 }}/>
            </div>
          </div>
        );
      })}

      <div style={{ marginTop: 14, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.5 }}>{model.desc}</div>

      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: `1px solid ${model.color}22` }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 8, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>AUC-ROC</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: model.color, fontWeight: 700 }}>{model.stats.auc}</span>
      </div>
    </div>
  );
}

function RadarComparison({ models }: { models: typeof MODELS }) {
  const cx = 150; const cy = 150; const r = 110;
  const metrics: (keyof ModelStat)[] = ['accuracy', 'precision', 'recall', 'f1'];
  const n = metrics.length;
  const gridLevels = [0.25, 0.5, 0.75, 1.0];
  const minVal = 88; const range = 12;

  return (
    <svg width="300" height="300" viewBox="0 0 300 300">
      {/* Grid */}
      {gridLevels.map(lv => {
        const pts = Array.from({ length: n }, (_, i) => {
          const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
          return `${cx + r * lv * Math.cos(angle)},${cy + r * lv * Math.sin(angle)}`;
        }).join(' ');
        return <polygon key={lv} points={pts} fill="none" stroke="rgba(0,212,255,0.08)" strokeWidth="1"/>;
      })}
      {/* Axes */}
      {Array.from({ length: n }, (_, i) => {
        const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
        return (
          <g key={i}>
            <line x1={cx} y1={cy} x2={cx + r * Math.cos(angle)} y2={cy + r * Math.sin(angle)} stroke="rgba(0,212,255,0.06)" strokeWidth="1"/>
            <text x={cx + (r + 18) * Math.cos(angle)} y={cy + (r + 18) * Math.sin(angle)}
              textAnchor="middle" dominantBaseline="central"
              fontSize="9" fill="rgba(122,156,192,0.6)" fontFamily="var(--font-display)">{metrics[i].toUpperCase()}</text>
          </g>
        );
      })}
      {/* Model polygons */}
      {models.map(model => {
        const pts = metrics.map((m, i) => {
          const val = (model.stats[m] - minVal) / range;
          const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
          return `${cx + r * val * Math.cos(angle)},${cy + r * val * Math.sin(angle)}`;
        }).join(' ');
        return (
          <g key={model.id}>
            <polygon points={pts} fill={`${model.color}15`} stroke={model.color} strokeWidth="1.5" opacity="0.8"/>
          </g>
        );
      })}
    </svg>
  );
}

export default function ArenaPage() {
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [battleRunning, setBattleRunning] = useState(false);
  const [battleResult, setBattleResult] = useState<string | null>(null);
  const { showToast, addXP } = useStore();

  const champion = MODELS[0]; // Random Forest

  const runBattle = async () => {
    setBattleRunning(true);
    setBattleResult(null);
    showToast('⚔ MODEL ARENA BATTLE INITIATED', 'info');
    await new Promise(r => setTimeout(r, 3000));
    setBattleResult('randomForest');
    showToast('🏆 RANDOM FOREST CROWNED CHAMPION!', 'success');
    addXP(30);
    setBattleRunning(false);
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: '#ffcc00', letterSpacing: '0.1em' }}>MODEL ARENA</h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>COMPETING ML MODELS — CLICK TO SELECT — RUN BATTLE TO FIND CHAMPION</p>
        </div>
        <button
          className="neon-btn neon-btn-orange"
          onClick={runBattle}
          disabled={battleRunning}
          style={{ fontSize: 11, padding: '12px 24px' }}
        >
          {battleRunning ? '⟳ BATTLE IN PROGRESS...' : '⚔ RUN ARENA BATTLE'}
        </button>
      </div>

      {/* Battle status */}
      {battleRunning && (
        <div className="glass" style={{ padding: 20, marginBottom: 20, borderColor: 'rgba(255,204,0,0.3)', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: '#ffcc00', letterSpacing: '0.2em', marginBottom: 12 }}>⚔ MODELS BATTLING ⚔</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20 }}>
            {MODELS.map((m, i) => (
              <div key={m.id} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, animation: `pulse-glow ${0.5 + i * 0.2}s ease-in-out infinite` }}>{m.icon}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: m.color }}>{m.name}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, height: 2, background: 'rgba(255,204,0,0.1)' }}>
            <div style={{ height: '100%', background: 'linear-gradient(90deg, #ffcc00, #ff6b00)', animation: 'shimmer 1s linear infinite', backgroundSize: '200% 100%' }}/>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>
        {/* Model grid */}
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {MODELS.map(model => (
              <ModelCard
                key={model.id}
                model={model}
                isChampion={battleResult === model.id || (!battleResult && model.id === 'randomForest')}
                isSelected={selectedModel === model.id}
                onClick={() => setSelectedModel(selectedModel === model.id ? null : model.id)}
              />
            ))}
          </div>
        </div>

        {/* Radar comparison */}
        <div className="glass" style={{ padding: 20 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 14 }}>PERFORMANCE RADAR</div>
          <RadarComparison models={MODELS} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {MODELS.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                <div style={{ width: 12, height: 2, background: m.color }}/>
                <span style={{ color: 'var(--text-muted)' }}>{m.name}</span>
                <span style={{ color: m.color, marginLeft: 'auto' }}>{m.stats.accuracy}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Comparison table */}
      <div className="glass" style={{ padding: 20, marginTop: 20 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 14 }}>FULL COMPARISON TABLE</div>
        <table className="cyber-table">
          <thead>
            <tr>
              <th>MODEL</th>
              <th>ACCURACY</th>
              <th>PRECISION</th>
              <th>RECALL</th>
              <th>F1 SCORE</th>
              <th>AUC-ROC</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {MODELS.map((m, i) => (
              <tr key={m.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedModel(m.id)}>
                <td style={{ color: m.color }}>
                  <span style={{ marginRight: 8 }}>{m.icon}</span>{m.name}
                </td>
                <td style={{ color: '#00d4ff' }}>{m.stats.accuracy}%</td>
                <td>{m.stats.precision}%</td>
                <td>{m.stats.recall}%</td>
                <td>{m.stats.f1}%</td>
                <td style={{ color: m.color }}>{m.stats.auc}</td>
                <td>
                  {i === 0
                    ? <span className="cyber-badge badge-safe">★ PRODUCTION</span>
                    : <span className="cyber-badge badge-info">STANDBY</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
