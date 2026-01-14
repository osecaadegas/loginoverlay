-- Remove check constraints that limit skill levels to 100
-- This allows unlimited skill upgrades

-- Drop the existing check constraints
ALTER TABLE the_life_players
DROP CONSTRAINT IF EXISTS the_life_players_power_check;

ALTER TABLE the_life_players
DROP CONSTRAINT IF EXISTS the_life_players_intelligence_check;

ALTER TABLE the_life_players
DROP CONSTRAINT IF EXISTS the_life_players_defense_check;
