-- ═══════════════════════════════════════════════════════════
-- Browser Extension: Auto-detected slot tracking
-- Stores the current slot game detected from the user's browser tab
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS detected_slots (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot_name   TEXT NOT NULL,
  provider    TEXT DEFAULT '',
  url         TEXT DEFAULT '',
  detected_at TIMESTAMPTZ DEFAULT now()
);

-- Only keep latest detection per user (1 row)
CREATE UNIQUE INDEX IF NOT EXISTS idx_detected_slots_user ON detected_slots(user_id);

-- RLS
ALTER TABLE detected_slots ENABLE ROW LEVEL SECURITY;

-- Users can read their own detected slot
CREATE POLICY "Users can read own detected slot"
  ON detected_slots FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert/update their own detected slot
CREATE POLICY "Users can upsert own detected slot"
  ON detected_slots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own detected slot"
  ON detected_slots FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow anon key insert for browser extension (uses service key via API)
-- The extension writes via the anon key with the user_id embedded
CREATE POLICY "Anon can insert detected slot"
  ON detected_slots FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anon can update detected slot"
  ON detected_slots FOR UPDATE
  USING (true);

-- Enable realtime so the overlay can subscribe
ALTER publication supabase_realtime ADD TABLE detected_slots;
