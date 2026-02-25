import React, { useEffect, useState, useRef, useCallback } from 'react';
import { fetchNowPlaying, refreshSpotifyToken } from '../../../utils/spotifyAuth';

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
export default function NavbarWidget({ config }) {
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
  const accentColor = c.accentColor || '#f59e0b';
  const accentColorRGB = hexToRgb(accentColor);
  const bgColor = c.bgColor || '#111318';
  const textColor = c.textColor || '#f1f5f9';
  const mutedColor = c.mutedColor || '#94a3b8';
  const borderColor = c.borderColor || accentColor;
  const fontFamily = c.fontFamily || "'Inter', sans-serif";
  const brightness = c.brightness ?? 100;
  const contrast = c.contrast ?? 100;
  const saturation = c.saturation ?? 100;
  const borderWidth = c.borderWidth ?? 3;
  const barHeight = c.barHeight ?? 64;
  const borderRadius = c.borderRadius ?? 999;
  const fontSize = c.fontSize ?? 12;
  const ctaColor = c.ctaColor || '#f43f5e';
  const cryptoUpColor = c.cryptoUpColor || '#34d399';
  const cryptoDownColor = c.cryptoDownColor || '#f87171';

  const filterStr = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

  const barOuter = {
    width: '100%',
    maxWidth: c.maxWidth || 1200,
    borderRadius,
    background: `linear-gradient(to bottom, ${borderColor}e6, ${borderColor}cc)`,
    padding: `${borderWidth}px`,
    boxShadow: `0 18px 40px rgba(0,0,0,0.8)`,
    filter: filterStr,
    fontFamily,
  };

  const barInner = {
    display: 'flex',
    alignItems: 'center',
    height: barHeight,
    borderRadius: borderRadius - borderWidth,
    background: `linear-gradient(to right, ${bgColor}, ${bgColor}f2, ${bgColor})`,
    padding: '0 20px',
    color: textColor,
    fontSize,
    gap: 0,
    overflow: 'hidden',
  };

  const sep = {
    width: 1,
    height: barHeight * 0.55,
    background: `linear-gradient(to bottom, transparent, ${mutedColor}70, transparent)`,
    flexShrink: 0,
    margin: '0 16px',
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', width: '100%', height: '100%' }}>
      <div style={barOuter}>
        <div style={barInner}>

          {/* ─── Left: Avatar + Name + Motto ─── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingRight: 16, flexShrink: 0 }}>
            {c.showAvatar !== false && (
              <div style={{
                position: 'relative',
                width: barHeight * 0.72,
                height: barHeight * 0.72,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${accentColor}, ${accentColor}88)`,
                boxShadow: `0 0 20px ${accentColor}cc`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {c.avatarUrl ? (
                  <img src={c.avatarUrl} alt="" style={{
                    width: '78%', height: '78%', borderRadius: '50%', objectFit: 'cover',
                    border: `1px solid ${textColor}40`,
                  }} />
                ) : (
                  <div style={{
                    width: '78%', height: '78%', borderRadius: '50%',
                    border: `1px solid ${textColor}40`,
                    background: 'radial-gradient(circle at 30% 20%, #fff5, #000)',
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
                backgroundImage: c.nameGradient || `linear-gradient(to right, ${accentColor}, #ec4899, #a855f7)`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                fontSize: fontSize * 1.2, fontWeight: 600,
                letterSpacing: '0.18em', textTransform: 'uppercase',
              }}>
                {c.streamerName || 'STREAMER'}
              </span>
              {c.motto && (
                <span style={{
                  marginTop: 2, fontSize: fontSize * 0.82, fontWeight: 600,
                  letterSpacing: '0.35em', textTransform: 'uppercase', color: mutedColor,
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
              }}>
                <img src={c.badgeImage} alt="" style={{
                  height: barHeight * 0.85, minWidth: barHeight * 1.2, objectFit: 'contain',
                  filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.3))',
                }} />
              </div>
            </>
          )}

          {/* ─── Middle: Clock + Now Playing ─── */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, minWidth: 0 }}>
            {c.showClock !== false && (
              <>
                <div style={{
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
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 160, maxWidth: 300, overflow: 'hidden' }}>
                <span style={{ fontSize: fontSize * 0.75, fontWeight: 600, letterSpacing: '0.28em', textTransform: 'uppercase', color: mutedColor }}>
                  Now Playing
                </span>
                <span style={{ fontSize: fontSize * 0.9, fontWeight: 500, color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {displayNowPlaying.artist}
                </span>
                <span style={{ fontSize: fontSize * 1.05, fontWeight: 600, letterSpacing: '0.04em', color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {displayNowPlaying.track}
                </span>
              </div>
            )}

            {c.showNowPlaying !== false && !displayNowPlaying && c.musicSource === 'spotify' && (
              <div style={{ fontSize: fontSize * 0.82, color: mutedColor, fontStyle: 'italic' }}>
                No track playing
              </div>
            )}
          </div>

          {/* ─── Right: Crypto + CTA ─── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 16, flexShrink: 0 }}>
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
                />
                {c.showCTA && <div style={sep} />}
              </>
            )}

            {c.showCTA && c.ctaText && (
              <div style={{
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
function CryptoCoin({ coin, price, fontSize, bgColor, cryptoUpColor, cryptoDownColor, style }) {
  const isUp = price.change >= 0;
  const changeColor = isUp ? cryptoUpColor : cryptoDownColor;
  return (
    <div style={{
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
        width: 22, height: 22, borderRadius: '50%',
        background: `linear-gradient(135deg, #6366f1, #a855f7, ${cryptoUpColor})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: fontSize * 0.9, fontWeight: 900, color: '#fff',
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
function CryptoTicker({ coins, prices, mode, index, fading, fontSize, bgColor, cryptoUpColor, cryptoDownColor }) {
  const safeIdx = index % coins.length;
  const coin = coins[safeIdx];

  // Horizontal = slide left/right
  if (mode === 'horizontal') {
    return (
      <div style={{ position: 'relative' }}>
        <div style={{
          transform: `translateX(${fading ? '-8px' : '0'})`,
          opacity: fading ? 0 : 1,
          transition: 'all 0.35s ease',
        }}>
          <CryptoCoin coin={coin} price={prices[coin]}
            fontSize={fontSize} bgColor={bgColor}
            cryptoUpColor={cryptoUpColor} cryptoDownColor={cryptoDownColor} />
        </div>
      </div>
    );
  }

  // Carousel = slide up/down vertically
  if (mode === 'carousel') {
    return (
      <div style={{ position: 'relative' }}>
        <div style={{
          transform: `translateY(${fading ? '-12px' : '0'})`,
          opacity: fading ? 0 : 1,
          transition: 'all 0.35s ease',
        }}>
          <CryptoCoin coin={coin} price={prices[coin]}
            fontSize={fontSize} bgColor={bgColor}
            cryptoUpColor={cryptoUpColor} cryptoDownColor={cryptoDownColor} />
        </div>
      </div>
    );
  }

  // Fade = crossfade in place
  if (mode === 'fade') {
    return (
      <div style={{ position: 'relative' }}>
        <div style={{
          opacity: fading ? 0 : 1,
          transition: 'opacity 0.4s ease',
        }}>
          <CryptoCoin coin={coin} price={prices[coin]}
            fontSize={fontSize} bgColor={bgColor}
            cryptoUpColor={cryptoUpColor} cryptoDownColor={cryptoDownColor} />
        </div>
      </div>
    );
  }

  return null;
}

/* ─── Hex to RGB helper ─── */
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
