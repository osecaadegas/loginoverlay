/**
 * ProfileSection.jsx — Central profile hub in the Overlay Center.
 * Manages streamer identity, connected accounts, and preferences.
 * Syncs profile data to all relevant widgets (navbar, chat, giveaway, etc.)
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../config/supabaseClient';
import { startSpotifyAuth } from '../../utils/spotifyAuth';

/* ── Which config keys to push to each widget type ── */
const SYNC_MAP = {
  navbar: {
    streamerName: 'streamerName',
    motto: 'motto',
    twitchUsername: 'twitchUsername',
    avatarUrl: 'avatarUrl',
    spotify_access_token: 'spotify_access_token',
    spotify_refresh_token: 'spotify_refresh_token',
    spotify_expires_at: 'spotify_expires_at',
  },
  chat: {
    twitchUsername: 'twitchChannel',
    kickChannel: 'kickChannelId',
    youtubeChannel: 'youtubeVideoId',
    youtubeApiKey: 'youtubeApiKey',
  },
  giveaway: {
    twitchUsername: 'twitchChannel',
    kickChannel: 'kickChannelId',
  },
  slot_requests: {
    twitchUsername: 'twitchChannel',
    kickChannel: 'kickChannelId',
    seChannelId: 'seChannelId',
    seJwtToken: 'seJwtToken',
  },
  spotify_now_playing: {
    spotify_access_token: 'spotify_access_token',
    spotify_refresh_token: 'spotify_refresh_token',
    spotify_expires_at: 'spotify_expires_at',
  },
  coin_flip: {
    twitchUsername: 'twitchChannel',
    kickChannel: 'kickChannelId',
    seChannelId: 'seChannelId',
    seJwtToken: 'seJwtToken',
  },
  point_slot: {
    seChannelId: 'seChannelId',
    seJwtToken: 'seJwtToken',
  },
  salty_words: {
    seChannelId: 'seChannelId',
    seJwtToken: 'seJwtToken',
  },
  predictions: {
    seChannelId: 'seChannelId',
    seJwtToken: 'seJwtToken',
  },
  point_wheel: {
    twitchUsername: 'twitchChannel',
    kickChannel: 'kickChannelId',
    seChannelId: 'seChannelId',
    seJwtToken: 'seJwtToken',
  },
};

