-- Fix players who haven't logged in since the wipe
-- Run this in Supabase SQL Editor

-- Step 1: See which players haven't played since yesterday (the wipe)
SELECT 
  se_username,
  twitch_username,
  level,
  xp,
  cash,
  bank_balance,
  updated_at
FROM the_life_players
WHERE updated_at < NOW() - INTERVAL '1 day'
ORDER BY level DESC
LIMIT 20;

-- Step 2: Reset ONLY players who haven't played since the wipe (older than 1 day)
UPDATE the_life_players
SET 
  level = 1,
  xp = 0,
  cash = 500,
  bank_balance = 0,
  pvp_wins = 0,
  pvp_losses = 0,
  total_robberies = 0,
  hp = max_hp,
  stamina = max_stamina,
  addiction = 0,
  updated_at = NOW()
WHERE updated_at < NOW() - INTERVAL '1 day';

-- Step 3: Verify - check leaderboard now
SELECT 
  se_username,
  twitch_username,
  level,
  xp,
  (cash + bank_balance) as net_worth,
  pvp_wins
FROM the_life_players
ORDER BY level DESC, xp DESC
LIMIT 10;
