-- DEBUG: Check your current role status
-- Run this in Supabase SQL editor to see what's happening

-- 1. Check if user_roles table has RLS enabled
SELECT 
  relname as table_name,
  relrowsecurity as rls_enabled
FROM pg_class 
WHERE relname = 'user_roles';

-- 2. Check what policies exist on user_roles
SELECT 
  policyname,
  cmd,
  qual::text as using_clause,
  with_check::text as with_check_clause
FROM pg_policies 
WHERE tablename = 'user_roles';

-- 3. Check your user_id (copy this for step 4)
SELECT auth.uid() as your_user_id;

-- 4. Check if you have any roles in the table
-- Replace YOUR_USER_ID with the result from step 3
SELECT * FROM user_roles WHERE user_id = auth.uid();

-- 5. If step 4 returns nothing, you need to add yourself as admin
-- Replace YOUR_USER_ID with your actual user ID
-- UNCOMMENT AND RUN THIS IF YOU HAVE NO ROLES:
/*
INSERT INTO user_roles (user_id, role, is_active)
VALUES (auth.uid(), 'admin', true)
ON CONFLICT (user_id, role) DO UPDATE SET is_active = true;
*/
