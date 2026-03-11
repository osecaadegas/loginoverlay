import React, { useMemo, useRef, useEffect, useState } from 'react';

/**
 * BonusHuntWidgetV4 — "Forged Metal"
 *
 * Dark brushed-steel industrial theme with embossed rivets,
 * metallic gradients, stamped text, hexagonal progress gauge,
 * and a compact vertical layout that fits cleanly in OBS.
 */
function BonusHuntWidgetV4({ config, theme }) {
  const c = config || {};
  const bonuses = c.bonuses || [];
  const currency = c.currency || '€';
  const startMoney = Number(c.startMoney) || 0;
  const stopLoss = Number(c.stopLoss) || 0;

  const accentColor = c.headerAccent || '#e8a020';
  const textColor = c.textColor || '#d4d4d8';
  const bgColor = c.headerColor || '#1a1a1e';
  const headerBg = c.currentBonusColor || '#2a2a30';
  const statLabelColor = c.mutedTextColor || '#666666';
  const statValueColor = c.statValueColor || accentColor;
  const listBg = c.listCardColor || '#1a1a1e';
  const rowNameColor = c.listCardAccent || '#cccccc';
  const footerBg = c.summaryColor || '#2a2a30';
  const greenColor = c.superBadgeColor || '#66bb6a';
  const redColor = c.extremeBadgeColor || '#ef5350';
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
    return { totalBetAll, totalWin, breakEven, liveBE, avgMulti, openedCount: opened.length };
  }, [bonuses, startMoney, stopLoss]);

  const currentBonus = bonuses.find(b => !b.opened);
  const currentIndex = currentBonus ? bonuses.indexOf(currentBonus) : -1;
  const progressPct = bonuses.length > 0 ? (stats.openedCount / bonuses.length) * 100 : 0;
  const profit = stats.totalWin - startMoney;

  const fmt = (v) => `${currency}${v.toFixed(2)}`;
  const fmtX = (v) => (!Number.isFinite(v) || v <= 0) ? '0.00x' : `${v.toFixed(2)}x`;

  /* ─── Auto-scroll logic ─── */
  const listRef = useRef(null);
  const innerRef = useRef(null);
  const [scrollH, setScrollH] = useState(0);

  useEffect(() => {
    if (!innerRef.current) return;
    const h = innerRef.current.scrollHeight;
    setScrollH(h);
  }, [bonuses]);

  const rootStyle = {
    fontFamily,
    fontSize: `${fontSize}px`,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    filter: (brightness !== 100 || contrast !== 100 || saturation !== 100)
      ? `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
      : undefined,
    '--m4-accent': accentColor,
    '--m4-text': textColor,
    '--m4-bg': bgColor,
    '--m4-header-bg': headerBg,
    '--m4-stat-label': statLabelColor,
    '--m4-stat-value': statValueColor,
    '--m4-list-bg': listBg,
    '--m4-row-name': rowNameColor,
    '--m4-footer-bg': footerBg,
    '--m4-green': greenColor,
    '--m4-red': redColor,
  };

  return (
    <div className="oc-widget-inner m4-root" style={rootStyle}>
      {/* Metal texture overlay */}
      <div className="m4-texture" aria-hidden="true" />

      {/* ═══ HEADER — Stamped title plate ═══ */}
      <header className="m4-header">
        <div className="m4-header-left">
          {c.avatarUrl && (
            <img src={c.avatarUrl} alt="" className="m4-avatar"
              onError={e => { e.target.style.display = 'none'; }} />
          )}
          <div className="m4-title-plate">
            <span className="m4-title">{huntTitle}</span>
          </div>
        </div>
        <div className="m4-header-right">
          <div className={`m4-status-led${bonusOpening ? ' m4-status-led--active' : ''}`} />
          <span className="m4-status-text">{bonusOpening ? 'OPENING' : 'COLLECTING'}</span>
        </div>
      </header>

      {/* ═══ STATS BAR — Embossed metal panels ═══ */}
      <div className="m4-stats-bar">
        {[
          { label: 'START', value: `${currency}${startMoney.toFixed(0)}` },
          { label: 'B.E.', value: fmtX(stats.liveBE), color: stats.liveBE >= 100 ? greenColor : redColor },
          { label: 'AVG', value: fmtX(stats.avgMulti), color: stats.avgMulti >= 100 ? greenColor : redColor },
          { label: 'PROFIT', value: (profit >= 0 ? '+' : '') + fmt(profit), color: profit >= 0 ? greenColor : redColor },
        ].map((s, i) => (
          <div key={i} className="m4-stat-cell">
            <span className="m4-stat-label">{s.label}</span>
            <span className="m4-stat-value" style={s.color ? { color: s.color } : undefined}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* ═══ PROGRESS GAUGE ═══ */}
      <div className="m4-gauge">
        <div className="m4-gauge-track">
          <div className="m4-gauge-fill" style={{ width: `${progressPct}%` }} />
          <div className="m4-gauge-notches">
            {[0,25,50,75,100].map(n => <div key={n} className="m4-gauge-notch" style={{ left: `${n}%` }} />)}
          </div>
        </div>
        <span className="m4-gauge-text">{stats.openedCount} / {bonuses.length}</span>
      </div>

      {/* ═══ CURRENT BONUS — Forged plate ═══ */}
      {currentBonus && (
        <div className="m4-current">
          <div className="m4-current-img-wrap">
            {currentBonus.slot?.image ? (
              <img src={currentBonus.slot.image} alt={currentBonus.slotName} className="m4-current-img"
                onError={e => { e.target.style.display = 'none'; }} />
            ) : (
              <div className="m4-current-img-ph">⚙</div>
            )}
          </div>
          <div className="m4-current-info">
            <div className="m4-current-name">{currentBonus.slotName || currentBonus.slot?.name}</div>
            <div className="m4-current-meta">
              <span>BET {fmt(Number(currentBonus.betSize) || 0)}</span>
              <span>#{currentIndex + 1}</span>
            </div>
            {(currentBonus.isSuperBonus || currentBonus.isExtremeBonus || currentBonus.isExtreme) && (
              <span className={`m4-badge ${currentBonus.isExtremeBonus || currentBonus.isExtreme ? 'm4-badge--extreme' : 'm4-badge--super'}`}>
                {currentBonus.isExtremeBonus || currentBonus.isExtreme ? '⚡ EXTREME' : '★ SUPER'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ═══ BONUS LIST — Auto-scrolling metal rows ═══ */}
      <div className="m4-list" ref={listRef}>
        <div className="m4-list-inner" ref={innerRef}
          style={scrollH > 0 ? { animation: `m4Scroll ${Math.max(bonuses.length * 1.5, 8)}s linear infinite` } : undefined}>
          {[...bonuses, ...bonuses].map((bonus, idx) => {
            const realIdx = idx % bonuses.length;
            const isActive = realIdx === currentIndex;
            const payout = Number(bonus.payout) || 0;
            const bet = Number(bonus.betSize) || 0;
            const multi = bet > 0 ? payout / bet : 0;
            return (
              <div key={`${bonus.id || realIdx}-${idx < bonuses.length ? 'a' : 'b'}`}
                className={`m4-row${isActive ? ' m4-row--active' : ''}${bonus.opened ? ' m4-row--opened' : ''}`}>
                <div className="m4-row-img-wrap">
                  {bonus.slot?.image ? (
                    <img src={bonus.slot.image} alt="" className="m4-row-img"
                      onError={e => { e.target.style.display = 'none'; }} />
                  ) : <div className="m4-row-img-ph" />}
                </div>
                <span className="m4-row-name">{bonus.slotName || bonus.slot?.name}</span>
                <span className="m4-row-bet">{currency}{bet.toFixed(2)}</span>
                {bonus.opened ? (
                  <>
                    <span className="m4-row-multi">{multi.toFixed(1)}x</span>
                    <span className="m4-row-win">{currency}{payout.toFixed(0)}</span>
                  </>
                ) : (
                  <>
                    <span className="m4-row-multi">—</span>
                    <span className="m4-row-win">—</span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ FOOTER — Total payout plate ═══ */}
      <footer className="m4-footer">
        <span className="m4-footer-label">TOTAL PAY</span>
        <span className="m4-footer-value">{fmt(stats.totalWin)}</span>
      </footer>
    </div>
  );
}

export default React.memo(BonusHuntWidgetV4);
