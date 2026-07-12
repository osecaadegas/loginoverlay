-- 020_overlay_appearance_system.sql
-- Central appearance scoping for overlay themes, widgets and runtime state.
-- Idempotent and restartable: existing user-scoped rows are backfilled to the
-- user's current overlay instance before overlay-scoped indexes are added.

BEGIN;

CREATE TABLE IF NOT EXISTS overlay_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  overlay_token VARCHAR(64) NOT NULL UNIQUE,
  display_name VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS overlay_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  overlay_id UUID REFERENCES overlay_instances(id) ON DELETE CASCADE,
  primary_color VARCHAR(9) DEFAULT '#9346ff',
  secondary_color VARCHAR(9) DEFAULT '#1a1b2e',
  accent_color VARCHAR(9) DEFAULT '#00e1ff',
  text_color VARCHAR(9) DEFAULT '#ffffff',
  opacity REAL DEFAULT 0.9,
  blur_intensity REAL DEFAULT 12.0,
  shadow_strength REAL DEFAULT 0.5,
  glow_intensity REAL DEFAULT 0.4,
  border_radius INTEGER DEFAULT 12,
  bg_texture VARCHAR(40) DEFAULT 'none',
  style_preset VARCHAR(20) DEFAULT 'glass',
  font_family VARCHAR(60) DEFAULT 'Inter',
  font_weight INTEGER DEFAULT 500,
  animation_speed REAL DEFAULT 1.0,
  custom_css TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS overlay_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  overlay_id UUID REFERENCES overlay_instances(id) ON DELETE CASCADE,
  widget_type VARCHAR(40) NOT NULL,
  label VARCHAR(80) DEFAULT '',
  is_visible BOOLEAN DEFAULT true,
  position_x REAL DEFAULT 0,
  position_y REAL DEFAULT 0,
  width REAL DEFAULT 400,
  height REAL DEFAULT 300,
  z_index INTEGER DEFAULT 1,
  config JSONB DEFAULT '{}',
  animation VARCHAR(30) DEFAULT 'fade',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS overlay_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  overlay_id UUID REFERENCES overlay_instances(id) ON DELETE CASCADE,
  state JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_overlay_instances_token ON overlay_instances(overlay_token);
CREATE INDEX IF NOT EXISTS idx_overlay_instances_user ON overlay_instances(user_id);
CREATE INDEX IF NOT EXISTS idx_overlay_widgets_user ON overlay_widgets(user_id);

