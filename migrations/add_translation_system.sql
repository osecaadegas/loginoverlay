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
-- NOTE: Display the flag_emoji instead of the code in the UI
INSERT INTO supported_languages (code, name, native_name, flag_emoji, is_active, is_default, display_order) VALUES
('en', 'English', 'English', '🇬🇧', true, true, 1),
('pt-PT', 'Português', 'Português (Portugal)', '🇵🇹', true, false, 2)
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
('ui', NULL, 'nav_home', 'pt-PT', 'Home', 'Início', false, true),
('ui', NULL, 'nav_games', 'pt-PT', 'Games', 'Jogos', false, true),
('ui', NULL, 'nav_offers', 'pt-PT', 'Offers', 'Ofertas', false, true),
('ui', NULL, 'nav_profile', 'pt-PT', 'Profile', 'Perfil', false, true),
('ui', NULL, 'nav_settings', 'pt-PT', 'Settings', 'Definições', false, true),
('ui', NULL, 'nav_logout', 'pt-PT', 'Logout', 'Sair', false, true),
('ui', NULL, 'nav_login', 'pt-PT', 'Login', 'Entrar', false, true),

-- The Life Game
('ui', NULL, 'thelife_crimes', 'pt-PT', 'Crimes', 'Crimes', false, true),
('ui', NULL, 'thelife_pvp', 'pt-PT', 'PVP', 'JvJ', false, true),
('ui', NULL, 'thelife_businesses', 'pt-PT', 'Businesses', 'Negócios', false, true),
('ui', NULL, 'thelife_brothel', 'pt-PT', 'Brothel', 'Bordel', false, true),
('ui', NULL, 'thelife_bank', 'pt-PT', 'Bank', 'Banco', false, true),
('ui', NULL, 'thelife_jail', 'pt-PT', 'Jail', 'Prisão', false, true),
('ui', NULL, 'thelife_hospital', 'pt-PT', 'Hospital', 'Hospital', false, true),
('ui', NULL, 'thelife_market', 'pt-PT', 'Black Market', 'Mercado Negro', false, true),
('ui', NULL, 'thelife_docks', 'pt-PT', 'Docks', 'Docas', false, true),
('ui', NULL, 'thelife_inventory', 'pt-PT', 'Inventory', 'Inventário', false, true),
('ui', NULL, 'thelife_leaderboard', 'pt-PT', 'Leaderboard', 'Classificação', false, true),
('ui', NULL, 'thelife_profile', 'pt-PT', 'Profile', 'Perfil', false, true),
('ui', NULL, 'thelife_skills', 'pt-PT', 'Skills', 'Habilidades', false, true),
('ui', NULL, 'thelife_highstakes', 'pt-PT', 'High Stakes', 'Apostas Altas', false, true),
('ui', NULL, 'thelife_news', 'pt-PT', 'News', 'Notícias', false, true),
('ui', NULL, 'thelife_syndicate', 'pt-PT', 'The Syndicate', 'O Sindicato', false, true),

