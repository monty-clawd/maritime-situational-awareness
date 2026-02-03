-- Add AIS static data fields and watchlist support

ALTER TABLE vessels ADD COLUMN IF NOT EXISTS call_sign VARCHAR(50);
ALTER TABLE vessels ADD COLUMN IF NOT EXISTS length DOUBLE PRECISION;
ALTER TABLE vessels ADD COLUMN IF NOT EXISTS width DOUBLE PRECISION;

CREATE TABLE IF NOT EXISTS watchlist (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mmsi BIGINT NOT NULL REFERENCES vessels(mmsi) ON DELETE CASCADE,
  notes TEXT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, mmsi)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_mmsi ON watchlist (mmsi);

INSERT INTO users (id, email, role)
VALUES (1, 'operator@local', 'operator')
ON CONFLICT (id) DO NOTHING;
