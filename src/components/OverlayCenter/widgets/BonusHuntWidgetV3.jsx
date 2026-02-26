import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';

/**
 * BonusHuntWidgetV3 — Style 3: Flip Card
 *
 * A single 3D-rotating card that cycles through each bonus in the hunt.
 * FRONT = slot image + name + bet.
 * BACK  = provider, RTP, Max Win, Volatility.
 *
 * The card spins slowly on Y-axis (one full rotation = ~6s).
 * When the front becomes invisible (between 90°-270°), the data swaps to
 * the next bonus so the viewer never sees the transition.
 */
export default function BonusHuntWidgetV3({ config, theme }) {
  const c = config || {};
  const bonuses = c.bonuses || [];
  const currency = c.currency || '€';
  const startMoney = Number(c.startMoney) || 0;
  const stopLoss = Number(c.stopLoss) || 0;

  /* ─── Customisable style vars ─── */
  const headerColor = c.headerColor || '#0f172a';
  const headerAccent = c.headerAccent || '#818cf8';
  const cardBg = c.listCardColor || '#0f172a';
  const cardAccent = c.listCardAccent || '#a78bfa';
  const summaryColor = c.summaryColor || '#0f172a';
  const totalPayColor = c.totalPayColor || '#22c55e';
  const totalPayText = c.totalPayText || '#ffffff';
  const superBadgeColor = c.superBadgeColor || '#eab308';
  const extremeBadgeColor = c.extremeBadgeColor || '#ef4444';
  const textColor = c.textColor || '#e2e8f0';
  const mutedTextColor = c.mutedTextColor || '#64748b';
  const statValueColor = c.statValueColor || '#f1f5f9';
  const cardOutlineColor = c.cardOutlineColor || 'rgba(99,102,241,0.3)';
  const fontFamily = c.fontFamily || "'Inter', sans-serif";
  const fontSize = c.fontSize ?? 13;
  const widgetWidth = c.widgetWidth ?? 420;
  const cardRadius = c.cardRadius ?? 16;
  const slotImageHeight = c.slotImageHeight ?? 220;
  const spinDuration = c.flipSpinDuration ?? 8; // seconds per full rotation
  const brightness = c.brightness ?? 100;
  const contrast = c.contrast ?? 100;
  const saturation = c.saturation ?? 100;

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
    return { totalBetAll, totalWin, superCount, extremeCount, breakEven, liveBE, avgMulti, openedCount: opened.length };
  }, [bonuses, startMoney, stopLoss]);

  /* ─── Current bonus (first unopened) ─── */
  const currentBonus = bonuses.find(b => !b.opened);
  const currentIndex = currentBonus ? bonuses.indexOf(currentBonus) : -1;

  /* ─── Cycling card index ─── */
  const [displayIdx, setDisplayIdx] = useState(0);
  const [nextIdx, setNextIdx] = useState(1);
  // We track which "face" is currently visible to the viewer
  // false = front is visible, true = back is visible
  const [backVisible, setBackVisible] = useState(false);
  const animRef = useRef(null);
  const cardRef = useRef(null);

  // Cycle to next bonus when the invisible side is facing the viewer
  const advanceBonus = useCallback(() => {
    if (bonuses.length <= 1) return;
    setDisplayIdx(prev => {
      const next = (prev + 1) % bonuses.length;
      return next;
    });
    setNextIdx(prev => {
      const next = (prev + 1) % bonuses.length;
      return next;
    });
  }, [bonuses.length]);

  // Watch the card's rotation angle to detect when each face is hidden
  useEffect(() => {
    if (bonuses.length <= 1) return;
    const dur = spinDuration * 1000; // ms
    let lastSwap = 0;
    let startTime = performance.now();

    const tick = (now) => {
      const elapsed = (now - startTime) % dur;
      const angle = (elapsed / dur) * 360;
      // Front is hidden between 90°-270°. Swap at ~180° (midpoint of back-facing).
      const isFrontHidden = angle > 90 && angle < 270;

      if (isFrontHidden && !backVisible) {
        setBackVisible(true);
        // Swap the FRONT data while it's hidden
        setDisplayIdx(prev => (prev + 1) % bonuses.length);
      } else if (!isFrontHidden && backVisible) {
        setBackVisible(false);
        // Swap the BACK data while it's hidden
        setNextIdx(prev => (prev + 1) % bonuses.length);
      }

      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [bonuses.length, spinDuration, backVisible]);

  /* ─── Format helpers ─── */
  const fmt = n => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const fmtVol = v => {
    if (!v) return '—';
    return v.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  /* ─── Pick data for front / back ─── */
  const frontBonus = bonuses[displayIdx % bonuses.length] || bonuses[0];
  const backBonus = bonuses[nextIdx % bonuses.length] || bonuses[0];

  if (!c.huntActive && bonuses.length === 0) {
    return (
      <div className="oc-widget-inner oc-bonushunt">
        <p className="oc-widget-empty">No active bonus hunt</p>
      </div>
    );
  }

  return (
    <Wrapper
      $fontFamily={fontFamily}
      $fontSize={fontSize}
      $width={widgetWidth}
      $brightness={brightness}
      $contrast={contrast}
      $saturation={saturation}
      $headerColor={headerColor}
      $headerAccent={headerAccent}
      $cardBg={cardBg}
      $cardAccent={cardAccent}
      $summaryColor={summaryColor}
      $totalPayColor={totalPayColor}
      $totalPayText={totalPayText}
      $textColor={textColor}
      $mutedColor={mutedTextColor}
      $statValueColor={statValueColor}
      $cardOutline={cardOutlineColor}
      $cardRadius={cardRadius}
      $superBadge={superBadgeColor}
      $extremeBadge={extremeBadgeColor}
    >
      {/* ═══ Header ═══ */}
      <div className="v3-card v3-header">
        <div className="v3-header-row">
          <div className="v3-header-left">
            <div className="v3-icon-circle">🎰</div>
            <div>
              <div className="v3-title">BONUS HUNT</div>
              <div className="v3-subtitle">{c.huntName || ''}</div>
            </div>
          </div>
          <span className="v3-badge">#{bonuses.length}</span>
        </div>
        <div className="v3-header-stats">
          <div className="v3-stat">
            <span className="v3-stat-label">START</span>
            <span className="v3-stat-val">{currency}{fmt(startMoney)}</span>
          </div>
          <div className="v3-stat">
            <span className="v3-stat-label">BEx</span>
            <span className="v3-stat-val">{stats.breakEven.toFixed(2)}x</span>
          </div>
          <div className="v3-stat">
            <span className="v3-stat-label">BONUSES</span>
            <span className="v3-stat-val">{bonuses.length}</span>
          </div>
          <div className="v3-stat">
            <span className="v3-stat-label">SUPER</span>
            <span className="v3-stat-val" style={{ color: superBadgeColor }}>{stats.superCount}</span>
          </div>
        </div>
      </div>

      {/* ═══ Current Bonus ═══ */}
      {currentBonus && (
        <div className="v3-card v3-current">
          <div className="v3-current-label">▶ NOW PLAYING</div>
          <div className="v3-current-row">
            {currentBonus.slot?.image && (
              <img src={currentBonus.slot.image} alt="" className="v3-current-img"
                onError={e => { e.target.style.display = 'none'; }} />
            )}
            <div className="v3-current-info">
              <div className="v3-current-name">{currentBonus.slotName}</div>
              <div className="v3-current-bet">{currency}{fmt(currentBonus.betSize)} BET</div>
              {currentBonus.slot?.provider && (
                <div className="v3-current-provider">{currentBonus.slot.provider}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Flip Card Carousel ═══ */}
      {bonuses.length > 0 && (
        <div className="v3-flip-area">
          <FlipContainer $duration={spinDuration} $radius={cardRadius} $imgHeight={slotImageHeight} ref={cardRef}>
            <div className="flip-inner">
              {/* FRONT — Slot Image */}
              <div className="flip-face flip-front">
                {frontBonus.isSuperBonus && <div className="flip-super-badge">⭐ SUPER</div>}
                {frontBonus.isExtreme && <div className="flip-extreme-badge">🔥 EXTREME</div>}
                {frontBonus.slot?.image ? (
                  <img src={frontBonus.slot.image} alt={frontBonus.slotName} className="flip-img"
                    onError={e => { e.target.style.display = 'none'; }} />
                ) : (
                  <div className="flip-placeholder">🎰</div>
                )}
                <div className="flip-gradient" />
                <div className="flip-front-info">
                  <div className="flip-slot-name">{frontBonus.slotName || frontBonus.slot?.name}</div>
                  <div className="flip-bet">{currency}{fmt(frontBonus.betSize)}</div>
                  {frontBonus.opened && (
                    <div className="flip-payout">
                      WIN: {currency}{fmt(frontBonus.payout)}
                      <span className="flip-multi">
                        {((Number(frontBonus.payout) || 0) / (Number(frontBonus.betSize) || 1)).toFixed(1)}x
                      </span>
                    </div>
                  )}
                  <div className="flip-num">#{(displayIdx % bonuses.length) + 1} / {bonuses.length}</div>
                </div>
              </div>

              {/* BACK — Stats & Provider Info */}
              <div className="flip-face flip-back">
                <div className="flip-back-content">
                  <div className="flip-back-header">
                    <div className="flip-back-name">{backBonus.slotName || backBonus.slot?.name}</div>
                    <div className="flip-back-provider">{backBonus.slot?.provider || 'Unknown'}</div>
                  </div>
                  <div className="flip-back-stats">
                    <div className="flip-back-stat">
                      <span className="flip-back-stat-label">RTP</span>
                      <span className="flip-back-stat-val">
                        {backBonus.slot?.rtp ? `${Number(backBonus.slot.rtp).toFixed(2)}%` : '—'}
                      </span>
                    </div>
                    <div className="flip-back-stat">
                      <span className="flip-back-stat-label">MAX WIN</span>
                      <span className="flip-back-stat-val">
                        {backBonus.slot?.max_win_multiplier
                          ? `${Number(backBonus.slot.max_win_multiplier).toLocaleString()}x`
                          : '—'}
                      </span>
                    </div>
                    <div className="flip-back-stat">
                      <span className="flip-back-stat-label">VOLATILITY</span>
                      <span className="flip-back-stat-val">
                        {fmtVol(backBonus.slot?.volatility)}
                      </span>
                    </div>
                    <div className="flip-back-stat">
                      <span className="flip-back-stat-label">BET SIZE</span>
                      <span className="flip-back-stat-val">
                        {currency}{fmt(backBonus.betSize)}
                      </span>
                    </div>
                  </div>
                  {backBonus.opened && (
                    <div className="flip-back-result">
                      <span>WIN: {currency}{fmt(backBonus.payout)}</span>
                      <span className="flip-back-multi">
                        {((Number(backBonus.payout) || 0) / (Number(backBonus.betSize) || 1)).toFixed(1)}x
                      </span>
                    </div>
                  )}
                  <div className="flip-back-num">#{(nextIdx % bonuses.length) + 1} / {bonuses.length}</div>
                </div>
              </div>
            </div>
          </FlipContainer>
        </div>
      )}

      {/* ═══ Summary ═══ */}
      {c.showStatistics !== false && (
        <div className="v3-card v3-summary">
          <div className="v3-summary-row">
            <div className="v3-stat">
              <span className="v3-stat-label">OPENED</span>
              <span className="v3-stat-val">{stats.openedCount}/{bonuses.length}</span>
            </div>
            <div className="v3-stat">
              <span className="v3-stat-label">AVG X</span>
              <span className="v3-stat-val">{stats.avgMulti.toFixed(2)}x</span>
            </div>
            <div className="v3-stat">
              <span className="v3-stat-label">LIVE BE</span>
              <span className="v3-stat-val">{stats.liveBE.toFixed(2)}x</span>
            </div>
          </div>
          <div className="v3-total-pay">
            <span className="v3-total-label">💰 TOTAL PAY</span>
            <span className="v3-total-val">{currency}{fmt(stats.totalWin)}</span>
          </div>
        </div>
      )}
    </Wrapper>
  );
}

/* ─── Keyframes ─── */
const spin = keyframes`
  from { transform: rotateY(0deg); }
  to   { transform: rotateY(360deg); }
`;

/* ─── Styled: Flip Container ─── */
const FlipContainer = styled.div`
  perspective: 1000px;
  width: 100%;

  .flip-inner {
    position: relative;
    width: 100%;
    height: ${p => p.$imgHeight || 220}px;
    transform-style: preserve-3d;
    animation: ${spin} ${p => p.$duration || 8}s linear infinite;
  }

  .flip-face {
    position: absolute;
    inset: 0;
    border-radius: ${p => p.$radius || 16}px;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    overflow: hidden;
  }

  /* ── FRONT ── */
  .flip-front {
    background: #0f172a;
  }

  .flip-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .flip-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 4rem;
    background: linear-gradient(135deg, #1e293b, #0f172a);
  }

  .flip-gradient {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to top,
      rgba(0, 0, 0, 0.85) 0%,
      rgba(0, 0, 0, 0.3) 40%,
      transparent 60%
    );
    pointer-events: none;
  }

  .flip-front-info {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 14px 16px;
    z-index: 2;
  }

  .flip-slot-name {
    font-size: 1.1rem;
    font-weight: 800;
    color: #fff;
    text-shadow: 0 2px 8px rgba(0,0,0,0.6);
    margin-bottom: 2px;
  }

  .flip-bet {
    font-size: 0.85rem;
    font-weight: 700;
    color: rgba(255,255,255,0.7);
  }

  .flip-payout {
    font-size: 0.85rem;
    font-weight: 700;
    color: #86efac;
    margin-top: 2px;
  }

  .flip-multi {
    margin-left: 8px;
    color: #facc15;
    font-weight: 800;
  }

  .flip-num {
    font-size: 0.7rem;
    color: rgba(255,255,255,0.45);
    margin-top: 4px;
  }

  .flip-super-badge,
  .flip-extreme-badge {
    position: absolute;
    top: 10px;
    right: 10px;
    padding: 3px 10px;
    border-radius: 6px;
    font-size: 0.65rem;
    font-weight: 800;
    letter-spacing: 0.05em;
    z-index: 3;
  }

  .flip-super-badge {
    background: rgba(234, 179, 8, 0.25);
    color: #facc15;
    border: 1px solid rgba(234, 179, 8, 0.4);
  }

  .flip-extreme-badge {
    background: rgba(239, 68, 68, 0.25);
    color: #fca5a5;
    border: 1px solid rgba(239, 68, 68, 0.4);
    top: ${p => '38px'}; /* offset if super badge is also present */
  }

  /* ── BACK ── */
  .flip-back {
    transform: rotateY(180deg);
    background: linear-gradient(145deg, #1e293b 0%, #0f172a 100%);
    border: 1px solid rgba(99, 102, 241, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .flip-back-content {
    padding: 20px 24px;
    width: 100%;
    text-align: center;
  }

  .flip-back-header {
    margin-bottom: 16px;
  }

  .flip-back-name {
    font-size: 1rem;
    font-weight: 800;
    color: #e2e8f0;
    margin-bottom: 4px;
  }

  .flip-back-provider {
    font-size: 0.78rem;
    font-weight: 600;
    color: #818cf8;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .flip-back-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 12px;
  }

  .flip-back-stat {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 10px;
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .flip-back-stat-label {
    font-size: 0.6rem;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .flip-back-stat-val {
    font-size: 0.9rem;
    font-weight: 800;
    color: #f1f5f9;
  }

  .flip-back-result {
    font-size: 0.85rem;
    font-weight: 700;
    color: #86efac;
    margin-bottom: 6px;
  }

  .flip-back-multi {
    margin-left: 8px;
    color: #facc15;
    font-weight: 800;
  }

  .flip-back-num {
    font-size: 0.65rem;
    color: rgba(255, 255, 255, 0.3);
  }
`;

/* ─── Styled: Main Wrapper ─── */
const Wrapper = styled.div`
  font-family: ${p => p.$fontFamily};
  font-size: ${p => p.$fontSize}px;
  max-width: ${p => p.$width}px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  filter: ${p =>
    (p.$brightness !== 100 || p.$contrast !== 100 || p.$saturation !== 100)
      ? `brightness(${p.$brightness}%) contrast(${p.$contrast}%) saturate(${p.$saturation}%)`
      : 'none'
  };

  /* ── Card base ── */
  .v3-card {
    border-radius: ${p => p.$cardRadius}px;
    padding: 14px 16px;
    border: 1px solid ${p => p.$cardOutline};
  }

  /* ── Header ── */
  .v3-header {
    background: ${p => p.$headerColor};
  }

  .v3-header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }

  .v3-header-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .v3-icon-circle {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: ${p => p.$headerAccent}22;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
  }

  .v3-title {
    font-size: 0.85rem;
    font-weight: 800;
    color: ${p => p.$textColor};
    letter-spacing: 0.05em;
  }

  .v3-subtitle {
    font-size: 0.72rem;
    color: ${p => p.$mutedColor};
  }

  .v3-badge {
    background: ${p => p.$headerAccent}22;
    color: ${p => p.$headerAccent};
    padding: 4px 10px;
    border-radius: 8px;
    font-size: 0.78rem;
    font-weight: 800;
  }

  .v3-header-stats {
    display: flex;
    gap: 8px;
  }

  .v3-stat {
    flex: 1;
    background: rgba(255, 255, 255, 0.04);
    border-radius: 8px;
    padding: 6px 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .v3-stat-label {
    font-size: 0.58rem;
    font-weight: 700;
    color: ${p => p.$mutedColor};
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .v3-stat-val {
    font-size: 0.82rem;
    font-weight: 800;
    color: ${p => p.$statValueColor};
  }

  /* ── Current bonus ── */
  .v3-current {
    background: ${p => p.$headerColor};
  }

  .v3-current-label {
    font-size: 0.65rem;
    font-weight: 800;
    color: #86efac;
    letter-spacing: 0.1em;
    margin-bottom: 8px;
  }

  .v3-current-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .v3-current-img {
    width: 56px;
    height: 48px;
    border-radius: 8px;
    object-fit: cover;
    flex-shrink: 0;
  }

  .v3-current-info {
    flex: 1;
    min-width: 0;
  }

  .v3-current-name {
    font-size: 0.88rem;
    font-weight: 800;
    color: ${p => p.$textColor};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .v3-current-bet {
    font-size: 0.75rem;
    font-weight: 700;
    color: ${p => p.$headerAccent};
  }

  .v3-current-provider {
    font-size: 0.65rem;
    color: ${p => p.$mutedColor};
    margin-top: 1px;
  }

  /* ── Flip area ── */
  .v3-flip-area {
    width: 100%;
  }

  /* ── Summary ── */
  .v3-summary {
    background: ${p => p.$summaryColor};
  }

  .v3-summary-row {
    display: flex;
    gap: 8px;
    margin-bottom: 10px;
  }

  .v3-total-pay {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: ${p => p.$totalPayColor};
    color: ${p => p.$totalPayText};
    padding: 10px 14px;
    border-radius: 10px;
    font-weight: 800;
  }

  .v3-total-label {
    font-size: 0.78rem;
    letter-spacing: 0.05em;
  }

  .v3-total-val {
    font-size: 1.1rem;
  }
`;
