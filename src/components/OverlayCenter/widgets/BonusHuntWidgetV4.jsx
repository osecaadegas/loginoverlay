import React, { useMemo } from 'react';

/**
 * BonusHuntWidgetV4 — "Neon Command HUD"
 *
 * Cyberpunk heads-up display: CRT scanlines, glitch title,
 * angled clip-path stat panels, rotating target-lock rings around
 * the current bonus, SVG circular progress arc, horizontal
 * auto-scrolling data stream, and a neon power-meter footer.
 *
 * NOTHING in common with any other BH style layout.
 */
function BonusHuntWidgetV4({ config, theme }) {
  const c = config || {};
  const bonuses = c.bonuses || [];
  const currency = c.currency || '€';
  const startMoney = Number(c.startMoney) || 0;
  const stopLoss = Number(c.stopLoss) || 0;

  const neon1 = c.headerAccent || '#00ffcc';
  const neon2 = c.currentBonusAccent || '#7b61ff';
  const neon3 = c.listCardAccent || '#ff3cac';
  const totalPayColor = c.totalPayColor || '#00ffcc';
  const superBadgeColor = c.superBadgeColor || '#eab308';
  const extremeBadgeColor = c.extremeBadgeColor || '#ef4444';
  const textColor = c.textColor || '#e8e8f8';
  const mutedTextColor = c.mutedTextColor || '#6679a4';
  const fontFamily = c.fontFamily || "'Inter', 'Consolas', monospace";
  const fontSize = c.fontSize ?? 13;
  const cardGap = c.cardGap ?? 10;
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
    const superCount = bonuses.filter(b => b.isSuperBonus).length;
    const extremeCount = bonuses.filter(b => b.isExtremeBonus || b.isExtreme).length;
    const target = Math.max(startMoney - stopLoss, 0);
    const breakEven = totalBetAll > 0 ? target / totalBetAll : 0;
    const remaining = Math.max(target - totalWin, 0);
    const liveBE = totalBetRemaining > 0 ? remaining / totalBetRemaining : 0;
    const avgMulti = totalBetOpened > 0 ? totalWin / totalBetOpened : 0;
    return { totalBetAll, totalWin, superCount, extremeCount, breakEven, liveBE, avgMulti, openedCount: opened.length };
  }, [bonuses, startMoney, stopLoss]);

  const currentBonus = bonuses.find(b => !b.opened);
  const currentIndex = currentBonus ? bonuses.indexOf(currentBonus) : -1;
  const progressPct = bonuses.length > 0 ? (stats.openedCount / bonuses.length) * 100 : 0;
  const profit = stats.totalWin - startMoney;

  const fmt = (v) => `${currency}${v.toFixed(2)}`;
  const fmtX = (v) => (!Number.isFinite(v) || v <= 0) ? '0.00x' : `${v.toFixed(2)}x`;

  /* SVG circular arc helpers */
  const R = 38;
  const C = 2 * Math.PI * R;
  const progressOffset = C - (C * progressPct) / 100;

  /* Power meter: totalWin / startMoney capped at 200% */
  const powerPct = startMoney > 0 ? Math.min((stats.totalWin / startMoney) * 100, 200) : 0;

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
    '--v4-neon1': neon1,
    '--v4-neon2': neon2,
    '--v4-neon3': neon3,
    '--v4-text': textColor,
    '--v4-muted': mutedTextColor,
    '--v4-total-pay': totalPayColor,
    '--v4-super': superBadgeColor,
    '--v4-extreme': extremeBadgeColor,
  };

  return (
    <div className="oc-widget-inner bht4-root" style={rootStyle}>
      {/* CRT scanline overlay */}
      <div className="bht4-scanlines" aria-hidden="true" />

      {/* ═══ HEADER — Glitch title + live indicator ═══ */}
      <header className="bht4-header">
        <div className="bht4-header-left">
          {c.avatarUrl && (
            <img src={c.avatarUrl} alt="" className="bht4-avatar"
              onError={e => { e.target.style.display = 'none'; }} />
          )}
          <span className="bht4-glitch" data-text={huntTitle}>{huntTitle}</span>
        </div>
        <div className="bht4-header-right">
          <div className="bht4-live-pip" />
          <span className="bht4-live-tag">{bonusOpening ? 'OPENING' : 'COLLECTING'}</span>
          <span className="bht4-slot-count">{bonuses.length} SLOTS</span>
        </div>
      </header>

      {/* ═══ CENTER: Ring + Target + Stats inline ═══ */}
      <section className="bht4-center">
        {/* SVG circular progress ring */}
        <div className="bht4-ring-wrap">
          <svg className="bht4-ring-svg" viewBox="0 0 90 90">
            <circle cx="45" cy="45" r={R} className="bht4-ring-track" />
            <circle cx="45" cy="45" r={R}
              className="bht4-ring-fill"
              style={{ strokeDasharray: C, strokeDashoffset: progressOffset }} />
          </svg>
          <div className="bht4-ring-center">
            <span className="bht4-ring-pct">{Math.round(progressPct)}%</span>
            <span className="bht4-ring-sub">{stats.openedCount}/{bonuses.length}</span>
          </div>
          {/* Rotating target lock rings */}
          <div className="bht4-lockring bht4-lockring--a" />
          <div className="bht4-lockring bht4-lockring--b" />
        </div>

        {/* Current bonus card */}
        {currentBonus ? (
          <div className="bht4-target-card">
            <div className="bht4-target-label">
              <span className="bht4-target-icon">◎</span> TARGET ACQUIRED
              <span className="bht4-target-idx">#{currentIndex + 1}</span>
            </div>
            <div className="bht4-target-body">
              <div className="bht4-target-img-wrap">
                {currentBonus.slot?.image ? (
                  <img src={currentBonus.slot.image} alt={currentBonus.slotName}
                    className="bht4-target-img"
                    onError={e => { e.target.style.display = 'none'; }} />
                ) : (
                  <div className="bht4-target-img-ph">🎰</div>
                )}
                <div className="bht4-target-img-scanline" />
              </div>
              <div className="bht4-target-info">
                <div className="bht4-target-name">{currentBonus.slotName || currentBonus.slot?.name}</div>
                {currentBonus.slot?.provider && (
                  <div className="bht4-target-provider">{currentBonus.slot.provider}</div>
                )}
                <div className="bht4-target-stats">
                  <div className="bht4-ts">
                    <span className="bht4-ts-label">BET</span>
                    <span className="bht4-ts-val">{fmt(Number(currentBonus.betSize) || 0)}</span>
                  </div>
                  <div className="bht4-ts">
                    <span className="bht4-ts-label">WIN</span>
                    <span className="bht4-ts-val bht4-ts-val--win">{fmt(Number(currentBonus.payout) || 0)}</span>
                  </div>
                  <div className="bht4-ts">
                    <span className="bht4-ts-label">MULTI</span>
                    <span className="bht4-ts-val">
                      {(() => {
                        const b = Number(currentBonus.betSize) || 0;
                        const p = Number(currentBonus.payout) || 0;
                        return b > 0 ? fmtX(p / b) : '0.00x';
                      })()}
                    </span>
                  </div>
                </div>
                {(currentBonus.isSuperBonus || currentBonus.isExtremeBonus || currentBonus.isExtreme) && (
                  <span className={`bht4-type-badge ${currentBonus.isExtremeBonus || currentBonus.isExtreme ? 'bht4-type-badge--extreme' : 'bht4-type-badge--super'}`}>
                    {currentBonus.isExtremeBonus || currentBonus.isExtreme ? '⚡ EXTREME' : '★ SUPER'}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bht4-target-card bht4-target-card--empty">
            <span className="bht4-target-empty">ALL BONUSES OPENED</span>
          </div>
        )}

        {/* Stats stacked vertically on the right */}
        <div className="bht4-side-stats">
          {[
            { label: 'START', value: fmt(startMoney), color: neon1 },
            { label: 'B.EVEN', value: fmtX(stats.breakEven), color: stats.breakEven >= 1 ? '#4ade80' : '#f87171' },
            { label: 'AVG X', value: fmtX(stats.avgMulti), color: stats.avgMulti >= 1 ? '#4ade80' : '#f87171' },
            { label: 'PROFIT', value: (profit >= 0 ? '+' : '') + fmt(profit), color: profit >= 0 ? '#4ade80' : '#f87171' },
          ].map((s, i) => (
            <div key={i} className="bht4-side-stat">
              <span className="bht4-side-stat-label">{s.label}</span>
              <span className="bht4-side-stat-value" style={{ color: s.color }}>{s.value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Badge row */}
      {(stats.superCount > 0 || stats.extremeCount > 0) && (
        <div className="bht4-badge-row">
          {stats.superCount > 0 && (
            <span className="bht4-hud-badge bht4-hud-badge--super">★ SUPER ×{stats.superCount}</span>
          )}
          {stats.extremeCount > 0 && (
            <span className="bht4-hud-badge bht4-hud-badge--extreme">⚡ EXTREME ×{stats.extremeCount}</span>
          )}
        </div>
      )}

      {/* ═══ DATA STREAM — Horizontal auto-scrolling card ribbon ═══ */}
      {bonuses.length > 0 && (
        <section className="bht4-stream">
          <div className="bht4-stream-label">
            <span className="bht4-stream-arrow">▸▸▸</span> DATA STREAM
          </div>
          <div className="bht4-stream-viewport">
            <div className="bht4-stream-track" style={{ '--bht4-count': bonuses.length }}>
              {[...bonuses, ...bonuses].map((bonus, i) => {
                const idx = i % bonuses.length;
                const isActive = idx === currentIndex;
                const payout = Number(bonus.payout) || 0;
                const bet = Number(bonus.betSize) || 0;
                const multi = bet > 0 ? payout / bet : 0;
                const isExtreme = bonus.isExtremeBonus || bonus.isExtreme;
                const isSuper = bonus.isSuperBonus;
                return (
                  <div key={`v4s-${bonus.id || idx}-${i >= bonuses.length ? 'c' : 'o'}`}
                    className={`bht4-stream-card${isActive ? ' bht4-stream-card--active' : ''}${bonus.opened ? ' bht4-stream-card--opened' : ''}${isSuper ? ' bht4-stream-card--super' : ''}${isExtreme ? ' bht4-stream-card--extreme' : ''}`}>
                    {/* Full-bleed background image */}
                    {bonus.slot?.image ? (
                      <img src={bonus.slot.image} alt="" className="bht4-sc-bg-img"
                        onError={e => { e.target.style.display = 'none'; }} />
                    ) : (
                      <div className="bht4-sc-bg-ph" />
                    )}
                    <div className="bht4-sc-overlay">
                      <div className="bht4-sc-top">
                        <span className="bht4-sc-idx">#{idx + 1}</span>
                        {isSuper && <span className="bht4-sc-badge" style={{ color: superBadgeColor }}>★</span>}
                        {isExtreme && <span className="bht4-sc-badge" style={{ color: extremeBadgeColor }}>⚡</span>}
                      </div>
                      <div className="bht4-sc-bottom">
                        <span className="bht4-sc-name">{bonus.slotName || bonus.slot?.name}</span>
                        <span className="bht4-sc-bet">{currency}{bet.toFixed(2)}</span>
                        {bonus.opened && (
                          <div className="bht4-sc-result">
                            <span className="bht4-sc-multi">{multi.toFixed(1)}x</span>
                            <span className="bht4-sc-win">{currency}{payout.toFixed(0)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ═══ POWER METER — Neon total payout ═══ */}
      <footer className="bht4-power">
        <div className="bht4-power-label">TOTAL PAYOUT</div>
        <div className="bht4-power-bar">
          <div className="bht4-power-fill" style={{ width: `${Math.min(powerPct, 100)}%` }} />
          <div className="bht4-power-text">{fmt(stats.totalWin)}</div>
        </div>
      </footer>
    </div>
  );
}

export default React.memo(BonusHuntWidgetV4);
