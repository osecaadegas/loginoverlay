-- Consolidated migration: 004_streamelements_inventory_and_api_access.sql
-- Generated from active source migrations retained after cleanup

-- ============================================================================
-- Source: create_inventory_system.sql
-- ============================================================================
-- Create inventory system for users

-- Create items table (defines all available items in the game)
CREATE TABLE IF NOT EXISTS items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- 'achievement', 'item', 'badge', 'skin', etc.
  icon TEXT NOT NULL, -- emoji or URL to icon
  rarity TEXT NOT NULL DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary'
  tradeable BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_inventory table (items owned by users)
CREATE TABLE IF NOT EXISTS user_inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER DEFAULT 1,
  acquired_at TIMESTAMPTZ DEFAULT NOW(),
  equipped BOOLEAN DEFAULT false,
  UNIQUE(user_id, item_id)
);

-- Enable RLS
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_inventory ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view items" ON items;
DROP POLICY IF EXISTS "Admins can insert items" ON items;
DROP POLICY IF EXISTS "Users can view own inventory" ON user_inventory;
DROP POLICY IF EXISTS "Users can insert own inventory" ON user_inventory;
DROP POLICY IF EXISTS "Users can update own inventory" ON user_inventory;

-- Policy: Everyone can view items
CREATE POLICY "Anyone can view items"
  ON items
  FOR SELECT
  USING (true);

-- Policy: Only admins can insert items
CREATE POLICY "Admins can insert items"
  ON items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- Policy: Users can view their own inventory
CREATE POLICY "Users can view own inventory"
  ON user_inventory
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert into their own inventory
CREATE POLICY "Users can insert own inventory"
  ON user_inventory
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own inventory
CREATE POLICY "Users can update own inventory"
  ON user_inventory
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_inventory_user_id ON user_inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_user_inventory_item_id ON user_inventory(item_id);
CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
CREATE INDEX IF NOT EXISTS idx_items_rarity ON items(rarity);

-- Insert some default items
INSERT INTO items (name, description, type, icon, rarity, tradeable) VALUES
  ('Golden Trophy', 'Awarded for outstanding achievement', 'achievement', '🏆', 'legendary', false),
  ('Silver Medal', 'Second place finish', 'achievement', '🥈', 'rare', false),
  ('Bronze Medal', 'Third place finish', 'achievement', '🥉', 'common', false),
  ('Lucky Charm', 'Increases your luck in games', 'item', '🍀', 'common', true),
  ('Diamond Ring', 'A precious gem', 'item', '💎', 'epic', true),
  ('Fire Badge', 'For being on fire!', 'badge', '🔥', 'rare', false),
  ('Crown', 'King of the casino', 'badge', '👑', 'legendary', false),
  ('Star Badge', 'Rising star achievement', 'badge', '⭐', 'common', false),
  ('Money Bag', 'Big win achievement', 'achievement', '💰', 'epic', false),
  ('Gem Stone', 'A beautiful gem', 'item', '💠', 'rare', true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Source: STREAMELEMENTS_SETUP.sql
-- ============================================================================
-- StreamElements Integration Database Setup

-- Table: user_roles (if not exists)
-- Required for admin/moderator checks in RLS policies
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user',
  access_expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  moderator_permissions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- Table: streamelements_connections
-- Stores user's StreamElements account connections
CREATE TABLE IF NOT EXISTS streamelements_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  se_channel_id TEXT NOT NULL,
  se_jwt_token TEXT NOT NULL,
  se_username TEXT,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_sync TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Table: redemption_items
-- Admin-configurable items users can redeem with points
CREATE TABLE IF NOT EXISTS redemption_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  point_cost INTEGER NOT NULL,
  reward_type TEXT NOT NULL, -- 'premium_role', 'premium_duration', 'custom'
  reward_value JSONB, -- e.g., {"duration_days": 30} or {"role": "premium"}
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: point_redemptions
-- Track all point redemptions
CREATE TABLE IF NOT EXISTS point_redemptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redemption_id UUID NOT NULL REFERENCES redemption_items(id) ON DELETE CASCADE,
  points_spent INTEGER NOT NULL,
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE streamelements_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemption_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_redemptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for streamelements_connections
CREATE POLICY "Users can view their own SE connection"
  ON streamelements_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own SE connection"
  ON streamelements_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own SE connection"
  ON streamelements_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own SE connection"
  ON streamelements_connections FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for redemption_items (everyone can view active items)
CREATE POLICY "Anyone can view active redemption items"
  ON redemption_items FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage redemption items"
  ON redemption_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND is_active = true
    )
  );

