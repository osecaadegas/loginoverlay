import React from "react";
import SlotImage from "../SlotImage";
import ShatterEffect from "./ShatterEffect";
import { calcMatchWinner, calcRoundWinner, getBoScoreboard } from "./tournamentEngine";
import { subValue } from "../shared/appearanceStyles";
import "./TournamentLayoutPro.css";

const element = (id) => ({ "data-widget-element": id, "data-appearance-part": id });

function textAppearance(config, id, fallback = {}) {
  return {
    color: subValue(config, id, "textColor", fallback.color),
    fontSize: subValue(config, id, "fontSize", fallback.fontSize),
    fontFamily: subValue(config, id, "fontFamily", fallback.fontFamily),
    fontWeight: subValue(config, id, "fontWeight", fallback.fontWeight),
    letterSpacing: subValue(config, id, "letterSpacing", fallback.letterSpacing),
  };
}

function money(value, currency) {
  if (value === null || value === undefined || value === "") return "—";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return `${currency}${amount.toFixed(2)}`;
}

function ProSlotCard({ match, round, side, result, currency, config, shatterTarget }) {
  const playerKey = side === "left" ? "player1" : "player2";
  const slot = round?.[side === "left" ? "slot1" : "slot2"] || match?.[side === "left" ? "slot1" : "slot2"];
  const values = round?.[playerKey];
  const isWinner = result === playerKey;
  const isLoser = result && result !== "draw" && !isWinner;
  return (
    <div className={`tw-pro-card${isWinner ? " tw-pro-card--winner" : ""}${isLoser ? " tw-pro-card--loser" : ""}`} data-pro-shatter-target={shatterTarget ? "true" : undefined} {...element("matchCard")}
      style={{
        background: subValue(config, "matchCard", "background", config.styleConfigs?.pro?.cardBg || undefined),
        borderColor: subValue(config, "matchCard", "borderColor", config.styleConfigs?.pro?.cardBorder || undefined),
        borderWidth: subValue(config, "matchCard", "borderWidth", config.styleConfigs?.pro?.cardBorderWidth || undefined),
        borderRadius: subValue(config, "matchCard", "radius", config.styleConfigs?.pro?.cardRadius || undefined),
        boxShadow: subValue(config, "matchCard", "shadow", undefined),
      }}>
      <div className="tw-pro-art" {...element("slotImage")}
        style={{ borderRadius: subValue(config, "slotImage", "radius", undefined), opacity: subValue(config, "slotImage", "opacity", undefined), borderColor: subValue(config, "slotImage", "borderColor", undefined), borderWidth: subValue(config, "slotImage", "borderWidth", undefined) }}>
        {slot?.image ? <>
          <SlotImage src={slot.image} alt="" className="tw-pro-art-backdrop" fit="cover" aria-hidden="true" />
          <SlotImage src={slot.image} alt={slot.name || "Slot artwork"} className="tw-pro-art-main" fit={subValue(config, "slotImage", "imageFit", "contain")} />
        </> : <span className="tw-pro-art-empty">No artwork</span>}
        {isWinner && <span className="tw-pro-win-tag">WIN</span>}
      </div>
      <div className="tw-pro-card-copy">
        <strong className="tw-pro-slot-name" {...element("slotName")} title={slot?.name || "Slot pending"}
          style={textAppearance(config, "slotName")}>{slot?.name || "Slot pending"}</strong>
        <span className="tw-pro-provider" {...element("provider")} title={slot?.provider || slot?.provider_name || ""}
          style={textAppearance(config, "provider")}>{slot?.provider || slot?.provider_name || "—"}</span>
        <div className="tw-pro-values">
          <span><small {...element("statLabel")} style={textAppearance(config, "statLabel")}>COST</small><b {...element("statValue")} style={textAppearance(config, "statValue")}>{money(values?.bonusCost, currency)}</b></span>
          <span><small {...element("statLabel")} style={textAppearance(config, "statLabel")}>PAY</small><b {...element("statValue")} style={textAppearance(config, "statValue")}>{money(values?.bonusPayout, currency)}</b></span>
        </div>
      </div>
    </div>
  );
}

