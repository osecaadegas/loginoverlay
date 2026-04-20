-- ============================================================
-- Fix Giveaways RLS Policy
-- ============================================================
-- Issue: Current policy only shows active giveaways
-- Fix: Allow viewing recently ended giveaways (last 7 days) with winners
-- ============================================================

-- Drop existing policy
DROP POLICY IF EXISTS "Anyone can view active giveaways" ON giveaways;

-- Create new policy that allows viewing:
-- 1. Admins/Moderators can see ALL giveaways (for creator panel)
-- 2. Regular users can see active giveaways
-- 3. Regular users can see recently ended giveaways (last 7 days) with winners
CREATE POLICY "Anyone can view active or recent giveaways"
    ON giveaways FOR SELECT
    USING (
        -- Admins and moderators can see everything
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'moderator')
            AND is_active = true
        )
        OR
        -- Regular users can see active giveaways
        is_active = true 
        OR 
        -- Regular users can see recently ended giveaways with winners
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
