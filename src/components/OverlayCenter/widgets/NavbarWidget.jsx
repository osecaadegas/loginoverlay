import React, { useEffect, useState, useRef } from "react";
import {
  fetchNowPlaying,
  serverRefreshToken,
} from "../../../utils/spotifyAuth";
import { subElementStyle, subValue } from "./shared/appearanceStyles";
import {
  brushedMetalBackground,
  brushedMetalTextBackground,
  colorToRgbString,
  metalBorderColor,
  metalSurfaceShadow,
} from "./shared/metalTexture";
import {
  STYLE_SECA,
  resolveStyleSecaValue,
  styleSecaHeaderGradient,
  styleSecaSurfaceGradient,
} from "./shared/styleSecaTheme";
import { resolveBonusHuntSyncedColors } from "./shared/bonusHuntColorSync";

/* ─── Crypto price fetcher (CoinGecko free API) ─── */
const CRYPTO_IDS = {
  btc: "bitcoin",
  eth: "ethereum",
  sol: "solana",
  bnb: "binancecoin",
  xrp: "ripple",
  ada: "cardano",
  doge: "dogecoin",
  dot: "polkadot",
  avax: "avalanche-2",
  matic: "matic-network",
  ltc: "litecoin",
  link: "chainlink",
  ton: "the-open-network",
  shib: "shiba-inu",
  trx: "tron",
};

/* All coins that auto-cycle when crypto is enabled */
const ALL_CRYPTO_COINS = Object.keys(CRYPTO_IDS);

const CRYPTO_SYMBOLS = {
  btc: "₿",
  eth: "Ξ",
  sol: "S",
  bnb: "B",
  xrp: "X",
  ada: "A",
  doge: "Ð",
  dot: "●",
  avax: "A",
  matic: "M",
  ltc: "Ł",
  link: "⬡",
};

/* Real coin logos from CoinGecko CDN (32px thumbnails) */
const CRYPTO_LOGOS = {
  btc: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png",
  eth: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  sol: "https://assets.coingecko.com/coins/images/4128/small/solana.png",
  bnb: "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png",
  xrp: "https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png",
  ada: "https://assets.coingecko.com/coins/images/975/small/cardano.png",
  doge: "https://assets.coingecko.com/coins/images/5/small/dogecoin.png",
  dot: "https://assets.coingecko.com/coins/images/12171/small/polkadot.png",
  avax: "https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png",
  matic: "https://assets.coingecko.com/coins/images/4713/small/polygon.png",
  ltc: "https://assets.coingecko.com/coins/images/2/small/litecoin.png",
  link: "https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png",
  ton: "https://assets.coingecko.com/coins/images/17980/small/ton_symbol.png",
  shib: "https://assets.coingecko.com/coins/images/11939/small/shiba.png",
  trx: "https://assets.coingecko.com/coins/images/1094/small/tron-logo.png",
};

const DEFAULT_SECTION_LAYOUT = [
  { id: "identity", zone: "left" },
  { id: "badge", zone: "left" },
  { id: "clock", zone: "center" },
  { id: "nowPlaying", zone: "center" },
  { id: "crypto", zone: "right" },
  { id: "cta", zone: "right" },
  { id: "balance", zone: "right" },
  { id: "casino", zone: "right" },
];

const NAVBAR_STYLE_DEFAULTS = {
  accentColor: {
    StyleSecaNav: STYLE_SECA.primary,
    metallic: "#e8a020",
    glass: "#60a5fa",
    retro: "#ff6b2b",
    carbon: "#ef4444",
    futuristic: "#00ffcc",
    default: "#f59e0b",
  },
  bgColor: {
    StyleSecaNav: STYLE_SECA.surface,
    metallic: "#1a1a1e",
    glass: "#0f172a",
    retro: "#1a0a00",
    carbon: "#0a0a0a",
    futuristic: "#050d1a",
    default: "#111318",
  },
  textColor: {
    StyleSecaNav: STYLE_SECA.text,
    metallic: "#d4d4d8",
    glass: "#e0eaff",
    retro: "#ffd9b3",
    carbon: "#d4d4d8",
    futuristic: "#e0fff5",
    default: "#f1f5f9",
  },
  mutedColor: {
    StyleSecaNav: STYLE_SECA.muted,
    metallic: "#666666",
    glass: "#6b8ccc",
    retro: "#885530",
    carbon: "#52525b",
    futuristic: "#4fd1c5",
    default: "#94a3b8",
  },
  containerFontFamily: {
    StyleSecaNav: "'Rajdhani', 'Barlow Condensed', sans-serif",
    retro: "'Press Start 2P', 'Courier New', monospace",
    futuristic: "'Orbitron', sans-serif",
    default: "'Inter', sans-serif",
  },
  borderWidth: {
    StyleSecaNav: 1,
    metallic: 1,
    glass: 1,
    retro: 3,
    carbon: 1,
    futuristic: 1,
    default: 3,
  },
  borderRadius: {
    StyleSecaNav: 12,
    metallic: 16,
    glass: 20,
    retro: 4,
    carbon: 8,
    futuristic: 20,
    default: 999,
  },
  casinoRadius: {
    StyleSecaNav: 6,
    metallic: 6,
    retro: 2,
    default: 8,
  },
  clockRadius: {
    StyleSecaNav: 10,
    metallic: 10,
    glass: 14,
    retro: 2,
    default: 999,
  },
  containerFontSize: {
    retro: 13,
    default: 15,
  },
  clockBorderWidth: {
    retro: 2,
    default: 1,
  },
  ctaColor: {
    StyleSecaNav: STYLE_SECA.primary,
    retro: "#ff4500",
    futuristic: "#00ffcc",
    default: "#f43f5e",
  },
};

function resolveNavbarStyleDefault(displayStyle, key) {
  const defaults = NAVBAR_STYLE_DEFAULTS[key] || {};
  const value = Object.hasOwn(defaults, displayStyle)
    ? defaults[displayStyle]
    : defaults.default;
  return typeof value === "function" ? value() : value;
}

function resolveNavbarStyleSecaValue(isStyleSeca, value, fallback) {
  if (isStyleSeca) return resolveStyleSecaValue(value, fallback);
  return value;
}

function resolveDisplayNowPlaying(config, nowPlaying) {
  if (config.musicSource === "spotify" && nowPlaying) return nowPlaying;
  if (config.musicSource !== "manual") return null;
  if (!config.manualArtist && !config.manualTrack) return null;
  return {
    artist: config.manualArtist || "",
    track: config.manualTrack || "",
    isPlaying: true,
  };
}

function resolveNavbarClockBorderColor(displayStyle, accentColor) {
  if (displayStyle === "retro") return `${accentColor}88`;
  return "rgba(255,255,255,0.12)";
}

function resolveSponsorFontWeight({ isGlass, isMetalSurface, isRetro }) {
  if (isGlass) return 600;
  if (!isMetalSurface && !isRetro) return 600;
  return 700;
}

function buildNavbarBarOuterStyle({
  isStyleSeca,
  isMetal,
  isCarbon,
  isFuturistic,
  isGlass,
  isRetro,
  borderWidth,
  containerFontFamily,
  accentColor,
  bgColor,
  borderColor,
}) {
  const base = {
    width: "100%",
    height: "100%",
    boxSizing: "border-box",
    padding: `${borderWidth}px`,
    fontFamily: containerFontFamily,
  };
  if (isStyleSeca) return { ...base, background: styleSecaHeaderGradient() };
  if (isMetal) {
    return {
      ...base,
      background: brushedMetalBackground(
        "linear-gradient(135deg, rgba(42,43,48,0.96), rgba(17,18,22,0.98))",
        accentColor,
        { highlightOpacity: 0.05, grainOpacity: 0.025 },
      ),
    };
  }
  if (isCarbon) {
    return {
      ...base,
      background: `repeating-linear-gradient(45deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 2px, transparent 2px, transparent 6px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 2px, transparent 2px, transparent 6px), ${bgColor}`,
    };
  }
  if (isFuturistic) {
    return {
      ...base,
      background:
        "linear-gradient(135deg, rgba(0,255,204,0.06), transparent 40%, rgba(0,255,204,0.04))",
    };
  }
  if (isGlass) {
    return {
      ...base,
      background:
        "linear-gradient(135deg, rgba(30,30,60,0.82), rgba(20,20,50,0.88))",
    };
  }
  if (isRetro) {
    return {
      ...base,
      background: `${borderColor}`,
      imageRendering: "pixelated",
    };
  }
  return {
    ...base,
    background: `linear-gradient(to bottom, ${borderColor}e6, ${borderColor}cc)`,
  };
}

