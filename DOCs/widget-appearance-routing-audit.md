# Widget Appearance Routing Audit

Date: 2026-07-23
Repository: `osecaadegas/loginoverlay`

This audit is required before refactoring the widget appearance routing system. It documents the existing routing model, known conflict points, and the target canonical identifiers needed to guarantee that one appearance control updates exactly one intended widget element.

## Executive Summary

The current system already has a strong partial V2 appearance foundation:

- `src/components/OverlayCenter/appearance/v2/widgetAppearanceRegistry.js` defines widget types, style variants, editable elements, capabilities, and quick controls.
- `src/components/OverlayCenter/appearance/AppearanceCenter.jsx` selects widgets/elements and writes draft overrides.
- `src/components/OverlayCenter/appearance/appearanceModel.js` resolves saved appearance into widget config for preview and OBS.
- `src/components/OverlayCenter/widgets/shared/appearanceStyles.js` applies per-element styles inside widget renderers.
- `src/components/OverlayCenter/OverlayPreview.jsx` and `src/components/OverlayCenter/OverlayRenderer.jsx` both consume `resolveWidgetsForAppearance(...)`.

However, the system still has routing hazards:

- Saved overrides use generic element IDs such as `container`, `header`, `card`, `statsCard`, `label`, `value`, and `background`.
- Shared properties use generic names such as `background`, `textColor`, `radius`, `fillColor`, `cardBg`, `bgColor`, `borderRadius`, and `fontSize`.
- CSS variables are generic: `--widget-surface`, `--widget-card-bg`, `--widget-header-bg`, `--widget-progress`, `--widget-progress-bg`, `--widget-radius`.
- DOM nodes mostly expose only `data-widget-element`, not a canonical `data-appearance-id`.
- `subElements`, `elementOverrides`, `elementCSS`, and `advancedCSS` can still carry broad or selector-based settings.
- Quick controls can fall back to whole-widget updates when an element-level route is not valid.

The current bug class is plausible: a control labelled or stored as `background` can be resolved through generic widget/container paths and visually affect a parent surface, background widget, preview canvas, or another element class instead of a specific Bonus Hunt element.

## Existing Architecture Inventory

### Appearance editor and state flow

| Area                     | File                                                                     | Current responsibility                                                                                                 | Routing risk                                                                                                                                                                                                                           |
| ------------------------ | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Editor UI                | `src/components/OverlayCenter/appearance/AppearanceCenter.jsx`           | Selects widget, style, element, state; renders simple/advanced controls; commits draft changes.                        | Quick controls can apply to `appearance.simpleSettings`, `appearanceV2.elementOverrides`, or whole widget based on capability checks. Routes are not represented as one canonical object with widget type, variant, element, property. |
| Core model               | `src/components/OverlayCenter/appearance/appearanceModel.js`             | Normalizes appearance, resolves widget config, builds CSS vars, maps old values into `subElements` and `appearanceV2`. | Uses generic override roots like `widgets.{widgetId}.styles.{styleId}.appearanceV2.elementOverrides.{elementId}.{property}` and generic CSS vars like `--widget-card-bg`.                                                              |
| V2 registry              | `src/components/OverlayCenter/appearance/v2/widgetAppearanceRegistry.js` | Defines V2 widget capabilities, style IDs, element IDs, controls, safe ranges.                                         | Element IDs are not globally canonical. `container`, `header`, `label`, `value`, `progressBar`, and `statsCard` repeat across widgets. No stored `appearanceId` per element.                                                           |
| V2 resolver              | `src/components/OverlayCenter/appearance/v2/appearanceResolver.js`       | Migrates simple settings to V2 tokens; applies V2 to widget config.                                                    | Generates shared `subElements` names such as `container`, `card`, `statsCard`, `progressBar`, `label`, `value`.                                                                                                                        |
| Widget styles            | `src/components/OverlayCenter/widgets/shared/appearanceStyles.js`        | Reads `config.__appearanceExplicitSubElements` or `config.subElements`; maps aliases and applies style objects.        | Property aliases allow `background` and `backgroundColor`, `radius` and `borderRadius` to be interchangeable. Helpful for compatibility, risky for strict routing.                                                                     |
| Preview                  | `src/components/OverlayCenter/OverlayPreview.jsx`                        | Renders preview widgets and outlines selected `[data-widget-element]`.                                                 | Selection CSS is keyed only by `data-widget-id` and `data-widget-element`; no `data-appearance-id` validation.                                                                                                                         |
| OBS renderer             | `src/components/OverlayCenter/OverlayRenderer.jsx`                       | Renders actual browser source widgets and injects custom CSS/element CSS.                                              | Applies `advancedCSS` and `elementCSS` selector rules under a widget root. Selector-based CSS can target broad descendants.                                                                                                            |
| Widget manager quick CSS | `src/components/OverlayCenter/WidgetManager.jsx`                         | Provides quick advanced CSS and element CSS editing.                                                                   | Allows raw selector/property updates through `advancedCSS` and `elementCSS`, outside the strict `widgetType -> variant -> element -> property` route.                                                                                  |
| Import/export            | `src/components/OverlayCenter/appearance/widgetStyleTransfer.js`         | Exports and imports style packs.                                                                                       | Style packs preserve `appearance`, `appearanceV2`, `elements`, `subElements`, and `visual` without canonical path validation.                                                                                                          |

### Saved configuration locations

