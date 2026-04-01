CREATE TABLE IF NOT EXISTS sessions (
  code         TEXT PRIMARY KEY,
  tabs         TEXT NOT NULL DEFAULT '[]',
  secret_token TEXT NOT NULL,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL,
  expires_at   INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
