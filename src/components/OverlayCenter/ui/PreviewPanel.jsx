import React from 'react';

export default function PreviewPanel({ title, subtitle, children, actions, className = '' }) {
  return (
    <section className={`oc-ui-preview-panel${className ? ` ${className}` : ''}`}>
      {(title || subtitle || actions) && (
        <div className="oc-ui-preview-panel__header">
          <div>
            {title && <h3>{title}</h3>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className="oc-ui-preview-panel__body">{children}</div>
    </section>
  );
}