function buildNavbarBarInnerStyle({
  isStyleSeca,
  isMetal,
  isCarbon,
  isFuturistic,
  isGlass,
  isRetro,
  bgColor,
  bgColorRGB,
  bgColorSoft,
  accentColor,
  accentColorRGB,
  textColor,
  fontSize,
  containerPadding,
  containerShadow,
  containerGlow,
  containerBlur,
  widgetScale,
  needsFilter,
  filterStr,
}) {
  const configuredShadow =
    containerShadow || containerGlow
      ? [containerShadow, containerGlow].filter(Boolean).join(", ")
      : undefined;
  const base = {
    display: "flex",
    alignItems: "center",
    height: "100%",
    boxSizing: "border-box",
    color: textColor,
    fontSize,
    gap: 0,
    transform: widgetScale !== 1 ? `scale(${widgetScale})` : undefined,
    transformOrigin: "center",
    overflow: "visible",
    ...(needsFilter && { filter: filterStr }),
  };
  const blurStyle = containerBlur
    ? {
        backdropFilter: `blur(${containerBlur}px)`,
        WebkitBackdropFilter: `blur(${containerBlur}px)`,
      }
    : {};
  if (isStyleSeca) {
    return {
      ...base,
      ...blurStyle,
      background: styleSecaSurfaceGradient("170deg"),
      padding: `0 ${containerPadding}px`,
      boxShadow:
        configuredShadow ||
        `0 16px 34px rgba(0,0,0,0.36), 0 0 24px ${STYLE_SECA.glow}`,
      position: "relative",
    };
  }
  if (isMetal) {
    return {
      ...base,
      ...blurStyle,
      background: brushedMetalBackground(
        `linear-gradient(170deg, rgba(${accentColorRGB},0.05) 0%, ${bgColor} 30%, rgba(${accentColorRGB},0.035) 60%, ${bgColor} 100%)`,
        accentColor,
      ),
      padding: `0 ${containerPadding}px`,
      boxShadow: configuredShadow || metalSurfaceShadow(accentColor, 0.85),
      position: "relative",
    };
  }
  if (isCarbon) {
    return {
      ...base,
      ...blurStyle,
      background: `linear-gradient(180deg, ${bgColor}, #060606)`,
      padding: `0 ${containerPadding}px`,
      boxShadow: configuredShadow,
      position: "relative",
    };
  }
  if (isFuturistic) {
    return {
      ...base,
      ...blurStyle,
      background: `linear-gradient(135deg, rgba(${bgColorRGB},0.95), rgba(${bgColorRGB},0.88))`,
      padding: `0 ${containerPadding}px`,
      boxShadow: configuredShadow,
      position: "relative",
    };
  }
  if (isGlass) {
    return {
      ...base,
      ...blurStyle,
      background: `linear-gradient(135deg, rgba(${bgColorRGB},0.92), rgba(${bgColorRGB},0.85))`,
      padding: `0 ${containerPadding}px`,
      boxShadow: configuredShadow,
      position: "relative",
    };
  }
  if (isRetro) {
    return {
      ...base,
      background: `linear-gradient(180deg, ${bgColor}, #0d0500)`,
      padding: `0 ${Math.max(6, Number(containerPadding) || 8)}px`,
      boxShadow: configuredShadow,
      position: "relative",
      borderTop: "2px solid rgba(255,255,255,0.15)",
    };
  }
  return {
    ...base,
    background: `linear-gradient(to right, ${bgColor}, ${bgColorSoft}, ${bgColor})`,
    padding: `0 ${containerPadding}px`,
    boxShadow: configuredShadow,
  };
}

function buildNavbarSeparatorStyle({
  isMetalSurface,
  isGlass,
  isRetro,
  separatorWidth,
  separatorColor,
  separatorOpacity,
  barHeight,
  accentColor,
  accentColorRGB,
  mutedColor,
}) {
  const base = {
    width: separatorWidth,
    opacity: separatorOpacity,
    flexShrink: 0,
  };
  if (isMetalSurface) {
    return {
      ...base,
      height: barHeight * 0.5,
      background:
        separatorColor ||
        `linear-gradient(to bottom, transparent, rgba(${accentColorRGB},0.25), transparent)`,
      margin: "0 3px",
    };
  }
  if (isGlass) {
    return {
      ...base,
      height: barHeight * 0.5,
      background:
        separatorColor ||
        "linear-gradient(to bottom, transparent, rgba(255,255,255,0.2), transparent)",
      margin: "0 3px",
    };
  }
  if (isRetro) {
    return {
      ...base,
      width: Math.max(1, Number(separatorWidth) || 2),
      height: barHeight * 0.6,
      background: separatorColor || `${accentColor}88`,
      margin: "0 2px",
    };
  }
  return {
    ...base,
    height: barHeight * 0.55,
    background:
      separatorColor ||
      `linear-gradient(to bottom, transparent, ${mutedColor}70, transparent)`,
    margin: "0 3px",
  };
}

function resolveDisplayNameBackground({
  isMetalSurface,
  isGlass,
  isRetro,
  textColor,
  displayNameAccentColor,
  ctaColor,
  nameGradient,
}) {
  if (isMetalSurface) {
    return brushedMetalTextBackground(textColor, displayNameAccentColor);
  }
  if (isGlass) {
    return `linear-gradient(to right, ${textColor}, ${displayNameAccentColor}, ${textColor})`;
  }
  if (isRetro) {
    return `linear-gradient(to right, ${displayNameAccentColor}, ${ctaColor}, ${displayNameAccentColor})`;
  }
  return (
    nameGradient ||
    `linear-gradient(to right, ${displayNameAccentColor}, ${textColor}, ${displayNameAccentColor})`
  );
}

function resolveDisplayNameLetterSpacing({ isMetalSurface, isRetro }) {
  if (isMetalSurface) return "0.22em";
  if (isRetro) return "0.12em";
  return "0.18em";
}

function resolveMottoLetterSpacing({ isMetalSurface, isRetro }) {
  if (isMetalSurface) return "0.4em";
  if (isRetro) return "0.2em";
  return "0.35em";
}

function clockPaddingValue(clockPadding, multiplier, fallback) {
  if (clockPadding != null)
    return `${clockPadding}px ${Math.round(clockPadding * multiplier)}px`;
  return fallback;
}

function buildNavbarClockStyle({
  isMetalSurface,
  isGlass,
  isRetro,
  clockRadius,
  clockPadding,
  clockBg,
  clockBorderWidth,
  clockBorderColor,
  clockTextColor,
  clockFontFamily,
  clockFontSize,
  clockFontWeight,
  clockShadow,
  accentColor,
  accentColorRGB,
}) {
  const base = {
    borderRadius: clockRadius,
    border: `${clockBorderWidth}px solid ${clockBorderColor}`,
    color: clockTextColor,
    fontFamily: clockFontFamily,
    fontSize: clockFontSize,
    fontWeight: clockFontWeight,
    flexShrink: 0,
  };
  if (isMetalSurface) {
    return {
      ...base,
      padding: clockPaddingValue(clockPadding, 2.6, "6px 22px"),
      background:
        clockBg ||
        "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
      letterSpacing: "0.28em",
      boxShadow:
        clockShadow ||
        `inset 0 1px 0 rgba(255,255,255,0.04), inset 0 -1px 0 rgba(0,0,0,0.15), 0 0 14px rgba(${accentColorRGB},0.08)`,
    };
  }
  if (isGlass) {
    return {
      ...base,
      padding: clockPaddingValue(clockPadding, 2.5, "6px 20px"),
      background: clockBg || "rgba(255,255,255,0.08)",
      backdropFilter: "blur(8px)",
      letterSpacing: "0.25em",
      boxShadow: clockShadow,
    };
  }
  if (isRetro) {
    return {
      ...base,
      padding: clockPaddingValue(clockPadding, 2.2, "6px 14px"),
      background: clockBg || "#000",
      color: clockTextColor || accentColor,
      letterSpacing: "0.15em",
      boxShadow: clockShadow,
    };
  }
  return {
    ...base,
    padding: clockPaddingValue(clockPadding, 2.5, "6px 20px"),
    background:
      clockBg ||
      `linear-gradient(to bottom, ${accentColor}e6, ${accentColor}cc)`,
    letterSpacing: "0.25em",
    boxShadow: clockShadow || `0 0 18px ${accentColor}e6`,
  };
}

function sponsorPaddingValue(sponsorPadding, multiplier, fallback) {
  if (sponsorPadding != null)
    return `${sponsorPadding}px ${Math.round(sponsorPadding * multiplier)}px`;
  return fallback;
}

