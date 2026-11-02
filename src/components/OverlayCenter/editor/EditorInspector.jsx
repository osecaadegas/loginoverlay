import React, { useMemo, useRef, useState } from "react";
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  ExternalLink,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { BETTER_CANVAS, BETTER_WIDGET_REGISTRY } from "./betterWidgetRegistry";
import { BetterWidgetControls } from "./BetterWidgetPackages";
import { EditorControlContext } from "./EditorControlScope";

const ALIGNMENTS = [
  ["left", "Align left", AlignStartVertical],
  ["center", "Center horizontally", AlignCenterVertical],
  ["right", "Align right", AlignEndVertical],
  ["top", "Align top", AlignStartHorizontal],
  ["middle", "Center vertically", AlignCenterHorizontal],
  ["bottom", "Align bottom", AlignEndHorizontal],
];

function FrameInput({ label, value, onCommit }) {
  const [draft, setDraft] = useState(null);
  const cancelled = useRef(false);
  return (
    <label>
      {label}
      <input
        aria-label={`Frame ${label}`}
        type="number"
        step="1"
        value={draft ?? Math.round(value)}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={(event) => {
          const next = event.target.valueAsNumber;
          if (!cancelled.current && Number.isFinite(next) && next !== value)
            onCommit(next);
          cancelled.current = false;
          setDraft(null);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== "Escape") return;
          event.preventDefault();
          cancelled.current = event.key === "Escape";
          event.currentTarget.blur();
        }}
      />
    </label>
  );
}

