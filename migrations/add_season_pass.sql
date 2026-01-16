-- Season Pass Database Tables
-- Syncs with The Life wipe timer for season end dates

-- Season Pass Seasons Table
CREATE TABLE IF NOT EXISTS season_pass_seasons (
  id SERIAL PRIMARY KEY,
  season_number INTEGER NOT NULL DEFAULT 1,
  name VARCHAR(255) NOT NULL DEFAULT 'Underground Empire',
  description TEXT,
  start_date TIMESTAMPTZ DEFAULT NOW(),
  end_date TIMESTAMPTZ, -- Synced with the_life_wipe_settings.scheduled_at
  is_active BOOLEAN DEFAULT true,
  premium_price_cents INTEGER DEFAULT 999, -- $9.99 in cents for Stripe
  stripe_price_id VARCHAR(255), -- Stripe price ID for premium purchase
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Season Pass Rewards Table (reward definitions)
CREATE TABLE IF NOT EXISTS season_pass_rewards (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL, -- 'currency', 'item', 'xp', 'weapon', 'gear', 'cosmetic', 'boost'
  icon VARCHAR(100) DEFAULT 'fa-gift',
  rarity VARCHAR(20) DEFAULT 'common', -- 'common', 'uncommon', 'rare', 'epic', 'legendary'
  quantity INTEGER DEFAULT 1,
  item_id UUID REFERENCES the_life_items(id), -- If reward is an item (UUID type)
  cash_amount INTEGER DEFAULT 0, -- If reward is cash
  xp_amount INTEGER DEFAULT 0, -- If reward is XP
  se_points_amount INTEGER DEFAULT 0, -- If reward is SE Points
  effect_data JSONB, -- Any special effects (multipliers, boosts, etc.)
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Season Pass Tiers Table (70 tiers per season)
CREATE TABLE IF NOT EXISTS season_pass_tiers (
  id SERIAL PRIMARY KEY,
  season_id INTEGER REFERENCES season_pass_seasons(id) ON DELETE CASCADE,
  tier_number INTEGER NOT NULL, -- 1-70
  xp_required INTEGER NOT NULL, -- XP needed to reach this tier (500 + (tier-1)*100)
  budget_reward_id INTEGER REFERENCES season_pass_rewards(id), -- Free track reward
  premium_reward_id INTEGER REFERENCES season_pass_rewards(id), -- Premium track reward
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(season_id, tier_number)
);

-- Player Season Pass Progress
CREATE TABLE IF NOT EXISTS season_pass_progress (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  season_id INTEGER REFERENCES season_pass_seasons(id) ON DELETE CASCADE,
  total_xp INTEGER DEFAULT 0,
  has_premium BOOLEAN DEFAULT false,
  premium_purchased_at TIMESTAMPTZ,
  stripe_payment_id VARCHAR(255), -- Stripe payment reference
  claimed_budget_tiers INTEGER[] DEFAULT '{}', -- Array of claimed tier numbers
  claimed_premium_tiers INTEGER[] DEFAULT '{}', -- Array of claimed premium tier numbers
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, season_id)
);

-- XP Earning History (for auditing)
CREATE TABLE IF NOT EXISTS season_pass_xp_history (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  season_id INTEGER REFERENCES season_pass_seasons(id) ON DELETE CASCADE,
  xp_amount INTEGER NOT NULL,
  source VARCHAR(100) NOT NULL, -- 'crime', 'pvp', 'business', 'mission', 'daily', etc.
  source_id VARCHAR(255), -- Reference to what earned the XP
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_season_pass_progress_user ON season_pass_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_season_pass_progress_season ON season_pass_progress(season_id);
CREATE INDEX IF NOT EXISTS idx_season_pass_tiers_season ON season_pass_tiers(season_id);
CREATE INDEX IF NOT EXISTS idx_season_pass_xp_history_user ON season_pass_xp_history(user_id);

-- RLS Policies
ALTER TABLE season_pass_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE season_pass_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE season_pass_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE season_pass_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE season_pass_xp_history ENABLE ROW LEVEL SECURITY;

-- Season Pass Seasons - anyone can view active seasons
CREATE POLICY "Anyone can view active seasons" ON season_pass_seasons
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage seasons" ON season_pass_seasons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Season Pass Rewards - anyone can view
CREATE POLICY "Anyone can view rewards" ON season_pass_rewards
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage rewards" ON season_pass_rewards
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Season Pass Tiers - anyone can view
CREATE POLICY "Anyone can view tiers" ON season_pass_tiers
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage tiers" ON season_pass_tiers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Season Pass Progress - users can view/update their own
CREATE POLICY "Users can view own progress" ON season_pass_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" ON season_pass_progress
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress" ON season_pass_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all progress" ON season_pass_progress
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- XP History - users can view their own
CREATE POLICY "Users can view own xp history" ON season_pass_xp_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own xp history" ON season_pass_xp_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create initial season (syncs end_date on first load)
INSERT INTO season_pass_seasons (season_number, name, description, is_active)
VALUES (1, 'Underground Empire', 'Rise through the criminal ranks. Earn exclusive contraband, weapons, and safehouse upgrades.', true)
ON CONFLICT DO NOTHING;

-- Function to sync season end date with wipe timer
CREATE OR REPLACE FUNCTION sync_season_with_wipe()
RETURNS TRIGGER AS $$
BEGIN
  -- Update active season end_date when wipe scheduled_at changes
  UPDATE season_pass_seasons
  SET end_date = NEW.scheduled_at,
      updated_at = NOW()
  WHERE is_active = true;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-sync season end with wipe timer
DROP TRIGGER IF EXISTS sync_season_end_trigger ON the_life_wipe_settings;
CREATE TRIGGER sync_season_end_trigger
  AFTER UPDATE OF scheduled_at ON the_life_wipe_settings
  FOR EACH ROW
  EXECUTE FUNCTION sync_season_with_wipe();

-- Function to grant Season Pass XP (call from game actions)
CREATE OR REPLACE FUNCTION grant_season_pass_xp(
  p_user_id UUID,
  p_xp_amount INTEGER,
  p_source VARCHAR(100),
  p_source_id VARCHAR(255) DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_season_id INTEGER;
  v_new_total INTEGER;
BEGIN
  -- Get active season
  SELECT id INTO v_season_id
  FROM season_pass_seasons
  WHERE is_active = true
  LIMIT 1;
  
  IF v_season_id IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Upsert progress and add XP
  INSERT INTO season_pass_progress (user_id, season_id, total_xp)
  VALUES (p_user_id, v_season_id, p_xp_amount)
  ON CONFLICT (user_id, season_id)
  DO UPDATE SET 
    total_xp = season_pass_progress.total_xp + p_xp_amount,
    updated_at = NOW()
  RETURNING total_xp INTO v_new_total;
  
  -- Log XP history
  INSERT INTO season_pass_xp_history (user_id, season_id, xp_amount, source, source_id)
  VALUES (p_user_id, v_season_id, p_xp_amount, p_source, p_source_id);
  
  RETURN v_new_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
