-- Add columns to control where items can be sold

ALTER TABLE the_life_items
ADD COLUMN IF NOT EXISTS sellable_on_streets BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sellable_at_docks BOOLEAN DEFAULT false;

-- Add global dock usage limit (can be overridden per player)
ALTER TABLE the_life_players
ADD COLUMN IF NOT EXISTS dock_daily_limit INTEGER DEFAULT 2;

-- Update existing drug items to be sellable
UPDATE the_life_items 
SET sellable_on_streets = true, sellable_at_docks = true 
WHERE type = 'business_reward' 
AND name IN ('Meth', 'Weed', 'Cocaine', 'Drug Package');

-- Comments
COMMENT ON COLUMN the_life_items.sellable_on_streets IS 'Whether this item can be sold on the streets (high risk/high reward)';
COMMENT ON COLUMN the_life_items.sellable_at_docks IS 'Whether this item can be shipped at the docks (safe but limited uses)';
COMMENT ON COLUMN the_life_players.dock_daily_limit IS 'Maximum number of dock shipments allowed per day for this player';
