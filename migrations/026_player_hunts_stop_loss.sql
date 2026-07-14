-- Add an explicit player bonus hunt stop loss value.
-- Older hunts keep their previous withdrawal-based fallback in application code.

ALTER TABLE public.player_hunts
  ADD COLUMN IF NOT EXISTS stop_loss NUMERIC(14,2) NOT NULL DEFAULT 0;

ALTER TABLE public.player_hunts
  DROP CONSTRAINT IF EXISTS player_hunts_stop_loss_non_negative_check;

ALTER TABLE public.player_hunts
  ADD CONSTRAINT player_hunts_stop_loss_non_negative_check
  CHECK (stop_loss >= 0);
