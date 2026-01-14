-- Create "The Life" Crime RPG Game Tables

-- Player stats and progression
CREATE TABLE IF NOT EXISTS the_life_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  hp INTEGER DEFAULT 100,
  max_hp INTEGER DEFAULT 100,
  stamina INTEGER DEFAULT 100,
  max_stamina INTEGER DEFAULT 100,
  tickets INTEGER DEFAULT 300,
  max_tickets INTEGER DEFAULT 300,
  cash BIGINT DEFAULT 500,
  bank_balance BIGINT DEFAULT 0,
  jail_until TIMESTAMPTZ,
  hospital_until TIMESTAMPTZ,
  last_ticket_refill TIMESTAMPTZ DEFAULT NOW(),
  last_daily_bonus TIMESTAMPTZ,
  consecutive_logins INTEGER DEFAULT 0,
  total_robberies INTEGER DEFAULT 0,
  successful_robberies INTEGER DEFAULT 0,
  pvp_wins INTEGER DEFAULT 0,
  pvp_losses INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Robbery types and configurations
CREATE TABLE IF NOT EXISTS the_life_robberies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  min_xp_required INTEGER DEFAULT 0,
  min_level_required INTEGER DEFAULT 1,
  ticket_cost INTEGER DEFAULT 1,
  base_reward INTEGER DEFAULT 100,
  max_reward INTEGER DEFAULT 500,
  success_rate INTEGER DEFAULT 50, -- base percentage
  jail_time_minutes INTEGER DEFAULT 30,
  hp_loss_on_fail INTEGER DEFAULT 10,
  xp_reward INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player robbery history
CREATE TABLE IF NOT EXISTS the_life_robbery_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID REFERENCES the_life_players(id) ON DELETE CASCADE NOT NULL,
  robbery_id UUID REFERENCES the_life_robberies(id) ON DELETE CASCADE NOT NULL,
  success BOOLEAN NOT NULL,
  reward INTEGER DEFAULT 0,
  xp_gained INTEGER DEFAULT 0,
  jail_time_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drug operations
CREATE TABLE IF NOT EXISTS the_life_drug_ops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID REFERENCES the_life_players(id) ON DELETE CASCADE NOT NULL,
  drug_type TEXT NOT NULL, -- 'weed', 'cocaine', 'meth', etc.
  quantity INTEGER DEFAULT 0,
  production_started_at TIMESTAMPTZ DEFAULT NOW(),
  production_ready_at TIMESTAMPTZ,
  status TEXT DEFAULT 'idle', -- 'idle', 'producing', 'ready'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, drug_type)
);

-- Brothel management
CREATE TABLE IF NOT EXISTS the_life_brothels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID REFERENCES the_life_players(id) ON DELETE CASCADE UNIQUE NOT NULL,
  workers INTEGER DEFAULT 0,
  income_per_hour INTEGER DEFAULT 0,
  last_collection TIMESTAMPTZ DEFAULT NOW(),
  total_earned BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PvP fight logs
CREATE TABLE IF NOT EXISTS the_life_pvp_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  attacker_id UUID REFERENCES the_life_players(id) ON DELETE CASCADE NOT NULL,
  defender_id UUID REFERENCES the_life_players(id) ON DELETE CASCADE NOT NULL,
  winner_id UUID REFERENCES the_life_players(id) ON DELETE CASCADE NOT NULL,
  cash_stolen INTEGER DEFAULT 0,
  attacker_hp_lost INTEGER DEFAULT 0,
  defender_hp_lost INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE the_life_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE the_life_robberies ENABLE ROW LEVEL SECURITY;
ALTER TABLE the_life_robbery_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE the_life_drug_ops ENABLE ROW LEVEL SECURITY;
ALTER TABLE the_life_brothels ENABLE ROW LEVEL SECURITY;
ALTER TABLE the_life_pvp_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own player data" ON the_life_players;
DROP POLICY IF EXISTS "Users can view other players for PvP" ON the_life_players;
DROP POLICY IF EXISTS "Users can insert own player data" ON the_life_players;
DROP POLICY IF EXISTS "Users can update own player data" ON the_life_players;
DROP POLICY IF EXISTS "Anyone can view robberies" ON the_life_robberies;
DROP POLICY IF EXISTS "Users can view own robbery history" ON the_life_robbery_history;
DROP POLICY IF EXISTS "Users can insert own robbery history" ON the_life_robbery_history;
DROP POLICY IF EXISTS "Users can view own drug ops" ON the_life_drug_ops;
DROP POLICY IF EXISTS "Users can manage own drug ops" ON the_life_drug_ops;
DROP POLICY IF EXISTS "Users can view own brothel" ON the_life_brothels;
DROP POLICY IF EXISTS "Users can manage own brothel" ON the_life_brothels;
DROP POLICY IF EXISTS "Users can view PvP logs they're involved in" ON the_life_pvp_logs;
DROP POLICY IF EXISTS "Users can insert PvP logs" ON the_life_pvp_logs;

