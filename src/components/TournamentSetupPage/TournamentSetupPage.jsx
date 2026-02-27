/**
 * TournamentSetupPage.jsx — Standalone Tournament setup page.
 * Reuses TournamentConfig from the Overlay Center.
 * Auto-creates a tournament widget if one doesn't exist.
 */
import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useOverlay } from '../../hooks/useOverlay';
import TournamentConfig from '../OverlayCenter/widgets/TournamentConfig';
import '../OverlayCenter/OverlayCenter.css';
import './TournamentSetupPage.css';

// Ensure tournament widget def is registered
import '../OverlayCenter/widgets/builtinWidgets';

export default function TournamentSetupPage() {
  const { user } = useAuth();
  const { widgets, saveWidget, addWidget, loading, instance } = useOverlay();
  const [creating, setCreating] = useState(false);

  // Find the tournament widget
  const tournWidget = widgets.find(w => w.widget_type === 'tournament');

  // Auto-create tournament widget if it doesn't exist
  useEffect(() => {
    if (!loading && !tournWidget && user && instance && !creating) {
      setCreating(true);
      addWidget('tournament').finally(() => setCreating(false));
    }
  }, [loading, tournWidget, user, instance, creating, addWidget]);

  const handleConfigChange = useCallback((newConfig) => {
    if (!tournWidget) return;
    saveWidget({ ...tournWidget, config: newConfig });
  }, [tournWidget, saveWidget]);

  if (!user) {
    return (
      <div className="ts-page">
        <div className="ts-page-empty">
          <h2>🏆 Tournament Setup</h2>
          <p>Please log in to manage tournaments.</p>
        </div>
      </div>
    );
  }

  if (loading || creating) {
    return (
      <div className="ts-page">
        <div className="ts-page-loading">
          <div className="ts-page-spinner" />
          <p>Loading Tournament...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ts-page">
      <div className="ts-page-header">
        <h1 className="ts-page-title">🏆 Tournament Setup</h1>
        <p className="ts-page-subtitle">Configure brackets, players, slots, and styling for your tournament overlay</p>
      </div>

      <div className="ts-page-content">
        {tournWidget && (
          <TournamentConfig
            config={tournWidget.config || {}}
            onChange={handleConfigChange}
            allWidgets={widgets}
          />
        )}
      </div>
    </div>
  );
}
