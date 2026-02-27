/**
 * WidgetManager.jsx — Widget list + add/remove/configure widgets
 */
import React, { useState, useCallback, useMemo } from 'react';
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
          <button className="wm-btn wm-btn--ghost" onClick={syncAllFromNavbar} title="Copy the Navbar's colors and fonts to all other widgets automatically" data-tour="sync-colors">
            🔗 Sync Colors
          </button>
        </div>
      </div>

      {/* ──── OBS Quick Styles — direct access to Chat & Tournament configs ──── */}
      {(() => {
        const chatWidget = widgets.find(w => w.widget_type === 'chat');
        const tournamentWidget = widgets.find(w => w.widget_type === 'tournament');
        if (!chatWidget && !tournamentWidget) return null;
        return (
          <div className="wm-obs-styles" data-tour="obs-styles">
            <div className="wm-obs-styles-header">
              <span className="wm-obs-styles-title">🎬 OBS Display Styles</span>
              <span className="wm-obs-styles-hint">Quick access to style settings for OBS widgets</span>
            </div>
            <div className="wm-obs-styles-grid">
              {chatWidget && (
                <button className="wm-obs-style-btn" onClick={() => setEditingId(chatWidget.id)}>
                  <span className="wm-obs-style-icon">💬</span>
                  <div className="wm-obs-style-text">
                    <span className="wm-obs-style-name">Chat Style</span>
                    <span className="wm-obs-style-desc">Colors, font, clean/classic mode</span>
                  </div>
                  <span className="wm-obs-style-arrow">⚙️</span>
                </button>
              )}
              {tournamentWidget && (
                <button className="wm-obs-style-btn" onClick={() => setEditingId(tournamentWidget.id)}>
                  <span className="wm-obs-style-icon">🏆</span>
                  <div className="wm-obs-style-text">
                    <span className="wm-obs-style-name">Tournament Style</span>
                    <span className="wm-obs-style-desc">Layout, bracket, colors, presets</span>
                  </div>
                  <span className="wm-obs-style-arrow">⚙️</span>
                </button>
              )}
            </div>
          </div>
        );
      })()}

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

                  {/* Mini preview — all widgets, current highlighted */}
                  <div className="wm-pos-preview" style={{ width: '100%', marginTop: 16 }}>
                    <div className="wm-pos-preview-canvas">
                      <div className="wm-pos-preview-scene">
                        {widgets.filter(wd => wd.is_enabled).map(wd => {
                          const wDef = getWidgetDef(wd.widget_type);
                          const WComp = wDef?.component;
                          const isCurrent = wd.id === w.id;
                          return (
                            <div
                              key={wd.id}
                              style={{
                                position: 'absolute',
                                left: wd.position_x,
                                top: wd.position_y,
                                width: wd.width,
                                height: wd.height,
                                overflow: 'hidden',
                                zIndex: wd.z_index || 1,
                                opacity: isCurrent ? 1 : 0.35,
                                outline: isCurrent ? '3px solid rgba(139,92,246,0.7)' : 'none',
                                borderRadius: isCurrent ? 4 : 0,
                              }}
                            >
                              {WComp && <WComp config={wd.config} theme={theme} allWidgets={widgets} />}
                            </div>
                          );
                        })}
                      </div>
                      <span className="wm-pos-preview-dims">{Math.round(w.position_x)},{Math.round(w.position_y)} — {Math.round(w.width)}×{Math.round(w.height)}</span>
                    </div>
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
            </div>
          </>
        );
      })()}
    </div>
  );
}
