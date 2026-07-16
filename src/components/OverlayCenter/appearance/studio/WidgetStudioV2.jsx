import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Clipboard,
  Copy,
  Layers3,
  RotateCcw,
  Save,
  Search,
  Undo2,
  Upload,
  Wand2,
} from 'lucide-react';
import {
  WIDGET_STUDIO_CATEGORIES,
  WIDGET_STUDIO_SCHEMA_VERSION,
} from '../../../../widgets/registry/widgetTypes.js';
import {
  getAppearanceStudioWidgets,
  getStudioWidgetManifest,
} from '../../../../widgets/registry/widgetRegistry.js';
import {
  createWidgetStudioRecord,
  deepMerge,
  getByPath,
  resolveWidgetSettings,
  setByPath,
  unsetByPath,
} from '../../../../widgets/shared/settings/settingsResolver.js';
import './WidgetStudioV2.css';

const INSTANCE_OPTIONS = Object.freeze([
  { id: 'default', label: 'Default instance' },
  { id: 'compact', label: 'Compact instance' },
]);

const PREVIEW_DATA_OPTIONS = Object.freeze([
  { id: 'default', label: 'Default data' },
  { id: 'empty', label: 'Empty data' },
  { id: 'longText', label: 'Long text' },
  { id: 'largeValue', label: 'Large value' },
]);

function now() {
  return new Date().toISOString();
}

function safeStudioState(source = {}) {
  return {
    schemaVersion: WIDGET_STUDIO_SCHEMA_VERSION,
    drafts: {},
    published: {},
    instances: {},
    copiedSettings: null,
    ...source,
  };
}

function instanceKey(widgetId, instanceId) {
  return `${widgetId || 'widget'}:${instanceId || 'default'}`;
}

function getRecord(store, widgetId, instanceId) {
  return store?.[instanceKey(widgetId, instanceId)] || null;
}

function setRecord(store, record) {
  return {
    ...(store || {}),
    [instanceKey(record.widgetId, record.instanceId)]: record,
  };
}

function groupSettings(schema = []) {
  return schema.reduce((groups, setting) => {
    const id = setting.group || 'Other';
    if (!groups[id]) groups[id] = [];
    groups[id].push(setting);
    return groups;
  }, {});
}

function settingKey(setting) {
  return `${setting.group}:${setting.key}`;
}

