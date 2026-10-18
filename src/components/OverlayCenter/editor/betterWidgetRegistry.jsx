import {GalacticCommandModule} from '../../../effects/ThemeEffects/galactic-command/GalacticCommandTheme.jsx';
import {galacticVariables} from '../../../effects/ThemeEffects/galactic-command/galacticCommandTheme.js';
import {StarterStudioModule} from '../../../effects/ThemeEffects/starter-studio/StarterStudioTheme.jsx';
import {starterStudioVariables} from '../../../effects/ThemeEffects/starter-studio/starterStudioTheme.js';
import { StreetArtModule } from '../../../effects/ThemeEffects/street-art/StreetArtTheme.jsx';
import { streetArtStyleVariables } from '../../../effects/ThemeEffects/street-art/streetArtTheme.js';
import SlotRequestsWidget from '../widgets/slot-requests/SlotRequestsWidget';
import OverlayAssetGate from './OverlayAssetGate';
import { volcanicStyleVariables } from '../../../effects/ThemeEffects/volcanic/volcanicTheme.js';
import { solverdeStyleVariables } from '../../../effects/ThemeEffects/solverde/solverdeTheme.js';
import '../../../effects/ThemeEffects/solverde/SolverdeTheme.css';
import { VolcanicWidgetLife } from '../../../effects/ThemeEffects/volcanic/VolcanicTheme.jsx';
import '../../../effects/ThemeEffects/volcanic/VolcanicTheme.css';
import { CandyModule } from '../../../effects/ThemeEffects/candy/CandyTheme.jsx';
import { candyStyleVariables } from '../../../effects/ThemeEffects/candy/candyTheme.js';
import CurrentSlotWidget from '../widgets/current-slot/CurrentSlotWidget';
import { orbitalStyleVariables } from '../../../effects/ThemeEffects/orbital/orbitalTheme.js';
import { getWidgetColourThemeTokens } from './widgetColourThemes.js';
import '../../../effects/ThemeEffects/orbital/OrbitalTheme.css';
import { withChatPreviewSamples } from "../widgets/chat/chatPreviewSamples";
import React from "react";
import BonusHuntWidget from "../widgets/bonus-hunt/BonusHuntWidget";
import GiveawayWidget from "../widgets/giveaway/GiveawayWidget";
import NavbarWidget from "../widgets/navbar/NavbarWidget";
import ChatWidget from "../widgets/chat/ChatWidget";
import RtpStatsWidget from "../widgets/rtp-stats/RtpStatsWidget";
import BackgroundWidget from "../widgets/background/BackgroundWidget";
import BetsWidget from "../widgets/bets/BetsWidget";
import SlideshowFrameWidget from "../widgets/slideshow-frame/SlideshowFrameWidget";
import TournamentWidget from "../widgets/tournament/TournamentWidget";
import RaidShoutoutWidget from "../widgets/raid-shoutout/RaidShoutoutWidget";
import ConnectFourWidget from "../widgets/connect-four/ConnectFourWidget";
import SlotBingoWidget from "../widgets/slot-bingo/SlotBingoWidget";
import CameraWidget from "../widgets/camera/CameraWidget";
import SlotWindowWidget from "../widgets/slot-window/SlotWindowWidget";
import { migrateCameraConfig } from "../widgets/camera/cameraConfig";
import {
  BETTER_WIDGETS,
  DEFAULT_BETTER_CONFIG,
  ensureBetterWidgetConfig,
  getBetterWidgetMeta,
} from "./BetterWidgetPackages";
import { normalizeBetterCoordinate } from "./betterWidgetGeometry";
import { STANDARD_BETTER_WIDGET_GEOMETRY } from "./standardWidgetPresets";
import { scaleStandaloneWidgetConfig } from "./obsConfigScaling";
import { EDITOR_WIDGET_METADATA } from "./editorWidgetMetadata";
import {
  getHorizontalHuntHeight,
  getHorizontalHuntMinHeight,
} from "../widgets/bonus-hunt/shared/betterHuntSizing";

export const BETTER_CANVAS = Object.freeze({ width: 1920, height: 1080 });
export const BETTER_LAYOUT_SCHEMA_VERSION = 1;
export const BETTER_DATA_MODES = Object.freeze(["mock", "live"]);

const BACKGROUND_TYPE = "background";
const MIN_OPACITY = 0;
const MAX_OPACITY = 1;

const MOCK_BONUSES = [
  {
    id: "mock-wolf-gold",
    slotName: "Wolf Gold",
    betSize: 4,
    payout: 136,
    opened: true,
  },
  {
    id: "mock-medusa",
    slotName: "Medusas Madness",
    betSize: 5,
    payout: 0,
    opened: false,
  },
  {
    id: "mock-gates",
    slotName: "Gates of Olympus 1000",
    betSize: 6,
    payout: 312,
    opened: true,
    isSuperBonus: true,
  },
  {
    id: "mock-sugar",
    slotName: "Sugar Rush 1000",
    betSize: 3,
    payout: 0,
    opened: false,
  },
];

const MOCK_TOURNAMENT_SLOTS = Object.freeze({
  fortunes: {
    name: "1 Million Fortunes Megaways",
    image:
      "https://casinolandia.com/wp-content/uploads/2023/03/1-Million-Fortunes-Megaways.jpg",
  },
  baba: {
    name: "1 Reel Baba Yaga",
    image:
      "https://www.livebet.com/images/casino/slots/spinomenal/1-reel-baba-yaga.webp",
  },
  beauty: {
    name: "1 Reel Beauty",
    image:
      "https://slotspeak.net/wp-content/uploads/2025/01/1-reel-beauty-slot-review.jpg",
  },
  buffalo: {
    name: "1 Reel Buffalo",
    image:
      "https://d1i1wfn7hj3mva.cloudfront.net/media/images/slots/portrait/sp/webp/sp-1-reel-buffalo.webp",
  },
  majestic: {
    name: "1 Reel Majestic Wild Buffalo",
    image:
      "https://d1i1wfn7hj3mva.cloudfront.net/media/images/slots/portrait/sp/webp/sp-1-reel-majestic-wild-buffalo.webp",
  },
  genie: {
    name: "1001 Mystery Genie Fortunes",
    image:
      "https://d1i1wfn7hj3mva.cloudfront.net/media/images/slots/portrait/pg/webp/pg-1001-mystery-genie-fortunes.webp",
  },
  christmas: {
    name: "3 Christmas Fortunes",
    image:
      "https://d1i1wfn7hj3mva.cloudfront.net/media/images/slots/portrait/id/webp/id-3-christmas-fortunes.webp",
  },
  wildBuffalo: {
    name: "5 Wild Buffalo",
    image:
      "https://d1i1wfn7hj3mva.cloudfront.net/media/images/slots/portrait/qr/webp/qr-5-wild-buffalo.webp",
  },
});

