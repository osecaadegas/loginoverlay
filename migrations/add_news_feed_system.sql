-- News Feed System for The Life
-- Creates a dynamic news journal to engage players with live game events

-- Create news feed table
CREATE TABLE IF NOT EXISTS the_life_news_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  news_type TEXT NOT NULL, -- 'crime', 'pvp', 'leaderboard', 'dock', 'brothel', 'stock', 'kingpin', 'general'
  category TEXT, -- More specific categorization
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  icon TEXT DEFAULT '📰',
  player_id uuid REFERENCES the_life_players(id) ON DELETE SET NULL,
  player_name TEXT, -- Store name for historical records
  related_data JSONB DEFAULT '{}', -- Store related stats/info
  priority INTEGER DEFAULT 1, -- 1=low, 2=medium, 3=high
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_news_feed_active ON the_life_news_feed(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_feed_type ON the_life_news_feed(news_type);
CREATE INDEX IF NOT EXISTS idx_news_feed_expires ON the_life_news_feed(expires_at);

-- Enable RLS
ALTER TABLE the_life_news_feed ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read news
CREATE POLICY "Anyone can read news feed" ON the_life_news_feed
  FOR SELECT USING (true);

-- Only system/admin can insert news
CREATE POLICY "System can insert news" ON the_life_news_feed
  FOR INSERT WITH CHECK (true);

-- Clean up old news automatically (run via cron)
CREATE OR REPLACE FUNCTION cleanup_old_news()
RETURNS void AS $$
BEGIN
  UPDATE the_life_news_feed 
  SET is_active = false 
  WHERE expires_at < NOW() AND is_active = true;
  
  -- Delete news older than 7 days
  DELETE FROM the_life_news_feed 
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate crime news
CREATE OR REPLACE FUNCTION generate_crime_news()
RETURNS void AS $$
DECLARE
  crime_record RECORD;
  player_record RECORD;
BEGIN
  -- Get most committed crime in last 24 hours
  SELECT 
    r.name as crime_name,
    COUNT(*) as crime_count
  FROM the_life_players p
  CROSS JOIN the_life_robberies r
  WHERE p.total_robberies > 0
  GROUP BY r.name
  ORDER BY crime_count DESC
  LIMIT 1
  INTO crime_record;
  
  IF crime_record IS NOT NULL THEN
    INSERT INTO the_life_news_feed (
      news_type, category, title, content, icon, priority, related_data
    ) VALUES (
      'crime',
      'trending',
      '🔥 CRIME WAVE ALERT',
      crime_record.crime_name || ' has become the most popular crime with ' || crime_record.crime_count || ' attempts!',
      '🚨',
      2,
      jsonb_build_object('crime_name', crime_record.crime_name, 'count', crime_record.crime_count)
    ) ON CONFLICT DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate leaderboard news
CREATE OR REPLACE FUNCTION generate_leaderboard_news()
RETURNS void AS $$
DECLARE
  top_player RECORD;
  rank_num INTEGER := 1;
BEGIN
  -- Get top 3 players
  FOR top_player IN (
    SELECT 
      id,
      se_username,
      twitch_username,
      level,
      xp,
      cash + bank_balance as net_worth
    FROM the_life_players
    ORDER BY (cash + bank_balance) DESC
    LIMIT 3
  ) LOOP
    INSERT INTO the_life_news_feed (
      news_type, category, title, content, icon, player_id, player_name, priority, related_data
    ) VALUES (
      'leaderboard',
      CASE rank_num 
        WHEN 1 THEN 'gold'
        WHEN 2 THEN 'silver'
        ELSE 'bronze'
      END,
      CASE rank_num 
        WHEN 1 THEN '🥇 TOP DOG'
        WHEN 2 THEN '🥈 RUNNER UP'
        ELSE '🥉 THIRD PLACE'
      END,
      COALESCE(top_player.se_username, top_player.twitch_username, 'Anonymous') || 
      ' holds position #' || rank_num || ' with $' || 
      to_char(top_player.net_worth, 'FM999,999,999') || ' net worth!',
      CASE rank_num WHEN 1 THEN '👑' WHEN 2 THEN '⭐' ELSE '🌟' END,
      top_player.id,
      COALESCE(top_player.se_username, top_player.twitch_username, 'Anonymous'),
      3,
      jsonb_build_object('rank', rank_num, 'net_worth', top_player.net_worth, 'level', top_player.level)
    );
    rank_num := rank_num + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate PVP champion news
CREATE OR REPLACE FUNCTION generate_pvp_news()
RETURNS void AS $$
DECLARE
  pvp_champ RECORD;
BEGIN
  -- Get player with least defeats (and at least some wins)
  SELECT 
    id,
    se_username,
    twitch_username,
    pvp_wins,
    pvp_losses,
    CASE WHEN pvp_losses = 0 THEN pvp_wins ELSE (pvp_wins::float / NULLIF(pvp_losses, 0)) END as win_ratio
  FROM the_life_players
  WHERE pvp_wins > 0
  ORDER BY pvp_losses ASC, pvp_wins DESC
  LIMIT 1
  INTO pvp_champ;
  
  IF pvp_champ IS NOT NULL THEN
    INSERT INTO the_life_news_feed (
      news_type, category, title, content, icon, player_id, player_name, priority, related_data
    ) VALUES (
      'pvp',
      'champion',
      '⚔️ PVP DESTROYER',
      COALESCE(pvp_champ.se_username, pvp_champ.twitch_username, 'A mysterious fighter') || 
      ' is dominating with only ' || pvp_champ.pvp_losses || ' defeats and ' || 
      pvp_champ.pvp_wins || ' victories!',
      '🏆',
      pvp_champ.id,
      COALESCE(pvp_champ.se_username, pvp_champ.twitch_username, 'Anonymous'),
      2,
      jsonb_build_object('wins', pvp_champ.pvp_wins, 'losses', pvp_champ.pvp_losses, 'ratio', pvp_champ.win_ratio)
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate kingpin alert (fastest rising player)
CREATE OR REPLACE FUNCTION generate_kingpin_news()
RETURNS void AS $$
DECLARE
  rising_star RECORD;
BEGIN
  -- Get player with highest level who isn't #1 in wealth (ambitious climbers)
  SELECT 
    id,
    se_username,
    twitch_username,
    level,
    xp,
    total_robberies,
    successful_robberies
  FROM the_life_players
  WHERE level >= 5
  ORDER BY (successful_robberies::float / NULLIF(total_robberies, 1)) DESC, level DESC
  LIMIT 1
  INTO rising_star;
  
  IF rising_star IS NOT NULL AND rising_star.total_robberies > 10 THEN
    INSERT INTO the_life_news_feed (
      news_type, category, title, content, icon, player_id, player_name, priority, related_data
    ) VALUES (
      'kingpin',
      'rising',
      '👑 RISING KINGPIN',
      COALESCE(rising_star.se_username, rising_star.twitch_username, 'Someone') || 
      ' is making moves! Level ' || rising_star.level || 
      ' with ' || rising_star.successful_robberies || ' successful heists. Watch out!',
      '🚀',
      rising_star.id,
      COALESCE(rising_star.se_username, rising_star.twitch_username, 'Anonymous'),
      3,
      jsonb_build_object('level', rising_star.level, 'heists', rising_star.successful_robberies)
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert some initial news items
INSERT INTO the_life_news_feed (news_type, category, title, content, icon, priority, expires_at) VALUES
('general', 'welcome', '📰 NEWS FEED LIVE', 'Welcome to the Underground News Network! Stay updated on crime waves, market moves, and rising kingpins.', '📺', 1, NOW() + INTERVAL '30 days'),
('general', 'tip', '💡 DAILY TIP', 'Complete crimes to build your reputation. The streets are watching!', '💡', 1, NOW() + INTERVAL '7 days');

-- Enable realtime for news feed
ALTER PUBLICATION supabase_realtime ADD TABLE the_life_news_feed;

COMMENT ON TABLE the_life_news_feed IS 'Dynamic news feed to engage players with live game events and stats';
