-- Create boat schedule system for docks
-- Boats arrive on schedule to pick up specific items

CREATE TABLE IF NOT EXISTS the_life_dock_boats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT,
  item_id UUID REFERENCES the_life_items(id) ON DELETE CASCADE,
  arrival_time TIMESTAMPTZ NOT NULL,
  departure_time TIMESTAMPTZ NOT NULL,
  max_shipments INTEGER DEFAULT 100, -- Max number of shipments this boat can handle
  current_shipments INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track individual shipments
CREATE TABLE IF NOT EXISTS the_life_dock_shipments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  boat_id UUID REFERENCES the_life_dock_boats(id) ON DELETE CASCADE,
  player_id UUID REFERENCES the_life_players(id) ON DELETE CASCADE,
  item_id UUID REFERENCES the_life_items(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL,
  payout BIGINT NOT NULL,
  shipped_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for active boats
CREATE INDEX IF NOT EXISTS idx_dock_boats_active ON the_life_dock_boats(arrival_time, departure_time, is_active) 
WHERE is_active = true;

-- Create index for player shipments
CREATE INDEX IF NOT EXISTS idx_dock_shipments_player ON the_life_dock_shipments(player_id, shipped_at);

-- Drop existing functions to allow return type changes
DROP FUNCTION IF EXISTS get_active_boats();
DROP FUNCTION IF EXISTS get_upcoming_boats();

-- Function to get currently docked boats
CREATE OR REPLACE FUNCTION get_active_boats()
RETURNS TABLE (
  id UUID,
  name TEXT,
  image_url TEXT,
  item_id UUID,
  item_name TEXT,
  item_icon TEXT,
  arrival_time TIMESTAMPTZ,
  departure_time TIMESTAMPTZ,
  max_shipments INTEGER,
  current_shipments INTEGER,
  time_remaining_minutes INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.name,
    b.image_url,
    b.item_id,
    i.name as item_name,
    i.icon as item_icon,
    b.arrival_time,
    b.departure_time,
    b.max_shipments,
    b.current_shipments,
    EXTRACT(EPOCH FROM (b.departure_time - NOW())) / 60 as time_remaining_minutes
  FROM the_life_dock_boats b
  LEFT JOIN the_life_items i ON b.item_id = i.id
  WHERE b.is_active = true
    AND NOW() >= b.arrival_time
    AND NOW() < b.departure_time
  ORDER BY b.departure_time ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to get upcoming boats
CREATE OR REPLACE FUNCTION get_upcoming_boats()
RETURNS TABLE (
  id UUID,
  name TEXT,
  image_url TEXT,
  item_id UUID,
  item_name TEXT,
  item_icon TEXT,
  arrival_time TIMESTAMPTZ,
  departure_time TIMESTAMPTZ,
  hours_until_arrival NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.name,
    b.image_url,
    b.item_id,
    i.name as item_name,
    i.icon as item_icon,
    b.arrival_time,
    b.departure_time,
    EXTRACT(EPOCH FROM (b.arrival_time - NOW())) / 3600 as hours_until_arrival
  FROM the_life_dock_boats b
  LEFT JOIN the_life_items i ON b.item_id = i.id
  WHERE b.is_active = true
    AND b.arrival_time > NOW()
  ORDER BY b.arrival_time ASC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql;

-- Remove old dock tracking columns (they're replaced by this system)
-- ALTER TABLE the_life_players DROP COLUMN IF EXISTS dock_uses_today;
-- ALTER TABLE the_life_players DROP COLUMN IF EXISTS last_dock_date;
-- Keep dock_daily_limit for now as a legacy field

COMMENT ON TABLE the_life_dock_boats IS 'Scheduled boats that arrive at docks to pick up specific items';
COMMENT ON TABLE the_life_dock_shipments IS 'History of all dock shipments made by players';
COMMENT ON COLUMN the_life_dock_boats.arrival_time IS 'When the boat arrives and starts accepting shipments';
COMMENT ON COLUMN the_life_dock_boats.departure_time IS 'When the boat leaves (no more shipments accepted)';
COMMENT ON COLUMN the_life_dock_boats.max_shipments IS 'Maximum number of shipments this boat can handle (capacity limit)';
