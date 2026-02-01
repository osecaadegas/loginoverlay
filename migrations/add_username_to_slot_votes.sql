-- Add username column to slot votes for display purposes
-- This avoids RLS issues when fetching user profiles

ALTER TABLE guess_balance_slot_votes 
ADD COLUMN IF NOT EXISTS username TEXT DEFAULT 'Anonymous';
