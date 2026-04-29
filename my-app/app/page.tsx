'use client';
import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import Sidebar from '@/components/Sidebar';
import Toast from '@/components/Toast';
import LoginPage from '@/components/LoginPage';
import RegisterPage from '@/components/RegisterPage';
import DashboardPage from '@/components/DashboardPage';
import PipelinePage from '@/components/PipelinePage';
import ScannerPage from '@/components/ScannerPage';
import ArenaPage from '@/components/ArenaPage';
import LabPage from '@/components/LabPage';
import HistoryPage from '@/components/HistoryPage';
import { IntelPage, AdminPage } from '@/components/IntelAdminPages';
import { api } from '@/lib/api';
import type { HistoryItem } from '@/lib/api';
import type { Prediction } from '@/lib/data';

const PAGES: Record<string, React.ComponentType> = {
  dashboard: DashboardPage,
  pipeline: PipelinePage,
  scanner: ScannerPage,
  arena: ArenaPage,
  lab: LabPage,
  history: HistoryPage,
  intel: IntelPage,
  admin: AdminPage,
};

// Map API HistoryItem → store Prediction shape (they're identical, but be explicit)
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

export default function App() {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const { user, activeTab, setUser, setPredictions, showToast } = useStore();

  // Restore session from localStorage on first load
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('phish_token') : null;
    const savedRole = typeof window !== 'undefined' ? localStorage.getItem('phish_role') : null;

    if (token) {
      api.setToken(token);
      api.me()
        .then((me) => {
          setUser(me, token, savedRole || me.role);
          // Load real history after restoring session
          return api.history();
        })
        .then((items) => {
          setPredictions(items.map(historyToPrediction));
        })
        .catch(() => {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('phish_token');
            localStorage.removeItem('phish_role');
          }
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user) {
    return (
      <>
        {authMode === 'login'
          ? <LoginPage onSwitch={() => setAuthMode('register')} />
          : <RegisterPage onSwitch={() => setAuthMode('login')} />}
        <Toast />
      </>
    );
  }

  const PageComponent = PAGES[activeTab] || DashboardPage;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{
        marginLeft: 220,
        flex: 1,
        minHeight: '100vh',
        position: 'relative',
        overflowX: 'hidden',
      }}>
        <div style={{
          position: 'fixed',
          top: '20%', left: '50%',
          width: 600, height: 400,
          background: 'radial-gradient(ellipse, rgba(0,212,255,0.02) 0%, transparent 70%)',
          transform: 'translateX(-50%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}/>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <PageComponent />
        </div>
      </main>
      <Toast />
    </div>
  );
}