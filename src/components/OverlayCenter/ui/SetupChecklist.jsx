import React from 'react';

export default function SetupChecklist({ items = [], title = 'Setup checklist', className = '' }) {
  if (!items.length) return null;
  return (
    <div className={`oc-ui-checklist${className ? ` ${className}` : ''}`}>
      <div className="oc-ui-checklist__title">{title}</div>
      {items.map((item, index) => (
        <div key={item.key || item.title || index} className={`oc-ui-checklist__item${item.ready ? ' oc-ui-checklist__item--ready' : ''}`}>
          <span className="oc-ui-checklist__dot">{item.ready ? 'Done' : index + 1}</span>
          <div>
            <strong>{item.title}</strong>
            {item.detail && <span>{item.detail}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
