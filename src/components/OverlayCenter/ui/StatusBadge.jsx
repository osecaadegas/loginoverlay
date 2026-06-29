import React from 'react';

export default function StatusBadge({ children, tone = 'neutral', className = '', title }) {
  return (
    <span className={`oc-ui-status oc-ui-status--${tone}${className ? ` ${className}` : ''}`} title={title}>
      {children}
    </span>
  );
}
