-- Slot request queue for chat !sr command
-- Viewers request slots, streamer sees them in an overlay widget.

CREATE TABLE IF NOT EXISTS slot_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot_name TEXT NOT NULL,
  slot_image TEXT,
  requested_by TEXT NOT NULL DEFAULT 'anonymous',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_slot_requests_user ON slot_requests (user_id, status, created_at);

-- RLS
ALTER TABLE slot_requests ENABLE ROW LEVEL SECURITY;

-- Streamer can read/manage their own requests
CREATE POLICY slot_requests_select ON slot_requests FOR SELECT USING (true);
CREATE POLICY slot_requests_insert ON slot_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY slot_requests_update ON slot_requests FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY slot_requests_delete ON slot_requests FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE slot_requests;
