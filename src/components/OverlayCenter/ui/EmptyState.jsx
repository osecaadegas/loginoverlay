import React from 'react';

export default function EmptyState({ icon, title, children, actionLabel, onAction, className = '' }) {
  return (
    <div className={`oc-ui-empty${className ? ` ${className}` : ''}`}>
      {icon && <span className="oc-ui-empty__icon">{icon}</span>}
      {title && <h3 className="oc-ui-empty__title">{title}</h3>}
      {children && <div className="oc-ui-empty__text">{children}</div>}
      {actionLabel && (
        <button type="button" className="oc-ui-btn oc-ui-btn--primary" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
