/**
 * usePresets — extracted from OverlayControlCenter.
 * Manages global presets (overlay_state), shared presets (shared_overlay_presets table),
 * and preset load/save/delete operations.
 */
import { useState, useCallback, useEffect } from "react";
import {
  getSharedPresets,
  saveSharedPreset,
  deleteSharedPreset,
} from "../services/overlayService";

/* ── Keys that should never travel inside reusable/shared backups. */
const SECRET_CONFIG_KEYS = new Set([
  "spotify_access_token",
  "spotify_refresh_token",
  "spotify_expires_at",
  "youtubeApiKey",
  "se_jwt_token",
  "accessToken",
  "refreshToken",
  "apiKey",
  "token",
  "secret",
]);

const RUNTIME_CONFIG_KEYS = new Set([
  "spinning",
  "picking",
  "winner",
  "spinningWinner",
  "_openedAt",
]);

const WIDGET_LAYOUT_SNAPSHOT_KEYS = [
  "is_visible",
  "position_x",
  "position_y",
  "width",
  "height",
  "z_index",
  "animation",
  "exit_animation",
];

const WIDGET_FULL_BACKUP_ROW_KEYS = ["label", ...WIDGET_LAYOUT_SNAPSHOT_KEYS];

/* ── Legacy style-preset config keys to SKIP (old presets were style/layout only). ── */
const USER_DATA_KEYS = {
  stats: [
    "totalBet",
    "totalWin",
    "highestWin",
    "highestMulti",
    "sessionProfit",
    "currency",
  ],
  bonus_hunt: [
    "bonuses",
    "huntActive",
    "currency",
    "startMoney",
    "targetMoney",
    "stopLoss",
    "showStatistics",
    "animatedTracker",
    "bonusOpening",
  ],
  current_slot: ["slotName", "provider", "betSize", "imageUrl", "rtp"],
  tournament: [
    "title",
    "prize",
    "active",
    "players",
    "slots",
    "format",
    "data",
  ],
  giveaway: ["title", "prize", "keyword", "isActive", "winner"],
  navbar: [
    "streamerName",
    "motto",
    "twitchUsername",
    "avatarUrl",
    "badgeImage",
    "cryptoCoins",
    "cryptoDisplayMode",
    "ctaText",
    "showAvatar",
    "showClock",
    "showNowPlaying",
    "showCrypto",
    "showCTA",
    "musicSource",
    "musicDisplayStyle",
    "manualArtist",
    "manualTrack",
    "spotify_access_token",
    "spotify_refresh_token",
    "spotify_expires_at",
  ],
  chat: [
    "twitchEnabled",
    "twitchChannel",
    "youtubeEnabled",
    "youtubeVideoId",
    "youtubeApiKey",
    "kickEnabled",
    "kickChannelId",
    "maxMessages",
  ],
  session_stats: [
    "wagered",
    "won",
    "profit",
    "bestWin",
    "bestMulti",
    "slotsPlayed",
    "currency",
  ],
  recent_wins: ["wins", "currency"],
  random_slot_picker: ["picking", "selectedSlot"],
  wheel_of_names: ["entries", "spinning", "winner"],
  placeholder: ["html"],
  image_slideshow: ["images", "caption", "pauseOnHover"],
  rtp_stats: ["previewMode"],
  background: ["imageUrl", "videoUrl"],
  raid_shoutout: ["soundUrl", "showClip", "showGame", "showViewers"],
  spotify_now_playing: [
    "spotify_access_token",
    "spotify_refresh_token",
    "spotify_expires_at",
    "manualArtist",
    "manualTrack",
    "manualAlbumArt",
  ],
  bonus_buys: [
    "slotName",
    "provider",
    "imageUrl",
    "bonuses",
    "startMoney",
    "betCost",
    "plannedBonuses",
    "sessionNumber",
  ],
};

function isSensitiveKey(key) {
  const normalized = String(key || "").toLowerCase();
  return (
    SECRET_CONFIG_KEYS.has(key) ||
    RUNTIME_CONFIG_KEYS.has(key) ||
    normalized.includes("token") ||
    normalized.includes("secret") ||
    normalized.includes("apikey") ||
    normalized.includes("api_key")
  );
}

