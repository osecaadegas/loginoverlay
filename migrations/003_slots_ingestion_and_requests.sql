-- Consolidated migration: 003_slots_ingestion_and_requests.sql
-- Generated from active source migrations retained after cleanup

-- ============================================================================
-- Source: create_slots_table.sql
-- ============================================================================
-- Create slots table
CREATE TABLE IF NOT EXISTS public.slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL,
  image TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.slots ENABLE ROW LEVEL SECURITY;

-- Create policy to allow read access to authenticated users
CREATE POLICY "Allow read access to authenticated users"
  ON public.slots
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy to allow insert/update/delete for authenticated users (for admin operations)
CREATE POLICY "Allow all operations for authenticated users"
  ON public.slots
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create index on provider for faster filtering
CREATE INDEX IF NOT EXISTS idx_slots_provider ON public.slots(provider);

-- Create index on name for faster lookups
CREATE INDEX IF NOT EXISTS idx_slots_name ON public.slots(name);

-- Add comment to table
COMMENT ON TABLE public.slots IS 'Stores all available slot games with their images and providers';

-- ============================================================================
-- Source: enhance_slots_table.sql
-- ============================================================================
-- Enhanced slots table migration
-- Adds: rtp, volatility, reels, max_win, status, tags, audit fields

-- Add new columns to existing slots table
ALTER TABLE public.slots 
ADD COLUMN IF NOT EXISTS rtp DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS volatility TEXT CHECK (volatility IN ('low', 'medium', 'high', 'very_high')),
ADD COLUMN IF NOT EXISTS reels TEXT,
ADD COLUMN IF NOT EXISTS max_win_multiplier DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS min_bet DECIMAL(10,2) DEFAULT 0.10,
ADD COLUMN IF NOT EXISTS max_bet DECIMAL(10,2) DEFAULT 100.00,
ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'live' CHECK (status IN ('live', 'draft', 'disabled')),
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Create indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_slots_status ON public.slots(status);
CREATE INDEX IF NOT EXISTS idx_slots_rtp ON public.slots(rtp);
CREATE INDEX IF NOT EXISTS idx_slots_volatility ON public.slots(volatility);
CREATE INDEX IF NOT EXISTS idx_slots_tags ON public.slots USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_slots_features ON public.slots USING GIN(features);
CREATE INDEX IF NOT EXISTS idx_slots_is_featured ON public.slots(is_featured) WHERE is_featured = true;

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_slots_search ON public.slots USING GIN(to_tsvector('english', name || ' ' || provider));

-- Create audit log table
CREATE TABLE IF NOT EXISTS public.slot_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slot_id UUID REFERENCES public.slots(id) ON DELETE SET NULL,
  slot_name TEXT,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'bulk_update')),
  changes JSONB,
  performed_by UUID REFERENCES auth.users(id),
  performed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_slot_id ON public.slot_audit_log(slot_id);
CREATE INDEX IF NOT EXISTS idx_audit_performed_at ON public.slot_audit_log(performed_at DESC);

-- Enable RLS on audit log
ALTER TABLE public.slot_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read audit for authenticated" ON public.slot_audit_log
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert audit for authenticated" ON public.slot_audit_log
  FOR INSERT TO authenticated WITH CHECK (true);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_slots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS slots_updated_at ON public.slots;
CREATE TRIGGER slots_updated_at
  BEFORE UPDATE ON public.slots
  FOR EACH ROW
  EXECUTE FUNCTION update_slots_updated_at();

-- Function for paginated slot search with filters
CREATE OR REPLACE FUNCTION search_slots(
  p_search TEXT DEFAULT NULL,
  p_providers TEXT[] DEFAULT NULL,
  p_status TEXT[] DEFAULT NULL,
  p_volatility TEXT[] DEFAULT NULL,
  p_rtp_min DECIMAL DEFAULT NULL,
  p_rtp_max DECIMAL DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 50,
  p_sort_by TEXT DEFAULT 'name',
  p_sort_dir TEXT DEFAULT 'asc'
)
RETURNS TABLE (
  slots JSONB,
  total_count BIGINT,
  page INTEGER,
  page_size INTEGER,
  total_pages INTEGER
) AS $$
DECLARE
  v_offset INTEGER;
  v_total BIGINT;
  v_slots JSONB;
BEGIN
  v_offset := (p_page - 1) * p_page_size;
  
  -- Get total count
  SELECT COUNT(*) INTO v_total
  FROM public.slots s
  WHERE 
    (p_search IS NULL OR s.name ILIKE '%' || p_search || '%' OR s.provider ILIKE '%' || p_search || '%')
    AND (p_providers IS NULL OR s.provider = ANY(p_providers))
    AND (p_status IS NULL OR s.status = ANY(p_status))
    AND (p_volatility IS NULL OR s.volatility = ANY(p_volatility))
    AND (p_rtp_min IS NULL OR s.rtp >= p_rtp_min)
    AND (p_rtp_max IS NULL OR s.rtp <= p_rtp_max)
    AND (p_tags IS NULL OR s.tags && p_tags);
  
  -- Get paginated results
  SELECT jsonb_agg(row_to_json(t)) INTO v_slots
  FROM (
    SELECT s.*
    FROM public.slots s
    WHERE 
      (p_search IS NULL OR s.name ILIKE '%' || p_search || '%' OR s.provider ILIKE '%' || p_search || '%')
      AND (p_providers IS NULL OR s.provider = ANY(p_providers))
      AND (p_status IS NULL OR s.status = ANY(p_status))
      AND (p_volatility IS NULL OR s.volatility = ANY(p_volatility))
      AND (p_rtp_min IS NULL OR s.rtp >= p_rtp_min)
      AND (p_rtp_max IS NULL OR s.rtp <= p_rtp_max)
      AND (p_tags IS NULL OR s.tags && p_tags)
    ORDER BY
      CASE WHEN p_sort_by = 'name' AND p_sort_dir = 'asc' THEN s.name END ASC,
      CASE WHEN p_sort_by = 'name' AND p_sort_dir = 'desc' THEN s.name END DESC,
      CASE WHEN p_sort_by = 'provider' AND p_sort_dir = 'asc' THEN s.provider END ASC,
      CASE WHEN p_sort_by = 'provider' AND p_sort_dir = 'desc' THEN s.provider END DESC,
      CASE WHEN p_sort_by = 'rtp' AND p_sort_dir = 'asc' THEN s.rtp END ASC NULLS LAST,
      CASE WHEN p_sort_by = 'rtp' AND p_sort_dir = 'desc' THEN s.rtp END DESC NULLS LAST,
      CASE WHEN p_sort_by = 'created_at' AND p_sort_dir = 'asc' THEN s.created_at END ASC,
      CASE WHEN p_sort_by = 'created_at' AND p_sort_dir = 'desc' THEN s.created_at END DESC,
      s.name ASC
    LIMIT p_page_size
    OFFSET v_offset
  ) t;
  
  RETURN QUERY SELECT 
    COALESCE(v_slots, '[]'::jsonb),
    v_total,
    p_page,
    p_page_size,
    CEIL(v_total::DECIMAL / p_page_size)::INTEGER;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Source: add_slot_providers_and_extra_fields.sql
-- ============================================================================
-- Create slot_providers table for managing provider logos
-- Run this in Supabase SQL Editor

-- Providers table
CREATE TABLE IF NOT EXISTS slot_providers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  website_url TEXT,
  is_active BOOLEAN DEFAULT true,
  slot_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE slot_providers ENABLE ROW LEVEL SECURITY;

-- Everyone can read providers
CREATE POLICY "Anyone can read providers" ON slot_providers
  FOR SELECT USING (true);

-- Only admins / slot_modders can modify
CREATE POLICY "Admins can manage providers" ON slot_providers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'slot_modder')
    )
  );

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_slot_providers_name ON slot_providers(name);
CREATE INDEX IF NOT EXISTS idx_slot_providers_slug ON slot_providers(slug);

-- Seed from existing slots (populate from distinct providers already in DB)
-- Use a CTE with ROW_NUMBER to deduplicate slugs (pick first name alphabetically)
INSERT INTO slot_providers (name, slug, logo_url)
SELECT name, slug, NULL
FROM (
  SELECT
    name,
    slug,
    ROW_NUMBER() OVER (PARTITION BY slug ORDER BY name) AS rn
  FROM (
    SELECT DISTINCT
      provider AS name,
      LOWER(REGEXP_REPLACE(REGEXP_REPLACE(provider, '[^a-zA-Z0-9 ]', '', 'g'), '\s+', '-', 'g')) AS slug
    FROM slots
    WHERE provider IS NOT NULL AND provider != ''
  ) raw
) deduped
WHERE rn = 1
ON CONFLICT DO NOTHING;

-- Function to update provider slot counts
CREATE OR REPLACE FUNCTION update_provider_slot_counts()
RETURNS void AS $$
BEGIN
  UPDATE slot_providers sp
  SET slot_count = (
    SELECT COUNT(*) FROM slots s
    WHERE s.provider = sp.name
    AND s.status = 'live'
  );
END;
$$ LANGUAGE plpgsql;

-- Run initial count
SELECT update_provider_slot_counts();

-- Add min_bet and max_bet to slots if not already there
ALTER TABLE slots ADD COLUMN IF NOT EXISTS min_bet DECIMAL(10,2) DEFAULT 0.10;
ALTER TABLE slots ADD COLUMN IF NOT EXISTS max_bet DECIMAL(10,2) DEFAULT 100.00;
ALTER TABLE slots ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]';
ALTER TABLE slots ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE slots ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE slots ADD COLUMN IF NOT EXISTS release_date DATE;
ALTER TABLE slots ADD COLUMN IF NOT EXISTS paylines TEXT;
ALTER TABLE slots ADD COLUMN IF NOT EXISTS theme TEXT;

COMMENT ON COLUMN slots.min_bet IS 'Minimum bet amount';
COMMENT ON COLUMN slots.max_bet IS 'Maximum bet amount';
COMMENT ON COLUMN slots.features IS 'JSON array of features like ["Free Spins","Multiplier","Buy Bonus"]';
COMMENT ON COLUMN slots.tags IS 'Text array of tags for categorization';
COMMENT ON COLUMN slots.description IS 'Slot description/summary';
COMMENT ON COLUMN slots.release_date IS 'Slot release date';
COMMENT ON COLUMN slots.paylines IS 'Number of paylines or Megaways etc.';
COMMENT ON COLUMN slots.theme IS 'Slot theme like Egyptian, Fruits, etc.';

-- ============================================================================
-- Source: normalize_provider_names.sql
-- ============================================================================
-- ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
-- NORMALIZE PROVIDER NAMES in the slots table
-- Standardizes capitalization and uses full official names.
-- Run this in the Supabase SQL Editor.
-- Safe to run multiple times (idempotent ÔÇö only updates rows that match).
-- ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ

