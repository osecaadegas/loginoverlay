/**
 * PredictionsWidget.jsx — OBS overlay for Bonus Hunt Predictions.
 *
 * Viewers bet SE points on payout bracket outcomes via !bet <number> <amount>.
 * Displays a title, countdown timer, fund total, and horizontal progress bars
 * for each bracket option — styled like the classic dark-blue betting widget.
 */
import React, { useState, useEffect, useMemo } from 'react';

function PredictionsWidget({ config }) {
  const c = config || {};
  const title = c.question || 'Total do Bónus Hunt?';
  const status = c.gameStatus || 'idle'; // idle | open | locked | result
  const winnerIdx = c.winnerOption ?? null;
  const options = c.options || [];
  const bets = c.bets || {};       // { opt_0: 1200, opt_1: 300, ... }
  const betters = c.betters || {};  // { username: { option: idx, amount: n } }
  const timer = c.timerSeconds || 0;
  const fund = c.fundAmount || 0;
  const currency = c.currency || '€';
  const font = c.fontFamily || "'Inter', sans-serif";
  const headerBg = c.headerBg || '#2a4a6b';
  const headerText = c.headerText || '#e8d48b';
  const barBg = c.barBg || '#3a5a7a';
  const barFill = c.barFill || '#c4a44a';
  const textColor = c.textColor || '#c8d8e8';
  const bgColor = c.bgColor || '#1e3550';

  /* Countdown */
  const [countdown, setCountdown] = useState(0);
  useEffect(() => {
    if (status !== 'open' || !c._openedAt || timer <= 0) { setCountdown(0); return; }
    const update = () => {
      const elapsed = Math.floor((Date.now() - c._openedAt) / 1000);
      setCountdown(Math.max(0, timer - elapsed));
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [status, c._openedAt, timer]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  /* Calculate totals per option */
  const totalPool = useMemo(() => {
    return options.reduce((sum, _, i) => sum + (bets[`opt_${i}`] || 0), 0);
  }, [options, bets]);

  const maxBet = useMemo(() => {
    return Math.max(1, ...options.map((_, i) => bets[`opt_${i}`] || 0));
  }, [options, bets]);

  const totalBetters = Object.keys(betters).length;

  if (status === 'idle') return null; // Don't show when idle

  return (
    <div className="bh-pred" style={{ fontFamily: font, '--bh-pred-bg': bgColor, '--bh-pred-header-bg': headerBg, '--bh-pred-header-text': headerText, '--bh-pred-bar-bg': barBg, '--bh-pred-bar-fill': barFill, '--bh-pred-text': textColor }}>
      {/* Header */}
      <div className="bh-pred__header">
        <span className="bh-pred__title">{title} {fund > 0 ? `${fund}${currency}` : ''}</span>
        {status === 'result' && <span className="bh-pred__trophy">🏆</span>}
      </div>

      {/* Stats row: Timer + Fund */}
      <div className="bh-pred__stats">
        <div className="bh-pred__stat-box">
          <span className="bh-pred__stat-val">
            {status === 'open' && countdown > 0 ? formatTime(countdown) : status === 'open' ? 'OPEN' : status === 'locked' ? 'LOCKED' : 'RESULT'}
          </span>
          <span className="bh-pred__stat-label">Time</span>
        </div>
        <div className="bh-pred__stat-box">
          <span className="bh-pred__stat-val">{totalBetters}</span>
          <span className="bh-pred__stat-label">Bets</span>
        </div>
      </div>

      {/* Options list */}
      <div className="bh-pred__options">
        {options.map((opt, i) => {
          const amount = bets[`opt_${i}`] || 0;
          const pct = totalPool > 0 ? Math.round((amount / totalPool) * 100) : 0;
          const barW = maxBet > 0 ? (amount / maxBet) * 100 : 0;
          const isWinner = winnerIdx === i;
          const isLoser = winnerIdx !== null && winnerIdx !== i;

          return (
            <div key={i} className={`bh-pred__option${isWinner ? ' bh-pred__option--winner' : ''}${isLoser ? ' bh-pred__option--loser' : ''}`}>
              <span className="bh-pred__option-label">{opt.label || `Option ${i + 1}`}</span>
              <div className="bh-pred__option-bar-wrap">
                <div className="bh-pred__option-bar" style={{ width: `${barW}%` }} />
                {pct > 0 && <span className="bh-pred__option-pct">{pct}%</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Chat hint */}
      {status === 'open' && (
        <div className="bh-pred__hint">
          Type <strong>{c.commandTrigger || '!bet'} &lt;number&gt; &lt;amount&gt;</strong> to bet
        </div>
      )}
    </div>
  );
}

export default React.memo(PredictionsWidget);
