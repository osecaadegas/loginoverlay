import React from 'react';

export default function GiveawayConfig({ config, onChange }) {
  const c = config || {};
  const set = (key, val) => onChange({ ...c, [key]: val });

  return (
    <div className="oc-config-form">
      <label className="oc-config-field">
        <span>Title</span>
        <input value={c.title || ''} onChange={e => set('title', e.target.value)} placeholder="Giveaway Title" />
      </label>
      <label className="oc-config-field">
        <span>Prize</span>
        <input value={c.prize || ''} onChange={e => set('prize', e.target.value)} placeholder="€500 Bonus" />
      </label>
      <label className="oc-config-field">
        <span>Chat Keyword</span>
        <input value={c.keyword || ''} onChange={e => set('keyword', e.target.value)} placeholder="giveaway" />
      </label>
      <label className="oc-config-field oc-config-toggle">
        <span>Active</span>
        <input type="checkbox" checked={!!c.isActive} onChange={e => set('isActive', e.target.checked)} />
      </label>
      <label className="oc-config-field">
        <span>Winner</span>
        <input value={c.winner || ''} onChange={e => set('winner', e.target.value)} placeholder="Leave empty until drawn" />
      </label>
    </div>
  );
}
