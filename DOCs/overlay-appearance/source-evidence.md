# Source Evidence Index

This file records the main code references used for the audit. It is not a replacement for the per-widget docs; it is the trail back to the source.

## Route evidence

| Evidence | File |
| --- | --- |
| Canonical OBS route `/overlay/:token` | `src/App.jsx:369` |
| OBS renderer component | `src/components/OverlayCenter/OverlayRenderer.jsx` |
| Inline preview component | `src/components/OverlayCenter/OverlayPreview.jsx` |
| Public embed helper | `public/bonus-hunt-embed.js` |
| `/widgets/` prefix detection but no matching route found | `src/App.jsx` |

## Registry evidence

| Widget | Registration line | Component line | Config line | Style key line |
| --- | --- | --- | --- | --- |
| `bonus_hunt` | `builtinWidgets.js:16` | `:22` | `:23` | `:30` |
| `current_slot` | `builtinWidgets.js:46` | `:52` | `:53` | `:60` |
| `tournament` | `builtinWidgets.js:77` | `:83` | `:84` | `:96` |
| `giveaway` | `builtinWidgets.js:128` | `:134` | `:135` | `:145` |
| `navbar` | `builtinWidgets.js:166` | `:172` | `:173` | `:180` |
| `chat` | `builtinWidgets.js:225` | `:231` | `:232` | `:244` |
| `image_slideshow` | `builtinWidgets.js:304` | `:310` | `:311` | `:317` |
| `rtp_stats` | `builtinWidgets.js:339` | `:345` | `:346` | `:363` |
| `background` | `builtinWidgets.js:400` | `:406` | `:407` | `:416` |
| `raid_shoutout` | `builtinWidgets.js:453` | `:459` | `:460` | `:462` |
| `spotify_now_playing` | `builtinWidgets.js:484` | `:490` | `:491` | `:502` |
| `slot_requests` | `builtinWidgets.js:517` | `:523` | `:524` | `:530` |
| `bh_stats` | `builtinWidgets.js:571` | `:577` | `:578` | `:584` |
| `bonus_buys` | `builtinWidgets.js:607` | `:613` | `:614` | `:620` |
| `bets` | `builtinWidgets.js:647` | `:653` | `:654` | `:660` |
| `container` | `builtinWidgets.js:711` | `:717` | `:718` | none |

## Renderer evidence

| Concern | File |
| --- | --- |
| WidgetSlot wrapper, slot sizing, overflow, radius, custom CSS, elementCSS | `src/components/OverlayCenter/OverlayRenderer.jsx:55-151` |
| Token-to-user load path | `src/components/OverlayCenter/OverlayRenderer.jsx:205-231` |
| Preview BroadcastChannel | `src/components/OverlayCenter/OverlayRenderer.jsx:236-267` |
| Published vs draft appearance choice | `src/components/OverlayCenter/OverlayRenderer.jsx:269-276` |
| Preview sample expansion for preview route | `src/components/OverlayCenter/OverlayRenderer.jsx:278-281` |
| Canvas scaling and final render | `src/components/OverlayCenter/OverlayRenderer.jsx:363-421` |

## Preview evidence

| Concern | File |
| --- | --- |
| Element highlight CSS using `data-widget-element` | `src/components/OverlayCenter/OverlayPreview.jsx:24-45` |
| PreviewSlot wrapper | `src/components/OverlayCenter/OverlayPreview.jsx:70-178` |
| Direct element selection | `src/components/OverlayCenter/OverlayPreview.jsx:126-144` |
| Focused/fit/full preview mode logic | `src/components/OverlayCenter/OverlayPreview.jsx:208-257` |
| Preview sample data application | `src/components/OverlayCenter/OverlayPreview.jsx:190-194` |

## Appearance model evidence

| Concern | File |
| --- | --- |
| Schema version and common property definitions | `src/components/OverlayCenter/appearance/appearanceModel.js` |
| Legacy visual-to-appearance mapping | `src/components/OverlayCenter/appearance/appearanceModel.js` |
| Widget sub-element definitions | `src/components/OverlayCenter/appearance/appearanceModel.js` |
| Widget appearance resolution | `src/components/OverlayCenter/appearance/appearanceModel.js` |
| Widget CSS variable builder | `src/components/OverlayCenter/appearance/appearanceModel.js` |
| Legacy and modern CSS variable builder | `src/components/OverlayCenter/themeVarsBuilder.js` |
| Sub-element helper bridge | `src/components/OverlayCenter/widgets/shared/appearanceStyles.js` |

