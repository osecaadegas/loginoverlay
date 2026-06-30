import React from 'react';
import { NeonBadge } from './CosmicPrimitives';

export default function StatusBadge({ children, tone = 'neutral', className = '', title }) {
  return (
    <NeonBadge tone={tone} className={`oc-ui-status oc-ui-status--${tone}${className ? ` ${className}` : ''}`} title={title}>
      {children}
    </NeonBadge>
  );
}
