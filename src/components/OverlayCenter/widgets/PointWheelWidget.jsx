/**
 * PointWheelWidget.jsx — OBS overlay widget for the Point Wheel community game.
 * Renders two overlapping spinning wheels (outer = high multipliers, inner = low multipliers).
 * Combined multiplier awards points to all active participants.
 * 4 display styles: Casino Gold, Neon Cyber, Minimal, Metallic Chrome.
 */
import React, { useMemo } from 'react';

/* ── Default outer wheel segments (12) ── */
const DEFAULT_OUTER = [
  { multi: 0,  label: '0x',  color: '#2d1f3d' },
  { multi: 1,  label: '1x',  color: '#7c3aed' },
  { multi: 0,  label: '0x',  color: '#1e1b2e' },
  { multi: 2,  label: '2x',  color: '#2563eb' },
  { multi: 0,  label: '0x',  color: '#2d1f3d' },
  { multi: 5,  label: '5x',  color: '#d97706' },
  { multi: 0,  label: '0x',  color: '#1e1b2e' },
  { multi: 1,  label: '1x',  color: '#7c3aed' },
  { multi: 0,  label: '0x',  color: '#2d1f3d' },
  { multi: 10, label: '10x', color: '#dc2626' },
  { multi: 0,  label: '0x',  color: '#1e1b2e' },
  { multi: 2,  label: '2x',  color: '#2563eb' },
];

/* ── Default inner wheel segments (8) ── */
const DEFAULT_INNER = [
  { multi: 0, label: '0x', color: '#1a1a2e' },
  { multi: 1, label: '1x', color: '#059669' },
  { multi: 0, label: '0x', color: '#111827' },
  { multi: 2, label: '2x', color: '#0891b2' },
  { multi: 0, label: '0x', color: '#1a1a2e' },
  { multi: 3, label: '3x', color: '#e11d48' },
  { multi: 0, label: '0x', color: '#111827' },
  { multi: 1, label: '1x', color: '#059669' },
];

