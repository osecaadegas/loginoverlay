import React from 'react';

export default function WheelOfNamesWidget({ config }) {
  const c = config || {};
  return (
    <div className={`overlay-wheel ${c.spinning ? 'is-spinning' : ''}`}>
      <div className="overlay-wheel-circle">
        {(c.entries || []).map((e, i) => (
          <div key={i} className="overlay-wheel-entry">{e}</div>
        ))}
      </div>
      {c.winner && <div className="overlay-wheel-winner">{c.winner}</div>}
    </div>
  );
}
