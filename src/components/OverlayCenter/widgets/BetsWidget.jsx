/**
 * BetsWidget.jsx — OBS overlay for live chat bracket betting.
 *
 * Three themes: dark glass · grey · white
 * Layouts: v1_list (horizontal bars) · v2_grid (vertical fill cards) · v3_grid_2x3 (wide 2x3 cards)
 * Animations: entry stagger · bar shimmer · leading pulse · winner pop
 */
import React, { useState, useEffect, useMemo } from 'react';

function getGridCols(count, layout) {
  if (layout === 'v3_grid_2x3') return 3;
  if (count <= 6) return 2;
  if (count <= 9) return 3;
  return 4;
}

// Vibrant palette — one colour per bracket option (rainbow mode)
const PALETTE = [
  '#6366f1', // indigo
  '#22c55e', // emerald
  '#f97316', // orange
  '#a855f7', // purple
  '#06b6d4', // cyan
  '#ef4444', // red
  '#eab308', // yellow
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f59e0b', // amber
];

// Fallback CSS-var defaults per theme (used when config has no manual colour override)
const THEME_PRESETS = {
  dark: {
    bgColor:     'rgba(10,14,20,0.94)',
    headerBg:    'rgba(255,255,255,0.04)',
    headerText:  '#eef2f5',
    barBg:       'rgba(255,255,255,0.06)',
    barFill:     '#6366f1',
    textColor:   '#d4dce8',
    accentColor: '#b8c8d8',
  },
  grey: {
    bgColor:     'rgba(42,48,60,0.95)',
    headerBg:    'rgba(255,255,255,0.07)',
    headerText:  '#f1f5f9',
    barBg:       'rgba(255,255,255,0.09)',
    barFill:     '#6366f1',
    textColor:   '#e2e8f0',
    accentColor: '#cbd5e1',
  },
  white: {
    bgColor:     'rgba(248,250,252,0.97)',
    headerBg:    'rgba(15,23,42,0.04)',
    headerText:  '#0f172a',
    barBg:       'rgba(0,0,0,0.07)',
    barFill:     '#6366f1',
    textColor:   '#334155',
    accentColor: '#475569',
  },
};

