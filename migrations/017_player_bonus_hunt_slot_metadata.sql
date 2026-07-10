-- Player Bonus Hunt slot metadata snapshots.
-- Run after 016_player_bonus_hunt.sql if 016 was already applied before these columns existed.

ALTER TABLE public.player_hunt_bonuses
  ADD COLUMN IF NOT EXISTS slot_rtp NUMERIC(5,2);

ALTER TABLE public.player_hunt_bonuses
  ADD COLUMN IF NOT EXISTS slot_volatility TEXT;

ALTER TABLE public.player_hunt_bonuses
  ADD COLUMN IF NOT EXISTS slot_max_win_multiplier NUMERIC(10,2);

ALTER TABLE public.player_hunt_bonuses
  ADD COLUMN IF NOT EXISTS slot_theme TEXT;

ALTER TABLE public.player_hunt_bonuses
  ADD COLUMN IF NOT EXISTS slot_features JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.player_hunt_bonuses
  ADD COLUMN IF NOT EXISTS bonus_type TEXT NOT NULL DEFAULT 'normal';

UPDATE public.player_hunt_bonuses
SET bonus_type = 'normal'
WHERE bonus_type IS NULL OR bonus_type = '';

ALTER TABLE public.player_hunt_bonuses
  DROP CONSTRAINT IF EXISTS player_hunt_bonuses_bonus_type_check;

ALTER TABLE public.player_hunt_bonuses
  ADD CONSTRAINT player_hunt_bonuses_bonus_type_check
  CHECK (bonus_type IN ('normal', 'super', 'supreme'));

ALTER TABLE public.player_hunt_bonuses
  DROP CONSTRAINT IF EXISTS player_hunt_bonuses_slot_volatility_check;

ALTER TABLE public.player_hunt_bonuses
  ADD CONSTRAINT player_hunt_bonuses_slot_volatility_check
  CHECK (slot_volatility IS NULL OR slot_volatility IN ('low', 'medium', 'high', 'very_high'));

ALTER TABLE public.player_hunt_bonuses
  DROP CONSTRAINT IF EXISTS player_hunt_bonuses_slot_metadata_non_negative_check;

ALTER TABLE public.player_hunt_bonuses
  ADD CONSTRAINT player_hunt_bonuses_slot_metadata_non_negative_check
  CHECK (
    (slot_rtp IS NULL OR (slot_rtp >= 0 AND slot_rtp <= 100))
    AND (slot_max_win_multiplier IS NULL OR slot_max_win_multiplier >= 0)
  );

DROP VIEW IF EXISTS public.player_slot_results;

CREATE VIEW public.player_slot_results AS
SELECT
  b.id,
  b.user_id,
  b.hunt_id,
  h.name AS hunt_name,
  h.casino_name,
  h.currency,
  h.hunt_date,
  b.slot_id,
  b.slot_name,
  b.provider_name,
  b.slot_image_url,
  b.slot_rtp,
  b.slot_volatility,
  b.slot_max_win_multiplier,
  b.slot_theme,
  b.slot_features,
  b.bonus_type,
  b.bonus_cost,
  b.bet_size,
  b.payout,
  b.multiplier,
  b.profit_loss,
  b.status,
  b.opened_at,
  b.created_at
FROM public.player_hunt_bonuses b
JOIN public.player_hunts h ON h.id = b.hunt_id
WHERE b.deleted_at IS NULL
  AND h.deleted_at IS NULL;
