-- Fix the_life_items RLS policies to allow admin panel to load items
-- Run this in Supabase SQL Editor

-- First, drop any conflicting policies
DROP POLICY IF EXISTS "Public can view TheLife items" ON the_life_items;
DROP POLICY IF EXISTS "Authenticated can view TheLife items" ON the_life_items;
DROP POLICY IF EXISTS "Anyone can view items" ON the_life_items;
DROP POLICY IF EXISTS "Anyone can view TheLife items" ON the_life_items;
DROP POLICY IF EXISTS "Users can view items" ON the_life_items;

-- Enable RLS if not already enabled
ALTER TABLE the_life_items ENABLE ROW LEVEL SECURITY;

-- Create a simple policy that allows ALL authenticated users to SELECT items
-- This is needed for the admin panel item dropdown
CREATE POLICY "Allow all authenticated to view items"
  ON the_life_items
  FOR SELECT
  TO authenticated
  USING (true);

-- Ensure admins can still manage items
DROP POLICY IF EXISTS "Admins can manage TheLife items" ON the_life_items;
CREATE POLICY "Admins can manage items"
  ON the_life_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'moderator')
    )
  );

-- Verify items exist in the table
SELECT COUNT(*) as item_count FROM the_life_items;
