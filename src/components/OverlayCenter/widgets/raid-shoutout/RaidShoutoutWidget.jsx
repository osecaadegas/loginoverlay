import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useTwitchChat from "../../../../hooks/useTwitchChat";
import {
  getPendingAlerts,
  markAlertDismissed,
  markAlertShown,
  subscribeToShoutoutAlerts,
  unsubscribeShoutoutAlerts,
} from "../../../../services/shoutoutService";
import {
  parseShoutoutChatCommand,
  triggerShoutoutChatCommand,
} from "../../../../services/shoutoutCommandService";
import "./RaidShoutoutWidget.css";

const EXIT_MS = 650;

const FRAME_PRESETS = {
  neon: { accent: "#45c8ff", secondary: "#1385e9", surface: "#081228" },
  glass: { accent: "#9dbdf2", secondary: "#45c8ff", surface: "#0a1734" },
  retro: { accent: "#45c8ff", secondary: "#2f63c9", surface: "#0c1c40" },
  minimal: { accent: "#8baacf", secondary: "#2f63c9", surface: "#081228" },
  gaming: { accent: "#20d8ff", secondary: "#1385e9", surface: "#061126" },
};

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(number, min), max);
}

function normalizeAlert(alert = {}) {
  return {
    id: alert.id || `preview-${alert.raider_username || "streamer"}`,
    login: alert.raider_username || alert.login || "streamer",
    displayName:
      alert.raider_display_name ||
      alert.displayName ||
      alert.raider_username ||
      "Streamer",
    avatarUrl: alert.raider_avatar_url || alert.avatarUrl || "",
    game: alert.raider_game || alert.game || "Just Chatting",
    viewerCount: Number(alert.viewer_count || alert.raid_viewers || 0),
    clipId: alert.clip_id || alert.clipId || "",
    clipTitle:
      alert.clip_title || alert.clipTitle || "A highlight from the channel",
    clipViews: Number(alert.clip_view_count || alert.clipViews || 0),
    clipVideoUrl: alert.clip_video_url || alert.clipVideoUrl || "",
    clipThumbnailUrl: alert.clip_thumbnail_url || alert.clipThumbnailUrl || "",
  };
}

function compactNumber(value) {
  return new Intl.NumberFormat(undefined, { notation: "compact" }).format(
    Math.max(0, Number(value) || 0),
  );
}

function clipProxyUrl(alert) {
  if (alert.clipVideoUrl) {
    return `/api/clip-video?url=${encodeURIComponent(alert.clipVideoUrl)}`;
  }
  if (/-preview-\d+x\d+\.jpg(?:\?|$)/i.test(alert.clipThumbnailUrl)) {
    return `/api/clip-video?thumbnail=${encodeURIComponent(alert.clipThumbnailUrl)}`;
  }
  return "";
}

function AutoplayClipVideo({ src, poster, onEnded, onError }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    video.defaultMuted = true;
    video.muted = true;
    const play = () => video.play().catch(() => undefined);
    play();
    video.addEventListener("canplay", play, { once: true });
    return () => video.removeEventListener("canplay", play);
  }, [src]);

  return (
    <video
      ref={videoRef}
      src={src}
      poster={poster || undefined}
      autoPlay
      muted
      playsInline
      preload="auto"
      onEnded={onEnded}
      onError={onError}
    />
  );
}

function TwitchGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4 2h18v12.7L16.7 20H13l-2.4 2H8v-2H4V2Zm2 2v14h4v1.2L11.5 18h4.3l4.2-4.2V4H6Zm5 3h2v6h-2V7Zm5 0h2v6h-2V7Z"
      />
    </svg>
  );
}

function ShoutoutMedia({ alert, videoUrl, embedUrl, mediaFailed, onMediaEnded, onMediaFailed }) {
  if (videoUrl && !mediaFailed) {
    return (
      <AutoplayClipVideo
        src={videoUrl}
        poster={alert.clipThumbnailUrl}
        onEnded={onMediaEnded}
        onError={onMediaFailed}
      />
    );
  }
  if (embedUrl) {
    return (
      <iframe
        src={embedUrl}
        title={`Twitch clip by ${alert.displayName}`}
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
      />
    );
  }
  if (alert.clipThumbnailUrl) {
    return <img src={alert.clipThumbnailUrl} alt="" />;
  }
  return (
    <div className="better-shoutout-media-empty">
      <TwitchGlyph />
      <strong>{alert.displayName}</strong>
      <span>{alert.game}</span>
    </div>
  );
}

