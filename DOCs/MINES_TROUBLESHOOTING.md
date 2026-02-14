# 🔧 Mines Game - Troubleshooting Guide

## Quick Diagnostic Checklist

### ✅ **Build Status**
- [x] Code compiles without errors
- [x] No syntax errors in JSX
- [x] Build completed successfully

### 🎯 **Common Issues & Solutions**

---

## Issue 1: "Cannot start game" or "Unauthorized"

**Symptoms:**
- Click "Start Game" but nothing happens
- Console error: `401 Unauthorized`
- Error message: "Not authenticated"

**Solution:**
1. **Check StreamElements Connection:**
   ```javascript
   // Open browser console (F12), type:
   localStorage.getItem('se_access_token')
   // Should return a token, not null
   ```

2. **Re-authenticate:**
   - Click "Connect StreamElements" button
   - Complete OAuth flow
   - Refresh page

---

## Issue 2: "Table mines_games does not exist"

**Symptoms:**
- Error in console: `relation "mines_games" does not exist`
- API returns 500 error
- Cannot start game

**Solution:**
1. **Run Migration:**
   - Go to Supabase Dashboard → SQL Editor
   - Run `migrations/add_mines_games.sql`
   - Verify table creation:
     ```sql
     SELECT * FROM mines_games LIMIT 1;
     ```

2. **Check RLS Policies:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'mines_games';
   ```
   Should show at least 1 policy.

---

## Issue 3: "Already have an active game" on Load

**Symptoms:**
- Modal shows "Active Game Found"
- Can't start new game
- Previous game stuck

**Solutions:**

**Option A: Resume Game**
- Click "Resume Game" button
- Continue playing or cash out

**Option B: Forfeit Game (Lose Bet)**
- Click "Forfeit" button
- Confirms loss of bet
- Allows starting new game

**Option C: Force Clear (Admin Only)**
```sql
-- In Supabase SQL Editor
UPDATE mines_games
SET status = 'lost', ended_at = NOW()
WHERE user_id = 'YOUR_USER_ID' AND status = 'active';
```

---

## Issue 4: Cells Not Responding to Clicks

**Symptoms:**
- Click cells but nothing happens
- No visual feedback
- Console errors

**Checks:**

1. **Is Game Active?**
   - Green "Game Active" indicator should show
   - "Cash Out" button should be enabled

2. **Check Loading State:**
   - If button shows spinner, wait for API response
   - Check network tab for failed requests

3. **Browser Console Errors:**
   ```javascript
   // Press F12, check Console tab for errors
   // Common errors:
   // - "Invalid cell index"
   // - "Cell already revealed"
   // - "API error"
   ```

---

## Issue 5: Multipliers Seem Wrong

**Symptoms:**
- Multiplier doesn't match expected value
- Profit calculation seems off
- Suspicious low multipliers

**Expected Multipliers (5 mines):**
- 1 cell: 1.23× (applied house edge + difficulty modifier)
- 2 cells: 1.48×
- 3 cells: 1.75×
- 5 cells: 2.35×
- 10 cells: 5.89×
- 20 cells (all safe): ~42× (JACKPOT)

**Expected Multipliers (10 mines):**
- 1 cell: 1.56×
- 2 cells: 2.21×
- 3 cells: 3.04×
- 5 cells: 5.82×
- 10 cells: 26.57×
- 15 cells (all safe): ~204× (JACKPOT)

**If wrong:**
1. Check API code in `api/mines.js`
2. Verify house edge: `HOUSE_EDGE = 0.03` (3%)
3. Check difficulty modifiers:
   - 5 mines: 0.90× (easiest)
   - 6-7 mines: 0.95×
   - 8+ mines: 1.00× (full)

---

## Issue 6: Balance Not Updating

**Symptoms:**
- Win game but points don't increase
- Lose game but points don't decrease
- Balance shows wrong value

**Checks:**

1. **StreamElements Sync:**
   ```javascript
   // Console check:
   console.log('Current Points:', window.SE_API?.store?.getState?.()?.user?.points);
   ```

2. **Verify Database Update:**
   ```sql
   SELECT * FROM mines_games 
   WHERE user_id = 'YOUR_USER_ID'
   ORDER BY created_at DESC
   LIMIT 5;
   ```

3. **Manual Point Correction:**
   - Go to StreamElements Dashboard
   - Points → Adjust manually
   - Re-sync in app

---

## Issue 7: Game Frozen/Stuck

**Symptoms:**
- Can't click anything
- Loading spinner forever
- No error messages

**Solutions:**

1. **Refresh Page (Soft Reset)**
   - Press F5 or Ctrl+R
   - If active game exists, modal will show
   - Choose Resume or Forfeit

2. **Clear Local Storage (Hard Reset)**
   ```javascript
   // Console:
   localStorage.clear();
   location.reload();
   ```

3. **Check Network Status:**
   - Open Network tab (F12)
   - Look for failed requests to `/api/mines`
   - Check response for error messages

---

## Issue 8: Cells Reveal Incorrectly After Game Ends

**Symptoms:**
- Mine positions shown in wrong locations
- Safe cells marked as mines
- Visual glitches

**Cause:**
Server sends `minePositions` array after game ends. If array is corrupted or client state is wrong, display will be incorrect.

**Solution:**
1. **Verify Server Response:**
   ```javascript
   // In Network tab, check /api/mines response
   // Should include:
   {
     "success": true,
     "minePositions": [3, 7, 12, 18, 21], // Correct indices 0-24
     "revealedCells": [0, 1, 5, 9],
     "result": "mine" // or "safe"
   }
   ```

2. **Clear Game State:**
   - Click "Play Again"
   - State should reset fully
   - New game should start fresh

---

## Diagnostic SQL Queries

### Check All Mines Games for User
```sql
SELECT 
  id,
  bet_amount,
  mine_count,
  array_length(revealed_cells, 1) as cells_revealed,
  multiplier,
  status,
  result_amount,
  created_at,
  ended_at
FROM mines_games
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 20;
```

### Find Stuck Active Games
```sql
SELECT 
  user_id,
  id,
  bet_amount,
  mine_count,
  created_at,
  NOW() - created_at as age
FROM mines_games
WHERE status = 'active'
  AND created_at < NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### Calculate Win Rate
```sql
SELECT 
  status,
  COUNT(*) as games,
  AVG(multiplier) as avg_multiplier,
  SUM(bet_amount) as total_wagered,
  SUM(result_amount) as total_won
FROM mines_games
WHERE user_id = 'YOUR_USER_ID'
GROUP BY status;
```

### Check House Edge (Should be ~97% RTP)
```sql
SELECT 
  SUM(bet_amount) as total_bet,
  SUM(result_amount) as total_payout,
  ROUND((SUM(result_amount)::numeric / SUM(bet_amount)::numeric) * 100, 2) as rtp_percentage
FROM mines_games
WHERE status IN ('won', 'lost');
-- Should return ~97% (3% house edge)
```

---

## API Debugging

### Test API Directly (cURL)

**1. Start Game:**
```bash
curl -X POST 'https://yourdomain.com/api/mines' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -d '{
    "action": "start",
    "bet": 50,
    "mineCount": 5
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "game": {
    "id": "uuid-here",
    "bet": 50,
    "mineCount": 5,
    "multiplier": 1,
    "revealedCells": [],
    "status": "active",
    "safeCellsRemaining": 20,
    "maxMultiplier": 42.15,
    "nextMultipliers": [1.23, 1.48, 1.75, 2.06, 2.35]
  }
}
```

**2. Reveal Cell:**
```bash
curl -X POST 'https://yourdomain.com/api/mines' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -d '{
    "action": "reveal",
    "gameId": "YOUR_GAME_ID",
    "cellIndex": 0
  }'
```

**3. Get Active Game:**
```bash
curl -X POST 'https://yourdomain.com/api/mines' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -d '{
    "action": "getActiveGame"
  }'
```

---

## Environment Variables Check

### Required Env Vars (Vercel)

