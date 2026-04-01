import React, { useMemo } from 'react';

/**
 * BonusHuntWidgetV10 — "Metallic"
 *
 * Exact Classic (V2) layout with a brushed-steel metallic colour palette.
 * Reads from the same config shape as V1/V2.
 */
function BonusHuntWidgetV10({ config, theme }) {
  const c = config || {};
  const bonuses = c.bonuses || [];
  const currency = c.currency || '€';
  const startMoney = Number(c.startMoney) || 0;
  const stopLoss = Number(c.stopLoss) || 0;

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

  /* ─── Dynamic title based on bonusOpening toggle ─── */
  const huntTitle = c.bonusOpening ? 'BONUS OPENING' : 'BONUS HUNT';
  const cardOutlineWidth = c.cardOutlineWidth ?? 1;
  const fontFamily = c.fontFamily || "'Inter', sans-serif";
  const fontSize = c.fontSize ?? 13;
  const cardRadius = c.cardRadius ?? 12;
  const cardGap = c.cardGap ?? 8;
  const widgetWidth = c.widgetWidth ?? 400;
  const cardPadding = c.cardPadding ?? 12;
  const slotImageHeight = c.slotImageHeight ?? 36;
  const listMaxHeight = c.listMaxHeight ?? 400;
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
    '--v10-header-bg': headerColor,
    '--v10-header-accent': headerAccent,
    '--v10-count-bg': countCardColor,
    '--v10-current-bg': currentBonusColor,
    '--v10-current-accent': currentBonusAccent,
    '--v10-list-bg': listCardColor,
    '--v10-list-accent': listCardAccent,
    '--v10-summary-bg': summaryColor,
    '--v10-total-pay-bg': totalPayColor,
    '--v10-total-pay-text': totalPayText,
    '--v10-super-badge': superBadgeColor,
    '--v10-extreme-badge': extremeBadgeColor,
    '--v10-text': textColor,
    '--v10-muted': mutedTextColor,
    '--v10-stat-value': statValueColor,
    '--v10-card-outline': cardOutlineColor,
    '--v10-card-outline-width': `${cardOutlineWidth}px`,
    '--v10-card-radius': `${cardRadius}px`,
    '--v10-card-padding': `${cardPadding}px`,
    '--v10-slot-img-height': `${slotImageHeight}px`,
    '--v10-list-max-height': `${listMaxHeight}px`,
  };

  /* ─── Derived stats ─── */
  const stats = useMemo(() => {
    const totalBetAll = bonuses.reduce((s, b) => s + (Number(b.betSize) || 0), 0);
    const openedBonuses = bonuses.filter(b => b.opened);
    const totalBetOpened = openedBonuses.reduce((s, b) => s + (Number(b.betSize) || 0), 0);
    const totalWin = openedBonuses.reduce((s, b) => s + (Number(b.payout) || 0), 0);
    const totalBetRemaining = Math.max(totalBetAll - totalBetOpened, 0);
    const superCount = bonuses.filter(b => b.isSuperBonus).length;
    const extremeCount = bonuses.filter(b => b.isExtreme).length;

    const target = Math.max(startMoney - stopLoss, 0);
    const overallBE = totalBetAll > 0 ? target / totalBetAll : 0;
    const avgMulti = totalBetOpened > 0 ? totalWin / totalBetOpened : 0;
    const remaining = Math.max(target - totalWin, 0);
    const currentBE = totalBetRemaining > 0 ? remaining / totalBetRemaining : 0;

    return {
      totalBetAll, totalWin, superCount, extremeCount,
      overallBE, avgMulti, currentBE,
      openedCount: openedBonuses.length,
    };
  }, [bonuses, startMoney, stopLoss]);

  const fmt = (v) => `${currency}${v.toFixed(2)}`;
  const fmtX = (v) => (!Number.isFinite(v) || v <= 0) ? '0.00x' : `${v.toFixed(2)}x`;

  /* Current bonus = first unopened */
  const currentBonus = bonuses.find(b => !b.opened);
  const currentIndex = currentBonus ? bonuses.indexOf(currentBonus) : -1;

  const activeWin = currentBonus && currentBonus.opened ? (Number(currentBonus.payout) || 0) : 0;
  const activeMultiX = currentBonus && currentBonus.opened && Number(currentBonus.betSize) > 0
    ? activeWin / Number(currentBonus.betSize) : 0;
  const progressPct = bonuses.length > 0 ? (stats.openedCount / bonuses.length) * 100 : 0;

  return (
    <div className="oc-widget-inner oc-bonushunt v10-root" style={rootStyle}>

      {/* ═══ Session Header ═══ */}
      <section className="v10-card v10-header">
        <div className="v10-header-top">
          <div className="v10-header-left">
            {c.avatarUrl ? (
              <img src={c.avatarUrl} alt="" className="v10-streamer-logo"
                onError={e => { e.target.style.display = 'none'; }} />
            ) : (
              <div className="v10-icon">
                <div className="v10-icon-inner">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 1 1-3.68-7.21" /><polyline points="21 3 21 9 15 9" />
                  </svg>
                </div>
              </div>
            )}
            <div>
              <div className="v10-label-sm" style={{ fontWeight: 700, letterSpacing: '0.18em', fontSize: '1.2em' }}>{huntTitle}</div>
            </div>
          </div>
          <span className="v10-tag-muted">#{bonuses.length > 0 ? bonuses.length : '—'}</span>
        </div>

        <div className="v10-header-stats">
          <div className="v10-stat-tile">
            <div className="v10-stat-tile-label">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
              Start
            </div>
            <div className="v10-stat-tile-value">{fmt(startMoney)}</div>
          </div>
          <div className="v10-stat-tile">
            <div className="v10-stat-tile-label v10-accent-gold">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><path d="M4 12h16" /><path d="M12 4a8 8 0 0 1 0 16" />
              </svg>
              Start BEx
            </div>
            <div className="v10-stat-tile-value v10-accent-gold">{fmtX(stats.overallBE)}</div>
          </div>
        </div>
      </section>

      {/* ═══ Bonuses Summary ═══ */}
      <section className="v10-card v10-summary-section">
        <div className="v10-summary-top">
          <div className="v10-summary-left">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: headerAccent, flexShrink: 0 }}>
              <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span className="v10-label-sm">Bonuses</span>
            <span className="v10-pill">{bonuses.length}</span>
          </div>
          <div className="v10-label-xs">Opened {stats.openedCount}/{bonuses.length}</div>
        </div>

        {/* Progress bar */}
        <div className="v10-progress-track" style={{ marginBottom: 8 }}>
          <div className="v10-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>

        <div className="v10-badges" style={{ marginBottom: 0 }}>
          <span className="v10-badge v10-badge--super">
            <span className="v10-badge-dot v10-badge-dot--super" />
            Super <strong>{stats.superCount}</strong>
          </span>
          <span className="v10-badge v10-badge--extreme">
            <span className="v10-badge-dot v10-badge-dot--extreme" />
            Extreme <strong>{stats.extremeCount}</strong>
          </span>
        </div>
      </section>

      {/* ═══ Active Bonus ═══ */}
      {currentBonus && (
        <section className="v10-card v10-active">
          <div className="v10-active-top">
            {currentBonus.slot?.image ? (
              <img src={currentBonus.slot.image} alt={currentBonus.slotName}
                className="v10-active-img"
                onError={e => { e.target.style.display = 'none'; }} />
            ) : (
              <div className="v10-active-img-placeholder" />
            )}
            <div className="v10-active-info">
              <div className="v10-active-header">
                <div className="v10-active-name">{currentBonus.slotName}</div>
                <div className="v10-active-num">#{currentIndex + 1}</div>
              </div>
              <div className="v10-active-mini-stats">
                <div className="v10-mini-tile">
                  <span className="v10-mini-label">Bet</span>
                  <span className="v10-mini-value">{fmt(Number(currentBonus.betSize) || 0)}</span>
                </div>
                <div className="v10-mini-tile">
                  <span className="v10-mini-label">Win</span>
                  <span className="v10-mini-value">{currentBonus.opened ? fmt(activeWin) : '—'}</span>
                </div>
                <div className="v10-mini-tile">
                  <span className="v10-mini-label">Multi</span>
                  <span className="v10-mini-value v10-accent-gold">{fmtX(activeMultiX)}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══ Vertical Slot List ═══ */}
      {bonuses.length > 0 && (
        <section className="v10-card v10-carousel">
          <div className="v10-carousel-header">
            <div className="v10-summary-left">
              <span className="v10-label-sm">Slots</span>
              <span className="v10-pill">{(currentIndex >= 0 ? currentIndex + 1 : stats.openedCount)}/{bonuses.length}</span>
            </div>
            <div className="v10-carousel-actions">
              <span className="v10-carousel-btn">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
              </span>
              <span className="v10-carousel-btn">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
              </span>
              <span className="v10-carousel-btn v10-carousel-btn--info">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
              </span>
            </div>
          </div>

          <div className="v10-slot-list">
            <div className="v10-slot-list-track" style={{ '--v10-item-count': bonuses.length }}>
              {[...bonuses, ...bonuses].map((bonus, i) => {
                const idx = i % bonuses.length;
                const isActive = idx === currentIndex;
                const isOpened = bonus.opened;
                const multiX = isOpened && Number(bonus.betSize) > 0
                  ? (Number(bonus.payout) || 0) / Number(bonus.betSize) : 0;

                return (
                  <div key={`${bonus.id || idx}-${i >= bonuses.length ? 'c' : 'o'}`}
                    className={`v10-slot-row ${isActive ? 'v10-slot-row--active' : ''} ${isOpened ? '' : 'v10-slot-row--locked'} ${bonus.isSuperBonus ? 'v10-slot-row--super' : ''}`}>
                    <div className="v10-slot-img-wrap">
                      {bonus.slot?.image ? (
                        <img src={bonus.slot.image} alt={bonus.slotName}
                          className="v10-slot-img"
                          onError={e => { e.target.style.display = 'none'; }} />
                      ) : (
                        <div className="v10-slot-img-placeholder" />
                      )}
                    </div>
                    <div className="v10-slot-info">
                      <div className="v10-slot-top-row">
                        <div className="v10-slot-name-col">
                          <span className="v10-slot-name">{bonus.slotName || bonus.slot?.name}</span>
                        </div>
                        <span className="v10-slot-num">#{idx + 1}</span>
                      </div>
                      <div className="v10-slot-bottom-row">
                        <span className="v10-slot-bet">{fmt(Number(bonus.betSize) || 0)}</span>
                        <span className={`v10-slot-stat-val ${multiX >= 100 ? 'v10-accent-green' : multiX >= 50 ? 'v10-accent-amber' : ''}`}>
                          {isOpened ? fmtX(multiX) : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ═══ Footer Stats ═══ */}
      {c.showStatistics !== false && (
        <section className="v10-card v10-footer">
          <div className="v10-footer-stats">
            <div className="v10-footer-stat">
              <div className="v10-footer-stat-label">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3v18h18" /><path d="M7 14l4-4 4 4 4-6" />
                </svg>
                avgX
              </div>
              <span className="v10-footer-stat-val">{fmtX(stats.avgMulti)}</span>
            </div>
            <div className="v10-footer-stat">
              <div className="v10-footer-stat-label v10-accent-gold">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                </svg>
                BE x
              </div>
              <span className="v10-footer-stat-val v10-accent-gold">{fmtX(stats.currentBE)}</span>
            </div>
          </div>
          <div className="v10-total-bar">
            <div className="v10-total-left">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><path d="M8 12h8" /><path d="M12 8v8" />
              </svg>
              Total Pay
            </div>
            <span className="v10-total-value">{fmt(stats.totalWin)}</span>
          </div>
        </section>
      )}
    </div>
  );
}

export default React.memo(BonusHuntWidgetV10);
