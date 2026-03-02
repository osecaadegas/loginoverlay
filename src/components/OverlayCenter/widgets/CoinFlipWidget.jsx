import React from 'react';

export default function CoinFlipWidget({ config }) {
  const c = config || {};
  const st = c.displayStyle || 'v1';
  const hColor  = c.headsColor  || '#f59e0b';
  const tColor  = c.tailsColor  || '#3b82f6';
  const text    = c.textColor   || '#ffffff';
  const accent  = c.accentColor || '#f59e0b';
  const font    = c.fontFamily  || "'Inter', sans-serif";
  const hLabel  = c.headsLabel  || 'HEADS';
  const tLabel  = c.tailsLabel  || 'TAILS';
  const hImg    = c.headsImage;
  const tImg    = c.tailsImage;
  const isHeads = c.result !== 'tails';
  /* Guard transient flag: ignore stale flipping state (>6s old) */
  const flipping = c.flipping && c._flipStart && (Date.now() - c._flipStart < 6000);

  /* ── Chat bet data ── */
  const chatBets = c._chatBets || {};
  const headsBettors = Object.entries(chatBets).filter(([, b]) => b.side === 'heads');
  const tailsBettors = Object.entries(chatBets).filter(([, b]) => b.side === 'tails');
  const headsTotal = headsBettors.reduce((s, [, b]) => s + b.amount, 0);
  const tailsTotal = tailsBettors.reduce((s, [, b]) => s + b.amount, 0);
  const hasBets = headsBettors.length > 0 || tailsBettors.length > 0;
  const showBets = c.chatBettingEnabled && hasBets;
  const status = c.gameStatus || 'idle';

  /* ── True 50/50 — result is computed in Config, coin always lands on correct face ── */
  /* END angle: multiples of 360 = heads face up, +180 = tails face up */
  const END = isHeads ? 3600 : 3780;
  const prevAngle = (c._prevResult || 'heads') !== 'tails' ? 0 : 180;
  const at = (f) => Math.round(prevAngle + (END - prevAngle) * f);
  const flipRest = isHeads ? 'rotateY(0deg)' : 'rotateY(180deg)';

  /* ── Coin thickness for 3D edge (% of coin diameter) ── */
  const EDGE = 8;

  const kf3d = `
    @keyframes cf-3d-flip{
      0%  {transform:rotateY(${prevAngle}deg) rotateX(0deg) translateY(0)}
      5%  {transform:rotateY(${at(.05)}deg) rotateX(15deg) translateY(-20%)}
      12% {transform:rotateY(${at(.12)}deg) rotateX(-10deg) translateY(-55%)}
      20% {transform:rotateY(${at(.20)}deg) rotateX(12deg) translateY(-95%)}
      30% {transform:rotateY(${at(.30)}deg) rotateX(-8deg) translateY(-125%)}
      42% {transform:rotateY(${at(.42)}deg) rotateX(6deg) translateY(-135%)}
      55% {transform:rotateY(${at(.55)}deg) rotateX(-4deg) translateY(-115%)}
      67% {transform:rotateY(${at(.67)}deg) rotateX(3deg) translateY(-80%)}
      78% {transform:rotateY(${at(.78)}deg) rotateX(-2deg) translateY(-40%)}
      87% {transform:rotateY(${at(.87)}deg) rotateX(1deg) translateY(-12%)}
      93% {transform:rotateY(${at(.93)}deg) rotateX(-.5deg) translateY(5%)}
      97% {transform:rotateY(${at(.97)}deg) rotateX(.2deg) translateY(-2%)}
      100%{transform:rotateY(${END}deg) rotateX(0deg) translateY(0)}
    }
    @keyframes cf-shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
    @keyframes cf-land{
      0%  {transform:${flipRest} scale(1.15);filter:brightness(1.3)}
      30% {transform:${flipRest} scale(.94);filter:brightness(0.95)}
      55% {transform:${flipRest} scale(1.04);filter:brightness(1.05)}
      75% {transform:${flipRest} scale(.99)}
      100%{transform:${flipRest} scale(1);filter:brightness(1)}
    }
    @keyframes cf-idle-float{
      0%,100%{transform:${c.result ? flipRest : 'rotateY(0deg)'} translateY(0)}
      50%{transform:${c.result ? flipRest : 'rotateY(0deg)'} translateY(-3%)}
    }
    @keyframes cf-flat-flip{0%{transform:scaleX(1)}25%{transform:scaleX(0)}50%{transform:scaleX(1)}75%{transform:scaleX(0)}100%{transform:scaleX(1)}}
    @keyframes cf-result-pop{0%{transform:scale(0) translateY(10px);opacity:0}50%{transform:scale(1.15) translateY(-2px);opacity:1}100%{transform:scale(1) translateY(0);opacity:1}}
    @keyframes cf-shadow-pulse{0%,100%{opacity:.3}50%{opacity:.6}}
  `;

  /* ── Coin edge slices — generates N thin rect divs positioned around the edge ── */
  const edgeSlices = (color1, color2) => {
    const N = 24;
    const slices = [];
    for (let i = 0; i < N; i++) {
      const angle = (i / N) * 180;
      const shade = i % 2 === 0 ? color1 : color2;
      slices.push(
        <div key={i} style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: shade,
          transform: `rotateY(${angle}deg) translateZ(${EDGE / 2}px)`,
          backfaceVisibility: 'hidden',
        }} />
      );
    }
    return slices;
  };

  /* ── Responsive face content ── */
  const faceContent = (side) => {
    const img = side === 'heads' ? hImg : tImg;
    const label = side === 'heads' ? hLabel : tLabel;
    if (img) return <img src={img} alt={label} style={{ width:'65%', height:'65%', objectFit:'contain', borderRadius:'50%' }} />;
    return <span style={{ fontSize:'clamp(8px,7cqi,32px)', fontWeight:900, color:'#fff', textShadow:'0 2px 4px rgba(0,0,0,0.4)', letterSpacing:'0.05em', lineHeight:1.1, textAlign:'center' }}>{label}</span>;
  };

  /* ── Shared coin structure for 3D styles ── */
  const coinWrap = { width:'50%', maxHeight: showBets ? '58%' : '68%', aspectRatio:'1', flexShrink:0 };
  const coinBox = {
    width:'100%', height:'100%', position:'relative', transformStyle:'preserve-3d',
    transform: flipping ? `rotateY(${prevAngle}deg)` : (c.result ? flipRest : 'none'),
  };
  const face = (extra) => ({
    position:'absolute', inset:0, borderRadius:'50%', backfaceVisibility:'hidden',
    display:'flex', alignItems:'center', justifyContent:'center', ...extra,
  });
  const ani3d = flipping
    ? 'cf-3d-flip 2.5s cubic-bezier(.22,.68,.36,1) forwards'
    : (c.result ? 'cf-land 0.4s ease-out forwards' : 'cf-idle-float 3s ease-in-out infinite');

  /* ── Chat bets bar component ── */
  const BetsBar = () => {
    if (!showBets) return null;
    const total = headsTotal + tailsTotal || 1;
    const hPct = Math.round((headsTotal / total) * 100);
    const tPct = 100 - hPct;
    return (
      <div style={{
        width:'88%', maxWidth:400, display:'flex', flexDirection:'column', gap:4, flexShrink:0,
        fontFamily:font, fontSize:'clamp(8px,2.5cqi,13px)',
      }}>
        {/* Labels */}
        <div style={{ display:'flex', justifyContent:'space-between', color:'rgba(255,255,255,0.8)', fontWeight:700 }}>
          <span style={{ color: hColor }}>{hLabel} ({headsBettors.length})</span>
          <span style={{ color: tColor }}>{tLabel} ({tailsBettors.length})</span>
        </div>
        {/* Bar */}
        <div style={{
          width:'100%', height:8, borderRadius:4, overflow:'hidden',
          background:'rgba(255,255,255,0.08)', display:'flex',
        }}>
          <div style={{ width:`${hPct}%`, height:'100%', background:hColor, transition:'width 0.4s ease' }} />
          <div style={{ width:`${tPct}%`, height:'100%', background:tColor, transition:'width 0.4s ease' }} />
        </div>
        {/* Points */}
        <div style={{ display:'flex', justifyContent:'space-between', color:'rgba(255,255,255,0.5)', fontSize:'clamp(7px,2cqi,11px)' }}>
          <span>{headsTotal.toLocaleString()} pts</span>
          <span>{tailsTotal.toLocaleString()} pts</span>
        </div>
      </div>
    );
  };

  /* ── Result label component ── */
  const ResultLabel = ({ style }) => {
    if (flipping || !c.result) return null;
    return (
      <div style={{
        fontWeight:800, textTransform:'uppercase', textAlign:'center', letterSpacing:'0.1em',
        animation:'cf-result-pop 0.4s ease-out forwards',
        fontSize:'clamp(10px,4cqi,22px)',
        color: isHeads ? hColor : tColor,
        textShadow: `0 0 12px ${(isHeads ? hColor : tColor)}66`,
        ...style,
      }}>
        {c.result === 'heads' ? hLabel : tLabel}
      </div>
    );
  };

  /* ── Ground shadow ── */
  const GroundShadow = () => (
    <div style={{
      width:'40%', height:6, borderRadius:'50%', flexShrink:0, marginTop:-2,
      background: flipping
        ? 'radial-gradient(ellipse, rgba(0,0,0,0.15) 0%, transparent 70%)'
        : 'radial-gradient(ellipse, rgba(0,0,0,0.3) 0%, transparent 70%)',
      animation: flipping ? 'cf-shadow-pulse 0.4s ease-in-out infinite' : 'none',
      transition: 'all 0.3s',
    }} />
  );

  /* ═══════════════════════════════════════════════════════════════════
     v1  Realistic 3D Gold Coin
     ═══════════════════════════════════════════════════════════════════ */
  if (st === 'v1') {
    return (
      <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'3%', fontFamily:font, perspective:'800px', background:'transparent', containerType:'inline-size' }}>
        <style>{kf3d}</style>
        {status === 'open' && <BetsBar />}
        <div style={{ ...coinWrap, filter:'drop-shadow(0 8px 24px rgba(0,0,0,0.45))' }}>
          <div style={{ ...coinBox, animation:ani3d }}>
            {/* Heads face */}
            <div style={face({
              background:`radial-gradient(ellipse at 30% 30%, ${hColor}ee, ${hColor}99 45%, ${hColor}66)`,
              border:'4px solid rgba(255,255,255,0.15)',
              boxShadow:`inset 0 -5px 10px rgba(0,0,0,0.35), inset 0 5px 10px rgba(255,255,255,0.25), 0 8px 24px ${hColor}33`,
              transform:'translateZ(4px)',
            })}>{faceContent('heads')}</div>
            {/* Tails face */}
            <div style={face({
              background:`radial-gradient(ellipse at 30% 30%, ${tColor}ee, ${tColor}99 45%, ${tColor}66)`,
              border:'4px solid rgba(255,255,255,0.15)',
              boxShadow:`inset 0 -5px 10px rgba(0,0,0,0.35), inset 0 5px 10px rgba(255,255,255,0.25), 0 8px 24px ${tColor}33`,
              transform:'rotateY(180deg) translateZ(4px)',
            })}>{faceContent('tails')}</div>
            {/* 3D edge ring — gives coin thickness */}
            {edgeSlices(`${hColor}88`, `${hColor}55`)}
            {/* Rim highlight */}
            <div style={{ position:'absolute', inset:'-3px', borderRadius:'50%', border:'2px solid rgba(255,255,255,0.06)', background:'transparent', pointerEvents:'none' }} />
          </div>
        </div>
        <GroundShadow />
        <ResultLabel />
        {status === 'result' && <BetsBar />}
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════
     v2  Neon Glow 3D
     ═══════════════════════════════════════════════════════════════════ */
  if (st === 'v2') {
    const glowColor = isHeads ? hColor : tColor;
    return (
      <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'3%', fontFamily:font, perspective:'800px', background:'transparent', containerType:'inline-size' }}>
        <style>{kf3d}</style>
        {status === 'open' && <BetsBar />}
        <div style={{ ...coinWrap, filter:`drop-shadow(0 0 28px ${glowColor}55)` }}>
          <div style={{ ...coinBox, animation:ani3d }}>
            <div style={face({
              background:'radial-gradient(circle at 35% 35%, #1a1a2e, #0d0d14)',
              border:`3px solid ${hColor}`, boxShadow:`0 0 30px ${hColor}44, inset 0 0 20px ${hColor}22`,
              transform:'translateZ(4px)',
            })}>{faceContent('heads')}</div>
            <div style={face({
              background:'radial-gradient(circle at 35% 35%, #1a1a2e, #0d0d14)',
              border:`3px solid ${tColor}`, boxShadow:`0 0 30px ${tColor}44, inset 0 0 20px ${tColor}22`,
              transform:'rotateY(180deg) translateZ(4px)',
            })}>{faceContent('tails')}</div>
            {edgeSlices('#1a1a2e', '#0d0d14')}
          </div>
        </div>
        <GroundShadow />
        <ResultLabel style={{ textShadow:`0 0 20px ${glowColor}` }} />
        {status === 'result' && <BetsBar />}
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════
     v3  Minimal Flat
     ═══════════════════════════════════════════════════════════════════ */
  if (st === 'v3') {
    const bg = isHeads ? hColor : tColor;
    return (
      <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'2%', fontFamily:font, background:'transparent', containerType:'inline-size' }}>
        <style>{kf3d}</style>
        {status === 'open' && <BetsBar />}
        <div style={{
          width:'48%', maxHeight:'65%', aspectRatio:'1', borderRadius:'50%', flexShrink:0,
          background:bg, display:'flex', alignItems:'center', justifyContent:'center',
          animation: flipping ? 'cf-flat-flip 0.55s ease-in-out 3 forwards' : 'none',
          transition:'background 0.3s',
        }}>{faceContent(isHeads ? 'heads' : 'tails')}</div>
        {!flipping && c.result && (
          <div style={{ fontSize:'clamp(10px,3.5cqi,18px)', fontWeight:700, color:text, textTransform:'uppercase' }}>
            {c.result === 'heads' ? hLabel : tLabel}
          </div>
        )}
        {status === 'result' && <BetsBar />}
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════
     v4  Metallic Casino
     ═══════════════════════════════════════════════════════════════════ */
  return (
    <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'3%', fontFamily:font, perspective:'800px', background:'transparent', containerType:'inline-size' }}>
      <style>{kf3d}</style>
      {status === 'open' && <BetsBar />}
      <div style={{ ...coinWrap, width:'50%', filter:'drop-shadow(0 10px 24px rgba(0,0,0,0.45))' }}>
        <div style={{ ...coinBox, animation:ani3d }}>
          <div style={face({
            background:`linear-gradient(145deg, #fde68a, ${hColor}, #92400e, ${hColor}, #fde68a)`, backgroundSize:'400% 400%',
            animation: !flipping ? 'cf-shimmer 3s linear infinite' : 'none',
            border:'4px ridge rgba(255,255,255,0.25)',
            boxShadow:'inset 0 -6px 12px rgba(0,0,0,0.4), inset 0 6px 12px rgba(255,255,255,0.3), 0 10px 30px rgba(0,0,0,0.4)',
            transform:'translateZ(4px)',
          })}>{faceContent('heads')}</div>
          <div style={face({
            background:`linear-gradient(145deg, #bfdbfe, ${tColor}, #1e3a5f, ${tColor}, #bfdbfe)`, backgroundSize:'400% 400%',
            animation: !flipping ? 'cf-shimmer 3s linear infinite' : 'none',
            border:'4px ridge rgba(255,255,255,0.25)',
            boxShadow:'inset 0 -6px 12px rgba(0,0,0,0.4), inset 0 6px 12px rgba(255,255,255,0.3), 0 10px 30px rgba(0,0,0,0.4)',
            transform:'rotateY(180deg) translateZ(4px)',
          })}>{faceContent('tails')}</div>
          {edgeSlices('#92400e', '#d4a017')}
        </div>
      </div>
      <GroundShadow />
      {!flipping && c.result && (
        <div style={{ fontSize:'clamp(10px,3.8cqi,18px)', fontWeight:800, textTransform:'uppercase',
          background:`linear-gradient(90deg, ${isHeads?hColor:tColor}, #fff, ${isHeads?hColor:tColor})`,
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundSize:'200%',
          animation:'cf-shimmer 2s linear infinite' }}>
          {c.result === 'heads' ? hLabel : tLabel}
        </div>
      )}
      {status === 'result' && <BetsBar />}
    </div>
  );
}
