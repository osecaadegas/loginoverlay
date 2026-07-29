/**
 * Better Editor live data-source widgets.
 *
 * The legacy Appearance Center and non-Better widgets were removed. This
 * registry intentionally exposes only the widget types rendered by /editor.
 */
import { registerWidget } from "./widgetRegistry";

import BackgroundConfig from "./BackgroundConfig";
import BackgroundWidget from "./BackgroundWidget";
import BetsConfig from "./BetsConfig";
import BetsWidget from "./BetsWidget";
import BonusHuntConfig from "./BonusHuntConfig";
import BonusHuntWidget from "./BonusHuntWidget";
import ChatConfig from "./ChatConfig";
import ChatWidget from "./ChatWidget";
import GiveawayConfig from "./GiveawayConfig";
import GiveawayWidget from "./GiveawayWidget";
import NavbarConfig from "./NavbarConfig";
import NavbarWidget from "./NavbarWidget";
import RtpStatsConfig from "./RtpStatsConfig";
import RtpStatsWidget from "./RtpStatsWidget";

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
  description: "Live giveaway entries and winner data used by the Better Editor widget.",
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
  description: "Streamer identity, Spotify, socials, and status data used by the Better Editor navbar.",
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
  description: "Live Twitch, YouTube, or Kick chat data used by the Better Editor chat.",
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
  description: "Current slot RTP, potential, volatility, and personal best data.",
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
  description: "Background source and effects used by the Better Editor overlay.",
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
