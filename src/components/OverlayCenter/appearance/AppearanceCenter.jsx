import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  History,
  MonitorPlay,
  Palette,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Undo2,
  Redo2,
  Wand2,
} from 'lucide-react';
import OverlayPreview from '../OverlayPreview';
import { getAllWidgetDefs } from '../widgets/widgetRegistry';
import { themeList, metallicPresets } from '../../../data/appThemes';
import { trackEvent } from '../../../utils/analytics';
import { ANALYTICS_EVENTS } from '../../../../shared/analytics';
import {
  APPEARANCE_SCHEMA_VERSION,
  RESET_VALUE,
  SYSTEM_APPEARANCE,
  buildOverlayAppearanceState,
  buildSubElementDefaults,
  createAppearancePreset,
  createAppearanceVersion,
  deepMerge,
  getAppearancePropertyState,
  getAppearancePathForVisualKey,
  getAppearanceWarnings,
  getByPath,
  getPerformanceTone,
  getScopedAppearancePath,
  getScopedVisualPath,
  getSupportedVisualKeys,
  getTargetStyleId,
  getTargetOverrideRoot,
  getThemeAppearance,
  getWidgetActiveStyleId,
  getWidgetSubElementDefinitions,
  getWidgetOverrideCount,
  getWidgetStyleOptions,
  getWidgetStyleRenderId,
  getWidgetTypeOverrideCount,
  normalizeAppearance,
  omitPath,
  projectAppearanceToThemePatch,
  resolveAppearanceForTarget,
  setByPath,
} from './appearanceModel';
import './AppearanceCenter.css';

const CATEGORY_GROUPS = [
  { id: 'themes', label: 'Themes', keywords: 'theme browser premium metallic neon minimal apply preview' },
  { id: 'canvas', label: 'Canvas', keywords: 'background gradient transparent image video resolution safe area' },
  { id: 'colors', label: 'Colours', keywords: 'primary accent text border success danger palette contrast' },
  { id: 'typography', label: 'Typography', keywords: 'font size weight line height letter spacing heading number' },
  { id: 'containers', label: 'Containers', keywords: 'cards surfaces padding gap glass density background' },
  { id: 'borders', label: 'Borders', keywords: 'edge radius width corners shape outline border' },
  { id: 'effects', label: 'Effects', keywords: 'shadow glow blur brightness contrast saturation performance' },
  { id: 'sizing', label: 'Sizes', keywords: 'scale spacing padding button icon badge stat compact large' },
  { id: 'controls', label: 'Controls', keywords: 'button input toggle tabs badge progress focus hover selected' },
  { id: 'widgets', label: 'Widgets', keywords: 'bonus hunt bets requests giveaway rtp navbar chat override inherit reset' },
  { id: 'motion', label: 'Motion', keywords: 'animation entrance exit duration easing reduced motion' },
  { id: 'responsive', label: 'Responsive', keywords: '1920 1080 1440 720 mobile vertical safe zones' },
  { id: 'branding', label: 'Branding', keywords: 'logo avatar display name sponsor watermark social' },
  { id: 'presets', label: 'Presets', keywords: 'save preset apply import export reusable styles' },
  { id: 'history', label: 'History', keywords: 'version restore undo redo published draft compare' },
  { id: 'advanced', label: 'Advanced', keywords: 'custom css validation reset json' },
];

const SIMPLE_CATEGORY_IDS = new Set(['themes', 'colors', 'typography', 'containers', 'widgets']);

const FONT_OPTIONS = [
  "'Inter', 'Segoe UI', sans-serif",
  "'Poppins', 'Segoe UI', sans-serif",
  "'Roboto', 'Segoe UI', sans-serif",
  "'Montserrat', 'Segoe UI', sans-serif",
  "'Oswald', 'Arial Narrow', sans-serif",
  "'Rajdhani', 'Segoe UI', sans-serif",
  "'Orbitron', 'Segoe UI', sans-serif",
  "'Bebas Neue', 'Arial Narrow', sans-serif",
  "'Play', 'Segoe UI', sans-serif",
];

const PREVIEW_SIZES = [
  { id: '1080p', label: '1920 x 1080', width: 1920, height: 1080 },
  { id: '1440p', label: '2560 x 1440', width: 2560, height: 1440 },
  { id: '720p', label: '1280 x 720', width: 1280, height: 720 },
  { id: 'vertical', label: 'Vertical 1080 x 1920', width: 1080, height: 1920 },
];

const PREVIEW_MODES = [
  { id: 'focus-widget', label: 'Focus selected widget' },
  { id: 'full-overlay', label: 'Full overlay' },
  { id: 'actual-scale', label: 'Actual scale' },
  { id: 'fit-widget', label: 'Fit widget' },
  { id: 'fit-canvas', label: 'Fit canvas' },
];

const PREVIEW_BACKGROUNDS = [
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Light' },
  { id: 'checkerboard', label: 'Checkerboard' },
];

const WORKFLOW_STEPS = [
  { id: 'widget', label: 'Choose widget' },
  { id: 'style', label: 'Choose style' },
  { id: 'element', label: 'Choose element' },
  { id: 'customise', label: 'Customise' },
  { id: 'preview', label: 'Preview and save' },
];

const SOURCE_LABELS = {
  draft: 'Draft value',
  'style-instance': 'This style',
  'widget-instance': 'This widget',
  'style-default': 'Type style',
  'widget-type': 'Widget type',
  global: 'Overlay',
  theme: 'Theme',
  system: 'System',
};

const SURFACE_PRESETS = {
  flat: { surfaces: { preset: 'flat', opacity: 1, glass: false, blur: 0 }, effects: { shadowEnabled: false, glowEnabled: false } },
  soft: { surfaces: { preset: 'soft', opacity: 0.92, glass: false, blur: 8 }, effects: { shadowEnabled: true, shadowBlur: 22, shadowOpacity: 0.28 } },
  glass: { surfaces: { preset: 'glass', opacity: 0.78, glass: true, blur: 18 }, effects: { backdropBlur: 12, shadowEnabled: true } },
  metallic: { surfaces: { preset: 'metallic', opacity: 0.94, glass: false, blur: 4 }, effects: { shadowEnabled: true, glowEnabled: true, glowOpacity: 0.16 } },
  neon: { surfaces: { preset: 'neon', opacity: 0.86, glass: true, blur: 12 }, effects: { glowEnabled: true, glowBlur: 34, glowOpacity: 0.38 } },
  minimal: { surfaces: { preset: 'minimal', opacity: 1, glass: false, blur: 0, padding: 8 }, effects: { shadowEnabled: false, glowEnabled: false } },
};

const MOTION_PRESETS = {
  none: { motion: { enabled: false, intensity: 'none', entrance: 'none', exit: 'none', update: 'none', duration: 0, stagger: 0 } },
  subtle: { motion: { enabled: true, intensity: 'subtle', entrance: 'fade', exit: 'fade', update: 'fade', duration: 280, stagger: 25 } },
  smooth: { motion: { enabled: true, intensity: 'smooth', entrance: 'slide-up', exit: 'fade', update: 'fade', duration: 420, stagger: 40 } },
  energetic: { motion: { enabled: true, intensity: 'energetic', entrance: 'scale', exit: 'fade', update: 'bounce', duration: 520, stagger: 70 } },
};

function safeJson(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

function countObjectKeys(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 0;
  return Object.keys(value).length;
}

function targetToKey(target) {
  if (!target) return 'overlay';
  if (target.scope === 'widget_instance') return `widget:${target.widgetId || ''}:${target.styleId || ''}`;
  if (target.scope === 'widget_type') return `type:${target.widgetType || ''}:${target.styleId || ''}`;
  return target.scope || 'overlay';
}

function sameTarget(a, b) {
  return targetToKey(a) === targetToKey(b);
}

function createClientId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function formatDate(value) {
  if (!value) return 'Never';
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return String(value);
  }
}

function createInitialTarget(widgets = [], appearance = {}) {
  const widget = widgets.find(item => item?.is_visible) || widgets[0];
  if (!widget) return { scope: 'overlay' };
  return {
    scope: 'widget_instance',
    widgetId: widget.id,
    widgetType: widget.widget_type,
    styleId: getWidgetActiveStyleId(widget, appearance),
  };
}

function getFirstElementId(widgetType) {
  return widgetType ? getWidgetSubElementDefinitions(widgetType)[0]?.id || '' : '';
}

function formatSourceLabel(source) {
  return SOURCE_LABELS[source] || (source ? String(source).replace(/-/g, ' ') : 'Inherited');
}

function formatOverrideSource(target) {
  if (target?.scope === 'widget_instance') return target.styleId ? 'Custom on style' : 'Custom on widget';
  if (target?.scope === 'widget_type') return target.styleId ? 'Custom on type style' : 'Custom on type';
  return 'Custom here';
}

function formatInheritedSource(target) {
  if (target?.scope === 'widget_instance') return 'Inherited from type/overlay';
  if (target?.scope === 'widget_type') return 'Inherited from overlay';
  return 'Inherited';
}

function ControlShell({ label, description, inherited, source, onReset, children }) {
  const sourceLabel = source || (inherited ? 'Inherited' : '');
  return (
    <label className="ac-control">
      <span className="ac-control__label">
        <span>
          <strong>{label}</strong>
          {description && <small>{description}</small>}
        </span>
        <span className="ac-control__meta">
          {sourceLabel && <em className={inherited ? '' : 'ac-control__source--custom'}>{sourceLabel}</em>}
          {onReset && (
            <button type="button" onClick={onReset} title={`Reset ${label}`}>
              <RotateCcw size={13} />
            </button>
          )}
        </span>
      </span>
      {children}
    </label>
  );
}

function ColorControl({ label, description, value, fallback = '#ffffff', inherited, source, onChange, onReset }) {
  const display = value || fallback;
  return (
    <ControlShell label={label} description={description} inherited={inherited} source={source} onReset={onReset}>
      <span className="ac-color-row">
        <input type="color" value={display.startsWith('#') ? display.slice(0, 7) : fallback} onChange={event => onChange(event.target.value)} />
        <input value={display} onChange={event => onChange(event.target.value)} aria-label={`${label} value`} />
      </span>
    </ControlShell>
  );
}

function RangeControl({ label, description, value, min, max, step = 1, unit = '', inherited, source, onChange, onReset }) {
  return (
    <ControlShell label={label} description={description} inherited={inherited} source={source} onReset={onReset}>
      <span className="ac-range-row">
        <input type="range" min={min} max={max} step={step} value={value} onChange={event => onChange(Number(event.target.value))} />
        <input type="number" min={min} max={max} step={step} value={value} onChange={event => onChange(Number(event.target.value))} aria-label={`${label} number`} />
        {unit && <small>{unit}</small>}
      </span>
    </ControlShell>
  );
}

function SelectControl({ label, description, value, options, inherited, source, onChange, onReset }) {
  return (
    <ControlShell label={label} description={description} inherited={inherited} source={source} onReset={onReset}>
      <select value={value} onChange={event => onChange(event.target.value)}>
        {options.map(option => (
          <option key={option.value || option} value={option.value || option}>{option.label || option}</option>
        ))}
      </select>
    </ControlShell>
  );
}