function buildNavbarSponsorStyle({
  isStyleSeca,
  isMetal,
  isGlass,
  isRetro,
  sponsorRadius,
  sponsorPadding,
  sponsorBorderWidth,
  sponsorBorderColor,
  sponsorTextColor,
  sponsorFontFamily,
  sponsorFontSize,
  sponsorFontWeight,
  sponsorShadow,
  sponsorAccentColor,
  ctaColor,
  ctaColorRGB,
}) {
  const base = {
    display: "flex",
    alignItems: "center",
    fontFamily: sponsorFontFamily,
    fontSize: sponsorFontSize,
    fontWeight: sponsorFontWeight,
    textTransform: "uppercase",
    flexShrink: 0,
  };
  if (isStyleSeca) {
    return {
      ...base,
      gap: 8,
      borderRadius: sponsorRadius ?? 10,
      padding: sponsorPaddingValue(sponsorPadding, 2.6, "7px 20px"),
      background: styleSecaHeaderGradient(),
      border: `${sponsorBorderWidth}px solid ${sponsorBorderColor || STYLE_SECA.border}`,
      color: sponsorTextColor || STYLE_SECA.darkText,
      letterSpacing: "0.24em",
      boxShadow:
        sponsorShadow ||
        `0 8px 18px rgba(0,0,0,0.24), 0 0 16px ${STYLE_SECA.glow}`,
      maxWidth: "min(28vw, 360px)",
      overflow: "hidden",
    };
  }
  if (isMetal) {
    return {
      ...base,
      gap: 8,
      borderRadius: sponsorRadius ?? 10,
      padding: sponsorPaddingValue(sponsorPadding, 2.6, "7px 20px"),
      background: brushedMetalBackground(
        `linear-gradient(135deg, rgba(${ctaColorRGB},0.15), rgba(${ctaColorRGB},0.05))`,
        sponsorAccentColor,
      ),
      border: `${sponsorBorderWidth}px solid ${sponsorBorderColor || metalBorderColor(sponsorAccentColor, 0.32)}`,
      color: sponsorTextColor || ctaColor,
      letterSpacing: "0.24em",
      boxShadow: sponsorShadow || metalSurfaceShadow(sponsorAccentColor, 0.64),
      maxWidth: "min(28vw, 360px)",
      overflow: "hidden",
    };
  }
  if (isGlass) {
    const glassBorderColor = sponsorBorderColor || `${ctaColor}33`;
    return {
      ...base,
      gap: 8,
      borderRadius: sponsorRadius ?? 14,
      padding: sponsorPaddingValue(sponsorPadding, 2.5, "7px 18px"),
      background: `${ctaColor}22`,
      border: `${sponsorBorderWidth}px solid ${glassBorderColor}`,
      backdropFilter: "blur(6px)",
      color: sponsorTextColor,
      letterSpacing: "0.24em",
    };
  }
  if (isRetro) {
    return {
      ...base,
      gap: 6,
      borderRadius: sponsorRadius ?? 2,
      padding: sponsorPaddingValue(sponsorPadding, 2.3, "6px 14px"),
      background: ctaColor,
      border: `${sponsorBorderWidth || 2}px solid ${sponsorBorderColor || "#000"}`,
      boxShadow: sponsorShadow || "2px 2px 0 #000",
      color: sponsorTextColor,
      letterSpacing: "0.12em",
    };
  }
  return {
    ...base,
    gap: 8,
    borderRadius: sponsorRadius ?? 999,
    padding: sponsorPaddingValue(sponsorPadding, 2.8, "6px 18px"),
    background: `linear-gradient(to bottom, ${ctaColor}, ${ctaColor}cc)`,
    color: sponsorTextColor,
    border: `${sponsorBorderWidth}px solid ${sponsorBorderColor || "transparent"}`,
    letterSpacing: "0.24em",
    boxShadow: sponsorShadow || `0 0 24px ${ctaColor}d9`,
    maxWidth: "min(28vw, 360px)",
    overflow: "hidden",
  };
}

function resolveCasinoTextShadow({
  isMetalSurface,
  isRetro,
  accentColorRGB,
  accentColor,
}) {
  if (isMetalSurface) return `0 0 10px rgba(${accentColorRGB},0.3)`;
  if (isRetro) return `0 0 8px ${accentColor}`;
  return "none";
}

function buildCryptoTickerAnimationStyle(mode, fading) {
  if (mode === "horizontal") {
    return {
      transform: fading ? "translate3d(-8px,0,0)" : "translate3d(0,0,0)",
      opacity: fading ? 0 : 1,
      transition: "transform 0.35s ease, opacity 0.35s ease",
      willChange: "transform, opacity",
      backfaceVisibility: "hidden",
    };
  }
  if (mode === "carousel") {
    return {
      transform: fading ? "translate3d(0,-12px,0)" : "translate3d(0,0,0)",
      opacity: fading ? 0 : 1,
      transition: "transform 0.35s ease, opacity 0.35s ease",
      willChange: "transform, opacity",
      backfaceVisibility: "hidden",
    };
  }
  if (mode === "fade") {
    return {
      opacity: fading ? 0 : 1,
      transition: "opacity 0.4s ease",
      willChange: "opacity",
      backfaceVisibility: "hidden",
    };
  }
  return {};
}

function nextCryptoIndex(currentIndex, coinCount) {
  return (currentIndex + 1) % coinCount;
}

function createCryptoIndexAdvance(coinCount) {
  return (currentIndex) => nextCryptoIndex(currentIndex, coinCount);
}

function isSpotifyTokenExpiring(expiresAt) {
  return Boolean(expiresAt && Date.now() > expiresAt - 60000);
}

async function refreshSpotifyToken(userId, tokenRef, expiresRef) {
  if (!userId) return false;
  try {
    const fresh = await serverRefreshToken(userId);
    tokenRef.current = fresh.access_token;
    expiresRef.current = fresh.expires_at;
    return true;
  } catch {
    return false;
  }
}

async function resolveSpotifyNowPlaying(userId, tokenRef, expiresRef) {
  let token = tokenRef.current;
  if (!token) return null;
  if (isSpotifyTokenExpiring(expiresRef.current)) {
    const refreshed = await refreshSpotifyToken(userId, tokenRef, expiresRef);
    if (refreshed) token = tokenRef.current;
  }
  try {
    return await fetchNowPlaying(token);
  } catch (err) {
    if (err.status !== 401) return null;
    const refreshed = await refreshSpotifyToken(userId, tokenRef, expiresRef);
    if (!refreshed) return null;
    try {
      return await fetchNowPlaying(tokenRef.current);
    } catch {
      return null;
    }
  }
}

function partAttrs(partId, stateId) {
  return {
    "data-widget-element": partId,
    "data-appearance-part": partId,
    ...(stateId ? { "data-widget-state": stateId } : {}),
  };
}

function withElementOffset(config, partId, style = {}) {
  const scoped = subElementStyle(config, partId, style);
  const offsetX = Math.round(
    Number(subValue(config, partId, "offsetX", 0)) || 0,
  );
  const offsetY = Math.round(
    Number(subValue(config, partId, "offsetY", 0)) || 0,
  );
  if (!offsetX && !offsetY) return scoped;
  const { transform, ...styleWithoutTransform } = scoped;
  return {
    ...styleWithoutTransform,
    position: style.position || "relative",
    left: style.left ?? `${offsetX}px`,
    top: style.top ?? `${offsetY}px`,
    zIndex: style.zIndex ?? 3,
  };
}

async function fetchCryptoPrices(coins) {
  if (!coins || coins.length === 0) return {};
  const ids = coins
    .map((c) => CRYPTO_IDS[c])
    .filter(Boolean)
    .join(",");
  if (!ids) return {};
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
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
  } catch {
    return {};
  }
}

