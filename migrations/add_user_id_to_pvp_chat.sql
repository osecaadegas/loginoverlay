-- Add user_id column to the_life_pvp_chat table
-- This allows us to fetch Twitch/SE usernames for chat messages

-- Add user_id column if it doesn't exist
ALTER TABLE the_life_pvp_chat 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_pvp_chat_user_id ON the_life_pvp_chat(user_id);

-- Update existing records to populate user_id from player_id
-- This query joins with the_life_players to get the user_id
UPDATE the_life_pvp_chat c
SET user_id = p.user_id
FROM the_life_players p
WHERE c.player_id = p.id AND c.user_id IS NULL;

-- Make user_id NOT NULL after populating existing data
ALTER TABLE the_life_pvp_chat 
ALTER COLUMN user_id SET NOT NULL;
