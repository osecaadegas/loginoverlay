import React from 'react';
import StatusBadge from './StatusBadge';

export default function AssetCard({
  icon,
  title,
  description,
  category,
  tags = [],
  status,
  statusTone = 'neutral',
  meta,
  preview,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
  active = false,
  disabled = false,
  className = '',
}) {
  return (
    <article className={`oc-ui-asset-card${active ? ' oc-ui-asset-card--active' : ''}${className ? ` ${className}` : ''}`}>
      <div className="oc-ui-asset-card__preview">
        {preview || <span className="oc-ui-asset-card__icon">{icon || 'Box'}</span>}
        {status && <StatusBadge tone={statusTone} className="oc-ui-asset-card__status">{status}</StatusBadge>}
      </div>
      <div className="oc-ui-asset-card__body">
        <div className="oc-ui-asset-card__heading">
          <div>
            {category && <span className="oc-ui-asset-card__category">{category}</span>}
            <h3>{title}</h3>
          </div>
        </div>
        {description && <p>{description}</p>}
        {(tags.length > 0 || meta) && (
          <div className="oc-ui-asset-card__meta">
            {tags.slice(0, 4).map(tag => <span key={tag}>{tag}</span>)}
            {meta && <span>{meta}</span>}
          </div>
        )}
      </div>
      <div className="oc-ui-asset-card__actions">
        {secondaryLabel && (
          <button type="button" className="oc-ui-btn oc-ui-btn--ghost" onClick={onSecondary}>
            {secondaryLabel}
          </button>
        )}
        {primaryLabel && (
          <button type="button" className="oc-ui-btn oc-ui-btn--primary" onClick={onPrimary} disabled={disabled}>
            {primaryLabel}
          </button>
        )}
      </div>
    </article>
  );
}