function RaidShoutoutCard({ alert, config, phase, remaining, onMediaEnded }) {
  const [mediaFailed, setMediaFailed] = useState(false);
  const preset = FRAME_PRESETS[config.frameStyle] || FRAME_PRESETS.neon;
  const accent = config.accentColor || preset.accent;
  const secondary = config.secondaryColor || preset.secondary;
  const surface = config.backgroundColor || preset.surface;
  const duration = clampNumber(config.displayDuration, 10, 120, 45);
  const progress = Math.max(0, Math.min(1, remaining / duration));
  const videoUrl = clipProxyUrl(alert);
  const embedUrl = alert.clipId
    ? `https://clips.twitch.tv/embed?clip=${encodeURIComponent(alert.clipId)}&parent=${window.location.hostname || "localhost"}&autoplay=true&muted=true`
    : "";
  const style = {
    "--so-accent": accent,
    "--so-secondary": secondary,
    "--so-surface": surface,
    "--so-text": config.textColor || "#ffffff",
    "--so-muted": config.mutedColor || "#a5b4c7",
    "--so-radius": `${clampNumber(config.borderRadius, 0, 48, 16)}px`,
    "--so-border": `${clampNumber(config.borderWidth, 0, 8, 2)}px`,
    "--so-glow": clampNumber(config.glowIntensity, 0, 100, 55) / 100,
    "--so-font": config.fontFamily || "'Rajdhani', sans-serif",
    "--so-title-size": `${clampNumber(config.titleSize, 10, 32, 16)}px`,
    "--so-subtitle-size": `${clampNumber(config.subtitleSize, 8, 24, 12)}px`,
    "--so-avatar-size": `${clampNumber(config.avatarSize, 24, 96, 44)}px`,
    "--so-progress": progress,
  };

  return (
    <article
      className={`better-shoutout-card is-${config.frameStyle || "neon"} is-${phase} anim-${config.animation || "slide-left"}`}
      style={style}
      data-widget-element="container"
      aria-label={`Twitch shoutout for ${alert.displayName}`}
    >
      {config.showCornerDots !== false ? (
        <span className="better-shoutout-corners" aria-hidden="true" />
      ) : null}
      {config.showScanline !== false ? (
        <span className="better-shoutout-scanline" aria-hidden="true" />
      ) : null}

      <header className="better-shoutout-header" data-widget-element="header">
        <div
          className="better-shoutout-avatar-wrap"
          data-widget-element="avatarContainer"
        >
          {alert.avatarUrl ? (
            <img
              className="better-shoutout-avatar"
              src={alert.avatarUrl}
              alt=""
              data-widget-element="avatar"
            />
          ) : (
            <span
              className="better-shoutout-avatar better-shoutout-avatar--fallback"
              data-widget-element="avatar"
            >
              {alert.displayName.slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>

        <div className="better-shoutout-heading">
          <strong data-widget-element="title">
            {config.showStreamerInfo === false
              ? config.headingText || "Twitch shoutout"
              : `${config.headingText || "Shoutout"}: ${alert.displayName}`}
          </strong>
          {config.showClipTitle !== false ? (
            <span data-widget-element="subtitle">{alert.clipTitle}</span>
          ) : null}
        </div>

        {config.showViews !== false ? (
          <span
            className="better-shoutout-views"
            data-widget-element="viewsBadge"
          >
            {compactNumber(alert.clipViews)} views
          </span>
        ) : null}

        {config.showTimer !== false ? (
          <div className="better-shoutout-timer" data-widget-element="timer">
            <svg viewBox="0 0 44 44" aria-hidden="true">
              <circle cx="22" cy="22" r="18" />
              <circle
                className="better-shoutout-timer-progress"
                cx="22"
                cy="22"
                r="18"
                pathLength="1"
              />
            </svg>
            <span>{Math.max(0, remaining)}s</span>
          </div>
        ) : null}
      </header>

      <div className="better-shoutout-media" data-widget-element="clipFrame">
        <ShoutoutMedia
          alert={alert}
          videoUrl={videoUrl}
          embedUrl={embedUrl}
          mediaFailed={mediaFailed}
          onMediaEnded={onMediaEnded}
          onMediaFailed={() => setMediaFailed(true)}
        />
      </div>

      {config.showFooter !== false ? (
        <footer className="better-shoutout-footer" data-widget-element="footer">
          <span
            className="better-shoutout-channel"
            data-widget-element="channel"
          >
            <TwitchGlyph /> twitch.tv/{alert.login}
          </span>
          <span
            className="better-shoutout-live"
            data-widget-element="liveBadge"
          >
            <i /> Live clip
          </span>
        </footer>
      ) : null}
    </article>
  );
}

export default function RaidShoutoutWidget({
  config = {},
  userId,
  runtime = "editor",
  publicOverlayId,
  onActiveChange,
  allWidgets = [],
  allowFallbackPreview = true,
}) {
  const hostedInChat = allWidgets.some(
    (widget) =>
      widget?.widget_type === "chat" && widget?.config?.shoutoutInChat === true,
  );
  const previewAlert = useMemo(
    () =>
      config.__previewAlert || allowFallbackPreview
        ? normalizeAlert(config.__previewAlert || {})
        : null,
    [allowFallbackPreview, config.__previewAlert],
  );
  const [activeAlert, setActiveAlert] = useState(() =>
    runtime === "obs" ? null : previewAlert,
  );
  const [queue, setQueue] = useState([]);
  const [phase, setPhase] = useState("entered");
  const duration = clampNumber(config.displayDuration, 10, 120, 45);
  const [remaining, setRemaining] = useState(duration);
  const twitchChannel = String(config.twitchChannel || "")
    .trim()
    .replace(/^#/, "")
    .toLowerCase();

  const handleChatMessage = useCallback(
    (message) => {
      const command = parseShoutoutChatCommand(message);
      if (!command) return;
      triggerShoutoutChatCommand({ publicOverlayId, command }).catch(
        (error) => {
          console.error("[RaidShoutoutWidget] !so command failed:", error);
        },
      );
    },
    [publicOverlayId],
  );

  useTwitchChat(
    runtime === "obs" &&
      !hostedInChat &&
      config.chatCommandEnabled !== false &&
      publicOverlayId
      ? twitchChannel
      : "",
    handleChatMessage,
  );

  useEffect(() => {
    if (runtime !== "obs") {
      setActiveAlert(previewAlert);
      setRemaining(duration);
    }
  }, [duration, previewAlert, runtime]);

  useEffect(() => {
    onActiveChange?.(Boolean(activeAlert));
  }, [activeAlert, onActiveChange]);

  const enqueue = useCallback((alert) => {
    setQueue((current) => {
      if (current.some((item) => item.id === alert.id)) return current;
      return [...current, normalizeAlert(alert)];
    });
  }, []);

  useEffect(() => {
    if (runtime !== "obs" || hostedInChat || !userId) return undefined;
    let alive = true;
    getPendingAlerts(userId).then((alerts) => {
      if (alive) alerts.forEach(enqueue);
    });
    const channel = subscribeToShoutoutAlerts(userId, enqueue);
    return () => {
      alive = false;
      unsubscribeShoutoutAlerts(channel);
    };
  }, [enqueue, hostedInChat, runtime, userId]);

  useEffect(() => {
    if (
      runtime !== "obs" ||
      hostedInChat ||
      activeAlert ||
      queue.length === 0
    )
      return;
    const [next, ...rest] = queue;
    setQueue(rest);
    setActiveAlert(next);
    setRemaining(duration);
    setPhase("entered");
    markAlertShown(next.id);
  }, [activeAlert, duration, hostedInChat, queue, runtime]);

  const finishAlert = useCallback(() => {
    if (runtime !== "obs" || !activeAlert || phase === "exiting") return;
    setPhase("exiting");
    window.setTimeout(() => {
      markAlertDismissed(activeAlert.id);
      setActiveAlert(null);
      setPhase("entered");
    }, EXIT_MS);
  }, [activeAlert, phase, runtime]);

  useEffect(() => {
    if (runtime !== "obs" || !activeAlert || phase === "exiting")
      return undefined;
    const timer = window.setInterval(() => {
      setRemaining((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          window.setTimeout(finishAlert, 0);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [activeAlert, finishAlert, phase, runtime]);

  if (hostedInChat || !activeAlert) return null;

  return (
    <div className="better-shoutout-stage">
      <RaidShoutoutCard
        key={activeAlert.id}
        alert={activeAlert}
        config={config}
        phase={phase}
        remaining={remaining}
        onMediaEnded={
          config.dismissOnClipEnd === true ? finishAlert : undefined
        }
      />
    </div>
  );
}
