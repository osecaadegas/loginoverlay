-- Consolidated migration: 007_guess_balance_and_bonus_hunt.sql
-- Generated from active source migrations retained after cleanup

-- ============================================================================
-- Source: add_guess_balance_system.sql
-- ============================================================================
-- Add Guess the Balance game system
-- This allows admins to create game sessions with slot info for users to guess

-- Main sessions table
CREATE TABLE IF NOT EXISTS guess_balance_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Session info
  title VARCHAR(200) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'active', -- active, completed, cancelled
  
  -- Money info
  start_value NUMERIC(12, 2) NOT NULL DEFAULT 0, -- Starting balance
  amount_expended NUMERIC(12, 2) NOT NULL DEFAULT 0, -- Total amount spent on slots
  be_multiplier NUMERIC(8, 2) DEFAULT 1.0, -- Break Even multiplier (BE x)
  final_balance NUMERIC(12, 2), -- Actual final balance (revealed after game ends)
  
  -- Casino info
  casino_brand VARCHAR(200), -- Casino name/brand
  casino_image_url TEXT, -- Casino logo/image
  
  -- Game settings
  is_guessing_open BOOLEAN DEFAULT TRUE, -- Whether users can still guess
  reveal_answer BOOLEAN DEFAULT FALSE, -- Show final balance
  winner_user_id UUID REFERENCES auth.users(id), -- Winner of the game
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Slots in each session
CREATE TABLE IF NOT EXISTS guess_balance_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES guess_balance_sessions(id) ON DELETE CASCADE,
  
  -- Slot info
  slot_name VARCHAR(200) NOT NULL,
  slot_image_url TEXT, -- Image of the slot
  provider VARCHAR(100), -- Slot provider (Pragmatic, NetEnt, etc.)
  
  -- Betting info
  bet_value NUMERIC(10, 2) NOT NULL DEFAULT 0, -- Bet amount per spin
  is_super BOOLEAN DEFAULT FALSE, -- Is it a super/bonus slot
  
  -- Results (hidden until reveal)
  bonus_win NUMERIC(12, 2), -- What the bonus paid (if any)
  multiplier NUMERIC(10, 2), -- Win multiplier (e.g., 150x)
  
  -- Order
  display_order INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User guesses
CREATE TABLE IF NOT EXISTS guess_balance_guesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES guess_balance_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Guess info
  guessed_balance NUMERIC(12, 2) NOT NULL,
  guessed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Result (calculated when session ends)
  difference NUMERIC(12, 2), -- How far off they were
  is_winner BOOLEAN DEFAULT FALSE,
  
  -- Unique constraint - one guess per user per session
  CONSTRAINT unique_user_session_guess UNIQUE (session_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_guess_balance_sessions_user ON guess_balance_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_guess_balance_sessions_status ON guess_balance_sessions(status);
CREATE INDEX IF NOT EXISTS idx_guess_balance_sessions_created ON guess_balance_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guess_balance_slots_session ON guess_balance_slots(session_id);
CREATE INDEX IF NOT EXISTS idx_guess_balance_guesses_session ON guess_balance_guesses(session_id);
CREATE INDEX IF NOT EXISTS idx_guess_balance_guesses_user ON guess_balance_guesses(user_id);

-- Enable RLS
ALTER TABLE guess_balance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE guess_balance_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE guess_balance_guesses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for guess_balance_sessions

-- Everyone can view active sessions
DROP POLICY IF EXISTS "everyone can view sessions" ON guess_balance_sessions;
CREATE POLICY "everyone can view sessions"
  ON guess_balance_sessions FOR SELECT
  USING (TRUE);

-- Admins can create sessions
DROP POLICY IF EXISTS "admins can create sessions" ON guess_balance_sessions;
CREATE POLICY "admins can create sessions"
  ON guess_balance_sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

-- Admins can update sessions
DROP POLICY IF EXISTS "admins can update sessions" ON guess_balance_sessions;
CREATE POLICY "admins can update sessions"
  ON guess_balance_sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

-- Admins can delete sessions
DROP POLICY IF EXISTS "admins can delete sessions" ON guess_balance_sessions;
CREATE POLICY "admins can delete sessions"
  ON guess_balance_sessions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

-- RLS Policies for guess_balance_slots

-- Everyone can view slots
DROP POLICY IF EXISTS "everyone can view slots" ON guess_balance_slots;
CREATE POLICY "everyone can view slots"
  ON guess_balance_slots FOR SELECT
  USING (TRUE);

-- Admins can manage slots
DROP POLICY IF EXISTS "admins can create slots" ON guess_balance_slots;
CREATE POLICY "admins can create slots"
  ON guess_balance_slots FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "admins can update slots" ON guess_balance_slots;
CREATE POLICY "admins can update slots"
  ON guess_balance_slots FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "admins can delete slots" ON guess_balance_slots;
CREATE POLICY "admins can delete slots"
  ON guess_balance_slots FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

-- RLS Policies for guess_balance_guesses

-- Users can view their own guesses and all guesses after reveal
DROP POLICY IF EXISTS "users can view guesses" ON guess_balance_guesses;
CREATE POLICY "users can view guesses"
  ON guess_balance_guesses FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM guess_balance_sessions 
      WHERE guess_balance_sessions.id = guess_balance_guesses.session_id 
      AND (reveal_answer = TRUE OR status = 'completed')
    )
    OR EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

