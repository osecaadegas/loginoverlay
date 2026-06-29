import React from 'react';

export default function MetricCard({ label, value, meta, icon, tone = 'default', className = '' }) {
  return (
    <div className={`oc-ui-metric oc-ui-metric--${tone}${className ? ` ${className}` : ''}`}>
      <div className="oc-ui-metric__top">
        {icon && <span className="oc-ui-metric__icon">{icon}</span>}
        <span className="oc-ui-metric__label">{label}</span>
      </div>
      <strong className="oc-ui-metric__value">{value}</strong>
      {meta && <span className="oc-ui-metric__meta">{meta}</span>}
    </div>
  );
}
