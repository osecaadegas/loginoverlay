import React, { useMemo, useRef, useEffect, useState } from 'react';

/**
 * BonusHuntWidgetV10 — "Spotlight"
 *
 * Clean dark-blue vertical layout.
 * Hunt phase: compact list with only slot name + bet.
 * Opening phase: current bonus expands with image, provider, betsize.
 * Remaining slots stay as compact rows.
 */
function BonusHuntWidgetV10({ config, theme }) {
  const c = config || {};
  const bonuses = c.bonuses || [];
  const currency = c.currency || '€';
  const startMoney = Number(c.startMoney) || 0;
  const stopLoss = Number(c.stopLoss) || 0;

  /* ─── Colors ─── */
  const bgColor = c.headerColor || '#0b1628';
  const cardBg = c.currentBonusColor || '#101d33';
  const accentColor = c.headerAccent || '#2563eb';
  const textColor = c.textColor || '#e2e8f0';
  const mutedColor = c.mutedTextColor || '#64748b';
  const statValueColor = c.statValueColor || '#ffffff';
  const listBg = c.listCardColor || '#0e1a2e';
  const listRowBg = c.listCardAccent || '#131f36';
  const footerBg = c.summaryColor || '#101d33';
  const totalPayColor = c.totalPayColor || '#3b82f6';
  const greenColor = c.superBadgeColor || '#4ade80';
  const redColor = c.extremeBadgeColor || '#f87171';
  const fontFamily = c.fontFamily || "'Inter', sans-serif";
  const fontSize = c.fontSize ?? 12;
  const brightness = c.brightness ?? 100;
  const contrast = c.contrast ?? 100;
  const saturation = c.saturation ?? 100;

  const huntTitle = c.bonusOpening ? 'BONUS OPENING' : 'BONUS HUNT';
  const bonusOpening = c.bonusOpening === true;

  /* ─── Stats ─── */
  const stats = useMemo(() => {
    const totalBetAll = bonuses.reduce((s, b) => s + (Number(b.betSize) || 0), 0);
    const opened = bonuses.filter(b => b.opened);
    const totalBetOpened = opened.reduce((s, b) => s + (Number(b.betSize) || 0), 0);
    const totalWin = opened.reduce((s, b) => s + (Number(b.payout) || 0), 0);
    const totalBetRemaining = Math.max(totalBetAll - totalBetOpened, 0);
    const target = Math.max(startMoney - stopLoss, 0);
    const breakEven = totalBetAll > 0 ? target / totalBetAll : 0;
    const remaining = Math.max(target - totalWin, 0);
    const liveBE = totalBetRemaining > 0 ? remaining / totalBetRemaining : 0;
    const avgMulti = totalBetOpened > 0 ? totalWin / totalBetOpened : 0;
    const beInitial = breakEven;
    return { totalBetAll, totalWin, breakEven, liveBE, avgMulti, beInitial, openedCount: opened.length };
  }, [bonuses, startMoney, stopLoss]);

  const currentBonus = bonuses.find(b => !b.opened);
  const currentIndex = currentBonus ? bonuses.indexOf(currentBonus) : -1;
  const progressPct = bonuses.length > 0 ? (stats.openedCount / bonuses.length) * 100 : 0;

  const fmt = (v) => `${currency}${v.toFixed(2)}`;
  const fmtShort = (v) => `${currency}${v.toFixed(0)}`;
  const fmtX = (v) => (!Number.isFinite(v) || v <= 0) ? '0.00x' : `${v.toFixed(2)}x`;

  /* ─── Auto-scroll list ─── */
  const listRef = useRef(null);
  const innerRef = useRef(null);
  const [scrollH, setScrollH] = useState(0);

  useEffect(() => {
    if (!innerRef.current) return;
    setScrollH(innerRef.current.scrollHeight);
  }, [bonuses]);

  /* ─── Opened bonuses for results section ─── */
  const openedBonuses = bonuses.filter(b => b.opened);

  const rootStyle = {
    fontFamily,
    fontSize: `${fontSize}px`,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    borderRadius: `${c.cardRadius ?? 12}px`,
    filter: (brightness !== 100 || contrast !== 100 || saturation !== 100)
      ? `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
      : undefined,
    '--v10-bg': bgColor,
    '--v10-card': cardBg,
    '--v10-accent': accentColor,
    '--v10-text': textColor,
    '--v10-muted': mutedColor,
    '--v10-stat-val': statValueColor,
    '--v10-list-bg': listBg,
    '--v10-row-bg': listRowBg,
    '--v10-footer-bg': footerBg,
    '--v10-total-pay': totalPayColor,
    '--v10-green': greenColor,
    '--v10-red': redColor,
  };

  return (
    <div className="oc-widget-inner v10-root" style={rootStyle}>

      {/* ═══ HEADER ═══ */}
      <header className="v10-header">
        {c.avatarUrl && (
          <img src={c.avatarUrl} alt="" className="v10-avatar"
            onError={e => { e.target.style.display = 'none'; }} />
        )}
        <div className="v10-header-text">
          <span className="v10-title">{huntTitle}</span>
          {(c.huntNumber || c.huntName) && (
            <span className="v10-hunt-num">#{c.huntName || c.huntNumber}</span>
          )}
        </div>
      </header>

      {/* ═══ TOP STATS — START / STOP / TARGET ═══ */}
      <div className="v10-stats-top">
        <div className="v10-stat-pill">
          <span className="v10-stat-icon">⊕</span>
          <div className="v10-stat-content">
            <span className="v10-stat-label">START</span>
            <span className="v10-stat-value">{fmt(startMoney)}</span>
          </div>
        </div>
        <div className="v10-stat-pill">
          <span className="v10-stat-icon">⊖</span>
          <div className="v10-stat-content">
            <span className="v10-stat-label">STOP</span>
            <span className="v10-stat-value">{stopLoss > 0 ? fmt(stopLoss) : '—'}</span>
          </div>
        </div>
        <div className="v10-stat-pill">
          <span className="v10-stat-icon">⊙</span>
          <div className="v10-stat-content">
            <span className="v10-stat-label">TARGET</span>
            <span className="v10-stat-value">{fmt(Math.max(startMoney - stopLoss, 0))}</span>
          </div>
        </div>
      </div>

      {/* ═══ PROGRESS BAR ═══ */}
      <div className="v10-progress">
        <div className="v10-progress-header">
          <span className="v10-progress-label">PROGRESS</span>
          <span className="v10-progress-count">{stats.openedCount}/{bonuses.length}</span>
        </div>
        <div className="v10-progress-track">
          <div className="v10-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* ═══ BOTTOM STATS — AVG / BE INI / BE ═══ */}
      <div className="v10-stats-bottom">
        <div className="v10-stat-box">
          <span className="v10-stat-box-icon">📊</span>
          <span className="v10-stat-box-label">AVG</span>
          <span className="v10-stat-box-value">{fmtX(stats.avgMulti)}</span>
        </div>
        <div className="v10-stat-box">
          <span className="v10-stat-box-icon">📈</span>
          <span className="v10-stat-box-label">BE INI</span>
          <span className="v10-stat-box-value">{fmtX(stats.beInitial)}</span>
        </div>
        <div className="v10-stat-box">
          <span className="v10-stat-box-icon">📉</span>
          <span className="v10-stat-box-label">BE</span>
          <span className="v10-stat-box-value">{fmtX(stats.liveBE)}</span>
        </div>
      </div>

      {/* ═══ BONUS LIST LABEL ═══ */}
      <div className="v10-list-label">BONUS LIST</div>

      {/* ═══ CURRENT BONUS — Expanded card (only during opening) ═══ */}
      {bonusOpening && currentBonus && (
        <div className={`v10-spotlight${currentBonus.isSuperBonus ? ' v10-spotlight--super' : ''}${(currentBonus.isExtremeBonus || currentBonus.isExtreme) ? ' v10-spotlight--extreme' : ''}`}>
          <div className="v10-spotlight-img-wrap">
            {currentBonus.slot?.image ? (
              <img src={currentBonus.slot.image} alt={currentBonus.slotName} className="v10-spotlight-img"
                onError={e => { e.target.style.display = 'none'; }} />
            ) : (
              <div className="v10-spotlight-img-ph">🎰</div>
            )}
            {(currentBonus.isSuperBonus) && (
              <span className="v10-spotlight-badge v10-spotlight-badge--super">★ SUPER</span>
            )}
            {(currentBonus.isExtremeBonus || currentBonus.isExtreme) && (
              <span className="v10-spotlight-badge v10-spotlight-badge--extreme">⚡ EXTREME</span>
            )}
          </div>
          <div className="v10-spotlight-info">
            <div className="v10-spotlight-name">{currentBonus.slotName || currentBonus.slot?.name}</div>
            <div className="v10-spotlight-provider">{currentBonus.slot?.provider || ''}</div>
            <div className="v10-spotlight-bet">Betsize: {fmt(Number(currentBonus.betSize) || 0)}</div>
          </div>
        </div>
      )}

      {/* ═══ BONUS LIST — Compact rows ═══ */}
      <div className="v10-list" ref={listRef}>
        <div className="v10-list-inner" ref={innerRef}
          style={scrollH > 0 ? { animation: `v10Scroll ${Math.max(bonuses.length * 1.5, 8)}s linear infinite` } : undefined}>
          {[...bonuses, ...bonuses].map((bonus, idx) => {
            const realIdx = idx % bonuses.length;
            const isActive = bonusOpening && realIdx === currentIndex;
            const bet = Number(bonus.betSize) || 0;
            const payout = Number(bonus.payout) || 0;
            const multi = bet > 0 ? payout / bet : 0;
            const isExtreme = bonus.isExtremeBonus || bonus.isExtreme;
            const isSuper = bonus.isSuperBonus;

            /* Skip current bonus in list when opening (it's shown expanded above) */
            if (isActive) return null;

            return (
              <div key={`${bonus.id || realIdx}-${idx < bonuses.length ? 'a' : 'b'}`}
                className={`v10-row${bonus.opened ? ' v10-row--opened' : ''}${isSuper ? ' v10-row--super' : ''}${isExtreme ? ' v10-row--extreme' : ''}`}>
                <span className="v10-row-index">#{realIdx + 1}</span>
                {bonus.slot?.image && (
                  <img src={bonus.slot.image} alt="" className="v10-row-thumb"
                    onError={e => { e.target.style.display = 'none'; }} />
                )}
                <span className="v10-row-name">{bonus.slotName || bonus.slot?.name}</span>
                {isExtreme && <span className="v10-row-badge v10-row-badge--extreme">E</span>}
                {!isExtreme && isSuper && <span className="v10-row-badge v10-row-badge--super">S</span>}
                {bonus.opened ? (
                  <span className="v10-row-result" style={{ color: multi >= 100 ? greenColor : redColor }}>
                    {multi.toFixed(1)}x · {currency}{payout.toFixed(0)}
                  </span>
                ) : (
                  <span className="v10-row-bet">{fmt(bet)}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ OPENED RESULTS SECTION ═══ */}
      {openedBonuses.length > 0 ? (
        <div className="v10-opened-section">
          <div className="v10-opened-label">{openedBonuses.length} bonus{openedBonuses.length !== 1 ? 'es' : ''} opened</div>
        </div>
      ) : (
        <div className="v10-opened-section">
          <div className="v10-opened-empty">No bonuses opened yet</div>
        </div>
      )}

      {/* ═══ FOOTER — Total Pay ═══ */}
      <footer className="v10-footer">
        <span className="v10-footer-label">TOTAL PAY</span>
        <span className="v10-footer-value">{fmt(stats.totalWin)}</span>
      </footer>
    </div>
  );
}

export default React.memo(BonusHuntWidgetV10);
