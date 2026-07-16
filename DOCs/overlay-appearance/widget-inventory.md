# Widget Inventory

## OBS and preview routes

| Surface | Route or file | Status | Notes |
| --- | --- | --- | --- |
| OBS browser source | `/overlay/:token` in `src/App.jsx:369` | Canonical | Renders `OverlayRenderer`. |
| Single widget OBS view | `/overlay/:token?widget=<widgetId>` in `OverlayRenderer.jsx:158` | Canonical variant | Filters to a single widget, even if hidden. |
| Preview OBS popout | `/overlay/:token?preview=1` in `OverlayRenderer.jsx:159` | Preview variant | Uses published/draft switching and suppresses enter/exit animations. |
| Inline appearance preview | `src/components/OverlayCenter/OverlayPreview.jsx` | Editor-only | Renders components directly inside the admin page. |
| Embed helper | `public/bonus-hunt-embed.js` | Standalone helper | Referenced by `ProfileSection.jsx` for external embed installation. |
| `/widgets/*` | `src/App.jsx` detects widget route prefix | Incomplete | Detection exists, but no matching React route was found in the current app route tree. |

## Active registered widgets

All active widget registrations are in `src/components/OverlayCenter/widgets/builtinWidgets.js`.

| Widget ID | Name | Component | Config panel | Style key | Registered styles | Risk |
| --- | --- | --- | --- | --- | --- | --- |
| `bonus_hunt` | Bonus Hunt | `BonusHuntWidget` | `BonusHuntConfig` | `displayStyle` | v3, v5_horizontal, v11_fever, v12_classic_sr | High |
| `current_slot` | Current Slot | `CurrentSlotWidget` | `CurrentSlotConfig` | `displayStyle` | v1, v2, v3, v4 | Medium |
| `tournament` | Tournament | `TournamentWidget` | `TournamentConfig` | `layout` | grid, showcase, vertical, bracket, neon, minimal, arena, futuristic, esports | Critical |
| `giveaway` | Giveaway | `GiveawayWidget` | `GiveawayConfig` | `displayStyle` | v1, v2, v3, v4, metal, bh_stats, v12 | High |
| `navbar` | Navbar | `NavbarWidget` | `NavbarConfig` | `displayStyle` | v1, metallic, glass, retro | High |
| `chat` | Chat | `ChatWidget` | `ChatConfig` | `chatStyle` | classic, floating, bubble, stack, typewriter, sidebar, cards, metal, bh_stats | High |
| `image_slideshow` | Image Slideshow | `ImageSlideshowWidget` | `ImageSlideshowConfig` | `displayStyle` | v1, metal, v12 | Medium |
| `rtp_stats` | RTP Stats Bar | `RtpStatsWidget` | `RtpStatsConfig` | `displayStyle` | v1, vertical, neon, minimal, glass | Medium |
| `background` | Background | `BackgroundWidget` | `BackgroundConfig` | `displayStyle` | v1, aurora, matrix, starfield, waves, geometric | High |
| `raid_shoutout` | Raid Shoutout | `RaidShoutoutWidget` | `RaidShoutoutConfig` | `displayStyle` | v1 | High |
| `spotify_now_playing` | Spotify Now Playing | `SpotifyWidget` | `SpotifyConfig` | `displayStyle` | album_card, mini_player, vinyl, glass, wave, neon, metal, compact_bar | High |
| `slot_requests` | Slot Requests | `SlotRequestsWidget` | `SlotRequestsConfig` | `displayStyle` | v1_minimal, v2_card_stack, v3_compact | High |
| `bh_stats` | BH Stats | `BHStatsWidget` | `BHStatsConfig` | `displayStyle` | default, metal, glass | Low |
| `bonus_buys` | Bonus Buys | `BonusBuysWidget` | `BonusBuysConfig` | `displayStyle` | v1, v2_neon, v3_minimal | Medium |
| `bets` | Bets | `BetsWidget` | `BetsConfig` | `displayStyle` | v1_list, v2_grid, v3_grid_2x3 | Medium |
| `container` | Container | `ContainerWidget` | `ContainerConfig` | none | none | Critical |

## Widget files outside the active registry

These component files exist under `src/components/OverlayCenter/widgets/` but are not active entries in `builtinWidgets.js` in the current registry. They may be legacy, incomplete, or used by non-overlay surfaces. Do not expose them in a future appearance editor until their runtime route is proven.

- `AIChatBotWidget.jsx`
- `CoinFlipWidget.jsx`
- `PointWheelWidget.jsx`
- `PredictionsWidget.jsx`
- `RandomSlotPickerWidget.jsx`
- `RecentWinsWidget.jsx`
- `SaltyWordsWidget.jsx`
- `SessionStatsWidget.jsx`
- `SingleSlotWidget.jsx`
- `SlotmachineWidget.jsx`
- `StatsWidget.jsx`
- `WheelOfNamesWidget.jsx`
- `PlaceholderWidget.jsx`

## Shared style and appearance files

| File | Purpose |
| --- | --- |
| `src/components/OverlayCenter/OverlayRenderer.css` | OBS renderer shell styles plus large blocks of widget-specific CSS and keyframes. |
| `src/components/OverlayCenter/OverlayCenter.css` | Admin/control UI styles; imported by `OverlayRenderer.jsx`, so some admin CSS is present in OBS. |
| `src/components/OverlayCenter/OverlayPreview.jsx` | Inline preview renderer. |
| `src/components/OverlayCenter/themeVarsBuilder.js` | Converts legacy theme plus appearance state into CSS variables. |
| `src/components/OverlayCenter/appearance/appearanceModel.js` | Versioned appearance model, widget defaults, sub-element definitions, resolver, CSS variable output. |
| `src/components/OverlayCenter/appearance/editorSchema.js` | Current editor control/schema definitions. |
| `src/components/OverlayCenter/appearance/propertyControls.jsx` | Reusable control UI. |
| `src/components/OverlayCenter/appearance/previewWidgetSamples.js` | Preview-only sample data and frame expansion. |
| `src/components/OverlayCenter/widgets/shared/appearanceStyles.js` | Widget bridge helpers for sub-element values and inline styles. |
| `src/components/OverlayCenter/widgets/widgetRegistry.js` | Runtime widget registration and inferred capability metadata. |

## Persistence and API sources

| Source | Use |
| --- | --- |
| `overlay_instances` | Public token and owner mapping for OBS routes. |
| `overlay_widgets` | Widget instances, config, position, visibility, animations, dimensions. |
| `overlay_themes` | Legacy theme output and compatibility variables. |
| `overlay_state` | Current draft/published appearance state and runtime overlay state. |
| `shared_overlay_presets` | Preset sharing/preset library. |
| `bonus_hunt_history` | Bonus hunt persistence used by related widgets. |
| `detected_slots` | Active slot tracker source for overlay control-side updates. |
| `slot_requests` | Slot Requests widget queue and Bonus Hunt V12 request integration. |
| `slots` | Slot metadata for RTP stats, current slot matching, and slot imagery. |
