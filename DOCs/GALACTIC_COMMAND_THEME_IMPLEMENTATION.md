# Galactic Command implementation and verification

Choose **Galactic Command** in Colour Theme to change materials without moving widgets. Apply **Galactic Command reference layout** separately for the undoable 1920 × 1080 arrangement. Save/publish and refresh OBS Browser Source.

The preset reuses existing instances and settings, creates missing role instances, preserves locked foreground widgets, and hides unused unlocked widgets without deleting their data. Its 13 editable instances use existing Background, Navbar, Bonus Hunt, Current Slot, Slot Window, Slideshow, Giveaway and Chat types. Four Current Slot presentations and three hunt terminals view the same live sources. The information rail is a Current Slot presentation, ensuring consistent metadata and records across the game panels.

On Slot Window, **Transparent gameplay opening** defaults on for OBS sources below the overlay. Turn it off to reveal the separate orbital scene. The mask follows the visible gameplay frames when moved/resized. **Orbital scene background** controls scene visibility. Existing ScreenSplit URLs and capture options remain available. Decorations do not intercept input.

## Data and appearance

- The existing BonusHuntWidget calculation was extracted unchanged into `src/utils/bonusHuntStats.js`. Session terminals and masthead share it. Balance is stop balance plus opened returns; profit is balance minus start. Missing configured amounts use dashes and zero is valid.
- SUPER uses the existing super/supreme category; the other counter is accurately named EXTREME. There is no separate hidden-bonus category in this hunt model.
- Playing Now follows the canonical active bonus and its scoped best result. Session summary selects the existing best opened bonus by multiplier. View All opens the real hunt list within the summary panel.
- Current Slot keeps explicit game/variant metadata ahead of catalogue defaults. Scanner, max-win showcase, rail and game-info views share in-flight catalogue lookups and one scoped personal-best transport, released after the last view unmounts. Other callers retain their existing lifecycle. Best payout is white and best multiplier gold.
- Latest Win uses the existing giveaway winner resolver, participant avatar and prize. New winner reveals record `winnerSelectedAt`. Old records without a timestamp omit their age. No slot result is substituted for a giveaway winner.
- Giveaway entry, roulette and winner states remain inside chat above messages; hidden giveaways release the space. Shoutout image/video/embed playback retains its media bay and missing-clip fallback.
- Shared transparent nine-slice metal frames preserve corner details during resize. Scene scenery is separate. Borders, lighting, glow, panel/scene opacity, colours, fonts, artwork and supported statistics remain configurable per instance, with strict V2 element schemas for new presentations.
- Default appearance is static. Reduced motion disables descendant transitions/animations. No new canvas, service, dependency, environment variable or database migration was added.

## Verification

Passed:

- Production build, with existing custom-font reference and bundle-size warnings.
- `test:galactic-command`: screenshot comparison; theme/preset separation and idempotence; JSON save/reload; strict schemas; repeated record consistency; shared refresh and cleanup; empty/completed hunts; category counters and bonus advancement; long/missing/zero metadata; giveaway states and winner age; shoutout clip and empty media; slideshow image/video; saved appearance controls; moved frame alpha transparency; disabled background; actual BetterObsOverlay publication route; reduced motion and theme cleanup.
- `test:widget-colour-themes`: 294 combinations (14 types × 21 palettes), editor/OBS rendering, overrides and reload.
- `test:current-game` on a fresh Vite server: real picker across all themes, records and retry/zero history, overrides, reload and seven widths. Its old fixture now responds to the asset-access RPC rather than aborting it; production gates are unchanged.
- `test:slot-personal-best`: owner/token isolation, shared ledger, averages, idempotency and read-only fallback.
- `test:starter-studio`, `test:street-art`, `test:solverde` and `test:camera-obs-route` (fresh server; relay rendering without a CEF camera prompt).
- `validate:widgets`, `test:widget-control-categories`, `test:updates`, `git diff --check`.
- Read-only anonymous query to the existing public slots catalogue using Current Slot's metadata selection succeeded. The visual run used existing catalogue cover URLs.

Known check limitation: `test:appearance-editor` still fails its pre-existing Landing Page source assertion around line 238, outside the changed renderer. No Landing Page code or test was disabled. New schemas and controls are verified directly by the Galactic suite.

Browser checks use controlled hunt/chat/result records and actual components, local data adapter and OBS publication route. They do not prove an external Twitch stream or real user publication was exercised. Session and record examples exist only in test fixtures. Actual OBS capture depends on the streamer's source setup.

Manual setup: save/publish the selected layout, refresh OBS and place gameplay underneath when using transparent mode. Streamer identity, partner media and chat credentials retain their existing settings.

