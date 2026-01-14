# PVP Online Presence System

## Overview

The PVP online presence system tracks which players are currently viewing the PVP area in real-time using active heartbeats. This is much more reliable than checking `updated_at` timestamps.

## How It Works

### 1. **Active Heartbeat System**
- When a player opens the PVP page, they send an initial heartbeat
- Heartbeats are sent every **30 seconds** while on the PVP page
- Presence is removed when player leaves the page
- Players are considered online if heartbeat is within last **90 seconds**

### 2. **Database Table**
```sql
the_life_pvp_presence
├── id (UUID)
├── player_id (UUID) - Links to the_life_players
├── user_id (UUID) - Links to auth.users
├── last_heartbeat (TIMESTAMPTZ)
└── created_at (TIMESTAMPTZ)
```

### 3. **Key Functions**

#### `update_pvp_presence(player_id, user_id)`
Upserts presence with current timestamp. Called every 30 seconds by frontend.

#### `cleanup_stale_pvp_presence()`
Removes presence entries older than 90 seconds. Called before loading online players.

#### `get_online_players_count()`
Returns current count of online players (cleans up stale entries first).

## Setup Instructions

### Step 1: Run Migration

Run the migration in Supabase SQL Editor:

```bash
migrations/create_pvp_presence_system.sql
```

This creates:
- `the_life_pvp_presence` table
- Indexes for performance
- RLS policies
- Helper functions

### Step 2: Test the System

1. **Open PVP page** in your browser
2. **Check presence** in Supabase:
   ```sql
   SELECT * FROM the_life_pvp_presence;
   ```
3. **Should see your entry** with recent `last_heartbeat`
4. **Open in another browser/device** as different user
5. **Both should appear** in online players list
6. **Close one browser** - should disappear within 90 seconds

### Step 3: Verify Heartbeats

Check browser console for heartbeat logs:
```
Sending heartbeat... (every 30 seconds)
```

## Frontend Implementation

### TheLifePVP Component

**Heartbeat Logic:**
```javascript
// Send initial heartbeat
sendHeartbeat();

// Send heartbeat every 30 seconds
const heartbeatInterval = setInterval(() => {
  sendHeartbeat();
}, 30000);

// Remove presence on unmount
return () => {
  removePresence();
  clearInterval(heartbeatInterval);
};
```

**Functions:**
- `sendHeartbeat()` - Calls `update_pvp_presence` RPC
- `removePresence()` - Deletes presence entry when leaving
- Subscribes to `the_life_pvp_presence` for real-time updates

### useTheLifeData Hook

**Load Online Players:**
```javascript
// Clean up stale presence first
await supabase.rpc('cleanup_stale_pvp_presence');

// Get online players from presence
const { data } = await supabase
  .from('the_life_pvp_presence')
  .select('player_id, user_id')
  .gte('last_heartbeat', new Date(Date.now() - 90000).toISOString());

// Fetch full player data and enrich with usernames
```

## Benefits Over Old System

### Old System (updated_at)
❌ Required players to perform actions to show as online  
❌ 2-minute window was too long  
❌ Players doing crimes/etc showed as online even when not in PVP  
❌ No way to know if player left the page  

### New System (heartbeat)
✅ Shows players actively viewing PVP page  
✅ Real-time updates (30 second heartbeats)  
✅ 90-second timeout for better accuracy  
✅ Automatic cleanup when leaving page  
✅ Separate from game actions  

## Timing Configuration

You can adjust these values in the code:

| Setting | Current Value | Location | Purpose |
|---------|---------------|----------|---------|
| Heartbeat Interval | 30 seconds | `TheLifePVP.jsx` | How often to send heartbeat |
| Online Timeout | 90 seconds | `useTheLifeData.js` | How long until considered offline |
| Refresh Interval | 20 seconds | `TheLifePVP.jsx` | How often to reload online list |
| Cleanup Threshold | 90 seconds | SQL function | When to remove stale entries |

## Troubleshooting

### Players not appearing online?

1. **Check presence table:**
   ```sql
   SELECT 
     p.*,
     pl.level,
     EXTRACT(EPOCH FROM (NOW() - p.last_heartbeat)) as seconds_ago
   FROM the_life_pvp_presence p
   JOIN the_life_players pl ON pl.id = p.player_id;
   ```

2. **Check RPC function works:**
   ```sql
   -- Replace with actual UUIDs
   SELECT update_pvp_presence(
     'player-uuid-here'::uuid,
     'user-uuid-here'::uuid
   );
   ```

3. **Check browser console** for heartbeat errors

### Stale players showing?

Run cleanup manually:
```sql
SELECT cleanup_stale_pvp_presence();
```

Check cleanup is being called in `loadOnlinePlayers`:
```javascript
await supabase.rpc('cleanup_stale_pvp_presence');
```

### Too many or too few updates?

Adjust intervals:
- **More responsive** = Lower heartbeat interval (e.g., 20 seconds)
- **Less network usage** = Higher heartbeat interval (e.g., 45 seconds)
- **Faster offline detection** = Lower timeout (e.g., 60 seconds)
- **Fewer false negatives** = Higher timeout (e.g., 120 seconds)

## Performance Notes

- **Heartbeats are lightweight** - single RPC call every 30 seconds
- **Cleanup is efficient** - Uses indexed timestamp column
- **Real-time subscriptions** - Instant updates when players join/leave
- **Batch username fetching** - Single query for all usernames
- **Max 50 players** - Prevents loading too many at once

## Security

- **RLS enabled** on `the_life_pvp_presence`
- Users can only update their own presence
- Anyone can view presence (needed for online list)
- Presence linked to both player and user IDs for verification

## Future Improvements

Potential enhancements:
- Show "typing..." indicator when player is typing in chat
- Show idle status (e.g., no activity for 2+ minutes)
- Add "away" status (still online but inactive)
- Track which specific area player is viewing
- Add online/offline notifications in chat

---

**Status:** ✅ Fully Implemented  
**Tested:** Ready for deployment  
**Dependencies:** Supabase RPC functions, RLS policies
