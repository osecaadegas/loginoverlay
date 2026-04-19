# Random Boat Spawner System

## Overview
The dock boat system now automatically spawns random boats every **3 days** with:
- **Random item** (prioritizes consumables, special items, and business rewards)
- **Random schedule** (arrives 2-12 hours from spawn, stays 6-24 hours)
- **Random capacity** (50-200 max shipments)
- **Random boat name** from a pool of 15 names

## How It Works

### Automatic Spawning
1. **Trigger**: When any player visits the Docks page, the system checks if a new boat is needed
2. **Conditions**: Spawns a new boat if:
   - Last spawn was more than 3 days ago, OR
   - There are fewer than 2 upcoming boats in the schedule
3. **Cleanup**: Old boats (departed 7+ days ago) are automatically marked inactive

### Database Functions

#### `auto_spawn_dock_boats()`
Master function that checks if spawning is needed and creates a boat if conditions are met.
```sql
SELECT * FROM auto_spawn_dock_boats();
```
Returns:
- `spawned` (boolean) - Whether a boat was created
- `boat_id` (UUID) - ID of the new boat (if spawned)
- `boat_name` (TEXT) - Name of the boat
- `item_name` (TEXT) - Item the boat is carrying
- `arrival` (TIMESTAMPTZ) - When boat arrives
- `departure` (TIMESTAMPTZ) - When boat leaves
- `message` (TEXT) - Status message

#### `spawn_random_dock_boat()`
Manually spawn a random boat (bypasses the 3-day check).
```sql
SELECT * FROM spawn_random_dock_boat();
```

#### `cleanup_old_dock_boats()`
Remove old inactive boats from the schedule.
```sql
SELECT cleanup_old_dock_boats();
```

#### `should_spawn_new_boat()`
Check if the system needs a new boat.
```sql
SELECT should_spawn_new_boat();
```

## Manual Boat Spawning

### Via Supabase SQL Editor
```sql
-- Spawn 1 random boat immediately
SELECT * FROM spawn_random_dock_boat();

-- Spawn 3 boats at once
DO $$
DECLARE
  i INTEGER;
BEGIN
  FOR i IN 1..3 LOOP
    PERFORM spawn_random_dock_boat();
    PERFORM pg_sleep(1); -- 1 second delay for different randomization
  END LOOP;
END $$;
```

### Via Admin Panel (Future Feature)
You can add an admin button to manually trigger boat spawns:
```javascript
const spawnBoat = async () => {
  const { data, error } = await supabase.rpc('spawn_random_dock_boat');
  if (error) console.error(error);
  else console.log('Boat spawned:', data);
};
```

## Boat Schedule Details

### Arrival Times
- Random offset: **2-12 hours** from spawn time
- This ensures boats don't all arrive immediately

### Duration
- Random duration: **6-24 hours** docked
- Players have plenty of time to ship their cargo

### Capacity
- Random max shipments: **50-200 shipments**
- Larger boats can handle more cargo

### Items
Priority order for random selection:
1. **Consumables** (stim packs, food, drugs)
2. **Special items** (rare items)
3. **Business rewards** (items from businesses)
4. **Any item** (fallback)

## Boat Names
Random selection from:
- SS Neptune's Fortune
- The Black Pearl
- HMS Cargo Runner
- Sea Dragon
- The Silent Trader
- Ocean's Whisper
- Midnight Express
- The Golden Galleon
- Storm Chaser
- Harbor King
- Wave Rider
- Sea Wolf
- The Night Hawk
- Crimson Tide
- Blue Horizon

## Boat Images
Random image: `/thelife/boats/1.png` through `/thelife/boats/8.png`

Make sure you have 8 boat images in `public/thelife/boats/` folder.

## Advanced Configuration

### Change Spawn Frequency
Edit the `should_spawn_new_boat()` function in the migration:
```sql
-- Current: 3 days
IF (last_spawn_time < NOW() - interval '3 days') ...

-- Change to 1 day:
IF (last_spawn_time < NOW() - interval '1 day') ...

-- Change to 7 days:
IF (last_spawn_time < NOW() - interval '7 days') ...
```

### Change Item Types
Edit the `spawn_random_dock_boat()` function:
```sql
-- Current priority
WHERE type IN ('consumable', 'special', 'business_reward')

-- Add more types
WHERE type IN ('consumable', 'special', 'business_reward', 'other_type')
```

### Change Schedule Ranges
Edit these lines in `spawn_random_dock_boat()`:
```sql
-- Arrival time (currently 2-12 hours)
v_offset_hours := 2 + floor(random() * 11)::int;

-- Duration (currently 6-24 hours)
v_duration_hours := 6 + floor(random() * 19)::int;

-- Capacity (currently 50-200)
v_max_shipments INTEGER := 50 + floor(random() * 151)::int;
```

## PostgreSQL Cron (Optional)

If your Supabase project has `pg_cron` enabled, you can set up fully automatic spawning:

```sql
-- Run auto-spawn every 12 hours
SELECT cron.schedule(
  'auto-spawn-dock-boats',
  '0 */12 * * *',
  $$SELECT auto_spawn_dock_boats()$$
);

-- Check scheduled jobs
SELECT * FROM cron.job;

-- Remove the job
SELECT cron.unschedule('auto-spawn-dock-boats');
```

**Note**: Most Supabase projects don't have `pg_cron` enabled by default. The current system works by checking when players visit the Docks page.

## Monitoring

### Check Active Boats
```sql
SELECT 
  name,
  the_life_items.name as item,
  arrival_time,
  departure_time,
  max_shipments,
  current_shipments,
  created_at
FROM the_life_dock_boats
LEFT JOIN the_life_items ON the_life_dock_boats.item_id = the_life_items.id
WHERE is_active = true
ORDER BY arrival_time ASC;
```

### Check Spawn History
```sql
SELECT 
  name,
  the_life_items.name as item,
  arrival_time,
  departure_time,
  created_at,
  is_active
FROM the_life_dock_boats
LEFT JOIN the_life_items ON the_life_dock_boats.item_id = the_life_items.id
ORDER BY created_at DESC
LIMIT 20;
```

### Check Next Spawn Time
```sql
SELECT 
  MAX(created_at) as last_spawn,
  MAX(created_at) + interval '3 days' as next_spawn_after,
  should_spawn_new_boat() as spawn_needed_now
FROM the_life_dock_boats
WHERE is_active = true;
```

## Troubleshooting

### No boats appearing?
```sql
-- Force spawn a boat
SELECT * FROM spawn_random_dock_boat();
```

### Too many boats?
```sql
-- Cleanup old boats
SELECT cleanup_old_dock_boats();
```

### Check if system is working
```sql
-- Run auto-spawn manually
SELECT * FROM auto_spawn_dock_boats();
```

### Reset all boats
```sql
-- Mark all boats as inactive
UPDATE the_life_dock_boats SET is_active = false;

-- Spawn fresh boats
SELECT * FROM spawn_random_dock_boat();
SELECT * FROM spawn_random_dock_boat();
```
