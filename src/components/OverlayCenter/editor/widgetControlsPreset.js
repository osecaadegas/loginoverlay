import { normalizeBetterCoordinate } from "./betterWidgetGeometry";

export const WIDGET_CONTROLS_PRESET_KIND =
  "streamers-center.widget-controls-preset";
export const WIDGET_CONTROLS_PRESET_VERSION = 2;

function cloneJson(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return JSON.parse(JSON.stringify(value));
}

export function createWidgetControlsPreset(
  instance,
  exportedAt = new Date().toISOString(),
) {
  return {
    kind: WIDGET_CONTROLS_PRESET_KIND,
    schemaVersion: WIDGET_CONTROLS_PRESET_VERSION,
    exportedAt,
    widgetType: instance?.widgetType || "unknown",
    widgetLabel: instance?.label || instance?.widgetType || "Widget",
    position: {
      x: normalizeBetterCoordinate(instance?.x),
      y: normalizeBetterCoordinate(instance?.y),
    },
    size: {
      width: Math.max(0, normalizeBetterCoordinate(instance?.width)),
      height: Math.max(0, normalizeBetterCoordinate(instance?.height)),
    },
    controls: cloneJson(instance?.config),
  };
}

export function getWidgetControlsPresetFilename(instance, exportedAt) {
  const widgetType = String(instance?.widgetType || "widget")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const date = String(exportedAt || new Date().toISOString()).slice(0, 10);
  return `${widgetType || "widget"}-controls-preset-${date}.json`;
}

export function downloadWidgetControlsPreset(instance) {
  const preset = createWidgetControlsPreset(instance);
  const blob = new Blob([`${JSON.stringify(preset, null, 2)}\n`], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = getWidgetControlsPresetFilename(instance, preset.exportedAt);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
