-- Fix RLS policy for guess_balance_guesses to allow all users to see all guesses
-- This enables the "All Guesses" feature to show everyone's guesses in real-time

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "users can view guesses" ON guess_balance_guesses;

-- Create a more permissive policy - all authenticated users can view all guesses
CREATE POLICY "users can view all guesses"
  ON guess_balance_guesses FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Note: Insert and Update policies remain restricted to own user
-- This allows everyone to see who guessed and how much, creating engagement
