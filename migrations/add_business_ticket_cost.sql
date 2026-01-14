-- Add ticket cost field to businesses
ALTER TABLE the_life_businesses
ADD COLUMN IF NOT EXISTS ticket_cost INTEGER DEFAULT 5;

-- Add comment
COMMENT ON COLUMN the_life_businesses.ticket_cost IS 'Number of tickets required to start production';
