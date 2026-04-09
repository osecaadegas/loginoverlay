/**
 * PlayerCard — Reusable player display for all tournament types.
 * Shows player name, result value, and win/loss/draw status.
 * Used in both the overlay widget and the admin config panel.
 */
import React from 'react';
import { formatResult } from './tournamentEngine';

export default function PlayerCard({
  name,
  result,         // number | null — the calculated profit/net or multiplier sum
  isWinner,       // boolean
  isLoser,        // boolean
  isDraw,         // boolean
  currency = '€',
  resultMode,     // 'multiplier' for bo3_classic
  accentColor = '#22c55e',
  loseColor = '#ef4444',
  drawColor = '#eab308',
  nameColor = '#ffffff',
  nameSize = 14,
  resultSize = 16,
  fontFamily = "'Inter', sans-serif",
  eliminatedOpacity = 0.35,
  compact = false,
  showBadge = true,
  style = {},
}) {
  const op = isLoser ? eliminatedOpacity : 1;
  const resultColor = result === null ? '#64748b'
    : result > 0 ? accentColor
    : result < 0 ? loseColor
    : drawColor;

  const badge = isWinner ? { text: '👑 WIN', bg: `${accentColor}25`, border: accentColor, color: accentColor }
    : isDraw ? { text: '🤝 DRAW', bg: `${drawColor}25`, border: drawColor, color: drawColor }
    : null;

  return (
    <div className="te-player-card" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: compact ? 2 : 4,
      opacity: op, fontFamily, transition: 'opacity 0.3s',
      ...style,
    }}>
      {/* Player name */}
      <div style={{
        fontSize: nameSize, fontWeight: 700, color: nameColor,
        textTransform: 'uppercase', letterSpacing: '0.5px',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        maxWidth: '100%', textAlign: 'center',
      }}>
        {name || 'Player'}
      </div>

      {/* Result value */}
      <div style={{
        fontSize: resultSize, fontWeight: 800, color: resultColor,
        fontFamily, letterSpacing: '0.3px',
      }}>
        {formatResult(result, currency, resultMode)}
      </div>

      {/* Win/Draw badge */}
      {showBadge && badge && (
        <div style={{
          fontSize: compact ? 9 : 11, fontWeight: 700,
          padding: compact ? '1px 6px' : '2px 8px',
          borderRadius: 6,
          background: badge.bg,
          border: `1px solid ${badge.border}`,
          color: badge.color,
          textTransform: 'uppercase', letterSpacing: '0.5px',
        }}>
          {badge.text}
        </div>
      )}
    </div>
  );
}
