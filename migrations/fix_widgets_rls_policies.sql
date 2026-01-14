-- RLS Policy Updates for widgets table
-- Ensure users can INSERT widgets properly

-- Drop existing policy if needed
DROP POLICY IF EXISTS "users can manage own widgets" ON widgets;

-- Recreate with explicit permissions
CREATE POLICY "users can select own widgets"
  ON widgets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM overlays
      WHERE overlays.id = widgets.overlay_id
        AND overlays.user_id = auth.uid()
    )
  );

CREATE POLICY "users can insert own widgets"
  ON widgets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM overlays
      WHERE overlays.id = widgets.overlay_id
        AND overlays.user_id = auth.uid()
    )
  );

CREATE POLICY "users can update own widgets"
  ON widgets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM overlays
      WHERE overlays.id = widgets.overlay_id
        AND overlays.user_id = auth.uid()
    )
  );

CREATE POLICY "users can delete own widgets"
  ON widgets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM overlays
      WHERE overlays.id = widgets.overlay_id
        AND overlays.user_id = auth.uid()
    )
  );

-- Verify RLS is enabled
ALTER TABLE widgets ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON widgets TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE widgets_id_seq TO authenticated; -- if using serial
