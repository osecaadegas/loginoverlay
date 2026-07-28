-- Independent Better Editor layout storage.
-- This does not reuse overlay_widgets, overlay_state, appearance V2/V3 tables,
-- or legacy OBS rendering fields.

CREATE TABLE IF NOT EXISTS public.better_editor_overlays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  public_overlay_id text NOT NULL UNIQUE,
  draft_layout jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_layout jsonb,
  draft_version integer NOT NULL DEFAULT 1,
  published_version integer NOT NULL DEFAULT 0,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.better_overlay_publications (
  public_overlay_id text PRIMARY KEY,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  published_layout jsonb NOT NULL,
  published_version integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

ALTER TABLE public.better_overlay_publications
  ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.better_overlay_publications
  ALTER COLUMN owner_user_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_better_editor_overlays_user_id
  ON public.better_editor_overlays(user_id);

CREATE INDEX IF NOT EXISTS idx_better_overlay_publications_active
  ON public.better_overlay_publications(public_overlay_id)
  WHERE revoked_at IS NULL;

ALTER TABLE public.better_editor_overlays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.better_overlay_publications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Better editor owners can read own overlays" ON public.better_editor_overlays;
CREATE POLICY "Better editor owners can read own overlays"
  ON public.better_editor_overlays
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Better editor owners can insert own overlays" ON public.better_editor_overlays;
CREATE POLICY "Better editor owners can insert own overlays"
  ON public.better_editor_overlays
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Better editor owners can update own overlays" ON public.better_editor_overlays;
CREATE POLICY "Better editor owners can update own overlays"
  ON public.better_editor_overlays
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Better editor owners can delete own overlays" ON public.better_editor_overlays;
CREATE POLICY "Better editor owners can delete own overlays"
  ON public.better_editor_overlays
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Published Better overlays are publicly readable" ON public.better_overlay_publications;
CREATE POLICY "Published Better overlays are publicly readable"
  ON public.better_overlay_publications
  FOR SELECT
  TO anon, authenticated
  USING (revoked_at IS NULL);

DROP POLICY IF EXISTS "Better editor owners can publish own overlays" ON public.better_overlay_publications;
CREATE POLICY "Better editor owners can publish own overlays"
  ON public.better_overlay_publications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_user_id = auth.uid()
    AND
    EXISTS (
      SELECT 1
      FROM public.better_editor_overlays owner_overlay
      WHERE owner_overlay.public_overlay_id = better_overlay_publications.public_overlay_id
        AND owner_overlay.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Better editor owners can update own publications" ON public.better_overlay_publications;
CREATE POLICY "Better editor owners can update own publications"
  ON public.better_overlay_publications
  FOR UPDATE
  TO authenticated
  USING (
    owner_user_id = auth.uid()
    AND
    EXISTS (
      SELECT 1
      FROM public.better_editor_overlays owner_overlay
      WHERE owner_overlay.public_overlay_id = better_overlay_publications.public_overlay_id
        AND owner_overlay.user_id = auth.uid()
    )
  )
  WITH CHECK (
    owner_user_id = auth.uid()
    AND
    EXISTS (
      SELECT 1
      FROM public.better_editor_overlays owner_overlay
      WHERE owner_overlay.public_overlay_id = better_overlay_publications.public_overlay_id
        AND owner_overlay.user_id = auth.uid()
    )
  );

DROP TRIGGER IF EXISTS set_better_editor_overlays_updated_at ON public.better_editor_overlays;
CREATE TRIGGER set_better_editor_overlays_updated_at
  BEFORE UPDATE ON public.better_editor_overlays
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_better_overlay_publications_updated_at ON public.better_overlay_publications;
CREATE TRIGGER set_better_overlay_publications_updated_at
  BEFORE UPDATE ON public.better_overlay_publications
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP FUNCTION IF EXISTS public.__better_editor_enable_realtime();
CREATE FUNCTION public.__better_editor_enable_realtime()
RETURNS void
LANGUAGE plpgsql
AS 'BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.better_overlay_publications;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END';

SELECT public.__better_editor_enable_realtime();
DROP FUNCTION public.__better_editor_enable_realtime();
