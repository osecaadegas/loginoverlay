-- ═══════════════════════════════════════════════════════════════════
-- FIX GIVEAWAY TABLES - Full Restore
-- Run this in Supabase SQL Editor to repair all giveaway tables
-- Safe to run multiple times (uses IF NOT EXISTS / DROP IF EXISTS)
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. PUBLIC GIVEAWAY SYSTEM ──────────────────────────────────────

-- 1a. Ensure the giveaways table exists with all required columns
CREATE TABLE IF NOT EXISTS giveaways (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    ticket_cost INTEGER DEFAULT 0,
    allow_multiple_tickets BOOLEAN DEFAULT false,
    max_winners INTEGER DEFAULT 1,
    starts_at TIMESTAMPTZ DEFAULT NOW(),
    ends_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 day'),
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    winners_drawn BOOLEAN DEFAULT false,
    drawn_at TIMESTAMPTZ
);

-- Add any missing columns (safe if they already exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'giveaways' AND column_name = 'title') THEN
        ALTER TABLE giveaways ADD COLUMN title TEXT NOT NULL DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'giveaways' AND column_name = 'description') THEN
        ALTER TABLE giveaways ADD COLUMN description TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'giveaways' AND column_name = 'image_url') THEN
        ALTER TABLE giveaways ADD COLUMN image_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'giveaways' AND column_name = 'ticket_cost') THEN
        ALTER TABLE giveaways ADD COLUMN ticket_cost INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'giveaways' AND column_name = 'allow_multiple_tickets') THEN
        ALTER TABLE giveaways ADD COLUMN allow_multiple_tickets BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'giveaways' AND column_name = 'max_winners') THEN
        ALTER TABLE giveaways ADD COLUMN max_winners INTEGER DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'giveaways' AND column_name = 'starts_at') THEN
        ALTER TABLE giveaways ADD COLUMN starts_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'giveaways' AND column_name = 'ends_at') THEN
        ALTER TABLE giveaways ADD COLUMN ends_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 day');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'giveaways' AND column_name = 'is_active') THEN
        ALTER TABLE giveaways ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'giveaways' AND column_name = 'created_by') THEN
        ALTER TABLE giveaways ADD COLUMN created_by UUID REFERENCES auth.users(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'giveaways' AND column_name = 'created_at') THEN
        ALTER TABLE giveaways ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'giveaways' AND column_name = 'winners_drawn') THEN
        ALTER TABLE giveaways ADD COLUMN winners_drawn BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'giveaways' AND column_name = 'drawn_at') THEN
        ALTER TABLE giveaways ADD COLUMN drawn_at TIMESTAMPTZ;
    END IF;
END $$;

-- 1b. Ensure giveaway_entries table
CREATE TABLE IF NOT EXISTS giveaway_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    giveaway_id UUID REFERENCES giveaways(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    tickets_count INTEGER DEFAULT 1,
    total_cost INTEGER DEFAULT 0,
    entered_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(giveaway_id, user_id)
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'giveaway_entries' AND column_name = 'giveaway_id') THEN
        ALTER TABLE giveaway_entries ADD COLUMN giveaway_id UUID REFERENCES giveaways(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'giveaway_entries' AND column_name = 'user_id') THEN
        ALTER TABLE giveaway_entries ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'giveaway_entries' AND column_name = 'tickets_count') THEN
        ALTER TABLE giveaway_entries ADD COLUMN tickets_count INTEGER DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'giveaway_entries' AND column_name = 'total_cost') THEN
        ALTER TABLE giveaway_entries ADD COLUMN total_cost INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'giveaway_entries' AND column_name = 'entered_at') THEN
        ALTER TABLE giveaway_entries ADD COLUMN entered_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 1c. Ensure giveaway_winners table
