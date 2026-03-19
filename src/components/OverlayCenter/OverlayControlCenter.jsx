/**
 * OverlayControlCenter.jsx — Main admin panel page.
 * Auth-protected. Manages widgets, theme, overlay URL.
 */
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useOverlay } from '../../hooks/useOverlay';
import { useAdmin } from '../../hooks/useAdmin';
import { usePremium } from '../../hooks/usePremium';
import usePresets from '../../hooks/usePresets';
import ThemeEditor from './ThemeEditor';
import ThemesPage from '../ThemesPage/ThemesPage';
import WidgetManager from './WidgetManager';
import { buildSyncedConfig } from './WidgetManager';
import { themeMap } from '../../data/appThemes';
// OverlayPreview removed — live preview is now inside WidgetManager
import GuidedTutorial, { isTutorialDone, resetTutorial } from './GuidedTutorial';
import BonusHuntLibrary from './BonusHuntLibrary';
import PresetLibrary from './PresetLibrary';
import SlotSubmissions from './slots/SlotSubmissions';
import SlotApprovals from './slots/SlotApprovals';
import ProfileSection from './ProfileSection';
import './OverlayCenter.css';
import './OverlayRenderer.css';

// Register all built-in widgets
import './widgets/builtinWidgets';
import { getAllWidgetDefs, getWidgetDef } from './widgets/widgetRegistry';

/* ── Generic WidgetPanel: replaces 14 identical panel wrappers ── */
const PANEL_TOUR = { bonus_hunt: 'bonus-hunt-page', tournament: 'tournament-page', bonus_buys: 'bonus-buys-page', current_slot: 'current-slot-page', single_slot: 'single-slot-page', random_slot_picker: 'random-slot-page', slot_requests: 'slot-requests-page', coin_flip: 'coin-flip-page', salty_words: 'salty-words-page', predictions: 'predictions-page' };

function WidgetPanel({ widgetType, widgets, saveWidget, addWidget, loading }) {
  const def = getWidgetDef(widgetType);
  const ConfigComponent = def?.configPanel;
  const icon = def?.icon || '📦';
  const label = def?.label || widgetType;

  const widget = widgets.find(w => w.widget_type === widgetType);
  const handleChange = (newConfig) => { if (widget) saveWidget({ ...widget, config: newConfig }); };

  if (loading) return <div className="oc-panel-loading">Loading…</div>;

  if (!widget) {
    return (
      <div className="oc-empty-panel">
        <h2>{icon} {label}</h2>
        <p>No {label} widget found. Add one to get started.</p>
        <button className="oc-btn-primary" onClick={() => addWidget(widgetType)}>
          + Add {label} Widget
        </button>
      </div>
    );
  }

  if (!ConfigComponent) return null;

  return (
    <div className="oc-panel-section" data-tour={PANEL_TOUR[widgetType] || undefined}>
      <ConfigComponent config={widget.config} onChange={handleChange} allWidgets={widgets} mode="sidebar" />
    </div>
  );
}

