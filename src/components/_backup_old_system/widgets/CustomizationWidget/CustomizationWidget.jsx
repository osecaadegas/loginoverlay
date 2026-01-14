export default function CustomizationWidget({ overlay, updateSettings }) {
  return (
    <div className="widget-card">
      <div className="widget-card-header">
        <h3>🎨 Customization</h3>
        <label className="toggle-switch">
          <input 
            type="checkbox" 
            checked={overlay.settings.widgets?.customization?.enabled ?? false}
            onChange={(e) => {
              const newSettings = {
                ...overlay.settings,
                widgets: {
                  ...overlay.settings.widgets,
                  customization: {
                    ...overlay.settings.widgets.customization,
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
      <p className="widget-description">Custom widget with personalized content and styling</p>
    </div>
  );
}