CREATE TABLE IF NOT EXISTS giveaway_winners (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    giveaway_id UUID REFERENCES giveaways(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    selected_at TIMESTAMPTZ DEFAULT NOW(),
    notified BOOLEAN DEFAULT false
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'giveaway_winners' AND column_name = 'giveaway_id') THEN
        ALTER TABLE giveaway_winners ADD COLUMN giveaway_id UUID REFERENCES giveaways(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'giveaway_winners' AND column_name = 'user_id') THEN
        ALTER TABLE giveaway_winners ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'giveaway_winners' AND column_name = 'selected_at') THEN
        ALTER TABLE giveaway_winners ADD COLUMN selected_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'giveaway_winners' AND column_name = 'notified') THEN
        ALTER TABLE giveaway_winners ADD COLUMN notified BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 1d. Enable RLS on public giveaway tables
ALTER TABLE giveaways ENABLE ROW LEVEL SECURITY;
ALTER TABLE giveaway_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE giveaway_winners ENABLE ROW LEVEL SECURITY;

-- 1e. Recreate RLS policies (drop first to avoid duplicates)
DROP POLICY IF EXISTS "Anyone can view active giveaways" ON giveaways;
DROP POLICY IF EXISTS "Admins can manage giveaways" ON giveaways;
DROP POLICY IF EXISTS "Users can view all entries" ON giveaway_entries;
DROP POLICY IF EXISTS "Users can create their own entries" ON giveaway_entries;
DROP POLICY IF EXISTS "Users can update their own entries" ON giveaway_entries;
DROP POLICY IF EXISTS "Anyone can view winners" ON giveaway_winners;
DROP POLICY IF EXISTS "Admins can manage winners" ON giveaway_winners;

CREATE POLICY "Anyone can view active giveaways"
    ON giveaways FOR SELECT
    USING (is_active = true);

CREATE POLICY "Admins can manage giveaways"
    ON giveaways FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
            AND is_active = true
        )
    );

CREATE POLICY "Users can view all entries"
    ON giveaway_entries FOR SELECT
    USING (true);

CREATE POLICY "Users can create their own entries"
    ON giveaway_entries FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own entries"
    ON giveaway_entries FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view winners"
    ON giveaway_winners FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage winners"
    ON giveaway_winners FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
            AND is_active = true
        )
    );

