/**
 * BonusHuntPage.jsx — Standalone Bonus Hunt setup page.
 * Reuses BonusHuntConfig from the Overlay Center.
 * Auto-creates a bonus_hunt widget if one doesn't exist.
 */
import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useOverlay } from '../../hooks/useOverlay';
import BonusHuntConfig from '../OverlayCenter/widgets/BonusHuntConfig';
import BonusHuntLibrary from '../OverlayCenter/BonusHuntLibrary';
import '../OverlayCenter/OverlayCenter.css';
import './BonusHuntPage.css';

// Ensure bonus_hunt widget def is registered
import '../OverlayCenter/widgets/builtinWidgets';

export default function BonusHuntPage() {
  const { user } = useAuth();
  const { widgets, saveWidget, addWidget, loading, instance } = useOverlay();
  const [activeTab, setActiveTab] = useState('setup');
  const [creating, setCreating] = useState(false);

  // Find the bonus_hunt widget
  const bhWidget = widgets.find(w => w.widget_type === 'bonus_hunt');

  // Auto-create bonus_hunt widget if it doesn't exist
  useEffect(() => {
    if (!loading && !bhWidget && user && instance && !creating) {
      setCreating(true);
      addWidget('bonus_hunt').finally(() => setCreating(false));
    }
  }, [loading, bhWidget, user, instance, creating, addWidget]);

  const handleConfigChange = useCallback((newConfig) => {
    if (!bhWidget) return;
    saveWidget({ ...bhWidget, config: newConfig });
  }, [bhWidget, saveWidget]);

  if (!user) {
    return (
      <div className="bh-page">
        <div className="bh-page-empty">
          <h2>🎯 Bonus Hunt</h2>
          <p>Please log in to manage your bonus hunts.</p>
        </div>
      </div>
    );
  }

  if (loading || creating) {
    return (
      <div className="bh-page">
        <div className="bh-page-loading">
          <div className="bh-page-spinner" />
          <p>Loading Bonus Hunt...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bh-page">
      <div className="bh-page-header">
        <h1 className="bh-page-title">🎯 Bonus Hunt</h1>
        <p className="bh-page-subtitle">Manage your bonus hunt sessions, add bonuses, and track results</p>
      </div>

      <div className="bh-page-tabs">
        <button
          className={`bh-page-tab ${activeTab === 'setup' ? 'bh-page-tab--active' : ''}`}
          onClick={() => setActiveTab('setup')}
        >
          ⚙️ Setup & Control
        </button>
        <button
          className={`bh-page-tab ${activeTab === 'history' ? 'bh-page-tab--active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📚 Hunt History
        </button>
      </div>

      <div className="bh-page-content">
        {activeTab === 'setup' && bhWidget && (
          <BonusHuntConfig
            config={bhWidget.config || {}}
            onChange={handleConfigChange}
            allWidgets={widgets}
          />
        )}
        {activeTab === 'history' && (
          <BonusHuntLibrary />
        )}
      </div>
    </div>
  );
}
