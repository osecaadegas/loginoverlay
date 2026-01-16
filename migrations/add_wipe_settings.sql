-- Migration: Add Wipe Settings Table
-- This table stores the scheduled wipe configuration

-- Create wipe_settings table
CREATE TABLE IF NOT EXISTS the_life_wipe_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- What to wipe (checkboxes stored as booleans)
  wipe_inventory BOOLEAN DEFAULT false,
  wipe_cash BOOLEAN DEFAULT false,
  wipe_bank BOOLEAN DEFAULT false,
  wipe_level BOOLEAN DEFAULT false,
  wipe_skills BOOLEAN DEFAULT false,
  wipe_businesses BOOLEAN DEFAULT false,
  wipe_upgrades BOOLEAN DEFAULT false,
  wipe_brothel_workers BOOLEAN DEFAULT false,
  wipe_stocks BOOLEAN DEFAULT false,
  wipe_addiction BOOLEAN DEFAULT false,
  wipe_health_stamina BOOLEAN DEFAULT false,
  wipe_jail_hospital BOOLEAN DEFAULT false,
  wipe_pvp_stats BOOLEAN DEFAULT false,
  wipe_casino_history BOOLEAN DEFAULT false,
  wipe_dock_shipments BOOLEAN DEFAULT false,
  -- When to wipe
  scheduled_at TIMESTAMP WITH TIME ZONE,
  -- Recurring wipe settings
  is_recurring BOOLEAN DEFAULT false,
  recurrence_months INTEGER DEFAULT 3,
  -- Is the wipe active/scheduled
  is_active BOOLEAN DEFAULT false,
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Last time wipe was executed
  last_executed_at TIMESTAMP WITH TIME ZONE
);

-- Add new columns if table already existed (safe to run multiple times)
ALTER TABLE the_life_wipe_settings ADD COLUMN IF NOT EXISTS wipe_health_stamina BOOLEAN DEFAULT false;
ALTER TABLE the_life_wipe_settings ADD COLUMN IF NOT EXISTS wipe_jail_hospital BOOLEAN DEFAULT false;
ALTER TABLE the_life_wipe_settings ADD COLUMN IF NOT EXISTS wipe_pvp_stats BOOLEAN DEFAULT false;
ALTER TABLE the_life_wipe_settings ADD COLUMN IF NOT EXISTS wipe_casino_history BOOLEAN DEFAULT false;
ALTER TABLE the_life_wipe_settings ADD COLUMN IF NOT EXISTS wipe_dock_shipments BOOLEAN DEFAULT false;
ALTER TABLE the_life_wipe_settings ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE the_life_wipe_settings ADD COLUMN IF NOT EXISTS recurrence_months INTEGER DEFAULT 3;

-- Enable RLS
ALTER TABLE the_life_wipe_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin can manage wipe settings" ON the_life_wipe_settings;
DROP POLICY IF EXISTS "Everyone can read wipe settings" ON the_life_wipe_settings;

-- Admin can read/write wipe settings
CREATE POLICY "Admin can manage wipe settings" ON the_life_wipe_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Everyone can read wipe settings (for countdown display)
CREATE POLICY "Everyone can read wipe settings" ON the_life_wipe_settings
  FOR SELECT USING (true);

-- Insert a default row so there's always exactly one settings row
INSERT INTO the_life_wipe_settings (
  wipe_inventory, wipe_cash, wipe_bank, wipe_level, 
  wipe_skills, wipe_businesses, wipe_upgrades, 
  wipe_brothel_workers, wipe_stocks, wipe_addiction,
  is_active
) VALUES (
  false, false, false, false,
  false, false, false,
  false, false, false,
  false
) ON CONFLICT DO NOTHING;

-- Function to execute the wipe based on settings
CREATE OR REPLACE FUNCTION execute_the_life_wipe()
RETURNS void AS $$
DECLARE
  settings RECORD;
BEGIN
  -- Get the active wipe settings
  SELECT * INTO settings FROM the_life_wipe_settings WHERE is_active = true LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Check if it's time to wipe
  IF settings.scheduled_at IS NULL OR settings.scheduled_at > NOW() THEN
    RETURN;
  END IF;
  
  -- Execute wipes based on settings
  IF settings.wipe_inventory THEN
    DELETE FROM the_life_player_inventory;
  END IF;
  
  IF settings.wipe_cash THEN
    UPDATE the_life_players SET cash = 0;
  END IF;
  
  IF settings.wipe_bank THEN
    UPDATE the_life_players SET bank = 0;
  END IF;
  
  IF settings.wipe_level THEN
    UPDATE the_life_players SET level = 1, xp = 0;
  END IF;
  
  IF settings.wipe_skills THEN
    UPDATE the_life_players SET power = 1, defense = 1, intelligence = 1;
  END IF;
  
  IF settings.wipe_businesses THEN
    DELETE FROM the_life_player_businesses;
    DELETE FROM the_life_player_business_upgrades;
  END IF;
  
  IF settings.wipe_upgrades THEN
    DELETE FROM the_life_player_business_upgrades;
  END IF;
  
  IF settings.wipe_brothel_workers THEN
    DELETE FROM the_life_player_workers;
  END IF;
  
  IF settings.wipe_stocks THEN
    DELETE FROM the_life_player_stocks;
  END IF;
  
  IF settings.wipe_addiction THEN
    UPDATE the_life_players SET addiction = 0;
  END IF;
  
  IF settings.wipe_health_stamina THEN
    UPDATE the_life_players SET hp = max_hp, stamina = max_stamina;
  END IF;
  
  IF settings.wipe_jail_hospital THEN
    UPDATE the_life_players SET jail_until = NULL, hospital_until = NULL;
  END IF;
  
  IF settings.wipe_pvp_stats THEN
    UPDATE the_life_players SET pvp_wins = 0, pvp_losses = 0;
  END IF;
  
  IF settings.wipe_casino_history THEN
    DELETE FROM global_roulette_bets WHERE true;
    DELETE FROM global_roulette_player_stats WHERE true;
    DELETE FROM blackjack_games WHERE true;
  END IF;
  
  IF settings.wipe_dock_shipments THEN
    DELETE FROM the_life_player_shipments WHERE true;
    DELETE FROM the_life_business_production WHERE true;
  END IF;
  
  -- Mark wipe as executed and reschedule if recurring
  IF settings.is_recurring THEN
    UPDATE the_life_wipe_settings 
    SET scheduled_at = settings.scheduled_at + (settings.recurrence_months || ' months')::interval,
        last_executed_at = NOW(),
        updated_at = NOW()
    WHERE id = settings.id;
  ELSE
    UPDATE the_life_wipe_settings 
    SET is_active = false, 
        last_executed_at = NOW(),
        updated_at = NOW()
    WHERE id = settings.id;
  END IF;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