function mockTournamentMatch({
  id,
  player1,
  player2,
  slot1,
  slot2,
  payout1,
  payout2,
  winner,
}) {
  return {
    id,
    player1,
    player2,
    slot1,
    slot2,
    type: "bonus",
    status: "completed",
    winner,
    rounds: [
      {
        roundNum: 1,
        player1: { bonusCost: 100, bonusPayout: payout1 },
        player2: { bonusCost: 100, bonusPayout: payout2 },
        winner,
        status: "completed",
      },
    ],
  };
}

const MOCK_TOURNAMENT_MATCHES = [
  mockTournamentMatch({
    id: "mock-quarterfinal-1",
    player1: "PixelPioneerLive",
    player2: "LuckySpinLegend",
    slot1: MOCK_TOURNAMENT_SLOTS.fortunes,
    slot2: MOCK_TOURNAMENT_SLOTS.baba,
    payout1: 340,
    payout2: 125,
    winner: "player1",
  }),
  mockTournamentMatch({
    id: "mock-quarterfinal-2",
    player1: "NeonReelsTV",
    player2: "JackpotVoyager",
    slot1: MOCK_TOURNAMENT_SLOTS.beauty,
    slot2: MOCK_TOURNAMENT_SLOTS.buffalo,
    payout1: 95,
    payout2: 280,
    winner: "player2",
  }),
  mockTournamentMatch({
    id: "mock-quarterfinal-3",
    player1: "WildMultiplierPro",
    player2: "BonusRoundCaptain",
    slot1: MOCK_TOURNAMENT_SLOTS.majestic,
    slot2: MOCK_TOURNAMENT_SLOTS.genie,
    payout1: 180,
    payout2: 315,
    winner: "player2",
  }),
  mockTournamentMatch({
    id: "mock-quarterfinal-4",
    player1: "CasinoQuestOnline",
    player2: "ReelRushChampion",
    slot1: MOCK_TOURNAMENT_SLOTS.christmas,
    slot2: MOCK_TOURNAMENT_SLOTS.wildBuffalo,
    payout1: 145,
    payout2: 390,
    winner: "player2",
  }),
  mockTournamentMatch({
    id: "mock-semifinal-1",
    player1: "PixelPioneerLive",
    player2: "JackpotVoyager",
    slot1: MOCK_TOURNAMENT_SLOTS.fortunes,
    slot2: MOCK_TOURNAMENT_SLOTS.buffalo,
    payout1: 420,
    payout2: 205,
    winner: "player1",
  }),
  mockTournamentMatch({
    id: "mock-semifinal-2",
    player1: "BonusRoundCaptain",
    player2: "ReelRushChampion",
    slot1: MOCK_TOURNAMENT_SLOTS.genie,
    slot2: MOCK_TOURNAMENT_SLOTS.wildBuffalo,
    payout1: 230,
    payout2: 475,
    winner: "player2",
  }),
  mockTournamentMatch({
    id: "mock-final",
    player1: "PixelPioneerLive",
    player2: "ReelRushChampion",
    slot1: MOCK_TOURNAMENT_SLOTS.fortunes,
    slot2: MOCK_TOURNAMENT_SLOTS.wildBuffalo,
    payout1: 615,
    payout2: 360,
    winner: "player1",
  }),
];

const MOCK_TOURNAMENT_BRACKET = [
  { label: "Quarterfinals", matches: MOCK_TOURNAMENT_MATCHES.slice(0, 4) },
  { label: "Semifinals", matches: MOCK_TOURNAMENT_MATCHES.slice(4, 6) },
  { label: "Grand Final", matches: MOCK_TOURNAMENT_MATCHES.slice(6) },
];

const MOCK_WIDGET_CONFIGS = {
  current_slot: {
    slot: {
      id: "sample-current-slot",
      name: "Gates of Olympus 1000",
      provider: "Pragmatic Play",
      image:
        "https://images-cdn.softswiss.net/i/s2/pragmaticplay/GatesOfOlympus1000.png",
      rtp: 96.5,
      volatility: "High",
      max_win_multiplier: 15000,
    },
    slotId: "sample-current-slot",
    slotName: "Gates of Olympus 1000",
    provider: "Pragmatic Play",
    imageUrl:
      "https://images-cdn.softswiss.net/i/s2/pragmaticplay/GatesOfOlympus1000.png",
    currency: "EUR",
    __previewPersonalBest: {
      best_win: 540,
      best_win_bet: 5,
      best_multiplier: 108,
      best_multiplier_bet: 5,
      average_win: 144.25,
    },
  },
  slot_bingo: {},
  raid_shoutout: {
    __previewAlert: {
      id: "mock-shoutout-alert",
      raider_username: "sample_channel",
      raider_display_name: "Sample Channel",
      raider_game: "Slots",
      clip_title: "An unforgettable stream highlight",
      clip_view_count: 12840,
      raid_viewers: 247,
    },
  },
  tournament: {
    bracketPhase: "completed",
    bracketPlayerCount: 8,
    bracketData: MOCK_TOURNAMENT_BRACKET,
    bracketActiveRound: 2,
    bracketActiveMatch: 0,
    data: {
      currentMatchIdx: 6,
      matches: MOCK_TOURNAMENT_MATCHES,
    },
  },
  bonus_hunt: {
    bonuses: MOCK_BONUSES,
    startMoney: 2000,
    stopLoss: 700,
    currency: "EUR ",
    requests: [],
    slotRequests: [],
  },
  giveaway: {
    title: "Giveaway #1",
    prize: "10 EUR",
    subtitle: "42 players entered",
    keyword: "join",
    participants: ["SampleViewer", "LuckyViewer", "ChatGuest", "ReelFan"],
    entriesCount: 42,
    winner: "",
    spinningWinner: "SampleViewer",
    isActive: false,
  },
  navbar: {
    streamerName: "YOUR CHANNEL",
    motto: "Your stream, your way",
    startValue: "EUR 2000",
    casinoName: "Demo Casino",
    casinoCommand: "!Casino",
    __mockNowPlaying: {
      artist: "Streamers Center",
      track: "Live Overlay",
      album: "Better Editor",
    },
  },
  chat: withChatPreviewSamples({
    twitchEnabled: false,
    youtubeEnabled: false,
    kickEnabled: false,
  }),
  rtp_stats: {
    previewMode: true,
    slotName: "Medusas Madness",
    detectedSlotName: "Medusas Madness",
    currentSlotName: "Medusas Madness",
    provider: "Play'n GO",
    providerName: "Play'n GO",
    rtp: "96.20%",
    rtpValue: "96.20%",
    potential: "x5000",
    maxWin: "x5000",
    volatility: "High",
    bestWin: "No personal best yet",
  },
  background: {},
  slideshow_frame: {
    mediaText: [
      "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4|video|Demo video",
      "/placeholder.webp|image|Placeholder",
    ].join("\n"),
  },
  bets: {
    question: "Bonus Hunt Result",
    gameStatus: "open",
    timerSeconds: 180,
    _openedAt: Date.now() - 45000,
    chatCommand: "!bet",
    options: ["0 - 99x", "100 - 199x", "200 - 299x", "300 - 499x", "500x+"],
    bets: {
      opt_0: 350,
      opt_1: 1120,
      opt_2: 875,
      opt_3: 420,
      opt_4: 215,
    },
    betters: {
      SampleViewer: { option: 1, amount: 300 },
      LuckyViewer: { option: 2, amount: 180 },
      ChatGuest: { option: 1, amount: 220 },
      ReelFan: { option: 0, amount: 80 },
    },
  },
};

