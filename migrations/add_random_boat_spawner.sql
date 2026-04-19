-- ═══════════════════════════════════════════════════════════════════
-- RANDOM BOAT SPAWNER — Automatically spawn boats every 3 days
-- 
-- This system creates random boats with random drugs/items and 
-- random schedules to keep the docks dynamic and exciting
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. Function to spawn a random boat ──────────────────────────

CREATE OR REPLACE FUNCTION spawn_random_dock_boat()
RETURNS TABLE(
  boat_id UUID,
  boat_name TEXT,
  item_name TEXT,
  arrival TIMESTAMPTZ,
  departure TIMESTAMPTZ
) AS $$
DECLARE
  v_boat_id UUID;
  v_boat_name TEXT;
  v_item_id UUID;
  v_item_name TEXT;
  v_arrival TIMESTAMPTZ;
  v_departure TIMESTAMPTZ;
  v_duration_hours INTEGER;
  v_offset_hours INTEGER;
  boat_names TEXT[] := ARRAY[
    'SS Neptune''s Fortune',
    'The Black Pearl',
    'HMS Cargo Runner',
    'Sea Dragon',
    'The Silent Trader',
    'Ocean''s Whisper',
    'Midnight Express',
    'The Golden Galleon',
    'Storm Chaser',
    'Harbor King',
    'Wave Rider',
    'Sea Wolf',
    'The Night Hawk',
    'Crimson Tide',
    'Blue Horizon'
  ];
BEGIN
  -- Pick a random boat name
  v_boat_name := boat_names[1 + floor(random() * array_length(boat_names, 1))::int];
  
  -- Pick a random drug/item from the_life_items
  -- Prioritize consumables, special items, and business rewards
  SELECT id, name INTO v_item_id, v_item_name
  FROM the_life_items
  WHERE type IN ('consumable', 'special', 'business_reward')
  ORDER BY random()
  LIMIT 1;
  
  -- If no items found, use any item
  IF v_item_id IS NULL THEN
    SELECT id, name INTO v_item_id, v_item_name
    FROM the_life_items
    ORDER BY random()
    LIMIT 1;
  END IF;
  
  -- If still no items, abort
  IF v_item_id IS NULL THEN
    RAISE EXCEPTION 'No active items found in the_life_items table';
  END IF;
  
  -- Random schedule:
  -- Offset: 2-12 hours from now (when boat will arrive)
  v_offset_hours := 2 + floor(random() * 11)::int; -- Random between 2 and 12 hours
  
  -- Duration: Boat stays docked for 6-24 hours
  v_duration_hours := 6 + floor(random() * 19)::int; -- Random between 6 and 24 hours
  
  v_arrival := NOW() + (v_offset_hours || ' hours')::interval;
  v_departure := v_arrival + (v_duration_hours || ' hours')::interval;
  
  -- Random max shipments capacity: 50-200
  DECLARE
    v_max_shipments INTEGER := 50 + floor(random() * 151)::int;
  BEGIN
    -- Insert the new boat
    INSERT INTO the_life_dock_boats (
      name,
      image_url,
      item_id,
      arrival_time,
      departure_time,
      max_shipments,
      current_shipments,
      is_active
    ) VALUES (
      v_boat_name,
      '/thelife/boats/' || (1 + floor(random() * 8)::int) || '.png', -- Random boat image 1-8
      v_item_id,
      v_arrival,
      v_departure,
      v_max_shipments,
      0,
      true
    )
    RETURNING id INTO v_boat_id;
  END;
  
  -- Return the created boat info
  RETURN QUERY
  SELECT 
    v_boat_id,
    v_boat_name,
    v_item_name,
    v_arrival,
    v_departure;
END;
$$ LANGUAGE plpgsql;

-- Grant execute to authenticated users (they can see when boats spawn)
GRANT EXECUTE ON FUNCTION spawn_random_dock_boat() TO authenticated;

-- ─── 2. Function to cleanup old boats ────────────────────────────

CREATE OR REPLACE FUNCTION cleanup_old_dock_boats()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Mark boats as inactive if they've departed more than 7 days ago
  UPDATE the_life_dock_boats
  SET is_active = false
  WHERE is_active = true
    AND departure_time < NOW() - interval '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION cleanup_old_dock_boats() TO authenticated;

