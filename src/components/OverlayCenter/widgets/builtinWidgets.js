/**
 * Built-in widgets for casino streamers.
 * Import this file once to populate the registry.
 */
import { registerWidget } from './widgetRegistry';

// ─── 1. STATS PANEL ────────────────────────────────────
import StatsWidget from './StatsWidget';
import StatsConfig from './StatsConfig';
registerWidget({
  type: 'stats',
  label: 'Stats Panel',
  icon: '📊',
  category: 'casino',
  component: StatsWidget,
  configPanel: StatsConfig,
  defaults: {
    totalBet: 0,
    totalWin: 0,
    highestWin: 0,
    highestMulti: 0,
    sessionProfit: 0,
    currency: '€',
  },
});

// ─── 2. BONUS HUNT ─────────────────────────────────────
import BonusHuntWidget from './BonusHuntWidget';
import BonusHuntConfig from './BonusHuntConfig';
registerWidget({
  type: 'bonus_hunt',
  label: 'Bonus Hunt',
  icon: '🎯',
  category: 'casino',
  component: BonusHuntWidget,
  configPanel: BonusHuntConfig,
  defaults: {
    bonuses: [],
    huntActive: false,
    currency: '€',
    startMoney: 0,
    targetMoney: 0,
    stopLoss: 0,
    showStatistics: true,
    animatedTracker: true,
  },
});

// ─── 3. CURRENT SLOT ───────────────────────────────────
import CurrentSlotWidget from './CurrentSlotWidget';
import CurrentSlotConfig from './CurrentSlotConfig';
registerWidget({
  type: 'current_slot',
  label: 'Current Slot',
  icon: '🎰',
  category: 'casino',
  component: CurrentSlotWidget,
  configPanel: CurrentSlotConfig,
  defaults: {
    slotName: '',
    provider: '',
    betSize: 0,
    imageUrl: '',
    rtp: '',
  },
});

// ─── 4. TOURNAMENT ─────────────────────────────────────
import TournamentWidget from './TournamentWidget';
import TournamentConfig from './TournamentConfig';
registerWidget({
  type: 'tournament',
  label: 'Tournament',
  icon: '🏆',
  category: 'casino',
  component: TournamentWidget,
  configPanel: TournamentConfig,
  defaults: {
    title: '',
    prize: '',
    entries: [],
    endTime: null,
  },
});

// ─── 5. GIVEAWAY ───────────────────────────────────────
import GiveawayWidget from './GiveawayWidget';
import GiveawayConfig from './GiveawayConfig';
registerWidget({
  type: 'giveaway',
  label: 'Giveaway',
  icon: '🎁',
  category: 'casino',
  component: GiveawayWidget,
  configPanel: GiveawayConfig,
  defaults: {
    title: '',
    prize: '',
    keyword: '',
    isActive: false,
    winner: '',
  },
});

// ─── 6. NAVBAR ─────────────────────────────────────────
import NavbarWidget from './NavbarWidget';
import NavbarConfig from './NavbarConfig';
registerWidget({
  type: 'navbar',
  label: 'Navbar',
  icon: '📌',
  category: 'stream',
  component: NavbarWidget,
  configPanel: NavbarConfig,
  defaults: {
    streamerName: '',
    motto: '',
    showAvatar: true,
    showClock: true,
    showNowPlaying: false,
    showCrypto: false,
    showCTA: false,
    ctaText: 'Be Gamble Aware!',
    cryptoCoins: [],
    musicSource: 'manual',
    manualArtist: '',
    manualTrack: '',
    accentColor: '#f59e0b',
    bgColor: '#111318',
    textColor: '#f1f5f9',
    mutedColor: '#94a3b8',
    ctaColor: '#f43f5e',
    cryptoUpColor: '#34d399',
    cryptoDownColor: '#f87171',
    fontFamily: "'Inter', sans-serif",
    fontSize: 12,
    barHeight: 64,
    borderWidth: 3,
    borderRadius: 999,
    maxWidth: 1200,
    brightness: 100,
    contrast: 100,
    saturation: 100,
  },
});

// ─── 7. CHAT ───────────────────────────────────────────
import ChatWidget from './ChatWidget';
import ChatConfig from './ChatConfig';
registerWidget({
  type: 'chat',
  label: 'Chat',
  icon: '💬',
  category: 'stream',
  component: ChatWidget,
  configPanel: ChatConfig,
  defaults: {
    twitchEnabled: false,
    twitchChannel: '',
    youtubeEnabled: false,
    youtubeVideoId: '',
    youtubeApiKey: '',
    kickEnabled: false,
    kickChannelId: '',
    maxMessages: 50,
    bgColor: 'rgba(15,23,42,0.95)',
    textColor: '#e2e8f0',
    headerBg: 'rgba(30,41,59,0.5)',
    headerText: '#94a3b8',
    borderColor: 'rgba(51,65,85,0.5)',
    fontFamily: "'Inter', sans-serif",
    fontSize: 13,
    msgSpacing: 2,
    borderRadius: 12,
    width: 350,
    height: 500,
    showHeader: true,
    showLegend: true,
    useNativeColors: true,
  },
});