// Sample mode replaces runtime content only. Presentation always comes from the
// saved widget instance so editor and OBS keep identical typography, edges,
// colours, effects, layout and visibility settings.
const MOCK_DATA_KEYS = Object.freeze({
  current_slot: [
    "slot",
    "slotId",
    "slotName",
    "provider",
    "imageUrl",
    "currency",
    "__previewPersonalBest",
  ],
  raid_shoutout: ["__previewAlert"],
  tournament: [
    "bracketPhase",
    "bracketPlayerCount",
    "bracketData",
    "bracketActiveRound",
    "bracketActiveMatch",
    "data",
  ],
  bonus_hunt: [
    "bonuses",
    "startMoney",
    "stopLoss",
    "currency",
    "requests",
    "slotRequests",
  ],
  giveaway: [
    "title",
    "prize",
    "subtitle",
    "keyword",
    "participants",
    "entriesCount",
    "winner",
    "winnerSelectedAt",
    "spinningWinner",
    "isActive",
  ],
  navbar: [
    "live",
    "streamerName",
    "motto",
    "startValue",
    "casinoName",
    "casinoCommand",
    "__mockNowPlaying",
  ],
  chat: [
    "__appearancePreviewMessages",
    "__previewShoutoutAlert",
    "__previewGiveawayConfig",
    "__appearancePreviewSample",
  ],
  rtp_stats: [
    "previewMode",
    "slotName",
    "detectedSlotName",
    "currentSlotName",
    "provider",
    "providerName",
    "rtp",
    "rtpValue",
    "potential",
    "maxWin",
    "volatility",
    "bestWin",
  ],
  slideshow_frame: ["mediaText"],
  bets: [
    "question",
    "gameStatus",
    "timerSeconds",
    "_openedAt",
    "chatCommand",
    "options",
    "bets",
    "betters",
  ],
});

const LIVE_DATA_KEYS = Object.freeze({
  slot_requests:["commandTrigger","showSlotRequests"],
  current_slot: ['betSize','bet','stake','slot', 'slotId', 'slotName', 'provider', 'imageUrl', 'artworkBySlot', 'currency'],
  slot_bingo: [
    "title", "boardRows", "showProgress",
    "showMultipliers", "showCompletionIcons", "squares",
  ],
  tournament: [
    "bracketName",
    "bracketType",
    "bracketPlayerCount",
    "bracketPlayers",
    "bracketData",
    "bracketPhase",
    "data",
  ],
  bonus_hunt: [
    "bonuses",
    "huntActive",
    "huntNumber",
    "bonusOpening",
    "sessionState",
    "previewSlotName",
    "startMoney",
    "targetMoney",
    "stopLoss",
    "currency",
    "streamerName",
    "avatarUrl",
    "streamerAvatar",
    "avatarImageUrl",
    "profileAvatarUrl",
    "sortBy",
    "sortDir",
    "showStatistics",
    "animatedTracker",
    "showRequests",
    "showSlotRequests",
    "requests",
    "slotRequests",
    "pendingRequests",
    "slotRequestQueue",
  ],
  giveaway: [
    "title",
    "prize",
    "subtitle",
    "keyword",
    "isActive",
    "winner",
    "winnerSelectedAt",
    "spinningWinner",
    "participants",
    "entriesCount",
    "twitchEnabled",
    "twitchChannel",
    "kickEnabled",
    "kickChannelId",
  ],
  navbar: [
    "streamerName",
    "brandName",
    "motto",
    "siteUrl",
    "avatarUrl",
    "streamerAvatar",
    "avatarImageUrl",
    "badgeImageUrl",
    "badgeLabel",
    "clockFormat",
    "timezone",
    "nowPlayingLabel",
    "casinoName",
    "casinoCommand",
    "casinoLogoUrl",
    "casinoImageUrl",
    "startLabel",
    "startBalance",
    "startValue",
    "balanceCurrency",
    "ctaText",
    "twitchUsername",
    "kickChannelId",
    "kickChannel",
    "youtubeChannel",
    "youtubeVideoId",
    "xUsername",
    "twitterUsername",
    "instagramUsername",
    "discordUrl",
    "discordInvite",
    "discordTag",
    "tiktokUsername",
    "cryptoCoins",
  ],
  chat: [
    "twitchEnabled",
    "twitchChannel",
    "twitch_channel",
    "twitchLogin",
    "twitch_login",
    "twitchUsername",
    "twitch_username",
    "twitchUserId",
    "twitch_user_id",
    "twitchId",
    "twitch_id",
    "twitchBroadcasterId",
    "twitch_broadcaster_id",
    "broadcasterId",
    "broadcaster_id",
    "providerId",
    "provider_id",
    "channelLogin",
    "channel_login",
    "youtubeEnabled",
    "youtubeVideoId",
    "youtubeApiKey",
    "kickEnabled",
    "kickChannelId",
  ],
  rtp_stats: [
    "showSpinner",
    "showProvider",
    "showRtp",
    "showPotential",
    "showVolatility",
    "showBestWin",
    "_cachedBestWin",
    "previewMode",
  ],
  bets: [
    "question",
    "gameStatus",
    "timerSeconds",
    "_openedAt",
    "chatCommand",
    "twitchChannel",
    "seAnnounce",
    "betSeEnabled",
    "betMinAmount",
    "betMaxAmount",
    "betMsgPlaced",
    "betMsgPlacedSe",
    "betMsgNoPoints",
    "betMsgAlreadyBet",
    "betMsgNotOpen",
    "betMsgWinner",
    "options",
    "bets",
    "betters",
    "winnerOption",
    "winnerLabel",
    "winOption",
    "betsHistory",
    "bracketHistory",
    "bracketUsage",
  ],
  background: [],
  slideshow_frame: [],
  raid_shoutout: ["twitchChannel", "chatCommandEnabled"],
});