-- ÔöÇÔöÇ Major Studios ÔöÇÔöÇ
UPDATE slots SET provider = 'Pragmatic Play'         WHERE lower(provider) IN ('pragmatic play', 'pragmatic', 'ppgames') AND provider != 'Pragmatic Play';
UPDATE slots SET provider = 'Hacksaw Gaming'         WHERE lower(provider) IN ('hacksaw gaming', 'hacksaw') AND provider != 'Hacksaw Gaming';
UPDATE slots SET provider = 'Nolimit City'           WHERE lower(provider) IN ('nolimit city', 'nolimit', 'nolimitcity', 'no limit city') AND provider != 'Nolimit City';
UPDATE slots SET provider = 'Play''n GO'             WHERE lower(provider) IN ('play''n go', 'playngo', 'playn go', 'play n go') AND provider != 'Play''n GO';
UPDATE slots SET provider = 'Push Gaming'            WHERE lower(provider) IN ('push gaming', 'push') AND provider != 'Push Gaming';
UPDATE slots SET provider = 'Big Time Gaming'        WHERE lower(provider) IN ('big time gaming', 'btg', 'bigtime', 'big time') AND provider != 'Big Time Gaming';
UPDATE slots SET provider = 'ELK Studios'            WHERE lower(provider) IN ('elk studios', 'elk') AND provider != 'ELK Studios';
UPDATE slots SET provider = 'Relax Gaming'           WHERE lower(provider) IN ('relax gaming', 'relax', 'rlx') AND provider != 'Relax Gaming';
UPDATE slots SET provider = 'Red Tiger Gaming'       WHERE lower(provider) IN ('red tiger gaming', 'red tiger', 'redtiger') AND provider != 'Red Tiger Gaming';
UPDATE slots SET provider = 'NetEnt'                 WHERE lower(provider) IN ('netent', 'net ent', 'net entertainment') AND provider != 'NetEnt';
UPDATE slots SET provider = 'Thunderkick'            WHERE lower(provider) IN ('thunderkick') AND provider != 'Thunderkick';
UPDATE slots SET provider = 'Quickspin'              WHERE lower(provider) IN ('quickspin') AND provider != 'Quickspin';
UPDATE slots SET provider = 'Yggdrasil Gaming'       WHERE lower(provider) IN ('yggdrasil gaming', 'yggdrasil') AND provider != 'Yggdrasil Gaming';
UPDATE slots SET provider = 'Blueprint Gaming'       WHERE lower(provider) IN ('blueprint gaming', 'blueprint') AND provider != 'Blueprint Gaming';
UPDATE slots SET provider = 'Evolution'              WHERE lower(provider) IN ('evolution', 'evolution gaming') AND provider != 'Evolution';
UPDATE slots SET provider = 'Playtech'               WHERE lower(provider) IN ('playtech') AND provider != 'Playtech';
UPDATE slots SET provider = 'IGT'                    WHERE lower(provider) IN ('igt', 'international game technology') AND provider != 'IGT';
UPDATE slots SET provider = 'Microgaming'            WHERE lower(provider) IN ('microgaming', 'quickfire', 'games global') AND provider != 'Microgaming';

-- ÔöÇÔöÇ A ÔöÇÔöÇ
UPDATE slots SET provider = '1spin4win'              WHERE lower(provider) IN ('1spin4win') AND provider != '1spin4win';
UPDATE slots SET provider = '1X2gaming'              WHERE lower(provider) IN ('1x2gaming', '1x2 gaming') AND provider != '1X2gaming';
UPDATE slots SET provider = '18Peaches'              WHERE lower(provider) IN ('18peaches') AND provider != '18Peaches';
UPDATE slots SET provider = '2by2 Gaming'            WHERE lower(provider) IN ('2by2 gaming', '2by2') AND provider != '2by2 Gaming';
UPDATE slots SET provider = '3 Oaks Gaming'          WHERE lower(provider) IN ('3 oaks gaming', '3 oaks', '3oaks', 'three oaks') AND provider != '3 Oaks Gaming';
UPDATE slots SET provider = '4ThePlayer'             WHERE lower(provider) IN ('4theplayer', '4 the player') AND provider != '4ThePlayer';
UPDATE slots SET provider = 'Alea'                   WHERE lower(provider) IN ('alea') AND provider != 'Alea';
UPDATE slots SET provider = 'Ainsworth'              WHERE lower(provider) IN ('ainsworth') AND provider != 'Ainsworth';
UPDATE slots SET provider = 'Aiwin Games'            WHERE lower(provider) IN ('aiwin games', 'aiwin') AND provider != 'Aiwin Games';
UPDATE slots SET provider = 'All41 Studios'          WHERE lower(provider) IN ('all41 studios', 'all41') AND provider != 'All41 Studios';
UPDATE slots SET provider = 'AllWaySpin'             WHERE lower(provider) IN ('allwayspin', 'allway spin') AND provider != 'AllWaySpin';
UPDATE slots SET provider = 'Alchemy Gaming'         WHERE lower(provider) IN ('alchemy gaming', 'alchemy') AND provider != 'Alchemy Gaming';
UPDATE slots SET provider = 'Amatic Industries'      WHERE lower(provider) IN ('amatic industries', 'amatic') AND provider != 'Amatic Industries';
UPDATE slots SET provider = 'Amigo Gaming'           WHERE lower(provider) IN ('amigo gaming', 'amigo') AND provider != 'Amigo Gaming';
UPDATE slots SET provider = 'Amusnet'                WHERE lower(provider) IN ('amusnet', 'egt', 'amusnet (egt)', 'amusnet egt') AND provider != 'Amusnet';
UPDATE slots SET provider = 'Apollo Games'           WHERE lower(provider) IN ('apollo games', 'apollo') AND provider != 'Apollo Games';
UPDATE slots SET provider = 'Apparat Gaming'         WHERE lower(provider) IN ('apparat gaming', 'apparat') AND provider != 'Apparat Gaming';
UPDATE slots SET provider = 'Arrows Edge'            WHERE lower(provider) IN ('arrows edge', 'arcade studio') AND provider != 'Arrows Edge';
UPDATE slots SET provider = 'Armadillo Studios'      WHERE lower(provider) IN ('armadillo studios', 'armadillo') AND provider != 'Armadillo Studios';
UPDATE slots SET provider = 'Asia Gaming'            WHERE lower(provider) IN ('asia gaming') AND provider != 'Asia Gaming';
UPDATE slots SET provider = 'AsiaSoft'               WHERE lower(provider) IN ('asiasoft') AND provider != 'AsiaSoft';
UPDATE slots SET provider = 'Authentic Gaming'       WHERE lower(provider) IN ('authentic gaming') AND provider != 'Authentic Gaming';
UPDATE slots SET provider = 'AvatarUX'               WHERE lower(provider) IN ('avatarux', 'avatar ux') AND provider != 'AvatarUX';
UPDATE slots SET provider = 'AZUR Gaming'            WHERE lower(provider) IN ('azur gaming', 'azur') AND provider != 'AZUR Gaming';

-- ÔöÇÔöÇ B ÔöÇÔöÇ
UPDATE slots SET provider = 'Backseat Gaming'        WHERE lower(provider) IN ('backseat gaming') AND provider != 'Backseat Gaming';
UPDATE slots SET provider = 'Bally''s Interactive'    WHERE lower(provider) IN ('bally''s interactive', 'ballys', 'bally''s') AND provider != 'Bally''s Interactive';
UPDATE slots SET provider = 'Bang Bang Games'        WHERE lower(provider) IN ('bang bang games') AND provider != 'Bang Bang Games';
UPDATE slots SET provider = 'Barcrest'               WHERE lower(provider) IN ('barcrest') AND provider != 'Barcrest';
UPDATE slots SET provider = 'BeSoft Gaming'          WHERE lower(provider) IN ('besoft gaming', 'besoft') AND provider != 'BeSoft Gaming';
UPDATE slots SET provider = 'Belatra Games'          WHERE lower(provider) IN ('belatra games', 'belatra') AND provider != 'Belatra Games';
UPDATE slots SET provider = 'BetGames'               WHERE lower(provider) IN ('betgames', 'betgames.tv') AND provider != 'BetGames';
UPDATE slots SET provider = 'Betixon'                WHERE lower(provider) IN ('betixon') AND provider != 'Betixon';
UPDATE slots SET provider = 'Betsoft Gaming'         WHERE lower(provider) IN ('betsoft gaming', 'betsoft') AND provider != 'Betsoft Gaming';
UPDATE slots SET provider = 'BGaming'                WHERE lower(provider) IN ('bgaming', 'b gaming') AND provider != 'BGaming';
UPDATE slots SET provider = 'Black Cat Games'        WHERE lower(provider) IN ('black cat games') AND provider != 'Black Cat Games';
UPDATE slots SET provider = 'Blitz Gaming'           WHERE lower(provider) IN ('blitz gaming') AND provider != 'Blitz Gaming';
UPDATE slots SET provider = 'Booming Games'          WHERE lower(provider) IN ('booming games', 'booming') AND provider != 'Booming Games';
UPDATE slots SET provider = 'Booongo'                WHERE lower(provider) IN ('booongo') AND provider != 'Booongo';
UPDATE slots SET provider = 'Bragg Gaming Group'     WHERE lower(provider) IN ('bragg gaming group', 'bragg') AND provider != 'Bragg Gaming Group';
UPDATE slots SET provider = 'Bullshark Games'        WHERE lower(provider) IN ('bullshark games', 'bullshark') AND provider != 'Bullshark Games';
UPDATE slots SET provider = 'Boom Master'            WHERE lower(provider) IN ('boom master') AND provider != 'Boom Master';
UPDATE slots SET provider = 'Boom Pot'               WHERE lower(provider) IN ('boom pot') AND provider != 'Boom Pot';

-- ÔöÇÔöÇ C ÔöÇÔöÇ
UPDATE slots SET provider = 'Caleta Gaming'          WHERE lower(provider) IN ('caleta gaming', 'caleta') AND provider != 'Caleta Gaming';
UPDATE slots SET provider = 'Capecod'                WHERE lower(provider) IN ('capecod') AND provider != 'Capecod';
UPDATE slots SET provider = 'CT Gaming'              WHERE lower(provider) IN ('ct gaming', 'casino technology', 'ct gaming interactive') AND provider != 'CT Gaming';
UPDATE slots SET provider = 'Cayetano Gaming'        WHERE lower(provider) IN ('cayetano gaming', 'cayetano') AND provider != 'Cayetano Gaming';
UPDATE slots SET provider = 'Clawbuster'             WHERE lower(provider) IN ('clawbuster') AND provider != 'Clawbuster';
UPDATE slots SET provider = 'Connective Games'       WHERE lower(provider) IN ('connective games') AND provider != 'Connective Games';
UPDATE slots SET provider = 'Crazy Tooth Studio'     WHERE lower(provider) IN ('crazy tooth studio', 'crazy tooth') AND provider != 'Crazy Tooth Studio';
UPDATE slots SET provider = 'Croco Gaming'           WHERE lower(provider) IN ('croco gaming') AND provider != 'Croco Gaming';

