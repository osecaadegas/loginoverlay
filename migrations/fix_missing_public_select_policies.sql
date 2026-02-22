-- =====================================================
-- Fix Missing Public SELECT Policies
-- =====================================================
-- The optimize_rls_policies.sql migration only handled admin/auth-based
-- policies and may have left public SELECT policies orphaned or missing.
-- This ensures all game reference tables are readable by regular players.
-- 
-- Safe to run: Uses DROP IF EXISTS + CREATE, so it's idempotent.
-- Generated: 2026-02-22

-- =====================================================
-- the_life_businesses - Players need to see available businesses
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view businesses" ON public.the_life_businesses;
DROP POLICY IF EXISTS "Anyone can view active businesses" ON public.the_life_businesses;
DROP POLICY IF EXISTS "Public can view businesses" ON public.the_life_businesses;
CREATE POLICY "Anyone can view businesses" ON public.the_life_businesses
    FOR SELECT
    USING (true);

-- =====================================================
-- the_life_brothel_workers - Players need to see available workers
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view workers" ON public.the_life_brothel_workers;
DROP POLICY IF EXISTS "Anyone can view brothel workers" ON public.the_life_brothel_workers;
DROP POLICY IF EXISTS "Public can view workers" ON public.the_life_brothel_workers;
CREATE POLICY "Anyone can view brothel workers" ON public.the_life_brothel_workers
    FOR SELECT
    USING (true);

-- =====================================================
-- the_life_items - Players need to see item details (inventory, equipment, store)
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view items" ON public.the_life_items;
DROP POLICY IF EXISTS "Anyone can view TheLife items" ON public.the_life_items;
DROP POLICY IF EXISTS "Public can view TheLife items" ON public.the_life_items;
DROP POLICY IF EXISTS "Authenticated can view TheLife items" ON public.the_life_items;
DROP POLICY IF EXISTS "Allow all authenticated to view items" ON public.the_life_items;
CREATE POLICY "Anyone can view TheLife items" ON public.the_life_items
    FOR SELECT
    USING (true);

-- =====================================================
-- the_life_robberies - Players need to see available crimes
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view robberies" ON public.the_life_robberies;
DROP POLICY IF EXISTS "Public can view robberies" ON public.the_life_robberies;
CREATE POLICY "Anyone can view robberies" ON public.the_life_robberies
    FOR SELECT
    USING (true);

-- =====================================================
-- the_life_business_required_items - Players need to see business requirements
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view business required items" ON public.the_life_business_required_items;
DROP POLICY IF EXISTS "Public can view business required items" ON public.the_life_business_required_items;
CREATE POLICY "Anyone can view business required items" ON public.the_life_business_required_items
    FOR SELECT
    USING (true);

-- =====================================================
-- the_life_avatars - Players need to see available avatars
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view avatars" ON public.the_life_avatars;
DROP POLICY IF EXISTS "Public can view avatars" ON public.the_life_avatars;
CREATE POLICY "Anyone can view avatars" ON public.the_life_avatars
    FOR SELECT
    USING (true);

-- =====================================================
-- the_life_category_info - Players need to see category descriptions
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view category info" ON public.the_life_category_info;
DROP POLICY IF EXISTS "Public can view category info" ON public.the_life_category_info;
CREATE POLICY "Anyone can view category info" ON public.the_life_category_info
    FOR SELECT
    USING (true);

-- =====================================================
-- Also remove CHECK constraints on skills if they exist
-- (allow higher skill levels - or keep at 100 with clear UI)
-- =====================================================
-- DROP any CHECK constraints that cap power/intelligence/defense at 100
-- so the upgrade system works cleanly
ALTER TABLE the_life_players DROP CONSTRAINT IF EXISTS the_life_players_power_check;
ALTER TABLE the_life_players DROP CONSTRAINT IF EXISTS the_life_players_intelligence_check;
ALTER TABLE the_life_players DROP CONSTRAINT IF EXISTS the_life_players_defense_check;

-- Re-add with higher cap (1000) to prevent exploits while allowing upgrades
ALTER TABLE the_life_players ADD CONSTRAINT the_life_players_power_check CHECK (power >= 0 AND power <= 1000);
ALTER TABLE the_life_players ADD CONSTRAINT the_life_players_intelligence_check CHECK (intelligence >= 0 AND intelligence <= 1000);
ALTER TABLE the_life_players ADD CONSTRAINT the_life_players_defense_check CHECK (defense >= 0 AND defense <= 1000);