/* ─── Clock hook ─── */
function useClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const update = () => {
      const d = new Date();
      setTime(
        `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`,
      );
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

/* ─── Main Navbar Widget (OBS Render) ─── */
function NavbarWidget({ config, widgetId, userId, allWidgets }) {
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
    const poll = () =>
      fetchCryptoPrices(ALL_CRYPTO_COINS).then(setCryptoPrices);
    poll();
    const id = setInterval(poll, 60000);
    return () => clearInterval(id);
  }, [c.showCrypto]);

  // Crypto cycling — all modes show one coin at a time
  const cryptoMode = c.cryptoDisplayMode || "horizontal";
  const activeCoins = ALL_CRYPTO_COINS.filter((coin) => cryptoPrices[coin]);
  useEffect(() => {
    if (activeCoins.length <= 1) return;
    const interval = cryptoMode === "fade" ? 4000 : 3500;
    const advanceIndex = createCryptoIndexAdvance(activeCoins.length);
    const finishCryptoFade = () => {
      setCryptoIndex(advanceIndex);
      setCryptoFading(false);
    };
    const startCryptoFade = () => {
      setCryptoFading(true);
      setTimeout(finishCryptoFade, 350);
    };
    const id = setInterval(startCryptoFade, interval);
    return () => clearInterval(id);
  }, [cryptoMode, activeCoins.length]);

  // Spotify "Now Playing" polling
  // Poll whenever musicSource is spotify and we have tokens — showNowPlaying only gates the UI display
  useEffect(() => {
    if (c.musicSource !== "spotify") return;
    if (!spotifyTokenRef.current) return;

    let stopped = false;
    const poll = async () => {
      if (stopped) return;
      const nextNowPlaying = await resolveSpotifyNowPlaying(
        userId,
        spotifyTokenRef,
        spotifyExpiresRef,
      );
      if (!stopped && nextNowPlaying) setNowPlaying(nextNowPlaying);
    };

    poll();
    const id = setInterval(poll, 10000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [c.musicSource, c.spotify_access_token, widgetId, userId]);

  // Manual "Now Playing"
  const displayNowPlaying = resolveDisplayNowPlaying(c, nowPlaying);

  /* ─── Style vars from config ─── */
  const isMetal = c.displayStyle === "metallic";
  const isStyleSeca = c.displayStyle === "StyleSecaNav";
  const isMetalSurface = isMetal || isStyleSeca;
  const styleSecaValue = (value, fallback) =>
    resolveNavbarStyleSecaValue(isStyleSeca, value, fallback);
  const syncedBonusHuntColors = resolveBonusHuntSyncedColors(c, allWidgets);
  const syncedPrimaryColor = syncedBonusHuntColors?.primaryColor;
  const syncedSecondaryColor = syncedBonusHuntColors?.secondaryColor;
  const isGlass = c.displayStyle === "glass";
  const isRetro = c.displayStyle === "retro";
  const isCarbon = c.displayStyle === "carbon";
  const isFuturistic = c.displayStyle === "futuristic";
  const rawAccentColor = styleSecaValue(
    subValue(
      c,
      "logo",
      "accentColor",
      c.accentColor || resolveNavbarStyleDefault(c.displayStyle, "accentColor"),
    ),
    STYLE_SECA.primary,
  );
  const accentColor = syncedPrimaryColor || rawAccentColor;
  const accentColorRGB = colorToRgbString(accentColor);
  const rawBgColor = styleSecaValue(
    subValue(
      c,
      "container",
      "background",
      c.bgColor || resolveNavbarStyleDefault(c.displayStyle, "bgColor"),
    ),
    STYLE_SECA.surface,
  );
  const bgColor = syncedSecondaryColor || rawBgColor;
  const textColor = styleSecaValue(
    subValue(
      c,
      "displayName",
      "textColor",
      c.textColor || resolveNavbarStyleDefault(c.displayStyle, "textColor"),
    ),
    STYLE_SECA.text,
  );
  const displayNameAccentColor =
    syncedPrimaryColor ||
    subValue(c, "displayName", "accentColor", accentColor);
  const mutedColor = styleSecaValue(
    subValue(
      c,
      "music",
      "textColor",
      c.mutedColor || resolveNavbarStyleDefault(c.displayStyle, "mutedColor"),
    ),
    STYLE_SECA.muted,
  );
  const borderColor =
    syncedPrimaryColor ||
    styleSecaValue(
      subValue(
        c,
        "container",
        "borderColor",
        c.borderColor || (isStyleSeca ? STYLE_SECA.border : accentColor),
      ),
      STYLE_SECA.border,
    );
  const containerFontFamily = subValue(
    c,
    "container",
    "fontFamily",
    c.fontFamily ||
      resolveNavbarStyleDefault(c.displayStyle, "containerFontFamily"),
  );
  const fontFamily = subValue(
    c,
    "displayName",
    "fontFamily",
    containerFontFamily,
  );
  const brightness = subValue(
    c,
    "container",
    "brightness",
    c.brightness ?? 100,
  );
  const contrast = subValue(c, "container", "contrast", c.contrast ?? 100);
  const saturation = subValue(
    c,
    "container",
    "saturation",
    c.saturation ?? 100,
  );
  const borderWidth = subValue(
    c,
    "container",
    "borderWidth",
    c.borderWidth ?? resolveNavbarStyleDefault(c.displayStyle, "borderWidth"),
  );
  const barHeight = subValue(c, "container", "height", c.barHeight ?? 64);
  const barMaxWidth = subValue(c, "container", "maxWidth", c.maxWidth ?? null);
  const borderRadius = subValue(
    c,
    "container",
    "radius",
    c.borderRadius ?? resolveNavbarStyleDefault(c.displayStyle, "borderRadius"),
  );
  const containerFontSize = subValue(
    c,
    "container",
    "fontSize",
    c.fontSize ??
      resolveNavbarStyleDefault(c.displayStyle, "containerFontSize"),
  );
  const fontSize = subValue(c, "displayName", "fontSize", containerFontSize);
  const fontWeight = subValue(c, "displayName", "fontWeight", 700);
  const mottoFontSize = Math.max(8, Number(fontSize) * 0.82);
  const mottoFontWeight = subValue(c, "displayName", "fontWeight", 700);
  const containerShadow = subValue(c, "container", "shadow", undefined);
  const containerGlow = subValue(c, "container", "glow", undefined);
  const containerBlur = subValue(c, "container", "backdropBlur", 0);
  const containerPadding = subValue(c, "container", "padding", 10);
  const widgetScale = Number(c.widgetScale || 1);
  const avatarImageSize = subValue(c, "avatar", "imageSize", null);
  const avatarRadius = subValue(c, "avatar", "radius", "50%");
  const avatarBorderColor = subValue(c, "avatar", "borderColor", "transparent");
  const avatarBorderWidth = subValue(c, "avatar", "borderWidth", 0);
  const avatarFit = subValue(c, "avatar", "imageFit", "cover");
  const avatarUrl = subValue(c, "avatar", "imageUrl", c.avatarUrl || "");
  const badgeImageSize = subValue(c, "badgeImage", "imageSize", null);
  const badgeImageRadius = subValue(c, "badgeImage", "radius", 0);
  const badgeImageFit = subValue(c, "badgeImage", "imageFit", "contain");
  const badgeImageUrl = subValue(
    c,
    "badgeImage",
    "imageUrl",
    c.badgeImage || "",
  );
  const casinoImageSize = subValue(c, "casino", "imageSize", null);
  const casinoImageRadius = subValue(
    c,
    "casino",
    "radius",
    resolveNavbarStyleDefault(c.displayStyle, "casinoRadius"),
  );
  const casinoImageFit = subValue(c, "casino", "imageFit", "contain");
  const casinoLogoUrl = subValue(
    c,
    "casino",
    "imageUrl",
    c.casinoLogoUrl || "",
  );
  const casinoTextColor = subValue(c, "casino", "textColor", accentColor);
  const casinoFontFamily = subValue(
    c,
    "casino",
    "fontFamily",
    containerFontFamily,
  );
  const casinoFontSize = subValue(c, "casino", "fontSize", fontSize * 0.9);
  const casinoFontWeight = subValue(c, "casino", "fontWeight", 700);
  const clockBg = subValue(c, "clock", "background", undefined);
  const clockTextColor = subValue(c, "clock", "textColor", textColor);
  const clockRadius = subValue(
    c,
    "clock",
    "radius",
    resolveNavbarStyleDefault(c.displayStyle, "clockRadius"),
  );
  const clockBorderColor = subValue(
    c,
    "clock",
    "borderColor",
    resolveNavbarClockBorderColor(c.displayStyle, accentColor),
  );
  const clockBorderWidth = subValue(
    c,
    "clock",
    "borderWidth",
    resolveNavbarStyleDefault(c.displayStyle, "clockBorderWidth"),
  );
  const clockShadow = subValue(c, "clock", "shadow", undefined);
  const clockFontFamily = subValue(
    c,
    "clock",
    "fontFamily",
    containerFontFamily,
  );
  const clockFontSize = subValue(c, "clock", "fontSize", fontSize * 0.92);
  const clockFontWeight = subValue(c, "clock", "fontWeight", 700);
  const clockPadding = subValue(c, "clock", "padding", null);
  const musicFontFamily = subValue(
    c,
    "music",
    "fontFamily",
    containerFontFamily,
  );
  const musicFontSize = subValue(c, "music", "fontSize", containerFontSize);
  const musicFontWeight = subValue(c, "music", "fontWeight", 700);
  const textShadow = "0 1px 4px rgba(0,0,0,0.6)";
  const ctaColor =
    syncedPrimaryColor ||
    styleSecaValue(
      subValue(
        c,
        "sponsor",
        "background",
        c.ctaColor || resolveNavbarStyleDefault(c.displayStyle, "ctaColor"),
      ),
      STYLE_SECA.primary,
    );
  const sponsorTextColor = styleSecaValue(
    subValue(
      c,
      "sponsor",
      "textColor",
      isStyleSeca ? STYLE_SECA.darkText : "#fff",
    ),
    STYLE_SECA.darkText,
  );
  const sponsorFontFamily = subValue(
    c,
    "sponsor",
    "fontFamily",
    containerFontFamily,
  );
  const sponsorFontSize = subValue(c, "sponsor", "fontSize", fontSize * 0.82);
  const sponsorFontWeight = subValue(
    c,
    "sponsor",
    "fontWeight",
    resolveSponsorFontWeight({ isGlass, isMetalSurface, isRetro }),
  );
  const sponsorRadius = subValue(c, "sponsor", "radius", null);
  const sponsorPadding = subValue(c, "sponsor", "padding", null);
  const sponsorBorderColor = subValue(c, "sponsor", "borderColor", null);
  const sponsorBorderWidth = subValue(c, "sponsor", "borderWidth", 1);
  const sponsorShadow = subValue(c, "sponsor", "shadow", undefined);
  const sponsorAccentColor =
    syncedPrimaryColor || subValue(c, "sponsor", "accentColor", ctaColor);
  const cryptoUpColor = subValue(
    c,
    "crypto",
    "fillColor",
    c.cryptoUpColor || "#34d399",
  );
  const cryptoDownColor = subValue(
    c,
    "crypto",
    "accentColor",
    c.cryptoDownColor || "#f87171",
  );
  const cryptoTextColor = subValue(c, "crypto", "textColor", textColor);
  const cryptoFontFamily = subValue(
    c,
    "crypto",
    "fontFamily",
    containerFontFamily,
  );
  const cryptoFontSize = subValue(c, "crypto", "fontSize", containerFontSize);
  const cryptoFontWeight = subValue(c, "crypto", "fontWeight", 700);
  const balanceTextColor = subValue(c, "balance", "textColor", textColor);
  const balanceAccentColor = subValue(c, "balance", "accentColor", accentColor);
  const balanceMutedColor = subValue(c, "balance", "borderColor", mutedColor);
  const balanceFontFamily = subValue(
    c,
    "balance",
    "fontFamily",
    containerFontFamily,
  );
  const balanceFontSize = subValue(c, "balance", "fontSize", fontSize * 1.1);
  const balanceFontWeight = subValue(c, "balance", "fontWeight", 700);
  const separatorColor = subValue(
    c,
    "separator",
    "background",
    subValue(c, "separator", "borderColor", borderColor),
  );
  const separatorWidth = subValue(c, "separator", "borderWidth", 1);
  const separatorOpacity = subValue(c, "separator", "opacity", 0.7);
  const bgColorRGB = colorToRgbString(bgColor);
  const bgColorSoft = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(
    String(bgColor || "").trim(),
  )
    ? `${bgColor}f2`
    : bgColor;
  const ctaColorRGB = colorToRgbString(sponsorAccentColor || ctaColor);

  // Only apply CSS filter when values differ from defaults — filter forces rasterisation
  // which degrades image sharpness and sub-pixel text rendering
  const needsFilter =
    brightness !== 100 || contrast !== 100 || saturation !== 100;
  const filterStr = needsFilter
    ? `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
    : "none";

  /* Use clipPath instead of overflow:hidden to avoid Chromium compositor
     black-corner artefact on GPU-promoted layers (OBS browser source). */
  const clipOuter = `inset(0 round ${borderRadius}px)`;

  const barOuter = buildNavbarBarOuterStyle({
    isStyleSeca,
    isMetal,
    isCarbon,
    isFuturistic,
    isGlass,
    isRetro,
    borderWidth,
    containerFontFamily,
    accentColor,
    bgColor,
    borderColor,
  });

  const barInner = buildNavbarBarInnerStyle({
    isStyleSeca,
    isMetal,
    isCarbon,
    isFuturistic,
    isGlass,
    isRetro,
    bgColor,
    bgColorRGB,
    bgColorSoft,
    accentColor,
    accentColorRGB,
    textColor,
    fontSize,
    containerPadding,
    containerShadow,
    containerGlow,
    containerBlur,
    widgetScale,
    needsFilter,
    filterStr,
  });

  const sep = buildNavbarSeparatorStyle({
    isMetalSurface,
    isGlass,
    isRetro,
    separatorWidth,
    separatorColor,
    separatorOpacity,
    barHeight,
    accentColor,
    accentColorRGB,
    mutedColor,
  });

  const barOuterSized = {
    ...barOuter,
    height: `${barHeight}px`,
    maxHeight: "100%",
    maxWidth: barMaxWidth != null ? `${barMaxWidth}px` : undefined,
    clipPath: clipOuter,
  };

  /* ─── Dynamic section layout ─── */
  const layout = (c.sectionLayout || DEFAULT_SECTION_LAYOUT).filter(
    (s) => s.id !== "socials",
  );
  const getZoneSections = (zone) => layout.filter((s) => s.zone === zone);

  const renderAvatar = () => {
    if (c.showAvatar === false) return null;
    const size =
      avatarImageSize || barHeight * 0.72 * ((c.avatarSize ?? 100) / 100);
    return (
      <div
        {...partAttrs("avatar")}
        style={withElementOffset(c, "avatar", {
          position: "relative",
          width: size,
          height: size,
          borderRadius: avatarRadius,
          border: avatarBorderWidth
            ? `${avatarBorderWidth}px solid ${avatarBorderColor}`
            : undefined,
          background: "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        })}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            {...partAttrs("avatar")}
            style={{
              width: "100%",
              height: "100%",
              borderRadius: avatarRadius,
              objectFit: avatarFit,
              background: "transparent",
              imageRendering: "auto",
              backfaceVisibility: "hidden",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: avatarRadius,
              background: "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: fontSize * 0.7,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: textColor,
              textShadow,
            }}
          >
            {(c.streamerName || "S").slice(0, 5)}
          </div>
        )}
      </div>
    );
  };

  const renderIdentitySection = () => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexShrink: 0,
      }}
    >
      {renderAvatar()}
      <div
        {...partAttrs("displayName")}
        style={withElementOffset(c, "displayName", {
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          lineHeight: 1.1,
        })}
      >
        <span
          style={{
            backgroundImage: resolveDisplayNameBackground({
              isMetalSurface,
              isGlass,
              isRetro,
              textColor,
              displayNameAccentColor,
              ctaColor,
              nameGradient: c.nameGradient,
            }),
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontFamily,
            fontSize: fontSize * 1.2,
            fontWeight,
            letterSpacing: resolveDisplayNameLetterSpacing({
              isMetalSurface,
              isRetro,
            }),
            textTransform: "uppercase",
            display: "block",
            maxWidth: "min(30vw, 420px)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {c.streamerName || "STREAMER"}
        </span>
        {c.motto && (
          <span
            style={{
              marginTop: 2,
              fontFamily,
              fontSize: mottoFontSize,
              fontWeight: mottoFontWeight,
              letterSpacing: resolveMottoLetterSpacing({
                isMetalSurface,
                isRetro,
              }),
              textTransform: "uppercase",
              color: mutedColor,
              textShadow,
            }}
          >
            {c.motto}
          </span>
        )}
      </div>
    </div>
  );

  const renderBadgeSection = () => {
    if (!badgeImageUrl) return null;
    return (
      <div
        {...partAttrs("badgeImage")}
        style={withElementOffset(c, "badgeImage", {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: barHeight,
          flexShrink: 0,
          padding: "2px 0",
        })}
      >
        <img
          src={badgeImageUrl}
          alt=""
          {...partAttrs("badgeImage")}
          style={{
            height:
              badgeImageSize || barHeight * 0.85 * ((c.badgeSize ?? 100) / 100),
            minWidth:
              badgeImageSize || barHeight * 1.2 * ((c.badgeSize ?? 100) / 100),
            objectFit: badgeImageFit,
            borderRadius: badgeImageRadius,
            filter: isMetalSurface
              ? `drop-shadow(0 0 6px rgba(${accentColorRGB},0.3)) brightness(1.05)`
              : "drop-shadow(0 0 8px rgba(255,255,255,0.3))",
          }}
        />
      </div>
    );
  };

  const renderClockSection = () => {
    if (c.showClock === false) return null;
    return (
      <div
        {...partAttrs("clock")}
        style={withElementOffset(
          c,
          "clock",
          buildNavbarClockStyle({
            isMetalSurface,
            isGlass,
            isRetro,
            clockRadius,
            clockPadding,
            clockBg,
            clockBorderWidth,
            clockBorderColor,
            clockTextColor,
            clockFontFamily,
            clockFontSize,
            clockFontWeight,
            clockShadow,
            accentColor,
            accentColorRGB,
          }),
        )}
      >
        {time || "--:--:--"}
      </div>
    );
  };

  const renderNowPlayingSection = () => {
    if (c.showNowPlaying === false || !displayNowPlaying) return null;
    return (
      <div
        {...partAttrs("music")}
        style={withElementOffset(c, "music", {
          display: "flex",
          alignItems: "center",
          minWidth: 0,
          width: "100%",
          maxWidth: "min(34vw, 380px)",
          flex: "1 1 220px",
          overflow: "hidden",
        })}
      >
        <NowPlayingDisplay
          data={displayNowPlaying}
          musicDisplayStyle={subValue(
            c,
            "music",
            "musicDisplayStyle",
            c.musicDisplayStyle || "text",
          )}
          textColor={textColor}
          mutedColor={mutedColor}
          accentColor={accentColor}
          fontSize={musicFontSize}
          fontFamily={musicFontFamily}
          fontWeight={musicFontWeight}
          isMetal={isMetalSurface}
          barHeight={barHeight}
        />
      </div>
    );
  };

  const renderCryptoSection = () => {
    if (!c.showCrypto || activeCoins.length === 0) return null;
    return (
      <div
        {...partAttrs("crypto")}
        style={withElementOffset(c, "crypto", {
          display: "flex",
          alignItems: "center",
          minWidth: 0,
          flexShrink: 0,
        })}
      >
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
          metallic={isMetalSurface || isGlass || isRetro}
        />
      </div>
    );
  };

  const renderCtaSection = () => {
    if (!c.showCTA || !c.ctaText) return null;
    return (
      <div
        {...partAttrs("sponsor")}
        style={withElementOffset(
          c,
          "sponsor",
          buildNavbarSponsorStyle({
            isStyleSeca,
            isMetal,
            isGlass,
            isRetro,
            sponsorRadius,
            sponsorPadding,
            sponsorBorderWidth,
            sponsorBorderColor,
            sponsorTextColor,
            sponsorFontFamily,
            sponsorFontSize,
            sponsorFontWeight,
            sponsorShadow,
            sponsorAccentColor,
            ctaColor,
            ctaColorRGB,
          }),
        )}
      >
        <span
          style={{
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {c.ctaText}
        </span>
      </div>
    );
  };

  const renderBalanceSection = () => {
    if (!c.showStartBalance || !c.startBalance) return null;
    return (
      <div
        {...partAttrs("balance")}
        style={withElementOffset(c, "balance", {
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontFamily: balanceFontFamily,
          fontSize: balanceFontSize,
          fontWeight: balanceFontWeight,
          color: balanceTextColor,
          letterSpacing: "0.1em",
          flexShrink: 0,
          textShadow,
        })}
      >
        <span
          style={{
            fontSize: balanceFontSize * 0.78,
            color: balanceMutedColor,
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            fontWeight: balanceFontWeight,
          }}
        >
          START
        </span>
        <span
          style={{
            fontWeight: Math.max(700, Number(balanceFontWeight) || 700),
            color: balanceAccentColor,
          }}
        >
          {c.balanceCurrency || "€"}
          {Number(c.startBalance).toLocaleString()}
        </span>
      </div>
    );
  };

  const renderCasinoSection = () => {
    if (!c.showCasino || (!c.casinoName && !casinoLogoUrl)) return null;
    return (
      <div
        {...partAttrs("casino")}
        style={withElementOffset(c, "casino", {
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
        })}
      >
        {casinoLogoUrl && (
          <img
            src={casinoLogoUrl}
            alt=""
            {...partAttrs("casino")}
            style={{
              height:
                casinoImageSize ||
                barHeight * 0.55 * ((c.casinoImageSize ?? 100) / 100),
              maxWidth: casinoImageSize
                ? casinoImageSize * 1.8
                : barHeight * 1.8 * ((c.casinoImageSize ?? 100) / 100),
              objectFit: casinoImageFit,
              borderRadius: casinoImageRadius,
              filter: isMetalSurface
                ? `drop-shadow(0 0 6px rgba(${accentColorRGB},0.2))`
                : "none",
            }}
          />
        )}
        {c.casinoName && (
          <span
            {...partAttrs("casino")}
            style={{
              fontFamily: casinoFontFamily,
              fontSize: casinoFontSize,
              fontWeight: casinoFontWeight,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: casinoTextColor,
              textShadow: resolveCasinoTextShadow({
                isMetalSurface,
                isRetro,
                accentColorRGB,
                accentColor,
              }),
            }}
          >
            {c.casinoName}
          </span>
        )}
      </div>
    );
  };

  const sectionRenderers = {
    identity: renderIdentitySection,
    badge: renderBadgeSection,
    clock: renderClockSection,
    nowPlaying: renderNowPlayingSection,
    crypto: renderCryptoSection,
    cta: renderCtaSection,
    socials: () => null,
    balance: renderBalanceSection,
    casino: renderCasinoSection,
  };

  const renderSection = (sectionId) => sectionRenderers[sectionId]?.() ?? null;

  const renderZone = (zone) => {
    const sections = getZoneSections(zone)
      .map((s) => ({ id: s.id, el: renderSection(s.id) }))
      .filter((s) => s.el);
    return sections.flatMap((s, i) =>
      i === 0
        ? [<React.Fragment key={s.id}>{s.el}</React.Fragment>]
        : [
            <div
              key={`sep-${s.id}`}
              {...partAttrs("separator")}
              style={withElementOffset(c, "separator", sep)}
            />,
            <React.Fragment key={s.id}>{s.el}</React.Fragment>,
          ],
    );
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        height: "100%",
      }}
    >
      <div {...partAttrs("container")} style={barOuterSized}>
        <div style={barInner}>
          {/* Metallic shine overlay */}
          {isMetalSurface && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(110deg, transparent 0%, rgba(255,255,255,0.015) 30%, rgba(255,255,255,0.04) 48%, rgba(255,255,255,0.015) 52%, transparent 70%)",
                pointerEvents: "none",
                zIndex: 0,
              }}
            />
          )}
          {isMetalSurface && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: barHeight * 0.45,
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.03), transparent)",
                pointerEvents: "none",
                zIndex: 0,
              }}
            />
          )}
          {/* Glass frost overlay */}
          {isGlass && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%, rgba(255,255,255,0.04) 100%)",
                pointerEvents: "none",
                zIndex: 0,
              }}
            />
          )}
          {/* Retro scanlines */}
          {isRetro && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)",
                pointerEvents: "none",
                zIndex: 0,
              }}
            />
          )}

          {/* ─── Left Zone ─── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              paddingRight: 10,
              flexShrink: 0,
              position: "relative",
              zIndex: 1,
            }}
          >
            {renderZone("left")}
          </div>

          {/* ─── Center Zone ─── */}
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              minWidth: 0,
              position: "relative",
              zIndex: 1,
            }}
          >
            {renderZone("center")}
          </div>

          {/* ─── Right Zone ─── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              paddingLeft: 10,
              flexShrink: 0,
              position: "relative",
              zIndex: 1,
            }}
          >
            {renderZone("right")}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Single Crypto Coin — plain text, no card ─── */
function CryptoCoin({
  coin,
  price,
  fontSize,
  bgColor,
  textColor,
  fontFamily,
  fontWeight,
  cryptoUpColor,
  cryptoDownColor,
  metallic,
  style,
}) {
  const isUp = price.change >= 0;
  const changeColor = isUp ? cryptoUpColor : cryptoDownColor;
  const logoUrl = CRYPTO_LOGOS[coin];
  const logoSize = 30;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: fontSize * 0.95,
        fontFamily,
        flexShrink: 0,
        ...style,
      }}
    >
      {/* Coin logo */}
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={coin}
          style={{
            width: logoSize,
            height: logoSize,
            borderRadius: "50%",
            objectFit: "cover",
            flexShrink: 0,
            imageRendering: "auto",
            backfaceVisibility: "hidden",
          }}
        />
      ) : (
        <div
          style={{
            width: logoSize,
            height: logoSize,
            borderRadius: "50%",
            background: `linear-gradient(135deg, #6366f1, #64748b)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: fontSize * 0.9,
            fontWeight: 900,
            color: "#fff",
          }}
        >
          {CRYPTO_SYMBOLS[coin] || coin[0].toUpperCase()}
        </div>
      )}
      <div
        style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}
      >
        <span
          style={{
            fontWeight,
            color: textColor,
            display: "flex",
            alignItems: "center",
            gap: 4,
            letterSpacing: "0.04em",
            textShadow: "0 1px 4px rgba(0,0,0,0.6)",
          }}
        >
          {coin.toUpperCase()}
          <span style={{ color: changeColor, fontSize: fontSize * 0.85 }}>
            {isUp ? "▲" : "▼"}
          </span>
        </span>
        <span
          style={{
            fontSize: fontSize * 0.88,
            color: changeColor,
            opacity: 0.95,
            fontWeight,
            textShadow: "0 1px 4px rgba(0,0,0,0.6)",
          }}
        >
          $
          {price.price?.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{" "}
          <span style={{ fontWeight }}>
            {isUp ? "+" : ""}
            {price.change?.toFixed(2)}%
          </span>
        </span>
      </div>
    </div>
  );
}

