-- Inventory Changes Log Table - Dedicated inventory tracking
CREATE TABLE IF NOT EXISTS inventory_changes_log (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  player_id UUID NOT NULL REFERENCES the_life_players(id) ON DELETE CASCADE,
  
  -- Item info
  item_id UUID NOT NULL REFERENCES the_life_items(id) ON DELETE RESTRICT,
  change_type VARCHAR(50) NOT NULL CHECK (change_type IN ('added', 'removed', 'equipped', 'unequipped', 'traded', 'used', 'crafted')),
  quantity_change INTEGER NOT NULL,
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  
  -- Source tracking
  source VARCHAR(100) NOT NULL,
  source_id INTEGER,
  
  -- Transaction grouping
  transaction_id UUID,
  
  -- Context
  ip_address INET,
  device_fingerprint VARCHAR(255),
  
  -- Security
  is_flagged BOOLEAN DEFAULT FALSE,
  flag_reason VARCHAR(255)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_changes_player_id ON inventory_changes_log(player_id);
CREATE INDEX IF NOT EXISTS idx_inventory_changes_item_id ON inventory_changes_log(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_changes_timestamp ON inventory_changes_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_changes_transaction_id ON inventory_changes_log(transaction_id) WHERE transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_changes_flagged ON inventory_changes_log(is_flagged) WHERE is_flagged = TRUE;
CREATE INDEX IF NOT EXISTS idx_inventory_changes_player_item ON inventory_changes_log(player_id, item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_changes_source ON inventory_changes_log(source, source_id);

-- Comments
COMMENT ON TABLE inventory_changes_log IS 'Detailed tracking of all inventory changes for anti-cheat and auditing';
COMMENT ON COLUMN inventory_changes_log.source IS 'Source of change: purchase, reward, trade, admin, crime, business, craft, use';
COMMENT ON COLUMN inventory_changes_log.transaction_id IS 'Groups related changes together (e.g., bulk purchase)';
COMMENT ON COLUMN inventory_changes_log.quantity_change IS 'Positive for additions, negative for removals';
