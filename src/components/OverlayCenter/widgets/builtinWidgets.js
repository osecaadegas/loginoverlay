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
  description: 'Show total bet, wins, and profit live on stream',
  category: 'casino',
  component: StatsWidget,
  configPanel: StatsConfig,
  styles: [{ id: 'v1', icon: '📊', label: 'Classic' }],
  styleConfigKey: 'displayStyle',
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
  description: 'Track bonuses collected during a hunt session',
  category: 'casino',
  component: BonusHuntWidget,
  configPanel: BonusHuntConfig,
  styles: [
    { id: 'v1', icon: '📊', label: 'Classic' },
    { id: 'v2', icon: '🌙', label: 'Sleek Dark' },
    { id: 'v3', icon: '🃏', label: 'Flip Card' },
    { id: 'v4_neon', icon: '💡', label: 'Neon' },
    { id: 'v5_horizontal', icon: '↔️', label: 'Horizontal' },
    { id: 'v6_compact', icon: '📐', label: 'Compact' },
    { id: 'v7_carousel', icon: '🎠', label: 'Carousel' },
  ],
  styleConfigKey: 'displayStyle',
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
  description: 'Display the slot you are currently playing',
  category: 'casino',
  component: CurrentSlotWidget,
  configPanel: CurrentSlotConfig,
  styles: [
    { id: 'v1', icon: '🎰', label: 'Classic' },
    { id: 'v2', icon: '💡', label: 'Neon' },
    { id: 'v3', icon: '✦', label: 'Minimal' },
    { id: 'v4', icon: '📐', label: 'Compact Bar' },
  ],
  styleConfigKey: 'displayStyle',
  defaults: {
    slotName: '',
    provider: '',
    betSize: 0,
    imageUrl: '',
    rtp: '',
    currency: '€',
  },
});

// ─── 4. TOURNAMENT ─────────────────────────────────────
import TournamentWidget from './TournamentWidget';
import TournamentConfig from './TournamentConfig';
registerWidget({
  type: 'tournament',
  label: 'Tournament',
  icon: '🏆',
  description: 'Run bracket-style slot battles between players',
  category: 'casino',
  component: TournamentWidget,
  configPanel: TournamentConfig,
  styles: [
    { id: 'grid',     icon: '⊞', label: 'Grid' },
    { id: 'showcase', icon: '🖼️', label: 'Showcase' },
    { id: 'vertical', icon: '📋', label: 'Vertical' },
    { id: 'bracket',  icon: '📊', label: 'Bracket' },
    { id: 'neon',     icon: '💡', label: 'Neon' },
    { id: 'minimal',  icon: '✦', label: 'Minimal' },
  ],
  styleConfigKey: 'layout',
  defaults: {
    title: '',
    prize: '',
    active: false,
    players: ['', '', '', '', '', '', '', ''],
    slots: [null, null, null, null, null, null, null, null],
    format: 'single',
    data: null,
    showBg: false,
    bgColor: '#13151e',
    cardBg: '#1a1d2e',
    cardBorder: 'rgba(255,255,255,0.08)',
    cardRadius: 10,
    cardBorderWidth: 1,
    nameColor: '#ffffff',
    nameSize: 12,
    multiColor: '#facc15',
    multiSize: 13,
    tabBg: 'rgba(255,255,255,0.06)',
    tabActiveBg: 'rgba(255,255,255,0.15)',
    tabColor: '#94a3b8',
    tabActiveColor: '#ffffff',
    tabBorder: 'rgba(255,255,255,0.12)',
    eliminatedOpacity: 0.35,
    showSlotName: true,
    slotNameColor: '#ffffff',
    slotNameSize: 10,
    fontFamily: "'Inter', sans-serif",
    borderRadius: 12,
    borderWidth: 0,
    borderColor: 'transparent',
    cardGap: 6,
    containerPadding: 6,
    swordColor: '#eab308',
    swordBg: 'rgba(0,0,0,0.85)',
    swordSize: 20,
    xIconColor: '#eab308',
    xIconBg: 'rgba(0,0,0,0.7)',
    tournamentNumber: '',
    bkHeaderBg: 'rgba(20,24,40,0.95)',
    bkHeaderColor: '#e2e8f0',
    bkAccent: '#6366f1',
    bkDividerColor: 'rgba(255,255,255,0.08)',
    bkFinalBg: 'rgba(59,130,246,0.12)',
    bkFinalBorder: 'rgba(59,130,246,0.35)',
    bkRowBg: 'rgba(255,255,255,0.02)',
    tournamentPresets: [],
  },
});

