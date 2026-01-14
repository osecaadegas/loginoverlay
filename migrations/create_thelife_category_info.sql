-- Create table for The Life category information (images and descriptions)
CREATE TABLE IF NOT EXISTS the_life_category_info (
  id BIGSERIAL PRIMARY KEY,
  category_key TEXT UNIQUE NOT NULL,
  category_name TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default category info
INSERT INTO the_life_category_info (category_key, category_name, description, image_url) VALUES
('crimes', 'Crimes', 'Pull off heists and robberies to earn quick cash. Higher level crimes offer bigger rewards but come with greater risks of jail time.', 'https://images.unsplash.com/photo-1595433707802-6b2626ef1c91?w=400'),
('pvp', 'PvP Combat', 'Attack other players to steal their cash and send them to the hospital. Your level and HP determine your chances of winning.', 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400'),
('businesses', 'Businesses', 'Own and operate various businesses to generate passive income. Upgrade your businesses to increase production and profits.', 'https://images.unsplash.com/photo-1556155092-490a1ba16284?w=400'),
('brothel', 'Brothel', 'Hire workers to generate passive income. Upgrade your brothel to unlock more worker slots and increase your hourly earnings.', 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=400'),
('inventory', 'Stash', 'Store items earned from businesses and activities. Special items like Jail Free Cards can help you escape tight situations.', 'https://images.unsplash.com/photo-1553835973-dec43bfddbeb?w=400'),
('jail', 'Jail', 'When crimes fail, you end up here. Use a Jail Free Card or pay a bribe to escape early, or wait out your sentence.', 'https://images.unsplash.com/photo-1589391886645-d51941baf7fb?w=400'),
('hospital', 'Hospital', 'Recover your HP after battles or failed crimes. Pay for medical services to get back in action faster.', 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400'),
('market', 'Black Market', 'Sell drugs on the streets for high profits but risk jail time, or use the safe docks for guaranteed sales with lower payouts.', 'https://images.unsplash.com/photo-1534452203293-494d7ddbf7e0?w=400'),
('bank', 'Bank', 'Keep your money safe from other players. Deposit your cash to protect it from PvP losses and robberies.', 'https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?w=400'),
('stats', 'Statistics', 'Track your criminal career progress including total crimes, success rate, PvP record, and login streaks.', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400'),
('leaderboard', 'Leaderboard', 'Compete with other players for the top spots. Rankings are based on total cash, level, and criminal success.', 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400')
ON CONFLICT (category_key) DO NOTHING;

-- Enable RLS
ALTER TABLE the_life_category_info ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access to category info"
  ON the_life_category_info
  FOR SELECT
  TO public
  USING (true);

-- Allow authenticated users to view
CREATE POLICY "Allow authenticated read access"
  ON the_life_category_info
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow service role to manage
CREATE POLICY "Allow service role full access"
  ON the_life_category_info
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
