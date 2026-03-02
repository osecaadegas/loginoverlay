import React, { useEffect, useState, useRef, useCallback } from 'react';
import { fetchNowPlaying, refreshSpotifyToken } from '../../../utils/spotifyAuth';
import { supabase } from '../../../config/supabaseClient';

/* ─── Crypto price fetcher (CoinGecko free API) ─── */
const CRYPTO_IDS = {
  btc: 'bitcoin', eth: 'ethereum', sol: 'solana', bnb: 'binancecoin',
  xrp: 'ripple', ada: 'cardano', doge: 'dogecoin', dot: 'polkadot',
  avax: 'avalanche-2', matic: 'matic-network', ltc: 'litecoin', link: 'chainlink',
};

const CRYPTO_SYMBOLS = {
  btc: '₿', eth: 'Ξ', sol: 'S', bnb: 'B', xrp: 'X', ada: 'A',
  doge: 'Ð', dot: '●', avax: 'A', matic: 'M', ltc: 'Ł', link: '⬡',
};

async function fetchCryptoPrices(coins) {
  if (!coins || coins.length === 0) return {};
  const ids = coins.map(c => CRYPTO_IDS[c]).filter(Boolean).join(',');
  if (!ids) return {};
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
    );
    if (!res.ok) return {};
    const data = await res.json();
    const result = {};
    for (const coin of coins) {
      const id = CRYPTO_IDS[coin];
      if (id && data[id]) {
        result[coin] = {
          price: data[id].usd,
          change: data[id].usd_24h_change || 0,
        };
      }
    }
    return result;
  } catch { return {}; }
}