function TextControl({ label, description, value, placeholder, inherited, source, onChange, onReset }) {
  return (
    <ControlShell label={label} description={description} inherited={inherited} source={source} onReset={onReset}>
      <input value={value || ''} placeholder={placeholder} onChange={event => onChange(event.target.value)} />
    </ControlShell>
  );
}

function ToggleControl({ label, description, checked, inherited, source, onChange, onReset }) {
  return (
    <ControlShell label={label} description={description} inherited={inherited} source={source} onReset={onReset}>
      <button
        type="button"
        className={`ac-toggle ${checked ? 'ac-toggle--on' : ''}`}
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
      >
        <span />
        {checked ? 'On' : 'Off'}
      </button>
    </ControlShell>
  );
}

function isColorProperty(property) {
  return /color|background|fill/i.test(property);
}

function getRangeMeta(property) {
  if (/opacity/i.test(property)) return { min: 0, max: 1, step: 0.05, unit: '' };
  if (/brightness|contrast|saturation/i.test(property)) return { min: 0, max: 200, step: 1, unit: '%' };
  if (/fontWeight/i.test(property)) return { min: 100, max: 1000, step: 50, unit: '' };
  if (/borderWidth|radius|padding|gap|fontSize|imageSize|height|blur|shadow/i.test(property)) return { min: 0, max: 120, step: 1, unit: 'px' };
  return null;
}

function formatSubElementLabel(value) {
  return String(value || '').replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
}

function Section({ title, description, children, actions }) {
  return (
    <section className="ac-section">
      <header className="ac-section__header">
        <div>
          <h3>{title}</h3>
          {description && <p>{description}</p>}
        </div>
        {actions}
      </header>
      <div className="ac-section__body">
        {children}
      </div>
    </section>
  );
}

function StatusPill({ status }) {
  const map = {
    saved: ['Saved', CheckCircle2],
    saving: ['Saving', Clock],
    dirty: ['Unsaved changes', Sparkles],
    failed: ['Save failed', RotateCcw],
    previewing: ['Previewing theme', Eye],
  };
  const [label, Icon] = map[status] || map.saved;
  return (
    <span className={`ac-save-status ac-save-status--${status}`}>
      <Icon size={14} />
      {label}
    </span>
  );
}

function WorkflowSteps({ selectedTarget, selectedStyle, selectedElement, saveStatus, previewStatus }) {
  const hasWidget = selectedTarget.scope === 'widget_instance' || selectedTarget.scope === 'widget_type';
  const stepState = {
    widget: hasWidget ? 'ready' : 'current',
    style: selectedStyle ? 'ready' : hasWidget ? 'current' : 'waiting',
    element: selectedElement ? 'ready' : hasWidget ? 'current' : 'waiting',
    customise: hasWidget ? 'current' : 'waiting',
    preview: saveStatus === 'saved' && previewStatus === 'connected' ? 'ready' : 'current',
  };
  return (
    <section className="ac-workflow" aria-label="Appearance workflow">
      {WORKFLOW_STEPS.map((step, index) => (
        <div key={step.id} className={`ac-workflow__step ac-workflow__step--${stepState[step.id] || 'waiting'}`}>
          <span>{index + 1}</span>
          <strong>{step.label}</strong>
        </div>
      ))}
    </section>
  );
}

function TargetSelector({ widgets, selected, appearance, onChange }) {
  const defs = getAllWidgetDefs();
  const installedTypes = new Set(widgets.map(widget => widget.widget_type));
  const selectedWidget = widgets.find(widget => widget.id === selected.widgetId);
  const selectedType = selected.widgetType || selectedWidget?.widget_type;
  const selectedDef = defs.find(def => def.type === selectedType);
  const selectedStyleId = getTargetStyleId(selected, appearance, widgets);
  const styleOptions = selectedType ? getWidgetStyleOptions(selectedType, appearance, selectedWidget?.id) : [];
  const selectedStyle = styleOptions.find(style => style.id === selectedStyleId);
  const label = selected.scope === 'widget_instance'
    ? selectedDef?.label || selectedWidget?.widget_type || 'Widget'
    : selected.scope === 'widget_type'
      ? selectedDef?.label || selected.widgetType || 'Widget type'
      : selected.scope === 'all_widgets'
        ? 'All widgets'
        : 'Entire overlay';
  const overrideCount = selected.scope === 'widget_instance'
    ? getWidgetOverrideCount(appearance, selected.widgetId, selectedStyleId)
    : selected.scope === 'widget_type'
      ? getWidgetTypeOverrideCount(appearance, selected.widgetType, selectedStyleId)
      : 0;
  const scopeLabel = selected.scope === 'widget_instance'
    ? 'Single widget instance'
    : selected.scope === 'widget_type'
      ? 'Every widget of this type'
      : selected.scope === 'all_widgets'
        ? 'Shared widget defaults'
        : 'Global overlay';

  return (
    <section className="ac-target">
      <div className="ac-target__summary">
        <span>{selected.scope === 'widget_instance' ? 'Editing widget' : selected.scope === 'widget_type' ? 'Editing widget type' : 'Editing'}</span>
        <strong>{label}</strong>
        {selected.scope === 'widget_instance' && <small>Instance: {selectedWidget?.label || selectedWidget?.id || 'Unknown widget'}</small>}
        {(selected.scope === 'widget_type' || selected.scope === 'widget_instance') && <small>Style: {selectedStyle?.label || selectedStyleId || 'Default'}</small>}
        {selected.scope !== 'overlay' && <small>Appearance: {overrideCount} custom override{overrideCount === 1 ? '' : 's'}</small>}
      </div>
      <div className="ac-target__facts">
        <span><small>Scope</small><strong>{scopeLabel}</strong></span>
        {selectedType && <span><small>Type ID</small><code>{selectedType}</code></span>}
        {selected.scope === 'widget_instance' && <span><small>Instance ID</small><code>{selectedWidget?.id || selected.widgetId}</code></span>}
      </div>
      <select
        aria-label="Appearance editing target"
        value={
          selected.scope === 'widget_instance'
            ? `widget:${selected.widgetId}`
            : selected.scope === 'widget_type'
              ? `type:${selected.widgetType}`
              : selected.scope
        }
        onChange={event => {
          const value = event.target.value;
          if (value === 'overlay' || value === 'all_widgets') onChange({ scope: value });
          else if (value.startsWith('type:')) {
            const widgetType = value.slice(5);
            const styleId = getWidgetStyleOptions(widgetType, appearance)[0]?.id || 'default';
            onChange({ scope: 'widget_type', widgetType, styleId });
          }
          else if (value.startsWith('widget:')) {
            const widget = widgets.find(item => item.id === value.slice(7));
            onChange({
              scope: 'widget_instance',
              widgetId: value.slice(7),
              widgetType: widget?.widget_type,
              styleId: getWidgetActiveStyleId(widget, appearance),
            });
          }
        }}
      >
        <option value="overlay">Entire overlay</option>
        <option value="all_widgets">All widgets</option>
        <optgroup label="Widget types">
          {defs.map(def => {
            const activeSuffix = installedTypes.has(def.type) ? '' : ' (not active)';
            return <option key={def.type} value={`type:${def.type}`}>{def.label || def.type}{activeSuffix}</option>;
          })}
        </optgroup>
        <optgroup label="Specific widgets">
          {widgets.map(widget => {
            const def = defs.find(item => item.type === widget.widget_type);
            return <option key={widget.id} value={`widget:${widget.id}`}>{def?.label || widget.widget_type} - {widget.label || widget.id.slice(0, 8)}</option>;
          })}
        </optgroup>
      </select>
    </section>
  );
}

function ThemeCard({ theme, active, previewing, onPreview, onApply }) {
  const c = theme.colors || {};
  return (
    <article className={`ac-theme-card ${active ? 'ac-theme-card--active' : ''} ${previewing ? 'ac-theme-card--previewing' : ''}`}>
      <div className="ac-theme-card__preview" style={{
        background: c.background,
        borderColor: c.border,
        color: c.text,
      }}>
        <span style={{ background: c.primary }} />
        <strong style={{ background: c.surface }} />
        <em style={{ background: c.accent }} />
      </div>
      <div>
        <h4>{theme.name}</h4>
        <p>{theme.material || 'Built-in'} visual system</p>
      </div>
      <footer>
        <button type="button" onClick={onPreview}>Preview</button>
        <button type="button" className="ac-btn-primary" onClick={onApply}>Apply</button>
      </footer>
    </article>
  );
}

