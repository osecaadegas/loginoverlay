import React, { useEffect, useRef, useState, useCallback } from "react";
import useTwitchChat from "../../../hooks/useTwitchChat";
import useKickChat from "../../../hooks/useKickChat";
import useTwitchChannel from "../../../hooks/useTwitchChannel";
import {
  appearanceAttrs,
  subElementStyle,
  subValue,
} from "./shared/appearanceStyles";
import {
  brushedMetalBackground,
  metalBorderColor,
  metalSurfaceShadow,
} from "./shared/metalTexture";
import {
  STYLE_SECA,
  resolveStyleSecaValue,
  styleSecaHeaderGradient,
  styleSecaSurfaceGradient,
} from "./shared/styleSecaTheme";
import { resolveBonusHuntSyncedColors } from "./shared/bonusHuntColorSync";

/* ─── Platform helpers ─── */
const PLATFORM_META = {
  twitch: { label: "Twitch", icon: "T", color: "#64748b" },
  youtube: { label: "YouTube", icon: "Y", color: "#ef4444" },
  kick: { label: "Kick", icon: "K", color: "#22c55e" },
};

/* ─── Twitch badge pills (Cards style) ─── */
const BADGE_DEFS = [
  { key: "isBroadcaster", label: "HOST", bg: "#dc2626", icon: "🏠" },
  { key: "isMod", label: "MOD", bg: "#16a34a", icon: "⚔" },
  { key: "isVip", label: "VIP", bg: "#7c3aed", icon: "💎" },
  { key: "isSub", label: "SUB", bg: "#ca8a04", icon: "⭐" },
  { key: "isFirstMsg", label: "NEW", bg: "#0ea5e9", icon: "✨" },
];

const MESSAGE_TTL_MS = 120 * 1000;
const HIDDEN_BOTS = new Set(["streamelements", "nightbot", "moobot"]);
const HEADER_CHAT_STYLES = new Set([
  "classic",
  "cards",
  "metal",
  "glow_panel",
  "StyleSecaChat",
  "bh_stats",
]);
const BADGE_CHAT_STYLES = new Set([
  "classic",
  "metal",
  "glow_panel",
  "StyleSecaChat",
  "bh_stats",
]);
const CHAT_PLATFORMS = ["twitch", "youtube", "kick"];

const CHAT_STYLE_DEFAULTS = {
  textColor: {
    StyleSecaChat: STYLE_SECA.text,
    metal: "#d4d8e0",
    glow_panel: "#dbeafe",
    bh_stats: "#f1f5f9",
    default: "#e2e8f0",
  },
  headerBg: {
    StyleSecaChat: styleSecaHeaderGradient,
    metal:
      "linear-gradient(160deg, rgba(180,185,195,0.12) 0%, rgba(120,125,135,0.06) 100%)",
    glow_panel: "rgba(2,12,25,0.82)",
    bh_stats: "rgba(255,255,255,0.04)",
    default: "rgba(30,41,59,0.5)",
  },
  headerText: {
    StyleSecaChat: STYLE_SECA.text,
    metal: "#a8b0c0",
    glow_panel: "#22d3ee",
    bh_stats: "#64748b",
    default: "#94a3b8",
  },
  messageRadius: {
    StyleSecaChat: 10,
    metal: 10,
    glow_panel: 8,
    bh_stats: 14,
    default: 12,
  },
  containerRadius: {
    StyleSecaChat: 12,
    metal: 10,
    glow_panel: 8,
    bh_stats: 14,
    default: 12,
  },
  messageBorderColor: {
    StyleSecaChat: STYLE_SECA.border,
    metal: "rgba(200,210,225,0.18)",
    glow_panel: "rgba(34,211,238,0.22)",
    bh_stats: "rgba(255,255,255,0.06)",
    default: "rgba(51,65,85,0.5)",
  },
  containerBorderColor: {
    StyleSecaChat: STYLE_SECA.border,
    metal: "rgba(200,210,225,0.18)",
    glow_panel: "rgba(34,211,238,0.26)",
    bh_stats: "rgba(255,255,255,0.06)",
    default: "rgba(51,65,85,0.5)",
  },
};

function resolveChatStyleDefault(chatStyle, key) {
  const defaults = CHAT_STYLE_DEFAULTS[key] || {};
  const value = Object.hasOwn(defaults, chatStyle)
    ? defaults[chatStyle]
    : defaults.default;
  return typeof value === "function" ? value() : value;
}

function resolveChatFontFamily(chatStyle, configuredFontFamily) {
  if (chatStyle === "StyleSecaChat") {
    return "'Rajdhani', 'Barlow Condensed', sans-serif";
  }
  if (chatStyle === "bh_stats") return "'Poppins', sans-serif";
  return configuredFontFamily || "'Inter', sans-serif";
}

function resolveOptionalStyleSecaValue(isStyleSeca, value, fallback) {
  if (isStyleSeca) return resolveStyleSecaValue(value, fallback);
  return value;
}

function shouldShowChatHeader(chatStyle, config) {
  return HEADER_CHAT_STYLES.has(chatStyle) && config.showHeader !== false;
}

function shouldShowChatLegend(chatStyle, config) {
  return chatStyle === "classic" && config.showLegend !== false;
}

function shouldShowChatBadges(chatStyle, config) {
  return BADGE_CHAT_STYLES.has(chatStyle) && config.showBadges !== false;
}

function getEnabledChatPlatforms(config) {
  return CHAT_PLATFORMS.filter((platform) => config[`${platform}Enabled`]);
}

function buildChatFilterStyle(brightness, contrast, saturation) {
  if (brightness === 100 && contrast === 100 && saturation === 100)
    return undefined;
  return `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
}

function resolveChatContainerBorder({
  isMetal,
  isBH,
  isTransparent,
  containerBorderWidth,
  containerBorderColor,
}) {
  if (isMetal) return `${containerBorderWidth}px solid ${containerBorderColor}`;
  if (isBH) return "1px solid rgba(255,255,255,0.06)";
  if (containerBorderWidth && !isTransparent) {
    return `${containerBorderWidth}px solid ${containerBorderColor}`;
  }
  return "none";
}

function resolveChatRootStyle({
  isMetal,
  isStyleSeca,
  isGlowPanel,
  style,
  bgColor,
  headerText,
  containerBorderWidth,
  containerBorderColor,
}) {
  if (isMetal) {
    return {
      ...style,
      background: brushedMetalBackground(
        style.background || bgColor,
        headerText,
        {
          highlightOpacity: 0.06,
          grainOpacity: 0.03,
        },
      ),
      borderColor: style.borderColor || metalBorderColor(headerText, 0.24),
      boxShadow: style.boxShadow || metalSurfaceShadow(headerText, 0.9),
    };
  }
  if (isStyleSeca) {
    return {
      ...style,
      background: resolveStyleSecaValue(style.background, bgColor),
      border: `${containerBorderWidth}px solid ${containerBorderColor}`,
      boxShadow:
        style.boxShadow ||
        `0 18px 42px rgba(0,0,0,0.32), 0 0 28px ${STYLE_SECA.glow}`,
    };
  }
  if (isGlowPanel) {
    return {
      ...style,
      background: style.background || bgColor,
      border: `${containerBorderWidth}px solid ${containerBorderColor}`,
      boxShadow:
        style.boxShadow ||
        "0 0 18px rgba(34,211,238,0.14), inset 0 1px 0 rgba(255,255,255,0.05)",
    };
  }
  return style;
}

function normalizedUsername(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isRecentChatMessage(item, now) {
  return now - (Number(item.timestamp) || now) < MESSAGE_TTL_MS;
}

function pruneExpiredChatMessages(items, now) {
  return items.filter((item) => isRecentChatMessage(item, now));
}

function isFollowerMessage(msg = {}) {
  const type = String(
    msg.type || msg.eventType || msg.systemType || msg.noticeType || "",
  ).toLowerCase();
  const message = String(msg.message || "").toLowerCase();
  return Boolean(
    msg.isFollower ||
    msg.isNewFollower ||
    msg.isFollow ||
    msg.isFollowEvent ||
    type === "follow" ||
    type === "follower" ||
    type === "new_follower" ||
    message.includes("new follower") ||
    message.includes("just followed") ||
    message.includes("followed the channel"),
  );
}

function twitchAvatarProxyUrl(username) {
  const login = normalizedUsername(username);
  return login ? `https://unavatar.io/twitch/${encodeURIComponent(login)}` : "";
}

