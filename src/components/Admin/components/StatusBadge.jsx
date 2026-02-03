import React from 'react';
import './StatusBadge.css';

const StatusBadge = ({ status, size = 'md' }) => {
  const config = {
    new: { label: 'New', color: 'yellow', icon: '●' },
    investigating: { label: 'Investigating', color: 'blue', icon: '●' },
    resolved: { label: 'Resolved', color: 'green', icon: '●' },
    dismissed: { label: 'Dismissed', color: 'gray', icon: '●' },
    'auto-actioned': { label: 'Auto-Banned', color: 'purple', icon: '●' },
    active: { label: 'Active', color: 'green', icon: '●' },
    online: { label: 'Online', color: 'green', icon: '●' },
    offline: { label: 'Offline', color: 'gray', icon: '●' },
    flagged: { label: 'Flagged', color: 'yellow', icon: '🚩' },
    banned: { label: 'Banned', color: 'red', icon: '🚫' },
  };

  const { label, color, icon } = config[status] || { label: status, color: 'gray', icon: '●' };

  return (
    <span className={`status-badge status-${color} status-${size}`}>
      <span className="status-dot">{icon}</span>
      <span className="status-label">{label}</span>
    </span>
  );
};

export default StatusBadge;
