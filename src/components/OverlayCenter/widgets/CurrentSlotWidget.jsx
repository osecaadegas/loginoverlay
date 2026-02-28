import React from 'react';

/* ───────────── helpers ───────────── */
const hex2rgb = (h) => { const m = h?.replace('#','').match(/.{2}/g); return m ? m.map(x=>parseInt(x,16)).join(',') : '255,255,255'; };

export default function CurrentSlotWidget({ config }) {
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
    <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:font, color:muted, fontSize:13 }}>
      No slot selected
    </div>
  );

  /* ─── v1  Classic Card ─── */
  if (st === 'v1') return (
    <div style={{ width:'100%', height:'100%', display:'flex', gap:10, alignItems:'center', padding:10, fontFamily:font, overflow:'hidden' }}>
      {img && <img src={img} alt={name} style={{ width:64, height:64, borderRadius:8, objectFit:'cover', border:`2px solid ${accent}`, flexShrink:0 }} />}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:16, fontWeight:800, color:text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{name}</div>
        {provider && <div style={{ fontSize:11, color:muted, marginTop:1 }}>{provider}</div>}
        <div style={{ display:'flex', gap:8, marginTop:4 }}>
          {bet > 0 && <span style={{ fontSize:11, fontWeight:700, color:accent }}>Bet: {currency}{bet}</span>}
          {rtp && <span style={{ fontSize:11, fontWeight:600, color:muted }}>RTP: {rtp}%</span>}
        </div>
      </div>
    </div>
  );

  /* ─── v2  Neon ─── */
  if (st === 'v2') return (
    <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:12, fontFamily:font }}>
      {img && <img src={img} alt={name} style={{ width:80, height:80, borderRadius:'50%', objectFit:'cover', border:`3px solid ${accent}`, boxShadow:`0 0 18px ${accent}55`, marginBottom:8 }} />}
      <div style={{ fontSize:18, fontWeight:900, color:text, textShadow:`0 0 12px ${accent}88`, textAlign:'center' }}>{name}</div>
      {provider && <div style={{ fontSize:10, letterSpacing:'0.1em', color:accent, textTransform:'uppercase', marginTop:3 }}>{provider}</div>}
      <div style={{ display:'flex', gap:10, marginTop:6 }}>
        {bet > 0 && <span style={{ padding:'2px 8px', borderRadius:20, background:`${accent}22`, border:`1px solid ${accent}44`, fontSize:11, fontWeight:700, color:accent }}>{currency}{bet}</span>}
        {rtp && <span style={{ padding:'2px 8px', borderRadius:20, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', fontSize:11, color:muted }}>{rtp}%</span>}
      </div>
    </div>
  );

  /* ─── v3  Minimal ─── */
  if (st === 'v3') return (
    <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:font, padding:8 }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:20, fontWeight:900, color:text, letterSpacing:'-0.02em' }}>{name}</div>
        <div style={{ fontSize:11, color:muted, marginTop:2 }}>
          {provider}{provider && bet > 0 ? ' · ' : ''}{bet > 0 ? `${currency}${bet}` : ''}{rtp ? ` · ${rtp}%` : ''}
        </div>
      </div>
    </div>
  );

  /* ─── v4  Compact Bar ─── */
  return (
    <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', gap:8, padding:'4px 10px', fontFamily:font, background:`linear-gradient(90deg, rgba(${hex2rgb(accent)},0.12), transparent)` }}>
      {img && <img src={img} alt={name} style={{ width:32, height:32, borderRadius:6, objectFit:'cover' }} />}
      <span style={{ fontSize:14, fontWeight:700, color:text, flex:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{name}</span>
      {bet > 0 && <span style={{ fontSize:11, fontWeight:700, color:accent }}>{currency}{bet}</span>}
    </div>
  );
}
