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
import { getSharedPresets, saveSharedPreset, deleteSharedPreset } from '../../services/overlayService';
import ThemeEditor from './ThemeEditor';
import WidgetManager from './WidgetManager';
// OverlayPreview removed — live preview is now inside WidgetManager
import GuidedTutorial, { isTutorialDone, resetTutorial } from './GuidedTutorial';
import BonusHuntLibrary from './BonusHuntLibrary';
import PresetLibrary from './PresetLibrary';
import SlotSubmissions from './slots/SlotSubmissions';
import SlotApprovals from './slots/SlotApprovals';
import BonusHuntConfig from './widgets/BonusHuntConfig';
import TournamentConfig from './widgets/TournamentConfig';
import './OverlayCenter.css';

// Register all built-in widgets
import './widgets/builtinWidgets';
import { getAllWidgetDefs } from './widgets/widgetRegistry';

/* ── Inline wrapper: renders BonusHuntConfig for the bonus_hunt widget ── */
function BonusHuntPanel({ widgets, saveWidget, addWidget, loading }) {
  const widget = widgets.find(w => w.widget_type === 'bonus_hunt');

  const handleChange = (newConfig) => {
    if (widget) saveWidget({ ...widget, config: newConfig });
  };

  if (loading) return <div className="oc-panel-loading">Loading…</div>;

  if (!widget) {
    return (
      <div className="oc-empty-panel">
        <h2>🎯 Bonus Hunt</h2>
        <p>No Bonus Hunt widget found. Add one to get started.</p>
        <button className="oc-btn-primary" onClick={() => addWidget('bonus_hunt')}>
          + Add Bonus Hunt Widget
        </button>
      </div>
    );
  }

  return (
    <div className="oc-panel-section" data-tour="bonus-hunt-page">
      <BonusHuntConfig config={widget.config} onChange={handleChange} allWidgets={widgets} mode="sidebar" />
    </div>
  );
}

