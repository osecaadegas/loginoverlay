-- Add twitch_username column to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS twitch_username TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_twitch_username ON user_profiles(twitch_username);

-- Update RLS policies to allow reading twitch_username publicly
DROP POLICY IF EXISTS "Anyone can view twitch usernames" ON user_profiles;
CREATE POLICY "Anyone can view twitch usernames"
  ON user_profiles
  FOR SELECT
  USING (true);

-- Function to automatically populate twitch_username from auth.users metadata
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Get twitch_username from auth.users user_metadata
  SELECT raw_user_meta_data->>'twitch_username' INTO NEW.twitch_username
  FROM auth.users
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to populate twitch_username on insert
DROP TRIGGER IF EXISTS on_user_profile_created ON user_profiles;
CREATE TRIGGER on_user_profile_created
  BEFORE INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_profile();

-- Populate existing profiles with twitch_username from auth.users
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT up.user_id, au.raw_user_meta_data->>'twitch_username' as twitch_username
    FROM user_profiles up
    JOIN auth.users au ON au.id = up.user_id
    WHERE up.twitch_username IS NULL
  LOOP
    UPDATE user_profiles
    SET twitch_username = user_record.twitch_username
    WHERE user_id = user_record.user_id;
  END LOOP;
END $$;
