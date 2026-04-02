-- offer_click_tracking.sql
-- Tracks every click on casino offer cards

CREATE TABLE IF NOT EXISTS offer_clicks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id      UUID NOT NULL REFERENCES casino_offers(id) ON DELETE CASCADE,
  casino_name   TEXT,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  se_username   TEXT,
  ip_address    INET,
  user_agent    TEXT,
  page_source   TEXT DEFAULT 'offers',   -- 'offers', 'landing', 'admin'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast analytics queries
CREATE INDEX IF NOT EXISTS idx_offer_clicks_offer   ON offer_clicks(offer_id);
CREATE INDEX IF NOT EXISTS idx_offer_clicks_created ON offer_clicks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_offer_clicks_ip      ON offer_clicks(ip_address);
CREATE INDEX IF NOT EXISTS idx_offer_clicks_user    ON offer_clicks(user_id) WHERE user_id IS NOT NULL;

-- RLS
ALTER TABLE offer_clicks ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (track clicks)
CREATE POLICY "Anyone can log a click"
  ON offer_clicks FOR INSERT
  WITH CHECK (true);

-- Only admins can read analytics
CREATE POLICY "Admins can read click analytics"
  ON offer_clicks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );
