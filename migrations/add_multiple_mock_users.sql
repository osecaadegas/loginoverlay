-- Enhanced mock user with custom username support
-- This version creates mock users in auth.users first, then creates players

-- Step 1: Insert mock users into auth.users table
-- These won't have login credentials but will satisfy the foreign key
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data
) VALUES 
(
  '00000000-0000-0000-0000-000000000002'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'mockboss@fake.local',
  '',
  NOW(),
  NOW(),
  NOW(),
  '{"preferred_username": "MockBoss", "full_name": "Mock Boss"}'::jsonb
),
(
  '00000000-0000-0000-0000-000000000004'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'midgangster@fake.local',
  '',
  NOW(),
  NOW(),
  NOW(),
  '{"preferred_username": "MidGangster", "full_name": "Mid Gangster"}'::jsonb
),
(
  '00000000-0000-0000-0000-000000000006'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'newbie@fake.local',
  '',
  NOW(),
  NOW(),
  NOW(),
  '{"preferred_username": "Newbie123", "full_name": "Newbie Player"}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  updated_at = NOW(),
  raw_user_meta_data = EXCLUDED.raw_user_meta_data;

-- Step 2: Insert enhanced mock players
INSERT INTO the_life_players (
  id,
  user_id,
  xp,
  level,
  hp,
  max_hp,
  stamina,
  max_stamina,
  tickets,
  max_tickets,
  cash,
  bank_balance,
  pvp_wins,
  pvp_losses,
  total_robberies,
  successful_robberies,
  consecutive_logins,
  updated_at
) VALUES 
-- Mock Player 1: High Level Player
(
  '00000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000002'::uuid,
  25000,  -- XP (Level 25)
  25,
  100,
  100,
  100,
  100,
  300,
  300,
  75000,   -- $75k cash
  250000,  -- $250k in bank
  85,      -- 85 PvP wins
  35,      -- 35 losses
  250,
  200,
  15,
  NOW()
),
-- Mock Player 2: Mid Level Player
(
  '00000000-0000-0000-0000-000000000003'::uuid,
  '00000000-0000-0000-0000-000000000004'::uuid,
  8000,    -- XP (Level 8)
  8,
  100,
  100,
  100,
  100,
  300,
  300,
  15000,   -- $15k cash
  30000,   -- $30k in bank
  12,      -- 12 PvP wins
  20,      -- 20 losses
  80,
  55,
  7,
  NOW()
),
-- Mock Player 3: Newbie
(
  '00000000-0000-0000-0000-000000000005'::uuid,
  '00000000-0000-0000-0000-000000000006'::uuid,
  1500,    -- XP (Level 3)
  3,
  100,
  100,
  100,
  100,
  300,
  300,
  5000,    -- $5k cash
  2000,    -- $2k in bank
  2,       -- 2 PvP wins
  8,       -- 8 losses
  25,
  15,
  3,
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  xp = EXCLUDED.xp,
  level = EXCLUDED.level,
  hp = EXCLUDED.hp,
  cash = EXCLUDED.cash,
  bank_balance = EXCLUDED.bank_balance,
  pvp_wins = EXCLUDED.pvp_wins,
  pvp_losses = EXCLUDED.pvp_losses,
  updated_at = NOW();

-- Create a function to keep mock users "online" by updating their timestamp
CREATE OR REPLACE FUNCTION refresh_mock_users()
RETURNS void AS $$
BEGIN
  UPDATE the_life_players 
  SET updated_at = NOW()
  WHERE user_id IN (
    '00000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000004'::uuid,
    '00000000-0000-0000-0000-000000000006'::uuid
  );
END;
$$ LANGUAGE plpgsql;

-- Optionally, you can call this function periodically to keep them online
-- SELECT refresh_mock_users();

-- Note: Mock users now have proper entries in auth.users with custom usernames
-- They will show as "MockBoss", "MidGangster", and "Newbie123" in the PVP list