Current saved paths include:

```txt
overlayAppearance.schemaVersion
overlayAppearance.draft
overlayAppearance.published
overlayAppearance.widgets.{widgetId}.activeStyleId
overlayAppearance.widgets.{widgetId}.styles.{styleId}.appearance
overlayAppearance.widgets.{widgetId}.styles.{styleId}.appearanceV2.simple
overlayAppearance.widgets.{widgetId}.styles.{styleId}.appearanceV2.elementOverrides.{elementId}.{property}
overlayAppearance.widgets.{widgetId}.styles.{styleId}.elements.{elementId}.{groupedProperty}
overlayAppearance.widgets.{widgetId}.styles.{styleId}.subElements.{elementId}.{property}
widget.config.__appearanceExplicitSubElements.{elementId}.{property}
widget.config.subElements.{elementId}.{property}
widget.config.elementCSS.{selector}.{cssProperty}
widget.config.advancedCSS.{cssProperty}
```

Target saved paths must be canonical and schema-versioned:

```txt
appearance.schemaVersion = 3
appearance.widgets.{widgetType}.variants.{widgetVariant}.elements.{elementId}.{propertyId}
appearance.instances.{widgetId}.widgets.{widgetType}.variants.{widgetVariant}.elements.{elementId}.{propertyId}
appearance.legacy.unresolved[]
```

The instance path is needed because users can have multiple widgets of the same type and style. Type-level paths can hold defaults, but instance-level paths must be used for normal editor changes.

## Canonical Naming Rules

### Widget type aliases

| Current widget type   | Canonical widget type |
| --------------------- | --------------------- |
| `bonus_hunt`          | `bonusHunt`           |
| `current_slot`        | `currentSlot`         |
| `tournament`          | `tournament`          |
| `giveaway`            | `giveaway`            |
| `navbar`              | `navbar`              |
| `chat`                | `multiChat`           |
| `image_slideshow`     | `imageSlideshow`      |
| `rtp_stats`           | `rtpStats`            |
| `background`          | `overlayBackground`   |
| `raid_shoutout`       | `raidShoutout`        |
| `spotify_now_playing` | `spotifyNowPlaying`   |
| `slot_requests`       | `slotRequests`        |
| `bh_stats`            | `bonusHuntStats`      |
| `bonus_buys`          | `bonusBuys`           |
| `bets`                | `bets`                |
| `container`           | `containerWidget`     |

Reserved non-widget namespaces:

```txt
application.layout.pageBackground
overlayEditor.canvas
```

### Canonical appearance ID format

```txt
{canonicalWidgetType}.{variant}.{canonicalElementId}
```

Examples:

```txt
bonusHunt.v12ClassicSr.widgetBackground
bonusHunt.v12ClassicSr.header
bonusHunt.v12ClassicSr.slotCard
bonusHunt.v12ClassicSr.statsCard
bonusHunt.v12ClassicSr.rtpBar
bets.styleSecaBets.widgetBackground
rtpStats.styleSecaRtp.track
rtpStats.styleSecaRtp.fill
overlayBackground.v1.texture
application.layout.pageBackground
overlayEditor.canvas
```

### Property ID format

Properties remain short only after the full route is present:

```txt
bonusHunt.v12ClassicSr.widgetBackground.backgroundColor
bonusHunt.v12ClassicSr.slotCard.backgroundColor
bonusHunt.v12ClassicSr.statsCard.backgroundColor
rtpStats.styleSecaRtp.trackColor
rtpStats.styleSecaRtp.fillColor
application.layout.pageBackground.backgroundColor
overlayEditor.canvas.backgroundColor
```

A property such as `backgroundColor` is invalid without widget type, variant, and element.

## Per-widget Audit

The tables below document currently registered widgets from `builtinWidgets.js` and V2 element coverage from `widgetAppearanceRegistry.js`.

### Bonus Hunt

