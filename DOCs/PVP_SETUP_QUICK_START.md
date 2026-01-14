# PVP System Update - Quick Setup Guide

## Step-by-Step Instructions

### 1. Run Database Migration

You need to run the SQL migration to add the `user_id` column to the PVP chat table.

**Option A: Via Supabase Dashboard**
1. Open your Supabase project dashboard
2. Go to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy and paste the contents of `migrations/add_user_id_to_pvp_chat.sql`
5. Click **Run** to execute the migration

**Option B: Via Supabase CLI**
```bash
# If you have Supabase CLI installed
supabase db push migrations/add_user_id_to_pvp_chat.sql
```

### 2. Verify Migration

Run this query in the SQL Editor to confirm the migration worked:

```sql
-- Check if user_id column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'the_life_pvp_chat' 
  AND column_name = 'user_id';

-- Check if existing messages have user_id populated
SELECT COUNT(*) as total_messages,
       COUNT(user_id) as messages_with_user_id
FROM the_life_pvp_chat;
```

### 3. Test the Changes

1. **Test Online Players:**
   - Open your game in two different browsers (or incognito + regular)
   - Log in with different users
   - Go to the PVP section in both browsers
   - You should see each other in the online players list within 2 minutes

2. **Test Chat Usernames:**
   - Send a message from one user
   - The message should show the Twitch or StreamElements username (not just "Player")
   - If you see "Player", verify the user has a SE connection or Twitch profile set up

3. **Test Real-time Updates:**
   - With both browsers open, perform an action with one user (like commit a crime)
   - Within 15 seconds, the other browser should see the user in the online list
   - Send a chat message - it should appear instantly in both browsers

### 4. Enable Realtime (If Not Already Enabled)

The PVP system uses Supabase Realtime. Make sure it's enabled:

1. Go to **Database** → **Replication** in Supabase dashboard
2. Find the `the_life_players` table
3. Toggle **Realtime** to ON
4. Find the `the_life_pvp_chat` table
5. Toggle **Realtime** to ON

### 5. Common Issues & Solutions

#### Issue: "user_id cannot be null" error when sending messages
**Solution**: The migration didn't populate existing messages. Run:
```sql
UPDATE the_life_pvp_chat c
SET user_id = p.user_id
FROM the_life_players p
WHERE c.player_id = p.id AND c.user_id IS NULL;
```

#### Issue: Players still showing as "Player" in chat
**Solution**: Check if the user has their username set up:
```sql
-- Check StreamElements connections
SELECT user_id, se_username 
FROM streamelements_connections 
WHERE user_id = 'YOUR_USER_ID';

-- Check Twitch usernames
SELECT user_id, twitch_username 
FROM user_profiles 
WHERE user_id = 'YOUR_USER_ID';
```

#### Issue: Players not appearing in online list
**Solution**: Check the updated_at timestamp:
```sql
-- See when players were last active
SELECT user_id, username, updated_at,
       EXTRACT(EPOCH FROM (NOW() - updated_at)) / 60 as minutes_since_update
FROM the_life_players
ORDER BY updated_at DESC
LIMIT 10;
```

Players must have been active within the last 2 minutes to appear online.

### 6. Configuration

The PVP system has these configurable parameters (in code):

```javascript
// In TheLifePVP.jsx
const AUTO_REFRESH_INTERVAL = 15000; // 15 seconds

// In useTheLifeData.js
const ONLINE_WINDOW_MINUTES = 2; // 2 minutes
const MAX_ONLINE_PLAYERS = 20;
const MAX_CHAT_MESSAGES = 50;
```

You can adjust these values if needed.

## What's Changed

✅ **Online Detection**: 2 minutes (was 5 minutes)
✅ **Auto-refresh**: Every 15 seconds
✅ **Real-time Updates**: Instant via Supabase subscriptions
✅ **Chat Usernames**: Shows Twitch/SE username
✅ **Performance**: Batch queries instead of individual calls

## Need Help?

Check the full documentation in `DOCs/PVP_IMPROVEMENTS.md` for more details.
