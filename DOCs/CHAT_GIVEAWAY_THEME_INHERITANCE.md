# Embedded giveaway theme inheritance — 17 October 2026

## Cause and correction

The embedded resolver previously copied the standalone giveaway's entire appearance, including `colourTheme`, while the actual markup remained under the chat's theme scope. This combined theme A's CSS with theme B's configured colours, effect settings and winner-layout choice. A saved custom appearance could retain the previous theme after chat switched themes. Generic winner cards also used fixed blue/ice surfaces independently of the resolved palette.

For a chat with a registered colour theme, the shared resolver now derives the giveaway palette from that chat. Inherited legacy and V2 colour overrides, including state overrides, are removed from the derived appearance before applying the chat palette. Layout, dimensions and typography are retained. Stored configurations and the standalone giveaway are not mutated. A chat without a registered theme retains the existing standalone-appearance fallback.

Explicit custom appearance stays available. Matching-theme custom colours and geometry are preserved. A custom snapshot carrying a different theme is rebased to the current chat theme at render time; saved values are preserved. Theme/effect selection belongs to the chat, so the redundant nested theme/effect/environment selectors are hidden for themed chats. Custom colour, geometry and typography controls remain available. Live participants, winner, keyword, integration settings and draw timing continue to come from the giveaway source.

The embedded wrapper exposes its resolved theme and palette variables. Generic winner surfaces, labels, avatar and prize follow those values. Ice decoration is confined to Arctic embedded winners; specialized Candy, Arctic and Orbital materials and Old Rome typography remain scoped to their own themes. The chat memoizes derived giveaway configuration to avoid repeating theme reconciliation on unrelated message updates.

## Files

Created:

- `scripts/test-embedded-giveaway-themes.mjs`
- `DOCs/CHAT_GIVEAWAY_THEME_INHERITANCE.md`

Modified:

- `src/components/OverlayCenter/widgets/giveaway/embeddedGiveawayConfig.js`
- `src/components/OverlayCenter/widgets/giveaway/EmbeddedGiveaway.jsx`
- `src/components/OverlayCenter/widgets/giveaway/GiveawayWinnerCard.css`
- `src/components/OverlayCenter/widgets/chat/ChatWidget.jsx`
- `src/components/OverlayCenter/editor/BetterWidgetPackages.jsx`
- `scripts/test-chat-integrations.mjs`
- `package.json`
- `api/_lib/release-notes.js`

The integration test now marks its isolated renderer entitlement as verified. Without this explicit fixture input, external authentication unavailable to the fixture could block rendering. Production access checks are unchanged.

No dependencies, database migrations, environment variables or production account writes.

## Verification

- `npm.cmd run test:embedded-giveaway-themes`: passed, 256 source/chat theme pairs covering all 16 registered palettes. Includes source immutability, legacy/V2 paint overrides, stale custom snapshots, explicit custom colours, retained geometry, live-data ownership and effect ownership.
- The same suite passed 144 real renderer cases: 16 themes × three states (open/drawing/winner) × editor/OBS-runtime/sample modes. Checks actual widget CSS variables, generic winner computed text colours, two differently themed chat instances sharing one source, independent standalone giveaway appearance, serialized layout reload and inherited control visibility.
- `node scripts/test-chat-integrations.mjs`: passed across 14 chat styles, including drawing/winner layout, custom appearance controls, live entry collection, preview isolation, chat-only live source, moderator commands and legacy/published token paths.
- `npm.cmd run build`: passed, with existing custom-font resolution and large-chunk warnings.
- `npm.cmd run test:updates`, `npm.cmd run test:preview-data-parity`, `npm.cmd run validate:widgets`: passed.
- `npm.cmd run test:candy`: passed across 12 widget types, editor/OBS runtimes, three resolutions, compact chat winner layout and independent decoration controls.
- `npm.cmd run test:widget-colour-themes`: passed across 208 widget/palette combinations, controls, reload and runtime parity. The first attempt used another dev server with stale optimized dependencies; rerunning against a fresh local Vite instance passed.
- `npm.cmd run test:widget-control-categories` and `git diff --check`: passed.

Screenshots captured in `.codex-dev/giveaway-theme-verification/`; Candy open and Old Rome winner comparisons were inspected. The same frame shows the first chat following its own theme, a second chat retaining Arctic, and the standalone giveaway retaining a different theme.

OBS verification uses the real shared renderer's OBS runtime in Chromium. Native OBS Studio, real third-party events and an authenticated production save/publish are not exercised. Persistence uses an isolated serialized configuration. Refresh the editor and OBS Browser Source after deployment; no overlay reset is required.
