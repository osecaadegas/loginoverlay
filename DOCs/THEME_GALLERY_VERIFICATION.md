# Illustrated theme gallery

The existing Colour Theme panel now lists image-backed themes first under **Premium**, followed by **Colour palettes**. Membership is derived from the shared palette's `thumbnail` metadata, so future image-backed choices automatically join the first group. The existing asset-access filter remains authoritative; this is gallery organisation, not a change to subscription permissions.

Arctic and Old Rome use 480×270 JPEG previews of existing, unbranded project scenery. The two previews total approximately 87 KB. Candy and Orbital retain their existing artwork. Theme identifiers, palette registration order, saved configurations and live rendering are unchanged by gallery organisation.

## Files

Created:

- `public/theme-effects/ice/preview.jpg`
- `public/theme-effects/greek-premium/background/preview.jpg`
- `scripts/test-theme-gallery.mjs`
- This report.

Modified:

- `src/components/OverlayCenter/widgets/shared/colourThemePalettes.js`: preview metadata and shared grouping function.
- `src/components/OverlayCenter/editor/BetterWidgetPackages.jsx`: grouped selector retaining access checks and the existing selection handler.
- `src/components/OverlayCenter/editor/BetterWidgetPackages.css`: group headings and illustrated card treatment.
- `package.json`: `test:theme-gallery` command.
- `api/_lib/release-notes.js`: factual release entry, including the previously prepared Volcanic changes shipped together.

No database migrations or permission changes.

## Verification

`npm.cmd run test:theme-gallery` uses the actual appearance controls in Chromium. It verifies automatic grouping, no duplicates or missing themes, filtered/empty access results, all four image decodes, theme selection and selected states, reload of saved configuration, and 320/240px sidebar layouts. Screenshots are saved under `.codex-dev/theme-gallery/`.

Additional checks: the existing widget colour-theme browser suite, `test:widget-control-categories`, `test:updates`, `test:overlay-access`, `validate:widgets`, the Volcanic regression suite for the two pending overlay commits, and the production build. Existing custom-font resolution and large-chunk build warnings remain. Native OBS Studio and authenticated production save/publish are not directly exercised by these isolated fixtures.
