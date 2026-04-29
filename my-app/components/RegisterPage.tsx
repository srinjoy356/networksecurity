'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useStore } from '@/store/useStore';

export default function RegisterPage({ onSwitch }: { onSwitch: () => void }) {
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { showToast } = useStore();

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleRegister = async () => {
    if (!form.username || !form.email || !form.password) return showToast('ALL FIELDS REQUIRED', 'error');
    setLoading(true);
    try {
      await api.register(form.username, form.email, form.password);
      showToast('ACCOUNT CREATED — PROCEED TO LOGIN', 'success');
      onSwitch();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Registration failed', 'error');
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
      <div style={{ width: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, margin: '0 auto 20px',
            background: 'var(--purple-dim)', border: '2px solid var(--purple)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-pixel)', fontSize: 24, color: 'var(--purple)',
            boxShadow: '0 4px 0 #000, 0 0 24px rgba(167,139,250,0.2)',
          }}>⬡</div>
          <h1 style={{ fontFamily: 'var(--font-pixel)', fontSize: 10, color: 'var(--text-primary)', letterSpacing: '0.08em', lineHeight: 1.8, marginBottom: 8 }}>
            REQUEST CLEARANCE
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
            CREATE PHISHGUARD AGENT ACCOUNT
          </p>
        </div>

        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderTop: '2px solid var(--purple)',
          boxShadow: '0 8px 0 #000', padding: 32, position: 'relative',
        }}>
          <div style={{ position: 'absolute', top: -1, right: -1, width: 12, height: 12, borderTop: '2px solid var(--purple)', borderRight: '2px solid var(--purple)' }}/>
          <div style={{ position: 'absolute', bottom: -1, left: -1, width: 12, height: 12, borderBottom: '2px solid var(--border-bright)', borderLeft: '2px solid var(--border-bright)' }}/>

          {(['username', 'email', 'password'] as const).map(k => (
            <div key={k} style={{ marginBottom: 16 }}>
              <label style={{ fontFamily: 'var(--font-pixel)', fontSize: 6, color: 'var(--text-muted)', letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>
                {k === 'username' ? 'AGENT CALLSIGN' : k === 'email' ? 'SECURE EMAIL' : 'SECURITY KEY'}
              </label>
              <input className="cyber-input" type={k === 'password' ? 'password' : k === 'email' ? 'email' : 'text'}
                value={form[k]} onChange={set(k)}
                placeholder={k === 'email' ? 'agent@phishguard.ai' : k}
                onKeyDown={e => e.key === 'Enter' && handleRegister()} />
            </div>
          ))}

          <button className="neon-btn neon-btn-purple" onClick={handleRegister} disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: 7, marginTop: 8 }}>
            {loading ? '▸ CREATING ACCOUNT...' : '▸ CREATE AGENT ACCOUNT'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 20, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
            ALREADY HAVE ACCESS?{' '}
            <button onClick={onSwitch} style={{ background: 'none', border: 'none', color: 'var(--cyan)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, textDecoration: 'underline' }}>
              SIGN IN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}