function PointWheelWidget({ config }) {
  const c = config || {};
  const st = c.displayStyle || 'v1';
  const font = c.fontFamily || "'Inter', sans-serif";
  const accent = c.accentColor || '#f59e0b';
  const textColor = c.textColor || '#ffffff';

  /* ── Segment data ── */
  const outerSegs = c.outerSegments || DEFAULT_OUTER;
  const innerSegs = c.innerSegments || DEFAULT_INNER;

  /* ── Spin state — guard stale spinning (>7s) ── */
  const spinning = c._spinning && c._spinStart && (Date.now() - c._spinStart < 7500);
  const status = c.gameStatus || 'idle';
  const outerAngle = c._outerAngle || 0;
  const innerAngle = c._innerAngle || 0;
  const result = c._wheelResult;

  /* ── Chat bet participants ── */
  const chatBets = c._chatBets || {};
  const betEntries = Object.entries(chatBets);
  const hasBets = betEntries.length > 0;
  const showBets = c.chatBettingEnabled && hasBets;
  const totalBetPool = betEntries.reduce((s, [, b]) => s + (b.amount || 0), 0);

  /* ── Build conic gradients for wheel faces ── */
  const buildConic = (segs) => {
    const n = segs.length;
    return segs.map((s, i) => {
      const start = ((i / n) * 100).toFixed(2);
      const end = (((i + 1) / n) * 100).toFixed(2);
      return `${s.color} ${start}% ${end}%`;
    }).join(', ');
  };
  const outerConic = useMemo(() => `conic-gradient(from 0deg, ${buildConic(outerSegs)})`, [outerSegs]);
  const innerConic = useMemo(() => `conic-gradient(from 0deg, ${buildConic(innerSegs)})`, [innerSegs]);

  /* ── Keyframes ── */
  const kf = `
    @keyframes pw-result-pop{
      0%{transform:translate(-50%,-50%) scale(0);opacity:0}
      60%{transform:translate(-50%,-50%) scale(1.12);opacity:1}
      100%{transform:translate(-50%,-50%) scale(1);opacity:1}
    }
    @keyframes pw-glow-pulse{
      0%,100%{box-shadow:0 0 15px ${accent}22,inset 0 0 10px rgba(255,255,255,0.03)}
      50%{box-shadow:0 0 30px ${accent}44,inset 0 0 15px rgba(255,255,255,0.06)}
    }
    @keyframes pw-win-flash{
      0%{opacity:0;transform:translate(-50%,-50%) scale(.8)}
      15%{opacity:1}30%{opacity:.5}50%{opacity:1}
      70%{opacity:.6}100%{opacity:1;transform:translate(-50%,-50%) scale(1)}
    }
    @keyframes pw-idle-breathe{
      0%,100%{filter:brightness(1) drop-shadow(0 0 0 transparent)}
      50%{filter:brightness(1.03) drop-shadow(0 0 12px ${accent}22)}
    }
    @keyframes pw-ticker{
      0%,80%{transform:translateX(-50%) scaleY(1)}
      90%{transform:translateX(-50%) scaleY(.85)}
      100%{transform:translateX(-50%) scaleY(1)}
    }
  `;

  /* ── Segment divider lines ── */
  const SegDividers = ({ count, opacity = 0.12 }) => (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={{
          position: 'absolute', left: '50%', top: '0',
          width: 1, height: '50%',
          background: `rgba(255,255,255,${opacity})`,
          transformOrigin: 'bottom center',
          transform: `rotate(${(360 / count) * i}deg)`,
          pointerEvents: 'none',
        }} />
      ))}
    </>
  );

  /* ── Segment labels (radial layout) ── */
  const SegLabels = ({ segs, radiusPct, fontSize }) => {
    const n = segs.length;
    const sliceAngle = 360 / n;
    return (
      <>
        {segs.map((s, i) => {
          const midAngle = sliceAngle * i + sliceAngle / 2;
          return (
            <div key={i} style={{
              position: 'absolute', left: '50%', top: '0',
              width: 0, height: '50%',
              transformOrigin: 'bottom center',
              transform: `rotate(${midAngle}deg)`,
              pointerEvents: 'none',
            }}>
              <span style={{
                position: 'absolute',
                top: `${50 - radiusPct}%`,
                left: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: fontSize || (s.multi >= 10 ? 'clamp(5px, 1.8cqi, 10px)' : 'clamp(6px, 2.2cqi, 12px)'),
                fontWeight: 900,
                fontFamily: font,
                color: s.multi === 0 ? 'rgba(255,255,255,0.3)' : '#fff',
                textShadow: s.multi > 0 ? '0 1px 4px rgba(0,0,0,0.9)' : 'none',
                whiteSpace: 'nowrap',
                letterSpacing: '0.03em',
              }}>
                {s.label}
              </span>
            </div>
          );
        })}
      </>
    );
  };

  /* ── CSS transitions for spin ── */
  const outerTransition = spinning
    ? 'transform 5s cubic-bezier(0.15, 0.72, 0.08, 1.0)'
    : 'none';
  const innerTransition = spinning
    ? 'transform 5.6s cubic-bezier(0.12, 0.68, 0.06, 1.0)'
    : 'none';

  /* ── Bets info bar ── */
  const BetsBar = () => {
    if (!showBets) return null;
    return (
      <div style={{
        width: '88%', maxWidth: 400,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
        borderRadius: 8, padding: '5px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontFamily: font, fontSize: 'clamp(7px, 2cqi, 11px)',
        color: 'rgba(255,255,255,0.7)', flexShrink: 0,
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <span style={{ fontWeight: 700 }}>🎰 {betEntries.length} player{betEntries.length !== 1 ? 's' : ''}</span>
        <span>{totalBetPool.toLocaleString()} pts in pool</span>
      </div>
    );
  };

  /* ── Result overlay (shown after spin) ── */
  const ResultOverlay = ({ borderColor, shadowColor }) => {
    if (spinning || !result || status !== 'result') return null;
    const { outerMulti, innerMulti, totalMulti } = result;
    const isWin = totalMulti > 0;
    return (
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 20,
        background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)',
        borderRadius: 16,
        padding: 'clamp(8px, 2.5cqi, 20px) clamp(14px, 4cqi, 32px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        animation: isWin ? 'pw-win-flash 0.7s ease-out forwards' : 'pw-result-pop 0.5s ease-out forwards',
        border: `2px solid ${borderColor || (isWin ? '#22c55e44' : '#ef444444')}`,
        boxShadow: `0 0 40px ${shadowColor || (isWin ? '#22c55e22' : '#ef444411')}`,
        minWidth: '35%',
      }}>
        {/* Multiplier equation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(4px, 1.2cqi, 8px)' }}>
          <span style={{ fontSize: 'clamp(9px, 3cqi, 18px)', fontWeight: 800, color: accent }}>
            {outerMulti}x
          </span>
          <span style={{ fontSize: 'clamp(7px, 1.8cqi, 12px)', color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>×</span>
          <span style={{ fontSize: 'clamp(9px, 3cqi, 18px)', fontWeight: 800, color: '#06b6d4' }}>
            {innerMulti}x
          </span>
        </div>
        {/* Total multiplier */}
        <div style={{
          fontSize: 'clamp(16px, 6cqi, 44px)',
          fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em',
          color: isWin ? '#22c55e' : '#ef4444',
          textShadow: isWin ? '0 0 24px #22c55e55' : '0 0 12px #ef444433',
        }}>
          {isWin ? `${totalMulti}x` : 'NO WIN'}
        </div>
        {/* Payout info */}
        {isWin && result.payout > 0 && (
          <div style={{ fontSize: 'clamp(6px, 1.8cqi, 11px)', color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>
            +{result.payout.toLocaleString()} pts each
          </div>
        )}
      </div>
    );
  };

  /* ── Common base styles ── */
  const containerBase = {
    width: '100%', height: '100%',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    fontFamily: font, background: 'transparent',
    containerType: 'inline-size', gap: '2%',
  };

  const wheelContainerSize = showBets ? '68%' : '76%';

  /* ═══════════════════════════════════════════════════════════════════
     v1  Casino Gold — warm golds, ornate rim, rich shadows
     ═══════════════════════════════════════════════════════════════════ */
  if (st === 'v1') {
    return (
      <div style={containerBase}>
        <style>{kf}</style>
        {status === 'open' && <BetsBar />}
        <div style={{
          position: 'relative', width: wheelContainerSize, maxWidth: wheelContainerSize,
          aspectRatio: '1', flexShrink: 0,
          animation: !spinning && status !== 'result' ? 'pw-idle-breathe 4s ease-in-out infinite' : 'none',
        }}>
          {/* Pointer */}
          <div style={{
            position: 'absolute', top: '-3.5%', left: '50%',
            transform: 'translateX(-50%)', zIndex: 12,
            width: 0, height: 0,
            borderLeft: 'clamp(8px, 2.5cqi, 16px) solid transparent',
            borderRight: 'clamp(8px, 2.5cqi, 16px) solid transparent',
            borderTop: 'clamp(16px, 4.5cqi, 32px) solid #f59e0b',
            filter: 'drop-shadow(0 2px 8px #f59e0b88)',
            animation: spinning ? 'pw-ticker 0.15s ease-in-out infinite' : 'none',
          }} />

          {/* Outer rim glow */}
          <div style={{
            position: 'absolute', inset: '-3px', borderRadius: '50%',
            background: 'transparent',
            border: '3px solid rgba(255,215,0,0.2)',
            boxShadow: '0 0 25px rgba(255,215,0,0.15), inset 0 0 25px rgba(255,215,0,0.08)',
            pointerEvents: 'none', zIndex: 1,
          }} />

          {/* Outer wheel */}
          <div style={{
            position: 'absolute', inset: 0,
            transform: `rotate(${outerAngle}deg)`,
            transition: outerTransition,
          }}>
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: outerConic, overflow: 'hidden',
              border: '4px solid rgba(255,215,0,0.25)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 0 30px rgba(0,0,0,0.3)',
            }}>
              <SegDividers count={outerSegs.length} opacity={0.1} />
            </div>
            <SegLabels segs={outerSegs} radiusPct={36} />
          </div>

          {/* Inner wheel */}
          <div style={{
            position: 'absolute', left: '23%', top: '23%', right: '23%', bottom: '23%',
            transform: `rotate(${innerAngle}deg)`,
            transition: innerTransition, zIndex: 2,
          }}>
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: innerConic, overflow: 'hidden',
              border: '3px solid rgba(255,215,0,0.2)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4), inset 0 0 20px rgba(0,0,0,0.35)',
            }}>
              <SegDividers count={innerSegs.length} opacity={0.08} />
            </div>
            <SegLabels segs={innerSegs} radiusPct={32} />
          </div>

          {/* Center hub */}
          <div style={{
            position: 'absolute', left: '50%', top: '50%',
            width: '13%', height: '13%', borderRadius: '50%',
            transform: 'translate(-50%, -50%)', zIndex: 5,
            background: 'radial-gradient(circle at 35% 35%, #fde68a, #f59e0b, #92400e)',
            border: '2px solid rgba(255,255,255,0.15)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.5), inset 0 1px 4px rgba(255,255,255,0.3)',
          }} />

          <ResultOverlay />
        </div>
        {status === 'result' && <BetsBar />}
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════
     v2  Neon Cyber — electric glow, dark background, vivid outlines
     ═══════════════════════════════════════════════════════════════════ */
  if (st === 'v2') {
    const neonOuter = [
      { multi: 0,  label: '0x',  color: '#0a0a1a' },
      { multi: 1,  label: '1x',  color: '#4f46e5' },
      { multi: 0,  label: '0x',  color: '#0d0d20' },
      { multi: 2,  label: '2x',  color: '#0ea5e9' },
      { multi: 0,  label: '0x',  color: '#0a0a1a' },
      { multi: 5,  label: '5x',  color: '#d946ef' },
      { multi: 0,  label: '0x',  color: '#0d0d20' },
      { multi: 1,  label: '1x',  color: '#4f46e5' },
      { multi: 0,  label: '0x',  color: '#0a0a1a' },
      { multi: 10, label: '10x', color: '#f43f5e' },
      { multi: 0,  label: '0x',  color: '#0d0d20' },
      { multi: 2,  label: '2x',  color: '#0ea5e9' },
    ];
    const neonInner = [
      { multi: 0, label: '0x', color: '#050510' },
      { multi: 1, label: '1x', color: '#22d3ee' },
      { multi: 0, label: '0x', color: '#080818' },
      { multi: 2, label: '2x', color: '#a78bfa' },
      { multi: 0, label: '0x', color: '#050510' },
      { multi: 3, label: '3x', color: '#fb923c' },
      { multi: 0, label: '0x', color: '#080818' },
      { multi: 1, label: '1x', color: '#22d3ee' },
    ];
    const nOuter = `conic-gradient(from 0deg, ${buildConic(neonOuter)})`;
    const nInner = `conic-gradient(from 0deg, ${buildConic(neonInner)})`;
    const glowColor = '#a855f7';

    return (
      <div style={containerBase}>
        <style>{kf}</style>
        {status === 'open' && <BetsBar />}
        <div style={{
          position: 'relative', width: wheelContainerSize, maxWidth: wheelContainerSize,
          aspectRatio: '1', flexShrink: 0,
          filter: spinning ? 'none' : `drop-shadow(0 0 20px ${glowColor}33)`,
        }}>
          {/* Pointer */}
          <div style={{
            position: 'absolute', top: '-3.5%', left: '50%',
            transform: 'translateX(-50%)', zIndex: 12,
            width: 0, height: 0,
            borderLeft: 'clamp(8px, 2.5cqi, 16px) solid transparent',
            borderRight: 'clamp(8px, 2.5cqi, 16px) solid transparent',
            borderTop: `clamp(16px, 4.5cqi, 32px) solid ${glowColor}`,
            filter: `drop-shadow(0 0 10px ${glowColor}aa)`,
            animation: spinning ? 'pw-ticker 0.15s ease-in-out infinite' : 'none',
          }} />

          {/* Neon rim */}
          <div style={{
            position: 'absolute', inset: '-2px', borderRadius: '50%',
            border: `2px solid ${glowColor}55`,
            boxShadow: `0 0 20px ${glowColor}33, inset 0 0 20px ${glowColor}11`,
            pointerEvents: 'none', zIndex: 1,
          }} />

          {/* Outer wheel */}
          <div style={{
            position: 'absolute', inset: 0,
            transform: `rotate(${outerAngle}deg)`,
            transition: outerTransition,
          }}>
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: nOuter, overflow: 'hidden',
              border: `2px solid ${glowColor}44`,
              boxShadow: `0 0 30px rgba(0,0,0,0.6), inset 0 0 25px rgba(0,0,0,0.4), 0 0 15px ${glowColor}22`,
            }}>
              <SegDividers count={neonOuter.length} opacity={0.06} />
            </div>
            <SegLabels segs={neonOuter} radiusPct={36} />
          </div>

          {/* Inner wheel */}
          <div style={{
            position: 'absolute', left: '23%', top: '23%', right: '23%', bottom: '23%',
            transform: `rotate(${innerAngle}deg)`,
            transition: innerTransition, zIndex: 2,
          }}>
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: nInner, overflow: 'hidden',
              border: `2px solid #22d3ee44`,
              boxShadow: `0 4px 20px rgba(0,0,0,0.5), inset 0 0 15px rgba(0,0,0,0.4), 0 0 10px #22d3ee22`,
            }}>
              <SegDividers count={neonInner.length} opacity={0.05} />
            </div>
            <SegLabels segs={neonInner} radiusPct={32} />
          </div>

          {/* Center hub — dark with neon ring */}
          <div style={{
            position: 'absolute', left: '50%', top: '50%',
            width: '13%', height: '13%', borderRadius: '50%',
            transform: 'translate(-50%, -50%)', zIndex: 5,
            background: 'radial-gradient(circle, #1a1a2e, #0a0a14)',
            border: `2px solid ${glowColor}66`,
            boxShadow: `0 0 15px ${glowColor}44, inset 0 0 8px ${glowColor}22`,
          }} />

          <ResultOverlay borderColor={`${glowColor}55`} shadowColor={`${glowColor}33`} />
        </div>
        {status === 'result' && <BetsBar />}
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════
     v3  Minimal Clean — soft pastels, thin lines, elegant simplicity
     ═══════════════════════════════════════════════════════════════════ */
  if (st === 'v3') {
    const minOuter = [
      { multi: 0,  label: '0x',  color: '#e2e8f0' },
      { multi: 1,  label: '1x',  color: '#a78bfa' },
      { multi: 0,  label: '0x',  color: '#f1f5f9' },
      { multi: 2,  label: '2x',  color: '#60a5fa' },
      { multi: 0,  label: '0x',  color: '#e2e8f0' },
      { multi: 5,  label: '5x',  color: '#fbbf24' },
      { multi: 0,  label: '0x',  color: '#f1f5f9' },
      { multi: 1,  label: '1x',  color: '#a78bfa' },
      { multi: 0,  label: '0x',  color: '#e2e8f0' },
      { multi: 10, label: '10x', color: '#f87171' },
      { multi: 0,  label: '0x',  color: '#f1f5f9' },
      { multi: 2,  label: '2x',  color: '#60a5fa' },
    ];
    const minInner = [
      { multi: 0, label: '0x', color: '#f8fafc' },
      { multi: 1, label: '1x', color: '#34d399' },
      { multi: 0, label: '0x', color: '#f1f5f9' },
      { multi: 2, label: '2x', color: '#38bdf8' },
      { multi: 0, label: '0x', color: '#f8fafc' },
      { multi: 3, label: '3x', color: '#fb7185' },
      { multi: 0, label: '0x', color: '#f1f5f9' },
      { multi: 1, label: '1x', color: '#34d399' },
    ];
    const mOuter = `conic-gradient(from 0deg, ${buildConic(minOuter)})`;
    const mInner = `conic-gradient(from 0deg, ${buildConic(minInner)})`;

    /* Override label colors for minimal (dark text on light bg) */
    const MinLabels = ({ segs, radiusPct }) => {
      const n = segs.length;
      const sliceAngle = 360 / n;
      return (
        <>
          {segs.map((s, i) => {
            const midAngle = sliceAngle * i + sliceAngle / 2;
            return (
              <div key={i} style={{
                position: 'absolute', left: '50%', top: '0',
                width: 0, height: '50%',
                transformOrigin: 'bottom center',
                transform: `rotate(${midAngle}deg)`,
                pointerEvents: 'none',
              }}>
                <span style={{
                  position: 'absolute',
                  top: `${50 - radiusPct}%`, left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: s.multi >= 10 ? 'clamp(5px, 1.8cqi, 10px)' : 'clamp(6px, 2.2cqi, 12px)',
                  fontWeight: 800, fontFamily: font,
                  color: s.multi === 0 ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.7)',
                  whiteSpace: 'nowrap',
                }}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </>
      );
    };

    return (
      <div style={containerBase}>
        <style>{kf}</style>
        {status === 'open' && <BetsBar />}
        <div style={{
          position: 'relative', width: wheelContainerSize, maxWidth: wheelContainerSize,
          aspectRatio: '1', flexShrink: 0,
        }}>
          {/* Pointer */}
          <div style={{
            position: 'absolute', top: '-3.5%', left: '50%',
            transform: 'translateX(-50%)', zIndex: 12,
            width: 0, height: 0,
            borderLeft: 'clamp(7px, 2cqi, 14px) solid transparent',
            borderRight: 'clamp(7px, 2cqi, 14px) solid transparent',
            borderTop: 'clamp(14px, 4cqi, 28px) solid #6366f1',
            filter: 'drop-shadow(0 1px 4px rgba(99,102,241,0.3))',
            animation: spinning ? 'pw-ticker 0.15s ease-in-out infinite' : 'none',
          }} />

          {/* Outer wheel */}
          <div style={{
            position: 'absolute', inset: 0,
            transform: `rotate(${outerAngle}deg)`,
            transition: outerTransition,
          }}>
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: mOuter, overflow: 'hidden',
              border: '2px solid rgba(0,0,0,0.08)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            }}>
              <SegDividers count={minOuter.length} opacity={0.06} />
            </div>
            <MinLabels segs={minOuter} radiusPct={36} />
          </div>

          {/* Inner wheel */}
          <div style={{
            position: 'absolute', left: '23%', top: '23%', right: '23%', bottom: '23%',
            transform: `rotate(${innerAngle}deg)`,
            transition: innerTransition, zIndex: 2,
          }}>
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: mInner, overflow: 'hidden',
              border: '2px solid rgba(0,0,0,0.06)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}>
              <SegDividers count={minInner.length} opacity={0.05} />
            </div>
            <MinLabels segs={minInner} radiusPct={32} />
          </div>

          {/* Center hub */}
          <div style={{
            position: 'absolute', left: '50%', top: '50%',
            width: '12%', height: '12%', borderRadius: '50%',
            transform: 'translate(-50%, -50%)', zIndex: 5,
            background: '#fff',
            border: '2px solid rgba(0,0,0,0.08)',
            boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
          }} />

          <ResultOverlay />
        </div>
        {status === 'result' && <BetsBar />}
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════
     v4  Metallic Chrome — silver gradients, heavy depth, industrial
     ═══════════════════════════════════════════════════════════════════ */
  const metalOuter = [
    { multi: 0,  label: '0x',  color: '#374151' },
    { multi: 1,  label: '1x',  color: '#6d28d9' },
    { multi: 0,  label: '0x',  color: '#4b5563' },
    { multi: 2,  label: '2x',  color: '#1d4ed8' },
    { multi: 0,  label: '0x',  color: '#374151' },
    { multi: 5,  label: '5x',  color: '#b45309' },
    { multi: 0,  label: '0x',  color: '#4b5563' },
    { multi: 1,  label: '1x',  color: '#6d28d9' },
    { multi: 0,  label: '0x',  color: '#374151' },
    { multi: 10, label: '10x', color: '#b91c1c' },
    { multi: 0,  label: '0x',  color: '#4b5563' },
    { multi: 2,  label: '2x',  color: '#1d4ed8' },
  ];
  const metalInner = [
    { multi: 0, label: '0x', color: '#1f2937' },
    { multi: 1, label: '1x', color: '#047857' },
    { multi: 0, label: '0x', color: '#374151' },
    { multi: 2, label: '2x', color: '#0e7490' },
    { multi: 0, label: '0x', color: '#1f2937' },
    { multi: 3, label: '3x', color: '#be123c' },
    { multi: 0, label: '0x', color: '#374151' },
    { multi: 1, label: '1x', color: '#047857' },
  ];
  const mtOuter = `conic-gradient(from 0deg, ${buildConic(metalOuter)})`;
  const mtInner = `conic-gradient(from 0deg, ${buildConic(metalInner)})`;

  return (
    <div style={containerBase}>
      <style>{kf}</style>
      {status === 'open' && <BetsBar />}
      <div style={{
        position: 'relative', width: wheelContainerSize, maxWidth: wheelContainerSize,
        aspectRatio: '1', flexShrink: 0,
      }}>
        {/* Pointer */}
        <div style={{
          position: 'absolute', top: '-3.5%', left: '50%',
          transform: 'translateX(-50%)', zIndex: 12,
          width: 0, height: 0,
          borderLeft: 'clamp(8px, 2.5cqi, 16px) solid transparent',
          borderRight: 'clamp(8px, 2.5cqi, 16px) solid transparent',
          borderTop: 'clamp(16px, 4.5cqi, 32px) solid #9ca3af',
          filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))',
          animation: spinning ? 'pw-ticker 0.15s ease-in-out infinite' : 'none',
        }} />

        {/* Chrome rim ring */}
        <div style={{
          position: 'absolute', inset: '-4px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #d1d5db, #6b7280, #d1d5db, #6b7280)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.2)',
          zIndex: 0,
        }} />

        {/* Outer wheel */}
        <div style={{
          position: 'absolute', inset: '3px',
          transform: `rotate(${outerAngle}deg)`,
          transition: outerTransition,
        }}>
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: mtOuter, overflow: 'hidden',
            boxShadow: '0 6px 24px rgba(0,0,0,0.5), inset 0 0 30px rgba(0,0,0,0.35)',
          }}>
            <SegDividers count={metalOuter.length} opacity={0.08} />
          </div>
          <SegLabels segs={metalOuter} radiusPct={36} />
        </div>

        {/* Inner wheel */}
        <div style={{
          position: 'absolute', left: '24%', top: '24%', right: '24%', bottom: '24%',
          transform: `rotate(${innerAngle}deg)`,
          transition: innerTransition, zIndex: 2,
        }}>
          {/* Chrome inner rim */}
          <div style={{
            position: 'absolute', inset: '-3px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #9ca3af, #4b5563, #9ca3af)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
            zIndex: -1,
          }} />
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: mtInner, overflow: 'hidden',
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.4)',
          }}>
            <SegDividers count={metalInner.length} opacity={0.06} />
          </div>
          <SegLabels segs={metalInner} radiusPct={32} />
        </div>

        {/* Center hub — brushed metal */}
        <div style={{
          position: 'absolute', left: '50%', top: '50%',
          width: '14%', height: '14%', borderRadius: '50%',
          transform: 'translate(-50%, -50%)', zIndex: 5,
          background: 'linear-gradient(145deg, #e5e7eb, #9ca3af, #6b7280, #9ca3af, #e5e7eb)',
          backgroundSize: '200% 200%',
          border: '2px solid rgba(255,255,255,0.15)',
          boxShadow: '0 3px 14px rgba(0,0,0,0.5), inset 0 -2px 4px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.2)',
        }} />

        <ResultOverlay />
      </div>
      {status === 'result' && <BetsBar />}
    </div>
  );
}

export default React.memo(PointWheelWidget);
