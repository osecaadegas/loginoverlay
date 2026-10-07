# Carousel all-time personal best

The image cards in Bonus Hunt must show the same all-time personal best as the RTP bar for that specific slot and owner, including the existing shared Bonus Hunt / Current Game records.

## Fix

The public personal-best endpoint permits 40 slots per request. The carousel previously sent the entire hunt in one request, so a 47-slot hunt was rejected and its cards fell back to current-hunt payouts. The client now requests every unique slot in bounded batches. The API's limit and ownership checks remain intact.

The renderer now supplies the same slot identities it uses to display cards, including legacy provider fields, without treating bonus-row IDs as catalog IDs. Duplicate slots share a lookup. Stale refreshes cannot overwrite newer results, and transient failures retain the last successful records for the same owner and slot list.

## Files

Created:
- `scripts/test-hunt-personal-bests-browser.mjs`
- `DOCs/CAROUSEL_PERSONAL_BEST.md`

Modified:
- `src/hooks/useSlotPersonalBests.js`
- `src/components/OverlayCenter/widgets/shared/betterWidgetStyles.jsx`
- `shared/slotPersonalBest.js`
- `api/_lib/routes/slot-personal-best.js`
- `scripts/test-slot-personal-best.mjs`
- `package.json`

No database migrations or manual configuration are required.

## Verification

Passed:
- `npm.cmd run test:hunt-personal-bests`: 47 unique slots plus a duplicate, two bounded requests, records on both sides of the batch boundary, legacy identity, same-name/different-provider isolation, RTP equality, publication and legacy OBS tokens, owner switch, and failed refresh.
- `npm.cmd run test:slot-personal-best`: shared history, account isolation, both OBS token types, API 40/41 boundary and payment regressions.
- `node scripts/test-rtp-personal-best-browser.mjs` against local port 3011: all eight RTP styles and refresh/ownership regressions.
- `npm.cmd run build` (existing warnings from unrelated locally deleted font assets remain).
- `git diff --check`.

`node scripts/test-hunt-best-chat-preview.mjs` passes its personal-best assertions, then stops at its unrelated Super-tier markup assertion. No tier or chat rendering changes were made.

Browser tests use intercepted record fixtures and do not write production data. These changes have not been deployed.
