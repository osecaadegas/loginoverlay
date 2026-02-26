/**
 * OverlayControlCenter.jsx — Main admin panel page.
 * Auth-protected. Manages widgets, theme, overlay URL.
 */
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useOverlay } from '../../hooks/useOverlay';
import { useAdmin } from '../../hooks/useAdmin';
import { getSharedPresets, saveSharedPreset, deleteSharedPreset } from '../../services/overlayService';
import ThemeEditor from './ThemeEditor';
import WidgetManager from './WidgetManager';
import OverlayPreview from './OverlayPreview';
import './OverlayCenter.css';

// Register all built-in widgets
import './widgets/builtinWidgets';
import { getAllWidgetDefs } from './widgets/widgetRegistry';

export default function OverlayControlCenter() {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const {
    instance, theme, widgets, overlayState, loading,
    saveTheme, addWidget, saveWidget, removeWidget,
    updateState, regenToken,
  } = useOverlay();

  const [activePanel, setActivePanel] = useState('widgets'); // widgets | preview
  const [copyMsg, setCopyMsg] = useState('');

  /* ── Global Presets (stored in overlay_state) ── */
  const globalPresets = overlayState?.globalPresets || [];
  const [presetName, setPresetName] = useState('');
  const [presetMsg, setPresetMsg] = useState('');

  /* ── Shared / Built-in Presets (from shared_overlay_presets table) ── */
  const [sharedPresets, setSharedPresets] = useState([]);

  useEffect(() => {
    getSharedPresets()
      .then(setSharedPresets)
      .catch(err => console.error('[OCC] Failed to load shared presets:', err));
  }, []);

  const sharePreset = useCallback(async (preset) => {
    if (!user || !isAdmin) return;
    try {
      await saveSharedPreset(preset.name, preset.snapshot, user.id);
      const refreshed = await getSharedPresets();
      setSharedPresets(refreshed);
      setPresetMsg(`"${preset.name}" shared globally!`);
      setTimeout(() => setPresetMsg(''), 2500);
    } catch (err) {
      console.error('[OCC] share error:', err);
      const msg = err?.message || String(err);
      if (msg.includes('does not exist') || msg.includes('42P01')) {
        setPresetMsg('Run add_shared_overlay_presets.sql migration first!');
      } else {
        setPresetMsg(`Share failed: ${msg.slice(0, 60)}`);
      }
      setTimeout(() => setPresetMsg(''), 5000);
    }
  }, [user, isAdmin]);

  const unsharePreset = useCallback(async (sharedId) => {
    if (!isAdmin) return;
    try {
      await deleteSharedPreset(sharedId);
      setSharedPresets(prev => prev.filter(p => p.id !== sharedId));
      setPresetMsg('Removed shared preset');
      setTimeout(() => setPresetMsg(''), 2500);
    } catch (err) {
      console.error('[OCC] unshare error:', err);
    }
  }, [isAdmin]);

  const saveGlobalPreset = useCallback(async () => {
    const name = presetName.trim();
    if (!name || widgets.length === 0) return;
    const snapshot = widgets.map(w => ({
      id: w.id,
      widget_type: w.widget_type,
      label: w.label,
      config: w.config,
      is_visible: w.is_visible,
      position_x: w.position_x,
      position_y: w.position_y,
      width: w.width,
      height: w.height,
      z_index: w.z_index,
      animation: w.animation,
    }));
    const entry = { name, snapshot, savedAt: Date.now() };
    const existing = [...globalPresets];
    const idx = existing.findIndex(p => p.name === name);
    const updated = idx >= 0
      ? existing.map((p, i) => i === idx ? entry : p)
      : [...existing, entry];
    await updateState({ globalPresets: updated });
    setPresetName('');
    setPresetMsg('Saved!');
    setTimeout(() => setPresetMsg(''), 2000);
  }, [presetName, widgets, globalPresets, updateState]);

  const loadGlobalPreset = useCallback(async (preset) => {
    if (!preset?.snapshot) return;
    for (const snap of preset.snapshot) {
      const existing = widgets.find(w => w.id === snap.id);
      if (existing) {
        await saveWidget({
          ...existing,
          config: snap.config,
          is_visible: snap.is_visible,
          position_x: snap.position_x,
          position_y: snap.position_y,
          width: snap.width,
          height: snap.height,
          z_index: snap.z_index,
          animation: snap.animation,
        });
      }
    }
    setPresetMsg('Loaded!');
    setTimeout(() => setPresetMsg(''), 2000);
  }, [widgets, saveWidget]);

  const deleteGlobalPreset = useCallback(async (name) => {
    const updated = globalPresets.filter(p => p.name !== name);
    await updateState({ globalPresets: updated });
  }, [globalPresets, updateState]);

  const overlayUrl = useMemo(() => {
    if (!instance) return '';
    const base = window.location.origin;
    return `${base}/overlay/${instance.overlay_token}`;
  }, [instance]);

  const copyUrl = useCallback(() => {
    navigator.clipboard.writeText(overlayUrl).then(() => {
      setCopyMsg('Copied!');
      setTimeout(() => setCopyMsg(''), 2000);
    });
  }, [overlayUrl]);

  if (!user) {
    return (
      <div className="oc-page">
        <div className="oc-auth-wall">
          <h2>🔒 Login Required</h2>
          <p>Sign in to access your Overlay Control Center.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="oc-page">
        <div className="oc-loading">
          <div className="oc-spinner" />
          <p>Loading your overlay…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="oc-page">
      <div className="oc-layout">
        {/* ─── SIDEBAR NAV ─── */}
        <aside className="oc-sidebar">
          <div className="oc-sidebar-brand">
            <span className="oc-sidebar-icon">🎛️</span>
            <h1 className="oc-sidebar-title">Overlay Center</h1>
          </div>

          <nav className="oc-sidebar-nav">
            {[
              { key: 'widgets', icon: '🧩', label: 'Widgets' },
              { key: 'preview', icon: '👁️', label: 'Preview' },
            ].map(tab => (
              <button
                key={tab.key}
                className={`oc-sidebar-btn ${activePanel === tab.key ? 'oc-sidebar-btn--active' : ''}`}
                onClick={() => setActivePanel(tab.key)}
              >
                <span className="oc-sidebar-btn-icon">{tab.icon}</span>
                <span className="oc-sidebar-btn-label">{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* ─── Resolution Selector ─── */}
          <div className="oc-sidebar-resolution">
            <label className="oc-sidebar-url-label">📐 Canvas Resolution</label>
            <select
              className="oc-sidebar-resolution-select"
              value={`${theme?.canvas_width || 1920}x${theme?.canvas_height || 1080}`}
              onChange={e => {
                const [w, h] = e.target.value.split('x').map(Number);
                saveTheme({ canvas_width: w, canvas_height: h });
              }}
            >
              <option value="1920x1080">1920 × 1080 (1080p)</option>
              <option value="2560x1440">2560 × 1440 (1440p)</option>
            </select>
          </div>

          {/* ─── Global Presets ─── */}
          <div className="oc-sidebar-presets">
            <label className="oc-sidebar-url-label">💾 Global Presets</label>
            <p className="oc-sidebar-preset-hint">Save & load ALL widget configs at once.</p>
            <div className="oc-sidebar-preset-save">
              <input
                className="oc-sidebar-preset-input"
                value={presetName}
                onChange={e => setPresetName(e.target.value)}
                placeholder="Preset name…"
                onKeyDown={e => e.key === 'Enter' && saveGlobalPreset()}
              />
              <button className="oc-sidebar-preset-save-btn" onClick={saveGlobalPreset} disabled={!presetName.trim()}>
                Save
              </button>
            </div>
            {presetMsg && <span className="oc-sidebar-preset-msg">{presetMsg}</span>}

            {/* ── Shared / Built-in Presets (visible to everyone) ── */}
            {sharedPresets.length > 0 && (
              <div className="oc-sidebar-preset-list">
                <span className="oc-sidebar-preset-section-label">🌐 Shared Presets</span>
                {sharedPresets.map(sp => (
                  <div key={sp.id} className="oc-sidebar-preset-item oc-sidebar-preset-item--shared">
                    <div className="oc-sidebar-preset-info">
                      <span className="oc-sidebar-preset-name">
                        🌐 {sp.name}
                      </span>
                      <span className="oc-sidebar-preset-date">{new Date(sp.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="oc-sidebar-preset-actions">
                      <button className="oc-sidebar-preset-load" onClick={() => loadGlobalPreset(sp)}>Load</button>
                      {isAdmin && (
                        <button className="oc-sidebar-preset-del" onClick={() => unsharePreset(sp.id)} title="Remove shared preset">✕</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Personal Presets ── */}
            {globalPresets.length > 0 && (
              <div className="oc-sidebar-preset-list">
                {sharedPresets.length > 0 && (
                  <span className="oc-sidebar-preset-section-label">👤 My Presets</span>
                )}
                {globalPresets.map(p => (
                  <div key={p.name} className="oc-sidebar-preset-item">
                    <div className="oc-sidebar-preset-info">
                      <span className="oc-sidebar-preset-name">{p.name}</span>
                      <span className="oc-sidebar-preset-date">{new Date(p.savedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="oc-sidebar-preset-actions">
                      <button className="oc-sidebar-preset-load" onClick={() => loadGlobalPreset(p)}>Load</button>
                      {isAdmin && (
                        <button
                          className="oc-sidebar-preset-share"
                          onClick={() => sharePreset(p)}
                          title="Share this preset with all users"
                        >🌐</button>
                      )}
                      <button className="oc-sidebar-preset-del" onClick={() => deleteGlobalPreset(p.name)}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* OBS URL */}
          <div className="oc-sidebar-url">
            <label className="oc-sidebar-url-label">OBS Browser Source URL</label>
            <div className="oc-sidebar-url-box">
              <input readOnly value={overlayUrl} className="oc-sidebar-url-input" onClick={copyUrl} title="Click to copy" />
              <button className="oc-sidebar-url-copy" onClick={copyUrl}>
                {copyMsg || '📋'}
              </button>
            </div>
            <button className="oc-sidebar-regen" onClick={regenToken} title="Generate new URL (invalidates old one)">
              🔄 Regenerate URL
            </button>
          </div>

          <div className="oc-sidebar-footer">
            <span className="oc-sidebar-user">{user.email}</span>
          </div>
        </aside>

        {/* ─── MAIN CONTENT ─── */}
        <main className="oc-main">
          {activePanel === 'widgets' && (
            <WidgetManager
              widgets={widgets}
              theme={theme}
              onAdd={addWidget}
              onSave={saveWidget}
              onRemove={removeWidget}
              availableWidgets={getAllWidgetDefs()}
            />
          )}
          {activePanel === 'theme' && (
            <ThemeEditor theme={theme} onSave={saveTheme} />
          )}
          {activePanel === 'preview' && (
            <OverlayPreview widgets={widgets} theme={theme} />
          )}
        </main>
      </div>
    </div>
  );
}
