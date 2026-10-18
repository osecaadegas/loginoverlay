import React, { useEffect, useRef, useState } from "react";
import {
  buildSlotWindowSourceUrl,
  fitSlotWindowSource,
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
  const hostRef = useRef(null);
  const iframeRef = useRef(null);
  const [bounds, setBounds] = useState(null);
  const [reported, setReported] = useState(null);
  useEffect(() => {
    const element = hostRef.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      setBounds({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [sourceUrl]);
  useEffect(() => {
    if (!sourceUrl) return undefined;
    const origin = new URL(sourceUrl).origin;
    const receive = event => {
      if (event.origin !== origin || event.source !== iframeRef.current?.contentWindow || event.data?.type !== 'screensplit:source-size') return;
      const { width, height } = event.data;
      if (![width, height].every(value => Number.isInteger(value) && value > 0 && value <= 32768)) return;
      setReported(current => current?.sourceUrl === sourceUrl && current.width === width && current.height === height ? current : { sourceUrl, width, height });
    };
    window.addEventListener('message', receive);
    iframeRef.current?.contentWindow?.postMessage({ type: 'streamerscenter:request-source-size' }, origin);
    return () => window.removeEventListener('message', receive);
  }, [sourceUrl]);
  const size = reported?.sourceUrl === sourceUrl ? reported : null;
  const fitted = size && bounds ? fitSlotWindowSource(size.width, size.height, bounds.width, bounds.height) : null;
  const showSetup = !sourceUrl && runtime !== "obs" && !['starter_studio','galactic_command'].includes(normalized.colourTheme);

  if (!sourceUrl && !showSetup) return null;

  return (
    <section
      ref={hostRef}
      className="slot-window-widget"
      data-element-id="root"
      data-connected={sourceUrl ? "true" : "false"}
      data-mask-shape={normalized.maskShape}
      style={fitted ? undefined : outerMaskStyle(normalized)}
    >
      {sourceUrl ? (
        <iframe
          ref={iframeRef}
          key={sourceUrl}
          className="slot-window-widget__capture"
          data-element-id="capture"
          src={sourceUrl}
          title={getSlotWindowPanelLabel(normalized)}
          allow="local-network-access; local-network; loopback-network"
          sandbox="allow-scripts allow-same-origin"
          referrerPolicy="no-referrer"
          scrolling="no"
          onLoad={() => iframeRef.current?.contentWindow?.postMessage({ type: 'streamerscenter:request-source-size' }, new URL(sourceUrl).origin)}
          style={{ ...outerMaskStyle(normalized), ...(fitted ? { inset: 'auto', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: fitted.width, height: fitted.height } : {}) }}
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
