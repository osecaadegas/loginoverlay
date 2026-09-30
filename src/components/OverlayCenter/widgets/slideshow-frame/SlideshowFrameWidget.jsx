import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ConnectFourWidget from "../connect-four/ConnectFourWidget";
import {
  resolveVideoEndHoldMs,
  shouldAdvanceCompletedVideo,
  shouldLoopVideo,
  shouldUseSlideTimer,
} from "./slideshowPlayback";
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
    const parts = item
      .split("|")
      .map((part) => part.trim())
      .filter(Boolean);
    const url = parts[0] || "";
    const explicitType = ["image", "video"].includes(parts[1]) ? parts[1] : "";
    return {
      id: `media-${index}`,
      url,
      type: explicitType || mediaTypeFromUrl(url),
      label: explicitType ? parts[2] || "" : parts[1] || "",
    };
  }

  const url = item?.url || item?.src || item?.imageUrl || item?.videoUrl || "";
  const type = ["image", "video"].includes(item?.type)
    ? item.type
    : mediaTypeFromUrl(url);
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
    return config.mediaItems.map(normalizeMediaItem).filter((item) => item.url);
  }
  if (Array.isArray(config.mediaUrls) && config.mediaUrls.length) {
    return config.mediaUrls.map(normalizeMediaItem).filter((item) => item.url);
  }
  return parseMediaText(config.mediaText);
}

