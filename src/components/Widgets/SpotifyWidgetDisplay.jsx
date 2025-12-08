import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../config/supabaseClient';
import './SpotifyWidgetDisplay.css';

export default function SpotifyWidgetDisplay() {
  const { userId } = useParams();
  const [settings, setSettings] = useState(null);
  const [currentTrack, setCurrentTrack] = useState(null);

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

  if (!settings?.enabled) return null;

  return (
    <div 
      className="spotify-widget-display" 
      style={{
        position: settings.position || 'bottom-left',
        opacity: settings.opacity || 1,
        transform: `scale(${settings.scale || 1})`
      }}
    >
      <div className="spotify-widget-content">
        <div className="spotify-icon">🎵</div>
        <div className="spotify-track-info">
          <div className="spotify-track-name">{currentTrack?.name || 'No track playing'}</div>
          <div className="spotify-artist-name">{currentTrack?.artist || ''}</div>
        </div>
      </div>
    </div>
  );
}
