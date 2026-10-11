import { useOverlayAssetAccess } from '../../../hooks/useOverlayAssetAccess';
import React from "react";
import {
  BACKGROUND_IMAGE_LIBRARY,
  BACKGROUND_VIDEO_LIBRARY,
} from "../widgets/background/backgroundLibrary";

export default function BackgroundLibraryPicker({ value, onChange, type = "image" }) {
  const access = useOverlayAssetAccess();
  const defaults = type === "video"
    ? BACKGROUND_VIDEO_LIBRARY
    : BACKGROUND_IMAGE_LIBRARY;

  const backgrounds = [...defaults, ...(access.assets || []).filter(a => a.kind === "background" && a.mediaType === type && !defaults.some(b => b.url === a.key)).map(a => ({ url: a.key, label: a.label }))].filter(b => access.canUse("background", b.url));
  return (
    <div
      className="bp-background-library"
      data-media-type={type}
      role="group"
      aria-label={`${type === "video" ? "Video background" : "Background"} library`}
    >
      {access.loading && <p role="status">Loading backgrounds…</p>}
      {access.error && <p role="alert">Could not load background access. <button type="button" onClick={access.retry}>Retry</button></p>}
      {backgrounds.map((background) => (
        <button
          key={background.url}
          type="button"
          aria-label={background.label}
          aria-pressed={value === background.url}
          title={background.label}
          onClick={() => onChange(background.url)}
        >
          {type === "video" ? (
            <video
              src={background.url}
              aria-hidden="true"
              muted
              loop
              playsInline
              preload="metadata"
              onMouseEnter={(event) => event.currentTarget.play().catch(() => {})}
              onMouseLeave={(event) => event.currentTarget.pause()}
            />
          ) : (
            <img src={background.url} alt="" loading="lazy" decoding="async" />
          )}
          <span>{background.label}</span>
        </button>
      ))}
    </div>
  );
}
