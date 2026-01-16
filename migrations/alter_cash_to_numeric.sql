-- Alter cash column to accept decimal values
-- Change from bigint to numeric(20, 2) to allow 2 decimal places

ALTER TABLE the_life_players 
ALTER COLUMN cash TYPE numeric(20, 2) USING cash::numeric(20, 2);

-- Also update bank_balance if it exists and is bigint
ALTER TABLE the_life_players 
ALTER COLUMN bank_balance TYPE numeric(20, 2) USING bank_balance::numeric(20, 2);
