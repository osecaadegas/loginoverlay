import React from 'react';
import './SeverityBadge.css';

const SeverityBadge = ({ severity, size = 'md' }) => {
  const icons = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🔵',
    safe: '🟢'
  };

  const labels = {
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    safe: 'Safe'
  };

  return (
    <span className={`severity-badge severity-${severity} severity-${size}`}>
      <span className="severity-icon">{icons[severity]}</span>
      <span className="severity-label">{labels[severity]}</span>
    </span>
  );
};

export default SeverityBadge;
