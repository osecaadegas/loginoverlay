import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Layers,
  Maximize2,
  Monitor,
  MonitorPlay,
  MousePointer2,
  Palette,
  Redo2,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Trash2,
  Undo2,
  Upload,
  Wand2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import OverlayPreview from "../OverlayPreview";
import { trackEvent } from "../../../utils/analytics";
import { ANALYTICS_EVENTS } from "../../../../shared/analytics";
import {
  APPEARANCE_SCHEMA_VERSION,
  buildOverlayAppearanceState,
  createAppearancePreset,
  createAppearanceVersion,
  deepMerge,
  getAppearanceWarnings,
  getByPath,
  getElementAppearancePropertyPath,
  getPerformanceTone,
  getTargetOverrideRoot,
  getWidgetActiveStyleId,
  getWidgetStyleOptions,
  normalizeAppearance,
  omitPath,
  projectAppearanceToThemePatch,
  setByPath,
} from "./appearanceModel";
import {
  CONTROL_DEFINITIONS,
  DEFAULT_SIMPLE_SETTINGS,
  EDITOR_MODE_CAPABILITIES,
  EDITOR_SCHEMA_VERSION,
  FONT_OPTIONS,
  SIMPLE_COLOR_PALETTE,
  SIMPLE_DENSITIES,
  SIMPLE_IMAGE_SHAPES,
  SIMPLE_IMAGE_SIZES,
  SIMPLE_MATERIAL_PRESETS,
  SIMPLE_MOTION_SPEEDS,
  SIMPLE_SHAPES,
  SIMPLE_STRENGTHS,
  SIMPLE_TEXT_SIZES,
  WIDGET_CATEGORY_FILTERS,
  elementSupportsControl,
  generateSimpleAppearance,
  getElementControlGroups,
  getFriendlyElementLabel,
  getModeLabel,
  getWidgetCategory,
  getWidgetDisplayName,
  getWidgetElementSchema,
  getWidgetIcon,
  inferElementKind,
  normalizeHexColor,
  normalizeSimpleSettings,
  validateEditorValue,
} from "./editorSchema";
import {
  buildAppearanceV2ForStorage,
  getSimpleAppearanceV2Settings,
} from "./v2/appearanceResolver";
import {
  createAppearanceRoute,
  getScopedAppearanceConfigValue,
  normalizeScopedAppearanceConfig,
  removeScopedAppearanceConfigElement,
  removeScopedAppearanceConfigValue,
  setScopedAppearanceConfigValue,
  validateAppearanceRoute,
} from "./v2/appearanceRouting";
import {
  getWidgetStyleCapability,
  getWidgetStyleElements,
  getWidgetStyleQuickControls,
  getWidgetStyleOptionsForQuickEditor,
  isWidgetAppearanceV2Enabled,
} from "./v2/widgetAppearanceRegistry";
import {
  getWidgetDef,
  getWidgetStyleDefaultSize,
} from "../widgets/widgetRegistry";
import {
  FontSelectInput,
  LayerToggleButton,
  PropertyControl,
} from "./propertyControls";
import {
  applyWidgetStylePack,
  createWidgetStylePack,
  validateWidgetStylePack,
} from "./widgetStyleTransfer";
import { normalizeBonusHuntColorSync } from "../widgets/shared/bonusHuntColorSync";
import "./AppearanceCenter.css";

const TOUR_STORAGE_KEY = "streamers_center_appearance_tour_hidden";
const MODE_STORAGE_KEY = "streamers_center_appearance_mode";
const RECENT_COLORS_STORAGE_KEY = "streamers_center_appearance_recent_colors";
const CLIENT_ID_PREFIX = "appearance_editor";

const PREVIEW_BACKGROUNDS = [
  { id: "dark", label: "Dark" },
  { id: "light", label: "Light" },
  { id: "checkerboard", label: "Grid" },
  { id: "green", label: "Green" },
];

const WIDGET_PREVIEW_STATES = {
  slot_requests: [
    { id: "with_requests", label: "With requests" },
    { id: "empty", label: "Empty" },
    { id: "busy_queue", label: "Busy queue" },
  ],
  giveaway: [
    { id: "live", label: "Live" },
    { id: "drawing", label: "Drawing" },
    { id: "winner", label: "Winner" },
    { id: "empty", label: "Empty" },
  ],
};

const ZOOM_STEPS = [25, 40, 50, 67, 75, 90, 100, 125, 150, 200];

const NAVBAR_MUSIC_DISPLAY_STYLES = [
  { id: "text", label: "Text" },
  { id: "pill", label: "Pill" },
  { id: "marquee", label: "Marquee" },
  { id: "albumart", label: "Album art" },
  { id: "equalizer", label: "Equalizer" },
  { id: "vinyl", label: "Vinyl" },
  { id: "minimal", label: "Minimal" },
  { id: "wave", label: "Wave" },
];

const BONUS_HUNT_COLOR_SYNC_WIDGET_TYPES = new Set(["chat", "bets", "navbar"]);

const QUICK_WIDGET_CONTROLS = [
  {
    id: "mainColor",
    label: "Main color",
    control: CONTROL_DEFINITIONS.backgroundColor,
    path: "colors.primary",
  },
  {
    id: "accentColor",
    label: "Accent color",
    control: CONTROL_DEFINITIONS.backgroundColor,
    path: "colors.accent",
  },
  {
    id: "fontFamily",
    label: "Font",
    control: CONTROL_DEFINITIONS.fontFamily,
    path: "typography.bodyFont",
  },
  {
    id: "baseSize",
    label: "Text size",
    control: CONTROL_DEFINITIONS.fontSize,
    path: "typography.baseSize",
  },
  {
    id: "background",
    label: "Background",
    control: CONTROL_DEFINITIONS.backgroundColor,
    path: "surfaces.containerBg",
  },
  {
    id: "radius",
    label: "Rounded corners",
    control: CONTROL_DEFINITIONS.radius,
    path: "borders.radius",
  },
  {
    id: "widgetWidth",
    label: "Widget width",
    control: CONTROL_DEFINITIONS.width,
    path: "container.width",
  },
  {
    id: "widgetHeight",
    label: "Widget height",
    control: CONTROL_DEFINITIONS.height,
    path: "container.height",
  },
  {
    id: "padding",
    label: "Space inside",
    control: CONTROL_DEFINITIONS.padding,
    path: "surfaces.padding",
  },
  {
    id: "gap",
    label: "Space between items",
    control: CONTROL_DEFINITIONS.gap,
    path: "surfaces.gap",
  },
];

const FALLBACK_QUICK_STYLE_CAPABILITIES = Object.freeze({
  colours: true,
  multipleColours: true,
  fonts: true,
  fontSizes: true,
  fontWeights: true,
  containers: true,
  containerShapes: true,
  borderRadius: true,
  borders: true,
  shadows: true,
  glow: true,
  opacity: true,
  spacing: true,
  layoutDensity: true,
  transparentBackground: true,
});

const WHOLE_WIDGET_ELEMENT_IDS = new Set(["container", "root"]);
const GLOBAL_QUICK_STYLE_CONTROLS = new Set([
  "material",
  "scale",
  "carouselAutoplay",
  "carouselSpeed",
  "carouselDirection",
  "animationEnabled",
  "animationSpeed",
  "animationIntensity",
  "barHeight",
  "maxWidth",
  "musicDisplayStyle",
]);

const DEFAULT_RTP_METAL_SETTINGS = Object.freeze({
  primaryColor: "#6f7d91",
  secondaryColor: "#252c38",
  syncWithBonusHuntColors: false,
});

function normalizeRtpMetalSettings(settings = {}) {
  return {
    primaryColor:
      String(settings.primaryColor || "").trim() ||
      DEFAULT_RTP_METAL_SETTINGS.primaryColor,
    secondaryColor:
      String(settings.secondaryColor || "").trim() ||
      DEFAULT_RTP_METAL_SETTINGS.secondaryColor,
    syncWithBonusHuntColors: !!settings.syncWithBonusHuntColors,
  };
}

function firstRtpColor(...values) {
  for (const value of values) {
    const color = String(value || "").trim();
    if (color) return color;
  }
  return "";
}

function getBonusHuntMetalColors(widgets = []) {
  const bonusHunt = widgets.find(
    (widget) => widget?.widget_type === "bonus_hunt" && widget.config,
  );
  if (!bonusHunt?.config) return null;
  const config = bonusHunt.config || {};
  return {
    primaryColor: firstRtpColor(
      config.headerAccent,
      config.currentBonusAccent,
      config.listCardAccent,
      config.accentColor,
      "#2dd4bf",
    ),
    secondaryColor: firstRtpColor(
      config.headerColor,
      config.countCardColor,
      config.listCardColor,
      config.bgColor,
      "#26282e",
    ),
  };
}

const NAVBAR_APPEARANCE_SECTION_ID = "navbarSections";
let generatedIdCounter = 0;

function compareWidgetLayer(a, b) {
  const az = Number(a?.z_index) || 0;
  const bz = Number(b?.z_index) || 0;
  if (az !== bz) return az - bz;
  if (a?.widget_type === "background" && b?.widget_type !== "background")
    return -1;
  if (a?.widget_type !== "background" && b?.widget_type === "background")
    return 1;
  return String(a?.id || "").localeCompare(String(b?.id || ""));
}

function getOrderedLayerWidgets(widgets = []) {
  return [...widgets].sort(compareWidgetLayer);
}

function safeJson(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function createClientId() {
  return createGeneratedId(CLIENT_ID_PREFIX);
}

function createRandomIdSegment() {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const values = new Uint32Array(2);
    crypto.getRandomValues(values);
    return Array.from(values, (value) => value.toString(36)).join("");
  }
  generatedIdCounter += 1;
  return `${Date.now().toString(36)}${generatedIdCounter.toString(36)}`;
}

function createGeneratedId(prefix) {
  return `${prefix}_${Date.now()}_${createRandomIdSegment()}`;
}

function downloadJsonFile(filename, data) {
  if (
    typeof document === "undefined" ||
    typeof Blob === "undefined" ||
    typeof URL === "undefined"
  )
    return false;
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
  return true;
}

function stylePackFilename() {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return `streamers-center-widget-styles-${stamp}.json`;
}

function countStylePackWidgetTypes(pack) {
  const counts = new Map();
  for (const item of pack.widgets || []) {
    if (!item?.widgetType) continue;
    counts.set(item.widgetType, (counts.get(item.widgetType) || 0) + 1);
  }
  return counts;
}

function countLocalWidgetTypes(widgets) {
  const counts = new Map();
  for (const widget of widgets || []) {
    counts.set(widget.widget_type, (counts.get(widget.widget_type) || 0) + 1);
  }
  return counts;
}

async function createMissingStylePackWidgets({ addWidget, pack, widgets }) {
  if (!addWidget) return { createdCount: 0, targetWidgets: widgets };
  const importCounts = countStylePackWidgetTypes(pack);
  const localCounts = countLocalWidgetTypes(widgets);
  const createdWidgets = [];
  for (const [widgetType, count] of importCounts.entries()) {
    const missing = Math.max(0, count - (localCounts.get(widgetType) || 0));
    const def = getWidgetDef(widgetType);
    if (!def || !missing) continue;
    for (let index = 0; index < missing; index += 1) {
      const created = await addWidget(widgetType, def.defaults || {});
      if (created?.id) createdWidgets.push(created);
    }
  }
  if (!createdWidgets.length)
    return { createdCount: 0, targetWidgets: widgets };
  return {
    createdCount: createdWidgets.length,
    targetWidgets: [...widgets, ...createdWidgets],
  };
}

function countSkippedStylePackItems(result) {
  return result.skipped.reduce((sum, item) => sum + Number(item.count || 0), 0);
}

function getInitialMode() {
  if (typeof window === "undefined") return "simple";
  return window.localStorage.getItem(MODE_STORAGE_KEY) === "advanced"
    ? "advanced"
    : "simple";
}

function getInitialTourVisible() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(TOUR_STORAGE_KEY) !== "1";
}

function getInitialRecentColors() {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(RECENT_COLORS_STORAGE_KEY) || "[]",
    );
    return Array.isArray(parsed) ? parsed.filter(Boolean).slice(0, 8) : [];
  } catch {
    return [];
  }
}

function getSimpleSettingsAtRoot(appearance, root, widgetType) {
  if (isWidgetAppearanceV2Enabled(widgetType)) {
    return getSimpleAppearanceV2Settings(appearance, root, widgetType);
  }
  if (!root) return normalizeSimpleSettings(appearance?.simpleSettings || {});
  return normalizeSimpleSettings(
    getByPath(appearance, `${root}.appearance.simpleSettings`) ||
      getByPath(appearance, `${root}.simpleSettings`) ||
      {},
  );
}

function getSimplePresetVars(settings) {
  if (settings?.material === "original") {
    return {
      "--preset-primary": "#14d8d8",
      "--preset-accent": "#f5b301",
      "--preset-surface":
        "linear-gradient(160deg, rgba(30,58,138,0.95), rgba(15,23,42,0.96))",
      "--preset-card": "rgba(15, 23, 42, 0.72)",
      "--preset-border": "rgba(20, 216, 216, 0.46)",
      "--preset-text": "#f8fafc",
      "--preset-glow": "#14d8d8",
    };
  }
  const generated = generateSimpleAppearance(settings);
  return {
    "--preset-primary": generated.colors?.primary || settings.primaryColor,
    "--preset-accent": generated.colors?.accent || settings.accentColor,
    "--preset-surface": generated.surfaces?.containerBg || "rgba(15,23,42,0.9)",
    "--preset-card": generated.surfaces?.cardBg || "rgba(255,255,255,0.08)",
    "--preset-border": generated.borders?.color || "rgba(148,163,184,0.28)",
    "--preset-text": generated.colors?.text || "#f8fafc",
    "--preset-glow":
      generated.effects?.glowColor ||
      generated.colors?.primary ||
      settings.primaryColor,
  };
}

function createTarget(widget, appearance) {
  if (!widget) return { scope: "overlay" };
  return {
    scope: "widget_instance",
    widgetId: widget.id,
    widgetType: widget.widget_type,
    styleId: getWidgetActiveStyleId(widget, appearance),
  };
}

function targetKey(target) {
  if (!target) return "overlay";
  return `${target.scope || "overlay"}:${target.widgetId || ""}:${target.widgetType || ""}:${target.styleId || ""}`;
}

function getFirstWidget(widgets = []) {
  return widgets.find((widget) => widget?.is_visible) || widgets[0] || null;
}

function getFirstElement(widgetType) {
  return getWidgetElementSchema(widgetType)[0] || null;
}

function getFirstElementForStyle(widgetType, styleId) {
  if (isWidgetAppearanceV2Enabled(widgetType)) {
    const elements = getWidgetStyleElements(widgetType, styleId);
    if (widgetType === "background") {
      return (
        elements.find((element) => element.id === "texture") ||
        elements[0] ||
        getFirstElement(widgetType)
      );
    }
    return elements[0] || getFirstElement(widgetType);
  }
  return getFirstElement(widgetType);
}

function supportsAny(capabilities = {}, keys = []) {
  return keys.some((key) => !!capabilities[key]);
}

function listWhen(condition, items) {
  if (condition) return items;
  return [];
}

function getLegacyQuickControlIds(capabilities) {
  return [
    ...listWhen(
      supportsAny(capabilities, [
        "colours",
        "containers",
        "transparentBackground",
      ]),
      ["material"],
    ),
    ...listWhen(
      supportsAny(capabilities, [
        "colours",
        "multipleColours",
        "positiveNegativeColours",
        "progressBar",
      ]),
      ["primaryColor", "accentColor"],
    ),
    ...listWhen(capabilities.fonts, ["fontFamily"]),
    ...listWhen(capabilities.fontSizes, ["textSize"]),
    ...listWhen(capabilities.fontWeights, ["boldText"]),
    ...listWhen(capabilities.images, ["imageVisibility"]),
    ...listWhen(capabilities.imageSize, ["imageSize"]),
    ...listWhen(capabilities.imageShape, ["imageShape"]),
    ...listWhen(capabilities.imageFit, ["imageFit"]),
    ...listWhen(
      supportsAny(capabilities, ["containerShapes", "borderRadius"]),
      ["shape"],
    ),
    ...listWhen(capabilities.layoutDensity, ["density", "scale"]),
    ...listWhen(capabilities.shadows, ["shadowStrength"]),
    ...listWhen(supportsAny(capabilities, ["glow", "glowIntensity"]), [
      "glowStrength",
    ]),
    ...listWhen(capabilities.carouselAutoplay, ["carouselAutoplay"]),
    ...listWhen(capabilities.carouselSpeed, ["carouselSpeed"]),
    ...listWhen(capabilities.carouselDirection, ["carouselDirection"]),
    ...listWhen(capabilities.animations, ["animationEnabled"]),
    ...listWhen(capabilities.animationSpeed, ["animationSpeed"]),
    ...listWhen(capabilities.animationIntensity, ["animationIntensity"]),
  ];
}

function buildSimpleSections({
  hasAnyQuickControl,
  selectedElementsLength,
  selectedQuickControls,
  selectedWidgetIsBackground,
  selectedWidgetType,
  showBonusHuntColorSyncControls,
  showRtpMetalControls,
}) {
  const baseSections = [
    "widgetStyle",
    ...listWhen(selectedElementsLength > 1, ["editing"]),
  ];
  if (selectedWidgetIsBackground) {
    return [...baseSections, "backgroundControls", "actions"];
  }
  return [
    ...baseSections,
    ...listWhen(selectedQuickControls.has("material"), ["material"]),
    ...listWhen(
      hasAnyQuickControl(["primaryColor", "accentColor"]) ||
        showRtpMetalControls ||
        showBonusHuntColorSyncControls,
      ["colours"],
    ),
    ...listWhen(
      hasAnyQuickControl([
        "fontFamily",
        "textSize",
        "boldText",
        "imageVisibility",
        "imageSize",
        "imageShape",
        "imageFit",
        "musicDisplayStyle",
      ]),
      ["textImages"],
    ),
    ...listWhen(selectedWidgetType === "navbar", [
      NAVBAR_APPEARANCE_SECTION_ID,
    ]),
    ...listWhen(
      hasAnyQuickControl([
        "shape",
        "density",
        "scale",
        "shadowStrength",
        "glowStrength",
        "barHeight",
        "maxWidth",
      ]),
      ["shapeEffects"],
    ),
    ...listWhen(
      hasAnyQuickControl([
        "carouselAutoplay",
        "carouselSpeed",
        "carouselDirection",
        "animationEnabled",
        "animationSpeed",
        "animationIntensity",
      ]),
      ["motion"],
    ),
    "actions",
  ];
}

function buildAdvancedSectionTabs({
  controlGroups,
  editingWholeWidget,
  mode,
  selectedWidgetUsesV2,
}) {
  return [
    ...listWhen(editingWholeWidget && !selectedWidgetUsesV2, [
      { id: "surfaceBackground", label: "Surface" },
    ]),
    ...controlGroups.map((group) => ({
      id: `control-${group.id}`,
      label: mapControlGroupTitle(group.label),
    })),
    ...listWhen(mode === "advanced" && editingWholeWidget, [
      { id: "spacingSizing", label: "Size" },
    ]),
    { id: "advanced", label: "Checks" },
  ];
}

function getSelectedStyleLabel({
  quickStyleOptions,
  registeredStyleOptions,
  selectedStyleId,
}) {
  const quickStyle = quickStyleOptions.find(
    (option) => option.id === selectedStyleId,
  );
  if (quickStyle?.label) return quickStyle.label;
  const registeredStyle = registeredStyleOptions.find(
    (option) => option.id === selectedStyleId,
  );
  if (registeredStyle?.label) return registeredStyle.label;
  return selectedStyleId || "Default";
}

function getCurrentWidgetScopeLabel(mode, selectedElement) {
  if (mode === "simple") return "Entire widget";
  if (!selectedElement) return "Choose an element";
  return getFriendlyElementLabel(selectedElement.id, selectedElement.label);
}

function getSelectedWidget(widgets, selectedTarget, firstWidget) {
  return (
    widgets.find((widget) => widget.id === selectedTarget.widgetId) ||
    firstWidget
  );
}

function getSelectedWidgetConfig(selectedWidget, previewConfigPatches) {
  const baseConfig = selectedWidget?.config || {};
  const patch = selectedWidget?.id
    ? previewConfigPatches[selectedWidget.id]
    : null;
  return patch ? deepMerge(baseConfig, patch) : baseConfig;
}

function buildPreviewWidgets(widgets, previewPositions, previewConfigPatches) {
  return widgets.map((widget) => {
    const position = previewPositions[widget.id];
    const configPatch = previewConfigPatches[widget.id];
    const positioned = position
      ? { ...widget, position_x: position.x, position_y: position.y }
      : widget;
    return configPatch
      ? {
          ...positioned,
          config: deepMerge(positioned.config || {}, configPatch),
        }
      : positioned;
  });
}

function buildPreviewAppearance({
  draft,
  previewElementOffsets,
  serverState,
  showBefore,
  widgets,
}) {
  if (showBefore) return serverState.published;
  if (!Object.keys(previewElementOffsets).length) return draft;
  let next = draft;
  for (const [widgetId, offsetsByElement] of Object.entries(
    previewElementOffsets,
  )) {
    const widget = widgets.find((item) => item.id === widgetId);
    if (!widget || !isWidgetAppearanceV2Enabled(widget.widget_type)) continue;
    const root = getTargetOverrideRoot(createTarget(widget, next));
    if (!root) continue;
    for (const [elementId, offsets] of Object.entries(offsetsByElement || {})) {
      next = setByPath(
        next,
        resolveV2ElementOverridePath(
          root,
          elementId,
          "offsetX",
          offsets.stateId,
        ),
        offsets.offsetX,
      );
      next = setByPath(
        next,
        resolveV2ElementOverridePath(
          root,
          elementId,
          "offsetY",
          offsets.stateId,
        ),
        offsets.offsetY,
      );
    }
  }
  return next;
}

function getVisibleMaterialPresets(selectedWidgetType, selectedWidgetUsesV2) {
  if (selectedWidgetType === "bonus_hunt") {
    return SIMPLE_MATERIAL_PRESETS.filter(
      (preset) => preset.id !== "soft_shadow",
    );
  }
  return SIMPLE_MATERIAL_PRESETS.filter(
    (preset) =>
      preset.id !== "original" &&
      (!selectedWidgetUsesV2 || preset.id !== "soft_shadow"),
  );
}

function getQuickStyleOptions({
  draft,
  registeredStyleOptions,
  selectedWidget,
  selectedWidgetType,
  selectedWidgetUsesV2,
}) {
  const v2Options = selectedWidgetUsesV2
    ? getWidgetStyleOptionsForQuickEditor(selectedWidgetType)
    : [];
  const customOptions = registeredStyleOptions.filter(
    (option) => option.custom,
  );
  const sourceOptions = selectedWidgetUsesV2
    ? customOptions
    : registeredStyleOptions;
  const byId = new Map();
  for (const option of v2Options) byId.set(option.id, option);
  for (const option of sourceOptions) {
    const existing = byId.get(option.id);
    const merged = existing ? { ...existing, ...option } : { ...option };
    byId.set(option.id, {
      ...merged,
      label: existing?.label || option.label,
      recommended: existing?.recommended || false,
    });
  }
  return [...byId.values()].map((option) => ({
    ...option,
    edited: styleEdited(draft, selectedWidget?.id, option.id),
  }));
}

function getSelectedStyleCapability({
  selectedTarget,
  selectedWidgetType,
  selectedWidgetUsesV2,
}) {
  if (!selectedWidgetUsesV2) return null;
  return getWidgetStyleCapability(selectedWidgetType, selectedTarget.styleId);
}

function getSelectedElements({
  selectedTarget,
  selectedWidgetType,
  selectedWidgetUsesV2,
}) {
  if (selectedWidgetUsesV2) {
    return getWidgetStyleElements(selectedWidgetType, selectedTarget.styleId);
  }
  return getWidgetElementSchema(selectedWidgetType);
}

function getSelectedElement(selectedElements, selectedElementId) {
  return (
    selectedElements.find((element) => element.id === selectedElementId) ||
    selectedElements[0] ||
    null
  );
}

function getSelectedQuickControls({
  selectedElement,
  selectedStyleCapabilities,
  selectedTarget,
  selectedWidgetType,
  selectedWidgetUsesV2,
}) {
  if (selectedWidgetUsesV2) {
    return new Set(
      getWidgetStyleQuickControls(
        selectedWidgetType,
        selectedTarget.styleId,
        selectedElement?.id || null,
      ),
    );
  }
  return new Set(getLegacyQuickControlIds(selectedStyleCapabilities));
}

function getSelectedHiddenElementIds({
  draft,
  selectedElements,
  selectedTargetRoot,
}) {
  if (!selectedTargetRoot) return [];
  return selectedElements
    .filter(
      (element) =>
        !getElementVisibleFromAppearance(draft, selectedTargetRoot, element.id),
    )
    .map((element) => element.id);
}

function getFilteredWidgets(widgets, widgetSearch) {
  const term = widgetSearch.trim().toLowerCase();
  return getOrderedLayerWidgets(widgets)
    .reverse()
    .filter((widget) => {
      const name = getWidgetDisplayName(widget).toLowerCase();
      const type = String(widget.widget_type || "").toLowerCase();
      return !term || name.includes(term) || type.includes(term);
    });
}

