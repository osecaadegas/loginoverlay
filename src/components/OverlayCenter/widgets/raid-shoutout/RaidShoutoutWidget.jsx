import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  getPendingAlerts,
  markAlertDismissed,
  markAlertShown,
  subscribeToShoutoutAlerts,
  unsubscribeShoutoutAlerts,
} from "../../../../services/shoutoutService";
import "./RaidShoutoutWidget.css";

const EXIT_MS = 650;

const FRAME_PRESETS = {
  neon: { accent: "#9146ff", secondary: "#22d3ee", surface: "#090711" },
  glass: { accent: "#ffffff", secondary: "#c4b5fd", surface: "#111827" },
  retro: { accent: "#fbbf24", secondary: "#f59e0b", surface: "#451a03" },
  minimal: { accent: "#64748b", secondary: "#94a3b8", surface: "#111827" },
  gaming: { accent: "#22d3ee", secondary: "#3b82f6", surface: "#020617" },
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
      alert.raider_display_name || alert.displayName || alert.raider_username || "Streamer",
    avatarUrl: alert.raider_avatar_url || alert.avatarUrl || "",
    game: alert.raider_game || alert.game || "Just Chatting",
    viewerCount: Number(alert.viewer_count || alert.raid_viewers || 0),
    clipId: alert.clip_id || alert.clipId || "",
    clipTitle: alert.clip_title || alert.clipTitle || "A highlight from the channel",
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
  if (alert.clipThumbnailUrl) {
    return `/api/clip-video?thumbnail=${encodeURIComponent(alert.clipThumbnailUrl)}`;
  }
  return "";
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
    ? `https://clips.twitch.tv/embed?clip=${encodeURIComponent(alert.clipId)}&parent=${window.location.hostname || "localhost"}&autoplay=true&muted=${config.muted === false ? "false" : "true"}`
    : "";
  const canShowVideo = Boolean(videoUrl && !mediaFailed);
  const canShowEmbed = Boolean(!canShowVideo && embedUrl);
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
        <div className="better-shoutout-avatar-wrap" data-widget-element="avatarContainer">
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
          <span className="better-shoutout-views" data-widget-element="viewsBadge">
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
        {canShowVideo ? (
          <video
            src={videoUrl}
            poster={alert.clipThumbnailUrl || undefined}
            autoPlay={config.autoplay !== false}
            muted={config.muted !== false}
            playsInline
            onEnded={onMediaEnded}
            onError={() => setMediaFailed(true)}
          />
        ) : canShowEmbed ? (
          <iframe
            src={embedUrl}
            title={`Twitch clip by ${alert.displayName}`}
            allow="autoplay; fullscreen"
            allowFullScreen
          />
        ) : alert.clipThumbnailUrl ? (
          <img src={alert.clipThumbnailUrl} alt="" />
        ) : (
          <div className="better-shoutout-media-empty">
            <TwitchGlyph />
            <strong>{alert.displayName}</strong>
            <span>{alert.game}</span>
          </div>
        )}
      </div>

      {config.showFooter !== false ? (
        <footer className="better-shoutout-footer" data-widget-element="footer">
          <span className="better-shoutout-channel" data-widget-element="channel">
            <TwitchGlyph /> twitch.tv/{alert.login}
          </span>
          <span className="better-shoutout-live" data-widget-element="liveBadge">
            <i /> Live clip
          </span>
        </footer>
      ) : null}
    </article>
  );
}

export default function RaidShoutoutWidget({ config = {}, userId, runtime = "editor" }) {
  const previewAlert = useMemo(
    () => normalizeAlert(config.__previewAlert || {}),
    [config.__previewAlert],
  );
  const [activeAlert, setActiveAlert] = useState(() =>
    runtime === "obs" ? null : previewAlert,
  );
  const [queue, setQueue] = useState([]);
  const [phase, setPhase] = useState("entered");
  const duration = clampNumber(config.displayDuration, 10, 120, 45);
  const [remaining, setRemaining] = useState(duration);

  useEffect(() => {
    if (runtime !== "obs") {
      setActiveAlert(previewAlert);
      setRemaining(duration);
    }
  }, [duration, previewAlert, runtime]);

  const enqueue = useCallback((alert) => {
    setQueue((current) => {
      if (current.some((item) => item.id === alert.id)) return current;
      return [...current, normalizeAlert(alert)];
    });
  }, []);

  useEffect(() => {
    if (runtime !== "obs" || !userId) return undefined;
    let alive = true;
    getPendingAlerts(userId).then((alerts) => {
      if (alive) alerts.forEach(enqueue);
    });
    const channel = subscribeToShoutoutAlerts(userId, enqueue);
    return () => {
      alive = false;
      unsubscribeShoutoutAlerts(channel);
    };
  }, [enqueue, runtime, userId]);

  useEffect(() => {
    if (runtime !== "obs" || activeAlert || queue.length === 0) return;
    const [next, ...rest] = queue;
    setQueue(rest);
    setActiveAlert(next);
    setRemaining(duration);
    setPhase("entered");
    markAlertShown(next.id);
  }, [activeAlert, duration, queue, runtime]);

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
    if (runtime !== "obs" || !activeAlert || phase === "exiting") return undefined;
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

  if (!activeAlert) return null;

  return (
    <div className="better-shoutout-stage">
      <RaidShoutoutCard
        key={activeAlert.id}
        alert={activeAlert}
        config={config}
        phase={phase}
        remaining={remaining}
        onMediaEnded={config.dismissOnClipEnd === true ? finishAlert : undefined}
      />
    </div>
  );
}