function messageAvatarUrl(msg = {}) {
  return (
    msg.avatarUrl ||
    msg.profileImageUrl ||
    msg.profile_image_url ||
    msg.userAvatar ||
    msg.photoUrl ||
    (msg.platform === "twitch" ? twitchAvatarProxyUrl(msg.username) : "")
  );
}

function partAttrs(partId) {
  return appearanceAttrs({
    widgetType: "chat",
    elementId: partId,
  });
}

function ChatAvatar({ msg, fallback, className, style }) {
  const [failed, setFailed] = useState(false);
  const src = failed ? "" : messageAvatarUrl(msg);
  return (
    <span
      {...partAttrs("avatar")}
      className={className}
      style={{ overflow: "hidden", ...style }}
    >
      {src ? (
        <img
          src={src}
          alt={`${msg.username || "user"} avatar`}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      ) : (
        fallback
      )}
    </span>
  );
}

function TwitchBadges({ msg, config }) {
  return BADGE_DEFS.filter((b) => msg[b.key]).map((b) => (
    <span
      key={b.key}
      className="ov-cards-badge"
      {...partAttrs("badge")}
      style={subElementStyle(config, "badge", { background: b.bg })}
    >
      <span className="ov-cards-badge-icon">{b.icon}</span> {b.label}
    </span>
  ));
}

