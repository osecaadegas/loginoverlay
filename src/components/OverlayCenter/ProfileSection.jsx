/**
 * ProfileSection.jsx — Central profile hub in the Overlay Center.
 * Manages streamer identity, connected accounts, and preferences.
 * Syncs profile data to all relevant widgets (navbar, chat, giveaway, etc.)
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
      seChannelId: communityW?.seChannelId || import.meta.env.VITE_SE_CHANNEL_ID || prev.seChannelId || '',
      seJwtToken: communityW?.seJwtToken || import.meta.env.VITE_SE_JWT_TOKEN || prev.seJwtToken || '',
      spotify_access_token: spotToken,
      spotify_refresh_token: spotRefresh,
      spotify_expires_at: spotExpires,
    }));
  }, [user, widgets]);

  const set = (key, val) => setProfile(prev => ({ ...prev, [key]: val }));

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
      <div style={S.identity}>
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
        <div style={S.card}>
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
          <div style={S.card}>
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
          </div>

          {/* StreamElements card */}
          <div style={S.card}>
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
          <div style={S.card}>
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
      <div style={S.syncBar}>
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
    </div>
  );
}
