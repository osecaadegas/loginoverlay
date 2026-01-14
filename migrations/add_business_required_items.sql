-- Add fields for businesses that require items to start production
-- This allows businesses like "Money Laundering" (requires Dirty Money)
-- or "Car Part Stripping" (requires a Car item)

ALTER TABLE the_life_businesses 
ADD COLUMN IF NOT EXISTS required_item_id UUID,
ADD COLUMN IF NOT EXISTS required_item_quantity INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS consumes_item BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS variable_reward BOOLEAN DEFAULT false;

-- Add foreign key constraint for required_item_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'the_life_businesses_required_item_id_fkey'
  ) THEN
    ALTER TABLE the_life_businesses 
    ADD CONSTRAINT the_life_businesses_required_item_id_fkey 
    FOREIGN KEY (required_item_id) 
    REFERENCES the_life_items(id) 
    ON DELETE SET NULL;
  END IF;
END $$;

-- Add comments for clarity
COMMENT ON COLUMN the_life_businesses.required_item_id IS 'Item needed to start production (e.g., Dirty Money for laundering, Car for stripping)';
COMMENT ON COLUMN the_life_businesses.required_item_quantity IS 'How many of the required item is needed';
COMMENT ON COLUMN the_life_businesses.consumes_item IS 'Whether the required item is consumed (removed from inventory) when starting production';
COMMENT ON COLUMN the_life_businesses.variable_reward IS 'If true, reward varies based on input item quality/type (e.g., car value affects payout)';
