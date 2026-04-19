-- ═══════════════════════════════════════════════════════════════════
-- STREAMER API KEYS — Allow external websites to read overlay data
-- 
-- This gives each approved streamer an API key they can embed on
-- their own website. The key only grants READ access to their
-- own bonus_hunt / overlay widget data.
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. API Keys table ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS streamer_api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  label TEXT DEFAULT 'My Website',
  allowed_origins TEXT[] DEFAULT '{}',     -- CORS origins, e.g. {'https://mysite.com'}
  is_active BOOLEAN DEFAULT true,
  rate_limit_per_min INT DEFAULT 60,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  UNIQUE(user_id)  -- one key per user (can regenerate)
);

CREATE INDEX IF NOT EXISTS idx_api_keys_key ON streamer_api_keys(api_key);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON streamer_api_keys(user_id);

-- ─── 2. RLS ─────────────────────────────────────────────────────

ALTER TABLE streamer_api_keys ENABLE ROW LEVEL SECURITY;

-- Users can manage their own key
CREATE POLICY "Users manage own API key"
  ON streamer_api_keys FOR ALL
  USING (auth.uid() = user_id);

-- Admin can see all keys (for approval / revocation)
CREATE POLICY "Admin can view all API keys"
  ON streamer_api_keys FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
        AND user_roles.is_active = true
    )
  );

-- Admin can update any key (activate/deactivate)
CREATE POLICY "Admin can update all API keys"
  ON streamer_api_keys FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
        AND user_roles.is_active = true
    )
  );

-- ─── 3. Feature access table (who can use the API feature) ──────

CREATE TABLE IF NOT EXISTS streamer_api_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

ALTER TABLE streamer_api_access ENABLE ROW LEVEL SECURITY;

-- Users can read their own access status
CREATE POLICY "Users see own API access"
  ON streamer_api_access FOR SELECT
  USING (auth.uid() = user_id);

-- Admin full control
CREATE POLICY "Admin manages API access"
  ON streamer_api_access FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
        AND user_roles.is_active = true
    )
  );

-- ─── 4. RPC: Validate API key and return user_id ────────────────

CREATE OR REPLACE FUNCTION validate_api_key(p_api_key TEXT)
RETURNS TABLE(user_id UUID, allowed_origins TEXT[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update last_used_at
  UPDATE streamer_api_keys
  SET last_used_at = now()
  WHERE api_key = p_api_key AND is_active = true;

  RETURN QUERY
  SELECT ak.user_id, ak.allowed_origins
  FROM streamer_api_keys ak
  JOIN streamer_api_access aa ON aa.user_id = ak.user_id AND aa.is_active = true
  WHERE ak.api_key = p_api_key
    AND ak.is_active = true;
END;
$$;

GRANT EXECUTE ON FUNCTION validate_api_key(TEXT) TO anon, authenticated;

-- ─── 5. Verification ───────────────────────────────────────────

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'streamer_api_keys' 
ORDER BY ordinal_position;

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'streamer_api_access' 
ORDER BY ordinal_position;
