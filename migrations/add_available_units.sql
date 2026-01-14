-- Add available_units column to redemption_items table
-- This allows tracking inventory for limited-quantity redemption items

ALTER TABLE redemption_items 
ADD COLUMN IF NOT EXISTS available_units INTEGER DEFAULT NULL;

-- NULL means unlimited, any positive number means limited stock
COMMENT ON COLUMN redemption_items.available_units IS 'Number of units available for redemption. NULL = unlimited';

-- Add image_url column if it doesn't exist (for displaying images on redemption cards)
ALTER TABLE redemption_items 
ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT NULL;

COMMENT ON COLUMN redemption_items.image_url IS 'URL of image to display on the redemption card';

-- Add processed column to point_redemptions table
ALTER TABLE point_redemptions
ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT false;

COMMENT ON COLUMN point_redemptions.processed IS 'Whether the redemption has been manually processed by admin';
