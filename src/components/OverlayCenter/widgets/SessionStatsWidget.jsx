import React from 'react';

export default function SessionStatsWidget({ config }) {
  const c = config || {};
  const stats = [
    { label: 'Wagered', value: `${c.currency || '€'}${(c.wagered || 0).toLocaleString()}` },
    { label: 'Won', value: `${c.currency || '€'}${(c.won || 0).toLocaleString()}` },
    { label: 'Profit', value: `${c.currency || '€'}${(c.profit || 0).toLocaleString()}` },
    { label: 'Best Win', value: `${c.currency || '€'}${(c.bestWin || 0).toLocaleString()}` },
    { label: 'Best Multi', value: `${(c.bestMulti || 0).toFixed(2)}x` },
    { label: 'Slots Played', value: c.slotsPlayed || 0 },
  ];

  return (
    <div className="overlay-session-stats">
      {stats.map(s => (
        <div key={s.label} className="overlay-session-stat">
          <div className="overlay-session-stat-label">{s.label}</div>
          <div className="overlay-session-stat-value">{s.value}</div>
        </div>
      ))}
    </div>
  );
}
