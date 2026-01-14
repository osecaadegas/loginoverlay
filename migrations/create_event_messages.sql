-- Create table for event messages (jail, hospital, etc.)
CREATE TABLE IF NOT EXISTS the_life_event_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL, -- 'jail_crime', 'jail_street', 'hospital_beaten', 'hospital_hp_loss'
  message TEXT NOT NULL,
  image_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add RLS policies
ALTER TABLE the_life_event_messages ENABLE ROW LEVEL SECURITY;

-- Allow public read for active messages
CREATE POLICY "Anyone can view active event messages"
  ON the_life_event_messages
  FOR SELECT
  USING (is_active = true);

-- Allow admins to manage
CREATE POLICY "Admins can manage event messages"
  ON the_life_event_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Insert some default messages
INSERT INTO the_life_event_messages (event_type, message, image_url) VALUES
('jail_crime', 'Caught red-handed! Better luck next time...', 'https://images.unsplash.com/photo-1589391886645-d51941baf7fb?w=500'),
('jail_crime', 'The cops were waiting for you. Busted!', 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=500'),
('jail_street', 'Undercover cops! Your drugs have been confiscated.', 'https://images.unsplash.com/photo-1590856029826-c7a73142bbf1?w=500'),
('jail_street', 'Wrong place, wrong time. The streets are hot tonight!', 'https://images.unsplash.com/photo-1568515387631-8b650bbcdb90?w=500'),
('hospital_beaten', 'You took a serious beating out there!', 'https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?w=500'),
('hospital_beaten', 'That was brutal! Time to recover.', 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=500'),
('hospital_hp_loss', 'Critical condition! Medical attention required.', 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=500'),
('hospital_hp_loss', 'You pushed yourself too far!', 'https://images.unsplash.com/photo-1504439468489-c8920d796a29?w=500');

COMMENT ON TABLE the_life_event_messages IS 'Messages and images shown when players go to jail or hospital';
