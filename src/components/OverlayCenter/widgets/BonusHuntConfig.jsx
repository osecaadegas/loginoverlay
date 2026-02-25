import React from 'react';

export default function BonusHuntConfig({ config, onChange }) {
  const c = config || {};
  const set = (key, val) => onChange({ ...c, [key]: val });

  return (
    <div className="oc-config-form">
      <label className="oc-config-field">
        <span>Currency</span>
        <input value={c.currency || '€'} onChange={e => set('currency', e.target.value)} />
      </label>
      <label className="oc-config-field oc-config-toggle">
        <span>Hunt Active</span>
        <input type="checkbox" checked={!!c.huntActive} onChange={e => set('huntActive', e.target.checked)} />
      </label>
      <label className="oc-config-field">
        <span>Total Cost</span>
        <input type="number" value={c.totalCost || 0} onChange={e => set('totalCost', +e.target.value)} />
      </label>
      <label className="oc-config-field">
        <span>Total Payout</span>
        <input type="number" value={c.totalPayout || 0} onChange={e => set('totalPayout', +e.target.value)} />
      </label>
      <p className="oc-config-hint">
        Bonuses are managed via the Bonus Hunt panel or API.
      </p>
    </div>
  );
}
