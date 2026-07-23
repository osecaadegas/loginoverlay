/**
 * WidgetManager.jsx — Widget list + add/remove/configure widgets
 */
import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  memo,
} from "react";
import {
  getWidgetDef,
  getWidgetStyleDefaultSize,
  getWidgetsByCategory,
} from "./widgets/widgetRegistry";
import { swapStyleConfig } from "./widgets/shared/perStyleConfig";
import { getStyleKeysForWidget } from "./widgets/styleKeysRegistry";
import { useAuth } from "../../context/AuthContext";
import buildThemeVars from "./themeVarsBuilder";
import { FONT_OPTIONS } from "./appearance/editorSchema";
import { FontSelectInput } from "./appearance/propertyControls";
import "./OverlayRenderer.css";

function buildWidgetStyleUpdate(widget, nextStyleId, currentStyleId) {
  const def = getWidgetDef(widget.widget_type);
  const key = def?.styleConfigKey || "displayStyle";
  const currentStyle =
    currentStyleId || widget.config?.[key] || def?.styles?.[0]?.id;
  const styleKeys = getStyleKeysForWidget(widget.widget_type);
  const config = styleKeys
    ? swapStyleConfig(
        widget.config || {},
        currentStyle,
        nextStyleId,
        styleKeys,
        key,
      )
    : { ...widget.config, [key]: nextStyleId };
  const defaultSize = getWidgetStyleDefaultSize(
    widget.widget_type,
    nextStyleId,
  );
  return defaultSize
    ? {
        ...widget,
        width: defaultSize.width,
        height: defaultSize.height,
        config,
      }
    : { ...widget, config };
}

function getDragOverlayCursor(isLocked, isSelected) {
  if (isLocked) return "not-allowed";
  return isSelected ? "grab" : "pointer";
}

function ResizeHandle({ direction, onResizeStart }) {
  const isCorner = direction.length === 2;
  const className = isCorner
    ? `wm-resize-handle wm-resize-${direction}`
    : `wm-resize-edge wm-resize-${direction}`;
  return (
    <button
      type="button"
      className={className}
      aria-label={`Resize ${direction}`}
      onMouseDown={(event) => onResizeStart(event, direction)}
    />
  );
}

/* ── Draggable preview slot — OBS-style click & drag + resize ── */
const DraggableSlot = memo(function DraggableSlot({
  widget,
  theme,
  allWidgets,
  isSelected,
  scale,
  onSelect,
  onMove,
  onResize,
  onStyleCycle,
  onContextMenu,
  userId,
  canvasW,
  canvasH,
  animClass,
  exiting,
}) {
  const def = getWidgetDef(widget.widget_type);
  const Component = def?.component;
  const slotRef = useRef(null);
  const coordsRef = useRef(null);
  const isBg = widget.widget_type === "background";

  /* Block native text selection during any drag */
  const blockSelect = useCallback((e) => e.preventDefault(), []);

  function startDrag(mode) {
    document.body.classList.add(
      mode === "resize" ? "wm-resizing" : "wm-dragging",
    );
    document.addEventListener("selectstart", blockSelect);
    window.getSelection()?.removeAllRanges();
  }
  function endDrag() {
    document.body.classList.remove("wm-dragging", "wm-resizing");
    document.removeEventListener("selectstart", blockSelect);
  }

  const isLocked = !!widget.config?._locked;
  const isPreviewHidden = !!widget.config?._previewHidden;

  /* ── Drag to move — update DOM directly, save on mouseup ── */
  const handleMouseDown = useCallback(
    (e) => {
      if (
        e.target.closest(".wm-resize-handle") ||
        e.target.closest(".wm-resize-edge")
      )
        return;
      e.preventDefault();
      e.stopPropagation();
      onSelect(widget.id);
      if (isLocked) return; // locked — select but don't drag

      const el = slotRef.current;
      if (!el) return;

      const startX = e.clientX;
      const startY = e.clientY;
      const origPx = widget.position_x;
      const origPy = widget.position_y;
      let curX = origPx,
        curY = origPy;

      startDrag("move");

      function onMouseMove(ev) {
        ev.preventDefault();
        const dx = (ev.clientX - startX) / scale;
        const dy = (ev.clientY - startY) / scale;
        curX = Math.max(0, Math.round(origPx + dx));
        curY = Math.max(0, Math.round(origPy + dy));
        el.style.left = curX + "px";
        el.style.top = curY + "px";
        if (coordsRef.current) {
          coordsRef.current.textContent = `${curX}, ${curY} — ${Math.round(widget.width)}×${Math.round(widget.height)}`;
        }
      }

      function onMouseUp() {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        endDrag();
        document.body.style.cursor = "";
        onMove(widget.id, curX, curY);
      }

      document.body.style.cursor = "grabbing";
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [
      widget.id,
      widget.position_x,
      widget.position_y,
      widget.width,
      widget.height,
      scale,
      onSelect,
      onMove,
      blockSelect,
    ],
  );

  /* ── Resize from corner handle — update DOM directly, save on mouseup ── */
  const handleResizeDown = useCallback(
    (e, corner) => {
      e.preventDefault();
      e.stopPropagation();
      onSelect(widget.id);
      if (isLocked) return; // locked — no resize

      const el = slotRef.current;
      if (!el) return;

      const startX = e.clientX;
      const startY = e.clientY;
      const origW = widget.width;
      const origH = widget.height;
      const origPx = widget.position_x;
      const origPy = widget.position_y;
      let curX = origPx,
        curY = origPy,
        curW = origW,
        curH = origH;

      startDrag("resize");

      function onMouseMove(ev) {
        ev.preventDefault();
        const dx = (ev.clientX - startX) / scale;
        const dy = (ev.clientY - startY) / scale;
        curW = origW;
        curH = origH;
        curX = origPx;
        curY = origPy;

        if (corner === "se") {
          curW = Math.max(20, origW + dx);
          curH = Math.max(20, origH + dy);
        } else if (corner === "sw") {
          curW = Math.max(20, origW - dx);
          curH = Math.max(20, origH + dy);
          curX = origPx + (origW - curW);
        } else if (corner === "ne") {
          curW = Math.max(20, origW + dx);
          curH = Math.max(20, origH - dy);
          curY = origPy + (origH - curH);
        } else if (corner === "nw") {
          curW = Math.max(20, origW - dx);
          curH = Math.max(20, origH - dy);
          curX = origPx + (origW - curW);
          curY = origPy + (origH - curH);
        } else if (corner === "n") {
          curH = Math.max(20, origH - dy);
          curY = origPy + (origH - curH);
        } else if (corner === "s") {
          curH = Math.max(20, origH + dy);
        } else if (corner === "e") {
          curW = Math.max(20, origW + dx);
        } else if (corner === "w") {
          curW = Math.max(20, origW - dx);
          curX = origPx + (origW - curW);
        }

        curX = Math.round(curX);
        curY = Math.round(curY);
        curW = Math.round(curW);
        curH = Math.round(curH);
        el.style.left = curX + "px";
        el.style.top = curY + "px";
        el.style.width = curW + "px";
        el.style.height = curH + "px";
        if (coordsRef.current) {
          coordsRef.current.textContent = `${curX}, ${curY} — ${curW}×${curH}`;
        }
      }

      function onMouseUp() {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        endDrag();
        document.body.style.cursor = "";
        onResize(widget.id, curX, curY, curW, curH);
      }

      const cursorMap = {
        se: "nwse-resize",
        nw: "nwse-resize",
        sw: "nesw-resize",
        ne: "nesw-resize",
        n: "ns-resize",
        s: "ns-resize",
        e: "ew-resize",
        w: "ew-resize",
      };
      document.body.style.cursor = cursorMap[corner] || "nwse-resize";
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [
      widget.id,
      widget.width,
      widget.height,
      widget.position_x,
      widget.position_y,
      scale,
      onSelect,
      onResize,
      blockSelect,
    ],
  );

  if (!Component) return null;

  return (
    <div
      ref={slotRef}
      className={`wm-live-slot ${isSelected ? "wm-live-slot--selected" : ""} ${animClass || ""}`}
      style={{
        position: "absolute",
        left: isBg ? 0 : widget.position_x,
        top: isBg ? 0 : widget.position_y,
        width: isBg ? canvasW : widget.width,
        height: isBg ? canvasH : widget.height,
        zIndex: isSelected ? 9999 : widget.z_index || 1,
        pointerEvents: exiting ? "none" : undefined,
        animationDuration: `${(widget.config?.animSpeed || 1) * 0.35}s`,
        opacity: isPreviewHidden ? 0.15 : undefined,
        transition: "opacity 0.2s ease",
      }}
    >
      {/* Element-scoped CSS overrides */}
      {(() => {
        const elCSS = widget.config?.elementCSS;
        if (!elCSS || Object.keys(elCSS).length === 0) return null;
        const slotId = `wm-el-${widget.id}`;
        const rules = Object.entries(elCSS)
          .map(([sel, props]) => {
            const decls = Object.entries(props)
              .filter(([k]) => k !== "_init")
              .map(([k, v]) => `${k}:${v}`)
              .join(";");
            const scoped = sel
              .split(",")
              .map((s) => `#${slotId} ${s.trim()}`)
              .join(",");
            return decls ? `${scoped}{${decls}}` : "";
          })
          .filter(Boolean)
          .join("\n");
        return rules ? <style>{rules}</style> : null;
      })()}
      {/* Widget content */}
      <div
        id={`wm-el-${widget.id}`}
        style={{
          pointerEvents: "none",
          width: "100%",
          height: "100%",
          position: "relative",
          zIndex: 1,
          clipPath: widget.config?.cardRadius
            ? `inset(0 round ${widget.config.cardRadius}px)`
            : undefined,
          ...Object.fromEntries(
            Object.entries(widget.config?.advancedCSS || {}).map(([k, v]) => [
              k.replace(/-([a-z])/g, (_, c) => c.toUpperCase()),
              v,
            ]),
          ),
        }}
      >
        <Component
          config={widget.config}
          theme={theme}
          allWidgets={allWidgets}
          widgetId={widget.id}
          userId={userId}
        />
      </div>

      {/* Transparent drag surface on top — catches ALL mouse events (skip for background) */}
      {!isBg && (
        <button
          type="button"
          className="wm-drag-overlay"
          aria-label={`Select and move ${def?.label || widget.widget_type}`}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 2,
            cursor: getDragOverlayCursor(isLocked, isSelected),
            background: "transparent",
          }}
          onMouseDown={handleMouseDown}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSelect(widget.id);
            onContextMenu?.(e, widget);
          }}
          onDragStart={(e) => e.preventDefault()}
        />
      )}

      {/* Selection overlay + resize handles (highest z) — skip for background */}
      {isSelected && !isBg && (
        <div className="wm-slot-selection" style={{ zIndex: 3 }}>
          <ResizeHandle direction="nw" onResizeStart={handleResizeDown} />
          <ResizeHandle direction="ne" onResizeStart={handleResizeDown} />
          <ResizeHandle direction="sw" onResizeStart={handleResizeDown} />
          <ResizeHandle direction="se" onResizeStart={handleResizeDown} />
          {/* Edge handles — resize one axis only */}
          <ResizeHandle direction="n" onResizeStart={handleResizeDown} />
          <ResizeHandle direction="s" onResizeStart={handleResizeDown} />
          <ResizeHandle direction="e" onResizeStart={handleResizeDown} />
          <ResizeHandle direction="w" onResizeStart={handleResizeDown} />
          {def?.styles?.length > 1 && (
            <button
              className="wm-style-cycle-btn"
              title={`Style: ${(def.styles.find((s) => s.id === (widget.config?.[def.styleConfigKey || "displayStyle"] || def.styles[0].id)) || def.styles[0]).label} — click to cycle`}
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onStyleCycle?.(widget);
              }}
            >
              🎨
            </button>
          )}
          <div className="wm-slot-coords" ref={coordsRef}>
            {Math.round(widget.position_x)}, {Math.round(widget.position_y)} —{" "}
            {Math.round(widget.width)}×{Math.round(widget.height)}
          </div>
        </div>
      )}
    </div>
  );
});

function buildSharedSyncedConfig(nb) {
  return {
    ...(nb.fontFamily != null && { fontFamily: nb.fontFamily }),
    ...(nb.fontSize != null && { fontSize: nb.fontSize }),
    ...(nb.brightness != null && { brightness: nb.brightness }),
    ...(nb.contrast != null && { contrast: nb.contrast }),
    ...(nb.saturation != null && { saturation: nb.saturation }),
  };
}

function mergeSyncedConfig(currentConfig, nb, patch) {
  return { ...currentConfig, ...patch, ...buildSharedSyncedConfig(nb) };
}

function buildDefaultSyncedConfig(currentConfig, nb) {
  return mergeSyncedConfig(currentConfig, nb, {
    ...(nb.bgColor != null && { bgColor: nb.bgColor }),
    ...(nb.accentColor != null && { accentColor: nb.accentColor }),
    ...(nb.textColor != null && { textColor: nb.textColor }),
    ...(nb.mutedColor != null && { mutedColor: nb.mutedColor }),
    ...(nb.borderColor != null && { borderColor: nb.borderColor }),
    ...(nb.cardBg != null && { cardBg: nb.cardBg }),
  });
}

