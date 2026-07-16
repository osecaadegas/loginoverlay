# Overlay Appearance Technical Audit

Last audited: 2026-07-16

This folder is the technical reference for the Streamers Center OBS widget system. It is intentionally documentation-only: no editor redesign or renderer refactor is included in this audit.

## Scope

The audit inspected the current Vite/React/Vercel/Supabase repository, including:

- OBS browser-source route and renderer.
- Inline editor preview.
- Built-in widget registry.
- Widget component files and widget-specific CSS.
- Appearance model, theme variable builder, preview sample data, and editor schema.
- Overlay persistence tables and migrations.
- Realtime update paths used by widgets.
- Hardcoded styles, animations, CSS variables, inline styles, and preview mismatches.

## Headline findings

- Canonical OBS route: `/overlay/:token`, implemented by `src/components/OverlayCenter/OverlayRenderer.jsx`.
- Canonical inline preview: `src/components/OverlayCenter/OverlayPreview.jsx`.
- Active registered widget types: 16, registered in `src/components/OverlayCenter/widgets/builtinWidgets.js`.
- Extra widget component files exist outside the active registry and should be treated as legacy or inactive until wired.
- Preview and OBS use many of the same widget components, but not the same runtime shell, data mode, or animation mode.
- Only a subset of widgets expose direct `data-widget-element` markers for element-level editing.
- Styling is mixed across CSS variables, inline styles, global CSS, widget-specific CSS, config defaults, legacy theme variables, and injected custom CSS.
- `overlay_state.state.overlayAppearance` is the current intended draft/published appearance source; `overlay_themes` still provides legacy compatibility variables.

## Documentation map

- [Widget inventory](widget-inventory.md)
- [Rendering architecture](rendering-architecture.md)
- [Appearance editor audit](appearance-editor-audit.md)
- [Preview vs OBS mismatch report](preview-vs-obs.md)
- [Source evidence index](source-evidence.md)
- [Capability registry specification](capability-registry-spec.md)
- [Appearance token specification](appearance-token-spec.md)
- [Material preset specification](material-presets.md)
- [Persistence and versioning](persistence-and-versioning.md)
- [Migration plan](migration-plan.md)
- [Implementation roadmap](implementation-roadmap.md)
- [Runtime verification notes](runtime-verification.md)
- [Machine-readable audit](widget-capabilities.json)
- [Appearance Engine V2 pilot implementation](implementation/pilot-appearance-v2.md)

## Per-widget references

- [Bonus Hunt](widgets/bonus-hunt.md)
- [Current Slot](widgets/current-slot.md)
- [Tournament](widgets/tournament.md)
- [Giveaway](widgets/giveaway.md)
- [Navbar](widgets/navbar.md)
- [Chat](widgets/chat.md)
- [Image Slideshow](widgets/image-slideshow.md)
- [RTP Stats Bar](widgets/rtp-stats.md)
- [Background](widgets/background.md)
- [Raid Shoutout](widgets/raid-shoutout.md)
- [Spotify Now Playing](widgets/spotify-now-playing.md)
- [Slot Requests](widgets/slot-requests.md)
- [BH Stats](widgets/bh-stats.md)
- [Bonus Buys](widgets/bonus-buys.md)
- [Bets](widgets/bets.md)
- [Container](widgets/container.md)

## Primary recommendation

Do not make the appearance editor expose universal controls for every widget. The widgets are not structurally uniform. The next implementation phase should introduce a capability registry where each widget declares the elements, tokens, ranges, state variants, and unsafe controls it actually supports.
