-- A durable claim is required before a StreamElements credit. An uncertain
-- network outcome remains processing for manual review, preventing double credit.
CREATE TABLE IF NOT EXISTS public.bets_refund_ledger (
  widget_id uuid NOT NULL REFERENCES public.overlay_widgets(id) ON DELETE CASCADE,
  round_id text NOT NULL,
  username text NOT NULL,
  amount integer NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','refunded','failed')),
  attempts integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (widget_id, round_id, username)
);
ALTER TABLE public.bets_refund_ledger ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.bets_refund_ledger FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.bets_refund_ledger TO service_role;
