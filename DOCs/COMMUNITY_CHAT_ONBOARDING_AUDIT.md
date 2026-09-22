# Community chat and newcomer setup audit

Date: 2026-09-22

## Investigation and implementation

The existing repository is the React/Vite application at `osecaadegas.pt`. Chat flows through the widget registry, Better Widget configuration, scoped appearance registry, and the shared `ChatWidget` renderer used by the editor and OBS. The new `community_chat` variant uses those paths and the existing Twitch/Kick/YouTube connections, emote processing, filtering, message limits, auto-fade and embedded shoutout behavior.

Community presents inline colored usernames, platform icons, rounded counter pills and gradient event cards. Its schema declares the root, header, channel name, counters, message list, ordinary/highlighted rows, usernames, message text, event avatars, role badges and empty state. Counters and text use distinct appearance targets; message typography does not change counter typography. Role movement controls that this style does not render are hidden for this style only. Existing styles retain those controls.

The diamond counter sums Bits in the recent messages retained by this widget, using Twitch IRC `bits` metadata. It is not a lifetime/channel total. Viewer count remains the existing manually configured value, now explicitly labeled in the controls. The reference image's example numbers are not production defaults.

The onboarding audit found:

- Setup automatically started an 18-step tour. Its `/editor` step unmounted the tour; a persisted `in_progress` flag could start it again at step zero when returning.
- Empty accounts were redirected to Integrations whenever they tried other Overlay Center pages.
- Save and exit did not exit or handle save failure.
- Setup awaited a debounced widget-save function that resolved before the database write.
- Draft synchronization could replace local edits during unrelated widget/realtime updates.
- An unsuccessful readiness request could leave Continue enabled because an empty check list looked ready. Edited settings could also use stale check results.

The default setup now follows the legacy step IDs `0 -> 5 -> 6`: choose tools, connect services, review. Optional style/branding steps keep the existing seven-step flow. Existing saved detailed setups keep their current step and values. Completion opens Preview/OBS; the optional five-step tour starts only from an explicit tutorial action and stays within Overlay Center. Tools remain directly accessible throughout.

Setup serializes its own state writes, cancels pending autosaves before explicit saves, preserves its local draft, and uses an immediate awaited widget save when applying service configuration. Optional service sections start collapsed; blocking checks open the section needing attention. Continue requires a successful check for the current settings. Settings changes recheck after a short debounce; aborted responses cannot replace newer results.

## File inventory

Created:

- `src/components/OverlayCenter/widgets/chat/CommunityChatParts.jsx`
- `shared/overlayOnboarding.js`
- `scripts/test-onboarding.mjs`
- `DOCs/COMMUNITY_CHAT_ONBOARDING_AUDIT.md`

Modified:

- `src/components/OverlayCenter/widgets/chat/chatStyles.js`
- `src/components/OverlayCenter/widgets/chat/ChatWidget.jsx`
- `src/components/OverlayCenter/widgets/chat/ChatConfig.jsx`
- `src/components/OverlayCenter/widgets/builtinWidgets.js`
- `src/components/OverlayCenter/editor/BetterWidgetPackages.jsx`
- `src/components/OverlayCenter/appearance/v2/widgetAppearanceRegistry.js`
- `src/hooks/useTwitchChat.js`
- `src/components/OverlayCenter/OverlayControlCenter.jsx`
- `src/components/OverlayCenter/GuidedTutorial.jsx`
- `src/components/OverlayCenter/setup/ConnectServicesStep.jsx`
- `src/components/OverlayCenter/OverlayCenter.css`
- `src/hooks/useOverlay.js`
- `scripts/test-broadcast-chat.mjs`
- `package.json`

No migrations, dependencies, secrets, route permissions, authentication guards, RLS policies or deployment settings changed. The immediate-save option uses the existing authenticated, overlay-scoped `upsertWidget` service; ordinary callers retain debounced saves. The readiness endpoint still verifies the bearer token server-side.

## Verification

Passed:

- `npm.cmd run build` (existing large-chunk warning).
- `npm.cmd run test:broadcast-chat`: Broadcast regressions plus Community editor/OBS render paths, six frame sizes, Simple/Advanced/legacy style selection, serialized configuration reload, style and instance isolation, independent counter background and message typography, IRC parsing, Bits, emotes, role badges, raids, message limits, filtering and auto-fade. The new style was also visually inspected from a browser screenshot.
- `npm.cmd run test:onboarding`: three-step completion, legacy seven-step resume, Back/Next without duplicate tools, save-and-exit success/failure, failed readiness gating, collapsed optional sections, five-step tour completion, dismissal with blocked browser storage, and explicit-only tour activation.
- `npm.cmd run test:service-setup`: 24 service normalization, validation, OAuth return, fallback and secret-handling checks.
- `npm.cmd run validate:widgets`.
- `npm.cmd run test:global-navigation`.
- `npm.cmd run test:widget-control-categories`.
- `npm.cmd run test:page-cache`: focus, token refresh, drafts, profile updates, account isolation, permission revocation and bootstrap race.
- `npm.cmd run test:editor-builds`: owner/build isolation, save, publish, reset/revert, URL rotation, and 30 request-layout cases. Existing SSR `useLayoutEffect` warnings remain.
- `npm.cmd run test:background-editor`.
- `git diff --check` and explicit-path staged diff review before publishing.

Known pre-existing failure:

`npm.cmd run test:appearance-editor` stops at `scripts/test-appearance-editor.mjs:925`, an assertion that contained Bonus Hunt lists use a particular height expression. The exact predicate fails on both `git show HEAD:src/components/OverlayCenter/widgets/shared/betterWidgetStyles.jsx` and the working copy; that file is unchanged. This broader suite is therefore not reported as passing. No check was disabled or weakened.

The instruction-listed scripts `test:appearance`, `test:appearance-v2`, and `test:widget-pilot` are not present in the current package manifest. There is no standalone lint/typecheck script.

## Verification limits

Browser regression tests use isolated test fixtures for account/service responses and locally delivered IRC messages. They exercise production components but do not certify live OAuth provider availability, a production database round trip, a live broadcast, or the deployed site. Saved config reload and editor/OBS parity were checked locally. No manual database configuration is needed.

The unrelated pre-existing deletion of `public/providers/spage_gaming.png` and local `.codex-dev` artifacts are excluded from this commit.