export default function EditorInspector({
  instance,
  preferences,
  onPreferences,
  onUpdate,
  onConfigChange,
  onWidgetChange,
  onNavigateSource,
  widget,
  allWidgets,
  user,
  isAdmin = false,
  dataMode,
}) {
  const [search, setSearch] = useState("");
  const definition = BETTER_WIDGET_REGISTRY[instance.widgetType];
  const meta = definition.editor;
  const mode = preferences.mode === "advanced" ? "advanced" : "simple";
  const scope = useMemo(
    () => ({
      mode,
      search,
      simpleSections: meta.simpleSections,
      tab: preferences.tab,
      sections: mode === "simple" ? preferences.quickSections : preferences.sections,
      onTab: (tab) => onPreferences({ tab }),
      onSection: (title, open) => onPreferences(mode === "simple"
        ? { quickSections: { [title]: open } }
        : { sections: { ...preferences.sections, [title]: open } }),
    }),
    [mode, search, meta, preferences, onPreferences],
  );
  const locked = instance.locked || instance.widgetType === "background";
  const align = (direction) => {
    const values = {
      left: { x: 0 },
      center: { x: (BETTER_CANVAS.width - instance.width) / 2 },
      right: { x: BETTER_CANVAS.width - instance.width },
      top: { y: 0 },
      middle: { y: (BETTER_CANVAS.height - instance.height) / 2 },
      bottom: { y: BETTER_CANVAS.height - instance.height },
    };
    onUpdate(values[direction]);
  };
  const supportsFit = ["bonus_hunt", "chat", "giveaway"].includes(
    instance.widgetType,
  );
  const selectMode = nextMode => {
    setSearch("");
    onPreferences({ mode: nextMode });
  };
  return (
    <div className="editor-inspector" data-mode={mode}>
      <div className="editor-inspector-tools">
        <div className="editor-inspector-intro">
          <span className="editor-inspector-eyebrow">Widget controls · {meta.category}</span>
          <p>{mode === "simple" ? "Start with the look, then open only the settings you need." : "Choose a category to customize this widget in detail."}</p>
        </div>
        <div
          className="editor-inspector-mode-switch"
          role="group"
          aria-label="Control detail"
        >
          <button
            type="button"
            aria-pressed={mode === "simple"}
            onClick={() => selectMode("simple")}
          >
            <Sparkles size={18} aria-hidden="true" />
            <span><strong>Quick edit</strong><small>Look and essentials</small></span>
          </button>
          <button
            type="button"
            aria-pressed={mode === "advanced"}
            onClick={() => selectMode("advanced")}
          >
            <SlidersHorizontal size={18} aria-hidden="true" />
            <span><strong>Fine tune</strong><small>Every supported detail</small></span>
          </button>
        </div>
        {mode === "advanced" && <label className="editor-search">
          <Search size={15} />
          <input
            type="search"
            aria-label="Search settings"
            placeholder="Search settings"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {search && (
            <button
              type="button"
              title="Clear search"
              aria-label="Clear settings search"
              onClick={() => setSearch("")}
            >
              <X size={14} />
            </button>
          )}
        </label>}
      </div>
      {meta.route && (
        <div className="editor-source-status">
          <span>
            {dataMode === "mock" ? "Sample data" : `${meta.source} source`}
            {dataMode === "live" &&
            instance.widgetType === "bonus_hunt" &&
            widget?.config?.showSlotRequests === false
              ? " / Requests disabled at source"
              : ""}
          </span>
          <Link
            to={meta.route}
            title={`Open ${meta.source} settings`}
            onClick={(event) => {
              event.preventDefault();
              onNavigateSource(meta.route);
            }}
          >
            <ExternalLink size={14} />
            <span>Settings</span>
          </Link>
        </div>
      )}
      {!search && instance.widgetType !== "background" && (
        <details
          className="editor-geometry"
          open={preferences.geometryOpen === true}
          onToggle={(event) => {
            if (
              event.currentTarget.open !==
              (preferences.geometryOpen === true)
            )
              onPreferences({ geometryOpen: event.currentTarget.open });
          }}
        >
          <summary><span>Size &amp; position</span><small>Move, resize and align the widget</small></summary>
          <fieldset disabled={locked}>
            <div className="editor-geometry-grid">
              {[
                ["x", "X"],
                ["y", "Y"],
                ["width", "Width"],
                ["height", "Height"],
              ].map(([key, label]) => (
                <FrameInput
                  key={key}
                  label={label}
                  value={instance[key]}
                  onCommit={(value) => onUpdate({ [key]: value })}
                />
              ))}
            </div>
            <div
              className="editor-align-tools"
              role="group"
              aria-label="Align to canvas"
            >
              {ALIGNMENTS.map(([key, title, Icon]) => (
                <button
                  key={key}
                  type="button"
                  title={title}
                  aria-label={title}
                  onClick={() => align(key)}
                >
                  <Icon size={16} />
                </button>
              ))}
            </div>
            {supportsFit && (
              <label className="editor-check">
                <input
                  type="checkbox"
                  checked={instance.config.fitContentToFrame === true}
                  onChange={(event) =>
                    onUpdate({
                      config: {
                        ...instance.config,
                        fitContentToFrame: event.target.checked,
                      },
                    })
                  }
                />
                Fit content to frame
              </label>
            )}
          </fieldset>
        </details>
      )}
      <EditorControlContext.Provider value={scope}>
        <div className="editor-inspector-section-label">{mode === "simple" ? "Quick settings" : "Detailed settings"}</div>
        <div
          className="editor-scoped-controls"
          data-searching={Boolean(search)}
        >
          <BetterWidgetControls
            type={instance.widgetType}
            config={instance.config}
            onChange={onConfigChange}
            onWidgetChange={onWidgetChange}
            widget={widget}
            allWidgets={allWidgets}
            user={user}
            userId={user?.id}
            isAdmin={isAdmin}
          />
          <p className="editor-no-settings">No matching settings</p>
        </div>
      </EditorControlContext.Provider>
      {mode === "simple" && <div className="editor-inspector-deeper">
        <strong>Want to adjust individual parts?</strong>
        <p>Fine tune gives you element controls, layout options and searchable settings.</p>
        <button type="button" onClick={() => selectMode("advanced")}>Open Fine tune <SlidersHorizontal size={15} aria-hidden="true" /></button>
      </div>}
    </div>
  );
}