export default function TournamentLayoutPro({ match, config, shatterInfo, onShatterComplete }) {
  const c = config || {};
  const currency = c.currency || c.arenaCurrency || "€";
  const rounds = Array.from({ length: 3 }, (_, index) => match?.rounds?.[index] || null);
  const scoreboard = Array.isArray(match?.rounds) ? getBoScoreboard(match) : null;
  const results = rounds.map((round, index) => scoreboard?.roundResults?.[index]?.winner ?? (round ? calcRoundWinner(round, match.type) : null));
  const p1Wins = scoreboard?.p1Wins ?? results.filter((winner) => winner === "player1").length;
  const p2Wins = scoreboard?.p2Wins ?? results.filter((winner) => winner === "player2").length;
  const winner = match?.winner || calcMatchWinner(match);
  const firstOpen = results.findIndex((result) => result === null);
  const currentRound = firstOpen >= 0 ? firstOpen + 1 : Math.min(match?.rounds?.length || 1, 3);
  const playerOne = match?.player1 || "Player 1";
  const playerTwo = match?.player2 || "Player 2";
  const completed = Boolean(winner);
  const lastPlayedRound = results.findLastIndex((result) => result !== null);

  return (
    <div className="tw-pro" data-layout="pro" {...element("container")}
      style={{
        fontFamily: subValue(c, "container", "fontFamily", c.styleConfigs?.pro?.fontFamily || c.fontFamily || "'Rajdhani', sans-serif"),
        borderRadius: subValue(c, "container", "radius", c.styleConfigs?.pro?.borderRadius ?? c.borderRadius ?? 20),
        borderColor: subValue(c, "container", "borderColor", c.styleConfigs?.pro?.borderColor || undefined),
        background: c.showBg === false ? "transparent" : subValue(c, "container", "background", c.styleConfigs?.pro?.bgColor || undefined),
        "--pro-cyan": c.styleConfigs?.pro?.multiColor || "#00d9ff",
      }}>
      <header className="tw-pro-header" {...element("header")}>
        <span className="tw-pro-crown" aria-hidden="true"><svg viewBox="0 0 64 48" fill="none"><path d="M5 13 15 32 31 9 47 32 59 13 54 40H10L5 13Z" stroke="currentColor" strokeWidth="4" strokeLinejoin="round"/><path d="M11 44h43" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/></svg></span>
        <h2 style={textAppearance(c, "header")}>BONUS BUY TOURNAMENT</h2>
        <p><span>BEST OF 3</span></p>
      </header>
      {match ? <>
        <div className="tw-pro-scoreboard">
          <div className={`tw-pro-player${p1Wins > p2Wins ? " tw-pro-player--leading" : ""}`} {...element("playerName")} title={playerOne}
            style={textAppearance(c, "playerName", { color: c.styleConfigs?.pro?.nameColor, fontSize: c.styleConfigs?.pro?.nameSize })}>
            <span className="tw-pro-person" aria-hidden="true"><svg viewBox="0 0 32 32"><circle cx="16" cy="9" r="6"/><path d="M3 30v-3c0-7 5-11 13-11s13 4 13 11v3Z"/></svg></span><strong>{playerOne}</strong>
          </div>
          <div className="tw-pro-score" key={`${p1Wins}:${p2Wins}`} {...element("scoreValue")}
            style={textAppearance(c, "scoreValue", { fontSize: c.styleConfigs?.pro?.multiSize })}>
            {p1Wins}<span>–</span>{p2Wins}
          </div>
          <div className={`tw-pro-player tw-pro-player--right${p2Wins > p1Wins ? " tw-pro-player--leading" : ""}`} {...element("playerName")} title={playerTwo}
            style={textAppearance(c, "playerName", { color: c.styleConfigs?.pro?.nameColor, fontSize: c.styleConfigs?.pro?.nameSize })}>
            <strong>{playerTwo}</strong><span className="tw-pro-person" aria-hidden="true"><svg viewBox="0 0 32 32"><circle cx="16" cy="9" r="6"/><path d="M3 30v-3c0-7 5-11 13-11s13 4 13 11v3Z"/></svg></span>
          </div>
        </div>
        <div className="tw-pro-rounds">
          {rounds.map((round, index) => {
            const result = results[index];
            const state = result ? "completed" : !completed && index + 1 === currentRound ? "active" : "pending";
            return <section className={`tw-pro-round tw-pro-round--${state}`} key={index} data-round-state={state}>
              <div className="tw-pro-round-heading" {...element("roundHeading")}
                style={textAppearance(c, "roundHeading")}>ROUND {index + 1}</div>
              <div className="tw-pro-round-grid">
                <ProSlotCard match={match} round={round} side="left" result={result} currency={currency} config={c} shatterTarget={Boolean(shatterInfo && index === lastPlayedRound && shatterInfo.side === "left")} />
                <span className="tw-pro-vs" aria-hidden="true">VS</span>
                <ProSlotCard match={match} round={round} side="right" result={result} currency={currency} config={c} shatterTarget={Boolean(shatterInfo && index === lastPlayedRound && shatterInfo.side === "right")} />
              </div>
            </section>;
          })}
        </div>
        <footer className={`tw-pro-footer${completed ? " tw-pro-footer--complete" : ""}`} {...element("statusBadge")}
          style={{ background: subValue(c, "statusBadge", "background", c.styleConfigs?.pro?.statusBadgeBg || undefined), borderColor: subValue(c, "statusBadge", "borderColor", undefined), borderRadius: subValue(c, "statusBadge", "radius", undefined) }}>
          <small>{completed ? "MATCH COMPLETE" : "CURRENT ROUND"}</small>
          <strong style={textAppearance(c, "statusBadge")}>{completed ? winner === "draw" ? "DRAW" : winner === "player1" ? playerOne : playerTwo : `ROUND ${currentRound}`}</strong>
        </footer>
      </> : <div className="tw-pro-empty" {...element("emptyState")}>No active tournament</div>}
      {shatterInfo && <ShatterEffect
        imageUrl={shatterInfo.imageUrl}
        side={shatterInfo.side}
        ice
        accentColor="#00d9ff"
        targetSelector='[data-pro-shatter-target="true"]'
        onComplete={onShatterComplete}
      />}
    </div>
  );
}
