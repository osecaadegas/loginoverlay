import React from 'react';

export default function GiveawayWidget({ config, theme }) {
  const c = config || {};

  return (
    <div className="oc-widget-inner oc-giveaway">
      <h3 className="oc-widget-title">🎁 {c.title || 'Giveaway'}</h3>
      {c.prize && <div className="oc-give-prize">{c.prize}</div>}
      {c.isActive && c.keyword && (
        <div className="oc-give-keyword">
          Type <strong>!{c.keyword}</strong> in chat to enter
        </div>
      )}
      {c.winner && (
        <div className="oc-give-winner">
          🎉 Winner: <strong>{c.winner}</strong>
        </div>
      )}
      {!c.isActive && !c.winner && (
        <p className="oc-widget-empty">No active giveaway</p>
      )}
    </div>
  );
}
