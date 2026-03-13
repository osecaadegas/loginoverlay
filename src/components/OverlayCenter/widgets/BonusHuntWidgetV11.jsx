import React, { useMemo } from 'react';

/**
 * BonusHuntWidgetV11 — "Glass" (Glassmorphism)
 *
 * Same layout as V2 (header → summary → active bonus → slot list → footer)
 * but with frosted-glass panels, translucent backgrounds, and blur effects.
 * Uses bhg-* CSS classes.
 */
function BonusHuntWidgetV11({ config, theme }) {
  const c = config || {};
  const bonuses = c.bonuses || [];
  const currency = c.currency || '€';
  const startMoney = Number(c.startMoney) || 0;
  const stopLoss = Number(c.stopLoss) || 0;

  /* ─── Style vars ─── */
  const headerAccent = c.headerAccent || '#818cf8';
  const totalPayColor = c.totalPayColor || '#22c55e';
  const totalPayText = c.totalPayText || '#ffffff';
  const textColor = c.textColor || '#f1f5f9';
  const mutedTextColor = c.mutedTextColor || '#94a3b8';
  const statValueColor = c.statValueColor || '#ffffff';
  const fontFamily = c.fontFamily || "'Inter', sans-serif";
  const fontSize = c.fontSize ?? 13;
  const cardRadius = c.cardRadius ?? 16;
  const cardGap = c.cardGap ?? 8;
  const slotImageHeight = c.slotImageHeight ?? 36;
  const listMaxHeight = c.listMaxHeight ?? 400;
  const brightness = c.brightness ?? 100;
  const contrast = c.contrast ?? 100;
  const saturation = c.saturation ?? 100;

  const huntTitle = c.bonusOpening ? 'BONUS OPENING' : 'BONUS HUNT';

  const rootStyle = {
    fontFamily,
    fontSize: `${fontSize}px`,
    width: '100%',
    height: '100%',
    overflow: 'hidden auto',
    gap: `${cardGap}px`,
    '--bhg-accent': headerAccent,
    '--bhg-total-bg': totalPayColor,
    '--bhg-total-text': totalPayText,
    '--bhg-text': textColor,
    '--bhg-muted': mutedTextColor,
    '--bhg-stat-val': statValueColor,
    '--bhg-radius': `${cardRadius}px`,
    '--bhg-img-h': `${slotImageHeight}px`,
    '--bhg-list-max': `${listMaxHeight}px`,
    filter: (brightness !== 100 || contrast !== 100 || saturation !== 100)
      ? `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
      : undefined,
  };

  /* ─── Stats ─── */
  const stats = useMemo(() => {
    const totalBetAll = bonuses.reduce((s, b) => s + (Number(b.betSize) || 0), 0);
    const opened = bonuses.filter(b => b.opened);
    const totalBetOpened = opened.reduce((s, b) => s + (Number(b.betSize) || 0), 0);
    const totalWin = opened.reduce((s, b) => s + (Number(b.payout) || 0), 0);
    const totalBetRemaining = Math.max(totalBetAll - totalBetOpened, 0);
    const superCount = bonuses.filter(b => b.isSuperBonus).length;
    const extremeCount = bonuses.filter(b => b.isExtremeBonus || b.isExtreme).length;
    const target = Math.max(startMoney - stopLoss, 0);
    const overallBE = totalBetAll > 0 ? target / totalBetAll : 0;
    const remaining = Math.max(target - totalWin, 0);
    const currentBE = totalBetRemaining > 0 ? remaining / totalBetRemaining : 0;
    const avgMulti = totalBetOpened > 0 ? totalWin / totalBetOpened : 0;
    return { totalBetAll, totalWin, superCount, extremeCount, overallBE, currentBE, avgMulti, openedCount: opened.length };
  }, [bonuses, startMoney, stopLoss]);

  const fmt = (v) => `${currency}${Number(v || 0).toFixed(2)}`;
  const fmtX = (v) => (!Number.isFinite(v) || v <= 0) ? '0.00x' : `${v.toFixed(2)}x`;

  const currentBonus = bonuses.find(b => !b.opened);
  const currentIndex = currentBonus ? bonuses.indexOf(currentBonus) : -1;
  const activeWin = currentBonus && currentBonus.opened ? (Number(currentBonus.payout) || 0) : 0;
  const activeMultiX = currentBonus && currentBonus.opened && Number(currentBonus.betSize) > 0
    ? activeWin / Number(currentBonus.betSize) : 0;
  const progressPct = bonuses.length > 0 ? Math.round((stats.openedCount / bonuses.length) * 100) : 0;

  return (
    <div className="oc-widget-inner oc-bonushunt bhg-root" style={rootStyle}>

      {/* ═══ Header ═══ */}
      <section className="bhg-card bhg-header">
        <div className="bhg-header-top">
          <div className="bhg-header-left">
            {c.avatarUrl ? (
              <img src={c.avatarUrl} alt="" className="bhg-avatar"
                onError={e => { e.target.style.display = 'none'; }} />
            ) : (
              <div className="bhg-icon">🎯</div>
            )}
            <div>
              <div className="bhg-title">{huntTitle}</div>
              <div className="bhg-subtitle">#{bonuses.length > 0 ? bonuses.length : '—'} slots</div>
            </div>
          </div>
          <div className="bhg-badge">{stats.openedCount}/{bonuses.length}</div>
        </div>

        <div className="bhg-stats-row">
          <div className="bhg-stat">
            <span className="bhg-stat-label">START</span>
            <span className="bhg-stat-val">{fmt(startMoney)}</span>
          </div>
          <div className="bhg-stat">
            <span className="bhg-stat-label">B.E.</span>
            <span className="bhg-stat-val">{fmtX(stats.overallBE)}</span>
          </div>
        </div>
      </section>

      {/* ═══ Summary ═══ */}
      <section className="bhg-card bhg-summary">
        <div className="bhg-summary-top">
          <span className="bhg-label">Bonuses</span>
          <span className="bhg-pill">{bonuses.length}</span>
          <span className="bhg-label-xs">Opened {stats.openedCount}/{bonuses.length}</span>
        </div>

        <div className="bhg-progress">
          <div className="bhg-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>

        <div className="bhg-badges">
          <span className="bhg-badge-tag bhg-badge-tag--super">⭐ Super <strong>{stats.superCount}</strong></span>
          <span className="bhg-badge-tag bhg-badge-tag--extreme">🔥 Extreme <strong>{stats.extremeCount}</strong></span>
        </div>
      </section>

      {/* ═══ Active Bonus ═══ */}
      {currentBonus && (
        <section className="bhg-card bhg-active">
          <div className="bhg-active-inner">
            {currentBonus.slot?.image ? (
              <img src={currentBonus.slot.image} alt={currentBonus.slotName} className="bhg-active-img"
                onError={e => { e.target.style.display = 'none'; }} />
            ) : (
              <div className="bhg-active-placeholder">🎰</div>
            )}
            <div className="bhg-active-info">
              <div className="bhg-active-name">{currentBonus.slotName}</div>
              <div className="bhg-active-mini">
                <div className="bhg-mini">
                  <span className="bhg-mini-label">Bet</span>
                  <span className="bhg-mini-val">{fmt(Number(currentBonus.betSize) || 0)}</span>
                </div>
                <div className="bhg-mini">
                  <span className="bhg-mini-label">Win</span>
                  <span className="bhg-mini-val">{currentBonus.opened ? fmt(activeWin) : '—'}</span>
                </div>
                <div className="bhg-mini">
                  <span className="bhg-mini-label">Multi</span>
                  <span className="bhg-mini-val bhg-green">{fmtX(activeMultiX)}</span>
                </div>
              </div>
            </div>
            <span className="bhg-active-num">#{currentIndex + 1}</span>
          </div>
        </section>
      )}

      {/* ═══ Slot List ═══ */}
      {bonuses.length > 0 && (
        <section className="bhg-card bhg-list-section">
          <div className="bhg-list-header">
            <span className="bhg-label">Slots</span>
            <span className="bhg-pill">{(currentIndex >= 0 ? currentIndex + 1 : stats.openedCount)}/{bonuses.length}</span>
          </div>
          <div className="bhg-list">
            <div className="bhg-list-track" style={{ '--bhg-item-count': bonuses.length }}>
              {[...bonuses, ...bonuses].map((bonus, i) => {
                const idx = i % bonuses.length;
                const isActive = idx === currentIndex;
                const isOpened = bonus.opened;
                const multiX = isOpened && Number(bonus.betSize) > 0
                  ? (Number(bonus.payout) || 0) / Number(bonus.betSize) : 0;

                return (
                  <div key={`${bonus.id || idx}-${i >= bonuses.length ? 'c' : 'o'}`}
                    className={`bhg-slot ${isActive ? 'bhg-slot--active' : ''} ${isOpened ? '' : 'bhg-slot--locked'} ${bonus.isSuperBonus ? 'bhg-slot--super' : ''}`}>
                    <div className="bhg-slot-img-wrap">
                      {bonus.slot?.image ? (
                        <img src={bonus.slot.image} alt={bonus.slotName} className="bhg-slot-img"
                          onError={e => { e.target.style.display = 'none'; }} />
                      ) : (
                        <div className="bhg-slot-placeholder" />
                      )}
                    </div>
                    <div className="bhg-slot-info">
                      <div className="bhg-slot-top">
                        <span className="bhg-slot-name">{bonus.slotName || bonus.slot?.name}</span>
                        <span className="bhg-slot-num">#{idx + 1}</span>
                      </div>
                      <div className="bhg-slot-bottom">
                        <span className="bhg-slot-bet">{fmt(Number(bonus.betSize) || 0)}</span>
                        <span className={`bhg-slot-multi ${multiX >= 100 ? 'bhg-green' : multiX >= 50 ? 'bhg-amber' : ''}`}>
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

      {/* ═══ Footer ═══ */}
      {c.showStatistics !== false && (
        <section className="bhg-card bhg-footer">
          <div className="bhg-footer-stats">
            <div className="bhg-footer-stat">
              <span className="bhg-footer-label">avgX</span>
              <span className="bhg-footer-val">{fmtX(stats.avgMulti)}</span>
            </div>
            <div className="bhg-footer-stat">
              <span className="bhg-footer-label bhg-green">BE x</span>
              <span className="bhg-footer-val bhg-green">{fmtX(stats.currentBE)}</span>
            </div>
          </div>
          <div className="bhg-total">
            <span className="bhg-total-label">Total Pay</span>
            <span className="bhg-total-val">{fmt(stats.totalWin)}</span>
          </div>
        </section>
      )}
    </div>
  );
}

export default React.memo(BonusHuntWidgetV11);
