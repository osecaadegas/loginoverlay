import React from 'react';
import './MetricCard.css';

const MetricCard = ({ 
  label, 
  value, 
  change, 
  trend, 
  icon: Icon, 
  color = 'blue' 
}) => {
  const getTrendIcon = () => {
    if (trend === 'up') return '↑';
    if (trend === 'down') return '↓';
    return '→';
  };

  const getTrendClass = () => {
    if (trend === 'up') return 'trend-up';
    if (trend === 'down') return 'trend-down';
    return 'trend-neutral';
  };

  return (
    <div className={`metric-card metric-${color}`}>
      <div className="metric-header">
        {Icon && <Icon className="metric-icon" size={24} />}
        <span className="metric-label">{label}</span>
      </div>
      <div className="metric-value">{value}</div>
      {change && (
        <div className={`metric-change ${getTrendClass()}`}>
          <span className="trend-icon">{getTrendIcon()}</span>
          <span>{change}</span>
        </div>
      )}
    </div>
  );
};

export default MetricCard;
