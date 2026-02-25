import React from 'react';

export default function BonusHuntWidget({ config, theme }) {
  const c = config || {};
  const bonuses = c.bonuses || [];
  const currency = c.currency || '€';
  const multi = c.totalCost > 0 ? (c.totalPayout / c.totalCost).toFixed(2) : '0.00';

  return (
    <div className="oc-widget-inner oc-bonushunt">
      <h3 className="oc-widget-title">🎯 Bonus Hunt</h3>
      {c.huntActive && (
        <div className="oc-bh-summary">
          <span className="oc-bh-stat">
            <em>Cost</em> {currency}{(c.totalCost || 0).toLocaleString()}
          </span>
          <span className="oc-bh-stat">
            <em>Payout</em> {currency}{(c.totalPayout || 0).toLocaleString()}
          </span>
          <span className="oc-bh-stat oc-bh-multi">
            <em>Multi</em> {multi}x
          </span>
          <span className="oc-bh-stat">
            <em>Bonuses</em> {bonuses.length}
          </span>
        </div>
      )}
      {bonuses.length > 0 && (
        <div className="oc-bh-list">
          {bonuses.slice(-8).map((b, i) => (
            <div key={i} className={`oc-bh-row ${b.opened ? 'oc-bh-row--opened' : ''}`}>
              <span className="oc-bh-slot">{b.slotName || 'Unknown'}</span>
              <span className="oc-bh-bet">{currency}{b.betSize || 0}</span>
              {b.opened && <span className="oc-bh-payout">{currency}{(b.payout || 0).toLocaleString()}</span>}
            </div>
          ))}
        </div>
      )}
      {!c.huntActive && bonuses.length === 0 && (
        <p className="oc-widget-empty">No active bonus hunt</p>
      )}
    </div>
  );
}
