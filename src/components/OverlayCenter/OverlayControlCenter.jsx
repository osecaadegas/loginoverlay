import React, { useCallback, useMemo } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Database,
  Eye,
  EyeOff,
  MonitorPlay,
  Plus,
  RefreshCw,
  Settings,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useOverlay } from "../../hooks/useOverlay";
import LoadingSpinner from "../LoadingSpinner/LoadingSpinner";
import ProfileSection from "./ProfileSection";
import { getWidgetDef } from "./widgets/widgetRegistry";
import "./OverlayCenter.css";
import "./widgets/builtinWidgets";

const SUPPORTED_WIDGET_TYPES = Object.freeze([
  "bonus_hunt",
  "giveaway",
  "navbar",
  "chat",
  "rtp_stats",
  "background",
  "bets",
]);

const REMOVED_ROUTES = new Set([
  "/overlay-center/appearance",
  "/overlay-center/preview",
  "/overlay-center/presets",
  "/overlay-center/setup",
  "/overlay-center/tutorial",
  "/overlay-center/slots",
  "/overlay-center/approvals",
  "/overlay-center/layout",
  "/overlay-center/widgets",
]);

const DETAIL_COPY = Object.freeze({
  bonus_hunt: "Slots, opening state, requests, and hunt history.",
  giveaway: "Keyword, participants, active state, and winner data.",
  navbar: "Streamer identity, Spotify, socials, casino, and status data.",
  chat: "Twitch, Kick, YouTube, empty state, and message behavior.",
  rtp_stats: "Current slot and personal best data.",
  background: "Background source values consumed by the Better canvas.",
  bets: "Bet brackets, chat command, StreamElements points, and history.",
});

function toSlug(type) {
  return String(type || "").replaceAll("_", "-");
}

function fromSlug(slug) {
  return String(slug || "").replaceAll("-", "_");
}

function getDefaultConfig(definition) {
  const style = definition?.styles?.[0]?.id;
  const styleKey = definition?.styleConfigKey || "displayStyle";
  return {
    ...(definition?.defaults || {}),
    ...(style ? { [styleKey]: style } : null),
  };
}

function getConfiguredWidget(widgets, type) {
  return widgets.find((widget) => widget.widget_type === type) || null;
}

function WidgetSourceCard({ type, widget, onAdd, onToggle, onRemove }) {
  const def = getWidgetDef(type);
  const IconState = widget?.is_visible === false ? EyeOff : Eye;
  const active = Boolean(widget);

  return (
    <article className={`oc2-tool-card${active ? " is-ready" : ""}`}>
      <div className="oc2-tool-card__icon" aria-hidden="true">
        {def?.icon || "W"}
      </div>
      <div className="oc2-tool-card__body">
        <span className="oc2-tool-card__eyebrow">Better data source</span>
        <h3>{def?.label || type}</h3>
        <p>{DETAIL_COPY[type] || def?.description || "Live widget data."}</p>
        <span className={`oc2-tool-card__status${active ? " is-on" : ""}`}>
          {active ? (widget.is_visible === false ? "Hidden" : "Configured") : "Not added"}
        </span>
      </div>
      <div className="oc2-tool-card__actions">
        {active ? (
          <>
            <Link className="oc2-icon-button" to={`/overlay-center/widgets/${toSlug(type)}`} title="Open settings">
              <Settings size={16} />
            </Link>
            <button className="oc2-icon-button" type="button" onClick={() => onToggle(widget)} title={widget.is_visible === false ? "Show source" : "Hide source"}>
              <IconState size={16} />
            </button>
            <button className="oc2-icon-button oc2-icon-button--danger" type="button" onClick={() => onRemove(widget)} title="Remove source">
              <Trash2 size={16} />
            </button>
          </>
        ) : (
          <button className="oc2-btn oc2-btn--primary" type="button" onClick={() => onAdd(type)}>
            <Plus size={16} />
            Add
          </button>
        )}
      </div>
    </article>
  );
}