const SYNC_CONFIG_BUILDERS = {
  image_slideshow: (config, nb) =>
    mergeSyncedConfig(config, nb, {
      borderColor: nb.accentColor || "rgba(51,65,85,0.5)",
      gradientColor: nb.bgColor || "rgba(15,23,42,0.8)",
      captionColor: nb.textColor || "#e2e8f0",
    }),
  rtp_stats: (config, nb) =>
    mergeSyncedConfig(config, nb, {
      barBgFrom: nb.bgColor || "#111827",
      barBgVia: nb.bgColor || "#1e3a5f",
      barBgTo: nb.bgColor || "#111827",
      borderColor: nb.accentColor || "#1d4ed8",
      textColor: nb.textColor || "#ffffff",
      providerColor: nb.textColor || "#ffffff",
      slotNameColor: nb.textColor || "#ffffff",
    }),
  background: (config, nb) =>
    mergeSyncedConfig(config, nb, {
      color1: nb.bgColor || "#0f172a",
      color2: nb.accentColor || "#1e3a5f",
    }),
  chat: (config, nb) =>
    mergeSyncedConfig(config, nb, {
      bgColor: nb.bgColor || "#111318",
      textColor: nb.textColor || "#f1f5f9",
      headerBg: nb.bgColor || "#111318",
      headerText: nb.mutedColor || "#94a3b8",
      borderColor: nb.accentColor || "#f59e0b",
    }),
  bonus_hunt: (config, nb) =>
    mergeSyncedConfig(config, nb, {
      headerColor: nb.bgColor || "#111318",
      headerAccent: nb.accentColor || "#f59e0b",
      countCardColor: nb.bgColor || "#111318",
      currentBonusColor: nb.bgColor || "#111318",
      currentBonusAccent: nb.accentColor || "#f59e0b",
      listCardColor: nb.bgColor || "#111318",
      listCardAccent: nb.accentColor || "#f59e0b",
      summaryColor: nb.bgColor || "#111318",
      totalPayColor: nb.accentColor || "#f59e0b",
      totalPayText: nb.textColor || "#f1f5f9",
      superBadgeColor: nb.ctaColor || "#f43f5e",
      extremeBadgeColor: nb.ctaColor || "#f43f5e",
      textColor: nb.textColor || "#f1f5f9",
      mutedTextColor: nb.mutedColor || "#94a3b8",
      statValueColor: nb.textColor || "#f1f5f9",
      cardOutlineColor: nb.borderColor || nb.accentColor || "#f59e0b",
      cardOutlineWidth: nb.borderWidth ?? 2,
    }),
  tournament: (config, nb) =>
    mergeSyncedConfig(config, nb, {
      bgColor: nb.bgColor || "#13151e",
      cardBg: nb.bgColor ? `${nb.bgColor}cc` : "#1a1d2e",
      cardBorder: nb.accentColor
        ? `${nb.accentColor}30`
        : "rgba(255,255,255,0.08)",
      nameColor: nb.textColor || "#ffffff",
      multiColor: nb.accentColor || "#facc15",
      swordColor: nb.accentColor || "#eab308",
      slotNameColor: nb.textColor || "#ffffff",
      tabBg: "rgba(255,255,255,0.06)",
      tabActiveBg: nb.accentColor
        ? `${nb.accentColor}25`
        : "rgba(255,255,255,0.15)",
      tabColor: nb.mutedColor || "#94a3b8",
      tabActiveColor: nb.accentColor || "#ffffff",
      tabBorder: nb.accentColor
        ? `${nb.accentColor}20`
        : "rgba(255,255,255,0.12)",
      bkAccent: nb.accentColor || "#6366f1",
      bkHeaderColor: nb.mutedColor || "#94a3b8",
      xIconColor: nb.accentColor || "#eab308",
    }),
  random_slot_picker: (config, nb) =>
    mergeSyncedConfig(config, nb, {
      bgColor: nb.bgColor || "#13151e",
      cardBg: nb.bgColor ? `${nb.bgColor}cc` : "rgba(255,255,255,0.04)",
      borderColor: nb.accentColor
        ? `${nb.accentColor}30`
        : "rgba(255,255,255,0.08)",
      accentColor: nb.accentColor || "#f59e0b",
      textColor: nb.textColor || "#ffffff",
      mutedColor: nb.mutedColor || "#94a3b8",
    }),
  giveaway: (config, nb) =>
    mergeSyncedConfig(config, nb, {
      bgColor: nb.bgColor || "#13151e",
      accentColor: nb.accentColor || "#9346ff",
      textColor: nb.textColor || "#ffffff",
    }),
  bonus_buys: (config, nb) =>
    mergeSyncedConfig(config, nb, {
      bgColor: nb.bgColor || "#0a0e1a",
      accentColor: nb.accentColor || "#3b82f6",
      textColor: nb.textColor || "#ffffff",
      mutedColor: nb.mutedColor || "#64748b",
    }),
  slot_requests: (config, nb) =>
    mergeSyncedConfig(config, nb, {
      bgColor: nb.bgColor || "transparent",
      accentColor: nb.accentColor || "#94a3b8",
      textColor: nb.textColor || "#ffffff",
      mutedColor: nb.mutedColor || "#94a3b8",
      cardBg: nb.bgColor ? `${nb.bgColor}0a` : "rgba(255,255,255,0.04)",
      borderColor: nb.borderColor || "rgba(255,255,255,0.08)",
    }),
  current_slot: (config, nb) =>
    mergeSyncedConfig(config, nb, {
      accentColor: nb.accentColor || "#f59e0b",
      textColor: nb.textColor || "#ffffff",
      mutedColor: nb.mutedColor || "#94a3b8",
    }),
  bh_stats: (config, nb) =>
    mergeSyncedConfig(config, nb, {
      bgColor: nb.bgColor || "rgba(15,23,42,0.9)",
      cardBg: nb.bgColor ? `${nb.bgColor}0a` : "rgba(255,255,255,0.04)",
      accentColor: nb.accentColor || "#818cf8",
      textColor: nb.textColor || "#f1f5f9",
      mutedColor: nb.mutedColor || "#64748b",
      borderColor: nb.borderColor || "rgba(255,255,255,0.06)",
      progressColor: nb.accentColor || "#22c55e",
      bestColor: "#22c55e",
      worstColor: "#f87171",
    }),
  navbar: (config, nb) =>
    mergeSyncedConfig(config, nb, {
      bgColor: nb.bgColor || "#111318",
      accentColor: nb.accentColor || "#f59e0b",
      textColor: nb.textColor || "#f1f5f9",
      mutedColor: nb.mutedColor || "#94a3b8",
      borderColor: nb.borderColor || nb.accentColor || "#f59e0b",
      ctaColor: nb.ctaColor || "#f43f5e",
    }),
  coin_flip: (config, nb) =>
    mergeSyncedConfig(config, nb, {
      headsColor: nb.accentColor || "#f59e0b",
      tailsColor: nb.bgColor || "#3b82f6",
      accentColor: nb.accentColor || "#f59e0b",
      textColor: nb.textColor || "#ffffff",
    }),
  spotify_now_playing: (config, nb) =>
    mergeSyncedConfig(config, nb, { accentColor: nb.accentColor || "#1DB954" }),
  raid_shoutout: (config, nb) =>
    mergeSyncedConfig(config, nb, {
      accentColor: nb.accentColor || "#9146FF",
      bgColor: nb.bgColor || "#111318",
      textColor: nb.textColor || "#ffffff",
    }),
  salty_words: (config, nb) =>
    mergeSyncedConfig(config, nb, {
      accentColor: nb.accentColor || "#f59e0b",
      textColor: nb.textColor || "#ffffff",
      cardBg: nb.bgColor || "#1e293b",
    }),
  predictions: (config, nb) =>
    mergeSyncedConfig(config, nb, {
      accentColor: nb.accentColor || "#7c3aed",
      textColor: nb.textColor || "#ffffff",
    }),
};

/* ── Per-widget sync mapping from navbar config ── */
export function buildSyncedConfig(widgetType, currentConfig, nb) {
  if (!nb) return null;
  const builder = SYNC_CONFIG_BUILDERS[widgetType] || buildDefaultSyncedConfig;
  return builder(currentConfig || {}, nb);
}

function normalizeAnimationName(value) {
  return value === "slide" ? "slide-up" : value || "fade";
}

function getWidgetAnimationMs(widget) {
  return ((widget.config?.animSpeed || 1) * 0.35 + 0.15) * 1000;
}

function addExitAnimation({ exitingMapRef, id, setExitTick, widget }) {
  const exitAnim = widget.exit_animation || widget.animation || "fade";
  if (exitAnim === "none") return;
  if (exitingMapRef.current.has(id)) {
    clearTimeout(exitingMapRef.current.get(id).timer);
  }
  const timer = setTimeout(() => {
    exitingMapRef.current.delete(id);
    setExitTick((tick) => tick + 1);
  }, getWidgetAnimationMs(widget));
  exitingMapRef.current.set(id, { widget, timer });
  setExitTick((tick) => tick + 1);
}

function syncExitAnimations({
  currentIds,
  exitingMapRef,
  prevIds,
  setExitTick,
  widgets,
}) {
  for (const id of prevIds) {
    if (currentIds.has(id)) continue;
    const widget = widgets.find((item) => item.id === id);
    if (!widget) continue;
    addExitAnimation({ exitingMapRef, id, setExitTick, widget });
  }
}

function buildEnterAnimations({ currentIds, exitingMapRef, prevIds, widgets }) {
  const newEnter = new Map();
  let maxEnterMs = 0;
  for (const id of currentIds) {
    if (exitingMapRef.current.has(id)) {
      clearTimeout(exitingMapRef.current.get(id).timer);
      exitingMapRef.current.delete(id);
    }
    if (prevIds.has(id)) continue;
    const widget = widgets.find((item) => item.id === id);
    if (!widget || widget.animation === "none") continue;
    newEnter.set(id, `or-anim-in--${normalizeAnimationName(widget.animation)}`);
    maxEnterMs = Math.max(maxEnterMs, getWidgetAnimationMs(widget));
  }
  return { maxEnterMs, newEnter };
}

function applyEnterAnimations({ maxEnterMs, newEnter, setEnterAnims }) {
  if (newEnter.size <= 0) return;
  setEnterAnims(newEnter);
  setTimeout(() => setEnterAnims(new Map()), maxEnterMs || 400);
}

function buildExitingWidgets(exitingMap) {
  return Array.from(exitingMap.entries()).map(([, entry]) => ({
    ...entry.widget,
    _exitAnimClass: `or-anim-out--${normalizeAnimationName(
      entry.widget.exit_animation || entry.widget.animation,
    )}`,
  }));
}

function getLatestWidget(widgets, widget) {
  return widgets.find((item) => item.id === widget.id) || widget;
}

function cloneStyleMap(value) {
  return structuredClone(value || {});
}

function updateWidgetAdvancedCss({ handleConfigChange, prop, value, widget, widgets }) {
  const latest = getLatestWidget(widgets, widget);
  const advancedCSS = { ...latest.config?.advancedCSS };
  if (value === "" || value === undefined) {
    delete advancedCSS[prop];
  } else {
    advancedCSS[prop] = value;
  }
  handleConfigChange(latest, { ...latest.config, advancedCSS });
}

function updateWidgetElementCss({
  handleConfigChange,
  prop,
  selector,
  value,
  widget,
  widgets,
}) {
  const latest = getLatestWidget(widgets, widget);
  const elementCSS = cloneStyleMap(latest.config?.elementCSS);
  elementCSS[selector] = elementCSS[selector] || {};
  if (value === "" || value === undefined) {
    delete elementCSS[selector][prop];
    if (Object.keys(elementCSS[selector]).length === 0) delete elementCSS[selector];
  } else {
    elementCSS[selector][prop] = value;
  }
  handleConfigChange(latest, { ...latest.config, elementCSS });
}

function removeWidgetElementTarget({ handleConfigChange, selector, widget, widgets }) {
  const latest = getLatestWidget(widgets, widget);
  const elementCSS = cloneStyleMap(latest.config?.elementCSS);
  delete elementCSS[selector];
  handleConfigChange(latest, { ...latest.config, elementCSS });
}

function clearInitialElementTarget({ handleConfigChange, selector, widget, widgets }) {
  const latest = getLatestWidget(widgets, widget);
  const elementCSS = cloneStyleMap(latest.config?.elementCSS);
  if (!elementCSS[selector]?._init) return;
  delete elementCSS[selector]._init;
  if (Object.keys(elementCSS[selector]).length === 0) elementCSS[selector] = {};
  handleConfigChange(latest, { ...latest.config, elementCSS });
}

function scheduleClearInitialElementTarget(args) {
  setTimeout(() => clearInitialElementTarget(args), 50);
}

function getAvailableElementTargetGroups(targets, activeTargets) {
  return targets.map((group) => ({
    ...group,
    items: group.items.filter((item) => !activeTargets.includes(item.sel)),
  }));
}

function getElementTargetLabel(targets, selector) {
  return (
    targets.flatMap((group) => group.items).find((item) => item.sel === selector)
      ?.label || selector
  );
}

