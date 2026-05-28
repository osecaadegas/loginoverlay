/**
 * BetsWidget.jsx — OBS overlay for live chat bracket betting.
 *
 * Modern dark-glass aesthetic matching the bonus hunt widget family.
 * Grid layout: 2 cols for ≤6 options (2×3 for 6), 3 cols for 7–9, 4 cols for 10+.
 * Animations: entry stagger, leading-bet pulse, winner celebration.
 */
import React, { useState, useEffect, useMemo } from 'react';

/** Dynamic grid columns based on option count */
function getGridCols(count) {
  if (count <= 6) return 2;
  if (count <= 9) return 3;
  return 4;
}

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

  /* Leading card detection — pulses when clearly ahead */
  const pcts = useMemo(
    () => options.map((_, i) => totalPool > 0 ? Math.round((bets[`opt_${i}`] || 0) / totalPool * 100) : 0),
    [options, bets, totalPool]
  );
  const leadingIdx = useMemo(() => {
    if (status !== 'open' || totalPool === 0) return -1;
    const maxPct = Math.max(...pcts);
    if (maxPct < 25) return -1; // not dominant enough yet
    const sorted = [...pcts].sort((a, b) => b - a);
    const secondPct = sorted[1] ?? 0;
    if (maxPct < secondPct + 15) return -1; // gap too small
    return pcts.indexOf(maxPct);
  }, [status, pcts, totalPool]);

  if (status === 'idle') return null;

  const statusLabel =
    status === 'open'   ? (countdown > 0 ? fmt(countdown) : 'OPEN') :
    status === 'locked' ? 'LOCKED' :
    status === 'result' ? 'RESULT' : '';

  const isGrid = layout === 'v2_grid';
  const gridCols = getGridCols(options.length);

  const cssVars = {
    fontFamily: font,
    '--bets-bg':      bgColor,
    '--bets-hdr-bg':  headerBg,
    '--bets-hdr-txt': headerText,
    '--bets-bar-bg':  barBg,
    '--bets-bar-fill':barFill,
    '--bets-text':    textColor,
    '--bets-accent':  accentColor,
    '--bets-cols':    gridCols,
  };

  return (
    <div className={`bets-ov bets-ov--${status}${isGrid ? ' bets-ov--grid' : ''}`} style={cssVars}>
      {/* ── Header ── */}
      <div className="bets-ov__header">
        <span className="bets-ov__title">
          {title}{fund > 0 ? ` · ${fund}${currency}` : ''}
        </span>
        {status === 'result' && <span className="bets-ov__trophy">🏆</span>}
        <span className={`bets-ov__status bets-ov__status--${status}`}>
          {status === 'open' && <span className="bets-ov__live-dot" />} {statusLabel}
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
        <div className="bets-ov__grid">
          {options.map((opt, i) => {
            const amount   = bets[`opt_${i}`] || 0;
            const pct      = pcts[i];
            const fillH    = maxBet > 0 ? (amount / maxBet) * 100 : 0;
            const isWin    = winnerIdx === i;
            const isLose   = winnerIdx !== null && winnerIdx !== i;
            const isLead   = leadingIdx === i;
            const label    = (opt.label || `Option ${i + 1}`).replace(/\s*-\s*!bet\s*\d+$/i, '');
            const classes  = [
              'bets-ov__card',
              isWin  && 'bets-ov__card--win',
              isLose && 'bets-ov__card--lose',
              isLead && 'bets-ov__card--leading',
            ].filter(Boolean).join(' ');

            return (
              <div
                key={`${i}-${status}`}
                className={classes}
                style={{ animationDelay: `${i * 0.07}s` }}
              >
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
        <div className="bets-ov__list">
          {options.map((opt, i) => {
            const pct     = pcts[i];
            const isWin   = winnerIdx === i;
            const isLose  = winnerIdx !== null && winnerIdx !== i;
            const isLead  = leadingIdx === i;
            const label   = (opt.label || `Option ${i + 1}`).replace(/\s*-\s*!bet\s*\d+$/i, '');
            const classes = [
              'bets-ov__row',
              isWin  && 'bets-ov__row--win',
              isLose && 'bets-ov__row--lose',
              isLead && 'bets-ov__row--leading',
            ].filter(Boolean).join(' ');

            return (
              <div
                key={`${i}-${status}`}
                className={classes}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
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

  