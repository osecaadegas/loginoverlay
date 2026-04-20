-- ============================================================
-- FIX GIVEAWAYS RLS + ACTIVATE EXISTING GIVEAWAY
-- ============================================================
-- Run this to fix the visibility issue and activate your giveaway
-- ============================================================

-- STEP 1: Fix the RLS policy to allow admins to see ALL giveaways
-- ============================================================

DROP POLICY IF EXISTS "Anyone can view active or recent giveaways" ON giveaways;

CREATE POLICY "Anyone can view active or recent giveaways"
ON giveaways FOR SELECT
USING (
  -- Admins and moderators can see ALL giveaways (active, inactive, old, etc.)
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
      AND role IN ('admin', 'moderator') 
      AND is_active = true
  )
  -- Regular users can only see active giveaways or recently ended ones with winners
  OR is_active = true 
  OR (winners_drawn = true AND ends_at >= NOW() - INTERVAL '7 days')
);

-- ============================================================
-- STEP 2: Activate the existing giveaway
-- ============================================================

-- Update the giveaway to make it active
UPDATE giveaways
SET is_active = true
WHERE is_active = false;

-- ============================================================
-- STEP 3: Verify the fix worked
-- ============================================================

-- Check your role
SELECT 
    'YOUR ROLE' as info,
    ur.role,
    ur.is_active as role_active,
    au.email
FROM user_roles ur
JOIN auth.users au ON au.id = ur.user_id
WHERE ur.user_id = auth.uid();

-- Check giveaway status
SELECT 
    'GIVEAWAY STATUS' as info,
    id,
    title,
    is_active,
    winners_drawn,
    starts_at,
    ends_at,
    created_at,
    CASE 
        WHEN is_active THEN '✅ NOW VISIBLE TO EVERYONE'
        ELSE '❌ STILL HIDDEN'
    END as visibility_status
FROM giveaways
ORDER BY created_at DESC;

-- Summary
SELECT 
    COUNT(*) FILTER (WHERE is_active = true) as active_giveaways,
    COUNT(*) FILTER (WHERE is_active = false) as inactive_giveaways,
    COUNT(*) as total_giveaways
FROM giveaways;