function clonePlain(value, fallback = null) {
  if (value == null) return fallback;
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(value);
    } catch {
      // Fall through to recursive cloning for plain config/appearance data.
    }
  }
  if (Array.isArray(value)) {
    return value.map((item) => clonePlain(item, item));
  }
  if (value && typeof value === "object") {
    const clone = {};
    for (const [key, childValue] of Object.entries(value)) {
      clone[key] = clonePlain(childValue, childValue);
    }
    return clone;
  }
  return value;
}

function sanitizeConfigValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeConfigValue(item));
  }
  if (value && typeof value === "object") {
    const clean = {};
    for (const [key, childValue] of Object.entries(value)) {
      if (isSensitiveKey(key)) continue;
      const sanitized = sanitizeConfigValue(childValue);
      if (sanitized !== undefined) clean[key] = sanitized;
    }
    return clean;
  }
  return clonePlain(value, value);
}

function sanitizeConfigForBackup(config = {}) {
  return sanitizeConfigValue(config) || {};
}

function snapshotOverlayAppearance(overlayState) {
  return clonePlain(overlayState?.overlayAppearance, null);
}

/** Strip user-data keys from a widget config, keeping only styling/layout */
function stripUserData(widgetType, config) {
  const skip = new Set(USER_DATA_KEYS[widgetType] || []);
  const clean = {};
  for (const [key, value] of Object.entries(config || {})) {
    if (skip.has(key) || isSensitiveKey(key)) continue;
    const sanitized = sanitizeConfigValue(value);
    if (sanitized !== undefined) clean[key] = sanitized;
  }
  return clean;
}

function mergeFullBackupConfig(existingConfig = {}, backupConfig = {}) {
  const merged = sanitizeConfigForBackup(backupConfig);
  for (const [key, value] of Object.entries(existingConfig)) {
    if (isSensitiveKey(key)) merged[key] = clonePlain(value, value);
  }
  return merged;
}

/** Merge preset config into existing config — keep user data, apply styling only */
function mergePresetConfig(widgetType, existingConfig = {}, presetConfig = {}) {
  const skip = new Set(USER_DATA_KEYS[widgetType] || []);
  const merged = clonePlain(existingConfig, { ...existingConfig });
  for (const [key, value] of Object.entries(presetConfig)) {
    if (!skip.has(key)) merged[key] = sanitizeConfigValue(value);
  }
  return merged;
}

function snapshotWidget(widget) {
  const snapshot = {
    id: widget.id,
    widget_type: widget.widget_type,
    config: sanitizeConfigForBackup(widget.config),
  };
  for (const key of WIDGET_FULL_BACKUP_ROW_KEYS) {
    if (Object.hasOwn(widget, key)) snapshot[key] = clonePlain(widget[key], widget[key]);
  }
  return snapshot;
}

function buildPresetWidgetPayload(widget, snap, isFullBackup) {
  const config = isFullBackup
    ? mergeFullBackupConfig(widget.config, snap.config)
    : mergePresetConfig(widget.widget_type, widget.config, snap.config);
  const restored = { ...widget, config };
  const rowKeys = isFullBackup
    ? WIDGET_FULL_BACKUP_ROW_KEYS
    : WIDGET_LAYOUT_SNAPSHOT_KEYS;
  for (const key of rowKeys) {
    if (Object.hasOwn(snap, key)) restored[key] = clonePlain(snap[key], snap[key]);
  }
  return restored;
}

function buildRestoredOverlayAppearance(preset, currentAppearance = {}) {
  const backup = clonePlain(preset?.overlayAppearance, null);
  if (!backup) return null;
  const currentRevision = Number(currentAppearance?.revision || 0);
  return {
    ...backup,
    revision: Math.max(Number(backup.revision || 0), currentRevision) + 1,
    updatedAt: new Date().toISOString(),
    restoredFromBackup: preset?.name || "Widget backup",
  };
}

function findPresetTarget(widgets, snap, claimed) {
  return (
    widgets.find((w) => w.id === snap.id && !claimed.has(w.id)) ||
    widgets.find(
      (w) => w.widget_type === snap.widget_type && !claimed.has(w.id),
    )
  );
}

function sanitizePresetForSharing(preset) {
  return {
    ...preset,
    snapshot: (preset?.snapshot || []).map((snap) => ({
      ...snap,
      config: stripUserData(snap.widget_type, snap.config || {}),
    })),
    fullBackup: false,
  };
}

