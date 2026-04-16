/**
 * PredictionsWidget.jsx — OBS overlay for Bonus Hunt Predictions.
 *
 * 4×2 grid of bracket cards with vertical fill bars.
 * Viewers bet SE points on payout bracket outcomes via !bet <number> <amount>.
 */
import React, { useState, useEffect, useMemo } from 'react';

function PredictionsWidget({ config }) {
  const c = config || {};
  const title = c.question || 'Total do Bónus Hunt?';
  const status = c.gameStatus || 'idle';
  const winnerIdx = c.winnerOption ?? null;
  const options = c.options || [];
  const bets = c.bets || {};
  const betters = c.betters || {};
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

  const totalPool = useMemo(() => {
    return options.reduce((sum, _, i) => sum + (bets[`opt_${i}`] || 0), 0);
  }, [options, bets]);

  const maxBet = useMemo(() => {
    return Math.max(1, ...options.map((_, i) => bets[`opt_${i}`] || 0));
  }, [options, bets]);

  const totalBetters = Object.keys(betters).length;

  if (status === 'idle') return null;

  return (
    <div className="bh-pred" style={{ fontFamily: font, '--bh-pred-bg': bgColor, '--bh-pred-header-bg': headerBg, '--bh-pred-header-text': headerText, '--bh-pred-bar-bg': barBg, '--bh-pred-bar-fill': barFill, '--bh-pred-text': textColor }}>
      {/* Header */}
      <div className="bh-pred__header">
        <span className="bh-pred__title">{title} {fund > 0 ? `${fund}${currency}` : ''}</span>
        {status === 'result' && <span className="bh-pred__trophy">🏆</span>}
      </div>

      {/* Stats row */}
      <div className="bh-pred__stats">
        <div className="bh-pred__stat-box">
          <span className="bh-pred__stat-val">
            {status === 'open' && countdown > 0 ? formatTime(countdown) : status === 'open' ? 'OPEN' : status === 'locked' ? 'LOCKED' : 'RESULT'}
          </span>
          <span className="bh-pred__stat-label">Time</span>
        </div>
        <div className="bh-pred__stat-box">
          <span className="bh-pred__stat-val">{totalPool.toLocaleString()}</span>
          <span className="bh-pred__stat-label">Pool</span>
        </div>
        <div className="bh-pred__stat-box">
          <span className="bh-pred__stat-val">{totalBetters}</span>
          <span className="bh-pred__stat-label">Bets</span>
        </div>
      </div>

      {/* 4×2 Grid of bracket cards */}
      <div className="bh-pred__grid">
        {options.map((opt, i) => {
          const amount = bets[`opt_${i}`] || 0;
          const pct = totalPool > 0 ? Math.round((amount / totalPool) * 100) : 0;
          const fillH = maxBet > 0 ? (amount / maxBet) * 100 : 0;
          const isWinner = winnerIdx === i;
          const isLoser = winnerIdx !== null && winnerIdx !== i;

          // Short label: strip the "- !bet N" part for display
          const shortLabel = (opt.label || `Option ${i + 1}`).replace(/\s*-\s*!bet\s*\d+$/i, '');

          return (
            <div key={i} className={`bh-pred__card${isWinner ? ' bh-pred__card--winner' : ''}${isLoser ? ' bh-pred__card--loser' : ''}`}>
              <div className="bh-pred__card-fill" style={{ height: `${fillH}%` }} />
              <div className="bh-pred__card-content">
                {isWinner && <span className="bh-pred__card-crown">👑</span>}
                <span className="bh-pred__card-label">{shortLabel}</span>
                <span className="bh-pred__card-pct">{pct}%</span>
                <span className="bh-pred__card-cmd">!bet {i + 1}</span>
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
