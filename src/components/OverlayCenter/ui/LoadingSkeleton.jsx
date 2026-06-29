import React from 'react';

export default function LoadingSkeleton({ cards = 6, className = '' }) {
  return (
    <div className={`oc-ui-skeleton-grid${className ? ` ${className}` : ''}`} aria-label="Loading">
      {Array.from({ length: cards }).map((_, index) => (
        <div key={index} className="oc-ui-skeleton-card">
          <span />
          <strong />
          <em />
        </div>
      ))}
    </div>
  );
}
