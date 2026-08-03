import React, { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Coins,
  Crown,
  Eye,
  EyeOff,
  Flame,
  Frame,
  Gamepad2,
  Gauge,
  ImagePlus,
  Layers,
  List,
  Maximize2,
  MessageSquare,
  MonitorPlay,
  Music,
  Palette,
  Pipette,
  RotateCcw,
  Settings,
  Sliders,
  SlidersHorizontal,
  Sparkles,
  Timer,
  Type,
  Wand2,
  Users,
  Waves,
  Zap,
} from "lucide-react";
import NavbarWidget from "../widgets/navbar/NavbarWidget";
import RtpStatsWidget from "../widgets/rtp-stats/RtpStatsWidget";
import BonusHuntWidget from "../widgets/bonus-hunt/BonusHuntWidget";
import ChatWidget from "../widgets/chat/ChatWidget";
import TournamentWidget from "../widgets/tournament/TournamentWidget";
import {
  BetterBackgroundStyle,
  BetterGiveawayStyle,
} from "../widgets/shared/betterWidgetStyles";
import {
  STANDARD_BETTER_WIDGET_CONTROLS,
  STANDARD_BETTER_WIDGET_GEOMETRY,
} from "./standardWidgetPresets";

const DEFAULT_CARD_COLORS = [
  { accent: "#45c8ff", accent2: "#1e5ad6" },
  { accent: "#2f63c9", accent2: "#4aa0ff" },
  { accent: "#45c8ff", accent2: "#2a55ad" },
  { accent: "#1e5ad6", accent2: "#45c8ff" },
  { accent: "#4aa0ff", accent2: "#2f63c9" },
  { accent: "#2a55ad", accent2: "#45c8ff" },
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
  {
    key: "neon",
    name: "Neon",
    icon: <Zap size={11} />,
    swatches: ["#071a44", "#0a84ff", "#59d6ff"],
  },
  {
    key: "metallic",
    name: "Metallic",
    icon: <Layers size={11} />,
    swatches: ["#1b232e", "#8fa1b8", "#e8eef6"],
  },
  {
    key: "gradient",
    name: "Gradient",
    icon: <Sparkles size={11} />,
    swatches: ["#171f5e", "#5b7cfa", "#22d3ee"],
  },
  {
    key: "matte",
    name: "Matte",
    icon: <Settings size={11} />,
    swatches: ["#171b22", "#39424f", "#aab4c2"],
  },
  {
    key: "crimson",
    name: "Crimson",
    icon: <Flame size={11} />,
    swatches: ["#1a0610", "#c0192e", "#ff6b81"],
  },
  {
    key: "emerald",
    name: "Emerald",
    icon: <Waves size={11} />,
    swatches: ["#041a12", "#059669", "#34d399"],
  },
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

const CONNECT_FOUR_FONTS = [
  { label: "Rajdhani", value: "'Rajdhani', sans-serif" },
  { label: "Chakra Petch", value: "'Chakra Petch', sans-serif" },
  { label: "Orbitron", value: "'Orbitron', sans-serif" },
  { label: "Oswald", value: "'Oswald', sans-serif" },
  { label: "Rubik", value: "'Rubik', sans-serif" },
  { label: "Impact", value: "Impact, 'Arial Black', sans-serif" },
];

const CHAT_PRESETS = [
  {
    name: "Neon Cyan",
    glow: "#00c3ff",
    username: "#ffb800",
    text: "#f4f7ff",
    bubble: "#001a47",
    panel: "#000d2d",
  },
  {
    name: "Toxic",
    glow: "#3dff8f",
    username: "#d8ff3f",
    text: "#eafff2",
    bubble: "#03251a",
    panel: "#02130b",
  },
  {
    name: "Magma",
    glow: "#ff5c39",
    username: "#ffd23f",
    text: "#fff3ec",
    bubble: "#2c0d08",
    panel: "#170604",
  },
  {
    name: "Pulse",
    glow: "#b44bff",
    username: "#ffd166",
    text: "#f6efff",
    bubble: "#1d0a36",
    panel: "#0d0519",
  },
  {
    name: "Ice",
    glow: "#9fd8ff",
    username: "#ffffff",
    text: "#dceeff",
    bubble: "#0b1a2b",
    panel: "#050c15",
  },
];

const BETTER_CHAT_DEFAULT_SIZE = { width: 218, height: 457 };
const BETTER_CHAT_EMPTY_MESSAGE =
  "Hey you dont you think this chat its too quiet ?";
const BETTER_NAVBAR_SPOTIFY_ONLY_MARKER = "betterNavbarSpotifyOnlyInitialized";
const BETTER_NAVBAR_OPTIONAL_CASINO_MARKER =
  "betterNavbarOptionalCasinoInitialized";
const BETTER_NAVBAR_OPTIONAL_CASINO_COMMAND_MARKER =
  "betterNavbarOptionalCasinoCommandInitialized";
const BETTER_NAVBAR_MANUAL_CASINO_COMMAND_MARKER =
  "betterNavbarManualCasinoCommand";
const LEGACY_CASINO_COMMAND = "!casino";
const BETTER_RTP_LIVE_CONTENT_KEYS = [
  "slotName",
  "detectedSlotName",
  "currentSlotName",
  "provider",
  "providerName",
  "logoSrc",
  "rtp",
  "rtpValue",
  "potential",
  "maxWin",
  "volatility",
  "bestWin",
];

const GIVEAWAY_PRESETS = [
  {
    id: "cyber-blue",
    name: "Cyber Blue",
    swatch: "linear-gradient(135deg,#087eff,#43d3ff)",
    patch: {
      hue: 210,
      hueShift: 24,
      saturation: 82,
      accentSat: 96,
      accentLight: 56,
    },
  },
  {
    id: "gold-room",
    name: "Gold Room",
    swatch: "linear-gradient(135deg,#9b6b0b,#ffc51b)",
    patch: {
      hue: 42,
      hueShift: -12,
      saturation: 78,
      accentSat: 92,
      accentLight: 58,
    },
  },
  {
    id: "violet",
    name: "Violet",
    swatch: "linear-gradient(135deg,#7c3aed,#43d3ff)",
    patch: {
      hue: 268,
      hueShift: 42,
      saturation: 78,
      accentSat: 90,
      accentLight: 62,
    },
  },
  {
    id: "emerald",
    name: "Emerald",
    swatch: "linear-gradient(135deg,#059669,#43d3ff)",
    patch: {
      hue: 156,
      hueShift: -34,
      saturation: 70,
      accentSat: 86,
      accentLight: 50,
    },
  },
];

const RTP_PRESETS = [
  { name: "Pragmatic Blue", patch: {} },
  {
    name: "Emerald",
    patch: {
      cRim: "#2fd48a",
      cBarTop: "#0b3a2c",
      cBarMid: "#07281e",
      cBarBot: "#041a14",
      cLabel: "#9fe6c6",
      cBolt: "#ffd75e",
      cGold: "#ffe066",
      cBrand: "#9fe6c6",
    },
  },
  {
    name: "Crimson",
    patch: {
      cRim: "#ff4d5e",
      cBarTop: "#4a0d1c",
      cBarMid: "#320812",
      cBarBot: "#20050c",
      cLabel: "#ffb3bd",
      cBolt: "#ffb020",
      cGold: "#ffcf4d",
      cBrand: "#ffb3bd",
    },
  },
  {
    name: "Neon Violet",
    patch: {
      cRim: "#a855f7",
      cBarTop: "#2e1065",
      cBarMid: "#210b4a",
      cBarBot: "#150733",
      cLabel: "#d8b4fe",
      cBolt: "#22d3ee",
      cGold: "#f0abfc",
      cBrand: "#d8b4fe",
    },
  },
  {
    name: "Midnight Gold",
    patch: {
      cRim: "#d4af37",
      cBarTop: "#231d0d",
      cBarMid: "#171207",
      cBarBot: "#0d0a04",
      cLabel: "#e8d9a0",
      cBolt: "#ffd700",
      cGold: "#ffd700",
      cBrand: "#e8d9a0",
    },
  },
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

const SLIDESHOW_SAMPLE_MEDIA = [
  "https://images-cdn.softswiss.net/i/s2/pragmaticplay/GatesOfOlympus1000.png|image|Gates of Olympus",
  "https://images-cdn.softswiss.net/i/s2/playngo/MedusasMadness.png|image|Medusas Madness",
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4|video|Demo video",
].join("\n");

const SLIDESHOW_FRAME_STYLES = [
  { key: "neon", label: "Neon" },
  { key: "glass", label: "Glass" },
  { key: "metal", label: "Metal" },
  { key: "minimal", label: "Minimal" },
  { key: "film", label: "Film" },
  { key: "none", label: "None" },
];

const SLIDESHOW_FITS = [
  { key: "cover", label: "Cover" },
  { key: "contain", label: "Contain" },
  { key: "fill", label: "Fill" },
  { key: "scale-down", label: "Scale down" },
];

const SLIDESHOW_TRANSITIONS = [
  { key: "fade", label: "Fade" },
  { key: "slide", label: "Slide" },
  { key: "zoom", label: "Zoom" },
  { key: "cut", label: "Cut" },
];

const SLIDESHOW_ASPECT_PRESETS = [
  { key: "banner", label: "Banner", width: 1600, height: 300 },
  { key: "wide", label: "16:9", width: 960, height: 540 },
  { key: "square", label: "Square", width: 560, height: 560 },
  { key: "portrait", label: "Portrait", width: 420, height: 720 },
  { key: "strip", label: "Lower third", width: 1200, height: 180 },
];

const SLIDESHOW_COLOR_PRESETS = [
  {
    name: "Ocean",
    patch: {
      frameColor: "#20d8ff",
      accentColor: "#ffb020",
      backgroundColor: "#020817",
    },
  },
  {
    name: "Emerald",
    patch: {
      frameColor: "#34d399",
      accentColor: "#facc15",
      backgroundColor: "#03120c",
    },
  },
  {
    name: "Crimson",
    patch: {
      frameColor: "#fb7185",
      accentColor: "#f97316",
      backgroundColor: "#16040a",
    },
  },
  {
    name: "Violet",
    patch: {
      frameColor: "#a78bfa",
      accentColor: "#22d3ee",
      backgroundColor: "#10051f",
    },
  },
  {
    name: "Gold",
    patch: {
      frameColor: "#facc15",
      accentColor: "#f97316",
      backgroundColor: "#120d04",
    },
  },
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
  {
    key: "inter",
    label: "System Sans",
    stack: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  },
  {
    key: "mono",
    label: "Mono",
    stack: "ui-monospace, 'Courier New', monospace",
  },
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
const BONUS_SKINS = [
  {
    key: "modern",
    label: "Modern",
    swatch: "linear-gradient(135deg,#081228,#45c8ff)",
    hint: "The dark neon tracker - the default look.",
  },
  {
    key: "roman",
    label: "Roman",
    swatch: "linear-gradient(135deg,#120e0a,#c0281c)",
    hint: "Parchment, bronze and laurels - an antiquity reskin of the whole widget.",
  },
  {
    key: "metal",
    label: "Metal",
    swatch: "linear-gradient(135deg,#12151a,#888d98)",
    hint: "Brushed gunmetal steel - real metal textures, no lines.",
  },
  {
    key: "cyberpunk",
    label: "Cyber",
    swatch: "linear-gradient(135deg,#ff2bd6,#00d9ff)",
    hint: "Retro neon - magenta, cyan, CRT scanlines and synthwave glow.",
  },
  {
    key: "spartan",
    label: "Spartan",
    swatch: "linear-gradient(135deg,#8a1010,#c8a030)",
    hint: "Dark chain mail, blood-red accents and gold casino trim.",
  },
  {
    key: "bloody",
    label: "Bloody",
    swatch: "linear-gradient(135deg,#080101,#ff2030)",
    hint: "Battle-torn armor with sword blades, shields, helmets and blood spatter.",
  },
];
const BONUS_SESSION_STATES = [
  {
    key: "hunt",
    label: "Hunt",
    hint: "Carousel rotates through queued bonuses",
  },
  {
    key: "opening",
    label: "Opening",
    hint: "Locks onto the next unopened bonus",
  },
  { key: "ended", label: "Ended", hint: "Freezes on the final hunt layout" },
];

const BACKGROUND_PRESETS = [
  {
    id: "midnight",
    name: "Midnight Mesh",
    patch: {
      color1: "#020611",
      color2: "#0a84ff",
      color3: "#f97316",
      texture: "aurora",
      animSpeed: 10,
    },
  },
  {
    id: "emerald",
    name: "Emerald Smoke",
    patch: {
      color1: "#03120c",
      color2: "#10b981",
      color3: "#d9f99d",
      texture: "nebula",
      animSpeed: 13,
    },
  },
  {
    id: "violet",
    name: "Violet Glow",
    patch: {
      color1: "#0b0418",
      color2: "#8b5cf6",
      color3: "#22d3ee",
      texture: "diagonal",
      animSpeed: 9,
    },
  },
  {
    id: "gold",
    name: "Gold Room",
    patch: {
      color1: "#0d0a03",
      color2: "#b7791f",
      color3: "#fbbf24",
      texture: "grid",
      animSpeed: 14,
    },
  },
];

const BASE_BETTER_CONFIG = {
  tournament: {
    layout: "grid",
    showBg: true,
    panelHi: "#0c1c40",
    bgColor: "#0a1734",
    panelLo: "#081228",
    borderColor: "#2f63c9",
    borderRadius: 20,
    borderWidth: 1,
    mainCardPadding: 14,
    mainShadowColor: "#020617",
    mainShadowBlur: 36,
    mainShadowOpacity: 65,
    mainGlow: 18,
    mainBackdropBlur: 0,
    containerPadding: 8,
    cardGap: 8,
    cardBg: "#0d2049",
    cardBorder: "#2f63c9",
    cardRadius: 14,
    cardBorderWidth: 1,
    nameColor: "#eef6ff",
    multiColor: "#45c8ff",
    slotNameColor: "#6d8cc4",
    nameSize: 16,
    multiSize: 18,
    slotNameSize: 12,
    fontFamily: "'Rajdhani', sans-serif",
    showSlotName: true,
    slotImageRadius: 10,
    swordSize: 24,
    swordColor: "#45c8ff",
    swordBg: "#071022",
    xIconColor: "#ef4444",
    xIconBg: "#1f1420",
    activeStatusColor: "#45c8ff",
    statusBadgeBg: "#0a1836",
    scoreNeutralColor: "#9dbdf2",
    scoreNegativeColor: "#ef4444",
    eliminatedOpacity: 0.35,
    tournamentTitle: "Tournament",
    bracketName: "Tournament",
    bracketType: "bonus_bo3",
    bracketPlayerCount: 8,
    bracketPlayers: [],
    bracketData: [],
    bracketPhase: "setup",
    data: { matches: [], currentMatchIdx: 0 },
  },
  bonus_hunt: {
    displayStyle: "better_bonus_hunt",
    colour: "ocean",
    finish: "flat",
    skin: "modern",
    orientation: "vertical",
    sessionState: "hunt",
    carouselMode: "3d",
    listMode: "compact",
    requestView: "list",
    drawerMode: "contain",
    drawerAlwaysVisible: false,
    drawerRevealSeconds: 30,
    drawerHoldSeconds: 15,
    statsLayout: "row",
    showRequests: true,
    animations: false,
    requestActionAnimations: false,
    animSpeed: 1,
    carouselMs: 3200,
    font: "rajdhani",
    fontFamily: "'Rajdhani', sans-serif",
    uiScale: 1,
    barHeight: 6,
    avatarSize: 28,
    visibleRows: 5,
    widgetWidth: 0,
    widgetHeight: 0,
    edgeRadius: 14,
    statRadius: 7,
    panelWidth: 402,
    panelHeight: 0,
    radius: 14,
    headerAccent: "#20d8ff",
    accentColor: "#20d8ff",
    headerColor: "#061126",
    bgColor: "#061126",
    listCardColor: "rgba(32,216,255,0.07)",
    cardRadius: 18,
    fontSize: 13,
  },
  giveaway: {
    displayStyle: "better_giveaway",
    title: "Giveaway #1",
    prize: "10$ MBway",
    subtitle: "(min 30 Participants)",
    keyword: "iseca",
    surface: "matte",
    hue: 195,
    hueShift: 10,
    saturation: 88,
    lightness: 7,
    accentSat: 96,
    accentLight: 58,
    panelHi: "#0c1c40",
    panelLo: "#081228",
    cardHi: "#0d2049",
    cardLo: "#0a1836",
    lineColor: "#2f63c9",
    accentColor: "#45c8ff",
    deepAccentColor: "#1e5ad6",
    bgColor: "#0a1734",
    textColor: "#eef6ff",
    mutedColor: "#6d8cc4",
    secondaryTextColor: "#9dbdf2",
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
    glow: 30,
    innerGlow: 35,
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
    textGlow: 30,
    italicPrize: true,
    uppercaseLabels: true,
  },
  navbar: {
    displayStyle: "better_navbar",
    streamerName: "BRUTUSPOLUS",
    twitchUsername: "",
    kickChannelId: "",
    youtubeChannel: "",
    avatarUrl: "",
    motto: "www.brutuspolus.com",
    brandName: "",
    siteUrl: "",
    showAvatar: false,
    showClock: false,
    showNowPlaying: true,
    showCTA: false,
    showCasino: true,
    showStartBalance: true,
    showCrypto: false,
    showSocials: false,
    ctaText: "Be Gamble Aware!",
    ctaColor: "#ffb020",
    startLabel: "Start",
    startValue: "€2000",
    startBalance: 2000,
    balanceCurrency: "€",
    casinoName: "",
    casinoCommand: "!Casino",
    casinoLogoUrl: "",
    casinoImageSize: 100,
    nowPlayingLabel: "Now Playing",
    musicSource: "spotify",
    musicDisplayStyle: "pill",
    spotifyWidth: 420,
    cryptoDisplayMode: "horizontal",
    socialDisplayStyle: "handles",
    sectionLayout: [
      { id: "identity", zone: "left" },
      { id: "badge", zone: "left" },
      { id: "clock", zone: "center" },
      { id: "nowPlaying", zone: "center" },
      { id: "crypto", zone: "right" },
      { id: "socials", zone: "right" },
      { id: "cta", zone: "right" },
      { id: "balance", zone: "right" },
      { id: "casino", zone: "right" },
    ],
    xUsername: "",
    instagramUsername: "",
    discordUrl: "",
    tiktokUsername: "",
    accentColor: "#20d8ff",
    accentBlue: "#1385e9",
    accentGold: "#ffb020",
    bgColor: "#061126",
    textColor: "#f8fafc",
    mutedColor: "#8baacf",
    barHeight: 52,
    borderWidth: 1,
    borderRadius: 12,
    radius: 12,
    maxWidth: 1920,
    [BETTER_NAVBAR_OPTIONAL_CASINO_COMMAND_MARKER]: true,
    [BETTER_NAVBAR_MANUAL_CASINO_COMMAND_MARKER]: true,
  },
  chat: {
    chatStyle: "better_chat",
    width: BETTER_CHAT_DEFAULT_SIZE.width,
    height: BETTER_CHAT_DEFAULT_SIZE.height,
    font: "Arial, Helvetica, sans-serif",
    fontSize: 12,
    usernameSize: 12,
    glow: "#45c8ff",
    username: "#45c8ff",
    text: "#eef6ff",
    bubble: "#0d2049",
    panel: "#0a1734",
    panelHi: "#0c1c40",
    panelLo: "#081228",
    cardLo: "#0a1836",
    borderColor: "#2f63c9",
    animation: "slide-up",
    flow: "bottom-to-top",
    stagger: 120,
    entry: "bottom",
    autoFade: false,
    lifespan: "persistent",
    fadeAfter: 6,
    maxMessages: 10,
    live: false,
    showHeaderName: true,
    showLiveLabel: true,
    showViewerCount: false,
    viewerCount: 1250,
    bttvEnabled: true,
    bttvGlobal: true,
    bttvChannel: true,
    bttvSize: 2,
    bg: "solid",
    texture: "none",
    textureStrength: 30,
    celebrations: {
      raid: true,
      sub: true,
      gift: true,
      intensity: 5,
    },
    showRoleBadges: true,
    roleEffects: {
      enabled: true,
      ownerEnabled: true,
      ownerMovementEnabled: true,
      moderatorEnabled: true,
      moderatorMovementEnabled: true,
      vipEnabled: true,
      vipMovementEnabled: true,
      subscriberEnabled: true,
      subscriberMovementEnabled: true,
      intensity: 8,
      ownerColor: "#ff3b5c",
      moderatorColor: "#22d3ee",
      vipColor: "#c084fc",
      subscriberColor: "#facc15",
      raidColor: "#ff2d8d",
    },
    shoutoutInChat: false,
    shoutoutPosition: "top",
    shoutoutHeight: 180,
    shoutoutDuration: 45,
    shoutoutDismissOnClipEnd: false,
    showEmptyState: true,
    emptyMessage: BETTER_CHAT_EMPTY_MESSAGE,
  },
  rtp_stats: {
    displayStyle: "better_rtp",
    providerMode: "name",
    logoFit: "contain",
    logoHeight: 30,
    logoMaxW: 160,
    logoPadX: 0,
    logoPadY: 0,
    logoOffsetX: 0,
    logoOffsetY: 0,
    showEmblem: true,
    showDividers: true,
    showRtp: true,
    showPotential: true,
    showVolatility: true,
    showBestWin: true,
    cRim: "#1385e9",
    cBarTop: "#0a2140",
    cBarMid: "#07182f",
    cBarBot: "#061126",
    cLabel: "#8baacf",
    cValue: "#ffffff",
    cBolt: "#ffb020",
    cGold: "#ffb020",
    cBrand: "#8baacf",
    cEmA: "#20d8ff",
    cEmB: "#ffb020",
    cEmBase: "#0a1a33",
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
    color2: "#1385e9",
    color3: "#20d8ff",
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
  slideshow_frame: {
    displayStyle: "better_slideshow_frame",
    mediaText: "",
    frameStyle: "neon",
    frameColor: "#2f63c9",
    accentColor: "#45c8ff",
    backgroundColor: "#0a1734",
    panelHi: "#0c1c40",
    panelLo: "#081228",
    fit: "cover",
    transition: "fade",
    slideMs: 5000,
    transitionMs: 650,
    autoplay: true,
    videoMuted: true,
    videoLoop: true,
    showVideoControls: false,
    showCounter: false,
    showConnectFour: false,
    radius: 12,
    borderWidth: 1,
    padding: 8,
    glow: 35,
    aspectPreset: "banner",
  },
  bets: {
    displayStyle: "better_bets",
    theme: "neon",
    font: "cyber",
    fontScale: 100,
    borderRadius: 8,
    glowIntensity: 62,
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
  connect_four: {
    displayStyle: "chat_connect_four",
    title: "CHAT CONNECT 4",
    playerOneColor: "#facc15",
    playerTwoColor: "#ef4444",
    boardColor: "#1e3a8a",
    boardBorderColor: "#1e3a8a",
    titleColor: "#fbbf24",
    textColor: "#f7fbff",
    mutedColor: "#fff2b8",
    fontFamily: "'Rajdhani', sans-serif",
    boardScale: 84,
    showWager: true,
    showPlayers: true,
    animateDrops: true,
    chatCommand: "!c4",
    twitchChannel: "",
  },
  raid_shoutout: {
    displayStyle: "better_raid_shoutout",
  },
};

export const DEFAULT_BETTER_CONFIG = Object.freeze(
  Object.fromEntries(
    Object.entries(BASE_BETTER_CONFIG).map(([widgetType, config]) => [
      widgetType,
      {
        ...config,
        ...STANDARD_BETTER_WIDGET_CONTROLS[widgetType],
      },
    ]),
  ),
);

export const BETTER_WIDGETS = [
  {
    type: "connect_four",
    label: "Chat Connect 4",
    styleKey: "displayStyle",
    styleId: "chat_connect_four",
    icon: "4",
    defaultSize: {
      width: STANDARD_BETTER_WIDGET_GEOMETRY.connect_four.width,
      height: STANDARD_BETTER_WIDGET_GEOMETRY.connect_four.height,
    },
  },
  {
    type: "raid_shoutout",
    label: "Twitch Shoutout",
    styleKey: "displayStyle",
    styleId: "better_raid_shoutout",
    icon: "📣",
    defaultSize: {
      width: STANDARD_BETTER_WIDGET_GEOMETRY.raid_shoutout.width,
      height: STANDARD_BETTER_WIDGET_GEOMETRY.raid_shoutout.height,
    },
  },
  {
    type: "slideshow_frame",
    label: "Slideshow Frame",
    styleKey: "displayStyle",
    styleId: "better_slideshow_frame",
    icon: "🎞️",
    defaultSize: {
      width: STANDARD_BETTER_WIDGET_GEOMETRY.slideshow_frame.width,
      height: STANDARD_BETTER_WIDGET_GEOMETRY.slideshow_frame.height,
    },
  },
  {
    type: "tournament",
    label: "Tournament",
    styleKey: "layout",
    styleId: "grid",
    icon: "🏆",
    defaultSize: {
      width: STANDARD_BETTER_WIDGET_GEOMETRY.tournament.width,
      height: STANDARD_BETTER_WIDGET_GEOMETRY.tournament.height,
    },
  },
  {
    type: "bonus_hunt",
    label: "Better Hunt",
    styleKey: "displayStyle",
    styleId: "better_bonus_hunt",
    icon: "🎯",
    defaultSize: {
      width: STANDARD_BETTER_WIDGET_GEOMETRY.bonus_hunt.width,
      height: STANDARD_BETTER_WIDGET_GEOMETRY.bonus_hunt.height,
    },
  },
  {
    type: "giveaway",
    label: "Better Giveaway",
    styleKey: "displayStyle",
    styleId: "better_giveaway",
    icon: "🎁",
    defaultSize: {
      width: STANDARD_BETTER_WIDGET_GEOMETRY.giveaway.width,
      height: STANDARD_BETTER_WIDGET_GEOMETRY.giveaway.height,
    },
  },
  {
    type: "navbar",
    label: "Better Navbar",
    styleKey: "displayStyle",
    styleId: "better_navbar",
    icon: "🧭",
    defaultSize: {
      width: STANDARD_BETTER_WIDGET_GEOMETRY.navbar.width,
      height: STANDARD_BETTER_WIDGET_GEOMETRY.navbar.height,
    },
  },
  {
    type: "chat",
    label: "Better Chat",
    styleKey: "chatStyle",
    styleId: "better_chat",
    icon: "💬",
    defaultSize: {
      width: STANDARD_BETTER_WIDGET_GEOMETRY.chat.width,
      height: STANDARD_BETTER_WIDGET_GEOMETRY.chat.height,
    },
  },
  {
    type: "rtp_stats",
    label: "Better RTP Stats",
    styleKey: "displayStyle",
    styleId: "better_rtp",
    icon: "📖",
    defaultSize: {
      width: STANDARD_BETTER_WIDGET_GEOMETRY.rtp_stats.width,
      height: STANDARD_BETTER_WIDGET_GEOMETRY.rtp_stats.height,
    },
  },
  {
    type: "background",
    label: "Better Background",
    styleKey: "displayStyle",
    styleId: "better_background",
    icon: "🖼️",
    defaultSize: {
      width: STANDARD_BETTER_WIDGET_GEOMETRY.background.width,
      height: STANDARD_BETTER_WIDGET_GEOMETRY.background.height,
    },
  },
  {
    type: "bets",
    label: "Better Bets",
    styleKey: "displayStyle",
    styleId: "better_bets",
    icon: "💎",
    defaultSize: {
      width: STANDARD_BETTER_WIDGET_GEOMETRY.bets.width,
      height: STANDARD_BETTER_WIDGET_GEOMETRY.bets.height,
    },
  },
];

export function getBetterWidgetMeta(type) {
  return BETTER_WIDGETS.find((item) => item.type === type) || null;
}

function normalizeBetterNavbarConfig(config = {}, merged = {}) {
  const defaults = DEFAULT_BETTER_CONFIG.navbar;
  const originalCasinoCommand = String(config.casinoCommand || "").trim();
  const normalizedCasinoCommand = String(merged.casinoCommand || "").trim();
  const isLegacyCasinoCommand =
    normalizedCasinoCommand.toLowerCase() === LEGACY_CASINO_COMMAND;
  const hasManualCasinoCommand =
    config[BETTER_NAVBAR_MANUAL_CASINO_COMMAND_MARKER] === true ||
    (normalizedCasinoCommand &&
      normalizedCasinoCommand.toLowerCase() !== LEGACY_CASINO_COMMAND &&
      originalCasinoCommand === normalizedCasinoCommand);
  const next = {
    ...merged,
    betterNavbarFeaturesInitialized: true,
    [BETTER_NAVBAR_SPOTIFY_ONLY_MARKER]: true,
    [BETTER_NAVBAR_OPTIONAL_CASINO_MARKER]: true,
    [BETTER_NAVBAR_OPTIONAL_CASINO_COMMAND_MARKER]: true,
    [BETTER_NAVBAR_MANUAL_CASINO_COMMAND_MARKER]: hasManualCasinoCommand,
  };

  if (
    config.betterNavbarFeaturesInitialized !== true ||
    config[BETTER_NAVBAR_SPOTIFY_ONLY_MARKER] !== true
  ) {
    Object.assign(next, {
      showAvatar: false,
      showClock: false,
      showNowPlaying: true,
      showCTA: false,
      showCasino: true,
      showStartBalance: true,
    });
  }

  Object.assign(next, {
    musicSource: "spotify",
  });

  delete next.nowPlaying;
  delete next.manualArtist;
  delete next.manualTrack;
  delete next.manualAlbum;
  delete next.manualCoverUrl;
  delete next.manualAlbumArt;
  delete next.manualMusicLink;
  delete next.musicFallbackMessage;

  if (config[BETTER_NAVBAR_OPTIONAL_CASINO_MARKER] !== true) {
    if (
      String(next.casinoName || "")
        .trim()
        .toLowerCase() === "casino"
    ) {
      next.casinoName = "";
    }
    if (
      String(next.casinoCommand || "")
        .trim()
        .toLowerCase() === LEGACY_CASINO_COMMAND
    ) {
      next.casinoCommand = "";
    }
  }
  if (
    (config[BETTER_NAVBAR_OPTIONAL_CASINO_COMMAND_MARKER] !== true ||
      !hasManualCasinoCommand) &&
    String(next.casinoCommand || "")
      .trim()
      .toLowerCase() === LEGACY_CASINO_COMMAND
  ) {
    next.casinoCommand = "";
  }
  if (
    !next.startValue &&
    (config.startValue === undefined || config.startValue === null)
  ) {
    next.startValue = defaults.startValue;
  }
  if (!next.casinoCommand && next.showCasino !== false) {
    next.casinoCommand = defaults.casinoCommand;
    next[BETTER_NAVBAR_MANUAL_CASINO_COMMAND_MARKER] = true;
  } else if (!next.casinoCommand) {
    next[BETTER_NAVBAR_MANUAL_CASINO_COMMAND_MARKER] = false;
  }

  if (!next.streamerName && !next.brandName)
    next.streamerName = defaults.streamerName;
  if (!next.ctaText) next.ctaText = defaults.ctaText;
  next.sectionLayout = normalizeBetterNavbarSectionLayout(next.sectionLayout);
  next.maxWidth = Math.min(
    Math.max(Number(next.maxWidth) || defaults.maxWidth || 1920, 720),
    1920,
  );
  if (
    next.casinoImageSize === undefined ||
    next.casinoImageSize === null ||
    next.casinoImageSize === ""
  ) {
    next.casinoImageSize = defaults.casinoImageSize;
  }
  if (
    next.startBalance === undefined ||
    next.startBalance === null ||
    next.startBalance === ""
  ) {
    next.startBalance = defaults.startBalance;
  }
  if (!next.balanceCurrency) next.balanceCurrency = defaults.balanceCurrency;
  return next;
}

function normalizeBetterRtpConfig(merged = {}) {
  const next = { ...merged };
  BETTER_RTP_LIVE_CONTENT_KEYS.forEach((key) => {
    delete next[key];
  });
  return next;
}

function normalizeBetterSlideshowConfig(merged = {}) {
  const defaults = DEFAULT_BETTER_CONFIG.slideshow_frame;
  const next = { ...merged };
  if (!SLIDESHOW_FRAME_STYLES.some((item) => item.key === next.frameStyle)) {
    next.frameStyle = defaults.frameStyle;
  }
  if (!SLIDESHOW_FITS.some((item) => item.key === next.fit)) {
    next.fit = defaults.fit;
  }
  if (!SLIDESHOW_TRANSITIONS.some((item) => item.key === next.transition)) {
    next.transition = defaults.transition;
  }
  if (
    next.aspectPreset !== "custom" &&
    !SLIDESHOW_ASPECT_PRESETS.some((item) => item.key === next.aspectPreset)
  ) {
    next.aspectPreset = defaults.aspectPreset;
  }
  if (typeof next.mediaText !== "string") next.mediaText = "";
  next.slideMs = clampNumber(next.slideMs, 1000, 60000, defaults.slideMs);
  next.transitionMs = clampNumber(
    next.transitionMs,
    0,
    Math.max(0, Math.min(2500, next.slideMs - 100)),
    defaults.transitionMs,
  );
  next.radius = clampNumber(next.radius, 0, 80, defaults.radius);
  next.borderWidth = clampNumber(next.borderWidth, 0, 10, defaults.borderWidth);
  next.padding = clampNumber(next.padding, 0, 60, defaults.padding);
  next.glow = clampNumber(next.glow, 0, 160, defaults.glow);
  next.autoplay = next.autoplay !== false;
  next.videoMuted = next.videoMuted !== false;
  next.videoLoop = next.videoLoop !== false;
  next.showVideoControls = next.showVideoControls === true;
  next.showCounter = next.showCounter === true;
  next.showConnectFour = next.showConnectFour === true;
  return next;
}

function normalizeBetterChatConfig(merged = {}) {
  const defaults = DEFAULT_BETTER_CONFIG.chat;
  const next = {
    ...merged,
    celebrations: Object.assign({}, defaults.celebrations, merged.celebrations),
    roleEffects: Object.assign({}, defaults.roleEffects, merged.roleEffects),
  };
  const legacyFlow = next.entry === "top" ? "top-to-bottom" : defaults.flow;
  if (!["bottom-to-top", "top-to-bottom"].includes(next.flow)) {
    next.flow = legacyFlow;
  }
  next.entry = next.flow === "top-to-bottom" ? "top" : "bottom";
  if (typeof next.autoFade !== "boolean") {
    next.autoFade = next.lifespan === "timed";
  }
  next.lifespan = next.autoFade ? "timed" : "persistent";
  if (
    ![
      "slide-up",
      "slide-down",
      "slide-left",
      "slide-right",
      "fade",
      "none",
    ].includes(next.animation)
  ) {
    next.animation = defaults.animation;
  }
  next.maxMessages = clampNumber(next.maxMessages, 2, 40, defaults.maxMessages);
  next.fadeAfter = clampNumber(next.fadeAfter, 2, 15, defaults.fadeAfter);
  next.stagger = clampNumber(next.stagger, 0, 400, defaults.stagger);
  next.showHeaderName = next.showHeaderName !== false;
  next.showLiveLabel = next.showLiveLabel !== false;
  next.showEmptyState = next.showEmptyState !== false;
  next.bttvEnabled = next.bttvEnabled !== false;
  next.bttvGlobal = next.bttvGlobal !== false;
  next.bttvChannel = next.bttvChannel !== false;
  next.bttvSize = clampNumber(next.bttvSize, 1, 3, defaults.bttvSize);
  next.viewerCount = clampNumber(
    next.viewerCount,
    0,
    100000,
    defaults.viewerCount,
  );
  next.textureStrength = clampNumber(
    next.textureStrength,
    5,
    80,
    defaults.textureStrength,
  );
  next.celebrations.intensity = clampNumber(
    next.celebrations.intensity,
    1,
    10,
    defaults.celebrations.intensity,
  );
  next.showRoleBadges = next.showRoleBadges !== false;
  next.roleEffects.enabled = next.roleEffects.enabled !== false;
  next.roleEffects.ownerEnabled = next.roleEffects.ownerEnabled !== false;
  next.roleEffects.ownerMovementEnabled =
    next.roleEffects.ownerMovementEnabled !== false;
  next.roleEffects.moderatorEnabled =
    next.roleEffects.moderatorEnabled !== false;
  next.roleEffects.moderatorMovementEnabled =
    next.roleEffects.moderatorMovementEnabled !== false;
  next.roleEffects.vipEnabled = next.roleEffects.vipEnabled !== false;
  next.roleEffects.vipMovementEnabled =
    next.roleEffects.vipMovementEnabled !== false;
  next.roleEffects.subscriberEnabled =
    next.roleEffects.subscriberEnabled !== false;
  next.roleEffects.subscriberMovementEnabled =
    next.roleEffects.subscriberMovementEnabled !== false;
  next.roleEffects.intensity = clampNumber(
    next.roleEffects.intensity,
    1,
    10,
    defaults.roleEffects.intensity,
  );
  next.shoutoutInChat = next.shoutoutInChat === true;
  next.shoutoutPosition = next.shoutoutPosition === "bottom" ? "bottom" : "top";
  next.shoutoutHeight = clampNumber(
    next.shoutoutHeight,
    120,
    360,
    defaults.shoutoutHeight,
  );
  next.shoutoutDuration = clampNumber(
    next.shoutoutDuration,
    10,
    120,
    defaults.shoutoutDuration,
  );
  next.shoutoutDismissOnClipEnd = next.shoutoutDismissOnClipEnd === true;
  return next;
}

export function ensureBetterWidgetConfig(type, config = {}) {
  const meta = getBetterWidgetMeta(type);
  const defaults = DEFAULT_BETTER_CONFIG[type] || {};
  const merged = {
    ...defaults,
    ...config,
    ...(meta && type !== "tournament" ? { [meta.styleKey]: meta.styleId } : {}),
  };
  if (type === "navbar") return normalizeBetterNavbarConfig(config, merged);
  if (type === "rtp_stats") return normalizeBetterRtpConfig(merged);
  if (type === "chat") return normalizeBetterChatConfig(merged);
  if (type === "slideshow_frame") return normalizeBetterSlideshowConfig(merged);
  return merged;
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

function betLabel(option, index) {
  return typeof option === "string"
    ? option
    : option?.label || `Set ${index + 1}`;
}

function useTab(defaultTab) {
  return useState(defaultTab);
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(number, min), max);
}

function Section({ title, icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="bp-section">
      <button
        className="bp-section__head"
        type="button"
        onClick={() => setOpen((value) => !value)}
      >
        <span>
          {icon}
          {title}
        </span>
        <ChevronDown size={14} className={open ? "is-open" : ""} />
      </button>
      {open && <div className="bp-section__body">{children}</div>}
    </section>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
  disabled = false,
  format,
}) {
  const pct = ((Number(value) - min) / (max - min)) * 100;
  const displayValue =
    typeof format === "function" ? format(Number(value)) : `${value}${unit}`;
  return (
    <label className={`bp-slider${disabled ? " is-disabled" : ""}`}>
      <span>
        <em>{label}</em>
        <strong>{displayValue}</strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{
          background: `linear-gradient(90deg, #00c3ff ${pct}%, #0a2547 ${pct}%)`,
        }}
      />
    </label>
  );
}

function ToggleRow({ label, checked, onChange, hint }) {
  return (
    <button
      className={`bp-toggle${checked ? " is-on" : ""}`}
      type="button"
      onClick={() => onChange(!checked)}
    >
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
      <input
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function TextRow({ label, value, onChange }) {
  return (
    <label className="bp-text">
      <span>{label}</span>
      <input
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function TextAreaRow({ label, value, onChange, rows = 6, placeholder = "" }) {
  return (
    <label className="bp-text bp-text--textarea">
      <span>{label}</span>
      <textarea
        rows={rows}
        value={value || ""}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SelectRow({ label, value, options, onChange }) {
  return (
    <label className="bp-text">
      <span>{label}</span>
      <select
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option
            key={option.value || option.key}
            value={option.value || option.key}
          >
            {option.label || option.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function Segmented({ value, options, onChange, columns = 2 }) {
  return (
    <div
      className="bp-segmented"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
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

function HuntChoiceGrid({
  value,
  options,
  onChange,
  columns = 2,
  disabled = false,
}) {
  return (
    <div
      className="bp-hunt-choice-grid"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const optionValue = option.value || option.key;
        return (
          <button
            key={optionValue}
            type="button"
            className={optionValue === value ? "is-active" : ""}
            disabled={disabled}
            onClick={() => {
              if (!disabled && typeof onChange === "function")
                onChange(optionValue);
            }}
          >
            {option.swatch && <i style={{ background: option.swatch }} />}
            <strong>{option.label || option.name}</strong>
            {option.hint && <span>{option.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}

function HuntHint({ children }) {
  return <p className="bp-hunt-control-hint">{children}</p>;
}

function HuntSection({ title, icon, children }) {
  return (
    <section className="bp-hunt-section">
      <h4>
        {icon}
        {title}
      </h4>
      <div className="bp-hunt-section__body">{children}</div>
    </section>
  );
}

function normalizeBetFillStyle(fillStyle) {
  return ["liquid", "solid", "pulse", "scanline", "plasma"].includes(fillStyle)
    ? fillStyle
    : "liquid";
}

function BetterBetsPreviewFill({ fillStyle }) {
  return (
    <span className={`fill-wrap fill-${fillStyle}`}>
      <span className="solid-bar" />
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

function BetterBetsPreviewBarFill({ fillStyle }) {
  return (
    <span className={`bf bf-${fillStyle}`}>
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

function BetterBetsPreview({ config }) {
  const c = ensureBetterWidgetConfig("bets", config);
  const fillStyle = normalizeBetFillStyle(c.fillStyle);
  const options =
    Array.isArray(c.options) && c.options.length
      ? c.options.slice(0, 6)
      : [
          "0 - 99",
          "100 - 199",
          "200 - 299",
          "300 - 399",
          "400 - 499",
          "500 - 599",
        ];
  const bets = c.bets || {};
  const totalPool = options.reduce(
    (sum, _, index) => sum + (Number(bets[`opt_${index}`]) || 0),
    0,
  );
  const totalBets = Object.keys(c.betters || {}).length;
  const colors =
    Array.isArray(c.cardColors) && c.cardColors.length >= 6
      ? c.cardColors
      : DEFAULT_CARD_COLORS;
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
    <div
      className="bp-bets-stage"
      data-theme={c.theme}
      data-font={c.font}
      data-fill={fillStyle}
      style={cssVars}
    >
      <section
        className={`bet-widget${!c.showBrackets ? " hide-brackets" : ""}${!c.showSheen ? " hide-sheen" : ""}${c.orientation === "horizontal" ? " is-horizontal" : ""}`}
        data-cols={Number(c.columns) || 2}
      >
        <div className="widget-sheen" />
        <header className="widget-header">
          <div className="title-lockup">
            <span className="title-mark" />
            <h1>{c.question || "Place Your Bets"}</h1>
          </div>
          <span className="open-status">
            <i /> {String(c.gameStatus || "OPEN").toUpperCase()}
          </span>
        </header>
        <div className="event-meta">
          <div className="meta-item">
            <strong>{formatMoney(totalPool, "")}</strong>
            <span>
              <Coins size={10} /> Pool
            </span>
          </div>
          <div className="meta-item">
            <strong>{c.countdown ? `${c.countdown}s` : "0:00"}</strong>
            <span>
              <Timer size={10} /> Timer
            </span>
          </div>
          <div className="meta-item">
            <strong>{totalBets}</strong>
            <span>
              <Users size={10} /> Bets
            </span>
          </div>
        </div>
        <div className={c.layoutMode === "bars" ? "bars-grid" : "bets-grid"}>
          {options.map((option, index) => {
            const pct = values[index];
            const cc = colors[index % colors.length];
            return c.layoutMode === "bars" ? (
              <button
                key={index}
                className="bet-bar"
                type="button"
                style={{
                  "--fill": `${pct}%`,
                  "--accent": cc.accent,
                  "--accent-2": cc.accent2,
                }}
              >
                <span className="bar-num">{index + 1}</span>
                <span className="bar-range">{betLabel(option, index)}</span>
                <span className="bar-track">
                  <BetterBetsPreviewBarFill fillStyle={fillStyle} />
                </span>
                <span className="bar-pct">{pct}%</span>
              </button>
            ) : (
              <button
                key={index}
                className="bet-option"
                type="button"
                style={{
                  "--fill": `${pct}%`,
                  "--accent": cc.accent,
                  "--accent-2": cc.accent2,
                }}
              >
                <BetterBetsPreviewFill fillStyle={fillStyle} />
                <span className="option-scrim" />
                <span className="option-number">{index + 1}</span>
                <span className="option-range">{betLabel(option, index)}</span>
                <span className="option-details">
                  <strong>{pct}%</strong>
                  <small>Set {index + 1}</small>
                </span>
                <span className="option-glint" />
              </button>
            );
          })}
        </div>
        <div className="bet-entry">
          <span>&gt;&gt;&gt;</span>
          <input
            readOnly
            placeholder={`Type ${c.chatCommand || "!bet"} number to bet`}
          />
          <kbd>Enter</kbd>
        </div>
      </section>
    </div>
  );
}

function BetterChatPreview({ config, widget }) {
  const c = ensureBetterWidgetConfig("chat", config);
  const width = clampNumber(
    c.width ?? widget?.width,
    150,
    900,
    BETTER_CHAT_DEFAULT_SIZE.width,
  );
  const height = clampNumber(
    c.height ?? widget?.height,
    150,
    900,
    BETTER_CHAT_DEFAULT_SIZE.height,
  );
  const sourceMessages =
    Array.isArray(c.previewMessages) && c.previewMessages.length
      ? c.previewMessages
      : [
          {
            id: "better-chat-preview-raid",
            platform: "twitch",
            username: "RaidLeader",
            message: "RAID CHEGOU! 50 pessoas!",
            type: "raid",
            isRaid: true,
            raidViewers: 50,
            color: c.glow,
          },
          {
            id: "better-chat-preview-sub",
            platform: "twitch",
            username: "LoyalSub",
            message: "Acabei de assinar! PogChamp",
            type: "sub",
            isSub: true,
            color: c.username,
          },
          {
            id: "better-chat-preview-owner",
            platform: "twitch",
            username: "ChannelOwner",
            message: "Welcome to the stream!",
            isBroadcaster: true,
            color: c.roleEffects?.ownerColor,
          },
          {
            id: "better-chat-preview-vip",
            platform: "twitch",
            username: "CommunityVIP",
            message: "That was a huge win!",
            isVip: true,
            color: c.roleEffects?.vipColor,
          },
          {
            id: "better-chat-preview-gift",
            platform: "twitch",
            username: "GiftBoss",
            message: "Gifted 5 subs to the chat",
            type: "gift",
            giftCount: 5,
            color: c.glow,
          },
          {
            id: "better-chat-preview-chat",
            platform: "twitch",
            username: "ChatMaster",
            message: "PogChamp esse overlay esta incrivel",
            color: "#7dd3fc",
          },
        ];
  const maxPreviewMessages = clampNumber(c.maxMessages, 2, 40, 10);
  const previewMessages = sourceMessages
    .slice(-maxPreviewMessages)
    .map((message, index) => ({
      id: message.id || `better-chat-preview-${index}`,
      platform: message.platform || "twitch",
      username: message.username || message.user || "viewer",
      message: message.message || message.text || "",
      color: message.color || "",
      type: message.type,
      isRaid: message.isRaid || message.type === "raid",
      isSub: message.isSub || message.type === "sub",
      isBroadcaster: Boolean(message.isBroadcaster),
      isMod: Boolean(message.isMod),
      isVip: Boolean(message.isVip),
      giftCount: message.giftCount || message.metadata?.giftCount || 0,
      metadata: message.metadata || {},
    }));
  return (
    <div className="bp-chat-stage bp-chat-stage--renderer">
      <div style={{ width, height }}>
        <ChatWidget
          key={c.replayNonce || "better-chat-preview"}
          config={{
            ...c,
            twitchEnabled: false,
            youtubeEnabled: false,
            kickEnabled: false,
            __appearancePreviewMessages: previewMessages,
          }}
        />
      </div>
    </div>
  );
}

function BetterNavbarPreview({ config, allWidgets, userId }) {
  const c = ensureBetterWidgetConfig("navbar", config);
  return (
    <div className="bp-navbar-stage bp-navbar-stage--renderer">
      <NavbarWidget config={c} userId={userId} allWidgets={allWidgets} />
    </div>
  );
}

function BetterRtpPreview({ config, allWidgets, userId, widget }) {
  const c = ensureBetterWidgetConfig("rtp_stats", config);
  return (
    <div className="bp-rtp-stage bp-rtp-stage--renderer">
      <RtpStatsWidget
        config={{ ...c, previewMode: true }}
        allWidgets={allWidgets}
        userId={userId}
        widgetId={widget?.id}
      />
    </div>
  );
}

function BetterBackgroundPreview({ config }) {
  const c = ensureBetterWidgetConfig("background", config);
  return <BetterBackgroundStyle config={c} />;
}

function BetterGiveawayPreview({ config }) {
  const c = ensureBetterWidgetConfig("giveaway", config);
  return <BetterGiveawayStyle config={c} />;
}

function BetterBonusHuntPreview({ config, allWidgets, userId, widget }) {
  const c = ensureBetterWidgetConfig("bonus_hunt", config);
  return (
    <div className="bp-hunt-preview-stage">
      <BonusHuntWidget
        config={c}
        allWidgets={allWidgets}
        userId={userId}
        widgetId={widget?.id || widget?.instanceId}
      />
    </div>
  );
}

export function BetterWidgetPreview({
  type,
  config,
  allWidgets,
  userId,
  widget,
}) {
  switch (type) {
    case "tournament":
      return <TournamentWidget config={config} />;
    case "bets":
      return <BetterBetsPreview config={config} />;
    case "chat":
      return <BetterChatPreview config={config} widget={widget} />;
    case "navbar":
      return (
        <BetterNavbarPreview
          config={config}
          allWidgets={allWidgets}
          userId={userId}
        />
      );
    case "rtp_stats":
      return (
        <BetterRtpPreview
          config={config}
          allWidgets={allWidgets}
          userId={userId}
          widget={widget}
        />
      );
    case "background":
      return <BetterBackgroundPreview config={config} />;
    case "giveaway":
      return <BetterGiveawayPreview config={config} />;
    case "bonus_hunt":
      return (
        <BetterBonusHuntPreview
          config={config}
          allWidgets={allWidgets}
          userId={userId}
          widget={widget}
        />
      );
    default:
      return null;
  }
}

const NAVBAR_MUSIC_DISPLAY_OPTIONS = [
  { key: "text", name: "Text" },
  { key: "pill", name: "Pill" },
  { key: "marquee", name: "Marquee" },
  { key: "albumart", name: "Album art" },
  { key: "equalizer", name: "Equalizer" },
  { key: "vinyl", name: "Vinyl" },
  { key: "minimal", name: "Minimal" },
  { key: "wave", name: "Wave" },
];

const NAVBAR_CRYPTO_DISPLAY_OPTIONS = [
  { key: "horizontal", name: "Slide left" },
  { key: "carousel", name: "Slide up" },
  { key: "fade", name: "Fade" },
];

const NAVBAR_CURRENCY_OPTIONS = [
  { value: "€", label: "EUR €" },
  { value: "EUR ", label: "EUR" },
  { value: "$", label: "USD" },
  { value: "GBP ", label: "GBP" },
  { value: "PLN ", label: "PLN" },
];

const BETTER_NAVBAR_DEFAULT_SECTION_LAYOUT = [
  { id: "identity", zone: "left" },
  { id: "badge", zone: "left" },
  { id: "clock", zone: "center" },
  { id: "nowPlaying", zone: "center" },
  { id: "crypto", zone: "right" },
  { id: "socials", zone: "right" },
  { id: "cta", zone: "right" },
  { id: "balance", zone: "right" },
  { id: "casino", zone: "right" },
];

const BETTER_NAVBAR_SECTION_LABELS = {
  identity: "Streamer",
  badge: "Badge",
  clock: "Clock",
  nowPlaying: "Spotify",
  crypto: "Crypto",
  socials: "Socials",
  cta: "CTA",
  balance: "Balance",
  casino: "Casino",
};

const BETTER_NAVBAR_ZONES = [
  { key: "left", label: "Left" },
  { key: "center", label: "Center" },
  { key: "right", label: "Right" },
];

const BETTER_NAVBAR_SECTION_IDS = new Set(
  BETTER_NAVBAR_DEFAULT_SECTION_LAYOUT.map((section) => section.id),
);

function normalizeBetterNavbarSectionLayout(layout) {
  const source = Array.isArray(layout)
    ? layout
    : BETTER_NAVBAR_DEFAULT_SECTION_LAYOUT;
  const normalized = [];
  const seen = new Set();
  source.forEach((section) => {
    if (
      !section ||
      !BETTER_NAVBAR_SECTION_IDS.has(section.id) ||
      seen.has(section.id)
    )
      return;
    const fallback = BETTER_NAVBAR_DEFAULT_SECTION_LAYOUT.find(
      (item) => item.id === section.id,
    );
    normalized.push({
      id: section.id,
      zone: BETTER_NAVBAR_ZONES.some((zone) => zone.key === section.zone)
        ? section.zone
        : fallback?.zone || "right",
    });
    seen.add(section.id);
  });
  BETTER_NAVBAR_DEFAULT_SECTION_LAYOUT.forEach((section) => {
    if (!seen.has(section.id)) normalized.push({ ...section });
  });
  return normalized;
}

function getTwitchIdentity(user) {
  const isTwitch = user?.app_metadata?.provider === "twitch";
  const username =
    user?.user_metadata?.preferred_username ||
    user?.user_metadata?.user_name ||
    "";
  const displayName = user?.user_metadata?.full_name || username;
  const avatarUrl = user?.user_metadata?.avatar_url || "";
  return { isTwitch, username, displayName, avatarUrl };
}

function BetterNavbarControls({
  config,
  onChange,
  user,
  widget,
  onWidgetChange,
}) {
  const c = ensureBetterWidgetConfig("navbar", config);
  const set = (patch) => {
    const nextPatch = { ...patch };
    if (Object.prototype.hasOwnProperty.call(nextPatch, "casinoCommand")) {
      nextPatch[BETTER_NAVBAR_MANUAL_CASINO_COMMAND_MARKER] = true;
    }
    onChange({ ...c, ...nextPatch });
  };
  const sectionLayout = normalizeBetterNavbarSectionLayout(c.sectionLayout);
  const setLayout = (layout) =>
    set({ sectionLayout: normalizeBetterNavbarSectionLayout(layout) });
  const setSectionZone = (sectionId, zone) => {
    setLayout(
      sectionLayout.map((section) =>
        section.id === sectionId ? { ...section, zone } : section,
      ),
    );
  };
  const moveSection = (sectionId, direction) => {
    const index = sectionLayout.findIndex(
      (section) => section.id === sectionId,
    );
    if (index < 0) return;
    const currentSection = sectionLayout[index];
    const step = direction === "up" ? -1 : 1;
    let swapIndex = -1;
    for (
      let nextIndex = index + step;
      nextIndex >= 0 && nextIndex < sectionLayout.length;
      nextIndex += step
    ) {
      if (sectionLayout[nextIndex].zone === currentSection.zone) {
        swapIndex = nextIndex;
        break;
      }
    }
    if (swapIndex < 0) return;
    const nextLayout = [...sectionLayout];
    const [section] = nextLayout.splice(index, 1);
    nextLayout.splice(swapIndex, 0, section);
    setLayout(nextLayout);
  };
  const commitWidgetSize = (patch) => {
    const width = clampNumber(
      patch.width ?? widget?.width,
      720,
      1920,
      widget?.width || 1200,
    );
    const height = clampNumber(
      patch.height ?? widget?.height,
      46,
      160,
      widget?.height || c.barHeight || 72,
    );
    const nextConfig = {
      ...c,
      width,
      height,
      barHeight: Math.min(
        Math.max(Number(c.barHeight) || 52, 42),
        Math.max(42, height),
      ),
      maxWidth: width,
    };
    if (onWidgetChange) {
      onWidgetChange({ width, height, config: nextConfig });
    } else {
      onChange(nextConfig);
    }
  };
  const [tab, setTab] = useTab("sections");
  const tabs = [
    ["sections", <Layers size={12} />, "Sections"],
    ["arrange", <SlidersHorizontal size={12} />, "Arrange"],
    ["music", <Music size={12} />, "Music"],
    ["crypto", <Coins size={12} />, "Crypto"],
    ["socials", <Users size={12} />, "Socials"],
    ["casino", <Coins size={12} />, "Casino"],
    ["cta", <Zap size={12} />, "CTA"],
    ["size", <Maximize2 size={12} />, "Size"],
    ["style", <Palette size={12} />, "Style"],
  ];
  const current = tabs.some(([key]) => key === tab) ? tab : "sections";

  return (
    <div className="bp-controls bp-controls--navbar">
      <PanelTabs active={current} onChange={setTab} tabs={tabs} />

      {current === "sections" && (
        <>
          <Section title="Visible sections" icon={<Layers size={13} />}>
            <ToggleRow
              label="Streamer block"
              checked={c.showIdentity !== false}
              onChange={(showIdentity) => set({ showIdentity })}
            />
            <ToggleRow
              label="Streamer avatar"
              checked={c.showAvatar !== false}
              onChange={(showAvatar) => set({ showAvatar })}
            />
            <ToggleRow
              label="Clock"
              checked={c.showClock !== false}
              onChange={(showClock) => set({ showClock })}
            />
            <ToggleRow
              label="Now playing"
              checked={
                c.showNowPlaying !== false && c.musicSource !== "disabled"
              }
              onChange={(showNowPlaying) => set({ showNowPlaying })}
            />
            <ToggleRow
              label="Start balance"
              checked={!!c.showStartBalance}
              onChange={(showStartBalance) => set({ showStartBalance })}
            />
            <ToggleRow
              label="Casino"
              checked={!!c.showCasino}
              onChange={(showCasino) => set({ showCasino })}
            />
            <ToggleRow
              label="CTA"
              checked={!!c.showCTA}
              onChange={(showCTA) => set({ showCTA })}
            />
            <ToggleRow
              label="Crypto ticker"
              checked={!!c.showCrypto}
              onChange={(showCrypto) => set({ showCrypto })}
            />
            <ToggleRow
              label="Socials"
              checked={!!c.showSocials}
              onChange={(showSocials) => set({ showSocials })}
            />
          </Section>
        </>
      )}

      {current === "arrange" && (
        <Section title="Bar order" icon={<SlidersHorizontal size={13} />}>
          <div className="bp-navbar-arrange">
            {sectionLayout.map((section) => (
              <div className="bp-navbar-arrange-row" key={section.id}>
                <strong>
                  {BETTER_NAVBAR_SECTION_LABELS[section.id] || section.id}
                </strong>
                <div className="bp-navbar-zone-buttons">
                  {BETTER_NAVBAR_ZONES.map((zone) => (
                    <button
                      key={zone.key}
                      type="button"
                      className={section.zone === zone.key ? "is-active" : ""}
                      onClick={() => setSectionZone(section.id, zone.key)}
                    >
                      {zone.label}
                    </button>
                  ))}
                </div>
                <div className="bp-navbar-order-buttons">
                  <button
                    type="button"
                    onClick={() => moveSection(section.id, "up")}
                    title="Move up"
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSection(section.id, "down")}
                    title="Move down"
                  >
                    <ArrowDown size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="bp-hint">
            Move Spotify to the left, streamer name to the right, or reorder any
            section inside its zone.
          </p>
        </Section>
      )}

      {current === "music" && (
        <>
          <Section title="Spotify" icon={<Music size={13} />}>
            <ToggleRow
              label="Show now playing"
              checked={c.showNowPlaying !== false}
              onChange={(showNowPlaying) =>
                set({ showNowPlaying, musicSource: "spotify" })
              }
            />
            <p className="bp-hint">
              {c.spotify_access_token
                ? "Spotify connected."
                : "Connect Spotify in Profile."}
            </p>
            <SelectRow
              label="Display style"
              value={c.musicDisplayStyle || "pill"}
              options={NAVBAR_MUSIC_DISPLAY_OPTIONS}
              onChange={(musicDisplayStyle) => set({ musicDisplayStyle })}
            />
            <SliderRow
              label="Spotify section width"
              value={c.spotifyWidth || 420}
              min={180}
              max={720}
              step={10}
              unit="px"
              onChange={(spotifyWidth) => set({ spotifyWidth })}
            />
          </Section>
        </>
      )}

      {current === "crypto" && (
        <Section title="Crypto ticker" icon={<Coins size={13} />}>
          <ToggleRow
            label="Show crypto ticker"
            checked={!!c.showCrypto}
            onChange={(showCrypto) => set({ showCrypto })}
          />
          <SelectRow
            label="Transition"
            value={c.cryptoDisplayMode || "horizontal"}
            options={NAVBAR_CRYPTO_DISPLAY_OPTIONS}
            onChange={(cryptoDisplayMode) => set({ cryptoDisplayMode })}
          />
          <ColorRow
            label="Up colour"
            value={c.cryptoUpColor || "#34d399"}
            onChange={(cryptoUpColor) => set({ cryptoUpColor })}
          />
          <ColorRow
            label="Down colour"
            value={c.cryptoDownColor || "#f87171"}
            onChange={(cryptoDownColor) => set({ cryptoDownColor })}
          />
          <p className="bp-hint">
            The ticker uses live CoinGecko prices and cycles the supported coins
            automatically.
          </p>
        </Section>
      )}

      {current === "socials" && (
        <Section title="Socials" icon={<Users size={13} />}>
          <ToggleRow
            label="Show socials"
            checked={!!c.showSocials}
            onChange={(showSocials) => set({ showSocials })}
          />
          <p className="bp-hint">
            Social handles and URLs come from the Navbar widget page.
          </p>
        </Section>
      )}

      {current === "casino" && (
        <>
          <Section title="Casino" icon={<Coins size={13} />}>
            <ToggleRow
              label="Show casino"
              checked={!!c.showCasino}
              onChange={(showCasino) => set({ showCasino })}
            />
            <SliderRow
              label="Logo size"
              value={c.casinoImageSize ?? 100}
              min={20}
              max={300}
              unit="%"
              onChange={(casinoImageSize) => set({ casinoImageSize })}
            />
            <p className="bp-hint">
              Casino logo and command come from the Navbar widget page.
            </p>
          </Section>
        </>
      )}

      {current === "cta" && (
        <Section title="CTA badge" icon={<Zap size={13} />}>
          <ToggleRow
            label="Show CTA badge"
            checked={!!c.showCTA}
            onChange={(showCTA) => set({ showCTA })}
          />
          <ColorRow
            label="CTA colour"
            value={c.ctaColor || "#f97316"}
            onChange={(ctaColor) => set({ ctaColor })}
          />
          <p className="bp-hint">CTA text comes from the Navbar widget page.</p>
        </Section>
      )}

      {current === "size" && (
        <>
          <Section title="Editor size" icon={<Maximize2 size={13} />}>
            <SliderRow
              label="Widget width"
              value={clampNumber(
                widget?.width ?? c.width ?? 1200,
                720,
                1920,
                1200,
              )}
              min={720}
              max={1920}
              step={16}
              unit="px"
              onChange={(width) => commitWidgetSize({ width })}
            />
            <SliderRow
              label="Widget height"
              value={clampNumber(widget?.height ?? c.height ?? 72, 46, 160, 72)}
              min={46}
              max={160}
              step={2}
              unit="px"
              onChange={(height) => commitWidgetSize({ height })}
            />
            <div className="bp-preset-row">
              <button
                type="button"
                onClick={() =>
                  commitWidgetSize({
                    width: 1920,
                    height: widget?.height || 72,
                  })
                }
              >
                Full 1920
              </button>
              <button
                type="button"
                onClick={() => commitWidgetSize({ width: 1200, height: 72 })}
              >
                Default
              </button>
            </div>
          </Section>

          <Section title="Bar shell" icon={<Maximize2 size={13} />}>
            <SliderRow
              label="Height"
              value={c.barHeight || 52}
              min={42}
              max={120}
              unit="px"
              onChange={(barHeight) => set({ barHeight })}
            />
            <SliderRow
              label="Radius"
              value={c.radius ?? c.borderRadius ?? 12}
              min={0}
              max={36}
              unit="px"
              onChange={(radius) => set({ radius, borderRadius: radius })}
            />
            <SliderRow
              label="Internal max width"
              value={c.maxWidth || 1920}
              min={720}
              max={1920}
              step={16}
              unit="px"
              onChange={(maxWidth) => set({ maxWidth })}
            />
          </Section>
        </>
      )}

      {current === "style" && (
        <>
          <Section title="Colours" icon={<Palette size={13} />}>
            <div className="bp-color-grid">
              <ColorRow
                label="Blue glow"
                value={c.accentBlue || "#2563eb"}
                onChange={(accentBlue) => set({ accentBlue })}
              />
              <ColorRow
                label="Accent"
                value={c.accentGold || "#f97316"}
                onChange={(accentGold) => set({ accentGold })}
              />
              <ColorRow
                label="Background"
                value={c.bgColor || "#060d20"}
                onChange={(bgColor) => set({ bgColor })}
              />
              <ColorRow
                label="Text"
                value={c.textColor || "#f8fafc"}
                onChange={(textColor) => set({ textColor })}
              />
              <ColorRow
                label="Muted"
                value={c.mutedColor || "#93c5fd"}
                onChange={(mutedColor) => set({ mutedColor })}
              />
            </div>
          </Section>

          <button
            className="bp-reset"
            type="button"
            onClick={() => onChange(DEFAULT_BETTER_CONFIG.navbar)}
          >
            <RotateCcw size={13} /> Reset navbar controls
          </button>
        </>
      )}
    </div>
  );
}

function BetterBetsControls({ config, onChange }) {
  const c = ensureBetterWidgetConfig("bets", config);
  const [tab, setTab] = useTab("theme");
  const set = (patch) => onChange({ ...c, ...patch });
  const setCardColor = (index, key, value) => {
    const next = [
      ...(Array.isArray(c.cardColors) ? c.cardColors : DEFAULT_CARD_COLORS),
    ];
    next[index] = { ...next[index], [key]: value };
    set({ cardColors: next });
  };

  return (
    <div className="bp-controls bp-controls--bets">
      <PanelTabs
        active={tab}
        onChange={setTab}
        tabs={[
          ["theme", <Palette size={12} />, "Theme"],
          ["colors", <Pipette size={12} />, "Colors"],
          ["text", <Type size={12} />, "Text"],
          ["effects", <Sparkles size={12} />, "FX"],
          ["layout", <Sliders size={12} />, "Layout"],
        ]}
      />
      {tab === "theme" && (
        <>
          <Section title="Colour Theme" icon={<Palette size={12} />}>
            <div className="bp-theme-grid">
              {BET_THEMES.map((theme) => (
                <button
                  key={theme.key}
                  type="button"
                  className={c.theme === theme.key ? "is-active" : ""}
                  onClick={() => set({ theme: theme.key })}
                >
                  <span>
                    {theme.swatches.map((color) => (
                      <i key={color} style={{ background: color }} />
                    ))}
                  </span>
                  <strong>
                    {theme.icon}
                    {theme.name}
                  </strong>
                </button>
              ))}
            </div>
          </Section>
          <Section title="Widget Opacity" icon={<Eye size={12} />}>
            <SliderRow
              label="Opacity"
              value={c.opacity}
              min={40}
              max={100}
              step={5}
              unit="%"
              onChange={(opacity) => set({ opacity })}
            />
          </Section>
        </>
      )}
      {tab === "colors" && (
        <>
          <Section title="Colour Presets" icon={<Palette size={12} />}>
            <div className="bp-preset-row">
              {CARD_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => set({ cardColors: preset.colors })}
                >
                  <span>
                    {preset.colors.map((color, index) => (
                      <i key={index} style={{ background: color.accent }} />
                    ))}
                  </span>
                  {preset.name}
                </button>
              ))}
            </div>
          </Section>
          <Section title="Per-Card Colours" icon={<Pipette size={12} />}>
            {(Array.isArray(c.cardColors) ? c.cardColors : DEFAULT_CARD_COLORS)
              .slice(0, 6)
              .map((color, index) => (
                <div className="bp-card-color-row" key={index}>
                  <span>Set {index + 1}</span>
                  <input
                    type="color"
                    value={color.accent}
                    onChange={(event) =>
                      setCardColor(index, "accent", event.target.value)
                    }
                  />
                  <input
                    type="color"
                    value={color.accent2}
                    onChange={(event) =>
                      setCardColor(index, "accent2", event.target.value)
                    }
                  />
                </div>
              ))}
            <div className="bp-quick-colors">
              {QUICK_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  style={{ background: color }}
                  onClick={() => setCardColor(0, "accent", color)}
                />
              ))}
            </div>
          </Section>
        </>
      )}
      {tab === "text" && (
        <>
          <Section title="Font Family" icon={<Type size={12} />}>
            <div className="bp-font-grid">
              {FONT_OPTIONS.map((font) => (
                <button
                  key={font.key}
                  type="button"
                  className={c.font === font.key ? "is-active" : ""}
                  onClick={() => set({ font: font.key })}
                >
                  <span style={{ fontFamily: font.family }}>Aa</span>
                  <strong>{font.name}</strong>
                </button>
              ))}
            </div>
          </Section>
          <Section title="Text Size" icon={<Maximize2 size={12} />}>
            <SliderRow
              label="Size"
              value={c.fontScale}
              min={75}
              max={140}
              step={5}
              unit="%"
              onChange={(fontScale) => set({ fontScale })}
            />
          </Section>
        </>
      )}
      {tab === "effects" && (
        <>
          <Section title="Fill Style" icon={<Waves size={12} />}>
            <Segmented
              value={c.fillStyle}
              options={FILL_STYLES}
              columns={3}
              onChange={(fillStyle) => set({ fillStyle })}
            />
          </Section>
          <Section title="Glow Intensity" icon={<Zap size={12} />}>
            <SliderRow
              label="Glow"
              value={c.glowIntensity}
              min={0}
              max={200}
              step={10}
              unit="%"
              onChange={(glowIntensity) => set({ glowIntensity })}
            />
          </Section>
          <Section title="Animation Speed" icon={<Gauge size={12} />}>
            <SliderRow
              label="Speed"
              value={c.fillSpeed}
              min={20}
              max={200}
              step={10}
              unit="%"
              onChange={(fillSpeed) => set({ fillSpeed })}
            />
          </Section>
          <Section title="Toggles" icon={<Eye size={12} />}>
            <ToggleRow
              label="Corner brackets"
              checked={c.showBrackets}
              onChange={(showBrackets) => set({ showBrackets })}
            />
            <ToggleRow
              label="Sheen sweep"
              checked={c.showSheen}
              onChange={(showSheen) => set({ showSheen })}
            />
          </Section>
        </>
      )}
      {tab === "layout" && (
        <>
          <Section title="Display Mode" icon={<Layers size={12} />}>
            <Segmented
              value={c.layoutMode}
              options={[
                {
                  key: "cards",
                  name: "Stat Cards",
                  icon: <Layers size={12} />,
                },
                {
                  key: "bars",
                  name: "Progress Bars",
                  icon: <Gauge size={12} />,
                },
              ]}
              onChange={(layoutMode) => set({ layoutMode })}
            />
          </Section>
          <Section title="Grid Columns" icon={<Sliders size={12} />}>
            <Segmented
              value={String(c.columns)}
              options={[
                { key: "1", name: "1 Col" },
                { key: "2", name: "2 Cols" },
                { key: "3", name: "3 Cols" },
              ]}
              columns={3}
              onChange={(columns) => set({ columns: Number(columns) })}
            />
          </Section>
          <Section title="Orientation" icon={<MonitorPlay size={12} />}>
            <Segmented
              value={c.orientation}
              options={[
                { key: "vertical", name: "Vertical" },
                { key: "horizontal", name: "Horizontal" },
              ]}
              onChange={(orientation) => set({ orientation })}
            />
          </Section>
          <Section title="Card Radius" icon={<Gauge size={12} />}>
            <SliderRow
              label="Radius"
              value={c.borderRadius}
              min={0}
              max={20}
              unit="px"
              onChange={(borderRadius) => set({ borderRadius })}
            />
          </Section>
        </>
      )}
    </div>
  );
}

function PanelTabs({ tabs, active, onChange }) {
  return (
    <nav className="bp-panel-tabs">
      {tabs.map(([key, icon, label]) => (
        <button
          key={key}
          type="button"
          className={active === key ? "is-active" : ""}
          onClick={() => onChange(key)}
        >
          {icon}
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

function BetterChatControls({ config, onChange, widget, onWidgetChange }) {
  const c = ensureBetterWidgetConfig("chat", config);
  const set = (patch) => onChange({ ...c, ...patch });
  const commitSize = (patch) => {
    const next = ensureBetterWidgetConfig("chat", { ...c, ...patch });
    const width = clampNumber(
      next.width,
      150,
      900,
      BETTER_CHAT_DEFAULT_SIZE.width,
    );
    const height = clampNumber(
      next.height,
      150,
      900,
      BETTER_CHAT_DEFAULT_SIZE.height,
    );
    const sizedConfig = { ...next, width, height };
    if (typeof onWidgetChange === "function") {
      onWidgetChange({ width, height, config: sizedConfig });
      return;
    }
    onChange(sizedConfig);
  };
  const resetChat = () => {
    const next = ensureBetterWidgetConfig("chat", DEFAULT_BETTER_CONFIG.chat);
    if (typeof onWidgetChange === "function") {
      onWidgetChange({
        width: BETTER_CHAT_DEFAULT_SIZE.width,
        height: BETTER_CHAT_DEFAULT_SIZE.height,
        config: next,
      });
      return;
    }
    onChange(next);
  };
  return (
    <div className="bp-controls bp-controls--chat">
      <header className="bp-chat-panel-head">
        <MessageSquare size={17} />
        <div>
          <h3>Overlay Studio</h3>
          <p>stream chat customizer</p>
        </div>
        <span className={c.live ? "is-live" : ""}>
          <i />
          {c.live ? "Live" : "Idle"}
        </span>
      </header>
      <Section title="Chat Box Size" icon={<Maximize2 size={13} />}>
        <SliderRow
          label="Width"
          value={clampNumber(
            c.width ?? widget?.width,
            150,
            900,
            BETTER_CHAT_DEFAULT_SIZE.width,
          )}
          min={150}
          max={900}
          step={10}
          unit="px"
          onChange={(width) => commitSize({ width })}
        />
        <SliderRow
          label="Height"
          value={clampNumber(
            c.height ?? widget?.height,
            150,
            900,
            BETTER_CHAT_DEFAULT_SIZE.height,
          )}
          min={150}
          max={900}
          step={10}
          unit="px"
          onChange={(height) => commitSize({ height })}
        />
        <div className="bp-preset-row">
          <button
            type="button"
            onClick={() => commitSize(BETTER_CHAT_DEFAULT_SIZE)}
          >
            Default
          </button>
          <button
            type="button"
            onClick={() => commitSize({ width: 360, height: 520 })}
          >
            Wide
          </button>
          <button
            type="button"
            onClick={() => commitSize({ width: 260, height: 720 })}
          >
            Tall
          </button>
          <button
            type="button"
            onClick={() => commitSize({ width: 420, height: 360 })}
          >
            Compact
          </button>
        </div>
      </Section>
      <Section title="Typography" icon={<Type size={13} />}>
        <SelectRow
          label="Message font"
          value={c.font}
          options={CHAT_FONTS}
          onChange={(font) => set({ font })}
        />
        <SliderRow
          label="Message size"
          value={c.fontSize}
          min={9}
          max={20}
          unit="px"
          onChange={(fontSize) => set({ fontSize })}
        />
        <SliderRow
          label="Username size"
          value={c.usernameSize}
          min={9}
          max={20}
          unit="px"
          onChange={(usernameSize) => set({ usernameSize })}
        />
      </Section>
      <Section title="Colours" icon={<Palette size={13} />}>
        <div className="bp-color-grid">
          {["glow", "username", "text", "bubble", "panel"].map((key) => (
            <ColorRow
              key={key}
              label={key[0].toUpperCase() + key.slice(1)}
              value={c[key]}
              onChange={(value) => set({ [key]: value })}
            />
          ))}
        </div>
        <div className="bp-chat-presets">
          {CHAT_PRESETS.map((preset) => (
            <button key={preset.name} type="button" onClick={() => set(preset)}>
              <span>
                <i style={{ background: preset.glow }} />
                <i style={{ background: preset.username }} />
                <i style={{ background: preset.bubble }} />
              </span>
              {preset.name}
            </button>
          ))}
        </div>
      </Section>
      <Section title="Display" icon={<Eye size={13} />}>
        <ToggleRow
          label="Show name text"
          checked={c.showHeaderName !== false}
          onChange={(showHeaderName) => set({ showHeaderName })}
        />
        <ToggleRow
          label="Show live text"
          checked={c.showLiveLabel !== false}
          onChange={(showLiveLabel) => set({ showLiveLabel })}
        />
        <ToggleRow
          label="Show viewer count"
          checked={!!c.showViewerCount}
          onChange={(showViewerCount) => set({ showViewerCount })}
        />
        <SliderRow
          label="Viewer count"
          value={c.viewerCount}
          min={0}
          max={100000}
          step={10}
          disabled={!c.showViewerCount}
          onChange={(viewerCount) => set({ viewerCount })}
        />
      </Section>
      <Section title="Emotes" icon={<Sparkles size={13} />}>
        <ToggleRow
          label="BetterTTV emotes"
          checked={c.bttvEnabled !== false}
          onChange={(bttvEnabled) => set({ bttvEnabled })}
        />
        <ToggleRow
          label="Global BTTV emotes"
          checked={c.bttvGlobal !== false}
          onChange={(bttvGlobal) => set({ bttvGlobal })}
        />
        <ToggleRow
          label="Channel BTTV emotes"
          checked={c.bttvChannel !== false}
          onChange={(bttvChannel) => set({ bttvChannel })}
        />
        <SliderRow
          label="Emote image size"
          value={c.bttvSize}
          min={1}
          max={3}
          step={1}
          unit="x"
          onChange={(bttvSize) => set({ bttvSize })}
        />
      </Section>
      <Section title="Celebrations" icon={<Sparkles size={13} />}>
        <ToggleRow
          label="Raid celebration"
          checked={c.celebrations?.raid !== false}
          onChange={(raid) =>
            set({ celebrations: { ...c.celebrations, raid } })
          }
        />
        <ToggleRow
          label="Sub highlight"
          checked={c.celebrations?.sub !== false}
          onChange={(sub) => set({ celebrations: { ...c.celebrations, sub } })}
        />
        <ToggleRow
          label="Gift effect"
          checked={c.celebrations?.gift !== false}
          onChange={(gift) =>
            set({ celebrations: { ...c.celebrations, gift } })
          }
        />
        <SliderRow
          label="Effect intensity"
          value={c.celebrations?.intensity ?? 5}
          min={1}
          max={10}
          onChange={(intensity) =>
            set({ celebrations: { ...c.celebrations, intensity } })
          }
        />
      </Section>
      <Section title="Roles & Message Glaze" icon={<Sparkles size={13} />}>
        <ToggleRow
          label="Show role badges"
          checked={c.showRoleBadges !== false}
          onChange={(showRoleBadges) => set({ showRoleBadges })}
        />
        <ToggleRow
          label="Role message effects"
          checked={c.roleEffects?.enabled !== false}
          onChange={(enabled) =>
            set({ roleEffects: { ...c.roleEffects, enabled } })
          }
        />
        {[
          ["ownerEnabled", "Owner colour"],
          ["ownerMovementEnabled", "Owner movement"],
          ["moderatorEnabled", "Moderator colour"],
          ["moderatorMovementEnabled", "Moderator movement"],
          ["vipEnabled", "VIP colour"],
          ["vipMovementEnabled", "VIP movement"],
          ["subscriberEnabled", "Subscriber colour"],
          ["subscriberMovementEnabled", "Subscriber movement"],
        ].map(([key, label]) => (
          <ToggleRow
            key={key}
            label={label}
            checked={c.roleEffects?.[key] !== false}
            disabled={c.roleEffects?.enabled === false}
            onChange={(enabled) =>
              set({ roleEffects: { ...c.roleEffects, [key]: enabled } })
            }
          />
        ))}
        <SliderRow
          label="Glaze intensity"
          value={c.roleEffects?.intensity ?? 8}
          min={1}
          max={10}
          disabled={c.roleEffects?.enabled === false}
          onChange={(intensity) =>
            set({ roleEffects: { ...c.roleEffects, intensity } })
          }
        />
        <div className="bp-color-grid">
          {[
            ["ownerColor", "Owner"],
            ["moderatorColor", "Moderator"],
            ["vipColor", "VIP"],
            ["subscriberColor", "Subscriber"],
            ["raidColor", "Raid"],
          ].map(([key, label]) => (
            <ColorRow
              key={key}
              label={label}
              value={c.roleEffects?.[key]}
              onChange={(value) =>
                set({ roleEffects: { ...c.roleEffects, [key]: value } })
              }
            />
          ))}
        </div>
      </Section>
      <Section title="In-Chat Shoutout" icon={<MessageSquare size={13} />}>
        <ToggleRow
          label="Play !so inside chat"
          checked={c.shoutoutInChat === true}
          onChange={(shoutoutInChat) => set({ shoutoutInChat })}
        />
        <Segmented
          value={c.shoutoutPosition}
          options={[
            { key: "top", name: "Top" },
            { key: "bottom", name: "Bottom" },
          ]}
          onChange={(shoutoutPosition) => set({ shoutoutPosition })}
        />
        <SliderRow
          label="Clip height"
          value={c.shoutoutHeight}
          min={120}
          max={360}
          step={10}
          unit="px"
          disabled={!c.shoutoutInChat}
          onChange={(shoutoutHeight) => set({ shoutoutHeight })}
        />
        <SliderRow
          label="Display duration"
          value={c.shoutoutDuration}
          min={10}
          max={120}
          unit="s"
          disabled={!c.shoutoutInChat}
          onChange={(shoutoutDuration) => set({ shoutoutDuration })}
        />
        <ToggleRow
          label="Dismiss when clip ends"
          checked={c.shoutoutDismissOnClipEnd === true}
          disabled={!c.shoutoutInChat}
          onChange={(shoutoutDismissOnClipEnd) =>
            set({ shoutoutDismissOnClipEnd })
          }
        />
      </Section>
      <Section title="Backdrop" icon={<Layers size={13} />}>
        <Segmented
          value={c.bg}
          columns={3}
          options={[
            "solid",
            "horizon",
            "beam",
            "nebula",
            "vignette",
            "split",
          ].map((key) => ({ key, name: key }))}
          onChange={(bg) => set({ bg })}
        />
        <Segmented
          value={c.texture}
          columns={3}
          options={[
            "none",
            "scanlines",
            "grid",
            "dots",
            "diagonal",
            "noise",
          ].map((key) => ({ key, name: key }))}
          onChange={(texture) => set({ texture })}
        />
        <SliderRow
          label="Texture strength"
          value={c.textureStrength}
          min={5}
          max={80}
          step={5}
          unit="%"
          disabled={c.texture === "none"}
          onChange={(textureStrength) => set({ textureStrength })}
        />
      </Section>
      <Section title="Message Behaviour" icon={<Waves size={13} />}>
        <Segmented
          value={c.animation}
          columns={3}
          options={[
            "slide-up",
            "slide-down",
            "slide-left",
            "slide-right",
            "fade",
            "none",
          ].map((key) => ({
            key,
            name: key === "none" ? "Instant" : key.replace("slide-", ""),
          }))}
          onChange={(animation) => set({ animation })}
        />
        <Segmented
          value={c.flow}
          options={[
            { key: "bottom-to-top", name: "Bottom up" },
            { key: "top-to-bottom", name: "Top down" },
          ]}
          onChange={(flow) =>
            set({ flow, entry: flow === "top-to-bottom" ? "top" : "bottom" })
          }
        />
        <SliderRow
          label="Stagger"
          value={c.stagger}
          min={0}
          max={400}
          step={20}
          unit="ms"
          onChange={(stagger) => set({ stagger })}
        />
        <ToggleRow
          label="Auto-fade"
          checked={!!c.autoFade}
          onChange={(autoFade) =>
            set({ autoFade, lifespan: autoFade ? "timed" : "persistent" })
          }
        />
        <SliderRow
          label="Fade after"
          value={c.fadeAfter}
          min={2}
          max={15}
          unit="s"
          disabled={!c.autoFade}
          onChange={(fadeAfter) => set({ fadeAfter })}
        />
        <SliderRow
          label="Max messages"
          value={c.maxMessages}
          min={2}
          max={40}
          onChange={(maxMessages) => set({ maxMessages })}
        />
        <ToggleRow
          label="Simulate live chat"
          checked={!!c.live}
          onChange={(live) => set({ live })}
        />
      </Section>
      <Section title="Empty State" icon={<MessageSquare size={13} />}>
        <ToggleRow
          label="Show empty state"
          checked={c.showEmptyState !== false}
          onChange={(showEmptyState) => set({ showEmptyState })}
        />
        {c.showEmptyState !== false && (
          <TextRow
            label="No-message text"
            value={c.emptyMessage || BETTER_CHAT_EMPTY_MESSAGE}
            onChange={(emptyMessage) => set({ emptyMessage })}
          />
        )}
      </Section>
      <div className="bp-action-row">
        <button
          type="button"
          onClick={() => set({ replayNonce: (Number(c.replayNonce) || 0) + 1 })}
        >
          <RotateCcw size={13} /> Replay
        </button>
      </div>
      <button className="bp-reset" type="button" onClick={resetChat}>
        <RotateCcw size={13} /> Reset chat controls
      </button>
    </div>
  );
}

function SimpleThemedControls({
  type,
  config,
  onChange,
  onWidgetChange,
  widget,
}) {
  const c = ensureBetterWidgetConfig(type, config);
  const renderedConfig =
    type === "bonus_hunt" && widget?.config
      ? ensureBetterWidgetConfig(type, widget.config)
      : c;
  const set = (patch) => {
    const nextPatch = { ...patch };
    if (
      type === "navbar" &&
      Object.prototype.hasOwnProperty.call(nextPatch, "casinoCommand")
    ) {
      nextPatch[BETTER_NAVBAR_MANUAL_CASINO_COMMAND_MARKER] = true;
    }
    onChange({ ...c, ...nextPatch });
  };
  const setGiveawaySize = (patch) => {
    const next = { ...c, ...patch };
    const width = Number(next.width) || DEFAULT_BETTER_CONFIG.giveaway.width;
    const height = Number(next.height) || DEFAULT_BETTER_CONFIG.giveaway.height;
    if (typeof onWidgetChange === "function") {
      onWidgetChange({
        width,
        height,
        config: next,
      });
      return;
    }
    onChange(next);
  };
  const setBonusSize = (patch) => {
    const next = { ...c, ...patch };
    const nextWidth =
      Number(next.widgetWidth || next.panelWidth) ||
      (next.orientation === "horizontal"
        ? 1080
        : next.orientation === "mainstream"
          ? 372
          : 402);
    const nextHeight = Number(next.widgetHeight ?? next.panelHeight ?? 0) || 0;
    if (typeof onWidgetChange === "function") {
      const widgetPatch = {
        width: clampNumber(nextWidth, 320, 1280, nextWidth),
        config: next,
      };
      if (nextHeight > 0) {
        widgetPatch.height = clampNumber(nextHeight, 320, 1080, nextHeight);
      }
      onWidgetChange(widgetPatch);
      return;
    }
    onChange(next);
  };
  const setRtpBar = (patch) => {
    const next = { ...c, ...patch };
    if (
      typeof onWidgetChange === "function" &&
      Object.prototype.hasOwnProperty.call(patch, "barHeight")
    ) {
      onWidgetChange({
        height: clampNumber(next.barHeight, 52, 160, widget?.height || 88),
        config: next,
      });
      return;
    }
    onChange(next);
  };
  const [tab, setTab] = useTab("theme");
  const activeTab = (tabs) =>
    tabs.some(([key]) => key === tab) ? tab : tabs[0]?.[0];

  if (type === "navbar") {
    return (
      <div className="bp-controls">
        <Section title="Content" icon={<Type size={13} />}>
          {["brandName", "siteUrl", "startValue"].map((key) => (
            <TextRow
              key={key}
              label={key}
              value={c[key]}
              onChange={(value) => set({ [key]: value })}
            />
          ))}
        </Section>
        <Section title="Options" icon={<Layers size={13} />}>
          <ToggleRow
            label="Casino"
            checked={!!c.showCasino}
            onChange={(showCasino) => set({ showCasino })}
          />
          <ToggleRow
            label="Crypto ticker"
            checked={!!c.showCrypto}
            onChange={(showCrypto) => set({ showCrypto })}
          />
          <ToggleRow
            label="Socials"
            checked={!!c.showSocials}
            onChange={(showSocials) => set({ showSocials })}
          />
        </Section>
        <Section title="Casino" icon={<Coins size={13} />}>
          <TextRow
            label="Logo URL"
            value={c.casinoLogoUrl || ""}
            onChange={(casinoLogoUrl) => set({ casinoLogoUrl })}
          />
          <SliderRow
            label="Logo size"
            value={c.casinoImageSize ?? 100}
            min={20}
            max={300}
            step={5}
            unit="%"
            onChange={(casinoImageSize) => set({ casinoImageSize })}
          />
          <TextRow
            label="Manual text"
            value={c.casinoCommand || ""}
            onChange={(casinoCommand) => set({ casinoCommand })}
          />
        </Section>
        <Section title="Colours" icon={<Palette size={13} />}>
          <ColorRow
            label="Blue glow"
            value={c.accentBlue}
            onChange={(accentBlue) => set({ accentBlue })}
          />
          <ColorRow
            label="Accent"
            value={c.accentGold}
            onChange={(accentGold) => set({ accentGold })}
          />
        </Section>
        <Section title="Size" icon={<Maximize2 size={13} />}>
          <SliderRow
            label="Height"
            value={c.barHeight}
            min={42}
            max={92}
            unit="px"
            onChange={(barHeight) => set({ barHeight })}
          />
          <SliderRow
            label="Radius"
            value={c.radius}
            min={0}
            max={24}
            unit="px"
            onChange={(radius) => set({ radius })}
          />
          <SliderRow
            label="Max width"
            value={c.maxWidth}
            min={720}
            max={1600}
            step={16}
            unit="px"
            onChange={(maxWidth) => set({ maxWidth })}
          />
        </Section>
      </div>
    );
  }

  if (type === "rtp_stats") {
    const tabs = [
      ["presets", <Palette size={12} />, "Presets"],
      ["provider", <ImagePlus size={12} />, "Provider"],
      ["display", <Eye size={12} />, "Display"],
      ["emblem", <Sparkles size={12} />, "Emblem"],
      ["colours", <Pipette size={12} />, "Colours"],
      ["type", <Type size={12} />, "Type"],
      ["bar", <Sliders size={12} />, "Bar"],
    ];
    const current = activeTab(tabs);
    return (
      <div className="bp-controls">
        <PanelTabs active={current} onChange={setTab} tabs={tabs} />
        {current === "presets" && (
          <Section title="Presets" icon={<Palette size={13} />}>
            <div className="bp-preset-row">
              {RTP_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => set(preset.patch)}
                >
                  {preset.name}
                </button>
              ))}
            </div>
            <button
              className="bp-reset"
              type="button"
              onClick={() => onChange(DEFAULT_BETTER_CONFIG.rtp_stats)}
            >
              <RotateCcw size={13} /> Reset to defaults
            </button>
          </Section>
        )}
        {current === "provider" && (
          <Section title="Provider" icon={<ImagePlus size={13} />}>
            <Segmented
              value={c.providerMode}
              columns={4}
              options={["image", "name", "both", "none"].map((key) => ({
                key,
                name: key,
              }))}
              onChange={(providerMode) => set({ providerMode })}
            />
            {["image", "both"].includes(c.providerMode) && (
              <>
                <SliderRow
                  label="Logo height"
                  value={c.logoHeight}
                  min={18}
                  max={72}
                  unit="px"
                  onChange={(logoHeight) => set({ logoHeight })}
                />
                <SliderRow
                  label="Logo max width"
                  value={c.logoMaxW}
                  min={60}
                  max={320}
                  step={4}
                  unit="px"
                  onChange={(logoMaxW) => set({ logoMaxW })}
                />
                <SliderRow
                  label="Logo padding Y"
                  value={c.logoPadY}
                  min={0}
                  max={16}
                  unit="px"
                  onChange={(logoPadY) => set({ logoPadY })}
                />
                <SliderRow
                  label="Logo padding X"
                  value={c.logoPadX}
                  min={0}
                  max={24}
                  unit="px"
                  onChange={(logoPadX) => set({ logoPadX })}
                />
                <SliderRow
                  label="Logo nudge Y"
                  value={c.logoOffsetY}
                  min={-14}
                  max={14}
                  unit="px"
                  onChange={(logoOffsetY) => set({ logoOffsetY })}
                />
                <SliderRow
                  label="Logo nudge X"
                  value={c.logoOffsetX}
                  min={-14}
                  max={14}
                  unit="px"
                  onChange={(logoOffsetX) => set({ logoOffsetX })}
                />
                <Segmented
                  value={c.logoFit}
                  options={[
                    { key: "contain", name: "Contain" },
                    { key: "cover", name: "Crop" },
                  ]}
                  onChange={(logoFit) => set({ logoFit })}
                />
              </>
            )}
          </Section>
        )}
        {current === "display" && (
          <Section title="Display" icon={<Eye size={13} />}>
            <ToggleRow
              label="Show RTP"
              checked={c.showRtp !== false}
              onChange={(showRtp) => set({ showRtp })}
            />
            <ToggleRow
              label="Show potential"
              checked={c.showPotential !== false}
              onChange={(showPotential) => set({ showPotential })}
            />
            <ToggleRow
              label="Show volatility"
              checked={c.showVolatility !== false}
              onChange={(showVolatility) => set({ showVolatility })}
            />
            <ToggleRow
              label="Show best win"
              checked={c.showBestWin !== false}
              onChange={(showBestWin) => set({ showBestWin })}
            />
            <ToggleRow
              label="Show dividers"
              checked={c.showDividers !== false}
              onChange={(showDividers) => set({ showDividers })}
            />
          </Section>
        )}
        {current === "emblem" && (
          <>
            <Section title="Emblem" icon={<Sparkles size={13} />}>
              <ToggleRow
                label="Show emblem"
                checked={c.showEmblem}
                onChange={(showEmblem) => set({ showEmblem })}
              />
              <ToggleRow
                label="Animate"
                checked={c.emblemAnimate}
                onChange={(emblemAnimate) => set({ emblemAnimate })}
              />
              <Segmented
                value={c.emblem}
                columns={4}
                options={RTP_EMBLEMS}
                onChange={(emblem) => set({ emblem })}
              />
              <SliderRow
                label="Speed"
                value={c.emblemSpeed}
                min={0.2}
                max={4}
                step={0.1}
                unit="x"
                onChange={(emblemSpeed) => set({ emblemSpeed })}
              />
              <SliderRow
                label="Size"
                value={c.emblemSize}
                min={16}
                max={64}
                unit="px"
                onChange={(emblemSize) => set({ emblemSize })}
              />
              <SliderRow
                label="Stroke / weight"
                value={c.emblemStroke}
                min={1}
                max={5}
                step={0.5}
                unit="px"
                onChange={(emblemStroke) => set({ emblemStroke })}
              />
            </Section>
            <Section title="Emblem colours" icon={<Palette size={13} />}>
              <ColorRow
                label="Primary"
                value={c.cEmA}
                onChange={(cEmA) => set({ cEmA })}
              />
              <ColorRow
                label="Secondary"
                value={c.cEmB}
                onChange={(cEmB) => set({ cEmB })}
              />
              <ColorRow
                label="Base / track"
                value={c.cEmBase}
                onChange={(cEmBase) => set({ cEmBase })}
              />
            </Section>
          </>
        )}
        {current === "colours" && (
          <Section title="Colours" icon={<Palette size={13} />}>
            {[
              ["cRim", "Border / glow"],
              ["cBarTop", "Bar top"],
              ["cBarMid", "Bar middle"],
              ["cBarBot", "Bar bottom"],
              ["cLabel", "Label text"],
              ["cValue", "Value text"],
              ["cBolt", "Bolt icon"],
              ["cGold", "Trophy"],
              ["cBrand", "Provider text"],
            ].map(([key, label]) => (
              <ColorRow
                key={key}
                label={label}
                value={c[key]}
                onChange={(value) => set({ [key]: value })}
              />
            ))}
          </Section>
        )}
        {current === "type" && (
          <Section title="Typography" icon={<Type size={13} />}>
            <SelectRow
              label="Title font"
              value={c.fontTitle}
              options={RTP_FONT_OPTIONS}
              onChange={(fontTitle) => set({ fontTitle })}
            />
            <SelectRow
              label="Body font"
              value={c.fontBody}
              options={RTP_FONT_OPTIONS}
              onChange={(fontBody) => set({ fontBody })}
            />
            <SliderRow
              label="Title size"
              value={c.titleSize}
              min={12}
              max={40}
              unit="px"
              onChange={(titleSize) => set({ titleSize })}
            />
            <SliderRow
              label="Title tracking"
              value={c.titleTracking}
              min={0}
              max={0.3}
              step={0.01}
              unit="em"
              onChange={(titleTracking) => set({ titleTracking })}
            />
            <SliderRow
              label="Value size"
              value={c.valueSize}
              min={10}
              max={28}
              unit="px"
              onChange={(valueSize) => set({ valueSize })}
            />
            <SliderRow
              label="Label size"
              value={c.labelSize}
              min={7}
              max={16}
              unit="px"
              onChange={(labelSize) => set({ labelSize })}
            />
          </Section>
        )}
        {current === "bar" && (
          <Section title="Bar size" icon={<Maximize2 size={13} />}>
            <SliderRow
              label="Total height"
              value={c.barHeight}
              min={52}
              max={120}
              unit="px"
              onChange={(barHeight) => setRtpBar({ barHeight })}
            />
            <SliderRow
              label="Vertical gap"
              value={c.barPadY}
              min={2}
              max={28}
              unit="px"
              onChange={(barPadY) => set({ barPadY })}
            />
            <SliderRow
              label="Padding left / right"
              value={c.barPadX}
              min={4}
              max={48}
              unit="px"
              onChange={(barPadX) => set({ barPadX })}
            />
            <SliderRow
              label="Corner radius"
              value={c.radius}
              min={0}
              max={40}
              unit="px"
              onChange={(radius) => set({ radius })}
            />
            <SliderRow
              label="Border width"
              value={c.borderWidth}
              min={0}
              max={5}
              step={0.5}
              unit="px"
              onChange={(borderWidth) => set({ borderWidth })}
            />
          </Section>
        )}
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
        {current === "presets" && (
          <Section title="Curated Atmospheres" icon={<Sparkles size={13} />}>
            <div className="bp-preset-row">
              {BACKGROUND_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => set(preset.patch)}
                >
                  <i
                    style={{
                      background: `linear-gradient(135deg, ${preset.patch.color2}, ${preset.patch.color3})`,
                    }}
                  />
                  {preset.name}
                </button>
              ))}
            </div>
            <button
              className="bp-reset"
              type="button"
              onClick={() => onChange(DEFAULT_BETTER_CONFIG.background)}
            >
              <RotateCcw size={13} /> Reset background
            </button>
          </Section>
        )}
        {current === "colors" && (
          <Section title="Palette Configuration" icon={<Palette size={13} />}>
            {[
              ["color1", "Base Backdrop"],
              ["color2", "Primary Hue"],
              ["color3", "Accent Tone"],
              ["overlayColor", "Tint"],
            ].map(([key, label]) => (
              <ColorRow
                key={key}
                label={label}
                value={c[key]}
                onChange={(value) => set({ [key]: value })}
              />
            ))}
            <SliderRow
              label="Color Saturation & Intensity"
              value={c.intensity}
              min={20}
              max={100}
              unit="%"
              onChange={(intensity) => set({ intensity })}
            />
            <SliderRow
              label="Tint opacity"
              value={c.overlayOpacity}
              min={0}
              max={80}
              unit="%"
              onChange={(overlayOpacity) => set({ overlayOpacity })}
            />
          </Section>
        )}
        {current === "source" && (
          <Section title="Source" icon={<ImagePlus size={13} />}>
            <Segmented
              value={c.bgMode}
              columns={3}
              options={["texture", "image", "video"].map((key) => ({
                key,
                name: key,
              }))}
              onChange={(bgMode) => set({ bgMode })}
            />
            <TextRow
              label="Image URL"
              value={c.imageUrl}
              onChange={(imageUrl) => set({ imageUrl })}
            />
            <TextRow
              label="Video URL"
              value={c.videoUrl}
              onChange={(videoUrl) => set({ videoUrl })}
            />
            <Segmented
              value={c.imageFit}
              columns={3}
              options={["cover", "contain", "fill"].map((key) => ({
                key,
                name: key,
              }))}
              onChange={(imageFit) => set({ imageFit })}
            />
            <TextRow
              label="Image position"
              value={c.imagePosition}
              onChange={(imagePosition) => set({ imagePosition })}
            />
            <SliderRow
              label="Media opacity"
              value={c.mediaOpacity}
              min={0}
              max={100}
              unit="%"
              onChange={(mediaOpacity) => set({ mediaOpacity })}
            />
          </Section>
        )}
        {current === "textures" && (
          <Section title="Tactile Texture Layers" icon={<Waves size={13} />}>
            <Segmented
              value={c.texture}
              columns={3}
              options={[
                "aurora",
                "grid",
                "dots",
                "diagonal",
                "nebula",
                "noise",
              ].map((key) => ({ key, name: key }))}
              onChange={(texture) => set({ texture })}
            />
            <SliderRow
              label="Flow Animation Speed"
              value={c.animSpeed}
              min={4}
              max={30}
              unit="s"
              onChange={(animSpeed) => set({ animSpeed })}
            />
            <SliderRow
              label="Opacity"
              value={c.opacity}
              min={0}
              max={100}
              unit="%"
              onChange={(opacity) => set({ opacity })}
            />
            <SliderRow
              label="Brightness"
              value={c.brightness}
              min={40}
              max={180}
              unit="%"
              onChange={(brightness) => set({ brightness })}
            />
            <SliderRow
              label="Contrast"
              value={c.contrast}
              min={40}
              max={180}
              unit="%"
              onChange={(contrast) => set({ contrast })}
            />
            <SliderRow
              label="Saturation"
              value={c.saturation}
              min={0}
              max={200}
              unit="%"
              onChange={(saturation) => set({ saturation })}
            />
          </Section>
        )}
        {current === "effects" && (
          <Section title="Particle & Fluid FX" icon={<Sparkles size={13} />}>
            <ToggleRow
              label="Particles"
              checked={c.fxParticles}
              onChange={(fxParticles) => set({ fxParticles })}
            />
            <ToggleRow
              label="Scanlines"
              checked={c.fxScanlines}
              onChange={(fxScanlines) => set({ fxScanlines })}
            />
            <ToggleRow
              label="Vignette"
              checked={c.fxVignette}
              onChange={(fxVignette) => set({ fxVignette })}
            />
            <SliderRow
              label="Blur"
              value={c.blur}
              min={0}
              max={18}
              unit="px"
              onChange={(blur) => set({ blur })}
            />
            <SliderRow
              label="Hue rotate"
              value={c.hueRotate}
              min={-180}
              max={180}
              unit="deg"
              onChange={(hueRotate) => set({ hueRotate })}
            />
            <SliderRow
              label="Grayscale"
              value={c.grayscale}
              min={0}
              max={100}
              unit="%"
              onChange={(grayscale) => set({ grayscale })}
            />
            <SliderRow
              label="Sepia"
              value={c.sepia}
              min={0}
              max={100}
              unit="%"
              onChange={(sepia) => set({ sepia })}
            />
          </Section>
        )}
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
        {current === "theme" && (
          <>
            <Section title="Presets" icon={<Palette size={13} />}>
              <div className="bp-preset-row">
                {GIVEAWAY_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => set(preset.patch)}
                  >
                    <i style={{ background: preset.swatch }} />
                    {preset.name}
                  </button>
                ))}
              </div>
            </Section>
            <Section title="Finish" icon={<Layers size={13} />}>
              <Segmented
                value={c.surface}
                columns={2}
                options={GIVEAWAY_SURFACES}
                onChange={(surface) => set({ surface })}
              />
            </Section>
            <Section title="Colour" icon={<Palette size={13} />}>
              <SliderRow
                label="Base hue"
                value={c.hue}
                min={0}
                max={360}
                unit="deg"
                onChange={(hue) => set({ hue })}
              />
              <SliderRow
                label="Hue spread"
                value={c.hueShift}
                min={-90}
                max={90}
                unit="deg"
                onChange={(hueShift) => set({ hueShift })}
              />
              <SliderRow
                label="Saturation"
                value={c.saturation}
                min={0}
                max={100}
                unit="%"
                onChange={(saturation) => set({ saturation })}
              />
              <SliderRow
                label="Backdrop light"
                value={c.lightness}
                min={2}
                max={40}
                unit="%"
                onChange={(lightness) => set({ lightness })}
              />
              <SliderRow
                label="Accent vividness"
                value={c.accentSat}
                min={0}
                max={100}
                unit="%"
                onChange={(accentSat) => set({ accentSat })}
              />
              <SliderRow
                label="Accent brightness"
                value={c.accentLight}
                min={30}
                max={90}
                unit="%"
                onChange={(accentLight) => set({ accentLight })}
              />
              <ColorRow
                label="Renderer accent"
                value={c.accentColor}
                onChange={(accentColor) => set({ accentColor })}
              />
              <ColorRow
                label="Renderer background"
                value={c.bgColor}
                onChange={(bgColor) => set({ bgColor })}
              />
            </Section>
          </>
        )}
        {current === "size" && (
          <Section title="Card dimensions" icon={<Maximize2 size={13} />}>
            <SliderRow
              label="Width"
              value={c.width}
              min={420}
              max={900}
              unit="px"
              onChange={(width) => setGiveawaySize({ width })}
            />
            <SliderRow
              label="Height"
              value={c.height}
              min={180}
              max={420}
              unit="px"
              onChange={(height) => setGiveawaySize({ height })}
            />
            <div className="bp-preset-row">
              <button
                type="button"
                onClick={() => setGiveawaySize({ width: 700, height: 270 })}
              >
                Default
              </button>
              <button
                type="button"
                onClick={() => setGiveawaySize({ width: 640, height: 360 })}
              >
                16:9
              </button>
              <button
                type="button"
                onClick={() => setGiveawaySize({ width: 800, height: 200 })}
              >
                Banner
              </button>
              <button
                type="button"
                onClick={() => setGiveawaySize({ width: 460, height: 380 })}
              >
                Tall
              </button>
            </div>
            <SliderRow
              label="Padding X"
              value={c.padX}
              min={8}
              max={70}
              unit="px"
              onChange={(padX) => set({ padX })}
            />
            <SliderRow
              label="Padding Y"
              value={c.padY}
              min={6}
              max={60}
              unit="px"
              onChange={(padY) => set({ padY })}
            />
            <SliderRow
              label="Tile gap"
              value={c.tileGap}
              min={0}
              max={40}
              unit="px"
              onChange={(tileGap) => set({ tileGap })}
            />
          </Section>
        )}
        {current === "edges" && (
          <>
            <Section title="Border" icon={<Layers size={13} />}>
              <SliderRow
                label="Corner radius"
                value={c.radius}
                min={0}
                max={60}
                unit="px"
                onChange={(radius) => set({ radius, borderRadius: radius })}
              />
              <SliderRow
                label="Border width"
                value={c.borderWidth}
                min={0}
                max={6}
                step={0.5}
                unit="px"
                onChange={(borderWidth) => set({ borderWidth })}
              />
              <SliderRow
                label="Border opacity"
                value={c.borderAlpha}
                min={0}
                max={1}
                step={0.05}
                onChange={(borderAlpha) => set({ borderAlpha })}
              />
              <SliderRow
                label="Tile radius"
                value={c.tileRadius}
                min={0}
                max={40}
                unit="px"
                onChange={(tileRadius) => set({ tileRadius })}
              />
            </Section>
            <Section title="Frame details" icon={<Frame size={13} />}>
              <ToggleRow
                label="Inner frame"
                checked={c.innerFrame}
                onChange={(innerFrame) => set({ innerFrame })}
              />
              <SliderRow
                label="Frame inset"
                value={c.innerInset}
                min={2}
                max={18}
                unit="px"
                disabled={!c.innerFrame}
                onChange={(innerInset) => set({ innerInset })}
              />
              <ToggleRow
                label="Corner brackets"
                checked={c.brackets}
                onChange={(brackets) => set({ brackets })}
              />
              <SliderRow
                label="Bracket length"
                value={c.bracketSize}
                min={10}
                max={80}
                unit="px"
                disabled={!c.brackets}
                onChange={(bracketSize) => set({ bracketSize })}
              />
              <SliderRow
                label="Bracket weight"
                value={c.bracketWidth}
                min={1}
                max={6}
                step={0.5}
                unit="px"
                disabled={!c.brackets}
                onChange={(bracketWidth) => set({ bracketWidth })}
              />
              <ToggleRow
                label="Edge light bars"
                checked={c.edgeLights}
                onChange={(edgeLights) => set({ edgeLights })}
              />
              <ToggleRow
                label="Side dashes"
                checked={c.sideDashes}
                onChange={(sideDashes) => set({ sideDashes })}
              />
              <ToggleRow
                label="Sheen sweep"
                checked={c.sheen}
                onChange={(sheen) => set({ sheen })}
              />
              <SliderRow
                label="Outer glow"
                value={c.glow}
                min={0}
                max={160}
                unit="%"
                onChange={(glow) => set({ glow })}
              />
              <SliderRow
                label="Inner glow"
                value={c.innerGlow}
                min={0}
                max={160}
                unit="%"
                onChange={(innerGlow) => set({ innerGlow })}
              />
            </Section>
          </>
        )}
        {current === "type" && (
          <Section title="Typography" icon={<Type size={13} />}>
            <SelectRow
              label="Display font"
              value={c.titleFont}
              options={GIVEAWAY_FONTS}
              onChange={(titleFont) => set({ titleFont })}
            />
            <SelectRow
              label="Body font"
              value={c.bodyFont}
              options={GIVEAWAY_FONTS}
              onChange={(bodyFont) =>
                set({
                  bodyFont,
                  fontFamily:
                    GIVEAWAY_FONTS.find((font) => font.key === bodyFont)
                      ?.stack || c.fontFamily,
                })
              }
            />
            <SliderRow
              label="Title"
              value={c.titleSize}
              min={10}
              max={44}
              unit="px"
              onChange={(titleSize) => set({ titleSize })}
            />
            <SliderRow
              label="Prize"
              value={c.prizeSize}
              min={14}
              max={64}
              unit="px"
              onChange={(prizeSize) => set({ prizeSize })}
            />
            <SliderRow
              label="Subtitle"
              value={c.subSize}
              min={8}
              max={30}
              unit="px"
              onChange={(subSize) => set({ subSize })}
            />
            <SliderRow
              label="Tile label"
              value={c.labelSize}
              min={6}
              max={20}
              unit="px"
              onChange={(labelSize) => set({ labelSize })}
            />
            <SliderRow
              label="Tile value"
              value={c.valueSize}
              min={12}
              max={54}
              unit="px"
              onChange={(valueSize) => set({ valueSize })}
            />
            <SliderRow
              label="Letter spacing"
              value={c.letterSpacing}
              min={0}
              max={20}
              step={0.5}
              unit="%"
              onChange={(letterSpacing) => set({ letterSpacing })}
            />
            <SliderRow
              label="Text glow"
              value={c.textGlow}
              min={0}
              max={200}
              unit="%"
              onChange={(textGlow) => set({ textGlow })}
            />
            <ToggleRow
              label="Italic prize"
              checked={c.italicPrize}
              onChange={(italicPrize) => set({ italicPrize })}
            />
            <ToggleRow
              label="Uppercase labels"
              checked={c.uppercaseLabels}
              onChange={(uppercaseLabels) => set({ uppercaseLabels })}
            />
          </Section>
        )}
        {current === "content" && (
          <Section title="Card copy" icon={<Type size={13} />}>
            {["title", "prize", "subtitle", "keyword"].map((key) => (
              <TextRow
                key={key}
                label={key}
                value={c[key]}
                onChange={(value) => set({ [key]: value })}
              />
            ))}
            <p className="bp-hint">
              The keyword tile shows an exclamation mark automatically, so type
              just the word.
            </p>
            <button
              className="bp-reset"
              type="button"
              onClick={() => setGiveawaySize(DEFAULT_BETTER_CONFIG.giveaway)}
            >
              <RotateCcw size={13} /> Reset everything
            </button>
          </Section>
        )}
      </div>
    );
  }

  const applyBonusColour = (colourKey) => {
    const colour =
      BONUS_COLOURS.find((item) => item.key === colourKey) || BONUS_COLOURS[0];
    set({
      colour: colour.key,
      headerAccent: colour.accent,
      accentColor: colour.accent,
      headerColor: colour.bg,
      bgColor: colour.bg,
    });
  };
  const normalizedSessionState =
    renderedConfig.sessionState ||
    (renderedConfig.bonusOpening ? "opening" : "hunt");
  const orientationHint =
    c.orientation === "horizontal"
      ? "Wide two-column layout - the log drifts sideways as cards."
      : c.orientation === "mainstream"
        ? "Mainstream layout - active bonus and stats stay high, with the tracker below."
        : "The classic tall tracker - list scrolls upward.";
  const sessionHint = (
    BONUS_SESSION_STATES.find((item) => item.key === normalizedSessionState) ||
    BONUS_SESSION_STATES[0]
  ).hint;
  const liveBonusCount = Array.isArray(renderedConfig.bonuses)
    ? renderedConfig.bonuses.length
    : 0;
  const liveRequestsVisible = renderedConfig.showSlotRequests !== false;
  const localRequestsVisible = c.showRequests !== false;
  const normalizedDrawerMode = c.drawerMode === "expand" ? "expand" : "contain";
  const drawerAlwaysVisible = c.drawerAlwaysVisible === true;
  const drawerRevealSeconds = Math.max(
    10,
    Math.min(90, Number(c.drawerRevealSeconds) || 30),
  );
  const drawerHoldSeconds = Math.max(
    12,
    Math.min(30, Number(c.drawerHoldSeconds) || 15),
  );
  const drawerHint =
    normalizedDrawerMode === "expand"
      ? "The best / worst card expands only the bottom of the panel on the configured timer."
      : "The best / worst card stays inside the panel and temporarily reduces the list area on the configured timer.";
  const currentColour =
    BONUS_COLOURS.find((colour) => colour.key === c.colour) || BONUS_COLOURS[0];
  const previewWin = (mult, extra = {}) => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("better-bonus-hunt-preview-win", {
        detail: {
          instanceId: widget?.instanceId || widget?.id || c.__betterInstanceId,
          mult,
          max: extra.max === true,
        },
      }),
    );
  };
  const widgetWidth =
    Number(c.widgetWidth || c.panelWidth) ||
    (c.orientation === "horizontal"
      ? 1080
      : c.orientation === "mainstream"
        ? 372
        : 402);
  const widgetHeight = Number(c.widgetHeight ?? c.panelHeight ?? 0) || 0;
  const edgeRadius = Number(c.edgeRadius ?? c.radius ?? c.cardRadius ?? 14);
  const statRadius = Number(c.statRadius ?? 7);

  return (
    <div className="bp-controls bp-controls--hunt">
      <header className="bp-hunt-deck-head">
        <SlidersHorizontal size={17} />
        <div>
          <h3>Control Deck</h3>
          <p>bonus hunt tracker settings</p>
        </div>
      </header>

      <HuntSection title="Widget Style" icon={<Sparkles size={13} />}>
        <HuntChoiceGrid
          value={c.skin || "modern"}
          options={BONUS_SKINS}
          onChange={(skin) => set({ skin })}
        />
      </HuntSection>

      <HuntSection title="Orientation" icon={<MonitorPlay size={13} />}>
        <HuntChoiceGrid
          value={c.orientation}
          columns={3}
          options={[
            {
              key: "vertical",
              label: "Vertical",
              hint: "Classic tall tracker",
            },
            {
              key: "horizontal",
              label: "Horizontal",
              hint: "Wide two-column layout",
            },
            {
              key: "mainstream",
              label: "Mainstream",
              hint: "Streamer opening layout",
            },
          ]}
          onChange={(orientation) => set({ orientation })}
        />
        <HuntHint>{orientationHint}</HuntHint>
      </HuntSection>

      <HuntSection title="Win FX" icon={<Sparkles size={13} />}>
        <div className="bp-hunt-fx-grid">
          {[
            { mult: 100, label: "100x", icon: Sparkles },
            { mult: 250, label: "250x", icon: Zap },
            { mult: 500, label: "500x", icon: Flame },
            { mult: 1000, label: "1K", icon: Flame },
            { mult: 5000, label: "Max", icon: Crown, max: true },
          ].map(({ mult, label, icon: Icon, max }) => (
            <button
              key={label}
              type="button"
              aria-label={`Preview ${label} win`}
              onClick={() => previewWin(mult, max ? { max: true } : undefined)}
            >
              <Icon size={14} />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <HuntHint>
          Preview celebrations. Overlay code can trigger the same effect with
          window.__boTriggerWin(multiplier).
        </HuntHint>
      </HuntSection>

      <HuntSection title="Session State" icon={<Timer size={13} />}>
        <HuntChoiceGrid
          value={normalizedSessionState}
          columns={3}
          options={BONUS_SESSION_STATES}
          disabled
        />
        <HuntHint>
          {sessionHint}. Synced from Bonus Hunt: {liveBonusCount} slot
          {liveBonusCount === 1 ? "" : "s"}, opening{" "}
          {renderedConfig.bonusOpening ? "on" : "off"}.
        </HuntHint>
      </HuntSection>

      <HuntSection title="Texture" icon={<Layers size={13} />}>
        <HuntChoiceGrid
          value={c.finish}
          columns={5}
          options={BONUS_FINISHES.map((key) => ({ key, label: key }))}
          onChange={(finish) => set({ finish })}
        />
      </HuntSection>

      <HuntSection title="Colour" icon={<Palette size={13} />}>
        <div className="bp-hunt-swatch-row">
          {BONUS_COLOURS.map((colour) => (
            <button
              key={colour.key}
              type="button"
              className={c.colour === colour.key ? "is-active" : ""}
              style={{ background: colour.accent }}
              title={colour.name}
              onClick={() => applyBonusColour(colour.key)}
            />
          ))}
        </div>
        <HuntHint>{currentColour.name}</HuntHint>
      </HuntSection>

      <HuntSection title="Animations" icon={<Wand2 size={13} />}>
        <ToggleRow
          label="Enable motion"
          checked={c.animations}
          onChange={(animations) => set({ animations })}
        />
        <SliderRow
          label="Speed"
          value={c.animSpeed}
          min={0.5}
          max={2}
          step={0.1}
          format={(value) => `${value.toFixed(1)}x`}
          onChange={(animSpeed) => set({ animSpeed })}
        />
      </HuntSection>

      <HuntSection title="Carousel Style" icon={<Layers size={13} />}>
        <HuntChoiceGrid
          value={c.carouselMode}
          columns={3}
          options={[
            { key: "3d", label: "3D Ring" },
            { key: "imagestats", label: "Image Stats" },
            { key: "stats", label: "Slot Stats" },
          ]}
          onChange={(carouselMode) => set({ carouselMode })}
        />
      </HuntSection>

      <HuntSection title="Carousel Timing" icon={<Timer size={13} />}>
        <SliderRow
          label="Rotate every"
          value={c.carouselMs}
          min={1500}
          max={6000}
          step={100}
          format={(value) => `${(value / 1000).toFixed(1)}s`}
          onChange={(carouselMs) => set({ carouselMs })}
        />
      </HuntSection>

      <HuntSection title="Stats Layout" icon={<SlidersHorizontal size={13} />}>
        <HuntChoiceGrid
          value={c.statsLayout || "row"}
          options={[
            { key: "row", label: "4 across", hint: "Single row of stats" },
            { key: "grid", label: "2 x 2", hint: "Two columns and two rows" },
          ]}
          onChange={(statsLayout) => set({ statsLayout })}
        />
      </HuntSection>

      <HuntSection title="Chat Requests" icon={<MessageSquare size={13} />}>
        <ToggleRow
          label="Show requests feed"
          checked={localRequestsVisible}
          onChange={(showRequests) => set({ showRequests })}
        />
        <ToggleRow
          label="Add and shatter animations"
          checked={c.requestActionAnimations === true}
          onChange={(requestActionAnimations) =>
            set({ requestActionAnimations })
          }
        />
        <HuntChoiceGrid
          value={c.requestView || "list"}
          columns={2}
          options={[
            {
              key: "list",
              label: "List",
              hint: "Match the selected Rows, Cards, or Names style",
            },
            {
              key: "carousel",
              label: "3D",
              hint: "Rotate pending requests as cover cards",
            },
          ]}
          onChange={(requestView) => set({ requestView })}
        />
        <HuntHint>
          {liveRequestsVisible
            ? "Live !sr requests use the same view in Streamers Center and OBS."
            : "Hidden because the requests handle is off on the Bonus Hunt page."}
        </HuntHint>
      </HuntSection>

      <HuntSection title="Typography" icon={<Type size={13} />}>
        <HuntChoiceGrid
          value={c.font}
          columns={3}
          options={BONUS_FONTS.map((font) => ({
            key: font.key,
            label: font.name,
          }))}
          onChange={(font) =>
            set({
              font,
              fontFamily:
                BONUS_FONTS.find((item) => item.key === font)?.family ||
                c.fontFamily,
            })
          }
        />
        <SliderRow
          label="UI scale"
          value={c.uiScale}
          min={0.85}
          max={1.2}
          step={0.05}
          format={(value) => `${Math.round(value * 100)}%`}
          onChange={(uiScale) => set({ uiScale })}
        />
      </HuntSection>

      <HuntSection
        title="Sizes & Layout"
        icon={<SlidersHorizontal size={13} />}
      >
        <SliderRow
          label="Widget width"
          value={widgetWidth}
          min={320}
          max={1280}
          step={10}
          unit="px"
          onChange={(value) =>
            setBonusSize({ widgetWidth: value, panelWidth: value })
          }
        />
        <SliderRow
          label="Widget height"
          value={widgetHeight}
          min={0}
          max={980}
          step={10}
          format={(value) => (value === 0 ? "Auto" : `${value}px`)}
          onChange={(value) =>
            setBonusSize({ widgetHeight: value, panelHeight: value })
          }
        />
        <SliderRow
          label="Rounded edges"
          value={edgeRadius}
          min={0}
          max={36}
          unit="px"
          onChange={(value) =>
            set({ edgeRadius: value, radius: value, cardRadius: value })
          }
        />
        <SliderRow
          label="Stat box corners"
          value={statRadius}
          min={0}
          max={22}
          unit="px"
          onChange={(statRadius) => set({ statRadius })}
        />
        <SliderRow
          label="Progress bar"
          value={c.barHeight}
          min={3}
          max={10}
          unit="px"
          onChange={(barHeight) => set({ barHeight })}
        />
        <SliderRow
          label="Avatar"
          value={c.avatarSize}
          min={20}
          max={44}
          step={2}
          unit="px"
          onChange={(avatarSize) => set({ avatarSize })}
        />
        <SliderRow
          label="Visible rows"
          value={c.visibleRows}
          min={3}
          max={8}
          onChange={(visibleRows) => set({ visibleRows })}
        />
      </HuntSection>

      <HuntSection title="List Style" icon={<List size={13} />}>
        <HuntChoiceGrid
          value={c.listMode}
          columns={3}
          options={[
            { key: "compact", label: "Rows" },
            { key: "image", label: "Cards" },
            { key: "names", label: "Names" },
          ]}
          onChange={(listMode) => set({ listMode })}
        />
      </HuntSection>

      <HuntSection title="Best / Worst Card" icon={<Layers size={13} />}>
        <ToggleRow
          label="Always visible"
          checked={drawerAlwaysVisible}
          onChange={(drawerAlwaysVisible) => set({ drawerAlwaysVisible })}
        />
        {drawerAlwaysVisible ? (
          <HuntHint>
            Best and worst stay below the widget, matching Expand mode.
          </HuntHint>
        ) : (
          <>
            <HuntChoiceGrid
              value={normalizedDrawerMode}
              options={[
                {
                  key: "contain",
                  label: "Contain",
                  hint: "Keep panel height",
                },
                { key: "expand", label: "Expand", hint: "Grow from bottom" },
              ]}
              onChange={(drawerMode) => set({ drawerMode })}
            />
            <SliderRow
              label="Reveal every"
              value={drawerRevealSeconds}
              min={10}
              max={90}
              step={5}
              unit="s"
              onChange={(drawerRevealSeconds) => set({ drawerRevealSeconds })}
            />
            <SliderRow
              label="Stay visible"
              value={drawerHoldSeconds}
              min={12}
              max={30}
              step={1}
              unit="s"
              onChange={(drawerHoldSeconds) => set({ drawerHoldSeconds })}
            />
            <HuntHint>{drawerHint}</HuntHint>
          </>
        )}
      </HuntSection>

      <button
        className="bp-reset bp-hunt-reset"
        type="button"
        onClick={() => onChange(DEFAULT_BETTER_CONFIG.bonus_hunt)}
      >
        <RotateCcw size={13} /> Reset defaults
      </button>
    </div>
  );
}

function BetterSlideshowFrameControls({
  config,
  onChange,
  widget,
  onWidgetChange,
}) {
  const c = ensureBetterWidgetConfig("slideshow_frame", config);
  const [tab, setTab] = useTab("media");
  const tabs = [
    ["media", <ImagePlus size={12} />, "Media"],
    ["frame", <Frame size={12} />, "Frame"],
    ["timing", <Timer size={12} />, "Timing"],
    ["size", <Maximize2 size={12} />, "Size"],
  ];
  const current = tabs.some(([key]) => key === tab) ? tab : "media";
  const widgetWidth = clampNumber(widget?.width, 240, 1920, 960);
  const widgetHeight = clampNumber(widget?.height, 120, 1080, 360);

  const set = (patch) => {
    onChange(ensureBetterWidgetConfig("slideshow_frame", { ...c, ...patch }));
  };

  const setWidget = (layoutPatch = {}, configPatch = {}) => {
    const nextConfig = ensureBetterWidgetConfig("slideshow_frame", {
      ...c,
      ...configPatch,
    });
    if (typeof onWidgetChange === "function") {
      onWidgetChange({ ...layoutPatch, config: nextConfig });
      return;
    }
    onChange(nextConfig);
  };

  const applyAspect = (aspectPreset) => {
    const preset = SLIDESHOW_ASPECT_PRESETS.find(
      (item) => item.key === aspectPreset,
    );
    if (!preset) {
      set({ aspectPreset });
      return;
    }
    setWidget({ width: preset.width, height: preset.height }, { aspectPreset });
  };

  return (
    <div className="bp-controls">
      <PanelTabs active={current} onChange={setTab} tabs={tabs} />

      {current === "media" && (
        <>
          <Section title="Media links" icon={<ImagePlus size={13} />}>
            <TextAreaRow
              label="Image and video URLs"
              value={c.mediaText}
              rows={8}
              placeholder={
                "One URL per line. Add |video or |image when the URL has no extension."
              }
              onChange={(mediaText) => set({ mediaText })}
            />
            <p className="bp-hint">
              Supported lines: URL, URL|image|Label, or URL|video|Label.
            </p>
            <div className="bp-preset-row">
              <button
                type="button"
                onClick={() => set({ mediaText: SLIDESHOW_SAMPLE_MEDIA })}
              >
                <ImagePlus size={12} />
                Sample media
              </button>
              <button type="button" onClick={() => set({ mediaText: "" })}>
                <RotateCcw size={12} />
                Clear
              </button>
            </div>
            <ToggleRow
              label="Show slide counter"
              checked={c.showCounter}
              onChange={(showCounter) => set({ showCounter })}
            />
            <ToggleRow
              label="Connect 4 takeover"
              checked={c.showConnectFour}
              onChange={(showConnectFour) => set({ showConnectFour })}
            />
            <p className="bp-hint">
              Pauses the slideshow and brings the live Connect 4 match into this
              frame.
            </p>
          </Section>
        </>
      )}

      {current === "frame" && (
        <>
          <Section title="Frame style" icon={<Frame size={13} />}>
            <Segmented
              value={c.frameStyle}
              columns={3}
              options={SLIDESHOW_FRAME_STYLES}
              onChange={(frameStyle) => set({ frameStyle })}
            />
          </Section>
          <Section title="Colour" icon={<Palette size={13} />}>
            <div className="bp-preset-row">
              {SLIDESHOW_COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => set(preset.patch)}
                >
                  <i
                    style={{
                      background: `linear-gradient(135deg, ${preset.patch.frameColor}, ${preset.patch.accentColor})`,
                    }}
                  />
                  {preset.name}
                </button>
              ))}
            </div>
            <div className="bp-color-grid">
              <ColorRow
                label="Frame"
                value={c.frameColor}
                onChange={(frameColor) => set({ frameColor })}
              />
              <ColorRow
                label="Accent"
                value={c.accentColor}
                onChange={(accentColor) => set({ accentColor })}
              />
              <ColorRow
                label="Background"
                value={c.backgroundColor}
                onChange={(backgroundColor) => set({ backgroundColor })}
              />
            </div>
          </Section>
          <Section title="Shape" icon={<Layers size={13} />}>
            <SliderRow
              label="Corner radius"
              value={c.radius}
              min={0}
              max={80}
              unit="px"
              onChange={(radius) => set({ radius })}
            />
            <SliderRow
              label="Border width"
              value={c.borderWidth}
              min={0}
              max={10}
              unit="px"
              onChange={(borderWidth) => set({ borderWidth })}
            />
            <SliderRow
              label="Padding"
              value={c.padding}
              min={0}
              max={60}
              unit="px"
              onChange={(padding) => set({ padding })}
            />
            <SliderRow
              label="Glow"
              value={c.glow}
              min={0}
              max={160}
              unit="%"
              onChange={(glow) => set({ glow })}
            />
          </Section>
        </>
      )}

      {current === "timing" && (
        <>
          <Section title="Slideshow timing" icon={<Timer size={13} />}>
            <ToggleRow
              label="Autoplay"
              checked={c.autoplay}
              onChange={(autoplay) => set({ autoplay })}
            />
            <SliderRow
              label="Slide duration"
              value={c.slideMs}
              min={1000}
              max={30000}
              step={250}
              format={(value) =>
                `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 2)}s`
              }
              onChange={(slideMs) => set({ slideMs })}
            />
            <Segmented
              value={c.transition}
              columns={4}
              options={SLIDESHOW_TRANSITIONS}
              onChange={(transition) => set({ transition })}
            />
            <SliderRow
              label="Transition"
              value={c.transitionMs}
              min={0}
              max={2500}
              step={50}
              format={(value) =>
                `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 2)}s`
              }
              onChange={(transitionMs) => set({ transitionMs })}
            />
          </Section>
          <Section title="Video playback" icon={<MonitorPlay size={13} />}>
            <ToggleRow
              label="Muted"
              checked={c.videoMuted}
              onChange={(videoMuted) => set({ videoMuted })}
            />
            <ToggleRow
              label="Loop videos"
              checked={c.videoLoop}
              onChange={(videoLoop) => set({ videoLoop })}
            />
            <ToggleRow
              label="Show video controls"
              checked={c.showVideoControls}
              onChange={(showVideoControls) => set({ showVideoControls })}
            />
          </Section>
        </>
      )}

      {current === "size" && (
        <>
          <Section title="Aspect ratios" icon={<Maximize2 size={13} />}>
            <div className="bp-preset-row">
              {SLIDESHOW_ASPECT_PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  className={c.aspectPreset === preset.key ? "is-active" : ""}
                  onClick={() => applyAspect(preset.key)}
                >
                  <MonitorPlay size={12} />
                  {preset.label}
                </button>
              ))}
            </div>
            <SliderRow
              label="Canvas width"
              value={widgetWidth}
              min={240}
              max={1920}
              step={10}
              unit="px"
              onChange={(width) =>
                setWidget({ width }, { aspectPreset: "custom" })
              }
            />
            <SliderRow
              label="Canvas height"
              value={widgetHeight}
              min={120}
              max={1080}
              step={10}
              unit="px"
              onChange={(height) =>
                setWidget({ height }, { aspectPreset: "custom" })
              }
            />
          </Section>
          <Section title="Media fit" icon={<Frame size={13} />}>
            <Segmented
              value={c.fit}
              columns={2}
              options={SLIDESHOW_FITS}
              onChange={(fit) => set({ fit })}
            />
          </Section>
          <button
            className="bp-reset"
            type="button"
            onClick={() =>
              setWidget(
                { width: 960, height: 360 },
                DEFAULT_BETTER_CONFIG.slideshow_frame,
              )
            }
          >
            <RotateCcw size={13} />
            Reset slideshow
          </button>
        </>
      )}
    </div>
  );
}

const TOURNAMENT_LAYOUTS = [
  { key: "grid", name: "Grid" },
  { key: "vertical", name: "Vertical" },
  { key: "minimal", name: "Minimal" },
  { key: "arena", name: "Arena" },
  { key: "esports", name: "Esports" },
  { key: "scoreboard", name: "Scoreboard" },
];

const TOURNAMENT_FONTS = [
  { value: "'Rajdhani', sans-serif", label: "Rajdhani" },
  { value: "'Barlow Condensed', sans-serif", label: "Barlow Condensed" },
  { value: "'Orbitron', sans-serif", label: "Orbitron" },
  { value: "'Arial Narrow', sans-serif", label: "Arial Narrow" },
];

const TOURNAMENT_APPEARANCE_KEYS = Object.freeze([
  "layout",
  "showBg",
  "bgColor",
  "borderColor",
  "borderRadius",
  "borderWidth",
  "mainCardPadding",
  "mainShadowColor",
  "mainShadowBlur",
  "mainShadowOpacity",
  "mainGlow",
  "mainBackdropBlur",
  "containerPadding",
  "cardGap",
  "cardBg",
  "cardBorder",
  "cardRadius",
  "cardBorderWidth",
  "nameColor",
  "multiColor",
  "slotNameColor",
  "nameSize",
  "multiSize",
  "slotNameSize",
  "fontFamily",
  "showSlotName",
  "slotImageRadius",
  "swordSize",
  "swordColor",
  "swordBg",
  "xIconColor",
  "xIconBg",
  "activeStatusColor",
  "statusBadgeBg",
  "scoreNeutralColor",
  "scoreNegativeColor",
  "eliminatedOpacity",
  "arenaAccent",
  "arenaWinColor",
  "arenaCardBg",
  "arenaLoseOpacity",
  "esCyan",
  "esPurple",
  "esGold",
  "esBg",
  "esCardBg",
  "esBorder",
  "sbAccent",
  "sbHeaderBg",
  "sbCardBg",
  "sbTextColor",
  "sbPayColor",
  "sbMultiColor",
  "sbWinColor",
  "sbLoseColor",
  "sbTabBg",
  "sbTabActive",
]);

function tournamentColor(value, fallback) {
  return /^#[0-9a-f]{6}$/i.test(String(value || "")) ? value : fallback;
}

function BetterTournamentControls({
  config,
  onChange,
  widget,
  onWidgetChange,
}) {
  const defaults = DEFAULT_BETTER_CONFIG.tournament;
  const c = ensureBetterWidgetConfig("tournament", config);
  const [tab, setTab] = useTab("surface");
  const tabs = [
    ["surface", <Frame size={12} />, "Main card"],
    ["layout", <Maximize2 size={12} />, "Layout"],
    ["cards", <Layers size={12} />, "Cards"],
    ["type", <Type size={12} />, "Text"],
    ["palette", <Palette size={12} />, "Palette"],
  ];
  const set = (patch) => onChange({ ...c, ...patch });
  const setSize = (patch) => {
    if (typeof onWidgetChange !== "function") return;
    onWidgetChange({
      width: patch.width ?? widget?.width,
      height: patch.height ?? widget?.height,
      config: c,
    });
  };
  const resetAppearance = () => {
    const next = { ...c };
    for (const key of TOURNAMENT_APPEARANCE_KEYS) {
      if (Object.prototype.hasOwnProperty.call(defaults, key))
        next[key] = defaults[key];
      else delete next[key];
    }
    onChange(next);
  };

  return (
    <div className="bp-controls">
      <PanelTabs active={tab} onChange={setTab} tabs={tabs} />

      {tab === "surface" && (
        <>
          <Section title="Main card" icon={<Frame size={13} />}>
            <ToggleRow
              label="Show background"
              checked={c.showBg !== false}
              onChange={(showBg) => set({ showBg })}
            />
            {c.showBg !== false && (
              <>
                <ColorRow
                  label="Background"
                  value={tournamentColor(c.bgColor, defaults.bgColor)}
                  onChange={(bgColor) => set({ bgColor })}
                />
                <ColorRow
                  label="Border"
                  value={tournamentColor(c.borderColor, defaults.borderColor)}
                  onChange={(borderColor) => set({ borderColor })}
                />
                <SliderRow
                  label="Border width"
                  value={c.borderWidth}
                  min={0}
                  max={8}
                  unit="px"
                  onChange={(borderWidth) => set({ borderWidth })}
                />
                <SliderRow
                  label="Rounded corners"
                  value={c.borderRadius}
                  min={0}
                  max={48}
                  unit="px"
                  onChange={(borderRadius) => set({ borderRadius })}
                />
                <SliderRow
                  label="Outer padding"
                  value={c.mainCardPadding}
                  min={0}
                  max={40}
                  unit="px"
                  onChange={(mainCardPadding) => set({ mainCardPadding })}
                />
              </>
            )}
          </Section>
          <Section title="Shadow & depth" icon={<Sparkles size={13} />}>
            <ColorRow
              label="Shadow"
              value={tournamentColor(
                c.mainShadowColor,
                defaults.mainShadowColor,
              )}
              onChange={(mainShadowColor) => set({ mainShadowColor })}
            />
            <SliderRow
              label="Shadow blur"
              value={c.mainShadowBlur}
              min={0}
              max={80}
              unit="px"
              onChange={(mainShadowBlur) => set({ mainShadowBlur })}
            />
            <SliderRow
              label="Shadow opacity"
              value={c.mainShadowOpacity}
              min={0}
              max={100}
              unit="%"
              onChange={(mainShadowOpacity) => set({ mainShadowOpacity })}
            />
            <SliderRow
              label="Accent glow"
              value={c.mainGlow}
              min={0}
              max={60}
              unit="px"
              onChange={(mainGlow) => set({ mainGlow })}
            />
            <SliderRow
              label="Backdrop blur"
              value={c.mainBackdropBlur}
              min={0}
              max={30}
              unit="px"
              onChange={(mainBackdropBlur) => set({ mainBackdropBlur })}
            />
          </Section>
        </>
      )}

      {tab === "layout" && (
        <>
          <Section title="Visual layout" icon={<MonitorPlay size={13} />}>
            <Segmented
              value={c.layout}
              columns={3}
              options={TOURNAMENT_LAYOUTS}
              onChange={(layout) => set({ layout })}
            />
          </Section>
          <Section title="Canvas & spacing" icon={<Maximize2 size={13} />}>
            <SliderRow
              label="Widget width"
              value={Number(widget?.width) || 960}
              min={320}
              max={1920}
              step={10}
              unit="px"
              onChange={(width) => setSize({ width })}
            />
            <SliderRow
              label="Widget height"
              value={Number(widget?.height) || 720}
              min={220}
              max={1080}
              step={10}
              unit="px"
              onChange={(height) => setSize({ height })}
            />
            <SliderRow
              label="Content padding"
              value={c.containerPadding}
              min={0}
              max={32}
              unit="px"
              onChange={(containerPadding) => set({ containerPadding })}
            />
            <SliderRow
              label="Card gap"
              value={c.cardGap}
              min={0}
              max={32}
              unit="px"
              onChange={(cardGap) => set({ cardGap })}
            />
          </Section>
        </>
      )}

      {tab === "cards" && (
        <>
          <Section title="Match cards" icon={<Layers size={13} />}>
            <ColorRow
              label="Card background"
              value={tournamentColor(c.cardBg, defaults.cardBg)}
              onChange={(cardBg) => set({ cardBg })}
            />
            <ColorRow
              label="Card border"
              value={tournamentColor(c.cardBorder, defaults.cardBorder)}
              onChange={(cardBorder) => set({ cardBorder })}
            />
            <SliderRow
              label="Card border"
              value={c.cardBorderWidth}
              min={0}
              max={6}
              unit="px"
              onChange={(cardBorderWidth) => set({ cardBorderWidth })}
            />
            <SliderRow
              label="Card corners"
              value={c.cardRadius}
              min={0}
              max={36}
              unit="px"
              onChange={(cardRadius) => set({ cardRadius })}
            />
            <SliderRow
              label="Eliminated opacity"
              value={Math.round(Number(c.eliminatedOpacity) * 100)}
              min={10}
              max={100}
              unit="%"
              onChange={(value) => set({ eliminatedOpacity: value / 100 })}
            />
          </Section>
          <Section title="Slot images" icon={<ImagePlus size={13} />}>
            <ToggleRow
              label="Show slot names"
              checked={c.showSlotName !== false}
              onChange={(showSlotName) => set({ showSlotName })}
            />
            <SliderRow
              label="Image corners"
              value={c.slotImageRadius}
              min={0}
              max={36}
              unit="px"
              onChange={(slotImageRadius) => set({ slotImageRadius })}
            />
          </Section>
        </>
      )}

      {tab === "type" && (
        <>
          <Section title="Typography" icon={<Type size={13} />}>
            <SelectRow
              label="Font"
              value={c.fontFamily}
              options={TOURNAMENT_FONTS}
              onChange={(fontFamily) => set({ fontFamily })}
            />
            <ColorRow
              label="Player names"
              value={tournamentColor(c.nameColor, defaults.nameColor)}
              onChange={(nameColor) => set({ nameColor })}
            />
            <SliderRow
              label="Player size"
              value={c.nameSize}
              min={9}
              max={34}
              unit="px"
              onChange={(nameSize) => set({ nameSize })}
            />
            <ColorRow
              label="Score values"
              value={tournamentColor(c.multiColor, defaults.multiColor)}
              onChange={(multiColor) => set({ multiColor })}
            />
            <SliderRow
              label="Score size"
              value={c.multiSize}
              min={9}
              max={40}
              unit="px"
              onChange={(multiSize) => set({ multiSize })}
            />
            <ColorRow
              label="Slot names"
              value={tournamentColor(c.slotNameColor, defaults.slotNameColor)}
              onChange={(slotNameColor) => set({ slotNameColor })}
            />
            <SliderRow
              label="Slot name size"
              value={c.slotNameSize}
              min={8}
              max={24}
              unit="px"
              onChange={(slotNameSize) => set({ slotNameSize })}
            />
          </Section>
          <Section title="Status & connector" icon={<Zap size={13} />}>
            <ColorRow
              label="Live status"
              value={tournamentColor(
                c.activeStatusColor,
                defaults.activeStatusColor,
              )}
              onChange={(activeStatusColor) => set({ activeStatusColor })}
            />
            <ColorRow
              label="Status background"
              value={tournamentColor(c.statusBadgeBg, defaults.statusBadgeBg)}
              onChange={(statusBadgeBg) => set({ statusBadgeBg })}
            />
            <ColorRow
              label="Negative score"
              value={tournamentColor(
                c.scoreNegativeColor,
                defaults.scoreNegativeColor,
              )}
              onChange={(scoreNegativeColor) => set({ scoreNegativeColor })}
            />
            <ColorRow
              label="Connector"
              value={tournamentColor(c.swordColor, defaults.swordColor)}
              onChange={(swordColor) => set({ swordColor })}
            />
            <SliderRow
              label="Connector size"
              value={c.swordSize}
              min={12}
              max={54}
              unit="px"
              onChange={(swordSize) => set({ swordSize })}
            />
          </Section>
        </>
      )}

      {tab === "palette" && (
        <Section title={`${c.layout} palette`} icon={<Palette size={13} />}>
          {c.layout === "arena" ? (
            <>
              <ColorRow
                label="Arena accent"
                value={tournamentColor(c.arenaAccent, defaults.swordColor)}
                onChange={(arenaAccent) => set({ arenaAccent })}
              />
              <ColorRow
                label="Winner"
                value={tournamentColor(c.arenaWinColor, "#22c55e")}
                onChange={(arenaWinColor) => set({ arenaWinColor })}
              />
              <ColorRow
                label="Arena cards"
                value={tournamentColor(c.arenaCardBg, defaults.cardBg)}
                onChange={(arenaCardBg) => set({ arenaCardBg })}
              />
            </>
          ) : c.layout === "scoreboard" ? (
            <>
              <ColorRow
                label="Accent"
                value={tournamentColor(c.sbAccent, "#3b82f6")}
                onChange={(sbAccent) => set({ sbAccent })}
              />
              <ColorRow
                label="Header"
                value={tournamentColor(c.sbHeaderBg, "#050b16")}
                onChange={(sbHeaderBg) => set({ sbHeaderBg })}
              />
              <ColorRow
                label="Cards"
                value={tournamentColor(c.sbCardBg, "#1a1d2e")}
                onChange={(sbCardBg) => set({ sbCardBg })}
              />
              <ColorRow
                label="Winner"
                value={tournamentColor(c.sbWinColor, "#22c55e")}
                onChange={(sbWinColor) => set({ sbWinColor })}
              />
              <ColorRow
                label="Loser"
                value={tournamentColor(c.sbLoseColor, "#ef4444")}
                onChange={(sbLoseColor) => set({ sbLoseColor })}
              />
            </>
          ) : (
            <>
              <ColorRow
                label="Cyan accent"
                value={tournamentColor(c.esCyan, "#00e5ff")}
                onChange={(esCyan) => set({ esCyan })}
              />
              <ColorRow
                label="Secondary"
                value={tournamentColor(c.esPurple, "#64748b")}
                onChange={(esPurple) => set({ esPurple })}
              />
              <ColorRow
                label="Gold"
                value={tournamentColor(c.esGold, "#fbbf24")}
                onChange={(esGold) => set({ esGold })}
              />
              <ColorRow
                label="Layout background"
                value={tournamentColor(c.esBg, "#030712")}
                onChange={(esBg) => set({ esBg })}
              />
              <ColorRow
                label="Layout border"
                value={tournamentColor(c.esBorder, defaults.cardBorder)}
                onChange={(esBorder) => set({ esBorder })}
              />
            </>
          )}
        </Section>
      )}

      <button className="bp-reset" type="button" onClick={resetAppearance}>
        <RotateCcw size={13} /> Reset appearance
      </button>
    </div>
  );
}

const SHOUTOUT_FRAME_STYLES = [
  { value: "neon", label: "Neon", icon: <Zap size={11} /> },
  { value: "glass", label: "Glass", icon: <Sparkles size={11} /> },
  { value: "retro", label: "Retro", icon: <Frame size={11} /> },
  { value: "minimal", label: "Minimal", icon: <Layers size={11} /> },
  { value: "gaming", label: "Gaming", icon: <Gauge size={11} /> },
];

const SHOUTOUT_ANIMATIONS = [
  { value: "slide-left", label: "From left" },
  { value: "slide-right", label: "From right" },
  { value: "slide-top", label: "From top" },
  { value: "slide-bottom", label: "From bottom" },
  { value: "zoom", label: "Zoom" },
  { value: "flip", label: "Flip" },
  { value: "bounce", label: "Bounce" },
  { value: "glitch", label: "Glitch" },
  { value: "roll", label: "Roll" },
];

const SHOUTOUT_FONTS = [
  { value: "'Rajdhani', sans-serif", label: "Rajdhani" },
  { value: "'Chakra Petch', sans-serif", label: "Chakra Petch" },
  { value: "'Orbitron', sans-serif", label: "Orbitron" },
  { value: "'Oswald', sans-serif", label: "Oswald" },
];

function BetterRaidShoutoutControls({
  config,
  onChange,
  widget,
  onWidgetChange,
}) {
  const defaults = DEFAULT_BETTER_CONFIG.raid_shoutout;
  const c = ensureBetterWidgetConfig("raid_shoutout", config);
  const [tab, setTab] = useTab("content");
  const set = (patch) => onChange({ ...c, ...patch });
  const setSize = (patch) => {
    if (typeof onWidgetChange !== "function") return;
    onWidgetChange({
      width: patch.width ?? widget?.width,
      height: patch.height ?? widget?.height,
      config: c,
    });
  };
  const tabs = [
    ["content", <MessageSquare key="content" size={12} />, "Content"],
    ["playback", <MonitorPlay key="playback" size={12} />, "Playback"],
    ["frame", <Frame key="frame" size={12} />, "Frame"],
    ["motion", <Wand2 key="motion" size={12} />, "Motion"],
    ["type", <Type key="type" size={12} />, "Type"],
    ["colours", <Palette key="colours" size={12} />, "Colours"],
  ];

  return (
    <div className="bp-controls">
      <PanelTabs active={tab} onChange={setTab} tabs={tabs} />

      {tab === "content" && (
        <Section title="Headline" icon={<MessageSquare size={13} />}>
          <TextRow
            label="Heading text"
            value={c.headingText}
            onChange={(headingText) => set({ headingText })}
          />
          <ToggleRow
            label="Streamer name"
            checked={c.showStreamerInfo !== false}
            onChange={(showStreamerInfo) => set({ showStreamerInfo })}
          />
          <ToggleRow
            label="Clip title"
            checked={c.showClipTitle !== false}
            onChange={(showClipTitle) => set({ showClipTitle })}
          />
          <ToggleRow
            label="View count"
            checked={c.showViews !== false}
            onChange={(showViews) => set({ showViews })}
          />
          <ToggleRow
            label="Countdown"
            checked={c.showTimer !== false}
            onChange={(showTimer) => set({ showTimer })}
          />
          <ToggleRow
            label="Channel footer"
            checked={c.showFooter !== false}
            onChange={(showFooter) => set({ showFooter })}
          />
        </Section>
      )}

      {tab === "playback" && (
        <Section title="Alert playback" icon={<MonitorPlay size={13} />}>
          <SliderRow
            label="Display duration"
            value={c.displayDuration}
            min={10}
            max={120}
            unit="s"
            onChange={(displayDuration) => set({ displayDuration })}
          />
          <ToggleRow
            label="Close when clip ends"
            checked={c.dismissOnClipEnd === true}
            onChange={(dismissOnClipEnd) => set({ dismissOnClipEnd })}
          />
        </Section>
      )}

      {tab === "frame" && (
        <>
          <Section title="Frame style" icon={<Frame size={13} />}>
            <Segmented
              value={c.frameStyle}
              options={SHOUTOUT_FRAME_STYLES}
              columns={2}
              onChange={(frameStyle) => set({ frameStyle })}
            />
            <SliderRow
              label="Rounded corners"
              value={c.borderRadius}
              min={0}
              max={48}
              unit="px"
              onChange={(borderRadius) => set({ borderRadius })}
            />
            <SliderRow
              label="Border width"
              value={c.borderWidth}
              min={0}
              max={8}
              unit="px"
              onChange={(borderWidth) => set({ borderWidth })}
            />
            <SliderRow
              label="Glow"
              value={c.glowIntensity}
              min={0}
              max={100}
              unit="%"
              onChange={(glowIntensity) => set({ glowIntensity })}
            />
            <ToggleRow
              label="Corner lights"
              checked={c.showCornerDots !== false}
              onChange={(showCornerDots) => set({ showCornerDots })}
            />
            <ToggleRow
              label="Scanning light"
              checked={c.showScanline !== false}
              onChange={(showScanline) => set({ showScanline })}
            />
          </Section>
          <Section title="Widget size" icon={<Maximize2 size={13} />}>
            <SliderRow
              label="Width"
              value={Number(widget?.width) || 640}
              min={240}
              max={1280}
              step={10}
              unit="px"
              onChange={(width) => setSize({ width })}
            />
            <SliderRow
              label="Height"
              value={Number(widget?.height) || 360}
              min={135}
              max={720}
              step={10}
              unit="px"
              onChange={(height) => setSize({ height })}
            />
          </Section>
        </>
      )}

      {tab === "motion" && (
        <Section title="Entrance animation" icon={<Wand2 size={13} />}>
          <Segmented
            value={c.animation}
            options={SHOUTOUT_ANIMATIONS}
            columns={2}
            onChange={(animation) => set({ animation })}
          />
        </Section>
      )}

      {tab === "type" && (
        <Section title="Typography" icon={<Type size={13} />}>
          <SelectRow
            label="Font"
            value={c.fontFamily}
            options={SHOUTOUT_FONTS}
            onChange={(fontFamily) => set({ fontFamily })}
          />
          <SliderRow
            label="Avatar size"
            value={c.avatarSize}
            min={24}
            max={96}
            unit="px"
            onChange={(avatarSize) => set({ avatarSize })}
          />
          <SliderRow
            label="Title size"
            value={c.titleSize}
            min={10}
            max={32}
            unit="px"
            onChange={(titleSize) => set({ titleSize })}
          />
          <SliderRow
            label="Subtitle size"
            value={c.subtitleSize}
            min={8}
            max={24}
            unit="px"
            onChange={(subtitleSize) => set({ subtitleSize })}
          />
        </Section>
      )}

      {tab === "colours" && (
        <Section title="Palette" icon={<Palette size={13} />}>
          <ColorRow
            label="Accent"
            value={c.accentColor}
            onChange={(accentColor) => set({ accentColor })}
          />
          <ColorRow
            label="Secondary"
            value={c.secondaryColor}
            onChange={(secondaryColor) => set({ secondaryColor })}
          />
          <ColorRow
            label="Background"
            value={c.backgroundColor}
            onChange={(backgroundColor) => set({ backgroundColor })}
          />
          <ColorRow
            label="Text"
            value={c.textColor}
            onChange={(textColor) => set({ textColor })}
          />
          <ColorRow
            label="Muted text"
            value={c.mutedColor}
            onChange={(mutedColor) => set({ mutedColor })}
          />
        </Section>
      )}

      <button
        className="bp-reset"
        type="button"
        onClick={() => onChange(defaults)}
      >
        <RotateCcw size={13} /> Reset widget
      </button>
    </div>
  );
}

function BetterConnectFourControls({ config, onChange }) {
  const defaults = DEFAULT_BETTER_CONFIG.connect_four;
  const mergedConfig = ensureBetterWidgetConfig("connect_four", config);
  const c = {
    ...mergedConfig,
    chatCommand:
      mergedConfig.chatCommand === "!connect4"
        ? "!c4"
        : mergedConfig.chatCommand,
  };
  const [tab, setTab] = useTab("content");
  const set = (patch) => onChange({ ...c, ...patch });
  const tabs = [
    ["content", <MessageSquare key="content" size={12} />, "Content"],
    ["players", <Users key="players" size={12} />, "Players"],
    ["board", <Palette key="board" size={12} />, "Board"],
    ["type", <Type key="type" size={12} />, "Type"],
    ["motion", <Wand2 key="motion" size={12} />, "Motion"],
  ];

  return (
    <div className="bp-controls">
      <PanelTabs active={tab} onChange={setTab} tabs={tabs} />

      {tab === "content" && (
        <Section title="Game details" icon={<Gamepad2 size={13} />}>
          <TextRow
            label="Header title"
            value={c.title}
            onChange={(title) => set({ title: title.slice(0, 32) })}
          />
          <TextRow
            label="Chat command"
            value={c.chatCommand}
            onChange={(chatCommand) => set({ chatCommand })}
          />
          <TextRow
            label="Twitch channel"
            value={c.twitchChannel}
            onChange={(twitchChannel) => set({ twitchChannel })}
          />
          <ToggleRow
            label="Show wager"
            checked={c.showWager !== false}
            onChange={(showWager) => set({ showWager })}
          />
        </Section>
      )}

      {tab === "players" && (
        <Section title="Players" icon={<Users size={13} />}>
          <ToggleRow
            label="Show player names"
            checked={c.showPlayers !== false}
            onChange={(showPlayers) => set({ showPlayers })}
          />
          <ColorRow
            label="Player one"
            value={c.playerOneColor}
            onChange={(playerOneColor) => set({ playerOneColor })}
          />
          <ColorRow
            label="Player two"
            value={c.playerTwoColor}
            onChange={(playerTwoColor) => set({ playerTwoColor })}
          />
        </Section>
      )}

      {tab === "board" && (
        <Section title="Board" icon={<Palette size={13} />}>
          <SliderRow
            label="Board size"
            value={c.boardScale}
            min={40}
            max={100}
            unit="%"
            onChange={(boardScale) => set({ boardScale })}
          />
          <ColorRow
            label="Board color"
            value={c.boardColor}
            onChange={(boardColor) => set({ boardColor })}
          />
          <ColorRow
            label="Board border"
            value={c.boardBorderColor}
            onChange={(boardBorderColor) => set({ boardBorderColor })}
          />
        </Section>
      )}

      {tab === "type" && (
        <Section title="Typography" icon={<Type size={13} />}>
          <SelectRow
            label="Font"
            value={c.fontFamily}
            options={CONNECT_FOUR_FONTS}
            onChange={(fontFamily) => set({ fontFamily })}
          />
          <ColorRow
            label="Title"
            value={c.titleColor}
            onChange={(titleColor) => set({ titleColor })}
          />
          <ColorRow
            label="Main text"
            value={c.textColor}
            onChange={(textColor) => set({ textColor })}
          />
          <ColorRow
            label="Secondary text"
            value={c.mutedColor}
            onChange={(mutedColor) => set({ mutedColor })}
          />
        </Section>
      )}

      {tab === "motion" && (
        <Section title="Move animation" icon={<Wand2 size={13} />}>
          <ToggleRow
            label="Animate coin drops"
            checked={c.animateDrops !== false}
            onChange={(animateDrops) => set({ animateDrops })}
          />
        </Section>
      )}

      <button
        className="bp-reset"
        type="button"
        onClick={() => onChange(defaults)}
      >
        <RotateCcw size={13} /> Reset widget
      </button>
    </div>
  );
}

export function BetterWidgetControls({
  type,
  config,
  onChange,
  user,
  widget,
  onWidgetChange,
}) {
  if (type === "connect_four") {
    return <BetterConnectFourControls config={config} onChange={onChange} />;
  }
  if (type === "raid_shoutout") {
    return (
      <BetterRaidShoutoutControls
        config={config}
        onChange={onChange}
        widget={widget}
        onWidgetChange={onWidgetChange}
      />
    );
  }
  if (type === "tournament") {
    return (
      <BetterTournamentControls
        config={config}
        onChange={onChange}
        widget={widget}
        onWidgetChange={onWidgetChange}
      />
    );
  }
  if (type === "slideshow_frame") {
    return (
      <BetterSlideshowFrameControls
        config={config}
        onChange={onChange}
        widget={widget}
        onWidgetChange={onWidgetChange}
      />
    );
  }
  if (type === "navbar") {
    return (
      <BetterNavbarControls
        config={config}
        onChange={onChange}
        user={user}
        widget={widget}
        onWidgetChange={onWidgetChange}
      />
    );
  }
  if (type === "bets")
    return <BetterBetsControls config={config} onChange={onChange} />;
  if (type === "chat") {
    return (
      <BetterChatControls
        config={config}
        onChange={onChange}
        widget={widget}
        onWidgetChange={onWidgetChange}
      />
    );
  }
  return (
    <SimpleThemedControls
      type={type}
      config={config}
      onChange={onChange}
      onWidgetChange={onWidgetChange}
      widget={widget}
    />
  );
}