DO $$
BEGIN
  IF to_regclass('public.overlays') IS NOT NULL THEN
    INSERT INTO overlay_instances (id, user_id, overlay_token, display_name, is_active, created_at, updated_at)
    SELECT legacy.id,
           legacy.user_id,
           legacy.public_id,
           'Migrated Overlay',
           true,
           legacy.created_at,
           legacy.updated_at
    FROM overlays legacy
    ON CONFLICT (id) DO UPDATE SET
      overlay_token = EXCLUDED.overlay_token,
      user_id = EXCLUDED.user_id,
      updated_at = GREATEST(overlay_instances.updated_at, EXCLUDED.updated_at);

    INSERT INTO overlay_themes (
      user_id,
      overlay_id,
      primary_color,
      secondary_color,
      accent_color,
      text_color,
      opacity,
      border_radius,
      font_family,
      created_at,
      updated_at
    )
    SELECT legacy.user_id,
           legacy.id,
           COALESCE(legacy.settings->'theme'->>'primary_color', legacy.settings->'theme'->>'primaryColor', '#9346ff'),
           COALESCE(legacy.settings->'theme'->>'secondary_color', legacy.settings->'theme'->>'secondaryColor', '#1a1b2e'),
           COALESCE(legacy.settings->'theme'->>'accent_color', legacy.settings->'theme'->>'accentColor', '#00e1ff'),
           COALESCE(legacy.settings->'theme'->>'text_color', legacy.settings->'theme'->>'textColor', '#ffffff'),
           CASE
             WHEN COALESCE(legacy.settings->'theme'->>'opacity', '') ~ '^[0-9]+(\.[0-9]+)?$'
               THEN (legacy.settings->'theme'->>'opacity')::real
             ELSE 0.9
           END,
           CASE
             WHEN COALESCE(legacy.settings->'theme'->>'border_radius', '') ~ '^[0-9]+$'
               THEN (legacy.settings->'theme'->>'border_radius')::integer
             WHEN COALESCE(legacy.settings->'theme'->>'borderRadius', '') ~ '^[0-9]+$'
               THEN (legacy.settings->'theme'->>'borderRadius')::integer
             ELSE 12
           END,
           COALESCE(legacy.settings->'theme'->>'font_family', legacy.settings->'theme'->>'fontFamily', 'Inter'),
           legacy.created_at,
           legacy.updated_at
    FROM overlays legacy
    WHERE NOT EXISTS (
      SELECT 1 FROM overlay_themes theme WHERE theme.overlay_id = legacy.id
    );

    INSERT INTO overlay_state (user_id, overlay_id, state, updated_at)
    SELECT legacy.user_id,
           legacy.id,
           jsonb_build_object(
             'legacySettings', legacy.settings,
             'appearance', COALESCE(legacy.settings->'appearance', '{}'::jsonb)
           ),
           legacy.updated_at
    FROM overlays legacy
    WHERE NOT EXISTS (
      SELECT 1 FROM overlay_state state_row WHERE state_row.overlay_id = legacy.id
    );

    INSERT INTO overlay_widgets (
      user_id,
      overlay_id,
      widget_type,
      label,
      is_visible,
      position_x,
      position_y,
      width,
      height,
      z_index,
      config,
      animation,
      created_at,
      updated_at
    )
    SELECT legacy.user_id,
           legacy.id,
           regexp_replace(widget.key, '[^a-zA-Z0-9_]+', '_', 'g'),
           initcap(replace(widget.key, '_', ' ')),
           CASE
             WHEN lower(COALESCE(widget.value->>'enabled', '')) IN ('true', 'false')
               THEN (widget.value->>'enabled')::boolean
             ELSE true
           END,
           CASE WHEN COALESCE(widget.value->'position'->>'x', '') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (widget.value->'position'->>'x')::real ELSE 20 END,
           CASE WHEN COALESCE(widget.value->'position'->>'y', '') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (widget.value->'position'->>'y')::real ELSE 20 END,
           CASE WHEN COALESCE(widget.value->>'width', '') ~ '^[0-9]+(\.[0-9]+)?$' THEN (widget.value->>'width')::real ELSE 400 END,
           CASE WHEN COALESCE(widget.value->>'height', '') ~ '^[0-9]+(\.[0-9]+)?$' THEN (widget.value->>'height')::real ELSE 300 END,
           (row_number() OVER (PARTITION BY legacy.id ORDER BY widget.key))::integer,
           widget.value,
           'fade',
           legacy.created_at,
           legacy.updated_at
    FROM overlays legacy
    CROSS JOIN LATERAL jsonb_each(COALESCE(legacy.settings->'widgets', '{}'::jsonb)) AS widget(key, value)
    WHERE jsonb_typeof(COALESCE(legacy.settings->'widgets', '{}'::jsonb)) = 'object'
      AND NOT EXISTS (
        SELECT 1
        FROM overlay_widgets existing
        WHERE existing.overlay_id = legacy.id
          AND existing.widget_type = regexp_replace(widget.key, '[^a-zA-Z0-9_]+', '_', 'g')
      );
  END IF;
END $$;

