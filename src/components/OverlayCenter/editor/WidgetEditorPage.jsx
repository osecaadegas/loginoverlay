import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Copy,
  Eye,
  EyeOff,
  Grid3X3,
  Lock,
  MousePointer2,
  Plus,
  Redo2,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  SlidersHorizontal,
  Undo2,
  Unlock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import LoadingSpinner from "../../LoadingSpinner/LoadingSpinner";
import {
  getBetterEditorLiveSource,
  getOrCreateBetterEditorOverlay,
  publishBetterOverlay,
  regenerateBetterPublicOverlayId,
  resetBetterDraftLayout,
  revertBetterDraftToPublished,
  saveBetterDraft,
  subscribeToBetterLiveSource,
  unsubscribeBetterLiveSource,
} from "../../../services/betterOverlayService";
import {
  BETTER_CANVAS,
  BETTER_WIDGET_REGISTRY,
  createDefaultBetterLayout,
  duplicateBetterInstance,
  normalizeBetterLayout,
  renderBetterWidgetInstance,
  validateBetterWidgetConfig,
  betterInstanceToLegacyWidget,
} from "./betterWidgetRegistry";
import { BetterWidgetControls } from "./BetterWidgetPackages";
import "./BetterWidgetPackages.css";
import "./WidgetEditorPage.css";

const SNAP_TOLERANCE = 10;
const SNAP_GRID = 20;
const HISTORY_LIMIT = 80;
const AUTOSAVE_MS = 800;
const LIVE_SOURCE_FALLBACK_MS = 30000;

const RESIZE_HANDLES = [
  "nw",
  "n",
  "ne",
  "e",
  "se",
  "s",
  "sw",
  "w",
];

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(number, min), max);
}

function roundNumber(value) {
  return Math.round(Number(value) || 0);
}

function getEditorInstanceBorderRadius(instance) {
  if (instance?.widgetType !== "rtp_stats") return undefined;
  return clampNumber(instance.config?.radius ?? instance.config?.borderRadius, 0, 120, 14);
}

function getMaxZ(layout) {
  return Math.max(
    1,
    ...layout.instances
      .filter((instance) => instance.widgetType !== "background")
      .map((instance) => Number(instance.zIndex) || 1),
  );
}

function clampGeometry(geometry, constraints = {}) {
  const minWidth = constraints.minWidth || 80;
  const minHeight = constraints.minHeight || 80;
  const maxWidth = constraints.maxWidth || BETTER_CANVAS.width;
  const maxHeight = constraints.maxHeight || BETTER_CANVAS.height;
  const width = clampNumber(geometry.width, minWidth, maxWidth, minWidth);
  const height = clampNumber(geometry.height, minHeight, maxHeight, minHeight);
  return {
    x: clampNumber(geometry.x, 0, BETTER_CANVAS.width - width, 0),
    y: clampNumber(geometry.y, 0, BETTER_CANVAS.height - height, 0),
    width,
    height,
  };
}

function snapValue(value, candidates) {
  let snapped = value;
  let bestDistance = SNAP_TOLERANCE + 1;
  for (const candidate of candidates) {
    const distance = Math.abs(value - candidate);
    if (distance <= SNAP_TOLERANCE && distance < bestDistance) {
      snapped = candidate;
      bestDistance = distance;
    }
  }
  return snapped;
}

function buildSnapCandidates(layout, instanceId, geometry) {
  const xCandidates = [
    0,
    BETTER_CANVAS.width / 2 - geometry.width / 2,
    BETTER_CANVAS.width - geometry.width,
    Math.round(geometry.x / SNAP_GRID) * SNAP_GRID,
  ];
  const yCandidates = [
    0,
    BETTER_CANVAS.height / 2 - geometry.height / 2,
    BETTER_CANVAS.height - geometry.height,
    Math.round(geometry.y / SNAP_GRID) * SNAP_GRID,
  ];

  layout.instances.forEach((instance) => {
    if (instance.instanceId === instanceId || instance.visible === false) return;
    const left = Number(instance.x) || 0;
    const top = Number(instance.y) || 0;
    const right = left + (Number(instance.width) || 0);
    const bottom = top + (Number(instance.height) || 0);
    const centerX = left + (Number(instance.width) || 0) / 2;
    const centerY = top + (Number(instance.height) || 0) / 2;
    xCandidates.push(left, right, left - geometry.width, right - geometry.width, centerX - geometry.width / 2);
    yCandidates.push(top, bottom, top - geometry.height, bottom - geometry.height, centerY - geometry.height / 2);
  });

  return { xCandidates, yCandidates };
}

