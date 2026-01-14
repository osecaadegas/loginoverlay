-- Create voucher codes table
CREATE TABLE IF NOT EXISTS voucher_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    points INTEGER NOT NULL,
    max_uses INTEGER DEFAULT 1,
    current_uses INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);

-- Create voucher redemptions table to track who redeemed what
CREATE TABLE IF NOT EXISTS voucher_redemptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    voucher_id UUID REFERENCES voucher_codes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    points_awarded INTEGER NOT NULL,
    UNIQUE(voucher_id, user_id)
);

-- Enable RLS
ALTER TABLE voucher_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE voucher_redemptions ENABLE ROW LEVEL SECURITY;

-- Policies for voucher_codes
-- Anyone can view active vouchers
CREATE POLICY "Anyone can view active vouchers"
    ON voucher_codes FOR SELECT
    USING (is_active = true);

-- Only admins can insert/update/delete vouchers
CREATE POLICY "Admins can manage vouchers"
    ON voucher_codes FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
            AND is_active = true
        )
    );

-- Policies for voucher_redemptions
-- Users can view their own redemptions
CREATE POLICY "Users can view own redemptions"
    ON voucher_redemptions FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own redemptions
CREATE POLICY "Users can redeem vouchers"
    ON voucher_redemptions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Admins can view all redemptions
CREATE POLICY "Admins can view all redemptions"
    ON voucher_redemptions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
            AND is_active = true
        )
    );

-- Create indexes for performance
CREATE INDEX idx_voucher_codes_code ON voucher_codes(code);
CREATE INDEX idx_voucher_codes_active ON voucher_codes(is_active);
CREATE INDEX idx_voucher_redemptions_user ON voucher_redemptions(user_id);
CREATE INDEX idx_voucher_redemptions_voucher ON voucher_redemptions(voucher_id);