| Field                         | Audit                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Widget type                   | `bonus_hunt` -> `bonusHunt`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Variants                      | `v3`, `v5_horizontal`, `v11_fever`, `v12_classic_sr`, V2 also exposes `v12_classic_sr_editable`                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Component files               | `BonusHuntWidget.jsx`, `BonusHuntWidgetV3.jsx`, `BonusHuntWidgetV8.jsx`, `BonusHuntWidgetV9.jsx`, `BonusHuntWidgetV11.jsx`, `BonusHuntWidgetV12.jsx`, `BonusHuntConfig.jsx`                                                                                                                                                                                                                                                                                                                                                                                  |
| Existing appearance keys      | `displayStyle`, `bgColor`, `cardBg`, `headerColor`, `headerAccent`, `listCardColor`, `listCardAccent`, `countCardColor`, `accentColor`, `progressColor`, `progressBgColor`, `subElements`, `appearanceV2.elementOverrides`                                                                                                                                                                                                                                                                                                                                   |
| Existing DOM selectors        | `.bht-*`, `data-widget-element="container"`, `headerContainer`, `statCell`, `slotListContainer`, `slotRow`, `slotImage`, `progressBar`, `progressBarFill`, `footerContainer`, request section elements                                                                                                                                                                                                                                                                                                                                                       |
| Conflicting names             | `container` means whole widget; `statCell` means stats card; `slotListContainer` and `slotRow` can both look like card/background controls; `progressBar` and `progressBarFill` both accept progress controls.                                                                                                                                                                                                                                                                                                                                               |
| Incorrectly affected elements | Widget background, header background, stat cards, slot rows, list container, request section, and overlay background can be confused by `background`, `cardBg`, `container`, or `backgroundColor`.                                                                                                                                                                                                                                                                                                                                                           |
| New canonical IDs             | `bonusHunt.{variant}.widgetBackground`, `bonusHunt.{variant}.header`, `bonusHunt.{variant}.headerTitle`, `bonusHunt.{variant}.headerIcon`, `bonusHunt.{variant}.statsGroup`, `bonusHunt.{variant}.statsCard`, `bonusHunt.{variant}.statsLabel`, `bonusHunt.{variant}.statsValue`, `bonusHunt.{variant}.slotCarousel`, `bonusHunt.{variant}.slotCard`, `bonusHunt.{variant}.slotRow`, `bonusHunt.{variant}.slotImage`, `bonusHunt.{variant}.rtpBarTrack`, `bonusHunt.{variant}.rtpBarFill`, `bonusHunt.{variant}.footer`, `bonusHunt.{variant}.requestsPanel` |
| Migration requirements        | Map known V12 keys only when context is clear: `container.background` -> `widgetBackground.backgroundColor`; `headerContainer.background` -> `header.backgroundColor`; `statCell.background` -> `statsCard.backgroundColor`; `slotRow.background` -> `slotCard.backgroundColor`; `progressBar.background` -> `rtpBarTrack.backgroundColor`; `progressBarFill.fillColor` -> `rtpBarFill.fillColor`. Preserve ambiguous `background`, `cardBg`, `bgColor`, and raw selector CSS under `legacy.unresolved`.                                                     |

### Bets

| Field                    | Audit                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Widget type              | `bets` -> `bets`                                                                                                                                                                                                                                                                                                                                                      |
| Variants                 | `v1_list`, `v2_grid`, `v3_grid_2x3`, `StyleSecaBets`                                                                                                                                                                                                                                                                                                                  |
| Component files          | `BetsWidget.jsx`, `BetsConfig.jsx`                                                                                                                                                                                                                                                                                                                                    |
| Existing appearance keys | `displayStyle`, `colorTheme`, `barColorMode`, `fontFamily`, generic V2 `widgetBackground`, `header`, `individualBetCard`, `progressBar`                                                                                                                                                                                                                               |
| Existing DOM selectors   | `data-widget-element="widgetBackground"`, `header`, `status`, `poolStat`, `timerStat`, `betsStat`, `betCards`, `individualBetCard`, `cardNumberBadge`, `cardRangeText`, `cardPercentageText`, `cardLabel`, `progressBar`, `footerInstruction`                                                                                                                         |
| Conflicting names        | `progressBar` is used as a single element rather than track/fill; `individualBetCard` is repeated and must never use HTML `id`.                                                                                                                                                                                                                                       |
| New canonical IDs        | `bets.{variant}.widgetBackground`, `bets.{variant}.header`, `bets.{variant}.statusBadge`, `bets.{variant}.poolStat`, `bets.{variant}.timerStat`, `bets.{variant}.betsStat`, `bets.{variant}.betCard`, `bets.{variant}.betCardBadge`, `bets.{variant}.betCardLabel`, `bets.{variant}.progressTrack`, `bets.{variant}.progressFill`, `bets.{variant}.footerInstruction` |
| Migration requirements   | Split current `progressBar.background/fillColor` into track/fill where known. Preserve ambiguous `barColorMode` until adapter maps it per variant.                                                                                                                                                                                                                    |

### Slot Requests

| Field                    | Audit                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Widget type              | `slot_requests` -> `slotRequests`                                                                                                                                                                                                                                                                                                                                                                               |
| Variants                 | `v1_minimal`, `v2_card_stack`, `v3_compact`, editor-ready `v3_compact_editable`                                                                                                                                                                                                                                                                                                                                 |
| Component files          | `SlotRequestsWidget.jsx`, `SlotRequestsMinimal.jsx`, `SlotRequestsCardStack.jsx`, `SlotRequestsCompactOverlay.jsx`, `slot-requests/styles/compact-editable/*`, `SlotRequestsConfig.jsx`                                                                                                                                                                                                                         |
| Existing appearance keys | `accentColor`, `textColor`, `mutedColor`, `bgColor`, `cardBg`, `borderColor`, `fontFamily`, `fontSize`, `fontWeight`, `subElements`                                                                                                                                                                                                                                                                             |
| Existing DOM selectors   | `.sr-min-*`, `.sr-cs-*`, `.sr-co-*`, `data-widget-element="container"`, `header`, `queueContainer`, `requestCard`, `position`, `slotImage`, `slotTitle`, `viewerName`, `costBadge`, `emptyState`, `footer`                                                                                                                                                                                                      |
| Conflicting names        | `requestCard`, `cardBg`, and `container` are generic. Several variants share CSS variables (`--sr-min-card-bg`, `--sr-cs-card-bg`, etc.) but not canonical IDs.                                                                                                                                                                                                                                                 |
| New canonical IDs        | `slotRequests.{variant}.widgetBackground`, `slotRequests.{variant}.header`, `slotRequests.{variant}.queue`, `slotRequests.{variant}.requestCard`, `slotRequests.{variant}.positionBadge`, `slotRequests.{variant}.slotImage`, `slotRequests.{variant}.slotTitle`, `slotRequests.{variant}.viewerName`, `slotRequests.{variant}.costBadge`, `slotRequests.{variant}.emptyState`, `slotRequests.{variant}.footer` |
| Migration requirements   | Map variant-specific request card variables to `requestCard`; preserve raw `cardBg` if variant context is absent.                                                                                                                                                                                                                                                                                               |

