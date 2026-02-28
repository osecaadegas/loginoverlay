import React from 'react';

export default function SlotmachineWidget({ config }) {
  const c = config || {};
  return (
    <div className={`overlay-slotmachine ${c.spinning ? 'is-spinning' : ''}`} style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <div className="overlay-slotmachine-reels">
        {(c.reels || ['🍒', '🍒', '🍒']).map((sym, i) => (
          <div key={i} className="overlay-slotmachine-reel">{sym}</div>
        ))}
      </div>
      {c.label && <div className="overlay-slotmachine-label">{c.label}</div>}
    </div>
  );
}