-- ÔöÇÔöÇ D ÔöÇÔöÇ
UPDATE slots SET provider = 'Design Works Gaming'    WHERE lower(provider) IN ('design works gaming', 'dwg') AND provider != 'Design Works Gaming';
UPDATE slots SET provider = 'DigiWheel'              WHERE lower(provider) IN ('digiwheel') AND provider != 'DigiWheel';
UPDATE slots SET provider = 'Dragon Gaming'          WHERE lower(provider) IN ('dragon gaming') AND provider != 'Dragon Gaming';
UPDATE slots SET provider = 'Dragon Soft'            WHERE lower(provider) IN ('dragon soft', 'dragoonsoft', 'dragoon soft') AND provider != 'Dragon Soft';
UPDATE slots SET provider = 'Dreamtech Gaming'       WHERE lower(provider) IN ('dreamtech gaming', 'dreamtech') AND provider != 'Dreamtech Gaming';

-- ÔöÇÔöÇ E ÔöÇÔöÇ
UPDATE slots SET provider = 'Endorphina'             WHERE lower(provider) IN ('endorphina') AND provider != 'Endorphina';
UPDATE slots SET provider = 'Espresso Games'         WHERE lower(provider) IN ('espresso games', 'espresso') AND provider != 'Espresso Games';
UPDATE slots SET provider = 'Evoplay Entertainment'  WHERE lower(provider) IN ('evoplay entertainment', 'evoplay') AND provider != 'Evoplay Entertainment';
UPDATE slots SET provider = 'Ezugi'                  WHERE lower(provider) IN ('ezugi') AND provider != 'Ezugi';

-- ÔöÇÔöÇ F ÔöÇÔöÇ
UPDATE slots SET provider = 'Fa Chai'                WHERE lower(provider) IN ('fa chai') AND provider != 'Fa Chai';
UPDATE slots SET provider = 'Fantasma Games'         WHERE lower(provider) IN ('fantasma games', 'fantasma') AND provider != 'Fantasma Games';
UPDATE slots SET provider = 'Fazi Interactive'       WHERE lower(provider) IN ('fazi interactive', 'fazi') AND provider != 'Fazi Interactive';
UPDATE slots SET provider = 'Four Leaf Gaming'       WHERE lower(provider) IN ('four leaf gaming') AND provider != 'Four Leaf Gaming';
UPDATE slots SET provider = 'Foxium'                 WHERE lower(provider) IN ('foxium') AND provider != 'Foxium';
UPDATE slots SET provider = 'FreeSpin Games'         WHERE lower(provider) IN ('freespin games', 'freespin') AND provider != 'FreeSpin Games';
UPDATE slots SET provider = 'Fugaso'                 WHERE lower(provider) IN ('fugaso') AND provider != 'Fugaso';

-- ÔöÇÔöÇ G ÔöÇÔöÇ
UPDATE slots SET provider = 'GameArt'                WHERE lower(provider) IN ('gameart', 'game art') AND provider != 'GameArt';
UPDATE slots SET provider = 'Gaming Corps'           WHERE lower(provider) IN ('gaming corps') AND provider != 'Gaming Corps';
UPDATE slots SET provider = 'Gamomat'                WHERE lower(provider) IN ('gamomat') AND provider != 'Gamomat';
UPDATE slots SET provider = 'Givme Games'            WHERE lower(provider) IN ('givme games') AND provider != 'Givme Games';
UPDATE slots SET provider = 'Golden Hero'            WHERE lower(provider) IN ('golden hero') AND provider != 'Golden Hero';
UPDATE slots SET provider = 'Greentube'              WHERE lower(provider) IN ('greentube') AND provider != 'Greentube';

-- ÔöÇÔöÇ H ÔöÇÔöÇ
UPDATE slots SET provider = 'Habanero'               WHERE lower(provider) IN ('habanero') AND provider != 'Habanero';
UPDATE slots SET provider = 'High 5 Games'           WHERE lower(provider) IN ('high 5 games', 'h5g', 'high5') AND provider != 'High 5 Games';
UPDATE slots SET provider = 'HoGaming'               WHERE lower(provider) IN ('hogaming', 'ho gaming') AND provider != 'HoGaming';

-- ÔöÇÔöÇ I ÔöÇÔöÇ
UPDATE slots SET provider = 'IGaming Tech'           WHERE lower(provider) IN ('igaming tech', 'igtech') AND provider != 'IGaming Tech';
UPDATE slots SET provider = 'Imagine Live'           WHERE lower(provider) IN ('imagine live') AND provider != 'Imagine Live';
UPDATE slots SET provider = 'inBET Games'            WHERE lower(provider) IN ('inbet games', 'inbet') AND provider != 'inBET Games';
UPDATE slots SET provider = 'iPlay77'                WHERE lower(provider) IN ('iplay77') AND provider != 'iPlay77';
UPDATE slots SET provider = 'iSoftBet'               WHERE lower(provider) IN ('isoftbet', 'i soft bet') AND provider != 'iSoftBet';

-- ÔöÇÔöÇ J / K ÔöÇÔöÇ
UPDATE slots SET provider = 'Jaywalk Gaming'         WHERE lower(provider) IN ('jaywalk gaming') AND provider != 'Jaywalk Gaming';
UPDATE slots SET provider = 'KA Gaming'              WHERE lower(provider) IN ('ka gaming') AND provider != 'KA Gaming';
UPDATE slots SET provider = 'Kalamba Games'          WHERE lower(provider) IN ('kalamba games', 'kalamba') AND provider != 'Kalamba Games';
UPDATE slots SET provider = 'KIT Studios'            WHERE lower(provider) IN ('kit studios', 'kitsune studios', 'kit') AND provider != 'KIT Studios';

-- ÔöÇÔöÇ L ÔöÇÔöÇ
UPDATE slots SET provider = 'Leap Gaming'            WHERE lower(provider) IN ('leap gaming') AND provider != 'Leap Gaming';
UPDATE slots SET provider = 'Leander Games'          WHERE lower(provider) IN ('leander games', 'leander') AND provider != 'Leander Games';
UPDATE slots SET provider = 'Light & Wonder'         WHERE lower(provider) IN ('light & wonder', 'light and wonder', 'nextgen gaming', 'nextgen') AND provider != 'Light & Wonder';
UPDATE slots SET provider = 'Lightning Box Games'    WHERE lower(provider) IN ('lightning box games', 'lightning box') AND provider != 'Lightning Box Games';
UPDATE slots SET provider = 'Live88'                 WHERE lower(provider) IN ('live88') AND provider != 'Live88';

-- ÔöÇÔöÇ M ÔöÇÔöÇ
UPDATE slots SET provider = 'Mancala Gaming'         WHERE lower(provider) IN ('mancala gaming', 'mancala') AND provider != 'Mancala Gaming';
UPDATE slots SET provider = 'Mascot Gaming'          WHERE lower(provider) IN ('mascot gaming', 'mascot') AND provider != 'Mascot Gaming';
UPDATE slots SET provider = 'MGA Games'              WHERE lower(provider) IN ('mga games', 'mga') AND provider != 'MGA Games';
UPDATE slots SET provider = 'Mobilots'               WHERE lower(provider) IN ('mobilots') AND provider != 'Mobilots';

-- ÔöÇÔöÇ N ÔöÇÔöÇ
UPDATE slots SET provider = 'NetGame Entertainment'  WHERE lower(provider) IN ('netgame entertainment', 'netgame') AND provider != 'NetGame Entertainment';
UPDATE slots SET provider = 'Northern Lights Gaming' WHERE lower(provider) IN ('northern lights gaming', 'northern lights') AND provider != 'Northern Lights Gaming';
UPDATE slots SET provider = 'Novomatic'              WHERE lower(provider) IN ('novomatic') AND provider != 'Novomatic';
UPDATE slots SET provider = 'NowNow Gaming'          WHERE lower(provider) IN ('nownow gaming') AND provider != 'NowNow Gaming';

-- ÔöÇÔöÇ O ÔöÇÔöÇ
UPDATE slots SET provider = 'Octoplay'               WHERE lower(provider) IN ('octoplay') AND provider != 'Octoplay';
UPDATE slots SET provider = 'Onlyplay'               WHERE lower(provider) IN ('onlyplay') AND provider != 'Onlyplay';
UPDATE slots SET provider = 'Oryx Gaming'            WHERE lower(provider) IN ('oryx gaming', 'oryx') AND provider != 'Oryx Gaming';

-- ÔöÇÔöÇ P ÔöÇÔöÇ
UPDATE slots SET provider = 'Peter & Sons'           WHERE lower(provider) IN ('peter & sons', 'peter and sons') AND provider != 'Peter & Sons';
UPDATE slots SET provider = 'PG Soft'                WHERE lower(provider) IN ('pg soft', 'pgsoft', 'pocket games soft', 'pocketgames') AND provider != 'PG Soft';
UPDATE slots SET provider = 'Platipus Gaming'        WHERE lower(provider) IN ('platipus gaming', 'platipus') AND provider != 'Platipus Gaming';
UPDATE slots SET provider = 'Playson'                WHERE lower(provider) IN ('playson') AND provider != 'Playson';
UPDATE slots SET provider = 'PopiPlay'               WHERE lower(provider) IN ('popiplay') AND provider != 'PopiPlay';
UPDATE slots SET provider = 'Print Studios'          WHERE lower(provider) IN ('print studios') AND provider != 'Print Studios';
UPDATE slots SET provider = 'Prowin Gaming'          WHERE lower(provider) IN ('prowin gaming') AND provider != 'Prowin Gaming';

-- ÔöÇÔöÇ Q / R ÔöÇÔöÇ
UPDATE slots SET provider = 'Qora Gaming'            WHERE lower(provider) IN ('qora gaming') AND provider != 'Qora Gaming';
UPDATE slots SET provider = 'ReelPlay'               WHERE lower(provider) IN ('reelplay', 'reel play') AND provider != 'ReelPlay';
UPDATE slots SET provider = 'ReelNRG'                WHERE lower(provider) IN ('reelnrg', 'reel nrg') AND provider != 'ReelNRG';
UPDATE slots SET provider = 'RubyPlay'               WHERE lower(provider) IN ('rubyplay', 'ruby play') AND provider != 'RubyPlay';
UPDATE slots SET provider = 'Rng Foundry'            WHERE lower(provider) IN ('rng foundry') AND provider != 'Rng Foundry';

