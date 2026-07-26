import React, { useEffect, useMemo, useState } from "react";
import SlotImage from "../SlotImage";
import {
  appearanceAttrs,
  subElementStyle,
  subValue,
} from "./appearanceStyles";

function attrs(widgetType, config, elementId, stateId) {
  return {
    "data-appearance-part": elementId,
    ...appearanceAttrs({ config, widgetType, elementId, stateId }),
  };
}

function numberValue(value, fallback = 0) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function cssPx(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback === undefined ? undefined : cssPx(fallback);
  }
  if (typeof value === "number") return `${value}px`;
  return value;
}

function alphaColor(value, opacity) {
  const raw = String(value || "").trim();
  const hex = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(raw);
  if (!hex) {
    if (/^rgba?\(/i.test(raw)) return raw;
    return `rgba(59,130,246,${opacity})`;
  }
  const full =
    hex[1].length === 3
      ? hex[1]
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : hex[1];
  const int = Number.parseInt(full, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r},${g},${b},${opacity})`;
}

function formatCompactNumber(value, fallback = "0") {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return number.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatMoney(value, currency = "EUR") {
  const number = Number(value) || 0;
  return `${currency}${number.toLocaleString(undefined, {
    minimumFractionDigits: number % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatMultiplier(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return "-";
  return `${number.toLocaleString(undefined, { maximumFractionDigits: 0 })}x`;
}

function initials(value) {
  const source = String(value || "SC").trim();
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function betOptionLabel(option, index) {
  if (typeof option === "string") return option;
  return option?.label || option?.name || `Option ${index + 1}`;
}

function bonusSlotName(bonus, index) {
  return (
    bonus?.slotName ||
    bonus?.slot_name ||
    bonus?.slot?.name ||
    bonus?.name ||
    bonus?.title ||
    `Bonus ${index + 1}`
  );
}

function bonusProvider(bonus) {
  return (
    bonus?.slot?.provider ||
    bonus?.slot?.provider_name ||
    bonus?.provider ||
    bonus?.providerName ||
    bonus?.provider_name ||
    ""
  );
}

function bonusImage(bonus) {
  return (
    bonus?.image ||
    bonus?.imageUrl ||
    bonus?.image_url ||
    bonus?.slotImage ||
    bonus?.slotImageUrl ||
    bonus?.slot_image_url ||
    bonus?.cover ||
    bonus?.coverUrl ||
    bonus?.thumbnail ||
    bonus?.slot?.image ||
    bonus?.slot?.imageUrl ||
    bonus?.slot?.image_url ||
    bonus?.slot?.cover ||
    ""
  );
}

function bonusTier(bonus) {
  const raw = String(
    bonus?.bonusType ||
      bonus?.bonus_type ||
      bonus?.type ||
      bonus?.slot?.bonusType ||
      "",
  ).toLowerCase();
  if (bonus?.isExtremeBonus || raw.includes("extreme")) return "extreme";
  if (bonus?.isSuperBonus || raw.includes("super") || raw.includes("supreme")) return "super";
  return "normal";
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function metricNumber(value, fallback = 0) {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string") {
    const normalized = value.replace(",", ".").replace(/[^0-9.-]/g, "");
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function firstMetric(values, fallback = 0) {
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;
    const parsed = metricNumber(value, Number.NaN);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function bonusBet(bonus) {
  return firstMetric([
    bonus?.betSize,
    bonus?.bet_size,
    bonus?.bet,
    bonus?.stake,
    bonus?.amount,
  ]);
}

function bonusPayout(bonus) {
  return firstMetric([
    bonus?.payout,
    bonus?.pay,
    bonus?.win,
    bonus?.winAmount,
    bonus?.win_amount,
    bonus?.result,
  ]);
}

function bonusOpened(bonus) {
  return Boolean(
    bonus?.opened ||
      bonus?.isOpened ||
      bonus?.status === "opened" ||
      bonus?.state === "opened" ||
      bonus?.payout !== undefined ||
      bonus?.result !== undefined,
  );
}

function bonusRtp(bonus) {
  const value =
    bonus?.rtp ??
    bonus?.slotRtp ??
    bonus?.slot_rtp ??
    bonus?.slot?.rtp ??
    bonus?.slot?.slotRtp;
  if (value === undefined || value === null || value === "") return "-";
  return typeof value === "number" ? `${value}%` : String(value);
}

function bonusVolatility(bonus) {
  return (
    bonus?.volatility ||
    bonus?.slotVolatility ||
    bonus?.slot_volatility ||
    bonus?.slot?.volatility ||
    "Medium"
  );
}

function bonusMaxWin(bonus) {
  return (
    bonus?.maxWin ||
    bonus?.slotMaxWin ||
    bonus?.slot_max_win ||
    bonus?.slot?.maxWin ||
    bonus?.slot?.max_win ||
    "-"
  );
}

function bonusMultiplierValue(bonus) {
  const explicit = firstMetric([
    bonus?.multiplier,
    bonus?.multi,
    bonus?.x,
    bonus?.bonusMultiplier,
  ], Number.NaN);
  if (Number.isFinite(explicit)) return explicit;
  const bet = bonusBet(bonus);
  return bet > 0 ? bonusPayout(bonus) / bet : 0;
}

const BETTER_HUNT_THEMES = {
  ocean: {
    panelHi: "#0c1c40",
    panelMid: "#0a1734",
    panelLo: "#081228",
    inset: "#071022",
    track: "#0e1a3a",
    cardHi: "#0d2049",
    cardLo: "#0a1836",
    line: "#173670",
    lineHi: "#2f63c9",
    lineMid: "#2a55ad",
    steel: "#6d8cc4",
    steelDim: "#4f6da5",
    steelHi: "#9dbdf2",
    ice: "#45c8ff",
    iceDeep: "#1e5ad6",
    iceMid: "#4aa0ff",
    glowA: "#123a9e",
    glowB: "#0a2a78",
  },
  emerald: {
    panelHi: "#07321f",
    panelMid: "#062719",
    panelLo: "#06140d",
    inset: "#04110b",
    track: "#0c2619",
    cardHi: "#0b3b25",
    cardLo: "#082117",
    line: "#17613e",
    lineHi: "#2ed991",
    lineMid: "#1b9f68",
    steel: "#78c6a2",
    steelDim: "#4c8f70",
    steelHi: "#b1f7d4",
    ice: "#35f0a5",
    iceDeep: "#0b8a5a",
    iceMid: "#58e7a7",
    glowA: "#0a7a48",
    glowB: "#064b2e",
  },
  crimson: {
    panelHi: "#3a0c15",
    panelMid: "#26080f",
    panelLo: "#180509",
    inset: "#140407",
    track: "#2b0b12",
    cardHi: "#42101b",
    cardLo: "#25070d",
    line: "#7d1c30",
    lineHi: "#ff5470",
    lineMid: "#b8304a",
    steel: "#d08a98",
    steelDim: "#a16070",
    steelHi: "#ffd0d8",
    ice: "#ff5470",
    iceDeep: "#ad1830",
    iceMid: "#ff7f96",
    glowA: "#9b1830",
    glowB: "#620d1e",
  },
  violet: {
    panelHi: "#21113f",
    panelMid: "#160c2b",
    panelLo: "#0a0716",
    inset: "#080511",
    track: "#1a1230",
    cardHi: "#28184a",
    cardLo: "#140c27",
    line: "#51348d",
    lineHi: "#a97bff",
    lineMid: "#7550c9",
    steel: "#a68bd0",
    steelDim: "#735b9f",
    steelHi: "#ddceff",
    ice: "#a97bff",
    iceDeep: "#5634bd",
    iceMid: "#c09aff",
    glowA: "#5a2fa7",
    glowB: "#331d68",
  },
  gold: {
    panelHi: "#33270a",
    panelMid: "#211905",
    panelLo: "#0d0a03",
    inset: "#100c03",
    track: "#241a05",
    cardHi: "#3a2a0a",
    cardLo: "#1e1504",
    line: "#7a5b16",
    lineHi: "#ffc93d",
    lineMid: "#bc8a25",
    steel: "#d7b667",
    steelDim: "#9f7f37",
    steelHi: "#ffe8a3",
    ice: "#ffc93d",
    iceDeep: "#a66a00",
    iceMid: "#ffdf72",
    glowA: "#96670d",
    glowB: "#5e3d06",
  },
};

const BETTER_HUNT_FONTS = {
  rajdhani: "'Rajdhani', 'Nunito', sans-serif",
  orbitron: "'Orbitron', sans-serif",
  chakra: "'Chakra Petch', sans-serif",
};

const BETTER_HUNT_ROW_HEIGHT = {
  compact: 58,
  image: 106,
  names: 38,
};

function useBetterHuntCarousel(count, intervalMs, enabled, seed = 0) {
  const [active, setActive] = useState(Math.max(0, seed));

  useEffect(() => {
    if (count <= 0) {
      setActive(0);
      return;
    }
    setActive(Math.min(Math.max(0, seed), count - 1));
  }, [count, seed]);

  useEffect(() => {
    if (!enabled || count < 2) return undefined;
    const delay = Math.max(1000, Number(intervalMs) || 3200);
    const id = setInterval(() => {
      setActive((value) => (value + 1) % count);
    }, delay);
    return () => clearInterval(id);
  }, [count, enabled, intervalMs]);

  return count ? active % count : 0;
}

function BetterHuntThumb({ bonus, size = 44, className = "" }) {
  const tier = bonusTier(bonus);
  const image = bonusImage(bonus);
  const fill = className.includes("better-hunt-card-img");
  if (image) {
    return (
      <SlotImage
        src={image}
        alt={bonusSlotName(bonus, 0)}
        className={className}
        style={{
          width: fill ? "100%" : size,
          height: fill ? "100%" : size,
          borderRadius: fill ? 0 : 6,
        }}
      />
    );
  }
  return (
    <span
      className={`better-hunt-thumb better-hunt-thumb--${tier} ${className}`}
      style={{ width: fill ? "100%" : size, height: fill ? "100%" : size }}
      aria-hidden="true"
    >
      {tier === "extreme" ? "EX" : tier === "super" ? "S" : "BH"}
    </span>
  );
}

function BetterStyleSheet() {
  return (
    <style>{`
      @keyframes better-soft-pulse{0%,100%{opacity:.72;transform:scale(1)}50%{opacity:1;transform:scale(1.04)}}
      @keyframes better-sheen{0%{transform:translateX(-120%)}100%{transform:translateX(120%)}}
      @keyframes better-rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      @keyframes better-float{0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(var(--float-x,12px),var(--float-y,-10px),0)}}
      @keyframes better-hunt-marquee-up{from{transform:translateY(0)}to{transform:translateY(-50%)}}
      @keyframes better-hunt-marquee-left{from{transform:translateX(0)}to{transform:translateX(-50%)}}
      @keyframes better-hunt-marquee-right{from{transform:translateX(-50%)}to{transform:translateX(0)}}
      @keyframes better-hunt-kenburns{from{transform:scale(1.02)}to{transform:scale(1.14) translate(1.5%,-1.5%)}}
      @keyframes better-hunt-cloak{0%,100%{filter:blur(1px) brightness(.65) contrast(1.2) saturate(.3);opacity:.44}50%{filter:blur(2.5px) brightness(.9) contrast(.95) saturate(.1);opacity:.28}}
      @keyframes better-hunt-gold{0%,100%{box-shadow:0 0 16px rgba(255,190,40,.45),0 0 32px rgba(255,160,20,.25),inset 0 0 10px rgba(255,210,40,.3);border-color:#ffd23d}50%{box-shadow:0 0 26px rgba(255,210,50,.65),0 0 46px rgba(255,180,30,.45),inset 0 0 16px rgba(255,230,50,.5);border-color:#ffea7a}}
      .better-hunt-root{position:relative;width:100%;height:100%;min-width:0;min-height:0;display:grid;place-items:center;overflow:hidden;background:#04091a;color:#eef6ff;font-family:var(--bh-font);font-size:calc(13px * var(--bh-ui,1));box-sizing:border-box}
      .better-hunt-root *{box-sizing:border-box}
      .better-hunt-root::before,.better-hunt-root::after{content:"";position:absolute;pointer-events:none;border-radius:999px;filter:blur(42px);opacity:.56}
      .better-hunt-root::before{width:44%;height:38%;left:-12%;top:-10%;background:color-mix(in srgb,var(--bh-glow-a) 72%,transparent);animation:better-float calc(14s / var(--anim-speed,1)) ease-in-out infinite}
      .better-hunt-root::after{width:48%;height:42%;right:-14%;bottom:-12%;background:color-mix(in srgb,var(--bh-glow-b) 68%,transparent);--float-x:-16px;--float-y:12px;animation:better-float calc(18s / var(--anim-speed,1)) ease-in-out infinite}
      .better-hunt-shell{position:relative;z-index:1;width:100%;height:100%;display:grid;place-items:center;padding:18px}
      .better-hunt-root[data-orientation="vertical"] .better-hunt-shell{align-items:center}
      .better-hunt-panel{position:relative;width:100%;overflow:hidden;border:1px solid color-mix(in srgb,var(--bh-line-hi) 55%,transparent);border-radius:14px;background:linear-gradient(180deg,var(--bh-panel-hi) 0%,var(--bh-panel-mid) 55%,var(--bh-panel-lo) 100%);box-shadow:0 0 0 1px rgba(0,0,0,.55),0 0 22px color-mix(in srgb,var(--bh-glow-a) 42%,transparent),0 0 70px color-mix(in srgb,var(--bh-glow-b) 26%,transparent),inset 0 1px 0 color-mix(in srgb,var(--bh-steel-hi) 12%,transparent)}
      .better-hunt-panel::after{content:"";position:absolute;inset:0;z-index:5;pointer-events:none;border-radius:inherit}
      .better-hunt-root[data-finish="flat"] .better-hunt-panel::after{content:none}
      .better-hunt-root[data-finish="metallic"] .better-hunt-panel::after{background:repeating-linear-gradient(100deg,rgba(255,255,255,.028) 0 1px,transparent 1px 3px),linear-gradient(155deg,rgba(255,255,255,.09) 0%,rgba(255,255,255,.02) 22%,transparent 40%,rgba(255,255,255,.04) 78%,transparent 100%)}
      .better-hunt-root[data-finish="gloss"] .better-hunt-panel::after{background:linear-gradient(180deg,rgba(255,255,255,.12) 0%,rgba(255,255,255,.035) 26%,transparent 52%)}
      .better-hunt-root[data-finish="matte"] .better-hunt-panel::after{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E");opacity:.05;mix-blend-mode:overlay}
      .better-hunt-root[data-finish="gradient"] .better-hunt-panel::after{background:linear-gradient(140deg,color-mix(in srgb,var(--bh-ice) 7%,transparent) 0%,transparent 38%,color-mix(in srgb,var(--bh-ice-deep) 10%,transparent) 92%)}
      .better-hunt-vertical{max-width:402px;display:grid;grid-template-rows:auto auto auto minmax(0,1fr) auto auto;gap:10px;padding:12px}
      .better-hunt-horizontal{max-width:1080px;height:min(100%,488px);display:grid;grid-template-columns:minmax(360px,460px) minmax(0,1fr)}
      .better-hunt-left{display:grid;grid-template-rows:auto auto auto minmax(0,1fr) auto;gap:10px;padding:12px;border-right:1px solid rgba(255,255,255,.08);min-width:0}
      .better-hunt-right{display:grid;grid-template-rows:auto minmax(0,1fr);min-width:0}
      .better-hunt-header{display:flex;align-items:center;justify-content:space-between;gap:10px;min-width:0}
      .better-hunt-brand{display:flex;align-items:center;gap:8px;min-width:0}
      .better-hunt-avatar{width:var(--bh-avatar);height:var(--bh-avatar);display:grid;place-items:center;flex:0 0 auto;overflow:hidden;border:1px solid color-mix(in srgb,var(--bh-line-hi) 70%,transparent);border-radius:50%;background:radial-gradient(circle at 30% 20%,color-mix(in srgb,var(--bh-ice) 45%,transparent),var(--bh-inset));color:#fff;font-size:10px;font-weight:900;box-shadow:0 1px 8px rgba(0,0,0,.5)}
      .better-hunt-avatar img{width:100%;height:100%;display:block;object-fit:cover}
      .better-hunt-title{min-width:0}
      .better-hunt-title strong{display:block;overflow:hidden;color:#fff;font-size:1.08em;font-weight:900;line-height:1;text-overflow:ellipsis;text-transform:uppercase;white-space:nowrap}
      .better-hunt-title span,.better-hunt-eyebrow,.better-hunt-stat-label,.better-hunt-row-label,.better-hunt-mini-label{color:var(--bh-steel-dim);font-size:.64em;font-weight:900;letter-spacing:.16em;line-height:1.2;text-transform:uppercase}
      .better-hunt-pill{display:inline-flex;align-items:center;gap:6px;flex:0 0 auto;border:1px solid color-mix(in srgb,var(--bh-line-hi) 62%,transparent);border-radius:999px;background:color-mix(in srgb,var(--bh-ice) 10%,transparent);color:var(--bh-ice);padding:5px 8px;font-size:.76em;font-weight:900;line-height:1}
      .better-hunt-dot{width:6px;height:6px;border-radius:50%;background:currentColor;box-shadow:0 0 8px currentColor}
      .better-hunt-divider{height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.16),transparent)}
      .better-hunt-stat-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}
      .better-hunt-stat{min-width:0;min-height:66px;display:grid;align-content:center;gap:5px;border:1px solid color-mix(in srgb,var(--bh-line-hi) 60%,transparent);border-radius:7px;background:linear-gradient(180deg,var(--bh-card-hi) 0%,var(--bh-card-lo) 100%);padding:8px 6px;text-align:center;box-shadow:inset 0 1px 0 color-mix(in srgb,var(--bh-steel-hi) 10%,transparent),0 2px 6px rgba(0,0,0,.55)}
      .better-hunt-stat strong{overflow:hidden;color:#fff;font-size:1em;font-weight:950;line-height:1;text-overflow:ellipsis;white-space:nowrap}
      .better-hunt-carousel{min-width:0}
      .better-hunt-ring{position:relative;height:210px;overflow:hidden;perspective:1100px}
      .better-hunt-ring-floor{position:absolute;inset:auto 40px 4px;height:28px;border-radius:50%;background:color-mix(in srgb,var(--bh-line-hi) 20%,transparent);filter:blur(14px)}
      .better-hunt-ring-track{position:absolute;left:50%;top:50%;transform-style:preserve-3d}
      .better-hunt-card{position:absolute;overflow:hidden;width:112px;height:158px;border:1.5px solid color-mix(in srgb,var(--bh-line-hi) 65%,transparent);border-radius:10px;background:var(--bh-inset);box-shadow:0 6px 18px rgba(0,0,0,.6),inset 0 0 0 1px rgba(0,0,0,.55);transition:transform .65s cubic-bezier(.22,.9,.3,1),opacity .45s ease,filter .45s ease}
      .better-hunt-card--center{border:2px solid var(--bh-line-hi);box-shadow:0 4px 14px rgba(0,0,0,.6)}
      .better-hunt-card--super.better-hunt-card--center{animation:better-hunt-gold calc(2.4s / var(--anim-speed,1)) ease-in-out infinite}
      .better-hunt-card--extreme{animation:better-hunt-cloak calc(4s / var(--anim-speed,1)) ease-in-out infinite;border-style:dashed}
      .better-hunt-card-img{width:100%;height:100%;display:block;object-fit:cover}
      .better-hunt-thumb{display:grid;place-items:center;flex:0 0 auto;overflow:hidden;border:1px solid color-mix(in srgb,var(--bh-line-mid) 75%,transparent);border-radius:6px;background:radial-gradient(120% 120% at 30% 20%,color-mix(in srgb,var(--bh-ice) 35%,transparent),var(--bh-card-lo) 78%);color:#fff;font-size:.7em;font-weight:950;box-shadow:inset 0 0 0 1px rgba(0,0,0,.55),0 1px 4px rgba(0,0,0,.6)}
      .better-hunt-thumb--super{background:radial-gradient(120% 120% at 30% 20%,rgba(255,201,61,.48),var(--bh-card-lo) 78%)}.better-hunt-thumb--extreme{background:radial-gradient(120% 120% at 30% 20%,rgba(255,84,112,.48),var(--bh-card-lo) 78%)}
      .better-hunt-card-gloss{position:absolute;inset:0 0 auto;height:34%;background:linear-gradient(180deg,rgba(255,255,255,.15),transparent);pointer-events:none}
      .better-hunt-card-name{position:absolute;inset:auto 0 0;padding:26px 8px 7px;background:linear-gradient(0deg,rgba(0,0,0,.88),rgba(0,0,0,.42),transparent);color:#fff;font-size:.86em;font-weight:900;line-height:1.05;text-align:center;text-transform:uppercase}
      .better-hunt-stats-panel{position:relative;height:210px;overflow:hidden;border:1px solid color-mix(in srgb,var(--bh-line-hi) 60%,transparent);border-radius:12px;background:var(--bh-inset);box-shadow:0 6px 22px rgba(0,0,0,.55),inset 0 1px 0 color-mix(in srgb,var(--bh-steel-hi) 10%,transparent)}
      .better-hunt-stats-image{position:absolute;inset:0}
      .better-hunt-stats-image img{animation:better-hunt-kenburns calc(8s / var(--anim-speed,1)) ease-out both}
      .better-hunt-stats-wash{position:absolute;inset:0;background:linear-gradient(0deg,rgba(0,0,0,.9),rgba(0,0,0,.45),rgba(0,0,0,.3))}
      .better-hunt-stats-content{position:relative;height:100%;display:flex;flex-direction:column;justify-content:space-between;padding:12px}
      .better-hunt-stats-title{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;min-width:0}
      .better-hunt-stats-title h3{min-width:0;overflow:hidden;margin:0;color:#fff;font-size:1.7em;font-weight:950;line-height:.95;text-overflow:ellipsis;text-transform:uppercase;white-space:nowrap}
      .better-hunt-tier{display:inline-flex;align-items:center;gap:5px;border:1px solid rgba(255,255,255,.16);border-radius:999px;background:rgba(0,0,0,.38);padding:5px 8px;color:var(--bh-steel-hi);font-size:.72em;font-weight:900;letter-spacing:.12em;text-transform:uppercase}
      .better-hunt-tier--super{border-color:rgba(255,201,61,.7);background:rgba(255,201,61,.12);color:#ffc93d}
      .better-hunt-tier--extreme{border-color:rgba(255,84,112,.7);background:rgba(255,84,112,.12);color:#ff6a4d}
      .better-hunt-stat-strip{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));overflow:hidden;border:1px solid rgba(255,255,255,.15);border-radius:9px;background:rgba(0,0,0,.55);backdrop-filter:blur(3px)}
      .better-hunt-stat-strip div{min-width:0;padding:7px 4px;text-align:center;border-left:1px solid rgba(255,255,255,.12)}
      .better-hunt-stat-strip div:first-child{border-left:0}
      .better-hunt-stat-strip strong{display:block;overflow:hidden;color:#fff;font-size:.94em;font-weight:900;line-height:1.1;text-overflow:ellipsis;white-space:nowrap}
      .better-hunt-image-stats-panel{height:210px;display:grid;grid-template-columns:41% minmax(0,1fr);overflow:hidden;border:1px solid color-mix(in srgb,var(--bh-line-hi) 60%,transparent);border-radius:12px;background:var(--bh-inset);box-shadow:0 6px 22px rgba(0,0,0,.55),inset 0 1px 0 color-mix(in srgb,var(--bh-steel-hi) 10%,transparent)}
      .better-hunt-image-stats-art{position:relative;min-width:0;overflow:hidden}.better-hunt-image-stats-art img{animation:better-hunt-kenburns calc(8s / var(--anim-speed,1)) ease-out both}.better-hunt-image-stats-art::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,transparent,var(--bh-inset)),linear-gradient(0deg,rgba(0,0,0,.45),transparent)}
      .better-hunt-image-stats-copy{min-width:0;display:flex;flex-direction:column;justify-content:space-between;gap:8px;padding:12px}.better-hunt-image-stats-title{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;min-width:0}.better-hunt-image-stats-title h3{min-width:0;overflow:hidden;margin:0;color:#fff;font-size:1.22em;font-weight:950;line-height:1;text-overflow:ellipsis;text-transform:uppercase;white-space:nowrap}.better-hunt-image-row{display:flex;align-items:center;justify-content:space-between;gap:8px;border-bottom:1px solid rgba(255,255,255,.08);padding:5px 0}.better-hunt-image-row:last-child{border-bottom:0}.better-hunt-image-row strong{overflow:hidden;color:#fff;font-size:.94em;font-weight:900;text-overflow:ellipsis;white-space:nowrap}
      .better-hunt-progress{display:flex;align-items:center;gap:10px;margin-top:10px;padding:0 4px}
      .better-hunt-track{height:var(--bh-bar-height);flex:1;overflow:hidden;border-radius:999px;background:var(--bh-track);box-shadow:inset 0 1px 2px rgba(0,0,0,.7)}
      .better-hunt-track span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--bh-ice-deep),var(--bh-ice-mid),var(--bh-ice-deep));box-shadow:0 0 10px color-mix(in srgb,var(--bh-ice) 55%,transparent);transition:width .45s ease}
      .better-hunt-counts{display:flex;align-items:center;gap:7px;border-right:1px solid rgba(255,255,255,.1);padding-right:8px}
      .better-hunt-counts span{display:inline-flex;align-items:center;gap:3px;color:var(--bh-ice);font-weight:900;font-size:.82em}
      .better-hunt-counts .is-extreme{color:#ff6a4d}.better-hunt-counts .is-super{color:#ffc93d}
      .better-hunt-fraction{display:flex;align-items:baseline;gap:3px;color:var(--bh-steel-hi);font-weight:900}
      .better-hunt-fraction strong{color:var(--bh-ice);font-size:1.08em;text-shadow:0 0 10px color-mix(in srgb,var(--bh-ice) 50%,transparent)}
      .better-hunt-list{min-height:0;overflow:hidden}
      .better-hunt-list-inner{display:grid;gap:6px}
      .better-hunt-list--scroll .better-hunt-list-inner{animation:better-hunt-marquee-up calc(26s / var(--anim-speed,1)) linear infinite}
      .better-hunt-row{min-width:0;display:grid;align-items:center;border:1px solid color-mix(in srgb,var(--bh-line-hi) 45%,transparent);border-radius:9px;background:linear-gradient(180deg,color-mix(in srgb,var(--bh-card-hi) 85%,transparent),color-mix(in srgb,var(--bh-card-lo) 85%,transparent));box-shadow:inset 0 1px 0 color-mix(in srgb,var(--bh-steel-hi) 7%,transparent)}
      .better-hunt-row--compact{grid-template-columns:26px auto minmax(0,1fr) auto;gap:9px;min-height:52px;padding:7px 8px}
      .better-hunt-row--names{grid-template-columns:26px minmax(0,1fr) auto;gap:8px;min-height:32px;padding:6px 8px}
      .better-hunt-row--image{position:relative;min-height:96px;overflow:hidden;padding:8px}
      .better-hunt-row-bg{position:absolute;inset:0}.better-hunt-row-bg img{filter:saturate(1.08) contrast(1.02)}
      .better-hunt-row-bg::after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(0,0,0,.92),rgba(0,0,0,.38),transparent)}
      .better-hunt-row-content{position:relative;display:grid;grid-template-columns:26px minmax(0,1fr) auto;gap:8px;align-items:end}
      .better-hunt-row-id{height:22px;min-width:24px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.15);border-radius:5px;background:rgba(0,0,0,.45);color:var(--bh-steel-hi);font-size:.7em;font-weight:900}
      .better-hunt-row-main{min-width:0}.better-hunt-row-main strong{display:block;overflow:hidden;color:#fff;font-size:.92em;font-weight:900;line-height:1.1;text-overflow:ellipsis;text-transform:uppercase;white-space:nowrap}.better-hunt-row-main em{display:block;overflow:hidden;color:var(--bh-steel-dim);font-style:normal;font-size:.72em;text-overflow:ellipsis;white-space:nowrap}
      .better-hunt-mini-stats{display:grid;gap:3px;min-width:66px}.better-hunt-mini-stat{display:flex;align-items:center;justify-content:space-between;gap:8px;color:#fff;font-size:.72em;font-weight:900}.better-hunt-mini-label{font-size:.62em;letter-spacing:.1em}
      .better-hunt-empty{display:grid;place-items:center;min-height:80px;border:1px dashed color-mix(in srgb,var(--bh-line-hi) 45%,transparent);border-radius:10px;background:rgba(0,0,0,.16);color:var(--bh-steel-dim);font-weight:800;text-align:center}
      .better-hunt-total{display:grid;gap:0;overflow:hidden;border:1px solid color-mix(in srgb,var(--bh-line-hi) 42%,transparent);border-radius:10px;background:rgba(0,0,0,.18)}
      .better-hunt-total-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 10px}
      .better-hunt-total-head span{color:var(--bh-steel-dim);font-size:.72em;font-weight:900;letter-spacing:.15em;text-transform:uppercase}.better-hunt-total-head strong{color:var(--bh-ice);font-size:1.28em;font-weight:950;line-height:1}
      .better-hunt-drawer{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:0 8px 8px}.better-hunt-result{min-width:0;display:flex;align-items:center;gap:8px;border-radius:7px;padding:6px;background:rgba(255,255,255,.045)}.better-hunt-result strong{display:block;overflow:hidden;color:#fff;font-size:.78em;text-overflow:ellipsis;white-space:nowrap}.better-hunt-result em{display:inline-flex;border-radius:999px;padding:2px 5px;background:rgba(69,200,255,.12);color:var(--bh-ice);font-size:.62em;font-style:normal;font-weight:900;letter-spacing:.1em;text-transform:uppercase}.better-hunt-result--worst em{background:rgba(255,84,112,.12);color:#ff6a4d}
      .better-hunt-log-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px}.better-hunt-log-head h3{margin:0;color:#fff;font-size:1.1em;font-weight:950;text-transform:uppercase}.better-hunt-log-head span{color:var(--bh-steel-dim);font-size:.74em;font-weight:800}
      .better-hunt-lanes{min-height:0;display:flex;flex-direction:column;justify-content:center;gap:10px;padding:0 12px 12px;overflow:hidden}.better-hunt-lane{overflow:hidden;mask-image:linear-gradient(to right,transparent 0%,#000 5%,#000 95%,transparent 100%);-webkit-mask-image:linear-gradient(to right,transparent 0%,#000 5%,#000 95%,transparent 100%)}.better-hunt-lane-track{display:flex;width:max-content;gap:10px}.better-hunt-lane-track--left{animation:better-hunt-marquee-left calc(48s / var(--anim-speed,1)) linear infinite}.better-hunt-lane-track--right{animation:better-hunt-marquee-right calc(54s / var(--anim-speed,1)) linear infinite}
      .better-hunt-hcard{position:relative;flex:0 0 auto;overflow:hidden;width:122px;height:172px;border:1px solid color-mix(in srgb,var(--bh-line-hi) 50%,transparent);border-radius:10px;background:var(--bh-inset);box-shadow:inset 0 1px 0 color-mix(in srgb,var(--bh-steel-hi) 10%,transparent),0 4px 12px rgba(0,0,0,.55)}.better-hunt-hcard.is-large{width:144px;height:202px}.better-hunt-hcard img{width:100%;height:100%;object-fit:cover}.better-hunt-hcard::after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(0,0,0,.95),rgba(0,0,0,.35),transparent)}.better-hunt-hcard-content{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:space-between;padding:8px}.better-hunt-hcard-top{display:flex;align-items:center;justify-content:space-between;gap:6px}.better-hunt-hcard-bet{max-width:58px;overflow:hidden;border:1px solid rgba(255,255,255,.1);border-radius:999px;background:rgba(0,0,0,.55);padding:2px 6px;color:var(--bh-ice);font-size:.68em;font-weight:900;text-overflow:ellipsis;white-space:nowrap}.better-hunt-hcard-title{overflow:hidden;color:#fff;font-size:.88em;font-weight:950;line-height:1.05;text-overflow:ellipsis;text-transform:uppercase;white-space:nowrap}
      .better-hunt-root[data-anim="off"]::before,.better-hunt-root[data-anim="off"]::after,.better-hunt-root[data-anim="off"] .better-hunt-list-inner,.better-hunt-root[data-anim="off"] .better-hunt-lane-track,.better-hunt-root[data-anim="off"] .better-hunt-card--super,.better-hunt-root[data-anim="off"] .better-hunt-card--extreme,.better-hunt-root[data-anim="off"] .better-hunt-stats-image img,.better-hunt-root[data-anim="off"] .better-hunt-image-stats-art img{animation:none!important}
      @media (max-width:640px){.better-hunt-shell{padding:10px}.better-hunt-horizontal{height:auto;grid-template-columns:1fr}.better-hunt-left{border-right:0;border-bottom:1px solid rgba(255,255,255,.08)}.better-hunt-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.better-hunt-stat-strip{grid-template-columns:repeat(2,minmax(0,1fr))}.better-hunt-stat-strip div{border-left:0;border-top:1px solid rgba(255,255,255,.12)}}
    `}</style>
  );
}

export function BetterBetsStyle({ config, countdown, statusLabel }) {
  const c = config || {};
  const options = safeArray(c.options);
  const bets = c.bets || {};
  const betters = c.betters || {};
  const visibleOptions = options.slice(0, Math.max(2, Math.min(8, numberValue(c.betterVisibleOptions, 6))));
  const totalPool = visibleOptions.reduce(
    (sum, _, index) => sum + (Number(bets[`opt_${index}`]) || 0),
    0,
  );
  const maxBet = Math.max(
    1,
    ...visibleOptions.map((_, index) => Number(bets[`opt_${index}`]) || 0),
  );
  const totalBetters = Object.keys(betters).length;
  const winnerIdx = c.winnerOption ?? null;
  const status = c.gameStatus || "idle";
  const accent = subValue(c, "cardNumberBadge", "background", c.accentColor || c.barFill || "#f59e0b");
  const bg = subValue(c, "widgetBackground", "background", c.bgColor || "#061126");
  const text = subValue(c, "widgetBackground", "textColor", c.textColor || "#eef6ff");
  const muted = c.mutedColor || "rgba(226,232,240,0.68)";
  const border = subValue(c, "widgetBackground", "borderColor", c.borderColor || alphaColor(accent, 0.45));
  const font = subValue(c, "widgetBackground", "fontFamily", c.fontFamily || "'Inter', sans-serif");
  const baseFontSize = numberValue(subValue(c, "widgetBackground", "fontSize", c.fontSize || 14), 14);
  const radius = cssPx(subValue(c, "widgetBackground", "radius", c.borderRadius ?? 16), "16px");
  const columns = Math.max(2, Math.min(4, numberValue(c.betterColumns, visibleOptions.length > 4 ? 3 : 2)));

  const rootStyle = subElementStyle(c, "widgetBackground", {
    width: "100%",
    height: "100%",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: 14,
    background: `linear-gradient(145deg, ${bg}, ${alphaColor(accent, 0.18)})`,
    color: text,
    border: `1px solid ${border}`,
    borderRadius: radius,
    overflow: "hidden",
    fontFamily: font,
    fontSize: baseFontSize,
    boxShadow: `0 18px 42px rgba(0,0,0,0.36), 0 0 28px ${alphaColor(accent, 0.22)}`,
    position: "relative",
  });
  const headerStyle = subElementStyle(c, "header", {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    minHeight: 38,
    padding: "8px 10px",
    borderRadius: 12,
    background: `linear-gradient(90deg, ${alphaColor(accent, 0.24)}, rgba(15,23,42,0.34))`,
    border: `1px solid ${alphaColor(accent, 0.22)}`,
  });
  const cardBase = {
    background: c.cardBg || "rgba(255,255,255,0.07)",
    border: `1px solid ${alphaColor(accent, 0.22)}`,
    borderRadius: cssPx(subValue(c, "individualBetCard", "radius", c.cardRadius ?? 12), "12px"),
  };

  return (
    <div className="better-bets-widget" style={rootStyle} {...attrs("bets", c, "widgetBackground")}>
      <BetterStyleSheet />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: "-40% -30% auto auto",
          width: "70%",
          height: "70%",
          background: `radial-gradient(circle, ${alphaColor(accent, 0.22)}, transparent 68%)`,
          pointerEvents: "none",
        }}
      />
      <div style={headerStyle} {...attrs("bets", c, "header")}>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: baseFontSize * 0.72,
              color: muted,
              fontWeight: 800,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}
          >
            Live bracket
          </div>
          <div
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontWeight: 900,
              fontSize: baseFontSize * 1.12,
              lineHeight: 1.1,
            }}
          >
            {c.question || "Place Your Bets"}
          </div>
        </div>
        <span
          style={subElementStyle(c, "status", {
            flexShrink: 0,
            borderRadius: 999,
            padding: "7px 10px",
            background: status === "open" ? accent : "rgba(148,163,184,0.18)",
            color: status === "open" ? "#061126" : text,
            fontSize: baseFontSize * 0.72,
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }, status)}
          {...attrs("bets", c, "status", status)}
        >
          {status === "open" ? statusLabel || `${countdown}s` : statusLabel || status}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
        {[
          ["poolStat", "Pool", formatCompactNumber(totalPool)],
          ["timerStat", status === "open" ? "Timer" : "State", status === "open" ? `${countdown}s` : status.toUpperCase()],
          ["betsStat", "Bets", formatCompactNumber(totalBetters)],
        ].map(([part, label, value]) => (
          <div
            key={part}
            style={subElementStyle(c, part, {
              minWidth: 0,
              borderRadius: 10,
              background: "rgba(255,255,255,0.055)",
              border: "1px solid rgba(255,255,255,0.08)",
              padding: "8px 6px",
              textAlign: "center",
            })}
            {...attrs("bets", c, part)}
          >
            <div style={{ fontWeight: 950, fontSize: baseFontSize * 1.1, lineHeight: 1 }}>{value}</div>
            <div style={{ marginTop: 3, color: muted, fontSize: baseFontSize * 0.66, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      <div
        style={subElementStyle(c, "betCards", {
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))`,
          gap: 9,
          minHeight: 0,
          flex: 1,
        })}
        {...attrs("bets", c, "betCards")}
      >
        {visibleOptions.map((option, index) => {
          const amount = Number(bets[`opt_${index}`]) || 0;
          const pct = totalPool > 0 ? Math.round((amount / totalPool) * 100) : 0;
          const fill = Math.max(4, Math.round((amount / maxBet) * 100));
          const isWinner = winnerIdx === index;
          const isLoser = winnerIdx !== null && winnerIdx !== index;
          const optionAccent = c.barColorMode === "rainbow"
            ? ["#f59e0b", "#22c55e", "#38bdf8", "#a78bfa", "#fb7185", "#eab308"][index % 6]
            : accent;
          return (
            <div
              key={`${index}-${betOptionLabel(option, index)}`}
              style={subElementStyle(c, "individualBetCard", {
                ...cardBase,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: 86,
                padding: 10,
                position: "relative",
                overflow: "hidden",
                opacity: isLoser ? 0.62 : 1,
                boxShadow: isWinner ? `0 0 22px ${alphaColor(optionAccent, 0.5)}` : undefined,
                animation: "better-rise 220ms ease-out both",
                animationDelay: `${index * 35}ms`,
              }, isWinner ? "winner" : isLoser ? "loser" : "default")}
              {...attrs("bets", c, "individualBetCard", isWinner ? "winner" : isLoser ? "loser" : "default")}
            >
                <span
                  aria-hidden="true"
                  style={subElementStyle(c, "progressBar", {
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: `${fill}%`,
                    background: `linear-gradient(180deg, ${alphaColor(optionAccent, 0.06)}, ${alphaColor(optionAccent, 0.34)})`,
                    transition: "height 300ms ease",
                  }, isWinner ? "winner" : isLoser ? "loser" : "default")}
                  {...attrs("bets", c, "progressBar", isWinner ? "winner" : isLoser ? "loser" : "default")}
                />
              <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={subElementStyle(c, "cardNumberBadge", {
                    width: 28,
                    height: 28,
                    borderRadius: 9,
                    display: "grid",
                    placeItems: "center",
                    background: optionAccent,
                    color: "#061126",
                    fontWeight: 950,
                  })}
                  {...attrs("bets", c, "cardNumberBadge")}
                >
                  {index + 1}
                </span>
                <strong
                  style={subElementStyle(c, "cardRangeText", {
                    minWidth: 0,
                    color: text,
                    fontSize: baseFontSize * 0.86,
                    lineHeight: 1.15,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  })}
                  {...attrs("bets", c, "cardRangeText")}
                >
                  {betOptionLabel(option, index)}
                </strong>
              </div>
              <div style={{ position: "relative", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
                <span
                  style={subElementStyle(c, "cardLabel", {
                    color: muted,
                    fontSize: baseFontSize * 0.72,
                  })}
                  {...attrs("bets", c, "cardLabel")}
                >
                  {formatCompactNumber(amount)} pts
                </span>
                <span
                  style={subElementStyle(c, "cardPercentageText", {
                    color: optionAccent,
                    fontSize: baseFontSize * 1.35,
                    fontWeight: 950,
                    lineHeight: 0.95,
                  })}
                  {...attrs("bets", c, "cardPercentageText")}
                >
                  {pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {status === "open" && (
        <div
          style={subElementStyle(c, "footerInstruction", {
            color: muted,
            fontSize: baseFontSize * 0.76,
            fontWeight: 700,
            textAlign: "center",
          })}
          {...attrs("bets", c, "footerInstruction")}
        >
          Type {c.chatCommand || "!bet"} &lt;number&gt; to join
        </div>
      )}
    </div>
  );
}

export function BetterBonusHuntStyle({ config, bonuses, stats, currency }) {
  const c = config || {};
  const rows = safeArray(safeArray(bonuses).length ? bonuses : c.bonuses);
  const opened = rows.filter(bonusOpened);
  const firstUnopened = rows.findIndex((bonus) => !bonusOpened(bonus));
  const initialIndex = firstUnopened >= 0 ? firstUnopened : 0;
  const activeIndex = useBetterHuntCarousel(
    rows.length,
    Number(c.carouselMs) || 3200,
    c.animations !== false,
    initialIndex,
  );
  const current = rows[activeIndex] || rows[initialIndex] || rows[0] || null;
  const money = currency || c.currency || "€";
  const theme = BETTER_HUNT_THEMES[c.colour] || BETTER_HUNT_THEMES.ocean;
  const orientation = c.orientation === "horizontal" ? "horizontal" : "vertical";
  const listMode = ["compact", "image", "names"].includes(c.listMode) ? c.listMode : "compact";
  const carouselMode = ["3d", "imagestats", "stats"].includes(c.carouselMode) ? c.carouselMode : "3d";
  const visibleRows = Math.max(3, Math.min(8, Number(c.visibleRows) || 5));
  const rowHeight = BETTER_HUNT_ROW_HEIGHT[listMode] || BETTER_HUNT_ROW_HEIGHT.compact;
  const listHeight = visibleRows * rowHeight + 6;
  const uiScale = Math.max(0.75, Math.min(1.35, Number(c.uiScale) || 1));
  const barHeight = Math.max(3, Math.min(10, Number(c.barHeight) || 6));
  const avatarSize = Math.max(20, Math.min(44, Number(c.avatarSize) || 28));
  const font = c.fontFamily || BETTER_HUNT_FONTS[c.font] || BETTER_HUNT_FONTS.rajdhani;
  const title = c.title || c.huntTitle || "Bonus Opening";
  const progress = rows.length ? Math.round((opened.length / rows.length) * 100) : 0;
  const activeStep = rows.length ? Math.min(rows.length, Math.max(1, opened.length + 1)) : 0;
  const totalBetFromStats = firstMetric([stats?.totalBetAll, stats?.totalBet, c.totalBet], Number.NaN);
  const totalPayFromStats = firstMetric([stats?.totalWin, stats?.totalPay, c.totalPay], Number.NaN);
  const totalBet = Number.isFinite(totalBetFromStats)
    ? totalBetFromStats
    : rows.reduce((sum, bonus) => sum + bonusBet(bonus), 0);
  const totalPay = Number.isFinite(totalPayFromStats)
    ? totalPayFromStats
    : opened.reduce((sum, bonus) => sum + bonusPayout(bonus), 0);
  const totalBetOpened = opened.reduce((sum, bonus) => sum + bonusBet(bonus), 0);
  const avgMulti = firstMetric([stats?.avgMulti, c.avgMulti], totalBetOpened > 0 ? totalPay / totalBetOpened : 0);
  const breakEven = firstMetric([stats?.breakEven, c.breakEven, c.breakEvenMultiplier], 0);
  const startKnown = [c.startMoney, c.startingBalance, stats?.startMoney, stats?.start].some((value) => value !== undefined && value !== null && value !== "");
  const stopKnown = [c.stopLoss, c.stopMoney, c.stopBalance, stats?.stopLoss, stats?.stop].some((value) => value !== undefined && value !== null && value !== "");
  const startValue = firstMetric([c.startMoney, c.startingBalance, stats?.startMoney, stats?.start], 0);
  const stopValue = firstMetric([c.stopLoss, c.stopMoney, c.stopBalance, stats?.stopLoss, stats?.stop], 0);
  const superCount = rows.filter((bonus) => bonusTier(bonus) === "super").length;
  const extremeCount = rows.filter((bonus) => bonusTier(bonus) === "extreme").length;
  const bestSlot = stats?.bestSlot || opened.reduce((best, bonus) => {
    const multi = bonusMultiplierValue(bonus);
    return !best || multi > bonusMultiplierValue(best) ? bonus : best;
  }, null);
  const worstSlot = stats?.worstSlot || opened.reduce((worst, bonus) => {
    const multi = bonusMultiplierValue(bonus);
    return !worst || multi < bonusMultiplierValue(worst) ? bonus : worst;
  }, null);
  const listRows = rows.slice(0, visibleRows);
  const scrollingRows = rows.length > visibleRows ? [...listRows, ...listRows] : listRows;
  const rootStyle = subElementStyle(c, "container", {
    "--bh-panel-hi": theme.panelHi,
    "--bh-panel-mid": theme.panelMid,
    "--bh-panel-lo": theme.panelLo,
    "--bh-inset": theme.inset,
    "--bh-track": theme.track,
    "--bh-card-hi": theme.cardHi,
    "--bh-card-lo": theme.cardLo,
    "--bh-line": theme.line,
    "--bh-line-hi": theme.lineHi,
    "--bh-line-mid": theme.lineMid,
    "--bh-steel": theme.steel,
    "--bh-steel-dim": theme.steelDim,
    "--bh-steel-hi": theme.steelHi,
    "--bh-ice": c.headerAccent || c.accentColor || theme.ice,
    "--bh-ice-deep": theme.iceDeep,
    "--bh-ice-mid": theme.iceMid,
    "--bh-glow-a": theme.glowA,
    "--bh-glow-b": theme.glowB,
    "--bh-font": font,
    "--bh-ui": uiScale,
    "--bh-avatar": `${avatarSize}px`,
    "--bh-bar-height": `${barHeight}px`,
    "--anim-speed": Math.max(0.5, Number(c.animSpeed) || 1),
  });

  const renderHeader = () => (
    <header className="better-hunt-header" {...attrs("bonus_hunt", c, "headerContainer")}>
      <div className="better-hunt-brand">
        <span className="better-hunt-avatar" style={{ width: avatarSize, height: avatarSize }}>
          {c.avatarUrl ? <img src={c.avatarUrl} alt="" /> : initials(c.streamerName || title)}
        </span>
        <div className="better-hunt-title">
          <span>{c.bonusOpening === false ? "Bonus Hunt" : "Bonus Opening"}</span>
          <strong {...attrs("bonus_hunt", c, "headerTitle")}>{title}</strong>
        </div>
      </div>
      <span className="better-hunt-pill" {...attrs("bonus_hunt", c, "statValue")}>
        <i className="better-hunt-dot" />
        {rows.length} Bonuses
      </span>
    </header>
  );

  const renderStatBoxes = () => (
    <div className="better-hunt-stat-grid" {...attrs("bonus_hunt", c, "mainStatsContainer")}>
      {[
        ["Start", startKnown ? formatMoney(startValue, money) : "-"],
        ["Stop", stopKnown ? formatMoney(stopValue, money) : "-"],
        ["B.E.", breakEven > 0 ? formatMultiplier(breakEven) : "-"],
        ["Avg.", avgMulti > 0 ? formatMultiplier(avgMulti) : "-"],
      ].map(([label, value]) => (
        <div key={label} className="better-hunt-stat" {...attrs("bonus_hunt", c, "statCell")}>
          <span className="better-hunt-stat-label" {...attrs("bonus_hunt", c, "statLabel")}>{label}</span>
          <strong {...attrs("bonus_hunt", c, "statValue")}>{value}</strong>
        </div>
      ))}
    </div>
  );

  const renderProgress = () => (
    <div className="better-hunt-progress" {...attrs("bonus_hunt", c, "progressBar")}>
      <div className="better-hunt-track">
        <span style={{ width: `${progress}%` }} {...attrs("bonus_hunt", c, "progressBarFill")} />
      </div>
      <div className="better-hunt-counts" aria-label="Bonus tiers">
        <span className="is-extreme">EX {extremeCount}</span>
        <span className="is-super">S {superCount}</span>
      </div>
      <div className="better-hunt-fraction">
        <strong>{activeStep}</strong>
        <span>/</span>
        <span>{rows.length}</span>
      </div>
    </div>
  );

  const renderStatsCarousel = () => {
    if (!current) {
      return (
        <div className="better-hunt-carousel" {...attrs("bonus_hunt", c, "slotCarouselContainer")}>
          <div className="better-hunt-stats-panel better-hunt-empty">No bonuses yet</div>
          {renderProgress()}
        </div>
      );
    }
    const tier = bonusTier(current);
    const statCells = [
      ["Bet", bonusBet(current) > 0 ? formatMoney(bonusBet(current), money) : "-"],
      ["RTP", bonusRtp(current)],
      ["Volatility", bonusVolatility(current)],
      ["Max Win", bonusMaxWin(current)],
      ["Best", bonusMultiplierValue(current) > 0 ? formatMultiplier(bonusMultiplierValue(current)) : "-"],
    ];
    if (carouselMode === "imagestats") {
      return (
        <div className="better-hunt-carousel" {...attrs("bonus_hunt", c, "slotCarouselContainer")}>
          <div className="better-hunt-image-stats-panel" {...attrs("bonus_hunt", c, "carouselBackdrop")}>
            <div className="better-hunt-image-stats-art">
              <SlotImage src={bonusImage(current)} alt={bonusSlotName(current, activeIndex)} {...attrs("bonus_hunt", c, "slotImage")} />
            </div>
            <div className="better-hunt-image-stats-copy">
              <div className="better-hunt-image-stats-title">
                <h3 {...attrs("bonus_hunt", c, "slotTitle")}>{bonusSlotName(current, activeIndex)}</h3>
                <span className={`better-hunt-tier better-hunt-tier--${tier}`}>{tier}</span>
              </div>
              <div>
                {statCells.map(([label, value]) => (
                  <div className="better-hunt-image-row" key={label}>
                    <span className="better-hunt-stat-label" {...attrs("bonus_hunt", c, "statLabel")}>{label}</span>
                    <strong {...attrs("bonus_hunt", c, "statValue")}>{value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {renderProgress()}
        </div>
      );
    }
    return (
      <div className="better-hunt-carousel" {...attrs("bonus_hunt", c, "slotCarouselContainer")}>
        <div className={`better-hunt-stats-panel better-hunt-stats-panel--${carouselMode}`} {...attrs("bonus_hunt", c, "carouselBackdrop")}>
          <div className="better-hunt-stats-image">
            <SlotImage src={bonusImage(current)} alt={bonusSlotName(current, activeIndex)} {...attrs("bonus_hunt", c, "slotImage")} />
          </div>
          <div className="better-hunt-stats-wash" />
          <div className="better-hunt-stats-content">
            <div className="better-hunt-stats-title">
              <div>
                <h3 {...attrs("bonus_hunt", c, "slotTitle")}>{bonusSlotName(current, activeIndex)}</h3>
                <div className="better-hunt-eyebrow">Now spinning</div>
              </div>
              <span className={`better-hunt-tier better-hunt-tier--${tier}`}>{tier === "extreme" ? "Extreme" : tier === "super" ? "Super" : "Normal"} Bonus</span>
            </div>
            <div className="better-hunt-stat-strip">
              {statCells.map(([label, value]) => (
                <div key={label}>
                  <span className="better-hunt-stat-label" {...attrs("bonus_hunt", c, "statLabel")}>{label}</span>
                  <strong {...attrs("bonus_hunt", c, "statValue")}>{value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
        {renderProgress()}
      </div>
    );
  };

  const renderRingCarousel = () => (
    <div className="better-hunt-carousel" {...attrs("bonus_hunt", c, "slotCarouselContainer")}>
      <div className="better-hunt-ring" {...attrs("bonus_hunt", c, "carouselBackdrop")}>
        {rows.length ? (
          <>
            <div className="better-hunt-ring-floor" />
            <div className="better-hunt-ring-track">
              {rows.map((bonus, index) => {
                let delta = index - activeIndex;
                if (delta > rows.length / 2) delta -= rows.length;
                if (delta < -rows.length / 2) delta += rows.length;
                const abs = Math.abs(delta);
                const hidden = abs >= 3;
                const tier = bonusTier(bonus);
                const centered = delta === 0;
                return (
                  <div
                    key={`${bonusSlotName(bonus, index)}-${index}`}
                    className={`better-hunt-card better-hunt-card--${tier}${centered ? " better-hunt-card--center" : ""}`}
                    style={{
                      opacity: hidden ? 0 : abs === 2 ? 0.4 : 1,
                      pointerEvents: hidden ? "none" : undefined,
                      zIndex: 30 - abs * 10,
                      filter: centered || tier === "extreme" ? undefined : "brightness(.62) saturate(.85)",
                      transform: `translate(-50%, -50%) translateX(${delta * 116}px) translateZ(${-abs * 130}px) rotateY(${delta * -32}deg) scale(${centered ? 1.14 : 0.9})`,
                    }}
                    {...attrs("bonus_hunt", c, "slotRow", bonusOpened(bonus) ? "opened" : "unopened")}
                  >
                    <BetterHuntThumb bonus={bonus} size={112} className="better-hunt-card-img" />
                    <span className="better-hunt-card-gloss" />
                    <span className="better-hunt-card-name" {...attrs("bonus_hunt", c, "slotTitle")}>{bonusSlotName(bonus, index)}</span>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="better-hunt-empty">No bonuses yet</div>
        )}
      </div>
      {renderProgress()}
    </div>
  );

  const renderCarousel = () => (carouselMode === "3d" ? renderRingCarousel() : renderStatsCarousel());

  const renderListRow = (bonus, index, mode = listMode, keySuffix = "") => {
    const openedState = bonusOpened(bonus);
    const payout = bonusPayout(bonus);
    const bet = bonusBet(bonus);
    const multi = bonusMultiplierValue(bonus);
    if (mode === "image") {
      return (
        <div key={`${bonusSlotName(bonus, index)}-${index}-${keySuffix}`} className="better-hunt-row better-hunt-row--image" {...attrs("bonus_hunt", c, "slotRow", openedState ? "opened" : "unopened")}>
          <div className="better-hunt-row-bg"><SlotImage src={bonusImage(bonus)} alt="" /></div>
          <div className="better-hunt-row-content">
            <span className="better-hunt-row-id">{index + 1}</span>
            <span className="better-hunt-row-main">
              <strong {...attrs("bonus_hunt", c, "slotTitle")}>{bonusSlotName(bonus, index)}</strong>
              <em>{bonusProvider(bonus) || (openedState ? "opened" : "queued")}</em>
            </span>
            <span className="better-hunt-mini-stats">
              <span className="better-hunt-mini-stat"><span className="better-hunt-mini-label">Win</span>{openedState ? formatMoney(payout, money) : "-"}</span>
              <span className="better-hunt-mini-stat"><span className="better-hunt-mini-label">Multi</span>{multi > 0 ? formatMultiplier(multi) : "-"}</span>
              <span className="better-hunt-mini-stat"><span className="better-hunt-mini-label">Bet</span>{bet > 0 ? formatMoney(bet, money) : "-"}</span>
            </span>
          </div>
        </div>
      );
    }
    if (mode === "names") {
      return (
        <div key={`${bonusSlotName(bonus, index)}-${index}-${keySuffix}`} className="better-hunt-row better-hunt-row--names" {...attrs("bonus_hunt", c, "slotRow", openedState ? "opened" : "unopened")}>
          <span className="better-hunt-row-id">{index + 1}</span>
          <span className="better-hunt-row-main"><strong {...attrs("bonus_hunt", c, "slotTitle")}>{bonusSlotName(bonus, index)}</strong></span>
          <span className="better-hunt-mini-stat">{bet > 0 ? formatMoney(bet, money) : "-"}</span>
        </div>
      );
    }
    return (
      <div key={`${bonusSlotName(bonus, index)}-${index}-${keySuffix}`} className="better-hunt-row better-hunt-row--compact" {...attrs("bonus_hunt", c, "slotRow", openedState ? "opened" : "unopened")}>
        <span className="better-hunt-row-id">{index + 1}</span>
        <BetterHuntThumb bonus={bonus} size={44} />
        <span className="better-hunt-row-main">
          <strong {...attrs("bonus_hunt", c, "slotTitle")}>{bonusSlotName(bonus, index)}</strong>
          <em>{bonusProvider(bonus) || (openedState ? "opened" : "queued")}</em>
        </span>
        <span className="better-hunt-mini-stats">
          <span className="better-hunt-mini-stat"><span className="better-hunt-mini-label">Win</span>{openedState ? formatMoney(payout, money) : "-"}</span>
          <span className="better-hunt-mini-stat"><span className="better-hunt-mini-label">Multi</span>{multi > 0 ? formatMultiplier(multi) : "-"}</span>
          <span className="better-hunt-mini-stat"><span className="better-hunt-mini-label">Bet</span>{bet > 0 ? formatMoney(bet, money) : "-"}</span>
        </span>
      </div>
    );
  };

  const renderList = () => (
    <div
      className={`better-hunt-list better-hunt-list--${listMode}${rows.length > visibleRows && c.animations !== false ? " better-hunt-list--scroll" : ""}`}
      style={{ height: listHeight }}
      {...attrs("bonus_hunt", c, "slotListContainer")}
    >
      {rows.length ? (
        <div className="better-hunt-list-inner">
          {scrollingRows.map((bonus, index) => renderListRow(bonus, index % Math.max(1, listRows.length), listMode, index))}
        </div>
      ) : (
        <div className="better-hunt-empty">Waiting for hunt data</div>
      )}
    </div>
  );

  const renderResultCard = (label, bonus, variant) => {
    if (!bonus) return null;
    const multi = bonusMultiplierValue(bonus);
    return (
      <div className={`better-hunt-result better-hunt-result--${variant}`}>
        <BetterHuntThumb bonus={bonus} size={42} />
        <span className="better-hunt-row-main">
          <em>{label}</em>
          <strong>{bonusSlotName(bonus, 0)}</strong>
          <span className="better-hunt-mini-stat">{formatMoney(bonusPayout(bonus), money)} {multi > 0 ? formatMultiplier(multi) : ""}</span>
        </span>
      </div>
    );
  };

  const renderTotalDrawer = () => {
    const drawerOpen = c.drawerOpen === true || c.drawerPreviewOpen === true || c.drawerMode === "expand";
    return (
      <div className="better-hunt-total" {...attrs("bonus_hunt", c, "footerContainer")}>
        <div className="better-hunt-total-head">
          <span>Total Pay</span>
          <strong>{formatMoney(totalPay, money)}</strong>
        </div>
        {drawerOpen && (bestSlot || worstSlot) && (
          <div className="better-hunt-drawer">
            {renderResultCard("Best", bestSlot, "best")}
            {renderResultCard("Worst", worstSlot, "worst")}
          </div>
        )}
      </div>
    );
  };

  const renderHorizontalCards = (sourceRows, direction, large = false) => {
    const loop = sourceRows.length ? [...sourceRows, ...sourceRows] : [];
    return (
      <div className="better-hunt-lane">
        {loop.length ? (
          <div className={`better-hunt-lane-track better-hunt-lane-track--${direction}`}>
            {loop.map((bonus, index) => (
              <div key={`${bonusSlotName(bonus, index)}-${direction}-${index}`} className={`better-hunt-hcard${large ? " is-large" : ""}`}>
                <SlotImage src={bonusImage(bonus)} alt="" />
                <div className="better-hunt-hcard-content">
                  <div className="better-hunt-hcard-top">
                    <span className="better-hunt-row-id">{(index % rows.length) + 1}</span>
                    <span className="better-hunt-hcard-bet">{bonusBet(bonus) > 0 ? formatMoney(bonusBet(bonus), money) : "-"}</span>
                  </div>
                  <div>
                    <div className="better-hunt-hcard-title">{bonusSlotName(bonus, index)}</div>
                    <div className="better-hunt-mini-stats">
                      <span className="better-hunt-mini-stat"><span className="better-hunt-mini-label">Win</span>{bonusOpened(bonus) ? formatMoney(bonusPayout(bonus), money) : "-"}</span>
                      <span className="better-hunt-mini-stat"><span className="better-hunt-mini-label">Multi</span>{bonusMultiplierValue(bonus) > 0 ? formatMultiplier(bonusMultiplierValue(bonus)) : "-"}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="better-hunt-empty">Waiting for hunt data</div>
        )}
      </div>
    );
  };

  const renderHorizontalLog = () => (
    <div className="better-hunt-right">
      <div className="better-hunt-log-head">
        <div>
          <h3>Session Log</h3>
          <span>{rows.length} bonuses · auto-tracked</span>
        </div>
        <span className="better-hunt-pill">{opened.length}/{rows.length}</span>
      </div>
      {listMode === "names" ? (
        <div style={{ padding: "0 12px 12px", minHeight: 0 }}>{renderList()}</div>
      ) : (
        <div className="better-hunt-lanes">
          {renderHorizontalCards(rows, "left", listMode === "image")}
          {listMode === "compact" && renderHorizontalCards([...rows].reverse(), "right")}
        </div>
      )}
    </div>
  );

  const content = orientation === "horizontal" ? (
    <section className="better-hunt-panel better-hunt-horizontal">
      <div className="better-hunt-left">
        {renderHeader()}
        <div className="better-hunt-divider" />
        {renderStatBoxes()}
        {renderCarousel()}
        {renderTotalDrawer()}
      </div>
      {renderHorizontalLog()}
    </section>
  ) : (
    <section className="better-hunt-panel better-hunt-vertical">
      {renderHeader()}
      <div className="better-hunt-divider" />
      {renderStatBoxes()}
      {renderCarousel()}
      <div className="better-hunt-divider" />
      {renderList()}
      <div className="better-hunt-divider" />
      {renderTotalDrawer()}
    </section>
  );

  return (
    <div
      className="better-hunt-root"
      data-anim={c.animations === false ? "off" : "on"}
      data-finish={c.finish || "flat"}
      data-orientation={orientation}
      style={rootStyle}
      {...attrs("bonus_hunt", c, "container")}
    >
      <BetterStyleSheet />
      <div className="better-hunt-shell">{content}</div>
    </div>
  );
}

export function BetterGiveawayStyle({ config }) {
  const c = config || {};
  const participants = safeArray(c.participants);
  const winner = c.winner || "";
  const spinningWinner = c.spinningWinner || "";
  const isActive = !!c.isActive;
  const keyword = String(c.keyword || "").replace(/^!+/, "");
  const accent = subValue(c, "celebration", "accentColor", c.accentColor || "#f59e0b");
  const bg = subValue(c, "container", "background", c.bgColor || "#081226");
  const text = subValue(c, "container", "textColor", c.textColor || "#f8fafc");
  const muted = subValue(c, "label", "textColor", c.mutedColor || "rgba(226,232,240,0.68)");
  const font = subValue(c, "container", "fontFamily", c.fontFamily || "'Inter', sans-serif");
  const chips = participants.length ? participants.slice(-10) : [keyword ? `!${keyword}` : "waiting"];
  const hasWinner = Boolean(winner);

  return (
    <div
      style={subElementStyle(c, "container", {
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        display: "grid",
        gridTemplateRows: "auto minmax(0,1fr) auto",
        gap: 12,
        padding: 16,
        overflow: "hidden",
        borderRadius: cssPx(c.borderRadius ?? 18, "18px"),
        border: `1px solid ${alphaColor(accent, 0.4)}`,
        background: `linear-gradient(145deg, ${bg}, ${alphaColor(accent, 0.16)})`,
        color: text,
        fontFamily: font,
        boxShadow: `0 18px 44px rgba(0,0,0,0.38), 0 0 26px ${alphaColor(accent, 0.2)}`,
        position: "relative",
      })}
      {...attrs("giveaway", c, "container")}
    >
      <BetterStyleSheet />
      <div
        style={subElementStyle(c, "header", {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        })}
        {...attrs("giveaway", c, "header")}
      >
        <div>
          <div style={{ color: muted, fontSize: 11, fontWeight: 850, letterSpacing: "0.18em", textTransform: "uppercase" }}>
            {hasWinner ? "Winner selected" : isActive ? "Live giveaway" : "Giveaway"}
          </div>
          <strong style={{ display: "block", fontSize: "clamp(18px,5cqw,28px)", lineHeight: 1.05 }}>
            {c.title || "Giveaway"}
          </strong>
        </div>
        <span
          style={subElementStyle(c, "statusBadge", {
            borderRadius: 999,
            padding: "7px 11px",
            background: isActive && !hasWinner ? accent : "rgba(148,163,184,0.16)",
            color: isActive && !hasWinner ? "#081226" : text,
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }, hasWinner ? "winner" : isActive ? "live" : "closed")}
          {...attrs("giveaway", c, "statusBadge", hasWinner ? "winner" : isActive ? "live" : "closed")}
        >
          {hasWinner ? "Done" : isActive ? "Live" : "Off"}
        </span>
      </div>

      <div
        style={subElementStyle(c, "progressSection", {
          minHeight: 0,
          borderRadius: 18,
          border: `1px solid ${alphaColor(accent, 0.28)}`,
          background: "rgba(255,255,255,0.055)",
          display: "grid",
          gridTemplateRows: "auto minmax(0,1fr)",
          overflow: "hidden",
        })}
        {...attrs("giveaway", c, "progressSection")}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "rgba(255,255,255,0.08)" }}>
          <div
            style={subElementStyle(c, "keyword", {
              background: "rgba(8,18,38,0.82)",
              padding: 12,
            })}
            {...attrs("giveaway", c, "keyword")}
          >
            <span style={{ color: muted, fontSize: 11, fontWeight: 850, textTransform: "uppercase", letterSpacing: "0.14em" }}>Command</span>
            <strong style={{ display: "block", color: accent, fontSize: 22 }}>{keyword ? `!${keyword}` : "-"}</strong>
          </div>
          <div
            style={subElementStyle(c, "participantCount", {
              background: "rgba(8,18,38,0.82)",
              padding: 12,
            })}
            {...attrs("giveaway", c, "participantCount")}
          >
            <span style={{ color: muted, fontSize: 11, fontWeight: 850, textTransform: "uppercase", letterSpacing: "0.14em" }}>Entries</span>
            <strong style={{ display: "block", fontSize: 22 }}>{participants.length}</strong>
          </div>
        </div>
        <div style={{ position: "relative", display: "grid", placeItems: "center", padding: 14, minHeight: 0 }}>
          {hasWinner ? (
            <div
              style={subElementStyle(c, "winnerArea", {
                textAlign: "center",
                animation: "better-rise 260ms ease-out both",
              }, "winner")}
              {...attrs("giveaway", c, "winnerArea", "winner")}
            >
              <div style={{ color: muted, fontSize: 12, fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase" }}>Winner</div>
              <strong style={{ display: "block", color: accent, fontSize: "clamp(28px,11cqw,52px)", lineHeight: 1 }}>
                {winner}
              </strong>
              {c.prize ? <div style={{ marginTop: 8, color: text, fontWeight: 800 }}>{c.prize}</div> : null}
            </div>
          ) : spinningWinner ? (
            <strong
              style={subElementStyle(c, "winnerArea", {
                color: accent,
                fontSize: "clamp(26px,10cqw,46px)",
              }, "drawing")}
              {...attrs("giveaway", c, "winnerArea", "drawing")}
            >
              {spinningWinner}
            </strong>
          ) : (
            <div
              style={subElementStyle(c, participants.length ? "winnerArea" : "emptyState", {
                width: "100%",
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: 8,
              }, participants.length ? "live" : "empty")}
              {...attrs("giveaway", c, participants.length ? "winnerArea" : "emptyState", participants.length ? "live" : "empty")}
            >
              {chips.map((name, index) => (
                <span
                  key={`${name}-${index}`}
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    background: alphaColor(accent, index % 3 === 0 ? 0.32 : 0.18),
                    border: `1px solid ${alphaColor(accent, 0.4)}`,
                    color: text,
                    fontWeight: 950,
                    animation: `better-float ${4 + index * 0.25}s ease-in-out infinite`,
                    "--float-x": `${index % 2 ? -8 : 8}px`,
                    "--float-y": `${index % 3 ? -6 : 6}px`,
                  }}
                  title={name}
                >
                  {initials(name)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div
        style={subElementStyle(c, "prize", {
          color: c.prize ? text : muted,
          fontWeight: 800,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          textAlign: "center",
        })}
        {...attrs("giveaway", c, "prize")}
      >
        {c.prize || (isActive ? "Waiting for chat entries" : "Set a prize and start the giveaway")}
      </div>
    </div>
  );
}

export function BetterChatHeader({ config, chatHeaderName, headerText, accentColor }) {
  const c = config || {};
  return (
    <div
      style={subElementStyle(c, "header", {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        padding: "10px 12px",
        borderBottom: `1px solid ${alphaColor(accentColor, 0.28)}`,
        background: `linear-gradient(90deg, ${alphaColor(accentColor, 0.18)}, rgba(2,8,23,0.18))`,
      })}
      {...attrs("chat", c, "header")}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: accentColor,
            boxShadow: `0 0 12px ${accentColor}`,
            animation: "better-soft-pulse 1.8s ease-in-out infinite",
          }}
          {...attrs("chat", c, "badge")}
        />
        <strong style={{ color: headerText, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.12em" }}>
          {chatHeaderName}
        </strong>
      </span>
      <span style={{ color: alphaColor(headerText, 0.72), fontWeight: 900, fontSize: "0.72em", textTransform: "uppercase", letterSpacing: "0.16em" }}>
        Live
      </span>
    </div>
  );
}

export function BetterChatMessage({
  msg,
  platform,
  nameColor,
  followerMessage = false,
  context,
  msgIdx,
}) {
  const c = context.config || {};
  const accent = context.badgeBg || context.usernameColor || "#38bdf8";
  const baseBg = context.messageBg || "rgba(255,255,255,0.07)";
  const rowPart = followerMessage ? "highlightedMessage" : "message";
  const resolveRowStyle = followerMessage
    ? context.highlightedMessageStyle || context.messagePartStyle
    : context.messagePartStyle;
  const messageStyle = resolveRowStyle({
    display: "grid",
    gridTemplateColumns: "34px minmax(0,1fr)",
    gap: 9,
    margin: `${Math.max(2, Number(context.msgSpacing) || 2)}px 8px`,
    padding: "8px 10px",
    borderRadius: Math.max(10, Number(context.borderRadius) || 12),
    background: followerMessage
      ? `linear-gradient(135deg, ${alphaColor(accent, 0.26)}, rgba(2,8,23,0.44))`
      : `linear-gradient(135deg, ${baseBg}, rgba(2,8,23,0.3))`,
    border: `${Number(context.borderWidth) || 1}px solid ${followerMessage ? alphaColor(accent, 0.5) : context.borderColor || alphaColor(accent, 0.24)}`,
    boxShadow: followerMessage
      ? `0 0 22px ${alphaColor(accent, 0.26)}, inset 0 1px 0 rgba(255,255,255,0.08)`
      : `0 8px 22px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.05)`,
    animation: followerMessage
      ? "better-rise 200ms ease-out both, better-soft-pulse 2.2s ease-in-out infinite"
      : "better-rise 200ms ease-out both",
    animationDelay: `${Math.min(msgIdx * 25, 180)}ms`,
  });
  return (
    <div style={messageStyle} {...attrs("chat", c, rowPart)}>
      <span
        style={context.avatarStyle({
          width: 34,
          height: 34,
          borderRadius: 10,
          display: "grid",
          placeItems: "center",
          background: alphaColor(nameColor || accent, 0.2),
          border: `1px solid ${alphaColor(nameColor || accent, 0.42)}`,
          color: nameColor || accent,
          fontWeight: 950,
          fontSize: 12,
        })}
        {...attrs("chat", c, "avatar")}
      >
        {initials(msg.username)}
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <strong
            style={context.usernameStyle({
              color: nameColor,
              fontWeight: 900,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            })}
            {...attrs("chat", c, "username")}
          >
            {msg.username || "viewer"}
          </strong>
          <span
            style={context.badgeStyle({
              flexShrink: 0,
              borderRadius: 999,
              background: alphaColor(platform?.color || accent, 0.18),
              color: platform?.color || accent,
              fontSize: 10,
              fontWeight: 900,
              padding: "1px 6px",
            })}
            {...attrs("chat", c, "badge")}
          >
            {platform?.icon || "C"}
          </span>
        </span>
        <span
          style={context.messageTextStyle({
            display: "block",
            marginTop: 2,
            color: context.textColor,
            lineHeight: context.msgLineHeight,
            overflowWrap: "anywhere",
          })}
          {...attrs("chat", c, "messageText")}
        >
          {msg.message}
        </span>
      </span>
    </div>
  );
}

export function BetterRtpStatsStyle({
  config,
  displaySlotName,
  displayProvider,
  displayProviderLogo,
  displayInfo,
  displayBestWin,
  currency,
  bestWinEmptyText,
  isLive,
  previewMode,
  showRtp = true,
  showPotential = true,
  showVolatility = true,
  showBestWin = true,
}) {
  const c = config || {};
  const accent = subValue(c, "rtpValue", "accentColor", c.rtpIconColor || c.accentColor || "#f59e0b");
  const bgFrom = subValue(c, "container", "background", c.barBgFrom || "#071226");
  const bgTo = c.barBgTo || "#030712";
  const text = subValue(c, "slotTitle", "textColor", c.slotNameColor || c.textColor || "#f8fafc");
  const muted = subValue(c, "label", "textColor", c.labelColor || "rgba(226,232,240,0.66)");
  const font = subValue(c, "container", "fontFamily", c.fontFamily || "'Inter', sans-serif");
  const fontSize = numberValue(subValue(c, "container", "fontSize", c.fontSize || 14), 14);
  const bestAmount = displayBestWin?.best_win
    ? `${currency}${Number(displayBestWin.best_win).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
    : bestWinEmptyText || "-";
  const bestMulti = displayBestWin?.best_multiplier ? ` / ${formatMultiplier(displayBestWin.best_multiplier)}` : "";

  return (
    <div
      className="oc-widget-inner rtp-stats-bar rtp-stats-bar--better"
      style={subElementStyle(c, "container", {
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "8px 14px",
        borderRadius: cssPx(c.borderRadius ?? 14, "14px"),
        background: `linear-gradient(180deg, ${bgFrom}, ${bgTo})`,
        border: `1px solid ${subValue(c, "container", "borderColor", c.borderColor || alphaColor(accent, 0.46))}`,
        color: text,
        fontFamily: font,
        fontSize,
        boxShadow: `0 14px 34px rgba(0,0,0,0.35), 0 0 20px ${alphaColor(accent, 0.22)}`,
        overflow: "hidden",
        position: "relative",
      })}
      {...attrs("rtp_stats", c, "container")}
    >
      <BetterStyleSheet />
      {!isLive && previewMode ? (
        <span style={{ position: "absolute", top: 5, right: 8, color: muted, fontSize: 9, fontWeight: 900, letterSpacing: "0.12em" }}>
          PREVIEW
        </span>
      ) : null}
      {displayProvider ? (
        <div
          style={subElementStyle(c, "provider", {
            display: "flex",
            alignItems: "center",
            gap: 8,
            minWidth: 0,
            flexShrink: 0,
          })}
          {...attrs("rtp_stats", c, "provider")}
        >
          {displayProviderLogo ? (
            <img src={displayProviderLogo} alt="" style={{ height: 30, maxWidth: 110, objectFit: "contain", borderRadius: 6 }} />
          ) : null}
          <span style={{ color: accent, fontWeight: 950, letterSpacing: "0.16em", textTransform: "uppercase", fontSize: fontSize * 0.78 }}>
            {displayProvider}
          </span>
        </div>
      ) : null}
      <div
        style={subElementStyle(c, "slotTitle", {
          minWidth: 0,
          flex: "1 1 auto",
        })}
        {...attrs("rtp_stats", c, "slotTitle")}
      >
        <strong style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: fontSize * 1.3, textTransform: "uppercase" }}>
          {displaySlotName || "-"}
        </strong>
      </div>
      {[
        ["rtpValue", "RTP", displayInfo?.rtp ? `${displayInfo.rtp}%` : "-"],
        ["maxWin", "Potential", formatMultiplier(displayInfo?.max_win_multiplier)],
        ["volatility", "Volatility", String(displayInfo?.volatility || "-").replace(/_/g, " ").toUpperCase()],
        ["personalBest", "Best win", `${bestAmount}${bestMulti}`],
      ]
        .filter(([part]) => {
          if (part === "rtpValue") return showRtp;
          if (part === "maxWin") return showPotential;
          if (part === "volatility") return showVolatility;
          if (part === "personalBest") return showBestWin;
          return true;
        })
        .map(([part, label, value]) => (
        <div
          key={part}
          style={subElementStyle(c, "statCard", {
            flexShrink: 0,
            minWidth: part === "personalBest" ? 150 : 92,
            padding: "6px 9px",
            borderRadius: 10,
            background: "rgba(255,255,255,0.055)",
            border: "1px solid rgba(255,255,255,0.08)",
          })}
          {...attrs("rtp_stats", c, "statCard")}
        >
          <span
            style={subElementStyle(c, "label", {
              display: "block",
              color: muted,
              fontSize: fontSize * 0.62,
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
            })}
            {...attrs("rtp_stats", c, "label")}
          >
            {label}
          </span>
          <strong
            style={subElementStyle(c, part, {
              display: "block",
              color: part === "rtpValue" ? accent : text,
              fontSize: fontSize * 0.95,
              whiteSpace: "nowrap",
            })}
            {...attrs("rtp_stats", c, part)}
          >
            {value}
          </strong>
        </div>
      ))}
    </div>
  );
}

export function BetterBackgroundStyle({ config }) {
  const c = config || {};
  const color1 = subValue(c, "texture", "background", c.color1 || "#030712");
  const color2 = subValue(c, "texture", "accentColor", c.color2 || "#1d4ed8");
  const color3 = subValue(c, "texture", "fillColor", c.color3 || "#f59e0b");
  const imageUrl = subValue(c, "media", "imageUrl", c.imageUrl || "");
  const videoUrl = subValue(c, "media", "videoUrl", c.videoUrl || "");
  const imageFit = subValue(c, "media", "imageFit", c.imageFit || "cover");
  const sourceMode = subValue(c, "source", "bgMode", c.bgMode || "texture");
  const opacity = Math.max(0, Math.min(100, numberValue(subValue(c, "canvas", "opacity", c.opacity ?? 100), 100))) / 100;
  const speed = Math.max(4, numberValue(subValue(c, "texture", "animSpeed", c.animSpeed || 10), 10));
  const mediaOpacityRaw = numberValue(subValue(c, "media", "opacity", c.mediaOpacity ?? 88), 88);
  const mediaOpacity = mediaOpacityRaw > 1 ? mediaOpacityRaw / 100 : mediaOpacityRaw;
  const mediaFilter = [
    `brightness(${subValue(c, "media", "brightness", c.brightness ?? 100)}%)`,
    `contrast(${subValue(c, "media", "contrast", c.contrast ?? 100)}%)`,
    `saturate(${subValue(c, "media", "saturation", c.saturation ?? 100)}%)`,
    `blur(${subValue(c, "media", "blur", c.blur ?? 0)}px)`,
    `hue-rotate(${subValue(c, "media", "hueRotate", c.hueRotate ?? 0)}deg)`,
    `grayscale(${subValue(c, "media", "grayscale", c.grayscale ?? 0)}%)`,
    `sepia(${subValue(c, "media", "sepia", c.sepia ?? 0)}%)`,
  ].join(" ");
  const imagePosition = subValue(c, "media", "backgroundPosition", c.imagePosition || "center");
  const tintColor = subValue(c, "tint", "background", c.overlayColor || "transparent");
  const tintOpacityRaw = numberValue(subValue(c, "tint", "opacity", c.overlayOpacity ?? 0), 0);
  const tintOpacity = tintOpacityRaw > 1 ? tintOpacityRaw / 100 : tintOpacityRaw;
  const particles = useMemo(
    () =>
      Array.from({ length: 22 }, (_, index) => ({
        left: `${(index * 37) % 100}%`,
        top: `${(index * 53) % 100}%`,
        size: 60 + ((index * 19) % 90),
        delay: `${(index % 8) * -0.8}s`,
        duration: `${speed + (index % 5)}s`,
        color: index % 3 === 0 ? color3 : color2,
      })),
    [color2, color3, speed],
  );

  const layerBase = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
  };

  return (
    <div
      className="oc-bg-widget oc-bg-widget--better"
      style={subElementStyle(c, "canvas", {
        width: "100%",
        height: "100%",
        borderRadius: cssPx(c.borderRadius ?? 0, "0px"),
        overflow: "hidden",
        opacity,
        position: "relative",
        background: color1,
      })}
      {...attrs("background", c, "canvas")}
    >
      <BetterStyleSheet />
      <div
        style={subElementStyle(c, "texture", {
          ...layerBase,
          background: `radial-gradient(circle at 20% 20%, ${alphaColor(color3, 0.28)}, transparent 30%), radial-gradient(circle at 82% 35%, ${alphaColor(color2, 0.32)}, transparent 34%), linear-gradient(135deg, ${color1}, ${alphaColor(color2, 0.48)} 52%, ${color1})`,
          filter: `saturate(${c.saturation ?? 100}%) contrast(${c.contrast ?? 100}%) brightness(${c.brightness ?? 100}%)`,
        })}
        {...attrs("background", c, "texture")}
      />
      {sourceMode === "image" && imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          style={subElementStyle(c, "media", {
            ...layerBase,
            objectFit: imageFit,
            objectPosition: imagePosition,
            opacity: mediaOpacity,
            filter: mediaFilter,
          })}
          {...attrs("background", c, "media")}
        />
      ) : null}
      {sourceMode === "video" && videoUrl ? (
        <video
          src={videoUrl}
          autoPlay
          loop
          muted
          playsInline
          style={subElementStyle(c, "media", {
            ...layerBase,
            objectFit: imageFit,
            objectPosition: imagePosition,
            opacity: mediaOpacity,
            filter: mediaFilter,
          })}
          {...attrs("background", c, "media")}
        />
      ) : null}
      <div
        style={subElementStyle(c, "tint", {
          ...layerBase,
          background: tintColor,
          opacity: tintOpacity,
          pointerEvents: "none",
        })}
        {...attrs("background", c, "tint")}
      />
      <div
        style={subElementStyle(c, "effects", {
          ...layerBase,
          overflow: "hidden",
          pointerEvents: "none",
        })}
        {...attrs("background", c, "effects")}
      >
        {particles.map((particle, index) => (
          <span
            key={index}
            style={{
              position: "absolute",
              left: particle.left,
              top: particle.top,
              width: particle.size,
              height: particle.size,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${alphaColor(particle.color, 0.26)}, transparent 68%)`,
              filter: "blur(14px)",
              animation: `better-float ${particle.duration} ease-in-out ${particle.delay} infinite`,
              "--float-x": `${index % 2 ? -26 : 22}px`,
              "--float-y": `${index % 3 ? -18 : 20}px`,
            }}
          />
        ))}
      </div>
      <div
        style={{
          ...layerBase,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "54px 54px",
          maskImage: "linear-gradient(180deg, rgba(0,0,0,0.9), rgba(0,0,0,0.18))",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