/* ─── YouTube live chat polling ─── */
function useYoutubeChat(videoId, apiKey, onMessage) {
  const chatIdRef = useRef(null);
  const pageTokenRef = useRef("");
  const timerRef = useRef(null);

  useEffect(() => {
    if (!videoId || !apiKey) return;

    async function fetchChatId() {
      try {
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoId}&key=${apiKey}`,
        );
        const data = await res.json();
        chatIdRef.current =
          data?.items?.[0]?.liveStreamingDetails?.activeLiveChatId || null;
        if (chatIdRef.current) poll();
      } catch {
        /* silent */
      }
    }

    async function poll() {
      if (!chatIdRef.current) return;
      try {
        const url =
          `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${chatIdRef.current}&part=snippet,authorDetails&key=${apiKey}` +
          (pageTokenRef.current ? `&pageToken=${pageTokenRef.current}` : "");
        const res = await fetch(url);
        const data = await res.json();
        pageTokenRef.current = data.nextPageToken || "";
        (data.items || []).forEach((item) => {
          onMessage({
            id: item.id,
            platform: "youtube",
            username: item.authorDetails?.displayName || "Unknown",
            message: item.snippet?.displayMessage || "",
            color: "",
            timestamp: Date.now(),
          });
        });
        timerRef.current = setTimeout(
          poll,
          Math.max(data.pollingIntervalMillis || 5000, 4000),
        );
      } catch {
        timerRef.current = setTimeout(poll, 8000);
      }
    }

    fetchChatId();
    return () => clearTimeout(timerRef.current);
  }, [videoId, apiKey, onMessage]);
}

/* ─── Main Widget ─── */
function ChatWidget({ config, theme, allWidgets }) {
  const c = config || {};
  const [messages, setMessages] = useState([]);
  const scrollRef = useRef(null);
  const maxMessages = c.maxMessages || 50;
  const chatStyle = c.chatStyle || "classic";
  const isMetal = chatStyle === "metal";
  const isGlowPanel = chatStyle === "glow_panel";
  const isBH = chatStyle === "bh_stats";
  const isStyleSeca = chatStyle === "StyleSecaChat";
  const styleSecaValue = (value, fallback) =>
    resolveOptionalStyleSecaValue(isStyleSeca, value, fallback);
  const syncedBonusHuntColors = resolveBonusHuntSyncedColors(c, allWidgets);
  const syncedPrimaryColor = syncedBonusHuntColors?.primaryColor;
  const syncedSecondaryColor = syncedBonusHuntColors?.secondaryColor;
  const defaultTextColor = resolveChatStyleDefault(chatStyle, "textColor");
  const defaultHeaderBg = resolveChatStyleDefault(chatStyle, "headerBg");
  const defaultHeaderText = resolveChatStyleDefault(chatStyle, "headerText");
  const defaultMessageRadius = resolveChatStyleDefault(
    chatStyle,
    "messageRadius",
  );
  const defaultContainerRadius = resolveChatStyleDefault(
    chatStyle,
    "containerRadius",
  );
  const defaultMessageBorderColor = resolveChatStyleDefault(
    chatStyle,
    "messageBorderColor",
  );
  const defaultContainerBorderColor = resolveChatStyleDefault(
    chatStyle,
    "containerBorderColor",
  );

  /* Style config */
  const textColor = styleSecaValue(
    subValue(
      c,
      "messageText",
      "textColor",
      subValue(c, "message", "textColor", c.textColor || defaultTextColor),
    ),
    STYLE_SECA.text,
  );
  const headerBg =
    syncedSecondaryColor ||
    styleSecaValue(
      subValue(c, "header", "background", c.headerBg || defaultHeaderBg),
      styleSecaHeaderGradient(),
    );
  const headerText =
    syncedPrimaryColor ||
    styleSecaValue(
      subValue(c, "header", "textColor", c.headerText || defaultHeaderText),
      STYLE_SECA.text,
    );
  const fontFamily = subValue(
    c,
    "container",
    "fontFamily",
    subValue(
      c,
      "messageText",
      "fontFamily",
      subValue(
        c,
        "message",
        "fontFamily",
        resolveChatFontFamily(chatStyle, c.fontFamily),
      ),
    ),
  );
  const fontSize = subValue(
    c,
    "container",
    "fontSize",
    subValue(
      c,
      "messageText",
      "fontSize",
      subValue(c, "message", "fontSize", c.fontSize || 15),
    ),
  );
  const msgSpacing = subValue(
    c,
    "messageList",
    "gap",
    subValue(c, "message", "gap", c.msgSpacing ?? 2),
  );
  const borderRadius = subValue(
    c,
    "message",
    "radius",
    c.borderRadius ?? defaultMessageRadius,
  );
  const borderWidth = subValue(c, "message", "borderWidth", c.borderWidth ?? 1);
  const borderColor =
    syncedPrimaryColor ||
    styleSecaValue(
      subValue(
        c,
        "message",
        "borderColor",
        c.borderColor || defaultMessageBorderColor,
      ),
      STYLE_SECA.border,
    );
  const containerRadius = subValue(
    c,
    "container",
    "radius",
    c.borderRadius ?? defaultContainerRadius,
  );
  const containerBorderWidth = subValue(
    c,
    "container",
    "borderWidth",
    c.borderWidth ?? 1,
  );
  const containerBorderColor =
    syncedPrimaryColor ||
    styleSecaValue(
      subValue(
        c,
        "container",
        "borderColor",
        c.borderColor || defaultContainerBorderColor,
      ),
      STYLE_SECA.border,
    );
  const nameBold = c.nameBold ?? true;
  const msgLineHeight = subValue(
    c,
    "messageText",
    "lineHeight",
    subValue(c, "message", "lineHeight", c.msgLineHeight ?? 1.45),
  );
  const msgPadH = subValue(c, "message", "padding", c.msgPadH ?? 10);
  const messageBg =
    syncedSecondaryColor ||
    styleSecaValue(
      subValue(
        c,
        "message",
        "background",
        c.cardBg || (isStyleSeca ? STYLE_SECA.cardSurface : "transparent"),
      ),
      STYLE_SECA.cardSurface,
    );
  const usernameColor =
    syncedPrimaryColor || subValue(c, "username", "textColor", headerText);
  const avatarBg =
    syncedSecondaryColor ||
    styleSecaValue(
      subValue(
        c,
        "avatar",
        "background",
        isStyleSeca ? STYLE_SECA.secondarySurface : "rgba(255,255,255,0.04)",
      ),
      STYLE_SECA.secondarySurface,
    );
  const avatarText = subValue(c, "avatar", "textColor", usernameColor);
  const avatarBorder = subValue(c, "avatar", "borderColor", borderColor);
  const badgeBg =
    syncedPrimaryColor ||
    styleSecaValue(
      subValue(
        c,
        "badge",
        "background",
        isStyleSeca ? STYLE_SECA.primary : "rgba(129,140,248,0.15)",
      ),
      STYLE_SECA.primary,
    );
  const badgeText = subValue(
    c,
    "badge",
    "textColor",
    isStyleSeca ? STYLE_SECA.darkText : usernameColor,
  );

  /* Style-specific bg defaults */
  const bgDefaults = {
    classic: "rgba(15,23,42,0.95)",
    floating: "transparent",
    bubble: "rgba(15,18,30,0.9)",
    stack: "transparent",
    typewriter: "rgba(0,8,0,0.92)",
    sidebar: "rgba(10,12,20,0.9)",
    cards: "rgba(18,10,35,0.95)",
    metal: "linear-gradient(145deg, #2a2d33 0%, #1a1c20 40%, #2e3238 100%)",
    glow_panel: "rgba(2,8,18,0.94)",
    StyleSecaChat: styleSecaSurfaceGradient(),
    bh_stats: "rgba(15, 23, 42, 0.9)",
  };
  const bgColor =
    syncedSecondaryColor ||
    styleSecaValue(
      subValue(
        c,
        "container",
        "background",
        c.bgColor || bgDefaults[chatStyle] || bgDefaults.classic,
      ),
      styleSecaSurfaceGradient(),
    );

  /* Which features each style shows */
  const showHeader = shouldShowChatHeader(chatStyle, c);
  const showLegend = shouldShowChatLegend(chatStyle, c);
  const showBadges = shouldShowChatBadges(chatStyle, c);

  const handleMessage = useCallback(
    (msg) => {
      const now = Date.now();
      if (HIDDEN_BOTS.has(normalizedUsername(msg.username))) return;
      const stampedMessage = {
        ...msg,
        timestamp: Number(msg.timestamp) || now,
      };
      setMessages((prev) => {
        const recent = pruneExpiredChatMessages(prev, now);
        const next = [...recent, stampedMessage];
        return next.length > maxMessages ? next.slice(-maxMessages) : next;
      });
    },
    [maxMessages],
  );

  useEffect(() => {
    const intervalId = setInterval(() => {
      const now = Date.now();
      setMessages((prev) => pruneExpiredChatMessages(prev, now));
    }, 5000);
    return () => clearInterval(intervalId);
  }, []);

  /* Connect to enabled platforms */
  const autoChannel = useTwitchChannel();
  const resolvedTwitchChannel = c.twitchChannel || autoChannel || "";
  useTwitchChat(c.twitchEnabled ? resolvedTwitchChannel : "", handleMessage, {
    parseRaids: true,
  });
  useYoutubeChat(
    c.youtubeEnabled ? c.youtubeVideoId : "",
    c.youtubeEnabled ? c.youtubeApiKey : "",
    handleMessage,
  );
  useKickChat(c.kickEnabled ? c.kickChannelId : "", handleMessage);

  /* Auto-scroll */
  const previewMessages = Array.isArray(c.__appearancePreviewMessages)
    ? c.__appearancePreviewMessages
    : [];
  const renderMessages = messages.length > 0 ? messages : previewMessages;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [renderMessages]);

  const enabledPlatforms = getEnabledChatPlatforms(c);
  const chatHeaderName = (
    c.streamerName ||
    c.displayName ||
    c.twitchDisplayName ||
    c.twitchChannel ||
    autoChannel ||
    "STREAMER"
  )
    .toString()
    .trim();

  const brightness = subValue(
    c,
    "container",
    "brightness",
    c.brightness ?? 100,
  );
  const contrast = subValue(c, "container", "contrast", c.contrast ?? 100);
  const saturation = subValue(
    c,
    "container",
    "saturation",
    c.saturation ?? 100,
  );
  const filterStyle = buildChatFilterStyle(brightness, contrast, saturation);

  const headerPartStyle = (fallback = {}) =>
    subElementStyle(c, "header", fallback);
  const messageListStyle = (fallback = {}) =>
    subElementStyle(c, "messageList", fallback);
  const messagePartStyle = (fallback = {}) =>
    subElementStyle(c, "message", fallback);
  const messageTextStyle = (fallback = {}) =>
    subElementStyle(c, "messageText", fallback);
  const usernameStyle = (fallback = {}) =>
    subElementStyle(c, "username", fallback);
  const avatarStyle = (fallback = {}) => subElementStyle(c, "avatar", fallback);
  const badgeStyle = (fallback = {}) => subElementStyle(c, "badge", fallback);
  const legendStyle = (fallback = {}) =>
    subElementStyle(c, "platformLegend", fallback);
  const styleSecaStyle = (styleObject, fallbackBackground) => {
    if (!isStyleSeca) return styleObject;
    return {
      ...styleObject,
      background: styleSecaValue(styleObject?.background, fallbackBackground),
    };
  };

  /* ── Base wrapper style ── */
  const isTransparent = chatStyle === "floating" || chatStyle === "stack";
  const containerBorder = resolveChatContainerBorder({
    isMetal,
    isBH,
    isTransparent,
    containerBorderWidth,
    containerBorderColor,
  });
  const style = subElementStyle(c, "container", {
    width: "100%",
    height: "100%",
    background: bgColor,
    border: containerBorder,
    borderRadius: isTransparent ? 0 : `${containerRadius}px`,
    fontFamily,
    fontSize: `${fontSize}px`,
    color: textColor,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    filter: filterStyle,
    ...(isStyleSeca && {
      WebkitFontSmoothing: "antialiased",
      MozOsxFontSmoothing: "grayscale",
    }),
    ...(isBH && {
      WebkitFontSmoothing: "antialiased",
      MozOsxFontSmoothing: "grayscale",
    }),
    ...(isMetal && {
      boxShadow:
        "0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
    }),
    /* Cards CSS vars — synced from config */
    "--chat-card-bg": messageBg || c.cardBg || "rgba(20,15,40,0.85)",
    "--chat-card-border": borderColor || c.cardBorder || "rgba(100,70,180,0.2)",
    "--chat-card-hover-bg": c.cardHoverBg || "rgba(30,22,55,0.95)",
    "--chat-card-hover-border": c.cardHoverBorder || "rgba(120,80,200,0.3)",
    "--chat-card-text": textColor || c.cardTextColor || "#e2e8f0",
    "--chat-header-bg": headerBg,
    "--chat-header-border":
      c.headerBorder || borderColor || "rgba(100,70,180,0.15)",
    "--chat-header-label": headerText,
    "--chat-header-channel": c.headerChannelColor || "#d1d5db",
    "--chat-message-bg": messageBg,
    "--chat-message-text": textColor,
    "--chat-message-radius": `${borderRadius}px`,
    "--chat-username": usernameColor,
    "--chat-badge-bg": badgeBg,
    "--chat-badge-text": badgeText,
  });
  const rootStyle = resolveChatRootStyle({
    isMetal,
    isStyleSeca,
    isGlowPanel,
    style,
    bgColor,
    headerText,
    containerBorderWidth,
    containerBorderColor,
  });

  const messageRenderContext = {
    config: c,
    chatStyle,
    msgSpacing,
    msgPadH,
    messageBg,
    borderRadius,
    borderWidth,
    borderColor,
    styleSecaStyle,
    avatarStyle,
    headerText,
    avatarBg,
    avatarBorder,
    avatarText,
    usernameColor,
    textColor,
    msgLineHeight,
    nameBold,
    badgeStyle,
    badgeText,
    badgeBg,
    showBadges,
    messagePartStyle,
    messageTextStyle,
    usernameStyle,
    totalMessages: renderMessages.length,
  };

  const modeClass = ` ov-chat-widget--${chatStyle}`;

  return (
    <div
      className={`ov-chat-widget${modeClass}`}
      {...partAttrs("container")}
      style={rootStyle}
    >
      <style>{`
        @keyframes ov-float-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes ov-pop-in{from{opacity:0;transform:scale(0.8) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes ov-slide-left{from{opacity:0;transform:translateX(-16px)}to{opacity:1;transform:translateX(0)}}
        @keyframes ov-cursor-blink{0%,50%{opacity:1}51%,100%{opacity:0}}
        @keyframes ov-live-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(1.2)}}
        @keyframes ov-seca-highlight-glow{0%,100%{box-shadow:0 0 14px rgba(69,124,255,.28), inset 0 1px 0 rgba(255,255,255,.08)}50%{box-shadow:0 0 26px rgba(242,184,75,.46), inset 0 1px 0 rgba(255,255,255,.12)}}
      `}</style>

      {showHeader && chatStyle === "cards" && (
        <div
          className="ov-cards-header"
          {...partAttrs("header")}
          style={headerPartStyle()}
        >
          <div className="ov-cards-header-left">
            <span className="ov-cards-live-dot" {...partAttrs("badge")} />
            <span className="ov-cards-header-label" {...partAttrs("header")}>
              CHAT
            </span>
          </div>
          <span className="ov-cards-header-channel" {...partAttrs("header")}>
            {c.twitchChannel || autoChannel
              ? (c.twitchChannel || autoChannel).toUpperCase()
              : "CHANNEL"}
          </span>
        </div>
      )}

      {showHeader && chatStyle === "metal" && (
        <div
          {...partAttrs("header")}
          style={headerPartStyle({
            padding: "8px 14px",
            background: brushedMetalBackground(headerBg, headerText, {
              highlightOpacity: 0.05,
              grainOpacity: 0.025,
            }),
            borderBottom: `1px solid ${metalBorderColor(headerText, 0.26)}`,
            display: "flex",
            alignItems: "center",
            gap: 8,
          })}
        >
          <span
            {...partAttrs("header")}
            style={{
              fontSize: "0.85em",
              fontWeight: 800,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: headerText,
            }}
          >
            LIVE CHAT
          </span>
          <span
            {...partAttrs("badge")}
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: "0.78em",
              fontWeight: 700,
              color: badgeText,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: badgeText,
                boxShadow: `0 0 6px ${badgeText}`,
                display: "inline-block",
                animation: "ov-live-pulse 2s ease-in-out infinite",
              }}
            />
            <span>Live</span>
          </span>
        </div>
      )}

      {showHeader && chatStyle === "glow_panel" && (
        <div
          {...partAttrs("header")}
          style={headerPartStyle({
            padding: "9px 14px",
            background: headerBg,
            borderBottom: `${containerBorderWidth}px solid ${containerBorderColor}`,
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow:
              "0 1px 0 rgba(255,255,255,0.04), 0 8px 18px rgba(2,8,18,0.28)",
          })}
        >
          <span
            {...partAttrs("badge")}
            style={badgeStyle({
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: headerText,
              boxShadow: `0 0 10px ${headerText}`,
              display: "inline-block",
            })}
          />
          <span
            {...partAttrs("header")}
            style={{
              fontSize: "0.78em",
              fontWeight: 900,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: headerText,
              textShadow: `0 0 8px ${headerText}66`,
            }}
          >
            CHAT
          </span>
        </div>
      )}

      {showHeader && chatStyle === "StyleSecaChat" && (
        <div
          {...partAttrs("header")}
          style={styleSecaStyle(
            headerPartStyle({
              padding: "9px 14px",
              background: headerBg,
              borderBottom: `${containerBorderWidth}px solid ${containerBorderColor}`,
              display: "flex",
              alignItems: "center",
              gap: 9,
              boxShadow: `0 10px 22px rgba(0,0,0,0.24), 0 0 18px ${STYLE_SECA.glow}`,
            }),
            headerBg,
          )}
        >
          <span
            {...partAttrs("badge")}
            style={badgeStyle({
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: STYLE_SECA.primary,
              boxShadow: `0 0 12px ${STYLE_SECA.primary}`,
              display: "inline-block",
              animation: "ov-live-pulse 2s ease-in-out infinite",
            })}
          />
          <span
            {...partAttrs("header")}
            style={{
              fontSize: "0.84em",
              fontWeight: 900,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: headerText,
              textShadow: `0 0 10px ${headerText}66`,
            }}
          >
            {chatHeaderName}
          </span>
          <span
            {...partAttrs("header")}
            style={{
              marginLeft: "auto",
              color: "#64748b",
              fontSize: "0.72em",
              fontWeight: 800,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            Live
          </span>
        </div>
      )}

      {showHeader && chatStyle === "bh_stats" && (
        <div
          {...partAttrs("header")}
          style={headerPartStyle({
            padding: "10px 14px",
            background: headerBg,
            borderBottom: `1px solid ${borderColor}`,
            display: "flex",
            alignItems: "center",
            gap: 6,
          })}
        >
          <span style={{ fontSize: "1.1em" }}>💬</span>
          <span
            style={{
              fontSize: "0.88em",
              fontWeight: 800,
              letterSpacing: "0.03em",
              color: headerText,
            }}
          >
            Live Chat
          </span>
          <span
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: "0.7em",
              fontWeight: 700,
              background: badgeBg,
              color: badgeText,
              borderRadius: 99,
              padding: "2px 10px",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: badgeText,
                display: "inline-block",
                animation: "ov-live-pulse 2s ease-in-out infinite",
              }}
            />
            <span>LIVE</span>
          </span>
        </div>
      )}

      {showHeader &&
        chatStyle !== "cards" &&
        chatStyle !== "metal" &&
        chatStyle !== "glow_panel" &&
        chatStyle !== "StyleSecaChat" &&
        chatStyle !== "bh_stats" && (
          <div
            className="ov-chat-header"
            {...partAttrs("header")}
            style={headerPartStyle({ background: headerBg, color: headerText })}
          >
            <span className="ov-chat-header-title" {...partAttrs("header")}>
              Live Chat
            </span>
            <div className="ov-chat-header-badges" {...partAttrs("badge")}>
              {CHAT_PLATFORMS.map((p) => (
                <span
                  key={p}
                  className="ov-chat-platform-badge"
                  {...partAttrs("badge")}
                  style={badgeStyle({
                    background:
                      PLATFORM_META[p].color +
                      (enabledPlatforms.includes(p) ? "33" : "15"),
                    color: PLATFORM_META[p].color,
                    opacity: enabledPlatforms.includes(p) ? 1 : 0.35,
                  })}
                >
                  {PLATFORM_META[p].icon}
                </span>
              ))}
            </div>
          </div>
        )}

      <div
        className="ov-chat-messages"
        {...partAttrs("messageList")}
        ref={scrollRef}
        style={messageListStyle({ lineHeight: msgLineHeight })}
      >
        {renderMessages.map((msg, msgIdx) => {
          const plt = PLATFORM_META[msg.platform] || PLATFORM_META.twitch;
          const nameColor =
            c.useNativeColors && msg.color ? msg.color : usernameColor;
          const followerMessage = isFollowerMessage(msg);

          /* ── Raid message ── */
          if (msg.isRaid) {
            return (
              <RaidMessage
                key={msg.id}
                msg={msg}
                chatStyle={chatStyle}
                msgSpacing={msgSpacing}
                msgPadH={msgPadH}
                c={c}
              />
            );
          }

          /* ── Style: StyleSeca Chat — two-colour metallic hunt chat ── */
          if (chatStyle === "StyleSecaChat") {
            return (
              <StyleSecaChatMessage
                key={msg.id}
                msg={msg}
                platform={plt}
                nameColor={nameColor}
                followerMessage={followerMessage}
                context={messageRenderContext}
              />
            );
          }

          /* ── Style: Floating — transparent bg, floating pill bubbles ── */
          if (chatStyle === "floating") {
            return (
              <FloatingChatMessage
                key={msg.id}
                msg={msg}
                nameColor={nameColor}
                context={messageRenderContext}
              />
            );
          }

          /* ── Style: Bubble — social media speech bubbles with tail ── */
          if (chatStyle === "bubble") {
            return (
              <BubbleChatMessage
                key={msg.id}
                msg={msg}
                nameColor={nameColor}
                context={messageRenderContext}
              />
            );
          }

          /* ── Style: Stack — msgs from bottom, newest = full opacity, old fades ── */
          if (chatStyle === "stack") {
            return (
              <StackChatMessage
                key={msg.id}
                msg={msg}
                msgIdx={msgIdx}
                nameColor={nameColor}
                context={messageRenderContext}
              />
            );
          }

          /* ── Style: Typewriter — terminal / monospace green-on-dark ── */
          if (chatStyle === "typewriter") {
            return (
              <TypewriterChatMessage
                key={msg.id}
                msg={msg}
                nameColor={nameColor}
                context={messageRenderContext}
              />
            );
          }

          /* ── Style: Sidebar — vertical strip with platform color border ── */
          if (chatStyle === "sidebar") {
            return (
              <SidebarChatMessage
                key={msg.id}
                msg={msg}
                platform={plt}
                nameColor={nameColor}
                context={messageRenderContext}
              />
            );
          }

          /* ── Style: Cards — dark card per message with Twitch badge pills ── */
          if (chatStyle === "cards") {
            return (
              <CardsChatMessage
                key={msg.id}
                msg={msg}
                context={messageRenderContext}
              />
            );
          }

          /* ── Style: Metal — brushed steel look ── */
          if (chatStyle === "metal") {
            return (
              <MetalChatMessage
                key={msg.id}
                msg={msg}
                platform={plt}
                nameColor={nameColor}
                context={messageRenderContext}
              />
            );
          }

          /* ── Style: Glow Panel — compact dark chat like stream panels ── */
          if (chatStyle === "glow_panel") {
            return (
              <GlowPanelChatMessage
                key={msg.id}
                msg={msg}
                platform={plt}
                nameColor={nameColor}
                context={messageRenderContext}
              />
            );
          }

          /* ── Style: BH Stats — matches Bonus Hunt stats widget ── */
          if (chatStyle === "bh_stats") {
            return (
              <BonusHuntChatMessage
                key={msg.id}
                msg={msg}
                platform={plt}
                nameColor={nameColor}
                context={messageRenderContext}
              />
            );
          }

          /* ── Default: Classic ── */
          return (
            <ClassicChatMessage
              key={msg.id}
              msg={msg}
              platform={plt}
              nameColor={nameColor}
              context={messageRenderContext}
            />
          );
        })}
      </div>

      {showLegend && (
        <div
          className="ov-chat-legend"
          {...partAttrs("platformLegend")}
          style={legendStyle({ background: headerBg })}
        >
          {CHAT_PLATFORMS.map((p) => (
            <div
              key={p}
              className="ov-chat-legend-item"
              style={{ opacity: enabledPlatforms.includes(p) ? 1 : 0.35 }}
            >
              <span
                className="ov-chat-legend-dot"
                style={{ background: PLATFORM_META[p].color }}
              />
              <span>{PLATFORM_META[p].label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StyleSecaChatMessage({
  msg,
  platform,
  nameColor,
  followerMessage,
  context,
}) {
  const {
    msgSpacing,
    msgPadH,
    messageBg,
    borderRadius,
    borderWidth,
    borderColor,
    styleSecaStyle,
    avatarStyle,
    headerText,
    avatarBg,
    avatarBorder,
    avatarText,
    textColor,
    msgLineHeight,
    nameBold,
    badgeStyle,
    badgeText,
    badgeBg,
    showBadges,
    messageTextStyle,
    usernameStyle,
  } = context;
  const rowPart = followerMessage ? "highlightedMessage" : "message";
  const rowBackground = followerMessage ? styleSecaHeaderGradient() : messageBg;
  const rowStyle = styleSecaStyle(
    subElementStyle(context.config, rowPart, {
      padding: `${Math.max(4, msgSpacing + 3)}px ${msgPadH}px`,
      animation: followerMessage
        ? "ov-slide-left 0.25s ease-out, ov-seca-highlight-glow 2.4s ease-in-out infinite"
        : "ov-slide-left 0.24s ease-out",
      background: rowBackground,
      border: `${Number(borderWidth) || 1}px solid ${followerMessage ? STYLE_SECA.primary : borderColor}`,
      borderRadius,
      display: "flex",
      alignItems: "flex-start",
      gap: 8,
      margin: `${Math.max(2, Math.floor(msgSpacing / 2))}px ${Math.max(4, Math.floor(msgPadH / 2))}px`,
      boxShadow: followerMessage
        ? `0 0 20px ${STYLE_SECA.glow}`
        : "inset 0 1px 0 rgba(255,255,255,0.04)",
    }),
    rowBackground,
  );
  return (
    <div
      className={`ov-chat-msg ov-chat-msg--styleseca${followerMessage ? " ov-chat-msg--styleseca-follow" : ""}`}
      {...partAttrs(rowPart)}
      style={rowStyle}
    >
      <ChatAvatar
        msg={msg}
        fallback={
          followerMessage ? "F" : (msg.username || "?").charAt(0).toUpperCase()
        }
        style={avatarStyle({
          width: 26,
          height: 26,
          borderRadius: 8,
          background: followerMessage ? headerText : avatarBg,
          border: `1px solid ${followerMessage ? STYLE_SECA.text : avatarBorder}`,
          color: followerMessage ? "#15110a" : avatarText,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.82em",
          fontWeight: 900,
          flexShrink: 0,
          boxShadow: followerMessage
            ? `0 0 14px ${STYLE_SECA.primary}88`
            : undefined,
        })}
      />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 7,
            flexWrap: "wrap",
          }}
        >
          <span
            {...partAttrs("username")}
            style={usernameStyle({
              color: nameColor,
              fontWeight: nameBold ? 900 : 700,
              textShadow: `0 0 9px ${nameColor}55`,
            })}
          >
            {msg.username}
          </span>
          {followerMessage && (
            <span
              {...partAttrs("badge")}
              style={badgeStyle({
                color: "#15110a",
                background: STYLE_SECA.primary,
                borderRadius: 4,
                padding: "1px 6px",
                fontSize: "0.68em",
                fontWeight: 900,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              })}
            >
              Follow
            </span>
          )}
          {showBadges && !followerMessage && (
            <span
              {...partAttrs("badge")}
              style={badgeStyle({
                color: badgeText,
                background: badgeBg,
                border: `1px solid ${borderColor}`,
                borderRadius: 4,
                padding: "1px 5px",
                fontSize: "0.7em",
                fontWeight: 900,
              })}
            >
              {platform.icon}
            </span>
          )}
        </div>
        <div
          {...partAttrs(followerMessage ? "highlightedMessage" : "messageText")}
          style={messageTextStyle({
            color: followerMessage ? STYLE_SECA.text : textColor,
            wordBreak: "break-word",
            lineHeight: msgLineHeight,
            textShadow: "0 1px 2px rgba(0,0,0,0.58)",
            marginTop: 2,
          })}
        >
          {msg.message}
        </div>
      </div>
    </div>
  );
}

function FloatingChatMessage({ msg, nameColor, context }) {
  const {
    msgSpacing,
    messageBg,
    borderRadius,
    borderColor,
    avatarStyle,
    avatarBg,
    avatarText,
    textColor,
    messagePartStyle,
    messageTextStyle,
    usernameStyle,
  } = context;
  return (
    <div
      className="ov-chat-msg ov-chat-msg--floating"
      {...partAttrs("message")}
      style={messagePartStyle({
        padding: `${msgSpacing + 1}px 4px`,
        animation: "ov-float-in 0.35s ease-out",
      })}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "flex-start",
          gap: 8,
          background: messageBg || "rgba(0,0,0,0.75)",
          borderRadius: borderRadius,
          padding: "6px 14px",
          maxWidth: "92%",
          border: `1px solid ${borderColor}`,
        }}
      >
        <span
          {...partAttrs("avatar")}
          style={avatarStyle({
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: avatarBg,
            color: avatarText,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.82em",
            fontWeight: 800,
            flexShrink: 0,
            marginTop: 1,
          })}
        >
          {msg.username.charAt(0).toUpperCase()}
        </span>
        <div style={{ minWidth: 0 }}>
          <span
            {...partAttrs("username")}
            style={usernameStyle({
              color: nameColor,
              fontWeight: 700,
              fontSize: "0.92em",
              lineHeight: 1.2,
              textShadow: "0 1px 3px rgba(0,0,0,0.5)",
            })}
          >
            {msg.username}
          </span>
          <div
            {...partAttrs("messageText")}
            style={messageTextStyle({
              color: textColor,
              lineHeight: 1.35,
              wordBreak: "break-word",
              opacity: 0.92,
              textShadow: "0 1px 3px rgba(0,0,0,0.5)",
            })}
          >
            {msg.message}
          </div>
        </div>
      </div>
    </div>
  );
}

function BubbleChatMessage({ msg, nameColor, context }) {
  const {
    msgSpacing,
    msgPadH,
    messageBg,
    borderRadius,
    borderColor,
    avatarStyle,
    avatarBg,
    avatarBorder,
    avatarText,
    messagePartStyle,
    messageTextStyle,
    usernameStyle,
  } = context;
  return (
    <div
      className="ov-chat-msg ov-chat-msg--bubble"
      {...partAttrs("message")}
      style={messagePartStyle({
        padding: `${msgSpacing + 1}px ${msgPadH}px`,
        animation: "ov-pop-in 0.3s ease-out",
      })}
    >
      <div
        {...partAttrs("avatar")}
        style={avatarStyle({
          width: 28,
          height: 28,
          borderRadius: "50%",
          flexShrink: 0,
          marginTop: 2,
          background: avatarBg,
          border: `1.5px solid ${avatarBorder}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: avatarText,
          fontSize: "0.85em",
          fontWeight: 800,
        })}
      >
        {msg.username.charAt(0).toUpperCase()}
      </div>
      <div style={{ minWidth: 0, maxWidth: "85%" }}>
        <span
          {...partAttrs("username")}
          style={usernameStyle({
            color: nameColor,
            fontWeight: 700,
            fontSize: "0.88em",
            display: "block",
            marginBottom: 2,
            textShadow: "0 1px 3px rgba(0,0,0,0.5)",
          })}
        >
          {msg.username}
        </span>
        <div
          {...partAttrs("messageText")}
          style={messageTextStyle({
            background: messageBg || "rgba(255,255,255,0.06)",
            borderRadius: `${borderRadius}px ${borderRadius}px ${borderRadius}px 4px`,
            padding: "7px 12px",
            position: "relative",
            border: `1px solid ${borderColor}`,
          })}
        >
          <span
            style={{
              wordBreak: "break-word",
              textShadow: "0 1px 3px rgba(0,0,0,0.5)",
            }}
          >
            {msg.message}
          </span>
        </div>
      </div>
    </div>
  );
}