-- Users can create their own guesses
DROP POLICY IF EXISTS "users can create guesses" ON guess_balance_guesses;
CREATE POLICY "users can create guesses"
  ON guess_balance_guesses FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM guess_balance_sessions 
      WHERE guess_balance_sessions.id = session_id 
      AND is_guessing_open = TRUE 
      AND status = 'active'
    )
  );

-- Users can update their own guesses (while guessing is open)
DROP POLICY IF EXISTS "users can update guesses" ON guess_balance_guesses;
CREATE POLICY "users can update guesses"
  ON guess_balance_guesses FOR UPDATE
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM guess_balance_sessions 
      WHERE guess_balance_sessions.id = session_id 
      AND is_guessing_open = TRUE
    )
  );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_guess_balance_sessions_updated_at ON guess_balance_sessions;
CREATE TRIGGER update_guess_balance_sessions_updated_at
  BEFORE UPDATE ON guess_balance_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_guess_balance_slots_updated_at ON guess_balance_slots;
CREATE TRIGGER update_guess_balance_slots_updated_at
  BEFORE UPDATE ON guess_balance_slots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate winner when session ends
CREATE OR REPLACE FUNCTION calculate_guess_balance_winner(session_uuid UUID)
RETURNS void AS $$
DECLARE
  actual_balance NUMERIC(12, 2);
  winner_id UUID;
BEGIN
  -- Get the final balance
  SELECT final_balance INTO actual_balance
  FROM guess_balance_sessions
  WHERE id = session_uuid;
  
  IF actual_balance IS NULL THEN
    RAISE EXCEPTION 'Final balance not set for session';
  END IF;
  
  -- Update all guesses with their difference
  UPDATE guess_balance_guesses
  SET difference = ABS(guessed_balance - actual_balance),
      is_winner = FALSE
  WHERE session_id = session_uuid;
  
  -- Find the closest guess (winner)
  SELECT user_id INTO winner_id
  FROM guess_balance_guesses
  WHERE session_id = session_uuid
  ORDER BY ABS(guessed_balance - actual_balance) ASC
  LIMIT 1;
  
  -- Mark winner
  IF winner_id IS NOT NULL THEN
    UPDATE guess_balance_guesses
    SET is_winner = TRUE
    WHERE session_id = session_uuid AND user_id = winner_id;
    
    UPDATE guess_balance_sessions
    SET winner_user_id = winner_id,
        status = 'completed',
        reveal_answer = TRUE,
        completed_at = NOW()
    WHERE id = session_uuid;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION calculate_guess_balance_winner(UUID) TO authenticated;

