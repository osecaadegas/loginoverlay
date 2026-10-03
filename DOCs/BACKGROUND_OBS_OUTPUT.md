# Background output and menu cleanup

## OBS setup

Select the background layer in the existing widget editor, then choose a Background source:

- **Transparent — effects only:** place the browser source above your own image, video, or scene in OBS. No chroma filter is required. This preserves soft, translucent effects most accurately.
- **Chroma key:** choose a key colour absent from your effects and add a matching Chroma Key filter to the OBS browser source. Download the matching lossless 1920 × 1080 PNG from the same section if needed.

Colour themes retain their existing effects. These modes remove the base texture, media, and tint without deleting their saved settings. Old Rome's opaque environment is removed; its optional architectural foreground remains controlled by Advanced settings. Smoke, particles, fog, scanlines, vignette, and supported theme effects remain configurable.

Simple contains source, texture colours when applicable, basic particles/atmosphere, colour themes, and supported theme-effect controls. Advanced retains background presets, texture details, media adjustments, and detailed effects. Background navigation has one tier of applicable tabs. Fixed background positioning controls are hidden. Search reaches advanced settings from either mode. Other widgets retain their existing controls.

## Implementation files

Created:
- `src/components/OverlayCenter/widgets/background/backgroundSource.js`: source options, key validation, immutable element updates, PNG download.
- `DOCs/BACKGROUND_OBS_OUTPUT.md`: this guide and verification record.

Modified:
- `src/components/OverlayCenter/editor/BetterWidgetPackages.jsx`
- `src/components/OverlayCenter/editor/BetterWidgetPackages.css`
- `src/components/OverlayCenter/editor/EditorControlScope.jsx`
- `src/components/OverlayCenter/editor/EditorInspector.jsx`
- `src/components/OverlayCenter/editor/editorWidgetMetadata.js`
- `src/components/OverlayCenter/widgets/shared/betterWidgetStyles.jsx`
- `src/components/OverlayCenter/widgets/styleKeysRegistry.js`
- `src/components/OverlayCenter/appearance/editorSchema.js`
- `src/components/OverlayCenter/appearance/v2/widgetAppearanceRegistry.js`
- `src/effects/ThemeEffects/GreekPremium.css`
- `scripts/test-background-editor.mjs`
- `scripts/test-editor-backgrounds-browser.mjs`
- `scripts/test-widget-control-categories.mjs`

No migrations, new dependencies, environment variables, authentication changes, or production publication.

## Verification

- Production build passes. Existing missing custom-font assets and bundle-size warnings remain.
- Background controls, source overrides, colour validation, and immutable update checks pass.
- Browser tests exercise all 20 image and 6 video backgrounds; responsive layouts at 1440, 1024, 390, and 320px; editor save/reload; account/build isolation; publication and the OBS renderer using the local test database.
- Both new output modes pass through all 14 colour themes, save/reload, and OBS publication/rendering. The PNG is checked for 1920 × 1080 dimensions and an opaque exact-green pixel. The download control must be visible in Simple mode.
- All widget control-scope/search tests, widget-category checks, and widget validation pass.
- Colour-theme suite passes 168 widget/palette combinations, reload, isolation, responsive controls, and editor/OBS parity.
- Desktop/mobile screenshots reviewed.

Broader checks are not fully green: `test:appearance-editor` fails an existing source-string assertion about Bonus Hunt contained-list height (the relevant HEAD source is unchanged); `test:theme-effects` fails a Slot Bingo effect-bounds assertion. These were not changed as part of this background task. The earlier local homepage failure from a malformed reviews response was subsequently fixed and covered by the landing-page browser tests described in `DOCs/LANDING_EXPERIENCE.md`. The isolated editor/OBS browser tests pass without page errors. The native OBS application was not tested.

Unrelated pre-existing asset deletions in the working tree were preserved.
