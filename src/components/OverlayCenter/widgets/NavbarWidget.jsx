import React, { useEffect, useState, useRef, useCallback } from 'react';
import { fetchNowPlaying, serverRefreshToken } from '../../../utils/spotifyAuth';
import { subElementStyle, subValue } from './shared/appearanceStyles';
import {
  brushedMetalBackground,
  brushedMetalTextBackground,
  colorToRgbString,
  metalBorderColor,
  metalSurfaceShadow,
} from './shared/metalTexture';

/* ─── Crypto price fetcher (CoinGecko free API) ─── */
const CRYPTO_IDS = {
  btc: 'bitcoin', eth: 'ethereum', sol: 'solana', bnb: 'binancecoin',
  xrp: 'ripple', ada: 'cardano', doge: 'dogecoin', dot: 'polkadot',
  avax: 'avalanche-2', matic: 'matic-network', ltc: 'litecoin', link: 'chainlink',
  ton: 'the-open-network', shib: 'shiba-inu', trx: 'tron',
};

/* All coins that auto-cycle when crypto is enabled */
const ALL_CRYPTO_COINS = Object.keys(CRYPTO_IDS);

const CRYPTO_SYMBOLS = {
  btc: '₿', eth: 'Ξ', sol: 'S', bnb: 'B', xrp: 'X', ada: 'A',
  doge: 'Ð', dot: '●', avax: 'A', matic: 'M', ltc: 'Ł', link: '⬡',
};

/* Real coin logos from CoinGecko CDN (32px thumbnails) */
const CRYPTO_LOGOS = {
  btc: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
  eth: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  sol: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
  bnb: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
  xrp: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png',
  ada: 'https://assets.coingecko.com/coins/images/975/small/cardano.png',
  doge: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png',
  dot: 'https://assets.coingecko.com/coins/images/12171/small/polkadot.png',
  avax: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png',
  matic: 'https://assets.coingecko.com/coins/images/4713/small/polygon.png',
  ltc: 'https://assets.coingecko.com/coins/images/2/small/litecoin.png',
  link: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png',
  ton: 'https://assets.coingecko.com/coins/images/17980/small/ton_symbol.png',
  shib: 'https://assets.coingecko.com/coins/images/11939/small/shiba.png',
  trx: 'https://assets.coingecko.com/coins/images/1094/small/tron-logo.png',
};

const DEFAULT_SECTION_LAYOUT = [
  { id: 'identity', zone: 'left' },
  { id: 'badge', zone: 'left' },
  { id: 'clock', zone: 'center' },
  { id: 'nowPlaying', zone: 'center' },
  { id: 'crypto', zone: 'right' },
  { id: 'cta', zone: 'right' },
  { id: 'balance', zone: 'right' },
  { id: 'casino', zone: 'right' },
];

function partAttrs(partId, stateId) {
  return {
    'data-widget-element': partId,
    'data-appearance-part': partId,
    ...(stateId ? { 'data-widget-state': stateId } : {}),
  };
}

