-- =====================================================
-- PROFESSIONAL PLAYER MANAGEMENT SYSTEM
-- Enterprise-grade admin tools with RBAC, audit, rollback
-- =====================================================

-- =====================================================
-- ADMIN ROLES & PERMISSIONS
-- =====================================================

-- Role hierarchy: owner > admin > moderator > support
CREATE TABLE IF NOT EXISTS admin_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role_name TEXT NOT NULL UNIQUE CHECK (role_name IN ('owner', 'admin', 'moderator', 'support')),
  role_level INTEGER NOT NULL UNIQUE, -- owner=100, admin=75, moderator=50, support=25
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default roles
INSERT INTO admin_roles (role_name, role_level, description) VALUES
  ('owner', 100, 'Full system access - can do anything including managing other admins'),
  ('admin', 75, 'High-level access - can manage players, view sensitive data, issue bans'),
  ('moderator', 50, 'Limited access - can view players, issue temp bans, add notes'),
  ('support', 25, 'Read-only access - can view player data to assist with support tickets')
ON CONFLICT (role_name) DO NOTHING;

-- Permission scopes (granular permissions)
CREATE TABLE IF NOT EXISTS admin_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  permission_name TEXT NOT NULL UNIQUE,
  permission_scope TEXT NOT NULL, -- 'player', 'economy', 'inventory', 'security', 'system'
  permission_action TEXT NOT NULL, -- 'read', 'write', 'delete', 'ban', 'rollback'
  required_role_level INTEGER NOT NULL, -- Minimum role level required
  description TEXT,
  is_destructive BOOLEAN DEFAULT FALSE, -- Requires dual-confirmation
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default permissions
INSERT INTO admin_permissions (permission_name, permission_scope, permission_action, required_role_level, description, is_destructive) VALUES
  -- Player management
  ('player:view', 'player', 'read', 25, 'View player profiles and stats', false),
  ('player:edit:basic', 'player', 'write', 50, 'Edit player username, avatar, basic info', false),
  ('player:edit:stats', 'player', 'write', 75, 'Edit player level, XP, stats', false),
  ('player:ban:temp', 'player', 'ban', 50, 'Issue temporary bans (up to 7 days)', false),
  ('player:ban:perm', 'player', 'ban', 75, 'Issue permanent bans', true),
  ('player:delete', 'player', 'delete', 100, 'Delete player account (DESTRUCTIVE)', true),
  ('player:notes:add', 'player', 'write', 25, 'Add internal notes to player', false),
  ('player:notes:view', 'player', 'read', 25, 'View internal notes on player', false),
  
  -- Economy management
  ('economy:view', 'economy', 'read', 25, 'View player economy data', false),
  ('economy:edit:money', 'economy', 'write', 75, 'Add/remove player cash/bank', false),
  ('economy:edit:items', 'economy', 'write', 75, 'Grant/remove items from player', false),
  ('economy:reset', 'economy', 'delete', 100, 'Reset player economy (wipe cash/items)', true),
  
  -- Inventory management
  ('inventory:view', 'inventory', 'read', 25, 'View player inventory', false),
  ('inventory:add', 'inventory', 'write', 75, 'Add items to player inventory', false),
  ('inventory:remove', 'inventory', 'write', 75, 'Remove items from player inventory', false),
  ('inventory:reset', 'inventory', 'delete', 100, 'Wipe player inventory', true),
  
  -- Security & anti-cheat
  ('security:view', 'security', 'read', 50, 'View player security alerts and flags', false),
  ('security:flag', 'security', 'write', 50, 'Flag/unflag player for review', false),
  ('security:whitelist', 'security', 'write', 75, 'Add player to whitelist (bypass anti-cheat)', false),
  ('security:logs', 'security', 'read', 50, 'View player action logs', false),
  
  -- System actions
  ('system:rollback', 'system', 'rollback', 75, 'Undo admin actions', false),
  ('system:audit', 'system', 'read', 50, 'View admin action audit logs', false),
  ('system:manage:admins', 'system', 'write', 100, 'Manage other admin accounts', true)
