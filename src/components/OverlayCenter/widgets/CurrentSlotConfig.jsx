import React from 'react';

export default function CurrentSlotConfig({ config, onChange }) {
  const c = config || {};
  const set = (key, val) => onChange({ ...c, [key]: val });

  return (
    <div className="oc-config-form">
      <label className="oc-config-field">
        <span>Slot Name</span>
        <input value={c.slotName || ''} onChange={e => set('slotName', e.target.value)} placeholder="e.g. Sweet Bonanza" />
      </label>
      <label className="oc-config-field">
        <span>Provider</span>
        <input value={c.provider || ''} onChange={e => set('provider', e.target.value)} placeholder="e.g. Pragmatic Play" />
      </label>
      <label className="oc-config-field">
        <span>Bet Size</span>
        <input type="number" step="0.01" value={c.betSize || 0} onChange={e => set('betSize', +e.target.value)} />
      </label>
      <label className="oc-config-field">
        <span>RTP (%)</span>
        <input value={c.rtp || ''} onChange={e => set('rtp', e.target.value)} placeholder="96.50" />
      </label>
      <label className="oc-config-field">
        <span>Image URL</span>
        <input value={c.imageUrl || ''} onChange={e => set('imageUrl', e.target.value)} placeholder="https://..." />
      </label>
    </div>
  );
}
