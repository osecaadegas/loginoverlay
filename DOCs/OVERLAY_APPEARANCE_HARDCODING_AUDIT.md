# Overlay Appearance Hardcoding Audit

Status: in progress. This report records the current implementation slice and the remaining hardcoding inventory. It must not be read as acceptance-complete until the strict audit passes and every widget listed below is verified manually in Appearance Center, inline preview, pop-out preview, OBS, persistence, and reset flows.

## Audit Command

```bash
npm run audit:appearance-hardcoding
npm run audit:appearance-hardcoding -- --summary
```

Latest summary:

```json
{
  "scannedFiles": 69,
  "findingCount": 2810,
  "counts": {
    "element-customisable": 2303,
    "structural": 335,
    "state-customisable": 1,
    "widget-type-customisable": 5,
    "global-customisable": 166
  }
}
```

## Classification Model

All findings are classified with the canonical vocabulary:

```ts
type VisualValueClassification =
  | "structural"
  | "global-customisable"
  | "widget-type-customisable"
  | "style-customisable"
  | "instance-customisable"
  | "element-customisable"
  | "responsive-customisable"
  | "state-customisable";
```

Structural values intentionally remain fixed only when they control renderer mechanics rather than user-facing appearance, such as absolute positioning, z-index, flex/grid relationships, overflow clipping required by OBS, full-size image fills, and data-dependent transforms.

## Implemented Slice

- Central schema and resolver expanded in `src/components/OverlayCenter/appearance/appearanceModel.js`.
- Deterministic resolver now supports system, theme, global, widget type, widget style, widget instance, element, responsive, and draft precedence.
- Element and state definitions are exposed by `getWidgetAppearanceDefinition`.
- `buildWidgetAppearanceVars` emits widget, element, and element-state CSS variables.
- Legacy pseudo-element state keys are bridged in `src/components/OverlayCenter/widgets/shared/appearanceStyles.js`.
- Appearance Center state selection writes state overrides under `subElements[elementId].states[stateId]`.
- Overlay service, hook, and OBS renderer calls are scoped with `overlayId` where the local overlay runtime tables support it.
- Migration `020_overlay_appearance_system.sql` adds overlay scoping, a legacy-to-canonical property map, stricter owner policies, and guards for databases that have not applied the local overlay runtime baseline.
- Tournament renderer has started moving visible values to scoped tokens for container, participant card, score, connector, slot image, empty state, and arena winner/loser paths.
- Tournament type defaults moved from `builtinWidgets.js` into central widget-type appearance defaults in `appearanceModel.js`.
- Giveaway type defaults moved from `builtinWidgets.js` into central widget-type appearance defaults in `appearanceModel.js`.

## Database Inspection

Connected Supabase schema inspection found no recorded migrations and no `overlay_instances`, `overlay_themes`, `overlay_widgets`, or `overlay_state` tables. The connected schema currently exposes `overlays` with:

- `id uuid`
- `user_id uuid`
- `public_id text`
- `settings jsonb`
- `created_at timestamptz`
- `updated_at timestamptz`

Because the local repository baseline creates the `overlay_*` runtime tables in `002_overlay_runtime.sql`, migration `020` is now table-existence-safe and can also bootstrap the missing runtime tables for legacy databases that only have `overlays.settings`.

Remote application result:

- Applied migration: `20260712013730 overlay_appearance_system`
- Backfilled rows: `overlay_instances=1`, `overlay_themes=1`, `overlay_state=1`, `overlay_widgets=11`
- Appearance migration map rows: `23`
- RLS enabled on all new overlay appearance tables
- Policy counts verified: `overlay_instances=2`, `overlay_themes=2`, `overlay_widgets=2`, `overlay_state=2`, `overlay_appearance_property_migrations=1`

## Current Top Remaining Clusters

The most recent grouped audit before this report showed the largest clusters in:

- `src/components/OverlayCenter/widgets/TournamentWidget.jsx`
- `src/components/OverlayCenter/appearance/AppearanceCenter.css`
- `src/components/OverlayCenter/widgets/GiveawayWidget.jsx`
- `src/components/OverlayCenter/widgets/PointWheelWidget.jsx`
- `src/components/OverlayCenter/widgets/NavbarWidget.jsx`
- `src/components/OverlayCenter/widgets/SpotifyWidget.jsx`
- `src/components/OverlayCenter/widgets/ChatWidget.jsx`
- `src/components/OverlayCenter/appearance/appearanceModel.js` for central defaults and validation literals

## Validation So Far

- `npm run test:appearance`: passed after resolver, state, token, and registry changes.
- `npm run build`: passed after Tournament renderer tokenization.
- Supabase inspection: completed with the mismatch noted above; remote migration was then applied and verified.

## Remaining Work

- Continue replacing literal appearance values in every widget renderer with resolver-backed tokens.
- Move remaining widget default palettes from `builtinWidgets.js` into canonical widget-type/style defaults.
- Reduce `AppearanceCenter.css` literals to editor-system tokens or document them as non-user-facing editor chrome.
- Add strict CI gating once false positives are eliminated and renderer literals are removed.
- Add renderer parity tests for inline preview, pop-out preview, and OBS resolved token output.
- Perform the required manual widget-by-widget verification before claiming acceptance completion.