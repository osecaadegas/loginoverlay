# Current Game (`current_slot`)

The current implementation uses the `immersive_current` style in the existing Better editor. The earlier `v1`–`v4` renderer was removed before this feature; those layouts are not advertised by the new style registry.

- Renderer: `src/components/OverlayCenter/widgets/current-slot/CurrentSlotWidget.jsx`
- Management: `src/components/OverlayCenter/widgets/current-slot/CurrentSlotConfig.jsx`
- Controls: `src/components/OverlayCenter/widgets/current-slot/CurrentSlotAppearanceControls.jsx`
- Route: `/overlay-center/widgets/current-slot`
- Configuration: existing `overlay_widgets.config` and per-instance Better layout config.
- Records: existing `user_slot_results`, combined with legacy `user_slot_records` / Bonus Hunt history through `shared/slotPersonalBest.js`.

The horizontal layout contains a slot cover, separate title/provider, catalog information, and personal records. The catalog image supplies the immersive backdrop unless a per-slot background URL is configured. Separate title artwork is optional; otherwise the name is rendered as text.

Appearance elements are declared for `immersive_current` in `appearance/v2/widgetAppearanceRegistry.js`. The renderer binds stable element IDs using `appearanceAttrs`, `subElementStyle`, and `subValue`. Individual rows, labels and values have separate scopes; image URL overrides update the actual image source. The same component renders in editor preview and OBS.

Default frame: 1320 × 290. Editor bounds: 680–1920 wide and 140–600 high. Typography scales with widget width. Page previews fit the available viewport. Empty selections, missing metadata and unavailable images have explicit fallbacks.

See [Current Game implementation and validation](../../CURRENT_GAME_WIDGET.md) for record semantics, checks and limitations.
