import React, { useMemo, useState, useEffect } from 'react';

/**
 * BonusHuntWidgetV10 — "Metallic"
 *
 * Exact Classic (V1) layout with a brushed-steel metallic colour palette.
 * Reuses the same bht-* CSS classes as V1, just sets --bht-* vars with metallic defaults.
 */
function BonusHuntWidgetV10({ config, theme }) {
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

    const target = Math.max(startMoney - stopLoss, 0);
    const breakEven = totalBetAll > 0 ? target / totalBetAll : 0;
    const remaining = Math.max(target - totalWin, 0);
    const liveBE = totalBetRemaining > 0 ? remaining / totalBetRemaining : 0;
    const avgMulti = totalBetOpened > 0 ? totalWin / totalBetOpened : 0;

    let bestSlot = null, worstSlot = null;
    openedBonuses.forEach(b => {
      const bet = Number(b.betSize) || 0;
      const pay = Number(b.payout) || 0;
      const multi = bet > 0 ? pay / bet : 0;
      if (!bestSlot || multi > (bestSlot._multi || 0)) bestSlot = { ...b, _multi: multi, _payout: pay };
      if (!worstSlot || multi < (worstSlot._multi || Infinity)) worstSlot = { ...b, _multi: multi, _payout: pay };
    });

    return { totalBetAll, totalWin, superCount, breakEven, liveBE, avgMulti, openedCount: openedBonuses.length, bestSlot, worstSlot };
  }, [bonuses, startMoney, stopLoss]);

  /* ─── Stats flip toggle (30s interval, only during bonus opening) ─── */
  const [statsFlipped, setStatsFlipped] = useState(false);
  useEffect(() => {
    if (!c.bonusOpening) { setStatsFlipped(false); return; }
    const id = setInterval(() => setStatsFlipped(f => !f), 30000);
    return () => clearInterval(id);
  }, [c.bonusOpening]);

  /* ─── Auto-rotating carousel ─── */
  const [carouselIdx, setCarouselIdx] = useState(0);
  useEffect(() => {
    if (bonuses.length < 2) return;
    const id = setInterval(() => setCarouselIdx(i => (i + 1) % bonuses.length), 2500);
    return () => clearInterval(id);
  }, [bonuses.length]);

  /* ─── Current bonus ─── */
  const currentBonus = bonuses.find(b => !b.opened);
  const currentIndex = currentBonus ? bonuses.indexOf(currentBonus) : -1;
  const isOpening = !!c.bonusOpening && currentIndex >= 0;

  /* ─── Dynamic title ─── */
  const huntTitle = c.bonusOpening ? 'BONUS OPENING' : 'BONUS HUNT';

  /* ─── Metallic palette defaults ─── */
  const headerColor = c.headerColor || '#1a1a1e';
  const headerAccent = c.headerAccent || '#e8a020';
  const countCardColor = c.countCardColor || '#1a1a1e';
  const currentBonusColor = c.currentBonusColor || '#2a2a30';
  const currentBonusAccent = c.currentBonusAccent || '#e8a020';
  const listCardColor = c.listCardColor || '#1a1a1e';
  const listCardAccent = c.listCardAccent || '#cccccc';
  const summaryColor = c.summaryColor || '#2a2a30';
  const totalPayColor = c.totalPayColor || '#e8a020';
  const totalPayText = c.totalPayText || '#ffffff';
  const superBadgeColor = c.superBadgeColor || '#66bb6a';
  const extremeBadgeColor = c.extremeBadgeColor || '#ef5350';
  const textColor = c.textColor || '#d4d4d8';
  const mutedTextColor = c.mutedTextColor || '#666666';
  const statValueColor = c.statValueColor || '#e8a020';
  const cardOutlineColor = c.cardOutlineColor || 'rgba(200,210,225,0.18)';
  const cardOutlineWidth = c.cardOutlineWidth ?? 1;
  const fontFamily = c.fontFamily || "'Inter', sans-serif";
  const fontSize = c.fontSize ?? 15;
  const cardRadius = c.cardRadius ?? 16;
  const cardGap = c.cardGap ?? 12;
  const cardPadding = c.cardPadding ?? 14;
  const slotImageHeight = c.slotImageHeight ?? 180;
  const listMaxHeight = c.listMaxHeight ?? 400;
  const brightness = c.brightness ?? 100;
  const contrast = c.contrast ?? 100;
  const saturation = c.saturation ?? 100;

  /* ─── Root inline style (reuses --bht-* CSS vars with metallic defaults) ─── */
  const rootStyle = {
    fontFamily,
    fontSize: `${fontSize}px`,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    gap: `${cardGap}px`,
    filter: (brightness !== 100 || contrast !== 100 || saturation !== 100)
      ? `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
      : undefined,
    '--bht-header-bg': headerColor,
    '--bht-header-accent': headerAccent,
    '--bht-count-bg': countCardColor,
    '--bht-current-bg': currentBonusColor,
    '--bht-current-accent': currentBonusAccent,
    '--bht-list-bg': listCardColor,
    '--bht-list-accent': listCardAccent,
    '--bht-summary-bg': summaryColor,
    '--bht-total-pay-bg': totalPayColor,
    '--bht-total-pay-text': totalPayText,
    '--bht-super-badge': superBadgeColor,
    '--bht-extreme-badge': extremeBadgeColor,
    '--bht-text': textColor,
    '--bht-muted': mutedTextColor,
    '--bht-stat-value': statValueColor,
    '--bht-card-outline': cardOutlineColor,
    '--bht-card-outline-width': `${cardOutlineWidth}px`,
    '--bht-card-radius': `${cardRadius}px`,
    '--bht-card-padding': `${cardPadding}px`,
    '--bht-slot-img-height': `${slotImageHeight}px`,
    '--bht-list-max-height': `${listMaxHeight}px`,
  };

  return (
    <div className="oc-widget-inner oc-bonushunt" style={rootStyle}>

      {/* ═══ Header Card — Full-card flip (same as V1 Classic) ═══ */}
      <div className="bht-card bht-header bht-header--fullflip">
        <div className={`bht-fullflip-container${statsFlipped ? ' bht-fullflip-container--flipped' : ''}`}>
          {/* ── FRONT: Title + Stats ── */}
          <div className="bht-fullflip-face bht-fullflip-front">
            <div className="bht-header-center">
              {c.avatarUrl ? (
                <img src={c.avatarUrl} alt="" className="bht-header-avatar"
                  onError={e => { e.target.style.display = 'none'; }} />
              ) : (
                <div className="bht-icon-circle">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" />
                  </svg>
                </div>
              )}
              <div className="bht-title">{huntTitle}</div>
            </div>
            <div className="bht-header-stats bht-header-stats--4col">
              <div className="bht-flip-face bht-flip-front">
                <div className="bht-stat-box">
                  <div className="bht-stat-label">START</div>
                  <div className="bht-stat-value">{currency}{startMoney.toFixed(0)}</div>
                </div>
                <div className="bht-stat-box">
                  <div className="bht-stat-label">STOP</div>
                  <div className="bht-stat-value">{currency}{stopLoss.toFixed(0)}</div>
                </div>
                <div className="bht-stat-box">
                  <div className="bht-stat-label">B.E.</div>
                  <div className="bht-stat-value" style={{ color: stats.liveBE >= 100 ? '#f87171' : '#4ade80' }}>{stats.liveBE.toFixed(0)}x</div>
                </div>
                <div className="bht-stat-box">
                  <div className="bht-stat-label">AVG</div>
                  <div className="bht-stat-value" style={{ color: stats.avgMulti >= 100 ? '#4ade80' : '#f87171' }}>{stats.avgMulti.toFixed(0)}x</div>
                </div>
              </div>
            </div>
          </div>
          {/* ── BACK: Best / Worst slot ── */}
          <div className="bht-fullflip-face bht-fullflip-back">
            <div className="bht-fullflip-slots">
              {stats.bestSlot ? (
                <div className="bht-fullflip-slot bht-fullflip-slot--best">
                  <div className="bht-fullflip-slot-ribbon bht-fullflip-slot-ribbon--best">↑ BEST</div>
                  {stats.bestSlot.slot?.image ? (
                    <img src={stats.bestSlot.slot.image} alt="" className="bht-fullflip-slot-img"
                      onError={e => { e.target.style.display = 'none'; }} />
                  ) : (
                    <div className="bht-fullflip-slot-img-placeholder">🎰</div>
                  )}
                  <div className="bht-fullflip-slot-overlay">
                    <div className="bht-fullflip-slot-stat">
                      <span className="bht-fullflip-slot-label">WIN</span>
                      <span className="bht-fullflip-slot-payout">{currency}{stats.bestSlot._payout.toFixed(0)}</span>
                    </div>
                    <div className="bht-fullflip-slot-stat">
                      <span className="bht-fullflip-slot-label">MULTI</span>
                      <span className="bht-fullflip-slot-multi">{stats.bestSlot._multi.toFixed(1)}x</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bht-fullflip-slot bht-fullflip-slot--empty">
                  <span className="bht-fullflip-slot-payout">—</span>
                </div>
              )}
              {stats.worstSlot ? (
                <div className="bht-fullflip-slot bht-fullflip-slot--worst">
                  <div className="bht-fullflip-slot-ribbon bht-fullflip-slot-ribbon--worst">↓ WORST</div>
                  {stats.worstSlot.slot?.image ? (
                    <img src={stats.worstSlot.slot.image} alt="" className="bht-fullflip-slot-img"
                      onError={e => { e.target.style.display = 'none'; }} />
                  ) : (
                    <div className="bht-fullflip-slot-img-placeholder">🎰</div>
                  )}
                  <div className="bht-fullflip-slot-overlay">
                    <div className="bht-fullflip-slot-stat">
                      <span className="bht-fullflip-slot-label">WIN</span>
                      <span className="bht-fullflip-slot-payout">{currency}{stats.worstSlot._payout.toFixed(0)}</span>
                    </div>
                    <div className="bht-fullflip-slot-stat">
                      <span className="bht-fullflip-slot-label">MULTI</span>
                      <span className="bht-fullflip-slot-multi">{stats.worstSlot._multi.toFixed(1)}x</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bht-fullflip-slot bht-fullflip-slot--empty">
                  <span className="bht-fullflip-slot-payout">—</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Bonus List ═══ */}
      {bonuses.length > 0 && (
        <div className="bht-card bht-list-card">
          {/* ── 3D Animated Card Carousel ── */}
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
          {/* ── Vertical list rows ── */}
          <div className="bht-list-rows">
            {(() => {
              const itemH = 48, count = bonuses.length;
              const shouldScroll = count >= 7;
              const renderRow = (bonus, idx, key) => {
                const payout = Number(bonus.payout) || 0;
                const bet = Number(bonus.betSize) || 0;
                const multi = bet > 0 ? payout / bet : 0;
                return (
                  <div key={key}
                    className={`bht-list-row${idx === currentIndex ? ' bht-list-row--active' : ''}${bonus.opened ? ' bht-list-row--opened' : ''}${bonus.isSuperBonus ? ' bht-list-row--super' : ''}${bonus.isExtremeBonus || bonus.isExtreme ? ' bht-list-row--extreme' : ''}`}>
                    <span className="bht-list-row-idx">{idx + 1}</span>
                    <div className="bht-list-row-thumb">
                      {bonus.slot?.image ? (
                        <img src={bonus.slot.image} alt={bonus.slotName} className="bht-list-row-img"
                          onError={e => { e.target.style.display = 'none'; }} />
                      ) : <div className="bht-list-row-img-ph" />}
                    </div>
                    <div className="bht-list-row-info">
                      <span className="bht-list-row-name">{bonus.slotName || bonus.slot?.name}</span>
                      {(bonus.isExtremeBonus || bonus.isExtreme) && <span className="bht-list-row-badge bht-list-row-badge--extreme">EXTREME</span>}
                      {bonus.isSuperBonus && !(bonus.isExtremeBonus || bonus.isExtreme) && <span className="bht-list-row-badge bht-list-row-badge--super">SUPER</span>}
                    </div>
                    <div className="bht-list-row-stats">
                      <div className="bht-list-row-col">
                        <span className="bht-list-row-col-label">WIN</span>
                        <span className="bht-list-row-col-val">{currency}{payout.toFixed(0)}</span>
                      </div>
                      <div className="bht-list-row-col">
                        <span className="bht-list-row-col-label">MULTI</span>
                        <span className="bht-list-row-col-val">{multi.toFixed(1)}x</span>
                      </div>
                      <div className="bht-list-row-col">
                        <span className="bht-list-row-col-label">BET</span>
                        <span className="bht-list-row-col-val">{currency}{bet.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                );
              };
              if (!shouldScroll) {
                return (
                  <div key="lr-static" className="bht-list-rows-track">
                    {bonuses.map((b, i) => renderRow(b, i, `lr-${b.id || i}-o`))}
                  </div>
                );
              }
              return (
                <div key="lr-scroll" className="bht-list-rows-track bht-list-rows-track--scroll"
                  style={{ '--bht-item-count': count + 1 }}>
                  {bonuses.map((b, i) => renderRow(b, i, `lr-${b.id || i}-o`))}
                  <div key="lr-spacer-a" className="bht-list-row-spacer" />
                  {bonuses.map((b, i) => renderRow(b, i, `lr-${b.id || i}-c`))}
                  <div key="lr-spacer-b" className="bht-list-row-spacer" />
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ═══ Total Pay Footer (flips with stats) ═══ */}
      <div className="bht-card bht-footer">
        <div className="bht-footer-flip-wrap">
          <div className={`bht-footer-flip${statsFlipped ? ' bht-footer-flip--flipped' : ''}`}>
            <div className="bht-footer-flip-face bht-footer-flip-front">
              <span className="bht-footer-label">TOTAL PAY</span>
              <span className="bht-footer-value">{currency}{stats.totalWin.toFixed(2)}</span>
            </div>
            <div className="bht-footer-flip-face bht-footer-flip-back">
              {(() => {
                const target = Math.max(startMoney - stopLoss, 0);
                const profit = stats.totalWin - target;
                const isProfit = profit >= 0;
                return (
                  <>
                    <span className="bht-footer-label">{isProfit ? 'PROFIT' : 'LOSS'}</span>
                    <span className="bht-footer-value" style={{ color: isProfit ? '#4ade80' : '#f87171' }}>
                      {isProfit ? '+' : ''}{currency}{profit.toFixed(2)}
                    </span>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(BonusHuntWidgetV10);
