# Slot Requests: Image Cards

## Use

In `/editor`, add **Slot Requests**, then choose **Image Cards** in its Layout selector. A compact **List** option remains available. Existing Bonus Hunt queues can also select **Chat Requests → Image Cards**, alongside their unchanged List and 3D choices. Save and publish, then refresh the OBS Browser Source.

The independent widget allows the queue to be positioned and resized without moving the hunt. Queue submission and management still use the existing Bonus Hunt settings, command listener, authenticated endpoints and pending-request records. The displayed command falls back to the existing Bonus Hunt source configuration. The reference's shuffle symbol is decorative; this change adds no new shuffle endpoint or queue mutation button.

## Rendering and settings

- Default 440px-wide frame, 60px header, 140px cards, 110×120 artwork, 23px titles, 19px usernames and 8px card gaps.
- Titles stay at the top with two-line clamping and room for the queue badge. Requester rows stay at the bottom. Long names truncate without crossing the badge or widget edge.
- Cards retain real request IDs and actual queue positions. Player count is the number of distinct requester names in the loaded pending queue; the existing API limits the loaded queue to 50 requests.
- The header remains outside the scrollable list. All loaded requests remain reachable; Visible requests sets the desired viewport height, bounded by the widget frame.
- Working controls: row height, artwork width/height/fit, title and username sizes, card gap, visible rows, avatars, positions, font, colors, border, rounding and opacity.
- Artwork uses the existing request image first, cached slot catalogue lookup when absent, and existing `SlotImage` resolution/error fallback. Unknown catalogue artwork uses a themed placeholder.
- Supplied avatar URLs are displayed; missing or broken avatars use a themed user icon. The current public request API does not supply avatar metadata, so public records without it show the placeholder. No external avatar lookup or additional requester-data collection was introduced.
- Shared theme tokens supply independent-widget colors. Nested `requestImageCards` settings isolate embedded layout controls from the hunt's other cards. V2 declares an Image Cards element schema, plus separate prefixed elements for the embedded variant.
- The existing `useSlotRequestsData` hook owns request fetching, subscriptions and OBS refreshes. The new presentation adds no queue polling or subscriptions. Each independently rendered widget uses the existing hook lifecycle; it does not introduce a global multi-instance subscription cache.

## Files

Created:

- `src/components/OverlayCenter/widgets/slot-requests/ImageCards.jsx`
- `src/components/OverlayCenter/widgets/slot-requests/ImageCards.css`
- `src/components/OverlayCenter/widgets/slot-requests/ImageCardsControls.jsx`
- `src/components/OverlayCenter/widgets/slot-requests/SlotRequestsWidget.jsx`
- `src/components/OverlayCenter/widgets/slot-requests/imageCardsModel.js`
- `scripts/test-request-image-cards.mjs`
- This document.

Modified: `src/components/OverlayCenter/editor/BetterWidgetPackages.jsx`, `betterWidgetRegistry.jsx`, `editorWidgetMetadata.js`, `standardWidgetPresets.js`, `widgetColourThemes.js`, `obsConfigScaling.js`; `src/components/OverlayCenter/appearance/v2/widgetAppearanceRegistry.js`; `src/components/OverlayCenter/widgets/builtinWidgets.js`; `src/components/OverlayCenter/widgets/shared/betterWidgetStyles.jsx`; `src/components/OverlayCenter/widgets/bonus-hunt/shared/betterHuntSizing.js`; `scripts/test-widget-control-categories.mjs`; `scripts/test-widget-colour-themes.mjs`; `package.json`; `api/_lib/release-notes.js`.

No dependencies, database migrations, API modifications, authentication changes or installer updates were required.

## Verification

`test:request-image-cards` mounts the real registry renderer, request hook and publication route with isolated database/network fixtures. It verifies reference geometry, title/requester placement, catalogue lookup, avatar failures, stable IDs during reorder/removal, player counts, empty and 30-request queues, narrow frames, header stability during scrolling, editor save/reload, configurable artwork/fonts, advanced image/username overrides, extreme-font collision checks, doubled-resolution OBS geometry, transparent screenshot pixels outside the published widget, five themes and embedded requests.

Additional checks: `validate:widgets`, `test:updates`, `test:preview-data-parity`, `test:service-setup`, `test:widget-control-categories`, `test:widget-colour-themes` (14 families × 18 themes), `test:obs-high-dpi`, `test:new-horizontal`, `test:solverde` and `build`. The color/control tests were extended to include the restored independent Slot Requests type rather than keeping their former 13-type assumption. Existing optional-font and bundle-size build warnings remain.

Reference-size screenshots were inspected from `.codex-dev/request-image-cards/`. Test artwork is substituted only in the request interceptor; production uses catalogue assets. Native OBS Studio and live third-party chat accounts were not directly exercised. The actual published React browser-source route was tested. No production queue records were changed during verification.