### Giveaway

| Field                    | Audit                                                                                                                                                                                                                                                                                                                                         |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Widget type              | `giveaway` -> `giveaway`                                                                                                                                                                                                                                                                                                                      |
| Variants                 | `v1`, `v2`, `v3`, `v4`, `metal`, `bh_stats`, `v12`                                                                                                                                                                                                                                                                                            |
| Component files          | `GiveawayWidget.jsx`, `GiveawayConfig.jsx`                                                                                                                                                                                                                                                                                                    |
| Existing appearance keys | `bgColor`, `cardBg`, `textColor`, `mutedColor`, `accentColor`, `borderColor`, shared V2 `container`, `header`, `statusBadge`, `winnerArea`                                                                                                                                                                                                    |
| Existing DOM selectors   | Inline `data-widget-element` on container/header/statusBadge/winnerArea/prize/keyword/participantCount/progressSection/emptyState/footer                                                                                                                                                                                                      |
| Conflicting names        | `container`, `header`, `statusBadge`, and `progressSection` repeat in other widgets.                                                                                                                                                                                                                                                          |
| New canonical IDs        | `giveaway.{variant}.widgetBackground`, `giveaway.{variant}.header`, `giveaway.{variant}.prize`, `giveaway.{variant}.keywordBadge`, `giveaway.{variant}.participantCount`, `giveaway.{variant}.statusBadge`, `giveaway.{variant}.winnerArea`, `giveaway.{variant}.entryProgress`, `giveaway.{variant}.emptyState`, `giveaway.{variant}.footer` |
| Migration requirements   | Map current V2 elements by widget and style. Preserve global `cardBg` without widget instance context.                                                                                                                                                                                                                                        |

### Daily Wheel and Point Wheel

| Field                    | Audit                                                                                                                                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Widget type              | File exists as `PointWheelWidget.jsx` but is not registered in `builtinWidgets.js`; `WheelOfNamesWidget.jsx` also exists.                                                                               |
| Variants                 | Not available in current central widget registry.                                                                                                                                                       |
| Component files          | `PointWheelWidget.jsx`, `PointWheelConfig.jsx`, `WheelOfNamesWidget.jsx`, `WheelOfNamesConfig.jsx`                                                                                                      |
| Existing appearance keys | Not covered by V2 registry; likely direct config and inline styles.                                                                                                                                     |
| Existing CSS selectors   | Must be audited when widget is registered.                                                                                                                                                              |
| Conflicting names        | Wheel segment/card/background labels likely generic.                                                                                                                                                    |
| New canonical IDs        | `dailyWheel.default.widgetBackground`, `dailyWheel.default.segment`, `dailyWheel.default.segmentLabel`, `dailyWheel.default.pointer`, `dailyWheel.default.spinButton`, `dailyWheel.default.winnerPanel` |
| Migration requirements   | No current registry migration. Add only when widget becomes available in `widgetRegistry`.                                                                                                              |

### RTP Stats

| Field                    | Audit                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Widget type              | `rtp_stats` -> `rtpStats`                                                                                                                                                                                                                                                                                                                                                                                                         |
| Variants                 | `v1`, `metal`, `StyleSecaRTP`, `vertical`, `neon`, `minimal`, `glass`                                                                                                                                                                                                                                                                                                                                                             |
| Component files          | `RtpStatsWidget.jsx`, `RtpStatsConfig.jsx`                                                                                                                                                                                                                                                                                                                                                                                        |
| Existing appearance keys | `barBgFrom`, `barBgVia`, `barBgTo`, `borderColor`, `textColor`, `providerColor`, `slotNameColor`, `labelColor`, `rtpIconColor`, `potentialIconColor`, `volatilityIconColor`, `bestWinIconColor`, `dividerColor`, `spinnerColor`                                                                                                                                                                                                   |
| Existing DOM selectors   | `data-widget-element="container"`, `provider`, `slotTitle`, `rtpValue`, `maxWin`, `volatility`, `personalBest`, `statCard`, `label`, `divider`, `spinner`                                                                                                                                                                                                                                                                         |
| Conflicting names        | `label`, `statCard`, and generic bar background keys can affect unrelated text/card controls.                                                                                                                                                                                                                                                                                                                                     |
| New canonical IDs        | `rtpStats.{variant}.widgetBackground`, `rtpStats.{variant}.provider`, `rtpStats.{variant}.slotTitle`, `rtpStats.{variant}.rtpValue`, `rtpStats.{variant}.maxWinValue`, `rtpStats.{variant}.volatilityValue`, `rtpStats.{variant}.personalBestValue`, `rtpStats.{variant}.statCard`, `rtpStats.{variant}.label`, `rtpStats.{variant}.divider`, `rtpStats.{variant}.spinner`, `rtpStats.{variant}.track`, `rtpStats.{variant}.fill` |
| Migration requirements   | Split `barBgFrom/barBgVia/barBgTo` into track/background controls by style. Do not map `labelColor` globally.                                                                                                                                                                                                                                                                                                                     |

### Tournament