/* ─── Clock hook ─── */
function useClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const update = () => {
      const d = new Date();
      setTime(
        `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
      );
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

/* ─── Main Navbar Widget (OBS Render) ─── */
export default function NavbarWidget({ config, widgetId }) {
  const c = config || {};
  const time = useClock();
  const [cryptoPrices, setCryptoPrices] = useState({});
  const [nowPlaying, setNowPlaying] = useState(null);
  const [cryptoIndex, setCryptoIndex] = useState(0);
  const [cryptoFading, setCryptoFading] = useState(false);
  const spotifyTokenRef = useRef(c.spotify_access_token);
  const spotifyRefreshRef = useRef(c.spotify_refresh_token);
  const spotifyExpiresRef = useRef(c.spotify_expires_at);

  // Keep refs in sync with config
  useEffect(() => {
    spotifyTokenRef.current = c.spotify_access_token;
    spotifyRefreshRef.current = c.spotify_refresh_token;
    spotifyExpiresRef.current = c.spotify_expires_at;
  }, [c.spotify_access_token, c.spotify_refresh_token, c.spotify_expires_at]);

  // Crypto price polling
  useEffect(() => {
    if (!c.showCrypto || !c.cryptoCoins?.length) return;
    const poll = () => fetchCryptoPrices(c.cryptoCoins).then(setCryptoPrices);
    poll();
    const id = setInterval(poll, 60000);
    return () => clearInterval(id);
  }, [c.showCrypto, c.cryptoCoins?.join(',')]);

  // Crypto cycling — all modes show one coin at a time
  const cryptoMode = c.cryptoDisplayMode || 'horizontal';
  const activeCoins = (c.cryptoCoins || []).filter(coin => cryptoPrices[coin]);
  useEffect(() => {
    if (activeCoins.length <= 1) return;
    const interval = cryptoMode === 'fade' ? 4000 : 3500;
    const id = setInterval(() => {
      setCryptoFading(true);
      setTimeout(() => {
        setCryptoIndex(prev => (prev + 1) % activeCoins.length);
        setCryptoFading(false);
      }, 350);
    }, interval);
    return () => clearInterval(id);
  }, [cryptoMode, activeCoins.length]);

  // Spotify "Now Playing" polling
  useEffect(() => {
    if (c.musicSource !== 'spotify' || !c.showNowPlaying) return;
    if (!spotifyTokenRef.current) return;

    const poll = async () => {
      let token = spotifyTokenRef.current;
      // Auto-refresh if expired
      if (spotifyExpiresRef.current && Date.now() > spotifyExpiresRef.current - 60000) {
        try {
          const fresh = await refreshSpotifyToken(spotifyRefreshRef.current);
          token = fresh.access_token;
          spotifyTokenRef.current = fresh.access_token;
          spotifyRefreshRef.current = fresh.refresh_token;
          spotifyExpiresRef.current = fresh.expires_at;
          // Persist refreshed tokens to DB so OBS reloads keep working
          if (widgetId) {
            supabase.from('overlay_widgets').select('config').eq('id', widgetId).single()
              .then(({ data }) => {
                if (data) {
                  const updated = { ...data.config, spotify_access_token: fresh.access_token, spotify_refresh_token: fresh.refresh_token, spotify_expires_at: fresh.expires_at };
                  supabase.from('overlay_widgets').update({ config: updated, updated_at: new Date().toISOString() }).eq('id', widgetId).then(() => {});
                }
              });
          }
        } catch { /* token refresh failed */ }
      }
      if (!token) return;
      const np = await fetchNowPlaying(token);
      setNowPlaying(np);
    };

    poll();
    const id = setInterval(poll, 10000);
    return () => clearInterval(id);
  }, [c.musicSource, c.showNowPlaying, c.spotify_access_token]);

  // Manual "Now Playing"
  const displayNowPlaying = c.musicSource === 'spotify' && nowPlaying
    ? nowPlaying
    : c.musicSource === 'manual' && (c.manualArtist || c.manualTrack)
      ? { artist: c.manualArtist || '', track: c.manualTrack || '', isPlaying: true }
      : null;

  /* ─── Style vars from config ─── */
  const isMetal = (c.displayStyle === 'metallic');
  const isNeon = (c.displayStyle === 'neon');
  const isGlass = (c.displayStyle === 'glass');
  const isRetro = (c.displayStyle === 'retro');
  const accentColor = c.accentColor || (isMetal ? '#7c8dff' : isNeon ? '#00ffcc' : isGlass ? '#60a5fa' : isRetro ? '#ff6b2b' : '#f59e0b');
  const accentColorRGB = hexToRgb(accentColor);
  const bgColor = c.bgColor || (isMetal ? '#14162a' : isNeon ? '#050510' : isGlass ? '#0f172a' : isRetro ? '#1a0a00' : '#111318');
  const textColor = c.textColor || (isMetal ? '#d0d4e4' : isNeon ? '#e0ffe8' : isGlass ? '#e0eaff' : isRetro ? '#ffd9b3' : '#f1f5f9');
  const mutedColor = c.mutedColor || (isMetal ? '#5a6180' : isNeon ? '#1a6655' : isGlass ? '#6b8ccc' : isRetro ? '#885530' : '#94a3b8');
  const borderColor = c.borderColor || accentColor;
  const fontFamily = c.fontFamily || (isRetro ? "'Press Start 2P', 'Courier New', monospace" : "'Inter', sans-serif");
  const brightness = c.brightness ?? 100;
  const contrast = c.contrast ?? 100;
  const saturation = c.saturation ?? 100;
  const borderWidth = c.borderWidth ?? (isMetal ? 1 : isNeon ? 2 : isGlass ? 1 : isRetro ? 3 : 3);
  const barHeight = c.barHeight ?? 64;
  const borderRadius = c.borderRadius ?? (isMetal ? 16 : isNeon ? 12 : isGlass ? 20 : isRetro ? 4 : 999);
  const fontSize = c.fontSize ?? (isRetro ? 10 : 12);
  const ctaColor = c.ctaColor || (isRetro ? '#ff4500' : '#f43f5e');
  const cryptoUpColor = c.cryptoUpColor || '#34d399';
  const cryptoDownColor = c.cryptoDownColor || '#f87171';
  const bgColorRGB = hexToRgb(bgColor);
  const ctaColorRGB = hexToRgb(ctaColor);

  const filterStr = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

  const barOuter = isMetal ? {
    width: '100%', maxWidth: c.maxWidth || 1200, borderRadius,
    background: `linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 40%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.01) 100%)`,
    padding: `${borderWidth}px`,
    boxShadow: `0 1px 0 rgba(255,255,255,0.06) inset, 0 -1px 0 rgba(0,0,0,0.4) inset, 0 20px 50px rgba(0,0,0,0.7), 0 0 40px rgba(${accentColorRGB},0.06)`,
    fontFamily, overflow: 'visible',
    border: `1px solid rgba(255,255,255,0.08)`,
  } : isNeon ? {
    width: '100%', maxWidth: c.maxWidth || 1200, borderRadius,
    background: `linear-gradient(135deg, ${accentColor}44, ${accentColor}11)`,
    padding: `${borderWidth}px`,
    boxShadow: `0 0 30px ${accentColor}33, 0 0 60px ${accentColor}11, inset 0 0 20px ${accentColor}08`,
    fontFamily, overflow: 'visible',
    border: `1px solid ${accentColor}55`,
  } : isGlass ? {
    width: '100%', maxWidth: c.maxWidth || 1200, borderRadius,
    background: `linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))`,
    padding: `${borderWidth}px`,
    boxShadow: `0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)`,
    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    fontFamily, overflow: 'visible',
    border: `1px solid rgba(255,255,255,0.18)`,
  } : isRetro ? {
    width: '100%', maxWidth: c.maxWidth || 1200, borderRadius,
    background: `${borderColor}`,
    padding: `${borderWidth}px`,
    boxShadow: `4px 4px 0 #000, 8px 8px 0 rgba(0,0,0,0.3)`,
    fontFamily, overflow: 'visible',
    border: `${borderWidth}px solid #000`,
    imageRendering: 'pixelated',
  } : {
    width: '100%', maxWidth: c.maxWidth || 1200, borderRadius,
    background: `linear-gradient(to bottom, ${borderColor}e6, ${borderColor}cc)`,
    padding: `${borderWidth}px`,
    boxShadow: `0 18px 40px rgba(0,0,0,0.8)`,
    fontFamily, overflow: 'visible',
  };

  const barInner = isMetal ? {
    display: 'flex', alignItems: 'center', height: barHeight,
    borderRadius: borderRadius - borderWidth,
    background: `linear-gradient(170deg, rgba(${accentColorRGB},0.04) 0%, ${bgColor} 30%, rgba(${accentColorRGB},0.03) 60%, ${bgColor} 100%)`,
    padding: '0 24px', color: textColor, fontSize, gap: 0,
    overflow: 'visible', position: 'relative', filter: filterStr,
  } : isNeon ? {
    display: 'flex', alignItems: 'center', height: barHeight,
    borderRadius: borderRadius - borderWidth,
    background: `linear-gradient(170deg, ${bgColor} 0%, rgba(${accentColorRGB},0.04) 50%, ${bgColor} 100%)`,
    padding: '0 22px', color: textColor, fontSize, gap: 0,
    overflow: 'visible', position: 'relative', filter: filterStr,
  } : isGlass ? {
    display: 'flex', alignItems: 'center', height: barHeight,
    borderRadius: borderRadius - borderWidth,
    background: `linear-gradient(135deg, rgba(${bgColorRGB},0.7), rgba(${bgColorRGB},0.5))`,
    backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
    padding: '0 22px', color: textColor, fontSize, gap: 0,
    overflow: 'visible', position: 'relative', filter: filterStr,
  } : isRetro ? {
    display: 'flex', alignItems: 'center', height: barHeight,
    borderRadius: Math.max(borderRadius - borderWidth, 0),
    background: `linear-gradient(180deg, ${bgColor}, #0d0500)`,
    padding: '0 16px', color: textColor, fontSize, gap: 0,
    overflow: 'visible', position: 'relative', filter: filterStr,
    borderTop: '2px solid rgba(255,255,255,0.15)',
  } : {
    display: 'flex', alignItems: 'center', height: barHeight,
    borderRadius: borderRadius - borderWidth,
    background: `linear-gradient(to right, ${bgColor}, ${bgColor}f2, ${bgColor})`,
    padding: '0 20px', color: textColor, fontSize, gap: 0,
    overflow: 'visible', filter: filterStr,
  };

  const sep = isMetal ? {
    width: 1, height: barHeight * 0.5,
    background: `linear-gradient(to bottom, transparent, rgba(${accentColorRGB},0.25), transparent)`,
    flexShrink: 0, margin: '0 18px',
  } : isNeon ? {
    width: 1, height: barHeight * 0.5,
    background: `linear-gradient(to bottom, transparent, ${accentColor}55, transparent)`,
    flexShrink: 0, margin: '0 14px',
    boxShadow: `0 0 6px ${accentColor}33`,
  } : isGlass ? {
    width: 1, height: barHeight * 0.5,
    background: `linear-gradient(to bottom, transparent, rgba(255,255,255,0.2), transparent)`,
    flexShrink: 0, margin: '0 16px',
  } : isRetro ? {
    width: 2, height: barHeight * 0.6,
    background: `${accentColor}88`,
    flexShrink: 0, margin: '0 10px',
  } : {
    width: 1, height: barHeight * 0.55,
    background: `linear-gradient(to bottom, transparent, ${mutedColor}70, transparent)`,
    flexShrink: 0, margin: '0 16px',
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', width: '100%', height: '100%' }}>
      <div style={barOuter}>
        <div style={barInner}>
          {/* Metallic shine overlay */}
          {isMetal && (
            <div style={{
              position: 'absolute', inset: 0,
              borderRadius: borderRadius - borderWidth,
              background: 'linear-gradient(110deg, transparent 0%, rgba(255,255,255,0.015) 30%, rgba(255,255,255,0.04) 48%, rgba(255,255,255,0.015) 52%, transparent 70%)',
              pointerEvents: 'none', zIndex: 0,
            }} />
          )}
          {isMetal && (
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              height: barHeight * 0.45,
              borderRadius: `${borderRadius - borderWidth}px ${borderRadius - borderWidth}px 0 0`,
              background: 'linear-gradient(180deg, rgba(255,255,255,0.03), transparent)',
              pointerEvents: 'none', zIndex: 0,
            }} />
          )}
          {/* Neon glow line */}
          {isNeon && (
            <div style={{
              position: 'absolute', bottom: 0, left: '10%', right: '10%', height: 2,
              background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
              boxShadow: `0 0 12px ${accentColor}66, 0 0 24px ${accentColor}22`,
              borderRadius: 1, pointerEvents: 'none', zIndex: 0,
            }} />
          )}
          {/* Glass frost overlay */}
          {isGlass && (
            <div style={{
              position: 'absolute', inset: 0,
              borderRadius: borderRadius - borderWidth,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%, rgba(255,255,255,0.04) 100%)',
              pointerEvents: 'none', zIndex: 0,
            }} />
          )}
          {/* Retro scanlines */}
          {isRetro && (
            <div style={{
              position: 'absolute', inset: 0,
              borderRadius: Math.max(borderRadius - borderWidth, 0),
              background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)',
              pointerEvents: 'none', zIndex: 0,
            }} />
          )}

          {/* ─── Left: Avatar + Name + Motto ─── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingRight: 16, flexShrink: 0, position: 'relative', zIndex: 1 }}>
            {c.showAvatar !== false && (
              <div style={{
                position: 'relative',
                width: barHeight * 0.72 * ((c.avatarSize ?? 100) / 100),
                height: barHeight * 0.72 * ((c.avatarSize ?? 100) / 100),
                borderRadius: '50%',
                background: 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {c.avatarUrl ? (
                  <img src={c.avatarUrl} alt="" style={{
                    width: '100%', height: '100%',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    background: 'transparent',
                  }} />
                ) : (
                  <div style={{
                    width: '100%', height: '100%',
                    borderRadius: '50%',
                    background: 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: fontSize * 0.7, fontWeight: 600, letterSpacing: '0.12em',
                    textTransform: 'uppercase', color: textColor,
                  }}>
                    {(c.streamerName || 'S').slice(0, 5)}
                  </div>
                )}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', lineHeight: 1.1 }}>
              <span style={{
                backgroundImage: isMetal
                  ? `linear-gradient(135deg, ${textColor}, ${mutedColor}, ${textColor}, ${mutedColor})`
                  : isNeon
                  ? `linear-gradient(to right, ${accentColor}, ${accentColor}88, ${accentColor})`
                  : isGlass
                  ? `linear-gradient(to right, ${textColor}, ${accentColor}, ${textColor})`
                  : isRetro
                  ? `linear-gradient(to right, ${accentColor}, ${ctaColor}, ${accentColor})`
                  : (c.nameGradient || `linear-gradient(to right, ${accentColor}, #ec4899, #a855f7)`),
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                fontSize: fontSize * 1.2, fontWeight: (isMetal || isRetro) ? 700 : 600,
                letterSpacing: isMetal ? '0.22em' : isRetro ? '0.12em' : '0.18em', textTransform: 'uppercase',
                ...(isNeon ? { textShadow: `0 0 20px ${accentColor}44`, filter: `drop-shadow(0 0 6px ${accentColor}33)` } : {}),
              }}>
                {c.streamerName || 'STREAMER'}
              </span>
              {c.motto && (
                <span style={{
                  marginTop: 2, fontSize: fontSize * 0.82, fontWeight: 600,
                  letterSpacing: (isMetal || isNeon) ? '0.4em' : isRetro ? '0.2em' : '0.35em',
                  textTransform: 'uppercase', color: mutedColor,
                  ...(isNeon ? { textShadow: `0 0 6px ${mutedColor}66` } : {}),
                }}>
                  {c.motto}
                </span>
              )}
            </div>
          </div>

          {/* ─── Badge Image (after name/motto) ─── */}
          {c.badgeImage && (
            <>
              <div style={sep} />
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: barHeight, flexShrink: 0, padding: '2px 0',
                position: 'relative', zIndex: 1,
              }}>
                <img src={c.badgeImage} alt="" style={{
                  height: barHeight * 0.85 * ((c.badgeSize ?? 100) / 100), minWidth: barHeight * 1.2 * ((c.badgeSize ?? 100) / 100), objectFit: 'contain',
                  filter: isMetal ? `drop-shadow(0 0 6px rgba(${accentColorRGB},0.3)) brightness(1.05)` : 'drop-shadow(0 0 8px rgba(255,255,255,0.3))',
                }} />
              </div>
            </>
          )}

          {/* ─── Middle: Clock + Now Playing ─── */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, minWidth: 0, position: 'relative', zIndex: 1 }}>
            {c.showClock !== false && (
              <>
                <div style={isMetal ? {
                  borderRadius: 10, padding: '6px 22px',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: textColor,
                  fontSize: fontSize * 0.92, fontWeight: 600, letterSpacing: '0.28em',
                  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04), inset 0 -1px 0 rgba(0,0,0,0.15), 0 0 14px rgba(${accentColorRGB},0.08)`,
                  flexShrink: 0,
                } : isNeon ? {
                  borderRadius: 8, padding: '6px 20px',
                  background: `${accentColor}11`,
                  border: `1px solid ${accentColor}44`,
                  color: accentColor,
                  fontSize: fontSize * 0.92, fontWeight: 600, letterSpacing: '0.28em',
                  boxShadow: `0 0 12px ${accentColor}22, inset 0 0 8px ${accentColor}08`,
                  textShadow: `0 0 8px ${accentColor}66`,
                  flexShrink: 0,
                } : isGlass ? {
                  borderRadius: 14, padding: '6px 20px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(8px)',
                  color: textColor,
                  fontSize: fontSize * 0.92, fontWeight: 600, letterSpacing: '0.25em',
                  flexShrink: 0,
                } : isRetro ? {
                  borderRadius: 2, padding: '6px 14px',
                  background: '#000',
                  border: `2px solid ${accentColor}88`,
                  color: accentColor,
                  fontSize: fontSize * 0.92, fontWeight: 700, letterSpacing: '0.15em',
                  flexShrink: 0,
                } : {
                  borderRadius: 999, padding: '6px 20px',
                  background: `linear-gradient(to bottom, ${accentColor}e6, ${accentColor}cc)`,
                  color: textColor,
                  fontSize: fontSize * 0.92, fontWeight: 600, letterSpacing: '0.25em',
                  boxShadow: `0 0 18px ${accentColor}e6`,
                  flexShrink: 0,
                }}>
                  {time || '--:--:--'}
                </div>
                <div style={sep} />
              </>
            )}

            {c.showNowPlaying !== false && displayNowPlaying && (
              <NowPlayingDisplay
                data={displayNowPlaying}
                musicDisplayStyle={c.musicDisplayStyle || 'text'}
                fontSize={fontSize}
                textColor={textColor}
                mutedColor={mutedColor}
                accentColor={accentColor}
                isMetal={isMetal}
                barHeight={barHeight}
              />
            )}


          </div>

          {/* ─── Right: Crypto + CTA ─── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 16, flexShrink: 0, position: 'relative', zIndex: 1 }}>
            {c.showCrypto && activeCoins.length > 0 && (
              <>
                <CryptoTicker
                  coins={activeCoins}
                  prices={cryptoPrices}
                  mode={cryptoMode}
                  index={cryptoIndex}
                  fading={cryptoFading}
                  fontSize={fontSize}
                  bgColor={bgColor}
                  cryptoUpColor={cryptoUpColor}
                  cryptoDownColor={cryptoDownColor}
                  metallic={isMetal || isNeon || isGlass || isRetro}
                />
                {c.showCTA && <div style={sep} />}
              </>
            )}

            {c.showCTA && c.ctaText && (
              <div style={isMetal ? {
                display: 'flex', alignItems: 'center', gap: 8,
                borderRadius: 10, padding: '7px 20px',
                background: `linear-gradient(135deg, rgba(${ctaColorRGB},0.15), rgba(${ctaColorRGB},0.05))`,
                border: `1px solid rgba(${ctaColorRGB},0.25)`,
                color: ctaColor,
                fontSize: fontSize * 0.82, fontWeight: 700,
                letterSpacing: '0.24em', textTransform: 'uppercase',
                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04), 0 0 16px rgba(${ctaColorRGB},0.1)`,
                flexShrink: 0,
              } : isNeon ? {
                display: 'flex', alignItems: 'center', gap: 8,
                borderRadius: 6, padding: '7px 18px',
                background: `${ctaColor}15`,
                border: `1px solid ${ctaColor}55`,
                color: ctaColor,
                fontSize: fontSize * 0.82, fontWeight: 700,
                letterSpacing: '0.24em', textTransform: 'uppercase',
                boxShadow: `0 0 14px ${ctaColor}33`,
                textShadow: `0 0 8px ${ctaColor}66`,
                flexShrink: 0,
              } : isGlass ? {
                display: 'flex', alignItems: 'center', gap: 8,
                borderRadius: 14, padding: '7px 18px',
                background: `${ctaColor}22`,
                border: `1px solid ${ctaColor}33`,
                backdropFilter: 'blur(6px)',
                color: '#fff',
                fontSize: fontSize * 0.82, fontWeight: 600,
                letterSpacing: '0.24em', textTransform: 'uppercase',
                flexShrink: 0,
              } : isRetro ? {
                display: 'flex', alignItems: 'center', gap: 6,
                borderRadius: 2, padding: '6px 14px',
                background: ctaColor,
                border: '2px solid #000',
                boxShadow: '2px 2px 0 #000',
                color: '#fff',
                fontSize: fontSize * 0.82, fontWeight: 700,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                flexShrink: 0,
              } : {
                display: 'flex', alignItems: 'center', gap: 8,
                borderRadius: 999, padding: '6px 18px',
                background: `linear-gradient(to bottom, ${ctaColor}, ${ctaColor}cc)`,
                color: '#fff',
                fontSize: fontSize * 0.82, fontWeight: 600,
                letterSpacing: '0.24em', textTransform: 'uppercase',
                boxShadow: `0 0 24px ${ctaColor}d9`,
                flexShrink: 0,
              }}>
                <span>{c.ctaText}</span>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

/* ─── Single Crypto Coin pill ─── */
function CryptoCoin({ coin, price, fontSize, bgColor, cryptoUpColor, cryptoDownColor, metallic, style }) {
  const isUp = price.change >= 0;
  const changeColor = isUp ? cryptoUpColor : cryptoDownColor;
  return (
    <div style={metallic ? {
      display: 'flex', alignItems: 'center', gap: 8,
      borderRadius: 10, padding: '6px 14px',
      border: `1px solid ${changeColor}30`,
      background: `linear-gradient(135deg, rgba(255,255,255,0.04), ${changeColor}08)`,
      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04), 0 0 12px ${changeColor}18`,
      fontSize: fontSize * 0.82,
      flexShrink: 0,
      ...style,
    } : {
      display: 'flex', alignItems: 'center', gap: 8,
      borderRadius: 999, padding: '6px 14px',
      border: `1px solid ${changeColor}50`,
      background: `linear-gradient(to right, ${bgColor}b3, ${changeColor}15)`,
      boxShadow: `0 0 14px ${changeColor}50`,
      fontSize: fontSize * 0.82,
      flexShrink: 0,
      ...style,
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: metallic ? '6px' : '50%',
        background: metallic
          ? `linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))`
          : `linear-gradient(135deg, #6366f1, #a855f7, ${cryptoUpColor})`,
        border: metallic ? '1px solid rgba(255,255,255,0.1)' : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: fontSize * 0.9, fontWeight: 900, color: metallic ? changeColor : '#fff',
      }}>
        {CRYPTO_SYMBOLS[coin] || coin[0].toUpperCase()}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
        <span style={{ fontWeight: 600, color: changeColor }}>
          {coin.toUpperCase()} {isUp ? '↑' : '↓'}
        </span>
        <span style={{ fontSize: fontSize * 0.75, color: changeColor, opacity: 0.9 }}>
          ${price.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
          <span>{isUp ? '+' : ''}{price.change?.toFixed(2)}%</span>
        </span>
      </div>
    </div>
  );
}

