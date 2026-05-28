/**
 * BetsWidget.jsx — OBS overlay for live chat bracket betting.
 *
 * Modern dark-glass aesthetic matching the bonus hunt widget family.
 * Renders a list of bracket options with horizontal fill bars.
 * Driven entirely by config saved in overlay_widgets (JSONB).
 */
import React, { useState, useEffect, useMemo } from 'react';

function BetsWidget({ config }) {
  const c = config || {};
  const title      = c.question    || 'Place Your Bets';
  const status     = c.gameStatus  || 'idle';
  const winnerIdx  = c.winnerOption ?? null;
  const options    = c.options     || [];
  const bets       = c.bets        || {};
  const betters    = c.betters     || {};
  const timer      = c.timerSeconds || 0;
  const fund       = c.fundAmount  || 0;
  const currency   = c.currency    || '€';
  const cmd        = c.chatCommand || '!bet';
  const font       = c.fontFamily  || "'Inter', sans-serif";
  const layout     = c.displayStyle || 'v1_list';

  // -- Configurable CSS vars with silver/neutral defaults --
  const bgColor     = c.bgColor     || 'rgba(10, 14, 20, 0.94)';
  const headerBg    = c.headerBg    || 'rgba(255,255,255,0.04)';
  const headerText  = c.headerText  || '#eef2f5';
  const barBg       = c.barBg       || 'rgba(255,255,255,0.06)';
  const barFill     = c.barFill     || 'rgba(148,163,184,0.45)';
  const textColor   = c.textColor   || '#d4dce8';
  const accentColor = c.accentColor || '#b8c8d8';

  /* Countdown timer */
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

  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const totalPool = useMemo(
    () => options.reduce((sum, _, i) => sum + (bets[`opt_${i}`] || 0), 0),
    [options, bets]
  );
  const maxBet = useMemo(
    () => Math.max(1, ...options.map((_, i) => bets[`opt_${i}`] || 0)),
    [options, bets]
  );
  const totalBetters = Object.keys(betters).length;

  if (status === 'idle') return null;

  const statusLabel =
    status === 'open'   ? (countdown > 0 ? fmt(countdown) : 'OPEN') :
    status === 'locked' ? 'LOCKED' :
    status === 'result' ? 'RESULT' : '';

  const cssVars = {
    fontFamily: font,
    '--bets-bg':      bgColor,
    '--bets-hdr-bg':  headerBg,
    '--bets-hdr-txt': headerText,
    '--bets-bar-bg':  barBg,
    '--bets-bar-fill':barFill,
    '--bets-text':    textColor,
    '--bets-accent':  accentColor,
  };

  const isGrid = layout === 'v2_grid';

  return (
    <div className={`bets-ov bets-ov--${status}${isGrid ? ' bets-ov--grid' : ''}`} style={cssVars}>
      {/* ── Header ── */}
      <div className="bets-ov__header">
        <span className="bets-ov__title">
          {title}{fund > 0 ? ` · ${fund}${currency}` : ''}
        </span>
        {status === 'result' && <span className="bets-ov__trophy">🏆</span>}
        <span className={`bets-ov__status bets-ov__status--${status}`}>
          {status === 'open' && '●'} {statusLabel}
        </span>
      </div>

      {/* ── Stats row ── */}
      <div className="bets-ov__stats">
        <div className="bets-ov__stat">
          <span className="bets-ov__stat-val">{totalPool.toLocaleString()}</span>
          <span className="bets-ov__stat-lbl">Pool</span>
        </div>
        <div className="bets-ov__stat bets-ov__stat--center">
          <span className="bets-ov__stat-val bets-ov__stat-val--timer">
            {status === 'open' && countdown > 0 ? fmt(countdown) :
             status === 'open' ? '∞' :
             status === 'locked' ? '🔒' : '🏆'}
          </span>
          <span className="bets-ov__stat-lbl">
            {status === 'open' ? 'Timer' : 'Status'}
          </span>
        </div>
        <div className="bets-ov__stat">
          <span className="bets-ov__stat-val">{totalBetters}</span>
          <span className="bets-ov__stat-lbl">Bets</span>
        </div>
      </div>

      {/* ── Bracket options ── */}
      {isGrid ? (
        /* Grid layout: cards with vertical fill bars */
        <div className="bets-ov__grid">
          {options.map((opt, i) => {
            const amount  = bets[`opt_${i}`] || 0;
            const pct     = totalPool > 0 ? Math.round((amount / totalPool) * 100) : 0;
            const fillH   = maxBet > 0 ? (amount / maxBet) * 100 : 0;
            const isWin   = winnerIdx === i;
            const isLose  = winnerIdx !== null && winnerIdx !== i;
            const label   = (opt.label || `Option ${i + 1}`).replace(/\s*-\s*!bet\s*\d+$/i, '');
            return (
              <div key={i} className={`bets-ov__card${isWin ? ' bets-ov__card--win' : ''}${isLose ? ' bets-ov__card--lose' : ''}`}>
                <div className="bets-ov__card-fill" style={{ height: `${fillH}%` }} />
                <div className="bets-ov__card-body">
                  {isWin && <span className="bets-ov__card-crown">👑</span>}
                  <span className="bets-ov__card-label">{label}</span>
                  <span className="bets-ov__card-pct">{pct}%</span>
                  <span className="bets-ov__card-cmd">{cmd} {i + 1}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List layout: horizontal bar rows (default) */
        <div className="bets-ov__list">
          {options.map((opt, i) => {
            const amount  = bets[`opt_${i}`] || 0;
            const pct     = totalPool > 0 ? Math.round((amount / totalPool) * 100) : 0;
            const isWin   = winnerIdx === i;
            const isLose  = winnerIdx !== null && winnerIdx !== i;
            const label   = (opt.label || `Option ${i + 1}`).replace(/\s*-\s*!bet\s*\d+$/i, '');
            return (
              <div key={i} className={`bets-ov__row${isWin ? ' bets-ov__row--win' : ''}${isLose ? ' bets-ov__row--lose' : ''}`}>
                <div className="bets-ov__row-meta">
                  <span className="bets-ov__row-cmd">{cmd} {i + 1}</span>
                  <span className="bets-ov__row-label">{isWin ? '👑 ' : ''}{label}</span>
                  <span className="bets-ov__row-pct">{pct}%</span>
                </div>
                <div className="bets-ov__row-bar">
                  <div className="bets-ov__row-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Chat hint when open ── */}
      {status === 'open' && (
        <div className="bets-ov__hint">
          Type <strong>{cmd} &lt;number&gt;</strong> to bet
        </div>
      )}
    </div>
  );
}

export default BetsWidget;
