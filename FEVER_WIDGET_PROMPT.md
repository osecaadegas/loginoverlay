# Fever Bonus Hunt Widget — Complete Replication Guide

## INSTRUCTIONS FOR THE AI

You must implement a "Fever" bonus hunt overlay widget for a stream overlay. This is a React component (can be .tsx or .jsx) with a separate CSS file. The widget displays bonus hunt data with a 3D card carousel.

**DO NOT modify, optimize, simplify, or "improve" ANY of this code. Copy it EXACTLY.**

---

## PART 1: THE COMPONENT (BonusHuntOverlay.tsx or .jsx)

```tsx
import React, { useMemo, useState, useEffect } from 'react';
import './BonusHuntOverlay.css'; // or wherever your CSS file is

interface Bonus {
  id?: string;
  slotName?: string;
  slot?: { name?: string; image?: string };
  betSize?: number;
  payout?: number;
  opened?: boolean;
  isSuperBonus?: boolean;
  isExtremeBonus?: boolean;
  isExtreme?: boolean;
}

interface BonusHuntConfig {
  bonuses?: Bonus[];
  currency?: string;
  startMoney?: number;
  stopLoss?: number;
  bonusOpening?: boolean;
  // Style overrides (all optional with defaults)
  headerColor?: string;
  headerAccent?: string;
  textColor?: string;
  mutedTextColor?: string;
  statValueColor?: string;
  fontFamily?: string;
  fontSize?: number;
  brightness?: number;
  contrast?: number;
  saturation?: number;
}

function BonusHuntOverlay({ config }: { config: BonusHuntConfig }) {
  const c = config || {};
  const bonuses = c.bonuses || [];
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
    const extremeCount = bonuses.filter(b => b.isExtremeBonus || b.isExtreme).length;

    const target = Math.max(startMoney - stopLoss, 0);
    const breakEven = totalBetAll > 0 ? target / totalBetAll : 0;
    const remaining = Math.max(target - totalWin, 0);
    const liveBE = totalBetRemaining > 0 ? remaining / totalBetRemaining : 0;

    return { totalBetAll, totalWin, superCount, extremeCount, breakEven, liveBE, openedCount: openedBonuses.length };
  }, [bonuses, startMoney, stopLoss]);

  /* ════════════════════════════════════════════════════════════════
     ██  AUTO-ROTATING CAROUSEL — THIS IS THE KEY PART  ██
     
     carouselIdx is a simple counter that increments every 2.5s.
     It drives which position class each card gets.
     The SAME DOM elements persist — only their className changes.
     CSS transition handles the smooth 3D animation.
     ════════════════════════════════════════════════════════════════ */
  const [carouselIdx, setCarouselIdx] = useState(0);
  useEffect(() => {
    if (bonuses.length < 2) return;
    const id = setInterval(() => setCarouselIdx(i => (i + 1) % bonuses.length), 2500);
    return () => clearInterval(id);
  }, [bonuses.length]);

  /* ─── Current bonus (first not-opened) ─── */
  const currentBonus = bonuses.find(b => !b.opened);
  const currentIndex = currentBonus ? bonuses.indexOf(currentBonus) : -1;
  const isOpening = !!c.bonusOpening && currentIndex >= 0;

  const huntTitle = c.bonusOpening ? 'BONUS OPENING' : 'BONUS HUNT';

  const fontSize = c.fontSize ?? 15;
  const brightness = c.brightness ?? 100;
  const contrast = c.contrast ?? 100;
  const saturation = c.saturation ?? 100;

  const rootStyle: React.CSSProperties = {
    fontFamily: c.fontFamily || "'Inter', sans-serif",
    fontSize: `${fontSize}px`,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    filter: (brightness !== 100 || contrast !== 100 || saturation !== 100)
      ? `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
      : undefined,
  };

  return (
    <div className="bht11" style={rootStyle}>

      {/* ═══ 1. Header ═══ */}
      <div className="bht11-header">
        <div className="bht11-header-left">
          <div className="bht11-header-titles">
            <span className="bht11-header-title">{huntTitle}</span>
            <span className="bht11-header-subtitle">fever</span>
          </div>
        </div>
      </div>

      {/* ═══ 2. Stats Row ═══ */}
      <div className="bht11-stats-row">
        <div className="bht11-stat-card">
          <div className="bht11-stat-card-text">
            <span className="bht11-stat-card-label">START</span>
            <span className="bht11-stat-card-value">{currency}{startMoney.toFixed(2)}</span>
          </div>
        </div>
        <div className="bht11-stat-card">
          <div className="bht11-stat-card-text">
            <span className="bht11-stat-card-label">BREAKEVEN</span>
            <span className="bht11-stat-card-value">{(c.bonusOpening ? stats.liveBE : stats.breakEven).toFixed(0)}x</span>
          </div>
        </div>
      </div>

      {/* ═══ 3. Counts ═══ */}
      <div className="bht11-counts-col">
        {(stats.superCount > 0 || stats.extremeCount > 0) && (
          <div className="bht11-count-bar-row">
            {stats.superCount > 0 && (
              <div className="bht11-count-bar bht11-count-bar--super">
                <span className="bht11-count-bar-icon">⚡</span>
                <span className="bht11-count-bar-label">SUPER</span>
                <span className="bht11-count-bar-value">{stats.superCount}</span>
              </div>
            )}
            {stats.extremeCount > 0 && (
              <div className="bht11-count-bar bht11-count-bar--extreme">
                <span className="bht11-count-bar-icon">🔥</span>
                <span className="bht11-count-bar-label">EXTREME</span>
                <span className="bht11-count-bar-value">{stats.extremeCount}</span>
              </div>
            )}
          </div>
        )}
        <div className="bht11-count-bar">
          <span className="bht11-count-bar-icon">🎁</span>
          <span className="bht11-count-bar-label">BONUSES</span>
          <span className="bht11-count-bar-value">{bonuses.length}</span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
           4. 3D ROTATING CARD STACK
           
           CRITICAL RULES — DO NOT VIOLATE:
           
           1. ALL bonuses are ALWAYS rendered. No .filter() or .slice().
           2. key={`stk-${bIdx}`} — bIdx is the ARRAY INDEX. NEVER 
              include carouselIdx or any changing value in the key.
           3. Only the className changes between renders. The DOM 
              element stays the same. CSS transition does the rest.
           4. Cards that are far from center get --hidden class 
              (opacity 0), but they STILL EXIST in the DOM.
           
           If you violate any of these rules, cards will TELEPORT
           instead of smoothly animating. The transition ONLY works
           when the same DOM element changes its class attribute.
           ═══════════════════════════════════════════════════════════ */}
      {bonuses.length > 0 && (
        <div className="bht11-stack-section">
          <div className={`bht-stack${!isOpening ? ' bht-stack--spinning' : ''}`}>
            {(() => {
              const total = bonuses.length;
              if (total === 0) return null;
              const ci = isOpening && currentIndex >= 0 ? currentIndex : carouselIdx % total;
              const posMap: Record<string, string> = {
                '-2': 'bht-stack-card--far-left',
                '-1': 'bht-stack-card--left',
                '0':  'bht-stack-card--center',
                '1':  'bht-stack-card--right',
                '2':  'bht-stack-card--far-right'
              };
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
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
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
        </div>
      )}

      {/* ═══ 5. Bonus List Section (Compact style) ═══ */}
      <div className="bht11-list-section">
        <div className="bht11-list-title">
          <span className="bht11-list-title-icon">📋</span>
          <span>BONUS LIST</span>
        </div>
        <div className="bht-bonus-list">
          {(() => {
            const renderCompactCard = (bonus: Bonus, idx: number, key: string | number) => {
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
                        onError={(e) => { const t = e.target as HTMLImageElement; t.src = ''; t.style.display = 'none'; }} />
                    ) : (
                      <div className="bht-cpt-card-img-ph" />
                    )}
                    {isExtreme && <div className="bht-cpt-blood-drip" />}
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
                style={{ '--bht-compact-count': bonuses.length } as React.CSSProperties}>
                {[...bonuses, ...bonuses].map((b, i) => {
                  const idx = i % bonuses.length;
                  return renderCompactCard(b, idx, `${b.id || idx}-${i >= bonuses.length ? 'c' : 'o'}`);
                })}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

export default React.memo(BonusHuntOverlay);
```

---

## PART 2: THE CSS (BonusHuntOverlay.css)

Copy this ENTIRE CSS file. Do NOT split it, rename classes, or reorganize it.

```css
/* ── V11 Fever Font ── */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

/* ════════════════════════════════════════════════
   ROOT — V11 "Fever" Bonus Hunt Widget
   ════════════════════════════════════════════════ */
.bht11 {
  display: flex;
  flex-direction: column;
  gap: 0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: linear-gradient(170deg, #0b1134 0%, #060a20 60%, #0a0e27 100%);
  border-radius: 20px;
  padding: 16px 14px;
  overflow: hidden;
  color: #ffffff;
  border: 1.5px solid rgba(96,165,250,0.12);
  height: 100%;
  box-sizing: border-box;
}

/* ── 1. Header ── */
.bht11-header {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 0 10px;
}
.bht11-header-left {
  display: flex;
  align-items: center;
  justify-content: center;
}
.bht11-header-titles {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
}
.bht11-header-title {
  font-size: 1.2em;
  font-weight: 900;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: #fff;
  line-height: 1.1;
}
.bht11-header-subtitle {
  font-size: 0.58em;
  font-weight: 600;
  letter-spacing: 4px;
  text-transform: uppercase;
  color: #93c5fd;
  opacity: 0.6;
  line-height: 1;
}

/* ── 2. Stats Row (glassmorphism) ── */
.bht11-stats-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
.bht11-stat-card {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(96,165,250,0.12) 0%, rgba(59,130,246,0.06) 100%);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-radius: 12px;
  padding: 10px 14px;
  border: 1px solid rgba(96,165,250,0.22);
  position: relative;
  overflow: hidden;
}
.bht11-stat-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent 10%, rgba(255,255,255,0.15) 50%, transparent 90%);
}
.bht11-stat-card-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.bht11-stat-card-label {
  font-size: 0.55em;
  font-weight: 700;
  letter-spacing: 2px;
  color: #93c5fd;
  text-transform: uppercase;
  opacity: 0.85;
}
.bht11-stat-card-value {
  font-size: 1.2em;
  font-weight: 900;
  color: #ffffff;
  text-shadow: 0 0 12px rgba(96,165,250,0.3);
}

/* ── 3. Count Bars ── */
.bht11-counts-col {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}
.bht11-count-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(15,21,53,0.85);
  border-radius: 12px;
  padding: 10px 16px;
  border: 1.5px solid rgba(96,165,250,0.18);
}
.bht11-count-bar-icon {
  font-size: 1em;
  flex-shrink: 0;
}
.bht11-count-bar-label {
  font-size: 0.72em;
  font-weight: 800;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: #93c5fd;
}
.bht11-count-bar-value {
  font-size: 1.15em;
  font-weight: 900;
  color: #ffffff;
  margin-left: auto;
}
.bht11-count-bar--super {
  border-color: rgba(234,179,8,0.5);
  background: linear-gradient(90deg, rgba(234,179,8,0.18) 0%, rgba(234,179,8,0.04) 100%);
}
.bht11-count-bar--super .bht11-count-bar-label {
  color: #eab308;
}
.bht11-count-bar--extreme {
  border-color: rgba(239,68,68,0.5);
  background: linear-gradient(90deg, rgba(239,68,68,0.18) 0%, rgba(239,68,68,0.04) 100%);
}
.bht11-count-bar--extreme .bht11-count-bar-label {
  color: #ef4444;
}
.bht11-count-bar-row {
  display: flex;
  gap: 6px;
}
.bht11-count-bar-row .bht11-count-bar {
  flex: 1;
}

/* ════════════════════════════════════════════════════════════════
   4. 3D ANIMATED CARD CAROUSEL
   
   HOW IT WORKS:
   - The .bht-stack container has perspective: 1000px
   - All cards are position: absolute inside it
   - Each card has a position class: --center, --left, --right, 
     --far-left, --far-right, or --hidden
   - Each position class has different transform values 
     (translateX, translateZ, rotateY, scale)
   - The BASE .bht-stack-card class has:
     transition: transform 0.8s cubic-bezier(...)
   - When React re-renders and changes the className, the SAME 
     DOM element smoothly transitions between transform values
   
   WHY TELEPORTING HAPPENS:
   If you use a key that includes carouselIdx, or if you filter
   the array, React will UNMOUNT the old element and MOUNT a new
   one. New elements have no "previous transform" to transition
   from, so they appear instantly at their new position = TELEPORT.
   ════════════════════════════════════════════════════════════════ */
.bht-stack {
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  height: 210px;
  perspective: 1000px;
  perspective-origin: 50% 50%;
  margin: 6px 0;
  overflow: visible;
}

/* BASE CARD — transition is THE critical property */
.bht-stack-card {
  position: absolute;
  width: 120px;
  height: 190px;
  transition: transform 0.8s cubic-bezier(0.25,0.46,0.45,0.94),
              opacity 0.8s cubic-bezier(0.25,0.46,0.45,0.94),
              filter 0.8s cubic-bezier(0.25,0.46,0.45,0.94),
              z-index 0s 0.4s;
  transform-style: preserve-3d;
  will-change: transform, opacity, filter;
}

/* Hidden — off-screen, invisible (but STILL IN THE DOM) */
.bht-stack-card--hidden {
  transform: translateX(0) translateZ(-200px) rotateY(0deg) scale(0.4);
  z-index: -1;
  opacity: 0;
  pointer-events: none;
  filter: brightness(0.3) blur(3px);
}

/* Far left — barely visible, deep in perspective */
.bht-stack-card--far-left {
  transform: translateX(-170px) translateZ(-120px) rotateY(35deg) scale(0.65);
  z-index: 0;
  opacity: 0.3;
  filter: brightness(0.45) blur(1px);
}

/* Left — tilted, behind center */
.bht-stack-card--left {
  transform: translateX(-95px) translateZ(-50px) rotateY(20deg) scale(0.85);
  z-index: 1;
  opacity: 0.7;
  filter: brightness(0.7);
}

/* Center — hero card, front and center */
.bht-stack-card--center {
  transform: translateX(0) translateZ(20px) rotateY(0deg) scale(1);
  z-index: 3;
  opacity: 1;
  filter: brightness(1);
}

/* Right — tilted, behind center */
.bht-stack-card--right {
  transform: translateX(95px) translateZ(-50px) rotateY(-20deg) scale(0.85);
  z-index: 1;
  opacity: 0.7;
  filter: brightness(0.7);
}

/* Far right — barely visible, deep in perspective */
.bht-stack-card--far-right {
  transform: translateX(170px) translateZ(-120px) rotateY(-35deg) scale(0.65);
  z-index: 0;
  opacity: 0.3;
  filter: brightness(0.45) blur(1px);
}

/* Center card float animation during opening */
.bht-stack:not(.bht-stack--spinning) .bht-stack-card--center {
  animation: bht-stack-float 3s ease-in-out infinite;
}
@keyframes bht-stack-float {
  0%, 100% { transform: translateX(0) translateZ(20px) rotateY(0deg) scale(1); }
  50%      { transform: translateX(0) translateZ(35px) rotateY(0deg) scale(1.04); }
}

/* Side card gentle tilt during opening */
.bht-stack:not(.bht-stack--spinning) .bht-stack-card--left {
  animation: bht-stack-tilt-left 4s ease-in-out infinite;
}
@keyframes bht-stack-tilt-left {
  0%, 100% { transform: translateX(-95px) translateZ(-50px) rotateY(20deg) scale(0.85); }
  50%      { transform: translateX(-95px) translateZ(-40px) rotateY(24deg) scale(0.87); }
}
.bht-stack:not(.bht-stack--spinning) .bht-stack-card--right {
  animation: bht-stack-tilt-right 4s ease-in-out infinite;
}
@keyframes bht-stack-tilt-right {
  0%, 100% { transform: translateX(95px) translateZ(-50px) rotateY(-20deg) scale(0.85); }
  50%      { transform: translateX(95px) translateZ(-40px) rotateY(-24deg) scale(0.87); }
}

/* Opened cards dimmed */
.bht-stack-card--opened { opacity: 0.5; }
.bht-stack-card--center.bht-stack-card--opened { opacity: 1; }

/* Super/Extreme glows */
.bht-stack-card--super {
  filter: drop-shadow(0 0 10px rgba(234,179,8,0.5));
}
.bht-stack-card--extreme {
  filter: drop-shadow(0 0 12px rgba(220,38,38,0.55));
}
.bht-stack-card--left.bht-stack-card--super,
.bht-stack-card--right.bht-stack-card--super {
  filter: brightness(0.7) drop-shadow(0 0 10px rgba(234,179,8,0.5));
}
.bht-stack-card--left.bht-stack-card--extreme,
.bht-stack-card--right.bht-stack-card--extreme {
  filter: brightness(0.7) drop-shadow(0 0 12px rgba(220,38,38,0.55));
}

/* Extreme card "hiding behind other cards" 3D animation */
.bht-stack:not(.bht-stack--spinning) .bht-stack-card--center.bht-stack-card--extreme {
  animation: bht-extreme-hide-center 4s ease-in-out infinite;
}
@keyframes bht-extreme-hide-center {
  0%, 100% { transform: translateX(0) translateZ(20px) rotateY(0deg) scale(1); }
  20%      { transform: translateX(12px) translateZ(-20px) rotateY(-10deg) scale(0.88); }
  40%      { transform: translateX(18px) translateZ(-50px) rotateY(-18deg) scale(0.78); }
  55%      { transform: translateX(14px) translateZ(-40px) rotateY(-14deg) scale(0.82); }
  75%      { transform: translateX(4px) translateZ(-5px) rotateY(-3deg) scale(0.95); }
}
.bht-stack:not(.bht-stack--spinning) .bht-stack-card--left.bht-stack-card--extreme {
  animation: bht-extreme-hide-left 4.5s ease-in-out infinite;
}
@keyframes bht-extreme-hide-left {
  0%, 100% { transform: translateX(-95px) translateZ(-50px) rotateY(20deg) scale(0.85); }
  25%      { transform: translateX(-65px) translateZ(-85px) rotateY(32deg) scale(0.72); }
  45%      { transform: translateX(-55px) translateZ(-100px) rotateY(38deg) scale(0.66); }
  65%      { transform: translateX(-72px) translateZ(-70px) rotateY(26deg) scale(0.78); }
}
.bht-stack:not(.bht-stack--spinning) .bht-stack-card--right.bht-stack-card--extreme {
  animation: bht-extreme-hide-right 4.5s ease-in-out infinite;
}
@keyframes bht-extreme-hide-right {
  0%, 100% { transform: translateX(95px) translateZ(-50px) rotateY(-20deg) scale(0.85); }
  25%      { transform: translateX(65px) translateZ(-85px) rotateY(-32deg) scale(0.72); }
  45%      { transform: translateX(55px) translateZ(-100px) rotateY(-38deg) scale(0.66); }
  65%      { transform: translateX(72px) translateZ(-70px) rotateY(-26deg) scale(0.78); }
}

/* ── Card inner structure ── */
.bht-stack-card-inner {
  width: 100%;
  height: 100%;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: rgba(0,0,0,0.55);
  border: 1.5px solid rgba(255,255,255,0.1);
  box-shadow:
    0 6px 24px rgba(0,0,0,0.6),
    0 1px 0 rgba(255,255,255,0.06) inset;
}
.bht-stack-card--center .bht-stack-card-inner {
  border-color: #86efac;
  box-shadow:
    0 8px 32px rgba(0,0,0,0.7),
    0 0 20px 3px rgba(134,239,172,0.2),
    0 1px 0 rgba(255,255,255,0.1) inset;
}
.bht-stack-card--super .bht-stack-card-inner {
  border-color: rgba(234,179,8,0.6);
}
.bht-stack-card--extreme .bht-stack-card-inner {
  border-color: rgba(220,38,38,0.7);
}
.bht-stack-card-img-wrap {
  flex: 1;
  overflow: hidden;
  position: relative;
}
.bht-stack-card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.bht-stack-card-img-ph {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #1a1f3a, #0e1225);
}

/* ── Progress bar ── */
.bht-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  margin: 2px 0 6px;
}
.bht-progress-bar {
  flex: 1;
  height: 14px;
  background: rgba(255,255,255,0.1);
  border-radius: 7px;
  overflow: hidden;
  position: relative;
}
.bht-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #22c55e, #4ade80);
  border-radius: 7px;
  transition: width 0.6s ease;
  position: relative;
  overflow: hidden;
}
.bht-progress-text {
  font-size: 0.75em;
  font-weight: 700;
  color: rgba(255,255,255,0.7);
  white-space: nowrap;
}

