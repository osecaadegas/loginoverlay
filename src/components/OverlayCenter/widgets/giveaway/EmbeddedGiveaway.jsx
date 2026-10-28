import {GalacticGiveawayNotice} from '../../../../effects/ThemeEffects/galactic-command/GalacticCommandTheme.jsx';
import {StarterGiveawayNotice} from '../../../../effects/ThemeEffects/starter-studio/StarterStudioTheme.jsx';
import { StreetArtGiveawayNotice } from '../../../../effects/ThemeEffects/street-art/StreetArtTheme.jsx';
import React, { useLayoutEffect, useRef, useState } from "react";
import { getWidgetColourTheme } from '../shared/colourThemePalettes';
import './EmbeddedGiveaway.css';
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
  const drawing = !hasWinner && Boolean(config.spinningWinner);
  const streamerSourceChat = layout?.streamerOverlay?.role === "chat" || layout?.orientation === 'source_panel';
  const sourcePalette = getWidgetColourTheme(config.colourTheme || layout.colourTheme);
  const themedSource = layout?.orientation === 'source_panel' && layout?.streamerOverlay?.role !== 'chat';
  const compactSourceWinner = streamerSourceChat && hasWinner;
  // Orbital, Arctic and Candy winner cards use the real chat bay so
  // their typography and spacing are not reduced by the legacy 420px canvas.
  const winnerTheme = String(config.colourTheme || layout.colourTheme || '').replace(/^theme_/, '');
  const clearIceChatGiveaway = streamerSourceChat && winnerTheme === "clear_ice" && !hasWinner && !drawing;
  const nativeWinner = hasWinner && (streamerSourceChat || ['orbital', 'arctic', 'candy', 'volcanic', 'solverde','old_rome','street_art','starter_studio','galactic_command'].includes(winnerTheme));
  const premium=['orbital','arctic','candy','volcanic','solverde','old_rome','street_art','starter_studio','galactic_command'].includes(winnerTheme);
  const regularFrameHeight = bounded(premium&&(!layout.giveawayHeight||layout.giveawayHeight===250)?96:layout.giveawayHeight, ['street_art','starter_studio','galactic_command'].includes(winnerTheme) ? 44 : 80, 600, 250);
  const winnerFrameHeight = compactSourceWinner
    ? 78
    : bounded(premium&&(!layout.giveawayWinnerHeight||layout.giveawayWinnerHeight===180)?116:layout.giveawayWinnerHeight, 110, 320, winnerTheme === 'candy' ? 120 : 180);
  const frameHeight = hasWinner ? winnerFrameHeight : drawing ? Math.max(190,regularFrameHeight) : regularFrameHeight;
  const canvasHeight = hasWinner ? 190 : height;
  const margin = bounded(layout.giveawayMargin, 0, 30, 4);
  const sourceWinnerName = giveawayParticipantName(config.winner);
  const sourceWinnerParticipant = (config.participants || []).find((participant) =>
    giveawayParticipantName(participant).trim().toLowerCase() === sourceWinnerName.trim().toLowerCase(),
  );
  const sourceWinnerData = config.winner && typeof config.winner === "object"
    ? { ...(sourceWinnerParticipant || {}), ...config.winner }
    : sourceWinnerParticipant || {};
  const sourceWinnerAvatar = sourceWinnerData.avatarUrl || sourceWinnerData.profileImageUrl || sourceWinnerData.profile_image_url || sourceWinnerData.userAvatar || sourceWinnerData.photoUrl || "";
  const sourceKeyword = String(config.keyword || "").trim();
  const sourcePrize = String(config.prize || "").trim();
  const sourceEntryCount = Number.isFinite(Number(config.entryCount))
    ? Number(config.entryCount)
    : Number.isFinite(Number(config.totalParticipants))
      ? Number(config.totalParticipants)
      : (config.participants || []).length;
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
    <section ref={frameRef} className="ov-chat-giveaway" data-clear-ice-chat-giveaway={clearIceChatGiveaway ? "true" : undefined} data-streamer-source-chat={streamerSourceChat || undefined} data-giveaway-theme={winnerTheme || undefined} data-giveaway-state={hasWinner ? "winner" : drawing ? "drawing" : "active"} aria-label="Giveaway" style={{
      '--gw-result-surface': config.bgColor,
      '--gw-result-raised': config.panelHi,
      '--gw-result-background': config.panelLo,
      '--gw-result-border': config.lineColor,
      '--gw-result-text': config.textColor,
      '--gw-result-muted': config.mutedColor,
      '--gw-result-accent': config.accentColor,
      '--gw-embedded-reel': config.reelColor || config.panelLo || config.bgColor,
      position: "relative", minWidth: 0, minHeight: 0, flex: `0 1 ${frameHeight}px`,
      height: frameHeight, maxHeight: `${bounded(layout.giveawayMaxHeight, 20, 80, 60)}%`,
      overflow: "hidden", margin: compactSourceWinner ? `${Math.max(18, margin)}px auto 10px` : streamerSourceChat ? "12px 8px 10px" : `${margin}px 0`, alignSelf: compactSourceWinner ? "center" : "stretch",
      width: compactSourceWinner ? "min(204px, 100%)" : streamerSourceChat ? "calc(100% - 16px)" : "100%",
    }}>
      {streamerSourceChat && !drawing ? (
        <div
          className="ov-chat-giveaway-source-card"
          data-clear-ice-chat-giveaway={clearIceChatGiveaway ? "true" : undefined}
          data-native-winner={nativeWinner || undefined}
          role={hasWinner ? "status" : undefined}
          aria-live={hasWinner ? "polite" : undefined}
          aria-label={hasWinner ? `${sourceWinnerName} won the giveaway` : `${config.title || "Giveaway"}; ${sourceEntryCount} entries`}
          style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center", gap: 9,
            boxSizing: "border-box", padding: "9px 10px", overflow: "hidden", color: themedSource ? (config.textColor || sourcePalette?.text || '#fff') : "#fff",
            border: themedSource ? `1px solid ${config.lineColor || sourcePalette?.border || '#60a5fa'}` : "1px solid rgba(96,165,250,.3)", borderRadius: 12,
            background: themedSource ? `linear-gradient(135deg, ${config.bgColor || sourcePalette?.surface || '#1e3a8a'}, ${config.panelLo || sourcePalette?.background || '#1e40af'})` : "linear-gradient(135deg,#1e3a8a 0%,#1e40af 100%)",
            boxShadow: "0 8px 24px rgba(0,0,0,.28)", fontFamily: "Rubik, Inter, ui-sans-serif, system-ui, sans-serif",
          }}
        >
          {hasWinner ? (
            <>
              <div style={{ position: "relative", width: 44, height: 44, flex: "0 0 44px", display: "grid", placeItems: "center", overflow: "visible" }}>
                {sourceWinnerAvatar ? (
                  <img src={sourceWinnerAvatar} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} style={{ width: 42, height: 42, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(251,191,36,.55)" }} />
                ) : (
                  <span aria-hidden="true" style={{ display: "grid", placeItems: "center", width: 42, height: 42, borderRadius: "50%", border: "2px solid rgba(251,191,36,.55)", background: "rgba(255,255,255,.12)", fontSize: 14, fontWeight: 900 }}>{sourceWinnerName.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "W"}</span>
                )}
                <i style={{ position: "absolute", top: -4, left: -2, padding: "2px 5px", borderRadius: 7, background: themedSource ? sourcePalette?.raised : "#0b1730", border: themedSource ? `1px solid ${sourcePalette?.border}` : "1px solid rgba(255,255,255,.35)", color: themedSource ? sourcePalette?.text : "#fff", fontSize: 7, fontStyle: "normal", fontWeight: 900 }}>WIN</i>
              </div>
              <div style={{ display: "flex", minWidth: 0, flex: 1, flexDirection: "column", gap: 2 }}>
                <span style={{ overflow: "hidden", color: themedSource ? sourcePalette?.accent : "#93c5fd", fontSize: 8, fontWeight: 900, letterSpacing: ".12em", textOverflow: "ellipsis", textTransform: "uppercase", whiteSpace: "nowrap" }}>Giveaway complete</span>
                <strong title={sourceWinnerName} style={{ overflow: "hidden", fontSize: 12, fontWeight: 900, lineHeight: 1.1, textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sourceWinnerName}</strong>
                <span style={{ color: themedSource ? sourcePalette?.muted : "rgba(255,255,255,.72)", fontSize: 9, fontWeight: 600 }}>won the giveaway</span>
                {sourcePrize ? <span style={{ overflow: "hidden", color: themedSource ? sourcePalette?.accent : "#38bdf8", fontSize: 9, fontWeight: 900, textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sourcePrize}</span> : null}
              </div>
            </>
          ) : (
            clearIceChatGiveaway ? (
            <>
              <div className="ov-chat-giveaway-clear-ice-heading">
                <span aria-hidden="true">🎁</span>
                <strong>{config.title || "Flash giveaway"}</strong>
              </div>
              <strong className="ov-chat-giveaway-clear-ice-prize">{sourcePrize || "Giveaway"}</strong>
              <div className="ov-chat-giveaway-clear-ice-stats">
                <span><small>Keyword</small><strong>{sourceKeyword ? sourceKeyword.replace(/^!/, "") : "—"}</strong></span>
                <span><small>Entries</small><strong>{sourceEntryCount}</strong></span>
              </div>
            </>
            ) : (
            <>
              <span aria-hidden="true" style={{ flex: "0 0 auto", fontSize: 21 }}>🎁</span>
              <div style={{ display: "flex", minWidth: 0, flex: 1, flexDirection: "column", gap: 3 }}>
                <strong style={{ overflow: "hidden", color: themedSource ? sourcePalette?.text : "#fff", fontSize: 10, fontWeight: 900, letterSpacing: ".08em", textOverflow: "ellipsis", textTransform: "uppercase", whiteSpace: "nowrap" }}>{config.title || "Giveaway"}</strong>
                <span style={{ overflow: "hidden", color: themedSource ? sourcePalette?.muted : "#bfdbfe", fontSize: 9, fontWeight: 700, textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sourcePrize || (sourceKeyword ? `Type !${sourceKeyword.replace(/^!/, "")} to join` : "Live giveaway")}</span>
                <span style={{ color: themedSource ? sourcePalette?.accent : "#38bdf8", fontSize: 8, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase" }}>{sourceKeyword ? `${sourceKeyword.startsWith("!") ? sourceKeyword : `!${sourceKeyword}`}  ·  ` : ""}{sourceEntryCount} {sourceEntryCount === 1 ? "entry" : "entries"}</span>
              </div>
            </>
            )
          )}
        </div>
      ) : (
      <div className="ov-chat-giveaway-canvas" data-native-winner={nativeWinner || undefined} data-streamer-source-chat={streamerSourceChat || undefined} style={drawing || nativeWinner || streamerSourceChat || (premium&&!config.spinningWinner) || ['volcanic','solverde'].includes(winnerTheme) ? {
        position: 'absolute', inset: 0, width: '100%', height: '100%', containerType: 'size',
      } : {
        position: "absolute", width, height: canvasHeight, top: "50%", left: "50%",
        transform: `translate(-50%, -50%) scale(${scale})`, transformOrigin: "center",
      }}>{premium && !hasWinner && !config.spinningWinner ? winnerTheme==='galactic_command'?<GalacticGiveawayNotice config={config}/>:winnerTheme==='starter_studio'?<StarterGiveawayNotice config={config}/>:winnerTheme === 'street_art' ? <StreetArtGiveawayNotice config={config}/> : <SolverdeGiveawayNotice config={config} /> : children}</div>
      )}
    </section>
  );
}
