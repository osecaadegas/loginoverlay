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

  /* ── Enhanced 3D keyframes with parabolic arc ── */
  const END = isHeads ? 3600 : 3780;
  const r = (f) => Math.round(END * f);
  /* Resting rotation so coin shows the correct face when stopped */
  const flipRest = isHeads ? 'rotateY(0deg)' : 'rotateY(180deg)';

  const kf3d = `
    @keyframes cf-3d-flip{
      0%  {transform:rotateY(0deg) rotateX(0deg) translateY(0)}
      6%  {transform:rotateY(${r(.06)}deg) rotateX(12deg) translateY(-35%)}
      14% {transform:rotateY(${r(.14)}deg) rotateX(-8deg) translateY(-75%)}
      24% {transform:rotateY(${r(.24)}deg) rotateX(10deg) translateY(-110%)}
      38% {transform:rotateY(${r(.38)}deg) rotateX(-6deg) translateY(-130%)}
      52% {transform:rotateY(${r(.52)}deg) rotateX(5deg) translateY(-115%)}
      66% {transform:rotateY(${r(.66)}deg) rotateX(-4deg) translateY(-80%)}
      78% {transform:rotateY(${r(.78)}deg) rotateX(3deg) translateY(-40%)}
      88% {transform:rotateY(${r(.88)}deg) rotateX(-1.5deg) translateY(-10%)}
      94% {transform:rotateY(${r(.94)}deg) rotateX(.5deg) translateY(4%)}
      97% {transform:rotateY(${r(.97)}deg) rotateX(-.3deg) translateY(-2%)}
      100%{transform:rotateY(${END}deg) rotateX(0deg) translateY(0)}
    }
    @keyframes cf-shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
    @keyframes cf-land{0%{transform:${flipRest} scale(1.12);opacity:.85}40%{transform:${flipRest} scale(.96)}70%{transform:${flipRest} scale(1.02)}100%{transform:${flipRest} scale(1);opacity:1}}
    @keyframes cf-flat-flip{0%{transform:scaleX(1)}25%{transform:scaleX(0)}50%{transform:scaleX(1)}75%{transform:scaleX(0)}100%{transform:scaleX(1)}}
  `;

  /* Responsive face content – uses container-query units */
  const faceContent = (side) => {
    const img = side === 'heads' ? hImg : tImg;
    const label = side === 'heads' ? hLabel : tLabel;
    if (img) return <img src={img} alt={label} style={{ width:'65%', height:'65%', objectFit:'contain', borderRadius:'50%' }} />;
    return <span style={{ fontSize:'clamp(8px,7cqi,32px)', fontWeight:900, color:'#fff', textShadow:'0 2px 4px rgba(0,0,0,0.4)', letterSpacing:'0.05em', lineHeight:1.1, textAlign:'center' }}>{label}</span>;
  };

  /* Shared style helpers */
  const coinBox = { width:'55%', maxHeight:'72%', aspectRatio:'1', position:'relative', transformStyle:'preserve-3d', flexShrink:0, transform: c.result ? flipRest : 'none' };
  const face = (extra) => ({ position:'absolute', inset:0, borderRadius:'50%', backfaceVisibility:'hidden', display:'flex', alignItems:'center', justifyContent:'center', ...extra });
  const ani3d = flipping ? 'cf-3d-flip 2.2s cubic-bezier(.22,.68,.36,1) forwards' : (c.result ? 'cf-land 0.35s ease-out forwards' : 'none');

  /* ─── v1  Realistic 3D Gold Coin ─── */
  if (st === 'v1') {
    return (
      <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'3%', fontFamily:font, perspective:'600px', background:'transparent', containerType:'inline-size' }}>
        <style>{kf3d}</style>
        <div style={{ ...coinBox, animation:ani3d, filter:'drop-shadow(0 6px 16px rgba(0,0,0,0.35))' }}>
          <div style={face({
            background:`radial-gradient(ellipse at 30% 30%, ${hColor}ee, ${hColor}88 50%, ${hColor}55)`,
            border:'3px solid rgba(255,255,255,0.2)',
            boxShadow:`inset 0 -4px 8px rgba(0,0,0,0.3), inset 0 4px 8px rgba(255,255,255,0.2), 0 8px 24px ${hColor}33`,
          })}>{faceContent('heads')}</div>
          <div style={face({
            transform:'rotateY(180deg)',
            background:`radial-gradient(ellipse at 30% 30%, ${tColor}ee, ${tColor}88 50%, ${tColor}55)`,
            border:'3px solid rgba(255,255,255,0.2)',
            boxShadow:`inset 0 -4px 8px rgba(0,0,0,0.3), inset 0 4px 8px rgba(255,255,255,0.2), 0 8px 24px ${tColor}33`,
          })}>{faceContent('tails')}</div>
          <div style={{ position:'absolute', inset:'-2px', borderRadius:'50%', border:'2px solid rgba(255,255,255,0.08)', background:'transparent', pointerEvents:'none' }} />
        </div>
        {!flipping && c.result && (
          <div style={{ fontSize:'clamp(10px,4cqi,20px)', fontWeight:800, color:isHeads?hColor:tColor, textTransform:'uppercase', textAlign:'center',
            textShadow:`0 0 10px ${(isHeads?hColor:tColor)}66`, letterSpacing:'0.1em' }}>
            {c.result === 'heads' ? hLabel : tLabel}
          </div>
        )}
      </div>
    );
  }

  /* ─── v2  Neon Glow 3D ─── */
  if (st === 'v2') {
    const glowColor = isHeads ? hColor : tColor;
    return (
      <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'3%', fontFamily:font, perspective:'600px', background:'transparent', containerType:'inline-size' }}>
        <style>{kf3d}</style>
        <div style={{ ...coinBox, animation:ani3d, filter:`drop-shadow(0 0 20px ${glowColor}66)` }}>
          <div style={face({
            background:'radial-gradient(circle at 35% 35%, #1a1a2e, #0d0d14)',
            border:`3px solid ${hColor}`, boxShadow:`0 0 30px ${hColor}44, inset 0 0 20px ${hColor}22`,
          })}>{faceContent('heads')}</div>
          <div style={face({
            transform:'rotateY(180deg)',
            background:'radial-gradient(circle at 35% 35%, #1a1a2e, #0d0d14)',
            border:`3px solid ${tColor}`, boxShadow:`0 0 30px ${tColor}44, inset 0 0 20px ${tColor}22`,
          })}>{faceContent('tails')}</div>
        </div>
        {!flipping && c.result && (
          <div style={{ fontSize:'clamp(10px,4.5cqi,22px)', fontWeight:900, color:glowColor, textShadow:`0 0 16px ${glowColor}`, letterSpacing:'0.15em', textTransform:'uppercase' }}>
            {c.result === 'heads' ? hLabel : tLabel}
          </div>
        )}
      </div>
    );
  }

  /* ─── v3  Minimal Flat ─── */
  if (st === 'v3') {
    const bg = isHeads ? hColor : tColor;
    return (
      <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'2%', fontFamily:font, background:'transparent', containerType:'inline-size' }}>
        <style>{kf3d}</style>
        <div style={{
          width:'48%', maxHeight:'70%', aspectRatio:'1', borderRadius:'50%', flexShrink:0,
          background:bg, display:'flex', alignItems:'center', justifyContent:'center',
          animation: flipping ? 'cf-flat-flip 0.55s ease-in-out 3 forwards' : 'none',
          transition:'background 0.3s',
        }}>{faceContent(isHeads ? 'heads' : 'tails')}</div>
        {!flipping && c.result && (
          <div style={{ fontSize:'clamp(10px,3.5cqi,18px)', fontWeight:700, color:text, textTransform:'uppercase' }}>
            {c.result === 'heads' ? hLabel : tLabel}
          </div>
        )}
      </div>
    );
  }

  /* ─── v4  Metallic Casino ─── */
  return (
    <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'3%', fontFamily:font, perspective:'600px', background:'transparent', containerType:'inline-size' }}>
      <style>{kf3d}</style>
      <div style={{ ...coinBox, width:'52%', animation:ani3d, filter:'drop-shadow(0 8px 20px rgba(0,0,0,0.4))' }}>
        <div style={face({
          background:`linear-gradient(145deg, #fde68a, ${hColor}, #92400e, ${hColor}, #fde68a)`, backgroundSize:'400% 400%',
          animation: !flipping ? 'cf-shimmer 3s linear infinite' : 'none',
          border:'3px ridge rgba(255,255,255,0.3)',
          boxShadow:'inset 0 -6px 12px rgba(0,0,0,0.4), inset 0 6px 12px rgba(255,255,255,0.3), 0 10px 30px rgba(0,0,0,0.4)',
        })}>{faceContent('heads')}</div>
        <div style={face({
          transform:'rotateY(180deg)',
          background:`linear-gradient(145deg, #bfdbfe, ${tColor}, #1e3a5f, ${tColor}, #bfdbfe)`, backgroundSize:'400% 400%',
          animation: !flipping ? 'cf-shimmer 3s linear infinite' : 'none',
          border:'3px ridge rgba(255,255,255,0.3)',
          boxShadow:'inset 0 -6px 12px rgba(0,0,0,0.4), inset 0 6px 12px rgba(255,255,255,0.3), 0 10px 30px rgba(0,0,0,0.4)',
        })}>{faceContent('tails')}</div>
      </div>
      {!flipping && c.result && (
        <div style={{ fontSize:'clamp(10px,3.8cqi,18px)', fontWeight:800, textTransform:'uppercase',
          background:`linear-gradient(90deg, ${isHeads?hColor:tColor}, #fff, ${isHeads?hColor:tColor})`,
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundSize:'200%',
          animation:'cf-shimmer 2s linear infinite' }}>
          {c.result === 'heads' ? hLabel : tLabel}
        </div>
      )}
    </div>
  );
}