// ─── 5. GIVEAWAY ───────────────────────────────────────
import GiveawayWidget from './GiveawayWidget';
import GiveawayConfig from './GiveawayConfig';
registerWidget({
  type: 'giveaway',
  label: 'Giveaway',
  icon: '🎁',
  description: 'Run chat giveaways with a keyword and draw winner',
  category: 'casino',
  component: GiveawayWidget,
  configPanel: GiveawayConfig,
  styles: [
    { id: 'v1', icon: '🎁', label: 'Classic' },
    { id: 'v2', icon: '📊', label: 'Compact' },
    { id: 'v3', icon: '💡', label: 'Neon' },
    { id: 'v4', icon: '✦', label: 'Minimal' },
  ],
  styleConfigKey: 'displayStyle',
  defaults: {
    title: '',
    prize: '',
    keyword: '',
    isActive: false,
    winner: '',
    participants: [],
    twitchEnabled: false,
    twitchChannel: '',
    kickEnabled: false,
    kickChannelId: '',
    bgColor: '#13151e',
    cardBg: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.08)',
    accentColor: '#9346ff',
    textColor: '#ffffff',
    mutedColor: '#94a3b8',
    fontFamily: "'Inter', sans-serif",
    borderRadius: 12,
  },
});

// ─── 6. NAVBAR ─────────────────────────────────────────
import NavbarWidget from './NavbarWidget';
import NavbarConfig from './NavbarConfig';
registerWidget({
  type: 'navbar',
  label: 'Navbar',
  icon: '📌',
  description: 'Top bar with your name, clock, music, and branding',
  category: 'stream',
  component: NavbarWidget,
  configPanel: NavbarConfig,
  styles: [
    { id: 'v1', icon: '📌', label: 'Classic' },
    { id: 'metallic', icon: '⚙️', label: 'Metallic' },
    { id: 'neon', icon: '💡', label: 'Neon' },
    { id: 'glass', icon: '🪟', label: 'Glass' },
    { id: 'retro', icon: '📺', label: 'Retro' },
  ],
  styleConfigKey: 'displayStyle',
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
  description: 'Show Twitch, YouTube, or Kick chat on your overlay',
  category: 'stream',
  component: ChatWidget,
  configPanel: ChatConfig,
  styles: [
    { id: 'classic', icon: '📺', label: 'Classic' },
    { id: 'minimal', icon: '✦', label: 'Minimal' },
    { id: 'bubble', icon: '💬', label: 'Bubble' },
    { id: 'neon', icon: '💡', label: 'Neon' },
    { id: 'compact', icon: '📐', label: 'Compact' },
    { id: 'stream', icon: '🎮', label: 'Stream' },
    { id: 'floating', icon: '☁️', label: 'Floating' },
  ],
  styleConfigKey: 'chatStyle',
  defaults: {
    chatStyle: 'classic',
    twitchEnabled: false,
    twitchChannel: '',
    youtubeEnabled: false,
    youtubeVideoId: '',
    youtubeApiKey: '',
    kickEnabled: false,
    kickChannelId: '',
    maxMessages: 50,
    bgColor: 'rgba(20,25,46,0.92)',
    textColor: '#e2e8f0',
    headerBg: 'rgba(30,41,59,0.5)',
    headerText: '#94a3b8',
    borderColor: 'rgba(80,90,140,0.35)',
    fontFamily: "'Inter', sans-serif",
    fontSize: 14,
    msgSpacing: 4,
    msgPadH: 14,
    msgLineHeight: 1.55,
    nameBold: true,
    borderRadius: 14,
    borderWidth: 2,
    width: 350,
    height: 500,
    showHeader: true,
    showLegend: true,
    showBadges: true,
    useNativeColors: true,
  },
});

// ─── 8. SESSION STATS ──────────────────────────────────
import SessionStatsWidget from './SessionStatsWidget';
registerWidget({
  type: 'session_stats',
  label: 'Session Stats',
  icon: '📈',
  description: 'Auto-tracked session wagered, won, and best hit',
  category: 'casino',
  component: SessionStatsWidget,
  configPanel: null,
  styles: [{ id: 'v1', icon: '📈', label: 'Classic' }],
  styleConfigKey: 'displayStyle',
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
  description: 'Feed of your latest winning hits',
  category: 'casino',
  component: RecentWinsWidget,
  configPanel: null,
  styles: [{ id: 'v1', icon: '🏅', label: 'Classic' }],
  styleConfigKey: 'displayStyle',
  defaults: {
    wins: [],
    maxDisplay: 5,
    currency: '€',
  },
});

