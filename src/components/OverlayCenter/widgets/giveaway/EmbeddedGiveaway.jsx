import React, { useLayoutEffect, useRef, useState } from "react";
import { SolverdeGiveawayNotice } from '../../../../effects/ThemeEffects/solverde/SolverdeTheme.jsx';

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
  const hasWinner = Boolean(config.winner);
  // Orbital, Arctic and Candy winner cards use the real chat bay so
  // their typography and spacing are not reduced by the legacy 420px canvas.
  const winnerTheme = String(config.colourTheme || layout.colourTheme || '').replace(/^theme_/, '');
  const nativeWinner = hasWinner && ['orbital', 'arctic', 'candy', 'volcanic', 'solverde','old_rome'].includes(winnerTheme);
  const premium=['orbital','arctic','candy','volcanic','solverde','old_rome'].includes(winnerTheme);
  const regularFrameHeight = bounded(premium&&(!layout.giveawayHeight||layout.giveawayHeight===250)?96:layout.giveawayHeight, 80, 600, 250);
  const winnerFrameHeight = bounded(premium&&(!layout.giveawayWinnerHeight||layout.giveawayWinnerHeight===180)?116:layout.giveawayWinnerHeight, 110, 320, winnerTheme === 'candy' ? 120 : 180);
  const frameHeight = hasWinner ? winnerFrameHeight : premium && config.spinningWinner ? Math.max(190,regularFrameHeight) : regularFrameHeight;
  const canvasHeight = hasWinner ? 190 : height;
  const margin = bounded(layout.giveawayMargin, 0, 30, 4);
  useLayoutEffect(() => {
    const element = frameRef.current;
    const measure = () => setSize({ width: element.clientWidth, height: element.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  // The embedded card follows the chat width so it reads as one continuous panel.
  // Height remains independently configurable and clips only when deliberately reduced.
  const scale = size.width > 0 ? Math.min(size.width / width,size.height/canvasHeight) : 1;
  return (
    <section ref={frameRef} className="ov-chat-giveaway" data-giveaway-theme={winnerTheme || undefined} data-giveaway-state={hasWinner ? "winner" : "active"} aria-label="Giveaway" style={{
      '--gw-result-surface': config.bgColor,
      '--gw-result-raised': config.panelHi,
      '--gw-result-background': config.panelLo,
      '--gw-result-border': config.lineColor,
      '--gw-result-text': config.textColor,
      '--gw-result-muted': config.mutedColor,
      '--gw-result-accent': config.accentColor,
      position: "relative", minWidth: 0, minHeight: 0, flex: `0 1 ${frameHeight}px`,
      height: frameHeight, maxHeight: `${bounded(layout.giveawayMaxHeight, 20, 80, 60)}%`,
      overflow: "hidden", margin: `${margin}px 0`, alignSelf: "stretch",
      width: "100%",
    }}>
      <div className="ov-chat-giveaway-canvas" data-native-winner={nativeWinner || undefined} style={nativeWinner || (premium&&!config.spinningWinner) || ['volcanic','solverde'].includes(winnerTheme) ? {
        position: 'absolute', inset: 0, width: '100%', height: '100%', containerType: 'size',
      } : {
        position: "absolute", width, height: canvasHeight, top: "50%", left: "50%",
        transform: `translate(-50%, -50%) scale(${scale})`, transformOrigin: "center",
      }}>{premium && !hasWinner && !config.spinningWinner ? <SolverdeGiveawayNotice config={config} /> : children}</div>
    </section>
  );
}
