# Current Widget Inventory

This inventory is based on `src/components/OverlayCenter/widgets/builtinWidgets.js`, the current widget components, `OverlayRenderer.css`, and the existing audit documents in `docs/overlay-appearance/widgets/`.

Detailed per-widget rendering notes remain in `docs/overlay-appearance/widgets/*.md`; this file records the migration-relevant summary for the new editor-ready architecture.

| Widget ID | Display Name | Category | Existing Styles | Main Component | CSS / Styling Sources | Data / Integrations | Migration Complexity |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `bonus_hunt` | Bonus Hunt | casino | `v3`, `v5_horizontal`, `v11_fever`, `v12_classic_sr` | `BonusHuntWidget.jsx`, `BonusHuntWidgetV*.jsx` | Large global CSS in `OverlayRenderer.css`, inline style config, sub-elements | Bonus hunt config/data, slot images, request section | Very high |
| `current_slot` | Current Slot | casino | `v1`, `v2`, `v3`, `v4` | `CurrentSlotWidget.jsx` | component styles and inline config | active slot / detected slot data | Medium |
| `tournament` | Tournament | casino | `grid`, `showcase`, `vertical`, `bracket`, `neon`, `minimal`, `arena`, `futuristic` | `TournamentWidget.jsx` | component styles, global overlay styles | tournament setup data | High |
| `giveaway` | Giveaway | casino | `v1`, `v2`, `v3`, `v4`, `metal`, `bh_stats`, `v12` | `GiveawayWidget.jsx` | component styles, appearance V2 mappings | giveaway participants, keyword, drawing state | High |
| `navbar` | Navbar | stream | `v1`, `metallic`, `glass`, `retro` | `NavbarWidget.jsx` | component styles, inline config | clock, branding, music/live info | Medium |
| `chat` | Chat | stream | `classic`, `floating`, `bubble`, `stack`, `typewriter`, `sidebar`, `cards`, `metal` | `ChatWidget.jsx` | component styles, message state classes | Twitch, YouTube, Kick chat | High |
| `image_slideshow` | Image Slideshow | stream | `v1`, `metal`, `v12` | `ImageSlideshowWidget.jsx` | component styles and config values | user image list, interval timer | Medium |
| `rtp_stats` | RTP Stats Bar | stream | `v1`, `vertical`, `neon`, `minimal`, `glass` | `RtpStatsWidget.jsx` | component styles and V2 mappings | current slot RTP/volatility/max win | Medium |
| `background` | Background | general | `v1`, `aurora`, `matrix`, `starfield`, `waves`, `geometric` | `BackgroundWidget.jsx`, `BackgroundWidget.css` | dedicated CSS, animations, texture config | image/video/color config | Medium |
| `raid_shoutout` | Raid Shoutout | stream | `v1` | `RaidShoutoutWidget.jsx` | component styles, animation config | raid alert data / clips | Medium |
| `spotify_now_playing` | Spotify Now Playing | stream | `album_card`, `mini_player`, `vinyl`, `glass`, `wave`, `neon`, `metal`, `compact_bar` | `SpotifyWidget.jsx` | component styles, preview sample config | Spotify or manual track config | Medium |
| `slot_requests` | Slot Requests | stream | `v1_minimal`, `v2_card_stack`, `v3_compact` | `SlotRequestsWidget.jsx` | global CSS in `OverlayRenderer.css`, style components | Supabase `slot_requests`, app-level chat listener | Pilot |
| `bh_stats` | BH Stats | casino | `default`, `metal`, `glass` | `BHStatsWidget.jsx` | component styles, V2 token mappings | bonus-hunt stats data | Low |
| `bonus_buys` | Bonus Buys | casino | `v1`, `v2_neon`, `v3_minimal` | `BonusBuysWidget.jsx` | component styles and appearance defaults | bonus-buy session data | Medium |
| `bets` | Bets | casino | `v1_list`, `v2_grid`, `v3_grid_2x3` | `BetsWidget.jsx` | component styles, preview sample data | chat betting state | Medium |
| `container` | Container | layout | none | `ContainerWidget.jsx` | layout styling | child widget composition | Medium |

## Common Hardcoding Patterns

- Global class selectors in `OverlayRenderer.css`.
- Per-style hardcoded dimensions and animation distances.
- Inline style values from widget config.
- Widget-specific fallback colors and radii.
- Preview sample values mixed with renderer config.

## Shared Data Risks

- Slot Requests previously had Supabase query and realtime subscription in `SlotRequestsWidget.jsx`.
- Chat and alert widgets can easily duplicate live listeners if presentation styles are copied wholesale.
- Carousel timers should be shared when original and editable presentations use the same motion behavior.

## Pilot Choice

The first editor-ready pilot style is:

- Widget: `slot_requests`
- Original style: `v3_compact`
- Editable style: `v3_compact_editable`

Reason:

- It includes text, images, containers, and carousel timing.
- It is smaller than Bonus Hunt but still validates the architecture.
- It had extractable shared data and timer logic.
- It can remain hidden behind a feature flag while the legacy style stays production fallback.
