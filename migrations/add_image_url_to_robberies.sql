-- Add image_url column to the_life_robberies table for admin customization

ALTER TABLE the_life_robberies 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Update existing crimes with default images
UPDATE the_life_robberies 
SET image_url = CASE name
  WHEN 'Pickpocket' THEN 'https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=500'
  WHEN 'Car Theft' THEN 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=500'
  WHEN 'House Burglary' THEN 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=500'
  WHEN 'Convenience Store' THEN 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=500'
  WHEN 'Bank Heist' THEN 'https://images.unsplash.com/photo-1551135049-8a33b5883817?w=500'
  WHEN 'Casino Vault' THEN 'https://images.unsplash.com/photo-1596838132731-3301c3fd4317?w=500'
  ELSE NULL
END
WHERE image_url IS NULL;
