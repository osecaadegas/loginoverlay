import React from 'react';

export default function ChatConfig({ config, onChange }) {
  const c = config || {};
  const set = (key, val) => onChange({ ...c, [key]: val });

  return (
    <div className="oc-config-form">
      <label className="oc-config-field">
        <span>Channel</span>
        <input value={c.channel || ''} onChange={e => set('channel', e.target.value)} placeholder="Twitch channel name" />
      </label>
      <label className="oc-config-field">
        <span>Max Messages</span>
        <input type="number" value={c.maxMessages || 15} onChange={e => set('maxMessages', parseInt(e.target.value) || 15)} min={1} max={50} />
      </label>
    </div>
  );
}
