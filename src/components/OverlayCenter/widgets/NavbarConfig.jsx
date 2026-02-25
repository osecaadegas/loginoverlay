import React, { useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';

export default function NavbarConfig({ config, onChange }) {
  const c = config || {};
  const { user } = useAuth();
  const set = (key, val) => onChange({ ...c, [key]: val });

  // Twitch user data from Supabase auth metadata
  const isTwitch = user?.app_metadata?.provider === 'twitch';
  const twitchName = user?.user_metadata?.preferred_username || user?.user_metadata?.full_name || '';
  const twitchDisplayName = user?.user_metadata?.full_name || twitchName;
  const twitchAvatar = user?.user_metadata?.avatar_url || '';

  // Auto-fill streamer name from Twitch on first load if empty
  useEffect(() => {
    if (isTwitch && !c.streamerName && twitchDisplayName) {
      onChange({
        ...c,
        streamerName: twitchDisplayName,
        twitchUsername: twitchName,
        avatarUrl: twitchAvatar,
      });
    }
  }, [isTwitch, twitchDisplayName]);

  const syncFromTwitch = () => {
    if (!isTwitch) return;
    onChange({
      ...c,
      streamerName: twitchDisplayName,
      twitchUsername: twitchName,
      avatarUrl: twitchAvatar,
    });
  };

  return (
    <div className="oc-config-form">
      {isTwitch && (
        <div className="oc-twitch-info">
          {twitchAvatar && <img src={twitchAvatar} alt="" className="oc-twitch-avatar" />}
          <div className="oc-twitch-details">
            <span className="oc-twitch-name">{twitchDisplayName}</span>
            <span className="oc-twitch-badge">Twitch</span>
          </div>
          <button type="button" className="oc-btn oc-btn--sm oc-btn--primary" onClick={syncFromTwitch}>
            Sync
          </button>
        </div>
      )}
      {!isTwitch && (
        <p className="oc-config-hint" style={{ color: '#f59e0b' }}>
          Log in with Twitch to auto-fill your streamer name and avatar.
        </p>
      )}
      <label className="oc-config-field">
        <span>Streamer Name</span>
        <input value={c.streamerName || ''} onChange={e => set('streamerName', e.target.value)} placeholder="Your name" />
      </label>
      <label className="oc-config-field">
        <span>Avatar URL</span>
        <input value={c.avatarUrl || ''} onChange={e => set('avatarUrl', e.target.value)} placeholder="https://..." />
      </label>
      <label className="oc-config-field">
        <span>Motto</span>
        <input value={c.motto || ''} onChange={e => set('motto', e.target.value)} placeholder="Your motto" />
      </label>
      <label className="oc-config-field">
        <span>Display Mode</span>
        <select value={c.displayMode || 'raw'} onChange={e => set('displayMode', e.target.value)}>
          <option value="raw">Raw</option>
          <option value="wager">Wager</option>
          <option value="balance">Balance</option>
          <option value="tournament">Tournament</option>
        </select>
      </label>
    </div>
  );
}