-- 1f. Recreate indexes (safe with IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_giveaways_active ON giveaways(is_active, ends_at);
CREATE INDEX IF NOT EXISTS idx_giveaway_entries_giveaway ON giveaway_entries(giveaway_id);
CREATE INDEX IF NOT EXISTS idx_giveaway_entries_user ON giveaway_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_giveaway_winners_giveaway ON giveaway_winners(giveaway_id);


-- ─── 2. USER GIVEAWAY SYSTEM (Overlay Panel) ───────────────────────

-- 2a. Ensure user_giveaways table
CREATE TABLE IF NOT EXISTS user_giveaways (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    giveaway_active BOOLEAN DEFAULT false,
    giveaway_type VARCHAR(50),
    giveaway_title VARCHAR(255),
    giveaway_prize VARCHAR(255),
    giveaway_entries JSONB DEFAULT '[]'::jsonb,
    giveaway_winner JSONB,
    giveaway_timer INTEGER,
    giveaway_entry_command VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_giveaways' AND column_name = 'giveaway_active') THEN
        ALTER TABLE user_giveaways ADD COLUMN giveaway_active BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_giveaways' AND column_name = 'giveaway_type') THEN
        ALTER TABLE user_giveaways ADD COLUMN giveaway_type VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_giveaways' AND column_name = 'giveaway_title') THEN
        ALTER TABLE user_giveaways ADD COLUMN giveaway_title VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_giveaways' AND column_name = 'giveaway_prize') THEN
        ALTER TABLE user_giveaways ADD COLUMN giveaway_prize VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_giveaways' AND column_name = 'giveaway_entries') THEN
        ALTER TABLE user_giveaways ADD COLUMN giveaway_entries JSONB DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_giveaways' AND column_name = 'giveaway_winner') THEN
        ALTER TABLE user_giveaways ADD COLUMN giveaway_winner JSONB;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_giveaways' AND column_name = 'giveaway_timer') THEN
        ALTER TABLE user_giveaways ADD COLUMN giveaway_timer INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_giveaways' AND column_name = 'giveaway_entry_command') THEN
        ALTER TABLE user_giveaways ADD COLUMN giveaway_entry_command VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_giveaways' AND column_name = 'updated_at') THEN
        ALTER TABLE user_giveaways ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 2b. Enable RLS
ALTER TABLE user_giveaways ENABLE ROW LEVEL SECURITY;

-- 2c. Recreate RLS policies
DROP POLICY IF EXISTS "Users can view their own giveaways" ON user_giveaways;
DROP POLICY IF EXISTS "Users can insert their own giveaways" ON user_giveaways;
DROP POLICY IF EXISTS "Users can update their own giveaways" ON user_giveaways;
DROP POLICY IF EXISTS "Users can delete their own giveaways" ON user_giveaways;

CREATE POLICY "Users can view their own giveaways"
    ON user_giveaways FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own giveaways"
    ON user_giveaways FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own giveaways"
    ON user_giveaways FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own giveaways"
    ON user_giveaways FOR DELETE
    USING (auth.uid() = user_id);


-- ─── 3. EXTENSION GIVEAWAY SYSTEM (Twitch) ─────────────────────────

-- 3a. Ensure ext_giveaways table
CREATE TABLE IF NOT EXISTS ext_giveaways (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    broadcaster_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    prize TEXT NOT NULL DEFAULT '',
    description TEXT,
    image_url TEXT,
    ticket_cost INTEGER NOT NULL DEFAULT 0,
    max_tickets_per_user INTEGER NOT NULL DEFAULT 1,
    max_winners INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'closed', 'drawing', 'completed')),
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    drawn_at TIMESTAMPTZ
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ext_giveaways' AND column_name = 'broadcaster_id') THEN
        ALTER TABLE ext_giveaways ADD COLUMN broadcaster_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ext_giveaways' AND column_name = 'title') THEN
        ALTER TABLE ext_giveaways ADD COLUMN title TEXT NOT NULL DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ext_giveaways' AND column_name = 'prize') THEN
        ALTER TABLE ext_giveaways ADD COLUMN prize TEXT NOT NULL DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ext_giveaways' AND column_name = 'description') THEN
        ALTER TABLE ext_giveaways ADD COLUMN description TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ext_giveaways' AND column_name = 'image_url') THEN
        ALTER TABLE ext_giveaways ADD COLUMN image_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ext_giveaways' AND column_name = 'ticket_cost') THEN
        ALTER TABLE ext_giveaways ADD COLUMN ticket_cost INTEGER NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ext_giveaways' AND column_name = 'max_tickets_per_user') THEN
        ALTER TABLE ext_giveaways ADD COLUMN max_tickets_per_user INTEGER NOT NULL DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ext_giveaways' AND column_name = 'max_winners') THEN
        ALTER TABLE ext_giveaways ADD COLUMN max_winners INTEGER NOT NULL DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ext_giveaways' AND column_name = 'status') THEN
        ALTER TABLE ext_giveaways ADD COLUMN status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'drawing', 'completed'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ext_giveaways' AND column_name = 'ends_at') THEN
        ALTER TABLE ext_giveaways ADD COLUMN ends_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ext_giveaways' AND column_name = 'drawn_at') THEN
        ALTER TABLE ext_giveaways ADD COLUMN drawn_at TIMESTAMPTZ;
    END IF;
END $$;

-- 3b. Ensure ext_giveaway_entries table
CREATE TABLE IF NOT EXISTS ext_giveaway_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    giveaway_id UUID NOT NULL REFERENCES ext_giveaways(id) ON DELETE CASCADE,
    twitch_user_id TEXT NOT NULL,
    twitch_display_name TEXT NOT NULL DEFAULT '',
    tickets INTEGER NOT NULL DEFAULT 1,
    entered_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(giveaway_id, twitch_user_id)
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ext_giveaway_entries' AND column_name = 'giveaway_id') THEN
        ALTER TABLE ext_giveaway_entries ADD COLUMN giveaway_id UUID NOT NULL REFERENCES ext_giveaways(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ext_giveaway_entries' AND column_name = 'twitch_user_id') THEN
        ALTER TABLE ext_giveaway_entries ADD COLUMN twitch_user_id TEXT NOT NULL DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ext_giveaway_entries' AND column_name = 'twitch_display_name') THEN
        ALTER TABLE ext_giveaway_entries ADD COLUMN twitch_display_name TEXT NOT NULL DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ext_giveaway_entries' AND column_name = 'tickets') THEN
        ALTER TABLE ext_giveaway_entries ADD COLUMN tickets INTEGER NOT NULL DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ext_giveaway_entries' AND column_name = 'entered_at') THEN
        ALTER TABLE ext_giveaway_entries ADD COLUMN entered_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 3c. Ensure ext_giveaway_winners table
CREATE TABLE IF NOT EXISTS ext_giveaway_winners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    giveaway_id UUID NOT NULL REFERENCES ext_giveaways(id) ON DELETE CASCADE,
    twitch_user_id TEXT NOT NULL,
    twitch_display_name TEXT NOT NULL DEFAULT '',
    selected_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ext_giveaway_winners' AND column_name = 'giveaway_id') THEN
        ALTER TABLE ext_giveaway_winners ADD COLUMN giveaway_id UUID NOT NULL REFERENCES ext_giveaways(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ext_giveaway_winners' AND column_name = 'twitch_user_id') THEN
        ALTER TABLE ext_giveaway_winners ADD COLUMN twitch_user_id TEXT NOT NULL DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ext_giveaway_winners' AND column_name = 'twitch_display_name') THEN
        ALTER TABLE ext_giveaway_winners ADD COLUMN twitch_display_name TEXT NOT NULL DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ext_giveaway_winners' AND column_name = 'selected_at') THEN
        ALTER TABLE ext_giveaway_winners ADD COLUMN selected_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 3d. Enable RLS on extension giveaway tables
ALTER TABLE ext_giveaways ENABLE ROW LEVEL SECURITY;
ALTER TABLE ext_giveaway_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ext_giveaway_winners ENABLE ROW LEVEL SECURITY;

-- 3e. Recreate indexes
CREATE INDEX IF NOT EXISTS idx_ext_ga_broadcaster ON ext_giveaways(broadcaster_id, status);
CREATE INDEX IF NOT EXISTS idx_ext_ge_giveaway ON ext_giveaway_entries(giveaway_id);


-- ─── 4. VERIFICATION QUERY ─────────────────────────────────────────
-- Run this after the migration to verify everything is in place.
-- It should return all 7 giveaway tables with their column counts.

SELECT 
    t.table_name,
    COUNT(c.column_name) AS column_count,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_tables pt WHERE pt.tablename = t.table_name AND pt.rowsecurity = true)
        THEN '✅ RLS ON'
        ELSE '❌ RLS OFF'
    END AS rls_status
FROM information_schema.tables t
JOIN information_schema.columns c ON c.table_name = t.table_name AND c.table_schema = t.table_schema
WHERE t.table_schema = 'public'
  AND t.table_name IN (
    'giveaways', 'giveaway_entries', 'giveaway_winners',
    'user_giveaways',
    'ext_giveaways', 'ext_giveaway_entries', 'ext_giveaway_winners'
  )
GROUP BY t.table_name
ORDER BY t.table_name;

-- Expected results:
-- ext_giveaway_entries  | 6  | ✅ RLS ON
-- ext_giveaway_winners  | 5  | ✅ RLS ON
-- ext_giveaways         | 13 | ✅ RLS ON
-- giveaway_entries      | 6  | ✅ RLS ON
-- giveaway_winners      | 5  | ✅ RLS ON
-- giveaways             | 14 | ✅ RLS ON
-- user_giveaways        | 12 | ✅ RLS ON

-- ─── 5. CHECK RLS POLICIES ─────────────────────────────────────────

SELECT tablename, policyname, cmd, qual
FROM pg_policies 
WHERE tablename LIKE '%giveaway%'
ORDER BY tablename, policyname;

-- Expected: 11 policies total
-- giveaways:         2 (view active, admin manage)
-- giveaway_entries:  3 (view all, create own, update own)
-- giveaway_winners:  2 (view all, admin manage)
-- user_giveaways:    4 (view/insert/update/delete own)