function StackChatMessage({ msg, msgIdx, nameColor, context }) {
  const {
    totalMessages,
    msgSpacing,
    msgPadH,
    borderColor,
    messagePartStyle,
    messageTextStyle,
    usernameStyle,
  } = context;
  const totalVisible = Math.min(totalMessages, 20);
  const age = totalMessages - 1 - msgIdx;
  const opacity = age < totalVisible ? 1 - (age / totalVisible) * 0.75 : 0.15;
  return (
    <div
      className="ov-chat-msg ov-chat-msg--stack"
      {...partAttrs("message")}
      style={messagePartStyle({
        padding: `${msgSpacing + 1}px ${msgPadH}px`,
        opacity,
        transition: "opacity 0.5s ease",
        animation: age === 0 ? "ov-float-in 0.3s ease-out" : "none",
      })}
    >
      <span
        {...partAttrs("username")}
        style={usernameStyle({
          color: nameColor,
          fontWeight: 700,
          fontSize: "0.95em",
          flexShrink: 0,
        })}
      >
        {msg.username}
      </span>
      <span style={{ color: borderColor, margin: "0 5px", flexShrink: 0 }}>
        ›
      </span>
      <span
        {...partAttrs("messageText")}
        style={messageTextStyle({
          wordBreak: "break-word",
          opacity: 0.9,
          textShadow: "0 1px 3px rgba(0,0,0,0.5)",
        })}
      >
        {msg.message}
      </span>
    </div>
  );
}

