import React from 'react';

export default function RandomSlotPickerWidget({ config }) {
  const c = config || {};
  const st = c.displayStyle || 'v1';
  const accent = c.accentColor || '#f59e0b';
  const text   = c.textColor   || '#ffffff';
  const muted  = c.mutedColor  || '#94a3b8';
  const font   = c.fontFamily  || "'Inter', sans-serif";
  const picking = c.picking;
  const slot    = c.pickedSlot || c.selectedSlot;

  const emptyState = (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, color:muted,
      animation:picking?'rsp-pulse 0.3s ease-in-out infinite':'none' }}>
      <span style={{ fontSize:32 }}>🎲</span>
      <span style={{ fontSize:12, fontWeight:600 }}>Add slots to pick</span>
    </div>
  );

  /* ─── v1  Classic Card ─── */
  if (st === 'v1') return (
    <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, fontFamily:font, padding:10, background:'transparent' }}>
      <style>{`@keyframes rsp-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}`}</style>
      {slot ? (
        <>
          <div style={{ width:'min(80%,160px)', aspectRatio:'16/10', borderRadius:10, overflow:'hidden',
            border:`2px solid ${accent}`, boxShadow:`0 4px 20px ${accent}33`,
            animation:picking?'rsp-pulse 0.4s ease-in-out infinite':'none' }}>
            {slot.image ? <img src={slot.image} alt={slot.name} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
              : <div style={{ width:'100%', height:'100%', background:'rgba(255,255,255,0.04)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32 }}>🎰</div>}
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:15, fontWeight:800, color:text }}>{slot.name}</div>
            {slot.provider && <div style={{ fontSize:11, color:muted, marginTop:1 }}>{slot.provider}</div>}
          </div>
        </>
      ) : emptyState}
    </div>
  );

  /* ─── v2  Neon ─── */
  if (st === 'v2') return (
    <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, fontFamily:font, padding:10, background:'transparent' }}>
      <style>{`@keyframes rsp-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}@keyframes rsp-glow{0%,100%{box-shadow:0 0 10px ${accent}33}50%{box-shadow:0 0 30px ${accent}66}}`}</style>
      {slot ? (
        <>
          <div style={{ width:'min(75%,150px)', aspectRatio:'1', borderRadius:'50%', overflow:'hidden',
            border:`3px solid ${accent}`, boxShadow:`0 0 24px ${accent}44`,
            animation:picking?'rsp-pulse 0.4s ease-in-out infinite':'rsp-glow 2s ease-in-out infinite' }}>
            {slot.image ? <img src={slot.image} alt={slot.name} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
              : <div style={{ width:'100%', height:'100%', background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32 }}>🎰</div>}
          </div>
          <div style={{ fontSize:16, fontWeight:900, color:text, textShadow:`0 0 10px ${accent}66`, textAlign:'center' }}>{slot.name}</div>
          {slot.provider && <div style={{ fontSize:10, color:accent, letterSpacing:'0.1em', textTransform:'uppercase' }}>{slot.provider}</div>}
        </>
      ) : emptyState}
    </div>
  );

  /* ─── v3  Minimal ─── */
  if (st === 'v3') return (
    <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:font, padding:10, background:'transparent' }}>
      <style>{`@keyframes rsp-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}`}</style>
      {slot ? (
        <div style={{ display:'flex', alignItems:'center', gap:10,
          animation:picking?'rsp-pulse 0.3s ease-in-out infinite':'none' }}>
          {slot.image && <img src={slot.image} alt={slot.name} style={{ width:40, height:40, borderRadius:8, objectFit:'cover' }} />}
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:text }}>{slot.name}</div>
            {slot.provider && <div style={{ fontSize:11, color:muted }}>{slot.provider}</div>}
          </div>
        </div>
      ) : emptyState}
    </div>
  );

  /* ─── v4  Showcase ─── */
  return (
    <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, fontFamily:font, padding:10, background:'transparent' }}>
      <style>{`@keyframes rsp-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}@keyframes rsp-shine{0%{background-position:-200% center}100%{background-position:200% center}}`}</style>
      {slot ? (
        <>
          <div style={{ width:'min(90%,200px)', aspectRatio:'16/9', borderRadius:14, overflow:'hidden',
            border:`3px solid rgba(255,255,255,0.1)`, position:'relative',
            boxShadow:`0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${accent}22`,
            animation:picking?'rsp-pulse 0.4s ease-in-out infinite':'none' }}>
            {slot.image ? <img src={slot.image} alt={slot.name} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
              : <div style={{ width:'100%', height:'100%', background:'linear-gradient(135deg, #1a1a2e, #0d0d14)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:40 }}>🎰</div>}
            {/* Gradient overlay */}
            <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'50%',
              background:'linear-gradient(transparent, rgba(0,0,0,0.8))' }} />
            <div style={{ position:'absolute', bottom:8, left:10, right:10 }}>
              <div style={{ fontSize:14, fontWeight:800, color:'#fff', textShadow:'0 2px 6px rgba(0,0,0,0.6)' }}>{slot.name}</div>
              {slot.provider && <div style={{ fontSize:10, color:'rgba(255,255,255,0.7)' }}>{slot.provider}</div>}
            </div>
          </div>
          <div style={{
            fontSize:10, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase',
            background:`linear-gradient(90deg, ${accent}, #fde68a, ${accent})`, backgroundSize:'200%',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
            animation:'rsp-shine 3s linear infinite',
          }}>PICKED SLOT</div>
        </>
      ) : emptyState}
    </div>
  );
}