| Field                    | Audit                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Widget type              | `tournament` -> `tournament`                                                                                                                                                                                                                                                                                                                           |
| Variants                 | `grid`, `showcase`, `vertical`, `bracket`, `neon`, `minimal`, `arena`, `futuristic`, `esports`                                                                                                                                                                                                                                                         |
| Component files          | `TournamentWidget.jsx`, `TournamentConfig.jsx`, `widgets/tournament/*`                                                                                                                                                                                                                                                                                 |
| Existing appearance keys | Many variant-specific keys: `showBg`, `cardBg`, `cardBorder`, `cardRadius`, `tabBg`, `tabActiveBg`, `nameColor`, `multiColor`, `slotNameColor`, `swordColor`, `arenaAccent`, `esCyan`, `sbAccent`, etc.                                                                                                                                                |
| Existing DOM selectors   | `data-widget-element="container"`, `header`, `matchCard`, `playerName`, `slotImage`, `scoreValue`, `bracketLine`, `statusBadge`                                                                                                                                                                                                                        |
| Conflicting names        | `matchCard`, `playerName`, `slotImage`, and `statusBadge` overlap with other widgets.                                                                                                                                                                                                                                                                  |
| New canonical IDs        | `tournament.{variant}.widgetBackground`, `tournament.{variant}.header`, `tournament.{variant}.matchCard`, `tournament.{variant}.playerName`, `tournament.{variant}.slotImage`, `tournament.{variant}.scoreValue`, `tournament.{variant}.bracketLine`, `tournament.{variant}.statusBadge`, `tournament.{variant}.tab`, `tournament.{variant}.swordIcon` |
| Migration requirements   | Preserve variant-specific legacy keys under matching variant only. Do not map `cardBg` to all cards.                                                                                                                                                                                                                                                   |

### Multi-chat

| Field                    | Audit                                                                                                                                                                                                                                                                                                                                                |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Widget type              | `chat` -> `multiChat`                                                                                                                                                                                                                                                                                                                                |
| Variants                 | `classic`, `floating`, `bubble`, `stack`, `typewriter`, `sidebar`, `cards`, `glow_panel`, `metal`, `StyleSecaChat`, `bh_stats`                                                                                                                                                                                                                       |
| Component files          | `ChatWidget.jsx`, `ChatConfig.jsx`                                                                                                                                                                                                                                                                                                                   |
| Existing appearance keys | `chatStyle`, `bgColor`, `textColor`, `headerBg`, `headerText`, `borderColor`, `fontFamily`, `fontSize`, `msgSpacing`, `msgPadH`, `msgLineHeight`, `raidBgColor`, `cardBg`, `cardBorder`, `headerBorder`, etc.                                                                                                                                        |
| Existing DOM selectors   | `data-widget-element="container"`, `header`, `messageList`, `message`, `username`, `messageText`, `avatar`, `badge`, `highlightedMessage`, `platformLegend`                                                                                                                                                                                          |
| Conflicting names        | `header`, `message`, `badge`, `avatar` are repeated in other widgets. `cardBg` can affect chat cards rather than widget background.                                                                                                                                                                                                                  |
| New canonical IDs        | `multiChat.{variant}.widgetBackground`, `multiChat.{variant}.header`, `multiChat.{variant}.messageList`, `multiChat.{variant}.message`, `multiChat.{variant}.username`, `multiChat.{variant}.messageText`, `multiChat.{variant}.avatar`, `multiChat.{variant}.badge`, `multiChat.{variant}.highlightedMessage`, `multiChat.{variant}.platformLegend` |
| Migration requirements   | Map `bgColor` only to `widgetBackground`; map `cardBg` only to `message` for card variants; preserve ambiguous `headerBg` if variant does not render a header.                                                                                                                                                                                       |

### Spotify

