/**
 * CoinFlipWidget.jsx — Proper 3D coin with CSS transforms.
 *
 * Geometry
 *   Two circular faces separated by DEPTH px along the Z-axis.
 *   Heads face  → translateZ(+HALF)              (faces +Z = viewer at 0°)
 *   Tails face  → rotateY(180deg) translateZ(+HALF)  (faces −Z)
 *   Edge ring   → 15 Z-stacked circle slices forming a visible rim.
 *
 * Animation
 *   Spin uses ease-out cubic baked into keyframe rotation values so the coin
 *   naturally decelerates.  Y-axis follows a toss arc.  rotateX wobble adds realism.
 *
 * Config sets `result` **immediately** when the flip starts so the widget
 * always knows which face to target.
 */
import React, { useMemo } from 'react';

function CoinFlipWidget({ config }) {
  const c = config || {};
  const st = c.displayStyle || 'v1';
  const hColor = c.headsColor || '#f59e0b';
  const tColor = c.tailsColor || '#3b82f6';
  const text   = c.textColor  || '#ffffff';
  const font   = c.fontFamily || "'Inter', sans-serif";
  const hLabel = c.headsLabel || 'HEADS';
  const tLabel = c.tailsLabel || 'TAILS';
  const hImg   = c.headsImage;
  const tImg   = c.tailsImage;
  const isHeads = c.result !== 'tails';
  /* Guard stale flipping flag (>6 s) */
  const flipping = c.flipping && c._flipStart && (Date.now() - c._flipStart < 6000);

  /* ── Bet data ── */
  const chatBets = c._chatBets || {};
  const headsBettors = Object.entries(chatBets).filter(([, b]) => b.side === 'heads');
  const tailsBettors = Object.entries(chatBets).filter(([, b]) => b.side === 'tails');
  const headsTotal = headsBettors.reduce((s, [, b]) => s + b.amount, 0);
  const tailsTotal = tailsBettors.reduce((s, [, b]) => s + b.amount, 0);
  const showBets = c.chatBettingEnabled && (headsBettors.length > 0 || tailsBettors.length > 0);
  const status = c.gameStatus || 'idle';

  /* ═══ 3D COIN GEOMETRY ═══ */
  const DEPTH = 8;           // coin thickness in px
  const HALF  = DEPTH / 2;
  const SPINS = 8;           // full rotations during flip

  /* 0° = heads face visible · 180° = tails face visible */
  const rest = isHeads ? 0 : 180;
  const prev = (c._prevResult || 'heads') !== 'tails' ? 0 : 180;
  const endDeg = SPINS * 360 + rest;
  const range  = endDeg - prev;

  /* Ease-out cubic: ~80 % of rotation in first ~40 % of time */
  const eo = (t) => 1 - (1 - t) * (1 - t) * (1 - t);
  const rotAt = (t) => Math.round(prev + range * eo(t));
  const flipRest = `rotateY(${rest}deg)`;

  /* ── Keyframes (memoised – recomputed only when result changes) ── */
  const kf = useMemo(() => {
    const P = [0, 5, 12, 20, 30, 42, 55, 67, 78, 87, 93, 97, 100];
    const Y = [0, -20, -55, -95, -125, -135, -115, -80, -40, -12, 5, -2, 0];
    const X = [0, 15, -10, 12, -8, 6, -4, 3, -2, 1, -0.5, 0.2, 0];
    let spin = '@keyframes cf-spin{';
    P.forEach((p, i) => {
      spin += `${p}%{transform:rotateY(${rotAt(p / 100)}deg) rotateX(${X[i]}deg) translateY(${Y[i]}%)}`;
    });
    spin += '}';
    const fr = `rotateY(${rest}deg)`;
    const idle = c.result ? fr : 'rotateY(0deg)';
    return `${spin}
@keyframes cf-land{0%{transform:${fr} scale(1.12);filter:brightness(1.25)}30%{transform:${fr} scale(.95);filter:brightness(.95)}55%{transform:${fr} scale(1.03);filter:brightness(1.04)}80%{transform:${fr} scale(.99)}100%{transform:${fr} scale(1);filter:brightness(1)}}
@keyframes cf-float{0%,100%{transform:${idle} translateY(0)}50%{transform:${idle} translateY(-3%)}}
@keyframes cf-flat{0%{transform:scaleX(1) rotateZ(0)}25%{transform:scaleX(0) rotateZ(5deg)}50%{transform:scaleX(1) rotateZ(0)}75%{transform:scaleX(0) rotateZ(-5deg)}100%{transform:scaleX(1) rotateZ(0)}}
@keyframes cf-shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
@keyframes cf-pop{0%{transform:scale(0);opacity:0}60%{transform:scale(1.15);opacity:1}100%{transform:scale(1)}}
@keyframes cf-shad{0%,100%{opacity:.3}50%{opacity:.6}}`;
  }, [rest, prev, endDeg, c.result]); // eslint-disable-line react-hooks/exhaustive-deps

  /* animation-timing-function is LINEAR because deceleration is baked into keyframe values */
  const anim3d = flipping
    ? 'cf-spin 2.5s linear forwards'
    : (c.result ? 'cf-land 0.4s ease-out forwards' : 'cf-float 3s ease-in-out infinite');

  /* ── Face content ── */
  const faceContent = (side) => {
    const img = side === 'heads' ? hImg : tImg;
    const label = side === 'heads' ? hLabel : tLabel;
    if (img) return <img src={img} alt={label} style={{ width: '65%', height: '65%', objectFit: 'contain', borderRadius: '50%' }} />;
    return (
      <span style={{
        fontSize: 'clamp(8px,7cqi,32px)', fontWeight: 900, color: '#fff',
        textShadow: '0 2px 4px rgba(0,0,0,0.4)', letterSpacing: '0.05em',
        lineHeight: 1.1, textAlign: 'center',
      }}>
        {label}
      </span>
    );
  };

  /* ── 3D Edge: Z-stacked circles forming the coin rim ──
     No backface-visibility — always visible from all angles */
  const edgeRing = (color1, color2) => {
    const N = 14;
    const slices = [];
    for (let i = 0; i <= N; i++) {
      const z = -HALF + (DEPTH / N) * i;
      slices.push(
        <div key={i} style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: i <= N / 2 ? color1 : color2,
          transform: `translateZ(${z.toFixed(1)}px)`,
        }} />
      );
    }
    return slices;
  };

  /* ── Bets bar ── */
  const BetsBar = () => {
    if (!showBets) return null;
    const tot = headsTotal + tailsTotal || 1;
    const hp = Math.round((headsTotal / tot) * 100);
    return (
      <div style={{ width: '88%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0, fontFamily: font, fontSize: 'clamp(8px,2.5cqi,13px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
          <span style={{ color: hColor }}>{hLabel} ({headsBettors.length})</span>
          <span style={{ color: tColor }}>{tLabel} ({tailsBettors.length})</span>
        </div>
        <div style={{ width: '100%', height: 8, borderRadius: 4, overflow: 'hidden', background: 'rgba(255,255,255,0.08)', display: 'flex' }}>
          <div style={{ width: `${hp}%`, height: '100%', background: hColor, transition: 'width 0.4s' }} />
          <div style={{ width: `${100 - hp}%`, height: '100%', background: tColor, transition: 'width 0.4s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(7px,2cqi,11px)' }}>
          <span>{headsTotal.toLocaleString()} pts</span>
          <span>{tailsTotal.toLocaleString()} pts</span>
        </div>
      </div>
    );
  };

  /* ── Result label ── */
  const ResultLabel = ({ extra }) => {
    if (flipping || !c.result) return null;
    return (
      <div style={{
        fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em',
        animation: 'cf-pop 0.4s ease-out forwards',
        fontSize: 'clamp(10px,4cqi,22px)',
        color: isHeads ? hColor : tColor,
        textShadow: `0 0 12px ${(isHeads ? hColor : tColor)}66`,
        ...extra,
      }}>
        {isHeads ? hLabel : tLabel}
      </div>
    );
  };

  /* ── Ground shadow ── */
  const Shadow = () => (
    <div style={{
      width: '40%', height: 6, borderRadius: '50%', flexShrink: 0, marginTop: -2,
      background: flipping
        ? 'radial-gradient(ellipse, rgba(0,0,0,0.15) 0%, transparent 70%)'
        : 'radial-gradient(ellipse, rgba(0,0,0,0.3) 0%, transparent 70%)',
      animation: flipping ? 'cf-shad 0.4s ease-in-out infinite' : 'none',
    }} />
  );

  /* ── Shared layout pieces ── */
  const wrap = {
    width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: '3%',
    fontFamily: font, perspective: 800, background: 'transparent', containerType: 'inline-size',
  };
  const coinOuter = { width: '50%', maxHeight: showBets ? '55%' : '65%', aspectRatio: '1', flexShrink: 0 };
  const coinBody  = { width: '100%', height: '100%', position: 'relative', transformStyle: 'preserve-3d', animation: anim3d };
  const face = (extra) => ({
    position: 'absolute', inset: 0, borderRadius: '50%', backfaceVisibility: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', ...extra,
  });

  /* ═══════════════════════════════════════════════════
     v1  Realistic 3D Gold Coin
     ═══════════════════════════════════════════════════ */
  if (st === 'v1') {
    return (
      <div style={wrap}>
        <style>{kf}</style>
        {status === 'open' && <BetsBar />}
        <div style={{ ...coinOuter, filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.45))' }}>
          <div style={coinBody}>
            {edgeRing(`${hColor}88`, `${hColor}55`)}
            <div style={face({
              background: `radial-gradient(ellipse at 30% 30%, ${hColor}ee, ${hColor}99 45%, ${hColor}66)`,
              border: '4px solid rgba(255,255,255,0.15)',
              boxShadow: 'inset 0 -5px 10px rgba(0,0,0,0.35), inset 0 5px 10px rgba(255,255,255,0.25)',
              transform: `translateZ(${HALF}px)`,
            })}>{faceContent('heads')}</div>
            <div style={face({
              background: `radial-gradient(ellipse at 30% 30%, ${tColor}ee, ${tColor}99 45%, ${tColor}66)`,
              border: '4px solid rgba(255,255,255,0.15)',
              boxShadow: 'inset 0 -5px 10px rgba(0,0,0,0.35), inset 0 5px 10px rgba(255,255,255,0.25)',
              transform: `rotateY(180deg) translateZ(${HALF}px)`,
            })}>{faceContent('tails')}</div>
          </div>
        </div>
        <Shadow />
        <ResultLabel />
        {status === 'result' && <BetsBar />}
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════
     v2  Neon Glow 3D
     ═══════════════════════════════════════════════════ */
  if (st === 'v2') {
    const glow = isHeads ? hColor : tColor;
    return (
      <div style={wrap}>
        <style>{kf}</style>
        {status === 'open' && <BetsBar />}
        <div style={{ ...coinOuter, filter: `drop-shadow(0 0 28px ${glow}55)` }}>
          <div style={coinBody}>
            {edgeRing('#1a1a2e', '#0d0d14')}
            <div style={face({
              background: 'radial-gradient(circle at 35% 35%, #1a1a2e, #0d0d14)',
              border: `3px solid ${hColor}`, boxShadow: `0 0 30px ${hColor}44, inset 0 0 20px ${hColor}22`,
              transform: `translateZ(${HALF}px)`,
            })}>{faceContent('heads')}</div>
            <div style={face({
              background: 'radial-gradient(circle at 35% 35%, #1a1a2e, #0d0d14)',
              border: `3px solid ${tColor}`, boxShadow: `0 0 30px ${tColor}44, inset 0 0 20px ${tColor}22`,
              transform: `rotateY(180deg) translateZ(${HALF}px)`,
            })}>{faceContent('tails')}</div>
          </div>
        </div>
        <Shadow />
        <ResultLabel extra={{ textShadow: `0 0 20px ${glow}` }} />
        {status === 'result' && <BetsBar />}
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════
     v3  Minimal Flat
     ═══════════════════════════════════════════════════ */
  if (st === 'v3') {
    const bg = isHeads ? hColor : tColor;
    return (
      <div style={{ ...wrap, perspective: 'none' }}>
        <style>{kf}</style>
        {status === 'open' && <BetsBar />}
        <div style={{
          width: '48%', maxHeight: '65%', aspectRatio: '1', borderRadius: '50%', flexShrink: 0,
          background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: flipping ? 'cf-flat 0.5s ease-in-out 4 forwards' : 'none',
          transition: 'background 0.3s',
        }}>
          {faceContent(isHeads ? 'heads' : 'tails')}
        </div>
        {!flipping && c.result && (
          <div style={{ fontSize: 'clamp(10px,3.5cqi,18px)', fontWeight: 700, color: text, textTransform: 'uppercase' }}>
            {isHeads ? hLabel : tLabel}
          </div>
        )}
        {status === 'result' && <BetsBar />}
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════
     v4  Metallic Casino (default)
     ═══════════════════════════════════════════════════ */
  return (
    <div style={wrap}>
      <style>{kf}</style>
      {status === 'open' && <BetsBar />}
      <div style={{ ...coinOuter, filter: 'drop-shadow(0 10px 24px rgba(0,0,0,0.45))' }}>
        <div style={coinBody}>
          {edgeRing('#92400e', '#d4a017')}
          <div style={face({
            background: `linear-gradient(145deg, #fde68a, ${hColor}, #92400e, ${hColor}, #fde68a)`,
            backgroundSize: '400% 400%',
            animation: !flipping ? 'cf-shimmer 3s linear infinite' : 'none',
            border: '4px ridge rgba(255,255,255,0.25)',
            boxShadow: 'inset 0 -6px 12px rgba(0,0,0,0.4), inset 0 6px 12px rgba(255,255,255,0.3)',
            transform: `translateZ(${HALF}px)`,
          })}>{faceContent('heads')}</div>
          <div style={face({
            background: `linear-gradient(145deg, #bfdbfe, ${tColor}, #1e3a5f, ${tColor}, #bfdbfe)`,
            backgroundSize: '400% 400%',
            animation: !flipping ? 'cf-shimmer 3s linear infinite' : 'none',
            border: '4px ridge rgba(255,255,255,0.25)',
            boxShadow: 'inset 0 -6px 12px rgba(0,0,0,0.4), inset 0 6px 12px rgba(255,255,255,0.3)',
            transform: `rotateY(180deg) translateZ(${HALF}px)`,
          })}>{faceContent('tails')}</div>
        </div>
      </div>
      <Shadow />
      {!flipping && c.result && (
        <div style={{
          fontSize: 'clamp(10px,3.8cqi,18px)', fontWeight: 800, textTransform: 'uppercase',
          background: `linear-gradient(90deg, ${isHeads ? hColor : tColor}, #fff, ${isHeads ? hColor : tColor})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundSize: '200%', animation: 'cf-shimmer 2s linear infinite',
        }}>
          {isHeads ? hLabel : tLabel}
        </div>
      )}
      {status === 'result' && <BetsBar />}
    </div>
  );
}

export default React.memo(CoinFlipWidget);
