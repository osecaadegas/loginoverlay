-- Prevent duplicate pending slot requests (same user + same slot name, case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_slot_requests_unique_pending
  ON slot_requests (user_id, lower(slot_name))
  WHERE status = 'pending';
