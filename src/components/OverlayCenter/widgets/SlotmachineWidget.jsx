import React from 'react';

const DEFAULT_SYM = ['🍒','🍋','🍊','🍇','⭐','💎','7️⃣','🔔'];

export default function SlotmachineWidget({ config }) {
  const c = config || {};
  const st = c.displayStyle || 'v1';
  const accent    = c.accentColor  || '#f59e0b';
  const text      = c.textColor    || '#ffffff';
  const machineC  = c.machineColor || '#dc2626';
  const reelBg    = c.reelBg       || '#1a1a2e';
  const font      = c.fontFamily   || "'Inter', sans-serif";
  const symbols   = c.symbols      || DEFAULT_SYM;
  const reelCount = c.reelCount    || 3;
  const results   = c.results      || [];
  const spinning  = c.spinning;
  const isWin     = c.lastWin;

  /* Derive display reels */
  const reels = results.length >= reelCount ? results.slice(0, reelCount)
    : Array.from({ length: reelCount }, (_, i) => results[i] || symbols[i % symbols.length]);

  /* ─── v1  Realistic 3D Machine ─── */
  if (st === 'v1') return (
    <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:font, perspective:800, background:'transparent' }}>
      <style>{`
        @keyframes sm-reel-spin{
          0%{transform:rotateX(0)}
          25%{transform:rotateX(-720deg)}
          50%{transform:rotateX(-1440deg)}
          75%{transform:rotateX(-2160deg)}
          100%{transform:rotateX(-2520deg)}
        }
        @keyframes sm-reel-land{0%{transform:scale(1.15)}50%{transform:scale(0.95)}100%{transform:scale(1)}}
        @keyframes sm-win-flash{0%,100%{box-shadow:0 0 10px ${accent}33}50%{box-shadow:0 0 30px ${accent}88}}
      `}</style>
      <div style={{
        background:`linear-gradient(180deg, ${machineC}, ${machineC}cc 40%, ${machineC}88)`,
        borderRadius:16, padding:'16px 12px 20px', position:'relative',
        border:'3px solid rgba(255,255,255,0.1)',
        boxShadow:`0 8px 40px rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,255,255,0.2)`,
        display:'flex', flexDirection:'column', alignItems:'center', gap:8,
      }}>
        {/* Top plate */}
        <div style={{ fontSize:10, fontWeight:900, color:'rgba(255,255,255,0.6)', letterSpacing:'0.2em', textTransform:'uppercase' }}>SLOT MACHINE</div>

        {/* Reel window */}
        <div style={{
          display:'flex', gap:4, padding:8, background:'rgba(0,0,0,0.6)', borderRadius:10,
          border:'2px inset rgba(255,255,255,0.1)', boxShadow:'inset 0 4px 12px rgba(0,0,0,0.8)',
          animation: isWin && !spinning ? 'sm-win-flash 1s ease-in-out infinite' : 'none',
        }}>
          {reels.map((sym, i) => (
            <div key={i} style={{
              width:'clamp(40px,20%,64px)', aspectRatio:'1', borderRadius:8,
              background:`linear-gradient(180deg, ${reelBg}, ${reelBg}cc)`,
              border:'1px solid rgba(255,255,255,0.08)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'clamp(20px,5vw,36px)',
              animation: spinning ? `sm-reel-spin 2s cubic-bezier(.4,0,.2,1) ${i*0.3}s both`
                : results.length > 0 ? `sm-reel-land 0.4s ease-out ${i*0.1}s both` : 'none',
              transformStyle:'preserve-3d',
              boxShadow:'inset 0 2px 8px rgba(0,0,0,0.4)',
            }}>{sym}</div>
          ))}
        </div>

        {/* Payline */}
        <div style={{ position:'absolute', left:8, right:8, top:'50%', height:2,
          background:`linear-gradient(90deg, transparent, ${accent}, transparent)`, opacity:0.4 }} />

        {/* Win label */}
        {isWin && !spinning && (
          <div style={{ fontSize:12, fontWeight:900, color:accent, letterSpacing:'0.1em',
            textShadow:`0 0 10px ${accent}88` }}>🎉 JACKPOT!</div>
        )}
      </div>
    </div>
  );

  /* ─── v2  Neon Arcade ─── */
  if (st === 'v2') return (
    <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:font, background:'transparent' }}>
      <style>{`
        @keyframes sm2-spin{0%{transform:translateY(-200%);opacity:0.3}60%{transform:translateY(10%)}80%{transform:translateY(-5%)}100%{transform:translateY(0);opacity:1}}
        @keyframes sm2-glow{0%,100%{border-color:${accent}44}50%{border-color:${accent}}}
      `}</style>
      <div style={{
        background:'rgba(10,10,20,0.9)', borderRadius:20, padding:16,
        border:`2px solid ${accent}66`, boxShadow:`0 0 40px ${accent}22, 0 8px 32px rgba(0,0,0,0.4)`,
        display:'flex', flexDirection:'column', alignItems:'center', gap:10,
        animation: isWin && !spinning ? 'sm2-glow 1s ease-in-out infinite' : 'none',
      }}>
        <div style={{ fontSize:10, fontWeight:800, color:accent, letterSpacing:'0.25em', textShadow:`0 0 8px ${accent}` }}>
          ★ CASINO ★
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {reels.map((sym, i) => (
            <div key={i} style={{
              width:'clamp(36px,18%,56px)', aspectRatio:'1', borderRadius:10,
              background:'rgba(255,255,255,0.04)', border:`1px solid ${accent}44`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'clamp(18px,5vw,32px)',
              animation: spinning ? `sm2-spin 0.8s ease-out ${0.4 + i*0.25}s both` : 'none',
              boxShadow:`inset 0 0 12px rgba(0,0,0,0.5), 0 0 6px ${accent}11`,
            }}>{sym}</div>
          ))}
        </div>
        {isWin && !spinning && (
          <div style={{ fontSize:14, fontWeight:900, color:accent, textShadow:`0 0 16px ${accent}` }}>🎰 WINNER!</div>
        )}
      </div>
    </div>
  );

  /* ─── v3  Minimal Clean ─── */
  if (st === 'v3') return (
    <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:font, background:'transparent' }}>
      <style>{`@keyframes sm3-drop{0%{transform:translateY(-100%);opacity:0}100%{transform:translateY(0);opacity:1}}`}</style>
      <div style={{ display:'flex', gap:6, padding:12 }}>
        {reels.map((sym, i) => (
          <div key={i} style={{
            width:'clamp(44px,22%,70px)', aspectRatio:'1', borderRadius:12,
            background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:'clamp(22px,6vw,40px)',
            animation: spinning ? `sm3-drop 0.5s ease-out ${0.3 + i*0.2}s both` : 'none',
          }}>{sym}</div>
        ))}
      </div>
    </div>
  );

  /* ─── v4  Vegas Golden ─── */
  return (
    <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:font, background:'transparent' }}>
      <style>{`
        @keyframes sm4-spin{0%{transform:rotateX(-720deg) scale(0.5);opacity:0}100%{transform:rotateX(0) scale(1);opacity:1}}
        @keyframes sm4-shine{0%{background-position:-200% center}100%{background-position:200% center}}
      `}</style>
      <div style={{
        background:'linear-gradient(180deg, #1a0a00, #2d1400)',
        borderRadius:16, padding:'14px 10px 18px', border:'3px solid #f59e0b44',
        boxShadow:'0 0 30px rgba(245,158,11,0.1), 0 8px 32px rgba(0,0,0,0.5)',
        display:'flex', flexDirection:'column', alignItems:'center', gap:8,
      }}>
        <div style={{
          fontSize:11, fontWeight:900, letterSpacing:'0.15em',
          background:'linear-gradient(90deg, #f59e0b, #fde68a, #f59e0b)', backgroundSize:'200%',
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
          animation:'sm4-shine 3s linear infinite',
        }}>★ VEGAS ★</div>
        <div style={{
          display:'flex', gap:4, padding:8,
          background:'linear-gradient(180deg, rgba(0,0,0,0.8), rgba(0,0,0,0.6))',
          borderRadius:12, border:'2px solid #f59e0b33',
          boxShadow:'inset 0 4px 16px rgba(0,0,0,0.8)',
        }}>
          {reels.map((sym, i) => (
            <div key={i} style={{
              width:'clamp(40px,20%,60px)', aspectRatio:'1', borderRadius:8,
              background:'linear-gradient(180deg, #1a1a2e, #0d0d14)',
              border:'1px solid rgba(245,158,11,0.15)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'clamp(20px,5vw,36px)', perspective:400,
              animation: spinning ? `sm4-spin 1.2s cubic-bezier(.4,0,.2,1) ${i*0.25}s both` : 'none',
            }}>{sym}</div>
          ))}
        </div>
        {isWin && !spinning && (
          <div style={{
            fontSize:13, fontWeight:900, letterSpacing:'0.1em',
            background:'linear-gradient(90deg, #f59e0b, #fde68a, #f59e0b)', backgroundSize:'200%',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
            animation:'sm4-shine 2s linear infinite',
          }}>💰 JACKPOT! 💰</div>
        )}
      </div>
    </div>
  );
}
