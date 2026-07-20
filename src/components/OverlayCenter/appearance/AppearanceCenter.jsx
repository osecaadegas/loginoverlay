import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Copy,
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
  Wand2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import OverlayPreview from '../OverlayPreview';
import { trackEvent } from '../../../utils/analytics';
import { ANALYTICS_EVENTS } from '../../../../shared/analytics';
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
} from './appearanceModel';
import {
  BUILT_IN_STYLE_PRESETS,
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
} from './editorSchema';
import {
  buildAppearanceV2ForStorage,
  getSimpleAppearanceV2Settings,
} from './v2/appearanceResolver';
import {
  getWidgetStyleCapability,
  getWidgetStyleElements,
  getWidgetStyleQuickControls,
  getWidgetStyleOptionsForQuickEditor,
  isWidgetAppearanceV2Enabled,
} from './v2/widgetAppearanceRegistry';
import { FontSelectInput, LayerToggleButton, PropertyControl } from './propertyControls';
import './AppearanceCenter.css';

const TOUR_STORAGE_KEY = 'streamers_center_appearance_tour_hidden';
const MODE_STORAGE_KEY = 'streamers_center_appearance_mode';
const RECENT_COLORS_STORAGE_KEY = 'streamers_center_appearance_recent_colors';
const CLIENT_ID_PREFIX = 'appearance_editor';

const PREVIEW_BACKGROUNDS = [
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Light' },
  { id: 'checkerboard', label: 'Grid' },
  { id: 'green', label: 'Green' },
];

const WIDGET_PREVIEW_STATES = {
  slot_requests: [
    { id: 'with_requests', label: 'With requests' },
    { id: 'empty', label: 'Empty' },
    { id: 'busy_queue', label: 'Busy queue' },
  ],
  giveaway: [
    { id: 'live', label: 'Live' },
    { id: 'drawing', label: 'Drawing' },
    { id: 'winner', label: 'Winner' },
    { id: 'empty', label: 'Empty' },
  ],
};

const ZOOM_STEPS = [25, 40, 50, 67, 75, 90, 100, 125, 150, 200];

const NAVBAR_MUSIC_DISPLAY_STYLES = [
  { id: 'text', label: 'Text' },
  { id: 'pill', label: 'Pill' },
  { id: 'marquee', label: 'Marquee' },
  { id: 'albumart', label: 'Album art' },
  { id: 'equalizer', label: 'Equalizer' },
  { id: 'vinyl', label: 'Vinyl' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'wave', label: 'Wave' },
];

