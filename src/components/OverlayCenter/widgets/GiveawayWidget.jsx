import React from 'react';

export default function GiveawayWidget({ config }) {
  const c = config || {};
  const st = c.displayStyle || 'v1';
  const bgColor = c.bgColor || '#0a0f1e';
  const cardBg = c.cardBg || 'rgba(255,255,255,0.04)';
  const borderColor = c.borderColor || 'rgba(255,255,255,0.12)';
  const accentColor = c.accentColor || '#f59e0b';
  const textColor = c.textColor || '#ffffff';
  const mutedColor = c.mutedColor || '#94a3b8';
  const fontFamily = c.fontFamily || "'Inter', sans-serif";
  const participants = c.participants || [];
  const count = participants.length;
  const winner = c.winner || '';
  const isActive = !!c.isActive;
  const keyword = c.keyword || '';
  const title = c.title || 'Giveaway';
  const prize = c.prize || '';
  const isDone = !!winner;
  const statusLabel = isDone ? 'FIM' : isActive ? 'LIVE' : 'OFF';
  const statusColor = isDone ? '#64748b' : isActive ? '#22c55e' : '#64748b';

  const kf = `
    @keyframes ga-pulse{0%,100%{opacity:.85}50%{opacity:1}}
    @keyframes ga-glow{0%,100%{box-shadow:0 0 6px ${accentColor}33}50%{box-shadow:0 0 18px ${accentColor}77}}
    @keyframes ga-bounce{0%{transform:scale(1)}50%{transform:scale(1.12)}100%{transform:scale(1)}}
    @keyframes ga-shine{0%{background-position:-200% center}100%{background-position:200% center}}
    @keyframes ga-confetti{0%{transform:translateY(0) rotate(0);opacity:1}100%{transform:translateY(-20px) rotate(360deg);opacity:0}}
  `;

  /* ─── v1 Classic Card ─── */
  if (st === 'v1') return (
    <div style={{ width:'100%', height:'100%', fontFamily, background:bgColor, color:textColor,
      borderRadius:12, border:`1px solid ${borderColor}`, display:'flex', flexDirection:'column',
      overflow:'hidden', boxSizing:'border-box', containerType:'inline-size' }}>
      <style>{kf}</style>
      <div style={{ padding:'10px 14px', display:'flex', alignItems:'center', gap:8,
        borderBottom:`1px solid ${borderColor}`, flexShrink:0 }}>
        <span style={{ fontSize:18 }}>🎁</span>
        <span style={{ fontWeight:700, fontSize:14, flex:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{title}</span>
        {isActive && !isDone && (
          <span style={{ background:'#22c55e33', color:'#22c55e', fontSize:9, fontWeight:700,
            padding:'2px 8px', borderRadius:99, textTransform:'uppercase', letterSpacing:'0.05em',
            animation:'ga-pulse 2s ease-in-out infinite' }}>LIVE</span>
        )}
      </div>
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:14, gap:10, minHeight:0 }}>
        {winner ? (
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:28, marginBottom:4 }}>🎉</div>
            <div style={{ fontSize:10, color:mutedColor, textTransform:'uppercase', letterSpacing:'0.1em', fontWeight:600, marginBottom:4 }}>Winner</div>
            <div style={{ fontSize:'clamp(18px,5cqi,28px)', fontWeight:800, color:accentColor, textShadow:`0 0 20px ${accentColor}66` }}>{winner}</div>
            {prize && <div style={{ fontSize:12, color:mutedColor, marginTop:6 }}>Prize: <span style={{ color:'#fbbf24', fontWeight:600 }}>{prize}</span></div>}
          </div>
        ) : isActive && keyword ? (
          <>
            {prize && (
              <div style={{ background:cardBg, border:`1px solid ${borderColor}`, borderRadius:8, padding:'8px 16px', textAlign:'center' }}>
                <div style={{ fontSize:9, color:mutedColor, textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:600 }}>Prize</div>
                <div style={{ fontSize:15, fontWeight:700, color:'#fbbf24', marginTop:2 }}>{prize}</div>
              </div>
            )}
            <div style={{ background:`${accentColor}18`, border:`1px solid ${accentColor}44`, borderRadius:10, padding:'10px 18px', textAlign:'center',
              animation:'ga-glow 3s ease-in-out infinite' }}>
              <div style={{ fontSize:11, color:mutedColor, marginBottom:4 }}>Type in chat to enter</div>
              <div style={{ fontSize:'clamp(16px,4cqi,24px)', fontWeight:800, color:accentColor, letterSpacing:'0.02em' }}>!{keyword}</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:4 }}>
              <span style={{ fontSize:14 }}>👥</span>
              <span style={{ fontSize:'clamp(18px,5cqi,30px)', fontWeight:800, color:textColor, animation:count > 0 ? 'ga-bounce 0.4s ease' : 'none' }}>{count}</span>
              <span style={{ fontSize:11, color:mutedColor }}>participant{count !== 1 ? 's' : ''}</span>
            </div>
            {count > 0 && (
              <div style={{ width:'100%', maxHeight:60, overflow:'hidden', display:'flex', flexWrap:'wrap', gap:4, justifyContent:'center' }}>
                {participants.slice(-8).map((name, i) => (
                  <span key={i} style={{ background:`${accentColor}22`, color:accentColor, fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:99 }}>{name}</span>
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:24, marginBottom:6, opacity:0.5 }}>🎁</div>
            <div style={{ fontSize:12, color:mutedColor }}>No active giveaway</div>
          </div>
        )}
      </div>
    </div>
  );

  /* ─── v2 Compact Banner (stream overlay) ─── */
  if (st === 'v2') return (
    <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontFamily, background:'transparent', containerType:'inline-size' }}>
      <style>{kf}</style>
      <div style={{
        width:'92%', background:bgColor, borderRadius:'clamp(8px,3cqi,16px)',
        border:`2px solid ${borderColor}`, padding:'clamp(6px,2.5cqi,14px) clamp(8px,3cqi,16px)',
        display:'flex', flexDirection:'column', gap:'clamp(4px,1.5cqi,10px)',
      }}>
        {/* Top row: participants + status */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'clamp(3px,1.2cqi,8px)' }}>
            <span style={{ fontSize:'clamp(10px,3.5cqi,18px)' }}>👥</span>
            <span style={{ fontSize:'clamp(10px,3cqi,14px)', color:accentColor }}>⭐</span>
            <span style={{ fontSize:'clamp(13px,5cqi,26px)', fontWeight:800, color:textColor }}>{count}</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'clamp(3px,1cqi,6px)' }}>
            <span style={{ width:'clamp(6px,1.8cqi,10px)', height:'clamp(6px,1.8cqi,10px)', borderRadius:'50%', background:statusColor, display:'inline-block',
              animation:isActive && !isDone ? 'ga-pulse 2s infinite' : 'none' }} />
            <span style={{ fontSize:'clamp(9px,2.8cqi,14px)', fontWeight:700, color:statusColor, textTransform:'uppercase', letterSpacing:'0.06em' }}>{statusLabel}</span>
          </div>
        </div>
        {/* Keyword instruction */}
        {keyword && (isActive || isDone) && (
          <div style={{ textAlign:'center', fontSize:'clamp(7px,2.5cqi,12px)', color:mutedColor, lineHeight:1.4 }}>
            Type <span style={{ background:`${accentColor}33`, color:accentColor, padding:'1px clamp(3px,1cqi,6px)',
              borderRadius:'clamp(2px,0.7cqi,4px)', fontWeight:700, fontSize:'clamp(8px,2.8cqi,13px)' }}>!{keyword}</span> in chat to win!
          </div>
        )}
        {/* Prize or Winner */}
        {winner ? (
          <div style={{ textAlign:'center', padding:'clamp(2px,1cqi,6px) 0' }}>
            <div style={{ fontSize:'clamp(7px,2cqi,10px)', color:mutedColor, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:2 }}>🎉 Winner</div>
            <div style={{ fontSize:'clamp(12px,4.5cqi,24px)', fontWeight:800, color:accentColor, textShadow:`0 0 12px ${accentColor}44` }}>{winner}</div>
          </div>
        ) : prize ? (
          <div style={{ textAlign:'center', fontSize:'clamp(12px,4.5cqi,24px)', fontWeight:800, color:textColor }}>{prize}</div>
        ) : (
          <div style={{ textAlign:'center', fontSize:'clamp(9px,2.5cqi,12px)', color:mutedColor }}>No active giveaway</div>
        )}
      </div>
    </div>
  );

  /* ─── v3 Neon Glow ─── */
  if (st === 'v3') return (
    <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontFamily, background:'transparent', containerType:'inline-size' }}>
      <style>{kf}</style>
      <div style={{
        width:'90%', height:'88%', background:'rgba(5,5,18,0.95)', borderRadius:'clamp(10px,3.5cqi,20px)',
        border:`2px solid ${accentColor}55`, boxShadow:`0 0 30px ${accentColor}22`,
        padding:'clamp(8px,3cqi,16px)', display:'flex', flexDirection:'column', alignItems:'center',
        justifyContent:'center', gap:'clamp(6px,2cqi,12px)',
        animation:isActive && !isDone ? 'ga-glow 3s ease-in-out infinite' : 'none',
      }}>
        <div style={{ fontSize:'clamp(8px,2.5cqi,13px)', fontWeight:800, color:accentColor, letterSpacing:'0.2em', textTransform:'uppercase',
          textShadow:`0 0 8px ${accentColor}88` }}>
          {isDone ? '★ ENDED ★' : isActive ? '★ GIVEAWAY ★' : '★ GIVEAWAY ★'}
        </div>
        {winner ? (
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:'clamp(7px,2cqi,10px)', color:mutedColor, letterSpacing:'0.08em', textTransform:'uppercase' }}>Winner</div>
            <div style={{ fontSize:'clamp(14px,5cqi,28px)', fontWeight:800, color:accentColor, textShadow:`0 0 16px ${accentColor}` }}>{winner}</div>
          </div>
        ) : isActive ? (
          <>
            {prize && <div style={{ fontSize:'clamp(14px,5cqi,26px)', fontWeight:800, color:textColor, textShadow:'0 0 10px rgba(255,255,255,0.2)' }}>{prize}</div>}
            {keyword && (
              <div style={{ fontSize:'clamp(8px,2.8cqi,13px)', color:mutedColor }}>
                Type <span style={{ color:accentColor, fontWeight:700, textShadow:`0 0 6px ${accentColor}` }}>!{keyword}</span> to enter
              </div>
            )}
            <div style={{ display:'flex', alignItems:'center', gap:'clamp(4px,1.5cqi,8px)' }}>
              <span style={{ fontSize:'clamp(14px,5cqi,28px)', fontWeight:800, color:accentColor, textShadow:`0 0 12px ${accentColor}66` }}>{count}</span>
              <span style={{ fontSize:'clamp(8px,2.5cqi,12px)', color:mutedColor }}>entries</span>
            </div>
          </>
        ) : (
          <div style={{ fontSize:'clamp(9px,2.5cqi,12px)', color:mutedColor }}>No active giveaway</div>
        )}
      </div>
    </div>
  );

  /* ─── v4 Minimal ─── */
  return (
    <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      fontFamily, background:'transparent', containerType:'inline-size', gap:'clamp(4px,1.5cqi,10px)' }}>
      <style>{kf}</style>
      <div style={{ display:'flex', alignItems:'center', gap:'clamp(4px,1.5cqi,8px)' }}>
        <span style={{ width:'clamp(5px,1.5cqi,8px)', height:'clamp(5px,1.5cqi,8px)', borderRadius:'50%', background:statusColor, display:'inline-block',
          animation:isActive && !isDone ? 'ga-pulse 2s infinite' : 'none' }} />
        <span style={{ fontSize:'clamp(8px,2.5cqi,12px)', fontWeight:600, color:mutedColor, textTransform:'uppercase', letterSpacing:'0.1em' }}>{statusLabel}</span>
      </div>
      {winner ? (
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:'clamp(16px,6cqi,32px)', fontWeight:800, color:accentColor }}>{winner}</div>
          <div style={{ fontSize:'clamp(8px,2.5cqi,11px)', color:mutedColor, marginTop:'1%' }}>winner</div>
        </div>
      ) : isActive ? (
        <>
          {prize && <div style={{ fontSize:'clamp(14px,5.5cqi,28px)', fontWeight:800, color:textColor }}>{prize}</div>}
          {keyword && <div style={{ fontSize:'clamp(8px,2.8cqi,12px)', color:mutedColor }}>!{keyword}</div>}
          <div style={{ fontSize:'clamp(10px,3.5cqi,18px)', fontWeight:700, color:accentColor }}>{count} <span style={{ fontWeight:400, color:mutedColor, fontSize:'0.7em' }}>entries</span></div>
        </>
      ) : (
        <div style={{ fontSize:'clamp(9px,3cqi,14px)', color:mutedColor, opacity:0.5 }}>🎁</div>
      )}
    </div>
  );
}