-- ─── 3. Function to check if we need a new boat ──────────────────

CREATE OR REPLACE FUNCTION should_spawn_new_boat()
RETURNS BOOLEAN AS $$
DECLARE
  last_spawn_time TIMESTAMPTZ;
  upcoming_boats_count INTEGER;
BEGIN
  -- Get the most recent boat creation time
  SELECT MAX(created_at) INTO last_spawn_time
  FROM the_life_dock_boats
  WHERE is_active = true;
  
  -- If no boats exist, definitely spawn
  IF last_spawn_time IS NULL THEN
    RETURN true;
  END IF;
  
  -- Count upcoming boats (not yet arrived)
  SELECT COUNT(*) INTO upcoming_boats_count
  FROM the_life_dock_boats
  WHERE is_active = true
    AND arrival_time > NOW();
  
  -- Spawn if:
  -- 1. Last spawn was more than 3 days ago, OR
  -- 2. There are fewer than 2 upcoming boats
  IF (last_spawn_time < NOW() - interval '3 days') OR (upcoming_boats_count < 2) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION should_spawn_new_boat() TO authenticated;

-- ─── 4. Master function: Auto-spawn if needed ────────────────────

CREATE OR REPLACE FUNCTION auto_spawn_dock_boats()
RETURNS TABLE(
  spawned BOOLEAN,
  boat_id UUID,
  boat_name TEXT,
  item_name TEXT,
  arrival TIMESTAMPTZ,
  departure TIMESTAMPTZ,
  message TEXT
) AS $$
DECLARE
  spawn_result RECORD;
  cleanup_count INTEGER;
BEGIN
  -- First, cleanup old boats
  cleanup_count := cleanup_old_dock_boats();
  
  -- Check if we should spawn a new boat
  IF should_spawn_new_boat() THEN
    -- Spawn a new random boat
    FOR spawn_result IN 
      SELECT * FROM spawn_random_dock_boat()
    LOOP
      RETURN QUERY
      SELECT 
        true as spawned,
        spawn_result.boat_id,
        spawn_result.boat_name,
        spawn_result.item_name,
        spawn_result.arrival,
        spawn_result.departure,
        format('New boat spawned: %s carrying %s (arrives in %s hours)', 
          spawn_result.boat_name, 
          spawn_result.item_name,
          ROUND(EXTRACT(EPOCH FROM (spawn_result.arrival - NOW())) / 3600)
        ) as message;
      RETURN;
    END LOOP;
  ELSE
    -- No spawn needed
    RETURN QUERY
    SELECT 
      false as spawned,
      NULL::UUID,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TIMESTAMPTZ,
      NULL::TIMESTAMPTZ,
      'No new boat needed - schedule is full' as message;
    RETURN;
  END IF;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION auto_spawn_dock_boats() TO authenticated, anon;

-- ─── 5. Optional: PostgreSQL cron job (if pg_cron is available) ──

-- NOTE: Supabase may not have pg_cron enabled by default.
-- If available, uncomment these lines to run auto-spawn every 12 hours:

-- SELECT cron.schedule(
--   'auto-spawn-dock-boats',
--   '0 */12 * * *',
--   $$SELECT auto_spawn_dock_boats()$$
-- );

-- ─── 6. Initial spawn ─────────────────────────────────────────────

-- Spawn 2 boats immediately to populate the docks
DO $$
DECLARE
  i INTEGER;
BEGIN
  FOR i IN 1..2 LOOP
    PERFORM spawn_random_dock_boat();
    -- Sleep 1 second between spawns to ensure different randomization
    PERFORM pg_sleep(1);
  END LOOP;
END $$;

-- ─── 7. Verification ───────────────────────────────────────────────

-- Test the auto-spawn function
SELECT * FROM auto_spawn_dock_boats();

-- Show currently active boats
SELECT 
  name,
  the_life_items.name as item,
  arrival_time,
  departure_time,
  max_shipments,
  current_shipments
FROM the_life_dock_boats
LEFT JOIN the_life_items ON the_life_dock_boats.item_id = the_life_items.id
WHERE is_active = true
ORDER BY arrival_time ASC;