function prunePreviewPositionsForWidgets(prev, widgets) {
  const widgetIds = new Set(widgets.map((widget) => widget.id));
  const next = Object.fromEntries(
    Object.entries(prev).filter(([id]) => widgetIds.has(id)),
  );
  return Object.keys(next).length === Object.keys(prev).length ? prev : next;
}

async function persistAppearanceDraft({
  clientId,
  lastPersistedDraftRef,
  nextDraft,
  reason,
  serverState,
  setSaveStatus,
  setStatusMessage,
  setToast,
  theme,
  updateState,
}) {
  if (!updateState) return false;
  const normalized = normalizeAppearance(nextDraft, { theme });
  const serialized = safeJson(normalized);
  if (serialized === lastPersistedDraftRef.current && reason !== "manual") {
    return true;
  }
  setSaveStatus("saving");
  setStatusMessage("Saving draft...");
  try {
    const nextRoot = {
      ...serverState,
      draft: normalized,
      schemaVersion: APPEARANCE_SCHEMA_VERSION,
      revision: serverState.revision + 1,
      updatedAt: new Date().toISOString(),
      sourceClientId: clientId,
    };
    await updateState({ overlayAppearance: nextRoot });
    lastPersistedDraftRef.current = serialized;
    setSaveStatus("saved");
    setStatusMessage(
      reason === "manual" ? "Draft saved." : "Draft auto-saved.",
    );
    setToast(reason === "manual" ? "Draft saved" : "");
    trackEvent(
      ANALYTICS_EVENTS.APPEARANCE_DRAFT_SAVED || "appearance_draft_saved",
      { reason },
    );
    return true;
  } catch (err) {
    console.error("[AppearanceCenter] save draft failed", err);
    setSaveStatus("failed");
    setStatusMessage("Draft could not be saved.");
    setToast("Draft save failed");
    trackEvent(
      ANALYTICS_EVENTS.APPEARANCE_SAVE_FAILED || "appearance_save_failed",
      { reason },
    );
    return false;
  }
}

async function publishAppearanceDraft({
  clientId,
  draft,
  lastPersistedDraftRef,
  lastPublishedRef,
  saveTheme,
  selectedWidgetName,
  selectedWidgetType,
  serverState,
  setPublishStatus,
  setSaveStatus,
  setStatusMessage,
  setToast,
  theme,
  updateState,
  userId,
}) {
  setSaveStatus("saving");
  setPublishStatus("publishing");
  setStatusMessage("Publishing to OBS...");
  try {
    const normalized = normalizeAppearance(draft, { theme });
    const version = createAppearanceVersion({
      appearance: normalized,
      userId,
      summary: `Published ${selectedWidgetName} design`,
    });
    const nextRoot = {
      ...serverState,
      draft: normalized,
      published: normalized,
      schemaVersion: APPEARANCE_SCHEMA_VERSION,
      revision: serverState.revision + 1,
      updatedAt: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
      sourceClientId: clientId,
      versions: [version, ...(serverState.versions || [])].slice(0, 30),
    };
    await updateState({ overlayAppearance: nextRoot });
    if (saveTheme) await saveTheme(projectAppearanceToThemePatch(normalized));
    const normalizedJson = safeJson(normalized);
    lastPersistedDraftRef.current = normalizedJson;
    lastPublishedRef.current = normalizedJson;
    setSaveStatus("saved");
    setPublishStatus("published");
    setStatusMessage("Published. OBS browser sources will use this design.");
    setToast("Published to OBS");
    trackEvent(
      ANALYTICS_EVENTS.APPEARANCE_PUBLISHED || "appearance_published",
      { widget_type: selectedWidgetType || null },
    );
  } catch (err) {
    console.error("[AppearanceCenter] publish failed", err);
    setSaveStatus("failed");
    setPublishStatus("failed");
    setStatusMessage("Publish failed.");
    setToast("Publish failed");
  }
}

function mergePreviewConfigPatch(
  setPreviewConfigPatches,
  widgetId,
  configPatch,
) {
  setPreviewConfigPatches((prev) => {
    const currentPatch = prev[widgetId];
    return {
      ...prev,
      [widgetId]: currentPatch
        ? deepMerge(currentPatch, configPatch)
        : configPatch,
    };
  });
}

function clearPreviewConfigPatch(setPreviewConfigPatches, widgetId) {
  setPreviewConfigPatches((prev) => {
    const next = { ...prev };
    delete next[widgetId];
    return next;
  });
}

function buildRtpMetalPatch(patch, rtpMetalSettings) {
  const patchSource = patch && typeof patch === "object" ? patch : null;
  if (!patchSource) return normalizeRtpMetalSettings(rtpMetalSettings);
  return normalizeRtpMetalSettings({
    primaryColor: Object.hasOwn(patchSource, "primaryColor")
      ? patchSource.primaryColor
      : rtpMetalSettings.primaryColor,
    secondaryColor: Object.hasOwn(patchSource, "secondaryColor")
      ? patchSource.secondaryColor
      : rtpMetalSettings.secondaryColor,
    syncWithBonusHuntColors: Object.hasOwn(
      patchSource,
      "syncWithBonusHuntColors",
    )
      ? patchSource.syncWithBonusHuntColors
      : rtpMetalSettings.syncWithBonusHuntColors,
  });
}

function updateRtpMetalWidgetSettings({
  patch,
  rtpMetalSettings,
  saveWidget,
  selectedWidget,
  selectedWidgetConfig,
  setPreviewConfigPatches,
  setToast,
  summary,
}) {
  if (!selectedWidget?.id || !saveWidget) return;
  const nextRtpMetal = buildRtpMetalPatch(patch, rtpMetalSettings);
  const configPatch = { rtpMetal: nextRtpMetal };
  const nextConfig = deepMerge(selectedWidgetConfig, configPatch);
  mergePreviewConfigPatch(
    setPreviewConfigPatches,
    selectedWidget.id,
    configPatch,
  );
  saveWidget({ ...selectedWidget, config: nextConfig })
    .then(() => setToast(summary))
    .catch((err) => {
      console.error("[AppearanceCenter] RTP Metal update failed", err);
      clearPreviewConfigPatch(setPreviewConfigPatches, selectedWidget.id);
      setToast("RTP Metal colours could not be updated");
    });
}

function updateBonusHuntColorSyncWidgetSettings({
  enabled,
  saveWidget,
  selectedWidget,
  selectedWidgetConfig,
  setPreviewConfigPatches,
  setToast,
}) {
  if (!selectedWidget?.id || !saveWidget) return;
  const configPatch = { bonusHuntColorSync: { enabled: !!enabled } };
  const nextConfig = deepMerge(selectedWidgetConfig, configPatch);
  mergePreviewConfigPatch(
    setPreviewConfigPatches,
    selectedWidget.id,
    configPatch,
  );
  saveWidget({ ...selectedWidget, config: nextConfig })
    .then(() =>
      setToast(
        enabled
          ? "Widget synced to Bonus Hunt colours"
          : "Widget manual colours restored",
      ),
    )
    .catch((err) => {
      console.error("[AppearanceCenter] Bonus Hunt colour sync failed", err);
      clearPreviewConfigPatch(setPreviewConfigPatches, selectedWidget.id);
      setToast("Bonus Hunt colour sync could not be updated");
    });
}

function savePreviewWidgetPosition({
  meta,
  position,
  saveWidget,
  setPreviewPositions,
  setPublishStatus,
  setToast,
  widget,
  widgets,
}) {
  if (!widget?.id || widget.widget_type === "background") return;
  const nextPosition = {
    x: Math.round(Number(position?.x) || 0),
    y: Math.round(Number(position?.y) || 0),
  };
  setPreviewPositions((prev) => ({ ...prev, [widget.id]: nextPosition }));
  if (!meta.commit || !saveWidget) return;
  const currentWidget = widgets.find((item) => item.id === widget.id) || widget;
  saveWidget({
    ...currentWidget,
    position_x: nextPosition.x,
    position_y: nextPosition.y,
  })
    .then(() => {
      setToast(`${getWidgetDisplayName(currentWidget)} position saved`);
      setPublishStatus("unpublished");
      setPreviewPositions((prev) => {
        const next = { ...prev };
        delete next[widget.id];
        return next;
      });
    })
    .catch((err) => {
      console.error("[AppearanceCenter] widget position save failed", err);
      setToast("Widget position could not be saved");
    });
}

function clearPreviewElementOffset(
  setPreviewElementOffsets,
  widgetId,
  elementId,
) {
  setPreviewElementOffsets((prev) => {
    const widgetOffsets = { ...prev[widgetId] };
    delete widgetOffsets[elementId];
    const next = { ...prev };
    if (Object.keys(widgetOffsets).length) next[widgetId] = widgetOffsets;
    else delete next[widgetId];
    return next;
  });
}

function movePreviewElement({
  commitDraft,
  draft,
  meta,
  movement,
  setPreviewElementOffsets,
  setSelectedElementId,
  setSelectedStateId,
  setSelectedTarget,
  widget,
}) {
  if (
    !widget?.id ||
    !movement?.elementId ||
    !isWidgetAppearanceV2Enabled(widget.widget_type)
  ) {
    return;
  }
  const moveTarget = createTarget(widget, draft);
  const root = getTargetOverrideRoot(moveTarget);
  const stateId = movement.stateId || "default";
  const element = getWidgetStyleElements(
    widget.widget_type,
    moveTarget.styleId,
  ).find((item) => item.id === movement.elementId);
  if (
    !root ||
    !elementSupportsControl(element, "offsetX") ||
    !elementSupportsControl(element, "offsetY")
  ) {
    return;
  }
  const nextOffsets = {
    offsetX: Math.round(Number(movement.offsetX) || 0),
    offsetY: Math.round(Number(movement.offsetY) || 0),
    stateId,
  };
  setSelectedTarget(moveTarget);
  setSelectedElementId(movement.elementId);
  setSelectedStateId(stateId);
  if (!meta.commit) {
    setPreviewElementOffsets((prev) => ({
      ...prev,
      [widget.id]: {
        ...prev[widget.id],
        [movement.elementId]: nextOffsets,
      },
    }));
    return;
  }
  clearPreviewElementOffset(
    setPreviewElementOffsets,
    widget.id,
    movement.elementId,
  );
  commitDraft(
    (prev) => {
      let next = setByPath(
        prev,
        resolveV2ElementOverridePath(
          root,
          movement.elementId,
          "offsetX",
          stateId,
        ),
        nextOffsets.offsetX,
      );
      next = setByPath(
        next,
        resolveV2ElementOverridePath(
          root,
          movement.elementId,
          "offsetY",
          stateId,
        ),
        nextOffsets.offsetY,
      );
      return next;
    },
    `Move ${element.label || movement.elementId}`,
  );
}

function moveAppearanceWidgetLayer({
  direction,
  event,
  saveWidget,
  setPublishStatus,
  setToast,
  widget,
  widgets,
}) {
  event?.preventDefault();
  event?.stopPropagation();
  if (!widget?.id || !saveWidget) return;
  const ordered = getOrderedLayerWidgets(widgets);
  const currentIndex = ordered.findIndex((item) => item.id === widget.id);
  if (currentIndex < 0) return;
  const targetIndex = direction === "up" ? currentIndex + 1 : currentIndex - 1;
  if (targetIndex < 0 || targetIndex >= ordered.length) return;
  const normalized = ordered.map((item, index) => ({
    ...item,
    z_index: index + 1,
  }));
  const current = normalized[currentIndex];
  const target = normalized[targetIndex];
  normalized[currentIndex] = { ...target, z_index: currentIndex + 1 };
  normalized[targetIndex] = { ...current, z_index: targetIndex + 1 };
  const changed = normalized.filter((next) => {
    const original = widgets.find((item) => item.id === next.id);
    return (
      original && Number(original.z_index || 0) !== Number(next.z_index || 0)
    );
  });
  Promise.all(changed.map((next) => saveWidget(next)))
    .then(() => {
      setPublishStatus("unpublished");
      setToast(
        `${getWidgetDisplayName(widget)} moved ${direction === "up" ? "above" : "below"}`,
      );
    })
    .catch((err) => {
      console.error("[AppearanceCenter] widget layer update failed", err);
      setToast("Widget layer order could not be changed");
    });
}

function applySimpleSettingsChange({
  commitDraft,
  currentSimpleSettings,
  patch,
  rememberColor,
  selectedTargetRoot,
  selectedWidgetType,
  summary,
}) {
  const nextSettings = normalizeSimpleSettings({
    ...currentSimpleSettings,
    ...patch,
  });
  const restoreBonusHuntOriginal =
    selectedTargetRoot &&
    selectedWidgetType === "bonus_hunt" &&
    nextSettings.material === "original";
  if (restoreBonusHuntOriginal) {
    commitDraft(
      (prev) => omitPath(prev, selectedTargetRoot),
      summary || "Restore original Bonus Hunt design",
    );
    return;
  }
  const generated = generateSimpleAppearance(nextSettings);
  if (patch?.primaryColor) rememberColor(nextSettings.primaryColor);
  if (patch?.accentColor) rememberColor(nextSettings.accentColor);
  commitDraft((prev) => {
    if (!selectedTargetRoot) return deepMerge(prev, generated);
    const appearancePath = `${selectedTargetRoot}.appearance`;
    const currentAppearance = getByPath(prev, appearancePath) || {};
    let next = setByPath(
      prev,
      appearancePath,
      deepMerge(currentAppearance, generated),
    );
    if (isWidgetAppearanceV2Enabled(selectedWidgetType)) {
      const currentV2 =
        getByPath(prev, `${selectedTargetRoot}.appearanceV2`) || {};
      next = setByPath(
        next,
        `${selectedTargetRoot}.appearanceV2`,
        buildAppearanceV2ForStorage(
          selectedWidgetType,
          nextSettings,
          currentV2,
        ),
      );
    }
    return next;
  }, summary);
}

function applyQuickSettingsChange({
  applySimpleSettings,
  commitDraft,
  currentSimpleSettings,
  patch,
  rememberColor,
  selectedElement,
  selectedTargetRoot,
  selectedWidgetType,
  selectedWidgetUsesV2,
  summary,
}) {
  const canPatchElement =
    selectedWidgetUsesV2 &&
    selectedTargetRoot &&
    selectedElement?.id &&
    canScopeQuickPatchToElement(selectedElement, patch);
  if (!canPatchElement) {
    applySimpleSettings(patch, summary);
    return;
  }
  const nextSettings = normalizeSimpleSettings({
    ...currentSimpleSettings,
    ...patch,
  });
  if (patch?.primaryColor) rememberColor(nextSettings.primaryColor);
  if (patch?.accentColor) rememberColor(nextSettings.accentColor);
  commitDraft((prev) => {
    const currentV2 =
      getByPath(prev, `${selectedTargetRoot}.appearanceV2`) || {};
    const tokenSettings =
      nextSettings.material === "original"
        ? { ...nextSettings, material: "matte" }
        : nextSettings;
    const resolvedV2 = buildAppearanceV2ForStorage(
      selectedWidgetType,
      tokenSettings,
      currentV2,
    );
    const override = buildElementQuickOverrideFromPatch(
      selectedElement,
      patch,
      resolvedV2.generatedTokens || {},
    );
    if (!Object.keys(override).length) return prev;
    const overridePath = `${selectedTargetRoot}.appearanceV2.elementOverrides.${selectedElement.id}`;
    const currentOverride = getByPath(prev, overridePath) || {};
    return setByPath(prev, overridePath, deepMerge(currentOverride, override));
  }, summary);
}

function restoreRecommendedWidgetStyle({
  commitDraft,
  selectedTargetRoot,
  selectedWidgetType,
  setToast,
}) {
  if (selectedTargetRoot && selectedWidgetType === "bonus_hunt") {
    commitDraft(
      (prev) => omitPath(prev, selectedTargetRoot),
      "Restore original Bonus Hunt design",
    );
    setToast("Original Bonus Hunt design restored");
    return;
  }
  const generated = generateSimpleAppearance(DEFAULT_SIMPLE_SETTINGS);
  commitDraft((prev) => {
    if (!selectedTargetRoot) return deepMerge(prev, generated);
    let next = setByPath(prev, `${selectedTargetRoot}.appearance`, generated);
    if (isWidgetAppearanceV2Enabled(selectedWidgetType)) {
      next = setByPath(
        next,
        `${selectedTargetRoot}.appearanceV2`,
        buildAppearanceV2ForStorage(
          selectedWidgetType,
          DEFAULT_SIMPLE_SETTINGS,
          {},
        ),
      );
    }
    next = omitPath(next, `${selectedTargetRoot}.elements`);
    next = omitPath(next, `${selectedTargetRoot}.subElements`);
    return next;
  }, "Restore recommended style");
  setToast("Recommended style restored");
}

function changeAppearanceMode({
  advancedOverrideCount,
  mode,
  nextMode,
  setMode,
  setPreviewMode,
  setShowBefore,
  setSidebarTab,
  setToast,
}) {
  if (nextMode === mode) return;
  if (nextMode === "simple" && advancedOverrideCount > 0) {
    const keep = window.confirm(
      "Advanced adjustments are active for this widget. Keep them while using Simple Mode? Choose Cancel to stay in Advanced Mode.",
    );
    if (!keep) return;
    setToast("Advanced adjustments kept");
  }
  setMode(nextMode);
  setSidebarTab(nextMode === "advanced" ? "layers" : "widgets");
  setPreviewMode(
    EDITOR_MODE_CAPABILITIES[nextMode]?.previewMode || "fit-widget",
  );
  setShowBefore(false);
}

function getSelectedWidgetName(widget) {
  return widget ? getWidgetDisplayName(widget) : "Overlay";
}

function getSelectedWidgetType(widget, selectedTarget) {
  return widget?.widget_type || selectedTarget.widgetType || "";
}

function getPreviewStateOptions(widgetType) {
  return WIDGET_PREVIEW_STATES[widgetType] || [];
}

function getSelectedPreviewState({
  previewStateByWidget,
  previewStateOptions,
  widgetId,
}) {
  return previewStateByWidget[widgetId] || previewStateOptions[0]?.id || "";
}

function countAdvancedOverrides(draft, selectedTargetRoot) {
  if (!selectedTargetRoot) return 0;
  return (
    countObjectLeaves(getByPath(draft, `${selectedTargetRoot}.elements`)) +
    countObjectLeaves(getByPath(draft, `${selectedTargetRoot}.subElements`)) +
    countObjectLeaves(
      getByPath(draft, `${selectedTargetRoot}.__appearanceScopedState`),
    ) +
    countObjectLeaves(
      getByPath(draft, `${selectedTargetRoot}.__appearanceExplicitSubElements`),
    ) +
    countObjectLeaves(
      getByPath(draft, `${selectedTargetRoot}.appearanceV2.elementOverrides`),
    )
  );
}

function buildStyleSelections(selectedWidget, selectedTarget) {
  if (!selectedWidget?.id || !selectedTarget.styleId) return {};
  return { [selectedWidget.id]: selectedTarget.styleId };
}

function getBackgroundSourceMode(controlValue, selectedStyleId) {
  if (controlValue) return controlValue;
  return BACKGROUND_SPECIAL_STYLE_IDS.has(selectedStyleId)
    ? "special"
    : "texture";
}

function shouldShowBackgroundControlFor({
  backgroundFogMode,
  backgroundLightMode,
  backgroundParticleMode,
  backgroundSourceMode,
  backgroundTextureType,
  controlId,
  elementId,
  selectedStyleId,
  selectedWidgetIsBackground,
}) {
  if (!selectedWidgetIsBackground) return true;
  if (elementId === "texture") {
    return getBackgroundTextureControlIds(
      backgroundSourceMode,
      selectedStyleId,
      backgroundTextureType,
    ).has(controlId);
  }
  if (elementId === "media") {
    if (BACKGROUND_MEDIA_ALWAYS_CONTROLS.has(controlId)) return true;
    return (
      ["image", "video"].includes(backgroundSourceMode) &&
      BACKGROUND_MEDIA_ACTIVE_CONTROLS.has(controlId)
    );
  }
  if (elementId !== "effects") return true;
  if (BACKGROUND_PARTICLE_DETAIL_CONTROLS.has(controlId)) {
    return backgroundParticleMode !== "none";
  }
  if (BACKGROUND_FOG_DETAIL_CONTROLS.has(controlId)) {
    return backgroundFogMode !== "none";
  }
  if (BACKGROUND_LIGHT_DETAIL_CONTROLS.has(controlId)) {
    return backgroundLightMode !== "none";
  }
  return true;
}

function getBackgroundElementControlGroupsFor(element, shouldShowControl) {
  if (!element) return [];
  return getElementControlGroups(element, "advanced")
    .map((group) => ({
      ...group,
      controls: group.controls
        .filter((control) => shouldShowControl(element.id, control.id))
        .map((control) => normalizeBackgroundControl(control, element.id)),
    }))
    .filter((group) => group.controls.length);
}

function QuickPropertyControl({
  draft,
  item,
  onReset,
  onUpdate,
  selectedTargetRoot,
}) {
  const path = selectedTargetRoot
    ? `${selectedTargetRoot}.appearance.${item.path}`
    : item.path;
  const value = getByPath(draft, path);
  return (
    <PropertyControl
      control={normalizeControl(item.control, item.label)}
      value={value}
      onChange={(next) => onUpdate(item, next)}
      onReset={() => onReset(item)}
      inheritedLabel={value === undefined ? "Inherited" : "Custom"}
    />
  );
}

function ElementPropertyControl({
  control,
  disabled,
  element,
  onReset,
  onUpdate,
  value,
}) {
  return (
    <PropertyControl
      control={control}
      value={value}
      onChange={(next) => onUpdate(element.id, control, next)}
      onReset={() => onReset(element.id, control)}
      inheritedLabel={value === undefined ? "Inherited" : "Custom"}
      disabled={disabled}
    />
  );
}

function ElementPropertyControlFor({
  control,
  element,
  getValue,
  isLocked,
  onReset,
  onUpdate,
  selectedTargetRoot,
}) {
  if (!selectedTargetRoot || !element?.id) return null;
  const value = getValue(element.id, control.id);
  return (
    <ElementPropertyControl
      control={control}
      disabled={isLocked(element.id)}
      element={element}
      onReset={onReset}
      onUpdate={onUpdate}
      value={value}
    />
  );
}

function commitAppearanceDraftChange({
  commitRecipe,
  selectedElementId,
  selectedTarget,
  selectedWidgetType,
  setDraft,
  setPublishStatus,
  setRedoStack,
  setSaveStatus,
  setShowBefore,
  setStatusMessage,
  setUndoStack,
  summary,
  theme,
}) {
  setShowBefore(false);
  setDraft((prev) => {
    const next = normalizeAppearance(
      typeof commitRecipe === "function" ? commitRecipe(prev) : commitRecipe,
      { theme },
    );
    if (safeJson(prev) === safeJson(next)) return prev;
    setUndoStack((stack) => [
      ...stack.slice(-49),
      { targetKey: targetKey(selectedTarget), draft: prev, summary },
    ]);
    setRedoStack([]);
    setSaveStatus("dirty");
    setPublishStatus("unpublished");
    setStatusMessage("Preview updated instantly. Draft will be saved shortly.");
    trackEvent(
      ANALYTICS_EVENTS.APPEARANCE_SETTING_CHANGED ||
        "appearance_setting_changed",
      {
        summary,
        widget_type: selectedWidgetType || null,
        element_id: selectedElementId || null,
      },
    );
    return next;
  });
}

function rememberRecentColor(color, setRecentColors) {
  const normalized = normalizeHexColor(color, "");
  if (!normalized) return;
  setRecentColors((prev) => {
    const next = [
      normalized,
      ...prev.filter((item) => item !== normalized),
    ].slice(0, 8);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        RECENT_COLORS_STORAGE_KEY,
        JSON.stringify(next),
      );
    }
    return next;
  });
}

function updateSelectedWidgetConfigValue({
  patch,
  saveWidget,
  selectedWidget,
  setToast,
  summary,
}) {
  if (!selectedWidget?.id || !saveWidget) return;
  const nextConfig = { ...selectedWidget.config, ...patch };
  saveWidget({ ...selectedWidget, config: nextConfig })
    .then(() => setToast(summary))
    .catch((err) => {
      console.error("[AppearanceCenter] widget config update failed", err);
      setToast("Widget settings could not be updated");
    });
}

function selectAppearanceWidget({
  dirty,
  draft,
  mode,
  nextElementId,
  persistDraft,
  saveTimerRef,
  setSelectedElementId,
  setSelectedStateId,
  setSelectedTarget,
  setSidebarTab,
  widget,
}) {
  if (!widget) return;
  if (dirty) {
    clearTimeout(saveTimerRef.current);
    persistDraft(draft, "widget-switch");
  }
  const target = createTarget(widget, draft);
  const firstElement = getFirstElementForStyle(
    widget.widget_type,
    target.styleId,
  );
  setSelectedTarget(target);
  setSelectedElementId(nextElementId || firstElement?.id || "");
  setSelectedStateId("default");
  setSidebarTab(mode === "advanced" ? "layers" : "widgets");
  trackEvent(
    ANALYTICS_EVENTS.WIDGET_APPEARANCE_TARGET_SELECTED ||
      "widget_appearance_target_selected",
    {
      scope: target.scope,
      widget_type: target.widgetType,
    },
  );
}

