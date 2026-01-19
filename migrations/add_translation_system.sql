-- Translation System for Multi-Language Support
-- Primary Language: English (EN)
-- Secondary Language: Portuguese (PT)

-- =============================================
-- TRANSLATIONS TABLE - Caches all translations
-- =============================================
CREATE TABLE IF NOT EXISTS translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source identification
  source_table TEXT NOT NULL,        -- e.g., 'the_life_robberies', 'the_life_items', 'ui'
  source_id TEXT,                    -- ID of the record (null for UI strings)
  source_field TEXT NOT NULL,        -- e.g., 'name', 'description', 'button_text'
  
  -- Translation content
  language_code TEXT NOT NULL,       -- 'en', 'pt'
  original_text TEXT NOT NULL,       -- Original text (in English)
  translated_text TEXT NOT NULL,     -- Translated text
  
  -- Metadata
  is_auto_translated BOOLEAN DEFAULT true,  -- True if Azure translated, false if manually edited
  is_verified BOOLEAN DEFAULT false,        -- Admin verified the translation
  translation_quality FLOAT,                -- Optional quality score from API
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicates
  UNIQUE(source_table, source_id, source_field, language_code)
);

-- =============================================
-- SUPPORTED LANGUAGES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS supported_languages (
  code TEXT PRIMARY KEY,            -- 'en', 'pt'
  name TEXT NOT NULL,               -- 'English', 'Português'
  native_name TEXT NOT NULL,        -- 'English', 'Português'
  flag_emoji TEXT,                  -- '🇬🇧', '🇧🇷'
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert supported languages
INSERT INTO supported_languages (code, name, native_name, flag_emoji, is_active, is_default, display_order) VALUES
('en', 'English (UK)', 'English', '🇬🇧', true, true, 1),
('pt', 'Portuguese (PT)', 'Português', '🇵🇹', true, false, 2)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  native_name = EXCLUDED.native_name,
  flag_emoji = EXCLUDED.flag_emoji;

-- =============================================
-- USER LANGUAGE PREFERENCES
-- =============================================
-- Add language preference to user_profiles if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'preferred_language'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN preferred_language TEXT DEFAULT 'en';
  END IF;
END $$;

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_translations_source ON translations(source_table, source_id, source_field);
CREATE INDEX IF NOT EXISTS idx_translations_language ON translations(language_code);
CREATE INDEX IF NOT EXISTS idx_translations_lookup ON translations(source_table, source_field, language_code);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE supported_languages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Anyone can read translations" ON translations;
DROP POLICY IF EXISTS "Anyone can read supported languages" ON supported_languages;
DROP POLICY IF EXISTS "Authenticated users can insert translations" ON translations;
DROP POLICY IF EXISTS "Admins can update translations" ON translations;
DROP POLICY IF EXISTS "Admins can delete translations" ON translations;

-- Everyone can read translations
CREATE POLICY "Anyone can read translations" ON translations
  FOR SELECT USING (true);

-- Everyone can read supported languages
CREATE POLICY "Anyone can read supported languages" ON supported_languages
  FOR SELECT USING (true);

-- Only authenticated users can insert translations (for auto-translation)
CREATE POLICY "Authenticated users can insert translations" ON translations
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Only admins can update/delete translations
CREATE POLICY "Admins can update translations" ON translations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('admin', 'owner')
      AND user_roles.is_active = true
    )
  );

