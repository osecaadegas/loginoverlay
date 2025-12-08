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
    scale: 1,
    layout: 'compact'
  });
  const [showPreview, setShowPreview] = useState(false);
  const [saved, setSaved] = useState(false);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  const widgetUrl = `${window.location.origin}/widgets/spotify/${user?.id}?layout=${settings.layout}`;
  const spotifyClientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
  const redirectUri = `${window.location.origin}/overlay/widgets/spotify`;

  useEffect(() => {
    if (!user) return;

    const loadSettings = async () => {
      // Load widget settings
      const { data } = await supabase
        .from('widget_settings')
        .select('*')
        .eq('user_id', user.id)
        .eq('widget_type', 'spotify')
        .single();

      if (data) {
        setSettings(data.settings);
      }

      // Check if Spotify is connected
      const { data: spotifyData } = await supabase
        .from('spotify_connections')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setSpotifyConnected(!!spotifyData);
      setLoading(false);
    };

    loadSettings();

    // Handle OAuth callback
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      handleSpotifyCallback(code);
    }
  }, [user]);

  const handleSpotifyCallback = async (code) => {
    try {
      // Exchange code for tokens
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(`${spotifyClientId}:${import.meta.env.VITE_SPOTIFY_CLIENT_SECRET}`)
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: redirectUri
        })
      });

      const data = await response.json();

      if (data.access_token) {
        // Save tokens to database
        const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
        
        await supabase
          .from('spotify_connections')
          .upsert({
            user_id: user.id,
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_at: expiresAt
          }, {
            onConflict: 'user_id'
          });

        setSpotifyConnected(true);
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (error) {
      console.error('Spotify auth error:', error);
      alert('Failed to connect Spotify. Please try again.');
    }
  };

  const connectSpotify = () => {
    const scopes = 'user-read-currently-playing user-read-playback-state';
    const authUrl = `https://accounts.spotify.com/authorize?` +
      `client_id=${spotifyClientId}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scopes)}`;
    
    window.location.href = authUrl;
  };

  const disconnectSpotify = async () => {
    await supabase
      .from('spotify_connections')
      .delete()
      .eq('user_id', user.id);
    
    setSpotifyConnected(false);
  };

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

  if (loading) {
    return <div className="widget-control-page">Loading...</div>;
  }

  return (
    <div className="widget-control-page">
      <div className="widget-control-header">
        <button className="back-button" onClick={() => navigate('/overlay/widgets')}>
          ← Back to Widgets
        </button>
        <h1>Spotify Widget</h1>
      </div>

      <div className="widget-control-content">
        {!spotifyConnected ? (
          <div className="spotify-connect-section">
            <h2>Connect Your Spotify Account</h2>
            <p>To display your currently playing track, you need to connect your Spotify account.</p>
            <button className="spotify-connect-btn" onClick={connectSpotify}>
              <svg viewBox="0 0 24 24" className="spotify-icon" xmlns="http://www.w3.org/2000/svg">
                <path fill="currentColor" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
              Connect Spotify
            </button>
          </div>
        ) : (
          <>
            <div className="spotify-connected-banner">
              <span>✓ Spotify Connected</span>
              <button className="disconnect-btn" onClick={disconnectSpotify}>Disconnect</button>
            </div>

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
            <label>Layout Style</label>
            <div className="layout-options">
              <button
                className={`layout-option ${settings.layout === 'compact' ? 'active' : ''}`}
                onClick={() => setSettings({...settings, layout: 'compact'})}
              >
                <div className="layout-preview compact-preview">
                  <div className="preview-album"></div>
                  <div className="preview-text">
                    <div className="preview-line"></div>
                    <div className="preview-line short"></div>
                  </div>
                </div>
                <span>Compact</span>
              </button>

              <button
                className={`layout-option ${settings.layout === 'minimal' ? 'active' : ''}`}
                onClick={() => setSettings({...settings, layout: 'minimal'})}
              >
                <div className="layout-preview minimal-preview">
                  <div className="preview-line"></div>
                  <div className="preview-line short"></div>
                </div>
                <span>Minimal</span>
              </button>

              <button
                className={`layout-option ${settings.layout === 'card' ? 'active' : ''}`}
                onClick={() => setSettings({...settings, layout: 'card'})}
              >
                <div className="layout-preview card-preview">
                  <div className="preview-album large"></div>
                  <div className="preview-text">
                    <div className="preview-line"></div>
                    <div className="preview-line short"></div>
                  </div>
                </div>
                <span>Card</span>
              </button>

              <button
                className={`layout-option ${settings.layout === 'banner' ? 'active' : ''}`}
                onClick={() => setSettings({...settings, layout: 'banner'})}
              >
                <div className="layout-preview banner-preview">
                  <div className="preview-album"></div>
                  <div className="preview-text wide">
                    <div className="preview-line"></div>
                    <div className="preview-line short"></div>
                  </div>
                </div>
                <span>Banner</span>
              </button>
            </div>
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

          <button className="preview-button" onClick={() => setShowPreview(!showPreview)}>
            {showPreview ? 'Hide Preview' : 'Show Live Preview'}
          </button>
        </div>

        {showPreview && settings.enabled && (
          <div className="widget-preview-section">
            <h3>Live Preview</h3>
            <div className="preview-container">
              <iframe
                src={widgetUrl}
                style={{
                  width: '1920px',
                  height: '1080px',
                  transform: 'scale(0.5)',
                  transformOrigin: 'top left',
                  border: 'none',
                  background: '#000'
                }}
                title="Widget Preview"
              />
            </div>
            <p className="preview-note">
              💡 This is a live preview. Play something on Spotify to see it appear!
            </p>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
}
