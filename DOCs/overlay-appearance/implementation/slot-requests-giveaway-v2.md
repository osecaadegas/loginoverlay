# Slot Requests And Giveaway V2 Migration

Date: 2026-07-16

This phase validates the existing Appearance Engine V2 foundation and migrates only:

- `slot_requests`
- `giveaway`

No unrelated widgets are migrated in this phase.

## Preflight Result

The existing V2 foundation remains the single runtime path:

- Runtime registry: `src/components/OverlayCenter/appearance/v2/widgetAppearanceRegistry.js`
- Token engine: `src/components/OverlayCenter/appearance/v2/materialGenerators.js`
- Resolver and config mapper: `src/components/OverlayCenter/appearance/v2/appearanceResolver.js`
- Shared preview/OBS resolver: `resolveWidgetsForAppearance` in `src/components/OverlayCenter/appearance/appearanceModel.js`
- Shared inline preview renderer: `src/components/OverlayCenter/OverlayPreview.jsx`
- Shared OBS renderer: `src/components/OverlayCenter/OverlayRenderer.jsx`

The migration extends this path instead of creating a second appearance system.

## Slot Requests Migration

### Source Files Inspected

- `src/components/OverlayCenter/widgets/SlotRequestsWidget.jsx`
- `src/components/OverlayCenter/widgets/SlotRequestsMinimal.jsx`
- `src/components/OverlayCenter/widgets/SlotRequestsCardStack.jsx`
- `src/components/OverlayCenter/widgets/SlotRequestsCompactOverlay.jsx`
- `src/components/OverlayCenter/widgets/SlotRequestsConfig.jsx`
- `src/components/OverlayCenter/OverlayRenderer.css`
- `src/components/OverlayCenter/appearance/previewWidgetSamples.js`

### Registered Elements

- `container`
- `header`
- `queueContainer`
- `requestCard`
- `position`
- `slotImage`
- `slotTitle`
- `viewerName`
- `costBadge`
- `emptyState`
- `footer`

### Supported Controls

Slot Requests supports broad Simple Mode materials, color, shape, density, safe scale, and typography. Advanced Mode exposes supported surfaces, borders, shadows, text, badge colors, image radius, and queue/row spacing.

### Intentionally Unsupported

- Slot image width/height.
- 3D card transform distances.
- Marquee/infinite-scroll distances.
- Auto-cycle interval as an appearance control.
- Chat command parsing, queue acceptance, duplicate logic, refund logic.

The V2 resolver filters `slotImage.imageSize`, `slotImage.width`, and `slotImage.height` so legacy settings cannot break queue animation geometry.

### Animation Protection

The 3D carousel `cardTransform(offset)` output remains untouched. V2 styles are applied to inner card surfaces and CSS variables. Widget scale continues through the shared outer slot-size path, not through transforms on animated cards.

### Preview States

Preview-only sample data supports:

- `with_requests`
- `empty`
- `busy_queue`

The preview data is injected only by `applyPreviewWidgetSamples`; live OBS continues to read the `slot_requests` table.

## Giveaway Migration

### Source Files Inspected

- `src/components/OverlayCenter/widgets/GiveawayWidget.jsx`
- `src/components/OverlayCenter/widgets/GiveawayConfig.jsx`
- `src/components/OverlayCenter/appearance/previewWidgetSamples.js`

### Registered Elements

- `container`
- `header`
- `prize`
- `keyword`
- `participantCount`
- `statusBadge`
- `winnerArea`
- `progressSection`
- `timer`
- `emptyState`
- `celebration`
- `footer`

### Supported Controls

Giveaway supports Simple Mode materials, color, shape, density, safe scale, and safe typography. Advanced Mode exposes supported panel, prize, keyword, status, winner, entry, timer, empty, celebration, and footer controls.

### Intentionally Unsupported

- Winner selection logic.
- Participant collection and persistence.
- Draw reel geometry.
- Confetti path and duration.
- Winner transform choreography.

### State Colors

The V2 mapper preserves distinct semantic colors:

- `statusBadge.live`
- `statusBadge.closed`
- `statusBadge.winner`
- `winnerCard.winner`
- `winnerCard.drawing`

User-selected colors influence the theme, but live/winner/closed states remain visually distinct.

### Animation Protection

The existing keyframes remain owned by `GiveawayWidget.jsx`:

- `ga-pulse`
- `ga-glow`
- `ga-confetti-fall`
- `ga-winner-entrance`
- `ga-trophy-3d`
- `ga-name-shimmer`
- `ga-haptic`

V2 styles are applied through `subElementStyle` and do not replace animation-specific transforms.

### Preview States

Preview-only sample data supports:

- `live`
- `drawing`
- `winner`
- `empty`

The state selector in the Appearance page writes only local editor state and does not persist or publish preview state.

## Editor Connection

The existing `/overlay-center/appearance` layout remains unchanged:

- Simple Mode now treats `slot_requests` and `giveaway` as V2 widgets.
- Advanced Mode reads their element definitions from the V2 registry.
- The canvas header shows preview-state buttons only for these widgets.
- Material choices still write `appearanceV2` plus legacy compatibility appearance output.
- Draft and published states remain separated.

## Persistence And Migration

Existing `appearance.simpleSettings`, `elements`, and `subElements` records are preserved. V2 settings are stored in the existing scoped `appearanceV2` object per widget or widget type.

Legacy simple settings migrate in memory through `migrateLegacySimpleToV2`. Unsupported Slot Requests image sizing is filtered during V2 config application rather than deleting the original saved record.

## Tests

`scripts/test-appearance-v2.mjs` covers:

- Registry validation for both widgets.
- V2 enablement.
- Material token mapping.
- State color distinction.
- Unsupported image-size filtering.
- Advanced override priority.
- Preview/OBS shared resolver parity.
- Style non-leakage between Slot Requests and Giveaway.
- Advanced Mode schema generation from the V2 registry.

## Next Widget Migration Pattern

1. Read the audited widget documentation and source files.
2. Add only safe elements to `widgetAppearanceRegistry.js`.
3. Map generated tokens into existing config keys and sub-elements in `appearanceResolver.js`.
4. Add `data-widget-element` and `subElementStyle` only where it does not disrupt layout or animation.
5. Add preview-only sample states if the widget normally depends on live data.
6. Extend `scripts/test-appearance-v2.mjs`.
7. Verify preview and OBS through the shared resolver before browser visual checks.

## Known Limitations

- Visual screenshot comparison for authenticated OBS URLs still requires a local authenticated session and a real overlay token.
- Active animations cannot be exact pixel-compared frame by frame.
- Slot Requests image dimensions remain locked to each renderer variant.
- Giveaway draw/confetti timing remains widget-controlled.
