-- Add image_url column to existing dock boats table
ALTER TABLE the_life_dock_boats ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Recreate functions with image_url
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
