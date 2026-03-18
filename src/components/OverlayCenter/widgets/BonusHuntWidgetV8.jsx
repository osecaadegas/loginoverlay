import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';

/**
 * V8 — Card Stack  (fully rebuilt)
 * 3D perspective carousel with configurable card sizes, text sizes,
 * rotation speed, and every visual dimension adjustable from the config panel.
 */
function BonusHuntWidgetV8({ config }) {
  const c = config || {};
  const bonuses = c.bonuses || [];
  const currency = c.currency || '€';
  const startMoney = Number(c.startMoney) || 0;
  const stopLoss = Number(c.stopLoss) || 0;

  /* ─── Configurable sizes ─── */
  const cardW = Number(c.v8CardWidth) || 180;
  const cardH = Number(c.v8CardHeight) || 260;
  const fontSize = Number(c.v8FontSize) || 14;
  const autoSpeed = Number(c.v8AutoSpeed) || 4000;
  const showStats = c.v8ShowStats !== false;
  const showProgress = c.v8ShowProgress !== false;
  const cardSpacing = Number(c.v8CardSpacing) || 120;
  const cardRadius = Number(c.v8CardRadius) || 16;
  const statsFontSize = Number(c.v8StatsFontSize) || 13;
  const nameFontSize = Number(c.v8NameFontSize) || 14;

  /* ─── Colors ─── */
  const accentColor = c.headerAccent || '#7c3aed';
  const textColor = c.textColor || '#ffffff';
  const mutedColor = c.mutedTextColor || '#94a3b8';
  const totalPayColor = c.totalPayColor || '#eab308';
  const fontFamily = c.fontFamily || "'Inter', sans-serif";
  const bonusOpening = c.bonusOpening === true;

  const hex2rgb = (hex) => {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
    return m ? `${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)}` : '124,58,237';
  };
  const accentRgb = hex2rgb(accentColor);

  /* ─── Stats ─── */
  const stats = useMemo(() => {
    const opened = bonuses.filter(b => b.opened);
    const totalBet = bonuses.reduce((s, b) => s + (Number(b.betSize) || 0), 0);
    const totalWin = opened.reduce((s, b) => s + (Number(b.payout) || 0), 0);
    const totalBetOpened = opened.reduce((s, b) => s + (Number(b.betSize) || 0), 0);
    const avgMulti = totalBetOpened > 0 ? totalWin / totalBetOpened : 0;
    const target = Math.max(startMoney - stopLoss, 0);
    const breakEven = totalBet > 0 ? target / totalBet : 0;
    const profit = totalWin - startMoney;
    return { totalWin, avgMulti, breakEven, profit, openedCount: opened.length };
  }, [bonuses, startMoney, stopLoss]);

  /* ─── Auto-cycle ─── */
  const [activeIdx, setActiveIdx] = useState(0);
  const timerRef = useRef(null);
  const total = bonuses.length;

  const currentBonusIdx = bonuses.findIndex(b => !b.opened);
  const huntComplete = bonusOpening && currentBonusIdx === -1 && total > 0;

  const advance = useCallback(() => {
    if (total <= 0) return;
    setActiveIdx(prev => (prev + 1) % total);
  }, [total]);

  useEffect(() => {
    if (bonusOpening && currentBonusIdx >= 0) setActiveIdx(currentBonusIdx);
  }, [bonusOpening, currentBonusIdx]);

  useEffect(() => {
    if ((bonusOpening && !huntComplete) || total <= 1) return;
    timerRef.current = setInterval(advance, autoSpeed);
    return () => clearInterval(timerRef.current);
  }, [total, autoSpeed, advance, bonusOpening, huntComplete]);

  /* ─── Circular offset ─── */
  const getOffset = useCallback((idx) => {
    if (total <= 1) return idx - activeIdx;
    let off = idx - activeIdx;
    const half = total / 2;
    while (off > half) off -= total;
    while (off < -half) off += total;
    return off;
  }, [activeIdx, total]);

  const visibleCards = useMemo(() => {
    if (total === 0) return [];
    return bonuses
      .map((bonus, idx) => ({ bonus, idx, offset: getOffset(idx) }))
      .filter(({ offset }) => Math.abs(offset) <= 3);
  }, [bonuses, getOffset, total]);

  /* ─── 3D card transforms ─── */
  const cardStyle = (offset) => {
    const absOff = Math.abs(offset);
    const sign = offset < 0 ? -1 : 1;
    const spacing = cardSpacing;

    if (absOff >= 3) {
      return {
        position: 'absolute',
        transform: `translateX(${sign * spacing * 2.4}px) rotateY(${sign * -22}deg) translateZ(-200px) scale(0.3)`,
        opacity: 0, zIndex: 0, pointerEvents: 'none',
        transition: 'all 0.85s cubic-bezier(0.33,1,0.68,1)',
        willChange: 'transform, opacity',
      };
    }

    const txMap = [0, spacing, spacing * 1.85];
    const tzMap = [50, -15, -60];
    const ryMap = [0, -15, -25];
    const scMap = [1.05, 0.88, 0.72];
    const opMap = [1, 0.88, 0.6];

    return {
      position: 'absolute',
      transform: `translateX(${txMap[absOff] * sign}px) rotateY(${ryMap[absOff] * sign}deg) translateZ(${tzMap[absOff]}px) scale(${scMap[absOff]})`,
      opacity: opMap[absOff],
      zIndex: 10 - absOff * 3,
      filter: absOff === 2 ? 'blur(1.5px)' : 'none',
      transition: 'all 0.85s cubic-bezier(0.33,1,0.68,1)',
      willChange: 'transform, opacity',
    };
  };

  const rootStyle = {
    fontFamily,
    fontSize: `${fontSize}px`,
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    background: 'transparent',
    color: textColor,
    '--v8-accent': accentColor,
    '--v8-accent-rgb': accentRgb,
    '--v8-text': textColor,
    '--v8-muted': mutedColor,
    '--v8-total-pay': totalPayColor,
    '--v8-card-w': `${cardW}px`,
    '--v8-card-h': `${cardH}px`,
    '--v8-card-radius': `${cardRadius}px`,
    '--v8-name-size': `${nameFontSize}px`,
    '--v8-stats-size': `${statsFontSize}px`,
  };

  if (total === 0) {
    return (
      <div className="v8-root" style={rootStyle}>
        <div className="v8-empty">
          <span className="v8-empty-icon">🎴</span>
          No bonuses added yet
        </div>
      </div>
    );
  }

  const pct = total > 0 ? (stats.openedCount / total) * 100 : 0;

  return (
    <div className="v8-root" style={rootStyle}>

      {/* ── 3D Carousel Stage ── */}
      <div className="v8-stage">
        <div className="v8-perspective">
          {visibleCards.map(({ bonus, idx, offset }) => {
            const bet = Number(bonus.betSize) || 0;
            const payout = Number(bonus.payout) || 0;
            const multi = bet > 0 ? payout / bet : 0;
            const isCenter = offset === 0;
            const isCurrent = idx === currentBonusIdx;
            const slotName = bonus.slotName || bonus.slot?.name || 'Unknown';
            const provider = bonus.slot?.provider || bonus.provider || '';
            const image = bonus.slot?.image || '';
            const isSuper = bonus.isSuperBonus;
            const isExtreme = bonus.isExtremeBonus || bonus.isExtreme;

            return (
              <div key={`v8-${idx}`} className="v8-card-wrap" style={cardStyle(offset)}>
                <div className={`v8-card${isCenter ? ' v8-card--center' : ''}${isCurrent ? ' v8-card--current' : ''}${bonus.opened ? ' v8-card--opened' : ''}${isSuper ? ' v8-card--super' : ''}${isExtreme ? ' v8-card--extreme' : ''}`}>

                  {/* Image */}
                  <div className="v8-card-img-wrap">
                    {image ? (
                      <img src={image} alt={slotName} className="v8-card-img"
                        onError={e => { e.target.style.display = 'none'; }} />
                    ) : (
                      <div className="v8-card-img-ph">🎰</div>
                    )}
                  </div>

                  {/* Dark gradient overlay */}
                  <div className="v8-card-gradient" />

                  {/* Extreme blur cover */}
                  {isExtreme && !bonus.opened && (
                    <div className={`v8-extreme-cover${bonusOpening && isCenter && isCurrent ? ' v8-extreme-cover--reveal' : ''}`} />
                  )}

                  {/* Top badges: index + bet */}
                  <div className="v8-badges">
                    <span className="v8-badge v8-badge--idx">#{idx + 1}</span>
                    <span className="v8-badge v8-badge--bet">
                      {currency}{bet.toFixed(bet >= 10 ? 1 : 2)}
                    </span>
                  </div>

                  {/* Bottom info: name + provider */}
                  <div className="v8-card-info">
                    <div className="v8-card-name">{slotName}</div>
                    {provider && <div className="v8-card-provider">{provider}</div>}
                  </div>

                  {/* Result overlay if opened */}
                  {bonus.opened && (
                    <div className="v8-card-result">
                      <span className="v8-result-payout">{currency}{payout.toFixed(2)}</span>
                      <span className={`v8-result-multi${multi >= 50 ? ' v8-result-multi--big' : ''}`}>
                        {multi.toFixed(1)}x
                      </span>
                    </div>
                  )}

                  {/* Current bonus glow ring */}
                  {isCurrent && isCenter && <div className="v8-ring" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Progress bar ── */}
      {showProgress && (
        <div className="v8-progress">
          <div className="v8-progress-bar">
            <div className="v8-progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="v8-progress-text">{stats.openedCount}/{total}</span>
        </div>
      )}

      {/* ── Stats bar ── */}
      {showStats && (
        <div className="v8-stats">
          <div className="v8-stat">
            <span className="v8-stat-label">BONUSES</span>
            <span className="v8-stat-value">{stats.openedCount}/{total}</span>
          </div>
          <div className="v8-stat-sep" />
          <div className="v8-stat">
            <span className="v8-stat-label">AVG</span>
            <span className="v8-stat-value">{stats.avgMulti.toFixed(1)}x</span>
          </div>
          <div className="v8-stat-sep" />
          <div className="v8-stat">
            <span className="v8-stat-label">B.E.</span>
            <span className="v8-stat-value">{stats.breakEven.toFixed(1)}x</span>
          </div>
          <div className="v8-stat-sep" />
          <div className="v8-stat">
            <span className="v8-stat-label">PAYOUT</span>
            <span className="v8-stat-value" style={{ color: totalPayColor }}>{currency}{stats.totalWin.toFixed(0)}</span>
          </div>
          <div className="v8-stat-sep" />
          <div className="v8-stat">
            <span className="v8-stat-label">PROFIT</span>
            <span className={`v8-stat-value ${stats.profit >= 0 ? 'v8-val--green' : 'v8-val--red'}`}>
              {stats.profit >= 0 ? '+' : ''}{currency}{stats.profit.toFixed(0)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(BonusHuntWidgetV8);
