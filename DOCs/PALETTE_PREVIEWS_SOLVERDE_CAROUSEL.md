# Palette previews and Solverde carousel

Every standard colour palette now displays a lightweight miniature overlay using its existing background, surfaces, border and accent tokens. The same gallery component serves every supported widget. Premium illustrations, grouping, selection, saved settings and access filtering remain unchanged. The preview is inline SVG, with no images to download and no animation loop.

Solverde's horizontal hunt dock removes arrow controls. Longer hunts automatically scroll one card at a time, with an adjustable interval. This changes only the viewport: the queue order and actual current bonus remain authoritative. Collecting no longer rotates the highlighted bonus independently. The viewport follows real active-bonus changes; motion pauses for hidden documents, a disabled Automatic card carousel setting and reduced-motion preferences, with observers/timers cleaned up on unmount or configuration changes.

Opened cards use grey artwork and muted surfaces; the actual card retains full colour, a stronger emerald outline and a local highlight. Provider logos use the existing provider image resolver and original artwork, with provider-name fallback on missing or broken images. A tiny, cached, one-time alpha/luminance sample chooses a readable light/dark logo chip; it does not recolour the logo or create a persistent effects canvas.

The Background widget adds a static, smooth emerald atmosphere with an independent **Smooth emerald background** switch. In the reference composition, its gameplay region remains transparent when idle fill is off. Decorations and custom surface overrides remain separate. The dock also receives a restrained local emerald gradient.

## Controls

- Bonus Hunt → Solverde layout: **Automatic card carousel**, **Provider logos**, **Carousel interval (seconds)**.
- Background → Solverde layout: **Smooth emerald background**.
- Existing card-count, font, theme and appearance controls remain available.

Save and publish settings, then refresh the editor and OBS Browser Source. No database migrations, dependencies or installer update are required.

## Files

Created: `src/components/OverlayCenter/editor/PalettePreview.jsx`; this report.

Modified: `src/components/OverlayCenter/editor/BetterWidgetPackages.jsx` and `.css`; `src/components/OverlayCenter/widgets/shared/betterWidgetStyles.jsx`; `src/effects/ThemeEffects/solverde/SolverdeTheme.jsx`, `.css` and `solverdeTheme.js`; `scripts/test-theme-gallery.mjs`; `scripts/test-solverde-theme.mjs`; `api/_lib/release-notes.js`.

## Verification

- Theme gallery: previews for all standard palettes, unchanged premium images/access/grouping, selection/reload and 320/240px panels.
- Solverde: no arrows, automatic scrolling of a 30-card hunt, unchanged current-bonus identity, reduced-motion pause, live active-card following, provider image loading, opened greyscale, compact card/prediction geometry, controls/reload, theme cleanup and actual published-route gameplay transparency.
- Widget control categories, widget registry validation, release-note checks, all 252 widget/palette combinations and production build.
- Generated gallery and 1920×1080 composition screenshots were visually inspected in `.codex-dev/theme-gallery/` and `.codex-dev/solverde-verification/`.

The published React browser-source renderer was tested with isolated publication/database fixtures. Native OBS Studio and live streaming performance were not directly measured. Existing optional-font and large-bundle build warnings remain.
