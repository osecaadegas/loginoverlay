/**
 * CoinFlipWidget.jsx — Proper 3D coin with CSS transforms.
 *
 * Instant-flip mode: any chat bet triggers an immediate spin.
 * Commands: !bet heads/tails [amount], !heads [amt], !tails [amt],
 *           !flip heads [amt], !cf tails [amt], !coinflip heads [amt]
 * SE points are paid/deducted automatically after each flip.
 */
import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import useTwitchChat from '../../../hooks/useTwitchChat';
import useKickChat from '../../../hooks/useKickChat';
import { supabase } from '../../../config/supabaseClient';

function CoinFlipWidget({ config, widgetId }) {
  const c = config || {};
  const st = c.displayStyle || 'v1';
  const hColor = c.headsColor || '#f59e0b';
  const tColor = c.tailsColor || '#3b82f6';
  const font   = c.fontFamily || "'Inter', sans-serif";
  const hLabel = c.headsLabel || 'HEADS';
  const tLabel = c.tailsLabel || 'TAILS';
  const hImg   = c.headsImage || '/badges/heads.png';
  const tImg   = c.tailsImage || '/badges/tails.png';
  const isHeads = c.result !== 'tails';
  /* Guard stale flipping flag (>6 s) */
  const flipping = c.flipping && c._flipStart && (Date.now() - c._flipStart < 6000);

  const minBet = c.minBet || 10;
  const maxBet = c.maxBet || 10000;
  const chatBettingEnabled = !!c.chatBettingEnabled;
  const flipCooldown = (c.flipCooldown ?? 5) * 1000;
  const cooldownRef = useRef(null);
  const flippingRef = useRef(false);
  useEffect(() => { flippingRef.current = flipping; }, [flipping]);
  useEffect(() => () => { if (cooldownRef.current) clearTimeout(cooldownRef.current); }, []);

  /* ── SE credentials (from env or config) ── */
  const seChannelId = c.seChannelId || import.meta.env.VITE_SE_CHANNEL_ID || '';
  const seJwtToken  = c.seJwtToken  || import.meta.env.VITE_SE_JWT_TOKEN  || '';
  const seConnected = !!seChannelId && !!seJwtToken;
  const pointPayoutsEnabled = !!c.pointPayoutsEnabled && seConnected;

  const modifyPoints = useCallback(async (username, amount) => {
    if (!seConnected) return;
    try {
      await fetch(
        `https://api.streamelements.com/kappa/v2/points/${seChannelId}/${username}/${amount}`,
        { method: 'PUT', headers: { 'Authorization': `Bearer ${seJwtToken}`, 'Accept': 'application/json' } }
      );
    } catch (e) { console.error('[CoinFlip] SE points error:', e); }
  }, [seConnected, seChannelId, seJwtToken]);

  const writeConfig = useCallback(async (patch) => {
    if (!widgetId) return;
    try {
      const { data } = await supabase.from('overlay_widgets').select('config').eq('id', widgetId).single();
      if (!data) return;
      await supabase.from('overlay_widgets').update({
        config: { ...data.config, ...patch },
        updated_at: new Date().toISOString(),
      }).eq('id', widgetId);
    } catch (e) { console.error('[CoinFlip] writeConfig:', e); }
  }, [widgetId]);

  /* ── Instant flip: one bet → immediate spin → payout → ready ── */
  const doInstantFlip = useCallback(async (user, side, amount) => {
    if (!widgetId) return;
    let result;
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const arr = new Uint32Array(1); crypto.getRandomValues(arr);
      result = arr[0] % 2 === 0 ? 'heads' : 'tails';
    } else {
      result = Math.random() < 0.5 ? 'heads' : 'tails';
    }
    const won = side === result;
    // Start spin
    try {
      const { data } = await supabase.from('overlay_widgets').select('config').eq('id', widgetId).single();
      if (!data) return;
      const cfg = data.config || {};
      await supabase.from('overlay_widgets').update({
        config: { ...cfg, flipping: true, _flipStart: Date.now(), _prevResult: cfg.result || 'heads', result },
        updated_at: new Date().toISOString(),
      }).eq('id', widgetId);
    } catch (e) { console.error('[CoinFlip] flip start:', e); return; }
    // After animation → result + payout
    setTimeout(async () => {
      // SE payout
      if (pointPayoutsEnabled) {
        await modifyPoints(user, won ? amount : -amount);
      }
      try {
        const { data } = await supabase.from('overlay_widgets').select('config').eq('id', widgetId).single();
        if (!data) return;
        const cfg = data.config || {};
        const entry = { result, user, side, amount, won, time: new Date().toLocaleTimeString() };
        await supabase.from('overlay_widgets').update({
          config: { ...cfg, flipping: false, flipHistory: [entry, ...(cfg.flipHistory || [])].slice(0, 50) },
          updated_at: new Date().toISOString(),
        }).eq('id', widgetId);
      } catch (e) { console.error('[CoinFlip] flip result:', e); }
      // Cooldown before accepting new bets
      cooldownRef.current = setTimeout(() => { cooldownRef.current = null; }, flipCooldown);
    }, 3000);
  }, [widgetId, flipCooldown, pointPayoutsEnabled, modifyPoints]);

  /* ── Chat handler ── */
  const handleChatMessage = useCallback((msg) => {
    if (!chatBettingEnabled) return;
    if (flippingRef.current || cooldownRef.current) return;
    const txt = (msg.message || '').trim().toLowerCase();

    let side, amount;
    /* !bet heads 500 / !bet tails */
    const mb = txt.match(/^!bet\s+(heads?|tails?)\s*(\d*)$/);
    if (mb) { side = mb[1].startsWith('head') ? 'heads' : 'tails'; amount = parseInt(mb[2]) || minBet; }
    /* !heads 500, !tails */
    if (!side) { const m1 = txt.match(/^!(heads?|tails?)\s*(\d*)$/); if (m1) { side = m1[1].startsWith('head') ? 'heads' : 'tails'; amount = parseInt(m1[2]) || minBet; } }
    /* !flip heads 500, !cf tails, !coinflip heads */
    if (!side) { const m2 = txt.match(/^!(flip|cf|coinflip)\s+(heads?|tails?)\s*(\d*)$/); if (m2) { side = m2[2].startsWith('head') ? 'heads' : 'tails'; amount = parseInt(m2[3]) || minBet; } }
    if (!side) return;
    amount = Math.max(minBet, Math.min(maxBet, amount));
    const user = msg.username;
    if (!user) return;
    doInstantFlip(user, side, amount);
  }, [chatBettingEnabled, minBet, maxBet, doInstantFlip]);

  /* Always listen for chat when betting is enabled */
  const listenTwitch = chatBettingEnabled && !!c.twitchEnabled && !!c.twitchChannel;
  const listenKick   = chatBettingEnabled && !!c.kickEnabled   && !!c.kickChannelId;
  useTwitchChat(listenTwitch ? c.twitchChannel : '', handleChatMessage);
  useKickChat(listenKick ? c.kickChannelId : '', handleChatMessage);

  /* ═══ 3D COIN GEOMETRY ═══ */
  const DEPTH = 8;           // coin thickness in px
  const HALF  = DEPTH / 2;
  const SPINS = 8;           // full rotations during flip

  /* 0° = heads face visible · 180° = tails face visible */
  const rest = isHeads ? 0 : 180;
  const prev = (c._prevResult || 'heads') !== 'tails' ? 0 : 180;
  const endDeg = SPINS * 360 + rest;
  const range  = endDeg - prev;

  /* Ease-out cubic: ~80 % of rotation in first ~40 % of time */
  const eo = (t) => 1 - (1 - t) * (1 - t) * (1 - t);
  const rotAt = (t) => Math.round(prev + range * eo(t));
  const flipRest = `rotateY(${rest}deg)`;

  /* ── Keyframes (memoised – recomputed only when result changes) ── */
  const kf = useMemo(() => {
    const P = [0, 5, 12, 20, 30, 42, 55, 67, 78, 87, 93, 97, 100];
    const Y = [0, -20, -55, -95, -125, -135, -115, -80, -40, -12, 5, -2, 0];
    const X = [0, 15, -10, 12, -8, 6, -4, 3, -2, 1, -0.5, 0.2, 0];
    let spin = '@keyframes cf-spin{';
    P.forEach((p, i) => {
      spin += `${p}%{transform:rotateY(${rotAt(p / 100)}deg) rotateX(${X[i]}deg) translateY(${Y[i]}%)}`;
    });
    spin += '}';
    const fr = `rotateY(${rest}deg)`;
    const idle = c.result ? fr : 'rotateY(0deg)';
    return `${spin}
@keyframes cf-land{0%{transform:${fr} scale(1.12);filter:brightness(1.25)}30%{transform:${fr} scale(.95);filter:brightness(.95)}55%{transform:${fr} scale(1.03);filter:brightness(1.04)}80%{transform:${fr} scale(.99)}100%{transform:${fr} scale(1);filter:brightness(1)}}
@keyframes cf-float{0%,100%{transform:${idle} translateY(0)}50%{transform:${idle} translateY(-3%)}}
@keyframes cf-flat{0%{transform:scaleX(1) rotateZ(0)}25%{transform:scaleX(0) rotateZ(5deg)}50%{transform:scaleX(1) rotateZ(0)}75%{transform:scaleX(0) rotateZ(-5deg)}100%{transform:scaleX(1) rotateZ(0)}}
@keyframes cf-shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
@keyframes cf-pop{0%{transform:scale(0);opacity:0}60%{transform:scale(1.15);opacity:1}100%{transform:scale(1)}}
@keyframes cf-shad{0%,100%{opacity:.3}50%{opacity:.6}}`;
  }, [rest, prev, endDeg, c.result]); // eslint-disable-line react-hooks/exhaustive-deps

  /* animation-timing-function is LINEAR because deceleration is baked into keyframe values */
  const anim3d = flipping
    ? 'cf-spin 2.5s linear forwards'
    : (c.result ? 'cf-land 0.4s ease-out forwards' : 'cf-float 3s ease-in-out infinite');

  /* ── Face content ── */
  const hasImg = (side) => !!(side === 'heads' ? hImg : tImg);
  const faceContent = (side) => {
    const img = side === 'heads' ? hImg : tImg;
    const label = side === 'heads' ? hLabel : tLabel;
    if (img) return <img src={img} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />;
    return (
      <span style={{
        fontSize: 'clamp(8px,7cqi,32px)', fontWeight: 900, color: '#fff',
        textShadow: '0 2px 4px rgba(0,0,0,0.4)', letterSpacing: '0.05em',
        lineHeight: 1.1, textAlign: 'center',
      }}>
        {label}
      </span>
    );
  };

  /* ── 3D Edge: Z-stacked circles forming the coin rim ──
     No backface-visibility — always visible from all angles */
  const edgeRing = (color1, color2) => {
    if (hasImg('heads') && hasImg('tails')) return null;
    const N = 14;
    const slices = [];
    for (let i = 0; i <= N; i++) {
      const z = -HALF + (DEPTH / N) * i;
      slices.push(
        <div key={i} style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: i <= N / 2 ? color1 : color2,
          transform: `translateZ(${z.toFixed(1)}px)`,
        }} />
      );
    }
    return slices;
  };

  /* ── Shared layout pieces ── */
  const wrap = {
    width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: '3%',
    fontFamily: font, perspective: 800, background: 'transparent', containerType: 'inline-size',
  };
  const coinOuter = { width: '60%', maxHeight: '75%', aspectRatio: '1', flexShrink: 0 };
  const coinBody  = { width: '100%', height: '100%', position: 'relative', transformStyle: 'preserve-3d', animation: anim3d };
  /* clipPath instead of overflow:hidden — overflow:hidden flattens the 3D context
     in Chromium/OBS and breaks backfaceVisibility */
  const FACE_Z = HALF + 1; // 1px outside edge ring to prevent z-fighting
  const face = (extra) => ({
    position: 'absolute', inset: 0, borderRadius: '50%',
    backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
    clipPath: 'circle(50% at 50% 50%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', ...extra,
  });

  /* ═══════════════════════════════════════════════════
     v1  Realistic 3D Gold Coin
     ═══════════════════════════════════════════════════ */
  if (st === 'v1') {
    return (
      <div style={wrap}>
        <style>{kf}</style>
        <div style={{ ...coinOuter, filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.45))' }}>
          <div style={coinBody}>
            {edgeRing(`${hColor}88`, `${hColor}55`)}
            <div style={face({
              background: hasImg('heads') ? 'transparent' : `radial-gradient(ellipse at 30% 30%, ${hColor}ee, ${hColor}99 45%, ${hColor}66)`,
              border: hasImg('heads') ? 'none' : '4px solid rgba(255,255,255,0.15)',
              boxShadow: hasImg('heads') ? 'none' : 'inset 0 -5px 10px rgba(0,0,0,0.35), inset 0 5px 10px rgba(255,255,255,0.25)',
              transform: `translateZ(${FACE_Z}px)`,
            })}>{faceContent('heads')}</div>
            <div style={face({
              background: hasImg('tails') ? 'transparent' : `radial-gradient(ellipse at 30% 30%, ${tColor}ee, ${tColor}99 45%, ${tColor}66)`,
              border: hasImg('tails') ? 'none' : '4px solid rgba(255,255,255,0.15)',
              boxShadow: hasImg('tails') ? 'none' : 'inset 0 -5px 10px rgba(0,0,0,0.35), inset 0 5px 10px rgba(255,255,255,0.25)',
              transform: `rotateY(180deg) translateZ(${FACE_Z}px)`,
            })}>{faceContent('tails')}</div>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════
     v2  Neon Glow 3D
     ═══════════════════════════════════════════════════ */
  if (st === 'v2') {
    const glow = isHeads ? hColor : tColor;
    return (
      <div style={wrap}>
        <style>{kf}</style>
        <div style={{ ...coinOuter, filter: `drop-shadow(0 0 28px ${glow}55)` }}>
          <div style={coinBody}>
            {edgeRing('#1a1a2e', '#0d0d14')}
            <div style={face({
              background: hasImg('heads') ? 'transparent' : 'radial-gradient(circle at 35% 35%, #1a1a2e, #0d0d14)',
              border: hasImg('heads') ? 'none' : `3px solid ${hColor}`,
              boxShadow: hasImg('heads') ? 'none' : `0 0 30px ${hColor}44, inset 0 0 20px ${hColor}22`,
              transform: `translateZ(${FACE_Z}px)`,
            })}>{faceContent('heads')}</div>
            <div style={face({
              background: hasImg('tails') ? 'transparent' : 'radial-gradient(circle at 35% 35%, #1a1a2e, #0d0d14)',
              border: hasImg('tails') ? 'none' : `3px solid ${tColor}`,
              boxShadow: hasImg('tails') ? 'none' : `0 0 30px ${tColor}44, inset 0 0 20px ${tColor}22`,
              transform: `rotateY(180deg) translateZ(${FACE_Z}px)`,
            })}>{faceContent('tails')}</div>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════
     v3  Minimal Flat
     ═══════════════════════════════════════════════════ */
  if (st === 'v3') {
    const bg = isHeads ? hColor : tColor;
    return (
      <div style={{ ...wrap, perspective: 'none' }}>
        <style>{kf}</style>
        <div style={{
          width: '55%', maxHeight: '75%', aspectRatio: '1', borderRadius: '50%', flexShrink: 0,
          background: hasImg(isHeads ? 'heads' : 'tails') ? 'transparent' : bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
          border: hasImg(isHeads ? 'heads' : 'tails') ? 'none' : undefined,
          animation: flipping ? 'cf-flat 0.5s ease-in-out 4 forwards' : 'none',
          transition: 'background 0.3s',
        }}>
          {faceContent(isHeads ? 'heads' : 'tails')}
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════
     v4  Metallic Casino (default)
     ═══════════════════════════════════════════════════ */
  return (
    <div style={wrap}>
      <style>{kf}</style>
      <div style={{ ...coinOuter, filter: 'drop-shadow(0 10px 24px rgba(0,0,0,0.45))' }}>
        <div style={coinBody}>
          {edgeRing('#92400e', '#d4a017')}
          <div style={face({
            background: hasImg('heads') ? 'transparent' : `linear-gradient(145deg, #fde68a, ${hColor}, #92400e, ${hColor}, #fde68a)`,
            backgroundSize: '400% 400%',
            animation: !flipping && !hasImg('heads') ? 'cf-shimmer 3s linear infinite' : 'none',
            border: hasImg('heads') ? 'none' : '4px ridge rgba(255,255,255,0.25)',
            boxShadow: hasImg('heads') ? 'none' : 'inset 0 -6px 12px rgba(0,0,0,0.4), inset 0 6px 12px rgba(255,255,255,0.3)',
            transform: `translateZ(${FACE_Z}px)`,
          })}>{faceContent('heads')}</div>
          <div style={face({
            background: hasImg('tails') ? 'transparent' : `linear-gradient(145deg, #bfdbfe, ${tColor}, #1e3a5f, ${tColor}, #bfdbfe)`,
            backgroundSize: '400% 400%',
            animation: !flipping && !hasImg('tails') ? 'cf-shimmer 3s linear infinite' : 'none',
            border: hasImg('tails') ? 'none' : '4px ridge rgba(255,255,255,0.25)',
            boxShadow: hasImg('tails') ? 'none' : 'inset 0 -6px 12px rgba(0,0,0,0.4), inset 0 6px 12px rgba(255,255,255,0.3)',
            transform: `rotateY(180deg) translateZ(${FACE_Z}px)`,
          })}>{faceContent('tails')}</div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(CoinFlipWidget);
