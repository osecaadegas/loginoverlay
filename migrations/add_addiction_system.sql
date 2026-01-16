-- Add addiction system to The Life players
-- Addiction builds up when using energy drinks/powder

ALTER TABLE the_life_players 
ADD COLUMN IF NOT EXISTS addiction INTEGER DEFAULT 0;

ALTER TABLE the_life_players 
ADD COLUMN IF NOT EXISTS max_addiction INTEGER DEFAULT 100;

-- Update the_life_items to include addiction value in effect
UPDATE the_life_items
SET effect = '{"type": "stamina", "value": 15, "addiction": 2}'
WHERE name = 'Energy Drink';

-- Add Powder Energy with higher stamina restore and addiction
INSERT INTO the_life_items (name, description, type, icon, rarity, tradeable, usable, effect)
VALUES 
  ('Powder Energy', 'Powerful stimulant - restores 75 stamina but addictive', 'consumable', 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400', 'rare', true, true, '{"type": "stamina", "value": 75, "addiction": 10}')
ON CONFLICT DO NOTHING;

-- Function to decay addiction over time (call this periodically)
CREATE OR REPLACE FUNCTION decay_player_addiction()
RETURNS void AS $$
BEGIN
  UPDATE the_life_players
  SET addiction = GREATEST(0, addiction - 1)
  WHERE addiction > 0;
END;
$$ LANGUAGE plpgsql;

-- Comment explaining addiction effects
COMMENT ON COLUMN the_life_players.addiction IS 'Addiction level 0-100. High addiction causes withdrawal symptoms affecting stamina regen and other penalties.';