function selectAppearanceStyle({
  commitDraft,
  quickStyleOptions,
  saveWidget,
  selectedWidget,
  setSelectedElementId,
  setSelectedStateId,
  setSelectedTarget,
  styleId,
}) {
  if (!selectedWidget?.id || !styleId) return;
  const nextTarget = {
    scope: "widget_instance",
    widgetId: selectedWidget.id,
    widgetType: selectedWidget.widget_type,
    styleId,
  };
  setSelectedTarget(nextTarget);
  const firstElement = getFirstElementForStyle(
    selectedWidget.widget_type,
    styleId,
  );
  setSelectedElementId(firstElement?.id || "");
  setSelectedStateId("default");
  const optionLabel =
    quickStyleOptions.find((option) => option.id === styleId)?.label || styleId;
  const defaultSize = getWidgetStyleDefaultSize(
    selectedWidget.widget_type,
    styleId,
  );
  if (defaultSize && saveWidget) {
    const def = getWidgetDef(selectedWidget.widget_type);
    const styleKey = def?.styleConfigKey || "displayStyle";
    const nextConfig = selectedWidget.config
      ? { ...selectedWidget.config, [styleKey]: styleId }
      : { [styleKey]: styleId };
    saveWidget({
      ...selectedWidget,
      width: defaultSize.width,
      height: defaultSize.height,
      config: nextConfig,
    }).catch((err) => {
      console.error("[AppearanceCenter] style size update failed", err);
    });
  }
  commitDraft(
    (prev) =>
      setByPath(prev, `widgets.${selectedWidget.id}.activeStyleId`, styleId),
    `Select ${optionLabel} style`,
  );
}

function syncModeSideEffects({
  mode,
  setPreviewMode,
  setShowBefore,
  setSidebarTab,
}) {
  if (mode !== "simple") return;
  setSidebarTab("widgets");
  setPreviewMode((prev) => (prev === "full-overlay" ? prev : "fit-widget"));
  setShowBefore(false);
}

function persistAppearanceMode(mode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MODE_STORAGE_KEY, mode);
}

function syncServerDraftState({
  dirty,
  lastPersistedDraftRef,
  lastPublishedRef,
  lastRevisionRef,
  saveStatus,
  serverState,
  setDraft,
}) {
  if (lastRevisionRef.current === serverState.revision) return;
  lastRevisionRef.current = serverState.revision;
  lastPublishedRef.current = safeJson(serverState.published || {});
  if (dirty || saveStatus === "saving") return;
  setDraft(serverState.draft);
  lastPersistedDraftRef.current = safeJson(serverState.draft);
}

function ensureSelectedWidgetTarget({
  draft,
  firstWidget,
  selectedWidget,
  setSelectedElementId,
  setSelectedTarget,
}) {
  if (selectedWidget || !firstWidget) return;
  setSelectedTarget(createTarget(firstWidget, draft));
  setSelectedElementId(getFirstElement(firstWidget.widget_type)?.id || "");
}

function ensureSelectedElement({
  selectedElement,
  selectedElements,
  setSelectedElementId,
}) {
  if (selectedElement || !selectedElements[0]) return;
  setSelectedElementId(selectedElements[0].id);
}

function startToastTimer(toast, setToast) {
  if (!toast) return undefined;
  const timer = setTimeout(() => setToast(""), 3200);
  return () => clearTimeout(timer);
}

function broadcastAppearancePreviewDraft({
  draft,
  instance,
  styleSelections,
  clientId,
}) {
  if (typeof BroadcastChannel === "undefined") return undefined;
  const channel = new BroadcastChannel("streamers-center-preview");
  channel.postMessage({
    type: "appearance-preview-draft",
    token: instance?.overlay_token,
    appearance: draft,
    styleSelections,
    sourceClientId: clientId,
  });
  return () => channel.close();
}

function scheduleDraftAutosave({
  draft,
  lastPersistedDraftRef,
  persistDraft,
  saveTimerRef,
}) {
  const serialized = safeJson(draft);
  if (serialized === lastPersistedDraftRef.current) return undefined;
  clearTimeout(saveTimerRef.current);
  saveTimerRef.current = setTimeout(
    () => persistDraft(draft, "debounced-draft"),
    1100,
  );
  return () => clearTimeout(saveTimerRef.current);
}

function resizePreviewWidget({
  commitDraft,
  draft,
  setSelectedTarget,
  size,
  widget,
}) {
  if (!widget?.id) return;
  const resizeTarget = createTarget(widget, draft);
  const root = getTargetOverrideRoot(resizeTarget);
  if (!root) return;
  setSelectedTarget(resizeTarget);
  commitDraft(
    (prev) => {
      let next = setWidgetSizeOverridePaths(
        prev,
        root,
        "width",
        size.width,
        isWidgetAppearanceV2Enabled(widget.widget_type),
      );
      next = setWidgetSizeOverridePaths(
        next,
        root,
        "height",
        size.height,
        isWidgetAppearanceV2Enabled(widget.widget_type),
      );
      return next;
    },
    `Resize ${getWidgetDisplayName(widget)}`,
  );
}

function saveWidgetVisibility({ event, saveWidget, setToast, widget }) {
  event?.stopPropagation();
  if (!widget?.id || !saveWidget) return;
  const nextVisible = !widget.is_visible;
  saveWidget({ ...widget, is_visible: nextVisible })
    .then(() =>
      setToast(
        `${getWidgetDisplayName(widget)} ${nextVisible ? "enabled" : "disabled"}`,
      ),
    )
    .catch((err) => {
      console.error("[AppearanceCenter] widget visibility update failed", err);
      setToast("Widget visibility could not be changed");
    });
}

function applyUndoChange({
  draft,
  selectedTarget,
  setDraft,
  setPublishStatus,
  setRedoStack,
  setSaveStatus,
  setStatusMessage,
  setUndoStack,
}) {
  setUndoStack((stack) => {
    if (!stack.length) return stack;
    const entry = stack.at(-1);
    setRedoStack((next) =>
      [
        {
          targetKey: targetKey(selectedTarget),
          draft,
          summary: "Redo style change",
        },
        ...next,
      ].slice(0, 50),
    );
    setDraft(entry.draft);
    setSaveStatus("dirty");
    setPublishStatus("unpublished");
    setStatusMessage("Undo applied.");
    return stack.slice(0, -1);
  });
}

function applyRedoChange({
  draft,
  selectedTarget,
  setDraft,
  setPublishStatus,
  setRedoStack,
  setSaveStatus,
  setStatusMessage,
  setUndoStack,
}) {
  setRedoStack((stack) => {
    if (!stack.length) return stack;
    const entry = stack[0];
    setUndoStack((next) => [
      ...next.slice(-49),
      { targetKey: targetKey(selectedTarget), draft, summary: "Undo redo" },
    ]);
    setDraft(entry.draft);
    setSaveStatus("dirty");
    setPublishStatus("unpublished");
    setStatusMessage("Redo applied.");
    return stack.slice(1);
  });
}

function isSelectedElementLocked({
  elementId,
  lockedLayers,
  selectedWidgetId,
}) {
  if (!selectedWidgetId || !elementId) return false;
  return !!lockedLayers[layerKey(selectedWidgetId, elementId)];
}

function toggleAppearanceElementVisibility({
  commitDraft,
  draft,
  elementId,
  isElementLocked,
  selectedTarget,
  selectedTargetRoot,
  selectedWidgetType,
  selectedWidgetUsesV2,
}) {
  if (!selectedTargetRoot || !elementId || isElementLocked(elementId)) return;
  const nextVisible = !getElementVisibleFromAppearance(
    draft,
    selectedTargetRoot,
    elementId,
  );
  if (selectedWidgetUsesV2) {
    const scopedRoute = buildScopedAppearanceRoute({
      controlId: "visible",
      elementId,
      selectedTarget,
      selectedWidgetType,
    });
    const routeValidation = validateAppearanceRoute(scopedRoute);
    if (!routeValidation.valid) {
      console.warn(
        "[AppearanceCenter] blocked invalid appearance visibility route",
        routeValidation.errors,
      );
      return;
    }
    commitDraft(
      (prev) =>
        setScopedConfigAtRoot(
          prev,
          selectedTargetRoot,
          scopedRoute,
          nextVisible,
        ),
      `${elementId}.${nextVisible ? "show" : "hide"}`,
    );
    return;
  }
  const path = selectedWidgetUsesV2
    ? resolveV2ElementOverridePath(selectedTargetRoot, elementId, "visible")
    : resolveElementPath(selectedTargetRoot, elementId, "visible");
  commitDraft(
    (prev) => setByPath(prev, path, nextVisible),
    `${elementId}.${nextVisible ? "show" : "hide"}`,
  );
}

function updateAppearanceElementControl({
  commitDraft,
  control,
  elementId,
  isElementLocked,
  selectedTarget,
  selectedStateId,
  selectedTargetRoot,
  selectedWidgetType,
  selectedWidgetUsesV2,
  value,
}) {
  if (!selectedTargetRoot || !elementId || isElementLocked(elementId)) return;
  const scopedRoute = buildScopedAppearanceRoute({
    controlId: control.id,
    elementId,
    selectedStateId,
    selectedTarget,
    selectedWidgetType,
  });
  if (selectedWidgetUsesV2) {
    const routeValidation = validateAppearanceRoute(scopedRoute);
    if (!routeValidation.valid) {
      console.warn(
        "[AppearanceCenter] blocked invalid appearance route",
        routeValidation.errors,
      );
      return;
    }
  }
  const normalized = validateEditorValue(control, value);
  const isDefaultContainerSize =
    elementId === "container" &&
    ["width", "height"].includes(control.id) &&
    (!selectedStateId || selectedStateId === "default");
  if (isDefaultContainerSize) {
    commitDraft(
      (prev) => {
        const next = setWidgetSizeOverridePaths(
          prev,
          selectedTargetRoot,
          control.id,
          normalized,
          selectedWidgetUsesV2,
        );
        return selectedWidgetUsesV2
          ? setScopedConfigAtRoot(
              next,
              selectedTargetRoot,
              scopedRoute,
              normalized,
            )
          : next;
      },
      `${elementId}.${control.id}`,
    );
    return;
  }
  if (selectedWidgetUsesV2) {
    commitDraft(
      (prev) =>
        setScopedConfigAtRoot(
          prev,
          selectedTargetRoot,
          scopedRoute,
          normalized,
        ),
      `${elementId}.${control.id}`,
    );
    return;
  }
  const path = selectedWidgetUsesV2
    ? resolveV2ElementOverridePath(
        selectedTargetRoot,
        elementId,
        control.id,
        selectedStateId,
      )
    : resolveElementPath(
        selectedTargetRoot,
        elementId,
        control.id,
        selectedStateId,
      );
  commitDraft(
    (prev) => setByPath(prev, path, normalized),
    `${elementId}.${control.id}`,
  );
}

function resetAppearanceElementControl({
  commitDraft,
  control,
  elementId,
  isElementLocked,
  selectedTarget,
  selectedStateId,
  selectedTargetRoot,
  selectedWidgetType,
  selectedWidgetUsesV2,
}) {
  if (!selectedTargetRoot || !elementId || isElementLocked(elementId)) return;
  const scopedRoute = buildScopedAppearanceRoute({
    controlId: control.id,
    elementId,
    selectedStateId,
    selectedTarget,
    selectedWidgetType,
  });
  if (selectedWidgetUsesV2) {
    const routeValidation = validateAppearanceRoute(scopedRoute);
    if (!routeValidation.valid) {
      console.warn(
        "[AppearanceCenter] blocked invalid appearance reset route",
        routeValidation.errors,
      );
      return;
    }
  }
  const isDefaultContainerSize =
    elementId === "container" &&
    ["width", "height"].includes(control.id) &&
    (!selectedStateId || selectedStateId === "default");
  if (isDefaultContainerSize) {
    commitDraft(
      (prev) => {
        const next = omitWidgetSizeOverridePaths(
          prev,
          selectedTargetRoot,
          control.id,
          selectedWidgetUsesV2,
        );
        return selectedWidgetUsesV2
          ? removeScopedConfigValueAtRoot(next, selectedTargetRoot, scopedRoute)
          : next;
      },
      `Reset ${elementId}.${control.id}`,
    );
    return;
  }
  if (selectedWidgetUsesV2) {
    commitDraft(
      (prev) => removeScopedConfigValueAtRoot(prev, selectedTargetRoot, scopedRoute),
      `Reset ${elementId}.${control.id}`,
    );
    return;
  }
  const v2Path = resolveV2ElementOverridePath(
    selectedTargetRoot,
    elementId,
    control.id,
    selectedStateId,
  );
  const modernPath = resolveElementPath(
    selectedTargetRoot,
    elementId,
    control.id,
    selectedStateId,
  );
  const legacyPath = resolveLegacyElementPath(
    selectedTargetRoot,
    elementId,
    control.id,
    selectedStateId,
  );
  commitDraft(
    (prev) =>
      omitPath(omitPath(omitPath(prev, v2Path), modernPath), legacyPath),
    `Reset ${elementId}.${control.id}`,
  );
}

function updateAppearanceWidgetControl({
  commitDraft,
  item,
  selectedTargetRoot,
  selectedWidgetUsesV2,
  value,
}) {
  const normalized = validateEditorValue(item.control, value);
  if (
    selectedTargetRoot &&
    (item.id === "widgetWidth" || item.id === "widgetHeight")
  ) {
    const dimension = item.id === "widgetWidth" ? "width" : "height";
    commitDraft(
      (prev) =>
        setWidgetSizeOverridePaths(
          prev,
          selectedTargetRoot,
          dimension,
          normalized,
          selectedWidgetUsesV2,
        ),
      item.label,
    );
    return;
  }
  const path = selectedTargetRoot
    ? `${selectedTargetRoot}.appearance.${item.path}`
    : item.path;
  commitDraft((prev) => setByPath(prev, path, normalized), item.label);
}

function resetAppearanceWidgetControl({
  commitDraft,
  item,
  selectedTargetRoot,
  selectedWidgetUsesV2,
}) {
  if (
    selectedTargetRoot &&
    (item.id === "widgetWidth" || item.id === "widgetHeight")
  ) {
    const dimension = item.id === "widgetWidth" ? "width" : "height";
    commitDraft(
      (prev) =>
        omitWidgetSizeOverridePaths(
          prev,
          selectedTargetRoot,
          dimension,
          selectedWidgetUsesV2,
        ),
      `Reset ${item.label}`,
    );
    return;
  }
  const path = selectedTargetRoot
    ? `${selectedTargetRoot}.appearance.${item.path}`
    : item.path;
  commitDraft((prev) => omitPath(prev, path), `Reset ${item.label}`);
}

function applyAppearancePreset({
  commitDraft,
  preset,
  selectedTargetRoot,
  setToast,
  theme,
}) {
  const appearance = getPresetAppearance(preset);
  if (!appearance) return;
  if (preset.isSimpleQuickStyle && selectedTargetRoot) {
    commitDraft((prev) => {
      const appearancePath = `${selectedTargetRoot}.appearance`;
      const currentAppearance = getByPath(prev, appearancePath) || {};
      return setByPath(
        prev,
        appearancePath,
        deepMerge(currentAppearance, appearance),
      );
    }, `Apply preset ${preset.name}`);
  } else {
    commitDraft(
      (prev) => normalizeAppearance(deepMerge(prev, appearance), { theme }),
      `Apply preset ${preset.name}`,
    );
  }
  setToast(`${preset.name} applied`);
  trackEvent(
    ANALYTICS_EVENTS.APPEARANCE_PRESET_APPLIED || "appearance_preset_applied",
    { preset_id: preset.id },
  );
}

async function saveAppearancePresetFromDraft({
  clientId,
  currentSimpleSettings,
  draft,
  mode,
  selectedTarget,
  selectedTargetRoot,
  selectedWidgetName,
  selectedWidgetType,
  serverState,
  setToast,
  updateState,
}) {
  const name = window.prompt("Preset name", `${selectedWidgetName} style`);
  if (!name?.trim() || !updateState) return;
  const presetAppearance =
    mode === "simple" && selectedTargetRoot
      ? getByPath(draft, `${selectedTargetRoot}.appearance`) ||
        generateSimpleAppearance(currentSimpleSettings)
      : draft;
  const preset = createAppearancePreset({
    name,
    appearance: presetAppearance,
    scope: selectedTarget.scope,
    widgetTypes: selectedWidgetType ? [selectedWidgetType] : [],
  });
  if (mode === "simple") {
    preset.isSimpleQuickStyle = true;
    preset.simpleSettings = currentSimpleSettings;
  }
  const nextRoot = {
    ...serverState,
    draft,
    presets: [preset, ...(serverState.presets || [])].slice(0, 30),
    schemaVersion: APPEARANCE_SCHEMA_VERSION,
    revision: serverState.revision + 1,
    updatedAt: new Date().toISOString(),
    sourceClientId: clientId,
  };
  await updateState({ overlayAppearance: nextRoot });
  setToast("Preset saved");
}

async function renameAppearancePreset({
  preset,
  serverState,
  setToast,
  updateState,
}) {
  const name = window.prompt("Rename preset", preset.name);
  if (!name?.trim() || !updateState) return;
  const nextRoot = {
    ...serverState,
    presets: (serverState.presets || []).map((item) =>
      item.id === preset.id
        ? { ...item, name: name.trim(), updatedAt: new Date().toISOString() }
        : item,
    ),
    revision: serverState.revision + 1,
    updatedAt: new Date().toISOString(),
  };
  await updateState({ overlayAppearance: nextRoot });
  setToast("Preset renamed");
}

async function deleteAppearancePreset({
  preset,
  serverState,
  setToast,
  updateState,
}) {
  if (!window.confirm(`Delete "${preset.name}" preset?`) || !updateState)
    return;
  const nextRoot = {
    ...serverState,
    presets: (serverState.presets || []).filter(
      (item) => item.id !== preset.id,
    ),
    revision: serverState.revision + 1,
    updatedAt: new Date().toISOString(),
  };
  await updateState({ overlayAppearance: nextRoot });
  setToast("Preset deleted");
}

async function duplicateAppearancePreset({
  preset,
  serverState,
  setToast,
  updateState,
}) {
  if (!updateState) return;
  const duplicate = {
    ...preset,
    id: createGeneratedId("preset"),
    name: `${preset.name} copy`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const nextRoot = {
    ...serverState,
    presets: [duplicate, ...(serverState.presets || [])].slice(0, 30),
    revision: serverState.revision + 1,
    updatedAt: new Date().toISOString(),
  };
  await updateState({ overlayAppearance: nextRoot });
  setToast("Preset duplicated");
}

function exportCurrentWidgetStyles({ draft, setToast, widgets }) {
  const pack = createWidgetStylePack({ appearance: draft, widgets });
  if (!pack.widgets.length) {
    setToast("No widget styles to export");
    return;
  }
  const downloaded = downloadJsonFile(stylePackFilename(), pack);
  setToast(
    downloaded
      ? `Exported styles for ${pack.widgets.length} widgets`
      : "Export is not available in this browser",
  );
}

async function importWidgetStyleFile({
  addWidget,
  commitDraft,
  draft,
  event,
  persistDraft,
  saveTimerRef,
  setSaveStatus,
  setStatusMessage,
  setToast,
  theme,
  widgets,
}) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  try {
    const text = await file.text();
    const pack = JSON.parse(text);
    const validation = validateWidgetStylePack(pack);
    if (!validation.valid) {
      setToast(validation.error);
      return;
    }
    const { createdCount, targetWidgets } = await createMissingStylePackWidgets(
      { addWidget, pack, widgets },
    );
    const result = applyWidgetStylePack({
      appearance: draft,
      widgets: targetWidgets,
      pack,
    });
    if (result.error) {
      setToast(result.error);
      return;
    }
    if (!result.applied) {
      setToast("No matching widgets found for this style pack");
      return;
    }
    const importedAppearance = normalizeAppearance(result.appearance, {
      theme,
    });
    commitDraft(
      importedAppearance,
      `Import widget style pack (${result.applied} widgets)`,
    );
    clearTimeout(saveTimerRef.current);
    setSaveStatus("saving");
    setStatusMessage("Saving imported styles...");
    const saved = await persistDraft(
      importedAppearance,
      "import-widget-styles",
    );
    if (!saved) return;
    const skippedCount = countSkippedStylePackItems(result);
    const createdText = createdCount ? `, created ${createdCount}` : "";
    const skippedText = skippedCount ? `, skipped ${skippedCount}` : "";
    setToast(
      `Imported styles for ${result.applied} widgets${createdText}${skippedText}`,
    );
  } catch (err) {
    console.error("[AppearanceCenter] style pack import failed", err);
    setToast("Could not import style pack");
  }
}

function resetSelectedElementAppearance({
  commitDraft,
  selectedElement,
  selectedLayerLocked,
  selectedStateId,
  selectedTarget,
  selectedTargetRoot,
  selectedWidgetType,
  selectedWidgetUsesV2,
}) {
  if (!selectedTargetRoot || !selectedElement?.id || selectedLayerLocked)
    return;
  const statePath = selectedStateId && selectedStateId !== "default";
  const modernPath = statePath
    ? `${selectedTargetRoot}.elements.${selectedElement.id}.states.${selectedStateId}`
    : `${selectedTargetRoot}.elements.${selectedElement.id}`;
  const legacyPath = statePath
    ? `${selectedTargetRoot}.subElements.${selectedElement.id}.states.${selectedStateId}`
    : `${selectedTargetRoot}.subElements.${selectedElement.id}`;
  const v2Path = statePath
    ? `${selectedTargetRoot}.appearanceV2.elementOverrides.${selectedElement.id}.states.${selectedStateId}`
    : `${selectedTargetRoot}.appearanceV2.elementOverrides.${selectedElement.id}`;
  commitDraft(
    (prev) => {
      const withoutLegacy = omitPath(
        omitPath(omitPath(prev, modernPath), legacyPath),
        v2Path,
      );
      if (!selectedWidgetUsesV2) return withoutLegacy;
      return removeScopedConfigElementAtRoot(
        withoutLegacy,
        selectedTargetRoot,
        {
          widgetType: selectedWidgetType,
          widgetVariant: selectedTarget?.styleId,
          elementId: selectedElement.id,
          stateId: selectedStateId || "default",
        },
      );
    },
    `Reset ${selectedElement.id}`,
  );
}

function resetSelectedWidgetAppearance({
  commitDraft,
  selectedTargetRoot,
  selectedWidgetName,
}) {
  if (!selectedTargetRoot) return;
  if (!window.confirm(`Reset only "${selectedWidgetName}" custom style?`))
    return;
  commitDraft(
    (prev) => omitPath(prev, selectedTargetRoot),
    `Reset ${selectedWidgetName}`,
  );
}

function resetAllAppearance({ commitDraft, theme }) {
  if (
    !window.confirm(
      "Reset the entire appearance draft for all widgets? This does not publish until you press Publish to OBS.",
    )
  ) {
    return;
  }
  commitDraft(normalizeAppearance({}, { theme }), "Reset all appearance");
}

function discardUnsavedAppearanceDraft({
  lastPersistedDraftRef,
  saveTimerRef,
  serverState,
  setDraft,
  setPublishStatus,
  setSaveStatus,
  setStatusMessage,
}) {
  clearTimeout(saveTimerRef.current);
  setDraft(serverState.draft);
  lastPersistedDraftRef.current = safeJson(serverState.draft);
  setSaveStatus("saved");
  setPublishStatus(
    safeJson(serverState.draft) === safeJson(serverState.published || {})
      ? "published"
      : "unpublished",
  );
  setStatusMessage("Unsaved changes discarded.");
}

function setAppearanceTourHidden(hidden, setTourVisible) {
  setTourVisible(!hidden);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(TOUR_STORAGE_KEY, hidden ? "1" : "0");
  }
}

function getNextZoomValue(direction, zoom) {
  if (direction === "fit") return { value: "fit" };
  const current = zoom === "fit" ? 100 : Number(zoom) || 100;
  const index = ZOOM_STEPS.reduce(
    (best, step, i) =>
      Math.abs(step - current) < Math.abs(ZOOM_STEPS[best] - current)
        ? i
        : best,
    0,
  );
  const nextIndex =
    direction === "in"
      ? Math.min(ZOOM_STEPS.length - 1, index + 1)
      : Math.max(0, index - 1);
  return { value: `${ZOOM_STEPS[nextIndex]}` };
}

function toggleOpenSection(prev, id) {
  if (prev.includes(id)) return prev.filter((item) => item !== id);
  return [id, ...prev].slice(0, 2);
}

async function enterFullscreenForElement(target, setToast) {
  if (!target?.requestFullscreen) {
    setToast("Fullscreen is not available in this browser");
    return;
  }
  try {
    await target.requestFullscreen();
  } catch (err) {
    console.error("[AppearanceCenter] fullscreen failed", err);
    setToast("Fullscreen could not be opened");
  }
}