/* ── 5. Bonus List Section ── */
.bht11-list-section {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}
.bht11-list-section .bht-bonus-list {
  flex: 1 1 0;
  max-height: none;
  min-height: 0;
  overflow: hidden;
}
.bht11-list-title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 0.78em;
  font-weight: 900;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  color: #60a5fa;
  padding: 10px 4px 8px;
}
.bht11-list-title-icon {
  font-size: 1em;
}

/* ── Compact track (shared by static & scroll) ── */
.bht-compact-track {
  display: flex;
  flex-direction: column;
  gap: 6px;
  will-change: transform;
}
.bht-compact-track--static {
  animation: none !important;
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
@keyframes bht-compact-scroll {
  0%   { transform: translateY(0); }
  100% { transform: translateY(-50%); }
}
.bht-compact-track--scroll {
  animation: bht-compact-scroll calc(var(--bht-compact-count, 5) * 5s) linear infinite;
}

/* ── Compact bonus cards ── */
.bht-cpt-card {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(0,0,0,0.5);
  border: 1px solid rgba(255,255,255,0.06);
  transition: border-color 0.3s, box-shadow 0.3s;
  position: relative;
}
.bht-cpt-card--active {
  border-color: #86efac;
  box-shadow: 0 0 12px 2px rgba(134,239,172,0.25);
}
.bht-cpt-card--opened {
  opacity: 0.7;
}
.bht-cpt-card--opened.bht-cpt-card--active { opacity: 1; }
.bht-cpt-card--super {
  border-color: rgba(234,179,8,0.5);
  box-shadow: 0 0 10px 1px rgba(234,179,8,0.2);
}
.bht-cpt-card--extreme {
  border-color: rgba(220,38,38,0.7);
  box-shadow: 0 0 18px 2px rgba(220,38,38,0.4), inset 0 0 10px rgba(220,38,38,0.1);
  animation: bht-cpt-extreme-pulse 1.8s ease-in-out infinite;
}
@keyframes bht-cpt-extreme-pulse {
  0%, 100% { box-shadow: 0 0 18px 2px rgba(220,38,38,0.4), inset 0 0 10px rgba(220,38,38,0.1); }
  50%      { box-shadow: 0 0 28px 6px rgba(220,38,38,0.6), inset 0 0 16px rgba(220,38,38,0.2); }
}

/* Card image */
.bht-cpt-card-img-wrap {
  position: relative;
  width: 100%;
  height: 100px;
  overflow: hidden;
  flex-shrink: 0;
}
.bht-cpt-card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.bht-cpt-card-img-ph {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #1a1f3a, #0e1225);
}

/* Blood drip for EXTREME */
.bht-cpt-blood-drip {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 28px;
  pointer-events: none;
  z-index: 3;
  background:
    radial-gradient(ellipse 8px 18px at 10% 0, #b91c1c 0%, transparent 100%),
    radial-gradient(ellipse 6px 22px at 25% 0, #991b1b 0%, transparent 100%),
    radial-gradient(ellipse 10px 16px at 42% 0, #dc2626 0%, transparent 100%),
    radial-gradient(ellipse 5px 20px at 58% 0, #b91c1c 0%, transparent 100%),
    radial-gradient(ellipse 7px 24px at 72% 0, #991b1b 0%, transparent 100%),
    radial-gradient(ellipse 9px 14px at 88% 0, #dc2626 0%, transparent 100%);
  mask-image: linear-gradient(to bottom, black 40%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, black 40%, transparent 100%);
  animation: bht-blood-ooze 3s ease-in-out infinite alternate;
}
@keyframes bht-blood-ooze {
  0%   { opacity: 0.75; transform: scaleY(0.85); }
  100% { opacity: 1;    transform: scaleY(1.15); }
}

/* Type badges */
.bht-cpt-badge {
  position: absolute;
  top: 4px; right: 4px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.65em;
  font-weight: 800;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  z-index: 4;
}
.bht-cpt-badge--extreme {
  background: rgba(220,38,38,0.9);
  color: #fff;
  text-shadow: 0 1px 3px rgba(0,0,0,0.5);
  box-shadow: 0 0 8px rgba(220,38,38,0.5);
}
.bht-cpt-badge--super {
  background: rgba(234,179,8,0.9);
  color: #fff;
  text-shadow: 0 1px 3px rgba(0,0,0,0.5);
  box-shadow: 0 0 8px rgba(234,179,8,0.4);
}

/* Card info section */
.bht-cpt-card-info {
  padding: 5px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: rgba(0,0,0,0.65);
}
.bht-cpt-card-row1 {
  display: flex;
  align-items: center;
  gap: 6px;
}
.bht-cpt-card-idx {
  font-size: 0.75em;
  font-weight: 700;
  color: rgba(255,255,255,0.4);
  flex-shrink: 0;
}
.bht-cpt-card-name {
  font-size: 0.9em;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-transform: uppercase;
  flex: 1;
  min-width: 0;
}
.bht-cpt-card-row2 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8em;
}
.bht-cpt-card-bet {
  font-weight: 600;
  color: #93c5fd;
  white-space: nowrap;
}
.bht-cpt-card-payout {
  font-weight: 700;
  color: #4ade80;
  white-space: nowrap;
}
.bht-cpt-card-multi {
  font-weight: 800;
  color: #fbbf24;
  background: rgba(255,255,255,0.08);
  padding: 1px 6px;
  border-radius: 4px;
  white-space: nowrap;
}
.bht-cpt-card-multi--big {
  color: #f97316;
  background: rgba(249,115,22,0.15);
}
.bht-cpt-card-multi--huge {
  color: #ef4444;
  background: rgba(239,68,68,0.15);
  text-shadow: 0 0 6px rgba(239,68,68,0.5);
}

/* Extreme card tint */
.bht-cpt-card--extreme .bht-cpt-card-info {
  background: rgba(127,29,29,0.55);
  border-top: 2px solid rgba(220,38,38,0.5);
}
.bht-cpt-card--extreme .bht-cpt-card-name {
  color: #fca5a5;
}

/* Super card tint */
.bht-cpt-card--super .bht-cpt-card-info {
  background: rgba(113,63,18,0.35);
  border-top: 2px solid rgba(234,179,8,0.4);
}
.bht-cpt-card--super .bht-cpt-card-name {
  color: #fde68a;
}
```

---

## PART 3: VERIFICATION CHECKLIST

After implementing, verify ALL of these in the browser:

1. **3D Stack smooth transition**: Cards glide smoothly from position to position every 2.5 seconds. If they teleport/jump, your keys are wrong or you're filtering the array.

2. **DevTools check**: Open Elements tab, find `.bht-stack`. When carousel rotates, the `<div>` elements must STAY — only the `class` attribute changes. If elements disappear and reappear, you have a React mounting bug.

3. **5 visible positions**: At any time, you see center (large, front), left + right (tilted, medium), far-left + far-right (small, blurry). All other cards exist but are invisible (--hidden class).

4. **Bonus list auto-scroll**: The list at the bottom scrolls continuously upward via CSS keyframe animation. The list is duplicated (`[...bonuses, ...bonuses]`) so the scroll loops seamlessly.

5. **Inter font**: The header text uses Inter 900 weight. If it falls back to system font, the `@import` in CSS isn't loading.

---

## DEMO DATA FOR TESTING

```tsx
const demoConfig: BonusHuntConfig = {
  startMoney: 5000,
  stopLoss: 0,
  currency: '€',
  bonusOpening: false,
  bonuses: [
    { id: '1', slotName: 'Gates of Olympus', slot: { image: 'https://via.placeholder.com/120x190/1a1f3a/fff?text=GOO' }, betSize: 2.00, opened: false, isSuperBonus: false },
    { id: '2', slotName: 'Sugar Rush', slot: { image: 'https://via.placeholder.com/120x190/1a1f3a/fff?text=SR' }, betSize: 1.50, opened: true, payout: 150, isSuperBonus: true },
    { id: '3', slotName: 'Sweet Bonanza', slot: { image: 'https://via.placeholder.com/120x190/1a1f3a/fff?text=SB' }, betSize: 3.00, opened: true, payout: 45, isSuperBonus: false },
    { id: '4', slotName: 'Wanted Dead', slot: { image: 'https://via.placeholder.com/120x190/1a1f3a/fff?text=WD' }, betSize: 2.50, opened: false, isExtremeBonus: true },
    { id: '5', slotName: 'Big Bass', slot: { image: 'https://via.placeholder.com/120x190/1a1f3a/fff?text=BB' }, betSize: 1.00, opened: false },
    { id: '6', slotName: 'Razor Shark', slot: { image: 'https://via.placeholder.com/120x190/1a1f3a/fff?text=RS' }, betSize: 2.00, opened: true, payout: 80 },
    { id: '7', slotName: 'Book of Dead', slot: { image: 'https://via.placeholder.com/120x190/1a1f3a/fff?text=BOD' }, betSize: 1.50, opened: false },
    { id: '8', slotName: 'Starlight Princess', slot: { image: 'https://via.placeholder.com/120x190/1a1f3a/fff?text=SP' }, betSize: 4.00, opened: false, isSuperBonus: true },
  ]
};

// Usage:
<BonusHuntOverlay config={demoConfig} />
```
