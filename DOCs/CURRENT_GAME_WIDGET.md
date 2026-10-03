# Current Game widget

Implemented in the existing Streamers Center application. Management route: `/overlay-center/widgets/current-slot`. Add **Current Game** in `/editor`; the same renderer is used for preview and OBS.

## Behaviour

- Horizontal cover / game identity / Info / Personal record layout with configurable colours and an immersive catalog-image background. All 14 shared themes recolour the frame, surfaces, badge, text, records and saved element colour overrides while preserving slot data and artwork.
- Real catalog fields: name, provider, image, maximum multiplier, RTP and volatility. Missing catalog values display a dash.
- Optional per-slot cover, transparent title and background URLs. The catalog does not expose separate title/background assets, so automatic title extraction is not claimed; text is the fallback.
- Explicit payout entry with positive bet size, nonnegative payout and a derived multiplier. Two decimal places match the existing result-table precision.
- Every Current Game payment is inserted into the existing `user_slot_results` table with `hunt_name = 'Current Game'`. No migration or new database area is needed.
- Shared personal-best reads combine that ledger with existing `user_slot_records` and the older Bonus Hunt history fallback. Best cash win and best multiplier are independent. Known winning bets are shown; unknown historical bet sizes are omitted.
- Average payout is calculated from recorded result rows, including zero payouts. It does not reconstruct missing historical ledger entries. Existing Bonus Hunt result logging is unchanged.
- RTP and Bonus Hunt personal-record cards use the updated shared hooks/API. Current Game supplies RTP's active game when no hunt search/opening or tournament has priority.
- Save retries reuse one UUID and verify a conflicting row belongs to the same owner and payload. The pending request is retained for the mounted page, not across a browser close.
- Existing owner-scoped RLS applies. OBS resolves ownership from the existing active overlay token/publication, never a supplied user ID. Private views refresh on events and periodically; anonymous OBS refreshes records every 60 seconds.
- The legacy shared tables do not store currency. The widget currency is a display setting; amounts are compared as recorded, with no foreign-exchange conversion. Use one accounting currency for comparable results.

## Files created

- `src/components/OverlayCenter/widgets/current-slot/CurrentSlotWidget.jsx`
- `src/components/OverlayCenter/widgets/current-slot/CurrentSlotWidget.css`
- `src/components/OverlayCenter/widgets/current-slot/CurrentSlotConfig.jsx`
- `src/components/OverlayCenter/widgets/current-slot/CurrentSlotAppearanceControls.jsx`
- `src/components/OverlayCenter/widgets/current-slot/currentSlotModel.js`
- `scripts/test-current-game-browser.mjs`
- `DOCs/CURRENT_GAME_WIDGET.md`

## Existing files modified

- `DOCs/overlay-appearance/widgets/current-slot.md`

- `shared/slotPersonalBest.js`
- `api/_lib/routes/slot-personal-best.js`
- `src/hooks/useSlotPersonalBest.js`
- `src/hooks/useSlotPersonalBests.js`
- `src/utils/slotPersonalBestDisplay.js`
- `src/components/OverlayCenter/OverlayControlCenter.jsx`
- `src/components/OverlayCenter/widgets/builtinWidgets.js`
- `src/components/OverlayCenter/widgets/rtp-stats/RtpStatsWidget.jsx`
- `src/components/OverlayCenter/editor/BetterWidgetPackages.jsx`
- `src/components/OverlayCenter/editor/betterWidgetRegistry.jsx`
- `src/components/OverlayCenter/editor/editorWidgetMetadata.js`
- `src/components/OverlayCenter/editor/standardWidgetPresets.js`
- `src/components/OverlayCenter/editor/widgetColourThemes.js`
- `src/components/OverlayCenter/appearance/v2/widgetAppearanceRegistry.js`
- `scripts/validate-widgets.mjs`
- `scripts/test-slot-personal-best.mjs`
- `scripts/test-rtp-personal-best-browser.mjs`
- `scripts/test-appearance-v2.mjs` (Current Game now has its actual Immersive style instead of the removed legacy layouts)
- `package.json`

## Validation

Passed:

- Production build (existing missing custom-font warnings remain from unrelated deleted font files).
- `npm.cmd run validate:widgets`
- `npm.cmd run test:slot-detector`
- `npm.cmd run test:slot-personal-best`: owner isolation, both OBS token types, read-only fallbacks, combined records, averages, money validation and uncertain-response retries.
- `node scripts/test-rtp-personal-best-browser.mjs` against port 3011: eight RTP styles, anonymous OBS, account/slot switching, realtime refresh and mobile rendering.
- `npm.cmd run test:current-game` against port 3011: actual catalog artwork; selection; shared history; retry without duplication; zero payout; restored config; widths 1920, 1440, 1024, 768, 430, 390 and 360; actual Better OBS rendering; scoped advanced appearance edits through serialization; all 14 themes selected through the actual picker in editor and OBS, including saved colour overrides and restored configuration.
- Production schema and owner-only SELECT/INSERT policies inspected read-only. Browser payment tests intercept requests; no test payments were written to production.

Broader checks attempted:

- `test:appearance-editor` stops at its landing Connect 4/Bets/Tournament fixture assertion (outside this change).
- `test-appearance-v2.mjs` stops at the existing Tournament `showcase` style assertion.
- `test:widget-colour-themes` cannot find its Vite `_metadata.json` fixture. Current Game theme mapping is covered by its focused test.

No database migrations or secret changes are required for this feature. Existing unrelated image/font deletions are untouched.