/* ─── Crypto Ticker with display modes ─── */
function CryptoTicker({
  coins,
  prices,
  mode,
  index,
  fading,
  fontSize,
  bgColor,
  textColor,
  fontFamily,
  fontWeight,
  cryptoUpColor,
  cryptoDownColor,
  metallic,
}) {
  const safeIdx = index % coins.length;
  const coin = coins[safeIdx];

  /* Fixed-width wrapper prevents layout shift when coins cycle */
  const tickerStyle = {
    position: "relative",
    minWidth: 180,
    overflow: "hidden",
  };

  /* Use translate3d for GPU-accelerated compositing — prevents blur during transitions */
  const animStyle = buildCryptoTickerAnimationStyle(mode, fading);

  return (
    <div style={tickerStyle}>
      <div style={animStyle}>
        <CryptoCoin
          coin={coin}
          price={prices[coin]}
          fontSize={fontSize}
          bgColor={bgColor}
          textColor={textColor}
          fontFamily={fontFamily}
          fontWeight={fontWeight}
          cryptoUpColor={cryptoUpColor}
          cryptoDownColor={cryptoDownColor}
          metallic={metallic}
        />
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
        setShouldScroll(
          textRef.current.scrollWidth > containerRef.current.clientWidth + 2,
        );
      }
    };
    check();
    // Re-check when text changes
    const raf = requestAnimationFrame(check);
    return () => cancelAnimationFrame(raf);
  }, [text]);

  const duration = Math.max((text || "").length * 0.28, 4);

  return (
    <div
      ref={containerRef}
      style={{
        minWidth: 0,
        maxWidth: "100%",
        ...style,
        overflow: "hidden",
        whiteSpace: "nowrap",
        textOverflow: shouldScroll ? "unset" : "ellipsis",
      }}
    >
      <span
        ref={textRef}
        style={{
          display: "inline-block",
          animation: shouldScroll
            ? `nbTextScroll ${duration}s linear infinite`
            : "none",
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
function NowPlayingDisplay({
  data,
  musicDisplayStyle,
  fontSize,
  textColor,
  mutedColor,
  accentColor,
  fontFamily,
  fontWeight,
  isMetal,
  barHeight,
}) {
  const typography = { fontFamily, fontWeight };
  const content = (() => {
    switch (musicDisplayStyle) {
      case "pill":
        return (
          <NowPlayingPill
            data={data}
            fontSize={fontSize}
            textColor={textColor}
            mutedColor={mutedColor}
            accentColor={accentColor}
            isMetal={isMetal}
            barHeight={barHeight}
            {...typography}
          />
        );
      case "marquee":
        return (
          <NowPlayingMarquee
            data={data}
            fontSize={fontSize}
            textColor={textColor}
            mutedColor={mutedColor}
            accentColor={accentColor}
            {...typography}
          />
        );
      case "albumart":
        return (
          <NowPlayingAlbumArt
            data={data}
            fontSize={fontSize}
            textColor={textColor}
            mutedColor={mutedColor}
            accentColor={accentColor}
            isMetal={isMetal}
            barHeight={barHeight}
            {...typography}
          />
        );
      case "equalizer":
        return (
          <NowPlayingEqualizer
            data={data}
            fontSize={fontSize}
            textColor={textColor}
            mutedColor={mutedColor}
            accentColor={accentColor}
            {...typography}
          />
        );
      case "vinyl":
        return (
          <NowPlayingVinyl
            data={data}
            fontSize={fontSize}
            textColor={textColor}
            mutedColor={mutedColor}
            accentColor={accentColor}
            barHeight={barHeight}
            {...typography}
          />
        );
      case "minimal":
        return (
          <NowPlayingMinimal
            data={data}
            fontSize={fontSize}
            textColor={textColor}
            mutedColor={mutedColor}
            accentColor={accentColor}
            {...typography}
          />
        );
      case "wave":
        return (
          <NowPlayingWave
            data={data}
            fontSize={fontSize}
            textColor={textColor}
            mutedColor={mutedColor}
            accentColor={accentColor}
            barHeight={barHeight}
            {...typography}
          />
        );
      case "text":
      default:
        return (
          <NowPlayingText
            data={data}
            fontSize={fontSize}
            textColor={textColor}
            mutedColor={mutedColor}
            {...typography}
          />
        );
    }
  })();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        minWidth: 0,
        width: "100%",
        maxWidth: "100%",
        overflow: "hidden",
      }}
    >
      {content}
    </div>
  );
}

