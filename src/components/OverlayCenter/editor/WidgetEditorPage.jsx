import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Eye,
  EyeOff,
  Layers,
  MonitorPlay,
  Plus,
  SlidersHorizontal,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useOverlay } from "../../../hooks/useOverlay";
import LoadingSpinner from "../../LoadingSpinner/LoadingSpinner";
import { buildSyncedConfig } from "../WidgetManager";
import {
  getAllWidgetDefs,
  getWidgetDef,
  getWidgetStyleDefaultSize,
} from "../widgets/widgetRegistry";
import "../widgets/builtinWidgets";
import "../OverlayCenter.css";
import "../OverlayRenderer.css";
import "./WidgetEditorPage.css";

const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;

function toWidgetLabel(type) {
  return String(type || "")
    .split("_")
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function compareWidgetLayer(a, b) {
  if (a?.widget_type === "background" && b?.widget_type !== "background")
    return -1;
  if (a?.widget_type !== "background" && b?.widget_type === "background")
    return 1;
  return (a?.z_index || 0) - (b?.z_index || 0);
}

function getWidgetStyleId(widget, def) {
  const key = def?.styleConfigKey || "displayStyle";
  return widget?.config?.[key] || def?.styles?.[0]?.id || "";
}

function buildStyleUpdate(widget, def, nextStyleId) {
  const key = def?.styleConfigKey || "displayStyle";
  const defaultSize = getWidgetStyleDefaultSize(widget.widget_type, nextStyleId);
  return {
    ...widget,
    ...(defaultSize
      ? {
          width: defaultSize.width,
          height: defaultSize.height,
        }
      : {}),
    config: {
      ...(widget.config || {}),
      [key]: nextStyleId,
    },
  };
}

function EditorPreviewSlot({ widget, allWidgets, selected, onSelect, theme, userId }) {
  const def = getWidgetDef(widget.widget_type);
  const Component = def?.component;
  if (!Component) return null;

  const isBackground = widget.widget_type === "background";
  const width = isBackground ? CANVAS_WIDTH : widget.width || 320;
  const height = isBackground ? CANVAS_HEIGHT : widget.height || 180;
  const left = isBackground ? 0 : widget.position_x || 0;
  const top = isBackground ? 0 : widget.position_y || 0;

  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(widget.widget_type);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className={`editor-preview-slot${selected ? " editor-preview-slot--selected" : ""}${isBackground ? " editor-preview-slot--background" : ""}`}
      style={{
        left: `${(left / CANVAS_WIDTH) * 100}%`,
        top: `${(top / CANVAS_HEIGHT) * 100}%`,
        width: `${(width / CANVAS_WIDTH) * 100}%`,
        height: `${(height / CANVAS_HEIGHT) * 100}%`,
        zIndex: isBackground ? 0 : widget.z_index || 1,
      }}
      onClick={() => onSelect(widget.widget_type)}
      onKeyDown={handleKeyDown}
      aria-label={`Select ${def.label || toWidgetLabel(widget.widget_type)}`}
    >
      <span className="editor-preview-slot__label">
        {def.label || toWidgetLabel(widget.widget_type)}
      </span>
      <div className="editor-preview-slot__body">
        <Component
          config={widget.config || {}}
          theme={theme}
          allWidgets={allWidgets}
          widgetId={widget.id}
          userId={userId}
        />
      </div>
    </div>
  );
}

