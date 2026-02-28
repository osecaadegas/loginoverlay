import React from 'react';

export default function StatsWidget({ config, theme }) {
  const c = config || {};
  const currency = c.currency || '€';
  const profit = (c.totalWin || 0) - (c.totalBet || 0);
  const profitColor = profit >= 0 ? (theme?.accent_color || '#00e1ff') : '#ff6b6b';

  return (
    <div className="oc-widget-inner oc-stats" style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <h3 className="oc-widget-title">📊 Session Stats</h3>
      <div className="oc-stats-grid">
        <div className="oc-stat">
          <span className="oc-stat-label">Total Bet</span>
          <span className="oc-stat-value">{currency}{(c.totalBet || 0).toLocaleString()}</span>
        </div>
        <div className="oc-stat">
          <span className="oc-stat-label">Total Win</span>
          <span className="oc-stat-value">{currency}{(c.totalWin || 0).toLocaleString()}</span>
        </div>
        <div className="oc-stat">
          <span className="oc-stat-label">Highest Win</span>
          <span className="oc-stat-value">{currency}{(c.highestWin || 0).toLocaleString()}</span>
        </div>
        <div className="oc-stat">
          <span className="oc-stat-label">Highest Multi</span>
          <span className="oc-stat-value">{(c.highestMulti || 0).toFixed(1)}x</span>
        </div>
        <div className="oc-stat oc-stat--wide">
          <span className="oc-stat-label">Profit</span>
          <span className="oc-stat-value" style={{ color: profitColor }}>
            {profit >= 0 ? '+' : ''}{currency}{profit.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
