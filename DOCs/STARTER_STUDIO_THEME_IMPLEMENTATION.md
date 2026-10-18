# Starter Studio theme and reference preset

Implemented in the existing Streamers Center editor and shared OBS renderer. No new app, service, polling subscription, dependency or database migration was added.

## Use

Choose **Starter Studio** in Colour Theme. This changes styling only. **Starter Studio reference layout** applies the separate 1920×1080 preset, with Undo support. Save/publish the layout and refresh OBS Browser Source.

The preset preserves existing instance IDs and data, keeps duplicate and locked foreground widgets intact, and creates missing required widget types. It hides unlocked standalone RTP Stats, predictions and giveaways to produce the reference arrangement; their data is retained. Giveaway content stays embedded in chat.

The gameplay frame is the existing independently movable/resizable Slot Window widget. Its empty opening has no icon or text. Configured source URLs and capture options remain available. The webcam uses the existing Camera widget. An explicitly configured relay is retained; otherwise **OBS camera source beneath overlay** enables the transparent external-source frame. Its placeholder icon appears only in the editor. The background derives both cutouts from current visible widget geometry, including corner rounding and the webcam footer. Disabling the scene background leaves the canvas transparent.

## Data and appearance

- Hunt START uses the canonical start balance. SPENT is the existing start-minus-stop target, clamped at zero. RETURN is the canonical opened payout total. LIVE B.E. and AVG use the existing hunt calculations. The original scrolling list, artwork resolver and queue remain in use; opened zero payouts display `0x`.
- Current Slot adds the `starter_studio_card` presentation, reusing catalogue/variant metadata, current-slot bindings and the scoped personal-best hook. BEST WIN is the existing personal-best multiplier in `x`; BET uses an available current stake and otherwise displays a dash. Numeric zero remains valid.
- Partners uses the unchanged slideshow playback engine. SC appears only in its empty editor preview; multiple media items receive slide dots.
- Chat reuses live message flow, username colours, giveaway entry/draw/winner states and embedded shoutout playback. Hidden giveaways release their message space.
- Theme controls cover applicable borders, rounding, panel/scene opacity, fonts, heading size/visibility, corner accents, colours and hunt summaries. The Current Slot controls retain artwork/row visibility. New hunt/current-card variants declare their own strict editable element schemas. Existing per-instance appearance overrides and source settings remain supported.

## Files

Created:

- `src/effects/ThemeEffects/starter-studio/starterStudioTheme.js`
- `src/effects/ThemeEffects/starter-studio/StarterStudioTheme.jsx`
- `src/effects/ThemeEffects/starter-studio/StarterStudioTheme.css`
- `src/components/OverlayCenter/editor/starterStudioComposition.js`
- `scripts/test-starter-studio.mjs`
- This report and verification screenshots under `DOCs/verification/`.

Modified:

- `src/components/OverlayCenter/widgets/shared/colourThemePalettes.js`
- `src/components/OverlayCenter/editor/widgetColourThemes.js`
- `src/components/OverlayCenter/editor/betterWidgetRegistry.jsx`
- `src/components/OverlayCenter/editor/BetterWidgetPackages.jsx`
- `src/components/OverlayCenter/editor/WidgetEditorPage.jsx`
- `src/components/OverlayCenter/appearance/v2/widgetAppearanceRegistry.js`
- `src/components/OverlayCenter/widgets/shared/betterWidgetStyles.jsx`
- `src/components/OverlayCenter/widgets/current-slot/CurrentSlotWidget.jsx`
- `src/components/OverlayCenter/widgets/current-slot/CurrentSlotAppearanceControls.jsx`
- `src/components/OverlayCenter/widgets/camera/cameraConfig.js`
- `src/components/OverlayCenter/widgets/navbar/NavbarWidget.jsx`
- `src/components/OverlayCenter/widgets/slideshow-frame/SlideshowFrameWidget.jsx`
- `src/components/OverlayCenter/widgets/slot-window/SlotWindowWidget.jsx`
- `src/components/OverlayCenter/widgets/chat/ChatWidget.jsx`
- `src/components/OverlayCenter/widgets/chat/premiumChatPresentation.js`
- `src/components/OverlayCenter/widgets/giveaway/EmbeddedGiveaway.jsx`
- `src/components/OverlayCenter/widgets/raid-shoutout/RaidShoutoutWidget.jsx`
- `scripts/test-widget-colour-themes.mjs`: expects the new theme and waits for image loading before comparing snapshots.
- `package.json`: adds `test:starter-studio`.
- `api/_lib/release-notes.js`.

## Verification

Passed: production build, widget validation, editor control categories, Starter Studio browser suite, all 280 widget/palette reload and OBS comparisons, and the existing Camera OBS route test against a fresh Vite server. The Starter Studio suite covers transparent pixels in source openings, background visibility, saved controls and geometry, moved/resized openings, canonical personal-best data, zero/missing metadata, long names, hunt advancement, request changes, all giveaway states, image/video playback and the actual published OBS route. Screenshots use controlled fixtures; production reads existing live sources. The theme allocates no additional effects canvas.

`test:appearance-editor` stops at an existing static assertion about the unchanged landing-page Connect Four preview list. `test:appearance-v2` is not a script in the current package; the new strict schemas are validated directly in the Starter Studio browser suite. Native OBS itself was not launched. Existing unresolved custom-font and bundle-size build warnings remain.
