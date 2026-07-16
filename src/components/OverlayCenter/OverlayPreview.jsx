/**
 * OverlayPreview.jsx — Inline live preview (no iframe).
 * Renders the same widget components scaled down inside the admin panel.
 */
import React, { useMemo, memo, useRef, useState, useEffect } from 'react';
import { getWidgetDef } from './widgets/widgetRegistry';
import buildThemeVars from './themeVarsBuilder';
import { buildCanvasBackground, buildWidgetAppearanceVars, normalizeAppearance, resolveWidgetsForAppearance } from './appearance/appearanceModel';
import { applyPreviewWidgetSamples, getWidgetPreviewFrame } from './appearance/previewWidgetSamples';

// Register built-in widgets (idempotent)
import './widgets/builtinWidgets';

const DEFAULT_W = 1920;
const DEFAULT_H = 1080;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function escapeCssAttr(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function buildElementSelectionCss(widgetId, selectedElementId, hiddenElementIds = []) {
  const widgetSelector = `[data-widget-id="${escapeCssAttr(widgetId)}"]`;
  const rules = [];
  if (selectedElementId) {
    rules.push(`
      ${widgetSelector} [data-widget-element="${escapeCssAttr(selectedElementId)}"] {
        outline: 3px solid rgba(94, 234, 212, 0.98) !important;
        outline-offset: 4px;
        box-shadow: 0 0 0 5px rgba(20, 184, 166, 0.18) !important;
      }
    `);
  }
  for (const elementId of hiddenElementIds || []) {
    rules.push(`
      ${widgetSelector} [data-widget-element="${escapeCssAttr(elementId)}"] {
        opacity: 0.18 !important;
        filter: grayscale(1) !important;
      }
    `);
  }
  return rules.join('\n');
}

function isWidgetHighlighted(widget, selectedTarget, selectedWidgetId) {
  if (selectedWidgetId) return widget.id === selectedWidgetId;
  if (selectedTarget?.scope === 'widget_type' && selectedTarget.widgetType) return widget.widget_type === selectedTarget.widgetType;
  return false;
}

function getPreviewSlotSize(widget) {
  const frame = getWidgetPreviewFrame(widget);
  const configuredWidth = Number(widget.config?.widgetWidth);
  const configuredHeight = Number(widget.config?.widgetHeight);
  return {
    width: configuredWidth || frame?.width || widget.width,
    height: configuredHeight || frame?.height || widget.height,
  };
}

const PreviewSlot = memo(function PreviewSlot({
  widget,
  theme,
  allWidgets,
  canvasWidth,
  canvasHeight,
  selectedWidgetId,
  selectedTarget,
  selectedElementId,
  hiddenElementIds,
  scale,
  dimmed,
  selectMode,
  onSelectWidget,
  onSelectElement,
  onResizeWidget,
}) {
  const def = getWidgetDef(widget.widget_type);
  const Component = def?.component;
  if (!Component) return null;

  const isBg = widget.widget_type === 'background';
  const cfg = widget.config || {};
  const ss = cfg.shadowSize ?? 0;
  const si = cfg.shadowIntensity ?? 0;
  const hasShadow = ss > 0 && si > 0;
  const slotSize = getPreviewSlotSize(widget);
  const wStyle = cfg.displayStyle || '';
  const isBH = widget.widget_type === 'bonus_hunt';
  const needs3D = wStyle === 'v3' || wStyle === 'v8_card_stack'
    || (isBH && !['v2', 'v5_compact'].includes(wStyle));
  const needsVisible = needs3D || !!cfg.npcEnabled || widget.widget_type === 'navbar';
  const highlighted = isWidgetHighlighted(widget, selectedTarget, selectedWidgetId);
  const selectionCss = selectMode && highlighted
    ? buildElementSelectionCss(widget.id, selectedElementId, hiddenElementIds)
    : '';
  const startResize = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = slotSize.width;
    const startHeight = slotSize.height;
    const divisor = Math.max(0.1, Number(scale) || 1);
    const onMove = (moveEvent) => {
      const width = clamp(Math.round(startWidth + ((moveEvent.clientX - startX) / divisor)), 80, 3840);
      const height = clamp(Math.round(startHeight + ((moveEvent.clientY - startY) / divisor)), 50, 2160);
      onResizeWidget?.(widget, { width, height });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
  };

  return (
    <div
      className={[
        highlighted ? 'oc-preview-selected-widget' : '',
        dimmed ? 'oc-preview-dimmed-widget' : '',
      ].filter(Boolean).join(' ') || undefined}
      data-widget-id={widget.id}
      data-widget-type={widget.widget_type}
      onClick={selectMode ? (event) => {
        event.preventDefault();
        event.stopPropagation();
        const elementNode = event.target?.closest?.('[data-widget-element]');
        const elementInsideWidget = elementNode && event.currentTarget.contains(elementNode);
        if (elementInsideWidget) {
          onSelectElement?.({
            widget,
            elementId: elementNode.getAttribute('data-widget-element'),
            stateId: elementNode.getAttribute('data-widget-state') || 'default',
          });
          return;
        }
        onSelectWidget?.(widget);
      } : undefined}
      style={{
      position: 'absolute',
      left: isBg ? 0 : widget.position_x,
      top: isBg ? 0 : widget.position_y,
      width: isBg ? canvasWidth : slotSize.width,
      height: isBg ? canvasHeight : slotSize.height,
      zIndex: widget.z_index || 1,
      overflow: isBg || needsVisible ? 'visible' : 'hidden',
      cursor: selectMode ? 'crosshair' : undefined,
      opacity: dimmed ? 0.24 : 1,
      transition: 'opacity 140ms ease',
      ...buildWidgetAppearanceVars(cfg),
      ...(hasShadow ? { filter: `drop-shadow(0 ${Math.round(ss * 0.35)}px ${Math.round(ss * 0.7)}px rgba(0,0,0,${(si / 100).toFixed(2)}))` } : {}),
    }}>
      {selectionCss && <style>{selectionCss}</style>}
      <Component config={widget.config} theme={theme} allWidgets={allWidgets} />
      {selectMode && highlighted && !isBg && onResizeWidget && (
        <button
          type="button"
          className="oc-preview-resize-handle"
          onPointerDown={startResize}
          aria-label="Resize selected widget"
          title="Drag to resize this widget"
        />
      )}
    </div>
  );
});

export default function OverlayPreview({
  widgets,
  theme,
  appearance,
  selectedWidgetId,
  selectedTarget,
  selectedElementId,
  hiddenElementIds,
  styleSelections,
  zoom = 'fit',
  previewMode = 'focus-widget',
  previewBackground = 'dark',
  selectMode = false,
  onSelectWidget,
  onSelectElement,
  onResizeWidget,
}) {
  const wrapRef = useRef(null);
  const previewNowRef = useRef(Date.now());
  const [scale, setScale] = useState(0.5);
  const resolvedAppearance = useMemo(() => normalizeAppearance(appearance || {}, { theme }), [appearance, theme]);
  const resolvedWidgets = useMemo(() => applyPreviewWidgetSamples(
    resolveWidgetsForAppearance(widgets || [], resolvedAppearance, theme, { styleSelections: styleSelections || {} }),
    { now: previewNowRef.current, expandFrames: !selectMode && ['focus-widget', 'fit-widget'].includes(previewMode) }
  ), [widgets, resolvedAppearance, theme, styleSelections, previewMode, selectMode]);

  const CANVAS_W = resolvedAppearance?.canvas?.width || theme?.canvas_width || DEFAULT_W;
  const CANVAS_H = resolvedAppearance?.canvas?.height || theme?.canvas_height || DEFAULT_H;

  const baseVisibleWidgets = useMemo(() => (resolvedWidgets || []).filter(w => w.is_visible), [resolvedWidgets]);

  const focusWidget = useMemo(() => {
    if (selectedWidgetId) return baseVisibleWidgets.find(widget => widget.id === selectedWidgetId) || null;
    if (selectedTarget?.scope === 'widget_type' && selectedTarget.widgetType) {
      return baseVisibleWidgets.find(widget => widget.widget_type === selectedTarget.widgetType) || null;
    }
    return null;
  }, [baseVisibleWidgets, selectedTarget, selectedWidgetId]);

  const visibleWidgets = useMemo(() => {
    if (previewMode === 'full-overlay' || previewMode === 'focus-widget' || previewMode === 'actual-scale' || previewMode === 'fit-canvas' || selectMode) return baseVisibleWidgets;
    if (previewMode === 'fit-widget' && selectedTarget?.scope === 'widget_instance' && selectedTarget.widgetId) {
      return baseVisibleWidgets.filter(w => w.id === selectedTarget.widgetId);
    }
    if (previewMode === 'fit-widget' && selectedTarget?.scope === 'widget_type' && selectedTarget.widgetType) {
      return baseVisibleWidgets.filter(w => w.widget_type === selectedTarget.widgetType);
    }
    return baseVisibleWidgets;
  }, [baseVisibleWidgets, selectedTarget, previewMode, selectMode]);

  const contextFocusActive = previewMode === 'focus-widget' && focusWidget && !selectMode;
  const fitWidgetActive = previewMode === 'fit-widget' && focusWidget && !selectMode;
  const focusSize = focusWidget ? getPreviewSlotSize(focusWidget) : { width: CANVAS_W, height: CANVAS_H };
  const focusWidth = Math.max(1, Number(focusSize.width) || 1);
  const focusHeight = Math.max(1, Number(focusSize.height) || 1);
  const focusX = focusWidget ? (focusWidget.widget_type === 'background' ? 0 : Number(focusWidget.position_x) || 0) : 0;
  const focusY = focusWidget ? (focusWidget.widget_type === 'background' ? 0 : Number(focusWidget.position_y) || 0) : 0;
  const focusMargin = contextFocusActive ? Math.max(96, Math.round(Math.max(focusWidth, focusHeight) * 0.28)) : 0;
  const viewportWidth = fitWidgetActive
    ? focusWidth
    : contextFocusActive
      ? Math.min(CANVAS_W, Math.max(focusWidth + focusMargin * 2, 640))
      : CANVAS_W;
  const viewportHeight = fitWidgetActive
    ? focusHeight
    : contextFocusActive
      ? Math.min(CANVAS_H, Math.max(focusHeight + focusMargin * 2, 360))
      : CANVAS_H;
  const focusLeft = (contextFocusActive || fitWidgetActive)
    ? clamp(focusX + focusWidth / 2 - viewportWidth / 2, 0, Math.max(0, CANVAS_W - viewportWidth))
    : 0;
  const focusTop = (contextFocusActive || fitWidgetActive)
    ? clamp(focusY + focusHeight / 2 - viewportHeight / 2, 0, Math.max(0, CANVAS_H - viewportHeight))
    : 0;
  const dimUnfocused = contextFocusActive || (previewMode === 'focus-widget' && selectedTarget?.scope === 'widget_type');

  /* Dynamic scale to fit container width */
  useEffect(() => {
    if (!wrapRef.current) return;
    function calcScale() {
      const availW = wrapRef.current.getBoundingClientRect().width - 32;
      const fixedZoom = zoom !== 'fit' ? Number(String(zoom).replace('%', '')) / 100 : null;
      if (previewMode === 'actual-scale') {
        setScale(fixedZoom || 1);
        return;
      }
      const targetW = contextFocusActive || fitWidgetActive ? viewportWidth : CANVAS_W;
      const maxScale = fitWidgetActive ? 2.5 : contextFocusActive ? 1.75 : 0.65;
      setScale(fixedZoom || Math.min(availW / targetW, maxScale));
    }
    calcScale();
    const ro = new ResizeObserver(() => calcScale());
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [CANVAS_W, zoom, previewMode, contextFocusActive, fitWidgetActive, viewportWidth]);

  const previewBg = previewBackground === 'light'
    ? '#f8fafc'
    : previewBackground === 'green'
      ? '#00b140'
    : previewBackground === 'checkerboard'
      ? 'linear-gradient(45deg, rgba(148,163,184,0.22) 25%, transparent 25%), linear-gradient(-45deg, rgba(148,163,184,0.22) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(148,163,184,0.22) 75%), linear-gradient(-45deg, transparent 75%, rgba(148,163,184,0.22) 75%)'
      : '#020617';
  const previewBgSize = previewBackground === 'checkerboard' ? '24px 24px' : undefined;
  const previewBgPosition = previewBackground === 'checkerboard' ? '0 0, 0 12px, 12px -12px, -12px 0px' : undefined;

  return (
    <div className={`oc-preview-panel${selectMode ? ' oc-preview-select-mode' : ''}`} ref={wrapRef}>
      <div className="oc-panel-header">
        <h2 className="oc-panel-title">👁️ Live Preview</h2>
        <span className="oc-preview-dims">{CANVAS_W} × {CANVAS_H} ({Math.round(scale * 100)}%)</span>
      </div>

      <div className="oc-preview-canvas-wrap" style={{
        width: viewportWidth * scale,
        height: viewportHeight * scale,
        margin: '0 auto',
        borderRadius: 10,
        overflow: 'hidden',
        border: '1px solid rgba(148,163,184,0.28)',
        position: 'relative',
        background: previewBg,
        backgroundSize: previewBgSize,
        backgroundPosition: previewBgPosition,
      }}>
        <div className="wm-live-canvas" data-theme={theme?.style_preset || 'classic'} style={{
          width: CANVAS_W,
          height: CANVAS_H,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          position: 'absolute',
          left: -focusLeft * scale,
          top: -focusTop * scale,
          background: buildCanvasBackground(resolvedAppearance.canvas),
          ...buildThemeVars(theme, resolvedAppearance),
        }}>
          {visibleWidgets.map(w => (
            <PreviewSlot
              key={w.id}
              widget={w}
              theme={theme}
              allWidgets={resolvedWidgets}
              canvasWidth={CANVAS_W}
              canvasHeight={CANVAS_H}
              selectedWidgetId={selectedWidgetId}
              selectedTarget={selectedTarget}
              selectedElementId={selectedElementId}
              hiddenElementIds={hiddenElementIds}
              scale={scale}
              dimmed={dimUnfocused && !isWidgetHighlighted(w, selectedTarget, selectedWidgetId)}
              selectMode={selectMode}
              onSelectWidget={onSelectWidget}
              onSelectElement={onSelectElement}
              onResizeWidget={onResizeWidget}
            />
          ))}
          {visibleWidgets.length === 0 && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(201,184,232,0.55)', fontSize: 18, fontFamily: 'Inter, sans-serif',
            }}>
              No visible widgets
            </div>
          )}
        </div>
      </div>

      <p className="oc-preview-hint">
        This is a live preview. Changes you make in the Widgets panel update here in real-time.
      </p>
    </div>
  );
}
