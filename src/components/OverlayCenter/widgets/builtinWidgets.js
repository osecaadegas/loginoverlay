/**
 * Better Editor live data-source widgets.
 *
 * The legacy Appearance Center and non-Better widgets were removed. This
 * registry intentionally exposes only the widget types rendered by /editor.
 */
import { registerWidget } from "./widgetRegistry";

import BackgroundConfig from "./background/BackgroundConfig";
import BackgroundWidget from "./background/BackgroundWidget";
import BetsConfig from "./bets/BetsConfig";
import BetsWidget from "./bets/BetsWidget";
import BonusHuntConfig from "./bonus-hunt/BonusHuntConfig";
import BonusHuntWidget from "./bonus-hunt/BonusHuntWidget";
import ChatConfig from "./chat/ChatConfig";
import ChatWidget from "./chat/ChatWidget";
import GiveawayConfig from "./giveaway/GiveawayConfig";
import GiveawayWidget from "./giveaway/GiveawayWidget";
import NavbarConfig from "./navbar/NavbarConfig";
import NavbarWidget from "./navbar/NavbarWidget";
import RtpStatsConfig from "./rtp-stats/RtpStatsConfig";
import RtpStatsWidget from "./rtp-stats/RtpStatsWidget";
import SlideshowFrameWidget from "./slideshow-frame/SlideshowFrameWidget";
import TournamentConfig from "./tournament/TournamentConfig";
import TournamentWidget from "./tournament/TournamentWidget";

const CURRENCY = "EUR ";

registerWidget({
  type: "bonus_hunt",
  label: "Better Hunt",
  icon: "🎯",
  description: "Live bonus hunt data used by the Better Editor widget.",
  category: "better",
  component: BonusHuntWidget,
  configPanel: BonusHuntConfig,
  styleConfigKey: "displayStyle",
  styles: [{ id: "better_bonus_hunt", icon: "🎯", label: "Better Hunt" }],
  defaults: {
    displayStyle: "better_bonus_hunt",
    bonuses: [],
    requests: [],
    huntActive: false,
    openingMode: false,
    currency: CURRENCY,
    startMoney: 0,
    targetMoney: 0,
    stopLoss: 0,
    showStatistics: true,
    animatedTracker: true,
  },
});

registerWidget({
  type: "giveaway",
  label: "Better Giveaway",
  icon: "🎁",
  description:
    "Live giveaway entries and winner data used by the Better Editor widget.",
  category: "better",
  component: GiveawayWidget,
  configPanel: GiveawayConfig,
  styleConfigKey: "displayStyle",
  styles: [{ id: "better_giveaway", icon: "🎁", label: "Better Giveaway" }],
  defaults: {
    displayStyle: "better_giveaway",
    title: "",
    prize: "",
    keyword: "",
    isActive: false,
    winner: "",
    participants: [],
    twitchEnabled: false,
    twitchChannel: "",
    kickEnabled: false,
    kickChannelId: "",
  },
});

registerWidget({
  type: "navbar",
  label: "Better Navbar",
  icon: "🧭",
  description:
    "Streamer identity, Spotify, socials, and status data used by the Better Editor navbar.",
  category: "better",
  component: NavbarWidget,
  configPanel: NavbarConfig,
  styleConfigKey: "displayStyle",
  styles: [{ id: "better_navbar", icon: "🧭", label: "Better Navbar" }],
  defaults: {
    displayStyle: "better_navbar",
    streamerName: "",
    motto: "",
    showAvatar: true,
    showClock: true,
    showNowPlaying: false,
    showCrypto: false,
    showSocials: false,
    showCTA: false,
    ctaText: "Be Gamble Aware!",
    cryptoCoins: [],
    socialDisplayStyle: "icons",
    kickChannelId: "",
    youtubeChannel: "",
    xUsername: "",
    instagramUsername: "",
    discordUrl: "",
    tiktokUsername: "",
    musicSource: "spotify",
    manualArtist: "",
    manualTrack: "",
    casinoName: "",
    casinoCommand: "!casino",
  },
});

registerWidget({
  type: "chat",
  label: "Better Chat",
  icon: "💬",
  description:
    "Live Twitch, YouTube, or Kick chat data used by the Better Editor chat.",
  category: "better",
  component: ChatWidget,
  configPanel: ChatConfig,
  styleConfigKey: "chatStyle",
  styles: [{ id: "better_chat", icon: "💬", label: "Better Chat" }],
  defaults: {
    chatStyle: "better_chat",
    twitchEnabled: false,
    twitchChannel: "",
    youtubeEnabled: false,
    youtubeVideoId: "",
    youtubeApiKey: "",
    kickEnabled: false,
    kickChannelId: "",
    maxMessages: 50,
    showHeader: true,
    showLegend: true,
    showBadges: true,
    useNativeColors: true,
  },
});

registerWidget({
  type: "rtp_stats",
  label: "Better RTP Stats",
  icon: "📖",
  description:
    "Current slot RTP, potential, volatility, and personal best data.",
  category: "better",
  component: RtpStatsWidget,
  configPanel: RtpStatsConfig,
  styleConfigKey: "displayStyle",
  styles: [{ id: "better_rtp", icon: "📖", label: "Better RTP Stats" }],
  defaults: {
    displayStyle: "better_rtp",
    slotName: "",
    provider: "",
    providerLogo: "",
    rtp: "",
    potential: "",
    volatility: "",
    bestWin: "",
    showProvider: true,
    showRtp: true,
    showPotential: true,
    showVolatility: true,
    showBestWin: true,
  },
});

