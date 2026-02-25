import React, { useState, useEffect } from 'react';

export default function TournamentWidget({ config, theme }) {
  const c = config || {};
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!c.endTime) return;
    const tick = () => {
      const diff = new Date(c.endTime) - Date.now();
      if (diff <= 0) { setTimeLeft('Ended'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [c.endTime]);

  return (
    <div className="oc-widget-inner oc-tournament">
      <h3 className="oc-widget-title">🏆 {c.title || 'Tournament'}</h3>
      {c.prize && <div className="oc-tour-prize">Prize: {c.prize}</div>}
      {c.endTime && <div className="oc-tour-timer">{timeLeft}</div>}
      {(c.entries || []).length > 0 && (
        <div className="oc-tour-list">
          {(c.entries || []).slice(0, 10).map((e, i) => (
            <div key={i} className="oc-tour-entry">
              <span className="oc-tour-rank">#{i + 1}</span>
              <span className="oc-tour-name">{e.name}</span>
              <span className="oc-tour-score">{e.score}</span>
            </div>
          ))}
        </div>
      )}
      {!c.title && (c.entries || []).length === 0 && (
        <p className="oc-widget-empty">No active tournament</p>
      )}
    </div>
  );
}
