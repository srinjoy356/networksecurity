-- =============================================================================
-- NetworkSecurity Project — Supabase Database Setup
-- Run this once against your Supabase PostgreSQL instance.
-- =============================================================================

-- ── 1. Users table (JWT auth) ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id          SERIAL PRIMARY KEY,
    username    VARCHAR(100) UNIQUE NOT NULL,
    email       VARCHAR(255) UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    role        VARCHAR(20) NOT NULL DEFAULT 'user'
                    CHECK (role IN ('admin', 'user')),
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. Prediction logs table ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prediction_logs (
    id                      SERIAL PRIMARY KEY,
    user_id                 INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Core result
    url                     TEXT NOT NULL,
    prediction              INTEGER NOT NULL,       -- 0 = Phishing, 1 = Legitimate
    label                   VARCHAR(20) NOT NULL,   -- 'Phishing' | 'Legitimate'

    -- Signal counts
    phishing_signal_count   INTEGER NOT NULL,
    suspicious_signal_count INTEGER NOT NULL,

    -- Full 30-feature dict stored as JSONB  {feature_name: int}
    features                JSONB NOT NULL,

    -- Ordered feature vector [int x 30]
    feature_vector          INTEGER[] NOT NULL,

    -- Metadata
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. Training run logs ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_logs (
    id              SERIAL PRIMARY KEY,
    triggered_by    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status          VARCHAR(20) NOT NULL DEFAULT 'started'
                        CHECK (status IN ('started', 'success', 'failed')),
    error_message   TEXT,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at     TIMESTAMPTZ
);

-- ── 4. Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_prediction_logs_user_id   ON prediction_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_prediction_logs_label     ON prediction_logs(label);
CREATE INDEX IF NOT EXISTS idx_prediction_logs_created   ON prediction_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_training_logs_user        ON training_logs(triggered_by);

-- ── 5. Auto-update updated_at on users ───────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_users_updated_at ON users;
CREATE TRIGGER set_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 6. Seed default admin account ────────────────────────────────────────────
-- Password: admin123  (bcrypt hash — change immediately in production!)
-- Generate a new hash: python -c "from passlib.context import CryptContext; print(CryptContext(schemes=['bcrypt']).hash('your_password'))"
INSERT INTO users (username, email, hashed_password, role)
VALUES (
    'admin',
    'admin@networksecurity.local',
    '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',  -- "secret"
    'admin'
)
ON CONFLICT (username) DO NOTHING;