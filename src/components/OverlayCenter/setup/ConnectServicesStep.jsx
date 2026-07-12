import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, RefreshCw, RotateCcw, Save, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import { safeExternalDestination, serviceLinks } from '../../../../shared/serviceLinks';
import {
  CURRENCY_OPTIONS,
  MUSIC_MODES,
  POINT_BEHAVIORS,
  POINT_SOURCES,
  READINESS_STATUSES,
  SERVICE_IDS,
  SLOT_SOURCES,
  buildFinalServiceReview,
  commandPreview,
  currencySymbolForCode,
  normalizeCommandName,
  normalizeCommandPrefix,
  normalizeSetupDetails,
  serviceSectionStatus,
  summarizeReadiness,
  validateCommandConfiguration,
  validatePointSettings,
} from '../../../../shared/serviceSetupModel';
import { checkAllServiceReadiness } from '../../../services/serviceReadinessService';

const SECTION_META = [
  { id: SERVICE_IDS.TWITCH, title: 'Twitch and chat' },
  { id: SERVICE_IDS.STREAMELEMENTS, title: 'StreamElements' },
  { id: SERVICE_IDS.MUSIC, title: 'Music' },
  { id: SERVICE_IDS.SLOT_DATA, title: 'Slot data' },
];

const STATUS_LABELS = {
  [READINESS_STATUSES.READY]: 'Ready',
  [READINESS_STATUSES.WARNING]: 'Needs attention',
  [READINESS_STATUSES.ERROR]: 'Needs attention',
  [READINESS_STATUSES.CHECKING]: 'Checking',
  [READINESS_STATUSES.OPTIONAL]: 'Optional',
  [READINESS_STATUSES.FALLBACK]: 'Using fallback',
  [READINESS_STATUSES.NOT_CONFIGURED]: 'Needs attention',
  [READINESS_STATUSES.UNAVAILABLE]: 'Unavailable',
};

function ExternalAction({ href, children, ariaLabel }) {
  const safeHref = safeExternalDestination(href, '#') || '#';
  if (!safeHref || safeHref.startsWith('/')) {
    return <a className="oc2-btn" href={safeHref} aria-label={ariaLabel || String(children)}>{children}</a>;
  }
  return (
    <a className="oc2-btn" href={safeHref} target="_blank" rel="noopener noreferrer" aria-label={ariaLabel || `${children} (opens in a new tab)`}>
      {children}
      <ExternalLink size={14} />
    </a>
  );
}

function StatusBadge({ status }) {
  const icon = status === READINESS_STATUSES.READY || status === READINESS_STATUSES.FALLBACK
    ? <CheckCircle2 size={14} />
    : <AlertTriangle size={14} />;
  return <span className={`oc2-readiness-badge oc2-readiness-badge--${status}`}>{icon}{STATUS_LABELS[status] || status}</span>;
}

function CheckList({ checks, service }) {
  const scoped = checks.filter(check => check.service === service);
  if (!scoped.length) return null;
  return (
    <div className="oc2-readiness-checks">
      {scoped.map(check => (
        <div key={check.id} className={`oc2-readiness-check oc2-readiness-check--${check.status}`}>
          <StatusBadge status={check.status} />
          <span>
            <strong>{check.title}</strong>
            <small>{check.message}</small>
          </span>
        </div>
      ))}
    </div>
  );
}

function Field({ label, help, example, status, children, onReset }) {
  return (
    <label className={`oc2-guided-field${status ? ` oc2-guided-field--${status}` : ''}`}>
      <span className="oc2-guided-field__top">
        <span>
          <strong>{label}</strong>
          {help && <small>{help}</small>}
          {example && <em>Example: {example}</em>}
        </span>
        {onReset && <button type="button" onClick={onReset} aria-label={`Reset ${label}`}><RotateCcw size={13} /></button>}
      </span>
      {children}
    </label>
  );
}

