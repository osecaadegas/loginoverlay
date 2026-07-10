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
  BadgeCheck,
  Brush,
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  Grid3X3,
  LayoutDashboard,
  Link2,
  Lock,
  MonitorPlay,
  Play,
  RefreshCw,
  Settings,
  Shield,
  Sparkles,
  Unplug,
  Wand2,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useOverlay } from '../../hooks/useOverlay';
import { useAdmin } from '../../hooks/useAdmin';
import { usePremium } from '../../hooks/usePremium';
import usePresets from '../../hooks/usePresets';
import { trackEvent } from '../../utils/analytics';
import { ANALYTICS_EVENTS } from '../../../shared/analytics';
import ThemeEditor from './ThemeEditor';
import ThemesPage from '../ThemesPage/ThemesPage';
import WidgetManager, { buildSyncedConfig } from './WidgetManager';
import BonusHuntLibrary from './BonusHuntLibrary';
import OverlayAssetLibrary from './OverlayAssetLibrary';
import PresetLibrary from './PresetLibrary';
import SlotSubmissions from './slots/SlotSubmissions';
import SlotApprovals from './slots/SlotApprovals';
import ProfileSection from './ProfileSection';
import { themeMap } from '../../data/appThemes';
import { getAllWidgetDefs, getWidgetDef } from './widgets/widgetRegistry';
import { GlowButton } from './ui';
import './OverlayCenter.css';
import './OverlayRenderer.css';

import './widgets/builtinWidgets';

const SETUP_VERSION = 1;
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
    description: 'Create and manage live bonus hunts, track payouts and show progress on stream.',
    action: 'Open Bonus Hunt',
    recommended: true,
  },
  bets: {
    title: 'Viewer Bets',
    description: 'Let viewers participate in live predictions and community betting events.',
    action: 'Configure Bets',
    recommended: true,
  },
  slot_requests: {
    title: 'Slot Requests',
    description: 'Allow viewers to request slots using chat commands or connected loyalty points.',
    action: 'Manage Requests',
    recommended: true,
  },
  giveaway: {
    title: 'Giveaways',
    description: 'Create keyword or points-based giveaways and select winners live.',
    action: 'Create Giveaway',
  },
  rtp_stats: {
    title: 'RTP Stats',
    description: 'Show slot RTP, volatility, maximum win and personal statistics.',
    action: 'Configure RTP Stats',
  },
  navbar: {
    title: 'Stream Navbar',
    description: 'Display your name, stream information, music and selected branding.',
    action: 'Configure Navbar',
    recommended: true,
  },
  background: {
    title: 'Overlay Background',
    description: 'Choose an image, video, colour or animated background for your overlay.',
    action: 'Change Background',
  },
  bonus_buys: {
    title: 'Bonus Buys',
    description: 'Track bonus-buy sessions and show profit, cost and result data live.',
    action: 'Configure Bonus Buys',
  },
  tournament: {
    title: 'Tournament',
    description: 'Run slot battles, brackets and stream-ready tournament standings.',
    action: 'Configure Tournament',
  },
  current_slot: {
    title: 'Current Slot',
    description: 'Show the game you are playing with provider, stake and slot artwork.',
    action: 'Configure Current Slot',
  },
  chat: {
    title: 'Chat',
    description: 'Display Twitch, YouTube or Kick chat messages in a styled overlay.',
    action: 'Configure Chat',
  },
  spotify: {
    title: 'Spotify',
    description: 'Show now-playing music information when Spotify is connected.',
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
  'spotify',
];

const INTEGRATIONS = [
  { id: 'twitch', name: 'Twitch', requiredFor: ['slot_requests', 'chat', 'giveaway', 'bets'], detail: 'Used for chat commands, requests, giveaways and viewer activity.' },
  { id: 'streamelements', name: 'StreamElements', requiredFor: ['slot_requests', 'bets'], detail: 'Required when tools use loyalty points or StreamElements chat actions.' },
  { id: 'spotify', name: 'Spotify', requiredFor: ['navbar', 'spotify'], detail: 'Optional music data for Navbar and Spotify widgets.' },
  { id: 'slots', name: 'Slot Database', requiredFor: ['bonus_hunt', 'current_slot', 'rtp_stats', 'slot_requests'], detail: 'Used for slot images, RTP, provider and game metadata.' },
];

