import React from 'react';

export default function RandomSlotPickerWidget({ config }) {
  const c = config || {};
  const st = c.displayStyle || 'v1';
  const accent = c.accentColor || '#f59e0b';
  const text   = c.textColor   || '#ffffff';
  const muted  = c.mutedColor  || '#94a3b8';
  const font   = c.fontFamily  || "'Inter', sans-serif";
  /* Guard transient flag */
  const picking = c.picking && c._pickStart && (Date.now() - c._pickStart < 5000);
  const slot    = c.pickedSlot || c.selectedSlot;

  const emptyState = (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'3%', color:muted,
      animation:picking?'rsp-pulse 0.3s ease-in-out infinite':'none' }}>
      <span style={{ fontSize:'clamp(18px,8cqi,42px)' }}>🎲</span>
      <span style={{ fontSize:'clamp(8px,3cqi,14px)', fontWeight:600 }}>Add slots to pick</span>
    </div>
  );

  const kf = `
    @keyframes rsp-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
    @keyframes rsp-glow{0%,100%{box-shadow:0 0 10px ${accent}33}50%{box-shadow:0 0 30px ${accent}66}}
    @keyframes rsp-shine{0%{background-position:-200% center}100%{background-position:200% center}}
  `;

  /* ─── v1  Classic Card ─── */
  if (st === 'v1') return (
    <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'3%', fontFamily:font, padding:'3%', background:'transparent', containerType:'inline-size' }}>
      <style>{kf}</style>
      {slot ? (
        <>
          <div style={{ width:'75%', maxHeight:'60%', aspectRatio:'16/10', borderRadius:'clamp(6px,2.5cqi,14px)', overflow:'hidden',
            border:`2px solid ${accent}`, boxShadow:`0 4px 20px ${accent}33`, flexShrink:0,
            animation:picking?'rsp-pulse 0.4s ease-in-out infinite':'none' }}>
            {slot.image ? <img src={slot.image} alt={slot.name} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
              : <div style={{ width:'100%', height:'100%', background:'rgba(255,255,255,0.04)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'clamp(18px,8cqi,42px)' }}>🎰</div>}
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:'clamp(10px,4.5cqi,22px)', fontWeight:800, color:text }}>{slot.name}</div>
            {slot.provider && <div style={{ fontSize:'clamp(8px,3cqi,14px)', color:muted, marginTop:'1%' }}>{slot.provider}</div>}
          </div>
        </>
      ) : emptyState}
    </div>
  );

  /* ─── v2  Neon ─── */
  if (st === 'v2') return (
    <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'3%', fontFamily:font, padding:'3%', background:'transparent', containerType:'inline-size' }}>
      <style>{kf}</style>
      {slot ? (
        <>
          <div style={{ width:'55%', maxHeight:'55%', aspectRatio:'1', borderRadius:'50%', overflow:'hidden', flexShrink:0,
            border:`3px solid ${accent}`, boxShadow:`0 0 24px ${accent}44`,
            animation:picking?'rsp-pulse 0.4s ease-in-out infinite':'rsp-glow 2s ease-in-out infinite' }}>
            {slot.image ? <img src={slot.image} alt={slot.name} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
              : <div style={{ width:'100%', height:'100%', background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'clamp(18px,8cqi,42px)' }}>🎰</div>}
          </div>
          <div style={{ fontSize:'clamp(11px,4.5cqi,22px)', fontWeight:900, color:text, textShadow:`0 0 10px ${accent}66`, textAlign:'center' }}>{slot.name}</div>
          {slot.provider && <div style={{ fontSize:'clamp(7px,2.5cqi,12px)', color:accent, letterSpacing:'0.1em', textTransform:'uppercase' }}>{slot.provider}</div>}
        </>
      ) : emptyState}
    </div>
  );

  /* ─── v3  Minimal ─── */
  if (st === 'v3') return (
    <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:font, padding:'3%', background:'transparent', containerType:'inline-size' }}>
      <style>{kf}</style>
      {slot ? (
        <div style={{ display:'flex', alignItems:'center', gap:'4%',
          animation:picking?'rsp-pulse 0.3s ease-in-out infinite':'none' }}>
          {slot.image && <img src={slot.image} alt={slot.name} style={{ width:'18%', maxHeight:'70%', aspectRatio:'1', borderRadius:'clamp(4px,2cqi,10px)', objectFit:'cover' }} />}
          <div>
            <div style={{ fontSize:'clamp(11px,4.5cqi,22px)', fontWeight:800, color:text }}>{slot.name}</div>
            {slot.provider && <div style={{ fontSize:'clamp(8px,3cqi,14px)', color:muted }}>{slot.provider}</div>}
          </div>
        </div>
      ) : emptyState}
    </div>
  );

  /* ─── v4  Showcase ─── */
  return (
    <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'3%', fontFamily:font, padding:'3%', background:'transparent', containerType:'inline-size' }}>
      <style>{kf}</style>
      {slot ? (
        <>
          <div style={{ width:'85%', maxHeight:'65%', aspectRatio:'16/9', borderRadius:'clamp(8px,3cqi,16px)', overflow:'hidden', flexShrink:0,
            border:'3px solid rgba(255,255,255,0.1)', position:'relative',
            boxShadow:`0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${accent}22`,
            animation:picking?'rsp-pulse 0.4s ease-in-out infinite':'none' }}>
            {slot.image ? <img src={slot.image} alt={slot.name} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
              : <div style={{ width:'100%', height:'100%', background:'linear-gradient(135deg, #1a1a2e, #0d0d14)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'clamp(22px,10cqi,52px)' }}>🎰</div>}
            <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'50%',
              background:'linear-gradient(transparent, rgba(0,0,0,0.8))' }} />
            <div style={{ position:'absolute', bottom:'6%', left:'5%', right:'5%' }}>
              <div style={{ fontSize:'clamp(10px,4cqi,18px)', fontWeight:800, color:'#fff', textShadow:'0 2px 6px rgba(0,0,0,0.6)' }}>{slot.name}</div>
              {slot.provider && <div style={{ fontSize:'clamp(7px,2.5cqi,12px)', color:'rgba(255,255,255,0.7)' }}>{slot.provider}</div>}
            </div>
          </div>
          <div style={{
            fontSize:'clamp(7px,2.5cqi,12px)', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase',
            background:`linear-gradient(90deg, ${accent}, #fde68a, ${accent})`, backgroundSize:'200%',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
            animation:'rsp-shine 3s linear infinite',
          }}>PICKED SLOT</div>
        </>
      ) : emptyState}
    </div>
  );
}