function DataSourceHome({ widgets, onAdd, onToggle, onRemove, onReload }) {
  return (
    <>
      <section className="oc2-hero">
        <div>
          <span className="oc2-eyebrow">Live data sources</span>
          <h1>Better Overlay Data</h1>
          <p>
            Configure the live rows used by the Better Editor widgets. Layout, OBS links, and
            visual controls now live only in the main editor.
          </p>
        </div>
        <div className="oc2-hero__actions">
          <Link className="oc2-btn oc2-btn--primary" to="/editor">
            <SlidersHorizontal size={16} />
            Open Editor
          </Link>
          <button className="oc2-btn" type="button" onClick={onReload}>
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </section>

      <section className="oc2-section">
        <div className="oc2-section__head">
          <div>
            <span className="oc2-eyebrow">Widgets kept</span>
            <h2>Seven Better Sources</h2>
          </div>
          <Link className="oc2-btn" to="/overlay-center/integrations">
            <Database size={16} />
            Integrations
          </Link>
        </div>
        <div className="oc2-tool-grid">
          {SUPPORTED_WIDGET_TYPES.map((type) => (
            <WidgetSourceCard
              key={type}
              type={type}
              widget={getConfiguredWidget(widgets, type)}
              onAdd={onAdd}
              onToggle={onToggle}
              onRemove={onRemove}
            />
          ))}
        </div>
      </section>
    </>
  );
}

function WidgetDetail({ type, widgets, addWidget, saveWidget, removeWidget }) {
  const navigate = useNavigate();
  const def = getWidgetDef(type);
  const widget = getConfiguredWidget(widgets, type);
  const ConfigPanel = def?.configPanel;

  const addSource = useCallback(async () => {
    if (!def) return;
    await addWidget(type, getDefaultConfig(def));
  }, [addWidget, def, type]);

  const updateConfig = useCallback(
    (nextConfig) => {
      if (!widget) return;
      saveWidget({
        ...widget,
        config:
          typeof nextConfig === "function"
            ? nextConfig(widget.config || {})
            : nextConfig || {},
      });
    },
    [saveWidget, widget],
  );

  if (!def || !SUPPORTED_WIDGET_TYPES.includes(type)) {
    return <Navigate to="/overlay-center" replace />;
  }

  return (
    <section className={`oc2-detail oc2-detail--${toSlug(type)}`}>
      <div className="oc2-detail__header">
        <button className="oc2-back-link" type="button" onClick={() => navigate("/overlay-center")}>
          <ArrowLeft size={16} />
          Back to data sources
        </button>
        <Link className="oc2-btn oc2-btn--primary" to="/editor">
          <MonitorPlay size={16} />
          Open Editor
        </Link>
      </div>

      <div className="oc2-detail__title">
        <span className="oc2-tool-card__icon" aria-hidden="true">
          {def.icon}
        </span>
        <div>
          <span className="oc2-eyebrow">Widget data source</span>
          <h1>{def.label}</h1>
          <p>{DETAIL_COPY[type] || def.description}</p>
        </div>
      </div>

      {!widget ? (
        <div className="oc2-empty-panel">
          <h2>This source is not configured yet.</h2>
          <p>Add it here so the matching Better Editor widget can fetch live data.</p>
          <button className="oc2-btn oc2-btn--primary" type="button" onClick={addSource}>
            <Plus size={16} />
            Add {def.label}
          </button>
        </div>
      ) : (
        <div className="oc2-config-shell">
          <div className="oc2-config-shell__toolbar">
            <span>{widget.is_visible === false ? "Hidden" : "Visible"} live source</span>
            <div>
              <button
                className="oc2-btn"
                type="button"
                onClick={() => saveWidget({ ...widget, is_visible: widget.is_visible === false })}
              >
                {widget.is_visible === false ? <Eye size={16} /> : <EyeOff size={16} />}
                {widget.is_visible === false ? "Show" : "Hide"}
              </button>
              <button
                className="oc2-btn oc2-btn--danger"
                type="button"
                onClick={async () => {
                  await removeWidget(widget.id);
                  navigate("/overlay-center");
                }}
              >
                <Trash2 size={16} />
                Remove
              </button>
            </div>
          </div>
          {ConfigPanel ? (
            <ConfigPanel
              config={widget.config || {}}
              onChange={updateConfig}
              allWidgets={widgets}
              mode={type === "bonus_hunt" ? "full" : undefined}
            />
          ) : (
            <p className="oc2-muted">No settings panel is registered for this data source.</p>
          )}
        </div>
      )}
    </section>
  );
}

