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

const BETTER_BETS_CARD_COLORS = [
  { accent: "#2fa1ff", accent2: "#19e3ff" },
  { accent: "#a06bff", accent2: "#ff4fd8" },
  { accent: "#22e0a6", accent2: "#8bf06b" },
  { accent: "#ff9d42", accent2: "#ff4d5e" },
  { accent: "#ff5c8a", accent2: "#ffb84d" },
  { accent: "#ffd542", accent2: "#6ee86e" },
];

const BETTER_BETS_THEME_VARS = {
  neon: {
    "--ui-accent": "#1e9bff",
    "--text-bright": "#f2f9ff",
    "--text-dim": "#9fc9f5",
    "--stage-bg":
      "radial-gradient(circle at 50% 47%,rgba(0,86,207,0.19),transparent 37%),linear-gradient(135deg,#00040e,#020818 47%,#000308)",
    "--frame-border": "#1385e9",
    "--frame-bg":
      "linear-gradient(90deg,rgba(0,116,230,0.11),transparent 17%,transparent 83%,rgba(0,116,230,0.11)),linear-gradient(155deg,#031a49,#020e2f 26%,#010818)",
    "--frame-shadow":
      "0 0 0 1px rgba(4,35,93,0.9) inset,0 0 0 3px rgba(0,42,109,0.44),0 0 calc(11px * var(--glow-mult)) rgba(0,127,255,0.94),0 0 calc(27px * var(--glow-mult)) rgba(0,51,168,0.76),inset 0 0 23px rgba(0,100,255,0.17)",
    "--bracket-color": "#6fb8ff",
    "--bracket-filter": "drop-shadow(0 0 3px #0a89ff)",
    "--sheen-color": "rgba(166,226,255,0.075)",
    "--title-glow": "0 0 7px rgba(102,193,255,0.95),0 1px 2px rgba(0,0,0,0.9)",
    "--meta-border": "#073b91",
    "--meta-bg":
      "linear-gradient(180deg,rgba(3,27,77,0.94),rgba(1,13,43,0.91))",
    "--meta-shadow":
      "inset 0 1px 7px rgba(15,123,255,0.19),0 1px 7px rgba(0,55,158,0.35)",
    "--meta-divider": "rgba(16,83,176,0.55)",
    "--card-frame-mix": "#0a3a75",
    "--card-bg":
      "radial-gradient(ellipse at 35% 110%,color-mix(in srgb,var(--accent) 30%,transparent),transparent 40%),linear-gradient(130deg,#031c52,#010a24 62%,#021338)",
    "--card-shadow":
      "inset 0 0 calc(16px * var(--glow-mult)) color-mix(in srgb,var(--accent) 26%,transparent),inset 0 1px 0 rgba(152,217,255,0.12),0 0 calc(7px * var(--glow-mult)) color-mix(in srgb,var(--accent) 55%,transparent)",
    "--card-hover-shadow":
      "inset 0 0 calc(19px * var(--glow-mult)) color-mix(in srgb,var(--accent) 32%,transparent),0 0 calc(13px * var(--glow-mult)) color-mix(in srgb,var(--accent) 80%,transparent)",
    "--card-full-shadow":
      "inset 0 0 20px color-mix(in srgb,var(--accent) 22%,transparent),0 0 6px color-mix(in srgb,var(--accent) 45%,transparent)",
    "--card-topline": "rgba(169,225,255,0.75)",
    "--badge-bg":
      "radial-gradient(circle at 40% 35%,color-mix(in srgb,var(--accent) 75%,white 5%),color-mix(in srgb,var(--accent) 40%,#05245c 60%) 70%)",
    "--badge-shadow":
      "0 0 0 2px rgba(2,15,40,0.6),0 0 calc(8px * var(--glow-mult)) var(--accent),inset 0 0 5px rgba(255,255,255,0.55)",
    "--hard-shadow": "0 1px 3px rgba(0,0,0,0.95)",
    "--soft-glow": "0 0 5px rgba(113,196,255,0.75),0 1px 2px rgba(0,0,0,0.85)",
    "--detail-glow":
      "0 0 calc(8px * var(--glow-mult)) color-mix(in srgb,var(--accent) 80%,transparent)",
    "--scrim-bg":
      "linear-gradient(180deg,rgba(1,6,18,0.08),rgba(1,6,18,0.3) 55%,rgba(1,6,18,0.55))",
    "--glint-bg":
      "linear-gradient(90deg,transparent,color-mix(in srgb,var(--accent) 60%,white 40%) 47%,transparent)",
    "--glint-glow": "0 0 calc(7px * var(--glow-mult)) 2px var(--accent)",
    "--footer-rule": "rgba(8,73,164,0.56)",
  },
  metallic: {
    "--ui-accent": "#a9bdd8",
    "--text-bright": "#eef4fb",
    "--text-dim": "#a7b6c9",
    "--stage-bg":
      "radial-gradient(circle at 50% 42%,rgba(140,160,190,0.12),transparent 45%),linear-gradient(160deg,#14191f,#0b0f14 52%,#06080b)",
    "--frame-border": "#8fa1b8",
    "--frame-bg": "linear-gradient(155deg,#39434f,#232b35 32%,#141a21 70%,#0e1318)",
    "--frame-shadow":
      "inset 0 1px 0 rgba(255,255,255,0.25),inset 0 -1px 0 rgba(0,0,0,0.7),0 0 0 1px #05070a,0 8px 22px rgba(0,0,0,0.6)",
    "--bracket-color": "#d7e2f0",
    "--bracket-filter": "none",
    "--sheen-color": "rgba(235,244,255,0.14)",
    "--title-glow": "0 1px 0 rgba(0,0,0,0.8),0 -1px 0 rgba(255,255,255,0.14)",
    "--meta-border": "#4d5b6d",
    "--meta-bg": "linear-gradient(180deg,#3a4450,#262e38 55%,#1a2129)",
    "--meta-shadow":
      "inset 0 1px 0 rgba(255,255,255,0.14),inset 0 -3px 8px rgba(0,0,0,0.45)",
    "--meta-divider": "rgba(120,138,160,0.35)",
    "--card-frame-mix": "#6d7f96",
    "--card-bg":
      "linear-gradient(115deg,rgba(255,255,255,0.07),transparent 30%),radial-gradient(ellipse at 35% 110%,color-mix(in srgb,var(--accent) 16%,transparent),transparent 42%),linear-gradient(145deg,color-mix(in srgb,var(--accent) 9%,#39434f),#1d242d 55%,#131820)",
    "--card-shadow":
      "inset 0 1px 0 rgba(255,255,255,0.16),inset 0 -6px 12px rgba(0,0,0,0.5),0 1px 0 rgba(0,0,0,0.6)",
    "--card-hover-shadow":
      "inset 0 1px 0 rgba(255,255,255,0.24),inset 0 -6px 12px rgba(0,0,0,0.5),0 0 10px color-mix(in srgb,var(--accent) 35%,transparent)",
    "--card-full-shadow":
      "inset 0 1px 0 rgba(255,255,255,0.1),inset 0 -6px 12px rgba(0,0,0,0.5)",
    "--card-topline": "rgba(235,244,255,0.55)",
    "--badge-bg": "linear-gradient(160deg,#e8eef6,#9fb0c6 30%,#4d5b6d 70%,#2a333f)",
    "--badge-shadow": "0 1px 2px rgba(0,0,0,0.7),inset 0 1px 1px rgba(255,255,255,0.8)",
    "--hard-shadow": "0 1px 2px rgba(0,0,0,0.9)",
    "--soft-glow": "0 1px 1px rgba(0,0,0,0.75)",
    "--detail-glow": "none",
    "--scrim-bg":
      "linear-gradient(180deg,rgba(8,11,15,0.05),rgba(8,11,15,0.28) 55%,rgba(8,11,15,0.5))",
    "--glint-bg": "linear-gradient(90deg,transparent,rgba(255,255,255,0.85) 47%,transparent)",
    "--glint-glow": "0 1px 2px rgba(0,0,0,0.5)",
    "--glint-opacity": "0.5",
    "--footer-rule": "rgba(120,138,160,0.3)",
  },
  gradient: {
    "--ui-accent": "#5b7cfa",
    "--text-bright": "#f4f7ff",
    "--text-dim": "#aebdf2",
    "--stage-bg":
      "radial-gradient(circle at 18% 20%,rgba(91,124,250,0.16),transparent 40%),radial-gradient(circle at 82% 80%,rgba(34,211,238,0.12),transparent 42%),linear-gradient(140deg,#0a0f2e,#101c44 48%,#071426)",
    "--frame-border": "#4f6cf0",
    "--frame-bg": "linear-gradient(150deg,#1b2566,#131a4a 35%,#0a1130 70%,#081226)",
    "--frame-shadow":
      "0 0 0 1px rgba(30,42,110,0.9) inset,0 0 calc(18px * var(--glow-mult)) rgba(79,108,240,0.5),0 0 calc(34px * var(--glow-mult)) rgba(34,211,238,0.22),inset 0 0 26px rgba(79,108,240,0.16)",
    "--bracket-color": "#9db4ff",
    "--bracket-filter": "drop-shadow(0 0 3px #5b7cfa)",
    "--sheen-color": "rgba(200,214,255,0.09)",
    "--title-glow": "0 0 8px rgba(130,156,255,0.9),0 1px 2px rgba(0,0,0,0.85)",
    "--meta-border": "#34408f",
    "--meta-bg": "linear-gradient(120deg,rgba(35,45,120,0.92),rgba(16,24,68,0.92))",
    "--meta-shadow": "inset 0 1px 8px rgba(91,124,250,0.22)",
    "--meta-divider": "rgba(80,96,190,0.45)",
    "--card-frame-mix": "#2c3a8c",
    "--card-bg":
      "linear-gradient(135deg,color-mix(in srgb,var(--accent) 22%,#10174a),#0a1030 55%,color-mix(in srgb,var(--accent-2) 14%,#081226))",
    "--card-shadow":
      "inset 0 0 calc(18px * var(--glow-mult)) color-mix(in srgb,var(--accent) 20%,transparent),0 0 calc(8px * var(--glow-mult)) color-mix(in srgb,var(--accent) 40%,transparent)",
    "--card-hover-shadow":
      "inset 0 0 calc(22px * var(--glow-mult)) color-mix(in srgb,var(--accent) 30%,transparent),0 0 calc(16px * var(--glow-mult)) color-mix(in srgb,var(--accent) 70%,transparent)",
    "--card-full-shadow": "inset 0 0 20px color-mix(in srgb,var(--accent) 24%,transparent)",
    "--card-topline": "color-mix(in srgb,var(--accent) 50%,white 50%)",
    "--badge-bg": "linear-gradient(140deg,var(--accent),var(--accent-2))",
    "--badge-shadow":
      "0 0 0 2px rgba(8,14,40,0.65),0 0 calc(9px * var(--glow-mult)) var(--accent),inset 0 0 5px rgba(255,255,255,0.45)",
    "--hard-shadow": "0 1px 3px rgba(0,0,0,0.9)",
    "--soft-glow": "0 0 6px rgba(130,156,255,0.7),0 1px 2px rgba(0,0,0,0.85)",
    "--detail-glow":
      "0 0 calc(9px * var(--glow-mult)) color-mix(in srgb,var(--accent) 75%,transparent)",
    "--scrim-bg":
      "linear-gradient(180deg,rgba(6,10,28,0.1),rgba(6,10,28,0.32) 55%,rgba(6,10,28,0.58))",
    "--glint-bg": "linear-gradient(90deg,transparent,var(--accent-2) 47%,transparent)",
    "--glint-glow": "0 0 calc(8px * var(--glow-mult)) 2px var(--accent)",
    "--footer-rule": "rgba(80,96,190,0.45)",
  },
  matte: {
    "--ui-accent": "#8b98a9",
    "--text-bright": "#e8ecf1",
    "--text-dim": "#98a3b1",
    "--stage-bg": "linear-gradient(180deg,#14171c,#101318)",
    "--frame-border": "#333b47",
    "--frame-bg": "linear-gradient(180deg,#1d222b,#181d24)",
    "--frame-shadow": "0 0 0 1px #0b0d11,0 10px 24px rgba(0,0,0,0.45)",
    "--bracket-color": "#4a5462",
    "--bracket-filter": "none",
    "--sheen-color": "transparent",
    "--title-glow": "none",
    "--meta-border": "#2c333d",
    "--meta-bg": "#20262f",
    "--meta-shadow": "none",
    "--meta-divider": "#2c333d",
    "--card-frame-mix": "#39424f",
    "--card-bg": "linear-gradient(180deg,#232932,#1e242c)",
    "--card-shadow": "inset 0 0 0 1px rgba(255,255,255,0.03)",
    "--card-hover-shadow": "inset 0 0 0 1px rgba(255,255,255,0.06),0 4px 10px rgba(0,0,0,0.3)",
    "--card-full-shadow": "inset 0 0 0 1px rgba(255,255,255,0.03)",
    "--card-topline": "rgba(255,255,255,0.1)",
    "--badge-bg": "color-mix(in srgb,var(--accent) 30%,#2a313b)",
    "--badge-shadow": "inset 0 0 0 1px rgba(255,255,255,0.12)",
    "--hard-shadow": "none",
    "--soft-glow": "none",
    "--detail-glow": "none",
    "--scrim-bg":
      "linear-gradient(180deg,rgba(16,19,24,0),rgba(16,19,24,0.42) 60%,rgba(16,19,24,0.6))",
    "--glint-bg": "linear-gradient(90deg,transparent,rgba(255,255,255,0.22) 47%,transparent)",
    "--glint-glow": "none",
    "--glint-opacity": "0.6",
    "--footer-rule": "#2c333d",
  },
  crimson: {
    "--ui-accent": "#e03050",
    "--text-bright": "#fff0f3",
    "--text-dim": "#f0a0b0",
    "--stage-bg":
      "radial-gradient(circle at 50% 45%,rgba(192,25,46,0.18),transparent 40%),linear-gradient(145deg,#0e0305,#1a0610 50%,#0a0208)",
    "--frame-border": "#a01830",
    "--frame-bg": "linear-gradient(155deg,#3a0c18,#200810 30%,#100408)",
    "--frame-shadow":
      "0 0 0 1px rgba(60,8,18,0.9) inset,0 0 calc(14px * var(--glow-mult)) rgba(200,30,60,0.7),0 0 calc(30px * var(--glow-mult)) rgba(140,15,30,0.5),inset 0 0 20px rgba(200,30,60,0.15)",
    "--bracket-color": "#ff6b81",
    "--bracket-filter": "drop-shadow(0 0 3px #c0192e)",
    "--sheen-color": "rgba(255,150,170,0.06)",
    "--title-glow": "0 0 7px rgba(255,80,100,0.9),0 1px 2px rgba(0,0,0,0.9)",
    "--meta-border": "#5a1020",
    "--meta-bg": "linear-gradient(180deg,rgba(50,10,20,0.94),rgba(20,5,10,0.91))",
    "--meta-shadow": "inset 0 1px 7px rgba(200,30,60,0.2)",
    "--meta-divider": "rgba(120,30,50,0.5)",
    "--card-frame-mix": "#6a1828",
    "--card-bg":
      "radial-gradient(ellipse at 35% 110%,color-mix(in srgb,var(--accent) 25%,transparent),transparent 40%),linear-gradient(130deg,#2a0810,#140408 62%,#1a0610)",
    "--card-shadow":
      "inset 0 0 calc(16px * var(--glow-mult)) color-mix(in srgb,var(--accent) 24%,transparent),0 0 calc(7px * var(--glow-mult)) color-mix(in srgb,var(--accent) 50%,transparent)",
    "--card-hover-shadow":
      "inset 0 0 calc(19px * var(--glow-mult)) color-mix(in srgb,var(--accent) 30%,transparent),0 0 calc(13px * var(--glow-mult)) color-mix(in srgb,var(--accent) 75%,transparent)",
    "--card-full-shadow": "inset 0 0 20px color-mix(in srgb,var(--accent) 20%,transparent)",
    "--card-topline": "rgba(255,150,170,0.6)",
    "--badge-bg":
      "radial-gradient(circle at 40% 35%,color-mix(in srgb,var(--accent) 75%,white 5%),color-mix(in srgb,var(--accent) 40%,#2a0810 60%) 70%)",
    "--badge-shadow":
      "0 0 0 2px rgba(10,2,5,0.6),0 0 calc(8px * var(--glow-mult)) var(--accent),inset 0 0 5px rgba(255,255,255,0.5)",
    "--hard-shadow": "0 1px 3px rgba(0,0,0,0.95)",
    "--soft-glow": "0 0 5px rgba(255,80,100,0.7),0 1px 2px rgba(0,0,0,0.85)",
    "--detail-glow":
      "0 0 calc(8px * var(--glow-mult)) color-mix(in srgb,var(--accent) 75%,transparent)",
    "--scrim-bg":
      "linear-gradient(180deg,rgba(10,2,5,0.08),rgba(10,2,5,0.3) 55%,rgba(10,2,5,0.55))",
    "--glint-bg":
      "linear-gradient(90deg,transparent,color-mix(in srgb,var(--accent) 60%,white 40%) 47%,transparent)",
    "--glint-glow": "0 0 calc(7px * var(--glow-mult)) 2px var(--accent)",
    "--footer-rule": "rgba(120,30,50,0.5)",
  },
  emerald: {
    "--ui-accent": "#10b981",
    "--text-bright": "#ecfdf5",
    "--text-dim": "#86efac",
    "--stage-bg":
      "radial-gradient(circle at 50% 45%,rgba(5,150,105,0.16),transparent 40%),linear-gradient(145deg,#010e08,#041a12 50%,#010a06)",
    "--frame-border": "#059669",
    "--frame-bg": "linear-gradient(155deg,#0a3020,#061a10 30%,#030e08)",
    "--frame-shadow":
      "0 0 0 1px rgba(4,40,25,0.9) inset,0 0 calc(14px * var(--glow-mult)) rgba(16,185,129,0.6),0 0 calc(30px * var(--glow-mult)) rgba(5,100,65,0.45),inset 0 0 20px rgba(16,185,129,0.14)",
    "--bracket-color": "#34d399",
    "--bracket-filter": "drop-shadow(0 0 3px #059669)",
    "--sheen-color": "rgba(134,239,172,0.06)",
    "--title-glow": "0 0 7px rgba(52,211,153,0.9),0 1px 2px rgba(0,0,0,0.9)",
    "--meta-border": "#0a5040",
    "--meta-bg": "linear-gradient(180deg,rgba(6,40,28,0.94),rgba(3,18,12,0.91))",
    "--meta-shadow": "inset 0 1px 7px rgba(16,185,129,0.18)",
    "--meta-divider": "rgba(16,100,70,0.5)",
    "--card-frame-mix": "#0a5040",
    "--card-bg":
      "radial-gradient(ellipse at 35% 110%,color-mix(in srgb,var(--accent) 25%,transparent),transparent 40%),linear-gradient(130deg,#0a2818,#05140c 62%,#081e12)",
    "--card-shadow":
      "inset 0 0 calc(16px * var(--glow-mult)) color-mix(in srgb,var(--accent) 24%,transparent),0 0 calc(7px * var(--glow-mult)) color-mix(in srgb,var(--accent) 50%,transparent)",
    "--card-hover-shadow":
      "inset 0 0 calc(19px * var(--glow-mult)) color-mix(in srgb,var(--accent) 30%,transparent),0 0 calc(13px * var(--glow-mult)) color-mix(in srgb,var(--accent) 75%,transparent)",
    "--card-full-shadow": "inset 0 0 20px color-mix(in srgb,var(--accent) 20%,transparent)",
    "--card-topline": "rgba(134,239,172,0.6)",
    "--badge-bg":
      "radial-gradient(circle at 40% 35%,color-mix(in srgb,var(--accent) 75%,white 5%),color-mix(in srgb,var(--accent) 40%,#051a0c 60%) 70%)",
    "--badge-shadow":
      "0 0 0 2px rgba(2,10,6,0.6),0 0 calc(8px * var(--glow-mult)) var(--accent),inset 0 0 5px rgba(255,255,255,0.5)",
    "--hard-shadow": "0 1px 3px rgba(0,0,0,0.95)",
    "--soft-glow": "0 0 5px rgba(52,211,153,0.7),0 1px 2px rgba(0,0,0,0.85)",
    "--detail-glow":
      "0 0 calc(8px * var(--glow-mult)) color-mix(in srgb,var(--accent) 75%,transparent)",
    "--scrim-bg":
      "linear-gradient(180deg,rgba(2,6,4,0.08),rgba(2,6,4,0.3) 55%,rgba(2,6,4,0.55))",
    "--glint-bg":
      "linear-gradient(90deg,transparent,color-mix(in srgb,var(--accent) 60%,white 40%) 47%,transparent)",
    "--glint-glow": "0 0 calc(7px * var(--glow-mult)) 2px var(--accent)",
    "--footer-rule": "rgba(16,100,70,0.5)",
  },
  sunset: {
    "--ui-accent": "#e06920",
    "--text-bright": "#fff8f0",
    "--text-dim": "#f0c8a0",
    "--stage-bg":
      "radial-gradient(circle at 50% 50%,rgba(224,105,32,0.14),transparent 40%),linear-gradient(150deg,#0a0604,#1a0f05 50%,#080402)",
    "--frame-border": "#c05818",
    "--frame-bg": "linear-gradient(155deg,#3a2210,#201208 30%,#100806)",
    "--frame-shadow":
      "0 0 0 1px rgba(60,28,8,0.9) inset,0 0 calc(14px * var(--glow-mult)) rgba(224,105,32,0.6),0 0 calc(30px * var(--glow-mult)) rgba(160,70,15,0.4),inset 0 0 20px rgba(224,105,32,0.14)",
    "--bracket-color": "#fbbf24",
    "--bracket-filter": "drop-shadow(0 0 3px #e06920)",
    "--sheen-color": "rgba(251,191,36,0.06)",
    "--title-glow": "0 0 7px rgba(251,191,36,0.9),0 1px 2px rgba(0,0,0,0.9)",
    "--meta-border": "#5a3010",
    "--meta-bg": "linear-gradient(180deg,rgba(50,24,8,0.94),rgba(20,10,4,0.91))",
    "--meta-shadow": "inset 0 1px 7px rgba(224,105,32,0.18)",
    "--meta-divider": "rgba(120,60,20,0.5)",
    "--card-frame-mix": "#6a3818",
    "--card-bg":
      "radial-gradient(ellipse at 35% 110%,color-mix(in srgb,var(--accent) 25%,transparent),transparent 40%),linear-gradient(130deg,#2a1408,#140a04 62%,#1a0e06)",
    "--card-shadow":
      "inset 0 0 calc(16px * var(--glow-mult)) color-mix(in srgb,var(--accent) 24%,transparent),0 0 calc(7px * var(--glow-mult)) color-mix(in srgb,var(--accent) 50%,transparent)",
    "--card-hover-shadow":
      "inset 0 0 calc(19px * var(--glow-mult)) color-mix(in srgb,var(--accent) 30%,transparent),0 0 calc(13px * var(--glow-mult)) color-mix(in srgb,var(--accent) 75%,transparent)",
    "--card-full-shadow": "inset 0 0 20px color-mix(in srgb,var(--accent) 20%,transparent)",
    "--card-topline": "rgba(251,191,36,0.6)",
    "--badge-bg":
      "radial-gradient(circle at 40% 35%,color-mix(in srgb,var(--accent) 75%,white 5%),color-mix(in srgb,var(--accent) 40%,#1a0a04 60%) 70%)",
    "--badge-shadow":
      "0 0 0 2px rgba(10,4,2,0.6),0 0 calc(8px * var(--glow-mult)) var(--accent),inset 0 0 5px rgba(255,255,255,0.5)",
    "--hard-shadow": "0 1px 3px rgba(0,0,0,0.95)",
    "--soft-glow": "0 0 5px rgba(251,191,36,0.7),0 1px 2px rgba(0,0,0,0.85)",
    "--detail-glow":
      "0 0 calc(8px * var(--glow-mult)) color-mix(in srgb,var(--accent) 75%,transparent)",
    "--scrim-bg":
      "linear-gradient(180deg,rgba(6,3,1,0.08),rgba(6,3,1,0.3) 55%,rgba(6,3,1,0.55))",
    "--glint-bg":
      "linear-gradient(90deg,transparent,color-mix(in srgb,var(--accent) 60%,white 40%) 47%,transparent)",
    "--glint-glow": "0 0 calc(7px * var(--glow-mult)) 2px var(--accent)",
    "--footer-rule": "rgba(120,60,20,0.5)",
  },
  void: {
    "--ui-accent": "#7c3aed",
    "--text-bright": "#f5f3ff",
    "--text-dim": "#c4b5fd",
    "--stage-bg":
      "radial-gradient(circle at 50% 45%,rgba(124,58,237,0.14),transparent 40%),linear-gradient(145deg,#040210,#0a0414 50%,#030108)",
    "--frame-border": "#6d28d9",
    "--frame-bg": "linear-gradient(155deg,#1e0a44,#10062a 30%,#08031a)",
    "--frame-shadow":
      "0 0 0 1px rgba(30,10,68,0.9) inset,0 0 calc(14px * var(--glow-mult)) rgba(124,58,237,0.6),0 0 calc(30px * var(--glow-mult)) rgba(80,30,160,0.45),inset 0 0 20px rgba(124,58,237,0.14)",
    "--bracket-color": "#c084fc",
    "--bracket-filter": "drop-shadow(0 0 3px #7c3aed)",
    "--sheen-color": "rgba(196,181,253,0.06)",
    "--title-glow": "0 0 7px rgba(192,132,252,0.9),0 1px 2px rgba(0,0,0,0.9)",
    "--meta-border": "#3b1880",
    "--meta-bg": "linear-gradient(180deg,rgba(25,10,60,0.94),rgba(10,4,28,0.91))",
    "--meta-shadow": "inset 0 1px 7px rgba(124,58,237,0.18)",
    "--meta-divider": "rgba(80,40,150,0.5)",
    "--card-frame-mix": "#3b1880",
    "--card-bg":
      "radial-gradient(ellipse at 35% 110%,color-mix(in srgb,var(--accent) 25%,transparent),transparent 40%),linear-gradient(130deg,#180a38,#0c0520 62%,#120830)",
    "--card-shadow":
      "inset 0 0 calc(16px * var(--glow-mult)) color-mix(in srgb,var(--accent) 24%,transparent),0 0 calc(7px * var(--glow-mult)) color-mix(in srgb,var(--accent) 50%,transparent)",
    "--card-hover-shadow":
      "inset 0 0 calc(19px * var(--glow-mult)) color-mix(in srgb,var(--accent) 30%,transparent),0 0 calc(13px * var(--glow-mult)) color-mix(in srgb,var(--accent) 75%,transparent)",
    "--card-full-shadow": "inset 0 0 20px color-mix(in srgb,var(--accent) 20%,transparent)",
    "--card-topline": "rgba(196,181,253,0.6)",
    "--badge-bg":
      "radial-gradient(circle at 40% 35%,color-mix(in srgb,var(--accent) 75%,white 5%),color-mix(in srgb,var(--accent) 40%,#08031a 60%) 70%)",
    "--badge-shadow":
      "0 0 0 2px rgba(4,2,10,0.6),0 0 calc(8px * var(--glow-mult)) var(--accent),inset 0 0 5px rgba(255,255,255,0.5)",
    "--hard-shadow": "0 1px 3px rgba(0,0,0,0.95)",
    "--soft-glow": "0 0 5px rgba(192,132,252,0.7),0 1px 2px rgba(0,0,0,0.85)",
    "--detail-glow":
      "0 0 calc(8px * var(--glow-mult)) color-mix(in srgb,var(--accent) 75%,transparent)",
    "--scrim-bg":
      "linear-gradient(180deg,rgba(3,1,8,0.08),rgba(3,1,8,0.3) 55%,rgba(3,1,8,0.55))",
    "--glint-bg":
      "linear-gradient(90deg,transparent,color-mix(in srgb,var(--accent) 60%,white 40%) 47%,transparent)",
    "--glint-glow": "0 0 calc(7px * var(--glow-mult)) 2px var(--accent)",
    "--footer-rule": "rgba(80,40,150,0.5)",
  },
};