const S = {
  page: { display: 'flex', flexDirection: 'column', gap: 20, width: '100%', maxWidth: '100%' },
  /* top identity strip */
  identity: {
    display: 'flex', alignItems: 'center', gap: 20, padding: '18px 22px',
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14,
  },
  avatar: { width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(124,58,237,0.4)', flexShrink: 0 },
  avatarPlaceholder: { width: 64, height: 64, borderRadius: '50%', background: 'rgba(124,58,237,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, border: '3px solid rgba(124,58,237,0.3)', flexShrink: 0 },
  identityFields: { display: 'flex', flex: 1, gap: 12, flexWrap: 'wrap', minWidth: 0 },
  /* grid for middle section */
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  /* cards used in the grid */
  card: {
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12,
  },
  cardTitle: { fontSize: '0.88rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8, margin: 0 },
  /* form elements */
  label: { display: 'block', fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.04em' },
  input: { width: '100%', padding: '8px 11px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: '0.82rem', boxSizing: 'border-box' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  /* platform compact row */
  platRow: { display: 'flex', alignItems: 'center', gap: 10 },
  dot: (on) => ({ width: 7, height: 7, borderRadius: '50%', background: on ? '#22c55e' : '#333', flexShrink: 0 }),
  /* buttons */
  btn: { padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, transition: 'all 0.15s' },
  btnSync: { background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', color: '#fff', width: '100%', padding: '12px 16px', fontSize: '0.88rem', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700 },
  syncBar: {
    display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14,
  },
  syncResult: { fontSize: '0.8rem', padding: '8px 14px', borderRadius: 10, textAlign: 'center', fontWeight: 600 },
};

export default function ProfileSection({ widgets, saveWidget }) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  /* ── Profile state ── */
  const [profile, setProfile] = useState({
    streamerName: '',
    motto: '',
    avatarUrl: '',
    twitchUsername: '',
    kickChannel: '',
    youtubeChannel: '',
    youtubeApiKey: '',
    discordTag: '',
    currency: '€',
    seChannelId: '',
    seJwtToken: '',
    spotify_access_token: '',
    spotify_refresh_token: '',
    spotify_expires_at: null,
  });
  const [seTestMsg, setSeTestMsg] = useState('');
  const [spotifyLoading, setSpotifyLoading] = useState(false);
  const [spotifyError, setSpotifyError] = useState('');
  const [songIrcStatus, setSongIrcStatus] = useState('off');
  const songWsRef = useRef(null);
  const songReconnectRef = useRef(null);
  const [srIrcStatus, setSrIrcStatus] = useState('off');

  /* ── Load profile from existing widget configs + user metadata ── */
  useEffect(() => {
    if (!user) return;
    const meta = user.user_metadata || {};
    const nb = (widgets || []).find(w => w.widget_type === 'navbar')?.config || {};
    const chat = (widgets || []).find(w => w.widget_type === 'chat')?.config || {};
    const ga = (widgets || []).find(w => w.widget_type === 'giveaway')?.config || {};
    const sp = (widgets || []).find(w => w.widget_type === 'spotify_now_playing')?.config || {};
    const communityW = (widgets || []).find(w => ['coin_flip','point_slot','salty_words','predictions'].includes(w.widget_type))?.config || {};

    /* Pick Spotify tokens from whichever widget has them */
    const spotToken = nb.spotify_access_token || sp.spotify_access_token || '';
    const spotRefresh = nb.spotify_refresh_token || sp.spotify_refresh_token || '';
    const spotExpires = nb.spotify_expires_at || sp.spotify_expires_at || null;

    /* Load SE credentials from the user's own streamelements_connections row first */
    (async () => {
      let seChannel = communityW?.seChannelId || '';
      let seJwt = communityW?.seJwtToken || '';
      if (!seChannel || !seJwt) {
        try {
          const { data } = await supabase
            .from('streamelements_connections')
            .select('se_channel_id, se_jwt_token')
            .eq('user_id', user.id)
            .single();
          if (data) {
            seChannel = seChannel || data.se_channel_id || '';
            seJwt = seJwt || data.se_jwt_token || '';
          }
        } catch { /* no row yet */ }
      }

      setProfile(prev => ({
        streamerName: nb.streamerName || meta.full_name || meta.preferred_username || prev.streamerName || '',
        motto: nb.motto || prev.motto || '',
        avatarUrl: nb.avatarUrl || meta.avatar_url || prev.avatarUrl || '',
        twitchUsername: nb.twitchUsername || meta.preferred_username || meta.twitch_username || prev.twitchUsername || '',
        kickChannel: chat.kickChannelId || ga.kickChannelId || prev.kickChannel || '',
        youtubeChannel: chat.youtubeVideoId || prev.youtubeChannel || '',
        youtubeApiKey: chat.youtubeApiKey || prev.youtubeApiKey || '',
        discordTag: prev.discordTag || '',
        currency: nb.currency || chat.currency || prev.currency || '€',
        seChannelId: seChannel || prev.seChannelId || '',
        seJwtToken: seJwt || prev.seJwtToken || '',
        spotify_access_token: spotToken,
        spotify_refresh_token: spotRefresh,
        spotify_expires_at: spotExpires,
      }));
    })();
  }, [user, widgets]);

  const set = (key, val) => setProfile(prev => ({ ...prev, [key]: val }));

  /* ── Twitch IRC listener for !song and !sr commands ── */
  useEffect(() => {
    const channel = (profile.twitchUsername || '').trim().toLowerCase();
    if (!channel || !user) {
      setSongIrcStatus('off');
      setSrIrcStatus('off');
      return;
    }

    let ws;
    let alive = true;

    const connect = () => {
      if (!alive) return;
      setSongIrcStatus('connecting');
      setSrIrcStatus('connecting');
      ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
      songWsRef.current = ws;

      ws.onopen = () => {
        ws.send('PASS SCHMOOPIIE');
        ws.send('NICK justinfan' + Math.floor(Math.random() * 100000));
        ws.send('JOIN #' + channel);
      };

      ws.onmessage = async (event) => {
        for (const line of event.data.split('\r\n')) {
          if (line.startsWith('PING')) { ws.send('PONG :tmi.twitch.tv'); continue; }
          if (line.includes(' 366 ')) {
            setSongIrcStatus('live');
            setSrIrcStatus('live');
          }

          // !song handler — API checks spotify_tokens table, no client-side token needed
          const songMatch = line.match(/:(\w+)!\w+@[\w.]+\.tmi\.twitch\.tv PRIVMSG #\w+ :!song (.+)/i);
          if (songMatch) {
            const songName = songMatch[2].trim();
            if (songName) {
              try { await fetch(`${window.location.origin}/api/chat-commands?cmd=song&user_id=${encodeURIComponent(user.id)}&song=${encodeURIComponent(songName)}`); }
              catch (err) { console.error('[SongRequest] IRC error', err); }
            }
          }

          // !sr handler
          const srMatch = line.match(/:(\w+)!\w+@[\w.]+\.tmi\.twitch\.tv PRIVMSG #\w+ :!sr (.+)/i);
          if (srMatch) {
            const requester = srMatch[1];
            const slotName = srMatch[2].trim();
            if (slotName) {
              try { await fetch(`${window.location.origin}/api/chat-commands?cmd=sr&user_id=${encodeURIComponent(user.id)}&requester=${encodeURIComponent(requester)}&slot=${encodeURIComponent(slotName)}`); }
              catch (err) { console.error('[SlotRequest] IRC error', err); }
            }
          }
        }
      };

      ws.onclose = () => {
        if (alive) {
          setSongIrcStatus('off');
          setSrIrcStatus('off');
          songReconnectRef.current = setTimeout(connect, 5000);
        }
      };
      ws.onerror = () => ws.close();
    };

    const debounce = setTimeout(connect, 800);
    return () => {
      alive = false;
      clearTimeout(debounce);
      clearTimeout(songReconnectRef.current);
      if (songWsRef.current) { songWsRef.current.close(); songWsRef.current = null; }
    };
  }, [profile.twitchUsername, user]);

  /* ── Count connected platforms ── */
  const connectedPlatforms = useMemo(() => {
    const list = [];
    if (profile.twitchUsername) list.push({ name: 'Twitch', user: profile.twitchUsername, color: '#9146ff' });
    if (profile.kickChannel) list.push({ name: 'Kick', user: profile.kickChannel, color: '#53fc18' });
    if (profile.youtubeChannel) list.push({ name: 'YouTube', user: profile.youtubeChannel, color: '#ff0000' });
    if (profile.discordTag) list.push({ name: 'Discord', user: profile.discordTag, color: '#5865f2' });
    if (profile.spotify_access_token) list.push({ name: 'Spotify', user: 'Connected', color: '#1DB954' });
    if (profile.seChannelId && profile.seJwtToken) list.push({ name: 'StreamElements', user: 'Connected', color: '#f59e0b' });
    return list;
  }, [profile]);

  /* ── Push Spotify tokens to all relevant widgets immediately ── */
  const pushSpotifyTokens = useCallback(async (tokens) => {
    if (!widgets || !saveWidget) return;
    const tokenPayload = {
      spotify_access_token: tokens.access_token,
      spotify_refresh_token: tokens.refresh_token,
      spotify_expires_at: tokens.expires_at,
    };
    for (const w of widgets) {
      if (w.widget_type === 'navbar') {
        await saveWidget({ ...w, config: { ...w.config, ...tokenPayload, musicSource: 'spotify', showNowPlaying: true } });
      } else if (w.widget_type === 'spotify_now_playing') {
        await saveWidget({ ...w, config: { ...w.config, ...tokenPayload } });
      }
    }
  }, [widgets, saveWidget]);

  /* ── Connect Spotify via PKCE popup ── */
  const connectSpotify = async () => {
    setSpotifyLoading(true);
    setSpotifyError('');
    try {
      const tokens = await startSpotifyAuth();
      set('spotify_access_token', tokens.access_token);
      set('spotify_refresh_token', tokens.refresh_token);
      set('spotify_expires_at', tokens.expires_at);
      /* Update state atomically */
      setProfile(prev => ({
        ...prev,
        spotify_access_token: tokens.access_token,
        spotify_refresh_token: tokens.refresh_token,
        spotify_expires_at: tokens.expires_at,
      }));
      /* Auto-push tokens to navbar & Spotify widgets */
      await pushSpotifyTokens(tokens);
      /* Persist tokens to spotify_tokens table for API song requests */
      if (user) {
        await supabase.from('spotify_tokens').upsert({
          user_id: user.id,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: tokens.expires_at,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      }
    } catch (err) {
      setSpotifyError(err.message || 'Spotify connection failed');
    } finally {
      setSpotifyLoading(false);
    }
  };

  const disconnectSpotify = async () => {
    setProfile(prev => ({
      ...prev,
      spotify_access_token: '',
      spotify_refresh_token: '',
      spotify_expires_at: null,
    }));
    /* Clear tokens from all widgets too */
    if (widgets && saveWidget) {
      const clearPayload = { spotify_access_token: null, spotify_refresh_token: null, spotify_expires_at: null };
      for (const w of widgets) {
        if (w.widget_type === 'navbar') {
          await saveWidget({ ...w, config: { ...w.config, ...clearPayload, musicSource: 'manual' } });
        } else if (w.widget_type === 'spotify_now_playing') {
          await saveWidget({ ...w, config: { ...w.config, ...clearPayload } });
        }
      }
    }
    /* Remove from spotify_tokens table */
    if (user) {
      await supabase.from('spotify_tokens').delete().eq('user_id', user.id);
    }
  };

  /* ── Sync profile → all widgets ── */
  const syncToWidgets = useCallback(async () => {
    if (!widgets || widgets.length === 0) { setSyncMsg('⚠️ No widgets to sync to'); return; }
    setSaving(true);
    setSyncMsg('');
    let synced = 0;

    try {
      const savePromises = [];

      for (const widget of widgets) {
        const map = SYNC_MAP[widget.widget_type];
        if (!map) continue;

        const updates = {};
        let changed = false;
        for (const [profileKey, configKey] of Object.entries(map)) {
          const val = profile[profileKey];
          if (val && widget.config?.[configKey] !== val) {
            updates[configKey] = val;
            changed = true;
          }
        }

        /* When syncing Spotify tokens to navbar, also enable Spotify as music source */
        if (widget.widget_type === 'navbar' && profile.spotify_access_token && updates.spotify_access_token) {
          updates.musicSource = 'spotify';
          updates.showNowPlaying = true;
          changed = true;
        }

        /* Auto-enable platforms on chat/giveaway when channel names are set */
        const autoEnableTypes = ['chat', 'giveaway', 'coin_flip', 'point_wheel'];
        if (autoEnableTypes.includes(widget.widget_type)) {
          if (profile.twitchUsername && !widget.config?.twitchEnabled) {
            updates.twitchEnabled = true;
            changed = true;
          }
          if (!profile.twitchUsername && widget.config?.twitchEnabled) {
            updates.twitchEnabled = false;
            changed = true;
          }
        }
        if (autoEnableTypes.includes(widget.widget_type)) {
          if (profile.kickChannel && !widget.config?.kickEnabled) {
            updates.kickEnabled = true;
            changed = true;
          }
          if (!profile.kickChannel && widget.config?.kickEnabled) {
            updates.kickEnabled = false;
            changed = true;
          }
        }
        if (widget.widget_type === 'chat') {
          if (profile.youtubeChannel && !widget.config?.youtubeEnabled) {
            updates.youtubeEnabled = true;
            changed = true;
          }
          if (!profile.youtubeChannel && widget.config?.youtubeEnabled) {
            updates.youtubeEnabled = false;
            changed = true;
          }
        }

        if (changed) {
          savePromises.push(saveWidget({ ...widget, config: { ...widget.config, ...updates } }));
          synced++;
        }
      }

      await Promise.all(savePromises);

      setSyncMsg(synced > 0
        ? `✅ Synced to ${synced} widget${synced > 1 ? 's' : ''}`
        : '✅ All widgets already up to date');
    } catch (err) {
      console.error('[ProfileSection] sync error:', err);
      setSyncMsg('❌ Sync failed — try again');
    }
    setSaving(false);
    setTimeout(() => setSyncMsg(''), 4000);
  }, [profile, widgets, saveWidget]);

  /* ── Save profile to user_profiles table ── */
  const saveProfileToDb = useCallback(async () => {
    if (!user) return;
    try {
      await supabase.from('user_profiles').upsert({
        user_id: user.id,
        avatar_url: profile.avatarUrl || null,
        twitch_username: profile.twitchUsername || null,
        twitch_display_name: profile.streamerName || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    } catch (err) {
      console.error('[ProfileSection] DB save error:', err);
    }
  }, [user, profile]);

  /* ── Sync + Save ── */
  const handleSyncAll = async () => {
    await syncToWidgets();
    await saveProfileToDb();

    /* Persist SE credentials to streamelements_connections (per-user) */
    if (user && profile.seChannelId && profile.seJwtToken) {
      try {
        await supabase.from('streamelements_connections').upsert({
          user_id: user.id,
          se_channel_id: profile.seChannelId,
          se_jwt_token: profile.seJwtToken,
          se_username: profile.twitchUsername || null,
          connected_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      } catch (err) {
        console.error('[ProfileSection] SE connection save error:', err);
      }
    }

    /* Keep localStorage in sync for standalone components (TwitchChat embed) */
    if (profile.twitchUsername) {
      localStorage.setItem('twitchChannel', profile.twitchUsername);
      localStorage.setItem('streamerName', profile.streamerName || profile.twitchUsername);
      window.dispatchEvent(new CustomEvent('streamerNameChanged', { detail: { name: profile.twitchUsername } }));
    }
  };

  const authProvider = user?.app_metadata?.provider || 'email';
  const providerBadge = authProvider === 'twitch' ? '🟣 Twitch' : authProvider === 'google' ? '🔵 Google' : authProvider === 'discord' ? '🟣 Discord' : '📧 Email';

  return (
    <div style={S.page}>
      {/* ──── Row 1: Identity strip ──── */}
      <div style={S.identity} data-tour="profile-identity">
        {profile.avatarUrl ? (
          <img src={profile.avatarUrl} alt="Avatar" style={S.avatar} />
        ) : (
          <div style={S.avatarPlaceholder}>👤</div>
        )}
        <div style={S.identityFields}>
          <div style={{ flex: 1, minWidth: 150 }}>
            <label style={S.label}>Display Name</label>
            <input style={S.input} value={profile.streamerName} onChange={e => set('streamerName', e.target.value)} placeholder="Your streamer name" />
          </div>
          <div style={{ flex: 1, minWidth: 150 }}>
            <label style={S.label}>Motto / Tagline</label>
            <input style={S.input} value={profile.motto} onChange={e => set('motto', e.target.value)} placeholder="Your catchphrase" />
          </div>
          <div style={{ flex: 2, minWidth: 200 }}>
            <label style={S.label}>Avatar URL</label>
            <input style={S.input} value={profile.avatarUrl} onChange={e => set('avatarUrl', e.target.value)} placeholder="https://..." />
          </div>
        </div>
        <span style={{ fontSize: '0.7rem', color: '#64748b', whiteSpace: 'nowrap', flexShrink: 0 }}>{providerBadge}</span>
      </div>

      {/* ──── Row 2: Two-column grid ──── */}
      <div style={S.grid}>
        {/* LEFT — Platforms */}
        <div style={S.card} data-tour="profile-platforms">
          <h3 style={S.cardTitle}>🔗 Platforms</h3>

          <div>
            <div style={S.platRow}>
              <div style={S.dot(!!profile.twitchUsername)} />
              <label style={{ ...S.label, margin: 0, flex: 1 }}>Twitch</label>
            </div>
            <input style={{ ...S.input, marginTop: 4 }} value={profile.twitchUsername} onChange={e => set('twitchUsername', e.target.value)} placeholder="your_twitch_name" />
          </div>

          <div>
            <div style={S.platRow}>
              <div style={S.dot(!!profile.kickChannel)} />
              <label style={{ ...S.label, margin: 0, flex: 1 }}>Kick</label>
            </div>
            <input style={{ ...S.input, marginTop: 4 }} value={profile.kickChannel} onChange={e => set('kickChannel', e.target.value)} placeholder="your_kick_channel" />
          </div>

          <div>
            <div style={S.platRow}>
              <div style={S.dot(!!profile.youtubeChannel)} />
              <label style={{ ...S.label, margin: 0, flex: 1 }}>YouTube</label>
            </div>
            <div style={{ ...S.row2, marginTop: 4 }}>
              <input style={S.input} value={profile.youtubeChannel} onChange={e => set('youtubeChannel', e.target.value)} placeholder="Video / Live ID" />
              <input style={S.input} type="password" value={profile.youtubeApiKey} onChange={e => set('youtubeApiKey', e.target.value)} placeholder="API Key" />
            </div>
          </div>

          <div>
            <div style={S.platRow}>
              <div style={S.dot(!!profile.discordTag)} />
              <label style={{ ...S.label, margin: 0, flex: 1 }}>Discord</label>
            </div>
            <input style={{ ...S.input, marginTop: 4 }} value={profile.discordTag} onChange={e => set('discordTag', e.target.value)} placeholder="username#0000" />
          </div>
        </div>

        {/* RIGHT — Spotify + Preferences */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Spotify card */}
          <div style={S.card} data-tour="profile-spotify">
            <h3 style={S.cardTitle}>🎵 Spotify</h3>
            <div style={S.platRow}>
              <div style={S.dot(!!profile.spotify_access_token)} />
              <span style={{ fontSize: '0.82rem', color: profile.spotify_access_token ? '#1DB954' : '#64748b', fontWeight: 600, flex: 1 }}>
                {profile.spotify_access_token ? 'Connected' : 'Not connected'}
              </span>
              {profile.spotify_access_token ? (
                <button style={{ ...S.btn, background: 'rgba(248,113,113,0.1)', color: '#f87171', fontSize: '0.76rem', padding: '6px 12px' }} onClick={disconnectSpotify}>
                  Disconnect
                </button>
              ) : (
                <button
                  style={{ ...S.btn, background: '#1DB954', color: '#fff', opacity: spotifyLoading ? 0.6 : 1 }}
                  onClick={connectSpotify}
                  disabled={spotifyLoading}
                >
                  {spotifyLoading ? '⏳ Connecting…' : 'Connect'}
                </button>
              )}
            </div>
            {spotifyError && <p style={{ fontSize: '0.74rem', color: '#f87171', margin: 0 }}>{spotifyError}</p>}
            <p style={{ fontSize: '0.72rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
              Connecting here auto-syncs to your Navbar &amp; Spotify widgets.
            </p>
            {/* Song Request chat listener status */}
            {user && profile.twitchUsername && (
              <div style={{ marginTop: 8, padding: '10px 12px', background: 'rgba(29,185,52,0.08)', borderRadius: 10, border: '1px solid rgba(29,185,52,0.2)' }}>
                <p style={{ fontSize: '0.74rem', color: '#1DB954', fontWeight: 700, margin: '0 0 6px' }}>🎶 Chat Song Requests</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: songIrcStatus === 'live' ? '#22c55e' : songIrcStatus === 'connecting' ? '#f59e0b' : '#64748b' }} />
                  <span style={{ fontSize: '0.72rem', color: songIrcStatus === 'live' ? '#22c55e' : songIrcStatus === 'connecting' ? '#f59e0b' : '#64748b', fontWeight: 600 }}>
                    {songIrcStatus === 'live' ? `Listening to #${profile.twitchUsername}` : songIrcStatus === 'connecting' ? 'Connecting…' : 'Not connected'}
                  </span>
                </div>
                {songIrcStatus === 'live' && (
                  <p style={{ fontSize: '0.65rem', color: '#94a3b8', margin: '4px 0 0', lineHeight: 1.4 }}>
                    Viewers type <strong style={{ color: '#e2e8f0' }}>!song Blinding Lights</strong> in chat to queue songs on Spotify
                  </p>
                )}
                {songIrcStatus === 'off' && profile.twitchUsername && (
                  <p style={{ fontSize: '0.65rem', color: '#64748b', margin: '4px 0 0', lineHeight: 1.4 }}>
                    Will auto-connect when Spotify is linked and Twitch username is set
                  </p>
                )}
              </div>
            )}
            {/* Slot Request chat listener status */}
            {user && profile.twitchUsername && (
              <div style={{ marginTop: 8, padding: '10px 12px', background: 'rgba(245,158,11,0.08)', borderRadius: 10, border: '1px solid rgba(245,158,11,0.2)' }}>
                <p style={{ fontSize: '0.74rem', color: '#f59e0b', fontWeight: 700, margin: '0 0 6px' }}>🎰 Chat Slot Requests</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: srIrcStatus === 'live' ? '#22c55e' : srIrcStatus === 'connecting' ? '#f59e0b' : '#64748b' }} />
                  <span style={{ fontSize: '0.72rem', color: srIrcStatus === 'live' ? '#22c55e' : srIrcStatus === 'connecting' ? '#f59e0b' : '#64748b', fontWeight: 600 }}>
                    {srIrcStatus === 'live' ? `Listening to #${profile.twitchUsername}` : srIrcStatus === 'connecting' ? 'Connecting…' : 'Not connected'}
                  </span>
                </div>
                {srIrcStatus === 'live' && (
                  <p style={{ fontSize: '0.65rem', color: '#94a3b8', margin: '4px 0 0', lineHeight: 1.4 }}>
                    Viewers type <strong style={{ color: '#e2e8f0' }}>!sr Gates of Olympus</strong> in chat to request slots
                  </p>
                )}
              </div>
            )}
          </div>

          {/* StreamElements card */}
          <div style={S.card} data-tour="profile-streamelements">
            <h3 style={S.cardTitle}>🎮 StreamElements</h3>
            <div style={S.platRow}>
              <div style={S.dot(!!(profile.seChannelId && profile.seJwtToken))} />
              <span style={{ fontSize: '0.82rem', color: (profile.seChannelId && profile.seJwtToken) ? '#f59e0b' : '#64748b', fontWeight: 600, flex: 1 }}>
                {(profile.seChannelId && profile.seJwtToken) ? 'Connected' : 'Not connected'}
              </span>
              {(profile.seChannelId && profile.seJwtToken) && (
                <button style={{ ...S.btn, background: 'rgba(248,113,113,0.1)', color: '#f87171', fontSize: '0.76rem', padding: '6px 12px' }}
                  onClick={() => { set('seChannelId', ''); set('seJwtToken', ''); setSeTestMsg(''); }}>
                  Clear
                </button>
              )}
            </div>
            <div>
              <label style={S.label}>Channel ID</label>
              <input style={S.input} value={profile.seChannelId} onChange={e => set('seChannelId', e.target.value)} placeholder="Your SE Channel ID" />
            </div>
            <div>
              <label style={S.label}>JWT Token</label>
              <input style={S.input} type="password" value={profile.seJwtToken} onChange={e => set('seJwtToken', e.target.value)} placeholder="Your SE JWT Token" />
            </div>
            {(profile.seChannelId && profile.seJwtToken) && (
              <button style={{ ...S.btn, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontSize: '0.76rem', padding: '6px 12px' }}
                onClick={async () => {
                  setSeTestMsg('⏳ Testing...');
                  try {
                    const res = await fetch(`https://api.streamelements.com/kappa/v2/channels/${profile.seChannelId}`, {
                      headers: { Authorization: `Bearer ${profile.seJwtToken}`, Accept: 'application/json' },
                    });
                    if (res.ok) {
                      const data = await res.json();
                      setSeTestMsg(`✅ Connected to ${data.displayName || data.username || 'channel'}`);
                    } else {
                      setSeTestMsg(`❌ Error ${res.status} — check your credentials`);
                    }
                  } catch { setSeTestMsg('❌ Connection failed'); }
                  setTimeout(() => setSeTestMsg(''), 5000);
                }}>
                🔍 Test Connection
              </button>
            )}
            {seTestMsg && <p style={{ fontSize: '0.74rem', color: seTestMsg.startsWith('✅') ? '#4ade80' : seTestMsg.startsWith('❌') ? '#f87171' : '#f59e0b', margin: 0, fontWeight: 600 }}>{seTestMsg}</p>}
            <p style={{ fontSize: '0.72rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
              Find these in your <a href="https://streamelements.com/dashboard/account/channels" target="_blank" rel="noreferrer" style={{ color: '#f59e0b' }}>SE Dashboard</a> → Account → Channels. Syncs to Community Games.
            </p>
          </div>

          {/* Preferences card */}
          <div style={S.card} data-tour="profile-preferences">
            <h3 style={S.cardTitle}>⚙️ Preferences</h3>
            <div>
              <label style={S.label}>Default Currency</label>
              <select style={{ ...S.input, cursor: 'pointer' }} value={profile.currency} onChange={e => set('currency', e.target.value)}>
                <option value="€">€ Euro</option>
                <option value="$">$ Dollar</option>
                <option value="£">£ Pound</option>
                <option value="R$">R$ Real</option>
                <option value="kr">kr Krone</option>
                <option value="¥">¥ Yen / Yuan</option>
                <option value="₹">₹ Rupee</option>
                <option value="₺">₺ Lira</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {connectedPlatforms.map(p => (
                <span key={p.name} style={{ fontSize: '0.72rem', padding: '3px 10px', borderRadius: 6, background: `${p.color}18`, color: p.color, fontWeight: 600 }}>
                  {p.name}
                </span>
              ))}
              {connectedPlatforms.length === 0 && (
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>No platforms connected yet</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ──── Row 3: Sync bar ──── */}
      <div style={S.syncBar} data-tour="profile-sync">
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#fff' }}>📡 Widget Sync</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(widgets || []).filter(w => SYNC_MAP[w.widget_type]).map(w => (
              <span key={w.id} style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', color: '#94a3b8', textTransform: 'capitalize' }}>
                {w.widget_type === 'navbar' ? '📊' : w.widget_type === 'chat' ? '💬' : w.widget_type === 'spotify_now_playing' ? '🎵' : '🎁'} {w.widget_type.replace('_', ' ')}
              </span>
            ))}
            {(widgets || []).filter(w => SYNC_MAP[w.widget_type]).length === 0 && (
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Add widgets to enable sync</span>
            )}
          </div>
        </div>
        <button
          style={{ ...S.btnSync, width: 'auto', padding: '10px 28px', opacity: saving ? 0.6 : 1 }}
          onClick={handleSyncAll}
          disabled={saving}
        >
          {saving ? '⏳ Syncing...' : '📡 Sync All'}
        </button>
      </div>

      {syncMsg && (
        <div style={{
          ...S.syncResult,
          background: syncMsg.startsWith('✅') ? 'rgba(34,197,94,0.08)' : syncMsg.startsWith('❌') ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
          color: syncMsg.startsWith('✅') ? '#4ade80' : syncMsg.startsWith('❌') ? '#f87171' : '#fbbf24',
          border: `1px solid ${syncMsg.startsWith('✅') ? 'rgba(34,197,94,0.2)' : syncMsg.startsWith('❌') ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
        }}>
          {syncMsg}
        </div>
      )}

      {/* ──── Slot Auto-Tracker Setup Guide ──── */}
      <div data-tour="profile-autotracker" style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1a1040 100%)',
        border: '1px solid rgba(99,102,241,0.3)',
        borderRadius: 14,
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}>
        <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#818cf8', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
          🔗 Slot Auto-Tracker
        </h3>
        <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
          Automatically detect which slot you're playing and sync it with your Bonus Hunt overlay — no manual input needed.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ background: '#6366f1', color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>1</span>
            <p style={{ fontSize: '0.75rem', color: '#cbd5e1', margin: 0, lineHeight: 1.5 }}>
              <strong style={{ color: '#e2e8f0' }}>Install the Chrome extension</strong> — Go to <code style={{ background: 'rgba(99,102,241,0.2)', padding: '1px 4px', borderRadius: 3, fontSize: '0.7rem' }}>chrome://extensions</code> → Enable <strong>Developer Mode</strong> → Click <strong>"Load unpacked"</strong> → Select the <code style={{ background: 'rgba(99,102,241,0.2)', padding: '1px 4px', borderRadius: 3, fontSize: '0.7rem' }}>browser-extension</code> folder.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ background: '#6366f1', color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>2</span>
            <p style={{ fontSize: '0.75rem', color: '#cbd5e1', margin: 0, lineHeight: 1.5 }}>
              <strong style={{ color: '#e2e8f0' }}>Enter your User ID</strong> — Click the extension icon and paste your User ID:
              <br />
              <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#a78bfa', background: 'rgba(124,58,237,0.1)', padding: '2px 6px', borderRadius: 4, display: 'inline-block', marginTop: 4, userSelect: 'all' }}>
                {user?.id || '—'}
              </span>
              <button
                style={{ marginLeft: 8, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8', fontSize: '0.7rem', padding: '2px 8px', borderRadius: 5, cursor: 'pointer' }}
                onClick={() => { navigator.clipboard.writeText(user?.id || ''); }}
              >📋 Copy</button>
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ background: '#6366f1', color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>3</span>
            <p style={{ fontSize: '0.75rem', color: '#cbd5e1', margin: 0, lineHeight: 1.5 }}>
              <strong style={{ color: '#e2e8f0' }}>Enable in Bonus Hunt</strong> — Go to your Bonus Hunt widget → Content tab → Turn on <strong>"🔗 Auto-Tracker"</strong>.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ background: '#4ade80', color: '#000', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>✓</span>
            <p style={{ fontSize: '0.75rem', color: '#4ade80', margin: 0, lineHeight: 1.5, fontWeight: 600 }}>
              Play! When you open a slot on Stake, Roobet, Duelbits, etc., the extension detects it and your overlay highlights it automatically.
            </p>
          </div>
        </div>

        <div style={{ background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.2)', borderRadius: 8, padding: '8px 12px', fontSize: '0.72rem', color: '#fbbf24' }}>
          💡 Works on <strong>any casino</strong> — Stake, Roobet, Duelbits, Megarich, and more. The extension only reads tab URLs — it cannot see your balance or bets.
        </div>
      </div>

      {/* ──── Twitch Extension Info ──── */}
      <div data-tour="profile-twitch-ext" style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1a0a2e 100%)',
        border: '1px solid rgba(169,85,247,0.3)',
        borderRadius: 14,
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}>
        <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#a855f7', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
          📺 Twitch Extension
        </h3>
        <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
          Your channel has a built-in Twitch Extension that lets viewers interact directly from your stream page — no extra setup needed from viewers.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10,
            padding: '14px 16px',
          }}>
            <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0', margin: '0 0 8px 0' }}>🎰 What viewers can do</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>🔮 <strong style={{ color: '#e2e8f0' }}>Predictions</strong> — Bet on outcomes during your stream</span>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>🎁 <strong style={{ color: '#e2e8f0' }}>Giveaways</strong> — Enter giveaways with one click</span>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>🎲 <strong style={{ color: '#e2e8f0' }}>Mini-games</strong> — Play Blackjack and Mines to earn points</span>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>📊 <strong style={{ color: '#e2e8f0' }}>Stats</strong> — See live session stats and leaderboards</span>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>🎡 <strong style={{ color: '#e2e8f0' }}>Daily Wheel</strong> — Spin once per day for bonus points</span>
            </div>
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10,
            padding: '14px 16px',
          }}>
            <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0', margin: '0 0 8px 0' }}>📋 Two display modes</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>📌 <strong style={{ color: '#a855f7' }}>Panel</strong> — Shows below your stream as a tabbed panel with all features</span>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>🖼️ <strong style={{ color: '#a855f7' }}>Video Overlay</strong> — A floating "🎰 Interact" button on the stream video that slides open a side panel</span>
            </div>
          </div>

          <div style={{
            background: 'rgba(169,85,247,0.08)',
            border: '1px solid rgba(169,85,247,0.2)',
            borderRadius: 10,
            padding: '14px 16px',
          }}>
            <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#a855f7', margin: '0 0 8px 0' }}>⚙️ Streamer controls</h4>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
              Manage your extension from the <strong style={{ color: '#e2e8f0' }}>Admin Panel → Extension</strong> page. From there you can create predictions,
              run giveaways, start betting pools, and configure all viewer-facing features. Points are tracked automatically per viewer.
            </p>
          </div>
        </div>

        <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, padding: '8px 12px', fontSize: '0.72rem', color: '#4ade80' }}>
          ✅ The extension works on <strong>any streamer's channel</strong> that installs it — all data is per-channel and auto-configured.
        </div>
      </div>

      {/* ──── OBS Setup Guide ──── */}
      <div data-tour="profile-obs-guide" style={{
        background: 'rgba(124,58,237,0.06)',
        border: '1px solid rgba(124,58,237,0.2)',
        borderRadius: 14,
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}>
        <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#a78bfa', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
          🖥️ OBS Browser Source Setup
        </h3>
        <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
          If your overlay looks blurry or low-resolution in OBS, check these settings:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10,
            padding: '14px 16px',
          }}>
            <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0', margin: '0 0 8px 0' }}>📋 Browser Source Properties</h4>
            <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <li style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.5 }}>Right-click your browser source → <strong style={{ color: '#e2e8f0' }}>Properties</strong></li>
              <li style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.5 }}>Set <strong style={{ color: '#a78bfa' }}>Width: 1920</strong> and <strong style={{ color: '#a78bfa' }}>Height: 1080</strong></li>
              <li style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.5 }}>Make sure <strong style={{ color: '#e2e8f0' }}>"Custom CSS"</strong> doesn't override sizes</li>
            </ol>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10,
            padding: '14px 16px',
          }}>
            <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0', margin: '0 0 8px 0' }}>⚙️ OBS Video Settings</h4>
            <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <li style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.5 }}>Go to <strong style={{ color: '#e2e8f0' }}>Settings → Video</strong></li>
              <li style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.5 }}><strong style={{ color: '#a78bfa' }}>Base (Canvas) Resolution</strong> → 1920×1080</li>
              <li style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.5 }}><strong style={{ color: '#a78bfa' }}>Output (Scaled) Resolution</strong> → 1920×1080</li>
            </ol>
          </div>
          <div style={{
            background: 'rgba(250,204,21,0.06)',
            border: '1px solid rgba(250,204,21,0.15)',
            borderRadius: 10,
            padding: '12px 16px',
          }}>
            <p style={{ fontSize: '0.75rem', color: '#fbbf24', margin: 0, lineHeight: 1.5 }}>
              ⚠️ If your browser source is set to a smaller size (e.g. 800×600) while your canvas is 1920×1080, OBS will scale the content down then stretch it back up — causing blurriness.
            </p>
          </div>
          <div style={{
            background: 'rgba(34,197,94,0.06)',
            border: '1px solid rgba(34,197,94,0.15)',
            borderRadius: 10,
            padding: '14px 16px',
          }}>
            <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4ade80', margin: '0 0 6px 0' }}>✅ Quick Checklist</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>☑️ Browser Source → <strong style={{ color: '#e2e8f0' }}>1920 × 1080</strong></span>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>☑️ OBS Base Canvas → <strong style={{ color: '#e2e8f0' }}>1920 × 1080</strong></span>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>☑️ OBS Output Resolution → <strong style={{ color: '#e2e8f0' }}>1920 × 1080</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