function TypewriterChatMessage({ msg, nameColor, context }) {
  const {
    msgSpacing,
    msgPadH,
    messagePartStyle,
    messageTextStyle,
    usernameStyle,
  } = context;
  return (
    <div
      className="ov-chat-msg ov-chat-msg--typewriter"
      {...partAttrs("message")}
      style={messagePartStyle({
        padding: `${msgSpacing}px ${msgPadH}px`,
        fontFamily: "'Fira Code', 'JetBrains Mono', 'Courier New', monospace",
        animation: "ov-slide-left 0.25s ease-out",
      })}
    >
      <span
        style={{
          color: "#4ade80",
          fontWeight: 700,
          fontSize: "0.92em",
          opacity: 0.7,
        }}
      >
        {">"}
      </span>
      <span
        {...partAttrs("username")}
        style={usernameStyle({
          color: nameColor,
          fontWeight: 700,
          fontSize: "0.95em",
          marginLeft: 4,
          textShadow: "0 1px 3px rgba(0,0,0,0.5)",
        })}
      >
        {msg.username}
      </span>
      <span style={{ color: "rgba(74,222,128,0.3)", margin: "0 6px" }}>$</span>
      <span
        {...partAttrs("messageText")}
        style={messageTextStyle({
          color: "#d1fae5",
          wordBreak: "break-word",
          opacity: 0.85,
          textShadow: "0 1px 3px rgba(0,0,0,0.5)",
        })}
      >
        {msg.message}
      </span>
    </div>
  );
}

