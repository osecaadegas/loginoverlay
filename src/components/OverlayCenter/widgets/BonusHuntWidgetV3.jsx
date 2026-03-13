import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { getProviderImage } from '../../../utils/gameProviders';

/**
 * BonusHuntWidgetV3 — Style 3: Flip Card
 *
 * A single 3D-rotating card that cycles through each bonus in the hunt.
 * FRONT = slot image + name + bet.
 * BACK  = provider, RTP, Max Win, Volatility.
 *
 * The card spins slowly on Y-axis (one full rotation = ~8s default).
 * When the front becomes invisible (90°-270°), the data swaps to the next
 * bonus so the viewer never sees the transition.
 *
 * Uses plain CSS classes (bht3-*) in OverlayRenderer.css — no styled-components.
 */
function BonusHuntWidgetV3({ config, theme }) {
  const c = config || {};
  const bonuses = c.bonuses || [];
  const currency = c.currency || '€';
  const startMoney = Number(c.startMoney) || 0;
  const stopLoss = Number(c.stopLoss) || 0;

  /* ─── Customisable style vars ─── */
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
  const widgetWidth = c.widgetWidth ?? 420;
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
    const extremeCount = bonuses.filter(b => b.isExtreme).length;
    const target = Math.max(startMoney - stopLoss, 0);
    const breakEven = totalBetAll > 0 ? target / totalBetAll : 0;
    const remaining = Math.max(target - totalWin, 0);
    const liveBE = totalBetRemaining > 0 ? remaining / totalBetRemaining : 0;
    const avgMulti = totalBetOpened > 0 ? totalWin / totalBetOpened : 0;

    /* Best & worst opened slot by multiplier */
    let bestSlot = null, worstSlot = null;
    for (const b of opened) {
      const pay = Number(b.payout) || 0;
      const multi = (Number(b.betSize) || 0) > 0 ? pay / Number(b.betSize) : 0;
      if (!bestSlot || multi > (bestSlot._multi || 0)) bestSlot = { ...b, _multi: multi, _payout: pay };
      if (!worstSlot || multi < (worstSlot._multi || Infinity)) worstSlot = { ...b, _multi: multi, _payout: pay };
    }

    return { totalBetAll, totalWin, superCount, extremeCount, breakEven, liveBE, avgMulti, openedCount: opened.length, bestSlot, worstSlot };
  }, [bonuses, startMoney, stopLoss]);

  /* ─── Current bonus (first unopened) ─── */
  const currentBonus = bonuses.find(b => !b.opened);
  const currentBonusIdx = bonuses.findIndex(b => !b.opened);
  const huntComplete = bonusOpening && currentBonusIdx === -1 && bonuses.length > 0;

  /* ─── Stats footer flip (30s) ─── */
  const [statsFlipped, setStatsFlipped] = useState(false);
  useEffect(() => {
    if (stats.openedCount === 0) { setStatsFlipped(false); return; }
    const id = setInterval(() => setStatsFlipped(f => !f), 30000);
    return () => clearInterval(id);
  }, [stats.openedCount]);

  /* ─── Cycling card index ─── */
  const [displayIdx, setDisplayIdx] = useState(0);
  const [nextIdx, setNextIdx] = useState(1);
  const backRef = useRef(false);
  const animRef = useRef(null);
  const flipRef = useRef(null);

  /* When bonusOpening is ON → lock displayIdx to the current bonus. */
  useEffect(() => {
    if (bonusOpening && currentBonusIdx >= 0) {
      setDisplayIdx(currentBonusIdx);
      setNextIdx(currentBonusIdx);
    }
  }, [bonusOpening, currentBonusIdx]);

  /* JS-driven flip — continuous smooth rotation, data swaps at edge-on (90°/270°). */
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

  /* ─── Format helpers ─── */
  const fmt = n => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtVol = v => {
    if (!v) return '—';
    return v.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  /* ─── Pick data for front / back ─── */
  const frontBonus = bonuses[displayIdx % bonuses.length] || bonuses[0];
  /* Back shows the NEXT slot — user sees slot name + stats when card flips */
  const backBonus = bonuses[nextIdx % bonuses.length] || bonuses[0];

  /* ─── Preload upcoming images so swap is seamless ─── */
  useEffect(() => {
    if (bonuses.length <= 1) return;
    const preload = (src) => { if (src) { const img = new Image(); img.src = src; } };
    preload(bonuses[(displayIdx + 1) % bonuses.length]?.slot?.image);
    preload(bonuses[(nextIdx + 1) % bonuses.length]?.slot?.image);
  }, [displayIdx, nextIdx, bonuses]);

  /* ─── Root CSS variables for theming ─── */
  const rootStyle = {
    fontFamily,
    fontSize: `${fontSize}px`,
    width: '100%',
    height: '100%',
    overflow: 'hidden auto',
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

  /* Whether to pause the JS flip */
  const pauseFlip = bonusOpening && !huntComplete;

  return (
    <div className="oc-widget-inner oc-bonushunt bht3-root" style={rootStyle}>

      {/* ═══ Flip Card Carousel ═══ */}
      {bonuses.length > 0 && (
        <div className="bht3-flip-area">
          <div className="bht3-flip-container">
            <div className="bht3-flip-inner" ref={flipRef} style={pauseFlip ? { transform: 'rotateY(0deg)' } : undefined}>
              {/* FRONT — Slot Image */}
              <div className="bht3-flip-face bht3-flip-front">
                {frontBonus.isSuperBonus && <div className="bht3-flip-super-badge">⭐ SUPER</div>}
                {frontBonus.isExtreme && <div className="bht3-flip-extreme-badge">🔥 EXTREME</div>}
                {frontBonus.slot?.image ? (
                  <img src={frontBonus.slot.image} alt={frontBonus.slotName} className="bht3-flip-img"
                    onError={e => { e.target.style.display = 'none'; }} />
                ) : (
                  <div className="bht3-flip-placeholder">🎰</div>
                )}
                <div className="bht3-flip-gradient" />
                <div className="bht3-flip-front-info">
                  <div className="bht3-flip-slot-name">{frontBonus.slotName || frontBonus.slot?.name}</div>
                  <div className="bht3-flip-bet">{currency}{fmt(frontBonus.betSize)}</div>
                  {frontBonus.opened && (
                    <div className="bht3-flip-payout">
                      WIN: {currency}{fmt(frontBonus.payout)}
                      <span className="bht3-flip-multi">
                        {((Number(frontBonus.payout) || 0) / (Number(frontBonus.betSize) || 1)).toFixed(1)}x
                      </span>
                    </div>
                  )}
                  <div className="bht3-flip-num">#{(displayIdx % bonuses.length) + 1} / {bonuses.length}</div>
                </div>
              </div>

              {/* BACK — Stats & Provider Info */}
              <div className="bht3-flip-face bht3-flip-back" style={{
                ...(c.flipBackColor1 || c.flipBackColor2 ? {
                  background: `linear-gradient(155deg, ${c.flipBackColor1 || '#0f172a'} 0%, ${c.flipBackColor2 || '#1a1040'} 40%, ${c.flipBackColor1 || '#0f172a'} 100%)`
                } : {}),
                ...(c.flipBackBorder ? { borderColor: `${c.flipBackBorder}33` } : {}),
              }}>
                <div className="bht3-flip-back-content">
                  {c.flipShowProvider !== false && (
                  <div className="bht3-flip-back-provider-logo">
                    <img
                      src={getProviderImage(backBonus.slot?.provider)}
                      alt={backBonus.slot?.provider || ''}
                      className="bht3-flip-back-provider-img"
                      onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'inline'; }}
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
      {/* ═══ Stats Footer with 30s flip ═══ */}
      <div className="bht3-stats-footer">
        <div className={`bht3-stats-flipper${statsFlipped ? ' bht3-stats-flipper--flipped' : ''}`}>
          {/* FRONT: Hunt stats */}
          <div className="bht3-stats-face bht3-stats-front">
            <div className="bht3-stats-item">
              <span className="bht3-stats-label">START</span>
              <span className="bht3-stats-value">{currency}{fmt(startMoney)}</span>
            </div>
            <div className="bht3-stats-item">
              <span className="bht3-stats-label">B.E.</span>
              <span className="bht3-stats-value" style={{ color: stats.liveBE >= 100 ? '#f87171' : '#4ade80' }}>{stats.liveBE.toFixed(1)}x</span>
            </div>
            <div className="bht3-stats-item">
              <span className="bht3-stats-label">AVG</span>
              <span className="bht3-stats-value" style={{ color: stats.avgMulti >= 1 ? '#4ade80' : '#f87171' }}>{stats.avgMulti.toFixed(1)}x</span>
            </div>
            <div className="bht3-stats-item">
              <span className="bht3-stats-label">TOTAL</span>
              <span className="bht3-stats-value" style={{ color: '#22c55e' }}>{currency}{fmt(stats.totalWin)}</span>
            </div>
          </div>
          {/* BACK: Best / Worst slot */}
          <div className="bht3-stats-face bht3-stats-back">
            {stats.bestSlot ? (
              <div className="bht3-stats-slot bht3-stats-slot--best">
                {stats.bestSlot.slot?.image && (
                  <img src={stats.bestSlot.slot.image} alt="" className="bht3-stats-slot-img"
                    onError={e => { e.target.style.display = 'none'; }} />
                )}
                <div className="bht3-stats-slot-info">
                  <span className="bht3-stats-slot-pay">{currency}{fmt(stats.bestSlot._payout)}</span>
                  <span className="bht3-stats-slot-multi">{stats.bestSlot._multi.toFixed(1)}x</span>
                </div>
              </div>
            ) : (
              <div className="bht3-stats-slot bht3-stats-slot--empty"><span>—</span></div>
            )}
            {stats.worstSlot ? (
              <div className="bht3-stats-slot bht3-stats-slot--worst">
                {stats.worstSlot.slot?.image && (
                  <img src={stats.worstSlot.slot.image} alt="" className="bht3-stats-slot-img"
                    onError={e => { e.target.style.display = 'none'; }} />
                )}
                <div className="bht3-stats-slot-info">
                  <span className="bht3-stats-slot-pay">{currency}{fmt(stats.worstSlot._payout)}</span>
                  <span className="bht3-stats-slot-multi">{stats.worstSlot._multi.toFixed(1)}x</span>
                </div>
              </div>
            ) : (
              <div className="bht3-stats-slot bht3-stats-slot--empty"><span>—</span></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(BonusHuntWidgetV3);