// ─── 10. RANDOM SLOT PICKER ────────────────────────────
import RandomSlotPickerWidget from './RandomSlotPickerWidget';
import RandomSlotPickerConfig from './RandomSlotPickerConfig';
registerWidget({
  type: 'random_slot_picker',
  label: 'Random Slot Picker',
  icon: '🎲',
  description: 'Randomly pick which slot to play next',
  category: 'casino',
  component: RandomSlotPickerWidget,
  configPanel: RandomSlotPickerConfig,
  styles: [
    { id: 'v1', icon: '🎲', label: 'Classic Card' },
    { id: 'v2', icon: '💡', label: 'Neon' },
    { id: 'v3', icon: '✦', label: 'Minimal' },
    { id: 'v4', icon: '🖼️', label: 'Showcase' },
  ],
  styleConfigKey: 'displayStyle',
  defaults: {
    picking: false,
    pickedSlot: null,
    slotPool: [],
  },
});

// ─── 13. WHEEL OF NAMES ────────────────────────────────
import WheelOfNamesWidget from './WheelOfNamesWidget';
import WheelOfNamesConfig from './WheelOfNamesConfig';
registerWidget({
  type: 'wheel_of_names',
  label: 'Wheel of Names',
  icon: '🎡',
  description: 'Spin a wheel with viewer names or prizes',
  category: 'casino',
  component: WheelOfNamesWidget,
  configPanel: WheelOfNamesConfig,
  styles: [
    { id: 'v1', icon: '🎡', label: 'Classic' },
    { id: 'v2', icon: '💡', label: 'Neon Glow' },
    { id: 'v3', icon: '✦', label: 'Minimal' },
    { id: 'v4', icon: '🎨', label: 'Pastel Flat' },
  ],
  styleConfigKey: 'displayStyle',
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
  description: 'Blank widget — add your own HTML content',
  category: 'general',
  component: PlaceholderWidget,
  configPanel: null,
  styles: [{ id: 'v1', icon: '🧩', label: 'Classic' }],
  styleConfigKey: 'displayStyle',
  defaults: { html: '<div style="color:#fff;">Custom content</div>' },
});

// ─── 15. IMAGE SLIDESHOW ────────────────────────────────
import ImageSlideshowWidget from './ImageSlideshowWidget';
import ImageSlideshowConfig from './ImageSlideshowConfig';

// ─── 16. RTP STATS BAR ─────────────────────────────────
import RtpStatsWidget from './RtpStatsWidget';
import RtpStatsConfig from './RtpStatsConfig';

// ─── 17. BACKGROUND ────────────────────────────────────
import BackgroundWidget from './BackgroundWidget';
import BackgroundConfig from './BackgroundConfig';

// ─── 18. RAID SHOUTOUT ─────────────────────────────────
import RaidShoutoutWidget from './RaidShoutoutWidget';
import RaidShoutoutConfig from './RaidShoutoutConfig';
registerWidget({
  type: 'image_slideshow',
  label: 'Image Slideshow',
  icon: '🖼️',
  description: 'Rotating images with fade or slide transitions',
  category: 'stream',
  component: ImageSlideshowWidget,
  configPanel: ImageSlideshowConfig,
  styles: [{ id: 'v1', icon: '🖼️', label: 'Classic' }],
  styleConfigKey: 'displayStyle',
  defaults: {
    images: [],
    interval: 5,
    fadeDuration: 1,
    animationType: 'fade',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(51,65,85,0.5)',
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
  description: 'Live RTP, volatility, and max win for current slot',
  category: 'stream',
  component: RtpStatsWidget,
  configPanel: RtpStatsConfig,
  styles: [
    { id: 'v1', icon: '📊', label: 'Classic' },
    { id: 'vertical', icon: '📋', label: 'Vertical' },
    { id: 'neon', icon: '💡', label: 'Neon' },
    { id: 'minimal', icon: '✦', label: 'Minimal' },
    { id: 'glass', icon: '🪟', label: 'Glass' },
  ],
  styleConfigKey: 'displayStyle',
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
    previewMode: true,
    brightness: 100,
    contrast: 100,
    saturation: 100,
    rtpPresets: [],
  },
});

