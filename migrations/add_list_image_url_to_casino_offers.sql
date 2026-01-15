-- Add list_image_url column to casino_offers table for list view images
ALTER TABLE casino_offers 
ADD COLUMN IF NOT EXISTS list_image_url TEXT;

COMMENT ON COLUMN casino_offers.list_image_url IS 'Image URL for list view display (landing page offers list)';
