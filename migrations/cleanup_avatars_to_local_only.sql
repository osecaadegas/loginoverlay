-- Remove all avatars that are not the local avatar files
DELETE FROM the_life_avatars 
WHERE image_url NOT IN (
  '/thelife/avatars/avatar1.png',
  '/thelife/avatars/avatar2.png',
  '/thelife/avatars/avatar3.png',
  '/thelife/avatars/avatar4.png',
  '/thelife/avatars/avatar5.png',
  '/thelife/avatars/avatar6.png',
  '/thelife/avatars/avatar7.png',
  '/thelife/avatars/avatar8.png'
);

-- Make sure the 8 avatars are properly set (will only insert if they don't exist)
INSERT INTO the_life_avatars (name, image_url, display_order, is_active) VALUES
('Avatar 1', '/thelife/avatars/avatar1.png', 1, true),
('Avatar 2', '/thelife/avatars/avatar2.png', 2, true),
('Avatar 3', '/thelife/avatars/avatar3.png', 3, true),
('Avatar 4', '/thelife/avatars/avatar4.png', 4, true),
('Avatar 5', '/thelife/avatars/avatar5.png', 5, true),
('Avatar 6', '/thelife/avatars/avatar6.png', 6, true),
('Avatar 7', '/thelife/avatars/avatar7.png', 7, true),
('Avatar 8', '/thelife/avatars/avatar8.png', 8, true)
ON CONFLICT DO NOTHING;
