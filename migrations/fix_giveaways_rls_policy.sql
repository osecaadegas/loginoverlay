-- ============================================================
-- Fix Giveaways RLS Policy
-- ============================================================
-- Issue: Current policy only shows active giveaways
-- Fix: Allow viewing recently ended giveaways (last 7 days) with winners
-- ============================================================

-- Drop existing policy
DROP POLICY IF EXISTS "Anyone can view active giveaways" ON giveaways;

-- Create new policy that allows viewing:
-- 1. Active giveaways
-- 2. Recently ended giveaways (last 7 days) that have winners drawn
CREATE POLICY "Anyone can view active or recent giveaways"
    ON giveaways FOR SELECT
    USING (
        is_active = true 
        OR 
        (
            winners_drawn = true 
            AND ends_at >= NOW() - INTERVAL '7 days'
        )
    );

-- ============================================================
-- Verification Query
-- ============================================================
-- Run this to verify the fix:
-- SELECT 
--   id,
--   title,
--   is_active,
--   winners_drawn,
--   ends_at,
--   CASE 
--     WHEN is_active THEN 'Active'
--     WHEN winners_drawn AND ends_at >= NOW() - INTERVAL '7 days' THEN 'Recent Winner'
--     ELSE 'Hidden'
--   END as visibility_status
-- FROM giveaways
-- ORDER BY created_at DESC;
