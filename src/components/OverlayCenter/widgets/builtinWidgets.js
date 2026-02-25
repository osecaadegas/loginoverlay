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
    totalCost: 0,
    totalPayout: 0,
    huntActive: false,
    currency: '€',
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

// ─── 6. PLACEHOLDER (extensible) ───────────────────────
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