const PANEL_ROUTES = {
  '/overlay-center': 'home',
  '/overlay-center/widgets': 'tools',
  '/overlay-center/layout': 'layout',
  '/overlay-center/appearance': 'appearance',
  '/overlay-center/integrations': 'integrations',
  '/overlay-center/preview': 'preview',
  '/overlay-center/assets': 'assets',
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

function getOverlayUrl(instance) {
  if (!instance || typeof window === 'undefined') return '';
  return `${window.location.origin}/overlay/${instance.overlay_token}`;
}

function defaultSetupState(widgets = [], theme = null, instance = null) {
  const completed = widgets.length > 0;
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

function getWidgetStatus(widget, isPremiumLocked = false) {
  if (isPremiumLocked) return 'Premium';
  if (!widget) return 'Needs setup';
  if (widget.is_visible === false) return 'Disabled';
  return 'Ready';
}

function requiresIntegration(toolType) {
  return INTEGRATIONS.filter(item => item.requiredFor.includes(toolType));
}

function validateOverlay({ instance, widgets, setup }) {
  const errors = [];
  if (!instance?.overlay_token) errors.push('Browser-source URL is missing.');
  if (!setup?.details?.overlayName) errors.push('Overlay name is required.');
  const selected = setup?.selectedTools || [];
  for (const type of selected) {
    if (!widgets.some(widget => widget.widget_type === type)) {
      errors.push(`${FEATURE_COPY[type]?.title || type} has not been added yet.`);
    }
  }
  return errors;
}

function OverlayTopNavigation({ active, setupComplete, isAdmin, onRestartSetup, onOpenPreview }) {
  const navItems = [
    { id: 'home', label: 'Home', to: '/overlay-center', icon: LayoutDashboard },
    { id: 'tools', label: 'Tools', to: '/overlay-center/widgets', icon: Grid3X3 },
    { id: 'layout', label: 'Layout', to: '/overlay-center/layout', icon: Settings },
    { id: 'appearance', label: 'Appearance', to: '/overlay-center/appearance', icon: Brush },
    { id: 'integrations', label: 'Integrations', to: '/overlay-center/integrations', icon: Link2 },
    { id: 'preview', label: 'Preview', to: '/overlay-center/preview', icon: MonitorPlay },
  ];

  return (
    <header className="oc2-topbar">
      <Link to="/streamer" className="oc2-brand" aria-label="Streamers Center streamer home">
        <img src="/newlogo.png" alt="" />
        <span>Overlay Center</span>
      </Link>

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
        <button type="button" className="oc2-btn" onClick={onOpenPreview}>
          <ExternalLink size={16} />
          Open preview
        </button>
        <details className="oc2-menu">
          <summary className="oc2-btn">
            <Settings size={16} />
            More
          </summary>
          <div className="oc2-menu-panel">
            <Link to="/overlay-center/tutorial">Restart tutorial</Link>
            <button type="button" onClick={onRestartSetup}>Restart guided setup</button>
            <Link to="/overlay-center/assets">Assets</Link>
            <Link to="/overlay-center/presets">Presets</Link>
            <Link to="/offers">Streamer home</Link>
            {isAdmin && <Link to="/overlay-center/approvals">Approvals</Link>}
          </div>
        </details>
      </div>
    </header>
  );
}

function OverlayHealthCard({ instance, widgets, setup, previewStatus, onCopy, copyState }) {
  const errors = validateOverlay({ instance, widgets, setup });
  const selected = setup.selectedTools || [];
  const configured = selected.filter(type => widgets.some(widget => widget.widget_type === type)).length;
  const ready = errors.length === 0;

  return (
    <section className={`oc2-health ${ready ? 'oc2-health--ready' : 'oc2-health--warning'}`}>
      <div>
        <span className="oc2-eyebrow">{ready ? 'Overlay ready' : 'Setup attention needed'}</span>
        <h2>{ready ? 'Your overlay is ready to stream.' : errors[0]}</h2>
        <p>
          {configured} of {selected.length || widgets.length} selected tools configured.
          {' '}Preview is {previewStatus}.
        </p>
      </div>
      <div className="oc2-health-actions">
        <button type="button" className="oc2-btn oc2-btn--primary" onClick={onCopy}>
          <Copy size={16} />
          {copyState || 'Copy OBS URL'}
        </button>
        {!ready && <Link to="/overlay-center/setup" className="oc2-btn">Fix setup</Link>}
      </div>
    </section>
  );
}

function ToolGrid({ widgets, onOpenTool, onToggleTool, onAddTool, isAdmin }) {
  const definitions = getAllWidgetDefs();
  const definitionMap = new Map(definitions.map(def => [def.type, def]));
  const toolTypes = PRIMARY_TOOLS.filter(type => definitionMap.has(type));

  return (
    <section className="oc2-grid" aria-label="Overlay tools">
      {toolTypes.map(type => {
        const def = definitionMap.get(type);
        const widget = widgets.find(item => item.widget_type === type);
        const copy = FEATURE_COPY[type] || {};
        const status = getWidgetStatus(widget);
        const Icon = status === 'Ready' ? CheckCircle2 : status === 'Disabled' ? Eye : Sparkles;

        return (
          <article key={type} className="oc2-tool-tile">
            <div className="oc2-tool-preview" aria-hidden="true">
              <span>{String(def.icon || '').slice(0, 2) || 'SC'}</span>
            </div>
            <div className="oc2-tool-main">
              <div className="oc2-tool-heading">
                <h3>{copy.title || def.label}</h3>
                {copy.recommended && <span className="oc2-pill oc2-pill--gold">Recommended</span>}
              </div>
              <p>{copy.description || def.description || 'Configure this overlay feature.'}</p>
              <div className="oc2-tool-status">
                <Icon size={15} />
                <span>{status}</span>
              </div>
            </div>
            <div className="oc2-tool-actions">
              {widget ? (
                <>
                  <button type="button" className="oc2-btn oc2-btn--primary" onClick={() => onOpenTool(type)}>
                    {copy.action || 'Open'}
                  </button>
                  <button type="button" className="oc2-btn" onClick={() => onToggleTool(widget)}>
                    {widget.is_visible === false ? 'Enable' : 'Disable'}
                  </button>
                </>
              ) : (
                <button type="button" className="oc2-btn oc2-btn--primary" onClick={() => onAddTool(type)}>
                  Add tool
                </button>
              )}
            </div>
          </article>
        );
      })}
      <article className="oc2-tool-tile oc2-tool-tile--utility">
        <div className="oc2-tool-preview"><Brush size={34} /></div>
        <div className="oc2-tool-main">
          <h3>Themes</h3>
          <p>Apply visual systems and canvas settings without opening every widget.</p>
          <div className="oc2-tool-status"><BadgeCheck size={15} /><span>Global appearance</span></div>
        </div>
        <Link className="oc2-btn oc2-btn--primary" to="/overlay-center/appearance">Open themes</Link>
      </article>
      <article className="oc2-tool-tile oc2-tool-tile--utility">
        <div className="oc2-tool-preview"><Link2 size={34} /></div>
        <div className="oc2-tool-main">
          <h3>Integrations</h3>
          <p>Connect Twitch, StreamElements, Spotify and slot metadata where supported.</p>
          <div className="oc2-tool-status"><Unplug size={15} /><span>Connection hub</span></div>
        </div>
        <Link className="oc2-btn oc2-btn--primary" to="/overlay-center/integrations">Open integrations</Link>
      </article>
      {isAdmin && (
        <article className="oc2-tool-tile oc2-tool-tile--utility">
          <div className="oc2-tool-preview"><Shield size={34} /></div>
          <div className="oc2-tool-main">
            <h3>Approvals</h3>
            <p>Admin-only slot submission review and moderation queue.</p>
            <div className="oc2-tool-status"><Lock size={15} /><span>Admin only</span></div>
          </div>
          <Link className="oc2-btn oc2-btn--primary" to="/overlay-center/approvals">Review</Link>
        </article>
      )}
    </section>
  );
}

function WidgetDetail({ widgetType, widgets, theme, saveWidget, addWidget, removeWidget }) {
  const def = getWidgetDef(widgetType);
  const widget = widgets.find(item => item.widget_type === widgetType);
  const ConfigComponent = def?.configPanel;
  const [activeTab, setActiveTab] = useState('setup');

  if (!def) {
    return (
      <section className="oc2-panel">
        <Link className="oc2-back-link" to="/overlay-center/widgets"><ArrowLeft size={16} /> Back to tools</Link>
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

  return (
    <section className="oc2-detail">
      <div className="oc2-detail-header">
        <Link className="oc2-back-link" to="/overlay-center/widgets"><ArrowLeft size={16} /> Back to tools</Link>
        <div>
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
      </div>

      <div className="oc2-tabs" role="tablist" aria-label="Widget configuration tabs">
        {['setup', 'appearance', 'behavior', 'advanced'].map(tab => (
          <button
            key={tab}
            type="button"
            className={`oc2-tab${activeTab === tab ? ' oc2-tab--active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {!widget && (
        <div className="oc2-empty-state">
          <h2>Add this tool to configure it</h2>
          <p>The widget will be created with safe defaults and can be positioned later in Layout mode.</p>
          <button type="button" className="oc2-btn oc2-btn--primary" onClick={handleAdd}>Add {def.label}</button>
        </div>
      )}

      {widget && ConfigComponent && (
        <div className="oc2-config-shell">
          <div className="oc2-config-main">
            <ConfigComponent
              config={widget.config || {}}
              onChange={(newConfig) => {
                saveWidget({ ...widget, config: newConfig });
                trackEvent(ANALYTICS_EVENTS.OVERLAY_TOOL_CONFIGURED, { widget_type: widgetType, tab: activeTab });
              }}
              allWidgets={widgets}
              mode="sidebar"
            />
          </div>
          <aside className="oc2-config-side">
            <h3>Status</h3>
            <p>{getWidgetStatus(widget)}</p>
            <dl>
              <div><dt>Visible</dt><dd>{widget.is_visible === false ? 'No' : 'Yes'}</dd></div>
              <div><dt>Layer</dt><dd>{widget.z_index || 1}</dd></div>
              <div><dt>Size</dt><dd>{Math.round(widget.width)} x {Math.round(widget.height)}</dd></div>
            </dl>
            <Link className="oc2-btn" to="/overlay-center/layout">Open layout mode</Link>
            <details className="oc2-danger">
              <summary>Danger zone</summary>
              <button type="button" className="oc2-btn oc2-btn--danger" onClick={() => removeWidget(widget.id)}>
                Remove from overlay
              </button>
            </details>
          </aside>
        </div>
      )}
    </section>
  );
}

function SetupWizard({ setup, widgets, theme, instance, saveSetup, saveTheme, addWidget, saveWidget, onFinish }) {
  const [draft, setDraft] = useState(setup);
  const step = Math.min(draft.currentStep || 0, SETUP_STEPS.length - 1);
  const selectedTools = draft.selectedTools || [];

  useEffect(() => setDraft(setup), [setup]);

  const patchDetails = (patch) => {
    setDraft(prev => ({ ...prev, details: { ...(prev.details || {}), ...patch } }));
  };

  const persist = async (next, stepToComplete = step) => {
    const completedSteps = Array.from(new Set([...(next.completedSteps || []), stepToComplete])).sort((a, b) => a - b);
    const updated = { ...next, completedSteps, status: 'in_progress', updatedAt: new Date().toISOString(), version: SETUP_VERSION };
    await saveSetup(updated);
    setDraft(updated);
    trackEvent(ANALYTICS_EVENTS.OVERLAY_SETUP_STEP_COMPLETED, { step: stepToComplete + 1 });
    return updated;
  };

  const nextStep = async () => {
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
    next = await persist(next);
    setDraft(prev => ({ ...prev, currentStep: Math.min(step + 1, SETUP_STEPS.length - 1) }));
  };

  const finish = async () => {
    const errors = validateOverlay({ instance, widgets, setup: draft });
    const finalState = {
      ...draft,
      status: errors.length ? 'failed' : 'completed',
      validationErrors: errors,
      currentStep: SETUP_STEPS.length - 1,
      completedSteps: SETUP_STEPS.map((_, index) => index),
      updatedAt: new Date().toISOString(),
      version: SETUP_VERSION,
    };
    await saveSetup(finalState);
    if (!errors.length) {
      trackEvent(ANALYTICS_EVENTS.OVERLAY_SETUP_COMPLETED, { selected_tools: selectedTools.length });
      onFinish();
    }
    setDraft(finalState);
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
        <div className="oc2-integration-grid">
          {INTEGRATIONS.map(item => {
            const required = selectedTools.some(type => item.requiredFor.includes(type));
            return (
              <article key={item.id} className="oc2-integration-card">
                <strong>{item.name}</strong>
                <p>{item.detail}</p>
                <span className={`oc2-pill ${required ? 'oc2-pill--gold' : ''}`}>{required ? 'Required by selected tools' : 'Optional'}</span>
              </article>
            );
          })}
        </div>
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
        <button type="button" className="oc2-btn" disabled={step === 0} onClick={() => setDraft(prev => ({ ...prev, currentStep: Math.max(0, step - 1) }))}>Back</button>
        <button type="button" className="oc2-btn" onClick={() => saveSetup({ ...draft, status: 'in_progress', updatedAt: new Date().toISOString() })}>Save and exit</button>
        {step < SETUP_STEPS.length - 1 ? (
          <button type="button" className="oc2-btn oc2-btn--primary" onClick={nextStep}>Save and continue</button>
        ) : (
          <button type="button" className="oc2-btn oc2-btn--primary" onClick={finish}>Finish setup</button>
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

function TutorialOverlay({ tutorial, saveTutorial }) {
  const steps = [
    ['Choose a tool', 'Start from the grid. Each feature opens one focused configuration screen.'],
    ['Configure settings', 'Only the selected tool shows its setup, appearance, behavior and advanced options.'],
    ['Use Layout mode', 'Move, resize, reorder, hide and lock widgets only when you need layout controls.'],
    ['Open preview', 'Use inline preview for quick checks or pop out a live browser-source window.'],
    ['Copy OBS URL', 'Use the copy action when you are ready to install the overlay in OBS.'],
    ['Connect services', 'Twitch, StreamElements and Spotify live inside Integrations.'],
  ];
  const [step, setStep] = useState(tutorial?.currentStep || 0);
  const current = steps[step] || steps[0];

  const complete = async (status = 'completed') => {
    await saveTutorial({ status, completed: status === 'completed', currentStep: step, updatedAt: new Date().toISOString() });
    trackEvent(status === 'skipped' ? ANALYTICS_EVENTS.TUTORIAL_SKIPPED : ANALYTICS_EVENTS.TUTORIAL_COMPLETED, { step });
  };

  return (
    <div className="oc2-tutorial" role="dialog" aria-modal="true" aria-labelledby="oc2-tutorial-title">
      <div className="oc2-tutorial-card">
        <button type="button" className="oc2-icon-btn" aria-label="Skip tutorial" onClick={() => complete('skipped')}><X size={18} /></button>
        <span className="oc2-eyebrow">Tutorial {step + 1} of {steps.length}</span>
        <h2 id="oc2-tutorial-title">{current[0]}</h2>
        <p>{current[1]}</p>
        <div className="oc2-setup-actions">
          <button type="button" className="oc2-btn" disabled={step === 0} onClick={() => setStep(value => value - 1)}>Previous</button>
          <button type="button" className="oc2-btn" onClick={() => complete('skipped')}>Skip</button>
          {step < steps.length - 1 ? (
            <button type="button" className="oc2-btn oc2-btn--primary" onClick={() => setStep(value => value + 1)}>Next</button>
          ) : (
            <button type="button" className="oc2-btn oc2-btn--primary" onClick={() => complete('completed')}>Finish</button>
          )}
        </div>
      </div>
    </div>
  );
}

function PreviewWorkspace({ overlayUrl, instance, previewStatus, onOpen, onFocus, onClose, copyUrl, copyMsg }) {
  return (
    <section className="oc2-preview-page">
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
          <button type="button" className="oc2-btn" onClick={copyUrl}><Copy size={16} /> {copyMsg || 'Copy OBS URL'}</button>
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
    <div className="oc2-integration-grid">
      {INTEGRATIONS.map(item => {
        const related = selectedTools.filter(type => item.requiredFor.includes(type));
        return (
          <article key={item.id} className="oc2-integration-card">
            <div className="oc2-integration-card__top">
              <strong>{item.name}</strong>
              <span className={`oc2-pill ${related.length ? 'oc2-pill--gold' : ''}`}>{related.length ? 'Relevant' : 'Optional'}</span>
            </div>
            <p>{item.detail}</p>
            {related.length > 0 && <small>Used by {related.map(type => FEATURE_COPY[type]?.title || type).join(', ')}</small>}
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

  const overlayUrl = useMemo(() => getOverlayUrl(instance), [instance]);
  const setup = useMemo(() => mergeSetupState(overlayState?.overlaySetup, widgets, theme, instance), [overlayState?.overlaySetup, widgets, theme, instance]);
  const tutorial = overlayState?.overlayTutorial || { status: 'not_started', completed: false };
  const setupComplete = setup.status === 'completed';
  const currentPanel = useMemo(() => {
    if (location.pathname.startsWith('/overlay-center/widgets/')) return 'widget-detail';
    return PANEL_ROUTES[location.pathname] || 'home';
  }, [location.pathname]);
  const widgetTypeFromRoute = useMemo(() => fromSlug(location.pathname.split('/').pop()), [location.pathname]);

  const {
    globalPresets, sharedPresets, presetName, setPresetName, presetMsg,
    saveGlobalPreset, loadGlobalPreset, deleteGlobalPreset,
    sharePreset, unsharePreset,
  } = usePresets({ user, isAdmin, overlayState, updateState, widgets, saveWidget, addWidget });

  useEffect(() => {
    if (!loading && user && !setupComplete && widgets.length === 0 && currentPanel !== 'setup') {
      navigate('/overlay-center/setup', { replace: true });
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

  const copyUrl = useCallback(() => {
    if (!overlayUrl) return;
    navigator.clipboard.writeText(overlayUrl).then(() => {
      setCopyMsg('Copied');
      trackEvent(ANALYTICS_EVENTS.OBS_URL_COPIED, {});
      setTimeout(() => setCopyMsg(''), 1800);
    });
  }, [overlayUrl]);

  const openPreview = useCallback(() => {
    if (!overlayUrl) return;
    if (previewWindowRef.current && !previewWindowRef.current.closed) {
      previewWindowRef.current.focus();
      setPreviewStatus('connected');
      return;
    }
    setPreviewStatus('opening');
    const popup = window.open(
      overlayUrl,
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
  }, [overlayUrl, instance?.id]);

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
          <div className="oc-spinner" />
          <p>Loading your overlay...</p>
        </section>
      </div>
    );
  }

  return (
    <div className="oc-page oc2-page">
      <OverlayTopNavigation
        active={currentPanel === 'widget-detail' ? 'tools' : currentPanel}
        setupComplete={setupComplete}
        isAdmin={isAdmin}
        onRestartSetup={restartSetup}
        onOpenPreview={openPreview}
      />

      <main className="oc2-main">
        {currentPanel === 'setup' && (
          <SetupWizard
            setup={setup}
            widgets={widgets}
            theme={theme}
            instance={instance}
            saveSetup={saveSetup}
            saveTheme={saveTheme}
            addWidget={addWidget}
            saveWidget={saveWidget}
            onFinish={() => {
              saveTutorial({ status: 'in_progress', completed: false, currentStep: 0, updatedAt: new Date().toISOString() });
              navigate('/overlay-center');
            }}
          />
        )}

        {currentPanel === 'home' && (
          <>
            <OverlayHealthCard
              instance={instance}
              widgets={widgets}
              setup={setup}
              previewStatus={previewStatus}
              onCopy={copyUrl}
              copyState={copyMsg}
            />
            {previewStatus === 'blocked' && (
              <div className="oc2-warning">Your browser blocked the preview window. Allow pop-ups for Streamers Center and try again.</div>
            )}
            <div className="oc2-section-heading">
              <span className="oc2-eyebrow">Tools</span>
              <h1>Choose what you want to manage</h1>
              <p>Open one feature at a time. Layout controls live in Layout mode.</p>
            </div>
            <ToolGrid
              widgets={widgets}
              isAdmin={isAdmin}
              onOpenTool={(type) => {
                trackEvent(ANALYTICS_EVENTS.OVERLAY_TOOL_OPENED, { widget_type: type });
                navigate(`/overlay-center/widgets/${toSlug(type)}`);
              }}
              onToggleTool={handleToggleTool}
              onAddTool={handleAddTool}
            />
            {!tutorial.completed && setupComplete && (
              <TutorialOverlay tutorial={tutorial} saveTutorial={saveTutorial} />
            )}
          </>
        )}

        {currentPanel === 'tools' && (
          <>
            <div className="oc2-section-heading">
              <span className="oc2-eyebrow">Tool grid</span>
              <h1>Overlay tools</h1>
              <p>Add or open a tool. Advanced ordering and placement are in Layout mode.</p>
            </div>
            <ToolGrid
              widgets={widgets}
              isAdmin={isAdmin}
              onOpenTool={(type) => navigate(`/overlay-center/widgets/${toSlug(type)}`)}
              onToggleTool={handleToggleTool}
              onAddTool={handleAddTool}
            />
          </>
        )}

        {currentPanel === 'widget-detail' && (
          <WidgetDetail
            widgetType={widgetTypeFromRoute}
            widgets={widgets}
            theme={theme}
            saveWidget={saveWidget}
            addWidget={addWidget}
            removeWidget={removeWidget}
          />
        )}

        {currentPanel === 'layout' && (
          <section>
            <div className="oc2-section-heading">
              <span className="oc2-eyebrow">Layout mode</span>
              <h1>Position and layer widgets</h1>
              <p>This is the advanced placement workspace for ordering, visibility, locks, position and size.</p>
            </div>
            <WidgetManager
              widgets={widgets}
              theme={theme}
              onAdd={addWidget}
              onSave={saveWidget}
              onRemove={removeWidget}
              availableWidgets={getAllWidgetDefs()}
              overlayToken={instance?.overlay_token}
            />
          </section>
        )}

        {currentPanel === 'appearance' && (
          <section className="oc2-appearance">
            <div className="oc2-section-heading">
              <span className="oc2-eyebrow">Appearance</span>
              <h1>Themes and canvas</h1>
              <p>Adjust the global visual system. Widget-specific visuals stay inside each tool.</p>
            </div>
            <ThemesPage onApply={syncThemeToWidgets} />
            <ThemeEditor theme={theme} onSave={saveTheme} />
          </section>
        )}

        {currentPanel === 'integrations' && (
          <section>
            <div className="oc2-section-heading">
              <span className="oc2-eyebrow">Integrations</span>
              <h1>Connect services</h1>
              <p>Only integrations supported by the current repository are shown.</p>
            </div>
            <IntegrationGrid selectedTools={setup.selectedTools || widgets.map(widget => widget.widget_type)} />
            <ProfileSection widgets={widgets} saveWidget={saveWidget} />
          </section>
        )}

        {currentPanel === 'preview' && (
          <PreviewWorkspace
            overlayUrl={overlayUrl}
            instance={instance}
            previewStatus={previewStatus}
            onOpen={openPreview}
            onFocus={focusPreview}
            onClose={closePreview}
            copyUrl={copyUrl}
            copyMsg={copyMsg}
          />
        )}

        {currentPanel === 'assets' && (
          <OverlayAssetLibrary
            widgets={widgets}
            onAddWidget={addWidget}
            onOpenPanel={(panel) => navigate(panel === 'presets' ? '/overlay-center/presets' : '/overlay-center/widgets')}
            huntArchive={<BonusHuntLibrary widgets={widgets} onSaveWidget={saveWidget} />}
            presetLibrary={(
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
            )}
          />
        )}

        {currentPanel === 'presets' && (
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
        )}

        {currentPanel === 'slots' && (isPremium || isAdmin) && <SlotSubmissions />}
        {currentPanel === 'approvals' && isAdmin && <SlotApprovals />}
        {currentPanel === 'tutorial' && <TutorialOverlay tutorial={{ ...tutorial, currentStep: 0 }} saveTutorial={saveTutorial} />}
      </main>
    </div>
  );
}
