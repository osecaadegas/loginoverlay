/**
 * SaltyWordsWidget.jsx — OBS overlay for Salty Words community game.
 * Displays a grid of words with vote/bet counts. Streamer picks the word,
 * viewers who bet on it win.
 */
import React from 'react';

function SaltyWordsWidget({ config }) {
  const c = config || {};
  const words = c.words || [];
  const status = c.gameStatus || 'idle'; // idle | open | reveal | result
  const selectedWord = c.selectedWord || null;
  const accent = c.accentColor || '#f59e0b';
  const font = c.fontFamily || "'Inter', sans-serif";
  const title = c.title || 'Salty Words';
  const totalBets = words.reduce((sum, w) => sum + (w.bets || 0), 0);

  return (
    <div className="cg-salty" style={{ '--accent': accent, fontFamily: font }}>
      {/* Title */}
      <div className="cg-salty__header">
        <span className="cg-salty__title">{title}</span>
        <span className={`cg-salty__status cg-salty__status--${status}`}>
          {status === 'idle' && '⏸ Waiting'}
          {status === 'open' && '🟢 Bets Open'}
          {status === 'reveal' && '👀 Revealing...'}
          {status === 'result' && '🏆 Result!'}
        </span>
      </div>

      {/* Word grid */}
      <div className="cg-salty__grid">
        {words.map((w, i) => {
          const isSelected = selectedWord === i;
          const percent = totalBets > 0 ? Math.round(((w.bets || 0) / totalBets) * 100) : 0;
          return (
            <div
              key={i}
              className={`cg-salty__word ${isSelected ? 'cg-salty__word--selected' : ''} ${status === 'result' && !isSelected ? 'cg-salty__word--dimmed' : ''}`}
            >
              <div className="cg-salty__word-bar" style={{ width: `${percent}%` }} />
              <span className="cg-salty__word-text">{w.text || `Word ${i + 1}`}</span>
              <div className="cg-salty__word-meta">
                <span className="cg-salty__word-bets">{(w.bets || 0).toLocaleString()} pts</span>
                {totalBets > 0 && <span className="cg-salty__word-pct">{percent}%</span>}
              </div>
              {isSelected && (
                <div className="cg-salty__word-crown">👑</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pool info */}
      {totalBets > 0 && (
        <div className="cg-salty__pool">
          Total Pool: {totalBets.toLocaleString()} pts
        </div>
      )}

      {/* Empty state */}
      {words.length === 0 && (
        <div className="cg-salty__empty">
          No words added yet. Set up the game in the config panel.
        </div>
      )}
    </div>
  );
}

export default React.memo(SaltyWordsWidget);
