import React from "react";
import {
  buildSlotWindowSourceUrl,
  getSlotWindowPanelLabel,
  sanitizeSlotWindowConfig,
} from "./slotWindowModel";
import "./SlotWindowWidget.css";

function outerMaskStyle(config) {
  if (config.maskShape === "ellipse") {
    return {
      borderRadius: "50%",
      clipPath: "ellipse(50% 50% at 50% 50%)",
      WebkitClipPath: "ellipse(50% 50% at 50% 50%)",
    };
  }
  if (config.maskShape === "angled") {
    const clipPath =
      "polygon(4% 0,96% 0,100% 7%,100% 93%,96% 100%,4% 100%,0 93%,0 7%)";
    return {
      clipPath,
      WebkitClipPath: clipPath,
    };
  }
  if (config.maskShape === "rounded") {
    const radii = `${config.cornerTopLeft}px ${config.cornerTopRight}px ${config.cornerBottomRight}px ${config.cornerBottomLeft}px`;
    const clipPath = `inset(0 round ${radii})`;
    return {
      borderRadius: radii,
      clipPath,
      WebkitClipPath: clipPath,
    };
  }
  return {
    borderRadius: 0,
    clipPath: "inset(0)",
    WebkitClipPath: "inset(0)",
  };
}

export default function SlotWindowWidget({ config = {}, runtime = "editor" }) {
  const normalized = sanitizeSlotWindowConfig(config);
  const sourceUrl = buildSlotWindowSourceUrl(normalized);
  const showSetup = !sourceUrl && runtime !== "obs";

  if (!sourceUrl && !showSetup) return null;

  return (
    <section
      className="slot-window-widget"
      data-element-id="root"
      data-connected={sourceUrl ? "true" : "false"}
      data-mask-shape={normalized.maskShape}
      style={outerMaskStyle(normalized)}
    >
      {sourceUrl ? (
        <iframe
          key={sourceUrl}
          className="slot-window-widget__capture"
          data-element-id="capture"
          src={sourceUrl}
          title={getSlotWindowPanelLabel(normalized)}
          allow="local-network-access; local-network; loopback-network"
          sandbox="allow-scripts allow-same-origin"
          referrerPolicy="no-referrer"
          scrolling="no"
        />
      ) : (
        <div className="slot-window-widget__setup" data-element-id="emptyState">
          <span aria-hidden="true">▣</span>
          <strong>Slot Window</strong>
          <p>In ScreenSplit, isolate the slot and press Export.</p>
          <small>Paste the copied link in Source below.</small>
        </div>
      )}
    </section>
  );
}