const NON_EMPTY_LIVE_DATA_KEYS = Object.freeze({
  chat: new Set([
    "twitchChannel",
    "twitch_channel",
    "twitchLogin",
    "twitch_login",
    "twitchUsername",
    "twitch_username",
    "twitchUserId",
    "twitch_user_id",
    "twitchId",
    "twitch_id",
    "twitchBroadcasterId",
    "twitch_broadcaster_id",
    "broadcasterId",
    "broadcaster_id",
    "providerId",
    "provider_id",
    "channelLogin",
    "channel_login",
    "youtubeVideoId",
    "youtubeApiKey",
    "kickChannelId",
  ]),
  giveaway: new Set(["twitchChannel", "kickChannelId"]),
  navbar: new Set([
    "twitchUsername",
    "kickChannelId",
    "kickChannel",
    "youtubeChannel",
    "youtubeVideoId",
  ]),
  bets: new Set(["twitchChannel"]),
  raid_shoutout: new Set(["twitchChannel"]),
});

const DEFAULT_POSITIONS = STANDARD_BETTER_WIDGET_GEOMETRY;

const COMPONENTS = {
  slot_requests: SlotRequestsWidget,
  slot_window: SlotWindowWidget,
  camera: CameraWidget,
  current_slot: CurrentSlotWidget,
  slot_bingo: SlotBingoWidget,
  connect_four: ConnectFourWidget,
  tournament: TournamentWidget,
  bonus_hunt: BonusHuntWidget,
  giveaway: GiveawayWidget,
  navbar: NavbarWidget,
  chat: ChatWidget,
  rtp_stats: RtpStatsWidget,
  background: BackgroundWidget,
  slideshow_frame: SlideshowFrameWidget,
  bets: BetsWidget,
  raid_shoutout: RaidShoutoutWidget,
};

const CONTROL_SCHEMAS = {
  slot_requests:["layout","artwork","typography","colours"],
  slot_window: ["source", "mask", "crop", "performance"],
  camera: ["style", "trigger", "camera", "chroma", "effect", "motion", "audio", "performance"],
  current_slot: ['display', 'colours'],
  slot_bingo: ["content", "board", "layout", "colours"],
  connect_four: ["content", "players", "board", "motion"],
  tournament: ["surface", "layout", "cards", "typography", "palette"],
  bonus_hunt: [
    "style",
    "orientation",
    "session",
    "texture",
    "colour",
    "animations",
    "carousel",
    "requests",
    "typography",
    "sizes",
    "list",
    "drawer",
  ],
  giveaway: ["theme", "size", "edges", "type", "content"],
  navbar: [
    "sections",
    "arrange",
    "spotify",
    "crypto",
    "socials",
    "casino",
    "cta",
    "size",
    "colours",
  ],
  chat: ["theme", "messages", "layout", "typography", "animation", "source"],
  rtp_stats: [
    "presets",
    "provider",
    "display",
    "emblem",
    "colours",
    "type",
    "bar",
  ],
  background: ["presets", "colors", "source", "textures", "effects"],
  slideshow_frame: ["media", "frame", "timing", "size"],
  bets: ["theme", "cards", "fill", "layout", "text", "colours"],
  raid_shoutout: ["content", "playback", "frame", "motion", "type", "colours"],
};

const SIZE_CONSTRAINTS = {
  slot_requests:{minWidth:240,minHeight:160,maxWidth:900,maxHeight:1080},
  slot_window: {
    minWidth: 240,
    minHeight: 135,
    maxWidth: 1920,
    maxHeight: 1080,
  },
  camera: {
    minWidth: 320,
    minHeight: 180,
    maxWidth: 1920,
    maxHeight: 1080,
  },
  slot_bingo: {
    minWidth: 340,
    minHeight: 260,
    maxWidth: 1000,
    maxHeight: 1080,
  },
  connect_four: {
    minWidth: 280,
    minHeight: 360,
    maxWidth: 960,
    maxHeight: 1080,
  },
  tournament: {
    minWidth: 320,
    minHeight: 220,
    maxWidth: 1920,
    maxHeight: 1080,
  },
  bonus_hunt: {
    minWidth: 320,
    minHeight: 320,
    maxWidth: 1280,
    maxHeight: 1080,
  },
  giveaway: { minWidth: 240, minHeight: 180, maxWidth: 1100, maxHeight: 520 },
  navbar: { minWidth: 720, minHeight: 46, maxWidth: 1920, maxHeight: 160 },
  chat: { minWidth: 180, minHeight: 220, maxWidth: 720, maxHeight: 900 },
  current_slot: { minWidth: 680, minHeight: 140, maxWidth: 1920, maxHeight: 600 },
  rtp_stats: { minWidth: 680, minHeight: 52, maxWidth: 1920, maxHeight: 160 },
  background: {
    minWidth: 1920,
    minHeight: 1080,
    maxWidth: 1920,
    maxHeight: 1080,
  },
  slideshow_frame: {
    minWidth: 240,
    minHeight: 120,
    maxWidth: 1920,
    maxHeight: 1080,
  },
  bets: { minWidth: 280, minHeight: 300, maxWidth: 880, maxHeight: 920 },
  raid_shoutout: {
    minWidth: 240,
    minHeight: 135,
    maxWidth: 1280,
    maxHeight: 720,
  },
};

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function hasOwnKey(value, key) {
  return Object.prototype.hasOwnProperty.call(value || {}, key);
}

function pickLiveDataPatch(widgetType, liveConfig = {}) {
  const keys = LIVE_DATA_KEYS[widgetType] || [];
  const nonEmptyKeys = NON_EMPTY_LIVE_DATA_KEYS[widgetType];
  return keys.reduce((patch, key) => {
    if (!hasOwnKey(liveConfig, key)) return patch;
    const value = liveConfig[key];
    if (
      nonEmptyKeys?.has(key) &&
      (value === null || value === undefined || String(value).trim() === "")
    ) {
      return patch;
    }
    patch[key] = value;
    return patch;
  }, {});
}

