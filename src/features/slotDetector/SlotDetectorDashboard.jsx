import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, EyeOff, KeyRound, Play, Power, RefreshCw, RotateCw, Search, ShieldCheck, Unplug } from 'lucide-react';
import {
  confirmMatch,
  createPairingCode,
  dismissSuggestion,
  getActiveSlot,
  getEvents,
  getSettings,
  getSuggestions,
  getUnmatched,
  listDevices,
  revokeDevice,
  rotateDevice,
  searchSlots,
  updateSettings,
} from './slotDetectorService';
import './SlotDetector.css';

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function statusClass(status) {
  return `sd-pill sd-pill--${String(status || 'unknown').replace(/[^a-z0-9_-]/gi, '-')}`;
}

function panelLabel(value) {
  const match = String(value || '').match(/panel-(\d+)/i);
  return match ? `Panel ${match[1]}` : value || 'Panel';
}

function EventSlotSearch({ event, onConfirmed }) {
  const [query, setQuery] = useState(event.slot_hint || event.slot_name || '');
  const [results, setResults] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return undefined;
    }
    const timer = window.setTimeout(async () => {
      try {
        setError('');
        setResults(await searchSlots(q));
      } catch (err) {
        setError(err.message || 'Search failed');
        setResults([]);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const choose = async (slot) => {
    setSaving(true);
    setError('');
    try {
      await confirmMatch({
        eventId: event.id,
        slotId: slot.id,
        saveAlias: Boolean(event.slot_hint),
        saveGameCode: Boolean(event.safe_game_id),
        target: event.target,
      });
      onConfirmed();
    } catch (err) {
      setError(err.message || 'Confirmation failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="sd-confirm">
      <label>
        <Search size={14} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search slot to confirm" />
      </label>
      {error && <small className="sd-error">{error}</small>}
      {results.length > 0 && (
        <div className="sd-confirm__results">
          {results.map((slot) => (
            <button key={slot.id} type="button" disabled={saving} onClick={() => choose(slot)}>
              <span>{slot.name}</span>
              <small>{slot.provider || 'Unknown provider'}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SlotDetectorDashboard() {
  const [loading, setLoading] = useState(true);
  const [pairing, setPairing] = useState(null);
  const [settings, setSettings] = useState(null);
  const [devices, setDevices] = useState([]);
  const [activeSlot, setActiveSlot] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [events, setEvents] = useState([]);
  const [unmatched, setUnmatched] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [rotatedToken, setRotatedToken] = useState('');

  const activeDevices = useMemo(() => devices.filter((device) => !device.is_revoked), [devices]);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      setError('');
      const [settingsData, deviceData, activeData, suggestionData, eventData, unmatchedData] = await Promise.all([
        getSettings(),
        listDevices(),
        getActiveSlot(),
        getSuggestions(),
        getEvents(30),
        getUnmatched(),
      ]);
      setSettings(settingsData.settings);
      setDevices(deviceData.devices || []);
      setActiveSlot(activeData.activeSlot || null);
      setSuggestions(suggestionData.suggestions || []);
      setEvents(eventData.events || []);
      setUnmatched(unmatchedData.events || []);
    } catch (err) {
      setError(err.message || 'Slot Detector failed to load.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const timer = window.setInterval(() => load(true), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const saveSettings = async (patch) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    try {
      const result = await updateSettings(next);
      setSettings(result.settings);
      setMessage('Settings saved.');
      window.setTimeout(() => setMessage(''), 2500);
    } catch (err) {
      setError(err.message || 'Failed to save settings.');
      load(true);
    }
  };

  const createCode = async () => {
    try {
      setError('');
      const result = await createPairingCode();
      setPairing(result);
    } catch (err) {
      setError(err.message || 'Failed to create pairing code.');
    }
  };

  const copyPairing = async () => {
    if (!pairing?.pairingCode) return;
    await navigator.clipboard?.writeText(pairing.pairingCode);
    setMessage('Pairing code copied.');
  };

  const revoke = async (deviceId) => {
    await revokeDevice(deviceId);
    await load(true);
  };

  const rotate = async (deviceId) => {
    const result = await rotateDevice(deviceId);
    setRotatedToken(result.token);
    await load(true);
  };

  const activateSuggestion = async (event) => {
    if (!event.slot_id) return;
    try {
      setError('');
      await confirmMatch({
        eventId: event.id,
        slotId: event.slot_id,
        saveAlias: Boolean(event.slot_hint),
        saveGameCode: Boolean(event.safe_game_id),
        target: event.target,
      });
      setMessage(`${event.slot_name || event.slot_hint} activated.`);
      window.setTimeout(() => setMessage(''), 2500);
      await load(true);
    } catch (err) {
      setError(err.message || 'Failed to activate suggestion.');
    }
  };

  const hideSuggestion = async (eventId) => {
    try {
      setError('');
      await dismissSuggestion(eventId);
      await load(true);
    } catch (err) {
      setError(err.message || 'Failed to hide suggestion.');
    }
  };

  if (loading) {
    return <main className="sd-page"><div className="sd-panel sd-panel--loading" /></main>;
  }

  return (
    <main className="sd-page">
      <header className="sd-header">
        <div>
          <span className="sd-eyebrow">Streamer tools</span>
          <h1>Slot Detector</h1>
          <p>Pair the browser extension, review detections, and control when live OBS widgets update.</p>
        </div>
        <button type="button" className="sd-btn sd-btn--primary" onClick={createCode}>
          <KeyRound size={17} /> Create pairing code
        </button>
      </header>

      {error && <div className="sd-alert sd-alert--error">{error}</div>}
      {message && <div className="sd-alert sd-alert--success">{message}</div>}

      <section className="sd-grid sd-grid--top">
        <div className="sd-panel">
          <div className="sd-panel__head">
            <div>
              <h2>Pair extension</h2>
              <p>Codes are one-use and expire quickly. Only the extension receives the device token.</p>
            </div>
            <ShieldCheck size={22} />
          </div>
          {pairing ? (
            <div className="sd-pairing">
              <strong>{pairing.pairingCode}</strong>
              <span>Expires {formatDate(pairing.expiresAt)}</span>
              <button type="button" className="sd-btn sd-btn--ghost" onClick={copyPairing}>
                <Copy size={15} /> Copy
              </button>
            </div>
          ) : (
            <button type="button" className="sd-btn sd-btn--secondary" onClick={createCode}>
              Generate code
            </button>
          )}
        </div>

        <div className="sd-panel">
          <div className="sd-panel__head">
            <div>
              <h2>Automation</h2>
              <p>Automatic updates are off until you enable them.</p>
            </div>
            <Power size={22} />
          </div>
          <label className="sd-toggle">
            <input
              type="checkbox"
              checked={Boolean(settings?.auto_update_enabled)}
              onChange={(event) => saveSettings({ auto_update_enabled: event.target.checked })}
            />
            <span>Update active OBS slot on high-confidence detections</span>
          </label>
          <label className="sd-toggle">
            <input
              type="checkbox"
              checked={Boolean(settings?.auto_bonus_hunt_updates)}
              onChange={(event) => saveSettings({ auto_bonus_hunt_updates: event.target.checked })}
            />
            <span>Allow Bonus Hunt widget target updates</span>
          </label>
          <label className="sd-field">
            <span>Default target</span>
            <select value={settings?.default_target || 'current_slot'} onChange={(event) => saveSettings({ default_target: event.target.value })}>
              <option value="current_slot">Current Slot</option>
              <option value="single_slot">Single Slot</option>
              <option value="bonus_hunt">Bonus Hunt</option>
            </select>
          </label>
        </div>

        <div className="sd-panel">
          <div className="sd-panel__head">
            <div>
              <h2>Live state</h2>
              <p>{activeSlot ? `Updated ${formatDate(activeSlot.updated_at)}` : 'No active detector slot yet.'}</p>
            </div>
            <button type="button" className="sd-icon-btn" onClick={() => load(true)} title="Refresh">
              <RefreshCw size={16} />
            </button>
          </div>
          {activeSlot ? (
            <div className="sd-active-slot">
              <strong>{activeSlot.slot_name}</strong>
              <span>{activeSlot.provider_name || 'Unknown provider'}</span>
              <small>{activeSlot.server_confidence}% confidence · {activeSlot.target}</small>
            </div>
          ) : (
            <div className="sd-empty">Waiting for the first confirmed detection.</div>
          )}
        </div>
      </section>

      {rotatedToken && (
        <section className="sd-panel">
          <div className="sd-panel__head">
            <div>
              <h2>Rotated token</h2>
              <p>This scoped token is shown once. Put it into the extension options page.</p>
            </div>
            <button type="button" className="sd-btn sd-btn--ghost" onClick={() => navigator.clipboard?.writeText(rotatedToken)}>
              <Copy size={15} /> Copy token
            </button>
          </div>
          <code className="sd-token">{rotatedToken}</code>
        </section>
      )}

      <section className="sd-panel">
        <div className="sd-panel__head">
          <div>
            <h2>Devices</h2>
            <p>{activeDevices.length} active extension connection{activeDevices.length === 1 ? '' : 's'}.</p>
          </div>
        </div>
        <div className="sd-table-wrap">
          <table className="sd-table">
            <thead>
              <tr>
                <th>Device</th>
                <th>Status</th>
                <th>Last seen</th>
                <th>Domain</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => (
                <tr key={device.id}>
                  <td>
                    <strong>{device.device_name}</strong>
                    <small>{device.browser_name || 'Chrome/Edge'} · v{device.token_version}</small>
                  </td>
                  <td><span className={device.is_revoked ? 'sd-pill sd-pill--revoked' : 'sd-pill sd-pill--active'}>{device.is_revoked ? 'Revoked' : 'Active'}</span></td>
                  <td>{formatDate(device.last_seen_at)}</td>
                  <td>{device.last_seen_domain || '-'}</td>
                  <td className="sd-actions">
                    <button type="button" className="sd-icon-btn" onClick={() => rotate(device.id)} title="Rotate token"><RotateCw size={15} /></button>
                    {!device.is_revoked && (
                      <button type="button" className="sd-icon-btn sd-icon-btn--danger" onClick={() => revoke(device.id)} title="Revoke device"><Unplug size={15} /></button>
                    )}
                  </td>
                </tr>
              ))}
              {devices.length === 0 && (
                <tr><td colSpan="5" className="sd-empty">No paired devices yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="sd-panel">
        <div className="sd-panel__head">
          <div>
            <h2>Suggested slots</h2>
            <p>Database matches from ScreenSplit panels. Activate only the one you want live; hide the rest.</p>
          </div>
        </div>
        <div className="sd-suggestion-grid">
          {suggestions.map((event) => (
            <article key={event.id} className="sd-suggestion">
              <div className="sd-suggestion__main">
                {event.evidence?.urls?.[0]?.domain && <span className="sd-suggestion__source">{event.evidence.urls[0].domain}</span>}
                <strong>{event.slot_name || event.slot_hint || 'Matched slot'}</strong>
                <small>
                  {event.provider_name || event.provider_hint || 'Unknown provider'} · {event.server_confidence}% · {panelLabel(event.device_panel_id)}
                </small>
                <small>{formatDate(event.detected_at)} · {event.domain || '-'}</small>
              </div>
              <div className="sd-suggestion__actions">
                <button type="button" className="sd-btn sd-btn--primary" onClick={() => activateSuggestion(event)}>
                  <Play size={15} /> Activate
                </button>
                <button type="button" className="sd-btn sd-btn--ghost" onClick={() => hideSuggestion(event.id)}>
                  <EyeOff size={15} /> Hide
                </button>
              </div>
            </article>
          ))}
          {suggestions.length === 0 && <div className="sd-empty">No matched slot suggestions yet.</div>}
        </div>
      </section>

      <section className="sd-grid">
        <div className="sd-panel">
          <div className="sd-panel__head">
            <div>
              <h2>Needs review</h2>
              <p>Low-confidence and unmatched detections never update widgets automatically.</p>
            </div>
          </div>
          <div className="sd-event-list">
            {unmatched.map((event) => (
              <article key={event.id} className="sd-event">
                <div>
                  <span className={statusClass(event.match_status)}>{event.match_status}</span>
                  <strong>{event.slot_hint || event.page_title_hint || event.safe_game_id || 'Unknown game'}</strong>
                  <small>{event.domain || '-'} · {event.server_confidence}% · {formatDate(event.detected_at)}</small>
                </div>
                <EventSlotSearch event={event} onConfirmed={() => load(true)} />
              </article>
            ))}
            {unmatched.length === 0 && <div className="sd-empty">No detections need review.</div>}
          </div>
        </div>

        <div className="sd-panel">
          <div className="sd-panel__head">
            <div>
              <h2>Recent events</h2>
              <p>Sanitized detector events received from paired devices.</p>
            </div>
          </div>
          <div className="sd-event-list">
            {events.map((event) => (
              <article key={event.id} className="sd-event sd-event--compact">
                <div>
                  <span className={statusClass(event.match_status)}>{event.match_status}</span>
                  <strong>{event.slot_name || event.slot_hint || event.safe_game_id || 'Unknown game'}</strong>
                  <small>{event.domain || '-'} · {event.server_confidence}% · {formatDate(event.received_at)}</small>
                </div>
                {event.live_update_applied && <span className="sd-live"><Check size={14} /> Live</span>}
              </article>
            ))}
            {events.length === 0 && <div className="sd-empty">No detector events yet.</div>}
          </div>
        </div>
      </section>
    </main>
  );
}