function registerAppearanceKeyboardShortcuts({
  draft,
  handlePreviewElementMove,
  mode,
  persistDraft,
  redo,
  resetElement,
  selectedElement,
  selectedLayerLocked,
  selectedStateId,
  selectedTargetRoot,
  selectedWidget,
  selectedWidgetType,
  setSelectedElementId,
  undo,
}) {
  function onKeyDown(event) {
    if (isTypingTarget(event.target)) return;
    if (handleCommandShortcut(event, { draft, persistDraft, redo, undo }))
      return;
    if (event.key === "Escape") {
      setSelectedElementId("");
      return;
    }
    const handledNudge = handleNudgeShortcut(event, {
      draft,
      handlePreviewElementMove,
      mode,
      selectedElement,
      selectedLayerLocked,
      selectedStateId,
      selectedTargetRoot,
      selectedWidget,
      selectedWidgetType,
    });
    if (handledNudge) return;
    handleDeleteShortcut(event, {
      mode,
      resetElement,
      selectedElement,
      selectedLayerLocked,
    });
  }
  window.addEventListener("keydown", onKeyDown);
  return () => window.removeEventListener("keydown", onKeyDown);
}

function openBackgroundSimpleSection(
  selectedWidgetIsBackground,
  setOpenSimpleSections,
) {
  if (!selectedWidgetIsBackground) return;
  setOpenSimpleSections((prev) => {
    if (prev.includes("backgroundControls")) return prev;
    return [
      "backgroundControls",
      ...prev.filter((id) => id !== "actions"),
    ].slice(0, 2);
  });
}

function readElementControlValue({
  controlId,
  draft,
  elementId,
  selectedStateId,
  selectedTarget,
  selectedTargetRoot,
  selectedWidgetType,
  selectedWidgetUsesV2,
}) {
  if (!selectedTargetRoot || !elementId || !controlId) return undefined;
  if (selectedWidgetUsesV2) {
    const currentConfig = normalizeScopedAppearanceConfig(
      getByPath(draft, selectedTargetRoot) || {},
      {
        widgetType: selectedWidgetType,
        widgetVariant: selectedTarget?.styleId,
      },
    );
    const scopedValue = getScopedAppearanceConfigValue(currentConfig, {
      widgetType: selectedWidgetType,
      widgetVariant: selectedTarget?.styleId,
      elementId,
      propertyId: controlId,
      stateId: selectedStateId || "default",
    });
    if (scopedValue !== undefined) return scopedValue;
  }
  const v2Path = resolveV2ElementOverridePath(
    selectedTargetRoot,
    elementId,
    controlId,
    selectedStateId,
  );
  const path = resolveElementPath(
    selectedTargetRoot,
    elementId,
    controlId,
    selectedStateId,
  );
  const legacyPath = resolveLegacyElementPath(
    selectedTargetRoot,
    elementId,
    controlId,
    selectedStateId,
  );
  const v2Value = getByPath(draft, v2Path);
  if (v2Value !== undefined) return v2Value;
  const value = getByPath(draft, path);
  if (value !== undefined) return value;
  return getByPath(draft, legacyPath);
}

function isWholeWidgetQuickElement(element) {
  return !element?.id || WHOLE_WIDGET_ELEMENT_IDS.has(element.id);
}

function elementHasCapability(element, capability) {
  return (
    Array.isArray(element?.capabilities) &&
    element.capabilities.includes(capability)
  );
}

function canScopeQuickPatchToElement(element, patch = {}) {
  if (isWholeWidgetQuickElement(element)) return false;
  const keys = Object.keys(patch || {});
  return (
    keys.length > 0 &&
    keys.every((key) => !GLOBAL_QUICK_STYLE_CONTROLS.has(key))
  );
}

function pxValue(value) {
  return `${Math.round(Number(value) || 0)}px`;
}

function quickElementShadow(tokens = {}) {
  const intensity = Number(tokens.materialTokens?.shadowIntensity || 0);
  if (intensity <= 0.01) return undefined;
  return `0 ${pxValue(intensity * 14)} ${pxValue(intensity * 34)} ${tokens.colors?.shadow || "rgba(0,0,0,0.34)"}`;
}

function quickElementGlow(tokens = {}) {
  const intensity = Number(tokens.materialTokens?.glowIntensity || 0);
  if (intensity <= 0.01) return undefined;
  return `0 0 ${pxValue(intensity * 38)} ${tokens.colors?.glow || tokens.colors?.primary || "rgba(20,216,216,0.34)"}`;
}

function pickQuickElementFontSize(tokens = {}, element = {}) {
  const id = String(element.id || "").toLowerCase();
  if (id.includes("title") || id.includes("header"))
    return tokens.typography?.headerSize;
  if (
    id.includes("label") ||
    id.includes("description") ||
    id.includes("viewer")
  )
    return tokens.typography?.labelSize;
  if (id.includes("value") || id.includes("total"))
    return tokens.typography?.valueSize;
  return tokens.typography?.bodySize;
}

function pickQuickElementRadius(tokens = {}, element = {}) {
  if (element.kind === "badge" || element.kind === "progress")
    return tokens.shape?.badgeRadius;
  if (element.kind === "image")
    return tokens.image?.radius ?? tokens.shape?.cardRadius;
  if (["widgetBackground", "container", "root"].includes(element.id))
    return tokens.shape?.rootRadius;
  return tokens.shape?.cardRadius ?? tokens.shape?.rootRadius;
}

function getQuickElementContext(element) {
  const capabilities = new Set(element?.capabilities || []);
  return {
    capabilities,
    isImage: element?.kind === "image" || capabilities.has("image"),
    isProgress: element?.kind === "progress" || capabilities.has("progress"),
    isSurface:
      element?.kind === "surface" ||
      element?.kind === "carousel" ||
      capabilities.has("surface"),
    isText: element?.kind === "text" || capabilities.has("typography"),
  };
}

function applyQuickColorOverride(override, color, context, surfaceBackground) {
  if (context.isText && !context.isSurface) {
    override.textColor = color;
    return;
  }
  if (context.isProgress) {
    override.fillColor = color;
    return;
  }
  if (context.isImage) {
    override.borderColor = color;
    return;
  }
  if (!context.isSurface) return;
  if (surfaceBackground !== undefined) override.background = surfaceBackground;
  override.borderColor = color;
  override.accentColor = color;
}

function applyQuickPaletteOverrides(override, patch, tokens, context) {
  if (patch.primaryColor !== undefined) {
    applyQuickColorOverride(
      override,
      tokens.colors?.primary,
      context,
      tokens.colors?.secondarySurface,
    );
  }
  if (patch.accentColor === undefined && patch.useSecondColor === undefined)
    return;
  applyQuickColorOverride(override, tokens.colors?.accent, context);
}

function pickQuickFontWeight(isBold, tokens) {
  if (isBold) return tokens.typography?.valueWeight;
  return tokens.typography?.bodyWeight;
}

function applyQuickTypographyOverrides(
  override,
  patch,
  tokens,
  element,
  context,
) {
  if (!context.isText) return;
  if (patch.fontFamily !== undefined)
    override.fontFamily = tokens.typography?.bodyFont;
  if (patch.textSize !== undefined)
    override.fontSize = pickQuickElementFontSize(tokens, element);
  if (patch.boldText !== undefined)
    override.fontWeight = pickQuickFontWeight(patch.boldText, tokens);
}

function applyQuickImageOverrides(override, patch, tokens, element, context) {
  if (!context.isImage) return;
  if (patch.imageVisibility !== undefined)
    override.visible = patch.imageVisibility !== "hidden";
  if (patch.imageSize !== undefined)
    override.imageSize = Math.round(38 * (tokens.image?.sizeMultiplier || 1));
  if (patch.imageFit !== undefined)
    override.imageFit = tokens.image?.fit || "cover";
  if (patch.imageShape !== undefined)
    override.radius = pickQuickElementRadius(tokens, element);
}

function applyQuickShapeAndSpacingOverrides(
  override,
  patch,
  tokens,
  element,
  context,
) {
  const { capabilities } = context;
  const supportsShape =
    capabilities.has("shape") ||
    capabilities.has("border") ||
    context.isSurface ||
    context.isProgress;
  if (patch.imageShape !== undefined && capabilities.has("shape")) {
    override.radius = pickQuickElementRadius(tokens, element);
  }
  if (patch.shape !== undefined && supportsShape) {
    override.radius = pickQuickElementRadius(tokens, element);
  }
  if (patch.density === undefined || !capabilities.has("spacing")) return;
  override.padding = tokens.spacing?.cardPadding;
  override.gap = tokens.spacing?.itemGap;
}

function applyQuickEffectOverrides(override, patch, tokens, element, context) {
  const supportsShadow =
    context.capabilities.has("shadow") || element?.kind === "carousel";
  if (!supportsShadow) return;
  if (patch.shadowStrength !== undefined)
    override.shadow = quickElementShadow(tokens);
  if (patch.glowStrength === undefined) return;
  const shadow = [override.shadow, quickElementGlow(tokens)]
    .filter(Boolean)
    .join(", ");
  override.shadow = shadow || override.shadow;
}

function buildElementQuickOverrideFromPatch(element, patch = {}, tokens = {}) {
  const override = {};
  const context = getQuickElementContext(element);
  applyQuickPaletteOverrides(override, patch, tokens, context);
  applyQuickTypographyOverrides(override, patch, tokens, element, context);
  applyQuickImageOverrides(override, patch, tokens, element, context);
  applyQuickShapeAndSpacingOverrides(override, patch, tokens, element, context);
  applyQuickEffectOverrides(override, patch, tokens, element, context);

  return Object.fromEntries(
    Object.entries(override).filter(([, value]) => value !== undefined),
  );
}

function styleEdited(appearance, widgetId, styleId) {
  if (!widgetId || !styleId) return false;
  return (
    countObjectLeaves(
      getByPath(appearance, `widgets.${widgetId}.styles.${styleId}`),
    ) > 0
  );
}

function StylePreviewCard({ widget, option, active, edited, onSelect }) {
  if (!widget || !option) return null;
  return (
    <button
      type="button"
      className={`ve-style-card${active ? " is-active" : ""}${edited ? " is-edited" : ""}`}
      onClick={() => onSelect?.(option.id)}
      aria-pressed={active}
    >
      <span className="ve-style-card__mark" aria-hidden="true">
        <span />
      </span>
      <span className="ve-style-card__body">
        <strong>{option.label}</strong>
        {option.description && <small>{option.description}</small>}
      </span>
      <span className="ve-style-card__meta">
        {option.recommended && <em>Recommended</em>}
        {edited && <em>Edited</em>}
      </span>
    </button>
  );
}

function resolveElementPath(root, elementId, property, stateId = "default") {
  const propertyPath = getElementAppearancePropertyPath(property);
  if (stateId && stateId !== "default") {
    return `${root}.elements.${elementId}.states.${stateId}.${propertyPath}`;
  }
  return `${root}.elements.${elementId}.${propertyPath}`;
}

function resolveV2ElementOverridePath(
  root,
  elementId,
  property,
  stateId = "default",
) {
  if (stateId && stateId !== "default") {
    return `${root}.appearanceV2.elementOverrides.${elementId}.states.${stateId}.${property}`;
  }
  return `${root}.appearanceV2.elementOverrides.${elementId}.${property}`;
}

function buildScopedAppearanceRoute({
  controlId,
  elementId,
  selectedStateId,
  selectedTarget,
  selectedWidgetType,
}) {
  return {
    widgetType: selectedWidgetType,
    widgetVariant: selectedTarget?.styleId,
    elementId,
    propertyId: controlId,
    stateId: selectedStateId || "default",
  };
}

function normalizeScopedConfigAtRoot(source, root, route) {
  const current = getByPath(source, root) || {};
  return normalizeScopedAppearanceConfig(current, {
    widgetType: route.widgetType,
    widgetVariant: route.widgetVariant,
  });
}

function setScopedConfigAtRoot(source, root, route, value) {
  if (!root) return source;
  const normalized = normalizeScopedConfigAtRoot(source, root, route);
  return setByPath(
    source,
    root,
    setScopedAppearanceConfigValue(normalized, route, value),
  );
}

function removeScopedConfigValueAtRoot(source, root, route) {
  if (!root) return source;
  const normalized = normalizeScopedConfigAtRoot(source, root, route);
  return setByPath(
    source,
    root,
    removeScopedAppearanceConfigValue(normalized, route),
  );
}

function removeScopedConfigElementAtRoot(source, root, route) {
  if (!root) return source;
  const normalized = normalizeScopedConfigAtRoot(source, root, route);
  return setByPath(
    source,
    root,
    removeScopedAppearanceConfigElement(normalized, route),
  );
}

function setWidgetSizeOverridePaths(
  source,
  root,
  dimension,
  value,
  includeV2 = false,
) {
  if (!root || !["width", "height"].includes(dimension)) return source;
  const visualKey = dimension === "width" ? "widgetWidth" : "widgetHeight";
  let next = setByPath(
    source,
    `${root}.appearance.container.${dimension}`,
    value,
  );
  next = setByPath(next, `${root}.visual.${visualKey}`, value);
  if (includeV2) {
    next = setByPath(
      next,
      resolveV2ElementOverridePath(root, "container", dimension),
      value,
    );
  }
  return next;
}

function omitWidgetSizeOverridePaths(
  source,
  root,
  dimension,
  includeV2 = false,
) {
  if (!root || !["width", "height"].includes(dimension)) return source;
  const visualKey = dimension === "width" ? "widgetWidth" : "widgetHeight";
  let next = omitPath(source, `${root}.appearance.container.${dimension}`);
  next = omitPath(next, `${root}.visual.${visualKey}`);
  if (includeV2) {
    next = omitPath(
      next,
      resolveV2ElementOverridePath(root, "container", dimension),
    );
  }
  return next;
}

function resolveLegacyElementPath(
  root,
  elementId,
  property,
  stateId = "default",
) {
  if (stateId && stateId !== "default") {
    return `${root}.subElements.${elementId}.states.${stateId}.${property}`;
  }
  return `${root}.subElements.${elementId}.${property}`;
}

function getElementVisibleFromAppearance(appearance, root, elementId) {
  if (!appearance || !root || !elementId) return true;
  const paths = [
    resolveV2ElementOverridePath(root, elementId, "visible"),
    resolveElementPath(root, elementId, "visible"),
    resolveLegacyElementPath(root, elementId, "visible"),
  ];
  for (const path of paths) {
    const value = getByPath(appearance, path);
    if (value !== undefined) return value !== false;
  }
  return true;
}

function formatStatus(status, dirty) {
  if (status === "saving") return "Saving...";
  if (status === "failed") return "Save failed";
  if (dirty) return "Unsaved changes";
  return "Saved";
}

function formatDraftStatus(status, dirty) {
  if (status === "saving") return "Saving draft...";
  if (status === "failed") return "Draft save failed";
  if (dirty) return "Unsaved draft";
  return "Draft saved";
}

function formatPublishStatus(status, hasUnpublishedChanges) {
  if (status === "publishing") return "Publishing...";
  if (status === "failed") return "Publish failed";
  if (status === "published") return "Published to OBS";
  if (hasUnpublishedChanges || status === "unpublished")
    return "Unpublished changes";
  return "Published to OBS";
}

function publishStatusClass(status, hasUnpublishedChanges) {
  if (status === "publishing") return "publishing";
  if (status === "failed") return "failed";
  if (status === "published") return "published";
  if (hasUnpublishedChanges || status === "unpublished") return "unpublished";
  return "published";
}

function mapControlGroupTitle(label = "") {
  const key = label.toLowerCase();
  if (key.includes("font") || key.includes("text") || key.includes("type"))
    return "Typography";
  if (
    key.includes("space") ||
    key.includes("size") ||
    key.includes("layout") ||
    key.includes("position")
  )
    return "Spacing and sizing";
  if (key.includes("border") || key.includes("radius") || key.includes("shape"))
    return "Border and shape";
  if (
    key.includes("effect") ||
    key.includes("shadow") ||
    key.includes("glow") ||
    key.includes("animation") ||
    key.includes("motion")
  )
    return "Effects and animation";
  if (
    key.includes("background") ||
    key.includes("surface") ||
    key.includes("color") ||
    key.includes("colour") ||
    key.includes("finish")
  )
    return "Surface and background";
  return label || "Advanced";
}

function layerKey(widgetId, elementId) {
  return `${widgetId || "overlay"}:${elementId || "container"}`;
}

function groupLayers(elements) {
  const labels = {
    surface: "Structure",
    text: "Text",
    image: "Images",
    progress: "Progress",
    mixed: "Other",
  };
  return elements.reduce((groups, element) => {
    const kind = element.kind || inferElementKind(element);
    const id = labels[kind] ? kind : "mixed";
    if (!groups[id])
      groups[id] = { id, label: labels[id] || "Other", items: [] };
    groups[id].items.push(element);
    return groups;
  }, {});
}

function countObjectLeaves(value) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return value === undefined ? 0 : 1;
  return Object.values(value).reduce(
    (total, item) => total + countObjectLeaves(item),
    0,
  );
}

function isTypingTarget(target) {
  const tag = target?.tagName?.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    target?.isContentEditable
  );
}

const NUDGE_KEY_DELTAS = Object.freeze({
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
});

function handleCommandShortcut(event, { draft, persistDraft, redo, undo }) {
  const cmd = event.ctrlKey || event.metaKey;
  if (!cmd) return false;
  const key = event.key.toLowerCase();
  if (key === "z" && event.shiftKey) {
    event.preventDefault();
    redo();
    return true;
  }
  if (key === "z") {
    event.preventDefault();
    undo();
    return true;
  }
  if (key !== "s") return false;
  event.preventDefault();
  persistDraft(draft, "keyboard");
  return true;
}

function canNudgeSelectedElement({
  mode,
  selectedElement,
  selectedLayerLocked,
  selectedTargetRoot,
  selectedWidgetType,
}) {
  return (
    mode === "advanced" &&
    selectedElement?.id &&
    !selectedLayerLocked &&
    ["navbar", "rtp_stats"].includes(selectedWidgetType) &&
    selectedTargetRoot &&
    selectedElement.id !== "container" &&
    elementSupportsControl(selectedElement, "offsetX") &&
    elementSupportsControl(selectedElement, "offsetY")
  );
}

function readElementOffset(
  draft,
  selectedTargetRoot,
  elementId,
  property,
  stateId,
) {
  return Number(
    getByPath(
      draft,
      resolveV2ElementOverridePath(
        selectedTargetRoot,
        elementId,
        property,
        stateId,
      ),
    ) || 0,
  );
}

function handleNudgeShortcut(event, context) {
  const delta = NUDGE_KEY_DELTAS[event.key];
  if (!delta || !canNudgeSelectedElement(context) || !context.selectedWidget) {
    return false;
  }
  event.preventDefault();
  const step = event.shiftKey ? 10 : 1;
  const currentX = readElementOffset(
    context.draft,
    context.selectedTargetRoot,
    context.selectedElement.id,
    "offsetX",
    context.selectedStateId,
  );
  const currentY = readElementOffset(
    context.draft,
    context.selectedTargetRoot,
    context.selectedElement.id,
    "offsetY",
    context.selectedStateId,
  );
  context.handlePreviewElementMove(
    context.selectedWidget,
    {
      elementId: context.selectedElement.id,
      offsetX: currentX + delta[0] * step,
      offsetY: currentY + delta[1] * step,
      stateId: context.selectedStateId,
    },
    { commit: true },
  );
  return true;
}

function handleDeleteShortcut(
  event,
  { mode, resetElement, selectedElement, selectedLayerLocked },
) {
  if (
    mode !== "advanced" ||
    event.key !== "Delete" ||
    !selectedElement?.id ||
    selectedLayerLocked
  ) {
    return false;
  }
  event.preventDefault();
  if (window.confirm(`Reset ${selectedElement.label}?`)) resetElement();
  return true;
}

function getPresetAppearance(preset) {
  return preset?.appearance || {};
}

function normalizeControl(control, label) {
  if (!control) return control;
  return label ? { ...control, label } : control;
}

function normalizeBackgroundControl(control, elementId) {
  if (!control) return control;
  if (elementId === "source" && control.id === "bgMode") {
    return {
      ...control,
      label: "Source",
      options: [
        { value: "texture", label: "Texture" },
        { value: "image", label: "Image" },
      ],
    };
  }
  const labels = {
    canvas: {
      background: "Fallback frame colour",
      opacity: "Layer opacity",
      radius: "Canvas radius",
    },
    texture: {
      background: "Base colour",
      accentColor: "Accent colour",
      fillColor: "Depth colour",
      animSpeed: "Animation duration",
    },
    media: {
      opacity: "Media opacity",
      backgroundPosition: "Position",
    },
    tint: {
      background: "Tint colour",
      opacity: "Tint opacity",
    },
    effects: {
      fxGlimpse: "Light sweep",
      fxGlimpseColor: "Light colour",
      fxParticleColor: "Particle colour",
      fxFogColor: "Fog colour",
    },
  };
  return labels[elementId]?.[control.id]
    ? { ...control, label: labels[elementId][control.id] }
    : control;
}

const BACKGROUND_SPECIAL_STYLE_IDS = new Set([
  "aurora",
  "matrix",
  "starfield",
  "waves",
  "geometric",
]);
const BACKGROUND_TEXTURE_SOURCE_CONTROLS = new Set([
  "textureType",
  "background",
  "accentColor",
  "fillColor",
  "gradientAngle",
  "patternSize",
  "animSpeed",
]);
const BACKGROUND_SOLID_TEXTURE_CONTROLS = new Set([
  "textureType",
  "background",
]);
const BACKGROUND_TWO_COLOR_TEXTURE_CONTROLS = new Set([
  "textureType",
  "background",
  "accentColor",
]);
const BACKGROUND_THREE_COLOR_TEXTURE_CONTROLS = new Set([
  "textureType",
  "background",
  "accentColor",
  "fillColor",
]);
const BACKGROUND_ANGLED_TEXTURES = new Set([
  "gradient",
  "metallic",
  "pearl",
  "gloss",
  "conic",
  "diagonal",
]);
const BACKGROUND_PATTERN_TEXTURES = new Set([
  "dots",
  "grid",
  "diagonal",
  "carbon",
]);
const BACKGROUND_ANIMATED_TEXTURES = new Set(["chameleon"]);
const BACKGROUND_SPECIAL_FILL_STYLES = new Set([
  "aurora",
  "waves",
  "geometric",
]);
const BACKGROUND_THREE_COLOR_TEXTURES = new Set([
  "gradient",
  "pearl",
  "chameleon",
  "conic",
]);
const BACKGROUND_TWO_COLOR_TEXTURES = new Set([
  "metallic",
  "gloss",
  "radial",
  "vignette",
  "dots",
  "grid",
  "diagonal",
  "carbon",
  "scanlines",
]);
const BACKGROUND_MEDIA_ALWAYS_CONTROLS = new Set(["imageUrl"]);
const BACKGROUND_MEDIA_ACTIVE_CONTROLS = new Set([
  "imageFit",
  "backgroundPosition",
  "brightness",
  "contrast",
  "saturation",
  "blur",
  "hueRotate",
  "grayscale",
  "sepia",
  "opacity",
]);
const BACKGROUND_PARTICLE_DETAIL_CONTROLS = new Set([
  "fxParticleColor",
  "fxParticleCount",
  "fxParticleSpeed",
  "fxParticleSize",
]);
const BACKGROUND_FOG_DETAIL_CONTROLS = new Set(["fxFogColor"]);
const BACKGROUND_LIGHT_DETAIL_CONTROLS = new Set([
  "fxGlimpseColor",
  "fxGlimpseSpeed",
]);

function getSpecialBackgroundControlIds(styleId) {
  const controls = new Set(["background", "accentColor", "animSpeed"]);
  if (BACKGROUND_SPECIAL_FILL_STYLES.has(styleId)) controls.add("fillColor");
  if (styleId === "aurora") controls.add("gradientAngle");
  return controls;
}

function addTextureDetailControls(controls, textureType) {
  if (BACKGROUND_ANGLED_TEXTURES.has(textureType))
    controls.add("gradientAngle");
  if (BACKGROUND_ANIMATED_TEXTURES.has(textureType)) controls.add("animSpeed");
  if (BACKGROUND_PATTERN_TEXTURES.has(textureType)) controls.add("patternSize");
  return controls;
}

function getTextureBackgroundControlIds(textureType) {
  if (textureType === "none" || textureType === "noise")
    return BACKGROUND_SOLID_TEXTURE_CONTROLS;
  if (BACKGROUND_THREE_COLOR_TEXTURES.has(textureType)) {
    return addTextureDetailControls(
      new Set(BACKGROUND_THREE_COLOR_TEXTURE_CONTROLS),
      textureType,
    );
  }
  if (BACKGROUND_TWO_COLOR_TEXTURES.has(textureType)) {
    return addTextureDetailControls(
      new Set(BACKGROUND_TWO_COLOR_TEXTURE_CONTROLS),
      textureType,
    );
  }
  return BACKGROUND_TEXTURE_SOURCE_CONTROLS;
}

function getBackgroundTextureControlIds(sourceMode, styleId, textureType) {
  if (sourceMode === "special") return getSpecialBackgroundControlIds(styleId);
  if (sourceMode !== "texture") return new Set();
  return getTextureBackgroundControlIds(textureType || "gradient");
}

