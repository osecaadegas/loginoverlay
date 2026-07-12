/**
 * BetsWidget.jsx — OBS overlay for live chat bracket betting.
 *
 * Three themes: dark glass · grey · white
 * Layouts: v1_list (horizontal bars) · v2_grid (vertical fill cards) · v3_grid_2x3 (wide 2x3 cards)
 * Animations: entry stagger · bar shimmer · leading pulse · winner pop
 */
import React, { useState, useEffect, useMemo } from 'react';
import { subElementStyle, subValue } from './shared/appearanceStyles';

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
  '#64748b', // slate
  '#06b6d4', // cyan
  '#ef4444', // red
  '#eab308', // yellow
  '#64748b', // pink
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

const TEXT_STYLE_KEYS = ['color', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing', 'textTransform', 'textAlign', 'opacity'];

function toCssLength(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  return typeof value === 'number' ? `${value}px` : value;
}

function pickTextStyle(style = {}) {
  return Object.fromEntries(TEXT_STYLE_KEYS.map(key => [key, style[key]]).filter(([, value]) => value !== undefined));
}

function elementValue(config, elementId, property, fallback, legacyElementId, stateId = 'default') {
  const legacyFallback = legacyElementId ? subValue(config, legacyElementId, property, fallback, stateId) : fallback;
  return subValue(config, elementId, property, legacyFallback, stateId);
}

function elementStyle(config, elementId, fallback = {}, legacyElementId, stateId = 'default') {
  const legacyFallback = legacyElementId ? subElementStyle(config, legacyElementId, fallback, stateId) : fallback;
  return subElementStyle(config, elementId, legacyFallback, stateId);
}

function optionStateId({ isWin, isLose, isLead, status }) {
  if (isWin) return 'winner';
  if (isLose) return 'loser';
  if (isLead) return 'leading';
  if (status === 'locked') return 'closed';
  return 'default';
}

function BetsWidget({ config }) {
  const c            = config || {};
  const title        = c.question      || 'Place Your Bets';
  const status       = c.gameStatus    || 'idle';
  const winnerIdx    = c.winnerOption  ?? null;
  const options      = c.options       || [];
  const bets         = c.bets          || {};
  const betters      = c.betters       || {};
  const timer        = c.timerSeconds  || 0;
  const cmd          = c.chatCommand   || '!bet';
  const font         = c.bodyFont || c.fontFamily || "'Inter', sans-serif";
  const headingFont  = c.headingFont || font;
  const numberFont   = c.numberFont || font;
  const baseFontSize = Number(c.fontSize) || 14;
  const headingScale = Number(c.headingScale) || 1.16;
  const defaultLineHeight = Number(c.lineHeight) || 1.2;
  const defaultLetterSpacing = typeof c.letterSpacing === 'number' ? `${c.letterSpacing}em` : c.letterSpacing;
  const defaultTextTransform = c.textTransform || 'none';
  const defaultTextAlign = c.textAlign || undefined;
  const layout       = c.displayStyle  || 'v1_list';
  const colorTheme   = c.colorTheme    || 'dark';
  const barColorMode = c.barColorMode  || 'rainbow';

  const preset      = THEME_PRESETS[colorTheme] || THEME_PRESETS.dark;
  const bgColor     = elementValue(c, 'container', 'background', c.bgColor || preset.bgColor);
  const textColor   = elementValue(c, 'container', 'textColor', c.textColor || preset.textColor);
  const borderColor = elementValue(c, 'container', 'borderColor', c.borderColor || 'rgba(148,163,184,0.12)');
  const borderWidth = elementValue(c, 'container', 'borderWidth', c.borderWidth ?? c.cardBorderWidth ?? 1);
  const headerBg    = elementValue(c, 'title', 'background', subValue(c, 'question', 'background', subValue(c, 'header', 'background', c.headerBg || preset.headerBg)), 'question');
  const headerText  = elementValue(c, 'title', 'textColor', subValue(c, 'question', 'textColor', subValue(c, 'header', 'textColor', c.headerText || preset.headerText)), 'question');
  const barBg       = elementValue(c, 'progressBar', 'background', c.barBg || c.progressBgColor || preset.barBg);
  const barFill     = elementValue(c, 'progressBar', 'fillColor', c.barFill || c.progressColor || preset.barFill);
  const accentColor = elementValue(c, 'optionNumber', 'background', subValue(c, 'optionCard', 'accentColor', c.accentColor || preset.accentColor), 'optionCard');
  const optionBg    = elementValue(c, 'optionRow', 'background', subValue(c, 'optionCard', 'background', c.cardBg || barBg), 'optionCard');
  const optionText  = elementValue(c, 'optionLabel', 'textColor', subValue(c, 'optionCard', 'textColor', textColor), 'optionCard');
  const timerText   = elementValue(c, 'status', 'textColor', subValue(c, 'timer', 'textColor', headerText), 'timer', status || 'default');
  const timerBg     = elementValue(c, 'status', 'background', subValue(c, 'timer', 'background', 'rgba(99,102,241,0.18)'), 'timer', status || 'default');
  const winText     = elementValue(c, 'optionRow', 'textColor', subValue(c, 'winningState', 'textColor', '#4ade80'), 'optionCard', 'winner');
  const winBg       = elementValue(c, 'optionRow', 'background', subValue(c, 'winningState', 'background', 'rgba(34,197,94,0.14)'), 'optionCard', 'winner');
  const loseText    = elementValue(c, 'optionRow', 'textColor', subValue(c, 'losingState', 'textColor', '#f87171'), 'optionCard', 'loser');
  const loseBg      = elementValue(c, 'optionRow', 'background', subValue(c, 'losingState', 'background', 'rgba(239,68,68,0.14)'), 'optionCard', 'loser');
  const radius      = elementValue(c, 'optionRow', 'radius', subValue(c, 'optionCard', 'radius', c.cardRadius ?? 12), 'optionCard');
  const progressHeight = elementValue(c, 'progressBar', 'height', c.barHeight || 8);
  const progressRadius = elementValue(c, 'progressBar', 'radius', 4);
  const containerStyle = elementStyle(c, 'container', {
    fontFamily: font,
    fontSize: `${baseFontSize}px`,
    lineHeight: defaultLineHeight,
    letterSpacing: defaultLetterSpacing,
    textTransform: defaultTextTransform,
    textAlign: defaultTextAlign,
    background: bgColor,
    color: textColor,
    border: `${Number(borderWidth) || 0}px solid ${borderColor}`,
    borderRadius: toCssLength(c.borderRadius ?? c.cardRadius, '0px'),
  });
  const titleStyle = elementStyle(c, 'title', {
    color: headerText,
    fontFamily: headingFont,
    fontSize: `${Math.round(baseFontSize * headingScale)}px`,
    fontWeight: 800,
    lineHeight: defaultLineHeight,
    letterSpacing: defaultLetterSpacing,
    textTransform: defaultTextTransform,
    textAlign: defaultTextAlign,
  }, 'question');
  const headerStyle = {
    background: titleStyle.background || headerBg,
    ...(titleStyle.padding ? { padding: titleStyle.padding } : {}),
    ...(titleStyle.borderRadius ? { borderRadius: titleStyle.borderRadius } : {}),
  };
  const statusStyle = elementStyle(c, 'status', {
    background: timerBg,
    color: timerText,
    fontFamily: font,
    fontSize: `${Math.max(10, Math.round(baseFontSize * 0.76))}px`,
    fontWeight: 700,
    lineHeight: 1,
    letterSpacing: defaultLetterSpacing,
    textTransform: 'uppercase',
  }, 'timer', status || 'default');
  const statisticsStyle = elementStyle(c, 'statistics', {
    color: headerText,
    fontFamily: numberFont,
    fontSize: `${Math.max(11, Math.round(baseFontSize * 0.92))}px`,
    fontWeight: 800,
    lineHeight: 1,
    letterSpacing: defaultLetterSpacing,
    textTransform: defaultTextTransform,
    textAlign: 'center',
  });
  const statisticsTextStyle = pickTextStyle(statisticsStyle);
  const footerStyle = elementStyle(c, 'footer', {
    background: 'rgba(0,0,0,0.12)',
    color: 'rgba(255,255,255,0.45)',
    fontFamily: font,
    fontSize: `${Math.max(10, Math.round(baseFontSize * 0.76))}px`,
    lineHeight: defaultLineHeight,
    letterSpacing: defaultLetterSpacing,
    textTransform: defaultTextTransform,
  });

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
    fontSize:          `${baseFontSize}px`,
    lineHeight:        defaultLineHeight,
    letterSpacing:     defaultLetterSpacing,
    textTransform:     defaultTextTransform,
    textAlign:         defaultTextAlign,
    '--bets-bg':       bgColor,
    '--bets-hdr-bg':   headerBg,
    '--bets-hdr-txt':  headerText,
    '--bets-border':   borderColor,
    '--bets-bar-bg':   barBg,
    '--bets-bar-fill': barFill,
    '--bets-text':     textColor,
    '--bets-accent':   accentColor,
    '--bets-card-bg':  optionBg,
    '--bets-card-text': optionText,
    '--bets-card-radius': toCssLength(radius, '12px'),
    '--bets-progress-height': toCssLength(progressHeight, '8px'),
    '--bets-progress-radius': toCssLength(progressRadius, '4px'),
    '--bets-timer-text': timerText,
    '--bets-timer-bg': timerBg,
    '--bets-win-bg':   winBg,
    '--bets-win-text': winText,
    '--bets-lose-bg':  loseBg,
    '--bets-lose-text': loseText,
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
      data-widget-type="bets"
      data-widget-element="container"
      style={{ ...cssVars, ...containerStyle }}
    >
      {/* ── Header ── */}
      <div className="bets-ov__header" data-widget-element="title" style={headerStyle}>
        <span className="bets-ov__title" data-widget-element="title" style={pickTextStyle(titleStyle)}>
          {title}
        </span>
        {status === 'result' && <span className="bets-ov__trophy">🏆</span>}
        <span className={`bets-ov__status bets-ov__status--${status}`} data-widget-element="status" data-widget-state={status || 'default'} style={statusStyle}>
          {status === 'open' && <span className="bets-ov__live-dot" />}
          {statusLabel}
        </span>
      </div>

      {/* ── Stats strip ── */}
      <div className="bets-ov__stats" data-widget-element="statistics" style={statisticsStyle}>
        <div className="bets-ov__stat">
          <span className="bets-ov__stat-val" style={statisticsTextStyle}>{totalPool.toLocaleString()}</span>
          <span className="bets-ov__stat-lbl" style={statisticsTextStyle}>💰 Pool</span>
        </div>
        <div className="bets-ov__stat bets-ov__stat--center">
          <span className="bets-ov__stat-val" style={statisticsTextStyle}>
            {status === 'open' && countdown > 0 ? fmt(countdown) :
             status === 'open' ? '∞' :
             status === 'locked' ? '🔒' : '🏆'}
          </span>
          <span className="bets-ov__stat-lbl" style={statisticsTextStyle}>
            {status === 'open' ? '⏱ Timer' : 'Status'}
          </span>
        </div>
        <div className="bets-ov__stat">
          <span className="bets-ov__stat-val" style={statisticsTextStyle}>{totalBetters}</span>
          <span className="bets-ov__stat-lbl" style={statisticsTextStyle}>👥 Bets</span>
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
            const stateId  = optionStateId({ isWin, isLose, isLead, status });
            const progressStateId = isWin ? 'winner' : isLose ? 'loser' : 'default';
            const optionRowStyle = elementStyle(c, 'optionRow', {
              background: optionBg,
              color: optionText,
              borderRadius: toCssLength(radius, '12px'),
            }, 'optionCard', stateId);
            const optionNumberStyle = elementStyle(c, 'optionNumber', {
              background: optColor || accentColor,
              color: '#ffffff',
              fontFamily: numberFont,
              fontSize: `${Math.max(11, Math.round(baseFontSize * 0.92))}px`,
              fontWeight: 800,
            }, undefined, stateId);
            const optionLabelStyle = elementStyle(c, 'optionLabel', {
              color: optionText,
              fontFamily: font,
              fontSize: `${baseFontSize}px`,
              fontWeight: 700,
              lineHeight: defaultLineHeight,
              letterSpacing: defaultLetterSpacing,
              textTransform: defaultTextTransform,
              textAlign: defaultTextAlign,
            }, undefined, stateId);
            const percentageStyle = elementStyle(c, 'percentage', {
              color: optColor || accentColor,
              fontFamily: numberFont,
              fontSize: `${Math.round(baseFontSize * 1.2)}px`,
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: defaultLetterSpacing,
            }, undefined, stateId);
            const progressStyle = elementStyle(c, 'progressBar', {
              background: barBg,
              height: toCssLength(progressHeight, '8px'),
              borderRadius: toCssLength(progressRadius, '4px'),
            }, undefined, progressStateId);
            const progressFill = elementValue(c, 'progressBar', 'fillColor', optColor || barFill, undefined, progressStateId);
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
                data-widget-element="optionRow"
                data-widget-state={stateId}
                style={{ animationDelay: `${i * 0.07}s`, '--opt-color': optColor, ...optionRowStyle }}
              >
                <div
                  className="bets-ov__card-fill"
                  data-widget-element="progressBar"
                  data-widget-state={progressStateId}
                  style={{
                    height: `${fillH}%`,
                    background: `linear-gradient(180deg, transparent 0%, ${progressFill} 100%)`,
                    borderRadius: progressStyle.borderRadius,
                  }}
                />
                <div className="bets-ov__card-body">
                  <div className="bets-ov__card-head">
                    <span className="bets-ov__card-num" data-widget-element="optionNumber" data-widget-state={stateId} style={optionNumberStyle}>{i + 1}</span>
                    <span className={`bets-ov__card-crown${isWin ? '' : ' bets-ov__card-crown--hidden'}`}>👑</span>
                  </div>
                  <span className="bets-ov__card-label" data-widget-element="optionLabel" data-widget-state={stateId} style={optionLabelStyle}>{label}</span>
                  <div className="bets-ov__card-footer">
                    <span className="bets-ov__card-pct" data-widget-element="percentage" data-widget-state={stateId} style={percentageStyle}>{pct}%</span>
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
            const stateId  = optionStateId({ isWin, isLose, isLead, status });
            const progressStateId = isWin ? 'winner' : isLose ? 'loser' : 'default';
            const optionRowStyle = elementStyle(c, 'optionRow', {
              background: optionBg,
              color: optionText,
              borderRadius: toCssLength(radius, '10px'),
            }, 'optionCard', stateId);
            const optionNumberStyle = elementStyle(c, 'optionNumber', {
              background: optColor || accentColor,
              color: '#ffffff',
              fontFamily: numberFont,
              fontSize: `${Math.max(11, Math.round(baseFontSize * 0.8))}px`,
              fontWeight: 800,
            }, undefined, stateId);
            const optionLabelStyle = elementStyle(c, 'optionLabel', {
              color: optionText,
              fontFamily: font,
              fontSize: `${baseFontSize}px`,
              fontWeight: 700,
              lineHeight: defaultLineHeight,
              letterSpacing: defaultLetterSpacing,
              textTransform: defaultTextTransform,
              textAlign: defaultTextAlign,
            }, undefined, stateId);
            const percentageStyle = elementStyle(c, 'percentage', {
              color: optColor || accentColor,
              fontFamily: numberFont,
              fontSize: `${Math.round(baseFontSize * 1.02)}px`,
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: defaultLetterSpacing,
              textAlign: 'right',
            }, undefined, stateId);
            const progressStyle = elementStyle(c, 'progressBar', {
              background: barBg,
              height: toCssLength(progressHeight, '8px'),
              borderRadius: toCssLength(progressRadius, '4px'),
            }, undefined, progressStateId);
            const progressFill = elementValue(c, 'progressBar', 'fillColor', optColor || barFill, undefined, progressStateId);
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
                data-widget-element="optionRow"
                data-widget-state={stateId}
                style={{ animationDelay: `${i * 0.05}s`, '--opt-color': optColor, ...optionRowStyle }}
              >
                <div className="bets-ov__row-meta">
                  <span className="bets-ov__row-num" data-widget-element="optionNumber" data-widget-state={stateId} style={optionNumberStyle}>{i + 1}</span>
                  <span className="bets-ov__row-label" data-widget-element="optionLabel" data-widget-state={stateId} style={optionLabelStyle}>{isWin ? '👑 ' : ''}{label}</span>
                  <span className="bets-ov__row-pct" data-widget-element="percentage" data-widget-state={stateId} style={percentageStyle}>{pct}%</span>
                </div>
                <div className="bets-ov__row-bar" data-widget-element="progressBar" data-widget-state={progressStateId} style={progressStyle}>
                  <div className="bets-ov__row-fill" style={{ width: `${pct}%`, background: progressFill, borderRadius: progressStyle.borderRadius }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Footer hint ── */}
      {status === 'open' && (
        <div className="bets-ov__hint" data-widget-element="footer" style={footerStyle}>
          Type <strong>{cmd} &lt;number&gt;</strong> to bet
        </div>
      )}
    </div>
  );
}

export default BetsWidget;
