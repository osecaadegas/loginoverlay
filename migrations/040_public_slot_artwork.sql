-- Allow signed-out landing pages to display safe slot catalog artwork.

GRANT SELECT ON TABLE public.slots TO anon;

DROP POLICY IF EXISTS "Anyone can view slots" ON public.slots;
DROP POLICY IF EXISTS "Public reads safe slot artwork" ON public.slots;
CREATE POLICY "Public reads safe slot artwork"
  ON public.slots
  FOR SELECT
  TO anon
  USING (
    status = 'live'
    AND moderation_status = 'approved'
    AND deleted_at IS NULL
    AND compliance_ok IS TRUE
    AND twitch_safe IS TRUE
  );