## Animation evidence

| Area | File and line examples | Risk |
| --- | --- | --- |
| Renderer enter/exit animations | `OverlayRenderer.css:142-351` | Shared shell; duration can be tokenized, transform details should be constrained. |
| Bonus Hunt stack/list/progress | `OverlayRenderer.css:955-1172`, `:1334-1337`, `:1726-1751`, `:2322-2492` | Layout-coupled transforms and scroll distances. |
| Slot Requests transitions | `OverlayRenderer.css:5648-5920` | Marquee, card stack, compact pop/slide depend on exact layout. |
| Bets states | `OverlayRenderer.css:3890-3928`, `:3945-4282` | State-safe color support is possible; geometry is constrained. |
| Raid shoutout | `OverlayRenderer.css:3632-3651` | Alert lifecycle is behavior-coupled. |
| Background effects | `BackgroundWidget.css:28-306`, `BackgroundWidget.jsx:36`, `:346`, `:457`, `:502` | Full-canvas animation/filter performance risk. |
| Tournament | `TournamentWidget.jsx` and `widgets/tournament/MatchCard.jsx:95,148` | Highest risk due many inline animations and layout variants. |
| Spotify/Navbar music visuals | `SpotifyWidget.jsx`, `NavbarWidget.jsx` | Wave/vinyl/marquee geometry should not be generic controls. |
| Chat message motion | `ChatWidget.jsx:267-662` | Message arrival and raid states differ by style. |

## Data/API evidence

| Path | Evidence |
| --- | --- |
| Overlay persistence | `src/services/overlayService.js:48-388` |
| Overlay realtime | `src/services/overlayService.js:298-328` |
| Active slot/detected slot control path | `src/hooks/useOverlay.js:73-161` |
| Slot Requests widget realtime | `SlotRequestsWidget.jsx:29-52` |
| Bonus Hunt request integration | `BonusHuntWidgetV12.jsx:113-134` and `BonusHuntConfig.jsx:1110-1190` |
| RTP slot metadata | `RtpStatsWidget.jsx:15-64`, `:381-425` |
| Chat external APIs | `ChatWidget.jsx:44-56` |
| Navbar crypto/music | `NavbarWidget.jsx:56-57`, music sections later in the file |
| Raid shoutout clip proxy | `RaidShoutoutWidget.jsx:48`, `RaidShoutoutWidget.jsx:165-168`, `api/clip-video.js` |
| Betting command flow | `BetsConfig.jsx:156-279`, `src/hooks/useBetsListener.js:116-117`, `api/_lib/routes/betting.js` |

## Style source count evidence

Approximate counts from code search:

| Widget component | Inline style count | `subValue` count | `subElementStyle` count | `data-widget-element` count | Animation mentions | Risk note |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| `BonusHuntWidgetV12.jsx` | 82 | 3 | 1 | 79 | 0 | Strong marker support, high complexity. |
| `BetsWidget.jsx` | 23 | 3 | 2 | 16 | 0 | Best direct-element candidate. |
| `TournamentWidget.jsx` | 170 | 35 | 0 | 0 | 38 | Highest risk. |
| `GiveawayWidget.jsx` | 134 | 16 | 0 | 0 | 22 | Heavy inline style and animation use. |
| `NavbarWidget.jsx` | 90 | 15 | 0 | 0 | 8 | Many optional live sections. |
| `ChatWidget.jsx` | 90 | 25 | 0 | 0 | 15 | External data plus style variants. |
| `SpotifyWidget.jsx` | 88 | 15 | 0 | 0 | 7 | Multiple unrelated visual modes. |
| `BHStatsWidget.jsx` | 69 | 14 | 0 | 0 | 0 | Easiest early migration candidate. |
| `BackgroundWidget.jsx` | 32 | 17 | 0 | 0 | 4 | Full-canvas performance risk. |
| `BonusBuysWidget.jsx` | 25 | 21 | 0 | 0 | 0 | Moderate, mostly data-display. |
| `CurrentSlotWidget.jsx` | 24 | 7 | 0 | 0 | 0 | Moderate, compact style risk. |
| `RtpStatsWidget.jsx` | 1 | 22 | 0 | 0 | 0 | Token-friendly, but data-dependent. |
| `SlotRequestsWidget.jsx` | 0 | 0 | 0 | 0 | 0 | Styling lives in child components and CSS. |
