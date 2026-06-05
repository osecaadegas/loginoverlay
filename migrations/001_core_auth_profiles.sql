-- Consolidated migration: 001_core_auth_profiles.sql
-- Generated from active source migrations retained after cleanup

-- ============================================================================
-- Source: create_user_profiles.sql
-- ============================================================================
-- Create user_profiles table for storing avatar URLs and other profile data
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS twitch_display_name TEXT;

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user',
  access_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  moderator_permissions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

INSERT INTO storage.buckets (id, name, public)
VALUES ('public-assets', 'public-assets', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public;

DROP POLICY IF EXISTS "Public assets are publicly readable" ON storage.objects;
CREATE POLICY "Public assets are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'public-assets');

DROP POLICY IF EXISTS "Authenticated users can upload public assets" ON storage.objects;
CREATE POLICY "Authenticated users can upload public assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'public-assets' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update public assets" ON storage.objects;
CREATE POLICY "Authenticated users can update public assets"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'public-assets' AND auth.uid() IS NOT NULL)
  WITH CHECK (bucket_id = 'public-assets' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can delete public assets" ON storage.objects;
CREATE POLICY "Authenticated users can delete public assets"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'public-assets' AND auth.uid() IS NOT NULL);

-- ============================================================================
-- Source: add_twitch_username_to_profiles.sql

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

    UPDATE user_profiles
    SET twitch_id = COALESCE(twitch_provider_id, twitch_id),
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
        )
    WHERE user_id = NEW.id;
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
      COALESCE(au.raw_user_meta_data->>'preferred_username', au.raw_user_meta_data->>'twitch_username') AS twitch_uname,
      COALESCE(au.raw_user_meta_data->>'name', au.raw_user_meta_data->>'preferred_username', au.raw_user_meta_data->>'twitch_username') AS display_name,
      COALESCE(au.raw_user_meta_data->>'avatar_url', au.raw_user_meta_data->>'picture') AS avatar_url
    FROM user_profiles up
    JOIN auth.users au ON au.id = up.user_id
    WHERE au.raw_app_meta_data->>'provider' = 'twitch'
      AND (
        up.twitch_id IS NULL OR up.twitch_id = '' OR
        up.twitch_username IS NULL OR up.twitch_username = '' OR
        up.username IS NULL OR up.username = '' OR
        up.display_name IS NULL OR up.display_name = '' OR
        up.twitch_display_name IS NULL OR up.twitch_display_name = ''
      )
  LOOP
    UPDATE user_profiles
    SET twitch_id = COALESCE(rec.twitch_numeric_id, twitch_id),
        twitch_username = COALESCE(rec.twitch_uname, twitch_username),
        username = COALESCE(rec.twitch_uname, username),
        display_name = COALESCE(rec.display_name, display_name),
        twitch_display_name = COALESCE(rec.display_name, twitch_display_name),
        avatar_url = COALESCE(rec.avatar_url, avatar_url)
    WHERE user_id = rec.user_id;
  END LOOP;
END $$;

-- ============================================================================
-- Source: enable_multiple_roles.sql
-- ============================================================================
-- Enable multiple roles per user
-- This migration updates the user_roles table to allow multiple roles

-- Step 1: Drop the unique constraint on user_id (if it exists)
-- This allows multiple role records per user
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_key;

-- Step 2: Add a composite unique constraint on user_id + role
-- This prevents duplicate role assignments to the same user
ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);

-- Step 3: Add an id column if it doesn't exist (for easier management)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_roles' AND column_name = 'id'
  ) THEN
    ALTER TABLE user_roles ADD COLUMN id UUID DEFAULT gen_random_uuid() PRIMARY KEY;
  END IF;
END $$;

-- Note: Existing users with single roles will continue to work
-- To add additional roles to a user:
-- INSERT INTO user_roles (user_id, role, is_active) 
-- VALUES ('user-uuid', 'slot_modder', true);

-- ============================================================================
-- Source: fix_user_roles_simple.sql
-- ============================================================================
-- SIMPLE FIX: Remove circular dependency on user_roles
-- Run this in Supabase SQL editor

-- Drop ALL existing policies on user_roles
DROP POLICY IF EXISTS "Anyone can view roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;
DROP POLICY IF EXISTS "Service role bypass" ON user_roles;
DROP POLICY IF EXISTS "Users can view own role" ON user_roles;
DROP POLICY IF EXISTS "Users can view roles" ON user_roles;

-- Create simple policies without circular dependency
-- Everyone can SELECT roles (needed for permission checks everywhere)
CREATE POLICY "Public read access" ON user_roles FOR SELECT USING (true);

-- Users can INSERT their own role (for new user signup)
CREATE POLICY "Users can insert own role" ON user_roles FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can UPDATE their own role
CREATE POLICY "Users can update own role" ON user_roles FOR UPDATE 
  USING (auth.uid() = user_id);

-- Service role has full access (for backend operations)
-- Note: Service role bypasses RLS by default, so this is just for documentation

-- Verify it worked
SELECT 'user_roles policies fixed' as status;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'user_roles';

-- ============================================================================
-- Source: add_get_all_auth_users_function.sql
-- ============================================================================
-- Function to return ALL auth users with their metadata in a single call
-- This replaces the N+1 query pattern (get_user_email + get_user_metadata per user)
CREATE OR REPLACE FUNCTION get_all_auth_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  created_at TIMESTAMPTZ,
  app_metadata JSONB,
  user_metadata JSONB,
  identities JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.email::TEXT,
    u.created_at,
    u.raw_app_meta_data  AS app_metadata,
    u.raw_user_meta_data AS user_metadata,
    (
      SELECT COALESCE(json_agg(
        json_build_object(
          'provider', i.provider,
          'identity_data', i.identity_data
        )
      )::JSONB, '[]'::JSONB)
      FROM auth.identities i
      WHERE i.user_id = u.id
    ) AS identities
  FROM auth.users u
  ORDER BY u.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users (admin check happens in app)
GRANT EXECUTE ON FUNCTION get_all_auth_users() TO authenticated;

COMMENT ON FUNCTION get_all_auth_users IS 'Returns all auth users with email, metadata, and provider identities. Used by admin panel.';

-- ============================================================================
-- Source: fix_user_profiles_rls.sql
-- ============================================================================
-- Fix user_profiles RLS policies to allow proper access
-- This will fix the 400 errors when fetching user profiles

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Allow anyone (authenticated or not) to read profiles
-- This is safe since profiles only contain non-sensitive data like avatar_url and display_name
CREATE POLICY "Anyone can view profiles"
ON user_profiles FOR SELECT
USING (true);

-- Allow authenticated users to insert their own profile
CREATE POLICY "Users can insert own profile"
ON user_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
ON user_profiles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Verify the policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_profiles';