-- Common Actions
('ui', NULL, 'action_buy', 'pt-PT', 'Buy', 'Comprar', false, true),
('ui', NULL, 'action_sell', 'pt-PT', 'Sell', 'Vender', false, true),
('ui', NULL, 'action_attack', 'pt-PT', 'Attack', 'Atacar', false, true),
('ui', NULL, 'action_defend', 'pt-PT', 'Defend', 'Defender', false, true),
('ui', NULL, 'action_deposit', 'pt-PT', 'Deposit', 'Depositar', false, true),
('ui', NULL, 'action_withdraw', 'pt-PT', 'Withdraw', 'Levantar', false, true),
('ui', NULL, 'action_hire', 'pt-PT', 'Hire', 'Contratar', false, true),
('ui', NULL, 'action_fire', 'pt-PT', 'Fire', 'Despedir', false, true),
('ui', NULL, 'action_upgrade', 'pt-PT', 'Upgrade', 'Melhorar', false, true),
('ui', NULL, 'action_claim', 'pt-PT', 'Claim', 'Resgatar', false, true),
('ui', NULL, 'action_confirm', 'pt-PT', 'Confirm', 'Confirmar', false, true),
('ui', NULL, 'action_cancel', 'pt-PT', 'Cancel', 'Cancelar', false, true),
('ui', NULL, 'action_close', 'pt-PT', 'Close', 'Fechar', false, true),
('ui', NULL, 'action_back', 'pt-PT', 'Back', 'Voltar', false, true),
('ui', NULL, 'action_next', 'pt-PT', 'Next', 'Seguinte', false, true),
('ui', NULL, 'action_save', 'pt-PT', 'Save', 'Guardar', false, true),
('ui', NULL, 'action_delete', 'pt-PT', 'Delete', 'Eliminar', false, true),
('ui', NULL, 'action_edit', 'pt-PT', 'Edit', 'Editar', false, true),
('ui', NULL, 'action_refresh', 'pt-PT', 'Refresh', 'Atualizar', false, true),
('ui', NULL, 'action_search', 'pt-PT', 'Search', 'Pesquisar', false, true),
('ui', NULL, 'action_filter', 'pt-PT', 'Filter', 'Filtrar', false, true),
('ui', NULL, 'action_sort', 'pt-PT', 'Sort', 'Ordenar', false, true),
('ui', NULL, 'action_submit', 'pt-PT', 'Submit', 'Submeter', false, true),
('ui', NULL, 'action_reset', 'pt-PT', 'Reset', 'Repor', false, true),
('ui', NULL, 'action_continue', 'pt-PT', 'Continue', 'Continuar', false, true),
('ui', NULL, 'action_start', 'pt-PT', 'Start', 'Iniciar', false, true),
('ui', NULL, 'action_stop', 'pt-PT', 'Stop', 'Parar', false, true),
('ui', NULL, 'action_play', 'pt-PT', 'Play', 'Jogar', false, true),
('ui', NULL, 'action_pause', 'pt-PT', 'Pause', 'Pausar', false, true),
('ui', NULL, 'action_retry', 'pt-PT', 'Retry', 'Tentar Novamente', false, true),
('ui', NULL, 'action_skip', 'pt-PT', 'Skip', 'Saltar', false, true),
('ui', NULL, 'action_share', 'pt-PT', 'Share', 'Partilhar', false, true),
('ui', NULL, 'action_copy', 'pt-PT', 'Copy', 'Copiar', false, true),
('ui', NULL, 'action_download', 'pt-PT', 'Download', 'Transferir', false, true),
('ui', NULL, 'action_upload', 'pt-PT', 'Upload', 'Carregar', false, true),
('ui', NULL, 'action_send', 'pt-PT', 'Send', 'Enviar', false, true),
('ui', NULL, 'action_receive', 'pt-PT', 'Receive', 'Receber', false, true),
('ui', NULL, 'action_accept', 'pt-PT', 'Accept', 'Aceitar', false, true),
('ui', NULL, 'action_decline', 'pt-PT', 'Decline', 'Recusar', false, true),
('ui', NULL, 'action_join', 'pt-PT', 'Join', 'Entrar', false, true),
('ui', NULL, 'action_leave', 'pt-PT', 'Leave', 'Sair', false, true),
('ui', NULL, 'action_create', 'pt-PT', 'Create', 'Criar', false, true),
('ui', NULL, 'action_view', 'pt-PT', 'View', 'Ver', false, true),
('ui', NULL, 'action_select', 'pt-PT', 'Select', 'Selecionar', false, true),
('ui', NULL, 'action_clear', 'pt-PT', 'Clear', 'Limpar', false, true),
('ui', NULL, 'action_add', 'pt-PT', 'Add', 'Adicionar', false, true),
('ui', NULL, 'action_remove', 'pt-PT', 'Remove', 'Remover', false, true),
('ui', NULL, 'action_update', 'pt-PT', 'Update', 'Atualizar', false, true),
('ui', NULL, 'action_enable', 'pt-PT', 'Enable', 'Ativar', false, true),
('ui', NULL, 'action_disable', 'pt-PT', 'Disable', 'Desativar', false, true),
('ui', NULL, 'action_show', 'pt-PT', 'Show', 'Mostrar', false, true),
('ui', NULL, 'action_hide', 'pt-PT', 'Hide', 'Ocultar', false, true),
('ui', NULL, 'action_expand', 'pt-PT', 'Expand', 'Expandir', false, true),
('ui', NULL, 'action_collapse', 'pt-PT', 'Collapse', 'Recolher', false, true),
('ui', NULL, 'action_maximize', 'pt-PT', 'Maximize', 'Maximizar', false, true),
('ui', NULL, 'action_minimize', 'pt-PT', 'Minimize', 'Minimizar', false, true),