function withElementOffset(config, partId, style = {}) {
  const scoped = subElementStyle(config, partId, style);
  const offsetX = Math.round(Number(subValue(config, partId, 'offsetX', 0)) || 0);
  const offsetY = Math.round(Number(subValue(config, partId, 'offsetY', 0)) || 0);
  if (!offsetX && !offsetY) return scoped;
  const { transform, ...styleWithoutTransform } = scoped;
  return {
    ...styleWithoutTransform,
    position: style.position || 'relative',
    left: style.left ?? `${offsetX}px`,
    top: style.top ?? `${offsetY}px`,
    zIndex: style.zIndex ?? 3,
  };
}

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
function NavbarWidget({ config, widgetId, userId }) {
  const c = config || {};
  const time = useClock();
  const [cryptoPrices, setCryptoPrices] = useState({});
  const [nowPlaying, setNowPlaying] = useState(null);
  const [cryptoIndex, setCryptoIndex] = useState(0);
  const [cryptoFading, setCryptoFading] = useState(false);
  const spotifyTokenRef = useRef(c.spotify_access_token);
  const spotifyExpiresRef = useRef(c.spotify_expires_at);

  // Keep refs in sync with config
  useEffect(() => {
    spotifyTokenRef.current = c.spotify_access_token;
    spotifyExpiresRef.current = c.spotify_expires_at;
  }, [c.spotify_access_token, c.spotify_expires_at]);

  // Crypto price polling — always fetch all coins
  useEffect(() => {
    if (!c.showCrypto) return;
    const poll = () => fetchCryptoPrices(ALL_CRYPTO_COINS).then(setCryptoPrices);
    poll();
    const id = setInterval(poll, 60000);
    return () => clearInterval(id);
  }, [c.showCrypto]);

  // Crypto cycling — all modes show one coin at a time
  const cryptoMode = c.cryptoDisplayMode || 'horizontal';
  const activeCoins = ALL_CRYPTO_COINS.filter(coin => cryptoPrices[coin]);
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
  // Poll whenever musicSource is spotify and we have tokens — showNowPlaying only gates the UI display
  useEffect(() => {
    if (c.musicSource !== 'spotify') return;
    if (!spotifyTokenRef.current) return;

    let stopped = false;

    const doRefresh = async () => {
      if (!userId) return false;
      try {
        const fresh = await serverRefreshToken(userId);
        spotifyTokenRef.current = fresh.access_token;
        spotifyExpiresRef.current = fresh.expires_at;
        return true;
      } catch {
        return false;
      }
    };

    const poll = async () => {
      if (stopped) return;
      let token = spotifyTokenRef.current;
      if (!token) return;

      // Proactive refresh if token is about to expire (within 60s)
      if (spotifyExpiresRef.current && Date.now() > spotifyExpiresRef.current - 60000) {
        const ok = await doRefresh();
        if (ok) token = spotifyTokenRef.current;
      }

      try {
        const np = await fetchNowPlaying(token);
        if (!stopped) setNowPlaying(np);
      } catch (err) {
        // 401 = token actually expired → force refresh and retry once
        if (err.status === 401) {
          const ok = await doRefresh();
          if (ok && !stopped) {
            try {
              const np = await fetchNowPlaying(spotifyTokenRef.current);
              if (!stopped) setNowPlaying(np);
            } catch { /* still failed after refresh, give up this cycle */ }
          }
        }
      }
    };

    poll();
    const id = setInterval(poll, 10000);
    return () => { stopped = true; clearInterval(id); };
  }, [c.musicSource, c.spotify_access_token, widgetId, userId]);

  // Manual "Now Playing"
  const displayNowPlaying = c.musicSource === 'spotify' && nowPlaying
    ? nowPlaying
    : c.musicSource === 'manual' && (c.manualArtist || c.manualTrack)
      ? { artist: c.manualArtist || '', track: c.manualTrack || '', isPlaying: true }
      : null;

  /* ─── Style vars from config ─── */
  const isMetal = (c.displayStyle === 'metallic');
  const isGlass = (c.displayStyle === 'glass');
  const isRetro = (c.displayStyle === 'retro');
  const isCarbon = (c.displayStyle === 'carbon');
  const isFuturistic = (c.displayStyle === 'futuristic');
  const accentColor = subValue(c, 'logo', 'accentColor', c.accentColor || (isMetal ? '#e8a020' : isGlass ? '#60a5fa' : isRetro ? '#ff6b2b' : isCarbon ? '#ef4444' : isFuturistic ? '#00ffcc' : '#f59e0b'));
  const accentColorRGB = colorToRgbString(accentColor);
  const bgColor = subValue(c, 'container', 'background', c.bgColor || (isMetal ? '#1a1a1e' : isGlass ? '#0f172a' : isRetro ? '#1a0a00' : isCarbon ? '#0a0a0a' : isFuturistic ? '#050d1a' : '#111318'));
  const textColor = subValue(c, 'displayName', 'textColor', c.textColor || (isMetal ? '#d4d4d8' : isGlass ? '#e0eaff' : isRetro ? '#ffd9b3' : isCarbon ? '#d4d4d8' : isFuturistic ? '#e0fff5' : '#f1f5f9'));
  const displayNameAccentColor = subValue(c, 'displayName', 'accentColor', accentColor);
  const mutedColor = subValue(c, 'music', 'textColor', c.mutedColor || (isMetal ? '#666666' : isGlass ? '#6b8ccc' : isRetro ? '#885530' : isCarbon ? '#52525b' : isFuturistic ? '#4fd1c5' : '#94a3b8'));
  const borderColor = subValue(c, 'container', 'borderColor', c.borderColor || accentColor);
  const containerFontFamily = subValue(c, 'container', 'fontFamily', c.fontFamily || (isRetro ? "'Press Start 2P', 'Courier New', monospace" : isFuturistic ? "'Orbitron', sans-serif" : "'Inter', sans-serif"));
  const fontFamily = subValue(c, 'displayName', 'fontFamily', containerFontFamily);
  const brightness = subValue(c, 'container', 'brightness', c.brightness ?? 100);
  const contrast = subValue(c, 'container', 'contrast', c.contrast ?? 100);
  const saturation = subValue(c, 'container', 'saturation', c.saturation ?? 100);
  const borderWidth = subValue(c, 'container', 'borderWidth', c.borderWidth ?? (isMetal ? 1 : isGlass ? 1 : isRetro ? 3 : isCarbon ? 1 : isFuturistic ? 1 : 3));
  const barHeight = subValue(c, 'container', 'height', c.barHeight ?? 64);
  const barMaxWidth = subValue(c, 'container', 'maxWidth', c.maxWidth ?? null);
  const borderRadius = subValue(c, 'container', 'radius', c.borderRadius ?? (isMetal ? 16 : isGlass ? 20 : isRetro ? 4 : isCarbon ? 8 : isFuturistic ? 20 : 999));
  const containerFontSize = subValue(c, 'container', 'fontSize', c.fontSize ?? (isRetro ? 13 : 15));
  const fontSize = subValue(c, 'displayName', 'fontSize', containerFontSize);
  const fontWeight = subValue(c, 'displayName', 'fontWeight', 700);
  const mottoFontSize = Math.max(8, Number(fontSize) * 0.82);
  const mottoFontWeight = subValue(c, 'displayName', 'fontWeight', 700);
  const containerShadow = subValue(c, 'container', 'shadow', undefined);
  const containerGlow = subValue(c, 'container', 'glow', undefined);
  const containerBlur = subValue(c, 'container', 'backdropBlur', 0);
  const containerPadding = subValue(c, 'container', 'padding', 10);
  const widgetScale = Number(c.widgetScale || 1);
  const avatarImageSize = subValue(c, 'avatar', 'imageSize', null);
  const avatarRadius = subValue(c, 'avatar', 'radius', '50%');
  const avatarBorderColor = subValue(c, 'avatar', 'borderColor', 'transparent');
  const avatarBorderWidth = subValue(c, 'avatar', 'borderWidth', 0);
  const avatarFit = subValue(c, 'avatar', 'imageFit', 'cover');
  const avatarUrl = subValue(c, 'avatar', 'imageUrl', c.avatarUrl || '');
  const badgeImageSize = subValue(c, 'badgeImage', 'imageSize', null);
  const badgeImageRadius = subValue(c, 'badgeImage', 'radius', 0);
  const badgeImageFit = subValue(c, 'badgeImage', 'imageFit', 'contain');
  const badgeImageUrl = subValue(c, 'badgeImage', 'imageUrl', c.badgeImage || '');
  const casinoImageSize = subValue(c, 'casino', 'imageSize', null);
  const casinoImageRadius = subValue(c, 'casino', 'radius', isMetal ? 6 : isRetro ? 2 : 8);
  const casinoImageFit = subValue(c, 'casino', 'imageFit', 'contain');
  const casinoLogoUrl = subValue(c, 'casino', 'imageUrl', c.casinoLogoUrl || '');
  const casinoTextColor = subValue(c, 'casino', 'textColor', accentColor);
  const casinoFontFamily = subValue(c, 'casino', 'fontFamily', containerFontFamily);
  const casinoFontSize = subValue(c, 'casino', 'fontSize', fontSize * 0.9);
  const casinoFontWeight = subValue(c, 'casino', 'fontWeight', 700);
  const clockBg = subValue(c, 'clock', 'background', undefined);
  const clockTextColor = subValue(c, 'clock', 'textColor', textColor);
  const clockRadius = subValue(c, 'clock', 'radius', isRetro ? 2 : isGlass ? 14 : isMetal ? 10 : 999);
  const clockBorderColor = subValue(c, 'clock', 'borderColor', isRetro ? `${accentColor}88` : 'rgba(255,255,255,0.12)');
  const clockBorderWidth = subValue(c, 'clock', 'borderWidth', isRetro ? 2 : 1);
  const clockShadow = subValue(c, 'clock', 'shadow', undefined);
  const clockFontFamily = subValue(c, 'clock', 'fontFamily', containerFontFamily);
  const clockFontSize = subValue(c, 'clock', 'fontSize', fontSize * 0.92);
  const clockFontWeight = subValue(c, 'clock', 'fontWeight', 700);
  const clockPadding = subValue(c, 'clock', 'padding', null);
  const musicFontFamily = subValue(c, 'music', 'fontFamily', containerFontFamily);
  const musicFontSize = subValue(c, 'music', 'fontSize', containerFontSize);
  const musicFontWeight = subValue(c, 'music', 'fontWeight', 700);
  const textShadow = '0 1px 4px rgba(0,0,0,0.6)';
  const ctaColor = subValue(c, 'sponsor', 'background', c.ctaColor || (isRetro ? '#ff4500' : isFuturistic ? '#00ffcc' : '#f43f5e'));
  const sponsorTextColor = subValue(c, 'sponsor', 'textColor', '#fff');
  const sponsorFontFamily = subValue(c, 'sponsor', 'fontFamily', containerFontFamily);
  const sponsorFontSize = subValue(c, 'sponsor', 'fontSize', fontSize * 0.82);
  const sponsorFontWeight = subValue(c, 'sponsor', 'fontWeight', isGlass || !isMetal && !isRetro ? 600 : 700);
  const sponsorRadius = subValue(c, 'sponsor', 'radius', null);
  const sponsorPadding = subValue(c, 'sponsor', 'padding', null);
  const sponsorBorderColor = subValue(c, 'sponsor', 'borderColor', null);
  const sponsorBorderWidth = subValue(c, 'sponsor', 'borderWidth', 1);
  const sponsorShadow = subValue(c, 'sponsor', 'shadow', undefined);
  const sponsorAccentColor = subValue(c, 'sponsor', 'accentColor', ctaColor);
  const cryptoUpColor = subValue(c, 'crypto', 'fillColor', c.cryptoUpColor || '#34d399');
  const cryptoDownColor = subValue(c, 'crypto', 'accentColor', c.cryptoDownColor || '#f87171');
  const cryptoTextColor = subValue(c, 'crypto', 'textColor', textColor);
  const cryptoFontFamily = subValue(c, 'crypto', 'fontFamily', containerFontFamily);
  const cryptoFontSize = subValue(c, 'crypto', 'fontSize', containerFontSize);
  const cryptoFontWeight = subValue(c, 'crypto', 'fontWeight', 700);
  const balanceTextColor = subValue(c, 'balance', 'textColor', textColor);
  const balanceAccentColor = subValue(c, 'balance', 'accentColor', accentColor);
  const balanceMutedColor = subValue(c, 'balance', 'borderColor', mutedColor);
  const balanceFontFamily = subValue(c, 'balance', 'fontFamily', containerFontFamily);
  const balanceFontSize = subValue(c, 'balance', 'fontSize', fontSize * 1.1);
  const balanceFontWeight = subValue(c, 'balance', 'fontWeight', 700);
  const separatorColor = subValue(c, 'separator', 'background', subValue(c, 'separator', 'borderColor', borderColor));
  const separatorWidth = subValue(c, 'separator', 'borderWidth', 1);
  const separatorOpacity = subValue(c, 'separator', 'opacity', 0.7);
  const bgColorRGB = colorToRgbString(bgColor);
  const ctaColorRGB = colorToRgbString(sponsorAccentColor || ctaColor);

  // Only apply CSS filter when values differ from defaults — filter forces rasterisation
  // which degrades image sharpness and sub-pixel text rendering
  const needsFilter = brightness !== 100 || contrast !== 100 || saturation !== 100;
  const filterStr = needsFilter
    ? `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
    : 'none';

  /* Use clipPath instead of overflow:hidden to avoid Chromium compositor
     black-corner artefact on GPU-promoted layers (OBS browser source). */
  const clipOuter = `inset(0 round ${borderRadius}px)`;

  const barOuter = isMetal ? {
    width: '100%', height: '100%', boxSizing: 'border-box',
    background: brushedMetalBackground('linear-gradient(135deg, rgba(42,43,48,0.96), rgba(17,18,22,0.98))', accentColor, { highlightOpacity: 0.05, grainOpacity: 0.025 }),
    padding: `${borderWidth}px`,
    fontFamily: containerFontFamily,
  } : isCarbon ? {
    width: '100%', height: '100%', boxSizing: 'border-box',
    background: `repeating-linear-gradient(45deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 2px, transparent 2px, transparent 6px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 2px, transparent 2px, transparent 6px), ${bgColor}`,
    padding: `${borderWidth}px`,
    fontFamily: containerFontFamily,
  } : isFuturistic ? {
    width: '100%', height: '100%', boxSizing: 'border-box',
    background: `linear-gradient(135deg, rgba(0,255,204,0.06), transparent 40%, rgba(0,255,204,0.04))`,
    padding: `${borderWidth}px`,
    fontFamily: containerFontFamily,
  } : isGlass ? {
    width: '100%', height: '100%', boxSizing: 'border-box',
    background: `linear-gradient(135deg, rgba(30,30,60,0.82), rgba(20,20,50,0.88))`,
    padding: `${borderWidth}px`,
    fontFamily: containerFontFamily,
  } : isRetro ? {
    width: '100%', height: '100%', boxSizing: 'border-box',
    background: `${borderColor}`,
    padding: `${borderWidth}px`,
    fontFamily: containerFontFamily,
    imageRendering: 'pixelated',
  } : {
    width: '100%', height: '100%', boxSizing: 'border-box',
    background: `linear-gradient(to bottom, ${borderColor}e6, ${borderColor}cc)`,
    padding: `${borderWidth}px`,
    fontFamily: containerFontFamily,
  };

  const barInner = isMetal ? {
    display: 'flex', alignItems: 'center', height: '100%', boxSizing: 'border-box',
    background: brushedMetalBackground(`linear-gradient(170deg, rgba(${accentColorRGB},0.05) 0%, ${bgColor} 30%, rgba(${accentColorRGB},0.035) 60%, ${bgColor} 100%)`, accentColor),
    padding: `0 ${containerPadding}px`, color: textColor, fontSize, gap: 0,
    boxShadow: containerShadow || containerGlow ? [containerShadow, containerGlow].filter(Boolean).join(', ') : metalSurfaceShadow(accentColor, 0.85),
    backdropFilter: containerBlur ? `blur(${containerBlur}px)` : undefined,
    WebkitBackdropFilter: containerBlur ? `blur(${containerBlur}px)` : undefined,
    transform: widgetScale !== 1 ? `scale(${widgetScale})` : undefined,
    transformOrigin: 'center',
    overflow: 'visible', position: 'relative',
    ...(needsFilter && { filter: filterStr }),
  } : isCarbon ? {
    display: 'flex', alignItems: 'center', height: '100%', boxSizing: 'border-box',
    background: `linear-gradient(180deg, ${bgColor}, #060606)`,
    padding: `0 ${containerPadding}px`, color: textColor, fontSize, gap: 0,
    boxShadow: containerShadow || containerGlow ? [containerShadow, containerGlow].filter(Boolean).join(', ') : undefined,
    backdropFilter: containerBlur ? `blur(${containerBlur}px)` : undefined,
    WebkitBackdropFilter: containerBlur ? `blur(${containerBlur}px)` : undefined,
    transform: widgetScale !== 1 ? `scale(${widgetScale})` : undefined,
    transformOrigin: 'center',
    overflow: 'visible', position: 'relative',
    ...(needsFilter && { filter: filterStr }),
  } : isFuturistic ? {
    display: 'flex', alignItems: 'center', height: '100%', boxSizing: 'border-box',
    background: `linear-gradient(135deg, rgba(${bgColorRGB},0.95), rgba(${bgColorRGB},0.88))`,
    padding: `0 ${containerPadding}px`, color: textColor, fontSize, gap: 0,
    boxShadow: containerShadow || containerGlow ? [containerShadow, containerGlow].filter(Boolean).join(', ') : undefined,
    backdropFilter: containerBlur ? `blur(${containerBlur}px)` : undefined,
    WebkitBackdropFilter: containerBlur ? `blur(${containerBlur}px)` : undefined,
    transform: widgetScale !== 1 ? `scale(${widgetScale})` : undefined,
    transformOrigin: 'center',
    overflow: 'visible', position: 'relative',
    ...(needsFilter && { filter: filterStr }),
  } : isGlass ? {
    display: 'flex', alignItems: 'center', height: '100%', boxSizing: 'border-box',
    background: `linear-gradient(135deg, rgba(${bgColorRGB},0.92), rgba(${bgColorRGB},0.85))`,
    padding: `0 ${containerPadding}px`, color: textColor, fontSize, gap: 0,
    boxShadow: containerShadow || containerGlow ? [containerShadow, containerGlow].filter(Boolean).join(', ') : undefined,
    backdropFilter: containerBlur ? `blur(${containerBlur}px)` : undefined,
    WebkitBackdropFilter: containerBlur ? `blur(${containerBlur}px)` : undefined,
    transform: widgetScale !== 1 ? `scale(${widgetScale})` : undefined,
    transformOrigin: 'center',
    overflow: 'visible', position: 'relative',
    ...(needsFilter && { filter: filterStr }),
  } : isRetro ? {
    display: 'flex', alignItems: 'center', height: '100%', boxSizing: 'border-box',
    background: `linear-gradient(180deg, ${bgColor}, #0d0500)`,
    padding: `0 ${Math.max(6, Number(containerPadding) || 8)}px`, color: textColor, fontSize, gap: 0,
    boxShadow: containerShadow || containerGlow ? [containerShadow, containerGlow].filter(Boolean).join(', ') : undefined,
    transform: widgetScale !== 1 ? `scale(${widgetScale})` : undefined,
    transformOrigin: 'center',
    overflow: 'visible', position: 'relative',
    ...(needsFilter && { filter: filterStr }),
    borderTop: '2px solid rgba(255,255,255,0.15)',
  } : {
    display: 'flex', alignItems: 'center', height: '100%', boxSizing: 'border-box',
    background: `linear-gradient(to right, ${bgColor}, ${bgColor}f2, ${bgColor})`,
    padding: `0 ${containerPadding}px`, color: textColor, fontSize, gap: 0,
    boxShadow: containerShadow || containerGlow ? [containerShadow, containerGlow].filter(Boolean).join(', ') : undefined,
    transform: widgetScale !== 1 ? `scale(${widgetScale})` : undefined,
    transformOrigin: 'center',
    overflow: 'visible',
    ...(needsFilter && { filter: filterStr }),
  };

  const sep = isMetal ? {
    width: separatorWidth, height: barHeight * 0.5,
    background: separatorColor || `linear-gradient(to bottom, transparent, rgba(${accentColorRGB},0.25), transparent)`,
    opacity: separatorOpacity,
    flexShrink: 0, margin: '0 3px',
  } : isGlass ? {
    width: separatorWidth, height: barHeight * 0.5,
    background: separatorColor || 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.2), transparent)',
    opacity: separatorOpacity,
    flexShrink: 0, margin: '0 3px',
  } : isRetro ? {
    width: Math.max(1, Number(separatorWidth) || 2), height: barHeight * 0.6,
    background: separatorColor || `${accentColor}88`,
    opacity: separatorOpacity,
    flexShrink: 0, margin: '0 2px',
  } : {
    width: separatorWidth, height: barHeight * 0.55,
    background: separatorColor || `linear-gradient(to bottom, transparent, ${mutedColor}70, transparent)`,
    opacity: separatorOpacity,
    flexShrink: 0, margin: '0 3px',
  };

  const barOuterSized = {
    ...barOuter,
    height: `${barHeight}px`,
    maxHeight: '100%',
    maxWidth: barMaxWidth != null ? `${barMaxWidth}px` : undefined,
    clipPath: clipOuter,
  };

  /* ─── Dynamic section layout ─── */
  const layout = (c.sectionLayout || DEFAULT_SECTION_LAYOUT).filter(s => s.id !== 'socials');
  const getZoneSections = (zone) => layout.filter(s => s.zone === zone);

  const renderSection = (sectionId) => {
    switch (sectionId) {
      case 'identity':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            {c.showAvatar !== false && (
              (() => {
                const size = avatarImageSize || (barHeight * 0.72 * ((c.avatarSize ?? 100) / 100));
                return (
              <div {...partAttrs('avatar')} style={withElementOffset(c, 'avatar', {
                position: 'relative',
                width: size,
                height: size,
                borderRadius: avatarRadius,
                border: avatarBorderWidth ? `${avatarBorderWidth}px solid ${avatarBorderColor}` : undefined,
                background: 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              })}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" {...partAttrs('avatar')} style={{
                    width: '100%', height: '100%',
                    borderRadius: avatarRadius,
                    objectFit: avatarFit,
                    background: 'transparent',
                    imageRendering: 'auto',
                    backfaceVisibility: 'hidden',
                  }} />
                ) : (
                  <div style={{
                    width: '100%', height: '100%',
                    borderRadius: avatarRadius,
                    background: 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: fontSize * 0.7, fontWeight: 700, letterSpacing: '0.12em',
                    textTransform: 'uppercase', color: textColor, textShadow,
                  }}>
                    {(c.streamerName || 'S').slice(0, 5)}
                  </div>
                )}
              </div>
                );
              })()
            )}
            <div {...partAttrs('displayName')} style={withElementOffset(c, 'displayName', { display: 'flex', flexDirection: 'column', justifyContent: 'center', lineHeight: 1.1 })}>
              <span style={{
                backgroundImage: isMetal
                  ? brushedMetalTextBackground(textColor, displayNameAccentColor)
                  : isGlass
                  ? `linear-gradient(to right, ${textColor}, ${displayNameAccentColor}, ${textColor})`
                  : isRetro
                  ? `linear-gradient(to right, ${displayNameAccentColor}, ${ctaColor}, ${displayNameAccentColor})`
                  : (c.nameGradient || `linear-gradient(to right, ${displayNameAccentColor}, ${textColor}, ${displayNameAccentColor})`),
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                fontFamily,
                fontSize: fontSize * 1.2, fontWeight,
                letterSpacing: isMetal ? '0.22em' : isRetro ? '0.12em' : '0.18em', textTransform: 'uppercase',
                display: 'block', maxWidth: 'min(30vw, 420px)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {c.streamerName || 'STREAMER'}
              </span>
              {c.motto && (
                <span style={{
                  marginTop: 2, fontFamily, fontSize: mottoFontSize, fontWeight: mottoFontWeight,
                  letterSpacing: isMetal ? '0.4em' : isRetro ? '0.2em' : '0.35em',
                  textTransform: 'uppercase', color: mutedColor, textShadow,
                }}>
                  {c.motto}
                </span>
              )}
            </div>
          </div>
        );

      case 'badge': {
        if (!badgeImageUrl) return null;
        return (
          <div {...partAttrs('badgeImage')} style={withElementOffset(c, 'badgeImage', {
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: barHeight, flexShrink: 0, padding: '2px 0',
          })}>
            <img src={badgeImageUrl} alt="" {...partAttrs('badgeImage')} style={{
              height: badgeImageSize || (barHeight * 0.85 * ((c.badgeSize ?? 100) / 100)),
              minWidth: badgeImageSize || (barHeight * 1.2 * ((c.badgeSize ?? 100) / 100)),
              objectFit: badgeImageFit,
              borderRadius: badgeImageRadius,
              filter: isMetal ? `drop-shadow(0 0 6px rgba(${accentColorRGB},0.3)) brightness(1.05)` : 'drop-shadow(0 0 8px rgba(255,255,255,0.3))',
            }} />
          </div>
        );
      }

      case 'clock': {
        if (c.showClock === false) return null;
        return (
          <div {...partAttrs('clock')} style={withElementOffset(c, 'clock', isMetal ? {
            borderRadius: clockRadius, padding: clockPadding != null ? `${clockPadding}px ${Math.round(clockPadding * 2.6)}px` : '6px 22px',
            background: clockBg || 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
            border: `${clockBorderWidth}px solid ${clockBorderColor}`,
            color: clockTextColor,
            fontFamily: clockFontFamily, fontSize: clockFontSize, fontWeight: clockFontWeight, letterSpacing: '0.28em',
            boxShadow: clockShadow || `inset 0 1px 0 rgba(255,255,255,0.04), inset 0 -1px 0 rgba(0,0,0,0.15), 0 0 14px rgba(${accentColorRGB},0.08)`,
            flexShrink: 0,
          } : isGlass ? {
            borderRadius: clockRadius, padding: clockPadding != null ? `${clockPadding}px ${Math.round(clockPadding * 2.5)}px` : '6px 20px',
            background: clockBg || 'rgba(255,255,255,0.08)',
            border: `${clockBorderWidth}px solid ${clockBorderColor}`,
            backdropFilter: 'blur(8px)',
            color: clockTextColor,
            fontFamily: clockFontFamily, fontSize: clockFontSize, fontWeight: clockFontWeight, letterSpacing: '0.25em',
            boxShadow: clockShadow,
            flexShrink: 0,
          } : isRetro ? {
            borderRadius: clockRadius, padding: clockPadding != null ? `${clockPadding}px ${Math.round(clockPadding * 2.2)}px` : '6px 14px',
            background: clockBg || '#000',
            border: `${clockBorderWidth}px solid ${clockBorderColor}`,
            color: clockTextColor || accentColor,
            fontFamily: clockFontFamily, fontSize: clockFontSize, fontWeight: clockFontWeight, letterSpacing: '0.15em',
            boxShadow: clockShadow,
            flexShrink: 0,
          } : {
            borderRadius: clockRadius, padding: clockPadding != null ? `${clockPadding}px ${Math.round(clockPadding * 2.5)}px` : '6px 20px',
            background: clockBg || `linear-gradient(to bottom, ${accentColor}e6, ${accentColor}cc)`,
            color: clockTextColor,
            fontFamily: clockFontFamily, fontSize: clockFontSize, fontWeight: clockFontWeight, letterSpacing: '0.25em',
            border: `${clockBorderWidth}px solid ${clockBorderColor}`,
            boxShadow: clockShadow || `0 0 18px ${accentColor}e6`,
            flexShrink: 0,
          })}>
            {time || '--:--:--'}
          </div>
        );
      }

      case 'nowPlaying': {
        if (c.showNowPlaying === false || !displayNowPlaying) return null;
        return (
          <div {...partAttrs('music')} style={withElementOffset(c, 'music', {
            display: 'flex',
            alignItems: 'center',
            minWidth: 0,
            width: '100%',
            maxWidth: 'min(34vw, 380px)',
            flex: '1 1 220px',
            overflow: 'hidden',
          })}>
            <NowPlayingDisplay
              data={displayNowPlaying}
              musicDisplayStyle={c.musicDisplayStyle || 'text'}
              textColor={textColor}
              mutedColor={mutedColor}
              accentColor={accentColor}
              fontSize={musicFontSize}
              fontFamily={musicFontFamily}
              fontWeight={musicFontWeight}
              isMetal={isMetal}
              barHeight={barHeight}
            />
          </div>
        );
      }

      case 'crypto': {
        if (!c.showCrypto || activeCoins.length === 0) return null;
        return (
          <div {...partAttrs('crypto')} style={withElementOffset(c, 'crypto', { display: 'flex', alignItems: 'center', minWidth: 0, flexShrink: 0 })}>
            <CryptoTicker
              coins={activeCoins}
              prices={cryptoPrices}
              mode={cryptoMode}
              index={cryptoIndex}
              fading={cryptoFading}
              fontSize={cryptoFontSize}
              bgColor={bgColor}
              textColor={cryptoTextColor}
              fontFamily={cryptoFontFamily}
              fontWeight={cryptoFontWeight}
              cryptoUpColor={cryptoUpColor}
              cryptoDownColor={cryptoDownColor}
              metallic={isMetal || isGlass || isRetro}
            />
          </div>
        );
      }

      case 'cta': {
        if (!c.showCTA || !c.ctaText) return null;
        return (
          <div {...partAttrs('sponsor')} style={withElementOffset(c, 'sponsor', isMetal ? {
            display: 'flex', alignItems: 'center', gap: 8,
            borderRadius: sponsorRadius ?? 10, padding: sponsorPadding != null ? `${sponsorPadding}px ${Math.round(sponsorPadding * 2.6)}px` : '7px 20px',
            background: brushedMetalBackground(`linear-gradient(135deg, rgba(${ctaColorRGB},0.15), rgba(${ctaColorRGB},0.05))`, sponsorAccentColor),
            border: `${sponsorBorderWidth}px solid ${sponsorBorderColor || metalBorderColor(sponsorAccentColor, 0.32)}`,
            color: sponsorTextColor || ctaColor,
            fontFamily: sponsorFontFamily,
            fontSize: sponsorFontSize, fontWeight: sponsorFontWeight,
            letterSpacing: '0.24em', textTransform: 'uppercase',
            boxShadow: sponsorShadow || metalSurfaceShadow(sponsorAccentColor, 0.64),
            flexShrink: 0, maxWidth: 'min(28vw, 360px)', overflow: 'hidden',
          } : isGlass ? {
            display: 'flex', alignItems: 'center', gap: 8,
            borderRadius: sponsorRadius ?? 14, padding: sponsorPadding != null ? `${sponsorPadding}px ${Math.round(sponsorPadding * 2.5)}px` : '7px 18px',
            background: `${ctaColor}22`,
            border: `${sponsorBorderWidth}px solid ${sponsorBorderColor || `${ctaColor}33`}`,
            backdropFilter: 'blur(6px)',
            color: sponsorTextColor,
            fontFamily: sponsorFontFamily,
            fontSize: sponsorFontSize, fontWeight: sponsorFontWeight,
            letterSpacing: '0.24em', textTransform: 'uppercase',
            flexShrink: 0,
          } : isRetro ? {
            display: 'flex', alignItems: 'center', gap: 6,
            borderRadius: sponsorRadius ?? 2, padding: sponsorPadding != null ? `${sponsorPadding}px ${Math.round(sponsorPadding * 2.3)}px` : '6px 14px',
            background: ctaColor,
            border: `${sponsorBorderWidth || 2}px solid ${sponsorBorderColor || '#000'}`,
            boxShadow: sponsorShadow || '2px 2px 0 #000',
            color: sponsorTextColor,
            fontFamily: sponsorFontFamily,
            fontSize: sponsorFontSize, fontWeight: sponsorFontWeight,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            flexShrink: 0,
          } : {
            display: 'flex', alignItems: 'center', gap: 8,
            borderRadius: sponsorRadius ?? 999, padding: sponsorPadding != null ? `${sponsorPadding}px ${Math.round(sponsorPadding * 2.8)}px` : '6px 18px',
            background: `linear-gradient(to bottom, ${ctaColor}, ${ctaColor}cc)`,
            color: sponsorTextColor,
            fontFamily: sponsorFontFamily,
            fontSize: sponsorFontSize, fontWeight: sponsorFontWeight,
            border: `${sponsorBorderWidth}px solid ${sponsorBorderColor || 'transparent'}`,
            letterSpacing: '0.24em', textTransform: 'uppercase',
            boxShadow: sponsorShadow || `0 0 24px ${ctaColor}d9`,
            flexShrink: 0, maxWidth: 'min(28vw, 360px)', overflow: 'hidden',
          })}>
            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.ctaText}</span>
          </div>
        );
      }

      case 'socials': {
        return null;
      }

      case 'balance': {
        if (!c.showStartBalance || !c.startBalance) return null;
        return (
          <div {...partAttrs('balance')} style={withElementOffset(c, 'balance', {
            display: 'flex', alignItems: 'center', gap: 8,
            fontFamily: balanceFontFamily,
            fontSize: balanceFontSize, fontWeight: balanceFontWeight, color: balanceTextColor,
            letterSpacing: '0.1em', flexShrink: 0, textShadow,
          })}>
            <span style={{ fontSize: balanceFontSize * 0.78, color: balanceMutedColor, textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: balanceFontWeight }}>
              START
            </span>
            <span style={{ fontWeight: Math.max(700, Number(balanceFontWeight) || 700), color: balanceAccentColor }}>
              {c.balanceCurrency || '€'}{Number(c.startBalance).toLocaleString()}
            </span>
          </div>
        );
      }

      case 'casino': {
        if (!c.showCasino || (!c.casinoName && !casinoLogoUrl)) return null;
        return (
          <div {...partAttrs('casino')} style={withElementOffset(c, 'casino', { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 })}>
            {casinoLogoUrl && (
              <img src={casinoLogoUrl} alt="" {...partAttrs('casino')} style={{
                height: casinoImageSize || (barHeight * 0.55 * ((c.casinoImageSize ?? 100) / 100)),
                maxWidth: casinoImageSize ? casinoImageSize * 1.8 : (barHeight * 1.8 * ((c.casinoImageSize ?? 100) / 100)),
                objectFit: casinoImageFit, borderRadius: casinoImageRadius,
                filter: isMetal ? `drop-shadow(0 0 6px rgba(${accentColorRGB},0.2))` : 'none',
              }} />
            )}
            {c.casinoName && (
              <span {...partAttrs('casino')} style={{
                fontFamily: casinoFontFamily,
                fontSize: casinoFontSize, fontWeight: casinoFontWeight,
                letterSpacing: '0.15em', textTransform: 'uppercase',
                color: casinoTextColor,
                textShadow: isMetal ? `0 0 10px rgba(${accentColorRGB},0.3)` : isRetro ? `0 0 8px ${accentColor}` : 'none',
              }}>
                {c.casinoName}
              </span>
            )}
          </div>
        );
      }

      default:
        return null;
    }
  };

  const renderZone = (zone) => {
    const sections = getZoneSections(zone)
      .map(s => ({ id: s.id, el: renderSection(s.id) }))
      .filter(s => s.el);
    return sections.flatMap((s, i) =>
      i === 0
        ? [<React.Fragment key={s.id}>{s.el}</React.Fragment>]
        : [<div key={`sep-${s.id}`} {...partAttrs('separator')} style={withElementOffset(c, 'separator', sep)} />, <React.Fragment key={s.id}>{s.el}</React.Fragment>]
    );
  };


  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
      <div {...partAttrs('container')} style={barOuterSized}>
        <div style={barInner}>
          {/* Metallic shine overlay */}
          {isMetal && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(110deg, transparent 0%, rgba(255,255,255,0.015) 30%, rgba(255,255,255,0.04) 48%, rgba(255,255,255,0.015) 52%, transparent 70%)',
              pointerEvents: 'none', zIndex: 0,
            }} />
          )}
          {isMetal && (
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              height: barHeight * 0.45,
              background: 'linear-gradient(180deg, rgba(255,255,255,0.03), transparent)',
              pointerEvents: 'none', zIndex: 0,
            }} />
          )}
          {/* Glass frost overlay */}
          {isGlass && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%, rgba(255,255,255,0.04) 100%)',
              pointerEvents: 'none', zIndex: 0,
            }} />
          )}
          {/* Retro scanlines */}
          {isRetro && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)',
              pointerEvents: 'none', zIndex: 0,
            }} />
          )}

          {/* ─── Left Zone ─── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 10, flexShrink: 0, position: 'relative', zIndex: 1 }}>
            {renderZone('left')}
          </div>

          {/* ─── Center Zone ─── */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, minWidth: 0, position: 'relative', zIndex: 1 }}>
            {renderZone('center')}
          </div>

          {/* ─── Right Zone ─── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 10, flexShrink: 0, position: 'relative', zIndex: 1 }}>
            {renderZone('right')}
          </div>

        </div>
      </div>
    </div>
  );
}

/* ─── Single Crypto Coin — plain text, no card ─── */
function CryptoCoin({ coin, price, fontSize, bgColor, textColor, fontFamily, fontWeight, cryptoUpColor, cryptoDownColor, metallic, style }) {
  const isUp = price.change >= 0;
  const changeColor = isUp ? cryptoUpColor : cryptoDownColor;
  const logoUrl = CRYPTO_LOGOS[coin];
  const logoSize = 30;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      fontSize: fontSize * 0.95,
      fontFamily,
      flexShrink: 0,
      ...style,
    }}>
      {/* Coin logo */}
      {logoUrl ? (
        <img src={logoUrl} alt={coin} style={{
          width: logoSize, height: logoSize, borderRadius: '50%', objectFit: 'cover', flexShrink: 0,
          imageRendering: 'auto',
          backfaceVisibility: 'hidden',
        }} />
      ) : (
        <div style={{
          width: logoSize, height: logoSize, borderRadius: '50%',
          background: `linear-gradient(135deg, #6366f1, #64748b)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: fontSize * 0.9, fontWeight: 900, color: '#fff',
        }}>
          {CRYPTO_SYMBOLS[coin] || coin[0].toUpperCase()}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
        <span style={{ fontWeight, color: textColor, display: 'flex', alignItems: 'center', gap: 4, letterSpacing: '0.04em', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
          {coin.toUpperCase()}
          <span style={{ color: changeColor, fontSize: fontSize * 0.85 }}>{isUp ? '▲' : '▼'}</span>
        </span>
        <span style={{ fontSize: fontSize * 0.88, color: changeColor, opacity: 0.95, fontWeight, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
          ${price.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
          <span style={{ fontWeight }}>{isUp ? '+' : ''}{price.change?.toFixed(2)}%</span>
        </span>
      </div>
    </div>
  );
}

/* ─── Crypto Ticker with display modes ─── */
function CryptoTicker({ coins, prices, mode, index, fading, fontSize, bgColor, textColor, fontFamily, fontWeight, cryptoUpColor, cryptoDownColor, metallic }) {
  const safeIdx = index % coins.length;
  const coin = coins[safeIdx];

  /* Fixed-width wrapper prevents layout shift when coins cycle */
  const tickerStyle = { position: 'relative', minWidth: 180, overflow: 'hidden' };

  /* Use translate3d for GPU-accelerated compositing — prevents blur during transitions */
  const animStyle = mode === 'horizontal'
    ? { transform: fading ? 'translate3d(-8px,0,0)' : 'translate3d(0,0,0)', opacity: fading ? 0 : 1, transition: 'transform 0.35s ease, opacity 0.35s ease', willChange: 'transform, opacity', backfaceVisibility: 'hidden' }
    : mode === 'carousel'
    ? { transform: fading ? 'translate3d(0,-12px,0)' : 'translate3d(0,0,0)', opacity: fading ? 0 : 1, transition: 'transform 0.35s ease, opacity 0.35s ease', willChange: 'transform, opacity', backfaceVisibility: 'hidden' }
    : mode === 'fade'
    ? { opacity: fading ? 0 : 1, transition: 'opacity 0.4s ease', willChange: 'opacity', backfaceVisibility: 'hidden' }
    : {};

  return (
    <div style={tickerStyle}>
      <div style={animStyle}>
        <CryptoCoin coin={coin} price={prices[coin]}
          fontSize={fontSize} bgColor={bgColor}
          textColor={textColor} fontFamily={fontFamily} fontWeight={fontWeight}
          cryptoUpColor={cryptoUpColor} cryptoDownColor={cryptoDownColor}
          metallic={metallic} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   ScrollText — auto-scrolls when text overflows its container
   ═══════════════════════════════════════════════════════ */
function ScrollText({ text, style }) {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [shouldScroll, setShouldScroll] = useState(false);

  useEffect(() => {
    const check = () => {
      if (textRef.current && containerRef.current) {
        setShouldScroll(textRef.current.scrollWidth > containerRef.current.clientWidth + 2);
      }
    };
    check();
    // Re-check when text changes
    const raf = requestAnimationFrame(check);
    return () => cancelAnimationFrame(raf);
  }, [text]);

  const duration = Math.max((text || '').length * 0.28, 4);

  return (
    <div ref={containerRef} style={{ minWidth: 0, maxWidth: '100%', ...style, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: shouldScroll ? 'unset' : 'ellipsis' }}>
      <span
        ref={textRef}
        style={{
          display: 'inline-block',
          animation: shouldScroll ? `nbTextScroll ${duration}s linear infinite` : 'none',
          paddingRight: shouldScroll ? 48 : 0,
        }}
      >
        {text}
        {shouldScroll && <span style={{ paddingLeft: 48 }}>{text}</span>}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Now Playing — multiple display styles for navbar
   ═══════════════════════════════════════════════════════════ */
function NowPlayingDisplay({ data, musicDisplayStyle, fontSize, textColor, mutedColor, accentColor, fontFamily, fontWeight, isMetal, barHeight }) {
  const typography = { fontFamily, fontWeight };
  const content = (() => {
    switch (musicDisplayStyle) {
      case 'pill':      return <NP_Pill data={data} fontSize={fontSize} textColor={textColor} mutedColor={mutedColor} accentColor={accentColor} isMetal={isMetal} barHeight={barHeight} {...typography} />;
      case 'marquee':   return <NP_Marquee data={data} fontSize={fontSize} textColor={textColor} mutedColor={mutedColor} accentColor={accentColor} {...typography} />;
      case 'albumart':  return <NP_AlbumArt data={data} fontSize={fontSize} textColor={textColor} mutedColor={mutedColor} accentColor={accentColor} isMetal={isMetal} barHeight={barHeight} {...typography} />;
      case 'equalizer': return <NP_Equalizer data={data} fontSize={fontSize} textColor={textColor} mutedColor={mutedColor} accentColor={accentColor} {...typography} />;
      case 'vinyl':     return <NP_Vinyl data={data} fontSize={fontSize} textColor={textColor} mutedColor={mutedColor} accentColor={accentColor} barHeight={barHeight} {...typography} />;
      case 'minimal':   return <NP_Minimal data={data} fontSize={fontSize} textColor={textColor} mutedColor={mutedColor} accentColor={accentColor} {...typography} />;
      case 'wave':      return <NP_Wave data={data} fontSize={fontSize} textColor={textColor} mutedColor={mutedColor} accentColor={accentColor} barHeight={barHeight} {...typography} />;
      case 'text':
      default:          return <NP_Text data={data} fontSize={fontSize} textColor={textColor} mutedColor={mutedColor} {...typography} />;
    }
  })();
  return <div style={{ display: 'flex', alignItems: 'center', minWidth: 0, width: '100%', maxWidth: '100%', overflow: 'hidden' }}>{content}</div>;
}

/* Style 1: Text (original) */
function NP_Text({ data, fontSize, textColor, mutedColor, fontFamily, fontWeight }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 160, maxWidth: 300, overflow: 'hidden', fontFamily }}>
      <span style={{ fontSize: fontSize * 0.85, fontWeight, letterSpacing: '0.28em', textTransform: 'uppercase', color: mutedColor, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
        Now Playing
      </span>
      <ScrollText text={data.artist} style={{ fontSize: fontSize * 0.95, fontWeight, color: textColor, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }} />
      <ScrollText text={data.track} style={{ fontSize: fontSize * 1.1, fontWeight, letterSpacing: '0.04em', color: textColor, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }} />
    </div>
  );
}

/* Style 2: Pill — compact with album art, transparent */
function NP_Pill({ data, fontSize, textColor, mutedColor, accentColor, fontFamily, fontWeight, isMetal, barHeight }) {
  const h = barHeight * 0.65;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      maxWidth: 320, overflow: 'hidden',
      fontFamily,
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
        <ScrollText text={data.track} style={{ fontSize: fontSize * 1, fontWeight, color: textColor, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }} />
        <ScrollText text={data.artist} style={{ fontSize: fontSize * 0.85, color: mutedColor, fontWeight, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }} />
      </div>
    </div>
  );
}

/* Style 3: Marquee — scrolling ticker */
function NP_Marquee({ data, fontSize, textColor, mutedColor, accentColor, fontFamily, fontWeight }) {
  const text = `♫ ${data.track}  —  ${data.artist}  `;
  return (
    <div style={{ minWidth: 160, maxWidth: 320, overflow: 'hidden', position: 'relative', fontFamily }}>
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
        <span style={{ fontSize: fontSize * 0.82, color: mutedColor, textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
          Now Playing
        </span>
      </div>
      <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
        <span className="nb-marquee-scroll" style={{
          display: 'inline-block', fontSize: fontSize * 1.05, fontWeight, color: textColor, textShadow: '0 1px 4px rgba(0,0,0,0.6)',
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
function NP_AlbumArt({ data, fontSize, textColor, mutedColor, accentColor, fontFamily, fontWeight, isMetal, barHeight }) {
  const sz = barHeight * 0.72;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, maxWidth: 340, overflow: 'hidden', fontFamily }}>
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
        <ScrollText text={data.track} style={{ fontSize: fontSize * 1.1, fontWeight, color: textColor, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }} />
        <ScrollText text={data.artist} style={{ fontSize: fontSize * 0.88, color: mutedColor, marginTop: 1, fontWeight, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 2.5, borderRadius: 1, background: accentColor,
              animation: data.isPlaying ? `spotifyEq ${0.35 + i * 0.1}s ease-in-out infinite alternate` : 'none',
              height: data.isPlaying ? undefined : 3,
            }} />
          ))}
          <span style={{ fontSize: fontSize * 0.78, color: `${accentColor}cc`, marginLeft: 3, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
            {data.isPlaying ? 'Live' : 'Paused'}
          </span>
        </div>
      </div>
    </div>
  );
}

/* Style 5: Equalizer — animated bars + info */
function NP_Equalizer({ data, fontSize, textColor, mutedColor, accentColor, fontFamily, fontWeight }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 160, maxWidth: 320, overflow: 'hidden', fontFamily }}>
      {/* Eq bars */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 16, flexShrink: 0 }}>
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
        <ScrollText text={data.track} style={{ fontSize: fontSize * 1.05, fontWeight, color: textColor, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }} />
        <ScrollText text={data.artist} style={{ fontSize: fontSize * 0.88, color: accentColor, fontWeight, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }} />
      </div>
    </div>
  );
}

/* Style 6: Vinyl — spinning record disc, no background */
function NP_Vinyl({ data, fontSize, textColor, mutedColor, accentColor, fontFamily, fontWeight, barHeight }) {
  const sz = barHeight * 0.72;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, maxWidth: 340, overflow: 'hidden', fontFamily }}>
      {/* Spinning disc */}
      <div style={{
        width: sz, height: sz, borderRadius: '50%', flexShrink: 0,
        background: data.albumArt
          ? `url(${data.albumArt}) center/cover`
          : `radial-gradient(circle at 50% 50%, ${accentColor}44 0%, #111 40%, #222 60%, ${accentColor}22 100%)`,
        border: `2px solid ${accentColor}66`,
        boxShadow: `0 0 10px ${accentColor}33`,
        animation: data.isPlaying ? 'nbVinylSpin 3s linear infinite' : 'nbVinylSpin 8s linear infinite',
        position: 'relative',
      }}>
        {/* Center hole */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: sz * 0.22, height: sz * 0.22, borderRadius: '50%',
          background: '#111', border: `1.5px solid ${accentColor}55`,
        }} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <ScrollText text={data.track} style={{ fontSize: fontSize * 1.1, fontWeight, color: textColor, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }} />
        <ScrollText text={data.artist} style={{ fontSize: fontSize * 0.88, color: mutedColor, marginTop: 1, fontWeight, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }} />
      </div>
    </div>
  );
}

