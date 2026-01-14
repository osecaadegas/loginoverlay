-- Check what tables exist that might have username data
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name LIKE '%profile%' OR table_name LIKE '%user%' OR table_name LIKE '%connection%')
ORDER BY table_name;

-- Update from streamelements_connections table (only has se_username)
UPDATE the_life_players tlp
SET 
  se_username = sec.se_username
FROM streamelements_connections sec
WHERE tlp.user_id = sec.user_id
AND tlp.se_username IS NULL;

-- Manual update for specific user (replace with your user_id)
-- UPDATE the_life_players 
-- SET se_username = 'osecaadegas95'
-- WHERE user_id = 'your-user-id-here';

-- Verify the update
SELECT 
  user_id,
  se_username,
  twitch_username,
  level,
  cash
FROM the_life_players
LIMIT 10;
