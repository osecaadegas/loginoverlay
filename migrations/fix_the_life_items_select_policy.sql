-- Fix RLS policies for the_life_items table
-- The issue: Only admin policy exists with FOR ALL, which blocks regular reads
-- Solution: Add a separate SELECT policy for public reads

-- First, drop any existing select policies to avoid conflicts
DROP POLICY IF EXISTS "Public can view TheLife items" ON public.the_life_items;
DROP POLICY IF EXISTS "Authenticated can view TheLife items" ON public.the_life_items;
DROP POLICY IF EXISTS "Anyone can view TheLife items" ON public.the_life_items;

-- Create SELECT policy that allows anyone to view items (item definitions are public)
CREATE POLICY "Anyone can view TheLife items" ON public.the_life_items
    FOR SELECT
    USING (true);

-- The existing admin policy "Admins can manage TheLife items" handles INSERT, UPDATE, DELETE
-- So we don't need to touch it
