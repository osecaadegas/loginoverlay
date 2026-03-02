/**
 * usePresets — extracted from OverlayControlCenter.
 * Manages global presets (overlay_state), shared presets (shared_overlay_presets table),
 * and preset load/save/delete operations.
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import { getSharedPresets, saveSharedPreset, deleteSharedPreset } from '../services/overlayService';

/* ── User-data config keys to SKIP in presets (per widget type).
   Only styling/layout/color keys get saved & applied; user content stays individual. ── */
const USER_DATA_KEYS = {
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
};

/** Strip user-data keys from a widget config, keeping only styling/layout */
function stripUserData(widgetType, config) {
  const skip = new Set(USER_DATA_KEYS[widgetType] || []);
  const clean = {};
  for (const [key, value] of Object.entries(config || {})) {
    if (!skip.has(key)) clean[key] = value;
  }
  return clean;
}

/** Merge preset config into existing config — keep user data, apply styling only */
function mergePresetConfig(widgetType, existingConfig, presetConfig) {
  const skip = new Set(USER_DATA_KEYS[widgetType] || []);
  const merged = { ...(existingConfig || {}) };
  for (const [key, value] of Object.entries(presetConfig || {})) {
    if (!skip.has(key)) merged[key] = value;
  }
  return merged;
}

export default function usePresets({ user, isAdmin, overlayState, updateState, widgets, saveWidget, addWidget }) {
  const globalPresets = overlayState?.globalPresets || [];
  const [presetName, setPresetName] = useState('');
  const [presetMsg, setPresetMsg] = useState('');
  const [sharedPresets, setSharedPresets] = useState([]);

  useEffect(() => {
    getSharedPresets()
      .then(setSharedPresets)
      .catch(err => console.error('[usePresets] Failed to load shared presets:', err));
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
      console.error('[usePresets] share error:', err);
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
      console.error('[usePresets] unshare error:', err);
    }
  }, [isAdmin]);

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
  }, [presetName, widgets, globalPresets, updateState]);

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
  }, [widgets, saveWidget, addWidget]);

  const deleteGlobalPreset = useCallback(async (name) => {
    const updated = globalPresets.filter(p => p.name !== name);
    await updateState({ globalPresets: updated });
  }, [globalPresets, updateState]);

  return {
    globalPresets,
    sharedPresets,
    presetName,
    setPresetName,
    presetMsg,
    saveGlobalPreset,
    loadGlobalPreset,
    deleteGlobalPreset,
    sharePreset,
    unsharePreset,
  };
}