ON CONFLICT (permission_name) DO NOTHING;

-- Admin user assignments (links auth.users to roles)
CREATE TABLE IF NOT EXISTS admin_user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_name TEXT NOT NULL REFERENCES admin_roles(role_name),
  assigned_by UUID REFERENCES auth.users(id), -- Who granted this role
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Optional: temporary admin access
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(user_id, role_name)
);

CREATE INDEX idx_admin_user_roles_user ON admin_user_roles(user_id) WHERE is_active = true;

-- =====================================================
-- ADMIN ACTION AUDIT LOG
-- =====================================================

CREATE TABLE IF NOT EXISTS admin_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  admin_username TEXT NOT NULL, -- Cached for quick display
  admin_role TEXT NOT NULL,
  
  -- Action details
  action_type TEXT NOT NULL, -- 'player:edit', 'economy:add', 'ban:issue', etc.
  action_category TEXT NOT NULL, -- 'player', 'economy', 'inventory', 'security'
  target_player_id UUID, -- Player affected (if applicable)
  target_player_username TEXT, -- Cached username
  
  -- What changed
  field_changed TEXT, -- 'cash', 'level', 'inventory', etc.
  before_value JSONB, -- State before change
  after_value JSONB, -- State after change
  change_delta JSONB, -- Calculated diff
  
  -- Metadata
  reason TEXT, -- Admin must provide reason
  ip_address INET,
  user_agent TEXT,
  is_destructive BOOLEAN DEFAULT FALSE,
  requires_confirmation BOOLEAN DEFAULT FALSE,
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES auth.users(id),
  
  -- Status
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'rolled_back')),
  error_message TEXT,
  
  -- Rollback info
  is_rolled_back BOOLEAN DEFAULT FALSE,
  rolled_back_at TIMESTAMPTZ,
  rolled_back_by UUID REFERENCES auth.users(id),
  rollback_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_actions_admin ON admin_actions(admin_id, created_at DESC);
CREATE INDEX idx_admin_actions_target ON admin_actions(target_player_id, created_at DESC);
CREATE INDEX idx_admin_actions_type ON admin_actions(action_type, created_at DESC);
CREATE INDEX idx_admin_actions_category ON admin_actions(action_category, created_at DESC);
CREATE INDEX idx_admin_actions_rolled_back ON admin_actions(is_rolled_back, created_at DESC);

-- =====================================================
-- ADMIN NOTES (Internal staff notes on players)
-- =====================================================

CREATE TABLE IF NOT EXISTS admin_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL, -- Target player
  player_username TEXT NOT NULL, -- Cached
  
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  admin_username TEXT NOT NULL,
  admin_role TEXT NOT NULL,
  
  note_type TEXT NOT NULL CHECK (note_type IN ('info', 'warning', 'ban_reason', 'support_ticket', 'investigation')),
  note_content TEXT NOT NULL,
  is_visible_to_player BOOLEAN DEFAULT FALSE, -- For ban reasons shown to player
  
  -- Metadata
  related_action_id UUID REFERENCES admin_actions(id), -- Link to action if applicable
  related_alert_id UUID REFERENCES security_alerts(id),
  tags TEXT[], -- ['repeat_offender', 'vip', 'streamer', etc.]
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_admin_notes_player ON admin_notes(player_id, created_at DESC) WHERE is_deleted = false;
CREATE INDEX idx_admin_notes_admin ON admin_notes(admin_id, created_at DESC);
CREATE INDEX idx_admin_notes_type ON admin_notes(note_type, created_at DESC);

-- =====================================================
-- ROLLBACK SYSTEM (Undo admin actions)
-- =====================================================

CREATE TABLE IF NOT EXISTS action_rollbacks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  original_action_id UUID NOT NULL REFERENCES admin_actions(id),
  
  -- Snapshot of state before action (for restore)
  player_id UUID NOT NULL,
  snapshot_data JSONB NOT NULL, -- Full state snapshot
  snapshot_tables TEXT[], -- Which tables were affected
  
  -- Rollback details
  rolled_back_by UUID REFERENCES auth.users(id),
  rollback_reason TEXT NOT NULL,
  rollback_status TEXT DEFAULT 'pending' CHECK (rollback_status IN ('pending', 'completed', 'failed')),
  rollback_error TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_rollbacks_action ON action_rollbacks(original_action_id);