function IntegrationsPanel({ widgets, saveWidget }) {
  return (
    <section className="oc2-detail">
      <div className="oc2-detail__header">
        <Link className="oc2-back-link" to="/overlay-center">
          <ArrowLeft size={16} />
          Back to data sources
        </Link>
        <Link className="oc2-btn oc2-btn--primary" to="/editor">
          <SlidersHorizontal size={16} />
          Open Editor
        </Link>
      </div>
      <div className="oc2-detail__title">
        <span className="oc2-tool-card__icon" aria-hidden="true">
          <Database size={18} />
        </span>
        <div>
          <span className="oc2-eyebrow">Connections</span>
          <h1>Live Widget Integrations</h1>
          <p>Connect accounts and sync shared streamer identity into Better widget data sources.</p>
        </div>
      </div>
      <ProfileSection widgets={widgets} saveWidget={saveWidget} />
    </section>
  );
}

export default function OverlayControlCenter() {
  const location = useLocation();
  const { user } = useAuth();
  const {
    widgets,
    loading,
    error,
    addWidget,
    saveWidget,
    removeWidget,
    reload,
  } = useOverlay();

  const path = location.pathname;
  const widgetType = useMemo(() => {
    if (!path.startsWith("/overlay-center/widgets/")) return null;
    return fromSlug(path.slice("/overlay-center/widgets/".length));
  }, [path]);

  const addSource = useCallback(
    async (type) => {
      const def = getWidgetDef(type);
      if (!def) return;
      await addWidget(type, getDefaultConfig(def));
    },
    [addWidget],
  );

  const toggleSource = useCallback(
    (widget) => {
      saveWidget({ ...widget, is_visible: widget.is_visible === false });
    },
    [saveWidget],
  );

  if (!user) {
    return (
      <main className="oc2-shell">
        <div className="oc2-empty-panel">
          <h1>Sign in required</h1>
          <p>Sign in to configure Better widget data sources.</p>
        </div>
      </main>
    );
  }

  if (REMOVED_ROUTES.has(path)) {
    return <Navigate to={path === "/overlay-center/appearance" ? "/editor" : "/overlay-center"} replace />;
  }

  if (loading) return <LoadingSpinner text="Loading widget data sources..." fullPage />;

  if (error) {
    return (
      <main className="oc2-shell">
        <div className="oc2-empty-panel">
          <h1>Widget data could not load</h1>
          <p>{error.message || "Check your connection and try again."}</p>
          <button className="oc2-btn oc2-btn--primary" type="button" onClick={reload}>
            <RefreshCw size={16} />
            Try again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="oc2-shell oc2-shell--data">
      {path === "/overlay-center/integrations" ? (
        <IntegrationsPanel widgets={widgets} saveWidget={saveWidget} />
      ) : widgetType ? (
        <WidgetDetail
          type={widgetType}
          widgets={widgets}
          addWidget={addWidget}
          saveWidget={saveWidget}
          removeWidget={removeWidget}
        />
      ) : (
        <DataSourceHome
          widgets={widgets}
          onAdd={addSource}
          onToggle={toggleSource}
          onRemove={(widget) => removeWidget(widget.id)}
          onReload={reload}
        />
      )}
    </main>
  );
}