/* Style 7: Minimal — just an icon + single line, no background */
function NP_Minimal({ data, fontSize, textColor, mutedColor, accentColor, fontFamily, fontWeight }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: 320, overflow: 'hidden', fontFamily }}>
      <span style={{
        fontSize: fontSize * 1.1, color: accentColor, flexShrink: 0,
        animation: data.isPlaying ? 'spotifyPulse 1.8s ease-in-out infinite' : 'none',
      }}>♫</span>
      <ScrollText text={data.track} style={{ fontSize: fontSize * 1, fontWeight, color: textColor, flex: 1, minWidth: 0, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }} />
      <span style={{ fontSize: fontSize * 0.85, color: mutedColor, flexShrink: 0, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>—</span>
      <ScrollText text={data.artist} style={{ fontSize: fontSize * 0.88, color: mutedColor, flex: 1, minWidth: 0, fontWeight, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }} />
    </div>
  );
}

/* Style 8: Wave — sound wave animation + info, no background */
function NP_Wave({ data, fontSize, textColor, mutedColor, accentColor, fontFamily, fontWeight, barHeight }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, maxWidth: 320, overflow: 'hidden', fontFamily }}>
      {/* Wave bars */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 1.5, height: 26, flexShrink: 0 }}>
        {[0, 1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} style={{
            width: 2.5, borderRadius: 2,
            background: accentColor,
            opacity: 0.5 + (i % 3) * 0.2,
            animation: data.isPlaying
              ? `nbWaveBar ${0.4 + i * 0.08}s ease-in-out ${i * 0.05}s infinite alternate`
              : 'none',
            height: data.isPlaying ? undefined : 3,
          }} />
        ))}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <ScrollText text={data.track} style={{ fontSize: fontSize * 1.05, fontWeight, color: textColor, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }} />
        <ScrollText text={data.artist} style={{ fontSize: fontSize * 0.88, color: mutedColor, fontWeight, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }} />
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

export default React.memo(NavbarWidget);
