'use client';
import { useStore } from '@/store/useStore';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'COMMAND HQ',   icon: '▣', sub: 'Overview' },
  { id: 'pipeline',  label: 'PIPELINE',      icon: '▶', sub: 'World Map' },
  { id: 'scanner',   label: 'URL SCANNER',   icon: '◎', sub: 'Battle Mode' },
  { id: 'arena',     label: 'MODEL ARENA',   icon: '⚔', sub: 'Compare' },
  { id: 'lab',       label: 'ALCHEMY LAB',   icon: '⚗', sub: 'Transform' },
  { id: 'history',   label: 'THREAT LOG',    icon: '▤', sub: 'Records' },
  { id: 'intel',     label: 'AI INTEL',      icon: '◈', sub: 'Insights' },
];

const ADMIN_ITEMS = [
  { id: 'admin', label: 'WAR ROOM', icon: '◆', sub: 'Admin' },
];

export default function Sidebar() {
  const { user, role, activeTab, setActiveTab, logout, xpPoints, level, achievements } = useStore();
  const xpProgress = ((xpPoints % 200) / 200) * 100;

  return (
    <nav style={{
      width: 216,
      minHeight: '100vh',
      background: 'var(--bg-base)',
      borderRight: '2px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      top: 0, left: 0,
      zIndex: 100,
      boxShadow: '2px 0 0 #000',
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 16px 18px', borderBottom: '2px solid var(--border)', background: 'var(--bg-card)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, flexShrink: 0,
            background: 'var(--green-dim)', border: '1px solid var(--green)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-pixel)', fontSize: 12, color: 'var(--green)',
            boxShadow: '0 2px 0 #000, 0 0 8px rgba(79,255,176,0.15)',
          }}>⬡</div>
          <div>
            <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 7, color: 'var(--green)', letterSpacing: '0.1em', lineHeight: 1.8 }}>PHISHGUARD</div>
            <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 6, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>AI · v2.0</div>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        <div style={{ padding: '10px 16px 6px', fontFamily: 'var(--font-pixel)', fontSize: 6, color: 'var(--text-dim)', letterSpacing: '0.1em' }}>ZONES</div>
        {NAV_ITEMS.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button key={item.id} onClick={() => setActiveTab(item.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 16px', width: '100%',
              background: isActive ? 'var(--bg-raised)' : 'none',
              border: 'none', borderLeft: `2px solid ${isActive ? 'var(--green)' : 'transparent'}`,
              cursor: 'pointer', color: isActive ? 'var(--green)' : 'var(--text-muted)', transition: 'all 0.1s',
            }}>
              <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 10, minWidth: 16, textAlign: 'center' }}>{item.icon}</span>
              <div>
                <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 6, letterSpacing: '0.06em', lineHeight: 1.8 }}>{item.label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: isActive ? 'rgba(79,255,176,0.5)' : 'var(--text-dim)', marginTop: 1 }}>{item.sub}</div>
              </div>
            </button>
          );
        })}

        {role === 'admin' && (
          <>
            <div style={{ padding: '12px 16px 6px', fontFamily: 'var(--font-pixel)', fontSize: 6, color: 'var(--text-dim)', letterSpacing: '0.1em', borderTop: '1px solid var(--border)', marginTop: 6 }}>ADMIN</div>
            {ADMIN_ITEMS.map(item => {
              const isActive = activeTab === item.id;
              return (
                <button key={item.id} onClick={() => setActiveTab(item.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 16px', width: '100%',
                  background: isActive ? 'rgba(245,230,66,0.06)' : 'none',
                  border: 'none', borderLeft: `2px solid ${isActive ? 'var(--yellow)' : 'transparent'}`,
                  cursor: 'pointer', color: isActive ? 'var(--yellow)' : 'var(--text-muted)', transition: 'all 0.1s',
                }}>
                  <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 10, minWidth: 16, textAlign: 'center' }}>{item.icon}</span>
                  <div>
                    <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 6, letterSpacing: '0.06em', lineHeight: 1.8 }}>{item.label}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)', marginTop: 1 }}>{item.sub}</div>
                  </div>
                </button>
              );
            })}
          </>
        )}
      </div>

      {/* Player stats */}
      <div style={{ padding: 14, borderTop: '2px solid var(--border)', background: 'var(--bg-card)' }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
            <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 6, color: 'var(--text-muted)' }}>LVL {level}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--cyan)' }}>{xpPoints} XP</span>
          </div>
          <div className="progress-bar" style={{ height: 6 }}>
            <div className="progress-fill" style={{ width: `${xpProgress}%`, background: 'var(--cyan)' }}/>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)', marginTop: 3, textAlign: 'right' }}>{xpPoints % 200} / 200 xp</div>
        </div>

        {achievements.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
            {achievements.slice(0, 6).map(a => (
              <div key={a} title={a.replace(/_/g, ' ')} style={{
                width: 18, height: 18, background: 'var(--bg-raised)', border: '1px solid var(--border-bright)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, cursor: 'help',
              }}>⭐</div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{
            width: 26, height: 26, flexShrink: 0, background: 'var(--green-dim)', border: '1px solid var(--green)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-pixel)', fontSize: 8, color: 'var(--green)',
          }}>{user?.username?.[0]?.toUpperCase()}</div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.username}</div>
            <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 6, color: role === 'admin' ? 'var(--yellow)' : 'var(--text-muted)', marginTop: 2 }}>{role?.toUpperCase()}</div>
          </div>
        </div>

        <button onClick={logout} className="neon-btn neon-btn-red" style={{ width: '100%', justifyContent: 'center', fontSize: 7, padding: '8px 12px' }}>
          DISCONNECT
        </button>
      </div>
    </nav>
  );
}