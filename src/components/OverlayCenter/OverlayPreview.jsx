/**
 * OverlayPreview.jsx — Embedded live preview of the overlay.
 */
import React from 'react';

export default function OverlayPreview({ overlayUrl }) {
  return (
    <div className="oc-preview-panel">
      <div className="oc-panel-header">
        <h2 className="oc-panel-title">👁️ Live Preview</h2>
        <a href={overlayUrl} target="_blank" rel="noopener noreferrer" className="oc-btn oc-btn--sm">
          Open in new tab ↗
        </a>
      </div>
      <div className="oc-preview-frame-wrap">
        <div className="oc-preview-frame-label">1920 × 1080</div>
        <iframe
          src={overlayUrl}
          className="oc-preview-iframe"
          title="Overlay Preview"
          style={{ aspectRatio: '16/9', width: '100%', border: 'none', borderRadius: 8 }}
        />
      </div>
      <p className="oc-preview-hint">
        This is a live preview. Changes you make in Widgets and Theme panels update here in real-time.
      </p>
    </div>
  );
}
