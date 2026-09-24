# Streamers Center Theme Effects Engine

## Repository audit

The implementation extends the existing application in place.

| Area | Existing implementation |
| --- | --- |
| React | React 18.2 with React DOM 18.2 |
| Build | Vite 5, JavaScript/JSX, Tailwind and shared CSS |
| Theme architecture | Shared colour palettes in `src/components/OverlayCenter/widgets/shared/colourThemePalettes.js`, widget mappings in `editor/widgetColourThemes.js`, CSS variables in `OverlayRenderer.css`, and Appearance V2 schemas/resolvers under `appearance/v2` |
| Theme configuration | Per-widget `config`, including `colourTheme` and legacy widget-specific keys; Appearance V2 remains scoped by widget, style, element and property |
| Editor route | `/overlay-center/editor` renders `editor/WidgetEditorPage.jsx` |
| OBS routes | `/obs/overlay/:publicOverlayId` and `/obs/overlay/:publicOverlayId/widget/:instanceId` render `editor/BetterObsOverlay.jsx` |
| Persistence | Draft and published layouts are JSONB in the existing Better Overlay tables. Theme effects are stored under each widget's `config.themeEffects`; no new table is required. |
| OBS updates | `src/services/betterOverlayService.js` loads the published layout and subscribes to the existing Supabase realtime publication. The same widget config reaches both full and standalone OBS routes. |
| Existing animation | CSS animations and focused canvas effects such as tournament shatter and chroma-key smoke; `canvas-confetti` is installed. PixiJS, GSAP and Three.js were not previously installed. |
| Rendering model | A full overlay contains multiple widget instances. The standalone OBS route renders one selected instance. |
| Performance-sensitive paths | OBS rendering, editor drag/resize, chat/event subscriptions, background video/canvas processing and widget animations. |

The effects engine is opt-in for `arctic` (Ice), `gladiator`, and `old_rome` (Greek/Stoic). Other themes remain CSS-only.

## Architecture

`ThemeEffectsLayer` is shared by the editor preview and OBS output. It creates one transparent Pixi renderer for the full canvas. A standalone widget route creates one smaller renderer. React widgets, text, inputs and controls remain DOM elements.

The Pixi stage exposes stable named containers:

- `backgroundFX`
- `navbarFX`
- `bonusHuntFX`
- `bingoFX`
- `betsFX`
- `chatFX`
- `mediaFX`
- `foregroundFX`
- `globalParticles`

Widget geometry comes from the existing layout state, so drag and resize updates do not poll the DOM on every frame. Widget DOM roots also expose effect target data attributes for event observation. Completion/open state changes trigger a short GSAP pulse and particle burst.

CSS supplies layout and surface styling. Compact WebP/PNG textures enrich the DOM surfaces and Pixi renders atmospheric layers. The transparent effects canvas uses `pointer-events: none` and never replaces widget interaction.

## Configuration and compatibility

Each compatible widget may persist:

```json
{
  "themeEffects": {
    "enabled": true,
    "quality": "balanced",
    "particleIntensity": 0.5,
    "glowIntensity": 0.5,
    "animationSpeed": 1,
    "ice": {},
    "gladiator": {},
    "greek": {}
  }
}
```

`normalizeThemeEffectsConfig` supplies defaults for old layouts with no effects data, clamps saved numeric values, and preserves the established theme keys. The existing draft/save/publish/realtime flow carries the additional JSON without a migration or parallel storage system.

The Simple Mode theme section exposes only controls supported by these three themes. The same normalized values drive editor preview, full OBS output, and standalone widget output.

## Performance and lifecycle

- Pixi and GSAP are dynamically imported only when at least one compatible effect target is present.
- Quality presets cap FPS, DPR, particles and optional effects: Low (30 FPS/DPR 1), Balanced (60 FPS/DPR 1.25), Ultra (60 FPS/DPR 1.5).
- Texture assets are fetched only for the active theme and cached by Pixi Assets.
- Particles and sprites are allocated when targets change and updated in place by one ticker.
- Geometry-only updates resize existing target nodes without creating another renderer.
- The ticker pauses when the document is hidden.
- Theme changes fade over 200–340 ms and rebuild only the effect nodes.
- Cleanup removes ticker handlers, GSAP tweens, Pixi containers and renderer resources.
- Reduced-motion CSS suppresses the effect layer's transition.
- Pixi initialization or texture loading failures leave the original CSS theme and all DOM functionality intact.

Development builds support `?fxDebug=1` on an editor or OBS URL to show FPS, particle count, renderer dimensions, DPR, target count and quality.

## Assets

Theme assets live under `public/theme-effects/{ice,gladiator,greek}`. They use small repeating WebP surfaces and transparent PNG particles. They are deliberately sized for UI panels rather than 4K scene backgrounds.

## Future 3D extension

Three.js is not installed or initialized. A future true 3D module can register beside `ThemeEffectsLayer` for assets such as a helmet, statue or crystal. Atmospheric effects remain in the single Pixi renderer.
