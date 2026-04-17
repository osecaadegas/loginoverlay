-- ═══════════════════════════════════════════════════════════════════
-- CLEANUP: Remove bad/duplicate giveaway policies from external SQL
-- Run this in Supabase SQL Editor AFTER fix_giveaway_tables.sql
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. DROP INSECURE POLICIES ON giveaways ─────────────────────────
-- These have no admin checks — anyone could insert/update/delete!
DROP POLICY IF EXISTS "Admin delete giveaways" ON giveaways;
DROP POLICY IF EXISTS "Admin insert giveaways" ON giveaways;
DROP POLICY IF EXISTS "Admin update giveaways" ON giveaways;
-- This lets anyone read ALL giveaways (even inactive ones) — we now want this, drop the old restrictive name
DROP POLICY IF EXISTS "Public read giveaways" ON giveaways;
-- Also drop the old admin-only policy name if it still exists
DROP POLICY IF EXISTS "Anyone can view active giveaways" ON giveaways;
DROP POLICY IF EXISTS "Admins can manage giveaways" ON giveaways;
DROP POLICY IF EXISTS "Admins can manage winners" ON giveaway_winners;

-- ─── 2. DROP DUPLICATE/INSECURE POLICIES ON giveaway_winners ────────
-- No admin check on insert — anyone could add fake winners!
DROP POLICY IF EXISTS "Admin insert giveaway winners" ON giveaway_winners;
-- Duplicate of "Anyone can view winners" which we already have
DROP POLICY IF EXISTS "Public read giveaway winners" ON giveaway_winners;

-- ─── 3. DROP giveaway_participants TABLE ────────────────────────────
-- This table is NOT used by any code in the project.
-- It was created by the external SQL from another website.
DROP POLICY IF EXISTS "Insert giveaway participants" ON giveaway_participants;
DROP POLICY IF EXISTS "Public read giveaway participants" ON giveaway_participants;
DROP POLICY IF EXISTS "Update giveaway participants" ON giveaway_participants;
DROP TABLE IF EXISTS giveaway_participants;

-- ─── 4. VERIFY: Check what policies remain ──────────────────────────
-- After running this, you should see ONLY these policies:

SELECT tablename, policyname, cmd
FROM pg_policies 
WHERE tablename LIKE '%giveaway%'
ORDER BY tablename, policyname;

-- Expected clean result (11 policies):
--
-- ext_giveaway_entries  | Anyone reads ga entries              | SELECT
-- ext_giveaway_entries  | Service inserts ga entries           | INSERT
-- ext_giveaway_winners  | Anyone reads ga winners              | SELECT
-- ext_giveaway_winners  | Broadcaster manages ga winners       | ALL
-- ext_giveaways         | Anyone reads ext giveaways           | SELECT
-- ext_giveaways         | Broadcaster manages ext giveaways    | ALL
-- giveaway_entries      | Users can create their own entries   | INSERT
-- giveaway_entries      | Users can update their own entries   | UPDATE
-- giveaway_entries      | Users can view all entries           | SELECT
-- giveaway_winners      | Admins and premium can manage winners | ALL
-- giveaway_winners      | Anyone can view winners              | SELECT
-- giveaways             | Admins and premium can manage giveaways | ALL
-- giveaways             | Anyone can view giveaways            | SELECT
-- user_giveaways        | Users can delete their own giveaways | DELETE
-- user_giveaways        | Users can insert their own giveaways | INSERT
-- user_giveaways        | Users can update their own giveaways | UPDATE
-- user_giveaways        | Users can view their own giveaways   | SELECT
