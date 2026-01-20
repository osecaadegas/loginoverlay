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
