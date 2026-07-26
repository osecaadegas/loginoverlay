import React, { useMemo, useState } from "react";
import {
  ChevronDown,
  Coins,
  Eye,
  EyeOff,
  Flame,
  Frame,
  Gauge,
  ImagePlus,
  Layers,
  List,
  Maximize2,
  MessageSquare,
  MonitorPlay,
  Music,
  Palette,
  PartyPopper,
  Pipette,
  RotateCcw,
  Settings,
  Sliders,
  Sparkles,
  Timer,
  Trophy,
  Type,
  Wand2,
  Users,
  Waves,
  Zap,
} from "lucide-react";
import "./BetterWidgetPackages.css";

const DEFAULT_CARD_COLORS = [
  { accent: "#2fa1ff", accent2: "#19e3ff" },
  { accent: "#a06bff", accent2: "#ff4fd8" },
  { accent: "#22e0a6", accent2: "#8bf06b" },
  { accent: "#ff9d42", accent2: "#ff4d5e" },
  { accent: "#ff5c8a", accent2: "#ffb84d" },
  { accent: "#ffd542", accent2: "#6ee86e" },
];

const CARD_PRESETS = [
  { name: "Default", colors: DEFAULT_CARD_COLORS },
  {
    name: "Ocean",
    colors: [
      { accent: "#0ea5e9", accent2: "#06b6d4" },
      { accent: "#0284c7", accent2: "#22d3ee" },
      { accent: "#0369a1", accent2: "#67e8f9" },
      { accent: "#075985", accent2: "#a5f3fc" },
      { accent: "#0c4a6e", accent2: "#38bdf8" },
      { accent: "#164e63", accent2: "#7dd3fc" },
    ],
  },
  {
    name: "Fire",
    colors: [
      { accent: "#ef4444", accent2: "#f97316" },
      { accent: "#dc2626", accent2: "#fb923c" },
      { accent: "#f59e0b", accent2: "#fbbf24" },
      { accent: "#ea580c", accent2: "#facc15" },
      { accent: "#b91c1c", accent2: "#f87171" },
      { accent: "#c2410c", accent2: "#fdba74" },
    ],
  },
  {
    name: "Cyber",
    colors: [
      { accent: "#06ffa5", accent2: "#00e5ff" },
      { accent: "#ff006e", accent2: "#ff4da6" },
      { accent: "#00d4ff", accent2: "#8b5cf6" },
      { accent: "#f0ff00", accent2: "#88ff00" },
      { accent: "#ff3d00", accent2: "#ff9100" },
      { accent: "#d946ef", accent2: "#7c3aed" },
    ],
  },
];

const QUICK_COLORS = [
  "#2fa1ff",
  "#0ea5e9",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a06bff",
  "#d946ef",
  "#ec4899",
  "#ff5c8a",
  "#ef4444",
  "#f97316",
  "#ff9d42",
  "#ffd542",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#22e0a6",
  "#14b8a6",
  "#06b6d4",
  "#19e3ff",
  "#ffffff",
  "#94a3b8",
  "#64748b",
  "#1e293b",
];

const BET_THEMES = [
  { key: "neon", name: "Neon", icon: <Zap size={11} />, swatches: ["#071a44", "#0a84ff", "#59d6ff"] },
  { key: "metallic", name: "Metallic", icon: <Layers size={11} />, swatches: ["#1b232e", "#8fa1b8", "#e8eef6"] },
  { key: "gradient", name: "Gradient", icon: <Sparkles size={11} />, swatches: ["#171f5e", "#5b7cfa", "#22d3ee"] },
  { key: "matte", name: "Matte", icon: <Settings size={11} />, swatches: ["#171b22", "#39424f", "#aab4c2"] },
  { key: "crimson", name: "Crimson", icon: <Flame size={11} />, swatches: ["#1a0610", "#c0192e", "#ff6b81"] },
  { key: "emerald", name: "Emerald", icon: <Waves size={11} />, swatches: ["#041a12", "#059669", "#34d399"] },
];

const FILL_STYLES = [
  { key: "liquid", name: "Liquid", icon: <Waves size={11} /> },
  { key: "solid", name: "Solid", icon: <Layers size={11} /> },
  { key: "pulse", name: "Pulse", icon: <Zap size={11} /> },
  { key: "scanline", name: "Scan", icon: <Gauge size={11} /> },
  { key: "plasma", name: "Plasma", icon: <Flame size={11} /> },
];

const FONT_OPTIONS = [
  { key: "cyber", name: "Cyber", family: "'Orbitron', sans-serif" },
  { key: "sport", name: "Sport", family: "'Oswald', sans-serif" },
  { key: "tech", name: "Tech", family: "'Chakra Petch', sans-serif" },
  { key: "classic", name: "Classic", family: "'Russo One', sans-serif" },
];