function normalizeBetterBetsTheme(theme) {
  return Object.hasOwn(BETTER_BETS_THEME_VARS, theme) ? theme : "neon";
}

function normalizeBetterBetsFillStyle(fillStyle) {
  return ["liquid", "solid", "pulse", "scanline", "plasma"].includes(fillStyle)
    ? fillStyle
    : "liquid";
}

function normalizeBetterBetsLayoutMode(layoutMode) {
  return layoutMode === "bars" ? "bars" : "cards";
}

function normalizeBetterBetsOrientation(orientation) {
  return orientation === "horizontal" ? "horizontal" : "vertical";
}

function formatBetterBetsDuration(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safe / 60);
  return `${minutes}:${String(safe % 60).padStart(2, "0")}`;
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
      @keyframes better-bets-widget-enter{from{opacity:0;transform:scale(.96) translateY(8px)}to{opacity:1;transform:none}}
      @keyframes better-bets-option-enter{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:none}}
      @keyframes better-bets-sheen{0%,65%,100%{transform:translateX(0) rotate(22deg);opacity:0}72%{opacity:1}87%{transform:translateX(430px) rotate(22deg);opacity:0}}
      @keyframes better-bets-open-pulse{0%,100%{opacity:1;box-shadow:0 0 3px #ffd448}50%{opacity:.45;box-shadow:0 0 8px #ffd448}}
      @keyframes better-bets-liquid-wave{0%{transform:translateX(0) scaleY(1)}25%{transform:translateX(-8px) scaleY(1.18)}50%{transform:translateX(0) scaleY(.85)}75%{transform:translateX(8px) scaleY(1.14)}100%{transform:translateX(0) scaleY(1)}}
      @keyframes better-bets-pulse-glow{0%,100%{filter:brightness(1);opacity:.86}50%{filter:brightness(1.3);opacity:1}}
      @keyframes better-bets-pulse-ring{0%,100%{transform:scaleX(.7);opacity:.35}50%{transform:scaleX(1.08);opacity:.9}}
      @keyframes better-bets-scan-sweep{0%{transform:translateY(120%)}100%{transform:translateY(-120%)}}
      @keyframes better-bets-plasma-1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(36px,-18px) scale(1.2)}}
      @keyframes better-bets-plasma-2{0%,100%{transform:translate(0,0) scale(.9)}50%{transform:translate(-42px,12px) scale(1.15)}}
      @keyframes better-bets-plasma-3{0%,100%{transform:translate(0,0) scale(1.1)}50%{transform:translate(16px,22px) scale(.82)}}
      @keyframes better-bets-bar-sheen{0%{left:-20%;opacity:0}15%{opacity:1}60%{left:105%;opacity:0}100%{left:105%;opacity:0}}
      .better-bets-stage{width:100%;height:100%;min-width:0;min-height:0;display:grid;place-items:center;overflow:hidden;padding:16px;box-sizing:border-box;background:var(--stage-bg);font-family:var(--font-body,"Rajdhani",Arial,sans-serif)}
      .better-bets-stage *{box-sizing:border-box}
      .better-bets-stage[data-font="cyber"]{--font-display:"Orbitron",sans-serif;--font-body:"Rajdhani",sans-serif;--title-tracking:.1em}
      .better-bets-stage[data-font="sport"]{--font-display:"Oswald",sans-serif;--font-body:"Barlow",sans-serif;--title-tracking:.05em}
      .better-bets-stage[data-font="tech"]{--font-display:"Chakra Petch",sans-serif;--font-body:"Chakra Petch",sans-serif;--title-tracking:.08em}
      .better-bets-stage[data-font="classic"]{--font-display:"Russo One",sans-serif;--font-body:"Titillium Web",sans-serif;--title-tracking:.03em}
      .better-bets-stage .bet-widget{position:relative;width:var(--base-w,360px);min-height:var(--base-h,412px);overflow:hidden;border:1px solid var(--frame-border);border-radius:var(--card-radius);padding:8px 10px 7px;background:var(--frame-bg);box-shadow:var(--frame-shadow);opacity:var(--widget-opacity);isolation:isolate;animation:better-bets-widget-enter 650ms cubic-bezier(.2,.8,.2,1) both;color:var(--text-bright)}
      .better-bets-stage .bet-widget.is-horizontal{width:var(--base-w,640px);min-height:var(--base-h,240px)}
      .better-bets-stage .bet-widget::before,.better-bets-stage .bet-widget::after{position:absolute;z-index:-1;width:16px;height:16px;content:"";border-color:var(--bracket-color,#6fb8ff);filter:var(--bracket-filter,drop-shadow(0 0 3px #0a89ff));transition:opacity 250ms}
      .better-bets-stage .bet-widget::before{top:3px;left:3px;border-top:1px solid;border-left:1px solid}
      .better-bets-stage .bet-widget::after{right:3px;bottom:3px;border-right:1px solid;border-bottom:1px solid}
      .better-bets-stage .bet-widget.hide-brackets::before,.better-bets-stage .bet-widget.hide-brackets::after{opacity:0}
      .better-bets-stage .widget-sheen{position:absolute;z-index:-1;top:-80%;left:-55%;width:30%;height:230%;transform:rotate(22deg);background:linear-gradient(90deg,transparent,var(--sheen-color,rgba(166,226,255,.075)),transparent);animation:better-bets-sheen 7s ease-in-out infinite 1.3s;transition:opacity 250ms}
      .better-bets-stage .bet-widget.hide-sheen .widget-sheen{opacity:0;animation:none}
      .better-bets-stage .widget-header{display:flex;height:24px;align-items:center;justify-content:space-between;gap:8px;padding:0 7px 0 4px}
      .better-bets-stage .title-lockup{display:flex;min-width:0;align-items:center;gap:6px;color:var(--text-bright);font-family:var(--font-display);font-size:calc(12.5px * var(--fs));font-weight:700;letter-spacing:var(--title-tracking,.1em);text-transform:uppercase;text-shadow:var(--title-glow)}
      .better-bets-stage .title-lockup h1{min-width:0;overflow:hidden;margin:0;font:inherit;text-overflow:ellipsis;white-space:nowrap}
      .better-bets-stage .title-mark{display:block;width:5px;height:13px;flex:0 0 auto;transform:skewX(-23deg);border-top:1px solid var(--ui-accent);border-bottom:1px solid var(--ui-accent);border-left:2px solid var(--ui-accent);box-shadow:2px 0 0 -1px var(--ui-accent),0 0 7px var(--ui-accent)}
      .better-bets-stage .open-status{display:inline-flex;height:18px;flex:0 0 auto;align-items:center;gap:4px;border:1px solid var(--status-border,#d7a519);border-radius:4px;padding:0 6px;color:var(--status-text,#ffe887);background:var(--status-bg,linear-gradient(#3c3514,#1d190a));box-shadow:var(--status-shadow,0 0 5px rgba(255,194,21,.42),inset 0 0 4px rgba(255,232,106,.15));font-size:calc(9.5px * var(--fs));font-weight:700;letter-spacing:.3px;text-transform:uppercase}
      .better-bets-stage .open-status i{width:5px;height:5px;border-radius:50%;background:currentColor;box-shadow:0 0 4px currentColor;animation:better-bets-open-pulse 1.7s ease-in-out infinite}
      .better-bets-stage .event-meta{display:grid;height:40px;grid-template-columns:repeat(3,1fr);margin-top:2px;overflow:hidden;border:1px solid var(--meta-border);border-radius:calc(var(--card-radius) - 2px);background:var(--meta-bg);box-shadow:var(--meta-shadow)}
      .better-bets-stage .meta-item{display:flex;min-width:0;flex-direction:column;align-items:center;justify-content:center}
      .better-bets-stage .meta-item+.meta-item{border-left:1px solid var(--meta-divider)}
      .better-bets-stage .meta-item strong{max-width:100%;overflow:hidden;color:var(--text-bright);font-family:var(--font-display);font-size:calc(12px * var(--fs));font-weight:700;line-height:14px;text-overflow:ellipsis;text-shadow:var(--soft-glow);white-space:nowrap}
      .better-bets-stage .meta-item span{display:flex;align-items:center;gap:3px;color:var(--text-dim);font-size:calc(9.5px * var(--fs));font-weight:600;line-height:12px}
      .better-bets-stage .meta-item svg{width:10px;height:10px;color:var(--ui-accent);stroke:currentColor}
      .better-bets-stage .bets-grid,.better-bets-stage .bars-grid{display:grid;grid-template-columns:repeat(var(--cols,2),minmax(0,1fr));gap:6px;margin-top:6px}
      .better-bets-stage .bet-option{position:relative;display:flex;height:98px;overflow:hidden;flex-direction:column;border:1px solid color-mix(in srgb,var(--accent) 65%,var(--card-frame-mix) 35%);border-radius:var(--card-radius);padding:10px 9px 7px;color:var(--text-bright);text-align:left;background:var(--card-bg);box-shadow:var(--card-shadow);transition:transform 180ms,border-color 180ms,box-shadow 180ms,background 300ms,border-radius 200ms;animation:better-bets-option-enter 480ms cubic-bezier(.2,.8,.2,1) both}
      .better-bets-stage .bet-option::before{position:absolute;top:0;right:0;left:0;height:1px;content:"";background:linear-gradient(90deg,transparent,var(--card-topline),transparent)}
      .better-bets-stage .bet-option.is-selected{border-color:color-mix(in srgb,var(--accent) 90%,white 10%);box-shadow:var(--card-hover-shadow)}
      .better-bets-stage .bet-option.is-loser{opacity:.58;filter:saturate(.65)}
      .better-bets-stage .bet-option.is-winner{border-color:color-mix(in srgb,var(--accent) 88%,white 12%);box-shadow:var(--card-hover-shadow)}
      .better-bets-stage .bet-option.is-full{box-shadow:var(--card-full-shadow)}
      .better-bets-stage .fill-wrap{position:absolute;z-index:0;inset:0;overflow:hidden;pointer-events:none}
      .better-bets-stage .fill-bloom{position:absolute;bottom:-15px;left:15%;right:15%;height:28px;border-radius:50%;filter:blur(12px);opacity:.6;background:var(--accent)}
      .better-bets-stage .fill-core{position:absolute;right:0;bottom:0;left:0;height:var(--pct);transition:height 600ms cubic-bezier(.22,1,.36,1);background:linear-gradient(180deg,color-mix(in srgb,var(--accent) 28%,transparent),color-mix(in srgb,var(--accent-2) 85%,transparent))}
      .better-bets-stage .fill-liquid .fill-core::before,.better-bets-stage .fill-liquid .fill-core::after{content:"";position:absolute;left:-20%;right:-20%;top:-12px;height:24px;border-radius:50%;background:color-mix(in srgb,var(--accent) 42%,transparent);animation:better-bets-liquid-wave var(--fill-dur,3.2s) ease-in-out infinite}
      .better-bets-stage .fill-liquid .fill-core::after{top:-8px;background:color-mix(in srgb,var(--accent-2) 28%,transparent);animation-delay:calc(var(--fill-dur,3.2s) * -.35)}
      .better-bets-stage .fill-pulse .fill-core{animation:better-bets-pulse-glow var(--fill-dur,3.2s) ease-in-out infinite}
      .better-bets-stage .fill-pulse .pulse-ring{position:absolute;right:10%;bottom:0;left:10%;height:3px;border-radius:50%;box-shadow:0 0 18px 6px color-mix(in srgb,var(--accent) 55%,transparent);animation:better-bets-pulse-ring var(--fill-dur,3.2s) ease-in-out infinite}
      .better-bets-stage .fill-scanline .fill-core{background:repeating-linear-gradient(0deg,color-mix(in srgb,var(--accent) 18%,transparent) 0 2px,color-mix(in srgb,var(--accent) 52%,transparent) 2px 4px),linear-gradient(180deg,color-mix(in srgb,var(--accent) 32%,transparent),color-mix(in srgb,var(--accent-2) 80%,transparent))}
      .better-bets-stage .fill-scanline .scan-sweep{position:absolute;right:0;bottom:0;left:0;height:20px;background:linear-gradient(180deg,transparent,color-mix(in srgb,var(--accent) 62%,transparent),transparent);animation:better-bets-scan-sweep calc(var(--fill-dur,3.2s) * .8) linear infinite;opacity:.7}
      .better-bets-stage .fill-plasma .plasma-blob{position:absolute;width:40px;height:40px;border-radius:50%;filter:blur(14px);opacity:.6;mix-blend-mode:screen}
      .better-bets-stage .fill-plasma .plasma-blob-1{bottom:5%;left:10%;background:var(--accent-2);animation:better-bets-plasma-1 var(--fill-dur,3.2s) ease-in-out infinite}
      .better-bets-stage .fill-plasma .plasma-blob-2{right:15%;bottom:20%;background:var(--accent);animation:better-bets-plasma-2 calc(var(--fill-dur,3.2s) * 1.3) ease-in-out infinite}
      .better-bets-stage .fill-plasma .plasma-blob-3{bottom:40%;left:40%;background:var(--accent-2);animation:better-bets-plasma-3 calc(var(--fill-dur,3.2s) * .9) ease-in-out infinite}
      .better-bets-stage .option-scrim{position:absolute;z-index:1;inset:0;background:var(--scrim-bg);pointer-events:none}
      .better-bets-stage .option-number,.better-bets-stage .option-range,.better-bets-stage .option-details,.better-bets-stage .option-glint{position:relative;z-index:2}
      .better-bets-stage .option-number{display:grid;width:22px;height:22px;place-items:center;border:1px solid color-mix(in srgb,var(--accent) 80%,white 20%);border-radius:50%;color:#fff;background:var(--badge-bg);box-shadow:var(--badge-shadow);font-family:var(--font-display);font-size:calc(11.5px * var(--fs));font-weight:700;line-height:1;text-shadow:0 1px 2px rgba(0,0,0,.6)}
      .better-bets-stage .option-range{min-width:0;overflow:hidden;margin-top:7px;color:#fff;font-size:calc(11.5px * var(--fs));font-weight:700;letter-spacing:.02em;text-overflow:ellipsis;text-shadow:var(--hard-shadow);white-space:nowrap}
      .better-bets-stage .option-details{display:flex;margin-top:auto;flex-direction:column;align-items:center;text-align:center;text-shadow:var(--detail-glow),var(--hard-shadow)}
      .better-bets-stage .option-details strong{color:#fff;font-family:var(--font-display);font-size:calc(21px * var(--fs));font-weight:700;letter-spacing:.01em;line-height:calc(20px * var(--fs))}
      .better-bets-stage .option-details small{max-width:100%;overflow:hidden;color:#eaf4ff;font-size:calc(10px * var(--fs));font-weight:700;letter-spacing:.1em;line-height:calc(14px * var(--fs));text-overflow:ellipsis;text-transform:uppercase;white-space:nowrap}
      .better-bets-stage .option-glint{position:absolute;bottom:3px;left:50%;width:70%;height:2px;transform:translateX(-50%);background:var(--glint-bg);box-shadow:var(--glint-glow);opacity:var(--glint-opacity,.85)}
      .better-bets-stage .bet-entry{display:flex;height:24px;align-items:center;justify-content:center;gap:5px;margin-top:6px;border-top:1px solid var(--footer-rule);color:var(--text-dim);font-size:calc(10px * var(--fs))}
      .better-bets-stage .bet-entry>span{color:var(--ui-accent,#3d8cd4);letter-spacing:1px}
      .better-bets-stage .bet-entry input{width:min(170px,52%);border:0;outline:0;color:var(--text-bright);background:transparent;font-size:calc(10px * var(--fs));font-weight:600;text-align:center}
      .better-bets-stage .bet-entry input::placeholder{color:var(--text-dim);opacity:1}
      .better-bets-stage .bet-entry kbd{padding:1px 4px;border:1px solid var(--meta-divider);border-radius:2px;color:var(--text-dim);background:rgba(6,34,80,.35);font-size:calc(8px * var(--fs))}
      .better-bets-stage .bet-bar{position:relative;display:grid;height:40px;overflow:hidden;grid-template-columns:22px minmax(52px,auto) 1fr auto;align-items:center;gap:8px;border:1px solid color-mix(in srgb,var(--accent) 55%,var(--card-frame-mix) 45%);border-radius:calc(var(--card-radius) * .8);padding:0 10px 0 6px;color:var(--text-bright);text-align:left;background:var(--card-bg);box-shadow:var(--card-shadow);animation:better-bets-option-enter 480ms cubic-bezier(.2,.8,.2,1) both}
      .better-bets-stage .bet-bar.is-selected,.better-bets-stage .bet-bar.is-winner{border-color:color-mix(in srgb,var(--accent) 90%,white 10%);box-shadow:var(--card-hover-shadow)}
      .better-bets-stage .bet-bar.is-loser{opacity:.58;filter:saturate(.65)}
      .better-bets-stage .bar-num{display:grid;width:20px;height:20px;place-items:center;border:1px solid color-mix(in srgb,var(--accent) 80%,white 20%);border-radius:50%;color:#fff;background:var(--badge-bg);box-shadow:var(--badge-shadow);font-family:var(--font-display);font-size:calc(10px * var(--fs));font-weight:700;line-height:1;text-shadow:0 1px 2px rgba(0,0,0,.6)}
      .better-bets-stage .bar-range{min-width:0;overflow:hidden;color:#fff;font-size:calc(10.5px * var(--fs));font-weight:700;letter-spacing:.02em;text-overflow:ellipsis;text-shadow:var(--hard-shadow);white-space:nowrap}
      .better-bets-stage .bar-track{position:relative;height:12px;overflow:hidden;border-radius:6px;background:color-mix(in srgb,var(--accent) 12%,rgba(0,0,0,.45));box-shadow:inset 0 1px 3px rgba(0,0,0,.6),inset 0 0 0 1px color-mix(in srgb,var(--accent) 25%,transparent)}
      .better-bets-stage .bar-pct{min-width:38px;color:#fff;font-family:var(--font-display);font-size:calc(11px * var(--fs));font-weight:700;text-align:right;text-shadow:var(--detail-glow),var(--hard-shadow)}
      .better-bets-stage .bf{position:absolute;inset:0;overflow:hidden;pointer-events:none}
      .better-bets-stage .bf-core{position:absolute;top:0;bottom:0;left:0;width:var(--pct);border-radius:6px 2px 2px 6px;background:linear-gradient(90deg,color-mix(in srgb,var(--accent) 52%,transparent),var(--accent),var(--accent-2));transition:width 700ms cubic-bezier(.22,1,.36,1)}
      .better-bets-stage .bf-core::after{content:"";position:absolute;top:0;right:0;left:0;height:45%;border-radius:6px 0 0 0;background:linear-gradient(180deg,rgba(255,255,255,.35),transparent)}
      .better-bets-stage .bf-liquid .bf-sheen{position:absolute;top:0;bottom:0;width:34px;transform:skewX(-18deg);background:linear-gradient(90deg,transparent,rgba(255,255,255,.45),transparent);animation:better-bets-bar-sheen calc(var(--fill-dur,3.2s) * 1.4) ease-in-out infinite}
      .better-bets-stage .bf-scanline .bf-core{background:repeating-linear-gradient(90deg,color-mix(in srgb,var(--accent) 22%,transparent) 0 2px,color-mix(in srgb,var(--accent) 58%,transparent) 2px 4px),linear-gradient(90deg,var(--accent),var(--accent-2))}
      .better-bets-stage .bf-scanline .bf-sweep{position:absolute;top:0;bottom:0;width:18px;background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--accent) 68%,transparent),transparent);animation:better-bets-bar-sheen calc(var(--fill-dur,3.2s) * .9) linear infinite}
      .better-bets-stage .bf-pulse .bf-tip{position:absolute;top:50%;left:var(--pct);width:6px;height:6px;transform:translate(-50%,-50%);border-radius:50%;background:var(--accent-2);box-shadow:0 0 10px 3px var(--accent-2);animation:better-bets-pulse-glow var(--fill-dur,3.2s) ease-in-out infinite;transition:left 700ms cubic-bezier(.22,1,.36,1)}
      .better-bets-stage .bf-plasma .bf-blob{position:absolute;top:50%;width:26px;height:26px;border-radius:50%;filter:blur(8px);opacity:.65;mix-blend-mode:screen}
      .better-bets-stage .bf-plasma .bf-blob-1{left:4%;background:var(--accent-2);animation:better-bets-plasma-1 calc(var(--fill-dur,3.2s) * 1.2) ease-in-out infinite}
      .better-bets-stage .bf-plasma .bf-blob-2{left:60%;background:var(--accent);animation:better-bets-plasma-2 var(--fill-dur,3.2s) ease-in-out infinite}
      .better-bets-stage[data-theme="metallic"] .option-number,.better-bets-stage[data-theme="metallic"] .bar-num{color:#1a2129;border-color:#e8eef6;text-shadow:0 1px 0 rgba(255,255,255,.5)}
      .better-bets-stage[data-theme="matte"] .open-status{border-color:#6b5d24;color:#e8cf6a;background:#26221a;box-shadow:none}
      .better-bets-stage[data-anim="off"] .widget-sheen,.better-bets-stage[data-anim="off"] .bet-widget,.better-bets-stage[data-anim="off"] .bet-option,.better-bets-stage[data-anim="off"] .bet-bar,.better-bets-stage[data-anim="off"] .fill-core,.better-bets-stage[data-anim="off"] .pulse-ring,.better-bets-stage[data-anim="off"] .scan-sweep,.better-bets-stage[data-anim="off"] .plasma-blob,.better-bets-stage[data-anim="off"] .bf-sheen,.better-bets-stage[data-anim="off"] .bf-tip,.better-bets-stage[data-anim="off"] .bf-blob{animation:none!important;transition:none!important}
      @media (max-width:520px){.better-bets-stage{padding:8px}.better-bets-stage .bet-widget,.better-bets-stage .bet-widget.is-horizontal{width:100%;min-height:0}.better-bets-stage .bar-range{display:none}}
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

function BetterBetsMetaIcon({ type }) {
  if (type === "timer") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="13" r="8" strokeWidth="2" />
        <path d="M12 9v5l3 2M9 2h6" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "users") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0Z" strokeWidth="2" />
        <path d="M4 21a8 8 0 0 1 16 0" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" strokeWidth="2" />
      <path d="M12 7v10M9 9.5h4.5a2 2 0 0 1 0 4H10.5" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function BetterBetsCardFill({ config, fillStyle, pct, stateId }) {
  return (
    <span
      className={`fill-wrap fill-${fillStyle}`}
      style={subElementStyle(config, "progressBar", {
        "--pct": `${pct}%`,
      }, stateId)}
      {...attrs("bets", config, "progressBar", stateId)}
      aria-hidden="true"
    >
      <span className="fill-core" />
      {fillStyle === "pulse" && <span className="pulse-ring" />}
      {fillStyle === "scanline" && <span className="scan-sweep" />}
      {fillStyle === "plasma" && (
        <>
          <span className="plasma-blob plasma-blob-1" />
          <span className="plasma-blob plasma-blob-2" />
          <span className="plasma-blob plasma-blob-3" />
        </>
      )}
      <span className="fill-bloom" />
    </span>
  );
}

function BetterBetsBarFill({ config, fillStyle, pct, stateId }) {
  return (
    <span
      className={`bf bf-${fillStyle}`}
      style={subElementStyle(config, "progressBar", {
        "--pct": `${pct}%`,
      }, stateId)}
      {...attrs("bets", config, "progressBar", stateId)}
      aria-hidden="true"
    >
      <span className="bf-core" />
      {fillStyle === "liquid" && <span className="bf-sheen" />}
      {fillStyle === "pulse" && <span className="bf-tip" />}
      {fillStyle === "scanline" && <span className="bf-sweep" />}
      {fillStyle === "plasma" && (
        <>
          <span className="bf-blob bf-blob-1" />
          <span className="bf-blob bf-blob-2" />
        </>
      )}
    </span>
  );
}

export function BetterBetsStyle({ config, countdown, statusLabel }) {
  const c = config || {};
  const fallbackOptions = [
    { label: "0 - 99" },
    { label: "100 - 199" },
    { label: "200 - 299" },
    { label: "300 - 399" },
    { label: "400 - 499" },
    { label: "500 - 599" },
  ];
  const options = safeArray(c.options).length ? safeArray(c.options) : fallbackOptions;
  const bets = c.bets || {};
  const betters = c.betters || {};
  const visibleLimit = Math.max(
    2,
    Math.min(6, numberValue(c.betterVisibleOptions, 6)),
  );
  const visibleOptions = options.slice(0, visibleLimit);
  const totalPool = visibleOptions.reduce(
    (sum, _, index) => sum + (Number(bets[`opt_${index}`]) || 0),
    0,
  );
  const totalBetters = Object.keys(betters).length;
  const winnerIdx = c.winnerOption ?? null;
  const status = c.gameStatus || "idle";
  const pcts = visibleOptions.map((_, index) =>
    totalPool > 0
      ? Math.round(((Number(bets[`opt_${index}`]) || 0) / totalPool) * 100)
      : 0,
  );
  const leadingIdx = (() => {
    if (status !== "open" || totalPool <= 0) return -1;
    const highest = Math.max(...pcts);
    if (highest < 25) return -1;
    const sorted = [...pcts].sort((a, b) => b - a);
    if (highest < (sorted[1] ?? 0) + 15) return -1;
    return pcts.indexOf(highest);
  })();
  const theme = normalizeBetterBetsTheme(c.theme || c.betTheme);
  const fillStyle = normalizeBetterBetsFillStyle(c.fillStyle || c.betFillStyle);
  const layoutMode = normalizeBetterBetsLayoutMode(c.layoutMode || c.betLayoutMode);
  const orientation = normalizeBetterBetsOrientation(c.orientation);
  const columns = Math.max(
    1,
    Math.min(3, numberValue(c.columns ?? c.betterColumns, layoutMode === "bars" ? 1 : 2)),
  );
  const rows = Math.max(1, Math.ceil(visibleOptions.length / columns));
  const itemHeight = layoutMode === "cards" ? 98 : 40;
  const baseWidth = orientation === "horizontal" ? 640 : 360;
  const baseHeight = Math.max(
    orientation === "horizontal" ? 220 : 240,
    26 + 42 + 30 + 16 + rows * itemHeight + Math.max(0, rows - 1) * 6,
  );
  const fontScale = Math.max(0.75, Math.min(1.4, numberValue(c.fontScale, 100) / 100));
  const glowIntensity = Math.max(0, Math.min(2, numberValue(c.glowIntensity, 100) / 100));
  const opacity = Math.max(0.4, Math.min(1, numberValue(c.opacity, 100) / 100));
  const fillSpeed = Math.max(10, numberValue(c.fillSpeed, 100));
  const cardRadius = cssPx(
    subValue(c, "widgetBackground", "radius", c.borderRadius ?? 8),
    "8px",
  );
  const fontFamily = subValue(c, "widgetBackground", "fontFamily", undefined);
  const colors =
    safeArray(c.cardColors).length >= 2
      ? safeArray(c.cardColors)
      : BETTER_BETS_CARD_COLORS;
  const command = c.chatCommand || "!bet";
  const timeText =
    status === "open"
      ? statusLabel || formatBetterBetsDuration(countdown)
      : status === "locked"
        ? "LOCKED"
        : status === "result"
          ? "RESULT"
          : "IDLE";
  const statusText =
    status === "open"
      ? "OPEN"
      : status === "locked"
        ? "LOCKED"
        : status === "result"
          ? "RESULT"
          : "IDLE";
  const stageStyle = {
    ...BETTER_BETS_THEME_VARS[theme],
    "--fs": fontScale,
    "--card-radius": cardRadius,
    "--glow-mult": glowIntensity,
    "--widget-opacity": opacity,
    "--fill-dur": `${3.2 * (100 / fillSpeed)}s`,
    "--cols": columns,
    "--base-w": `${baseWidth}px`,
    "--base-h": `${baseHeight}px`,
    ...(fontFamily ? { "--font-body": fontFamily, "--font-display": fontFamily } : {}),
  };
  const widgetStyle = subElementStyle(c, "widgetBackground", {});
  const statusTone =
    status === "open"
      ? {}
      : {
          "--status-border": "rgba(148,163,184,0.38)",
          "--status-text": "var(--text-dim)",
          "--status-bg": "rgba(15,23,42,0.68)",
          "--status-shadow": "none",
        };

  return (
    <div
      className="better-bets-stage"
      data-theme={theme}
      data-font={c.font || "cyber"}
      data-fill={fillStyle}
      data-anim={c.animations === false ? "off" : "on"}
      style={stageStyle}
    >
      <BetterStyleSheet />
      <section
        className={[
          "bet-widget",
          c.showBrackets === false && "hide-brackets",
          c.showSheen === false && "hide-sheen",
          orientation === "horizontal" && "is-horizontal",
        ]
          .filter(Boolean)
          .join(" ")}
        data-cols={columns}
        style={widgetStyle}
        {...attrs("bets", c, "widgetBackground")}
      >
        <div className="widget-sheen" aria-hidden="true" />
        <header
          className="widget-header"
          style={subElementStyle(c, "header", {})}
          {...attrs("bets", c, "header")}
        >
          <div className="title-lockup">
            <span className="title-mark" aria-hidden="true" />
            <h1>{c.question || "Place Your Bets"}</h1>
          </div>
          <span
            className="open-status"
            style={subElementStyle(c, "status", statusTone, status)}
            {...attrs("bets", c, "status", status)}
          >
            <i aria-hidden="true" />
            {statusText}
          </span>
        </header>

        <div className="event-meta">
          {[
            ["poolStat", "pool", formatCompactNumber(totalPool), "Pool"],
            ["timerStat", "timer", timeText, status === "open" ? "Timer" : "State"],
            ["betsStat", "users", formatCompactNumber(totalBetters), "Bets"],
          ].map(([part, icon, value, label]) => (
            <div
              key={part}
              className="meta-item"
              style={subElementStyle(c, part, {})}
              {...attrs("bets", c, part)}
            >
              <strong>{value}</strong>
              <span>
                <BetterBetsMetaIcon type={icon} />
                {label}
              </span>
            </div>
          ))}
        </div>

        <div
          className={layoutMode === "bars" ? "bars-grid" : "bets-grid"}
          style={subElementStyle(c, "betCards", {})}
          {...attrs("bets", c, "betCards")}
        >
          {visibleOptions.map((option, index) => {
            const amount = Number(bets[`opt_${index}`]) || 0;
            const pct = pcts[index] || 0;
            const fillPct = totalPool > 0 ? pct : 0;
            const isWinner = winnerIdx === index;
            const isLoser = winnerIdx !== null && winnerIdx !== index;
            const isLeading = leadingIdx === index;
            const stateId = isWinner
              ? "winner"
              : isLoser
                ? "loser"
                : isLeading
                  ? "leading"
                  : status === "locked"
                    ? "closed"
                    : "default";
            const baseColor = colors[index % colors.length] || BETTER_BETS_CARD_COLORS[index % BETTER_BETS_CARD_COLORS.length];
            const accent = subValue(c, "progressBar", "fillColor", baseColor.accent, stateId);
            const accent2 = baseColor.accent2 || accent;
            const optionLabel = betOptionLabel(option, index);
            const detailLabel = isWinner
              ? "Winner"
              : isLoser
                ? "Closed"
                : amount > 0
                  ? `${formatCompactNumber(amount)} pts`
                  : `${command} ${index + 1}`;
            const optionVars = {
              "--fill": `${fillPct}%`,
              "--pct": `${fillPct}%`,
              "--accent": accent,
              "--accent-2": accent2,
              animationDelay: `${index * 50}ms`,
            };

            if (layoutMode === "bars") {
              return (
                <div
                  key={`${index}-${optionLabel}`}
                  className={[
                    "bet-bar",
                    isWinner && "is-winner",
                    isLoser && "is-loser",
                    isLeading && "is-selected",
                    fillPct >= 100 && totalPool > 0 && "is-full",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={subElementStyle(c, "individualBetCard", optionVars, stateId)}
                  {...attrs("bets", c, "individualBetCard", stateId)}
                  data-appearance-index={index}
                >
                  <span
                    className="bar-num"
                    style={subElementStyle(c, "cardNumberBadge", {}, stateId)}
                    {...attrs("bets", c, "cardNumberBadge", stateId)}
                  >
                    {index + 1}
                  </span>
                  <span
                    className="bar-range"
                    style={subElementStyle(c, "cardRangeText", {}, stateId)}
                    {...attrs("bets", c, "cardRangeText", stateId)}
                  >
                    {optionLabel}
                  </span>
                  <span className="bar-track">
                    <BetterBetsBarFill
                      config={c}
                      fillStyle={fillStyle}
                      pct={fillPct}
                      stateId={stateId}
                    />
                  </span>
                  <span
                    className="bar-pct"
                    style={subElementStyle(c, "cardPercentageText", {}, stateId)}
                    {...attrs("bets", c, "cardPercentageText", stateId)}
                  >
                    {pct}%
                  </span>
                </div>
              );
            }

            return (
              <div
                key={`${index}-${optionLabel}`}
                className={[
                  "bet-option",
                  isWinner && "is-winner",
                  isLoser && "is-loser",
                  isLeading && "is-selected",
                  fillPct >= 100 && totalPool > 0 && "is-full",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={subElementStyle(c, "individualBetCard", optionVars, stateId)}
                {...attrs("bets", c, "individualBetCard", stateId)}
                data-appearance-index={index}
              >
                <BetterBetsCardFill
                  config={c}
                  fillStyle={fillStyle}
                  pct={fillPct}
                  stateId={stateId}
                />
                <span className="option-scrim" aria-hidden="true" />
                <span
                  className="option-number"
                  style={subElementStyle(c, "cardNumberBadge", {}, stateId)}
                  {...attrs("bets", c, "cardNumberBadge", stateId)}
                >
                  {index + 1}
                </span>
                <span
                  className="option-range"
                  style={subElementStyle(c, "cardRangeText", {}, stateId)}
                  {...attrs("bets", c, "cardRangeText", stateId)}
                >
                  {optionLabel}
                </span>
                <span className="option-details">
                  <strong
                    style={subElementStyle(c, "cardPercentageText", {}, stateId)}
                    {...attrs("bets", c, "cardPercentageText", stateId)}
                  >
                    {pct}%
                  </strong>
                  <small
                    style={subElementStyle(c, "cardLabel", {}, stateId)}
                    {...attrs("bets", c, "cardLabel", stateId)}
                  >
                    {detailLabel}
                  </small>
                </span>
                <span className="option-glint" aria-hidden="true" />
              </div>
            );
          })}
        </div>

        <div
          className="bet-entry"
          style={subElementStyle(c, "footerInstruction", {})}
          {...attrs("bets", c, "footerInstruction")}
        >
          <span>&gt;&gt;&gt;</span>
          <input
            readOnly
            value=""
            placeholder={`Type ${command} <number> <amount>`}
            aria-label="Bet command hint"
          />
          <kbd>Enter</kbd>
        </div>
      </section>
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
