import React from 'react';

export default function RecentWinsWidget({ config }) {
  const c = config || {};
  const wins = c.wins || [];

  return (
    <div className="overlay-recent-wins">
      <div className="overlay-recent-wins-title">Recent Wins</div>
      {wins.length === 0 && <div className="overlay-recent-wins-empty">No wins yet</div>}
      {wins.slice(0, c.maxDisplay || 5).map((w, i) => (
        <div key={i} className="overlay-recent-win">
          <span className="overlay-recent-win-slot">{w.slot || 'Unknown'}</span>
          <span className="overlay-recent-win-amount">{c.currency || '€'}{(w.amount || 0).toLocaleString()}</span>
          <span className="overlay-recent-win-multi">{(w.multi || 0).toFixed(2)}x</span>
        </div>
      ))}
    </div>
  );
}
