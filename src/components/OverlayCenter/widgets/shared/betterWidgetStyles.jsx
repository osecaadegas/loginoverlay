import React, { useEffect, useMemo, useState } from "react";
import { Trophy, Zap } from "lucide-react";
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

function clampNumber(value, min, max, fallback) {
  const number = numberValue(value, fallback);
  return Math.min(Math.max(number, min), max);
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

function normalizedUsername(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function twitchAvatarProxyUrl(username) {
  const login = normalizedUsername(username);
  return login ? `https://unavatar.io/twitch/${encodeURIComponent(login)}` : "";
}

function betterChatAvatarUrl(msg = {}) {
  return (
    msg.avatarUrl ||
    msg.profileImageUrl ||
    msg.profile_image_url ||
    msg.userAvatar ||
    msg.photoUrl ||
    msg.raidAvatar ||
    msg.metadata?.avatarUrl ||
    msg.metadata?.profileImageUrl ||
    (msg.platform === "twitch" ? twitchAvatarProxyUrl(msg.login || msg.username || msg.user) : "")
  );
}

function betterChatMessageText(msg = {}) {
  return msg.message || msg.text || "";
}

function betterChatMessageType(msg = {}) {
  const raw = String(msg.type || msg.eventType || msg.noticeType || "").toLowerCase();
  if (msg.isRaid || raw === "raid") return "raid";
  if (msg.giftCount || msg.metadata?.giftCount || raw.includes("gift")) return "gift";
  if (msg.isSub || msg.metadata?.isSub || raw === "sub" || raw === "subscriber") return "sub";
  return "message";
}

function betterChatGiftTier(msg = {}) {
  const count = Number(msg.giftCount || msg.metadata?.giftCount || msg.gift_count || 0);
  if (count >= 11) return "large";
  if (count >= 2) return "medium";
  return count >= 1 ? "single" : "";
}

const GIVEAWAY_FONT_STACKS = {
  orbitron: "'Orbitron', sans-serif",
  rajdhani: "'Rajdhani', sans-serif",
  chakra: "'Chakra Petch', sans-serif",
  audiowide: "'Audiowide', cursive",
  bebas: "'Bebas Neue', sans-serif",
  inter: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  mono: "ui-monospace, 'Courier New', monospace",
  serif: "Georgia, 'Times New Roman', serif",
};

function giveawayFontStack(key, fallback = "rajdhani") {
  return GIVEAWAY_FONT_STACKS[key] || GIVEAWAY_FONT_STACKS[fallback] || GIVEAWAY_FONT_STACKS.rajdhani;
}

function stripBang(value) {
  return String(value || "").trim().replace(/^!+/, "");
}

function normalizeHue(value, fallback = 208) {
  const hue = numberValue(value, fallback);
  return ((hue % 360) + 360) % 360;
}

function giveawayParticipant(value, index) {
  const name =
    typeof value === "string"
      ? value
      : value?.name || value?.username || value?.displayName || value?.user || `Entry ${index + 1}`;
  return {
    id: typeof value === "object" && value?.id ? String(value.id) : `${name}-${index}`,
    name: String(name || `Entry ${index + 1}`),
    hue: normalizeHue(typeof value === "object" ? value?.hue : undefined, 198 + index * 41),
  };
}

function BetterGiveawayGiftIcon() {
  return (
    <svg className="better-gw-gift-icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect className="better-gw-gift-box" x="4" y="10" width="16" height="10" rx="2" />
      <path className="better-gw-gift-lid" d="M3 7.5h18v4H3z" />
      <path className="better-gw-gift-ribbon" d="M12 7.5V20M4.5 12h15" />
      <path className="better-gw-gift-bow" d="M12 7.5c-3.6-.2-5.1-1.1-5.1-2.5 0-1 .8-1.8 1.9-1.8 1.5 0 2.5 1.5 3.2 4.3Zm0 0c3.6-.2 5.1-1.1 5.1-2.5 0-1-.8-1.8-1.9-1.8-1.5 0-2.5 1.5-3.2 4.3Z" />
    </svg>
  );
}

function BetterGiveawayBroadcastIcon() {
  return (
    <svg className="better-gw-broadcast-icon" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="1.5" />
      <path d="M5.7 5.7a3.25 3.25 0 0 0 0 4.6M10.3 5.7a3.25 3.25 0 0 1 0 4.6M3.4 3.4a6.5 6.5 0 0 0 0 9.2M12.6 3.4a6.5 6.5 0 0 1 0 9.2" />
    </svg>
  );
}

function BetterGiveawayRoulette({ participants, phase, winnerName, durationSec }) {
  const crowd = participants.length
    ? participants
    : [{ id: "waiting", name: "Waiting", hue: 208 }];
  const repeats = Math.max(3, Math.ceil(14 / crowd.length));
  const chips = Array.from({ length: repeats }, () => crowd).flat();
  const winnerKey = String(winnerName || "").toLowerCase();

  return (
    <div className={`better-gw-roulette-stage better-gw-roulette-stage--${phase}`}>
      <div className={`better-gw-winner-banner${phase === "winner" && winnerName ? " is-shown" : ""}`} role="status" aria-live="polite">
        {winnerName ? (
          <>
            <Trophy className="better-gw-winner-crown" size={14} aria-hidden="true" />
            <span className="better-gw-winner-kicker">Winner</span>
            <strong className="better-gw-winner-name">{winnerName}</strong>
          </>
        ) : null}
      </div>

      <div className="better-gw-roulette-viewport">
        <div
          className="better-gw-roulette-track"
          style={{ "--gw-spin-duration": `${clampNumber(durationSec, 1.2, 12, 5.2)}s` }}
        >
          {chips.map((participant, index) => {
            const isWinner =
              winnerKey &&
              String(participant.name || "").toLowerCase() === winnerKey;
            return (
              <div
                key={`${participant.id}-${index}`}
                className={`better-gw-avatar-chip${phase === "winner" && isWinner ? " is-winner" : ""}`}
              >
                <span
                  className="better-gw-avatar-bubble"
                  style={{
                    background: `linear-gradient(140deg, hsl(${participant.hue} 88% 58%), hsl(${normalizeHue(participant.hue + 42)} 92% 42%))`,
                  }}
                >
                  {initials(participant.name)}
                </span>
                <span className="better-gw-avatar-name">{participant.name}</span>
                {phase === "winner" && isWinner ? <span className="better-gw-chip-crown">WIN</span> : null}
              </div>
            );
          })}
        </div>
        <div className="better-gw-roulette-pointer" aria-hidden="true">
          <i className="better-gw-pointer-notch better-gw-pointer-top" />
          <i className="better-gw-pointer-line" />
          <i className="better-gw-pointer-notch better-gw-pointer-bottom" />
        </div>
      </div>

      <div className="better-gw-roulette-status">
        {phase === "spinning" ? <span className="better-gw-status-spin">Drawing winner...</span> : null}
        {phase === "winner" && winnerName ? (
          <span className="better-gw-status-win">
            <Trophy size={12} aria-hidden="true" /> {winnerName} takes the prize
          </span>
        ) : null}
      </div>
    </div>
  );
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
    bonus?.imageSrc ||
    bonus?.slotImage ||
    bonus?.slotImageUrl ||
    bonus?.slot_image_url ||
    bonus?.cover ||
    bonus?.coverUrl ||
    bonus?.thumbnail ||
    bonus?.slot?.image ||
    bonus?.slot?.imageUrl ||
    bonus?.slot?.image_url ||
    bonus?.slot?.imageSrc ||
    bonus?.slot?.slotImageUrl ||
    bonus?.slot?.slot_image_url ||
    bonus?.slot?.cover ||
    bonus?.slot?.coverUrl ||
    bonus?.slot?.thumbnail ||
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
      bonusPayout(bonus) > 0,
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

function normalizeVolatilityLevel(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    const level = Math.min(4, Math.max(0, Math.round(value)));
    const labels = ["-", "Low", "Medium", "High", "Very High"];
    return { level, label: labels[level] || "-" };
  }
  const text = String(value || "").trim().toLowerCase().replace(/[_-]+/g, " ");
  if (!text || text === "-") return { level: 0, label: "-" };
  const numericLevel = Number(text);
  if (Number.isFinite(numericLevel)) {
    const level = Math.min(4, Math.max(0, Math.round(numericLevel)));
    const labels = ["-", "Low", "Medium", "High", "Very High"];
    return { level, label: labels[level] || "-" };
  }
  if (text.includes("extreme") || text.includes("very high") || text.includes("extra high")) {
    return { level: 4, label: "Very High" };
  }
  if (text.includes("high")) return { level: 3, label: "High" };
  if (text.includes("medium") || text.includes("med")) return { level: 2, label: "Medium" };
  if (text.includes("low")) return { level: 1, label: "Low" };
  return { level: 0, label: String(value).replace(/_/g, " ") };
}

function firstKnownVolatility(...values) {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    const normalized = text.toLowerCase().replace(/[_-]+/g, " ");
    if (
      !text ||
      text === "-" ||
      text === "—" ||
      text === "â€”" ||
      normalized === "unknown" ||
      normalized === "n/a" ||
      normalized === "na" ||
      normalized === "null"
    ) continue;
    return value;
  }
  return "-";
}

function BetterHuntVolatilityBars({ value }) {
  const { level, label } = normalizeVolatilityLevel(value);
  return (
    <span className={`better-hunt-volatility-bars better-hunt-volatility-bars--${level}`} title={label} aria-label={`Volatility ${label}`}>
      {Array.from({ length: 4 }).map((_, index) => (
        <i key={index} className={index < level ? "is-filled" : ""} />
      ))}
    </span>
  );
}

function bonusMaxWin(bonus) {
  const value =
    bonus?.maxWin ||
    bonus?.max_win ||
    bonus?.maxWinMultiplier ||
    bonus?.max_win_multiplier ||
    bonus?.slotMaxWin ||
    bonus?.slot_max_win ||
    bonus?.slotMaxWinMultiplier ||
    bonus?.slot_max_win_multiplier ||
    bonus?.slot?.maxWin ||
    bonus?.slot?.max_win ||
    bonus?.slot?.maxWinMultiplier ||
    bonus?.slot?.max_win_multiplier ||
    bonus?.slot?.potential ||
    bonus?.potential;
  if (value === undefined || value === null || value === "") return "-";
  if (typeof value === "number") return formatMultiplier(value);
  const text = String(value).trim();
  if (!text) return "-";
  if (/x$/i.test(text)) return text;
  const numeric = Number(text.replace(/,/g, ""));
  return Number.isFinite(numeric) && numeric > 0 ? formatMultiplier(numeric) : text;
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
  roman: {
    panelHi: "#1c1510",
    panelMid: "#17120d",
    panelLo: "#120e0a",
    inset: "#201810",
    track: "#2c2018",
    cardHi: "#251c14",
    cardLo: "#1e1710",
    line: "#4a3020",
    lineHi: "#7a5030",
    lineMid: "#6a4028",
    steel: "#8a7060",
    steelDim: "#6a5040",
    steelHi: "#b09080",
    ice: "#c0281c",
    iceDeep: "#8a1810",
    iceMid: "#d84030",
    glowA: "#5c1810",
    glowB: "#380e08",
  },
  metal: {
    panelHi: "#1e222a",
    panelMid: "#181c22",
    panelLo: "#12151a",
    inset: "#141720",
    track: "#1c2028",
    cardHi: "#202430",
    cardLo: "#1a1e26",
    line: "#3a3f4a",
    lineHi: "#5a6070",
    lineMid: "#4a5060",
    steel: "#888d98",
    steelDim: "#5a6070",
    steelHi: "#c0c8d8",
    ice: "#5eadee",
    iceDeep: "#3080cc",
    iceMid: "#78bfff",
    glowA: "#1a3060",
    glowB: "#10203a",
  },
  cyberpunk: {
    panelHi: "#170022",
    panelMid: "#0b1230",
    panelLo: "#070014",
    inset: "#09051d",
    track: "#120824",
    cardHi: "#17102e",
    cardLo: "#0b0820",
    line: "#4c1a72",
    lineHi: "#ff2bd6",
    lineMid: "#8d3bff",
    steel: "#7beeff",
    steelDim: "#6873b8",
    steelHi: "#e8c8ff",
    ice: "#00d9ff",
    iceDeep: "#0066ff",
    iceMid: "#74f7ff",
    glowA: "#ff2bd6",
    glowB: "#00d9ff",
  },
  spartan: {
    panelHi: "#180a0a",
    panelMid: "#120808",
    panelLo: "#0e0606",
    inset: "#1a0c0c",
    track: "#220e0e",
    cardHi: "#20100e",
    cardLo: "#180a0a",
    line: "#4a2218",
    lineHi: "#c8a030",
    lineMid: "#8a6c18",
    steel: "#b89860",
    steelDim: "#7a5c38",
    steelHi: "#e0c890",
    ice: "#c8a030",
    iceDeep: "#8a5a10",
    iceMid: "#e8c040",
    glowA: "#8a1010",
    glowB: "#380a0a",
  },
  bloody: {
    panelHi: "#180404",
    panelMid: "#100202",
    panelLo: "#080101",
    inset: "#150303",
    track: "#220606",
    cardHi: "#1e0505",
    cardLo: "#150303",
    line: "#5a1210",
    lineHi: "#b02020",
    lineMid: "#8a1818",
    steel: "#c85560",
    steelDim: "#7a2830",
    steelHi: "#ff8090",
    ice: "#ff2030",
    iceDeep: "#700808",
    iceMid: "#ff4050",
    glowA: "#a01010",
    glowB: "#400808",
  },
};

const BETTER_HUNT_SKINS = new Set(["modern", "roman", "metal", "cyberpunk", "spartan", "bloody"]);

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

function normalizeBetterHuntSessionState(config = {}) {
  if (["hunt", "opening", "ended"].includes(config.sessionState)) return config.sessionState;
  return config.bonusOpening === true ? "opening" : "hunt";
}

function normalizeBetterHuntSkin(value) {
  return BETTER_HUNT_SKINS.has(value) ? value : "modern";
}

function normalizeBetterHuntRequests(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value && typeof value === "object") return Object.values(value).filter(Boolean);
  return [];
}

function betterHuntWinTier(mult, max = false) {
  const value = Number(mult) || 0;
  if (max) return "max";
  if (value >= 1000) return "insane";
  if (value >= 500) return "epic";
  if (value >= 250) return "mega";
  return "big";
}

const BETTER_HUNT_WIN_TIERS = {
  big: { label: "Big Win", color: "var(--bh-ice)", glow: "rgba(69,200,255,.58)", count: 26, rings: 1, duration: 3000 },
  mega: { label: "Mega Win", color: "var(--bh-tangerine)", glow: "rgba(255,138,61,.6)", count: 44, rings: 2, duration: 3800 },
  epic: { label: "Epic Win", color: "#ffc93d", glow: "rgba(255,201,61,.68)", count: 60, rings: 2, duration: 4700 },
  insane: { label: "Insane Win", color: "var(--bh-ember)", glow: "rgba(255,77,46,.72)", count: 80, rings: 3, duration: 5500 },
  max: { label: "Max Win", color: "#ffdf6b", glow: "rgba(255,180,50,.82)", count: 100, rings: 3, duration: 6400 },
};

