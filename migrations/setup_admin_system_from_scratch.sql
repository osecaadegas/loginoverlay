-- COMPLETE SETUP: Create all admin tables from scratch
-- Drops broken tables first, then recreates them cleanly

-- =====================================================
-- STEP 0: DROP ALL BROKEN TABLES (order matters for foreign keys)
-- =====================================================

-- Drop policies first to avoid dependency errors
DO $$ 
DECLARE
  pol RECORD;
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'admin_action_quotas', 'admin_quota_configs', 'action_rollbacks',
    'admin_notes', 'admin_actions', 'admin_user_roles',
    'admin_permissions', 'admin_roles'
  ]) LOOP
    FOR pol IN 
      SELECT policyname FROM pg_policies WHERE tablename = tbl
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, tbl);
    END LOOP;
  END LOOP;
END $$;

-- Drop functions that depend on these tables
DROP FUNCTION IF EXISTS get_admin_role_level(UUID);
DROP FUNCTION IF EXISTS has_admin_permission(UUID, TEXT);
DROP FUNCTION IF EXISTS increment_action_quota(UUID, TEXT, INTEGER, TEXT);
DROP FUNCTION IF EXISTS log_admin_action CASCADE;
DROP FUNCTION IF EXISTS create_rollback_snapshot CASCADE;
DROP FUNCTION IF EXISTS mark_as_admin_action CASCADE;

-- Remove anti-cheat columns from game_logs if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_logs' AND column_name = 'admin_action_id') THEN
    ALTER TABLE game_logs DROP COLUMN admin_action_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_logs' AND column_name = 'is_admin_action') THEN
    ALTER TABLE game_logs DROP COLUMN is_admin_action;
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS admin_action_quotas CASCADE;
DROP TABLE IF EXISTS admin_quota_configs CASCADE;
DROP TABLE IF EXISTS action_rollbacks CASCADE;
DROP TABLE IF EXISTS admin_notes CASCADE;
DROP TABLE IF EXISTS admin_actions CASCADE;
DROP TABLE IF EXISTS admin_user_roles CASCADE;
DROP TABLE IF EXISTS admin_permissions CASCADE;
DROP TABLE IF EXISTS admin_roles CASCADE;

-- =====================================================
-- 1. ADMIN ROLES TABLE
-- =====================================================

CREATE TABLE admin_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role_name VARCHAR(50) UNIQUE NOT NULL,
  role_level INTEGER NOT NULL CHECK (role_level BETWEEN 0 AND 100),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default roles
INSERT INTO admin_roles (role_name, role_level, description) VALUES
  ('owner', 100, 'Full system access, can manage all admins'),
  ('admin', 75, 'Can perform most actions, limited system management'),
  ('moderator', 50, 'Can ban/unban, edit player data with restrictions'),
  ('support', 25, 'Can view and add notes only')
ON CONFLICT (role_name) DO NOTHING;

-- =====================================================
-- 2. ADMIN PERMISSIONS TABLE
-- =====================================================

CREATE TABLE admin_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  permission_name VARCHAR(100) UNIQUE NOT NULL,
  permission_scope VARCHAR(50) NOT NULL, -- 'player', 'economy', 'inventory', 'security', 'system'
  description TEXT,
  required_role_level INTEGER NOT NULL CHECK (required_role_level BETWEEN 0 AND 100),
  is_destructive BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert permissions
INSERT INTO admin_permissions (permission_name, permission_scope, description, required_role_level, is_destructive) VALUES
  -- Player scope
  ('player:view', 'player', 'View player profiles', 25, false),
  ('player:search', 'player', 'Search for players', 25, false),
  ('player:edit:basic', 'player', 'Edit basic player info', 50, false),
  ('player:edit:stats', 'player', 'Edit player stats', 50, false),
  
  -- Economy scope
  ('economy:view', 'economy', 'View player economy', 25, false),
  ('economy:edit:money', 'economy', 'Add/remove cash and bank', 50, false),
  ('economy:edit:businesses', 'economy', 'Manage businesses', 75, false),
  ('economy:reset', 'economy', 'Reset player economy', 75, true),
  
  -- Inventory scope
  ('inventory:view', 'inventory', 'View player inventory', 25, false),
  ('inventory:edit:items', 'inventory', 'Add/remove items', 50, false),
  ('inventory:reset', 'inventory', 'Reset inventory', 75, true),
  
  -- Security scope
  ('security:ban:temp', 'security', 'Issue temporary bans', 50, false),
  ('security:ban:perm', 'security', 'Issue permanent bans', 75, true),
  ('security:unban', 'security', 'Remove bans', 50, false),
  ('security:view:flags', 'security', 'View security flags', 25, false),
  ('security:notes:add', 'security', 'Add admin notes', 25, false),
  ('security:notes:view', 'security', 'View admin notes', 25, false),
  
  -- System scope
  ('system:rollback', 'system', 'Rollback admin actions', 75, false),
  ('system:view:logs', 'system', 'View audit logs', 50, false),
  ('system:manage:admins', 'system', 'Manage admin roles', 100, true)