function snapGeometry(layout, instanceId, geometry) {
  const { xCandidates, yCandidates } = buildSnapCandidates(layout, instanceId, geometry);
  const snapped = {
    ...geometry,
    x: snapValue(geometry.x, xCandidates),
    y: snapValue(geometry.y, yCandidates),
  };
  return clampGeometry(snapped, BETTER_WIDGET_REGISTRY[layout.instances.find((item) => item.instanceId === instanceId)?.widgetType]?.constraints);
}

function applyResize(start, handle, dx, dy) {
  const next = { ...start };
  if (handle.includes("e")) next.width = start.width + dx;
  if (handle.includes("s")) next.height = start.height + dy;
  if (handle.includes("w")) {
    next.x = start.x + dx;
    next.width = start.width - dx;
  }
  if (handle.includes("n")) {
    next.y = start.y + dy;
    next.height = start.height - dy;
  }
  return next;
}

function getInitials(label) {
  return String(label || "BW")
    .split(/\s+/)
    .map((part) => part.slice(0, 1))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function useCanvasScale(shellRef, zoom) {
  const [fitScale, setFitScale] = useState(0.5);

  useLayoutEffect(() => {
    const shell = shellRef.current;
    if (!shell) return undefined;

    const measure = () => {
      const rect = shell.getBoundingClientRect();
      const availableWidth = Math.max(320, rect.width - 56);
      const availableHeight = Math.max(240, rect.height - 56);
      setFitScale(
        Math.min(
          availableWidth / BETTER_CANVAS.width,
          availableHeight / BETTER_CANVAS.height,
          1,
        ),
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(shell);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [shellRef]);

  return fitScale * zoom;
}

class BetterEditorWidgetBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(prevProps) {
    if (prevProps.instanceId !== this.props.instanceId && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="better-editor-widget-error">
          <strong>Widget failed</strong>
          <span>{this.state.error.message || "Render error"}</span>
        </div>
      );
    }
    return this.props.children;
  }
}

function IconButton({ children, label, active = false, disabled = false, onClick }) {
  return (
    <button
      type="button"
      className={`better-editor-icon-button${active ? " is-active" : ""}`}
      disabled={disabled}
      title={label}
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function WidgetListItem({
  instance,
  selected,
  obsUrl,
  onSelect,
  onCopyUrl,
  onToggleVisible,
  onToggleLock,
  onDuplicate,
}) {
  const definition = BETTER_WIDGET_REGISTRY[instance.widgetType];
  return (
    <article
      className={`better-editor-widget-row${selected ? " is-selected" : ""}${instance.visible === false ? " is-hidden" : ""}`}
    >
      <button
        type="button"
        className="better-editor-widget-row__main"
        onClick={() => onSelect(instance.instanceId)}
      >
        <span className="better-editor-widget-row__icon">
          {definition?.icon || getInitials(instance.label)}
        </span>
        <span>
          <strong>{instance.label || definition?.label}</strong>
          <small>
            {instance.visible === false
              ? "Hidden"
              : instance.locked
                ? "Locked"
                : `${roundNumber(instance.width)} x ${roundNumber(instance.height)}`}
          </small>
        </span>
      </button>
      <div className="better-editor-widget-row__tools">
        <IconButton
          label="Copy widget OBS URL"
          disabled={!obsUrl}
          onClick={() => onCopyUrl(obsUrl)}
        >
          <Copy size={14} />
        </IconButton>
        <IconButton
          label={instance.visible === false ? "Show widget" : "Hide widget"}
          onClick={() => onToggleVisible(instance.instanceId)}
        >
          {instance.visible === false ? <EyeOff size={14} /> : <Eye size={14} />}
        </IconButton>
        <IconButton
          label={instance.locked ? "Unlock widget" : "Lock widget"}
          disabled={instance.widgetType === "background"}
          onClick={() => onToggleLock(instance.instanceId)}
        >
          {instance.locked ? <Lock size={14} /> : <Unlock size={14} />}
        </IconButton>
        <IconButton
          label="Duplicate widget"
          disabled={instance.widgetType === "background"}
          onClick={() => onDuplicate(instance.instanceId)}
        >
          <Plus size={14} />
        </IconButton>
      </div>
    </article>
  );
}

export default function WidgetEditorPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const shellRef = useRef(null);
  const layoutRef = useRef(createDefaultBetterLayout());
  const interactionRef = useRef(null);
  const loadedRef = useRef(false);

  const [layout, setLayout] = useState(createDefaultBetterLayout);
  const [overlayRecord, setOverlayRecord] = useState(null);
  const [liveSource, setLiveSource] = useState(() => ({
    overlayId: null,
    widgets: [],
    theme: null,
  }));
  const [selectedInstanceId, setSelectedInstanceId] = useState("");
  const [dataMode, setDataMode] = useState("live");
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingState, setSavingState] = useState("idle");
  const [dirty, setDirty] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [copyState, setCopyState] = useState("");
  const [interaction, setInteraction] = useState(null);

  const scale = useCanvasScale(shellRef, zoom);

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  useEffect(() => {
    let mounted = true;
    async function loadEditor() {
      if (!user?.id) return;
      setLoading(true);
      setError(null);
      try {
        const record = await getOrCreateBetterEditorOverlay(user.id);
        if (!mounted) return;
        const nextLayout = normalizeBetterLayout(record.draftLayout);
        setOverlayRecord(record);
        setLayout(nextLayout);
        layoutRef.current = nextLayout;
        setSelectedInstanceId(nextLayout.instances.find((item) => item.widgetType !== "background")?.instanceId || nextLayout.instances[0]?.instanceId || "");
        setHistory([nextLayout]);
        setHistoryIndex(0);
        setDirty(false);
        loadedRef.current = true;
      } catch (loadError) {
        if (mounted) setError(loadError);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadEditor();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setLiveSource({ overlayId: null, widgets: [], theme: null });
      return undefined;
    }

    let mounted = true;
    let channel = null;

    const refreshLiveSource = async () => {
      const source = await getBetterEditorLiveSource(user.id);
      if (!mounted) return null;
      setLiveSource(source);
      return source;
    };

    refreshLiveSource()
      .then((source) => {
        if (!mounted || !source?.overlayId) return;
        channel = subscribeToBetterLiveSource(user.id, source.overlayId, {
          onWidgets: () => refreshLiveSource().catch((liveError) => {
            console.error("[BetterEditor] Failed to refresh live widget data:", liveError);
          }),
          onTheme: (theme) => {
            setLiveSource((current) => ({ ...current, theme }));
          },
        });
      })
      .catch((liveError) => {
        console.error("[BetterEditor] Failed to load live widget data:", liveError);
      });

    const fallbackInterval = window.setInterval(() => {
      refreshLiveSource().catch((liveError) => {
        console.error("[BetterEditor] Failed to refresh live widget data:", liveError);
      });
    }, LIVE_SOURCE_FALLBACK_MS);

    const refreshOnVisible = () => {
      if (document.visibilityState === "visible") {
        refreshLiveSource().catch((liveError) => {
          console.error("[BetterEditor] Failed to refresh live widget data:", liveError);
        });
      }
    };

    document.addEventListener("visibilitychange", refreshOnVisible);

    return () => {
      mounted = false;
      unsubscribeBetterLiveSource(channel);
      window.clearInterval(fallbackInterval);
      document.removeEventListener("visibilitychange", refreshOnVisible);
    };
  }, [user?.id]);

  const selectedInstance = useMemo(
    () => layout.instances.find((instance) => instance.instanceId === selectedInstanceId) || null,
    [layout.instances, selectedInstanceId],
  );
  const liveWidgetContext = useMemo(
    () => ({ liveWidgets: liveSource.widgets }),
    [liveSource.widgets],
  );
  const legacyWidgets = useMemo(
    () => layout.instances.map((instance) =>
      betterInstanceToLegacyWidget(instance, dataMode, liveWidgetContext),
    ),
    [dataMode, layout.instances, liveWidgetContext],
  );

  const hasUnpublishedChanges = dirty || Boolean(overlayRecord?.hasUnpublishedChanges);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const publicOverlayId = overlayRecord?.publicOverlayId || "";
  const fullOverlayUrl = publicOverlayId
    ? `${origin}/obs/overlay/${publicOverlayId}`
    : "";

  const setLayoutDraft = useCallback((updater) => {
    setLayout((current) => {
      const nextValue = typeof updater === "function" ? updater(current) : updater;
      const nextLayout = normalizeBetterLayout({
        ...nextValue,
        updatedAt: new Date().toISOString(),
      });
      layoutRef.current = nextLayout;
      setDirty(true);
      return nextLayout;
    });
  }, []);

  const pushHistory = useCallback((nextLayout) => {
    const normalized = normalizeBetterLayout(nextLayout);
    setHistory((current) => {
      const base = current.slice(0, historyIndex + 1);
      const next = [...base, normalized].slice(-HISTORY_LIMIT);
      setHistoryIndex(next.length - 1);
      return next;
    });
  }, [historyIndex]);

  const commitLayout = useCallback(
    (updater) => {
      const current = layoutRef.current;
      const nextValue = typeof updater === "function" ? updater(current) : updater;
      const nextLayout = normalizeBetterLayout({
        ...nextValue,
        updatedAt: new Date().toISOString(),
      });
      layoutRef.current = nextLayout;
      setLayout(nextLayout);
      setDirty(true);
      pushHistory(nextLayout);
      return nextLayout;
    },
    [pushHistory],
  );

  const updateInstance = useCallback(
    (instanceId, patch, { commit = true } = {}) => {
      const update = (current) => ({
        ...current,
        instances: current.instances.map((instance) => {
          if (instance.instanceId !== instanceId) return instance;
          const next = {
            ...instance,
            ...patch,
            config: patch.config
              ? validateBetterWidgetConfig(instance.widgetType, patch.config)
              : instance.config,
          };
          if (next.widgetType === "background") {
            return {
              ...next,
              x: 0,
              y: 0,
              width: BETTER_CANVAS.width,
              height: BETTER_CANVAS.height,
              locked: true,
              zIndex: 0,
            };
          }
          const constraints = BETTER_WIDGET_REGISTRY[next.widgetType]?.constraints;
          return {
            ...next,
            ...clampGeometry(next, constraints),
            opacity: clampNumber(next.opacity, 0, 1, 1),
          };
        }),
      });
      return commit ? commitLayout(update) : setLayoutDraft(update);
    },
    [commitLayout, setLayoutDraft],
  );

  useEffect(() => {
    if (!loadedRef.current || !dirty || !user?.id) return undefined;
    const timeout = window.setTimeout(async () => {
      try {
        setSavingState("saving");
        const record = await saveBetterDraft(user.id, layoutRef.current);
        setOverlayRecord(record);
        setSavingState("saved");
        setDirty(false);
      } catch (saveError) {
        setSavingState("error");
        setError(saveError);
      }
    }, AUTOSAVE_MS);
    return () => window.clearTimeout(timeout);
  }, [dirty, layout, user?.id]);

  useEffect(() => {
    if (!interaction) return undefined;

    const onPointerMove = (event) => {
      const active = interactionRef.current;
      if (!active) return;
      event.preventDefault();
      const dx = (event.clientX - active.startClientX) / active.scale;
      const dy = (event.clientY - active.startClientY) / active.scale;
      const currentLayout = layoutRef.current;
      const instance = currentLayout.instances.find((item) => item.instanceId === active.instanceId);
      if (!instance || instance.locked) return;

      const rawGeometry = active.mode === "drag"
        ? {
            ...active.start,
            x: active.start.x + dx,
            y: active.start.y + dy,
          }
        : applyResize(active.start, active.handle, dx, dy);

      const constraints = BETTER_WIDGET_REGISTRY[instance.widgetType]?.constraints;
      const clamped = clampGeometry(rawGeometry, constraints);
      const snapped = snapGeometry(currentLayout, active.instanceId, clamped);
      updateInstance(active.instanceId, snapped, { commit: false });
    };

    const onPointerUp = () => {
      interactionRef.current = null;
      setInteraction(null);
      pushHistory(layoutRef.current);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp, { once: true });
    window.addEventListener("pointercancel", onPointerUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [interaction, pushHistory, updateInstance]);

  const beginInteraction = useCallback((event, instance, mode, handle = "") => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedInstanceId(instance.instanceId);
    if (instance.locked || instance.visible === false || instance.widgetType === "background") return;
    interactionRef.current = {
      mode,
      handle,
      instanceId: instance.instanceId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      scale,
      start: {
        x: Number(instance.x) || 0,
        y: Number(instance.y) || 0,
        width: Number(instance.width) || 0,
        height: Number(instance.height) || 0,
      },
    };
    setInteraction(interactionRef.current);
  }, [scale]);

  const handleToggleVisible = useCallback((instanceId) => {
    const instance = layoutRef.current.instances.find((item) => item.instanceId === instanceId);
    if (!instance) return;
    updateInstance(instanceId, { visible: instance.visible === false });
  }, [updateInstance]);

  const handleToggleLock = useCallback((instanceId) => {
    const instance = layoutRef.current.instances.find((item) => item.instanceId === instanceId);
    if (!instance || instance.widgetType === "background") return;
    updateInstance(instanceId, { locked: !instance.locked });
  }, [updateInstance]);

  const handleDuplicate = useCallback((instanceId) => {
    const instance = layoutRef.current.instances.find((item) => item.instanceId === instanceId);
    const duplicated = duplicateBetterInstance(instance, { zIndex: getMaxZ(layoutRef.current) + 1 });
    if (!duplicated) return;
    const nextLayout = commitLayout((current) => ({
      ...current,
      instances: [...current.instances, duplicated],
    }));
    setSelectedInstanceId(duplicated.instanceId);
    return nextLayout;
  }, [commitLayout]);

  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return;
    const nextIndex = historyIndex - 1;
    const nextLayout = history[nextIndex];
    setHistoryIndex(nextIndex);
    setLayout(nextLayout);
    layoutRef.current = nextLayout;
    setDirty(true);
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const nextIndex = historyIndex + 1;
    const nextLayout = history[nextIndex];
    setHistoryIndex(nextIndex);
    setLayout(nextLayout);
    layoutRef.current = nextLayout;
    setDirty(true);
  }, [history, historyIndex]);

  const saveDraftNow = useCallback(async () => {
    if (!user?.id) return;
    setSavingState("saving");
    const record = await saveBetterDraft(user.id, layoutRef.current);
    setOverlayRecord(record);
    setSavingState("saved");
    setDirty(false);
  }, [user?.id]);

  const publishNow = useCallback(async () => {
    if (!user?.id) return;
    setSavingState("publishing");
    const record = await publishBetterOverlay(user.id, layoutRef.current);
    setOverlayRecord(record);
    const publishedLayout = normalizeBetterLayout(record.draftLayout);
    setLayout(publishedLayout);
    layoutRef.current = publishedLayout;
    setHistory([publishedLayout]);
    setHistoryIndex(0);
    setDirty(false);
    setSavingState("published");
  }, [user?.id]);

  const revertNow = useCallback(async () => {
    if (!user?.id) return;
    setSavingState("saving");
    const record = await revertBetterDraftToPublished(user.id);
    const nextLayout = normalizeBetterLayout(record.draftLayout);
    setOverlayRecord(record);
    setLayout(nextLayout);
    layoutRef.current = nextLayout;
    setHistory([nextLayout]);
    setHistoryIndex(0);
    setDirty(false);
    setSavingState("saved");
  }, [user?.id]);

  const resetLayoutNow = useCallback(async () => {
    if (!user?.id) return;
    setSavingState("saving");
    const record = await resetBetterDraftLayout(user.id);
    const nextLayout = normalizeBetterLayout(record.draftLayout);
    setOverlayRecord(record);
    setLayout(nextLayout);
    layoutRef.current = nextLayout;
    setHistory([nextLayout]);
    setHistoryIndex(0);
    setSelectedInstanceId(nextLayout.instances.find((item) => item.widgetType !== "background")?.instanceId || "");
    setDirty(false);
    setSavingState("saved");
  }, [user?.id]);

  const regenerateLinkNow = useCallback(async () => {
    if (!user?.id) return;
    setSavingState("saving");
    const record = await regenerateBetterPublicOverlayId(user.id);
    setOverlayRecord(record);
    setSavingState("saved");
  }, [user?.id]);

  const copyUrl = useCallback(async (url) => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopyState(url);
    window.setTimeout(() => setCopyState(""), 1500);
  }, []);

  const selectedLegacyWidget = selectedInstance
    ? betterInstanceToLegacyWidget(selectedInstance, dataMode, liveWidgetContext)
    : null;

  const handleConfigChange = useCallback((nextConfig) => {
    if (!selectedInstance) return;
    updateInstance(selectedInstance.instanceId, {
      config: validateBetterWidgetConfig(selectedInstance.widgetType, nextConfig),
    });
  }, [selectedInstance, updateInstance]);

  const handleWidgetChange = useCallback((patch = {}) => {
    if (!selectedInstance) return;
    const { config: patchConfig, ...layoutPatch } = patch;
    updateInstance(selectedInstance.instanceId, {
      ...layoutPatch,
      config: patchConfig
        ? validateBetterWidgetConfig(selectedInstance.widgetType, patchConfig)
        : selectedInstance.config,
    });
  }, [selectedInstance, updateInstance]);

  if (loading) return <LoadingSpinner text="Loading Better Editor..." fullPage />;

  if (error) {
    return (
      <main className="better-editor-page better-editor-page--error">
        <section className="better-editor-empty">
          <SlidersHorizontal size={24} />
          <h1>Better Editor unavailable</h1>
          <p>{error.message || "The Better overlay layout could not be loaded."}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="better-editor-page">
      <aside className="better-editor-sidebar">
        <header className="better-editor-panel-header">
          <span>Overlay</span>
          <h1>Better Editor</h1>
        </header>

        <div className="better-editor-widget-list">
          {layout.instances
            .slice()
            .sort((a, b) => Number(b.zIndex) - Number(a.zIndex))
            .map((instance) => (
              <WidgetListItem
                key={instance.instanceId}
                instance={instance}
                selected={instance.instanceId === selectedInstanceId}
                obsUrl={publicOverlayId ? `${origin}/obs/overlay/${publicOverlayId}/widget/${instance.instanceId}` : ""}
                onSelect={setSelectedInstanceId}
                onCopyUrl={copyUrl}
                onToggleVisible={handleToggleVisible}
                onToggleLock={handleToggleLock}
                onDuplicate={handleDuplicate}
              />
            ))}
        </div>

        <section className="better-editor-sidebar-section">
          <div className="better-editor-mode-toggle">
            <button
              type="button"
              className={dataMode === "mock" ? "is-active" : ""}
              onClick={() => setDataMode("mock")}
            >
              Mock
            </button>
            <button
              type="button"
              className={dataMode === "live" ? "is-active" : ""}
              onClick={() => setDataMode("live")}
            >
              Live
            </button>
          </div>
          <small>
            {dataMode === "mock"
              ? "Predictable preview data is active."
              : "Widgets use the same live data adapters as OBS."}
          </small>
        </section>
      </aside>

      <section className="better-editor-stage">
        <div className="better-editor-toolbar">
          <div>
            <span>Live overlay canvas</span>
            <h2>1920 x 1080</h2>
          </div>

          <div className="better-editor-toolbar__group">
            <button type="button" onClick={() => navigate("/apps")}>
              <Grid3X3 size={15} />
              Apps
            </button>
            <button type="button" onClick={handleUndo} disabled={historyIndex <= 0}>
              <Undo2 size={15} />
              Undo
            </button>
            <button type="button" onClick={handleRedo} disabled={historyIndex >= history.length - 1}>
              <Redo2 size={15} />
              Redo
            </button>
            <button type="button" onClick={saveDraftNow} disabled={savingState === "saving"}>
              <Save size={15} />
              Save Draft
            </button>
            <button type="button" className="is-primary" onClick={publishNow} disabled={savingState === "publishing"}>
              <Send size={15} />
              Publish to OBS
            </button>
            <button type="button" className="is-copy" onClick={() => copyUrl(fullOverlayUrl)} disabled={!fullOverlayUrl}>
              <Copy size={15} />
              Copy Overlay URL
            </button>
            <button type="button" onClick={regenerateLinkNow} disabled={savingState === "saving"}>
              <RefreshCw size={15} />
              Regenerate Link
            </button>
            <button type="button" onClick={revertNow}>
              <RotateCcw size={15} />
              Revert
            </button>
            <button type="button" onClick={resetLayoutNow}>
              <RefreshCw size={15} />
              Reset Layout
            </button>
          </div>
        </div>

        <div className="better-editor-canvas-tools">
          <span className={`better-editor-save-state better-editor-save-state--${savingState}`}>
            {savingState === "saving"
              ? "Saving draft..."
              : savingState === "publishing"
                ? "Publishing..."
                : savingState === "published"
                  ? "Published"
                  : dirty
                    ? "Unsaved draft changes"
                    : hasUnpublishedChanges
                      ? "Draft differs from OBS"
                      : "Draft saved"}
          </span>
          {copyState && (
            <small className="better-editor-copy-state">
              {copyState === fullOverlayUrl ? "Overlay URL copied." : "Widget URL copied."}
            </small>
          )}
          <label>
            Zoom
            <input
              type="range"
              min="0.35"
              max="1.25"
              step="0.05"
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
            />
            <strong>{Math.round(zoom * 100)}%</strong>
          </label>
          <span>
            <Grid3X3 size={14} />
            Snap {SNAP_GRID}px
          </span>
        </div>

        <div className="better-editor-canvas-shell" ref={shellRef}>
          <div
            className="better-editor-canvas-viewport"
            style={{
              width: BETTER_CANVAS.width * scale,
              height: BETTER_CANVAS.height * scale,
            }}
          >
            <div
              className="better-editor-canvas"
              style={{
                width: BETTER_CANVAS.width,
                height: BETTER_CANVAS.height,
                transform: `scale(${scale})`,
              }}
              onPointerDown={() => setSelectedInstanceId("")}
            >
              <span className="better-editor-canvas-line better-editor-canvas-line--x" />
              <span className="better-editor-canvas-line better-editor-canvas-line--y" />
              {layout.instances
                .slice()
                .sort((a, b) => Number(a.zIndex) - Number(b.zIndex))
                .map((instance) => {
                  if (instance.visible === false) return null;
                  const selected = instance.instanceId === selectedInstanceId;
                  const isBackground = instance.widgetType === "background";
                  return (
                    <div
                      key={instance.instanceId}
                      className={`better-editor-canvas-instance${selected ? " is-selected" : ""}${instance.locked ? " is-locked" : ""}${isBackground ? " is-background" : ""}`}
                      style={{
                        left: instance.x,
                        top: instance.y,
                        width: instance.width,
                        height: instance.height,
                        opacity: instance.opacity,
                        zIndex: instance.zIndex,
                        pointerEvents: isBackground ? "none" : "auto",
                        borderRadius: getEditorInstanceBorderRadius(instance),
                      }}
                      onPointerDown={(event) => beginInteraction(event, instance, "drag")}
                    >
                      {!isBackground && (
                        <span className="better-editor-canvas-instance__tag">
                          <MousePointer2 size={12} />
                          {instance.label}
                        </span>
                      )}
                      <div className="better-editor-canvas-instance__content">
                        <BetterEditorWidgetBoundary instanceId={instance.instanceId}>
                          {renderBetterWidgetInstance({
                            instance,
                            layout,
                            mode: dataMode,
                            userId: user?.id,
                            theme: liveSource.theme,
                            liveWidgets: liveSource.widgets,
                          })}
                        </BetterEditorWidgetBoundary>
                      </div>
                      {selected && !instance.locked && !isBackground && (
                        <div className="better-editor-resize-handles">
                          {RESIZE_HANDLES.map((handle) => (
                            <button
                              key={handle}
                              type="button"
                              className={`better-editor-resize-handle better-editor-resize-handle--${handle}`}
                              aria-label={`Resize ${handle}`}
                              onPointerDown={(event) => beginInteraction(event, instance, "resize", handle)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </section>

      <aside className="better-editor-settings">
        <header className="better-editor-panel-header">
          <span>Widget controls</span>
          <h2>{selectedInstance?.label || "Select a widget"}</h2>
        </header>

        <div className="better-editor-settings-scroll">
          {!selectedInstance && (
            <section className="better-editor-empty">
              <MousePointer2 size={22} />
              <h3>Select a widget</h3>
              <p>Click a widget in the canvas or list to edit its settings.</p>
            </section>
          )}

          {selectedInstance && (
            <section className="better-editor-control-section better-editor-control-section--settings">
              <BetterWidgetControls
                type={selectedInstance.widgetType}
                config={selectedInstance.config}
                onChange={handleConfigChange}
                onWidgetChange={handleWidgetChange}
                user={user}
                userId={user?.id}
                widget={selectedLegacyWidget}
                allWidgets={legacyWidgets}
              />
            </section>
          )}
        </div>
      </aside>
    </main>
  );
}