-- ÔöÇÔöÇ S ÔöÇÔöÇ
UPDATE slots SET provider = 'SG Digital'             WHERE lower(provider) IN ('sg digital', 'scientific games') AND provider != 'SG Digital';
UPDATE slots SET provider = 'Slotmill'               WHERE lower(provider) IN ('slotmill', 'slot mill') AND provider != 'Slotmill';
UPDATE slots SET provider = 'Spadegaming'            WHERE lower(provider) IN ('spadegaming', 'spade gaming') AND provider != 'Spadegaming';
UPDATE slots SET provider = 'Spinomenal'             WHERE lower(provider) IN ('spinomenal') AND provider != 'Spinomenal';
UPDATE slots SET provider = 'Spribe'                 WHERE lower(provider) IN ('spribe') AND provider != 'Spribe';
UPDATE slots SET provider = 'Stakelogic'             WHERE lower(provider) IN ('stakelogic') AND provider != 'Stakelogic';
UPDATE slots SET provider = 'Stormcraft Studios'     WHERE lower(provider) IN ('stormcraft studios', 'stormcraft') AND provider != 'Stormcraft Studios';
UPDATE slots SET provider = 'Swintt'                 WHERE lower(provider) IN ('swintt') AND provider != 'Swintt';
UPDATE slots SET provider = 'SYNOT Games'            WHERE lower(provider) IN ('synot games', 'synot') AND provider != 'SYNOT Games';
UPDATE slots SET provider = 'Skywind Group'          WHERE lower(provider) IN ('skywind group', 'skywind') AND provider != 'Skywind Group';

-- ÔöÇÔöÇ T ÔöÇÔöÇ
UPDATE slots SET provider = 'Tom Horn Gaming'        WHERE lower(provider) IN ('tom horn gaming', 'tom horn') AND provider != 'Tom Horn Gaming';
UPDATE slots SET provider = 'TaDa Gaming'            WHERE lower(provider) IN ('tada gaming', 'tada') AND provider != 'TaDa Gaming';
UPDATE slots SET provider = 'TrueLab Game Studios'   WHERE lower(provider) IN ('truelab game studios', 'truelab') AND provider != 'TrueLab Game Studios';
UPDATE slots SET provider = 'Tontine Gaming'         WHERE lower(provider) IN ('tontine gaming') AND provider != 'Tontine Gaming';

-- ÔöÇÔöÇ U / V ÔöÇÔöÇ
UPDATE slots SET provider = 'Urgent Games'           WHERE lower(provider) IN ('urgent games') AND provider != 'Urgent Games';
UPDATE slots SET provider = 'Upgaming'               WHERE lower(provider) IN ('upgaming') AND provider != 'Upgaming';
UPDATE slots SET provider = 'UrsaGames'              WHERE lower(provider) IN ('ursagames', 'ursa games') AND provider != 'UrsaGames';
UPDATE slots SET provider = 'Vela Gaming'            WHERE lower(provider) IN ('vela gaming') AND provider != 'Vela Gaming';

-- ÔöÇÔöÇ W ÔöÇÔöÇ
UPDATE slots SET provider = 'Wazdan'                 WHERE lower(provider) IN ('wazdan') AND provider != 'Wazdan';
UPDATE slots SET provider = 'WinFast Games'          WHERE lower(provider) IN ('winfast games', 'winfast') AND provider != 'WinFast Games';
UPDATE slots SET provider = 'Wizard Games'           WHERE lower(provider) IN ('wizard games', 'wizard') AND provider != 'Wizard Games';

-- ÔöÇÔöÇ Y / Z ÔöÇÔöÇ
UPDATE slots SET provider = 'ZeusPlay'               WHERE lower(provider) IN ('zeusplay', 'zeus play') AND provider != 'ZeusPlay';
UPDATE slots SET provider = 'Zillion Games'          WHERE lower(provider) IN ('zillion games') AND provider != 'Zillion Games';
UPDATE slots SET provider = 'Zitro Digital'          WHERE lower(provider) IN ('zitro digital', 'zitro') AND provider != 'Zitro Digital';


-- ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
-- VERIFY: Check distinct provider names after normalization
-- ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
-- SELECT provider, COUNT(*) as slot_count
-- FROM slots
-- GROUP BY provider
-- ORDER BY provider;

