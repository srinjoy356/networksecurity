'use client';
import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import type { PipelineStage } from '@/lib/data';

const STAGE_DETAILS: Record<string, { desc: string; metrics: { label: string; value: string }[] }> = {
  ingest: {
    desc: 'Extracts raw data from MongoDB and converts to CSV format. This is where the data journey begins.',
    metrics: [{ label: 'Records/sec', value: '1,247' }, { label: 'Sources', value: '3' }, { label: 'Uptime', value: '99.9%' }, { label: 'Latency', value: '234ms' }]
  },
  validate: {
    desc: 'Applies schema validation, drift detection, and data quality checks before transformation.',
    metrics: [{ label: 'Schema OK', value: '98.3%' }, { label: 'Drift Score', value: '0.04' }, { label: 'Null Rate', value: '0.41%' }, { label: 'Latency', value: '89ms' }]
  },
  transform: {
    desc: 'KNN Imputer fills missing values, StandardScaler normalizes features, SMOTE balances classes.',
    metrics: [{ label: 'Features', value: '30' }, { label: 'Imputed', value: '0.8%' }, { label: 'SMOTE ratio', value: '1:1' }, { label: 'Latency', value: '567ms' }]
  },
  train: {
    desc: 'Model Factory trains multiple classifiers. Random Forest selected as champion model.',
    metrics: [{ label: 'Accuracy', value: '97.8%' }, { label: 'Epochs', value: '100' }, { label: 'F1 Score', value: '97.3' }, { label: 'AUC', value: '0.993' }]
  },
  evaluate: {
    desc: 'Evaluates model on holdout set. Compares against baseline and previous versions.',
    metrics: [{ label: 'Precision', value: '96.4%' }, { label: 'Recall', value: '98.2%' }, { label: 'Improvement', value: '+2.1%' }, { label: 'Latency', value: '340ms' }]
  },
  deploy: {
    desc: 'Packages model artifact and deploys to production inference server.',
    metrics: [{ label: 'Version', value: 'v2.0.1' }, { label: 'Replicas', value: '3' }, { label: 'Deploy time', value: '45s' }, { label: 'Memory', value: '512MB' }]
  },
  predict: {
    desc: 'Real-time URL classification endpoint. Processes 30 features in milliseconds.',
    metrics: [{ label: 'Requests/min', value: '4,821' }, { label: 'P99 Latency', value: '12ms' }, { label: 'Error rate', value: '2.1%' }, { label: 'Cache hit', value: '68%' }]
  },
};

interface Particle {
  id: number;
  x: number;
  progress: number;
  color: string;
  speed: number;
  isPhishing: boolean;
}

function ParticleFlow({ running }: { running: boolean }) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!running) { setParticles([]); return; }
    let id = 0;
    const interval = setInterval(() => {
      const isPhishing = Math.random() > 0.55;
      setParticles(prev => [
        ...prev.filter(p => p.progress < 100).slice(-20),
        {
          id: id++,
          x: 0,
          progress: 0,
          color: isPhishing ? '#ff2244' : '#00d4ff',
          speed: 0.3 + Math.random() * 0.4,
          isPhishing,
        }
      ]);
    }, 400);

    const animInterval = setInterval(() => {
      setParticles(prev => prev.map(p => ({ ...p, progress: p.progress + p.speed })).filter(p => p.progress < 105));
    }, 50);

    return () => { clearInterval(interval); clearInterval(animInterval); };
  }, [running]);

  return (
    <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 6, transform: 'translateY(-50%)', overflow: 'visible', pointerEvents: 'none' }}>
      {particles.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          left: `${p.progress}%`,
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 8, height: 8, borderRadius: '50%',
          background: p.color,
          boxShadow: `0 0 8px ${p.color}, 0 0 16px ${p.color}`,
          transition: 'left 0.05s linear',
        }}/>
      ))}
    </div>
  );
}