/* Style 1: Text (original) */
function NowPlayingText({
  data,
  fontSize,
  textColor,
  mutedColor,
  fontFamily,
  fontWeight,
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        minWidth: 160,
        maxWidth: 300,
        overflow: "hidden",
        fontFamily,
      }}
    >
      <span
        style={{
          fontSize: fontSize * 0.85,
          fontWeight,
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          color: mutedColor,
          textShadow: "0 1px 4px rgba(0,0,0,0.6)",
        }}
      >
        Now Playing
      </span>
      <ScrollText
        text={data.artist}
        style={{
          fontSize: fontSize * 0.95,
          fontWeight,
          color: textColor,
          textShadow: "0 1px 4px rgba(0,0,0,0.6)",
        }}
      />
      <ScrollText
        text={data.track}
        style={{
          fontSize: fontSize * 1.1,
          fontWeight,
          letterSpacing: "0.04em",
          color: textColor,
          textShadow: "0 1px 4px rgba(0,0,0,0.6)",
        }}
      />
    </div>
  );
}

/* Style 2: Pill — compact with album art, transparent */
function NowPlayingPill({
  data,
  fontSize,
  textColor,
  mutedColor,
  accentColor,
  fontFamily,
  fontWeight,
  isMetal,
  barHeight,
}) {
  const h = barHeight * 0.65;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        maxWidth: 320,
        overflow: "hidden",
        fontFamily,
      }}
    >
      {data.albumArt ? (
        <img
          src={data.albumArt}
          alt=""
          style={{
            width: h,
            height: h,
            borderRadius: isMetal ? 7 : h / 2,
            objectFit: "cover",
            flexShrink: 0,
          }}
        />
      ) : (
        <div
          style={{
            width: h,
            height: h,
            borderRadius: isMetal ? 7 : h / 2,
            background: `${accentColor}33`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: h * 0.5,
            flexShrink: 0,
          }}
        >
          🎵
        </div>
      )}
      <div style={{ minWidth: 0, flex: 1 }}>
        <ScrollText
          text={data.track}
          style={{
            fontSize: fontSize * 1,
            fontWeight,
            color: textColor,
            textShadow: "0 1px 4px rgba(0,0,0,0.6)",
          }}
        />
        <ScrollText
          text={data.artist}
          style={{
            fontSize: fontSize * 0.85,
            color: mutedColor,
            fontWeight,
            textShadow: "0 1px 4px rgba(0,0,0,0.6)",
          }}
        />
      </div>
    </div>
  );
}

