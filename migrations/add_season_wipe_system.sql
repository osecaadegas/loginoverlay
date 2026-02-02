-- =====================================================
-- THE LIFE - COMPLETE SEASON WIPE SYSTEM
-- A secure, transactional, auditable wipe procedure
-- =====================================================

-- =====================================================
-- PART 1: WIPE HISTORY & AUDIT TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS the_life_wipe_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who initiated
  admin_user_id UUID NOT NULL REFERENCES auth.users(id),
  admin_email TEXT NOT NULL,
  admin_ip INET,
  
  -- What was wiped
  wipe_type TEXT NOT NULL,  -- 'full_season', 'partial', 'rollback', 'test'
  season_number INTEGER,
  season_name TEXT,
  
  -- Stats before wipe
  total_players_affected INTEGER,
  pre_wipe_snapshot JSONB DEFAULT '{}',  -- Sample of stats before
  
  -- Stats after wipe
  tables_wiped JSONB DEFAULT '[]',  -- Array of {table, rows_deleted, rows_updated}
  errors_encountered JSONB DEFAULT '[]',
  
  -- Status
  status TEXT DEFAULT 'pending',  -- 'pending', 'in_progress', 'completed', 'failed', 'rolled_back'
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  
  -- Security
  passphrase_hash TEXT NOT NULL,  -- SHA256 of the passphrase used
  confirmation_code TEXT NOT NULL,  -- Random code that must be entered
  
  -- Backup info
  backup_created BOOLEAN DEFAULT false,
  backup_location TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wipe_history_status ON the_life_wipe_history(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wipe_history_admin ON the_life_wipe_history(admin_user_id, created_at DESC);

ALTER TABLE the_life_wipe_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "No direct access to wipe history" ON the_life_wipe_history;
CREATE POLICY "No direct access to wipe history" ON the_life_wipe_history FOR ALL USING (false);


-- =====================================================
-- PART 2: WIPE LOCK TABLE (Prevent race conditions)
-- =====================================================
CREATE TABLE IF NOT EXISTS the_life_system_locks (
  lock_name TEXT PRIMARY KEY,
  locked_by UUID REFERENCES auth.users(id),
  locked_at TIMESTAMPTZ,
  lock_reason TEXT,
  expires_at TIMESTAMPTZ,
  is_locked BOOLEAN DEFAULT false
);

-- Insert default locks
INSERT INTO the_life_system_locks (lock_name, is_locked) VALUES
  ('season_wipe', false),
  ('maintenance_mode', false),
  ('player_actions', false)
ON CONFLICT (lock_name) DO NOTHING;


-- =====================================================
-- PART 3: BACKUP SNAPSHOT TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS the_life_wipe_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wipe_id UUID REFERENCES the_life_wipe_history(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  row_count INTEGER,
  backup_data JSONB,  -- For small tables or samples
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wipe_backups_wipe ON the_life_wipe_backups(wipe_id);


-- =====================================================
-- PART 4: TABLE CLASSIFICATION
-- Categorize all tables for wipe strategy
-- =====================================================

-- This documents which tables to wipe and how
CREATE TABLE IF NOT EXISTS the_life_wipe_table_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT UNIQUE NOT NULL,
  wipe_action TEXT NOT NULL,  -- 'DELETE', 'UPDATE_DEFAULTS', 'TRUNCATE', 'PRESERVE'
  wipe_order INTEGER NOT NULL,  -- Order of operations (children first)
  default_values JSONB DEFAULT '{}',  -- For UPDATE_DEFAULTS
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert table configurations
-- ORDER MATTERS: Delete children before parents to respect FKs
INSERT INTO the_life_wipe_table_config (table_name, wipe_action, wipe_order, default_values, description) VALUES
  -- === CHILD TABLES (Delete first - Order 1-20) ===
  
  -- Inventory & Items (order 1-5)
  ('the_life_player_inventory', 'DELETE', 1, '{}', 'Player item inventory'),
  ('the_life_dock_shipments', 'DELETE', 2, '{}', 'Player dock shipments'),
  ('the_life_dock_deliveries', 'DELETE', 2, '{}', 'Player dock deliveries'),
  
  -- Business Productions (order 3-5)
  ('the_life_business_productions', 'DELETE', 3, '{}', 'Active business productions'),
  ('the_life_player_businesses', 'DELETE', 4, '{}', 'Player-owned businesses'),
  
  -- Workers (order 5)
  ('the_life_player_brothel_workers', 'DELETE', 5, '{}', 'Player brothel workers'),
  ('the_life_player_workers', 'DELETE', 5, '{}', 'Player generic workers'),
  
  -- PVP & Chat (order 6-8)
  ('the_life_pvp_logs', 'DELETE', 6, '{}', 'PVP battle history'),
  ('the_life_pvp_chat', 'DELETE', 7, '{}', 'PVP area chat'),
  ('the_life_pvp_presence', 'DELETE', 8, '{}', 'Online presence data'),
  
  -- Crime History (order 9)
  ('the_life_robbery_history', 'DELETE', 9, '{}', 'Crime attempt history'),
  
  -- Legacy Tables (order 10)
  ('the_life_brothels', 'DELETE', 10, '{}', 'Legacy brothel data'),
  ('the_life_drug_ops', 'DELETE', 10, '{}', 'Legacy drug operations'),
  
  -- Market (order 11)
  ('the_life_market_transactions', 'DELETE', 11, '{}', 'Market transaction history'),
  ('the_life_market_listings', 'DELETE', 12, '{}', 'Active market listings'),
  
  -- Stocks (order 13)
  ('the_life_stock_transactions', 'DELETE', 13, '{}', 'Stock trade history'),
  ('the_life_stock_portfolios', 'DELETE', 14, '{}', 'Player stock holdings'),
  ('the_life_player_stocks', 'DELETE', 14, '{}', 'Player stocks (alt table)'),
  
  -- Casino (order 15)
  ('roulette_bets', 'DELETE', 15, '{}', 'Active roulette bets'),
  ('roulette_history', 'DELETE', 15, '{}', 'Roulette game history'),
  ('roulette_player_stats', 'DELETE', 15, '{}', 'Roulette player statistics'),
  ('casino_chat', 'DELETE', 16, '{}', 'Casino chat messages'),
  ('casino_seats', 'DELETE', 17, '{}', 'Casino table seats'),
  ('casino_tables', 'DELETE', 18, '{}', 'Casino table instances'),
  
  -- News Feed (order 19)
  ('the_life_news_feed', 'DELETE', 19, '{}', 'In-game news/events'),
  
  -- Cooldowns (order 20)
  ('the_life_action_cooldowns', 'DELETE', 20, '{}', 'Action cooldown timers'),
  
  -- === METRICS TABLES (Order 25) ===
  -- These track player activity - should be wiped but NOT the flag history
  ('the_life_player_metrics', 'DELETE', 25, '{}', 'Daily player metrics'),
  
  -- === SECURITY LOGS (Order 30 - PRESERVE but mark as pre-wipe) ===
  ('the_life_security_logs', 'PRESERVE', 30, '{}', 'Security audit logs - NEVER DELETE'),
  
  -- === PLAYER FLAGS (Order 31 - PRESERVE ban history) ===
  ('the_life_player_flags', 'PRESERVE', 31, '{}', 'Player flags/bans - NEVER DELETE'),
  
  -- === MAIN PLAYER TABLE (Order 50 - Reset to defaults) ===
  ('the_life_players', 'UPDATE_DEFAULTS', 50, '{
    "xp": 0,
    "level": 1,
    "hp": 100,
    "max_hp": 100,
    "stamina": 100,
    "max_stamina": 100,
    "cash": 500,
    "bank_balance": 0,
    "jail_until": null,
    "hospital_until": null,
    "last_stamina_refill": "NOW()",
    "last_daily_bonus": null,
    "consecutive_logins": 0,
    "total_robberies": 0,
    "successful_robberies": 0,
    "daily_catches": 0,
    "last_catch_reset": null,
    "total_times_caught": 0,
    "pvp_wins": 0,
    "pvp_losses": 0,
    "power": 0,
    "intelligence": 0,
    "defense": 0,
    "addiction": 0,
    "equipped_weapon_id": null,
    "equipped_gear_id": null
  }', 'Main player table - reset stats, keep identity'),
  
  -- === CONFIG TABLES (Order 100 - PRESERVE) ===
  ('the_life_items', 'PRESERVE', 100, '{}', 'Item definitions'),
  ('the_life_businesses', 'PRESERVE', 100, '{}', 'Business templates'),
  ('the_life_robberies', 'PRESERVE', 100, '{}', 'Crime definitions'),
  ('the_life_brothel_workers', 'PRESERVE', 100, '{}', 'Worker templates'),
  ('the_life_rate_limits', 'PRESERVE', 100, '{}', 'Rate limit config'),
  ('the_life_store_items', 'PRESERVE', 100, '{}', 'Store catalog'),
  ('the_life_avatars', 'PRESERVE', 100, '{}', 'Avatar options'),
  ('the_life_event_messages', 'PRESERVE', 100, '{}', 'Event messages'),
  ('the_life_category_info', 'PRESERVE', 100, '{}', 'Category info'),
  ('the_life_dock_boats', 'PRESERVE', 100, '{}', 'Dock boat schedules'),
  ('the_life_crime_drops', 'PRESERVE', 100, '{}', 'Crime item drops'),
  ('the_life_business_required_items', 'PRESERVE', 100, '{}', 'Business recipes')
  
ON CONFLICT (table_name) DO UPDATE SET
  wipe_action = EXCLUDED.wipe_action,
  wipe_order = EXCLUDED.wipe_order,
  default_values = EXCLUDED.default_values,
  description = EXCLUDED.description;


-- =====================================================
-- PART 5: ADMIN VERIFICATION FUNCTION
-- Verify admin has proper permissions
-- =====================================================
CREATE OR REPLACE FUNCTION verify_wipe_admin(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
  v_roles TEXT[];
  v_is_admin BOOLEAN := false;
BEGIN
  -- Get user info
  SELECT 
    u.id,
    u.email,
    u.raw_user_meta_data->>'role' as role,
    u.created_at
  INTO v_user
  FROM auth.users u
  WHERE u.id = p_user_id;
  
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('authorized', false, 'reason', 'User not found');
  END IF;
  
  -- Check if user has admin role
  -- Check multiple possible admin indicators
  v_is_admin := (
    v_user.role = 'admin' OR
    v_user.role = 'super_admin' OR
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = p_user_id 
      AND role IN ('admin', 'super_admin', 'owner')
    )
  );
  
  IF NOT v_is_admin THEN
    RETURN jsonb_build_object(
      'authorized', false, 
      'reason', 'User is not an admin',
      'user_email', v_user.email
    );
  END IF;
  
  -- Check account age (admin should exist for at least 7 days)
  IF v_user.created_at > NOW() - INTERVAL '7 days' THEN
    RETURN jsonb_build_object(
      'authorized', false,
      'reason', 'Admin account too new (must be 7+ days old)',
      'account_age_days', EXTRACT(days FROM NOW() - v_user.created_at)
    );
  END IF;
  
  RETURN jsonb_build_object(
    'authorized', true,
    'user_id', v_user.id,
    'email', v_user.email,
    'role', v_user.role
  );
END;
$$;


-- =====================================================
-- PART 6: ACQUIRE SYSTEM LOCK
-- Prevent concurrent operations
-- =====================================================
CREATE OR REPLACE FUNCTION acquire_wipe_lock(
  p_admin_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lock RECORD;
BEGIN
  -- Check current lock status
  SELECT * INTO v_lock
  FROM the_life_system_locks
  WHERE lock_name = 'season_wipe'
  FOR UPDATE;  -- Lock the row
  
  IF v_lock.is_locked AND v_lock.expires_at > NOW() THEN
    RETURN jsonb_build_object(
      'acquired', false,
      'reason', 'System is already locked',
      'locked_by', v_lock.locked_by,
      'locked_at', v_lock.locked_at,
      'expires_at', v_lock.expires_at
    );
  END IF;
  
  -- Acquire lock (30 minute expiry as safety)
  UPDATE the_life_system_locks
  SET 
    is_locked = true,
    locked_by = p_admin_id,
    locked_at = NOW(),
    lock_reason = p_reason,
    expires_at = NOW() + INTERVAL '30 minutes'
  WHERE lock_name = 'season_wipe';
  
  -- Also lock player actions
  UPDATE the_life_system_locks
  SET 
    is_locked = true,
    locked_by = p_admin_id,
    locked_at = NOW(),
    lock_reason = 'Season wipe in progress',
    expires_at = NOW() + INTERVAL '30 minutes'
  WHERE lock_name = 'player_actions';
  
  RETURN jsonb_build_object(
    'acquired', true,
    'locked_at', NOW(),
    'expires_at', NOW() + INTERVAL '30 minutes'
  );
END;
$$;


-- =====================================================
-- PART 7: RELEASE SYSTEM LOCK
-- =====================================================
CREATE OR REPLACE FUNCTION release_wipe_lock(p_admin_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE the_life_system_locks
  SET is_locked = false, locked_by = NULL, locked_at = NULL, expires_at = NULL
  WHERE lock_name IN ('season_wipe', 'player_actions')
    AND (locked_by = p_admin_id OR expires_at < NOW());
END;
$$;


-- =====================================================
-- PART 8: CHECK IF SYSTEM IS LOCKED
-- Call this before any player action
-- =====================================================
CREATE OR REPLACE FUNCTION is_system_locked()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM the_life_system_locks
    WHERE lock_name = 'player_actions'
    AND is_locked = true
    AND expires_at > NOW()
  );
END;
$$;

-- Grant to authenticated users so they can check
GRANT EXECUTE ON FUNCTION is_system_locked() TO authenticated;


-- =====================================================
-- PART 9: CREATE PRE-WIPE BACKUP
-- Snapshot critical data before wipe
-- =====================================================
CREATE OR REPLACE FUNCTION create_wipe_backup(p_wipe_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_table RECORD;
  v_sample JSONB;
  v_count INTEGER;
  v_backed_up INTEGER := 0;
BEGIN
  -- Backup player stats summary
  INSERT INTO the_life_wipe_backups (wipe_id, table_name, row_count, backup_data)
  SELECT 
    p_wipe_id,
    'the_life_players_summary',
    COUNT(*),
    jsonb_build_object(
      'total_players', COUNT(*),
      'total_xp', SUM(xp),
      'total_cash', SUM(cash),
      'total_bank', SUM(bank_balance),
      'max_level', MAX(level),
      'avg_level', AVG(level),
      'level_distribution', (
        SELECT jsonb_object_agg(level_group, cnt)
        FROM (
          SELECT 
            CASE 
              WHEN level < 10 THEN '1-9'
              WHEN level < 50 THEN '10-49'
              WHEN level < 100 THEN '50-99'
              ELSE '100+'
            END as level_group,
            COUNT(*) as cnt
          FROM the_life_players
          GROUP BY 1
        ) ld
      )
    )
  FROM the_life_players;
  v_backed_up := v_backed_up + 1;
  
  -- Backup top 100 players (for potential dispute resolution)
  INSERT INTO the_life_wipe_backups (wipe_id, table_name, row_count, backup_data)
  SELECT 
    p_wipe_id,
    'the_life_players_top100',
    100,
    jsonb_agg(row_to_json(p))
  FROM (
    SELECT id, user_id, level, xp, cash, bank_balance, total_robberies, pvp_wins
    FROM the_life_players
    ORDER BY level DESC, xp DESC
    LIMIT 100
  ) p;
  v_backed_up := v_backed_up + 1;
  
  -- Backup inventory summary
  INSERT INTO the_life_wipe_backups (wipe_id, table_name, row_count, backup_data)
  SELECT 
    p_wipe_id,
    'the_life_player_inventory_summary',
    COUNT(*),
    jsonb_build_object(
      'total_items', SUM(quantity),
      'unique_items', COUNT(DISTINCT item_id),
      'items_by_player', COUNT(DISTINCT player_id)
    )
  FROM the_life_player_inventory;
  v_backed_up := v_backed_up + 1;
  
  -- Backup business ownership summary
  INSERT INTO the_life_wipe_backups (wipe_id, table_name, row_count, backup_data)
  SELECT 
    p_wipe_id,
    'the_life_player_businesses_summary',
    COUNT(*),
    jsonb_build_object(
      'total_businesses', COUNT(*),
      'total_earnings', SUM(total_earned),
      'unique_owners', COUNT(DISTINCT player_id)
    )
  FROM the_life_player_businesses;
  v_backed_up := v_backed_up + 1;
  
  -- Update wipe record
  UPDATE the_life_wipe_history
  SET backup_created = true, backup_location = 'the_life_wipe_backups'
  WHERE id = p_wipe_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'tables_backed_up', v_backed_up,
    'wipe_id', p_wipe_id
  );
END;
$$;


-- =====================================================
-- PART 10: INITIATE WIPE (Step 1 - Generate confirmation)
-- =====================================================
CREATE OR REPLACE FUNCTION initiate_season_wipe(
  p_passphrase TEXT,
  p_season_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_check JSONB;
  v_wipe_id UUID;
  v_confirmation_code TEXT;
  v_passphrase_hash TEXT;
  v_player_count INTEGER;
  v_current_season INTEGER;
BEGIN
  -- 1. Verify admin permissions
  v_admin_check := verify_wipe_admin(auth.uid());
  IF NOT (v_admin_check->>'authorized')::BOOLEAN THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', v_admin_check->>'reason',
      'step', 'admin_verification'
    );
  END IF;
  
  -- 2. Validate passphrase (minimum 16 characters)
  IF LENGTH(p_passphrase) < 16 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Passphrase must be at least 16 characters',
      'step', 'passphrase_validation'
    );
  END IF;
  
  -- 3. Check for recent wipes (rate limit - max 1 per 24 hours)
  IF EXISTS (
    SELECT 1 FROM the_life_wipe_history
    WHERE status IN ('completed', 'in_progress')
    AND created_at > NOW() - INTERVAL '24 hours'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'A wipe was performed in the last 24 hours. Wait before trying again.',
      'step', 'rate_limit'
    );
  END IF;
  
  -- 4. Get current stats
  SELECT COUNT(*) INTO v_player_count FROM the_life_players;
  SELECT COALESCE(MAX(season_number), 0) + 1 INTO v_current_season FROM the_life_wipe_history WHERE status = 'completed';
  
  -- 5. Generate confirmation code (8 random alphanumeric)
  v_confirmation_code := UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 8));
  v_passphrase_hash := encode(sha256(p_passphrase::BYTEA), 'hex');
  
  -- 6. Create wipe record (pending state)
  INSERT INTO the_life_wipe_history (
    admin_user_id, admin_email,
    wipe_type, season_number, season_name,
    total_players_affected,
    pre_wipe_snapshot,
    status, passphrase_hash, confirmation_code
  )
  SELECT
    auth.uid(),
    (v_admin_check->>'email')::TEXT,
    'full_season',
    v_current_season,
    COALESCE(p_season_name, 'Season ' || v_current_season),
    v_player_count,
    jsonb_build_object(
      'player_count', v_player_count,
      'initiated_at', NOW(),
      'admin_email', v_admin_check->>'email'
    ),
    'pending',
    v_passphrase_hash,
    v_confirmation_code
  RETURNING id INTO v_wipe_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'wipe_id', v_wipe_id,
    'confirmation_code', v_confirmation_code,
    'season_number', v_current_season,
    'players_affected', v_player_count,
    'message', 'Wipe initiated. You must confirm within 5 minutes.',
    'expires_at', NOW() + INTERVAL '5 minutes',
    'next_step', 'Call confirm_season_wipe with wipe_id, confirmation_code, and passphrase'
  );
