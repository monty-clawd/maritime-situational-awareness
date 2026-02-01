-- Initial schema for maritime situational awareness MVP

CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  role VARCHAR(50) DEFAULT 'operator',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vessels (
  mmsi BIGINT PRIMARY KEY,
  imo INTEGER,
  name VARCHAR(255),
  flag VARCHAR(2),
  type VARCHAR(50),
  destination VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS positions (
  id BIGSERIAL,
  mmsi BIGINT REFERENCES vessels(mmsi),
  timestamp TIMESTAMPTZ NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  speed DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  source VARCHAR(50),
  confidence DOUBLE PRECISION DEFAULT 1.0
);

SELECT create_hypertable('positions', 'timestamp', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS idx_positions_mmsi_time ON positions (mmsi, timestamp DESC);

CREATE TABLE IF NOT EXISTS alerts (
  id SERIAL PRIMARY KEY,
  mmsi BIGINT REFERENCES vessels(mmsi),
  type VARCHAR(50),
  severity VARCHAR(20),
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS data_sources (
  id VARCHAR(50) PRIMARY KEY,
  type VARCHAR(50),
  status VARCHAR(20),
  last_seen TIMESTAMPTZ
);
