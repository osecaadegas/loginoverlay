-- Add status column to point_redemptions table
ALTER TABLE point_redemptions
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';

-- Update existing records
UPDATE point_redemptions
SET status = CASE
  WHEN processed = true THEN 'approved'
  ELSE 'pending'
END
WHERE status IS NULL OR status = 'pending';

-- Add check constraint
ALTER TABLE point_redemptions
ADD CONSTRAINT check_status_values
CHECK (status IN ('pending', 'approved', 'denied'));
