import React from 'react';

export default function PlaceholderWidget({ config }) {
  const c = config || {};
  return (
    <div className="oc-widget-inner oc-placeholder" style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      {c.html ? (
        <div dangerouslySetInnerHTML={{ __html: c.html }} />
      ) : (
        <div className="oc-widget-empty">Empty widget — configure content</div>
      )}
    </div>
  );
}