function AdvancedCssControl({ prop, value, onChange }) {
  if (prop.type === "select" && prop.p === "font-family") {
    return (
      <FontSelectInput
        value={value || ""}
        options={FONT_OPTIONS}
        onChange={(nextValue) => onChange(prop.p, nextValue)}
        inheritedLabel="—"
        className="oc-config-font-select"
      />
    );
  }
  if (prop.type === "select") {
    return (
      <select
        className="wm-ctx-adv-input"
        value={value || ""}
        onChange={(event) => onChange(prop.p, event.target.value)}
      >
        <option value="">—</option>
        {prop.opts.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }
  if (prop.type === "color") {
    return (
      <div className="wm-ctx-adv-color-wrap">
        <input
          type="color"
          className="wm-ctx-color-input"
          value={value || prop.ph}
          onChange={(event) => onChange(prop.p, event.target.value)}
        />
        <input
          type="text"
          className="wm-ctx-adv-input wm-ctx-adv-input--short"
          value={value || ""}
          placeholder={prop.ph}
          onChange={(event) => onChange(prop.p, event.target.value)}
        />
      </div>
    );
  }
  if (prop.type === "presets") {
    const selectedValue = value && prop.opts.includes(value) ? value : "__custom";
    const customLabel = value && !prop.opts.includes(value) ? value : "— pick —";
    return (
      <div className="wm-ctx-adv-combo">
        <select
          className="wm-ctx-adv-combo-select"
          value={selectedValue}
          onChange={(event) => {
            if (event.target.value !== "__custom") onChange(prop.p, event.target.value);
          }}
        >
          <option value="__custom">{customLabel}</option>
          {prop.opts.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <input
          type="text"
          className="wm-ctx-adv-combo-input"
          value={value || ""}
          placeholder={prop.ph}
          onChange={(event) => onChange(prop.p, event.target.value)}
        />
      </div>
    );
  }
  return (
    <input
      type="text"
      className="wm-ctx-adv-input"
      value={value || ""}
      placeholder={prop.ph}
      onChange={(event) => onChange(prop.p, event.target.value)}
    />
  );
}

function AdvancedCssRow({ prop, value, onChange }) {
  const isSet = value !== undefined && value !== "";
  return (
    <div className={`wm-ctx-adv-row ${isSet ? "wm-ctx-adv-row--active" : ""}`}>
      <span className="wm-ctx-adv-label" title={prop.p}>
        {prop.label}
      </span>
      <AdvancedCssControl prop={prop} value={value} onChange={onChange} />
      {isSet && (
        <button
          type="button"
          className="wm-ctx-adv-clear"
          title="Reset"
          onClick={() => onChange(prop.p, "")}
        >
          ✕
        </button>
      )}
    </div>
  );
}

function AdvancedCssGroup({ group, values, onChange }) {
  return (
    <details className="wm-ctx-adv-group">
      <summary className="wm-ctx-adv-group-title">{group.group}</summary>
      <div className="wm-ctx-adv-group-body">
        {group.props.map((prop) => (
          <AdvancedCssRow
            key={prop.p}
            prop={prop}
            value={values[prop.p]}
            onChange={onChange}
          />
        ))}
      </div>
    </details>
  );
}

function ElementStyleControl({ prop, selector, value, onChange }) {
  if (prop.type === "select" && prop.p === "font-family") {
    return (
      <FontSelectInput
        value={value || ""}
        options={[{ value: "inherit", label: "inherit" }, ...FONT_OPTIONS]}
        onChange={(nextValue) => onChange(selector, prop.p, nextValue)}
        inheritedLabel="—"
        className="oc-config-font-select"
      />
    );
  }
  if (prop.type === "select") {
    return (
      <select
        className="wm-ctx-adv-input"
        value={value || ""}
        onChange={(event) => onChange(selector, prop.p, event.target.value)}
      >
        <option value="">—</option>
        {prop.opts.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }
  if (prop.type === "color") {
    return (
      <div className="wm-ctx-adv-color-wrap">
        <input
          type="color"
          className="wm-ctx-color-input"
          value={value || "#ffffff"}
          onChange={(event) => onChange(selector, prop.p, event.target.value)}
        />
        <input
          type="text"
          className="wm-ctx-adv-input wm-ctx-adv-input--short"
          value={value || ""}
          placeholder="#fff"
          onChange={(event) => onChange(selector, prop.p, event.target.value)}
        />
      </div>
    );
  }
  if (prop.type === "presets") {
    const selectedValue = value && prop.opts.includes(value) ? value : "__custom";
    const customLabel = value && !prop.opts.includes(value) ? value : "— pick —";
    return (
      <div className="wm-ctx-adv-combo">
        <select
          className="wm-ctx-adv-combo-select"
          value={selectedValue}
          onChange={(event) => {
            if (event.target.value !== "__custom") {
              onChange(selector, prop.p, event.target.value);
            }
          }}
        >
          <option value="__custom">{customLabel}</option>
          {prop.opts.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <input
          type="text"
          className="wm-ctx-adv-combo-input"
          value={value || ""}
          placeholder="custom"
          onChange={(event) => onChange(selector, prop.p, event.target.value)}
        />
      </div>
    );
  }
  return (
    <input
      type="text"
      className="wm-ctx-adv-input"
      value={value || ""}
      onChange={(event) => onChange(selector, prop.p, event.target.value)}
    />
  );
}

function ElementStylePropertyRow({ prop, selector, value, onChange }) {
  return (
    <div className={`wm-ctx-adv-row ${value ? "wm-ctx-adv-row--active" : ""}`}>
      <span className="wm-ctx-adv-label">{prop.label}</span>
      <ElementStyleControl
        prop={prop}
        selector={selector}
        value={value}
        onChange={onChange}
      />
      {value && (
        <button
          type="button"
          className="wm-ctx-adv-clear"
          title="Reset"
          onClick={() => onChange(selector, prop.p, "")}
        >
          ✕
        </button>
      )}
    </div>
  );
}

function ElementTargetDropdownGroup({ group, onHover, onSelect }) {
  return (
    <div className="wm-ctx-els-dropdown-group">
      <div className="wm-ctx-els-dropdown-group-label">{group.group}</div>
      {group.items.map((item) => (
        <button
          type="button"
          key={item.sel}
          className="wm-ctx-els-dropdown-item"
          onMouseEnter={() => onHover(item.sel)}
          onMouseLeave={() => onHover(null)}
          onClick={() => onSelect(item.sel)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function ElementStyleTarget({
  displayLabel,
  onChange,
  onHover,
  onRemove,
  properties,
  propertyDefs,
  selector,
}) {
  const handleRemove = (event) => {
    event.preventDefault();
    onRemove(selector);
  };
  return (
    <details open className="wm-ctx-els-target">
      <summary
        className="wm-ctx-els-target-header"
        onMouseEnter={() => onHover(selector)}
        onMouseLeave={() => onHover(null)}
      >
        <span className="wm-ctx-els-target-name">{displayLabel}</span>
        <code className="wm-ctx-els-target-sel">{selector}</code>
        <button
          type="button"
          className="wm-ctx-adv-clear"
          title="Remove"
          onClick={handleRemove}
        >
          ✕
        </button>
      </summary>
      <div className="wm-ctx-els-target-body">
        {propertyDefs.map((prop) => (
          <ElementStylePropertyRow
            key={prop.p}
            prop={prop}
            selector={selector}
            value={properties[prop.p]}
            onChange={onChange}
          />
        ))}
      </div>
    </details>
  );
}

const ELEMENT_TARGET_GROUPS = [
  {
    group: "Text & Headings",
    items: [
      { sel: "*", label: "All Elements" },
      { sel: "h1,h2,h3,h4,h5,h6", label: "All Headings" },
      { sel: "p", label: "Paragraphs" },
      { sel: "span", label: "Spans" },
      { sel: "a", label: "Links" },
    ],
  },
  {
    group: "Common Parts",
    items: [
      { sel: '[class*="title"]', label: "Titles" },
      { sel: '[class*="label"]', label: "Labels" },
      { sel: '[class*="value"],[class*="val"]', label: "Values" },
      { sel: '[class*="name"]', label: "Names" },
      { sel: '[class*="stat"]', label: "Stats" },
      { sel: '[class*="header"]', label: "Headers" },
      { sel: '[class*="subtitle"],[class*="sub"]', label: "Subtitles" },
    ],
  },
  {
    group: "Cards & Containers",
    items: [
      { sel: '[class*="card"]', label: "Cards" },
      { sel: '[class*="badge"],[class*="pill"]', label: "Badges / Pills" },
      { sel: '[class*="row"]', label: "Rows" },
      { sel: '[class*="grid"]', label: "Grids" },
      { sel: '[class*="wrap"],[class*="container"]', label: "Wrappers" },
    ],
  },
  {
    group: "Media",
    items: [
      { sel: "img", label: "Images" },
      { sel: '[class*="avatar"],[class*="logo"]', label: "Avatars / Logos" },
      { sel: '[class*="progress"],[class*="bar"]', label: "Progress Bars" },
    ],
  },
];

const ELEMENT_STYLE_PROPS = [
  {
    p: "font-family",
    label: "Font",
    type: "select",
    opts: [
      "inherit",
      "'Inter', sans-serif",
      "'Poppins', sans-serif",
      "'Roboto', sans-serif",
      "'Oswald', sans-serif",
      "'Montserrat', sans-serif",
      "'Fira Code', monospace",
      "'Bebas Neue', cursive",
      "'Press Start 2P', cursive",
      "'Orbitron', sans-serif",
      "'Arial', sans-serif",
      "'Georgia', serif",
      "'Courier New', monospace",
    ],
  },
  {
    p: "font-size",
    label: "Size",
    type: "presets",
    opts: [
      "8px",
      "10px",
      "11px",
      "12px",
      "13px",
      "14px",
      "16px",
      "18px",
      "20px",
      "24px",
      "28px",
      "32px",
      "36px",
      "48px",
      "64px",
    ],
  },
  {
    p: "font-weight",
    label: "Weight",
    type: "select",
    opts: ["inherit", "100", "200", "300", "400", "500", "600", "700", "800", "900"],
  },
  { p: "color", label: "Color", type: "color" },
  { p: "background", label: "BG", type: "color" },
  {
    p: "text-transform",
    label: "Case",
    type: "select",
    opts: ["none", "uppercase", "lowercase", "capitalize"],
  },
  {
    p: "letter-spacing",
    label: "Spacing",
    type: "presets",
    opts: ["-1px", "0px", "0.5px", "1px", "2px", "3px", "4px"],
  },
  {
    p: "text-shadow",
    label: "Shadow",
    type: "presets",
    opts: [
      "none",
      "1px 1px 2px rgba(0,0,0,0.5)",
      "0 0 6px rgba(148,163,184,0.55)",
      "0 0 10px #94a3b8",
      "2px 2px 0 #000",
    ],
  },
  {
    p: "padding",
    label: "Padding",
    type: "presets",
    opts: ["0px", "2px", "4px", "8px", "12px", "16px", "24px"],
  },
  {
    p: "border-radius",
    label: "Radius",
    type: "presets",
    opts: ["0px", "4px", "8px", "12px", "16px", "50%", "9999px"],
  },
  {
    p: "border",
    label: "Border",
    type: "presets",
    opts: ["none", "1px solid #fff", "1px solid rgba(255,255,255,0.15)", "2px solid #94a3b8"],
  },
  {
    p: "opacity",
    label: "Opacity",
    type: "presets",
    opts: ["0", "0.3", "0.5", "0.7", "0.8", "0.9", "1"],
  },
];

function resetWidgetElementStyles({ handleConfigChange, widget, widgets }) {
  const latest = getLatestWidget(widgets, widget);
  handleConfigChange(latest, { ...latest.config, elementCSS: {} });
}

function ElementStylesEditor({ handleConfigChange, setCtxHoverSel, widget, widgets }) {
  const elCSS = widget.config?.elementCSS || {};
  const activeTargets = Object.keys(elCSS);
  const availableTargetGroups = getAvailableElementTargetGroups(
    ELEMENT_TARGET_GROUPS,
    activeTargets,
  );
  const setElementValue = (selector, prop, value) => {
    updateWidgetElementCss({
      handleConfigChange,
      prop,
      selector,
      value,
      widget,
      widgets,
    });
  };
  const removeTarget = (selector) => {
    removeWidgetElementTarget({ handleConfigChange, selector, widget, widgets });
  };
  const addTarget = (selector) => {
    setElementValue(selector, "_init", "1");
    setCtxHoverSel(null);
    scheduleClearInitialElementTarget({ handleConfigChange, selector, widget, widgets });
  };
  const addCustomTarget = () => {
    const selector = prompt(
      "Enter a CSS selector (e.g. .my-class, span.title, [data-x])",
    );
    if (selector) addTarget(selector);
  };
  const resetAll = () => {
    resetWidgetElementStyles({ handleConfigChange, widget, widgets });
  };
  return (
    <>
      <div className="wm-ctx-els-add">
        <details className="wm-ctx-els-dropdown">
          <summary className="wm-ctx-els-target-select">＋ Add element target…</summary>
          <div
            className="wm-ctx-els-dropdown-list"
            onMouseLeave={() => setCtxHoverSel(null)}
          >
            {availableTargetGroups.map((group) => (
              <ElementTargetDropdownGroup
                key={group.group}
                group={group}
                onHover={setCtxHoverSel}
                onSelect={addTarget}
              />
            ))}
            <div className="wm-ctx-els-dropdown-group">
              <div className="wm-ctx-els-dropdown-group-label">Custom</div>
              <button
                type="button"
                className="wm-ctx-els-dropdown-item"
                onClick={addCustomTarget}
              >
                ✏️ Custom CSS Selector…
              </button>
            </div>
          </div>
        </details>
      </div>
      {activeTargets.map((selector) => (
        <ElementStyleTarget
          key={selector}
          displayLabel={getElementTargetLabel(ELEMENT_TARGET_GROUPS, selector)}
          onChange={setElementValue}
          onHover={setCtxHoverSel}
          onRemove={removeTarget}
          properties={elCSS[selector] || {}}
          propertyDefs={ELEMENT_STYLE_PROPS}
          selector={selector}
        />
      ))}
      {activeTargets.length > 0 && (
        <button
          type="button"
          className="wm-ctx-mini-btn"
          style={{ marginTop: 4 }}
          onClick={resetAll}
        >
          Reset All Element Styles
        </button>
      )}
    </>
  );
}

function getActiveTileClassName({ isContainerChild, isDragOver, isDragging, isVisible }) {
  const classes = ["wm-tile", "wm-tile--active", isVisible ? "wm-tile--on" : "wm-tile--paused"];
  if (isDragOver) classes.push("wm-tile--drag-over");
  if (isDragging) classes.push("wm-tile--dragging");
  if (isContainerChild) classes.push("wm-tile--in-container");
  return classes.join(" ");
}

function getVisibilityToggleTitle(isVisible) {
  return isVisible ? "Click to turn off" : "Click to turn on";
}

function getPreviewHiddenTitle(isPreviewHidden) {
  return isPreviewHidden ? "Show in preview" : "Hide from preview";
}

function getLockToggleTitle(isLocked) {
  return isLocked ? "Unlock position" : "Lock position";
}

export default function WidgetManager({
  widgets,
  theme,
  onAdd,
  onSave,
  onRemove,
  availableWidgets,
  overlayToken,
}) {
  const { user } = useAuth();
  const [editingId, setEditingId] = useState(null);
  const [sidePanelTab, setSidePanelTab] = useState("configure");
  const [showPreview, setShowPreview] = useState(false);
  const [selectedPreviewId, setSelectedPreviewId] = useState(null);
  const [syncMsg, setSyncMsg] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [widgetSearch, setWidgetSearch] = useState("");
  const [widgetCategory, setWidgetCategory] = useState("all");
  const previewRef = useRef(null);
  const [ctxMenu, setCtxMenu] = useState(null); // { x, y, widget }
  const [ctxHoverSel, setCtxHoverSel] = useState(null); // CSS selector being hovered in Element Styles
  const [previewScale, setPreviewScale] = useState(0.35);

  /* ── Drag-to-reorder z-index state ── */
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  useEffect(() => {
    if (editingId) setSidePanelTab("configure");
  }, [editingId]);

  const CANVAS_W = theme?.canvas_width || 1920;
  const CANVAS_H = theme?.canvas_height || 1080;

  /* Dynamic scale for live preview */
  useEffect(() => {
    if (!showPreview || !previewRef.current) return;
    function calcScale() {
      const avail = previewRef.current.getBoundingClientRect().width - 48;
      setPreviewScale(avail / CANVAS_W);
    }
    calcScale();
    const ro = new ResizeObserver(calcScale);
    ro.observe(previewRef.current);
    return () => ro.disconnect();
  }, [showPreview, CANVAS_W]);

  // Collect IDs of widgets living inside a container — they render inside their parent, not as top-level slots
  const containerChildIds = useMemo(() => {
    const ids = new Set();
    (widgets || []).forEach((w) => {
      if (w.widget_type === "container" && Array.isArray(w.config?.children)) {
        w.config.children.forEach((id) => ids.add(id));
      }
    });
    return ids;
  }, [widgets]);

  const visibleWidgets = useMemo(
    () =>
      (widgets || []).filter(
        (w) => w.is_visible && !containerChildIds.has(w.id),
      ),
    [widgets, containerChildIds],
  );

  /* ── Transition animation tracking for live preview ── */
  const exitingMapRef = useRef(new Map()); // widgetId → { widget, timer }
  const prevVisibleIdsRef = useRef(null); // null = first render
  const [enterAnims, setEnterAnims] = useState(new Map()); // widgetId → animClass
  const [exitTick, setExitTick] = useState(0);

  useEffect(() => {
    const currentIds = new Set(visibleWidgets.map((w) => w.id));

    if (prevVisibleIdsRef.current === null) {
      prevVisibleIdsRef.current = currentIds;
      return;
    }
    const prevIds = prevVisibleIdsRef.current;

    syncExitAnimations({
      currentIds,
      exitingMapRef,
      prevIds,
      setExitTick,
      widgets,
    });
    applyEnterAnimations({
      ...buildEnterAnimations({ currentIds, exitingMapRef, prevIds, widgets }),
      setEnterAnims,
    });

    prevVisibleIdsRef.current = currentIds;
  }, [visibleWidgets, widgets]);

  const exitingWidgets = useMemo(() => {
    return buildExitingWidgets(exitingMapRef.current);
  }, [exitTick]);

  /* ── Drag handlers for live preview ── */
  const handlePreviewSelect = useCallback((id) => {
    setSelectedPreviewId(id);
  }, []);

  /* ── Arrow-key nudge for selected widget (1px per press, 10px with Shift) ── */
  useEffect(() => {
    if (!selectedPreviewId) return;
    function onKeyDown(e) {
      const delta = e.shiftKey ? 10 : 1;
      let dx = 0,
        dy = 0;
      switch (e.key) {
        case "ArrowLeft":
          dx = -delta;
          break;
        case "ArrowRight":
          dx = delta;
          break;
        case "ArrowUp":
          dy = -delta;
          break;
        case "ArrowDown":
          dy = delta;
          break;
        default:
          return;
      }
      e.preventDefault();
      const w = widgets.find((w) => w.id === selectedPreviewId);
      if (!w) return;
      onSave({
        ...w,
        position_x: Math.max(0, w.position_x + dx),
        position_y: Math.max(0, w.position_y + dy),
      });
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedPreviewId, widgets, onSave]);

  const handlePreviewMove = useCallback(
    (id, newX, newY) => {
      const w = widgets.find((w) => w.id === id);
      if (!w) return;
      onSave({
        ...w,
        position_x: Math.max(0, newX),
        position_y: Math.max(0, newY),
      });
    },
    [widgets, onSave],
  );

  const handlePreviewResize = useCallback(
    (id, newX, newY, newW, newH) => {
      const w = widgets.find((w) => w.id === id);
      if (!w) return;
      onSave({
        ...w,
        position_x: Math.max(0, newX),
        position_y: Math.max(0, newY),
        width: newW,
        height: newH,
      });
    },
    [widgets, onSave],
  );

  /* Deselect when clicking on empty canvas area */
  const handleCanvasClick = useCallback((e) => {
    if (e.target !== e.currentTarget) return;
    setSelectedPreviewId(null);
    setCtxMenu(null);
  }, []);

  /* ── Right-click context menu handler ── */
  const handleSlotContextMenu = useCallback((e, widget) => {
    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCtxMenu({ x: e.clientX - rect.left, y: e.clientY - rect.top, widget });
  }, []);

  const copyWidgetUrl = useCallback(
    (widgetId) => {
      if (!overlayToken) return;
      const url = `${window.location.origin}/overlay/${overlayToken}?widget=${widgetId}`;
      navigator.clipboard.writeText(url).then(() => {
        setCopiedId(widgetId);
        setTimeout(() => setCopiedId(null), 2000);
      });
    },
    [overlayToken],
  );

  const categories = useMemo(() => getWidgetsByCategory(), []);
  const allDefs = useMemo(() => Object.values(categories).flat(), [categories]);

  /* Derive which types the user has added */
  const activeTypes = useMemo(
    () => new Set((widgets || []).map((w) => w.widget_type)),
    [widgets],
  );
  const inactiveDefs = useMemo(
    () => allDefs.filter((d) => !activeTypes.has(d.type)),
    [allDefs, activeTypes],
  );
  const categoryEntries = useMemo(
    () =>
      Object.entries(categories)
        .map(([key, defs]) => ({
          key,
          label: key.charAt(0).toUpperCase() + key.slice(1),
          count: defs.filter((def) => !activeTypes.has(def.type)).length,
        }))
        .filter((entry) => entry.count > 0),
    [categories, activeTypes],
  );
  const handleWidgetSearchChange = (value) => {
    setWidgetSearch(value);
    if (value.trim()) setWidgetCategory("all");
  };
  const clearWidgetFilters = () => {
    setWidgetSearch("");
    setWidgetCategory("all");
  };
  const filteredInactiveDefs = useMemo(() => {
    const q = widgetSearch.trim().toLowerCase();
    return inactiveDefs.filter((def) => {
      const categoryMatch =
        widgetCategory === "all" ||
        (def.category || "general") === widgetCategory;
      const searchMatch =
        !q ||
        [def.label, def.description, def.type, def.category]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q));
      return categoryMatch && searchMatch;
    });
  }, [inactiveDefs, widgetCategory, widgetSearch]);
  const inactiveByCategory = useMemo(
    () =>
      filteredInactiveDefs.reduce((acc, def) => {
        const key = def.category || "general";
        if (!acc[key]) acc[key] = [];
        acc[key].push(def);
        return acc;
      }, {}),
    [filteredInactiveDefs],
  );

  const handleToggle = useCallback(
    (widget) => {
      onSave({ ...widget, is_visible: !widget.is_visible });
    },
    [onSave],
  );

  const handleConfigChange = useCallback(
    (widget, newConfig) => {
      onSave({ ...widget, config: newConfig });
    },
    [onSave],
  );

  /* Cycle to next style for a widget (used by floating preview button) */
  const handleStyleCycle = useCallback(
    (widget) => {
      const def = getWidgetDef(widget.widget_type);
      const styles = def?.styles;
      if (!styles || styles.length < 2) return;
      const key = def.styleConfigKey || "displayStyle";
      const current = widget.config?.[key] || styles[0].id;
      const idx = styles.findIndex((s) => s.id === current);
      const next = styles[(idx + 1) % styles.length];
      onSave(buildWidgetStyleUpdate(widget, next.id, current));
    },
    [onSave],
  );

  const handlePositionChange = useCallback(
    (widget, field, value) => {
      onSave({ ...widget, [field]: value });
    },
    [onSave],
  );

  const handleAdd = useCallback(
    async (type) => {
      const def = getWidgetDef(type);
      try {
        await onAdd(type, def?.defaults || {});
      } catch (err) {
        console.error("[WidgetManager] Failed to add widget:", type, err);
        alert(`Failed to add widget: ${err?.message || "Unknown error"}`);
      }
    },
    [onAdd],
  );

  /* ── Sorted active widgets by z_index (lowest first → highest last = on top in OBS) ── */
  const sortedWidgets = useMemo(
    () =>
      [...(widgets || [])].sort((a, b) => (a.z_index || 1) - (b.z_index || 1)),
    [widgets],
  );

  /* ── Drag-to-reorder handlers ── */
  const handleDragStart = useCallback((e, widgetId) => {
    setDragId(widgetId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", widgetId);
    // Make ghost slightly transparent
    if (e.currentTarget) {
      requestAnimationFrame(() => (e.currentTarget.style.opacity = "0.4"));
    }
  }, []);

  const handleDragEnd = useCallback((e) => {
    e.currentTarget.style.opacity = "1";
    setDragId(null);
    setDragOverId(null);
  }, []);

  const handleDragOver = useCallback(
    (e, widgetId) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (widgetId !== dragOverId) setDragOverId(widgetId);
    },
    [dragOverId],
  );

  const handleDrop = useCallback(
    (e, dropTargetId) => {
      e.preventDefault();
      const fromId = dragId;
      if (!fromId || fromId === dropTargetId) {
        setDragId(null);
        setDragOverId(null);
        return;
      }

      // Reorder the sorted list
      const ordered = [...sortedWidgets];
      const fromIdx = ordered.findIndex((w) => w.id === fromId);
      const toIdx = ordered.findIndex((w) => w.id === dropTargetId);
      if (fromIdx === -1 || toIdx === -1) return;

      const [moved] = ordered.splice(fromIdx, 1);
      ordered.splice(toIdx, 0, moved);

      // Assign z_index: position+1 (1-based, left=bottom, right=top)
      ordered.forEach((w, i) => {
        const newZ = i + 1;
        if (w.z_index !== newZ) {
          onSave({ ...w, z_index: newZ });
        }
      });

      setDragId(null);
      setDragOverId(null);
    },
    [dragId, sortedWidgets, onSave],
  );

  /* ── Arrow-based layer reorder ── */
  const handleMoveLayer = useCallback(
    (widgetId, direction) => {
      const ordered = [...sortedWidgets];
      const idx = ordered.findIndex((w) => w.id === widgetId);
      if (idx === -1) return;
      const targetIdx = idx + direction;
      if (targetIdx < 0 || targetIdx >= ordered.length) return;
      [ordered[idx], ordered[targetIdx]] = [ordered[targetIdx], ordered[idx]];
      ordered.forEach((w, i) => {
        const newZ = i + 1;
        if (w.z_index !== newZ) onSave({ ...w, z_index: newZ });
      });
    },
    [sortedWidgets, onSave],
  );

  /* ── Right-click context menu action handler ── */
  const ctxAction = useCallback(
    (action) => {
      const w = ctxMenu?.widget
        ? widgets.find((x) => x.id === ctxMenu.widget.id) || ctxMenu.widget
        : null;
      if (!w) return;
      switch (action) {
        case "edit":
          setCtxMenu(null);
          setEditingId(w.id);
          break;
        case "toggle":
          onSave({ ...w, is_visible: !w.is_visible });
          setCtxMenu(null);
          break;
        case "lock":
          onSave({
            ...w,
            config: { ...w.config, _locked: !w.config?._locked },
          });
          setCtxMenu(null);
          break;
        case "copyUrl":
          copyWidgetUrl(w.id);
          setCtxMenu(null);
          break;
        case "front":
          handleMoveLayer(w.id, sortedWidgets.length);
          setCtxMenu(null);
          break;
        case "back":
          handleMoveLayer(w.id, -sortedWidgets.length);
          setCtxMenu(null);
          break;
        case "center": {
          const cx = Math.round((CANVAS_W - w.width) / 2);
          const cy = Math.round((CANVAS_H - w.height) / 2);
          onSave({
            ...w,
            position_x: Math.max(0, cx),
            position_y: Math.max(0, cy),
          });
          setCtxMenu(null);
          break;
        }
        case "resetSize": {
          const def = getWidgetDef(w.widget_type);
          const styleKey = def?.styleConfigKey || "displayStyle";
          const defaultSize = getWidgetStyleDefaultSize(
            w.widget_type,
            w.config?.[styleKey],
          );
          const dw = defaultSize?.width || def?.defaults?.width || 400;
          const dh = defaultSize?.height || def?.defaults?.height || 300;
          onSave({ ...w, width: dw, height: dh });
          setCtxMenu(null);
          break;
        }
        case "delete":
          setCtxMenu(null);
          onRemove(w.id);
          break;
        default:
          break;
      }
    },
    [
      ctxMenu,
      widgets,
      onSave,
      onRemove,
      copyWidgetUrl,
      handleMoveLayer,
      sortedWidgets.length,
      CANVAS_W,
      CANVAS_H,
    ],
  );

  /* Update widget field from context menu (keeps menu open) */
  const ctxUpdateField = useCallback(
    (field, value) => {
      if (!ctxMenu?.widget) return;
      const w = widgets.find((x) => x.id === ctxMenu.widget.id);
      if (!w) return;
      onSave({ ...w, [field]: value });
    },
    [ctxMenu, widgets, onSave],
  );

  /* Update widget config key from context menu (keeps menu open) */
  const ctxUpdateConfig = useCallback(
    (key, value) => {
      if (!ctxMenu?.widget) return;
      const w = widgets.find((x) => x.id === ctxMenu.widget.id);
      if (!w) return;
      onSave({ ...w, config: { ...w.config, [key]: value } });
    },
    [ctxMenu, widgets, onSave],
  );

  const startContextMenuDrag = useCallback(
    (event) => {
      event.preventDefault();
      if (!ctxMenu) return;
      const { clientX: startX, clientY: startY } = event;
      const { x: origX, y: origY } = ctxMenu;
      const onMove = (moveEvent) => {
        const nextX = origX + moveEvent.clientX - startX;
        const nextY = origY + moveEvent.clientY - startY;
        setCtxMenu((prev) => (prev ? { ...prev, x: nextX, y: nextY } : null));
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [ctxMenu],
  );

  /* Close context menu on click outside */
  useEffect(() => {
    if (!ctxMenu) return;
    const close = (e) => {
      const menu = document.querySelector(".wm-ctx-menu--rich");
      if (menu?.contains(e.target)) return;
      setCtxMenu(null);
    };
    /* Use pointerdown on next tick so the opening right-click doesn't immediately close */
    const id = setTimeout(
      () => window.addEventListener("pointerdown", close),
      0,
    );
    return () => {
      clearTimeout(id);
      window.removeEventListener("pointerdown", close);
    };
  }, [ctxMenu]);

  /* ── Sync ALL widgets from the navbar ── */
  const syncAllFromNavbar = useCallback(async () => {
    const navWidget = widgets.find((w) => w.widget_type === "navbar");
    if (!navWidget) {
      setSyncMsg("No navbar widget found");
      setTimeout(() => setSyncMsg(""), 2500);
      return;
    }
    const nb = navWidget.config || {};
    let count = 0;
    for (const w of widgets) {
      if (w.widget_type === "navbar") continue;
      const synced = buildSyncedConfig(w.widget_type, w.config, nb);
      if (synced) {
        await onSave({ ...w, config: synced });
        count++;
      }
    }
    setSyncMsg(`Synced ${count} widget${count !== 1 ? "s" : ""} with Navbar!`);
    setTimeout(() => setSyncMsg(""), 3000);
  }, [widgets, onSave]);

  const editingWidget = useMemo(
    () => (editingId ? widgets.find((x) => x.id === editingId) || null : null),
    [editingId, widgets],
  );
  const editingDef = useMemo(
    () => (editingWidget ? getWidgetDef(editingWidget.widget_type) : null),
    [editingWidget],
  );
  const SidePanelConfig = editingDef?.configPanel;
  const sidePanelTabs = useMemo(
    () => [
      { id: "configure", label: "Configure", disabled: !SidePanelConfig },
      { id: "layout", label: "Layout" },
      { id: "motion", label: "Motion" },
      { id: "obs", label: "OBS Link", disabled: !overlayToken },
    ],
    [SidePanelConfig, overlayToken],
  );
  const activeSidePanelTab =
    sidePanelTab === "configure" && !SidePanelConfig ? "layout" : sidePanelTab;
  const isSidePanelOpen = Boolean(editingWidget);

  return (
    <div
      className={`oc-widgets-panel${isSidePanelOpen ? " oc-widgets-panel--inspector-open" : ""}`}
    >
      <div className="wm-content-pane">
        {/* ──── Page Header ──── */}
        <div className="wm-page-header">
          <div className="wm-page-header-text">
            <h2 className="wm-page-title">Widgets</h2>
            <p className="wm-page-desc">
              Build your overlay by adding widgets below. Click any widget to
              open its settings.
            </p>
          </div>
          <div className="wm-page-header-actions">
            {syncMsg && <span className="wm-sync-toast">{syncMsg}</span>}
            <button
              className={`wm-btn ${showPreview ? "wm-btn--preview-on" : "wm-btn--ghost"}`}
              onClick={() => setShowPreview((v) => !v)}
              title="Toggle live overlay preview"
            >
              👁️ {showPreview ? "Hide Preview" : "Live Preview"}
            </button>
            <button
              className="wm-btn wm-btn--ghost"
              onClick={syncAllFromNavbar}
              title="Copy the Navbar's colors and fonts to all other widgets automatically"
              data-tour="sync-colors"
            >
              🔗 Sync Colors
            </button>
            <button
              className="wm-btn wm-btn--ghost"
              title="Turn off all background effects (particles, fog, glimpse)"
              onClick={() => {
                const bg = widgets.find((w) => w.widget_type === "background");
                if (!bg) return;
                const fxClear = {
                  fxParticles: "none",
                  fxParticleColor: "#ffffff",
                  fxParticleCount: 25,
                  fxParticleSpeed: 50,
                  fxParticleSize: 50,
                  fxFog: "none",
                  fxFogColor: "#000000",
                  fxGlimpse: "none",
                  fxGlimpseColor: "#ffffff",
                  fxGlimpseSpeed: 50,
                };
                // Clear fx keys in ALL style variants
                const sc = { ...bg.config?.styleConfigs };
                for (const key of Object.keys(sc)) {
                  sc[key] = {
                    ...sc[key],
                    fxParticles: "none",
                    fxFog: "none",
                    fxGlimpse: "none",
                  };
                }
                onSave({
                  ...bg,
                  config: { ...bg.config, ...fxClear, styleConfigs: sc },
                });
              }}
            >
              🚫 Clear Effects
            </button>
          </div>
        </div>

        {/* ──── Live Overlay Preview — OBS-style drag & resize ──── */}
        {showPreview && (
          <div
            className="wm-live-preview"
            ref={previewRef}
            data-tour="live-preview"
          >
            <div className="wm-live-header">
              <span className="wm-live-title">
                <span className="wm-live-dot" aria-hidden="true" />
                {"Live Preview"}
              </span>
              <span className="wm-live-dims">
                {CANVAS_W} × {CANVAS_H} &middot;{" "}
                {Math.round(previewScale * 100)}%
                {selectedPreviewId &&
                  (() => {
                    const sw = widgets.find((w) => w.id === selectedPreviewId);
                    const sd = sw ? getWidgetDef(sw.widget_type) : null;
                    return sw ? (
                      <span className="wm-live-selected-name">
                        {" "}
                        &middot; {sd?.icon} {sw.label || sd?.label}
                      </span>
                    ) : null;
                  })()}
              </span>
            </div>
            <div>
              <div
                className="wm-live-canvas-wrap"
                style={{
                  width: CANVAS_W * previewScale,
                  height: CANVAS_H * previewScale,
                  margin: "0 auto",
                }}
              >
                <div
                  className="wm-live-canvas"
                  data-theme={theme?.style_preset || "classic"}
                  style={{
                    width: CANVAS_W,
                    height: CANVAS_H,
                    transform: `scale(${previewScale})`,
                    transformOrigin: "top left",
                    ...buildThemeVars(theme),
                  }}
                  onPointerDown={handleCanvasClick}
                  data-tour="preview-drag"
                >
                  {/* Theme texture overlay */}
                  {theme?.bg_texture && theme.bg_texture !== "none" && (
                    <div
                      className={`or-texture or-texture--${theme.bg_texture}`}
                    />
                  )}
                  {visibleWidgets.length === 0 && (
                    <div className="wm-live-empty">
                      No visible widgets — toggle a widget on to see it here
                    </div>
                  )}
                  {visibleWidgets.map((w) => (
                    <DraggableSlot
                      key={w.id}
                      widget={w}
                      theme={theme}
                      allWidgets={widgets}
                      isSelected={w.id === selectedPreviewId}
                      scale={previewScale}
                      onSelect={handlePreviewSelect}
                      onMove={handlePreviewMove}
                      onResize={handlePreviewResize}
                      onStyleCycle={handleStyleCycle}
                      onContextMenu={handleSlotContextMenu}
                      canvasW={CANVAS_W}
                      canvasH={CANVAS_H}
                      userId={user?.id}
                      animClass={enterAnims.get(w.id) || ""}
                    />
                  ))}
                  {/* Element highlight overlay when hovering selectors */}
                  {ctxHoverSel && ctxMenu && (
                    <style>{`${ctxHoverSel
                      .split(",")
                      .map((s) => `#wm-el-${ctxMenu.widget.id} ${s.trim()}`)
                      .join(
                        ",",
                      )}{outline:2px solid #cbd5e1 !important;background:rgba(148,163,184,0.14) !important;box-shadow:0 0 12px rgba(148,163,184,0.28) !important;transition:outline 0.15s,background 0.15s,box-shadow 0.15s !important;}`}</style>
                  )}
                  {/* Exiting widgets — kept in DOM for exit animation */}
                  {exitingWidgets.map((w) => (
                    <DraggableSlot
                      key={`exit-${w.id}`}
                      widget={w}
                      theme={theme}
                      allWidgets={widgets}
                      isSelected={false}
                      scale={previewScale}
                      onSelect={() => {}}
                      onMove={() => {}}
                      onResize={() => {}}
                      canvasW={CANVAS_W}
                      canvasH={CANVAS_H}
                      userId={user?.id}
                      animClass={w._exitAnimClass}
                      exiting
                    />
                  ))}
                </div>
              </div>

              {/* ── Right-click context menu — rich controls ── */}
              {ctxMenu &&
                (() => {
                  const w =
                    widgets.find((x) => x.id === ctxMenu.widget.id) ||
                    ctxMenu.widget;
                  const def = getWidgetDef(w.widget_type);
                  const styles = def?.styles;
                  const styleKey = def?.styleConfigKey || "displayStyle";
                  const currentStyle = w.config?.[styleKey] || styles?.[0]?.id;
                  const isBg = w.widget_type === "background";

                  /* Animation options list */
                  const ENTER_ANIMS = [
                    { v: "fade", l: "Fade In" },
                    { v: "slide-up", l: "Slide from Bottom" },
                    { v: "slide-down", l: "Slide from Top" },
                    { v: "slide-left", l: "Slide from Right" },
                    { v: "slide-right", l: "Slide from Left" },
                    { v: "swipe-up", l: "Swipe Up" },
                    { v: "swipe-down", l: "Swipe Down" },
                    { v: "swipe-left", l: "Swipe Left" },
                    { v: "swipe-right", l: "Swipe Right" },
                    { v: "scale", l: "Scale Up" },
                    { v: "scale-down", l: "Scale Down" },
                    { v: "flip-x", l: "Flip Horizontal" },
                    { v: "flip-y", l: "Flip Vertical" },
                    { v: "bounce", l: "Bounce In" },
                    { v: "glow", l: "Glow" },
                    { v: "blur", l: "Blur In" },
                    { v: "rotate", l: "Rotate In" },
                    { v: "none", l: "None (Cut)" },
                  ];
                  const EXIT_ANIMS = [
                    { v: "fade", l: "Fade Out" },
                    { v: "slide-up", l: "Slide to Top" },
                    { v: "slide-down", l: "Slide to Bottom" },
                    { v: "slide-left", l: "Slide to Left" },
                    { v: "slide-right", l: "Slide to Right" },
                    { v: "swipe-up", l: "Swipe Up" },
                    { v: "swipe-down", l: "Swipe Down" },
                    { v: "swipe-left", l: "Swipe Left" },
                    { v: "swipe-right", l: "Swipe Right" },
                    { v: "scale", l: "Scale Down" },
                    { v: "scale-up", l: "Scale Up" },
                    { v: "flip-x", l: "Flip Horizontal" },
                    { v: "flip-y", l: "Flip Vertical" },
                    { v: "bounce", l: "Bounce Out" },
                    { v: "glow", l: "Glow" },
                    { v: "blur", l: "Blur Out" },
                    { v: "rotate", l: "Rotate Out" },
                    { v: "none", l: "None (Cut)" },
                  ];

                  return (
                    <dialog
                      open
                      className="wm-ctx-menu wm-ctx-menu--rich"
                      style={{ left: ctxMenu.x, top: ctxMenu.y }}
                      aria-label="Widget quick settings"
                    >
                      {/* Header — draggable */}
                      <div
                        className="wm-ctx-header"
                      >
                        <button
                          type="button"
                          className="wm-ctx-header-drag"
                          onMouseDown={startContextMenuDrag}
                          aria-label="Move widget quick settings"
                        >
                          {def?.icon} {w.label || def?.label}
                        </button>
                        <div className="wm-ctx-header-right">
                          {w.widget_type === "bonus_hunt" && (
                            <button
                              className={`wm-ctx-sr-pill ${w.config?.showSlotRequests === false ? "" : "wm-ctx-sr-pill--on"}`}
                              onClick={() =>
                                ctxUpdateConfig(
                                  "showSlotRequests",
                                  w.config?.showSlotRequests === false,
                                )
                              }
                              title={
                                w.config?.showSlotRequests === false
                                  ? "Enable Slot Requests"
                                  : "Disable Slot Requests"
                              }
                            >
                              <span className="wm-ctx-sr-pill-label">!SR</span>
                              <span className="wm-ctx-sr-pill-track">
                                <span className="wm-ctx-sr-pill-knob" />
                              </span>
                            </button>
                          )}
                          <button
                            className="wm-ctx-close"
                            onClick={() => setCtxMenu(null)}
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* Quick actions row */}
                      <div className="wm-ctx-actions-row">
                        <button
                          className="wm-ctx-action-btn"
                          onClick={() => ctxAction("edit")}
                          title="Edit Settings"
                        >
                          ⚙️
                        </button>
                        <button
                          className="wm-ctx-action-btn"
                          onClick={() => ctxAction("toggle")}
                          title={w.is_visible ? "Hide" : "Show"}
                        >
                          {w.is_visible ? "👁️" : "👁️‍🗨️"}
                        </button>
                        <button
                          className="wm-ctx-action-btn"
                          onClick={() => ctxAction("lock")}
                          title={
                            w.config?._locked
                              ? "Unlock Position"
                              : "Lock Position"
                          }
                        >
                          {w.config?._locked ? "🔒" : "🔓"}
                        </button>
                        <button
                          className="wm-ctx-action-btn"
                          onClick={() => ctxAction("copyUrl")}
                          title="Copy OBS URL"
                        >
                          🔗
                        </button>
                        <button
                          className="wm-ctx-action-btn"
                          onClick={() => ctxAction("front")}
                          title="Bring to Front"
                        >
                          ⬆️
                        </button>
                        <button
                          className="wm-ctx-action-btn"
                          onClick={() => ctxAction("back")}
                          title="Send to Back"
                        >
                          ⬇️
                        </button>
                        <button
                          className="wm-ctx-action-btn"
                          onClick={() => ctxAction("center")}
                          title="Center"
                        >
                          🎯
                        </button>
                        <button
                          className="wm-ctx-action-btn wm-ctx-action-btn--danger"
                          onClick={() => ctxAction("delete")}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>

                      <div className="wm-ctx-divider" />

                      {/* ── Dimensions ── */}
                      {!isBg && (
                        <details className="wm-ctx-section">
                          <summary className="wm-ctx-section-title">
                            📐 Dimensions
                          </summary>
                          <div className="wm-ctx-section-body">
                            <div className="wm-ctx-input-row">
                              <label
                                className="wm-ctx-input-label"
                                htmlFor={`wm-ctx-width-${w.id}`}
                              >
                                W
                              </label>
                              <input
                                id={`wm-ctx-width-${w.id}`}
                                type="number"
                                className="wm-ctx-num"
                                value={Math.round(w.width)}
                                min={20}
                                onChange={(e) =>
                                  ctxUpdateField(
                                    "width",
                                    Math.max(20, +e.target.value),
                                  )
                                }
                              />
                              <label
                                className="wm-ctx-input-label"
                                htmlFor={`wm-ctx-height-${w.id}`}
                              >
                                H
                              </label>
                              <input
                                id={`wm-ctx-height-${w.id}`}
                                type="number"
                                className="wm-ctx-num"
                                value={Math.round(w.height)}
                                min={20}
                                onChange={(e) =>
                                  ctxUpdateField(
                                    "height",
                                    Math.max(20, +e.target.value),
                                  )
                                }
                              />
                            </div>
                            <button
                              className="wm-ctx-mini-btn"
                              onClick={() => ctxAction("resetSize")}
                            >
                              Reset to Default
                            </button>
                          </div>
                        </details>
                      )}

                      {/* ── Position ── */}
                      {!isBg && (
                        <details className="wm-ctx-section">
                          <summary className="wm-ctx-section-title">
                            📍 Position
                          </summary>
                          <div className="wm-ctx-section-body">
                            <div className="wm-ctx-input-row">
                              <label
                                className="wm-ctx-input-label"
                                htmlFor={`wm-ctx-x-${w.id}`}
                              >
                                X
                              </label>
                              <input
                                id={`wm-ctx-x-${w.id}`}
                                type="number"
                                className="wm-ctx-num"
                                value={Math.round(w.position_x)}
                                min={0}
                                onChange={(e) =>
                                  ctxUpdateField(
                                    "position_x",
                                    Math.max(0, +e.target.value),
                                  )
                                }
                              />
                              <label
                                className="wm-ctx-input-label"
                                htmlFor={`wm-ctx-y-${w.id}`}
                              >
                                Y
                              </label>
                              <input
                                id={`wm-ctx-y-${w.id}`}
                                type="number"
                                className="wm-ctx-num"
                                value={Math.round(w.position_y)}
                                min={0}
                                onChange={(e) =>
                                  ctxUpdateField(
                                    "position_y",
                                    Math.max(0, +e.target.value),
                                  )
                                }
                              />
                            </div>
                            <button
                              className="wm-ctx-mini-btn"
                              onClick={() => ctxAction("center")}
                            >
                              Center on Canvas
                            </button>
                          </div>
                        </details>
                      )}

                      {/* ── Style ── */}
                      {styles && styles.length > 1 && (
                        <details className="wm-ctx-section">
                          <summary className="wm-ctx-section-title">
                            🎨 Style
                          </summary>
                          <div className="wm-ctx-section-body">
                            <div className="wm-ctx-style-grid">
                              {styles.map((s) => (
                                <button
                                  key={s.id}
                                  className={`wm-ctx-style-btn ${currentStyle === s.id ? "wm-ctx-style-btn--active" : ""}`}
                                  onClick={() => {
                                    onSave(
                                      buildWidgetStyleUpdate(
                                        w,
                                        s.id,
                                        currentStyle,
                                      ),
                                    );
                                  }}
                                >
                                  {s.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </details>
                      )}

                      {/* ── Transitions ── */}
                      <details className="wm-ctx-section">
                        <summary className="wm-ctx-section-title">
                          🎬 Transitions
                        </summary>
                        <div className="wm-ctx-section-body">
                          <div className="wm-ctx-select-row">
                            <label
                              className="wm-ctx-input-label"
                              htmlFor={`wm-ctx-animation-in-${w.id}`}
                            >
                              In
                            </label>
                            <select
                              id={`wm-ctx-animation-in-${w.id}`}
                              className="wm-ctx-select"
                              value={w.animation || "fade"}
                              onChange={(e) =>
                                ctxUpdateField("animation", e.target.value)
                              }
                            >
                              {ENTER_ANIMS.map((a) => (
                                <option key={a.v} value={a.v}>
                                  {a.l}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="wm-ctx-select-row">
                            <label
                              className="wm-ctx-input-label"
                              htmlFor={`wm-ctx-animation-out-${w.id}`}
                            >
                              Out
                            </label>
                            <select
                              id={`wm-ctx-animation-out-${w.id}`}
                              className="wm-ctx-select"
                              value={w.exit_animation || "fade"}
                              onChange={(e) =>
                                ctxUpdateField("exit_animation", e.target.value)
                              }
                            >
                              {EXIT_ANIMS.map((a) => (
                                <option key={a.v} value={a.v}>
                                  {a.l}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="wm-ctx-slider-row">
                            <label
                              className="wm-ctx-slider-label"
                              htmlFor={`wm-ctx-animation-duration-${w.id}`}
                            >
                              Duration
                            </label>
                            <input
                              id={`wm-ctx-animation-duration-${w.id}`}
                              type="range"
                              className="wm-ctx-range"
                              min={0.2}
                              max={5}
                              step={0.1}
                              value={w.config?.animSpeed ?? 1}
                              onChange={(e) =>
                                ctxUpdateConfig("animSpeed", +e.target.value)
                              }
                            />
                            <span className="wm-ctx-slider-val">
                              {((w.config?.animSpeed ?? 1) * 0.35).toFixed(2)}s
                            </span>
                          </div>
                        </div>
                      </details>

                      {/* ── Filters ── */}
                      <details className="wm-ctx-section">
                        <summary className="wm-ctx-section-title">
                          🌈 Filters
                        </summary>
                        <div className="wm-ctx-section-body">
                          {[
                            {
                              key: "brightness",
                              label: "Brightness",
                              min: 0,
                              max: 200,
                              def: 100,
                            },
                            {
                              key: "contrast",
                              label: "Contrast",
                              min: 0,
                              max: 200,
                              def: 100,
                            },
                            {
                              key: "saturation",
                              label: "Saturation",
                              min: 0,
                              max: 200,
                              def: 100,
                            },
                          ].map((f) => (
                            <div key={f.key} className="wm-ctx-slider-row">
                              <label
                                className="wm-ctx-slider-label"
                                htmlFor={`wm-ctx-filter-${w.id}-${f.key}`}
                              >
                                {f.label}
                              </label>
                              <input
                                id={`wm-ctx-filter-${w.id}-${f.key}`}
                                type="range"
                                className="wm-ctx-range"
                                min={f.min}
                                max={f.max}
                                value={w.config?.[f.key] ?? f.def}
                                onChange={(e) =>
                                  ctxUpdateConfig(f.key, +e.target.value)
                                }
                              />
                              <span className="wm-ctx-slider-val">
                                {w.config?.[f.key] ?? f.def}%
                              </span>
                            </div>
                          ))}
                          <button
                            className="wm-ctx-mini-btn"
                            onClick={() => {
                              const latest =
                                widgets.find((x) => x.id === w.id) || w;
                              handleConfigChange(latest, {
                                ...latest.config,
                                brightness: 100,
                                contrast: 100,
                                saturation: 100,
                              });
                            }}
                          >
                            Reset Filters
                          </button>
                        </div>
                      </details>

                      {/* ── Typography ── */}
                      <details className="wm-ctx-section">
                        <summary className="wm-ctx-section-title">
                          🔤 Typography
                        </summary>
                        <div className="wm-ctx-section-body">
                          <div className="wm-ctx-select-row">
                            <span className="wm-ctx-input-label">Font</span>
                            <FontSelectInput
                              value={
                                w.config?.fontFamily || "'Inter', sans-serif"
                              }
                              options={FONT_OPTIONS}
                              onChange={(value) =>
                                ctxUpdateConfig("fontFamily", value)
                              }
                              className="oc-config-font-select"
                            />
                          </div>
                          <div className="wm-ctx-slider-row">
                            <label
                              className="wm-ctx-slider-label"
                              htmlFor={`wm-ctx-font-size-${w.id}`}
                            >
                              Size
                            </label>
                            <input
                              id={`wm-ctx-font-size-${w.id}`}
                              type="range"
                              className="wm-ctx-range"
                              min={8}
                              max={72}
                              step={1}
                              value={w.config?.fontSize ?? 14}
                              onChange={(e) =>
                                ctxUpdateConfig("fontSize", +e.target.value)
                              }
                            />
                            <span className="wm-ctx-slider-val">
                              {w.config?.fontSize ?? 14}px
                            </span>
                          </div>
                          <div className="wm-ctx-select-row">
                            <label
                              className="wm-ctx-input-label"
                              htmlFor={`wm-ctx-font-weight-${w.id}`}
                            >
                              Weight
                            </label>
                            <select
                              id={`wm-ctx-font-weight-${w.id}`}
                              className="wm-ctx-select"
                              value={w.config?.fontWeight ?? 500}
                              onChange={(e) =>
                                ctxUpdateConfig("fontWeight", +e.target.value)
                              }
                            >
                              <option value={300}>Light</option>
                              <option value={400}>Regular</option>
                              <option value={500}>Medium</option>
                              <option value={600}>Semi Bold</option>
                              <option value={700}>Bold</option>
                              <option value={800}>Extra Bold</option>
                              <option value={900}>Black</option>
                            </select>
                          </div>
                        </div>
                      </details>

                      {/* ── Colors ── */}
                      <details className="wm-ctx-section">
                        <summary className="wm-ctx-section-title">
                          🎨 Colors
                        </summary>
                        <div className="wm-ctx-section-body">
                          {[
                            { key: "textColor", label: "Text", def: "#ffffff" },
                            {
                              key: "bgColor",
                              label: "Background",
                              def: "#0f172a",
                            },
                            {
                              key: "accentColor",
                              label: "Accent",
                              def: "#f59e0b",
                            },
                          ].map((f) => (
                            <div key={f.key} className="wm-ctx-color-row">
                              <label
                                className="wm-ctx-color-label"
                                htmlFor={`wm-ctx-color-${w.id}-${f.key}`}
                              >
                                {f.label}
                              </label>
                              <input
                                id={`wm-ctx-color-${w.id}-${f.key}`}
                                type="color"
                                className="wm-ctx-color-input"
                                value={w.config?.[f.key] || f.def}
                                onChange={(e) =>
                                  ctxUpdateConfig(f.key, e.target.value)
                                }
                              />
                              <span className="wm-ctx-color-hex">
                                {w.config?.[f.key] || f.def}
                              </span>
                            </div>
                          ))}
                        </div>
                      </details>

                      {/* ── Advanced CSS ── */}
                      <details className="wm-ctx-section">
                        <summary className="wm-ctx-section-title">
                          ⚡ Advanced CSS
                        </summary>
                        <div className="wm-ctx-section-body wm-ctx-adv">
                          {(() => {
                            const adv = w.config?.advancedCSS || {};
                            const setAdv = (prop, val) => {
                              updateWidgetAdvancedCss({
                                handleConfigChange,
                                prop,
                                value: val,
                                widget: w,
                                widgets,
                              });
                            };
                            const CSS_PROPS = [
                              {
                                group: "Box Model",
                                props: [
                                  {
                                    p: "padding",
                                    label: "Padding",
                                    ph: "0px",
                                    type: "presets",
                                    opts: [
                                      "0px",
                                      "2px",
                                      "4px",
                                      "6px",
                                      "8px",
                                      "10px",
                                      "12px",
                                      "16px",
                                      "20px",
                                      "24px",
                                      "32px",
                                      "4px 8px",
                                      "8px 16px",
                                      "12px 24px",
                                    ],
                                  },
                                  {
                                    p: "margin",
                                    label: "Margin",
                                    ph: "0px",
                                    type: "presets",
                                    opts: [
                                      "0px",
                                      "2px",
                                      "4px",
                                      "8px",
                                      "12px",
                                      "16px",
                                      "24px",
                                      "auto",
                                      "0 auto",
                                      "4px 8px",
                                      "8px 16px",
                                    ],
                                  },
                                  {
                                    p: "border",
                                    label: "Border",
                                    ph: "none",
                                    type: "presets",
                                    opts: [
                                      "none",
                                      "1px solid #fff",
                                      "1px solid rgba(255,255,255,0.2)",
                                      "2px solid #94a3b8",
                                      "2px dashed #f59e0b",
                                      "1px solid #333",
                                      "2px solid #ef4444",
                                      "3px double #94a3b8",
                                    ],
                                  },
                                  {
                                    p: "border-radius",
                                    label: "Border Radius",
                                    ph: "0px",
                                    type: "presets",
                                    opts: [
                                      "0px",
                                      "2px",
                                      "4px",
                                      "6px",
                                      "8px",
                                      "10px",
                                      "12px",
                                      "16px",
                                      "20px",
                                      "24px",
                                      "50%",
                                      "9999px",
                                    ],
                                  },
                                  {
                                    p: "box-sizing",
                                    label: "Box Sizing",
                                    ph: "border-box",
                                    type: "select",
                                    opts: ["border-box", "content-box"],
                                  },
                                  {
                                    p: "overflow",
                                    label: "Overflow",
                                    ph: "hidden",
                                    type: "select",
                                    opts: [
                                      "visible",
                                      "hidden",
                                      "scroll",
                                      "auto",
                                      "clip",
                                    ],
                                  },
                                ],
                              },
                              {
                                group: "Typography",
                                props: [
                                  {
                                    p: "font-size",
                                    label: "Font Size",
                                    ph: "14px",
                                    type: "presets",
                                    opts: [
                                      "8px",
                                      "10px",
                                      "11px",
                                      "12px",
                                      "13px",
                                      "14px",
                                      "16px",
                                      "18px",
                                      "20px",
                                      "24px",
                                      "28px",
                                      "32px",
                                      "36px",
                                      "48px",
                                      "64px",
                                      "72px",
                                    ],
                                  },
                                  {
                                    p: "font-weight",
                                    label: "Font Weight",
                                    ph: "500",
                                    type: "select",
                                    opts: [
                                      "100",
                                      "200",
                                      "300",
                                      "400",
                                      "500",
                                      "600",
                                      "700",
                                      "800",
                                      "900",
                                    ],
                                  },
                                  {
                                    p: "font-style",
                                    label: "Font Style",
                                    ph: "normal",
                                    type: "select",
                                    opts: ["normal", "italic", "oblique"],
                                  },
                                  {
                                    p: "font-family",
                                    label: "Font Family",
                                    ph: "Inter",
                                    type: "select",
                                    opts: [
                                      "'Inter', sans-serif",
                                      "'Poppins', sans-serif",
                                      "'Roboto', sans-serif",
                                      "'Oswald', sans-serif",
                                      "'Montserrat', sans-serif",
                                      "'Fira Code', monospace",
                                      "'Bebas Neue', cursive",
                                      "'Press Start 2P', cursive",
                                      "'Orbitron', sans-serif",
                                      "'Arial', sans-serif",
                                      "'Georgia', serif",
                                      "'Courier New', monospace",
                                    ],
                                  },
                                  {
                                    p: "line-height",
                                    label: "Line Height",
                                    ph: "1.4",
                                    type: "presets",
                                    opts: [
                                      "1",
                                      "1.1",
                                      "1.2",
                                      "1.3",
                                      "1.4",
                                      "1.5",
                                      "1.6",
                                      "1.8",
                                      "2",
                                      "2.5",
                                      "normal",
                                    ],
                                  },
                                  {
                                    p: "letter-spacing",
                                    label: "Letter Spacing",
                                    ph: "0px",
                                    type: "presets",
                                    opts: [
                                      "-1px",
                                      "-0.5px",
                                      "0px",
                                      "0.3px",
                                      "0.5px",
                                      "1px",
                                      "1.5px",
                                      "2px",
                                      "3px",
                                      "4px",
                                      "5px",
                                      "0.05em",
                                      "0.1em",
                                      "0.2em",
                                    ],
                                  },
                                  {
                                    p: "text-align",
                                    label: "Text Align",
                                    ph: "left",
                                    type: "select",
                                    opts: [
                                      "left",
                                      "center",
                                      "right",
                                      "justify",
                                    ],
                                  },
                                  {
                                    p: "text-transform",
                                    label: "Text Transform",
                                    ph: "none",
                                    type: "select",
                                    opts: [
                                      "none",
                                      "uppercase",
                                      "lowercase",
                                      "capitalize",
                                    ],
                                  },
                                  {
                                    p: "text-decoration",
                                    label: "Text Decoration",
                                    ph: "none",
                                    type: "select",
                                    opts: [
                                      "none",
                                      "underline",
                                      "line-through",
                                      "overline",
                                      "underline wavy",
                                    ],
                                  },
                                  {
                                    p: "text-shadow",
                                    label: "Text Shadow",
                                    ph: "none",
                                    type: "presets",
                                    opts: [
                                      "none",
                                      "1px 1px 2px rgba(0,0,0,0.5)",
                                      "0 0 4px rgba(148,163,184,0.55)",
                                      "0 0 8px #94a3b8",
                                      "2px 2px 0 #000",
                                      "0 0 10px #fff, 0 0 20px #94a3b8",
                                      "0 0 6px #f59e0b",
                                      "0 2px 4px rgba(0,0,0,0.8)",
                                    ],
                                  },
                                  {
                                    p: "word-spacing",
                                    label: "Word Spacing",
                                    ph: "0px",
                                    type: "presets",
                                    opts: [
                                      "0px",
                                      "1px",
                                      "2px",
                                      "4px",
                                      "8px",
                                      "12px",
                                      "-1px",
                                      "-2px",
                                    ],
                                  },
                                ],
                              },
                              {
                                group: "Colors",
                                props: [
                                  {
                                    p: "color",
                                    label: "Text Color",
                                    ph: "#ffffff",
                                    type: "color",
                                  },
                                  {
                                    p: "background",
                                    label: "Background",
                                    ph: "transparent",
                                    type: "presets",
                                    opts: [
                                      "transparent",
                                      "none",
                                      "#0f172a",
                                      "#1e293b",
                                      "rgba(0,0,0,0.5)",
                                      "rgba(0,0,0,0.8)",
                                      "rgba(15,23,42,0.9)",
                                      "rgba(148,163,184,0.14)",
                                      "linear-gradient(135deg, #0f172a, #334155)",
                                      "linear-gradient(135deg, #0f172a, #1e293b)",
                                      "linear-gradient(to right, #475569, #94a3b8)",
                                      "linear-gradient(to bottom, transparent, rgba(0,0,0,0.8))",
                                    ],
                                  },
                                  {
                                    p: "background-color",
                                    label: "BG Color",
                                    ph: "transparent",
                                    type: "color",
                                  },
                                  {
                                    p: "opacity",
                                    label: "Opacity",
                                    ph: "1",
                                    type: "presets",
                                    opts: [
                                      "0",
                                      "0.1",
                                      "0.2",
                                      "0.3",
                                      "0.4",
                                      "0.5",
                                      "0.6",
                                      "0.7",
                                      "0.8",
                                      "0.9",
                                      "1",
                                    ],
                                  },
                                ],
                              },
                              {
                                group: "Layout",
                                props: [
                                  {
                                    p: "display",
                                    label: "Display",
                                    ph: "block",
                                    type: "select",
                                    opts: [
                                      "block",
                                      "flex",
                                      "grid",
                                      "inline",
                                      "inline-block",
                                      "inline-flex",
                                      "none",
                                    ],
                                  },
                                  {
                                    p: "flex-direction",
                                    label: "Flex Direction",
                                    ph: "row",
                                    type: "select",
                                    opts: [
                                      "row",
                                      "row-reverse",
                                      "column",
                                      "column-reverse",
                                    ],
                                  },
                                  {
                                    p: "justify-content",
                                    label: "Justify",
                                    ph: "flex-start",
                                    type: "select",
                                    opts: [
                                      "flex-start",
                                      "center",
                                      "flex-end",
                                      "space-between",
                                      "space-around",
                                      "space-evenly",
                                    ],
                                  },
                                  {
                                    p: "align-items",
                                    label: "Align Items",
                                    ph: "stretch",
                                    type: "select",
                                    opts: [
                                      "stretch",
                                      "flex-start",
                                      "center",
                                      "flex-end",
                                      "baseline",
                                    ],
                                  },
                                  {
                                    p: "flex-wrap",
                                    label: "Flex Wrap",
                                    ph: "nowrap",
                                    type: "select",
                                    opts: ["nowrap", "wrap", "wrap-reverse"],
                                  },
                                  {
                                    p: "gap",
                                    label: "Gap",
                                    ph: "0px",
                                    type: "presets",
                                    opts: [
                                      "0px",
                                      "2px",
                                      "4px",
                                      "6px",
                                      "8px",
                                      "10px",
                                      "12px",
                                      "16px",
                                      "20px",
                                      "24px",
                                      "32px",
                                    ],
                                  },
                                ],
                              },
                              {
                                group: "Transform & Effects",
                                props: [
                                  {
                                    p: "transform",
                                    label: "Transform",
                                    ph: "none",
                                    type: "presets",
                                    opts: [
                                      "none",
                                      "scale(1.05)",
                                      "scale(0.95)",
                                      "scale(1.1)",
                                      "scale(1.5)",
                                      "scale(2)",
                                      "rotate(5deg)",
                                      "rotate(15deg)",
                                      "rotate(45deg)",
                                      "rotate(90deg)",
                                      "rotate(180deg)",
                                      "skewX(5deg)",
                                      "skewY(5deg)",
                                      "translateX(10px)",
                                      "translateY(10px)",
                                      "translateX(-10px)",
                                      "perspective(500px) rotateY(15deg)",
                                    ],
                                  },
                                  {
                                    p: "filter",
                                    label: "Filter",
                                    ph: "none",
                                    type: "presets",
                                    opts: [
                                      "none",
                                      "blur(1px)",
                                      "blur(2px)",
                                      "blur(4px)",
                                      "brightness(0.5)",
                                      "brightness(1.2)",
                                      "brightness(1.5)",
                                      "contrast(1.5)",
                                      "contrast(2)",
                                      "grayscale(1)",
                                      "grayscale(0.5)",
                                      "sepia(1)",
                                      "sepia(0.5)",
                                      "saturate(1.5)",
                                      "saturate(2)",
                                      "hue-rotate(90deg)",
                                      "hue-rotate(180deg)",
                                      "invert(1)",
                                      "drop-shadow(0 4px 8px rgba(0,0,0,0.5))",
                                    ],
                                  },
                                  {
                                    p: "backdrop-filter",
                                    label: "Backdrop Filter",
                                    ph: "none",
                                    type: "presets",
                                    opts: [
                                      "none",
                                      "blur(4px)",
                                      "blur(8px)",
                                      "blur(12px)",
                                      "blur(16px)",
                                      "blur(24px)",
                                      "blur(8px) brightness(0.8)",
                                      "blur(12px) saturate(1.5)",
                                      "blur(16px) brightness(1.1)",
                                    ],
                                  },
                                  {
                                    p: "mix-blend-mode",
                                    label: "Blend Mode",
                                    ph: "normal",
                                    type: "select",
                                    opts: [
                                      "normal",
                                      "multiply",
                                      "screen",
                                      "overlay",
                                      "darken",
                                      "lighten",
                                      "color-dodge",
                                      "color-burn",
                                      "hard-light",
                                      "soft-light",
                                      "difference",
                                      "exclusion",
                                      "hue",
                                      "saturation",
                                      "color",
                                      "luminosity",
                                    ],
                                  },
                                  {
                                    p: "box-shadow",
                                    label: "Box Shadow",
                                    ph: "none",
                                    type: "presets",
                                    opts: [
                                      "none",
                                      "0 2px 4px rgba(0,0,0,0.3)",
                                      "0 4px 8px rgba(0,0,0,0.4)",
                                      "0 8px 16px rgba(0,0,0,0.5)",
                                      "0 4px 12px rgba(148,163,184,0.24)",
                                      "0 0 8px rgba(148,163,184,0.36)",
                                      "0 0 16px rgba(148,163,184,0.42)",
                                      "inset 0 2px 4px rgba(0,0,0,0.3)",
                                      "inset 0 0 8px rgba(148,163,184,0.24)",
                                      "0 0 0 2px #94a3b8",
                                      "0 0 0 2px #f59e0b",
                                      "0 20px 40px rgba(0,0,0,0.6)",
                                    ],
                                  },
                                  {
                                    p: "outline",
                                    label: "Outline",
                                    ph: "none",
                                    type: "presets",
                                    opts: [
                                      "none",
                                      "1px solid #fff",
                                      "2px solid #94a3b8",
                                      "2px dashed #f59e0b",
                                      "2px dotted #ef4444",
                                      "3px solid rgba(148,163,184,0.42)",
                                    ],
                                  },
                                  {
                                    p: "cursor",
                                    label: "Cursor",
                                    ph: "default",
                                    type: "select",
                                    opts: [
                                      "default",
                                      "pointer",
                                      "crosshair",
                                      "move",
                                      "text",
                                      "wait",
                                      "help",
                                      "not-allowed",
                                      "grab",
                                      "grabbing",
                                      "zoom-in",
                                      "zoom-out",
                                    ],
                                  },
                                ],
                              },
                              {
                                group: "Transitions",
                                props: [
                                  {
                                    p: "transition",
                                    label: "Transition",
                                    ph: "none",
                                    type: "presets",
                                    opts: [
                                      "none",
                                      "all 0.2s ease",
                                      "all 0.3s ease",
                                      "all 0.5s ease",
                                      "all 0.3s ease-in-out",
                                      "opacity 0.3s ease",
                                      "transform 0.3s ease",
                                      "all 0.3s cubic-bezier(0.4,0,0.2,1)",
                                      "all 0.5s cubic-bezier(0.4,0,0.2,1)",
                                    ],
                                  },
                                  {
                                    p: "animation",
                                    label: "Animation",
                                    ph: "none",
                                    type: "presets",
                                    opts: [
                                      "none",
                                      "spin 2s linear infinite",
                                      "pulse 2s ease-in-out infinite",
                                      "bounce 1s ease infinite",
                                      "ping 1s cubic-bezier(0,0,0.2,1) infinite",
                                    ],
                                  },
                                ],
                              },
                            ];
                            return CSS_PROPS.map((group) => (
                              <AdvancedCssGroup
                                key={group.group}
                                group={group}
                                values={adv}
                                onChange={setAdv}
                              />
                            ));
                          })()}
                          {Object.keys(w.config?.advancedCSS || {}).length >
                            0 && (
                            <button
                              className="wm-ctx-mini-btn"
                              style={{ marginTop: 4 }}
                              onClick={() => {
                                const latest =
                                  widgets.find((x) => x.id === w.id) || w;
                                handleConfigChange(latest, {
                                  ...latest.config,
                                  advancedCSS: {},
                                });
                              }}
                            >
                              Reset All Advanced
                            </button>
                          )}
                        </div>
                      </details>

                      {/* ── Element Styles (per-inner-element targeting) ── */}
                      <details className="wm-ctx-section">
                        <summary className="wm-ctx-section-title">
                          🎯 Element Styles
                        </summary>
                        <div className="wm-ctx-section-body wm-ctx-els">
                          <ElementStylesEditor
                            handleConfigChange={handleConfigChange}
                            setCtxHoverSel={setCtxHoverSel}
                            widget={w}
                            widgets={widgets}
                          />
                        </div>
                      </details>
                    </dialog>
                  );
                })()}
            </div>
          </div>
        )}

        {/* ──── Active Widgets Section ──── */}
        {widgets.length > 0 && (
          <div className="wm-section" data-tour="active-widgets">
            <h3 className="wm-section-title wm-section-title--active">
              <span className="wm-section-dot wm-section-dot--active" aria-hidden="true" />
              {"Active Widgets"}
              <span className="wm-section-count">{widgets.length}</span>
              <span className="wm-layer-hint">← back · front →</span>
            </h3>
            <div className="wm-tile-grid">
              {sortedWidgets.map((w, idx) => {
                const def = getWidgetDef(w.widget_type);
                const isVisible = w.is_visible;
                const isPreviewHidden = Boolean(w.config?._previewHidden);
                const isLocked = Boolean(w.config?._locked);
                const isDragOver = dragOverId === w.id && dragId !== w.id;
                const isContainerChild = containerChildIds.has(w.id);
                return (
                  <div
                    key={w.id}
                    className={getActiveTileClassName({
                      isContainerChild,
                      isDragOver,
                      isDragging: dragId === w.id,
                      isVisible,
                    })}
                    draggable
                    onDragStart={(e) => handleDragStart(e, w.id)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, w.id)}
                    onDrop={(e) => handleDrop(e, w.id)}
                  >
                    <span
                      className="wm-tile-layer-badge"
                      title={`Layer ${idx + 1}`}
                    >
                      {idx + 1}
                    </span>
                    <button
                      type="button"
                      className={`wm-toggle ${isVisible ? "wm-toggle--on" : ""}`}
                      onClick={() => handleToggle(w)}
                      title={getVisibilityToggleTitle(isVisible)}
                    >
                      <span className="wm-toggle-slider" aria-hidden="true" />
                      <span className="wm-toggle-label">
                        {isVisible ? "ON" : "OFF"}
                      </span>
                    </button>
                    <div className="wm-tile-body">
                      <span className="wm-tile-icon">{def?.icon || "📦"}</span>
                      <div className="wm-tile-text">
                        <span className="wm-tile-name">
                          {w.label || def?.label || w.widget_type}
                          {isContainerChild && (
                            <span
                              className="wm-tile-container-badge"
                              title="Inside a container"
                            >
                              📦
                            </span>
                          )}
                        </span>
                        {def?.description && (
                          <span className="wm-tile-desc">
                            {def.description}
                          </span>
                        )}
                        <span className="wm-tile-badges">
                          <span
                            className={`wm-tile-badge ${isVisible ? "wm-tile-badge--live" : "wm-tile-badge--hidden"}`}
                          >
                            {isVisible ? "Live" : "Hidden"}
                          </span>
                          {isLocked && (
                            <span className="wm-tile-badge">Locked</span>
                          )}
                          {isPreviewHidden && (
                            <span className="wm-tile-badge">
                              Preview hidden
                            </span>
                          )}
                          {def?.category && (
                            <span className="wm-tile-badge">
                              {def.category}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="wm-tile-quick-icons">
                      <button
                        className={`wm-tile-icon-btn${isPreviewHidden ? " wm-tile-icon-btn--off" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSave({
                            ...w,
                            config: {
                              ...w.config,
                              _previewHidden: !isPreviewHidden,
                            },
                          });
                        }}
                        title={getPreviewHiddenTitle(isPreviewHidden)}
                      >
                        {isPreviewHidden ? "🚫" : "👁️"}
                      </button>
                      <button
                        className={`wm-tile-icon-btn${isLocked ? " wm-tile-icon-btn--active" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSave({
                            ...w,
                            config: {
                              ...w.config,
                              _locked: !isLocked,
                            },
                          });
                        }}
                        title={getLockToggleTitle(isLocked)}
                      >
                        {isLocked ? "🔒" : "🔓"}
                      </button>
                    </div>
                    <div className="wm-tile-actions">
                      <div className="wm-tile-arrows">
                        <button
                          className="wm-tile-btn wm-tile-btn--arrow"
                          onClick={() => handleMoveLayer(w.id, -1)}
                          disabled={idx === 0}
                          title="Move back (lower layer)"
                        >
                          ◀
                        </button>
                        <button
                          className="wm-tile-btn wm-tile-btn--arrow"
                          onClick={() => handleMoveLayer(w.id, 1)}
                          disabled={idx === sortedWidgets.length - 1}
                          title="Move front (higher layer)"
                        >
                          ▶
                        </button>
                      </div>
                      <div className="wm-tile-actions-right">
                        <button
                          className="wm-tile-btn"
                          data-tour="tile-gear"
                          onClick={() => {
                            const nextId = editingId === w.id ? null : w.id;
                            setEditingId(nextId);
                            if (nextId) setSidePanelTab("configure");
                          }}
                          title="Settings"
                        >
                          ⚙️
                        </button>
                        <button
                          className="wm-tile-btn wm-tile-btn--danger"
                          onClick={() => onRemove(w.id)}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ──── Available Widgets Section ──── */}
        {inactiveDefs.length > 0 && (
          <div className="wm-section" data-tour="available-widgets">
            <h3 className="wm-section-title wm-section-title--inactive">
              <span className="wm-section-dot wm-section-dot--inactive" aria-hidden="true" />
              {"Available Widgets"}
              <span className="wm-section-count">
                {filteredInactiveDefs.length}/{inactiveDefs.length}
              </span>
            </h3>
            <div className="wm-library-toolbar">
              <label className="wm-library-search">
                <span>Search</span>
                <input
                  type="search"
                  value={widgetSearch}
                  onChange={(e) => handleWidgetSearchChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape" && widgetSearch)
                      clearWidgetFilters();
                  }}
                  aria-label="Search available widgets"
                  autoComplete="off"
                  placeholder="Find widgets, alerts, games, stream tools..."
                />
                {widgetSearch && (
                  <button
                    type="button"
                    className="wm-library-search__clear"
                    onClick={clearWidgetFilters}
                    aria-label="Clear widget search"
                    title="Clear search"
                  >
                    x
                  </button>
                )}
              </label>
              <div
                className="wm-library-categories"
                aria-label="Widget categories"
              >
                <button
                  type="button"
                  className={`wm-library-chip ${widgetCategory === "all" ? "wm-library-chip--active" : ""}`}
                  onClick={() => setWidgetCategory("all")}
                >
                  All <span>{inactiveDefs.length}</span>
                </button>
                {categoryEntries.map((cat) => (
                  <button
                    key={cat.key}
                    type="button"
                    className={`wm-library-chip ${widgetCategory === cat.key ? "wm-library-chip--active" : ""}`}
                    onClick={() => setWidgetCategory(cat.key)}
                  >
                    {cat.label} <span>{cat.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {filteredInactiveDefs.length === 0 ? (
              <div className="wm-empty-library">
                <strong>No widgets match this filter</strong>
                <span>
                  Try another category or clear the search to browse the full
                  add-on library.
                </span>
                <button
                  type="button"
                  className="wm-empty-library__reset"
                  onClick={clearWidgetFilters}
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="wm-library-groups">
                {Object.entries(inactiveByCategory).map(([cat, defs]) => (
                  <div className="wm-library-group" key={cat}>
                    <div className="wm-library-group__header">
                      <span>{cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
                      <em>{defs.length} available</em>
                    </div>
                    <div className="wm-tile-grid">
                      {defs.map((def) => (
                        <button
                          type="button"
                          key={def.type}
                          className="wm-tile wm-tile--inactive"
                          onClick={() => handleAdd(def.type)}
                          title="Click to add this widget"
                        >
                          <span className="wm-tile-icon">{def.icon}</span>
                          <div className="wm-tile-text">
                            <span className="wm-tile-name">{def.label}</span>
                            {def.description && (
                              <span className="wm-tile-desc">
                                {def.description}
                              </span>
                            )}
                            <span className="wm-tile-badges">
                              <span className="wm-tile-badge">
                                {def.category || "general"}
                              </span>
                              {def.styles?.length > 0 && (
                                <span className="wm-tile-badge">
                                  {def.styles.length} styles
                                </span>
                              )}
                            </span>
                          </div>
                          <span className="wm-tile-add">+ Add</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ──── Side Panel Editor ──── */}
      </div>

      {/* Docked Side Panel Editor */}
      {isSidePanelOpen && (
        <button
          type="button"
          className="wm-sidepanel-backdrop"
          onClick={() => setEditingId(null)}
          aria-label="Close widget editor"
        />
      )}
      <aside
        className={`wm-sidepanel${isSidePanelOpen ? " wm-sidepanel--open" : ""}`}
        aria-hidden={!isSidePanelOpen}
      >
        {editingWidget &&
          (() => {
            const w = editingWidget;
            const def = editingDef;
            const ConfigPanel = SidePanelConfig;
            const sideTabs = sidePanelTabs;
            return (
              <>
                <div className="wm-sidepanel-header">
                  <div className="wm-sidepanel-title">
                    <span className="wm-sidepanel-icon">
                      {def?.icon || "📦"}
                    </span>
                    <span>{w.label || def?.label || w.widget_type}</span>
                  </div>
                  <button
                    className="wm-sidepanel-close"
                    onClick={() => setEditingId(null)}
                  >
                    ✕
                  </button>
                </div>

                <div
                  className="wm-sidepanel-tabs"
                  role="tablist"
                  aria-label="Widget editor sections"
                >
                  {sideTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      className={`wm-sidepanel-tab ${activeSidePanelTab === tab.id ? "wm-sidepanel-tab--active" : ""}`}
                      onClick={() => !tab.disabled && setSidePanelTab(tab.id)}
                      disabled={tab.disabled}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="wm-sidepanel-body">
                  {/* OBS URL */}
                  {activeSidePanelTab === "obs" && overlayToken && (
                    <details className="wm-obs-details" open>
                      <summary className="wm-obs-summary">
                        🔗 OBS Browser Source URL{" "}
                        <span className="wm-obs-hint">
                          (for this widget only)
                        </span>
                      </summary>
                      <div className="wm-obs-row">
                        <input
                          readOnly
                          className="wm-obs-input"
                          value={`${window.location.origin}/overlay/${overlayToken}?widget=${w.id}`}
                          onClick={() => copyWidgetUrl(w.id)}
                          title="Click to copy"
                        />
                        <button
                          className="wm-obs-copy"
                          onClick={() => copyWidgetUrl(w.id)}
                        >
                          {copiedId === w.id ? "✓ Copied!" : "📋 Copy"}
                        </button>
                      </div>
                    </details>
                  )}

                  {/* Widget Config Panel */}
                  {activeSidePanelTab === "configure" && ConfigPanel && (
                    <div className="wm-config-panel">
                      <ConfigPanel
                        config={w.config}
                        onChange={(cfg) => handleConfigChange(w, cfg)}
                        allWidgets={widgets}
                        mode="widget"
                      />
                    </div>
                  )}

                  {activeSidePanelTab === "layout" && (
                    <div className="wm-layout-panel wm-layout-panel--precision">
                      <div className="wm-sidepanel-note">
                        These values update the OBS canvas position. Drag in
                        Live Preview for fast placement, then fine-tune here.
                      </div>
                      <div className="wm-precision-grid">
                        <label className="wm-animation-field">
                          <span className="wm-slider-label">X position</span>
                          <input
                            type="number"
                            min={0}
                            value={Math.round(w.position_x || 0)}
                            onChange={(e) =>
                              handlePositionChange(
                                w,
                                "position_x",
                                Math.max(0, +e.target.value),
                              )
                            }
                          />
                        </label>
                        <label className="wm-animation-field">
                          <span className="wm-slider-label">Y position</span>
                          <input
                            type="number"
                            min={0}
                            value={Math.round(w.position_y || 0)}
                            onChange={(e) =>
                              handlePositionChange(
                                w,
                                "position_y",
                                Math.max(0, +e.target.value),
                              )
                            }
                          />
                        </label>
                        <label className="wm-animation-field">
                          <span className="wm-slider-label">Width</span>
                          <input
                            type="number"
                            min={20}
                            value={Math.round(w.width || 0)}
                            onChange={(e) =>
                              handlePositionChange(
                                w,
                                "width",
                                Math.max(20, +e.target.value),
                              )
                            }
                          />
                        </label>
                        <label className="wm-animation-field">
                          <span className="wm-slider-label">Height</span>
                          <input
                            type="number"
                            min={20}
                            value={Math.round(w.height || 0)}
                            onChange={(e) =>
                              handlePositionChange(
                                w,
                                "height",
                                Math.max(20, +e.target.value),
                              )
                            }
                          />
                        </label>
                        <label className="wm-animation-field">
                          <span className="wm-slider-label">Layer</span>
                          <input
                            type="number"
                            min={1}
                            value={w.z_index || 1}
                            onChange={(e) =>
                              handlePositionChange(
                                w,
                                "z_index",
                                Math.max(1, +e.target.value),
                              )
                            }
                          />
                        </label>
                      </div>
                      <div className="wm-sidepanel-toggles">
                        <button
                          className={`wm-sidepanel-toggle ${w.is_visible !== false ? "wm-sidepanel-toggle--on" : ""}`}
                          onClick={() => handleToggle(w)}
                        >
                          {w.is_visible !== false
                            ? "Visible on stream"
                            : "Hidden from stream"}
                        </button>
                        <button
                          className={`wm-sidepanel-toggle ${w.config?._locked ? "wm-sidepanel-toggle--on" : ""}`}
                          onClick={() =>
                            onSave({
                              ...w,
                              config: {
                                ...w.config,
                                _locked: !w.config?._locked,
                              },
                            })
                          }
                        >
                          {w.config?._locked
                            ? "Position locked"
                            : "Lock position"}
                        </button>
                        <button
                          className={`wm-sidepanel-toggle ${w.config?._previewHidden ? "wm-sidepanel-toggle--on" : ""}`}
                          onClick={() =>
                            onSave({
                              ...w,
                              config: {
                                ...w.config,
                                _previewHidden: !w.config?._previewHidden,
                              },
                            })
                          }
                        >
                          {w.config?._previewHidden
                            ? "Hidden in preview"
                            : "Show in preview"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── Animations (all widgets) ── */}
                  {activeSidePanelTab === "motion" && (
                    <div className="wm-layout-panel">
                      <label className="wm-animation-field">
                        <span className="wm-slider-label">
                          🎬 Entrance Animation
                        </span>
                        <select
                          value={w.animation || "fade"}
                          onChange={(e) =>
                            handlePositionChange(w, "animation", e.target.value)
                          }
                        >
                          <optgroup label="Fade">
                            <option value="fade">Fade In</option>
                          </optgroup>
                          <optgroup label="Slide">
                            <option value="slide-up">
                              Slide In from Bottom
                            </option>
                            <option value="slide-down">
                              Slide In from Top
                            </option>
                            <option value="slide-left">
                              Slide In from Right
                            </option>
                            <option value="slide-right">
                              Slide In from Left
                            </option>
                          </optgroup>
                          <optgroup label="Swipe">
                            <option value="swipe-up">Swipe Up</option>
                            <option value="swipe-down">Swipe Down</option>
                            <option value="swipe-left">Swipe Left</option>
                            <option value="swipe-right">Swipe Right</option>
                          </optgroup>
                          <optgroup label="Scale">
                            <option value="scale">Scale Up</option>
                            <option value="scale-down">Scale Down</option>
                          </optgroup>
                          <optgroup label="Flip">
                            <option value="flip-x">Flip Horizontal</option>
                            <option value="flip-y">Flip Vertical</option>
                          </optgroup>
                          <optgroup label="Other">
                            <option value="bounce">Bounce In</option>
                            <option value="glow">Glow</option>
                            <option value="blur">Blur In</option>
                            <option value="rotate">Rotate In</option>
                            <option value="none">None</option>
                          </optgroup>
                        </select>
                      </label>

                      <label className="wm-animation-field">
                        <span className="wm-slider-label">
                          🎬 Exit Animation
                        </span>
                        <select
                          value={w.exit_animation || "fade"}
                          onChange={(e) =>
                            handlePositionChange(
                              w,
                              "exit_animation",
                              e.target.value,
                            )
                          }
                        >
                          <optgroup label="Fade">
                            <option value="fade">Fade Out</option>
                          </optgroup>
                          <optgroup label="Slide">
                            <option value="slide-up">Slide Out to Top</option>
                            <option value="slide-down">
                              Slide Out to Bottom
                            </option>
                            <option value="slide-left">
                              Slide Out to Left
                            </option>
                            <option value="slide-right">
                              Slide Out to Right
                            </option>
                          </optgroup>
                          <optgroup label="Swipe">
                            <option value="swipe-up">Swipe Up</option>
                            <option value="swipe-down">Swipe Down</option>
                            <option value="swipe-left">Swipe Left</option>
                            <option value="swipe-right">Swipe Right</option>
                          </optgroup>
                          <optgroup label="Scale">
                            <option value="scale">Scale Down</option>
                            <option value="scale-up">Scale Up</option>
                          </optgroup>
                          <optgroup label="Flip">
                            <option value="flip-x">Flip Horizontal</option>
                            <option value="flip-y">Flip Vertical</option>
                          </optgroup>
                          <optgroup label="Other">
                            <option value="bounce">Bounce Out</option>
                            <option value="glow">Glow</option>
                            <option value="blur">Blur Out</option>
                            <option value="rotate">Rotate Out</option>
                            <option value="none">None</option>
                          </optgroup>
                        </select>
                      </label>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
      </aside>
    </div>
  );
}