function StageNode({ stage, index, total, isSelected, onClick, running }: {
  stage: PipelineStage;
  index: number;
  total: number;
  isSelected: boolean;
  onClick: () => void;
  running: boolean;
}) {
  const statusColor = {
    idle: '#3a5270',
    active: stage.color,
    completed: '#00ff88',
    failed: '#ff2244',
  }[stage.status];

  const isActive = stage.status === 'active' || (running && stage.status !== 'failed');

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        cursor: 'pointer', position: 'relative', zIndex: 1,
        flex: 1,
      }}
    >
      {/* Node circle */}
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: isSelected ? `${stage.color}22` : 'rgba(8,15,28,0.9)',
        border: `2px solid ${statusColor}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, position: 'relative',
        boxShadow: isActive ? `0 0 20px ${stage.color}66` : 'none',
        transition: 'all 0.3s',
      }}>
        {isActive && (
          <div style={{
            position: 'absolute', inset: -6, borderRadius: '50%',
            border: `1px solid ${stage.color}`,
            opacity: 0.4,
            animation: 'ring-pulse 2s ease-out infinite',
          }}/>
        )}
        {stage.icon}
      </div>

      {/* Stage name */}
      <div style={{ marginTop: 10, textAlign: 'center' }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 8,
          color: isSelected ? stage.color : statusColor,
          letterSpacing: '0.1em', lineHeight: 1.3,
        }}>{stage.gameLabel}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', marginTop: 3 }}>{stage.name}</div>
      </div>

      {/* Status badge */}
      <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
        <div style={{
          width: 5, height: 5, borderRadius: '50%',
          background: statusColor,
          boxShadow: stage.status === 'active' ? `0 0 6px ${statusColor}` : 'none',
          animation: stage.status === 'active' ? 'pulse-glow 1.5s ease-in-out infinite' : 'none',
        }}/>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: statusColor, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{stage.status}</span>
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const { pipelineStages, pipelineRunning, setPipelineRunning, updateStageStatus, resetStages, trainingLogs, addTrainingLog, showToast, addXP } = useStore();
  const [selectedStage, setSelectedStage] = useState<PipelineStage | null>(null);
  const [currentStageIdx, setCurrentStageIdx] = useState(-1);

  const runPipeline = async () => {
    if (pipelineRunning) return;
    setPipelineRunning(true);
    resetStages();
    setCurrentStageIdx(0);
    showToast('PIPELINE INITIATED — ENTERING DATA MINE', 'info');
    addXP(50);

    for (let i = 0; i < pipelineStages.length; i++) {
      setCurrentStageIdx(i);
      updateStageStatus(pipelineStages[i].id, 'active');
      const delay = [2000, 1500, 2500, 4000, 2000, 1500, 1000][i];
      await new Promise(r => setTimeout(r, delay));

      const success = Math.random() > 0.05;
      if (!success && i > 1) {
        updateStageStatus(pipelineStages[i].id, 'failed');
        showToast(`PIPELINE FAILED AT: ${pipelineStages[i].gameLabel}`, 'error');
        addTrainingLog({ id: Date.now(), status: 'failed', triggered_by: 1, created_at: new Date().toISOString(), finished_at: new Date().toISOString(), error_message: `Stage failed: ${pipelineStages[i].name}` });
        setPipelineRunning(false);
        setCurrentStageIdx(-1);
        return;
      }
      updateStageStatus(pipelineStages[i].id, 'completed');
    }

    showToast('🎉 PIPELINE COMPLETE — MODEL DEPLOYED SUCCESSFULLY', 'success');
    addTrainingLog({ id: Date.now(), status: 'success', triggered_by: 1, created_at: new Date().toISOString(), finished_at: new Date().toISOString(), error_message: null, accuracy: 97.8 + Math.random() * 1 });
    addXP(200);
    setPipelineRunning(false);
    setCurrentStageIdx(-1);
  };

  const details = selectedStage ? STAGE_DETAILS[selectedStage.id] : null;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: '#a855f7', letterSpacing: '0.1em' }}>PIPELINE WORLD MAP</h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>ML PIPELINE AS GAME WORLD — CLICK ANY STAGE TO INSPECT</p>
        </div>
        <button
          className={`neon-btn ${pipelineRunning ? 'neon-btn-orange' : 'neon-btn-green'}`}
          onClick={runPipeline}
          disabled={pipelineRunning}
          style={{ fontSize: 11, padding: '12px 24px' }}
        >
          {pipelineRunning ? '⟳ PIPELINE RUNNING...' : '▶ LAUNCH PIPELINE'}
        </button>
      </div>

      {/* Pipeline map */}
      <div className="glass" style={{ padding: 32, marginBottom: 20, position: 'relative' }}>
        {/* Connector line */}
        <div style={{ position: 'absolute', top: '50%', left: 60, right: 60, height: 2, background: 'rgba(0,212,255,0.08)', transform: 'translateY(-30px)' }}>
          <ParticleFlow running={pipelineRunning} />
          {/* Completed segment */}
          {currentStageIdx >= 0 && (
            <div style={{
              position: 'absolute', left: 0, top: 0,
              width: `${(currentStageIdx / (pipelineStages.length - 1)) * 100}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #00d4ff, #a855f7)',
              transition: 'width 1s ease',
            }}/>
          )}
        </div>

        {/* Stage nodes */}
        <div style={{ display: 'flex', alignItems: 'flex-start', position: 'relative' }}>
          {pipelineStages.map((stage, i) => (
            <StageNode
              key={stage.id}
              stage={stage}
              index={i}
              total={pipelineStages.length}
              isSelected={selectedStage?.id === stage.id}
              onClick={() => setSelectedStage(selectedStage?.id === stage.id ? null : stage)}
              running={pipelineRunning && currentStageIdx === i}
            />
          ))}
        </div>
      </div>

      {/* Stage inspector */}
      {selectedStage && details && (
        <div className="glass" style={{ padding: 24, borderColor: `${selectedStage.color}33`, marginBottom: 20 }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: selectedStage.color, opacity: 0.6 }}/>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 28 }}>{selectedStage.icon}</span>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: selectedStage.color, letterSpacing: '0.12em' }}>{selectedStage.gameLabel}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{selectedStage.name}</div>
                </div>
              </div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)', marginTop: 12, lineHeight: 1.6, maxWidth: 500 }}>{details.desc}</p>
            </div>
            <span className={`cyber-badge ${selectedStage.status === 'completed' ? 'badge-safe' : selectedStage.status === 'failed' ? 'badge-threat' : selectedStage.status === 'active' ? 'badge-info' : 'badge-warning'}`}>
              {selectedStage.status.toUpperCase()}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {details.metrics.map(m => (
              <div key={m.label} style={{ padding: 14, background: `${selectedStage.color}08`, border: `1px solid ${selectedStage.color}22` }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 8, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 6 }}>{m.label.toUpperCase()}</div>
                <div className="metric-num" style={{ fontSize: 20, color: selectedStage.color }}>{m.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Training history */}
      <div className="glass" style={{ padding: 20 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 14 }}>TRAINING RUN HISTORY</div>
        <table className="cyber-table">
          <thead>
            <tr><th>RUN ID</th><th>STATUS</th><th>ACCURACY</th><th>TRIGGERED</th><th>DURATION</th><th>NOTES</th></tr>
          </thead>
          <tbody>
            {trainingLogs.map(log => {
              const dur = log.finished_at ? Math.round((new Date(log.finished_at).getTime() - new Date(log.created_at).getTime()) / 1000) : null;
              return (
                <tr key={log.id}>
                  <td>#{log.id}</td>
                  <td><span className={`cyber-badge ${log.status === 'success' ? 'badge-safe' : 'badge-threat'}`}>{log.status}</span></td>
                  <td style={{ color: '#00d4ff' }}>{log.accuracy ? `${log.accuracy.toFixed(1)}%` : '—'}</td>
                  <td>{new Date(log.created_at).toLocaleString()}</td>
                  <td>{dur ? `${Math.floor(dur / 60)}m ${dur % 60}s` : '—'}</td>
                  <td style={{ color: log.error_message ? '#ff2244' : 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.error_message || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
