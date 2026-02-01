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

-- Users can delete their own votes (to change vote)
DROP POLICY IF EXISTS "users can delete own votes" ON guess_balance_slot_votes;
CREATE POLICY "users can delete own votes"
  ON guess_balance_slot_votes FOR DELETE
  USING (auth.uid() = user_id);
