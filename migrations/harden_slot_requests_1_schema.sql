-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATION 1/3 — harden_slot_requests_1_schema
-- Run this first in the Supabase SQL editor.
--
-- What this does:
--   • Stores exactly how many points were deducted at request time (so refunds
--     use the original cost, not whatever the config says today).
--   • Adds a stable idempotency key column (populated from the Twitch message ID)
--     so the same chat message can never create two rows, even across browser tabs.
--   • Records refund metadata (when, how many points were given back).
--   • Adds an updated_at timestamp with an auto-trigger.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. New columns on slot_requests
ALTER TABLE slot_requests
  ADD COLUMN IF NOT EXISTS points_deducted  INT          NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS idempotency_key  TEXT,
  ADD COLUMN IF NOT EXISTS refunded_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refunded_points  INT,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ  DEFAULT now();

-- 2. Unique constraint on idempotency_key (only when populated)
CREATE UNIQUE INDEX IF NOT EXISTS idx_sr_idem_key
  ON slot_requests (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- 3. Index to quickly find rows due for cleanup (played / refunded / denied)
CREATE INDEX IF NOT EXISTS idx_sr_cleanup
  ON slot_requests (user_id, status, updated_at)
  WHERE status IN ('refunded', 'played', 'denied');

-- 4. auto-update updated_at on every UPDATE
CREATE OR REPLACE FUNCTION set_slot_request_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sr_updated_at ON slot_requests;
CREATE TRIGGER trg_sr_updated_at
  BEFORE UPDATE ON slot_requests
  FOR EACH ROW EXECUTE FUNCTION set_slot_request_updated_at();
