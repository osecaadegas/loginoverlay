-- ============================================================
-- GIVEAWAYS SYSTEM - COMPREHENSIVE STATUS CHECK
-- ============================================================
-- Run this in Supabase SQL Editor to diagnose giveaway issues
-- ============================================================

-- ============================================================
-- 1. CHECK TABLE STRUCTURES
-- ============================================================

-- Giveaways Table Structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'giveaways'
ORDER BY ordinal_position;

-- Giveaway Entries Table Structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'giveaway_entries'
ORDER BY ordinal_position;

-- Giveaway Winners Table Structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'giveaway_winners'
ORDER BY ordinal_position;

-- ============================================================
-- 2. CHECK RLS POLICIES
-- ============================================================

-- All RLS Policies on Giveaways Tables
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
    AND tablename IN ('giveaways', 'giveaway_entries', 'giveaway_winners')
ORDER BY tablename, policyname;

-- Check if RLS is Enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
    AND tablename IN ('giveaways', 'giveaway_entries', 'giveaway_winners');

-- ============================================================
-- 3. CHECK CURRENT DATA
-- ============================================================

-- All Giveaways with Counts
SELECT 
    g.id,
    g.title,
    g.ticket_cost,
    g.max_winners,
    g.is_active,
    g.winners_drawn,
    g.starts_at,
    g.ends_at,
    g.created_at,
    CASE 
        WHEN g.ends_at < NOW() THEN 'EXPIRED'
        WHEN g.is_active THEN 'ACTIVE'
        ELSE 'INACTIVE'
    END as status,
    COUNT(DISTINCT ge.user_id) as total_entries,
    COUNT(DISTINCT gw.user_id) as total_winners,
    SUM(ge.tickets_count) as total_tickets
FROM giveaways g
LEFT JOIN giveaway_entries ge ON ge.giveaway_id = g.id
LEFT JOIN giveaway_winners gw ON gw.giveaway_id = g.id
GROUP BY g.id, g.title, g.ticket_cost, g.max_winners, g.is_active, 
         g.winners_drawn, g.starts_at, g.ends_at, g.created_at
ORDER BY g.created_at DESC;

-- Recent Giveaway Entries (Last 50)
SELECT 
    ge.id,
    ge.entered_at,
    ge.tickets_count,
    ge.total_cost,
    g.title as giveaway_title,
    sc.se_username,
    up.twitch_username
FROM giveaway_entries ge
LEFT JOIN giveaways g ON g.id = ge.giveaway_id
LEFT JOIN streamelements_connections sc ON sc.user_id = ge.user_id
LEFT JOIN user_profiles up ON up.user_id = ge.user_id
ORDER BY ge.entered_at DESC
LIMIT 50;

-- All Winners
SELECT 
    gw.id,
    gw.selected_at,
    gw.notified,
    g.title as giveaway_title,
    sc.se_username,
    up.twitch_username
FROM giveaway_winners gw
LEFT JOIN giveaways g ON g.id = gw.giveaway_id
LEFT JOIN streamelements_connections sc ON sc.user_id = gw.user_id
LEFT JOIN user_profiles up ON up.user_id = gw.user_id
ORDER BY gw.selected_at DESC;

-- ============================================================
-- 4. CHECK INDEXES
-- ============================================================

SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
    AND tablename IN ('giveaways', 'giveaway_entries', 'giveaway_winners')
ORDER BY tablename, indexname;

-- ============================================================
-- 5. CHECK FOREIGN KEYS
-- ============================================================

SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
    AND tc.table_name IN ('giveaways', 'giveaway_entries', 'giveaway_winners');

-- ============================================================
-- 6. TEST VISIBILITY AS CURRENT USER
-- ============================================================

-- What giveaways can YOU see right now?
SELECT 
    id,
    title,
    is_active,
    winners_drawn,
    ends_at,
    CASE 
        WHEN is_active THEN '✅ ACTIVE'
        WHEN winners_drawn AND ends_at >= NOW() - INTERVAL '7 days' THEN '🏆 RECENT WINNER'
        ELSE '❌ HIDDEN'
    END as visibility_for_regular_users,
    CASE 
        WHEN ends_at < NOW() THEN '⏰ EXPIRED'
        ELSE '✓ NOT EXPIRED'
    END as expiry_status
FROM giveaways
ORDER BY created_at DESC;

-- ============================================================
-- 7. CHECK YOUR USER ROLE
-- ============================================================

SELECT 
    ur.role,
    ur.is_active,
    au.email
FROM user_roles ur
JOIN auth.users au ON au.id = ur.user_id
WHERE ur.user_id = auth.uid();

-- ============================================================
-- 8. SUMMARY STATS
-- ============================================================

SELECT 
    'Total Giveaways' as metric,
    COUNT(*) as value
FROM giveaways
UNION ALL
SELECT 
    'Active Giveaways',
    COUNT(*)
FROM giveaways
WHERE is_active = true
UNION ALL
SELECT 
    'Expired Giveaways',
    COUNT(*)
FROM giveaways
WHERE ends_at < NOW()
UNION ALL
SELECT 
    'Giveaways with Winners Drawn',
    COUNT(*)
FROM giveaways
WHERE winners_drawn = true
UNION ALL
SELECT 
    'Total Entries',
    COUNT(*)
FROM giveaway_entries
UNION ALL
SELECT 
    'Total Winners',
    COUNT(*)
FROM giveaway_winners
UNION ALL
SELECT 
    'Unique Participants',
    COUNT(DISTINCT user_id)
FROM giveaway_entries;