-- Common Labels
('ui', NULL, 'label_level', 'pt-PT', 'Level', 'Nível', false, true),
('ui', NULL, 'label_xp', 'pt-PT', 'XP', 'XP', false, true),
('ui', NULL, 'label_cash', 'pt-PT', 'Cash', 'Dinheiro', false, true),
('ui', NULL, 'label_bank', 'pt-PT', 'Bank', 'Banco', false, true),
('ui', NULL, 'label_health', 'pt-PT', 'Health', 'Vida', false, true),
('ui', NULL, 'label_stamina', 'pt-PT', 'Stamina', 'Energia', false, true),
('ui', NULL, 'label_power', 'pt-PT', 'Power', 'Poder', false, true),
('ui', NULL, 'label_defense', 'pt-PT', 'Defense', 'Defesa', false, true),
('ui', NULL, 'label_intelligence', 'pt-PT', 'Intelligence', 'Inteligência', false, true),
('ui', NULL, 'label_wins', 'pt-PT', 'Wins', 'Vitórias', false, true),
('ui', NULL, 'label_losses', 'pt-PT', 'Losses', 'Derrotas', false, true),
('ui', NULL, 'label_rank', 'pt-PT', 'Rank', 'Posição', false, true),
('ui', NULL, 'label_price', 'pt-PT', 'Price', 'Preço', false, true),
('ui', NULL, 'label_reward', 'pt-PT', 'Reward', 'Recompensa', false, true),
('ui', NULL, 'label_cost', 'pt-PT', 'Cost', 'Custo', false, true),
('ui', NULL, 'label_quantity', 'pt-PT', 'Quantity', 'Quantidade', false, true),
('ui', NULL, 'label_total', 'pt-PT', 'Total', 'Total', false, true),
('ui', NULL, 'label_success', 'pt-PT', 'Success', 'Sucesso', false, true),
('ui', NULL, 'label_failed', 'pt-PT', 'Failed', 'Falhou', false, true),
('ui', NULL, 'label_loading', 'pt-PT', 'Loading...', 'A carregar...', false, true),
('ui', NULL, 'label_name', 'pt-PT', 'Name', 'Nome', false, true),
('ui', NULL, 'label_description', 'pt-PT', 'Description', 'Descrição', false, true),
('ui', NULL, 'label_date', 'pt-PT', 'Date', 'Data', false, true),
('ui', NULL, 'label_time', 'pt-PT', 'Time', 'Hora', false, true),
('ui', NULL, 'label_status', 'pt-PT', 'Status', 'Estado', false, true),
('ui', NULL, 'label_type', 'pt-PT', 'Type', 'Tipo', false, true),
('ui', NULL, 'label_category', 'pt-PT', 'Category', 'Categoria', false, true),
('ui', NULL, 'label_amount', 'pt-PT', 'Amount', 'Montante', false, true),
('ui', NULL, 'label_balance', 'pt-PT', 'Balance', 'Saldo', false, true),
('ui', NULL, 'label_available', 'pt-PT', 'Available', 'Disponível', false, true),
('ui', NULL, 'label_pending', 'pt-PT', 'Pending', 'Pendente', false, true),
('ui', NULL, 'label_completed', 'pt-PT', 'Completed', 'Concluído', false, true),
('ui', NULL, 'label_active', 'pt-PT', 'Active', 'Ativo', false, true),
('ui', NULL, 'label_inactive', 'pt-PT', 'Inactive', 'Inativo', false, true),
('ui', NULL, 'label_online', 'pt-PT', 'Online', 'Online', false, true),
('ui', NULL, 'label_offline', 'pt-PT', 'Offline', 'Offline', false, true),
('ui', NULL, 'label_yes', 'pt-PT', 'Yes', 'Sim', false, true),
('ui', NULL, 'label_no', 'pt-PT', 'No', 'Não', false, true),
('ui', NULL, 'label_all', 'pt-PT', 'All', 'Todos', false, true),
('ui', NULL, 'label_none', 'pt-PT', 'None', 'Nenhum', false, true),
('ui', NULL, 'label_other', 'pt-PT', 'Other', 'Outro', false, true),
('ui', NULL, 'label_more', 'pt-PT', 'More', 'Mais', false, true),
('ui', NULL, 'label_less', 'pt-PT', 'Less', 'Menos', false, true),
('ui', NULL, 'label_new', 'pt-PT', 'New', 'Novo', false, true),
('ui', NULL, 'label_old', 'pt-PT', 'Old', 'Antigo', false, true),
('ui', NULL, 'label_free', 'pt-PT', 'Free', 'Grátis', false, true),
('ui', NULL, 'label_premium', 'pt-PT', 'Premium', 'Premium', false, true),
('ui', NULL, 'label_vip', 'pt-PT', 'VIP', 'VIP', false, true),
('ui', NULL, 'label_bonus', 'pt-PT', 'Bonus', 'Bónus', false, true),
('ui', NULL, 'label_daily', 'pt-PT', 'Daily', 'Diário', false, true),
('ui', NULL, 'label_weekly', 'pt-PT', 'Weekly', 'Semanal', false, true),
('ui', NULL, 'label_monthly', 'pt-PT', 'Monthly', 'Mensal', false, true),
('ui', NULL, 'label_yearly', 'pt-PT', 'Yearly', 'Anual', false, true),
('ui', NULL, 'label_today', 'pt-PT', 'Today', 'Hoje', false, true),
('ui', NULL, 'label_yesterday', 'pt-PT', 'Yesterday', 'Ontem', false, true),
('ui', NULL, 'label_tomorrow', 'pt-PT', 'Tomorrow', 'Amanhã', false, true),
('ui', NULL, 'label_now', 'pt-PT', 'Now', 'Agora', false, true),
('ui', NULL, 'label_soon', 'pt-PT', 'Soon', 'Em breve', false, true),
('ui', NULL, 'label_never', 'pt-PT', 'Never', 'Nunca', false, true),
('ui', NULL, 'label_always', 'pt-PT', 'Always', 'Sempre', false, true),
('ui', NULL, 'label_required', 'pt-PT', 'Required', 'Obrigatório', false, true),
('ui', NULL, 'label_optional', 'pt-PT', 'Optional', 'Opcional', false, true),
('ui', NULL, 'label_default', 'pt-PT', 'Default', 'Predefinido', false, true),
('ui', NULL, 'label_custom', 'pt-PT', 'Custom', 'Personalizado', false, true),
('ui', NULL, 'label_points', 'pt-PT', 'Points', 'Pontos', false, true),
('ui', NULL, 'label_coins', 'pt-PT', 'Coins', 'Moedas', false, true),
('ui', NULL, 'label_tokens', 'pt-PT', 'Tokens', 'Fichas', false, true),
('ui', NULL, 'label_credits', 'pt-PT', 'Credits', 'Créditos', false, true),
('ui', NULL, 'label_experience', 'pt-PT', 'Experience', 'Experiência', false, true),
('ui', NULL, 'label_progress', 'pt-PT', 'Progress', 'Progresso', false, true),
('ui', NULL, 'label_achievements', 'pt-PT', 'Achievements', 'Conquistas', false, true),
('ui', NULL, 'label_rewards', 'pt-PT', 'Rewards', 'Recompensas', false, true),
('ui', NULL, 'label_history', 'pt-PT', 'History', 'Histórico', false, true),
('ui', NULL, 'label_statistics', 'pt-PT', 'Statistics', 'Estatísticas', false, true),
('ui', NULL, 'label_details', 'pt-PT', 'Details', 'Detalhes', false, true),
('ui', NULL, 'label_information', 'pt-PT', 'Information', 'Informação', false, true),
('ui', NULL, 'label_help', 'pt-PT', 'Help', 'Ajuda', false, true),
('ui', NULL, 'label_support', 'pt-PT', 'Support', 'Suporte', false, true),
('ui', NULL, 'label_contact', 'pt-PT', 'Contact', 'Contacto', false, true),
('ui', NULL, 'label_about', 'pt-PT', 'About', 'Sobre', false, true),
('ui', NULL, 'label_terms', 'pt-PT', 'Terms', 'Termos', false, true),
('ui', NULL, 'label_privacy', 'pt-PT', 'Privacy', 'Privacidade', false, true),
('ui', NULL, 'label_rules', 'pt-PT', 'Rules', 'Regras', false, true),
('ui', NULL, 'label_faq', 'pt-PT', 'FAQ', 'Perguntas Frequentes', false, true),

