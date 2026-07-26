import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Plus, SlidersHorizontal } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useOverlay } from "../../../hooks/useOverlay";
import LoadingSpinner from "../../LoadingSpinner/LoadingSpinner";
import { getWidgetDef } from "../widgets/widgetRegistry";
import "../widgets/builtinWidgets";
import "./WidgetEditorPage.css";
import {
  BETTER_WIDGETS,
  BetterWidgetControls,
  BetterWidgetPreview,
  buildBetterWidgetUpdate,
  ensureBetterWidgetConfig,
  getBetterWidgetMeta,
} from "./BetterWidgetPackages";

function toWidgetLabel(type) {
  return String(type || "")
    .split("_")
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function getWidgetStyleId(widget, meta) {
  if (!widget || !meta) return "";
  return widget.config?.[meta.styleKey] || "";
}

function isBetterConfigured(widget, meta) {
  if (!widget || !meta) return false;
  if (getWidgetStyleId(widget, meta) !== meta.styleId) return false;
  if (
    meta.type === "navbar" &&
    (widget.config?.betterNavbarFeaturesInitialized !== true ||
      widget.config?.betterNavbarSpotifyOnlyInitialized !== true)
  ) {
    return false;
  }
  return true;
}

function WidgetListItem({ meta, widget, selected, onSelect, onAdd, onToggle }) {
  const visible = widget?.is_visible !== false;
  const activeStyle = isBetterConfigured(widget, meta);

  return (
    <div
      className={`editor-widget-row${selected ? " editor-widget-row--active" : ""}`}
    >
      <button
        type="button"
        className="editor-widget-row__main"
        onClick={() => onSelect(meta.type)}
      >
        <span className="editor-widget-row__icon" aria-hidden="true">
          {meta.icon}
        </span>
        <span className="editor-widget-row__copy">
          <strong>{meta.label}</strong>
          <small>
            {widget
              ? activeStyle
                ? visible
                  ? "Better widget"
                  : "Hidden"
                : "Needs Better style"
              : "Not added"}
          </small>
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
          onClick={() => onAdd(meta)}
          aria-label={`Add ${meta.label}`}
          title={`Add ${meta.label}`}
        >
          <Plus size={15} />
        </button>
      )}
    </div>
  );
}

