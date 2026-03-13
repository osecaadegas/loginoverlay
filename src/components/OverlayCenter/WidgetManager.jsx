/**
 * WidgetManager.jsx — Widget list + add/remove/configure widgets
 */
import React, { useState, useCallback, useMemo, useRef, useEffect, memo } from 'react';
import { getWidgetDef, getWidgetsByCategory } from './widgets/widgetRegistry';
import { useAuth } from '../../context/AuthContext';
import './OverlayRenderer.css';

/* ── Draggable preview slot — OBS-style click & drag + resize ── */
const DraggableSlot = memo(function DraggableSlot({
  widget, theme, allWidgets, isSelected, scale, onSelect, onMove, onResize, onStyleCycle, userId, canvasW, canvasH,
}) {
  const def = getWidgetDef(widget.widget_type);
  const Component = def?.component;
  const slotRef = useRef(null);
  const coordsRef = useRef(null);
  const isBg = widget.widget_type === 'background';

  /* Block native text selection during any drag */
  const blockSelect = useCallback((e) => e.preventDefault(), []);

  function startDrag(mode) {
    document.body.classList.add(mode === 'resize' ? 'wm-resizing' : 'wm-dragging');
    document.addEventListener('selectstart', blockSelect);
    window.getSelection()?.removeAllRanges();
  }
  function endDrag() {
    document.body.classList.remove('wm-dragging', 'wm-resizing');
    document.removeEventListener('selectstart', blockSelect);
  }

  /* ── Drag to move — update DOM directly, save on mouseup ── */
  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('.wm-resize-handle') || e.target.closest('.wm-resize-edge')) return;
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

    startDrag('move');

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

    startDrag('resize');

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
      } else if (corner === 'n') {
        curH = Math.max(20, origH - dy);
        curY = origPy + (origH - curH);
      } else if (corner === 's') {
        curH = Math.max(20, origH + dy);
      } else if (corner === 'e') {
        curW = Math.max(20, origW + dx);
      } else if (corner === 'w') {
        curW = Math.max(20, origW - dx);
        curX = origPx + (origW - curW);
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

    const cursorMap = { se: 'nwse-resize', nw: 'nwse-resize', sw: 'nesw-resize', ne: 'nesw-resize', n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize' };
    document.body.style.cursor = cursorMap[corner] || 'nwse-resize';
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
        left: isBg ? 0 : widget.position_x,
        top: isBg ? 0 : widget.position_y,
        width: isBg ? canvasW : widget.width,
        height: isBg ? canvasH : widget.height,
        zIndex: isSelected ? 9999 : (widget.z_index || 1),
      }}
    >
      {/* Widget content */}
      <div style={{ pointerEvents: 'none', width: '100%', height: '100%', overflow: 'hidden', position: 'relative', zIndex: 1, borderRadius: widget.config?.cardRadius ? `${widget.config.cardRadius}px` : undefined }}>
        <Component config={widget.config} theme={theme} allWidgets={allWidgets} widgetId={widget.id} userId={userId} />
      </div>

      {/* Transparent drag surface on top — catches ALL mouse events (skip for background) */}
      {!isBg && (
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
      )}

      {/* Selection overlay + resize handles (highest z) — skip for background */}
      {isSelected && !isBg && (
        <div className="wm-slot-selection" style={{ zIndex: 3 }}>
          <div className="wm-resize-handle wm-resize-nw" onMouseDown={e => handleResizeDown(e, 'nw')} />
          <div className="wm-resize-handle wm-resize-ne" onMouseDown={e => handleResizeDown(e, 'ne')} />
          <div className="wm-resize-handle wm-resize-sw" onMouseDown={e => handleResizeDown(e, 'sw')} />
          <div className="wm-resize-handle wm-resize-se" onMouseDown={e => handleResizeDown(e, 'se')} />
          {/* Edge handles — resize one axis only */}
          <div className="wm-resize-edge wm-resize-n" onMouseDown={e => handleResizeDown(e, 'n')} />
          <div className="wm-resize-edge wm-resize-s" onMouseDown={e => handleResizeDown(e, 's')} />
          <div className="wm-resize-edge wm-resize-e" onMouseDown={e => handleResizeDown(e, 'e')} />
          <div className="wm-resize-edge wm-resize-w" onMouseDown={e => handleResizeDown(e, 'w')} />
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
export function buildSyncedConfig(widgetType, currentConfig, nb) {
  if (!nb) return null;
  const c = currentConfig || {};
  switch (widgetType) {
    case 'image_slideshow':
      return {
        ...c,
        borderColor: nb.accentColor || 'rgba(51,65,85,0.5)',
        gradientColor: nb.bgColor || 'rgba(15,23,42,0.8)',
        captionColor: nb.textColor || '#e2e8f0',
        ...(nb.brightness != null && { brightness: nb.brightness }),
        ...(nb.contrast != null && { contrast: nb.contrast }),
        ...(nb.saturation != null && { saturation: nb.saturation }),
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
        ...(nb.brightness != null && { brightness: nb.brightness }),
        ...(nb.contrast != null && { contrast: nb.contrast }),
        ...(nb.saturation != null && { saturation: nb.saturation }),
      };
    case 'background':
      return {
        ...c,
        color1: nb.bgColor || '#0f172a',
        color2: nb.accentColor || '#1e3a5f',
        ...(nb.brightness != null && { brightness: nb.brightness }),
        ...(nb.contrast != null && { contrast: nb.contrast }),
        ...(nb.saturation != null && { saturation: nb.saturation }),
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
        ...(nb.brightness != null && { brightness: nb.brightness }),
        ...(nb.contrast != null && { contrast: nb.contrast }),
        ...(nb.saturation != null && { saturation: nb.saturation }),
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
        cardBg: nb.bgColor ? `${nb.bgColor}cc` : '#1a1d2e',
        cardBorder: nb.accentColor ? `${nb.accentColor}30` : 'rgba(255,255,255,0.08)',
        nameColor: nb.textColor || '#ffffff',
        multiColor: nb.accentColor || '#facc15',
        swordColor: nb.accentColor || '#eab308',
        slotNameColor: nb.textColor || '#ffffff',
        tabBg: 'rgba(255,255,255,0.06)',
        tabActiveBg: nb.accentColor ? `${nb.accentColor}25` : 'rgba(255,255,255,0.15)',
        tabColor: nb.mutedColor || '#94a3b8',
        tabActiveColor: nb.accentColor || '#ffffff',
        tabBorder: nb.accentColor ? `${nb.accentColor}20` : 'rgba(255,255,255,0.12)',
        bkAccent: nb.accentColor || '#6366f1',
        bkHeaderColor: nb.mutedColor || '#94a3b8',
        xIconColor: nb.accentColor || '#eab308',
        fontFamily: nb.fontFamily || "'Inter', sans-serif",
        ...(nb.brightness != null && { brightness: nb.brightness }),
        ...(nb.contrast != null && { contrast: nb.contrast }),
        ...(nb.saturation != null && { saturation: nb.saturation }),
      };
    case 'random_slot_picker':
      return {
        ...c,
        bgColor: nb.bgColor || '#13151e',
        cardBg: nb.bgColor ? `${nb.bgColor}cc` : 'rgba(255,255,255,0.04)',
        borderColor: nb.accentColor ? `${nb.accentColor}30` : 'rgba(255,255,255,0.08)',
        accentColor: nb.accentColor || '#f59e0b',
        textColor: nb.textColor || '#ffffff',
        mutedColor: nb.mutedColor || '#94a3b8',
        fontFamily: nb.fontFamily || "'Inter', sans-serif",
        ...(nb.brightness != null && { brightness: nb.brightness }),
        ...(nb.contrast != null && { contrast: nb.contrast }),
        ...(nb.saturation != null && { saturation: nb.saturation }),
      };
    case 'giveaway':
      return {
        ...c,
        bgColor: nb.bgColor || '#13151e',
        accentColor: nb.accentColor || '#9346ff',
        textColor: nb.textColor || '#ffffff',
        fontFamily: nb.fontFamily || "'Inter', sans-serif",
        ...(nb.brightness != null && { brightness: nb.brightness }),
        ...(nb.contrast != null && { contrast: nb.contrast }),
        ...(nb.saturation != null && { saturation: nb.saturation }),
      };
    case 'bonus_buys':
      return {
        ...c,
        bgColor:     nb.bgColor     || '#0a0e1a',
        accentColor: nb.accentColor || '#3b82f6',
        textColor:   nb.textColor   || '#ffffff',
        mutedColor:  nb.mutedColor  || '#64748b',
        fontFamily:  nb.fontFamily  || "'Inter', sans-serif",
        ...(nb.brightness != null && { brightness: nb.brightness }),
        ...(nb.contrast != null && { contrast: nb.contrast }),
        ...(nb.saturation != null && { saturation: nb.saturation }),
      };
    case 'single_slot':
      return {
        ...c,
        bgColor:     nb.bgColor     || 'transparent',
        accentColor: nb.accentColor || '#7c3aed',
        textColor:   nb.textColor   || '#ffffff',
        mutedColor:  nb.mutedColor  || '#94a3b8',
        fontFamily:  nb.fontFamily  || "'Inter', sans-serif",
        ...(nb.brightness != null && { brightness: nb.brightness }),
        ...(nb.contrast != null && { contrast: nb.contrast }),
        ...(nb.saturation != null && { saturation: nb.saturation }),
      };
    case 'slot_requests':
      return {
        ...c,
        bgColor:     nb.bgColor     || 'transparent',
        accentColor: nb.accentColor || '#f59e0b',
        textColor:   nb.textColor   || '#ffffff',
        mutedColor:  nb.mutedColor  || '#94a3b8',
        cardBg:      nb.bgColor ? `${nb.bgColor}0a` : 'rgba(255,255,255,0.04)',
        borderColor: nb.borderColor || 'rgba(255,255,255,0.08)',
        fontFamily:  nb.fontFamily  || "'Inter', sans-serif",
        ...(nb.brightness != null && { brightness: nb.brightness }),
        ...(nb.contrast != null && { contrast: nb.contrast }),
        ...(nb.saturation != null && { saturation: nb.saturation }),
      };
    default:
      return null; // widget has no sync mapping
  }
}

/* ── Normalise any widget's config into navbar-like source keys ── */
function extractSyncSource(widgetType, config) {
  const c = config || {};
  switch (widgetType) {
    case 'navbar':
      return c; // already in the expected shape
    case 'bonus_hunt':
      return {
        bgColor: c.headerColor || c.bgColor,
        accentColor: c.headerAccent || c.accentColor,
        textColor: c.textColor,
        mutedColor: c.mutedTextColor || c.mutedColor,
        borderColor: c.cardOutlineColor || c.borderColor,
        ctaColor: c.superBadgeColor || c.ctaColor,
        fontFamily: c.fontFamily,
        fontSize: c.fontSize,
        brightness: c.brightness,
        contrast: c.contrast,
        saturation: c.saturation,
      };
    case 'background':
      return {
        bgColor: c.color1,
        accentColor: c.color2,
        brightness: c.brightness,
        contrast: c.contrast,
        saturation: c.saturation,
      };
    default:
      // Most widgets use standard keys (bgColor, accentColor, textColor…)
      return {
        bgColor: c.bgColor,
        accentColor: c.accentColor,
        textColor: c.textColor,
        mutedColor: c.mutedColor,
        borderColor: c.borderColor,
        ctaColor: c.ctaColor,
        fontFamily: c.fontFamily,
        fontSize: c.fontSize,
        borderWidth: c.borderWidth,
        brightness: c.brightness,
        contrast: c.contrast,
        saturation: c.saturation,
      };
  }
}

export default function WidgetManager({ widgets, theme, onAdd, onSave, onRemove, availableWidgets, overlayToken }) {
  const { user } = useAuth();
  const [editingId, setEditingId] = useState(null);
  const [showPreview, setShowPreview] = useState(true);
  const [selectedPreviewId, setSelectedPreviewId] = useState(null);
  const [syncMsg, setSyncMsg] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [syncSourceId, setSyncSourceId] = useState(null);
  const [syncDropOpen, setSyncDropOpen] = useState(false);
  const syncDropRef = useRef(null);
  const previewRef = useRef(null);
  const [previewScale, setPreviewScale] = useState(0.35);

  /* ── Drag-to-reorder z-index state ── */
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

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
    try {
      await onAdd(type, def?.defaults || {});
    } catch (err) {
      console.error('[WidgetManager] Failed to add widget:', type, err);
      alert(`Failed to add widget: ${err?.message || 'Unknown error'}`);
    }
  }, [onAdd]);

  /* ── Sorted active widgets by z_index (lowest first → highest last = on top in OBS) ── */
  const sortedWidgets = useMemo(() =>
    [...(widgets || [])].sort((a, b) => (a.z_index || 1) - (b.z_index || 1)),
    [widgets]
  );

  /* ── Drag-to-reorder handlers ── */
  const handleDragStart = useCallback((e, widgetId) => {
    setDragId(widgetId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', widgetId);
    // Make ghost slightly transparent
    if (e.currentTarget) {
      requestAnimationFrame(() => e.currentTarget.style.opacity = '0.4');
    }
  }, []);

  const handleDragEnd = useCallback((e) => {
    e.currentTarget.style.opacity = '1';
    setDragId(null);
    setDragOverId(null);
  }, []);

  const handleDragOver = useCallback((e, widgetId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (widgetId !== dragOverId) setDragOverId(widgetId);
  }, [dragOverId]);

  const handleDrop = useCallback((e, dropTargetId) => {
    e.preventDefault();
    const fromId = dragId;
    if (!fromId || fromId === dropTargetId) {
      setDragId(null);
      setDragOverId(null);
      return;
    }

    // Reorder the sorted list
    const ordered = [...sortedWidgets];
    const fromIdx = ordered.findIndex(w => w.id === fromId);
    const toIdx = ordered.findIndex(w => w.id === dropTargetId);
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
  }, [dragId, sortedWidgets, onSave]);

  /* ── Arrow-based layer reorder ── */
  const handleMoveLayer = useCallback((widgetId, direction) => {
    const ordered = [...sortedWidgets];
    const idx = ordered.findIndex(w => w.id === widgetId);
    if (idx === -1) return;
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= ordered.length) return;
    [ordered[idx], ordered[targetIdx]] = [ordered[targetIdx], ordered[idx]];
    ordered.forEach((w, i) => {
      const newZ = i + 1;
      if (w.z_index !== newZ) onSave({ ...w, z_index: newZ });
    });
  }, [sortedWidgets, onSave]);

  /* ── Close sync dropdown on outside click ── */
  useEffect(() => {
    if (!syncDropOpen) return;
    function handleClick(e) {
      if (syncDropRef.current && !syncDropRef.current.contains(e.target)) setSyncDropOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [syncDropOpen]);

  /* ── Resolved sync source widget ── */
  const syncSourceWidget = useMemo(() => {
    if (syncSourceId) return widgets.find(w => w.id === syncSourceId) || null;
    return widgets.find(w => w.widget_type === 'navbar') || null;
  }, [widgets, syncSourceId]);

  /* ── Sync ALL widgets from the chosen source ── */
  const syncAllFromSource = useCallback(async () => {
    if (!syncSourceWidget) {
      setSyncMsg('No source widget found');
      setTimeout(() => setSyncMsg(''), 2500);
      return;
    }
    const nb = extractSyncSource(syncSourceWidget.widget_type, syncSourceWidget.config);
    const srcDef = getWidgetDef(syncSourceWidget.widget_type);
    const srcLabel = srcDef?.label || syncSourceWidget.widget_type;
    let count = 0;
    for (const w of widgets) {
      if (w.id === syncSourceWidget.id) continue;
      const synced = buildSyncedConfig(w.widget_type, w.config, nb);
      if (synced) {
        await onSave({ ...w, config: synced });
        count++;
      }
    }
    setSyncMsg(`Synced ${count} widget${count !== 1 ? 's' : ''} from ${srcLabel}!`);
    setTimeout(() => setSyncMsg(''), 3000);
  }, [widgets, syncSourceWidget, onSave]);

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
          <div className="wm-sync-wrap" ref={syncDropRef} data-tour="sync-colors">
            <button className="wm-btn wm-btn--ghost" onClick={syncAllFromSource} title={`Sync colors from ${getWidgetDef(syncSourceWidget?.widget_type)?.label || 'Navbar'}`}>
              🔗 Sync Colors
            </button>
            <button
              className="wm-btn wm-btn--ghost wm-sync-chevron"
              onClick={() => setSyncDropOpen(v => !v)}
              title="Choose source widget"
            >
              ▾
            </button>
            {syncDropOpen && (
              <div className="wm-sync-dropdown">
                <div className="wm-sync-drop-title">Sync from…</div>
                {widgets.map(w => {
                  const def = getWidgetDef(w.widget_type);
                  const label = def?.label || w.widget_type;
                  const icon = def?.icon || '📦';
                  const isActive = syncSourceWidget?.id === w.id;
                  return (
                    <button
                      key={w.id}
                      className={`wm-sync-drop-item${isActive ? ' wm-sync-drop-item--active' : ''}`}
                      onClick={() => { setSyncSourceId(w.id); setSyncDropOpen(false); }}
                    >
                      <span className="wm-sync-drop-icon">{icon}</span>
                      <span className="wm-sync-drop-label">{label}</span>
                      {isActive && <span className="wm-sync-drop-check">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
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
                {/* Theme texture overlay */}
                {theme?.bg_texture && theme.bg_texture !== 'none' && (
                  <div className={`or-texture or-texture--${theme.bg_texture}`} />
                )}
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
                    canvasW={CANVAS_W}
                    canvasH={CANVAS_H}
                    userId={user?.id}
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
              <li><strong>Toggle</strong> — click the ON / OFF switch to show or hide a widget.</li>
              <li><strong>Background &amp; effects</strong> — add the Background widget and open its settings for gradients, images, particles &amp; blur.</li>
              <li><strong>Connect profiles</strong> — open the Profile section to link your Spotify, Twitch, or Kick accounts; tokens sync to widgets automatically.</li>
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
            <span className="wm-layer-hint">← back · front →</span>
          </h3>
          <div className="wm-tile-grid">
            {sortedWidgets.map((w, idx) => {
              const def = getWidgetDef(w.widget_type);
              const isVisible = w.is_visible;
              const isDragOver = dragOverId === w.id && dragId !== w.id;
              return (
                <div
                  key={w.id}
                  className={`wm-tile wm-tile--active ${isVisible ? 'wm-tile--on' : 'wm-tile--paused'}${isDragOver ? ' wm-tile--drag-over' : ''}${dragId === w.id ? ' wm-tile--dragging' : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, w.id)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, w.id)}
                  onDrop={(e) => handleDrop(e, w.id)}
                >
                  <span className="wm-tile-layer-badge" title={`Layer ${idx + 1}`}>{idx + 1}</span>
                  <label
                    className={`wm-toggle ${isVisible ? 'wm-toggle--on' : ''}`}
                    onClick={() => handleToggle(w)}
                    title={isVisible ? 'Click to turn off' : 'Click to turn on'}
                  >
                    <span className="wm-toggle-slider" />
                    <span className="wm-toggle-label">{isVisible ? 'ON' : 'OFF'}</span>
                  </label>
                  <div className="wm-tile-body">
                    <span className="wm-tile-icon">{def?.icon || '📦'}</span>
                    <div className="wm-tile-text">
                      <span className="wm-tile-name">{w.label || def?.label || w.widget_type}</span>
                      {def?.description && <span className="wm-tile-desc">{def.description}</span>}
                    </div>
                  </div>
                  <div className="wm-tile-actions">
                    <div className="wm-tile-arrows">
                      <button className="wm-tile-btn wm-tile-btn--arrow" onClick={() => handleMoveLayer(w.id, -1)} disabled={idx === 0} title="Move back (lower layer)">◀</button>
                      <button className="wm-tile-btn wm-tile-btn--arrow" onClick={() => handleMoveLayer(w.id, 1)} disabled={idx === sortedWidgets.length - 1} title="Move front (higher layer)">▶</button>
                    </div>
                    <div className="wm-tile-actions-right">
                      <button className="wm-tile-btn" data-tour="tile-gear" onClick={() => setEditingId(editingId === w.id ? null : w.id)} title="Settings">⚙️</button>
                      <button className="wm-tile-btn wm-tile-btn--danger" onClick={() => onRemove(w.id)} title="Delete">🗑️</button>
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

                {/* Widget Config Panel */}
                {ConfigPanel && (
                  <div className="wm-config-panel">
                    <ConfigPanel config={w.config} onChange={cfg => handleConfigChange(w, cfg)} allWidgets={widgets}
                      mode="widget" />
                  </div>
                )}

                {/* ── Shadow Controls (all widgets) ── */}
                <div className="wm-layout-panel">
                  <div className="wm-layout-heading">
                    <span className="wm-layout-icon">🌑</span>
                    <span>Shadow</span>
                  </div>
                  <p className="wm-layout-hint">Add a drop shadow that follows the widget's visual outline.</p>
                  <div className="wm-slider-grid">
                    {[
                      { label: 'Size',      field: 'shadowSize',      min: 0, max: 100, val: w.config?.shadowSize ?? 0 },
                      { label: 'Intensity', field: 'shadowIntensity', min: 0, max: 100, val: w.config?.shadowIntensity ?? 0 },
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
                            onChange={e => {
                              const latest = widgets.find(x => x.id === w.id) || w;
                              handleConfigChange(latest, { ...latest.config, [s.field]: +e.target.value });
                            }}
                          />
                          <input
                            type="number"
                            className="wm-slider-num"
                            min={s.min}
                            max={s.max}
                            value={s.val}
                            onChange={e => {
                              const latest = widgets.find(x => x.id === w.id) || w;
                              handleConfigChange(latest, { ...latest.config, [s.field]: +e.target.value });
                            }}
                          />
                        </div>
                      </label>
                    ))}
                  </div>

                  <label className="wm-animation-field">
                    <span className="wm-slider-label">🎬 Entrance Animation</span>
                    <select value={w.animation || 'fade'} onChange={e => handlePositionChange(w, 'animation', e.target.value)}>
                      <optgroup label="Fade">
                        <option value="fade">Fade In</option>
                      </optgroup>
                      <optgroup label="Slide">
                        <option value="slide-up">Slide In from Bottom</option>
                        <option value="slide-down">Slide In from Top</option>
                        <option value="slide-left">Slide In from Right</option>
                        <option value="slide-right">Slide In from Left</option>
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
                    <span className="wm-slider-label">🎬 Exit Animation</span>
                    <select value={w.exit_animation || 'fade'} onChange={e => handlePositionChange(w, 'exit_animation', e.target.value)}>
                      <optgroup label="Fade">
                        <option value="fade">Fade Out</option>
                      </optgroup>
                      <optgroup label="Slide">
                        <option value="slide-up">Slide Out to Top</option>
                        <option value="slide-down">Slide Out to Bottom</option>
                        <option value="slide-left">Slide Out to Left</option>
                        <option value="slide-right">Slide Out to Right</option>
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
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}
