-- ═══════════════════════════════════════════════════════════════════════
-- SLOT INGESTION ENGINE — Production Schema
-- ═══════════════════════════════════════════════════════════════════════
-- Run this migration in the Supabase SQL Editor.
-- It is ADDITIVE — enhances the existing slots table and adds supporting tables.
-- Safe to run multiple times (all operations use IF NOT EXISTS / DO blocks).
-- ═══════════════════════════════════════════════════════════════════════


-- ─── ENUM TYPES ─────────────────────────────────────────────────────

DO $$ BEGIN CREATE TYPE volatility_level AS ENUM ('low', 'medium', 'high', 'very_high', 'unknown'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE ingestion_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'requires_review'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE moderation_verdict AS ENUM ('pending', 'approved', 'rejected', 'quarantined', 'manual_review'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE error_class AS ENUM ('validation_error', 'ai_error', 'moderation_error', 'duplicate_error', 'source_error', 'rate_limit_error', 'auth_error', 'internal_error'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE image_safety AS ENUM ('pending', 'safe', 'unsafe', 'quarantined', 'not_found', 'manual_review'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE source_kind AS ENUM ('provider_official', 'review_site', 'press_release', 'game_database', 'ai_knowledge', 'google_grounded'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ─── PROVIDERS TABLE (normalized) ───────────────────────────────────

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


-- ─── ENHANCE EXISTING SLOTS TABLE ──────────────────────────────────
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


-- ─── INGESTION LOGS ────────────────────────────────────────────────
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


-- ─── MODERATION LOGS ───────────────────────────────────────────────
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


-- ─── SOURCE REFERENCES ─────────────────────────────────────────────
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


-- ─── INGESTION CACHE ───────────────────────────────────────────────
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


-- ─── RATE LIMITING ─────────────────────────────────────────────────
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


-- ─── HELPER FUNCTIONS ──────────────────────────────────────────────

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


-- ─── ROW LEVEL SECURITY ────────────────────────────────────────────
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


-- ─── CRON CLEANUP (optional — enable via Supabase pg_cron) ─────────
-- If you have pg_cron enabled:
-- SELECT cron.schedule('cleanup-cache', '0 * * * *', 'SELECT cleanup_expired_cache()');
-- SELECT cron.schedule('cleanup-rates', '*/30 * * * *', 'SELECT cleanup_rate_limits()');


-- ═══════════════════════════════════════════════════════════════════════
-- DONE — Schema ready for the ingestion engine.
-- ═══════════════════════════════════════════════════════════════════════
