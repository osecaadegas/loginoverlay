/**
 * MatchCard — Reusable match display component.
 * Shows two players with a VS divider, slot name, match type badge,
 * and for Bo3 matches shows round score indicators.
 * Used in both admin panel and overlay widget.
 */
import React from 'react';
import PlayerCard from './PlayerCard';
import {
  calcRoundResult,
  calcMatchWinner,
  getBoScoreboard,
  TOURNAMENT_TYPES,
  MATCH_STATUS,
} from './tournamentEngine';

export default function MatchCard({
  match,
  isCurrent = false,
  compact = false,
  showSlotName = true,
  showTypeBadge = false,
  /* colors */
  accentColor = '#22c55e',
  loseColor = '#ef4444',
  drawColor = '#eab308',
  swordColor = '#eab308',
  nameColor = '#ffffff',
  cardBg = '#1a1d2e',
  cardBorder = 'rgba(255,255,255,0.08)',
  cardRadius = 10,
  cardBorderWidth = 1,
  fontFamily = "'Inter', sans-serif",
  nameSize = 13,
  resultSize = 15,
  eliminatedOpacity = 0.35,
  currency = '€',
  style = {},
  onClick,
}) {
  if (!match) return null;

  const winner = match.winner ?? calcMatchWinner(match);
  const isComplete = match.status === MATCH_STATUS.COMPLETED || winner != null;
  const p1IsWinner = winner === 'player1';
  const p2IsWinner = winner === 'player2';
  const isDraw = winner === 'draw';

  /* Calculate overall result per player */
  const getPlayerResult = (playerKey) => {
    if (match.type === 'bonus_bo3') {
      // Sum net-profit across all completed rounds
      let total = 0;
      let anyComplete = false;
      for (const round of match.rounds) {
        const r = calcRoundResult(round[playerKey], match.type);
        if (r !== null) { total += r; anyComplete = true; }
      }
      return anyComplete ? total : null;
    }
    // Single-round type
    return calcRoundResult(match.rounds[0]?.[playerKey], match.type);
  };

  const p1Result = getPlayerResult('player1');
  const p2Result = getPlayerResult('player2');

  /* Bo3 scoreboard */
  const scoreboard = match.type === 'bonus_bo3' ? getBoScoreboard(match) : null;

  return (
    <div
      className="te-match-card"
      onClick={onClick}
      style={{
        background: cardBg,
        border: `${cardBorderWidth}px solid ${isCurrent ? swordColor : cardBorder}`,
        borderRadius: cardRadius,
        padding: compact ? '6px 8px' : '10px 14px',
        display: 'flex', alignItems: 'center', gap: compact ? 6 : 12,
        position: 'relative', overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        fontFamily,
        transition: 'border-color 0.2s, box-shadow 0.2s',
        ...(isCurrent ? {
          animation: 'tw-current-glow 2s ease-in-out infinite',
        } : {}),
        ...style,
      }}
    >
      {/* Player 1 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <PlayerCard
          name={match.player1}
          result={p1Result}
          isWinner={p1IsWinner}
          isLoser={!isDraw && isComplete && !p1IsWinner}
          isDraw={isDraw}
          currency={currency}
          accentColor={accentColor}
          loseColor={loseColor}
          drawColor={drawColor}
          nameColor={nameColor}
          nameSize={nameSize}
          resultSize={resultSize}
          fontFamily={fontFamily}
          eliminatedOpacity={eliminatedOpacity}
          compact={compact}
          showBadge={!compact}
        />
      </div>

      {/* Center: VS / sword / type badge */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        flexShrink: 0,
      }}>
        {/* Type badge */}
        {showTypeBadge && (
          <div style={{
            fontSize: 9, fontWeight: 700, color: swordColor,
            textTransform: 'uppercase', letterSpacing: '0.6px',
            opacity: 0.8,
          }}>
            {TOURNAMENT_TYPES[match.type]?.icon} {match.type === 'bonus_bo3' ? 'Bo3' : match.type === 'spins' ? 'Spins' : 'Bonus'}
          </div>
        )}

        {/* VS / ✕ icon */}
        <div style={{
          width: compact ? 28 : 36, height: compact ? 28 : 36,
          borderRadius: '50%',
          background: `${swordColor}18`,
          border: `2px solid ${swordColor}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: compact ? 12 : 14, fontWeight: 800,
          color: swordColor,
          ...(isCurrent ? { animation: 'tw-sword-swing 1.2s ease-in-out infinite' } : { transform: 'none' }),
        }}>
          {isComplete ? '✕' : '⚔️'}
        </div>

        {/* Slot name(s) */}
        {showSlotName && (match.slot1?.name || match.slot2?.name) && (
          <div style={{
            fontSize: compact ? 8 : 10, fontWeight: 600,
            color: '#94a3b8', textAlign: 'center',
            maxWidth: 80, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            textTransform: 'uppercase', letterSpacing: '0.3px',
          }}>
            {match.slot1?.name === match.slot2?.name
              ? match.slot1?.name
              : [match.slot1?.name, match.slot2?.name].filter(Boolean).join(' / ')}
          </div>
        )}

        {/* Bo3 round dots */}
        {scoreboard && (
          <div style={{ display: 'flex', gap: 3 }}>
            {scoreboard.roundResults.map((rr, i) => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: '50%',
                background: rr.winner === 'player1' ? accentColor
                  : rr.winner === 'player2' ? loseColor
                  : rr.winner === 'draw' ? drawColor
                  : 'rgba(255,255,255,0.15)',
                transition: 'background 0.2s',
              }} />
            ))}
          </div>
        )}
      </div>

      {/* Player 2 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <PlayerCard
          name={match.player2}
          result={p2Result}
          isWinner={p2IsWinner}
          isLoser={!isDraw && isComplete && !p2IsWinner}
          isDraw={isDraw}
          currency={currency}
          accentColor={accentColor}
          loseColor={loseColor}
          drawColor={drawColor}
          nameColor={nameColor}
          nameSize={nameSize}
          resultSize={resultSize}
          fontFamily={fontFamily}
          eliminatedOpacity={eliminatedOpacity}
          compact={compact}
          showBadge={!compact}
        />
      </div>
    </div>
  );
}
