import React from 'react';

const COLORS = ['#ef4444','#f59e0b','#22c55e','#3b82f6','#8b5cf6','#ec4899','#06b6d4','#f97316'];

function WheelOfNamesWidget({ config }) {
  const c = config || {};
  const st = c.displayStyle || 'v1';
  const accent = c.accentColor || '#f59e0b';
  const text   = c.textColor   || '#ffffff';
  const muted  = c.mutedColor  || '#94a3b8';
  const font   = c.fontFamily  || "'Inter', sans-serif";
  const entries = c.entries || [];
  /* Guard transient flag */
  const spinning = c.spinning && c._spinStart && (Date.now() - c._spinStart < 8000);

  const conic = entries.length > 0
    ? `conic-gradient(${entries.map((_,i) => `${COLORS[i%COLORS.length]} ${(i/entries.length)*100}% ${((i+1)/entries.length)*100}%`).join(', ')})`
    : 'rgba(255,255,255,0.06)';

  const kf = `@keyframes whl-spin{0%{transform:rotate(0)}100%{transform:rotate(1800deg)}}`;

  /* ─── v1  Classic (no bg) ─── */
  if (st === 'v1') return (
    <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'3%', fontFamily:font, padding:'3%', background:'transparent', containerType:'inline-size' }}>
      <style>{kf}</style>
      <div style={{ position:'relative', width:'min(85%,85cqmin)', aspectRatio:'1', borderRadius:'50%', flexShrink:0,
        background:conic, border:'3px solid rgba(255,255,255,0.15)', boxShadow:'0 0 20px rgba(0,0,0,0.4),inset 0 0 20px rgba(0,0,0,0.2)',
        animation:spinning?'whl-spin 3s cubic-bezier(.17,.67,.16,1) forwards':'none', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ width:'20%', aspectRatio:'1', borderRadius:'50%', background:'#1a1a2e', border:'2px solid rgba(255,255,255,0.2)',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:'clamp(8px,4cqi,18px)', fontWeight:700, color:text, zIndex:2 }}>
          {entries.length||'🎡'}
        </div>
        <div style={{ position:'absolute', top:'-4%', left:'50%', transform:'translateX(-50%)', width:0, height:0,
          borderLeft:'clamp(5px,2cqi,10px) solid transparent', borderRight:'clamp(5px,2cqi,10px) solid transparent', borderTop:`clamp(8px,3cqi,14px) solid ${accent}`,
          filter:'drop-shadow(0 2px 4px rgba(0,0,0,.5))', zIndex:3 }} />
      </div>
      {c.winner && <div style={{ fontSize:'clamp(10px,4.5cqi,22px)', fontWeight:800, color:accent, textAlign:'center', padding:'1.5% 5%',
        background:`${accent}15`, borderRadius:'clamp(4px,1.5cqi,8px)', border:`1px solid ${accent}30` }}>🎉 {c.winner}</div>}
      {entries.length===0 && !c.winner && <div style={{ fontSize:'clamp(8px,3cqi,14px)', color:muted }}>Add entries to spin</div>}
    </div>
  );

  /* ─── v2  Neon Glow ─── */
  if (st === 'v2') return (
    <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'3%', fontFamily:font, padding:'3%', background:'transparent', containerType:'inline-size' }}>
      <style>{kf}</style>
      <div style={{ position:'relative', width:'min(80%,80cqmin)', aspectRatio:'1', borderRadius:'50%', flexShrink:0,
        background:conic, border:`3px solid ${accent}`, boxShadow:`0 0 30px ${accent}55, 0 0 60px ${accent}22`,
        animation:spinning?'whl-spin 3s cubic-bezier(.17,.67,.16,1) forwards':'none', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ width:'22%', aspectRatio:'1', borderRadius:'50%', background:'#0d0d14', border:`2px solid ${accent}66`,
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:'clamp(9px,4cqi,20px)', fontWeight:900, color:accent,
          textShadow:`0 0 8px ${accent}`, zIndex:2 }}>{entries.length||'⚡'}</div>
        <div style={{ position:'absolute', top:'-5%', left:'50%', transform:'translateX(-50%)', width:0, height:0,
          borderLeft:'clamp(6px,2.5cqi,12px) solid transparent', borderRight:'clamp(6px,2.5cqi,12px) solid transparent', borderTop:`clamp(9px,3.5cqi,16px) solid ${accent}`,
          filter:`drop-shadow(0 0 6px ${accent})`, zIndex:3 }} />
      </div>
      {c.winner && <div style={{ fontSize:'clamp(12px,5cqi,24px)', fontWeight:900, color:accent, textShadow:`0 0 16px ${accent}88`, textAlign:'center' }}>🎉 {c.winner}</div>}
    </div>
  );

  /* ─── v3  Minimal (no bg) ─── */
  if (st === 'v3') return (
    <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'2%', fontFamily:font, padding:'3%', background:'transparent', containerType:'inline-size' }}>
      <style>{kf}</style>
      <div style={{ position:'relative', width:'min(75%,75cqmin)', aspectRatio:'1', borderRadius:'50%', flexShrink:0,
        background:conic, border:'2px solid rgba(255,255,255,0.08)',
        animation:spinning?'whl-spin 3s cubic-bezier(.17,.67,.16,1) forwards':'none', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ width:'18%', aspectRatio:'1', borderRadius:'50%', background:'rgba(0,0,0,0.6)',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:'clamp(8px,3.5cqi,16px)', fontWeight:700, color:text, zIndex:2 }}>{entries.length}</div>
        <div style={{ position:'absolute', top:'-3%', left:'50%', transform:'translateX(-50%)', width:0, height:0,
          borderLeft:'clamp(4px,1.5cqi,8px) solid transparent', borderRight:'clamp(4px,1.5cqi,8px) solid transparent', borderTop:`clamp(6px,2.5cqi,12px) solid ${text}`, zIndex:3 }} />
      </div>
      {c.winner && <div style={{ fontSize:'clamp(10px,4cqi,18px)', fontWeight:700, color:text }}>{c.winner}</div>}
    </div>
  );

  /* ─── v4  Flat / Pastel ─── */
  const pastel = ['#fca5a5','#fcd34d','#86efac','#93c5fd','#c4b5fd','#f9a8d4','#67e8f9','#fdba74'];
  const conicP = entries.length > 0
    ? `conic-gradient(${entries.map((_,i) => `${pastel[i%pastel.length]} ${(i/entries.length)*100}% ${((i+1)/entries.length)*100}%`).join(', ')})`
    : 'rgba(255,255,255,0.06)';
  return (
    <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'3%', fontFamily:font, padding:'3%', background:'transparent', containerType:'inline-size' }}>
      <style>{kf}</style>
      <div style={{ position:'relative', width:'min(80%,80cqmin)', aspectRatio:'1', borderRadius:'50%', flexShrink:0,
        background:conicP, border:'3px solid rgba(255,255,255,0.1)',
        animation:spinning?'whl-spin 3s cubic-bezier(.17,.67,.16,1) forwards':'none', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ width:'24%', aspectRatio:'1', borderRadius:'50%', background:'#fff', border:'2px solid rgba(0,0,0,0.06)',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:'clamp(9px,4cqi,20px)', fontWeight:800, color:'#334155', zIndex:2 }}>{entries.length||'🎡'}</div>
        <div style={{ position:'absolute', top:'-4%', left:'50%', transform:'translateX(-50%)', width:0, height:0,
          borderLeft:'clamp(5px,2cqi,10px) solid transparent', borderRight:'clamp(5px,2cqi,10px) solid transparent', borderTop:'clamp(8px,3cqi,14px) solid #334155', zIndex:3 }} />
      </div>
      {c.winner && <div style={{ padding:'2% 6%', borderRadius:20, background:'#fff', color:'#334155', fontSize:'clamp(10px,4cqi,18px)', fontWeight:800 }}>🎉 {c.winner}</div>}
    </div>
  );
}

export default React.memo(WheelOfNamesWidget);
