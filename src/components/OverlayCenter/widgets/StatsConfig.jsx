import React, { useState } from 'react';

export default function StatsConfig({ config, onChange }) {
  const c = config || {};
  const set = (key, val) => onChange({ ...c, [key]: val });

  return (
    <div className="oc-config-form">
      <label className="oc-config-field">
        <span>Currency Symbol</span>
        <input value={c.currency || '€'} onChange={e => set('currency', e.target.value)} />
      </label>
      <label className="oc-config-field">
        <span>Total Bet</span>
        <input type="number" value={c.totalBet || 0} onChange={e => set('totalBet', +e.target.value)} />
      </label>
      <label className="oc-config-field">
        <span>Total Win</span>
        <input type="number" value={c.totalWin || 0} onChange={e => set('totalWin', +e.target.value)} />
      </label>
      <label className="oc-config-field">
        <span>Highest Win</span>
        <input type="number" value={c.highestWin || 0} onChange={e => set('highestWin', +e.target.value)} />
      </label>
      <label className="oc-config-field">
        <span>Highest Multiplier</span>
        <input type="number" step="0.1" value={c.highestMulti || 0} onChange={e => set('highestMulti', +e.target.value)} />
      </label>
    </div>
  );
}
