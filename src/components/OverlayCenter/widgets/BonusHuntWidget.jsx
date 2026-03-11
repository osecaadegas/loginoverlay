import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import BonusHuntWidgetV2 from './BonusHuntWidgetV2';
import BonusHuntWidgetV3 from './BonusHuntWidgetV3';
import BonusHuntWidgetV4 from './BonusHuntWidgetV4';
import BonusHuntWidgetV8 from './BonusHuntWidgetV8';
import BonusHuntWidgetV9 from './BonusHuntWidgetV9';
import BonusHuntWidgetV10 from './BonusHuntWidgetV10';

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

    /* Best & worst opened slot by multiplier */
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

  /* ─── Stats flip toggle (10s interval) ─── */
  const [statsFlipped, setStatsFlipped] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setStatsFlipped(f => !f), 10000);
    return () => clearInterval(id);
  }, []);

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

  /* ─── Classic: auto-rotating carousel during hunt ─── */
  const [carouselIdx, setCarouselIdx] = useState(0);
  useEffect(() => {
    if (isCompactBH || bonuses.length < 2) return;
    const id = setInterval(() => setCarouselIdx(i => (i + 1) % bonuses.length), 2500);
    return () => clearInterval(id);
  }, [isCompactBH, bonuses.length]);

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
  if (c.displayStyle === 'v10_spotlight') {
    return <BonusHuntWidgetV10 config={sortedConfig} theme={theme} />;
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
        <div className="bht-header-stats bht-header-stats--4col">
          <div className={`bht-flip-container${statsFlipped ? ' bht-flip-container--flipped' : ''}`}>
            {/* ── FRONT: START / STOP / B.E. / AVG ── */}
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
            {/* ── BACK: BEST / WORST slot ── */}
            <div className="bht-flip-face bht-flip-back">
              {stats.bestSlot ? (
                <div className="bht-flip-slot bht-flip-slot--best">
                  {stats.bestSlot.slot?.image && (
                    <img src={stats.bestSlot.slot.image} alt="" className="bht-flip-slot-img"
                      onError={e => { e.target.style.display = 'none'; }} />
                  )}
                  <div className="bht-flip-slot-info">
                    <span className="bht-flip-slot-tag">🏆 BEST</span>
                    <span className="bht-flip-slot-name">{stats.bestSlot.slotName}</span>
                    <span className="bht-flip-slot-stats">{stats.bestSlot._multi.toFixed(1)}x · {currency}{stats.bestSlot._payout.toFixed(0)}</span>
                  </div>
                </div>
              ) : (
                <div className="bht-flip-slot bht-flip-slot--empty">
                  <span className="bht-flip-slot-tag">🏆 BEST</span>
                  <span className="bht-flip-slot-name">—</span>
                </div>
              )}
              {stats.worstSlot ? (
                <div className="bht-flip-slot bht-flip-slot--worst">
                  {stats.worstSlot.slot?.image && (
                    <img src={stats.worstSlot.slot.image} alt="" className="bht-flip-slot-img"
                      onError={e => { e.target.style.display = 'none'; }} />
                  )}
                  <div className="bht-flip-slot-info">
                    <span className="bht-flip-slot-tag">💀 WORST</span>
                    <span className="bht-flip-slot-name">{stats.worstSlot.slotName}</span>
                    <span className="bht-flip-slot-stats">{stats.worstSlot._multi.toFixed(1)}x · {currency}{stats.worstSlot._payout.toFixed(0)}</span>
                  </div>
                </div>
              ) : (
                <div className="bht-flip-slot bht-flip-slot--empty">
                  <span className="bht-flip-slot-tag">💀 WORST</span>
                  <span className="bht-flip-slot-name">—</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
        </>
      )}

      {/* ═══ Current Bonus Card (compact only) ═══ */}
      {currentBonus && isCompactBH && (
        <div className="bht-card bht-current">
          <div className={`bht-cpt-current${(currentBonus.isExtremeBonus || currentBonus.isExtreme) ? ' bht-cpt-current--extreme' : ''}${currentBonus.isSuperBonus ? ' bht-cpt-current--super' : ''}`}>
            <div className="bht-cpt-current-img-wrap">
              {currentBonus.slot?.image && (
                <img src={currentBonus.slot.image} alt={currentBonus.slotName}
                  className="bht-cpt-current-img"
                  onError={e => { e.target.style.display = 'none'; }} />
              )}
              {(currentBonus.isExtremeBonus || currentBonus.isExtreme) && <div className="bht-cpt-blood-drip" />}
            </div>
            <div className="bht-cpt-current-info">
              <div className="bht-cpt-current-name">{currentBonus.slotName}</div>
              <div className="bht-cpt-current-counter">#{currentIndex + 1} / {bonuses.length}</div>
              <div className="bht-cpt-current-stats">
                <div className="bht-cpt-current-stat">
                  <span className="bht-cpt-current-stat-label">BET</span>
                  <span>{currency}{(Number(currentBonus.betSize) || 0).toFixed(2)}</span>
                </div>
                <div className="bht-cpt-current-stat">
                  <span className="bht-cpt-current-stat-label">WIN</span>
                  <span>{currency}0.00</span>
                </div>
                <div className="bht-cpt-current-stat">
                  <span className="bht-cpt-current-stat-label">MULTI</span>
                  <span>0x</span>
                </div>
              </div>
            </div>
          </div>
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
                  const isExtreme = bonus.isExtremeBonus || bonus.isExtreme;
                  const isSuper = bonus.isSuperBonus;
                  return (
                    <div key={key}
                      className={`bht-cpt-card${idx === currentIndex ? ' bht-cpt-card--active' : ''}${bonus.opened ? ' bht-cpt-card--opened' : ''}${isSuper ? ' bht-cpt-card--super' : ''}${isExtreme ? ' bht-cpt-card--extreme' : ''}`}>
                      <div className="bht-cpt-card-img-wrap">
                        {bonus.slot?.image ? (
                          <img src={bonus.slot.image} alt={bonus.slotName}
                            className="bht-cpt-card-img"
                            onError={e => { e.target.src = ''; e.target.style.display = 'none'; }} />
                        ) : (
                          <div className="bht-cpt-card-img-ph" />
                        )}
                        {/* Extreme blood drip overlay */}
                        {isExtreme && <div className="bht-cpt-blood-drip" />}
                        {/* Badge */}
                        {isExtreme && <span className="bht-cpt-badge bht-cpt-badge--extreme">EXTREME</span>}
                        {!isExtreme && isSuper && <span className="bht-cpt-badge bht-cpt-badge--super">SUPER</span>}
                      </div>
                      <div className="bht-cpt-card-info">
                        <div className="bht-cpt-card-row1">
                          <span className="bht-cpt-card-idx">#{idx + 1}</span>
                          <span className="bht-cpt-card-name">{bonus.slotName || bonus.slot?.name}</span>
                        </div>
                        <div className="bht-cpt-card-row2">
                          <span className="bht-cpt-card-bet">BET {currency}{bet.toFixed(2)}</span>
                          {bonus.opened && (
                            <>
                              <span className="bht-cpt-card-payout">{currency}{payout.toFixed(2)}</span>
                              <span className={`bht-cpt-card-multi${multi >= 100 ? ' bht-cpt-card-multi--huge' : multi >= 50 ? ' bht-cpt-card-multi--big' : ''}`}>{multi.toFixed(1)}x</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                };
                if (isOpening) {
                  const cardH = 140, gap = 6, step = cardH + gap;
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
                  const itemH = 48, count = bonuses.length, step = itemH;
                  if (isOpening && currentIndex >= 0) {
                    return (
                      <div key="lr-static" className="bht-list-rows-track bht-list-rows-track--static"
                        style={{ transform: `translateY(${-(currentIndex * step)}px)` }}>
                        {bonuses.map((bonus, idx) => {
                          const payout = Number(bonus.payout) || 0;
                          const bet = Number(bonus.betSize) || 0;
                          const multi = bet > 0 ? payout / bet : 0;
                          return (
                            <div key={bonus.id || idx}
                              className={`bht-list-row${idx === currentIndex ? ' bht-list-row--active' : ''}${bonus.opened ? ' bht-list-row--opened' : ''}${bonus.isSuperBonus ? ' bht-list-row--super' : ''}`}>
                              <span className="bht-list-row-idx">{idx + 1}</span>
                              <div className="bht-list-row-thumb">
                                {bonus.slot?.image ? (
                                  <img src={bonus.slot.image} alt={bonus.slotName} className="bht-list-row-img"
                                    onError={e => { e.target.style.display = 'none'; }} />
                                ) : <div className="bht-list-row-img-ph" />}
                              </div>
                              <div className="bht-list-row-info">
                                <span className="bht-list-row-name">{bonus.slotName || bonus.slot?.name}</span>
                              </div>
                              <div className="bht-list-row-stats">
                                <div className="bht-list-row-col">
                                  <span className="bht-list-row-col-label">BET</span>
                                  <span className="bht-list-row-col-val">{currency}{bet.toFixed(2)}</span>
                                </div>
                                <div className="bht-list-row-col">
                                  <span className="bht-list-row-col-label">MULTI</span>
                                  <span className="bht-list-row-col-val">{multi.toFixed(1)}x</span>
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
                    );
                  }
                  return (
                    <div key="lr-scroll" className="bht-list-rows-track bht-list-rows-track--scroll"
                      style={{ '--bht-item-count': count }}>
                      {[...bonuses, ...bonuses].map((bonus, i) => {
                        const idx = i % count;
                        const payout = Number(bonus.payout) || 0;
                        const bet = Number(bonus.betSize) || 0;
                        const multi = bet > 0 ? payout / bet : 0;
                        return (
                          <div key={`lr-${bonus.id || idx}-${i >= count ? 'c' : 'o'}`}
                            className={`bht-list-row${idx === currentIndex ? ' bht-list-row--active' : ''}${bonus.opened ? ' bht-list-row--opened' : ''}${bonus.isSuperBonus ? ' bht-list-row--super' : ''}`}>
                            <span className="bht-list-row-idx">{idx + 1}</span>
                            <div className="bht-list-row-thumb">
                              {bonus.slot?.image ? (
                                <img src={bonus.slot.image} alt={bonus.slotName} className="bht-list-row-img"
                                  onError={e => { e.target.style.display = 'none'; }} />
                              ) : <div className="bht-list-row-img-ph" />}
                            </div>
                            <div className="bht-list-row-info">
                              <span className="bht-list-row-name">{bonus.slotName || bonus.slot?.name}</span>
                            </div>
                            <div className="bht-list-row-stats">
                              <div className="bht-list-row-col">
                                <span className="bht-list-row-col-label">BET</span>
                                <span className="bht-list-row-col-val">{currency}{bet.toFixed(2)}</span>
                              </div>
                              <div className="bht-list-row-col">
                                <span className="bht-list-row-col-label">MULTI</span>
                                <span className="bht-list-row-col-val">{multi.toFixed(1)}x</span>
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
                  );
                })()}
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
