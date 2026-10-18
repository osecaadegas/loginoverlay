# Current Slot: compact Portrait

Implemented 18 October 2026 within the existing Current Slot widget. No database migration or new dependency.

## Use

Select **Current Slot → Orientation / layout → Portrait** in the editor. The selector applies a 145 × 370 frame; resizing preserves the card's proportions with a transparent surrounding canvas. Existing **Immersive** and **Portrait Card** options remain available. Save and publish using the normal editor controls, then refresh the OBS Browser Source.

The artwork area occupies 54% of the card. MAX WIN, RTP, VOL and BEST occupy the lower navy section. BEST retains the existing personal-best **multiplier** and its associated bet (`best_multiplier`, `best_multiplier_bet`), not the payout metric shown by other record panels. Its scope remains the existing streamer/slot identity, including the existing anonymous overlay endpoint.

Existing catalog images are treated as posters with embedded lettering by default. For clean artwork choose **Artwork lettering → Add title and provider**, globally for the widget or per slot under Current Game's Artwork settings. Existing per-slot cover overrides remain valid; an optional portrait cover URL takes precedence over the ordinary cover, while explicit advanced image overrides still win. No OCR or automatic lettering detection is claimed. **Show complete artwork** avoids cropping lettering in unusually wide assets; fill/crop remains the default.

Font family, text/panel/cover/border colours, border thickness/radius, opacity, artwork crop and statistic visibility remain configurable. The new variant declares its own strict V2 element schema. Conditional optional rating indicators use only explicit integer rating metadata from 0 to 5; textual volatility is never converted into an invented rating. Missing numeric values use a dash and zero remains zero. Long values truncate within the value column with their full text available as a tooltip.

## Data correction

Current-slot metadata previously merged fetched catalog values after the selected game, allowing catalog RTP to replace configured RTP. `resolveCurrentSlotMetadata` now fills missing fields from the catalog while retaining explicit current-game metadata, including zero. The renderer no longer memoizes a partial metadata dependency list, so slot-field updates stay together. Existing Supabase queries, permissions, personal-record hooks and source bindings are reused.

## Files

Created:

- `src/components/OverlayCenter/widgets/current-slot/CompactSlotPortrait.jsx`
- `src/components/OverlayCenter/widgets/current-slot/CompactSlotPortrait.css`
- `scripts/test-current-slot-compact.mjs`
- `DOCs/CURRENT_SLOT_COMPACT_PORTRAIT.md`

Modified:

- `src/components/OverlayCenter/widgets/current-slot/{CurrentSlotWidget.jsx,currentSlotModel.js,CurrentSlotAppearanceControls.jsx,CurrentSlotConfig.jsx}`
- `src/components/OverlayCenter/widgets/builtinWidgets.js`
- `src/components/OverlayCenter/appearance/v2/widgetAppearanceRegistry.js`
- `src/components/OverlayCenter/editor/{BetterWidgetPackages.jsx,betterWidgetRegistry.jsx,widgetColourThemes.js}`
- `src/effects/ThemeEffects/solverde/solverdeTheme.js` — explicit compact orientation takes precedence over a saved footer flag.
- `package.json`
- `api/_lib/release-notes.js`

## Verification

- `npm.cmd run test:current-slot-compact`: real Chromium rendering at 145 × 370, 290 × 740 and mismatched frame aspect ratios; portrait/landscape art; embedded/separate lettering; missing art/metadata; numeric zero; configured RTP over catalog RTP; current-slot changes; personal-best units and bet; editor/OBS runtime parity; actual published overlay component and screenshot alpha outside the card; orientation selector; persisted configuration reload; opacity; five representative themes; both previous layouts.
- `npm.cmd run test:current-game-portrait`: the original 225 × 400 / 450 × 800 Portrait Card still passes through the editor and OBS renderer.
- `npm.cmd run test:widget-colour-themes`: 234 existing widget/theme combinations pass.
- `npm.cmd run test:solverde`: the existing Solverde composition, dock and integrated footer regression passes.
- `npm.cmd run test:widget-control-categories`, `npm.cmd run validate:widgets`, `npm.cmd run test:updates`: pass.
- `npm.cmd run build`: passes with the existing optional-font and bundle-size warnings.

Screenshots: `.codex-dev/current-slot-compact/reference-size.png` and `published-overlay.png`. Artwork and API responses in this regression fixture are controlled test data; production uses the existing live sources. The reference-size screenshot was visually inspected for crop, spacing, readable values and the requested layout.

Native OBS Studio and real-account record updates were not exercised. No new performance/FPS claim is made. The root package has no lint or standalone TypeScript script; no such check is claimed. Broader pre-existing appearance-suite failures documented in `DOCs/SOLVERDE_THEME_IMPLEMENTATION.md` are outside this change.
