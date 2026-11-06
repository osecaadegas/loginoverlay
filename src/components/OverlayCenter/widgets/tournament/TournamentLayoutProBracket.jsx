import React from "react";
import ShatterEffect from "./ShatterEffect";
import { ProPlayerAvatar, ProSlotCard } from "./TournamentLayoutPro";
import { calcRoundWinner, getBoScoreboard } from "./tournamentEngine";
import { getProBracketComparison, getProBracketStage } from "./proBracketStage";
import { normalizeProCinematicSettings } from "./proVisualEvents";
import useProCinematics from "./useProCinematics";
import { subValue } from "../shared/appearanceStyles";
import "./TournamentLayoutProBracket.css";

const label = (value, fallback) => value && value !== "TBD" ? value : fallback;
const displayStage = (stage) => stage?.matches?.length === 1 ? "GRAND FINAL" : stage?.matches?.length === 2 ? "SEMI-FINALS" : stage?.matches?.length === 4 ? "QUARTER-FINALS" : String(stage?.label || "TOURNAMENT").toUpperCase();
const textStyle = (config, id) => ({ color: subValue(config, id, "textColor", undefined), fontSize: subValue(config, id, "fontSize", undefined), fontFamily: subValue(config, id, "fontFamily", undefined), fontWeight: subValue(config, id, "fontWeight", undefined), letterSpacing: subValue(config, id, "letterSpacing", undefined) });
const matchScore = (match) => getBoScoreboard(match) || (match?.rounds || []).reduce((score, round) => {
  const winner = calcRoundWinner(round, match?.type);
  if (winner === "player1") score.p1Wins += 1;
  if (winner === "player2") score.p2Wins += 1;
  return score;
}, { p1Wins: 0, p2Wins: 0 });

function Player({ match, side, showAvatar, config }) {
  const key = side === "left" ? "player1" : "player2";
  const name = label(match?.[`${key}Profile`]?.username || match?.[key], `Player ${side === "left" ? 1 : 2}`);
  return <span className={`tw-pro-bracket-player tw-pro-bracket-player--${side}`} title={name} data-widget-element="playerName" data-appearance-part="playerName" style={textStyle(config, "playerName")}>
    {side === "left" && showAvatar && <ProPlayerAvatar url={match?.[`${key}Avatar`] || match?.[`${key}Profile`]?.avatarUrl} />}
    <strong>{name}</strong>
    {side === "right" && showAvatar && <ProPlayerAvatar url={match?.[`${key}Avatar`] || match?.[`${key}Profile`]?.avatarUrl} />}
  </span>;
}

function MatchPanel({ match, index, stageCount, config, currency, shatterInfo, playingEvent, showAvatar, showValues }) {
  const comparison = getProBracketComparison(match);
  const eventRound = playingEvent?.matchId === String(match?.id) && Number.isInteger(playingEvent.roundIndex) ? playingEvent.roundIndex : null;
  const roundIndex = eventRound ?? comparison.index;
  const round = match?.rounds?.[roundIndex] || comparison.round;
  const result = eventRound === null ? comparison.result : round?.winner;
  const score = matchScore(match);
  const winner = match?.winner;
  const active = match?.status === "in_progress";
  return <section className={`tw-pro-round tw-pro-bracket-match${active ? " tw-pro-round--active" : ""}`} data-pro-match-id={match?.id} data-pro-round={roundIndex} data-round-state={winner ? "completed" : active ? "active" : "pending"}>
    <div className="tw-pro-bracket-match-heading">
      <span>{stageCount === 1 ? "GRAND FINAL" : `${stageCount === 4 ? "QF" : stageCount === 2 ? "SF" : "MATCH"}${index + 1}`}</span>
      <span className="tw-pro-bracket-match-status">{winner ? "FINAL" : active ? "LIVE" : "PENDING"}</span>
    </div>
    <div className="tw-pro-bracket-players">
      <Player match={match} side="left" showAvatar={showAvatar} config={config} />
      <div className="tw-pro-bracket-score" aria-label={`${score.p1Wins} to ${score.p2Wins}`} data-widget-element="scoreValue" data-appearance-part="scoreValue" style={textStyle(config, "scoreValue")}><b data-pro-score="left" data-canonical={score.p1Wins}>{score.p1Wins}</b><span>–</span><b data-pro-score="right" data-canonical={score.p2Wins}>{score.p2Wins}</b></div>
      <Player match={match} side="right" showAvatar={showAvatar} config={config} />
    </div>
    <div className={`tw-pro-round-grid${showValues ? "" : " tw-pro-bracket-hide-values"}`}>
      <ProSlotCard match={match} round={round} side="left" result={result} currency={currency} config={config} shatterTarget={Boolean(shatterInfo?.matchId && String(shatterInfo.matchId) === String(match?.id) && shatterInfo.side === "left")} />
      <span className="tw-pro-vs" role="img" aria-label="versus"><span>V</span><span>S</span></span>
      <ProSlotCard match={match} round={round} side="right" result={result} currency={currency} config={config} shatterTarget={Boolean(shatterInfo?.matchId && String(shatterInfo.matchId) === String(match?.id) && shatterInfo.side === "right")} />
    </div>
  </section>;
}