function FieldControl({ setting, value, onChange }) {
  const id = `studio-${setting.key.replace(/[^a-z0-9]+/gi, '-')}`;
  if (setting.type === 'boolean') {
    return (
      <label className="wsv2-field wsv2-field--toggle" htmlFor={id}>
        <input id={id} type="checkbox" checked={!!value} onChange={event => onChange(event.target.checked)} />
        <span>
          <strong>{setting.label}</strong>
          <small>{setting.description}</small>
        </span>
      </label>
    );
  }
  if (setting.type === 'select') {
    return (
      <label className="wsv2-field" htmlFor={id}>
        <span>{setting.label}</span>
        <select id={id} value={value ?? setting.defaultValue} onChange={event => onChange(event.target.value)}>
          {(setting.options || []).map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <small>{setting.description}</small>
      </label>
    );
  }
  if (setting.type === 'color') {
    return (
      <label className="wsv2-field" htmlFor={id}>
        <span>{setting.label}</span>
        <div className="wsv2-color-row">
          <input id={id} type="color" value={value ?? setting.defaultValue} onChange={event => onChange(event.target.value)} />
          <code>{value ?? setting.defaultValue}</code>
        </div>
        <small>{setting.description}</small>
      </label>
    );
  }
  if (setting.type === 'number' || setting.type === 'range') {
    return (
      <label className="wsv2-field" htmlFor={id}>
        <span>{setting.label}</span>
        <div className="wsv2-number-row">
          <input
            id={id}
            type="range"
            min={setting.min}
            max={setting.max}
            step={setting.step || 1}
            value={value ?? setting.defaultValue}
            onChange={event => onChange(Number(event.target.value))}
          />
          <input
            type="number"
            min={setting.min}
            max={setting.max}
            step={setting.step || 1}
            value={value ?? setting.defaultValue}
            onChange={event => onChange(Number(event.target.value))}
          />
          {setting.unit && <em>{setting.unit}</em>}
        </div>
        <small>{setting.description}</small>
      </label>
    );
  }
  return (
    <label className="wsv2-field" htmlFor={id}>
      <span>{setting.label}</span>
      <input id={id} type="text" value={value ?? setting.defaultValue} onChange={event => onChange(event.target.value)} />
      <small>{setting.description}</small>
    </label>
  );
}

export default function WidgetStudioV2({
  user,
  overlayState,
  updateState,
}) {
  const studioWidgets = useMemo(() => getAppearanceStudioWidgets(), []);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedWidgetId, setSelectedWidgetId] = useState(studioWidgets[0]?.id || '');
  const [selectedInstanceId, setSelectedInstanceId] = useState('default');
  const [previewDataId, setPreviewDataId] = useState('default');
  const [previewSettings, setPreviewSettings] = useState({});
  const [appliedDrafts, setAppliedDrafts] = useState({});
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [status, setStatus] = useState('Ready');
  const [activeGroup, setActiveGroup] = useState('Content');

  const persistedStudio = useMemo(() => safeStudioState(overlayState?.widgetStudioV2), [overlayState?.widgetStudioV2]);
  const selectedManifest = getStudioWidgetManifest(selectedWidgetId);
  const instanceId = selectedInstanceId || 'default';
  const currentInstanceKey = instanceKey(selectedWidgetId, instanceId);
  const draftRecord = getRecord(persistedStudio.drafts, selectedWidgetId, instanceId);
  const publishedRecord = getRecord(persistedStudio.published, selectedWidgetId, instanceId);
  const localDraftRecord = appliedDrafts[currentInstanceKey] || null;
  const draftSettings = localDraftRecord?.settings || draftRecord?.settings || selectedManifest?.defaultSettings || {};
  const resolvedPreview = useMemo(() => {
    if (!selectedManifest) return { settings: {}, errors: [] };
    return resolveWidgetSettings({
      systemDefaults: {},
      themeDefaults: {},
      widgetDefaults: selectedManifest.defaultSettings,
      userSettings: draftSettings,
      instanceSettings: {},
      previewSettings,
      schema: selectedManifest.settingsSchema,
    });
  }, [draftSettings, previewSettings, selectedManifest]);
  const groups = useMemo(() => groupSettings(selectedManifest?.settingsSchema || []), [selectedManifest]);
  const visibleGroups = Object.keys(groups);
  const Renderer = selectedManifest?.previewRenderer || selectedManifest?.renderer;
  const previewData = selectedManifest?.mockData?.[previewDataId] || selectedManifest?.mockData?.default || {};
  const hasPreviewChanges = Object.keys(previewSettings).length > 0;
  const hasSavedDraft = !!draftRecord;
  const isPublished = !!publishedRecord && JSON.stringify(publishedRecord.settings) === JSON.stringify(draftSettings);

  const filteredWidgets = useMemo(() => {
    const term = query.trim().toLowerCase();
    return studioWidgets.filter(widget => {
      if (category !== 'all' && widget.category !== category) return false;
      return !term || `${widget.name} ${widget.description} ${widget.category}`.toLowerCase().includes(term);
    });
  }, [category, query, studioWidgets]);

  useEffect(() => {
    if (!visibleGroups.includes(activeGroup)) setActiveGroup(visibleGroups[0] || '');
  }, [activeGroup, visibleGroups]);

  const patchPreview = useCallback((path, value) => {
    setUndoStack(prev => [...prev, previewSettings].slice(-40));
    setRedoStack([]);
    setPreviewSettings(prev => setByPath(prev, path, value));
  }, [previewSettings]);

  const resetSetting = useCallback((path) => {
    setUndoStack(prev => [...prev, previewSettings].slice(-40));
    setRedoStack([]);
    setPreviewSettings(prev => unsetByPath(prev, path));
  }, [previewSettings]);

  const undo = useCallback(() => {
    setUndoStack(prev => {
      if (!prev.length) return prev;
      const previous = prev[prev.length - 1];
      setRedoStack(stack => [previewSettings, ...stack].slice(0, 40));
      setPreviewSettings(previous);
      return prev.slice(0, -1);
    });
  }, [previewSettings]);

  const redo = useCallback(() => {
    setRedoStack(prev => {
      if (!prev.length) return prev;
      const next = prev[0];
      setUndoStack(stack => [...stack, previewSettings].slice(-40));
      setPreviewSettings(next);
      return prev.slice(1);
    });
  }, [previewSettings]);

  const createDraftRecordFromPreview = useCallback((settings = resolvedPreview.settings) => {
    if (!selectedManifest) return null;
    return createWidgetStudioRecord({
      widgetId: selectedManifest.id,
      widgetVersion: selectedManifest.version,
      instanceId,
      settings,
      mode: 'draft',
    });
  }, [instanceId, resolvedPreview.settings, selectedManifest]);

  const applyPreviewToDraft = useCallback(() => {
    const record = createDraftRecordFromPreview();
    if (!record) return null;
    setAppliedDrafts(prev => ({ ...prev, [instanceKey(record.widgetId, record.instanceId)]: record }));
    setPreviewSettings({});
    setStatus('Preview applied to draft. Save Draft stores it.');
    return record;
  }, [createDraftRecordFromPreview]);

  const persistStudioState = useCallback(async (nextStudio, message) => {
    if (!updateState) return;
    await updateState({ widgetStudioV2: nextStudio });
    setStatus(message);
  }, [updateState]);

  const saveDraft = useCallback(async () => {
    const record = hasPreviewChanges
      ? createDraftRecordFromPreview(resolvedPreview.settings)
      : (localDraftRecord || createDraftRecordFromPreview(draftSettings));
    if (!record) return;
    const nextStudio = {
      ...persistedStudio,
      drafts: setRecord(persistedStudio.drafts, record),
      instances: {
        ...(persistedStudio.instances || {}),
        [instanceKey(record.widgetId, record.instanceId)]: {
          widgetId: record.widgetId,
          instanceId: record.instanceId,
          label: INSTANCE_OPTIONS.find(option => option.id === record.instanceId)?.label || record.instanceId,
          updatedAt: now(),
        },
      },
      updatedAt: now(),
    };
    setAppliedDrafts(prev => {
      const next = { ...prev };
      delete next[instanceKey(record.widgetId, record.instanceId)];
      return next;
    });
    setPreviewSettings({});
    await persistStudioState(nextStudio, 'Draft saved.');
  }, [createDraftRecordFromPreview, draftSettings, hasPreviewChanges, localDraftRecord, persistedStudio, persistStudioState, resolvedPreview.settings]);

  const publish = useCallback(async () => {
    if (!selectedManifest) return;
    const settings = hasPreviewChanges ? resolvedPreview.settings : draftSettings;
    const draftRecordNext = createWidgetStudioRecord({
      widgetId: selectedManifest.id,
      widgetVersion: selectedManifest.version,
      instanceId,
      settings,
      mode: 'draft',
    });
    const publishedRecordNext = { ...draftRecordNext, mode: 'published', publishedAt: now() };
    const nextStudio = {
      ...persistedStudio,
      drafts: setRecord(persistedStudio.drafts, draftRecordNext),
      published: setRecord(persistedStudio.published, publishedRecordNext),
      updatedAt: now(),
    };
    setPreviewSettings({});
    await persistStudioState(nextStudio, 'Published to Widget Studio v2.');
  }, [draftSettings, hasPreviewChanges, instanceId, persistedStudio, persistStudioState, resolvedPreview.settings, selectedManifest]);

  const resetWidget = useCallback(() => {
    setUndoStack(prev => [...prev, previewSettings].slice(-40));
    setRedoStack([]);
    setPreviewSettings(selectedManifest?.defaultSettings || {});
    setStatus('Widget reset in preview. Save or publish when ready.');
  }, [previewSettings, selectedManifest]);

  const resetSection = useCallback((groupName) => {
    setUndoStack(prev => [...prev, previewSettings].slice(-40));
    setRedoStack([]);
    setPreviewSettings(prev => {
      let next = prev;
      for (const setting of groups[groupName] || []) next = unsetByPath(next, setting.key);
      return next;
    });
    setStatus(`${groupName} reset in preview.`);
  }, [groups, previewSettings]);

  const copySettings = useCallback(async () => {
    const text = JSON.stringify(resolvedPreview.settings, null, 2);
    if (navigator?.clipboard?.writeText) await navigator.clipboard.writeText(text);
    setStatus('Settings copied.');
  }, [resolvedPreview.settings]);

  const pasteSettings = useCallback(async () => {
    if (!navigator?.clipboard?.readText) return;
    try {
      const parsed = JSON.parse(await navigator.clipboard.readText());
      setUndoStack(prev => [...prev, previewSettings].slice(-40));
      setPreviewSettings(parsed);
      setStatus('Settings pasted into preview.');
    } catch {
      setStatus('Clipboard does not contain valid settings JSON.');
    }
  }, [previewSettings]);

  return (
    <section className="widget-studio-v2">
      <header className="wsv2-hero">
        <div>
          <span className="wsv2-eyebrow">Widget Studio v2</span>
          <h1>Build customizable widgets safely</h1>
          <p>Legacy overlay widgets still run normally, but they are no longer edited here. New widgets appear only when they declare a Studio manifest and schema.</p>
        </div>
        <div className="wsv2-status">
          <CheckCircle2 size={17} />
          <span>{status}</span>
        </div>
      </header>

      <div className="wsv2-grid">
        <aside className="wsv2-sidebar">
          <div className="wsv2-panel-heading">
            <strong>Widgets</strong>
            <span>{filteredWidgets.length} Studio-ready</span>
          </div>
          <label className="wsv2-search">
            <Search size={16} />
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search Studio widgets" />
          </label>
          <div className="wsv2-categories">
            {WIDGET_STUDIO_CATEGORIES.map(item => (
              <button
                key={item.id}
                type="button"
                className={category === item.id ? 'is-active' : ''}
                onClick={() => setCategory(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="wsv2-widget-list">
            {filteredWidgets.map(widget => (
              <button
                key={widget.id}
                type="button"
                className={selectedWidgetId === widget.id ? 'is-active' : ''}
                onClick={() => {
                  setSelectedWidgetId(widget.id);
                  setPreviewSettings({});
                }}
              >
                <strong>{widget.name}</strong>
                <span>{widget.description}</span>
                <small>v{widget.version} - {widget.category}</small>
              </button>
            ))}
            {!filteredWidgets.length && (
              <div className="wsv2-empty">
                <Wand2 size={19} />
                <strong>No Studio widgets yet</strong>
                <p>Legacy widgets are intentionally hidden from this editor until they are rebuilt with a manifest.</p>
              </div>
            )}
          </div>
          <button type="button" className="wsv2-create" disabled>Create new widget</button>
        </aside>

        <main className="wsv2-preview-panel">
          <div className="wsv2-preview-toolbar">
            <div>
              <strong>{selectedManifest?.name || 'Widget Studio'}</strong>
              <span>{selectedManifest ? `Editing ${selectedManifest.id}` : 'Choose a Studio widget'}</span>
            </div>
            <div className="wsv2-toolbar-actions">
              <select value={selectedInstanceId} onChange={event => {
                setSelectedInstanceId(event.target.value);
                setPreviewSettings({});
              }}>
                {INSTANCE_OPTIONS.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
              <select value={previewDataId} onChange={event => setPreviewDataId(event.target.value)}>
                {PREVIEW_DATA_OPTIONS.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </div>
          </div>
          <div className="wsv2-canvas">
            {Renderer ? (
              <Renderer
                settings={resolvedPreview.settings}
                data={previewData}
                instanceId={instanceId}
              />
            ) : (
              <div className="wsv2-empty">No renderer selected.</div>
            )}
          </div>
          <div className="wsv2-preview-meta">
            <span>Preview changes are temporary until Apply or Save Draft.</span>
            <span>{hasSavedDraft ? 'Draft exists' : 'Using defaults'} - {isPublished ? 'Published' : 'Not published'}</span>
          </div>
        </main>

        <aside className="wsv2-controls">
          <div className="wsv2-panel-heading">
            <strong>Generated controls</strong>
            <span>{selectedManifest?.settingsSchema?.length || 0} settings</span>
          </div>
          <div className="wsv2-doc-card">
            <BookOpen size={17} />
            <div>
              <strong>Legacy widgets are isolated</strong>
              <p>Existing OBS widgets keep their URLs and data. Studio controls only affect widgets registered here.</p>
            </div>
          </div>
          <div className="wsv2-group-tabs">
            {visibleGroups.map(group => (
              <button
                key={group}
                type="button"
                className={activeGroup === group ? 'is-active' : ''}
                onClick={() => setActiveGroup(group)}
              >
                {group}
              </button>
            ))}
          </div>
          <div className="wsv2-control-list">
            {(groups[activeGroup] || []).map(setting => (
              <div key={settingKey(setting)} className="wsv2-control-card" data-target={setting.target}>
                <FieldControl
                  setting={setting}
                  value={getByPath(resolvedPreview.settings, setting.key)}
                  onChange={value => patchPreview(setting.key, value)}
                />
                <button type="button" onClick={() => resetSetting(setting.key)}>Reset</button>
              </div>
            ))}
          </div>
          <div className="wsv2-actions">
            <button type="button" onClick={undo} disabled={!undoStack.length}><Undo2 size={15} /> Undo</button>
            <button type="button" onClick={redo} disabled={!redoStack.length}>Redo</button>
            <button type="button" onClick={() => resetSection(activeGroup)}><RotateCcw size={15} /> Reset section</button>
            <button type="button" onClick={resetWidget}><Layers3 size={15} /> Reset widget</button>
            <button type="button" onClick={copySettings}><Copy size={15} /> Copy</button>
            <button type="button" onClick={pasteSettings}><Clipboard size={15} /> Paste</button>
            <button type="button" onClick={applyPreviewToDraft}><CheckCircle2 size={15} /> Apply</button>
            <button type="button" onClick={saveDraft}><Save size={15} /> Save Draft</button>
            <button type="button" className="wsv2-primary" onClick={publish}><Upload size={15} /> Publish</button>
          </div>
        </aside>
      </div>

      <footer className="wsv2-footer">
        <strong>Developer note:</strong>
        <span>New widgets must register a manifest, schema, defaults, renderer, mock data and documentation. Legacy widgets stay operational outside this editor.</span>
      </footer>
    </section>
  );
}