1. **SUPABASE_URL**
   - Value: `https://your-project.supabase.co`
   - Where: Vercel → Project → Settings → Environment Variables

2. **SUPABASE_SERVICE_ROLE_KEY**
   - Value: `eyJ...` (from Supabase → Settings → API)
   - ⚠️ **CRITICAL**: Must be SERVICE ROLE KEY, not anon key
   - Never commit to Git

3. **SUPABASE_ANON_KEY** (for frontend)
   - Value: `eyJ...` (from Supabase → Settings → API)
   - Used in `supabaseClient.js`

### Verify in Vercel:
```bash
# Check deployment logs
vercel logs YOUR_DEPLOYMENT_URL --follow

# Look for:
# - "SUPABASE_URL is set"
# - "SUPABASE_SERVICE_ROLE_KEY is set"
```

---

## Performance Optimization

### If Game is Slow

1. **Check API Response Time:**
   - Network tab → `/api/mines` requests
   - Should complete in < 500ms
   - If > 2 seconds, check Supabase region

2. **Reduce Grid Calculations:**
   - Current: Recalculates multipliers on each reveal
   - Optimization: Pre-calculate and cache

3. **Database Indices:**
   ```sql
   -- Ensure these exist:
   CREATE INDEX IF NOT EXISTS idx_mines_games_user_active 
   ON mines_games(user_id, status) WHERE status = 'active';
   ```

---

## Security Audit

### Verify Security Measures

1. **Mine Positions Hidden:**
   ```javascript
   // In browser console during active game:
   console.log('Game State:', gameState);
   // mineLocations should be EMPTY array []
   // Should NOT show mine positions until game ends
   ```

2. **Server-Side Validation:**
   - All game logic in `api/mines.js`
   - Client cannot forge results
   - Multipliers calculated server-side only

3. **RLS Policies:**
   ```sql
   -- Users can only see own games
   SELECT * FROM pg_policies WHERE tablename = 'mines_games';
   ```

---

## Known Limitations

1. **No Provably Fair System (Yet)**
   - Mine generation uses Math.random() (not cryptographic)
   - Future: Implement SHA256-based seed system

2. **No Betting History UI**
   - Games stored in database
   - No frontend display yet
   - Future: Add history page

3. **No Leaderboard**
   - Can be added with:
     ```sql
     SELECT user_id, SUM(result_amount) as total_won
     FROM mines_games
     WHERE status = 'won'
     GROUP BY user_id
     ORDER BY total_won DESC
     LIMIT 10;
     ```

---

## Emergency Admin Commands

### Force End All Active Games
```sql
-- Use with CAUTION - will forfeit all active games
UPDATE mines_games
SET status = 'lost', 
    result_amount = 0,
    ended_at = NOW()
WHERE status = 'active';
```

### Refund Stuck Game
```sql
-- Find user's stuck game
SELECT id, user_id, bet_amount 
FROM mines_games 
WHERE status = 'active' 
  AND created_at < NOW() - INTERVAL '24 hours';

-- Manual refund (adjust points in StreamElements)
-- Then mark as cancelled:
UPDATE mines_games
SET status = 'lost', ended_at = NOW()
WHERE id = 'GAME_ID_HERE';
```

---

## Contact Support

If none of these solutions work:

1. **Collect Diagnostics:**
   - Browser console screenshot (F12)
   - Network tab screenshot
   - SQL query results
   - Exact error message

2. **Provide Details:**
   - What were you doing when error occurred?
   - Can you reproduce it?
   - What's your user ID?

3. **Check Vercel Logs:**
   ```bash
   vercel logs --follow
   ```

---

## Testing Checklist

Before reporting as bug, test:

- [ ] Refresh page (F5)
- [ ] Clear localStorage
- [ ] Try different browser
- [ ] Check internet connection
- [ ] Verify StreamElements is connected
- [ ] Check database migration ran
- [ ] Check API endpoint is accessible
- [ ] Verify environment variables set in Vercel
- [ ] Check Supabase project is not paused
- [ ] Try in incognito mode

---

**Last Updated:** February 14, 2026  
**Version:** 1.0
