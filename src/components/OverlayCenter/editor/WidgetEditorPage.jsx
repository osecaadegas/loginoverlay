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
  Check,
  Download,
  Eye,
  EyeOff,
  GripVertical,
  Lock,
  MoreVertical,
  MousePointer2,
  Pencil,
  Plus,
  Redo2,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  Trash2,
  Undo2,
  Unlock,
  X,
  Layers,
  PanelRight,
  PanelLeftClose,
  Search,
  ZoomIn,
  ZoomOut,
  Scan,
  Focus,
  Magnet,
  Grid2X2,
  MoreHorizontal,
  ArrowLeft,
  AlertCircle,
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
  selectBetterEditorOverlay,
  subscribeToBetterLiveSource,
  unsubscribeBetterLiveSource,
} from "../../../services/betterOverlayService";
import {
  BETTER_CANVAS,
  BETTER_WIDGET_REGISTRY,
  createBetterInstance,
  createDefaultBetterLayout,
  duplicateBetterInstance,
  normalizeBetterLayout,
  renderBetterWidgetInstance,
  resolveBetterWidgetConfig,
  validateBetterWidgetConfig,
  betterInstanceToLegacyWidget,
  getBetterInstanceConstraints,
} from "./betterWidgetRegistry";
import EditorInspector from "./EditorInspector";
import EditorWidgetPicker from "./EditorWidgetPicker";
import { readEditorPreferences, useEditorPreferences } from "./editorPreferences";
import OverlayBuildFolders from "./OverlayBuildFolders";
import {
  getBetterWidgetNudge,
  moveBetterWidgetLayer,
  normalizeBetterCoordinate,
  reorderBetterWidgetLayers,
} from "./betterWidgetGeometry";
import { downloadWidgetControlsPreset } from "./widgetControlsPreset";
import "../OverlayRenderer.css";
import "./BetterWidgetPackages.css";
import "./WidgetEditorPage.css";
import "./EditorWorkspace.css";

const SNAP_TOLERANCE = 10;
const SNAP_GRID = 20;
const HISTORY_LIMIT = 80;
const AUTOSAVE_MS = 800;
const LIVE_SOURCE_FALLBACK_MS = 30000;
const EDITOR_SYNC_CHANNEL = "streamers-center-better-editor";

const RESIZE_HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

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
  return clampNumber(
    instance.config?.radius ?? instance.config?.borderRadius,
    0,
    120,
    14,
  );
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
    x: normalizeBetterCoordinate(geometry.x),
    y: normalizeBetterCoordinate(geometry.y),
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
    if (instance.instanceId === instanceId || instance.visible === false)
      return;
    const left = Number(instance.x) || 0;
    const top = Number(instance.y) || 0;
    const right = left + (Number(instance.width) || 0);
    const bottom = top + (Number(instance.height) || 0);
    const centerX = left + (Number(instance.width) || 0) / 2;
    const centerY = top + (Number(instance.height) || 0) / 2;
    xCandidates.push(
      left,
      right,
      left - geometry.width,
      right - geometry.width,
      centerX - geometry.width / 2,
    );
    yCandidates.push(
      top,
      bottom,
      top - geometry.height,
      bottom - geometry.height,
      centerY - geometry.height / 2,
    );
  });

  return { xCandidates, yCandidates };
}

