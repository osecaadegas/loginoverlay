-- ============================================
-- GLOBAL ROULETTE MULTIPLAYER SYSTEM
-- Single global table for all players
-- ============================================

-- Roulette game state (single row - global table)
CREATE TABLE IF NOT EXISTS roulette_game_state (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Only one row allowed
    phase VARCHAR(20) DEFAULT 'betting', -- betting, no_more_bets, spinning, payout
    phase_ends_at TIMESTAMPTZ,
    current_round_id BIGINT DEFAULT 0,
    winning_number INTEGER,
    last_result_at TIMESTAMPTZ,
    total_bets_this_round NUMERIC(20, 2) DEFAULT 0,
    total_players_this_round INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initialize the single global game state
INSERT INTO roulette_game_state (id, phase, current_round_id)
VALUES (1, 'betting', 1)
ON CONFLICT (id) DO NOTHING;

-- Roulette bets for current round
CREATE TABLE IF NOT EXISTS roulette_bets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id BIGINT NOT NULL,
    player_id UUID REFERENCES the_life_players(id),
    player_name VARCHAR(100) NOT NULL,
    player_avatar VARCHAR(500),
    bet_type VARCHAR(20) NOT NULL, -- STRAIGHT, SPLIT, STREET, CORNER, LINE, DOZEN, COLUMN, RED, BLACK, EVEN, ODD, LOW, HIGH
    bet_value TEXT, -- JSON encoded value (number or array of numbers)
    bet_amount NUMERIC(20, 2) NOT NULL,
    position VARCHAR(50), -- Position identifier for UI
    payout_multiplier INTEGER DEFAULT 0,
    won BOOLEAN DEFAULT false,
    winnings NUMERIC(20, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Roulette results history
CREATE TABLE IF NOT EXISTS roulette_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id BIGINT NOT NULL,
    winning_number INTEGER NOT NULL,
    total_bets NUMERIC(20, 2) DEFAULT 0,
    total_payouts NUMERIC(20, 2) DEFAULT 0,
    player_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Roulette chat
CREATE TABLE IF NOT EXISTS roulette_chat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES the_life_players(id),
    player_name VARCHAR(100) NOT NULL,
    player_avatar VARCHAR(500),
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player statistics for roulette
CREATE TABLE IF NOT EXISTS roulette_player_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES the_life_players(id) UNIQUE,
    total_bets NUMERIC(20, 2) DEFAULT 0,
    total_won NUMERIC(20, 2) DEFAULT 0,
    rounds_played INTEGER DEFAULT 0,
    biggest_win NUMERIC(20, 2) DEFAULT 0,
    favorite_bet_type VARCHAR(20),
    lucky_number INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_roulette_bets_round ON roulette_bets(round_id);
CREATE INDEX IF NOT EXISTS idx_roulette_bets_player ON roulette_bets(player_id);
CREATE INDEX IF NOT EXISTS idx_roulette_history_created ON roulette_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_roulette_chat_created ON roulette_chat(created_at DESC);

-- Enable Realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE roulette_game_state;
ALTER PUBLICATION supabase_realtime ADD TABLE roulette_bets;
ALTER PUBLICATION supabase_realtime ADD TABLE roulette_chat;

-- Function to get current round bets by position
CREATE OR REPLACE FUNCTION get_round_bet_totals(p_round_id BIGINT)
RETURNS TABLE(bet_position VARCHAR, total_amount NUMERIC) AS $$
BEGIN
    RETURN QUERY
    SELECT rb.position, SUM(rb.bet_amount) as total_amount
    FROM roulette_bets rb
    WHERE rb.round_id = p_round_id
    GROUP BY rb.position;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate and process payouts
CREATE OR REPLACE FUNCTION process_roulette_round(p_winning_number INTEGER)
RETURNS INTEGER AS $$
DECLARE
    v_round_id BIGINT;
    v_bet RECORD;
    v_covered_numbers INTEGER[];
    v_payout_multiplier INTEGER;
    v_total_payouts NUMERIC := 0;
    v_processed_count INTEGER := 0;
BEGIN
    -- Get current round
    SELECT current_round_id INTO v_round_id FROM roulette_game_state WHERE id = 1;
    
    -- Process each bet
    FOR v_bet IN 
        SELECT * FROM roulette_bets WHERE round_id = v_round_id
    LOOP
        -- Determine covered numbers based on bet type
        CASE v_bet.bet_type
            WHEN 'STRAIGHT' THEN
                v_covered_numbers := ARRAY[CAST(v_bet.bet_value AS INTEGER)];
                v_payout_multiplier := 35;
            WHEN 'RED' THEN
                v_covered_numbers := ARRAY[1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
                v_payout_multiplier := 1;
            WHEN 'BLACK' THEN
                v_covered_numbers := ARRAY[2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35];
                v_payout_multiplier := 1;
            WHEN 'EVEN' THEN
                v_covered_numbers := ARRAY[2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36];
                v_payout_multiplier := 1;
            WHEN 'ODD' THEN
                v_covered_numbers := ARRAY[1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33,35];
                v_payout_multiplier := 1;
            WHEN 'LOW' THEN
                v_covered_numbers := ARRAY[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18];
                v_payout_multiplier := 1;
            WHEN 'HIGH' THEN
                v_covered_numbers := ARRAY[19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36];
                v_payout_multiplier := 1;
            WHEN 'DOZEN' THEN
                CASE CAST(v_bet.bet_value AS INTEGER)
                    WHEN 1 THEN v_covered_numbers := ARRAY[1,2,3,4,5,6,7,8,9,10,11,12];
                    WHEN 2 THEN v_covered_numbers := ARRAY[13,14,15,16,17,18,19,20,21,22,23,24];
                    WHEN 3 THEN v_covered_numbers := ARRAY[25,26,27,28,29,30,31,32,33,34,35,36];
                END CASE;
                v_payout_multiplier := 2;
            WHEN 'COLUMN' THEN
                CASE CAST(v_bet.bet_value AS INTEGER)
                    WHEN 1 THEN v_covered_numbers := ARRAY[1,4,7,10,13,16,19,22,25,28,31,34];
                    WHEN 2 THEN v_covered_numbers := ARRAY[2,5,8,11,14,17,20,23,26,29,32,35];
                    WHEN 3 THEN v_covered_numbers := ARRAY[3,6,9,12,15,18,21,24,27,30,33,36];
                END CASE;
                v_payout_multiplier := 2;
            ELSE
                v_covered_numbers := ARRAY[]::INTEGER[];
                v_payout_multiplier := 0;
        END CASE;
        
        -- Check if bet wins
        IF p_winning_number = ANY(v_covered_numbers) THEN
            -- Calculate winnings (bet amount * (payout + 1))
            UPDATE roulette_bets
            SET won = true,
                payout_multiplier = v_payout_multiplier,
                winnings = bet_amount * (v_payout_multiplier + 1)
            WHERE id = v_bet.id;
            
            -- Update player cash
            UPDATE the_life_players
            SET cash = cash + (v_bet.bet_amount * v_payout_multiplier)
            WHERE id = v_bet.player_id;
            
            v_total_payouts := v_total_payouts + (v_bet.bet_amount * (v_payout_multiplier + 1));
        ELSE
            -- Bet lost - deduct from player (already done when bet placed, so just mark as lost)
            UPDATE roulette_bets
            SET won = false, winnings = 0
            WHERE id = v_bet.id;
        END IF;
        
        v_processed_count := v_processed_count + 1;
    END LOOP;
    
    -- Record in history
    INSERT INTO roulette_history (round_id, winning_number, total_bets, total_payouts, player_count)
    SELECT v_round_id, p_winning_number, 
           COALESCE(SUM(bet_amount), 0),
           v_total_payouts,
           COUNT(DISTINCT player_id)
    FROM roulette_bets WHERE round_id = v_round_id;
    
    RETURN v_processed_count;
END;
$$ LANGUAGE plpgsql;

-- Function to start a new round
CREATE OR REPLACE FUNCTION start_new_roulette_round()
RETURNS BIGINT AS $$
DECLARE
    v_new_round_id BIGINT;
BEGIN
    UPDATE roulette_game_state
    SET current_round_id = current_round_id + 1,
        phase = 'betting',
        winning_number = NULL,
        total_bets_this_round = 0,
        total_players_this_round = 0,
        phase_ends_at = NOW() + INTERVAL '30 seconds',
        updated_at = NOW()
    WHERE id = 1
    RETURNING current_round_id INTO v_new_round_id;
    
    RETURN v_new_round_id;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE roulette_game_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE roulette_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE roulette_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE roulette_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE roulette_player_stats ENABLE ROW LEVEL SECURITY;

-- Everyone can read game state and history
CREATE POLICY "Anyone can view roulette state" ON roulette_game_state FOR SELECT USING (true);
CREATE POLICY "Anyone can view roulette bets" ON roulette_bets FOR SELECT USING (true);
CREATE POLICY "Anyone can view roulette history" ON roulette_history FOR SELECT USING (true);
CREATE POLICY "Anyone can view roulette chat" ON roulette_chat FOR SELECT USING (true);
CREATE POLICY "Anyone can view roulette stats" ON roulette_player_stats FOR SELECT USING (true);

-- Anyone can place bets and send chat
CREATE POLICY "Place roulette bets" ON roulette_bets FOR INSERT WITH CHECK (true);
CREATE POLICY "Send roulette chat" ON roulette_chat FOR INSERT WITH CHECK (true);

-- Update policies
CREATE POLICY "Update game state" ON roulette_game_state FOR UPDATE USING (true);
CREATE POLICY "Update bets" ON roulette_bets FOR UPDATE USING (true);
CREATE POLICY "Manage player stats" ON roulette_player_stats FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON roulette_game_state TO authenticated, anon;
GRANT ALL ON roulette_bets TO authenticated, anon;
GRANT ALL ON roulette_history TO authenticated, anon;
GRANT ALL ON roulette_chat TO authenticated, anon;
GRANT ALL ON roulette_player_stats TO authenticated, anon;

-- Clean up old bets (keep only last 100 rounds)
CREATE OR REPLACE FUNCTION cleanup_old_roulette_bets()
RETURNS INTEGER AS $$
DECLARE
    v_min_round BIGINT;
    v_deleted INTEGER;
BEGIN
    SELECT current_round_id - 100 INTO v_min_round FROM roulette_game_state WHERE id = 1;
    
    DELETE FROM roulette_bets WHERE round_id < v_min_round;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    
    RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;
