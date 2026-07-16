# Preview vs OBS Mismatch Report

## Summary

The inline preview and OBS renderer share the widget registry and many components, but they are not identical runtimes. The differences are large enough that the appearance editor must not assume a setting visible in preview is guaranteed to render the same in OBS.

## Mismatch table

| Area | Inline preview | OBS renderer | Severity | Notes |
| --- | --- | --- | --- | --- |
| Entry point | `OverlayPreview.jsx` inside admin page | `/overlay/:token` through `OverlayRenderer.jsx` | Major | Same component registry, different shell and parent DOM. |
| Data | `applyPreviewWidgetSamples` can inject sample data | Live database/external data | Major | Preview may show filled states when OBS is empty. |
| Appearance source | Draft/current editor state | Published state except `?preview=1` | Critical | Save/publish separation is correct but must be clearly handled. |
| Animations | No normal renderer enter/exit wrapper flow | `or-anim-in/out-*` classes in OBS | Major | Popout preview suppresses enter/exit animations. |
| Element selection | Adds outlines through CSS on `data-widget-element` | No selection CSS | Minor | Intended editor-only behavior. |
| Focused widget mode | Can crop/center selected widget | OBS normally renders full canvas | Major | Useful, but not an OBS-equivalent view. |
| Canvas scaling | Preview uses panel width and preview mode logic | OBS scales authored canvas to viewport | Major | Scale affects apparent text and overflow. |
| CSS loaded | Admin page CSS plus imported widget CSS | `OverlayRenderer.css` and `OverlayCenter.css` | Major | Both load overlap, but parent context differs. |
| Runtime dimensions | Preview frame can expand with sample data | Live widget dimensions from config/DB/preview frame | Major | Some widgets depend on measured size or exact slot clipping. |
| Realtime subscriptions | Usually receives editor data and preview samples | Subscribes to overlay state/widgets/theme and widget data sources | Major | Live data and side effects differ. |

## Fake or duplicated preview behavior

Preview is not fake in the sense that it uses real registered widget components. However, it has duplicated runtime behavior in these areas:

- Slot wrapper implementation is separate from `WidgetSlot`.
- Focus/fit cropping exists only in `OverlayPreview`.
- Resize handles exist only in `OverlayPreview`.
- Selection outlines exist only in `OverlayPreview`.
- Preview sample data exists only in `previewWidgetSamples.js`.

## Critical mismatches to fix first

1. Share the slot wrapper behavior or extract common slot sizing/overflow/clipping logic.
2. Formalize which preview mode is OBS-equivalent and which is editor-assist only.
3. Add a preview status indicator for sample data versus live data.
4. Ensure every widget uses the same appearance resolver before rendering in both surfaces.
5. Avoid relying on admin parent CSS for widget visuals.