-- RLS Policies for point_redemptions
CREATE POLICY "Anyone can view all redemptions"
  ON point_redemptions FOR SELECT
  USING (true);

CREATE POLICY "Users can create redemptions"
  ON point_redemptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update redemptions"
  ON point_redemptions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderator')
      AND is_active = true
    )
  );

-- Premium-role automation is intentionally left to application workflows.
-- The legacy trigger depended on columns that are no longer part of the active role model.

-- Insert some default redemption items
INSERT INTO redemption_items (name, description, point_cost, reward_type, reward_value) VALUES
  ('Premium Access (7 Days)', 'Get premium features for 7 days', 5000, 'premium_duration', '{"duration_days": 7, "reward_type": "premium_duration"}'),
  ('Premium Access (30 Days)', 'Get premium features for 30 days', 15000, 'premium_duration', '{"duration_days": 30, "reward_type": "premium_duration"}'),
  ('Premium Access (90 Days)', 'Get premium features for 90 days', 40000, 'premium_duration', '{"duration_days": 90, "reward_type": "premium_duration"}')
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_se_connections_user_id ON streamelements_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_user_id ON point_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_processed ON point_redemptions(processed, redeemed_at);

-- ============================================================================
-- Source: add_available_units.sql
-- ============================================================================
-- Add available_units column to redemption_items table
-- This allows tracking inventory for limited-quantity redemption items

ALTER TABLE redemption_items 
ADD COLUMN IF NOT EXISTS available_units INTEGER DEFAULT NULL;

-- NULL means unlimited, any positive number means limited stock
COMMENT ON COLUMN redemption_items.available_units IS 'Number of units available for redemption. NULL = unlimited';

-- Add image_url column if it doesn't exist (for displaying images on redemption cards)
ALTER TABLE redemption_items 
ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT NULL;

COMMENT ON COLUMN redemption_items.image_url IS 'URL of image to display on the redemption card';

-- Add processed column to point_redemptions table
ALTER TABLE point_redemptions
ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT false;

COMMENT ON COLUMN point_redemptions.processed IS 'Whether the redemption has been manually processed by admin';

-- ============================================================================
-- Source: add_status_column.sql
-- ============================================================================
-- Add status column to point_redemptions table
ALTER TABLE point_redemptions
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';

-- Update existing records
UPDATE point_redemptions
SET status = CASE
  WHEN processed = true THEN 'approved'
  ELSE 'pending'
END
WHERE status IS NULL OR status = 'pending';

-- Add check constraint
ALTER TABLE point_redemptions
ADD CONSTRAINT check_status_values
CHECK (status IN ('pending', 'approved', 'denied'));

-- ============================================================================
-- Source: add_sort_order_to_redemption_items.sql
-- ============================================================================
-- Add sort_order column to redemption_items for admin-controlled ordering
ALTER TABLE redemption_items
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Initialize sort_order based on current point_cost ordering
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY point_cost ASC, created_at ASC) - 1 AS rn
  FROM redemption_items
)
UPDATE redemption_items
SET sort_order = ordered.rn
FROM ordered
WHERE redemption_items.id = ordered.id;

-- Create index for efficient ordering
CREATE INDEX IF NOT EXISTS idx_redemption_items_sort_order ON redemption_items(sort_order);

-- ============================================================================
-- Source: allow_public_redemption_viewing.sql
-- ============================================================================
-- Allow all authenticated users to view all point redemptions (for public history)
-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Users can view their own redemptions" ON point_redemptions;

-- Create new public viewing policy (for showing redemption history to everyone)
CREATE POLICY "Anyone can view all redemptions"
  ON point_redemptions FOR SELECT
  USING (true);

-- Keep the insert policy for users to create their own redemptions
-- This should already exist but keeping it explicit
DROP POLICY IF EXISTS "Users can create redemptions" ON point_redemptions;
CREATE POLICY "Users can create redemptions"
  ON point_redemptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- Source: fix_redemption_cascade.sql
-- ============================================================================
-- Fix: Allow deleting redemption_items that have been redeemed
-- Error: "update or delete on table redemption_items violates foreign key constraint 
--         point_redemptions_redemption_id_fkey on table point_redemptions"

-- Drop the existing constraint (no CASCADE)
ALTER TABLE point_redemptions
  DROP CONSTRAINT IF EXISTS point_redemptions_redemption_id_fkey;

-- Re-add with ON DELETE CASCADE so deleting an item also removes its redemption history
ALTER TABLE point_redemptions
  ADD CONSTRAINT point_redemptions_redemption_id_fkey
  FOREIGN KEY (redemption_id) REFERENCES redemption_items(id) ON DELETE CASCADE;