const QUICK_WIDGET_CONTROLS = [
  { id: 'mainColor', label: 'Main color', control: CONTROL_DEFINITIONS.backgroundColor, path: 'colors.primary' },
  { id: 'accentColor', label: 'Accent color', control: CONTROL_DEFINITIONS.backgroundColor, path: 'colors.accent' },
  { id: 'fontFamily', label: 'Font', control: CONTROL_DEFINITIONS.fontFamily, path: 'typography.bodyFont' },
  { id: 'baseSize', label: 'Text size', control: CONTROL_DEFINITIONS.fontSize, path: 'typography.baseSize' },
  { id: 'background', label: 'Background', control: CONTROL_DEFINITIONS.backgroundColor, path: 'surfaces.containerBg' },
  { id: 'radius', label: 'Rounded corners', control: CONTROL_DEFINITIONS.radius, path: 'borders.radius' },
  { id: 'widgetWidth', label: 'Widget width', control: CONTROL_DEFINITIONS.width, path: 'container.width' },
  { id: 'widgetHeight', label: 'Widget height', control: CONTROL_DEFINITIONS.height, path: 'container.height' },
  { id: 'padding', label: 'Space inside', control: CONTROL_DEFINITIONS.padding, path: 'surfaces.padding' },
  { id: 'gap', label: 'Space between items', control: CONTROL_DEFINITIONS.gap, path: 'surfaces.gap' },
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

const WHOLE_WIDGET_ELEMENT_IDS = new Set(['container', 'root']);
const GLOBAL_QUICK_STYLE_CONTROLS = new Set([
  'material',
  'scale',
  'carouselAutoplay',
  'carouselSpeed',
  'carouselDirection',
  'animationEnabled',
  'animationSpeed',
  'animationIntensity',
  'barHeight',
  'maxWidth',
  'musicDisplayStyle',
]);

function safeJson(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

function createClientId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return `${CLIENT_ID_PREFIX}_${crypto.randomUUID()}`;
  return `${CLIENT_ID_PREFIX}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function getInitialMode() {
  if (typeof window === 'undefined') return 'simple';
  return window.localStorage.getItem(MODE_STORAGE_KEY) === 'advanced' ? 'advanced' : 'simple';
}

function getInitialTourVisible() {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(TOUR_STORAGE_KEY) !== '1';
}

function getInitialRecentColors() {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(RECENT_COLORS_STORAGE_KEY) || '[]');
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
    getByPath(appearance, `${root}.appearance.simpleSettings`)
    || getByPath(appearance, `${root}.simpleSettings`)
    || {}
  );
}

function getSimplePresetVars(settings) {
  if (settings?.material === 'original') {
    return {
      '--preset-primary': '#14d8d8',
      '--preset-accent': '#f5b301',
      '--preset-surface': 'linear-gradient(160deg, rgba(30,58,138,0.95), rgba(15,23,42,0.96))',
      '--preset-card': 'rgba(15, 23, 42, 0.72)',
      '--preset-border': 'rgba(20, 216, 216, 0.46)',
      '--preset-text': '#f8fafc',
      '--preset-glow': '#14d8d8',
    };
  }
  const generated = generateSimpleAppearance(settings);
  return {
    '--preset-primary': generated.colors?.primary || settings.primaryColor,
    '--preset-accent': generated.colors?.accent || settings.accentColor,
    '--preset-surface': generated.surfaces?.containerBg || 'rgba(15,23,42,0.9)',
    '--preset-card': generated.surfaces?.cardBg || 'rgba(255,255,255,0.08)',
    '--preset-border': generated.borders?.color || 'rgba(148,163,184,0.28)',
    '--preset-text': generated.colors?.text || '#f8fafc',
    '--preset-glow': generated.effects?.glowColor || generated.colors?.primary || settings.primaryColor,
  };
}

function createTarget(widget, appearance) {
  if (!widget) return { scope: 'overlay' };
  return {
    scope: 'widget_instance',
    widgetId: widget.id,
    widgetType: widget.widget_type,
    styleId: getWidgetActiveStyleId(widget, appearance),
  };
}

function targetKey(target) {
  if (!target) return 'overlay';
  return `${target.scope || 'overlay'}:${target.widgetId || ''}:${target.widgetType || ''}:${target.styleId || ''}`;
}

function getFirstWidget(widgets = []) {
  return widgets.find(widget => widget?.is_visible) || widgets[0] || null;
}

function getFirstElement(widgetType) {
  return getWidgetElementSchema(widgetType)[0] || null;
}

function getFirstElementForStyle(widgetType, styleId) {
  if (isWidgetAppearanceV2Enabled(widgetType)) {
    return getWidgetStyleElements(widgetType, styleId)[0] || getFirstElement(widgetType);
  }
  return getFirstElement(widgetType);
}

function supportsAny(capabilities = {}, keys = []) {
  return keys.some(key => !!capabilities[key]);
}

function isWholeWidgetQuickElement(element) {
  return !element?.id || WHOLE_WIDGET_ELEMENT_IDS.has(element.id);
}

function elementHasCapability(element, capability) {
  return Array.isArray(element?.capabilities) && element.capabilities.includes(capability);
}

function canScopeQuickPatchToElement(element, patch = {}) {
  if (isWholeWidgetQuickElement(element)) return false;
  const keys = Object.keys(patch || {});
  return keys.length > 0 && keys.every(key => !GLOBAL_QUICK_STYLE_CONTROLS.has(key));
}

function pxValue(value) {
  return `${Math.round(Number(value) || 0)}px`;
}

function quickElementShadow(tokens = {}) {
  const intensity = Number(tokens.materialTokens?.shadowIntensity || 0);
  if (intensity <= 0.01) return undefined;
  return `0 ${pxValue(intensity * 14)} ${pxValue(intensity * 34)} ${tokens.colors?.shadow || 'rgba(0,0,0,0.34)'}`;
}

function quickElementGlow(tokens = {}) {
  const intensity = Number(tokens.materialTokens?.glowIntensity || 0);
  if (intensity <= 0.01) return undefined;
  return `0 0 ${pxValue(intensity * 38)} ${tokens.colors?.glow || tokens.colors?.primary || 'rgba(20,216,216,0.34)'}`;
}

function pickQuickElementFontSize(tokens = {}, element = {}) {
  const id = String(element.id || '').toLowerCase();
  if (id.includes('title') || id.includes('header')) return tokens.typography?.headerSize;
  if (id.includes('label') || id.includes('description') || id.includes('viewer')) return tokens.typography?.labelSize;
  if (id.includes('value') || id.includes('total')) return tokens.typography?.valueSize;
  return tokens.typography?.bodySize;
}

function pickQuickElementRadius(tokens = {}, element = {}) {
  if (element.kind === 'badge' || element.kind === 'progress') return tokens.shape?.badgeRadius;
  if (element.kind === 'image') return tokens.image?.radius ?? tokens.shape?.cardRadius;
  if (['widgetBackground', 'container', 'root'].includes(element.id)) return tokens.shape?.rootRadius;
  return tokens.shape?.cardRadius ?? tokens.shape?.rootRadius;
}

function buildElementQuickOverrideFromPatch(element, patch = {}, tokens = {}) {
  const override = {};
  const capabilities = new Set(element?.capabilities || []);
  const isText = element?.kind === 'text' || capabilities.has('typography');
  const isSurface = element?.kind === 'surface' || element?.kind === 'carousel' || capabilities.has('surface');
  const isImage = element?.kind === 'image' || capabilities.has('image');
  const isProgress = element?.kind === 'progress' || capabilities.has('progress');

  if (patch.primaryColor !== undefined) {
    if (isText && !isSurface) override.textColor = tokens.colors?.primary;
    else if (isProgress) override.fillColor = tokens.colors?.primary;
    else if (isImage) override.borderColor = tokens.colors?.primary;
    else if (isSurface) {
      override.background = tokens.colors?.secondarySurface;
      override.borderColor = tokens.colors?.primary;
      override.accentColor = tokens.colors?.primary;
    }
  }
  if (patch.accentColor !== undefined || patch.useSecondColor !== undefined) {
    if (isText && !isSurface) override.textColor = tokens.colors?.accent;
    else if (isProgress) override.fillColor = tokens.colors?.accent;
    else if (isImage) override.borderColor = tokens.colors?.accent;
    else if (isSurface) {
      override.borderColor = tokens.colors?.accent;
      override.accentColor = tokens.colors?.accent;
    }
  }
  if (patch.fontFamily !== undefined && isText) override.fontFamily = tokens.typography?.bodyFont;
  if (patch.textSize !== undefined && isText) override.fontSize = pickQuickElementFontSize(tokens, element);
  if (patch.boldText !== undefined && isText) override.fontWeight = patch.boldText ? tokens.typography?.valueWeight : tokens.typography?.bodyWeight;
  if (patch.imageVisibility !== undefined && isImage) override.visible = patch.imageVisibility !== 'hidden';
  if (patch.imageSize !== undefined && isImage) override.imageSize = Math.round(38 * (tokens.image?.sizeMultiplier || 1));
  if (patch.imageShape !== undefined && (isImage || capabilities.has('shape'))) override.radius = pickQuickElementRadius(tokens, element);
  if (patch.imageFit !== undefined && isImage) override.imageFit = tokens.image?.fit || 'cover';
  if (patch.shape !== undefined && (capabilities.has('shape') || capabilities.has('border') || isSurface || isProgress)) {
    override.radius = pickQuickElementRadius(tokens, element);
  }
  if (patch.density !== undefined && capabilities.has('spacing')) {
    override.padding = tokens.spacing?.cardPadding;
    override.gap = tokens.spacing?.itemGap;
  }
  if (patch.shadowStrength !== undefined && (capabilities.has('shadow') || element?.kind === 'carousel')) {
    override.shadow = quickElementShadow(tokens);
  }
  if (patch.glowStrength !== undefined && (capabilities.has('shadow') || element?.kind === 'carousel')) {
    const shadow = [override.shadow, quickElementGlow(tokens)].filter(Boolean).join(', ');
    override.shadow = shadow || override.shadow;
  }

  return Object.fromEntries(Object.entries(override).filter(([, value]) => value !== undefined));
}

function styleEdited(appearance, widgetId, styleId) {
  if (!widgetId || !styleId) return false;
  return countObjectLeaves(getByPath(appearance, `widgets.${widgetId}.styles.${styleId}`)) > 0;
}

function StylePreviewCard({
  widget,
  option,
  active,
  edited,
  onSelect,
}) {
  if (!widget || !option) return null;
  return (
    <button
      type="button"
      className={`ve-style-card${active ? ' is-active' : ''}${edited ? ' is-edited' : ''}`}
      onClick={() => onSelect?.(option.id)}
      aria-pressed={active}
    >
      <span className="ve-style-card__mark" aria-hidden="true"><span /></span>
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

function resolveElementPath(root, elementId, property, stateId = 'default') {
  const propertyPath = getElementAppearancePropertyPath(property);
  if (stateId && stateId !== 'default') {
    return `${root}.elements.${elementId}.states.${stateId}.${propertyPath}`;
  }
  return `${root}.elements.${elementId}.${propertyPath}`;
}

function resolveV2ElementOverridePath(root, elementId, property, stateId = 'default') {
  if (stateId && stateId !== 'default') {
    return `${root}.appearanceV2.elementOverrides.${elementId}.states.${stateId}.${property}`;
  }
  return `${root}.appearanceV2.elementOverrides.${elementId}.${property}`;
}

function resolveLegacyElementPath(root, elementId, property, stateId = 'default') {
  if (stateId && stateId !== 'default') {
    return `${root}.subElements.${elementId}.states.${stateId}.${property}`;
  }
  return `${root}.subElements.${elementId}.${property}`;
}

function formatStatus(status, dirty) {
  if (status === 'saving') return 'Saving...';
  if (status === 'failed') return 'Save failed';
  if (dirty) return 'Unsaved changes';
  return 'Saved';
}

function formatDraftStatus(status, dirty) {
  if (status === 'saving') return 'Saving draft...';
  if (status === 'failed') return 'Draft save failed';
  if (dirty) return 'Unsaved draft';
  return 'Draft saved';
}

function formatPublishStatus(status, hasUnpublishedChanges) {
  if (status === 'publishing') return 'Publishing...';
  if (status === 'failed') return 'Publish failed';
  if (status === 'published') return 'Published to OBS';
  if (hasUnpublishedChanges || status === 'unpublished') return 'Unpublished changes';
  return 'Published to OBS';
}

function publishStatusClass(status, hasUnpublishedChanges) {
  if (status === 'publishing') return 'publishing';
  if (status === 'failed') return 'failed';
  if (status === 'published') return 'published';
  if (hasUnpublishedChanges || status === 'unpublished') return 'unpublished';
  return 'published';
}

function mapControlGroupTitle(label = '') {
  const key = label.toLowerCase();
  if (key.includes('font') || key.includes('text') || key.includes('type')) return 'Typography';
  if (key.includes('space') || key.includes('size') || key.includes('layout') || key.includes('position')) return 'Spacing and sizing';
  if (key.includes('border') || key.includes('radius') || key.includes('shape')) return 'Border and shape';
  if (key.includes('effect') || key.includes('shadow') || key.includes('glow') || key.includes('animation') || key.includes('motion')) return 'Effects and animation';
  if (key.includes('background') || key.includes('surface') || key.includes('color') || key.includes('colour') || key.includes('finish')) return 'Surface and background';
  return label || 'Advanced';
}

function layerKey(widgetId, elementId) {
  return `${widgetId || 'overlay'}:${elementId || 'container'}`;
}

function groupLayers(elements) {
  const labels = {
    surface: 'Structure',
    text: 'Text',
    image: 'Images',
    progress: 'Progress',
    mixed: 'Other',
  };
  return elements.reduce((groups, element) => {
    const kind = element.kind || inferElementKind(element);
    const id = labels[kind] ? kind : 'mixed';
    if (!groups[id]) groups[id] = { id, label: labels[id] || 'Other', items: [] };
    groups[id].items.push(element);
    return groups;
  }, {});
}

function countObjectLeaves(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value === undefined ? 0 : 1;
  return Object.values(value).reduce((total, item) => total + countObjectLeaves(item), 0);
}

function isTypingTarget(target) {
  const tag = target?.tagName?.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable;
}

function getPresetAppearance(preset) {
  return preset?.appearance || {};
}

function normalizeControl(control, label) {
  if (!control) return control;
  return label ? { ...control, label } : control;
}

function WidgetIcon({ icon }) {
  if (typeof icon === 'string' && icon.length <= 3) return <span className="ve-widget-card__emoji">{icon}</span>;
  return <Palette size={18} />;
}

function ToolbarButton({ children, icon: Icon, active = false, primary = false, danger = false, ...props }) {
  return (
    <button
      type="button"
      className={[
        've-toolbar-button',
        active ? 'is-active' : '',
        primary ? 've-toolbar-button--primary' : '',
        danger ? 've-toolbar-button--danger' : '',
      ].filter(Boolean).join(' ')}
      {...props}
    >
      {Icon && <Icon size={16} />}
      {children && <span>{children}</span>}
    </button>
  );
}

function ToolbarGroup({ label, children }) {
  return (
    <span className="ve-toolbar-group" role="group" aria-label={label}>
      <span className="ve-toolbar-group__label">{label}</span>
      <span className="ve-toolbar-group__items">{children}</span>
    </span>
  );
}

function CollapsibleSection({ id, title, meta, openSections, onToggle, children, className = '' }) {
  const open = openSections.includes(id);
  return (
    <section className={`ve-property-section ve-collapsible-section ${className}${open ? ' is-open' : ''}`}>
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
      {sections.map(section => {
        const active = openSections.includes(section.id);
        return (
          <button
            key={section.id}
            type="button"
            className={active ? 'is-active' : ''}
            onClick={() => onToggle(section.id)}
            aria-pressed={active}
          >
            {section.label}
          </button>
        );
      })}
    </nav>
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
  updateState,
  onOpenPreview,
  onFocusPreview,
  previewStatus,
}) {
  const clientIdRef = useRef(createClientId());
  const saveTimerRef = useRef(null);
  const serverState = useMemo(
    () => buildOverlayAppearanceState(overlayState || {}, { theme, widgets }),
    [overlayState, theme, widgets]
  );
  const firstWidget = useMemo(() => getFirstWidget(widgets), [widgets]);
  const [mode, setMode] = useState(getInitialMode);
  const [draft, setDraft] = useState(() => serverState.draft);
  const [selectedTarget, setSelectedTarget] = useState(() => createTarget(firstWidget, serverState.draft));
  const [selectedElementId, setSelectedElementId] = useState(() => {
    const target = createTarget(firstWidget, serverState.draft);
    return getFirstElementForStyle(firstWidget?.widget_type, target.styleId)?.id || '';
  });
  const [selectedStateId, setSelectedStateId] = useState('default');
  const [sidebarTab, setSidebarTab] = useState('widgets');
  const [widgetSearch, setWidgetSearch] = useState('');
  const [previewMode, setPreviewMode] = useState(() => EDITOR_MODE_CAPABILITIES[getInitialMode()]?.previewMode || 'fit-widget');
  const [previewBackground, setPreviewBackground] = useState('dark');
  const [previewStateByWidget, setPreviewStateByWidget] = useState({});
  const [previewPositions, setPreviewPositions] = useState({});
  const [zoom, setZoom] = useState('fit');
  const [obsSafe, setObsSafe] = useState(true);
  const [showBefore, setShowBefore] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [publishStatus, setPublishStatus] = useState('published');
  const [statusMessage, setStatusMessage] = useState('');
  const [openSimpleSections, setOpenSimpleSections] = useState(['widgetStyle', 'editing']);
  const [openAdvancedSections, setOpenAdvancedSections] = useState(['stylePreset', 'partSelection']);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [hiddenLayers, setHiddenLayers] = useState({});
  const [lockedLayers, setLockedLayers] = useState({});
  const [tourVisible, setTourVisible] = useState(getInitialTourVisible);
  const [recentColors, setRecentColors] = useState(getInitialRecentColors);
  const [toast, setToast] = useState('');
  const canvasPanelRef = useRef(null);
  const lastPersistedDraftRef = useRef(safeJson(serverState.draft));
  const lastPublishedRef = useRef(safeJson(serverState.published || {}));
  const lastRevisionRef = useRef(serverState.revision);

  const selectedWidget = useMemo(
    () => widgets.find(widget => widget.id === selectedTarget.widgetId) || firstWidget,
    [widgets, selectedTarget.widgetId, firstWidget]
  );
  const previewWidgets = useMemo(() => widgets.map(widget => {
    const position = previewPositions[widget.id];
    return position ? { ...widget, position_x: position.x, position_y: position.y } : widget;
  }), [previewPositions, widgets]);
  const selectedWidgetName = selectedWidget ? getWidgetDisplayName(selectedWidget) : 'Overlay';
  const selectedWidgetType = selectedWidget?.widget_type || selectedTarget.widgetType || '';
  const selectedWidgetUsesV2 = isWidgetAppearanceV2Enabled(selectedWidgetType);
  const selectedTargetRoot = useMemo(() => getTargetOverrideRoot(selectedTarget), [selectedTarget]);
  const currentSimpleSettings = useMemo(
    () => getSimpleSettingsAtRoot(draft, selectedTargetRoot, selectedWidgetType),
    [draft, selectedTargetRoot, selectedWidgetType]
  );
  const currentSimpleAppearance = useMemo(
    () => generateSimpleAppearance(currentSimpleSettings),
    [currentSimpleSettings]
  );
  const visibleMaterialPresets = useMemo(
    () => {
      if (selectedWidgetType === 'bonus_hunt') {
        return SIMPLE_MATERIAL_PRESETS.filter(preset => preset.id !== 'soft_shadow');
      }
      return SIMPLE_MATERIAL_PRESETS.filter(preset => (
        preset.id !== 'original'
        && (!selectedWidgetUsesV2 || preset.id !== 'soft_shadow')
      ));
    },
    [selectedWidgetType, selectedWidgetUsesV2]
  );
  const registeredStyleOptions = useMemo(
    () => getWidgetStyleOptions(selectedWidgetType, draft, selectedWidget?.id),
    [draft, selectedWidget?.id, selectedWidgetType]
  );
  const quickStyleOptions = useMemo(() => {
    const v2Options = selectedWidgetUsesV2 ? getWidgetStyleOptionsForQuickEditor(selectedWidgetType) : [];
    const byId = new Map();
    for (const option of v2Options) byId.set(option.id, option);
    for (const option of registeredStyleOptions) {
      byId.set(option.id, {
        ...(byId.get(option.id) || {}),
        ...option,
        label: byId.get(option.id)?.label || option.label,
        recommended: byId.get(option.id)?.recommended || false,
      });
    }
    return [...byId.values()].map(option => ({
      ...option,
      edited: styleEdited(draft, selectedWidget?.id, option.id),
    }));
  }, [draft, registeredStyleOptions, selectedWidget?.id, selectedWidgetType, selectedWidgetUsesV2]);
  const selectedStyleCapability = useMemo(
    () => (selectedWidgetUsesV2 ? getWidgetStyleCapability(selectedWidgetType, selectedTarget.styleId) : null),
    [selectedTarget.styleId, selectedWidgetType, selectedWidgetUsesV2]
  );
  const selectedElements = useMemo(
    () => (selectedWidgetUsesV2
      ? getWidgetStyleElements(selectedWidgetType, selectedTarget.styleId)
      : getWidgetElementSchema(selectedWidgetType)),
    [selectedTarget.styleId, selectedWidgetType, selectedWidgetUsesV2]
  );
  const selectedElement = useMemo(
    () => selectedElements.find(element => element.id === selectedElementId) || selectedElements[0] || null,
    [selectedElements, selectedElementId]
  );
  const selectedStyleCapabilities = selectedStyleCapability?.capabilities || FALLBACK_QUICK_STYLE_CAPABILITIES;
  const selectedQuickControls = useMemo(() => {
    if (selectedWidgetUsesV2) {
      return new Set(getWidgetStyleQuickControls(
        selectedWidgetType,
        selectedTarget.styleId,
        selectedElement?.id || null
      ));
    }
    const controls = [];
    if (supportsAny(selectedStyleCapabilities, ['colours', 'containers', 'transparentBackground'])) controls.push('material');
    if (supportsAny(selectedStyleCapabilities, ['colours', 'multipleColours', 'positiveNegativeColours', 'progressBar'])) controls.push('primaryColor', 'accentColor');
    if (selectedStyleCapabilities.fonts) controls.push('fontFamily');
    if (selectedStyleCapabilities.fontSizes) controls.push('textSize');
    if (selectedStyleCapabilities.fontWeights) controls.push('boldText');
    if (selectedStyleCapabilities.images) controls.push('imageVisibility');
    if (selectedStyleCapabilities.imageSize) controls.push('imageSize');
    if (selectedStyleCapabilities.imageShape) controls.push('imageShape');
    if (selectedStyleCapabilities.imageFit) controls.push('imageFit');
    if (supportsAny(selectedStyleCapabilities, ['containerShapes', 'borderRadius'])) controls.push('shape');
    if (selectedStyleCapabilities.layoutDensity) controls.push('density', 'scale');
    if (selectedStyleCapabilities.shadows) controls.push('shadowStrength');
    if (supportsAny(selectedStyleCapabilities, ['glow', 'glowIntensity'])) controls.push('glowStrength');
    if (selectedStyleCapabilities.carouselAutoplay) controls.push('carouselAutoplay');
    if (selectedStyleCapabilities.carouselSpeed) controls.push('carouselSpeed');
    if (selectedStyleCapabilities.carouselDirection) controls.push('carouselDirection');
    if (selectedStyleCapabilities.animations) controls.push('animationEnabled');
    if (selectedStyleCapabilities.animationSpeed) controls.push('animationSpeed');
    if (selectedStyleCapabilities.animationIntensity) controls.push('animationIntensity');
    return new Set(controls);
  }, [selectedElement?.id, selectedStyleCapabilities, selectedTarget.styleId, selectedWidgetType, selectedWidgetUsesV2]);
  const hasQuickControl = useCallback((control) => selectedQuickControls.has(control), [selectedQuickControls]);
  const hasAnyQuickControl = useCallback((controls = []) => controls.some(control => selectedQuickControls.has(control)), [selectedQuickControls]);
  const simpleSections = useMemo(() => {
    const sections = [];
    sections.push('widgetStyle');
    if (selectedElements.length > 1) sections.push('editing');
    if (selectedWidgetType === 'background' && selectedElement?.id) sections.push('backgroundControls');
    if (selectedQuickControls.has('material')) sections.push('material');
    if (hasAnyQuickControl(['primaryColor', 'accentColor'])) sections.push('colours');
    if (hasAnyQuickControl([
      'fontFamily',
      'textSize',
      'boldText',
      'imageVisibility',
      'imageSize',
      'imageShape',
      'imageFit',
      'musicDisplayStyle',
    ])) sections.push('textImages');
    if (hasAnyQuickControl([
      'shape',
      'density',
      'scale',
      'shadowStrength',
      'glowStrength',
      'barHeight',
      'maxWidth',
    ])) sections.push('shapeEffects');
    if (hasAnyQuickControl([
      'carouselAutoplay',
      'carouselSpeed',
      'carouselDirection',
      'animationEnabled',
      'animationSpeed',
      'animationIntensity',
    ])) sections.push('motion');
    sections.push('actions');
    return sections;
  }, [hasAnyQuickControl, selectedElement?.id, selectedElements.length, selectedQuickControls, selectedWidgetType]);
  const simpleSectionTabs = useMemo(() => {
    const labels = {
      widgetStyle: 'Style',
      editing: 'Part',
      backgroundControls: 'Controls',
      material: 'Surface',
      colours: 'Colour',
      textImages: 'Type',
      shapeEffects: 'Shape',
      motion: 'Motion',
    };
    return simpleSections
      .filter(id => id !== 'actions')
      .map(id => ({ id, label: labels[id] || id }));
  }, [simpleSections]);
  const previewStateOptions = WIDGET_PREVIEW_STATES[selectedWidgetType] || [];
  const selectedPreviewState = previewStateByWidget[selectedWidget?.id] || previewStateOptions[0]?.id || '';
  const selectedLayerKey = layerKey(selectedWidget?.id, selectedElement?.id);
  const selectedLayerLocked = !!lockedLayers[selectedLayerKey];
  const dirty = safeJson(draft) !== lastPersistedDraftRef.current;
  const hasUnpublishedChanges = safeJson(draft) !== lastPublishedRef.current;
  const warnings = useMemo(() => getAppearanceWarnings(draft), [draft]);
  const performance = useMemo(() => getPerformanceTone(draft), [draft]);
  const groupedLayers = useMemo(() => groupLayers(selectedElements), [selectedElements]);
  const advancedOverrideCount = useMemo(() => {
    if (!selectedTargetRoot) return 0;
    return countObjectLeaves(getByPath(draft, `${selectedTargetRoot}.elements`))
      + countObjectLeaves(getByPath(draft, `${selectedTargetRoot}.subElements`))
      + countObjectLeaves(getByPath(draft, `${selectedTargetRoot}.appearanceV2.elementOverrides`));
  }, [draft, selectedTargetRoot]);

  const filteredWidgets = useMemo(() => {
    const term = widgetSearch.trim().toLowerCase();
    return widgets.filter(widget => {
      const name = getWidgetDisplayName(widget).toLowerCase();
      const type = String(widget.widget_type || '').toLowerCase();
      return !term || name.includes(term) || type.includes(term);
    });
  }, [widgets, widgetSearch]);

  useEffect(() => {
    const widgetIds = new Set(widgets.map(widget => widget.id));
    setPreviewPositions(prev => {
      const next = Object.fromEntries(Object.entries(prev).filter(([id]) => widgetIds.has(id)));
      return Object.keys(next).length === Object.keys(prev).length ? prev : next;
    });
  }, [widgets]);

  const styleSelections = useMemo(() => {
    if (!selectedWidget?.id || !selectedTarget.styleId) return {};
    return { [selectedWidget.id]: selectedTarget.styleId };
  }, [selectedWidget?.id, selectedTarget.styleId]);

  const selectedHiddenElementIds = useMemo(() => (
    Object.entries(hiddenLayers)
      .filter(([key, value]) => value && key.startsWith(`${selectedWidget?.id || ''}:`))
      .map(([key]) => key.split(':').slice(1).join(':'))
  ), [hiddenLayers, selectedWidget?.id]);

  useEffect(() => {
    trackEvent(ANALYTICS_EVENTS.APPEARANCE_CENTER_OPENED || 'appearance_center_opened', {
      route: '/overlay-center/appearance',
      editor_schema_version: EDITOR_SCHEMA_VERSION,
    });
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem(MODE_STORAGE_KEY, mode);
  }, [mode]);

  useEffect(() => {
    if (mode === 'simple') {
      setSidebarTab('widgets');
      setPreviewMode(prev => (prev === 'full-overlay' ? prev : 'fit-widget'));
      setShowBefore(false);
    }
  }, [mode]);

  useEffect(() => {
    if (lastRevisionRef.current === serverState.revision) return;
    lastRevisionRef.current = serverState.revision;
    lastPublishedRef.current = safeJson(serverState.published || {});
    if (dirty || saveStatus === 'saving') return;
    setDraft(serverState.draft);
    lastPersistedDraftRef.current = safeJson(serverState.draft);
  }, [serverState, dirty, saveStatus]);

  useEffect(() => {
    if (!selectedWidget && firstWidget) {
      setSelectedTarget(createTarget(firstWidget, draft));
      setSelectedElementId(getFirstElement(firstWidget.widget_type)?.id || '');
    }
  }, [selectedWidget, firstWidget, draft]);

  useEffect(() => {
    if (!selectedElement && selectedElements[0]) setSelectedElementId(selectedElements[0].id);
  }, [selectedElement, selectedElements]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return undefined;
    const channel = new BroadcastChannel('streamers-center-preview');
    channel.postMessage({
      type: 'appearance-preview-draft',
      token: instance?.overlay_token,
      appearance: draft,
      styleSelections,
      sourceClientId: clientIdRef.current,
    });
    return () => channel.close();
  }, [draft, instance?.overlay_token, styleSelections]);

  const persistDraft = useCallback(async (nextDraft = draft, reason = 'manual') => {
    if (!updateState) return;
    const normalized = normalizeAppearance(nextDraft, { theme });
    const serialized = safeJson(normalized);
    if (serialized === lastPersistedDraftRef.current && reason !== 'manual') return;
    setSaveStatus('saving');
    setStatusMessage('Saving draft...');
    try {
      const nextRoot = {
        ...serverState,
        draft: normalized,
        schemaVersion: APPEARANCE_SCHEMA_VERSION,
        revision: serverState.revision + 1,
        updatedAt: new Date().toISOString(),
        sourceClientId: clientIdRef.current,
      };
      await updateState({ overlayAppearance: nextRoot });
      lastPersistedDraftRef.current = serialized;
      setSaveStatus('saved');
      setStatusMessage(reason === 'manual' ? 'Draft saved.' : 'Draft auto-saved.');
      setToast(reason === 'manual' ? 'Draft saved' : '');
      trackEvent(ANALYTICS_EVENTS.APPEARANCE_DRAFT_SAVED || 'appearance_draft_saved', { reason });
    } catch (err) {
      console.error('[AppearanceCenter] save draft failed', err);
      setSaveStatus('failed');
      setStatusMessage('Draft could not be saved.');
      setToast('Draft save failed');
      trackEvent(ANALYTICS_EVENTS.APPEARANCE_SAVE_FAILED || 'appearance_save_failed', { reason });
    }
  }, [draft, serverState, theme, updateState]);

  useEffect(() => {
    const serialized = safeJson(draft);
    if (serialized === lastPersistedDraftRef.current) return undefined;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => persistDraft(draft, 'debounced-draft'), 1100);
    return () => clearTimeout(saveTimerRef.current);
  }, [draft, persistDraft]);

  const commitDraft = useCallback((recipe, summary = 'Style changed') => {
    setShowBefore(false);
    setDraft(prev => {
      const next = normalizeAppearance(typeof recipe === 'function' ? recipe(prev) : recipe, { theme });
      if (safeJson(prev) === safeJson(next)) return prev;
      setUndoStack(stack => [...stack.slice(-49), { targetKey: targetKey(selectedTarget), draft: prev, summary }]);
      setRedoStack([]);
      setSaveStatus('dirty');
      setPublishStatus('unpublished');
      setStatusMessage('Preview updated instantly. Draft will be saved shortly.');
      trackEvent(ANALYTICS_EVENTS.APPEARANCE_SETTING_CHANGED || 'appearance_setting_changed', {
        summary,
        widget_type: selectedWidgetType || null,
        element_id: selectedElementId || null,
      });
      return next;
    });
  }, [selectedElementId, selectedTarget, selectedWidgetType, theme]);

  const rememberColor = useCallback((color) => {
    const normalized = normalizeHexColor(color, '');
    if (!normalized) return;
    setRecentColors(prev => {
      const next = [normalized, ...prev.filter(item => item !== normalized)].slice(0, 8);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(RECENT_COLORS_STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const applySimpleSettings = useCallback((patch, summary = 'Quick style changed') => {
    const nextSettings = normalizeSimpleSettings({ ...currentSimpleSettings, ...(patch || {}) });
    const restoreBonusHuntOriginal = selectedTargetRoot
      && selectedWidgetType === 'bonus_hunt'
      && nextSettings.material === 'original';
    if (restoreBonusHuntOriginal) {
      commitDraft(prev => omitPath(prev, selectedTargetRoot), summary || 'Restore original Bonus Hunt design');
      return;
    }
    const generated = generateSimpleAppearance(nextSettings);
    if (patch?.primaryColor) rememberColor(nextSettings.primaryColor);
    if (patch?.accentColor) rememberColor(nextSettings.accentColor);
    commitDraft(prev => {
      if (!selectedTargetRoot) {
        return deepMerge(prev, generated);
      }
      const appearancePath = `${selectedTargetRoot}.appearance`;
      const currentAppearance = getByPath(prev, appearancePath) || {};
      let next = setByPath(prev, appearancePath, deepMerge(currentAppearance, generated));
      if (isWidgetAppearanceV2Enabled(selectedWidgetType)) {
        const currentV2 = getByPath(prev, `${selectedTargetRoot}.appearanceV2`) || {};
        next = setByPath(next, `${selectedTargetRoot}.appearanceV2`, buildAppearanceV2ForStorage(selectedWidgetType, nextSettings, currentV2));
      }
      return next;
    }, summary);
  }, [commitDraft, currentSimpleSettings, rememberColor, selectedTargetRoot, selectedWidgetType]);

  const applyQuickSettings = useCallback((patch, summary = 'Quick style changed') => {
    if (
      selectedWidgetUsesV2
      && selectedTargetRoot
      && selectedElement?.id
      && canScopeQuickPatchToElement(selectedElement, patch)
    ) {
      const nextSettings = normalizeSimpleSettings({ ...currentSimpleSettings, ...(patch || {}) });
      if (patch?.primaryColor) rememberColor(nextSettings.primaryColor);
      if (patch?.accentColor) rememberColor(nextSettings.accentColor);
      commitDraft(prev => {
        const currentV2 = getByPath(prev, `${selectedTargetRoot}.appearanceV2`) || {};
        const tokenSettings = nextSettings.material === 'original'
          ? { ...nextSettings, material: 'matte' }
          : nextSettings;
        const resolvedV2 = buildAppearanceV2ForStorage(selectedWidgetType, tokenSettings, currentV2);
        const override = buildElementQuickOverrideFromPatch(selectedElement, patch, resolvedV2.generatedTokens || {});
        if (!Object.keys(override).length) return prev;
        const overridePath = `${selectedTargetRoot}.appearanceV2.elementOverrides.${selectedElement.id}`;
        const currentOverride = getByPath(prev, overridePath) || {};
        return setByPath(prev, overridePath, deepMerge(currentOverride, override));
      }, summary);
      return;
    }
    applySimpleSettings(patch, summary);
  }, [
    applySimpleSettings,
    commitDraft,
    currentSimpleSettings,
    rememberColor,
    selectedElement,
    selectedTargetRoot,
    selectedWidgetType,
    selectedWidgetUsesV2,
  ]);

  const restoreRecommendedStyle = useCallback(() => {
    if (selectedTargetRoot && selectedWidgetType === 'bonus_hunt') {
      commitDraft(prev => omitPath(prev, selectedTargetRoot), 'Restore original Bonus Hunt design');
      setToast('Original Bonus Hunt design restored');
      return;
    }
    const generated = generateSimpleAppearance(DEFAULT_SIMPLE_SETTINGS);
    commitDraft(prev => {
      if (!selectedTargetRoot) return deepMerge(prev, generated);
      let next = setByPath(prev, `${selectedTargetRoot}.appearance`, generated);
      if (isWidgetAppearanceV2Enabled(selectedWidgetType)) {
        next = setByPath(next, `${selectedTargetRoot}.appearanceV2`, buildAppearanceV2ForStorage(selectedWidgetType, DEFAULT_SIMPLE_SETTINGS, {}));
      }
      next = omitPath(next, `${selectedTargetRoot}.elements`);
      next = omitPath(next, `${selectedTargetRoot}.subElements`);
      return next;
    }, 'Restore recommended style');
    setToast('Recommended style restored');
  }, [commitDraft, selectedTargetRoot, selectedWidgetType]);

  const handleModeChange = useCallback((nextMode) => {
    if (nextMode === mode) return;
    if (nextMode === 'simple' && advancedOverrideCount > 0) {
      const keep = window.confirm('Advanced adjustments are active for this widget. Keep them while using Simple Mode? Choose Cancel to stay in Advanced Mode.');
      if (!keep) return;
      setToast('Advanced adjustments kept');
    }
    setMode(nextMode);
    setSidebarTab(nextMode === 'advanced' ? 'layers' : 'widgets');
    setPreviewMode(EDITOR_MODE_CAPABILITIES[nextMode]?.previewMode || 'fit-widget');
    setShowBefore(false);
  }, [advancedOverrideCount, mode]);

  const selectWidget = useCallback((widget, nextElementId = '') => {
    if (!widget) return;
    if (dirty) {
      clearTimeout(saveTimerRef.current);
      persistDraft(draft, 'widget-switch');
    }
    const target = createTarget(widget, draft);
    const firstElement = getFirstElementForStyle(widget.widget_type, target.styleId);
    setSelectedTarget(target);
    setSelectedElementId(nextElementId || firstElement?.id || '');
    setSelectedStateId('default');
    setSidebarTab(mode === 'advanced' ? 'layers' : 'widgets');
    trackEvent(ANALYTICS_EVENTS.WIDGET_APPEARANCE_TARGET_SELECTED || 'widget_appearance_target_selected', {
      scope: target.scope,
      widget_type: target.widgetType,
    });
  }, [dirty, draft, mode, persistDraft]);

  const selectStyle = useCallback((styleId) => {
    if (!selectedWidget?.id || !styleId) return;
    const nextTarget = {
      scope: 'widget_instance',
      widgetId: selectedWidget.id,
      widgetType: selectedWidget.widget_type,
      styleId,
    };
    setSelectedTarget(nextTarget);
    const firstElement = getFirstElementForStyle(selectedWidget.widget_type, styleId);
    setSelectedElementId(firstElement?.id || '');
    setSelectedStateId('default');
    const optionLabel = quickStyleOptions.find(option => option.id === styleId)?.label || styleId;
    commitDraft(prev => setByPath(prev, `widgets.${selectedWidget.id}.activeStyleId`, styleId), `Select ${optionLabel} style`);
  }, [commitDraft, quickStyleOptions, selectedWidget]);

  const handlePreviewWidgetSelect = useCallback((widget) => {
    selectWidget(widget);
  }, [selectWidget]);

  const handlePreviewElementSelect = useCallback(({ widget, elementId, stateId }) => {
    selectWidget(widget, elementId);
    setSelectedStateId(stateId || 'default');
  }, [selectWidget]);

  const handlePreviewResize = useCallback((widget, size) => {
    if (!widget?.id) return;
    const resizeTarget = createTarget(widget, draft);
    const root = getTargetOverrideRoot(resizeTarget);
    if (!root) return;
    setSelectedTarget(resizeTarget);
    commitDraft(prev => {
      let next = setByPath(prev, `${root}.appearance.container.width`, size.width);
      next = setByPath(next, `${root}.appearance.container.height`, size.height);
      return next;
    }, `Resize ${getWidgetDisplayName(widget)}`);
  }, [commitDraft, draft]);

  const handlePreviewMove = useCallback((widget, position, meta = {}) => {
    if (!widget?.id || widget.widget_type === 'background') return;
    const nextPosition = {
      x: Math.round(Number(position?.x) || 0),
      y: Math.round(Number(position?.y) || 0),
    };
    setPreviewPositions(prev => ({ ...prev, [widget.id]: nextPosition }));

    if (!meta.commit || !saveWidget) return;
    const currentWidget = widgets.find(item => item.id === widget.id) || widget;
    saveWidget({
      ...currentWidget,
      position_x: nextPosition.x,
      position_y: nextPosition.y,
    })
      .then(() => {
        setToast(`${getWidgetDisplayName(currentWidget)} position saved`);
        setPublishStatus('unpublished');
        setPreviewPositions(prev => {
          const next = { ...prev };
          delete next[widget.id];
          return next;
        });
      })
      .catch(err => {
        console.error('[AppearanceCenter] widget position save failed', err);
        setToast('Widget position could not be saved');
      });
  }, [saveWidget, widgets]);

  const toggleWidgetVisibility = useCallback((widget, event) => {
    event?.stopPropagation();
    if (!widget?.id || !saveWidget) return;
    const nextVisible = !widget.is_visible;
    saveWidget({ ...widget, is_visible: nextVisible })
      .then(() => setToast(`${getWidgetDisplayName(widget)} ${nextVisible ? 'enabled' : 'disabled'}`))
      .catch(err => {
        console.error('[AppearanceCenter] widget visibility update failed', err);
        setToast('Widget visibility could not be changed');
      });
  }, [saveWidget]);

  const undo = useCallback(() => {
    setUndoStack(stack => {
      if (!stack.length) return stack;
      const entry = stack[stack.length - 1];
      setRedoStack(next => [{ targetKey: targetKey(selectedTarget), draft, summary: 'Redo style change' }, ...next].slice(0, 50));
      setDraft(entry.draft);
      setSaveStatus('dirty');
      setPublishStatus('unpublished');
      setStatusMessage('Undo applied.');
      return stack.slice(0, -1);
    });
  }, [draft, selectedTarget]);

  const redo = useCallback(() => {
    setRedoStack(stack => {
      if (!stack.length) return stack;
      const entry = stack[0];
      setUndoStack(next => [...next.slice(-49), { targetKey: targetKey(selectedTarget), draft, summary: 'Undo redo' }]);
      setDraft(entry.draft);
      setSaveStatus('dirty');
      setPublishStatus('unpublished');
      setStatusMessage('Redo applied.');
      return stack.slice(1);
    });
  }, [draft, selectedTarget]);

  const publish = useCallback(async () => {
    clearTimeout(saveTimerRef.current);
    setSaveStatus('saving');
    setPublishStatus('publishing');
    setStatusMessage('Publishing to OBS...');
    try {
      const normalized = normalizeAppearance(draft, { theme });
      const version = createAppearanceVersion({
        appearance: normalized,
        userId: user?.id,
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
        sourceClientId: clientIdRef.current,
        versions: [version, ...(serverState.versions || [])].slice(0, 30),
      };
      await updateState({ overlayAppearance: nextRoot });
      if (saveTheme) await saveTheme(projectAppearanceToThemePatch(normalized));
      const normalizedJson = safeJson(normalized);
      lastPersistedDraftRef.current = normalizedJson;
      lastPublishedRef.current = normalizedJson;
      setSaveStatus('saved');
      setPublishStatus('published');
      setStatusMessage('Published. OBS browser sources will use this design.');
      setToast('Published to OBS');
      trackEvent(ANALYTICS_EVENTS.APPEARANCE_PUBLISHED || 'appearance_published', {
        widget_type: selectedWidgetType || null,
      });
    } catch (err) {
      console.error('[AppearanceCenter] publish failed', err);
      setSaveStatus('failed');
      setPublishStatus('failed');
      setStatusMessage('Publish failed.');
      setToast('Publish failed');
    }
  }, [draft, saveTheme, selectedWidgetName, selectedWidgetType, serverState, theme, updateState, user?.id]);

  const updateElementControl = useCallback((control, value) => {
    if (!selectedTargetRoot || !selectedElement?.id || selectedLayerLocked) return;
    const normalized = validateEditorValue(control, value);
    const path = selectedWidgetUsesV2
      ? resolveV2ElementOverridePath(selectedTargetRoot, selectedElement.id, control.id, selectedStateId)
      : resolveElementPath(selectedTargetRoot, selectedElement.id, control.id, selectedStateId);
    commitDraft(prev => setByPath(prev, path, normalized), `${selectedElement.id}.${control.id}`);
  }, [commitDraft, selectedElement?.id, selectedLayerLocked, selectedStateId, selectedTargetRoot, selectedWidgetUsesV2]);

  const resetElementControl = useCallback((control) => {
    if (!selectedTargetRoot || !selectedElement?.id || selectedLayerLocked) return;
    const v2Path = resolveV2ElementOverridePath(selectedTargetRoot, selectedElement.id, control.id, selectedStateId);
    const modernPath = resolveElementPath(selectedTargetRoot, selectedElement.id, control.id, selectedStateId);
    const legacyPath = resolveLegacyElementPath(selectedTargetRoot, selectedElement.id, control.id, selectedStateId);
    commitDraft(prev => omitPath(omitPath(omitPath(prev, v2Path), modernPath), legacyPath), `Reset ${selectedElement.id}.${control.id}`);
  }, [commitDraft, selectedElement?.id, selectedLayerLocked, selectedStateId, selectedTargetRoot]);

  const updateWidgetControl = useCallback((item, value) => {
    const root = selectedTargetRoot;
    const normalized = validateEditorValue(item.control, value);
    const path = root ? `${root}.appearance.${item.path}` : item.path;
    commitDraft(prev => setByPath(prev, path, normalized), item.label);
  }, [commitDraft, selectedTargetRoot]);

  const resetWidgetControl = useCallback((item) => {
    const root = selectedTargetRoot;
    const path = root ? `${root}.appearance.${item.path}` : item.path;
    commitDraft(prev => omitPath(prev, path), `Reset ${item.label}`);
  }, [commitDraft, selectedTargetRoot]);

  const applyPreset = useCallback((preset) => {
    const appearance = getPresetAppearance(preset);
    if (!appearance) return;
    if (preset.isSimpleQuickStyle && selectedTargetRoot) {
      commitDraft(prev => {
        const appearancePath = `${selectedTargetRoot}.appearance`;
        const currentAppearance = getByPath(prev, appearancePath) || {};
        return setByPath(prev, appearancePath, deepMerge(currentAppearance, appearance));
      }, `Apply preset ${preset.name}`);
    } else {
      commitDraft(prev => normalizeAppearance(deepMerge(prev, appearance), { theme }), `Apply preset ${preset.name}`);
    }
    setToast(`${preset.name} applied`);
    trackEvent(ANALYTICS_EVENTS.APPEARANCE_PRESET_APPLIED || 'appearance_preset_applied', { preset_id: preset.id });
  }, [commitDraft, selectedTargetRoot, theme]);

  const saveCurrentPreset = useCallback(async () => {
    const name = window.prompt('Preset name', `${selectedWidgetName} style`);
    if (!name?.trim() || !updateState) return;
    const presetAppearance = mode === 'simple' && selectedTargetRoot
      ? (getByPath(draft, `${selectedTargetRoot}.appearance`) || generateSimpleAppearance(currentSimpleSettings))
      : draft;
    const preset = createAppearancePreset({
      name,
      appearance: presetAppearance,
      scope: selectedTarget.scope,
      widgetTypes: selectedWidgetType ? [selectedWidgetType] : [],
    });
    if (mode === 'simple') {
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
      sourceClientId: clientIdRef.current,
    };
    await updateState({ overlayAppearance: nextRoot });
    setToast('Preset saved');
  }, [currentSimpleSettings, draft, mode, selectedTarget.scope, selectedTargetRoot, selectedWidgetName, selectedWidgetType, serverState, updateState]);

  const renamePreset = useCallback(async (preset) => {
    const name = window.prompt('Rename preset', preset.name);
    if (!name?.trim() || !updateState) return;
    const nextRoot = {
      ...serverState,
      presets: (serverState.presets || []).map(item => item.id === preset.id ? { ...item, name: name.trim(), updatedAt: new Date().toISOString() } : item),
      revision: serverState.revision + 1,
      updatedAt: new Date().toISOString(),
    };
    await updateState({ overlayAppearance: nextRoot });
    setToast('Preset renamed');
  }, [serverState, updateState]);

  const deletePreset = useCallback(async (preset) => {
    if (!window.confirm(`Delete "${preset.name}" preset?`) || !updateState) return;
    const nextRoot = {
      ...serverState,
      presets: (serverState.presets || []).filter(item => item.id !== preset.id),
      revision: serverState.revision + 1,
      updatedAt: new Date().toISOString(),
    };
    await updateState({ overlayAppearance: nextRoot });
    setToast('Preset deleted');
  }, [serverState, updateState]);

  const duplicatePreset = useCallback(async (preset) => {
    if (!updateState) return;
    const duplicate = {
      ...preset,
      id: `preset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
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
    setToast('Preset duplicated');
  }, [serverState, updateState]);

  const resetElement = useCallback(() => {
    if (!selectedTargetRoot || !selectedElement?.id || selectedLayerLocked) return;
    const modernPath = selectedStateId && selectedStateId !== 'default'
      ? `${selectedTargetRoot}.elements.${selectedElement.id}.states.${selectedStateId}`
      : `${selectedTargetRoot}.elements.${selectedElement.id}`;
    const legacyPath = selectedStateId && selectedStateId !== 'default'
      ? `${selectedTargetRoot}.subElements.${selectedElement.id}.states.${selectedStateId}`
      : `${selectedTargetRoot}.subElements.${selectedElement.id}`;
    const v2Path = selectedStateId && selectedStateId !== 'default'
      ? `${selectedTargetRoot}.appearanceV2.elementOverrides.${selectedElement.id}.states.${selectedStateId}`
      : `${selectedTargetRoot}.appearanceV2.elementOverrides.${selectedElement.id}`;
    commitDraft(prev => omitPath(omitPath(omitPath(prev, modernPath), legacyPath), v2Path), `Reset ${selectedElement.id}`);
  }, [commitDraft, selectedElement?.id, selectedLayerLocked, selectedStateId, selectedTargetRoot]);

  const resetWidget = useCallback(() => {
    if (!selectedTargetRoot) return;
    if (!window.confirm(`Reset only "${selectedWidgetName}" custom style?`)) return;
    commitDraft(prev => omitPath(prev, selectedTargetRoot), `Reset ${selectedWidgetName}`);
  }, [commitDraft, selectedTargetRoot, selectedWidgetName]);

  const resetAll = useCallback(() => {
    if (!window.confirm('Reset the entire appearance draft for all widgets? This does not publish until you press Publish to OBS.')) return;
    commitDraft(normalizeAppearance({}, { theme }), 'Reset all appearance');
  }, [commitDraft, theme]);

  const discardUnsaved = useCallback(() => {
    clearTimeout(saveTimerRef.current);
    setDraft(serverState.draft);
    lastPersistedDraftRef.current = safeJson(serverState.draft);
    setSaveStatus('saved');
    setPublishStatus(safeJson(serverState.draft) === safeJson(serverState.published || {}) ? 'published' : 'unpublished');
    setStatusMessage('Unsaved changes discarded.');
  }, [serverState.draft, serverState.published]);

  const setTourHidden = useCallback((hidden) => {
    setTourVisible(!hidden);
    if (typeof window !== 'undefined') window.localStorage.setItem(TOUR_STORAGE_KEY, hidden ? '1' : '0');
  }, []);

  const updateZoom = useCallback((direction) => {
    if (direction === 'fit') {
      setZoom('fit');
      return;
    }
    const current = zoom === 'fit' ? 100 : Number(zoom) || 100;
    const index = ZOOM_STEPS.reduce((best, step, i) => Math.abs(step - current) < Math.abs(ZOOM_STEPS[best] - current) ? i : best, 0);
    const nextIndex = direction === 'in'
      ? Math.min(ZOOM_STEPS.length - 1, index + 1)
      : Math.max(0, index - 1);
    setZoom(ZOOM_STEPS[nextIndex]);
  }, [zoom]);

  const toggleSimpleSection = useCallback((id) => {
    setOpenSimpleSections(prev => {
      if (prev.includes(id)) return prev.filter(item => item !== id);
      return [id, ...prev].slice(0, 2);
    });
  }, []);

  const toggleAdvancedSection = useCallback((id) => {
    setOpenAdvancedSections(prev => {
      if (prev.includes(id)) return prev.filter(item => item !== id);
      return [id, ...prev].slice(0, 2);
    });
  }, []);

  const enterCanvasFullscreen = useCallback(async () => {
    const target = canvasPanelRef.current;
    if (!target?.requestFullscreen) {
      setToast('Fullscreen is not available in this browser');
      return;
    }
    try {
      await target.requestFullscreen();
    } catch (err) {
      console.error('[AppearanceCenter] fullscreen failed', err);
      setToast('Fullscreen could not be opened');
    }
  }, []);

  useEffect(() => {
    function onKeyDown(event) {
      if (isTypingTarget(event.target)) return;
      const cmd = event.ctrlKey || event.metaKey;
      if (cmd && event.key.toLowerCase() === 'z' && event.shiftKey) {
        event.preventDefault();
        redo();
      } else if (cmd && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        undo();
      } else if (cmd && event.key.toLowerCase() === 's') {
        event.preventDefault();
        persistDraft(draft, 'keyboard');
      } else if (event.key === 'Escape') {
        setSelectedElementId('');
      } else if (mode === 'advanced' && event.key === 'Delete' && selectedElement?.id && !selectedLayerLocked) {
        event.preventDefault();
        if (window.confirm(`Reset ${selectedElement.label}?`)) resetElement();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [draft, mode, persistDraft, redo, resetElement, selectedElement, selectedLayerLocked, undo]);

  const renderQuickControl = (item) => {
    const root = selectedTargetRoot;
    const path = root ? `${root}.appearance.${item.path}` : item.path;
    const value = getByPath(draft, path);
    const control = normalizeControl(item.control, item.label);
    return (
      <PropertyControl
        key={item.id}
        control={control}
        value={value}
        onChange={(next) => updateWidgetControl(item, next)}
        onReset={() => resetWidgetControl(item)}
        inheritedLabel={value === undefined ? 'Inherited' : 'Custom'}
      />
    );
  };

  const renderElementControl = (control) => {
    if (!selectedTargetRoot || !selectedElement?.id) return null;
    const v2Path = resolveV2ElementOverridePath(selectedTargetRoot, selectedElement.id, control.id, selectedStateId);
    const path = resolveElementPath(selectedTargetRoot, selectedElement.id, control.id, selectedStateId);
    const legacyPath = resolveLegacyElementPath(selectedTargetRoot, selectedElement.id, control.id, selectedStateId);
    const v2Value = getByPath(draft, v2Path);
    const value = getByPath(draft, path);
    const legacyValue = getByPath(draft, legacyPath);
    const resolvedValue = v2Value !== undefined ? v2Value : value !== undefined ? value : legacyValue;
    return (
      <PropertyControl
        key={control.id}
        control={control}
        value={resolvedValue}
        onChange={(next) => updateElementControl(control, next)}
        onReset={() => resetElementControl(control)}
        inheritedLabel={resolvedValue === undefined ? 'Inherited' : 'Custom'}
        disabled={selectedLayerLocked}
      />
    );
  };

  const renderWidgetCard = (widget, simple = false) => {
    const active = selectedWidget?.id === widget.id;
    const edited = !!getByPath(draft, `widgets.${widget.id}`);
    const categoryLabel = WIDGET_CATEGORY_FILTERS.find(item => item.id === getWidgetCategory(widget))?.label || 'Other';
    return (
      <div
        key={widget.id}
        className={`ve-widget-card${active ? ' is-active' : ''}${simple ? ' ve-widget-card--simple' : ''}`}
      >
        <button type="button" className="ve-widget-card__select" onClick={() => selectWidget(widget)}>
          <span className="ve-widget-card__thumb">
            <WidgetIcon icon={getWidgetIcon(widget)} />
          </span>
          <span className="ve-widget-card__body">
            <strong>{getWidgetDisplayName(widget)}</strong>
            <small>Category: {categoryLabel}</small>
          </span>
        </button>
        <button
          type="button"
          className={`ve-widget-toggle${widget.is_visible ? ' is-on' : ''}`}
          onClick={(event) => toggleWidgetVisibility(widget, event)}
          title={widget.is_visible ? 'Disable widget on overlay' : 'Enable widget on overlay'}
          aria-pressed={widget.is_visible}
        >
          <span />
          <strong>{widget.is_visible ? 'Enabled' : 'Disabled'}</strong>
        </button>
        {edited && <span className="ve-edited-dot" title="Style edited" />}
      </div>
    );
  };

  const renderWidgetSelector = (simple = false) => (
    <div className={`ve-sidebar-scroll${simple ? ' ve-sidebar-scroll--simple' : ''}`}>
      {simple && (
        <div className="ve-simple-sidebar-head">
          <strong>Widgets</strong>
          <span>Choose which overlay tool you want to style.</span>
        </div>
      )}
      <div className="ve-search">
        <Search size={15} />
        <input
          value={widgetSearch}
          onChange={event => setWidgetSearch(event.target.value)}
          placeholder="Search widgets"
          aria-label="Search widgets"
        />
      </div>
      <div className="ve-widget-list">
        {filteredWidgets.map(widget => renderWidgetCard(widget, simple))}
        {!filteredWidgets.length && <EmptyState title="No widgets found">Try another search.</EmptyState>}
      </div>
    </div>
  );

  const renderLayersPanel = () => (
    <div className="ve-sidebar-scroll ve-layers">
      <div className="ve-layer-intro">
        <MousePointer2 size={17} />
        <span>Click the preview or choose a layer. The right panel will only show controls for that part.</span>
      </div>
      {visibleLayerRows.map(group => (
        <section key={group.id} className="ve-layer-group">
          <h3>{group.label}</h3>
          {group.items.map(element => {
            const key = layerKey(selectedWidget?.id, element.id);
            const active = element.id === selectedElement?.id;
            const hidden = !!hiddenLayers[key];
            const locked = !!lockedLayers[key];
            return (
              <div key={element.id} className={`ve-layer-row${active ? ' is-active' : ''}`}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedElementId(element.id);
                    setSelectedStateId('default');
                  }}
                >
                  <span>{element.label}</span>
                  <small>{inferElementKind(element)}</small>
                </button>
                <LayerToggleButton
                  active={!hidden}
                  type="visible"
                  label={hidden ? 'Show layer in preview' : 'Hide layer in preview'}
                  onClick={() => setHiddenLayers(prev => ({ ...prev, [key]: !hidden }))}
                />
                <LayerToggleButton
                  active={locked}
                  type="locked"
                  label={locked ? 'Unlock layer editing' : 'Lock layer editing'}
                  onClick={() => setLockedLayers(prev => ({ ...prev, [key]: !locked }))}
                />
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );

  const controlGroups = useMemo(() => {
    if (!selectedElement) return [];
    return getElementControlGroups(selectedElement, mode).filter(group => group.controls.some(control => elementSupportsControl(selectedElement, control.id)));
  }, [mode, selectedElement]);

  useEffect(() => {
    if (mode !== 'advanced') return;
    const preferredSection = selectedElement ? `control-${controlGroups[0]?.id || ''}` : 'stylePreset';
    if (!preferredSection || preferredSection === 'control-') return;
    setOpenAdvancedSections(prev => {
      if (prev.includes(preferredSection)) return prev.length <= 2 ? prev : prev.slice(0, 2);
      return [preferredSection, ...prev].slice(0, 2);
    });
  }, [controlGroups, mode, selectedElement?.id]);

  const visibleLayerRows = Object.values(groupedLayers);
  const selectedWidgetOverrides = selectedTargetRoot ? countObjectLeaves(getByPath(draft, selectedTargetRoot)) : 0;
  const editingWholeWidget = !selectedElement || ['container', 'root'].includes(selectedElement.id);
  const advancedSectionTabs = [
    ...(editingWholeWidget
      ? [
          { id: 'stylePreset', label: 'Style' },
          ...(!selectedWidgetUsesV2 ? [{ id: 'surfaceBackground', label: 'Surface' }] : []),
        ]
      : []),
    ...controlGroups.map(group => ({ id: `control-${group.id}`, label: mapControlGroupTitle(group.label) })),
    ...(mode === 'advanced' && editingWholeWidget ? [{ id: 'spacingSizing', label: 'Size' }] : []),
    { id: 'advanced', label: 'Checks' },
  ];
  const selectedStyleLabel = quickStyleOptions.find(option => option.id === selectedTarget.styleId)?.label
    || registeredStyleOptions.find(option => option.id === selectedTarget.styleId)?.label
    || selectedTarget.styleId
    || 'Default';
  return (
    <div className="appearance-center visual-editor" data-mode={mode}>
      <div className="ve-topbar">
        <div className="ve-topbar__left">
          <a className="ve-back-link" href="/overlay-center">
            <ArrowLeft size={16} />
            Overlay Center
          </a>
          <div className="ve-current-widget">
            <span>{selectedWidgetName}</span>
            <small>{mode === 'simple' ? 'Entire widget' : selectedElement ? getFriendlyElementLabel(selectedElement.id, selectedElement.label) : 'Choose an element'}</small>
          </div>
          <span className="ve-status-stack" aria-label="Draft and OBS publish status">
            <span className={`ve-save-status ve-save-status--${saveStatus}${dirty ? ' ve-save-status--dirty' : ''}`}>
              {saveStatus === 'saved' && !dirty ? <CheckCircle2 size={14} /> : <span className="ve-status-dot" />}
              {formatDraftStatus(saveStatus, dirty)}
            </span>
            <span className={`ve-live-status ve-live-status--${publishStatusClass(publishStatus, hasUnpublishedChanges || dirty)}`}>
              {formatPublishStatus(publishStatus, hasUnpublishedChanges || dirty)}
            </span>
          </span>
        </div>
        <div className="ve-topbar__tools" role="toolbar" aria-label="Appearance editor tools">
          <ToolbarGroup label="Editing">
            <ToolbarButton icon={Undo2} disabled={!undoStack.length} onClick={undo} title="Undo (Ctrl+Z)" />
            <ToolbarButton icon={Redo2} disabled={!redoStack.length} onClick={redo} title="Redo (Ctrl+Shift+Z)" />
            <ToolbarButton icon={MonitorPlay} active={previewMode === 'fit-widget'} onClick={() => setPreviewMode('fit-widget')}>Focused</ToolbarButton>
            <ToolbarButton icon={Monitor} active={previewMode === 'full-overlay'} onClick={() => setPreviewMode('full-overlay')}>Full Overlay</ToolbarButton>
          </ToolbarGroup>

          <ToolbarGroup label="Preview">
            <span className="ve-toolbar-backgrounds" role="group" aria-label="Canvas background">
              {PREVIEW_BACKGROUNDS.map(item => (
                <button key={item.id} type="button" className={previewBackground === item.id ? 'is-active' : ''} onClick={() => setPreviewBackground(item.id)}>
                  {item.id === 'green' ? 'Green Screen' : item.label}
                </button>
              ))}
            </span>
            <ToolbarButton active={showBefore} onClick={() => setShowBefore(value => !value)}>Before</ToolbarButton>
            <label className="ve-toolbar-check">
              <input type="checkbox" checked={obsSafe} onChange={event => setObsSafe(event.target.checked)} />
              Safe frame
            </label>
            {!!previewStateOptions.length && selectedWidget?.id && (
              <span className="ve-preview-state-picker" role="group" aria-label="Preview state">
                {previewStateOptions.map(option => (
                  <button
                    key={option.id}
                    type="button"
                    className={selectedPreviewState === option.id ? 'is-active' : ''}
                    onClick={() => setPreviewStateByWidget(prev => ({ ...prev, [selectedWidget.id]: option.id }))}
                  >
                    {option.label}
                  </button>
                ))}
              </span>
            )}
          </ToolbarGroup>

          <ToolbarGroup label="View">
            <ToolbarButton icon={ExternalLink} onClick={onOpenPreview}>Pop-out</ToolbarButton>
            {previewStatus?.open && <ToolbarButton icon={Eye} onClick={onFocusPreview}>Focus</ToolbarButton>}
            <ToolbarButton icon={Maximize2} onClick={enterCanvasFullscreen}>Fullscreen</ToolbarButton>
            <ToolbarButton active={zoom === 'fit'} onClick={() => updateZoom('fit')}>Fit</ToolbarButton>
            <ToolbarButton icon={ZoomOut} onClick={() => updateZoom('out')} title="Zoom out" />
            <span className="ve-zoom-label">{zoom === 'fit' ? 'Fit' : `${zoom}%`}</span>
            <ToolbarButton icon={ZoomIn} onClick={() => updateZoom('in')} title="Zoom in" />
          </ToolbarGroup>

          <ToolbarGroup label="Mode">
            <div className="ve-mode-switch" role="group" aria-label="Editor mode">
              <button type="button" className={mode === 'simple' ? 'is-active' : ''} onClick={() => handleModeChange('simple')}>Simple</button>
              <button type="button" className={mode === 'advanced' ? 'is-active' : ''} onClick={() => handleModeChange('advanced')}>Advanced</button>
            </div>
          </ToolbarGroup>

          <ToolbarGroup label="Actions">
            <ToolbarButton icon={RotateCcw} onClick={resetWidget}>Reset</ToolbarButton>
            <ToolbarButton icon={Save} onClick={() => persistDraft(draft, 'manual')}>Save Draft</ToolbarButton>
            <ToolbarButton icon={ExternalLink} primary onClick={publish} disabled={publishStatus === 'publishing'}>Publish to OBS</ToolbarButton>
          </ToolbarGroup>
        </div>
      </div>

      {statusMessage && (
        <div className="ve-status-line" role="status">
          {statusMessage}
          {dirty && <button type="button" onClick={discardUnsaved}>Discard unsaved changes</button>}
        </div>
      )}

      <div className="ve-workspace">
        <aside className={`ve-left-panel${mode === 'simple' ? ' ve-left-panel--simple' : ''}`}>
          {mode === 'advanced' && (
          <div className="ve-panel-tabs" role="tablist" aria-label="Editor sidebar">
            <button type="button" className={sidebarTab === 'widgets' ? 'is-active' : ''} onClick={() => setSidebarTab('widgets')}>
              <Palette size={16} />
              Widgets
            </button>
            <button type="button" className={sidebarTab === 'layers' ? 'is-active' : ''} onClick={() => setSidebarTab('layers')}>
              <Layers size={16} />
              Layers
            </button>
          </div>
          )}

          {mode === 'simple' ? renderWidgetSelector(true) : sidebarTab === 'widgets' ? (
            <div className="ve-sidebar-scroll">
              <div className="ve-search">
                <Search size={15} />
                <input
                  value={widgetSearch}
                  onChange={event => setWidgetSearch(event.target.value)}
                  placeholder="Search widgets"
                  aria-label="Search widgets"
                />
              </div>
              <div className="ve-widget-list">
                {filteredWidgets.map(widget => renderWidgetCard(widget))}
                {!filteredWidgets.length && <EmptyState title="No widgets found">Try another search.</EmptyState>}
              </div>
            </div>
          ) : (
            <div className="ve-sidebar-scroll ve-layers">
              <div className="ve-layer-intro">
                <MousePointer2 size={17} />
                <span>Click the preview or choose a layer. The right panel will only show controls for that part.</span>
              </div>
              {visibleLayerRows.map(group => (
                <section key={group.id} className="ve-layer-group">
                  <h3>{group.label}</h3>
                  {group.items.map(element => {
                    const key = layerKey(selectedWidget?.id, element.id);
                    const active = element.id === selectedElement?.id;
                    const hidden = !!hiddenLayers[key];
                    const locked = !!lockedLayers[key];
                    return (
                      <div key={element.id} className={`ve-layer-row${active ? ' is-active' : ''}`}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedElementId(element.id);
                            setSelectedStateId('default');
                          }}
                        >
                          <span>{element.label}</span>
                          <small>{inferElementKind(element)}</small>
                        </button>
                        <LayerToggleButton
                          active={!hidden}
                          type="visible"
                          label={hidden ? 'Show layer in preview' : 'Hide layer in preview'}
                          onClick={() => setHiddenLayers(prev => ({ ...prev, [key]: !hidden }))}
                        />
                        <LayerToggleButton
                          active={locked}
                          type="locked"
                          label={locked ? 'Unlock layer editing' : 'Lock layer editing'}
                          onClick={() => setLockedLayers(prev => ({ ...prev, [key]: !locked }))}
                        />
                      </div>
                    );
                  })}
                </section>
              ))}
            </div>
          )}
        </aside>

        <main className="ve-canvas-panel" ref={canvasPanelRef}>
          <div className={`ve-preview-shell${obsSafe ? ' ve-preview-shell--safe' : ''}`}>
            <OverlayPreview
              widgets={previewWidgets}
              theme={theme}
              appearance={showBefore ? serverState.published : draft}
              userId={user?.id}
              previewSampleStates={previewStateByWidget}
              selectedWidgetId={selectedWidget?.id}
              selectedTarget={selectedTarget}
              selectedElementId={selectedElement?.id || ''}
              hiddenElementIds={mode === 'advanced' ? selectedHiddenElementIds : []}
              styleSelections={styleSelections}
              zoom={zoom === 'fit' ? 'fit' : `${zoom}%`}
              previewMode={previewMode}
              previewBackground={previewBackground}
              selectMode={selectedElements.length > 1}
              onSelectWidget={handlePreviewWidgetSelect}
              onSelectElement={handlePreviewElementSelect}
              onResizeWidget={mode === 'advanced' ? handlePreviewResize : undefined}
              onMoveWidget={handlePreviewMove}
            />
          </div>

          <div className="ve-canvas-footer">
            <span><MousePointer2 size={15} /> {mode === 'simple' ? 'Simple Mode styles the whole selected widget. Fine-tune parts in Advanced Mode.' : 'Click text, cards, images or bars to edit that exact part.'}</span>
            <span className={`ve-performance ve-performance--${performance.tone}`}>{performance.label}</span>
          </div>
        </main>

        {mode === 'simple' ? (
        <aside className="ve-right-panel ve-right-panel--simple">
          <div className="ve-properties-header ve-properties-header--simple">
            <div>
              <strong>Quick Style</strong>
              <span>{selectedWidgetName} - Style: {selectedStyleLabel} - Editing: {selectedElement?.label || 'Entire widget'}</span>
            </div>
            {selectedWidgetUsesV2 && <span className="ve-engine-badge">V2 pilot</span>}
          </div>

          <div className="ve-properties-scroll ve-quick-style">
            {tourVisible && (
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
                  <button type="button" onClick={() => setTourVisible(false)}>Start customizing</button>
                  <button type="button" onClick={() => setTourVisible(false)}>Skip</button>
                  <button type="button" onClick={() => setTourHidden(true)}>Do not show again</button>
                </div>
              </section>
            )}

            {advancedOverrideCount > 0 && (
              <div className="ve-simple-note">
                Advanced adjustments are still active for this widget. Restore recommended style if you want a clean simple preset.
              </div>
            )}

            {import.meta.env.DEV && selectedWidgetUsesV2 && (
              <details className="ve-v2-diagnostics">
                <summary>Appearance V2 diagnostics</summary>
                <dl>
                  <div><dt>Widget</dt><dd>{selectedWidgetType}</dd></div>
                  <div><dt>Style</dt><dd>{selectedTarget.styleId}</dd></div>
                  <div><dt>Material</dt><dd>{currentSimpleSettings.material}</dd></div>
                  <div><dt>Primary</dt><dd>{currentSimpleSettings.primaryColor}</dd></div>
                  <div><dt>Shape</dt><dd>{currentSimpleSettings.shape}</dd></div>
                  <div><dt>Density</dt><dd>{currentSimpleSettings.density}</dd></div>
                </dl>
              </details>
            )}

            <SectionTabs sections={simpleSectionTabs} openSections={openSimpleSections} onToggle={toggleSimpleSection} />

            {simpleSections.includes('widgetStyle') && (
              <CollapsibleSection
                id="widgetStyle"
                title="Style preset"
                openSections={openSimpleSections}
                onToggle={toggleSimpleSection}
                className="ve-simple-section"
              >
                <p className="ve-simple-help">Choose the layout you want to edit. Each style keeps its own settings.</p>
                <div className="ve-style-card-grid">
                  {quickStyleOptions.map(option => (
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
                    <div className="ve-simple-note">This widget does not declare multiple appearance styles yet.</div>
                  )}
                </div>
              </CollapsibleSection>
            )}

            {simpleSections.includes('editing') && (
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
                    value={selectedElement?.id || ''}
                    onChange={event => {
                      setSelectedElementId(event.target.value);
                      setSelectedStateId('default');
                    }}
                  >
                    {selectedElements.map(element => (
                      <option key={element.id} value={element.id}>
                        {element.label} - {inferElementKind(element)}
                      </option>
                    ))}
                  </select>
                </label>
              </CollapsibleSection>
            )}

            {simpleSections.includes('backgroundControls') && selectedElement && (
              <CollapsibleSection
                id="backgroundControls"
                title={`${selectedElement.label} controls`}
                openSections={openSimpleSections}
                onToggle={toggleSimpleSection}
                className="ve-simple-section"
              >
                <p className="ve-simple-help">Only controls supported by this background part are shown.</p>
                <div className="ve-control-groups ve-control-groups--background">
                  {getElementControlGroups(selectedElement, 'advanced').map(group => (
                    <div key={group.id} className="ve-control-group">
                      <h4>{mapControlGroupTitle(group.label)}</h4>
                      {group.controls.map(renderElementControl)}
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {simpleSections.includes('material') && (
            <CollapsibleSection
              id="material"
              title="Surface and background"
              openSections={openSimpleSections}
              onToggle={toggleSimpleSection}
              className="ve-simple-section"
            >
              <p className="ve-simple-help">Start by choosing the finish of your widget.</p>
              <div className="ve-material-grid">
                {visibleMaterialPresets.map(preset => {
                  const active = currentSimpleSettings.material === preset.id;
                  const previewSettings = { ...currentSimpleSettings, material: preset.id };
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      className={`ve-material-card ve-material-card--${preset.id}${active ? ' is-active' : ''}`}
                      style={getSimplePresetVars(previewSettings)}
                      onClick={() => applyQuickSettings({ material: preset.id }, `Choose ${preset.name}`)}
                    >
                      <span className="ve-material-card__preview" aria-hidden="true">
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
            )}

            {simpleSections.includes('colours') && (
            <CollapsibleSection
              id="colours"
              title="Colour"
              openSections={openSimpleSections}
              onToggle={toggleSimpleSection}
              className="ve-simple-section"
            >
              <p className="ve-simple-help">Your colour automatically adapts to the selected style.</p>
              <div className="ve-swatch-grid" aria-label="Main colour">
                {SIMPLE_COLOR_PALETTE.map(color => (
                  <button
                    key={color.id}
                    type="button"
                    className={currentSimpleSettings.primaryColor === color.value ? 'is-active' : ''}
                    style={{ '--swatch': color.value }}
                    onClick={() => applyQuickSettings({ primaryColor: color.value }, `Choose ${color.label}`)}
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
                  onChange={event => applyQuickSettings({ primaryColor: event.target.value }, 'Choose custom colour')}
                  aria-label="Custom main colour"
                />
              </label>

              {!!recentColors.length && (
                <div className="ve-recent-colors">
                  <span>Recent colours</span>
                  <div className="ve-swatch-grid ve-swatch-grid--compact">
                    {recentColors.map(color => (
                      <button
                        key={color}
                        type="button"
                        className={currentSimpleSettings.primaryColor === color ? 'is-active' : ''}
                        style={{ '--swatch': color }}
                        onClick={() => applyQuickSettings({ primaryColor: color }, 'Use recent colour')}
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
                  onChange={event => applyQuickSettings({ useSecondColor: event.target.checked }, 'Toggle second colour')}
                />
                <span>Use a second colour</span>
              </label>
              {currentSimpleSettings.useSecondColor && (
                <>
                  <div className="ve-swatch-grid" aria-label="Accent colour">
                    {SIMPLE_COLOR_PALETTE.map(color => (
                      <button
                        key={`accent-${color.id}`}
                        type="button"
                        className={currentSimpleSettings.accentColor === color.value ? 'is-active' : ''}
                        style={{ '--swatch': color.value }}
                        onClick={() => applyQuickSettings({ accentColor: color.value }, `Choose accent ${color.label}`)}
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
                      onChange={event => applyQuickSettings({ accentColor: event.target.value }, 'Choose custom second colour')}
                      aria-label="Custom second colour"
                    />
                  </label>
                </>
              )}
              {currentSimpleAppearance.generatedTokens?.contrastRatio < 4.5 && (
                <div className="ve-warning">
                  <AlertTriangle size={15} />
                  <span>This colour may be hard to read.</span>
                  <button type="button" onClick={() => applyQuickSettings({ material: 'matte' }, 'Fix contrast')}>Fix contrast</button>
                </div>
              )}
            </CollapsibleSection>
            )}

            {simpleSections.includes('textImages') && (
              <CollapsibleSection
                id="textImages"
                title="Typography"
                openSections={openSimpleSections}
                onToggle={toggleSimpleSection}
                className="ve-simple-section"
              >
                {hasQuickControl('fontFamily') && (
                  <label className="ve-simple-select">
                    <span>Font style</span>
                    <FontSelectInput
                      value={currentSimpleSettings.fontFamily}
                      options={FONT_OPTIONS}
                      onChange={fontFamily => applyQuickSettings({ fontFamily }, 'Change font')}
                      className="ve-font-select--simple"
                    />
                  </label>
                )}
                {hasQuickControl('textSize') && (
                  <div className="ve-simple-choice-row">
                    {SIMPLE_TEXT_SIZES.map(size => (
                      <button
                        key={size.id}
                        type="button"
                        className={currentSimpleSettings.textSize === size.id ? 'is-active' : ''}
                        onClick={() => applyQuickSettings({ textSize: size.id }, `Choose ${size.label} text`)}
                      >
                        {size.label}
                      </button>
                    ))}
                  </div>
                )}
                {hasQuickControl('boldText') && (
                  <label className="ve-simple-toggle">
                    <input
                      type="checkbox"
                      checked={currentSimpleSettings.boldText}
                      onChange={event => applyQuickSettings({ boldText: event.target.checked }, 'Toggle bold text')}
                    />
                    <span>Bold text</span>
                  </label>
                )}
                {hasQuickControl('musicDisplayStyle') && (
                  <label className="ve-simple-select">
                    <span>Spotify style</span>
                    <select
                      value={currentSimpleSettings.musicDisplayStyle}
                      onChange={event => applyQuickSettings({ musicDisplayStyle: event.target.value }, 'Change Spotify style')}
                    >
                      {NAVBAR_MUSIC_DISPLAY_STYLES.map(style => (
                        <option key={style.id} value={style.id}>{style.label}</option>
                      ))}
                    </select>
                  </label>
                )}
                {hasAnyQuickControl(['imageVisibility', 'imageSize', 'imageShape', 'imageFit']) && (
                  <>
                    {hasAnyQuickControl(['imageVisibility', 'imageSize']) && (
                    <div className="ve-simple-choice-row">
                      {SIMPLE_IMAGE_SIZES.map(size => {
                        const active = size.id === 'hidden'
                          ? currentSimpleSettings.imageVisibility === 'hidden'
                          : currentSimpleSettings.imageVisibility !== 'hidden' && currentSimpleSettings.imageSize === size.id;
                        return (
                          <button
                            key={size.id}
                            type="button"
                            className={active ? 'is-active' : ''}
                            onClick={() => applyQuickSettings({
                              imageSize: size.id === 'hidden' ? currentSimpleSettings.imageSize || 'medium' : size.id,
                              imageVisibility: size.id === 'hidden' ? 'hidden' : 'show',
                            }, `Choose ${size.label} images`)}
                          >
                            {size.label}
                          </button>
                        );
                      })}
                    </div>
                    )}
                    {hasQuickControl('imageShape') && (
                      <div className="ve-simple-choice-row">
                        {SIMPLE_IMAGE_SHAPES.map(shape => (
                          <button
                            key={shape.id}
                            type="button"
                            className={currentSimpleSettings.imageShape === shape.id ? 'is-active' : ''}
                            onClick={() => applyQuickSettings({ imageShape: shape.id }, `Choose ${shape.label} images`)}
                          >
                            {shape.label}
                          </button>
                        ))}
                      </div>
                    )}
                    {hasQuickControl('imageFit') && (
                      <div className="ve-simple-choice-row">
                        {['cover', 'contain'].map(fit => (
                          <button
                            key={fit}
                            type="button"
                            className={currentSimpleSettings.imageFit === fit ? 'is-active' : ''}
                            onClick={() => applyQuickSettings({ imageFit: fit }, `Choose ${fit} image fit`)}
                          >
                            {fit === 'cover' ? 'Cover' : 'Contain'}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </CollapsibleSection>
            )}

            {simpleSections.includes('shapeEffects') && (
              <CollapsibleSection
                id="shapeEffects"
                title="Border and shape"
                openSections={openSimpleSections}
                onToggle={toggleSimpleSection}
                className="ve-simple-section"
              >
                {hasQuickControl('shape') && (
                  <div className="ve-simple-choice-row ve-shape-row">
                    {SIMPLE_SHAPES
                      .filter(shape => shape.id !== 'pill' || selectedStyleCapabilities.containerShapes)
                      .map(shape => (
                      <button
                        key={shape.id}
                        type="button"
                        className={currentSimpleSettings.shape === shape.id ? 'is-active' : ''}
                        onClick={() => applyQuickSettings({ shape: shape.id }, `Choose ${shape.label}`)}
                      >
                        <span style={{ borderRadius: shape.radius >= 80 ? 999 : shape.radius }} />
                        {shape.label}
                      </button>
                    ))}
                  </div>
                )}
                {hasAnyQuickControl(['density', 'scale']) && (
                  <>
                    {hasQuickControl('density') && (
                    <div className="ve-simple-choice-row">
                      {SIMPLE_DENSITIES.map(size => (
                        <button
                          key={size.id}
                          type="button"
                          className={currentSimpleSettings.density === size.id ? 'is-active' : ''}
                          onClick={() => applyQuickSettings({ density: size.id }, `Choose ${size.label}`)}
                        >
                          {size.label}
                        </button>
                      ))}
                    </div>
                    )}
                    {hasQuickControl('scale') && (
                    <label className="ve-simple-range">
                      <span>Widget size</span>
                      <input
                        type="range"
                        min="75"
                        max="150"
                        step="5"
                        value={Math.round(currentSimpleSettings.scale * 100)}
                        onChange={event => applyQuickSettings({ scale: Number(event.target.value) / 100 }, 'Change widget size')}
                      />
                      <strong>{Math.round(currentSimpleSettings.scale * 100)}%</strong>
                    </label>
                    )}
                    {hasQuickControl('barHeight') && (
                    <label className="ve-simple-range">
                      <span>Bar height</span>
                      <input
                        type="range"
                        min="32"
                        max="160"
                        step="1"
                        value={Math.round(currentSimpleSettings.barHeight || (selectedWidgetType === 'rtp_stats' ? 54 : 64))}
                        onChange={event => applyQuickSettings({ barHeight: Number(event.target.value) }, 'Change bar height')}
                      />
                      <strong>{Math.round(currentSimpleSettings.barHeight || (selectedWidgetType === 'rtp_stats' ? 54 : 64))}px</strong>
                    </label>
                    )}
                    {hasQuickControl('maxWidth') && (
                    <label className="ve-simple-range">
                      <span>Bar width</span>
                      <input
                        type="range"
                        min={selectedWidgetType === 'rtp_stats' ? '280' : '480'}
                        max="1600"
                        step="10"
                        value={Math.round(currentSimpleSettings.maxWidth || (selectedWidgetType === 'rtp_stats' ? 960 : 1200))}
                        onChange={event => applyQuickSettings({ maxWidth: Number(event.target.value) }, 'Change bar width')}
                      />
                      <strong>{Math.round(currentSimpleSettings.maxWidth || (selectedWidgetType === 'rtp_stats' ? 960 : 1200))}px</strong>
                    </label>
                    )}
                  </>
                )}
                {hasQuickControl('shadowStrength') && (
                  <div className="ve-simple-choice-row">
                    {SIMPLE_STRENGTHS.filter(item => ['off', 'soft', 'medium', 'strong'].includes(item.id)).map(item => (
                      <button
                        key={item.id}
                        type="button"
                        className={currentSimpleSettings.shadowStrength === item.id ? 'is-active' : ''}
                        onClick={() => applyQuickSettings({ shadowStrength: item.id }, `Choose ${item.label} shadow`)}
                      >
                        {item.label} shadow
                      </button>
                    ))}
                  </div>
                )}
                {hasQuickControl('glowStrength') && (
                  <div className="ve-simple-choice-row">
                    {SIMPLE_STRENGTHS.filter(item => ['off', 'subtle', 'medium', 'strong'].includes(item.id)).map(item => (
                      <button
                        key={item.id}
                        type="button"
                        className={currentSimpleSettings.glowStrength === item.id ? 'is-active' : ''}
                        onClick={() => applyQuickSettings({ glowStrength: item.id }, `Choose ${item.label} glow`)}
                      >
                        {item.label} glow
                      </button>
                    ))}
                  </div>
                )}
              </CollapsibleSection>
            )}

            {simpleSections.includes('motion') && (
              <CollapsibleSection
                id="motion"
                title="Effects and animation"
                openSections={openSimpleSections}
                onToggle={toggleSimpleSection}
                className="ve-simple-section"
              >
                {hasQuickControl('carouselAutoplay') && (
                  <label className="ve-simple-toggle">
                    <input
                      type="checkbox"
                      checked={currentSimpleSettings.carouselAutoplay}
                      onChange={event => applyQuickSettings({ carouselAutoplay: event.target.checked }, 'Toggle carousel autoplay')}
                    />
                    <span>Autoplay carousel</span>
                  </label>
                )}
                {hasQuickControl('carouselSpeed') && (
                  <div className="ve-simple-choice-row">
                    {SIMPLE_MOTION_SPEEDS.map(speed => (
                      <button
                        key={speed.id}
                        type="button"
                        className={currentSimpleSettings.carouselSpeed === speed.id ? 'is-active' : ''}
                        onClick={() => applyQuickSettings({ carouselSpeed: speed.id }, `Choose ${speed.label} carousel speed`)}
                      >
                        {speed.label} carousel
                      </button>
                    ))}
                  </div>
                )}
                {hasQuickControl('carouselDirection') && (
                  <div className="ve-simple-choice-row">
                    {['left', 'right'].map(direction => (
                      <button
                        key={direction}
                        type="button"
                        className={currentSimpleSettings.carouselDirection === direction ? 'is-active' : ''}
                        onClick={() => applyQuickSettings({ carouselDirection: direction }, `Choose ${direction} carousel direction`)}
                      >
                        {direction === 'left' ? 'Left' : 'Right'}
                      </button>
                    ))}
                  </div>
                )}
                {hasQuickControl('animationEnabled') && (
                  <label className="ve-simple-toggle">
                    <input
                      type="checkbox"
                      checked={currentSimpleSettings.animationEnabled}
                      onChange={event => applyQuickSettings({ animationEnabled: event.target.checked }, 'Toggle animation')}
                    />
                    <span>Animation</span>
                  </label>
                )}
                {hasQuickControl('animationSpeed') && (
                  <div className="ve-simple-choice-row">
                    {SIMPLE_MOTION_SPEEDS.map(speed => (
                      <button
                        key={speed.id}
                        type="button"
                        className={currentSimpleSettings.animationSpeed === speed.id ? 'is-active' : ''}
                        onClick={() => applyQuickSettings({ animationSpeed: speed.id }, `Choose ${speed.label} animation`)}
                      >
                        {speed.label} animation
                      </button>
                    ))}
                  </div>
                )}
                {hasQuickControl('animationIntensity') && (
                  <div className="ve-simple-choice-row">
                    {['subtle', 'normal', 'strong'].map(intensity => (
                      <button
                        key={intensity}
                        type="button"
                        className={currentSimpleSettings.animationIntensity === intensity ? 'is-active' : ''}
                        onClick={() => applyQuickSettings({ animationIntensity: intensity }, `Choose ${intensity} animation intensity`)}
                      >
                        {intensity[0].toUpperCase() + intensity.slice(1)}
                      </button>
                    ))}
                  </div>
                )}
              </CollapsibleSection>
            )}

            {!!serverState.presets?.filter(preset => preset.isSimpleQuickStyle).length && (
              <CollapsibleSection
                id="advanced"
                title="Advanced"
                openSections={openSimpleSections}
                onToggle={toggleSimpleSection}
                className="ve-simple-section"
              >
                <div className="ve-user-presets">
                  {serverState.presets.filter(preset => preset.isSimpleQuickStyle).map(preset => (
                    <div key={preset.id} className="ve-user-preset-row">
                      <button type="button" onClick={() => applyPreset(preset)}>{preset.name}</button>
                      <button type="button" onClick={() => duplicatePreset(preset)} title="Duplicate preset"><Copy size={14} /></button>
                      <button type="button" onClick={() => renamePreset(preset)} title="Rename preset">Rename</button>
                      <button type="button" onClick={() => deletePreset(preset)} title="Delete preset"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}

          </div>
          <section className="ve-simple-final">
            <header>
              <h3>Draft tools</h3>
            </header>
            <div className="ve-simple-actions ve-simple-actions--final">
              <button type="button" onClick={undo} disabled={!undoStack.length} aria-label="Undo" title="Undo">
                <Undo2 size={15} />
                Undo
              </button>
              <button type="button" onClick={restoreRecommendedStyle} aria-label="Restore recommended style" title="Restore recommended style">
                <RotateCcw size={15} />
                Restore
              </button>
              <button type="button" onClick={saveCurrentPreset} aria-label="Save as My Preset" title="Save as My Preset">
                <Save size={15} />
                Preset
              </button>
            </div>
          </section>
        </aside>
        ) : (
        <aside className="ve-right-panel">
          <div className="ve-properties-header">
            <div>
              <strong>{selectedElement ? selectedElement.label : selectedWidgetName}</strong>
              <span>{getModeLabel(mode)} · {selectedLayerLocked ? 'Locked' : 'Editable'}</span>
            </div>
            <button type="button" className="ve-icon-button" onClick={() => setSelectedElementId('')} aria-label="Deselect element">
              <X size={16} />
            </button>
          </div>

          {tourVisible && (
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
                <button type="button" onClick={() => setTourVisible(false)}>Skip</button>
                <button type="button" onClick={() => setTourHidden(true)}>Do not show again</button>
              </div>
            </section>
          )}

          <div className="ve-properties-scroll">
            <SectionTabs sections={advancedSectionTabs} openSections={openAdvancedSections} onToggle={toggleAdvancedSection} />

            {editingWholeWidget && (
              <>
                <CollapsibleSection
                  id="stylePreset"
                  title="Style preset"
                  meta={`${serverState.presets?.length || 0} saved`}
                  openSections={openAdvancedSections}
                  onToggle={toggleAdvancedSection}
                >
                  <div className="ve-section-tools">
                    <button type="button" onClick={saveCurrentPreset}>Save current style</button>
                  </div>
                  <div className="ve-preset-grid">
                    {BUILT_IN_STYLE_PRESETS.map(preset => (
                      <button key={preset.id} type="button" className="ve-preset-card" onClick={() => applyPreset(preset)}>
                        <span style={{ background: preset.tint }} />
                        <strong>{preset.name}</strong>
                        <small>{preset.description}</small>
                      </button>
                    ))}
                  </div>
                  {!!serverState.presets?.length && (
                    <div className="ve-user-presets">
                      <h4>Saved presets</h4>
                      {serverState.presets.map(preset => (
                        <div key={preset.id} className="ve-user-preset-row">
                          <button type="button" onClick={() => applyPreset(preset)}>{preset.name}</button>
                          <button type="button" onClick={() => duplicatePreset(preset)} title="Duplicate preset"><Copy size={14} /></button>
                          <button type="button" onClick={() => renamePreset(preset)} title="Rename preset">Rename</button>
                          <button type="button" onClick={() => deletePreset(preset)} title="Delete preset"><Trash2 size={14} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </CollapsibleSection>

                {!selectedWidgetUsesV2 && (
                  <CollapsibleSection
                    id="surfaceBackground"
                    title="Surface and background"
                    meta={`${selectedWidgetOverrides} custom values`}
                    openSections={openAdvancedSections}
                    onToggle={toggleAdvancedSection}
                  >
                    <div className="ve-control-grid">
                      {QUICK_WIDGET_CONTROLS.map(renderQuickControl)}
                    </div>
                  </CollapsibleSection>
                )}
              </>
            )}

            {selectedElement ? (
              <>
                {selectedElement.kind === 'mixed' && (
                  <div className="ve-context-note">
                    Changes apply to the selected layer only. If this is a repeated item, the widget may share the style across matching items.
                  </div>
                )}
                {selectedLayerLocked && (
                  <div className="ve-warning">
                    <AlertTriangle size={15} />
                    This layer is locked. Unlock it in the Layers panel to edit it.
                  </div>
                )}
                {selectedStateId !== 'default' && (
                  <div className="ve-context-note">
                    Editing the "{selectedStateId}" state for this element.
                  </div>
                )}
                {controlGroups.length ? controlGroups.map(group => (
                  <CollapsibleSection
                    key={group.id}
                    id={`control-${group.id}`}
                    title={mapControlGroupTitle(group.label)}
                    meta={group.label}
                    openSections={openAdvancedSections}
                    onToggle={toggleAdvancedSection}
                  >
                    <div className="ve-control-grid">
                      {group.controls.map(renderElementControl)}
                    </div>
                  </CollapsibleSection>
                )) : (
                  <EmptyState title="No controls for this element">This widget style does not expose editable appearance options for the selected part.</EmptyState>
                )}
              </>
            ) : (
              <EmptyState title="No element selected">Click a title, card, image or row in the preview to edit it directly.</EmptyState>
            )}

            {mode === 'advanced' && editingWholeWidget && (
              <CollapsibleSection
                id="spacingSizing"
                title="Spacing and sizing"
                meta="Advanced"
                openSections={openAdvancedSections}
                onToggle={toggleAdvancedSection}
              >
                <div className="ve-context-note">
                  OBS is the primary target. Device-specific overrides inherit the default value until you set one here.
                </div>
              </CollapsibleSection>
            )}

            <CollapsibleSection
              id="advanced"
              title="Advanced"
              meta={`${warnings.length} warning${warnings.length === 1 ? '' : 's'}`}
              openSections={openAdvancedSections}
              onToggle={toggleAdvancedSection}
            >
              <div className="ve-warning-list">
                {!warnings.length && <p>No obvious design problems found.</p>}
                {warnings.map(warning => (
                  <div key={warning.id} className="ve-warning">
                    <AlertTriangle size={15} />
                    <span>{warning.label}</span>
                  </div>
                ))}
              </div>
              <div className="ve-reset-row">
                <button type="button" onClick={resetElement} disabled={!selectedElement || selectedLayerLocked}>Reset element</button>
                {editingWholeWidget && (
                  <>
                    <button type="button" onClick={resetWidget}>Reset widget</button>
                    <button type="button" className="danger" onClick={resetAll}>Reset all</button>
                  </>
                )}
              </div>
            </CollapsibleSection>
          </div>
        </aside>
        )}
      </div>

      {toast && <div className="ve-toast" role="status">{toast}</div>}
    </div>
  );
}
