/**
 * OverlayPreview.jsx — Inline live preview (no iframe).
 * Renders the same widget components scaled down inside the admin panel.
 */
import React, { useMemo, memo, useRef, useState, useEffect } from 'react';
import { getWidgetDef } from './widgets/widgetRegistry';

// Register built-in widgets (idempotent)
import './widgets/builtinWidgets';

const CANVAS_W = 1920;
const CANVAS_H = 1080;

const PreviewSlot = memo(function PreviewSlot({ widget, theme, allWidgets }) {
  const def = getWidgetDef(widget.widget_type);
  const Component = def?.component;
  if (!Component) return null;

  return (
    <div style={{
      position: 'absolute',
      left: widget.position_x,
      top: widget.position_y,
      width: widget.width,
      height: widget.height,
      zIndex: widget.z_index || 1,
    }}>
      <Component config={widget.config} theme={theme} allWidgets={allWidgets} />
    </div>
  );
});

export default function OverlayPreview({ widgets, theme }) {
  const wrapRef = useRef(null);
  const [scale, setScale] = useState(0.5);

  /* Dynamic scale to fit container width */
  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const availW = entry.contentRect.width - 32; // padding
        setScale(Math.min(availW / CANVAS_W, 0.65));
      }
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

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
