-- Targeted repair for Stripe webhook PGRST205 errors.
-- Keeps existing event records and leaves billing/access tables unchanged.
BEGIN;

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  raw_event JSONB DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.stripe_webhook_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.stripe_webhook_events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.stripe_webhook_events TO service_role;

DROP POLICY IF EXISTS "Admins can read Stripe webhook events"
  ON public.stripe_webhook_events;
CREATE POLICY "Admins can read Stripe webhook events"
  ON public.stripe_webhook_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
        AND user_roles.role IN ('admin', 'superadmin')
        AND user_roles.is_active = true
    )
  );

NOTIFY pgrst, 'reload schema';
COMMIT;
