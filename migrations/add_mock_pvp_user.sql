-- Add a mock user for PVP testing
-- This creates a fake player that will appear in the PVP list

-- Step 1: Temporarily disable the foreign key constraint
ALTER TABLE the_life_players DROP CONSTRAINT IF EXISTS the_life_players_user_id_fkey;

-- Step 2: Insert mock player (using a fake UUID that won't conflict with real users)
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
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,  -- Mock player ID
  '00000000-0000-0000-0000-000000000002'::uuid,  -- Mock user ID (fake)
  15000,  -- XP
  15,     -- Level 15
  100,    -- HP
  100,    -- Max HP
  100,    -- Stamina
  100,    -- Max Stamina
  300,    -- Tickets
  300,    -- Max Tickets
  50000,  -- $50k cash
  100000, -- $100k in bank
  42,     -- 42 PvP wins
  18,     -- 18 PvP losses
  150,    -- Total robberies
  120,    -- Successful robberies
  NOW()   -- Updated just now (appears online)
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

-- Step 3: Re-enable the foreign key constraint (but allow existing mock users)
ALTER TABLE the_life_players 
  ADD CONSTRAINT the_life_players_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE
  NOT VALID;

-- Validate the constraint for future inserts only (existing rows are exempt)
ALTER TABLE the_life_players VALIDATE CONSTRAINT the_life_players_user_id_fkey;

-- Note: The username will show as "Player" since this mock user doesn't exist in auth.users
-- To make it show a custom name, you would need to modify the loadOnlinePlayers function
-- to handle mock users specially.