-- Messages
('ui', NULL, 'msg_not_enough_cash', 'pt-PT', 'Not enough cash!', 'Dinheiro insuficiente!', false, true),
('ui', NULL, 'msg_not_enough_stamina', 'pt-PT', 'Not enough stamina!', 'Energia insuficiente!', false, true),
('ui', NULL, 'msg_in_jail', 'pt-PT', 'You are in jail!', 'Estás na prisão!', false, true),
('ui', NULL, 'msg_in_hospital', 'pt-PT', 'You are in hospital!', 'Estás no hospital!', false, true),
('ui', NULL, 'msg_success', 'pt-PT', 'Success!', 'Sucesso!', false, true),
('ui', NULL, 'msg_error', 'pt-PT', 'An error occurred', 'Ocorreu um erro', false, true),
('ui', NULL, 'msg_welcome', 'pt-PT', 'Welcome!', 'Bem-vindo!', false, true),
('ui', NULL, 'msg_goodbye', 'pt-PT', 'Goodbye!', 'Adeus!', false, true),
('ui', NULL, 'msg_congratulations', 'pt-PT', 'Congratulations!', 'Parabéns!', false, true),
('ui', NULL, 'msg_warning', 'pt-PT', 'Warning!', 'Aviso!', false, true),
('ui', NULL, 'msg_confirm_action', 'pt-PT', 'Are you sure?', 'Tens a certeza?', false, true),
('ui', NULL, 'msg_action_cancelled', 'pt-PT', 'Action cancelled', 'Ação cancelada', false, true),
('ui', NULL, 'msg_saved_successfully', 'pt-PT', 'Saved successfully!', 'Guardado com sucesso!', false, true),
('ui', NULL, 'msg_deleted_successfully', 'pt-PT', 'Deleted successfully!', 'Eliminado com sucesso!', false, true),
('ui', NULL, 'msg_updated_successfully', 'pt-PT', 'Updated successfully!', 'Atualizado com sucesso!', false, true),
('ui', NULL, 'msg_no_results', 'pt-PT', 'No results found', 'Nenhum resultado encontrado', false, true),
('ui', NULL, 'msg_try_again', 'pt-PT', 'Please try again', 'Por favor, tenta novamente', false, true),
('ui', NULL, 'msg_connection_error', 'pt-PT', 'Connection error', 'Erro de ligação', false, true),
('ui', NULL, 'msg_session_expired', 'pt-PT', 'Session expired', 'Sessão expirada', false, true),
('ui', NULL, 'msg_please_login', 'pt-PT', 'Please login', 'Por favor, inicia sessão', false, true),
('ui', NULL, 'msg_access_denied', 'pt-PT', 'Access denied', 'Acesso negado', false, true),
('ui', NULL, 'msg_not_found', 'pt-PT', 'Not found', 'Não encontrado', false, true),
('ui', NULL, 'msg_coming_soon', 'pt-PT', 'Coming soon', 'Em breve', false, true),
('ui', NULL, 'msg_under_maintenance', 'pt-PT', 'Under maintenance', 'Em manutenção', false, true),
('ui', NULL, 'msg_cooldown', 'pt-PT', 'Please wait...', 'Por favor, aguarda...', false, true),
('ui', NULL, 'msg_level_up', 'pt-PT', 'Level Up!', 'Subiste de nível!', false, true),
('ui', NULL, 'msg_new_achievement', 'pt-PT', 'New Achievement!', 'Nova conquista!', false, true),
('ui', NULL, 'msg_reward_claimed', 'pt-PT', 'Reward claimed!', 'Recompensa resgatada!', false, true),
('ui', NULL, 'msg_insufficient_level', 'pt-PT', 'Insufficient level', 'Nível insuficiente', false, true),
('ui', NULL, 'msg_inventory_full', 'pt-PT', 'Inventory full', 'Inventário cheio', false, true),
('ui', NULL, 'msg_item_purchased', 'pt-PT', 'Item purchased!', 'Item comprado!', false, true),
('ui', NULL, 'msg_item_sold', 'pt-PT', 'Item sold!', 'Item vendido!', false, true),
('ui', NULL, 'msg_attack_success', 'pt-PT', 'Attack successful!', 'Ataque bem-sucedido!', false, true),
('ui', NULL, 'msg_attack_failed', 'pt-PT', 'Attack failed!', 'Ataque falhou!', false, true),
('ui', NULL, 'msg_you_won', 'pt-PT', 'You won!', 'Ganhaste!', false, true),
('ui', NULL, 'msg_you_lost', 'pt-PT', 'You lost!', 'Perdeste!', false, true),
('ui', NULL, 'msg_draw', 'pt-PT', 'Draw!', 'Empate!', false, true),