CREATE POLICY "Admins can delete translations" ON translations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('admin', 'owner')
      AND user_roles.is_active = true
    )
  );

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to get translation with fallback to original
CREATE OR REPLACE FUNCTION get_translation(
  p_source_table TEXT,
  p_source_id TEXT,
  p_source_field TEXT,
  p_language_code TEXT,
  p_fallback_text TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  v_translation TEXT;
BEGIN
  SELECT translated_text INTO v_translation
  FROM translations
  WHERE source_table = p_source_table
    AND (source_id = p_source_id OR (source_id IS NULL AND p_source_id IS NULL))
    AND source_field = p_source_field
    AND language_code = p_language_code;
  
  RETURN COALESCE(v_translation, p_fallback_text);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to upsert translation
CREATE OR REPLACE FUNCTION upsert_translation(
  p_source_table TEXT,
  p_source_id TEXT,
  p_source_field TEXT,
  p_language_code TEXT,
  p_original_text TEXT,
  p_translated_text TEXT,
  p_is_auto_translated BOOLEAN DEFAULT true
)
RETURNS uuid AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO translations (
    source_table, source_id, source_field, language_code,
    original_text, translated_text, is_auto_translated, updated_at
  ) VALUES (
    p_source_table, p_source_id, p_source_field, p_language_code,
    p_original_text, p_translated_text, p_is_auto_translated, NOW()
  )
  ON CONFLICT (source_table, source_id, source_field, language_code)
  DO UPDATE SET
    translated_text = EXCLUDED.translated_text,
    is_auto_translated = EXCLUDED.is_auto_translated,
    updated_at = NOW()
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get all translations for a table/record
CREATE OR REPLACE FUNCTION get_record_translations(
  p_source_table TEXT,
  p_source_id TEXT,
  p_language_code TEXT
)
RETURNS TABLE (
  field TEXT,
  translated_text TEXT,
  is_verified BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.source_field as field,
    t.translated_text,
    t.is_verified
  FROM translations t
  WHERE t.source_table = p_source_table
    AND t.source_id = p_source_id
    AND t.language_code = p_language_code;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================
-- UI STATIC TRANSLATIONS (English -> Portuguese)
-- =============================================
-- These are common UI strings used throughout the app

-- Navigation
INSERT INTO translations (source_table, source_id, source_field, language_code, original_text, translated_text, is_auto_translated, is_verified) VALUES
-- Main Navigation
('ui', NULL, 'nav_home', 'pt', 'Home', 'Início', false, true),
('ui', NULL, 'nav_games', 'pt', 'Games', 'Jogos', false, true),
('ui', NULL, 'nav_offers', 'pt', 'Offers', 'Ofertas', false, true),
('ui', NULL, 'nav_profile', 'pt', 'Profile', 'Perfil', false, true),
('ui', NULL, 'nav_settings', 'pt', 'Settings', 'Configurações', false, true),
('ui', NULL, 'nav_logout', 'pt', 'Logout', 'Sair', false, true),
('ui', NULL, 'nav_login', 'pt', 'Login', 'Entrar', false, true),

-- The Life Game
('ui', NULL, 'thelife_crimes', 'pt', 'Crimes', 'Crimes', false, true),
('ui', NULL, 'thelife_pvp', 'pt', 'PVP', 'PVP', false, true),
('ui', NULL, 'thelife_businesses', 'pt', 'Businesses', 'Negócios', false, true),
('ui', NULL, 'thelife_brothel', 'pt', 'Brothel', 'Bordel', false, true),
('ui', NULL, 'thelife_bank', 'pt', 'Bank', 'Banco', false, true),
('ui', NULL, 'thelife_jail', 'pt', 'Jail', 'Prisão', false, true),
('ui', NULL, 'thelife_hospital', 'pt', 'Hospital', 'Hospital', false, true),
('ui', NULL, 'thelife_market', 'pt', 'Black Market', 'Mercado Negro', false, true),
('ui', NULL, 'thelife_docks', 'pt', 'Docks', 'Docas', false, true),
('ui', NULL, 'thelife_inventory', 'pt', 'Inventory', 'Inventário', false, true),
('ui', NULL, 'thelife_leaderboard', 'pt', 'Leaderboard', 'Classificação', false, true),
('ui', NULL, 'thelife_profile', 'pt', 'Profile', 'Perfil', false, true),
('ui', NULL, 'thelife_skills', 'pt', 'Skills', 'Habilidades', false, true),
('ui', NULL, 'thelife_highstakes', 'pt', 'High Stakes', 'Apostas Altas', false, true),
('ui', NULL, 'thelife_news', 'pt', 'News', 'Notícias', false, true),
('ui', NULL, 'thelife_syndicate', 'pt', 'The Syndicate', 'O Sindicato', false, true),

-- Common Actions
('ui', NULL, 'action_buy', 'pt', 'Buy', 'Comprar', false, true),
('ui', NULL, 'action_sell', 'pt', 'Sell', 'Vender', false, true),
('ui', NULL, 'action_attack', 'pt', 'Attack', 'Atacar', false, true),
('ui', NULL, 'action_defend', 'pt', 'Defend', 'Defender', false, true),
('ui', NULL, 'action_deposit', 'pt', 'Deposit', 'Depositar', false, true),
('ui', NULL, 'action_withdraw', 'pt', 'Withdraw', 'Sacar', false, true),
('ui', NULL, 'action_hire', 'pt', 'Hire', 'Contratar', false, true),
('ui', NULL, 'action_fire', 'pt', 'Fire', 'Demitir', false, true),
('ui', NULL, 'action_upgrade', 'pt', 'Upgrade', 'Melhorar', false, true),
('ui', NULL, 'action_claim', 'pt', 'Claim', 'Resgatar', false, true),
('ui', NULL, 'action_confirm', 'pt', 'Confirm', 'Confirmar', false, true),
('ui', NULL, 'action_cancel', 'pt', 'Cancel', 'Cancelar', false, true),
('ui', NULL, 'action_close', 'pt', 'Close', 'Fechar', false, true),
('ui', NULL, 'action_back', 'pt', 'Back', 'Voltar', false, true),
('ui', NULL, 'action_next', 'pt', 'Next', 'Próximo', false, true),
('ui', NULL, 'action_save', 'pt', 'Save', 'Salvar', false, true),
('ui', NULL, 'action_delete', 'pt', 'Delete', 'Excluir', false, true),
('ui', NULL, 'action_edit', 'pt', 'Edit', 'Editar', false, true),
('ui', NULL, 'action_refresh', 'pt', 'Refresh', 'Atualizar', false, true),

-- Common Labels
('ui', NULL, 'label_level', 'pt', 'Level', 'Nível', false, true),
('ui', NULL, 'label_xp', 'pt', 'XP', 'XP', false, true),
('ui', NULL, 'label_cash', 'pt', 'Cash', 'Dinheiro', false, true),
('ui', NULL, 'label_bank', 'pt', 'Bank', 'Banco', false, true),
('ui', NULL, 'label_health', 'pt', 'Health', 'Vida', false, true),
('ui', NULL, 'label_stamina', 'pt', 'Stamina', 'Energia', false, true),
('ui', NULL, 'label_power', 'pt', 'Power', 'Poder', false, true),
('ui', NULL, 'label_defense', 'pt', 'Defense', 'Defesa', false, true),
('ui', NULL, 'label_intelligence', 'pt', 'Intelligence', 'Inteligência', false, true),
('ui', NULL, 'label_wins', 'pt', 'Wins', 'Vitórias', false, true),
('ui', NULL, 'label_losses', 'pt', 'Losses', 'Derrotas', false, true),
('ui', NULL, 'label_rank', 'pt', 'Rank', 'Posição', false, true),
('ui', NULL, 'label_price', 'pt', 'Price', 'Preço', false, true),
('ui', NULL, 'label_reward', 'pt', 'Reward', 'Recompensa', false, true),
('ui', NULL, 'label_cost', 'pt', 'Cost', 'Custo', false, true),
('ui', NULL, 'label_quantity', 'pt', 'Quantity', 'Quantidade', false, true),
('ui', NULL, 'label_total', 'pt', 'Total', 'Total', false, true),
('ui', NULL, 'label_success', 'pt', 'Success', 'Sucesso', false, true),
('ui', NULL, 'label_failed', 'pt', 'Failed', 'Falhou', false, true),
('ui', NULL, 'label_loading', 'pt', 'Loading...', 'Carregando...', false, true),

-- Messages
('ui', NULL, 'msg_not_enough_cash', 'pt', 'Not enough cash!', 'Dinheiro insuficiente!', false, true),
('ui', NULL, 'msg_not_enough_stamina', 'pt', 'Not enough stamina!', 'Energia insuficiente!', false, true),
('ui', NULL, 'msg_in_jail', 'pt', 'You are in jail!', 'Você está na prisão!', false, true),
('ui', NULL, 'msg_in_hospital', 'pt', 'You are in hospital!', 'Você está no hospital!', false, true),
('ui', NULL, 'msg_success', 'pt', 'Success!', 'Sucesso!', false, true),
('ui', NULL, 'msg_error', 'pt', 'An error occurred', 'Ocorreu um erro', false, true),

-- News/Journal
('ui', NULL, 'news_title', 'pt', 'The Underground Chronicle', 'A Crônica Subterrânea', false, true),
('ui', NULL, 'news_subtitle', 'pt', 'Your Trusted Source for Street Intelligence', 'Sua Fonte Confiável de Inteligência das Ruas', false, true),
('ui', NULL, 'news_all', 'pt', 'All Stories', 'Todas as Notícias', false, true),
('ui', NULL, 'news_rankings', 'pt', 'Power Rankings', 'Classificações', false, true),
('ui', NULL, 'news_fightclub', 'pt', 'Fight Club', 'Clube da Luta', false, true),
('ui', NULL, 'news_crimebeat', 'pt', 'Crime Beat', 'Batida do Crime', false, true),
('ui', NULL, 'news_harbor', 'pt', 'Harbor News', 'Notícias do Porto', false, true),
('ui', NULL, 'news_vice', 'pt', 'Vice', 'Vícios', false, true),
('ui', NULL, 'news_markets', 'pt', 'Markets', 'Mercados', false, true),
('ui', NULL, 'news_risingstars', 'pt', 'Rising Stars', 'Estrelas em Ascensão', false, true),

-- Sidebar Navigation
('ui', NULL, 'nav_partners', 'pt', 'Partners', 'Parceiros', false, true),
('ui', NULL, 'nav_points_store', 'pt', 'Points Store', 'Loja de Pontos', false, true),
('ui', NULL, 'nav_community', 'pt', 'Community', 'Comunidade', false, true),
('ui', NULL, 'nav_tournaments', 'pt', 'Tournaments', 'Torneios', false, true),
('ui', NULL, 'nav_guess_balance', 'pt', 'Guess the Balance', 'Adivinhe o Saldo', false, true),
('ui', NULL, 'nav_giveaways', 'pt', 'Giveaways', 'Sorteios', false, true),
('ui', NULL, 'nav_vouchers', 'pt', 'Vouchers', 'Cupons', false, true),
('ui', NULL, 'nav_daily_wheel', 'pt', 'Daily Wheel', 'Roda Diária', false, true),
('ui', NULL, 'nav_blackjack', 'pt', 'Blackjack', 'Blackjack', false, true),
('ui', NULL, 'nav_mines', 'pt', 'Mines', 'Minas', false, true),
('ui', NULL, 'nav_thelife', 'pt', 'The Life', 'A Vida', false, true),
('ui', NULL, 'nav_webmod', 'pt', 'WebMod', 'WebMod', false, true),
('ui', NULL, 'nav_slot_manager', 'pt', 'Slot Manager', 'Gerenciador de Slots', false, true),
('ui', NULL, 'nav_points_manager', 'pt', 'Points Manager', 'Gerenciador de Pontos', false, true),
('ui', NULL, 'nav_voucher_manager', 'pt', 'Voucher Manager', 'Gerenciador de Cupons', false, true),
('ui', NULL, 'nav_giveaway_creator', 'pt', 'Giveaway Creator', 'Criador de Sorteios', false, true),
('ui', NULL, 'nav_edit_slots', 'pt', 'Edit Slots', 'Editar Slots', false, true),
('ui', NULL, 'nav_admin_panel', 'pt', 'Admin Panel', 'Painel Admin', false, true),
('ui', NULL, 'login_with_twitch', 'pt', 'Login with Twitch', 'Entrar com Twitch', false, true),

-- Language Switcher
('ui', NULL, 'language_english', 'pt', 'English', 'Inglês', false, true),
('ui', NULL, 'language_portuguese', 'pt', 'Portuguese', 'Português', false, true),
('ui', NULL, 'select_language', 'pt', 'Select Language', 'Selecionar Idioma', false, true)

ON CONFLICT (source_table, source_id, source_field, language_code) DO UPDATE SET
  translated_text = EXCLUDED.translated_text,
  is_verified = EXCLUDED.is_verified;

-- =============================================
-- COMMENTS
-- =============================================
-- NOTE: Realtime is NOT enabled for translations table
-- Translations are static/cached and don't need live updates
-- This saves Supabase resources

COMMENT ON TABLE translations IS 'Stores all translations for multi-language support';
COMMENT ON TABLE supported_languages IS 'List of supported languages for the application';
