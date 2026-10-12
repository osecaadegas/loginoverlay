import {
  createBetterInstance,
  normalizeBetterLayout,
  stripBetterRuntimeData,
} from "./betterWidgetRegistry";

export const SHARED_OVERLAY_TEMPLATE_VERSION = 1;

const BLOCKED_KEYS = new Set(
  [
    "accessToken",
    "apiKey",
    "authToken",
    "avatarImageUrl",
    "avatarUrl",
    "betters",
    "bets",
    "betsHistory",
    "bonusOpening",
    "bonuses",
    "bracketData",
    "bracketHistory",
    "bracketPhase",
    "bracketPlayers",
    "bracketUsage",
    "broadcasterId",
    "channelId",
    "channelLogin",
    "clientSecret",
    "currentSlot",
    "discordInvite",
    "discordTag",
    "discordUrl",
    "email",
    "entries",
    "entriesCount",
    "huntActive",
    "instagramUsername",
    "jwtToken",
    "kickChannel",
    "kickChannelId",
    "messages",
    "overlayToken",
    "participants",
    "password",
    "pendingRequests",
    "profileAvatarUrl",
    "providerId",
    "refreshToken",
    "requests",
    "secret",
    "sessionState",
    "slot",
    "slotId",
    "slotName",
    "slotRequestQueue",
    "slotRequests",
    "spinningWinner",
    "spotifyAccessToken",
    "spotifyRefreshToken",
    "startBalance",
    "startMoney",
    "startValue",
    "streamerAvatar",
    "streamerName",
    "targetMoney",
    "tiktokUsername",
    "token",
    "twitchBroadcasterId",
    "twitchChannel",
    "twitchId",
    "twitchLogin",
    "twitchUserId",
    "twitchUsername",
    "twitterUsername",
    "userId",
    "webhookUrl",
    "winner",
    "winnerLabel",
    "winnerOption",
    "xUsername",
    "youtubeApiKey",
    "youtubeChannel",
    "youtubeVideoId",
  ].map(normalizeKey),
);

const EXTERNAL_MEDIA_KEY =
  /(?:avatar|background|banner|image|logo|media|profile|source|thumbnail|video).*(?:src|url)$|^(?:src|url)$/i;

function normalizeKey(key) {
  return String(key || "").replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function isExternalMedia(value) {
  return /^(?:https?:|data:|blob:)/i.test(String(value || "").trim());
}

function sanitizeValue(value, key = "") {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item)).filter((item) => item !== undefined);
  }
  if (value && typeof value === "object") {
    const next = {};
    for (const [childKey, childValue] of Object.entries(value)) {
      const normalizedKey = normalizeKey(childKey);
      if (
        BLOCKED_KEYS.has(normalizedKey) ||
        /(?:apikey|authtoken|accesstoken|refreshtoken|clientsecret|password|credential|jwttoken)$/.test(
          normalizedKey,
        )
      ) {
        continue;
      }
      const clean = sanitizeValue(childValue, childKey);
      if (clean !== undefined) next[childKey] = clean;
    }
    return next;
  }
  if (typeof value === "string" && EXTERNAL_MEDIA_KEY.test(key) && isExternalMedia(value)) {
    return "";
  }
  return value;
}

export function createShareableBetterLayout(layout) {
  const normalized = normalizeBetterLayout(layout);
  return normalizeBetterLayout({
    ...normalized,
    instances: normalized.instances.map((instance) => ({
      ...instance,
      config: sanitizeValue(
        stripBetterRuntimeData(instance.widgetType, instance.config || {}),
      ),
    })),
    updatedAt: new Date().toISOString(),
  });
}

export function cloneSharedBetterLayout(layout, name) {
  const normalized = normalizeBetterLayout(layout);
  const instances = normalized.instances
    .map((instance) =>
      createBetterInstance(instance.widgetType, {
        ...instance,
        instanceId: undefined,
        config: cloneJson(instance.config || {}),
      }),
    )
    .filter(Boolean);
  return normalizeBetterLayout({
    ...normalized,
    name: `${String(name || normalized.name || "Community overlay").trim()} Copy`.slice(
      0,
      80,
    ),
    instances,
    updatedAt: new Date().toISOString(),
  });
}

export function summarizeSharedBetterLayout(layout) {
  const normalized = normalizeBetterLayout(layout);
  const visible = normalized.instances.filter(
    (instance) => instance.visible !== false && instance.widgetType !== "background",
  );
  return {
    preview: normalized.preview || [],
    widgetTypes: [...new Set(visible.map((instance) => instance.widgetType))],
  };
}
