import React from 'react';

export default function DashboardPageShell({ children, className = '', dataTour, compact = false }) {
  return (
    <div
      className={`oc-ui-page${compact ? ' oc-ui-page--compact' : ''}${className ? ` ${className}` : ''}`}
      data-tour={dataTour}
    >
      <div className="oc-ui-page-shell">{children}</div>
    </div>
  );
}
