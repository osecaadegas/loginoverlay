import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import BonusHuntWidgetV2 from './BonusHuntWidgetV2';
import BonusHuntWidgetV3 from './BonusHuntWidgetV3';
import BonusHuntWidgetV4 from './BonusHuntWidgetV4';
import BonusHuntWidgetV8 from './BonusHuntWidgetV8';
import BonusHuntWidgetV9 from './BonusHuntWidgetV9';

function BonusHuntWidget({ config, theme }) {
  const c = config || {};

  /* ─── Sort bonuses (shared across ALL display styles) ─── */
  const sortedConfig = useMemo(() => {
    const raw = c.bonuses || [];
    const sb = c.sortBy;
    const sd = c.sortDir || 'asc';
    if (!sb || sb === 'default') return c;
    const dir = sd === 'desc' ? -1 : 1;
    const sorted = [...raw].sort((a, b) => {
      if (sb === 'bet') return ((a.betSize || 0) - (b.betSize || 0)) * dir;
      if (sb === 'provider') {
        const pa = (a.slot?.provider || '').toLowerCase();
        const pb = (b.slot?.provider || '').toLowerCase();
        if (pa !== pb) return pa.localeCompare(pb) * dir;
        return (a.slotName || '').localeCompare(b.slotName || '') * dir;
      }
      if (sb === 'type') {
        const rank = (x) => x.isExtremeBonus ? 2 : x.isSuperBonus ? 1 : 0;
        return (rank(b) - rank(a)) * dir;
      }
      return 0;
    });
    return { ...c, bonuses: sorted };
  }, [c]);

  /* ─── Derived variables (must be before hooks that depend on them) ─── */
  const ds = c.displayStyle || 'v1';
  const isNeonBH = ds === 'v4_neon';
  const isHorizontalBH = ds === 'v5_horizontal';
  const isCompactBH = ds === 'v6_compact';
  const isCarousel = ds === 'v7_carousel';
  const bonuses = sortedConfig.bonuses || [];
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

    return { totalBetAll, totalWin, superCount, breakEven, liveBE, avgMulti, openedCount: openedBonuses.length };
  }, [bonuses, startMoney, stopLoss]);

  /* ─── Compact: measure list viewport for centring ─── */
  const listRef = useRef(null);
  const [listH, setListH] = useState(0);
  useEffect(() => {
    if (!isCompactBH) return;
    const measure = () => {
      const el = listRef.current;
      if (el && el.clientHeight > 0) setListH(el.clientHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (listRef.current) ro.observe(listRef.current);
    return () => ro.disconnect();
  }, [isCompactBH]);

  /* ─── Style switcher (early returns AFTER all hooks) ─── */
  if (c.displayStyle === 'v3') {
    return <BonusHuntWidgetV3 config={sortedConfig} theme={theme} />;
  }
  if (c.displayStyle === 'v2') {
    return <BonusHuntWidgetV2 config={sortedConfig} theme={theme} />;
  }
  if (c.displayStyle === 'v4_neon') {
    return <BonusHuntWidgetV4 config={sortedConfig} theme={theme} />;
  }
  if (c.displayStyle === 'v8_card_stack') {
    return <BonusHuntWidgetV8 config={sortedConfig} theme={theme} />;
  }
  if (c.displayStyle === 'v9_hunt_board') {
    return <BonusHuntWidgetV9 config={sortedConfig} theme={theme} />;
  }

  /* ─── Dynamic title based on bonusOpening toggle ─── */
  const huntTitle = c.bonusOpening ? 'BONUS OPENING' : 'BONUS HUNT';

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
  const cardGap = c.cardGap ?? (isCompactBH ? 3 : 12);
  const widgetWidth = c.widgetWidth ?? 400;
  const cardPadding = c.cardPadding ?? (isCompactBH ? 4 : 14);
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
    overflow: isCompactBH ? 'hidden' : 'hidden auto',
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

  /* ─── Find current bonus (first not-opened) ─── */
  const currentBonus = bonuses.find(b => !b.opened);
  const currentIndex = currentBonus ? bonuses.indexOf(currentBonus) : -1;
  /* Stop carousel only when actively in opening phase AND there's a bonus to open */
  const isOpening = !!c.bonusOpening && currentIndex >= 0;

  const bhModeClass = isNeonBH ? ' oc-bonushunt--neon'
    : isHorizontalBH ? ' oc-bonushunt--horizontal'
    : isCompactBH ? ' oc-bonushunt--compact'
    : isCarousel ? ' oc-bonushunt--carousel'
    : '';

  /* ─── Carousel layout (v7_carousel) ─── */
  if (isCarousel) {
    const profit = stats.totalWin - startMoney;
    const carouselCardW = 180, carouselGap = 10;
    const carouselStep = carouselCardW + carouselGap;
    const extremeCount = bonuses.filter(b => b.isExtremeBonus || b.isExtreme).length;
    return (
      <div className="oc-widget-inner oc-bonushunt oc-bonushunt--carousel" style={rootStyle}>
        <div className="bhtc-wrapper">
          {/* ── Top stats bar ── */}
          <div className="bhtc-stats-bar">
            <div className="bhtc-bar-left">
              {c.avatarUrl ? (
                <img src={c.avatarUrl} alt="" className="bhtc-avatar"
                  onError={e => { e.target.style.display = 'none'; }} />
              ) : null}
              <span className="bhtc-bar-title">HUNT {c.huntName || c.huntNumber || bonuses.length}</span>
              {huntTitle && <span className="bhtc-bar-subtitle">· {huntTitle}</span>}
            </div>
            <div className="bhtc-bar-pills">
              <span className="bhtc-pill">SLOTS {bonuses.length}</span>
              {stats.superCount > 0 && <span className="bhtc-pill bhtc-pill--super">★ SUPER {stats.superCount}</span>}
              {extremeCount > 0 && <span className="bhtc-pill bhtc-pill--extreme">★ EXTREME {extremeCount}</span>}
              <span className="bhtc-pill">TARGET {currency}{startMoney.toFixed(2)}</span>
              <span className="bhtc-pill" style={{ color: stats.breakEven >= 100 ? '#4ade80' : '#f87171' }}>BEx {stats.breakEven.toFixed(2)}</span>
              <span className="bhtc-pill bhtc-pill--payout">PAYOUT {currency}{stats.totalWin.toFixed(2)}</span>
            </div>
          </div>

          {/* ── Carousel below ── */}
          <div className="bhtc-carousel-wrap">
            <div className={`bhtc-carousel-track${isOpening ? ' bhtc-carousel-track--opening' : ''}`}
              style={isOpening
                ? { transform: `translateX(calc(50% - ${carouselCardW / 2}px - ${currentIndex * carouselStep}px))` }
                : { '--bhtc-count': bonuses.length }}>
              {(isOpening ? bonuses : [...bonuses, ...bonuses]).map((bonus, i) => {
                const idx = isOpening ? i : i % bonuses.length;
                const payout = Number(bonus.payout) || 0;
                const bet = Number(bonus.betSize) || 0;
                const multi = bet > 0 ? payout / bet : 0;
                const isExtreme = bonus.isExtremeBonus || bonus.isExtreme;
                const isSuper = bonus.isSuperBonus;
                return (
                  <div key={`car-${bonus.id || idx}-${i >= bonuses.length ? 'c' : 'o'}`}
                    className={`bhtc-card${idx === currentIndex ? ' bhtc-card--active' : ''}${bonus.opened ? ' bhtc-card--opened' : ''}${isExtreme ? ' bhtc-card--extreme' : ''}${isSuper ? ' bhtc-card--super' : ''}${isOpening && idx !== currentIndex ? ' bhtc-card--dimmed' : ''}`}
                    style={isOpening && idx === currentIndex ? { '--bhtc-current-bg': currentBonusColor, '--bhtc-current-accent': currentBonusAccent } : undefined}>
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
                      {isExtreme && <span className="bhtc-card-type-badge bhtc-card-type-badge--extreme">EXTREME</span>}
                      {!isExtreme && isSuper && <span className="bhtc-card-type-badge bhtc-card-type-badge--super">SUPER</span>}
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
      </div>
    );
  }

  /* ─── Horizontal layout (v5_horizontal) ─── */
  if (isHorizontalBH) {
    const profit = stats.totalWin - startMoney;
    const horizCardW = 170, horizGap = 10;
    const horizStep = horizCardW + horizGap;
    return (
      <div className="oc-widget-inner oc-bonushunt oc-bonushunt--horizontal" style={rootStyle}>
        {/* ── Left stats panel ── */}
        <div className="bhh-stats-panel">
          <div className="bhh-stats-header">
            {c.avatarUrl ? (
              <img src={c.avatarUrl} alt="" className="bhtc-avatar"
                onError={e => { e.target.style.display = 'none'; }} />
            ) : (
              <div className="bhtc-icon-circle">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" />
                </svg>
              </div>
            )}
            <div>
              <div className="bhtc-title">{huntTitle}</div>
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
              <span className="bhh-stat-val" style={{ color: stats.breakEven >= 100 ? '#4ade80' : '#f87171' }}>{stats.breakEven.toFixed(2)}x</span>
            </div>
            <div className="bhh-stat">
              <span className="bhh-stat-label">AVG</span>
              <span className="bhh-stat-val" style={{ color: stats.avgMulti >= 100 ? '#4ade80' : '#f87171' }}>{stats.avgMulti.toFixed(2)}x</span>
            </div>
            <div className="bhh-stat">
              <span className="bhh-stat-label">PROFIT</span>
              <span className={`bhh-stat-val ${profit >= 0 ? 'bhtc-val--green' : 'bhtc-val--red'}`}>
                {profit >= 0 ? '+' : ''}{currency}{profit.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Bonuses / Super / Extreme counts */}
          <div className="bhtc-badge-row">
            <span className="bhtc-badge-pill">#{bonuses.length}</span>
            <span className="bhtc-badge-pill bhtc-badge-pill--super">S {stats.superCount}</span>
            <span className="bhtc-badge-pill bhtc-badge-pill--extreme">E {bonuses.filter(b => b.isExtremeBonus || b.isExtreme).length}</span>
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

        {/* ── Right auto-scrolling carousel ── */}
        <div className="bhh-carousel-wrap">
          <div className={`bhh-carousel-track${isOpening ? ' bhh-carousel-track--opening' : ''}`}
            style={isOpening
              ? { transform: `translateX(${-(currentIndex * horizStep)}px)` }
              : { '--bhtc-count': bonuses.length }}>
            {(isOpening ? bonuses : [...bonuses, ...bonuses]).map((bonus, i) => {
              const idx = isOpening ? i : i % bonuses.length;
              const payout = Number(bonus.payout) || 0;
              const bet = Number(bonus.betSize) || 0;
              const multi = bet > 0 ? payout / bet : 0;
              const isExtreme = bonus.isExtremeBonus || bonus.isExtreme;
              const isSuper = bonus.isSuperBonus;
              return (
                <div key={`hh-${bonus.id || idx}-${i >= bonuses.length ? 'c' : 'o'}`}
                  className={`bhtc-card${idx === currentIndex ? ' bhtc-card--active' : ''}${bonus.opened ? ' bhtc-card--opened' : ''}${isExtreme ? ' bhtc-card--extreme' : ''}${isSuper ? ' bhtc-card--super' : ''}${isOpening && idx !== currentIndex ? ' bhtc-card--dimmed' : ''}`}
                  style={isOpening && idx === currentIndex ? { '--bhtc-current-bg': currentBonusColor, '--bhtc-current-accent': currentBonusAccent } : undefined}>
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
                    {isExtreme && <span className="bhtc-card-type-badge bhtc-card-type-badge--extreme">EXTREME</span>}
                    {!isExtreme && isSuper && <span className="bhtc-card-type-badge bhtc-card-type-badge--super">SUPER</span>}
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

  return (
    <div className={`oc-widget-inner oc-bonushunt${bhModeClass}`} style={rootStyle}>

      {/* ═══ COMPACT: Merged Header + Count Card ═══ */}
      {isCompactBH ? (
        <div className="bht-card bht-header bht-compact-merged">
          <div className="bht-compact-top-row">
            {/* Streamer avatar */}
            {c.avatarUrl ? (
              <img src={c.avatarUrl} alt="" className="bht-compact-avatar"
                onError={e => { e.target.style.display = 'none'; }} />
            ) : (
              <div className="bht-icon-circle">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" />
                </svg>
              </div>
            )}
            <div className="bht-compact-title-block">
              <div className="bht-title">{huntTitle}</div>
              {c.huntNumber && <span className="bht-compact-hunt-num">#{c.huntNumber}</span>}
            </div>
          </div>
          {/* Opened count + progress bar */}
          <div className="bht-compact-progress-section">
            <div className="bht-compact-progress-label">
              <span>Opened</span>
              <span>{stats.openedCount}/{bonuses.length}</span>
            </div>
            <div className="bht-compact-progress-track">
              <div className="bht-compact-progress-fill" style={{ width: `${bonuses.length > 0 ? (stats.openedCount / bonuses.length) * 100 : 0}%` }} />
            </div>
          </div>

          <div className="bht-compact-info-row">
            <div className="bht-compact-info-pill">
              <span className="bht-compact-info-label">TOTAL</span>
              <strong>{bonuses.length}</strong>
            </div>
            <div className="bht-compact-info-pill bht-compact-info-pill--super">
              <span className="bht-compact-info-label">SUPER</span>
              <strong>{stats.superCount}</strong>
            </div>
            <div className="bht-compact-info-pill bht-compact-info-pill--extreme">
              <span className="bht-compact-info-label">EXTREME</span>
              <strong>{bonuses.filter(b => b.isExtremeBonus || b.isExtreme).length}</strong>
            </div>
          </div>
        </div>
      ) : (
        <>
      {/* ═══ Header Card — Classic ═══ */}
      <div className="bht-card bht-header">
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
        <div className="bht-header-stats bht-header-stats--3col">
          <div className="bht-stat-box">
            <div className="bht-stat-label">
              START
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div className="bht-stat-value">{currency}{startMoney.toFixed(2)}</div>
          </div>
          <div className="bht-stat-box">
            <div className="bht-stat-label">
              B.E.
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="bht-stat-value" style={{ color: stats.breakEven >= 100 ? '#4ade80' : '#f87171' }}>{stats.breakEven.toFixed(0)}x</div>
          </div>
          <div className="bht-stat-box">
            <div className="bht-stat-label">
              AVG
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="bht-stat-value" style={{ color: stats.avgMulti >= 100 ? '#4ade80' : '#f87171' }}>{stats.avgMulti.toFixed(0)}x</div>
          </div>
        </div>
      </div>
        </>
      )}

      {/* ═══ Current Bonus Card ═══ */}
      {currentBonus && (
        <div className="bht-card bht-current">
          {isCompactBH ? (
            <>
              <div className="bht-current-top">
                {currentBonus.slot?.image && (
                  <img src={currentBonus.slot.image} alt={currentBonus.slotName}
                    className="bht-current-img"
                    onError={e => { e.target.style.display = 'none'; }} />
                )}
                <div className="bht-current-info">
                  <div className="bht-current-name">{currentBonus.slotName}</div>
                  <div className="bht-current-stats">
                    <div className="bht-current-stat">
                      <span className="bht-current-stat-label">WIN</span>
                      <span>{currency}0.00</span>
                    </div>
                    <div className="bht-current-stat">
                      <span className="bht-current-stat-label">MULTI</span>
                      <span>0x</span>
                    </div>
                    <div className="bht-current-stat">
                      <span className="bht-current-stat-label">BET</span>
                      <span>{currency}{(Number(currentBonus.betSize) || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="bht-current-header">
                <span className="bht-current-label">BONUS</span>
                <span className="bht-current-counter">{currentIndex + 1}/{bonuses.length}</span>
              </div>
              <div className="bht-current-img-card">
                {currentBonus.slot?.image ? (
                  <img src={currentBonus.slot.image} alt={currentBonus.slotName}
                    className="bht-current-img-full"
                    onError={e => { e.target.style.display = 'none'; }} />
                ) : (
                  <div className="bht-current-img-placeholder" />
                )}
                <span className="bht-current-name-overlay">{currentBonus.slotName || currentBonus.slot?.name}</span>
                {(currentBonus.isSuperBonus || currentBonus.isExtremeBonus || currentBonus.isExtreme) && (
                  <span className="bht-current-best-badge">BEST</span>
                )}
              </div>
              <div className="bht-current-stats">
                <div className="bht-current-stat">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                  <span className="bht-current-stat-label">BET</span>
                  <span className="bht-current-stat-value">{currency}{(Number(currentBonus.betSize) || 0).toFixed(2)}</span>
                </div>
                <div className="bht-current-stat">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  <span className="bht-current-stat-label">MULTI</span>
                  <span className="bht-current-stat-value">{(() => { const bet = Number(currentBonus.betSize) || 0; const pay = Number(currentBonus.payout) || 0; return bet > 0 ? `${(pay / bet).toFixed(0)}x` : '0x'; })()}</span>
                </div>
                <div className="bht-current-stat">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="bht-current-stat-label">WIN</span>
                  <span className="bht-current-stat-value">{currency}{(Number(currentBonus.payout) || 0).toFixed(0)}</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══ Bonus List ═══ */}
      {bonuses.length > 0 && (
        <div className="bht-card bht-list-card">
          {isCompactBH ? (
            <div className="bht-bonus-list" ref={listRef}>
              {(() => {
                const renderCompactCard = (bonus, idx, key) => {
                  const payout = Number(bonus.payout) || 0;
                  const bet = Number(bonus.betSize) || 0;
                  const multi = bet > 0 ? payout / bet : 0;
                  return (
                    <div key={key}
                      className={`bht-bonus-card${idx === currentIndex ? ' bht-bonus-card--active' : ''}${bonus.opened ? ' bht-bonus-card--opened' : ''}${bonus.isSuperBonus ? ' bht-bonus-card--super' : ''}`}>
                      {bonus.slot?.image ? (
                        <img src={bonus.slot.image} alt={bonus.slotName}
                          className={`bht-bonus-card-img${bonus.isSuperBonus ? ' bht-bonus-card-img--super' : ''}`}
                          onError={e => { e.target.src = ''; e.target.style.display = 'none'; }} />
                      ) : (
                        <div className="bht-bonus-card-img" style={{ background: 'linear-gradient(135deg, #1a1f3a, #0e1225)' }} />
                      )}
                      <div className="bht-compact-info-bar">
                        <span className="bht-compact-info-name">{bonus.slotName || bonus.slot?.name}</span>
                        <span className="bht-compact-info-bet">{currency}{bet.toFixed(2)}</span>
                        {bonus.opened && <>
                          <span className="bht-compact-info-payout">{currency}{payout.toFixed(2)}</span>
                          <span className="bht-compact-info-multi">{multi.toFixed(1)}x</span>
                        </>}
                        <span className="bht-compact-info-idx">#{idx + 1}</span>
                      </div>
                    </div>
                  );
                };
                if (isOpening) {
                  const cardH = 111, gap = 6, step = cardH + gap;
                  const offset = -(currentIndex * step);
                  return (
                    <div key="compact-static" className="bht-compact-track bht-compact-track--static"
                      style={{ transform: `translateY(${offset}px)` }}>
                      {bonuses.map((b, i) => renderCompactCard(b, i, b.id || i))}
                    </div>
                  );
                }
                return (
                  <div key="compact-scroll" className="bht-compact-track bht-compact-track--scroll"
                    style={{ '--bht-compact-count': bonuses.length }}>
                    {[...bonuses, ...bonuses].map((b, i) => {
                      const idx = i % bonuses.length;
                      return renderCompactCard(b, idx, `${b.id || idx}-${i >= bonuses.length ? 'c' : 'o'}`);
                    })}
                  </div>
                );
              })()}
            </div>
          ) : (
            <>
              <div className="bht-list-section-title">BONUS LIST</div>
              {/* ── Horizontal thumbnail strip ── */}
              <div className="bht-thumb-strip">
                {bonuses.map((bonus, i) => {
                  const bet = Number(bonus.betSize) || 0;
                  return (
                    <div key={`thumb-${bonus.id || i}`}
                      className={`bht-thumb-card${i === currentIndex ? ' bht-thumb-card--active' : ''}${bonus.opened ? ' bht-thumb-card--opened' : ''}${bonus.isSuperBonus ? ' bht-thumb-card--super' : ''}`}>
                      {bonus.slot?.image ? (
                        <img src={bonus.slot.image} alt={bonus.slotName} className="bht-thumb-img"
                          onError={e => { e.target.style.display = 'none'; }} />
                      ) : (
                        <div className="bht-thumb-placeholder" />
                      )}
                      <span className="bht-thumb-bet">{currency}{bet.toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
              {/* ── Vertical list rows ── */}
              <div className="bht-list-rows">
                <div className="bht-list-rows-track" style={{ '--bht-item-count': bonuses.length }}>
                  {[...bonuses, ...bonuses].map((bonus, i) => {
                    const idx = i % bonuses.length;
                    const payout = Number(bonus.payout) || 0;
                    const bet = Number(bonus.betSize) || 0;
                    const multi = bet > 0 ? payout / bet : 0;
                    return (
                      <div key={`row-${bonus.id || idx}-${i >= bonuses.length ? 'c' : 'o'}`}
                        className={`bht-list-row${idx === currentIndex ? ' bht-list-row--active' : ''}${bonus.opened ? ' bht-list-row--opened' : ''}${bonus.isSuperBonus ? ' bht-list-row--super' : ''}`}>
                        <span className="bht-list-row-idx">#{idx + 1}</span>
                        <div className="bht-list-row-thumb">
                          {bonus.slot?.image ? (
                            <img src={bonus.slot.image} alt="" className="bht-list-row-img"
                              onError={e => { e.target.style.display = 'none'; }} />
                          ) : (
                            <div className="bht-list-row-img-ph" />
                          )}
                        </div>
                        <div className="bht-list-row-info">
                          <span className="bht-list-row-name">{bonus.slotName || bonus.slot?.name}</span>
                          <span className="bht-list-row-provider">{bonus.slot?.provider || ''}</span>
                        </div>
                        <div className="bht-list-row-stats">
                          <div className="bht-list-row-col">
                            <span className="bht-list-row-col-label">MULTI</span>
                            <span className="bht-list-row-col-val">{bonus.opened ? `${multi.toFixed(0)}x` : '0x'}</span>
                          </div>
                          <div className="bht-list-row-col">
                            <span className="bht-list-row-col-label">WIN</span>
                            <span className="bht-list-row-col-val">{currency}{payout.toFixed(0)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══ Total Pay Footer ═══ */}
      <div className="bht-card bht-footer">
        <span className="bht-footer-label">TOTAL PAY</span>
        <span className="bht-footer-value">{currency}{stats.totalWin.toFixed(2)}</span>
      </div>
    </div>
  );
}

export default React.memo(BonusHuntWidget);
