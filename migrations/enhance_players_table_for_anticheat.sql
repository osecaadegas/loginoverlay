-- Enhance Players Table - Add anti-cheat and tracking columns
ALTER TABLE the_life_players 
ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100);

ALTER TABLE the_life_players 
ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT FALSE;

ALTER TABLE the_life_players 
ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;

ALTER TABLE the_life_players 
ADD COLUMN IF NOT EXISTS ban_reason TEXT;

ALTER TABLE the_life_players 
ADD COLUMN IF NOT EXISTS banned_until TIMESTAMPTZ;

ALTER TABLE the_life_players 
ADD COLUMN IF NOT EXISTS banned_by INTEGER REFERENCES admin_users(id) ON DELETE SET NULL;

ALTER TABLE the_life_players 
ADD COLUMN IF NOT EXISTS total_playtime_seconds BIGINT DEFAULT 0;

ALTER TABLE the_life_players 
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE the_life_players 
ADD COLUMN IF NOT EXISTS account_created_ip INET;

ALTER TABLE the_life_players 
ADD COLUMN IF NOT EXISTS device_fingerprint VARCHAR(255);

ALTER TABLE the_life_players 
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;

ALTER TABLE the_life_players 
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_players_risk_score ON the_life_players(risk_score DESC) WHERE risk_score > 0;
CREATE INDEX IF NOT EXISTS idx_players_flagged ON the_life_players(is_flagged) WHERE is_flagged = TRUE;
CREATE INDEX IF NOT EXISTS idx_players_banned ON the_life_players(is_banned) WHERE is_banned = TRUE;
CREATE INDEX IF NOT EXISTS idx_players_device_fingerprint ON the_life_players(device_fingerprint) WHERE device_fingerprint IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_players_last_activity ON the_life_players(last_activity_at DESC);

-- Comments
COMMENT ON COLUMN the_life_players.risk_score IS 'Calculated risk score from 0-100 (synced from player_risk_scores table)';
COMMENT ON COLUMN the_life_players.is_flagged IS 'Quick check if player has been flagged by anti-cheat';
COMMENT ON COLUMN the_life_players.banned_until IS 'NULL = permanent ban, timestamp = temporary ban';
COMMENT ON COLUMN the_life_players.device_fingerprint IS 'Browser/device fingerprint for multi-account detection';

