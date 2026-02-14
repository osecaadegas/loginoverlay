-- COMPLETE RESET: Drop and recreate admin_action_quotas table
-- ⚠️ WARNING: This will delete all quota data! Use only if fix script doesn't work.

-- Drop all dependent objects first
DROP POLICY IF EXISTS "Admins can view own quotas" ON admin_action_quotas;
DROP POLICY IF EXISTS "Service role manages quotas" ON admin_action_quotas;
DROP INDEX IF EXISTS idx_quotas_admin;
DROP FUNCTION IF EXISTS increment_action_quota(UUID, TEXT, INTEGER, TEXT);

-- Drop and recreate table
DROP TABLE IF EXISTS admin_action_quotas CASCADE;

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

CREATE INDEX idx_quotas_admin ON admin_action_quotas(admin_id, action_type, period_end);

-- RLS Policies
ALTER TABLE admin_action_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view own quotas" ON admin_action_quotas
  FOR SELECT USING (
    admin_id = auth.uid() OR get_admin_role_level(auth.uid()) >= 75
  );

CREATE POLICY "Service role manages quotas" ON admin_action_quotas
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Recreate increment function
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

-- Verify
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'admin_action_quotas'
ORDER BY ordinal_position;

RAISE NOTICE '✅ admin_action_quotas table recreated successfully';