-- ============================================================================
-- Source: add_gtb_slot_votes.sql
-- ============================================================================
-- Slot voting system for Guess The Balance
-- Players can vote on which slot they think will have the highest (best) or lowest (worst) multiplier

CREATE TABLE IF NOT EXISTS guess_balance_slot_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES guess_balance_sessions(id) ON DELETE CASCADE,
  slot_id UUID NOT NULL REFERENCES guess_balance_slots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('best', 'worst')),
  voted_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Each user can only vote once per session per vote type
  CONSTRAINT unique_user_session_vote_type UNIQUE (session_id, user_id, vote_type)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_slot_votes_session ON guess_balance_slot_votes(session_id);
CREATE INDEX IF NOT EXISTS idx_slot_votes_slot ON guess_balance_slot_votes(slot_id);
CREATE INDEX IF NOT EXISTS idx_slot_votes_user ON guess_balance_slot_votes(user_id);

-- Enable RLS
ALTER TABLE guess_balance_slot_votes ENABLE ROW LEVEL SECURITY;

-- Everyone can view all votes (to show vote counts)
DROP POLICY IF EXISTS "everyone can view votes" ON guess_balance_slot_votes;
CREATE POLICY "everyone can view votes"
  ON guess_balance_slot_votes FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Users can create their own votes
DROP POLICY IF EXISTS "users can create votes" ON guess_balance_slot_votes;
CREATE POLICY "users can create votes"
  ON guess_balance_slot_votes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM guess_balance_sessions 
      WHERE guess_balance_sessions.id = session_id 
      AND status = 'active'
    )
  );

-- NO DELETE POLICY - Votes are permanent! One best and one worst per session, that's it.

-- ============================================================================
-- Source: add_gtb_transfer_password.sql
-- ============================================================================
-- GTB Transfer Password System
-- Allows admin to generate a one-time password that can be used in the
-- Bonus Hunt Config to transfer bonuses into a Guess-the-Balance session.

-- Table to store the current transfer password (only 1 active row per user)
CREATE TABLE IF NOT EXISTS gtb_transfer_passwords (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '24 hours'),
  used_at TIMESTAMPTZ DEFAULT NULL,
  is_active BOOLEAN DEFAULT true
);

-- Only one ACTIVE password per user (allows multiple inactive rows)
CREATE UNIQUE INDEX IF NOT EXISTS idx_gtb_transfer_passwords_active
  ON gtb_transfer_passwords (user_id) WHERE is_active = true;

-- Drop the old broken constraint if it exists
ALTER TABLE gtb_transfer_passwords
  DROP CONSTRAINT IF EXISTS gtb_transfer_passwords_user_id_is_active_key;

-- RLS
ALTER TABLE gtb_transfer_passwords ENABLE ROW LEVEL SECURITY;

-- Admin can manage their own passwords
DROP POLICY IF EXISTS "admin_manage_own_transfer_passwords" ON gtb_transfer_passwords;
CREATE POLICY "admin_manage_own_transfer_passwords"
  ON gtb_transfer_passwords FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RPC: Verify a transfer password and create a GTB session from bonuses
