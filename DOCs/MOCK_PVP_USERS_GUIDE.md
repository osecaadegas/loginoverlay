# Adding Mock PVP Users - Instructions

## What Changed

### 1. PVP UI Updates
- ✅ Now shows **player usernames** (from Twitch or email)
- ✅ Displays **total wealth** (cash + bank balance)
- ✅ Shows **PvP win count** for each player
- ✅ Better formatting with emojis and clear layout

### 2. Mock Users for Testing

I've created two migration files:

#### Option 1: Single Mock User
**File:** `migrations/add_mock_pvp_user.sql`
- Creates 1 mock player (Level 15, $150k wealth)
- Good for quick testing

#### Option 2: Multiple Mock Users (RECOMMENDED)
**File:** `migrations/add_multiple_mock_users.sql`
- Creates 3 mock players:
  - **Level 25** - High level gangster ($325k wealth, 85 wins)
  - **Level 8** - Mid-level player ($45k wealth, 12 wins)
  - **Level 3** - Newbie ($7k wealth, 2 wins)
- Includes a function to keep them "online"

## How to Add Mock Users

### Step 1: Run the Migration in Supabase

⚠️ **IMPORTANT:** Run the SQL file, NOT this markdown guide!

1. Go to your **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Open the file: `c:\Users\oseca\Documents\websiteV3\migrations\add_multiple_mock_users.sql`
4. Copy **ALL the SQL code** from that file
5. Paste into Supabase SQL Editor and **Run**

### Step 2: Keep Mock Users Online

The mock users will appear online for 5 minutes after creation. To keep them online:

**Option A:** Run this SQL in Supabase periodically:
```sql
SELECT refresh_mock_users();
```

**Option B:** Update the player query to show all players (not just online):
- Remove the `updated_at` filter temporarily for testing

### Step 3: Test the PVP UI

1. Reload your game
2. Go to the **PVP** tab
3. You should see the mock players listed with:
   - Their username (will show as "Player" unless you modify the function)
   - Level and PvP wins
   - Total wealth
   - Available cash
   - HP

## Customizing Mock Usernames

Since the mock users don't exist in `auth.users`, they'll show as "Player" by default.

To show custom names, you can either:

1. **Modify the loadOnlinePlayers function** to add special handling:
```javascript
let twitchUsername = 'Player';

// Add this before the metadata check:
if (playerData.user_id === '00000000-0000-0000-0000-000000000002') {
  twitchUsername = 'MockBoss';
} else if (playerData.user_id === '00000000-0000-0000-0000-000000000004') {
  twitchUsername = 'MidGangster';
} else if (playerData.user_id === '00000000-0000-0000-0000-000000000006') {
  twitchUsername = 'Newbie123';
}
```

2. **Or** create actual test accounts in Supabase Auth (more complex)

## Notes

- Mock users have fixed UUIDs starting with zeros
- They won't interfere with real users
- You can attack them to test the combat system
- They won't fight back (no AI logic)
- Delete them anytime with: `DELETE FROM the_life_players WHERE user_id LIKE '00000000-%'`