export default function SlideshowFrameWidget({
  config,
  userId,
  runtime = "editor",
}) {
  const c = config || {};
  const mediaItems = useMemo(
    () => getMediaItems(c),
    [c.mediaItems, c.mediaText, c.mediaUrls],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [outgoingSlide, setOutgoingSlide] = useState(null);
  const [videoEnded, setVideoEnded] = useState(false);
  const [connectFourActive, setConnectFourActive] = useState(false);
  const activeIndexRef = useRef(0);
  const videoRef = useRef(null);
  const connectFourEnabled = c.showConnectFour === true;
  const slideMs = clampNumber(c.slideMs, 1000, 60000, 5000);
  const transitionMs = clampNumber(
    c.transitionMs,
    0,
    Math.min(2500, slideMs - 100),
    650,
  );
  const videoEndHoldMs = resolveVideoEndHoldMs(c.videoEndHoldMs);
  const frameStyle = [
    "neon",
    "glass",
    "metal",
    "minimal",
    "film",
    "none",
  ].includes(c.frameStyle)
    ? c.frameStyle
    : "neon";
  const fit = ["cover", "contain", "fill", "scale-down"].includes(c.fit)
    ? c.fit
    : "cover";
  const transition = ["fade", "slide", "zoom", "cut"].includes(c.transition)
    ? c.transition
    : "fade";
  const active = mediaItems[activeIndex % Math.max(mediaItems.length, 1)];
  const advanceSlide = useCallback(() => {
    if (mediaItems.length <= 1) return;
    const currentIndex = activeIndexRef.current % mediaItems.length;
    const nextIndex = (currentIndex + 1) % mediaItems.length;
    setOutgoingSlide({
      item: mediaItems[currentIndex],
      index: currentIndex,
      key: `${mediaItems[currentIndex]?.id || "media"}-${currentIndex}`,
    });
    activeIndexRef.current = nextIndex;
    setActiveIndex(nextIndex);
  }, [mediaItems]);

  useEffect(() => {
    activeIndexRef.current = 0;
    setActiveIndex(0);
    setOutgoingSlide(null);
    setVideoEnded(false);
  }, [mediaItems.length]);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
    setVideoEnded(false);
  }, [active?.id, activeIndex]);

  useEffect(() => {
    if (!outgoingSlide) return undefined;
    const timer = window.setTimeout(
      () => setOutgoingSlide(null),
      Math.max(0, transitionMs),
    );
    return () => window.clearTimeout(timer);
  }, [outgoingSlide, transitionMs]);

  useEffect(() => {
    if (
      !shouldUseSlideTimer({
        autoplay: c.autoplay,
        connectFourActive,
        itemCount: mediaItems.length,
        activeType: active?.type,
      })
    ) {
      return undefined;
    }
    const timer = window.setTimeout(advanceSlide, slideMs);
    return () => window.clearTimeout(timer);
  }, [
    active?.id,
    active?.type,
    activeIndex,
    advanceSlide,
    c.autoplay,
    connectFourActive,
    mediaItems.length,
    slideMs,
  ]);

  useEffect(() => {
    if (
      !videoEnded ||
      !shouldAdvanceCompletedVideo({
        autoplay: c.autoplay,
        connectFourActive,
        itemCount: mediaItems.length,
      })
    ) {
      return undefined;
    }
    const timer = window.setTimeout(advanceSlide, videoEndHoldMs);
    return () => window.clearTimeout(timer);
  }, [
    advanceSlide,
    c.autoplay,
    connectFourActive,
    mediaItems.length,
    videoEndHoldMs,
    videoEnded,
  ]);

  useEffect(() => {
    if (!connectFourEnabled) setConnectFourActive(false);
  }, [connectFourEnabled]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (connectFourActive) {
      video.pause();
      return;
    }
    if (videoEnded) return;
    video.play().catch(() => {});
  }, [active?.id, connectFourActive, videoEnded]);

  const handleConnectFourVisibility = useCallback((visible) => {
    setConnectFourActive(visible);
  }, []);

  const rootStyle = {
    "--bsf-frame": c.frameColor || "#2f63c9",
    "--bsf-accent": c.accentColor || "#45c8ff",
    "--bsf-panel-hi": c.panelHi || "#0c1c40",
    "--bsf-bg": c.backgroundColor || "#0a1734",
    "--bsf-panel-lo": c.panelLo || "#081228",
    "--bsf-text": c.textColor || "#f8fafc",
    "--bsf-muted": c.mutedColor || "#9dbdf2",
    "--bsf-radius": `${clampNumber(c.radius, 0, 80, 12)}px`,
    "--bsf-border": `${clampNumber(c.borderWidth, 0, 10, 1)}px`,
    "--bsf-pad": `${clampNumber(c.padding, 0, 60, 8)}px`,
    "--bsf-glow": clampNumber(c.glow, 0, 160, 35) / 100,
    "--bsf-transition": `${transitionMs}ms`,
    "--bsf-video-hold": `${videoEndHoldMs}ms`,
  };

  const renderMedia = (item, index, current = false) => {
    if (!item) return null;
    if (item.type === "video") {
      return (
        <video
          ref={current ? videoRef : undefined}
          className="better-slideshow-frame__media"
          src={item.url}
          autoPlay={current}
          muted={c.videoMuted !== false}
          loop={shouldLoopVideo({
            itemCount: mediaItems.length,
            videoLoop: c.videoLoop,
          })}
          playsInline
          controls={current && c.showVideoControls === true}
          preload="auto"
          onEnded={current ? () => setVideoEnded(true) : undefined}
        />
      );
    }
    return (
      <img
        className="better-slideshow-frame__media"
        src={item.url}
        alt={item.label || "Slideshow media"}
        draggable={false}
      />
    );
  };

  return (
    <div
      className="better-slideshow-frame"
      data-frame={frameStyle}
      data-fit={fit}
      data-transition={transition}
      data-playback-state={videoEnded ? "holding" : "playing"}
      data-connect-four={connectFourActive ? "active" : "idle"}
      data-colour-theme={
        String(c.colourTheme || "").replace(/^theme_/, "") || undefined
      }
      style={rootStyle}
    >
      <span className="better-slideshow-frame__sheen" />
      <span className="better-slideshow-frame__inner" />
      <div className="better-slideshow-frame__viewport">
        <div className="better-slideshow-frame__media-layer">
          {active ? (
            <>
              {outgoingSlide ? (
                <div
                  key={outgoingSlide.key}
                  className="better-slideshow-frame__slide is-leaving"
                  aria-hidden="true"
                >
                  {renderMedia(outgoingSlide.item, outgoingSlide.index, false)}
                </div>
              ) : null}
              <div
                key={`${active.id}-${activeIndex}`}
                className={`better-slideshow-frame__slide is-current${outgoingSlide ? " is-entering" : ""}`}
              >
                {renderMedia(active, activeIndex, true)}
              </div>
            </>
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
              embedded
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
