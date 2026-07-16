/**
 * OverlayControlCenter.jsx - guided Overlay Center shell.
 *
 * The renderer, widgets, themes, presets and token URLs remain the existing
 * production systems. This file changes the editor experience around them.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  AlertTriangle,
  Brush,
  CheckCircle2,
  Copy,
  ExternalLink,
  Grid3X3,
  Link2,
  Lock,
  MoreVertical,
  Palette,
  PlugZap,
  Power,
  SlidersHorizontal,
  Shield,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useOverlay } from '../../hooks/useOverlay';
import { useAdmin } from '../../hooks/useAdmin';
import { usePremium } from '../../hooks/usePremium';
import { useStreamElements } from '../../context/StreamElementsContext';
import useTwitchChannel from '../../hooks/useTwitchChannel';
import usePresets from '../../hooks/usePresets';
import { trackEvent } from '../../utils/analytics';
import { ANALYTICS_EVENTS } from '../../../shared/analytics';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner';
import AppearanceCenter from './appearance/AppearanceCenter';
import ConnectServicesStep from './setup/ConnectServicesStep';
import { buildSyncedConfig } from './WidgetManager';
import PresetLibrary from './PresetLibrary';
import SlotSubmissions from './slots/SlotSubmissions';
import SlotApprovals from './slots/SlotApprovals';
import ProfileSection from './ProfileSection';
import GuidedTutorial from './GuidedTutorial';
import { themeMap } from '../../data/appThemes';
import { getAllWidgetDefs, getWidgetDef } from './widgets/widgetRegistry';
import {
  RECOMMENDED_TOOLS,
  TOOL_STATUS,
  resolveToolStatus,
} from './toolStatusResolver';
import './OverlayCenter.css';
import './OverlayRenderer.css';
import {
  currencySymbolForCode,
  normalizeCommandName,
  normalizeCommandPrefix,
  normalizeCurrencyCode,
  normalizeSetupDetails,
} from '../../../shared/serviceSetupModel';

import './widgets/builtinWidgets';

const SETUP_VERSION = 1;
const BONUS_HUNT_CURRENCY_OPTIONS = [
  { value: '\u20ac', label: '\u20ac EUR' },
  { value: '$', label: '$ USD' },
  { value: '\u00a3', label: '\u00a3 GBP' },
  { value: 'R$', label: 'R$ BRL' },
  { value: 'kr', label: 'kr SEK/NOK' },
  { value: '\u00a5', label: '\u00a5 JPY/CNY' },
  { value: '\u20b9', label: '\u20b9 INR' },
  { value: '\u20bf', label: '\u20bf BTC' },
  { value: 'C$', label: 'C$ CAD' },
  { value: 'A$', label: 'A$ AUD' },
  { value: 'CHF', label: 'CHF' },
  { value: 'PLN', label: 'PLN' },
  { value: 'TRY', label: 'TRY' },
];

const SETUP_STEPS = [
  'Create overlay',
  'Choose style',
  'Branding',
  'Choose tools',
  'Configure tools',
  'Connect services',
  'Test and publish',
];

const FEATURE_COPY = {
  bonus_hunt: {
    title: 'Bonus Hunt',
    description: 'Track bonuses, payouts and hunt progress live.',
    action: 'Open Bonus Hunt',
  },
  bets: {
    title: 'Viewer Bets',
    description: 'Create predictions and community betting events.',
    action: 'Configure Bets',
  },
  slot_requests: {
    title: 'Slot Requests',
    description: 'Manage viewer slot requests from chat.',
    action: 'Manage Requests',
  },
  giveaway: {
    title: 'Giveaways',
    description: 'Run keyword or points-based giveaways.',
    action: 'Create Giveaway',
  },
  rtp_stats: {
    title: 'RTP Stats',
    description: 'Display RTP, volatility and personal records.',
    action: 'Configure RTP Stats',
  },
  navbar: {
    title: 'Stream Navbar',
    description: 'Show branding, music and live stream information.',
    action: 'Configure Navbar',
  },
  background: {
    title: 'Overlay Background',
    description: 'Choose the visual background for your overlay.',
    action: 'Change Background',
  },
  bonus_buys: {
    title: 'Bonus Buys',
    description: 'Track bonus-buy cost, payout and profit.',
    action: 'Configure Bonus Buys',
  },
  tournament: {
    title: 'Tournament',
    description: 'Create brackets and live tournament standings.',
    action: 'Configure Tournament',
  },
  current_slot: {
    title: 'Current Slot',
    description: 'Show the active slot, provider and stake.',
    action: 'Configure Current Slot',
  },
  chat: {
    title: 'Chat',
    description: 'Display Twitch, Kick or YouTube chat.',
    action: 'Configure Chat',
  },
  spotify_now_playing: {
    title: 'Spotify',
    description: 'Show now-playing music on stream.',
    action: 'Configure Spotify',
  },
};

const PRIMARY_TOOLS = [
  'bonus_hunt',
  'bets',
  'slot_requests',
  'giveaway',
  'rtp_stats',
  'navbar',
  'background',
  'bonus_buys',
  'tournament',
  'current_slot',
  'chat',
  'spotify_now_playing',
];

const INTEGRATIONS = [
  { id: 'twitch', name: 'Twitch', requiredFor: ['slot_requests', 'chat', 'giveaway', 'bets'], detail: 'Used for chat commands, requests, giveaways and viewer activity.' },
  { id: 'streamelements', name: 'StreamElements', requiredFor: ['slot_requests', 'bets'], detail: 'Required when tools use loyalty points or StreamElements chat actions.' },
  { id: 'spotify', name: 'Spotify', requiredFor: ['navbar', 'spotify_now_playing'], detail: 'Optional music data for Navbar and Spotify widgets.' },
  { id: 'slots', name: 'Slot Database', requiredFor: ['bonus_hunt', 'current_slot', 'rtp_stats', 'slot_requests'], detail: 'Used for slot images, RTP, provider and game metadata.' },
];

const PANEL_ROUTES = {
  '/overlay-center': 'home',
  '/overlay-center/appearance': 'appearance',
  '/overlay-center/integrations': 'integrations',
  '/overlay-center/preview': 'preview',
  '/overlay-center/presets': 'presets',
  '/overlay-center/slots': 'slots',
  '/overlay-center/approvals': 'approvals',
  '/overlay-center/tutorial': 'tutorial',
  '/overlay-center/setup': 'setup',
};

function toSlug(type) {
  return String(type || '').replace(/_/g, '-');
}

function fromSlug(slug) {
  return String(slug || '').replace(/-/g, '_');
}

function getOverlayUrl(instance, { preview = false, widgetId = null } = {}) {
  if (!instance || typeof window === 'undefined') return '';
  const url = new URL(`/overlay/${instance.overlay_token}`, window.location.origin);
  if (widgetId) url.searchParams.set('widget', widgetId);
  if (preview) url.searchParams.set('preview', '1');
  return url.toString();
}

function defaultSetupState(widgets = [], theme = null, instance = null) {
  const completed = widgets.length > 0;
  const configFor = (type) => widgets.find(widget => widget.widget_type === type)?.config || {};
  const chatConfig = configFor('chat');
  const slotRequestsConfig = configFor('slot_requests');
  const betsConfig = configFor('bets');
  const bonusHuntConfig = configFor('bonus_hunt');
  const currentSlotConfig = configFor('current_slot');
  const navbarConfig = configFor('navbar');
  return {
    status: completed ? 'completed' : 'not_started',
    currentStep: 0,
    completedSteps: completed ? SETUP_STEPS.map((_, index) => index) : [],
    version: SETUP_VERSION,
    overlayId: instance?.id || null,
    updatedAt: new Date().toISOString(),
    selectedTools: completed ? widgets.map(widget => widget.widget_type) : ['navbar', 'background', 'bonus_hunt'],
    details: {
      overlayName: instance?.display_name || 'My Overlay',
      platform: 'twitch',
      resolution: `${theme?.canvas_width || 1920}x${theme?.canvas_height || 1080}`,
      language: 'English',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      style: theme?.style_preset || 'clean',
      displayName: instance?.display_name || '',
      primaryColor: theme?.primary_color || '#14b8a6',
      secondaryColor: theme?.secondary_color || '#0f172a',
      accentColor: theme?.accent_color || '#f59e0b',
      twitchChannel: chatConfig.twitchChannel || slotRequestsConfig.twitchChannel || betsConfig.twitchChannel || '',
      commandPrefix: '!',
      slotRequestCommand: normalizeCommandName(slotRequestsConfig.commandTrigger, 'sr'),
      betCommand: normalizeCommandName(betsConfig.chatCommand, 'bet'),
      giveawayKeyword: normalizeCommandName(configFor('giveaway').keyword, 'join'),
      currencyCode: normalizeCurrencyCode(bonusHuntConfig.currencyCode || currentSlotConfig.currencyCode || navbarConfig.currencyCode || bonusHuntConfig.currency || currentSlotConfig.currency || navbarConfig.balanceCurrency || 'EUR'),
      currency: normalizeCurrencyCode(bonusHuntConfig.currencyCode || currentSlotConfig.currencyCode || navbarConfig.currencyCode || bonusHuntConfig.currency || currentSlotConfig.currency || navbarConfig.balanceCurrency || 'EUR'),
      pointSource: slotRequestsConfig.srSeEnabled || betsConfig.betSeEnabled ? 'streamelements' : 'internal',
      requestsUsePoints: Boolean(slotRequestsConfig.srSeEnabled),
      requestCost: slotRequestsConfig.srSeCost || 100,
      giveawayEntryCost: configFor('giveaway').entryCost || 0,
      betsUsePoints: betsConfig.betSeEnabled !== false,
      betMinAmount: betsConfig.betMinAmount || 1,
      betMaxAmount: betsConfig.betMaxAmount || 10000,
      defaultBetAmount: betsConfig.defaultBetAmount || '',
      pointBalanceBehavior: slotRequestsConfig.pointBalanceBehavior || 'charge_immediately',
      insufficientPointsBehavior: slotRequestsConfig.insufficientPointsBehavior || 'reject',
      refundBehavior: slotRequestsConfig.refundBehavior || 'refund_on_cancel_or_reject',
      musicMode: navbarConfig.musicSource === 'spotify' ? 'spotify' : navbarConfig.musicSource === 'disabled' ? 'disabled' : 'manual',
      spotifyMode: navbarConfig.musicSource === 'spotify' ? 'spotify' : 'manual',
      manualArtist: navbarConfig.manualArtist || configFor('spotify_now_playing').manualArtist || '',
      manualTrack: navbarConfig.manualTrack || configFor('spotify_now_playing').manualTrack || '',
      manualAlbum: navbarConfig.manualAlbum || configFor('spotify_now_playing').manualAlbum || '',
      manualCoverUrl: navbarConfig.manualCoverUrl || configFor('spotify_now_playing').manualAlbumArt || '',
      manualMusicLink: navbarConfig.manualMusicLink || '',
      musicFallbackMessage: navbarConfig.musicFallbackMessage || 'No track playing',
      hideMusicWhenEmpty: navbarConfig.hideMusicWhenEmpty !== false,
      slotSource: currentSlotConfig.slotSource || 'streamers_center',
      manualSlotFallback: currentSlotConfig.manualSlotFallback !== false,
      slotProviderHint: currentSlotConfig.provider || '',
      sampleSlotName: currentSlotConfig.sampleSlotName || 'Gates of Olympus',
      unknownSlotImage: currentSlotConfig.unknownSlotImage || '',
      defaultRtpHandling: currentSlotConfig.defaultRtpHandling || 'show_unknown',
      defaultVolatilityHandling: currentSlotConfig.defaultVolatilityHandling || 'show_unknown',
      defaultProviderLabel: currentSlotConfig.defaultProviderLabel || 'Unknown provider',
      missingSlotImageBehavior: currentSlotConfig.missingSlotImageBehavior || 'use_default_image',
    },
    validationErrors: [],
  };
}

function mergeSetupState(raw, widgets, theme, instance) {
  if (raw?.status) {
    return {
      ...defaultSetupState(widgets, theme, instance),
      ...raw,
      details: {
        ...defaultSetupState(widgets, theme, instance).details,
        ...(raw.details || {}),
      },
      selectedTools: raw.selectedTools || defaultSetupState(widgets, theme, instance).selectedTools,
      validationErrors: raw.validationErrors || [],
    };
  }
  return defaultSetupState(widgets, theme, instance);
}

function normalizeTwitchChannel(value) {
  return String(value || '').trim().replace(/^#/, '').toLowerCase();
}

function normalizeCommand(value, fallback, prefix = '!') {
  return normalizeCommandName(value, fallback || '');
}

function toPositiveNumber(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, number);
}

function serviceSetupPatch(type, details = {}, integrations = {}) {
  const normalized = normalizeSetupDetails(details, integrations);
  const twitchChannel = normalizeTwitchChannel(normalized.twitchChannel || integrations.twitchChannel);
  const commandPrefix = normalizeCommandPrefix(normalized.commandPrefix || '!');
  const currencyCode = normalizeCurrencyCode(normalized.currencyCode || normalized.currency);
  const currencySymbol = currencySymbolForCode(currencyCode);
  const manualArtist = String(normalized.manualArtist || '').trim();
  const manualTrack = String(normalized.manualTrack || '').trim();
  const musicSource = normalized.musicMode === 'spotify' ? 'spotify' : normalized.musicMode === 'disabled' ? 'disabled' : 'manual';
  const usesStreamElementsPoints = normalized.pointSource === 'streamelements';

  switch (type) {
    case 'chat':
      return { twitchEnabled: Boolean(twitchChannel), twitchChannel };
    case 'giveaway':
      return { twitchEnabled: Boolean(twitchChannel), twitchChannel, commandPrefix, keyword: normalizeCommand(normalized.giveawayKeyword, 'join', commandPrefix), entryCost: normalized.giveawayEntryCost };
    case 'slot_requests':
      return {
        twitchChannel,
        commandPrefix,
        commandTrigger: normalizeCommand(normalized.slotRequestCommand, 'sr', commandPrefix),
        srSeEnabled: usesStreamElementsPoints,
        srSeCost: toPositiveNumber(normalized.requestCost, 100),
        pointBalanceBehavior: normalized.pointBalanceBehavior,
        insufficientPointsBehavior: normalized.insufficientPointsBehavior,
        refundBehavior: normalized.refundBehavior,
        pointCurrencyName: normalized.pointCurrencyName,
      };
    case 'bets':
      return {
        twitchChannel,
        commandPrefix,
        chatCommand: normalizeCommand(normalized.betCommand, 'bet', commandPrefix),
        betSeEnabled: usesStreamElementsPoints,
        betMinAmount: Math.max(1, toPositiveNumber(normalized.betMinAmount, 1)),
        betMaxAmount: toPositiveNumber(normalized.betMaxAmount, 10000),
        defaultBetAmount: normalized.defaultBetAmount,
        pointCurrencyName: normalized.pointCurrencyName,
      };
    case 'navbar':
      return {
        streamerName: normalized.displayName || normalized.overlayName || '',
        currencyCode,
        balanceCurrency: currencySymbol,
        musicSource,
        manualArtist,
        manualTrack,
        manualAlbum: normalized.manualAlbum,
        manualCoverUrl: normalized.manualCoverUrl,
        manualMusicLink: normalized.manualMusicLink,
        musicFallbackMessage: normalized.musicFallbackMessage,
        hideMusicWhenEmpty: normalized.hideMusicWhenEmpty,
        showNowPlaying: musicSource === 'spotify' || (musicSource === 'manual' && Boolean(manualArtist || manualTrack || normalized.musicFallbackMessage)),
      };
    case 'spotify_now_playing':
      return { musicSource, manualArtist, manualTrack, manualAlbum: normalized.manualAlbum, manualAlbumArt: normalized.manualCoverUrl, musicFallbackMessage: normalized.musicFallbackMessage, hideMusicWhenEmpty: normalized.hideMusicWhenEmpty };
    case 'bonus_hunt':
    case 'rtp_stats':
      return { currencyCode, currency: currencySymbol };
    case 'current_slot':
    case 'bonus_buys':
      return {
        currencyCode,
        currency: currencySymbol,
        provider: normalized.slotProviderHint || '',
        slotSource: normalized.slotSource,
        manualSlotFallback: normalized.manualSlotFallback,
        sampleSlotName: normalized.sampleSlotName,
        unknownSlotImage: normalized.unknownSlotImage,
        defaultRtpHandling: normalized.defaultRtpHandling,
        defaultVolatilityHandling: normalized.defaultVolatilityHandling,
        defaultProviderLabel: normalized.defaultProviderLabel,
        missingSlotImageBehavior: normalized.missingSlotImageBehavior,
      };
    case 'tournament':
      return { currencyCode, currency: currencySymbol, arenaCurrency: currencySymbol };
    default:
      return null;
  }
}

function validateOverlay({ instance, widgets, setup, integrations = {} }) {
  const errors = [];
  if (!instance?.overlay_token) errors.push('Browser-source URL is missing.');
  if (!setup?.details?.overlayName) errors.push('Overlay name is required.');
  const selected = setup?.selectedTools || [];
  const details = setup?.details || {};
  for (const type of selected) {
    if (!widgets.some(widget => widget.widget_type === type)) {
      errors.push(`${FEATURE_COPY[type]?.title || type} has not been added yet.`);
    }
  }
  const needsChatChannel = selected.some(type => ['chat', 'giveaway', 'slot_requests', 'bets'].includes(type));
  if (needsChatChannel && !normalizeTwitchChannel(details.twitchChannel || integrations.twitchChannel)) {
    errors.push('Add your Twitch channel so chat, requests, giveaways and bets can listen to the right stream.');
  }
  const needsStreamElements = (selected.includes('slot_requests') && details.requestsUsePoints) || (selected.includes('bets') && details.betsUsePoints !== false);
  if (needsStreamElements && !integrations.streamelementsConnected) {
    errors.push('Connect StreamElements in Integrations before using point-paid requests or bets.');
  }
  const needsSpotify = selected.includes('spotify_now_playing') || (selected.includes('navbar') && details.spotifyMode === 'spotify');
  if (needsSpotify && !integrations.spotifyConnected && !(details.manualArtist && details.manualTrack)) {
    errors.push('Connect Spotify or add a manual artist and track fallback for music widgets.');
  }
  const needsCurrency = selected.some(type => ['bonus_hunt', 'current_slot', 'rtp_stats', 'bonus_buys', 'tournament', 'navbar'].includes(type));
  if (needsCurrency && !details.currency) errors.push('Choose a currency symbol for money and slot widgets.');
  return errors;
}

function OverlayTopNavigation({ active, setupComplete }) {
  const navItems = [
    { id: 'home', label: 'Tools', to: '/overlay-center', icon: Grid3X3 },
    { id: 'integrations', label: 'Integrations', to: '/overlay-center/integrations', icon: Link2 },
    { id: 'appearance', label: 'Appearance', to: '/overlay-center/appearance', icon: Brush },
  ];

  return (
    <header className="oc2-topbar">
      <div className="oc2-brand-zone">
        <a href="https://streamerscenter.com/" className="oc2-brand" aria-label="Streamers Center home">
          <img src="/StreamerCenterLogo.png" alt="" />
        </a>
        <div className="oc2-audience-switch" aria-label="Switch experience">
          <Link to="/player/bonus-hunt" className="oc2-audience-switch__option">Player</Link>
          <Link to="/overlay-center" className="oc2-audience-switch__option oc2-audience-switch__option--active" aria-current="page">Streamer</Link>
        </div>
      </div>

      <nav className="oc2-nav" aria-label="Overlay Center navigation">
        {navItems.map(item => {
          const Icon = item.icon;
          return (
            <Link key={item.id} to={item.to} className={`oc2-nav-link${active === item.id ? ' oc2-nav-link--active' : ''}`}>
              <Icon size={16} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="oc2-topbar-actions">
        {!setupComplete && (
          <Link to="/overlay-center/setup" className="oc2-btn oc2-btn--primary">
            <Wand2 size={16} />
            Finish setup
          </Link>
        )}
        <Link to="/apps" className="oc2-btn">
          <Grid3X3 size={16} />
          Apps
        </Link>
      </div>
    </header>
  );
}

function StatusIcon({ status }) {
  if (status === TOOL_STATUS.READY) return <CheckCircle2 size={15} />;
  if (status === TOOL_STATUS.DISABLED) return <Power size={15} />;
  if (status === TOOL_STATUS.CONNECTION_REQUIRED) return <PlugZap size={15} />;
  if (status === TOOL_STATUS.PREMIUM) return <Lock size={15} />;
  if (status === TOOL_STATUS.ERROR) return <AlertTriangle size={15} />;
  return <Sparkles size={15} />;
}

function ToolCard({ tool, mode, onOpen, onAdd, onToggle, onRemove, onCopyObsUrl, copied }) {
  const { type, def, widget, copy, status } = tool;
  const installed = !!widget;
  const isDisabled = widget?.is_visible === false;
  const primaryLabel = installed
    ? (isDisabled ? 'Enable tool' : (copy.action || 'Open tool'))
    : 'Add tool';

  const handleCardOpen = () => {
    if (installed && !isDisabled) onOpen(type);
  };

  const handleKeyDown = (event) => {
    if ((event.key === 'Enter' || event.key === ' ') && installed && !isDisabled) {
      event.preventDefault();
      onOpen(type);
    }
  };

  return (
    <article
      className={`oc2-tool-card oc2-tool-card--${status.type}${installed && !isDisabled ? ' oc2-tool-card--clickable' : ''}`}
      role={installed && !isDisabled ? 'button' : undefined}
      tabIndex={installed && !isDisabled ? 0 : undefined}
      onClick={handleCardOpen}
      onKeyDown={handleKeyDown}
    >
      <header className="oc2-tool-card__header">
        <div className="oc2-tool-card__icon" aria-hidden="true">
          <span>{String(def.icon || '').slice(0, 2) || 'SC'}</span>
        </div>
        <div className="oc2-tool-card__title">
          <h3>{copy.title || def.label}</h3>
          {RECOMMENDED_TOOLS.has(type) && <span className="oc2-pill oc2-pill--gold">Recommended</span>}
        </div>
        {installed && (
          <label className="oc2-tool-toggle" onClick={event => event.stopPropagation()}>
            <input
              type="checkbox"
              checked={!isDisabled}
              onChange={() => onToggle(widget)}
              aria-label={`${isDisabled ? 'Enable' : 'Disable'} ${copy.title || def.label}`}
            />
            <span aria-hidden="true" />
          </label>
        )}
      </header>

      <p className="oc2-tool-card__description">{copy.description || def.description || 'Configure this overlay feature.'}</p>

      <div className="oc2-tool-card__spacer" />

      <div className={`oc2-tool-status oc2-tool-status--${status.type}`}>
        <StatusIcon status={status.type} />
        <span>{status.label}</span>
        {status.detail && <small>{status.detail}</small>}
      </div>

      <footer className="oc2-tool-card__actions" onClick={event => event.stopPropagation()}>
        <button
          type="button"
          className="oc2-btn oc2-btn--primary"
          onClick={() => {
            if (installed) {
              if (isDisabled) onToggle(widget);
              else onOpen(type);
            } else {
              onAdd(type);
            }
          }}
        >
          {primaryLabel}
        </button>

        {installed && (
          <details className="oc2-card-menu">
            <summary aria-label={`More actions for ${copy.title || def.label}`}>
              <MoreVertical size={18} />
            </summary>
            <div className="oc2-card-menu__panel">
              <button type="button" onClick={() => onOpen(type)}>Open settings</button>
              <button type="button" onClick={() => onToggle(widget)}>
                {isDisabled ? 'Enable on overlay' : 'Disable on overlay'}
              </button>
              <button type="button" className="oc2-card-menu__danger" onClick={() => onRemove(widget.id)}>Remove tool</button>
            </div>
          </details>
        )}

        {installed && (
          <button
            type="button"
            className="oc2-btn oc2-tool-copy-url"
            onClick={() => onCopyObsUrl(widget)}
          >
            <Copy size={15} />
            {copied ? 'Copied OBS URL' : 'Copy OBS URL'}
          </button>
        )}
      </footer>
    </article>
  );
}

function ToolSection({ title, subtitle, tools, emptyText, children, tourId }) {
  return (
    <section className="oc2-tool-section" data-tour={tourId}>
      <div className="oc2-tool-section__header">
        <div className="oc2-tool-section__title-row">
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {children}
      </div>
      {tools.length > 0 ? (
        <div className="oc2-tool-grid">
          {tools}
        </div>
      ) : (
        <div className="oc2-empty-strip">{emptyText}</div>
      )}
    </section>
  );
}

function QuickSettings({ isAdmin }) {
  const settings = [
    { title: 'Appearance', description: 'Canvas, colours and global theme.', to: '/overlay-center/appearance', icon: Palette },
    { title: 'Integrations', description: 'Connect chat, points and music.', to: '/overlay-center/integrations', icon: Link2 },
    { title: 'Presets', description: 'Save and reuse overlay layouts.', to: '/overlay-center/presets', icon: SlidersHorizontal },
  ];

  if (isAdmin) {
    settings.push({ title: 'Approvals', description: 'Review slot submissions.', to: '/overlay-center/approvals', icon: Shield, admin: true });
  }

  return (
    <section className="oc2-quick-settings">
      <div className="oc2-tool-section__header">
        <div className="oc2-tool-section__title-row">
          <h2>Quick settings</h2>
          <p>Global controls that are not overlay widgets.</p>
        </div>
      </div>
      <div className="oc2-settings-grid">
        {settings.map(item => {
          const Icon = item.icon;
          return (
            <Link key={item.title} to={item.to} className="oc2-setting-tile">
              <Icon size={19} />
              <span>
                <strong>{item.title}</strong>
                <small>{item.description}</small>
              </span>
              {item.admin && <Lock size={14} />}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function ToolWorkspace({ widgets, integrations, isAdmin, onOpenTool, onToggleTool, onAddTool, onRemoveTool, onCopyToolObsUrl, copiedWidgetId }) {
  const definitions = getAllWidgetDefs();
  const definitionMap = new Map(definitions.map(def => [def.type, def]));
  const toolTypes = PRIMARY_TOOLS.filter(type => definitionMap.has(type));

  const tools = toolTypes.map(type => {
    const def = definitionMap.get(type);
    const widget = widgets.find(item => item.widget_type === type);
    const status = resolveToolStatus({ type, widget, integrations });
    return {
      type,
      def,
      widget,
      status,
      copy: FEATURE_COPY[type] || {},
    };
  });

  const yourTools = tools.filter(tool => tool.widget && tool.widget.is_visible !== false);
  const addMoreTools = tools.filter(tool => !tool.widget || tool.widget.is_visible === false);

  const renderCard = (tool, mode) => (
    <ToolCard
      key={`${mode}-${tool.type}`}
      tool={tool}
      mode={mode}
      onOpen={onOpenTool}
      onAdd={onAddTool}
      onToggle={onToggleTool}
      onRemove={onRemoveTool}
      onCopyObsUrl={onCopyToolObsUrl}
      copied={copiedWidgetId === tool.widget?.id}
    />
  );

  return (
    <>
      <ToolSection
        title="Your tools"
        subtitle="Enabled tools currently shown on your overlay."
        emptyText="No enabled tools yet."
        tools={yourTools.map(tool => renderCard(tool, 'active'))}
        tourId="your-tools"
      />

      <ToolSection
        title="Add more tools"
        subtitle="Install a new tool or re-enable one you disabled."
        emptyText="All available tools are already active."
        tools={addMoreTools.map(tool => renderCard(tool, 'add'))}
        tourId="add-tools"
      />

      <QuickSettings isAdmin={isAdmin} />
    </>
  );
}

function normalizeBetsBracketOptions(source = []) {
  const safeSource = Array.isArray(source) ? source : [];
  return safeSource.map((option, index) => ({
    ...option,
    label: String(option?.label || `Bracket ${index + 1}`).trim() || `Bracket ${index + 1}`,
  }));
}

function summarizeBetsBracketOptions(options = []) {
  return normalizeBetsBracketOptions(options).map((option, index) => `${index + 1}. ${option.label}`).join(' | ');
}

function formatBetsSavedDate(value) {
  if (!value) return 'Saved recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Saved recently';
  return date.toLocaleString();
}

function BetsBracketShortcutTiles({ widget, saveWidget }) {
  const config = widget?.config || {};
  const usage = Array.isArray(config.bracketUsage) ? config.bracketUsage : [];
  const history = Array.isArray(config.bracketHistory) ? config.bracketHistory : [];
  const canLoad = (config.gameStatus || 'idle') === 'idle';

  if (widget?.widget_type !== 'bets' || (usage.length === 0 && history.length === 0)) return null;

  const loadEntry = (entry) => {
    if (!canLoad) return;
    saveWidget({
      ...widget,
      config: {
        ...config,
        options: normalizeBetsBracketOptions(entry.options),
      },
    });
  };

  const deleteEntry = (entry, index, kind) => {
    const key = kind === 'usage' ? 'bracketUsage' : 'bracketHistory';
    const source = kind === 'usage' ? usage : history;
    const nextEntries = source.filter((candidate, candidateIndex) => (
      entry.id ? candidate.id !== entry.id : candidateIndex !== index
    ));

    saveWidget({
      ...widget,
      config: {
        ...config,
        [key]: nextEntries,
      },
    });
  };

  const renderTile = (entry, index, kind) => {
    const options = normalizeBetsBracketOptions(entry.options);
    const question = entry.question || config.question || 'Place your bets!';
    const count = entry.count || options.length;
    const meta = kind === 'usage'
      ? `${count} brackets · used ${entry.uses || 1} time${(entry.uses || 1) === 1 ? '' : 's'}`
      : `${count} brackets · ${formatBetsSavedDate(entry.usedAt)}`;

    return (
      <article
        key={entry.id || `${kind}-${index}`}
        className="oc2-bets-shortcut-tile"
      >
        <strong>{question}</strong>
        <span>{meta}</span>
        <small>{entry.summary || summarizeBetsBracketOptions(options)}</small>
        <div className="oc2-bets-shortcut-actions">
          <button
            type="button"
            className="oc2-bets-shortcut-btn"
            onClick={() => loadEntry(entry)}
            disabled={!canLoad}
            title={canLoad ? 'Load bracket setup' : 'End the current round before loading a setup'}
          >
            Load
          </button>
          <button
            type="button"
            className="oc2-bets-shortcut-btn oc2-bets-shortcut-btn--danger"
            onClick={() => deleteEntry(entry, index, kind)}
          >
            Delete
          </button>
        </div>
      </article>
    );
  };

  return (
    <section className="oc2-bets-shortcuts">
      {usage.length > 0 && (
        <div className="oc2-bets-shortcut-section">
          <h3>Most used bracket setups</h3>
          <div className="oc2-bets-shortcut-grid">
            {usage.slice(0, 4).map((entry, index) => renderTile(entry, index, 'usage'))}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="oc2-bets-shortcut-section">
          <h3>Recent bracket history</h3>
          <div className="oc2-bets-shortcut-grid">
            {history.slice(0, 4).map((entry, index) => renderTile(entry, index, 'history'))}
          </div>
        </div>
      )}
    </section>
  );
}

function WidgetDetail({ widgetType, widgets, theme, integrations, saveWidget, addWidget }) {
  const def = getWidgetDef(widgetType);
  const widget = widgets.find(item => item.widget_type === widgetType);
  const ConfigComponent = def?.configPanel;

  if (!def) {
    return (
      <section className="oc2-panel">
        <Link className="oc2-back-link" to="/overlay-center"><ArrowLeft size={16} /> Back to tools</Link>
        <h1>Unknown widget</h1>
        <p>This widget is not registered in the current widget registry.</p>
      </section>
    );
  }

  const handleAdd = async () => {
    await addWidget(widgetType, def.defaults || {});
    trackEvent(ANALYTICS_EVENTS.OVERLAY_TOOL_ENABLED, { widget_type: widgetType });
  };

  const handleToggle = async () => {
    if (!widget) return;
    await saveWidget({ ...widget, is_visible: widget.is_visible === false });
    trackEvent(widget.is_visible === false ? ANALYTICS_EVENTS.OVERLAY_TOOL_ENABLED : ANALYTICS_EVENTS.OVERLAY_TOOL_DISABLED, { widget_type: widgetType });
  };

  const status = resolveToolStatus({ type: widgetType, widget, integrations });
  const useFullWidthConfig = widgetType === 'slot_requests';
  const detailModifier = `oc2-detail--${widgetType.replace(/_/g, '-')}`;
  const showHeaderTools = Boolean(widget);
  const showBonusHuntHeaderCurrency = widgetType === 'bonus_hunt' && Boolean(widget);
  const showBetsShortcuts = widgetType === 'bets' && Boolean(widget);

  const handleBonusHuntCurrencyChange = (event) => {
    if (!widget) return;
    saveWidget({
      ...widget,
      config: {
        ...(widget.config || {}),
        currency: event.target.value,
      },
    });
    trackEvent(ANALYTICS_EVENTS.OVERLAY_TOOL_CONFIGURED, { widget_type: widgetType, tab: 'currency' });
  };

  const renderStatusSummary = (className = '') => {
    if (!widget) return null;

    return (
      <div className={`oc2-widget-status-summary ${className}`}>
        <div className="oc2-widget-status-summary__main">
          <h3>Status</h3>
          <div className={`oc2-tool-status oc2-tool-status--${status.type}`}>
            <StatusIcon status={status.type} />
            <span>{status.label}</span>
          </div>
          {status.detail && <p>{status.detail}</p>}
          {status.issues?.length > 1 && (
            <ul className="oc2-status-issue-list">
              {status.issues.slice(0, 4).map(issue => (
                <li key={`${issue.kind}-${issue.label}`}>{issue.label}</li>
              ))}
            </ul>
          )}
        </div>
        <dl className="oc2-widget-status-summary__meta">
          <div><dt>Visible</dt><dd>{widget.is_visible === false ? 'No' : 'Yes'}</dd></div>
          <div><dt>Layer</dt><dd>{widget.z_index || 1}</dd></div>
          <div><dt>Size</dt><dd>{Math.round(widget.width)} x {Math.round(widget.height)}</dd></div>
        </dl>
      </div>
    );
  };

  const configPanel = (() => {
    if (!widget) return null;

    if (!ConfigComponent) {
      return (
        <div className="oc2-tab-panel">
          <h2>No setup panel available</h2>
          <p>This widget does not expose a custom setup form yet.</p>
        </div>
      );
    }

    return (
      <>
        <div className="oc2-config-shell oc2-config-shell--full">
          <div className="oc2-config-main">
            <ConfigComponent
              config={widget.config || {}}
              onChange={(newConfig) => {
                saveWidget({ ...widget, config: newConfig });
                trackEvent(ANALYTICS_EVENTS.OVERLAY_TOOL_CONFIGURED, { widget_type: widgetType, tab: 'setup' });
              }}
              allWidgets={widgets}
              mode={useFullWidthConfig ? 'full' : 'sidebar'}
            />
          </div>
        </div>
        {showBetsShortcuts && (
          <BetsBracketShortcutTiles widget={widget} saveWidget={saveWidget} />
        )}
      </>
    );
  })();

  return (
    <section className={`oc2-detail ${detailModifier}${showHeaderTools ? ' oc2-detail--has-header-tools' : ''}`} data-tour="widget-detail-page">
      <div className="oc2-detail-header">
        <Link className="oc2-back-link" to="/overlay-center"><ArrowLeft size={16} /> Back to tools</Link>
        <div className="oc2-detail-header-copy">
          <span className="oc2-eyebrow">Widget detail</span>
          <h1>{FEATURE_COPY[widgetType]?.title || def.label}</h1>
          <p>{FEATURE_COPY[widgetType]?.description || def.description}</p>
        </div>
        <div className="oc2-detail-actions">
          {widget && (
            <button type="button" className="oc2-btn" onClick={handleToggle}>
              {widget.is_visible === false ? 'Enable' : 'Disable'}
            </button>
          )}
          {!widget && (
            <button type="button" className="oc2-btn oc2-btn--primary" onClick={handleAdd}>
              Add widget
            </button>
          )}
        </div>
        {showHeaderTools && (
          <div
            className={`oc2-detail-header-tools${showBonusHuntHeaderCurrency ? '' : ' oc2-detail-header-tools--status-only'}`}
            aria-label={showBonusHuntHeaderCurrency ? 'Bonus Hunt quick settings' : 'Widget status'}
          >
            {showBonusHuntHeaderCurrency && (
              <label className="oc2-header-currency-field">
                <span>Currency</span>
                <select value={widget.config?.currency || '\u20ac'} onChange={handleBonusHuntCurrencyChange}>
                  {BONUS_HUNT_CURRENCY_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            )}
            {renderStatusSummary('oc2-widget-status-summary--header')}
          </div>
        )}
      </div>

      {!widget && (
        <div className="oc2-empty-state">
          <h2>Add this tool to configure it</h2>
          <p>The widget will be created with safe defaults and can be configured here.</p>
          <button type="button" className="oc2-btn oc2-btn--primary" onClick={handleAdd}>Add {def.label}</button>
        </div>
      )}

      {widget && configPanel}
    </section>
  );
}

function SetupWizard({ setup, widgets, theme, instance, integrations = {}, saveSetup, saveTheme, addWidget, saveWidget, onFinish }) {
  const [draft, setDraft] = useState(setup);
  const [actionError, setActionError] = useState('');
  const [saving, setSaving] = useState(false);
  const [serviceReadiness, setServiceReadiness] = useState({ canContinue: false, requiredTotal: 0, requiredCompleted: 0, blockingChecks: [] });
  const serviceAutosaveRef = useRef(null);
  const lastServiceAutosaveSignatureRef = useRef('');
  const step = Math.min(draft.currentStep || 0, SETUP_STEPS.length - 1);
  const selectedTools = draft.selectedTools || [];
  const details = draft.details || {};

  useEffect(() => setDraft(setup), [setup]);

  useEffect(() => () => clearTimeout(serviceAutosaveRef.current), []);

  useEffect(() => {
    if (step !== 5) return undefined;
    const signature = JSON.stringify({ details: draft.details || {}, selectedTools: draft.selectedTools || [], currentStep: draft.currentStep });
    if (signature === lastServiceAutosaveSignatureRef.current) return undefined;
    clearTimeout(serviceAutosaveRef.current);
    serviceAutosaveRef.current = setTimeout(() => {
      lastServiceAutosaveSignatureRef.current = signature;
      saveSetup({ ...draft, status: 'in_progress', updatedAt: new Date().toISOString(), version: SETUP_VERSION }).catch(error => {
        console.error('[OverlaySetup] service autosave failed', error);
      });
    }, 900);
    return () => clearTimeout(serviceAutosaveRef.current);
  }, [draft, saveSetup, step]);

  const patchDetails = (patch) => {
    setDraft(prev => ({ ...prev, details: normalizeSetupDetails({ ...(prev.details || {}), ...patch }, integrations) }));
  };

  const persist = async (next, stepToComplete = step) => {
    const completedSteps = Array.from(new Set([...(next.completedSteps || []), stepToComplete])).sort((a, b) => a - b);
    const updated = { ...next, completedSteps, status: 'in_progress', updatedAt: new Date().toISOString(), version: SETUP_VERSION };
    await saveSetup(updated);
    setDraft(updated);
    trackEvent(ANALYTICS_EVENTS.OVERLAY_SETUP_STEP_COMPLETED, { step: stepToComplete + 1 });
    return updated;
  };

  const applyServiceSetupToWidgets = async (detailsToApply) => {
    const updates = widgets
      .filter(widget => selectedTools.includes(widget.widget_type))
      .map(widget => {
        const patch = serviceSetupPatch(widget.widget_type, detailsToApply, integrations);
        if (!patch) return null;
        const cleanPatch = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
        if (!Object.keys(cleanPatch).length) return null;
        return saveWidget({ ...widget, config: { ...widget.config, ...cleanPatch } });
      })
      .filter(Boolean);
    await Promise.all(updates);
  };

  const nextStep = async () => {
    if (saving) return;
    setSaving(true);
    setActionError('');
    try {
      let next = { ...draft };
      if (step === 0) {
        const [width, height] = String(next.details?.resolution || '1920x1080').split('x').map(Number);
        await saveTheme({ canvas_width: width || 1920, canvas_height: height || 1080 });
      }
      if (step === 1) {
        if (next.details?.style === 'clean') {
          await saveTheme({ style_preset: 'classic', primary_color: '#14b8a6', secondary_color: '#0f172a', accent_color: '#f59e0b' });
        }
      }
      if (step === 4) {
        for (const type of selectedTools) {
          const def = getWidgetDef(type);
          const existing = widgets.find(widget => widget.widget_type === type);
          if (!existing && def) await addWidget(type, def.defaults || {});
        }
      }
      if (step === 5) {
        if (!serviceReadiness.canContinue) {
          setActionError('Finish the required service checks before continuing. Optional integrations and selected fallbacks will not block setup.');
          return;
        }
        await applyServiceSetupToWidgets(next.details || {});
      }
      next = { ...next, currentStep: Math.min(step + 1, SETUP_STEPS.length - 1) };
      await persist(next);
    } catch (error) {
      console.error('[OverlaySetup] Could not continue setup:', error);
      setActionError(error?.message || 'Could not save this setup step. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const saveServiceProgress = useCallback(async () => {
    clearTimeout(serviceAutosaveRef.current);
    lastServiceAutosaveSignatureRef.current = JSON.stringify({ details: draft.details || {}, selectedTools: draft.selectedTools || [], currentStep: draft.currentStep });
    await saveSetup({ ...draft, status: 'in_progress', updatedAt: new Date().toISOString(), version: SETUP_VERSION });
  }, [draft, saveSetup]);

  const finish = async () => {
    if (saving) return;
    setSaving(true);
    setActionError('');
    const errors = validateOverlay({ instance, widgets, setup: draft, integrations });
    const finalState = {
      ...draft,
      status: errors.length ? 'failed' : 'completed',
      validationErrors: errors,
      currentStep: SETUP_STEPS.length - 1,
      completedSteps: SETUP_STEPS.map((_, index) => index),
      updatedAt: new Date().toISOString(),
      version: SETUP_VERSION,
    };
    try {
      await saveSetup(finalState);
      if (!errors.length) {
        trackEvent(ANALYTICS_EVENTS.OVERLAY_SETUP_COMPLETED, { selected_tools: selectedTools.length });
        onFinish();
      }
      setDraft(finalState);
    } catch (error) {
      console.error('[OverlaySetup] Could not finish setup:', error);
      setActionError(error?.message || 'Could not finish setup. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="oc2-setup">
      <div className="oc2-setup-header">
        <span className="oc2-eyebrow">Step {step + 1} of {SETUP_STEPS.length}</span>
        <h1>{SETUP_STEPS[step]}</h1>
        <div className="oc2-progress" aria-label={`Setup progress step ${step + 1} of ${SETUP_STEPS.length}`}>
          <span style={{ width: `${((step + 1) / SETUP_STEPS.length) * 100}%` }} />
        </div>
      </div>

      {step === 0 && (
        <div className="oc2-form-grid">
          <Field label="Overlay name">
            <input value={draft.details?.overlayName || ''} onChange={event => patchDetails({ overlayName: event.target.value })} />
          </Field>
          <Field label="Platform">
            <select value={draft.details?.platform || 'twitch'} onChange={event => patchDetails({ platform: event.target.value })}>
              <option value="twitch">Twitch</option>
              <option value="kick">Kick</option>
              <option value="youtube">YouTube</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Resolution">
            <select value={draft.details?.resolution || '1920x1080'} onChange={event => patchDetails({ resolution: event.target.value })}>
              <option value="1920x1080">1920 x 1080</option>
              <option value="2560x1440">2560 x 1440</option>
            </select>
          </Field>
          <Field label="Display language">
            <input value={draft.details?.language || 'English'} onChange={event => patchDetails({ language: event.target.value })} />
          </Field>
          <Field label="Timezone">
            <input value={draft.details?.timezone || 'UTC'} onChange={event => patchDetails({ timezone: event.target.value })} />
          </Field>
        </div>
      )}

      {step === 1 && (
        <div className="oc2-choice-grid">
          {[
            { id: 'clean', name: 'Clean default', desc: 'A calm, readable broadcast base.' },
            { id: 'classic', name: 'Classic theme', desc: 'Uses the existing classic overlay styling.' },
            { id: 'metallic', name: 'Metallic theme', desc: 'Darker, premium and dimensional.' },
          ].map(style => (
            <button
              key={style.id}
              type="button"
              className={`oc2-choice-card${draft.details?.style === style.id ? ' oc2-choice-card--selected' : ''}`}
              onClick={() => patchDetails({ style: style.id })}
            >
              <span className="oc2-choice-preview" />
              <strong>{style.name}</strong>
              <span>{style.desc}</span>
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="oc2-form-grid">
          <Field label="Display name">
            <input value={draft.details?.displayName || ''} onChange={event => patchDetails({ displayName: event.target.value })} />
          </Field>
          <Field label="Logo or avatar URL">
            <input value={draft.details?.logoUrl || ''} onChange={event => patchDetails({ logoUrl: event.target.value })} />
          </Field>
          <Field label="Primary colour">
            <input type="color" value={draft.details?.primaryColor || '#14b8a6'} onChange={event => patchDetails({ primaryColor: event.target.value })} />
          </Field>
          <Field label="Secondary colour">
            <input type="color" value={draft.details?.secondaryColor || '#0f172a'} onChange={event => patchDetails({ secondaryColor: event.target.value })} />
          </Field>
          <Field label="Accent colour">
            <input type="color" value={draft.details?.accentColor || '#f59e0b'} onChange={event => patchDetails({ accentColor: event.target.value })} />
          </Field>
        </div>
      )}

      {step === 3 && (
        <div className="oc2-select-tools">
          {PRIMARY_TOOLS.filter(type => getWidgetDef(type)).map(type => (
            <label key={type} className="oc2-tool-check">
              <input
                type="checkbox"
                checked={selectedTools.includes(type)}
                onChange={event => {
                  setDraft(prev => ({
                    ...prev,
                    selectedTools: event.target.checked
                      ? Array.from(new Set([...(prev.selectedTools || []), type]))
                      : (prev.selectedTools || []).filter(item => item !== type),
                  }));
                }}
              />
              <span>
                <strong>{FEATURE_COPY[type]?.title || getWidgetDef(type)?.label}</strong>
                <small>{FEATURE_COPY[type]?.description || getWidgetDef(type)?.description}</small>
              </span>
            </label>
          ))}
        </div>
      )}

      {step === 4 && (
        <div className="oc2-panel">
          <h2>Selected tools</h2>
          <p>We will create any missing selected tools with safe defaults. Detailed settings remain available later from each tool page.</p>
          <div className="oc2-setup-tool-list">
            {selectedTools.map(type => {
              const widget = widgets.find(item => item.widget_type === type);
              return (
                <div key={type}>
                  <strong>{FEATURE_COPY[type]?.title || type}</strong>
                  <span>{widget ? 'Already configured' : 'Will be added with defaults'}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {step === 5 && (
        <ConnectServicesStep
          details={details}
          selectedTools={selectedTools}
          widgets={widgets}
          integrations={integrations}
          saving={saving}
          onDetailsChange={(nextDetails) => setDraft(prev => ({ ...prev, details: nextDetails }))}
          onReadinessChange={setServiceReadiness}
          onSaveProgress={saveServiceProgress}
          onContinue={nextStep}
        />
      )}

      {step === 6 && (
        <div className="oc2-panel">
          <h2>Ready to publish</h2>
          <p>Selected tools: {selectedTools.length}. Browser-source URL: {instance?.overlay_token ? 'active' : 'missing'}.</p>
          {draft.validationErrors?.length > 0 && (
            <div className="oc2-error-list">
              {draft.validationErrors.map(error => <p key={error}>{error}</p>)}
            </div>
          )}
        </div>
      )}

      <div className="oc2-setup-actions">
        {actionError && <div className="oc2-error-list"><p>{actionError}</p></div>}
        <button type="button" className="oc2-btn" disabled={saving || step === 0} onClick={() => setDraft(prev => ({ ...prev, currentStep: Math.max(0, step - 1) }))}>Back</button>
        <button type="button" className="oc2-btn" disabled={saving} onClick={() => saveSetup({ ...draft, status: 'in_progress', updatedAt: new Date().toISOString() })}>Save and exit</button>
        {step === 5 ? null : step < SETUP_STEPS.length - 1 ? (
          <button type="button" className="oc2-btn oc2-btn--primary" disabled={saving} onClick={nextStep}>{saving ? 'Saving...' : 'Save and continue'}</button>
        ) : (
          <button type="button" className="oc2-btn oc2-btn--primary" disabled={saving} onClick={finish}>{saving ? 'Saving...' : 'Finish setup'}</button>
        )}
      </div>
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label className="oc2-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function PreviewWorkspace({ overlayUrl, instance, previewStatus, onOpen, onFocus, onClose, copyUrl, copyMsg }) {
  return (
    <section className="oc2-preview-page" data-tour="preview-page">
      <div className="oc2-detail-header">
        <div>
          <span className="oc2-eyebrow">Live preview</span>
          <h1>Preview your overlay</h1>
          <p>Inline preview uses the same tokenized browser-source URL that OBS uses.</p>
        </div>
        <div className="oc2-detail-actions">
          <button type="button" className="oc2-btn oc2-btn--primary" onClick={onOpen}><ExternalLink size={16} /> Open in new window</button>
          <button type="button" className="oc2-btn" onClick={onFocus}>Focus preview</button>
          <button type="button" className="oc2-btn" onClick={onClose}>Close preview</button>
          <button type="button" className="oc2-btn" onClick={copyUrl} data-tour="obs-url"><Copy size={16} /> {copyMsg || 'Copy OBS URL'}</button>
        </div>
      </div>
      <div className="oc2-preview-status">
        <span className={`oc2-status-dot oc2-status-dot--${previewStatus}`} />
        Preview {previewStatus}
      </div>
      {overlayUrl ? (
        <div className="oc2-inline-preview">
          <iframe
            title="Overlay live preview"
            src={overlayUrl}
            onLoad={() => trackEvent(ANALYTICS_EVENTS.OVERLAY_PREVIEW_CONNECTED, { overlay_id: instance?.id })}
          />
        </div>
      ) : (
        <div className="oc2-empty-state">No overlay URL is available yet.</div>
      )}
    </section>
  );
}

function IntegrationGrid({ selectedTools }) {
  return (
    <div className="oc2-integration-grid oc2-integration-grid--modern" data-tour="integrations-overview">
      {INTEGRATIONS.map(item => {
        const related = selectedTools.filter(type => item.requiredFor.includes(type));
        return (
          <article key={item.id} className={`oc2-integration-card oc2-integration-card--${item.id}${related.length ? ' oc2-integration-card--relevant' : ''}`}>
            <div className="oc2-integration-card__top">
              <span className="oc2-integration-card__indicator" aria-hidden="true" />
              <strong>{item.name}</strong>
              <span className={`oc2-pill ${related.length ? 'oc2-pill--gold' : ''}`}>{related.length ? 'Relevant' : 'Optional'}</span>
            </div>
            <p>{item.detail}</p>
            <small>{related.length > 0 ? `Used by ${related.map(type => FEATURE_COPY[type]?.title || type).join(', ')}` : 'Available when a tool needs it'}</small>
          </article>
        );
      })}
    </div>
  );
}

export default function OverlayControlCenter() {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const { isPremium } = usePremium();
  const { seAccount } = useStreamElements();
  const twitchChannel = useTwitchChannel();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    instance, theme, widgets, overlayState, loading,
    saveTheme, addWidget, saveWidget, removeWidget,
    updateState, regenToken,
  } = useOverlay();
  const previewWindowRef = useRef(null);
  const previewChannelRef = useRef(null);
  const [previewStatus, setPreviewStatus] = useState('closed');
  const [copyMsg, setCopyMsg] = useState('');
  const [copiedWidgetId, setCopiedWidgetId] = useState('');
  const [guidedTutorialActive, setGuidedTutorialActive] = useState(false);

  const overlayUrl = useMemo(() => getOverlayUrl(instance), [instance]);
  const previewUrl = useMemo(() => getOverlayUrl(instance, { preview: true }), [instance]);
  const setup = useMemo(() => mergeSetupState(overlayState?.overlaySetup, widgets, theme, instance), [overlayState?.overlaySetup, widgets, theme, instance]);
  const tutorial = overlayState?.overlayTutorial || { status: 'not_started', completed: false };
  const setupComplete = setup.status === 'completed';
  const currentPanel = useMemo(() => {
    if (location.pathname.startsWith('/overlay-center/widgets/')) return 'widget-detail';
    return PANEL_ROUTES[location.pathname] || 'home';
  }, [location.pathname]);
  const widgetTypeFromRoute = useMemo(() => fromSlug(location.pathname.split('/').pop()), [location.pathname]);
  const integrations = useMemo(() => {
    const spotifyWidget = widgets.find(widget => widget.widget_type === 'spotify_now_playing');
    const navbarWidget = widgets.find(widget => widget.widget_type === 'navbar');
    return {
      twitchChannel,
      streamelementsConnected: !!(seAccount?.se_channel_id && seAccount?.se_jwt_token),
      spotifyConnected: !!(
        spotifyWidget?.config?.spotify_access_token ||
        navbarWidget?.config?.spotify_access_token
      ),
    };
  }, [widgets, twitchChannel, seAccount]);

  const {
    globalPresets, sharedPresets, presetName, setPresetName, presetMsg,
    saveGlobalPreset, loadGlobalPreset, deleteGlobalPreset,
    sharePreset, unsharePreset,
  } = usePresets({ user, isAdmin, overlayState, updateState, widgets, saveWidget, addWidget });

  useEffect(() => {
    if (location.pathname === '/overlay-center/layout') {
      navigate('/overlay-center', { replace: true });
    }
    if (location.pathname === '/overlay-center/widgets') {
      navigate('/overlay-center', { replace: true });
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    const firstRunPanels = new Set(['integrations', 'setup', 'tutorial']);
    if (!loading && user && !setupComplete && widgets.length === 0 && !firstRunPanels.has(currentPanel)) {
      navigate('/overlay-center/integrations', { replace: true });
      trackEvent(ANALYTICS_EVENTS.OVERLAY_SETUP_STARTED, {});
    }
  }, [loading, user, setupComplete, widgets.length, currentPanel, navigate]);

  useEffect(() => {
    if (!overlayUrl) return undefined;
    const channel = new BroadcastChannel('streamers-center-preview');
    previewChannelRef.current = channel;
    channel.onmessage = (event) => {
      if (event.data?.token !== instance?.overlay_token) return;
      if (event.data?.type === 'overlay-preview-ready') setPreviewStatus('connected');
      if (event.data?.type === 'overlay-preview-closed') setPreviewStatus('closed');
      if (event.data?.type === 'overlay-preview-disconnected') setPreviewStatus('disconnected');
    };
    return () => {
      channel.close();
      previewChannelRef.current = null;
    };
  }, [overlayUrl, instance?.overlay_token]);

  const saveSetup = useCallback(async (nextSetup) => {
    await updateState({ overlaySetup: nextSetup });
  }, [updateState]);

  const saveTutorial = useCallback(async (nextTutorial) => {
    await updateState({ overlayTutorial: nextTutorial });
  }, [updateState]);

  const goToTutorialPage = useCallback((page) => {
    const routeMap = {
      home: '/overlay-center',
      integrations: '/overlay-center/integrations',
      tools: '/overlay-center',
      appearance: '/overlay-center/appearance',
      preview: '/overlay-center/preview',
      presets: '/overlay-center/presets',
      slots: '/overlay-center/slots',
      approvals: '/overlay-center/approvals',
    };
    const widgetTypes = new Set(PRIMARY_TOOLS);
    const target = widgetTypes.has(page)
      ? `/overlay-center/widgets/${toSlug(page)}`
      : routeMap[page] || '/overlay-center/integrations';
    if (location.pathname !== target) navigate(target);
  }, [location.pathname, navigate]);

  const closeGuidedTutorial = useCallback(async () => {
    setGuidedTutorialActive(false);
    await saveTutorial({ status: 'completed', completed: true, currentStep: 0, updatedAt: new Date().toISOString() });
    if (location.pathname === '/overlay-center/tutorial') navigate('/overlay-center/integrations', { replace: true });
  }, [location.pathname, navigate, saveTutorial]);

  useEffect(() => {
    const isWidgetDetailPath = location.pathname.startsWith('/overlay-center/widgets/');
    const isKnownPanelPath = Boolean(PANEL_ROUTES[location.pathname]);
    if (location.pathname.startsWith('/overlay-center/') && !isWidgetDetailPath && !isKnownPanelPath) {
      navigate('/overlay-center', { replace: true });
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    if (currentPanel === 'tutorial') setGuidedTutorialActive(true);
  }, [currentPanel]);

  useEffect(() => {
    if (setupComplete && !tutorial.completed && tutorial.status === 'in_progress') {
      setGuidedTutorialActive(true);
    }
  }, [setupComplete, tutorial.completed, tutorial.status]);

  const copyUrl = useCallback(() => {
    if (!overlayUrl) return;
    navigator.clipboard.writeText(overlayUrl).then(() => {
      setCopyMsg('Copied');
      trackEvent(ANALYTICS_EVENTS.OBS_URL_COPIED, {});
      setTimeout(() => setCopyMsg(''), 1800);
    });
  }, [overlayUrl]);

  const copyToolObsUrl = useCallback((widget) => {
    const widgetUrl = getOverlayUrl(instance, { widgetId: widget?.id });
    if (!widgetUrl || !widget?.id) return;
    navigator.clipboard.writeText(widgetUrl).then(() => {
      setCopiedWidgetId(widget.id);
      trackEvent(ANALYTICS_EVENTS.OBS_URL_COPIED, { widget_type: widget.widget_type, widget_id: widget.id });
      setTimeout(() => setCopiedWidgetId(''), 1800);
    });
  }, [instance]);

  const openPreview = useCallback(() => {
    if (!previewUrl) return;
    if (previewWindowRef.current && !previewWindowRef.current.closed) {
      previewWindowRef.current.focus();
      setPreviewStatus('connected');
      return;
    }
    setPreviewStatus('opening');
    const popup = window.open(
      previewUrl,
      `streamers-center-preview-${instance?.id || 'overlay'}`,
      'popup=yes,width=1280,height=720,resizable=yes,scrollbars=no'
    );
    if (!popup) {
      setPreviewStatus('blocked');
      return;
    }
    previewWindowRef.current = popup;
    setPreviewStatus('connecting');
    trackEvent(ANALYTICS_EVENTS.OVERLAY_PREVIEW_POPPED_OUT, { overlay_id: instance?.id });
  }, [previewUrl, instance?.id]);

  const focusPreview = useCallback(() => {
    if (previewWindowRef.current && !previewWindowRef.current.closed) {
      previewWindowRef.current.focus();
      return;
    }
    setPreviewStatus('closed');
  }, []);

  const closePreview = useCallback(() => {
    if (previewWindowRef.current && !previewWindowRef.current.closed) previewWindowRef.current.close();
    previewWindowRef.current = null;
    setPreviewStatus('closed');
  }, []);

  const syncThemeToWidgets = useCallback(async (themeId, metalPresetId) => {
    const t = themeMap[themeId];
    if (!t || !widgets?.length) return;
    let colors = { ...t.colors };
    if (themeId === 'metallic' && metalPresetId) {
      const preset = (await import('../../data/appThemes')).metallicPresets[metalPresetId];
      if (preset) colors = { ...colors, primary: preset.hex, accent: preset.hex };
    }
    await saveTheme({
      style_preset: themeId,
      metal_color: metalPresetId || 'chrome',
      primary_color: colors.primary,
      secondary_color: colors.secondary,
      accent_color: colors.accent,
      text_color: colors.text,
      font_family: t.font,
    });
    const themeColors = {
      accentColor: colors.accent,
      bgColor: colors.surface,
      textColor: colors.text,
      mutedColor: colors.muted,
      borderColor: colors.border,
      fontFamily: t.font,
    };
    const navWidget = widgets.find(w => w.widget_type === 'navbar');
    if (navWidget) await saveWidget({ ...navWidget, config: { ...navWidget.config, ...themeColors, displayStyle: themeId === 'metallic' ? 'metallic' : 'glass' } });
    for (const widget of widgets) {
      if (widget.widget_type === 'navbar') continue;
      const synced = buildSyncedConfig(widget.widget_type, widget.config, themeColors);
      if (synced) await saveWidget({ ...widget, config: synced });
    }
  }, [widgets, saveTheme, saveWidget]);

  const handleAddTool = async (type) => {
    const def = getWidgetDef(type);
    if (!def) return;
    await addWidget(type, def.defaults || {});
    trackEvent(ANALYTICS_EVENTS.OVERLAY_TOOL_ENABLED, { widget_type: type });
    navigate(`/overlay-center/widgets/${toSlug(type)}`);
  };

  const handleToggleTool = async (widget) => {
    await saveWidget({ ...widget, is_visible: widget.is_visible === false });
    trackEvent(widget.is_visible === false ? ANALYTICS_EVENTS.OVERLAY_TOOL_ENABLED : ANALYTICS_EVENTS.OVERLAY_TOOL_DISABLED, { widget_type: widget.widget_type });
  };

  const handleRemoveTool = async (widgetId) => {
    const ok = window.confirm('Remove this tool from the overlay? This cannot be undone.');
    if (!ok) return;
    await removeWidget(widgetId);
  };

  const restartSetup = async () => {
    await saveSetup({ ...setup, status: 'in_progress', currentStep: 0, updatedAt: new Date().toISOString(), version: SETUP_VERSION });
    navigate('/overlay-center/setup');
  };

  if (!user) {
    return (
      <div className="oc-page oc2-page">
        <section className="oc2-empty-state">
          <h1>Login required</h1>
          <p>Sign in to access your Overlay Center.</p>
        </section>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="oc-page oc2-page">
        <section className="oc2-empty-state">
          <LoadingSpinner text="Loading your overlay..." />
        </section>
      </div>
    );
  }

  return (
    <div className="oc-page oc2-page">
      <OverlayTopNavigation
        active={currentPanel === 'widget-detail' ? 'home' : currentPanel}
        setupComplete={setupComplete}
      />

      <main className={`oc2-main${currentPanel === 'appearance' ? ' oc2-main--appearance' : ''}`}>
        {currentPanel === 'setup' && (
          <SetupWizard
            setup={setup}
            widgets={widgets}
            theme={theme}
            instance={instance}
            integrations={integrations}
            saveSetup={saveSetup}
            saveTheme={saveTheme}
            addWidget={addWidget}
            saveWidget={saveWidget}
            onFinish={() => {
              saveTutorial({ status: 'in_progress', completed: false, currentStep: 0, updatedAt: new Date().toISOString() });
              setGuidedTutorialActive(true);
              navigate('/overlay-center/integrations');
            }}
          />
        )}

        {currentPanel === 'home' && (
          <>
            {previewStatus === 'blocked' && (
              <div className="oc2-warning">Your browser blocked the preview window. Allow pop-ups for Streamers Center and try again.</div>
            )}
            <div className="oc2-section-heading">
              <span className="oc2-eyebrow">Tools</span>
              <h1>Manage your overlay</h1>
              <p>Active tools, setup warnings and global settings are separated so you can get to the right place fast.</p>
            </div>
            <ToolWorkspace
              widgets={widgets}
              integrations={integrations}
              isAdmin={isAdmin}
              onOpenTool={(type) => {
                trackEvent(ANALYTICS_EVENTS.OVERLAY_TOOL_OPENED, { widget_type: type });
                navigate(`/overlay-center/widgets/${toSlug(type)}`);
              }}
              onToggleTool={handleToggleTool}
              onAddTool={handleAddTool}
              onRemoveTool={handleRemoveTool}
              onCopyToolObsUrl={copyToolObsUrl}
              copiedWidgetId={copiedWidgetId}
            />
          </>
        )}

        {currentPanel === 'widget-detail' && (
          <WidgetDetail
            widgetType={widgetTypeFromRoute}
            widgets={widgets}
            theme={theme}
            integrations={integrations}
            saveWidget={saveWidget}
            addWidget={addWidget}
          />
        )}

        {currentPanel === 'appearance' && (
          <div data-tour="appearance-page">
            <AppearanceCenter
              user={user}
              instance={instance}
              theme={theme}
              widgets={widgets}
              overlayState={overlayState}
              saveTheme={saveTheme}
              updateState={updateState}
              onOpenPreview={openPreview}
              onFocusPreview={focusPreview}
              onClosePreview={closePreview}
              previewStatus={previewStatus}
            />
          </div>
        )}

        {currentPanel === 'integrations' && (
          <section className="oc2-integrations-page" data-tour="integrations-page">
            <div className="oc2-section-heading oc2-integrations-heading">
              <span className="oc2-eyebrow">Integrations</span>
              <h1>Connect services</h1>
              <p>Set up the accounts your overlay tools use. Keep your profile, platform channels, music and StreamElements credentials in one place.</p>
            </div>
            <IntegrationGrid selectedTools={setup.selectedTools || widgets.map(widget => widget.widget_type)} />
            <ProfileSection widgets={widgets} saveWidget={saveWidget} />
          </section>
        )}

        {currentPanel === 'preview' && (
          <PreviewWorkspace
            overlayUrl={previewUrl}
            instance={instance}
            previewStatus={previewStatus}
            onOpen={openPreview}
            onFocus={focusPreview}
            onClose={closePreview}
            copyUrl={copyUrl}
            copyMsg={copyMsg}
          />
        )}

        {currentPanel === 'presets' && (
          <div data-tour="presets-page">
            <PresetLibrary
              widgets={widgets}
              theme={theme}
              isAdmin={isAdmin}
              globalPresets={globalPresets}
              sharedPresets={sharedPresets}
              onLoadPreset={loadGlobalPreset}
              onDeletePreset={deleteGlobalPreset}
              onSharePreset={sharePreset}
              onUnsharePreset={unsharePreset}
              onSavePreset={saveGlobalPreset}
              presetName={presetName}
              setPresetName={setPresetName}
              presetMsg={presetMsg}
            />
          </div>
        )}

        {currentPanel === 'slots' && (isPremium || isAdmin) && <div data-tour="slots-page"><SlotSubmissions /></div>}
        {currentPanel === 'slots' && !(isPremium || isAdmin) && (
          <section className="oc2-empty-state">
            <Lock size={22} />
            <h1>Premium required</h1>
            <p>Slot submissions are available to Premium users.</p>
            <Link className="oc2-btn oc2-btn--primary" to="/premium">View Premium</Link>
          </section>
        )}
        {currentPanel === 'approvals' && isAdmin && <div data-tour="approvals-page"><SlotApprovals /></div>}
        {currentPanel === 'approvals' && !isAdmin && (
          <section className="oc2-empty-state">
            <Shield size={22} />
            <h1>Admin only</h1>
            <p>You need administrator access to review slot submissions.</p>
            <Link className="oc2-btn" to="/overlay-center">Back to Overlay Center</Link>
          </section>
        )}
        {currentPanel === 'tutorial' && (
          <section className="oc2-empty-state">
            <Sparkles size={22} />
            <h1>Starting guided tutorial</h1>
            <p>The tour will move you through each Overlay Center page.</p>
          </section>
        )}
      </main>
      <GuidedTutorial
        active={guidedTutorialActive}
        onClose={closeGuidedTutorial}
        goToPage={goToTutorialPage}
      />
    </div>
  );
}