-- Policies for the_life_players
CREATE POLICY "Users can view own player data"
  ON the_life_players FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view other players for PvP"
  ON the_life_players FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own player data"
  ON the_life_players FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own player data"
  ON the_life_players FOR UPDATE
  USING (auth.uid() = user_id);

-- Policies for robberies (public read)
CREATE POLICY "Anyone can view robberies"
  ON the_life_robberies FOR SELECT
  USING (true);

-- Policies for robbery history
CREATE POLICY "Users can view own robbery history"
  ON the_life_robbery_history FOR SELECT
  USING (
    player_id IN (
      SELECT id FROM the_life_players WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own robbery history"
  ON the_life_robbery_history FOR INSERT
  WITH CHECK (
    player_id IN (
      SELECT id FROM the_life_players WHERE user_id = auth.uid()
    )
  );

-- Policies for drug ops
CREATE POLICY "Users can view own drug ops"
  ON the_life_drug_ops FOR SELECT
  USING (
    player_id IN (
      SELECT id FROM the_life_players WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own drug ops"
  ON the_life_drug_ops FOR ALL
  USING (
    player_id IN (
      SELECT id FROM the_life_players WHERE user_id = auth.uid()
    )
  );

-- Policies for brothels
CREATE POLICY "Users can view own brothel"
  ON the_life_brothels FOR SELECT
  USING (
    player_id IN (
      SELECT id FROM the_life_players WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own brothel"
  ON the_life_brothels FOR ALL
  USING (
    player_id IN (
      SELECT id FROM the_life_players WHERE user_id = auth.uid()
    )
  );

-- Policies for PvP logs
CREATE POLICY "Users can view PvP logs they're involved in"
  ON the_life_pvp_logs FOR SELECT
  USING (
    attacker_id IN (SELECT id FROM the_life_players WHERE user_id = auth.uid())
    OR defender_id IN (SELECT id FROM the_life_players WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert PvP logs"
  ON the_life_pvp_logs FOR INSERT
  WITH CHECK (
    attacker_id IN (SELECT id FROM the_life_players WHERE user_id = auth.uid())
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_the_life_players_user_id ON the_life_players(user_id);
CREATE INDEX IF NOT EXISTS idx_the_life_players_xp ON the_life_players(xp DESC);
CREATE INDEX IF NOT EXISTS idx_the_life_players_cash ON the_life_players((cash + bank_balance) DESC);
CREATE INDEX IF NOT EXISTS idx_the_life_robbery_history_player_id ON the_life_robbery_history(player_id);
CREATE INDEX IF NOT EXISTS idx_the_life_drug_ops_player_id ON the_life_drug_ops(player_id);
CREATE INDEX IF NOT EXISTS idx_the_life_pvp_logs_attacker ON the_life_pvp_logs(attacker_id);
CREATE INDEX IF NOT EXISTS idx_the_life_pvp_logs_defender ON the_life_pvp_logs(defender_id);

-- Insert default robbery types
INSERT INTO the_life_robberies (name, description, image_url, min_level_required, ticket_cost, base_reward, max_reward, success_rate, jail_time_minutes, hp_loss_on_fail, xp_reward) VALUES
  ('Pickpocket', 'Steal from unsuspecting pedestrians', 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=400', 1, 1, 50, 200, 80, 15, 5, 5),
  ('Car Theft', 'Steal a parked car and sell it', 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400', 3, 2, 200, 800, 65, 30, 10, 15),
  ('House Burglary', 'Break into a residential home', 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400', 5, 3, 500, 2000, 55, 45, 15, 30),
  ('Convenience Store', 'Rob a local store', 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400', 8, 3, 800, 3000, 50, 60, 20, 50),
  ('Bank Heist', 'The big score - rob a bank', 'https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?w=400', 15, 5, 5000, 20000, 30, 120, 30, 200),
  ('Casino Vault', 'Break into the casino vault', 'https://images.unsplash.com/photo-1596838132731-3301c3fd4317?w=400', 25, 8, 15000, 50000, 20, 180, 40, 500)
ON CONFLICT DO NOTHING;

-- Function to auto-initialize player on first game access
CREATE OR REPLACE FUNCTION initialize_the_life_player()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO the_life_players (user_id)
  VALUES (auth.uid())
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