function SidebarChatMessage({ msg, platform, nameColor, context }) {
  const {
    msgSpacing,
    msgPadH,
    textColor,
    messagePartStyle,
    messageTextStyle,
    usernameStyle,
    badgeStyle,
  } = context;
  return (
    <div
      className="ov-chat-msg ov-chat-msg--sidebar"
      {...partAttrs("message")}
      style={messagePartStyle({
        padding: `${msgSpacing + 2}px ${msgPadH}px`,
        borderLeft: `3px solid ${platform.color}`,
        animation: "ov-slide-left 0.3s ease-out",
        display: "flex",
        flexDirection: "column",
        gap: 1,
      })}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span
          {...partAttrs("badge")}
          style={badgeStyle({
            fontSize: "0.78em",
            fontWeight: 800,
            color: platform.color,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            opacity: 0.7,
            textShadow: "0 1px 3px rgba(0,0,0,0.5)",
          })}
        >
          {platform.label}
        </span>
        <span
          {...partAttrs("username")}
          style={usernameStyle({
            color: nameColor,
            fontWeight: 700,
            fontSize: "0.92em",
            textShadow: "0 1px 3px rgba(0,0,0,0.5)",
          })}
        >
          {msg.username}
        </span>
      </div>
      <span
        {...partAttrs("messageText")}
        style={messageTextStyle({
          color: textColor,
          wordBreak: "break-word",
          opacity: 0.88,
          paddingLeft: 1,
          textShadow: "0 1px 3px rgba(0,0,0,0.5)",
        })}
      >
        {msg.message}
      </span>
    </div>
  );
}

function CardsChatMessage({ msg, context }) {
  const {
    config,
    messagePartStyle,
    messageTextStyle,
    usernameStyle,
    usernameColor,
  } = context;
  const nameColor =
    config.useNativeColors && msg.color ? msg.color : usernameColor;
  const isRaider = !!msg.isRaidParticipant;
  return (
    <div
      className="ov-cards-msg"
      {...partAttrs("message")}
      style={messagePartStyle({ animation: "ov-cards-slide-in 0.3s ease-out" })}
    >
      <div className="ov-cards-msg-header">
        <span
          className="ov-cards-username"
          {...partAttrs("username")}
          style={usernameStyle({ color: nameColor })}
        >
          @{msg.username}
        </span>
        <div className="ov-cards-badges" {...partAttrs("badge")}>
          <TwitchBadges msg={msg} config={config} />
          {isRaider && (
            <span
              className="ov-cards-badge"
              {...partAttrs("badge")}
              style={{ background: "#7c3aed" }}
            >
              <span className="ov-cards-badge-icon">⚔️</span> RAID
            </span>
          )}
        </div>
      </div>
      <div
        className="ov-cards-msg-text"
        {...partAttrs("messageText")}
        style={messageTextStyle()}
      >
        {msg.message}
      </div>
    </div>
  );
}

function MetalChatMessage({ msg, platform, nameColor, context }) {
  const {
    msgSpacing,
    msgPadH,
    messageBg,
    borderWidth,
    borderColor,
    avatarStyle,
    avatarBg,
    avatarBorder,
    avatarText,
    headerText,
    textColor,
    messagePartStyle,
    messageTextStyle,
    usernameStyle,
  } = context;
  return (
    <div
      className="ov-chat-msg ov-chat-msg--metal"
      {...partAttrs("message")}
      style={messagePartStyle({
        padding: `${msgSpacing + 1}px ${msgPadH}px`,
        animation: "ov-float-in 0.25s ease-out",
        borderBottom: `${Number(borderWidth) || 1}px solid ${borderColor}`,
        background: brushedMetalBackground(
          messageBg || "rgba(34,36,42,0.34)",
          headerText,
          {
            highlightOpacity: 0.035,
            grainOpacity: 0.02,
          },
        ),
      })}
    >
      <ChatAvatar
        msg={msg}
        fallback={(msg.username || platform.icon || "?")
          .charAt(0)
          .toUpperCase()}
        style={avatarStyle({
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: avatarBg,
          border: `1px solid ${avatarBorder}`,
          color: avatarText,
          fontSize: "0.78em",
          fontWeight: 800,
          flex: "0 0 28px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.08), 0 0 10px rgba(255,255,255,0.04)",
        })}
      />
      <div className="ov-chat-msg-body" {...partAttrs("message")}>
        <span
          {...partAttrs("username")}
          style={usernameStyle({
            fontWeight: 700,
            fontSize: "0.95em",
            color: nameColor,
            marginRight: 6,
          })}
        >
          {msg.username}
        </span>
        <span
          {...partAttrs("messageText")}
          style={messageTextStyle({
            color: textColor,
            textShadow: "0 1px 2px rgba(0,0,0,0.5)",
          })}
        >
          {msg.message}
        </span>
      </div>
    </div>
  );
}

