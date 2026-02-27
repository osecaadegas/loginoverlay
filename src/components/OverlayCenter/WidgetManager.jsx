/**
 * WidgetManager.jsx — Widget list + add/remove/configure widgets
 */
import React, { useState, useCallback } from 'react';
import { getWidgetDef, getWidgetsByCategory } from './widgets/widgetRegistry';

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
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const copyWidgetUrl = useCallback((widgetId) => {
    if (!overlayToken) return;
    const url = `${window.location.origin}/overlay/${overlayToken}?widget=${widgetId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(widgetId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, [overlayToken]);

  const categories = getWidgetsByCategory();

  const handleToggle = useCallback((widget) => {
    onSave({ ...widget, is_visible: !widget.is_visible });
  }, [onSave]);

  const handleConfigChange = useCallback((widget, newConfig) => {
    onSave({ ...widget, config: newConfig });
  }, [onSave]);

  const handlePositionChange = useCallback((widget, field, value) => {
    onSave({ ...widget, [field]: value });
  }, [onSave]);

  const handleAdd = useCallback(async (type) => {
    const def = getWidgetDef(type);
    await onAdd(type, def?.defaults || {});
    setShowAddMenu(false);
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
          <button className="wm-btn wm-btn--ghost" onClick={syncAllFromNavbar} title="Copy the Navbar's colors and fonts to all other widgets automatically">
            🔗 Sync Colors
          </button>
          <button className="wm-btn wm-btn--primary" onClick={() => setShowAddMenu(v => !v)}>
            {showAddMenu ? '✕ Close' : '+ Add Widget'}
          </button>
        </div>
      </div>

      {/* ──── Quick Start Tip ──── */}
      {widgets.length === 0 && !showAddMenu && (
        <div className="wm-quickstart">
          <div className="wm-quickstart-icon">🚀</div>
          <div>
            <strong>Getting started?</strong>
            <p>Click <strong>+ Add Widget</strong> to place your first overlay element. Most streamers start with a <strong>Background</strong>, <strong>Navbar</strong>, and <strong>Bonus Hunt</strong>.</p>
          </div>
        </div>
      )}

      {/* ──── Add Widget Picker ──── */}
      {showAddMenu && (
        <div className="wm-picker">
          <p className="wm-picker-hint">Choose a widget to add to your overlay. You can add multiples of the same type.</p>
          {Object.entries(categories).map(([cat, defs]) => (
            <div key={cat} className="wm-picker-group">
              <h4 className="wm-picker-group-title">{cat}</h4>
              <div className="wm-picker-grid">
                {defs.map(def => (
                  <button key={def.type} className="wm-picker-card" onClick={() => handleAdd(def.type)}>
                    <span className="wm-picker-card-icon">{def.icon}</span>
                    <div className="wm-picker-card-text">
                      <span className="wm-picker-card-name">{def.label}</span>
                      {def.description && <span className="wm-picker-card-desc">{def.description}</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ──── Widget List ──── */}
      {widgets.length > 0 && (
        <div className="wm-list">
          {widgets.map(w => {
            const def = getWidgetDef(w.widget_type);
            const ConfigPanel = def?.configPanel;
            const isEditing = editingId === w.id;
            const isVisible = w.is_visible;

            return (
              <div key={w.id} className={`wm-card ${isVisible ? '' : 'wm-card--off'} ${isEditing ? 'wm-card--open' : ''}`}>
                {/* Card Header — click to expand */}
                <div className="wm-card-header" onClick={(e) => {
                  if (e.target.closest('.wm-card-controls')) return;
                  setEditingId(isEditing ? null : w.id);
                }}>
                  <div className="wm-card-identity">
                    <span className="wm-card-icon">{def?.icon || '📦'}</span>
                    <div className="wm-card-title-group">
                      <span className="wm-card-name">{w.label || def?.label || w.widget_type}</span>
                      <span className={`wm-card-badge ${isVisible ? 'wm-card-badge--live' : 'wm-card-badge--off'}`}>
                        {isVisible ? 'LIVE' : 'OFF'}
                      </span>
                    </div>
                    <span className={`wm-card-arrow ${isEditing ? 'wm-card-arrow--open' : ''}`}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M3 1l4 4-4 4" /></svg>
                    </span>
                  </div>

                  <div className="wm-card-controls">
                    {/* Show / Hide toggle */}
                    <button
                      className={`wm-toggle ${isVisible ? 'wm-toggle--on' : ''}`}
                      onClick={() => handleToggle(w)}
                      title={isVisible ? 'Click to hide this widget' : 'Click to show this widget'}
                    >
                      <span className="wm-toggle-thumb" />
                    </button>
                    <button className="wm-icon-btn" onClick={() => setEditingId(isEditing ? null : w.id)} title="Open settings">
                      {isEditing ? '✕' : '⚙️'}
                    </button>
                    <button className="wm-icon-btn wm-icon-btn--danger" onClick={() => onRemove(w.id)} title="Delete this widget">
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Card Body — expanded settings */}
                {isEditing && (
                  <div className="wm-card-body">

                    {/* OBS URL — collapsible */}
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

                    {/* Position & Sizing — clear labels */}
                    <div className="wm-layout-panel">
                      <div className="wm-layout-heading">
                        <span className="wm-layout-icon">📐</span>
                        <span>Position &amp; Size</span>
                      </div>
                      <p className="wm-layout-hint">Set where the widget appears on the overlay canvas (1920×1080).</p>
                      <div className="wm-layout-grid">
                        <label className="wm-layout-field">
                          <span className="wm-layout-label">Left (X)</span>
                          <input type="number" value={Math.round(w.position_x)} onChange={e => handlePositionChange(w, 'position_x', +e.target.value)} />
                        </label>
                        <label className="wm-layout-field">
                          <span className="wm-layout-label">Top (Y)</span>
                          <input type="number" value={Math.round(w.position_y)} onChange={e => handlePositionChange(w, 'position_y', +e.target.value)} />
                        </label>
                        <label className="wm-layout-field">
                          <span className="wm-layout-label">Width</span>
                          <input type="number" value={Math.round(w.width)} onChange={e => handlePositionChange(w, 'width', +e.target.value)} />
                        </label>
                        <label className="wm-layout-field">
                          <span className="wm-layout-label">Height</span>
                          <input type="number" value={Math.round(w.height)} onChange={e => handlePositionChange(w, 'height', +e.target.value)} />
                        </label>
                        <label className="wm-layout-field">
                          <span className="wm-layout-label">Layer</span>
                          <input type="number" value={w.z_index} onChange={e => handlePositionChange(w, 'z_index', +e.target.value)} title="Higher number = on top of other widgets" />
                        </label>
                        <label className="wm-layout-field">
                          <span className="wm-layout-label">Animation</span>
                          <select value={w.animation || 'fade'} onChange={e => handlePositionChange(w, 'animation', e.target.value)}>
                            <option value="fade">Fade In</option>
                            <option value="slide">Slide In</option>
                            <option value="scale">Scale Up</option>
                            <option value="glow">Glow</option>
                            <option value="none">None</option>
                          </select>
                        </label>
                      </div>
                    </div>

                    {/* Widget Config Panel */}
                    {ConfigPanel && (
                      <div className="wm-config-panel">
                        <ConfigPanel config={w.config} onChange={cfg => handleConfigChange(w, cfg)} allWidgets={widgets}
                          mode={(w.widget_type === 'bonus_hunt' || w.widget_type === 'tournament') ? 'widget' : 'full'} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