ALTER TABLE overlay_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE overlay_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE overlay_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE overlay_state ENABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS overlay_themes
  ADD COLUMN IF NOT EXISTS overlay_id UUID REFERENCES overlay_instances(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS overlay_widgets
  ADD COLUMN IF NOT EXISTS overlay_id UUID REFERENCES overlay_instances(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS overlay_state
  ADD COLUMN IF NOT EXISTS overlay_id UUID REFERENCES overlay_instances(id) ON DELETE CASCADE;

DO $$
BEGIN
  IF to_regclass('public.overlay_instances') IS NOT NULL THEN
    IF to_regclass('public.overlay_themes') IS NOT NULL THEN
      UPDATE overlay_themes theme
      SET overlay_id = instance.id
      FROM overlay_instances instance
      WHERE theme.overlay_id IS NULL
        AND instance.user_id = theme.user_id
        AND instance.is_active = true;

      INSERT INTO overlay_themes (user_id, overlay_id)
      SELECT instance.user_id, instance.id
      FROM overlay_instances instance
      LEFT JOIN overlay_themes theme ON theme.overlay_id = instance.id
      WHERE theme.id IS NULL
      ON CONFLICT DO NOTHING;
    END IF;

    IF to_regclass('public.overlay_widgets') IS NOT NULL THEN
      UPDATE overlay_widgets widget
      SET overlay_id = instance.id
      FROM overlay_instances instance
      WHERE widget.overlay_id IS NULL
        AND instance.user_id = widget.user_id
        AND instance.is_active = true;
    END IF;

    IF to_regclass('public.overlay_state') IS NOT NULL THEN
      UPDATE overlay_state state_row
      SET overlay_id = instance.id
      FROM overlay_instances instance
      WHERE state_row.overlay_id IS NULL
        AND instance.user_id = state_row.user_id
        AND instance.is_active = true;

      INSERT INTO overlay_state (user_id, overlay_id, state)
      SELECT instance.user_id, instance.id, '{}'::jsonb
      FROM overlay_instances instance
      LEFT JOIN overlay_state state_row ON state_row.overlay_id = instance.id
      WHERE state_row.id IS NULL
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END $$;

ALTER TABLE IF EXISTS overlay_instances DROP CONSTRAINT IF EXISTS overlay_instances_user_id_key;
ALTER TABLE IF EXISTS overlay_themes DROP CONSTRAINT IF EXISTS overlay_themes_user_id_key;
ALTER TABLE IF EXISTS overlay_state DROP CONSTRAINT IF EXISTS overlay_state_user_id_key;

DO $$
BEGIN
  IF to_regclass('public.overlay_themes') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_overlay_themes_user_overlay ON overlay_themes(user_id, overlay_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_overlay_themes_overlay_unique ON overlay_themes(overlay_id);
  END IF;
  IF to_regclass('public.overlay_widgets') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_overlay_widgets_user_overlay ON overlay_widgets(user_id, overlay_id);
  END IF;
  IF to_regclass('public.overlay_state') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_overlay_state_user_overlay ON overlay_state(user_id, overlay_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_overlay_state_overlay_unique ON overlay_state(overlay_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS overlay_appearance_property_migrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  old_property TEXT NOT NULL UNIQUE,
  canonical_property TEXT NOT NULL,
  classification TEXT NOT NULL,
  migration_risk TEXT NOT NULL DEFAULT 'low',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT overlay_appearance_property_migrations_classification_check
    CHECK (classification IN (
      'structural',
      'global-customisable',
      'widget-type-customisable',
      'style-customisable',
      'instance-customisable',
      'element-customisable',
      'responsive-customisable',
      'state-customisable'
    ))
);

INSERT INTO overlay_appearance_property_migrations (old_property, canonical_property, classification, migration_risk, notes)
VALUES
  ('accentColor', 'colors.accent', 'global-customisable', 'low', 'Legacy visual key resolved by appearanceModel VISUAL_TO_APPEARANCE_PATH.'),
  ('bgColor', 'surfaces.containerBg', 'widget-type-customisable', 'low', 'Inherited into widget config when widget config still holds default value.'),
  ('cardBg', 'surfaces.cardBg', 'element-customisable', 'low', 'Use element background for card-like internals.'),
  ('headerBg', 'surfaces.headerBg', 'element-customisable', 'low', 'Header element background.'),
  ('textColor', 'colors.text', 'global-customisable', 'low', 'Global text token with type/instance overrides.'),
  ('mutedColor', 'colors.muted', 'global-customisable', 'low', 'Muted text token.'),
  ('borderColor', 'borders.color', 'widget-type-customisable', 'low', 'Widget border colour token.'),
  ('fontFamily', 'typography.bodyFont', 'global-customisable', 'medium', 'Existing widget defaults may keep non-default fonts until reset.'),
  ('fontSize', 'typography.baseSize', 'global-customisable', 'medium', 'Existing widget defaults may keep non-default sizes until reset.'),
  ('borderRadius', 'borders.radius', 'widget-type-customisable', 'low', 'Canonical radius token.'),
  ('cardRadius', 'borders.radius', 'element-customisable', 'low', 'Card element radius.'),
  ('borderWidth', 'borders.width', 'widget-type-customisable', 'low', 'Canonical border width token.'),
  ('containerPadding', 'surfaces.padding', 'element-customisable', 'low', 'Container padding token.'),
  ('cardPadding', 'surfaces.padding', 'element-customisable', 'low', 'Card padding token.'),
  ('gap', 'spacing.gap', 'element-customisable', 'low', 'Shared spacing gap token.'),
  ('progressColor', 'colors.success', 'element-customisable', 'low', 'Progress fill colour token.'),
  ('progressBgColor', 'colors.divider', 'element-customisable', 'low', 'Progress track colour token.'),
  ('bestColor', 'colors.positive', 'state-customisable', 'low', 'Positive/best state colour.'),
  ('worstColor', 'colors.negative', 'state-customisable', 'low', 'Negative/worst state colour.'),
  ('openedState', 'subElements.bonusCard.states.opened', 'state-customisable', 'low', 'Legacy pseudo-element bridged by shared appearanceStyles.'),
  ('unopenedState', 'subElements.bonusCard.states.unopened', 'state-customisable', 'low', 'Legacy pseudo-element bridged by shared appearanceStyles.'),
  ('winningState', 'subElements.optionCard.states.winner', 'state-customisable', 'low', 'Legacy pseudo-element bridged by shared appearanceStyles.'),
  ('losingState', 'subElements.optionCard.states.loser', 'state-customisable', 'low', 'Legacy pseudo-element bridged by shared appearanceStyles.')
ON CONFLICT (old_property) DO UPDATE SET
  canonical_property = EXCLUDED.canonical_property,
  classification = EXCLUDED.classification,
  migration_risk = EXCLUDED.migration_risk,
  notes = EXCLUDED.notes,
  updated_at = now();

ALTER TABLE overlay_appearance_property_migrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read appearance migration map" ON overlay_appearance_property_migrations;
CREATE POLICY "Authenticated users can read appearance migration map"
  ON overlay_appearance_property_migrations FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users manage own instance" ON overlay_instances;
CREATE POLICY "Users manage own instance"
  ON overlay_instances FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public read by token" ON overlay_instances;
CREATE POLICY "Public read by token"
  ON overlay_instances FOR SELECT
  USING (is_active = true);

DO $$
BEGIN
  IF to_regclass('public.overlay_instances') IS NOT NULL AND to_regclass('public.overlay_themes') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Users manage own theme" ON overlay_themes;
    CREATE POLICY "Users manage own theme"
      ON overlay_themes FOR ALL
      USING (
        auth.uid() = user_id
        AND (overlay_id IS NULL OR EXISTS (
          SELECT 1 FROM overlay_instances instance
          WHERE instance.id = overlay_themes.overlay_id
            AND instance.user_id = overlay_themes.user_id
        ))
      )
      WITH CHECK (
        auth.uid() = user_id
        AND (overlay_id IS NULL OR EXISTS (
          SELECT 1 FROM overlay_instances instance
          WHERE instance.id = overlay_themes.overlay_id
            AND instance.user_id = overlay_themes.user_id
        ))
      );

    DROP POLICY IF EXISTS "Public read themes by overlay join" ON overlay_themes;
    DROP POLICY IF EXISTS "Public read themes by active overlay" ON overlay_themes;
    CREATE POLICY "Public read themes by active overlay"
      ON overlay_themes FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM overlay_instances instance
        WHERE instance.id = overlay_themes.overlay_id
          AND instance.user_id = overlay_themes.user_id
          AND instance.is_active = true
      ));
  END IF;

  IF to_regclass('public.overlay_instances') IS NOT NULL AND to_regclass('public.overlay_widgets') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Users manage own widgets" ON overlay_widgets;
    CREATE POLICY "Users manage own widgets"
      ON overlay_widgets FOR ALL
      USING (
        auth.uid() = user_id
        AND (overlay_id IS NULL OR EXISTS (
          SELECT 1 FROM overlay_instances instance
          WHERE instance.id = overlay_widgets.overlay_id
            AND instance.user_id = overlay_widgets.user_id
        ))
      )
      WITH CHECK (
        auth.uid() = user_id
        AND (overlay_id IS NULL OR EXISTS (
          SELECT 1 FROM overlay_instances instance
          WHERE instance.id = overlay_widgets.overlay_id
            AND instance.user_id = overlay_widgets.user_id
        ))
      );

    DROP POLICY IF EXISTS "Public read widgets" ON overlay_widgets;
    DROP POLICY IF EXISTS "Public read widgets by active overlay" ON overlay_widgets;
    CREATE POLICY "Public read widgets by active overlay"
      ON overlay_widgets FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM overlay_instances instance
        WHERE instance.id = overlay_widgets.overlay_id
          AND instance.user_id = overlay_widgets.user_id
          AND instance.is_active = true
      ));
  END IF;

  IF to_regclass('public.overlay_instances') IS NOT NULL AND to_regclass('public.overlay_state') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Users manage own state" ON overlay_state;
    CREATE POLICY "Users manage own state"
      ON overlay_state FOR ALL
      USING (
        auth.uid() = user_id
        AND (overlay_id IS NULL OR EXISTS (
          SELECT 1 FROM overlay_instances instance
          WHERE instance.id = overlay_state.overlay_id
            AND instance.user_id = overlay_state.user_id
        ))
      )
      WITH CHECK (
        auth.uid() = user_id
        AND (overlay_id IS NULL OR EXISTS (
          SELECT 1 FROM overlay_instances instance
          WHERE instance.id = overlay_state.overlay_id
            AND instance.user_id = overlay_state.user_id
        ))
      );

    DROP POLICY IF EXISTS "Public read state" ON overlay_state;
    DROP POLICY IF EXISTS "Public read state by active overlay" ON overlay_state;
    CREATE POLICY "Public read state by active overlay"
      ON overlay_state FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM overlay_instances instance
        WHERE instance.id = overlay_state.overlay_id
          AND instance.user_id = overlay_state.user_id
          AND instance.is_active = true
      ));
  END IF;
END $$;

COMMIT;