import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../config/supabaseClient';
import './SpotifyWidgetDisplay.css';

export default function SpotifyWidgetDisplay() {
  const { userId } = useParams();
  const [settings, setSettings] = useState(null);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [spotifyConnection, setSpotifyConnection] = useState(null);
  
  // Get layout from URL parameter - priority over settings
  const getLayoutFromURL = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('layout') || 'compact';
  };
  
  const [layout, setLayout] = useState(getLayoutFromURL());
  
  // Update layout whenever URL changes
  useEffect(() => {
    const currentLayout = getLayoutFromURL();
    setLayout(currentLayout);
    console.log('Layout updated from URL:', currentLayout);
  }, [window.location.search]);

  useEffect(() => {
    if (!userId) return;

    // Load widget settings for this user
    const loadSettings = async () => {
      const { data } = await supabase
        .from('widget_settings')
        .select('*')
        .eq('user_id', userId)
        .eq('widget_type', 'spotify')
        .single();

      if (data) {
        setSettings(data.settings);
      }

      // Load Spotify connection
      const { data: spotifyData } = await supabase
        .from('spotify_connections')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (spotifyData) {
        setSpotifyConnection(spotifyData);
      }
    };

    loadSettings();

    // Subscribe to settings changes
    const channel = supabase
      .channel(`widget_settings_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'widget_settings',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          if (payload.new.widget_type === 'spotify') {
            setSettings(payload.new.settings);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Fetch currently playing track
  useEffect(() => {
    if (!spotifyConnection || !settings?.enabled) return;

    const fetchCurrentTrack = async () => {
      try {
        // Check if token is expired
        if (new Date(spotifyConnection.expires_at) < new Date()) {
          // Need to refresh token
          return;
        }

        const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
          headers: {
            'Authorization': `Bearer ${spotifyConnection.access_token}`
          }
        });

        if (response.status === 200) {
          const data = await response.json();
          if (data.item) {
            setCurrentTrack({
              name: data.item.name,
              artist: data.item.artists.map(a => a.name).join(', '),
              album: data.item.album.name,
              albumArt: data.item.album.images[0]?.url
            });
          }
        } else if (response.status === 204) {
          // Nothing playing
          setCurrentTrack(null);
        }
      } catch (error) {
        console.error('Error fetching Spotify track:', error);
      }
    };

    // Fetch immediately and then every 5 seconds
    fetchCurrentTrack();
    const interval = setInterval(fetchCurrentTrack, 5000);

    return () => clearInterval(interval);
  }, [spotifyConnection, settings]);

  if (!settings?.enabled) return null;

  if (!currentTrack) return null;

  const renderLayout = () => {
    console.log('Rendering layout:', layout);
    
    const spotifyIcon = (
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path fill="currentColor" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
      </svg>
    );

    switch(layout) {
      case 'minimal':
        return (
          <div className="spotify-widget-content layout-minimal">
            <div className="spotify-track-info">
              <div className="spotify-track-name">{currentTrack.name}</div>
              <div className="spotify-artist-name">{currentTrack.artist}</div>
            </div>
            <div className="spotify-icon">{spotifyIcon}</div>
          </div>
        );

      case 'card':
        return (
          <div className="spotify-widget-content layout-card">
            {currentTrack.albumArt && (
              <img src={currentTrack.albumArt} alt="Album art" className="spotify-album-art large" />
            )}
            <div className="spotify-track-info">
              <div className="spotify-track-name">{currentTrack.name}</div>
              <div className="spotify-artist-name">{currentTrack.artist}</div>
            </div>
            <div className="spotify-icon">{spotifyIcon}</div>
          </div>
        );

      case 'banner':
        return (
          <div className="spotify-widget-content layout-banner">
            {currentTrack.albumArt && (
              <img src={currentTrack.albumArt} alt="Album art" className="spotify-album-art" />
            )}
            <div className="spotify-track-info">
              <div className="spotify-track-name">{currentTrack.name}</div>
              <div className="spotify-artist-name">{currentTrack.artist}</div>
            </div>
            <div className="spotify-icon">{spotifyIcon}</div>
          </div>
        );

      case 'glass':
        return (
          <div className="spotify-widget-content layout-glass">
            <div className="glass-header">
              <div className="glass-title">Now Playing</div>
            </div>
            {currentTrack.albumArt && (
              <img src={currentTrack.albumArt} alt="Album art" className="spotify-album-art glass-album" />
            )}
            <div className="spotify-track-info glass-info">
              <div className="spotify-track-name">{currentTrack.name}</div>
              <div className="spotify-artist-name">{currentTrack.artist}</div>
            </div>
            <div className="glass-footer">
              <div className="spotify-icon glass-icon">{spotifyIcon}</div>
            </div>
          </div>
        );

      case 'floating':
        return (
          <div className="spotify-widget-content layout-floating">
            {currentTrack.albumArt && (
              <img src={currentTrack.albumArt} alt="Album art" className="spotify-album-art floating-album" />
            )}
            <div className="spotify-track-info floating-info">
              <div className="spotify-track-name">{currentTrack.name}</div>
              <div className="spotify-artist-name">{currentTrack.artist}</div>
            </div>
            <div className="spotify-icon floating-icon">{spotifyIcon}</div>
          </div>
        );

      case 'compact':
      default:
        return (
          <div className="spotify-widget-content layout-compact">
            {currentTrack.albumArt && (
              <img src={currentTrack.albumArt} alt="Album art" className="spotify-album-art" />
            )}
            <div className="spotify-track-info">
              <div className="spotify-track-name">{currentTrack.name}</div>
              <div className="spotify-artist-name">{currentTrack.artist}</div>
            </div>
            <div className="spotify-icon">{spotifyIcon}</div>
          </div>
        );
    }
  };

  const getPositionClass = () => {
    const pos = settings?.position || 'bottom-left';
    return `position-${pos}`;
  };

  return (
    <div 
      className={`spotify-widget-display ${getPositionClass()} layout-${layout}`}
      style={{
        opacity: settings?.opacity || 1,
        transform: `scale(${settings?.scale || 1})`
      }}
    >
      {renderLayout()}
    </div>
  );
}
