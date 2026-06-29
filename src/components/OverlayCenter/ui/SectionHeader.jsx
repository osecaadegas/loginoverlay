import React from 'react';

export default function SectionHeader({ eyebrow, title, description, pill, actions, className = '' }) {
  return (
    <div className={`oc-ui-section-header${className ? ` ${className}` : ''}`}>
      <div className="oc-ui-section-header__copy">
        {eyebrow && <span className="oc-ui-section-header__eyebrow">{eyebrow}</span>}
        {title && <h3 className="oc-ui-section-header__title">{title}</h3>}
        {description && <p className="oc-ui-section-header__description">{description}</p>}
      </div>
      {(pill || actions) && (
        <div className="oc-ui-section-header__aside">
          {pill && <span className="oc-ui-section-header__pill">{pill}</span>}
          {actions}
        </div>
      )}
    </div>
  );
}