/* ─── Crypto Ticker with display modes ─── */
function CryptoTicker({ coins, prices, mode, index, fading, fontSize, bgColor, cryptoUpColor, cryptoDownColor, metallic }) {
  const safeIdx = index % coins.length;
  const coin = coins[safeIdx];

  /* Fixed-width wrapper prevents layout shift when coins cycle */
  const tickerStyle = { position: 'relative', minWidth: 160, overflow: 'hidden' };

  const animStyle = mode === 'horizontal'
    ? { transform: `translateX(${fading ? '-8px' : '0'})`, opacity: fading ? 0 : 1, transition: 'all 0.35s ease' }
    : mode === 'carousel'
    ? { transform: `translateY(${fading ? '-12px' : '0'})`, opacity: fading ? 0 : 1, transition: 'all 0.35s ease' }
    : mode === 'fade'
    ? { opacity: fading ? 0 : 1, transition: 'opacity 0.4s ease' }
    : {};

  return (
    <div style={tickerStyle}>
      <div style={animStyle}>
        <CryptoCoin coin={coin} price={prices[coin]}
          fontSize={fontSize} bgColor={bgColor}
          cryptoUpColor={cryptoUpColor} cryptoDownColor={cryptoDownColor}
          metallic={metallic} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Now Playing — multiple display styles for navbar
   ═══════════════════════════════════════════════════════ */
function NowPlayingDisplay({ data, musicDisplayStyle, fontSize, textColor, mutedColor, accentColor, isMetal, barHeight }) {
  switch (musicDisplayStyle) {
    case 'pill':      return <NP_Pill data={data} fontSize={fontSize} textColor={textColor} mutedColor={mutedColor} accentColor={accentColor} isMetal={isMetal} barHeight={barHeight} />;
    case 'marquee':   return <NP_Marquee data={data} fontSize={fontSize} textColor={textColor} mutedColor={mutedColor} accentColor={accentColor} />;
    case 'albumart':  return <NP_AlbumArt data={data} fontSize={fontSize} textColor={textColor} mutedColor={mutedColor} accentColor={accentColor} isMetal={isMetal} barHeight={barHeight} />;
    case 'equalizer': return <NP_Equalizer data={data} fontSize={fontSize} textColor={textColor} mutedColor={mutedColor} accentColor={accentColor} />;
    case 'text':
    default:          return <NP_Text data={data} fontSize={fontSize} textColor={textColor} mutedColor={mutedColor} />;
  }
}

/* Style 1: Text (original) */
function NP_Text({ data, fontSize, textColor, mutedColor }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 160, maxWidth: 300, overflow: 'hidden' }}>
      <span style={{ fontSize: fontSize * 0.75, fontWeight: 600, letterSpacing: '0.28em', textTransform: 'uppercase', color: mutedColor }}>
        Now Playing
      </span>
      <span style={{ fontSize: fontSize * 0.9, fontWeight: 500, color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {data.artist}
      </span>
      <span style={{ fontSize: fontSize * 1.05, fontWeight: 600, letterSpacing: '0.04em', color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {data.track}
      </span>
    </div>
  );
}

/* Style 2: Pill — compact with album art */
function NP_Pill({ data, fontSize, textColor, mutedColor, accentColor, isMetal, barHeight }) {
  const h = barHeight * 0.65;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      borderRadius: isMetal ? 10 : 999, padding: '4px 14px 4px 4px',
      background: isMetal
        ? 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))'
        : `linear-gradient(135deg, ${accentColor}22, ${accentColor}08)`,
      border: isMetal
        ? '1px solid rgba(255,255,255,0.08)'
        : `1px solid ${accentColor}33`,
      boxShadow: isMetal
        ? 'inset 0 1px 0 rgba(255,255,255,0.04)'
        : `0 0 12px ${accentColor}22`,
      maxWidth: 320, overflow: 'hidden',
    }}>
      {data.albumArt ? (
        <img src={data.albumArt} alt="" style={{
          width: h, height: h, borderRadius: isMetal ? 7 : h / 2,
          objectFit: 'cover', flexShrink: 0,
        }} />
      ) : (
        <div style={{
          width: h, height: h, borderRadius: isMetal ? 7 : h / 2,
          background: `${accentColor}33`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: h * 0.5, flexShrink: 0,
        }}>🎵</div>
      )}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: fontSize * 0.95, fontWeight: 600, color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {data.track}
        </div>
        <div style={{ fontSize: fontSize * 0.75, color: mutedColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {data.artist}
        </div>
      </div>
    </div>
  );
}

