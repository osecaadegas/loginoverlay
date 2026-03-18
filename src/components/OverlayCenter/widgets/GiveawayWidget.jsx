import React, { useRef, useEffect, useCallback } from 'react';
import useTwitchChat from '../../../hooks/useTwitchChat';
import useKickChat from '../../../hooks/useKickChat';
import { supabase } from '../../../config/supabaseClient';

function GiveawayWidget({ config, widgetId }) {
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
  const keyword = (c.keyword || '').toLowerCase().trim();
  const title = c.title || 'Giveaway';
  const prize = c.prize || '';
  const isDone = !!winner;
  const statusLabel = isDone ? 'FIM' : isActive ? 'LIVE' : 'OFF';
  const statusColor = isDone ? '#64748b' : isActive ? '#22c55e' : '#64748b';

  /* ─── Chat listener: detect keyword → add participants ─── */
  const participantsRef = useRef(new Set(participants));
  const pendingRef = useRef([]);
  const configRef = useRef(c);
  configRef.current = c;

  // Keep the Set in sync when config changes (e.g. admin clears entries)
  useEffect(() => {
    participantsRef.current = new Set(c.participants || []);
  }, [c.participants]);

  // Flush pending participants to Supabase every 2s
  useEffect(() => {
    if (!widgetId) return;
    const timer = setInterval(async () => {
      if (pendingRef.current.length === 0) return;
      const batch = [...pendingRef.current];
      pendingRef.current = [];
      try {
        // Read latest config from DB to avoid overwriting concurrent changes
        const { data } = await supabase
          .from('overlay_widgets')
          .select('config')
          .eq('id', widgetId)
          .single();
        if (!data) return;
        const current = data.config?.participants || [];
        const merged = [...new Set([...current, ...batch])];
        if (merged.length === current.length) return; // nothing new
        await supabase
          .from('overlay_widgets')
          .update({ config: { ...data.config, participants: merged }, updated_at: new Date().toISOString() })
          .eq('id', widgetId);
      } catch (err) {
        console.error('[GiveawayWidget] flush participants failed:', err);
        // Put them back for next flush
        pendingRef.current = [...batch, ...pendingRef.current];
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [widgetId]);

  // Chat message handler
  const handleMessage = useCallback((msg) => {
    if (!keyword) return;
    const text = (msg.message || '').trim().toLowerCase();
    if (text === `!${keyword}` || text.startsWith(`!${keyword} `)) {
      const name = msg.username;
      if (name && !participantsRef.current.has(name)) {
        participantsRef.current.add(name);
        pendingRef.current.push(name);
      }
    }
  }, [keyword]);

  // Connect to chat platforms when giveaway is active
  const listenTwitch = isActive && !isDone && !!c.twitchEnabled && !!c.twitchChannel;
  const listenKick   = isActive && !isDone && !!c.kickEnabled   && !!c.kickChannelId;
  useTwitchChat(listenTwitch ? c.twitchChannel : '', handleMessage);
  useKickChat(listenKick ? c.kickChannelId : '', handleMessage);

  const kf = `
    @keyframes ga-pulse{0%,100%{opacity:.85}50%{opacity:1}}
    @keyframes ga-glow{0%,100%{box-shadow:0 0 6px ${accentColor}33}50%{box-shadow:0 0 18px ${accentColor}77}}
    @keyframes ga-bounce{0%{transform:scale(1)}50%{transform:scale(1.12)}100%{transform:scale(1)}}
    @keyframes ga-shine{0%{background-position:-200% center}100%{background-position:200% center}}
    @keyframes ga-confetti{0%{transform:translateY(0) rotate(0);opacity:1}100%{transform:translateY(-20px) rotate(360deg);opacity:0}}
  `;

  const isMetal = st === 'metal';
  const mBg = 'linear-gradient(145deg, #2a2d33 0%, #1a1c20 40%, #2e3238 100%)';
  const mCardBg = 'linear-gradient(160deg, rgba(180,185,195,0.12) 0%, rgba(120,125,135,0.06) 100%)';
  const mBorder = 'rgba(200,210,225,0.12)';
  const mText = '#d4d8e0';
  const mMuted = '#7a8090';
  const mAccent = '#a8b0c0';
  const mShadow = '0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)';
  const mInner = 'inset 0 1px 0 rgba(255,255,255,0.07), 0 2px 8px rgba(0,0,0,0.35)';

  /* ─── Metal ─── */
  if (isMetal) return (
    <div style={{ width:'100%', height:'100%', fontFamily, background:mBg, color:mText,
      borderRadius:'clamp(6px,2cqmin,14px)', border:`1px solid rgba(200,210,225,0.18)`,
      boxShadow:mShadow, display:'flex', flexDirection:'column',
      overflow:'hidden', boxSizing:'border-box', containerType:'size' }}>
      <style>{kf}</style>

      {/* ── Header row ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'clamp(6px,3cqmin,14px) clamp(8px,3cqmin,16px)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'clamp(4px,1.5cqmin,8px)' }}>
          <span style={{ fontSize:'clamp(14px,5cqmin,26px)' }}>🎁</span>
          <span style={{ fontWeight:800, fontSize:'clamp(14px,5cqmin,24px)', letterSpacing:'0.1em', textTransform:'uppercase',
            background:'linear-gradient(90deg, #c8ccd4, #e8ecf4, #a0a8b8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>{title}</span>
        </div>
        {isActive && !isDone && (
          <span style={{ background:'rgba(34,197,94,0.15)', color:'#4ade80', fontSize:'clamp(11px,3cqmin,14px)', fontWeight:800,
            padding:'clamp(2px,0.6cqmin,4px) clamp(6px,2cqmin,12px)', borderRadius:99, textTransform:'uppercase', letterSpacing:'0.1em',
            border:'1px solid rgba(34,197,94,0.25)',
            animation:'ga-pulse 2s ease-in-out infinite' }}>LIVE</span>
        )}
      </div>

      {/* ── Body ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        padding:'0 clamp(8px,3cqmin,16px) clamp(6px,3cqmin,14px)', gap:'clamp(4px,2cqmin,12px)', minHeight:0 }}>
        {winner ? (
          <>
            <div style={{ fontSize:'clamp(12px,4cqmin,18px)', color:mMuted, textTransform:'uppercase', letterSpacing:'0.14em', fontWeight:700 }}>🎉 Winner</div>
            <div style={{ fontSize:'clamp(20px,10cqmin,48px)', fontWeight:800, lineHeight:1.1,
              background:'linear-gradient(90deg, #c8ccd4, #e8ecf4, #a0a8b8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>{winner}</div>
            {prize && <div style={{ fontSize:'clamp(13px,4cqmin,18px)', color:mMuted }}>Prize: <span style={{ color:'#d4d8e0', fontWeight:700 }}>{prize}</span></div>}
          </>
        ) : isActive && keyword ? (
          <>
            {prize && (
              <div style={{ fontSize:'clamp(18px,8cqmin,38px)', fontWeight:800, textAlign:'center', lineHeight:1.1,
                background:'linear-gradient(90deg, #c8ccd4, #e8ecf4, #a0a8b8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>{prize}</div>
            )}
            <div style={{ display:'flex', alignItems:'baseline', gap:'clamp(4px,1.5cqmin,8px)', textAlign:'center' }}>
              <span style={{ fontSize:'clamp(12px,4cqmin,16px)', color:mMuted }}>Type</span>
              <span style={{ fontSize:'clamp(16px,6cqmin,28px)', fontWeight:800, color:'#d4d8e0', textShadow:'0 1px 3px rgba(0,0,0,0.5)' }}>!{keyword}</span>
              <span style={{ fontSize:'clamp(12px,4cqmin,16px)', color:mMuted }}>to enter</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'clamp(4px,1.5cqmin,8px)' }}>
              <span style={{ fontSize:'clamp(12px,4cqmin,18px)' }}>👥</span>
              <span style={{ fontSize:'clamp(18px,8cqmin,40px)', fontWeight:800, color:'#d4d8e0', textShadow:'0 1px 3px rgba(0,0,0,0.5)' }}>{count}</span>
              <span style={{ fontSize:'clamp(12px,4cqmin,16px)', color:mMuted }}>participant{count !== 1 ? 's' : ''}</span>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize:'clamp(24px,10cqmin,48px)', opacity:0.4 }}>🎁</div>
            <div style={{ fontSize:'clamp(13px,4cqmin,18px)', color:mMuted }}>No active giveaway</div>
          </>
        )}
      </div>
    </div>
  );

  /* ─── v1 Classic Card ─── */
  if (st === 'v1') return (
    <div style={{ width:'100%', height:'100%', fontFamily, background:bgColor, color:textColor,
      borderRadius:'clamp(6px,2cqmin,14px)', border:`1px solid ${borderColor}`, display:'flex', flexDirection:'column',
      overflow:'hidden', boxSizing:'border-box', containerType:'size' }}>
      <style>{kf}</style>
      <div style={{ padding:'clamp(3px,1.5cqmin,8px) clamp(5px,2cqmin,12px)', display:'flex', alignItems:'center', gap:'clamp(4px,1.5cqmin,8px)',
        borderBottom:`1px solid ${borderColor}`, flexShrink:0 }}>
        <span style={{ fontSize:'clamp(12px,5cqmin,24px)' }}>🎁</span>
        <span style={{ fontWeight:700, fontSize:'clamp(12px,4cqmin,20px)', flex:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{title}</span>
        {isActive && !isDone && (
          <span style={{ background:'#22c55e33', color:'#22c55e', fontSize:'clamp(10px,2.5cqmin,13px)', fontWeight:700,
            padding:'clamp(1px,0.4cqmin,3px) clamp(4px,1.2cqmin,8px)', borderRadius:99, textTransform:'uppercase', letterSpacing:'0.05em',
            animation:'ga-pulse 2s ease-in-out infinite' }}>LIVE</span>
        )}
      </div>
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        padding:'clamp(3px,1.5cqmin,10px)', gap:'clamp(3px,1.5cqmin,8px)', minHeight:0 }}>
        {winner ? (
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:'clamp(18px,8cqmin,40px)', marginBottom:'clamp(1px,0.4cqmin,3px)' }}>🎉</div>
            <div style={{ fontSize:'clamp(10px,3cqmin,14px)', color:mutedColor, textTransform:'uppercase', letterSpacing:'0.1em', fontWeight:700, marginBottom:'clamp(1px,0.4cqmin,3px)' }}>Winner</div>
            <div style={{ fontSize:'clamp(16px,7cqmin,36px)', fontWeight:800, color:accentColor, textShadow:`0 0 20px ${accentColor}66` }}>{winner}</div>
            {prize && <div style={{ fontSize:'clamp(11px,3.5cqmin,16px)', color:mutedColor, marginTop:'clamp(1px,0.5cqmin,4px)' }}>Prize: <span style={{ color:'#fbbf24', fontWeight:700 }}>{prize}</span></div>}
          </div>
        ) : isActive && keyword ? (
          <>
            {prize && (
              <div style={{ background:cardBg, border:`1px solid ${borderColor}`, borderRadius:'clamp(4px,1.5cqmin,8px)',
                padding:'clamp(2px,1cqmin,6px) clamp(5px,2cqmin,14px)', textAlign:'center' }}>
                <div style={{ fontSize:'clamp(10px,2.5cqmin,12px)', color:mutedColor, textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:700 }}>Prize</div>
                <div style={{ fontSize:'clamp(12px,5cqmin,24px)', fontWeight:700, color:'#fbbf24', marginTop:'clamp(1px,0.3cqmin,2px)' }}>{prize}</div>
              </div>
            )}
            <div style={{ background:`${accentColor}18`, border:`1px solid ${accentColor}44`, borderRadius:'clamp(4px,2cqmin,10px)',
              padding:'clamp(3px,1.5cqmin,8px) clamp(5px,2.5cqmin,14px)', textAlign:'center',
              animation:'ga-glow 3s ease-in-out infinite' }}>
              <div style={{ fontSize:'clamp(10px,3cqmin,14px)', color:mutedColor, marginBottom:'clamp(1px,0.4cqmin,3px)' }}>Type in chat to enter</div>
              <div style={{ fontSize:'clamp(14px,6cqmin,30px)', fontWeight:800, color:accentColor, letterSpacing:'0.02em' }}>!{keyword}</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'clamp(3px,1.5cqmin,8px)', marginTop:'clamp(1px,0.4cqmin,3px)' }}>
              <span style={{ fontSize:'clamp(10px,4cqmin,20px)' }}>👥</span>
              <span style={{ fontSize:'clamp(16px,7cqmin,36px)', fontWeight:800, color:textColor, animation:count > 0 ? 'ga-bounce 0.4s ease' : 'none' }}>{count}</span>
              <span style={{ fontSize:'clamp(10px,3cqmin,14px)', color:mutedColor }}>participant{count !== 1 ? 's' : ''}</span>
            </div>
            {count > 0 && (
              <div style={{ width:'100%', maxHeight:'20cqb', overflow:'hidden', display:'flex', flexWrap:'wrap', gap:'clamp(2px,0.5cqmin,4px)', justifyContent:'center' }}>
                {participants.slice(-8).map((name, i) => (
                  <span key={i} style={{ background:`${accentColor}22`, color:accentColor, fontSize:'clamp(10px,2.5cqmin,12px)', fontWeight:700,
                    padding:'clamp(1px,0.3cqmin,2px) clamp(4px,1.2cqmin,8px)', borderRadius:99 }}>{name}</span>
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:'clamp(18px,8cqmin,36px)', marginBottom:'clamp(2px,1cqmin,6px)', opacity:0.5 }}>🎁</div>
            <div style={{ fontSize:'clamp(11px,3.5cqmin,16px)', color:mutedColor }}>No active giveaway</div>
          </div>
        )}
      </div>
    </div>
  );

  /* ─── v2 Compact Banner (stream overlay) ─── */
  if (st === 'v2') return (
    <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontFamily, background:'transparent', containerType:'size' }}>
      <style>{kf}</style>
      <div style={{
        width:'96%', height:'92%', background:bgColor, borderRadius:'clamp(8px,3cqmin,16px)',
        border:`2px solid ${borderColor}`, padding:'clamp(4px,2cqmin,12px) clamp(6px,2.5cqmin,14px)',
        display:'flex', flexDirection:'column', justifyContent:'center', gap:'clamp(3px,1.8cqmin,10px)',
        boxSizing:'border-box',
      }}>
        {/* Top row: participants + status */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'clamp(3px,1.5cqmin,10px)' }}>
            <span style={{ fontSize:'clamp(14px,6cqmin,28px)' }}>👥</span>
            <span style={{ fontSize:'clamp(12px,4.5cqmin,22px)', color:accentColor }}>⭐</span>
            <span style={{ fontSize:'clamp(18px,9cqmin,44px)', fontWeight:800, color:textColor }}>{count}</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'clamp(3px,1.5cqmin,8px)' }}>
            <span style={{ width:'clamp(6px,2.5cqmin,12px)', height:'clamp(6px,2.5cqmin,12px)', borderRadius:'50%', background:statusColor, display:'inline-block',
              animation:isActive && !isDone ? 'ga-pulse 2s infinite' : 'none' }} />
            <span style={{ fontSize:'clamp(11px,4.5cqmin,22px)', fontWeight:700, color:statusColor, textTransform:'uppercase', letterSpacing:'0.06em' }}>{statusLabel}</span>
          </div>
        </div>
        {/* Keyword instruction */}
        {keyword && (isActive || isDone) && (
          <div style={{ textAlign:'center', fontSize:'clamp(12px,4.5cqmin,20px)', color:mutedColor, lineHeight:1.4 }}>
            Type <span style={{ background:`${accentColor}33`, color:accentColor, padding:'clamp(2px,0.5cqmin,4px) clamp(4px,1.2cqmin,8px)',
              borderRadius:'clamp(3px,1cqmin,6px)', fontWeight:700, fontSize:'clamp(12px,5cqmin,22px)' }}>!{keyword}</span> in chat to win!
          </div>
        )}
        {/* Prize or Winner */}
        {winner ? (
          <div style={{ textAlign:'center', padding:'clamp(2px,0.8cqmin,6px) 0' }}>
            <div style={{ fontSize:'clamp(11px,4cqmin,18px)', color:mutedColor, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:3 }}>🎉 Winner</div>
            <div style={{ fontSize:'clamp(18px,8cqmin,40px)', fontWeight:800, color:accentColor, textShadow:`0 0 12px ${accentColor}44` }}>{winner}</div>
          </div>
        ) : prize ? (
          <div style={{ textAlign:'center', fontSize:'clamp(18px,8cqmin,40px)', fontWeight:800, color:textColor }}>{prize}</div>
        ) : (
          <div style={{ textAlign:'center', fontSize:'clamp(12px,4.5cqmin,20px)', color:mutedColor }}>No active giveaway</div>
        )}
      </div>
    </div>
  );

  /* ─── v3 Neon Glow ─── */
  if (st === 'v3') return (
    <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontFamily, background:'transparent', containerType:'size' }}>
      <style>{kf}</style>
      <div style={{
        width:'94%', height:'92%', background:'rgba(5,5,18,0.95)', borderRadius:'clamp(6px,3cqmin,20px)',
        border:`2px solid ${accentColor}55`, boxShadow:`0 0 30px ${accentColor}22`,
        padding:'clamp(3px,2cqmin,12px)', display:'flex', flexDirection:'column', alignItems:'center',
        justifyContent:'center', gap:'clamp(3px,1.8cqmin,10px)', boxSizing:'border-box',
        animation:isActive && !isDone ? 'ga-glow 3s ease-in-out infinite' : 'none',
      }}>
        <div style={{ fontSize:'clamp(10px,3.5cqmin,18px)', fontWeight:800, color:accentColor, letterSpacing:'0.2em', textTransform:'uppercase',
          textShadow:`0 0 8px ${accentColor}88` }}>
          {isDone ? '★ ENDED ★' : isActive ? '★ GIVEAWAY ★' : '★ GIVEAWAY ★'}
        </div>
        {winner ? (
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:'clamp(10px,3cqmin,14px)', color:mutedColor, letterSpacing:'0.08em', textTransform:'uppercase' }}>Winner</div>
            <div style={{ fontSize:'clamp(16px,7cqmin,36px)', fontWeight:800, color:accentColor, textShadow:`0 0 16px ${accentColor}` }}>{winner}</div>
          </div>
        ) : isActive ? (
          <>
            {prize && <div style={{ fontSize:'clamp(14px,7cqmin,34px)', fontWeight:800, color:textColor, textShadow:'0 0 10px rgba(255,255,255,0.2)' }}>{prize}</div>}
            {keyword && (
              <div style={{ fontSize:'clamp(10px,3.5cqmin,18px)', color:mutedColor }}>
                Type <span style={{ color:accentColor, fontWeight:700, textShadow:`0 0 6px ${accentColor}` }}>!{keyword}</span> to enter
              </div>
            )}
            <div style={{ display:'flex', alignItems:'center', gap:'clamp(3px,1.5cqmin,8px)' }}>
              <span style={{ fontSize:'clamp(14px,7cqmin,36px)', fontWeight:800, color:accentColor, textShadow:`0 0 12px ${accentColor}66` }}>{count}</span>
              <span style={{ fontSize:'clamp(10px,3.5cqmin,16px)', color:mutedColor }}>entries</span>
            </div>
          </>
        ) : (
          <div style={{ fontSize:'clamp(10px,3.5cqmin,16px)', color:mutedColor }}>No active giveaway</div>
        )}
      </div>
    </div>
  );

  /* ─── v4 Minimal ─── */
  return (
    <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      fontFamily, background:'transparent', containerType:'size', gap:'clamp(3px,1.5cqmin,10px)' }}>
      <style>{kf}</style>
      <div style={{ display:'flex', alignItems:'center', gap:'clamp(3px,1.5cqmin,8px)' }}>
        <span style={{ width:'clamp(5px,2cqmin,10px)', height:'clamp(5px,2cqmin,10px)', borderRadius:'50%', background:statusColor, display:'inline-block',
          animation:isActive && !isDone ? 'ga-pulse 2s infinite' : 'none' }} />
        <span style={{ fontSize:'clamp(10px,3.5cqmin,16px)', fontWeight:700, color:mutedColor, textTransform:'uppercase', letterSpacing:'0.1em' }}>{statusLabel}</span>
      </div>
      {winner ? (
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:'clamp(16px,8cqmin,40px)', fontWeight:800, color:accentColor }}>{winner}</div>
          <div style={{ fontSize:'clamp(10px,3.5cqmin,14px)', color:mutedColor, marginTop:'1%' }}>winner</div>
        </div>
      ) : isActive ? (
        <>
          {prize && <div style={{ fontSize:'clamp(14px,7cqmin,36px)', fontWeight:800, color:textColor }}>{prize}</div>}
          {keyword && <div style={{ fontSize:'clamp(10px,3.5cqmin,16px)', color:mutedColor }}>!{keyword}</div>}
          <div style={{ fontSize:'clamp(10px,5cqmin,24px)', fontWeight:700, color:accentColor }}>{count} <span style={{ fontWeight:400, color:mutedColor, fontSize:'0.7em' }}>entries</span></div>
        </>
      ) : (
        <div style={{ fontSize:'clamp(10px,4cqmin,18px)', color:mutedColor, opacity:0.5 }}>🎁</div>
      )}
    </div>
  );
}

export default React.memo(GiveawayWidget);
