-- Add High-Stakes category info to the_life_category_info table

INSERT INTO the_life_category_info (category_key, category_name, description, image_url) VALUES
('highstakes', 'High Stakes', 'Enter the world of high-risk, high-reward activities. Only the bold survive in these dangerous ventures.', '/thelife/categories/high-stakes.png')
ON CONFLICT (category_key) DO UPDATE SET
  category_name = EXCLUDED.category_name,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  updated_at = NOW();