| Field                    | Audit                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Widget type              | `spotify_now_playing` -> `spotifyNowPlaying`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Variants                 | `album_card`, `mini_player`, `vinyl`, `glass`, `wave`, `neon`, `metal`, `compact_bar`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Component files          | `SpotifyWidget.jsx`, `SpotifyConfig.jsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Existing appearance keys | `accentColor`, `bgColor`, `textColor`, `mutedColor`, `fontFamily`, `borderRadius`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Existing DOM selectors   | V2 elements: `container`, `albumArt`, `trackTitle`, `artistName`, `playbackState`, `vinylRecord`, `waveform`, `spotifyBadge`, `listenerBadge`, `progressBar`, `timeLabel`, `equalizer`                                                                                                                                                                                                                                                                                                                                                                                         |
| Conflicting names        | `container`, `progressBar`, `badge` concepts overlap.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| New canonical IDs        | `spotifyNowPlaying.{variant}.widgetBackground`, `spotifyNowPlaying.{variant}.albumArt`, `spotifyNowPlaying.{variant}.trackTitle`, `spotifyNowPlaying.{variant}.artistName`, `spotifyNowPlaying.{variant}.playbackState`, `spotifyNowPlaying.{variant}.vinylRecord`, `spotifyNowPlaying.{variant}.waveform`, `spotifyNowPlaying.{variant}.spotifyBadge`, `spotifyNowPlaying.{variant}.listenerBadge`, `spotifyNowPlaying.{variant}.progressTrack`, `spotifyNowPlaying.{variant}.progressFill`, `spotifyNowPlaying.{variant}.timeLabel`, `spotifyNowPlaying.{variant}.equalizer` |
| Migration requirements   | Split `progressBar` into track/fill where rendered. Preserve `accentColor` per variant only.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

### Navbar

| Field                    | Audit                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Widget type              | `navbar` -> `navbar`                                                                                                                                                                                                                                                                                                                                         |
| Variants                 | `v1`, `metallic`, `StyleSecaNav`, `glass`, `retro`                                                                                                                                                                                                                                                                                                           |
| Component files          | `NavbarWidget.jsx`, `NavbarConfig.jsx`                                                                                                                                                                                                                                                                                                                       |
| Existing appearance keys | `accentColor`, `bgColor`, `textColor`, `mutedColor`, `ctaColor`, `cryptoUpColor`, `cryptoDownColor`, `fontFamily`, `fontSize`, `barHeight`, `borderWidth`, `borderRadius`, `maxWidth`, `avatarSize`, `badgeSize`, `casinoImageSize`                                                                                                                          |
| Existing DOM selectors   | `container`, `logo`, `avatar`, `badgeImage`, `displayName`, `clock`, `music`, `sponsor`, `crypto`, `balance`, `casino`, `separator`                                                                                                                                                                                                                          |
| Conflicting names        | `avatar`, `badgeImage`, `separator`, and `container` are generic.                                                                                                                                                                                                                                                                                            |
| New canonical IDs        | `navbar.{variant}.widgetBackground`, `navbar.{variant}.logo`, `navbar.{variant}.avatar`, `navbar.{variant}.badgeImage`, `navbar.{variant}.displayName`, `navbar.{variant}.clock`, `navbar.{variant}.music`, `navbar.{variant}.sponsor`, `navbar.{variant}.cryptoTicker`, `navbar.{variant}.balance`, `navbar.{variant}.casino`, `navbar.{variant}.separator` |
| Migration requirements   | Preserve `barHeight/maxWidth` at widget background route; map `avatarSize` to avatar only; map `casinoImageSize` to casino only.                                                                                                                                                                                                                             |

### Current Slot

| Field                    | Audit                                                                                                                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Widget type              | `current_slot` -> `currentSlot`                                                                                                                                                                               |
| Variants                 | `v1`, `v2`, `v3`, `v4`                                                                                                                                                                                        |
| Component files          | `CurrentSlotWidget.jsx`, `CurrentSlotConfig.jsx`                                                                                                                                                              |
| Existing appearance keys | `betSize`, shared token defaults, `accentColor`, image settings through V2.                                                                                                                                   |
| Existing DOM selectors   | `container`, `slotImage`, `slotTitle`, `provider`, `stake`, `stat`                                                                                                                                            |
| Conflicting names        | `stat`, `provider`, and `container` are generic.                                                                                                                                                              |
| New canonical IDs        | `currentSlot.{variant}.widgetBackground`, `currentSlot.{variant}.slotImage`, `currentSlot.{variant}.slotTitle`, `currentSlot.{variant}.provider`, `currentSlot.{variant}.stake`, `currentSlot.{variant}.stat` |
| Migration requirements   | Map image controls to `slotImage`; do not map `stat` colors to RTP stats.                                                                                                                                     |

### Image Slideshow

| Field                    | Audit                                                                                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Widget type              | `image_slideshow` -> `imageSlideshow`                                                                                                                        |
| Variants                 | `v1`, `metal`, `v12`                                                                                                                                         |
| Component files          | `ImageSlideshowWidget.jsx`, `ImageSlideshowConfig.jsx`                                                                                                       |
| Existing appearance keys | `borderRadius`, `borderWidth`, `borderColor`, `gradientColor`, `captionColor`, `captionSize`, `captionFont`                                                  |
| Existing DOM selectors   | `container`, `image`, `caption`, `dots`                                                                                                                      |
| Conflicting names        | `image`, `caption`, `container` are generic.                                                                                                                 |
| New canonical IDs        | `imageSlideshow.{variant}.widgetBackground`, `imageSlideshow.{variant}.image`, `imageSlideshow.{variant}.caption`, `imageSlideshow.{variant}.paginationDots` |
| Migration requirements   | Map caption keys only to caption; image border/radius to image or widget background based on previous config key.                                            |

### Raid Shoutout / Alerts

| Field                    | Audit                                                                                                                                                                         |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Widget type              | `raid_shoutout` -> `raidShoutout`                                                                                                                                             |
| Variants                 | `v1`                                                                                                                                                                          |
| Component files          | `RaidShoutoutWidget.jsx`, `RaidShoutoutConfig.jsx`                                                                                                                            |
| Existing appearance keys | `accentColor`, `bgColor`, `textColor`, `subtextColor`, `borderRadius`, `fontFamily`                                                                                           |
| Existing DOM selectors   | `container`, `avatar`, `title`, `subtitle`, `viewerCount`, `clipFrame`                                                                                                        |
| Conflicting names        | `title`, `subtitle`, `avatar`, and `container` repeat in multiple widgets.                                                                                                    |
| New canonical IDs        | `raidShoutout.v1.widgetBackground`, `raidShoutout.v1.avatar`, `raidShoutout.v1.title`, `raidShoutout.v1.subtitle`, `raidShoutout.v1.viewerCount`, `raidShoutout.v1.clipFrame` |
| Migration requirements   | Map `bgColor` to widget background, `subtextColor` to subtitle only.                                                                                                          |

### Bonus Hunt Stats

| Field                    | Audit                                                                                                                                                                                                                                                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Widget type              | `bh_stats` -> `bonusHuntStats`                                                                                                                                                                                                                                                                                      |
| Variants                 | `default`, `metal`, `glass`                                                                                                                                                                                                                                                                                         |
| Component files          | `BHStatsWidget.jsx`, `BHStatsConfig.jsx`                                                                                                                                                                                                                                                                            |
| Existing appearance keys | `bgColor`, `cardBg`, `textColor`, `mutedColor`, `accentColor`, `progressColor`, `progressBgColor`, `bestColor`, `worstColor`, `borderColor`, `borderRadius`                                                                                                                                                         |
| Existing DOM selectors   | `container`, `statsCard`, `label`, `value`, `progressBar`, `bestStat`, `worstStat`                                                                                                                                                                                                                                  |
| Conflicting names        | `statsCard`, `label`, `value`, and `progressBar` are generic and overlap with Bonus Hunt and RTP.                                                                                                                                                                                                                   |
| New canonical IDs        | `bonusHuntStats.{variant}.widgetBackground`, `bonusHuntStats.{variant}.statsCard`, `bonusHuntStats.{variant}.label`, `bonusHuntStats.{variant}.value`, `bonusHuntStats.{variant}.progressTrack`, `bonusHuntStats.{variant}.progressFill`, `bonusHuntStats.{variant}.bestStat`, `bonusHuntStats.{variant}.worstStat` |
| Migration requirements   | Split progress background/fill; do not map `statsCard` to Bonus Hunt `statsCard`.                                                                                                                                                                                                                                   |

### Bonus Buys

| Field                    | Audit                                                                                                                                                                                                                                                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Widget type              | `bonus_buys` -> `bonusBuys`                                                                                                                                                                                                                                                                                                    |
| Variants                 | `v1`, `v2_neon`, `v3_minimal`                                                                                                                                                                                                                                                                                                  |
| Component files          | `BonusBuysWidget.jsx`, `BonusBuysConfig.jsx`                                                                                                                                                                                                                                                                                   |
| Existing appearance keys | `accentColor`, `bgColor`, `textColor`, `mutedColor`, `fontFamily`                                                                                                                                                                                                                                                              |
| Existing DOM selectors   | `sessionCard`, `header`, `slotArtwork`, `label`, `status`, `profit`, `loss`, `payout`, `progressBar`                                                                                                                                                                                                                           |
| Conflicting names        | `sessionCard`, `header`, `label`, `status`, `progressBar` overlap other widgets.                                                                                                                                                                                                                                               |
| New canonical IDs        | `bonusBuys.{variant}.sessionCard`, `bonusBuys.{variant}.header`, `bonusBuys.{variant}.slotArtwork`, `bonusBuys.{variant}.label`, `bonusBuys.{variant}.status`, `bonusBuys.{variant}.profit`, `bonusBuys.{variant}.loss`, `bonusBuys.{variant}.payout`, `bonusBuys.{variant}.progressTrack`, `bonusBuys.{variant}.progressFill` |
| Migration requirements   | Split progress track/fill; map profit/loss colors only to their state elements.                                                                                                                                                                                                                                                |

### Overlay Background Widget

| Field                    | Audit                                                                                                                                                                                                                                                                |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Widget type              | `background` -> `overlayBackground`                                                                                                                                                                                                                                  |
| Variants                 | `v1`, `aurora`, `matrix`, `starfield`, `waves`, `geometric`                                                                                                                                                                                                          |
| Component files          | `BackgroundWidget.jsx`, `BackgroundConfig.jsx`                                                                                                                                                                                                                       |
| Existing appearance keys | `bgMode`, `textureType`, `color1`, `color2`, `color3`, `gradientAngle`, `patternSize`, `animSpeed`, `imageUrl`, `videoUrl`, `imageFit`, `imagePosition`, `opacity`, `borderRadius`, `brightness`, `contrast`, `saturation`, `blur`, `overlayColor`, `overlayOpacity` |
| Existing DOM selectors   | `canvas`, `source`, `texture`, `media`, `tint`, `effects`                                                                                                                                                                                                            |
| Conflicting names        | The word `background` is overloaded with application background and editor canvas.                                                                                                                                                                                   |
| New canonical IDs        | `overlayBackground.{variant}.canvas`, `overlayBackground.{variant}.source`, `overlayBackground.{variant}.texture`, `overlayBackground.{variant}.media`, `overlayBackground.{variant}.tint`, `overlayBackground.{variant}.effects`                                    |
| Migration requirements   | Do not map application page background or editor preview canvas values into this widget. Preserve `bgMode` under source, texture colours under texture, media controls under media.                                                                                  |

### Container Widget

| Field                    | Audit                                                                           |
| ------------------------ | ------------------------------------------------------------------------------- |
| Widget type              | `container` -> `containerWidget`                                                |
| Variants                 | `default`                                                                       |
| Component files          | `ContainerWidget.jsx`, `ContainerConfig.jsx`                                    |
| Existing appearance keys | `gap`, `padding`, `bgColor`, `bgOpacity`                                        |
| Existing DOM selectors   | `container`, `childArea`                                                        |
| Conflicting names        | `container` is the most common generic element ID.                              |
| New canonical IDs        | `containerWidget.default.widgetBackground`, `containerWidget.default.childArea` |
| Migration requirements   | Map `bgColor/bgOpacity` to widget background only.                              |

## File-only Widgets Not Currently Registered

The repository contains additional widget-like files that are not currently registered in `builtinWidgets.js` and therefore are not available through the central widget registry used by Overlay Center. They must not receive live appearance migrations until they are registered.

Examples:

- `CoinFlipWidget.jsx`
- `PointWheelWidget.jsx`
- `PredictionsWidget.jsx`
- `RandomSlotPickerWidget.jsx`
- `SaltyWordsWidget.jsx`
- `SingleSlotWidget.jsx`
- `StatsWidget.jsx`
- `WheelOfNamesWidget.jsx`
- `SlotmachineWidget.jsx`
- `AIChatBotWidget.jsx`

Required when registering any of these:

1. Add widget registry entry.
2. Add V2 appearance registry entry.
3. Add canonical `data-appearance-id` attributes.
4. Add migration map.
5. Add isolation tests.

## Required New Architecture

### Canonical route object

All updates must require this shape:

```js
{
  widgetId,
  widgetType: "bonusHunt",
  widgetVariant: "v12ClassicSr",
  elementId: "widgetBackground",
  appearanceId: "bonusHunt.v12ClassicSr.widgetBackground",
  propertyId: "backgroundColor"
}
```

Invalid routes must throw or return an error. They must not fallback to the first element or whole widget.

### Registry shape

The existing registry should be extended, not replaced with a parallel system:

```js
widgetAppearanceRegistry.bonus_hunt.styles[v12_classic_sr].canonicalVariant =
  "v12ClassicSr";
