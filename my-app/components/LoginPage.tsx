'use client';
import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { api } from '@/lib/api';
import type { HistoryItem } from '@/lib/api';
import type { Prediction } from '@/lib/data';

function historyToPrediction(h: HistoryItem): Prediction {
  return { id: h.id, user_id: h.user_id, url: h.url, prediction: h.prediction, label: h.label, phishing_signal_count: h.phishing_signal_count, suspicious_signal_count: h.suspicious_signal_count, features: h.features, feature_vector: h.feature_vector, created_at: h.created_at };
}

export default function LoginPage({ onSwitch }: { onSwitch: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser, showToast, setPredictions } = useStore();

  const handleLogin = async () => {
    if (!username || !password) return showToast('Enter credentials', 'error');
    setLoading(true);
    try {
      const data = await api.login(username, password);
      api.setToken(data.access_token);
      const me = await api.me();
      setUser(me, data.access_token, me.role);
      localStorage.setItem('phish_token', data.access_token);
      localStorage.setItem('phish_role', me.role);
      try {
        const items = await api.history();
        setPredictions(items.map(historyToPrediction));
      } catch { setPredictions([]); }
      showToast(`AGENT ${me.username.toUpperCase()} — CLEARANCE GRANTED`, 'success');
    } catch (err: unknown) {
      showToast(`AUTH FAILED: ${err instanceof Error ? err.message : 'Login failed'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-void)',
      backgroundImage: 'linear-gradient(rgba(79,255,176,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(79,255,176,0.025) 1px, transparent 1px)',
      backgroundSize: '32px 32px',
    }}>
      <div style={{ width: 400, position: 'relative' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, margin: '0 auto 20px',
            background: 'var(--green-dim)', border: '2px solid var(--green)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-pixel)', fontSize: 24, color: 'var(--green)',
            boxShadow: '0 4px 0 #000, 0 0 24px rgba(79,255,176,0.2)',
          }}>⬡</div>
          <h1 style={{
            fontFamily: 'var(--font-pixel)', fontSize: 11,
            color: 'var(--text-primary)', letterSpacing: '0.08em',
            lineHeight: 1.8, marginBottom: 8,
          }}>PHISHGUARD AI</h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
            INTELLIGENCE PLATFORM v2.0
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderTop: '2px solid var(--green)',
          boxShadow: '0 8px 0 #000, 0 0 0 1px #000',
          padding: 32, position: 'relative',
        }}>
          {/* Pixel corner accents */}
          <div style={{ position: 'absolute', top: -1, right: -1, width: 12, height: 12, borderTop: '2px solid var(--green)', borderRight: '2px solid var(--green)' }}/>
          <div style={{ position: 'absolute', bottom: -1, left: -1, width: 12, height: 12, borderBottom: '2px solid var(--border-bright)', borderLeft: '2px solid var(--border-bright)' }}/>

          <div style={{ marginBottom: 18 }}>
            <label style={{ fontFamily: 'var(--font-pixel)', fontSize: 6, color: 'var(--text-muted)', letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>AGENT ID</label>
            <input className="cyber-input" value={username} onChange={e => setUsername(e.target.value)} placeholder="username" onKeyDown={e => e.key === 'Enter' && handleLogin()} />
          </div>

          <div style={{ marginBottom: 26 }}>
            <label style={{ fontFamily: 'var(--font-pixel)', fontSize: 6, color: 'var(--text-muted)', letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>SECURITY KEY</label>
            <input className="cyber-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="password" onKeyDown={e => e.key === 'Enter' && handleLogin()} />
          </div>

          <button className="neon-btn neon-btn-green" onClick={handleLogin} disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: 7 }}>
            {loading ? '▸ AUTHENTICATING...' : '▸ INITIATE SECURE LOGIN'}
          </button>

          <div style={{ marginTop: 20, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
            NO ACCESS?{' '}
            <button onClick={onSwitch} style={{ background: 'none', border: 'none', color: 'var(--cyan)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, textDecoration: 'underline' }}>
              REQUEST CLEARANCE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}