-- Player Risk Scores Table - Real-time risk assessment
CREATE TABLE IF NOT EXISTS player_risk_scores (
  player_id UUID PRIMARY KEY REFERENCES the_life_players(id) ON DELETE CASCADE,
  
  -- Risk metrics
  risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level VARCHAR(20) DEFAULT 'safe' CHECK (risk_level IN ('safe', 'low', 'medium', 'high', 'critical')),
  
  -- Contributing factors
  flagged_action_count INTEGER DEFAULT 0,
  alert_count INTEGER DEFAULT 0,
  ban_count INTEGER DEFAULT 0,
  
  -- Behavioral indicators
  suspicious_money_gains INTEGER DEFAULT 0,
  suspicious_inventory_changes INTEGER DEFAULT 0,
  rapid_action_violations INTEGER DEFAULT 0,
  impossible_success_rates INTEGER DEFAULT 0,
  
  -- Metadata
  last_suspicious_activity TIMESTAMPTZ,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  
  -- Investigation
  investigation_notes TEXT,
  is_under_investigation BOOLEAN DEFAULT FALSE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_player_risk_scores_risk_level ON player_risk_scores(risk_level);
CREATE INDEX IF NOT EXISTS idx_player_risk_scores_risk_score ON player_risk_scores(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_player_risk_scores_under_investigation ON player_risk_scores(is_under_investigation) WHERE is_under_investigation = TRUE;
CREATE INDEX IF NOT EXISTS idx_player_risk_scores_last_suspicious ON player_risk_scores(last_suspicious_activity DESC NULLS LAST);

-- Auto-create risk score entry for new players
CREATE OR REPLACE FUNCTION create_player_risk_score()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO player_risk_scores (player_id)
  VALUES (NEW.id)
  ON CONFLICT (player_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_player_risk_score
  AFTER INSERT ON the_life_players
  FOR EACH ROW
  EXECUTE FUNCTION create_player_risk_score();

-- Comments
COMMENT ON TABLE player_risk_scores IS 'Real-time risk assessment for each player (0-100 scale)';
COMMENT ON COLUMN player_risk_scores.risk_score IS 'Calculated risk score: 0-10=safe, 11-30=low, 31-60=medium, 61-85=high, 86-100=critical';
COMMENT ON COLUMN player_risk_scores.investigation_notes IS 'Admin notes about ongoing investigations';