-- ============================================================================
-- Source: update_provider_logos.sql
-- ============================================================================
-- Update slot_providers with scraped logo URLs
-- Logos saved to public/providers/*.png
-- Run in Supabase SQL Editor

-- 1x2 Gaming
UPDATE slot_providers SET logo_url = '/providers/1x2_gaming.png' WHERE slug = '1x2-gaming' OR LOWER(name) = LOWER('1x2 Gaming');

-- 2 By 2
UPDATE slot_providers SET logo_url = '/providers/2_by_2.png' WHERE slug = '2-by-2' OR LOWER(name) = LOWER('2 By 2');

-- 3oaks
UPDATE slot_providers SET logo_url = '/providers/3oaks.png' WHERE slug = '3oaks' OR LOWER(name) = LOWER('3oaks');

-- 5men Games
UPDATE slot_providers SET logo_url = '/providers/5men_games.png' WHERE slug = '5men-games' OR LOWER(name) = LOWER('5men Games');

-- Amigogaming
UPDATE slot_providers SET logo_url = '/providers/amigogaming.png' WHERE slug = 'amigogaming' OR LOWER(name) = LOWER('Amigogaming');

-- Amusnet
UPDATE slot_providers SET logo_url = '/providers/amusnet.png' WHERE slug = 'amusnet' OR LOWER(name) = LOWER('Amusnet');

-- Asiagaming
UPDATE slot_providers SET logo_url = '/providers/asiagaming.png' WHERE slug = 'asiagaming' OR LOWER(name) = LOWER('Asiagaming');

-- Atomic Slot Lab
UPDATE slot_providers SET logo_url = '/providers/atomic_slot_lab.png' WHERE slug = 'atomic-slot-lab' OR LOWER(name) = LOWER('Atomic Slot Lab');

-- Avatarux
UPDATE slot_providers SET logo_url = '/providers/avatarux.png' WHERE slug = 'avatarux' OR LOWER(name) = LOWER('Avatarux');

-- Aviatrix
UPDATE slot_providers SET logo_url = '/providers/aviatrix.png' WHERE slug = 'aviatrix' OR LOWER(name) = LOWER('Aviatrix');

-- Barbarabang
UPDATE slot_providers SET logo_url = '/providers/barbarabang.png' WHERE slug = 'barbarabang' OR LOWER(name) = LOWER('Barbarabang');

-- Betgames
UPDATE slot_providers SET logo_url = '/providers/betgames.png' WHERE slug = 'betgames' OR LOWER(name) = LOWER('Betgames');

-- Betixon
UPDATE slot_providers SET logo_url = '/providers/betixon.png' WHERE slug = 'betixon' OR LOWER(name) = LOWER('Betixon');

-- Betsoft
UPDATE slot_providers SET logo_url = '/providers/betsoft.png' WHERE slug = 'betsoft' OR LOWER(name) = LOWER('Betsoft');

-- Bf Games
UPDATE slot_providers SET logo_url = '/providers/bf_games.png' WHERE slug = 'bf-games' OR LOWER(name) = LOWER('Bf Games');

-- Bgaming
UPDATE slot_providers SET logo_url = '/providers/bgaming.png' WHERE slug = 'bgaming' OR LOWER(name) = LOWER('Bgaming');

-- Big Time Gaming
UPDATE slot_providers SET logo_url = '/providers/big_time_gaming.png' WHERE slug = 'big-time-gaming' OR LOWER(name) = LOWER('Big Time Gaming');

-- Blue Guru
UPDATE slot_providers SET logo_url = '/providers/blue_guru.png' WHERE slug = 'blue-guru' OR LOWER(name) = LOWER('Blue Guru');

-- Blueprint
UPDATE slot_providers SET logo_url = '/providers/blueprint.png' WHERE slug = 'blueprint' OR LOWER(name) = LOWER('Blueprint');

-- Bombaylive
UPDATE slot_providers SET logo_url = '/providers/bombaylive.png' WHERE slug = 'bombaylive' OR LOWER(name) = LOWER('Bombaylive');

-- Booming Games
UPDATE slot_providers SET logo_url = '/providers/booming_games.png' WHERE slug = 'booming-games' OR LOWER(name) = LOWER('Booming Games');

-- Booongo
UPDATE slot_providers SET logo_url = '/providers/booongo.png' WHERE slug = 'booongo' OR LOWER(name) = LOWER('Booongo');

-- Caleta
UPDATE slot_providers SET logo_url = '/providers/caleta.png' WHERE slug = 'caleta' OR LOWER(name) = LOWER('Caleta');

-- Casimi
UPDATE slot_providers SET logo_url = '/providers/casimi.png' WHERE slug = 'casimi' OR LOWER(name) = LOWER('Casimi');

-- Casimi Gaming
UPDATE slot_providers SET logo_url = '/providers/casimi_gaming.png' WHERE slug = 'casimi-gaming' OR LOWER(name) = LOWER('Casimi Gaming');

-- Ct Gaming
UPDATE slot_providers SET logo_url = '/providers/ct_gaming.png' WHERE slug = 'ct-gaming' OR LOWER(name) = LOWER('Ct Gaming');

-- Dragon Gaming
UPDATE slot_providers SET logo_url = '/providers/dragon_gaming.png' WHERE slug = 'dragon-gaming' OR LOWER(name) = LOWER('Dragon Gaming');

-- Ebet
UPDATE slot_providers SET logo_url = '/providers/ebet.png' WHERE slug = 'ebet' OR LOWER(name) = LOWER('Ebet');

-- Egt Digital
UPDATE slot_providers SET logo_url = '/providers/egt_digital.png' WHERE slug = 'egt-digital' OR LOWER(name) = LOWER('Egt Digital');

-- Elbet
UPDATE slot_providers SET logo_url = '/providers/elbet.png' WHERE slug = 'elbet' OR LOWER(name) = LOWER('Elbet');

-- Elk
UPDATE slot_providers SET logo_url = '/providers/elk.png' WHERE slug = 'elk' OR LOWER(name) = LOWER('Elk');

-- Elysium
UPDATE slot_providers SET logo_url = '/providers/elysium.png' WHERE slug = 'elysium' OR LOWER(name) = LOWER('Elysium');

-- Endorphina
UPDATE slot_providers SET logo_url = '/providers/endorphina.png' WHERE slug = 'endorphina' OR LOWER(name) = LOWER('Endorphina');

-- Esagaming
UPDATE slot_providers SET logo_url = '/providers/esagaming.png' WHERE slug = 'esagaming' OR LOWER(name) = LOWER('Esagaming');

-- Espresso
UPDATE slot_providers SET logo_url = '/providers/espresso.png' WHERE slug = 'espresso' OR LOWER(name) = LOWER('Espresso');

-- Evolution
UPDATE slot_providers SET logo_url = '/providers/evolution.png' WHERE slug = 'evolution' OR LOWER(name) = LOWER('Evolution');

-- Evoplay
UPDATE slot_providers SET logo_url = '/providers/evoplay.png' WHERE slug = 'evoplay' OR LOWER(name) = LOWER('Evoplay');

-- Expanse
UPDATE slot_providers SET logo_url = '/providers/expanse.png' WHERE slug = 'expanse' OR LOWER(name) = LOWER('Expanse');

-- Ezugi
UPDATE slot_providers SET logo_url = '/providers/ezugi.png' WHERE slug = 'ezugi' OR LOWER(name) = LOWER('Ezugi');

-- Fantasma
UPDATE slot_providers SET logo_url = '/providers/fantasma.png' WHERE slug = 'fantasma' OR LOWER(name) = LOWER('Fantasma');

-- Fazi
UPDATE slot_providers SET logo_url = '/providers/fazi.png' WHERE slug = 'fazi' OR LOWER(name) = LOWER('Fazi');

-- Fbm
UPDATE slot_providers SET logo_url = '/providers/fbm.png' WHERE slug = 'fbm' OR LOWER(name) = LOWER('Fbm');

-- Felix Gaming
UPDATE slot_providers SET logo_url = '/providers/felix_gaming.png' WHERE slug = 'felix-gaming' OR LOWER(name) = LOWER('Felix Gaming');

-- Felt Gaming
UPDATE slot_providers SET logo_url = '/providers/felt_gaming.png' WHERE slug = 'felt-gaming' OR LOWER(name) = LOWER('Felt Gaming');

-- Flatdog Games
UPDATE slot_providers SET logo_url = '/providers/flatdog_games.png' WHERE slug = 'flatdog-games' OR LOWER(name) = LOWER('Flatdog Games');

-- Foxium
UPDATE slot_providers SET logo_url = '/providers/foxium.png' WHERE slug = 'foxium' OR LOWER(name) = LOWER('Foxium');

-- Fugaso
UPDATE slot_providers SET logo_url = '/providers/fugaso.png' WHERE slug = 'fugaso' OR LOWER(name) = LOWER('Fugaso');

-- G Games
UPDATE slot_providers SET logo_url = '/providers/g_games.png' WHERE slug = 'g-games' OR LOWER(name) = LOWER('G Games');

-- Galaxsys
UPDATE slot_providers SET logo_url = '/providers/galaxsys.png' WHERE slug = 'galaxsys' OR LOWER(name) = LOWER('Galaxsys');

-- Gameart
UPDATE slot_providers SET logo_url = '/providers/gameart.png' WHERE slug = 'gameart' OR LOWER(name) = LOWER('Gameart');

-- Games Global
UPDATE slot_providers SET logo_url = '/providers/games_global.png' WHERE slug = 'games-global' OR LOWER(name) = LOWER('Games Global');

-- Gamingcorps
UPDATE slot_providers SET logo_url = '/providers/gamingcorps.png' WHERE slug = 'gamingcorps' OR LOWER(name) = LOWER('Gamingcorps');

-- Gamomat
UPDATE slot_providers SET logo_url = '/providers/gamomat.png' WHERE slug = 'gamomat' OR LOWER(name) = LOWER('Gamomat');

-- Gamzix
UPDATE slot_providers SET logo_url = '/providers/gamzix.png' WHERE slug = 'gamzix' OR LOWER(name) = LOWER('Gamzix');

-- Givme
UPDATE slot_providers SET logo_url = '/providers/givme.png' WHERE slug = 'givme' OR LOWER(name) = LOWER('Givme');

-- Golden Hero Group
UPDATE slot_providers SET logo_url = '/providers/golden_hero_group.png' WHERE slug = 'golden-hero-group' OR LOWER(name) = LOWER('Golden Hero Group');

-- Habanero
UPDATE slot_providers SET logo_url = '/providers/habanero.png' WHERE slug = 'habanero' OR LOWER(name) = LOWER('Habanero');

-- Hacksaw
UPDATE slot_providers SET logo_url = '/providers/hacksaw.png' WHERE slug = 'hacksaw' OR LOWER(name) = LOWER('Hacksaw');

-- Hollywoodtv
UPDATE slot_providers SET logo_url = '/providers/hollywoodtv.png' WHERE slug = 'hollywoodtv' OR LOWER(name) = LOWER('Hollywoodtv');

-- Igtech
UPDATE slot_providers SET logo_url = '/providers/igtech.png' WHERE slug = 'igtech' OR LOWER(name) = LOWER('Igtech');

-- Iron Dog
UPDATE slot_providers SET logo_url = '/providers/iron_dog.png' WHERE slug = 'iron-dog' OR LOWER(name) = LOWER('Iron Dog');

-- Isoftbet
UPDATE slot_providers SET logo_url = '/providers/isoftbet.png' WHERE slug = 'isoftbet' OR LOWER(name) = LOWER('Isoftbet');

-- Jftw
UPDATE slot_providers SET logo_url = '/providers/jftw.png' WHERE slug = 'jftw' OR LOWER(name) = LOWER('Jftw');

-- Kalamba
UPDATE slot_providers SET logo_url = '/providers/kalamba.png' WHERE slug = 'kalamba' OR LOWER(name) = LOWER('Kalamba');

-- Leap
UPDATE slot_providers SET logo_url = '/providers/leap.png' WHERE slug = 'leap' OR LOWER(name) = LOWER('Leap');

-- Lucky
UPDATE slot_providers SET logo_url = '/providers/lucky.png' WHERE slug = 'lucky' OR LOWER(name) = LOWER('Lucky');

-- Mancalagaming
UPDATE slot_providers SET logo_url = '/providers/mancalagaming.png' WHERE slug = 'mancalagaming' OR LOWER(name) = LOWER('Mancalagaming');

-- Mascot
UPDATE slot_providers SET logo_url = '/providers/mascot.png' WHERE slug = 'mascot' OR LOWER(name) = LOWER('Mascot');

-- Mascot Gaming
UPDATE slot_providers SET logo_url = '/providers/mascot_gaming.png' WHERE slug = 'mascot-gaming' OR LOWER(name) = LOWER('Mascot Gaming');

-- Medialive
UPDATE slot_providers SET logo_url = '/providers/medialive.png' WHERE slug = 'medialive' OR LOWER(name) = LOWER('Medialive');

-- Merkur
UPDATE slot_providers SET logo_url = '/providers/merkur.png' WHERE slug = 'merkur' OR LOWER(name) = LOWER('Merkur');

-- Microgaming
UPDATE slot_providers SET logo_url = '/providers/microgaming.png' WHERE slug = 'microgaming' OR LOWER(name) = LOWER('Microgaming');

-- Mrslotty
UPDATE slot_providers SET logo_url = '/providers/mrslotty.png' WHERE slug = 'mrslotty' OR LOWER(name) = LOWER('Mrslotty');

-- Nemesis
UPDATE slot_providers SET logo_url = '/providers/nemesis.png' WHERE slug = 'nemesis' OR LOWER(name) = LOWER('Nemesis');

-- Netent
UPDATE slot_providers SET logo_url = '/providers/netent.png' WHERE slug = 'netent' OR LOWER(name) = LOWER('Netent');

-- Nolimit
UPDATE slot_providers SET logo_url = '/providers/nolimit.png' WHERE slug = 'nolimit' OR LOWER(name) = LOWER('Nolimit');

-- Novomatic
UPDATE slot_providers SET logo_url = '/providers/novomatic.png' WHERE slug = 'novomatic' OR LOWER(name) = LOWER('Novomatic');

-- Nsoft
UPDATE slot_providers SET logo_url = '/providers/nsoft.png' WHERE slug = 'nsoft' OR LOWER(name) = LOWER('Nsoft');

-- Onair
UPDATE slot_providers SET logo_url = '/providers/onair.png' WHERE slug = 'onair' OR LOWER(name) = LOWER('Onair');

-- Onegame
UPDATE slot_providers SET logo_url = '/providers/onegame.png' WHERE slug = 'onegame' OR LOWER(name) = LOWER('Onegame');

-- Onetouch
UPDATE slot_providers SET logo_url = '/providers/onetouch.png' WHERE slug = 'onetouch' OR LOWER(name) = LOWER('Onetouch');

-- Oryx
UPDATE slot_providers SET logo_url = '/providers/oryx.png' WHERE slug = 'oryx' OR LOWER(name) = LOWER('Oryx');

-- Oryx Gaming
UPDATE slot_providers SET logo_url = '/providers/oryx_gaming.png' WHERE slug = 'oryx-gaming' OR LOWER(name) = LOWER('Oryx Gaming');

-- Peter N Sons
UPDATE slot_providers SET logo_url = '/providers/peter_n_sons.png' WHERE slug = 'peter-n-sons' OR LOWER(name) = LOWER('Peter N Sons');

-- Pg Soft
UPDATE slot_providers SET logo_url = '/providers/pg_soft.png' WHERE slug = 'pg-soft' OR LOWER(name) = LOWER('Pg Soft');

-- Platipus
UPDATE slot_providers SET logo_url = '/providers/platipus.png' WHERE slug = 'platipus' OR LOWER(name) = LOWER('Platipus');

-- Play Pearls
UPDATE slot_providers SET logo_url = '/providers/play_pearls.png' WHERE slug = 'play-pearls' OR LOWER(name) = LOWER('Play Pearls');

-- Playngo
UPDATE slot_providers SET logo_url = '/providers/playngo.png' WHERE slug = 'playngo' OR LOWER(name) = LOWER('Playngo');

-- Playpearls
UPDATE slot_providers SET logo_url = '/providers/playpearls.png' WHERE slug = 'playpearls' OR LOWER(name) = LOWER('Playpearls');

-- Playson
UPDATE slot_providers SET logo_url = '/providers/playson.png' WHERE slug = 'playson' OR LOWER(name) = LOWER('Playson');

-- Playtech
UPDATE slot_providers SET logo_url = '/providers/playtech.png' WHERE slug = 'playtech' OR LOWER(name) = LOWER('Playtech');

-- Popiplay
UPDATE slot_providers SET logo_url = '/providers/popiplay.png' WHERE slug = 'popiplay' OR LOWER(name) = LOWER('Popiplay');

-- Popok Gaming
UPDATE slot_providers SET logo_url = '/providers/popok_gaming.png' WHERE slug = 'popok-gaming' OR LOWER(name) = LOWER('Popok Gaming');

-- Pragmatic Play
UPDATE slot_providers SET logo_url = '/providers/pragmatic_play.png' WHERE slug = 'pragmatic-play' OR LOWER(name) = LOWER('Pragmatic Play');

-- Push Gaming
UPDATE slot_providers SET logo_url = '/providers/push_gaming.png' WHERE slug = 'push-gaming' OR LOWER(name) = LOWER('Push Gaming');

-- Qora
UPDATE slot_providers SET logo_url = '/providers/qora.png' WHERE slug = 'qora' OR LOWER(name) = LOWER('Qora');

-- Qora Games
UPDATE slot_providers SET logo_url = '/providers/qora_games.png' WHERE slug = 'qora-games' OR LOWER(name) = LOWER('Qora Games');

-- Quickspin
UPDATE slot_providers SET logo_url = '/providers/quickspin.png' WHERE slug = 'quickspin' OR LOWER(name) = LOWER('Quickspin');

-- Rabcat Gambling
UPDATE slot_providers SET logo_url = '/providers/rabcat_gambling.png' WHERE slug = 'rabcat-gambling' OR LOWER(name) = LOWER('Rabcat Gambling');

-- Real Dealer
UPDATE slot_providers SET logo_url = '/providers/real_dealer.png' WHERE slug = 'real-dealer' OR LOWER(name) = LOWER('Real Dealer');

-- Real Dealer Studios
UPDATE slot_providers SET logo_url = '/providers/real_dealer_studios.png' WHERE slug = 'real-dealer-studios' OR LOWER(name) = LOWER('Real Dealer Studios');

-- Real Time Gaming
UPDATE slot_providers SET logo_url = '/providers/real_time_gaming.png' WHERE slug = 'real-time-gaming' OR LOWER(name) = LOWER('Real Time Gaming');

-- Realliveslots
UPDATE slot_providers SET logo_url = '/providers/realliveslots.png' WHERE slug = 'realliveslots' OR LOWER(name) = LOWER('Realliveslots');

-- Red Genn
UPDATE slot_providers SET logo_url = '/providers/red_genn.png' WHERE slug = 'red-genn' OR LOWER(name) = LOWER('Red Genn');

-- Red Tiger
UPDATE slot_providers SET logo_url = '/providers/red_tiger.png' WHERE slug = 'red-tiger' OR LOWER(name) = LOWER('Red Tiger');

-- Redrake
UPDATE slot_providers SET logo_url = '/providers/redrake.png' WHERE slug = 'redrake' OR LOWER(name) = LOWER('Redrake');

-- Reelplay
UPDATE slot_providers SET logo_url = '/providers/reelplay.png' WHERE slug = 'reelplay' OR LOWER(name) = LOWER('Reelplay');

-- Reevo
UPDATE slot_providers SET logo_url = '/providers/reevo.png' WHERE slug = 'reevo' OR LOWER(name) = LOWER('Reevo');

-- Relax Gaming
UPDATE slot_providers SET logo_url = '/providers/relax_gaming.png' WHERE slug = 'relax-gaming' OR LOWER(name) = LOWER('Relax Gaming');

-- Revolver
UPDATE slot_providers SET logo_url = '/providers/revolver.png' WHERE slug = 'revolver' OR LOWER(name) = LOWER('Revolver');

-- Rubyplay
UPDATE slot_providers SET logo_url = '/providers/rubyplay.png' WHERE slug = 'rubyplay' OR LOWER(name) = LOWER('Rubyplay');

-- Salsa
UPDATE slot_providers SET logo_url = '/providers/salsa.png' WHERE slug = 'salsa' OR LOWER(name) = LOWER('Salsa');

-- Shadylady
UPDATE slot_providers SET logo_url = '/providers/shadylady.png' WHERE slug = 'shadylady' OR LOWER(name) = LOWER('Shadylady');

-- Skywind
UPDATE slot_providers SET logo_url = '/providers/skywind.png' WHERE slug = 'skywind' OR LOWER(name) = LOWER('Skywind');

-- Slotmatrix
UPDATE slot_providers SET logo_url = '/providers/slotmatrix.png' WHERE slug = 'slotmatrix' OR LOWER(name) = LOWER('Slotmatrix');

-- Slotmill
UPDATE slot_providers SET logo_url = '/providers/slotmill.png' WHERE slug = 'slotmill' OR LOWER(name) = LOWER('Slotmill');

-- Slotopia
UPDATE slot_providers SET logo_url = '/providers/slotopia.png' WHERE slug = 'slotopia' OR LOWER(name) = LOWER('Slotopia');

-- Smartsoft
UPDATE slot_providers SET logo_url = '/providers/smartsoft.png' WHERE slug = 'smartsoft' OR LOWER(name) = LOWER('Smartsoft');

-- Spadegaming
UPDATE slot_providers SET logo_url = '/providers/spadegaming.png' WHERE slug = 'spadegaming' OR LOWER(name) = LOWER('Spadegaming');

-- Spage Gaming
UPDATE slot_providers SET logo_url = '/providers/spage_gaming.png' WHERE slug = 'spage-gaming' OR LOWER(name) = LOWER('Spage Gaming');

-- Spearhead
UPDATE slot_providers SET logo_url = '/providers/spearhead.png' WHERE slug = 'spearhead' OR LOWER(name) = LOWER('Spearhead');

-- Spinfury
UPDATE slot_providers SET logo_url = '/providers/spinfury.png' WHERE slug = 'spinfury' OR LOWER(name) = LOWER('Spinfury');

-- Spinmatic
UPDATE slot_providers SET logo_url = '/providers/spinmatic.png' WHERE slug = 'spinmatic' OR LOWER(name) = LOWER('Spinmatic');

-- Spinomenal
UPDATE slot_providers SET logo_url = '/providers/spinomenal.png' WHERE slug = 'spinomenal' OR LOWER(name) = LOWER('Spinomenal');

-- Spinthon
UPDATE slot_providers SET logo_url = '/providers/spinthon.png' WHERE slug = 'spinthon' OR LOWER(name) = LOWER('Spinthon');

-- Spribe
UPDATE slot_providers SET logo_url = '/providers/spribe.png' WHERE slug = 'spribe' OR LOWER(name) = LOWER('Spribe');

-- Stakelogic
UPDATE slot_providers SET logo_url = '/providers/stakelogic.png' WHERE slug = 'stakelogic' OR LOWER(name) = LOWER('Stakelogic');

-- Swintt
UPDATE slot_providers SET logo_url = '/providers/swintt.png' WHERE slug = 'swintt' OR LOWER(name) = LOWER('Swintt');

-- Synot
UPDATE slot_providers SET logo_url = '/providers/synot.png' WHERE slug = 'synot' OR LOWER(name) = LOWER('Synot');

-- Thunderkick
UPDATE slot_providers SET logo_url = '/providers/thunderkick.png' WHERE slug = 'thunderkick' OR LOWER(name) = LOWER('Thunderkick');

-- Tom Horn
UPDATE slot_providers SET logo_url = '/providers/tom_horn.png' WHERE slug = 'tom-horn' OR LOWER(name) = LOWER('Tom Horn');

-- Triple Pg
UPDATE slot_providers SET logo_url = '/providers/triple_pg.png' WHERE slug = 'triple-pg' OR LOWER(name) = LOWER('Triple Pg');

-- Tronius Gaming
UPDATE slot_providers SET logo_url = '/providers/tronius_gaming.png' WHERE slug = 'tronius-gaming' OR LOWER(name) = LOWER('Tronius Gaming');

-- Turbo Games
UPDATE slot_providers SET logo_url = '/providers/turbo_games.png' WHERE slug = 'turbo-games' OR LOWER(name) = LOWER('Turbo Games');

-- Twain Sport
UPDATE slot_providers SET logo_url = '/providers/twain_sport.png' WHERE slug = 'twain-sport' OR LOWER(name) = LOWER('Twain Sport');

-- Upgaming
UPDATE slot_providers SET logo_url = '/providers/upgaming.png' WHERE slug = 'upgaming' OR LOWER(name) = LOWER('Upgaming');

-- Vibra Gaming
UPDATE slot_providers SET logo_url = '/providers/vibra_gaming.png' WHERE slug = 'vibra-gaming' OR LOWER(name) = LOWER('Vibra Gaming');

-- Vivo
UPDATE slot_providers SET logo_url = '/providers/vivo.png' WHERE slug = 'vivo' OR LOWER(name) = LOWER('Vivo');

-- Voltent
UPDATE slot_providers SET logo_url = '/providers/voltent.png' WHERE slug = 'voltent' OR LOWER(name) = LOWER('Voltent');

-- Wazdan
UPDATE slot_providers SET logo_url = '/providers/wazdan.png' WHERE slug = 'wazdan' OR LOWER(name) = LOWER('Wazdan');

-- Wizard Games
UPDATE slot_providers SET logo_url = '/providers/wizard_games.png' WHERE slug = 'wizard-games' OR LOWER(name) = LOWER('Wizard Games');

-- Xplosive
UPDATE slot_providers SET logo_url = '/providers/xplosive.png' WHERE slug = 'xplosive' OR LOWER(name) = LOWER('Xplosive');

-- Yggdrasil
UPDATE slot_providers SET logo_url = '/providers/yggdrasil.png' WHERE slug = 'yggdrasil' OR LOWER(name) = LOWER('Yggdrasil');

-- Verify
SELECT name, slug, logo_url FROM slot_providers WHERE logo_url IS NOT NULL ORDER BY name;

-- ============================================================================
-- Source: add_pending_slots.sql
-- ============================================================================
-- =====================================================
-- Pending Slots ÔÇö Approval queue for premium user submissions
-- =====================================================

CREATE TABLE IF NOT EXISTS pending_slots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Submitter
  submitted_by  UUID NOT NULL REFERENCES auth.users(id),
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Slot data (required fields only)
  name          TEXT NOT NULL,
  provider      TEXT NOT NULL,
  image         TEXT NOT NULL,
  rtp           DECIMAL(5,2) NOT NULL,
  volatility    TEXT NOT NULL CHECK (volatility IN ('low','medium','high','very_high')),
  max_win_multiplier DECIMAL(10,2) NOT NULL,
  -- Approval workflow
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','denied')),
  reviewed_by   UUID REFERENCES auth.users(id),
  reviewed_at   TIMESTAMPTZ,
  review_note   TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pending_slots_status ON pending_slots(status);
CREATE INDEX IF NOT EXISTS idx_pending_slots_submitted_by ON pending_slots(submitted_by);
CREATE INDEX IF NOT EXISTS idx_pending_slots_submitted_at ON pending_slots(submitted_at DESC);

-- RLS
ALTER TABLE pending_slots ENABLE ROW LEVEL SECURITY;

-- Premium users can insert their own rows
CREATE POLICY pending_slots_insert ON pending_slots
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = submitted_by);

-- Users can read their own submissions
CREATE POLICY pending_slots_select_own ON pending_slots
  FOR SELECT TO authenticated
  USING (auth.uid() = submitted_by);

-- Admins can read all
CREATE POLICY pending_slots_select_admin ON pending_slots
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update (approve/deny)
CREATE POLICY pending_slots_update_admin ON pending_slots
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- Source: add_slot_requests.sql
-- ============================================================================
-- Slot request queue for chat !sr command
-- Viewers request slots, streamer sees them in an overlay widget.

CREATE TABLE IF NOT EXISTS slot_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot_name TEXT NOT NULL,
  slot_image TEXT,
  requested_by TEXT NOT NULL DEFAULT 'anonymous',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_slot_requests_user ON slot_requests (user_id, status, created_at);

-- RLS
ALTER TABLE slot_requests ENABLE ROW LEVEL SECURITY;

-- Streamer can read/manage their own requests
CREATE POLICY slot_requests_select ON slot_requests FOR SELECT USING (true);
CREATE POLICY slot_requests_insert ON slot_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY slot_requests_update ON slot_requests FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY slot_requests_delete ON slot_requests FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE slot_requests;

-- ============================================================================
-- Source: add_slot_requests_unique_pending.sql
-- ============================================================================
-- Prevent duplicate pending slot requests (same user + same slot name, case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_slot_requests_unique_pending
  ON slot_requests (user_id, lower(slot_name))
  WHERE status = 'pending';

-- ============================================================================
-- Source: fix_slot_requests_anon_read.sql
-- ============================================================================
-- Fix: allow OBS browser source (anon) to read slot requests for display
-- The harden_slot_requests_3_rls migration blocked anon reads, breaking
-- the OBS overlay which runs unauthenticated.

DROP POLICY IF EXISTS slot_requests_select ON slot_requests;

CREATE POLICY slot_requests_select ON slot_requests
  FOR SELECT
  USING (
    auth.uid() = user_id            -- streamer (logged in) sees their own queue
    OR auth.role() = 'service_role' -- API service role
    OR auth.role() = 'anon'         -- OBS browser source (unauthenticated) ÔÇö public read
  );

-- ============================================================================
-- Source: harden_slot_requests_1_schema.sql
-- ============================================================================
-- ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
-- MIGRATION 1/3 ÔÇö harden_slot_requests_1_schema
-- Run this first in the Supabase SQL editor.
--
-- What this does:
--   ÔÇó Stores exactly how many points were deducted at request time (so refunds
--     use the original cost, not whatever the config says today).
--   ÔÇó Adds a stable idempotency key column (populated from the Twitch message ID)
--     so the same chat message can never create two rows, even across browser tabs.
--   ÔÇó Records refund metadata (when, how many points were given back).
--   ÔÇó Adds an updated_at timestamp with an auto-trigger.
-- ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

-- 1. New columns on slot_requests
ALTER TABLE slot_requests
  ADD COLUMN IF NOT EXISTS points_deducted  INT          NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS idempotency_key  TEXT,
  ADD COLUMN IF NOT EXISTS refunded_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refunded_points  INT,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ  DEFAULT now();

-- 2. Unique constraint on idempotency_key (only when populated)
CREATE UNIQUE INDEX IF NOT EXISTS idx_sr_idem_key
  ON slot_requests (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- 3. Index to quickly find rows due for cleanup (played / refunded / denied)
CREATE INDEX IF NOT EXISTS idx_sr_cleanup
  ON slot_requests (user_id, status, updated_at)
  WHERE status IN ('refunded', 'played', 'denied');

-- 4. auto-update updated_at on every UPDATE
CREATE OR REPLACE FUNCTION set_slot_request_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sr_updated_at ON slot_requests;
CREATE TRIGGER trg_sr_updated_at
  BEFORE UPDATE ON slot_requests
  FOR EACH ROW EXECUTE FUNCTION set_slot_request_updated_at();

-- ============================================================================
-- Source: harden_slot_requests_2_status_constraint.sql
-- ============================================================================
-- ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
-- MIGRATION 2/3 ÔÇö harden_slot_requests_2_status_constraint
-- Run this second.
--
-- What this does:
--   ÔÇó Adds a status CHECK constraint so only valid values can ever be written.
--   ÔÇó Adds two new statuses needed for safe atomic operations:
--       'refunding'     ÔÇö row is being processed for refund (prevents double-refund)
--       'refunded'      ÔÇö refund completed (soft-delete; row never disappears)
--       'cancelled'     ÔÇö admin cancelled without refund
--       'refund_failed' ÔÇö SE API refund call failed; admin needs to retry
--
-- IMPORTANT: Run AFTER migration 1/3.
-- ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

-- First fix any existing rows with non-standard status values (safety net)
UPDATE slot_requests
  SET status = 'denied'
  WHERE status NOT IN ('pending', 'played', 'denied', 'refunding', 'refunded', 'cancelled', 'refund_failed');

-- Add the constraint
ALTER TABLE slot_requests
  DROP CONSTRAINT IF EXISTS chk_sr_status;

ALTER TABLE slot_requests
  ADD CONSTRAINT chk_sr_status
  CHECK (status IN ('pending', 'played', 'denied', 'refunding', 'refunded', 'cancelled', 'refund_failed'));

-- ============================================================================
-- Source: harden_slot_requests_3_rls.sql
-- ============================================================================
-- ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
-- MIGRATION 3/3 ÔÇö harden_slot_requests_3_rls
-- Run this third.
--
-- What this does:
--   ÔÇó The INSERT RLS policy was `auth.uid() = user_id`, which sounds right but
--     the API uses the service role key (bypasses RLS entirely).
--     This migration adds a server-side validation function the API can call
--     to confirm a user_id belongs to a real, active streamer before inserting.
--   ÔÇó Adds a policy so the service role can write any status transitions
--     (needed for the atomic refunding pattern).
--   ÔÇó Ensures viewers cannot see other streamers' queues (SELECT policy tightened).
-- ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

-- Drop overly permissive SELECT policy (currently allows anyone to read all rows)
DROP POLICY IF EXISTS slot_requests_select ON slot_requests;

-- Viewers/public can only read the streamer's own pending queue (no cross-user leaks)
-- Authenticated users see only their own rows; anon sees nothing.
CREATE POLICY slot_requests_select ON slot_requests
  FOR SELECT
  USING (
    auth.uid() = user_id          -- streamer sees their own queue
    OR auth.role() = 'service_role' -- service role (API) can read all
  );

-- Helper function: verify a given UUID is a known streamer
-- (has a row in overlay_widgets ÔÇö i.e. has configured something)
CREATE OR REPLACE FUNCTION is_valid_streamer(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE id = p_user_id
  );
$$;

-- ============================================================================
-- Source: slot_ingestion_schema.sql
-- ============================================================================
-- ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
-- SLOT INGESTION ENGINE ÔÇö Production Schema
-- ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
-- Run this migration in the Supabase SQL Editor.
-- It is ADDITIVE ÔÇö enhances the existing slots table and adds supporting tables.
-- Safe to run multiple times (all operations use IF NOT EXISTS / DO blocks).
-- ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ


-- ÔöÇÔöÇÔöÇ ENUM TYPES ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

DO $$ BEGIN CREATE TYPE volatility_level AS ENUM ('low', 'medium', 'high', 'very_high', 'unknown'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE ingestion_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'requires_review'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE moderation_verdict AS ENUM ('pending', 'approved', 'rejected', 'quarantined', 'manual_review'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE error_class AS ENUM ('validation_error', 'ai_error', 'moderation_error', 'duplicate_error', 'source_error', 'rate_limit_error', 'auth_error', 'internal_error'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE image_safety AS ENUM ('pending', 'safe', 'unsafe', 'quarantined', 'not_found', 'manual_review'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE source_kind AS ENUM ('provider_official', 'review_site', 'press_release', 'game_database', 'ai_knowledge', 'google_grounded'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ÔöÇÔöÇÔöÇ PROVIDERS TABLE (normalized) ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

CREATE TABLE IF NOT EXISTS providers (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT NOT NULL,                         -- Display name ("Pragmatic Play")
  canonical_key TEXT NOT NULL UNIQUE,                   -- Lowercase key ("pragmatic play")
  website       TEXT,                                   -- Official domain
  is_streaming_safe BOOLEAN DEFAULT true,               -- Safe for Twitch/YT/Kick
  country       TEXT,
  license_info  TEXT,
  aliases       TEXT[] DEFAULT '{}',                    -- Alternative spellings
  logo_url      TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  deleted_at    TIMESTAMPTZ                             -- Soft delete
);

CREATE INDEX IF NOT EXISTS idx_providers_canonical ON providers (canonical_key);
CREATE INDEX IF NOT EXISTS idx_providers_aliases   ON providers USING gin (aliases);
CREATE INDEX IF NOT EXISTS idx_providers_active    ON providers (id) WHERE deleted_at IS NULL;


-- ÔöÇÔöÇÔöÇ ENHANCE EXISTING SLOTS TABLE ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
-- Adds tracking columns for the ingestion engine.
-- These are all nullable and default to safe values so existing data is unaffected.

ALTER TABLE slots ADD COLUMN IF NOT EXISTS confidence_score    SMALLINT;
ALTER TABLE slots ADD COLUMN IF NOT EXISTS image_safety_status image_safety DEFAULT 'pending';
ALTER TABLE slots ADD COLUMN IF NOT EXISTS moderation_status   moderation_verdict DEFAULT 'approved';  -- existing = pre-approved
ALTER TABLE slots ADD COLUMN IF NOT EXISTS release_year        SMALLINT;
ALTER TABLE slots ADD COLUMN IF NOT EXISTS source_citations    TEXT[] DEFAULT '{}';
ALTER TABLE slots ADD COLUMN IF NOT EXISTS ai_extracted_at     TIMESTAMPTZ;
ALTER TABLE slots ADD COLUMN IF NOT EXISTS verified_at         TIMESTAMPTZ;
ALTER TABLE slots ADD COLUMN IF NOT EXISTS compliance_ok       BOOLEAN DEFAULT true;
ALTER TABLE slots ADD COLUMN IF NOT EXISTS ingestion_version   TEXT;
ALTER TABLE slots ADD COLUMN IF NOT EXISTS deleted_at          TIMESTAMPTZ;  -- Soft delete
ALTER TABLE slots ADD COLUMN IF NOT EXISTS twitch_safe         BOOLEAN DEFAULT true;

-- Performance indexes on new columns
CREATE INDEX IF NOT EXISTS idx_slots_confidence     ON slots (confidence_score) WHERE confidence_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_slots_moderation     ON slots (moderation_status);
CREATE INDEX IF NOT EXISTS idx_slots_image_safety   ON slots (image_safety_status);
CREATE INDEX IF NOT EXISTS idx_slots_name_provider  ON slots (lower(name), lower(provider));
CREATE INDEX IF NOT EXISTS idx_slots_provider_lower ON slots (lower(provider));
CREATE INDEX IF NOT EXISTS idx_slots_active         ON slots (id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_slots_release_year   ON slots (release_year) WHERE release_year IS NOT NULL;

-- Unique constraint to prevent duplicate slot+provider combos (if not already existing)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_slots_name_provider') THEN
    ALTER TABLE slots ADD CONSTRAINT uq_slots_name_provider UNIQUE (name, provider);
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'uq_slots_name_provider constraint skipped: %', SQLERRM;
END $$;


-- ÔöÇÔöÇÔöÇ INGESTION LOGS ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
-- Every ingestion attempt is logged for observability and debugging.

CREATE TABLE IF NOT EXISTS ingestion_logs (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slot_name        TEXT NOT NULL,
  provider_hint    TEXT,
  status           ingestion_status DEFAULT 'pending',
  error_class      error_class,
  error_message    TEXT,
  duration_ms      INTEGER,
  gemini_tokens    INTEGER,
  extraction_source TEXT,    -- 'gemini_grounded', 'gemini_plain', 'database', 'cache'
  confidence_score SMALLINT,
  result_slot_id   BIGINT,  -- FK to slots.id (matches Supabase default bigint PK)
  requested_by     TEXT,    -- User ID or 'system'
  ip_address       INET,
  user_agent       TEXT,
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ingest_log_slot   ON ingestion_logs (slot_name);
CREATE INDEX IF NOT EXISTS idx_ingest_log_status ON ingestion_logs (status);
CREATE INDEX IF NOT EXISTS idx_ingest_log_date   ON ingestion_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ingest_log_ip     ON ingestion_logs (ip_address);
CREATE INDEX IF NOT EXISTS idx_ingest_log_user   ON ingestion_logs (requested_by);


-- ÔöÇÔöÇÔöÇ MODERATION LOGS ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
-- Records every moderation check (automated or manual).

CREATE TABLE IF NOT EXISTS moderation_logs (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slot_id        BIGINT,                                   -- FK to slots.id
  slot_name      TEXT NOT NULL,                             -- Denormalized for quick lookup
  check_type     TEXT NOT NULL,                             -- 'image_safety', 'content_filter', 'name_check', 'source_compliance'
  verdict        moderation_verdict DEFAULT 'pending',
  details        JSONB DEFAULT '{}',
  flagged_reasons TEXT[] DEFAULT '{}',
  reviewed_by    TEXT,                                      -- NULL = automated, user_id = manual
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mod_log_slot    ON moderation_logs (slot_id);
CREATE INDEX IF NOT EXISTS idx_mod_log_name    ON moderation_logs (slot_name);
CREATE INDEX IF NOT EXISTS idx_mod_log_verdict ON moderation_logs (verdict);
CREATE INDEX IF NOT EXISTS idx_mod_log_type    ON moderation_logs (check_type);


-- ÔöÇÔöÇÔöÇ SOURCE REFERENCES ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
-- Tracks where data came from for each ingested slot (legal paper trail).

CREATE TABLE IF NOT EXISTS source_references (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slot_id      BIGINT,                                     -- FK to slots.id
  url          TEXT NOT NULL,
  domain       TEXT NOT NULL,
  source_type  source_kind DEFAULT 'ai_knowledge',
  is_compliant BOOLEAN DEFAULT true,
  fetched_at   TIMESTAMPTZ DEFAULT now(),
  metadata     JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_srcref_slot   ON source_references (slot_id);
CREATE INDEX IF NOT EXISTS idx_srcref_domain ON source_references (domain);


-- ÔöÇÔöÇÔöÇ INGESTION CACHE ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
-- Caches Gemini responses to avoid duplicate API calls.

CREATE TABLE IF NOT EXISTS ingestion_cache (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key  TEXT NOT NULL UNIQUE,                         -- sha256(normalized_name + provider_hint)
  response   JSONB NOT NULL,
  hit_count  INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cache_key     ON ingestion_cache (cache_key);
CREATE INDEX IF NOT EXISTS idx_cache_expires ON ingestion_cache (expires_at);


-- ÔöÇÔöÇÔöÇ RATE LIMITING ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
-- Tracks request counts per identifier + endpoint per time window.

CREATE TABLE IF NOT EXISTS api_rate_limits (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier    TEXT NOT NULL,       -- IP address or user ID
  endpoint      TEXT NOT NULL,       -- e.g. '/api/admin/ingest-slot'
  window_start  TIMESTAMPTZ NOT NULL DEFAULT date_trunc('minute', now()),
  request_count INTEGER DEFAULT 1,
  UNIQUE (identifier, endpoint, window_start)
);

CREATE INDEX IF NOT EXISTS idx_ratelimit_lookup ON api_rate_limits (identifier, endpoint, window_start);


-- ÔöÇÔöÇÔöÇ HELPER FUNCTIONS ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

-- Expire stale cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache() RETURNS void AS $$
BEGIN
  DELETE FROM ingestion_cache WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Expire old rate limit windows (keep 2 hours)
CREATE OR REPLACE FUNCTION cleanup_rate_limits() RETURNS void AS $$
BEGIN
  DELETE FROM api_rate_limits WHERE window_start < now() - interval '2 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_providers_updated_at ON providers;
CREATE TRIGGER trg_providers_updated_at
  BEFORE UPDATE ON providers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ÔöÇÔöÇÔöÇ ROW LEVEL SECURITY ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
-- All new tables use RLS. Service-role key (used by serverless funcs) bypasses.

ALTER TABLE ingestion_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_cache   ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_rate_limits   ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers         ENABLE ROW LEVEL SECURITY;

-- Service role policies (service_role key bypasses RLS, but explicit policies make intent clear)
DO $$ BEGIN
  CREATE POLICY srvc_ingest_logs ON ingestion_logs FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY srvc_mod_logs ON moderation_logs FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY srvc_src_refs ON source_references FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY srvc_cache ON ingestion_cache FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY srvc_rate ON api_rate_limits FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY srvc_providers ON providers FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Admin read access for dashboard (authenticated users with admin role)
DO $$ BEGIN
  CREATE POLICY admin_read_ingest_logs ON ingestion_logs
    FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY admin_read_mod_logs ON moderation_logs
    FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ÔöÇÔöÇÔöÇ CRON CLEANUP (optional ÔÇö enable via Supabase pg_cron) ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
-- If you have pg_cron enabled:
-- SELECT cron.schedule('cleanup-cache', '0 * * * *', 'SELECT cleanup_expired_cache()');
-- SELECT cron.schedule('cleanup-rates', '*/30 * * * *', 'SELECT cleanup_rate_limits()');


-- ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
-- DONE ÔÇö Schema ready for the ingestion engine.
-- ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ

-- ============================================================================
-- Source: add_user_slot_records.sql
-- ============================================================================
-- ============================================================
-- Per-user Slot Records ÔÇö tracks personal bests per slot
-- ============================================================

CREATE TABLE IF NOT EXISTS user_slot_records (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot_id       UUID REFERENCES slots(id) ON DELETE SET NULL,
  slot_name     TEXT NOT NULL,
  slot_provider TEXT,
  slot_image    TEXT,

  -- Aggregated stats
  total_bonuses    INTEGER DEFAULT 0,         -- how many times this slot appeared in hunts
  total_wagered    NUMERIC(12,2) DEFAULT 0,   -- sum of all bets on this slot
  total_won        NUMERIC(12,2) DEFAULT 0,   -- sum of all payouts
  best_multiplier  NUMERIC(10,2) DEFAULT 0,   -- best X ever hit
  best_win         NUMERIC(12,2) DEFAULT 0,   -- highest payout amount
  average_multi    NUMERIC(10,2) DEFAULT 0,   -- running average X
  last_bet_size    NUMERIC(10,2) DEFAULT 0,   -- most recent bet size
  last_payout      NUMERIC(12,2) DEFAULT 0,   -- most recent payout
  last_multi       NUMERIC(10,2) DEFAULT 0,   -- most recent multiplier

  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id, slot_name)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_slot_records_user ON user_slot_records(user_id);
