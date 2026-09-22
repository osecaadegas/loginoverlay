-- Subscriber-authored reviews and the durable, one-time Stripe reward ledger.
CREATE TABLE public.service_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (char_length(btrim(display_name)) BETWEEN 2 AND 60),
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 20 AND 1500),
  product_code text NOT NULL CHECK (product_code IN ('player_bonus_hunt', 'streamer_premium')),
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  stripe_subscription_id text NOT NULL,
  stripe_customer_id text NOT NULL,
  original_period_end bigint NOT NULL,
  reward_period_end bigint NOT NULL,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  original_cancel_at bigint,
  reward_status text NOT NULL DEFAULT 'pending' CHECK (reward_status IN ('pending', 'applied')),
  rewarded_at timestamptz,
  moderated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  moderated_at timestamptz,
  CONSTRAINT exactly_three_reward_days CHECK (reward_period_end = original_period_end + 259200),
  CONSTRAINT applied_reward_has_timestamp CHECK ((reward_status = 'applied') = (rewarded_at IS NOT NULL))
);

CREATE INDEX service_reviews_public_created_idx ON public.service_reviews (created_at DESC, id) WHERE published;
CREATE INDEX service_reviews_pending_idx ON public.service_reviews (created_at) WHERE reward_status = 'pending';
CREATE INDEX service_reviews_moderator_idx ON public.service_reviews (moderated_by) WHERE moderated_by IS NOT NULL;

ALTER TABLE public.service_reviews ENABLE ROW LEVEL SECURITY;
-- All reads/writes pass through the API. Public responses explicitly select safe fields.
REVOKE ALL ON public.service_reviews FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.service_reviews TO service_role;

CREATE FUNCTION public.service_review_summary()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT jsonb_build_object('count', count(*), 'average', round(avg(rating), 2))
  FROM public.service_reviews WHERE published;
$$;
REVOKE ALL ON FUNCTION public.service_review_summary() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.service_review_summary() TO service_role;

COMMENT ON TABLE public.service_reviews IS 'One review and three-day reward per account. Hide reviews instead of deleting rows so the reward ledger is retained.';
NOTIFY pgrst, 'reload schema';