// ─── 8. SESSION STATS ──────────────────────────────────
import SessionStatsWidget from './SessionStatsWidget';
registerWidget({
  type: 'session_stats',
  label: 'Session Stats',
  icon: '📈',
  category: 'casino',
  component: SessionStatsWidget,
  configPanel: null,
  defaults: {
    wagered: 0,
    won: 0,
    profit: 0,
    bestWin: 0,
    bestMulti: 0,
    slotsPlayed: 0,
    currency: '€',
  },
});

// ─── 9. RECENT WINS ────────────────────────────────────
import RecentWinsWidget from './RecentWinsWidget';
registerWidget({
  type: 'recent_wins',
  label: 'Recent Wins',
  icon: '🏅',
  category: 'casino',
  component: RecentWinsWidget,
  configPanel: null,
  defaults: {
    wins: [],
    maxDisplay: 5,
    currency: '€',
  },
});

// ─── 10. COIN FLIP ─────────────────────────────────────
import CoinFlipWidget from './CoinFlipWidget';
registerWidget({
  type: 'coinflip',
  label: 'Coin Flip',
  icon: '🪙',
  category: 'casino',
  component: CoinFlipWidget,
  configPanel: null,
  defaults: {
    flipping: false,
    result: 'heads',
    label: '',
  },
});

// ─── 11. SLOT MACHINE ──────────────────────────────────
import SlotmachineWidget from './SlotmachineWidget';
registerWidget({
  type: 'slotmachine',
  label: 'Slot Machine',
  icon: '🎰',
  category: 'casino',
  component: SlotmachineWidget,
  configPanel: null,
  defaults: {
    spinning: false,
    reels: ['🍒', '🍒', '🍒'],
    label: '',
  },
});

// ─── 12. RANDOM SLOT PICKER ────────────────────────────
import RandomSlotPickerWidget from './RandomSlotPickerWidget';
registerWidget({
  type: 'random_slot_picker',
  label: 'Random Slot Picker',
  icon: '🎲',
  category: 'casino',
  component: RandomSlotPickerWidget,
  configPanel: null,
  defaults: {
    picking: false,
    selectedSlot: null,
  },
});

// ─── 13. WHEEL OF NAMES ────────────────────────────────
import WheelOfNamesWidget from './WheelOfNamesWidget';
registerWidget({
  type: 'wheel_of_names',
  label: 'Wheel of Names',
  icon: '🎡',
  category: 'casino',
  component: WheelOfNamesWidget,
  configPanel: null,
  defaults: {
    entries: [],
    spinning: false,
    winner: '',
  },
});

// ─── 14. PLACEHOLDER (extensible) ──────────────────────
import PlaceholderWidget from './PlaceholderWidget';
registerWidget({
  type: 'placeholder',
  label: 'Custom Widget',
  icon: '🧩',
  category: 'general',
  component: PlaceholderWidget,
  configPanel: null,
  defaults: { html: '<div style="color:#fff;">Custom content</div>' },
});

// ─── 15. IMAGE SLIDESHOW ────────────────────────────────
import ImageSlideshowWidget from './ImageSlideshowWidget';
import ImageSlideshowConfig from './ImageSlideshowConfig';

// ─── 16. RTP STATS BAR ─────────────────────────────────
import RtpStatsWidget from './RtpStatsWidget';
import RtpStatsConfig from './RtpStatsConfig';
registerWidget({
  type: 'image_slideshow',
  label: 'Image Slideshow',
  icon: '🖼️',
  category: 'stream',
  component: ImageSlideshowWidget,
  configPanel: ImageSlideshowConfig,
  defaults: {
    images: [],
    interval: 5,
    fadeDuration: 1,
    width: 400,
    height: 225,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(51,65,85,0.5)',
    objectFit: 'cover',
    showGradient: true,
    gradientColor: 'rgba(15,23,42,0.8)',
    showDots: false,
    showCaption: false,
    caption: '',
    captionColor: '#e2e8f0',
    captionSize: 14,
    captionFont: "'Inter', sans-serif",
    pauseOnHover: false,
  },
});

// ─── 16. RTP STATS BAR ─────────────────────────────────
registerWidget({
  type: 'rtp_stats',
  label: 'RTP Stats Bar',
  icon: '📊',
  category: 'stream',
  component: RtpStatsWidget,
  configPanel: RtpStatsConfig,
  defaults: {
    barBgFrom: '#111827',
    barBgVia: '#1e3a5f',
    barBgTo: '#111827',
    borderColor: '#1d4ed8',
    borderWidth: 1,
    borderRadius: 8,
    textColor: '#ffffff',
    providerColor: '#ffffff',
    slotNameColor: '#ffffff',
    labelColor: '#94a3b8',
    rtpIconColor: '#60a5fa',
    potentialIconColor: '#facc15',
    volatilityIconColor: '#3b82f6',
    dividerColor: '#3b82f6',
    spinnerColor: '#60a5fa',
    fontFamily: "'Inter', sans-serif",
    fontSize: 14,
    providerFontSize: 16,
    paddingX: 16,
    paddingY: 8,
    showSpinner: true,
    showProvider: true,
    showRtp: true,
    showPotential: true,
    showVolatility: true,
    brightness: 100,
    contrast: 100,
    saturation: 100,
    rtpPresets: [],
  },
});
