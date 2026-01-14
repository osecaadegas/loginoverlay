-- Add bonus_link column to existing casino_offers table
ALTER TABLE casino_offers 
ADD COLUMN IF NOT EXISTS bonus_link TEXT;

-- Update existing rows to have a default value (you can change these later in admin panel)
UPDATE casino_offers 
SET bonus_link = 'https://example.com' 
WHERE bonus_link IS NULL;

-- Make the column required for new entries
ALTER TABLE casino_offers 
ALTER COLUMN bonus_link SET NOT NULL;
