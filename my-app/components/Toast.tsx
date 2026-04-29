'use client';
import { useStore } from '@/store/useStore';

export default function Toast() {
  const { toast, dismissToast } = useStore();
  if (!toast) return null;

  const configs = {
    info:    { border: 'var(--cyan)',   color: 'var(--cyan)',   bg: 'var(--cyan-dim)',   icon: '▸' },
    success: { border: 'var(--green)',  color: 'var(--green)',  bg: 'var(--green-dim)',  icon: '✓' },
    error:   { border: 'var(--red)',    color: 'var(--red)',    bg: 'var(--red-dim)',    icon: '✕' },
    warning: { border: 'var(--orange)', color: 'var(--orange)', bg: 'var(--orange-dim)', icon: '!' },
  };
  const c = configs[toast.type as keyof typeof configs];

  return (
    <div onClick={dismissToast} style={{
      position: 'fixed', bottom: 20, right: 20, zIndex: 9999,
      background: 'var(--bg-card)',
      border: `1px solid ${c.border}`,
      borderLeft: `3px solid ${c.border}`,
      padding: '12px 16px',
      display: 'flex', alignItems: 'center', gap: 10,
      cursor: 'pointer',
      boxShadow: `0 4px 0 #000, 0 0 20px rgba(0,0,0,0.5)`,
      animation: 'fadeIn 0.2s ease',
      maxWidth: 380,
      minWidth: 240,
    }}>
      <span style={{
        fontFamily: 'var(--font-pixel)', fontSize: 10,
        color: c.color, flexShrink: 0,
        width: 16, textAlign: 'center',
      }}>{c.icon}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-primary)', lineHeight: 1.4 }}>{toast.msg}</span>
      <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 6, color: 'var(--text-dim)', marginLeft: 'auto', flexShrink: 0 }}>✕</span>
    </div>
  );
}