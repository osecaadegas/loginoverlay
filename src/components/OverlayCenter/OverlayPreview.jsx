/**
 * OverlayPreview.jsx — Inline live preview (no iframe).
 * Renders the same widget components scaled down inside the admin panel.
 */
import React, { useMemo, memo, useRef, useState, useEffect } from 'react';
import { getWidgetDef } from './widgets/widgetRegistry';
import buildThemeVars from './themeVarsBuilder';
import { buildCanvasBackground, buildWidgetAppearanceVars, normalizeAppearance, resolveWidgetsForAppearance } from './appearance/appearanceModel';

// Register built-in widgets (idempotent)
import './widgets/builtinWidgets';

const DEFAULT_W = 1920;
const DEFAULT_H = 1080;

const PreviewSlot = memo(function PreviewSlot({ widget, theme, allWidgets, canvasWidth, canvasHeight, selectedWidgetId, selectMode, onSelectWidget }) {
  const def = getWidgetDef(widget.widget_type);
  const Component = def?.component;
  if (!Component) return null;

  const isBg = widget.widget_type === 'background';
  const cfg = widget.config || {};
  const ss = cfg.shadowSize ?? 0;
  const si = cfg.shadowIntensity ?? 0;
  const hasShadow = ss > 0 && si > 0;

  return (
    <div
      className={selectedWidgetId === widget.id ? 'oc-preview-selected-widget' : undefined}
      data-widget-id={widget.id}
      data-widget-type={widget.widget_type}
      onClick={selectMode ? (event) => {
        event.preventDefault();
        event.stopPropagation();
        onSelectWidget?.(widget);
      } : undefined}
      style={{
      position: 'absolute',
      left: isBg ? 0 : widget.position_x,
      top: isBg ? 0 : widget.position_y,
      width: isBg ? canvasWidth : widget.width,
      height: isBg ? canvasHeight : widget.height,
      zIndex: widget.z_index || 1,
      overflow: 'visible',
      cursor: selectMode ? 'crosshair' : undefined,
      ...buildWidgetAppearanceVars(cfg),
      ...(hasShadow ? { filter: `drop-shadow(0 ${Math.round(ss * 0.35)}px ${Math.round(ss * 0.7)}px rgba(0,0,0,${(si / 100).toFixed(2)}))` } : {}),
    }}>
      <Component config={widget.config} theme={theme} allWidgets={allWidgets} />
    </div>
  );
});

export default function OverlayPreview({ widgets, theme, appearance, selectedWidgetId, selectedTarget, styleSelections, zoom = 'fit', previewMode = 'focus-widget', previewBackground = 'dark', selectMode = false, onSelectWidget }) {
  const wrapRef = useRef(null);
  const [scale, setScale] = useState(0.5);
  const resolvedAppearance = useMemo(() => normalizeAppearance(appearance || {}, { theme }), [appearance, theme]);
  const resolvedWidgets = useMemo(() => resolveWidgetsForAppearance(widgets || [], resolvedAppearance, theme, { styleSelections: styleSelections || {} }), [widgets, resolvedAppearance, theme, styleSelections]);

  const CANVAS_W = resolvedAppearance?.canvas?.width || theme?.canvas_width || DEFAULT_W;
  const CANVAS_H = resolvedAppearance?.canvas?.height || theme?.canvas_height || DEFAULT_H;

  const visibleWidgets = useMemo(() => {
    const base = (resolvedWidgets || []).filter(w => w.is_visible);
    if (previewMode === 'full-overlay' || selectMode) return base;
    if (selectedTarget?.scope === 'widget_instance' && selectedTarget.widgetId) {
      return base.filter(w => w.id === selectedTarget.widgetId);
    }
    if (selectedTarget?.scope === 'widget_type' && selectedTarget.widgetType) {
      return base.filter(w => w.widget_type === selectedTarget.widgetType);
    }
    return base;
  }, [resolvedWidgets, selectedTarget, previewMode, selectMode]);

  const focusWidget = useMemo(() => {
    if (!selectedWidgetId) return null;
    return visibleWidgets.find(widget => widget.id === selectedWidgetId) || null;
  }, [selectedWidgetId, visibleWidgets]);

  const focusActive = (previewMode === 'focus-widget' || previewMode === 'fit-widget') && focusWidget;
  const viewportWidth = focusActive ? Math.max(1, Number(focusWidget.width) || 1) : CANVAS_W;
  const viewportHeight = focusActive ? Math.max(1, Number(focusWidget.height) || 1) : CANVAS_H;
  const focusLeft = focusActive ? (focusWidget.widget_type === 'background' ? 0 : Number(focusWidget.position_x) || 0) : 0;
  const focusTop = focusActive ? (focusWidget.widget_type === 'background' ? 0 : Number(focusWidget.position_y) || 0) : 0;

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
      const targetW = focusActive ? viewportWidth : CANVAS_W;
      const maxScale = focusActive ? (previewMode === 'fit-widget' ? 2.5 : 1.8) : 0.65;
      setScale(fixedZoom || Math.min(availW / targetW, maxScale));
    }
    calcScale();
    const ro = new ResizeObserver(() => calcScale());
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [CANVAS_W, CANVAS_H, zoom, previewMode, focusActive, viewportWidth]);

  const previewBg = previewBackground === 'light'
    ? '#f8fafc'
    : previewBackground === 'checkerboard'
      ? 'linear-gradient(45deg, rgba(148,163,184,0.22) 25%, transparent 25%), linear-gradient(-45deg, rgba(148,163,184,0.22) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(148,163,184,0.22) 75%), linear-gradient(-45deg, transparent 75%, rgba(148,163,184,0.22) 75%)'
      : '#020617';
  const previewBgSize = previewBackground === 'checkerboard' ? '24px 24px' : undefined;
  const previewBgPosition = previewBackground === 'checkerboard' ? '0 0, 0 12px, 12px -12px, -12px 0px' : undefined;

  return (
    <div className="oc-preview-panel" ref={wrapRef}>
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
              selectMode={selectMode}
              onSelectWidget={onSelectWidget}
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
