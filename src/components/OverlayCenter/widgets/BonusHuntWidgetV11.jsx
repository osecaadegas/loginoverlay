import React, { useMemo, useState, useEffect, useRef } from 'react';
import { getProviderImage } from '../../../utils/gameProviders';

/**
 * BonusHuntWidgetV11 — "Flip Stats"
 *
 * Combines the V3 3D flip card with full hunt stats:
 *   Header → Stats row → Flip Card → Progress → Total Pay → Best/Worst footer
 *
 * Reuses bht3-* CSS classes from OverlayRenderer.css.
 */
function BonusHuntWidgetV11({ config, theme }) {
  const c = config || {};
  const bonuses = c.bonuses || [];
  const currency = c.currency || '€';
  const startMoney = Number(c.startMoney) || 0;
  const stopLoss = Number(c.stopLoss) || 0;

  /* ─── Style vars ─── */
  const headerColor = c.headerColor || '#0f172a';
  const headerAccent = c.headerAccent || '#818cf8';
  const summaryColor = c.summaryColor || '#0f172a';
  const totalPayColor = c.totalPayColor || '#22c55e';
  const totalPayText = c.totalPayText || '#ffffff';
  const superBadgeColor = c.superBadgeColor || '#eab308';
  const textColor = c.textColor || '#e2e8f0';
  const mutedTextColor = c.mutedTextColor || '#64748b';
  const statValueColor = c.statValueColor || '#f1f5f9';
  const cardOutlineColor = c.cardOutlineColor || 'rgba(99,102,241,0.3)';
  const fontFamily = c.fontFamily || "'Inter', sans-serif";
  const fontSize = c.fontSize ?? 13;
  const cardRadius = c.cardRadius ?? 16;
  const slotImageHeight = c.slotImageHeight ?? 220;
  const spinDuration = c.flipSpinDuration ?? 14;
  const brightness = c.brightness ?? 100;
  const contrast = c.contrast ?? 100;
  const saturation = c.saturation ?? 100;
  const bonusOpening = c.bonusOpening === true;

  /* ─── Derived stats ─── */
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
    const profit = totalWin - target;

    let bestSlot = null, worstSlot = null;
    opened.forEach(b => {
      const bet = Number(b.betSize) || 0;
      const pay = Number(b.payout) || 0;
      const multi = bet > 0 ? pay / bet : 0;
      if (!bestSlot || multi > (bestSlot._multi || 0)) bestSlot = { ...b, _multi: multi, _payout: pay };
      if (!worstSlot || multi < (worstSlot._multi || Infinity)) worstSlot = { ...b, _multi: multi, _payout: pay };
    });

    return { totalBetAll, totalWin, superCount, extremeCount, breakEven, liveBE, avgMulti, openedCount: opened.length, profit, bestSlot, worstSlot };
  }, [bonuses, startMoney, stopLoss]);

  /* ─── Current bonus (first unopened) ─── */
  const currentBonusIdx = bonuses.findIndex(b => !b.opened);
  const huntComplete = bonusOpening && currentBonusIdx === -1 && bonuses.length > 0;

  /* ─── Cycling card index ─── */
  const [displayIdx, setDisplayIdx] = useState(0);
  const [nextIdx, setNextIdx] = useState(1);
  const backRef = useRef(false);
  const animRef = useRef(null);
  const flipRef = useRef(null);

  useEffect(() => {
    if (bonusOpening && currentBonusIdx >= 0) {
      setDisplayIdx(currentBonusIdx);
      setNextIdx(currentBonusIdx);
    }
  }, [bonusOpening, currentBonusIdx]);

  useEffect(() => {
    if ((bonusOpening && !huntComplete) || bonuses.length <= 1) return;
    const dur = spinDuration * 1000;
    const start = performance.now();
    backRef.current = false;

    const tick = (now) => {
      const angle = (((now - start) % dur) / dur) * 360;
      if (flipRef.current) flipRef.current.style.transform = `rotateY(${angle}deg)`;
      const frontHidden = angle > 89 && angle < 271;
      if (frontHidden && !backRef.current) {
        backRef.current = true;
        setDisplayIdx(prev => (prev + 1) % bonuses.length);
      } else if (!frontHidden && backRef.current) {
        backRef.current = false;
        setNextIdx(prev => (prev + 1) % bonuses.length);
      }
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [bonuses.length, spinDuration, bonusOpening, huntComplete]);

  /* ─── Stats footer flip (30s) ─── */
  const [statsFlipped, setStatsFlipped] = useState(false);
  useEffect(() => {
    if (!bonusOpening) { setStatsFlipped(false); return; }
    const id = setInterval(() => setStatsFlipped(f => !f), 30000);
    return () => clearInterval(id);
  }, [bonusOpening]);

  /* ─── Format helpers ─── */
  const fmt = n => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtVol = v => {
    if (!v) return '—';
    return v.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  /* ─── Pick front / back bonus ─── */
  const frontBonus = bonuses.length > 0 ? (bonuses[displayIdx % bonuses.length] || bonuses[0]) : null;
  const backBonus = bonuses.length > 0 ? (bonuses[nextIdx % bonuses.length] || bonuses[0]) : null;

  /* Preload */
  useEffect(() => {
    if (bonuses.length <= 1) return;
    const preload = (src) => { if (src) { const img = new Image(); img.src = src; } };
    preload(bonuses[(displayIdx + 1) % bonuses.length]?.slot?.image);
    preload(bonuses[(nextIdx + 1) % bonuses.length]?.slot?.image);
  }, [displayIdx, nextIdx, bonuses]);

  /* ─── Root CSS variables ─── */
  const rootStyle = {
    fontFamily,
    fontSize: `${fontSize}px`,
    width: '100%',
    height: '100%',
    overflow: 'visible',
    '--bht3-header-bg': headerColor,
    '--bht3-header-accent': headerAccent,
    '--bht3-summary-bg': summaryColor,
    '--bht3-total-pay-bg': totalPayColor,
    '--bht3-total-pay-text': totalPayText,
    '--bht3-super-badge': superBadgeColor,
    '--bht3-text': textColor,
    '--bht3-muted': mutedTextColor,
    '--bht3-stat-value': statValueColor,
    '--bht3-card-outline': cardOutlineColor,
    '--bht3-card-radius': `${cardRadius}px`,
    '--bht3-flip-height': `${slotImageHeight}px`,
    '--bht3-spin-duration': `${spinDuration}s`,
    filter: (brightness !== 100 || contrast !== 100 || saturation !== 100)
      ? `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
      : undefined,
  };

  const pauseFlip = bonusOpening && !huntComplete;

  const getBorderStyle = (bonus) => {
    if (!bonus) return {};
    if (bonus.isExtremeBonus || bonus.isExtreme) return { border: '3px solid rgba(239, 68, 68, 0.85)' };
    if (bonus.isSuperBonus) return { border: '2.5px solid rgba(250, 204, 21, 0.65)' };
    return {};
  };

  const frontBorder = getBorderStyle(frontBonus);
  const backBorder = getBorderStyle(backBonus);
  const frontIsExtreme = !!(frontBonus && (frontBonus.isExtremeBonus || frontBonus.isExtreme));
  const frontIsSuper = !!(frontBonus && frontBonus.isSuperBonus);

  const huntTitle = bonusOpening ? 'BONUS OPENING' : 'BONUS HUNT';
  const progressPct = bonuses.length > 0 ? Math.round((stats.openedCount / bonuses.length) * 100) : 0;

  const renderSlotCard = (slot, type) => {
    if (!slot) return <div className={`bht3-stats-slot bht3-stats-slot--${type} bht3-stats-slot--empty`}>—</div>;
    return (
      <div className={`bht3-stats-slot bht3-stats-slot--${type}`}>
        {slot.slot?.image && (
          <img src={slot.slot.image} alt="" className="bht3-stats-slot-img" onError={e => { e.target.style.display = 'none'; }} />
        )}
        <div className="bht3-stats-slot-info">
          <div className="bht3-stats-slot-pay">{currency}{fmt(slot._payout)}</div>
          <div className="bht3-stats-slot-multi">{slot._multi.toFixed(1)}x</div>
        </div>
      </div>
    );
  };

  return (
    <div className="oc-widget-inner oc-bonushunt bht3-root" style={rootStyle}>

      {/* ═══ Header ═══ */}
      <div className="bht3-header bht3-card">
        <div className="bht3-header-row">
          <div className="bht3-header-left">
            <div className="bht3-icon-circle">🎯</div>
            <div>
              <div className="bht3-title">{huntTitle}</div>
              <div className="bht3-subtitle">{bonuses.length} slots{stats.superCount > 0 ? ` · ${stats.superCount} super` : ''}{stats.extremeCount > 0 ? ` · ${stats.extremeCount} extreme` : ''}</div>
            </div>
          </div>
          <div className="bht3-badge">{stats.openedCount}/{bonuses.length}</div>
        </div>

        {/* Stats row */}
        <div className="bht3-header-stats">
          <div className="bht3-stat">
            <span className="bht3-stat-label">START</span>
            <span className="bht3-stat-val">{currency}{fmt(startMoney)}</span>
          </div>
          <div className="bht3-stat">
            <span className="bht3-stat-label">AVG x</span>
            <span className="bht3-stat-val">{stats.avgMulti.toFixed(2)}x</span>
          </div>
          <div className="bht3-stat">
            <span className="bht3-stat-label">B.E.</span>
            <span className="bht3-stat-val">{stats.liveBE.toFixed(2)}x</span>
          </div>
          <div className="bht3-stat">
            <span className="bht3-stat-label">PAYOUT</span>
            <span className="bht3-stat-val">{currency}{fmt(stats.totalWin)}</span>
          </div>
        </div>
      </div>

      {/* ═══ Flip Card ═══ */}
      {bonuses.length > 0 && (
        <div className="bht3-flip-area">
          <div className={`bht3-flip-container${frontIsExtreme ? ' bht3-trill-active' : ''}`}>
            <div
              className="bht3-flip-inner"
              ref={flipRef}
              style={pauseFlip ? { transform: 'rotateY(0deg)' } : undefined}
            >
              {/* FRONT */}
              <div className="bht3-flip-face bht3-flip-front" style={frontBorder}>
                {frontIsSuper && <div className="bht3-sweep bht3-sweep--gold" />}
                {frontIsExtreme && <div className="bht3-sweep bht3-sweep--red" />}
                {frontIsSuper && <div className="bht3-flip-super-badge">⭐ SUPER</div>}
                {frontIsExtreme && <div className="bht3-flip-extreme-badge">🔥 EXTREME</div>}
                {frontBonus.slot?.image ? (
                  <img src={frontBonus.slot.image} alt={frontBonus.slotName} className="bht3-flip-img"
                    onError={e => { e.target.style.display = 'none'; }} />
                ) : (
                  <div className="bht3-flip-placeholder">🎰</div>
                )}
                <div className="bht3-flip-gradient" />
                <div className="bht3-flip-front-info">
                  {frontBonus.opened ? (
                    <div className="bht3-flip-payout" style={{ fontSize: '15px', fontWeight: 800, color: '#86efac', background: 'rgba(0,0,0,0.8)', padding: '4px 10px', borderRadius: '4px' }}>
                      WIN: {currency}{fmt(frontBonus.payout)}
                    </div>
                  ) : <div />}
                  <div className="bht3-flip-bet" style={{ fontSize: '15px', fontWeight: 800, color: '#fff', background: 'rgba(0,0,0,0.8)', padding: '4px 10px', borderRadius: '4px' }}>{currency}{fmt(frontBonus.betSize)}</div>
                </div>
              </div>

              {/* BACK */}
              <div className="bht3-flip-face bht3-flip-back" style={{
                ...(c.flipBackColor1 || c.flipBackColor2 ? {
                  background: `linear-gradient(155deg, ${c.flipBackColor1 || '#0f172a'} 0%, ${c.flipBackColor2 || '#1a1040'} 40%, ${c.flipBackColor1 || '#0f172a'} 100%)`
                } : {}),
                ...(c.flipBackBorder ? { borderColor: `${c.flipBackBorder}33` } : {}),
                ...backBorder,
              }}>
                <div className="bht3-flip-back-content">
                  {c.flipShowProvider !== false && (
                  <div className="bht3-flip-back-provider-logo">
                    <img
                      src={getProviderImage(backBonus.slot?.provider)}
                      alt={backBonus.slot?.provider || ''}
                      className="bht3-flip-back-provider-img"
                      onError={e => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'inline'; }}
                    />
                    <span className="bht3-flip-back-provider-text" style={{ display: 'none' }}>
                      {backBonus.slot?.provider || 'Unknown'}
                    </span>
                  </div>
                  )}
                  <div className="bht3-flip-back-header">
                    <div className="bht3-flip-back-name">{backBonus.slotName || backBonus.slot?.name}</div>
                  </div>
                  <div className="bht3-flip-back-stats">
                    {c.flipShowRTP !== false && (
                    <div className="bht3-flip-back-stat">
                      <span className="bht3-flip-back-stat-icon">📈</span>
                      <span className="bht3-flip-back-stat-label">RTP</span>
                      <span className="bht3-flip-back-stat-val">
                        {backBonus.slot?.rtp ? `${Number(backBonus.slot.rtp).toFixed(2)}%` : '—'}
                      </span>
                    </div>
                    )}
                    {c.flipShowPotential !== false && (
                    <div className="bht3-flip-back-stat">
                      <span className="bht3-flip-back-stat-icon">🏅</span>
                      <span className="bht3-flip-back-stat-label">MAX WIN</span>
                      <span className="bht3-flip-back-stat-val">
                        {backBonus.slot?.max_win_multiplier
                          ? `${Number(backBonus.slot.max_win_multiplier).toLocaleString()}x`
                          : '—'}
                      </span>
                    </div>
                    )}
                    {c.flipShowVolatility !== false && (
                    <div className="bht3-flip-back-stat">
                      <span className="bht3-flip-back-stat-icon">⚡</span>
                      <span className="bht3-flip-back-stat-label">VOLATILITY</span>
                      <span className="bht3-flip-back-stat-val">
                        {fmtVol(backBonus.slot?.volatility)}
                      </span>
                    </div>
                    )}
                    {c.flipShowBetSize !== false && (
                    <div className="bht3-flip-back-stat">
                      <span className="bht3-flip-back-stat-icon">💰</span>
                      <span className="bht3-flip-back-stat-label">BET SIZE</span>
                      <span className="bht3-flip-back-stat-val">
                        {currency}{fmt(backBonus.betSize)}
                      </span>
                    </div>
                    )}
                  </div>
                  {c.flipShowWin !== false && backBonus.opened && (
                    <div className="bht3-flip-back-result">
                      <span>WIN: {currency}{fmt(backBonus.payout)}</span>
                      <span className="bht3-flip-back-multi">
                        {((Number(backBonus.payout) || 0) / (Number(backBonus.betSize) || 1)).toFixed(1)}x
                      </span>
                    </div>
                  )}
                  <div className="bht3-flip-back-num">#{(nextIdx % bonuses.length) + 1} / {bonuses.length}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Summary ═══ */}
      <div className="bht3-summary bht3-card">
        {/* Progress bar */}
        <div className="bh11-progress">
          <div className="bh11-progress-bar">
            <div className="bh11-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="bh11-progress-text">{stats.openedCount}/{bonuses.length} ({progressPct}%)</span>
        </div>

        {/* Total pay */}
        <div className="bht3-total-pay">
          <span className="bht3-total-label">TOTAL PAY</span>
          <span className="bht3-total-val">{currency}{fmt(stats.totalWin)}</span>
        </div>

        {/* Best / Worst footer — flips every 30s during opening */}
        <div className="bht3-stats-footer">
          <div className={`bht3-stats-flipper${statsFlipped ? ' bht3-stats-flipper--flipped' : ''}`}>
            {/* Front: stats row */}
            <div className="bht3-stats-face bht3-stats-front">
              <div className="bht3-stats-item">
                <span className="bht3-stats-label">B.E. INI</span>
                <span className="bht3-stats-value">{stats.breakEven.toFixed(2)}x</span>
              </div>
              <div className="bht3-stats-item">
                <span className="bht3-stats-label">B.E. LIVE</span>
                <span className="bht3-stats-value">{stats.liveBE.toFixed(2)}x</span>
              </div>
              <div className="bht3-stats-item">
                <span className="bht3-stats-label">PROFIT</span>
                <span className="bht3-stats-value" style={{ color: stats.profit >= 0 ? '#4ade80' : '#f87171' }}>
                  {stats.profit >= 0 ? '+' : ''}{currency}{fmt(Math.abs(stats.profit))}
                </span>
              </div>
            </div>
            {/* Back: best & worst */}
            <div className="bht3-stats-face bht3-stats-back">
              {renderSlotCard(stats.bestSlot, 'best')}
              {renderSlotCard(stats.worstSlot, 'worst')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(BonusHuntWidgetV11);