function BetterHuntWinOverlay({ win, onDone }) {
  const tier = win ? BETTER_HUNT_WIN_TIERS[win.tier] : null;
  const pieces = useMemo(() => {
    if (!tier) return [];
    return Array.from({ length: tier.count }, (_, index) => ({
      id: index,
      left: ((index * 37) % 100) + (((index * 13) % 7) / 10),
      delay: ((index * 11) % 16) / 10,
      duration: 1.9 + ((index * 7) % 16) / 10,
      width: 5 + (index % 5),
      height: 9 + ((index * 3) % 8),
      color: ["var(--bh-ice)", "var(--bh-tangerine)", "#ffc93d", "var(--bh-ember)", "#ffffff"][index % 5],
      sway: ((index * 19) % 60) - 30,
    }));
  }, [tier, win?.id]);
  if (!win || !tier) return null;
  return (
    <div
      className={`better-hunt-win better-hunt-win--${win.tier}`}
      style={{ "--bh-win-duration": `${tier.duration}ms`, "--bh-win-color": tier.color, "--bh-win-glow": tier.glow }}
      onAnimationEnd={(event) => {
        if (event.animationName === "better-hunt-win-life") onDone();
      }}
    >
      <span className="better-hunt-win-border" />
      <span className="better-hunt-win-flash" />
      <span className="better-hunt-win-rays" />
      {Array.from({ length: tier.rings }, (_, index) => (
        <span key={index} className="better-hunt-win-ring" style={{ animationDelay: `${index * 0.22}s` }} />
      ))}
      <span className="better-hunt-win-cannon better-hunt-win-cannon--left" />
      <span className="better-hunt-win-cannon better-hunt-win-cannon--right" />
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className="better-hunt-win-confetti"
          style={{
            left: `${piece.left}%`,
            width: piece.width,
            height: piece.height,
            background: piece.color,
            "--bh-win-sway": `${piece.sway}px`,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
          }}
        />
      ))}
      <div className="better-hunt-win-badge">
        <span className="better-hunt-win-label">{tier.label}</span>
        <strong>{Number(win.mult || 0).toLocaleString()}x</strong>
        {win.slot ? <em>{win.slot}</em> : null}
      </div>
      {["epic", "insane", "max"].includes(win.tier) ? <span className="better-hunt-win-clip">Clip it</span> : null}
    </div>
  );
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
          backfaceVisibility: "hidden",
          transform: "translateZ(0)",
        }}
      />
    );
  }
  return (
    <span
      className={`better-hunt-thumb better-hunt-thumb--${tier} ${className}`}
      style={{
        width: fill ? "100%" : size,
        height: fill ? "100%" : size,
        backfaceVisibility: "hidden",
        transform: "translateZ(0)",
      }}
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
      @keyframes better-bg-pan{0%,100%{background-position:0% 0%,100% 20%,50% 100%,0 0}50%{background-position:100% 60%,0% 80%,50% 0%,32px 32px}}
      @keyframes better-bg-scan{0%{transform:translateY(-54px)}100%{transform:translateY(54px)}}
      @keyframes better-rtp-bolt{0%,100%{filter:drop-shadow(0 0 2px var(--bolt-color));opacity:1}50%{filter:drop-shadow(0 0 6px var(--bolt-color));opacity:.82}}
      @keyframes better-rtp-trophy{0%,100%{filter:drop-shadow(0 0 2px var(--trophy-color))}50%{filter:drop-shadow(0 0 7px var(--trophy-color))}}
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
      @keyframes better-gw-live-blink{0%,100%{opacity:1}50%{opacity:.42}}
      @keyframes better-gw-edge-pulse{0%,100%{opacity:.55;transform:scaleX(.7)}50%{opacity:1;transform:scaleX(1.15)}}
      @keyframes better-gw-sheen-sweep{0%,68%{transform:translateX(-120%)}86%,100%{transform:translateX(120%)}}
      @keyframes better-gw-winner-pop{0%{transform:scale(.6)}60%{transform:scale(1.22)}100%{transform:scale(1.14)}}
      @keyframes better-gw-crown-drop{0%{opacity:0;transform:translateY(-14px) rotate(-24deg)}100%{opacity:1;transform:translateY(0) rotate(0deg)}}
      @keyframes better-gw-crown-sway{0%,100%{transform:rotate(-7deg)}50%{transform:rotate(7deg)}}
      @keyframes better-gw-status-blink{0%,100%{opacity:1}50%{opacity:.45}}
      @keyframes better-gw-flash-fade{0%{opacity:0}16%{opacity:1}100%{opacity:0}}
      @keyframes better-gw-reel-spin{0%{transform:translate3d(0,0,0)}100%{transform:translate3d(-50%,0,0)}}
      .better-giveaway-stage{width:100%;height:100%;min-width:0;min-height:0;display:grid;place-items:center;overflow:hidden;padding:clamp(8px,2vmin,28px);box-sizing:border-box;container-type:size;background:transparent;font-family:var(--w-font-body,"Rajdhani",Arial,sans-serif)}
      .better-giveaway-stage *{box-sizing:border-box}
      .better-giveaway-widget{--cyan:var(--w-accent,#43d3ff);--blue:var(--w-accent-2,#087eff);--H:var(--w-hue,208);--H2:var(--w-hue2,208);--H3:var(--w-hue3,208);--S:var(--w-sat,88%);--L:var(--w-lum,10%);--G:var(--w-glow,1);--IG:var(--w-inner-glow,1);position:relative;display:flex;width:min(100%,var(--w-width,700px));height:min(100%,var(--w-height,270px));min-width:0;min-height:0;flex-direction:column;justify-content:center;overflow:hidden;padding:var(--w-pad-y,22px) var(--w-pad-x,31px);border:var(--w-border-w,1px) solid hsl(var(--H) calc(var(--S) * .9) 62% / var(--w-border-a,.9));border-radius:var(--w-radius,12px);background:linear-gradient(115deg,hsl(var(--H) var(--S) calc(var(--L) + 4%) / .97),hsl(var(--H2) var(--S) var(--L) / .98) 53%,hsl(var(--H3) var(--S) calc(var(--L) + 4%) / .97)),hsl(var(--H) var(--S) calc(var(--L) - 2%));box-shadow:0 0 0 1px hsl(var(--H) var(--S) 18% / .96),0 0 0 3px hsl(var(--H) var(--S) 28% / calc(.12 * var(--G))),0 0 calc(9px * var(--G)) hsl(var(--H) 100% 52% / calc(.7 * var(--G))),0 0 calc(28px * var(--G)) hsl(var(--H2) 100% 42% / calc(.36 * var(--G))),inset 0 0 0 1px hsl(var(--H) var(--S) 30% / .95),inset 0 0 calc(26px * var(--IG)) hsl(var(--H) 100% 38% / calc(.2 * var(--IG)));color:#eff6ff;font-family:var(--w-font-body,"Rajdhani",Arial,sans-serif);isolation:isolate;transition:border-color 480ms ease,box-shadow 480ms ease,background 480ms ease,border-radius 320ms ease,width 260ms ease,height 260ms ease,padding 260ms ease,filter 320ms ease}
      .better-giveaway-widget[data-surface="metallic"]{background:repeating-linear-gradient(92deg,hsl(var(--H) var(--S) calc(var(--L) + 15%) / .22) 0 1px,transparent 1px 3px),linear-gradient(166deg,hsl(var(--H) var(--S) calc(var(--L) + 16%)) 0%,hsl(var(--H2) var(--S) calc(var(--L) - 2%)) 22%,hsl(var(--H) calc(var(--S) + 6%) calc(var(--L) + 30%)) 46%,hsl(var(--H3) var(--S) calc(var(--L) - 1%)) 68%,hsl(var(--H) var(--S) calc(var(--L) + 18%)) 100%)}
      .better-giveaway-widget[data-surface="gradient"]{background:linear-gradient(125deg,hsl(var(--H) var(--S) calc(var(--L) + 12%)),hsl(var(--H2) var(--S) calc(var(--L) + 2%)) 46%,hsl(var(--H3) var(--S) calc(var(--L) + 14%)))}
      .better-giveaway-widget[data-surface="matte"]{background:hsl(var(--H) var(--S) var(--L));box-shadow:0 0 0 1px hsl(var(--H) var(--S) 16% / .9),0 0 calc(14px * var(--G)) hsl(var(--H) 60% 40% / calc(.4 * var(--G))),inset 0 0 calc(24px * var(--IG)) hsl(var(--H) 40% 4% / calc(.55 * var(--IG)))}
      .better-giveaway-widget::before{position:absolute;inset:var(--w-inner-inset,5px);z-index:-1;border:1px solid hsl(var(--H) var(--S) 45% / .78);border-radius:max(0px,calc(var(--w-radius,12px) - var(--w-inner-inset,5px)));opacity:var(--w-inner-op,1);pointer-events:none;content:"";box-shadow:inset 0 0 calc(13px * var(--IG)) hsl(var(--H) 100% 34% / calc(.21 * var(--IG)));transition:inset 200ms ease,opacity 240ms ease,border-radius 320ms ease}
      .better-giveaway-widget::after{position:absolute;inset:0;z-index:-1;pointer-events:none;content:"";background:linear-gradient(112deg,transparent 0 17%,hsl(var(--H) 100% 60% / .08) 17.2%,transparent 17.5% 69%,hsl(var(--H2) 100% 65% / .04) 69.2%,transparent 70%),radial-gradient(ellipse at 50% 0%,hsl(var(--H) 100% 50% / .12),transparent 56%)}
      .better-giveaway-widget[data-surface="gloss"]::after{background:linear-gradient(180deg,hsl(0 0% 100% / .16) 0%,hsl(0 0% 100% / .04) 34%,transparent 52%),radial-gradient(ellipse at 50% -20%,hsl(var(--H) 100% 70% / .22),transparent 62%)}
      .better-giveaway-widget[data-surface="matte"]::after{background:none}
      .better-giveaway-widget.is-paused{filter:saturate(.65)}
      .better-giveaway-widget.has-winner{border-color:rgba(255,199,60,.95);box-shadow:0 0 0 1px rgba(92,62,0,.9),0 0 0 3px rgba(140,96,0,.16),0 0 12px rgba(255,176,0,.75),0 0 36px rgba(255,150,0,.42),inset 0 0 0 1px rgba(150,108,0,.9),inset 0 0 30px rgba(255,160,0,.17)}
      .better-gw-header,.better-gw-prize,.better-gw-metrics{position:relative;z-index:1}
      .better-gw-header{display:flex;align-items:center;justify-content:space-between;gap:14px;min-height:30px}
      .better-gw-name{display:inline-flex;min-width:0;align-items:center;gap:12px;color:#e4f1ff;font-family:var(--w-font-title,"Orbitron",sans-serif);font-size:var(--w-title-size,20px);font-weight:var(--w-title-weight,700);letter-spacing:var(--w-letter,.01em);text-shadow:0 0 calc(9px * var(--w-text-glow,1)) hsl(var(--H) 100% 85% / calc(.28 * var(--w-text-glow,1)))}
      .better-gw-name span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .better-gw-gift-icon{width:20px;height:20px;flex:0 0 auto;overflow:visible;filter:drop-shadow(0 0 4px rgba(255,189,0,.48))}
      .better-gw-gift-box,.better-gw-gift-lid{fill:#ffbd09;stroke:#ff8b00;stroke-width:.7}.better-gw-gift-lid{fill:#ffc51b}.better-gw-gift-ribbon{fill:none;stroke:#ed3541;stroke-width:1.5}.better-gw-gift-bow{fill:#ef3c38;stroke:#ff8b00;stroke-width:.7}
      .better-gw-live-toggle{display:inline-flex;align-items:center;gap:5px;min-height:22px;flex:0 0 auto;padding:3px 8px 3px 7px;color:#dbf4ff;border:1px solid hsl(var(--H) 90% 52% / .85);border-radius:999px;background:linear-gradient(180deg,hsl(var(--H) 88% 42% / .9),hsl(var(--H2) 95% 28% / .92));box-shadow:0 0 calc(8px * var(--G)) hsl(var(--H) 100% 50% / calc(.7 * var(--G))),inset 0 1px 2px hsl(var(--H) 90% 80% / .3);font-family:var(--w-font-title,"Orbitron",sans-serif);font-size:9px;font-weight:700;letter-spacing:.11em;line-height:1;text-transform:uppercase}
      .better-giveaway-widget.is-paused .better-gw-live-toggle{background:linear-gradient(180deg,rgba(47,82,129,.82),rgba(13,32,66,.92));box-shadow:0 0 7px rgba(32,89,141,.55),inset 0 1px 2px rgba(155,199,230,.2)}
      .better-gw-live-dot{width:5px;height:5px;border-radius:50%;background:var(--w-accent-soft,#8ee9ff);box-shadow:0 0 6px var(--w-accent,#25c9ff);animation:better-gw-live-blink 1.7s ease-in-out infinite}
      .better-giveaway-widget.is-paused .better-gw-live-dot{background:#9aacba;box-shadow:none;animation:none}
      .better-gw-broadcast-icon{width:11px;height:11px;fill:none;stroke:currentColor;stroke-linecap:round;stroke-width:1.35}.better-gw-broadcast-icon circle{fill:currentColor;stroke:none}
      .better-gw-rule{position:relative;height:1px;margin:6px 0 14px;background:linear-gradient(90deg,transparent,hsl(var(--H) var(--S) 45% / .6) 16%,hsl(var(--H2) var(--S) 40% / .3) 84%,transparent)}
      .better-gw-rule::before,.better-gw-rule::after{position:absolute;top:-1px;width:3px;height:3px;border-radius:50%;background:var(--w-accent,#57d7ff);box-shadow:0 0 calc(6px * var(--G)) hsl(var(--H) 100% 50% / var(--G));content:""}.better-gw-rule::before{left:8%}.better-gw-rule::after{right:8%}
      .better-gw-prize{display:flex;align-items:baseline;justify-content:center;gap:6px;min-height:42px;color:#f4f8ff;text-align:center;text-shadow:0 0 10px rgba(205,230,255,.25);transition:opacity 380ms ease,transform 520ms cubic-bezier(.22,.9,.24,1),filter 380ms ease}
      .better-gw-prize strong{min-width:0;overflow:hidden;font-family:var(--w-font-title,"Orbitron",sans-serif);font-size:var(--w-prize-size,31px);font-style:var(--w-prize-style,italic);font-weight:var(--w-title-weight,700);letter-spacing:var(--w-letter,.015em);line-height:1;text-overflow:ellipsis;white-space:nowrap}
      .better-gw-prize span{min-width:0;color:#e5edf8;font-size:var(--w-sub-size,15px);font-style:var(--w-prize-style,italic);font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .better-gw-metrics{display:grid;grid-template-columns:1fr 1fr;gap:var(--w-tile-gap,12px);margin-top:9px;transition:opacity 380ms ease,transform 520ms cubic-bezier(.22,.9,.24,1),filter 380ms ease}
      .better-gw-metric-panel{position:relative;display:flex;min-width:0;min-height:62px;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;padding:10px 15px;border:1px solid hsl(var(--H) var(--S) 38% / .85);border-radius:var(--w-tile-radius,10px);background:linear-gradient(180deg,hsl(var(--H) var(--S) calc(var(--L) + 5%) / .98),hsl(var(--H2) var(--S) var(--L) / .9));box-shadow:inset 0 0 calc(12px * var(--IG)) hsl(var(--H) 100% 32% / calc(.27 * var(--IG))),0 0 calc(8px * var(--G)) hsl(var(--H) 100% 30% / calc(.14 * var(--G)));transition:border-radius 320ms ease,background 480ms ease}
      .better-giveaway-widget[data-surface="metallic"] .better-gw-metric-panel{background:linear-gradient(170deg,hsl(var(--H) var(--S) calc(var(--L) + 20%)),hsl(var(--H2) var(--S) calc(var(--L) + 2%)) 55%,hsl(var(--H) var(--S) calc(var(--L) + 12%)))}
      .better-giveaway-widget[data-surface="matte"] .better-gw-metric-panel{background:hsl(var(--H) var(--S) calc(var(--L) + 5%));box-shadow:inset 0 0 calc(18px * var(--IG)) hsl(var(--H) 40% 3% / calc(.5 * var(--IG)))}
      .better-giveaway-widget[data-surface="gloss"] .better-gw-metric-panel::after{position:absolute;top:0;right:0;left:0;height:46%;content:"";pointer-events:none;background:linear-gradient(180deg,hsl(0 0% 100% / .14),transparent)}
      .better-gw-metric-panel::before{position:absolute;inset:0;pointer-events:none;content:"";background:linear-gradient(110deg,transparent 8%,rgba(53,167,255,.06) 38%,transparent 59%)}
      .better-gw-metric-label{position:relative;z-index:1;color:var(--w-accent,#52c9f4);font-family:var(--w-font-title,"Orbitron",sans-serif);font-size:var(--w-label-size,10px);font-weight:700;letter-spacing:calc(var(--w-letter,.17em) + .14em);line-height:1.1;text-transform:var(--w-label-transform,uppercase);text-shadow:0 0 calc(7px * var(--w-text-glow,1)) hsl(var(--H) 100% 55% / calc(.42 * var(--w-text-glow,1)))}
      .better-gw-metric-value{position:relative;z-index:1;max-width:100%;overflow:hidden;margin-top:3px;color:#e8f5ff;font-family:var(--w-font-title,"Orbitron",sans-serif);font-size:var(--w-value-size,28px);font-weight:800;line-height:1;text-overflow:ellipsis;white-space:nowrap;text-shadow:0 0 calc(10px * var(--w-text-glow,1)) hsl(var(--H) 100% 78% / calc(.34 * var(--w-text-glow,1)))}
      .better-gw-keyword-value{color:var(--w-accent,#087bff);letter-spacing:var(--w-letter,.02em);text-shadow:0 0 calc(11px * var(--w-text-glow,1)) hsl(var(--H) 100% 50% / calc(.8 * var(--w-text-glow,1)))}
      .better-gw-reel-zone{position:absolute;top:calc(var(--w-pad-y,22px) * 1.4 + 40px);right:var(--w-pad-x,31px);bottom:calc(var(--w-pad-y,22px) * .8);left:var(--w-pad-x,31px);z-index:2;opacity:0;transform:translateY(12px) scale(.97);pointer-events:none;transition:opacity 420ms ease,transform 560ms cubic-bezier(.22,.9,.24,1),visibility 0s linear 560ms;visibility:hidden}
      .better-giveaway-widget.is-tall .better-gw-reel-zone{opacity:1;transform:translateY(0) scale(1);visibility:visible;transition:opacity 420ms ease 60ms,transform 560ms cubic-bezier(.22,.9,.24,1),visibility 0s linear 0s}
      .better-giveaway-widget.is-tall .better-gw-prize{opacity:0;transform:translateY(-8px) scale(.97);filter:blur(2px);pointer-events:none}.better-giveaway-widget.is-tall .better-gw-metrics{opacity:0;transform:translateY(10px) scale(.97);filter:blur(2px);pointer-events:none}
      .better-gw-winner-flash{position:absolute;inset:0;z-index:3;border-radius:inherit;pointer-events:none;background:radial-gradient(circle at 50% 56%,rgba(255,196,27,.34),rgba(255,170,0,.09) 46%,transparent 72%);animation:better-gw-flash-fade 1200ms ease-out both}
      .better-gw-edge,.better-gw-edge-light,.better-gw-side-dash,.better-gw-sheen{position:absolute;pointer-events:none}
      .better-gw-edge{z-index:2;width:var(--w-bracket-size,27px);height:calc(var(--w-bracket-size,27px) * .85);border-color:var(--w-accent,rgba(47,178,250,.98));border-style:solid;opacity:var(--w-bracket-op,1);filter:drop-shadow(0 0 calc(4px * var(--G)) hsl(var(--H) 100% 50% / calc(.78 * var(--G))));transition:width 200ms ease,height 200ms ease,opacity 240ms ease,border-radius 320ms ease}
      .better-gw-edge-top-left{top:-1px;left:-1px;border-width:var(--w-bracket-w,2px) 0 0 var(--w-bracket-w,2px);border-radius:var(--w-radius,11px) 0 0}.better-gw-edge-top-right{top:-1px;right:-1px;border-width:var(--w-bracket-w,2px) var(--w-bracket-w,2px) 0 0;border-radius:0 var(--w-radius,11px) 0 0}.better-gw-edge-bottom-left{bottom:-1px;left:-1px;border-width:0 0 var(--w-bracket-w,2px) var(--w-bracket-w,2px);border-radius:0 0 0 var(--w-radius,11px)}.better-gw-edge-bottom-right{right:-1px;bottom:-1px;border-width:0 var(--w-bracket-w,2px) var(--w-bracket-w,2px) 0;border-radius:0 0 var(--w-radius,11px)}
      .better-gw-edge-light{z-index:2;width:47px;height:2px;opacity:var(--w-edgelight-op,1);background:linear-gradient(90deg,transparent,var(--w-accent,#43d9ff) 25%,var(--w-accent-2,#167bff) 85%,transparent);box-shadow:0 0 calc(7px * var(--G)) hsl(var(--H) 100% 50% / var(--G))}.better-gw-edge-light-top{top:-1px;left:46%;animation:better-gw-edge-pulse 2.8s ease-in-out infinite}.better-gw-edge-light-bottom{right:45%;bottom:-1px;transform:rotate(180deg);animation:better-gw-edge-pulse 2.8s ease-in-out 1.2s infinite}
      .better-gw-side-dash{z-index:2;width:1px;height:28px;background:repeating-linear-gradient(to bottom,var(--w-accent,#21a9ed) 0 1px,transparent 1px 4px);opacity:var(--w-dash-op,.76);box-shadow:0 0 calc(6px * var(--G)) hsl(var(--H) 100% 50% / calc(.8 * var(--G)));transition:opacity 240ms ease}.better-gw-side-dash-left{top:65px;left:5px}.better-gw-side-dash-right{right:5px;bottom:65px}
      .better-gw-sheen{right:-10%;bottom:-110%;left:-10%;height:170%;z-index:0;opacity:var(--w-sheen-op,1);background:linear-gradient(103deg,transparent 35%,hsl(var(--H) 100% 72% / .09) 47%,transparent 60%);transform:translateX(-120%);animation:better-gw-sheen-sweep 7s ease-in-out 1.4s infinite}.better-giveaway-widget[style*="--w-sheen-op: 0"] .better-gw-sheen{animation:none}
      .better-gw-roulette-stage{position:relative;height:100%;padding-top:24px}
      .better-gw-winner-banner{position:absolute;top:0;left:50%;z-index:4;display:flex;align-items:center;gap:8px;padding:5px 16px;border:1px solid rgba(255,197,27,.8);border-radius:999px;background:linear-gradient(180deg,rgba(64,42,0,.95),rgba(26,16,0,.96));box-shadow:0 0 18px rgba(255,176,0,.5),inset 0 1px 0 rgba(255,224,130,.35);opacity:0;transform:translate(-50%,-10px) scale(.8);filter:blur(4px);pointer-events:none;transition:opacity 320ms ease,transform 460ms cubic-bezier(.2,1.4,.35,1),filter 320ms ease}.better-gw-winner-banner.is-shown{opacity:1;transform:translate(-50%,0) scale(1);filter:blur(0)}
      .better-gw-winner-crown{color:#ffc51b;filter:drop-shadow(0 0 5px rgba(255,187,0,.8));animation:better-gw-crown-sway 2.4s ease-in-out infinite}.better-gw-winner-kicker{color:#ffd877;font-family:var(--w-font-title,"Orbitron",sans-serif);font-size:8px;font-weight:700;letter-spacing:.24em;text-transform:uppercase}.better-gw-winner-name{color:#fff;font-family:var(--w-font-title,"Orbitron",sans-serif);font-size:13px;font-weight:800;letter-spacing:.05em;text-shadow:0 0 10px rgba(255,205,60,.75)}
      .better-gw-roulette-viewport{position:relative;height:122px;overflow:hidden;border:1px solid rgba(16,86,145,.55);border-radius:7px;background:rgba(1,8,20,.6);box-shadow:inset 0 0 16px rgba(0,68,138,.22);mask-image:linear-gradient(90deg,transparent,black 8%,black 92%,transparent)}
      .better-gw-roulette-track{display:flex;align-items:center;gap:14px;height:100%;width:max-content;padding:0 6px;will-change:transform}.better-gw-roulette-stage--spinning .better-gw-roulette-track{animation:better-gw-reel-spin var(--gw-spin-duration,5.2s) linear infinite}
      .better-gw-avatar-chip{position:relative;display:flex;width:66px;flex:none;flex-direction:column;align-items:center;gap:7px;transition:opacity 420ms ease,filter 420ms ease}.better-gw-avatar-bubble{display:grid;width:66px;height:66px;place-items:center;border:2px solid rgba(150,226,255,.6);border-radius:50%;color:#fff;font-family:var(--w-font-title,"Orbitron",sans-serif);font-size:19px;font-weight:800;letter-spacing:.03em;text-shadow:0 1px 4px rgba(0,0,0,.6);box-shadow:inset 0 -7px 14px rgba(0,0,0,.35),0 0 10px rgba(0,110,200,.4);transition:transform 300ms cubic-bezier(.2,1.3,.4,1),box-shadow 300ms ease,border-color 300ms ease}.better-gw-avatar-name{max-width:100%;overflow:hidden;color:#9fd8f2;font-size:12px;font-weight:600;letter-spacing:.02em;text-overflow:ellipsis;white-space:nowrap}
      .better-gw-roulette-stage--winner .better-gw-avatar-chip:not(.is-winner){opacity:.28;filter:saturate(.35) brightness(.7)}.better-gw-avatar-chip.is-winner .better-gw-avatar-bubble{border-color:#ffc51b;box-shadow:inset 0 -7px 14px rgba(0,0,0,.35),0 0 0 3px rgba(255,197,27,.4),0 0 26px rgba(255,178,0,.8);transform:scale(1.2);animation:better-gw-winner-pop 900ms cubic-bezier(.2,1.5,.4,1) both}.better-gw-avatar-chip.is-winner .better-gw-avatar-name{color:#ffe08a;font-weight:700;text-shadow:0 0 8px rgba(255,190,0,.55)}
      .better-gw-chip-crown{position:absolute;top:-13px;z-index:2;padding:1px 4px;border:1px solid rgba(255,197,27,.72);border-radius:999px;background:rgba(32,20,0,.94);color:#ffd877;font-size:8px;font-weight:900;letter-spacing:.08em;line-height:1;filter:drop-shadow(0 2px 6px rgba(255,150,0,.85));animation:better-gw-crown-drop 560ms cubic-bezier(.2,1.6,.4,1) both}
      .better-gw-roulette-pointer{position:absolute;top:6px;bottom:6px;left:50%;z-index:3;display:flex;flex-direction:column;align-items:center;justify-content:space-between;width:14px;transform:translateX(-50%);pointer-events:none}.better-gw-pointer-line{flex:1;width:2px;margin:3px 0;background:linear-gradient(180deg,rgba(97,220,255,.9),rgba(8,126,255,.35) 50%,rgba(97,220,255,.9));box-shadow:0 0 8px rgba(0,162,255,.8)}.better-gw-pointer-notch{width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;filter:drop-shadow(0 0 5px rgba(0,174,255,.9))}.better-gw-pointer-top{border-top:7px solid #5cd8ff}.better-gw-pointer-bottom{border-bottom:7px solid #5cd8ff}
      .better-gw-roulette-status{display:flex;justify-content:center;min-height:16px;margin-top:7px;color:#7fb2cf;font-family:var(--w-font-title,"Orbitron",sans-serif);font-size:9px;font-weight:700;letter-spacing:.22em;text-transform:uppercase}.better-gw-status-spin{color:#6fdcff;text-shadow:0 0 8px rgba(0,180,255,.6);animation:better-gw-status-blink 900ms ease-in-out infinite}.better-gw-status-win{display:inline-flex;align-items:center;gap:6px;color:#ffd877;text-shadow:0 0 8px rgba(255,187,0,.5)}
      @container (max-width:520px){.better-giveaway-widget{width:100%;height:min(100%,var(--w-height,270px));padding:max(10px,calc(var(--w-pad-y,22px) * .72)) max(12px,calc(var(--w-pad-x,31px) * .66))}.better-gw-prize{align-items:center;flex-direction:column;gap:3px}.better-gw-metrics{gap:max(6px,calc(var(--w-tile-gap,12px) * .6))}.better-gw-reel-zone{top:54px;right:14px;bottom:12px;left:14px}}
      @media (max-width:520px){.better-giveaway-stage{padding:8px}.better-giveaway-widget{width:100%;height:min(100%,var(--w-height,270px));padding:max(10px,calc(var(--w-pad-y,22px) * .72)) max(12px,calc(var(--w-pad-x,31px) * .66))}.better-gw-prize{align-items:center;flex-direction:column;gap:3px}.better-gw-metrics{gap:max(6px,calc(var(--w-tile-gap,12px) * .6))}.better-gw-reel-zone{top:54px;right:14px;bottom:12px;left:14px}}
      .better-bets-stage{width:100%;height:100%;min-width:0;min-height:0;display:grid;place-items:center;overflow:hidden;padding:16px;box-sizing:border-box;background:transparent;font-family:var(--font-body,"Rajdhani",Arial,sans-serif)}
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
      @keyframes better-hunt-hot-pulse{0%,100%{box-shadow:0 0 0 1px var(--bh-glow-a),0 0 22px color-mix(in srgb,var(--bh-ice) 64%,transparent),0 0 52px color-mix(in srgb,var(--bh-glow-b) 52%,transparent),inset 0 0 14px color-mix(in srgb,var(--bh-ice) 12%,transparent)}50%{box-shadow:0 0 0 1px var(--bh-ice-deep),0 0 38px color-mix(in srgb,var(--bh-ice) 86%,transparent),0 0 86px color-mix(in srgb,var(--bh-glow-a) 62%,transparent),inset 0 0 22px color-mix(in srgb,var(--bh-ice) 18%,transparent)}}
      @keyframes better-hunt-widget-shake{0%,100%{transform:translate(0,0)}12%{transform:translate(-5px,3px)}24%{transform:translate(5px,-4px)}36%{transform:translate(-4px,-3px)}48%{transform:translate(4px,3px)}62%{transform:translate(-3px,2px)}78%{transform:translate(2px,-1px)}}
      @keyframes better-hunt-win-life{0%{opacity:0}5%{opacity:1}86%{opacity:1}100%{opacity:0}}
      @keyframes better-hunt-win-border{0%,100%{opacity:.9}50%{opacity:.4}}
      @keyframes better-hunt-win-flash{0%{opacity:0}10%{opacity:1}100%{opacity:0}}
      @keyframes better-hunt-win-rays{to{transform:translate(-50%,-50%) rotate(360deg)}}
      @keyframes better-hunt-win-ring{0%{transform:translate(-50%,-50%) scale(.15);opacity:.95}100%{transform:translate(-50%,-50%) scale(4.2);opacity:0}}
      @keyframes better-hunt-win-confetti{0%{transform:translate3d(0,0,0) rotate(0deg);opacity:0}6%{opacity:1}100%{transform:translate3d(var(--bh-win-sway),640px,0) rotate(680deg);opacity:.15}}
      @keyframes better-hunt-win-badge{0%{transform:perspective(1000px) rotateX(82deg) scale(.35) translateZ(-320px);opacity:0}55%{transform:perspective(1000px) rotateX(-12deg) scale(1.1) translateZ(50px);opacity:1}74%{transform:perspective(1000px) rotateX(6deg) scale(.97) translateZ(0)}100%{transform:perspective(1000px) rotateX(0deg) scale(1);opacity:1}}
      @keyframes better-hunt-win-float{0%,100%{transform:translateY(0) rotateX(0deg)}50%{transform:translateY(-9px) rotateX(2deg)}}
      .better-hunt-root{position:relative;width:100%;height:100%;min-width:0;min-height:0;display:grid;place-items:center;overflow:hidden;background:transparent;color:#eef6ff;font-family:var(--bh-font);font-size:calc(13px * var(--bh-ui,1));box-sizing:border-box}
      .better-hunt-root *{box-sizing:border-box}
      .better-hunt-root::before,.better-hunt-root::after{content:none}
      .better-hunt-shell{position:relative;z-index:1;width:100%;height:100%;display:grid;place-items:center;padding:18px}
      .better-hunt-root[data-orientation="vertical"] .better-hunt-shell,.better-hunt-root[data-orientation="mainstream"] .better-hunt-shell{align-items:center}
      .better-hunt-panel{position:relative;width:100%;overflow:hidden;border:1px solid color-mix(in srgb,var(--bh-line-hi) 55%,transparent);border-radius:var(--bh-radius,14px);background:linear-gradient(180deg,var(--bh-panel-hi) 0%,var(--bh-panel-mid) 55%,var(--bh-panel-lo) 100%);box-shadow:0 0 0 1px rgba(0,0,0,.55),inset 0 1px 0 color-mix(in srgb,var(--bh-steel-hi) 12%,transparent)}
      .better-hunt-panel > *{position:relative;z-index:6}
      .better-hunt-panel::after{content:"";position:absolute;inset:0;z-index:5;pointer-events:none;border-radius:inherit}
      .better-hunt-root[data-finish="flat"] .better-hunt-panel::after{content:none}
      .better-hunt-root[data-finish="metallic"] .better-hunt-panel::after{background:repeating-linear-gradient(100deg,rgba(255,255,255,.028) 0 1px,transparent 1px 3px),linear-gradient(155deg,rgba(255,255,255,.09) 0%,rgba(255,255,255,.02) 22%,transparent 40%,rgba(255,255,255,.04) 78%,transparent 100%)}
      .better-hunt-root[data-finish="gloss"] .better-hunt-panel::after{background:linear-gradient(180deg,rgba(255,255,255,.12) 0%,rgba(255,255,255,.035) 26%,transparent 52%)}
      .better-hunt-root[data-finish="matte"] .better-hunt-panel::after{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E");opacity:.05;mix-blend-mode:overlay}
      .better-hunt-root[data-finish="gradient"] .better-hunt-panel::after{background:linear-gradient(140deg,color-mix(in srgb,var(--bh-ice) 7%,transparent) 0%,transparent 38%,color-mix(in srgb,var(--bh-ice-deep) 10%,transparent) 92%)}
      .better-hunt-vertical{max-width:min(100%,var(--bh-panel-width,402px));height:var(--bh-panel-height,auto);display:grid;grid-template-rows:auto auto auto auto minmax(0,1fr) auto auto;gap:10px;padding:12px}
      .better-hunt-mainstream{max-width:min(100%,var(--bh-panel-width,402px));height:var(--bh-panel-height,auto);display:grid;grid-template-rows:auto auto auto auto auto minmax(0,1fr) auto auto;gap:10px;padding:12px}
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
      .better-hunt-ring-track{position:absolute;left:50%;top:50%;transform-style:preserve-3d;transform:translateZ(0);will-change:transform}
      .better-hunt-card{position:absolute;overflow:hidden;width:112px;height:158px;border:1.5px solid color-mix(in srgb,var(--bh-line-hi) 65%,transparent);border-radius:10px;background:var(--bh-inset);box-shadow:0 6px 18px rgba(0,0,0,.6),inset 0 0 0 1px rgba(0,0,0,.55);backface-visibility:hidden;contain:paint;transform-style:preserve-3d;will-change:transform,opacity;transition:transform .65s cubic-bezier(.22,.9,.3,1),opacity .45s ease,filter .45s ease}
      .better-hunt-card--center{border:2px solid var(--bh-line-hi);box-shadow:0 4px 14px rgba(0,0,0,.6)}
      .better-hunt-card--super.better-hunt-card--center{animation:better-hunt-gold calc(2.4s / var(--anim-speed,1)) ease-in-out infinite}
      .better-hunt-card--extreme{animation:better-hunt-cloak calc(4s / var(--anim-speed,1)) ease-in-out infinite;border-style:dashed}
      .better-hunt-card-img{width:100%;height:100%;display:block;object-fit:cover}
      .better-hunt-thumb{display:grid;place-items:center;flex:0 0 auto;overflow:hidden;border:1px solid color-mix(in srgb,var(--bh-line-mid) 75%,transparent);border-radius:6px;background:radial-gradient(120% 120% at 30% 20%,color-mix(in srgb,var(--bh-ice) 35%,transparent),var(--bh-card-lo) 78%);color:#fff;font-size:.7em;font-weight:950;box-shadow:inset 0 0 0 1px rgba(0,0,0,.55),0 1px 4px rgba(0,0,0,.6)}
      .better-hunt-thumb--super{background:radial-gradient(120% 120% at 30% 20%,rgba(255,201,61,.48),var(--bh-card-lo) 78%)}.better-hunt-thumb--extreme{background:radial-gradient(120% 120% at 30% 20%,rgba(255,84,112,.48),var(--bh-card-lo) 78%)}
      .better-hunt-card-gloss{position:absolute;inset:0 0 auto;height:34%;background:linear-gradient(180deg,rgba(255,255,255,.15),transparent);pointer-events:none}
      .better-hunt-card-name{position:absolute;inset:auto 0 0;padding:26px 8px 7px;background:linear-gradient(0deg,rgba(0,0,0,.88),rgba(0,0,0,.42),transparent);color:#fff;font-size:.86em;font-weight:900;line-height:1.05;text-align:center;text-transform:uppercase}
      .better-hunt-stats-panel{position:relative;height:210px;overflow:hidden;border:1px solid color-mix(in srgb,var(--bh-line-hi) 60%,transparent);border-radius:12px;background:var(--bh-inset);box-shadow:0 6px 22px rgba(0,0,0,.55),inset 0 1px 0 color-mix(in srgb,var(--bh-steel-hi) 10%,transparent)}
      .better-hunt-stats-image{position:absolute;inset:0;z-index:0}
      .better-hunt-stats-image img{animation:better-hunt-kenburns calc(8s / var(--anim-speed,1)) ease-out both}
      .better-hunt-stats-wash{position:absolute;inset:0;z-index:1;background:linear-gradient(0deg,rgba(0,0,0,.9),rgba(0,0,0,.45),rgba(0,0,0,.3))}
      .better-hunt-stats-content{position:relative;z-index:2;height:100%;display:flex;flex-direction:column;justify-content:space-between;padding:12px}
      .better-hunt-stats-title{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;min-width:0}
      .better-hunt-stats-title h3{min-width:0;overflow:hidden;margin:0;color:#fff;font-size:1.7em;font-weight:950;line-height:.95;text-overflow:ellipsis;text-transform:uppercase;white-space:nowrap}
      .better-hunt-tier{display:inline-flex;align-items:center;gap:5px;border:1px solid rgba(255,255,255,.16);border-radius:999px;background:rgba(0,0,0,.38);padding:5px 8px;color:var(--bh-steel-hi);font-size:.72em;font-weight:900;letter-spacing:.12em;text-transform:uppercase}
      .better-hunt-tier--super{border-color:rgba(255,201,61,.7);background:rgba(255,201,61,.12);color:#ffc93d}
      .better-hunt-tier--extreme{border-color:rgba(255,84,112,.7);background:rgba(255,84,112,.12);color:#ff6a4d}
      .better-hunt-stat-strip{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));overflow:hidden;border:1px solid rgba(255,255,255,.15);border-radius:9px;background:rgba(0,0,0,.55);backdrop-filter:blur(3px)}
      .better-hunt-stat-strip div{min-width:0;padding:7px 4px;text-align:center;border-left:1px solid rgba(255,255,255,.12)}
      .better-hunt-stat-strip div:first-child{border-left:0}
      .better-hunt-stat-strip strong{display:block;overflow:hidden;color:#fff;font-size:.94em;font-weight:900;line-height:1.1;text-overflow:ellipsis;white-space:nowrap}
      .better-hunt-volatility-bars{--bh-vol-color:#9aa8c3;display:inline-flex;align-items:flex-end;justify-content:flex-end;gap:3px;min-width:32px;height:16px}.better-hunt-volatility-bars i{display:block;width:5px;height:12px;border-radius:999px;background:rgba(110,128,160,.22);box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)}.better-hunt-volatility-bars i:nth-child(1){height:7px}.better-hunt-volatility-bars i:nth-child(2){height:10px}.better-hunt-volatility-bars i:nth-child(3){height:13px}.better-hunt-volatility-bars i:nth-child(4){height:16px}.better-hunt-volatility-bars .is-filled{background:var(--bh-vol-color);box-shadow:0 0 7px color-mix(in srgb,var(--bh-vol-color) 72%,transparent),inset 0 1px 0 rgba(255,255,255,.32)}.better-hunt-volatility-bars--1{--bh-vol-color:#43e37d}.better-hunt-volatility-bars--2{--bh-vol-color:#ffd43b}.better-hunt-volatility-bars--3{--bh-vol-color:#ff453a}.better-hunt-volatility-bars--4{--bh-vol-color:#ff1f2d}.better-hunt-volatility-bars--4 .is-filled{box-shadow:0 0 9px rgba(255,31,45,.95),0 0 18px rgba(255,31,45,.75),inset 0 1px 0 rgba(255,255,255,.38)}
      .better-hunt-image-stats-panel{height:210px;display:grid;grid-template-columns:41% minmax(0,1fr);overflow:hidden;border:1px solid color-mix(in srgb,var(--bh-line-hi) 60%,transparent);border-radius:12px;background:var(--bh-inset);box-shadow:0 6px 22px rgba(0,0,0,.55),inset 0 1px 0 color-mix(in srgb,var(--bh-steel-hi) 10%,transparent)}
      .better-hunt-image-stats-panel--super{animation:better-hunt-gold calc(2.4s / var(--anim-speed,1)) ease-in-out infinite;border-color:#ffd23d}
      .better-hunt-image-stats-panel--extreme{border-color:rgba(255,84,112,.72);border-style:dashed}
      .better-hunt-image-stats-panel--extreme .better-hunt-image-stats-art img{animation:better-hunt-cloak calc(4s / var(--anim-speed,1)) ease-in-out infinite}
      .better-hunt-image-stats-art{position:relative;z-index:0;min-width:0;overflow:visible;background:var(--bh-inset)}.better-hunt-image-stats-art img{animation:better-hunt-kenburns calc(8s / var(--anim-speed,1)) ease-out both}.better-hunt-image-stats-art .better-hunt-image-stats-img{position:relative;z-index:0;width:100%;height:100%;object-fit:contain;object-position:center}.better-hunt-image-stats-art::after{content:"";position:absolute;inset:0 -22px 0 0;z-index:1;background:linear-gradient(90deg,transparent 0%,rgba(2,8,23,.05) 58%,var(--bh-inset) 100%),linear-gradient(0deg,rgba(0,0,0,.35),transparent 58%);pointer-events:none}
      .better-hunt-image-stats-copy{position:relative;z-index:3;min-width:0;display:flex;flex-direction:column;justify-content:space-between;gap:8px;padding:12px}.better-hunt-image-stats-title{position:relative;z-index:4;display:flex;align-items:flex-start;justify-content:space-between;gap:8px;min-width:0}.better-hunt-image-stats-title h3{position:relative;z-index:4;min-width:0;overflow:hidden;margin:0;color:#fff;font-size:1.22em;font-weight:950;line-height:1;text-overflow:ellipsis;text-transform:uppercase;white-space:nowrap}.better-hunt-image-row{position:relative;z-index:4;display:flex;align-items:center;justify-content:space-between;gap:8px;border-bottom:1px solid rgba(255,255,255,.08);padding:5px 0}.better-hunt-image-row:last-child{border-bottom:0}.better-hunt-image-row strong{overflow:hidden;color:#fff;font-size:.94em;font-weight:900;text-overflow:ellipsis;white-space:nowrap}
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
      .better-hunt-list--scroll .better-hunt-list-inner{animation:better-hunt-marquee-up calc(var(--bh-list-duration,26s) / var(--anim-speed,1)) linear infinite}
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
      .better-hunt-requests{display:grid;grid-template-columns:auto minmax(0,1fr);gap:8px;align-items:stretch;overflow:hidden;border:1px solid color-mix(in srgb,var(--bh-line-hi) 38%,transparent);border-radius:10px;background:linear-gradient(180deg,color-mix(in srgb,var(--bh-card-hi) 62%,transparent),color-mix(in srgb,var(--bh-card-lo) 70%,transparent));padding:8px}
      .better-hunt-requests-head{display:grid;min-width:74px;align-content:center;gap:4px;border-right:1px solid rgba(255,255,255,.1);padding-right:8px}.better-hunt-requests-head span{color:var(--bh-steel-dim);font-size:.62em;font-weight:900;letter-spacing:.14em;text-transform:uppercase}.better-hunt-requests-head strong{color:var(--bh-ice);font-size:1.35em;font-weight:950;line-height:1;text-shadow:0 0 10px color-mix(in srgb,var(--bh-ice) 40%,transparent)}
      .better-hunt-request-list{min-width:0;display:grid;gap:5px}.better-hunt-request{min-width:0;display:flex;align-items:center;justify-content:space-between;gap:8px;border-radius:7px;background:rgba(0,0,0,.22);padding:5px 7px}.better-hunt-request span{overflow:hidden;color:var(--bh-steel-hi);font-size:.72em;font-weight:900;text-overflow:ellipsis;white-space:nowrap}.better-hunt-request strong{overflow:hidden;color:#fff;font-size:.76em;font-weight:900;text-overflow:ellipsis;text-transform:uppercase;white-space:nowrap}.better-hunt-request--empty{justify-content:center;color:var(--bh-steel-dim)}
      .better-hunt-total{display:grid;gap:0;overflow:hidden;border:1px solid color-mix(in srgb,var(--bh-line-hi) 42%,transparent);border-radius:10px;background:rgba(0,0,0,.18)}
      .better-hunt-total-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 10px}
      .better-hunt-total-head span{color:var(--bh-steel-dim);font-size:.72em;font-weight:900;letter-spacing:.15em;text-transform:uppercase}.better-hunt-total-head strong{color:var(--bh-ice);font-size:1.28em;font-weight:950;line-height:1}
      .better-hunt-drawer{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:0 8px 8px}.better-hunt-result{min-width:0;display:flex;align-items:center;gap:8px;border-radius:7px;padding:6px;background:rgba(255,255,255,.045)}.better-hunt-result strong{display:block;overflow:hidden;color:#fff;font-size:.78em;text-overflow:ellipsis;white-space:nowrap}.better-hunt-result em{display:inline-flex;border-radius:999px;padding:2px 5px;background:rgba(69,200,255,.12);color:var(--bh-ice);font-size:.62em;font-style:normal;font-weight:900;letter-spacing:.1em;text-transform:uppercase}.better-hunt-result--worst em{background:rgba(255,84,112,.12);color:#ff6a4d}
      .better-hunt-log-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px}.better-hunt-log-head h3{margin:0;color:#fff;font-size:1.1em;font-weight:950;text-transform:uppercase}.better-hunt-log-head span{color:var(--bh-steel-dim);font-size:.74em;font-weight:800}
      .better-hunt-lanes{min-height:0;display:flex;flex-direction:column;justify-content:center;gap:10px;padding:0 12px 12px;overflow:hidden}.better-hunt-lane{overflow:hidden;mask-image:linear-gradient(to right,transparent 0%,#000 5%,#000 95%,transparent 100%);-webkit-mask-image:linear-gradient(to right,transparent 0%,#000 5%,#000 95%,transparent 100%)}.better-hunt-lane-track{display:flex;width:max-content;gap:10px}.better-hunt-lane-track--left{animation:better-hunt-marquee-left calc(48s / var(--anim-speed,1)) linear infinite}.better-hunt-lane-track--right{animation:better-hunt-marquee-right calc(54s / var(--anim-speed,1)) linear infinite}
      .better-hunt-hcard{position:relative;flex:0 0 auto;overflow:hidden;width:122px;height:172px;border:1px solid color-mix(in srgb,var(--bh-line-hi) 50%,transparent);border-radius:10px;background:var(--bh-inset);box-shadow:inset 0 1px 0 color-mix(in srgb,var(--bh-steel-hi) 10%,transparent),0 4px 12px rgba(0,0,0,.55)}.better-hunt-hcard.is-large{width:144px;height:202px}.better-hunt-hcard img{width:100%;height:100%;object-fit:cover}.better-hunt-hcard::after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(0,0,0,.95),rgba(0,0,0,.35),transparent)}.better-hunt-hcard-content{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:space-between;padding:8px}.better-hunt-hcard-top{display:flex;align-items:center;justify-content:space-between;gap:6px}.better-hunt-hcard-bet{max-width:58px;overflow:hidden;border:1px solid rgba(255,255,255,.1);border-radius:999px;background:rgba(0,0,0,.55);padding:2px 6px;color:var(--bh-ice);font-size:.68em;font-weight:900;text-overflow:ellipsis;white-space:nowrap}.better-hunt-hcard-title{overflow:hidden;color:#fff;font-size:.88em;font-weight:950;line-height:1.05;text-overflow:ellipsis;text-transform:uppercase;white-space:nowrap}
      .better-hunt-root[data-session="opening"] .better-hunt-pill{border-color:rgba(255,201,61,.72);background:rgba(255,201,61,.12);color:#ffc93d}.better-hunt-root[data-session="ended"] .better-hunt-pill{border-color:rgba(210,220,230,.34);background:rgba(210,220,230,.08);color:var(--bh-steel-hi)}
      .better-hunt-panel--shake{animation:better-hunt-widget-shake .6s ease-in-out .1s 3}
      .better-hunt-stat,.better-hunt-row,.better-hunt-total,.better-hunt-requests,.better-hunt-result{border-radius:var(--bh-stat-radius,7px)}
      .better-hunt-header{position:relative;justify-content:center;gap:10px;min-height:calc(var(--bh-avatar) + 6px)}
      .better-hunt-header--banner{margin:-12px -12px 0;padding:14px 48px 13px;border-top:2px solid var(--bh-line-hi);border-bottom:2px solid var(--bh-line-hi);background:linear-gradient(180deg,color-mix(in srgb,var(--bh-line-hi) 38%,var(--bh-panel-hi)),color-mix(in srgb,var(--bh-line) 38%,var(--bh-panel-mid)));box-shadow:inset 0 2px 8px rgba(0,0,0,.55),inset 0 -2px 8px rgba(0,0,0,.35)}
      .better-hunt-header--banner::before,.better-hunt-header--banner::after{content:"";position:absolute;left:8px;right:8px;height:1px;background:linear-gradient(90deg,transparent,var(--bh-line-hi),transparent);opacity:.6}.better-hunt-header--banner::before{top:5px}.better-hunt-header--banner::after{bottom:5px}
      .better-hunt-main-title{position:relative;z-index:1;margin:0;color:#fff;font-size:18px;font-weight:950;letter-spacing:.16em;line-height:1;text-transform:uppercase;text-shadow:0 1px 3px rgba(0,0,0,.75)}
      .better-hunt-avatar--ring{position:relative;z-index:1;border-width:3px;box-shadow:0 0 0 1px rgba(0,0,0,.85),0 0 0 4px color-mix(in srgb,var(--bh-line-hi) 42%,transparent),0 3px 12px rgba(0,0,0,.65)}
      .better-hunt-pill{position:relative;z-index:1;border-radius:6px;letter-spacing:.14em;text-transform:uppercase}.better-hunt-pill--opening{border-color:rgba(255,201,61,.72);background:rgba(255,201,61,.12);color:#ffc93d}.better-hunt-pill--ended{border-color:rgba(210,220,230,.34);background:rgba(210,220,230,.08);color:var(--bh-steel-hi)}
      .better-hunt-laurel{position:absolute;top:50%;z-index:1;width:28px;height:28px;transform:translateY(-50%);opacity:.9}.better-hunt-laurel::before{content:"";position:absolute;inset:0;border:2px solid var(--bh-line-hi);border-right-color:transparent;border-bottom-color:transparent;border-radius:50%;transform:rotate(-45deg)}.better-hunt-laurel--left{left:14px}.better-hunt-laurel--right{right:14px;transform:translateY(-50%) scaleX(-1)}
      .better-hunt-card--center{border-color:var(--bh-ice);animation:better-hunt-hot-pulse calc(2.4s / var(--anim-speed,1)) ease-in-out infinite}.better-hunt-card--center.better-hunt-card--super{animation:better-hunt-gold calc(2.4s / var(--anim-speed,1)) ease-in-out infinite}
      .better-hunt-ring .better-hunt-card,.better-hunt-ring .better-hunt-card--center,.better-hunt-ring .better-hunt-card--center.better-hunt-card--super,.better-hunt-ring .better-hunt-card--extreme{animation:none}
      .better-hunt-track{position:relative}.better-hunt-track::before,.better-hunt-track::after{content:"";position:absolute;top:50%;width:0;height:0;border-top:7px solid transparent;border-bottom:7px solid transparent;transform:translateY(-50%)}.better-hunt-track::before{left:-10px;border-right:10px solid var(--bh-line-hi)}.better-hunt-track::after{right:-10px;border-left:10px solid var(--bh-line-hi)}
      .better-hunt-rails{position:relative;padding-left:14px;padding-right:14px}.better-hunt-rails::before,.better-hunt-rails::after{content:"";position:absolute;top:0;bottom:0;width:8px;border-radius:999px;background:linear-gradient(180deg,var(--bh-line-hi),var(--bh-line-mid),var(--bh-line-hi));box-shadow:inset 1px 0 0 rgba(255,255,255,.18),inset -1px 0 0 rgba(0,0,0,.55),0 0 8px color-mix(in srgb,var(--bh-line-hi) 30%,transparent)}.better-hunt-rails::before{left:0}.better-hunt-rails::after{right:0}
      .better-hunt-requests{grid-template-columns:1fr;gap:7px}.better-hunt-requests-head{display:flex;align-items:center;justify-content:space-between;gap:10px;min-width:0;border-right:0;padding-right:0}.better-hunt-requests-head h3{margin:0;color:var(--bh-steel);font-size:.72em;font-weight:950;letter-spacing:.2em;line-height:1;text-transform:uppercase}.better-hunt-requests-head strong{display:inline-flex;align-items:center;justify-content:center;min-width:22px;border:1px solid color-mix(in srgb,var(--bh-line-hi) 42%,transparent);border-radius:999px;background:color-mix(in srgb,var(--bh-track) 70%,transparent);padding:1px 6px;color:var(--bh-steel-dim);font-size:.7em;line-height:1}
      .better-hunt-request{border:1px solid color-mix(in srgb,var(--bh-line-hi) 20%,transparent);background:rgba(0,0,0,.2)}.better-hunt-request strong{text-align:right}
      .better-hunt-win{position:absolute;inset:0;z-index:50;overflow:hidden;border-radius:inherit;pointer-events:none;animation:better-hunt-win-life var(--bh-win-duration,3s) ease both}.better-hunt-win-border{position:absolute;inset:0;border:2px solid var(--bh-win-color);border-radius:inherit;box-shadow:inset 0 0 40px var(--bh-win-glow);animation:better-hunt-win-border .9s ease-in-out infinite}.better-hunt-win-flash{position:absolute;inset:0;background:radial-gradient(70% 60% at 50% 50%,var(--bh-win-glow),transparent 72%);animation:better-hunt-win-flash 1s ease-out both}.better-hunt-win-rays{position:absolute;left:50%;top:50%;height:150%;width:150%;background:repeating-conic-gradient(from 0deg,var(--bh-win-color) 0deg 5deg,transparent 5deg 13deg);opacity:.45;mask-image:radial-gradient(circle,#000 0%,transparent 62%);-webkit-mask-image:radial-gradient(circle,#000 0%,transparent 62%);transform:translate(-50%,-50%);animation:better-hunt-win-rays 9s linear infinite}.better-hunt-win-ring{position:absolute;left:50%;top:50%;width:160px;height:160px;border:2px solid var(--bh-win-color);border-radius:50%;box-shadow:0 0 30px var(--bh-win-color);animation:better-hunt-win-ring 1.3s cubic-bezier(.2,.8,.3,1) both}.better-hunt-win-confetti{position:absolute;top:-14px;border-radius:2px;will-change:transform;animation:better-hunt-win-confetti linear both}.better-hunt-win-cannon{position:absolute;bottom:0;width:10px;height:10px;border-radius:999px;background:radial-gradient(circle at 32% 30%,#fff3c4 0%,#ffd23d 40%,#b07a10 100%);box-shadow:0 0 18px var(--bh-win-color)}.better-hunt-win-cannon--left{left:14px}.better-hunt-win-cannon--right{right:14px}.better-hunt-win-cannon::before,.better-hunt-win-cannon::after{content:"";position:absolute;width:7px;height:7px;border-radius:999px;background:var(--bh-win-color);box-shadow:0 0 10px currentColor;animation:better-hunt-win-ring 1.1s ease-out both}.better-hunt-win-cannon::before{--bh-win-sway:80px;animation-delay:.12s}.better-hunt-win-cannon::after{--bh-win-sway:-70px;animation-delay:.28s}.better-hunt-win-badge{position:absolute;left:50%;top:50%;display:grid;gap:4px;min-width:190px;max-width:82%;transform:translate(-50%,-50%);border:2px solid var(--bh-win-color);border-radius:16px;background:linear-gradient(180deg,color-mix(in srgb,var(--bh-panel-hi) 95%,transparent),color-mix(in srgb,var(--bh-panel-lo) 95%,transparent));padding:18px 26px;text-align:center;box-shadow:0 0 50px var(--bh-win-glow),inset 0 0 26px var(--bh-win-glow);animation:better-hunt-win-badge .85s cubic-bezier(.2,.9,.25,1) both,better-hunt-win-float 2.4s ease-in-out .9s infinite}.better-hunt-win-label{color:var(--bh-win-color);font-size:14px;font-weight:950;letter-spacing:.32em;text-transform:uppercase;text-shadow:0 0 18px var(--bh-win-glow)}.better-hunt-win-badge strong{color:#fff;font-size:56px;font-weight:950;line-height:.95;text-shadow:0 0 28px var(--bh-win-glow),0 4px 0 rgba(0,0,0,.5)}.better-hunt-win-badge em{overflow:hidden;color:var(--bh-steel-hi);font-size:10px;font-style:normal;font-weight:900;letter-spacing:.2em;text-overflow:ellipsis;text-transform:uppercase;white-space:nowrap}.better-hunt-win-clip{position:absolute;left:50%;bottom:12px;transform:translateX(-50%);border:2px solid var(--bh-win-color);border-radius:999px;background:rgba(0,0,0,.72);padding:5px 12px;color:var(--bh-win-color);font-size:11px;font-weight:950;letter-spacing:.2em;text-transform:uppercase}
      .better-hunt-root[data-skin="roman"] .better-hunt-panel{background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E"),linear-gradient(180deg,#1e1610 0%,#18120d 50%,#120e09 100%);background-blend-mode:overlay,normal;background-size:200px 200px,cover;border:2px solid #6a4028;border-radius:8px;box-shadow:0 0 0 1px #3a2010,0 0 0 3px #7a5030,0 0 0 4px #2a1808,0 22px 60px rgba(0,0,0,.9),inset 0 1px 0 rgba(180,120,60,.12),inset 0 0 80px rgba(80,30,10,.35)}.better-hunt-root[data-skin="roman"] .better-hunt-header--banner{background:linear-gradient(180deg,#7a1010 0%,#560c0c 55%,#6e1010 100%);border-color:#8a5030}.better-hunt-root[data-skin="roman"] .better-hunt-main-title{color:#e8c890}.better-hunt-root[data-skin="roman"] .better-hunt-stat{background:linear-gradient(180deg,#2a1e14 0%,#221a10 100%);border-color:#6a4028}.better-hunt-root[data-skin="roman"] .better-hunt-row,.better-hunt-root[data-skin="roman"] .better-hunt-total,.better-hunt-root[data-skin="roman"] .better-hunt-requests{background:linear-gradient(180deg,#221a10 0%,#1a1408 100%);border-color:#5a3818}.better-hunt-root[data-skin="roman"] .better-hunt-divider{background:linear-gradient(90deg,transparent,rgba(138,80,48,.55),transparent)}
      .better-hunt-root[data-skin="metal"] .better-hunt-panel{background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' seed='4'/%3E%3CfeComponentTransfer%3E%3CfeFuncR type='linear' slope='0.4' intercept='0.08'/%3E%3CfeFuncG type='linear' slope='0.42' intercept='0.09'/%3E%3CfeFuncB type='linear' slope='0.46' intercept='0.11'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E"),url("/better-bonus-hunt/metal-bg.jpg"),linear-gradient(180deg,#222830 0%,#1a1e26 45%,#12151a 100%);background-blend-mode:soft-light,luminosity,normal;background-size:300px 300px,cover,cover;border:2px solid #505565;border-radius:8px;box-shadow:0 0 0 1px #0e1015,0 0 0 3px #686e7a,0 0 0 4px #0e1015,0 22px 60px rgba(0,0,0,.85),inset 0 1px 0 rgba(200,210,230,.15),inset 0 -1px 0 rgba(0,0,0,.5)}.better-hunt-root[data-skin="metal"] .better-hunt-panel::after{content:none}.better-hunt-root[data-skin="metal"] .better-hunt-header--banner{background:linear-gradient(180deg,#282e3a 0%,#1e222a 50%,#222832 100%);border-color:#5a6070}.better-hunt-root[data-skin="metal"] .better-hunt-stat{background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='3' seed='7'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='0.45'/%3E%3C/svg%3E"),linear-gradient(180deg,#242830 0%,#1c2028 100%);background-blend-mode:soft-light,normal;border-color:#505565}.better-hunt-root[data-skin="metal"] .better-hunt-row,.better-hunt-root[data-skin="metal"] .better-hunt-total,.better-hunt-root[data-skin="metal"] .better-hunt-requests{background:linear-gradient(180deg,#1e2230 0%,#161a22 100%);border-color:#3a4050}
      .better-hunt-root[data-skin="cyberpunk"] .better-hunt-panel{background:linear-gradient(rgba(255,255,255,.025) 50%,rgba(0,0,0,.12) 50%),radial-gradient(120% 70% at 50% 0%,rgba(255,43,214,.18),transparent 44%),radial-gradient(100% 70% at 100% 100%,rgba(0,217,255,.14),transparent 45%),linear-gradient(180deg,#14001f 0%,#07112b 48%,#070014 100%);background-size:100% 3px,cover,cover,cover;border:1.5px solid rgba(255,43,214,.7);border-radius:var(--bh-radius);box-shadow:0 0 0 1px rgba(0,217,255,.35),0 0 30px rgba(255,43,214,.34),0 0 70px rgba(0,217,255,.18),inset 0 1px 0 rgba(255,255,255,.12),inset 0 0 36px rgba(255,43,214,.1)}.better-hunt-root[data-skin="cyberpunk"] .better-hunt-header--banner{background:linear-gradient(90deg,rgba(255,43,214,.18),rgba(0,217,255,.14)),linear-gradient(180deg,#1b0532 0%,#090821 100%);border-top-color:#ff2bd6;border-bottom-color:#00d9ff}.better-hunt-root[data-skin="cyberpunk"] .better-hunt-main-title{color:#f7eaff;text-shadow:0 0 10px rgba(255,43,214,.75),0 0 18px rgba(0,217,255,.45)}.better-hunt-root[data-skin="cyberpunk"] .better-hunt-stat{background:linear-gradient(180deg,rgba(23,16,46,.95),rgba(8,7,28,.95));border-color:rgba(0,217,255,.45);box-shadow:inset 0 1px 0 rgba(255,255,255,.1),0 0 12px rgba(0,217,255,.16),0 0 18px rgba(255,43,214,.1)}.better-hunt-root[data-skin="cyberpunk"] .better-hunt-row,.better-hunt-root[data-skin="cyberpunk"] .better-hunt-total,.better-hunt-root[data-skin="cyberpunk"] .better-hunt-requests{background:linear-gradient(180deg,rgba(18,8,36,.9),rgba(6,5,20,.92));border-color:rgba(255,43,214,.32)}
      .better-hunt-root[data-skin="spartan"] .better-hunt-panel{background:repeating-linear-gradient(45deg,rgba(255,255,255,.015) 0 1px,transparent 1px 4px),repeating-linear-gradient(-45deg,rgba(255,255,255,.015) 0 1px,transparent 1px 4px),radial-gradient(110% 70% at 50% 0%,rgba(200,160,48,.14),transparent 48%),radial-gradient(100% 60% at 50% 100%,rgba(160,20,10,.22),transparent 50%),linear-gradient(180deg,#1a0c0a 0%,#120808 50%,#0a0505 100%);background-blend-mode:overlay,overlay,screen,screen,normal;background-size:4px 4px,4px 4px,cover,cover,cover;border:2px solid #c8a030;border-radius:10px;box-shadow:0 0 0 1px #080404,0 0 0 4px rgba(200,160,48,.35),0 0 36px rgba(140,20,10,.45),0 0 70px rgba(200,160,48,.15),0 24px 72px rgba(0,0,0,.9),inset 0 1px 0 rgba(240,210,120,.18),inset 0 0 60px rgba(140,20,10,.2)}.better-hunt-root[data-skin="spartan"] .better-hunt-panel::before{content:"";position:absolute;inset:0;border-radius:inherit;background:repeating-conic-gradient(from 0deg,#c8a030 0deg 3deg,transparent 3deg 12deg);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;padding:3px;pointer-events:none;z-index:0;opacity:.7}.better-hunt-root[data-skin="spartan"] .better-hunt-panel>*{position:relative;z-index:1}.better-hunt-root[data-skin="spartan"] .better-hunt-header--banner{background:repeating-linear-gradient(90deg,rgba(255,255,255,.018) 0 1px,transparent 1px 4px),linear-gradient(180deg,#a01410 0%,#7a0c0a 50%,#901210 100%);border-color:#c8a030}.better-hunt-root[data-skin="spartan"] .better-hunt-main-title{color:#f0d8a0;text-shadow:0 0 12px rgba(200,160,48,.45),0 1px 2px rgba(0,0,0,.7)}.better-hunt-root[data-skin="spartan"] .better-hunt-stat{background:radial-gradient(90% 120% at 50% 0%,rgba(200,160,48,.12),transparent 60%),linear-gradient(180deg,#20100e 0%,#140a0a 100%);border-color:#8a5a10}.better-hunt-root[data-skin="spartan"] .better-hunt-row,.better-hunt-root[data-skin="spartan"] .better-hunt-total,.better-hunt-root[data-skin="spartan"] .better-hunt-requests{background:radial-gradient(100% 130% at 20% 0%,rgba(200,160,48,.08),transparent 50%),linear-gradient(180deg,#1a0c0a 0%,#100707 100%);border-color:#5a2a18}
      .better-hunt-root[data-skin="bloody"] .better-hunt-panel{background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Cg fill='%23800808' opacity='0.55'%3E%3Cpath d='M60 40 Q65 30 70 40 Q75 55 68 60 Q60 55 60 40z'/%3E%3Ccircle cx='72' cy='72' r='3'/%3E%3Ccircle cx='340' cy='90' r='6'/%3E%3Cpath d='M320 80 Q330 78 335 85 Q332 92 322 88 Z'/%3E%3Ccircle cx='352' cy='102' r='2.5'/%3E%3C/g%3E%3C/svg%3E"),url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='320' viewBox='0 0 320 320'%3E%3Cg stroke='%23400808' stroke-width='1.5' fill='none' opacity='0.4'%3E%3Cpath d='M60 260 L260 60 M60 60 L260 260'/%3E%3C/g%3E%3C/svg%3E"),linear-gradient(180deg,#1a0404 0%,#100202 55%,#080101 100%);background-blend-mode:normal,multiply,normal;background-size:400px 400px,320px 320px,cover;border:3px solid #700808;border-radius:8px;box-shadow:0 0 0 1px #040101,0 0 0 4px rgba(160,20,20,.55),0 0 0 5px #040101,0 0 44px rgba(180,20,20,.45),0 24px 70px rgba(0,0,0,.9),inset 0 1px 0 rgba(255,80,80,.15),inset 0 0 80px rgba(140,10,10,.3)}.better-hunt-root[data-skin="bloody"] .better-hunt-panel::after{content:"";position:absolute;inset:6px;border:1px dashed rgba(200,40,40,.25);border-radius:inherit;pointer-events:none;opacity:.7}.better-hunt-root[data-skin="bloody"] .better-hunt-header--banner{background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='40' viewBox='0 0 60 40'%3E%3Cg fill='none' stroke='%23ff4050' stroke-width='1.2' opacity='0.35'%3E%3Cpath d='M30 5 C20 5 14 12 14 20 L14 30 L20 30 L22 34 L24 30 L26 34 L28 30 L30 34 L32 30 L34 34 L36 30 L40 30 L46 30 L46 20 C46 12 40 5 30 5 Z'/%3E%3C/g%3E%3C/svg%3E"),linear-gradient(180deg,#b01818 0%,#800a0a 50%,#a01414 100%);background-repeat:no-repeat,no-repeat;background-position:center,center;background-size:55px 38px,cover;border-top-color:#ff2030;border-bottom-color:#700808}.better-hunt-root[data-skin="bloody"] .better-hunt-main-title{color:#ffe0c8;text-shadow:0 0 12px rgba(255,60,80,.75),0 1px 3px rgba(0,0,0,.85);letter-spacing:.14em}.better-hunt-root[data-skin="bloody"] .better-hunt-stat{background:linear-gradient(180deg,#1e0404 0%,#140202 100%);border-color:#8a1818}.better-hunt-root[data-skin="bloody"] .better-hunt-row,.better-hunt-root[data-skin="bloody"] .better-hunt-total,.better-hunt-root[data-skin="bloody"] .better-hunt-requests{background:radial-gradient(120% 130% at 100% 0%,rgba(200,30,30,.1),transparent 55%),linear-gradient(180deg,#180303 0%,#0e0202 100%);border-color:#5a1210}
      .better-hunt-root[data-anim="off"]::before,.better-hunt-root[data-anim="off"]::after,.better-hunt-root[data-anim="off"] .better-hunt-list-inner,.better-hunt-root[data-anim="off"] .better-hunt-lane-track,.better-hunt-root[data-anim="off"] .better-hunt-card--center,.better-hunt-root[data-anim="off"] .better-hunt-card--super,.better-hunt-root[data-anim="off"] .better-hunt-card--extreme,.better-hunt-root[data-anim="off"] .better-hunt-stats-image img,.better-hunt-root[data-anim="off"] .better-hunt-image-stats-art img,.better-hunt-root[data-anim="off"] .better-hunt-panel--shake,.better-hunt-root[data-anim="off"] .better-hunt-win,.better-hunt-root[data-anim="off"] .better-hunt-win *{animation:none!important}
      @media (max-width:640px){.better-hunt-shell{padding:10px}.better-hunt-horizontal{height:auto;grid-template-columns:1fr}.better-hunt-left{border-right:0;border-bottom:1px solid rgba(255,255,255,.08)}.better-hunt-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.better-hunt-stat-strip{grid-template-columns:repeat(2,minmax(0,1fr))}.better-hunt-stat-strip div{border-left:0;border-top:1px solid rgba(255,255,255,.12)}.better-hunt-requests{grid-template-columns:1fr}.better-hunt-requests-head{grid-template-columns:1fr auto;align-items:center;border-right:0;border-bottom:1px solid rgba(255,255,255,.1);padding:0 0 7px}}
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
  const sessionState = normalizeBetterHuntSessionState(c);
  const rotatingIndex = useBetterHuntCarousel(
    rows.length,
    Number(c.carouselMs) || 3200,
    c.animations !== false && sessionState === "hunt",
    initialIndex,
  );
  const lockedIndex = sessionState === "ended"
    ? Math.max(0, rows.length - 1)
    : firstUnopened >= 0
      ? firstUnopened
      : Math.max(0, rows.length - 1);
  const activeIndex = rows.length && sessionState !== "hunt" ? lockedIndex : rotatingIndex;
  const current = rows[activeIndex] || rows[initialIndex] || rows[0] || null;
  const money = currency || c.currency || "€";
  const skin = normalizeBetterHuntSkin(c.skin);
  const theme = skin !== "modern"
    ? BETTER_HUNT_THEMES[skin]
    : BETTER_HUNT_THEMES[c.colour] || BETTER_HUNT_THEMES.ocean;
  const orientation = ["horizontal", "mainstream"].includes(c.orientation) ? c.orientation : "vertical";
  const listMode = ["compact", "image", "names"].includes(c.listMode) ? c.listMode : "compact";
  const carouselMode = ["3d", "imagestats", "stats"].includes(c.carouselMode) ? c.carouselMode : "3d";
  const visibleRows = Math.max(3, Math.min(8, Number(c.visibleRows) || 5));
  const rowHeight = BETTER_HUNT_ROW_HEIGHT[listMode] || BETTER_HUNT_ROW_HEIGHT.compact;
  const listHeight = visibleRows * rowHeight + 6;
  const uiScale = Math.max(0.75, Math.min(1.35, Number(c.uiScale) || 1));
  const barHeight = Math.max(3, Math.min(10, Number(c.barHeight) || 6));
  const avatarSize = Math.max(20, Math.min(44, Number(c.avatarSize) || 28));
  const edgeRadius = clampNumber(c.edgeRadius ?? c.radius ?? c.cardRadius, 0, 36, 14);
  const statRadius = clampNumber(c.statRadius, 0, 22, 7);
  const defaultPanelWidth = orientation === "horizontal" ? 1080 : orientation === "mainstream" ? 372 : 402;
  const panelWidth = clampNumber(c.widgetWidth ?? c.panelWidth, 320, 1280, defaultPanelWidth);
  const panelHeight = clampNumber(c.widgetHeight ?? c.panelHeight, 0, 980, 0);
  const font = c.fontFamily || BETTER_HUNT_FONTS[c.font] || BETTER_HUNT_FONTS.rajdhani;
  const title = c.title || c.huntTitle || "Bonus";
  const avatarUrl =
    c.avatarUrl ||
    c.streamerAvatar ||
    c.avatarImageUrl ||
    c.profileAvatarUrl ||
    c.avatar_url ||
    "";
  const progress = rows.length ? Math.round((opened.length / rows.length) * 100) : 0;
  const activeStep = rows.length
    ? sessionState === "ended"
      ? rows.length
      : Math.min(rows.length, Math.max(1, opened.length + 1))
    : 0;
  const requestRows = ["requests", "slotRequests", "pendingRequests", "slotRequestQueue"].reduce((found, key) => (
    found.length ? found : normalizeBetterHuntRequests(c[key])
  ), []);
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
  const listRows = rows;
  const scrollingRows = rows.length > visibleRows ? [...listRows, ...listRows] : listRows;
  const listDuration = `${Math.max(26, rows.length * 1.35)}s`;
  const winAccents = {
    roman: { ember: "#c0281c", tangerine: "#a06820" },
    metal: { ember: "#e04820", tangerine: "#c89430" },
    cyberpunk: { ember: "#ff2bd6", tangerine: "#ffd04d" },
    spartan: { ember: "#b01818", tangerine: "#d09030" },
    bloody: { ember: "#d01818", tangerine: "#cc6820" },
  }[skin] || { ember: "#ff6a4d", tangerine: "#ffc93d" };
  const [previewWin, setPreviewWin] = useState(null);
  const activeSlotLabel = current ? bonusSlotName(current, activeIndex) : "";
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const trigger = (detail = {}) => {
      if (detail.instanceId && c.__betterInstanceId && detail.instanceId !== c.__betterInstanceId) return;
      const mult = Math.max(1, Number(detail.mult || detail.multiplier || detail.x) || 100);
      setPreviewWin({
        id: Date.now(),
        mult,
        tier: betterHuntWinTier(mult, detail.max === true),
        slot: detail.slot || activeSlotLabel,
      });
    };
    const handler = (event) => trigger(event.detail || {});
    window.addEventListener("better-bonus-hunt-preview-win", handler);
    if (!window.__betterBonusHuntTriggerInstalled) {
      const previousTrigger = window.__boTriggerWin;
      window.__boTriggerWin = (mult, extra = {}) => {
        window.dispatchEvent(new CustomEvent("better-bonus-hunt-preview-win", {
          detail: {
            ...(extra || {}),
            mult,
          },
        }));
        if (typeof previousTrigger === "function") previousTrigger(mult, extra);
      };
      window.__betterBonusHuntTriggerInstalled = true;
    }
    return () => window.removeEventListener("better-bonus-hunt-preview-win", handler);
  }, [activeSlotLabel, c.__betterInstanceId]);
  const panelShakeClass = previewWin && ["epic", "insane", "max"].includes(previewWin.tier)
    ? " better-hunt-panel--shake"
    : "";
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
    "--bh-ice": skin !== "modern" ? theme.ice : c.headerAccent || c.accentColor || theme.ice,
    "--bh-ice-deep": theme.iceDeep,
    "--bh-ice-mid": theme.iceMid,
    "--bh-ember": winAccents.ember,
    "--bh-tangerine": winAccents.tangerine,
    "--bh-glow-a": theme.glowA,
    "--bh-glow-b": theme.glowB,
    "--bh-font": font,
    "--bh-ui": uiScale,
    "--bh-avatar": `${avatarSize}px`,
    "--bh-bar-height": `${barHeight}px`,
    "--bh-radius": `${edgeRadius}px`,
    "--bh-stat-radius": `${statRadius}px`,
    "--bh-panel-width": `${panelWidth}px`,
    "--bh-panel-height": panelHeight > 0 ? `${panelHeight}px` : undefined,
    "--anim-speed": Math.max(0.5, Number(c.animSpeed) || 1),
  });

  const requestName = (request) => (
    request?.displayName ||
    request?.username ||
    request?.user?.displayName ||
    request?.user?.username ||
    (typeof request?.user === "string" ? request.user : "") ||
    request?.name ||
    request?.viewer ||
    "viewer"
  );
  const requestSlot = (request) => (
    request?.slotName ||
    request?.slot?.slotName ||
    request?.slot?.name ||
    (typeof request?.slot === "string" ? request.slot : "") ||
    request?.game ||
    request?.title ||
    "Slot request"
  );
  const renderRequests = () => {
    if (c.showRequests === false) return null;
    const visibleRequests = requestRows.slice(0, 4);
    return (
      <div className="better-hunt-requests" {...attrs("bonus_hunt", c, "requestContainer")}>
        <div className="better-hunt-requests-head">
          <h3>Twitch Requests</h3>
          <strong>{requestRows.length}</strong>
        </div>
        <div className="better-hunt-request-list">
          {visibleRequests.length ? visibleRequests.map((request, index) => (
            <div key={`${requestName(request)}-${requestSlot(request)}-${index}`} className={`better-hunt-request better-hunt-request--${listMode}`}>
              <span>{requestName(request)}</span>
              <strong>{requestSlot(request)}</strong>
            </div>
          )) : (
            <div className="better-hunt-request better-hunt-request--empty">
              <span>No requests yet</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderHeader = () => (
    <header
      className={`better-hunt-header${skin !== "modern" ? " better-hunt-header--banner" : ""}`}
      {...attrs("bonus_hunt", c, "headerContainer")}
    >
      {skin === "roman" ? <span className="better-hunt-laurel better-hunt-laurel--left" /> : null}
      {skin === "roman" ? <span className="better-hunt-laurel better-hunt-laurel--right" /> : null}
      <span className={`better-hunt-avatar${skin !== "modern" ? " better-hunt-avatar--ring" : ""}`} style={{ width: avatarSize, height: avatarSize }}>
        {avatarUrl ? <img src={avatarUrl} alt="" /> : initials(c.streamerName || title)}
      </span>
      <h1 className="better-hunt-main-title" {...attrs("bonus_hunt", c, "headerTitle")}>Bonus</h1>
      <span className={`better-hunt-pill better-hunt-pill--${sessionState}`} {...attrs("bonus_hunt", c, "statValue")}>
        {sessionState === "opening" ? <i className="better-hunt-dot" /> : null}
        {sessionState === "opening" ? "Opening" : sessionState === "ended" ? "Ended" : "Hunt"}
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
      ["Volatility", <BetterHuntVolatilityBars value={bonusVolatility(current)} />],
      ["Max Win", bonusMaxWin(current)],
      ["Best", bonusMultiplierValue(current) > 0 ? formatMultiplier(bonusMultiplierValue(current)) : "-"],
    ];
    if (carouselMode === "imagestats") {
      return (
        <div className="better-hunt-carousel" {...attrs("bonus_hunt", c, "slotCarouselContainer")}>
          <div className={`better-hunt-image-stats-panel better-hunt-image-stats-panel--${tier}`} {...attrs("bonus_hunt", c, "carouselBackdrop")}>
            <div className="better-hunt-image-stats-art">
              <SlotImage src={bonusImage(current)} alt={bonusSlotName(current, activeIndex)} className="better-hunt-image-stats-img" {...attrs("bonus_hunt", c, "slotImage")} />
            </div>
            <div className="better-hunt-image-stats-copy">
              <div className="better-hunt-image-stats-title">
                <h3 {...attrs("bonus_hunt", c, "slotTitle")}>{bonusSlotName(current, activeIndex)}</h3>
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
                      backfaceVisibility: "hidden",
                      opacity: hidden ? 0 : abs === 2 ? 0.4 : 1,
                      pointerEvents: hidden ? "none" : undefined,
                      transformOrigin: "center center",
                      zIndex: 30 - abs * 10,
                      filter: centered || tier === "extreme" ? undefined : "brightness(.62) saturate(.85)",
                      transform: `translate3d(-50%, -50%, 0) translate3d(${delta * 116}px, 0, ${-abs * 130}px) rotateY(${delta * -32}deg) scale(${centered ? 1.14 : 0.9})`,
                    }}
                    {...attrs("bonus_hunt", c, "slotRow", bonusOpened(bonus) ? "opened" : "unopened")}
                  >
                    <BetterHuntThumb bonus={bonus} size={112} className="better-hunt-card-img" />
                    <span className="better-hunt-card-gloss" />
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
      className={`better-hunt-list better-hunt-list--${listMode}${rows.length > visibleRows && c.animations !== false ? " better-hunt-list--scroll" : ""}${skin !== "modern" ? " better-hunt-rails" : ""}`}
      style={{ height: listHeight, "--bh-list-duration": listDuration }}
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
    <section className={`better-hunt-panel better-hunt-horizontal${panelShakeClass}`}>
      <div className="better-hunt-left">
        {renderHeader()}
        <div className="better-hunt-divider" />
        {renderStatBoxes()}
        {renderCarousel()}
        {renderRequests()}
        {renderTotalDrawer()}
      </div>
      {renderHorizontalLog()}
      {previewWin ? <BetterHuntWinOverlay win={previewWin} onDone={() => setPreviewWin(null)} /> : null}
    </section>
  ) : orientation === "mainstream" ? (
    <section className={`better-hunt-panel better-hunt-mainstream${panelShakeClass}`}>
      {renderHeader()}
      {renderCarousel()}
      {renderStatBoxes()}
      {renderRequests()}
      <div className="better-hunt-divider" />
      {renderList()}
      <div className="better-hunt-divider" />
      {renderTotalDrawer()}
      {previewWin ? <BetterHuntWinOverlay win={previewWin} onDone={() => setPreviewWin(null)} /> : null}
    </section>
  ) : (
    <section className={`better-hunt-panel better-hunt-vertical${panelShakeClass}`}>
      {renderHeader()}
      <div className="better-hunt-divider" />
      {renderStatBoxes()}
      {renderCarousel()}
      {renderRequests()}
      <div className="better-hunt-divider" />
      {renderList()}
      <div className="better-hunt-divider" />
      {renderTotalDrawer()}
      {previewWin ? <BetterHuntWinOverlay win={previewWin} onDone={() => setPreviewWin(null)} /> : null}
    </section>
  );

  return (
    <div
      className="better-hunt-root"
      data-anim={c.animations === false ? "off" : "on"}
      data-finish={c.finish || "flat"}
      data-orientation={orientation}
      data-session={sessionState}
      data-skin={skin}
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
  const participants = safeArray(c.participants).map(giveawayParticipant);
  const winnerName =
    typeof c.winner === "object"
      ? c.winner?.name || c.winner?.username || c.winner?.displayName || ""
      : String(c.winner || "");
  const spinningWinner =
    typeof c.spinningWinner === "object"
      ? c.spinningWinner?.name || c.spinningWinner?.username || c.spinningWinner?.displayName || ""
      : String(c.spinningWinner || "");
  const keyword = stripBang(c.keyword);
  const hasWinner = Boolean(winnerName);
  const isLive = c.isActive !== false && !hasWinner;
  const phase = hasWinner ? "winner" : spinningWinner ? "spinning" : "idle";
  const reelOpen = phase !== "idle";
  const entries = Number.isFinite(Number(c.entries))
    ? Number(c.entries)
    : Number.isFinite(Number(c.participantCount))
      ? Number(c.participantCount)
      : participants.length;
  const hue = normalizeHue(c.hue, 208);
  const hueShift = numberValue(c.hueShift, 0);
  const hue2 = normalizeHue(hue + hueShift, hue);
  const hue3 = normalizeHue(hue - hueShift * 0.5, hue);
  const saturation = clampNumber(c.saturation, 0, 100, 88);
  const lightness = clampNumber(c.lightness, 2, 40, 10);
  const accentHue = normalizeHue(hue + hueShift, hue);
  const accentSat = clampNumber(c.accentSat, 0, 100, 96);
  const accentLight = clampNumber(c.accentLight, 30, 90, 58);
  const titleFont = giveawayFontStack(c.titleFont, "orbitron");
  const bodyFont = c.bodyFont ? giveawayFontStack(c.bodyFont, "rajdhani") : c.fontFamily || giveawayFontStack("rajdhani");
  const width = clampNumber(c.width, 240, 1600, 700);
  const height = clampNumber(c.height, 140, 900, 270);
  const letterSpacing = `${Math.max(0, numberValue(c.letterSpacing, 1)) / 100}em`;
  const vars = {
    "--w-width": `${width}px`,
    "--w-height": `${height}px`,
    "--w-pad-x": cssPx(clampNumber(c.padX, 0, 140, 31)),
    "--w-pad-y": cssPx(clampNumber(c.padY, 0, 120, 22)),
    "--w-radius": cssPx(clampNumber(c.radius ?? c.borderRadius, 0, 120, 12)),
    "--w-border-w": cssPx(clampNumber(c.borderWidth, 0, 12, 1)),
    "--w-border-a": clampNumber(c.borderAlpha, 0, 1, 0.9),
    "--w-inner-inset": cssPx(clampNumber(c.innerInset, 0, 40, 5)),
    "--w-inner-op": c.innerFrame === false ? 0 : 1,
    "--w-bracket-op": c.brackets === false ? 0 : 1,
    "--w-bracket-size": cssPx(clampNumber(c.bracketSize, 0, 120, 27)),
    "--w-bracket-w": cssPx(clampNumber(c.bracketWidth, 0, 12, 2)),
    "--w-edgelight-op": c.edgeLights === false ? 0 : 1,
    "--w-dash-op": c.sideDashes === false ? 0 : 0.76,
    "--w-sheen-op": c.sheen === false ? 0 : 1,
    "--w-glow": clampNumber(c.glow, 0, 200, 100) / 100,
    "--w-inner-glow": clampNumber(c.innerGlow, 0, 200, 100) / 100,
    "--w-tile-radius": cssPx(clampNumber(c.tileRadius, 0, 80, 10)),
    "--w-tile-gap": cssPx(clampNumber(c.tileGap, 0, 80, 12)),
    "--w-title-size": cssPx(clampNumber(c.titleSize, 8, 72, 20)),
    "--w-prize-size": cssPx(clampNumber(c.prizeSize, 10, 96, 31)),
    "--w-sub-size": cssPx(clampNumber(c.subSize, 8, 48, 15)),
    "--w-label-size": cssPx(clampNumber(c.labelSize, 6, 32, 10)),
    "--w-value-size": cssPx(clampNumber(c.valueSize, 10, 84, 28)),
    "--w-title-weight": clampNumber(c.titleWeight, 300, 950, 700),
    "--w-letter": letterSpacing,
    "--w-prize-style": c.italicPrize === false ? "normal" : "italic",
    "--w-label-transform": c.uppercaseLabels === false ? "none" : "uppercase",
    "--w-text-glow": clampNumber(c.textGlow, 0, 240, 100) / 100,
    "--w-font-title": titleFont,
    "--w-font-body": bodyFont,
    "--w-hue": hue,
    "--w-hue2": hue2,
    "--w-hue3": hue3,
    "--w-sat": `${saturation}%`,
    "--w-lum": `${lightness}%`,
    "--w-accent": `hsl(${accentHue} ${accentSat}% ${accentLight}%)`,
    "--w-accent-2": `hsl(${hue2} ${accentSat}% ${Math.max(34, accentLight - 14)}%)`,
    "--w-accent-soft": `hsl(${accentHue} ${accentSat}% ${Math.min(86, accentLight + 20)}%)`,
  };
  const className = [
    "better-giveaway-widget",
    isLive ? "is-live" : "is-paused",
    reelOpen ? "is-tall" : "",
    hasWinner ? "has-winner" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="better-giveaway-stage" style={vars}>
      <BetterStyleSheet />
      <section
        className={className}
        data-surface={c.surface || "gloss"}
        aria-label="Live giveaway widget"
        data-widget-element="container"
        {...attrs("giveaway", c, "container")}
      >
        {c.brackets !== false ? (
          <>
            <span className="better-gw-edge better-gw-edge-top-left" aria-hidden="true" />
            <span className="better-gw-edge better-gw-edge-top-right" aria-hidden="true" />
            <span className="better-gw-edge better-gw-edge-bottom-left" aria-hidden="true" />
            <span className="better-gw-edge better-gw-edge-bottom-right" aria-hidden="true" />
          </>
        ) : null}
        {c.edgeLights !== false ? (
          <>
            <span className="better-gw-edge-light better-gw-edge-light-top" aria-hidden="true" />
            <span className="better-gw-edge-light better-gw-edge-light-bottom" aria-hidden="true" />
          </>
        ) : null}
        {c.sideDashes !== false ? (
          <>
            <span className="better-gw-side-dash better-gw-side-dash-left" aria-hidden="true" />
            <span className="better-gw-side-dash better-gw-side-dash-right" aria-hidden="true" />
          </>
        ) : null}

        <header
          className="better-gw-header"
          data-widget-element="header"
          {...attrs("giveaway", c, "header")}
        >
          <div className="better-gw-name">
            <BetterGiveawayGiftIcon />
            <span>{c.title || "Giveaway"}</span>
          </div>
          <span
            className="better-gw-live-toggle"
            aria-label={isLive ? "Giveaway live" : hasWinner ? "Giveaway finished" : "Giveaway paused"}
            data-widget-element="statusBadge"
            {...attrs("giveaway", c, "statusBadge", hasWinner ? "winner" : isLive ? "live" : "closed")}
          >
            <span className="better-gw-live-dot" />
            <span>{hasWinner ? "Winner" : isLive ? "Live" : "Paused"}</span>
            <BetterGiveawayBroadcastIcon />
          </span>
        </header>

        <div className="better-gw-rule" aria-hidden="true" />

        <div
          className="better-gw-prize"
          data-widget-element="prize"
          {...attrs("giveaway", c, "prize")}
        >
          <strong>{c.prize || "Giveaway prize"}</strong>
          {c.subtitle ? <span>{c.subtitle}</span> : null}
        </div>

        <div
          className="better-gw-reel-zone"
          aria-hidden={!reelOpen}
          data-widget-element="winnerArea"
          {...attrs("giveaway", c, "winnerArea", hasWinner ? "winner" : spinningWinner ? "drawing" : "live")}
        >
          <BetterGiveawayRoulette
            participants={participants}
            phase={phase}
            winnerName={winnerName || spinningWinner}
            durationSec={c.durationSec || c.duration || 5.2}
          />
        </div>

        <div className="better-gw-metrics">
          <div
            className="better-gw-metric-panel better-gw-keyword-panel"
            data-widget-element="keyword"
            {...attrs("giveaway", c, "keyword")}
          >
            <span className="better-gw-metric-label">Keyword</span>
            <span className="better-gw-metric-value better-gw-keyword-value">{keyword ? `!${keyword}` : "-"}</span>
          </div>
          <div
            className="better-gw-metric-panel better-gw-entries-panel"
            data-widget-element="participantCount"
            {...attrs("giveaway", c, "participantCount")}
          >
            <span className="better-gw-metric-label">Entries</span>
            <span className="better-gw-metric-value">{formatCompactNumber(entries)}</span>
          </div>
        </div>

        {hasWinner ? <span className="better-gw-winner-flash" aria-hidden="true" /> : null}
        {c.sheen !== false ? <span className="better-gw-sheen" aria-hidden="true" /> : null}
      </section>
    </div>
  );
}

export function BetterChatHeader({ config, chatHeaderName, headerText, accentColor }) {
  const c = config || {};
  const viewerCount = Number(c.viewerCount) || 0;
  const isLive = Boolean(c.live || c.twitchEnabled || c.youtubeEnabled || c.kickEnabled);
  const showHeaderName = c.showHeaderName !== false;
  const showLiveLabel = c.showLiveLabel !== false;
  const showRightText = Boolean(c.showViewerCount || showLiveLabel);
  return (
    <div
      style={subElementStyle(c, "header", {
        position: "relative",
        zIndex: 2,
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
            opacity: isLive ? 1 : 0.45,
            animation: isLive ? "better-soft-pulse 1.8s ease-in-out infinite" : "none",
          }}
          {...attrs("chat", c, "badge")}
        />
        {showHeaderName ? (
          <strong style={{ color: headerText, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.12em" }}>
            {chatHeaderName}
          </strong>
        ) : null}
      </span>
      {showRightText ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, color: alphaColor(headerText, 0.72), fontWeight: 900, fontSize: "0.72em", textTransform: "uppercase", letterSpacing: "0.16em", whiteSpace: "nowrap" }}>
          {c.showViewerCount ? <span>{formatCompactNumber(viewerCount)}</span> : null}
          {showLiveLabel ? <span>{isLive ? "Live" : "Idle"}</span> : null}
        </span>
      ) : null}
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
  const messageType = betterChatMessageType(msg);
  const giftTier = betterChatGiftTier(msg);
  const celebrations = c.celebrations || {};
  const celebrationOn =
    (messageType === "raid" && celebrations.raid !== false) ||
    (messageType === "sub" && celebrations.sub !== false) ||
    (messageType === "gift" && celebrations.gift !== false);
  const rowPart = followerMessage || celebrationOn ? "highlightedMessage" : "message";
  const resolveRowStyle = followerMessage || celebrationOn
    ? context.highlightedMessageStyle || context.messagePartStyle
    : context.messagePartStyle;
  const animationKind = String(c.animation || "slide-up");
  const animationMap = {
    "slide-up": "better-chat-slide-up",
    "slide-down": "better-chat-slide-down",
    "slide-left": "better-chat-slide-left",
    "slide-right": "better-chat-slide-right",
    fade: "better-chat-fade-in",
    none: "none",
  };
  const animationName = animationMap[animationKind] || animationMap["slide-up"];
  const enterDelay = Math.min(msgIdx * (Number(c.stagger) || 0), 1200);
  const intensity = clampNumber(celebrations.intensity, 1, 10, 5);
  const effectSpeed = `${Math.max(0.8, 3 - intensity / 5)}s`;
  const effectGlow = `${intensity * 3}px`;
  const [avatarFailed, setAvatarFailed] = useState(false);
  const avatarUrl = avatarFailed ? "" : betterChatAvatarUrl(msg);
  const rowAccent =
    messageType === "raid"
      ? "#ec4899"
      : messageType === "gift"
        ? "#facc15"
        : messageType === "sub"
          ? "#22c55e"
          : accent;
  const messageStyle = resolveRowStyle({
    position: "relative",
    display: "grid",
    gridTemplateColumns: "34px minmax(0,1fr)",
    gap: 9,
    margin: `${Math.max(2, Number(context.msgSpacing) || 2)}px 8px`,
    padding: "8px 10px",
    borderRadius: Math.max(10, Number(context.borderRadius) || 12),
    background: followerMessage
      ? `linear-gradient(135deg, ${alphaColor(rowAccent, 0.26)}, rgba(2,8,23,0.44))`
      : `linear-gradient(135deg, ${baseBg}, rgba(2,8,23,0.3))`,
    border: `${Number(context.borderWidth) || 1}px solid ${followerMessage || celebrationOn ? alphaColor(rowAccent, 0.5) : context.borderColor || alphaColor(accent, 0.24)}`,
    boxShadow: followerMessage || celebrationOn
      ? `0 0 ${effectGlow} ${alphaColor(rowAccent, 0.32)}, inset 0 1px 0 rgba(255,255,255,0.08)`
      : `0 8px 22px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.05)`,
    overflow: "hidden",
    opacity: animationName === "none" ? 1 : 0,
    animation:
      animationName === "none"
        ? "none"
        : `${animationName} 460ms cubic-bezier(0.2,0.75,0.25,1) ${enterDelay}ms both${followerMessage || celebrationOn ? `, better-soft-pulse ${effectSpeed} ease-in-out ${enterDelay + 460}ms infinite` : ""}`,
  });
  return (
    <div style={messageStyle} {...attrs("chat", c, rowPart)}>
      {messageType === "raid" && celebrations.raid !== false ? (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: -2,
            borderRadius: "inherit",
            border: `1px solid ${alphaColor(rowAccent, 0.64)}`,
            boxShadow: `0 0 ${effectGlow} ${alphaColor(rowAccent, 0.42)}`,
            pointerEvents: "none",
            animation: `better-soft-pulse ${effectSpeed} ease-in-out infinite`,
          }}
        />
      ) : null}
      {messageType === "gift" && celebrations.gift !== false ? (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: "-100%",
            width: "100%",
            background: `linear-gradient(90deg, transparent, ${alphaColor(rowAccent, giftTier === "large" ? 0.52 : 0.38)}, transparent)`,
            animation: `better-chat-lantern ${effectSpeed} ease-in-out infinite`,
            pointerEvents: "none",
          }}
        />
      ) : null}
      <span
        style={context.avatarStyle({
          width: 34,
          height: 34,
          borderRadius: 10,
          display: "grid",
          placeItems: "center",
          overflow: "hidden",
          background: alphaColor(nameColor || accent, 0.2),
          border: `1px solid ${alphaColor(nameColor || accent, 0.42)}`,
          color: nameColor || accent,
          fontWeight: 950,
          fontSize: 12,
          boxShadow: `0 0 8px ${alphaColor(nameColor || accent, 0.28)}`,
        })}
        {...attrs("chat", c, "avatar")}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setAvatarFailed(true)}
            style={{
              display: "block",
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          initials(msg.username || msg.user)
        )}
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <strong
            style={context.usernameStyle({
              color: nameColor,
              fontSize: cssPx(context.usernameSize),
              fontWeight: 900,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            })}
            {...attrs("chat", c, "username")}
          >
            {msg.username || msg.user || "viewer"}
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
          {typeof context.renderMessageContent === "function"
            ? context.renderMessageContent(betterChatMessageText(msg))
            : betterChatMessageText(msg)}
        </span>
      </span>
    </div>
  );
}

const BETTER_RTP_EMBLEM_DURATIONS = {
  reel: 2.4,
  coin: 2.6,
  dice: 3,
  seven: 2.2,
  gem: 3.4,
  flame: 1.6,
  bars: 1.2,
  card: 3.6,
  radar: 2.4,
  lever: 3.2,
  orbit: 9,
};

function resolveBetterRtpEmblem(value) {
  const kind = String(value || "reel").toLowerCase();
  return Object.prototype.hasOwnProperty.call(BETTER_RTP_EMBLEM_DURATIONS, kind) ? kind : "reel";
}

function BetterRtpEmblemCss() {
  return (
    <style>{`
      @keyframes better-rtp-reel{0%{transform:translateY(0)}100%{transform:translateY(-50%)}}
      @keyframes better-rtp-coin{0%,100%{transform:rotateY(0deg)}50%{transform:rotateY(180deg)}}
      @keyframes better-rtp-dice{0%,100%{transform:rotate(-8deg) translateY(0)}50%{transform:rotate(8deg) translateY(-1px)}}
      @keyframes better-rtp-seven{0%,100%{filter:drop-shadow(0 0 4px var(--em-a))}50%{filter:drop-shadow(0 0 12px var(--em-b))}}
      @keyframes better-rtp-gem{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
      @keyframes better-rtp-flame{0%,100%{transform:skewX(-3deg) scaleY(1)}50%{transform:skewX(4deg) scaleY(1.09)}}
      @keyframes better-rtp-bars{0%,100%{transform:scaleY(.45)}45%{transform:scaleY(1)}}
      @keyframes better-rtp-card{0%,100%{transform:rotate(-6deg) translateY(0)}50%{transform:rotate(6deg) translateY(-2px)}}
      @keyframes better-rtp-radar{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
      @keyframes better-rtp-lever{0%,100%{transform:rotate(-24deg)}50%{transform:rotate(18deg)}}
      @keyframes better-rtp-orbit{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
      .better-rtp-em{--em-size:28px;--em-stroke:2;--em-a:#f7752a;--em-b:#f7a41d;--em-base:#12295c;--em-bolt:#f7a41d;--em-gold:#ffc01e;--em-dur:2.4s;position:relative;display:inline-grid;width:var(--em-size);height:var(--em-size);flex:0 0 auto;place-items:center;color:var(--em-a);line-height:1;filter:drop-shadow(0 0 7px color-mix(in srgb,var(--em-a) 52%,transparent))}
      .better-rtp-em *{box-sizing:border-box}
      .better-rtp-em svg{display:block;width:100%;height:100%;overflow:visible}
      .better-rtp-em[data-animate="off"],.better-rtp-em[data-animate="off"] *,.better-rtp-em[data-animate="off"]::before,.better-rtp-em[data-animate="off"]::after{animation:none!important;transition:none!important}
      .better-rtp-em__reel{position:relative;width:100%;height:100%;overflow:hidden;border:calc(var(--em-stroke) * 1px) solid color-mix(in srgb,var(--em-a) 72%,white 8%);border-radius:22%;background:linear-gradient(180deg,var(--em-base),#030816);box-shadow:inset 0 0 0 1px rgba(255,255,255,.08),inset 0 -8px 14px rgba(0,0,0,.45)}
      .better-rtp-em__reel::before,.better-rtp-em__reel::after{content:"";position:absolute;z-index:2;left:0;right:0;height:28%;pointer-events:none}.better-rtp-em__reel::before{top:0;background:linear-gradient(180deg,rgba(0,0,0,.85),transparent)}.better-rtp-em__reel::after{bottom:0;background:linear-gradient(0deg,rgba(0,0,0,.85),transparent)}
      .better-rtp-em__reel-strip{position:absolute;inset:2px;display:grid;grid-auto-rows:calc(var(--em-size) / 3);align-items:center;animation:better-rtp-reel var(--em-dur) linear infinite}
      .better-rtp-em__reel-strip i{display:grid;place-items:center;color:var(--em-gold);font-size:calc(var(--em-size) * .26);font-style:normal;font-weight:950;letter-spacing:.02em;text-shadow:0 0 7px var(--em-b)}
      .better-rtp-em__coin{position:relative;width:86%;height:86%;transform-style:preserve-3d;animation:better-rtp-coin var(--em-dur) ease-in-out infinite}
      .better-rtp-em__coin-face,.better-rtp-em__coin-back{position:absolute;inset:0;display:grid;place-items:center;border:calc(var(--em-stroke) * 1px) solid color-mix(in srgb,var(--em-gold) 82%,white 10%);border-radius:50%;background:radial-gradient(circle at 30% 25%,#fff1a8,var(--em-b) 38%,#8b4a10 100%);color:#241100;font-size:calc(var(--em-size) * .26);font-weight:950;backface-visibility:hidden;box-shadow:inset 0 0 0 2px rgba(255,255,255,.18),0 0 12px color-mix(in srgb,var(--em-gold) 55%,transparent)}
      .better-rtp-em__coin-back{transform:rotateY(180deg);background:radial-gradient(circle at 35% 25%,#ffe8a0,var(--em-a) 45%,#5a260d 100%);font-size:calc(var(--em-size) * .2)}
      .better-rtp-em__dice svg{animation:better-rtp-dice var(--em-dur) ease-in-out infinite}.better-rtp-em__dice rect{fill:var(--em-base);stroke:var(--em-a);stroke-width:var(--em-stroke)}.better-rtp-em__dice circle{fill:var(--em-b)}
      .better-rtp-em__seven svg{animation:better-rtp-seven var(--em-dur) ease-in-out infinite}.better-rtp-em__seven path{fill:none;stroke:var(--em-a);stroke-width:calc(var(--em-stroke) * 1.6);stroke-linecap:round;stroke-linejoin:round}.better-rtp-em__seven circle{fill:var(--em-b)}
      .better-rtp-em__gem polygon{stroke:var(--em-a);stroke-width:var(--em-stroke);animation:better-rtp-gem var(--em-dur) ease-in-out infinite;transform-origin:50% 50%}.better-rtp-em__gem .gem-face-a{fill:var(--em-b)}.better-rtp-em__gem .gem-face-b{fill:var(--em-base)}.better-rtp-em__gem .gem-face-c{fill:color-mix(in srgb,var(--em-a) 74%,white 12%)}
      .better-rtp-em__flame path{stroke-width:calc(var(--em-stroke) * .7);animation:better-rtp-flame var(--em-dur) ease-in-out infinite;transform-origin:50% 75%}.better-rtp-em__flame .flame-a{fill:var(--em-a);stroke:var(--em-a)}.better-rtp-em__flame .flame-b{fill:var(--em-b);stroke:var(--em-b)}
      .better-rtp-em__bars{display:flex;width:86%;height:74%;align-items:end;justify-content:center;gap:10%;padding:8% 10%;border-radius:18%;background:linear-gradient(180deg,color-mix(in srgb,var(--em-base) 82%,black),#030816);box-shadow:inset 0 0 0 calc(var(--em-stroke) * 1px) color-mix(in srgb,var(--em-a) 55%,transparent)}
      .better-rtp-em__bars i{display:block;width:18%;height:var(--bar-h);border-radius:999px 999px 2px 2px;background:linear-gradient(180deg,var(--em-b),var(--em-a));box-shadow:0 0 8px color-mix(in srgb,var(--em-a) 70%,transparent);transform-origin:bottom;animation:better-rtp-bars var(--em-dur) ease-in-out infinite}.better-rtp-em__bars i:nth-child(2){animation-delay:calc(var(--em-dur) * -.33)}.better-rtp-em__bars i:nth-child(3){animation-delay:calc(var(--em-dur) * -.66)}
      .better-rtp-em__card{position:relative;width:72%;height:88%;border:calc(var(--em-stroke) * 1px) solid color-mix(in srgb,var(--em-a) 72%,white 8%);border-radius:14%;background:linear-gradient(145deg,#f8fbff 0%,#c9d8ef 55%,#8297bc 100%);color:var(--em-a);box-shadow:0 0 12px color-mix(in srgb,var(--em-a) 45%,transparent);animation:better-rtp-card var(--em-dur) ease-in-out infinite}
      .better-rtp-em__card b{position:absolute;top:9%;left:12%;font-size:calc(var(--em-size) * .27);line-height:1}.better-rtp-em__card i{position:absolute;right:14%;bottom:13%;width:34%;height:34%;border-radius:50%;background:radial-gradient(circle,var(--em-a),var(--em-b));box-shadow:0 0 8px var(--em-b)}
      .better-rtp-em__radar{position:relative;width:88%;height:88%;overflow:hidden;border:calc(var(--em-stroke) * 1px) solid color-mix(in srgb,var(--em-a) 70%,transparent);border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--em-a) 18%,transparent),var(--em-base))}
      .better-rtp-em__radar::before,.better-rtp-em__radar::after{content:"";position:absolute;inset:22%;border:1px solid color-mix(in srgb,var(--em-a) 48%,transparent);border-radius:50%}.better-rtp-em__radar::after{inset:40%;background:var(--em-b);box-shadow:0 0 8px var(--em-b)}
      .better-rtp-em__radar i{position:absolute;left:50%;top:50%;width:50%;height:2px;transform-origin:left center;background:linear-gradient(90deg,var(--em-b),transparent);animation:better-rtp-radar var(--em-dur) linear infinite}
      .better-rtp-em__lever{position:relative;width:86%;height:86%;border-radius:20%;background:linear-gradient(180deg,var(--em-base),#030816);box-shadow:inset 0 0 0 calc(var(--em-stroke) * 1px) color-mix(in srgb,var(--em-a) 55%,transparent)}
      .better-rtp-em__lever::before{content:"";position:absolute;left:26%;bottom:18%;width:46%;height:16%;border-radius:999px;background:var(--em-a);box-shadow:0 0 8px var(--em-a)}
      .better-rtp-em__lever i{position:absolute;left:47%;bottom:27%;width:10%;height:48%;transform-origin:50% 100%;border-radius:999px;background:linear-gradient(180deg,var(--em-b),var(--em-a));animation:better-rtp-lever var(--em-dur) ease-in-out infinite}.better-rtp-em__lever i::before{content:"";position:absolute;left:50%;top:-22%;width:calc(var(--em-size) * .24);height:calc(var(--em-size) * .24);transform:translateX(-50%);border-radius:50%;background:radial-gradient(circle,#fff,var(--em-b));box-shadow:0 0 10px var(--em-b)}
      .better-rtp-em__orbit{position:relative;width:88%;height:88%;border:1px solid color-mix(in srgb,var(--em-a) 45%,transparent);border-radius:50%}.better-rtp-em__orbit b{position:absolute;left:50%;top:50%;width:28%;height:28%;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle,#fff,var(--em-b));box-shadow:0 0 12px var(--em-b)}.better-rtp-em__orbit i{position:absolute;inset:0;border:calc(var(--em-stroke) * 1px) solid color-mix(in srgb,var(--em-a) 42%,transparent);border-radius:50%;animation:better-rtp-orbit var(--em-dur) linear infinite}.better-rtp-em__orbit i::before{content:"";position:absolute;right:8%;top:12%;width:22%;height:22%;border-radius:50%;background:var(--em-a);box-shadow:0 0 10px var(--em-a)}
    `}</style>
  );
}

function renderBetterRtpEmblem(kind) {
  switch (kind) {
    case "coin":
      return (
        <span className="better-rtp-em__coin">
          <span className="better-rtp-em__coin-face">SC</span>
          <span className="better-rtp-em__coin-back">RTP</span>
        </span>
      );
    case "dice":
      return (
        <span className="better-rtp-em__dice">
          <svg viewBox="0 0 32 32" aria-hidden="true">
            <rect x="5" y="5" width="22" height="22" rx="5" />
            <circle cx="12" cy="12" r="2.1" />
            <circle cx="20" cy="12" r="2.1" />
            <circle cx="16" cy="16" r="2.1" />
            <circle cx="12" cy="20" r="2.1" />
            <circle cx="20" cy="20" r="2.1" />
          </svg>
        </span>
      );
    case "seven":
      return (
        <span className="better-rtp-em__seven">
          <svg viewBox="0 0 32 32" aria-hidden="true">
            <path d="M8 7h16L14 25" />
            <path d="M12 15h8" />
            <circle cx="7" cy="21" r="1.7" />
            <circle cx="25" cy="11" r="1.5" />
          </svg>
        </span>
      );
    case "gem":
      return (
        <span className="better-rtp-em__gem">
          <svg viewBox="0 0 32 32" aria-hidden="true">
            <polygon className="gem-face-a" points="16 4 27 12 23 27 9 27 5 12" />
            <polygon className="gem-face-b" points="5 12 16 27 27 12 21 12 16 27 11 12" />
            <polygon className="gem-face-c" points="11 12 16 4 21 12 16 27" />
          </svg>
        </span>
      );
    case "flame":
      return (
        <span className="better-rtp-em__flame">
          <svg viewBox="0 0 32 32" aria-hidden="true">
            <path className="flame-a" d="M16 29c-5.1 0-8.8-3.7-8.8-8.5 0-4.1 2.7-6.9 5.7-9.9 1.6-1.6 2.8-3.4 2.9-6.1 5.1 3.5 8.9 8 8.9 14.7 0 5.7-3.8 9.8-8.7 9.8z" />
            <path className="flame-b" d="M16.1 27c-2.7 0-4.6-1.9-4.6-4.5 0-2.4 1.7-4 3.1-5.8.8-1 1.2-2 1.2-3.5 2.9 2 5 4.5 5 8.1 0 3.2-2 5.7-4.7 5.7z" />
          </svg>
        </span>
      );
    case "bars":
      return (
        <span className="better-rtp-em__bars">
          <i style={{ "--bar-h": "48%" }} />
          <i style={{ "--bar-h": "88%" }} />
          <i style={{ "--bar-h": "66%" }} />
        </span>
      );
    case "card":
      return (
        <span className="better-rtp-em__card">
          <b>A</b>
          <i />
        </span>
      );
    case "radar":
      return (
        <span className="better-rtp-em__radar">
          <i />
        </span>
      );
    case "lever":
      return (
        <span className="better-rtp-em__lever">
          <i />
        </span>
      );
    case "orbit":
      return (
        <span className="better-rtp-em__orbit">
          <b />
          <i />
        </span>
      );
    case "reel":
    default:
      return (
        <span className="better-rtp-em__reel">
          <span className="better-rtp-em__reel-strip">
            {["CH", "7", "BAR", "*", "GR", "DI", "CH", "7", "BAR", "*"].map((label, index) => (
              <i key={`${label}-${index}`}>{label}</i>
            ))}
          </span>
        </span>
      );
  }
}

export function BetterRtpEmblem({ config, emblem, size, animate }) {
  const c = config || {};
  const kind = resolveBetterRtpEmblem(emblem || c.emblem);
  const emblemSize = clampNumber(size ?? c.emblemSize, 16, 72, 28);
  const stroke = clampNumber(c.emblemStroke, 1, 6, 2);
  const speed = clampNumber(c.emblemSpeed, 0.2, 4, 1);
  const duration = `${(BETTER_RTP_EMBLEM_DURATIONS[kind] / speed).toFixed(2)}s`;
  const isAnimated = animate ?? c.emblemAnimate !== false;

  return (
    <>
      <BetterRtpEmblemCss />
      <span
        className={`better-rtp-em better-rtp-em--${kind}`}
        data-emblem={kind}
        data-animate={isAnimated ? "on" : "off"}
        style={{
          "--em-size": `${emblemSize}px`,
          "--em-stroke": String(stroke),
          "--em-a": c.cEmA || c.accentColor || "#f7752a",
          "--em-b": c.cEmB || c.cBolt || "#f7a41d",
          "--em-base": c.cEmBase || c.cBarMid || "#12295c",
          "--em-bolt": c.cBolt || "#f7a41d",
          "--em-gold": c.cGold || "#ffc01e",
          "--em-dur": duration,
        }}
        aria-hidden="true"
      >
        {renderBetterRtpEmblem(kind)}
      </span>
    </>
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
  const accent = c.cBolt || c.rtpIconColor || c.accentColor || "#f7a41d";
  const bgFrom = c.cBarTop || c.barBgFrom || "#0c2150";
  const bgMid = c.cBarMid || c.barBgMid || "#081735";
  const bgTo = c.cBarBot || c.barBgTo || "#050f26";
  const rim = c.cRim || c.borderColor || "#2b7de9";
  const borderColor = rim;
  const text = c.cValue || c.slotNameColor || c.textColor || "#ffffff";
  const muted = c.cLabel || c.labelColor || "#9db9ea";
  const font = c.fontBody || c.fontFamily || "'Barlow', sans-serif";
  const titleFont = c.fontTitle || font;
  const fontSize = numberValue(c.fontSize || 14, 14);
  const titleSize = clampNumber(c.titleSize, 10, 46, fontSize * 1.3);
  const valueSize = clampNumber(c.valueSize, 8, 34, fontSize * 0.95);
  const labelSize = clampNumber(c.labelSize, 6, 18, fontSize * 0.62);
  const barHeight = clampNumber(c.barHeight, 36, 140, 54);
  const paddingX = clampNumber(c.barPadX, 0, 64, 14);
  const paddingY = clampNumber(c.barPadY, 0, 36, 8);
  const borderWidth = Math.max(0, numberValue(c.borderWidth, 1));
  const radius = cssPx(c.radius ?? c.borderRadius ?? 14, "14px");
  const providerMode = c.providerMode || "name";
  const providerName = displayProvider || "";
  const providerLogo = displayProviderLogo || "";
  const showProviderImage = providerMode !== "none" && providerMode !== "name" && Boolean(providerLogo);
  const showProviderName = providerMode !== "none" && providerMode !== "image" && Boolean(providerName);
  const hasProvider = showProviderImage || showProviderName;
  const logoHeight = clampNumber(c.logoHeight, 12, 96, 30);
  const logoMaxWidth = clampNumber(c.logoMaxW, 32, 420, 160);
  const logoPadX = clampNumber(c.logoPadX, 0, 40, 0);
  const logoPadY = clampNumber(c.logoPadY, 0, 32, 0);
  const logoOffsetX = clampNumber(c.logoOffsetX, -64, 64, 0);
  const logoOffsetY = clampNumber(c.logoOffsetY, -64, 64, 0);
  const slotName = displaySlotName || "-";
  const liveRtp = displayInfo?.rtp;
  const livePotential = displayInfo?.max_win_multiplier ?? displayInfo?.max_win;
  const rtpValue =
    liveRtp !== undefined && liveRtp !== null && liveRtp !== ""
      ? `${String(liveRtp).replace(/%$/, "")}%`
      : "-";
  const potentialValue =
    livePotential !== undefined && livePotential !== null && livePotential !== ""
      ? formatMultiplier(livePotential)
      : "-";
  const volatilityValue = firstKnownVolatility(displayInfo?.volatility);
  const bestAmount = displayBestWin?.best_win
    ? `${currency || ""}${Number(displayBestWin.best_win).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
    : bestWinEmptyText || "-";
  const bestMulti = displayBestWin?.best_multiplier ? ` / ${formatMultiplier(displayBestWin.best_multiplier)}` : "";
  const showDividers = c.showDividers !== false;
  const statItems = [
    ["rtpValue", "RTP", rtpValue, showRtp, "0s"],
    ["maxWin", "Potential", potentialValue, showPotential, ".5s"],
    ["volatility", "Volatility", <BetterHuntVolatilityBars value={volatilityValue} />, showVolatility, "1s"],
  ].filter(([, , , visible]) => visible);
  const bestWinValue = `${bestAmount}${bestMulti}`;
  const bar = (
    <div
      className="oc-widget-inner rtp-stats-bar rtp-stats-bar--better"
      style={{
        width: "100%",
        maxWidth: previewMode ? 1152 : "100%",
        height: previewMode ? barHeight : "100%",
        minHeight: barHeight,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: `${paddingY}px ${paddingX}px`,
        borderRadius: radius,
        background: `linear-gradient(180deg, ${bgFrom} 0%, ${bgMid} 46%, ${bgTo} 100%)`,
        border: `${borderWidth}px solid ${borderColor}`,
        color: text,
        fontFamily: font,
        fontSize,
        boxShadow: `inset 0 0 0 1px rgba(3,12,32,0.9), inset 0 1px 0 ${alphaColor(c.cRim || accent, 0.3)}, inset 0 -1px 0 rgba(0,0,0,0.45)`,
        overflow: "hidden",
        position: "relative",
        flexShrink: 0,
      }}
      {...attrs("rtp_stats", c, "container")}
    >
      <BetterStyleSheet />
      {hasProvider ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            minWidth: 0,
            flexShrink: 0,
          }}
          {...attrs("rtp_stats", c, "provider")}
        >
          {showProviderImage ? (
            <img
              src={providerLogo}
              alt=""
              draggable={false}
              style={{
                display: "block",
                height: logoHeight,
                maxHeight: "100%",
                maxWidth: `min(${logoMaxWidth}px, 30vw)`,
                width: "auto",
                objectFit: c.logoFit || "contain",
                padding: `${logoPadY}px ${logoPadX}px`,
                transform: `translate(${logoOffsetX}px, ${logoOffsetY}px)`,
                borderRadius: logoPadX || logoPadY ? 6 : 4,
              }}
            />
          ) : null}
          {showProviderName ? (
            <span
              style={{
                color: c.cBrand || accent,
                fontFamily: font,
                fontSize: Math.max(7, labelSize - 2),
                fontWeight: 900,
                letterSpacing: "0.18em",
                lineHeight: 1.15,
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              {providerName.split(" ").filter(Boolean).map((word, index) => (
                <span key={`${word}-${index}`} style={{ display: "block" }}>
                  {word}
                </span>
              ))}
            </span>
          ) : null}
        </div>
      ) : null}
      {c.showEmblem !== false ? <BetterRtpEmblem config={c} /> : null}
      <h1
        style={{
          minWidth: 0,
          overflow: "hidden",
          flex: "1 1 220px",
          maxWidth: "min(260px, 26vw)",
          margin: 0,
          color: text,
          fontFamily: titleFont,
          fontSize: titleSize,
          fontWeight: 850,
          letterSpacing: `${numberValue(c.titleTracking, 0.08)}em`,
          lineHeight: 1,
          textOverflow: "ellipsis",
          textShadow: `0 1px 10px ${bgTo}`,
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}
        {...attrs("rtp_stats", c, "slotTitle")}
      >
        {slotName}
      </h1>
      {showDividers && statItems.length ? (
        <span
          style={{
            alignSelf: "stretch",
            width: 1,
            flexShrink: 0,
            background: `linear-gradient(180deg, transparent, ${alphaColor(c.cRim || accent, 0.55)} 30%, ${alphaColor(c.cRim || accent, 0.55)} 70%, transparent)`,
          }}
          aria-hidden="true"
        />
      ) : null}
      {statItems.length ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            minWidth: 0,
            flex: "0 0 auto",
          }}
        >
          {statItems.map(([part, label, value, , delay]) => (
            <div
              key={part}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                flexShrink: 0,
                minWidth: 0,
                whiteSpace: "nowrap",
              }}
              {...attrs("rtp_stats", c, "statCard")}
            >
              <Zap
                size={Math.round(labelSize * 1.3)}
                fill={c.cBolt || accent}
                stroke={c.cBolt || accent}
                strokeWidth={1}
                style={{
                  "--bolt-color": c.cBolt || accent,
                  animation: "better-rtp-bolt 2.4s ease-in-out infinite",
                  animationDelay: delay,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  color: muted,
                  fontFamily: font,
                  fontSize: labelSize,
                  fontWeight: 800,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                }}
                {...attrs("rtp_stats", c, "label")}
              >
                {label}
              </span>
              <strong
                style={{
                  color: text,
                  fontFamily: titleFont,
                  fontSize: valueSize,
                  fontWeight: 850,
                  letterSpacing: "0.04em",
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                }}
                {...attrs("rtp_stats", c, part)}
              >
                {value}
              </strong>
            </div>
          ))}
        </div>
      ) : null}
      {showDividers && statItems.length && showBestWin ? (
        <span
          style={{
            alignSelf: "stretch",
            width: 1,
            flexShrink: 0,
            background: `linear-gradient(180deg, transparent, ${alphaColor(c.cRim || accent, 0.55)} 30%, ${alphaColor(c.cRim || accent, 0.55)} 70%, transparent)`,
          }}
          aria-hidden="true"
        />
      ) : null}
      {showBestWin ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
            marginLeft: "auto",
            maxWidth: "min(300px, 30vw)",
            padding: "7px 14px",
            border: `1px solid ${alphaColor(c.cRim || accent, 0.55)}`,
            borderRadius: Math.max(4, numberValue(c.radius, 10) - 4),
            background: `linear-gradient(180deg, ${alphaColor(bgFrom, 0.85)}, ${alphaColor(bgTo, 0.9)})`,
            boxShadow: `inset 0 0 12px ${alphaColor(c.cRim || accent, 0.26)}, inset 0 1px 0 ${alphaColor(c.cRim || accent, 0.14)}`,
            minWidth: 0,
          }}
          {...attrs("rtp_stats", c, "personalBest")}
        >
          <Trophy
            size={14}
            fill={c.cGold || "#ffc01e"}
            stroke={c.cGold || "#ffc01e"}
            strokeWidth={1.2}
            style={{
              "--trophy-color": c.cGold || "#ffc01e",
              animation: "better-rtp-trophy 3.2s ease-in-out infinite",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              color: muted,
              fontFamily: font,
              fontSize: labelSize,
              fontWeight: 800,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
            {...attrs("rtp_stats", c, "label")}
          >
            Best Win
          </span>
          <span style={{ color: muted, fontSize: labelSize, opacity: 0.5 }}>{"\u2014"}</span>
          <strong
            style={{
              overflow: "hidden",
              color: text,
              fontFamily: font,
              fontSize: labelSize + 1,
              fontWeight: 700,
              lineHeight: 1,
              minWidth: 0,
              maxWidth: 170,
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            {...attrs("rtp_stats", c, "personalBest")}
          >
            {bestWinValue}
          </strong>
        </div>
      ) : null}
    </div>
  );

  if (previewMode) {
    return (
      <div
        className="better-rtp-preview-shell"
        style={{
          width: "100%",
          height: "100%",
          minWidth: 0,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          boxSizing: "border-box",
        }}
      >
        {bar}
      </div>
    );
  }

  return bar;
}

function backgroundControlEnabled(value, fallback = true) {
  if (value === undefined || value === null) return fallback;
  if (value === false || value === 0) return false;
  const normalized = String(value).trim().toLowerCase();
  return normalized !== "false" && normalized !== "0" && normalized !== "none" && normalized !== "off";
}

function betterBackgroundTextureStyle({ texture, color1, color2, color3, intensity, speed }) {
  const strength = clampNumber(intensity, 0, 100, 70) / 100;
  const duration = `${Math.max(4, numberValue(speed, 10))}s`;
  const softA = alphaColor(color2, 0.16 * strength);
  const softB = alphaColor(color3, 0.2 * strength);
  const strongA = alphaColor(color2, 0.34 * strength);
  const strongB = alphaColor(color3, 0.32 * strength);
  const line = alphaColor(color2, 0.24 * strength);
  const faintLine = alphaColor(color3, 0.12 * strength);

  switch (texture) {
    case "grid":
      return {
        backgroundColor: color1,
        backgroundImage: [
          `radial-gradient(circle at 18% 20%, ${strongB}, transparent 28%)`,
          `linear-gradient(${line} 1px, transparent 1px)`,
          `linear-gradient(90deg, ${line} 1px, transparent 1px)`,
        ].join(", "),
        backgroundSize: "120% 120%, 52px 52px, 52px 52px",
        animation: `better-bg-pan ${duration} linear infinite`,
      };
    case "dots":
      return {
        backgroundColor: color1,
        backgroundImage: [
          `radial-gradient(circle at 72% 28%, ${strongA}, transparent 31%)`,
          `radial-gradient(circle, ${line} 1.4px, transparent 2px)`,
        ].join(", "),
        backgroundSize: "125% 125%, 28px 28px",
        animation: `better-bg-pan ${duration} ease-in-out infinite`,
      };
    case "diagonal":
      return {
        backgroundColor: color1,
        backgroundImage: [
          `radial-gradient(circle at 82% 24%, ${strongB}, transparent 30%)`,
          `repeating-linear-gradient(135deg, ${faintLine} 0 2px, transparent 2px 18px)`,
          `linear-gradient(135deg, ${color1}, ${alphaColor(color2, 0.34 * strength)} 54%, ${color1})`,
        ].join(", "),
        backgroundSize: "120% 120%, 36px 36px, 140% 140%",
        animation: `better-bg-pan ${duration} ease-in-out infinite`,
      };
    case "nebula":
      return {
        backgroundImage: [
          `radial-gradient(circle at 20% 18%, ${strongB}, transparent 30%)`,
          `radial-gradient(circle at 72% 34%, ${strongA}, transparent 34%)`,
          `radial-gradient(circle at 48% 86%, ${alphaColor(color3, 0.18 * strength)}, transparent 36%)`,
          `linear-gradient(145deg, ${color1}, ${alphaColor(color2, 0.22 * strength)} 52%, ${color1})`,
        ].join(", "),
        backgroundSize: "130% 130%, 126% 126%, 142% 142%, cover",
        animation: `better-bg-pan ${duration} ease-in-out infinite`,
      };
    case "noise":
      return {
        backgroundColor: color1,
        backgroundImage: [
          `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.72' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.16'/%3E%3C/svg%3E")`,
          `radial-gradient(circle at 18% 22%, ${softB}, transparent 34%)`,
          `linear-gradient(135deg, ${color1}, ${softA} 55%, ${color1})`,
        ].join(", "),
        backgroundBlendMode: "overlay, screen, normal",
        backgroundSize: "256px 256px, 124% 124%, cover",
        animation: `better-bg-pan ${duration} linear infinite`,
      };
    case "aurora":
    default:
      return {
        backgroundImage: [
          `radial-gradient(circle at 20% 20%, ${strongB}, transparent 30%)`,
          `radial-gradient(circle at 82% 35%, ${strongA}, transparent 34%)`,
          `linear-gradient(135deg, ${color1}, ${alphaColor(color2, 0.48 * strength)} 52%, ${color1})`,
        ].join(", "),
        backgroundSize: "130% 130%, 125% 125%, cover",
        animation: `better-bg-pan ${duration} ease-in-out infinite`,
      };
  }
}

export function BetterBackgroundStyle({ config }) {
  const c = config || {};
  const color1 = subValue(c, "texture", "background", c.color1 || "#030712");
  const color2 = subValue(c, "texture", "accentColor", c.color2 || "#1d4ed8");
  const color3 = subValue(c, "texture", "fillColor", c.color3 || "#f59e0b");
  const texture = subValue(c, "texture", "texture", c.texture || "aurora");
  const imageUrl = subValue(c, "media", "imageUrl", c.imageUrl || "");
  const videoUrl = subValue(c, "media", "videoUrl", c.videoUrl || "");
  const imageFit = subValue(c, "media", "imageFit", c.imageFit || "cover");
  const sourceMode = subValue(c, "source", "bgMode", c.bgMode || "texture");
  const opacity = Math.max(0, Math.min(100, numberValue(subValue(c, "canvas", "opacity", c.opacity ?? 100), 100))) / 100;
  const speed = Math.max(4, numberValue(subValue(c, "texture", "animSpeed", c.animSpeed || 10), 10));
  const intensity = clampNumber(subValue(c, "texture", "intensity", c.intensity ?? 70), 0, 100, 70);
  const mediaOpacityRaw = numberValue(subValue(c, "media", "opacity", c.mediaOpacity ?? 88), 88);
  const mediaOpacity = mediaOpacityRaw > 1 ? mediaOpacityRaw / 100 : mediaOpacityRaw;
  const brightness = numberValue(subValue(c, "media", "brightness", c.brightness ?? 100), 100);
  const contrast = numberValue(subValue(c, "media", "contrast", c.contrast ?? 100), 100);
  const saturation = numberValue(subValue(c, "media", "saturation", c.saturation ?? 100), 100);
  const blur = numberValue(subValue(c, "media", "blur", c.blur ?? 0), 0);
  const hueRotate = numberValue(subValue(c, "media", "hueRotate", c.hueRotate ?? 0), 0);
  const grayscale = numberValue(subValue(c, "media", "grayscale", c.grayscale ?? 0), 0);
  const sepia = numberValue(subValue(c, "media", "sepia", c.sepia ?? 0), 0);
  const mediaFilter = [
    `brightness(${brightness}%)`,
    `contrast(${contrast}%)`,
    `saturate(${saturation}%)`,
    `blur(${blur}px)`,
    `hue-rotate(${hueRotate}deg)`,
    `grayscale(${grayscale}%)`,
    `sepia(${sepia}%)`,
  ].join(" ");
  const imagePosition = subValue(c, "media", "backgroundPosition", c.imagePosition || "center");
  const tintColor = subValue(c, "tint", "background", c.overlayColor || "transparent");
  const tintOpacityRaw = numberValue(subValue(c, "tint", "opacity", c.overlayOpacity ?? 0), 0);
  const tintOpacity = tintOpacityRaw > 1 ? tintOpacityRaw / 100 : tintOpacityRaw;
  const showParticles = backgroundControlEnabled(subValue(c, "effects", "fxParticles", c.fxParticles), true);
  const showScanlines = backgroundControlEnabled(subValue(c, "effects", "fxScanlines", c.fxScanlines), true);
  const showVignette = backgroundControlEnabled(subValue(c, "effects", "fxVignette", c.fxVignette), true);
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
  const textureStyle = useMemo(
    () => betterBackgroundTextureStyle({ texture, color1, color2, color3, intensity, speed }),
    [texture, color1, color2, color3, intensity, speed],
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
          inset: blur > 0 ? -Math.ceil(blur * 2) : 0,
          ...textureStyle,
          filter: mediaFilter,
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
        {showParticles
          ? particles.map((particle, index) => (
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
            ))
          : null}
      </div>
      {showScanlines ? (
        <div
          style={{
            ...layerBase,
            inset: "-54px 0",
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(255,255,255,0.045) 0 1px, transparent 1px 5px)",
            opacity: 0.46,
            transform: "translateY(-54px)",
            animation: `better-bg-scan ${Math.max(4, speed * 1.8)}s linear infinite`,
            pointerEvents: "none",
          }}
        />
      ) : null}
      {showVignette ? (
        <div
          style={{
            ...layerBase,
            background:
              "radial-gradient(ellipse at center, transparent 48%, rgba(0,0,0,0.34) 76%, rgba(0,0,0,0.68) 100%)",
            pointerEvents: "none",
          }}
        />
      ) : null}
    </div>
  );
}
