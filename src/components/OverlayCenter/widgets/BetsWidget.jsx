/**
 * BetsWidget.jsx — OBS overlay for live chat bracket betting.
 *
 * Three themes: dark glass · grey · white
 * Layouts: v1_list (horizontal bars) · v2_grid (vertical fill cards) · v3_grid_2x3 (wide 2x3 cards)
 * Animations: entry stagger · bar shimmer · leading pulse · winner pop
 */
import React, { useState, useEffect, useMemo } from 'react';
import { subElementStyle, subValue } from './shared/appearanceStyles';
import { STYLE_SECA, resolveStyleSecaValue, styleSecaHeaderGradient, styleSecaSurfaceGradient } from './shared/styleSecaTheme';

function getGridCols(count, layout) {
  if (layout === 'StyleSecaBets') return 2;
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

function getExplicitAppearanceConfig(config = {}) {
  return Object.prototype.hasOwnProperty.call(config, '__appearanceExplicitSubElements')
    ? { subElements: config.__appearanceExplicitSubElements || {} }
    : config;
}

function scopedSubValue(config, elementId, property, fallback, stateId = 'default') {
  return subValue(getExplicitAppearanceConfig(config), elementId, property, fallback, stateId);
}

function elementValue(config, elementId, property, fallback, legacyElementId, stateId = 'default') {
  const explicitConfig = getExplicitAppearanceConfig(config);
  const legacyFallback = legacyElementId ? subValue(explicitConfig, legacyElementId, property, fallback, stateId) : fallback;
  return subValue(explicitConfig, elementId, property, legacyFallback, stateId);
}

function elementStyle(config, elementId, fallback = {}, legacyElementId, stateId = 'default') {
  const explicitConfig = getExplicitAppearanceConfig(config);
  const legacyFallback = legacyElementId ? subElementStyle(explicitConfig, legacyElementId, fallback, stateId) : fallback;
  return subElementStyle(explicitConfig, elementId, legacyFallback, stateId);
}

function partAttrs(partId, stateId) {
  return {
    'data-widget-element': partId,
    'data-appearance-part': partId,
    ...(stateId ? { 'data-widget-state': stateId } : {}),
  };
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
  const layout       = c.displayStyle  || 'v1_list';
  const isStyleSeca  = layout === 'StyleSecaBets';
  const font         = c.bodyFont || c.fontFamily || (isStyleSeca ? "'Rajdhani', 'Barlow Condensed', sans-serif" : "'Inter', sans-serif");
  const headingFont  = c.headingFont || font;
  const numberFont   = c.numberFont || font;
  const baseFontSize = Number(c.fontSize) || 14;
  const headingScale = Number(c.headingScale) || 1.16;
  const defaultLineHeight = Number(c.lineHeight) || 1.2;
  const defaultLetterSpacing = typeof c.letterSpacing === 'number' ? `${c.letterSpacing}em` : c.letterSpacing;
  const defaultTextTransform = c.textTransform || 'none';
  const defaultTextAlign = c.textAlign || undefined;
  const colorTheme   = c.colorTheme    || 'dark';
  const barColorMode = c.barColorMode  || (isStyleSeca ? 'solid' : 'rainbow');
  const effectiveBarColorMode = isStyleSeca ? 'solid' : barColorMode;
  const styleSecaValue = (value, fallback) => isStyleSeca ? resolveStyleSecaValue(value, fallback) : value;
  const styleSecaText = '#f8fbff';

  const preset      = THEME_PRESETS[colorTheme] || THEME_PRESETS.dark;
  const bgColor     = styleSecaValue(elementValue(c, 'widgetBackground', 'background', c.bgColor || (isStyleSeca ? styleSecaSurfaceGradient() : preset.bgColor), 'container'), styleSecaSurfaceGradient());
  const textColor   = styleSecaValue(elementValue(c, 'widgetBackground', 'textColor', c.textColor || (isStyleSeca ? styleSecaText : preset.textColor), 'container'), styleSecaText);
  const borderColor = styleSecaValue(elementValue(c, 'widgetBackground', 'borderColor', c.borderColor || (isStyleSeca ? STYLE_SECA.border : 'rgba(148,163,184,0.12)'), 'container'), STYLE_SECA.border);
  const borderWidth = elementValue(c, 'widgetBackground', 'borderWidth', c.borderWidth ?? 1, 'container');
  const widgetRadius = elementValue(c, 'widgetBackground', 'radius', c.borderRadius ?? (isStyleSeca ? 12 : 0), 'container');
  const headerBg    = styleSecaValue(elementValue(c, 'header', 'background', c.headerBg || (isStyleSeca ? styleSecaHeaderGradient() : preset.headerBg), 'title'), styleSecaHeaderGradient());
  const headerText  = styleSecaValue(elementValue(c, 'header', 'textColor', c.headerText || (isStyleSeca ? styleSecaText : preset.headerText), 'title'), styleSecaText);
  const barBg       = styleSecaValue(elementValue(c, 'progressBar', 'background', c.barBg || c.progressBgColor || (isStyleSeca ? STYLE_SECA.secondarySurface : preset.barBg)), STYLE_SECA.secondarySurface);
  const barFill     = styleSecaValue(elementValue(c, 'progressBar', 'fillColor', c.barFill || c.progressColor || (isStyleSeca ? STYLE_SECA.primary : preset.barFill)), STYLE_SECA.primary);
  const accentColor = styleSecaValue(elementValue(c, 'cardNumberBadge', 'background', scopedSubValue(c, 'optionCard', 'accentColor', c.accentColor || (isStyleSeca ? STYLE_SECA.primary : preset.accentColor)), 'optionNumber'), STYLE_SECA.primary);
  const optionBg    = styleSecaValue(elementValue(c, 'betCards', 'background', scopedSubValue(c, 'optionCard', 'background', c.cardBg || (isStyleSeca ? STYLE_SECA.cardSurface : barBg)), 'optionRow'), STYLE_SECA.cardSurface);
  const optionText  = styleSecaValue(elementValue(c, 'cardRangeText', 'textColor', scopedSubValue(c, 'optionCard', 'textColor', isStyleSeca ? styleSecaText : textColor), 'optionLabel'), styleSecaText);
  const timerText   = styleSecaValue(elementValue(c, 'status', 'textColor', scopedSubValue(c, 'timer', 'textColor', isStyleSeca ? STYLE_SECA.darkText : headerText), 'timer', status || 'default'), STYLE_SECA.darkText);
  const timerBg     = styleSecaValue(elementValue(c, 'status', 'background', scopedSubValue(c, 'timer', 'background', isStyleSeca ? STYLE_SECA.primary : 'rgba(99,102,241,0.18)'), 'timer', status || 'default'), STYLE_SECA.primary);
  const winText     = elementValue(c, 'betCards', 'textColor', scopedSubValue(c, 'winningState', 'textColor', '#4ade80'), 'optionRow', 'winner');
  const winBg       = elementValue(c, 'betCards', 'background', scopedSubValue(c, 'winningState', 'background', 'rgba(34,197,94,0.14)'), 'optionRow', 'winner');
  const loseText    = elementValue(c, 'betCards', 'textColor', scopedSubValue(c, 'losingState', 'textColor', '#f87171'), 'optionRow', 'loser');
  const loseBg      = elementValue(c, 'betCards', 'background', scopedSubValue(c, 'losingState', 'background', 'rgba(239,68,68,0.14)'), 'optionRow', 'loser');
  const radius      = elementValue(c, 'betCards', 'radius', scopedSubValue(c, 'optionCard', 'radius', c.cardRadius ?? 12), 'optionRow');
  const progressHeight = elementValue(c, 'progressBar', 'height', c.barHeight || (isStyleSeca ? 18 : 8));
  const progressRadius = elementValue(c, 'progressBar', 'radius', isStyleSeca ? 8 : 4);
  const rawContainerStyle = elementStyle(c, 'widgetBackground', {
    fontFamily: font,
    fontSize: isStyleSeca ? `clamp(11px, min(3.1cqw, 4.1cqh), ${baseFontSize}px)` : `${baseFontSize}px`,
    lineHeight: defaultLineHeight,
    letterSpacing: defaultLetterSpacing,
    textTransform: defaultTextTransform,
    textAlign: defaultTextAlign,
    background: bgColor,
    color: textColor,
    border: `${Number(borderWidth) || 0}px solid ${borderColor}`,
    borderRadius: toCssLength(widgetRadius, '0px'),
    boxShadow: isStyleSeca ? `0 18px 44px rgba(0,0,0,0.34), 0 0 30px ${STYLE_SECA.glow}` : undefined,
  }, 'container');
  const containerStyle = isStyleSeca ? {
    ...rawContainerStyle,
    background: styleSecaValue(rawContainerStyle.background, bgColor),
    color: styleSecaValue(rawContainerStyle.color, textColor),
  } : rawContainerStyle;
  const titleStyle = elementStyle(c, 'header', {
    color: headerText,
    fontFamily: headingFont,
    fontSize: `${Math.round(baseFontSize * headingScale)}px`,
    fontWeight: 800,
    lineHeight: defaultLineHeight,
    letterSpacing: defaultLetterSpacing,
    textTransform: defaultTextTransform,
    textAlign: defaultTextAlign,
  }, 'title');
  const headerStyle = {
    background: isStyleSeca ? styleSecaValue(titleStyle.background, headerBg) : titleStyle.background || headerBg,
    color: titleStyle.color || headerText,
    ...(titleStyle.padding ? { padding: titleStyle.padding } : {}),
    ...(titleStyle.borderRadius ? { borderRadius: titleStyle.borderRadius } : {}),
    ...(titleStyle.border ? { border: titleStyle.border } : {}),
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
  const statisticsStyle = elementStyle(c, 'poolStat', {
    color: headerText,
    fontFamily: numberFont,
    fontSize: `${Math.max(11, Math.round(baseFontSize * 0.92))}px`,
    fontWeight: 800,
    lineHeight: 1,
    letterSpacing: defaultLetterSpacing,
    textTransform: defaultTextTransform,
    textAlign: 'center',
  }, 'statistics');
  const poolStatStyle = elementStyle(c, 'poolStat', statisticsStyle, 'statistics');
  const timerStatStyle = elementStyle(c, 'timerStat', statisticsStyle, 'statistics');
  const betsStatStyle = elementStyle(c, 'betsStat', statisticsStyle, 'statistics');
  const footerStyle = elementStyle(c, 'footerInstruction', {
    background: 'rgba(0,0,0,0.12)',
    color: 'rgba(255,255,255,0.45)',
    fontFamily: font,
    fontSize: `${Math.max(10, Math.round(baseFontSize * 0.76))}px`,
    lineHeight: defaultLineHeight,
    letterSpacing: defaultLetterSpacing,
    textTransform: defaultTextTransform,
  }, 'footer');

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
  const isGrid    = layout === 'v2_grid' || isGrid2x3 || isStyleSeca;
  const gridCols  = getGridCols(options.length, layout);

  const getOptColor = (i) =>
    effectiveBarColorMode === 'rainbow' ? PALETTE[i % PALETTE.length] : barFill;

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
    '--bets-widget-background-radius': toCssLength(widgetRadius, '0px'),
    '--bets-card-radius': toCssLength(radius, '12px'),
    '--bets-header-radius': toCssLength(elementValue(c, 'header', 'radius', 0, 'title'), '0px'),
    '--bets-pool-stat-radius': toCssLength(elementValue(c, 'poolStat', 'radius', 0, 'statistics'), '0px'),
    '--bets-timer-stat-radius': toCssLength(elementValue(c, 'timerStat', 'radius', 0, 'statistics'), '0px'),
    '--bets-bets-stat-radius': toCssLength(elementValue(c, 'betsStat', 'radius', 0, 'statistics'), '0px'),
    '--bets-card-number-badge-radius': toCssLength(elementValue(c, 'cardNumberBadge', 'radius', 8, 'optionNumber'), '8px'),
    '--bets-footer-radius': toCssLength(elementValue(c, 'footerInstruction', 'radius', 0, 'footer'), '0px'),
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
        isStyleSeca && 'bets-ov--styleseca',
      ].filter(Boolean).join(' ')}
      data-widget-type="bets"
      {...partAttrs('widgetBackground')}
      style={{ ...cssVars, ...containerStyle }}
    >
      {/* ── Header ── */}
      <div className="bets-ov__header" {...partAttrs('header')} style={headerStyle}>
        <span className="bets-ov__title" {...partAttrs('header')} style={pickTextStyle(titleStyle)}>
          {title}
        </span>
        {status === 'result' && <span className="bets-ov__trophy">🏆</span>}
        <span className={`bets-ov__status bets-ov__status--${status}`} {...partAttrs('status', status || 'default')} style={statusStyle}>
          {status === 'open' && <span className="bets-ov__live-dot" />}
          {statusLabel}
        </span>
      </div>

      {/* ── Stats strip ── */}
      <div className="bets-ov__stats">
        <div className="bets-ov__stat" {...partAttrs('poolStat')} style={poolStatStyle}>
          <span className="bets-ov__stat-val" style={pickTextStyle(poolStatStyle)}>{totalPool.toLocaleString()}</span>
          <span className="bets-ov__stat-lbl" style={pickTextStyle(poolStatStyle)}>💰 Pool</span>
        </div>
        <div className="bets-ov__stat bets-ov__stat--center" {...partAttrs('timerStat')} style={timerStatStyle}>
          <span className="bets-ov__stat-val" style={pickTextStyle(timerStatStyle)}>
            {status === 'open' && countdown > 0 ? fmt(countdown) :
             status === 'open' ? '∞' :
             status === 'locked' ? '🔒' : '🏆'}
          </span>
          <span className="bets-ov__stat-lbl" style={pickTextStyle(timerStatStyle)}>
            {status === 'open' ? '⏱ Timer' : 'Status'}
          </span>
        </div>
        <div className="bets-ov__stat" {...partAttrs('betsStat')} style={betsStatStyle}>
          <span className="bets-ov__stat-val" style={pickTextStyle(betsStatStyle)}>{totalBetters}</span>
          <span className="bets-ov__stat-lbl" style={pickTextStyle(betsStatStyle)}>👥 Bets</span>
        </div>
      </div>

      {/* ── Options ── */}
      {isGrid ? (
        <div className="bets-ov__grid" {...partAttrs('betCards')}>
          {options.map((opt, i) => {
            const amount   = bets[`opt_${i}`] || 0;
            const pct      = pcts[i];
            const fillH    = maxBet > 0 ? (amount / maxBet) * 100 : 0;
            const displayFillH = isStyleSeca && amount > 0 ? Math.max(12, fillH) : fillH;
            const isWin    = winnerIdx === i;
            const isLose   = winnerIdx !== null && winnerIdx !== i;
            const isLead   = leadingIdx === i;
            const label    = (opt.label || `Option ${i + 1}`).replace(/\s*-\s*!bet\s*\d+$/i, '');
            const optColor = getOptColor(i);
            const stateId  = optionStateId({ isWin, isLose, isLead, status });
            const progressStateId = isWin ? 'winner' : isLose ? 'loser' : 'default';
            const rawSharedCardStyle = elementStyle(c, 'betCards', {
              background: optionBg,
              color: optionText,
              borderRadius: toCssLength(radius, '12px'),
            }, 'optionCard', stateId);
            const sharedCardStyle = isStyleSeca ? {
              ...rawSharedCardStyle,
              background: styleSecaValue(rawSharedCardStyle.background, optionBg),
              color: styleSecaValue(rawSharedCardStyle.color, optionText),
            } : rawSharedCardStyle;
            const optionRowStyle = elementStyle(c, 'individualBetCard', sharedCardStyle, undefined, `card_${i + 1}`);
            const optionNumberStyle = elementStyle(c, 'cardNumberBadge', {
              background: optColor || accentColor,
              color: elementValue(c, 'cardNumberBadge', 'textColor', '#ffffff', 'optionNumber', stateId),
              fontFamily: numberFont,
              fontSize: isStyleSeca ? `clamp(10px, min(2.7cqw, 2.7cqh), ${Math.max(11, Math.round(baseFontSize * 0.92))}px)` : `${Math.max(11, Math.round(baseFontSize * 0.92))}px`,
              fontWeight: 800,
            }, 'optionNumber', stateId);
            const optionLabelStyle = elementStyle(c, 'cardRangeText', {
              color: optionText,
              fontFamily: font,
              fontSize: isStyleSeca ? `clamp(10px, min(2.65cqw, 2.85cqh), ${baseFontSize}px)` : `${baseFontSize}px`,
              fontWeight: 700,
              lineHeight: defaultLineHeight,
              letterSpacing: defaultLetterSpacing,
              textTransform: defaultTextTransform,
              textAlign: defaultTextAlign,
            }, 'optionLabel', stateId);
            const percentageStyle = elementStyle(c, 'cardPercentageText', {
              color: isStyleSeca ? styleSecaText : (optColor || accentColor),
              fontFamily: numberFont,
              fontSize: isStyleSeca ? `clamp(12px, min(3.1cqw, 3.4cqh), ${Math.round(baseFontSize * 1.2)}px)` : `${Math.round(baseFontSize * 1.2)}px`,
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: defaultLetterSpacing,
            }, 'percentage', stateId);
            const cardLabelStyle = elementStyle(c, 'cardLabel', {
              color: isStyleSeca ? 'rgba(248,251,255,0.9)' : 'rgba(255,255,255,0.62)',
              fontFamily: font,
              fontSize: isStyleSeca ? `clamp(8px, min(1.75cqw, 2cqh), ${Math.max(9, Math.round(baseFontSize * 0.7))}px)` : `${Math.max(9, Math.round(baseFontSize * 0.7))}px`,
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: defaultLetterSpacing,
            }, undefined, stateId);
            const rawProgressStyle = elementStyle(c, 'progressBar', {
              background: barBg,
              height: toCssLength(progressHeight, '8px'),
              borderRadius: toCssLength(progressRadius, '4px'),
            }, undefined, progressStateId);
            const progressStyle = isStyleSeca ? {
              ...rawProgressStyle,
              background: styleSecaValue(rawProgressStyle.background, barBg),
            } : rawProgressStyle;
            const rawProgressFill = elementValue(c, 'progressBar', 'fillColor', optColor || barFill, undefined, progressStateId);
            const progressFill = isStyleSeca ? styleSecaValue(rawProgressFill, barFill) : rawProgressFill;
            const cardTextInheritanceStyle = pickTextStyle(optionRowStyle);
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
                {...partAttrs('individualBetCard', stateId)}
                data-appearance-index={i}
                style={{ animationDelay: `${i * 0.07}s`, '--opt-color': optColor, ...optionRowStyle }}
              >
                <div
                  className="bets-ov__card-fill"
                  {...partAttrs('progressBar', progressStateId)}
                  style={{
                    height: `${displayFillH}%`,
                    background: isStyleSeca
                      ? `linear-gradient(180deg, rgba(242,184,75,0.10) 0%, ${progressFill} 76%, ${progressFill} 100%)`
                      : `linear-gradient(180deg, transparent 0%, ${progressFill} 100%)`,
                    borderRadius: progressStyle.borderRadius,
                    opacity: isStyleSeca ? 0.86 : undefined,
                    boxShadow: isStyleSeca ? `0 -10px 22px ${progressFill}44` : undefined,
                  }}
                />
                <div className="bets-ov__card-body" style={cardTextInheritanceStyle}>
                  <div className="bets-ov__card-head">
                    <span className="bets-ov__card-num" {...partAttrs('cardNumberBadge', stateId)} style={optionNumberStyle}>{i + 1}</span>
                    <span className={`bets-ov__card-crown${isWin ? '' : ' bets-ov__card-crown--hidden'}`}>👑</span>
                  </div>
                  <span className="bets-ov__card-label" {...partAttrs('cardRangeText', stateId)} style={optionLabelStyle}>{label}</span>
                  <div className="bets-ov__card-footer">
                    <span className="bets-ov__card-pct" {...partAttrs('cardPercentageText', stateId)} style={percentageStyle}>{pct}%</span>
                    <span className="bets-ov__card-cmd" {...partAttrs('cardLabel', stateId)} style={cardLabelStyle}>{cmd} {i + 1}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bets-ov__list" {...partAttrs('betCards')}>
          {options.map((opt, i) => {
            const pct      = pcts[i];
            const isWin    = winnerIdx === i;
            const isLose   = winnerIdx !== null && winnerIdx !== i;
            const isLead   = leadingIdx === i;
            const label    = (opt.label || `Option ${i + 1}`).replace(/\s*-\s*!bet\s*\d+$/i, '');
            const optColor = getOptColor(i);
            const stateId  = optionStateId({ isWin, isLose, isLead, status });
            const progressStateId = isWin ? 'winner' : isLose ? 'loser' : 'default';
            const sharedCardStyle = elementStyle(c, 'betCards', {
              background: optionBg,
              color: optionText,
              borderRadius: toCssLength(radius, '10px'),
            }, 'optionCard', stateId);
            const optionRowStyle = elementStyle(c, 'individualBetCard', sharedCardStyle, undefined, `card_${i + 1}`);
            const optionNumberStyle = elementStyle(c, 'cardNumberBadge', {
              background: optColor || accentColor,
              color: elementValue(c, 'cardNumberBadge', 'textColor', '#ffffff', 'optionNumber', stateId),
              fontFamily: numberFont,
              fontSize: `${Math.max(11, Math.round(baseFontSize * 0.8))}px`,
              fontWeight: 800,
            }, 'optionNumber', stateId);
            const optionLabelStyle = elementStyle(c, 'cardRangeText', {
              color: optionText,
              fontFamily: font,
              fontSize: `${baseFontSize}px`,
              fontWeight: 700,
              lineHeight: defaultLineHeight,
              letterSpacing: defaultLetterSpacing,
              textTransform: defaultTextTransform,
              textAlign: defaultTextAlign,
            }, 'optionLabel', stateId);
            const percentageStyle = elementStyle(c, 'cardPercentageText', {
              color: optColor || accentColor,
              fontFamily: numberFont,
              fontSize: `${Math.round(baseFontSize * 1.02)}px`,
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: defaultLetterSpacing,
              textAlign: 'right',
            }, 'percentage', stateId);
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
                {...partAttrs('individualBetCard', stateId)}
                data-appearance-index={i}
                style={{ animationDelay: `${i * 0.05}s`, '--opt-color': optColor, ...optionRowStyle }}
              >
                <div className="bets-ov__row-meta">
                  <span className="bets-ov__row-num" {...partAttrs('cardNumberBadge', stateId)} style={optionNumberStyle}>{i + 1}</span>
                  <span className="bets-ov__row-label" {...partAttrs('cardRangeText', stateId)} style={optionLabelStyle}>{isWin ? '👑 ' : ''}{label}</span>
                  <span className="bets-ov__row-pct" {...partAttrs('cardPercentageText', stateId)} style={percentageStyle}>{pct}%</span>
                </div>
                <div className="bets-ov__row-bar" {...partAttrs('progressBar', progressStateId)} style={progressStyle}>
                  <div className="bets-ov__row-fill" style={{ width: `${pct}%`, background: progressFill, borderRadius: progressStyle.borderRadius }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Footer hint ── */}
      {status === 'open' && (
        <div className="bets-ov__hint" {...partAttrs('footerInstruction')} style={footerStyle}>
          Type <strong>{cmd} &lt;number&gt;</strong> to bet
        </div>
      )}
    </div>
  );
}

export default BetsWidget;
