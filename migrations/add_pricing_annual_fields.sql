-- ══════════════════════════════════════════════════════════════
-- PRICING PLAN ANNUAL BILLING FIELDS
-- Adds annual price columns to landing_pricing_plans
-- so the Monthly/Annual toggle on the landing page works
-- ══════════════════════════════════════════════════════════════

ALTER TABLE landing_pricing_plans ADD COLUMN IF NOT EXISTS price_annual     TEXT;
ALTER TABLE landing_pricing_plans ADD COLUMN IF NOT EXISTS period_annual    TEXT;
ALTER TABLE landing_pricing_plans ADD COLUMN IF NOT EXISTS sub_price_annual TEXT;
