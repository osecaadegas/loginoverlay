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
  /* Guard transient flag: ignore stale spinning state (>8s old) */
  const spinning  = c.spinning && c._spinStart && (Date.now() - c._spinStart < 8000);
  const isWin     = c.lastWin;

  /* Derive display reels */
  const reels = results.length >= reelCount ? results.slice(0, reelCount)
    : Array.from({ length: reelCount }, (_, i) => results[i] || symbols[i % symbols.length]);

  /* ── Reel strip builder ── */
  const STRIP_LEN = 18;
  const buildStrip = (result, idx) => {
    const strip = [];
    for (let j = 0; j < STRIP_LEN; j++) strip.push(symbols[(idx * 3 + j * 7 + 1) % symbols.length]);
    strip.push(result);
    /* Extra duplicate so any easing overshoot still shows the correct symbol */
    strip.push(result);
    return strip;
  };
  /* Scroll to the result item (index STRIP_LEN) out of STRIP_LEN+2 total items */
  const totalItems = STRIP_LEN + 2;
  const scrollEnd = ((STRIP_LEN / totalItems) * 100).toFixed(3);
  const reelDur = (i) => 1.8 + i * 0.5;

  /* ── Shared keyframes ── */
  const kf = `
    @keyframes sm-scroll{from{transform:translateY(0)}to{transform:translateY(-${scrollEnd}%)}}
    @keyframes sm-blur{0%{filter:blur(0)}10%{filter:blur(3px)}65%{filter:blur(2.5px)}85%{filter:blur(1px)}95%{filter:blur(.3px)}100%{filter:blur(0)}}
    @keyframes sm-land{0%{transform:scale(1.08)}50%{transform:scale(.97)}100%{transform:scale(1)}}
    @keyframes sm-win-flash{0%,100%{box-shadow:0 0 8px ${accent}33}50%{box-shadow:0 0 28px ${accent}88,0 0 60px ${accent}33}}
    @keyframes sm-shine{0%{background-position:-200% center}100%{background-position:200% center}}
  `;

  /* ── Reel component ── */
  const Reel = ({ sym, idx, reelStyle }) => {
    if (spinning) {
      const strip = buildStrip(sym, idx);
      const dur = reelDur(idx);
      return (
        <div style={{ ...reelStyle, overflow:'hidden' }}>
          <div style={{
            display:'flex', flexDirection:'column', alignItems:'center',
            height:`${totalItems * 100}%`,
            animation:`sm-scroll ${dur}s cubic-bezier(0.12,0,0.25,1) forwards, sm-blur ${dur}s ease-in-out forwards`,
          }}>
            {strip.map((s, j) => (
              <div key={j} style={{ flex:'0 0 auto', height:`${(100/totalItems).toFixed(3)}%`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'inherit' }}>{s}</div>
            ))}
          </div>
        </div>
      );
    }
    return (
      <div style={{ ...reelStyle, display:'flex', alignItems:'center', justifyContent:'center',
        animation: results.length > 0 ? `sm-land 0.25s ease-out` : 'none' }}>
        {sym}
      </div>
    );
  };

  /* ─── v1  Realistic 3D Machine ─── */
  if (st === 'v1') return (
    <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:font, background:'transparent', containerType:'inline-size' }}>
      <style>{kf}</style>
      <div style={{
        width:'92%', height:'88%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        background:`linear-gradient(180deg, ${machineC}, ${machineC}cc 40%, ${machineC}88)`,
        borderRadius:'clamp(8px,3cqi,18px)', position:'relative',
        border:'3px solid rgba(255,255,255,0.1)', gap:'3%', padding:'4% 3%',
        boxShadow:'0 8px 40px rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,255,255,0.2)',
      }}>
        <div style={{ fontSize:'clamp(7px,2.5cqi,13px)', fontWeight:900, color:'rgba(255,255,255,0.6)', letterSpacing:'0.2em', textTransform:'uppercase' }}>SLOT MACHINE</div>
        <div style={{
          display:'flex', gap:'2%', padding:'3%', background:'rgba(0,0,0,0.6)',
          borderRadius:'clamp(6px,2cqi,12px)', border:'2px inset rgba(255,255,255,0.1)',
          boxShadow:'inset 0 4px 12px rgba(0,0,0,0.8)', width:'90%', height:'58%',
          animation: isWin && !spinning ? 'sm-win-flash 1s ease-in-out infinite' : 'none',
        }}>
          {reels.map((sym, i) => (
            <Reel key={i} sym={sym} idx={i} reelStyle={{
              flex:1, height:'100%', borderRadius:'clamp(4px,1.5cqi,10px)',
              background:`linear-gradient(180deg, ${reelBg}, ${reelBg}cc)`,
              border:'1px solid rgba(255,255,255,0.08)', fontSize:'clamp(14px,6cqi,40px)',
              boxShadow:'inset 0 2px 8px rgba(0,0,0,0.4)',
            }} />
          ))}
        </div>
        <div style={{ position:'absolute', left:'6%', right:'6%', top:'50%', height:2,
          background:`linear-gradient(90deg, transparent, ${accent}, transparent)`, opacity:0.4, pointerEvents:'none' }} />
        {isWin && !spinning && (
          <div style={{ fontSize:'clamp(9px,3cqi,16px)', fontWeight:900, color:accent, letterSpacing:'0.1em',
            textShadow:`0 0 10px ${accent}88` }}>🎉 JACKPOT!</div>
        )}
      </div>
    </div>
  );

  /* ─── v2  Neon Arcade ─── */
  if (st === 'v2') return (
    <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:font, background:'transparent', containerType:'inline-size' }}>
      <style>{kf}</style>
      <div style={{
        width:'88%', height:'84%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        background:'rgba(10,10,20,0.9)', borderRadius:'clamp(10px,4cqi,22px)',
        border:`2px solid ${accent}66`, boxShadow:`0 0 40px ${accent}22, 0 8px 32px rgba(0,0,0,0.4)`,
        gap:'4%', padding:'4%',
        animation: isWin && !spinning ? 'sm-win-flash 1s ease-in-out infinite' : 'none',
      }}>
        <div style={{ fontSize:'clamp(7px,2.5cqi,12px)', fontWeight:800, color:accent, letterSpacing:'0.25em', textShadow:`0 0 8px ${accent}` }}>★ CASINO ★</div>
        <div style={{ display:'flex', gap:'3%', width:'90%', height:'55%' }}>
          {reels.map((sym, i) => (
            <Reel key={i} sym={sym} idx={i} reelStyle={{
              flex:1, height:'100%', borderRadius:'clamp(6px,2cqi,12px)',
              background:'rgba(255,255,255,0.04)', border:`1px solid ${accent}44`,
              fontSize:'clamp(12px,5.5cqi,36px)',
              boxShadow:`inset 0 0 12px rgba(0,0,0,0.5), 0 0 6px ${accent}11`,
            }} />
          ))}
        </div>
        {isWin && !spinning && (
          <div style={{ fontSize:'clamp(10px,3.5cqi,18px)', fontWeight:900, color:accent, textShadow:`0 0 16px ${accent}` }}>🎰 WINNER!</div>
        )}
      </div>
    </div>
  );

  /* ─── v3  Minimal Clean ─── */
  if (st === 'v3') return (
    <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:font, background:'transparent', containerType:'inline-size' }}>
      <style>{kf}</style>
      <div style={{ display:'flex', gap:'3%', padding:'4%', width:'85%', height:'60%' }}>
        {reels.map((sym, i) => (
          <Reel key={i} sym={sym} idx={i} reelStyle={{
            flex:1, height:'100%', borderRadius:'clamp(6px,2.5cqi,14px)',
            background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)',
            fontSize:'clamp(14px,6.5cqi,44px)',
          }} />
        ))}
      </div>
    </div>
  );

  /* ─── v4  Vegas Golden ─── */
  return (
    <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:font, background:'transparent', containerType:'inline-size' }}>
      <style>{kf}</style>
      <div style={{
        width:'90%', height:'86%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        background:'linear-gradient(180deg, #1a0a00, #2d1400)',
        borderRadius:'clamp(8px,3cqi,18px)', border:'3px solid #f59e0b44',
        boxShadow:'0 0 30px rgba(245,158,11,0.1), 0 8px 32px rgba(0,0,0,0.5)',
        gap:'3%', padding:'4% 3%',
      }}>
        <div style={{
          fontSize:'clamp(7px,2.8cqi,14px)', fontWeight:900, letterSpacing:'0.15em',
          background:'linear-gradient(90deg, #f59e0b, #fde68a, #f59e0b)', backgroundSize:'200%',
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
          animation:'sm-shine 3s linear infinite',
        }}>★ VEGAS ★</div>
        <div style={{
          display:'flex', gap:'2%', padding:'3%', width:'88%', height:'58%',
          background:'linear-gradient(180deg, rgba(0,0,0,0.8), rgba(0,0,0,0.6))',
          borderRadius:'clamp(6px,2cqi,14px)', border:'2px solid #f59e0b33',
          boxShadow:'inset 0 4px 16px rgba(0,0,0,0.8)',
        }}>
          {reels.map((sym, i) => (
            <Reel key={i} sym={sym} idx={i} reelStyle={{
              flex:1, height:'100%', borderRadius:'clamp(4px,1.5cqi,10px)',
              background:'linear-gradient(180deg, #1a1a2e, #0d0d14)',
              border:'1px solid rgba(245,158,11,0.15)', fontSize:'clamp(14px,6cqi,40px)',
            }} />
          ))}
        </div>
        {isWin && !spinning && (
          <div style={{
            fontSize:'clamp(9px,3cqi,16px)', fontWeight:900, letterSpacing:'0.1em',
            background:'linear-gradient(90deg, #f59e0b, #fde68a, #f59e0b)', backgroundSize:'200%',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
            animation:'sm-shine 2s linear infinite',
          }}>💰 JACKPOT! 💰</div>
        )}
      </div>
    </div>
  );
}