/* Style 3: Marquee — scrolling ticker */
function NP_Marquee({ data, fontSize, textColor, mutedColor, accentColor }) {
  const text = `♫ ${data.track}  —  ${data.artist}  `;
  return (
    <div style={{ minWidth: 160, maxWidth: 320, overflow: 'hidden', position: 'relative' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2,
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: data.isPlaying ? accentColor : '#666',
          boxShadow: data.isPlaying ? `0 0 6px ${accentColor}` : 'none',
          animation: data.isPlaying ? 'spotifyPulse 1.5s ease-in-out infinite' : 'none',
          flexShrink: 0,
        }} />
        <span style={{ fontSize: fontSize * 0.7, color: mutedColor, textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 600 }}>
          Now Playing
        </span>
      </div>
      <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
        <span className="nb-marquee-scroll" style={{
          display: 'inline-block', fontSize: fontSize * 1, fontWeight: 600, color: textColor,
          animation: data.isPlaying ? 'nbMarquee 12s linear infinite' : 'none',
          paddingRight: 60,
        }}>
          {text}{text}
        </span>
      </div>
    </div>
  );
}

/* Style 4: Album Art — prominent art with info */
function NP_AlbumArt({ data, fontSize, textColor, mutedColor, accentColor, isMetal, barHeight }) {
  const sz = barHeight * 0.72;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, maxWidth: 340, overflow: 'hidden' }}>
      {data.albumArt ? (
        <div style={{
          width: sz, height: sz, borderRadius: isMetal ? 10 : 8, overflow: 'hidden', flexShrink: 0,
          boxShadow: `0 0 16px ${accentColor}33`,
          border: `1px solid ${accentColor}44`,
        }}>
          <img src={data.albumArt} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      ) : (
        <div style={{
          width: sz, height: sz, borderRadius: isMetal ? 10 : 8, flexShrink: 0,
          background: `${accentColor}22`, border: `1px solid ${accentColor}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: sz * 0.5,
        }}>🎵</div>
      )}
      <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontSize: fontSize * 1.05, fontWeight: 700, color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {data.track}
        </div>
        <div style={{ fontSize: fontSize * 0.8, color: mutedColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>
          {data.artist}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 2.5, borderRadius: 1, background: accentColor,
              animation: data.isPlaying ? `spotifyEq ${0.35 + i * 0.1}s ease-in-out infinite alternate` : 'none',
              height: data.isPlaying ? undefined : 3,
            }} />
          ))}
          <span style={{ fontSize: fontSize * 0.65, color: `${accentColor}cc`, marginLeft: 3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {data.isPlaying ? 'Live' : 'Paused'}
          </span>
        </div>
      </div>
    </div>
  );
}

/* Style 5: Equalizer — animated bars + info */
function NP_Equalizer({ data, fontSize, textColor, mutedColor, accentColor }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 160, maxWidth: 320, overflow: 'hidden' }}>
      {/* Eq bars */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 28, flexShrink: 0 }}>
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} style={{
            width: 3, borderRadius: 1.5,
            background: `linear-gradient(to top, ${accentColor}, ${accentColor}66)`,
            animation: data.isPlaying ? `spotifyEq ${0.3 + i * 0.12}s ease-in-out infinite alternate` : 'none',
            animationDelay: `${i * 0.08}s`,
            height: data.isPlaying ? undefined : 4,
          }} />
        ))}
      </div>
      {/* Info */}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: fontSize * 1, fontWeight: 700, color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {data.track}
        </div>
        <div style={{ fontSize: fontSize * 0.78, color: accentColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {data.artist}
        </div>
      </div>
    </div>
  );
}

/* ─── Hex to RGB helper ─── */
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