## Generated assets

Built-in imagegen produced the scenery and transparent metal frame. They were format-optimized into the repository with frame alpha retained:

- `public/theme-effects/galactic-command/earth-command.webp` — 1920 × 1080 scenery.
- `public/theme-effects/galactic-command/preview.webp` — gallery thumbnail.
- `public/theme-effects/galactic-command/mechanical-frame.webp` — 1254 × 1254 RGBA, shared nine-slice frame.

Scene prompt: Use case: stylized-concept. Create a high quality cinematic orbital Earth background asset for a spacecraft broadcast overlay, landscape 16:9. No UI, no text, no frame, no spacecraft, no logos. Curved Earth horizon fills lower half, richly detailed blue clouds, dark land and delicate warm city lights, brilliant thin electric blue atmosphere rim and restrained white sunrise at the right horizon. Deep navy star field in upper half with tiny sharp stars, soft blue nebula diagonally upper right, a medium shadowed blue planet at right and one tiny moon at left. Consistent cool blue light, premium realistic science fiction matte painting, rich contrast without excessive bloom. This is only a background scenery layer behind independently rendered widgets.

Frame prompt: Use case: product-mockup. A premium realistic sci-fi spacecraft command-deck frame asset, square front elevation, perfectly flat orthographic view with no perspective. One empty square frame ONLY, transparent hollow center and transparent exterior. Frame width about 12 percent of square, strongly articulated angular 45-degree chamfered corners, dimensional layered black titanium metal plates, bevelled dark navy machined steel, tiny bolts, inset cable channels. Restrained thin electric blue and cyan illuminated inner edges and a few tiny blue indicator lights. Most of frame must remain dark metal, not solid blue. Four corners detailed mechanical pieces, straight rails between corners fairly simple so they can be tiled or stretched as a nine-slice UI frame. Symmetrical geometry, consistent cool blue lighting. No text, no numerals, no widgets, no scenery, no background. High quality convincing metal material and fine industrial detailing matching a polished premium spacecraft broadcast interface. Center must be completely empty and transparent.

## Files

Created:

- src/effects/ThemeEffects/galactic-command/GalacticCommandTheme.jsx
- src/effects/ThemeEffects/galactic-command/GalacticCommandTheme.css
- src/effects/ThemeEffects/galactic-command/galacticCommandTheme.js
- src/components/OverlayCenter/editor/galacticCommandComposition.js
- src/utils/bonusHuntStats.js
- scripts/test-galactic-command.mjs
- public/theme-effects/galactic-command/earth-command.webp
- public/theme-effects/galactic-command/mechanical-frame.webp
- public/theme-effects/galactic-command/preview.webp
- DOCs/GALACTIC_COMMAND_THEME_IMPLEMENTATION.md
- DOCs/verification/galactic-command-reference.png
- DOCs/verification/galactic-command-obs.png

Modified:

- api/_lib/release-notes.js
- package.json
- scripts/test-current-game-browser.mjs
- scripts/test-widget-colour-themes.mjs
- src/components/OverlayCenter/appearance/v2/widgetAppearanceRegistry.js
- src/components/OverlayCenter/editor/BetterWidgetPackages.jsx
- src/components/OverlayCenter/editor/WidgetEditorPage.jsx
- src/components/OverlayCenter/editor/betterWidgetRegistry.jsx
- src/components/OverlayCenter/editor/widgetColourThemes.js
- src/components/OverlayCenter/widgets/bonus-hunt/BonusHuntWidget.jsx
- src/components/OverlayCenter/widgets/chat/ChatWidget.jsx
- src/components/OverlayCenter/widgets/chat/premiumChatPresentation.js
- src/components/OverlayCenter/widgets/current-slot/CurrentSlotAppearanceControls.jsx
- src/components/OverlayCenter/widgets/current-slot/CurrentSlotWidget.jsx
- src/components/OverlayCenter/widgets/giveaway/EmbeddedGiveaway.jsx
- src/components/OverlayCenter/widgets/giveaway/GiveawayConfig.jsx
- src/components/OverlayCenter/widgets/navbar/NavbarWidget.jsx
- src/components/OverlayCenter/widgets/raid-shoutout/RaidShoutoutWidget.jsx
- src/components/OverlayCenter/widgets/shared/betterWidgetStyles.jsx
- src/components/OverlayCenter/widgets/shared/colourThemePalettes.js
- src/components/OverlayCenter/widgets/slot-window/SlotWindowWidget.jsx
- src/hooks/useSlotPersonalBest.js

Migrations: none.