function BetsWidget({ config }) {
  const c            = config || {};
  const title        = c.question      || 'Place Your Bets';
  const status       = c.gameStatus    || 'idle';
  const winnerIdx    = c.winnerOption  ?? null;
  const options      = c.options       || [];
  const bets         = c.bets          || {};
  const betters      = c.betters       || {};
  const timer        = c.timerSeconds  || 0;
  const fund         = c.fundAmount    || 0;
  const currency     = c.currency      || '€';
  const cmd          = c.chatCommand   || '!bet';
  const font         = c.fontFamily    || "'Inter', sans-serif";
  const layout       = c.displayStyle  || 'v1_list';
  const colorTheme   = c.colorTheme    || 'dark';
  const barColorMode = c.barColorMode  || 'rainbow';

  const preset      = THEME_PRESETS[colorTheme] || THEME_PRESETS.dark;
  const bgColor     = c.bgColor     || preset.bgColor;
  const headerBg    = c.headerBg    || preset.headerBg;
  const headerText  = c.headerText  || preset.headerText;
  const barBg       = c.barBg       || preset.barBg;
  const barFill     = c.barFill     || preset.barFill;
  const textColor   = c.textColor   || preset.textColor;
  const accentColor = c.accentColor || preset.accentColor;

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
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
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
    if (maxPct < 25) return -1;
    const sorted = [...pcts].sort((a, b) => b - a);
    if (maxPct < (sorted[1] ?? 0) + 15) return -1;
    return pcts.indexOf(maxPct);
  }, [status, pcts, totalPool]);

  if (status === 'idle') return null;

  const statusLabel =
    status === 'open'   ? (countdown > 0 ? fmt(countdown) : 'OPEN') :
    status === 'locked' ? 'LOCKED' :
    status === 'result' ? 'RESULT' : '';

  const isGrid2x3 = layout === 'v3_grid_2x3';
  const isGrid    = layout === 'v2_grid' || isGrid2x3;
  const gridCols  = getGridCols(options.length, layout);

  const getOptColor = (i) =>
    barColorMode === 'rainbow' ? PALETTE[i % PALETTE.length] : barFill;

  const cssVars = {
    fontFamily:        font,
    '--bets-bg':       bgColor,
    '--bets-hdr-bg':   headerBg,
    '--bets-hdr-txt':  headerText,
    '--bets-bar-bg':   barBg,
    '--bets-bar-fill': barFill,
    '--bets-text':     textColor,
    '--bets-accent':   accentColor,
    '--bets-cols':     gridCols,
  };

  return (
    <div
      className={[
        'bets-ov',
        `bets-ov--${status}`,
        `bets-ov--theme-${colorTheme}`,
        isGrid && 'bets-ov--grid',
        isGrid2x3 && 'bets-ov--grid-2x3',
      ].filter(Boolean).join(' ')}
      style={cssVars}
    >
      {/* ── Header ── */}
      <div className="bets-ov__header">
        <span className="bets-ov__title">
          {title}{fund > 0 ? ` · ${fund}${currency}` : ''}
        </span>
        {status === 'result' && <span className="bets-ov__trophy">🏆</span>}
        <span className={`bets-ov__status bets-ov__status--${status}`}>
          {status === 'open' && <span className="bets-ov__live-dot" />}
          {statusLabel}
        </span>
      </div>

      {/* ── Stats strip ── */}
      <div className="bets-ov__stats">
        <div className="bets-ov__stat">
          <span className="bets-ov__stat-val">{totalPool.toLocaleString()}</span>
          <span className="bets-ov__stat-lbl">💰 Pool</span>
        </div>
        <div className="bets-ov__stat bets-ov__stat--center">
          <span className="bets-ov__stat-val">
            {status === 'open' && countdown > 0 ? fmt(countdown) :
             status === 'open' ? '∞' :
             status === 'locked' ? '🔒' : '🏆'}
          </span>
          <span className="bets-ov__stat-lbl">
            {status === 'open' ? '⏱ Timer' : 'Status'}
          </span>
        </div>
        <div className="bets-ov__stat">
          <span className="bets-ov__stat-val">{totalBetters}</span>
          <span className="bets-ov__stat-lbl">👥 Bets</span>
        </div>
      </div>

      {/* ── Options ── */}
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
            const optColor = getOptColor(i);
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
                style={{ animationDelay: `${i * 0.07}s`, '--opt-color': optColor }}
              >
                <div className="bets-ov__card-fill" style={{ height: `${fillH}%` }} />
                <div className="bets-ov__card-body">
                  <div className="bets-ov__card-head">
                    <span className="bets-ov__card-num">{i + 1}</span>
                    <span className={`bets-ov__card-crown${isWin ? '' : ' bets-ov__card-crown--hidden'}`}>👑</span>
                  </div>
                  <span className="bets-ov__card-label">{label}</span>
                  <div className="bets-ov__card-footer">
                    <span className="bets-ov__card-pct">{pct}%</span>
                    <span className="bets-ov__card-cmd">{cmd} {i + 1}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bets-ov__list">
          {options.map((opt, i) => {
            const pct      = pcts[i];
            const isWin    = winnerIdx === i;
            const isLose   = winnerIdx !== null && winnerIdx !== i;
            const isLead   = leadingIdx === i;
            const label    = (opt.label || `Option ${i + 1}`).replace(/\s*-\s*!bet\s*\d+$/i, '');
            const optColor = getOptColor(i);
            const classes  = [
              'bets-ov__row',
              isWin  && 'bets-ov__row--win',
              isLose && 'bets-ov__row--lose',
              isLead && 'bets-ov__row--leading',
            ].filter(Boolean).join(' ');

            return (
              <div
                key={`${i}-${status}`}
                className={classes}
                style={{ animationDelay: `${i * 0.05}s`, '--opt-color': optColor }}
              >
                <div className="bets-ov__row-meta">
                  <span className="bets-ov__row-num">{i + 1}</span>
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

      {/* ── Footer hint ── */}
      {status === 'open' && (
        <div className="bets-ov__hint">
          Type <strong>{cmd} &lt;number&gt;</strong> to bet
        </div>
      )}
    </div>
  );
}

export default BetsWidget;

  