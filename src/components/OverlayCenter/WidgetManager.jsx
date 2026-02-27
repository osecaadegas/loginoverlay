/**
 * WidgetManager.jsx — Widget list + add/remove/configure widgets
 */
import React, { useState, useCallback, useMemo, useRef, useEffect, memo } from 'react';
import { getWidgetDef, getWidgetsByCategory } from './widgets/widgetRegistry';

/* ── Draggable preview slot — OBS-style click & drag + resize ── */
const DraggableSlot = memo(function DraggableSlot({
  widget, theme, allWidgets, isSelected, scale, onSelect, onMove, onResize, onStyleCycle,
}) {
  const def = getWidgetDef(widget.widget_type);
  const Component = def?.component;
  const slotRef = useRef(null);
  const coordsRef = useRef(null);

  /* Block native text selection during any drag */
  const blockSelect = useCallback((e) => e.preventDefault(), []);

  function startDrag() {
    document.body.classList.add('wm-dragging');
    document.addEventListener('selectstart', blockSelect);
    window.getSelection()?.removeAllRanges();
  }
  function endDrag() {
    document.body.classList.remove('wm-dragging');
    document.removeEventListener('selectstart', blockSelect);
  }

  /* ── Drag to move — update DOM directly, save on mouseup ── */
  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('.wm-resize-handle')) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect(widget.id);

    const el = slotRef.current;
    if (!el) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const origPx = widget.position_x;
    const origPy = widget.position_y;
    let curX = origPx, curY = origPy;

    startDrag();

    function onMouseMove(ev) {
      ev.preventDefault();
      const dx = (ev.clientX - startX) / scale;
      const dy = (ev.clientY - startY) / scale;
      curX = Math.max(0, Math.round(origPx + dx));
      curY = Math.max(0, Math.round(origPy + dy));
      el.style.left = curX + 'px';
      el.style.top = curY + 'px';
      if (coordsRef.current) {
        coordsRef.current.textContent = `${curX}, ${curY} — ${Math.round(widget.width)}×${Math.round(widget.height)}`;
      }
    }

    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      endDrag();
      document.body.style.cursor = '';
      onMove(widget.id, curX, curY);
    }

    document.body.style.cursor = 'grabbing';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [widget.id, widget.position_x, widget.position_y, widget.width, widget.height, scale, onSelect, onMove, blockSelect]);

  /* ── Resize from corner handle — update DOM directly, save on mouseup ── */
  const handleResizeDown = useCallback((e, corner) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(widget.id);

    const el = slotRef.current;
    if (!el) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const origW = widget.width;
    const origH = widget.height;
    const origPx = widget.position_x;
    const origPy = widget.position_y;
    let curX = origPx, curY = origPy, curW = origW, curH = origH;

    startDrag();

    function onMouseMove(ev) {
      ev.preventDefault();
      const dx = (ev.clientX - startX) / scale;
      const dy = (ev.clientY - startY) / scale;
      curW = origW; curH = origH; curX = origPx; curY = origPy;

      if (corner === 'se') {
        curW = Math.max(20, origW + dx);
        curH = Math.max(20, origH + dy);
      } else if (corner === 'sw') {
        curW = Math.max(20, origW - dx);
        curH = Math.max(20, origH + dy);
        curX = origPx + (origW - curW);
      } else if (corner === 'ne') {
        curW = Math.max(20, origW + dx);
        curH = Math.max(20, origH - dy);
        curY = origPy + (origH - curH);
      } else if (corner === 'nw') {
        curW = Math.max(20, origW - dx);
        curH = Math.max(20, origH - dy);
        curX = origPx + (origW - curW);
        curY = origPy + (origH - curH);
      }

      curX = Math.round(curX); curY = Math.round(curY);
      curW = Math.round(curW); curH = Math.round(curH);
      el.style.left = curX + 'px';
      el.style.top = curY + 'px';
      el.style.width = curW + 'px';
      el.style.height = curH + 'px';
      if (coordsRef.current) {
        coordsRef.current.textContent = `${curX}, ${curY} — ${curW}×${curH}`;
      }
    }

    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      endDrag();
      document.body.style.cursor = '';
      onResize(widget.id, curX, curY, curW, curH);
    }

    document.body.style.cursor = corner === 'se' ? 'nwse-resize' : corner === 'sw' ? 'nesw-resize' : corner === 'ne' ? 'nesw-resize' : 'nwse-resize';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [widget.id, widget.width, widget.height, widget.position_x, widget.position_y, scale, onSelect, onResize, blockSelect]);

  if (!Component) return null;

  return (
    <div
      ref={slotRef}
      className={`wm-live-slot ${isSelected ? 'wm-live-slot--selected' : ''}`}
      style={{
        position: 'absolute',
        left: widget.position_x,
        top: widget.position_y,
        width: widget.width,
        height: widget.height,
        zIndex: isSelected ? 9999 : (widget.z_index || 1),
      }}
    >
      {/* Widget content — rendered underneath, no interaction */}
      <div style={{ pointerEvents: 'none', width: '100%', height: '100%', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        <Component config={widget.config} theme={theme} allWidgets={allWidgets} />
      </div>

      {/* Transparent drag surface on top — catches ALL mouse events */}
      <div
        className="wm-drag-overlay"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 2,
          cursor: isSelected ? 'grab' : 'pointer',
          background: 'transparent',
        }}
        onMouseDown={handleMouseDown}
        onDragStart={e => e.preventDefault()}
      />

      {/* Selection overlay + resize handles (highest z) */}
      {isSelected && (
        <div className="wm-slot-selection" style={{ zIndex: 3 }}>
          <div className="wm-resize-handle wm-resize-nw" onMouseDown={e => handleResizeDown(e, 'nw')} />
          <div className="wm-resize-handle wm-resize-ne" onMouseDown={e => handleResizeDown(e, 'ne')} />
          <div className="wm-resize-handle wm-resize-sw" onMouseDown={e => handleResizeDown(e, 'sw')} />
          <div className="wm-resize-handle wm-resize-se" onMouseDown={e => handleResizeDown(e, 'se')} />
          {def?.styles?.length > 1 && (
            <button
              className="wm-style-cycle-btn"
              title={`Style: ${(def.styles.find(s => s.id === (widget.config?.[def.styleConfigKey || 'displayStyle'] || def.styles[0].id)) || def.styles[0]).label} — click to cycle`}
              onMouseDown={e => { e.stopPropagation(); e.preventDefault(); onStyleCycle?.(widget); }}
            >
              🎨
            </button>
          )}
          <div className="wm-slot-coords" ref={coordsRef}>
            {Math.round(widget.position_x)}, {Math.round(widget.position_y)} — {Math.round(widget.width)}×{Math.round(widget.height)}
          </div>
        </div>
      )}
    </div>
  );
});

