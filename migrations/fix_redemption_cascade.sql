-- Fix: Allow deleting redemption_items that have been redeemed
-- Error: "update or delete on table redemption_items violates foreign key constraint 
--         point_redemptions_redemption_id_fkey on table point_redemptions"

-- Drop the existing constraint (no CASCADE)
ALTER TABLE point_redemptions
  DROP CONSTRAINT IF EXISTS point_redemptions_redemption_id_fkey;

-- Re-add with ON DELETE CASCADE so deleting an item also removes its redemption history
ALTER TABLE point_redemptions
  ADD CONSTRAINT point_redemptions_redemption_id_fkey
  FOREIGN KEY (redemption_id) REFERENCES redemption_items(id) ON DELETE CASCADE;
