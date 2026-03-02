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
import CurrentSlotConfig from './widgets/CurrentSlotConfig';
import WheelOfNamesConfig from './widgets/WheelOfNamesConfig';
import RandomSlotPickerConfig from './widgets/RandomSlotPickerConfig';
import SingleSlotConfig from './widgets/SingleSlotConfig';
import CoinFlipConfig from './widgets/CoinFlipConfig';
import PointSlotConfig from './widgets/PointSlotConfig';
import SaltyWordsConfig from './widgets/SaltyWordsConfig';
import PredictionsConfig from './widgets/PredictionsConfig';
import PointWheelConfig from './widgets/PointWheelConfig';
import BonusBuysConfig from './widgets/BonusBuysConfig';
import ProfileSection from './ProfileSection';
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

/* ── Inline wrapper: Current Slot sidebar panel ── */
function CurrentSlotPanel({ widgets, saveWidget, addWidget, loading }) {
  const widget = widgets.find(w => w.widget_type === 'current_slot');
  const handleChange = (newConfig) => { if (widget) saveWidget({ ...widget, config: newConfig }); };
  if (loading) return <div className="oc-panel-loading">Loading…</div>;
  if (!widget) return (
    <div className="oc-empty-panel">
      <h2>🎰 Current Slot</h2>
      <p>No Current Slot widget found. Add one to get started.</p>
      <button className="oc-btn-primary" onClick={() => addWidget('current_slot')}>+ Add Current Slot Widget</button>
    </div>
  );
  return <div className="oc-panel-section"><CurrentSlotConfig config={widget.config} onChange={handleChange} allWidgets={widgets} mode="sidebar" /></div>;
}

/* ── Inline wrapper: Wheel of Names sidebar panel ── */
function WheelOfNamesPanel({ widgets, saveWidget, addWidget, loading }) {
  const widget = widgets.find(w => w.widget_type === 'wheel_of_names');
  const handleChange = (newConfig) => { if (widget) saveWidget({ ...widget, config: newConfig }); };
  if (loading) return <div className="oc-panel-loading">Loading…</div>;
  if (!widget) return (
    <div className="oc-empty-panel">
      <h2>🎡 Wheel of Names</h2>
      <p>No Wheel of Names widget found. Add one to get started.</p>
      <button className="oc-btn-primary" onClick={() => addWidget('wheel_of_names')}>+ Add Wheel of Names Widget</button>
    </div>
  );
  return <div className="oc-panel-section"><WheelOfNamesConfig config={widget.config} onChange={handleChange} allWidgets={widgets} mode="sidebar" /></div>;
}

/* ── Inline wrapper: Random Slot Picker sidebar panel ── */
function RandomSlotPickerPanel({ widgets, saveWidget, addWidget, loading }) {
  const widget = widgets.find(w => w.widget_type === 'random_slot_picker');
  const handleChange = (newConfig) => { if (widget) saveWidget({ ...widget, config: newConfig }); };
  if (loading) return <div className="oc-panel-loading">Loading…</div>;
  if (!widget) return (
    <div className="oc-empty-panel">
      <h2>🎲 Random Slot Picker</h2>
      <p>No Random Slot Picker widget found. Add one to get started.</p>
      <button className="oc-btn-primary" onClick={() => addWidget('random_slot_picker')}>+ Add Random Slot Picker Widget</button>
    </div>
  );
  return <div className="oc-panel-section"><RandomSlotPickerConfig config={widget.config} onChange={handleChange} allWidgets={widgets} mode="sidebar" /></div>;
}

/* ── Inline wrapper: Single Slot sidebar panel ── */
function SingleSlotPanel({ widgets, saveWidget, addWidget, loading }) {
  const widget = widgets.find(w => w.widget_type === 'single_slot');
  const handleChange = (newConfig) => { if (widget) saveWidget({ ...widget, config: newConfig }); };
  if (loading) return <div className="oc-panel-loading">Loading…</div>;
  if (!widget) return (
    <div className="oc-empty-panel">
      <h2>🎰 Single Slot</h2>
      <p>No Single Slot widget found. Add one to get started.</p>
      <button className="oc-btn-primary" onClick={() => addWidget('single_slot')}>+ Add Single Slot Widget</button>
    </div>
  );
  return <div className="oc-panel-section"><SingleSlotConfig config={widget.config} onChange={handleChange} allWidgets={widgets} mode="sidebar" /></div>;
}

/* ── Inline wrapper: Bonus Buys sidebar panel ── */
function BonusBuysPanel({ widgets, saveWidget, addWidget, loading }) {
  const widget = widgets.find(w => w.widget_type === 'bonus_buys');
  const handleChange = (newConfig) => { if (widget) saveWidget({ ...widget, config: newConfig }); };
  if (loading) return <div className="oc-panel-loading">Loading…</div>;
  if (!widget) return (
    <div className="oc-empty-panel">
      <h2>🛒 Bonus Buys</h2>
      <p>No Bonus Buys widget found. Add one to get started.</p>
      <button className="oc-btn-primary" onClick={() => addWidget('bonus_buys')}>+ Add Bonus Buys Widget</button>
    </div>
  );
  return <div className="oc-panel-section"><BonusBuysConfig config={widget.config} onChange={handleChange} allWidgets={widgets} mode="sidebar" /></div>;
}