export default function AppearanceCenter({
  user,
  instance,
  theme,
  widgets,
  overlayState,
  saveTheme,
  updateState,
  onOpenPreview,
  onFocusPreview,
  onClosePreview,
  previewStatus,
}) {
  const clientIdRef = useRef(createClientId());
  const stateFromServer = useMemo(
    () => buildOverlayAppearanceState(overlayState || {}, { theme, widgets }),
    [overlayState, theme, widgets]
  );
  const [draft, setDraft] = useState(stateFromServer.draft);
  const [selectedCategory, setSelectedCategory] = useState('themes');
  const [selectedTarget, setSelectedTarget] = useState(() => createInitialTarget(widgets, stateFromServer.draft));
  const [selectedElementId, setSelectedElementId] = useState(() => getFirstElementId(createInitialTarget(widgets, stateFromServer.draft).widgetType));
  const [saveStatus, setSaveStatus] = useState('saved');
  const [search, setSearch] = useState('');
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [copiedAppearance, setCopiedAppearance] = useState(null);
  const [presetName, setPresetName] = useState('');
  const [compare, setCompare] = useState(false);
  const [previewSize, setPreviewSize] = useState('1080p');
  const [previewZoom, setPreviewZoom] = useState('fit');
  const [previewMode, setPreviewMode] = useState('focus-widget');
  const [previewBackground, setPreviewBackground] = useState('dark');
  const [previewSelectMode, setPreviewSelectMode] = useState(false);
  const [themePreview, setThemePreview] = useState(null);
  const themePreviewBackupRef = useRef(null);
  const saveTimerRef = useRef(null);
  const targetWasUserSelectedRef = useRef(false);
  const lastServerRevisionRef = useRef(stateFromServer.revision);
  const lastPersistedDraftRef = useRef(safeJson(stateFromServer.draft));
  const selectedStyleId = getTargetStyleId(selectedTarget, draft, widgets);
  const previewStyleSelections = useMemo(() => {
    if (!selectedStyleId) return {};
    if (selectedTarget.scope === 'widget_instance' && selectedTarget.widgetId) return { [selectedTarget.widgetId]: selectedStyleId };
    if (selectedTarget.scope === 'widget_type' && selectedTarget.widgetType) {
      return Object.fromEntries(widgets.filter(widget => widget.widget_type === selectedTarget.widgetType).map(widget => [widget.id, selectedStyleId]));
    }
    return {};
  }, [selectedStyleId, selectedTarget, widgets]);
  const selectedWidget = selectedTarget.scope === 'widget_instance'
    ? widgets.find(widget => widget.id === selectedTarget.widgetId)
    : null;
  const selectedWidgetType = selectedTarget.widgetType || selectedWidget?.widget_type || '';
  const selectedWidgetDef = selectedWidgetType
    ? getAllWidgetDefs().find(def => def.type === selectedWidgetType)
    : null;
  const selectedStyleOptions = selectedWidgetType ? getWidgetStyleOptions(selectedWidgetType, draft, selectedTarget.widgetId) : [];
  const selectedStyle = selectedStyleOptions.find(style => style.id === selectedStyleId);
  const selectedRenderStyleId = selectedWidget
    ? getWidgetStyleRenderId(selectedWidget, selectedStyleId, draft)
    : selectedStyle?.baseStyleId || selectedStyleId;
  const selectedSubElementDefinitions = useMemo(
    () => selectedWidgetType ? getWidgetSubElementDefinitions(selectedWidgetType) : [],
    [selectedWidgetType]
  );
  const selectedSubElement = selectedSubElementDefinitions.find(definition => definition.id === selectedElementId) || selectedSubElementDefinitions[0] || null;

  useEffect(() => {
    trackEvent(ANALYTICS_EVENTS.APPEARANCE_CENTER_OPENED, { route: '/overlay-center/appearance' });
  }, []);

  useEffect(() => {
    if (lastServerRevisionRef.current === stateFromServer.revision) return;
    lastServerRevisionRef.current = stateFromServer.revision;
    if (saveStatus === 'dirty' || saveStatus === 'saving' || themePreview) return;
    setDraft(stateFromServer.draft);
    lastPersistedDraftRef.current = safeJson(stateFromServer.draft);
  }, [stateFromServer, saveStatus, themePreview]);

  useEffect(() => {
    if (!widgets.length) return;
    setSelectedTarget(prev => {
      const targetStillExists = prev.scope !== 'widget_instance' || widgets.some(widget => widget.id === prev.widgetId);
      if (targetStillExists && (targetWasUserSelectedRef.current || prev.scope !== 'overlay')) return prev;
      return createInitialTarget(widgets, draft);
    });
  }, [draft, widgets]);

  useEffect(() => {
    const firstElementId = selectedSubElementDefinitions[0]?.id || '';
    if (!firstElementId) {
      if (selectedElementId) setSelectedElementId('');
      return;
    }
    if (!selectedSubElementDefinitions.some(definition => definition.id === selectedElementId)) {
      setSelectedElementId(firstElementId);
    }
  }, [selectedElementId, selectedSubElementDefinitions]);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return undefined;
    const channel = new BroadcastChannel('streamers-center-preview');
    channel.postMessage({
      type: 'appearance-preview-draft',
      token: instance?.overlay_token,
      appearance: draft,
      styleSelections: previewStyleSelections,
      sourceClientId: clientIdRef.current,
    });
    return () => channel.close();
  }, [draft, instance?.overlay_token, previewStyleSelections]);

  const persistDraft = useCallback(async (nextDraft, reason = 'autosave') => {
    if (!updateState) return;
    const serialized = safeJson(nextDraft);
    if (serialized === lastPersistedDraftRef.current && reason !== 'manual') return;
    setSaveStatus('saving');
    try {
      const nextRoot = {
        ...stateFromServer,
        draft: normalizeAppearance(nextDraft, { theme }),
        schemaVersion: APPEARANCE_SCHEMA_VERSION,
        revision: stateFromServer.revision + 1,
        updatedAt: new Date().toISOString(),
        sourceClientId: clientIdRef.current,
      };
      await updateState({ overlayAppearance: nextRoot });
      lastPersistedDraftRef.current = serialized;
      setSaveStatus('saved');
      trackEvent(ANALYTICS_EVENTS.APPEARANCE_DRAFT_SAVED, { reason });
    } catch (err) {
      console.error('[AppearanceCenter] save draft failed', err);
      setSaveStatus('failed');
      trackEvent(ANALYTICS_EVENTS.APPEARANCE_SAVE_FAILED, { reason });
    }
  }, [stateFromServer, theme, updateState]);

  useEffect(() => {
    if (themePreview) return undefined;
    const serialized = safeJson(draft);
    if (serialized === lastPersistedDraftRef.current) return undefined;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => persistDraft(draft), 850);
    return () => clearTimeout(saveTimerRef.current);
  }, [draft, persistDraft, themePreview]);

  const updateDraft = useCallback((recipe, summary = 'Appearance setting changed') => {
    setDraft(prev => {
      const next = normalizeAppearance(typeof recipe === 'function' ? recipe(prev) : recipe, { theme });
      setUndoStack(stack => [...stack.slice(-39), { target: selectedTarget, draft: prev }]);
      setRedoStack([]);
      setSaveStatus(themePreview ? 'previewing' : 'dirty');
      trackEvent(ANALYTICS_EVENTS.APPEARANCE_SETTING_CHANGED, { category: selectedCategory, summary });
      if (selectedTarget.scope === 'widget_type' || selectedTarget.scope === 'widget_instance') {
        trackEvent(ANALYTICS_EVENTS.WIDGET_APPEARANCE_CHANGED, {
          category: selectedCategory,
          scope: selectedTarget.scope,
          widget_type: selectedTarget.widgetType || null,
        });
      }
      return next;
    });
  }, [selectedCategory, selectedTarget, theme, themePreview]);

  const updatePath = useCallback((path, value) => {
    updateDraft(prev => setByPath(prev, getScopedAppearancePath(selectedTarget, path), value), path);
  }, [selectedTarget, updateDraft]);

  const resetPath = useCallback((path) => {
    updateDraft(prev => omitPath(prev, getScopedAppearancePath(selectedTarget, path)), `Reset ${path}`);
    trackEvent(ANALYTICS_EVENTS.APPEARANCE_RESET, { path });
  }, [selectedTarget, updateDraft]);

  const updateTargetVisual = useCallback((key, value) => {
    if (selectedTarget.scope === 'overlay' || selectedTarget.scope === 'all_widgets') {
      const pathMap = {
        accentColor: 'colors.accent',
        bgColor: 'surfaces.containerBg',
        cardBg: 'surfaces.cardBg',
        textColor: 'colors.text',
        mutedColor: 'colors.muted',
        borderColor: 'borders.color',
        fontFamily: 'typography.bodyFont',
        fontSize: 'typography.baseSize',
        borderRadius: 'borders.radius',
        borderWidth: 'borders.width',
      };
      updatePath(pathMap[key] || key, value);
      return;
    }

    const visualPath = getScopedVisualPath(selectedTarget, key);
    updateDraft(prev => setByPath(prev, visualPath, value), key);
  }, [selectedTarget, updateDraft]);

  const resetTargetVisual = useCallback((key) => {
    if (selectedTarget.scope === 'overlay' || selectedTarget.scope === 'all_widgets') {
      updateTargetVisual(key, getByPath(SYSTEM_APPEARANCE, key) || RESET_VALUE);
      return;
    }
    const visualPath = getScopedVisualPath(selectedTarget, key);
    const canonicalPath = getAppearancePathForVisualKey(key);
    updateDraft(prev => {
      let next = visualPath ? omitPath(prev, visualPath) : prev;
      if (canonicalPath) next = omitPath(next, getScopedAppearancePath(selectedTarget, canonicalPath));
      return next;
    }, `Reset ${key}`);
    trackEvent(ANALYTICS_EVENTS.WIDGET_APPEARANCE_RESET, { path: key, scope: selectedTarget.scope });
  }, [selectedTarget, updateDraft, updateTargetVisual]);

  const undo = useCallback(() => {
    setUndoStack(stack => {
      if (!stack.length) return stack;
      const index = [...stack].reverse().findIndex(entry => sameTarget(entry.target, selectedTarget));
      if (index < 0) return stack;
      const actualIndex = stack.length - 1 - index;
      const entry = stack[actualIndex];
      setRedoStack(next => [{ target: selectedTarget, draft }, ...next].slice(0, 40));
      setDraft(entry.draft);
      setSaveStatus('dirty');
      return [...stack.slice(0, actualIndex), ...stack.slice(actualIndex + 1)];
    });
  }, [draft, selectedTarget]);

  const redo = useCallback(() => {
    setRedoStack(stack => {
      if (!stack.length) return stack;
      const index = stack.findIndex(entry => sameTarget(entry.target, selectedTarget));
      if (index < 0) return stack;
      const entry = stack[index];
      setUndoStack(prev => [...prev.slice(-39), { target: selectedTarget, draft }]);
      setDraft(entry.draft);
      setSaveStatus('dirty');
      return [...stack.slice(0, index), ...stack.slice(index + 1)];
    });
  }, [draft, selectedTarget]);

  const publish = useCallback(async () => {
    clearTimeout(saveTimerRef.current);
    setSaveStatus('saving');
    try {
      const normalized = normalizeAppearance(draft, { theme });
      const version = createAppearanceVersion({
        appearance: normalized,
        userId: user?.id,
        summary: `Published ${normalized.themeId || 'custom'} appearance`,
      });
      const nextRoot = {
        ...stateFromServer,
        draft: normalized,
        published: normalized,
        schemaVersion: APPEARANCE_SCHEMA_VERSION,
        revision: stateFromServer.revision + 1,
        updatedAt: new Date().toISOString(),
        publishedAt: new Date().toISOString(),
        sourceClientId: clientIdRef.current,
        versions: [version, ...(stateFromServer.versions || [])].slice(0, 30),
      };
      await updateState({ overlayAppearance: nextRoot });
      await saveTheme(projectAppearanceToThemePatch(normalized));
      lastPersistedDraftRef.current = safeJson(normalized);
      setSaveStatus('saved');
      trackEvent(ANALYTICS_EVENTS.APPEARANCE_PUBLISHED, { theme_id: normalized.themeId });
    } catch (err) {
      console.error('[AppearanceCenter] publish failed', err);
      setSaveStatus('failed');
    }
  }, [draft, saveTheme, stateFromServer, theme, updateState, user?.id]);

  const savePreset = useCallback(async () => {
    const name = presetName.trim();
    if (!name) return;
    const preset = createAppearancePreset({
      name,
      appearance: draft,
      scope: selectedTarget.scope,
      widgetTypes: selectedTarget.widgetType ? [selectedTarget.widgetType] : [],
    });
    const nextRoot = {
      ...stateFromServer,
      draft,
      presets: [preset, ...(stateFromServer.presets || []).filter(item => item.name !== name)].slice(0, 30),
      revision: stateFromServer.revision + 1,
      updatedAt: new Date().toISOString(),
      sourceClientId: clientIdRef.current,
    };
    await updateState({ overlayAppearance: nextRoot });
    setPresetName('');
    setSaveStatus('saved');
    trackEvent(ANALYTICS_EVENTS.APPEARANCE_PRESET_SAVED, { scope: preset.scope });
  }, [draft, presetName, selectedTarget, stateFromServer, updateState]);

  const applyPreset = useCallback((preset) => {
    if (!preset?.appearance) return;
    updateDraft(preset.appearance, `Apply preset ${preset.name}`);
    trackEvent(ANALYTICS_EVENTS.APPEARANCE_PRESET_APPLIED, { scope: preset.scope });
  }, [updateDraft]);

  const restoreVersion = useCallback((version) => {
    if (!version?.appearance) return;
    updateDraft(version.appearance, `Restore version ${version.id}`);
    trackEvent(ANALYTICS_EVENTS.APPEARANCE_VERSION_RESTORED, { version_id: version.id });
  }, [updateDraft]);

  const previewTheme = useCallback((themeId) => {
    if (!themePreviewBackupRef.current) themePreviewBackupRef.current = draft;
    const next = normalizeAppearance(deepMerge(draft, getThemeAppearance(themeId), { themeId }), { theme });
    setThemePreview(themeId);
    setDraft(next);
    setSaveStatus('previewing');
    trackEvent(ANALYTICS_EVENTS.APPEARANCE_THEME_PREVIEWED, { theme_id: themeId });
  }, [draft, theme]);

  const applyTheme = useCallback((themeId) => {
    const next = normalizeAppearance(deepMerge(draft, getThemeAppearance(themeId), { themeId }), { theme });
    themePreviewBackupRef.current = null;
    setThemePreview(null);
    updateDraft(next, `Apply theme ${themeId}`);
    trackEvent(ANALYTICS_EVENTS.APPEARANCE_THEME_APPLIED, { theme_id: themeId });
  }, [draft, theme, updateDraft]);

  const cancelThemePreview = useCallback(() => {
    if (themePreviewBackupRef.current) setDraft(themePreviewBackupRef.current);
    themePreviewBackupRef.current = null;
    setThemePreview(null);
    setSaveStatus('dirty');
  }, []);

  const resetEntireAppearance = useCallback(() => {
    if (!window.confirm('Reset the entire appearance draft to the current theme defaults?')) return;
    updateDraft(normalizeAppearance(getThemeAppearance(draft.themeId), { theme }), 'Reset entire appearance');
  }, [draft.themeId, theme, updateDraft]);

  const resetSelectedWidget = useCallback(() => {
    const root = getTargetOverrideRoot(selectedTarget);
    if (!root) return;
    updateDraft(prev => omitPath(prev, root), 'Reset selected widget style');
  }, [selectedTarget, updateDraft]);

  const updateSubElement = useCallback((elementId, property, value) => {
    const root = getTargetOverrideRoot(selectedTarget);
    if (!root) return;
    updateDraft(prev => setByPath(prev, `${root}.subElements.${elementId}.${property}`, value), `${elementId}.${property}`);
  }, [selectedTarget, updateDraft]);

  const resetSubElement = useCallback((elementId, property) => {
    const root = getTargetOverrideRoot(selectedTarget);
    if (!root) return;
    updateDraft(prev => omitPath(prev, `${root}.subElements.${elementId}.${property}`), `Reset ${elementId}.${property}`);
    trackEvent(ANALYTICS_EVENTS.WIDGET_APPEARANCE_RESET, {
      scope: selectedTarget.scope,
      widget_type: selectedTarget.widgetType || null,
      path: `${elementId}.${property}`,
    });
  }, [selectedTarget, updateDraft]);

  const copySelectedAppearance = useCallback(() => {
    const root = getTargetOverrideRoot(selectedTarget);
    const payload = root
      ? getByPath(draft, root) || {}
      : { appearance: draft };
    setCopiedAppearance({
      source: selectedTarget,
      widgetType: selectedTarget.widgetType || null,
      payload,
    });
    trackEvent(ANALYTICS_EVENTS.WIDGET_APPEARANCE_COPIED, { scope: selectedTarget.scope });
  }, [draft, selectedTarget]);

  const pasteSelectedAppearance = useCallback(() => {
    if (!copiedAppearance?.payload) return;
    const root = getTargetOverrideRoot(selectedTarget);
    if (!root) return;
    const supportedKeys = new Set(getSupportedVisualKeys(selectedTarget.widgetType));
    const incomingVisual = copiedAppearance.payload.visual || copiedAppearance.payload.tokens || {};
    const compatibleVisual = Object.fromEntries(Object.entries(incomingVisual).filter(([key]) => supportedKeys.has(key)));
    const incomingAppearance = copiedAppearance.payload.appearance || {};
    const targetSubElementDefs = getWidgetSubElementDefinitions(selectedTarget.widgetType);
    const supportedSubElementProps = new Map(targetSubElementDefs.map(def => [def.id, new Set(def.properties || [])]));
    const compatibleSubElements = Object.fromEntries(Object.entries(copiedAppearance.payload.subElements || {}).map(([elementId, values]) => {
      const supportedProps = supportedSubElementProps.get(elementId);
      if (!supportedProps) return [elementId, null];
      return [elementId, Object.fromEntries(Object.entries(values || {}).filter(([prop]) => supportedProps.has(prop)))];
    }).filter(([, values]) => values && Object.keys(values).length > 0));
    updateDraft(prev => {
      const current = getByPath(prev, root) || {};
      return setByPath(prev, root, {
        ...current,
        appearance: deepMerge(current.appearance || {}, incomingAppearance),
        visual: deepMerge(current.visual || {}, compatibleVisual),
        subElements: deepMerge(current.subElements || {}, compatibleSubElements),
      });
    }, 'Paste widget appearance');
    trackEvent(ANALYTICS_EVENTS.WIDGET_APPEARANCE_PASTED, {
      scope: selectedTarget.scope,
      widget_type: selectedTarget.widgetType || null,
      applied_visual_count: Object.keys(compatibleVisual).length,
    });
  }, [copiedAppearance, selectedTarget, updateDraft]);

  const applyInstanceAppearanceToType = useCallback(() => {
    if (selectedTarget.scope !== 'widget_instance' || !selectedTarget.widgetType) return;
    const source = getByPath(draft, getTargetOverrideRoot(selectedTarget)) || {};
    updateDraft(prev => {
      const root = selectedTarget.styleId
        ? `widgetTypes.${selectedTarget.widgetType}.styles.${selectedTarget.styleId}`
        : `widgetTypes.${selectedTarget.widgetType}`;
      const current = getByPath(prev, root) || {};
      return setByPath(prev, root, {
        ...current,
        appearance: deepMerge(current.appearance || {}, source.appearance || {}),
        visual: deepMerge(current.visual || {}, source.visual || source.tokens || {}),
        subElements: deepMerge(current.subElements || {}, source.subElements || {}),
      });
    }, 'Apply widget appearance to type');
    trackEvent(ANALYTICS_EVENTS.WIDGET_APPEARANCE_APPLIED_TO_TYPE, { widget_type: selectedTarget.widgetType });
  }, [draft, selectedTarget, updateDraft]);

  const previewStyle = useCallback((styleId) => {
    if (!(selectedTarget.scope === 'widget_type' || selectedTarget.scope === 'widget_instance')) return;
    setSelectedTarget(prev => ({ ...prev, styleId }));
    setSelectedCategory('widgets');
  }, [selectedTarget.scope]);

  const applyStyle = useCallback(() => {
    if (!selectedStyleId || !(selectedTarget.scope === 'widget_type' || selectedTarget.scope === 'widget_instance')) return;
    if (selectedTarget.scope === 'widget_instance') {
      updateDraft(prev => setByPath(prev, `widgets.${selectedTarget.widgetId}.activeStyleId`, selectedStyleId), 'Apply widget style');
      return;
    }
    const affected = widgets.filter(widget => widget.widget_type === selectedTarget.widgetType);
    if (!window.confirm(`Apply ${selectedStyle?.label || selectedStyleId} to ${affected.length} widget${affected.length === 1 ? '' : 's'} of this type?`)) return;
    updateDraft(prev => affected.reduce((next, widget) => setByPath(next, `widgets.${widget.id}.activeStyleId`, selectedStyleId), prev), 'Apply style to widget type');
  }, [selectedStyleId, selectedStyle, selectedTarget, updateDraft, widgets]);

  const saveAsCustomStyle = useCallback((duplicateOnly = false) => {
    if (selectedTarget.scope !== 'widget_instance' || !selectedTarget.widgetId || !selectedStyleId) return;
    const label = duplicateOnly
      ? `${selectedStyle?.label || selectedStyleId} copy`
      : window.prompt('Custom style name', `${selectedStyle?.label || selectedStyleId} custom`);
    if (!label) return;
    const customId = `custom_${Date.now().toString(36)}`;
    const currentStyleRoot = getTargetOverrideRoot(selectedTarget);
    const currentStyleEntry = getByPath(draft, currentStyleRoot) || {};
    updateDraft(prev => {
      let next = setByPath(prev, `widgets.${selectedTarget.widgetId}.customStyles.${customId}`, {
        id: customId,
        label,
        baseStyleId: getWidgetStyleRenderId(selectedWidget, selectedStyleId, prev),
        createdAt: new Date().toISOString(),
      });
      next = setByPath(next, `widgets.${selectedTarget.widgetId}.styles.${customId}`, currentStyleEntry);
      return next;
    }, duplicateOnly ? 'Duplicate widget style' : 'Save custom widget style');
    setSelectedTarget(prev => ({ ...prev, styleId: customId }));
  }, [draft, selectedStyle, selectedStyleId, selectedTarget, selectedWidget, updateDraft]);

  const renameCustomStyle = useCallback(() => {
    if (selectedTarget.scope !== 'widget_instance' || !selectedStyle?.custom) return;
    const label = window.prompt('Rename custom style', selectedStyle.label || selectedStyleId);
    if (!label) return;
    updateDraft(prev => setByPath(prev, `widgets.${selectedTarget.widgetId}.customStyles.${selectedStyleId}.label`, label), 'Rename custom style');
  }, [selectedStyle, selectedStyleId, selectedTarget, updateDraft]);

  const targetAppearance = useMemo(
    () => resolveAppearanceForTarget(draft, selectedTarget, theme),
    [draft, selectedTarget, theme]
  );
  const selectedPreviewSize = PREVIEW_SIZES.find(item => item.id === previewSize) || PREVIEW_SIZES[0];
  const previewAppearance = useMemo(() => normalizeAppearance(deepMerge(draft, {
    canvas: {
      width: selectedPreviewSize.width,
      height: selectedPreviewSize.height,
    },
  }), { theme }), [draft, selectedPreviewSize, theme]);
  const effectiveTheme = useMemo(() => ({ ...(theme || {}), ...projectAppearanceToThemePatch(previewAppearance) }), [theme, previewAppearance]);
  const warnings = useMemo(() => getAppearanceWarnings(draft), [draft]);
  const performance = useMemo(() => getPerformanceTone(draft), [draft]);
  const categories = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return CATEGORY_GROUPS;
    return CATEGORY_GROUPS.filter(item => `${item.label} ${item.keywords}`.toLowerCase().includes(term));
  }, [search]);
  const handleTargetChange = useCallback((next) => {
    targetWasUserSelectedRef.current = true;
    if (saveStatus === 'dirty') {
      clearTimeout(saveTimerRef.current);
      persistDraft(draft, 'target-switch');
    }
    const normalizedTarget = (next.scope === 'widget_type' || next.scope === 'widget_instance') && !next.styleId
      ? { ...next, styleId: getTargetStyleId(next, draft, widgets) }
      : next;
    setSelectedTarget(normalizedTarget);
    const nextWidgetType = normalizedTarget.widgetType || widgets.find(widget => widget.id === normalizedTarget.widgetId)?.widget_type || '';
    setSelectedElementId(getFirstElementId(nextWidgetType));
    trackEvent(ANALYTICS_EVENTS.WIDGET_APPEARANCE_TARGET_SELECTED, { scope: normalizedTarget.scope, widget_type: normalizedTarget.widgetType || null });
  }, [draft, persistDraft, saveStatus, widgets]);

  const handlePreviewWidgetSelect = useCallback((widget) => {
    handleTargetChange({
      scope: 'widget_instance',
      widgetType: widget.widget_type,
      widgetId: widget.id,
      styleId: getWidgetActiveStyleId(widget, draft),
    });
    setSelectedCategory('widgets');
  }, [draft, handleTargetChange]);

  const renderCategory = () => {
    const a = targetAppearance;
    if (selectedCategory === 'themes') {
      return (
        <>
          {themePreview && (
            <section className="ac-previewing-banner">
              <Eye size={16} />
              <span>Previewing {themePreview}. Apply it to keep the look, or cancel to restore your draft.</span>
              <button type="button" onClick={() => applyTheme(themePreview)}>Apply theme</button>
              <button type="button" onClick={cancelThemePreview}>Cancel preview</button>
            </section>
          )}
          <Section title="Theme browser" description="Preview themes safely before applying them to the central appearance draft.">
            <div className="ac-theme-grid">
              {themeList.map(item => (
                <ThemeCard
                  key={item.id}
                  theme={item}
                  active={a.themeId === item.id}
                  previewing={themePreview === item.id}
                  onPreview={() => previewTheme(item.id)}
                  onApply={() => applyTheme(item.id)}
                />
              ))}
            </div>
          </Section>
          {a.themeId === 'metallic' && (
            <Section title="Metallic colour" description="Metallic themes inherit this as the primary tint.">
              <div className="ac-metal-grid">
                {Object.entries(metallicPresets).map(([id, preset]) => (
                  <button
                    key={id}
                    type="button"
                    className="ac-metal-swatch"
                    style={{ background: preset.gradient }}
                    onClick={() => updatePath('colors.primary', preset.hex)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </Section>
          )}
        </>
      );
    }

    if (selectedCategory === 'canvas') {
      return (
        <Section title="Canvas and background" description="These settings affect the full overlay canvas, not widget positions.">
          <div className="ac-control-grid">
            <SelectControl label="Background type" value={a.canvas.backgroundType} options={['transparent', 'solid', 'gradient', 'image', 'video']} onChange={value => updatePath('canvas.backgroundType', value)} onReset={() => resetPath('canvas.backgroundType')} />
            <ColorControl label="Background colour" value={a.canvas.backgroundColor} onChange={value => updatePath('canvas.backgroundColor', value)} onReset={() => resetPath('canvas.backgroundColor')} />
            <SelectControl label="Gradient type" value={a.canvas.gradientType} options={['linear', 'radial']} onChange={value => updatePath('canvas.gradientType', value)} onReset={() => resetPath('canvas.gradientType')} />
            <RangeControl label="Gradient direction" value={a.canvas.gradientAngle} min={0} max={360} unit="deg" onChange={value => updatePath('canvas.gradientAngle', value)} onReset={() => resetPath('canvas.gradientAngle')} />
            <ColorControl label="Gradient start" value={a.canvas.gradientFrom} onChange={value => updatePath('canvas.gradientFrom', value)} onReset={() => resetPath('canvas.gradientFrom')} />
            <ColorControl label="Gradient end" value={a.canvas.gradientTo} onChange={value => updatePath('canvas.gradientTo', value)} onReset={() => resetPath('canvas.gradientTo')} />
            <TextControl label="Image URL" value={a.canvas.imageUrl} placeholder="https://..." onChange={value => updatePath('canvas.imageUrl', value)} onReset={() => resetPath('canvas.imageUrl')} />
            <TextControl label="Video URL" value={a.canvas.videoUrl} placeholder="Use optimized video assets only" onChange={value => updatePath('canvas.videoUrl', value)} onReset={() => resetPath('canvas.videoUrl')} />
            <SelectControl label="Background size" value={a.canvas.backgroundSize} options={['cover', 'contain', 'stretch', 'auto']} onChange={value => updatePath('canvas.backgroundSize', value)} onReset={() => resetPath('canvas.backgroundSize')} />
            <RangeControl label="Opacity" value={a.canvas.opacity} min={0} max={1} step={0.05} onChange={value => updatePath('canvas.opacity', value)} onReset={() => resetPath('canvas.opacity')} />
            <RangeControl label="Blur" value={a.canvas.blur} min={0} max={40} unit="px" onChange={value => updatePath('canvas.blur', value)} onReset={() => resetPath('canvas.blur')} />
            <ToggleControl label="Safe-area guides" checked={a.canvas.safeArea} onChange={value => updatePath('canvas.safeArea', value)} onReset={() => resetPath('canvas.safeArea')} />
            <RangeControl label="Canvas width" value={a.canvas.width} min={320} max={7680} unit="px" onChange={value => updatePath('canvas.width', value)} onReset={() => resetPath('canvas.width')} />
            <RangeControl label="Canvas height" value={a.canvas.height} min={240} max={4320} unit="px" onChange={value => updatePath('canvas.height', value)} onReset={() => resetPath('canvas.height')} />
          </div>
        </Section>
      );
    }

    if (selectedCategory === 'colors') {
      const colorEntries = [
        ['primary', 'Primary'], ['secondary', 'Secondary'], ['accent', 'Accent'], ['success', 'Success'],
        ['warning', 'Warning'], ['danger', 'Danger'], ['info', 'Information'], ['background', 'Main background'],
        ['surface', 'Surface'], ['elevated', 'Elevated surface'], ['text', 'Text primary'], ['textSecondary', 'Text secondary'],
        ['muted', 'Muted text'], ['border', 'Border'], ['divider', 'Divider'], ['positive', 'Positive result'],
        ['negative', 'Negative result'], ['highlight', 'Highlight'], ['focus', 'Focus ring'],
      ];
      return (
        <Section title="Global colour tokens" description="Widgets inherit these unless a widget-type or instance override exists.">
          <div className="ac-color-token-grid">
            {colorEntries.map(([key, label]) => (
              <ColorControl key={key} label={label} value={a.colors[key]} onChange={value => updatePath(`colors.${key}`, value)} onReset={() => resetPath(`colors.${key}`)} />
            ))}
          </div>
          <div className="ac-contrast-note">
            <strong>Contrast check</strong>
            <span>Text: {a.colors.text} on {a.colors.surface}. Adjust suggestions are shown as warnings when values become difficult to read.</span>
          </div>
        </Section>
      );
    }

    if (selectedCategory === 'typography') {
      return (
        <Section title="Typography" description="Central fonts for headings, body text, buttons and statistics.">
          <div className="ac-control-grid">
            <SelectControl label="Heading font" value={a.typography.headingFont} options={FONT_OPTIONS} onChange={value => updatePath('typography.headingFont', value)} onReset={() => resetPath('typography.headingFont')} />
            <SelectControl label="Body font" value={a.typography.bodyFont} options={FONT_OPTIONS} onChange={value => updatePath('typography.bodyFont', value)} onReset={() => resetPath('typography.bodyFont')} />
            <SelectControl label="Number font" value={a.typography.numberFont} options={FONT_OPTIONS} onChange={value => updatePath('typography.numberFont', value)} onReset={() => resetPath('typography.numberFont')} />
            <RangeControl label="Base size" value={a.typography.baseSize} min={8} max={40} unit="px" onChange={value => updatePath('typography.baseSize', value)} onReset={() => resetPath('typography.baseSize')} />
            <RangeControl label="Heading scale" value={a.typography.headingScale} min={0.8} max={3} step={0.05} onChange={value => updatePath('typography.headingScale', value)} onReset={() => resetPath('typography.headingScale')} />
            <RangeControl label="Line height" value={a.typography.lineHeight} min={1} max={2.4} step={0.05} onChange={value => updatePath('typography.lineHeight', value)} onReset={() => resetPath('typography.lineHeight')} />
            <RangeControl label="Letter spacing" value={a.typography.letterSpacing} min={0} max={0.2} step={0.005} unit="em" onChange={value => updatePath('typography.letterSpacing', value)} onReset={() => resetPath('typography.letterSpacing')} />
            <SelectControl label="Text transform" value={a.typography.textTransform} options={['none', 'uppercase', 'capitalize']} onChange={value => updatePath('typography.textTransform', value)} onReset={() => resetPath('typography.textTransform')} />
          </div>
          <div className="ac-type-preview">
            <h4 style={{ fontFamily: a.typography.headingFont }}>Bonus Hunt Result</h4>
            <p style={{ fontFamily: a.typography.bodyFont }}>Readable body copy with status badges and button styles.</p>
            <strong style={{ fontFamily: a.typography.numberFont }}>+€1,250.00 / 625.00x</strong>
            <button type="button">Preview Button</button>
          </div>
        </Section>
      );
    }

    if (selectedCategory === 'containers') {
      return (
        <Section title="Containers and cards" description="Control the shared widget surface, card density and glass treatment.">
          <div className="ac-preset-row">
            {Object.keys(SURFACE_PRESETS).map(id => (
              <button key={id} type="button" className={a.surfaces.preset === id ? 'ac-chip ac-chip--active' : 'ac-chip'} onClick={() => updateDraft(prev => deepMerge(prev, SURFACE_PRESETS[id]), `Surface preset ${id}`)}>{id}</button>
            ))}
          </div>
          <div className="ac-control-grid">
            <ColorControl label="Container background" value={a.surfaces.containerBg} onChange={value => updatePath('surfaces.containerBg', value)} onReset={() => resetPath('surfaces.containerBg')} />
            <ColorControl label="Card background" value={a.surfaces.cardBg} onChange={value => updatePath('surfaces.cardBg', value)} onReset={() => resetPath('surfaces.cardBg')} />
            <RangeControl label="Surface opacity" value={a.surfaces.opacity} min={0} max={1} step={0.05} onChange={value => updatePath('surfaces.opacity', value)} onReset={() => resetPath('surfaces.opacity')} />
            <ToggleControl label="Glass effect" checked={a.surfaces.glass} onChange={value => updatePath('surfaces.glass', value)} onReset={() => resetPath('surfaces.glass')} />
            <RangeControl label="Backdrop blur" value={a.surfaces.blur} min={0} max={40} unit="px" onChange={value => updatePath('surfaces.blur', value)} onReset={() => resetPath('surfaces.blur')} />
            <RangeControl label="Padding" value={a.surfaces.padding} min={0} max={80} unit="px" onChange={value => updatePath('surfaces.padding', value)} onReset={() => resetPath('surfaces.padding')} />
            <RangeControl label="Internal gap" value={a.surfaces.gap} min={0} max={64} unit="px" onChange={value => updatePath('surfaces.gap', value)} onReset={() => resetPath('surfaces.gap')} />
            <SelectControl label="Density" value={a.surfaces.density} options={['compact', 'standard', 'comfortable']} onChange={value => updatePath('surfaces.density', value)} onReset={() => resetPath('surfaces.density')} />
          </div>
        </Section>
      );
    }

    if (selectedCategory === 'borders') {
      return (
        <Section title="Borders, edges and shapes" description="Rounded corners, edge width and accent borders.">
          <div className="ac-control-grid">
            <ToggleControl label="Border enabled" checked={a.borders.enabled} onChange={value => updatePath('borders.enabled', value)} onReset={() => resetPath('borders.enabled')} />
            <RangeControl label="Border width" value={a.borders.width} min={0} max={16} unit="px" onChange={value => updatePath('borders.width', value)} onReset={() => resetPath('borders.width')} />
            <SelectControl label="Border style" value={a.borders.style} options={['solid', 'dashed', 'dotted']} onChange={value => updatePath('borders.style', value)} onReset={() => resetPath('borders.style')} />
            <ColorControl label="Border colour" value={a.borders.color} onChange={value => updatePath('borders.color', value)} onReset={() => resetPath('borders.color')} />
            <RangeControl label="Corner radius" value={a.borders.radius} min={0} max={80} unit="px" onChange={value => updatePath('borders.radius', value)} onReset={() => resetPath('borders.radius')} />
            <ToggleControl label="Link corners" checked={a.borders.linkedCorners} onChange={value => updatePath('borders.linkedCorners', value)} onReset={() => resetPath('borders.linkedCorners')} />
            {!a.borders.linkedCorners && ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'].map(key => (
              <RangeControl key={key} label={key.replace(/[A-Z]/g, m => ` ${m}`).replace(/^./, c => c.toUpperCase())} value={a.borders[key]} min={0} max={80} unit="px" onChange={value => updatePath(`borders.${key}`, value)} onReset={() => resetPath(`borders.${key}`)} />
            ))}
            <ToggleControl label="Accent edge" checked={a.borders.accentEdge} onChange={value => updatePath('borders.accentEdge', value)} onReset={() => resetPath('borders.accentEdge')} />
            <ColorControl label="Edge colour" value={a.borders.edgeColor} onChange={value => updatePath('borders.edgeColor', value)} onReset={() => resetPath('borders.edgeColor')} />
          </div>
        </Section>
      );
    }

    if (selectedCategory === 'effects') {
      return (
        <Section title="Shadows, glow and visual effects" description="Includes a performance indicator to avoid expensive OBS rendering.">
          <div className={`ac-performance ac-performance--${performance.tone}`}>Performance: {performance.label}</div>
          <div className="ac-control-grid">
            <ToggleControl label="Box shadow" checked={a.effects.shadowEnabled} onChange={value => updatePath('effects.shadowEnabled', value)} onReset={() => resetPath('effects.shadowEnabled')} />
            <RangeControl label="Shadow blur" value={a.effects.shadowBlur} min={0} max={100} unit="px" onChange={value => updatePath('effects.shadowBlur', value)} onReset={() => resetPath('effects.shadowBlur')} />
            <RangeControl label="Shadow opacity" value={a.effects.shadowOpacity} min={0} max={1} step={0.05} onChange={value => updatePath('effects.shadowOpacity', value)} onReset={() => resetPath('effects.shadowOpacity')} />
            <ToggleControl label="Glow" checked={a.effects.glowEnabled} onChange={value => updatePath('effects.glowEnabled', value)} onReset={() => resetPath('effects.glowEnabled')} />
            <ColorControl label="Glow colour" value={a.effects.glowColor} onChange={value => updatePath('effects.glowColor', value)} onReset={() => resetPath('effects.glowColor')} />
            <RangeControl label="Glow blur" value={a.effects.glowBlur} min={0} max={100} unit="px" onChange={value => updatePath('effects.glowBlur', value)} onReset={() => resetPath('effects.glowBlur')} />
            <RangeControl label="Backdrop blur" value={a.effects.backdropBlur} min={0} max={40} unit="px" onChange={value => updatePath('effects.backdropBlur', value)} onReset={() => resetPath('effects.backdropBlur')} />
            <RangeControl label="Brightness" value={a.effects.brightness} min={0} max={200} unit="%" onChange={value => updatePath('effects.brightness', value)} onReset={() => resetPath('effects.brightness')} />
            <RangeControl label="Contrast" value={a.effects.contrast} min={0} max={200} unit="%" onChange={value => updatePath('effects.contrast', value)} onReset={() => resetPath('effects.contrast')} />
            <RangeControl label="Saturation" value={a.effects.saturation} min={0} max={200} unit="%" onChange={value => updatePath('effects.saturation', value)} onReset={() => resetPath('effects.saturation')} />
          </div>
        </Section>
      );
    }

    if (selectedCategory === 'sizing') {
      return (
        <Section title="Sizes and spacing" description="Visual scale only. Positioning and dimensions live on each tool page.">
          <div className="ac-control-grid">
            <RangeControl label="Interface scale" value={a.spacing.scale} min={0.5} max={2} step={0.05} onChange={value => updatePath('spacing.scale', value)} onReset={() => resetPath('spacing.scale')} />
            <RangeControl label="Widget scale" value={a.spacing.widgetScale} min={0.5} max={2} step={0.05} onChange={value => updatePath('spacing.widgetScale', value)} onReset={() => resetPath('spacing.widgetScale')} />
            <RangeControl label="Padding" value={a.spacing.padding} min={0} max={80} unit="px" onChange={value => updatePath('spacing.padding', value)} onReset={() => resetPath('spacing.padding')} />
            <RangeControl label="Gap" value={a.spacing.gap} min={0} max={64} unit="px" onChange={value => updatePath('spacing.gap', value)} onReset={() => resetPath('spacing.gap')} />
            <RangeControl label="Button height" value={a.spacing.buttonHeight} min={28} max={90} unit="px" onChange={value => updatePath('spacing.buttonHeight', value)} onReset={() => resetPath('spacing.buttonHeight')} />
            <RangeControl label="Icon size" value={a.spacing.iconSize} min={8} max={64} unit="px" onChange={value => updatePath('spacing.iconSize', value)} onReset={() => resetPath('spacing.iconSize')} />
            <RangeControl label="Stat size" value={a.spacing.statSize} min={10} max={80} unit="px" onChange={value => updatePath('spacing.statSize', value)} onReset={() => resetPath('spacing.statSize')} />
          </div>
        </Section>
      );
    }

    if (selectedCategory === 'controls') {
      return (
        <Section title="Buttons, inputs and controls" description="Focus styles remain visible for keyboard users.">
          <div className="ac-control-grid">
            <ColorControl label="Primary button" value={a.controls.primaryBg} onChange={value => updatePath('controls.primaryBg', value)} onReset={() => resetPath('controls.primaryBg')} />
            <ColorControl label="Primary text" value={a.controls.primaryText} onChange={value => updatePath('controls.primaryText', value)} onReset={() => resetPath('controls.primaryText')} />
            <ColorControl label="Secondary button" value={a.controls.secondaryBg} onChange={value => updatePath('controls.secondaryBg', value)} onReset={() => resetPath('controls.secondaryBg')} />
            <ColorControl label="Destructive button" value={a.controls.destructiveBg} onChange={value => updatePath('controls.destructiveBg', value)} onReset={() => resetPath('controls.destructiveBg')} />
            <ColorControl label="Input background" value={a.controls.inputBg} onChange={value => updatePath('controls.inputBg', value)} onReset={() => resetPath('controls.inputBg')} />
            <ColorControl label="Focus colour" value={a.controls.focusColor} onChange={value => updatePath('controls.focusColor', value)} onReset={() => resetPath('controls.focusColor')} />
            <RangeControl label="Control radius" value={a.controls.radius} min={0} max={40} unit="px" onChange={value => updatePath('controls.radius', value)} onReset={() => resetPath('controls.radius')} />
          </div>
        </Section>
      );
    }

    if (selectedCategory === 'widgets') {
      const keys = selectedTarget.scope === 'widget_type' || selectedTarget.scope === 'widget_instance'
        ? getSupportedVisualKeys(selectedWidgetType).slice(0, 16)
        : ['accentColor', 'bgColor', 'cardBg', 'textColor', 'mutedColor', 'borderColor', 'fontFamily', 'fontSize', 'borderRadius', 'borderWidth'];
      const overrideEntry = getByPath(draft, getTargetOverrideRoot(selectedTarget)) || {};
      const visualSource = overrideEntry.visual || overrideEntry.tokens || {};
      const appearanceSource = overrideEntry.appearance || {};
      const subElementDefinitions = selectedSubElementDefinitions;
      const typeSubElements = selectedWidgetType ? draft.widgetTypes?.[selectedWidgetType]?.subElements || {} : {};
      const typeStyleSubElements = selectedWidgetType && selectedRenderStyleId ? draft.widgetTypes?.[selectedWidgetType]?.styles?.[selectedRenderStyleId]?.subElements || {} : {};
      const instanceSubElements = selectedTarget.scope === 'widget_instance' ? draft.widgets?.[selectedTarget.widgetId]?.subElements || {} : {};
      const instanceStyleSubElements = selectedTarget.scope === 'widget_instance' && selectedStyleId ? draft.widgets?.[selectedTarget.widgetId]?.styles?.[selectedStyleId]?.subElements || {} : {};
      const explicitSubElements = overrideEntry.subElements || {};
      const effectiveSubElements = selectedWidgetType
        ? deepMerge(buildSubElementDefaults(selectedWidgetType, a), typeSubElements, typeStyleSubElements, selectedTarget.scope === 'widget_instance' ? instanceSubElements : {}, selectedTarget.scope === 'widget_instance' ? instanceStyleSubElements : {})
        : {};
      const selectedSubElementDefinition = subElementDefinitions.find(definition => definition.id === selectedElementId) || subElementDefinitions[0];
      return (
        <Section
          title="Widget-specific appearance"
          description="Override inherited values for a widget type or a single widget instance."
          actions={(selectedTarget.scope === 'widget_type' || selectedTarget.scope === 'widget_instance') && (
            <div className="ac-section-actions">
              <button type="button" className="ac-small-button" onClick={copySelectedAppearance}>Copy</button>
              <button type="button" className="ac-small-button" onClick={pasteSelectedAppearance} disabled={!copiedAppearance}>Paste</button>
              {selectedTarget.scope === 'widget_instance' && (
                <button type="button" className="ac-small-button" onClick={applyInstanceAppearanceToType}>Apply to type</button>
              )}
              <button type="button" className="ac-small-button" onClick={resetSelectedWidget}>Reset selected widget</button>
            </div>
          )}
        >
          {(selectedTarget.scope === 'widget_type' || selectedTarget.scope === 'widget_instance') && selectedStyleOptions.length > 0 && (
            <div className="ac-style-editor">
              <div className="ac-style-summary">
                <span>Active style: {selectedWidget ? (selectedStyleOptions.find(style => style.id === getWidgetActiveStyleId(selectedWidget, draft))?.label || getWidgetActiveStyleId(selectedWidget, draft)) : selectedStyle?.label || selectedStyleId}</span>
                <span>Editing style: {selectedStyle?.label || selectedStyleId}</span>
                <span>Render style: {selectedRenderStyleId}</span>
              </div>
              <div className="ac-section-actions">
                <button type="button" className="ac-small-button" onClick={() => previewStyle(selectedStyleId)}>Preview style</button>
                <button type="button" className="ac-small-button" onClick={applyStyle}>Apply style</button>
                {selectedTarget.scope === 'widget_instance' && (
                  <>
                    <button type="button" className="ac-small-button" onClick={() => saveAsCustomStyle(true)}>Duplicate style</button>
                    <button type="button" className="ac-small-button" onClick={() => saveAsCustomStyle(false)}>Save as new style</button>
                    <button type="button" className="ac-small-button" onClick={renameCustomStyle} disabled={!selectedStyle?.custom}>Rename custom style</button>
                  </>
                )}
                <button type="button" className="ac-small-button" onClick={resetSelectedWidget}>Reset style</button>
              </div>
            </div>
          )}
          <div className="ac-widget-capabilities">
            {selectedWidgetDef?.appearanceCapabilities && Object.entries(selectedWidgetDef.appearanceCapabilities)
              .filter(([, value]) => value === true)
              .map(([key]) => <span key={key}>{key}</span>)}
          </div>
          <div className="ac-control-grid">
            {keys.map(key => {
              const canonicalPath = getAppearancePathForVisualKey(key);
              const propertyState = canonicalPath
                ? getAppearancePropertyState({ appearance: draft, target: selectedTarget, path: canonicalPath, theme })
                : null;
              const value = visualSource[key] ?? getByPath(a, {
                accentColor: 'colors.accent',
                bgColor: 'surfaces.containerBg',
                cardBg: 'surfaces.cardBg',
                headerBg: 'surfaces.headerBg',
                headerText: 'colors.textSecondary',
                textColor: 'colors.text',
                mutedColor: 'colors.muted',
                borderColor: 'borders.color',
                fontFamily: 'typography.bodyFont',
                fontSize: 'typography.baseSize',
                borderRadius: 'borders.radius',
                borderWidth: 'borders.width',
              }[key] || '');
              const inherited = visualSource[key] == null && (!canonicalPath || getByPath(appearanceSource, canonicalPath) == null);
              const source = inherited ? formatSourceLabel(propertyState?.source) : formatOverrideSource(selectedTarget);
              const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
              if (/color|bg/i.test(key)) {
                return <ColorControl key={key} label={label} value={value} inherited={inherited} source={source} onChange={next => updateTargetVisual(key, next)} onReset={() => resetTargetVisual(key)} />;
              }
              if (/size|radius|width|padding|gap|blur|shadow|intensity/i.test(key)) {
                return <RangeControl key={key} label={label} value={Number(value) || 0} min={0} max={key.toLowerCase().includes('font') ? 64 : 100} inherited={inherited} source={source} onChange={next => updateTargetVisual(key, next)} onReset={() => resetTargetVisual(key)} />;
              }
              return <TextControl key={key} label={label} value={value || ''} inherited={inherited} source={source} onChange={next => updateTargetVisual(key, next)} onReset={() => resetTargetVisual(key)} />;
            })}
          </div>
          {(selectedTarget.scope === 'widget_type' || selectedTarget.scope === 'widget_instance') && selectedSubElementDefinition && (
            <div className="ac-sub-elements">
              <div className="ac-sub-elements__header">
                <div>
                  <h4>{selectedSubElementDefinition.label}</h4>
                  <p>Element ID: <code>{selectedSubElementDefinition.id}</code></p>
                </div>
                <span>{selectedSubElementDefinition.properties?.length || 0} supported controls</span>
              </div>
              <div className="ac-sub-element ac-sub-element--selected">
                <div className="ac-control-grid">
                  {(selectedSubElementDefinition.properties || []).map(property => {
                    const value = getByPath(effectiveSubElements, `${selectedSubElementDefinition.id}.${property}`);
                    const explicit = getByPath(explicitSubElements, `${selectedSubElementDefinition.id}.${property}`);
                    const inherited = explicit == null;
                    const source = inherited ? formatInheritedSource(selectedTarget) : formatOverrideSource(selectedTarget);
                    const label = formatSubElementLabel(property);
                    if (isColorProperty(property)) {
                      return (
                        <ColorControl
                          key={`${selectedSubElementDefinition.id}.${property}`}
                          label={label}
                          value={value}
                          inherited={inherited}
                          source={source}
                          onChange={next => updateSubElement(selectedSubElementDefinition.id, property, next)}
                          onReset={() => resetSubElement(selectedSubElementDefinition.id, property)}
                        />
                      );
                    }
                    const range = getRangeMeta(property);
                    if (range) {
                      return (
                        <RangeControl
                          key={`${selectedSubElementDefinition.id}.${property}`}
                          label={label}
                          value={Number(value) || 0}
                          min={range.min}
                          max={range.max}
                          step={range.step}
                          unit={range.unit}
                          inherited={inherited}
                          source={source}
                          onChange={next => updateSubElement(selectedSubElementDefinition.id, property, next)}
                          onReset={() => resetSubElement(selectedSubElementDefinition.id, property)}
                        />
                      );
                    }
                    return (
                      <TextControl
                        key={`${selectedSubElementDefinition.id}.${property}`}
                        label={label}
                        value={value || ''}
                        inherited={inherited}
                        source={source}
                        onChange={next => updateSubElement(selectedSubElementDefinition.id, property, next)}
                        onReset={() => resetSubElement(selectedSubElementDefinition.id, property)}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </Section>
      );
    }

    if (selectedCategory === 'motion') {
      return (
        <Section title="Motion and animations" description="Reduced-motion users and preview mode receive safe fallbacks.">
          <div className="ac-preset-row">
            {Object.keys(MOTION_PRESETS).map(id => (
              <button key={id} type="button" className={a.motion.intensity === id ? 'ac-chip ac-chip--active' : 'ac-chip'} onClick={() => updateDraft(prev => deepMerge(prev, MOTION_PRESETS[id]), `Motion preset ${id}`)}>{id}</button>
            ))}
          </div>
          <div className="ac-control-grid">
            <ToggleControl label="Motion enabled" checked={a.motion.enabled} onChange={value => updatePath('motion.enabled', value)} onReset={() => resetPath('motion.enabled')} />
            <SelectControl label="Entrance" value={a.motion.entrance} options={['none', 'fade', 'slide-up', 'slide-down', 'slide-left', 'slide-right', 'scale', 'bounce']} onChange={value => updatePath('motion.entrance', value)} onReset={() => resetPath('motion.entrance')} />
            <SelectControl label="Exit" value={a.motion.exit} options={['none', 'fade', 'slide-up', 'slide-down', 'slide-left', 'slide-right', 'scale']} onChange={value => updatePath('motion.exit', value)} onReset={() => resetPath('motion.exit')} />
            <RangeControl label="Duration" value={a.motion.duration} min={0} max={3000} unit="ms" onChange={value => updatePath('motion.duration', value)} onReset={() => resetPath('motion.duration')} />
            <RangeControl label="Delay" value={a.motion.delay} min={0} max={3000} unit="ms" onChange={value => updatePath('motion.delay', value)} onReset={() => resetPath('motion.delay')} />
            <RangeControl label="Stagger" value={a.motion.stagger} min={0} max={1000} unit="ms" onChange={value => updatePath('motion.stagger', value)} onReset={() => resetPath('motion.stagger')} />
            <ToggleControl label="Overlay reduced motion" checked={a.motion.reducedMotion} onChange={value => updatePath('motion.reducedMotion', value)} onReset={() => resetPath('motion.reducedMotion')} />
          </div>
        </Section>
      );
    }

    if (selectedCategory === 'responsive') {
      return (
        <Section title="Responsive behaviour" description="Preview different OBS/browser sizes without changing production resolution.">
          <div className="ac-control-grid">
            <RangeControl label="Preview width" value={a.responsive.previewWidth} min={320} max={7680} unit="px" onChange={value => updatePath('responsive.previewWidth', value)} onReset={() => resetPath('responsive.previewWidth')} />
            <RangeControl label="Preview height" value={a.responsive.previewHeight} min={240} max={4320} unit="px" onChange={value => updatePath('responsive.previewHeight', value)} onReset={() => resetPath('responsive.previewHeight')} />
            <RangeControl label="Font scale" value={a.responsive.fontScale} min={0.5} max={2} step={0.05} onChange={value => updatePath('responsive.fontScale', value)} onReset={() => resetPath('responsive.fontScale')} />
            <RangeControl label="Mobile scale" value={a.responsive.mobileScale} min={0.5} max={1.5} step={0.05} onChange={value => updatePath('responsive.mobileScale', value)} onReset={() => resetPath('responsive.mobileScale')} />
            <RangeControl label="Safe zone" value={a.responsive.safeZone} min={0} max={240} unit="px" onChange={value => updatePath('responsive.safeZone', value)} onReset={() => resetPath('responsive.safeZone')} />
            <ToggleControl label="Hide decorative elements on small sizes" checked={a.responsive.hideDecorativeOnSmall} onChange={value => updatePath('responsive.hideDecorativeOnSmall', value)} onReset={() => resetPath('responsive.hideDecorativeOnSmall')} />
          </div>
        </Section>
      );
    }

    if (selectedCategory === 'branding') {
      return (
        <Section title="Branding" description="Central brand values compatible widgets can inherit.">
          <div className="ac-control-grid">
            <TextControl label="Display name" value={a.branding.displayName} placeholder={instance?.display_name || 'Streamer name'} onChange={value => updatePath('branding.displayName', value)} onReset={() => resetPath('branding.displayName')} />
            <TextControl label="Logo URL" value={a.branding.logoUrl} placeholder="https://..." onChange={value => updatePath('branding.logoUrl', value)} onReset={() => resetPath('branding.logoUrl')} />
            <TextControl label="Avatar URL" value={a.branding.avatarUrl} placeholder="https://..." onChange={value => updatePath('branding.avatarUrl', value)} onReset={() => resetPath('branding.avatarUrl')} />
            <TextControl label="Sponsor logo URL" value={a.branding.sponsorLogoUrl} placeholder="https://..." onChange={value => updatePath('branding.sponsorLogoUrl', value)} onReset={() => resetPath('branding.sponsorLogoUrl')} />
            <TextControl label="Watermark" value={a.branding.watermark} placeholder="Optional watermark text" onChange={value => updatePath('branding.watermark', value)} onReset={() => resetPath('branding.watermark')} />
            <TextControl label="Social handle" value={a.branding.socialHandle} placeholder="@channel" onChange={value => updatePath('branding.socialHandle', value)} onReset={() => resetPath('branding.socialHandle')} />
            <TextControl label="Fallback image URL" value={a.branding.fallbackImageUrl} placeholder="Used when widget images fail" onChange={value => updatePath('branding.fallbackImageUrl', value)} onReset={() => resetPath('branding.fallbackImageUrl')} />
          </div>
        </Section>
      );
    }

    if (selectedCategory === 'presets') {
      return (
        <Section title="Presets and reusable styles" description="Save complete appearance snapshots and apply them later.">
          <div className="ac-preset-save">
            <input value={presetName} onChange={event => setPresetName(event.target.value)} placeholder="Preset name" />
            <button type="button" className="ac-btn-primary" onClick={savePreset}>Save preset</button>
          </div>
          <div className="ac-preset-list">
            {(stateFromServer.presets || []).length === 0 && <p>No appearance presets yet.</p>}
            {(stateFromServer.presets || []).map(preset => (
              <article key={preset.id}>
                <strong>{preset.name}</strong>
                <span>{preset.scope} - {formatDate(preset.updatedAt || preset.createdAt)}</span>
                <button type="button" onClick={() => applyPreset(preset)}>Apply</button>
              </article>
            ))}
          </div>
        </Section>
      );
    }

    if (selectedCategory === 'history') {
      return (
        <Section title="Undo, redo and version history" description="Versions are created on publish, not on every slider movement.">
          <div className="ac-history-actions">
            <button type="button" onClick={undo} disabled={!undoStack.length}><Undo2 size={15} /> Undo</button>
            <button type="button" onClick={redo} disabled={!redoStack.length}><Redo2 size={15} /> Redo</button>
            <button type="button" onClick={() => setCompare(value => !value)}><History size={15} /> {compare ? 'Hide compare' : 'Compare draft/published'}</button>
          </div>
          <div className="ac-preset-list">
            {(stateFromServer.versions || []).length === 0 && <p>No published versions yet.</p>}
            {(stateFromServer.versions || []).map(version => (
              <article key={version.id}>
                <strong>{version.summary || 'Published appearance'}</strong>
                <span>{formatDate(version.createdAt)} - {version.themeId}</span>
                <button type="button" onClick={() => restoreVersion(version)}>Restore</button>
              </article>
            ))}
          </div>
        </Section>
      );
    }

    return (
      <Section title="Advanced" description="Custom CSS is available for edge cases, but the visual editor should cover normal styling.">
        <div className="ac-control-grid">
          <TextControl label="Custom CSS" value={a.advanced.customCss} placeholder=".my-widget { }" onChange={value => updatePath('advanced.customCss', value)} onReset={() => resetPath('advanced.customCss')} />
        </div>
        <details className="ac-json-box">
          <summary>Export appearance JSON</summary>
          <textarea readOnly value={JSON.stringify(a, null, 2)} />
        </details>
      </Section>
    );
  };

  return (
    <section className="appearance-center">
      <header className="ac-header">
        <div>
          <span className="oc2-eyebrow">Appearance Center</span>
          <h1>Visual identity for your overlay</h1>
          <p>{instance?.display_name || 'My Overlay'} - Theme: {draft.themeId || 'custom'} - Published: {formatDate(stateFromServer.publishedAt)}</p>
        </div>
        <div className="ac-header__actions">
          <StatusPill status={saveStatus} />
          <button type="button" onClick={undo} disabled={!undoStack.length} aria-label="Undo"><Undo2 size={16} /> Undo</button>
          <button type="button" onClick={redo} disabled={!redoStack.length} aria-label="Redo"><Redo2 size={16} /> Redo</button>
          <details className="ac-reset-menu">
            <summary><ChevronDown size={15} /> Reset</summary>
            <div>
              <button type="button" onClick={resetEntireAppearance}>Reset entire appearance</button>
              <button type="button" onClick={() => setDraft(stateFromServer.published)}>Restore published</button>
              {(selectedTarget.scope === 'widget_type' || selectedTarget.scope === 'widget_instance') && (
                <button type="button" onClick={resetSelectedWidget}>Reset selected widget</button>
              )}
            </div>
          </details>
          <button type="button" onClick={() => persistDraft(draft, 'manual')}><Save size={16} /> Save draft</button>
          <button type="button" className="ac-btn-primary" onClick={publish}><MonitorPlay size={16} /> Publish</button>
        </div>
      </header>

      <div className="ac-toolbar">
        <div className="ac-search">
          <Search size={16} />
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search appearance settings" />
        </div>
        <button type="button" onClick={onOpenPreview}><ExternalLink size={16} /> Pop out preview</button>
        <button type="button" onClick={onFocusPreview}>Focus preview</button>
        <button type="button" onClick={onClosePreview}>Close preview</button>
        <span className={`ac-preview-status ac-preview-status--${previewStatus}`}>Preview {previewStatus}</span>
      </div>

      <WorkflowSteps
        selectedTarget={selectedTarget}
        selectedStyle={selectedStyle}
        selectedElement={selectedSubElement}
        saveStatus={saveStatus}
        previewStatus={previewStatus}
      />

      {warnings.length > 0 && (
        <div className="ac-warning-strip">
          {warnings.map(warning => <span key={warning.id}>{warning.label}</span>)}
        </div>
      )}

      <div className="ac-layout">
        <aside className="ac-categories">
          {categories.some(category => SIMPLE_CATEGORY_IDS.has(category.id)) && <span className="ac-category-group-label">Simple</span>}
          {categories.filter(category => SIMPLE_CATEGORY_IDS.has(category.id)).map(category => (
            <button
              key={category.id}
              type="button"
              className={selectedCategory === category.id ? 'ac-category ac-category--active' : 'ac-category'}
              onClick={() => {
                setSelectedCategory(category.id);
                trackEvent(ANALYTICS_EVENTS.APPEARANCE_CATEGORY_OPENED, { category: category.id });
              }}
            >
              {category.label}
            </button>
          ))}
          {categories.some(category => !SIMPLE_CATEGORY_IDS.has(category.id)) && <span className="ac-category-group-label">Advanced</span>}
          {categories.filter(category => !SIMPLE_CATEGORY_IDS.has(category.id)).map(category => (
            <button
              key={category.id}
              type="button"
              className={selectedCategory === category.id ? 'ac-category ac-category--active' : 'ac-category'}
              onClick={() => {
                setSelectedCategory(category.id);
                trackEvent(ANALYTICS_EVENTS.APPEARANCE_CATEGORY_OPENED, { category: category.id });
              }}
            >
              {category.label}
            </button>
          ))}
        </aside>

        <main className="ac-preview-column">
          <div className="ac-preview-toolbar">
            <SelectControl
              label="Preview size"
              value={previewSize}
              options={PREVIEW_SIZES.map(item => ({ value: item.id, label: item.label }))}
              onChange={setPreviewSize}
            />
            <SelectControl
              label="Zoom"
              value={previewZoom}
              options={['fit', '25%', '50%', '75%', '100%']}
              onChange={setPreviewZoom}
            />
            <SelectControl
              label="Display"
              value={previewMode}
              options={PREVIEW_MODES.map(item => ({ value: item.id, label: item.label }))}
              onChange={setPreviewMode}
            />
            <SelectControl
              label="Background"
              value={previewBackground}
              options={PREVIEW_BACKGROUNDS.map(item => ({ value: item.id, label: item.label }))}
              onChange={setPreviewBackground}
            />
            <ToggleControl label="Select widgets" checked={previewSelectMode} onChange={setPreviewSelectMode} />
            <ToggleControl label="Compare" checked={compare} onChange={setCompare} />
          </div>
          <div className={compare ? 'ac-compare ac-compare--on' : 'ac-compare'}>
            <OverlayPreview
              widgets={widgets}
              theme={effectiveTheme}
              appearance={previewAppearance}
              selectedWidgetId={selectedTarget.widgetId}
              selectedTarget={selectedTarget}
              styleSelections={previewStyleSelections}
              zoom={previewZoom}
              previewMode={previewMode}
              previewBackground={previewBackground}
              selectMode={previewSelectMode}
              onSelectWidget={handlePreviewWidgetSelect}
            />
            {compare && (
              <OverlayPreview
                widgets={widgets}
                theme={{ ...(theme || {}), ...projectAppearanceToThemePatch(stateFromServer.published) }}
                appearance={stateFromServer.published}
                selectedWidgetId={selectedTarget.widgetId}
                selectedTarget={selectedTarget}
                styleSelections={previewStyleSelections}
                zoom={previewZoom}
                previewMode={previewMode}
                previewBackground={previewBackground}
                selectMode={previewSelectMode}
                onSelectWidget={handlePreviewWidgetSelect}
              />
            )}
          </div>
          <p className="ac-preview-note">Inline preview uses the same widget renderer components as OBS. Pop-out preview receives draft changes over the preview channel.</p>
        </main>

        <aside className="ac-inspector">
          <TargetSelector widgets={widgets} selected={selectedTarget} appearance={draft} onChange={handleTargetChange} />
          <section className="ac-workflow-card">
            <header>
              <span>Style and element</span>
              <strong>{selectedWidgetDef?.label || selectedWidgetType || 'No widget selected'}</strong>
            </header>
            {(selectedTarget.scope === 'widget_type' || selectedTarget.scope === 'widget_instance') ? (
              <>
                {selectedStyleOptions.length > 0 && (
                  <SelectControl
                    label="Style variant"
                    description={selectedTarget.scope === 'widget_instance' ? 'Preview for this exact widget before applying.' : 'Preview across widgets of this type.'}
                    value={selectedStyleId}
                    options={selectedStyleOptions.map(style => ({ value: style.id, label: `${style.label}${style.custom ? ' (custom)' : ''}` }))}
                    onChange={previewStyle}
                  />
                )}
                {selectedSubElementDefinitions.length > 0 && (
                  <SelectControl
                    label="Element"
                    description="Only supported element controls are shown below."
                    value={selectedSubElement?.id || ''}
                    options={selectedSubElementDefinitions.map(definition => ({ value: definition.id, label: definition.label }))}
                    onChange={value => {
                      setSelectedElementId(value);
                      setSelectedCategory('widgets');
                    }}
                  />
                )}
                <div className="ac-workflow-card__actions">
                  <button type="button" className="ac-small-button" onClick={applyStyle} disabled={!selectedStyleId}>Apply style</button>
                  {selectedTarget.scope === 'widget_instance' && (
                    <button type="button" className="ac-small-button" onClick={() => saveAsCustomStyle(true)}>Duplicate style</button>
                  )}
                </div>
              </>
            ) : (
              <p>Choose a widget instance or widget type to edit styles and individual elements.</p>
            )}
          </section>
          {renderCategory()}
        </aside>
      </div>

      <footer className="ac-footer">
        <span><Palette size={14} /> Draft revision {stateFromServer.revision}</span>
        <span><Wand2 size={14} /> {countObjectKeys(draft.widgetTypes)} widget type override group{countObjectKeys(draft.widgetTypes) === 1 ? '' : 's'}</span>
        <button type="button" onClick={() => navigator.clipboard?.writeText(JSON.stringify(draft))}><Copy size={14} /> Copy draft JSON</button>
      </footer>
    </section>
  );
}

