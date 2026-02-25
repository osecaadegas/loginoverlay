/**
 * OverlayControlCenter.jsx — Main admin panel page.
 * Auth-protected. Manages widgets, theme, overlay URL.
 */
import React, { useState, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useOverlay } from '../../hooks/useOverlay';
import ThemeEditor from './ThemeEditor';
import WidgetManager from './WidgetManager';
import OverlayPreview from './OverlayPreview';
import './OverlayCenter.css';

// Register all built-in widgets
import './widgets/builtinWidgets';
import { getAllWidgetDefs } from './widgets/widgetRegistry';

export default function OverlayControlCenter() {
  const { user } = useAuth();
  const {
    instance, theme, widgets, overlayState, loading,
    saveTheme, addWidget, saveWidget, removeWidget,
    updateState, regenToken,
  } = useOverlay();

  const [activePanel, setActivePanel] = useState('widgets'); // widgets | theme | preview
  const [copyMsg, setCopyMsg] = useState('');

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
              { key: 'theme', icon: '🎨', label: 'Theme' },
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
            <OverlayPreview overlayUrl={overlayUrl} />
          )}
        </main>
      </div>
    </div>
  );
}
