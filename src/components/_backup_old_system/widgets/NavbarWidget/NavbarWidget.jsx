import { useState } from 'react';

export default function NavbarWidget({ overlay, updateSettings }) {
  const [showModal, setShowModal] = useState(false);
  const [streamerName, setStreamerName] = useState(overlay.settings.widgets?.navbar?.streamerName || '');
  const [motto, setMotto] = useState(overlay.settings.widgets?.navbar?.motto || '');
  const [selectedMode, setSelectedMode] = useState(overlay.settings.widgets?.navbar?.mode || 'Raw');

  const saveSettings = () => {
    const newSettings = {
      ...overlay.settings,
      widgets: {
        ...overlay.settings.widgets,
        navbar: {
          ...overlay.settings.widgets.navbar,
          streamerName,
          motto,
          mode: selectedMode
        }
      }
    };
    updateSettings(newSettings);
    setShowModal(false);
  };

  return (
    <>
      <div className="widget-card">
        <div className="widget-card-header">
          <h3>📊 Navbar</h3>
          <label className="toggle-switch">
            <input 
              type="checkbox" 
              checked={overlay.settings.widgets?.navbar?.enabled ?? false}
              onChange={(e) => {
                const newSettings = {
                  ...overlay.settings,
                  widgets: {
                    ...overlay.settings.widgets,
                    navbar: {
                      ...overlay.settings.widgets.navbar,
                      enabled: e.target.checked
                    }
                  }
                };
                updateSettings(newSettings);
              }}
            />
            <span className="slider"></span>
          </label>
        </div>
        <p className="widget-description">Navigation bar with stream information and links</p>
        {overlay.settings.widgets?.navbar?.enabled && (
          <button className="widget-configure-btn" onClick={() => setShowModal(true)}>
            ⚙️ Configure Navbar
          </button>
        )}
      </div>

      {showModal && (
        <>
          <div className="modal-overlay-transparent" onClick={() => setShowModal(false)}></div>
          <div className="modal-content modal-draggable">
            <div className="modal-header">
              <h2>📊 Configure Navbar</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="form-section">
                <h3>Streamer Name</h3>
                <input 
                  type="text"
                  className="text-input"
                  value={streamerName}
                  onChange={(e) => setStreamerName(e.target.value)}
                  placeholder="Enter your Twitch username"
                />
              </div>

              <div className="form-section">
                <h3>Motto / Tagline</h3>
                <input 
                  type="text"
                  className="text-input"
                  value={motto}
                  onChange={(e) => setMotto(e.target.value)}
                  placeholder="Enter your motto or tagline"
                />
              </div>

              <div className="form-section">
                <h3>Display Mode</h3>
                <div className="mode-options">
                  {['Raw', 'Wager', 'Balance', 'Tournament'].map((mode) => (
                    <label key={mode} className="mode-option">
                      <input 
                        type="radio"
                        name="navbar-mode"
                        value={mode}
                        checked={selectedMode === mode}
                        onChange={(e) => setSelectedMode(e.target.value)}
                      />
                      <span className="mode-label">{mode}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="modal-save-btn" onClick={saveSettings}>Save Settings</button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
