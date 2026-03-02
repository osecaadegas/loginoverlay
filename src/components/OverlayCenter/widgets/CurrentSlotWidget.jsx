import React from 'react';

/* ───────────── helpers ───────────── */
const hex2rgb = (h) => { const m = h?.replace('#','').match(/.{2}/g); return m ? m.map(x=>parseInt(x,16)).join(',') : '255,255,255'; };

function CurrentSlotWidget({ config }) {
  const c  = config || {};
  const st = c.displayStyle || 'v1';
  const accent = c.accentColor || '#f59e0b';
  const text   = c.textColor   || '#ffffff';
  const muted  = c.mutedColor  || '#94a3b8';
  const font   = c.fontFamily  || "'Inter', sans-serif";
  const currency = c.currency  || '€';
  const name     = c.slotName  || '';
  const provider = c.provider  || '';
  const bet      = c.betSize;
  const rtp      = c.rtp;
  const img      = c.imageUrl;

  if (!name) return (
    <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:font, color:muted, fontSize:'clamp(10px,3cqi,16px)', containerType:'inline-size' }}>
      No slot selected
    </div>
  );

  /* ─── v1  Classic Card ─── */
  if (st === 'v1') return (
    <div style={{ width:'100%', height:'100%', display:'flex', gap:'3%', alignItems:'center', padding:'3%', fontFamily:font, overflow:'hidden', containerType:'inline-size' }}>
      {img && <img src={img} alt={name} style={{ width:'20%', maxWidth:'25%', aspectRatio:'1', borderRadius:'clamp(4px,2cqi,10px)', objectFit:'cover', border:`2px solid ${accent}`, flexShrink:0 }} />}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:'clamp(11px,4.5cqi,24px)', fontWeight:800, color:text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{name}</div>
        {provider && <div style={{ fontSize:'clamp(8px,3cqi,14px)', color:muted, marginTop:'1%' }}>{provider}</div>}
        <div style={{ display:'flex', gap:'4%', marginTop:'2%' }}>
          {bet > 0 && <span style={{ fontSize:'clamp(8px,3cqi,14px)', fontWeight:700, color:accent }}>Bet: {currency}{bet}</span>}
          {rtp && <span style={{ fontSize:'clamp(8px,3cqi,14px)', fontWeight:600, color:muted }}>RTP: {rtp}%</span>}
        </div>
      </div>
    </div>
  );

  /* ─── v2  Neon ─── */
  if (st === 'v2') return (
    <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'4%', fontFamily:font, containerType:'inline-size' }}>
      {img && <img src={img} alt={name} style={{ width:'28%', maxHeight:'45%', aspectRatio:'1', borderRadius:'50%', objectFit:'cover', border:`3px solid ${accent}`, boxShadow:`0 0 18px ${accent}55`, marginBottom:'3%' }} />}
      <div style={{ fontSize:'clamp(12px,5cqi,26px)', fontWeight:900, color:text, textShadow:`0 0 12px ${accent}88`, textAlign:'center' }}>{name}</div>
      {provider && <div style={{ fontSize:'clamp(7px,2.5cqi,13px)', letterSpacing:'0.1em', color:accent, textTransform:'uppercase', marginTop:'1.5%' }}>{provider}</div>}
      <div style={{ display:'flex', gap:'4%', marginTop:'3%' }}>
        {bet > 0 && <span style={{ padding:'1% 4%', borderRadius:20, background:`${accent}22`, border:`1px solid ${accent}44`, fontSize:'clamp(8px,3cqi,14px)', fontWeight:700, color:accent }}>{currency}{bet}</span>}
        {rtp && <span style={{ padding:'1% 4%', borderRadius:20, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', fontSize:'clamp(8px,3cqi,14px)', color:muted }}>{rtp}%</span>}
      </div>
    </div>
  );

  /* ─── v3  Minimal ─── */
  if (st === 'v3') return (
    <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:font, padding:'3%', containerType:'inline-size' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:'clamp(13px,5.5cqi,28px)', fontWeight:900, color:text, letterSpacing:'-0.02em' }}>{name}</div>
        <div style={{ fontSize:'clamp(8px,3cqi,14px)', color:muted, marginTop:'1.5%' }}>
          {provider}{provider && bet > 0 ? ' · ' : ''}{bet > 0 ? `${currency}${bet}` : ''}{rtp ? ` · ${rtp}%` : ''}
        </div>
      </div>
    </div>
  );

  /* ─── v4  Compact Bar ─── */
  return (
    <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', gap:'3%', padding:'2% 4%', fontFamily:font, background:`linear-gradient(90deg, rgba(${hex2rgb(accent)},0.12), transparent)`, containerType:'inline-size' }}>
      {img && <img src={img} alt={name} style={{ width:'14%', maxHeight:'80%', aspectRatio:'1', borderRadius:'clamp(3px,1.5cqi,8px)', objectFit:'cover' }} />}
      <span style={{ fontSize:'clamp(10px,4cqi,20px)', fontWeight:700, color:text, flex:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{name}</span>
      {bet > 0 && <span style={{ fontSize:'clamp(8px,3cqi,14px)', fontWeight:700, color:accent }}>{currency}{bet}</span>}
    </div>
  );
}

export default React.memo(CurrentSlotWidget);
