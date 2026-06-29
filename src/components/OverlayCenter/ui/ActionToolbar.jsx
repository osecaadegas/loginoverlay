import React from 'react';

export default function ActionToolbar({ children, className = '', align = 'start' }) {
  return (
    <div className={`oc-ui-toolbar oc-ui-toolbar--${align}${className ? ` ${className}` : ''}`}>
      {children}
    </div>
  );
}
