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
      <div className="oc-panel-header">
        <div>
          <h2 className="oc-panel-title">🧩 Widgets</h2>
          <p className="oc-panel-subtitle">Add, remove, and customize your stream overlay elements. Click a widget to expand its settings.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {syncMsg && <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>{syncMsg}</span>}
          <button
            className="oc-btn oc-btn--sm"
            onClick={syncAllFromNavbar}
            title="Sync all widget colors/fonts from the Navbar widget"
            style={{ padding: '6px 12px', fontSize: 12 }}
          >
            🔗 Sync All from Navbar
          </button>
          <button className="oc-btn oc-btn--primary" onClick={() => setShowAddMenu(v => !v)}>
            {showAddMenu ? '✕ Close' : '+ Add Widget'}
          </button>
        </div>
      </div>

      {/* Add Widget Menu */}
      {showAddMenu && (
        <div className="oc-add-menu">
          {Object.entries(categories).map(([cat, defs]) => (
            <div key={cat} className="oc-add-category">
              <h4 className="oc-add-category-title">{cat}</h4>
              <div className="oc-add-grid">
                {defs.map(def => (
                  <button key={def.type} className="oc-add-card" onClick={() => handleAdd(def.type)}>
                    <span className="oc-add-card-icon">{def.icon}</span>
                    <span className="oc-add-card-label">{def.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Widget List */}
      {widgets.length === 0 ? (
        <div className="oc-empty">
          <div className="oc-empty-icon">🧩</div>
          <p><strong>No widgets yet</strong></p>
          <p>Click <strong>+ Add Widget</strong> above to add your first overlay element like a Bonus Hunt tracker, Navbar, Chat, or Stats panel.</p>
        </div>
      ) : (
        <div className="oc-widget-list">
          {widgets.map(w => {
            const def = getWidgetDef(w.widget_type);
            const ConfigPanel = def?.configPanel;
            const isEditing = editingId === w.id;

            return (
              <div key={w.id} className={`oc-wcard ${w.is_visible ? '' : 'oc-wcard--hidden'}`}>
                <div className="oc-wcard-header" onClick={(e) => {
                  // Don't expand if clicking on action buttons
                  if (e.target.closest('.oc-wcard-actions')) return;
                  setEditingId(isEditing ? null : w.id);
                }} style={{ cursor: 'pointer' }}>
                  <div className="oc-wcard-info">
                    <span className="oc-wcard-icon">{def?.icon || '📦'}</span>
                    <span className="oc-wcard-label">{w.label || def?.label || w.widget_type}</span>
                    <span className={`oc-wcard-status ${w.is_visible ? 'oc-wcard-status--live' : 'oc-wcard-status--hidden'}`}>
                      {w.is_visible ? '● LIVE' : '○ Hidden'}
                    </span>
                    <span className={`oc-wcard-chevron ${isEditing ? 'oc-wcard-chevron--open' : ''}`}>▸</span>
                  </div>
                  <div className="oc-wcard-actions">
                    <button
                      className={`oc-toggle ${w.is_visible ? 'oc-toggle--on' : ''}`}
                      onClick={() => handleToggle(w)}
                      title={w.is_visible ? 'Hide' : 'Show'}
                    >
                      <span className="oc-toggle-thumb" />
                    </button>
                    <button className="oc-btn oc-btn--sm" onClick={() => setEditingId(isEditing ? null : w.id)}>
                      {isEditing ? '✕' : '⚙️'}
                    </button>
                    <button className="oc-btn oc-btn--sm oc-btn--danger" onClick={() => onRemove(w.id)}>🗑️</button>
                  </div>
                </div>

                {isEditing && (
                  <div className="oc-wcard-body">
                    {/* Single-widget OBS URL */}
                    {overlayToken && (
                      <div className="oc-widget-url">
                        <label className="oc-widget-url-label">🔗 OBS Browser Source URL (this widget only)</label>
                        <div className="oc-widget-url-row">
                          <input
                            readOnly
                            className="oc-widget-url-input"
                            value={`${window.location.origin}/overlay/${overlayToken}?widget=${w.id}`}
                            onClick={() => copyWidgetUrl(w.id)}
                            title="Click to copy"
                          />
                          <button className="oc-widget-url-copy" onClick={() => copyWidgetUrl(w.id)}>
                            {copiedId === w.id ? '✓ Copied' : '📋 Copy'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Position / Size / Z-Index */}
                    <div className="oc-wcard-layout">
                      <label>
                        X <input type="number" value={Math.round(w.position_x)} onChange={e => handlePositionChange(w, 'position_x', +e.target.value)} />
                      </label>
                      <label>
                        Y <input type="number" value={Math.round(w.position_y)} onChange={e => handlePositionChange(w, 'position_y', +e.target.value)} />
                      </label>
                      <label>
                        W <input type="number" value={Math.round(w.width)} onChange={e => handlePositionChange(w, 'width', +e.target.value)} />
                      </label>
                      <label>
                        H <input type="number" value={Math.round(w.height)} onChange={e => handlePositionChange(w, 'height', +e.target.value)} />
                      </label>
                      <label>
                        Z <input type="number" value={w.z_index} onChange={e => handlePositionChange(w, 'z_index', +e.target.value)} />
                      </label>
                      <label>
                        Anim
                        <select value={w.animation || 'fade'} onChange={e => handlePositionChange(w, 'animation', e.target.value)}>
                          <option value="fade">Fade</option>
                          <option value="slide">Slide</option>
                          <option value="scale">Scale</option>
                          <option value="glow">Glow</option>
                          <option value="none">None</option>
                        </select>
                      </label>
                    </div>

                    {/* Per-widget Custom CSS */}
                    <div className="oc-widget-css">
                      <label className="oc-widget-css-label">🎨 Custom CSS</label>
                      <textarea
                        className="oc-widget-css-input"
                        value={w.config?.custom_css || ''}
                        onChange={e => handleConfigChange(w, { ...w.config, custom_css: e.target.value })}
                        rows={3}
                        placeholder={`/* style this widget in OBS */`}
                        spellCheck={false}
                      />
                    </div>

                    {/* Widget-specific config */}
                    {ConfigPanel && (
                      <ConfigPanel config={w.config} onChange={cfg => handleConfigChange(w, cfg)} allWidgets={widgets}
                        mode={(w.widget_type === 'bonus_hunt' || w.widget_type === 'tournament') ? 'widget' : 'full'} />
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