function GlowPanelChatMessage({ msg, platform, nameColor, context }) {
  const {
    msgSpacing,
    msgPadH,
    messageBg,
    borderWidth,
    textColor,
    msgLineHeight,
    nameBold,
    badgeStyle,
    badgeText,
    badgeBg,
    borderColor,
    showBadges,
    messagePartStyle,
    messageTextStyle,
    usernameStyle,
  } = context;
  const bottomBorder = borderWidth
    ? `${Math.max(1, Number(borderWidth) || 1)}px solid rgba(34,211,238,0.045)`
    : "none";
  return (
    <div
      className="ov-chat-msg ov-chat-msg--glow-panel"
      {...partAttrs("message")}
      style={messagePartStyle({
        padding: `${Math.max(2, msgSpacing + 1)}px ${msgPadH}px`,
        animation: "ov-slide-left 0.22s ease-out",
        background: messageBg || "transparent",
        borderBottom: bottomBorder,
        display: "flex",
        alignItems: "baseline",
        gap: 6,
      })}
    >
      {showBadges && msg.badges?.length > 0 && (
        <span
          {...partAttrs("badge")}
          style={badgeStyle({
            color: badgeText,
            background: badgeBg,
            border: `1px solid ${borderColor}`,
            borderRadius: 3,
            padding: "1px 5px",
            fontSize: "0.72em",
            fontWeight: 800,
            flexShrink: 0,
          })}
        >
          {platform.icon}
        </span>
      )}
      <span
        {...partAttrs("username")}
        style={usernameStyle({
          color: nameColor,
          fontWeight: nameBold ? 900 : 700,
          textShadow: `0 0 8px ${nameColor}55`,
          flexShrink: 0,
        })}
      >
        {msg.username}:
      </span>
      <span
        {...partAttrs("messageText")}
        style={messageTextStyle({
          color: textColor,
          wordBreak: "break-word",
          lineHeight: msgLineHeight,
          textShadow: "0 1px 2px rgba(0,0,0,0.55)",
          minWidth: 0,
        })}
      >
        {msg.message}
      </span>
    </div>
  );
}