/* ── Inline wrapper: renders TournamentConfig for the tournament widget ── */
function TournamentPanel({ widgets, saveWidget, addWidget, loading }) {
  const widget = widgets.find(w => w.widget_type === 'tournament');

  const handleChange = (newConfig) => {
    if (widget) saveWidget({ ...widget, config: newConfig });
  };

  if (loading) return <div className="oc-panel-loading">Loading…</div>;

  if (!widget) {
    return (
      <div className="oc-empty-panel">
        <h2>🏆 Tournament</h2>
        <p>No Tournament widget found. Add one to get started.</p>
        <button className="oc-btn-primary" onClick={() => addWidget('tournament')}>
          + Add Tournament Widget
        </button>
      </div>
    );
  }

  return (
    <div className="oc-panel-section" data-tour="tournament-page">
      <TournamentConfig config={widget.config} onChange={handleChange} allWidgets={widgets} mode="sidebar" />
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

  const [activePanel, setActivePanel] = useState('widgets'); // widgets | preview
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

  /* ── User-data config keys to SKIP in presets (per widget type).
     Only styling/layout/color keys get saved & applied; user content stays individual. ── */
  const USER_DATA_KEYS = useMemo(() => ({
    stats:              ['totalBet', 'totalWin', 'highestWin', 'highestMulti', 'sessionProfit', 'currency'],
    bonus_hunt:         ['bonuses', 'huntActive', 'currency', 'startMoney', 'targetMoney', 'stopLoss', 'showStatistics', 'animatedTracker', 'bonusOpening'],
    current_slot:       ['slotName', 'provider', 'betSize', 'imageUrl', 'rtp'],
    tournament:         ['title', 'prize', 'active', 'players', 'slots', 'format', 'data'],
    giveaway:           ['title', 'prize', 'keyword', 'isActive', 'winner'],
    navbar:             ['streamerName', 'motto', 'twitchUsername', 'avatarUrl', 'badgeImage', 'cryptoCoins', 'cryptoDisplayMode', 'ctaText', 'showAvatar', 'showClock', 'showNowPlaying', 'showCrypto', 'showCTA', 'musicSource', 'manualArtist', 'manualTrack', 'spotify_access_token', 'spotify_refresh_token', 'spotify_expires_at'],
    chat:               ['twitchEnabled', 'twitchChannel', 'youtubeEnabled', 'youtubeVideoId', 'youtubeApiKey', 'kickEnabled', 'kickChannelId', 'maxMessages'],
    session_stats:      ['wagered', 'won', 'profit', 'bestWin', 'bestMulti', 'slotsPlayed', 'currency'],
    recent_wins:        ['wins', 'currency'],
    coinflip:           ['flipping', 'result', 'label'],
    slotmachine:        ['spinning', 'reels', 'label'],
    random_slot_picker: ['picking', 'selectedSlot'],
    wheel_of_names:     ['entries', 'spinning', 'winner'],
    placeholder:        ['html'],
    image_slideshow:    ['images', 'caption', 'pauseOnHover'],
    rtp_stats:          ['previewMode'],
    background:         ['imageUrl', 'videoUrl'],
    raid_shoutout:      ['soundUrl', 'showClip', 'showGame', 'showViewers'],
  }), []);

  /** Strip user-data keys from a widget config, keeping only styling/layout */
  const stripUserData = useCallback((widgetType, config) => {
    const skip = new Set(USER_DATA_KEYS[widgetType] || []);
    const clean = {};
    for (const [key, value] of Object.entries(config || {})) {
      if (!skip.has(key)) clean[key] = value;
    }
    return clean;
  }, [USER_DATA_KEYS]);

  /** Merge preset config into existing config — keep user data, apply styling only */
  const mergePresetConfig = useCallback((widgetType, existingConfig, presetConfig) => {
    const skip = new Set(USER_DATA_KEYS[widgetType] || []);
    const merged = { ...(existingConfig || {}) };
    for (const [key, value] of Object.entries(presetConfig || {})) {
      if (!skip.has(key)) merged[key] = value;
    }
    return merged;
  }, [USER_DATA_KEYS]);

  const saveGlobalPreset = useCallback(async () => {
    const name = presetName.trim();
    if (!name || widgets.length === 0) return;
    const snapshot = widgets.map(w => ({
      id: w.id,
      widget_type: w.widget_type,
      label: w.label,
      config: stripUserData(w.widget_type, w.config),
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
  }, [presetName, widgets, globalPresets, updateState, stripUserData]);

  const loadGlobalPreset = useCallback(async (preset) => {
    if (!preset?.snapshot) return;

    // Track which local widgets have been claimed so we don't double-match
    const claimed = new Set();

    for (const snap of preset.snapshot) {
      // 1) Try exact id match (same user reloading their own preset)
      let target = widgets.find(w => w.id === snap.id && !claimed.has(w.id));

      // 2) Fall back to widget_type match (different user loading shared preset)
      if (!target) {
        target = widgets.find(
          w => w.widget_type === snap.widget_type && !claimed.has(w.id)
        );
      }

      if (target) {
        claimed.add(target.id);
        await saveWidget({
          ...target,
          config: mergePresetConfig(target.widget_type, target.config, snap.config),
          is_visible: snap.is_visible,
          position_x: snap.position_x,
          position_y: snap.position_y,
          width: snap.width,
          height: snap.height,
          z_index: snap.z_index,
          animation: snap.animation,
        });
      } else {
        // 3) Widget type doesn't exist yet — create it with merged config
        const created = await addWidget(snap.widget_type, {});
        if (created) {
          await saveWidget({
            ...created,
            config: mergePresetConfig(created.widget_type, created.config, snap.config),
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
    }
    setPresetMsg('Loaded!');
    setTimeout(() => setPresetMsg(''), 2000);
  }, [widgets, saveWidget, addWidget, mergePresetConfig]);

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
            <span className="oc-sidebar-icon">🎛️</span>
            <h1 className="oc-sidebar-title">Overlay Center</h1>
          </div>

          <nav className="oc-sidebar-nav">
            {/* Home — redirects to Partners/Offers page */}
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

            <div className="oc-sidebar-divider-label">Stream Overlay</div>

            {/* Panel tabs */}
            {[
              { key: 'widgets', icon: '🧩', label: 'Widgets', desc: 'Add & configure overlays' },
              { key: 'bonus_hunt', icon: '🎯', label: 'Bonus Hunt', desc: 'Manage hunt sessions' },
              { key: 'tournament', icon: '🏆', label: 'Tournament', desc: 'Run slot battles' },
              { key: 'library', icon: '📚', label: 'Library', desc: 'Saved bonus hunts' },
              { key: 'presets', icon: '💾', label: 'Presets', desc: 'Save & load layouts' },
              ...(isPremium || isAdmin ? [{ key: 'slots', icon: '🎰', label: 'Submit Slots', desc: 'Add new slot games' }] : []),
              ...(isAdmin ? [{ key: 'approvals', icon: '🛡️', label: 'Approvals', desc: 'Review submissions' }] : []),
            ].map(tab => (
              <button
                key={tab.key}
                className={`oc-sidebar-btn ${activePanel === tab.key ? 'oc-sidebar-btn--active' : ''}`}
                onClick={() => { setActivePanel(tab.key); setSidebarOpen(false); }}
              >
                <span className="oc-sidebar-btn-icon">{tab.icon}</span>
                <div className="oc-sidebar-btn-text">
                  <span className="oc-sidebar-btn-label">{tab.label}</span>
                  <span className="oc-sidebar-btn-desc">{tab.desc}</span>
                </div>
              </button>
            ))}

            {/* Tutorial button */}
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

          {/* OBS URL */}
          <div className="oc-sidebar-url" data-tour="obs-url">
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
          {activePanel === 'bonus_hunt' && (
            <BonusHuntPanel widgets={widgets} saveWidget={saveWidget} addWidget={addWidget} loading={loading} />
          )}
          {activePanel === 'tournament' && (
            <TournamentPanel widgets={widgets} saveWidget={saveWidget} addWidget={addWidget} loading={loading} />
          )}
          {activePanel === 'library' && (
            <BonusHuntLibrary widgets={widgets} onSaveWidget={saveWidget} />
          )}
          {activePanel === 'theme' && (
            <ThemeEditor theme={theme} onSave={saveTheme} />
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
        </main>
      </div>

      {/* Guided Tutorial Overlay */}
      <GuidedTutorial active={showTutorial} onClose={() => setShowTutorial(false)} goToPage={setActivePanel} />
    </div>
  );
}
