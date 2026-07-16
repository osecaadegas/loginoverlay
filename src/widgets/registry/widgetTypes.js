export const WIDGET_STUDIO_SCHEMA_VERSION = 1;

export const WIDGET_STUDIO_CATEGORIES = Object.freeze([
  { id: 'all', label: 'All' },
  { id: 'statistics', label: 'Statistics' },
  { id: 'bonus-hunt', label: 'Bonus Hunt' },
  { id: 'slot-requests', label: 'Slot Requests' },
  { id: 'giveaways', label: 'Giveaways' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'chat', label: 'Chat' },
  { id: 'games', label: 'Games' },
  { id: 'other', label: 'Other' },
]);

export const WIDGET_COMPATIBILITY = Object.freeze({
  LEGACY: 'legacy',
  STUDIO_V2: 'studio-v2',
  DEPRECATED: 'deprecated',
});

export const STUDIO_FEATURE_FLAGS = Object.freeze({
  STATISTIC_CARD_V2: 'widgetStudioStatisticCardV2',
});
