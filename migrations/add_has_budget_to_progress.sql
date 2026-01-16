-- Add has_budget column to season_pass_progress
-- This tracks whether the user has purchased the Budget track with SE Points

ALTER TABLE season_pass_progress 
ADD COLUMN IF NOT EXISTS has_budget BOOLEAN DEFAULT false;

ALTER TABLE season_pass_progress 
ADD COLUMN IF NOT EXISTS budget_purchased_at TIMESTAMPTZ;

-- Add comment for clarity
COMMENT ON COLUMN season_pass_progress.has_budget IS 'Whether user has purchased Budget track with SE Points';
COMMENT ON COLUMN season_pass_progress.budget_purchased_at IS 'Timestamp when Budget track was purchased';
