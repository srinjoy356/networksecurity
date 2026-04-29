// src/lib/data.ts

export const FEATURES_LIST = [
  "having_IP_Address","URL_Length","Shortining_Service","having_At_Symbol",
  "double_slash_redirecting","Prefix_Suffix","having_Sub_Domain","SSLfinal_State",
  "Domain_registeration_length","Favicon","port","HTTPS_token","Request_URL",
  "URL_of_Anchor","Links_in_tags","SFH","Submitting_to_email","Abnormal_URL",
  "Redirect","on_mouseover","RightClick","popUpWidnow","Iframe","age_of_domain",
  "DNSRecord","web_traffic","Page_Rank","Google_Index","Links_pointing_to_page",
  "Statistical_report"
];

export interface Prediction {
  id: number;
  user_id: number;
  url: string;
  prediction: 0 | 1;
  label: string;
  phishing_signal_count: number;
  suspicious_signal_count: number;
  features: Record<string, number>;
  feature_vector: number[];
  created_at: string;
}

export interface TrainingLog {
  id: number;
  status: 'success' | 'failed' | 'running';
  triggered_by: number;
  created_at: string;
  finished_at: string | null;
  error_message: string | null;
  accuracy?: number;
  duration_ms?: number;
}

export interface PipelineStage {
  id: string;
  name: string;
  gameLabel: string;
  icon: string;
  color: string;
  status: 'idle' | 'active' | 'completed' | 'failed';
  records?: number;
  latency?: number;
  errorRate?: number;
}

export function genPrediction(id: number, userId = 1): Prediction {
  const isPhishing = Math.random() > 0.45;
  const vec = FEATURES_LIST.map(() => Math.random() > 0.5 ? 1 : -1);
  const phishCount = vec.filter(v => v === -1).length;
  const suspCount = vec.filter(v => v === 1).length;
  const domains = [
    "secure-login.net","paypal-verify.ru","amazon-support.xyz",
    "google.com","github.com","stripe.com","netflix.com","facebook-login.tk",
    "apple.com","linkedin.com","bank-update.info","microsoft.com",
    "signin-amazon.co","accounts-google.ml","wellsfargo-verify.net",
    "dropbox.com","twitter.com","instagram.com"
  ];
  const url = "https://" + domains[Math.floor(Math.random() * domains.length)] + "/path?id=" + id;
  const daysAgo = Math.floor(Math.random() * 30);
  const hoursAgo = Math.floor(Math.random() * 24);
  const ts = new Date(Date.now() - daysAgo * 86400000 - hoursAgo * 3600000);
  const featureMap: Record<string, number> = {};
  FEATURES_LIST.forEach((f, i) => featureMap[f] = vec[i]);
  return {
    id, user_id: userId, url,
    prediction: isPhishing ? 0 : 1,
    label: isPhishing ? "Phishing" : "Legitimate",
    phishing_signal_count: phishCount,
    suspicious_signal_count: suspCount,
    features: featureMap,
    feature_vector: vec,
    created_at: ts.toISOString()
  };
}

export const MOCK_PREDICTIONS: Prediction[] = Array.from({ length: 60 }, (_, i) => genPrediction(i + 1));

export const MOCK_TRAINING_LOGS: TrainingLog[] = [
  {
    id: 1, status: "success", triggered_by: 1,
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    finished_at: new Date(Date.now() - 7 * 86400000 + 1200000).toISOString(),
    error_message: null, accuracy: 97.3, duration_ms: 1200000
  },
  {
    id: 2, status: "failed", triggered_by: 1,
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    finished_at: new Date(Date.now() - 3 * 86400000 + 300000).toISOString(),
    error_message: "Model convergence error: gradient exploded at epoch 12", accuracy: undefined, duration_ms: 300000
  },
  {
    id: 3, status: "success", triggered_by: 1,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    finished_at: new Date(Date.now() - 86400000 + 980000).toISOString(),
    error_message: null, accuracy: 98.1, duration_ms: 980000
  },
];

export const PIPELINE_STAGES: PipelineStage[] = [
  { id: "ingest", name: "Data Ingestion", gameLabel: "DATA MINE", icon: "⛏", color: "#00d4ff", status: "idle", records: 12453, latency: 234, errorRate: 0.2 },
  { id: "validate", name: "Data Validation", gameLabel: "FIREWALL GATE", icon: "🔒", color: "#a855f7", status: "idle", records: 12401, latency: 89, errorRate: 0.4 },
  { id: "transform", name: "Data Transformation", gameLabel: "ALCHEMY LAB", icon: "⚗", color: "#ff6b00", status: "idle", records: 12401, latency: 567, errorRate: 0.1 },
  { id: "train", name: "Model Training", gameLabel: "AI FORGE", icon: "🔥", color: "#ffcc00", status: "idle", records: 9921, latency: 12000, errorRate: 0.0 },
  { id: "evaluate", name: "Model Evaluation", gameLabel: "TRIAL ARENA", icon: "⚔", color: "#00ff88", status: "idle", records: 2480, latency: 340, errorRate: 0.0 },
  { id: "deploy", name: "Deployment", gameLabel: "LAUNCH TOWER", icon: "🚀", color: "#a855f7", status: "idle", records: 1, latency: 45, errorRate: 0.0 },
  { id: "predict", name: "Battle Zone", gameLabel: "BATTLE ZONE", icon: "⚡", color: "#ff2244", status: "active", records: 4821, latency: 12, errorRate: 2.1 },
];

export const MODEL_STATS = {
  randomForest: { accuracy: 97.8, precision: 96.4, recall: 98.2, f1: 97.3, auc: 0.993 },
  logisticRegression: { accuracy: 91.2, precision: 89.7, recall: 92.1, f1: 90.9, auc: 0.962 },
  xgboost: { accuracy: 96.1, precision: 95.0, recall: 97.3, f1: 96.1, auc: 0.988 },
  svm: { accuracy: 93.4, precision: 92.1, recall: 94.8, f1: 93.4, auc: 0.971 },
};
