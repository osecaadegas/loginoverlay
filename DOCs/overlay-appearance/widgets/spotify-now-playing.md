# Spotify Now Playing

## Identity

| Field | Value |
| --- | --- |
| Widget ID | `spotify_now_playing` |
| Name | Spotify Now Playing |
| Registry | `src/components/OverlayCenter/widgets/builtinWidgets.js:485` |
| Main component | `src/components/OverlayCenter/widgets/SpotifyWidget.jsx:31` |
| Config panel | `src/components/OverlayCenter/widgets/SpotifyConfig.jsx` |
| Styles | `album_card`, `mini_player`, `vinyl`, `glass`, `wave`, `neon`, `metal`, `compact_bar` |
| Data source | Spotify/manual track config and profile integration |
| Persistence | `overlay_widgets.config`; preview sample data in `previewWidgetSamples.js` |

## Rendering structure

- `SpotifyWidget`
  - style router
  - album artwork
  - track title
  - artist name
  - progress/wave/vinyl visual depending on style

## Visual layers

- Root surface.
- Album art.
- Title/artist text.
- Progress bar/wave.
- Vinyl/disc decorative layer.
- Glow/shadow/border.

## Styling method

- Heavy inline styles.
- `subValue` for some appearance values.
- Many gradients and style branches.
- No broad element markers.

## Hardcoded values and risks

- Album art and compact bar layouts have fixed assumptions.
- Wave/vinyl styles have decorative geometry that should not be globally resized.

## Animation model

- Timed/pulsing/wave/vinyl visual effects depending on style.
- Renderer shell animations apply.

## Layout model

- Several unrelated visual modes under one widget ID.
- Compact bar and album card need different safe minimum sizes.

## State variants

- Track playing.
- Manual fallback.
- No track.
- Album art missing.

## Customization safety

- Safe: accent, surface, text, muted text, border radius.
- Constrained: art size, font size, glow strength.
- Dangerous: vinyl/wave animation geometry, compact bar height under minimum.
- Not customizable: Spotify polling/auth logic.
