import React from 'react';

export default function TournamentConfig({ config, onChange }) {
  const c = config || {};
  const set = (key, val) => onChange({ ...c, [key]: val });

  return (
    <div className="oc-config-form">
      <label className="oc-config-field">
        <span>Title</span>
        <input value={c.title || ''} onChange={e => set('title', e.target.value)} placeholder="Tournament name" />
      </label>
      <label className="oc-config-field">
        <span>Prize</span>
        <input value={c.prize || ''} onChange={e => set('prize', e.target.value)} placeholder="€1,000" />
      </label>
      <label className="oc-config-field">
        <span>End Time (ISO)</span>
        <input type="datetime-local" value={c.endTime ? c.endTime.slice(0, 16) : ''} onChange={e => set('endTime', new Date(e.target.value).toISOString())} />
      </label>
      <p className="oc-config-hint">Entries can be added via API or extended config.</p>
    </div>
  );
}