function WidgetListItem({ def, widget, selected, onSelect, onAdd, onToggle }) {
  const visible = widget?.is_visible !== false;

  return (
    <div
      className={`editor-widget-row${selected ? " editor-widget-row--active" : ""}`}
    >
      <button
        type="button"
        className="editor-widget-row__main"
        onClick={() => onSelect(def.type)}
      >
        <span className="editor-widget-row__icon" aria-hidden="true">
          {def.icon || "W"}
        </span>
        <span className="editor-widget-row__copy">
          <strong>{def.label || toWidgetLabel(def.type)}</strong>
          <small>{widget ? `${Math.round(widget.width || 0)} x ${Math.round(widget.height || 0)}` : "Not added"}</small>
        </span>
      </button>
      {widget ? (
        <button
          type="button"
          className="editor-icon-button"
          onClick={() => onToggle(widget)}
          aria-label={visible ? "Hide widget" : "Show widget"}
          title={visible ? "Hide widget" : "Show widget"}
        >
          {visible ? <Eye size={15} /> : <EyeOff size={15} />}
        </button>
      ) : (
        <button
          type="button"
          className="editor-icon-button editor-icon-button--primary"
          onClick={() => onAdd(def)}
          aria-label={`Add ${def.label || def.type}`}
          title={`Add ${def.label || def.type}`}
        >
          <Plus size={15} />
        </button>
      )}
    </div>
  );
}

function StyleSelector({ def, widget, onChange }) {
  const styles = Array.isArray(def?.styles) ? def.styles : [];
  if (!widget || styles.length === 0) return null;
  const activeStyle = getWidgetStyleId(widget, def);

  return (
    <section className="editor-panel-section">
      <div className="editor-section-title">
        <Layers size={14} />
        <span>Widget style</span>
      </div>
      <div className="editor-style-grid">
        {styles.map((style) => (
          <button
            key={style.id}
            type="button"
            className={`editor-style-option${style.id === activeStyle ? " editor-style-option--active" : ""}`}
            onClick={() => onChange(style.id)}
          >
            <span aria-hidden="true">{style.icon || "S"}</span>
            <strong>{style.label || style.id}</strong>
          </button>
        ))}
      </div>
    </section>
  );
}

function GeometryControls({ widget, onChange }) {
  if (!widget) return null;

  const patchNumber = (key, value) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return;
    onChange({ ...widget, [key]: number });
  };

  return (
    <section className="editor-panel-section">
      <div className="editor-section-title">
        <MonitorPlay size={14} />
        <span>Canvas slot</span>
      </div>
      <div className="editor-geometry-grid">
        {[
          ["position_x", "X"],
          ["position_y", "Y"],
          ["width", "W"],
          ["height", "H"],
          ["z_index", "Layer"],
        ].map(([key, label]) => (
          <label key={key} className="editor-number-field">
            <span>{label}</span>
            <input
              type="number"
              value={Math.round(Number(widget[key]) || 0)}
              onChange={(event) => patchNumber(key, event.target.value)}
            />
          </label>
        ))}
      </div>
    </section>
  );
}

