import React, { useCallback, useEffect, useMemo, useState } from "react";
import ConnectFourWidget from "../connect-four/ConnectFourWidget";
import "./SlideshowFrameWidget.css";

const VIDEO_EXTENSIONS = /\.(mp4|webm|ogg|ogv|mov|m4v)(?:[?#].*)?$/i;

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(number, min), max);
}

function mediaTypeFromUrl(url = "") {
  return VIDEO_EXTENSIONS.test(String(url).trim()) ? "video" : "image";
}

function normalizeMediaItem(item, index) {
  if (typeof item === "string") {
    const parts = item.split("|").map((part) => part.trim()).filter(Boolean);
    const url = parts[0] || "";
    const explicitType = ["image", "video"].includes(parts[1]) ? parts[1] : "";
    return {
      id: `media-${index}`,
      url,
      type: explicitType || mediaTypeFromUrl(url),
      label: explicitType ? parts[2] || "" : parts[1] || "",
    };
  }

  const url =
    item?.url ||
    item?.src ||
    item?.imageUrl ||
    item?.videoUrl ||
    "";
  const type = ["image", "video"].includes(item?.type) ? item.type : mediaTypeFromUrl(url);
  return {
    id: item?.id || `media-${index}`,
    url,
    type,
    label: item?.label || item?.title || item?.name || "",
  };
}

function parseMediaText(value = "") {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(normalizeMediaItem)
    .filter((item) => item.url);
}

function getMediaItems(config = {}) {
  if (Array.isArray(config.mediaItems) && config.mediaItems.length) {
    return config.mediaItems
      .map(normalizeMediaItem)
      .filter((item) => item.url);
  }
  if (Array.isArray(config.mediaUrls) && config.mediaUrls.length) {
    return config.mediaUrls
      .map(normalizeMediaItem)
      .filter((item) => item.url);
  }
  return parseMediaText(config.mediaText);
}

export default function SlideshowFrameWidget({
  config,
  userId,
  runtime = "editor",
}) {
  const c = config || {};
  const mediaItems = useMemo(() => getMediaItems(c), [c.mediaItems, c.mediaText, c.mediaUrls]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [connectFourActive, setConnectFourActive] = useState(false);
  const connectFourEnabled = c.showConnectFour === true;
  const slideMs = clampNumber(c.slideMs, 1000, 60000, 5000);
  const transitionMs = clampNumber(c.transitionMs, 0, Math.min(2500, slideMs - 100), 650);
  const frameStyle = ["neon", "glass", "metal", "minimal", "film", "none"].includes(c.frameStyle)
    ? c.frameStyle
    : "neon";
  const fit = ["cover", "contain", "fill", "scale-down"].includes(c.fit) ? c.fit : "cover";
  const transition = ["fade", "slide", "zoom", "cut"].includes(c.transition) ? c.transition : "fade";
  const active = mediaItems[activeIndex % Math.max(mediaItems.length, 1)];

  useEffect(() => {
    setActiveIndex(0);
  }, [mediaItems.length]);

  useEffect(() => {
    if (
      connectFourActive ||
      c.autoplay === false ||
      mediaItems.length <= 1
    ) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % mediaItems.length);
    }, slideMs);
    return () => window.clearInterval(timer);
  }, [c.autoplay, connectFourActive, mediaItems.length, slideMs]);

  useEffect(() => {
    if (!connectFourEnabled) setConnectFourActive(false);
  }, [connectFourEnabled]);

  const handleConnectFourVisibility = useCallback((visible) => {
    setConnectFourActive(visible);
  }, []);

  const rootStyle = {
    "--bsf-frame": c.frameColor || "#2f63c9",
    "--bsf-accent": c.accentColor || "#45c8ff",
    "--bsf-panel-hi": c.panelHi || "#0c1c40",
    "--bsf-bg": c.backgroundColor || "#0a1734",
    "--bsf-panel-lo": c.panelLo || "#081228",
    "--bsf-radius": `${clampNumber(c.radius, 0, 80, 12)}px`,
    "--bsf-border": `${clampNumber(c.borderWidth, 0, 10, 1)}px`,
    "--bsf-pad": `${clampNumber(c.padding, 0, 60, 8)}px`,
    "--bsf-glow": clampNumber(c.glow, 0, 160, 35) / 100,
    "--bsf-transition": `${transitionMs}ms`,
  };

  return (
    <div
      className="better-slideshow-frame"
      data-frame={frameStyle}
      data-fit={fit}
      data-transition={transition}
      data-connect-four={connectFourActive ? "active" : "idle"}
      style={rootStyle}
    >
      <span className="better-slideshow-frame__sheen" />
      <span className="better-slideshow-frame__inner" />
      <div className="better-slideshow-frame__viewport">
        <div className="better-slideshow-frame__media-layer">
          {active ? (
            active.type === "video" ? (
              <video
                key={`${active.id}-${activeIndex}`}
                className="better-slideshow-frame__media"
                src={active.url}
                autoPlay
                muted={c.videoMuted !== false}
                loop={c.videoLoop !== false}
                playsInline
                controls={c.showVideoControls === true}
                preload="auto"
                onEnded={() => {
                  if (
                    !connectFourActive &&
                    c.videoLoop === false &&
                    mediaItems.length > 1
                  ) {
                    setActiveIndex((index) =>
                      (index + 1) % mediaItems.length,
                    );
                  }
                }}
              />
            ) : (
              <img
                key={`${active.id}-${activeIndex}`}
                className="better-slideshow-frame__media"
                src={active.url}
                alt={active.label || "Slideshow media"}
                draggable={false}
              />
            )
          ) : (
            <div className="better-slideshow-frame__empty">
              <strong>Slideshow Frame</strong>
              <span>Add image or video links</span>
            </div>
          )}
        </div>
        {connectFourEnabled ? (
          <div
            className={`better-slideshow-frame__connect-four${connectFourActive ? " is-active" : ""}`}
          >
            <ConnectFourWidget
              config={{}}
              userId={userId}
              runtime={runtime}
              previewWhenIdle={false}
              winnerHideAfterMs={5_000}
              onVisibilityChange={handleConnectFourVisibility}
            />
          </div>
        ) : null}
      </div>
      {!connectFourActive && c.showCounter === true && mediaItems.length > 1 ? (
        <div className="better-slideshow-frame__counter">
          {activeIndex + 1}/{mediaItems.length}
        </div>
      ) : null}
    </div>
  );
}
