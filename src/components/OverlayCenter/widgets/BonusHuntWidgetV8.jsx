import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';

/**
 * V8 — 3D Carousel
 * Cards are keyed by bonus index so each DOM element persists and smoothly
 * transitions between positions via CSS — no content teleportation.
 * Render window [-3,+3] with ±3 invisible for seamless entry/exit.
 */
function BonusHuntWidgetV8({ config, theme }) {
  const c = config || {};
  const bonuses = c.bonuses || [];
  const currency = c.currency || '€';
  const startMoney = Number(c.startMoney) || 0;
  const stopLoss = Number(c.stopLoss) || 0;

  /* ─── Colors: read from BH config keys (set by "Sync from Navbar") ─── */
  const accentColor = c.headerAccent || c.v8AccentColor || '#7c3aed';
  const textColor = c.textColor || c.v8TextColor || '#ffffff';
  const mutedColor = c.mutedTextColor || '#94a3b8';
  const cardBg = c.listCardColor || 'rgba(15,23,42,0.6)';
  const cardAccent = c.listCardAccent || accentColor;
  const totalPayColor = c.totalPayColor || '#eab308';
  const superBadgeColor = c.superBadgeColor || '#eab308';
  const extremeBadgeColor = c.extremeBadgeColor || '#ef4444';
  const fontFamily = c.fontFamily || "'Inter', sans-serif";
  const autoSpeed = Number(c.v8AutoSpeed) || 4000;
  const showStats = c.v8ShowStats !== false;

  /* hex to rgb */
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

  /* ─── Circular offset: shortest distance around the ring ─── */
  const getOffset = useCallback((idx) => {
    if (total <= 1) return idx - activeIdx;
    let off = idx - activeIdx;
    const half = total / 2;
    while (off > half) off -= total;
    while (off < -half) off += total;
    return off;
  }, [activeIdx, total]);

  /* ─── Visible cards: 5 max visible [-2,+2] with ±3 as invisible staging ─── */
  const visibleCards = useMemo(() => {
    if (total === 0) return [];
    return bonuses
      .map((bonus, idx) => ({ bonus, idx, offset: getOffset(idx) }))
      .filter(({ offset }) => Math.abs(offset) <= 3);
  }, [bonuses, getOffset, total]);

  /* ─── 3D carousel card transforms — max 5 visible ─── */
  const cardStyle = (offset) => {
    const absOff = Math.abs(offset);
    const sign = offset < 0 ? -1 : 1;

    /* ±3 = invisible staging slots (smooth entry/exit) */
    if (absOff >= 3) {
      return {
        position: 'absolute',
        transform: `translateX(${sign * 290}px) rotateY(${sign * -22}deg) translateZ(-200px) scale(0.3)`,
        opacity: 0,
        zIndex: 0,
        transition: 'transform 0.85s cubic-bezier(0.33, 1, 0.68, 1), opacity 0.85s cubic-bezier(0.33, 1, 0.68, 1), filter 0.85s ease',
        pointerEvents: 'none',
        willChange: 'transform, opacity',
      };
    }

    /* ±1 closer together, ±2 outermost visible — tighter arc */
    const txMap  = [0, 130, 235];   /* 0 → center, ±1 → ±130px, ±2 → ±235px */
    const tzMap  = [60, -10, -55];
    const ryMap  = [0, -14, -24];
    const scMap  = [1.05, 0.9, 0.75];
    const opMap  = [1, 0.92, 0.7];

    const tx    = txMap[absOff] * sign;
    const tz    = tzMap[absOff];
    const ry    = ryMap[absOff] * sign;
    const scale = scMap[absOff];
    const opacity = opMap[absOff];
    const zIndex  = 10 - absOff * 3;

    return {
      position: 'absolute',
      transform: `translateX(${tx}px) rotateY(${ry}deg) translateZ(${tz}px) scale(${scale})`,
      opacity,
      zIndex,
      transition: 'transform 0.85s cubic-bezier(0.33, 1, 0.68, 1), opacity 0.85s cubic-bezier(0.33, 1, 0.68, 1), filter 0.85s ease',
      filter: absOff === 2 ? 'blur(1px)' : 'none',
      willChange: 'transform, opacity',
    };
  };

  /* ─── Root: fully transparent ─── */
  const rootStyle = {
    fontFamily,
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    background: 'transparent',
    position: 'relative',
    color: textColor,
    '--bhv8-accent': accentColor,
    '--bhv8-accent-rgb': accentRgb,
    '--bhv8-text': textColor,
    '--bhv8-muted': mutedColor,
    '--bhv8-card-bg': cardBg,
    '--bhv8-card-accent': cardAccent,
    '--bhv8-total-pay': totalPayColor,
  };

  if (total === 0) {
    return (
      <div style={{ ...rootStyle, justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', opacity: 0.5, fontSize: '1.1em' }}>
          <div style={{ fontSize: '2.5em', marginBottom: 8 }}>🎴</div>
          No bonuses added yet
        </div>
      </div>
    );
  }

  return (
    <div className="bhv8-root" style={rootStyle}>
      {/* subtle ambient light */}
      <div className="bhv8-glow" />

      {/* ─── 3D carousel ─── */}
      <div className="bhv8-stage">
        <div className="bhv8-cards-perspective">
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
              <div key={`card-${idx}`} className="bhv8-card-wrapper" style={cardStyle(offset)}>
                <div className={`bhv8-card${isCenter ? ' bhv8-card--center' : ''}${isCurrent ? ' bhv8-card--current' : ''}${bonus.opened ? ' bhv8-card--opened' : ''}`}>

                  {/* slot image */}
                  <div className="bhv8-card-img-bg">
                    {image ? (
                      <img src={image} alt={slotName} className="bhv8-card-img"
                        onError={e => { e.target.style.display = 'none'; }} />
                    ) : (
                      <div className="bhv8-card-img-placeholder">🎰</div>
                    )}
                  </div>

                  {/* gradient overlay */}
                  <div className="bhv8-card-overlay" />

                  {/* top badges */}
                  <div className="bhv8-card-badges">
                    <span className="bhv8-badge bhv8-badge--count">
                      🎯 {idx + 1}
                    </span>
                    <span className="bhv8-badge bhv8-badge--bet">
                      BET {bet.toFixed(1)}{currency}
                    </span>
                  </div>

                  {/* super/extreme badge */}
                  {(bonus.isSuperBonus || bonus.isExtreme) && (
                    <div className="bhv8-card-super-badge"
                      style={{ color: bonus.isExtreme ? extremeBadgeColor : superBadgeColor }}>
                      {bonus.isExtreme ? '🔥' : '⭐'} {payout > 0 ? `${currency}${payout.toFixed(0)}` : ''}
                    </div>
                  )}

                  {/* opened result bar */}
                  {bonus.opened && (
                    <div className="bhv8-card-result">
                      <span className="bhv8-card-payout">⭐ {currency}{payout.toFixed(2)}</span>
                      <span className="bhv8-card-multi">{multi.toFixed(1)}x</span>
                    </div>
                  )}

                  {/* slot name + provider */}
                  {!bonus.opened && (
                    <div className="bhv8-card-info">
                      <div className="bhv8-card-name">{slotName}</div>
                      {provider && <div className="bhv8-card-provider">{provider}</div>}
                    </div>
                  )}

                  {/* current bonus ring */}
                  {isCurrent && isCenter && <div className="bhv8-card-ring" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Bottom stats bar ─── */}
      {showStats && (
        <div className="bhv8-stats-bar">
          <div className="bhv8-stat">
            <span className="bhv8-stat-label">BONUSES</span>
            <span className="bhv8-stat-value">{stats.openedCount}/{total}</span>
          </div>
          <div className="bhv8-stat-divider" />
          <div className="bhv8-stat">
            <span className="bhv8-stat-label">AVG</span>
            <span className="bhv8-stat-value">{stats.avgMulti.toFixed(2)}x</span>
          </div>
          <div className="bhv8-stat-divider" />
          <div className="bhv8-stat">
            <span className="bhv8-stat-label">BE</span>
            <span className="bhv8-stat-value">{stats.breakEven.toFixed(2)}x</span>
          </div>
          <div className="bhv8-stat-divider" />
          <div className="bhv8-stat">
            <span className="bhv8-stat-label">PAYOUT</span>
            <span className="bhv8-stat-value">{currency}{stats.totalWin.toFixed(2)}</span>
          </div>
          <div className="bhv8-stat-divider" />
          <div className="bhv8-stat">
            <span className="bhv8-stat-label">PROFIT</span>
            <span className={`bhv8-stat-value ${stats.profit >= 0 ? 'bhv8-val--green' : 'bhv8-val--red'}`}>
              {stats.profit >= 0 ? '+' : ''}{currency}{stats.profit.toFixed(2)}
            </span>
          </div>
        </div>
      )}


    </div>
  );
}

export default React.memo(BonusHuntWidgetV8);