export default function WidgetEditorPage() {
  const { user } = useAuth();
  const {
    widgets,
    theme,
    loading,
    error,
    addWidget,
    saveWidget,
  } = useOverlay();
  const [selectedType, setSelectedType] = useState("");

  const widgetDefs = useMemo(
    () =>
      getAllWidgetDefs()
        .filter((def) => def.configPanel || def.component)
        .sort((a, b) => (a.label || a.type).localeCompare(b.label || b.type)),
    [],
  );

  useEffect(() => {
    if (selectedType) return;
    const firstWidget = widgets.find((widget) => widget.is_visible !== false);
    setSelectedType(firstWidget?.widget_type || widgetDefs[0]?.type || "");
  }, [selectedType, widgetDefs, widgets]);

  const widgetsByType = useMemo(() => {
    const map = new Map();
    for (const widget of widgets) {
      if (!map.has(widget.widget_type)) map.set(widget.widget_type, widget);
    }
    return map;
  }, [widgets]);

  const selectedDef = widgetDefs.find((def) => def.type === selectedType);
  const selectedWidget = selectedType ? widgetsByType.get(selectedType) : null;
  const ConfigPanel = selectedDef?.configPanel;

  const previewWidgets = useMemo(() => {
    const navbar = widgets.find((widget) => widget.widget_type === "navbar");
    return widgets
      .map((widget) => {
        const config = widget.config || {};
        return {
          ...widget,
          config:
            buildSyncedConfig(widget.widget_type, config, navbar?.config) ||
            config,
        };
      })
      .sort(compareWidgetLayer);
  }, [widgets]);

  const handleAddWidget = useCallback(
    async (def) => {
      const created = await addWidget(def.type, def.defaults || {});
      setSelectedType(created?.widget_type || def.type);
    },
    [addWidget],
  );

  const handleToggleWidget = useCallback(
    (widget) => {
      saveWidget({ ...widget, is_visible: widget.is_visible === false });
    },
    [saveWidget],
  );

  const handleStyleChange = useCallback(
    (styleId) => {
      if (!selectedWidget || !selectedDef) return;
      saveWidget(buildStyleUpdate(selectedWidget, selectedDef, styleId));
    },
    [saveWidget, selectedDef, selectedWidget],
  );

  if (loading) return <LoadingSpinner text="Loading editor..." fullPage />;

  if (error) {
    return (
      <main className="widget-editor-page widget-editor-page--error">
        <section className="editor-empty-state">
          <h1>Editor unavailable</h1>
          <p>{error.message || "Overlay data could not be loaded."}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="widget-editor-page">
      <aside className="editor-sidebar">
        <header className="editor-sidebar__header">
          <span className="editor-eyebrow">Overlay</span>
          <h1>Editor</h1>
        </header>
        <div className="editor-widget-list">
          {widgetDefs.map((def) => (
            <WidgetListItem
              key={def.type}
              def={def}
              widget={widgetsByType.get(def.type)}
              selected={def.type === selectedType}
              onSelect={setSelectedType}
              onAdd={handleAddWidget}
              onToggle={handleToggleWidget}
            />
          ))}
        </div>
      </aside>

      <section className="editor-stage">
        <div className="editor-stage__toolbar">
          <div>
            <span className="editor-eyebrow">Live canvas</span>
            <h2>{selectedDef?.label || "Select a widget"}</h2>
          </div>
          {selectedWidget && (
            <button
              type="button"
              className="editor-action-button"
              onClick={() => handleToggleWidget(selectedWidget)}
            >
              {selectedWidget.is_visible === false ? <Eye size={15} /> : <EyeOff size={15} />}
              <span>{selectedWidget.is_visible === false ? "Show" : "Hide"}</span>
            </button>
          )}
        </div>
        <div className="editor-canvas-shell">
          <div className="editor-canvas">
            {previewWidgets.map((widget) => (
              <EditorPreviewSlot
                key={widget.id}
                widget={widget}
                allWidgets={previewWidgets}
                selected={widget.widget_type === selectedType}
                onSelect={setSelectedType}
                theme={theme}
                userId={user?.id}
              />
            ))}
          </div>
        </div>
      </section>

      <aside className="editor-settings-panel">
        <header className="editor-settings-panel__header">
          <span className="editor-eyebrow">Settings</span>
          <h2>{selectedDef?.label || "No widget selected"}</h2>
        </header>

        {!selectedDef && (
          <section className="editor-empty-state">
            <SlidersHorizontal size={22} />
            <h3>Select a widget</h3>
          </section>
        )}

        {selectedDef && !selectedWidget && (
          <section className="editor-empty-state">
            <h3>Add {selectedDef.label || selectedDef.type}</h3>
            <button
              type="button"
              className="editor-primary-button"
              onClick={() => handleAddWidget(selectedDef)}
            >
              <Plus size={16} />
              <span>Add widget</span>
            </button>
          </section>
        )}

        {selectedDef && selectedWidget && (
          <div className="editor-settings-scroll">
            <StyleSelector
              def={selectedDef}
              widget={selectedWidget}
              onChange={handleStyleChange}
            />
            <GeometryControls widget={selectedWidget} onChange={saveWidget} />
            <section className="editor-widget-config-panel">
              {ConfigPanel ? (
                <ConfigPanel
                  config={selectedWidget.config || {}}
                  onChange={(nextConfig) =>
                    saveWidget({ ...selectedWidget, config: nextConfig })
                  }
                  allWidgets={widgets}
                  mode="sidebar"
                  widget={selectedWidget}
                  userId={user?.id}
                />
              ) : (
                <div className="editor-empty-state">
                  <h3>No settings panel</h3>
                </div>
              )}
            </section>
          </div>
        )}
      </aside>
    </main>
  );
}