// ─── 17. BACKGROUND ────────────────────────────────────
registerWidget({
  type: 'background',
  label: 'Background',
  icon: '🎨',
  description: 'Set a texture, image, or video as your backdrop',
  category: 'general',
  component: BackgroundWidget,
  configPanel: BackgroundConfig,
  styles: [
    { id: 'v1', icon: '🎨', label: 'Classic' },
    { id: 'aurora', icon: '🌌', label: 'Aurora' },
    { id: 'matrix', icon: '💚', label: 'Matrix' },
    { id: 'starfield', icon: '⭐', label: 'Starfield' },
    { id: 'waves', icon: '🌊', label: 'Waves' },
    { id: 'geometric', icon: '🔷', label: 'Geometric' },
  ],
  styleConfigKey: 'displayStyle',
  defaults: {
    bgMode: 'texture',
    textureType: 'gradient',
    color1: '#0f172a',
    color2: '#1e293b',
    color3: '#0f172a',
    gradientAngle: 135,
    patternSize: 20,
    animSpeed: 8,
    imageUrl: '',
    videoUrl: '',
    imageFit: 'cover',
    imagePosition: 'center',
    opacity: 100,
    borderRadius: 0,
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0,
    hueRotate: 0,
    grayscale: 0,
    sepia: 0,
    overlayColor: '#000000',
    overlayOpacity: 0,
    bgPresets: [],
  },
});
// ─── 18. RAID SHOUTOUT ─────────────────────────────────
registerWidget({
  type: 'raid_shoutout',
  label: 'Raid Shoutout',
  icon: '⚡',
  description: 'Animated alert when someone raids your channel',
  category: 'stream',
  component: RaidShoutoutWidget,
  configPanel: RaidShoutoutConfig,
  styles: [{ id: 'v1', icon: '⚡', label: 'Classic' }],
  styleConfigKey: 'displayStyle',
  defaults: {
    alertDuration: 30,
    enterAnimation: 'slideUp',
    exitAnimation: 'slideDown',
    showClip: true,
    showGame: true,
    showViewers: true,
    accentColor: '#9146FF',
    bgColor: 'rgba(13, 13, 20, 0.95)',
    textColor: '#ffffff',
    subtextColor: '#a0a0b4',
    borderRadius: 16,
    maxClipDuration: 60,
    fontFamily: "'Inter', sans-serif",
    soundUrl: '',
  },
});

// ─── 19. SPOTIFY NOW PLAYING ───────────────────────────
import SpotifyWidget from './SpotifyWidget';
import SpotifyConfig from './SpotifyConfig';
registerWidget({
  type: 'spotify_now_playing',
  label: 'Spotify Now Playing',
  icon: '🎵',
  description: 'Show the currently playing Spotify track on stream',
  category: 'stream',
  component: SpotifyWidget,
  configPanel: SpotifyConfig,
  styles: [
    { id: 'album_card',   icon: '🖼️', label: 'Album Card' },
    { id: 'mini_player',  icon: '▶️',  label: 'Mini Player' },
    { id: 'vinyl',        icon: '💿', label: 'Vinyl' },
    { id: 'glass',        icon: '🪟', label: 'Glass' },
    { id: 'wave',         icon: '🌊', label: 'Wave' },
    { id: 'neon',         icon: '💡', label: 'Neon' },
  ],
  styleConfigKey: 'displayStyle',
  defaults: {
    accentColor: '#1DB954',
    manualArtist: '',
    manualTrack: '',
    manualAlbumArt: '',
  },
});

// ─── 20. SINGLE SLOT ──────────────────────────────────
import SingleSlotWidget from './SingleSlotWidget';
import SingleSlotConfig from './SingleSlotConfig';
registerWidget({
  type: 'single_slot',
  label: 'Single Slot',
  icon: '🎰',
  description: 'Display a single slot with personal stats, records and last win info',
  category: 'casino',
  component: SingleSlotWidget,
  configPanel: SingleSlotConfig,
  styles: [{ id: 'v1', icon: '🎰', label: 'Default' }],
  styleConfigKey: 'displayStyle',
  defaults: {
    slotName: '',
    provider: '',
    imageUrl: '',
    rtp: '',
    currency: '€',
    accentColor: '#7c3aed',
    bgColor: 'rgba(13, 13, 30, 0.95)',
    textColor: '#ffffff',
    mutedColor: '#94a3b8',
    fontFamily: "'Inter', sans-serif",
    averageMulti: 0,
    bestMulti: 0,
    totalBonuses: 0,
    bestWin: 0,
    lastBet: 0,
    lastPay: 0,
    lastMulti: 0,
    lastWinIndex: 0,
  },
});