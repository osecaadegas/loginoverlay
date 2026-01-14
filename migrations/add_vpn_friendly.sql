-- Add vpn_friendly column to casino_offers table
ALTER TABLE casino_offers 
ADD COLUMN IF NOT EXISTS vpn_friendly BOOLEAN DEFAULT false;

COMMENT ON COLUMN casino_offers.vpn_friendly IS 'Indicates if the casino accepts VPN connections';
