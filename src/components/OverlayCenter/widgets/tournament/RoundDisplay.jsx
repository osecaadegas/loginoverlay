/**
 * RoundDisplay — Renders one round's data for overlay display.
 * Shows both players' input values and the round winner.
 * Works for all tournament types by reading the round data generically.
 */
import React from 'react';
import { calcRoundResult, calcRoundWinner, formatResult } from './tournamentEngine';

export default function RoundDisplay({
  round,
  type,           // 'spins' | 'bonus' | 'bonus_bo3'
  roundNum,
  player1Name,
  player2Name,
  currency = '€',
  accentColor = '#22c55e',
  loseColor = '#ef4444',
  drawColor = '#eab308',
  fontFamily = "'Inter', sans-serif",
  compact = false,
}) {
  const p1Result = calcRoundResult(round.player1, type);
  const p2Result = calcRoundResult(round.player2, type);
  const winner = calcRoundWinner(round, type);
  const isComplete = winner !== null;

  const getResultStyle = (playerKey) => {
    if (!isComplete) return { color: '#94a3b8' };
    const isWinner = winner === playerKey;
    const isDraw = winner === 'draw';
    const result = playerKey === 'player1' ? p1Result : p2Result;
    return {
      color: isWinner ? accentColor : isDraw ? drawColor : loseColor,
      fontWeight: isWinner ? 800 : 600,
    };
  };

  const inputLabel = type === 'spins' ? 'Profit' : 'Net Profit';

  return (
    <div className="te-round" style={{
      display: 'flex', alignItems: 'center', gap: compact ? 6 : 12,
      padding: compact ? '4px 8px' : '6px 12px',
      background: isComplete ? 'rgba(255,255,255,0.03)' : 'transparent',
      borderRadius: 8,
      border: `1px solid ${isComplete ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)'}`,
      fontFamily, position: 'relative',
    }}>
      {/* Round label (for bo3) */}
      {roundNum !== undefined && (
        <div style={{
          fontSize: compact ? 9 : 10, fontWeight: 700, color: '#64748b',
          textTransform: 'uppercase', letterSpacing: '1px',
          minWidth: compact ? 16 : 24, textAlign: 'center', flexShrink: 0,
        }}>
          R{roundNum}
        </div>
      )}

      {/* Player 1 result */}
      <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
        <div style={{
          fontSize: compact ? 10 : 11, color: '#64748b',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {compact ? '' : player1Name}
        </div>
        <div style={{ fontSize: compact ? 12 : 14, ...getResultStyle('player1') }}>
          {formatResult(p1Result, currency)}
        </div>
      </div>

      {/* VS divider */}
      <div style={{
        fontSize: compact ? 9 : 11, fontWeight: 800, color: '#475569',
        flexShrink: 0,
      }}>
        {isComplete && winner === 'player1' ? '◀' : isComplete && winner === 'player2' ? '▶' : 'VS'}
      </div>

      {/* Player 2 result */}
      <div style={{ flex: 1, textAlign: 'right', minWidth: 0 }}>
        <div style={{
          fontSize: compact ? 10 : 11, color: '#64748b',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {compact ? '' : player2Name}
        </div>
        <div style={{ fontSize: compact ? 12 : 14, ...getResultStyle('player2') }}>
          {formatResult(p2Result, currency)}
        </div>
      </div>
    </div>
  );
}
