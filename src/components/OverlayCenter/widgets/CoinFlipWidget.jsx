import React from 'react';

export default function CoinFlipWidget({ config }) {
  const c = config || {};
  return (
    <div className={`overlay-coinflip ${c.flipping ? 'is-flipping' : ''}`}>
      <div className="overlay-coinflip-coin">
        <div className="overlay-coinflip-face">{c.result === 'tails' ? 'T' : 'H'}</div>
      </div>
      {c.label && <div className="overlay-coinflip-label">{c.label}</div>}
    </div>
  );
}
