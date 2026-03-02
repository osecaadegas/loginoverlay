/**
 * ProfileSection.jsx — Central profile hub in the Overlay Center.
 * Manages streamer identity, connected accounts, and preferences.
 * Syncs profile data to all relevant widgets (navbar, chat, giveaway, etc.)
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../config/supabaseClient';

/* ── Which config keys to push to each widget type ── */
const SYNC_MAP = {
  navbar: {
    streamerName: 'streamerName',
    motto: 'motto',
    twitchUsername: 'twitchUsername',
    avatarUrl: 'avatarUrl',
  },
  chat: {
    twitchUsername: 'twitchChannel',
    kickChannel: 'kickChannelId',
    youtubeChannel: 'youtubeVideoId',
  },
  giveaway: {
    twitchUsername: 'twitchChannel',
    kickChannel: 'kickChannelId',
  },
};

const S = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 620 },
  card: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  cardTitle: { fontSize: '0.95rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 },
  cardDesc: { fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.5, marginTop: -8 },
  label: { display: 'block', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' },
  input: { width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: '0.84rem', boxSizing: 'border-box' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  avatar: { width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(124,58,237,0.4)' },
  avatarPlaceholder: { width: 72, height: 72, borderRadius: '50%', background: 'rgba(124,58,237,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, border: '3px solid rgba(124,58,237,0.3)' },
  btn: { padding: '9px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, transition: 'all 0.15s' },
  btnPrimary: { background: '#7c3aed', color: '#fff' },
  btnSecondary: { background: 'rgba(255,255,255,0.06)', color: '#fff' },
  btnSync: { background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', color: '#fff', width: '100%', padding: '12px 16px', fontSize: '0.88rem' },
  connected: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 10 },
  notConnected: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10 },
  dot: (on) => ({ width: 8, height: 8, borderRadius: '50%', background: on ? '#22c55e' : '#64748b', flexShrink: 0 }),
  platformName: { fontSize: '0.84rem', fontWeight: 600, color: '#fff', flex: 1 },
  platformUser: { fontSize: '0.78rem', color: '#7c3aed', fontWeight: 600 },
  syncResult: { fontSize: '0.8rem', padding: '10px 14px', borderRadius: 10, textAlign: 'center', fontWeight: 600 },
  section: { marginBottom: 0 },
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
  });

  /* ── Load profile from existing widget configs + user metadata ── */
  useEffect(() => {
    if (!user) return;
    const meta = user.user_metadata || {};
    const nb = (widgets || []).find(w => w.widget_type === 'navbar')?.config || {};
    const chat = (widgets || []).find(w => w.widget_type === 'chat')?.config || {};
    const ga = (widgets || []).find(w => w.widget_type === 'giveaway')?.config || {};

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
    return list;
  }, [profile]);

  /* ── Sync profile → all widgets ── */
  const syncToWidgets = useCallback(async () => {
    if (!widgets || widgets.length === 0) { setSyncMsg('⚠️ No widgets to sync to'); return; }
    setSaving(true);
    setSyncMsg('');
    let synced = 0;

    try {
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

        if (changed) {
          await saveWidget({ ...widget, config: { ...widget.config, ...updates } });
          synced++;
        }
      }

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
  };

  const authProvider = user?.app_metadata?.provider || 'email';

  return (
    <div style={S.wrap}>
      {/* ──── Header ──── */}
      <div>
        <h2 style={{ color: '#fff', fontSize: '1.3rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          👤 Streamer Profile
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.84rem', marginTop: 6, lineHeight: 1.5 }}>
          Set up your identity once — sync it to all your widgets instantly.
        </p>
      </div>

      {/* ──── Identity Card ──── */}
      <div style={S.card}>
        <div style={S.cardTitle}>🪪 Identity</div>
        <p style={S.cardDesc}>Your display name and avatar shown across all widgets.</p>

        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          {/* Avatar */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="Avatar" style={S.avatar} />
            ) : (
              <div style={S.avatarPlaceholder}>👤</div>
            )}
            <span style={{ fontSize: '0.7rem', color: '#64748b', textAlign: 'center' }}>
              {authProvider === 'twitch' && '🟣 via Twitch'}
              {authProvider === 'google' && '🔵 via Google'}
              {authProvider === 'discord' && '🟣 via Discord'}
              {authProvider === 'email' && '📧 Email login'}
            </span>
          </div>

          {/* Name + Motto */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={S.label}>Display Name</label>
              <input style={S.input} value={profile.streamerName} onChange={e => set('streamerName', e.target.value)}
                placeholder="Your streamer name" />
            </div>
            <div>
              <label style={S.label}>Motto / Tagline</label>
              <input style={S.input} value={profile.motto} onChange={e => set('motto', e.target.value)}
                placeholder="Your catchphrase or tagline" />
            </div>
          </div>
        </div>

        <div>
          <label style={S.label}>Avatar URL</label>
          <input style={S.input} value={profile.avatarUrl} onChange={e => set('avatarUrl', e.target.value)}
            placeholder="https://..." />
          <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 3, display: 'block' }}>
            Auto-filled from your login — or paste a custom URL
          </span>
        </div>
      </div>

      {/* ──── Connected Accounts ──── */}
      <div style={S.card}>
        <div style={S.cardTitle}>🔗 Connected Accounts</div>
        <p style={S.cardDesc}>
          Link your streaming platforms. These sync to Chat, Giveaway, and Navbar widgets.
        </p>

        {/* Twitch */}
        <div style={profile.twitchUsername ? S.connected : S.notConnected}>
          <div style={S.dot(!!profile.twitchUsername)} />
          <span style={S.platformName}>🟣 Twitch</span>
          {profile.twitchUsername ? (
            <span style={S.platformUser}>{profile.twitchUsername}</span>
          ) : (
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Not connected</span>
          )}
        </div>
        <div>
          <label style={S.label}>Twitch Username</label>
          <input style={S.input} value={profile.twitchUsername} onChange={e => set('twitchUsername', e.target.value)}
            placeholder="your_twitch_name" />
        </div>

        {/* Kick */}
        <div style={profile.kickChannel ? S.connected : S.notConnected}>
          <div style={S.dot(!!profile.kickChannel)} />
          <span style={S.platformName}>🟢 Kick</span>
          {profile.kickChannel ? (
            <span style={S.platformUser}>{profile.kickChannel}</span>
          ) : (
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Not connected</span>
          )}
        </div>
        <div>
          <label style={S.label}>Kick Channel ID / Slug</label>
          <input style={S.input} value={profile.kickChannel} onChange={e => set('kickChannel', e.target.value)}
            placeholder="your_kick_channel" />
        </div>

        {/* YouTube */}
        <div style={profile.youtubeChannel ? S.connected : S.notConnected}>
          <div style={S.dot(!!profile.youtubeChannel)} />
          <span style={S.platformName}>🔴 YouTube</span>
          {profile.youtubeChannel ? (
            <span style={S.platformUser}>{profile.youtubeChannel}</span>
          ) : (
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Not connected</span>
          )}
        </div>
        <div style={S.row}>
          <div>
            <label style={S.label}>YouTube Video / Live ID</label>
            <input style={S.input} value={profile.youtubeChannel} onChange={e => set('youtubeChannel', e.target.value)}
              placeholder="dQw4w9WgXcQ" />
          </div>
          <div>
            <label style={S.label}>YouTube API Key</label>
            <input style={S.input} type="password" value={profile.youtubeApiKey} onChange={e => set('youtubeApiKey', e.target.value)}
              placeholder="AIza..." />
          </div>
        </div>

        {/* Discord */}
        <div style={profile.discordTag ? S.connected : S.notConnected}>
          <div style={S.dot(!!profile.discordTag)} />
          <span style={S.platformName}>🔵 Discord</span>
          {profile.discordTag ? (
            <span style={S.platformUser}>{profile.discordTag}</span>
          ) : (
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Not connected</span>
          )}
        </div>
        <div>
          <label style={S.label}>Discord Tag</label>
          <input style={S.input} value={profile.discordTag} onChange={e => set('discordTag', e.target.value)}
            placeholder="username#0000 or username" />
        </div>
      </div>

      {/* ──── Preferences ──── */}
      <div style={S.card}>
        <div style={S.cardTitle}>⚙️ Preferences</div>
        <p style={S.cardDesc}>Default settings applied when syncing.</p>

        <div style={S.row}>
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
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.5 }}>
              <strong style={{ color: '#fff' }}>{connectedPlatforms.length}</strong> platform{connectedPlatforms.length !== 1 ? 's' : ''} connected
            </div>
          </div>
        </div>
      </div>

      {/* ──── Sync Overview ──── */}
      <div style={S.card}>
        <div style={S.cardTitle}>📡 Widget Sync</div>
        <p style={S.cardDesc}>
          Push your profile data to all compatible widgets. This updates the Navbar, Chat, and Giveaway widget configs.
        </p>

        {/* Show which widgets will be updated */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(widgets || []).filter(w => SYNC_MAP[w.widget_type]).map(w => {
            const map = SYNC_MAP[w.widget_type];
            const fields = Object.entries(map)
              .filter(([pk]) => profile[pk])
              .map(([, ck]) => ck);
            return (
              <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', padding: '6px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '0.9rem' }}>
                  {w.widget_type === 'navbar' ? '📊' : w.widget_type === 'chat' ? '💬' : '🎁'}
                </span>
                <span style={{ color: '#fff', fontWeight: 600, flex: 1, textTransform: 'capitalize' }}>{w.widget_type.replace('_', ' ')}</span>
                <span style={{ color: '#64748b', fontSize: '0.72rem' }}>
                  {fields.length > 0 ? fields.join(', ') : 'no matching data'}
                </span>
              </div>
            );
          })}
          {(widgets || []).filter(w => SYNC_MAP[w.widget_type]).length === 0 && (
            <div style={{ color: '#64748b', fontSize: '0.82rem', textAlign: 'center', padding: 12 }}>
              Add a Navbar, Chat, or Giveaway widget to enable sync
            </div>
          )}
        </div>

        <button
          style={{ ...S.btn, ...S.btnSync, opacity: saving ? 0.6 : 1 }}
          onClick={handleSyncAll}
          disabled={saving}
        >
          {saving ? '⏳ Syncing...' : '📡 Sync Profile to All Widgets'}
        </button>

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
    </div>
  );
}
