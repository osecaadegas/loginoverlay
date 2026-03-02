/**
 * OverlayPreview.jsx — Inline live preview (no iframe).
 * Renders the same widget components scaled down inside the admin panel.
 */
import React, { useMemo, memo, useRef, useState, useEffect } from 'react';
import { getWidgetDef } from './widgets/widgetRegistry';

// Register built-in widgets (idempotent)
import './widgets/builtinWidgets';

const DEFAULT_W = 1920;
const DEFAULT_H = 1080;

const PreviewSlot = memo(function PreviewSlot({ widget, theme, allWidgets }) {
  const def = getWidgetDef(widget.widget_type);
  const Component = def?.component;
  if (!Component) return null;

  const cfg = widget.config || {};
  const ss = cfg.shadowSize ?? 0;
  const si = cfg.shadowIntensity ?? 0;
  const hasShadow = ss > 0 && si > 0;

  return (
    <div style={{
      position: 'absolute',
      left: widget.position_x,
      top: widget.position_y,
      width: widget.width,
      height: widget.height,
      zIndex: widget.z_index || 1,
      overflow: 'visible',
      ...(hasShadow ? { filter: `drop-shadow(0 ${Math.round(ss * 0.35)}px ${Math.round(ss * 0.7)}px rgba(0,0,0,${(si / 100).toFixed(2)}))` } : {}),
    }}>
      <Component config={widget.config} theme={theme} allWidgets={allWidgets} />
    </div>
  );
});

export default function OverlayPreview({ widgets, theme }) {
  const wrapRef = useRef(null);
  const [scale, setScale] = useState(0.5);

  const CANVAS_W = theme?.canvas_width || DEFAULT_W;
  const CANVAS_H = theme?.canvas_height || DEFAULT_H;

  /* Dynamic scale to fit container width */
  useEffect(() => {
    if (!wrapRef.current) return;
    function calcScale() {
      const availW = wrapRef.current.getBoundingClientRect().width - 32;
      setScale(Math.min(availW / CANVAS_W, 0.65));
    }
    calcScale(); // recalc immediately on canvas size change
    const ro = new ResizeObserver(() => calcScale());
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [CANVAS_W, CANVAS_H]);

  const visibleWidgets = useMemo(() => (widgets || []).filter(w => w.is_visible), [widgets]);

  return (
    <div className="oc-preview-panel" ref={wrapRef}>
      <div className="oc-panel-header">
        <h2 className="oc-panel-title">👁️ Live Preview</h2>
        <span className="oc-preview-dims">{CANVAS_W} × {CANVAS_H} ({Math.round(scale * 100)}%)</span>
      </div>

      <div className="oc-preview-canvas-wrap" style={{
        width: CANVAS_W * scale,
        height: CANVAS_H * scale,
        margin: '0 auto',
        borderRadius: 10,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.08)',
        position: 'relative',
        background: '#0f0f1a',
      }}>
        <div style={{
          width: CANVAS_W,
          height: CANVAS_H,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          position: 'relative',
        }}>
          {visibleWidgets.map(w => (
            <PreviewSlot key={w.id} widget={w} theme={theme} allWidgets={widgets} />
          ))}
          {visibleWidgets.length === 0 && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255,255,255,0.25)', fontSize: 18, fontFamily: 'Inter, sans-serif',
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
