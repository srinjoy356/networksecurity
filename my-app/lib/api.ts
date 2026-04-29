// lib/api.ts

const API_BASE = "https://networksecurity-q9nz.onrender.com";

// ── Response types matching the API docs exactly ──────────────────────────────

export interface LoginResponse {
  access_token: string;
  token_type: 'bearer';
  role: string;
}

export interface UserResponse {
  id: number;
  username: string;
  email: string;
  role: string;
}

export interface RegisterResponse {
  id: number;
  username: string;
  email: string;
  role: string;
}

export interface PredictUrlResponse {
  url: string;
  prediction: 0 | 1;           // 0 = Phishing, 1 = Legitimate
  label: string;               // "Phishing" | "Legitimate"
  phishing_signal_count: number;
  suspicious_signal_count: number;
  features: Record<string, number>;
  feature_vector: number[];
  log_id: number;
}

// /predict/history returns the 50 most recent predictions for the logged-in user.
// The API docs say the response schema is just "string" (OpenAPI auto-generated),
// but the actual payload is an array of prediction log objects.
export interface HistoryItem {
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

// ── API service ───────────────────────────────────────────────────────────────

class ApiService {
  private token: string | null = null;

  setToken(t: string) { this.token = t; }
  clearToken() { this.token = null; }

  private authHeaders(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.token) h['Authorization'] = `Bearer ${this.token}`;
    return h;
  }

  private async json<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(API_BASE + path, {
      method,
      headers: this.authHeaders(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { detail?: string };
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  // POST /auth/login  — form-encoded, not JSON
  async login(username: string, password: string): Promise<LoginResponse> {
    const fd = new URLSearchParams();
    fd.append('username', username);
    fd.append('password', password);

    const res = await fetch(API_BASE + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: fd.toString(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { detail?: string };
      throw new Error(err.detail || 'Invalid credentials');
    }
    return res.json();
  }

  // POST /auth/register
  register(username: string, email: string, password: string): Promise<RegisterResponse> {
    return this.json('POST', '/auth/register', { username, email, password });
  }

  // GET /auth/me
  me(): Promise<UserResponse> {
    return this.json('GET', '/auth/me');
  }

  // POST /predict/url
  predictUrl(url: string): Promise<PredictUrlResponse> {
    return this.json('POST', '/predict/url', { url });
  }

  // GET /predict/history  — returns last 50 predictions for the logged-in user.
  // The OpenAPI schema says "string" but the real payload varies: it may be a
  // bare array, or an object like { predictions: [...] } / { data: [...] } / { history: [...] }.
  // We inspect the raw value and extract an array wherever we find one.
  async history(): Promise<HistoryItem[]> {
    const raw = await this.json<unknown>('GET', '/predict/history');

    // Already an array — ideal case
    if (Array.isArray(raw)) return raw as HistoryItem[];

    // Object wrapper — try common key names
    if (raw && typeof raw === 'object') {
      const obj = raw as Record<string, unknown>;
      for (const key of ['predictions', 'data', 'history', 'results', 'items']) {
        if (Array.isArray(obj[key])) return obj[key] as HistoryItem[];
      }
      // Last resort: grab the first array-valued property we find
      const firstArray = Object.values(obj).find(v => Array.isArray(v));
      if (firstArray) return firstArray as HistoryItem[];
    }

    // Nothing array-like found — return empty so the UI degrades gracefully
    console.warn('[api] /predict/history returned unexpected shape:', raw);
    return [];
  }

  // GET /train  — admin only, triggers full ML pipeline
  train(): Promise<string> {
    return this.json('GET', '/train');
  }

  // GET /health
  health(): Promise<string> {
    return this.json('GET', '/health');
  }
}

export const api = new ApiService();