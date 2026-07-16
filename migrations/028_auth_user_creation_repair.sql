-- Repair auth user creation side effects.
--
-- Supabase Auth should never fail just because profile/role sync changed.
-- These triggers keep profile metadata useful, but swallow sync failures so
-- auth.users remains the source of truth for account creation.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS twitch_id TEXT,
  ADD COLUMN IF NOT EXISTS twitch_username TEXT,
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS twitch_display_name TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (
    user_id,
    username,
    display_name,
    twitch_display_name,
    twitch_id,
    twitch_username,
    avatar_url,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'preferred_username',
      NEW.raw_user_meta_data->>'twitch_username',
      split_part(COALESCE(NEW.email, ''), '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'preferred_username',
      NEW.raw_user_meta_data->>'twitch_username',
      split_part(COALESCE(NEW.email, ''), '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'preferred_username',
      NEW.raw_user_meta_data->>'twitch_username'
    ),
    NEW.raw_user_meta_data->>'sub',
    COALESCE(
      NEW.raw_user_meta_data->>'preferred_username',
      NEW.raw_user_meta_data->>'twitch_username'
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    ),
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    username = COALESCE(EXCLUDED.username, public.user_profiles.username),
    display_name = COALESCE(EXCLUDED.display_name, public.user_profiles.display_name),
    twitch_display_name = COALESCE(EXCLUDED.twitch_display_name, public.user_profiles.twitch_display_name),
    twitch_id = COALESCE(EXCLUDED.twitch_id, public.user_profiles.twitch_id),
    twitch_username = COALESCE(EXCLUDED.twitch_username, public.user_profiles.twitch_username),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.user_profiles.avatar_url),
    updated_at = NOW();

  INSERT INTO public.user_roles (user_id, role, is_active, moderator_permissions, created_at, updated_at)
  VALUES (NEW.id, 'user', TRUE, '{}'::jsonb, NOW(), NOW())
  ON CONFLICT (user_id, role) DO UPDATE SET
    is_active = COALESCE(public.user_roles.is_active, TRUE),
    updated_at = NOW();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user profile sync failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_sync_profile ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.sync_twitch_id_on_login()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.raw_app_meta_data->>'provider' = 'twitch' THEN
    UPDATE public.user_profiles
    SET twitch_id = COALESCE(NEW.raw_user_meta_data->>'sub', twitch_id),
        twitch_username = COALESCE(
          NEW.raw_user_meta_data->>'preferred_username',
          NEW.raw_user_meta_data->>'twitch_username',
          twitch_username
        ),
        username = COALESCE(
          NEW.raw_user_meta_data->>'preferred_username',
          NEW.raw_user_meta_data->>'twitch_username',
          username
        ),
        display_name = COALESCE(
          NEW.raw_user_meta_data->>'name',
          NEW.raw_user_meta_data->>'preferred_username',
          NEW.raw_user_meta_data->>'twitch_username',
          display_name
        ),
        twitch_display_name = COALESCE(
          NEW.raw_user_meta_data->>'name',
          NEW.raw_user_meta_data->>'preferred_username',
          NEW.raw_user_meta_data->>'twitch_username',
          twitch_display_name
        ),
        avatar_url = COALESCE(
          NEW.raw_user_meta_data->>'avatar_url',
          NEW.raw_user_meta_data->>'picture',
          avatar_url
        ),
        updated_at = NOW()
    WHERE user_id = NEW.id;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'sync_twitch_id_on_login failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_login_sync_twitch ON auth.users;

CREATE TRIGGER on_auth_user_login_sync_twitch
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_twitch_id_on_login();
