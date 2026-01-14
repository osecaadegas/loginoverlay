import React from 'react';

export default function StylesTab({ overlay, updateSettings }) {
  return (
    <div className="tab-content">
      <div className="styles-content">
        {/* Global Theme Settings */}
        <div className="style-section">
          <h3>🌍 Global Theme</h3>
          <p className="section-description">Apply colors across all widgets</p>
          <div className="theme-controls">
            <div className="color-picker">
              <label>Primary Color</label>
              <input 
                type="color" 
                value={overlay.settings.theme?.primaryColor ?? '#d4af37'}
                onChange={(e) => {
                  const newSettings = {
                    ...overlay.settings,
                    theme: {
                      ...overlay.settings.theme,
                      primaryColor: e.target.value
                    }
                  };
                  updateSettings(newSettings);
                }}
              />
            </div>
          </div>
        </div>

        {/* Widget Style Presets */}
        <div className="style-section">
          <h3>🎯 Bonus Hunt Tracker</h3>
          <p className="section-description">Customize bonus hunt colors and appearance</p>
          <div className="widget-style-grid">
            <div className="color-picker">
              <label>Background Color</label>
              <input 
                type="color" 
                value={overlay.settings.widgetStyles?.bonusHunt?.backgroundColor ?? '#0f172a'}
                onChange={(e) => {
                  const newSettings = {
                    ...overlay.settings,
                    widgetStyles: {
                      ...overlay.settings.widgetStyles,
                      bonusHunt: {
                        ...overlay.settings.widgetStyles?.bonusHunt,
                        backgroundColor: e.target.value
                      }
                    }
                  };
                  updateSettings(newSettings);
                }}
              />
            </div>
            <div className="color-picker">
              <label>Accent Color</label>
              <input 
                type="color" 
                value={overlay.settings.widgetStyles?.bonusHunt?.accentColor ?? '#3b82f6'}
                onChange={(e) => {
                  const newSettings = {
                    ...overlay.settings,
                    widgetStyles: {
                      ...overlay.settings.widgetStyles,
                      bonusHunt: {
                        ...overlay.settings.widgetStyles?.bonusHunt,
                        accentColor: e.target.value
                      }
                    }
                  };
                  updateSettings(newSettings);
                }}
              />
            </div>
            <div className="color-picker">
              <label>Border Color</label>
              <input 
                type="color" 
                value={overlay.settings.widgetStyles?.bonusHunt?.borderColor ?? '#3b82f6'}
                onChange={(e) => {
                  const newSettings = {
                    ...overlay.settings,
                    widgetStyles: {
                      ...overlay.settings.widgetStyles,
                      bonusHunt: {
                        ...overlay.settings.widgetStyles?.bonusHunt,
                        borderColor: e.target.value
                      }
                    }
                  };
                  updateSettings(newSettings);
                }}
              />
            </div>
          </div>
        </div>

        <div className="style-section">
          <h3>📊 Session Stats</h3>
          <p className="section-description">Customize session stats appearance</p>
          <div className="widget-style-grid">
            <div className="color-picker">
              <label>Background Color</label>
              <input 
                type="color" 
                value={overlay.settings.widgetStyles?.sessionStats?.backgroundColor ?? '#1a1d23'}
                onChange={(e) => {
                  const newSettings = {
                    ...overlay.settings,
                    widgetStyles: {
                      ...overlay.settings.widgetStyles,
                      sessionStats: {
                        ...overlay.settings.widgetStyles?.sessionStats,
                        backgroundColor: e.target.value
                      }
                    }
                  };
                  updateSettings(newSettings);
                }}
              />
            </div>
            <div className="color-picker">
              <label>Text Color</label>
              <input 
                type="color" 
                value={overlay.settings.widgetStyles?.sessionStats?.textColor ?? '#ffffff'}
                onChange={(e) => {
                  const newSettings = {
                    ...overlay.settings,
                    widgetStyles: {
                      ...overlay.settings.widgetStyles,
                      sessionStats: {
                        ...overlay.settings.widgetStyles?.sessionStats,
                        textColor: e.target.value
                      }
                    }
                  };
                  updateSettings(newSettings);
                }}
              />
            </div>
            <div className="color-picker">
              <label>Highlight Color</label>
              <input 
                type="color" 
                value={overlay.settings.widgetStyles?.sessionStats?.highlightColor ?? '#d4af37'}
                onChange={(e) => {
                  const newSettings = {
                    ...overlay.settings,
                    widgetStyles: {
                      ...overlay.settings.widgetStyles,
                      sessionStats: {
                        ...overlay.settings.widgetStyles?.sessionStats,
                        highlightColor: e.target.value
                      }
                    }
                  };
                  updateSettings(newSettings);
                }}
              />
            </div>
          </div>
        </div>

        <div className="style-section">
          <h3>🎁 Recent Wins</h3>
          <p className="section-description">Customize recent wins widget colors</p>
          <div className="widget-style-grid">
            <div className="color-picker">
              <label>Background Color</label>
              <input 
                type="color" 
                value={overlay.settings.widgetStyles?.recentWins?.backgroundColor ?? '#1a1d23'}
                onChange={(e) => {
                  const newSettings = {
                    ...overlay.settings,
                    widgetStyles: {
                      ...overlay.settings.widgetStyles,
                      recentWins: {
                        ...overlay.settings.widgetStyles?.recentWins,
                        backgroundColor: e.target.value
                      }
                    }
                  };
                  updateSettings(newSettings);
                }}
              />
            </div>
            <div className="color-picker">
              <label>Win Color</label>
              <input 
                type="color" 
                value={overlay.settings.widgetStyles?.recentWins?.winColor ?? '#4ade80'}
                onChange={(e) => {
                  const newSettings = {
                    ...overlay.settings,
                    widgetStyles: {
                      ...overlay.settings.widgetStyles,
                      recentWins: {
                        ...overlay.settings.widgetStyles?.recentWins,
                        winColor: e.target.value
                      }
                    }
                  };
                  updateSettings(newSettings);
                }}
              />
            </div>
            <div className="color-picker">
              <label>Border Color</label>
              <input 
                type="color" 
                value={overlay.settings.widgetStyles?.recentWins?.borderColor ?? '#d4af37'}
                onChange={(e) => {
                  const newSettings = {
                    ...overlay.settings,
                    widgetStyles: {
                      ...overlay.settings.widgetStyles,
                      recentWins: {
                        ...overlay.settings.widgetStyles?.recentWins,
                        borderColor: e.target.value
                      }
                    }
                  };
                  updateSettings(newSettings);
                }}
              />
            </div>
          </div>
        </div>

        <div className="style-note">
          <p>💡 <strong>Note:</strong> Widget styling will be fully applied in a future update. These settings are saved but may not yet affect all widget appearances.</p>
        </div>
      </div>
    </div>
  );
}
