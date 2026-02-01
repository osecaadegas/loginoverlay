import React from 'react';
import './StatsCard.css';

/**
 * StatsCard - Modern stat display card
 */
export function StatsCard({ 
  value, 
  label, 
  icon, 
  trend, 
  trendValue,
  color = 'default',
  onClick,
}) {
  return (
    <div 
      className={`stats-card stats-card-${color} ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
    >
      {icon && <div className="stats-icon">{icon}</div>}
      <div className="stats-content">
        <div className="stats-value">{value}</div>
        <div className="stats-label">{label}</div>
      </div>
      {trend && (
        <div className={`stats-trend stats-trend-${trend}`}>
          {trend === 'up' ? '↑' : '↓'} {trendValue}
        </div>
      )}
    </div>
  );
}

/**
 * StatsGrid - Grid container for multiple stat cards
 */
export function StatsGrid({ children, columns = 4 }) {
  return (
    <div className="stats-grid" style={{ '--stats-columns': columns }}>
      {children}
    </div>
  );
}

export default StatsCard;