-- Returns the new session ID on success, or raises an error
CREATE OR REPLACE FUNCTION verify_gtb_transfer_password(
  p_password_hash TEXT,
  p_session_title TEXT,
  p_start_value NUMERIC DEFAULT 0,
  p_casino_brand TEXT DEFAULT '',
  p_casino_image_url TEXT DEFAULT '',
  p_slots JSONB DEFAULT '[]'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_password_record RECORD;
  v_session_id UUID;
  v_slot JSONB;
  v_index INT := 0;
BEGIN
  -- Find active, non-expired, unused password matching the hash
  SELECT * INTO v_password_record
  FROM gtb_transfer_passwords
  WHERE password_hash = p_password_hash
    AND is_active = true
    AND used_at IS NULL
    AND expires_at > now()
  LIMIT 1;

  IF v_password_record IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired transfer password';
  END IF;

  -- Mark password as used
  UPDATE gtb_transfer_passwords
  SET used_at = now(), is_active = false
  WHERE id = v_password_record.id;

  -- Create the GTB session
  INSERT INTO guess_balance_sessions (
    user_id, title, status, start_value, amount_expended,
    casino_brand, casino_image_url, is_guessing_open, reveal_answer
  ) VALUES (
    v_password_record.user_id,
    p_session_title,
    'active',
    p_start_value,
    0, -- will be calculated from slots
    p_casino_brand,
    p_casino_image_url,
    true,
    false
  )
  RETURNING id INTO v_session_id;

  -- Insert all bonus slots
  FOR v_slot IN SELECT * FROM jsonb_array_elements(p_slots)
  LOOP
    INSERT INTO guess_balance_slots (
      session_id, slot_name, slot_image_url, provider,
      bet_value, is_super, display_order
    ) VALUES (
      v_session_id,
      v_slot->>'slot_name',
      v_slot->>'slot_image_url',
      v_slot->>'provider',
      COALESCE((v_slot->>'bet_value')::NUMERIC, 0),
      COALESCE((v_slot->>'is_super')::BOOLEAN, false),
      v_index
    );
    v_index := v_index + 1;
  END LOOP;

  -- Update session amount_expended
  UPDATE guess_balance_sessions
  SET amount_expended = (
    SELECT COALESCE(SUM(bet_value), 0) FROM guess_balance_slots WHERE session_id = v_session_id
  )
  WHERE id = v_session_id;

  RETURN v_session_id;
END;
$$;

-- ============================================================================
-- Source: add_username_to_slot_votes.sql
-- ============================================================================
-- Add username column to slot votes for display purposes
-- This avoids RLS issues when fetching user profiles

ALTER TABLE guess_balance_slot_votes 
ADD COLUMN IF NOT EXISTS username TEXT DEFAULT 'Anonymous';

-- ============================================================================
-- Source: add_guess_balance_profit_tracking.sql
-- ============================================================================
-- Add profit tracking and hunt log fields to guess_balance_sessions
-- Run this migration in your Supabase SQL editor

-- Add new columns for profit tracking and hunt logs
ALTER TABLE guess_balance_sessions ADD COLUMN IF NOT EXISTS conducted_by VARCHAR(100);
ALTER TABLE guess_balance_sessions ADD COLUMN IF NOT EXISTS stream_date DATE;
ALTER TABLE guess_balance_sessions ADD COLUMN IF NOT EXISTS profit NUMERIC(12, 2);
ALTER TABLE guess_balance_sessions ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE guess_balance_sessions ADD COLUMN IF NOT EXISTS total_slots_played INTEGER DEFAULT 0;
ALTER TABLE guess_balance_sessions ADD COLUMN IF NOT EXISTS total_bonus_wins NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE guess_balance_sessions ADD COLUMN IF NOT EXISTS biggest_win NUMERIC(12, 2);
ALTER TABLE guess_balance_sessions ADD COLUMN IF NOT EXISTS biggest_win_slot VARCHAR(200);
ALTER TABLE guess_balance_sessions ADD COLUMN IF NOT EXISTS biggest_multiplier NUMERIC(10, 2);

-- Add comments for clarity
COMMENT ON COLUMN guess_balance_sessions.conducted_by IS 'Name/username of who conducted the hunt';
COMMENT ON COLUMN guess_balance_sessions.stream_date IS 'Date of the stream/hunt';
COMMENT ON COLUMN guess_balance_sessions.profit IS 'Profit from the hunt (final_balance - start_value)';
COMMENT ON COLUMN guess_balance_sessions.notes IS 'Admin notes about the session';
COMMENT ON COLUMN guess_balance_sessions.total_slots_played IS 'Total number of slots played in the hunt';
COMMENT ON COLUMN guess_balance_sessions.total_bonus_wins IS 'Sum of all bonus wins';
COMMENT ON COLUMN guess_balance_sessions.biggest_win IS 'Biggest single win amount';
COMMENT ON COLUMN guess_balance_sessions.biggest_win_slot IS 'Name of slot with biggest win';
COMMENT ON COLUMN guess_balance_sessions.biggest_multiplier IS 'Biggest multiplier achieved';

-- Function to auto-calculate profit when final_balance is set
CREATE OR REPLACE FUNCTION calculate_session_profit()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate profit
  IF NEW.final_balance IS NOT NULL AND NEW.start_value IS NOT NULL THEN
    NEW.profit := NEW.final_balance - NEW.start_value;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate profit
DROP TRIGGER IF EXISTS trigger_calculate_profit ON guess_balance_sessions;
CREATE TRIGGER trigger_calculate_profit
  BEFORE INSERT OR UPDATE ON guess_balance_sessions
  FOR EACH ROW
  EXECUTE FUNCTION calculate_session_profit();

-- Function to update session stats from slots
CREATE OR REPLACE FUNCTION update_session_slot_stats(p_session_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total_slots INTEGER;
  v_total_wins NUMERIC(12, 2);
  v_biggest_win NUMERIC(12, 2);
  v_biggest_win_slot VARCHAR(200);
  v_biggest_mult NUMERIC(10, 2);
BEGIN
  -- Get stats from slots
  SELECT 
    COUNT(*),
    COALESCE(SUM(bonus_win), 0),
    MAX(bonus_win)
  INTO v_total_slots, v_total_wins, v_biggest_win
  FROM guess_balance_slots
  WHERE session_id = p_session_id;
  
  -- Get biggest win slot name
  SELECT slot_name, multiplier
  INTO v_biggest_win_slot, v_biggest_mult
  FROM guess_balance_slots
  WHERE session_id = p_session_id AND bonus_win = v_biggest_win
  LIMIT 1;
  
  -- Get biggest multiplier (might be different slot)
  SELECT MAX(multiplier) INTO v_biggest_mult
  FROM guess_balance_slots
  WHERE session_id = p_session_id;
  
  -- Update session
  UPDATE guess_balance_sessions
  SET 
    total_slots_played = v_total_slots,
    total_bonus_wins = v_total_wins,
    biggest_win = v_biggest_win,
    biggest_win_slot = v_biggest_win_slot,
    biggest_multiplier = v_biggest_mult
  WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Source: fix_guess_balance_guesses_policy.sql
-- ============================================================================
-- Fix RLS policy for guess_balance_guesses to allow all users to see all guesses
-- This enables the "All Guesses" feature to show everyone's guesses in real-time

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "users can view guesses" ON guess_balance_guesses;

-- Create a more permissive policy - all authenticated users can view all guesses
CREATE POLICY "users can view all guesses"
  ON guess_balance_guesses FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Note: Insert and Update policies remain restricted to own user
-- This allows everyone to see who guessed and how much, creating engagement

-- ============================================================================
-- Source: fix_guess_balance_moderator_access.sql
-- ============================================================================
-- Fix Guess Balance RLS policies to allow moderators
-- Run this migration in your Supabase SQL editor
-- This allows moderators to create/update/delete guess balance sessions

-- =====================================================
-- 1. UPDATE SESSION POLICIES TO INCLUDE MODERATORS
-- =====================================================

-- Admins AND Moderators can create sessions
DROP POLICY IF EXISTS "admins can create sessions" ON guess_balance_sessions;
CREATE POLICY "admins and mods can create sessions"
  ON guess_balance_sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('admin', 'moderator')
    )
  );

