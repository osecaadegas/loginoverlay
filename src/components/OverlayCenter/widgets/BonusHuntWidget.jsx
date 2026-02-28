import React, { useMemo } from 'react';
import BonusHuntWidgetV2 from './BonusHuntWidgetV2';
import BonusHuntWidgetV3 from './BonusHuntWidgetV3';

export default function BonusHuntWidget({ config, theme }) {
  /* ─── Style switcher ─── */
  if ((config || {}).displayStyle === 'v3') {
    return <BonusHuntWidgetV3 config={config} theme={theme} />;
  }
  if ((config || {}).displayStyle === 'v2') {
    return <BonusHuntWidgetV2 config={config} theme={theme} />;
  }

  const c = config || {};
  const ds = c.displayStyle || 'v1';
  const isNeonBH = ds === 'v4_neon';
  const isHorizontalBH = ds === 'v5_horizontal';
  const isCompactBH = ds === 'v6_compact';
  const isCarousel = ds === 'v7_carousel';
  const bonuses = c.bonuses || [];
  const currency = c.currency || '€';
  const startMoney = Number(c.startMoney) || 0;
  const stopLoss = Number(c.stopLoss) || 0;

  /* ─── Custom style vars ─── */
  const headerColor = c.headerColor || (isNeonBH ? '#050510' : '#1e3a8a');
  const headerAccent = c.headerAccent || (isNeonBH ? '#00ffcc' : '#60a5fa');
  const countCardColor = c.countCardColor || (isNeonBH ? '#080818' : '#1e3a8a');
  const currentBonusColor = c.currentBonusColor || (isNeonBH ? '#001a10' : '#166534');
  const currentBonusAccent = c.currentBonusAccent || (isNeonBH ? '#00ffcc' : '#86efac');
  const listCardColor = c.listCardColor || (isNeonBH ? '#0a0520' : '#581c87');
  const listCardAccent = c.listCardAccent || (isNeonBH ? '#bf77ff' : '#d8b4fe');
  const summaryColor = c.summaryColor || (isNeonBH ? '#050510' : '#1e3a8a');
  const totalPayColor = c.totalPayColor || (isNeonBH ? '#00ffcc' : '#eab308');
  const totalPayText = c.totalPayText || '#ffffff';
  const superBadgeColor = c.superBadgeColor || '#eab308';
  const extremeBadgeColor = c.extremeBadgeColor || '#ef4444';
  const textColor = c.textColor || '#ffffff';
  const mutedTextColor = c.mutedTextColor || (isNeonBH ? '#44aa88' : '#93c5fd');
  const statValueColor = c.statValueColor || '#ffffff';
  const cardOutlineColor = c.cardOutlineColor || (isNeonBH ? 'rgba(0,255,200,0.15)' : 'transparent');
  const cardOutlineWidth = c.cardOutlineWidth ?? (isNeonBH ? 1 : 2);
  const fontFamily = c.fontFamily || "'Inter', sans-serif";
  const fontSize = c.fontSize ?? (isCompactBH ? 11 : 13);
  const cardRadius = c.cardRadius ?? (isCompactBH ? 8 : 16);
  const cardGap = c.cardGap ?? (isCompactBH ? 6 : 12);
  const widgetWidth = c.widgetWidth ?? 400;
  const cardPadding = c.cardPadding ?? (isCompactBH ? 8 : 14);
  const slotImageHeight = c.slotImageHeight ?? (isCompactBH ? 120 : 180);
  const listMaxHeight = c.listMaxHeight ?? (isCompactBH ? 250 : 400);
  const brightness = c.brightness ?? 100;
  const contrast = c.contrast ?? 100;
  const saturation = c.saturation ?? 100;

  /* ─── Root inline style ─── */
  const rootStyle = {
    fontFamily,
    fontSize: `${fontSize}px`,
    width: '100%',
    height: '100%',
    overflow: 'hidden auto',
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

    return { totalBetAll, totalWin, superCount, breakEven, liveBE, avgMulti, openedCount: openedBonuses.length };
  }, [bonuses, startMoney, stopLoss]);

  /* ─── Find current bonus (first not-opened) ─── */
  const currentBonus = bonuses.find(b => !b.opened);
  const currentIndex = currentBonus ? bonuses.indexOf(currentBonus) : -1;

  const bhModeClass = isNeonBH ? ' oc-bonushunt--neon'
    : isHorizontalBH ? ' oc-bonushunt--horizontal'
    : isCompactBH ? ' oc-bonushunt--compact'
    : isCarousel ? ' oc-bonushunt--carousel'
    : '';

  /* ─── Carousel layout (v7_carousel) ─── */
  if (isCarousel) {
    const profit = stats.totalWin - startMoney;
    return (
      <div className="oc-widget-inner oc-bonushunt oc-bonushunt--carousel" style={rootStyle}>
        {/* ── Left stats panel ── */}
        <div className="bhtc-stats-panel">
          <div className="bhtc-stats-header">
            <div className="bhtc-icon-circle">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" />
              </svg>
            </div>
            <div>
              <div className="bhtc-title">BONUS HUNT</div>
              <div className="bhtc-hunt-id">Hunt {c.huntName || `#${bonuses.length}`}</div>
            </div>
          </div>

          <div className="bhtc-stat-rows">
            <div className="bhtc-stat-row">
              <span className="bhtc-stat-row-icon">▶</span>
              <span className="bhtc-stat-row-label">START</span>
              <span className="bhtc-stat-row-value">{currency}{startMoney.toFixed(2)}</span>
            </div>
            <div className="bhtc-stat-row">
              <span className="bhtc-stat-row-icon">⇋</span>
              <span className="bhtc-stat-row-label">BREAK EVEN</span>
              <span className="bhtc-stat-row-value">{stats.breakEven.toFixed(2)}x</span>
            </div>
            <div className="bhtc-stat-row bhtc-stat-row--sep" />
            <div className="bhtc-stat-row">
              <span className="bhtc-stat-row-icon">⌀</span>
              <span className="bhtc-stat-row-label">AVERAGE</span>
              <span className="bhtc-stat-row-value">{stats.avgMulti.toFixed(2)}x</span>
            </div>
            <div className="bhtc-stat-row">
              <span className="bhtc-stat-row-icon">{profit >= 0 ? '▲' : '▼'}</span>
              <span className="bhtc-stat-row-label">PROFIT{profit < 0 ? '' : 's'}</span>
              <span className={`bhtc-stat-row-value ${profit >= 0 ? 'bhtc-val--green' : 'bhtc-val--red'}`}>
                {profit >= 0 ? '' : '-'}{currency}{Math.abs(profit).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="bhtc-total-pay">
            <div className="bhtc-total-label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              TOTAL PAYOUT
            </div>
            <div className="bhtc-total-value">{currency}{stats.totalWin.toFixed(2)}</div>
          </div>
        </div>

        {/* ── Right carousel ── */}
        <div className="bhtc-carousel-wrap">
          <div className="bhtc-carousel-track" style={{ '--bhtc-count': bonuses.length }}>
            {[...bonuses, ...bonuses].map((bonus, i) => {
              const idx = i % bonuses.length;
              const payout = Number(bonus.payout) || 0;
              const bet = Number(bonus.betSize) || 0;
              const multi = bet > 0 ? payout / bet : 0;
              return (
                <div key={`car-${bonus.id || idx}-${i >= bonuses.length ? 'c' : 'o'}`}
                  className={`bhtc-card ${idx === currentIndex ? 'bhtc-card--active' : ''} ${bonus.opened ? 'bhtc-card--opened' : ''}`}>
                  <div className="bhtc-card-top-bar">
                    <span className="bhtc-card-slot-name">{bonus.slotName || bonus.slot?.name}</span>
                    <span className="bhtc-card-bet">{(bet).toFixed(2)} {currency}</span>
                    <span className="bhtc-card-idx">#{idx + 1}</span>
                  </div>
                  <div className="bhtc-card-img-wrap">
                    {bonus.slot?.image ? (
                      <img src={bonus.slot.image} alt={bonus.slotName} className="bhtc-card-img"
                        onError={e => { e.target.style.display = 'none'; }} />
                    ) : (
                      <div className="bhtc-card-img-placeholder" />
                    )}
                  </div>
                  {bonus.opened && (
                    <div className="bhtc-card-bottom-bar">
                      <span className="bhtc-card-payout">{payout.toFixed(2)}</span>
                      <span className="bhtc-card-multi">{multi.toFixed(1)}x</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ─── Horizontal layout (v5_horizontal) ─── */
  if (isHorizontalBH) {
    const profit = stats.totalWin - startMoney;
    return (
      <div className="oc-widget-inner oc-bonushunt oc-bonushunt--horizontal" style={rootStyle}>
        {/* ── Left stats panel ── */}
        <div className="bhh-stats-panel">
          <div className="bhh-stats-header">
            <div className="bhtc-icon-circle">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" />
              </svg>
            </div>
            <div>
              <div className="bhtc-title">BONUS HUNT</div>
              <div className="bhtc-hunt-id">Hunt {c.huntName || `#${bonuses.length}`}</div>
            </div>
          </div>

          <div className="bhh-stat-grid">
            <div className="bhh-stat">
              <span className="bhh-stat-label">START</span>
              <span className="bhh-stat-val">{currency}{startMoney.toFixed(2)}</span>
            </div>
            <div className="bhh-stat">
              <span className="bhh-stat-label">BEx</span>
              <span className="bhh-stat-val">{stats.breakEven.toFixed(2)}x</span>
            </div>
            <div className="bhh-stat">
              <span className="bhh-stat-label">AVG</span>
              <span className="bhh-stat-val">{stats.avgMulti.toFixed(2)}x</span>
            </div>
            <div className="bhh-stat">
              <span className="bhh-stat-label">PROFIT</span>
              <span className={`bhh-stat-val ${profit >= 0 ? 'bhtc-val--green' : 'bhtc-val--red'}`}>
                {profit >= 0 ? '+' : ''}{currency}{profit.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="bhtc-total-pay" style={{ marginTop: 'auto' }}>
            <div className="bhtc-total-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              TOTAL PAYOUT
            </div>
            <div className="bhtc-total-value">{currency}{stats.totalWin.toFixed(2)}</div>
          </div>
        </div>

        {/* ── Right scrollable bonus list ── */}
        <div className="bhh-list-wrap">
          {bonuses.map((bonus, idx) => {
            const payout = Number(bonus.payout) || 0;
            const bet = Number(bonus.betSize) || 0;
            const multi = bet > 0 ? payout / bet : 0;
            return (
              <div key={`hh-${bonus.id || idx}`}
                className={`bhtc-card ${idx === currentIndex ? 'bhtc-card--active' : ''} ${bonus.opened ? 'bhtc-card--opened' : ''}`}>
                <div className="bhtc-card-top-bar">
                  <span className="bhtc-card-slot-name">{bonus.slotName || bonus.slot?.name}</span>
                  <span className="bhtc-card-bet">{bet.toFixed(2)} {currency}</span>
                  <span className="bhtc-card-idx">#{idx + 1}</span>
                </div>
                <div className="bhtc-card-img-wrap">
                  {bonus.slot?.image ? (
                    <img src={bonus.slot.image} alt={bonus.slotName} className="bhtc-card-img"
                      onError={e => { e.target.style.display = 'none'; }} />
                  ) : (
                    <div className="bhtc-card-img-placeholder" />
                  )}
                </div>
                {bonus.opened && (
                  <div className="bhtc-card-bottom-bar">
                    <span className="bhtc-card-payout">{payout.toFixed(2)}</span>
                    <span className="bhtc-card-multi">{multi.toFixed(1)}x</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={`oc-widget-inner oc-bonushunt${bhModeClass}`} style={rootStyle}>

      {/* ═══ Header Card ═══ */}
      <div className="bht-card bht-header">
        <div className="bht-header-top">
          <div className="bht-header-left">
            <div className="bht-icon-circle">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" />
              </svg>
            </div>
            <div>
              <div className="bht-title">BONUS OPENING</div>
              <div className="bht-subtitle">{c.huntName || ''}</div>
            </div>
          </div>
          <span className="bht-badge">#{bonuses.length}</span>
        </div>

        <div className="bht-header-stats">
          <div className="bht-stat-box">
            <div className="bht-stat-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              START
            </div>
            <div className="bht-stat-value">{currency}{startMoney.toFixed(2)}</div>
          </div>
          <div className="bht-stat-box">
            <div className="bht-stat-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Start BEx
            </div>
            <div className="bht-stat-value">{stats.breakEven.toFixed(2)}x</div>
          </div>
        </div>
      </div>

      {/* ═══ Bonuses Count Card ═══ */}
      <div className="bht-card bht-count-card">
        <div className="bht-count-header">
          <div className="bht-count-label">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            BONUSES
          </div>
          <span className="bht-count-num">{bonuses.length}</span>
        </div>
        <div className="bht-count-badges">
          <div className="bht-badge-super">
            <span>SUPER</span> <strong>{stats.superCount}</strong>
          </div>
          <div className="bht-badge-extreme">
            <span>EXTREME</span> <strong>{bonuses.filter(b => b.isExtreme).length}</strong>
          </div>
        </div>
      </div>

      {/* ═══ Current Bonus Card ═══ */}
      {currentBonus && (
        <div className="bht-card bht-current">
          <div className="bht-current-top">
            {currentBonus.slot?.image && (
              <img src={currentBonus.slot.image} alt={currentBonus.slotName}
                className="bht-current-img"
                onError={e => { e.target.style.display = 'none'; }} />
            )}
            <div className="bht-current-info">
              <div className="bht-current-name">{currentBonus.slotName}</div>
              <div className="bht-current-bet">{currency}{(Number(currentBonus.betSize) || 0).toFixed(2)} BET</div>
            </div>
          </div>
          <div className="bht-current-stats">
            <div className="bht-current-stat">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{currency}0.00</span>
            </div>
            <div className="bht-current-stat">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              <span>0x</span>
            </div>
            <div className="bht-current-stat">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              <span>{currency}{(Number(currentBonus.betSize) || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Vertical Bonus List ═══ */}
      {bonuses.length > 0 && (
        <div className="bht-card bht-list-card">
          <div className="bht-bonus-list">
            <div className="bht-bonus-list-track" style={{ '--bht-item-count': bonuses.length }}>
              {[...bonuses, ...bonuses].map((bonus, i) => {
                const idx = i % bonuses.length;
                return (
                  <div key={`${bonus.id || idx}-${i >= bonuses.length ? 'c' : 'o'}`}
                    className={`bht-bonus-card ${idx === currentIndex ? 'bht-bonus-card--active' : ''} ${bonus.opened ? 'bht-bonus-card--opened' : ''} ${bonus.isSuperBonus ? 'bht-bonus-card--super' : ''}`}>
                    {bonus.slot?.image && (
                      <img src={bonus.slot.image} alt={bonus.slotName}
                        className={`bht-bonus-card-img ${bonus.isSuperBonus ? 'bht-bonus-card-img--super' : ''}`}
                        onError={e => { e.target.src = ''; e.target.style.display = 'none'; }} />
                    )}
                    <div className="bht-bonus-card-overlay">
                      <div className="bht-bonus-card-top">
                        <span className="bht-bonus-card-bet-badge">{currency}{(Number(bonus.betSize) || 0).toFixed(2)}</span>
                      </div>
                      <div className="bht-bonus-card-bottom">
                        <div className="bht-bonus-card-info">
                          <div className="bht-bonus-card-name">{bonus.slotName || bonus.slot?.name}</div>
                          {bonus.opened && (
                            <div className="bht-bonus-card-payout">
                              <span className="bht-bonus-card-payout-val">{currency}{(Number(bonus.payout) || 0).toFixed(2)}</span>
                              <span className="bht-bonus-card-payout-x">{((Number(bonus.payout) || 0) / (Number(bonus.betSize) || 1)).toFixed(1)}x</span>
                            </div>
                          )}
                        </div>
                        <span className="bht-bonus-card-num">#{idx + 1}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Summary Card ═══ */}
      {c.showStatistics !== false && (
        <div className="bht-card bht-summary">
          <div className="bht-summary-stats">
            <div className="bht-stat-box">
              <div className="bht-stat-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                avgX
              </div>
              <div className="bht-stat-value">{stats.avgMulti.toFixed(2)}x</div>
            </div>
            <div className="bht-stat-box">
              <div className="bht-stat-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                BE x
              </div>
              <div className="bht-stat-value">{stats.liveBE.toFixed(2)}x</div>
            </div>
          </div>
          <div className="bht-total-pay">
            <div className="bht-total-pay-left">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              TOTAL PAY
            </div>
            <div className="bht-total-pay-value">{currency}{stats.totalWin.toFixed(2)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