registerWidget({
  type: "background",
  label: "Better Background",
  icon: "🖼️",
  description:
    "Background source and effects used by the Better Editor overlay.",
  category: "better",
  component: BackgroundWidget,
  configPanel: BackgroundConfig,
  styleConfigKey: "displayStyle",
  styles: [{ id: "better_background", icon: "🖼️", label: "Better Background" }],
  defaults: {
    displayStyle: "better_background",
    bgMode: "texture",
    textureType: "gradient",
    color1: "#071225",
    color2: "#08225a",
    color3: "#08101f",
    gradientAngle: 135,
    patternSize: 20,
    animSpeed: 8,
    imageUrl: "",
    videoUrl: "",
    imageFit: "cover",
    imagePosition: "center",
    opacity: 100,
    overlayColor: "#000000",
    overlayOpacity: 0,
  },
});

registerWidget({
  type: "slideshow_frame",
  label: "Slideshow Frame",
  icon: "🎞️",
  description:
    "Image and video slideshow frame used by the Better Editor overlay.",
  category: "better",
  component: SlideshowFrameWidget,
  configPanel: null,
  styleConfigKey: "displayStyle",
  styles: [
    { id: "better_slideshow_frame", icon: "🎞️", label: "Slideshow Frame" },
  ],
  defaults: {
    displayStyle: "better_slideshow_frame",
    mediaText: "",
    frameStyle: "neon",
    frameColor: "#20d8ff",
    accentColor: "#ffb020",
    backgroundColor: "#020817",
    fit: "cover",
    transition: "fade",
    slideMs: 5000,
    transitionMs: 650,
    autoplay: true,
    videoMuted: true,
    videoLoop: true,
    showVideoControls: false,
    showCounter: false,
    radius: 18,
    borderWidth: 2,
    padding: 12,
    glow: 85,
    aspectPreset: "banner",
  },
});

registerWidget({
  type: "bets",
  label: "Better Bets",
  icon: "💎",
  description: "Live chat betting state and StreamElements payout settings.",
  category: "better",
  component: BetsWidget,
  configPanel: BetsConfig,
  styleConfigKey: "displayStyle",
  styles: [{ id: "better_bets", icon: "💎", label: "Better Bets" }],
  defaults: {
    displayStyle: "better_bets",
    gameStatus: "idle",
    question: "Place Your Bets",
    timerSeconds: 600,
    chatCommand: "!bet",
    twitchChannel: "",
    seAnnounce: true,
    betSeEnabled: true,
    betMinAmount: 1,
    betMaxAmount: 0,
    options: [
      { label: "0 - 99" },
      { label: "100 - 199" },
      { label: "200 - 299" },
      { label: "300 - 399" },
      { label: "400 - 499" },
      { label: "500 - 599" },
      { label: "600 - 799" },
      { label: "800 - 999" },
      { label: "1000+" },
    ],
    bets: {},
    betters: {},
    winnerOption: null,
    betsHistory: [],
    bracketHistory: [],
    bracketUsage: [],
  },
});

registerWidget({
  type: "tournament",
  label: "Tournament",
  icon: "🏆",
  description:
    "Create brackets, run matches, and show live tournament standings.",
  category: "better",
  component: TournamentWidget,
  configPanel: TournamentConfig,
  styleConfigKey: "layout",
  styles: [
    { id: "grid", icon: "▦", label: "Grid" },
    { id: "vertical", icon: "↕", label: "Vertical" },
    { id: "minimal", icon: "−", label: "Minimal" },
    { id: "arena", icon: "⚔", label: "Arena" },
    { id: "esports", icon: "🎮", label: "Esports" },
    { id: "scoreboard", icon: "▤", label: "Scoreboard" },
  ],
  defaults: {
    layout: "grid",
    showBg: true,
    bgColor: "#07101f",
    borderColor: "#1d4f73",
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
    cardBg: "#101d31",
    cardBorder: "#244563",
    cardRadius: 14,
    cardBorderWidth: 1,
    nameColor: "#f8fafc",
    multiColor: "#38bdf8",
    slotNameColor: "#94a3b8",
    nameSize: 16,
    multiSize: 18,
    slotNameSize: 12,
    fontFamily: "'Rajdhani', sans-serif",
    showSlotName: true,
    slotImageRadius: 10,
    swordSize: 24,
    swordColor: "#38bdf8",
    swordBg: "#0f2138",
    xIconColor: "#ef4444",
    xIconBg: "#1f1420",
    activeStatusColor: "#38bdf8",
    statusBadgeBg: "#10243d",
    scoreNeutralColor: "#94a3b8",
    scoreNegativeColor: "#ef4444",
    eliminatedOpacity: 0.35,
    tournamentTitle: "Tournament",
    bracketName: "Tournament",
    bracketType: "bonus_bo3",
    bracketPlayerCount: 8,
    bracketPlayers: [],
    bracketData: [],
    bracketPhase: "setup",
    data: {
      matches: [],
      currentMatchIdx: 0,
    },
  },
});
