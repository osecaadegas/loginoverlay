-- Ensure all users who entered giveaways have a user_profiles record with twitch_username
INSERT INTO user_profiles (user_id, twitch_username, created_at, updated_at)
SELECT DISTINCT 
  ge.user_id,
  au.raw_user_meta_data->>'twitch_username' as twitch_username,
  NOW(),
  NOW()
FROM giveaway_entries ge
JOIN auth.users au ON au.id = ge.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles up WHERE up.user_id = ge.user_id
)
ON CONFLICT (user_id) DO NOTHING;

-- Also ensure for giveaway winners
INSERT INTO user_profiles (user_id, twitch_username, created_at, updated_at)
SELECT DISTINCT 
  gw.user_id,
  au.raw_user_meta_data->>'twitch_username' as twitch_username,
  NOW(),
  NOW()
FROM giveaway_winners gw
JOIN auth.users au ON au.id = gw.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles up WHERE up.user_id = gw.user_id
)
ON CONFLICT (user_id) DO NOTHING;
