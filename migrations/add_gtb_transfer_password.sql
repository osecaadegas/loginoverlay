-- GTB Transfer Password System
-- Allows admin to generate a one-time password that can be used in the
-- Bonus Hunt Config to transfer bonuses into a Guess-the-Balance session.

-- Table to store the current transfer password (only 1 active row per user)
CREATE TABLE IF NOT EXISTS gtb_transfer_passwords (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '24 hours'),
  used_at TIMESTAMPTZ DEFAULT NULL,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, is_active) -- only one active password per user
);

-- RLS
ALTER TABLE gtb_transfer_passwords ENABLE ROW LEVEL SECURITY;

-- Admin can manage their own passwords
CREATE POLICY "admin_manage_own_transfer_passwords"
  ON gtb_transfer_passwords FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RPC: Verify a transfer password and create a GTB session from bonuses
-- Returns the new session ID on success, or raises an error
CREATE OR REPLACE FUNCTION verify_gtb_transfer_password(
  p_password_hash TEXT,
  p_session_title TEXT,
  p_start_value NUMERIC DEFAULT 0,
  p_casino_brand TEXT DEFAULT '',
  p_casino_image_url TEXT DEFAULT '',
  p_slots JSONB DEFAULT '[]'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_password_record RECORD;
  v_session_id UUID;
  v_slot JSONB;
  v_index INT := 0;
BEGIN
  -- Find active, non-expired, unused password matching the hash
  SELECT * INTO v_password_record
  FROM gtb_transfer_passwords
  WHERE password_hash = p_password_hash
    AND is_active = true
    AND used_at IS NULL
    AND expires_at > now()
  LIMIT 1;

  IF v_password_record IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired transfer password';
  END IF;

  -- Mark password as used
  UPDATE gtb_transfer_passwords
  SET used_at = now(), is_active = false
  WHERE id = v_password_record.id;

  -- Create the GTB session
  INSERT INTO guess_balance_sessions (
    user_id, title, status, start_value, amount_expended,
    casino_brand, casino_image_url, is_guessing_open, reveal_answer
  ) VALUES (
    v_password_record.user_id,
    p_session_title,
    'active',
    p_start_value,
    0, -- will be calculated from slots
    p_casino_brand,
    p_casino_image_url,
    true,
    false
  )
  RETURNING id INTO v_session_id;

  -- Insert all bonus slots
  FOR v_slot IN SELECT * FROM jsonb_array_elements(p_slots)
  LOOP
    INSERT INTO guess_balance_slots (
      session_id, slot_name, slot_image_url, provider,
      bet_value, is_super, display_order
    ) VALUES (
      v_session_id,
      v_slot->>'slot_name',
      v_slot->>'slot_image_url',
      v_slot->>'provider',
      COALESCE((v_slot->>'bet_value')::NUMERIC, 0),
      COALESCE((v_slot->>'is_super')::BOOLEAN, false),
      v_index
    );
    v_index := v_index + 1;
  END LOOP;

  -- Update session amount_expended
  UPDATE guess_balance_sessions
  SET amount_expended = (
    SELECT COALESCE(SUM(bet_value), 0) FROM guess_balance_slots WHERE session_id = v_session_id
  )
  WHERE id = v_session_id;

  RETURN v_session_id;
END;
$$;
