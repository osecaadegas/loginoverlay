import React from 'react';

export default function NavbarConfig({ config, onChange }) {
  const c = config || {};
  const set = (key, val) => onChange({ ...c, [key]: val });

  return (
    <div className="oc-config-form">
      <label className="oc-config-field">
        <span>Streamer Name</span>
        <input value={c.streamerName || ''} onChange={e => set('streamerName', e.target.value)} placeholder="Your name" />
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
