-- FIX: Add missing columns to admin tables if they don't exist
-- Run this if you get "column does not exist" errors

-- Fix admin_action_quotas table
DO $$ 
BEGIN
  -- Add admin_id column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_action_quotas' AND column_name = 'admin_id'
  ) THEN
    ALTER TABLE admin_action_quotas ADD COLUMN admin_id UUID NOT NULL REFERENCES auth.users(id);
  END IF;
  
  -- Add action_type column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_action_quotas' AND column_name = 'action_type'
  ) THEN
    ALTER TABLE admin_action_quotas ADD COLUMN action_type TEXT NOT NULL;
  END IF;
  
  -- Add other required columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_action_quotas' AND column_name = 'actions_taken'
  ) THEN
    ALTER TABLE admin_action_quotas ADD COLUMN actions_taken INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_action_quotas' AND column_name = 'quota_limit'
  ) THEN
    ALTER TABLE admin_action_quotas ADD COLUMN quota_limit INTEGER NOT NULL DEFAULT 100;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_action_quotas' AND column_name = 'quota_period'
  ) THEN
    ALTER TABLE admin_action_quotas ADD COLUMN quota_period TEXT NOT NULL DEFAULT 'day' CHECK (quota_period IN ('hour', 'day', 'week'));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_action_quotas' AND column_name = 'period_start'
  ) THEN
    ALTER TABLE admin_action_quotas ADD COLUMN period_start TIMESTAMPTZ DEFAULT NOW();
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_action_quotas' AND column_name = 'period_end'
  ) THEN
    ALTER TABLE admin_action_quotas ADD COLUMN period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 day');
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_action_quotas' AND column_name = 'is_locked'
  ) THEN
    ALTER TABLE admin_action_quotas ADD COLUMN is_locked BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_action_quotas' AND column_name = 'locked_until'
  ) THEN
    ALTER TABLE admin_action_quotas ADD COLUMN locked_until TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_action_quotas' AND column_name = 'locked_reason'
  ) THEN
    ALTER TABLE admin_action_quotas ADD COLUMN locked_reason TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_action_quotas' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE admin_action_quotas ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_action_quotas' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE admin_action_quotas ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_quotas_admin ON admin_action_quotas(admin_id, action_type, period_end);

-- Create unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'admin_action_quotas_admin_id_action_type_period_start_key'
  ) THEN
    ALTER TABLE admin_action_quotas ADD CONSTRAINT admin_action_quotas_admin_id_action_type_period_start_key UNIQUE(admin_id, action_type, period_start);
  END IF;
END $$;

-- Drop and recreate RLS policies (in case they reference wrong columns)
DROP POLICY IF EXISTS "Admins can view own quotas" ON admin_action_quotas;
DROP POLICY IF EXISTS "Service role manages quotas" ON admin_action_quotas;

ALTER TABLE admin_action_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view own quotas" ON admin_action_quotas
  FOR SELECT USING (
    admin_id = auth.uid() OR get_admin_role_level(auth.uid()) >= 75
  );

CREATE POLICY "Service role manages quotas" ON admin_action_quotas
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Verify the fix
DO $$
DECLARE
  missing_cols TEXT[];
BEGIN
  SELECT array_agg(col) INTO missing_cols
  FROM (VALUES 
    ('admin_id'), ('action_type'), ('actions_taken'), 
    ('quota_limit'), ('quota_period'), ('period_start'), ('period_end')
  ) AS required(col)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_action_quotas' AND column_name = required.col
  );
  
  IF missing_cols IS NOT NULL THEN
    RAISE EXCEPTION 'Still missing columns in admin_action_quotas: %', missing_cols;
  ELSE
    RAISE NOTICE '✅ All required columns exist in admin_action_quotas';
  END IF;
END $$;
