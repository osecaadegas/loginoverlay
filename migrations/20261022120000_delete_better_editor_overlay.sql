-- Delete an owned editor build and revoke its public OBS URL atomically.
-- The publication is retained as a revoked row so existing public IDs stay inert.
CREATE OR REPLACE FUNCTION public.delete_better_editor_overlay(p_overlay_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_public_overlay_id text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'A signed-in user is required to delete overlay builds.'
      USING ERRCODE = '28000';
  END IF;

  SELECT public_overlay_id
    INTO v_public_overlay_id
    FROM public.better_editor_overlays
   WHERE id = p_overlay_id
     AND user_id = auth.uid()
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE public.better_overlay_publications
     SET revoked_at = now(),
         updated_at = now()
   WHERE public_overlay_id = v_public_overlay_id
     AND owner_user_id = auth.uid();

  DELETE FROM public.better_editor_overlays
   WHERE id = p_overlay_id
     AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The overlay build could not be deleted.';
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_better_editor_overlay(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_better_editor_overlay(uuid) TO authenticated;
