-- Secure Blackjack Game Table
-- Deck is stored server-side and NEVER sent to client
-- Cards are dealt one at a time through the API

CREATE TABLE IF NOT EXISTS blackjack_games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bet_amount INTEGER NOT NULL CHECK (bet_amount >= 10 AND bet_amount <= 200),
  perfect_pairs_bet INTEGER DEFAULT 0 CHECK (perfect_pairs_bet >= 0 AND perfect_pairs_bet <= 10),
  twenty_one_three_bet INTEGER DEFAULT 0 CHECK (twenty_one_three_bet >= 0 AND twenty_one_three_bet <= 10),
  
  -- The deck is stored as JSONB array - NEVER sent to client
  deck JSONB NOT NULL,
  
  -- Hands stored as JSONB arrays
  player_hand JSONB DEFAULT '[]',
  dealer_hand JSONB DEFAULT '[]',
  
  -- Game state
  status TEXT NOT NULL DEFAULT 'playing' CHECK (status IN ('playing', 'dealer_turn', 'finished')),
  result TEXT CHECK (result IN ('player_win', 'dealer_win', 'push', 'blackjack', 'bust', NULL)),
  result_amount INTEGER DEFAULT 0,
  
  -- Track if dealer's hole card is revealed
  dealer_revealed BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- Index for finding active games by user
CREATE INDEX IF NOT EXISTS idx_blackjack_games_user_active ON blackjack_games(user_id, status) WHERE status IN ('playing', 'dealer_turn');

-- RLS Policies
ALTER TABLE blackjack_games ENABLE ROW LEVEL SECURITY;

-- Users can only see their own games (but deck column should be excluded at API level)
CREATE POLICY "Users can view own blackjack games" ON blackjack_games
  FOR SELECT USING (auth.uid() = user_id);

-- Only server can insert/update (via service role key)
-- Frontend cannot directly modify this table

-- IMPORTANT: The deck column should NEVER be exposed to the client
-- This is enforced at the API level
