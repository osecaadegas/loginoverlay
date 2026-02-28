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
  const flipping = c.flipping;

  /* shared 3D keyframes */
  const kf3d = `
    @keyframes cf-3d-flip{
      0%{transform:rotateX(0) rotateY(0) translateY(0)}
      15%{transform:rotateX(20deg) rotateY(180deg) translateY(-40px)}
      30%{transform:rotateX(-10deg) rotateY(540deg) translateY(-60px)}
      50%{transform:rotateX(15deg) rotateY(900deg) translateY(-80px)}
      70%{transform:rotateX(-5deg) rotateY(1260deg) translateY(-40px)}
      85%{transform:rotateX(3deg) rotateY(1620deg) translateY(-10px)}
      100%{transform:rotateX(0) rotateY(${isHeads ? 1800 : 1980}deg) translateY(0)}
    }
    @keyframes cf-shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
    @keyframes cf-land{0%{transform:scale(1.1);opacity:0.8}100%{transform:scale(1);opacity:1}}
  `;

  const faceContent = (side) => {
    const img = side === 'heads' ? hImg : tImg;
    const label = side === 'heads' ? hLabel : tLabel;
    if (img) return <img src={img} alt={label} style={{ width:'70%', height:'70%', objectFit:'contain', borderRadius:'50%' }} />;
    return <span style={{ fontSize:'clamp(16px,6vw,32px)', fontWeight:900, color:'#fff', textShadow:'0 2px 4px rgba(0,0,0,0.4)', letterSpacing:'0.05em' }}>{label}</span>;
  };

  /* ─── v1  Realistic 3D Gold Coin ─── */
  if (st === 'v1') {
    const faceColor = isHeads ? hColor : tColor;
    return (
      <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, fontFamily:font, perspective:600, background:'transparent' }}>
        <style>{kf3d}</style>
        <div style={{
          width:'min(65%,140px)', aspectRatio:'1', position:'relative',
          transformStyle:'preserve-3d',
          animation: flipping ? 'cf-3d-flip 2s cubic-bezier(.25,.46,.45,.94) forwards' : 'cf-land 0.3s ease-out',
        }}>
          {/* Heads face */}
          <div style={{
            position:'absolute', inset:0, borderRadius:'50%', backfaceVisibility:'hidden',
            background:`radial-gradient(ellipse at 30% 30%, ${hColor}ee, ${hColor}88 50%, ${hColor}55)`,
            backgroundSize:'200% 200%',
            border:'4px solid rgba(255,255,255,0.2)',
            boxShadow:`inset 0 -4px 8px rgba(0,0,0,0.3), inset 0 4px 8px rgba(255,255,255,0.2), 0 8px 24px ${hColor}33`,
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>{faceContent('heads')}</div>
          {/* Tails face */}
          <div style={{
            position:'absolute', inset:0, borderRadius:'50%', backfaceVisibility:'hidden',
            transform:'rotateY(180deg)',
            background:`radial-gradient(ellipse at 30% 30%, ${tColor}ee, ${tColor}88 50%, ${tColor}55)`,
            border:'4px solid rgba(255,255,255,0.2)',
            boxShadow:`inset 0 -4px 8px rgba(0,0,0,0.3), inset 0 4px 8px rgba(255,255,255,0.2), 0 8px 24px ${tColor}33`,
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>{faceContent('tails')}</div>
          {/* Edge ring */}
          <div style={{
            position:'absolute', inset:'-2px', borderRadius:'50%', border:'3px solid rgba(255,255,255,0.08)',
            background:'transparent', pointerEvents:'none',
          }} />
        </div>
        {!flipping && c.result && (
          <div style={{ fontSize:14, fontWeight:800, color:faceColor, textTransform:'uppercase', textAlign:'center',
            textShadow:`0 0 10px ${faceColor}66`, letterSpacing:'0.1em' }}>
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
      <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, fontFamily:font, perspective:600, background:'transparent' }}>
        <style>{kf3d}</style>
        <div style={{
          width:'min(65%,140px)', aspectRatio:'1', position:'relative', transformStyle:'preserve-3d',
          animation: flipping ? 'cf-3d-flip 2s cubic-bezier(.25,.46,.45,.94) forwards' : 'cf-land 0.3s ease-out',
          filter: `drop-shadow(0 0 20px ${glowColor}66)`,
        }}>
          <div style={{
            position:'absolute', inset:0, borderRadius:'50%', backfaceVisibility:'hidden',
            background:`radial-gradient(circle at 35% 35%, #1a1a2e, #0d0d14)`,
            border:`3px solid ${hColor}`, boxShadow:`0 0 30px ${hColor}44, inset 0 0 20px ${hColor}22`,
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>{faceContent('heads')}</div>
          <div style={{
            position:'absolute', inset:0, borderRadius:'50%', backfaceVisibility:'hidden', transform:'rotateY(180deg)',
            background:`radial-gradient(circle at 35% 35%, #1a1a2e, #0d0d14)`,
            border:`3px solid ${tColor}`, boxShadow:`0 0 30px ${tColor}44, inset 0 0 20px ${tColor}22`,
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>{faceContent('tails')}</div>
        </div>
        {!flipping && c.result && (
          <div style={{ fontSize:16, fontWeight:900, color:glowColor, textShadow:`0 0 16px ${glowColor}`, letterSpacing:'0.15em', textTransform:'uppercase' }}>
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
      <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, fontFamily:font, background:'transparent' }}>
        <style>{`@keyframes cf-flat-flip{0%{transform:scaleX(1)}50%{transform:scaleX(0)}100%{transform:scaleX(1)}}`}</style>
        <div style={{
          width:'min(55%,120px)', aspectRatio:'1', borderRadius:'50%',
          background:bg, display:'flex', alignItems:'center', justifyContent:'center',
          animation: flipping ? 'cf-flat-flip 0.6s ease-in-out infinite' : 'none',
          transition:'background 0.3s',
        }}>{faceContent(isHeads ? 'heads' : 'tails')}</div>
        {!flipping && c.result && (
          <div style={{ fontSize:13, fontWeight:700, color:text, textTransform:'uppercase' }}>
            {c.result === 'heads' ? hLabel : tLabel}
          </div>
        )}
      </div>
    );
  }

  /* ─── v4  Metallic Casino ─── */
  const metalGrad = isHeads
    ? `linear-gradient(145deg, #fde68a, ${hColor}, #92400e, ${hColor}, #fde68a)`
    : `linear-gradient(145deg, #bfdbfe, ${tColor}, #1e3a5f, ${tColor}, #bfdbfe)`;
  return (
    <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, fontFamily:font, perspective:600, background:'transparent' }}>
      <style>{kf3d}</style>
      <div style={{
        width:'min(60%,130px)', aspectRatio:'1', position:'relative', transformStyle:'preserve-3d',
        animation: flipping ? 'cf-3d-flip 2s cubic-bezier(.25,.46,.45,.94) forwards' : 'cf-land 0.3s ease-out',
      }}>
        <div style={{
          position:'absolute', inset:0, borderRadius:'50%', backfaceVisibility:'hidden',
          background:`linear-gradient(145deg, #fde68a, ${hColor}, #92400e, ${hColor}, #fde68a)`, backgroundSize:'400% 400%',
          animation: !flipping ? 'cf-shimmer 3s linear infinite' : 'none',
          border:'4px ridge rgba(255,255,255,0.3)',
          boxShadow:'inset 0 -6px 12px rgba(0,0,0,0.4), inset 0 6px 12px rgba(255,255,255,0.3), 0 10px 30px rgba(0,0,0,0.4)',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>{faceContent('heads')}</div>
        <div style={{
          position:'absolute', inset:0, borderRadius:'50%', backfaceVisibility:'hidden', transform:'rotateY(180deg)',
          background:`linear-gradient(145deg, #bfdbfe, ${tColor}, #1e3a5f, ${tColor}, #bfdbfe)`, backgroundSize:'400% 400%',
          animation: !flipping ? 'cf-shimmer 3s linear infinite' : 'none',
          border:'4px ridge rgba(255,255,255,0.3)',
          boxShadow:'inset 0 -6px 12px rgba(0,0,0,0.4), inset 0 6px 12px rgba(255,255,255,0.3), 0 10px 30px rgba(0,0,0,0.4)',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>{faceContent('tails')}</div>
      </div>
      {!flipping && c.result && (
        <div style={{ fontSize:14, fontWeight:800, color:isHeads?hColor:tColor, textTransform:'uppercase',
          background:`linear-gradient(90deg, ${isHeads?hColor:tColor}, #fff, ${isHeads?hColor:tColor})`,
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundSize:'200%',
          animation:'cf-shimmer 2s linear infinite' }}>
          {c.result === 'heads' ? hLabel : tLabel}
        </div>
      )}
    </div>
  );
}
