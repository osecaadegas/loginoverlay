-- ═══════════════════════════════════════════════════════════════════════
-- AUTO-POPULATE twitch_id FOR EXTENSION MULTI-TENANT SUPPORT
-- Ensures every Twitch-authenticated streamer is discoverable by the EBS
-- ═══════════════════════════════════════════════════════════════════════

-- 1) Ensure twitch_id column exists
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS twitch_id TEXT UNIQUE;

-- 2) Update the trigger function to also set twitch_id from Twitch OAuth metadata
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
DECLARE
  meta JSONB;
  provider TEXT;
BEGIN
  -- Get user metadata from auth.users
  SELECT raw_user_meta_data, raw_app_meta_data->>'provider'
  INTO meta, provider
  FROM auth.users
  WHERE id = NEW.user_id;

  -- Populate twitch_username (existing behavior)
  IF meta->>'preferred_username' IS NOT NULL THEN
    NEW.twitch_username = meta->>'preferred_username';
  ELSIF meta->>'twitch_username' IS NOT NULL THEN
    NEW.twitch_username = meta->>'twitch_username';
  END IF;

  -- Populate twitch_id (numeric Twitch user ID) — needed for Extension EBS
  IF provider = 'twitch' AND meta->>'sub' IS NOT NULL THEN
    NEW.twitch_id = meta->>'sub';
  ELSIF meta->>'provider_id' IS NOT NULL AND provider = 'twitch' THEN
    NEW.twitch_id = meta->>'provider_id';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3) Also handle updates (when user re-logs, update their twitch_id if missing)
CREATE OR REPLACE FUNCTION public.sync_twitch_id_on_login()
RETURNS TRIGGER AS $$
DECLARE
  twitch_provider_id TEXT;
BEGIN
  -- Only run for Twitch users
  IF NEW.raw_app_meta_data->>'provider' = 'twitch' THEN
    twitch_provider_id := NEW.raw_user_meta_data->>'sub';
    
    IF twitch_provider_id IS NOT NULL THEN
      UPDATE user_profiles
      SET twitch_id = twitch_provider_id,
          twitch_username = COALESCE(
            NEW.raw_user_meta_data->>'preferred_username',
            NEW.raw_user_meta_data->>'twitch_username',
            twitch_username
          )
      WHERE user_id = NEW.id
        AND (twitch_id IS NULL OR twitch_id != twitch_provider_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users update (fires each time user signs in)
DROP TRIGGER IF EXISTS on_auth_user_login_sync_twitch ON auth.users;
CREATE TRIGGER on_auth_user_login_sync_twitch
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_twitch_id_on_login();

-- 4) Backfill: populate twitch_id for ALL existing Twitch-authenticated users
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT
      up.user_id,
      au.raw_user_meta_data->>'sub' AS twitch_numeric_id,
      COALESCE(au.raw_user_meta_data->>'preferred_username', au.raw_user_meta_data->>'twitch_username') AS twitch_uname
    FROM user_profiles up
    JOIN auth.users au ON au.id = up.user_id
    WHERE au.raw_app_meta_data->>'provider' = 'twitch'
      AND (up.twitch_id IS NULL OR up.twitch_id = '')
      AND au.raw_user_meta_data->>'sub' IS NOT NULL
  LOOP
    UPDATE user_profiles
    SET twitch_id = rec.twitch_numeric_id,
        twitch_username = COALESCE(rec.twitch_uname, twitch_username)
    WHERE user_id = rec.user_id;
  END LOOP;
END $$;