-- ============================================================================
-- Source: fix_se_connections_rls_private.sql
-- ============================================================================
-- Fix streamelements_connections RLS: credentials must be private per-user
-- The "Anyone can view connections" policy leaks SE JWT tokens to all users.
-- Drop ALL public-read policies and keep only the per-user one.

DROP POLICY IF EXISTS "Anyone can view connections" ON streamelements_connections;
DROP POLICY IF EXISTS "Anyone can view SE usernames" ON streamelements_connections;
DROP POLICY IF EXISTS "Everyone can view connections" ON streamelements_connections;
DROP POLICY IF EXISTS "Public can view connections" ON streamelements_connections;

-- Ensure the per-user SELECT policy exists
DROP POLICY IF EXISTS "Users can view their own SE connection" ON streamelements_connections;
CREATE POLICY "Users can view their own SE connection" ON streamelements_connections
    FOR SELECT
    USING ((select auth.uid()) = user_id);

-- ============================================================================
-- Source: fix_se_points_page.sql
-- ============================================================================
-- ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
-- FIX /points PAGE - SE auto-sync + username display
-- 
-- ROOT CAUSE: streamelements_connections RLS only allows users to
-- read their OWN row. This blocks:
--   1. checkSeCredentials() ÔåÆ can't read admin's SE row ÔåÆ "Setup Required"
--   2. autoConnectTwitchUser() ÔåÆ can't get admin's SE creds ÔåÆ no auto-connect
--   3. loadAllRedemptions() ÔåÆ can't read other users' se_username ÔåÆ "@User"
--
-- FIX: SECURITY DEFINER RPCs that bypass RLS safely.
-- The JWT token never leaves the server-side function context.
-- ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ

-- ÔöÇÔöÇÔöÇ 1. RPC: Check if SE is configured (returns true/false only) ÔöÇÔöÇÔöÇÔöÇ

DROP FUNCTION IF EXISTS is_se_configured();
CREATE OR REPLACE FUNCTION is_se_configured()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM streamelements_connections sc
    JOIN user_roles ur ON ur.user_id = sc.user_id
    WHERE ur.role = 'admin'
      AND ur.is_active = true
      AND sc.se_channel_id IS NOT NULL
      AND sc.se_jwt_token IS NOT NULL
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION is_se_configured() TO authenticated;


-- ÔöÇÔöÇÔöÇ 2. RPC: Get admin's SE credentials for auto-connect ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
-- Only returns credentials to authenticated users who need to sync points.
-- The credentials are for the admin's SE channel.

DROP FUNCTION IF EXISTS get_streamer_se_credentials();
CREATE OR REPLACE FUNCTION get_streamer_se_credentials()
RETURNS TABLE(channel_id TEXT, jwt_token TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT sc.se_channel_id, sc.se_jwt_token
  FROM streamelements_connections sc
  JOIN user_roles ur ON ur.user_id = sc.user_id
  WHERE ur.role = 'admin'
    AND ur.is_active = true
    AND sc.se_channel_id IS NOT NULL
    AND sc.se_jwt_token IS NOT NULL
  LIMIT 1;
END;
$$;

-- Grant execute to authenticated users only
GRANT EXECUTE ON FUNCTION get_streamer_se_credentials() TO authenticated;


-- ÔöÇÔöÇÔöÇ 3. RPC: Get usernames for a list of user IDs ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
-- Returns the best available username for each user_id:
-- Priority: se_username > display_name > username > Twitch metadata

DROP FUNCTION IF EXISTS get_usernames_for_ids(UUID[]);
CREATE OR REPLACE FUNCTION get_usernames_for_ids(p_user_ids UUID[])
RETURNS TABLE(user_id UUID, username TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id AS user_id,
    COALESCE(
      sc.se_username,
      up.twitch_display_name,
      up.display_name,
      up.twitch_username,
      up.username,
      u.raw_user_meta_data->>'preferred_username',
      u.raw_user_meta_data->>'name',
      'User'
    ) AS username
  FROM unnest(p_user_ids) AS uid(id)
  JOIN auth.users u ON u.id = uid.id
  LEFT JOIN streamelements_connections sc ON sc.user_id = u.id
  LEFT JOIN user_profiles up ON up.user_id = u.id;
END;
$$;

-- Grant execute to authenticated users only
GRANT EXECUTE ON FUNCTION get_usernames_for_ids(UUID[]) TO authenticated;


-- ÔöÇÔöÇÔöÇ 4. VERIFICATION ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

-- Test is_se_configured (should return true if admin has SE set up)
SELECT is_se_configured();

-- Test get_streamer_se_credentials (should return 1 row with channel_id)
SELECT channel_id FROM get_streamer_se_credentials();

-- List all functions we created
SELECT routine_name, security_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('is_se_configured', 'get_streamer_se_credentials', 'get_usernames_for_ids');

-- ============================================================================
-- Source: add_streamer_api_keys.sql
-- ============================================================================
-- ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
-- STREAMER API KEYS ÔÇö Allow external websites to read overlay data
-- 
-- This gives each approved streamer an API key they can embed on
-- their own website. The key only grants READ access to their
-- own bonus_hunt / overlay widget data.
-- ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ

-- ÔöÇÔöÇÔöÇ 1. API Keys table ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

CREATE TABLE IF NOT EXISTS streamer_api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  label TEXT DEFAULT 'My Website',
  allowed_origins TEXT[] DEFAULT '{}',     -- CORS origins, e.g. {'https://mysite.com'}
  is_active BOOLEAN DEFAULT true,
  rate_limit_per_min INT DEFAULT 60,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  UNIQUE(user_id)  -- one key per user (can regenerate)
);

CREATE INDEX IF NOT EXISTS idx_api_keys_key ON streamer_api_keys(api_key);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON streamer_api_keys(user_id);

-- ÔöÇÔöÇÔöÇ 2. RLS ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

ALTER TABLE streamer_api_keys ENABLE ROW LEVEL SECURITY;

-- Users can manage their own key
DROP POLICY IF EXISTS "Users manage own API key" ON streamer_api_keys;
CREATE POLICY "Users manage own API key"
  ON streamer_api_keys FOR ALL
  USING (auth.uid() = user_id);

-- Admin can see all keys (for approval / revocation)
DROP POLICY IF EXISTS "Admin can view all API keys" ON streamer_api_keys;
CREATE POLICY "Admin can view all API keys"
  ON streamer_api_keys FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
        AND user_roles.is_active = true
    )
  );

