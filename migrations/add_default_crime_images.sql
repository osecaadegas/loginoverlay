-- Add default image URLs and update all values for existing crimes
-- Run this after add_image_urls_to_game_tables.sql

UPDATE the_life_robberies 
SET 
  image_url = 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=400',
  description = 'Steal from unsuspecting pedestrians',
  min_level_required = 1,
  ticket_cost = 1,
  base_reward = 50,
  max_reward = 200,
  success_rate = 80,
  jail_time_minutes = 15,
  hp_loss_on_fail = 5,
  xp_reward = 5
WHERE name = 'Pickpocket';

UPDATE the_life_robberies 
SET 
  image_url = 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400',
  description = 'Steal a parked car and sell it',
  min_level_required = 3,
  ticket_cost = 2,
  base_reward = 200,
  max_reward = 800,
  success_rate = 65,
  jail_time_minutes = 30,
  hp_loss_on_fail = 10,
  xp_reward = 15
WHERE name = 'Car Theft';

UPDATE the_life_robberies 
SET 
  image_url = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400',
  description = 'Break into a residential home',
  min_level_required = 5,
  ticket_cost = 3,
  base_reward = 500,
  max_reward = 2000,
  success_rate = 55,
  jail_time_minutes = 45,
  hp_loss_on_fail = 15,
  xp_reward = 30
WHERE name = 'House Burglary';

UPDATE the_life_robberies 
SET 
  image_url = 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400',
  description = 'Rob a local store',
  min_level_required = 8,
  ticket_cost = 3,
  base_reward = 800,
  max_reward = 3000,
  success_rate = 50,
  jail_time_minutes = 60,
  hp_loss_on_fail = 20,
  xp_reward = 50
WHERE name = 'Convenience Store';

UPDATE the_life_robberies 
SET 
  image_url = 'https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?w=400',
  description = 'The big score - rob a bank',
  min_level_required = 15,
  ticket_cost = 5,
  base_reward = 5000,
  max_reward = 20000,
  success_rate = 30,
  jail_time_minutes = 120,
  hp_loss_on_fail = 30,
  xp_reward = 200
WHERE name = 'Bank Heist';

UPDATE the_life_robberies 
SET 
  image_url = 'https://images.unsplash.com/photo-1596838132731-3301c3fd4317?w=400',
  description = 'Break into the casino vault',
  min_level_required = 25,
  ticket_cost = 8,
  base_reward = 15000,
  max_reward = 50000,
  success_rate = 20,
  jail_time_minutes = 180,
  hp_loss_on_fail = 40,
  xp_reward = 500
WHERE name = 'Casino Vault';

-- Verify the updates
SELECT name, image_url, success_rate, jail_time_minutes FROM the_life_robberies ORDER BY min_level_required;
