import React from 'react';
import MetricCard from './MetricCard';

export default function PageHero({
  eyebrow,
  title,
  description,
  note,
  metrics = [],
  actions,
  children,
  compact = false,
  className = '',
}) {
  return (
    <section className={`oc-ui-hero${compact ? ' oc-ui-hero--compact' : ''}${className ? ` ${className}` : ''}`}>
      <div className="oc-ui-hero__copy">
        {eyebrow && <span className="oc-ui-eyebrow">{eyebrow}</span>}
        {title && <h2 className="oc-ui-hero__title">{title}</h2>}
        {description && <p className="oc-ui-hero__description">{description}</p>}
        {note && <p className="oc-ui-hero__note">{note}</p>}
        {actions && <div className="oc-ui-hero__actions">{actions}</div>}
      </div>
      {(metrics.length > 0 || children) && (
        <div className="oc-ui-hero__side">
          {metrics.length > 0 && (
            <div className="oc-ui-metric-grid">
              {metrics.map((metric, index) => (
                <MetricCard key={metric.key || metric.label || index} {...metric} />
              ))}
            </div>
          )}
          {children}
        </div>
      )}
    </section>
  );
}
