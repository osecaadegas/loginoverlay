# Current Appearance Editor Audit

## Main files

| Area | File |
| --- | --- |
| Editor UI | `src/components/OverlayCenter/appearance/AppearanceCenter.jsx` |
| Editor CSS | `src/components/OverlayCenter/appearance/AppearanceCenter.css` |
| Editor schema | `src/components/OverlayCenter/appearance/editorSchema.js` |
| Appearance model | `src/components/OverlayCenter/appearance/appearanceModel.js` |
| Reusable controls | `src/components/OverlayCenter/appearance/propertyControls.jsx` |
| Preview | `src/components/OverlayCenter/OverlayPreview.jsx` |
| OBS renderer | `src/components/OverlayCenter/OverlayRenderer.jsx` |

## Selection and layers

The editor uses `widgetRegistry` and appearance schema data to select widgets and expose layers. Direct preview selection relies on the rendered widget DOM containing `data-widget-element` attributes. In the current widget set, that is only broadly true for:

- `BonusHuntWidgetV12.jsx`
- `BetsWidget.jsx`

Most other widgets render no element markers. For those widgets, element selection is either widget-level only or disconnected from the real DOM.

## Persistence model

| State | Source | Notes |
| --- | --- | --- |
| Legacy theme | `overlay_themes` | Still consumed by `buildThemeVars`. |
| Published appearance | `overlay_state.state.overlayAppearance.published` | Intended OBS source. |
| Draft appearance | `overlay_state.state.overlayAppearance.draft` | Intended editor/preview source. |
| Preview-only draft | BroadcastChannel to `/overlay/:token?preview=1` | Not persisted until saved. |
| Widget instance config | `overlay_widgets.config` | Still contains many visual values and legacy per-widget presets. |

## Working status table

| Setting or control area | Stored location | Preview consumer | OBS consumer | Status | Problems |
| --- | --- | --- | --- | --- | --- |
| Widget selection | Editor state | `OverlayPreview` | none | Working | Does not imply selected widget supports element controls. |
| Widget position and size | `overlay_widgets` and appearance draft overrides | `PreviewSlot` | `WidgetSlot` | Partially working | Scale/width/height are mixed between config, preview frame, and DB row. |
| Global theme colors | `overlay_themes`, appearance state | `buildThemeVars` | `buildThemeVars` | Working | Legacy and modern variables overlap. |
| Widget-level tokens | `overlay_state` and `overlay_widgets.config` | `buildWidgetAppearanceVars` | `buildWidgetAppearanceVars` | Partially working | Widgets must opt into variables or helper functions; many hardcode inline styles. |
| Element-level tokens | Appearance sub-element config | Selection CSS and some widget helpers | Some widget helpers | Partially working | Only marked/supporting widgets consume element tokens. |
| Header/body text controls | Appearance sub-elements | Only widgets using `subValue` or markers | Only widgets using `subValue` or markers | Incorrectly scoped on unsupported widgets | A generic header setting cannot safely affect all widget headers. |
| Border radius | Appearance tokens/config values | Slot wrapper plus some widgets | Slot wrapper plus some widgets | Partially working | Radius can clip 3D/carousel widgets unless overflow rules are understood. |
| Shadows | `shadowSize`, `shadowIntensity`, token vars | Preview slot drop-shadow plus widget styles | OBS slot drop-shadow plus widget styles | Partially working | Some widgets also have internal shadows. |
| Animations | Widget config and renderer classes | Inline preview differs | OBS renderer classes and widget CSS | Partially working | Preview suppresses or omits several OBS animation conditions. |
| Custom CSS | Theme/appearance/widget config | Sometimes injected | Injected by renderer | Dangerous | Can override unrelated internals if selectors are broad. |
| Presets | Mix of editor state, widget config, legacy theme | Depends on mapped values | Depends on mapped values | Partially working | No complete capability contract per widget. |
| Data sample preview | `previewWidgetSamples.js` | Preview only | none | Preview only | Preview can show data that OBS does not have at that moment. |
| Direct element click | DOM `data-widget-element` | Preview only | none | Partially working | Most widgets have no markers. |

## Disconnected or risky areas

- Layer controls imply broad support, but most widgets do not expose DOM element markers.
- Many widgets use inline styles with values derived directly from config, not CSS variables.
- Some styles are configured by widget-specific config panels and saved in `overlay_widgets.config`, bypassing the centralized appearance draft.
- Renderer imports `OverlayCenter.css`, so admin styles can accidentally affect OBS if class names collide.
- Custom CSS and `elementCSS` injection are powerful but difficult to validate.

## Required correction before another editor rebuild

The editor needs a widget capability registry that prevents unsupported controls from appearing. The registry must describe actual component support, not inferred support from generic token names.