function getSimpleBackgroundElements(elements = [], sourceMode = "texture") {
  const allowed = new Set(["source", "effects"]);
  if (sourceMode === "texture" || sourceMode === "special")
    allowed.add("texture");
  if (sourceMode === "image") allowed.add("media");
  return elements.filter((element) => allowed.has(element.id));
}

function WidgetIcon({ icon }) {
  if (typeof icon === "string" && icon.length <= 3)
    return <span className="ve-widget-card__emoji">{icon}</span>;
  return <Palette size={18} />;
}

function ToolbarButton({
  children,
  icon: Icon,
  active = false,
  primary = false,
  danger = false,
  ...props
}) {
  return (
    <button
      type="button"
      className={[
        "ve-toolbar-button",
        active ? "is-active" : "",
        primary ? "ve-toolbar-button--primary" : "",
        danger ? "ve-toolbar-button--danger" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {Icon && <Icon size={16} />}
      {children && <span>{children}</span>}
    </button>
  );
}

function ToolbarGroup({ label, children }) {
  return (
    <fieldset className="ve-toolbar-group" aria-label={label}>
      <legend className="ve-toolbar-group__label">{label}</legend>
      <span className="ve-toolbar-group__items">{children}</span>
    </fieldset>
  );
}

function LayerRow({
  active,
  element,
  hidden,
  locked,
  onSelect,
  onToggleLocked,
  onToggleVisibility,
}) {
  return (
    <div className={`ve-layer-row${active ? " is-active" : ""}`}>
      <button type="button" onClick={() => onSelect(element.id)}>
        <span>{element.label}</span>
        <small>{inferElementKind(element)}</small>
      </button>
      <LayerToggleButton
        active={!hidden}
        type="visible"
        label={hidden ? "Show layer" : "Hide layer"}
        onClick={() => onToggleVisibility(element.id)}
      />
      <LayerToggleButton
        active={locked}
        type="locked"
        label={locked ? "Unlock layer editing" : "Lock layer editing"}
        onClick={onToggleLocked}
      />
    </div>
  );
}

function LayerGroupSection({
  draft,
  group,
  lockedLayers,
  onSelect,
  onToggleLocked,
  onToggleVisibility,
  selectedElementId,
  selectedTargetRoot,
  selectedWidgetId,
}) {
  return (
    <section key={group.id} className="ve-layer-group">
      <h3>{group.label}</h3>
      {group.items.map((element) => {
        const key = layerKey(selectedWidgetId, element.id);
        return (
          <LayerRow
            key={element.id}
            active={element.id === selectedElementId}
            element={element}
            hidden={
              !getElementVisibleFromAppearance(
                draft,
                selectedTargetRoot,
                element.id,
              )
            }
            locked={!!lockedLayers[key]}
            onSelect={onSelect}
            onToggleLocked={() => onToggleLocked(key)}
            onToggleVisibility={onToggleVisibility}
          />
        );
      })}
    </section>
  );
}

function LayersPanel({
  draft,
  lockedLayers,
  onSelect,
  onToggleLocked,
  onToggleVisibility,
  selectedElementId,
  selectedTargetRoot,
  selectedWidgetId,
  visibleLayerRows,
}) {
  return (
    <div className="ve-sidebar-scroll ve-layers">
      <div className="ve-layer-intro">
        <MousePointer2 size={17} />
        <span>
          Click the preview or choose a layer. The right panel will only show
          controls for that part.
        </span>
      </div>
      {visibleLayerRows.map((group) => (
        <LayerGroupSection
          key={group.id}
          draft={draft}
          group={group}
          lockedLayers={lockedLayers}
          onSelect={onSelect}
          onToggleLocked={onToggleLocked}
          onToggleVisibility={onToggleVisibility}
          selectedElementId={selectedElementId}
          selectedTargetRoot={selectedTargetRoot}
          selectedWidgetId={selectedWidgetId}
        />
      ))}
    </div>
  );
}

function WidgetSelectorCard({
  active,
  edited,
  onMoveLayer,
  onSelect,
  onToggleVisibility,
  orderedLayers,
  simple,
  widget,
}) {
  const categoryLabel =
    WIDGET_CATEGORY_FILTERS.find(
      (item) => item.id === getWidgetCategory(widget),
    )?.label || "Other";
  const layerIndex = orderedLayers.findIndex((item) => item.id === widget.id);
  const layerNumber =
    layerIndex >= 0 ? layerIndex + 1 : Number(widget.z_index) || 1;
  const canMoveDown = layerIndex > 0;
  const canMoveUp = layerIndex >= 0 && layerIndex < orderedLayers.length - 1;
  const visibilityTitle = widget.is_visible
    ? "Disable widget on overlay"
    : "Enable widget on overlay";
  const visibilityLabel = widget.is_visible ? "Enabled" : "Disabled";
  return (
    <div
      className={`ve-widget-card${active ? " is-active" : ""}${simple ? " ve-widget-card--simple" : ""}`}
    >
      <button
        type="button"
        className="ve-widget-card__select"
        onClick={onSelect}
      >
        <span className="ve-widget-card__thumb">
          <WidgetIcon icon={getWidgetIcon(widget)} />
        </span>
        <span className="ve-widget-card__body">
          <strong>{getWidgetDisplayName(widget)}</strong>
          <small>Category: {categoryLabel}</small>
        </span>
      </button>
      <div className="ve-widget-card__actions">
        <button
          type="button"
          className={`ve-widget-toggle${widget.is_visible ? " is-on" : ""}`}
          onClick={onToggleVisibility}
          title={visibilityTitle}
          aria-pressed={widget.is_visible}
        >
          <span />
          <strong>{visibilityLabel}</strong>
        </button>
        <div
          className="ve-widget-layer-controls"
          aria-label={`${getWidgetDisplayName(widget)} layer order`}
        >
          <button
            type="button"
            onClick={(event) => onMoveLayer(widget, "up", event)}
            disabled={!canMoveUp}
            title="Move above"
            aria-label={`Move ${getWidgetDisplayName(widget)} above`}
          >
            <ArrowUp size={13} />
          </button>
          <span title="Layer position">L{layerNumber}</span>
          <button
            type="button"
            onClick={(event) => onMoveLayer(widget, "down", event)}
            disabled={!canMoveDown}
            title="Move below"
            aria-label={`Move ${getWidgetDisplayName(widget)} below`}
          >
            <ArrowDown size={13} />
          </button>
        </div>
      </div>
      {edited && <span className="ve-edited-dot" title="Style edited" />}
    </div>
  );
}

function WidgetSelectorPanel({
  draft,
  filteredWidgets,
  onMoveLayer,
  onSearchChange,
  onSelectWidget,
  onToggleVisibility,
  search,
  selectedWidgetId,
  simple,
  widgets,
}) {
  const orderedLayers = getOrderedLayerWidgets(widgets);
  return (
    <div
      className={`ve-sidebar-scroll${simple ? " ve-sidebar-scroll--simple" : ""}`}
    >
      {simple && (
        <div className="ve-simple-sidebar-head">
          <strong>Widgets</strong>
          <span>Choose which overlay tool you want to style.</span>
        </div>
      )}
      <div className="ve-search">
        <Search size={15} />
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search widgets"
          aria-label="Search widgets"
        />
      </div>
      <div className="ve-widget-list">
        {filteredWidgets.map((widget) => (
          <WidgetSelectorCard
            key={widget.id}
            active={selectedWidgetId === widget.id}
            edited={!!getByPath(draft, `widgets.${widget.id}`)}
            onMoveLayer={onMoveLayer}
            onSelect={() => onSelectWidget(widget)}
            onToggleVisibility={(event) => onToggleVisibility(widget, event)}
            orderedLayers={orderedLayers}
            simple={simple}
            widget={widget}
          />
        ))}
        {!filteredWidgets.length && (
          <EmptyState title="No widgets found">Try another search.</EmptyState>
        )}
      </div>
    </div>
  );
}

function LeftSidebar({
  draft,
  filteredWidgets,
  lockedLayers,
  mode,
  onLayerSelect,
  onMoveLayer,
  onSearchChange,
  onSelectWidget,
  onSidebarTabChange,
  onToggleElementVisibility,
  onToggleLayerLocked,
  onToggleWidgetVisibility,
  search,
  selectedElementId,
  selectedTargetRoot,
  selectedWidgetId,
  sidebarTab,
  visibleLayerRows,
  widgets,
}) {
  const showWidgetSelector = mode === "simple" || sidebarTab === "widgets";
  return (
    <aside
      className={`ve-left-panel${mode === "simple" ? " ve-left-panel--simple" : ""}`}
    >
      {mode === "advanced" && (
        <div
          className="ve-panel-tabs"
          role="tablist"
          aria-label="Editor sidebar"
        >
          <button
            type="button"
            className={sidebarTab === "widgets" ? "is-active" : ""}
            onClick={() => onSidebarTabChange("widgets")}
          >
            <Palette size={16} />
            Widgets
          </button>
          <button
            type="button"
            className={sidebarTab === "layers" ? "is-active" : ""}
            onClick={() => onSidebarTabChange("layers")}
          >
            <Layers size={16} />
            Layers
          </button>
        </div>
      )}

      {showWidgetSelector ? (
        <WidgetSelectorPanel
          draft={draft}
          filteredWidgets={filteredWidgets}
          onMoveLayer={onMoveLayer}
          onSearchChange={onSearchChange}
          onSelectWidget={onSelectWidget}
          onToggleVisibility={onToggleWidgetVisibility}
          search={search}
          selectedWidgetId={selectedWidgetId}
          simple
          widgets={widgets}
        />
      ) : (
        <LayersPanel
          draft={draft}
          lockedLayers={lockedLayers}
          onSelect={onLayerSelect}
          onToggleLocked={onToggleLayerLocked}
          onToggleVisibility={onToggleElementVisibility}
          selectedElementId={selectedElementId}
          selectedTargetRoot={selectedTargetRoot}
          selectedWidgetId={selectedWidgetId}
          visibleLayerRows={visibleLayerRows}
        />
      )}
    </aside>
  );
}

function DraftLiveStatus({
  dirty,
  hasUnpublishedChanges,
  publishStatus,
  saveStatus,
}) {
  const saveStatusIcon =
    saveStatus === "saved" && !dirty ? (
      <CheckCircle2 size={14} />
    ) : (
      <span className="ve-status-dot" />
    );
  return (
    <span className="ve-status-stack" aria-label="Draft and OBS publish status">
      <span
        className={`ve-save-status ve-save-status--${saveStatus}${dirty ? " ve-save-status--dirty" : ""}`}
      >
        {saveStatusIcon}
        {formatDraftStatus(saveStatus, dirty)}
      </span>
      <span
        className={`ve-live-status ve-live-status--${publishStatusClass(publishStatus, hasUnpublishedChanges || dirty)}`}
      >
        {formatPublishStatus(publishStatus, hasUnpublishedChanges || dirty)}
      </span>
    </span>
  );
}

function EditingToolbar({
  onRedo,
  onSetPreviewMode,
  onUndo,
  previewMode,
  redoDisabled,
  undoDisabled,
}) {
  return (
    <ToolbarGroup label="Editing">
      <ToolbarButton
        icon={Undo2}
        disabled={undoDisabled}
        onClick={onUndo}
        title="Undo (Ctrl+Z)"
      />
      <ToolbarButton
        icon={Redo2}
        disabled={redoDisabled}
        onClick={onRedo}
        title="Redo (Ctrl+Shift+Z)"
      />
      <ToolbarButton
        icon={MonitorPlay}
        active={previewMode === "fit-widget"}
        onClick={() => onSetPreviewMode("fit-widget")}
      >
        Focused
      </ToolbarButton>
      <ToolbarButton
        icon={Monitor}
        active={previewMode === "full-overlay"}
        onClick={() => onSetPreviewMode("full-overlay")}
      >
        Full Overlay
      </ToolbarButton>
    </ToolbarGroup>
  );
}

function PreviewToolbar({
  obsSafe,
  onSetObsSafe,
  onSetPreviewBackground,
  onSetPreviewStateByWidget,
  onToggleBefore,
  previewBackground,
  previewStateOptions,
  selectedPreviewState,
  selectedWidgetId,
  showBefore,
}) {
  const showPreviewStates = !!previewStateOptions.length && !!selectedWidgetId;
  return (
    <ToolbarGroup label="Preview">
      <fieldset
        className="ve-toolbar-backgrounds"
        aria-label="Canvas background"
      >
        {PREVIEW_BACKGROUNDS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={previewBackground === item.id ? "is-active" : ""}
            onClick={() => onSetPreviewBackground(item.id)}
          >
            {item.id === "green" ? "Green Screen" : item.label}
          </button>
        ))}
      </fieldset>
      <ToolbarButton active={showBefore} onClick={onToggleBefore}>
        Before
      </ToolbarButton>
      <label className="ve-toolbar-check">
        <input
          type="checkbox"
          checked={obsSafe}
          onChange={(event) => onSetObsSafe(event.target.checked)}
        />
        <span>Safe frame</span>
      </label>
      {showPreviewStates && (
        <fieldset
          className="ve-preview-state-picker"
          aria-label="Preview state"
        >
          {previewStateOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              className={selectedPreviewState === option.id ? "is-active" : ""}
              onClick={() =>
                onSetPreviewStateByWidget((prev) => ({
                  ...prev,
                  [selectedWidgetId]: option.id,
                }))
              }
            >
              {option.label}
            </button>
          ))}
        </fieldset>
      )}
    </ToolbarGroup>
  );
}

function ViewToolbar({
  onEnterFullscreen,
  onFocusPreview,
  onOpenPreview,
  onUpdateZoom,
  previewOpen,
  zoom,
}) {
  const zoomLabel = zoom === "fit" ? "Fit" : `${zoom}%`;
  return (
    <ToolbarGroup label="View">
      <ToolbarButton icon={ExternalLink} onClick={onOpenPreview}>
        Pop-out
      </ToolbarButton>
      {previewOpen && (
        <ToolbarButton icon={Eye} onClick={onFocusPreview}>
          Focus
        </ToolbarButton>
      )}
      <ToolbarButton icon={Maximize2} onClick={onEnterFullscreen}>
        Fullscreen
      </ToolbarButton>
      <ToolbarButton
        active={zoom === "fit"}
        onClick={() => onUpdateZoom("fit")}
      >
        Fit
      </ToolbarButton>
      <ToolbarButton
        icon={ZoomOut}
        onClick={() => onUpdateZoom("out")}
        title="Zoom out"
      />
      <span className="ve-zoom-label">{zoomLabel}</span>
      <ToolbarButton
        icon={ZoomIn}
        onClick={() => onUpdateZoom("in")}
        title="Zoom in"
      />
    </ToolbarGroup>
  );
}

function ModeToolbar({ mode, onModeChange }) {
  return (
    <ToolbarGroup label="Mode">
      <fieldset className="ve-mode-switch" aria-label="Editor mode">
        <button
          type="button"
          className={mode === "simple" ? "is-active" : ""}
          onClick={() => onModeChange("simple")}
        >
          Simple
        </button>
        <button
          type="button"
          className={mode === "advanced" ? "is-active" : ""}
          onClick={() => onModeChange("advanced")}
        >
          Advanced
        </button>
      </fieldset>
    </ToolbarGroup>
  );
}

function ActionsToolbar({
  draft,
  importStylesInputRef,
  onExportStyles,
  onImportStyles,
  onPersistDraft,
  onPublish,
  onResetWidget,
  publishStatus,
}) {
  return (
    <ToolbarGroup label="Actions">
      <input
        ref={importStylesInputRef}
        type="file"
        accept="application/json,.json"
        className="ve-file-input"
        onChange={onImportStyles}
        aria-hidden="true"
        tabIndex={-1}
      />
      <ToolbarButton icon={Download} onClick={onExportStyles}>
        Export Styles
      </ToolbarButton>
      <ToolbarButton
        icon={Upload}
        onClick={() => importStylesInputRef.current?.click()}
      >
        Import Styles
      </ToolbarButton>
      <ToolbarButton icon={RotateCcw} onClick={onResetWidget}>
        Reset
      </ToolbarButton>
      <ToolbarButton
        icon={Save}
        onClick={() => onPersistDraft(draft, "manual")}
      >
        Save Draft
      </ToolbarButton>
      <ToolbarButton
        icon={ExternalLink}
        primary
        onClick={onPublish}
        disabled={publishStatus === "publishing"}
      >
        Publish to OBS
      </ToolbarButton>
    </ToolbarGroup>
  );
}

function AppearanceTopbar({
  currentWidgetScopeLabel,
  dirty,
  draft,
  enterCanvasFullscreen,
  exportWidgetStyles,
  hasUnpublishedChanges,
  handleModeChange,
  importStylesInputRef,
  importWidgetStyles,
  mode,
  onFocusPreview,
  onOpenPreview,
  obsSafe,
  persistDraft,
  previewBackground,
  previewMode,
  previewOpen,
  previewStateOptions,
  publish,
  publishStatus,
  redo,
  redoDisabled,
  resetWidget,
  saveStatus,
  selectedAppearanceId,
  selectedPreviewState,
  selectedWidgetId,
  selectedWidgetName,
  setObsSafe,
  setPreviewBackground,
  setPreviewMode,
  setPreviewStateByWidget,
  setShowBefore,
  showBefore,
  undo,
  undoDisabled,
  updateZoom,
  zoom,
}) {
  return (
    <div className="ve-topbar">
      <div className="ve-topbar__left">
        <a className="ve-back-link" href="/overlay-center">
          <ArrowLeft size={16} />
          Overlay Center
        </a>
        <div className="ve-current-widget">
          <span>{selectedWidgetName}</span>
          <small>{selectedAppearanceId || currentWidgetScopeLabel}</small>
        </div>
        <DraftLiveStatus
          dirty={dirty}
          hasUnpublishedChanges={hasUnpublishedChanges}
          publishStatus={publishStatus}
          saveStatus={saveStatus}
        />
      </div>
      <div
        className="ve-topbar__tools"
        role="toolbar"
        aria-label="Appearance editor tools"
      >
        <EditingToolbar
          onRedo={redo}
          onSetPreviewMode={setPreviewMode}
          onUndo={undo}
          previewMode={previewMode}
          redoDisabled={redoDisabled}
          undoDisabled={undoDisabled}
        />
        <PreviewToolbar
          obsSafe={obsSafe}
          onSetObsSafe={setObsSafe}
          onSetPreviewBackground={setPreviewBackground}
          onSetPreviewStateByWidget={setPreviewStateByWidget}
          onToggleBefore={() => setShowBefore((value) => !value)}
          previewBackground={previewBackground}
          previewStateOptions={previewStateOptions}
          selectedPreviewState={selectedPreviewState}
          selectedWidgetId={selectedWidgetId}
          showBefore={showBefore}
        />
        <ViewToolbar
          onEnterFullscreen={enterCanvasFullscreen}
          onFocusPreview={onFocusPreview}
          onOpenPreview={onOpenPreview}
          onUpdateZoom={updateZoom}
          previewOpen={previewOpen}
          zoom={zoom}
        />
        <ModeToolbar mode={mode} onModeChange={handleModeChange} />
        <ActionsToolbar
          draft={draft}
          importStylesInputRef={importStylesInputRef}
          onExportStyles={exportWidgetStyles}
          onImportStyles={importWidgetStyles}
          onPersistDraft={persistDraft}
          onPublish={publish}
          onResetWidget={resetWidget}
          publishStatus={publishStatus}
        />
      </div>
    </div>
  );
}

function AppearanceStatusLine({ dirty, onDiscardUnsaved, statusMessage }) {
  if (!statusMessage) return null;
  return (
    <output className="ve-status-line">
      {statusMessage}
      {dirty && (
        <button type="button" onClick={onDiscardUnsaved}>
          Discard unsaved changes
        </button>
      )}
    </output>
  );
}

function CanvasPreviewPanel({
  canvasPanelRef,
  handlePreviewElementMove,
  handlePreviewElementSelect,
  handlePreviewMove,
  handlePreviewResize,
  handlePreviewWidgetSelect,
  mode,
  obsSafe,
  performance,
  previewAppearance,
  previewBackground,
  previewMode,
  previewStateByWidget,
  previewWidgets,
  selectedElement,
  selectedElements,
  selectedHiddenElementIds,
  selectedTarget,
  selectedWidget,
  selectedWidgetType,
  styleSelections,
  theme,
  userId,
  zoom,
}) {
  const footerText =
    mode === "simple"
      ? "Simple Mode styles the whole selected widget. Fine-tune parts in Advanced Mode."
      : "Click text, cards, images or bars to edit that exact part.";
  const hiddenElementIds = mode === "advanced" ? selectedHiddenElementIds : [];
  const resizeHandler = mode === "advanced" ? handlePreviewResize : undefined;
  const moveElementHandler = ["navbar", "rtp_stats"].includes(
    selectedWidgetType,
  )
    ? handlePreviewElementMove
    : undefined;
  return (
    <main className="ve-canvas-panel" ref={canvasPanelRef}>
      <div
        className={`ve-preview-shell${obsSafe ? " ve-preview-shell--safe" : ""}`}
      >
        <OverlayPreview
          widgets={previewWidgets}
          theme={theme}
          appearance={previewAppearance}
          userId={userId}
          previewSampleStates={previewStateByWidget}
          selectedWidgetId={selectedWidget?.id}
          selectedTarget={selectedTarget}
          selectedElementId={selectedElement?.id || ""}
          hiddenElementIds={hiddenElementIds}
          styleSelections={styleSelections}
          zoom={zoom === "fit" ? "fit" : `${zoom}%`}
          previewMode={previewMode}
          previewBackground={previewBackground}
          selectMode={selectedElements.length > 1}
          onSelectWidget={handlePreviewWidgetSelect}
          onSelectElement={handlePreviewElementSelect}
          onResizeWidget={resizeHandler}
          onMoveWidget={handlePreviewMove}
          onMoveElement={moveElementHandler}
        />
      </div>

      <div className="ve-canvas-footer">
        <span>
          <MousePointer2 size={15} /> {footerText}
        </span>
        <span className={`ve-performance ve-performance--${performance.tone}`}>
          {performance.label}
        </span>
      </div>
    </main>
  );
}

function AppearanceToast({ toast }) {
  if (!toast) return null;
  return <output className="ve-toast">{toast}</output>;
}

function Show({ children, when }) {
  if (!when) return null;
  return children;
}

function sectionVisible(sections, sectionId, enabled = true) {
  return enabled && sections.includes(sectionId);
}

function hasSimpleQuickPresets(presets = []) {
  return presets.some((preset) => preset.isSimpleQuickStyle);
}

function hasItems(items = []) {
  return items.length > 0;
}

function showDevV2Diagnostics(selectedWidgetUsesV2) {
  return Boolean(import.meta.env.DEV && selectedWidgetUsesV2);
}

function getAdvancedPanelTitle(selectedElement, selectedWidgetName) {
  return selectedElement?.label || selectedWidgetName;
}

function getLayerEditabilityLabel(selectedLayerLocked) {
  return selectedLayerLocked ? "Locked" : "Editable";
}

function getWarningMeta(warnings = []) {
  return `${warnings.length} warning${warnings.length === 1 ? "" : "s"}`;
}

function showLegacySurfaceControls(editingWholeWidget, selectedWidgetUsesV2) {
  return editingWholeWidget && !selectedWidgetUsesV2;
}

function shouldShowRtpMetalControls({
  selectedTarget,
  selectedWidget,
  selectedWidgetType,
}) {
  return Boolean(
    selectedWidgetType === "rtp_stats" &&
    selectedTarget.styleId === "metal" &&
    selectedWidget,
  );
}

function shouldShowBonusHuntColorSyncControls(
  selectedWidgetType,
  selectedWidget,
) {
  return Boolean(
    BONUS_HUNT_COLOR_SYNC_WIDGET_TYPES.has(selectedWidgetType) &&
    selectedWidget,
  );
}

function countSelectedWidgetOverrides(draft, selectedTargetRoot) {
  if (!selectedTargetRoot) return 0;
  return countObjectLeaves(getByPath(draft, selectedTargetRoot));
}

function isEditingWholeWidget(selectedElement) {
  return !selectedElement || ["container", "root"].includes(selectedElement.id);
}

function getVisibleElementControlGroups(selectedElement, mode) {
  if (!selectedElement) return [];
  return getElementControlGroups(selectedElement, mode).filter((group) =>
    group.controls.some((control) =>
      elementSupportsControl(selectedElement, control.id),
    ),
  );
}

function syncAdvancedControlSection({
  controlGroups,
  mode,
  selectedElement,
  setOpenAdvancedSections,
}) {
  if (mode !== "advanced") return;
  const preferredSection = selectedElement
    ? `control-${controlGroups[0]?.id || ""}`
    : "advanced";
  if (!preferredSection || preferredSection === "control-") return;
  setOpenAdvancedSections((prev) => {
    if (prev.includes(preferredSection))
      return prev.length <= 2 ? prev : prev.slice(0, 2);
    return [preferredSection, ...prev].slice(0, 2);
  });
}

