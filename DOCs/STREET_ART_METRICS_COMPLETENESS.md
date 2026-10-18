# Street Art complete widget metrics

18 October 2026.

The compact hunt renders PAYOUT directly below opened progress using the existing totalPay calculation. Its list yields the required internal space; saved widget positions, width and height remain unchanged. The footer declares its own surface, label and value appearance elements.

Street Art Current Slot now renders BET, RTP, VOLATILITY, MAX WIN, BEST PAYOUT and BEST X in a six-cell footer. Artwork yields space inside the same outer card. Statistics use existing slot metadata and the existing personal-best source; zero values remain valid and unavailable results retain a dash. Each row has an appearance schema and a working visibility control. Payout and multiplier retain separate text/accent colours. Fonts inherit the selected widget font. The bet resolution formerly local to Starter Studio is reused without changing its precedence or validation.

The RTP strip now includes the resolved provider logo/name and active slot title. It preserves canonical live priority: an active hunt can supply a different slot from a separately configured Current Slot card. Provider mode, fit, height, maximum width, padding and offsets reuse existing controls. The default name-only mode of old Street Art strips upgrades to image once via an internal rtpIdentityVersion marker. Explicit none/both/image settings survive, and subsequent name-only choices remain available. Best payout and multiplier can use separate lines to fit compact strips.

Modified:

- src/components/OverlayCenter/widgets/shared/betterWidgetStyles.jsx
- src/components/OverlayCenter/widgets/current-slot/CurrentSlotWidget.jsx
- src/components/OverlayCenter/widgets/current-slot/CurrentSlotAppearanceControls.jsx
- src/components/OverlayCenter/appearance/v2/widgetAppearanceRegistry.js
- src/components/OverlayCenter/editor/BetterWidgetPackages.jsx
- src/components/OverlayCenter/editor/streetArtComposition.js
- src/effects/ThemeEffects/street-art/StreetArtTheme.css
- src/effects/ThemeEffects/street-art/streetArtTheme.js
- scripts/test-street-art-theme.mjs
- api/_lib/release-notes.js

Created: this report and DOCs/verification/street-art-complete-metrics.png. No database migrations, dependencies or new data subscriptions.

Checks passed:

- npm.cmd run test:street-art: strict schemas; canonical payout; six Current Slot statistics; unchanged hunt height; label/value containment; provider asset decoding; active hunt identity; current-card and RTP identity across all 21 palettes in both editor/OBS runtimes; zero metadata/bet; personal-record visibility; provider-mode upgrade and explicit modes; preset persistence, existing media/chat controls, actual published OBS route and three canvas resolutions.
- npm.cmd run test:widget-colour-themes: 294 widget/palette combinations, isolation, reload and editor/OBS parity.
- npm.cmd run test:widget-control-categories
- npm.cmd run validate:widgets
- npm.cmd run test:preview-data-parity
- npm.cmd run test:updates
- npm.cmd run build
- git diff --check

The 1920 x 1080 screenshot was visually reviewed. Tests use isolated fixtures and the real shared application components. Native OBS Studio and real production record events were not exercised. Existing missing custom-font and large-chunk build warnings remain.
