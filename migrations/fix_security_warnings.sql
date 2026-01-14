-- Fix Supabase Security Advisor Warnings
-- This migration enables RLS on tables and fixes security definer views
-- while maintaining all current functionality

-- 1. Enable RLS on user_roles table (currently has policies but RLS not enabled)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2. Fix game_statistics view - Change from SECURITY DEFINER to SECURITY INVOKER
-- First, drop the existing view if it exists
DROP VIEW IF EXISTS public.game_statistics;

-- Recreate the view with SECURITY INVOKER (safer, uses querying user's permissions)
CREATE OR REPLACE VIEW public.game_statistics
WITH (security_invoker = true)
AS
SELECT 
  user_id,
  game_type,
  COUNT(*) as games_played,
  SUM(bet_amount) as total_wagered,
  SUM(result_amount) as net_profit,
  AVG(result_amount) as avg_result,
  MAX(result_amount) as biggest_win,
  MIN(result_amount) as biggest_loss,
  COUNT(CASE WHEN result_amount > 0 THEN 1 END) as wins,
  COUNT(CASE WHEN result_amount < 0 THEN 1 END) as losses,
  COUNT(CASE WHEN result_amount = 0 THEN 1 END) as pushes
FROM game_sessions
GROUP BY user_id, game_type;

-- Grant necessary permissions on the view
GRANT SELECT ON public.game_statistics TO authenticated;
GRANT SELECT ON public.game_statistics TO anon;

-- 3. Create a security definer function to check admin status without RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin_or_superadmin(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = check_user_id
    AND role IN ('admin', 'superadmin')
    AND (access_expires_at IS NULL OR access_expires_at > NOW())
  );
END;
$$;

-- 4. Ensure RLS policies exist and are correct for user_roles
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

-- Create comprehensive RLS policies for user_roles using the security definer function
-- Policy: Users can view their own roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Admins can view all roles (using security definer function to avoid recursion)
CREATE POLICY "Admins can view all roles"
  ON public.user_roles
  FOR SELECT
  USING (public.is_admin_or_superadmin(auth.uid()));

-- Policy: Admins can insert roles
CREATE POLICY "Admins can insert roles"
  ON public.user_roles
  FOR INSERT
  WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- Policy: Admins can update roles
CREATE POLICY "Admins can update roles"
  ON public.user_roles
  FOR UPDATE
  USING (public.is_admin_or_superadmin(auth.uid()));

-- Policy: Admins can delete roles
CREATE POLICY "Admins can delete roles"
  ON public.user_roles
  FOR DELETE
  USING (public.is_admin_or_superadmin(auth.uid()));

-- Add comment for documentation
COMMENT ON TABLE public.user_roles IS 'User roles table with RLS enabled - Fixed security warnings';
COMMENT ON VIEW public.game_statistics IS 'Game statistics view with SECURITY INVOKER - Fixed security warnings';
