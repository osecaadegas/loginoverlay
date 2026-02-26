-- ============================================================
-- Shared Overlay Presets  – available to ALL authenticated users
-- Only admins can insert / update / delete
-- ============================================================

CREATE TABLE IF NOT EXISTS shared_overlay_presets (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  snapshot    JSONB NOT NULL,         -- same format as globalPresets snapshot
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Everyone can read shared presets
ALTER TABLE shared_overlay_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read shared presets"
  ON shared_overlay_presets FOR SELECT
  USING (true);

-- Only admins can insert
CREATE POLICY "Admins can insert shared presets"
  ON shared_overlay_presets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'superadmin')
    )
  );

-- Only admins can update
CREATE POLICY "Admins can update shared presets"
  ON shared_overlay_presets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'superadmin')
    )
  );

-- Only admins can delete
CREATE POLICY "Admins can delete shared presets"
  ON shared_overlay_presets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'superadmin')
    )
  );