function snapGeometry(layout, instanceId, geometry) {
  const { xCandidates, yCandidates } = buildSnapCandidates(
    layout,
    instanceId,
    geometry,
  );
  const snapped = {
    ...geometry,
    x: snapValue(geometry.x, xCandidates),
    y: snapValue(geometry.y, yCandidates),
  };
  return clampGeometry(
    snapped,
    getBetterInstanceConstraints(
      layout.instances.find((item) => item.instanceId === instanceId),
    ),
  );
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

function buildWidgetObsUrl(origin, publicOverlayId, instanceId) {
  if (!origin || !publicOverlayId || !instanceId) return "";
  return `${origin}/obs/overlay/${publicOverlayId}/widget/${instanceId}?scale=fit`;
}

function useCanvasScale(shellRef, ready) {
  const [fitScale, setFitScale] = useState(0.5);

  useLayoutEffect(() => {
    const shell = shellRef.current;
    if (!ready || !shell) return undefined;

    const measure = () => {
      const rect = shell.getBoundingClientRect();
      const availableWidth = Math.max(1, rect.width - 32);
      const availableHeight = Math.max(1, rect.height - 32);
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
  }, [ready, shellRef]);

  return fitScale;
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

function WidgetListItem({
  instance,
  selected,
  obsUrl,
  onSelect,
  onCopyUrl,
  onDownloadPreset,
  onToggleVisible,
  onToggleLock,
  onDuplicate,
  onDelete,
  onRename,
  dragging,
  dragOver,
  onLayerDragStart,
  onLayerDragOver,
  onLayerDrop,
  onLayerDragEnd,
  onLayerMove,
}) {
  const definition = BETTER_WIDGET_REGISTRY[instance.widgetType];
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(instance.label || definition?.label || "");
  const finishRename = (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    onRename(instance.instanceId, name.trim());
    setRenaming(false);
  };
  const handleMenuToggle = (event) => {
    const menu = event.currentTarget;
    if (!menu.open) {
      menu.classList.remove("opens-up");
      return;
    }

    const panel = menu.querySelector(".better-editor-widget-row__menu-panel");
    const boundary = menu.closest(".better-editor-widget-list");
    const trigger = menu.querySelector(
      ".better-editor-widget-row__menu-trigger",
    );
    if (!panel || !boundary || !trigger) return;

    const boundaryRect = boundary.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();
    const availableBelow = boundaryRect.bottom - triggerRect.bottom;
    const availableAbove = triggerRect.top - boundaryRect.top;
    menu.classList.toggle(
      "opens-up",
      availableBelow < panel.offsetHeight + 6 &&
        availableAbove > availableBelow,
    );
  };
  const menuAction = (event, action) => {
    event.preventDefault();
    event.stopPropagation();
    if (typeof action === "function") action();
    const menu = event.currentTarget.closest("details");
    if (menu) menu.open = false;
  };
  const canEditInstance = instance.widgetType !== "background";
  return (
    <article
      className={`better-editor-widget-row${selected ? " is-selected" : ""}${instance.visible === false ? " is-hidden" : ""}${dragging ? " is-dragging" : ""}${dragOver ? " is-drag-over" : ""}`}
      onDragOver={(event) => onLayerDragOver(event, instance.instanceId)}
      onDrop={(event) => onLayerDrop(event, instance.instanceId)}
    >
      <button
        type="button"
        className="better-editor-widget-row__drag-handle"
        aria-label={`Reorder ${instance.label || definition?.label || "widget"} layer`}
        disabled={!canEditInstance}
        title={
          canEditInstance
            ? "Drag to change OBS layer"
            : "Background layer is fixed"
        }
        draggable={canEditInstance}
        onDragStart={(event) => onLayerDragStart(event, instance.instanceId)}
        onDragEnd={onLayerDragEnd}
        onKeyDown={(event) => {
          if (!canEditInstance || !["ArrowUp", "ArrowDown"].includes(event.key))
            return;
          event.preventDefault();
          onLayerMove(instance.instanceId, event.key === "ArrowUp" ? -1 : 1);
        }}
      >
        <GripVertical size={16} />
      </button>
      {renaming ? (
        <form className="better-editor-widget-row__rename" onSubmit={finishRename} onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === "Escape") { event.preventDefault(); setRenaming(false); }
        }}>
          <input autoFocus aria-label="Widget name" required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} />
          <button type="submit" title="Save name" aria-label="Save widget name"><Check size={14} /></button>
          <button type="button" title="Cancel rename" aria-label="Cancel rename" onClick={() => setRenaming(false)}><X size={14} /></button>
        </form>
      ) : <button
        type="button"
        className="better-editor-widget-row__main"
        onClick={() => onSelect(instance.instanceId)}
      >
        <span className="better-editor-widget-row__icon">
          {definition?.icon || getInitials(instance.label)}
        </span>
        <span>
          <strong title={instance.label || definition?.label}>{instance.label || definition?.label}</strong>
          <small>
            {instance.visible === false
              ? "Hidden"
              : instance.locked
                ? "Locked"
                : `${roundNumber(instance.width)} x ${roundNumber(instance.height)}`}
          </small>
        </span>
      </button>}
      <div className="editor-layer-quick-actions">
        <button type="button" title={instance.visible === false ? "Show widget" : "Hide widget"} aria-label={`${instance.visible === false ? "Show" : "Hide"} ${instance.label}`} aria-pressed={instance.visible !== false} onClick={() => onToggleVisible(instance.instanceId)}>{instance.visible === false ? <EyeOff size={14} /> : <Eye size={14} />}</button>
        <button type="button" disabled={!canEditInstance} title={instance.locked ? "Unlock widget" : "Lock widget"} aria-label={`${instance.locked ? "Unlock" : "Lock"} ${instance.label}`} aria-pressed={instance.locked} onClick={() => onToggleLock(instance.instanceId)}>{instance.locked ? <Lock size={14} /> : <Unlock size={14} />}</button>
      </div>
      <details
        className="better-editor-widget-row__menu"
        onClick={(event) => event.stopPropagation()}
        onToggle={handleMenuToggle}
      >
        <summary
          className="better-editor-widget-row__menu-trigger"
          aria-label={`${instance.label || definition?.label || "Widget"} actions`}
        >
          <MoreVertical size={15} />
        </summary>
        <div className="better-editor-widget-row__menu-panel">
          <button type="button" onClick={(event) => menuAction(event, () => {
            setName(instance.label || definition?.label || "");
            setRenaming(true);
          })}><Pencil size={14} /><span>Rename widget</span></button>
          <button
            type="button"
            disabled={!obsUrl}
            onClick={(event) => menuAction(event, () => onCopyUrl(obsUrl))}
          >
            <Copy size={14} />
            <span>Copy OBS URL</span>
          </button>
          <button
            type="button"
            onClick={(event) =>
              menuAction(event, () => onDownloadPreset(instance))
            }
          >
            <Download size={14} />
            <span>
              {instance.widgetType === "chat"
                ? "Download complete Chat JSON"
                : "Download controls preset"}
            </span>
          </button>
          <button
            type="button"
            onClick={(event) =>
              menuAction(event, () => onToggleVisible(instance.instanceId))
            }
          >
            {instance.visible === false ? (
              <EyeOff size={14} />
            ) : (
              <Eye size={14} />
            )}
            <span>
              {instance.visible === false ? "Show widget" : "Hide widget"}
            </span>
          </button>
          <button
            type="button"
            disabled={!canEditInstance}
            onClick={(event) =>
              menuAction(event, () => onToggleLock(instance.instanceId))
            }
          >
            {instance.locked ? <Unlock size={14} /> : <Lock size={14} />}
            <span>{instance.locked ? "Unlock widget" : "Lock widget"}</span>
          </button>
          <button
            type="button"
            disabled={!canEditInstance}
            onClick={(event) =>
              menuAction(event, () => onDuplicate(instance.instanceId))
            }
          >
            <Plus size={14} />
            <span>Add copy</span>
          </button>
          <button
            type="button"
            className="is-danger"
            disabled={!canEditInstance}
            onClick={(event) =>
              menuAction(event, () => onDelete(instance.instanceId))
            }
          >
            <Trash2 size={14} />
            <span>Delete widget</span>
          </button>
        </div>
      </details>
    </article>
  );
}

export default function WidgetEditorPage() {
  const { user } = useAuth();
  return <BetterEditorWorkspace key={user?.id || "guest"} userId={user?.id} />;
}

function BetterEditorWorkspace({ userId }) {
  const [overlayId, setOverlayId] = useState(null);
  const selectBuild = (id) => {
    selectBetterEditorOverlay(userId, id);
    setOverlayId(id);
  };
  return <BetterOverlayEditor key={overlayId || "selected"} overlayId={overlayId} onSelectBuild={selectBuild} />;
}

