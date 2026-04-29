// src/store/useStore.ts
import { create } from 'zustand';
import { Prediction, TrainingLog, PipelineStage, MOCK_TRAINING_LOGS, PIPELINE_STAGES } from '@/lib/data';

export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

export interface Toast {
  id: number;
  msg: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

interface AppState {
  // Auth
  user: User | null;
  token: string | null;
  role: string | null;

  // Data
  predictions: Prediction[];
  trainingLogs: TrainingLog[];
  pipelineStages: PipelineStage[];
  useMockData: boolean;

  // UI
  activeTab: string;
  toast: Toast | null;
  selectedPrediction: Prediction | null;
  pipelineRunning: boolean;
  xpPoints: number;
  level: number;
  achievements: string[];

  // Actions
  setUser: (user: User | null, token: string | null, role: string | null) => void;
  logout: () => void;
  setPredictions: (p: Prediction[]) => void;
  addPrediction: (p: Prediction) => void;
  setTrainingLogs: (logs: TrainingLog[]) => void;
  addTrainingLog: (log: TrainingLog) => void;
  setActiveTab: (tab: string) => void;
  showToast: (msg: string, type?: Toast['type']) => void;
  dismissToast: () => void;
  setSelectedPrediction: (p: Prediction | null) => void;
  setPipelineRunning: (v: boolean) => void;
  updateStageStatus: (id: string, status: PipelineStage['status']) => void;
  resetStages: () => void;
  addXP: (pts: number) => void;
  unlockAchievement: (a: string) => void;
  setUseMockData: (v: boolean) => void;
}

export const useStore = create<AppState>((set, get) => ({
  user: null,
  token: null,
  role: null,
  predictions: [],           // ← starts empty; filled by real API after login
  trainingLogs: MOCK_TRAINING_LOGS,
  pipelineStages: PIPELINE_STAGES.map(s => ({ ...s })),
  useMockData: false,        // ← default to real API
  activeTab: 'dashboard',
  toast: null,
  selectedPrediction: null,
  pipelineRunning: false,
  xpPoints: 1240,
  level: 7,
  achievements: ['first_scan', 'threat_hunter', 'pipeline_master'],

  setUser: (user, token, role) => set({ user, token, role }),

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('phish_token');
      localStorage.removeItem('phish_role');
    }
    set({ user: null, token: null, role: null, predictions: [], xpPoints: 0 });
  },

  setPredictions: (predictions) => set({ predictions }),
  addPrediction: (p) => set(s => ({ predictions: [p, ...s.predictions] })),
  setTrainingLogs: (trainingLogs) => set({ trainingLogs }),
  addTrainingLog: (log) => set(s => ({ trainingLogs: [log, ...s.trainingLogs] })),
  setActiveTab: (activeTab) => set({ activeTab }),

  showToast: (msg, type = 'info') => {
    const id = Date.now();
    set({ toast: { id, msg, type } });
    setTimeout(() => {
      const current = get().toast;
      if (current?.id === id) set({ toast: null });
    }, 3500);
  },

  dismissToast: () => set({ toast: null }),
  setSelectedPrediction: (selectedPrediction) => set({ selectedPrediction }),
  setPipelineRunning: (pipelineRunning) => set({ pipelineRunning }),

  updateStageStatus: (id, status) => set(s => ({
    pipelineStages: s.pipelineStages.map(stage =>
      stage.id === id ? { ...stage, status } : stage
    )
  })),

  resetStages: () => set(s => ({
    pipelineStages: s.pipelineStages.map(stage => ({ ...stage, status: 'idle' as const }))
  })),

  addXP: (pts) => set(s => {
    const newXP = s.xpPoints + pts;
    const newLevel = Math.floor(newXP / 200) + 1;
    return { xpPoints: newXP, level: newLevel };
  }),

  unlockAchievement: (a) => set(s => ({
    achievements: s.achievements.includes(a) ? s.achievements : [...s.achievements, a]
  })),

  setUseMockData: (useMockData) => set({ useMockData }),
}));