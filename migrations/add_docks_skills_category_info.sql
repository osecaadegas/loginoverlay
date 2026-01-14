-- Add category info for Docks and Skills (Underworld Training)

INSERT INTO the_life_category_info (category_key, category_name, description, image_url) VALUES
('docks', 'Docks', 'Ship drugs safely via boats with 0% risk. Boats arrive at scheduled times and have limited capacity. Perfect for guaranteed sales without the risk of jail time.', 'https://images.unsplash.com/photo-1606666693293-6b5e0e9e6e8d?w=400'),
('skills', 'Underworld Training', 'Train your criminal skills: Power increases damage in combat, Intelligence boosts crime success rates, and Defense reduces HP loss. Each level costs more but makes you more formidable.', 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400')
ON CONFLICT (category_key) DO UPDATE SET
  category_name = EXCLUDED.category_name,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  updated_at = NOW();
