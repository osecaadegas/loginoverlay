import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';

/**
 * V9 — Hunt Board
 * A contained panel with a top slot-name strip, a 3D card carousel in the
 * centre (same depth-perspective as V8 card stack), and a stats bar at the
 * bottom.  Looks like a broadcast overlay "hunt board".
 */
export default function BonusHuntWidgetV9({ config, theme }) {
  const c = config || {};
  const bonuses = c.bonuses || [];
  const currency = c.currency || '€';
  const startMoney = Number(c.startMoney) || 0;
  const stopLoss = Number(c.stopLoss) || 0;

  /* ─── Colours ─── */
  const accentColor   = c.headerAccent || c.v9AccentColor || '#e844d0';
  const textColor     = c.textColor || '#ffffff';
  const mutedColor    = c.mutedTextColor || '#94a3b8';
  const containerBg   = c.v9ContainerBg || 'rgba(15,23,42,0.82)';
  const cardBg        = c.listCardColor || 'rgba(15,23,42,0.6)';
  const totalPayColor = c.totalPayColor || '#eab308';
  const superBadge    = c.superBadgeColor || '#eab308';
  const extremeBadge  = c.extremeBadgeColor || '#ef4444';
  const fontFamily    = c.fontFamily || "'Inter', sans-serif";
  const autoSpeed     = Number(c.v9AutoSpeed) || 4000;
  const showStats     = c.v9ShowStats !== false;

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

  const advance = useCallback(() => {
    if (total <= 0) return;
    setActiveIdx(prev => (prev + 1) % total);
  }, [total]);

  useEffect(() => {
    if (total <= 1) return;
    timerRef.current = setInterval(advance, autoSpeed);
    return () => clearInterval(timerRef.current);
  }, [total, autoSpeed, advance]);

  /* current bonus (first not-opened) */
  const currentBonusIdx = bonuses.findIndex(b => !b.opened);

  /* ─── Circular offset ─── */
  const getOffset = useCallback((idx) => {
    if (total <= 1) return idx - activeIdx;
    let off = idx - activeIdx;
    const half = total / 2;
    while (off > half)  off -= total;
    while (off < -half) off += total;
    return off;
  }, [activeIdx, total]);

  /* visible cards [-3,+3] */
  const visibleCards = useMemo(() => {
    if (total === 0) return [];
    return bonuses
      .map((bonus, idx) => ({ bonus, idx, offset: getOffset(idx) }))
      .filter(({ offset }) => Math.abs(offset) <= 3);
  }, [bonuses, getOffset, total]);

  /* 3D transforms matching V8 style */
  const cardStyle = (offset) => {
    const absOff = Math.abs(offset);
    const sign = offset < 0 ? -1 : 1;
    if (absOff >= 3) {
      return {
        position: 'absolute',
        transform: `translateX(${sign * 260}px) rotateY(${sign * -22}deg) translateZ(-200px) scale(0.3)`,
        opacity: 0, zIndex: 0,
        transition: 'transform 0.85s cubic-bezier(0.33,1,0.68,1), opacity 0.85s cubic-bezier(0.33,1,0.68,1), filter 0.85s ease',
        pointerEvents: 'none', willChange: 'transform, opacity',
      };
    }
    const txMap = [0, 120, 215], tzMap = [50, -10, -50], ryMap = [0, -14, -24];
    const scMap = [1.05, 0.88, 0.72], opMap = [1, 0.9, 0.65];
    return {
      position: 'absolute',
      transform: `translateX(${txMap[absOff] * sign}px) rotateY(${ryMap[absOff] * sign}deg) translateZ(${tzMap[absOff]}px) scale(${scMap[absOff]})`,
      opacity: opMap[absOff], zIndex: 10 - absOff * 3,
      transition: 'transform 0.85s cubic-bezier(0.33,1,0.68,1), opacity 0.85s cubic-bezier(0.33,1,0.68,1), filter 0.85s ease',
      filter: absOff === 2 ? 'blur(1px)' : 'none',
      willChange: 'transform, opacity',
    };
  };

  /* ─── Top strip: slot names as horizontal scrolling pills ─── */
  const stripBonuses = bonuses.slice(
    Math.max(0, activeIdx - 3),
    Math.min(total, activeIdx + 4)
  );

  const rootVars = {
    '--bhv9-accent': accentColor,
    '--bhv9-accent-rgb': accentRgb,
    '--bhv9-text': textColor,
    '--bhv9-muted': mutedColor,
    '--bhv9-container-bg': containerBg,
    '--bhv9-card-bg': cardBg,
    '--bhv9-total-pay': totalPayColor,
  };

  if (total === 0) {
    return (
      <div className="bhv9-root" style={{ fontFamily, color: textColor, ...rootVars }}>
        <div className="bhv9-container">
          <div style={{ textAlign: 'center', opacity: 0.5, fontSize: '1.1em', padding: 40 }}>
            <div style={{ fontSize: '2.5em', marginBottom: 8 }}>🎯</div>
            No bonuses added yet
          </div>
        </div>
      </div>
    );
  }

  /* Current bonus for the bottom highlight */
  const curBonus = currentBonusIdx >= 0 ? bonuses[currentBonusIdx] : null;
  const curBet   = curBonus ? (Number(curBonus.betSize) || 0) : 0;
  const curPay   = curBonus ? (Number(curBonus.payout) || 0) : 0;
  const curMulti = curBet > 0 ? curPay / curBet : 0;

  return (
    <div className="bhv9-root" style={{ fontFamily, color: textColor, ...rootVars }}>
      <div className="bhv9-container">

        {/* ─── Top: slot-name strip ─── */}
        <div className="bhv9-strip">
          <div className="bhv9-strip-scroll">
            {bonuses.map((b, i) => {
              const bet = Number(b.betSize) || 0;
              const isActive = i === activeIdx;
              return (
                <button key={i} className={`bhv9-strip-pill${isActive ? ' bhv9-strip-pill--active' : ''}${b.opened ? ' bhv9-strip-pill--opened' : ''}`}
                  onClick={() => setActiveIdx(i)}>
                  <span className="bhv9-strip-name">{b.slotName || b.slot?.name || '?'}</span>
                  <span className="bhv9-strip-bet">{currency}{bet.toFixed(bet >= 10 ? 1 : 2)}</span>
                </button>
              );
            })}
          </div>
          <span className="bhv9-strip-counter">{stats.openedCount}/{total}</span>
        </div>

        {/* ─── Middle: 3D carousel ─── */}
        <div className="bhv9-stage">
          <div className="bhv9-cards-perspective">
            {visibleCards.map(({ bonus, idx, offset }) => {
              const bet = Number(bonus.betSize) || 0;
              const payout = Number(bonus.payout) || 0;
              const multi = bet > 0 ? payout / bet : 0;
              const isCenter = offset === 0;
              const isCurrent = idx === currentBonusIdx;
              const slotName = bonus.slotName || bonus.slot?.name || 'Unknown';
              const provider = bonus.slot?.provider || bonus.provider || '';
              const image = bonus.slot?.image || '';

              return (
                <div key={`v9-${idx}`} className="bhv9-card-wrapper" style={cardStyle(offset)}>
                  <div className={`bhv9-card${isCenter ? ' bhv9-card--center' : ''}${isCurrent ? ' bhv9-card--current' : ''}${bonus.opened ? ' bhv9-card--opened' : ''}`}>
                    {/* image */}
                    <div className="bhv9-card-img-bg">
                      {image ? (
                        <img src={image} alt={slotName} className="bhv9-card-img"
                          onError={e => { e.target.style.display = 'none'; }} />
                      ) : (
                        <div className="bhv9-card-img-placeholder">🎰</div>
                      )}
                    </div>
                    <div className="bhv9-card-overlay" />

                    {/* top badges */}
                    <div className="bhv9-card-badges">
                      <span className="bhv9-badge bhv9-badge--idx">#{idx + 1}</span>
                      <span className="bhv9-badge bhv9-badge--bet">{currency}{bet.toFixed(bet >= 10 ? 1 : 2)}</span>
                    </div>

                    {/* super/extreme */}
                    {(bonus.isSuperBonus || bonus.isExtreme) && (
                      <div className="bhv9-card-super"
                        style={{ color: bonus.isExtreme ? extremeBadge : superBadge }}>
                        {bonus.isExtreme ? '🔥' : '⭐'}
                      </div>
                    )}

                    {/* result bar */}
                    {bonus.opened && (
                      <div className="bhv9-card-result">
                        <span className="bhv9-card-payout">{currency}{payout.toFixed(2)}</span>
                        <span className="bhv9-card-multi">{multi.toFixed(1)}x</span>
                      </div>
                    )}

                    {/* name + provider */}
                    <div className="bhv9-card-info">
                      <div className="bhv9-card-name">{slotName}</div>
                      {provider && <div className="bhv9-card-provider">{provider}</div>}
                    </div>

                    {/* current glow ring */}
                    {isCurrent && isCenter && <div className="bhv9-card-ring" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Bottom: stats bar ─── */}
        {showStats && (
          <div className="bhv9-bottom">
            {/* Stats row */}
            <div className="bhv9-stats-row">
              <div className="bhv9-stat">
                <span className="bhv9-stat-icon">💰</span>
                <span className="bhv9-stat-val">{currency}{startMoney.toFixed(0)}</span>
              </div>
              <div className="bhv9-stat-divider" />
              <div className="bhv9-stat">
                <span className="bhv9-stat-icon">📊</span>
                <span className="bhv9-stat-val">{stats.avgMulti.toFixed(1)}X</span>
              </div>
              <div className="bhv9-stat-divider" />
              <div className="bhv9-stat">
                <span className="bhv9-stat-icon">🏆</span>
                <span className="bhv9-stat-val">{stats.maxMulti.toFixed(0)}X</span>
              </div>
              <div className="bhv9-stat-divider" />
              <div className="bhv9-stat">
                <span className="bhv9-stat-icon">{stats.profit >= 0 ? '✅' : '❌'}</span>
                <span className={`bhv9-stat-val ${stats.profit >= 0 ? 'bhv9-val--green' : 'bhv9-val--red'}`}>
                  {stats.profit >= 0 ? 'WIN' : 'LOSE'}
                </span>
              </div>
            </div>

            {/* Current bonus highlight */}
            {curBonus && (
              <div className="bhv9-current">
                <span className="bhv9-current-crown">👑</span>
                <span className="bhv9-current-name">{curBonus.slotName || curBonus.slot?.name}</span>
                {curBonus.opened ? (
                  <>
                    <span className="bhv9-current-payout">{currency}{curPay.toFixed(2)}</span>
                    <span className="bhv9-current-multi">{curMulti.toFixed(0)}X</span>
                  </>
                ) : (
                  <span className="bhv9-current-bet">{currency}{curBet.toFixed(2)}</span>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
