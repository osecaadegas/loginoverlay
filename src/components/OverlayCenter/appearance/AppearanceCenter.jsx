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
  normalizeAppearance,
  omitPath,
  projectAppearanceToThemePatch,
  setByPath,
} from './appearanceModel';
import {
  BUILT_IN_STYLE_PRESETS,
  CONTROL_DEFINITIONS,
  EDITOR_SCHEMA_VERSION,
  WIDGET_CATEGORY_FILTERS,
  elementSupportsControl,
  getElementControlGroups,
  getFriendlyElementLabel,
  getModeLabel,
  getWidgetCategory,
  getWidgetDisplayName,
  getWidgetElementSchema,
  getWidgetIcon,
  inferElementKind,
  validateEditorValue,
} from './editorSchema';
import { LayerToggleButton, PropertyControl } from './propertyControls';
import './AppearanceCenter.css';

const TOUR_STORAGE_KEY = 'streamers_center_appearance_tour_hidden';
const MODE_STORAGE_KEY = 'streamers_center_appearance_mode';
const CLIENT_ID_PREFIX = 'appearance_editor';

const PREVIEW_BACKGROUNDS = [
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Light' },
  { id: 'checkerboard', label: 'Grid' },
  { id: 'green', label: 'Green' },
];

const ZOOM_STEPS = [25, 40, 50, 67, 75, 90, 100, 125, 150, 200];

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