-- News/Journal
('ui', NULL, 'news_title', 'pt-PT', 'The Underground Chronicle', 'A Crónica Subterrânea', false, true),
('ui', NULL, 'news_subtitle', 'pt-PT', 'Your Trusted Source for Street Intelligence', 'A Tua Fonte de Confiança para Informação das Ruas', false, true),
('ui', NULL, 'news_all', 'pt-PT', 'All Stories', 'Todas as Notícias', false, true),
('ui', NULL, 'news_rankings', 'pt-PT', 'Power Rankings', 'Classificações', false, true),
('ui', NULL, 'news_fightclub', 'pt-PT', 'Fight Club', 'Clube da Luta', false, true),
('ui', NULL, 'news_crimebeat', 'pt-PT', 'Crime Beat', 'Notícias do Crime', false, true),
('ui', NULL, 'news_harbor', 'pt-PT', 'Harbor News', 'Notícias do Porto', false, true),
('ui', NULL, 'news_vice', 'pt-PT', 'Vice', 'Vícios', false, true),
('ui', NULL, 'news_markets', 'pt-PT', 'Markets', 'Mercados', false, true),
('ui', NULL, 'news_risingstars', 'pt-PT', 'Rising Stars', 'Estrelas em Ascensão', false, true),
('ui', NULL, 'news_breaking', 'pt-PT', 'Breaking News', 'Última Hora', false, true),
('ui', NULL, 'news_latest', 'pt-PT', 'Latest', 'Mais Recentes', false, true),
('ui', NULL, 'news_trending', 'pt-PT', 'Trending', 'Em Destaque', false, true),
('ui', NULL, 'news_read_more', 'pt-PT', 'Read More', 'Ler Mais', false, true),

