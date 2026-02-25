/**
 * WidgetManager.jsx — Widget list + add/remove/configure widgets
 */
import React, { useState, useCallback } from 'react';
import { getWidgetDef, getWidgetsByCategory } from './widgets/widgetRegistry';

export default function WidgetManager({ widgets, theme, onAdd, onSave, onRemove, availableWidgets }) {
  const [editingId, setEditingId] = useState(null);
  const [showAddMenu, setShowAddMenu] = useState(false);

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

  return (
    <div className="oc-widgets-panel">
      <div className="oc-panel-header">
        <h2 className="oc-panel-title">🧩 Widgets</h2>
        <button className="oc-btn oc-btn--primary" onClick={() => setShowAddMenu(v => !v)}>
          {showAddMenu ? '✕ Close' : '+ Add Widget'}
        </button>
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
          <p>No widgets yet. Click <strong>+ Add Widget</strong> to get started.</p>
        </div>
      ) : (
        <div className="oc-widget-list">
          {widgets.map(w => {
            const def = getWidgetDef(w.widget_type);
            const ConfigPanel = def?.configPanel;
            const isEditing = editingId === w.id;

            return (
              <div key={w.id} className={`oc-wcard ${w.is_visible ? '' : 'oc-wcard--hidden'}`}>
                <div className="oc-wcard-header">
                  <div className="oc-wcard-info">
                    <span className="oc-wcard-icon">{def?.icon || '📦'}</span>
                    <span className="oc-wcard-label">{w.label || def?.label || w.widget_type}</span>
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

                    {/* Widget-specific config */}
                    {ConfigPanel && (
                      <ConfigPanel config={w.config} onChange={cfg => handleConfigChange(w, cfg)} allWidgets={widgets} />
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
