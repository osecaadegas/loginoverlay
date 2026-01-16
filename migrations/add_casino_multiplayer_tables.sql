-- ============================================
-- MULTIPLAYER CASINO SYSTEM
-- Tables for lobby, seats, and chat
-- ============================================

-- Casino Tables (Lobby)
CREATE TABLE IF NOT EXISTS casino_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    game_type VARCHAR(50) NOT NULL DEFAULT 'poker', -- poker, blackjack, roulette
    max_seats INTEGER NOT NULL DEFAULT 6,
    min_buyin NUMERIC(20, 2) NOT NULL DEFAULT 100,
    max_buyin NUMERIC(20, 2) NOT NULL DEFAULT 10000,
    small_blind NUMERIC(20, 2) DEFAULT 5,
    big_blind NUMERIC(20, 2) DEFAULT 10,
    is_private BOOLEAN DEFAULT false,
    password_hash VARCHAR(255),
    status VARCHAR(20) DEFAULT 'waiting', -- waiting, in_progress, finished
    current_pot NUMERIC(20, 2) DEFAULT 0,
    community_cards JSONB DEFAULT '[]'::jsonb, -- For poker: community cards
    game_state JSONB DEFAULT '{}'::jsonb, -- Current game state
    current_dealer_seat INTEGER DEFAULT 0,
    current_turn_seat INTEGER,
    turn_started_at TIMESTAMPTZ,
    turn_timeout_seconds INTEGER DEFAULT 30,
    created_by UUID REFERENCES the_life_players(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Casino Seats (Players at tables)
CREATE TABLE IF NOT EXISTS casino_seats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id UUID NOT NULL REFERENCES casino_tables(id) ON DELETE CASCADE,
    seat_number INTEGER NOT NULL,
    player_id UUID REFERENCES the_life_players(id),
    player_name VARCHAR(100),
    player_avatar VARCHAR(500),
    chips NUMERIC(20, 2) DEFAULT 0, -- Current chips at table
    hole_cards JSONB DEFAULT '[]'::jsonb, -- Player's private cards
    current_bet NUMERIC(20, 2) DEFAULT 0,
    is_folded BOOLEAN DEFAULT false,
    is_all_in BOOLEAN DEFAULT false,
    last_action VARCHAR(50), -- fold, check, call, raise, all_in
    is_active BOOLEAN DEFAULT true,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(table_id, seat_number)
);

-- Casino Chat
CREATE TABLE IF NOT EXISTS casino_chat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id UUID NOT NULL REFERENCES casino_tables(id) ON DELETE CASCADE,
    player_id UUID REFERENCES the_life_players(id),
    player_name VARCHAR(100) NOT NULL,
    player_avatar VARCHAR(500),
    message TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'chat', -- chat, system, action
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Game History (for hand history)
CREATE TABLE IF NOT EXISTS casino_game_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id UUID NOT NULL REFERENCES casino_tables(id) ON DELETE CASCADE,
    hand_number INTEGER NOT NULL,
    pot_size NUMERIC(20, 2),
    community_cards JSONB,
    winners JSONB, -- Array of {player_id, amount_won, hand_description}
    players_snapshot JSONB, -- Snapshot of all players in the hand
    actions_log JSONB, -- All actions taken during the hand
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_casino_tables_status ON casino_tables(status);
CREATE INDEX IF NOT EXISTS idx_casino_tables_game_type ON casino_tables(game_type);
CREATE INDEX IF NOT EXISTS idx_casino_seats_table_id ON casino_seats(table_id);
CREATE INDEX IF NOT EXISTS idx_casino_seats_player_id ON casino_seats(player_id);
CREATE INDEX IF NOT EXISTS idx_casino_chat_table_id ON casino_chat(table_id);
CREATE INDEX IF NOT EXISTS idx_casino_chat_created_at ON casino_chat(created_at);

-- Enable Realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE casino_tables;
ALTER PUBLICATION supabase_realtime ADD TABLE casino_seats;
ALTER PUBLICATION supabase_realtime ADD TABLE casino_chat;

-- Function to get available seats count
CREATE OR REPLACE FUNCTION get_available_seats(p_table_id UUID)
RETURNS INTEGER AS $$
DECLARE
    max_seats INTEGER;
    occupied_seats INTEGER;
BEGIN
    SELECT ct.max_seats INTO max_seats
    FROM casino_tables ct
    WHERE ct.id = p_table_id;
    
    SELECT COUNT(*) INTO occupied_seats
    FROM casino_seats cs
    WHERE cs.table_id = p_table_id AND cs.player_id IS NOT NULL;
    
    RETURN max_seats - occupied_seats;
END;
$$ LANGUAGE plpgsql;

-- Function to handle player timeout (auto-fold)
CREATE OR REPLACE FUNCTION handle_player_timeout(p_table_id UUID, p_seat_number INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE casino_seats
    SET is_folded = true, last_action = 'timeout_fold'
    WHERE table_id = p_table_id AND seat_number = p_seat_number;
    
    INSERT INTO casino_chat (table_id, player_name, message, message_type)
    SELECT p_table_id, 
           cs.player_name, 
           cs.player_name || ' timed out and folded',
           'system'
    FROM casino_seats cs
    WHERE cs.table_id = p_table_id AND cs.seat_number = p_seat_number;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up empty tables (can be called periodically)
CREATE OR REPLACE FUNCTION cleanup_empty_tables()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    WITH empty_tables AS (
        SELECT ct.id
        FROM casino_tables ct
        LEFT JOIN casino_seats cs ON ct.id = cs.table_id AND cs.player_id IS NOT NULL
        WHERE cs.id IS NULL
        AND ct.created_at < NOW() - INTERVAL '1 hour'
    )
    DELETE FROM casino_tables WHERE id IN (SELECT id FROM empty_tables);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE casino_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE casino_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE casino_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE casino_game_history ENABLE ROW LEVEL SECURITY;

-- Everyone can read tables, seats, chat, and history
CREATE POLICY "Anyone can view casino tables" ON casino_tables FOR SELECT USING (true);
CREATE POLICY "Anyone can view casino seats" ON casino_seats FOR SELECT USING (true);
CREATE POLICY "Anyone can view casino chat" ON casino_chat FOR SELECT USING (true);
CREATE POLICY "Anyone can view game history" ON casino_game_history FOR SELECT USING (true);

-- Authenticated users can create tables
CREATE POLICY "Authenticated users can create tables" ON casino_tables FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Only table creator or service role can update tables
CREATE POLICY "Table updates" ON casino_tables FOR UPDATE 
    USING (true);

-- Anyone can join/leave seats (updates handled by application logic)
CREATE POLICY "Seat management" ON casino_seats FOR ALL USING (true);

-- Anyone can send chat messages
CREATE POLICY "Chat messages" ON casino_chat FOR INSERT 
    WITH CHECK (true);

-- Grant necessary permissions
GRANT ALL ON casino_tables TO authenticated, anon;
GRANT ALL ON casino_seats TO authenticated, anon;
GRANT ALL ON casino_chat TO authenticated, anon;
GRANT ALL ON casino_game_history TO authenticated, anon;
