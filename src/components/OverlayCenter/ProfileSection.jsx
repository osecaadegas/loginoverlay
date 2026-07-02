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
  },
  spotify_now_playing: {
    spotify_access_token: 'spotify_access_token',
    spotify_refresh_token: 'spotify_refresh_token',
    spotify_expires_at: 'spotify_expires_at',
  },
  coin_flip: {
    twitchUsername: 'twitchChannel',
    kickChannel: 'kickChannelId',
  },
  point_slot: {
  },
  salty_words: {
  },
  predictions: {
  },
  point_wheel: {
    twitchUsername: 'twitchChannel',
    kickChannel: 'kickChannelId',
  },
  bets: {
    twitchUsername: 'twitchChannel',
  },
};

const S = {
  page: { display: 'flex', flexDirection: 'column', gap: 20, width: '100%', maxWidth: '100%' },
  /* top identity strip */
  identity: {
    display: 'flex', alignItems: 'center', gap: 20, padding: '18px 22px',
    background: 'linear-gradient(150deg, rgba(17,24,39,0.78), rgba(13,17,23,0.9))', border: '1px solid rgba(148,163,184,0.28)', borderRadius: 22,
  },
  avatar: { width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(200,208,216,0.38)', flexShrink: 0 },
  avatarPlaceholder: { width: 64, height: 64, borderRadius: '50%', background: 'rgba(148,163,184,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, border: '3px solid rgba(200,208,216,0.32)', flexShrink: 0 },
  identityFields: { display: 'flex', flex: 1, gap: 12, flexWrap: 'wrap', minWidth: 0 },
  /* grid for middle section */
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  /* cards used in the grid */
  card: {
    background: 'linear-gradient(150deg, rgba(17,24,39,0.78), rgba(13,17,23,0.9))', border: '1px solid rgba(148,163,184,0.28)',
    borderRadius: 22, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12,
  },
  cardTitle: { fontSize: '0.88rem', fontWeight: 850, color: '#f4f7fb', display: 'flex', alignItems: 'center', gap: 8, margin: 0 },
  /* form elements */
  label: { display: 'block', fontSize: '0.72rem', color: '#d0dbe6', fontWeight: 800, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0 },
  input: { width: '100%', padding: '8px 11px', background: 'rgba(13,17,23,0.88)', border: '1px solid rgba(148,163,184,0.3)', borderRadius: 16, color: '#f4f7fb', fontSize: '0.82rem', boxSizing: 'border-box' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  /* platform compact row */
  platRow: { display: 'flex', alignItems: 'center', gap: 10 },
  dot: (on) => ({ width: 7, height: 7, borderRadius: '50%', background: on ? '#d0dbe6' : '#6d7a8d', flexShrink: 0, boxShadow: on ? '0 0 16px rgba(208,219,230,0.36)' : 'none' }),
  /* buttons */
  btn: { padding: '8px 14px', borderRadius: 999, border: '1px solid rgba(148,163,184,0.34)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 800, transition: 'all 0.15s' },
  btnSync: { background: 'linear-gradient(135deg, #94a3b8 0%, #7c8797 48%, #64748b 100%)', color: '#f4f7fb', width: '100%', padding: '12px 16px', fontSize: '0.88rem', borderRadius: 999, border: '1px solid rgba(200,208,216,0.5)', cursor: 'pointer', fontWeight: 850 },
  syncBar: {
    display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
    background: 'linear-gradient(150deg, rgba(17,24,39,0.78), rgba(13,17,23,0.9))', border: '1px solid rgba(148,163,184,0.28)', borderRadius: 22,
  },
  syncResult: { fontSize: '0.8rem', padding: '8px 14px', borderRadius: 10, textAlign: 'center', fontWeight: 600 },
};

/* ── ApiKeyCard sub-component ── */
function ApiKeyCard({ user }) {
  const [apiKey, setApiKey] = useState(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      // Check if user has API access
      const { data: access } = await supabase
        .from('streamer_api_access')
        .select('is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      setHasAccess(!!access);

      if (access) {
        const { data: key } = await supabase
          .from('streamer_api_keys')
          .select('*')
          .eq('user_id', user.id)
          .single();
        setApiKey(key);
      }
      setLoading(false);
    })();
  }, [user?.id]);

  const generateKey = async () => {
    const { data, error } = await supabase
      .from('streamer_api_keys')
      .upsert({
        user_id: user.id,
        label: 'My Website',
        is_active: true,
      }, { onConflict: 'user_id' })
      .select()
      .single();
    if (!error) setApiKey(data);
  };

  const copyKey = () => {
    if (apiKey?.api_key) {
      navigator.clipboard.writeText(apiKey.api_key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) return null;

  return (
    <div style={S.card}>
      <h3 style={S.cardTitle}>🔑 Website API</h3>
      {!hasAccess ? (
        <p style={{ fontSize: '0.78rem', color: '#aab6c8', margin: 0, lineHeight: 1.5 }}>
          API access not enabled for your account. Ask the site admin to grant you access from the Admin Panel → API Keys tab.
        </p>
      ) : !apiKey ? (
        <div>
          <p style={{ fontSize: '0.78rem', color: '#aab6c8', margin: '0 0 8px', lineHeight: 1.5 }}>
            Sync your bonus hunt data to your own website in real-time.
          </p>
          <button
            style={{ ...S.btn, background: 'linear-gradient(135deg, #94a3b8 0%, #7c8797 48%, #64748b 100%)', color: '#f4f7fb', fontWeight: 800, width: '100%' }}
            onClick={generateKey}
          >
            🔑 Generate API Key
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{
            background: 'rgba(8,11,16,0.86)', borderRadius: 16, padding: '8px 10px',
            fontFamily: 'monospace', fontSize: '0.75rem', color: '#f4f7fb',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span>{apiKey.api_key.slice(0, 12)}...{apiKey.api_key.slice(-8)}</span>
            <button onClick={copyKey} style={{
              background: 'rgba(17,24,39,0.58)', border: '1px solid rgba(148,163,184,0.34)',
              color: '#d0dbe6', fontSize: '0.7rem', padding: '2px 8px', borderRadius: 999, cursor: 'pointer',
            }}>
              {copied ? '✓' : '📋'}
            </button>
          </div>
          <p style={{ fontSize: '0.72rem', color: '#aab6c8', margin: 0, lineHeight: 1.5 }}>
            Add to your website: <code style={{ background: 'rgba(17,24,39,0.72)', padding: '1px 6px', borderRadius: 999, fontSize: '0.68rem', color: '#f4f7fb', border: '1px solid rgba(148,163,184,0.28)' }}>&lt;script src="{window.location.origin}/bonus-hunt-embed.js"&gt;</code>
          </p>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: '0.72rem', color: apiKey.is_active ? '#d0dbe6' : '#fca5a5',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: apiKey.is_active ? '#d0dbe6' : '#ef4444' }} />
            {apiKey.is_active ? 'Active' : 'Disabled'}
            {apiKey.last_used_at && <span style={{ color: '#6d7a8d' }}> • Last used {new Date(apiKey.last_used_at).toLocaleDateString()}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProfileSection({ widgets, saveWidget }) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [platformSaved, setPlatformSaved] = useState(false);

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
  const [seSaving, setSeSaving] = useState(false);
  const [spotifyLoading, setSpotifyLoading] = useState(false);
  const [spotifyError, setSpotifyError] = useState('');
  const [songIrcStatus, setSongIrcStatus] = useState('off');
  const songWsRef = useRef(null);
  const songReconnectRef = useRef(null);
  const [srIrcStatus, setSrIrcStatus] = useState('off');
  const widgetsRef = useRef(widgets);
  widgetsRef.current = widgets;

  /* ── Load profile from existing widget configs + user metadata ── */
  useEffect(() => {
    if (!user) return;
    const meta = user.user_metadata || {};
    const nb = (widgets || []).find(w => w.widget_type === 'navbar')?.config || {};
    const chat = (widgets || []).find(w => w.widget_type === 'chat')?.config || {};
    const ga = (widgets || []).find(w => w.widget_type === 'giveaway')?.config || {};
    const sp = (widgets || []).find(w => w.widget_type === 'spotify_now_playing')?.config || {};

    /* Pick Spotify tokens from whichever widget has them */
    const spotToken = nb.spotify_access_token || sp.spotify_access_token || '';
    const spotRefresh = nb.spotify_refresh_token || sp.spotify_refresh_token || '';
    const spotExpires = nb.spotify_expires_at || sp.spotify_expires_at || null;

    /* Load SE credentials ONLY from the user's own streamelements_connections row — never from widget configs */
    (async () => {
      let seChannel = '';
      let seJwt = '';
      try {
        const { data } = await supabase
          .from('streamelements_connections')
          .select('se_channel_id, se_jwt_token')
          .eq('user_id', user.id)
          .single();
        if (data) {
          seChannel = data.se_channel_id || '';
          seJwt = data.se_jwt_token || '';
        }
      } catch { /* no row yet — starts empty */ }

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
        seChannelId: seChannel,
        seJwtToken: seJwt,
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

          // !sr is handled by SlotRequestsWidget's own IRC connection
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
    if (profile.twitchUsername) list.push({ name: 'Twitch', user: profile.twitchUsername, color: '#64748b' });
    if (profile.kickChannel) list.push({ name: 'Kick', user: profile.kickChannel, color: '#b8c8d8' });
    if (profile.youtubeChannel) list.push({ name: 'YouTube', user: profile.youtubeChannel, color: '#94a3b8' });
    if (profile.discordTag) list.push({ name: 'Discord', user: profile.discordTag, color: '#64748b' });
    if (profile.spotify_access_token) list.push({ name: 'Spotify', user: 'Connected', color: '#d0dbe6' });
    if (profile.seChannelId && profile.seJwtToken) list.push({ name: 'StreamElements', user: 'Connected', color: '#b8c8d8' });
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
    <div className="oc-profile-page" style={S.page}>
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
        <span style={{ fontSize: '0.7rem', color: '#aab6c8', whiteSpace: 'nowrap', flexShrink: 0 }}>{providerBadge}</span>
      </div>

      {/* ──── Row 2: Two-column grid ──── */}
      <div style={S.grid}>
        {/* LEFT — Platforms + Widget Sync + OBS Guide */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ ...S.card, gap: 8 }} data-tour="profile-platforms">
          <h3 style={S.cardTitle}>🔗 Platforms</h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={S.dot(!!profile.twitchUsername)} />
            <label style={{ ...S.label, margin: 0, minWidth: 60 }}>Twitch</label>
            <input style={{ ...S.input, flex: 1, margin: 0 }} value={profile.twitchUsername} onChange={e => set('twitchUsername', e.target.value)} placeholder="your_twitch_name" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={S.dot(!!profile.kickChannel)} />
            <label style={{ ...S.label, margin: 0, minWidth: 60 }}>Kick</label>
            <input style={{ ...S.input, flex: 1, margin: 0 }} value={profile.kickChannel} onChange={e => set('kickChannel', e.target.value)} placeholder="your_kick_channel" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={S.dot(!!profile.youtubeChannel)} />
            <label style={{ ...S.label, margin: 0, minWidth: 60 }}>YouTube</label>
            <input style={{ ...S.input, flex: 1, margin: 0 }} value={profile.youtubeChannel} onChange={e => set('youtubeChannel', e.target.value)} placeholder="Video / Live ID" />
            <input style={{ ...S.input, flex: 1, margin: 0 }} type="password" value={profile.youtubeApiKey} onChange={e => set('youtubeApiKey', e.target.value)} placeholder="API Key" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={S.dot(!!profile.discordTag)} />
            <label style={{ ...S.label, margin: 0, minWidth: 60 }}>Discord</label>
            <input style={{ ...S.input, flex: 1, margin: 0 }} value={profile.discordTag} onChange={e => set('discordTag', e.target.value)} placeholder="username#0000" />
          </div>

          <button
            style={{ ...S.btn, background: platformSaved ? 'rgba(208,219,230,0.16)' : 'rgba(17,24,39,0.58)', color: platformSaved ? '#d0dbe6' : '#aab6c8', border: '1px solid rgba(148,163,184,0.34)', width: '100%', marginTop: 4 }}
            onClick={async () => {
              await saveProfileToDb();
              setPlatformSaved(true);
              setTimeout(() => setPlatformSaved(false), 2000);
            }}
          >
            {platformSaved ? '✓ Saved' : '💾 Save'}
          </button>
        </div>

        {/* Widget Sync (below Platforms) */}
        <div style={{ ...S.syncBar, borderRadius: 12 }} data-tour="profile-sync">
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#fff' }}>📡 Widget Sync</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(widgets || []).filter(w => SYNC_MAP[w.widget_type]).map(w => (
                <span key={w.id} style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 999, background: 'rgba(17,24,39,0.58)', color: '#d0dbe6', border: '1px solid rgba(148,163,184,0.28)', textTransform: 'capitalize' }}>
                  {w.widget_type === 'navbar' ? '📊' : w.widget_type === 'chat' ? '💬' : w.widget_type === 'spotify_now_playing' ? '🎵' : w.widget_type === 'bets' ? '🎲' : '🎁'} {w.widget_type.replace('_', ' ')}
                </span>
              ))}
              {(widgets || []).filter(w => SYNC_MAP[w.widget_type]).length === 0 && (
                <span style={{ fontSize: '0.72rem', color: '#aab6c8' }}>Add widgets to enable sync</span>
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
            background: syncMsg.startsWith('✅') ? 'rgba(208,219,230,0.08)' : syncMsg.startsWith('❌') ? 'rgba(148,163,184,0.1)' : 'rgba(200,208,216,0.1)',
            color: syncMsg.startsWith('✅') ? '#d0dbe6' : syncMsg.startsWith('❌') ? '#fca5a5' : '#b8c8d8',
            border: `1px solid ${syncMsg.startsWith('✅') ? 'rgba(208,219,230,0.24)' : syncMsg.startsWith('❌') ? 'rgba(148,163,184,0.24)' : 'rgba(200,208,216,0.24)'}`,
          }}>
            {syncMsg}
          </div>
        )}

        {/* OBS Browser Source Setup (below Widget Sync) */}
        <div data-tour="profile-obs-guide" style={{ ...S.card }}>
          <h3 style={S.cardTitle}>🖥️ OBS Browser Source Setup</h3>
          <p style={{ fontSize: '0.75rem', color: '#aab6c8', margin: 0, lineHeight: 1.5 }}>
            Add your overlay as a Browser Source in OBS. Go to <strong style={{ color: '#d0dbe6' }}>Overlay Center → Get Link</strong> and paste the URL into OBS. Recommended settings: <strong style={{ color: '#d0dbe6' }}>1920×1080</strong>, enable <strong style={{ color: '#d0dbe6' }}>Shutdown source when not visible</strong>.
          </p>
          <p style={{ fontSize: '0.72rem', color: '#aab6c8', margin: 0, lineHeight: 1.5 }}>
            If the overlay looks blurry, right-click the source in OBS → <strong style={{ color: '#d0dbe6' }}>Transform → Edit Transform</strong> and make sure the size matches your canvas resolution exactly.
          </p>
        </div>
        </div>

        {/* RIGHT — Spotify + Preferences */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Spotify card */}
          <div style={S.card} data-tour="profile-spotify">
            <h3 style={S.cardTitle}>🎵 Spotify</h3>
            <div style={S.platRow}>
              <div style={S.dot(!!profile.spotify_access_token)} />
              <span style={{ fontSize: '0.82rem', color: profile.spotify_access_token ? '#d0dbe6' : '#aab6c8', fontWeight: 600, flex: 1 }}>
                {profile.spotify_access_token ? 'Connected' : 'Not connected'}
              </span>
              {profile.spotify_access_token ? (
                <button style={{ ...S.btn, background: 'rgba(248,113,113,0.1)', color: '#f87171', fontSize: '0.76rem', padding: '6px 12px' }} onClick={disconnectSpotify}>
                  Disconnect
                </button>
              ) : (
                <button
                  style={{ ...S.btn, background: 'linear-gradient(135deg, #94a3b8 0%, #7c8797 48%, #64748b 100%)', color: '#f4f7fb', opacity: spotifyLoading ? 0.6 : 1 }}
                  onClick={connectSpotify}
                  disabled={spotifyLoading}
                >
                  {spotifyLoading ? '⏳ Connecting…' : 'Connect'}
                </button>
              )}
            </div>
            {spotifyError && <p style={{ fontSize: '0.74rem', color: '#f87171', margin: 0 }}>{spotifyError}</p>}
            <p style={{ fontSize: '0.72rem', color: '#aab6c8', margin: 0, lineHeight: 1.4 }}>
              Connecting here auto-syncs to your Navbar &amp; Spotify widgets.
            </p>
            {/* Song Request chat listener status */}
            {user && profile.twitchUsername && (
              <div style={{ marginTop: 8, padding: '10px 12px', background: 'rgba(208,219,230,0.08)', borderRadius: 16, border: '1px solid rgba(208,219,230,0.22)' }}>
                <p style={{ fontSize: '0.74rem', color: '#f4f7fb', fontWeight: 700, margin: '0 0 6px' }}>🎶 Chat Song Requests</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: songIrcStatus === 'live' ? '#d0dbe6' : songIrcStatus === 'connecting' ? '#b8c8d8' : '#6d7a8d' }} />
                  <span style={{ fontSize: '0.72rem', color: songIrcStatus === 'live' ? '#d0dbe6' : songIrcStatus === 'connecting' ? '#b8c8d8' : '#aab6c8', fontWeight: 600 }}>
                    {songIrcStatus === 'live' ? `Listening to #${profile.twitchUsername}` : songIrcStatus === 'connecting' ? 'Connecting…' : 'Not connected'}
                  </span>
                </div>
                {songIrcStatus === 'live' && (
                  <p style={{ fontSize: '0.65rem', color: '#aab6c8', margin: '4px 0 0', lineHeight: 1.4 }}>
                    Viewers type <strong style={{ color: '#d0dbe6' }}>!song Blinding Lights</strong> in chat to queue songs on Spotify
                  </p>
                )}
                {songIrcStatus === 'off' && profile.twitchUsername && (
                  <p style={{ fontSize: '0.65rem', color: '#aab6c8', margin: '4px 0 0', lineHeight: 1.4 }}>
                    Will auto-connect when Spotify is linked and Twitch username is set
                  </p>
                )}
              </div>
            )}
            {/* Slot Request chat listener status */}
            {user && profile.twitchUsername && (
              <div style={{ marginTop: 8, padding: '10px 12px', background: 'rgba(208,219,230,0.08)', borderRadius: 16, border: '1px solid rgba(208,219,230,0.22)' }}>
                <p style={{ fontSize: '0.74rem', color: '#f4f7fb', fontWeight: 700, margin: '0 0 6px' }}>🎰 Chat Slot Requests</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: srIrcStatus === 'live' ? '#d0dbe6' : srIrcStatus === 'connecting' ? '#b8c8d8' : '#6d7a8d' }} />
                  <span style={{ fontSize: '0.72rem', color: srIrcStatus === 'live' ? '#d0dbe6' : srIrcStatus === 'connecting' ? '#b8c8d8' : '#aab6c8', fontWeight: 600 }}>
                    {srIrcStatus === 'live' ? `Listening to #${profile.twitchUsername}` : srIrcStatus === 'connecting' ? 'Connecting…' : 'Not connected'}
                  </span>
                </div>
                {srIrcStatus === 'live' && (
                  <p style={{ fontSize: '0.65rem', color: '#aab6c8', margin: '4px 0 0', lineHeight: 1.4 }}>
                    Viewers type <strong style={{ color: '#d0dbe6' }}>!sr Gates of Olympus</strong> in chat to request slots
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
              <span style={{ fontSize: '0.82rem', color: (profile.seChannelId && profile.seJwtToken) ? '#d0dbe6' : '#aab6c8', fontWeight: 600, flex: 1 }}>
                {(profile.seChannelId && profile.seJwtToken) ? 'Connected' : 'Not connected'}
              </span>
              {(profile.seChannelId && profile.seJwtToken) && (
                <button style={{ ...S.btn, background: 'rgba(248,113,113,0.1)', color: '#f87171', fontSize: '0.76rem', padding: '6px 12px' }}
                  onClick={async () => {
                    set('seChannelId', ''); set('seJwtToken', ''); setSeTestMsg('');
                    try {
                      await supabase.from('streamelements_connections').delete().eq('user_id', user.id);
                    } catch { /* ignore */ }
                    setSeTestMsg('✅ Credentials cleared');
                    setTimeout(() => setSeTestMsg(''), 3000);
                  }}>
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
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ ...S.btn, background: 'rgba(148,163,184,0.18)', color: '#f4f7fb', fontSize: '0.76rem', padding: '6px 16px', flex: 1, fontWeight: 800 }}
                disabled={seSaving || !profile.seChannelId || !profile.seJwtToken}
                onClick={async () => {
                  setSeSaving(true);
                  setSeTestMsg('');
                  try {
                    await supabase.from('streamelements_connections').upsert({
                      user_id: user.id,
                      se_channel_id: profile.seChannelId,
                      se_jwt_token: profile.seJwtToken,
                      se_username: profile.twitchUsername || null,
                      connected_at: new Date().toISOString(),
                    }, { onConflict: 'user_id' });
                    setSeTestMsg('✅ Saved!');
                  } catch (err) {
                    console.error('[ProfileSection] SE save error:', err);
                    setSeTestMsg('❌ Failed to save');
                  }
                  setSeSaving(false);
                  setTimeout(() => setSeTestMsg(''), 4000);
                }}>
                {seSaving ? '⏳ Saving...' : '💾 Save Credentials'}
              </button>
              {(profile.seChannelId && profile.seJwtToken) && (
                <button style={{ ...S.btn, background: 'rgba(148,163,184,0.18)', color: '#d0dbe6', fontSize: '0.76rem', padding: '6px 12px' }}
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
                  🔍 Test
                </button>
              )}
            </div>
            {seTestMsg && <p style={{ fontSize: '0.74rem', color: seTestMsg.startsWith('✅') ? '#d0dbe6' : seTestMsg.startsWith('❌') ? '#fca5a5' : '#b8c8d8', margin: 0, fontWeight: 600 }}>{seTestMsg}</p>}
            <p style={{ fontSize: '0.72rem', color: '#aab6c8', margin: 0, lineHeight: 1.4 }}>
              Find these in your <a href="https://streamelements.com/dashboard/account/channels" target="_blank" rel="noreferrer" style={{ color: '#d0dbe6' }}>SE Dashboard</a> → Account → Channels.
              <br />Each user must enter their own credentials. Saved per-account.
            </p>

            {/* ── !bet command URL ── */}
            <div style={{ marginTop: 10, padding: '10px 12px', background: 'rgba(148,163,184,0.12)', borderRadius: 16, border: '1px solid rgba(148,163,184,0.28)' }}>
              <p style={{ fontSize: '0.78rem', fontWeight: 800, color: '#d0dbe6', margin: '0 0 4px' }}>
                🔗 !bet Command URL
              </p>
              <p style={{ fontSize: '0.72rem', color: '#aab6c8', margin: '0 0 6px' }}>
                In SE, create a custom command <code style={{ color: '#d0dbe6' }}>!bet</code> with this URL response:
              </p>
              <div style={{ display: 'flex', alignItems: 'stretch', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(148,163,184,0.3)' }}>
                <code style={{ flex: 1, display: 'block', fontSize: '0.65rem', wordBreak: 'break-all', color: '#f4f7fb', background: 'rgba(8,11,16,0.86)', padding: '7px 9px', lineHeight: 1.6 }}>
                  {`${window.location.origin}/api/chat-commands?cmd=bet&user_id=${user?.id || '<your-user-id>'}&w1=\${1}&w2=\${2}&requester=\${user.username}`}
                </code>
                <button
                  style={{ background: 'rgba(148,163,184,0.22)', border: 'none', color: '#f4f7fb', padding: '0 12px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800, flexShrink: 0 }}
                  onClick={() => {
                    const url = `${window.location.origin}/api/chat-commands?cmd=bet&user_id=${user?.id || ''}&w1=\${1}&w2=\${2}&requester=\${user.username}`;
                    navigator.clipboard.writeText(url).catch(() => {});
                  }}
                >📋</button>
              </div>
              <p style={{ fontSize: '0.68rem', color: '#aab6c8', margin: '5px 0 0' }}>
                <code style={{ color: '#d0dbe6' }}>{'${1}'}</code> = option · <code style={{ color: '#d0dbe6' }}>{'${2}'}</code> = amount · <code style={{ color: '#d0dbe6' }}>{'${user.username}'}</code> = viewer (SE placeholders)
              </p>
            </div>
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
                <span style={{ fontSize: '0.72rem', color: '#aab6c8' }}>No platforms connected yet</span>
              )}
            </div>
          </div>

          {/* Website API Key card */}
          <ApiKeyCard user={user} />
        </div>
      </div>
    </div>
  );
}
