# PVP System Improvements

## Changes Made

### 1. Online Players Visibility Fix
**Problem**: Players in the game didn't show up for other players in the PVP section.

**Solution**:
- Reduced the "online" detection window from 5 minutes to 2 minutes
- Added real-time subscriptions to `the_life_players` table to instantly detect when players join/leave
- Added auto-refresh every 15 seconds to keep the online player list up to date
- Improved query performance by fetching usernames in batch instead of individual RPC calls

**Files Modified**:
- `src/components/TheLife/hooks/useTheLifeData.js` - Updated `loadOnlinePlayers()` function
- `src/components/TheLife/categories/TheLifePVP.jsx` - Added real-time subscriptions

### 2. Display Twitch/StreamElements Usernames in Chat
**Problem**: Chat messages only showed a generic "Player" or cached username, not the actual Twitch or StreamElements username.

**Solution**:
- Added `user_id` column to `the_life_pvp_chat` table to link messages to auth users
- Implemented username fetching from `streamelements_connections` and `user_profiles` tables
- Created a username mapping system that prioritizes: SE username > Twitch username > fallback
- Messages now display the user's actual Twitch or StreamElements name

**Files Modified**:
- `migrations/create_pvp_chat_system.sql` - Added `user_id` column to table schema
- `migrations/add_user_id_to_pvp_chat.sql` - Migration to add column to existing tables
- `src/components/TheLife/categories/TheLifePVP.jsx` - Added username fetching and display logic

### 3. Faster PVP Updates
**Problem**: PVP section took too long to update when users came online.

**Solution**:
- Implemented real-time Supabase subscriptions for `the_life_players` table
- Added 15-second auto-refresh interval for online players
- Changed online detection from 5 minutes to 2 minutes
- Player updates now trigger immediate refresh of the online player list

**Files Modified**:
- `src/components/TheLife/categories/TheLifePVP.jsx` - Added subscriptions and intervals
- `src/components/TheLife/hooks/useTheLifeData.js` - Optimized query performance

## Database Migrations Required

### Run This Migration First
```sql
-- File: migrations/add_user_id_to_pvp_chat.sql
ALTER TABLE the_life_pvp_chat 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_pvp_chat_user_id ON the_life_pvp_chat(user_id);

UPDATE the_life_pvp_chat c
SET user_id = p.user_id
FROM the_life_players p
WHERE c.player_id = p.id AND c.user_id IS NULL;

ALTER TABLE the_life_pvp_chat 
ALTER COLUMN user_id SET NOT NULL;
```

## How to Apply These Changes

1. **Run the database migration**:
   - Go to your Supabase dashboard
   - Navigate to SQL Editor
   - Run the migration file: `migrations/add_user_id_to_pvp_chat.sql`

2. **Verify the changes**:
   - Check that the `the_life_pvp_chat` table now has a `user_id` column
   - Verify that existing messages have been populated with `user_id` values

3. **Test the features**:
   - Open the PVP section with two different users
   - Send chat messages and verify Twitch/SE usernames appear
   - Check that players appear in the online list within 2 minutes of activity
   - Verify that the online player list updates automatically

## Technical Details

### Username Resolution Priority
1. **StreamElements username** (from `streamelements_connections.se_username`)
2. **Twitch username** (from `user_profiles.twitch_username`)
3. **Fallback** to "Player" if neither is available

### Online Player Detection
- Players are considered "online" if their `updated_at` timestamp is within the last 2 minutes
- The `updated_at` field is automatically updated whenever a player performs any action in the game
- Real-time subscriptions notify all clients when any player record changes

### Performance Optimizations
- Batch fetching of usernames instead of individual queries
- Lookup maps for O(1) username resolution
- Limited to 20 online players to prevent performance issues
- Chat message history limited to last 50 messages

## Troubleshooting

### Players still not showing up
- Check that the player has performed an action within the last 2 minutes
- Verify the `updated_at` column is being updated on player actions
- Check browser console for any subscription errors

### Usernames showing as "Player"
- Verify the user has a StreamElements connection or Twitch profile set up
- Check that `user_profiles.twitch_username` or `streamelements_connections.se_username` is populated
- Ensure RLS policies allow reading from these tables

### Real-time updates not working
- Check that Supabase Realtime is enabled for `the_life_players` and `the_life_pvp_chat` tables
- Verify no browser extensions are blocking WebSocket connections
- Check browser console for subscription errors

## Future Enhancements

- Add typing indicators when users are composing messages
- Show user avatars in chat messages
- Add online/offline status indicators with colors
- Implement chat message reactions
- Add @mention functionality for targeting specific players