/* ── Per-widget sync mapping from navbar config ── */
function buildSyncedConfig(widgetType, currentConfig, nb) {
  if (!nb) return null;
  const c = currentConfig || {};
  switch (widgetType) {
    case 'image_slideshow':
      return {
        ...c,
        borderColor: nb.accentColor || 'rgba(51,65,85,0.5)',
        gradientColor: nb.bgColor || 'rgba(15,23,42,0.8)',
        captionColor: nb.textColor || '#e2e8f0',
      };
    case 'rtp_stats':
      return {
        ...c,
        barBgFrom: nb.bgColor || '#111827',
        barBgVia: nb.bgColor || '#1e3a5f',
        barBgTo: nb.bgColor || '#111827',
        borderColor: nb.accentColor || '#1d4ed8',
        textColor: nb.textColor || '#ffffff',
        providerColor: nb.textColor || '#ffffff',
        slotNameColor: nb.textColor || '#ffffff',
        fontFamily: nb.fontFamily || "'Inter', sans-serif",
        fontSize: nb.fontSize ?? 14,
      };
    case 'background':
      return {
        ...c,
        color1: nb.bgColor || '#0f172a',
        color2: nb.accentColor || '#1e3a5f',
      };
    case 'chat':
      return {
        ...c,
        bgColor: nb.bgColor || '#111318',
        textColor: nb.textColor || '#f1f5f9',
        headerBg: nb.bgColor || '#111318',
        headerText: nb.mutedColor || '#94a3b8',
        borderColor: nb.accentColor || '#f59e0b',
        fontFamily: nb.fontFamily || "'Inter', sans-serif",
        fontSize: nb.fontSize ?? 13,
      };
    case 'bonus_hunt':
      return {
        ...c,
        headerColor: nb.bgColor || '#111318',
        headerAccent: nb.accentColor || '#f59e0b',
        countCardColor: nb.bgColor || '#111318',
        currentBonusColor: nb.bgColor || '#111318',
        currentBonusAccent: nb.accentColor || '#f59e0b',
        listCardColor: nb.bgColor || '#111318',
        listCardAccent: nb.accentColor || '#f59e0b',
        summaryColor: nb.bgColor || '#111318',
        totalPayColor: nb.accentColor || '#f59e0b',
        totalPayText: nb.textColor || '#f1f5f9',
        superBadgeColor: nb.ctaColor || '#f43f5e',
        extremeBadgeColor: nb.ctaColor || '#f43f5e',
        textColor: nb.textColor || '#f1f5f9',
        mutedTextColor: nb.mutedColor || '#94a3b8',
        statValueColor: nb.textColor || '#f1f5f9',
        cardOutlineColor: nb.borderColor || nb.accentColor || '#f59e0b',
        cardOutlineWidth: nb.borderWidth ?? 2,
        fontFamily: nb.fontFamily || "'Inter', sans-serif",
        fontSize: nb.fontSize ?? 13,
        ...(nb.brightness != null && { brightness: nb.brightness }),
        ...(nb.contrast != null && { contrast: nb.contrast }),
        ...(nb.saturation != null && { saturation: nb.saturation }),
      };
    case 'tournament':
      return {
        ...c,
        bgColor: nb.bgColor || '#13151e',
        cardBg: nb.bgColor || '#1a1d2e',
        cardBorder: nb.accentColor || 'rgba(255,255,255,0.08)',
        nameColor: nb.textColor || '#ffffff',
        fontFamily: nb.fontFamily || "'Inter', sans-serif",
      };
    default:
      return null; // widget has no sync mapping
  }
}

