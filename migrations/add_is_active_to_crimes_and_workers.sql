-- Add is_active column to crimes for admin control

-- Add is_active to crimes if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'the_life_robberies' 
    AND column_name = 'is_active'
  ) THEN
    ALTER TABLE the_life_robberies ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Set all existing crimes to active
UPDATE the_life_robberies SET is_active = true WHERE is_active IS NULL;

-- Update RLS policy to only show active crimes to players
DROP POLICY IF EXISTS "Anyone can view robberies" ON the_life_robberies;

CREATE POLICY "Anyone can view robberies"
  ON the_life_robberies FOR SELECT
  USING (is_active = true);
