# Persistence and Versioning

## Current database sources

| Table | Role |
| --- | --- |
| `overlay_instances` | User-owned overlay instance and public token. |
| `overlay_widgets` | Widget instance config, position, size, visibility, animation metadata. |
| `overlay_themes` | Legacy global theme settings and compatibility output. |
| `overlay_state` | Versioned runtime state; intended location for draft/published appearance. |
| `shared_overlay_presets` | User/system preset sharing. |

Relevant migrations:

- `migrations/002_overlay_runtime.sql`
- `migrations/020_overlay_appearance_system.sql`

## Current appearance storage

`appearanceModel.js` defines `APPEARANCE_SCHEMA_VERSION = 2`. The current model separates normalized appearance state from legacy widget config but still needs widget-by-widget capability proof.

Recommended stored shape:

```json
{
  "schemaVersion": 3,
  "published": {
    "globalTokens": {},
    "widgets": {}
  },
  "draft": {
    "globalTokens": {},
    "widgets": {}
  },
  "migration": {
    "fromTheme": true,
    "migratedAt": "2026-07-16T00:00:00.000Z"
  }
}
```

## Backward compatibility rules

- Never delete `overlay_themes` values during migration.
- Convert legacy visual values into tokens only when the widget declares support.
- Preserve widget config values in `overlay_widgets.config`.
- Published OBS output must continue to render if `overlay_state.state.overlayAppearance` is missing.
- Draft saves must not affect OBS until publish.
- Preview-only BroadcastChannel drafts must not write to database.

## Migration safety

For each widget migration:

1. Read existing config and legacy theme.
2. Generate a normalized token draft.
3. Keep original config fields untouched.
4. Add a compatibility adapter that maps tokens back into config or CSS variables.
5. Compare preview and OBS.
6. Publish only after widget-specific tests pass.
