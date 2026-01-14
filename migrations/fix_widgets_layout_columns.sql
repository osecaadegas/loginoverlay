-- Fix widgets table layout columns
-- Migrate from JSONB (position/size) to first-class columns for better performance and RLS

-- Step 1: Add new first-class layout columns
ALTER TABLE widgets
  ADD COLUMN IF NOT EXISTS position_x INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS position_y INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS width INTEGER DEFAULT 300,
  ADD COLUMN IF NOT EXISTS height INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS scale NUMERIC(3, 2) DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS opacity NUMERIC(3, 2) DEFAULT 1.0;

-- Step 2: Migrate existing data from JSONB to columns
UPDATE widgets
SET
  position_x = COALESCE((position->>'x')::integer, 50),
  position_y = COALESCE((position->>'y')::integer, 50),
  width = COALESCE((size->>'width')::integer, 300),
  height = COALESCE((size->>'height')::integer, 100)
WHERE position_x IS NULL OR position_y IS NULL OR width IS NULL OR height IS NULL;

-- Step 3: Set NOT NULL constraints (after migration)
ALTER TABLE widgets
  ALTER COLUMN position_x SET NOT NULL,
  ALTER COLUMN position_y SET NOT NULL,
  ALTER COLUMN width SET NOT NULL,
  ALTER COLUMN height SET NOT NULL,
  ALTER COLUMN scale SET NOT NULL,
  ALTER COLUMN opacity SET NOT NULL;

-- Step 4: Add indexes for common queries
CREATE INDEX IF NOT EXISTS widgets_position_x_idx ON widgets(position_x);
CREATE INDEX IF NOT EXISTS widgets_position_y_idx ON widgets(position_y);
CREATE INDEX IF NOT EXISTS widgets_z_index_idx ON widgets(z_index);
CREATE INDEX IF NOT EXISTS widgets_enabled_overlay_idx ON widgets(overlay_id, enabled);

-- Step 5: Keep JSONB columns for backward compatibility but make them optional
ALTER TABLE widgets
  ALTER COLUMN position DROP NOT NULL,
  ALTER COLUMN size DROP NOT NULL;

-- Step 6: Add trigger to sync JSONB columns (optional, for backward compatibility)
CREATE OR REPLACE FUNCTION sync_widget_layout_jsonb()
RETURNS TRIGGER AS $$
BEGIN
  -- Keep JSONB in sync if apps still read from it
  NEW.position = jsonb_build_object('x', NEW.position_x, 'y', NEW.position_y);
  NEW.size = jsonb_build_object('width', NEW.width, 'height', NEW.height);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_widget_layout_trigger ON widgets;
CREATE TRIGGER sync_widget_layout_trigger
  BEFORE INSERT OR UPDATE ON widgets
  FOR EACH ROW
  EXECUTE FUNCTION sync_widget_layout_jsonb();

-- Step 7: Add comment for documentation
COMMENT ON TABLE widgets IS 'Widget instances with first-class layout columns (position_x, position_y, width, height, scale, opacity). JSONB columns (position, size) are kept for backward compatibility but automatically synced via trigger.';
