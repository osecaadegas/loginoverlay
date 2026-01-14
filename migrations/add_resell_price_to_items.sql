-- Add resell_price column to the_life_items table
-- This allows items to have a resell value

ALTER TABLE the_life_items 
ADD COLUMN IF NOT EXISTS resell_price INTEGER DEFAULT NULL;

-- Add index for quick lookups
CREATE INDEX IF NOT EXISTS idx_thelife_items_resell_price ON the_life_items(resell_price);
