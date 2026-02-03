-- Admin Users Table - Admin panel access control
CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  
  -- Role-based access
  role VARCHAR(50) NOT NULL DEFAULT 'moderator' CHECK (role IN ('super_admin', 'admin', 'moderator', 'security_analyst', 'economy_manager')),
  
  -- Permissions
  can_ban_players BOOLEAN DEFAULT FALSE,
  can_modify_economy BOOLEAN DEFAULT FALSE,
  can_edit_content BOOLEAN DEFAULT FALSE,
  can_view_logs BOOLEAN DEFAULT TRUE,
  can_manage_admins BOOLEAN DEFAULT FALSE,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  last_login_ip INET,
  
  -- Security
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_secret VARCHAR(255),
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(is_active) WHERE is_active = TRUE;

-- Comments
COMMENT ON TABLE admin_users IS 'Admin panel user accounts with role-based access control';
COMMENT ON COLUMN admin_users.role IS 'super_admin: full access, admin: most access, moderator: player management, security_analyst: view only, economy_manager: content editing';
COMMENT ON COLUMN admin_users.locked_until IS 'Account locked until this timestamp after too many failed login attempts';

-- Insert default super admin (password: changeme123 - MUST BE CHANGED!)
-- Password hash for 'changeme123' using bcrypt
INSERT INTO admin_users (username, email, password_hash, role, can_ban_players, can_modify_economy, can_edit_content, can_view_logs, can_manage_admins)
VALUES ('superadmin', 'admin@thelife.game', '$2b$10$rKZWvV5YqFqV5YqFqV5YqO7KZWvV5YqFqV5YqFqV5YqFqV5YqFqVq', 'super_admin', TRUE, TRUE, TRUE, TRUE, TRUE)
ON CONFLICT (username) DO NOTHING;