-- Admins AND Moderators can update sessions
DROP POLICY IF EXISTS "admins can update sessions" ON guess_balance_sessions;
CREATE POLICY "admins and mods can update sessions"
  ON guess_balance_sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('admin', 'moderator')
    )
  );

-- Admins AND Moderators can delete sessions
DROP POLICY IF EXISTS "admins can delete sessions" ON guess_balance_sessions;
CREATE POLICY "admins and mods can delete sessions"
  ON guess_balance_sessions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('admin', 'moderator')
    )
  );


-- =====================================================
-- 2. UPDATE SLOTS POLICIES TO INCLUDE MODERATORS
-- =====================================================

-- Admins AND Moderators can create slots
DROP POLICY IF EXISTS "admins can create slots" ON guess_balance_slots;
CREATE POLICY "admins and mods can create slots"
  ON guess_balance_slots FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('admin', 'moderator')
    )
  );

-- Admins AND Moderators can update slots
DROP POLICY IF EXISTS "admins can update slots" ON guess_balance_slots;
CREATE POLICY "admins and mods can update slots"
  ON guess_balance_slots FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('admin', 'moderator')
    )
  );

-- Admins AND Moderators can delete slots
DROP POLICY IF EXISTS "admins can delete slots" ON guess_balance_slots;
CREATE POLICY "admins and mods can delete slots"
  ON guess_balance_slots FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('admin', 'moderator')
    )
  );