export default function TournamentLayoutProBracket({ config = {}, allMatches = [], selectedMatch, shatterInfo: externalShatterInfo, onShatterComplete: externalShatterComplete, previewStageIndex, previewReplayKey = 0 }) {
  const motion = normalizeProCinematicSettings(config);
  const cinematicEnabled = motion.preset === "cinematic" && motion.enabled;
  const cinematic = useProCinematics({ allMatches, match: selectedMatch, tournamentId: config.data?.tournamentId || allMatches[0]?.id, settings: motion, enabled: cinematicEnabled, startSignal: config.bracketPhase || (config.data?.active ? "active" : "setup") });
  const shatterInfo = cinematicEnabled ? cinematic.shatterInfo : externalShatterInfo;
  const onShatterComplete = cinematicEnabled ? cinematic.onShatterComplete : externalShatterComplete;
  const bracketData = config.bracketData || [];
  const current = getProBracketStage(bracketData);
  const holdId = cinematic.heldMatchId || shatterInfo?.matchId;
  const held = holdId ? bracketData.findIndex((stage) => stage.matches?.some((match) => String(match.id) === String(holdId))) : -1;
  const requestedStageIndex = Number.isInteger(previewStageIndex) && bracketData[previewStageIndex] ? previewStageIndex : held >= 0 ? held : current?.index;
  const [stageIndex, setStageIndex] = React.useState(requestedStageIndex);
  const [transition, setTransition] = React.useState("");
  const displayedStage = React.useRef(requestedStageIndex);
  const previousChampion = React.useRef(null);
  const requestedCount = bracketData[requestedStageIndex]?.matches?.length || 0;
  React.useEffect(() => {
    if (requestedStageIndex === displayedStage.current) return undefined;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (config.animationPreset === "none" || (config.animationPreset === "cinematic" && config.cinematicEnabled === false) || config.enableRoundTransitions === false || reduced || previewStageIndex !== undefined) {
      displayedStage.current = requestedStageIndex;
      setStageIndex(requestedStageIndex);
      setTransition("");
      return undefined;
    }
    setTransition("exit");
    const enter = window.setTimeout(() => {
      displayedStage.current = requestedStageIndex;
      setStageIndex(requestedStageIndex);
      setTransition("stage");
    }, 370);
    const done = window.setTimeout(() => setTransition(""), requestedCount === 1 ? 2400 : 1900);
    return () => { window.clearTimeout(enter); window.clearTimeout(done); };
  }, [requestedStageIndex, requestedCount, config.animationPreset, config.cinematicEnabled, config.enableRoundTransitions, previewStageIndex]);
  const stage = bracketData[stageIndex];
  const matches = stage?.matches || [];
  const champion = current?.champion && stageIndex === current.index && !shatterInfo && !cinematic.heldMatchId ? current.champion : null;
  const count = matches.length;
  const bestOfThree = matches.every((match) => ["bonus_bo3", "bonus_bo3_classic"].includes(match.type));
  const currency = config.currency || config.arenaCurrency || "€";
  React.useEffect(() => {
    const key = `${config.data?.tournamentId || ""}:${Boolean(champion)}:${previewReplayKey}`;
    if (previousChampion.current === null) { previousChampion.current = key; return undefined; }
    if (previousChampion.current === key) return undefined;
    previousChampion.current = key;
    if ((!previewReplayKey && config.animationPreset === "none") || (config.animationPreset === "cinematic" && config.cinematicEnabled === false) || config.enableChampionReveal === false || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;
    if (!champion && !previewReplayKey) return undefined;
    setTransition(champion ? "champion" : "stage");
    const timeout = window.setTimeout(() => setTransition(""), champion ? 6200 : 1900);
    return () => window.clearTimeout(timeout);
  }, [champion, previewReplayKey, config.data?.tournamentId, config.animationPreset, config.cinematicEnabled, config.enableChampionReveal]);
  const finalMatch = count === 1 ? matches[0] : null;
  const finalScore = finalMatch ? matchScore(finalMatch) : null;
  return <div className={`tw-pro tw-pro-bracket tw-pro-bracket--${count === 4 ? "quarter" : count === 2 ? "semi" : "final"}`} ref={cinematic.rootRef} data-layout="pro_bracket" data-stage={stageIndex} data-stage-transition={transition || undefined} data-animation-preset={config.animationPreset || "subtle"} data-widget-element="container" data-appearance-part="container"
    style={{ fontFamily: subValue(config, "container", "fontFamily", config.styleConfigs?.pro?.fontFamily || config.fontFamily || "'Rajdhani', sans-serif"), borderRadius: subValue(config, "container", "radius", config.styleConfigs?.pro?.borderRadius ?? config.borderRadius ?? 20), borderColor: subValue(config, "container", "borderColor", config.styleConfigs?.pro?.borderColor || undefined), background: config.showBg === false ? "transparent" : subValue(config, "container", "background", config.styleConfigs?.pro?.bgColor || undefined), "--pro-cyan": config.styleConfigs?.pro?.multiColor || undefined, "--bracket-ray-opacity": .18 + .3 * Math.max(0, Math.min(1, Number(config.cinematicIntensity ?? 100) / 100)) }}>
    <header className="tw-pro-header" data-widget-element="header" data-appearance-part="header">
      <span className="tw-pro-crown" aria-hidden="true"><svg viewBox="0 0 64 48" fill="none"><path d="M5 13 15 32 31 9 47 32 59 13 54 40H10L5 13Z" stroke="currentColor" strokeWidth="4" strokeLinejoin="round"/><path d="M11 44h43" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/></svg></span>
      <h2 style={textStyle(config, "header")}>BONUS BUY TOURNAMENT</h2><p><span>{bestOfThree ? "BEST OF 3" : "MATCH"}</span></p>
    </header>
    {stage ? <>
      <div className="tw-pro-bracket-stage-title" data-widget-element="roundHeading" data-appearance-part="roundHeading" style={textStyle(config, "roundHeading")}><strong>{displayStage(stage)}</strong><span>{count} {count === 1 ? "MATCH" : "MATCHES"}</span></div>
      {finalMatch && <div className="tw-pro-scoreboard tw-pro-bracket-final-scoreboard"><Player match={finalMatch} side="left" showAvatar={config.showBracketAvatars !== false} config={config} /><div className="tw-pro-score" aria-label={`${finalScore.p1Wins} to ${finalScore.p2Wins}`} data-widget-element="scoreValue" data-appearance-part="scoreValue" style={textStyle(config, "scoreValue")}>{finalScore.p1Wins}<span>–</span>{finalScore.p2Wins}</div><Player match={finalMatch} side="right" showAvatar={config.showBracketAvatars !== false} config={config} /></div>}
      <div className="tw-pro-rounds tw-pro-bracket-matches" style={{ "--bracket-count": count }}>
        {matches.map((match, index) => <MatchPanel key={match.id || index} match={match} index={index} stageCount={count} config={config} currency={currency} shatterInfo={shatterInfo} playingEvent={cinematic.playingEvent} showAvatar={config.showBracketAvatars !== false} showValues={config.showBracketCostPay !== false} />)}
      </div>
      <footer className="tw-pro-footer tw-pro-bracket-footer" data-widget-element="statusBadge" data-appearance-part="statusBadge" style={{ background: subValue(config, "statusBadge", "background", config.styleConfigs?.pro?.statusBadgeBg || undefined), borderColor: subValue(config, "statusBadge", "borderColor", undefined), borderRadius: subValue(config, "statusBadge", "radius", undefined) }}><small>{champion ? "TOURNAMENT CHAMPION" : "CURRENT STAGE"}</small><strong style={textStyle(config, "statusBadge")}>{champion ? champion.name : displayStage(stage)}</strong></footer>
    </> : <div className="tw-pro-empty">No active bracket</div>}
    {champion && <div className={`tw-pro-bracket-champion${transition === "champion" ? " tw-pro-bracket-champion--reveal" : ""}`} aria-label={`Tournament champion: ${champion.name}`}>
      <div className="tw-pro-bracket-champion-rays" aria-hidden="true" />
      <div className="tw-pro-bracket-champion-crown" aria-hidden="true">♛</div>
      <ProPlayerAvatar url={champion.avatar} /><small>TOURNAMENT CHAMPION</small><strong>{champion.name}</strong>
      {Array.from({ length: 12 }, (_, index) => <i className="tw-pro-bracket-ice" key={index} style={{ "--ice-index": index }} aria-hidden="true" />)}
    </div>}
    {shatterInfo && <ShatterEffect imageUrl={shatterInfo.imageUrl} side={shatterInfo.side} ice accentColor="#00d9ff" targetSelector='[data-pro-shatter-target="true"]' onComplete={onShatterComplete} />}
  </div>;
}