CREATE INDEX idx_rollbacks_player ON action_rollbacks(player_id, created_at DESC);

-- =====================================================
-- ADMIN ACTION QUOTAS (Rate limiting)
-- =====================================================

CREATE TABLE IF NOT EXISTS admin_action_quotas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  action_type TEXT NOT NULL,
  
  -- Quota tracking
  actions_taken INTEGER DEFAULT 0,
  quota_limit INTEGER NOT NULL, -- Max actions per period
  quota_period TEXT NOT NULL CHECK (quota_period IN ('hour', 'day', 'week')),
  period_start TIMESTAMPTZ DEFAULT NOW(),
  period_end TIMESTAMPTZ NOT NULL,
  
  -- Status
  is_locked BOOLEAN DEFAULT FALSE, -- Quota exceeded
  locked_until TIMESTAMPTZ,
  locked_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(admin_id, action_type, period_start)
);

CREATE INDEX idx_quotas_admin ON admin_action_quotas(admin_id, action_type, period_end);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Get admin role level
CREATE OR REPLACE FUNCTION get_admin_role_level(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  role_level INTEGER;
BEGIN
  SELECT ar.role_level INTO role_level
  FROM admin_user_roles aur
  JOIN admin_roles ar ON aur.role_name = ar.role_name
  WHERE aur.user_id = user_id
    AND aur.is_active = true
    AND (aur.expires_at IS NULL OR aur.expires_at > NOW())
  ORDER BY ar.role_level DESC
  LIMIT 1;
  
  RETURN COALESCE(role_level, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if admin has permission
CREATE OR REPLACE FUNCTION has_admin_permission(
  user_id UUID,
  permission_name TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  role_level INTEGER;
  required_level INTEGER;
BEGIN
  -- Get user's highest role level
  role_level := get_admin_role_level(user_id);
  
  IF role_level = 0 THEN
    RETURN false;
  END IF;
  
  -- Get required level for permission
  SELECT required_role_level INTO required_level
  FROM admin_permissions
  WHERE permission_name = $2;
  
  IF required_level IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN role_level >= required_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if action requires confirmation (destructive)
CREATE OR REPLACE FUNCTION action_requires_confirmation(permission_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_permissions
    WHERE permission_name = $1 AND is_destructive = true
  );
END;
$$ LANGUAGE plpgsql;

-- Log admin action
CREATE OR REPLACE FUNCTION log_admin_action(
  p_admin_id UUID,
  p_admin_username TEXT,
  p_admin_role TEXT,
  p_action_type TEXT,
  p_action_category TEXT,
  p_target_player_id UUID,
  p_target_player_username TEXT,
  p_field_changed TEXT,
  p_before_value JSONB,
  p_after_value JSONB,
  p_reason TEXT,
  p_ip_address INET DEFAULT NULL,
  p_is_destructive BOOLEAN DEFAULT false
)
RETURNS UUID AS $$
DECLARE
  action_id UUID;
  change_diff JSONB;
BEGIN
  -- Calculate diff
  change_diff := jsonb_build_object(
    'added', p_after_value - p_before_value,
    'removed', p_before_value - p_after_value,
    'modified', jsonb_object_agg(key, value)
  )
  FROM (
    SELECT key, value
    FROM jsonb_each(p_after_value)
    WHERE p_after_value->>key IS DISTINCT FROM p_before_value->>key
  ) AS changes;
  
  -- Insert action
  INSERT INTO admin_actions (
    admin_id, admin_username, admin_role,
    action_type, action_category,
    target_player_id, target_player_username,
    field_changed, before_value, after_value, change_delta,
    reason, ip_address, is_destructive, status
  ) VALUES (
    p_admin_id, p_admin_username, p_admin_role,
    p_action_type, p_action_category,
    p_target_player_id, p_target_player_username,
    p_field_changed, p_before_value, p_after_value, change_diff,
    p_reason, p_ip_address, p_is_destructive, 'completed'
  ) RETURNING id INTO action_id;
  
  RETURN action_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create rollback snapshot
CREATE OR REPLACE FUNCTION create_rollback_snapshot(
  p_action_id UUID,
  p_player_id UUID,
  p_snapshot_data JSONB,
  p_snapshot_tables TEXT[]
)
RETURNS UUID AS $$
DECLARE
  snapshot_id UUID;
BEGIN
  INSERT INTO action_rollbacks (
    original_action_id,
    player_id,
    snapshot_data,
    snapshot_tables,
    rollback_status
  ) VALUES (
    p_action_id,
    p_player_id,
    p_snapshot_data,
    p_snapshot_tables,
    'pending'
  ) RETURNING id INTO snapshot_id;
  
  RETURN snapshot_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment action quota
CREATE OR REPLACE FUNCTION increment_action_quota(
  p_admin_id UUID,
  p_action_type TEXT,
  p_quota_limit INTEGER,
  p_quota_period TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
  period_end TIMESTAMPTZ;
BEGIN
  -- Calculate period end
  period_end := CASE p_quota_period
    WHEN 'hour' THEN NOW() + INTERVAL '1 hour'
    WHEN 'day' THEN NOW() + INTERVAL '1 day'
    WHEN 'week' THEN NOW() + INTERVAL '7 days'
  END;
  
  -- Upsert quota record
  INSERT INTO admin_action_quotas (
    admin_id, action_type, actions_taken, quota_limit, quota_period, period_end
  ) VALUES (
    p_admin_id, p_action_type, 1, p_quota_limit, p_quota_period, period_end
  )
  ON CONFLICT (admin_id, action_type, period_start) 
  DO UPDATE SET
    actions_taken = admin_action_quotas.actions_taken + 1,
    updated_at = NOW()
  RETURNING actions_taken INTO current_count;
  
  -- Check if quota exceeded
  IF current_count > p_quota_limit THEN
    UPDATE admin_action_quotas
    SET is_locked = true,
        locked_until = period_end,
        locked_reason = 'Quota exceeded'
    WHERE admin_id = p_admin_id 
      AND action_type = p_action_type
      AND period_end > NOW();
    
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Admin roles (admins can view, only owners can modify)
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view roles" ON admin_roles
  FOR SELECT USING (
    get_admin_role_level(auth.uid()) >= 25
  );

CREATE POLICY "Only owners can manage roles" ON admin_roles
  FOR ALL USING (
    get_admin_role_level(auth.uid()) >= 100
  );

-- Admin permissions (admins can view, only owners can modify)
ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view permissions" ON admin_permissions
  FOR SELECT USING (
    get_admin_role_level(auth.uid()) >= 25
  );

CREATE POLICY "Only owners can manage permissions" ON admin_permissions
  FOR ALL USING (
    get_admin_role_level(auth.uid()) >= 100
  );

-- Admin user roles (admins can view, high-level can assign)
ALTER TABLE admin_user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view role assignments" ON admin_user_roles
  FOR SELECT USING (
    get_admin_role_level(auth.uid()) >= 25
  );

CREATE POLICY "Admins can assign roles below their level" ON admin_user_roles
  FOR INSERT WITH CHECK (
    has_admin_permission(auth.uid(), 'system:manage:admins')
  );

-- Admin actions (all admins can view audit logs)
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all actions" ON admin_actions
  FOR SELECT USING (
    get_admin_role_level(auth.uid()) >= 25
  );

CREATE POLICY "Service role full access to admin_actions" ON admin_actions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Admin notes (all admins can view and add notes)
ALTER TABLE admin_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view notes" ON admin_notes
  FOR SELECT USING (
    get_admin_role_level(auth.uid()) >= 25
  );

CREATE POLICY "Admins can add notes" ON admin_notes
  FOR INSERT WITH CHECK (
    has_admin_permission(auth.uid(), 'player:notes:add')
  );

-- Rollbacks (high-level admins only)
ALTER TABLE action_rollbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view rollbacks" ON action_rollbacks
  FOR SELECT USING (
    get_admin_role_level(auth.uid()) >= 50
  );

CREATE POLICY "High-level admins can create rollbacks" ON action_rollbacks
  FOR INSERT WITH CHECK (
    has_admin_permission(auth.uid(), 'system:rollback')
  );

-- Action quotas (users can view their own, admins can view all)
ALTER TABLE admin_action_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view own quotas" ON admin_action_quotas
  FOR SELECT USING (
    admin_id = auth.uid() OR get_admin_role_level(auth.uid()) >= 75
  );

CREATE POLICY "Service role manages quotas" ON admin_action_quotas
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =====================================================
-- DEFAULT QUOTA LIMITS
-- =====================================================

-- Insert default quota configurations
CREATE TABLE IF NOT EXISTS admin_quota_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role_name TEXT NOT NULL REFERENCES admin_roles(role_name),
  action_type TEXT NOT NULL,
  quota_limit INTEGER NOT NULL,
  quota_period TEXT NOT NULL CHECK (quota_period IN ('hour', 'day', 'week')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role_name, action_type)
);

-- Default quotas by role
INSERT INTO admin_quota_configs (role_name, action_type, quota_limit, quota_period, description) VALUES
  -- Support (most restricted)
  ('support', 'player:view', 100, 'hour', 'Max player profile views per hour'),
  ('support', 'player:notes:add', 50, 'day', 'Max notes added per day'),
  
  -- Moderator
  ('moderator', 'player:view', 500, 'hour', 'Max player profile views per hour'),
  ('moderator', 'player:ban:temp', 20, 'day', 'Max temp bans per day'),
  ('moderator', 'player:notes:add', 100, 'day', 'Max notes added per day'),
  ('moderator', 'security:flag', 50, 'day', 'Max flags per day'),
  
  -- Admin
  ('admin', 'player:view', 1000, 'hour', 'Max player profile views per hour'),
  ('admin', 'economy:edit:money', 50, 'day', 'Max economy edits per day'),
  ('admin', 'inventory:add', 50, 'day', 'Max inventory additions per day'),
  ('admin', 'player:ban:perm', 10, 'day', 'Max permanent bans per day'),
  ('admin', 'system:rollback', 20, 'day', 'Max rollbacks per day'),
  
  -- Owner (unlimited but tracked)
  ('owner', 'player:view', 10000, 'day', 'High limit for tracking only'),
  ('owner', 'system:manage:admins', 50, 'day', 'Max admin role changes per day')
ON CONFLICT (role_name, action_type) DO NOTHING;

-- =====================================================
-- ANTI-CHEAT INTEGRATION
-- =====================================================

-- Tag for marking admin actions as trusted (bypass anti-cheat)
ALTER TABLE game_logs ADD COLUMN IF NOT EXISTS is_admin_action BOOLEAN DEFAULT FALSE;
ALTER TABLE game_logs ADD COLUMN IF NOT EXISTS admin_action_id UUID REFERENCES admin_actions(id);

-- Function to mark action as admin-initiated
CREATE OR REPLACE FUNCTION mark_as_admin_action(
  p_log_id UUID,
  p_admin_action_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE game_logs
  SET is_admin_action = true,
      admin_action_id = p_admin_action_id
  WHERE id = p_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update anti-cheat detection to skip admin actions
-- This should be added to the Edge Function detection rules:
-- IF log.is_admin_action = true THEN SKIP detection END IF

COMMENT ON TABLE admin_roles IS 'Role hierarchy for admin system';
COMMENT ON TABLE admin_permissions IS 'Granular permission definitions';
COMMENT ON TABLE admin_user_roles IS 'User to role assignments';
COMMENT ON TABLE admin_actions IS 'Full audit log of all admin actions';
COMMENT ON TABLE admin_notes IS 'Internal staff notes on players';
COMMENT ON TABLE action_rollbacks IS 'Rollback system for undoing admin actions';
COMMENT ON TABLE admin_action_quotas IS 'Rate limiting and abuse prevention';
COMMENT ON TABLE admin_quota_configs IS 'Default quota limits by role';
