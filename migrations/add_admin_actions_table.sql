-- Admin Actions Table - Complete audit trail of admin activities
CREATE TABLE IF NOT EXISTS admin_actions (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  admin_user_id INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE RESTRICT,
  
  -- Action details
  action_type VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id INTEGER,
  
  -- Changes made
  changes JSONB NOT NULL,
  reason TEXT,
  
  -- Context
  ip_address INET,
  user_agent TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_user_id ON admin_actions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_timestamp ON admin_actions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_admin_actions_action_type ON admin_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target ON admin_actions(target_type, target_id) WHERE target_type IS NOT NULL;

-- Comments
COMMENT ON TABLE admin_actions IS 'Immutable audit log of all admin panel actions';
COMMENT ON COLUMN admin_actions.action_type IS 'Type of action: ban_player, adjust_money, modify_item, create_crime, etc.';
COMMENT ON COLUMN admin_actions.changes IS 'JSON object containing what was changed (before/after values)';

-- Prevent deletion of audit logs
CREATE OR REPLACE FUNCTION prevent_admin_action_deletion()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Deletion of audit logs is not permitted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_admin_action_deletion
  BEFORE DELETE ON admin_actions
  FOR EACH ROW
  EXECUTE FUNCTION prevent_admin_action_deletion();