const CHAT_FONTS = [
  { label: "Arial - original", value: "Arial, Helvetica, sans-serif" },
  { label: "Chakra Petch", value: "'Chakra Petch', sans-serif" },
  { label: "Rubik", value: "'Rubik', sans-serif" },
  { label: "Georgia", value: "Georgia, 'Times New Roman', serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
  { label: "Impact", value: "Impact, 'Arial Black', sans-serif" },
];

const CHAT_PRESETS = [
  { name: "Neon Cyan", glow: "#00c3ff", username: "#ffb800", text: "#f4f7ff", bubble: "#001a47", panel: "#000d2d" },
  { name: "Toxic", glow: "#3dff8f", username: "#d8ff3f", text: "#eafff2", bubble: "#03251a", panel: "#02130b" },
  { name: "Magma", glow: "#ff5c39", username: "#ffd23f", text: "#fff3ec", bubble: "#2c0d08", panel: "#170604" },
  { name: "Pulse", glow: "#b44bff", username: "#ffd166", text: "#f6efff", bubble: "#1d0a36", panel: "#0d0519" },
  { name: "Ice", glow: "#9fd8ff", username: "#ffffff", text: "#dceeff", bubble: "#0b1a2b", panel: "#050c15" },
];

const GIVEAWAY_PRESETS = [
  { id: "cyber-blue", name: "Cyber Blue", swatch: "linear-gradient(135deg,#087eff,#43d3ff)", patch: { hue: 210, hueShift: 24, saturation: 82, accentSat: 96, accentLight: 56 } },
  { id: "gold-room", name: "Gold Room", swatch: "linear-gradient(135deg,#9b6b0b,#ffc51b)", patch: { hue: 42, hueShift: -12, saturation: 78, accentSat: 92, accentLight: 58 } },
  { id: "violet", name: "Violet", swatch: "linear-gradient(135deg,#7c3aed,#43d3ff)", patch: { hue: 268, hueShift: 42, saturation: 78, accentSat: 90, accentLight: 62 } },
  { id: "emerald", name: "Emerald", swatch: "linear-gradient(135deg,#059669,#43d3ff)", patch: { hue: 156, hueShift: -34, saturation: 70, accentSat: 86, accentLight: 50 } },
];

const RTP_PRESETS = [
  { name: "Pragmatic Blue", patch: {} },
  { name: "Emerald", patch: { cRim: "#2fd48a", cBarTop: "#0b3a2c", cBarMid: "#07281e", cBarBot: "#041a14", cLabel: "#9fe6c6", cBolt: "#ffd75e", cGold: "#ffe066", cBrand: "#9fe6c6" } },
  { name: "Crimson", patch: { cRim: "#ff4d5e", cBarTop: "#4a0d1c", cBarMid: "#320812", cBarBot: "#20050c", cLabel: "#ffb3bd", cBolt: "#ffb020", cGold: "#ffcf4d", cBrand: "#ffb3bd" } },
  { name: "Neon Violet", patch: { cRim: "#a855f7", cBarTop: "#2e1065", cBarMid: "#210b4a", cBarBot: "#150733", cLabel: "#d8b4fe", cBolt: "#22d3ee", cGold: "#f0abfc", cBrand: "#d8b4fe" } },
  { name: "Midnight Gold", patch: { cRim: "#d4af37", cBarTop: "#231d0d", cBarMid: "#171207", cBarBot: "#0d0a04", cLabel: "#e8d9a0", cBolt: "#ffd700", cGold: "#ffd700", cBrand: "#e8d9a0" } },
];

const RTP_FONT_OPTIONS = [
  { label: "Barlow Condensed", value: "'Barlow Condensed', sans-serif" },
  { label: "Barlow", value: "'Barlow', sans-serif" },
  { label: "Oswald", value: "'Oswald', sans-serif" },
  { label: "Rajdhani", value: "'Rajdhani', sans-serif" },
  { label: "Teko", value: "'Teko', sans-serif" },
  { label: "Orbitron", value: "'Orbitron', sans-serif" },
  { label: "Chakra Petch", value: "'Chakra Petch', sans-serif" },
  { label: "Anton", value: "'Anton', sans-serif" },
  { label: "Montserrat", value: "'Montserrat', sans-serif" },
  { label: "Inter", value: "'Inter', sans-serif" },
];

const RTP_EMBLEMS = [
  { key: "reel", name: "Slot Reel" },
  { key: "coin", name: "Gold Coin" },
  { key: "dice", name: "Dice" },
  { key: "seven", name: "Lucky Seven" },
  { key: "gem", name: "Gem" },
  { key: "flame", name: "Flame" },
  { key: "bars", name: "Volatility Bars" },
  { key: "card", name: "Card Flip" },
  { key: "radar", name: "Radar Pulse" },
  { key: "lever", name: "Lever" },
  { key: "orbit", name: "Orbit Rings" },
];

const GIVEAWAY_SURFACES = [
  { key: "metallic", label: "Metallic" },
  { key: "gradient", label: "Gradient" },
  { key: "matte", label: "Matte" },
  { key: "gloss", label: "Gloss" },
];

const GIVEAWAY_FONTS = [
  { key: "orbitron", label: "Orbitron", stack: "'Orbitron', sans-serif" },
  { key: "rajdhani", label: "Rajdhani", stack: "'Rajdhani', sans-serif" },
  { key: "chakra", label: "Chakra Petch", stack: "'Chakra Petch', sans-serif" },
  { key: "audiowide", label: "Audiowide", stack: "'Audiowide', cursive" },
  { key: "bebas", label: "Bebas Neue", stack: "'Bebas Neue', sans-serif" },
  { key: "inter", label: "System Sans", stack: "system-ui, -apple-system, 'Segoe UI', sans-serif" },
  { key: "mono", label: "Mono", stack: "ui-monospace, 'Courier New', monospace" },
  { key: "serif", label: "Serif", stack: "Georgia, 'Times New Roman', serif" },
];

const BONUS_COLOURS = [
  { key: "ocean", name: "Ocean", accent: "#45c8ff", bg: "#081228" },
  { key: "emerald", name: "Emerald", accent: "#35f0a5", bg: "#06140d" },
  { key: "crimson", name: "Crimson", accent: "#ff5470", bg: "#180509" },
  { key: "violet", name: "Violet", accent: "#a97bff", bg: "#0a0716" },
  { key: "gold", name: "Gold", accent: "#ffc93d", bg: "#0d0a03" },
];

const BONUS_FINISHES = ["flat", "metallic", "gloss", "matte", "gradient"];
const BONUS_FONTS = [
  { key: "rajdhani", name: "Rajdhani", family: "'Rajdhani', sans-serif" },
  { key: "orbitron", name: "Orbitron", family: "'Orbitron', sans-serif" },
  { key: "chakra", name: "Chakra", family: "'Chakra Petch', sans-serif" },
];

const BACKGROUND_PRESETS = [
  { id: "midnight", name: "Midnight Mesh", patch: { color1: "#020611", color2: "#0a84ff", color3: "#f97316", texture: "aurora", animSpeed: 10 } },
  { id: "emerald", name: "Emerald Smoke", patch: { color1: "#03120c", color2: "#10b981", color3: "#d9f99d", texture: "nebula", animSpeed: 13 } },
  { id: "violet", name: "Violet Glow", patch: { color1: "#0b0418", color2: "#8b5cf6", color3: "#22d3ee", texture: "diagonal", animSpeed: 9 } },
  { id: "gold", name: "Gold Room", patch: { color1: "#0d0a03", color2: "#b7791f", color3: "#fbbf24", texture: "grid", animSpeed: 14 } },
];

const DEFAULT_BETTER_CONFIG = {
  bonus_hunt: {
    displayStyle: "better_bonus_hunt",
    colour: "ocean",
    finish: "flat",
    orientation: "vertical",
    carouselMode: "3d",
    listMode: "compact",
    drawerMode: "shrink",
    animations: true,
    animSpeed: 1,
    carouselMs: 3200,
    font: "rajdhani",
    fontFamily: "'Rajdhani', sans-serif",
    uiScale: 1,
    barHeight: 6,
    avatarSize: 28,
    visibleRows: 5,
    headerAccent: "#45c8ff",
    accentColor: "#45c8ff",
    headerColor: "#081228",
    bgColor: "#081228",
    listCardColor: "rgba(255,255,255,0.07)",
    cardRadius: 18,
    fontSize: 13,
  },
  giveaway: {
    displayStyle: "better_giveaway",
    title: "Giveaway #1",
    prize: "10$ MBway",
    subtitle: "(min 30 Participants)",
    keyword: "iseca",
    surface: "gloss",
    hue: 208,
    hueShift: 0,
    saturation: 88,
    lightness: 10,
    accentSat: 96,
    accentLight: 58,
    accentColor: "#43d3ff",
    bgColor: "#081226",
    textColor: "#f8fafc",
    mutedColor: "rgba(226,232,240,0.68)",
    width: 700,
    height: 270,
    padX: 31,
    padY: 22,
    tileGap: 12,
    radius: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderAlpha: 0.9,
    tileRadius: 10,
    innerFrame: true,
    innerInset: 5,
    brackets: true,
    bracketSize: 27,
    bracketWidth: 2,
    edgeLights: true,
    sideDashes: true,
    sheen: true,
    glow: 100,
    innerGlow: 100,
    titleFont: "orbitron",
    bodyFont: "rajdhani",
    fontFamily: "'Rajdhani', sans-serif",
    titleSize: 20,
    prizeSize: 31,
    subSize: 15,
    labelSize: 10,
    valueSize: 28,
    titleWeight: 700,
    letterSpacing: 1,
    textGlow: 100,
    italicPrize: true,
    uppercaseLabels: true,
  },
  navbar: {
    displayStyle: "better_navbar",
    brandName: "BRUTUSPOLUS",
    brandTop: "Brutus",
    brandBottom: "Polus",
    siteUrl: "www.brutuspolus.com",
    startLabel: "Start",
    startValue: "EUR 2000",
    casinoCommand: "!Casino",
    nowPlayingLabel: "Now Playing",
    nowPlaying: "Fa Fa Fa - (Album Version) - Datarock",
    accentBlue: "#2563eb",
    accentGold: "#f97316",
    barHeight: 52,
    radius: 12,
    maxWidth: 1152,
  },
  chat: {
    chatStyle: "better_chat",
    font: "Arial, Helvetica, sans-serif",
    fontSize: 12,
    usernameSize: 12,
    glow: "#00c3ff",
    username: "#ffb800",
    text: "#f4f7ff",
    bubble: "#001a47",
    panel: "#000d2d",
    animation: "slide-down",
    stagger: 120,
    entry: "top",
    lifespan: "persistent",
    fadeAfter: 6,
    maxMessages: 4,
    live: false,
    bg: "solid",
    texture: "none",
    textureStrength: 30,
  },
  rtp_stats: {
    displayStyle: "better_rtp",
    providerMode: "name",
    providerName: "Pragmatic Play",
    logoSrc: "",
    logoFit: "contain",
    logoHeight: 30,
    logoMaxW: 160,
    logoPadX: 0,
    logoPadY: 0,
    logoOffsetX: 0,
    logoOffsetY: 0,
    showEmblem: true,
    showDividers: true,
    cRim: "#2b7de9",
    cBarTop: "#0c2150",
    cBarMid: "#081735",
    cBarBot: "#050f26",
    cLabel: "#9db9ea",
    cValue: "#ffffff",
    cBolt: "#f7a41d",
    cGold: "#ffc01e",
    cBrand: "#8aa6d8",
    cEmA: "#f7752a",
    cEmB: "#f7a41d",
    cEmBase: "#12295c",
    cPage: "#020817",
    fontTitle: "'Barlow Condensed', sans-serif",
    fontBody: "'Barlow', sans-serif",
    titleSize: 21,
    titleTracking: 0.08,
    valueSize: 16,
    labelSize: 10,
    barHeight: 54,
    radius: 10,
    borderWidth: 1,
    barPadX: 20,
    barPadY: 11,
    emblem: "reel",
    emblemSize: 28,
    emblemSpeed: 1,
    emblemStroke: 2,
    emblemAnimate: true,
  },
  background: {
    displayStyle: "better_background",
    bgMode: "texture",
    texture: "aurora",
    color1: "#020611",
    color2: "#0a84ff",
    color3: "#f97316",
    intensity: 70,
    animSpeed: 10,
    opacity: 100,
    overlayColor: "#020611",
    overlayOpacity: 18,
    imageUrl: "",
    videoUrl: "",
    imageFit: "cover",
    imagePosition: "center",
    mediaOpacity: 88,
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0,
    hueRotate: 0,
    grayscale: 0,
    sepia: 0,
    fxParticles: true,
    fxScanlines: true,
    fxVignette: true,
  },
  bets: {
    displayStyle: "better_bets",
    theme: "neon",
    font: "cyber",
    fontScale: 100,
    borderRadius: 8,
    glowIntensity: 100,
    opacity: 100,
    fillStyle: "liquid",
    fillSpeed: 100,
    showBrackets: true,
    showSheen: true,
    layoutMode: "cards",
    columns: 2,
    orientation: "vertical",
    cardColors: DEFAULT_CARD_COLORS,
  },
};

export const BETTER_WIDGETS = [
  { type: "bonus_hunt", label: "Better Hunt", styleKey: "displayStyle", styleId: "better_bonus_hunt", icon: "BH", defaultSize: { width: 760, height: 420 } },
  { type: "giveaway", label: "Better Giveaway", styleKey: "displayStyle", styleId: "better_giveaway", icon: "GW", defaultSize: { width: 700, height: 270 } },
  { type: "navbar", label: "Better Navbar", styleKey: "displayStyle", styleId: "better_navbar", icon: "NB", defaultSize: { width: 1200, height: 72 } },
  { type: "chat", label: "Better Chat", styleKey: "chatStyle", styleId: "better_chat", icon: "CH", defaultSize: { width: 260, height: 520 } },
  { type: "rtp_stats", label: "Better RTP Stats", styleKey: "displayStyle", styleId: "better_rtp", icon: "RT", defaultSize: { width: 1080, height: 88 } },
  { type: "background", label: "Better Background", styleKey: "displayStyle", styleId: "better_background", icon: "BG", defaultSize: { width: 1920, height: 1080 } },
  { type: "bets", label: "Better Bets", styleKey: "displayStyle", styleId: "better_bets", icon: "BT", defaultSize: { width: 380, height: 430 } },
];

export function getBetterWidgetMeta(type) {
  return BETTER_WIDGETS.find((item) => item.type === type) || null;
}

export function ensureBetterWidgetConfig(type, config = {}) {
  const meta = getBetterWidgetMeta(type);
  const defaults = DEFAULT_BETTER_CONFIG[type] || {};
  return {
    ...defaults,
    ...config,
    ...(meta ? { [meta.styleKey]: meta.styleId } : {}),
  };
}

export function buildBetterWidgetUpdate(widget) {
  const meta = getBetterWidgetMeta(widget?.widget_type);
  if (!widget || !meta) return widget;
  return {
    ...widget,
    width: Number(widget.width) || meta.defaultSize.width,
    height: Number(widget.height) || meta.defaultSize.height,
    config: ensureBetterWidgetConfig(widget.widget_type, widget.config),
  };
}

function formatNumber(value, fallback = "0") {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return number.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatMoney(value, currency = "EUR ") {
  const number = Number(value) || 0;
  return `${currency}${number.toLocaleString(undefined, {
    minimumFractionDigits: number % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

function stripBang(value) {
  return String(value || "").replace(/^!+/, "");
}

function initials(value) {
  return String(value || "SC")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function betLabel(option, index) {
  return typeof option === "string" ? option : option?.label || `Set ${index + 1}`;
}

function useTab(defaultTab) {
  return useState(defaultTab);
}

function Section({ title, icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="bp-section">
      <button className="bp-section__head" type="button" onClick={() => setOpen((value) => !value)}>
        <span>{icon}{title}</span>
        <ChevronDown size={14} className={open ? "is-open" : ""} />
      </button>
      {open && <div className="bp-section__body">{children}</div>}
    </section>
  );
}

function SliderRow({ label, value, min, max, step = 1, unit = "", onChange, disabled = false }) {
  const pct = ((Number(value) - min) / (max - min)) * 100;
  return (
    <label className={`bp-slider${disabled ? " is-disabled" : ""}`}>
      <span>
        <em>{label}</em>
        <strong>{value}{unit}</strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ background: `linear-gradient(90deg, #00c3ff ${pct}%, #0a2547 ${pct}%)` }}
      />
    </label>
  );
}

function ToggleRow({ label, checked, onChange, hint }) {
  return (
    <button className={`bp-toggle${checked ? " is-on" : ""}`} type="button" onClick={() => onChange(!checked)}>
      <span>
        <strong>{label}</strong>
        {hint && <em>{hint}</em>}
      </span>
      <i />
    </button>
  );
}

function ColorRow({ label, value, onChange }) {
  return (
    <label className="bp-color">
      <span>
        <strong>{label}</strong>
        <em>{value}</em>
      </span>
      <input type="color" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function TextRow({ label, value, onChange }) {
  return (
    <label className="bp-text">
      <span>{label}</span>
      <input value={value || ""} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SelectRow({ label, value, options, onChange }) {
  return (
    <label className="bp-text">
      <span>{label}</span>
      <select value={value || ""} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value || option.key} value={option.value || option.key}>
            {option.label || option.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function Segmented({ value, options, onChange, columns = 2 }) {
  return (
    <div className="bp-segmented" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {options.map((option) => (
        <button
          key={option.value || option.key}
          type="button"
          className={(option.value || option.key) === value ? "is-active" : ""}
          onClick={() => onChange(option.value || option.key)}
        >
          {option.icon}
          <span>{option.label || option.name}</span>
        </button>
      ))}
    </div>
  );
}

function BetterBetsPreview({ config }) {
  const c = ensureBetterWidgetConfig("bets", config);
  const options = Array.isArray(c.options) && c.options.length
    ? c.options.slice(0, 6)
    : ["0 - 99", "100 - 199", "200 - 299", "300 - 399", "400 - 499", "500 - 599"];
  const bets = c.bets || {};
  const totalPool = options.reduce((sum, _, index) => sum + (Number(bets[`opt_${index}`]) || 0), 0);
  const totalBets = Object.keys(c.betters || {}).length;
  const colors = Array.isArray(c.cardColors) && c.cardColors.length >= 6 ? c.cardColors : DEFAULT_CARD_COLORS;
  const values = options.map((_, index) => {
    const realAmount = Number(bets[`opt_${index}`]) || 0;
    if (totalPool > 0) return Math.round((realAmount / totalPool) * 100);
    return 0;
  });
  const cssVars = {
    "--fs": (Number(c.fontScale) || 100) / 100,
    "--card-radius": `${Number(c.borderRadius) || 8}px`,
    "--glow-mult": (Number(c.glowIntensity) || 100) / 100,
    "--widget-opacity": (Number(c.opacity) || 100) / 100,
    "--fill-dur": `${3.2 * (100 / Math.max(Number(c.fillSpeed) || 100, 10))}s`,
    "--cols": Number(c.columns) || 2,
  };

  return (
    <div className="bp-bets-stage" data-theme={c.theme} data-font={c.font} data-fill={c.fillStyle} style={cssVars}>
      <section className={`bet-widget${!c.showBrackets ? " hide-brackets" : ""}${!c.showSheen ? " hide-sheen" : ""}${c.orientation === "horizontal" ? " is-horizontal" : ""}`} data-cols={Number(c.columns) || 2}>
        <div className="widget-sheen" />
        <header className="widget-header">
          <div className="title-lockup">
            <span className="title-mark" />
            <h1>{c.question || "Place Your Bets"}</h1>
          </div>
          <span className="open-status"><i /> {String(c.gameStatus || "OPEN").toUpperCase()}</span>
        </header>
        <div className="event-meta">
          <div className="meta-item"><strong>{formatMoney(totalPool, "")}</strong><span><Coins size={10} /> Pool</span></div>
          <div className="meta-item"><strong>{c.countdown ? `${c.countdown}s` : "0:00"}</strong><span><Timer size={10} /> Timer</span></div>
          <div className="meta-item"><strong>{totalBets}</strong><span><Users size={10} /> Bets</span></div>
        </div>
        <div className={c.layoutMode === "bars" ? "bars-grid" : "bets-grid"}>
          {options.map((option, index) => {
            const pct = values[index];
            const cc = colors[index % colors.length];
            return c.layoutMode === "bars" ? (
              <button key={index} className="bet-bar" type="button" style={{ "--fill": `${pct}%`, "--accent": cc.accent, "--accent-2": cc.accent2 }}>
                <span className="bar-num">{index + 1}</span>
                <span className="bar-range">{betLabel(option, index)}</span>
                <span className="bar-track"><span className="bf bf-solid"><span className="bf-core" /></span></span>
                <span className="bar-pct">{pct}%</span>
              </button>
            ) : (
              <button key={index} className="bet-option" type="button" style={{ "--fill": `${pct}%`, "--accent": cc.accent, "--accent-2": cc.accent2 }}>
                <span className="fill-wrap fill-solid"><span className="solid-bar" /><span className="fill-bloom" /></span>
                <span className="option-scrim" />
                <span className="option-number">{index + 1}</span>
                <span className="option-range">{betLabel(option, index)}</span>
                <span className="option-details"><strong>{pct}%</strong><small>Set {index + 1}</small></span>
                <span className="option-glint" />
              </button>
            );
          })}
        </div>
        <div className="bet-entry">
          <span>&gt;&gt;&gt;</span>
          <input readOnly placeholder={`Type ${c.chatCommand || "!bet"} number to bet`} />
          <kbd>Enter</kbd>
        </div>
      </section>
    </div>
  );
}

function BetterChatPreview({ config }) {
  const c = ensureBetterWidgetConfig("chat", config);
  const messages = Array.isArray(c.previewMessages) ? c.previewMessages : [];
  const visibleMessages = messages.slice(0, c.maxMessages || 4);
  return (
    <div className="bp-chat-stage">
      <section
        className={`chat-widget wb-${c.bg}`}
        style={{
          width: Number(c.width) || 218,
          height: Number(c.height) || 457,
          "--glow": c.glow,
          "--panel": c.panel,
          "--bubble": c.bubble,
          "--username": c.username,
          "--text": c.text,
          "--msg-font": c.font,
          "--msg-size": `${c.fontSize}px`,
          "--user-size": `${c.usernameSize}px`,
        }}
      >
        {c.texture !== "none" && <div className={`chat-texture tex-${c.texture}`} style={{ "--tex-opacity": String((c.textureStrength || 30) / 100) }} />}
        <div className={`chat-feed feed-${c.entry}`}>
          {visibleMessages.length ? (
            visibleMessages.map((message, index) => (
              <article key={`${message.user}-${index}`} className={`chat-message anim-${c.animation}`} style={{ "--enter-delay": `${index * (c.stagger || 120)}ms` }}>
                <span className={`avatar avatar--${index % 2 ? "blue" : "cyan"}`}><Users size={12} fill="currentColor" strokeWidth={0} /></span>
                <div className="message-copy">
                  <h2>{message.user || message.username}</h2>
                  <p>{message.text || message.message}</p>
                </div>
              </article>
            ))
          ) : (
            <div className="chat-empty-state">Waiting for live chat messages</div>
          )}
        </div>
        <button className="replay-button" type="button" aria-label="Replay"><RotateCcw size={13} /></button>
      </section>
    </div>
  );
}

function OrangeArc() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" className="bp-orange-arc">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="45 15" strokeLinecap="round" />
    </svg>
  );
}

function BetterNavbarPreview({ config }) {
  const c = ensureBetterWidgetConfig("navbar", config);
  return (
    <div className="bp-navbar-stage">
      <div className="bp-navbar" style={{ "--bp-blue": c.accentBlue, "--bp-gold": c.accentGold, height: Number(c.barHeight) || 52, borderRadius: Number(c.radius) || 12, maxWidth: Number(c.maxWidth) || 1152 }}>
        <div className="bp-navbar-glow" />
        <div className="bp-navbar-brand">
          <div className="bp-brand-stack"><span>{c.brandTop}</span><span>{c.brandBottom}</span></div>
          <OrangeArc />
          <div className="bp-brand-title"><strong>{c.brandName}</strong><span>{c.siteUrl}</span></div>
        </div>
        <div className="bp-nav-divider" />
        <div className="bp-nav-stats">
          <span><Zap size={13} fill="currentColor" /> <em>{c.startLabel}</em> <strong>{c.startValue}</strong></span>
          <span><Zap size={13} fill="currentColor" /> <strong>{c.casinoCommand}</strong></span>
        </div>
        <div className="bp-nav-divider bp-nav-divider--push" />
        <div className="bp-now-playing">
          <Music size={13} fill="currentColor" />
          <em>{c.nowPlayingLabel}</em>
          <span>-</span>
          <strong>{c.nowPlaying}</strong>
        </div>
      </div>
    </div>
  );
}

function BetterRtpPreview({ config }) {
  const c = ensureBetterWidgetConfig("rtp_stats", config);
  const slotName = c.slotName || c.detectedSlotName || c.currentSlotName || "5 Lions Megaways";
  const providerName = c.providerName || c.provider || "Pragmatic Play";
  return (
    <div className="bp-rtp-stage">
      <div
        className="bp-rtp-bar"
        style={{
          "--c-rim": c.cRim,
          "--c-bar-top": c.cBarTop,
          "--c-bar-mid": c.cBarMid,
          "--c-bar-bot": c.cBarBot,
          "--c-bolt": c.cBolt,
          "--c-gold": c.cGold,
          "--b-radius": `${c.radius}px`,
          "--b-width": `${c.borderWidth}px`,
          height: Number(c.barHeight) || 54,
          padding: `${c.barPadY}px ${c.barPadX}px`,
        }}
      >
        <div className="bp-rtp-provider">
          {c.providerMode !== "none" && c.providerMode !== "name" && c.logoSrc ? (
            <img src={c.logoSrc} alt="" style={{ height: c.logoHeight, maxWidth: c.logoMaxW, objectFit: c.logoFit }} />
          ) : null}
          {c.providerMode !== "none" && c.providerMode !== "image" && (
            <span style={{ color: c.cBrand, fontFamily: c.fontBody }}>{providerName}</span>
          )}
          {c.showEmblem && <span className="bp-rtp-emblem"><OrangeArc /></span>}
          <h1 style={{ fontFamily: c.fontTitle, fontSize: c.titleSize, letterSpacing: `${c.titleTracking}em`, color: c.cValue }}>{slotName}</h1>
        </div>
        {c.showDividers && <div className="bp-rtp-divider" />}
        <div className="bp-rtp-stats">
          {[
            ["RTP", c.rtp || c.rtpValue || "95.5%"],
            ["Potential", c.potential || c.maxWin || "x5000"],
            ["Volatility", c.volatility || "HIGH"],
          ].map(([label, value], index) => (
            <span key={label}>
              <Zap className="bp-rtp-bolt" size={Math.round((c.labelSize || 10) * 1.3)} fill={c.cBolt} stroke={c.cBolt} style={{ animationDelay: `${index * 0.5}s` }} />
              <em style={{ fontFamily: c.fontBody, fontSize: c.labelSize, color: c.cLabel }}>{label}</em>
              <strong style={{ fontFamily: c.fontTitle, fontSize: c.valueSize, color: c.cValue }}>{value}</strong>
            </span>
          ))}
        </div>
        {c.showDividers && <div className="bp-rtp-divider" />}
        <div className="bp-rtp-best"><Trophy size={14} fill={c.cGold} stroke={c.cGold} /><em>Best Win</em><span>-</span><strong>{c.bestWin || "No personal best yet"}</strong></div>
      </div>
      <div className="bp-rtp-rim" style={{ background: `radial-gradient(50% 100% at 50% 0%, ${c.cRim}47, transparent 75%)` }} />
    </div>
  );
}

function BetterBackgroundPreview({ config }) {
  const c = ensureBetterWidgetConfig("background", config);
  const particles = useMemo(
    () => Array.from({ length: 18 }, (_, index) => ({
      left: `${(index * 37) % 100}%`,
      top: `${(index * 53) % 100}%`,
      size: 50 + ((index * 19) % 90),
      delay: `${(index % 8) * -0.8}s`,
    })),
    [],
  );
  return (
    <div className="bp-background-stage">
      <div className={`bp-background bp-bg-${c.texture}`} style={{ "--bg-a": c.color1, "--bg-b": c.color2, "--bg-c": c.color3, "--bg-opacity": (Number(c.opacity) || 100) / 100, "--bg-speed": `${Number(c.animSpeed) || 10}s` }}>
        {c.bgMode === "image" && c.imageUrl ? <img src={c.imageUrl} alt="" style={{ objectFit: c.imageFit, objectPosition: c.imagePosition }} /> : null}
        {c.fxParticles && particles.map((particle, index) => <i key={index} className="bp-bg-particle" style={{ left: particle.left, top: particle.top, width: particle.size, height: particle.size, animationDelay: particle.delay }} />)}
        {c.fxScanlines && <span className="bp-bg-scanlines" />}
        {c.fxVignette && <span className="bp-bg-vignette" />}
        <span className="bp-bg-tint" style={{ background: c.overlayColor, opacity: (Number(c.overlayOpacity) || 0) / 100 }} />
      </div>
    </div>
  );
}

function BetterGiveawayPreview({ config }) {
  const c = ensureBetterWidgetConfig("giveaway", config);
  const keyword = stripBang(c.keyword);
  const participants = Array.isArray(c.participants) ? c.participants : [];
  const winner = c.winner || "";
  const accent = `hsl(${c.hue + c.hueShift} ${c.accentSat}% ${c.accentLight}%)`;
  return (
    <div className="bp-giveaway-stage" style={{ "--gw-accent": accent, "--gw-hue": c.hue, "--gw-sat": `${c.saturation}%`, "--gw-light": `${c.lightness}%`, "--gw-radius": `${c.radius}px`, "--gw-pad-x": `${c.padX}px`, "--gw-pad-y": `${c.padY}px`, "--gw-gap": `${c.tileGap}px`, "--gw-glow": Number(c.glow) || 0 }}>
      <section className="bp-giveaway-widget" data-surface={c.surface} style={{ width: c.width, minHeight: c.height }}>
        {c.brackets && <><span className="edge edge-top-left" /><span className="edge edge-top-right" /><span className="edge edge-bottom-left" /><span className="edge edge-bottom-right" /></>}
        {c.edgeLights && <><span className="edge-light edge-light-top" /><span className="edge-light edge-light-bottom" /></>}
        <header className="bp-gw-header">
          <div className="bp-gw-name"><PartyPopper size={16} /><span>{c.title}</span></div>
          <span className="bp-gw-live"><i /> {c.isActive === false ? "PAUSED" : "LIVE"}</span>
        </header>
        <div className="bp-gw-prize"><strong>{c.prize}</strong><span>{c.subtitle}</span></div>
        <div className="bp-gw-metrics">
          <div><span>Keyword</span><strong>!{keyword}</strong></div>
          <div><span>Entries</span><strong>{participants.length}</strong></div>
        </div>
        <div className="bp-gw-reel">
          {winner ? (
            <div className="bp-gw-winner"><Trophy size={18} /><span>Winner</span><strong>{winner}</strong></div>
          ) : participants.length ? (
            participants.slice(-8).map((name, index) => <span key={`${name}-${index}`} className="bp-gw-chip">{initials(name.name || name)}</span>)
          ) : (
            <span className="bp-gw-empty">Waiting for entries</span>
          )}
        </div>
        {c.sheen && <span className="bp-gw-sheen" />}
      </section>
    </div>
  );
}

function BetterBonusHuntPreview({ config }) {
  const c = ensureBetterWidgetConfig("bonus_hunt", config);
  const bonuses = Array.isArray(c.bonuses) ? c.bonuses : [];
  const opened = bonuses.filter((bonus) => bonus?.opened);
  const current = bonuses.find((bonus) => !bonus?.opened) || bonuses[0] || null;
  const progress = bonuses.length ? Math.round((opened.length / bonuses.length) * 100) : 0;
  const accent = c.headerAccent || c.accentColor || "#45c8ff";
  const blue = c.headerColor || c.bgColor || "#081228";
  return (
    <div className="bp-hunt-stage" style={{ "--hunt-accent": accent, "--hunt-blue": blue, "--hunt-radius": `${c.cardRadius}px`, "--hunt-glow": (Number(c.uiScale) || 1) }}>
      <section className="bp-hunt-widget" data-surface={c.finish}>
        <header className="bp-hunt-header">
          <div><span>{c.bonusOpening ? "Bonus opening" : "Bonus hunt"}</span><strong>{c.title || c.huntTitle || "Hunt session"}</strong></div>
          <em>{opened.length}/{bonuses.length}</em>
        </header>
        <div className="bp-hunt-main">
          <div className="bp-hunt-feature">
            {current?.image || current?.imageUrl || current?.slot?.image ? <img src={current.image || current.imageUrl || current.slot.image} alt="" /> : <span className="bp-hunt-no-image"><ImagePlus size={24} /></span>}
            <div><span>Current slot</span><strong>{current?.slotName || current?.name || current?.slot?.name || "No bonuses yet"}</strong><em>{current?.provider || current?.slot?.provider || ""}</em></div>
          </div>
          <div className="bp-hunt-stats">
            {[
              ["Total bet", formatMoney(bonuses.reduce((sum, bonus) => sum + (Number(bonus?.betSize) || 0), 0), c.currency || "EUR ")],
              ["Total pay", formatMoney(opened.reduce((sum, bonus) => sum + (Number(bonus?.payout) || 0), 0), c.currency || "EUR ")],
              ["Progress", `${progress}%`],
              ["Bonuses", formatNumber(bonuses.length)],
            ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
          </div>
        </div>
        <div className="bp-hunt-progress"><span style={{ width: `${progress}%` }} /></div>
        {c.listMode !== "names" && <div className="bp-hunt-list">{bonuses.slice(0, c.visibleRows || 5).map((bonus, index) => <span key={index}><em>{bonus?.opened ? "opened" : "queued"}</em><strong>{bonus?.slotName || bonus?.name || bonus?.slot?.name || `Bonus ${index + 1}`}</strong></span>)}</div>}
      </section>
    </div>
  );
}

export function BetterWidgetPreview({ type, config }) {
  switch (type) {
    case "bets":
      return <BetterBetsPreview config={config} />;
    case "chat":
      return <BetterChatPreview config={config} />;
    case "navbar":
      return <BetterNavbarPreview config={config} />;
    case "rtp_stats":
      return <BetterRtpPreview config={config} />;
    case "background":
      return <BetterBackgroundPreview config={config} />;
    case "giveaway":
      return <BetterGiveawayPreview config={config} />;
    case "bonus_hunt":
      return <BetterBonusHuntPreview config={config} />;
    default:
      return null;
  }
}

function BetterBetsControls({ config, onChange }) {
  const c = ensureBetterWidgetConfig("bets", config);
  const [tab, setTab] = useTab("theme");
  const set = (patch) => onChange({ ...c, ...patch });
  const setCardColor = (index, key, value) => {
    const next = [...(Array.isArray(c.cardColors) ? c.cardColors : DEFAULT_CARD_COLORS)];
    next[index] = { ...next[index], [key]: value };
    set({ cardColors: next });
  };

  return (
    <div className="bp-controls bp-controls--bets">
      <PanelTabs active={tab} onChange={setTab} tabs={[
        ["theme", <Palette size={12} />, "Theme"],
        ["colors", <Pipette size={12} />, "Colors"],
        ["text", <Type size={12} />, "Text"],
        ["effects", <Sparkles size={12} />, "FX"],
        ["layout", <Sliders size={12} />, "Layout"],
      ]} />
      {tab === "theme" && <>
        <Section title="Colour Theme" icon={<Palette size={12} />}><div className="bp-theme-grid">{BET_THEMES.map((theme) => <button key={theme.key} type="button" className={c.theme === theme.key ? "is-active" : ""} onClick={() => set({ theme: theme.key })}><span>{theme.swatches.map((color) => <i key={color} style={{ background: color }} />)}</span><strong>{theme.icon}{theme.name}</strong></button>)}</div></Section>
        <Section title="Widget Opacity" icon={<Eye size={12} />}><SliderRow label="Opacity" value={c.opacity} min={40} max={100} step={5} unit="%" onChange={(opacity) => set({ opacity })} /></Section>
      </>}
      {tab === "colors" && <>
        <Section title="Colour Presets" icon={<Palette size={12} />}><div className="bp-preset-row">{CARD_PRESETS.map((preset) => <button key={preset.name} type="button" onClick={() => set({ cardColors: preset.colors })}><span>{preset.colors.map((color, index) => <i key={index} style={{ background: color.accent }} />)}</span>{preset.name}</button>)}</div></Section>
        <Section title="Per-Card Colours" icon={<Pipette size={12} />}>{(Array.isArray(c.cardColors) ? c.cardColors : DEFAULT_CARD_COLORS).slice(0, 6).map((color, index) => <div className="bp-card-color-row" key={index}><span>Set {index + 1}</span><input type="color" value={color.accent} onChange={(event) => setCardColor(index, "accent", event.target.value)} /><input type="color" value={color.accent2} onChange={(event) => setCardColor(index, "accent2", event.target.value)} /></div>)}<div className="bp-quick-colors">{QUICK_COLORS.map((color) => <button key={color} type="button" style={{ background: color }} onClick={() => setCardColor(0, "accent", color)} />)}</div></Section>
      </>}
      {tab === "text" && <>
        <Section title="Font Family" icon={<Type size={12} />}><div className="bp-font-grid">{FONT_OPTIONS.map((font) => <button key={font.key} type="button" className={c.font === font.key ? "is-active" : ""} onClick={() => set({ font: font.key })}><span style={{ fontFamily: font.family }}>Aa</span><strong>{font.name}</strong></button>)}</div></Section>
        <Section title="Text Size" icon={<Maximize2 size={12} />}><SliderRow label="Size" value={c.fontScale} min={75} max={140} step={5} unit="%" onChange={(fontScale) => set({ fontScale })} /></Section>
      </>}
      {tab === "effects" && <>
        <Section title="Fill Style" icon={<Waves size={12} />}><Segmented value={c.fillStyle} options={FILL_STYLES} columns={3} onChange={(fillStyle) => set({ fillStyle })} /></Section>
        <Section title="Glow Intensity" icon={<Zap size={12} />}><SliderRow label="Glow" value={c.glowIntensity} min={0} max={200} step={10} unit="%" onChange={(glowIntensity) => set({ glowIntensity })} /></Section>
        <Section title="Animation Speed" icon={<Gauge size={12} />}><SliderRow label="Speed" value={c.fillSpeed} min={20} max={200} step={10} unit="%" onChange={(fillSpeed) => set({ fillSpeed })} /></Section>
        <Section title="Toggles" icon={<Eye size={12} />}><ToggleRow label="Corner brackets" checked={c.showBrackets} onChange={(showBrackets) => set({ showBrackets })} /><ToggleRow label="Sheen sweep" checked={c.showSheen} onChange={(showSheen) => set({ showSheen })} /></Section>
      </>}
      {tab === "layout" && <>
        <Section title="Display Mode" icon={<Layers size={12} />}><Segmented value={c.layoutMode} options={[{ key: "cards", name: "Stat Cards", icon: <Layers size={12} /> }, { key: "bars", name: "Progress Bars", icon: <Gauge size={12} /> }]} onChange={(layoutMode) => set({ layoutMode })} /></Section>
        <Section title="Grid Columns" icon={<Sliders size={12} />}><Segmented value={String(c.columns)} options={[{ key: "1", name: "1 Col" }, { key: "2", name: "2 Cols" }, { key: "3", name: "3 Cols" }]} columns={3} onChange={(columns) => set({ columns: Number(columns) })} /></Section>
        <Section title="Orientation" icon={<MonitorPlay size={12} />}><Segmented value={c.orientation} options={[{ key: "vertical", name: "Vertical" }, { key: "horizontal", name: "Horizontal" }]} onChange={(orientation) => set({ orientation })} /></Section>
        <Section title="Card Radius" icon={<Gauge size={12} />}><SliderRow label="Radius" value={c.borderRadius} min={0} max={20} unit="px" onChange={(borderRadius) => set({ borderRadius })} /></Section>
      </>}
    </div>
  );
}

function PanelTabs({ tabs, active, onChange }) {
  return (
    <nav className="bp-panel-tabs">
      {tabs.map(([key, icon, label]) => (
        <button key={key} type="button" className={active === key ? "is-active" : ""} onClick={() => onChange(key)}>
          {icon}<span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

function BetterChatControls({ config, onChange }) {
  const c = ensureBetterWidgetConfig("chat", config);
  const set = (patch) => onChange({ ...c, ...patch });
  return (
    <div className="bp-controls bp-controls--chat">
      <header className="bp-chat-panel-head"><MessageSquare size={17} /><div><h3>Overlay Studio</h3><p>stream chat customizer</p></div><span className={c.live ? "is-live" : ""}><i />{c.live ? "Live" : "Idle"}</span></header>
      <Section title="Typography" icon={<Type size={13} />}><SelectRow label="Message font" value={c.font} options={CHAT_FONTS} onChange={(font) => set({ font })} /><SliderRow label="Message size" value={c.fontSize} min={9} max={20} unit="px" onChange={(fontSize) => set({ fontSize })} /><SliderRow label="Username size" value={c.usernameSize} min={9} max={20} unit="px" onChange={(usernameSize) => set({ usernameSize })} /></Section>
      <Section title="Colours" icon={<Palette size={13} />}><div className="bp-color-grid">{["glow", "username", "text", "bubble", "panel"].map((key) => <ColorRow key={key} label={key[0].toUpperCase() + key.slice(1)} value={c[key]} onChange={(value) => set({ [key]: value })} />)}</div><div className="bp-chat-presets">{CHAT_PRESETS.map((preset) => <button key={preset.name} type="button" onClick={() => set(preset)}><span><i style={{ background: preset.glow }} /><i style={{ background: preset.username }} /><i style={{ background: preset.bubble }} /></span>{preset.name}</button>)}</div></Section>
      <Section title="Backdrop" icon={<Layers size={13} />}><Segmented value={c.bg} columns={3} options={["solid", "horizon", "beam", "nebula", "vignette", "split"].map((key) => ({ key, name: key }))} onChange={(bg) => set({ bg })} /><Segmented value={c.texture} columns={3} options={["none", "scanlines", "grid", "dots", "diagonal", "noise"].map((key) => ({ key, name: key }))} onChange={(texture) => set({ texture })} /><SliderRow label="Texture strength" value={c.textureStrength} min={5} max={80} step={5} unit="%" disabled={c.texture === "none"} onChange={(textureStrength) => set({ textureStrength })} /></Section>
      <Section title="Message Motion" icon={<Waves size={13} />}><Segmented value={c.entry} options={[{ key: "bottom", name: "From bottom" }, { key: "top", name: "From top" }]} onChange={(entry) => set({ entry })} /><Segmented value={c.animation} columns={3} options={["slide-up", "slide-down", "slide-left", "slide-right", "fade", "none"].map((key) => ({ key, name: key.replace("slide-", "") }))} onChange={(animation) => set({ animation })} /><SliderRow label="Stagger between messages" value={c.stagger} min={0} max={400} step={20} unit="ms" onChange={(stagger) => set({ stagger })} /><Segmented value={c.lifespan} columns={3} options={[{ key: "persistent", name: "Keep all" }, { key: "timed", name: "Timed fade" }, { key: "capped", name: "Limit count" }]} onChange={(lifespan) => set({ lifespan })} /><SliderRow label="Fade after" value={c.fadeAfter} min={2} max={15} unit="s" disabled={c.lifespan !== "timed"} onChange={(fadeAfter) => set({ fadeAfter })} /><SliderRow label="Max messages" value={c.maxMessages} min={1} max={8} disabled={c.lifespan !== "capped"} onChange={(maxMessages) => set({ maxMessages })} /></Section>
      <button className="bp-reset" type="button" onClick={() => onChange(DEFAULT_BETTER_CONFIG.chat)}><RotateCcw size={13} /> Reset chat controls</button>
    </div>
  );
}

function SimpleThemedControls({ type, config, onChange }) {
  const c = ensureBetterWidgetConfig(type, config);
  const set = (patch) => onChange({ ...c, ...patch });
  const [tab, setTab] = useTab("theme");
  const activeTab = (tabs) => (tabs.some(([key]) => key === tab) ? tab : tabs[0]?.[0]);

  if (type === "navbar") {
    return (
      <div className="bp-controls">
        <Section title="Content" icon={<Type size={13} />}>{["brandName", "brandTop", "brandBottom", "siteUrl", "startValue", "casinoCommand", "nowPlaying"].map((key) => <TextRow key={key} label={key} value={c[key]} onChange={(value) => set({ [key]: value })} />)}</Section>
        <Section title="Colours" icon={<Palette size={13} />}><ColorRow label="Blue glow" value={c.accentBlue} onChange={(accentBlue) => set({ accentBlue })} /><ColorRow label="Orange arc" value={c.accentGold} onChange={(accentGold) => set({ accentGold })} /></Section>
        <Section title="Size" icon={<Maximize2 size={13} />}><SliderRow label="Height" value={c.barHeight} min={42} max={92} unit="px" onChange={(barHeight) => set({ barHeight })} /><SliderRow label="Radius" value={c.radius} min={0} max={24} unit="px" onChange={(radius) => set({ radius })} /><SliderRow label="Max width" value={c.maxWidth} min={720} max={1600} step={16} unit="px" onChange={(maxWidth) => set({ maxWidth })} /></Section>
      </div>
    );
  }

  if (type === "rtp_stats") {
    const tabs = [
      ["presets", <Palette size={12} />, "Presets"],
      ["provider", <ImagePlus size={12} />, "Provider"],
      ["content", <Type size={12} />, "Content"],
      ["emblem", <Sparkles size={12} />, "Emblem"],
      ["colours", <Pipette size={12} />, "Colours"],
      ["type", <Type size={12} />, "Type"],
      ["bar", <Sliders size={12} />, "Bar"],
    ];
    const current = activeTab(tabs);
    return (
      <div className="bp-controls">
        <PanelTabs active={current} onChange={setTab} tabs={tabs} />
        {current === "presets" && <Section title="Presets" icon={<Palette size={13} />}><div className="bp-preset-row">{RTP_PRESETS.map((preset) => <button key={preset.name} type="button" onClick={() => set(preset.patch)}>{preset.name}</button>)}</div><button className="bp-reset" type="button" onClick={() => onChange(DEFAULT_BETTER_CONFIG.rtp_stats)}><RotateCcw size={13} /> Reset to defaults</button></Section>}
        {current === "provider" && <Section title="Provider" icon={<ImagePlus size={13} />}><Segmented value={c.providerMode} columns={4} options={["image", "name", "both", "none"].map((key) => ({ key, name: key }))} onChange={(providerMode) => set({ providerMode })} /><TextRow label="Provider name" value={c.providerName} onChange={(providerName) => set({ providerName })} /><TextRow label="Logo image URL" value={c.logoSrc} onChange={(logoSrc) => set({ logoSrc })} /><SliderRow label="Height" value={c.logoHeight} min={18} max={72} unit="px" onChange={(logoHeight) => set({ logoHeight })} /><SliderRow label="Max width" value={c.logoMaxW} min={60} max={320} step={4} unit="px" onChange={(logoMaxW) => set({ logoMaxW })} /><SliderRow label="Padding top / bottom" value={c.logoPadY} min={0} max={16} unit="px" onChange={(logoPadY) => set({ logoPadY })} /><SliderRow label="Padding left / right" value={c.logoPadX} min={0} max={24} unit="px" onChange={(logoPadX) => set({ logoPadX })} /><SliderRow label="Nudge up / down" value={c.logoOffsetY} min={-14} max={14} unit="px" onChange={(logoOffsetY) => set({ logoOffsetY })} /><SliderRow label="Nudge left / right" value={c.logoOffsetX} min={-14} max={14} unit="px" onChange={(logoOffsetX) => set({ logoOffsetX })} /><Segmented value={c.logoFit} options={[{ key: "contain", name: "Contain" }, { key: "cover", name: "Crop" }]} onChange={(logoFit) => set({ logoFit })} /></Section>}
        {current === "content" && <Section title="Content" icon={<Type size={13} />}><TextRow label="Slot name" value={c.slotName || ""} onChange={(slotName) => set({ slotName })} /><TextRow label="RTP" value={c.rtp || ""} onChange={(rtp) => set({ rtp })} /><TextRow label="Potential" value={c.potential || ""} onChange={(potential) => set({ potential })} /><TextRow label="Volatility" value={c.volatility || ""} onChange={(volatility) => set({ volatility })} /><TextRow label="Best win text" value={c.bestWin || ""} onChange={(bestWin) => set({ bestWin })} /><ToggleRow label="Show dividers" checked={c.showDividers} onChange={(showDividers) => set({ showDividers })} /></Section>}
        {current === "emblem" && <><Section title="Emblem" icon={<Sparkles size={13} />}><ToggleRow label="Show emblem" checked={c.showEmblem} onChange={(showEmblem) => set({ showEmblem })} /><ToggleRow label="Animate" checked={c.emblemAnimate} onChange={(emblemAnimate) => set({ emblemAnimate })} /><Segmented value={c.emblem} columns={4} options={RTP_EMBLEMS} onChange={(emblem) => set({ emblem })} /><SliderRow label="Speed" value={c.emblemSpeed} min={0.2} max={4} step={0.1} unit="x" onChange={(emblemSpeed) => set({ emblemSpeed })} /><SliderRow label="Size" value={c.emblemSize} min={16} max={64} unit="px" onChange={(emblemSize) => set({ emblemSize })} /><SliderRow label="Stroke / weight" value={c.emblemStroke} min={1} max={5} step={0.5} unit="px" onChange={(emblemStroke) => set({ emblemStroke })} /></Section><Section title="Emblem colours" icon={<Palette size={13} />}><ColorRow label="Primary" value={c.cEmA} onChange={(cEmA) => set({ cEmA })} /><ColorRow label="Secondary" value={c.cEmB} onChange={(cEmB) => set({ cEmB })} /><ColorRow label="Base / track" value={c.cEmBase} onChange={(cEmBase) => set({ cEmBase })} /></Section></>}
        {current === "colours" && <Section title="Colours" icon={<Palette size={13} />}>{[["cRim", "Border / glow"], ["cBarTop", "Bar top"], ["cBarMid", "Bar middle"], ["cBarBot", "Bar bottom"], ["cLabel", "Label text"], ["cValue", "Value text"], ["cBolt", "Bolt icon"], ["cGold", "Trophy"], ["cBrand", "Provider text"], ["cPage", "Page background"]].map(([key, label]) => <ColorRow key={key} label={label} value={c[key]} onChange={(value) => set({ [key]: value })} />)}</Section>}
        {current === "type" && <Section title="Typography" icon={<Type size={13} />}><SelectRow label="Title font" value={c.fontTitle} options={RTP_FONT_OPTIONS} onChange={(fontTitle) => set({ fontTitle })} /><SelectRow label="Body font" value={c.fontBody} options={RTP_FONT_OPTIONS} onChange={(fontBody) => set({ fontBody })} /><SliderRow label="Title size" value={c.titleSize} min={12} max={40} unit="px" onChange={(titleSize) => set({ titleSize })} /><SliderRow label="Title tracking" value={c.titleTracking} min={0} max={0.3} step={0.01} unit="em" onChange={(titleTracking) => set({ titleTracking })} /><SliderRow label="Value size" value={c.valueSize} min={10} max={28} unit="px" onChange={(valueSize) => set({ valueSize })} /><SliderRow label="Label size" value={c.labelSize} min={7} max={16} unit="px" onChange={(labelSize) => set({ labelSize })} /></Section>}
        {current === "bar" && <Section title="Bar size" icon={<Maximize2 size={13} />}><SliderRow label="Total height" value={c.barHeight} min={40} max={120} unit="px" onChange={(barHeight) => set({ barHeight })} /><SliderRow label="Vertical gap" value={c.barPadY} min={2} max={28} unit="px" onChange={(barPadY) => set({ barPadY })} /><SliderRow label="Padding left / right" value={c.barPadX} min={4} max={48} unit="px" onChange={(barPadX) => set({ barPadX })} /><SliderRow label="Corner radius" value={c.radius} min={0} max={40} unit="px" onChange={(radius) => set({ radius })} /><SliderRow label="Border width" value={c.borderWidth} min={0} max={5} step={0.5} unit="px" onChange={(borderWidth) => set({ borderWidth })} /></Section>}
      </div>
    );
  }

  if (type === "background") {
    const tabs = [
      ["presets", <Sparkles size={12} />, "Presets"],
      ["colors", <Palette size={12} />, "Colors"],
      ["source", <ImagePlus size={12} />, "Source"],
      ["textures", <Layers size={12} />, "Texture"],
      ["effects", <Zap size={12} />, "Effects"],
    ];
    const current = activeTab(tabs);
    return (
      <div className="bp-controls">
        <PanelTabs active={current} onChange={setTab} tabs={tabs} />
        {current === "presets" && <Section title="Curated Atmospheres" icon={<Sparkles size={13} />}><div className="bp-preset-row">{BACKGROUND_PRESETS.map((preset) => <button key={preset.id} type="button" onClick={() => set(preset.patch)}><i style={{ background: `linear-gradient(135deg, ${preset.patch.color2}, ${preset.patch.color3})` }} />{preset.name}</button>)}</div><button className="bp-reset" type="button" onClick={() => onChange(DEFAULT_BETTER_CONFIG.background)}><RotateCcw size={13} /> Reset background</button></Section>}
        {current === "colors" && <Section title="Palette Configuration" icon={<Palette size={13} />}>{[["color1", "Base Backdrop"], ["color2", "Primary Hue"], ["color3", "Accent Tone"], ["overlayColor", "Tint"]].map(([key, label]) => <ColorRow key={key} label={label} value={c[key]} onChange={(value) => set({ [key]: value })} />)}<SliderRow label="Color Saturation & Intensity" value={c.intensity} min={20} max={100} unit="%" onChange={(intensity) => set({ intensity })} /><SliderRow label="Tint opacity" value={c.overlayOpacity} min={0} max={80} unit="%" onChange={(overlayOpacity) => set({ overlayOpacity })} /></Section>}
        {current === "source" && <Section title="Source" icon={<ImagePlus size={13} />}><Segmented value={c.bgMode} columns={3} options={["texture", "image", "video"].map((key) => ({ key, name: key }))} onChange={(bgMode) => set({ bgMode })} /><TextRow label="Image URL" value={c.imageUrl} onChange={(imageUrl) => set({ imageUrl })} /><TextRow label="Video URL" value={c.videoUrl} onChange={(videoUrl) => set({ videoUrl })} /><Segmented value={c.imageFit} columns={3} options={["cover", "contain", "fill"].map((key) => ({ key, name: key }))} onChange={(imageFit) => set({ imageFit })} /><TextRow label="Image position" value={c.imagePosition} onChange={(imagePosition) => set({ imagePosition })} /><SliderRow label="Media opacity" value={c.mediaOpacity} min={0} max={100} unit="%" onChange={(mediaOpacity) => set({ mediaOpacity })} /></Section>}
        {current === "textures" && <Section title="Tactile Texture Layers" icon={<Waves size={13} />}><Segmented value={c.texture} columns={3} options={["aurora", "grid", "dots", "diagonal", "nebula", "noise"].map((key) => ({ key, name: key }))} onChange={(texture) => set({ texture })} /><SliderRow label="Flow Animation Speed" value={c.animSpeed} min={4} max={30} unit="s" onChange={(animSpeed) => set({ animSpeed })} /><SliderRow label="Opacity" value={c.opacity} min={0} max={100} unit="%" onChange={(opacity) => set({ opacity })} /><SliderRow label="Brightness" value={c.brightness} min={40} max={180} unit="%" onChange={(brightness) => set({ brightness })} /><SliderRow label="Contrast" value={c.contrast} min={40} max={180} unit="%" onChange={(contrast) => set({ contrast })} /><SliderRow label="Saturation" value={c.saturation} min={0} max={200} unit="%" onChange={(saturation) => set({ saturation })} /></Section>}
        {current === "effects" && <Section title="Particle & Fluid FX" icon={<Sparkles size={13} />}><ToggleRow label="Particles" checked={c.fxParticles} onChange={(fxParticles) => set({ fxParticles })} /><ToggleRow label="Scanlines" checked={c.fxScanlines} onChange={(fxScanlines) => set({ fxScanlines })} /><ToggleRow label="Vignette" checked={c.fxVignette} onChange={(fxVignette) => set({ fxVignette })} /><SliderRow label="Blur" value={c.blur} min={0} max={18} unit="px" onChange={(blur) => set({ blur })} /><SliderRow label="Hue rotate" value={c.hueRotate} min={-180} max={180} unit="deg" onChange={(hueRotate) => set({ hueRotate })} /><SliderRow label="Grayscale" value={c.grayscale} min={0} max={100} unit="%" onChange={(grayscale) => set({ grayscale })} /><SliderRow label="Sepia" value={c.sepia} min={0} max={100} unit="%" onChange={(sepia) => set({ sepia })} /></Section>}
      </div>
    );
  }

  if (type === "giveaway") {
    const tabs = [
      ["theme", <Palette size={12} />, "Theme"],
      ["size", <Maximize2 size={12} />, "Size"],
      ["edges", <Layers size={12} />, "Edges"],
      ["type", <Type size={12} />, "Type"],
      ["content", <Pipette size={12} />, "Text"],
    ];
    const current = activeTab(tabs);
    return (
      <div className="bp-controls">
        <PanelTabs active={current} onChange={setTab} tabs={tabs} />
        {current === "theme" && <><Section title="Presets" icon={<Palette size={13} />}><div className="bp-preset-row">{GIVEAWAY_PRESETS.map((preset) => <button key={preset.id} type="button" onClick={() => set(preset.patch)}><i style={{ background: preset.swatch }} />{preset.name}</button>)}</div></Section><Section title="Finish" icon={<Layers size={13} />}><Segmented value={c.surface} columns={2} options={GIVEAWAY_SURFACES} onChange={(surface) => set({ surface })} /></Section><Section title="Colour" icon={<Palette size={13} />}><SliderRow label="Base hue" value={c.hue} min={0} max={360} unit="deg" onChange={(hue) => set({ hue })} /><SliderRow label="Hue spread" value={c.hueShift} min={-90} max={90} unit="deg" onChange={(hueShift) => set({ hueShift })} /><SliderRow label="Saturation" value={c.saturation} min={0} max={100} unit="%" onChange={(saturation) => set({ saturation })} /><SliderRow label="Backdrop light" value={c.lightness} min={2} max={40} unit="%" onChange={(lightness) => set({ lightness })} /><SliderRow label="Accent vividness" value={c.accentSat} min={0} max={100} unit="%" onChange={(accentSat) => set({ accentSat })} /><SliderRow label="Accent brightness" value={c.accentLight} min={30} max={90} unit="%" onChange={(accentLight) => set({ accentLight })} /><ColorRow label="Renderer accent" value={c.accentColor} onChange={(accentColor) => set({ accentColor })} /><ColorRow label="Renderer background" value={c.bgColor} onChange={(bgColor) => set({ bgColor })} /></Section></>}
        {current === "size" && <Section title="Card dimensions" icon={<Maximize2 size={13} />}><SliderRow label="Width" value={c.width} min={420} max={900} unit="px" onChange={(width) => set({ width })} /><SliderRow label="Height" value={c.height} min={180} max={420} unit="px" onChange={(height) => set({ height })} /><div className="bp-preset-row"><button type="button" onClick={() => set({ width: 700, height: 270 })}>Default</button><button type="button" onClick={() => set({ width: 640, height: 360 })}>16:9</button><button type="button" onClick={() => set({ width: 800, height: 200 })}>Banner</button><button type="button" onClick={() => set({ width: 460, height: 380 })}>Tall</button></div><SliderRow label="Padding X" value={c.padX} min={8} max={70} unit="px" onChange={(padX) => set({ padX })} /><SliderRow label="Padding Y" value={c.padY} min={6} max={60} unit="px" onChange={(padY) => set({ padY })} /><SliderRow label="Tile gap" value={c.tileGap} min={0} max={40} unit="px" onChange={(tileGap) => set({ tileGap })} /></Section>}
        {current === "edges" && <><Section title="Border" icon={<Layers size={13} />}><SliderRow label="Corner radius" value={c.radius} min={0} max={60} unit="px" onChange={(radius) => set({ radius, borderRadius: radius })} /><SliderRow label="Border width" value={c.borderWidth} min={0} max={6} step={0.5} unit="px" onChange={(borderWidth) => set({ borderWidth })} /><SliderRow label="Border opacity" value={c.borderAlpha} min={0} max={1} step={0.05} onChange={(borderAlpha) => set({ borderAlpha })} /><SliderRow label="Tile radius" value={c.tileRadius} min={0} max={40} unit="px" onChange={(tileRadius) => set({ tileRadius })} /></Section><Section title="Frame details" icon={<Frame size={13} />}><ToggleRow label="Inner frame" checked={c.innerFrame} onChange={(innerFrame) => set({ innerFrame })} /><SliderRow label="Frame inset" value={c.innerInset} min={2} max={18} unit="px" disabled={!c.innerFrame} onChange={(innerInset) => set({ innerInset })} /><ToggleRow label="Corner brackets" checked={c.brackets} onChange={(brackets) => set({ brackets })} /><SliderRow label="Bracket length" value={c.bracketSize} min={10} max={80} unit="px" disabled={!c.brackets} onChange={(bracketSize) => set({ bracketSize })} /><SliderRow label="Bracket weight" value={c.bracketWidth} min={1} max={6} step={0.5} unit="px" disabled={!c.brackets} onChange={(bracketWidth) => set({ bracketWidth })} /><ToggleRow label="Edge light bars" checked={c.edgeLights} onChange={(edgeLights) => set({ edgeLights })} /><ToggleRow label="Side dashes" checked={c.sideDashes} onChange={(sideDashes) => set({ sideDashes })} /><ToggleRow label="Sheen sweep" checked={c.sheen} onChange={(sheen) => set({ sheen })} /><SliderRow label="Outer glow" value={c.glow} min={0} max={160} unit="%" onChange={(glow) => set({ glow })} /><SliderRow label="Inner glow" value={c.innerGlow} min={0} max={160} unit="%" onChange={(innerGlow) => set({ innerGlow })} /></Section></>}
        {current === "type" && <Section title="Typography" icon={<Type size={13} />}><SelectRow label="Display font" value={c.titleFont} options={GIVEAWAY_FONTS} onChange={(titleFont) => set({ titleFont })} /><SelectRow label="Body font" value={c.bodyFont} options={GIVEAWAY_FONTS} onChange={(bodyFont) => set({ bodyFont, fontFamily: GIVEAWAY_FONTS.find((font) => font.key === bodyFont)?.stack || c.fontFamily })} /><SliderRow label="Title" value={c.titleSize} min={10} max={44} unit="px" onChange={(titleSize) => set({ titleSize })} /><SliderRow label="Prize" value={c.prizeSize} min={14} max={64} unit="px" onChange={(prizeSize) => set({ prizeSize })} /><SliderRow label="Subtitle" value={c.subSize} min={8} max={30} unit="px" onChange={(subSize) => set({ subSize })} /><SliderRow label="Tile label" value={c.labelSize} min={6} max={20} unit="px" onChange={(labelSize) => set({ labelSize })} /><SliderRow label="Tile value" value={c.valueSize} min={12} max={54} unit="px" onChange={(valueSize) => set({ valueSize })} /><SliderRow label="Letter spacing" value={c.letterSpacing} min={0} max={20} step={0.5} unit="%" onChange={(letterSpacing) => set({ letterSpacing })} /><SliderRow label="Text glow" value={c.textGlow} min={0} max={200} unit="%" onChange={(textGlow) => set({ textGlow })} /><ToggleRow label="Italic prize" checked={c.italicPrize} onChange={(italicPrize) => set({ italicPrize })} /><ToggleRow label="Uppercase labels" checked={c.uppercaseLabels} onChange={(uppercaseLabels) => set({ uppercaseLabels })} /></Section>}
        {current === "content" && <Section title="Card copy" icon={<Type size={13} />}>{["title", "prize", "subtitle", "keyword"].map((key) => <TextRow key={key} label={key} value={c[key]} onChange={(value) => set({ [key]: value })} />)}<p className="bp-hint">The keyword tile shows an exclamation mark automatically, so type just the word.</p><button className="bp-reset" type="button" onClick={() => onChange(DEFAULT_BETTER_CONFIG.giveaway)}><RotateCcw size={13} /> Reset everything</button></Section>}
      </div>
    );
  }

  const applyBonusColour = (colourKey) => {
    const colour = BONUS_COLOURS.find((item) => item.key === colourKey) || BONUS_COLOURS[0];
    set({
      colour: colour.key,
      headerAccent: colour.accent,
      accentColor: colour.accent,
      headerColor: colour.bg,
      bgColor: colour.bg,
    });
  };

  return (
    <div className="bp-controls">
      <header className="bp-chat-panel-head"><SlidersHorizontal size={17} /><div><h3>Control Deck</h3><p>bonus hunt tracker settings</p></div><span><i />Live</span></header>
      <Section title="Orientation" icon={<MonitorPlay size={13} />}><Segmented value={c.orientation} options={[{ key: "vertical", name: "Vertical" }, { key: "horizontal", name: "Horizontal" }]} onChange={(orientation) => set({ orientation })} /></Section>
      <Section title="Texture" icon={<Layers size={13} />}><Segmented value={c.finish} columns={5} options={BONUS_FINISHES.map((key) => ({ key, name: key }))} onChange={(finish) => set({ finish })} /></Section>
      <Section title="Colour" icon={<Palette size={13} />}><div className="bp-preset-row">{BONUS_COLOURS.map((colour) => <button key={colour.key} type="button" className={c.colour === colour.key ? "is-active" : ""} onClick={() => applyBonusColour(colour.key)}><i style={{ background: colour.accent }} />{colour.name}</button>)}</div><ColorRow label="Accent" value={c.headerAccent || c.accentColor} onChange={(value) => set({ headerAccent: value, accentColor: value })} /><ColorRow label="Panel background" value={c.headerColor || c.bgColor} onChange={(value) => set({ headerColor: value, bgColor: value })} /></Section>
      <Section title="Animations" icon={<Wand2 size={13} />}><ToggleRow label="Enable motion" checked={c.animations} onChange={(animations) => set({ animations })} /><SliderRow label="Speed" value={c.animSpeed} min={0.5} max={2} step={0.1} unit="x" onChange={(animSpeed) => set({ animSpeed })} /></Section>
      <Section title="Carousel Style" icon={<Layers size={13} />}><Segmented value={c.carouselMode} columns={3} options={[{ key: "3d", name: "3D Ring" }, { key: "imagestats", name: "Image Stats" }, { key: "stats", name: "Slot Stats" }]} onChange={(carouselMode) => set({ carouselMode })} /></Section>
      <Section title="Carousel Timing" icon={<Timer size={13} />}><SliderRow label="Rotate every" value={c.carouselMs} min={1500} max={6000} step={100} unit="ms" onChange={(carouselMs) => set({ carouselMs })} /></Section>
      <Section title="Typography" icon={<Type size={13} />}><Segmented value={c.font} columns={3} options={BONUS_FONTS} onChange={(font) => set({ font, fontFamily: BONUS_FONTS.find((item) => item.key === font)?.family || c.fontFamily })} /><SliderRow label="UI scale" value={c.uiScale} min={0.85} max={1.2} step={0.05} unit="x" onChange={(uiScale) => set({ uiScale })} /></Section>
      <Section title="Sizes & Layout" icon={<SlidersHorizontal size={13} />}><SliderRow label="Progress bar" value={c.barHeight} min={3} max={10} unit="px" onChange={(barHeight) => set({ barHeight })} /><SliderRow label="Avatar" value={c.avatarSize} min={20} max={44} step={2} unit="px" onChange={(avatarSize) => set({ avatarSize })} /><SliderRow label="Visible rows" value={c.visibleRows} min={3} max={8} onChange={(visibleRows) => set({ visibleRows })} /><SliderRow label="Card radius" value={c.cardRadius} min={0} max={34} unit="px" onChange={(cardRadius) => set({ cardRadius })} /></Section>
      <Section title="List Style" icon={<List size={13} />}><Segmented value={c.listMode} columns={3} options={[{ key: "compact", name: "Rows" }, { key: "image", name: "Cards" }, { key: "names", name: "Names" }]} onChange={(listMode) => set({ listMode })} /></Section>
      <Section title="Best / Worst Card" icon={<Layers size={13} />}><Segmented value={c.drawerMode} options={[{ key: "shrink", name: "Shrink list" }, { key: "expand", name: "Expand panel" }]} onChange={(drawerMode) => set({ drawerMode })} /></Section>
      <button className="bp-reset" type="button" onClick={() => onChange(DEFAULT_BETTER_CONFIG.bonus_hunt)}><RotateCcw size={13} /> Reset defaults</button>
    </div>
  );
}

export function BetterWidgetControls({ type, config, onChange }) {
  if (type === "bets") return <BetterBetsControls config={config} onChange={onChange} />;
  if (type === "chat") return <BetterChatControls config={config} onChange={onChange} />;
  return <SimpleThemedControls type={type} config={config} onChange={onChange} />;
}