-- Sidebar Navigation
('ui', NULL, 'nav_partners', 'pt-PT', 'Partners', 'Parceiros', false, true),
('ui', NULL, 'nav_points_store', 'pt-PT', 'Points Store', 'Loja de Pontos', false, true),
('ui', NULL, 'nav_community', 'pt-PT', 'Community', 'Comunidade', false, true),
('ui', NULL, 'nav_tournaments', 'pt-PT', 'Tournaments', 'Torneios', false, true),
('ui', NULL, 'nav_guess_balance', 'pt-PT', 'Guess the Balance', 'Adivinha o Saldo', false, true),
('ui', NULL, 'nav_giveaways', 'pt-PT', 'Giveaways', 'Sorteios', false, true),
('ui', NULL, 'nav_vouchers', 'pt-PT', 'Vouchers', 'Cupões', false, true),
('ui', NULL, 'nav_daily_wheel', 'pt-PT', 'Daily Wheel', 'Roda Diária', false, true),
('ui', NULL, 'nav_blackjack', 'pt-PT', 'Blackjack', 'Blackjack', false, true),
('ui', NULL, 'nav_mines', 'pt-PT', 'Mines', 'Minas', false, true),
('ui', NULL, 'nav_thelife', 'pt-PT', 'The Life', 'A Vida', false, true),
('ui', NULL, 'nav_webmod', 'pt-PT', 'WebMod', 'WebMod', false, true),
('ui', NULL, 'nav_slot_manager', 'pt-PT', 'Slot Manager', 'Gestor de Slots', false, true),
('ui', NULL, 'nav_points_manager', 'pt-PT', 'Points Manager', 'Gestor de Pontos', false, true),
('ui', NULL, 'nav_voucher_manager', 'pt-PT', 'Voucher Manager', 'Gestor de Cupões', false, true),
('ui', NULL, 'nav_giveaway_creator', 'pt-PT', 'Giveaway Creator', 'Criador de Sorteios', false, true),
('ui', NULL, 'nav_edit_slots', 'pt-PT', 'Edit Slots', 'Editar Slots', false, true),
('ui', NULL, 'nav_admin_panel', 'pt-PT', 'Admin Panel', 'Painel de Admin', false, true),
('ui', NULL, 'login_with_twitch', 'pt-PT', 'Login with Twitch', 'Entrar com Twitch', false, true),
('ui', NULL, 'nav_dashboard', 'pt-PT', 'Dashboard', 'Painel', false, true),
('ui', NULL, 'nav_notifications', 'pt-PT', 'Notifications', 'Notificações', false, true),
('ui', NULL, 'nav_messages', 'pt-PT', 'Messages', 'Mensagens', false, true),
('ui', NULL, 'nav_friends', 'pt-PT', 'Friends', 'Amigos', false, true),
('ui', NULL, 'nav_chat', 'pt-PT', 'Chat', 'Conversa', false, true),
('ui', NULL, 'nav_leaderboards', 'pt-PT', 'Leaderboards', 'Tabelas de Classificação', false, true),
('ui', NULL, 'nav_achievements', 'pt-PT', 'Achievements', 'Conquistas', false, true),
('ui', NULL, 'nav_rewards', 'pt-PT', 'Rewards', 'Recompensas', false, true),
('ui', NULL, 'nav_shop', 'pt-PT', 'Shop', 'Loja', false, true),
('ui', NULL, 'nav_casino', 'pt-PT', 'Casino', 'Casino', false, true),
('ui', NULL, 'nav_slots', 'pt-PT', 'Slots', 'Slots', false, true),
('ui', NULL, 'nav_live', 'pt-PT', 'Live', 'Ao Vivo', false, true),
('ui', NULL, 'nav_stream', 'pt-PT', 'Stream', 'Transmissão', false, true),