ON CONFLICT (permission_name) DO NOTHING;

-- =====================================================
-- 3. ADMIN USER ROLES TABLE
-- =====================================================

CREATE TABLE admin_user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role_name VARCHAR(50) NOT NULL REFERENCES admin_roles(role_name),
  assigned_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(user_id, role_name)
);

CREATE INDEX IF NOT EXISTS idx_admin_user_roles_user ON admin_user_roles(user_id) WHERE is_active = TRUE;

-- =====================================================
-- 4. ADMIN ACTIONS TABLE (Audit Log)
-- =====================================================

CREATE TABLE admin_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  admin_username TEXT NOT NULL,
  admin_role TEXT NOT NULL,
  
  -- Action details
  action_type TEXT NOT NULL,
  action_category TEXT NOT NULL, -- 'player', 'economy', 'inventory', 'security', 'system'
  target_player_id UUID,
  target_player_username TEXT,
  
  -- State tracking
  before_value JSONB,
  after_value JSONB,
  change_delta JSONB,
  
  -- Context
  reason TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  
  -- Status
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'rolled_back')),
  error_message TEXT,
  
  -- Rollback
  is_rolled_back BOOLEAN DEFAULT FALSE,
  rolled_back_at TIMESTAMPTZ,
  rolled_back_by UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_admin ON admin_actions(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_actions_player ON admin_actions(target_player_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_actions_type ON admin_actions(action_type, created_at DESC);

-- =====================================================
-- 5. ADMIN NOTES TABLE
-- =====================================================

CREATE TABLE admin_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  admin_username TEXT NOT NULL,
  
  player_id UUID NOT NULL,
  player_username TEXT NOT NULL,
  
  note_type TEXT NOT NULL CHECK (note_type IN ('info', 'warning', 'ban_reason', 'support_ticket', 'investigation')),
  note_content TEXT NOT NULL,
  
  -- Visibility
  is_visible_to_player BOOLEAN DEFAULT FALSE,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_notes_player ON admin_notes(player_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notes_admin ON admin_notes(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notes_type ON admin_notes(note_type);

-- =====================================================
-- 6. ACTION ROLLBACKS TABLE
-- =====================================================

CREATE TABLE action_rollbacks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  original_action_id UUID NOT NULL REFERENCES admin_actions(id),
  
  -- Snapshot of state before action (for restore)
  player_id UUID NOT NULL,
  snapshot_data JSONB NOT NULL,
  snapshot_tables TEXT[],
  
  -- Rollback details
  rolled_back_by UUID REFERENCES auth.users(id),
  rollback_reason TEXT NOT NULL,
  rollback_status TEXT DEFAULT 'pending' CHECK (rollback_status IN ('pending', 'completed', 'failed')),
  rollback_error TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_rollbacks_action ON action_rollbacks(original_action_id);
CREATE INDEX IF NOT EXISTS idx_rollbacks_player ON action_rollbacks(player_id, created_at DESC);

-- =====================================================
-- 7. ADMIN ACTION QUOTAS TABLE (Rate Limiting)
-- =====================================================

CREATE TABLE admin_action_quotas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  action_type TEXT NOT NULL,
  
  -- Quota tracking
  actions_taken INTEGER DEFAULT 0,
  quota_limit INTEGER NOT NULL,
  quota_period TEXT NOT NULL CHECK (quota_period IN ('hour', 'day', 'week')),
  period_start TIMESTAMPTZ DEFAULT NOW(),
  period_end TIMESTAMPTZ NOT NULL,
  
  -- Status
  is_locked BOOLEAN DEFAULT FALSE,
  locked_until TIMESTAMPTZ,
  locked_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(admin_id, action_type, period_start)
);

CREATE INDEX IF NOT EXISTS idx_quotas_admin ON admin_action_quotas(admin_id, action_type, period_end);

-- =====================================================
-- 8. ADMIN QUOTA CONFIGS TABLE
-- =====================================================

CREATE TABLE admin_quota_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role_name VARCHAR(50) NOT NULL REFERENCES admin_roles(role_name),
  action_type TEXT NOT NULL,
  quota_limit INTEGER NOT NULL,
  quota_period TEXT NOT NULL CHECK (quota_period IN ('hour', 'day', 'week')),
  description TEXT,
  UNIQUE(role_name, action_type)
);

-- Insert default quotas
INSERT INTO admin_quota_configs (role_name, action_type, quota_limit, quota_period, description) VALUES
  ('support', 'player:view', 100, 'hour', 'View player profiles'),
  ('support', 'security:notes:add', 50, 'day', 'Add notes'),
  ('moderator', 'economy:edit:money', 50, 'day', 'Edit money'),
  ('moderator', 'security:ban:temp', 20, 'day', 'Temporary bans'),
  ('admin', 'economy:edit:money', 200, 'day', 'Edit money'),
  ('admin', 'security:ban:perm', 10, 'day', 'Permanent bans'),
  ('owner', 'player:view', 10000, 'day', 'High limit for tracking only')
ON CONFLICT (role_name, action_type) DO NOTHING;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Get admin's highest role level
CREATE OR REPLACE FUNCTION get_admin_role_level(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(MAX(r.role_level), 0)
  FROM admin_user_roles ur
  JOIN admin_roles r ON r.role_name = ur.role_name
  WHERE ur.user_id = p_user_id 
    AND ur.is_active = TRUE
    AND (ur.expires_at IS NULL OR ur.expires_at > NOW());
$$ LANGUAGE SQL STABLE;

-- Check if admin has specific permission
CREATE OR REPLACE FUNCTION has_admin_permission(p_user_id UUID, p_permission_name TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM admin_permissions p
    WHERE p.permission_name = p_permission_name
      AND get_admin_role_level(p_user_id) >= p.required_role_level
  );
$$ LANGUAGE SQL STABLE;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Admin roles
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view roles" ON admin_roles FOR SELECT USING (get_admin_role_level(auth.uid()) >= 25);
CREATE POLICY "Service role manages roles" ON admin_roles FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Admin permissions
ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view permissions" ON admin_permissions FOR SELECT USING (get_admin_role_level(auth.uid()) >= 25);
CREATE POLICY "Service role manages permissions" ON admin_permissions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Admin user roles
ALTER TABLE admin_user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view user roles" ON admin_user_roles FOR SELECT USING (get_admin_role_level(auth.uid()) >= 50);
CREATE POLICY "Service role manages user roles" ON admin_user_roles FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Admin actions
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view actions" ON admin_actions FOR SELECT USING (get_admin_role_level(auth.uid()) >= 25);
CREATE POLICY "Service role manages actions" ON admin_actions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Admin notes
ALTER TABLE admin_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view notes" ON admin_notes FOR SELECT USING (has_admin_permission(auth.uid(), 'security:notes:view'));
CREATE POLICY "Service role manages notes" ON admin_notes FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Action rollbacks
ALTER TABLE action_rollbacks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view rollbacks" ON action_rollbacks FOR SELECT USING (has_admin_permission(auth.uid(), 'system:rollback'));
CREATE POLICY "Service role manages rollbacks" ON action_rollbacks FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Action quotas
ALTER TABLE admin_action_quotas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view own quotas" ON admin_action_quotas FOR SELECT USING (admin_id = auth.uid() OR get_admin_role_level(auth.uid()) >= 75);
CREATE POLICY "Service role manages quotas" ON admin_action_quotas FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Quota configs
ALTER TABLE admin_quota_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view quota configs" ON admin_quota_configs FOR SELECT USING (get_admin_role_level(auth.uid()) >= 50);
CREATE POLICY "Service role manages quota configs" ON admin_quota_configs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =====================================================
-- ANTI-CHEAT INTEGRATION
-- =====================================================

-- Add columns to game_logs if they don't exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'game_logs') THEN
    ALTER TABLE game_logs ADD COLUMN IF NOT EXISTS is_admin_action BOOLEAN DEFAULT FALSE;
    ALTER TABLE game_logs ADD COLUMN IF NOT EXISTS admin_action_id UUID REFERENCES admin_actions(id);
  END IF;
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_name IN (
    'admin_roles', 'admin_permissions', 'admin_user_roles', 
    'admin_actions', 'admin_notes', 'action_rollbacks',
    'admin_action_quotas', 'admin_quota_configs'
  );
  
  IF table_count = 8 THEN
    RAISE NOTICE '✅ SUCCESS: All 8 admin tables created';
    RAISE NOTICE '✅ Next step: Assign yourself owner role:';
    RAISE NOTICE 'INSERT INTO admin_user_roles (user_id, role_name, assigned_by) VALUES (''YOUR_USER_ID'', ''owner'', ''YOUR_USER_ID'');';
  ELSE
    RAISE WARNING '⚠️ Only % of 8 tables created. Check errors above.', table_count;
  END IF;
END $$;
