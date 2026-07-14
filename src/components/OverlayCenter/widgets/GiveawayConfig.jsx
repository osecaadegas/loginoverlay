import React, { useState, useEffect, useRef, useCallback } from 'react';
import useTwitchChat from '../../../hooks/useTwitchChat';
import useKickChat from '../../../hooks/useKickChat';
import useTwitchChannel from '../../../hooks/useTwitchChannel';
import { makePerStyleSetters } from './shared/perStyleConfig';
import { GIVEAWAY_STYLE_KEYS } from './styleKeysRegistry';
import { SectionHeader } from '../ui';
import { CirclePlay, CircleStop, Trash2, Trophy, Users, Wifi, WifiOff, X } from 'lucide-react';

/* ─── Giveaway Config Panel ─── */
export default function GiveawayConfig({ config, onChange }) {
  const c = config || {};
  const currentStyle = c.displayStyle || 'v1';
  const { set, setMulti } = makePerStyleSetters(onChange, c, currentStyle, GIVEAWAY_STYLE_KEYS);
  const [confirmClear, setConfirmClear] = useState(false);
  const [chatStatus, setChatStatus] = useState({ twitch: false, kick: false });

  // Keep a ref to always call the latest onChange (avoids stale closures in timeouts)
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const configRef = useRef(c);
  configRef.current = c;

  const participants = c.participants || [];
  const participantsRef = useRef(new Set(participants));
  const pendingRef = useRef([]);
  const flushTimer = useRef(null);

  // Keep participantsRef in sync with config
  useEffect(() => {
    participantsRef.current = new Set(c.participants || []);
  }, [c.participants]);

  // Flush pending participants to config every 2 seconds
  useEffect(() => {
    flushTimer.current = setInterval(() => {
      if (pendingRef.current.length > 0) {
        const current = c.participants || [];
        const merged = [...new Set([...current, ...pendingRef.current])];
        pendingRef.current = [];
        if (merged.length !== current.length) {
          onChange({ ...c, participants: merged });
        }
      }
    }, 2000);
    return () => clearInterval(flushTimer.current);
  });

  const keyword = (c.keyword || '').toLowerCase().trim();
  const autoChannel = useTwitchChannel();
  const resolvedChannel = c.twitchChannel || autoChannel || '';
  const isActive = !!c.isActive && !!keyword;
  const platformCount = Number(!!chatStatus.twitch) + Number(!!chatStatus.kick);
  const configuredPlatformCount = Number(!!resolvedChannel && !!c.twitchEnabled) + Number(!!c.kickChannelId && !!c.kickEnabled);
  const canStart = !!keyword && configuredPlatformCount > 0;

  // Chat message handler — check for keyword match
  const handleMessage = useCallback((msg) => {
    if (!keyword) return;
    const text = (msg.message || '').trim().toLowerCase();
    // Match "!keyword" exactly (with optional trailing whitespace)
    if (text === `!${keyword}` || text.startsWith(`!${keyword} `)) {
      const name = msg.username;
      if (name && !participantsRef.current.has(name)) {
        participantsRef.current.add(name);
        pendingRef.current.push(name);
      }
    }
  }, [keyword]);

  // Connect to platforms when giveaway is active
  useTwitchChat(isActive && c.twitchEnabled ? resolvedChannel : '', handleMessage);
  useKickChat(isActive && c.kickEnabled ? c.kickChannelId : '', handleMessage);

  // Track connection status
  useEffect(() => {
    setChatStatus({
      twitch: isActive && !!c.twitchEnabled && !!resolvedChannel,
      kick: isActive && !!c.kickEnabled && !!c.kickChannelId,
    });
  }, [isActive, c.twitchEnabled, resolvedChannel, c.kickEnabled, c.kickChannelId]);

  // Draw a random winner
  const drawWinner = () => {
    const list = c.participants || [];
    if (list.length === 0) return;
    const idx = Math.floor(Math.random() * list.length);
    const winnerName = list[idx];
    // Show spin reel first, then reveal winner after animation
    setMulti({ spinningWinner: winnerName, winner: '' });
    setTimeout(() => {
      // Use refs to get latest config/onChange — avoids stale closure
      // 5s spin + 2s hold on winner before revealing = 7s total
      const latest = configRef.current;
      onChangeRef.current({ ...latest, winner: winnerName, spinningWinner: '' });
    }, 7000);
  };

  // Remove a single participant
  const removeParticipant = (name) => {
    const updated = (c.participants || []).filter(n => n !== name);
    participantsRef.current.delete(name);
    const patch = { participants: updated };
    if (c.winner === name) patch.winner = '';
    onChange({ ...c, ...patch });
  };

  // Clear all entries
  const clearEntries = () => {
    setMulti({ participants: [], winner: '' });
    participantsRef.current.clear();
    pendingRef.current = [];
    setConfirmClear(false);
  };

  return (
    <div className="giveaway-config nb-config nb-config--modern">
      <div className="giveaway-config__workspace">
        <div className="giveaway-config__main">
          <section className="giveaway-card giveaway-card--setup">
            <SectionHeader
              eyebrow="Step 1"
              title="Prize and command"
              description="These fields define what viewers see on stream and what they type in chat."
            />
            <div className="giveaway-form-grid">
              <label className="nb-field giveaway-field">
                <span>Overlay title</span>
                <input value={c.title || ''} onChange={event => set('title', event.target.value)} placeholder="Friday Giveaway" />
              </label>
              <label className="nb-field giveaway-field">
                <span>Prize</span>
                <input value={c.prize || ''} onChange={event => set('prize', event.target.value)} placeholder="500 bonus spins" />
              </label>
              <label className="nb-field giveaway-field giveaway-field--command">
                <span>Chat command</span>
                <div className="giveaway-command-input">
                  <span>!</span>
                  <input value={c.keyword || ''} onChange={event => set('keyword', event.target.value.replace(/^!+/, ''))} placeholder="join" />
                </div>
              </label>
              <div className="giveaway-command-preview">
                <span>Viewer command</span>
                <strong>{keyword ? `!${keyword}` : '!join'}</strong>
              </div>
            </div>
          </section>

          <section className="giveaway-card giveaway-card--platforms">
            <SectionHeader
              eyebrow="Step 2"
              title="Chat listeners"
              description="Enable the platforms that should collect entries while the giveaway is live."
            />
            <div className="giveaway-platform-grid">
              <label className={`giveaway-platform-card${c.twitchEnabled ? ' giveaway-platform-card--enabled' : ''}${chatStatus.twitch ? ' giveaway-platform-card--live' : ''}${!resolvedChannel ? ' giveaway-platform-card--missing' : ''}`}>
                <input
                  type="checkbox"
                  checked={!!c.twitchEnabled}
                  disabled={!resolvedChannel}
                  onChange={event => set('twitchEnabled', event.target.checked)}
                />
                <span className="giveaway-platform-card__icon">{chatStatus.twitch ? <Wifi size={18} /> : <WifiOff size={18} />}</span>
                <span className="giveaway-platform-card__copy">
                  <strong>Twitch</strong>
                  <span>{resolvedChannel || 'Set channel in Profile'}</span>
                </span>
                <span className="giveaway-switch" aria-hidden="true" />
              </label>

              <label className={`giveaway-platform-card${c.kickEnabled ? ' giveaway-platform-card--enabled' : ''}${chatStatus.kick ? ' giveaway-platform-card--live' : ''}${!c.kickChannelId ? ' giveaway-platform-card--missing' : ''}`}>
                <input
                  type="checkbox"
                  checked={!!c.kickEnabled}
                  disabled={!c.kickChannelId}
                  onChange={event => set('kickEnabled', event.target.checked)}
                />
                <span className="giveaway-platform-card__icon">{chatStatus.kick ? <Wifi size={18} /> : <WifiOff size={18} />}</span>
                <span className="giveaway-platform-card__copy">
                  <strong>Kick</strong>
                  <span>{c.kickChannelId || 'Set channel in Profile'}</span>
                </span>
                <span className="giveaway-switch" aria-hidden="true" />
              </label>
            </div>
          </section>

          <section className={`giveaway-live-panel${isActive ? ' giveaway-live-panel--active' : ''}`}>
            <div>
              <span>{isActive ? 'Live collection is running' : canStart ? 'Ready to collect entries' : 'Complete setup to go live'}</span>
              <strong>{keyword ? `Listening for !${keyword}` : 'Add a command first'}</strong>
              {isActive && !platformCount && <p>No live chat connection is active yet. Check your enabled listeners.</p>}
            </div>
            <button
              type="button"
              className={`giveaway-primary-action${c.isActive ? ' giveaway-primary-action--stop' : ''}`}
              disabled={!c.isActive && !canStart}
              onClick={() => set('isActive', !c.isActive)}
            >
              {c.isActive ? <CircleStop size={17} /> : <CirclePlay size={17} />}
              {c.isActive ? 'Stop Giveaway' : 'Start Giveaway'}
            </button>
          </section>
        </div>

        <aside className="giveaway-config__side">
          <section className="giveaway-card giveaway-winner-card">
            <SectionHeader
              eyebrow="Step 3"
              title="Draw winner"
              description={participants.length ? 'Pick a winner from the current entry list.' : 'Entries will appear here as viewers use the command.'}
            />
            <button
              type="button"
              className="giveaway-draw-button"
              onClick={drawWinner}
              disabled={participants.length === 0}
            >
              <Trophy size={18} />
              Draw Random Winner
            </button>
            {c.winner ? (
              <div className="giveaway-winner">
                <span>Winner</span>
                <strong>{c.winner}</strong>
                <button type="button" onClick={() => set('winner', '')}>Clear winner</button>
              </div>
            ) : (
              <div className="giveaway-winner giveaway-winner--empty">
                <span>No winner selected</span>
                <strong>{participants.length ? `${participants.length} entries ready` : 'Waiting for entries'}</strong>
              </div>
            )}
          </section>

          <section className="giveaway-card giveaway-entries-card">
            <div className="giveaway-entries-header">
              <div>
                <span>Entries</span>
                <strong>{participants.length} participant{participants.length === 1 ? '' : 's'}</strong>
              </div>
              {participants.length > 0 && !confirmClear && (
                <button type="button" className="giveaway-icon-button giveaway-icon-button--danger" onClick={() => setConfirmClear(true)} title="Clear all entries">
                  <Trash2 size={15} />
                </button>
              )}
            </div>

            {participants.length > 0 ? (
              <div className="giveaway-entries-list">
                {participants.map((name, index) => (
                  <div key={name} className={`giveaway-entry-row${name === c.winner ? ' giveaway-entry-row--winner' : ''}`}>
                    <span className="giveaway-entry-row__index">#{index + 1}</span>
                    <span className="giveaway-entry-row__name">{name}</span>
                    {name === c.winner && <Trophy size={14} />}
                    <button type="button" onClick={() => removeParticipant(name)} title={`Remove ${name}`}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="giveaway-empty-state">
                <Users size={22} />
                <strong>{isActive ? 'Waiting for chat entries' : 'No entries yet'}</strong>
                <span>{isActive ? `Viewers can type !${keyword}` : 'Start the giveaway when your prize and listeners are ready.'}</span>
              </div>
            )}

            {confirmClear && (
              <div className="giveaway-clear-confirm">
                <span>Clear every entry?</span>
                <button type="button" onClick={clearEntries}>Clear all</button>
                <button type="button" onClick={() => setConfirmClear(false)}>Cancel</button>
              </div>
            )}
          </section>
        </aside>
      </div>

    </div>
  );
}
