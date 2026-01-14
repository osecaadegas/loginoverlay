-- Add image_url column to The Life game tables
-- This allows admin to set custom images for crimes, businesses, and workers

-- Add image_url to robberies (crimes) - only if table exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'the_life_robberies') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'the_life_robberies' 
      AND column_name = 'image_url'
    ) THEN
      ALTER TABLE the_life_robberies ADD COLUMN image_url TEXT;
    END IF;
  END IF;
END $$;

-- Add image_url to businesses - only if table exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'the_life_businesses') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'the_life_businesses' 
      AND column_name = 'image_url'
    ) THEN
      ALTER TABLE the_life_businesses ADD COLUMN image_url TEXT;
    END IF;
  END IF;
END $$;

-- Add image_url to brothel workers - only if table exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'the_life_brothel_workers') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'the_life_brothel_workers' 
      AND column_name = 'image_url'
    ) THEN
      ALTER TABLE the_life_brothel_workers ADD COLUMN image_url TEXT;
    END IF;
  END IF;
END $$;

-- Verify the columns were added (only for tables that exist)
SELECT 
  t.table_name,
  COALESCE(c.column_exists, 0) as image_url_column_exists
FROM (
  SELECT 'the_life_robberies' as table_name
  UNION ALL SELECT 'the_life_businesses'
  UNION ALL SELECT 'the_life_brothel_workers'
) t
LEFT JOIN (
  SELECT table_name, 1 as column_exists
  FROM information_schema.columns 
  WHERE column_name = 'image_url'
    AND table_name IN ('the_life_robberies', 'the_life_businesses', 'the_life_brothel_workers')
) c ON t.table_name = c.table_name
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE information_schema.tables.table_name = t.table_name);

-- Expected result: All existing tables should show 1 (column exists)
