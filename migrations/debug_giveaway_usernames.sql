-- Debug query to see what usernames are available for giveaway entries
SELECT 
  ge.user_id,
  ge.tickets_count,
  ge.entered_at,
  sec.se_username,
  up.twitch_username,
  au.raw_user_meta_data->>'twitch_username' as auth_twitch_username,
  au.email
FROM giveaway_entries ge
LEFT JOIN streamelements_connections sec ON sec.user_id = ge.user_id
LEFT JOIN user_profiles up ON up.user_id = ge.user_id
LEFT JOIN auth.users au ON au.id = ge.user_id
ORDER BY ge.entered_at DESC
LIMIT 10;
