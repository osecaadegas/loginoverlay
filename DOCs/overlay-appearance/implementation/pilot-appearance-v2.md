# Appearance Engine V2 Pilot

## Pilot Widgets

The first production pilot migrates two audited widgets only:

- `bh_stats` (`src/components/OverlayCenter/widgets/BHStatsWidget.jsx`)
  - Selected as the simple pilot because it has a small DOM shape, limited state variants, no layout-distance animations, and already reads scoped sub-element values via `subValue`.
- `bonus_hunt` (`src/components/OverlayCenter/widgets/BonusHuntWidget.jsx` and `BonusHuntWidgetV12.jsx`)
  - Selected as the complex pilot because it includes nested surfaces, stats, slot rows/cards, slot images, progress, positive/negative states, request rows, and animation-sensitive carousel/flip behavior.

Non-migrated widgets remain on the existing appearance resolver and editor schema.

## Runtime Files

- Registry: `src/components/OverlayCenter/appearance/v2/widgetAppearanceRegistry.js`
- Color utilities: `src/components/OverlayCenter/appearance/v2/colorUtils.js`
- Material generators: `src/components/OverlayCenter/appearance/v2/materialGenerators.js`
- Resolver and config mapper: `src/components/OverlayCenter/appearance/v2/appearanceResolver.js`
- Shared preview/OBS slot sizing: `src/components/OverlayCenter/appearance/v2/widgetSlot.js`
- Tests: `scripts/test-appearance-v2.mjs`

## Appearance Model

Each migrated widget uses a versioned `appearanceV2` object stored beside the existing scoped appearance entry:

```js
{
  schemaVersion: 1,
  widgetId: "bonus_hunt",
  simple: {
    material: "matte",
    primaryColor: "#14d8d8",
    accentColor: null,
    useAccentColor: false,
    shape: "rounded",
    density: "standard",
    scale: 1,
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    textSize: "standard",
    boldText: false
  },
  savedPreset: {},
  widgetOverrides: {},
  elementOverrides: {},
  stateOverrides: {},
  responsiveOverrides: {},
  generatedTokens: {}
}
```

Priority:

1. Widget registry defaults.
2. Generated material tokens.
3. Saved preset token values.
4. Widget-level token overrides.
5. Existing explicit sub-element overrides.
6. V2 element overrides.

Existing `appearance.simpleSettings`, `elements`, and `subElements` records are preserved. Legacy simple settings are migrated in-memory when no `appearanceV2` exists.

## Material Presets

The V2 generator supports:

- Matte
- Metallic
- Gradient
- Glass
- Neon
- Minimal
- Transparent OBS

Generators produce safe tokens for color, surfaces, borders, typography, spacing, shape, and motion. They validate text contrast and choose readable text automatically. Unsupported or layout-sensitive properties are filtered by the widget capability registry.

## Preview And OBS Unification

Both `OverlayPreview.jsx` and `OverlayRenderer.jsx` call `resolveWidgetsForAppearance`, which now applies V2 mapping after the legacy resolver for pilot widgets.

Both wrappers also use `getWidgetSlotSize` and `getWidgetSlotBehavior` from `appearance/v2/widgetSlot.js`, so editor preview and OBS output share:

- Widget scale sizing.
- Preview frame fallback.
- 3D/animation-safe overflow behavior.
- Navbar clipping exceptions.

The wrapper exposes safe scoping attributes:

```html
data-widget-id="..."
data-widget-type="bonus_hunt"
data-appearance-version="v2-1"
data-material="metallic"
```

## Widget Mapping

`bh_stats` receives tokens through existing config keys and sub-elements:

- `bgColor`, `cardBg`, `textColor`, `mutedColor`, `accentColor`
- `borderColor`, `borderRadius`, `fontFamily`, `fontSize`, `fontWeight`
- `progressColor`, `progressBgColor`, `bestColor`, `worstColor`
- `container`, `statsCard`, `label`, `value`, `progressBar`, `bestStat`, `worstStat`

`bonus_hunt` receives tokens through existing Bonus Hunt config keys and V12-compatible sub-elements:

- `headerColor`, `headerAccent`, `listCardColor`, `summaryColor`, `totalPayColor`
- `bonusCard`, `slotRow`, `slotImage`, `headerContainer`, `statCell`, `footerContainer`
- state styles for positive/negative values and footer success/error

Animation distances, flip transforms, carousel transforms, and row transform math remain controlled by widget logic.

## Editor Connection

The existing `/overlay-center/appearance` page is not rebuilt. For pilot widgets:

- Simple Mode writes `appearanceV2` and the old compatibility `appearance` object.
- Advanced Mode gets element definitions from the V2 registry.
- The material list hides the old `soft_shadow` compatibility preset for pilot widgets.
- A development-only diagnostic panel shows active V2 widget, material, color, shape, and density.

For non-pilot widgets, the old editor behavior remains active.

## Migration Guide For Next Widget

1. Add the widget to `APPEARANCE_ENGINE_V2_WIDGETS`.
2. Add a registry entry with audited elements and safe capabilities.
3. Add a mapper in `appearanceResolver.js` that converts tokens into existing config keys and sub-elements.
4. Keep layout and animation-sensitive values owned by the widget.
5. Add tests that prove token generation, non-leakage, preview/OBS resolver parity, and existing-setting preservation.
6. Verify the actual OBS route and editor preview with the same material/color combinations.

## Known Limitations

- Only `bh_stats` and `bonus_hunt` are migrated.
- Visual browser screenshot comparison still requires an authenticated local session and a real overlay token.
- Non-pilot widgets still use the legacy inferred schema and may expose broader controls than their audited capability set.
