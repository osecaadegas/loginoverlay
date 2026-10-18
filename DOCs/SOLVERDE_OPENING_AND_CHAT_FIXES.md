# Solverde opening and chat layout fixes

The RTP renderer now uses the whole saved Solverde widget frame in preview and OBS output. Existing appearance overrides remain authoritative.

The hunt dock receives the canonical session state. Opening disables timed rotation and centres the current bonus, with edge spacers allowing the first and last bonuses to stay centred. Hunt and Ended retain the existing forward carousel and reduced-motion support. Default headings follow the session state; all three headings remain configurable.

Enabled requests replace the entire left summary column. Disabling requests restores the heading, opened count, progress ring and category counters. List, 3D and Image Cards reuse the existing request renderer and queue. Embedded Image Cards have compact defaults, and their element schema supports per-instance appearance editing.

Solverde shoutouts retain their configured height and clip bay. Existing video playback is unchanged; absent clips show an explicit fallback inside that space rather than collapsing to a profile strip.

## Files

- Shared renderers: `betterWidgetStyles.jsx`, `useForwardCarousel.js`, `ChatWidget.jsx`, `RaidShoutoutWidget.jsx`, `imageCardsModel.js`.
- Solverde: `SolverdeTheme.jsx`, `SolverdeTheme.css`, `solverdeTheme.js`.
- Editor: `BetterWidgetPackages.jsx`.
- Regression coverage: `scripts/test-solverde-theme.mjs`.
- Release notes: `api/_lib/release-notes.js`.

## Verification

Passed production build, widget validation, editor control-category checks, release-note checks, Solverde browser suite, Street Art browser regression and Image Cards browser regression. Browser checks cover opening at queue boundaries, locked position over the timer interval, Hunt/Ended rotation, all three request presentations, no hidden summary behind requests, RTP width, actual MP4 playback, absent-media fallback, persistence and published overlay rendering.

Screenshots are generated under `.codex-dev/solverde-verification/`. They use controlled test fixtures; production values still come from existing live data. Native OBS was not launched. No database migrations or manual configuration are required; refresh the editor/browser source, then save and publish changed widget settings as usual.

Existing build warnings concern unavailable custom font files and large bundles; the build completes successfully.
