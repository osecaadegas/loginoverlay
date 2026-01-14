export default function RandomSlotPickerWidget({ overlay, updateSettings }) {
  return (
    <div className="widget-card">
      <div className="widget-card-header">
        <h3>🎲 Random Slot Picker</h3>
        <label className="toggle-switch">
          <input 
            type="checkbox" 
            checked={overlay.settings.widgets?.randomSlotPicker?.enabled ?? false}
            onChange={(e) => {
              const newSettings = {
                ...overlay.settings,
                widgets: {
                  ...overlay.settings.widgets,
                  randomSlotPicker: {
                    ...overlay.settings.widgets.randomSlotPicker,
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
      <p className="widget-description">Randomly select a slot game to play next</p>
    </div>
  );
}
