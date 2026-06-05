-- ══════════════════════════════════════════════════════════════
-- LANDING PARTNER CARD CONTROLS
-- Adds show_on_landing and landing_order to casino_offers
-- so admins can control which offers appear on the landing page
-- ══════════════════════════════════════════════════════════════

ALTER TABLE casino_offers ADD COLUMN IF NOT EXISTS show_on_landing BOOLEAN DEFAULT false;
ALTER TABLE casino_offers ADD COLUMN IF NOT EXISTS landing_order   INTEGER DEFAULT 0;

-- Optional: enable the first 5 active offers by default so the
-- landing page doesn't go blank before you configure them.
-- Comment this out if you want to start with a blank slate.
UPDATE casino_offers
SET show_on_landing = true
WHERE id IN (
  SELECT id FROM casino_offers
  WHERE is_active = true
  ORDER BY display_order ASC
  LIMIT 5
);