export default function WidgetManager({ widgets, theme, onAdd, onSave, onRemove, availableWidgets, overlayToken }) {
  const [editingId, setEditingId] = useState(null);
  const [showPreview, setShowPreview] = useState(true);
  const [selectedPreviewId, setSelectedPreviewId] = useState(null);
  const [syncMsg, setSyncMsg] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const previewRef = useRef(null);
  const [previewScale, setPreviewScale] = useState(0.35);

  const CANVAS_W = theme?.canvas_width || 1920;
  const CANVAS_H = theme?.canvas_height || 1080;

  /* Dynamic scale for live preview */
  useEffect(() => {
    if (!showPreview || !previewRef.current) return;
    function calcScale() {
      const avail = previewRef.current.getBoundingClientRect().width - 4;
      setPreviewScale(Math.min(avail / CANVAS_W, 0.55));
    }
    calcScale();
    const ro = new ResizeObserver(calcScale);
    ro.observe(previewRef.current);
    return () => ro.disconnect();
  }, [showPreview, CANVAS_W]);

  const visibleWidgets = useMemo(() => (widgets || []).filter(w => w.is_visible), [widgets]);

  /* ── Drag handlers for live preview ── */
  const handlePreviewSelect = useCallback((id) => {
    setSelectedPreviewId(id);
  }, []);

  /* ── Arrow-key nudge for selected widget (1px per press, 10px with Shift) ── */
  useEffect(() => {
    if (!selectedPreviewId) return;
    function onKeyDown(e) {
      const delta = e.shiftKey ? 10 : 1;
      let dx = 0, dy = 0;
      switch (e.key) {
        case 'ArrowLeft':  dx = -delta; break;
        case 'ArrowRight': dx = delta;  break;
        case 'ArrowUp':    dy = -delta; break;
        case 'ArrowDown':  dy = delta;  break;
        default: return;
      }
      e.preventDefault();
      const w = widgets.find(w => w.id === selectedPreviewId);
      if (!w) return;
      onSave({ ...w, position_x: Math.max(0, w.position_x + dx), position_y: Math.max(0, w.position_y + dy) });
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedPreviewId, widgets, onSave]);

  const handlePreviewMove = useCallback((id, newX, newY) => {
    const w = widgets.find(w => w.id === id);
    if (!w) return;
    onSave({ ...w, position_x: Math.max(0, newX), position_y: Math.max(0, newY) });
  }, [widgets, onSave]);

  const handlePreviewResize = useCallback((id, newX, newY, newW, newH) => {
    const w = widgets.find(w => w.id === id);
    if (!w) return;
    onSave({ ...w, position_x: Math.max(0, newX), position_y: Math.max(0, newY), width: newW, height: newH });
  }, [widgets, onSave]);

  /* Deselect when clicking on empty canvas area */
  const handleCanvasClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      setSelectedPreviewId(null);
    }
  }, []);

  const copyWidgetUrl = useCallback((widgetId) => {
    if (!overlayToken) return;
    const url = `${window.location.origin}/overlay/${overlayToken}?widget=${widgetId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(widgetId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, [overlayToken]);

  const categories = getWidgetsByCategory();
  const allDefs = useMemo(() => Object.values(categories).flat(), [categories]);

  /* Derive which types the user has added */
  const activeTypes = useMemo(() => new Set((widgets || []).map(w => w.widget_type)), [widgets]);
  const inactiveDefs = useMemo(() => allDefs.filter(d => !activeTypes.has(d.type)), [allDefs, activeTypes]);

  const handleToggle = useCallback((widget) => {
    onSave({ ...widget, is_visible: !widget.is_visible });
  }, [onSave]);

  const handleConfigChange = useCallback((widget, newConfig) => {
    onSave({ ...widget, config: newConfig });
  }, [onSave]);

  /* Cycle to next style for a widget (used by floating preview button) */
  const handleStyleCycle = useCallback((widget) => {
    const def = getWidgetDef(widget.widget_type);
    const styles = def?.styles;
    if (!styles || styles.length < 2) return;
    const key = def.styleConfigKey || 'displayStyle';
    const current = widget.config?.[key] || styles[0].id;
    const idx = styles.findIndex(s => s.id === current);
    const next = styles[(idx + 1) % styles.length];
    onSave({ ...widget, config: { ...widget.config, [key]: next.id } });
  }, [onSave]);

  const handlePositionChange = useCallback((widget, field, value) => {
    onSave({ ...widget, [field]: value });
  }, [onSave]);

  const handleAdd = useCallback(async (type) => {
    const def = getWidgetDef(type);
    await onAdd(type, def?.defaults || {});
  }, [onAdd]);

  /* ── Sync ALL widgets from the navbar ── */
  const syncAllFromNavbar = useCallback(async () => {
    const navWidget = widgets.find(w => w.widget_type === 'navbar');
    if (!navWidget) {
      setSyncMsg('No navbar widget found');
      setTimeout(() => setSyncMsg(''), 2500);
      return;
    }
    const nb = navWidget.config || {};
    let count = 0;
    for (const w of widgets) {
      if (w.widget_type === 'navbar') continue;
      const synced = buildSyncedConfig(w.widget_type, w.config, nb);
      if (synced) {
        await onSave({ ...w, config: synced });
        count++;
      }
    }
    setSyncMsg(`Synced ${count} widget${count !== 1 ? 's' : ''} with Navbar!`);
    setTimeout(() => setSyncMsg(''), 3000);
  }, [widgets, onSave]);

  return (
    <div className="oc-widgets-panel">
      {/* ──── Page Header ──── */}
      <div className="wm-page-header">
        <div className="wm-page-header-text">
          <h2 className="wm-page-title">Widgets</h2>
          <p className="wm-page-desc">
            Build your overlay by adding widgets below. Click any widget to open its settings.
          </p>
        </div>
        <div className="wm-page-header-actions">
          {syncMsg && <span className="wm-sync-toast">{syncMsg}</span>}
          <button
            className={`wm-btn ${showPreview ? 'wm-btn--preview-on' : 'wm-btn--ghost'}`}
            onClick={() => setShowPreview(v => !v)}
            title="Toggle live overlay preview"
          >
            👁️ {showPreview ? 'Hide Preview' : 'Live Preview'}
          </button>
          <button className="wm-btn wm-btn--ghost" onClick={syncAllFromNavbar} title="Copy the Navbar's colors and fonts to all other widgets automatically" data-tour="sync-colors">
            🔗 Sync Colors
          </button>
        </div>
      </div>

      {/* ──── Live Overlay Preview — OBS-style drag & resize ──── */}
      {showPreview && (
        <div className="wm-live-preview" ref={previewRef} data-tour="live-preview">
          <div className="wm-live-header">
            <span className="wm-live-title">
              <span className="wm-live-dot" />
              Live Preview
            </span>
            <span className="wm-live-dims">
              {CANVAS_W} × {CANVAS_H} &middot; {Math.round(previewScale * 100)}%
              {selectedPreviewId && (() => {
                const sw = widgets.find(w => w.id === selectedPreviewId);
                const sd = sw ? getWidgetDef(sw.widget_type) : null;
                return sw ? <span className="wm-live-selected-name"> &middot; {sd?.icon} {sw.label || sd?.label}</span> : null;
              })()}
            </span>
          </div>
          <div className="wm-live-body">
            <div
              className="wm-live-canvas-wrap"
              style={{
                width: CANVAS_W * previewScale,
                height: CANVAS_H * previewScale,
              }}
            >
              <div
                className="wm-live-canvas"
                style={{
                  width: CANVAS_W,
                  height: CANVAS_H,
                  transform: `scale(${previewScale})`,
                  transformOrigin: 'top left',
                }}
                onMouseDown={handleCanvasClick}
                data-tour="preview-drag"
              >
                {visibleWidgets.length === 0 && (
                  <div className="wm-live-empty">No visible widgets — toggle a widget on to see it here</div>
                )}
                {visibleWidgets.map(w => (
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
                  />
                ))}
              </div>
            </div>

            {/* ── Quick Guide side panel ── */}
            <div className="wm-quick-guide">
            <h4 className="wm-qg-title">📋 Quick Guide</h4>
            <ol className="wm-qg-list">
              <li><strong>Add widgets</strong> — click <b>+ Add</b> on any grey tile below.</li>
              <li><strong>Move &amp; resize</strong> — drag on preview, corner handles to resize, arrow keys for 1px nudge (<b>Shift</b> = 10px).</li>
              <li><strong>Customize</strong> — hit ⚙️ on any active tile to change colors, fonts &amp; sizes.</li>
              <li><strong>Sync colors</strong> — set Navbar first, then 🔗 Sync Colors to apply everywhere.</li>
              <li><strong>Toggle</strong> — click LIVE / OFF badge to show or hide a widget.</li>
              <li><strong>Background &amp; effects</strong> — add the Background widget and open its settings for gradients, images, particles &amp; blur.</li>
              <li><strong>Connect profiles</strong> — open Navbar settings to link your Spotify, Twitch, or Kick accounts.</li>
              <li><strong>Bonus Hunt &amp; Tournament</strong> — use the sidebar pages to fill in session data; widgets update in real-time.</li>
              <li><strong>Full overlay in OBS</strong> — copy the OBS URL from the sidebar and add it as a Browser Source.</li>
              <li><strong>Single widget in OBS</strong> — open ⚙️ settings, expand "OBS Browser Source URL", and copy the link.</li>
            </ol>
            </div>
          </div>
        </div>
      )}

      {/* ──── Active Widgets Section ──── */}
      {widgets.length > 0 && (
        <div className="wm-section" data-tour="active-widgets">
          <h3 className="wm-section-title wm-section-title--active">
            <span className="wm-section-dot wm-section-dot--active" />
            Active Widgets
            <span className="wm-section-count">{widgets.length}</span>
          </h3>
          <div className="wm-tile-grid">
            {widgets.map(w => {
              const def = getWidgetDef(w.widget_type);
              const isVisible = w.is_visible;
              return (
                <div
                  key={w.id}
                  className={`wm-tile wm-tile--active ${isVisible ? 'wm-tile--on' : 'wm-tile--paused'}`}
                >
                  <span className="wm-tile-icon">{def?.icon || '📦'}</span>
                  <div className="wm-tile-text">
                    <span className="wm-tile-name">{w.label || def?.label || w.widget_type}</span>
                    {def?.description && <span className="wm-tile-desc">{def.description}</span>}
                  </div>
                  <span
                    className={`wm-tile-status ${isVisible ? 'wm-tile-status--live' : ''}`}
                    onClick={() => handleToggle(w)}
                    title={isVisible ? 'Click to hide' : 'Click to show'}
                  >
                    {isVisible ? 'LIVE' : 'OFF'}
                  </span>
                  <div className="wm-tile-actions">
                    <button className="wm-tile-btn" data-tour="tile-gear" onClick={() => setEditingId(editingId === w.id ? null : w.id)} title="Settings">⚙️</button>
                    <button className="wm-tile-btn wm-tile-btn--danger" onClick={() => onRemove(w.id)} title="Delete">🗑️</button>
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
            <span className="wm-section-dot wm-section-dot--inactive" />
            Available Widgets
            <span className="wm-section-count">{inactiveDefs.length}</span>
          </h3>
          <div className="wm-tile-grid">
            {inactiveDefs.map(def => (
              <div
                key={def.type}
                className="wm-tile wm-tile--inactive"
                onClick={() => handleAdd(def.type)}
                title="Click to add this widget"
              >
                <span className="wm-tile-icon">{def.icon}</span>
                <div className="wm-tile-text">
                  <span className="wm-tile-name">{def.label}</span>
                  {def.description && <span className="wm-tile-desc">{def.description}</span>}
                </div>
                <span className="wm-tile-add">+ Add</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ──── Side Panel Editor ──── */}
      {editingId && (() => {
        const w = widgets.find(x => x.id === editingId);
        if (!w) return null;
        const def = getWidgetDef(w.widget_type);
        const ConfigPanel = def?.configPanel;
        return (
          <>
            <div className="wm-sidepanel-backdrop" onClick={() => setEditingId(null)} />
            <div className="wm-sidepanel">
              <div className="wm-sidepanel-header">
                <div className="wm-sidepanel-title">
                  <span className="wm-sidepanel-icon">{def?.icon || '📦'}</span>
                  <span>{w.label || def?.label || w.widget_type}</span>
                </div>
                <button className="wm-sidepanel-close" onClick={() => setEditingId(null)}>✕</button>
              </div>

              <div className="wm-sidepanel-body">
                {/* OBS URL */}
                {overlayToken && (
                  <details className="wm-obs-details">
                    <summary className="wm-obs-summary">
                      🔗 OBS Browser Source URL <span className="wm-obs-hint">(for this widget only)</span>
                    </summary>
                    <div className="wm-obs-row">
                      <input
                        readOnly
                        className="wm-obs-input"
                        value={`${window.location.origin}/overlay/${overlayToken}?widget=${w.id}`}
                        onClick={() => copyWidgetUrl(w.id)}
                        title="Click to copy"
                      />
                      <button className="wm-obs-copy" onClick={() => copyWidgetUrl(w.id)}>
                        {copiedId === w.id ? '✓ Copied!' : '📋 Copy'}
                      </button>
                    </div>
                  </details>
                )}

                {/* Position & Sizing */}
                <div className="wm-layout-panel">
                  <div className="wm-layout-heading">
                    <span className="wm-layout-icon">📐</span>
                    <span>Position &amp; Size</span>
                  </div>
                  <p className="wm-layout-hint">Drag the sliders or type a number. The live preview updates in real-time.</p>

                  <div className="wm-slider-grid">
                    {[
                      { label: 'Left (X)', field: 'position_x', min: 0, max: 1920, val: Math.round(w.position_x) },
                      { label: 'Top (Y)', field: 'position_y', min: 0, max: 1080, val: Math.round(w.position_y) },
                      { label: 'Width',    field: 'width',      min: 0, max: 1920, val: Math.round(w.width) },
                      { label: 'Height',   field: 'height',     min: 0, max: 1080, val: Math.round(w.height) },
                      { label: 'Layer (Z)', field: 'z_index',   min: 0, max: 100,  val: w.z_index },
                    ].map(s => (
                      <label key={s.field} className="wm-slider-field">
                        <span className="wm-slider-label">{s.label}</span>
                        <div className="wm-slider-row">
                          <input
                            type="range"
                            className="wm-range"
                            min={s.min}
                            max={s.max}
                            value={s.val}
                            onChange={e => handlePositionChange(w, s.field, +e.target.value)}
                          />
                          <input
                            type="number"
                            className="wm-slider-num"
                            min={s.min}
                            max={s.max}
                            value={s.val}
                            onChange={e => handlePositionChange(w, s.field, +e.target.value)}
                          />
                        </div>
                      </label>
                    ))}
                  </div>

                  <label className="wm-animation-field">
                    <span className="wm-slider-label">✨ Animation</span>
                    <select value={w.animation || 'fade'} onChange={e => handlePositionChange(w, 'animation', e.target.value)}>
                      <option value="fade">Fade In</option>
                      <option value="slide">Slide In</option>
                      <option value="scale">Scale Up</option>
                      <option value="glow">Glow</option>
                      <option value="none">None</option>
                    </select>
                  </label>
                </div>

                {/* ── Generic Style Switcher (reads from widget registry) ── */}
                {def?.styles?.length > 1 && (() => {
                  const configKey = def.styleConfigKey || 'displayStyle';
                  const currentVal = w.config?.[configKey] || def.styles[0].id;
                  return (
                    <div className="wm-style-switcher">
                      <div className="wm-style-switcher-label">🎨 Display Style</div>
                      <div className="wm-style-switcher-grid">
                        {def.styles.map(s => (
                          <button key={s.id}
                            className={`wm-style-switcher-btn ${currentVal === s.id ? 'wm-style-switcher-btn--active' : ''}`}
                            onClick={() => {
                              const latest = widgets.find(x => x.id === w.id) || w;
                              handleConfigChange(latest, { ...latest.config, [configKey]: s.id });
                            }}>
                            <span className="wm-style-switcher-icon">{s.icon}</span>
                            <span>{s.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Widget Config Panel */}
                {ConfigPanel && (
                  <div className="wm-config-panel">
                    <ConfigPanel config={w.config} onChange={cfg => handleConfigChange(w, cfg)} allWidgets={widgets}
                      mode="widget" />
                  </div>
                )}
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}