function AdvancedTour({ onHideTour, onSetTourHidden, tourVisible }) {
  return (
    <Show when={tourVisible}>
      <section className="ve-tour">
        <div>
          <Wand2 size={18} />
          <strong>Quick tour</strong>
        </div>
        <ol>
          <li>Choose a widget.</li>
          <li>Click an element in the preview.</li>
          <li>Change its style here.</li>
          <li>Test the preview.</li>
          <li>Publish it to OBS.</li>
        </ol>
        <div>
          <button type="button" onClick={onHideTour}>
            Skip
          </button>
          <button type="button" onClick={onSetTourHidden}>
            Do not show again
          </button>
        </div>
      </section>
    </Show>
  );
}

function AdvancedSurfaceSection({
  editingWholeWidget,
  onToggle,
  openSections,
  renderQuickControl,
  selectedWidgetOverrides,
  selectedWidgetUsesV2,
}) {
  return (
    <Show
      when={showLegacySurfaceControls(editingWholeWidget, selectedWidgetUsesV2)}
    >
      <CollapsibleSection
        id="surfaceBackground"
        title="Surface and background"
        meta={`${selectedWidgetOverrides} custom values`}
        openSections={openSections}
        onToggle={onToggle}
      >
        <div className="ve-control-grid">
          {QUICK_WIDGET_CONTROLS.map((control) => {
            const renderedControl = renderQuickControl(control);
            return renderedControl;
          })}
        </div>
      </CollapsibleSection>
    </Show>
  );
}

function AdvancedSelectedElementSections({
  controlGroups,
  onToggle,
  openSections,
  renderElementControl,
  selectedElement,
  selectedLayerLocked,
  selectedStateId,
}) {
  return (
    <>
      <Show when={selectedElement?.kind === "mixed"}>
        <div className="ve-context-note">
          Changes apply to the selected layer only. If this is a repeated item,
          the widget may share the style across matching items.
        </div>
      </Show>
      <Show when={selectedLayerLocked}>
        <div className="ve-warning">
          <AlertTriangle size={15} />
          This layer is locked. Unlock it in the Layers panel to edit it.
        </div>
      </Show>
      <Show when={selectedStateId !== "default"}>
        <div className="ve-context-note">
          Editing the "{selectedStateId}" state for this element.
        </div>
      </Show>
      <Show when={hasItems(controlGroups)}>
        {controlGroups.map((group) => (
          <CollapsibleSection
            key={group.id}
            id={`control-${group.id}`}
            title={mapControlGroupTitle(group.label)}
            meta={group.label}
            openSections={openSections}
            onToggle={onToggle}
          >
            <div className="ve-control-grid">
              {group.controls.map(renderElementControl)}
            </div>
          </CollapsibleSection>
        ))}
      </Show>
      <Show when={!hasItems(controlGroups)}>
        <EmptyState title="No controls for this element">
          This widget style does not expose editable appearance options for the
          selected part.
        </EmptyState>
      </Show>
    </>
  );
}

function AdvancedSpacingSection({
  editingWholeWidget,
  onToggle,
  openSections,
}) {
  return (
    <Show when={editingWholeWidget}>
      <CollapsibleSection
        id="spacingSizing"
        title="Spacing and sizing"
        meta="Advanced"
        openSections={openSections}
        onToggle={onToggle}
      >
        <div className="ve-context-note">
          OBS is the primary target. Device-specific overrides inherit the
          default value until you set one here.
        </div>
      </CollapsibleSection>
    </Show>
  );
}

function AdvancedResetButtons({
  editingWholeWidget,
  onResetAll,
  onResetElement,
  onResetWidget,
  selectedElement,
  selectedLayerLocked,
}) {
  return (
    <div className="ve-reset-row">
      <button
        type="button"
        onClick={onResetElement}
        disabled={!selectedElement || selectedLayerLocked}
      >
        Reset element
      </button>
      <Show when={editingWholeWidget}>
        <button type="button" onClick={onResetWidget}>
          Reset widget
        </button>
        <button type="button" className="danger" onClick={onResetAll}>
          Reset all
        </button>
      </Show>
    </div>
  );
}

function AdvancedWarningsSection({
  editingWholeWidget,
  onResetAll,
  onResetElement,
  onResetWidget,
  onToggle,
  openSections,
  selectedElement,
  selectedLayerLocked,
  warnings,
}) {
  return (
    <CollapsibleSection
      id="advanced"
      title="Advanced"
      meta={getWarningMeta(warnings)}
      openSections={openSections}
      onToggle={onToggle}
    >
      <div className="ve-warning-list">
        <Show when={!warnings.length}>
          <p>No obvious design problems found.</p>
        </Show>
        {warnings.map((warning) => (
          <div key={warning.id} className="ve-warning">
            <AlertTriangle size={15} />
            <span>{warning.label}</span>
          </div>
        ))}
      </div>
      <AdvancedResetButtons
        editingWholeWidget={editingWholeWidget}
        onResetAll={onResetAll}
        onResetElement={onResetElement}
        onResetWidget={onResetWidget}
        selectedElement={selectedElement}
        selectedLayerLocked={selectedLayerLocked}
      />
    </CollapsibleSection>
  );
}

function AdvancedPropertiesPanel({
  advancedSectionTabs,
  controlGroups,
  editingWholeWidget,
  onDeselectElement,
  onHideTour,
  onResetAll,
  onResetElement,
  onResetWidget,
  onSetTourHidden,
  onToggleSection,
  openSections,
  renderElementControl,
  renderQuickControl,
  selectedElement,
  selectedLayerLocked,
  selectedStateId,
  selectedWidgetName,
  selectedWidgetOverrides,
  selectedWidgetUsesV2,
  tourVisible,
  warnings,
}) {
  return (
    <aside className="ve-right-panel">
      <div className="ve-properties-header">
        <div>
          <strong>
            {getAdvancedPanelTitle(selectedElement, selectedWidgetName)}
          </strong>
          <span>
            {getModeLabel("advanced")} ·{" "}
            {getLayerEditabilityLabel(selectedLayerLocked)}
          </span>
        </div>
        <button
          type="button"
          className="ve-icon-button"
          onClick={onDeselectElement}
          aria-label="Deselect element"
        >
          <X size={16} />
        </button>
      </div>

      <AdvancedTour
        onHideTour={onHideTour}
        onSetTourHidden={onSetTourHidden}
        tourVisible={tourVisible}
      />

      <div className="ve-properties-scroll">
        <SectionTabs
          sections={advancedSectionTabs}
          openSections={openSections}
          onToggle={onToggleSection}
        />

        <AdvancedSurfaceSection
          editingWholeWidget={editingWholeWidget}
          onToggle={onToggleSection}
          openSections={openSections}
          renderQuickControl={renderQuickControl}
          selectedWidgetOverrides={selectedWidgetOverrides}
          selectedWidgetUsesV2={selectedWidgetUsesV2}
        />

        <Show when={!!selectedElement}>
          <AdvancedSelectedElementSections
            controlGroups={controlGroups}
            onToggle={onToggleSection}
            openSections={openSections}
            renderElementControl={renderElementControl}
            selectedElement={selectedElement}
            selectedLayerLocked={selectedLayerLocked}
            selectedStateId={selectedStateId}
          />
        </Show>
        <Show when={!selectedElement}>
          <EmptyState title="No element selected">
            Click a title, card, image or row in the preview to edit it
            directly.
          </EmptyState>
        </Show>

        <AdvancedSpacingSection
          editingWholeWidget={editingWholeWidget}
          onToggle={onToggleSection}
          openSections={openSections}
        />

        <AdvancedWarningsSection
          editingWholeWidget={editingWholeWidget}
          onResetAll={onResetAll}
          onResetElement={onResetElement}
          onResetWidget={onResetWidget}
          onToggle={onToggleSection}
          openSections={openSections}
          selectedElement={selectedElement}
          selectedLayerLocked={selectedLayerLocked}
          warnings={warnings}
        />
      </div>
    </aside>
  );
}

function CollapsibleSection({
  id,
  title,
  meta,
  openSections,
  onToggle,
  children,
  className = "",
}) {
  const open = openSections.includes(id);
  return (
    <section
      className={`ve-property-section ve-collapsible-section ${className}${open ? " is-open" : ""}`}
    >
      <button
        type="button"
        className="ve-collapsible-section__header"
        onClick={() => onToggle(id)}
        aria-expanded={open}
      >
        <span>{title}</span>
        {meta && <em>{meta}</em>}
      </button>
      {open && <div className="ve-collapsible-section__body">{children}</div>}
    </section>
  );
}

function SectionTabs({ sections = [], openSections = [], onToggle }) {
  if (!sections.length) return null;
  return (
    <nav className="ve-section-tabs" aria-label="Settings sections">
      {sections.map((section) => (
        <SectionTabButton
          key={section.id}
          active={openSections.includes(section.id)}
          onToggle={onToggle}
          section={section}
        />
      ))}
    </nav>
  );
}

function SectionTabButton({ active, onToggle, section }) {
  return (
    <button
      type="button"
      className={active ? "is-active" : ""}
      onClick={() => onToggle(section.id)}
      aria-pressed={active}
    >
      {section.label}
    </button>
  );
}

function EmptyState({ title, children }) {
  return (
    <div className="ve-empty-state">
      <Sparkles size={18} />
      <strong>{title}</strong>
      <p>{children}</p>
    </div>
  );
}

