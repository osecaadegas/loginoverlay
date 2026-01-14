-- Rename tickets to stamina globally
-- Change all ticket-related columns to stamina

-- The Life Players table - only rename if tickets exists and stamina doesn't
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'the_life_players' AND column_name = 'tickets'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'the_life_players' AND column_name = 'stamina'
  ) THEN
    ALTER TABLE the_life_players RENAME COLUMN tickets TO stamina;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'the_life_players' AND column_name = 'max_tickets'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'the_life_players' AND column_name = 'max_stamina'
  ) THEN
    ALTER TABLE the_life_players RENAME COLUMN max_tickets TO max_stamina;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'the_life_players' AND column_name = 'last_ticket_refill'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'the_life_players' AND column_name = 'last_stamina_refill'
  ) THEN
    ALTER TABLE the_life_players RENAME COLUMN last_ticket_refill TO last_stamina_refill;
  END IF;
END $$;

-- Businesses table
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'the_life_businesses' AND column_name = 'ticket_cost'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'the_life_businesses' AND column_name = 'stamina_cost'
  ) THEN
    ALTER TABLE the_life_businesses RENAME COLUMN ticket_cost TO stamina_cost;
  END IF;
END $$;

-- Crimes/Robberies table
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'the_life_robberies' AND column_name = 'ticket_cost'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'the_life_robberies' AND column_name = 'stamina_cost'
  ) THEN
    ALTER TABLE the_life_robberies RENAME COLUMN ticket_cost TO stamina_cost;
  END IF;
END $$;

-- Games table (if exists)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'the_life_games' AND column_name = 'ticket_cost'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'the_life_games' AND column_name = 'stamina_cost'
  ) THEN
    ALTER TABLE the_life_games RENAME COLUMN ticket_cost TO stamina_cost;
  END IF;
END $$;

COMMENT ON COLUMN the_life_players.stamina IS 'Current stamina points for activities';
COMMENT ON COLUMN the_life_players.max_stamina IS 'Maximum stamina capacity';
COMMENT ON COLUMN the_life_players.last_stamina_refill IS 'Last time stamina was refilled';
