import React, { useLayoutEffect, useRef, useState } from "react";

export function giveawayParticipantName(value) {
  return typeof value === "string" ? value :
    value?.name || value?.username || value?.displayName || value?.login || "";
}

const bounded = (value, min, max, fallback) => Number.isFinite(Number(value))
  ? Math.min(max, Math.max(min, Number(value))) : fallback;

// Fit the actual giveaway canvas, including its roulette, without cropping it.
export default function EmbeddedGiveaway({ config, layout = {}, children }) {
  const frameRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const width = bounded(config.width, 240, 1600, 420);
  const height = bounded(config.height, 140, 900, 270);
  const frameHeight = bounded(layout.giveawayHeight, 80, 600, 250);
  const margin = bounded(layout.giveawayMargin, 0, 30, 4);
  useLayoutEffect(() => {
    const element = frameRef.current;
    const measure = () => setSize({ width: element.clientWidth, height: element.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const scale = Math.min(size.width / width, size.height / height, 1);
  return (
    <section ref={frameRef} className="ov-chat-giveaway" aria-label="Giveaway" style={{
      position: "relative", minWidth: 0, minHeight: 0, flex: `0 1 ${frameHeight}px`,
      height: frameHeight, maxHeight: `${bounded(layout.giveawayMaxHeight, 20, 80, 60)}%`,
      overflow: "hidden", margin: `${margin}px 0`, alignSelf: "center",
      width: `${bounded(layout.giveawayWidth, 30, 100, 100)}%`,
    }}>
      <div className="ov-chat-giveaway-canvas" style={{
        position: "absolute", width, height, top: "50%", left: "50%",
        transform: `translate(-50%, -50%) scale(${scale})`, transformOrigin: "center",
      }}>{children}</div>
    </section>
  );
}
