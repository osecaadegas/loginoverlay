import React, { useMemo, useState, useEffect, useCallback } from 'react';

/**
 * BonusHuntWidgetV11 — "Fever"
 *
 * Layout:
 *  1. Compact header with icon, "BONUS HUNT" title, "fever" subtitle, hunt number
 *  2. Stats row: START + BREAKEVEN
 *  3. Counts row: BONUSES total, SUPER count, EXTREME count
 *  4. Horizontal 3D carousel of slot cards (auto-scroll or snap-to-current during opening)
 *  5. "BONUS LIST" label
 *  6. Vertical auto-scroll list of all bonuses
 */
function BonusHuntWidgetV11({ config, theme }) {
  const c = config || {};
  const bonuses = c.bonuses || [];
  const currency = c.currency || '€';
  const startMoney = Number(c.startMoney) || 0;
  const stopLoss = Number(c.stopLoss) || 0;

  /* ─── Derived stats ─── */
  const stats = useMemo(() => {
    const totalBetAll = bonuses.reduce((s, b) => s + (Number(b.betSize) || 0), 0);
    const openedBonuses = bonuses.filter(b => b.opened);
    const totalBetOpened = openedBonuses.reduce((s, b) => s + (Number(b.betSize) || 0), 0);
    const totalWin = openedBonuses.reduce((s, b) => s + (Number(b.payout) || 0), 0);
    const totalBetRemaining = Math.max(totalBetAll - totalBetOpened, 0);
    const superCount = bonuses.filter(b => b.isSuperBonus).length;
    const extremeCount = bonuses.filter(b => b.isExtremeBonus || b.isExtreme).length;

    const target = Math.max(startMoney - stopLoss, 0);
    const breakEven = totalBetAll > 0 ? target / totalBetAll : 0;
    const remaining = Math.max(target - totalWin, 0);
    const liveBE = totalBetRemaining > 0 ? remaining / totalBetRemaining : 0;
    const avgMulti = totalBetOpened > 0 ? totalWin / totalBetOpened : 0;

    return { totalBetAll, totalWin, superCount, extremeCount, breakEven, liveBE, avgMulti, openedCount: openedBonuses.length };
  }, [bonuses, startMoney, stopLoss]);

  /* ─── Auto-rotating carousel ─── */
  const [carouselIdx, setCarouselIdx] = useState(0);
  useEffect(() => {
    if (bonuses.length < 2) return;
    const id = setInterval(() => setCarouselIdx(i => (i + 1) % bonuses.length), 2500);
    return () => clearInterval(id);
  }, [bonuses.length]);

  /* ─── Current bonus (first not-opened) ─── */
  const currentBonus = bonuses.find(b => !b.opened);
  const currentIndex = currentBonus ? bonuses.indexOf(currentBonus) : -1;
  const isOpening = !!c.bonusOpening && currentIndex >= 0;

  /* ─── Dynamic title ─── */
  const huntTitle = c.bonusOpening ? 'BONUS OPENING' : 'BONUS HUNT';

  /* ─── Style vars ─── */
  const headerColor = c.headerColor || '#0a0e27';
  const headerAccent = c.headerAccent || '#60a5fa';
  const countCardColor = c.countCardColor || '#0f1535';
  const currentBonusColor = c.currentBonusColor || '#0d2818';
  const currentBonusAccent = c.currentBonusAccent || '#4ade80';
  const listCardColor = c.listCardColor || '#0f1535';
  const listCardAccent = c.listCardAccent || '#eab308';
  const summaryColor = c.summaryColor || '#0a0e27';
  const totalPayColor = c.totalPayColor || '#eab308';
  const totalPayText = c.totalPayText || '#ffffff';
  const superBadgeColor = c.superBadgeColor || '#eab308';
  const extremeBadgeColor = c.extremeBadgeColor || '#ef4444';
  const textColor = c.textColor || '#ffffff';
  const mutedTextColor = c.mutedTextColor || '#93c5fd';
  const statValueColor = c.statValueColor || '#ffffff';
  const cardOutlineColor = c.cardOutlineColor || 'rgba(96,165,250,0.2)';
  const cardOutlineWidth = c.cardOutlineWidth ?? 1;
  const fontFamily = c.fontFamily || "'Inter', sans-serif";
  const fontSize = c.fontSize ?? 15;
  const cardRadius = c.cardRadius ?? 16;
  const cardGap = c.cardGap ?? 8;
  const cardPadding = c.cardPadding ?? 10;
  const brightness = c.brightness ?? 100;
  const contrast = c.contrast ?? 100;
  const saturation = c.saturation ?? 100;

  const carouselCardW = 170, carouselGap = 10;
  const carouselStep = carouselCardW + carouselGap;

  const rootStyle = {
    fontFamily,
    fontSize: `${fontSize}px`,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    filter: (brightness !== 100 || contrast !== 100 || saturation !== 100)
      ? `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
      : undefined,
    '--bht11-header-bg': headerColor,
    '--bht11-header-accent': headerAccent,
    '--bht11-count-bg': countCardColor,
    '--bht11-current-bg': currentBonusColor,
    '--bht11-current-accent': currentBonusAccent,
    '--bht11-list-bg': listCardColor,
    '--bht11-list-accent': listCardAccent,
    '--bht11-summary-bg': summaryColor,
    '--bht11-total-pay-bg': totalPayColor,
    '--bht11-total-pay-text': totalPayText,
    '--bht11-super-badge': superBadgeColor,
    '--bht11-extreme-badge': extremeBadgeColor,
    '--bht11-text': textColor,
    '--bht11-muted': mutedTextColor,
    '--bht11-stat-value': statValueColor,
    '--bht11-card-outline': cardOutlineColor,
    '--bht11-card-outline-width': `${cardOutlineWidth}px`,
    '--bht11-card-radius': `${cardRadius}px`,
    '--bht11-card-padding': `${cardPadding}px`,
  };

  return (
    <div className="oc-widget-inner bht11" style={rootStyle}>

      {/* ═══ 1. Header ═══ */}
      <div className="bht11-header">
        <div className="bht11-header-left">
          {c.avatarUrl ? (
            <img src={c.avatarUrl} alt="" className="bht11-header-avatar"
              onError={e => { e.target.style.display = 'none'; }} />
          ) : (
            <div className="bht11-header-icon">🎯</div>
          )}
          <div className="bht11-header-titles">
            <span className="bht11-header-title">{huntTitle}</span>
            <span className="bht11-header-subtitle">fever</span>
          </div>
        </div>
        <span className="bht11-header-number">#{c.huntNumber || c.huntName || bonuses.length}</span>
      </div>

      {/* ═══ 2. Stats Row ═══ */}
      <div className="bht11-stats-row">
        <div className="bht11-stat-pill">
          <span className="bht11-stat-pill-icon">💰</span>
          <span className="bht11-stat-pill-label">START</span>
          <span className="bht11-stat-pill-value">{currency}{startMoney.toFixed(2)}</span>
        </div>
        <div className="bht11-stat-pill">
          <span className="bht11-stat-pill-icon">📈</span>
          <span className="bht11-stat-pill-label">BREAKEVEN</span>
          <span className="bht11-stat-pill-value">{(c.bonusOpening ? stats.liveBE : stats.breakEven).toFixed(0)}x</span>
        </div>
      </div>

      {/* ═══ 3. Counts Row ═══ */}
      <div className="bht11-counts-row">
        <div className="bht11-count-pill">
          <span className="bht11-count-icon">🎰</span>
          <span className="bht11-count-label">BONUSES</span>
          <span className="bht11-count-value">{bonuses.length}</span>
        </div>
        {stats.superCount > 0 && (
          <div className="bht11-count-pill bht11-count-pill--super">
            <span className="bht11-count-icon">⚡</span>
            <span className="bht11-count-label">SUPER</span>
            <span className="bht11-count-value">{stats.superCount}</span>
          </div>
        )}
        {stats.extremeCount > 0 && (
          <div className="bht11-count-pill bht11-count-pill--extreme">
            <span className="bht11-count-icon">🔥</span>
            <span className="bht11-count-label">EXTREME</span>
            <span className="bht11-count-value">{stats.extremeCount}</span>
          </div>
        )}
      </div>

      {/* ═══ 4. Horizontal 3D Carousel ═══ */}
      <div className="bht11-carousel-wrap">
        <div className={`bht11-carousel-track${isOpening ? ' bht11-carousel-track--opening' : ''}`}
          style={isOpening
            ? { transform: `translateX(calc(50% - ${carouselCardW / 2}px - ${currentIndex * carouselStep}px))` }
            : { '--bht11-count': bonuses.length }}>
          {(isOpening ? bonuses : [...bonuses, ...bonuses]).map((bonus, i) => {
            const idx = isOpening ? i : i % bonuses.length;
            const payout = Number(bonus.payout) || 0;
            const bet = Number(bonus.betSize) || 0;
            const isExtreme = bonus.isExtremeBonus || bonus.isExtreme;
            const isSuper = bonus.isSuperBonus;
            return (
              <div key={`fc-${bonus.id || idx}-${i >= bonuses.length ? 'c' : 'o'}`}
                className={`bht11-card${idx === currentIndex ? ' bht11-card--active' : ''}${bonus.opened ? ' bht11-card--opened' : ''}${isExtreme ? ' bht11-card--extreme' : ''}${isSuper && !isExtreme ? ' bht11-card--super' : ''}${isOpening && idx !== currentIndex ? ' bht11-card--dimmed' : ''}`}
                style={isOpening && idx === currentIndex ? { '--bht11-current-bg': currentBonusColor, '--bht11-current-accent': currentBonusAccent } : undefined}>
                <div className="bht11-card-top">
                  <span className="bht11-card-name">{bonus.slotName || bonus.slot?.name}</span>
                  <span className="bht11-card-bet">{currency}{bet.toFixed(2)}</span>
                </div>
                <div className="bht11-card-img-wrap">
                  {bonus.slot?.image ? (
                    <img src={bonus.slot.image} alt={bonus.slotName} className="bht11-card-img"
                      onError={e => { e.target.style.display = 'none'; }} />
                  ) : (
                    <div className="bht11-card-img-ph">🎰</div>
                  )}
                  {isExtreme && <span className="bht11-card-badge bht11-card-badge--extreme">EXTREME</span>}
                  {!isExtreme && isSuper && <span className="bht11-card-badge bht11-card-badge--super">SUPER</span>}
                </div>
                <div className="bht11-card-bottom">
                  {bonus.opened ? (
                    <>
                      <span className="bht11-card-payout">{currency}{payout.toFixed(2)}</span>
                      <span className="bht11-card-multi">{(bet > 0 ? payout / bet : 0).toFixed(1)}x</span>
                    </>
                  ) : (
                    <>
                      <span className="bht11-card-status">PENDING</span>
                      <span className="bht11-card-idx">#{idx + 1}</span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ 5. 3D Rotating Card Stack ═══ */}
      {bonuses.length > 0 && (
        <div className="bht11-stack-section">
          <div className={`bht-stack${!isOpening ? ' bht-stack--spinning' : ''}`}>
            {(() => {
              const total = bonuses.length;
              if (total === 0) return null;
              const ci = isOpening && currentIndex >= 0 ? currentIndex : carouselIdx % total;
              const posMap = { '-2': 'bht-stack-card--far-left', '-1': 'bht-stack-card--left', '0': 'bht-stack-card--center', '1': 'bht-stack-card--right', '2': 'bht-stack-card--far-right' };
              return bonuses.map((bonus, bIdx) => {
                const rawDist = ((bIdx - ci) % total + total) % total;
                const dist = rawDist <= Math.floor(total / 2) ? rawDist : rawDist - total;
                const posCls = posMap[String(dist)] || 'bht-stack-card--hidden';
                return (
                  <div key={`stk-${bIdx}`}
                    className={`bht-stack-card ${posCls}${bonus.opened ? ' bht-stack-card--opened' : ''}${bonus.isSuperBonus ? ' bht-stack-card--super' : ''}${(bonus.isExtremeBonus || bonus.isExtreme) ? ' bht-stack-card--extreme' : ''}`}>
                    <div className="bht-stack-card-inner">
                      <div className="bht-stack-card-img-wrap">
                        {bonus.slot?.image ? (
                          <img src={bonus.slot.image} alt={bonus.slotName} className="bht-stack-card-img"
                            onError={e => { e.target.style.display = 'none'; }} />
                        ) : <div className="bht-stack-card-img-ph" />}
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
          {/* ── Progress bar ── */}
          {(() => {
            const total = bonuses.length;
            const opened = bonuses.filter(b => b.opened).length;
            const pct = total > 0 ? (opened / total) * 100 : 0;
            return (
              <div className="bht-progress">
                <div className="bht-progress-bar">
                  <div className="bht-progress-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="bht-progress-text">{opened}/{total}</span>
              </div>
            );
          })()}
        </div>
      )}

      {/* ═══ 6. Bonus List Section ═══ */}
      <div className="bht11-list-section">
        <div className="bht11-list-title">
          <span className="bht11-list-title-icon">📋</span>
          <span>BONUS LIST</span>
        </div>
        <div className="bht11-list-scroll">
          {(() => {
            const count = bonuses.length;
            const shouldScroll = count >= 5;
            const renderRow = (bonus, idx, key) => {
              const payout = Number(bonus.payout) || 0;
              const bet = Number(bonus.betSize) || 0;
              const isExtreme = bonus.isExtremeBonus || bonus.isExtreme;
              const isSuper = bonus.isSuperBonus;
              return (
                <div key={key}
                  className={`bht11-list-row${idx === currentIndex ? ' bht11-list-row--active' : ''}${bonus.opened ? ' bht11-list-row--opened' : ''}${isExtreme ? ' bht11-list-row--extreme' : ''}${isSuper && !isExtreme ? ' bht11-list-row--super' : ''}`}>
                  <div className="bht11-list-row-thumb">
                    {bonus.slot?.image ? (
                      <img src={bonus.slot.image} alt={bonus.slotName} className="bht11-list-row-img"
                        onError={e => { e.target.style.display = 'none'; }} />
                    ) : <div className="bht11-list-row-img-ph">🎰</div>}
                  </div>
                  <div className="bht11-list-row-info">
                    <span className="bht11-list-row-name">{bonus.slotName || bonus.slot?.name}</span>
                    <span className="bht11-list-row-bet">{currency}{bet.toFixed(2)}</span>
                  </div>
                  <span className="bht11-list-row-idx">#{idx + 1}</span>
                </div>
              );
            };
            if (!shouldScroll) {
              return (
                <div className="bht11-list-track">
                  {bonuses.map((b, i) => renderRow(b, i, `fr-${b.id || i}-o`))}
                </div>
              );
            }
            return (
              <div className="bht11-list-track bht11-list-track--scroll"
                style={{ '--bht11-list-count': count + 1 }}>
                {bonuses.map((b, i) => renderRow(b, i, `fr-${b.id || i}-o`))}
                <div className="bht11-list-row-spacer" />
                {bonuses.map((b, i) => renderRow(b, i, `fr-${b.id || i}-c`))}
                <div className="bht11-list-row-spacer" />
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

export default React.memo(BonusHuntWidgetV11);
