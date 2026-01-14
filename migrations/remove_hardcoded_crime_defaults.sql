-- Remove the hardcoded default crimes insert from future migrations
-- This migration ensures that crime data is managed through the admin panel only

-- Note: The initial crimes were created in create_the_life_game.sql with:
-- INSERT INTO the_life_robberies ... ON CONFLICT DO NOTHING;

-- This prevented duplicates but the INSERT statement should not be run again.
-- All crime management should now be done through the admin panel.

-- To verify your crimes are properly saved, check if they exist:
SELECT name, description, min_level_required, ticket_cost, success_rate, jail_time_minutes 
FROM the_life_robberies 
ORDER BY min_level_required;

-- If you need to reset crimes to defaults, you can manually run:
-- DELETE FROM the_life_robberies;
-- Then re-insert the defaults from create_the_life_game.sql

-- IMPORTANT: Do NOT re-run create_the_life_game.sql as it will not update existing records
-- due to ON CONFLICT DO NOTHING clause. All updates should be done via admin panel.

-- If you accidentally deleted all crimes, here are the defaults you can insert:
/*
INSERT INTO the_life_robberies (name, description, min_level_required, ticket_cost, base_reward, max_reward, success_rate, jail_time_minutes, hp_loss_on_fail, xp_reward, is_active) VALUES
  ('Pickpocket', 'Steal from unsuspecting pedestrians', 1, 1, 50, 200, 70, 15, 5, 5, true),
  ('Car Theft', 'Steal a parked car and sell it', 3, 2, 200, 800, 60, 30, 10, 15, true),
  ('House Burglary', 'Break into a residential home', 5, 3, 500, 2000, 50, 45, 15, 30, true),
  ('Convenience Store', 'Rob a local store', 8, 3, 800, 3000, 45, 60, 20, 50, true),
  ('Bank Heist', 'The big score - rob a bank', 15, 5, 5000, 20000, 30, 120, 30, 200, true),
  ('Casino Vault', 'Break into the casino vault', 25, 8, 15000, 50000, 20, 180, 40, 500, true)
ON CONFLICT DO NOTHING;
*/