-- Language Switcher
('ui', NULL, 'language_english', 'pt-PT', 'English', 'Inglês', false, true),
('ui', NULL, 'language_portuguese', 'pt-PT', 'Portuguese', 'Português', false, true),
('ui', NULL, 'select_language', 'pt-PT', 'Select Language', 'Selecionar Idioma', false, true),
('ui', NULL, 'language_changed', 'pt-PT', 'Language changed', 'Idioma alterado', false, true),

-- Time related
('ui', NULL, 'time_seconds', 'pt-PT', 'seconds', 'segundos', false, true),
('ui', NULL, 'time_minutes', 'pt-PT', 'minutes', 'minutos', false, true),
('ui', NULL, 'time_hours', 'pt-PT', 'hours', 'horas', false, true),
('ui', NULL, 'time_days', 'pt-PT', 'days', 'dias', false, true),
('ui', NULL, 'time_weeks', 'pt-PT', 'weeks', 'semanas', false, true),
('ui', NULL, 'time_months', 'pt-PT', 'months', 'meses', false, true),
('ui', NULL, 'time_years', 'pt-PT', 'years', 'anos', false, true),
('ui', NULL, 'time_ago', 'pt-PT', 'ago', 'atrás', false, true),
('ui', NULL, 'time_remaining', 'pt-PT', 'remaining', 'restante', false, true),
('ui', NULL, 'time_left', 'pt-PT', 'left', 'restante', false, true),

-- Form labels
('ui', NULL, 'form_email', 'pt-PT', 'Email', 'Email', false, true),
('ui', NULL, 'form_password', 'pt-PT', 'Password', 'Palavra-passe', false, true),
('ui', NULL, 'form_username', 'pt-PT', 'Username', 'Nome de utilizador', false, true),
('ui', NULL, 'form_confirm_password', 'pt-PT', 'Confirm Password', 'Confirmar Palavra-passe', false, true),
('ui', NULL, 'form_remember_me', 'pt-PT', 'Remember me', 'Lembrar-me', false, true),
('ui', NULL, 'form_forgot_password', 'pt-PT', 'Forgot password?', 'Esqueceste a palavra-passe?', false, true),
('ui', NULL, 'form_sign_up', 'pt-PT', 'Sign Up', 'Registar', false, true),
('ui', NULL, 'form_sign_in', 'pt-PT', 'Sign In', 'Iniciar Sessão', false, true),
('ui', NULL, 'form_sign_out', 'pt-PT', 'Sign Out', 'Terminar Sessão', false, true),
('ui', NULL, 'form_register', 'pt-PT', 'Register', 'Registar', false, true),

-- Validation messages
('ui', NULL, 'validation_required', 'pt-PT', 'This field is required', 'Este campo é obrigatório', false, true),
('ui', NULL, 'validation_email', 'pt-PT', 'Please enter a valid email', 'Por favor, introduz um email válido', false, true),
('ui', NULL, 'validation_min_length', 'pt-PT', 'Minimum length not met', 'Comprimento mínimo não atingido', false, true),
('ui', NULL, 'validation_max_length', 'pt-PT', 'Maximum length exceeded', 'Comprimento máximo excedido', false, true),
('ui', NULL, 'validation_passwords_match', 'pt-PT', 'Passwords must match', 'As palavras-passe devem coincidir', false, true),
('ui', NULL, 'validation_invalid', 'pt-PT', 'Invalid value', 'Valor inválido', false, true),