/* ── Inline wrapper: Coin Flip sidebar panel ── */
function CoinFlipPanel({ widgets, saveWidget, addWidget, loading }) {
  const widget = widgets.find(w => w.widget_type === 'coin_flip');
  const handleChange = (newConfig) => { if (widget) saveWidget({ ...widget, config: newConfig }); };
  if (loading) return <div className="oc-panel-loading">Loading…</div>;
  if (!widget) return (
    <div className="oc-empty-panel">
      <h2>🪙 Coin Flip</h2>
      <p>No Coin Flip widget found. Add one to get started.</p>
      <button className="oc-btn-primary" onClick={() => addWidget('coin_flip')}>+ Add Coin Flip Widget</button>
    </div>
  );
  return <div className="oc-panel-section"><CoinFlipConfig config={widget.config} onChange={handleChange} allWidgets={widgets} mode="sidebar" /></div>;
}

/* ── Inline wrapper: Point Slot sidebar panel ── */
function PointSlotPanel({ widgets, saveWidget, addWidget, loading }) {
  const widget = widgets.find(w => w.widget_type === 'point_slot');
  const handleChange = (newConfig) => { if (widget) saveWidget({ ...widget, config: newConfig }); };
  if (loading) return <div className="oc-panel-loading">Loading…</div>;
  if (!widget) return (
    <div className="oc-empty-panel">
      <h2>🎰 Point Slot</h2>
      <p>No Point Slot widget found. Add one to get started.</p>
      <button className="oc-btn-primary" onClick={() => addWidget('point_slot')}>+ Add Point Slot Widget</button>
    </div>
  );
  return <div className="oc-panel-section"><PointSlotConfig config={widget.config} onChange={handleChange} allWidgets={widgets} mode="sidebar" /></div>;
}

/* ── Inline wrapper: Salty Words sidebar panel ── */
function SaltyWordsPanel({ widgets, saveWidget, addWidget, loading }) {
  const widget = widgets.find(w => w.widget_type === 'salty_words');
  const handleChange = (newConfig) => { if (widget) saveWidget({ ...widget, config: newConfig }); };
  if (loading) return <div className="oc-panel-loading">Loading…</div>;
  if (!widget) return (
    <div className="oc-empty-panel">
      <h2>🧂 Salty Words</h2>
      <p>No Salty Words widget found. Add one to get started.</p>
      <button className="oc-btn-primary" onClick={() => addWidget('salty_words')}>+ Add Salty Words Widget</button>
    </div>
  );
  return <div className="oc-panel-section"><SaltyWordsConfig config={widget.config} onChange={handleChange} allWidgets={widgets} mode="sidebar" /></div>;
}

/* ── Inline wrapper: Predictions sidebar panel ── */
function PredictionsPanel({ widgets, saveWidget, addWidget, loading }) {
  const widget = widgets.find(w => w.widget_type === 'predictions');
  const handleChange = (newConfig) => { if (widget) saveWidget({ ...widget, config: newConfig }); };
  if (loading) return <div className="oc-panel-loading">Loading…</div>;
  if (!widget) return (
    <div className="oc-empty-panel">
      <h2>🔮 Predictions</h2>
      <p>No Predictions widget found. Add one to get started.</p>
      <button className="oc-btn-primary" onClick={() => addWidget('predictions')}>+ Add Predictions Widget</button>
    </div>
  );
  return <div className="oc-panel-section"><PredictionsConfig config={widget.config} onChange={handleChange} allWidgets={widgets} mode="sidebar" /></div>;
}

