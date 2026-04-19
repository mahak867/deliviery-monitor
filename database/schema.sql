-- TrackAll — Universal Delivery Tracker for India
-- PostgreSQL Schema
-- Run this once to set up the database

-- ── Enable extensions ──────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- for fuzzy search

-- ── Users ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone        VARCHAR(15)  NOT NULL UNIQUE,
  email        VARCHAR(255) UNIQUE,
  name         VARCHAR(100) NOT NULL,
  role         VARCHAR(20)  NOT NULL DEFAULT 'user'
                            CHECK (role IN ('user', 'admin', 'business')),
  preferences  JSONB        NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- ── Shipments ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS shipments (
  id                  UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID         REFERENCES users(id) ON DELETE CASCADE,
  tracking_number     VARCHAR(100) NOT NULL,
  courier             VARCHAR(50)  NOT NULL,
  status              VARCHAR(30)  NOT NULL DEFAULT 'order_placed'
                                   CHECK (status IN (
                                     'order_placed','packed','shipped',
                                     'in_transit','out_for_delivery','delivered',
                                     'delayed','cancelled','returned','failed_delivery'
                                   )),
  origin              JSONB        NOT NULL DEFAULT '{}',
  destination         JSONB        NOT NULL DEFAULT '{}',
  current_location    JSONB,
  estimated_delivery  TIMESTAMPTZ,
  actual_delivery     TIMESTAMPTZ,
  product             JSONB,
  weight              INTEGER,                            -- grams
  dimensions          JSONB,
  order_number        VARCHAR(100),
  is_favourite        BOOLEAN      NOT NULL DEFAULT false,
  is_archived         BOOLEAN      NOT NULL DEFAULT false,
  notes               TEXT,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipments_user_id    ON shipments (user_id);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking   ON shipments (tracking_number);
CREATE INDEX IF NOT EXISTS idx_shipments_status     ON shipments (status);
CREATE INDEX IF NOT EXISTS idx_shipments_updated    ON shipments (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_shipments_courier    ON shipments (courier);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_shipments_search
  ON shipments USING gin (
    to_tsvector('english',
      tracking_number || ' ' ||
      COALESCE(order_number, '') || ' ' ||
      CAST(product AS TEXT) || ' ' ||
      CAST(origin AS TEXT) || ' ' ||
      CAST(destination AS TEXT)
    )
  );

-- ── Tracking events ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tracking_events (
  id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_id  UUID         NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  status       VARCHAR(30)  NOT NULL,
  description  TEXT         NOT NULL DEFAULT '',
  location     VARCHAR(255) NOT NULL DEFAULT '',
  geo_location JSONB,
  timestamp    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  courier      VARCHAR(50)  NOT NULL DEFAULT '',
  is_latest    BOOLEAN      NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_events_shipment   ON tracking_events (shipment_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp  ON tracking_events (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_is_latest  ON tracking_events (is_latest) WHERE is_latest = true;

-- ── Notifications ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shipment_id  UUID         REFERENCES shipments(id) ON DELETE SET NULL,
  type         VARCHAR(30)  NOT NULL,
  title        VARCHAR(200) NOT NULL,
  message      TEXT         NOT NULL,
  is_read      BOOLEAN      NOT NULL DEFAULT false,
  metadata     JSONB,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user    ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread  ON notifications (user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications (created_at DESC);

-- ── OTP store (alternative to Redis) ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS otps (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone      VARCHAR(15) NOT NULL,
  otp_hash   VARCHAR(60) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otps_phone   ON otps (phone);
CREATE INDEX IF NOT EXISTS idx_otps_expires ON otps (expires_at);

-- ── Refresh tokens ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user   ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash   ON refresh_tokens (token_hash);

-- ── updated_at trigger function ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trigger_shipments_updated_at
  BEFORE UPDATE ON shipments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Seed admin user ───────────────────────────────────────────────────────

INSERT INTO users (phone, name, email, role, preferences)
VALUES (
  '9999999999',
  'Admin',
  'admin@trackall.in',
  'admin',
  '{"notifications":{"push":true,"sms":true,"email":true,"whatsapp":true},"theme":"dark","language":"en"}'
)
ON CONFLICT (phone) DO NOTHING;
