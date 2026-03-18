import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';

/**
 * V9 — Hunt Board  (fully rebuilt)
 * Contained panel with title header, 3D card carousel, progress bar,
 * and a clean stats grid. Every dimension is configurable from the panel.
 */
function BonusHuntWidgetV9({ config }) {
  const c = config || {};
  const bonuses = c.bonuses || [];
  const currency = c.currency || '€';
  const startMoney = Number(c.startMoney) || 0;
  const stopLoss = Number(c.stopLoss) || 0;

  /* ─── Configurable sizes ─── */
  const cardW = Number(c.v9CardWidth) || 160;
  const cardH = Number(c.v9CardHeight) || 230;
  const fontSize = Number(c.v9FontSize) || 14;
  const autoSpeed = Number(c.v9AutoSpeed) || 4000;
  const showStats = c.v9ShowStats !== false;
  const showHeader = c.v9ShowHeader !== false;
  const showProgress = c.v9ShowProgress !== false;
  const cardSpacing = Number(c.v9CardSpacing) || 110;
  const cardRadius = Number(c.v9CardRadius) || 14;
  const containerRadius = Number(c.v9ContainerRadius) || 18;
  const statsFontSize = Number(c.v9StatsFontSize) || 13;
  const titleFontSize = Number(c.v9TitleFontSize) || 18;

  /* ─── Colors ─── */
  const accentColor = c.headerAccent || '#e844d0';
  const textColor = c.textColor || '#ffffff';
  const mutedColor = c.mutedTextColor || '#94a3b8';
  const containerBg = c.v9ContainerBg || 'rgba(15,23,42,0.85)';
  const totalPayColor = c.totalPayColor || '#eab308';
  const fontFamily = c.fontFamily || "'Inter', sans-serif";
  const bonusOpening = c.bonusOpening === true;
  const huntTitle = c.huntTitle || c.title || 'BONUS HUNT';

  const hex2rgb = (hex) => {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
    return m ? `${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)}` : '232,68,208';
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
    const maxMulti = opened.reduce((mx, b) => {
      const m = (Number(b.betSize) || 0) > 0 ? (Number(b.payout) || 0) / Number(b.betSize) : 0;
      return m > mx ? m : mx;
    }, 0);
    return { totalWin, totalBet, avgMulti, breakEven, profit, maxMulti, openedCount: opened.length };
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
        transform: `translateX(${sign * spacing * 2.3}px) rotateY(${sign * -20}deg) translateZ(-180px) scale(0.3)`,
        opacity: 0, zIndex: 0, pointerEvents: 'none',
        transition: 'all 0.85s cubic-bezier(0.33,1,0.68,1)',
        willChange: 'transform, opacity',
      };
    }

    const txMap = [0, spacing, spacing * 1.8];
    const tzMap = [45, -10, -50];
    const ryMap = [0, -14, -23];
    const scMap = [1.04, 0.86, 0.7];
    const opMap = [1, 0.85, 0.55];

    return {
      position: 'absolute',
      transform: `translateX(${txMap[absOff] * sign}px) rotateY(${ryMap[absOff] * sign}deg) translateZ(${tzMap[absOff]}px) scale(${scMap[absOff]})`,
      opacity: opMap[absOff],
      zIndex: 10 - absOff * 3,
      filter: absOff === 2 ? 'blur(1px)' : 'none',
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
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    background: 'transparent',
    color: textColor,
    '--v9-accent': accentColor,
    '--v9-accent-rgb': accentRgb,
    '--v9-text': textColor,
    '--v9-muted': mutedColor,
    '--v9-total-pay': totalPayColor,
    '--v9-card-w': `${cardW}px`,
    '--v9-card-h': `${cardH}px`,
    '--v9-card-radius': `${cardRadius}px`,
    '--v9-container-bg': containerBg,
    '--v9-container-radius': `${containerRadius}px`,
    '--v9-stats-size': `${statsFontSize}px`,
    '--v9-title-size': `${titleFontSize}px`,
  };

  if (total === 0) {
    return (
      <div className="v9-root" style={rootStyle}>
        <div className="v9-container">
          <div className="v9-empty">
            <span className="v9-empty-icon">🎯</span>
            No bonuses added yet
          </div>
        </div>
      </div>
    );
  }

  const pct = total > 0 ? (stats.openedCount / total) * 100 : 0;
  const curBonus = currentBonusIdx >= 0 ? bonuses[currentBonusIdx] : null;

  return (
    <div className="v9-root" style={rootStyle}>
      <div className="v9-container">

        {/* ── Header ── */}
        {showHeader && (
          <div className="v9-header">
            <div className="v9-header-left">
              <span className="v9-title">{huntTitle}</span>
              {c.huntNumber && <span className="v9-hunt-num">#{c.huntNumber}</span>}
            </div>
            <div className="v9-header-right">
              <span className="v9-header-count">{stats.openedCount}/{total}</span>
            </div>
          </div>
        )}

        {/* ── 3D Carousel Stage ── */}
        <div className="v9-stage">
          <div className="v9-perspective">
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
                <div key={`v9-${idx}`} className="v9-card-wrap" style={cardStyle(offset)}>
                  <div className={`v9-card${isCenter ? ' v9-card--center' : ''}${isCurrent ? ' v9-card--current' : ''}${bonus.opened ? ' v9-card--opened' : ''}${isSuper ? ' v9-card--super' : ''}${isExtreme ? ' v9-card--extreme' : ''}`}>

                    <div className="v9-card-img-wrap">
                      {image ? (
                        <img src={image} alt={slotName} className="v9-card-img"
                          onError={e => { e.target.style.display = 'none'; }} />
                      ) : (
                        <div className="v9-card-img-ph">🎰</div>
                      )}
                    </div>

                    <div className="v9-card-gradient" />

                    {isExtreme && !bonus.opened && (
                      <div className={`v9-extreme-cover${bonusOpening && isCenter && isCurrent ? ' v9-extreme-cover--reveal' : ''}`} />
                    )}

                    <div className="v9-badges">
                      <span className="v9-badge v9-badge--idx">#{idx + 1}</span>
                      <span className="v9-badge v9-badge--bet">
                        {currency}{bet.toFixed(bet >= 10 ? 1 : 2)}
                      </span>
                    </div>

                    <div className="v9-card-info">
                      <div className="v9-card-name">{slotName}</div>
                      {provider && <div className="v9-card-provider">{provider}</div>}
                    </div>

                    {bonus.opened && (
                      <div className="v9-card-result">
                        <span className="v9-result-payout">{currency}{payout.toFixed(2)}</span>
                        <span className={`v9-result-multi${multi >= 50 ? ' v9-result-multi--big' : ''}`}>
                          {multi.toFixed(1)}x
                        </span>
                      </div>
                    )}

                    {isCurrent && isCenter && <div className="v9-ring" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Progress bar ── */}
        {showProgress && (
          <div className="v9-progress">
            <div className="v9-progress-bar">
              <div className="v9-progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="v9-progress-text">{stats.openedCount}/{total}</span>
          </div>
        )}

        {/* ── Stats grid ── */}
        {showStats && (
          <div className="v9-stats">
            <div className="v9-stat-box">
              <span className="v9-stat-label">START</span>
              <span className="v9-stat-value">{currency}{startMoney.toFixed(0)}</span>
            </div>
            <div className="v9-stat-box">
              <span className="v9-stat-label">AVG</span>
              <span className="v9-stat-value">{stats.avgMulti.toFixed(1)}x</span>
            </div>
            <div className="v9-stat-box">
              <span className="v9-stat-label">B.E.</span>
              <span className="v9-stat-value">{stats.breakEven.toFixed(1)}x</span>
            </div>
            <div className="v9-stat-box">
              <span className="v9-stat-label">BEST</span>
              <span className="v9-stat-value">{stats.maxMulti.toFixed(0)}x</span>
            </div>
            <div className="v9-stat-box">
              <span className="v9-stat-label">PAYOUT</span>
              <span className="v9-stat-value" style={{ color: totalPayColor }}>{currency}{stats.totalWin.toFixed(0)}</span>
            </div>
            <div className="v9-stat-box">
              <span className="v9-stat-label">PROFIT</span>
              <span className={`v9-stat-value ${stats.profit >= 0 ? 'v9-val--green' : 'v9-val--red'}`}>
                {stats.profit >= 0 ? '+' : ''}{currency}{stats.profit.toFixed(0)}
              </span>
            </div>
          </div>
        )}

        {/* ── Current bonus highlight ── */}
        {curBonus && (
          <div className="v9-current">
            <span className="v9-current-label">NOW OPENING</span>
            <span className="v9-current-name">{curBonus.slotName || curBonus.slot?.name}</span>
            <span className="v9-current-bet">{currency}{(Number(curBonus.betSize) || 0).toFixed(2)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(BonusHuntWidgetV9);