export default function AppearanceCenter({
  user,
  instance,
  theme,
  widgets = [],
  overlayState,
  saveTheme,
  saveWidget,
  addWidget,
  updateState,
  onOpenPreview,
  onFocusPreview,
  previewStatus,
}) {
  const clientIdRef = useRef(createClientId());
  const saveTimerRef = useRef(null);
  const importStylesInputRef = useRef(null);
  const serverState = useMemo(
    () => buildOverlayAppearanceState(overlayState || {}, { theme, widgets }),
    [overlayState, theme, widgets],
  );
  const firstWidget = useMemo(() => getFirstWidget(widgets), [widgets]);
  const [mode, setMode] = useState(getInitialMode);
  const [draft, setDraft] = useState(() => serverState.draft);
  const [selectedTarget, setSelectedTarget] = useState(() =>
    createTarget(firstWidget, serverState.draft),
  );
  const [selectedElementId, setSelectedElementId] = useState(() => {
    const target = createTarget(firstWidget, serverState.draft);
    return (
      getFirstElementForStyle(firstWidget?.widget_type, target.styleId)?.id ||
      ""
    );
  });
  const [selectedStateId, setSelectedStateId] = useState("default");
  const [sidebarTab, setSidebarTab] = useState("widgets");
  const [widgetSearch, setWidgetSearch] = useState("");
  const [previewMode, setPreviewMode] = useState(
    () =>
      EDITOR_MODE_CAPABILITIES[getInitialMode()]?.previewMode || "fit-widget",
  );
  const [previewBackground, setPreviewBackground] = useState("dark");
  const [previewStateByWidget, setPreviewStateByWidget] = useState({});
  const [previewPositions, setPreviewPositions] = useState({});
  const [previewConfigPatches, setPreviewConfigPatches] = useState({});
  const [previewElementOffsets, setPreviewElementOffsets] = useState({});
  const [zoom, setZoom] = useState("fit");
  const [obsSafe, setObsSafe] = useState(true);
  const [showBefore, setShowBefore] = useState(false);
  const [saveStatus, setSaveStatus] = useState("saved");
  const [publishStatus, setPublishStatus] = useState("published");
  const [statusMessage, setStatusMessage] = useState("");
  const [openSimpleSections, setOpenSimpleSections] = useState([
    "widgetStyle",
    "editing",
  ]);
  const [openAdvancedSections, setOpenAdvancedSections] = useState([
    "partSelection",
  ]);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [lockedLayers, setLockedLayers] = useState({});
  const [tourVisible, setTourVisible] = useState(getInitialTourVisible);
  const [recentColors, setRecentColors] = useState(getInitialRecentColors);
  const [toast, setToast] = useState("");
  const canvasPanelRef = useRef(null);
  const lastPersistedDraftRef = useRef(safeJson(serverState.draft));
  const lastPublishedRef = useRef(safeJson(serverState.published || {}));
  const lastRevisionRef = useRef(serverState.revision);

  const selectedWidget = useMemo(
    () => getSelectedWidget(widgets, selectedTarget, firstWidget),
    [widgets, selectedTarget.widgetId, firstWidget],
  );
  const selectedWidgetConfig = useMemo(
    () => getSelectedWidgetConfig(selectedWidget, previewConfigPatches),
    [previewConfigPatches, selectedWidget],
  );
  const previewWidgets = useMemo(
    () => buildPreviewWidgets(widgets, previewPositions, previewConfigPatches),
    [previewConfigPatches, previewPositions, widgets],
  );
  const previewAppearance = useMemo(
    () =>
      buildPreviewAppearance({
        draft,
        previewElementOffsets,
        serverState,
        showBefore,
        widgets,
      }),
    [draft, previewElementOffsets, serverState, showBefore, widgets],
  );
  const selectedWidgetName = getSelectedWidgetName(selectedWidget);
  const selectedWidgetType = getSelectedWidgetType(
    selectedWidget,
    selectedTarget,
  );
  const rtpMetalSettings = useMemo(
    () => normalizeRtpMetalSettings(selectedWidgetConfig.rtpMetal || {}),
    [selectedWidgetConfig],
  );
  const bonusHuntColorSyncSettings = useMemo(
    () =>
      normalizeBonusHuntColorSync(
        selectedWidgetConfig.bonusHuntColorSync || {},
      ),
    [selectedWidgetConfig],
  );
  const bonusHuntMetalColors = useMemo(
    () => getBonusHuntMetalColors(widgets),
    [widgets],
  );
  const showRtpMetalControls = shouldShowRtpMetalControls({
    selectedTarget,
    selectedWidget,
    selectedWidgetType,
  });
  const showBonusHuntColorSyncControls = shouldShowBonusHuntColorSyncControls(
    selectedWidgetType,
    selectedWidget,
  );
  const selectedWidgetUsesV2 = isWidgetAppearanceV2Enabled(selectedWidgetType);
  const selectedWidgetIsBackground = selectedWidgetType === "background";
  const selectedTargetRoot = useMemo(
    () => getTargetOverrideRoot(selectedTarget),
    [selectedTarget],
  );
  const currentSimpleSettings = useMemo(
    () =>
      getSimpleSettingsAtRoot(draft, selectedTargetRoot, selectedWidgetType),
    [draft, selectedTargetRoot, selectedWidgetType],
  );
  const currentSimpleAppearance = useMemo(
    () => generateSimpleAppearance(currentSimpleSettings),
    [currentSimpleSettings],
  );
  const visibleMaterialPresets = useMemo(
    () => getVisibleMaterialPresets(selectedWidgetType, selectedWidgetUsesV2),
    [selectedWidgetType, selectedWidgetUsesV2],
  );
  const registeredStyleOptions = useMemo(
    () => getWidgetStyleOptions(selectedWidgetType, draft, selectedWidget?.id),
    [draft, selectedWidget?.id, selectedWidgetType],
  );
  const quickStyleOptions = useMemo(
    () =>
      getQuickStyleOptions({
        draft,
        registeredStyleOptions,
        selectedWidget,
        selectedWidgetType,
        selectedWidgetUsesV2,
      }),
    [
      draft,
      registeredStyleOptions,
      selectedWidget,
      selectedWidgetType,
      selectedWidgetUsesV2,
    ],
  );
  const selectedStyleCapability = useMemo(
    () =>
      getSelectedStyleCapability({
        selectedTarget,
        selectedWidgetType,
        selectedWidgetUsesV2,
      }),
    [selectedTarget.styleId, selectedWidgetType, selectedWidgetUsesV2],
  );
  const selectedElements = useMemo(
    () =>
      getSelectedElements({
        selectedTarget,
        selectedWidgetType,
        selectedWidgetUsesV2,
      }),
    [selectedTarget.styleId, selectedWidgetType, selectedWidgetUsesV2],
  );
  const selectedElement = useMemo(
    () => getSelectedElement(selectedElements, selectedElementId),
    [selectedElements, selectedElementId],
  );
  const selectedAppearanceId = useMemo(() => {
    if (!selectedWidgetType || !selectedTarget.styleId || !selectedElement?.id)
      return "";
    return createAppearanceRoute({
      widgetId: selectedWidget?.id || null,
      widgetType: selectedWidgetType,
      widgetVariant: selectedTarget.styleId,
      elementId: selectedElement.id,
      propertyId: "backgroundColor",
    }).appearanceId;
  }, [
    selectedElement?.id,
    selectedTarget.styleId,
    selectedWidget?.id,
    selectedWidgetType,
  ]);
  const backgroundElements = useMemo(
    () => (selectedWidgetIsBackground ? selectedElements : []),
    [selectedElements, selectedWidgetIsBackground],
  );
  const selectedStyleCapabilities =
    selectedStyleCapability?.capabilities || FALLBACK_QUICK_STYLE_CAPABILITIES;
  const selectedQuickControls = useMemo(() => {
    return getSelectedQuickControls({
      selectedElement,
      selectedStyleCapabilities,
      selectedTarget,
      selectedWidgetType,
      selectedWidgetUsesV2,
    });
  }, [
    selectedElement,
    selectedStyleCapabilities,
    selectedTarget.styleId,
    selectedWidgetType,
    selectedWidgetUsesV2,
  ]);
  const hasQuickControl = useCallback(
    (control) => selectedQuickControls.has(control),
    [selectedQuickControls],
  );
  const hasAnyQuickControl = useCallback(
    (controls = []) =>
      controls.some((control) => selectedQuickControls.has(control)),
    [selectedQuickControls],
  );
  const simpleSections = useMemo(() => {
    return buildSimpleSections({
      hasAnyQuickControl,
      selectedElementsLength: selectedElements.length,
      selectedQuickControls,
      selectedWidgetIsBackground,
      selectedWidgetType,
      showBonusHuntColorSyncControls,
      showRtpMetalControls,
    });
  }, [
    hasAnyQuickControl,
    selectedElements.length,
    selectedQuickControls,
    selectedWidgetIsBackground,
    selectedWidgetType,
    showBonusHuntColorSyncControls,
    showRtpMetalControls,
  ]);
  const simpleSectionTabs = useMemo(() => {
    const labels = {
      widgetStyle: "Layout",
      editing: "Part",
      backgroundControls: "Controls",
      material: "Surface",
      colours: "Colour",
      textImages: "Type",
      shapeEffects: "Shape",
      motion: "Motion",
    };
    return simpleSections
      .filter((id) => id !== "actions")
      .map((id) => ({ id, label: labels[id] || id }));
  }, [simpleSections]);
  const previewStateOptions = getPreviewStateOptions(selectedWidgetType);
  const selectedPreviewState = getSelectedPreviewState({
    previewStateByWidget,
    previewStateOptions,
    widgetId: selectedWidget?.id,
  });
  const selectedLayerKey = layerKey(selectedWidget?.id, selectedElement?.id);
  const selectedLayerLocked = !!lockedLayers[selectedLayerKey];
  const dirty = safeJson(draft) !== lastPersistedDraftRef.current;
  const hasUnpublishedChanges = safeJson(draft) !== lastPublishedRef.current;
  const warnings = useMemo(() => getAppearanceWarnings(draft), [draft]);
  const performance = useMemo(() => getPerformanceTone(draft), [draft]);
  const groupedLayers = useMemo(
    () => groupLayers(selectedElements),
    [selectedElements],
  );
  const advancedOverrideCount = useMemo(
    () => countAdvancedOverrides(draft, selectedTargetRoot),
    [draft, selectedTargetRoot],
  );

  const filteredWidgets = useMemo(() => {
    return getFilteredWidgets(widgets, widgetSearch);
  }, [widgets, widgetSearch]);

  useEffect(() => {
    setPreviewPositions((prev) =>
      prunePreviewPositionsForWidgets(prev, widgets),
    );
  }, [widgets]);

  const styleSelections = useMemo(
    () => buildStyleSelections(selectedWidget, selectedTarget),
    [selectedWidget, selectedTarget],
  );

  const selectedHiddenElementIds = useMemo(
    () =>
      getSelectedHiddenElementIds({
        draft,
        selectedElements,
        selectedTargetRoot,
      }),
    [draft, selectedElements, selectedTargetRoot],
  );

  useEffect(() => {
    trackEvent(
      ANALYTICS_EVENTS.APPEARANCE_CENTER_OPENED || "appearance_center_opened",
      {
        route: "/overlay-center/appearance",
        editor_schema_version: EDITOR_SCHEMA_VERSION,
      },
    );
  }, []);

  useEffect(() => {
    persistAppearanceMode(mode);
  }, [mode]);

  useEffect(() => {
    syncModeSideEffects({ mode, setPreviewMode, setShowBefore, setSidebarTab });
  }, [mode]);

  useEffect(() => {
    syncServerDraftState({
      dirty,
      lastPersistedDraftRef,
      lastPublishedRef,
      lastRevisionRef,
      saveStatus,
      serverState,
      setDraft,
    });
  }, [serverState, dirty, saveStatus]);

  useEffect(() => {
    ensureSelectedWidgetTarget({
      draft,
      firstWidget,
      selectedWidget,
      setSelectedElementId,
      setSelectedTarget,
    });
  }, [selectedWidget, firstWidget, draft]);

  useEffect(() => {
    ensureSelectedElement({
      selectedElement,
      selectedElements,
      setSelectedElementId,
    });
  }, [selectedElement, selectedElements]);

  useEffect(() => {
    return startToastTimer(toast, setToast);
  }, [toast]);

  useEffect(() => {
    return broadcastAppearancePreviewDraft({
      clientId: clientIdRef.current,
      draft,
      instance,
      styleSelections,
    });
  }, [draft, instance?.overlay_token, styleSelections]);

  const persistDraft = useCallback(
    (nextDraft = draft, reason = "manual") =>
      persistAppearanceDraft({
        clientId: clientIdRef.current,
        lastPersistedDraftRef,
        nextDraft,
        reason,
        serverState,
        setSaveStatus,
        setStatusMessage,
        setToast,
        theme,
        updateState,
      }),
    [draft, serverState, theme, updateState],
  );

  useEffect(() => {
    return scheduleDraftAutosave({
      draft,
      lastPersistedDraftRef,
      persistDraft,
      saveTimerRef,
    });
  }, [draft, persistDraft]);

  const commitDraft = useCallback(
    (recipe, summary = "Style changed") => {
      commitAppearanceDraftChange({
        commitRecipe: recipe,
        selectedElementId,
        selectedTarget,
        selectedWidgetType,
        setDraft,
        setPublishStatus,
        setRedoStack,
        setSaveStatus,
        setShowBefore,
        setStatusMessage,
        setUndoStack,
        summary,
        theme,
      });
    },
    [selectedElementId, selectedTarget, selectedWidgetType, theme],
  );

  const rememberColor = useCallback((color) => {
    rememberRecentColor(color, setRecentColors);
  }, []);

  const applySimpleSettings = useCallback(
    (patch, summary = "Quick style changed") => {
      applySimpleSettingsChange({
        commitDraft,
        currentSimpleSettings,
        patch,
        rememberColor,
        selectedTargetRoot,
        selectedWidgetType,
        summary,
      });
    },
    [
      commitDraft,
      currentSimpleSettings,
      rememberColor,
      selectedTargetRoot,
      selectedWidgetType,
    ],
  );

  const applyQuickSettings = useCallback(
    (patch, summary = "Quick style changed") => {
      applyQuickSettingsChange({
        applySimpleSettings,
        commitDraft,
        currentSimpleSettings,
        patch,
        rememberColor,
        selectedElement,
        selectedTargetRoot,
        selectedWidgetType,
        selectedWidgetUsesV2,
        summary,
      });
    },
    [
      applySimpleSettings,
      commitDraft,
      currentSimpleSettings,
      rememberColor,
      selectedElement,
      selectedTargetRoot,
      selectedWidgetType,
      selectedWidgetUsesV2,
    ],
  );

  const updateSelectedWidgetConfig = useCallback(
    (patch, summary = "Widget settings updated") => {
      updateSelectedWidgetConfigValue({
        patch,
        saveWidget,
        selectedWidget,
        setToast,
        summary,
      });
    },
    [saveWidget, selectedWidget],
  );

  const updateRtpMetalSettings = useCallback(
    (patch, summary = "RTP Metal colours updated") => {
      updateRtpMetalWidgetSettings({
        patch,
        rtpMetalSettings,
        saveWidget,
        selectedWidget,
        selectedWidgetConfig,
        setPreviewConfigPatches,
        setToast,
        summary,
      });
    },
    [rtpMetalSettings, saveWidget, selectedWidget, selectedWidgetConfig],
  );

  const updateBonusHuntColorSyncSettings = useCallback(
    (enabled) => {
      updateBonusHuntColorSyncWidgetSettings({
        enabled,
        saveWidget,
        selectedWidget,
        selectedWidgetConfig,
        setPreviewConfigPatches,
        setToast,
      });
    },
    [saveWidget, selectedWidget, selectedWidgetConfig],
  );

  const restoreRecommendedStyle = useCallback(() => {
    restoreRecommendedWidgetStyle({
      commitDraft,
      selectedTargetRoot,
      selectedWidgetType,
      setToast,
    });
  }, [commitDraft, selectedTargetRoot, selectedWidgetType]);

  const handleModeChange = useCallback(
    (nextMode) => {
      changeAppearanceMode({
        advancedOverrideCount,
        mode,
        nextMode,
        setMode,
        setPreviewMode,
        setShowBefore,
        setSidebarTab,
        setToast,
      });
    },
    [advancedOverrideCount, mode],
  );

  const selectWidget = useCallback(
    (widget, nextElementId = "") => {
      selectAppearanceWidget({
        dirty,
        draft,
        mode,
        nextElementId,
        persistDraft,
        saveTimerRef,
        setSelectedElementId,
        setSelectedStateId,
        setSelectedTarget,
        setSidebarTab,
        widget,
      });
    },
    [dirty, draft, mode, persistDraft],
  );

  const selectStyle = useCallback(
    (styleId) => {
      selectAppearanceStyle({
        commitDraft,
        quickStyleOptions,
        saveWidget,
        selectedWidget,
        setSelectedElementId,
        setSelectedStateId,
        setSelectedTarget,
        styleId,
      });
    },
    [commitDraft, quickStyleOptions, saveWidget, selectedWidget],
  );

  const handlePreviewWidgetSelect = useCallback(
    (widget) => {
      selectWidget(widget);
    },
    [selectWidget],
  );

  const handlePreviewElementSelect = useCallback(
    ({ widget, elementId, stateId, appearanceId }) => {
      selectWidget(widget, elementId);
      setSelectedStateId(stateId || "default");
      if (appearanceId) {
        trackEvent("appearance_element_route_selected", {
          appearance_id: appearanceId,
          widget_type: widget?.widget_type || null,
        });
      }
    },
    [selectWidget],
  );

  const handlePreviewResize = useCallback(
    (widget, size) => {
      resizePreviewWidget({
        commitDraft,
        draft,
        setSelectedTarget,
        size,
        widget,
      });
    },
    [commitDraft, draft],
  );

  const handlePreviewMove = useCallback(
    (widget, position, meta = {}) => {
      savePreviewWidgetPosition({
        meta,
        position,
        saveWidget,
        setPreviewPositions,
        setPublishStatus,
        setToast,
        widget,
        widgets,
      });
    },
    [saveWidget, widgets],
  );

  const handlePreviewElementMove = useCallback(
    (widget, movement, meta = {}) => {
      movePreviewElement({
        commitDraft,
        draft,
        meta,
        movement,
        setPreviewElementOffsets,
        setSelectedElementId,
        setSelectedStateId,
        setSelectedTarget,
        widget,
      });
    },
    [commitDraft, draft],
  );

  const toggleWidgetVisibility = useCallback(
    (widget, event) => {
      saveWidgetVisibility({ event, saveWidget, setToast, widget });
    },
    [saveWidget],
  );

  const moveWidgetLayer = useCallback(
    (widget, direction, event) => {
      moveAppearanceWidgetLayer({
        direction,
        event,
        saveWidget,
        setPublishStatus,
        setToast,
        widget,
        widgets,
      });
    },
    [saveWidget, widgets],
  );

  const undo = useCallback(() => {
    applyUndoChange({
      draft,
      selectedTarget,
      setDraft,
      setPublishStatus,
      setRedoStack,
      setSaveStatus,
      setStatusMessage,
      setUndoStack,
    });
  }, [draft, selectedTarget]);

  const redo = useCallback(() => {
    applyRedoChange({
      draft,
      selectedTarget,
      setDraft,
      setPublishStatus,
      setRedoStack,
      setSaveStatus,
      setStatusMessage,
      setUndoStack,
    });
  }, [draft, selectedTarget]);

  const publish = useCallback(async () => {
    clearTimeout(saveTimerRef.current);
    await publishAppearanceDraft({
      clientId: clientIdRef.current,
      draft,
      lastPersistedDraftRef,
      lastPublishedRef,
      saveTheme,
      selectedWidgetName,
      selectedWidgetType,
      serverState,
      setPublishStatus,
      setSaveStatus,
      setStatusMessage,
      setToast,
      theme,
      updateState,
      userId: user?.id,
    });
  }, [
    draft,
    saveTheme,
    selectedWidgetName,
    selectedWidgetType,
    serverState,
    theme,
    updateState,
    user?.id,
  ]);

  const isElementLocked = useCallback(
    (elementId) =>
      isSelectedElementLocked({
        elementId,
        lockedLayers,
        selectedWidgetId: selectedWidget?.id,
      }),
    [lockedLayers, selectedWidget?.id],
  );

  const toggleElementVisibility = useCallback(
    (elementId) => {
      toggleAppearanceElementVisibility({
        commitDraft,
        draft,
        elementId,
        isElementLocked,
        selectedTarget,
        selectedTargetRoot,
        selectedWidgetType,
        selectedWidgetUsesV2,
      });
    },
    [
      commitDraft,
      draft,
      isElementLocked,
      selectedTarget,
      selectedTargetRoot,
      selectedWidgetType,
      selectedWidgetUsesV2,
    ],
  );

  const updateElementControlFor = useCallback(
    (elementId, control, value) => {
      updateAppearanceElementControl({
        commitDraft,
        control,
        elementId,
        isElementLocked,
        selectedTarget,
        selectedStateId,
        selectedTargetRoot,
        selectedWidgetType,
        selectedWidgetUsesV2,
        value,
      });
    },
    [
      commitDraft,
      isElementLocked,
      selectedTarget,
      selectedStateId,
      selectedTargetRoot,
      selectedWidgetType,
      selectedWidgetUsesV2,
    ],
  );

  const resetElementControlFor = useCallback(
    (elementId, control) => {
      resetAppearanceElementControl({
        commitDraft,
        control,
        elementId,
        isElementLocked,
        selectedTarget,
        selectedStateId,
        selectedTargetRoot,
        selectedWidgetType,
        selectedWidgetUsesV2,
      });
    },
    [
      commitDraft,
      isElementLocked,
      selectedTarget,
      selectedStateId,
      selectedTargetRoot,
      selectedWidgetType,
      selectedWidgetUsesV2,
    ],
  );

  const updateWidgetControl = useCallback(
    (item, value) => {
      updateAppearanceWidgetControl({
        commitDraft,
        item,
        selectedTargetRoot,
        selectedWidgetUsesV2,
        value,
      });
    },
    [commitDraft, selectedTargetRoot, selectedWidgetUsesV2],
  );

  const resetWidgetControl = useCallback(
    (item) => {
      resetAppearanceWidgetControl({
        commitDraft,
        item,
        selectedTargetRoot,
        selectedWidgetUsesV2,
      });
    },
    [commitDraft, selectedTargetRoot, selectedWidgetUsesV2],
  );

  const applyPreset = useCallback(
    (preset) => {
      applyAppearancePreset({
        commitDraft,
        preset,
        selectedTargetRoot,
        setToast,
        theme,
      });
    },
    [commitDraft, selectedTargetRoot, theme],
  );

  const saveCurrentPreset = useCallback(async () => {
    await saveAppearancePresetFromDraft({
      clientId: clientIdRef.current,
      currentSimpleSettings,
      draft,
      mode,
      selectedTarget,
      selectedTargetRoot,
      selectedWidgetName,
      selectedWidgetType,
      serverState,
      setToast,
      updateState,
    });
  }, [
    currentSimpleSettings,
    draft,
    mode,
    selectedTarget.scope,
    selectedTargetRoot,
    selectedWidgetName,
    selectedWidgetType,
    serverState,
    updateState,
  ]);

  const renamePreset = useCallback(
    async (preset) => {
      await renameAppearancePreset({
        preset,
        serverState,
        setToast,
        updateState,
      });
    },
    [serverState, updateState],
  );

  const deletePreset = useCallback(
    async (preset) => {
      await deleteAppearancePreset({
        preset,
        serverState,
        setToast,
        updateState,
      });
    },
    [serverState, updateState],
  );

  const duplicatePreset = useCallback(
    async (preset) => {
      await duplicateAppearancePreset({
        preset,
        serverState,
        setToast,
        updateState,
      });
    },
    [serverState, updateState],
  );

  const exportWidgetStyles = useCallback(() => {
    exportCurrentWidgetStyles({ draft, setToast, widgets });
  }, [draft, widgets]);

  const importWidgetStyles = useCallback(
    async (event) => {
      await importWidgetStyleFile({
        addWidget,
        commitDraft,
        draft,
        event,
        persistDraft,
        saveTimerRef,
        setSaveStatus,
        setStatusMessage,
        setToast,
        theme,
        widgets,
      });
    },
    [addWidget, commitDraft, draft, persistDraft, theme, widgets],
  );

  const resetElement = useCallback(() => {
    resetSelectedElementAppearance({
      commitDraft,
      selectedElement,
      selectedLayerLocked,
      selectedStateId,
      selectedTarget,
      selectedTargetRoot,
      selectedWidgetType,
      selectedWidgetUsesV2,
    });
  }, [
    commitDraft,
    selectedElement?.id,
    selectedLayerLocked,
    selectedStateId,
    selectedTarget,
    selectedTargetRoot,
    selectedWidgetType,
    selectedWidgetUsesV2,
  ]);

  const resetWidget = useCallback(() => {
    resetSelectedWidgetAppearance({
      commitDraft,
      selectedTargetRoot,
      selectedWidgetName,
    });
  }, [commitDraft, selectedTargetRoot, selectedWidgetName]);

  const resetAll = useCallback(() => {
    resetAllAppearance({ commitDraft, theme });
  }, [commitDraft, theme]);

  const discardUnsaved = useCallback(() => {
    discardUnsavedAppearanceDraft({
      lastPersistedDraftRef,
      saveTimerRef,
      serverState,
      setDraft,
      setPublishStatus,
      setSaveStatus,
      setStatusMessage,
    });
  }, [serverState.draft, serverState.published]);

  const setTourHidden = useCallback((hidden) => {
    setAppearanceTourHidden(hidden, setTourVisible);
  }, []);

  const hideTour = useCallback(() => {
    setTourVisible(false);
  }, []);

  const hideTourPermanently = useCallback(() => {
    setTourHidden(true);
  }, [setTourHidden]);

  const deselectElement = useCallback(() => {
    setSelectedElementId("");
  }, []);

  const updateZoom = useCallback(
    (direction) => {
      setZoom(getNextZoomValue(direction, zoom).value);
    },
    [zoom],
  );

  const toggleSimpleSection = useCallback((id) => {
    setOpenSimpleSections((prev) => toggleOpenSection(prev, id));
  }, []);

  const toggleAdvancedSection = useCallback((id) => {
    setOpenAdvancedSections((prev) => toggleOpenSection(prev, id));
  }, []);

  const enterCanvasFullscreen = useCallback(async () => {
    await enterFullscreenForElement(canvasPanelRef.current, setToast);
  }, []);

  useEffect(() => {
    return registerAppearanceKeyboardShortcuts({
      draft,
      handlePreviewElementMove,
      mode,
      persistDraft,
      redo,
      resetElement,
      selectedElement,
      selectedLayerLocked,
      selectedStateId,
      selectedTargetRoot,
      selectedWidget,
      selectedWidgetType,
      setSelectedElementId,
      undo,
    });
  }, [
    draft,
    handlePreviewElementMove,
    mode,
    persistDraft,
    redo,
    resetElement,
    selectedElement,
    selectedLayerLocked,
    selectedStateId,
    selectedTargetRoot,
    selectedWidget,
    selectedWidgetType,
    undo,
  ]);

  useEffect(() => {
    openBackgroundSimpleSection(
      selectedWidgetIsBackground,
      setOpenSimpleSections,
    );
  }, [selectedWidgetIsBackground]);

  const getElementControlValueFor = useCallback(
    (elementId, controlId) =>
      readElementControlValue({
        controlId,
        draft,
        elementId,
        selectedStateId,
        selectedTarget,
        selectedTargetRoot,
        selectedWidgetType,
        selectedWidgetUsesV2,
      }),
    [
      draft,
      selectedStateId,
      selectedTarget,
      selectedTargetRoot,
      selectedWidgetType,
      selectedWidgetUsesV2,
    ],
  );

  const backgroundSourceMode = useMemo(() => {
    const sourceMode = getElementControlValueFor("source", "bgMode");
    return getBackgroundSourceMode(sourceMode, selectedTarget.styleId);
  }, [getElementControlValueFor, selectedTarget.styleId]);

  const backgroundTextureType =
    getElementControlValueFor("texture", "textureType") || "gradient";
  const backgroundParticleMode =
    getElementControlValueFor("effects", "fxParticles") || "none";
  const backgroundFogMode =
    getElementControlValueFor("effects", "fxFog") || "none";
  const backgroundLightMode =
    getElementControlValueFor("effects", "fxGlimpse") || "none";
  const simpleBackgroundElements = useMemo(
    () => getSimpleBackgroundElements(backgroundElements, backgroundSourceMode),
    [backgroundElements, backgroundSourceMode],
  );

  const shouldShowBackgroundControl = useCallback(
    (elementId, controlId) =>
      shouldShowBackgroundControlFor({
        backgroundFogMode,
        backgroundLightMode,
        backgroundParticleMode,
        backgroundSourceMode,
        backgroundTextureType,
        controlId,
        elementId,
        selectedStyleId: selectedTarget.styleId,
        selectedWidgetIsBackground,
      }),
    [
      backgroundFogMode,
      backgroundLightMode,
      backgroundParticleMode,
      backgroundSourceMode,
      backgroundTextureType,
      selectedTarget.styleId,
      selectedWidgetIsBackground,
    ],
  );

  const getBackgroundElementControlGroups = useCallback(
    (element) =>
      getBackgroundElementControlGroupsFor(
        element,
        shouldShowBackgroundControl,
      ),
    [shouldShowBackgroundControl],
  );

  const renderQuickControl = (item) => {
    return (
      <QuickPropertyControl
        key={item.id}
        draft={draft}
        item={item}
        onReset={resetWidgetControl}
        onUpdate={updateWidgetControl}
        selectedTargetRoot={selectedTargetRoot}
      />
    );
  };

  const renderElementControlFor = (element, control) => (
    <ElementPropertyControlFor
      key={`${element?.id || "missing"}-${control.id}`}
      control={control}
      element={element}
      getValue={getElementControlValueFor}
      isLocked={isElementLocked}
      onReset={resetElementControlFor}
      onUpdate={updateElementControlFor}
      selectedTargetRoot={selectedTargetRoot}
    />
  );

  const renderElementControl = (control) =>
    renderElementControlFor(selectedElement, control);

  const handleLayerSelect = useCallback((elementId) => {
    setSelectedElementId(elementId);
    setSelectedStateId("default");
  }, []);

  const toggleLayerLocked = useCallback((key) => {
    setLockedLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const controlGroups = useMemo(() => {
    return getVisibleElementControlGroups(selectedElement, mode);
  }, [mode, selectedElement]);

  useEffect(() => {
    syncAdvancedControlSection({
      controlGroups,
      mode,
      selectedElement,
      setOpenAdvancedSections,
    });
  }, [controlGroups, mode, selectedElement?.id]);

  const visibleLayerRows = Object.values(groupedLayers);
  const selectedWidgetOverrides = countSelectedWidgetOverrides(
    draft,
    selectedTargetRoot,
  );
  const editingWholeWidget = isEditingWholeWidget(selectedElement);
  const advancedSectionTabs = buildAdvancedSectionTabs({
    controlGroups,
    editingWholeWidget,
    mode,
    selectedWidgetUsesV2,
  });
  const selectedStyleLabel = getSelectedStyleLabel({
    quickStyleOptions,
    registeredStyleOptions,
    selectedStyleId: selectedTarget.styleId,
  });
  const currentWidgetScopeLabel = getCurrentWidgetScopeLabel(
    mode,
    selectedElement,
  );
  return (
    <div className="appearance-center visual-editor" data-mode={mode}>
      <AppearanceTopbar
        currentWidgetScopeLabel={currentWidgetScopeLabel}
        dirty={dirty}
        draft={draft}
        enterCanvasFullscreen={enterCanvasFullscreen}
        exportWidgetStyles={exportWidgetStyles}
        hasUnpublishedChanges={hasUnpublishedChanges}
        handleModeChange={handleModeChange}
        importStylesInputRef={importStylesInputRef}
        importWidgetStyles={importWidgetStyles}
        mode={mode}
        onFocusPreview={onFocusPreview}
        onOpenPreview={onOpenPreview}
        obsSafe={obsSafe}
        persistDraft={persistDraft}
        previewBackground={previewBackground}
        previewMode={previewMode}
        previewOpen={previewStatus?.open}
        previewStateOptions={previewStateOptions}
        publish={publish}
        publishStatus={publishStatus}
        redo={redo}
        redoDisabled={!redoStack.length}
        resetWidget={resetWidget}
        saveStatus={saveStatus}
        selectedAppearanceId={selectedAppearanceId}
        selectedPreviewState={selectedPreviewState}
        selectedWidgetId={selectedWidget?.id}
        selectedWidgetName={selectedWidgetName}
        setObsSafe={setObsSafe}
        setPreviewBackground={setPreviewBackground}
        setPreviewMode={setPreviewMode}
        setPreviewStateByWidget={setPreviewStateByWidget}
        setShowBefore={setShowBefore}
        showBefore={showBefore}
        undo={undo}
        undoDisabled={!undoStack.length}
        updateZoom={updateZoom}
        zoom={zoom}
      />

      <AppearanceStatusLine
        dirty={dirty}
        onDiscardUnsaved={discardUnsaved}
        statusMessage={statusMessage}
      />

      <div className="ve-workspace">
        <LeftSidebar
          draft={draft}
          filteredWidgets={filteredWidgets}
          lockedLayers={lockedLayers}
          mode={mode}
          onLayerSelect={handleLayerSelect}
          onMoveLayer={moveWidgetLayer}
          onSearchChange={setWidgetSearch}
          onSelectWidget={selectWidget}
          onSidebarTabChange={setSidebarTab}
          onToggleElementVisibility={toggleElementVisibility}
          onToggleLayerLocked={toggleLayerLocked}
          onToggleWidgetVisibility={toggleWidgetVisibility}
          search={widgetSearch}
          selectedElementId={selectedElement?.id}
          selectedTargetRoot={selectedTargetRoot}
          selectedWidgetId={selectedWidget?.id}
          sidebarTab={sidebarTab}
          visibleLayerRows={visibleLayerRows}
          widgets={widgets}
        />

        <CanvasPreviewPanel
          canvasPanelRef={canvasPanelRef}
          handlePreviewElementMove={handlePreviewElementMove}
          handlePreviewElementSelect={handlePreviewElementSelect}
          handlePreviewMove={handlePreviewMove}
          handlePreviewResize={handlePreviewResize}
          handlePreviewWidgetSelect={handlePreviewWidgetSelect}
          mode={mode}
          obsSafe={obsSafe}
          performance={performance}
          previewAppearance={previewAppearance}
          previewBackground={previewBackground}
          previewMode={previewMode}
          previewStateByWidget={previewStateByWidget}
          previewWidgets={previewWidgets}
          selectedElement={selectedElement}
          selectedElements={selectedElements}
          selectedHiddenElementIds={selectedHiddenElementIds}
          selectedTarget={selectedTarget}
          selectedWidget={selectedWidget}
          selectedWidgetType={selectedWidgetType}
          styleSelections={styleSelections}
          theme={theme}
          userId={user?.id}
          zoom={zoom}
        />

        {mode === "simple" ? (
          <aside className="ve-right-panel ve-right-panel--simple">
            <div className="ve-properties-header ve-properties-header--simple">
              <div>
                <strong>Quick Style</strong>
                <span>
                  {selectedWidgetName} - Style: {selectedStyleLabel} - Editing:{" "}
                  {selectedElement?.label || "Entire widget"}
                </span>
              </div>
              <Show when={selectedWidgetUsesV2}>
                <span className="ve-engine-badge">V2 pilot</span>
              </Show>
            </div>

            <div className="ve-properties-scroll ve-quick-style">
              <Show when={tourVisible}>
                <section className="ve-simple-onboarding">
                  <div>
                    <Wand2 size={18} />
                    <strong>Customize your widget in three steps</strong>
                  </div>
                  <ol>
                    <li>Pick a style.</li>
                    <li>Pick a colour.</li>
                    <li>Publish to OBS.</li>
                  </ol>
                  <p>You can fine-tune individual parts in Advanced Mode.</p>
                  <div className="ve-simple-actions">
                    <button type="button" onClick={() => setTourVisible(false)}>
                      Start customizing
                    </button>
                    <button type="button" onClick={() => setTourVisible(false)}>
                      Skip
                    </button>
                    <button type="button" onClick={() => setTourHidden(true)}>
                      Do not show again
                    </button>
                  </div>
                </section>
              </Show>

              <Show when={advancedOverrideCount > 0}>
                <div className="ve-simple-note">
                  Advanced adjustments are still active for this widget. Restore
                  recommended style if you want a clean simple preset.
                </div>
              </Show>

              <Show when={showDevV2Diagnostics(selectedWidgetUsesV2)}>
                <details className="ve-v2-diagnostics">
                  <summary>Appearance V2 diagnostics</summary>
                  <dl>
                    <div>
                      <dt>Widget</dt>
                      <dd>{selectedWidgetType}</dd>
                    </div>
                    <div>
                      <dt>Style</dt>
                      <dd>{selectedTarget.styleId}</dd>
                    </div>
                    <div>
                      <dt>Material</dt>
                      <dd>{currentSimpleSettings.material}</dd>
                    </div>
                    <div>
                      <dt>Primary</dt>
                      <dd>{currentSimpleSettings.primaryColor}</dd>
                    </div>
                    <div>
                      <dt>Shape</dt>
                      <dd>{currentSimpleSettings.shape}</dd>
                    </div>
                    <div>
                      <dt>Density</dt>
                      <dd>{currentSimpleSettings.density}</dd>
                    </div>
                  </dl>
                </details>
              </Show>

              <SectionTabs
                sections={simpleSectionTabs}
                openSections={openSimpleSections}
                onToggle={toggleSimpleSection}
              />

              <Show when={sectionVisible(simpleSections, "widgetStyle")}>
                <CollapsibleSection
                  id="widgetStyle"
                  title="Widget layout"
                  openSections={openSimpleSections}
                  onToggle={toggleSimpleSection}
                  className="ve-simple-section"
                >
                  <p className="ve-simple-help">
                    Choose the widget layout or variant. Visual presets are in
                    Surface and background.
                  </p>
                  <div className="ve-style-card-grid">
                    {quickStyleOptions.map((option) => (
                      <StylePreviewCard
                        key={option.id}
                        widget={selectedWidget}
                        option={option}
                        active={selectedTarget.styleId === option.id}
                        edited={option.edited}
                        onSelect={selectStyle}
                      />
                    ))}
                    {!quickStyleOptions.length && (
                      <div className="ve-simple-note">
                        This widget does not declare multiple appearance styles
                        yet.
                      </div>
                    )}
                  </div>
                </CollapsibleSection>
              </Show>

              <Show when={sectionVisible(simpleSections, "editing")}>
                <CollapsibleSection
                  id="editing"
                  title="Part selection"
                  openSections={openSimpleSections}
                  onToggle={toggleSimpleSection}
                  className="ve-simple-section"
                >
                  <label className="ve-edit-target-select">
                    <span>Part</span>
                    <select
                      value={selectedElement?.id || ""}
                      onChange={(event) => {
                        setSelectedElementId(event.target.value);
                        setSelectedStateId("default");
                      }}
                    >
                      {selectedElements.map((element) => (
                        <option key={element.id} value={element.id}>
                          {element.label} - {inferElementKind(element)}
                        </option>
                      ))}
                    </select>
                  </label>
                </CollapsibleSection>
              </Show>

              <Show
                when={sectionVisible(
                  simpleSections,
                  "backgroundControls",
                  selectedWidgetIsBackground,
                )}
              >
                <CollapsibleSection
                  id="backgroundControls"
                  title="Background controls"
                  openSections={openSimpleSections}
                  onToggle={toggleSimpleSection}
                  className="ve-simple-section"
                >
                  <p className="ve-simple-help">
                    Only live Background controls are shown. Choose Texture,
                    Image URL, Video URL, or Animated in Source.
                  </p>
                  <div className="ve-background-control-stack">
                    {simpleBackgroundElements.map((element) => {
                      const groups = getBackgroundElementControlGroups(element);
                      if (!groups.length) return null;
                      return (
                        <div
                          key={element.id}
                          className={`ve-background-part${selectedElement?.id === element.id ? " is-active" : ""}`}
                        >
                          <button
                            type="button"
                            className="ve-background-part__header"
                            onClick={() => {
                              setSelectedElementId(element.id);
                              setSelectedStateId("default");
                            }}
                          >
                            <span>{element.label}</span>
                            <small>{inferElementKind(element)}</small>
                          </button>
                          <div className="ve-control-groups ve-control-groups--background">
                            {groups.map((group) => (
                              <div
                                key={`${element.id}-${group.id}`}
                                className="ve-control-group"
                              >
                                <h4>{mapControlGroupTitle(group.label)}</h4>
                                {group.controls.map((control) =>
                                  renderElementControlFor(element, control),
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleSection>
              </Show>

              <Show when={sectionVisible(simpleSections, "material")}>
                <CollapsibleSection
                  id="material"
                  title="Surface style preset"
                  openSections={openSimpleSections}
                  onToggle={toggleSimpleSection}
                  className="ve-simple-section"
                >
                  <p className="ve-simple-help">
                    Start by choosing the finish of your widget.
                  </p>
                  <div className="ve-material-grid">
                    {visibleMaterialPresets.map((preset) => {
                      const active =
                        currentSimpleSettings.material === preset.id;
                      const previewSettings = {
                        ...currentSimpleSettings,
                        material: preset.id,
                      };
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          className={`ve-material-card ve-material-card--${preset.id}${active ? " is-active" : ""}`}
                          style={getSimplePresetVars(previewSettings)}
                          onClick={() =>
                            applyQuickSettings(
                              { material: preset.id },
                              `Choose ${preset.name}`,
                            )
                          }
                        >
                          <span
                            className="ve-material-card__preview"
                            aria-hidden="true"
                          >
                            <span />
                            <strong>Text</strong>
                          </span>
                          <span className="ve-material-card__copy">
                            <strong>
                              {preset.name}
                              {preset.protected && <em>Recommended</em>}
                            </strong>
                            <small>{preset.tip}</small>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </CollapsibleSection>
              </Show>

              <Show when={sectionVisible(simpleSections, "colours")}>
                <CollapsibleSection
                  id="colours"
                  title="Colour"
                  openSections={openSimpleSections}
                  onToggle={toggleSimpleSection}
                  className="ve-simple-section"
                >
                  <p className="ve-simple-help">
                    Your colour automatically adapts to the selected style.
                  </p>
                  <div className="ve-swatch-grid" aria-label="Main colour">
                    {SIMPLE_COLOR_PALETTE.map((color) => (
                      <button
                        key={color.id}
                        type="button"
                        className={
                          currentSimpleSettings.primaryColor === color.value
                            ? "is-active"
                            : ""
                        }
                        style={{ "--swatch": color.value }}
                        onClick={() =>
                          applyQuickSettings(
                            { primaryColor: color.value },
                            `Choose ${color.label}`,
                          )
                        }
                        title={color.label}
                        aria-label={`Use ${color.label}`}
                      >
                        <span />
                      </button>
                    ))}
                  </div>
                  <label className="ve-simple-color-picker">
                    <span>Main colour</span>
                    <input
                      type="color"
                      value={currentSimpleSettings.primaryColor}
                      onChange={(event) =>
                        applyQuickSettings(
                          { primaryColor: event.target.value },
                          "Choose custom colour",
                        )
                      }
                      aria-label="Custom main colour"
                    />
                  </label>

                  {!!recentColors.length && (
                    <div className="ve-recent-colors">
                      <span>Recent colours</span>
                      <div className="ve-swatch-grid ve-swatch-grid--compact">
                        {recentColors.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={
                              currentSimpleSettings.primaryColor === color
                                ? "is-active"
                                : ""
                            }
                            style={{ "--swatch": color }}
                            onClick={() =>
                              applyQuickSettings(
                                { primaryColor: color },
                                "Use recent colour",
                              )
                            }
                            aria-label={`Use recent colour ${color}`}
                          >
                            <span />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <label className="ve-simple-toggle">
                    <input
                      type="checkbox"
                      checked={currentSimpleSettings.useSecondColor}
                      onChange={(event) =>
                        applyQuickSettings(
                          { useSecondColor: event.target.checked },
                          "Toggle second colour",
                        )
                      }
                    />
                    <span>Use a second colour</span>
                  </label>
                  {currentSimpleSettings.useSecondColor && (
                    <>
                      <div
                        className="ve-swatch-grid"
                        aria-label="Accent colour"
                      >
                        {SIMPLE_COLOR_PALETTE.map((color) => (
                          <button
                            key={`accent-${color.id}`}
                            type="button"
                            className={
                              currentSimpleSettings.accentColor === color.value
                                ? "is-active"
                                : ""
                            }
                            style={{ "--swatch": color.value }}
                            onClick={() =>
                              applyQuickSettings(
                                { accentColor: color.value },
                                `Choose accent ${color.label}`,
                              )
                            }
                            title={color.label}
                            aria-label={`Use ${color.label} as second colour`}
                          >
                            <span />
                          </button>
                        ))}
                      </div>
                      <label className="ve-simple-color-picker">
                        <span>Second colour</span>
                        <input
                          type="color"
                          value={currentSimpleSettings.accentColor}
                          onChange={(event) =>
                            applyQuickSettings(
                              { accentColor: event.target.value },
                              "Choose custom second colour",
                            )
                          }
                          aria-label="Custom second colour"
                        />
                      </label>
                    </>
                  )}
                  {showRtpMetalControls && (
                    <>
                      {bonusHuntMetalColors && (
                        <label className="ve-simple-toggle">
                          <input
                            type="checkbox"
                            checked={rtpMetalSettings.syncWithBonusHuntColors}
                            onChange={(event) =>
                              updateRtpMetalSettings(
                                {
                                  syncWithBonusHuntColors: event.target.checked,
                                },
                                event.target.checked
                                  ? "RTP Metal synced to Bonus Hunt colours"
                                  : "RTP Metal manual colours restored",
                              )
                            }
                          />
                          <span>Sync with Bonus Hunt colours</span>
                        </label>
                      )}
                      <label className="ve-simple-color-picker">
                        <span>
                          Primary Metal colour
                          {rtpMetalSettings.syncWithBonusHuntColors
                            ? " (synced)"
                            : ""}
                        </span>
                        <input
                          type="color"
                          value={normalizeHexColor(
                            rtpMetalSettings.primaryColor,
                            DEFAULT_RTP_METAL_SETTINGS.primaryColor,
                          )}
                          disabled={rtpMetalSettings.syncWithBonusHuntColors}
                          onChange={(event) =>
                            updateRtpMetalSettings(
                              { primaryColor: event.target.value },
                              "RTP Metal primary colour updated",
                            )
                          }
                          aria-label="Primary Metal colour"
                        />
                      </label>
                      <label className="ve-simple-color-picker">
                        <span>
                          Secondary Metal colour
                          {rtpMetalSettings.syncWithBonusHuntColors
                            ? " (synced)"
                            : ""}
                        </span>
                        <input
                          type="color"
                          value={normalizeHexColor(
                            rtpMetalSettings.secondaryColor,
                            DEFAULT_RTP_METAL_SETTINGS.secondaryColor,
                          )}
                          disabled={rtpMetalSettings.syncWithBonusHuntColors}
                          onChange={(event) =>
                            updateRtpMetalSettings(
                              { secondaryColor: event.target.value },
                              "RTP Metal secondary colour updated",
                            )
                          }
                          aria-label="Secondary Metal colour"
                        />
                      </label>
                    </>
                  )}
                  {showBonusHuntColorSyncControls && bonusHuntMetalColors && (
                    <label className="ve-simple-toggle">
                      <input
                        type="checkbox"
                        checked={bonusHuntColorSyncSettings.enabled}
                        onChange={(event) =>
                          updateBonusHuntColorSyncSettings(event.target.checked)
                        }
                      />
                      <span>Sync both colours from Bonus Hunt</span>
                    </label>
                  )}
                  {currentSimpleAppearance.generatedTokens?.contrastRatio <
                    4.5 && (
                    <div className="ve-warning">
                      <AlertTriangle size={15} />
                      <span>This colour may be hard to read.</span>
                      <button
                        type="button"
                        onClick={() =>
                          applyQuickSettings(
                            { material: "matte" },
                            "Fix contrast",
                          )
                        }
                      >
                        Fix contrast
                      </button>
                    </div>
                  )}
                </CollapsibleSection>
              </Show>

              <Show when={sectionVisible(simpleSections, "textImages")}>
                <CollapsibleSection
                  id="textImages"
                  title="Typography"
                  openSections={openSimpleSections}
                  onToggle={toggleSimpleSection}
                  className="ve-simple-section"
                >
                  {hasQuickControl("fontFamily") && (
                    <label className="ve-simple-select">
                      <span>Font style</span>
                      <FontSelectInput
                        value={currentSimpleSettings.fontFamily}
                        options={FONT_OPTIONS}
                        onChange={(fontFamily) =>
                          applyQuickSettings({ fontFamily }, "Change font")
                        }
                        className="ve-font-select--simple"
                      />
                    </label>
                  )}
                  {hasQuickControl("textSize") && (
                    <div className="ve-simple-choice-row">
                      {SIMPLE_TEXT_SIZES.map((size) => (
                        <button
                          key={size.id}
                          type="button"
                          className={
                            currentSimpleSettings.textSize === size.id
                              ? "is-active"
                              : ""
                          }
                          onClick={() =>
                            applyQuickSettings(
                              { textSize: size.id },
                              `Choose ${size.label} text`,
                            )
                          }
                        >
                          {size.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {hasQuickControl("boldText") && (
                    <label className="ve-simple-toggle">
                      <input
                        type="checkbox"
                        checked={currentSimpleSettings.boldText}
                        onChange={(event) =>
                          applyQuickSettings(
                            { boldText: event.target.checked },
                            "Toggle bold text",
                          )
                        }
                      />
                      <span>Bold text</span>
                    </label>
                  )}
                  {hasQuickControl("musicDisplayStyle") && (
                    <label className="ve-simple-select">
                      <span>Spotify style</span>
                      <select
                        value={currentSimpleSettings.musicDisplayStyle}
                        onChange={(event) =>
                          applyQuickSettings(
                            { musicDisplayStyle: event.target.value },
                            "Change Spotify style",
                          )
                        }
                      >
                        {NAVBAR_MUSIC_DISPLAY_STYLES.map((style) => (
                          <option key={style.id} value={style.id}>
                            {style.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {hasAnyQuickControl([
                    "imageVisibility",
                    "imageSize",
                    "imageShape",
                    "imageFit",
                  ]) && (
                    <>
                      {hasAnyQuickControl(["imageVisibility", "imageSize"]) && (
                        <div className="ve-simple-choice-row">
                          {SIMPLE_IMAGE_SIZES.map((size) => {
                            const active =
                              size.id === "hidden"
                                ? currentSimpleSettings.imageVisibility ===
                                  "hidden"
                                : currentSimpleSettings.imageVisibility !==
                                    "hidden" &&
                                  currentSimpleSettings.imageSize === size.id;
                            return (
                              <button
                                key={size.id}
                                type="button"
                                className={active ? "is-active" : ""}
                                onClick={() =>
                                  applyQuickSettings(
                                    {
                                      imageSize:
                                        size.id === "hidden"
                                          ? currentSimpleSettings.imageSize ||
                                            "medium"
                                          : size.id,
                                      imageVisibility:
                                        size.id === "hidden"
                                          ? "hidden"
                                          : "show",
                                    },
                                    `Choose ${size.label} images`,
                                  )
                                }
                              >
                                {size.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {hasQuickControl("imageShape") && (
                        <div className="ve-simple-choice-row">
                          {SIMPLE_IMAGE_SHAPES.map((shape) => (
                            <button
                              key={shape.id}
                              type="button"
                              className={
                                currentSimpleSettings.imageShape === shape.id
                                  ? "is-active"
                                  : ""
                              }
                              onClick={() =>
                                applyQuickSettings(
                                  { imageShape: shape.id },
                                  `Choose ${shape.label} images`,
                                )
                              }
                            >
                              {shape.label}
                            </button>
                          ))}
                        </div>
                      )}
                      {hasQuickControl("imageFit") && (
                        <div className="ve-simple-choice-row">
                          {["cover", "contain"].map((fit) => (
                            <button
                              key={fit}
                              type="button"
                              className={
                                currentSimpleSettings.imageFit === fit
                                  ? "is-active"
                                  : ""
                              }
                              onClick={() =>
                                applyQuickSettings(
                                  { imageFit: fit },
                                  `Choose ${fit} image fit`,
                                )
                              }
                            >
                              {fit === "cover" ? "Cover" : "Contain"}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </CollapsibleSection>
              </Show>

              <Show
                when={sectionVisible(
                  simpleSections,
                  NAVBAR_APPEARANCE_SECTION_ID,
                )}
              >
                <CollapsibleSection
                  id={NAVBAR_APPEARANCE_SECTION_ID}
                  title="Navbar Sections"
                  openSections={openSimpleSections}
                  onToggle={toggleSimpleSection}
                  className="ve-simple-section"
                >
                  <label className="ve-simple-toggle">
                    <input
                      type="checkbox"
                      checked={!!selectedWidget?.config?.showCTA}
                      onChange={(event) =>
                        updateSelectedWidgetConfig(
                          { showCTA: event.target.checked },
                          event.target.checked ? "CTA enabled" : "CTA hidden",
                        )
                      }
                    />
                    <span>Show CTA badge</span>
                  </label>
                  {!!selectedWidget?.config?.showCTA && (
                    <label className="ve-simple-select">
                      <span>CTA text</span>
                      <input
                        type="text"
                        value={selectedWidget?.config?.ctaText || ""}
                        onChange={(event) =>
                          updateSelectedWidgetConfig(
                            { ctaText: event.target.value },
                            "CTA text updated",
                          )
                        }
                        placeholder="Be Gamble Aware!"
                      />
                    </label>
                  )}
                  <label className="ve-simple-toggle">
                    <input
                      type="checkbox"
                      checked={!!selectedWidget?.config?.showNowPlaying}
                      onChange={(event) =>
                        updateSelectedWidgetConfig(
                          { showNowPlaying: event.target.checked },
                          event.target.checked
                            ? "Spotify section enabled"
                            : "Spotify section hidden",
                        )
                      }
                    />
                    <span>Show Spotify / music</span>
                  </label>
                  {hasQuickControl("musicDisplayStyle") && (
                    <label className="ve-simple-select">
                      <span>Spotify style</span>
                      <select
                        value={currentSimpleSettings.musicDisplayStyle}
                        onChange={(event) =>
                          applyQuickSettings(
                            { musicDisplayStyle: event.target.value },
                            "Change Spotify style",
                          )
                        }
                      >
                        {NAVBAR_MUSIC_DISPLAY_STYLES.map((style) => (
                          <option key={style.id} value={style.id}>
                            {style.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </CollapsibleSection>
              </Show>

              <Show when={sectionVisible(simpleSections, "shapeEffects")}>
                <CollapsibleSection
                  id="shapeEffects"
                  title="Border and shape"
                  openSections={openSimpleSections}
                  onToggle={toggleSimpleSection}
                  className="ve-simple-section"
                >
                  {hasQuickControl("shape") && (
                    <div className="ve-simple-choice-row ve-shape-row">
                      {SIMPLE_SHAPES.filter(
                        (shape) =>
                          shape.id !== "pill" ||
                          selectedStyleCapabilities.containerShapes,
                      ).map((shape) => (
                        <button
                          key={shape.id}
                          type="button"
                          className={
                            currentSimpleSettings.shape === shape.id
                              ? "is-active"
                              : ""
                          }
                          onClick={() =>
                            applyQuickSettings(
                              { shape: shape.id },
                              `Choose ${shape.label}`,
                            )
                          }
                        >
                          <span
                            style={{
                              borderRadius:
                                shape.radius >= 80 ? 999 : shape.radius,
                            }}
                          />
                          {shape.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {hasAnyQuickControl(["density", "scale"]) && (
                    <>
                      {hasQuickControl("density") && (
                        <div className="ve-simple-choice-row">
                          {SIMPLE_DENSITIES.map((size) => (
                            <button
                              key={size.id}
                              type="button"
                              className={
                                currentSimpleSettings.density === size.id
                                  ? "is-active"
                                  : ""
                              }
                              onClick={() =>
                                applyQuickSettings(
                                  { density: size.id },
                                  `Choose ${size.label}`,
                                )
                              }
                            >
                              {size.label}
                            </button>
                          ))}
                        </div>
                      )}
                      {hasQuickControl("scale") && (
                        <label className="ve-simple-range">
                          <span>Widget size</span>
                          <input
                            type="range"
                            min="75"
                            max="150"
                            step="5"
                            value={Math.round(
                              currentSimpleSettings.scale * 100,
                            )}
                            onChange={(event) =>
                              applyQuickSettings(
                                { scale: Number(event.target.value) / 100 },
                                "Change widget size",
                              )
                            }
                          />
                          <strong>
                            {Math.round(currentSimpleSettings.scale * 100)}%
                          </strong>
                        </label>
                      )}
                      {hasQuickControl("barHeight") && (
                        <label className="ve-simple-range">
                          <span>Bar height</span>
                          <input
                            type="range"
                            min="32"
                            max="160"
                            step="1"
                            value={Math.round(
                              currentSimpleSettings.barHeight ||
                                (selectedWidgetType === "rtp_stats" ? 54 : 64),
                            )}
                            onChange={(event) =>
                              applyQuickSettings(
                                { barHeight: Number(event.target.value) },
                                "Change bar height",
                              )
                            }
                          />
                          <strong>
                            {Math.round(
                              currentSimpleSettings.barHeight ||
                                (selectedWidgetType === "rtp_stats" ? 54 : 64),
                            )}
                            px
                          </strong>
                        </label>
                      )}
                      {hasQuickControl("maxWidth") && (
                        <label className="ve-simple-range">
                          <span>Bar width</span>
                          <input
                            type="range"
                            min={
                              selectedWidgetType === "rtp_stats" ? "280" : "480"
                            }
                            max="1920"
                            step="10"
                            value={Math.round(
                              currentSimpleSettings.maxWidth ||
                                (selectedWidgetType === "rtp_stats"
                                  ? 960
                                  : 1200),
                            )}
                            onChange={(event) =>
                              applyQuickSettings(
                                { maxWidth: Number(event.target.value) },
                                "Change bar width",
                              )
                            }
                          />
                          <strong>
                            {Math.round(
                              currentSimpleSettings.maxWidth ||
                                (selectedWidgetType === "rtp_stats"
                                  ? 960
                                  : 1200),
                            )}
                            px
                          </strong>
                        </label>
                      )}
                    </>
                  )}
                  {hasQuickControl("shadowStrength") && (
                    <div className="ve-simple-choice-row">
                      {SIMPLE_STRENGTHS.filter((item) =>
                        ["off", "soft", "medium", "strong"].includes(item.id),
                      ).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={
                            currentSimpleSettings.shadowStrength === item.id
                              ? "is-active"
                              : ""
                          }
                          onClick={() =>
                            applyQuickSettings(
                              { shadowStrength: item.id },
                              `Choose ${item.label} shadow`,
                            )
                          }
                        >
                          {item.label} shadow
                        </button>
                      ))}
                    </div>
                  )}
                  {hasQuickControl("glowStrength") && (
                    <div className="ve-simple-choice-row">
                      {SIMPLE_STRENGTHS.filter((item) =>
                        ["off", "subtle", "medium", "strong"].includes(item.id),
                      ).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={
                            currentSimpleSettings.glowStrength === item.id
                              ? "is-active"
                              : ""
                          }
                          onClick={() =>
                            applyQuickSettings(
                              { glowStrength: item.id },
                              `Choose ${item.label} glow`,
                            )
                          }
                        >
                          {item.label} glow
                        </button>
                      ))}
                    </div>
                  )}
                </CollapsibleSection>
              </Show>

              <Show when={sectionVisible(simpleSections, "motion")}>
                <CollapsibleSection
                  id="motion"
                  title="Effects and animation"
                  openSections={openSimpleSections}
                  onToggle={toggleSimpleSection}
                  className="ve-simple-section"
                >
                  {hasQuickControl("carouselAutoplay") && (
                    <label className="ve-simple-toggle">
                      <input
                        type="checkbox"
                        checked={currentSimpleSettings.carouselAutoplay}
                        onChange={(event) =>
                          applyQuickSettings(
                            { carouselAutoplay: event.target.checked },
                            "Toggle carousel autoplay",
                          )
                        }
                      />
                      <span>Autoplay carousel</span>
                    </label>
                  )}
                  {hasQuickControl("carouselSpeed") && (
                    <div className="ve-simple-choice-row">
                      {SIMPLE_MOTION_SPEEDS.map((speed) => (
                        <button
                          key={speed.id}
                          type="button"
                          className={
                            currentSimpleSettings.carouselSpeed === speed.id
                              ? "is-active"
                              : ""
                          }
                          onClick={() =>
                            applyQuickSettings(
                              { carouselSpeed: speed.id },
                              `Choose ${speed.label} carousel speed`,
                            )
                          }
                        >
                          {speed.label} carousel
                        </button>
                      ))}
                    </div>
                  )}
                  {hasQuickControl("carouselDirection") && (
                    <div className="ve-simple-choice-row">
                      {["left", "right"].map((direction) => (
                        <button
                          key={direction}
                          type="button"
                          className={
                            currentSimpleSettings.carouselDirection ===
                            direction
                              ? "is-active"
                              : ""
                          }
                          onClick={() =>
                            applyQuickSettings(
                              { carouselDirection: direction },
                              `Choose ${direction} carousel direction`,
                            )
                          }
                        >
                          {direction === "left" ? "Left" : "Right"}
                        </button>
                      ))}
                    </div>
                  )}
                  {hasQuickControl("animationEnabled") && (
                    <label className="ve-simple-toggle">
                      <input
                        type="checkbox"
                        checked={currentSimpleSettings.animationEnabled}
                        onChange={(event) =>
                          applyQuickSettings(
                            { animationEnabled: event.target.checked },
                            "Toggle animation",
                          )
                        }
                      />
                      <span>Animation</span>
                    </label>
                  )}
                  {hasQuickControl("animationSpeed") && (
                    <div className="ve-simple-choice-row">
                      {SIMPLE_MOTION_SPEEDS.map((speed) => (
                        <button
                          key={speed.id}
                          type="button"
                          className={
                            currentSimpleSettings.animationSpeed === speed.id
                              ? "is-active"
                              : ""
                          }
                          onClick={() =>
                            applyQuickSettings(
                              { animationSpeed: speed.id },
                              `Choose ${speed.label} animation`,
                            )
                          }
                        >
                          {speed.label} animation
                        </button>
                      ))}
                    </div>
                  )}
                  {hasQuickControl("animationIntensity") && (
                    <div className="ve-simple-choice-row">
                      {["subtle", "normal", "strong"].map((intensity) => (
                        <button
                          key={intensity}
                          type="button"
                          className={
                            currentSimpleSettings.animationIntensity ===
                            intensity
                              ? "is-active"
                              : ""
                          }
                          onClick={() =>
                            applyQuickSettings(
                              { animationIntensity: intensity },
                              `Choose ${intensity} animation intensity`,
                            )
                          }
                        >
                          {intensity[0].toUpperCase() + intensity.slice(1)}
                        </button>
                      ))}
                    </div>
                  )}
                </CollapsibleSection>
              </Show>

              <Show when={hasSimpleQuickPresets(serverState.presets)}>
                <CollapsibleSection
                  id="advanced"
                  title="Advanced"
                  openSections={openSimpleSections}
                  onToggle={toggleSimpleSection}
                  className="ve-simple-section"
                >
                  <div className="ve-user-presets">
                    {serverState.presets
                      .filter((preset) => preset.isSimpleQuickStyle)
                      .map((preset) => (
                        <div key={preset.id} className="ve-user-preset-row">
                          <button
                            type="button"
                            onClick={() => applyPreset(preset)}
                          >
                            {preset.name}
                          </button>
                          <button
                            type="button"
                            onClick={() => duplicatePreset(preset)}
                            title="Duplicate preset"
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => renamePreset(preset)}
                            title="Rename preset"
                          >
                            Rename
                          </button>
                          <button
                            type="button"
                            onClick={() => deletePreset(preset)}
                            title="Delete preset"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                  </div>
                </CollapsibleSection>
              </Show>
            </div>
            <section className="ve-simple-final">
              <header>
                <h3>Draft tools</h3>
              </header>
              <div className="ve-simple-actions ve-simple-actions--final">
                <button
                  type="button"
                  onClick={undo}
                  disabled={!undoStack.length}
                  aria-label="Undo"
                  title="Undo"
                >
                  <Undo2 size={15} />
                  Undo
                </button>
                <button
                  type="button"
                  onClick={restoreRecommendedStyle}
                  aria-label="Restore recommended style"
                  title="Restore recommended style"
                >
                  <RotateCcw size={15} />
                  Restore
                </button>
                <button
                  type="button"
                  onClick={saveCurrentPreset}
                  aria-label="Save as My Preset"
                  title="Save as My Preset"
                >
                  <Save size={15} />
                  Preset
                </button>
              </div>
            </section>
          </aside>
        ) : (
          <AdvancedPropertiesPanel
            advancedSectionTabs={advancedSectionTabs}
            controlGroups={controlGroups}
            editingWholeWidget={editingWholeWidget}
            onDeselectElement={deselectElement}
            onHideTour={hideTour}
            onResetAll={resetAll}
            onResetElement={resetElement}
            onResetWidget={resetWidget}
            onSetTourHidden={hideTourPermanently}
            onToggleSection={toggleAdvancedSection}
            openSections={openAdvancedSections}
            renderElementControl={renderElementControl}
            renderQuickControl={renderQuickControl}
            selectedElement={selectedElement}
            selectedLayerLocked={selectedLayerLocked}
            selectedStateId={selectedStateId}
            selectedWidgetName={selectedWidgetName}
            selectedWidgetOverrides={selectedWidgetOverrides}
            selectedWidgetUsesV2={selectedWidgetUsesV2}
            tourVisible={tourVisible}
            warnings={warnings}
          />
        )}
      </div>

      <AppearanceToast toast={toast} />
    </div>
  );
}
