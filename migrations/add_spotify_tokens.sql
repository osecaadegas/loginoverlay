-- Spotify token storage for song request API
-- One row per streamer. The serverless API reads this to queue songs.

CREATE TABLE IF NOT EXISTS spotify_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- RLS
ALTER TABLE spotify_tokens ENABLE ROW LEVEL SECURITY;

-- Users can read/write their own tokens
CREATE POLICY spotify_tokens_select ON spotify_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY spotify_tokens_insert ON spotify_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY spotify_tokens_update ON spotify_tokens FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY spotify_tokens_delete ON spotify_tokens FOR DELETE USING (auth.uid() = user_id);

-- The service_role key (used by the API route) bypasses RLS, so it can read any streamer's tokens.