/* Style 3: Marquee — scrolling ticker */
function NowPlayingMarquee({
  data,
  fontSize,
  textColor,
  mutedColor,
  accentColor,
  fontFamily,
  fontWeight,
}) {
  const text = `♫ ${data.track}  —  ${data.artist}  `;
  return (
    <div
      style={{
        minWidth: 160,
        maxWidth: 320,
        overflow: "hidden",
        position: "relative",
        fontFamily,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 2,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: data.isPlaying ? accentColor : "#666",
            boxShadow: data.isPlaying ? `0 0 6px ${accentColor}` : "none",
            animation: data.isPlaying
              ? "spotifyPulse 1.5s ease-in-out infinite"
              : "none",
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: fontSize * 0.82,
            color: mutedColor,
            textTransform: "uppercase",
            letterSpacing: "0.2em",
            fontWeight,
            textShadow: "0 1px 4px rgba(0,0,0,0.6)",
          }}
        >
          Now Playing
        </span>
      </div>
      <div style={{ overflow: "hidden", whiteSpace: "nowrap" }}>
        <span
          className="nb-marquee-scroll"
          style={{
            display: "inline-block",
            fontSize: fontSize * 1.05,
            fontWeight,
            color: textColor,
            textShadow: "0 1px 4px rgba(0,0,0,0.6)",
            animation: data.isPlaying
              ? "nbMarquee 12s linear infinite"
              : "none",
            paddingRight: 60,
          }}
        >
          {text}
          {text}
        </span>
      </div>
    </div>
  );
}