function BonusHuntChatMessage({ msg, platform, nameColor, context }) {
  const {
    msgSpacing,
    msgPadH,
    avatarStyle,
    avatarBg,
    avatarBorder,
    avatarText,
    badgeStyle,
    badgeText,
    badgeBg,
    textColor,
    showBadges,
    messagePartStyle,
    messageTextStyle,
    usernameStyle,
  } = context;
  return (
    <div
      className="ov-chat-msg ov-chat-msg--bh-stats"
      {...partAttrs("message")}
      style={messagePartStyle({
        padding: `${msgSpacing + 2}px ${msgPadH}px`,
        animation: "ov-float-in 0.3s ease-out",
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
      })}
    >
      <span
        {...partAttrs("avatar")}
        style={avatarStyle({
          width: 24,
          height: 24,
          borderRadius: "50%",
          flexShrink: 0,
          marginTop: 1,
          background: avatarBg,
          border: `1px solid ${avatarBorder}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: avatarText,
          fontSize: "0.78em",
          fontWeight: 800,
        })}
      >
        {msg.username.charAt(0).toUpperCase()}
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <span
          {...partAttrs("username")}
          style={usernameStyle({
            color: nameColor,
            fontWeight: 700,
            fontSize: "0.88em",
            marginRight: 6,
          })}
        >
          {msg.username}
        </span>
        {showBadges && (
          <span
            {...partAttrs("badge")}
            style={badgeStyle({
              background: badgeBg,
              color: badgeText,
              fontSize: "0.68em",
              fontWeight: 700,
              padding: "1px 5px",
              borderRadius: 4,
              marginRight: 4,
              verticalAlign: "middle",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            })}
          >
            {platform.icon}
          </span>
        )}
        <div
          {...partAttrs("messageText")}
          style={messageTextStyle({
            color: textColor,
            wordBreak: "break-word",
            lineHeight: 1.4,
            marginTop: 2,
            opacity: 0.92,
          })}
        >
          {msg.message}
        </div>
      </div>
    </div>
  );
}

function ClassicChatMessage({ msg, platform, nameColor, context }) {
  const {
    msgSpacing,
    msgPadH,
    nameBold,
    showBadges,
    messagePartStyle,
    messageTextStyle,
    usernameStyle,
    badgeStyle,
  } = context;
  return (
    <div
      className="ov-chat-msg"
      {...partAttrs("message")}
      style={messagePartStyle({ padding: `${msgSpacing}px ${msgPadH}px` })}
    >
      {showBadges && (
        <span
          className="ov-chat-badge"
          {...partAttrs("badge")}
          style={badgeStyle({
            background: platform.color + "33",
            color: platform.color,
          })}
        >
          {platform.icon}
        </span>
      )}
      <div className="ov-chat-msg-body" {...partAttrs("message")}>
        <span
          className="ov-chat-username"
          {...partAttrs("username")}
          style={usernameStyle({
            color: nameColor,
            fontWeight: nameBold ? 700 : 500,
          })}
        >
          {msg.username}
        </span>
        <span
          className="ov-chat-text"
          {...partAttrs("messageText")}
          style={messageTextStyle()}
        >
          {msg.message}
        </span>
      </div>
    </div>
  );
}

/* ─── Raid message (shared across styles) ─── */
function RaidMessage({ msg, chatStyle, msgSpacing, msgPadH, c }) {
  const raidBg = subValue(
    c,
    "highlightedMessage",
    "background",
    c.raidBgColor || "#7c3aed",
  );
  const raidBorder = subValue(
    c,
    "highlightedMessage",
    "borderColor",
    c.raidBorderColor || "#64748b",
  );
  const raidText = subValue(
    c,
    "highlightedMessage",
    "textColor",
    c.raidTextColor || "#ffffff",
  );
  const showAvatar = c.showRaidAvatar !== false;
  const highlightedStyle = (fallback = {}) =>
    subElementStyle(c, "highlightedMessage", fallback);
  const raidUsernameStyle = (fallback = {}) =>
    subElementStyle(c, "username", fallback);
  const raidAvatarStyle = (fallback = {}) =>
    subElementStyle(c, "avatar", fallback);
  const raidBadgeStyle = (fallback = {}) =>
    subElementStyle(c, "badge", fallback);

  if (chatStyle === "StyleSecaChat") {
    const secaRaidBg = resolveStyleSecaValue(raidBg, styleSecaHeaderGradient());
    const secaRaidBorder = resolveStyleSecaValue(
      raidBorder,
      STYLE_SECA.primary,
    );
    const secaRaidText = resolveStyleSecaValue(raidText, STYLE_SECA.text);
    const raidStyle = highlightedStyle({
      padding: `${msgSpacing + 5}px ${msgPadH}px`,
      margin: `${msgSpacing}px ${Math.max(6, Math.floor(msgPadH / 2))}px`,
      background: secaRaidBg,
      border: `2px solid ${secaRaidBorder}`,
      borderRadius: 12,
      display: "flex",
      alignItems: "center",
      gap: 10,
      animation:
        "ov-slide-left 0.28s ease-out, ov-seca-highlight-glow 2.2s ease-in-out infinite",
      boxShadow: `0 0 26px ${secaRaidBorder}66, inset 0 1px 0 rgba(255,255,255,0.08)`,
    });
    raidStyle.background = resolveStyleSecaValue(
      raidStyle.background,
      secaRaidBg,
    );
    return (
      <div
        className="ov-chat-msg ov-chat-raid ov-chat-raid--styleseca"
        {...partAttrs("highlightedMessage")}
        style={raidStyle}
      >
        {showAvatar && msg.raidAvatar && (
          <img
            {...partAttrs("avatar")}
            src={msg.raidAvatar}
            alt={msg.username}
            className="ov-chat-raid-avatar"
            style={raidAvatarStyle({
              width: 40,
              height: 40,
              borderRadius: 10,
              border: `2px solid ${secaRaidBorder}`,
              flexShrink: 0,
              boxShadow: `0 0 14px ${secaRaidBorder}66`,
            })}
          />
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              flexWrap: "wrap",
            }}
          >
            <span
              {...partAttrs("badge")}
              style={raidBadgeStyle({
                background: secaRaidBorder,
                color: STYLE_SECA.darkText,
                padding: "2px 7px",
                borderRadius: 4,
                fontSize: "0.72em",
                fontWeight: 900,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              })}
            >
              Raid
            </span>
            <span
              {...partAttrs("username")}
              style={raidUsernameStyle({
                color: secaRaidText,
                fontWeight: 900,
                textShadow: `0 0 10px ${secaRaidBorder}88`,
              })}
            >
              {msg.username}
            </span>
            {msg.raidViewers > 0 && (
              <span
                style={{ color: secaRaidText, opacity: 0.78, fontWeight: 800 }}
              >
                {msg.raidViewers} viewers
              </span>
            )}
          </div>
          <div
            {...partAttrs("highlightedMessage")}
            style={highlightedStyle({
              color: secaRaidText,
              marginTop: 2,
              lineHeight: 1.35,
              wordBreak: "break-word",
            })}
          >
            {msg.message}
          </div>
        </div>
      </div>
    );
  }

  /* ── Cards style raid ── */
  if (chatStyle === "cards") {
    return (
      <div
        className="ov-cards-msg ov-cards-msg--raid"
        {...partAttrs("highlightedMessage")}
        style={highlightedStyle({
          animation: "ov-cards-slide-in 0.35s ease-out",
        })}
      >
        <div className="ov-cards-msg-header">
          <span
            className="ov-cards-username"
            {...partAttrs("username")}
            style={raidUsernameStyle({ color: "#cbd5e1" })}
          >
            @{msg.username}
          </span>
          <div className="ov-cards-badges" {...partAttrs("badge")}>
            <span
              className="ov-cards-badge"
              {...partAttrs("badge")}
              style={raidBadgeStyle({ background: "#7c3aed" })}
            >
              <span className="ov-cards-badge-icon">⚔️</span> RAID
            </span>
            {msg.raidViewers > 0 && (
              <span
                className="ov-cards-badge"
                {...partAttrs("badge")}
                style={raidBadgeStyle({ background: "rgba(100,116,139,0.5)" })}
              >
                👥 {msg.raidViewers}
              </span>
            )}
          </div>
        </div>
        <div
          className="ov-cards-msg-text"
          {...partAttrs("highlightedMessage")}
          style={highlightedStyle({ color: "#f5f3ff" })}
        >
          {msg.message}
        </div>
      </div>
    );
  }

  if (chatStyle === "floating" || chatStyle === "stack") {
    return (
      <div
        className="ov-chat-msg ov-chat-raid"
        {...partAttrs("highlightedMessage")}
        style={highlightedStyle({
          padding: `${msgSpacing + 2}px 4px`,
          animation: "ov-float-in 0.4s ease-out",
        })}
      >
        <div
          {...partAttrs("highlightedMessage")}
          style={highlightedStyle({
            display: "inline-flex",
            flexDirection: "column",
            background: raidBg,
            borderRadius: 16,
            padding: "8px 14px",
            maxWidth: "90%",
            backdropFilter: "blur(4px)",
            border: `1px solid ${raidBorder}`,
          })}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 2,
            }}
          >
            <span
              style={{ fontSize: "0.75em", fontWeight: 700, color: raidText }}
            >
              ⚔️ RAID
            </span>
            <span style={{ fontWeight: 700, color: raidText }}>
              {msg.username}
            </span>
            {msg.raidViewers > 0 && (
              <span style={{ fontSize: "0.8em", color: "#c4b5fd" }}>
                👥 {msg.raidViewers}
              </span>
            )}
          </div>
          <span style={{ color: raidText }}>{msg.message}</span>
        </div>
      </div>
    );
  }

  if (chatStyle === "typewriter") {
    return (
      <div
        className="ov-chat-msg ov-chat-raid"
        {...partAttrs("highlightedMessage")}
        style={highlightedStyle({
          padding: `${msgSpacing + 2}px ${msgPadH}px`,
          fontFamily: "'Fira Code', monospace",
          background: raidBg,
          borderLeft: `3px solid ${raidBorder}`,
          animation: "ov-slide-left 0.25s ease-out",
        })}
      >
        <span style={{ color: raidText }}>⚔️ [RAID]</span>
        <span style={{ color: raidText, fontWeight: 700, marginLeft: 6 }}>
          {msg.username}
        </span>
        <span style={{ color: raidText, marginLeft: 6 }}>{msg.message}</span>
        {msg.raidViewers > 0 && (
          <span style={{ color: "#94a3b8", marginLeft: 6 }}>
            ({msg.raidViewers})
          </span>
        )}
      </div>
    );
  }

  if (chatStyle === "sidebar") {
    return (
      <div
        className="ov-chat-msg ov-chat-raid"
        {...partAttrs("highlightedMessage")}
        style={highlightedStyle({
          padding: `${msgSpacing + 3}px ${msgPadH}px`,
          borderLeft: "3px solid #64748b",
          background: "rgba(148,163,184,0.14)",
          animation: "ov-slide-left 0.3s ease-out",
        })}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{ fontSize: "0.7em", fontWeight: 800, color: "#cbd5e1" }}
          >
            ⚔️ RAID
          </span>
          <span style={{ fontWeight: 700, color: "#e2e8f0" }}>
            {msg.username}
          </span>
          {msg.raidViewers > 0 && (
            <span style={{ fontSize: "0.8em", color: "#c4b5fd" }}>
              👥 {msg.raidViewers}
            </span>
          )}
        </div>
        <span style={{ color: "#f5f3ff", paddingLeft: 1 }}>{msg.message}</span>
      </div>
    );
  }

  /* Default raid (classic, bubble) */
  return (
    <div
      className="ov-chat-msg ov-chat-raid"
      {...partAttrs("highlightedMessage")}
      style={highlightedStyle({
        padding: `${msgSpacing + 4}px 10px`,
        background: raidBg,
        border: `2px solid ${raidBorder}`,
        borderRadius: "8px",
        margin: `${msgSpacing}px 6px`,
        display: "flex",
        alignItems: "center",
        gap: "10px",
        animation: "ov-raid-glow 2s ease-in-out 3",
      })}
    >
      {showAvatar && msg.raidAvatar && (
        <img
          {...partAttrs("avatar")}
          src={msg.raidAvatar}
          alt={msg.username}
          className="ov-chat-raid-avatar"
          style={raidAvatarStyle({
            width: "42px",
            height: "42px",
            borderRadius: "50%",
            border: `2px solid ${raidBorder}`,
            flexShrink: 0,
          })}
        />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            flexWrap: "wrap",
          }}
        >
          <span
            {...partAttrs("badge")}
            style={raidBadgeStyle({
              background: "#64748b33",
              color: "#cbd5e1",
              padding: "1px 6px",
              borderRadius: "4px",
              fontSize: "0.75em",
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            })}
          >
            ⚔️ RAID
          </span>
          <span
            className="ov-chat-username"
            {...partAttrs("username")}
            style={raidUsernameStyle({
              color: raidText,
              fontWeight: 700,
              fontSize: "1.05em",
            })}
          >
            {msg.username}
          </span>
        </div>
        <span
          className="ov-chat-text"
          {...partAttrs("highlightedMessage")}
          style={{ color: raidText, opacity: 0.92 }}
        >
          {msg.message}
        </span>
      </div>
      {msg.raidViewers > 0 && (
        <span
          style={{
            background: "#64748b44",
            color: "#e2e8f0",
            padding: "2px 8px",
            borderRadius: "12px",
            fontSize: "0.8em",
            fontWeight: 700,
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          👥 {msg.raidViewers}
        </span>
      )}
    </div>
  );
}

export default React.memo(ChatWidget);
