/**
 * PredictionsWidget.jsx — OBS overlay for Predictions community game.
 * Shows a prediction question with two outcomes and live vote/bet bars.
 */
import React, { useState, useEffect } from 'react';

function PredictionsWidget({ config }) {
  const c = config || {};
  const question = c.question || 'Who will win?';
  const optionA = c.optionA || 'Option A';
  const optionB = c.optionB || 'Option B';
  const betsA = c.betsA || 0;
  const betsB = c.betsB || 0;
  const total = betsA + betsB;
  const pctA = total > 0 ? Math.round((betsA / total) * 100) : 50;
  const pctB = 100 - pctA;
  const status = c.gameStatus || 'idle'; // idle | open | locked | result
  const winner = c.winner || null; // 'a' | 'b' | null
  const accent = c.accentColor || '#7c3aed';
  const colorA = c.colorA || '#3b82f6';
  const colorB = c.colorB || '#ef4444';
  const font = c.fontFamily || "'Inter', sans-serif";
  const timer = c.timerSeconds || 0;

  /* Countdown display */
  const [countdown, setCountdown] = useState(0);
  useEffect(() => {
    if (status !== 'open' || !c._openedAt || timer <= 0) { setCountdown(0); return; }
    const update = () => {
      const elapsed = Math.floor((Date.now() - c._openedAt) / 1000);
      const remaining = Math.max(0, timer - elapsed);
      setCountdown(remaining);
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [status, c._openedAt, timer]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}:${sec.toString().padStart(2, '0')}` : `${sec}s`;
  };

  return (
    <div className="cg-predict" style={{ '--accent': accent, '--colorA': colorA, '--colorB': colorB, fontFamily: font }}>
      {/* Status */}
      <div className={`cg-predict__status cg-predict__status--${status}`}>
        {status === 'idle' && '⏸ Waiting'}
        {status === 'open' && (countdown > 0 ? `🟢 ${formatTime(countdown)} left` : '🟢 Bets Open')}
        {status === 'locked' && '🔒 Locked'}
        {status === 'result' && '🏆 Result!'}
      </div>

      {/* Question */}
      <div className="cg-predict__question">{question}</div>

      {/* Two options side by side */}
      <div className="cg-predict__options">
        <div className={`cg-predict__option cg-predict__option--a ${winner === 'a' ? 'cg-predict__option--winner' : ''} ${winner === 'b' ? 'cg-predict__option--loser' : ''}`}>
          <div className="cg-predict__option-bar" style={{ height: `${pctA}%`, background: colorA }} />
          <div className="cg-predict__option-content">
            <span className="cg-predict__option-label">{optionA}</span>
            <span className="cg-predict__option-pct">{pctA}%</span>
            <span className="cg-predict__option-pts">{betsA.toLocaleString()} pts</span>
          </div>
          {winner === 'a' && <div className="cg-predict__option-crown">👑</div>}
        </div>

        <div className="cg-predict__vs">VS</div>

        <div className={`cg-predict__option cg-predict__option--b ${winner === 'b' ? 'cg-predict__option--winner' : ''} ${winner === 'a' ? 'cg-predict__option--loser' : ''}`}>
          <div className="cg-predict__option-bar" style={{ height: `${pctB}%`, background: colorB }} />
          <div className="cg-predict__option-content">
            <span className="cg-predict__option-label">{optionB}</span>
            <span className="cg-predict__option-pct">{pctB}%</span>
            <span className="cg-predict__option-pts">{betsB.toLocaleString()} pts</span>
          </div>
          {winner === 'b' && <div className="cg-predict__option-crown">👑</div>}
        </div>
      </div>

      {/* Pool total */}
      {total > 0 && (
        <div className="cg-predict__pool">
          Pool: {total.toLocaleString()} pts
        </div>
      )}
    </div>
  );
}

export default React.memo(PredictionsWidget);
