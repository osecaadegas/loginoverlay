export default function CoinFlipWidget({ overlay, updateSettings }) {
  return (
    <div className="widget-card">
      <div className="widget-card-header">
        <h3>🪙 CoinFlip</h3>
        <label className="toggle-switch">
          <input 
            type="checkbox" 
            checked={overlay.settings.widgets?.coinflip?.enabled ?? false}
            onChange={(e) => {
              const newSettings = {
                ...overlay.settings,
                widgets: {
                  ...overlay.settings.widgets,
                  coinflip: {
                    ...overlay.settings.widgets.coinflip,
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
      <p className="widget-description">Interactive coin flip game for viewer engagement</p>
    </div>
  );
}