export default function OverlayControlCenter() {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const { isPremium } = usePremium();
  const navigate = useNavigate();
  const {
    instance, theme, widgets, overlayState, loading,
    saveTheme, addWidget, saveWidget, removeWidget,
    updateState, regenToken,
  } = useOverlay();

  const [activePanel, setActivePanel] = useState('widgets');
  const [communityOpen, setCommunityOpen] = useState(false);
  const [streamerToolsOpen, setStreamerToolsOpen] = useState(false);
  const [communityToolsOpen, setCommunityToolsOpen] = useState(false);
  const [collectionsOpen, setCollectionsOpen] = useState(false);

  /* Auto-expand Streamer Tools when one of its children is active */
  const streamerToolsKeys = ['bonus_hunt', 'tournament', 'bonus_buys', 'current_slot', 'single_slot'];
  const isStreamerToolActive = streamerToolsKeys.includes(activePanel);
  useEffect(() => { if (isStreamerToolActive) setStreamerToolsOpen(true); }, [isStreamerToolActive]);

  /* Auto-expand Community Tools when one of its children is active */
  const communityToolsKeys = ['random_slot_picker', 'slot_requests'];
  const isCommunityToolActive = communityToolsKeys.includes(activePanel);
  useEffect(() => { if (isCommunityToolActive) setCommunityToolsOpen(true); }, [isCommunityToolActive]);

  /* Auto-expand Collections when one of its children is active */
  const collectionsKeys = ['library', 'presets', 'slots', 'approvals', 'theme'];
  const isCollectionActive = collectionsKeys.includes(activePanel);
  useEffect(() => { if (isCollectionActive) setCollectionsOpen(true); }, [isCollectionActive]);
  const [copyMsg, setCopyMsg] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  /* Auto-start tutorial for first-time users */
  useEffect(() => {
    if (!loading && !isTutorialDone()) {
      const timer = setTimeout(() => setShowTutorial(true), 800);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  /* ── Presets (extracted to usePresets hook) ── */
  const {
    globalPresets, sharedPresets, presetName, setPresetName, presetMsg,
    saveGlobalPreset, loadGlobalPreset, deleteGlobalPreset,
    sharePreset, unsharePreset,
  } = usePresets({ user, isAdmin, overlayState, updateState, widgets, saveWidget, addWidget });

  /* ── Map theme id → navbar displayStyle ── */
  const THEME_TO_NAV_STYLE = { classic: 'glass', metallic: 'metallic', carbon: 'carbon', retro: 'retro', futuristic: 'futuristic' };

  /* ── Sync theme colors to all overlay widgets ── */
  const syncThemeToWidgets = useCallback(async (themeId, metalPresetId) => {
    const t = themeMap[themeId];
    if (!t || !widgets?.length) return;

    // For metallic theme, override primary/accent with the chosen metal color
    let colors = { ...t.colors };
    if (themeId === 'metallic' && metalPresetId) {
      const preset = (await import('../../data/appThemes')).metallicPresets[metalPresetId];
      if (preset) {
        colors.primary = preset.hex;
        colors.accent = preset.hex;
      }
    }

    // Persist ALL theme properties to DB so the OBS overlay renderer picks them up
    const themePatch = {
      style_preset: themeId,
      metal_color: metalPresetId || 'chrome',
      primary_color: colors.primary,
      secondary_color: colors.secondary,
      accent_color: colors.accent,
      text_color: colors.text,
      font_family: t.font,
    };

    const themeColors = {
      accentColor: colors.accent,
      bgColor: colors.surface,
      textColor: colors.text,
      mutedColor: colors.muted,
      borderColor: colors.border,
      fontFamily: t.font,
    };

    try {
      // Persist theme choice to overlay_themes so the OBS renderer picks it up
      await saveTheme(themePatch);

      // Update navbar widget — also set its displayStyle to match the theme
      const navStyle = THEME_TO_NAV_STYLE[themeId] || 'glass';
      const navWidget = widgets.find(w => w.widget_type === 'navbar');
      if (navWidget) {
        await saveWidget({ ...navWidget, config: { ...navWidget.config, ...themeColors, displayStyle: navStyle } });
      }

      // Sync all other widgets
      for (const w of widgets) {
        if (w.widget_type === 'navbar') continue;
        const synced = buildSyncedConfig(w.widget_type, w.config, themeColors);
        if (synced) {
          await saveWidget({ ...w, config: synced });
        }
      }
    } catch (err) {
      console.error('[ThemeSync] Failed to sync:', err);
    }
  }, [widgets, saveWidget, saveTheme]);

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
      {/* Mobile hamburger */}
      <button className="oc-hamburger" onClick={() => setSidebarOpen(o => !o)} aria-label="Toggle menu">
        <span className={`oc-hamburger-bar${sidebarOpen ? ' open' : ''}`} />
        <span className={`oc-hamburger-bar${sidebarOpen ? ' open' : ''}`} />
        <span className={`oc-hamburger-bar${sidebarOpen ? ' open' : ''}`} />
      </button>
      {/* Backdrop for mobile sidebar */}
      {sidebarOpen && <div className="oc-sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}

      <div className="oc-layout">
        {/* ─── SIDEBAR NAV ─── */}
        <aside className={`oc-sidebar${sidebarOpen ? ' oc-sidebar--open' : ''}`}>
          <nav className="oc-sidebar-nav">
            {/* ─── Home ─── */}
            <button
              className="oc-sidebar-btn"
              onClick={() => { navigate('/offers'); setSidebarOpen(false); }}
            >
              <span className="oc-sidebar-btn-icon">🏠</span>
              <div className="oc-sidebar-btn-text">
                <span className="oc-sidebar-btn-label">Home</span>
                <span className="oc-sidebar-btn-desc">Back to main site</span>
              </div>
            </button>

            {/* ─── Profile ─── */}
            <button
              className={`oc-sidebar-btn ${activePanel === 'profile' ? 'oc-sidebar-btn--active' : ''}`}
              onClick={() => { setActivePanel('profile'); setSidebarOpen(false); }}
            >
              <span className="oc-sidebar-btn-icon">👤</span>
              <div className="oc-sidebar-btn-text">
                <span className="oc-sidebar-btn-label">Profile</span>
                <span className="oc-sidebar-btn-desc">Identity & connected accounts</span>
              </div>
            </button>

            {/* ─── Tutorial ─── */}
            <button
              className="oc-sidebar-btn"
              onClick={() => { resetTutorial(); setShowTutorial(true); setSidebarOpen(false); setActivePanel('widgets'); }}
            >
              <span className="oc-sidebar-btn-icon">🎓</span>
              <div className="oc-sidebar-btn-text">
                <span className="oc-sidebar-btn-label">Tutorial</span>
                <span className="oc-sidebar-btn-desc">Guided walkthrough</span>
              </div>
            </button>

            <div className="oc-sidebar-divider-label">Overlay</div>

            {/* ─── Widgets (flat) ─── */}
            <button
              className={`oc-sidebar-btn ${activePanel === 'widgets' ? 'oc-sidebar-btn--active' : ''}`}
              onClick={() => { setActivePanel('widgets'); setSidebarOpen(false); }}
            >
              <span className="oc-sidebar-btn-icon">🧩</span>
              <div className="oc-sidebar-btn-text">
                <span className="oc-sidebar-btn-label">Widgets</span>
                <span className="oc-sidebar-btn-desc">Add & configure overlays</span>
              </div>
            </button>

            {/* ─── Streamer Tools dropdown ─── */}
            <button
              className={`oc-sidebar-btn ${streamerToolsOpen || isStreamerToolActive ? 'oc-sidebar-btn--active' : ''}`}
              onClick={() => setStreamerToolsOpen(o => !o)}
            >
              <span className="oc-sidebar-btn-icon">🛠️</span>
              <div className="oc-sidebar-btn-text">
                <span className="oc-sidebar-btn-label">Streamer Tools</span>
                <span className="oc-sidebar-btn-desc">Hunt, battles & tracking</span>
              </div>
              <span style={{ marginLeft: 'auto', fontSize: '0.7rem', opacity: 0.5, transition: 'transform 0.2s', transform: streamerToolsOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
            </button>
            {streamerToolsOpen && [
              { key: 'bonus_hunt', icon: '🎯', label: 'Bonus Hunt', desc: 'Manage hunt sessions' },
              { key: 'tournament', icon: '🏆', label: 'Tournament', desc: 'Run slot battles' },
              { key: 'bonus_buys', icon: '🛒', label: 'Bonus Buys', desc: 'Track bonus buy sessions' },
              { key: 'current_slot', icon: '🎰', label: 'Current Slot', desc: 'Set active slot' },
              { key: 'single_slot', icon: '🎰', label: 'Single Slot', desc: 'Slot stats & records' },
            ].map(tab => (
              <button
                key={tab.key}
                className={`oc-sidebar-btn oc-sidebar-btn--sub ${activePanel === tab.key ? 'oc-sidebar-btn--active' : ''}`}
                onClick={() => { setActivePanel(tab.key); setSidebarOpen(false); }}
              >
                <span className="oc-sidebar-btn-icon">{tab.icon}</span>
                <div className="oc-sidebar-btn-text">
                  <span className="oc-sidebar-btn-label">{tab.label}</span>
                  <span className="oc-sidebar-btn-desc">{tab.desc}</span>
                </div>
              </button>
            ))}

            {/* ─── Community Tools dropdown ─── */}
            <button
              className={`oc-sidebar-btn ${communityToolsOpen || isCommunityToolActive ? 'oc-sidebar-btn--active' : ''}`}
              onClick={() => setCommunityToolsOpen(o => !o)}
            >
              <span className="oc-sidebar-btn-icon">🧰</span>
              <div className="oc-sidebar-btn-text">
                <span className="oc-sidebar-btn-label">Community Tools</span>
                <span className="oc-sidebar-btn-desc">Wheels & pickers</span>
              </div>
              <span style={{ marginLeft: 'auto', fontSize: '0.7rem', opacity: 0.5, transition: 'transform 0.2s', transform: communityToolsOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
            </button>
            {communityToolsOpen && [
              { key: 'random_slot_picker', icon: '🎲', label: 'Random Slot', desc: 'Pick a random slot' },
              { key: 'slot_requests', icon: '📋', label: 'Slot Requests', desc: 'Chat !sr queue' },
            ].map(tab => (
              <button
                key={tab.key}
                className={`oc-sidebar-btn oc-sidebar-btn--sub ${activePanel === tab.key ? 'oc-sidebar-btn--active' : ''}`}
                onClick={() => { setActivePanel(tab.key); setSidebarOpen(false); }}
              >
                <span className="oc-sidebar-btn-icon">{tab.icon}</span>
                <div className="oc-sidebar-btn-text">
                  <span className="oc-sidebar-btn-label">{tab.label}</span>
                  <span className="oc-sidebar-btn-desc">{tab.desc}</span>
                </div>
              </button>
            ))}

            {/* ─── Community Games dropdown ─── */}
            <button
              className={`oc-sidebar-btn ${communityOpen ? 'oc-sidebar-btn--active' : ''}`}
              onClick={() => setCommunityOpen(o => !o)}
            >
              <span className="oc-sidebar-btn-icon">🎮</span>
              <div className="oc-sidebar-btn-text">
                <span className="oc-sidebar-btn-label">Community Games</span>
                <span className="oc-sidebar-btn-desc">Interactive viewer games</span>
              </div>
              <span style={{ marginLeft: 'auto', fontSize: '0.7rem', opacity: 0.5, transition: 'transform 0.2s', transform: communityOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
            </button>
            {communityOpen && [
              { key: 'coin_flip', icon: '🪙', label: 'Coin Flip', desc: 'Heads or tails betting' },
              { key: 'salty_words', icon: '🧂', label: 'Salty Words', desc: 'Word betting game' },
              { key: 'predictions', icon: '🔮', label: 'Predictions', desc: 'Two-outcome bets' },
            ].map(tab => (
              <button
                key={tab.key}
                className={`oc-sidebar-btn oc-sidebar-btn--sub ${activePanel === tab.key ? 'oc-sidebar-btn--active' : ''}`}
                onClick={() => { setActivePanel(tab.key); setSidebarOpen(false); }}
              >
                <span className="oc-sidebar-btn-icon">{tab.icon}</span>
                <div className="oc-sidebar-btn-text">
                  <span className="oc-sidebar-btn-label">{tab.label}</span>
                  <span className="oc-sidebar-btn-desc">{tab.desc}</span>
                </div>
              </button>
            ))}

            {/* ─── Collections dropdown ─── */}
            <div className="oc-sidebar-divider-label">Management</div>
            <button
              className={`oc-sidebar-btn ${collectionsOpen || isCollectionActive ? 'oc-sidebar-btn--active' : ''}`}
              onClick={() => setCollectionsOpen(o => !o)}
            >
              <span className="oc-sidebar-btn-icon">📦</span>
              <div className="oc-sidebar-btn-text">
                <span className="oc-sidebar-btn-label">Collections</span>
                <span className="oc-sidebar-btn-desc">Library, presets & slots</span>
              </div>
              <span style={{ marginLeft: 'auto', fontSize: '0.7rem', opacity: 0.5, transition: 'transform 0.2s', transform: collectionsOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
            </button>
            {collectionsOpen && [
              { key: 'theme', icon: '🎨', label: 'Themes', desc: 'Change widget appearance' },
              { key: 'library', icon: '📚', label: 'Library', desc: 'Saved bonus hunts' },
              { key: 'presets', icon: '💾', label: 'Presets', desc: 'Save & load layouts' },
              ...(isPremium || isAdmin ? [{ key: 'slots', icon: '🎰', label: 'Submit Slots', desc: 'Add new slot games' }] : []),
              ...(isAdmin ? [{ key: 'approvals', icon: '🛡️', label: 'Approvals', desc: 'Review submissions' }] : []),
            ].map(tab => (
              <button
                key={tab.key}
                className={`oc-sidebar-btn oc-sidebar-btn--sub ${activePanel === tab.key ? 'oc-sidebar-btn--active' : ''}`}
                onClick={() => { setActivePanel(tab.key); setSidebarOpen(false); }}
              >
                <span className="oc-sidebar-btn-icon">{tab.icon}</span>
                <div className="oc-sidebar-btn-text">
                  <span className="oc-sidebar-btn-label">{tab.label}</span>
                  <span className="oc-sidebar-btn-desc">{tab.desc}</span>
                </div>
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

          <div className="oc-sidebar-footer">
            <span className="oc-sidebar-user">{user.email}</span>
          </div>
        </aside>

        {/* ─── MAIN CONTENT ─── */}
        <main className="oc-main">
          {/* Quick-start steps for new users */}
          {activePanel === 'widgets' && widgets.length === 0 && (
            <div className="oc-welcome-card">
              <h2 className="oc-welcome-title">Welcome to your Overlay Center! 🎉</h2>
              <p className="oc-welcome-sub">Get your stream overlay running in 3 easy steps:</p>
              <div className="oc-welcome-steps">
                <div className="oc-welcome-step">
                  <span className="oc-welcome-step-num">1</span>
                  <div>
                    <strong>Add a widget</strong>
                    <span>Click "+ Add Widget" above to add your first overlay element</span>
                  </div>
                </div>
                <div className="oc-welcome-step">
                  <span className="oc-welcome-step-num">2</span>
                  <div>
                    <strong>Customize it</strong>
                    <span>Click a widget to expand it and change colors, text, and layout</span>
                  </div>
                </div>
                <div className="oc-welcome-step">
                  <span className="oc-welcome-step-num">3</span>
                  <div>
                    <strong>Add to OBS</strong>
                    <span>Copy the OBS URL from the sidebar and add it as a Browser Source</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activePanel === 'widgets' && (
            <div className="oc-obs-url-bar" data-tour="obs-url">
              <label className="oc-obs-url-label">OBS Browser Source URL</label>
              <div className="oc-obs-url-row">
                <input readOnly value={overlayUrl} className="oc-obs-url-input" onClick={copyUrl} title="Click to copy" />
                <button className="oc-obs-url-copy" onClick={copyUrl}>{copyMsg || '📋'}</button>
                <button className="oc-obs-url-regen" onClick={regenToken} title="Generate new URL (invalidates old one)">🔄</button>
              </div>
            </div>
          )}

          {activePanel === 'widgets' && (
            <WidgetManager
              widgets={widgets}
              theme={theme}
              onAdd={addWidget}
              onSave={saveWidget}
              onRemove={removeWidget}
              availableWidgets={getAllWidgetDefs()}
              overlayToken={instance?.overlay_token}
            />
          )}
          {/* Generic widget panels — resolved from registry */}
          {['bonus_hunt','tournament','current_slot','random_slot_picker','slot_requests','single_slot','bonus_buys','coin_flip','salty_words','predictions'].includes(activePanel) && (
            <WidgetPanel widgetType={activePanel} widgets={widgets} saveWidget={saveWidget} addWidget={addWidget} loading={loading} />
          )}
          {activePanel === 'library' && (
            <BonusHuntLibrary widgets={widgets} onSaveWidget={saveWidget} />
          )}
          {activePanel === 'theme' && (
            <ThemesPage onApply={syncThemeToWidgets} />
          )}
          {activePanel === 'presets' && (
            <PresetLibrary
              widgets={widgets}
              theme={theme}
              isAdmin={isAdmin}
              globalPresets={globalPresets}
              sharedPresets={sharedPresets}
              onLoadPreset={loadGlobalPreset}
              onDeletePreset={deleteGlobalPreset}
              onSharePreset={sharePreset}
              onUnsharePreset={unsharePreset}
              onSavePreset={saveGlobalPreset}
              presetName={presetName}
              setPresetName={setPresetName}
              presetMsg={presetMsg}
            />
          )}
          {activePanel === 'slots' && (isPremium || isAdmin) && (
            <SlotSubmissions />
          )}
          {activePanel === 'approvals' && isAdmin && (
            <SlotApprovals />
          )}
          {activePanel === 'profile' && (
            <ProfileSection widgets={widgets} saveWidget={saveWidget} />
          )}
        </main>
      </div>

      {/* Guided Tutorial Overlay */}
      <GuidedTutorial active={showTutorial} onClose={() => setShowTutorial(false)} goToPage={setActivePanel} />
    </div>
  );
}
