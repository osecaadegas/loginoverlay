export default function WheelOfNamesWidget({ overlay, updateSettings }) {
  return (
    <div className="widget-card">
      <div className="widget-card-header">
        <h3>🎡 Wheel of Names</h3>
        <label className="toggle-switch">
          <input 
            type="checkbox" 
            checked={overlay.settings.widgets?.wheelOfNames?.enabled ?? false}
            onChange={(e) => {
              const newSettings = {
                ...overlay.settings,
                widgets: {
                  ...overlay.settings.widgets,
                  wheelOfNames: {
                    ...overlay.settings.widgets.wheelOfNames,
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
      <p className="widget-description">Spin the wheel to pick random viewers or prizes</p>
    </div>
  );
}
