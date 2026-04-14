-- Backfill twitch_username on the_life_players from auth.users metadata
-- Run this in your Supabase SQL editor

-- 1) Fill twitch_username from auth.users raw_user_meta_data for all players missing it
UPDATE the_life_players p
SET twitch_username = COALESCE(
  (SELECT u.raw_user_meta_data->>'preferred_username'
   FROM auth.users u WHERE u.id = p.user_id),
  (SELECT u.raw_user_meta_data->>'user_name'
   FROM auth.users u WHERE u.id = p.user_id),
  (SELECT u.raw_user_meta_data->>'name'
   FROM auth.users u WHERE u.id = p.user_id),
  (SELECT up.twitch_username
   FROM user_profiles up WHERE up.user_id = p.user_id),
  (SELECT sc.se_username
   FROM streamelements_connections sc WHERE sc.user_id = p.user_id)
)
WHERE p.twitch_username IS NULL AND p.se_username IS NULL;

-- 2) Also back-fill se_username from streamelements_connections if still null
UPDATE the_life_players p
SET se_username = sc.se_username
FROM streamelements_connections sc
WHERE sc.user_id = p.user_id
  AND sc.se_username IS NOT NULL
  AND p.se_username IS NULL;

-- 3) Create a trigger so future inserts auto-populate twitch_username from auth
CREATE OR REPLACE FUNCTION fn_auto_fill_player_username()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.twitch_username IS NULL THEN
    NEW.twitch_username := COALESCE(
      (SELECT u.raw_user_meta_data->>'preferred_username'
       FROM auth.users u WHERE u.id = NEW.user_id),
      (SELECT u.raw_user_meta_data->>'user_name'
       FROM auth.users u WHERE u.id = NEW.user_id),
      (SELECT u.raw_user_meta_data->>'name'
       FROM auth.users u WHERE u.id = NEW.user_id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_fill_player_username ON the_life_players;
CREATE TRIGGER trg_auto_fill_player_username
  BEFORE INSERT ON the_life_players
  FOR EACH ROW
  EXECUTE FUNCTION fn_auto_fill_player_username();
