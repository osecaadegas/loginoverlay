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
import OverlayAssetLibrary from './OverlayAssetLibrary';
import PresetLibrary from './PresetLibrary';
import SlotSubmissions from './slots/SlotSubmissions';
import SlotApprovals from './slots/SlotApprovals';
import ProfileSection from './ProfileSection';
import { CopyField, StatusBadge } from './ui';

import './OverlayCenter.css';
import './OverlayRenderer.css';

// Register all built-in widgets
import './widgets/builtinWidgets';
import { getAllWidgetDefs, getWidgetDef } from './widgets/widgetRegistry';

/* ── Generic WidgetPanel: replaces 14 identical panel wrappers ── */
const PANEL_TOUR = { bonus_hunt: 'bonus-hunt-page', tournament: 'tournament-page', bonus_buys: 'bonus-buys-page', current_slot: 'current-slot-page', slot_requests: 'slot-requests-page', bets: 'bets-page' };
const WIDGET_PANEL_KEYS = Object.keys(PANEL_TOUR);
const PANEL_META = {
  widgets: {
    eyebrow: 'Overlay Builder',
    title: 'Control Center',
    description: 'Manage layout, styling, and live widget behavior from one premium dashboard.',
  },
  profile: {
    eyebrow: 'Account',
    title: 'Profile & Connections',
    description: 'Review your identity, linked services, and channel-facing profile settings.',
  },
  bonus_hunt: {
    eyebrow: 'Streamer Tools',
    title: 'Bonus Hunt',
    description: 'Tune the primary hunt experience, visuals, and on-stream stats.',
  },
  tournament: {
    eyebrow: 'Streamer Tools',
    title: 'Tournament',
    description: 'Configure tournament overlays, standings, and competitive presentation.',
  },
  bonus_buys: {
    eyebrow: 'Streamer Tools',
    title: 'Bonus Buys',
    description: 'Track buy sessions with a cleaner live control surface.',
  },
  current_slot: {
    eyebrow: 'Streamer Tools',
    title: 'Current Slot',
    description: 'Set and present the currently featured slot with better visibility.',
  },
  slot_requests: {
    eyebrow: 'Community Tools',
    title: 'Slot Requests',
    description: 'Moderate viewer requests and keep the queue stream-ready at a glance.',
  },
  bets: {
    eyebrow: 'Community Tools',
    title: 'Bets',
    description: 'Run live chat-powered bracket betting rounds with your viewers.',
  },
  library: {
    eyebrow: 'Management',
    title: 'Library',
    description: 'Browse widgets, overlay tools, saved hunts, presets, and reusable streamer assets.',
  },
  presets: {
    eyebrow: 'Management',
    title: 'Layout Presets',
    description: 'Save and restore complete overlay setups with fewer clicks.',
  },
  theme: {
    eyebrow: 'Management',
    title: 'Themes',
    description: 'Apply polished visual systems across widgets and the live overlay.',
  },
  slots: {
    eyebrow: 'Management',
    title: 'Submit Slots',
    description: 'Manage slot submissions in the same streamlined workspace.',
  },
  approvals: {
    eyebrow: 'Management',
    title: 'Approvals',
    description: 'Review pending changes and submissions with clear visual priority.',
  },
};

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

  const [streamerToolsOpen, setStreamerToolsOpen] = useState(false);

  /* Auto-expand Streamer Tools when one of its children is active */
  const streamerToolsKeys = WIDGET_PANEL_KEYS;
  const isStreamerToolActive = streamerToolsKeys.includes(activePanel);
  useEffect(() => { if (isStreamerToolActive) setStreamerToolsOpen(true); }, [isStreamerToolActive]);



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
  const panelMeta = PANEL_META[activePanel] || PANEL_META.widgets;
  const visibleWidgetCount = useMemo(() => (widgets || []).filter(w => w.is_visible !== false).length, [widgets]);
  const canvasLabel = `${theme?.canvas_width || 1920}x${theme?.canvas_height || 1080}`;
  const activePanelWidget = useMemo(() => {
    if (!WIDGET_PANEL_KEYS.includes(activePanel)) return null;
    return (widgets || []).find(widget => widget.widget_type === activePanel) || null;
  }, [activePanel, widgets]);
  const obsUrlContext = useMemo(() => {
    if (!overlayUrl) return null;

    if (activePanel === 'widgets') {
      return {
        label: 'Full Overlay OBS URL',
        value: overlayUrl,
        copyLabel: 'Copy full URL',
        mobileLabel: 'Copy Full OBS Link',
        allowRegen: true,
      };
    }

    if (WIDGET_PANEL_KEYS.includes(activePanel) && activePanelWidget?.id) {
      return {
        label: `${panelMeta.title} Widget OBS URL`,
        value: `${overlayUrl}?widget=${activePanelWidget.id}`,
        copyLabel: 'Copy widget URL',
        mobileLabel: 'Copy Widget OBS Link',
        allowRegen: false,
      };
    }

    return null;
  }, [activePanel, activePanelWidget?.id, overlayUrl, panelMeta.title]);

  const copyUrl = useCallback(() => {
    if (!obsUrlContext?.value) return;
    navigator.clipboard.writeText(obsUrlContext.value).then(() => {
      setCopyMsg('Copied!');
      setTimeout(() => setCopyMsg(''), 2000);
    });
  }, [obsUrlContext?.value]);

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
          <div className="oc-sidebar-brand">
            <span className="oc-sidebar-icon">◌</span>
            <div className="oc-sidebar-brand-text">
              <h1 className="oc-sidebar-title">Overlay Center</h1>
              <p className="oc-sidebar-brand-subtitle">Premium streaming workspace</p>
            </div>
          </div>
          <nav className="oc-sidebar-nav">
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
              { key: 'slot_requests', icon: '📋', label: 'Slot Requests', desc: 'Chat !sr queue' },
              { key: 'bets', icon: '🎲', label: 'Bets', desc: 'Chat bracket betting' },
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

            <div className="oc-sidebar-divider-label">Management</div>

            {/* ─── Library ─── */}
            <button
              className={`oc-sidebar-btn ${activePanel === 'library' ? 'oc-sidebar-btn--active' : ''}`}
              onClick={() => { setActivePanel('library'); setSidebarOpen(false); }}
            >
              <span className="oc-sidebar-btn-icon">📚</span>
              <div className="oc-sidebar-btn-text">
                <span className="oc-sidebar-btn-label">Library</span>
                <span className="oc-sidebar-btn-desc">Assets, hunts & presets</span>
              </div>
            </button>

            {/* ─── Presets ─── */}
            <button
              className={`oc-sidebar-btn ${activePanel === 'presets' ? 'oc-sidebar-btn--active' : ''}`}
              onClick={() => { setActivePanel('presets'); setSidebarOpen(false); }}
            >
              <span className="oc-sidebar-btn-icon">💾</span>
              <div className="oc-sidebar-btn-text">
                <span className="oc-sidebar-btn-label">Presets</span>
                <span className="oc-sidebar-btn-desc">Save & load layouts</span>
              </div>
            </button>

            <button
              className={`oc-sidebar-btn ${activePanel === 'theme' ? 'oc-sidebar-btn--active' : ''}`}
              onClick={() => { setActivePanel('theme'); setSidebarOpen(false); }}
            >
              <span className="oc-sidebar-btn-icon">🎨</span>
              <div className="oc-sidebar-btn-text">
                <span className="oc-sidebar-btn-label">Themes</span>
                <span className="oc-sidebar-btn-desc">Style system & canvas</span>
              </div>
            </button>

            {(isPremium || isAdmin) && (
              <button
                className={`oc-sidebar-btn ${activePanel === 'slots' ? 'oc-sidebar-btn--active' : ''}`}
                onClick={() => { setActivePanel('slots'); setSidebarOpen(false); }}
              >
                <span className="oc-sidebar-btn-icon">🎰</span>
                <div className="oc-sidebar-btn-text">
                  <span className="oc-sidebar-btn-label">Slot Database</span>
                  <span className="oc-sidebar-btn-desc">Browse & submit slots</span>
                </div>
              </button>
            )}

            {/* ─── Approvals (admin only) ─── */}
            {isAdmin && (
              <button
                className={`oc-sidebar-btn ${activePanel === 'approvals' ? 'oc-sidebar-btn--active' : ''}`}
                onClick={() => { setActivePanel('approvals'); setSidebarOpen(false); }}
              >
                <span className="oc-sidebar-btn-icon">🛡️</span>
                <div className="oc-sidebar-btn-text">
                  <span className="oc-sidebar-btn-label">Approvals</span>
                  <span className="oc-sidebar-btn-desc">Review submissions</span>
                </div>
              </button>
            )}

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
          <div className="oc-main-shell">
          <div className={`oc-command-header${obsUrlContext ? '' : ' oc-command-header--no-url'}`}>
            <div className="oc-command-header__copy">
              <span className="oc-main-eyebrow">{panelMeta.eyebrow}</span>
              <h2 className="oc-main-title">{panelMeta.title}</h2>
              <p className="oc-main-description">{panelMeta.description}</p>
              <div className="oc-command-header__meta">
                <StatusBadge tone={visibleWidgetCount > 0 ? 'live' : 'neutral'}>{visibleWidgetCount} live</StatusBadge>
                <StatusBadge tone="neutral">{widgets.length} installed</StatusBadge>
                <StatusBadge tone="neutral">{canvasLabel}</StatusBadge>
                <StatusBadge tone={isPremium ? 'active' : 'neutral'}>{isPremium ? 'Premium' : 'Standard'}</StatusBadge>
                {WIDGET_PANEL_KEYS.includes(activePanel) && !activePanelWidget && (
                  <StatusBadge tone="setup">Add widget for OBS URL</StatusBadge>
                )}
              </div>
            </div>
            {obsUrlContext && (
              <CopyField
                className="oc-command-header__copyfield"
                label={obsUrlContext.label}
                value={obsUrlContext.value}
                onCopy={copyUrl}
                copied={!!copyMsg}
                copyLabel={obsUrlContext.copyLabel}
                copiedLabel={copyMsg || 'Copied'}
                onRegen={obsUrlContext.allowRegen ? regenToken : undefined}
                regenLabel="New full URL"
              />
            )}
          </div>

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
          {WIDGET_PANEL_KEYS.includes(activePanel) && (
            <WidgetPanel widgetType={activePanel} widgets={widgets} saveWidget={saveWidget} addWidget={addWidget} loading={loading} />
          )}
          {activePanel === 'library' && (
            <OverlayAssetLibrary
              widgets={widgets}
              onAddWidget={addWidget}
              onOpenPanel={setActivePanel}
              huntArchive={<BonusHuntLibrary widgets={widgets} onSaveWidget={saveWidget} />}
              presetLibrary={(
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
            />
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
          {activePanel === 'theme' && (
            <div className="oc-theme-workspace">
              <ThemesPage onApply={syncThemeToWidgets} />
              <ThemeEditor theme={theme} onSave={saveTheme} />
            </div>
          )}
          {activePanel === 'profile' && (
            <ProfileSection widgets={widgets} saveWidget={saveWidget} />
          )}
          {obsUrlContext && (
            <button type="button" className="oc-mobile-obs-action oc-ui-btn oc-ui-btn--primary" onClick={copyUrl}>
              {copyMsg || obsUrlContext.mobileLabel}
            </button>
          )}
          </div>
        </main>
      </div>

      {/* Guided Tutorial Overlay */}
      <GuidedTutorial active={showTutorial} onClose={() => setShowTutorial(false)} goToPage={setActivePanel} />
    </div>
  );
}