END;
$$;


-- =====================================================
-- PART 11: CONFIRM & EXECUTE WIPE (Step 2)
-- =====================================================
CREATE OR REPLACE FUNCTION confirm_season_wipe(
  p_wipe_id UUID,
  p_confirmation_code TEXT,
  p_passphrase TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wipe RECORD;
  v_admin_check JSONB;
  v_lock_result JSONB;
  v_table_config RECORD;
  v_rows_affected INTEGER;
  v_tables_wiped JSONB := '[]'::JSONB;
  v_errors JSONB := '[]'::JSONB;
  v_start_time TIMESTAMPTZ;
  v_passphrase_hash TEXT;
BEGIN
  v_start_time := clock_timestamp();
  v_passphrase_hash := encode(sha256(p_passphrase::BYTEA), 'hex');
  
  -- 1. Get and validate wipe record
  SELECT * INTO v_wipe
  FROM the_life_wipe_history
  WHERE id = p_wipe_id
  FOR UPDATE;  -- Lock the record
  
  IF v_wipe IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wipe record not found');
  END IF;
  
  IF v_wipe.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wipe is not in pending status: ' || v_wipe.status);
  END IF;
  
  IF v_wipe.created_at < NOW() - INTERVAL '5 minutes' THEN
    UPDATE the_life_wipe_history SET status = 'failed', completed_at = NOW() WHERE id = p_wipe_id;
    RETURN jsonb_build_object('success', false, 'error', 'Wipe confirmation expired (5 minute limit)');
  END IF;
  
  -- 2. Validate confirmation code
  IF UPPER(p_confirmation_code) != v_wipe.confirmation_code THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid confirmation code');
  END IF;
  
  -- 3. Validate passphrase
  IF v_passphrase_hash != v_wipe.passphrase_hash THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid passphrase');
  END IF;
  
  -- 4. Re-verify admin (in case permissions changed)
  v_admin_check := verify_wipe_admin(auth.uid());
  IF NOT (v_admin_check->>'authorized')::BOOLEAN THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin verification failed: ' || (v_admin_check->>'reason'));
  END IF;
  
  -- 5. Must be same admin who initiated
  IF v_wipe.admin_user_id != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wipe must be confirmed by the same admin who initiated it');
  END IF;
  
  -- 6. Acquire system lock
  v_lock_result := acquire_wipe_lock(auth.uid(), 'Season wipe in progress');
  IF NOT (v_lock_result->>'acquired')::BOOLEAN THEN
    RETURN jsonb_build_object('success', false, 'error', 'Could not acquire system lock', 'details', v_lock_result);
  END IF;
  
  -- 7. Update status to in_progress
  UPDATE the_life_wipe_history
  SET status = 'in_progress', started_at = NOW()
  WHERE id = p_wipe_id;
  
  -- 8. Create backup
  PERFORM create_wipe_backup(p_wipe_id);
  
  -- 9. Execute wipe in order
  BEGIN
    FOR v_table_config IN
      SELECT * FROM the_life_wipe_table_config
      WHERE is_active = true AND wipe_action != 'PRESERVE'
      ORDER BY wipe_order ASC
    LOOP
      BEGIN
        IF v_table_config.wipe_action = 'DELETE' THEN
          -- Delete all rows
          EXECUTE format('DELETE FROM %I', v_table_config.table_name);
          GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
          
        ELSIF v_table_config.wipe_action = 'TRUNCATE' THEN
          -- Truncate (faster but no triggers)
          EXECUTE format('TRUNCATE TABLE %I CASCADE', v_table_config.table_name);
          v_rows_affected := -1;  -- Unknown for truncate
          
        ELSIF v_table_config.wipe_action = 'UPDATE_DEFAULTS' THEN
          -- Reset to default values
          UPDATE the_life_players SET
            xp = 0,
            level = 1,
            hp = 100,
            max_hp = 100,
            stamina = 100,
            max_stamina = 100,
            cash = 500,
            bank_balance = 0,
            jail_until = NULL,
            hospital_until = NULL,
            last_stamina_refill = NOW(),
            last_daily_bonus = NULL,
            consecutive_logins = 0,
            total_robberies = 0,
            successful_robberies = 0,
            daily_catches = 0,
            last_catch_reset = NULL,
            total_times_caught = 0,
            pvp_wins = 0,
            pvp_losses = 0,
            power = 0,
            intelligence = 0,
            defense = 0,
            addiction = 0,
            equipped_weapon_id = NULL,
            equipped_gear_id = NULL,
            updated_at = NOW()
          WHERE v_table_config.table_name = 'the_life_players';
          GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
        END IF;
        
        v_tables_wiped := v_tables_wiped || jsonb_build_object(
          'table', v_table_config.table_name,
          'action', v_table_config.wipe_action,
          'rows_affected', v_rows_affected,
          'success', true
        );
        
      EXCEPTION WHEN OTHERS THEN
        v_errors := v_errors || jsonb_build_object(
          'table', v_table_config.table_name,
          'error', SQLERRM,
          'sqlstate', SQLSTATE
        );
      END;
    END LOOP;
    
    -- 10. Log wipe event in security logs
    INSERT INTO the_life_security_logs (
      user_id, event_type, action_name, severity,
      metadata, is_flagged, flag_reason
    ) VALUES (
      auth.uid(),
      'season_wipe',
      'full_wipe',
      'critical',
      jsonb_build_object(
        'wipe_id', p_wipe_id,
        'season_number', v_wipe.season_number,
        'players_affected', v_wipe.total_players_affected,
        'tables_wiped', v_tables_wiped
      ),
      true,
      'Season wipe executed'
    );
    
    -- 11. Update wipe record as completed
    UPDATE the_life_wipe_history
    SET 
      status = CASE WHEN jsonb_array_length(v_errors) > 0 THEN 'completed_with_errors' ELSE 'completed' END,
      completed_at = NOW(),
      duration_ms = EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER,
      tables_wiped = v_tables_wiped,
      errors_encountered = v_errors
    WHERE id = p_wipe_id;
    
  EXCEPTION WHEN OTHERS THEN
    -- Rollback and record failure
    UPDATE the_life_wipe_history
    SET 
      status = 'failed',
      completed_at = NOW(),
      errors_encountered = jsonb_build_array(jsonb_build_object('fatal_error', SQLERRM, 'sqlstate', SQLSTATE))
    WHERE id = p_wipe_id;
    
    PERFORM release_wipe_lock(auth.uid());
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Wipe failed: ' || SQLERRM,
      'wipe_id', p_wipe_id
    );
  END;
  
  -- 12. Release lock
  PERFORM release_wipe_lock(auth.uid());
  
  RETURN jsonb_build_object(
    'success', true,
    'wipe_id', p_wipe_id,
    'status', CASE WHEN jsonb_array_length(v_errors) > 0 THEN 'completed_with_errors' ELSE 'completed' END,
    'duration_ms', EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER,
    'tables_wiped', jsonb_array_length(v_tables_wiped),
    'errors', v_errors,
    'season_number', v_wipe.season_number,
    'players_reset', v_wipe.total_players_affected
  );