function resolveElementPath(root, elementId, property, stateId = 'default') {
  const propertyPath = getElementAppearancePropertyPath(property);
  if (stateId && stateId !== 'default') {
    return `${root}.elements.${elementId}.states.${stateId}.${propertyPath}`;
  }
  return `${root}.elements.${elementId}.${propertyPath}`;
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
  const [selectedElementId, setSelectedElementId] = useState(() => getFirstElement(firstWidget?.widget_type)?.id || '');
  const [selectedStateId, setSelectedStateId] = useState('default');
  const [sidebarTab, setSidebarTab] = useState('widgets');
  const [widgetSearch, setWidgetSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [previewMode, setPreviewMode] = useState('focus-widget');
  const [previewBackground, setPreviewBackground] = useState('dark');
  const [zoom, setZoom] = useState('fit');
  const [obsSafe, setObsSafe] = useState(true);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [statusMessage, setStatusMessage] = useState('');
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [hiddenLayers, setHiddenLayers] = useState({});
  const [lockedLayers, setLockedLayers] = useState({});
  const [tourVisible, setTourVisible] = useState(getInitialTourVisible);
  const [toast, setToast] = useState('');
  const lastPersistedDraftRef = useRef(safeJson(serverState.draft));
  const lastRevisionRef = useRef(serverState.revision);

  const selectedWidget = useMemo(
    () => widgets.find(widget => widget.id === selectedTarget.widgetId) || firstWidget,
    [widgets, selectedTarget.widgetId, firstWidget]
  );
  const selectedWidgetName = selectedWidget ? getWidgetDisplayName(selectedWidget) : 'Overlay';
  const selectedWidgetType = selectedWidget?.widget_type || selectedTarget.widgetType || '';
  const selectedTargetRoot = useMemo(() => getTargetOverrideRoot(selectedTarget), [selectedTarget]);
  const selectedElements = useMemo(() => getWidgetElementSchema(selectedWidgetType), [selectedWidgetType]);
  const selectedElement = useMemo(
    () => selectedElements.find(element => element.id === selectedElementId) || selectedElements[0] || null,
    [selectedElements, selectedElementId]
  );
  const selectedLayerKey = layerKey(selectedWidget?.id, selectedElement?.id);
  const selectedLayerLocked = !!lockedLayers[selectedLayerKey];
  const dirty = safeJson(draft) !== lastPersistedDraftRef.current;
  const warnings = useMemo(() => getAppearanceWarnings(draft), [draft]);
  const performance = useMemo(() => getPerformanceTone(draft), [draft]);
  const groupedLayers = useMemo(() => groupLayers(selectedElements), [selectedElements]);

  const filteredWidgets = useMemo(() => {
    const term = widgetSearch.trim().toLowerCase();
    return widgets.filter(widget => {
      const name = getWidgetDisplayName(widget).toLowerCase();
      const type = String(widget.widget_type || '').toLowerCase();
      const category = getWidgetCategory(widget);
      if (categoryFilter !== 'all' && category !== categoryFilter) return false;
      return !term || name.includes(term) || type.includes(term);
    });
  }, [widgets, widgetSearch, categoryFilter]);

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
    if (lastRevisionRef.current === serverState.revision) return;
    lastRevisionRef.current = serverState.revision;
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
    setDraft(prev => {
      const next = normalizeAppearance(typeof recipe === 'function' ? recipe(prev) : recipe, { theme });
      if (safeJson(prev) === safeJson(next)) return prev;
      setUndoStack(stack => [...stack.slice(-49), { targetKey: targetKey(selectedTarget), draft: prev, summary }]);
      setRedoStack([]);
      setSaveStatus('dirty');
      setStatusMessage('Preview updated instantly. Draft will be saved shortly.');
      trackEvent(ANALYTICS_EVENTS.APPEARANCE_SETTING_CHANGED || 'appearance_setting_changed', {
        summary,
        widget_type: selectedWidgetType || null,
        element_id: selectedElementId || null,
      });
      return next;
    });
  }, [selectedElementId, selectedTarget, selectedWidgetType, theme]);

  const selectWidget = useCallback((widget, nextElementId = '') => {
    if (!widget) return;
    if (dirty) {
      clearTimeout(saveTimerRef.current);
      persistDraft(draft, 'widget-switch');
    }
    const target = createTarget(widget, draft);
    const firstElement = getFirstElement(widget.widget_type);
    setSelectedTarget(target);
    setSelectedElementId(nextElementId || firstElement?.id || '');
    setSelectedStateId('default');
    setSidebarTab('layers');
    trackEvent(ANALYTICS_EVENTS.WIDGET_APPEARANCE_TARGET_SELECTED || 'widget_appearance_target_selected', {
      scope: target.scope,
      widget_type: target.widgetType,
    });
  }, [dirty, draft, persistDraft]);

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

  const undo = useCallback(() => {
    setUndoStack(stack => {
      if (!stack.length) return stack;
      const entry = stack[stack.length - 1];
      setRedoStack(next => [{ targetKey: targetKey(selectedTarget), draft, summary: 'Redo style change' }, ...next].slice(0, 50));
      setDraft(entry.draft);
      setSaveStatus('dirty');
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
      setStatusMessage('Redo applied.');
      return stack.slice(1);
    });
  }, [draft, selectedTarget]);

  const publish = useCallback(async () => {
    clearTimeout(saveTimerRef.current);
    setSaveStatus('saving');
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
      lastPersistedDraftRef.current = safeJson(normalized);
      setSaveStatus('saved');
      setStatusMessage('Published. OBS browser sources will use this design.');
      setToast('Published to OBS');
      trackEvent(ANALYTICS_EVENTS.APPEARANCE_PUBLISHED || 'appearance_published', {
        widget_type: selectedWidgetType || null,
      });
    } catch (err) {
      console.error('[AppearanceCenter] publish failed', err);
      setSaveStatus('failed');
      setStatusMessage('Publish failed.');
      setToast('Publish failed');
    }
  }, [draft, saveTheme, selectedWidgetName, selectedWidgetType, serverState, theme, updateState, user?.id]);

  const updateElementControl = useCallback((control, value) => {
    if (!selectedTargetRoot || !selectedElement?.id || selectedLayerLocked) return;
    const normalized = validateEditorValue(control, value);
    const path = resolveElementPath(selectedTargetRoot, selectedElement.id, control.id, selectedStateId);
    commitDraft(prev => setByPath(prev, path, normalized), `${selectedElement.id}.${control.id}`);
  }, [commitDraft, selectedElement?.id, selectedLayerLocked, selectedStateId, selectedTargetRoot]);

  const resetElementControl = useCallback((control) => {
    if (!selectedTargetRoot || !selectedElement?.id || selectedLayerLocked) return;
    const modernPath = resolveElementPath(selectedTargetRoot, selectedElement.id, control.id, selectedStateId);
    const legacyPath = resolveLegacyElementPath(selectedTargetRoot, selectedElement.id, control.id, selectedStateId);
    commitDraft(prev => omitPath(omitPath(prev, modernPath), legacyPath), `Reset ${selectedElement.id}.${control.id}`);
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
    commitDraft(prev => normalizeAppearance(deepMerge(prev, appearance), { theme }), `Apply preset ${preset.name}`);
    setToast(`${preset.name} applied`);
    trackEvent(ANALYTICS_EVENTS.APPEARANCE_PRESET_APPLIED || 'appearance_preset_applied', { preset_id: preset.id });
  }, [commitDraft, theme]);

  const saveCurrentPreset = useCallback(async () => {
    const name = window.prompt('Preset name', `${selectedWidgetName} style`);
    if (!name?.trim() || !updateState) return;
    const preset = createAppearancePreset({
      name,
      appearance: draft,
      scope: selectedTarget.scope,
      widgetTypes: selectedWidgetType ? [selectedWidgetType] : [],
    });
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
  }, [draft, selectedTarget.scope, selectedWidgetName, selectedWidgetType, serverState, updateState]);

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
    commitDraft(prev => omitPath(omitPath(prev, modernPath), legacyPath), `Reset ${selectedElement.id}`);
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
    setStatusMessage('Unsaved changes discarded.');
  }, [serverState.draft]);

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
      } else if (event.key === 'Delete' && selectedElement?.id && !selectedLayerLocked) {
        event.preventDefault();
        if (window.confirm(`Reset ${selectedElement.label}?`)) resetElement();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [draft, persistDraft, redo, resetElement, selectedElement, selectedLayerLocked, undo]);

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
    const path = resolveElementPath(selectedTargetRoot, selectedElement.id, control.id, selectedStateId);
    const legacyPath = resolveLegacyElementPath(selectedTargetRoot, selectedElement.id, control.id, selectedStateId);
    const value = getByPath(draft, path);
    const legacyValue = getByPath(draft, legacyPath);
    const resolvedValue = value !== undefined ? value : legacyValue;
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

  const controlGroups = useMemo(() => {
    if (!selectedElement) return [];
    return getElementControlGroups(selectedElement, mode).filter(group => group.controls.some(control => elementSupportsControl(selectedElement, control.id)));
  }, [mode, selectedElement]);

  const visibleLayerRows = Object.values(groupedLayers);
  const selectedWidgetOverrides = selectedTargetRoot ? countObjectLeaves(getByPath(draft, selectedTargetRoot)) : 0;

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
            <small>{selectedElement ? getFriendlyElementLabel(selectedElement.id, selectedElement.label) : 'Choose an element'}</small>
          </div>
          <span className={`ve-save-status ve-save-status--${saveStatus}${dirty ? ' ve-save-status--dirty' : ''}`}>
            {saveStatus === 'saved' && !dirty ? <CheckCircle2 size={14} /> : <span className="ve-status-dot" />}
            {formatStatus(saveStatus, dirty)}
          </span>
        </div>
        <div className="ve-topbar__tools" role="toolbar" aria-label="Appearance editor tools">
          <ToolbarButton icon={Undo2} disabled={!undoStack.length} onClick={undo} title="Undo (Ctrl+Z)" />
          <ToolbarButton icon={Redo2} disabled={!redoStack.length} onClick={redo} title="Redo (Ctrl+Shift+Z)" />
          <span className="ve-toolbar-divider" />
          <ToolbarButton icon={Monitor} active={previewMode === 'full-overlay'} onClick={() => setPreviewMode('full-overlay')}>Desktop</ToolbarButton>
          <ToolbarButton icon={MonitorPlay} active={previewMode === 'fit-widget'} onClick={() => setPreviewMode('fit-widget')}>OBS</ToolbarButton>
          <ToolbarButton icon={Maximize2} active={zoom === 'fit'} onClick={() => updateZoom('fit')} title="Fit preview" />
          <ToolbarButton icon={ZoomOut} onClick={() => updateZoom('out')} title="Zoom out" />
          <span className="ve-zoom-label">{zoom === 'fit' ? 'Fit' : `${zoom}%`}</span>
          <ToolbarButton icon={ZoomIn} onClick={() => updateZoom('in')} title="Zoom in" />
          <span className="ve-toolbar-divider" />
          <div className="ve-mode-switch" role="group" aria-label="Editor mode">
            <button type="button" className={mode === 'simple' ? 'is-active' : ''} onClick={() => setMode('simple')}>Simple</button>
            <button type="button" className={mode === 'advanced' ? 'is-active' : ''} onClick={() => setMode('advanced')}>Advanced</button>
          </div>
          <ToolbarButton icon={RotateCcw} onClick={resetWidget}>Reset</ToolbarButton>
          <ToolbarButton icon={Save} onClick={() => persistDraft(draft, 'manual')}>Save Draft</ToolbarButton>
          <ToolbarButton icon={ExternalLink} primary onClick={publish}>Publish to OBS</ToolbarButton>
        </div>
      </div>

      {statusMessage && (
        <div className="ve-status-line" role="status">
          {statusMessage}
          {dirty && <button type="button" onClick={discardUnsaved}>Discard unsaved changes</button>}
        </div>
      )}

      <div className="ve-workspace">
        <aside className="ve-left-panel">
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

          {sidebarTab === 'widgets' ? (
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
              <div className="ve-category-chips" aria-label="Widget category filters">
                {WIDGET_CATEGORY_FILTERS.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    className={categoryFilter === item.id ? 'is-active' : ''}
                    onClick={() => setCategoryFilter(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="ve-widget-list">
                {filteredWidgets.map(widget => {
                  const active = selectedWidget?.id === widget.id;
                  const edited = !!getByPath(draft, `widgets.${widget.id}`);
                  return (
                    <button
                      key={widget.id}
                      type="button"
                      className={`ve-widget-card${active ? ' is-active' : ''}`}
                      onClick={() => selectWidget(widget)}
                    >
                      <span className="ve-widget-card__thumb">
                        <WidgetIcon icon={getWidgetIcon(widget)} />
                      </span>
                      <span className="ve-widget-card__body">
                        <strong>{getWidgetDisplayName(widget)}</strong>
                        <small>{widget.is_visible ? 'Enabled' : 'Disabled'} · {WIDGET_CATEGORY_FILTERS.find(item => item.id === getWidgetCategory(widget))?.label || 'Other'}</small>
                      </span>
                      {edited && <span className="ve-edited-dot" title="Edited" />}
                    </button>
                  );
                })}
                {!filteredWidgets.length && <EmptyState title="No widgets found">Try another search or category.</EmptyState>}
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

        <main className="ve-canvas-panel">
          <div className="ve-canvas-header">
            <div>
              <strong>Live canvas</strong>
              <span>Preview uses the same widget components and appearance model as OBS.</span>
            </div>
            <div className="ve-canvas-actions">
              <label className="ve-toggle-inline">
                <input type="checkbox" checked={obsSafe} onChange={event => setObsSafe(event.target.checked)} />
                OBS safe frame
              </label>
              <button type="button" onClick={onOpenPreview}>
                <ExternalLink size={15} />
                Pop-out
              </button>
              {previewStatus?.open && (
                <button type="button" onClick={onFocusPreview}>
                  <Eye size={15} />
                  Focus
                </button>
              )}
            </div>
          </div>

          <div className="ve-background-switcher" role="group" aria-label="Canvas background">
            {PREVIEW_BACKGROUNDS.map(item => (
              <button key={item.id} type="button" className={previewBackground === item.id ? 'is-active' : ''} onClick={() => setPreviewBackground(item.id)}>
                {item.label}
              </button>
            ))}
          </div>

          <div className={`ve-preview-shell${obsSafe ? ' ve-preview-shell--safe' : ''}`}>
            <OverlayPreview
              widgets={widgets}
              theme={theme}
              appearance={draft}
              selectedWidgetId={selectedWidget?.id}
              selectedTarget={selectedTarget}
              selectedElementId={selectedElement?.id}
              hiddenElementIds={selectedHiddenElementIds}
              styleSelections={styleSelections}
              zoom={zoom === 'fit' ? 'fit' : `${zoom}%`}
              previewMode={previewMode}
              previewBackground={previewBackground}
              selectMode
              onSelectWidget={handlePreviewWidgetSelect}
              onSelectElement={handlePreviewElementSelect}
              onResizeWidget={handlePreviewResize}
            />
          </div>

          <div className="ve-canvas-footer">
            <span><MousePointer2 size={15} /> Click text, cards, images or bars to edit that exact part.</span>
            <span className={`ve-performance ve-performance--${performance.tone}`}>{performance.label}</span>
          </div>
        </main>

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
            <section className="ve-property-section">
              <header>
                <h3>Presets</h3>
                <button type="button" onClick={saveCurrentPreset}>Save current style</button>
              </header>
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
            </section>

            <section className="ve-property-section">
              <header>
                <h3>Widget style</h3>
                <span>{selectedWidgetOverrides} custom values</span>
              </header>
              <div className="ve-control-grid">
                {QUICK_WIDGET_CONTROLS.map(renderQuickControl)}
              </div>
            </section>

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
                {controlGroups.map(group => (
                  <section key={group.id} className="ve-property-section">
                    <header>
                      <h3>{group.label}</h3>
                    </header>
                    <div className="ve-control-grid">
                      {group.controls.map(renderElementControl)}
                    </div>
                  </section>
                ))}
              </>
            ) : (
              <EmptyState title="No element selected">Click a title, card, image or row in the preview to edit it directly.</EmptyState>
            )}

            {mode === 'advanced' && (
              <section className="ve-property-section">
                <header>
                  <h3>Responsive overrides</h3>
                  <span>Advanced</span>
                </header>
                <div className="ve-context-note">
                  OBS is the primary target. Device-specific overrides inherit the default value until you set one here.
                </div>
              </section>
            )}

            <section className="ve-property-section">
              <header>
                <h3>Validation</h3>
                <span>{warnings.length} warning{warnings.length === 1 ? '' : 's'}</span>
              </header>
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
                <button type="button" onClick={resetWidget}>Reset widget</button>
                <button type="button" className="danger" onClick={resetAll}>Reset all</button>
              </div>
            </section>
          </div>
        </aside>
      </div>

      {toast && <div className="ve-toast" role="status">{toast}</div>}
    </div>
  );
}
