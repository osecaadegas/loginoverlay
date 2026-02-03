-- Economy Transactions Table - Money flow tracking
CREATE TABLE IF NOT EXISTS economy_transactions (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  player_id UUID NOT NULL REFERENCES the_life_players(id) ON DELETE CASCADE,
  
  -- Transaction details
  transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('earned', 'spent', 'transfer_sent', 'transfer_received', 'admin_adjustment', 'daily_reward', 'refund')),
  amount NUMERIC(20, 2) NOT NULL,
  balance_before NUMERIC(20, 2) NOT NULL,
  balance_after NUMERIC(20, 2) NOT NULL,
  
  -- Source/destination tracking
  source VARCHAR(100) NOT NULL,
  source_id INTEGER,
  counterparty_id UUID REFERENCES the_life_players(id) ON DELETE SET NULL,
  
  -- Metadata
  description TEXT,
  metadata JSONB,
  
  -- Context
  ip_address INET,
  device_fingerprint VARCHAR(255),
  
  -- Security
  is_flagged BOOLEAN DEFAULT FALSE,
  flag_reason VARCHAR(255)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_economy_transactions_player_id ON economy_transactions(player_id);
CREATE INDEX IF NOT EXISTS idx_economy_transactions_timestamp ON economy_transactions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_economy_transactions_transaction_type ON economy_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_economy_transactions_flagged ON economy_transactions(is_flagged) WHERE is_flagged = TRUE;
CREATE INDEX IF NOT EXISTS idx_economy_transactions_amount ON economy_transactions(amount DESC);
CREATE INDEX IF NOT EXISTS idx_economy_transactions_source ON economy_transactions(source, source_id);
CREATE INDEX IF NOT EXISTS idx_economy_transactions_counterparty ON economy_transactions(counterparty_id) WHERE counterparty_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_economy_transactions_player_timestamp ON economy_transactions(player_id, timestamp DESC);

-- Comments
COMMENT ON TABLE economy_transactions IS 'Complete money flow tracking for economy monitoring and anti-cheat';
COMMENT ON COLUMN economy_transactions.source IS 'Source of transaction: crime, business, store, trade, daily_reward, admin, refund';
COMMENT ON COLUMN economy_transactions.counterparty_id IS 'Other player involved in transfers/trades';
COMMENT ON COLUMN economy_transactions.balance_after IS 'Should match balance_before + amount (for verification)';

-- Constraint to verify balance calculation
ALTER TABLE economy_transactions 
ADD CONSTRAINT check_balance_calculation 
CHECK (
  (transaction_type IN ('earned', 'transfer_received', 'admin_adjustment', 'daily_reward', 'refund') AND balance_after = balance_before + amount) OR
  (transaction_type IN ('spent', 'transfer_sent') AND balance_after = balance_before - amount)
);
