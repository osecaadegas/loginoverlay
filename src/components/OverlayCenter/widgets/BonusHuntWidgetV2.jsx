import React, { useMemo } from 'react';

/**
 * BonusHuntWidgetV2 — Style 2: Sleek dark slate design matching reference layout.
 * Reads from the same config shape as V1.
 */
export default function BonusHuntWidgetV2({ config, theme }) {
  const c = config || {};
  const bonuses = c.bonuses || [];
  const currency = c.currency || '€';
  const startMoney = Number(c.startMoney) || 0;

  /* ─── Custom style vars ─── */
  const headerColor = c.headerColor || '#0f172a';
  const headerAccent = c.headerAccent || '#38bdf8';
  const countCardColor = c.countCardColor || '#0f172a';
  const currentBonusColor = c.currentBonusColor || '#0f172a';
  const currentBonusAccent = c.currentBonusAccent || '#38bdf8';
  const listCardColor = c.listCardColor || '#0f172a';
  const listCardAccent = c.listCardAccent || '#94a3b8';
  const summaryColor = c.summaryColor || '#0f172a';
  const totalPayColor = c.totalPayColor || '#22c55e';
  const totalPayText = c.totalPayText || '#ffffff';
  const superBadgeColor = c.superBadgeColor || '#eab308';
  const extremeBadgeColor = c.extremeBadgeColor || '#ef4444';
  const textColor = c.textColor || '#e2e8f0';
  const mutedTextColor = c.mutedTextColor || '#64748b';
  const statValueColor = c.statValueColor || '#f1f5f9';
  const cardOutlineColor = c.cardOutlineColor || 'rgba(51,65,85,0.7)';
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
    maxWidth: `${widgetWidth}px`,
    gap: `${cardGap}px`,
    filter: (brightness !== 100 || contrast !== 100 || saturation !== 100)
      ? `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
      : undefined,
    '--bht2-header-bg': headerColor,
    '--bht2-header-accent': headerAccent,
    '--bht2-count-bg': countCardColor,
    '--bht2-current-bg': currentBonusColor,
    '--bht2-current-accent': currentBonusAccent,
    '--bht2-list-bg': listCardColor,
    '--bht2-list-accent': listCardAccent,
    '--bht2-summary-bg': summaryColor,
    '--bht2-total-pay-bg': totalPayColor,
    '--bht2-total-pay-text': totalPayText,
    '--bht2-super-badge': superBadgeColor,
    '--bht2-extreme-badge': extremeBadgeColor,
    '--bht2-text': textColor,
    '--bht2-muted': mutedTextColor,
    '--bht2-stat-value': statValueColor,
    '--bht2-card-outline': cardOutlineColor,
    '--bht2-card-outline-width': `${cardOutlineWidth}px`,
    '--bht2-card-radius': `${cardRadius}px`,
    '--bht2-card-padding': `${cardPadding}px`,
    '--bht2-slot-img-height': `${slotImageHeight}px`,
    '--bht2-list-max-height': `${listMaxHeight}px`,
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

    const overallBE = totalBetAll > 0 ? startMoney / totalBetAll : 0;
    const avgMulti = totalBetOpened > 0 ? totalWin / totalBetOpened : 0;
    const remaining = Math.max(startMoney - totalWin, 0);
    const currentBE = totalBetRemaining > 0 ? remaining / totalBetRemaining : 0;

    return {
      totalBetAll, totalWin, superCount, extremeCount,
      overallBE, avgMulti, currentBE,
      openedCount: openedBonuses.length,
    };
  }, [bonuses, startMoney]);

  const fmt = (v) => `${currency}${v.toFixed(2)}`;
  const fmtX = (v) => (!Number.isFinite(v) || v <= 0) ? '0.00x' : `${v.toFixed(2)}x`;

  /* Current bonus = first unopened */
  const currentBonus = bonuses.find(b => !b.opened);
  const currentIndex = currentBonus ? bonuses.indexOf(currentBonus) : -1;

  if (!c.huntActive && bonuses.length === 0) {
    return (
      <div className="oc-widget-inner oc-bonushunt">
        <p className="oc-widget-empty">No active bonus hunt</p>
      </div>
    );
  }

  const activeWin = currentBonus && currentBonus.opened ? (Number(currentBonus.payout) || 0) : 0;
  const activeMultiX = currentBonus && currentBonus.opened && Number(currentBonus.betSize) > 0
    ? activeWin / Number(currentBonus.betSize) : 0;
  const progressPct = bonuses.length > 0 ? (stats.openedCount / bonuses.length) * 100 : 0;

  return (
    <div className="oc-widget-inner oc-bonushunt bht2-root" style={rootStyle}>

      {/* ═══ Session Header ═══ */}
      <section className="bht2-card bht2-header">
        <div className="bht2-header-top">
          <div className="bht2-header-left">
            <div className="bht2-icon">
              <div className="bht2-icon-inner">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 1 1-3.68-7.21" /><polyline points="21 3 21 9 15 9" />
                </svg>
              </div>
            </div>
            <div>
              <div className="bht2-label-sm" style={{ fontWeight: 700, letterSpacing: '0.18em' }}>BONUS OPENING</div>
              <div className="bht2-label-xs">Session Tracker</div>
            </div>
          </div>
          <span className="bht2-tag-muted">#{bonuses.length > 0 ? bonuses.length : '—'}</span>
        </div>

        <div className="bht2-header-stats">
          <div className="bht2-stat-tile">
            <div className="bht2-stat-tile-label">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
              Start
            </div>
            <div className="bht2-stat-tile-value">{fmt(startMoney)}</div>
          </div>
          <div className="bht2-stat-tile">
            <div className="bht2-stat-tile-label bht2-accent-green">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><path d="M4 12h16" /><path d="M12 4a8 8 0 0 1 0 16" />
              </svg>
              Breakeven
            </div>
            <div className="bht2-stat-tile-value bht2-accent-green">{fmtX(stats.overallBE)}</div>
          </div>
        </div>
      </section>

      {/* ═══ Bonuses Summary ═══ */}
      <section className="bht2-card bht2-summary-section">
        <div className="bht2-summary-top">
          <div className="bht2-summary-left">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: headerAccent, flexShrink: 0 }}>
              <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span className="bht2-label-sm">Bonuses</span>
            <span className="bht2-pill">{bonuses.length}</span>
          </div>
          <div className="bht2-label-xs">Opened {stats.openedCount}/{bonuses.length}</div>
        </div>
        <div className="bht2-badges">
          <span className="bht2-badge bht2-badge--super">
            <span className="bht2-badge-dot bht2-badge-dot--super" />
            Super <strong>{stats.superCount}</strong>
          </span>
          <span className="bht2-badge bht2-badge--extreme">
            <span className="bht2-badge-dot bht2-badge-dot--extreme" />
            Extreme <strong>{stats.extremeCount}</strong>
          </span>
        </div>
      </section>

      {/* ═══ Active Bonus ═══ */}
      {currentBonus && (
        <section className="bht2-card bht2-active">
          <div className="bht2-active-top">
            {currentBonus.slot?.image ? (
              <img src={currentBonus.slot.image} alt={currentBonus.slotName}
                className="bht2-active-img"
                onError={e => { e.target.style.display = 'none'; }} />
            ) : (
              <div className="bht2-active-img-placeholder" />
            )}
            <div className="bht2-active-info">
              <div className="bht2-active-header">
                <div className="bht2-label-sm bht2-accent-sky" style={{ fontWeight: 700 }}>{currentBonus.slotName}</div>
                <div className="bht2-label-xs">#{currentIndex + 1}</div>
              </div>
              <div className="bht2-active-mini-stats">
                <div className="bht2-mini-tile">
                  <span className="bht2-mini-label">Win</span>
                  <span className="bht2-mini-value">{currentBonus.opened ? fmt(activeWin) : '—'}</span>
                </div>
                <div className="bht2-mini-tile">
                  <span className="bht2-mini-label">Multi</span>
                  <span className="bht2-mini-value bht2-accent-green">{fmtX(activeMultiX)}</span>
                </div>
                <div className="bht2-mini-tile">
                  <span className="bht2-mini-label">Bet</span>
                  <span className="bht2-mini-value">{fmt(Number(currentBonus.betSize) || 0)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Detail stat boxes — BET / WIN / START */}
          <div className="bht2-detail-row">
            <div className="bht2-detail-box">
              <span className="bht2-detail-label">Bet</span>
              <span className="bht2-detail-value">{(Number(currentBonus.betSize) || 0)}</span>
            </div>
            <div className="bht2-detail-box">
              <span className="bht2-detail-label">Win</span>
              <span className="bht2-detail-value">{currentBonus.opened ? (Number(currentBonus.payout) || 0) : '—'}</span>
            </div>
            <div className="bht2-detail-box">
              <span className="bht2-detail-label">Start</span>
              <span className="bht2-detail-value">{startMoney}</span>
            </div>
          </div>
        </section>
      )}

      {/* ═══ Vertical Slot List ═══ */}
      {bonuses.length > 0 && (
        <section className="bht2-card bht2-carousel">
          <div className="bht2-carousel-header">
            <div className="bht2-summary-left">
              <span className="bht2-label-sm">Slots</span>
              <span className="bht2-pill">{(currentIndex >= 0 ? currentIndex + 1 : stats.openedCount)}/{bonuses.length}</span>
            </div>
            <div className="bht2-carousel-actions">
              <span className="bht2-carousel-btn">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
              </span>
              <span className="bht2-carousel-btn">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
              </span>
              <span className="bht2-carousel-btn bht2-carousel-btn--info">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
              </span>
            </div>
          </div>

          <div className="bht2-slot-list">
            <div className="bht2-slot-list-track" style={{ '--bht2-item-count': bonuses.length }}>
              {[...bonuses, ...bonuses].map((bonus, i) => {
                const idx = i % bonuses.length;
                const isActive = idx === currentIndex;
                const isOpened = bonus.opened;
                const multiX = isOpened && Number(bonus.betSize) > 0
                  ? (Number(bonus.payout) || 0) / Number(bonus.betSize) : 0;

                return (
                  <div key={`${bonus.id || idx}-${i >= bonuses.length ? 'c' : 'o'}`}
                    className={`bht2-slot-row ${isActive ? 'bht2-slot-row--active' : ''} ${isOpened ? '' : 'bht2-slot-row--locked'} ${bonus.isSuperBonus ? 'bht2-slot-row--super' : ''}`}>
                    <div className="bht2-slot-img-wrap">
                      {bonus.slot?.image ? (
                        <img src={bonus.slot.image} alt={bonus.slotName}
                          className={`bht2-slot-img ${!isOpened && !isActive ? 'bht2-slot-img--grey' : ''}`}
                          onError={e => { e.target.style.display = 'none'; }} />
                      ) : (
                        <div className="bht2-slot-img-placeholder" />
                      )}
                    </div>
                    <div className="bht2-slot-info">
                      <div className="bht2-slot-top-row">
                        <div className="bht2-slot-name-col">
                          <span className="bht2-slot-name">{bonus.slotName || bonus.slot?.name}</span>
                          <span className="bht2-slot-bet">{fmt(Number(bonus.betSize) || 0)}</span>
                        </div>
                        <span className="bht2-slot-num">#{idx + 1}</span>
                      </div>
                      <div className="bht2-slot-bottom-row">
                        <div className="bht2-slot-stat-col">
                          <span className="bht2-slot-stat-label">{isOpened ? 'Win' : 'Locked'}</span>
                          <span className="bht2-slot-stat-val">{isOpened ? fmt(Number(bonus.payout) || 0) : '—'}</span>
                        </div>
                        <div className="bht2-slot-stat-col bht2-slot-stat-col--right">
                          <span className="bht2-slot-stat-label">Multi</span>
                          <span className={`bht2-slot-stat-val ${multiX >= 100 ? 'bht2-accent-green' : multiX >= 50 ? 'bht2-accent-amber' : ''}`}>
                            {fmtX(multiX)}
                          </span>
                        </div>
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
        <section className="bht2-card bht2-footer">
          <div className="bht2-footer-stats">
            <div className="bht2-footer-stat">
              <div className="bht2-footer-stat-label">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3v18h18" /><path d="M7 14l4-4 4 4 4-6" />
                </svg>
                Average
              </div>
              <span className="bht2-footer-stat-val">{fmtX(stats.avgMulti)}</span>
            </div>
            <div className="bht2-footer-stat">
              <div className="bht2-footer-stat-label bht2-accent-green">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                </svg>
                Breakeven
              </div>
              <span className="bht2-footer-stat-val bht2-accent-green">{fmtX(stats.currentBE)}</span>
            </div>
          </div>
          <div className="bht2-total-bar">
            <div className="bht2-total-left">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><path d="M8 12h8" /><path d="M12 8v8" />
              </svg>
              Total Pay
            </div>
            <span className="bht2-total-value">{fmt(stats.totalWin)}</span>
          </div>
        </section>
      )}
    </div>
  );
}