widgetAppearanceRegistry.bonus_hunt.elements.container.canonicalElementId =
  "widgetBackground";
widgetAppearanceRegistry.bonus_hunt.elements.container.appearanceId =
  "bonusHunt.v12ClassicSr.widgetBackground";
```

A resolver can materialize style-specific `appearanceId`s because an element's full ID depends on variant.

### DOM attributes

Every customizable element should receive:

```txt
data-widget-id="{instance id}"
data-widget-type="bonus-hunt"
data-widget-variant="v12-classic-sr"
data-widget-element="widget-background"
data-appearance-id="bonusHunt.v12ClassicSr.widgetBackground"
```

Repeated elements use the same `data-appearance-id` and may add `data-appearance-instance` or `data-widget-repeat-index`; they must not use duplicate HTML IDs.

### CSS variables

Generated variable format:

```txt
--bonus-hunt-v12-classic-sr-widget-background-background-color
--bonus-hunt-v12-classic-sr-header-background-color
--bonus-hunt-v12-classic-sr-slot-card-background-color
--bonus-hunt-v12-classic-sr-stats-card-background-color
--bonus-hunt-v12-classic-sr-rtp-bar-track-color
--bonus-hunt-v12-classic-sr-rtp-bar-fill-color
```

Generic vars such as `--widget-card-bg` can remain only as compatibility aliases generated from canonical vars during migration, not as primary storage or editor targets.

## Migration Plan

1. Add schema version 3 for canonical appearance state.
2. Add canonical ID helpers:
   - `canonicalWidgetType(widgetType)`
   - `canonicalVariant(styleId)`
   - `canonicalElementId(widgetType, styleId, elementId)`
   - `appearanceIdForRoute(route)`
   - `cssVarForRoute(route)`
3. Add route validation against `widgetAppearanceRegistry`.
4. Add migration from V2 `elementOverrides` and legacy `subElements` to canonical `widgets.{widgetType}.variants.{variant}.elements.{element}.{property}`.
5. Preserve ambiguous values in `legacy.unresolved` with widget ID, style ID, original path, and reason.
6. Update editor controls to send full route objects.
7. Update preview click handling to read `data-appearance-id` and resolve back to the route.
8. Update widget renderers to emit canonical data attributes.
9. Update preview and OBS renderers to use the same canonical resolver.
10. Keep compatibility aliases for old CSS vars only until all widget renderers consume canonical vars.
11. Add tests listed below.

## Required Tests

Add tests to `scripts/test-appearance-v2.mjs` or a new focused test script:

1. Updating `bonusHunt.v12ClassicSr.widgetBackground.backgroundColor` changes only that path.
2. Updating `bonusHunt.v12ClassicSr.slotCard.backgroundColor` does not change widget background.
3. Updating `bonusHunt.v12ClassicSr.statsCard.backgroundColor` does not change slot cards.
4. Updating `application.layout.pageBackground.backgroundColor` does not change any widget.
5. Updating `rtpStats.styleSecaRtp.trackColor` does not change fill color.
6. Updating one variant does not change another variant.
7. Updating Bonus Hunt does not change Bets.
8. Editor preview and OBS renderer generate identical canonical vars for the same route.
9. Save/reload preserves exact canonical paths.
10. Legacy settings migrate without global application.
11. Repeated elements have no duplicate HTML IDs.
12. Invalid routes do not fallback-update any element.
13. Duplicate/missing appearance IDs produce dev warnings.

## Initial Smallest Safe Change

The smallest safe implementation slice is not a CSS rename. It is:

1. Add canonical route helpers and registry validation.
2. Add `data-appearance-id` generation to `partAttrs`/shared helper paths.
3. Add tests proving Bonus Hunt background, stats card, slot card, and RTP track/fill are isolated.
4. Then migrate editor writes from `elementId/property` to full route objects.

This directly addresses the reported bug without breaking existing saved configs or visual designs.
