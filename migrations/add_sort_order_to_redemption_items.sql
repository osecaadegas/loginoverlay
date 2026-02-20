-- Add sort_order column to redemption_items for admin-controlled ordering
ALTER TABLE redemption_items
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Initialize sort_order based on current point_cost ordering
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY point_cost ASC, created_at ASC) - 1 AS rn
  FROM redemption_items
)
UPDATE redemption_items
SET sort_order = ordered.rn
FROM ordered
WHERE redemption_items.id = ordered.id;

-- Create index for efficient ordering
CREATE INDEX IF NOT EXISTS idx_redemption_items_sort_order ON redemption_items(sort_order);
