/**
 * Central status resolver for Overlay Center tools.
 * Keep this file UI-free so cards, summaries and tests can share the same truth.
 */

export const TOOL_STATUS = {
  READY: 'ready',
  NEEDS_SETUP: 'needs_setup',
  DISABLED: 'disabled',
  CONNECTION_REQUIRED: 'connection_required',
  PREMIUM: 'premium',
  ERROR: 'error',
};

export const TOOL_STATUS_LABELS = {
  [TOOL_STATUS.READY]: 'Ready',
  [TOOL_STATUS.NEEDS_SETUP]: 'Needs setup',
  [TOOL_STATUS.DISABLED]: 'Disabled',
  [TOOL_STATUS.CONNECTION_REQUIRED]: 'Connection required',
  [TOOL_STATUS.PREMIUM]: 'Premium',
  [TOOL_STATUS.ERROR]: 'Error',
};

export const RECOMMENDED_TOOLS = new Set(['bonus_hunt', 'navbar', 'background']);

const CHAT_TOOL_TYPES = new Set(['slot_requests', 'chat', 'giveaway', 'bets']);

export function toToolSlug(type) {
  return String(type || '').replace(/_/g, '-');
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasAnyText(...values) {
  return values.some(hasText);
}

function getTwitchReady(config, integrations) {
  return hasAnyText(config?.twitchChannel, config?.twitchUsername, integrations?.twitchChannel);
}

function getKickReady(config) {
  return hasAnyText(config?.kickChannelId, config?.kickChannel);
}

function getYoutubeReady(config) {
  return hasAnyText(config?.youtubeVideoId, config?.youtubeChannel);
}

export function getToolRoute(type) {
  return `/overlay-center/widgets/${toToolSlug(type)}`;
}

export function getToolSetupIssues(type, widget, integrations = {}) {
  const config = widget?.config || {};
  const issues = [];

  if (!widget) {
    issues.push({ kind: 'setup', label: 'Tool is not installed', to: getToolRoute(type) });
    return issues;
  }

  if (widget.is_visible === false) return issues;

  switch (type) {
    case 'bonus_hunt':
      if (!Array.isArray(config.bonuses) || config.bonuses.length === 0) {
        issues.push({ kind: 'setup', label: 'Add bonuses to the hunt', to: getToolRoute(type) });
      }
      break;
    case 'bonus_buys':
      if (!Array.isArray(config.bonuses) || config.bonuses.length === 0) {
        issues.push({ kind: 'setup', label: 'Add bonus-buy entries', to: getToolRoute(type) });
      }
      break;
    case 'tournament': {
      const matches = Array.isArray(config.setupMatches) ? config.setupMatches : [];
      const hasPlayers = matches.some(match => hasAnyText(match?.player1, match?.player2));
      if (!config.data && !hasPlayers) {
        issues.push({ kind: 'setup', label: 'Create tournament players', to: getToolRoute(type) });
      }
      break;
    }
    case 'current_slot':
      if (!hasAnyText(config.slotName, config.provider, config.imageUrl)) {
        issues.push({ kind: 'setup', label: 'Choose the active slot', to: getToolRoute(type) });
      }
      break;
    case 'giveaway':
      if (!hasAnyText(config.keyword, config.prize)) {
        issues.push({ kind: 'setup', label: 'Set keyword or prize', to: getToolRoute(type) });
      }
      break;
    case 'navbar':
      if (!hasAnyText(config.streamerName, config.motto, config.twitchUsername)) {
        issues.push({ kind: 'setup', label: 'Add streamer branding', to: getToolRoute(type) });
      }
      if (config.showNowPlaying && config.musicSource === 'spotify' && !integrations.spotifyConnected) {
        issues.push({ kind: 'connection', label: 'Spotify is not connected', to: '/overlay-center/integrations' });
      }
      break;
    case 'chat':
      if (!getTwitchReady(config, integrations) && !getKickReady(config) && !getYoutubeReady(config)) {
        issues.push({ kind: 'connection', label: 'Connect a chat channel', to: '/overlay-center/integrations' });
      }
      break;
    case 'slot_requests':
      if (config.srChatEnabled !== false && !getTwitchReady(config, integrations)) {
        issues.push({ kind: 'connection', label: 'Twitch channel is not connected', to: '/overlay-center/integrations' });
      }
      if (config.srSeEnabled && !integrations.streamelementsConnected) {
        issues.push({ kind: 'connection', label: 'StreamElements is not connected', to: '/overlay-center/integrations' });
      }
      break;
    case 'bets':
      if (!Array.isArray(config.options) || config.options.length < 2) {
        issues.push({ kind: 'setup', label: 'Add at least two bet options', to: getToolRoute(type) });
      }
      if (!getTwitchReady(config, integrations)) {
        issues.push({ kind: 'connection', label: 'Twitch channel is not connected', to: '/overlay-center/integrations' });
      }
      if (config.betSeEnabled !== false && !integrations.streamelementsConnected) {
        issues.push({ kind: 'connection', label: 'StreamElements is not connected', to: '/overlay-center/integrations' });
      }
      break;
    case 'spotify_now_playing':
      if (!integrations.spotifyConnected && !hasAnyText(config.spotify_access_token, config.manualTrack)) {
        issues.push({ kind: 'connection', label: 'Spotify is not connected', to: '/overlay-center/integrations' });
      }
      break;
    default:
      break;
  }

  if (CHAT_TOOL_TYPES.has(type) && config.twitchEnabled && !getTwitchReady(config, integrations)) {
    issues.push({ kind: 'connection', label: 'Twitch channel is not connected', to: '/overlay-center/integrations' });
  }

  return issues;
}

function formatIssueDetail(issues) {
  if (!issues.length) return '';
  if (issues.length === 1) return issues[0].label;
  return `${issues.length} steps remaining: ${issues[0].label}`;
}

export function resolveToolStatus({ type, widget, integrations = {}, premiumLocked = false }) {
  if (premiumLocked) {
    return {
      type: TOOL_STATUS.PREMIUM,
      label: TOOL_STATUS_LABELS[TOOL_STATUS.PREMIUM],
      detail: 'Premium access required',
      issues: [{ kind: 'premium', label: 'Premium access required', to: '/premium' }],
    };
  }

  if (!widget) {
    return {
      type: TOOL_STATUS.NEEDS_SETUP,
      label: TOOL_STATUS_LABELS[TOOL_STATUS.NEEDS_SETUP],
      detail: 'Not installed',
      issues: [{ kind: 'setup', label: 'Tool is not installed', to: getToolRoute(type) }],
    };
  }

  if (widget.is_visible === false) {
    return {
      type: TOOL_STATUS.DISABLED,
      label: TOOL_STATUS_LABELS[TOOL_STATUS.DISABLED],
      detail: 'Hidden from the live overlay',
      issues: [],
    };
  }

  const issues = getToolSetupIssues(type, widget, integrations);
  const connectionIssue = issues.find(issue => issue.kind === 'connection');
  if (connectionIssue) {
    return {
      type: TOOL_STATUS.CONNECTION_REQUIRED,
      label: TOOL_STATUS_LABELS[TOOL_STATUS.CONNECTION_REQUIRED],
      detail: connectionIssue.label,
      issues,
    };
  }

  if (issues.length > 0) {
    return {
      type: TOOL_STATUS.NEEDS_SETUP,
      label: TOOL_STATUS_LABELS[TOOL_STATUS.NEEDS_SETUP],
      detail: formatIssueDetail(issues),
      issues,
    };
  }

  return {
    type: TOOL_STATUS.READY,
    label: TOOL_STATUS_LABELS[TOOL_STATUS.READY],
    detail: 'Ready for stream',
    issues: [],
  };
}

export function summarizeOverlayTools({ toolTypes, widgets, integrations = {}, premiumLocked = false }) {
  const installed = toolTypes
    .map(type => ({ type, widget: widgets.find(item => item.widget_type === type) }))
    .filter(item => item.widget);

  const active = installed.filter(item => item.widget.is_visible !== false);
  const statuses = active.map(item => ({
    ...item,
    status: resolveToolStatus({ type: item.type, widget: item.widget, integrations, premiumLocked }),
  }));

  const ready = statuses.filter(item => item.status.type === TOOL_STATUS.READY);
  const issues = statuses.flatMap(item => item.status.issues.map(issue => ({ ...issue, toolType: item.type })));
  const uniqueIssues = [];
  const seen = new Set();
  for (const issue of issues) {
    const key = `${issue.toolType}:${issue.label}:${issue.to}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueIssues.push(issue);
    }
  }

  return {
    activeCount: active.length,
    readyCount: ready.length,
    configuredCount: ready.length,
    issueCount: uniqueIssues.length,
    issues: uniqueIssues,
    statuses,
  };
}