-- =====================================================
-- 3. ALSO UPDATE GUESSES VIEW POLICY FOR MODERATORS
-- =====================================================

-- Admins AND Moderators can view all guesses
DROP POLICY IF EXISTS "users can view guesses" ON guess_balance_guesses;
CREATE POLICY "users can view guesses"
  ON guess_balance_guesses FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM guess_balance_sessions 
      WHERE guess_balance_sessions.id = guess_balance_guesses.session_id 
      AND (reveal_answer = TRUE OR status = 'completed')
    )
    OR EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('admin', 'moderator')
    )
  );

-- ============================================================================
-- Source: add_bonus_hunt_history.sql
-- ============================================================================
-- ============================================================
-- Bonus Hunt History ÔÇö per-user archive of completed hunts
-- Each record stores the full snapshot so hunts can be reviewed
-- ============================================================

CREATE TABLE IF NOT EXISTS bonus_hunt_history (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Hunt metadata
  hunt_name   TEXT NOT NULL DEFAULT 'Untitled Hunt',
  currency    TEXT NOT NULL DEFAULT 'Ôé¼',

  -- Financial summary
  start_money NUMERIC(12,2) DEFAULT 0,
  stop_loss   NUMERIC(12,2) DEFAULT 0,
  total_bet   NUMERIC(12,2) DEFAULT 0,
  total_win   NUMERIC(12,2) DEFAULT 0,
  profit      NUMERIC(12,2) DEFAULT 0,

  -- Hunt stats
  bonus_count     INT DEFAULT 0,
  bonuses_opened  INT DEFAULT 0,
  avg_multi       NUMERIC(8,2) DEFAULT 0,
  best_multi      NUMERIC(8,2) DEFAULT 0,
  best_slot_name  TEXT DEFAULT '',

  -- Full snapshot of bonuses array (for loading back)
  bonuses     JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Timestamps
  created_at  TIMESTAMPTZ DEFAULT now(),
  hunt_date   DATE DEFAULT CURRENT_DATE
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_bh_history_user ON bonus_hunt_history(user_id, created_at DESC);

-- RLS: users can only access their own history
ALTER TABLE bonus_hunt_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own hunt history"
  ON bonus_hunt_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own hunt history"
  ON bonus_hunt_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own hunt history"
  ON bonus_hunt_history FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own hunt history"
  ON bonus_hunt_history FOR UPDATE
  USING (auth.uid() = user_id);
