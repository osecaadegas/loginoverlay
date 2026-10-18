# Compact requests and Current Game theme fixes

## Changes
- Image Cards defaults to a 36px header and two 90px rows (248px populated height). Empty queues shrink to 88px. The former complete default size profile is upgraded; custom dimensions remain editable.
- Standalone Slot Requests starts with a matching compact editor frame. Existing saved positions are unchanged.
- Embedded Image Cards inherits the hunt palette and uses smaller artwork, padding and avatars. Theme selection also updates saved request element colours and nested colours.
- Current Game Portrait and Portrait Card use palette statistic surfaces and accents. Orbital no longer applies its landscape grids to portrait cards; the hidden-records landscape rule is scoped correctly. Pale statistic surfaces use darker semantic labels.
- Best payout uses primary text and best multiplier uses the palette accent, while keeping element overrides available.
- Applying Solverde reference layout places RTP Stats below gameplay and hides the idle Current Slot widget. A missing RTP widget is added using the normal widget factory. Locked widgets and duplicate instances remain protected. Existing saved layouts require explicit preset application.
- A premium Updates entry describes the release.

## Files created
- DOCs/COMPACT_REQUESTS_AND_CURRENT_GAME_THEME_FIXES.md

## Files modified
- api/_lib/release-notes.js
- src/components/OverlayCenter/editor/WidgetEditorPage.jsx
- src/components/OverlayCenter/editor/solverdeComposition.js
- src/components/OverlayCenter/editor/standardWidgetPresets.js
- src/components/OverlayCenter/editor/widgetColourThemes.js
- src/components/OverlayCenter/widgets/current-slot/CurrentSlotWidget.jsx
- src/components/OverlayCenter/widgets/current-slot/CurrentSlotWidget.css
- src/components/OverlayCenter/widgets/current-slot/CompactSlotPortrait.jsx
- src/components/OverlayCenter/widgets/current-slot/currentSlotModel.js
- src/components/OverlayCenter/widgets/shared/betterWidgetStyles.jsx
- src/components/OverlayCenter/widgets/slot-requests/ImageCards.jsx
- src/components/OverlayCenter/widgets/slot-requests/ImageCards.css
- src/components/OverlayCenter/widgets/slot-requests/ImageCardsControls.jsx
- src/components/OverlayCenter/widgets/slot-requests/imageCardsModel.js
- src/effects/ThemeEffects/orbital/OrbitalCurrentSlot.css
- scripts/test-current-slot-compact.mjs
- scripts/test-request-image-cards.mjs
- scripts/test-solverde-theme.mjs

## Verification
- Production build, validate:widgets and test:updates.
- test:request-image-cards: compact/empty dimensions, title/requester placement, queue changes, saved controls, OBS scaling, five premium palettes including embedded requests, actual published overlay and transparent exterior.
- test:current-slot-compact: both portrait structures across 18 palettes, hidden records, saved controls, zero/missing values, artwork, distinct best-result colours and published route transparency.
- test:solverde: updated reference arrangement, carousel, giveaway, controls, reload and published gameplay transparency.
- test:widget-colour-themes: all 252 widget/palette combinations.
- Visual screenshots inspected for compact Volcanic requests, Arctic portrait card and the updated Solverde arrangement.
- test:appearance-editor reaches an unrelated static landing-page preview assertion at scripts/test-appearance-editor.mjs:238. The expected source pattern is also absent from unmodified HEAD; this task does not change that landing page or weaken its test. The previously missing Slot Requests standard-controls entry was completed.
- test:appearance-v2 is named in AGENTS.md but is absent from the current package scripts.
- Build retains existing optional font and large-chunk warnings.

## Deployment and limitations
No database migrations, additional dependencies, installer changes or account-data mutations. Browser-source output was tested in Chromium using controlled data fixtures; native OBS was not directly operated. To update an existing Solverde arrangement, apply Solverde reference layout, save and publish, then refresh OBS Browser Source.
