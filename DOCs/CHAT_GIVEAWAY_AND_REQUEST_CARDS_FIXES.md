# Embedded giveaway draws and compact request cards

Date: 18 October 2026.

## Changes

`EmbeddedGiveaway.jsx` now marks the drawing state and uses the actual reserved chat bay for the spinning renderer in every palette. `EmbeddedGiveaway.css` keeps the heading, roulette viewport, participant avatars/names and drawing status inside that bay, above messages. The reel uses the resolved giveaway palette or an explicit reel colour, avoiding the grey, low-contrast Candy surface. Open/winner states, winner selection, participant data, durations, source subscriptions and standalone giveaways retain their existing implementation.

`ImageCards.jsx` now treats configured row height as a minimum when fonts need extra space for two full title lines and the requester. The shared CSS clamps whole lines and removes unused title padding when position badges are hidden. An instance-local ResizeObserver measures how many rows fit; the existing forward carousel uses that count after resizing. This adds no polling or data subscription. `StreetArtTheme.css` scales the compact command/count header and list padding with the existing render scale. Saved layout geometry and settings remain intact.

## Files

Created: `src/components/OverlayCenter/widgets/giveaway/EmbeddedGiveaway.css`, this report and the verification screenshots below.

Modified:

- `src/components/OverlayCenter/widgets/giveaway/EmbeddedGiveaway.jsx`
- `src/components/OverlayCenter/widgets/slot-requests/ImageCards.jsx`
- `src/components/OverlayCenter/widgets/slot-requests/ImageCards.css`
- `src/effects/ThemeEffects/street-art/StreetArtTheme.css`
- `scripts/test-embedded-giveaway-themes.mjs`
- `scripts/test-request-image-cards.mjs`
- `api/_lib/release-notes.js`

No dependencies, API/authentication changes, new settings or database migrations.

## Verification

- `npm.cmd run test:embedded-giveaway-themes`: all 441 chat/source theme pairs; 189 open/drawing/winner renders across 21 themes and editor/OBS/sample modes; drawing header, reel, names/status containment and messages below; narrow 280 × 440 chats; independent instances, reload and custom appearance.
- `npm.cmd run test:request-image-cards`: all 21 palettes in editor/OBS at saved Street Art proportions; complete title lines and requester/artwork containment; larger fonts, missing art/avatar fallbacks, actual shared queue updates, counts/order/removal, auto-scroll after resizing, reduced motion, settings reload, overrides and the published OBS route with Street Art Image Cards.
- `npm.cmd run test:widget-colour-themes`: all 294 widget/palette combinations, isolation and editor/OBS parity.
- `npm.cmd run build`, `npm.cmd run validate:widgets`, `npm.cmd run test:preview-data-parity`, `npm.cmd run test:updates`, `git diff --check`.

Screenshots: `DOCs/verification/chat-drawing-street-art.png`, `DOCs/verification/chat-drawing-candy.png`, `DOCs/verification/street-art-image-cards.png`. Screenshots were visually reviewed. Fixtures use the real shared application renderers with isolated test data and database adapters; no production account was modified. Native OBS Studio and actual live winner events were not exercised. The build retains existing unresolved custom-font and large-chunk warnings.