export function stripBetterRuntimeData(widgetType, config = {}) {
  const next = cloneJson(config || {});
  const runtimeKeys = new Set([
    ...(LIVE_DATA_KEYS[widgetType] || []),
    ...(MOCK_DATA_KEYS[widgetType] || []),
  ]);
  runtimeKeys.forEach((key) => delete next[key]);
  if (widgetType === "camera" || widgetType === "freeze_shatter" || widgetType === "money_explosion") {
    delete next.source;
    delete next.sourceLabel;
    if (next.iceConfig) {
      next.iceConfig = { ...next.iceConfig, source: "default", sourceLabel: "" };
    }
    if (next.moneyConfig) {
      next.moneyConfig = { ...next.moneyConfig, source: "default", sourceLabel: "" };
    }
  }
  return next;
}

function pickMockDataPatch(widgetType) {
  const fixture = MOCK_WIDGET_CONFIGS[widgetType] || {};
  return (MOCK_DATA_KEYS[widgetType] || []).reduce((patch, key) => {
    if (hasOwnKey(fixture, key)) patch[key] = cloneJson(fixture[key]);
    return patch;
  }, {});
}

function firstLiveNumber(values, fallback = 0) {
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;
    const parsed =
      typeof value === "number"
        ? value
        : Number.parseFloat(String(value).replace(/[^\d.-]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function hasFilledBonusPayment(bonus = {}) {
  return (
    firstLiveNumber(
      [
        bonus.payout,
        bonus.pay,
        bonus.win,
        bonus.winAmount,
        bonus.win_amount,
        bonus.result,
      ],
      0,
    ) > 0
  );
}

function deriveBonusHuntSessionState(liveConfig = {}, livePatch = {}) {
  const bonuses = Array.isArray(livePatch.bonuses)
    ? livePatch.bonuses
    : Array.isArray(liveConfig.bonuses)
      ? liveConfig.bonuses
      : [];

  if (liveConfig.bonusOpening === true || livePatch.bonusOpening === true) {
    return bonuses.length > 0 && bonuses.every(hasFilledBonusPayment)
      ? "ended"
      : "opening";
  }

  return "hunt";
}

function normalizeBonusHuntLivePatch(
  liveConfig = {},
  livePatch = {},
  baseConfig = {},
) {
  const next = { ...livePatch };

  if (
    hasOwnKey(liveConfig, "showSlotRequests") ||
    hasOwnKey(liveConfig, "showRequests")
  ) {
    const liveRequestsVisible =
      (hasOwnKey(liveConfig, "showSlotRequests")
        ? liveConfig.showSlotRequests !== false
        : true) &&
      (hasOwnKey(liveConfig, "showRequests")
        ? liveConfig.showRequests !== false
        : true);
    next.showSlotRequests = liveRequestsVisible;
    next.showRequests =
      baseConfig.showRequests !== false && liveRequestsVisible;
  }

  if (
    hasOwnKey(liveConfig, "bonuses") ||
    hasOwnKey(liveConfig, "bonusOpening")
  ) {
    const sessionState = deriveBonusHuntSessionState(liveConfig, next);
    next.sessionState = sessionState;
    next.huntActive =
      sessionState === "hunt" &&
      Array.isArray(next.bonuses) &&
      next.bonuses.length > 0;
  }

  return next;
}

export function findBetterLiveSourceWidget(widgetType, liveWidgets = []) {
  if (!widgetType || !Array.isArray(liveWidgets)) return null;
  return (
    liveWidgets.find((widget) => widget?.widget_type === widgetType) || null
  );
}

function resolveBetterLiveSourceWidget(widgetType, context = {}) {
  if (context?.liveWidget?.widget_type === widgetType)
    return context.liveWidget;
  return findBetterLiveSourceWidget(widgetType, context?.liveWidgets) || (widgetType === "slot_requests" ? findBetterLiveSourceWidget("bonus_hunt",context?.liveWidgets) : null);
}

function mergeBetterLiveDataConfig(widgetType, baseConfig, liveWidget) {
  const liveConfig = liveWidget?.config;
  if (!liveConfig || typeof liveConfig !== "object") return baseConfig;
  const livePatch =
    widgetType === "bonus_hunt"
      ? normalizeBonusHuntLivePatch(
          liveConfig,
          pickLiveDataPatch(widgetType, liveConfig),
          baseConfig,
        )
      : pickLiveDataPatch(widgetType, liveConfig);
  if (widgetType === "raid_shoutout" && liveWidget.is_visible === false) {
    livePatch.chatCommandEnabled = false;
  }
  if (Object.keys(livePatch).length === 0) return baseConfig;
  return ensureBetterWidgetConfig(widgetType, {
    ...baseConfig,
    ...livePatch,
  });
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(number, min), max);
}

function makeInstanceId(widgetType) {
  const randomId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${widgetType}-${randomId}`;
}

function normalizeZIndexes(instances) {
  const background = instances.find(
    (item) => item.widgetType === BACKGROUND_TYPE,
  );
  const foreground = instances
    .filter((item) => item.widgetType !== BACKGROUND_TYPE)
    .sort((a, b) => Number(a.zIndex) - Number(b.zIndex));
  const normalized = foreground.map((item, index) => ({
    ...item,
    zIndex: Math.max(1, Number(item.zIndex) || index + 1),
  }));
  return [
    ...(background
      ? [
          {
            ...background,
            x: 0,
            y: 0,
            width: BETTER_CANVAS.width,
            height: BETTER_CANVAS.height,
            locked: true,
            zIndex: 0,
          },
        ]
      : []),
    ...normalized,
  ].sort((a, b) => Number(a.zIndex) - Number(b.zIndex));
}

export function getBetterInstanceConstraints(instance = {}) {
  const constraints = SIZE_CONSTRAINTS[instance.widgetType] || {};
  if(instance.widgetType==='bonus_hunt'&&instance.config?.orientation==='new_horizontal') return {...constraints,minWidth:365,minHeight:75,maxWidth:1920,maxHeight:1080};
  const commandSize=instance.widgetType==='current_slot'?({galactic_scanner:[260,220],galactic_max:[220,100],galactic_rail:[680,54],galactic_info:[680,180]})[instance.config?.displayStyle]:null;
  if(commandSize)return {...constraints,minWidth:commandSize[0],minHeight:commandSize[1],maxWidth:1920,maxHeight:1080};
  if(instance.config?.colourTheme==='galactic_command'&&instance.widgetType==='bonus_hunt'&&instance.config?.galactic?.role)return {...constraints,minWidth:260,minHeight:instance.config.galactic.role==='stats'?200:160,maxWidth:1920,maxHeight:1080};
  if(instance.config?.colourTheme==='galactic_command'&&instance.widgetType==='giveaway'&&instance.config?.galactic?.latestWin)return {...constraints,minWidth:260,minHeight:180,maxWidth:1920,maxHeight:1080};
  if(instance.widgetType==='current_slot'&&instance.config?.displayStyle==='starter_studio_card')return {...constraints,minWidth:320,minHeight:200,maxWidth:1600,maxHeight:1080};
  if(instance.widgetType==='current_slot'&&instance.config?.displayStyle==='street_art_card') return {...constraints,minWidth:240,minHeight:170,maxWidth:1200,maxHeight:1000};
  if(instance.widgetType==='current_slot'&&instance.config?.displayStyle==='portrait_compact') return {...constraints,minWidth:100,minHeight:200,maxWidth:720,maxHeight:1800};
  if (instance.config?.colourTheme === 'solverde') {
    if (instance.widgetType === 'bonus_hunt' && instance.config.solverde?.huntDock) return { ...constraints, minWidth: 850, minHeight: 200, maxWidth: 1920, maxHeight: 420 };
    if (instance.widgetType === 'current_slot' && instance.config.solverde?.footer) return { ...constraints, minWidth: 680, minHeight: 70, maxHeight: 200 };
    if (instance.widgetType === 'bets' && instance.config.solverde?.predictions) return { ...constraints, minWidth: 340, minHeight: 180 };
  }
  if (
    instance.widgetType === "current_slot" &&
    instance.config?.displayStyle === "portrait_card"
  ) {
    return { ...constraints, minWidth: 170, minHeight: 300, maxWidth: 720, maxHeight: 1080 };
  }
  if (
    instance.widgetType === "bets" &&
    instance.config?.displayStyle === "compact_scoreboard"
  ) {
    return { ...constraints, minWidth: 200, minHeight: 150 };
  }
  return instance.widgetType === "bonus_hunt" &&
    instance.config?.orientation === "horizontal"
    ? { ...constraints, minHeight: getHorizontalHuntMinHeight(instance.config), maxHeight: 980 }
    : constraints;
}

function normalizeInstanceGeometry(widgetType, geometry = {}) {
  const meta = getBetterWidgetMeta(widgetType);
  const defaultPos = DEFAULT_POSITIONS[widgetType] || {};
  const constraints = getBetterInstanceConstraints({ ...geometry, widgetType });
  const minWidth = constraints.minWidth || 80;
  const minHeight = constraints.minHeight || 80;
  const maxWidth = constraints.maxWidth || BETTER_CANVAS.width;
  const maxHeight = constraints.maxHeight || BETTER_CANVAS.height;
  const width = clampNumber(
    geometry.width,
    minWidth,
    maxWidth,
    defaultPos.width || meta?.defaultSize?.width || 320,
  );
  const height = clampNumber(
    widgetType === "bonus_hunt" && geometry.config?.orientation === "horizontal"
      ? getHorizontalHuntHeight(geometry.config)
      : geometry.height,
    minHeight,
    maxHeight,
    defaultPos.height || meta?.defaultSize?.height || 240,
  );
  const x = normalizeBetterCoordinate(geometry.x, defaultPos.x ?? 0);
  const y = normalizeBetterCoordinate(geometry.y, defaultPos.y ?? 0);
  return { x, y, width, height };
}

function buildDefinition(meta) {
  return {
    widgetType: meta.type,
    label: meta.label,
    icon: meta.icon,
    styleKey: meta.styleKey,
    styleId: meta.styleId,
    defaultConfig: cloneJson(DEFAULT_BETTER_CONFIG[meta.type] || {}),
    defaultSize: cloneJson(meta.defaultSize),
    constraints: SIZE_CONSTRAINTS[meta.type],
    controlSchema: CONTROL_SCHEMAS[meta.type] || [],
    editor: EDITOR_WIDGET_METADATA[meta.type] || { category: "Other", simpleSections: [] },
    component: COMPONENTS[meta.type],
    validateConfig: (config) =>
      ensureBetterWidgetConfig(meta.type, config || {}),
    dataAdapter: ({ config, mode, liveWidget }) => {
      const baseConfig = ensureBetterWidgetConfig(meta.type, config || {});
      if (mode !== "mock") {
        return mergeBetterLiveDataConfig(meta.type, baseConfig, liveWidget);
      }
      return ensureBetterWidgetConfig(meta.type, {
        ...baseConfig,
        ...pickMockDataPatch(meta.type),
      });
    },
  };
}

export const BETTER_WIDGET_REGISTRY = Object.freeze(
  Object.fromEntries(
    BETTER_WIDGETS.map((meta) => [meta.type, buildDefinition(meta)]),
  ),
);

export function getBetterWidgetTypes() {
  return BETTER_WIDGETS.map((item) => item.type);
}

export function getBetterWidgetDefinition(widgetType) {
  return BETTER_WIDGET_REGISTRY[widgetType] || null;
}

export function isBetterWidgetType(widgetType) {
  return Boolean(getBetterWidgetDefinition(widgetType));
}

export function validateBetterWidgetConfig(widgetType, config = {}) {
  const definition = getBetterWidgetDefinition(widgetType);
  if (!definition) return {};
  return definition.validateConfig(config);
}

export function resolveBetterWidgetConfig(
  widgetType,
  config = {},
  mode = "live",
  context = {},
) {
  const definition = getBetterWidgetDefinition(widgetType);
  if (!definition) return {};
  const normalizedMode = BETTER_DATA_MODES.includes(mode) ? mode : "live";
  const liveWidget =
    normalizedMode === "live"
      ? resolveBetterLiveSourceWidget(widgetType, context)
      : null;
  return definition.dataAdapter({ config, mode: normalizedMode, liveWidget });
}

export function createBetterInstance(widgetType, overrides = {}) {
  const definition = getBetterWidgetDefinition(widgetType);
  if (!definition) return null;
  const defaultPos = DEFAULT_POSITIONS[widgetType] || {};
  const config = validateBetterWidgetConfig(
    widgetType,
    overrides.config || definition.defaultConfig,
  );
  const geometry = normalizeInstanceGeometry(widgetType, {
    ...defaultPos,
    ...overrides,
    config,
  });
  return {
    instanceId: overrides.instanceId || makeInstanceId(widgetType),
    widgetType,
    label: overrides.label || definition.label,
    config,
    visible: overrides.visible !== false,
    locked: widgetType === BACKGROUND_TYPE ? true : overrides.locked === true,
    opacity: clampNumber(overrides.opacity, MIN_OPACITY, MAX_OPACITY, 1),
    zIndex:
      widgetType === BACKGROUND_TYPE
        ? 0
        : Number(overrides.zIndex || defaultPos.zIndex || 1),
    ...geometry,
  };
}

export function duplicateBetterInstance(instance, overrides = {}) {
  if (!instance) return null;
  return createBetterInstance(instance.widgetType, {
    ...instance,
    ...overrides,
    instanceId: makeInstanceId(instance.widgetType),
    label:
      overrides.label ||
      `${instance.label || getBetterWidgetMeta(instance.widgetType)?.label || "Widget"} Copy`,
    x: normalizeBetterCoordinate(instance.x) + 32,
    y: normalizeBetterCoordinate(instance.y) + 32,
    zIndex: Number(instance.zIndex || 1) + 1,
    config: cloneJson(instance.config || {}),
  });
}

function migrateLegacyShoutoutConfig(widgetType, rawConfig) {
  if (
    widgetType !== "raid_shoutout" ||
    rawConfig.accentColor !== "#9146ff" ||
    rawConfig.secondaryColor !== "#22d3ee" ||
    rawConfig.backgroundColor !== "#090711"
  ) {
    return rawConfig;
  }
  return {
    ...rawConfig,
    accentColor: "#45c8ff",
    secondaryColor: "#1385e9",
    backgroundColor: "#081228",
    mutedColor:
      rawConfig.mutedColor === "#a5b4c7" ? "#8baacf" : rawConfig.mutedColor,
    borderRadius: rawConfig.borderRadius === 16 ? 12 : rawConfig.borderRadius,
    borderWidth: rawConfig.borderWidth === 2 ? 1 : rawConfig.borderWidth,
    glowIntensity:
      rawConfig.glowIntensity === 55 ? 35 : rawConfig.glowIntensity,
  };
}

function migrateLegacyBackgroundMediaDefaults(widgetType, rawConfig) {
  if (
    widgetType !== BACKGROUND_TYPE ||
    Number(rawConfig.mediaOpacity) !== 88 ||
    Number(rawConfig.overlayOpacity) !== 18 ||
    !["#020611", "#1c1c1c"].includes(
      String(rawConfig.overlayColor || "").toLowerCase(),
    )
  ) {
    return rawConfig;
  }

  // These values were the old untouched defaults and compounded into a visibly
  // dark image/video. Explicitly customized opacity or tint values are retained.
  return {
    ...rawConfig,
    mediaOpacity: 100,
    overlayOpacity: 0,
  };
}

function migrateLegacyConnectFourConfig(widgetType, rawConfig) {
  if (
    widgetType !== "connect_four" ||
    rawConfig.playerOneColor !== "#ef4444" ||
    rawConfig.playerTwoColor !== "#facc15"
  ) {
    return rawConfig;
  }
  return {
    ...rawConfig,
    playerOneColor: "#facc15",
    playerTwoColor: "#ef4444",
  };
}

export function normalizeBetterInstance(rawInstance = {}) {
  const storedWidgetType =
    rawInstance.widgetType || rawInstance.widget_type || rawInstance.type;
  const widgetType = storedWidgetType === "freeze_shatter" || storedWidgetType === "money_explosion"
    ? "camera"
    : storedWidgetType;
  const definition = getBetterWidgetDefinition(widgetType);
  if (!definition) return null;
  const usesLegacyShoutoutGeometry =
    widgetType === "raid_shoutout" &&
    Number(rawInstance.width) === 560 &&
    Number(rawInstance.height) === 420;
  const storedConfig = rawInstance.config || definition.defaultConfig;
  const rawConfig = widgetType === "camera"
    ? migrateCameraConfig(storedConfig, storedWidgetType)
    : storedConfig;
  const config = validateBetterWidgetConfig(
    widgetType,
    migrateLegacyBackgroundMediaDefaults(
      widgetType,
      migrateLegacyConnectFourConfig(
        widgetType,
        migrateLegacyShoutoutConfig(widgetType, rawConfig),
      ),
    ),
  );
  const geometry = normalizeInstanceGeometry(
    widgetType,
    usesLegacyShoutoutGeometry
      ? {
          ...rawInstance,
          x: normalizeBetterCoordinate(rawInstance.x) - 40,
          y: normalizeBetterCoordinate(rawInstance.y) + 30,
          width: 640,
          height: 360,
        }
      : { ...rawInstance, config },
  );
  return {
    instanceId:
      rawInstance.instanceId || rawInstance.id || makeInstanceId(widgetType),
    widgetType,
    label: widgetType === "camera" ? "Camera" : (rawInstance.label || definition.label),
    config,
    visible: rawInstance.visible !== false && rawInstance.is_visible !== false,
    locked: widgetType === BACKGROUND_TYPE ? true : rawInstance.locked === true,
    opacity: clampNumber(rawInstance.opacity, MIN_OPACITY, MAX_OPACITY, 1),
    zIndex:
      widgetType === BACKGROUND_TYPE
        ? 0
        : Number(rawInstance.zIndex ?? rawInstance.z_index ?? 1),
    ...geometry,
  };
}

export function normalizeBetterLayout(layout = {}) {
  const rawInstances = Array.isArray(layout.instances) ? layout.instances : [];
  const normalized = rawInstances
    .map((instance) => normalizeBetterInstance(instance))
    .filter(Boolean);
  const hasBackground = normalized.some(
    (instance) => instance.widgetType === BACKGROUND_TYPE,
  );
  if (!hasBackground) normalized.unshift(createBetterInstance(BACKGROUND_TYPE));
  const hasAnyForeground = normalized.some(
    (instance) => instance.widgetType !== BACKGROUND_TYPE,
  );
  const instances = hasAnyForeground
    ? normalizeZIndexes(normalized)
    : createDefaultBetterLayout().instances;
  return {
    schemaVersion: BETTER_LAYOUT_SCHEMA_VERSION,
    name: String(layout.name || "My Overlay").trim().slice(0, 80) || "My Overlay",
    preview: instances.filter((item) => item.visible !== false && item.widgetType !== "background").slice(0, 16).map(({ x, y, width, height }) => ({ x, y, width, height })),
    canvas: {
      width: BETTER_CANVAS.width,
      height: BETTER_CANVAS.height,
    },
    instances,
    updatedAt: layout.updatedAt || new Date().toISOString(),
  };
}

export function createDefaultBetterLayout() {
  const preferredOrder = [
    "background",
    "navbar",
    "rtp_stats",
    "slideshow_frame",
    "bonus_hunt",
    "bets",
    "chat",
    "giveaway",
  ];
  const instances = preferredOrder
    .map((widgetType) =>
      createBetterInstance(widgetType, DEFAULT_POSITIONS[widgetType]),
    )
    .filter(Boolean);
  return {
    schemaVersion: BETTER_LAYOUT_SCHEMA_VERSION,
    name: "My Overlay",
    canvas: {
      width: BETTER_CANVAS.width,
      height: BETTER_CANVAS.height,
    },
    instances: normalizeZIndexes(instances),
    updatedAt: new Date().toISOString(),
  };
}

export function betterInstanceToLegacyWidget(
  instance,
  mode = "live",
  context = {},
) {
  const liveWidget =
    mode === "live"
      ? resolveBetterLiveSourceWidget(instance.widgetType, context)
      : null;
  const config = resolveBetterWidgetConfig(
    instance.widgetType,
    instance.config,
    mode,
    {
      ...context,
      liveWidget,
    },
  );
  const renderedConfig = scaleStandaloneWidgetConfig({
    widgetType: instance.widgetType,
    config,
    instance,
    renderScale: context.renderScale,
  });
  const instanceConfig = {
    ...renderedConfig,
    ...(instance.widgetType === "bonus_hunt" && config.orientation === "horizontal"
      ? { horizontalHeight: instance.height }
      : {}),
    __betterInstanceId: instance.instanceId,
    __betterInstanceWidth: instance.width,
    __betterInstanceHeight: instance.height,
    __obsRenderScale: Number(context.renderScale) || 1,
  };
  return {
    id: liveWidget?.id || instance.instanceId,
    instanceId: instance.instanceId,
    widget_type: instance.widgetType,
    label: instance.label,
    config: instanceConfig,
    is_visible: instance.visible !== false,
    position_x: instance.x,
    position_y: instance.y,
    width: instance.width,
    height: instance.height,
    z_index: instance.zIndex,
  };
}

export function renderBetterWidgetInstance({
  instance,
  layout,
  mode = "live",
  runtime = "editor",
  userId,
  theme,
  liveWidgets = [],
  publicOverlayId,
  renderScale = 1,
  accessVerified = false,
}) {
  const definition = getBetterWidgetDefinition(instance?.widgetType);
  if (!definition?.component || !instance) return null;
  const WidgetComponent = definition.component;
  const normalizedLayout = normalizeBetterLayout(layout);
  const liveSourceContext = { liveWidgets, renderScale };
  const allWidgets = normalizedLayout.instances.map((item) =>
    betterInstanceToLegacyWidget(item, mode, liveSourceContext),
  );
  if (mode === 'live' && !allWidgets.some(item => item.widget_type === 'current_slot')) {
    const currentGame = liveWidgets.find(item => item.widget_type === 'current_slot');
    if (currentGame) allWidgets.push(currentGame);
  }
  const widget = betterInstanceToLegacyWidget(
    instance,
    mode,
    liveSourceContext,
  );
  const commonProps = {
    config: widget.config,
    previewOnly: mode === "mock",
    allWidgets,
    widgetId: widget.id,
    userId,
    theme,
    runtime,
    publicOverlayId,
    ...(instance.widgetType === "chat" ? {
      giveawayWidget: mode === "mock"
        ? { config: MOCK_WIDGET_CONFIGS.giveaway }
        : resolveBetterLiveSourceWidget("giveaway", liveSourceContext) ||
          allWidgets.find((item) => item.widget_type === "giveaway"),
    } : {}),
  };
  const colourThemeKey = String(
    widget.config.colourTheme ||
    (instance.widgetType === "bets" ? widget.config.theme || widget.config.betTheme : "") ||
    (instance.widgetType === "bonus_hunt" ? widget.config.colour : "") ||
    "",
  ).replace(/^theme_/, "");
  const greekArchitectureEnabled =
    widget.config.themeEffects?.greek?.architecture !== false;
  return (
    <OverlayAssetGate userId={userId} config={widget.config} runtime={runtime} accessVerified={accessVerified}>
    <div
      className="better-widget-colour-scope"
      data-colour-theme={colourThemeKey || undefined}
      data-greek-architecture={greekArchitectureEnabled ? "on" : "off"}
      data-widget-type={instance.widgetType}
      data-obs-render-scale={renderScale > 1 ? renderScale.toFixed(4) : undefined}
      style={{ "--obs-render-scale": renderScale, ...(colourThemeKey==='galactic_command'?galacticVariables(getWidgetColourThemeTokens(instance.widgetType,widget.config,colourThemeKey),widget.config):{}), ...(colourThemeKey==='starter_studio'?starterStudioVariables(getWidgetColourThemeTokens(instance.widgetType,widget.config,colourThemeKey),widget.config):{}), ...(colourThemeKey === 'street_art' ? streetArtStyleVariables(getWidgetColourThemeTokens(instance.widgetType,widget.config,colourThemeKey),widget.config) : {}), ...(colourThemeKey === 'solverde' ? solverdeStyleVariables(getWidgetColourThemeTokens(instance.widgetType, widget.config, colourThemeKey),widget.config) : {}), ...(colourThemeKey === 'volcanic' ? volcanicStyleVariables(getWidgetColourThemeTokens(instance.widgetType, widget.config, colourThemeKey), widget.config) : {}), ...(colourThemeKey === 'candy' ? candyStyleVariables(getWidgetColourThemeTokens(instance.widgetType, widget.config, colourThemeKey), widget.config) : {}), ...(colourThemeKey === 'orbital' ? orbitalStyleVariables(widget.config.themeEffects?.orbital, getWidgetColourThemeTokens(instance.widgetType, widget.config, colourThemeKey)) : {}) }}
    >
      {colourThemeKey==='galactic_command'?<GalacticCommandModule type={instance.widgetType} config={widget.config} layout={normalizedLayout} runtime={runtime}><WidgetComponent {...commonProps}/></GalacticCommandModule>:colourThemeKey==='starter_studio'?<StarterStudioModule type={instance.widgetType} config={widget.config} layout={normalizedLayout} runtime={runtime}><WidgetComponent {...commonProps}/></StarterStudioModule>:colourThemeKey === 'street_art' ? <StreetArtModule type={instance.widgetType} config={widget.config}><WidgetComponent {...commonProps}/></StreetArtModule> : colourThemeKey === 'candy' ? <CandyModule type={instance.widgetType} config={widget.config}><WidgetComponent {...commonProps} /></CandyModule> : <WidgetComponent {...commonProps} />}
      {colourThemeKey === 'volcanic' && (instance.widgetType === 'chat' || (instance.widgetType === 'navbar' && widget.config.displayStyle !== 'better_navbar')) && <VolcanicWidgetLife config={widget.config} />}
    </div>
    </OverlayAssetGate>
  );
}