function ChoiceGroup({ label, value, options, onChange }) {
  return (
    <div className="oc2-choice-stack" role="radiogroup" aria-label={label}>
      {options.map(option => (
        <button
          key={option.id}
          type="button"
          className={`oc2-choice-row${value === option.id ? ' oc2-choice-row--selected' : ''}`}
          onClick={() => onChange(option.id)}
          role="radio"
          aria-checked={value === option.id}
        >
          <strong>{option.label}</strong>
          <small>{option.description}</small>
        </button>
      ))}
    </div>
  );
}

function CommandInput({ label, value, prefix, onChange, example, onReset }) {
  return (
    <Field label={label} help="Type the command name only. Streamers Center stores it without the prefix." example={example} onReset={onReset}>
      <span className="oc2-command-input">
        <em>{prefix}</em>
        <input value={value} onChange={event => onChange(normalizeCommandName(event.target.value))} />
      </span>
    </Field>
  );
}

function HelpDetails({ title, steps }) {
  return (
    <details className="oc2-help-details">
      <summary>{title}</summary>
      <ol>
        {steps.map(step => <li key={step}>{step}</li>)}
      </ol>
    </details>
  );
}

export default function ConnectServicesStep({
  details,
  selectedTools,
  widgets,
  integrations,
  saving,
  onDetailsChange,
  onReadinessChange,
  onSaveProgress,
  onContinue,
}) {
  const normalized = useMemo(() => normalizeSetupDetails(details, integrations), [details, integrations]);
  const [readiness, setReadiness] = useState({ checks: [], summary: summarizeReadiness([]), sections: {}, checkedAt: null });
  const [checking, setChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Readiness checks have not run yet.');
  const [currencySearch, setCurrencySearch] = useState('');
  const sectionRefs = useRef({});
  const focusCheckTimer = useRef(null);
  const abortRef = useRef(null);

  const localChecks = useMemo(() => {
    const commandValidation = validateCommandConfiguration(normalized);
    const pointValidation = validatePointSettings(normalized);
    const checks = [];
    if (commandValidation.errors.length) {
      checks.push({ id: 'local-command-errors', service: SERVICE_IDS.TWITCH, status: READINESS_STATUSES.ERROR, title: 'Command format', message: commandValidation.errors[0], blocking: true });
    }
    if (pointValidation.errors.length && normalized.pointSource === 'streamelements') {
      checks.push({ id: 'local-point-errors', service: SERVICE_IDS.STREAMELEMENTS, status: READINESS_STATUSES.ERROR, title: 'Point settings', message: pointValidation.errors[0], blocking: true });
    }
    return checks;
  }, [normalized]);

  const mergedChecks = useMemo(() => [...readiness.checks, ...localChecks], [readiness.checks, localChecks]);
  const summary = useMemo(() => summarizeReadiness(mergedChecks), [mergedChecks]);
  const sections = useMemo(() => Object.fromEntries(SECTION_META.map(section => [section.id, checking ? READINESS_STATUSES.CHECKING : serviceSectionStatus(mergedChecks, section.id)])), [checking, mergedChecks]);
  const finalReview = useMemo(() => buildFinalServiceReview(normalized, { sections }), [normalized, sections]);
  const filteredCurrencies = useMemo(() => {
    const term = currencySearch.trim().toLowerCase();
    if (!term) return CURRENCY_OPTIONS;
    return CURRENCY_OPTIONS.filter(item => `${item.code} ${item.symbol} ${item.label}`.toLowerCase().includes(term));
  }, [currencySearch]);

  const patch = useCallback((patchValue) => {
    onDetailsChange(normalizeSetupDetails({ ...normalized, ...patchValue }, integrations));
  }, [integrations, normalized, onDetailsChange]);

  const runChecks = useCallback(async (reason = 'manual') => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setChecking(true);
    setStatusMessage(reason === 'focus' ? 'Checking your updated settings...' : 'Checking service readiness...');
    try {
      const result = await checkAllServiceReadiness({ details: normalized, selectedTools, widgets, signal: controller.signal });
      const nextChecks = result.checks || [];
      const nextSummary = result.summary || summarizeReadiness(nextChecks);
      setReadiness({ checks: nextChecks, summary: nextSummary, sections: {}, checkedAt: result.checkedAt || new Date().toISOString() });
      setStatusMessage(nextSummary.canContinue ? 'All required checks are ready.' : 'Some required checks need attention.');
    } catch (error) {
      if (error.name === 'AbortError') return;
      setStatusMessage(error.message || 'Readiness checks could not be completed.');
    } finally {
      setChecking(false);
    }
  }, [normalized, selectedTools, widgets]);

  useEffect(() => {
    onReadinessChange({ ...summary, sections, checks: mergedChecks });
  }, [mergedChecks, onReadinessChange, sections, summary]);

  useEffect(() => {
    runChecks('initial');
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState !== 'visible') return;
      clearTimeout(focusCheckTimer.current);
      focusCheckTimer.current = setTimeout(() => runChecks('focus'), 900);
    };
    window.addEventListener('focus', handler);
    document.addEventListener('visibilitychange', handler);
    return () => {
      clearTimeout(focusCheckTimer.current);
      window.removeEventListener('focus', handler);
      document.removeEventListener('visibilitychange', handler);
    };
  }, [runChecks]);

  const scrollToSection = (id) => {
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const twitchLogin = readiness.checks.find(check => check.id === 'twitch-channel-confirmed')?.meta?.login || normalized.twitchChannel;
  const twitchDisplayName = readiness.checks.find(check => check.id === 'twitch-channel-confirmed')?.meta?.displayName || normalized.twitchDisplayName || twitchLogin;
  const currency = CURRENCY_OPTIONS.find(item => item.code === normalized.currencyCode) || CURRENCY_OPTIONS[0];

  return (
    <div className="oc2-connect-services">
      <div className="oc2-connect-main">
        <section ref={node => { sectionRefs.current[SERVICE_IDS.TWITCH] = node; }} id="twitch-chat" className="oc2-service-section">
          <header>
            <StatusBadge status={sections[SERVICE_IDS.TWITCH] || READINESS_STATUSES.NOT_CONFIGURED} />
            <div>
              <h2>Twitch and chat</h2>
              <p>Streamers Center uses your Twitch account to know which channel chat commands should listen to.</p>
            </div>
          </header>
          <div className="oc2-service-action-row">
            <ExternalAction href="/login" ariaLabel="Connect or reconnect Twitch">{twitchLogin ? 'Reconnect Twitch' : 'Connect Twitch'}</ExternalAction>
            <ExternalAction href={serviceLinks.twitch.dashboard}>Open Twitch Creator Dashboard</ExternalAction>
            <ExternalAction href={serviceLinks.twitch.channelSettings}>Open Twitch channel settings</ExternalAction>
            {twitchLogin && <ExternalAction href={serviceLinks.twitch.channel(twitchLogin)}>View my Twitch channel</ExternalAction>}
            <button type="button" className="oc2-btn" onClick={() => runChecks('manual')} disabled={checking}><RefreshCw size={14} /> Check chat again</button>
          </div>
          <HelpDetails title="How to set this up" steps={[
            'Sign in with the Twitch account you use for streaming.',
            'Confirm the channel name below. It should be filled automatically when Twitch is connected.',
            'Choose simple chat commands viewers can type without spaces.',
            'Press Check chat again after reconnecting Twitch or changing commands.',
          ]} />
          <div className="oc2-form-grid oc2-form-grid--compact">
            <Field label="Connected Twitch account" help="Filled from your authenticated Twitch profile when available.">
              <input value={twitchLogin || 'Not connected'} readOnly />
            </Field>
            <Field label="Twitch channel/login" help="The channel where viewers type commands." example="osecaadegas">
              <input value={normalized.twitchChannel} onChange={event => patch({ twitchChannel: event.target.value })} placeholder="yourchannel" />
            </Field>
            <Field label="Display name" help="Shown only to help you confirm the right account.">
              <input value={twitchDisplayName || ''} onChange={event => patch({ twitchDisplayName: event.target.value })} placeholder="Channel display name" />
            </Field>
            <Field label="Command prefix" help="Short symbol typed before commands." example="!" onReset={() => patch({ commandPrefix: '!' })}>
              <input value={normalized.commandPrefix} maxLength={3} onChange={event => patch({ commandPrefix: normalizeCommandPrefix(event.target.value) })} />
            </Field>
            <CommandInput label="Slot request command" value={normalized.slotRequestCommand} prefix={normalized.commandPrefix} example="sr" onChange={value => patch({ slotRequestCommand: value })} onReset={() => patch({ slotRequestCommand: 'sr' })} />
            <CommandInput label="Bet command" value={normalized.betCommand} prefix={normalized.commandPrefix} example="bet" onChange={value => patch({ betCommand: value })} onReset={() => patch({ betCommand: 'bet' })} />
            <CommandInput label="Giveaway keyword or command" value={normalized.giveawayKeyword} prefix={normalized.commandPrefix} example="join" onChange={value => patch({ giveawayKeyword: value })} onReset={() => patch({ giveawayKeyword: 'join' })} />
            <Field label="Chat connection mode" help="Use authenticated Twitch chat when available.">
              <select value={normalized.chatConnectionMode} onChange={event => patch({ chatConnectionMode: event.target.value })}>
                <option value="authenticated_twitch">Authenticated Twitch account</option>
                <option value="streamelements_bot">StreamElements bot where supported</option>
              </select>
            </Field>
          </div>
          <div className="oc2-command-preview" aria-label="Live command preview">
            <strong>Live command preview</strong>
            <code>Slot request: {commandPreview(normalized.commandPrefix, normalized.slotRequestCommand, 'Gates of Olympus')}</code>
            <code>Bet: {commandPreview(normalized.commandPrefix, normalized.betCommand, '2 500')}</code>
            <code>Giveaway: {normalized.giveawayKeyword}</code>
          </div>
          <CheckList checks={mergedChecks} service={SERVICE_IDS.TWITCH} />
        </section>

        <section ref={node => { sectionRefs.current[SERVICE_IDS.STREAMELEMENTS] = node; }} id="streamelements" className="oc2-service-section">
          <header>
            <StatusBadge status={sections[SERVICE_IDS.STREAMELEMENTS] || READINESS_STATUSES.OPTIONAL} />
            <div>
              <h2>StreamElements and viewer points</h2>
              <p>Choose how viewer interactions should use points. StreamElements is required only if you choose StreamElements loyalty points.</p>
            </div>
          </header>
          <ChoiceGroup label="How should viewer interactions use points?" value={normalized.pointSource} options={POINT_SOURCES} onChange={value => patch({ pointSource: value })} />
          {normalized.pointSource === 'streamelements' && (
            <>
              <div className="oc2-service-action-row">
                <ExternalAction href="/overlay-center/integrations">Connect StreamElements</ExternalAction>
                <ExternalAction href={serviceLinks.streamElements.dashboard}>Open StreamElements dashboard</ExternalAction>
                <ExternalAction href={serviceLinks.streamElements.channels}>Manage linked channels</ExternalAction>
                <ExternalAction href={serviceLinks.streamElements.loyalty}>Open Loyalty Settings</ExternalAction>
                <ExternalAction href={serviceLinks.streamElements.defaultCommands}>Open default commands</ExternalAction>
                <ExternalAction href={serviceLinks.streamElements.customCommands}>Open custom commands</ExternalAction>
                {twitchLogin && <ExternalAction href={serviceLinks.streamElements.publicCommands(twitchLogin)}>View public channel commands</ExternalAction>}
                <button type="button" className="oc2-btn" onClick={() => runChecks('manual')} disabled={checking}><RefreshCw size={14} /> Check connection again</button>
              </div>
              <HelpDetails title="How to set this up" steps={[
                'Connect the Twitch channel you use for streaming.',
                'Open StreamElements Loyalty Settings and enable Loyalty if you want commands to use viewer points.',
                'Open default or custom commands and confirm your StreamElements bot is available in chat.',
                'Return here and press Check connection again.',
              ]} />
              <div className="oc2-form-grid oc2-form-grid--compact">
                <Field label="Connected StreamElements channel/account" help="Managed in Integrations; tokens are never shown here.">
                  <input value={integrations.streamelementsConnected ? 'Connected' : 'Not connected'} readOnly />
                </Field>
                <Field label="Points enabled" help="Find this in StreamElements Loyalty Settings.">
                  <select value={normalized.pointsEnabled ? 'yes' : 'no'} onChange={event => patch({ pointsEnabled: event.target.value === 'yes', pointSource: event.target.value === 'yes' ? 'streamelements' : 'none' })}>
                    <option value="yes">Yes, use loyalty points</option>
                    <option value="no">No, keep interactions free</option>
                  </select>
                </Field>
                <Field label="Point currency/name" help="The label viewers recognize in StreamElements." example="points">
                  <input value={normalized.pointCurrencyName} onChange={event => patch({ pointCurrencyName: event.target.value })} />
                  <ExternalAction href={serviceLinks.streamElements.loyalty}>Where do I configure this?</ExternalAction>
                </Field>
                <Field label="Slot request point cost" help="Use 0 for free requests." example="500">
                  <input type="number" min="0" value={normalized.requestCost} onChange={event => patch({ requestCost: event.target.value })} />
                </Field>
                <Field label="Giveaway entry cost" help="Use 0 for free giveaway entries." example="100">
                  <input type="number" min="0" value={normalized.giveawayEntryCost} onChange={event => patch({ giveawayEntryCost: event.target.value })} />
                </Field>
                <Field label="Minimum bet" help="Must be greater than zero." example="10">
                  <input type="number" min="1" value={normalized.betMinAmount} onChange={event => patch({ betMinAmount: event.target.value })} />
                </Field>
                <Field label="Maximum bet" help="Must be at least the minimum bet." example="10000">
                  <input type="number" min="1" value={normalized.betMaxAmount} onChange={event => patch({ betMaxAmount: event.target.value })} />
                </Field>
                <Field label="Optional default bet" help="Leave empty if viewers should choose every amount." example="500">
                  <input type="number" min="0" value={normalized.defaultBetAmount} onChange={event => patch({ defaultBetAmount: event.target.value })} />
                </Field>
                <Field label="Point-balance behavior" help="Only supported backend behaviors are listed.">
                  <select value={normalized.pointBalanceBehavior} onChange={event => patch({ pointBalanceBehavior: event.target.value })}>
                    {POINT_BEHAVIORS.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
                  </select>
                </Field>
                <Field label="Insufficient-points behavior" help="What viewers see when they do not have enough points.">
                  <select value={normalized.insufficientPointsBehavior} onChange={event => patch({ insufficientPointsBehavior: event.target.value })}>
                    <option value="reject">Reject the action with a chat message</option>
                  </select>
                </Field>
                <Field label="Refund behavior" help="Matches the existing slot request and betting integrations.">
                  <select value={normalized.refundBehavior} onChange={event => patch({ refundBehavior: event.target.value })}>
                    <option value="refund_on_cancel_or_reject">Refund when cancelled or rejected</option>
                    <option value="no_refund_after_accept">Do not refund after accepted</option>
                  </select>
                </Field>
              </div>
            </>
          )}
          <CheckList checks={mergedChecks} service={SERVICE_IDS.STREAMELEMENTS} />
        </section>

        <section ref={node => { sectionRefs.current[SERVICE_IDS.MUSIC] = node; }} id="music" className="oc2-service-section">
          <header>
            <StatusBadge status={sections[SERVICE_IDS.MUSIC] || READINESS_STATUSES.OPTIONAL} />
            <div>
              <h2>Music</h2>
              <p>Music is optional. Use Spotify, manual text, or disable the music display intentionally.</p>
            </div>
          </header>
          <ChoiceGroup label="Music source" value={normalized.musicMode} options={MUSIC_MODES} onChange={value => patch({ musicMode: value, spotifyMode: value })} />
          {normalized.musicMode === 'spotify' && (
            <>
              <div className="oc2-service-action-row">
                <ExternalAction href="/overlay-center/integrations">{integrations.spotifyConnected ? 'Reconnect Spotify' : 'Connect Spotify'}</ExternalAction>
                <ExternalAction href={serviceLinks.spotify.player}>Open Spotify</ExternalAction>
                <ExternalAction href={serviceLinks.spotify.appAccess}>Manage Spotify app access</ExternalAction>
                <button type="button" className="oc2-btn" onClick={() => runChecks('manual')} disabled={checking}><RefreshCw size={14} /> Test now-playing data</button>
              </div>
              <div className="oc2-form-grid oc2-form-grid--compact">
                <Field label="Connected Spotify account" help="Managed by Streamers Center OAuth; no developer credentials are needed.">
                  <input value={integrations.spotifyConnected ? 'Connected' : 'Not connected'} readOnly />
                </Field>
                <Field label="Fallback message" help="Shown when Spotify is connected but nothing is playing.">
                  <input value={normalized.musicFallbackMessage} onChange={event => patch({ musicFallbackMessage: event.target.value })} />
                </Field>
                <label className="oc2-field oc2-field--toggle">
                  <span><strong>Hide music widget when empty</strong><small>Use this if you prefer no fallback text.</small></span>
                  <input type="checkbox" checked={normalized.hideMusicWhenEmpty} onChange={event => patch({ hideMusicWhenEmpty: event.target.checked })} />
                </label>
              </div>
            </>
          )}
          {normalized.musicMode === 'manual' && (
            <>
              <div className="oc2-form-grid oc2-form-grid--compact">
                <Field label="Track title" help="Shown on music widgets." example="Midnight City">
                  <input value={normalized.manualTrack} onChange={event => patch({ manualTrack: event.target.value })} />
                </Field>
                <Field label="Artist" help="Shown next to the track title." example="M83">
                  <input value={normalized.manualArtist} onChange={event => patch({ manualArtist: event.target.value })} />
                </Field>
                <Field label="Album or playlist label" help="Optional extra label.">
                  <input value={normalized.manualAlbum} onChange={event => patch({ manualAlbum: event.target.value })} />
                </Field>
                <Field label="Cover image URL" help="Use a public image URL when supported by the widget.">
                  <input value={normalized.manualCoverUrl} onChange={event => patch({ manualCoverUrl: event.target.value })} />
                </Field>
                <Field label="Optional music link" help="A link viewers can open outside the overlay.">
                  <input value={normalized.manualMusicLink} onChange={event => patch({ manualMusicLink: event.target.value })} />
                </Field>
                <Field label="Now playing fallback message" help="Shown if no title or artist is set.">
                  <input value={normalized.musicFallbackMessage} onChange={event => patch({ musicFallbackMessage: event.target.value })} />
                </Field>
                <label className="oc2-field oc2-field--toggle">
                  <span><strong>Hide music widget when empty</strong><small>Manual mode still counts as a valid fallback.</small></span>
                  <input type="checkbox" checked={normalized.hideMusicWhenEmpty} onChange={event => patch({ hideMusicWhenEmpty: event.target.checked })} />
                </label>
              </div>
              <div className="oc2-music-preview">
                <strong>{normalized.manualTrack || normalized.musicFallbackMessage}</strong>
                <span>{normalized.manualArtist || 'Artist not set'}</span>
                {normalized.manualAlbum && <small>{normalized.manualAlbum}</small>}
              </div>
            </>
          )}
          <CheckList checks={mergedChecks} service={SERVICE_IDS.MUSIC} />
        </section>

        <section ref={node => { sectionRefs.current[SERVICE_IDS.SLOT_DATA] = node; }} id="slot-data" className="oc2-service-section">
          <header>
            <StatusBadge status={sections[SERVICE_IDS.SLOT_DATA] || READINESS_STATUSES.NOT_CONFIGURED} />
            <div>
              <h2>Slot data</h2>
              <p>Slot widgets can use the Streamers Center slot database. Manual slot entry remains available as a fallback.</p>
            </div>
          </header>
          <ChoiceGroup label="Slot data source" value={normalized.slotSource} options={SLOT_SOURCES} onChange={value => patch({ slotSource: value, manualSlotFallback: value === 'manual' ? true : normalized.manualSlotFallback })} />
          <div className="oc2-service-action-row">
            <button type="button" className="oc2-btn" onClick={() => runChecks('manual')} disabled={checking}><RefreshCw size={14} /> Test slot search</button>
            <button type="button" className="oc2-btn" onClick={() => runChecks('manual')} disabled={checking}>Search sample slot</button>
            <ExternalAction href={normalized.slotSource === 'sloteller' ? serviceLinks.slotProviders.sloteller.home : '/overlay-center/slots'}>
              {normalized.slotSource === 'sloteller' ? 'Open provider home' : 'Manage slot data'}
            </ExternalAction>
          </div>
          {normalized.slotSource === 'sloteller' && (
            <div className="oc2-provider-note">Managed automatically by Streamers Center. No verified Sloteller dashboard or documentation URL is configured.</div>
          )}
          <div className="oc2-form-grid oc2-form-grid--compact">
            <Field label="Currency" help="Stored as an ISO 4217 code. Widget symbols are derived from this value." example="EUR - €">
              <input value={currencySearch} onChange={event => setCurrencySearch(event.target.value)} placeholder="Search currency" />
              <select value={normalized.currencyCode} onChange={event => patch({ currencyCode: event.target.value, currency: event.target.value })}>
                {filteredCurrencies.map(option => <option key={option.code} value={option.code}>{option.label}</option>)}
              </select>
              <small>Widgets will show {currencySymbolForCode(normalized.currencyCode)} from {normalized.currencyCode}.</small>
            </Field>
            <Field label="Provider/source" help="Only sources supported by this app are shown.">
              <select value={normalized.slotSource} onChange={event => patch({ slotSource: event.target.value })}>
                {SLOT_SOURCES.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </Field>
            <Field label="Sample slot search" help="Used only to test that slot search returns a safe result." example="Gates of Olympus">
              <input value={normalized.sampleSlotName} onChange={event => patch({ sampleSlotName: event.target.value })} />
            </Field>
            <label className="oc2-field oc2-field--toggle">
              <span><strong>Manual entry allowed</strong><small>Required fallback when external slot data is unavailable.</small></span>
              <input type="checkbox" checked={normalized.manualSlotFallback} onChange={event => patch({ manualSlotFallback: event.target.checked })} />
            </label>
            <Field label="Unknown-slot image" help="Optional fallback image URL for missing artwork.">
              <input value={normalized.unknownSlotImage} onChange={event => patch({ unknownSlotImage: event.target.value })} />
            </Field>
            <Field label="Default RTP handling" help="What widgets show when RTP is unknown.">
              <select value={normalized.defaultRtpHandling} onChange={event => patch({ defaultRtpHandling: event.target.value })}>
                <option value="show_unknown">Show Unknown</option>
                <option value="hide">Hide RTP</option>
              </select>
            </Field>
            <Field label="Default volatility handling" help="What widgets show when volatility is unknown.">
              <select value={normalized.defaultVolatilityHandling} onChange={event => patch({ defaultVolatilityHandling: event.target.value })}>
                <option value="show_unknown">Show Unknown</option>
                <option value="hide">Hide volatility</option>
              </select>
            </Field>
            <Field label="Default provider label" help="Used when a slot has no provider metadata.">
              <input value={normalized.defaultProviderLabel} onChange={event => patch({ defaultProviderLabel: event.target.value })} />
            </Field>
            <Field label="Missing slot image behavior" help="Choose the safe fallback for missing artwork.">
              <select value={normalized.missingSlotImageBehavior} onChange={event => patch({ missingSlotImageBehavior: event.target.value })}>
                <option value="use_default_image">Use default image</option>
                <option value="hide_image">Hide image</option>
              </select>
            </Field>
          </div>
          <CheckList checks={mergedChecks} service={SERVICE_IDS.SLOT_DATA} />
        </section>

        <section className="oc2-service-section oc2-final-review">
          <header>
            <StatusBadge status={summary.canContinue ? READINESS_STATUSES.READY : READINESS_STATUSES.WARNING} />
            <div>
              <h2>Final review</h2>
              <p>Review what will be synced into your selected widgets before continuing.</p>
            </div>
          </header>
          <div className="oc2-review-grid">
            <article><strong>Twitch</strong><span>Connected as: {finalReview.twitch.channel}</span><span>Chat: {STATUS_LABELS[finalReview.twitch.chat] || finalReview.twitch.chat}</span><span>Prefix: {finalReview.twitch.prefix}</span><span>Commands: {finalReview.twitch.commands.join(', ')}</span><span>Giveaway: {finalReview.twitch.giveaway}</span><button type="button" onClick={() => scrollToSection(SERVICE_IDS.TWITCH)}>Edit</button></article>
            <article><strong>Viewer points</strong><span>Source: {finalReview.points.source}</span><span>Currency: {finalReview.points.currency}</span><span>Slot request cost: {finalReview.points.requestCost}</span><span>Bet range: {finalReview.points.betRange}</span><button type="button" onClick={() => scrollToSection(SERVICE_IDS.STREAMELEMENTS)}>Edit</button></article>
            <article><strong>Music</strong><span>Source: {finalReview.music.source}</span><span>Fallback: {finalReview.music.fallback || 'Hide when empty'}</span><button type="button" onClick={() => scrollToSection(SERVICE_IDS.MUSIC)}>Edit</button></article>
            <article><strong>Slot data</strong><span>Primary source: {finalReview.slotData.source}</span><span>Manual fallback: {finalReview.slotData.manualFallback}</span><span>Currency: {finalReview.currency}</span><button type="button" onClick={() => scrollToSection(SERVICE_IDS.SLOT_DATA)}>Edit</button></article>
          </div>
        </section>
      </div>

      <aside className="oc2-readiness-summary" aria-label="Service readiness summary">
        <h2>Readiness summary</h2>
        <p>{statusMessage}</p>
        <div className="oc2-readiness-summary__rows">
          {SECTION_META.map(section => (
            <button key={section.id} type="button" onClick={() => scrollToSection(section.id)} className={`oc2-readiness-row oc2-readiness-row--${sections[section.id] || READINESS_STATUSES.NOT_CONFIGURED}`}>
              <span>{section.title}</span>
              <em>{STATUS_LABELS[sections[section.id]] || 'Needs attention'}</em>
            </button>
          ))}
        </div>
        <div className="oc2-readiness-summary__totals">
          <div><strong>{summary.requiredCompleted}/{summary.requiredTotal}</strong><span>Required checks complete</span></div>
          <div><strong>{summary.optionalConnected}</strong><span>Optional integrations connected</span></div>
          <div><strong>{summary.canContinue ? 'Ready' : 'Needs attention'}</strong><span>Overall setup status</span></div>
        </div>
        <div className="oc2-readiness-summary__actions">
          <button type="button" className="oc2-btn" onClick={onSaveProgress} disabled={saving}><Save size={15} /> Save progress</button>
          <button type="button" className="oc2-btn" onClick={() => runChecks('manual')} disabled={checking}><RefreshCw size={15} /> {checking ? 'Checking...' : 'Check again'}</button>
          <button type="button" className="oc2-btn oc2-btn--primary" onClick={onContinue} disabled={saving || checking || !summary.canContinue}>
            Continue setup <ArrowRight size={15} />
          </button>
        </div>
      </aside>
    </div>
  );
}