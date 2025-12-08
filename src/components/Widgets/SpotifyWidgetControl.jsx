import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../config/supabaseClient';
import './SpotifyWidgetControl.css';

export default function SpotifyWidgetControl() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    enabled: false,
    position: 'bottom-left',
    opacity: 1,
    scale: 1
  });
  const [saved, setSaved] = useState(false);

  const widgetUrl = `${window.location.origin}/widgets/spotify/${user?.id}`;

  useEffect(() => {
    if (!user) return;

    const loadSettings = async () => {
      const { data } = await supabase
        .from('widget_settings')
        .select('*')
        .eq('user_id', user.id)
        .eq('widget_type', 'spotify')
        .single();

      if (data) {
        setSettings(data.settings);
      }
    };

    loadSettings();
  }, [user]);

  const saveSettings = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('widget_settings')
      .upsert({
        user_id: user.id,
        widget_type: 'spotify',
        settings: settings,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,widget_type'
      });

    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(widgetUrl);
    alert('Widget URL copied to clipboard!');
  };

  return (
    <div className="widget-control-page">
      <div className="widget-control-header">
        <button className="back-button" onClick={() => navigate('/overlay/widgets')}>
          ← Back to Widgets
        </button>
        <h1>Spotify Widget</h1>
      </div>

      <div className="widget-control-content">
        <div className="widget-url-section">
          <h3>Widget URL for OBS</h3>
          <p>Add this URL as a Browser Source in OBS:</p>
          <div className="url-box">
            <input type="text" value={widgetUrl} readOnly />
            <button onClick={copyUrl}>Copy</button>
          </div>
          <div className="obs-instructions">
            <h4>How to add to OBS:</h4>
            <ol>
              <li>Open OBS Studio</li>
              <li>Click the + icon in Sources</li>
              <li>Select "Browser"</li>
              <li>Paste the URL above</li>
              <li>Set Width: 1920, Height: 1080</li>
              <li>Check "Shutdown source when not visible"</li>
            </ol>
          </div>
        </div>

        <div className="widget-settings-section">
          <h3>Widget Settings</h3>
          
          <div className="setting-group">
            <label>
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => setSettings({...settings, enabled: e.target.checked})}
              />
              Enable Widget
            </label>
          </div>

          <div className="setting-group">
            <label>Position</label>
            <select 
              value={settings.position}
              onChange={(e) => setSettings({...settings, position: e.target.value})}
            >
              <option value="top-left">Top Left</option>
              <option value="top-right">Top Right</option>
              <option value="bottom-left">Bottom Left</option>
              <option value="bottom-right">Bottom Right</option>
            </select>
          </div>

          <div className="setting-group">
            <label>Opacity: {settings.opacity}</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.opacity}
              onChange={(e) => setSettings({...settings, opacity: parseFloat(e.target.value)})}
            />
          </div>

          <div className="setting-group">
            <label>Scale: {settings.scale}x</label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={settings.scale}
              onChange={(e) => setSettings({...settings, scale: parseFloat(e.target.value)})}
            />
          </div>

          <button className="save-button" onClick={saveSettings}>
            {saved ? '✓ Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
