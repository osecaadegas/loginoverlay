import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';

/**
 * V8 — Card Stack / Fan Carousel
 * Shows slot cards in a 3D fan layout (like the screenshot).
 * Center card is largest, flanking cards are smaller, rotated, receded.
 * Auto-advances right-to-left with smooth transitions.
 */
export default function BonusHuntWidgetV8({ config, theme }) {
  const c = config || {};
  const bonuses = c.bonuses || [];
  const currency = c.currency || '€';
  const startMoney = Number(c.startMoney) || 0;
  const stopLoss = Number(c.stopLoss) || 0;

  /* customisable */
  const accentColor = c.v8AccentColor || '#7c3aed';
  const bgColor = c.v8BgColor || '#2563eb';
  const textColor = c.v8TextColor || '#ffffff';
  const fontFamily = c.fontFamily || "'Inter', sans-serif";
  const autoSpeed = Number(c.v8AutoSpeed) || 4000;   // ms per card
  const showStats = c.v8ShowStats !== false;
  const cardCount = 5; // visible cards (2 left + center + 2 right)

  /* stats */
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

  /* active index — cycles automatically */
  const [activeIdx, setActiveIdx] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const timerRef = useRef(null);
  const total = bonuses.length;

  const advance = useCallback(() => {
    if (total <= 0) return;
    setIsAnimating(true);
    setActiveIdx(prev => (prev + 1) % total);
    setTimeout(() => setIsAnimating(false), 600);
  }, [total]);

  useEffect(() => {
    if (total <= 1) return;
    timerRef.current = setInterval(advance, autoSpeed);
    return () => clearInterval(timerRef.current);
  }, [total, autoSpeed, advance]);

  /* find current bonus (first not-opened) for highlight */
  const currentBonusIdx = bonuses.findIndex(b => !b.opened);

  /* get card at offset from active */
  const getCardAtOffset = (offset) => {
    if (total === 0) return null;
    const idx = ((activeIdx + offset) % total + total) % total;
    return { bonus: bonuses[idx], idx };
  };

  /* positions: -2, -1, 0(center), +1, +2 */
  const positions = [-2, -1, 0, 1, 2];

  const cardStyle = (pos) => {
    const absPos = Math.abs(pos);
    const scale = pos === 0 ? 1 : absPos === 1 ? 0.82 : 0.66;
    const translateX = pos * 130;
    const translateZ = pos === 0 ? 0 : absPos === 1 ? -60 : -120;
    const rotateY = pos * -8;
    const opacity = pos === 0 ? 1 : absPos === 1 ? 0.85 : 0.55;
    const zIndex = 10 - absPos * 2;

    return {
      transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
      opacity,
      zIndex,
      transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
    };
  };

  /* hex to rgb helper */
  const hex2rgb = (hex) => {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m ? `${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)}` : '99,102,241';
  };

  const rootStyle = {
    fontFamily,
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    background: `radial-gradient(ellipse at 50% 60%, ${bgColor}, color-mix(in srgb, ${bgColor} 60%, #000))`,
    position: 'relative',
    color: textColor,
  };

  if (total === 0) {
    return (
      <div style={rootStyle}>
        <div style={{ textAlign: 'center', opacity: 0.6, fontSize: '1.1em' }}>
          <div style={{ fontSize: '2.5em', marginBottom: 8 }}>🎴</div>
          No bonuses added yet
        </div>
      </div>
    );
  }

  return (
    <div className="bhv8-root" style={rootStyle}>
      {/* ambient glow */}
      <div className="bhv8-glow" style={{
        background: `radial-gradient(ellipse at center, rgba(${hex2rgb(accentColor)}, 0.15) 0%, transparent 70%)`,
      }} />

      {/* 3D card stack */}
      <div className="bhv8-stage">
        <div className="bhv8-cards-perspective">
          {positions.map(pos => {
            const data = getCardAtOffset(pos);
            if (!data) return null;
            const { bonus, idx } = data;
            const bet = Number(bonus.betSize) || 0;
            const payout = Number(bonus.payout) || 0;
            const multi = bet > 0 ? payout / bet : 0;
            const isCenter = pos === 0;
            const isCurrent = idx === currentBonusIdx;
            const slotName = bonus.slotName || bonus.slot?.name || 'Unknown';
            const provider = bonus.slot?.provider || bonus.provider || '';
            const image = bonus.slot?.image || '';

            return (
              <div key={`pos-${pos}`} className="bhv8-card-wrapper" style={cardStyle(pos)}>
                <div className={`bhv8-card ${isCenter ? 'bhv8-card--center' : ''} ${isCurrent ? 'bhv8-card--current' : ''} ${bonus.opened ? 'bhv8-card--opened' : ''}`}
                  style={{
                    '--bhv8-accent': accentColor,
                    '--bhv8-accent-rgb': hex2rgb(accentColor),
                  }}>

                  {/* slot image background */}
                  <div className="bhv8-card-img-bg">
                    {image ? (
                      <img src={image} alt={slotName} className="bhv8-card-img"
                        onError={e => { e.target.style.display = 'none'; }} />
                    ) : (
                      <div className="bhv8-card-img-placeholder">🎰</div>
                    )}
                  </div>

                  {/* overlay gradient */}
                  <div className="bhv8-card-overlay" />

                  {/* top badges */}
                  <div className="bhv8-card-badges">
                    <span className="bhv8-badge bhv8-badge--count">
                      <span className="bhv8-badge-icon">🎯</span>
                      {idx + 1}
                    </span>
                    <span className="bhv8-badge bhv8-badge--bet">
                      {currency} {bet.toFixed(1)}
                    </span>
                  </div>

                  {/* super/extreme badge */}
                  {(bonus.isSuperBonus || bonus.isExtreme) && (
                    <div className="bhv8-card-super-badge">
                      {bonus.isExtreme ? '🔥' : '⭐'}
                    </div>
                  )}

                  {/* center text */}
                  <div className="bhv8-card-info">
                    <div className="bhv8-card-name">{slotName}</div>
                    {provider && <div className="bhv8-card-provider">{provider}</div>}
                  </div>

                  {/* opened result bar */}
                  {bonus.opened && (
                    <div className="bhv8-card-result">
                      <span className="bhv8-card-payout">{currency}{payout.toFixed(2)}</span>
                      <span className="bhv8-card-multi">{multi.toFixed(1)}x</span>
                    </div>
                  )}

                  {/* current bonus glow ring */}
                  {isCurrent && isCenter && <div className="bhv8-card-ring" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* bottom stats bar */}
      {showStats && (
        <div className="bhv8-stats-bar" style={{ '--bhv8-accent-rgb': hex2rgb(accentColor) }}>
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

      {/* progress dots */}
      <div className="bhv8-dots">
        {bonuses.slice(0, Math.min(total, 20)).map((b, i) => (
          <div key={i} className={`bhv8-dot ${i === activeIdx ? 'bhv8-dot--active' : ''} ${b.opened ? 'bhv8-dot--opened' : ''}`}
            style={{ '--bhv8-accent': accentColor }} />
        ))}
        {total > 20 && <span className="bhv8-dots-more">+{total - 20}</span>}
      </div>
    </div>
  );
}