-- Admin can update any key (activate/deactivate)
DROP POLICY IF EXISTS "Admin can update all API keys" ON streamer_api_keys;
CREATE POLICY "Admin can update all API keys"
  ON streamer_api_keys FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
        AND user_roles.is_active = true
    )
  );

-- ÔöÇÔöÇÔöÇ 3. Feature access table (who can use the API feature) ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

CREATE TABLE IF NOT EXISTS streamer_api_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

ALTER TABLE streamer_api_access ENABLE ROW LEVEL SECURITY;

-- Users can read their own access status
DROP POLICY IF EXISTS "Users see own API access" ON streamer_api_access;
CREATE POLICY "Users see own API access"
  ON streamer_api_access FOR SELECT
  USING (auth.uid() = user_id);

-- Admin full control
DROP POLICY IF EXISTS "Admin manages API access" ON streamer_api_access;
CREATE POLICY "Admin manages API access"
  ON streamer_api_access FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
        AND user_roles.is_active = true
    )
  );

-- ÔöÇÔöÇÔöÇ 4. RPC: Validate API key and return user_id ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

CREATE OR REPLACE FUNCTION validate_api_key(p_api_key TEXT)
RETURNS TABLE(user_id UUID, allowed_origins TEXT[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update last_used_at
  UPDATE streamer_api_keys
  SET last_used_at = now()
  WHERE api_key = p_api_key AND is_active = true;

  RETURN QUERY
  SELECT ak.user_id, ak.allowed_origins
  FROM streamer_api_keys ak
  JOIN streamer_api_access aa ON aa.user_id = ak.user_id AND aa.is_active = true
  WHERE ak.api_key = p_api_key
    AND ak.is_active = true;
END;
$$;

GRANT EXECUTE ON FUNCTION validate_api_key(TEXT) TO anon, authenticated;

-- ÔöÇÔöÇÔöÇ 5. Verification ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'streamer_api_keys' 
ORDER BY ordinal_position;

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'streamer_api_access' 
ORDER BY ordinal_position;

-- ============================================================================
-- Source: add_spotify_tokens.sql
-- ============================================================================
-- Spotify token storage for song request API
-- One row per streamer. The serverless API reads this to queue songs.

CREATE TABLE IF NOT EXISTS spotify_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- RLS
ALTER TABLE spotify_tokens ENABLE ROW LEVEL SECURITY;

-- Users can read/write their own tokens
CREATE POLICY spotify_tokens_select ON spotify_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY spotify_tokens_insert ON spotify_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY spotify_tokens_update ON spotify_tokens FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY spotify_tokens_delete ON spotify_tokens FOR DELETE USING (auth.uid() = user_id);

-- The service_role key (used by the API route) bypasses RLS, so it can read any streamer's tokens.
