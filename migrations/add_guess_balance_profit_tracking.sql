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