export default function usePresets({
  user,
  isAdmin,
  overlayState,
  updateState,
  widgets,
  saveWidget,
  addWidget,
}) {
  const globalPresets = overlayState?.globalPresets || [];
  const [presetName, setPresetName] = useState("");
  const [presetMsg, setPresetMsg] = useState("");
  const [sharedPresets, setSharedPresets] = useState([]);

  useEffect(() => {
    getSharedPresets()
      .then(setSharedPresets)
      .catch((err) =>
        console.error("[usePresets] Failed to load shared presets:", err),
      );
  }, []);

  const sharePreset = useCallback(
    async (preset) => {
      if (!user || !isAdmin) return;
      try {
        const safePreset = sanitizePresetForSharing(preset);
        await saveSharedPreset(safePreset.name, safePreset.snapshot, user.id);
        const refreshed = await getSharedPresets();
        setSharedPresets(refreshed);
        setPresetMsg(`"${preset.name}" shared globally!`);
        setTimeout(() => setPresetMsg(""), 2500);
      } catch (err) {
        console.error("[usePresets] share error:", err);
        const msg = err?.message || String(err);
        if (msg.includes("does not exist") || msg.includes("42P01")) {
          setPresetMsg("Run add_shared_overlay_presets.sql migration first!");
        } else {
          setPresetMsg(`Share failed: ${msg.slice(0, 60)}`);
        }
        setTimeout(() => setPresetMsg(""), 5000);
      }
    },
    [user, isAdmin],
  );

  const unsharePreset = useCallback(
    async (sharedId) => {
      if (!isAdmin) return;
      try {
        await deleteSharedPreset(sharedId);
        setSharedPresets((prev) => prev.filter((p) => p.id !== sharedId));
        setPresetMsg("Removed shared preset");
        setTimeout(() => setPresetMsg(""), 2500);
      } catch (err) {
        console.error("[usePresets] unshare error:", err);
      }
    },
    [isAdmin],
  );

  const saveGlobalPreset = useCallback(async () => {
    const name = presetName.trim();
    if (!name || widgets.length === 0) return;
    const snapshot = widgets.map(snapshotWidget);
    const entry = {
      name,
      snapshot,
      overlayAppearance: snapshotOverlayAppearance(overlayState),
      savedAt: Date.now(),
      fullBackup: true,
      version: 3,
    };
    const existing = [...globalPresets];
    const idx = existing.findIndex((p) => p.name === name);
    const updated =
      idx >= 0
        ? existing.map((p, i) => (i === idx ? entry : p))
        : [...existing, entry];
    await updateState({ globalPresets: updated });
    setPresetName("");
    setPresetMsg("Saved!");
    setTimeout(() => setPresetMsg(""), 2000);
  }, [presetName, widgets, globalPresets, overlayState, updateState]);

  const loadGlobalPreset = useCallback(
    async (preset) => {
      if (!preset?.snapshot) return;
      const isFullBackup = preset.fullBackup === true;

      // Track which local widgets have been claimed so we don't double-match
      const claimed = new Set();

      for (const snap of preset.snapshot) {
        const target = findPresetTarget(widgets, snap, claimed);

        if (target) {
          claimed.add(target.id);
          await saveWidget(
            buildPresetWidgetPayload(target, snap, isFullBackup),
          );
        } else {
          // 3) Widget type doesn't exist yet — create it with merged config
          const created = await addWidget(snap.widget_type, {});
          if (created) {
            await saveWidget(
              buildPresetWidgetPayload(created, snap, isFullBackup),
            );
          }
        }
      }
      if (isFullBackup) {
        const widgetIdsInBackup = new Set(
          preset.snapshot.map((snap) => snap.id).filter(Boolean),
        );
        const widgetsToHide = widgets.filter(
          (widget) =>
            !claimed.has(widget.id) &&
            !widgetIdsInBackup.has(widget.id) &&
            widget.is_visible !== false,
        );
        await Promise.all(
          widgetsToHide.map((widget) =>
            saveWidget({ ...widget, is_visible: false }),
          ),
        );

        const restoredAppearance = buildRestoredOverlayAppearance(
          preset,
          overlayState?.overlayAppearance,
        );
        if (restoredAppearance) {
          await updateState({ overlayAppearance: restoredAppearance });
        }
      }
      setPresetMsg("Loaded!");
      setTimeout(() => setPresetMsg(""), 2000);
    },
    [widgets, saveWidget, addWidget, overlayState, updateState],
  );

  const deleteGlobalPreset = useCallback(
    async (name) => {
      const updated = globalPresets.filter((p) => p.name !== name);
      await updateState({ globalPresets: updated });
    },
    [globalPresets, updateState],
  );

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