-- Casino/Games
('ui', NULL, 'casino_bet', 'pt-PT', 'Bet', 'Aposta', false, true),
('ui', NULL, 'casino_win', 'pt-PT', 'Win', 'Ganho', false, true),
('ui', NULL, 'casino_lose', 'pt-PT', 'Lose', 'Perda', false, true),
('ui', NULL, 'casino_jackpot', 'pt-PT', 'Jackpot', 'Jackpot', false, true),
('ui', NULL, 'casino_spin', 'pt-PT', 'Spin', 'Girar', false, true),
('ui', NULL, 'casino_double', 'pt-PT', 'Double', 'Dobrar', false, true),
('ui', NULL, 'casino_split', 'pt-PT', 'Split', 'Dividir', false, true),
('ui', NULL, 'casino_stand', 'pt-PT', 'Stand', 'Parar', false, true),
('ui', NULL, 'casino_hit', 'pt-PT', 'Hit', 'Pedir', false, true),
('ui', NULL, 'casino_bust', 'pt-PT', 'Bust', 'Rebentou', false, true),
('ui', NULL, 'casino_blackjack', 'pt-PT', 'Blackjack!', 'Blackjack!', false, true),
('ui', NULL, 'casino_push', 'pt-PT', 'Push', 'Empate', false, true),
('ui', NULL, 'casino_insurance', 'pt-PT', 'Insurance', 'Seguro', false, true),
('ui', NULL, 'casino_dealer', 'pt-PT', 'Dealer', 'Dealer', false, true),
('ui', NULL, 'casino_player', 'pt-PT', 'Player', 'Jogador', false, true),
('ui', NULL, 'casino_min_bet', 'pt-PT', 'Min Bet', 'Aposta Mín.', false, true),
('ui', NULL, 'casino_max_bet', 'pt-PT', 'Max Bet', 'Aposta Máx.', false, true),
('ui', NULL, 'casino_total_bet', 'pt-PT', 'Total Bet', 'Aposta Total', false, true),
('ui', NULL, 'casino_payout', 'pt-PT', 'Payout', 'Pagamento', false, true),
('ui', NULL, 'casino_multiplier', 'pt-PT', 'Multiplier', 'Multiplicador', false, true),
('ui', NULL, 'casino_cashout', 'pt-PT', 'Cash Out', 'Levantar', false, true),
('ui', NULL, 'casino_auto_play', 'pt-PT', 'Auto Play', 'Jogo Automático', false, true),
('ui', NULL, 'casino_free_spins', 'pt-PT', 'Free Spins', 'Rodadas Grátis', false, true),
('ui', NULL, 'casino_bonus_round', 'pt-PT', 'Bonus Round', 'Ronda de Bónus', false, true),

-- Profile
('ui', NULL, 'profile_bio', 'pt-PT', 'Bio', 'Biografia', false, true),
('ui', NULL, 'profile_joined', 'pt-PT', 'Joined', 'Registado em', false, true),
('ui', NULL, 'profile_last_seen', 'pt-PT', 'Last seen', 'Visto pela última vez', false, true),
('ui', NULL, 'profile_edit_profile', 'pt-PT', 'Edit Profile', 'Editar Perfil', false, true),
('ui', NULL, 'profile_change_avatar', 'pt-PT', 'Change Avatar', 'Alterar Avatar', false, true),
('ui', NULL, 'profile_followers', 'pt-PT', 'Followers', 'Seguidores', false, true),
('ui', NULL, 'profile_following', 'pt-PT', 'Following', 'A Seguir', false, true),
('ui', NULL, 'profile_posts', 'pt-PT', 'Posts', 'Publicações', false, true),

-- Errors
('ui', NULL, 'error_404', 'pt-PT', 'Page not found', 'Página não encontrada', false, true),
('ui', NULL, 'error_500', 'pt-PT', 'Server error', 'Erro do servidor', false, true),
('ui', NULL, 'error_network', 'pt-PT', 'Network error', 'Erro de rede', false, true),
('ui', NULL, 'error_timeout', 'pt-PT', 'Request timeout', 'Tempo limite excedido', false, true),
('ui', NULL, 'error_unauthorized', 'pt-PT', 'Unauthorized', 'Não autorizado', false, true),
('ui', NULL, 'error_forbidden', 'pt-PT', 'Forbidden', 'Proibido', false, true),
('ui', NULL, 'error_generic', 'pt-PT', 'Something went wrong', 'Algo correu mal', false, true)

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
