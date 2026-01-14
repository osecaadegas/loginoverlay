-- Add deposit_methods column to casino_offers table
ALTER TABLE casino_offers 
ADD COLUMN IF NOT EXISTS deposit_methods TEXT;

COMMENT ON COLUMN casino_offers.deposit_methods IS 'Comma-separated list of accepted deposit methods (e.g., "Visa, Mastercard, Bitcoin, Skrill")';
