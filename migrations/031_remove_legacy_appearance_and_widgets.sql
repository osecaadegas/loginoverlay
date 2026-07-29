-- 031_remove_legacy_appearance_and_widgets.sql
-- Removes the retired Overlay Center Appearance data and unsupported legacy
-- widget rows while keeping the live data-source tables used by /editor.

BEGIN;

DELETE FROM public.overlay_widgets
WHERE widget_type NOT IN (
  'bonus_hunt',
  'giveaway',
  'navbar',
  'chat',
  'rtp_stats',
  'background',
  'bets'
);

UPDATE public.overlay_state
SET state =
  COALESCE(state, '{}'::jsonb)
  - 'appearance'
  - 'overlayAppearance'
  - 'appearanceDraft'
  - 'appearanceHistory'
  - 'appearanceSelection'
  - 'appearanceClipboard'
  - 'appearanceWorkspace'
  - 'widgetAppearance'
  - 'widgetAppearanceV2'
  - 'globalPresets'
WHERE COALESCE(state, '{}'::jsonb) ?| ARRAY[
  'appearance',
  'overlayAppearance',
  'appearanceDraft',
  'appearanceHistory',
  'appearanceSelection',
  'appearanceClipboard',
  'appearanceWorkspace',
  'widgetAppearance',
  'widgetAppearanceV2',
  'globalPresets'
];

UPDATE public.overlay_widgets
SET config =
  COALESCE(config, '{}'::jsonb)
  - '__appearanceDocument'
  - '__appearanceWidgetType'
  - '__appearanceStyleId'
  - '__appearanceExplicitSubElements'
  - 'subElements'
  - 'elementCSS'
  - 'advancedCSS'
  - 'custom_css'
WHERE COALESCE(config, '{}'::jsonb) ?| ARRAY[
  '__appearanceDocument',
  '__appearanceWidgetType',
  '__appearanceStyleId',
  '__appearanceExplicitSubElements',
  'subElements',
  'elementCSS',
  'advancedCSS',
  'custom_css'
];

DROP TABLE IF EXISTS public.overlay_appearance_property_migrations;

COMMIT;