END;
$$;


-- =====================================================
-- PART 12: CANCEL PENDING WIPE
-- =====================================================
CREATE OR REPLACE FUNCTION cancel_season_wipe(p_wipe_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wipe RECORD;
BEGIN
  SELECT * INTO v_wipe FROM the_life_wipe_history WHERE id = p_wipe_id;
  
  IF v_wipe IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wipe not found');
  END IF;
  
  IF v_wipe.admin_user_id != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the initiating admin can cancel');
  END IF;
  
  IF v_wipe.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Can only cancel pending wipes');
  END IF;
  
  UPDATE the_life_wipe_history
  SET status = 'cancelled', completed_at = NOW()
  WHERE id = p_wipe_id;
  
  RETURN jsonb_build_object('success', true, 'message', 'Wipe cancelled');
END;
$$;


-- =====================================================
-- PART 13: GET WIPE STATUS
-- =====================================================
CREATE OR REPLACE FUNCTION get_wipe_status(p_wipe_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Verify admin
  IF NOT (verify_wipe_admin(auth.uid())->>'authorized')::BOOLEAN THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;
  
  IF p_wipe_id IS NOT NULL THEN
    SELECT row_to_json(w) INTO v_result
    FROM the_life_wipe_history w
    WHERE id = p_wipe_id;
  ELSE
    SELECT jsonb_agg(row_to_json(w)) INTO v_result
    FROM (
      SELECT id, wipe_type, season_number, season_name, status, 
             total_players_affected, created_at, completed_at, duration_ms
      FROM the_life_wipe_history
      ORDER BY created_at DESC
      LIMIT 20
    ) w;
  END IF;
  
  RETURN COALESCE(v_result, '[]'::JSONB);
END;
$$;


-- =====================================================
-- PART 14: VERIFY WIPE COMPLETENESS
-- Check for orphan data after wipe
-- =====================================================
CREATE OR REPLACE FUNCTION verify_wipe_completeness()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_issues JSONB := '[]'::JSONB;
  v_check RECORD;
BEGIN
  -- Verify admin
  IF NOT (verify_wipe_admin(auth.uid())->>'authorized')::BOOLEAN THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;
  
  -- Check for non-zero player stats
  FOR v_check IN
    SELECT 'players_with_xp' as issue, COUNT(*) as count
    FROM the_life_players WHERE xp > 0
    UNION ALL
    SELECT 'players_with_level_above_1', COUNT(*)
    FROM the_life_players WHERE level > 1
    UNION ALL
    SELECT 'players_with_cash_above_500', COUNT(*)
    FROM the_life_players WHERE cash > 500
    UNION ALL
    SELECT 'remaining_inventory_items', COUNT(*)
    FROM the_life_player_inventory
    UNION ALL
    SELECT 'remaining_businesses', COUNT(*)
    FROM the_life_player_businesses
    UNION ALL
    SELECT 'remaining_pvp_logs', COUNT(*)
    FROM the_life_pvp_logs
    UNION ALL
    SELECT 'remaining_crime_history', COUNT(*)
    FROM the_life_robbery_history
  LOOP
    IF v_check.count > 0 THEN
      v_issues := v_issues || jsonb_build_object(
        'issue', v_check.issue,
        'count', v_check.count
      );
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'clean', jsonb_array_length(v_issues) = 0,
    'issues', v_issues,
    'checked_at', NOW()
  );
END;
$$;


-- =====================================================
-- PART 15: ALERT FUNCTION (Call external webhook)
-- =====================================================
CREATE OR REPLACE FUNCTION alert_wipe_attempt(
  p_wipe_id UUID,
  p_event TEXT,
  p_details JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log to security logs for now (webhook would be external)
  INSERT INTO the_life_security_logs (
    user_id, event_type, action_name, severity,
    metadata, is_flagged, flag_reason
  ) VALUES (
    auth.uid(),
    'wipe_alert',
    p_event,
    'critical',
    p_details || jsonb_build_object('wipe_id', p_wipe_id),
    true,
    'Wipe attempt: ' || p_event
  );
END;
$$;


-- =====================================================
-- GRANT PERMISSIONS
-- Only authenticated users can call these (admin check is inside)
-- =====================================================
GRANT EXECUTE ON FUNCTION initiate_season_wipe(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_season_wipe(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_season_wipe(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_wipe_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_wipe_completeness() TO authenticated;
