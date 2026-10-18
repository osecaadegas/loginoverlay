# Bonus Hunt: New Horizontal

Choose **Bonus Hunt → Orientation → New Horizontal**, save the overlay and publish to OBS. The natural size is 730 × 150; resizing fits the whole composition proportionally inside the widget frame. Existing orientations and saved positions remain available.

## Implementation

- `src/components/OverlayCenter/widgets/bonus-hunt/NewHorizontalHunt.jsx` and `.css`: continuous navy/coral frame, two opened portrait cards, central summary and three queue positions. No external decorations, extra renderer or canvas.
- `src/components/OverlayCenter/widgets/bonus-hunt/NewHorizontalControls.jsx`: orientation, font, six palette colors, opacity, border, radius and optional advancement motion.
- `src/components/OverlayCenter/widgets/bonus-hunt/shared/newHorizontalHunt.js`: boundary-safe card selection, palette defaults and strict appearance schema.
- `src/components/OverlayCenter/widgets/shared/betterWidgetStyles.jsx`: integration with the existing hydrated/sorted hunt and canonical calculations; disables unused collecting/request carousel timers and win effects for this orientation.
- `src/components/OverlayCenter/editor/BetterWidgetPackages.jsx`: existing selector, geometry updates, variant-specific controls and appearance style routing.
- `src/components/OverlayCenter/editor/betterWidgetRegistry.jsx`: proportional sizing limits and live hunt-number forwarding.
- `src/components/OverlayCenter/appearance/v2/widgetAppearanceRegistry.js`: separate editable element schema for this orientation.
- `api/_lib/release-notes.js`: premium Updates entry.
- `package.json` and `scripts/test-new-horizontal-hunt.mjs`: repeatable browser verification.

No dependencies, database migrations, video transport changes or manual database configuration were required.

## Data and behavior

The crown represents existing **Super** bonuses; lightning represents **Extreme** bonuses. Each counter shows opened/total for its category. START BE uses the existing starting target divided by total hunt stakes; it does not change as payouts arrive. AVG reuses the existing stake-weighted result (total opened payout / total opened stakes).

The last two opened bonuses occupy the left positions. The first unopened bonus stays highlighted to the right of the summary, followed by the next two unopened bonuses. Empty positions remain aligned without duplicating cards. Completed hunts retain their final two opened cards and clear the queue. Collecting hunts do not automatically rotate the selected bonus. Artwork comes through existing slot hydration and image handling. Missing card metrics display a dash; explicit zero payouts and multipliers remain valid.

Appearance is routed by instance, Bonus Hunt type and `new_horizontal` style through the existing V2 engine. The selected theme supplies palette defaults; custom layout palette values override them. Dark card information strips keep readable light text across pale themes. Other orientations retain their existing controls and rendering.

## Verification

Passed:

- `npm.cmd run test:new-horizontal`: actual registry renderer; five-card sequence and advancement; canonical totals, weighted average, starting break-even and categories; zero payouts; missing artwork/metadata; empty/completed states; large values; proportional resizing; five premium themes; editor selection, save/reload; actual published overlay component using isolated database/publication fixtures; transparent screenshot pixels outside the widget; reduced motion; no JavaScript errors.
- `npm.cmd run validate:widgets`
- `npm.cmd run test:updates`
- `npm.cmd run test:preview-data-parity`
- `npm.cmd run test:widget-control-categories`
- `npm.cmd run test:widget-colour-themes`: 234 existing combinations.
- `npm.cmd run test:solverde`: existing horizontal dock, themes, controls and published route.
- `npm.cmd run build`: existing optional-font and bundle-size warnings remain.

Reference-size and published-route screenshots are generated in `.codex-dev/new-horizontal/`. The rendered geometry, proportions, card contrast and hierarchy were inspected against the supplied reference. Controlled test artwork is used only by the test request interceptor; production uses real slot assets.

The existing `test:bonus-hunt-orientations` suite has a previously documented Mainstream drawer/list expectation failure (see `DOCs/SOLVERDE_THEME_IMPLEMENTATION.md`). This is separate from New Horizontal's passing browser checks. No standalone lint or TypeScript checking script is configured in the root package.

The actual browser-source React route and alpha output were verified. Native OBS Studio and live third-party streaming accounts were not exercised; no claim of direct native OBS verification is made. Disable the separate overlay background widget if the full overlay should remain transparent around the hunt.
