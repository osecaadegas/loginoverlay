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