function BetterOverlayEditor({ overlayId, onSelectBuild }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const shellRef = useRef(null);
  const layoutRef = useRef(createDefaultBetterLayout());
  const interactionRef = useRef(null);
  const loadedRef = useRef(false);
  const dirtyRef = useRef(false);
  const draftVersionRef = useRef(0);
  const editorSyncChannelRef = useRef(null);
  const savePromiseRef = useRef(null);
  const overlayRecordRef = useRef(null);
  const operationRef = useRef(false);
  const retryActionRef = useRef(null);
  const pendingViewportRef = useRef(null);
  const confirmDialogRef = useRef(null);

  const [layout, setLayout] = useState(createDefaultBetterLayout);
  const [overlayRecord, setOverlayRecord] = useState(null);
  const [liveSource, setLiveSource] = useState(() => ({
    overlayId: null,
    widgets: [],
    theme: null,
  }));
  const [selectedInstanceId, setSelectedInstanceId] = useState("");
  const [dataMode, setDataMode] = useState("live");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingState, setSavingState] = useState("idle");
  const [dirty, setDirty] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [interaction, setInteraction] = useState(null);
  const [draggedLayerId, setDraggedLayerId] = useState("");
  const [dragOverLayerId, setDragOverLayerId] = useState("");
  const [operation, setOperation] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [widgetPickerOpen, setWidgetPickerOpen] = useState(false);
  const [layerSearch, setLayerSearch] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [viewportRevision, setViewportRevision] = useState(0);
  const [layersOpen, setLayersOpen] = useState(() => window.innerWidth > 1100);
  const [settingsOpen, setSettingsOpen] = useState(
    () => window.innerWidth > 1100,
  );
  const [preferences, setPreferences] = useEditorPreferences(
    user?.id,
    overlayRecord?.id,
  );
  const fitScale = useCanvasScale(shellRef, !loading && Boolean(overlayRecord));
  const zoom = Number(preferences.zoom);
  const scale = !previewing && zoom >= 0.1 && zoom <= 2 ? zoom : fitScale;
  const snapping = preferences.snapping !== false;
  const showGrid = preferences.showGrid !== false;
  const gridVisible = showGrid && !previewing;

  useEffect(() => {
    if (confirmation) confirmDialogRef.current?.showModal();
    else confirmDialogRef.current?.close();
  }, [confirmation]);

  useLayoutEffect(() => {
    const target = pendingViewportRef.current;
    const shell = shellRef.current;
    if (!target || !shell) return;
    const offsetX = Math.max(
      16,
      (shell.clientWidth - BETTER_CANVAS.width * scale) / 2,
    );
    const offsetY = Math.max(
      16,
      (shell.clientHeight - BETTER_CANVAS.height * scale) / 2,
    );
    shell.scrollLeft = target.x * scale + offsetX - shell.clientWidth / 2;
    shell.scrollTop = target.y * scale + offsetY - shell.clientHeight / 2;
    pendingViewportRef.current = null;
  }, [scale, viewportRevision]);

  useEffect(() => {
    const warnUnsaved = (event) => {
      if (!dirtyRef.current && !savePromiseRef.current && !operationRef.current)
        return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnUnsaved);
    return () => window.removeEventListener("beforeunload", warnUnsaved);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1100px)");
    const resizePanels = () => {
      const saved = readEditorPreferences(user.id, overlayRecord?.id);
      setLayersOpen(!media.matches && saved.layersOpen !== false);
      setSettingsOpen(!media.matches && saved.settingsOpen !== false);
    };
    media.addEventListener("change", resizePanels);
    return () => media.removeEventListener("change", resizePanels);
  }, [user?.id, overlayRecord?.id]);

  useEffect(() => {
    if (!overlayRecord) return;
    const saved = readEditorPreferences(user.id, overlayRecord.id);
    if (window.innerWidth > 1100) {
      setLayersOpen(saved.layersOpen !== false);
      setSettingsOpen(saved.settingsOpen !== false);
    }
  }, [overlayRecord?.id, user?.id]);

  useEffect(() => {
    if (loadedRef.current && selectedInstanceId)
      setPreferences({ selectedInstanceId });
  }, [selectedInstanceId, setPreferences]);

  useEffect(() => {
    document.documentElement.classList.add("better-editor-document");
    document.body.classList.add("better-editor-document");
    return () => {
      document.documentElement.classList.remove("better-editor-document");
      document.body.classList.remove("better-editor-document");
    };
  }, []);

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(() => {
    draftVersionRef.current = Number(overlayRecord?.draftVersion || 0);
    overlayRecordRef.current = overlayRecord;
  }, [overlayRecord]);

  useEffect(() => {
    let mounted = true;
    async function loadEditor() {
      if (!user?.id) return;
      setLoading(true);
      setError(null);
      try {
        const record = await getOrCreateBetterEditorOverlay(user.id, overlayId);
        if (!mounted) return;
        const nextLayout = normalizeBetterLayout(record.draftLayout);
        setOverlayRecord(record);
        overlayRecordRef.current = record;
        selectBetterEditorOverlay(user.id, record.id);
        setLayout(nextLayout);
        layoutRef.current = nextLayout;
        const savedSelection = readEditorPreferences(
          user.id,
          record.id,
        ).selectedInstanceId;
        setSelectedInstanceId(
          nextLayout.instances.find(
            (item) => item.instanceId === savedSelection,
          )?.instanceId ||
            nextLayout.instances.find(
              (item) => item.widgetType !== "background",
            )?.instanceId ||
            nextLayout.instances[0]?.instanceId ||
            "",
        );
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
  }, [user?.id, overlayId]);

  useEffect(() => {
    if (!user?.id || typeof BroadcastChannel === "undefined") return undefined;
    const channel = new BroadcastChannel(`${EDITOR_SYNC_CHANNEL}:${user.id}`);
    editorSyncChannelRef.current = channel;
    channel.onmessage = async (event) => {
      const nextVersion = Number(event.data?.draftVersion || 0);
      if (
        event.data?.type !== "better-editor-draft-saved" ||
        event.data?.overlayId !== overlayRecordRef.current?.id ||
        nextVersion <= draftVersionRef.current ||
        dirtyRef.current ||
        operationRef.current
      ) {
        return;
      }
      try {
        const record = await getOrCreateBetterEditorOverlay(
          user.id,
          overlayRecordRef.current?.id,
        );
        if (
          dirtyRef.current ||
          operationRef.current ||
          Number(record?.draftVersion || 0) <= draftVersionRef.current
        )
          return;
        const nextLayout = normalizeBetterLayout(record.draftLayout);
        setOverlayRecord(record);
        overlayRecordRef.current = record;
        setLayout(nextLayout);
        layoutRef.current = nextLayout;
        setHistory([nextLayout]);
        setHistoryIndex(0);
        setSavingState("saved");
      } catch (syncError) {
        console.error(
          "[BetterEditor] Failed to sync another window:",
          syncError,
        );
      }
    };
    return () => {
      channel.close();
      editorSyncChannelRef.current = null;
    };
  }, [user?.id]);

  const announceEditorRecord = useCallback((record) => {
    editorSyncChannelRef.current?.postMessage({
      type: "better-editor-draft-saved",
      draftVersion: record?.draftVersion,
      overlayId: record?.id,
    });
  }, []);

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
          onWidgets: () =>
            refreshLiveSource().catch((liveError) => {
              console.error(
                "[BetterEditor] Failed to refresh live widget data:",
                liveError,
              );
            }),
          onTheme: (theme) => {
            setLiveSource((current) => ({ ...current, theme }));
          },
        });
      })
      .catch((liveError) => {
        console.error(
          "[BetterEditor] Failed to load live widget data:",
          liveError,
        );
      });

    const fallbackInterval = window.setInterval(() => {
      refreshLiveSource().catch((liveError) => {
        console.error(
          "[BetterEditor] Failed to refresh live widget data:",
          liveError,
        );
      });
    }, LIVE_SOURCE_FALLBACK_MS);

    const refreshOnVisible = () => {
      if (document.visibilityState === "visible") {
        refreshLiveSource().catch((liveError) => {
          console.error(
            "[BetterEditor] Failed to refresh live widget data:",
            liveError,
          );
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
    () =>
      layout.instances.find(
        (instance) => instance.instanceId === selectedInstanceId,
      ) || null,
    [layout.instances, selectedInstanceId],
  );
  const liveWidgetContext = useMemo(
    () => ({ liveWidgets: liveSource.widgets }),
    [liveSource.widgets],
  );
  const handleDownloadPreset = useCallback(
    (instance) => {
      const exportInstance =
        instance?.widgetType === "chat"
          ? {
              ...instance,
              config: resolveBetterWidgetConfig(
                "chat",
                instance.config,
                "live",
                liveWidgetContext,
              ),
            }
          : instance;
      downloadWidgetControlsPreset(exportInstance);
    },
    [liveWidgetContext],
  );
  const legacyWidgets = useMemo(
    () =>
      layout.instances.map((instance) =>
        betterInstanceToLegacyWidget(instance, dataMode, liveWidgetContext),
      ),
    [dataMode, layout.instances, liveWidgetContext],
  );
  const addableDefinitions = useMemo(() => {
    return Object.values(BETTER_WIDGET_REGISTRY).filter(
      (definition) => definition.widgetType !== "background",
    );
  }, [layout.instances]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const publicOverlayId = overlayRecord?.publicOverlayId || "";
  const fullOverlayUrl = publicOverlayId
    ? `${origin}/obs/overlay/${publicOverlayId}`
    : "";

  const setLayoutDraft = useCallback((updater) => {
    setLayout((current) => {
      const nextValue =
        typeof updater === "function" ? updater(current) : updater;
      const nextLayout = normalizeBetterLayout({
        ...nextValue,
        updatedAt: new Date().toISOString(),
      });
      layoutRef.current = nextLayout;
      dirtyRef.current = true;
      setDirty(true);
      return nextLayout;
    });
  }, []);

  const pushHistory = useCallback(
    (nextLayout) => {
      const normalized = normalizeBetterLayout(nextLayout);
      setHistory((current) => {
        const base = current.slice(0, historyIndex + 1);
        const next = [...base, normalized].slice(-HISTORY_LIMIT);
        setHistoryIndex(next.length - 1);
        return next;
      });
    },
    [historyIndex],
  );

  const commitLayout = useCallback(
    (updater) => {
      const current = layoutRef.current;
      const nextValue =
        typeof updater === "function" ? updater(current) : updater;
      const nextLayout = normalizeBetterLayout({
        ...nextValue,
        updatedAt: new Date().toISOString(),
      });
      layoutRef.current = nextLayout;
      setLayout(nextLayout);
      dirtyRef.current = true;
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
          if (
            next.widgetType === "bonus_hunt" &&
            next.config.orientation === "horizontal" &&
            !patch.config &&
            patch.height != null &&
            patch.height !== instance.height
          ) {
            next.config = { ...next.config, horizontalHeight: patch.height };
          }
          if (next.config.fitContentToFrame === true) {
            const constraints = getBetterInstanceConstraints(next);
            Object.assign(
              next,
              clampGeometry(
                next,
                next.widgetType === "bonus_hunt"
                  ? { ...constraints, maxHeight: 980 }
                  : constraints,
              ),
            );
            if (next.widgetType === "bonus_hunt")
              next.config = {
                ...next.config,
                widgetWidth: next.width,
                panelWidth: next.width,
                widgetHeight: next.height,
                panelHeight: next.height,
              };
            else if (["chat", "giveaway"].includes(next.widgetType))
              next.config = {
                ...next.config,
                width: next.width,
                height: next.height,
              };
          }
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
          const constraints = getBetterInstanceConstraints(next);
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
    const onKeyDown = (event) => {
      if (
        operationRef.current ||
        previewing ||
        document.querySelector("dialog[open]")
      )
        return;
      const nudge = getBetterWidgetNudge(event.key);
      if (!nudge || event.ctrlKey || event.metaKey || event.altKey) return;
      if (
        event.target?.closest?.(
          "input, textarea, select, button, a, [contenteditable='true']",
        )
      )
        return;
      const instance = layoutRef.current.instances.find(
        (item) => item.instanceId === selectedInstanceId,
      );
      if (
        !instance ||
        instance.locked ||
        instance.visible === false ||
        instance.widgetType === "background"
      )
        return;
      event.preventDefault();
      updateInstance(instance.instanceId, {
        x: normalizeBetterCoordinate(instance.x) + nudge.x,
        y: normalizeBetterCoordinate(instance.y) + nudge.y,
      });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedInstanceId, updateInstance, previewing]);

  const flushDraft = useCallback(async () => {
    if (!user?.id || !overlayRecordRef.current) return null;
    // Serialize autosave and folder changes, including edits made while a save is in flight.
    for (;;) {
      while (savePromiseRef.current) await savePromiseRef.current;
      if (!dirtyRef.current) return overlayRecordRef.current;
      const snapshot = layoutRef.current;
      const current = overlayRecordRef.current;
      setSavingState("saving");
      const pending = saveBetterDraft(
        user.id,
        snapshot,
        current.draftVersion,
        current.id,
      );
      savePromiseRef.current = pending;
      try {
        const record = await pending;
        overlayRecordRef.current = record;
        draftVersionRef.current = record.draftVersion;
        setOverlayRecord(record);
        announceEditorRecord(record);
        dirtyRef.current = layoutRef.current !== snapshot;
        setDirty(dirtyRef.current);
        setSavingState("saved");
        setError(null);
        retryActionRef.current = null;
      } catch (failure) {
        setSavingState("error");
        throw failure;
      } finally {
        if (savePromiseRef.current === pending) savePromiseRef.current = null;
      }
    }
  }, [announceEditorRecord, user?.id]);

  useEffect(() => {
    if (!loadedRef.current || !dirty || !user?.id) return undefined;
    const timeout = window.setTimeout(async () => {
      try {
        await flushDraft();
      } catch (saveError) {
        retryActionRef.current = null;
        setSavingState("error");
        setError(saveError);
      }
    }, AUTOSAVE_MS);
    return () => window.clearTimeout(timeout);
  }, [flushDraft, dirty, layout, overlayRecord?.draftVersion, user?.id]);

  useEffect(() => {
    if (!interaction) return undefined;

    const onPointerMove = (event) => {
      const active = interactionRef.current;
      if (!active) return;
      event.preventDefault();
      const dx = (event.clientX - active.startClientX) / active.scale;
      const dy = (event.clientY - active.startClientY) / active.scale;
      const currentLayout = layoutRef.current;
      const instance = currentLayout.instances.find(
        (item) => item.instanceId === active.instanceId,
      );
      if (!instance || instance.locked) return;

      const rawGeometry =
        active.mode === "drag"
          ? {
              ...active.start,
              x: active.start.x + dx,
              y: active.start.y + dy,
            }
          : applyResize(active.start, active.handle, dx, dy);

      const constraints = getBetterInstanceConstraints(instance);
      const clamped = clampGeometry(rawGeometry, constraints);
      const snapped =
        snapping && !event.altKey
          ? snapGeometry(currentLayout, active.instanceId, clamped)
          : clamped;
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
  }, [interaction, pushHistory, updateInstance, snapping]);

  const beginInteraction = useCallback(
    (event, instance, mode, handle = "") => {
      if (event.button !== 0) return;
      if (previewing || operationRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      setSelectedInstanceId(instance.instanceId);
      if (
        instance.locked ||
        instance.visible === false ||
        instance.widgetType === "background"
      )
        return;
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
    },
    [scale, previewing],
  );

  const handleToggleVisible = useCallback(
    (instanceId) => {
      const instance = layoutRef.current.instances.find(
        (item) => item.instanceId === instanceId,
      );
      if (!instance) return;
      updateInstance(instanceId, { visible: instance.visible === false });
    },
    [updateInstance],
  );

  const handleToggleLock = useCallback(
    (instanceId) => {
      const instance = layoutRef.current.instances.find(
        (item) => item.instanceId === instanceId,
      );
      if (!instance || instance.widgetType === "background") return;
      updateInstance(instanceId, { locked: !instance.locked });
    },
    [updateInstance],
  );

  const handleDuplicate = useCallback(
    (instanceId) => {
      const instance = layoutRef.current.instances.find(
        (item) => item.instanceId === instanceId,
      );
      const duplicated = duplicateBetterInstance(instance, {
        zIndex: getMaxZ(layoutRef.current) + 1,
      });
      if (!duplicated) return;
      const nextLayout = commitLayout((current) => ({
        ...current,
        instances: [...current.instances, duplicated],
      }));
      setSelectedInstanceId(duplicated.instanceId);
      return nextLayout;
    },
    [commitLayout],
  );

  const handleAddWidget = useCallback(
    (widgetType) => {
      const created = createBetterInstance(widgetType, {
        zIndex: getMaxZ(layoutRef.current) + 1,
      });
      if (!created) return null;
      const nextLayout = commitLayout((current) => ({
        ...current,
        instances: [...current.instances, created],
      }));
      setSelectedInstanceId(created.instanceId);
      if (window.innerWidth <= 1100) {
        setLayersOpen(false);
        setSettingsOpen(true);
      }
      return nextLayout;
    },
    [commitLayout],
  );

  const handleDeleteInstance = useCallback(
    (instanceId) => {
      const current = layoutRef.current;
      const instance = current.instances.find(
        (item) => item.instanceId === instanceId,
      );
      if (!instance || instance.widgetType === "background") return null;
      const foregroundCount = current.instances.filter(
        (item) => item.widgetType !== "background",
      ).length;
      if (foregroundCount <= 1) return null;
      const nextLayout = commitLayout((layoutToUpdate) => ({
        ...layoutToUpdate,
        instances: layoutToUpdate.instances.filter(
          (item) => item.instanceId !== instanceId,
        ),
      }));
      if (selectedInstanceId === instanceId) {
        setSelectedInstanceId(
          nextLayout.instances.find((item) => item.widgetType !== "background")
            ?.instanceId ||
            nextLayout.instances[0]?.instanceId ||
            "",
        );
      }
      return nextLayout;
    },
    [commitLayout, selectedInstanceId],
  );

  const clearLayerDrag = useCallback(() => {
    setDraggedLayerId("");
    setDragOverLayerId("");
  }, []);

  const handleLayerDragStart = useCallback((event, instanceId) => {
    const instance = layoutRef.current.instances.find(
      (item) => item.instanceId === instanceId,
    );
    if (!instance || instance.widgetType === "background") {
      event.preventDefault();
      return;
    }
    setSelectedInstanceId(instanceId);
    setDraggedLayerId(instanceId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", instanceId);
  }, []);

  const handleLayerDragOver = useCallback((event, targetId) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverLayerId(targetId);
  }, []);

  const handleLayerDrop = useCallback(
    (event, targetId) => {
      event.preventDefault();
      const sourceId =
        event.dataTransfer.getData("text/plain") || draggedLayerId;
      if (sourceId && sourceId !== targetId) {
        commitLayout((current) => ({
          ...current,
          instances: reorderBetterWidgetLayers(
            current.instances,
            sourceId,
            targetId,
          ),
        }));
      }
      clearLayerDrag();
    },
    [clearLayerDrag, commitLayout, draggedLayerId],
  );

  const handleLayerMove = useCallback(
    (instanceId, direction) => {
      commitLayout((current) => ({
        ...current,
        instances: moveBetterWidgetLayer(
          current.instances,
          instanceId,
          direction,
        ),
      }));
    },
    [commitLayout],
  );

  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return;
    const nextIndex = historyIndex - 1;
    const nextLayout = history[nextIndex];
    setHistoryIndex(nextIndex);
    setLayout(nextLayout);
    layoutRef.current = nextLayout;
    dirtyRef.current = true;
    setDirty(true);
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const nextIndex = historyIndex + 1;
    const nextLayout = history[nextIndex];
    setHistoryIndex(nextIndex);
    setLayout(nextLayout);
    layoutRef.current = nextLayout;
    dirtyRef.current = true;
    setDirty(true);
  }, [history, historyIndex]);

  const saveDraftNow = useCallback(async () => {
    if (!user?.id) return;
    setSavingState("saving");
    try {
      await flushDraft();
      setSavingState("saved");
      setError(null);
      retryActionRef.current = null;
    } catch (saveError) {
      retryActionRef.current = null;
      setSavingState("error");
      setError(saveError);
    }
  }, [flushDraft, user?.id]);

  const runEditorOperation = useCallback(
    async (name, action, replaceLayout = false) => {
      if (!user?.id || operationRef.current) return;
      operationRef.current = true;
      setOperation(name);
      setError(null);
      try {
        const saved = await flushDraft();
        const record = await action(saved);
        overlayRecordRef.current = record;
        draftVersionRef.current = record.draftVersion;
        setOverlayRecord(record);
        announceEditorRecord(record);
        if (replaceLayout) {
          const nextLayout = normalizeBetterLayout(record.draftLayout);
          setLayout(nextLayout);
          layoutRef.current = nextLayout;
          setHistory([nextLayout]);
          setHistoryIndex(0);
          dirtyRef.current = false;
          setDirty(false);
          setSelectedInstanceId((id) =>
            nextLayout.instances.some((item) => item.instanceId === id)
              ? id
              : nextLayout.instances.find(
                  (item) => item.widgetType !== "background",
                )?.instanceId || "",
          );
        }
        setSavingState(name === "Publishing" ? "published" : "saved");
      } catch (failure) {
        if (failure.committedEditorRecord) {
          overlayRecordRef.current = failure.committedEditorRecord;
          draftVersionRef.current = failure.committedEditorRecord.draftVersion;
          setOverlayRecord(failure.committedEditorRecord);
        }
        retryActionRef.current = () =>
          runEditorOperation(name, action, replaceLayout);
        setSavingState("error");
        setError(failure);
      } finally {
        operationRef.current = false;
        setOperation(null);
      }
    },
    [user?.id, flushDraft, announceEditorRecord],
  );

  const publishNow = useCallback(
    () =>
      runEditorOperation(
        "Publishing",
        (saved) =>
          publishBetterOverlay(
            user.id,
            saved.draftLayout,
            saved.draftVersion,
            saved.id,
          ),
        true,
      ),
    [runEditorOperation, user?.id],
  );
  const revertNow = useCallback(
    () =>
      runEditorOperation(
        "Reverting",
        (saved) =>
          revertBetterDraftToPublished(user.id, saved.draftVersion, saved.id),
        true,
      ),
    [runEditorOperation, user?.id],
  );
  const resetLayoutNow = useCallback(
    () =>
      runEditorOperation(
        "Resetting",
        (saved) =>
          resetBetterDraftLayout(user.id, saved.draftVersion, saved.id),
        true,
      ),
    [runEditorOperation, user?.id],
  );
  const regenerateLinkNow = useCallback(
    () =>
      runEditorOperation("Regenerating link", (saved) =>
        regenerateBetterPublicOverlayId(user.id, saved.id),
      ),
    [runEditorOperation, user?.id],
  );

  const copyUrl = useCallback(async (url) => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setSavingState("copied");
      setError(null);
      retryActionRef.current = null;
    } catch (failure) {
      retryActionRef.current = () => copyUrl(url);
      setError(
        new Error(
          "Could not copy the OBS URL. Check clipboard permissions and try again.",
        ),
      );
    }
  }, []);

  const selectedLegacyWidget = selectedInstance
    ? betterInstanceToLegacyWidget(
        selectedInstance,
        dataMode,
        liveWidgetContext,
      )
    : null;

  const handleConfigChange = useCallback(
    (nextConfig) => {
      if (!selectedInstance) return;
      updateInstance(selectedInstance.instanceId, {
        config: validateBetterWidgetConfig(
          selectedInstance.widgetType,
          nextConfig,
        ),
      });
    },
    [selectedInstance, updateInstance],
  );

  const handleWidgetChange = useCallback(
    (patch = {}) => {
      if (!selectedInstance) return;
      const { config: patchConfig, ...layoutPatch } = patch;
      updateInstance(selectedInstance.instanceId, {
        ...layoutPatch,
        config: patchConfig
          ? validateBetterWidgetConfig(selectedInstance.widgetType, patchConfig)
          : selectedInstance.config,
      });
    },
    [selectedInstance, updateInstance],
  );

  const selectInstance = (id) => {
    setSelectedInstanceId(id);
    if (window.innerWidth <= 1100) {
      setLayersOpen(false);
      setSettingsOpen(true);
    }
  };
  const togglePanel = (panel) => {
    if (panel === "layers") {
      const open = !layersOpen;
      setLayersOpen(open);
      if (open && window.innerWidth <= 1100) setSettingsOpen(false);
      if (window.innerWidth > 1100) setPreferences({ layersOpen: open });
    } else {
      const open = !settingsOpen;
      setSettingsOpen(open);
      if (open && window.innerWidth <= 1100) setLayersOpen(false);
      if (window.innerWidth > 1100) setPreferences({ settingsOpen: open });
    }
  };
  const changeZoom = (value, target) => {
    const shell = shellRef.current;
    if (shell)
      pendingViewportRef.current = target || {
        x:
          (shell.scrollLeft +
            shell.clientWidth / 2 -
            Math.max(
              16,
              (shell.clientWidth - BETTER_CANVAS.width * scale) / 2,
            )) /
          scale,
        y:
          (shell.scrollTop +
            shell.clientHeight / 2 -
            Math.max(
              16,
              (shell.clientHeight - BETTER_CANVAS.height * scale) / 2,
            )) /
          scale,
      };
    setPreferences({
      zoom: value === "fit" ? "fit" : clampNumber(value, 0.1, 2, fitScale),
    });
    setViewportRevision((revision) => revision + 1);
  };
  const focusSelection = () => {
    if (!selectedInstance || !shellRef.current) return;
    const shell = shellRef.current;
    changeZoom(
      Math.min(
        (shell.clientWidth - 80) / selectedInstance.width,
        (shell.clientHeight - 80) / selectedInstance.height,
        2,
      ),
      {
        x: selectedInstance.x + selectedInstance.width / 2,
        y: selectedInstance.y + selectedInstance.height / 2,
      },
    );
  };
  const confirmAction = (title, message, action) =>
    setConfirmation({ title, message, action });
  const navigateSource = async (route) => {
    if (operationRef.current) return;
    try {
      await flushDraft();
      navigate(route);
    } catch (failure) {
      retryActionRef.current = () => navigateSource(route);
      setSavingState("error");
      setError(failure);
    }
  };
  const closeActions = (event, action) => {
    event.currentTarget.closest("details").open = false;
    action();
  };
  const status = operation
    ? operation + "..."
    : error
      ? "Save needs attention"
      : savingState === "saving"
        ? "Saving..."
        : dirty
          ? "Unsaved changes"
          : savingState === "copied"
            ? "URL copied"
            : "Saved";
  const publicationStatus = error?.publicationIncomplete
    ? "Publication incomplete"
    : dirty || overlayRecord?.hasUnpublishedChanges
      ? "Unpublished changes"
      : overlayRecord?.publishedVersion > 0
        ? "Published"
        : "Not published";
  const inspectorPreferences = preferences.widgets?.[selectedInstanceId] || {};
  const visibleLayers = layout.instances
    .slice()
    .sort((a, b) => Number(b.zIndex) - Number(a.zIndex))
    .filter((instance) =>
      `${instance.label} ${instance.widgetType}`
        .toLowerCase()
        .includes(layerSearch.toLowerCase().trim()),
    );

  if (loading) return <LoadingSpinner text="Loading editor..." fullPage />;
  if (!overlayRecord)
    return (
      <main className="better-editor-page better-editor-page--error">
        <section className="better-editor-empty">
          <AlertCircle size={24} />
          <h1>Editor unavailable</h1>
          <p>{error?.message || "The overlay could not be loaded."}</p>
          <button type="button" onClick={() => window.location.reload()}>
            Retry
          </button>
        </section>
      </main>
    );

  return (
    <main
      className="better-editor-page editor-workspace"
      data-layers-open={!previewing && layersOpen}
      data-settings-open={!previewing && settingsOpen}
      data-preview={previewing}
      data-busy={Boolean(operation)}
    >
      <header className="better-editor-toolbar editor-topbar">
        <button
          type="button"
          className="editor-icon-button"
          title="Back to apps"
          aria-label="Back to apps"
          disabled={Boolean(operation)}
          onClick={() => navigateSource("/apps")}
        >
          <ArrowLeft size={18} />
        </button>
        <OverlayBuildFolders
          userId={user.id}
          record={overlayRecord}
          layout={layout}
          onSave={flushDraft}
          onSelect={onSelectBuild}
          onRename={(name) => commitLayout((current) => ({ ...current, name }))}
          disabled={Boolean(operation)}
        />
        <div className="editor-history-actions">
          <button
            type="button"
            className="editor-icon-button"
            title="Undo"
            aria-label="Undo"
            disabled={historyIndex <= 0 || Boolean(operation) || previewing}
            onClick={handleUndo}
          >
            <Undo2 size={17} />
          </button>
          <button
            type="button"
            className="editor-icon-button"
            title="Redo"
            aria-label="Redo"
            disabled={
              historyIndex >= history.length - 1 ||
              Boolean(operation) ||
              previewing
            }
            onClick={handleRedo}
          >
            <Redo2 size={17} />
          </button>
        </div>
        <div
          className="editor-save-status"
          role="status"
          aria-live="polite"
          data-error={Boolean(error)}
        >
          <span>{status}</span>
          <small>{publicationStatus}</small>
        </div>
        <div className="editor-publish-actions">
          <button
            type="button"
            aria-pressed={previewing}
            onClick={() => setPreviewing(!previewing)}
          >
            <Eye size={16} />
            <span>{previewing ? "Edit" : "Preview"}</span>
          </button>
          <button
            type="button"
            className="is-primary"
            disabled={Boolean(operation)}
            onClick={publishNow}
          >
            <Send size={16} />
            <span>
              {operation === "Publishing" ? "Publishing..." : "Publish to OBS"}
            </span>
          </button>
          <details className="editor-actions-menu">
            <summary title="More actions" aria-label="More editor actions">
              <MoreHorizontal size={19} />
            </summary>
            <div className="editor-actions-menu-panel">
              <button
                type="button"
                disabled={Boolean(operation)}
                onClick={(event) => closeActions(event, saveDraftNow)}
              >
                <Save size={16} />
                Save Draft
              </button>
              <button
                type="button"
                onClick={(event) =>
                  closeActions(event, () => copyUrl(fullOverlayUrl))
                }
              >
                <Copy size={16} />
                Copy Overlay URL
              </button>
              <button
                type="button"
                disabled={Boolean(operation)}
                onClick={(event) =>
                  closeActions(event, () =>
                    confirmAction(
                      "Regenerate OBS link?",
                      "The current OBS URL will stop working. Your layout will stay unchanged.",
                      regenerateLinkNow,
                    ),
                  )
                }
              >
                <RefreshCw size={16} />
                Regenerate Link
              </button>
              <button
                type="button"
                disabled={Boolean(operation) || !overlayRecord.publishedLayout}
                onClick={(event) =>
                  closeActions(event, () =>
                    confirmAction(
                      "Revert to published layout?",
                      "Unpublished layout changes in this build will be replaced.",
                      revertNow,
                    ),
                  )
                }
              >
                <RotateCcw size={16} />
                Revert
              </button>
              <button
                type="button"
                disabled={Boolean(operation)}
                onClick={(event) =>
                  closeActions(event, () =>
                    confirmAction(
                      "Reset this build?",
                      "The draft will return to the default widgets. The published overlay will not change until you publish again.",
                      resetLayoutNow,
                    ),
                  )
                }
              >
                <RefreshCw size={16} />
                Reset Layout
              </button>
            </div>
          </details>
        </div>
      </header>

      <aside
        className="better-editor-sidebar"
        aria-label="Layers panel"
        inert={previewing || !layersOpen ? "" : undefined}
      >
        <header className="editor-panel-heading">
          <h2>
            Layers <small>{layout.instances.length}</small>
          </h2>
          <button
            type="button"
            title="Close layers"
            aria-label="Close layers"
            onClick={() => togglePanel("layers")}
          >
            <PanelLeftClose size={17} />
          </button>
        </header>
        <div className="editor-layer-tools">
          <label className="editor-search">
            <Search size={14} />
            <input
              type="search"
              aria-label="Search layers"
              placeholder="Search layers"
              value={layerSearch}
              onChange={(event) => setLayerSearch(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="editor-add-widget"
            disabled={Boolean(operation)}
            onClick={() => setWidgetPickerOpen(true)}
          >
            <Plus size={16} />
            Add widget
          </button>
        </div>
        <fieldset
          className="better-editor-widget-list"
          disabled={Boolean(operation)}
        >
          {visibleLayers.map((instance) => (
            <WidgetListItem
              key={instance.instanceId}
              instance={instance}
              selected={instance.instanceId === selectedInstanceId}
              obsUrl={buildWidgetObsUrl(
                origin,
                publicOverlayId,
                instance.instanceId,
              )}
              onSelect={selectInstance}
              onCopyUrl={copyUrl}
              onDownloadPreset={handleDownloadPreset}
              onToggleVisible={handleToggleVisible}
              onToggleLock={handleToggleLock}
              onDuplicate={handleDuplicate}
              onDelete={(id) =>
                confirmAction(
                  "Delete widget?",
                  "This widget will be removed from the draft. You can undo this change before leaving the build.",
                  () => handleDeleteInstance(id),
                )
              }
              onRename={(id, label) => updateInstance(id, { label })}
              dragging={instance.instanceId === draggedLayerId}
              dragOver={instance.instanceId === dragOverLayerId}
              onLayerDragStart={handleLayerDragStart}
              onLayerDragOver={handleLayerDragOver}
              onLayerDrop={handleLayerDrop}
              onLayerDragEnd={clearLayerDrag}
              onLayerMove={handleLayerMove}
            />
          ))}
          {!visibleLayers.length && (
            <p className="editor-empty-result">No matching layers</p>
          )}
        </fieldset>
      </aside>

      <section className="better-editor-stage">
        <div className="editor-canvas-tools">
          <div>
            <button
              type="button"
              title="Layers"
              aria-label="Toggle layers"
              aria-pressed={layersOpen && !previewing}
              disabled={previewing}
              onClick={() => togglePanel("layers")}
            >
              <Layers size={17} />
            </button>
            <button
              type="button"
              title="Settings"
              aria-label="Toggle settings"
              aria-pressed={settingsOpen && !previewing}
              disabled={previewing}
              onClick={() => togglePanel("settings")}
            >
              <PanelRight size={17} />
            </button>
          </div>
          <div
            className="editor-segmented"
            role="group"
            aria-label="Preview data"
          >
            <button
              type="button"
              aria-pressed={dataMode === "mock"}
              onClick={() => setDataMode("mock")}
            >
              Sample data
            </button>
            <button
              type="button"
              aria-pressed={dataMode === "live"}
              onClick={() => setDataMode("live")}
            >
              Live
            </button>
          </div>
          <div className="editor-zoom-tools">
            <button
              type="button"
              title="Zoom out"
              aria-label="Zoom out"
              disabled={previewing || scale <= 0.1}
              onClick={() => changeZoom(scale - 0.1)}
            >
              <ZoomOut size={17} />
            </button>
            <select
              aria-label="Canvas zoom"
              value={
                preferences.zoom === "fit" || !Number.isFinite(zoom)
                  ? "fit"
                  : String(scale)
              }
              disabled={previewing}
              onChange={(event) => changeZoom(event.target.value)}
            >
              <option value="fit">Fit</option>
              {[
                0.1,
                0.25,
                0.5,
                0.75,
                1,
                1.5,
                2,
                ...(![0.1, 0.25, 0.5, 0.75, 1, 1.5, 2].includes(scale)
                  ? [scale]
                  : []),
              ]
                .sort((a, b) => a - b)
                .map((value) => (
                  <option key={value} value={String(value)}>
                    {Math.round(value * 100)}%
                  </option>
                ))}
            </select>
            <button
              type="button"
              title="Zoom in"
              aria-label="Zoom in"
              disabled={previewing || scale >= 2}
              onClick={() => changeZoom(scale + 0.1)}
            >
              <ZoomIn size={17} />
            </button>
            <button
              type="button"
              title="Fit canvas"
              aria-label="Fit canvas"
              onClick={() =>
                changeZoom("fit", {
                  x: BETTER_CANVAS.width / 2,
                  y: BETTER_CANVAS.height / 2,
                })
              }
            >
              <Scan size={17} />
            </button>
            <button
              type="button"
              title="Zoom to selection"
              aria-label="Zoom to selection"
              disabled={!selectedInstance || previewing}
              onClick={focusSelection}
            >
              <Focus size={17} />
            </button>
            <button
              type="button"
              title={showGrid ? "Hide grid and center guides" : "Show grid and center guides"}
              aria-label="Show editor grid"
              aria-pressed={showGrid}
              disabled={previewing}
              onClick={() => setPreferences({ showGrid: !showGrid })}
            >
              <Grid2X2 size={17} />
            </button>
            <button
              type="button"
              title="Snap to grid and widgets"
              aria-label="Snapping"
              aria-pressed={snapping}
              disabled={previewing}
              onClick={() => setPreferences({ snapping: !snapping })}
            >
              <Magnet size={17} />
            </button>
          </div>
        </div>
        {error && (
          <div className="editor-save-error" role="alert">
            <AlertCircle size={16} />
            <span>{error.message}</span>
            <button
              type="button"
              disabled={Boolean(operation)}
              onClick={() => (retryActionRef.current || saveDraftNow)()}
            >
              {retryActionRef.current ? "Retry" : "Retry save"}
            </button>
            <button
              type="button"
              aria-label="Dismiss error"
              onClick={() => setError(null)}
            >
              <X size={16} />
            </button>
          </div>
        )}
        <div className="better-editor-canvas-shell" data-grid={gridVisible} ref={shellRef}>
          <div
            className="editor-canvas-pan-area"
            style={{
              width: Math.max(0, BETTER_CANVAS.width * scale + 32),
              height: Math.max(0, BETTER_CANVAS.height * scale + 32),
            }}
          >
            <div
              className="better-editor-canvas-viewport"
              style={{
                width: BETTER_CANVAS.width * scale,
                height: BETTER_CANVAS.height * scale,
              }}
            >
              <div
                className="better-editor-canvas"
                data-preview={previewing}
                data-grid={gridVisible}
                style={{
                  width: BETTER_CANVAS.width,
                  height: BETTER_CANVAS.height,
                  transform: `scale(${scale})`,
                }}
                onPointerDown={() => setSelectedInstanceId("")}
              >
                {gridVisible && (
                  <>
                    <span className="better-editor-canvas-line better-editor-canvas-line--x" />
                    <span className="better-editor-canvas-line better-editor-canvas-line--y" />
                  </>
                )}
                {layout.instances
                  .slice()
                  .sort((a, b) => Number(a.zIndex) - Number(b.zIndex))
                  .map((instance) => {
                    if (instance.visible === false) return null;
                    const selected =
                      !previewing && instance.instanceId === selectedInstanceId;
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
                          pointerEvents:
                            isBackground || previewing || operation
                              ? "none"
                              : "auto",
                          borderRadius: getEditorInstanceBorderRadius(instance),
                        }}
                        onPointerDown={(event) =>
                          beginInteraction(event, instance, "drag")
                        }
                      >
                        {!isBackground && !previewing && (
                          <span className="better-editor-canvas-instance__tag">
                            <MousePointer2 size={12} />
                            {instance.label}
                          </span>
                        )}
                        <div className="better-editor-canvas-instance__content">
                          <BetterEditorWidgetBoundary
                            instanceId={instance.instanceId}
                          >
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
                        {selected &&
                          !instance.locked &&
                          !isBackground &&
                          !operation && (
                            <div className="better-editor-resize-handles">
                              {RESIZE_HANDLES.map((handle) => (
                                <button
                                  key={handle}
                                  type="button"
                                  className={`better-editor-resize-handle better-editor-resize-handle--${handle}`}
                                  aria-label={`Resize ${handle}`}
                                  onPointerDown={(event) =>
                                    beginInteraction(
                                      event,
                                      instance,
                                      "resize",
                                      handle,
                                    )
                                  }
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
        </div>
      </section>

      <aside
        className="better-editor-settings"
        aria-label="Widget settings"
        inert={previewing || !settingsOpen ? "" : undefined}
      >
        <header className="editor-panel-heading">
          <h2 title={selectedInstance?.label}>
            {selectedInstance?.label || "Widget settings"}
          </h2>
          <button
            type="button"
            title="Close settings"
            aria-label="Close settings"
            onClick={() => togglePanel("settings")}
          >
            <X size={17} />
          </button>
        </header>
        <fieldset
          className="better-editor-settings-scroll"
          disabled={Boolean(operation)}
        >
          {!selectedInstance ? (
            <section className="better-editor-empty">
              <MousePointer2 size={24} />
              <h3>Select a widget</h3>
            </section>
          ) : (
            <EditorInspector
              key={selectedInstance.instanceId}
              instance={selectedInstance}
              preferences={inspectorPreferences}
              onPreferences={(patch) =>
                setPreferences((current) => ({
                  widgets: {
                    ...current.widgets,
                    [selectedInstanceId]: {
                      ...current.widgets?.[selectedInstanceId],
                      ...patch,
                    },
                  },
                }))
              }
              onUpdate={(patch) => updateInstance(selectedInstanceId, patch)}
              onConfigChange={handleConfigChange}
              onWidgetChange={handleWidgetChange}
              onNavigateSource={navigateSource}
              widget={selectedLegacyWidget}
              allWidgets={legacyWidgets}
              user={user}
              dataMode={dataMode}
            />
          )}
        </fieldset>
      </aside>
      {!previewing && (layersOpen || settingsOpen) && (
        <button
          type="button"
          className="editor-panel-backdrop"
          aria-label="Close editor panel"
          onClick={() => {
            setLayersOpen(false);
            setSettingsOpen(false);
          }}
        />
      )}
      <footer className="better-editor-footer">
        <span>
          {previewing ? "Preview" : "Editor"} / {layout.name}
        </span>
        <span>
          {BETTER_CANVAS.width} x {BETTER_CANVAS.height} /{" "}
          {Math.round(scale * 100)}%
        </span>
      </footer>
      <EditorWidgetPicker
        open={widgetPickerOpen}
        onClose={() => setWidgetPickerOpen(false)}
        definitions={addableDefinitions}
        onAdd={handleAddWidget}
      />
      <dialog
        className="editor-dialog editor-confirm-dialog"
        aria-labelledby="editor-confirm-title"
        ref={confirmDialogRef}
        onClose={() => setConfirmation(null)}
      >
        <h2 id="editor-confirm-title">{confirmation?.title}</h2>
        <p>{confirmation?.message}</p>
        <footer>
          <button type="button" onClick={() => setConfirmation(null)}>
            Cancel
          </button>
          <button
            type="button"
            className="is-primary"
            onClick={() => {
              const action = confirmation.action;
              setConfirmation(null);
              action();
            }}
          >
            Confirm
          </button>
        </footer>
      </dialog>
    </main>
  );
}
