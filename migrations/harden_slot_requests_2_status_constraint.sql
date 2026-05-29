-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATION 2/3 — harden_slot_requests_2_status_constraint
-- Run this second.
--
-- What this does:
--   • Adds a status CHECK constraint so only valid values can ever be written.
--   • Adds two new statuses needed for safe atomic operations:
--       'refunding'     — row is being processed for refund (prevents double-refund)
--       'refunded'      — refund completed (soft-delete; row never disappears)
--       'cancelled'     — admin cancelled without refund
--       'refund_failed' — SE API refund call failed; admin needs to retry
--
-- IMPORTANT: Run AFTER migration 1/3.
-- ─────────────────────────────────────────────────────────────────────────────

-- First fix any existing rows with non-standard status values (safety net)
UPDATE slot_requests
  SET status = 'denied'
  WHERE status NOT IN ('pending', 'played', 'denied', 'refunding', 'refunded', 'cancelled', 'refund_failed');

-- Add the constraint
ALTER TABLE slot_requests
  DROP CONSTRAINT IF EXISTS chk_sr_status;

ALTER TABLE slot_requests
  ADD CONSTRAINT chk_sr_status
  CHECK (status IN ('pending', 'played', 'denied', 'refunding', 'refunded', 'cancelled', 'refund_failed'));
