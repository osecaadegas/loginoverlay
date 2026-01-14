-- Fix foreign key constraint to allow item deletion
-- When an item is deleted, set business reward_item_id to NULL instead of preventing deletion

-- Drop the old constraints
ALTER TABLE the_life_businesses
DROP CONSTRAINT IF EXISTS the_life_businesses_reward_item_id_fkey;

ALTER TABLE the_life_business_productions
DROP CONSTRAINT IF EXISTS the_life_business_productions_reward_item_id_fkey;

-- Add new constraints with ON DELETE SET NULL
ALTER TABLE the_life_businesses
ADD CONSTRAINT the_life_businesses_reward_item_id_fkey
FOREIGN KEY (reward_item_id)
REFERENCES the_life_items(id)
ON DELETE SET NULL;

ALTER TABLE the_life_business_productions
ADD CONSTRAINT the_life_business_productions_reward_item_id_fkey
FOREIGN KEY (reward_item_id)
REFERENCES the_life_items(id)
ON DELETE SET NULL;
