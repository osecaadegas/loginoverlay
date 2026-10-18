# Solverde, chat and request visual audit

## Delivered behaviour
- Solverde hunt carousel advances right to left. A short, inaccessible duplicate tail permits a seamless instant reset instead of a backwards tween. The real current bonus and queue order do not change.
- Each card includes bet, actual payout and multiplier, preserving opened-zero payouts and an unavailable dash for pending bonuses.
- Super and Extreme opened/total counters and card status labels use the existing canonical bonusTier classification.
- Provider logos have no chip/container/background, use their original artwork and larger available dimensions, and fall back to provider text if unavailable. Removed logo luminance canvas processing.
- Rounded SVG alpha masks on both scenery layers match the gameplay frame. Published gameplay remains transparent; corner scenery remains visible.
- All 14 chat presentations are checked under Solverde, Volcanic, Candy, Orbital, Arctic and Old Rome. Compact surfaces and gaps, themed headers, readable message text and separate highlight treatment retain the original layouts, usernames, events and advanced element overrides.
- Embedded shoutouts inherit chat colours. Real media playback stays available; a no-media shoutout becomes a compact avatar/category/channel card instead of an empty video panel.
- Active giveaway notices are compact and themed, winners use the real chat bay, and roulette canvases fit without relying on width-only scaling. Existing visibility/status/winner/entry behaviour and shoutout slot replacement remain intact.
- Image Cards and standalone List auto-scroll with no visible scrollbar. Queue motion pauses on hover/focus, when the page is hidden and under reduced motion. List titles use a measured marquee only when overflowing and visible. Legacy embedded List keeps its existing layout/action handling, auto-scroll and gains the same title marquee and inherited label colours.
- No new polling, realtime subscriptions, video transport or per-widget GPU renderer. Scroll timers/observers clean up when components change or unmount.

## Files created
- src/components/OverlayCenter/widgets/shared/useForwardCarousel.js
- src/components/OverlayCenter/widgets/shared/OverflowMarquee.jsx
- src/components/OverlayCenter/widgets/chat/premiumChatPresentation.js
- src/components/OverlayCenter/widgets/chat/PremiumChat.css
- DOCs/SOLVERDE_CHAT_AND_REQUEST_VISUAL_AUDIT.md

## Files modified
- api/_lib/release-notes.js
- scripts/test-embedded-giveaway-themes.mjs
- scripts/test-request-image-cards.mjs
- scripts/test-solverde-theme.mjs
- src/components/OverlayCenter/OverlayRenderer.css
- src/components/OverlayCenter/editor/solverdeComposition.js
- src/components/OverlayCenter/editor/widgetColourThemes.js
- src/components/OverlayCenter/widgets/chat/ChatWidget.jsx
- src/components/OverlayCenter/widgets/chat/CommunityChatParts.jsx
- src/components/OverlayCenter/widgets/giveaway/EmbeddedGiveaway.jsx
- src/components/OverlayCenter/widgets/raid-shoutout/RaidShoutoutWidget.jsx
- src/components/OverlayCenter/widgets/shared/betterWidgetStyles.jsx
- src/components/OverlayCenter/widgets/slot-requests/ImageCards.css
- src/components/OverlayCenter/widgets/slot-requests/ImageCards.jsx
- src/effects/ThemeEffects/solverde/SolverdeTheme.css
- src/effects/ThemeEffects/solverde/SolverdeTheme.jsx
- src/effects/ThemeEffects/solverde/solverdeTheme.js

## Verification
- Production build; existing optional-font and large-chunk warnings remain.
- validate:widgets and test:widget-control-categories.
- test:updates: protected catalogue, 15 authorization cases and caching checks.
- test:widget-colour-themes: 252 widget/palette combinations.
- test:request-image-cards: automatic queue movement, hidden scrollbar, title marquee, reduced motion, 18 List palettes, legacy embedded List, queue changes, saved controls, scaling and actual published route.
- test:solverde: live stats, counters, larger logos, 200/220/246px docks, independent current state, forward-only loop-boundary calls, reduced motion, saved controls, 252 chat presentations (14 layouts × 6 themes × 3 embed states), theme cleanup and actual published overlay transparency. Screenshot alpha verifies clear gameplay and rounded corner scenery.
- test:embedded-giveaway-themes: 324 theme pairs, 162 rendered states, independent instances and reload.
- test:candy and test:volcanic pass their widget/theme/published-output checks.
- test:orbital-theme does not complete: it times out waiting for the GPU effects debug layer at scripts/test-orbital-theme.mjs:159. That engine was not changed; Orbital chat/giveaway states are covered by the new screenshot matrix and shared palette suite. Native GPU effects performance remains unverified here.

## Visual evidence
Generated fixture screenshots are under .codex-dev/solverde-verification/:
- dock-six-predictions-246.png (also 200 and 220)
- chat-gallery-{theme}-{open,winner,shoutout}.png
- published-obs-route.png
They were reviewed and refined: removed the black no-media shoutout area; restored Terminal contrast on pale themes; removed legacy forced purple Cards backgrounds/borders; prevented compact message rows from shrinking; fixed provider scale and rounded scenery corners.

## Release/use
The premium Updates catalogue documents this release. Refresh the editor, save and publish configuration changes, then refresh the OBS Browser Source. Custom layouts and live data are preserved; no installer, dependencies or database migrations are required. Native OBS was not operated directly: published browser-source output was tested in Chromium with controlled fixtures.