/* Style 4: Album Art — prominent art with info */
function NowPlayingAlbumArt({
  data,
  fontSize,
  textColor,
  mutedColor,
  accentColor,
  fontFamily,
  fontWeight,
  isMetal,
  barHeight,
}) {
  const sz = barHeight * 0.72;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        maxWidth: 340,
        overflow: "hidden",
        fontFamily,
      }}
    >
      {data.albumArt ? (
        <div
          style={{
            width: sz,
            height: sz,
            borderRadius: isMetal ? 10 : 8,
            overflow: "hidden",
            flexShrink: 0,
            boxShadow: `0 0 16px ${accentColor}33`,
            border: `1px solid ${accentColor}44`,
          }}
        >
          <img
            src={data.albumArt}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      ) : (
        <div
          style={{
            width: sz,
            height: sz,
            borderRadius: isMetal ? 10 : 8,
            flexShrink: 0,
            background: `${accentColor}22`,
            border: `1px solid ${accentColor}44`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: sz * 0.5,
          }}
        >
          🎵
        </div>
      )}
      <div
        style={{
          minWidth: 0,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <ScrollText
          text={data.track}
          style={{
            fontSize: fontSize * 1.1,
            fontWeight,
            color: textColor,
            textShadow: "0 1px 4px rgba(0,0,0,0.6)",
          }}
        />
        <ScrollText
          text={data.artist}
          style={{
            fontSize: fontSize * 0.88,
            color: mutedColor,
            marginTop: 1,
            fontWeight,
            textShadow: "0 1px 4px rgba(0,0,0,0.6)",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            marginTop: 3,
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 2.5,
                borderRadius: 1,
                background: accentColor,
                animation: data.isPlaying
                  ? `spotifyEq ${0.35 + i * 0.1}s ease-in-out infinite alternate`
                  : "none",
                height: data.isPlaying ? undefined : 3,
              }}
            />
          ))}
          <span
            style={{
              fontSize: fontSize * 0.78,
              color: `${accentColor}cc`,
              marginLeft: 3,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              fontWeight,
              textShadow: "0 1px 4px rgba(0,0,0,0.6)",
            }}
          >
            {data.isPlaying ? "Live" : "Paused"}
          </span>
        </div>
      </div>
    </div>
  );
}

/* Style 5: Equalizer — animated bars + info */
function NowPlayingEqualizer({
  data,
  fontSize,
  textColor,
  mutedColor,
  accentColor,
  fontFamily,
  fontWeight,
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        minWidth: 160,
        maxWidth: 320,
        overflow: "hidden",
        fontFamily,
      }}
    >
      {/* Eq bars */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 2,
          height: 16,
          flexShrink: 0,
        }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              width: 3,
              borderRadius: 1.5,
              background: `linear-gradient(to top, ${accentColor}, ${accentColor}66)`,
              animation: data.isPlaying
                ? `spotifyEq ${0.3 + i * 0.12}s ease-in-out infinite alternate`
                : "none",
              animationDelay: `${i * 0.08}s`,
              height: data.isPlaying ? undefined : 4,
            }}
          />
        ))}
      </div>
      {/* Info */}
      <div style={{ minWidth: 0, flex: 1 }}>
        <ScrollText
          text={data.track}
          style={{
            fontSize: fontSize * 1.05,
            fontWeight,
            color: textColor,
            textShadow: "0 1px 4px rgba(0,0,0,0.6)",
          }}
        />
        <ScrollText
          text={data.artist}
          style={{
            fontSize: fontSize * 0.88,
            color: accentColor,
            fontWeight,
            textShadow: "0 1px 4px rgba(0,0,0,0.6)",
          }}
        />
      </div>
    </div>
  );
}

/* Style 6: Vinyl — spinning record disc, no background */
function NowPlayingVinyl({
  data,
  fontSize,
  textColor,
  mutedColor,
  accentColor,
  fontFamily,
  fontWeight,
  barHeight,
}) {
  const sz = barHeight * 0.72;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        maxWidth: 340,
        overflow: "hidden",
        fontFamily,
      }}
    >
      {/* Spinning disc */}
      <div
        style={{
          width: sz,
          height: sz,
          borderRadius: "50%",
          flexShrink: 0,
          background: data.albumArt
            ? `url(${data.albumArt}) center/cover`
            : `radial-gradient(circle at 50% 50%, ${accentColor}44 0%, #111 40%, #222 60%, ${accentColor}22 100%)`,
          border: `2px solid ${accentColor}66`,
          boxShadow: `0 0 10px ${accentColor}33`,
          animation: data.isPlaying
            ? "nbVinylSpin 3s linear infinite"
            : "nbVinylSpin 8s linear infinite",
          position: "relative",
        }}
      >
        {/* Center hole */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            width: sz * 0.22,
            height: sz * 0.22,
            borderRadius: "50%",
            background: "#111",
            border: `1.5px solid ${accentColor}55`,
          }}
        />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <ScrollText
          text={data.track}
          style={{
            fontSize: fontSize * 1.1,
            fontWeight,
            color: textColor,
            textShadow: "0 1px 4px rgba(0,0,0,0.6)",
          }}
        />
        <ScrollText
          text={data.artist}
          style={{
            fontSize: fontSize * 0.88,
            color: mutedColor,
            marginTop: 1,
            fontWeight,
            textShadow: "0 1px 4px rgba(0,0,0,0.6)",
          }}
        />
      </div>
    </div>
  );
}

/* Style 7: Minimal — just an icon + single line, no background */
function NowPlayingMinimal({
  data,
  fontSize,
  textColor,
  mutedColor,
  accentColor,
  fontFamily,
  fontWeight,
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        maxWidth: 320,
        overflow: "hidden",
        fontFamily,
      }}
    >
      <span
        style={{
          fontSize: fontSize * 1.1,
          color: accentColor,
          flexShrink: 0,
          animation: data.isPlaying
            ? "spotifyPulse 1.8s ease-in-out infinite"
            : "none",
        }}
      >
        ♫
      </span>
      <ScrollText
        text={data.track}
        style={{
          fontSize: fontSize * 1,
          fontWeight,
          color: textColor,
          flex: 1,
          minWidth: 0,
          textShadow: "0 1px 4px rgba(0,0,0,0.6)",
        }}
      />
      <span
        style={{
          fontSize: fontSize * 0.85,
          color: mutedColor,
          flexShrink: 0,
          textShadow: "0 1px 4px rgba(0,0,0,0.6)",
        }}
      >
        —
      </span>
      <ScrollText
        text={data.artist}
        style={{
          fontSize: fontSize * 0.88,
          color: mutedColor,
          flex: 1,
          minWidth: 0,
          fontWeight,
          textShadow: "0 1px 4px rgba(0,0,0,0.6)",
        }}
      />
    </div>
  );
}

/* Style 8: Wave — sound wave animation + info, no background */
function NowPlayingWave({
  data,
  fontSize,
  textColor,
  mutedColor,
  accentColor,
  fontFamily,
  fontWeight,
  barHeight,
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        maxWidth: 320,
        overflow: "hidden",
        fontFamily,
      }}
    >
      {/* Wave bars */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          height: 26,
          flexShrink: 0,
        }}
      >
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            style={{
              width: 2.5,
              borderRadius: 2,
              background: accentColor,
              opacity: 0.5 + (i % 3) * 0.2,
              animation: data.isPlaying
                ? `nbWaveBar ${0.4 + i * 0.08}s ease-in-out ${i * 0.05}s infinite alternate`
                : "none",
              height: data.isPlaying ? undefined : 3,
            }}
          />
        ))}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <ScrollText
          text={data.track}
          style={{
            fontSize: fontSize * 1.05,
            fontWeight,
            color: textColor,
            textShadow: "0 1px 4px rgba(0,0,0,0.6)",
          }}
        />
        <ScrollText
          text={data.artist}
          style={{
            fontSize: fontSize * 0.88,
            color: mutedColor,
            fontWeight,
            textShadow: "0 1px 4px rgba(0,0,0,0.6)",
          }}
        />
      </div>
    </div>
  );
}

/* ─── Hex to RGB helper ─── */
function hexToRgb(hex) {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

export default React.memo(NavbarWidget);