export default function WidgetEditorPage() {
  const { user } = useAuth();
  const { widgets, loading, error, addWidget, saveWidget } = useOverlay();
  const [selectedType, setSelectedType] = useState(BETTER_WIDGETS[0]?.type || "");

  const betterDefs = useMemo(
    () =>
      BETTER_WIDGETS.map((meta) => ({
        ...meta,
        registryDef: getWidgetDef(meta.type),
      })),
    [],
  );

  const widgetsByType = useMemo(() => {
    const map = new Map();
    for (const widget of widgets) {
      if (!map.has(widget.widget_type)) map.set(widget.widget_type, widget);
    }
    return map;
  }, [widgets]);

  useEffect(() => {
    if (selectedType) return;
    const firstAdded = betterDefs.find((meta) => widgetsByType.has(meta.type));
    setSelectedType(firstAdded?.type || betterDefs[0]?.type || "");
  }, [betterDefs, selectedType, widgetsByType]);

  const selectedMeta = getBetterWidgetMeta(selectedType);
  const selectedDef = betterDefs.find((meta) => meta.type === selectedType);
  const selectedWidget = selectedType ? widgetsByType.get(selectedType) : null;
  const selectedRawConfig =
    selectedWidget?.config || selectedDef?.registryDef?.defaults || {};
  const selectedConfig = ensureBetterWidgetConfig(
    selectedType,
    selectedType === "chat" && selectedWidget
      ? {
          ...selectedRawConfig,
          width: selectedRawConfig.width ?? selectedWidget.width,
          height: selectedRawConfig.height ?? selectedWidget.height,
        }
      : selectedRawConfig,
  );

  useEffect(() => {
    if (!selectedWidget || !selectedMeta) return;
    if (isBetterConfigured(selectedWidget, selectedMeta)) return;
    saveWidget(buildBetterWidgetUpdate(selectedWidget));
  }, [saveWidget, selectedMeta, selectedWidget]);

  const handleAddWidget = useCallback(
    async (meta) => {
      const registryDef = getWidgetDef(meta.type);
      const created = await addWidget(
        meta.type,
        ensureBetterWidgetConfig(meta.type, registryDef?.defaults || {}),
      );
      if (created) {
        saveWidget(
          buildBetterWidgetUpdate({
            ...created,
            width: meta.defaultSize.width,
            height: meta.defaultSize.height,
          }),
        );
      }
      setSelectedType(created?.widget_type || meta.type);
    },
    [addWidget, saveWidget],
  );

  const handleToggleWidget = useCallback(
    (widget) => {
      saveWidget({ ...widget, is_visible: widget.is_visible === false });
    },
    [saveWidget],
  );

  const handleConfigChange = useCallback(
    (nextConfig) => {
      if (!selectedWidget || !selectedMeta) return;
      saveWidget({
        ...selectedWidget,
        config: ensureBetterWidgetConfig(selectedMeta.type, nextConfig),
      });
    },
    [saveWidget, selectedMeta, selectedWidget],
  );

  const handleWidgetChange = useCallback(
    (patch = {}) => {
      if (!selectedWidget || !selectedMeta) return;
      const { config: patchConfig, ...widgetPatch } = patch;
      saveWidget({
        ...selectedWidget,
        ...widgetPatch,
        config: ensureBetterWidgetConfig(
          selectedMeta.type,
          patchConfig || selectedWidget.config || {},
        ),
      });
    },
    [saveWidget, selectedMeta, selectedWidget],
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
    <main className="widget-editor-page widget-editor-page--better">
      <aside className="editor-sidebar">
        <header className="editor-sidebar__header">
          <span className="editor-eyebrow">Overlay</span>
          <h1>Better Editor</h1>
        </header>
        <div className="editor-widget-list">
          {betterDefs.map((meta) => (
            <WidgetListItem
              key={meta.type}
              meta={meta}
              widget={widgetsByType.get(meta.type)}
              selected={meta.type === selectedType}
              onSelect={setSelectedType}
              onAdd={handleAddWidget}
              onToggle={handleToggleWidget}
            />
          ))}
        </div>
      </aside>

      <section className="editor-stage editor-stage--package">
        <div className="editor-stage__toolbar">
          <div>
            <span className="editor-eyebrow">Package preview</span>
            <h2>{selectedMeta?.label || toWidgetLabel(selectedType)}</h2>
          </div>
          {selectedWidget && (
            <button
              type="button"
              className="editor-action-button"
              onClick={() => handleToggleWidget(selectedWidget)}
            >
              {selectedWidget.is_visible === false ? (
                <Eye size={15} />
              ) : (
                <EyeOff size={15} />
              )}
              <span>
                {selectedWidget.is_visible === false ? "Show" : "Hide"}
              </span>
            </button>
          )}
        </div>

        <div className="editor-package-preview-shell">
          {selectedMeta ? (
            <BetterWidgetPreview
              type={selectedMeta.type}
              config={selectedConfig}
              allWidgets={widgets}
              userId={user?.id}
              widget={selectedWidget}
            />
          ) : (
            <section className="editor-empty-state">
              <SlidersHorizontal size={22} />
              <h3>Select a Better widget</h3>
            </section>
          )}
        </div>
      </section>

      <aside className="editor-settings-panel editor-settings-panel--package">
        <header className="editor-settings-panel__header">
          <span className="editor-eyebrow">Folder controls</span>
          <h2>{selectedMeta?.label || "No widget selected"}</h2>
        </header>

        {!selectedMeta && (
          <section className="editor-empty-state">
            <SlidersHorizontal size={22} />
            <h3>Select a widget</h3>
          </section>
        )}

        {selectedMeta && !selectedWidget && (
          <section className="editor-empty-state">
            <h3>Add {selectedMeta.label}</h3>
            <p>The package controls save to the real overlay widget after it exists.</p>
            <button
              type="button"
              className="editor-primary-button"
              onClick={() => handleAddWidget(selectedMeta)}
            >
              <Plus size={16} />
              <span>Add widget</span>
            </button>
          </section>
        )}

        {selectedMeta && selectedWidget && (
          <div className="editor-settings-scroll editor-settings-scroll--package">
            <BetterWidgetControls
              type={selectedMeta.type}
              config={selectedConfig}
              onChange={handleConfigChange}
              onWidgetChange={handleWidgetChange}
              allWidgets={widgets}
              userId={user?.id}
              user={user}
              widget={selectedWidget}
            />
          </div>
        )}
      </aside>
    </main>
  );
}