/* ── Inline wrapper: Point Wheel sidebar panel ── */
function PointWheelPanel({ widgets, saveWidget, addWidget, loading }) {
  const widget = widgets.find(w => w.widget_type === 'point_wheel');
  const handleChange = (newConfig) => { if (widget) saveWidget({ ...widget, config: newConfig }); };
  if (loading) return <div className="oc-panel-loading">Loading…</div>;
  if (!widget) return (
    <div className="oc-empty-panel">
      <h2>🎡 Point Wheel</h2>
      <p>No Point Wheel widget found. Add one to get started.</p>
      <button className="oc-btn-primary" onClick={() => addWidget('point_wheel')}>+ Add Point Wheel Widget</button>
    </div>
  );
  return <div className="oc-panel-section"><PointWheelConfig config={widget.config} onChange={handleChange} allWidgets={widgets} mode="sidebar" /></div>;
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
  const [communityOpen, setCommunityOpen] = useState(false); // widgets | preview
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
    navbar:             ['streamerName', 'motto', 'twitchUsername', 'avatarUrl', 'badgeImage', 'cryptoCoins', 'cryptoDisplayMode', 'ctaText', 'showAvatar', 'showClock', 'showNowPlaying', 'showCrypto', 'showCTA', 'musicSource', 'musicDisplayStyle', 'manualArtist', 'manualTrack', 'spotify_access_token', 'spotify_refresh_token', 'spotify_expires_at'],
    chat:               ['twitchEnabled', 'twitchChannel', 'youtubeEnabled', 'youtubeVideoId', 'youtubeApiKey', 'kickEnabled', 'kickChannelId', 'maxMessages'],
    session_stats:      ['wagered', 'won', 'profit', 'bestWin', 'bestMulti', 'slotsPlayed', 'currency'],
    recent_wins:        ['wins', 'currency'],
    random_slot_picker: ['picking', 'selectedSlot'],
    wheel_of_names:     ['entries', 'spinning', 'winner'],
    placeholder:        ['html'],
    image_slideshow:    ['images', 'caption', 'pauseOnHover'],
    rtp_stats:          ['previewMode'],
    background:         ['imageUrl', 'videoUrl'],
    raid_shoutout:      ['soundUrl', 'showClip', 'showGame', 'showViewers'],
    spotify_now_playing: ['spotify_access_token', 'spotify_refresh_token', 'spotify_expires_at', 'manualArtist', 'manualTrack', 'manualAlbumArt'],
    single_slot:        ['slotName', 'provider', 'imageUrl', 'rtp', 'slotId', 'currency', 'averageMulti', 'bestMulti', 'totalBonuses', 'bestWin', 'lastBet', 'lastPay', 'lastMulti', 'lastWinIndex'],
    bonus_buys:         ['slotName', 'provider', 'imageUrl', 'bonuses', 'startMoney', 'betCost', 'plannedBonuses', 'sessionNumber'],
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

            <div className="oc-sidebar-divider-label">Account</div>

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

            <div className="oc-sidebar-divider-label">Stream Overlay</div>

            {/* Panel tabs */}
            {[
              { key: 'widgets', icon: '🧩', label: 'Widgets', desc: 'Add & configure overlays' },
              { key: 'bonus_hunt', icon: '🎯', label: 'Bonus Hunt', desc: 'Manage hunt sessions' },
              { key: 'tournament', icon: '🏆', label: 'Tournament', desc: 'Run slot battles' },
              { key: 'current_slot', icon: '🎰', label: 'Current Slot', desc: 'Set active slot' },
              { key: 'wheel_of_names', icon: '🎡', label: 'Wheel of Names', desc: 'Spin entries' },
              { key: 'random_slot_picker', icon: '🎲', label: 'Random Slot', desc: 'Pick a random slot' },
              { key: 'single_slot', icon: '🎰', label: 'Single Slot', desc: 'Slot stats & records' },
              { key: 'bonus_buys', icon: '🛒', label: 'Bonus Buys', desc: 'Track bonus buy sessions' },
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

            {/* ─── Community Games dropdown ─── */}
            <div className="oc-sidebar-divider-label">Community</div>
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
              { key: 'point_slot', icon: '🎰', label: 'Point Slot', desc: 'Slot machine with points' },
              { key: 'salty_words', icon: '🧂', label: 'Salty Words', desc: 'Word betting game' },
              { key: 'predictions', icon: '🔮', label: 'Predictions', desc: 'Two-outcome bets' },
              { key: 'point_wheel', icon: '🎡', label: 'Point Wheel', desc: 'Multiplier wheel game' },
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
          {activePanel === 'current_slot' && (
            <CurrentSlotPanel widgets={widgets} saveWidget={saveWidget} addWidget={addWidget} loading={loading} />
          )}
          {activePanel === 'wheel_of_names' && (
            <WheelOfNamesPanel widgets={widgets} saveWidget={saveWidget} addWidget={addWidget} loading={loading} />
          )}
          {activePanel === 'random_slot_picker' && (
            <RandomSlotPickerPanel widgets={widgets} saveWidget={saveWidget} addWidget={addWidget} loading={loading} />
          )}
          {activePanel === 'single_slot' && (
            <SingleSlotPanel widgets={widgets} saveWidget={saveWidget} addWidget={addWidget} loading={loading} />
          )}
          {activePanel === 'bonus_buys' && (
            <BonusBuysPanel widgets={widgets} saveWidget={saveWidget} addWidget={addWidget} loading={loading} />
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
          {activePanel === 'coin_flip' && (
            <CoinFlipPanel widgets={widgets} saveWidget={saveWidget} addWidget={addWidget} loading={loading} />
          )}
          {activePanel === 'point_slot' && (
            <PointSlotPanel widgets={widgets} saveWidget={saveWidget} addWidget={addWidget} loading={loading} />
          )}
          {activePanel === 'salty_words' && (
            <SaltyWordsPanel widgets={widgets} saveWidget={saveWidget} addWidget={addWidget} loading={loading} />
          )}
          {activePanel === 'predictions' && (
            <PredictionsPanel widgets={widgets} saveWidget={saveWidget} addWidget={addWidget} loading={loading} />
          )}
          {activePanel === 'point_wheel' && (
            <PointWheelPanel widgets={widgets} saveWidget={saveWidget} addWidget={addWidget} loading={loading} />
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