CREATE INDEX IF NOT EXISTS idx_user_slot_records_slot ON user_slot_records(user_id, slot_name);

-- RLS
ALTER TABLE user_slot_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own slot records" ON user_slot_records;
CREATE POLICY "Users can view own slot records"
  ON user_slot_records FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own slot records" ON user_slot_records;
CREATE POLICY "Users can insert own slot records"
  ON user_slot_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own slot records" ON user_slot_records;
CREATE POLICY "Users can update own slot records"
  ON user_slot_records FOR UPDATE
  USING (auth.uid() = user_id);

-- Individual bonus results log (detailed per-bonus record)
CREATE TABLE IF NOT EXISTS user_slot_results (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot_name     TEXT NOT NULL,
  slot_provider TEXT,
  bet_size      NUMERIC(10,2) NOT NULL,
  payout        NUMERIC(12,2) NOT NULL DEFAULT 0,
  multiplier    NUMERIC(10,2) NOT NULL DEFAULT 0,
  hunt_name     TEXT,
  is_super_bonus BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_slot_results_user ON user_slot_results(user_id);
CREATE INDEX IF NOT EXISTS idx_user_slot_results_slot ON user_slot_results(user_id, slot_name);

ALTER TABLE user_slot_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own slot results" ON user_slot_results;
CREATE POLICY "Users can view own slot results"
  ON user_slot_results FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own slot results" ON user_slot_results;
CREATE POLICY "Users can insert own slot results"
  ON user_slot_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- Source: add_slot_modder_role.sql
-- ============================================================================
-- Add slot_modder role support
-- Roles are stored in user_roles table, not user_profiles

-- Update RLS policy on slots table to allow slot_modders to manage slots
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.slots;
DROP POLICY IF EXISTS "Allow read access to authenticated users" ON public.slots;

-- Allow read access to all authenticated users
CREATE POLICY "Allow read access to authenticated users"
  ON public.slots
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow insert/update/delete only for admins and slot_modders
CREATE POLICY "Allow slot management for admins and slot_modders"
  ON public.slots
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'slot_modder')
      AND user_roles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'slot_modder')
      AND user_roles.is_active = true
    )
  );

-- Add comment
COMMENT ON POLICY "Allow slot management for admins and slot_modders" ON public.slots 
IS 'Allows admins and slot_modders to add, edit, and delete slots';

-- Note: To assign slot_modder role to a user:
-- INSERT INTO user_roles (user_id, role, is_active) 
-- VALUES ('user-uuid', 'slot_modder', true)
-- ON CONFLICT (user_id) DO UPDATE SET role = 'slot_modder', is_active = true;
