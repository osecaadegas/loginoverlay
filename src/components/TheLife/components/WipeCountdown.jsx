import { useState, useEffect } from 'react';
import { supabase } from '../../../config/supabaseClient';
import './WipeCountdown.css';

/**
 * WipeCountdown Component
 * Displays a countdown timer showing time until the next server wipe
 * Positioned at top-right of The Life game area
 */
export default function WipeCountdown() {
  const [wipeSettings, setWipeSettings] = useState(null);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isVisible, setIsVisible] = useState(false);

  // Load wipe settings on mount
  useEffect(() => {
    console.log('WipeCountdown component mounted');
    loadWipeSettings();
    
    // Refresh settings every 5 minutes
    const refreshInterval = setInterval(loadWipeSettings, 5 * 60 * 1000);
    return () => clearInterval(refreshInterval);
  }, []);

  // Update countdown every second
  useEffect(() => {
    if (!wipeSettings?.scheduled_at || !wipeSettings?.is_active) {
      setIsVisible(false);
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const wipeDate = new Date(wipeSettings.scheduled_at);
      const diff = wipeDate - now;

      if (diff <= 0) {
        // Wipe time has passed
        setIsVisible(false);
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setIsVisible(true);
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [wipeSettings]);

  const loadWipeSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('the_life_wipe_settings')
        .select('scheduled_at, is_active')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading wipe settings:', error);
        return;
      }

      console.log('Wipe settings loaded:', data);
      setWipeSettings(data);
    } catch (err) {
      console.error('Error loading wipe settings:', err);
    }
  };

  if (!isVisible) return null;

  const formatNumber = (num) => String(num).padStart(2, '0');

  // Determine urgency level for styling
  const totalMinutes = countdown.days * 24 * 60 + countdown.hours * 60 + countdown.minutes;
  const urgencyClass = totalMinutes < 60 ? 'critical' : totalMinutes < 24 * 60 ? 'warning' : '';

  return (
    <div className={`wipe-countdown ${urgencyClass}`}>
      <div className="wipe-countdown-header">
        <span className="wipe-icon">💀</span>
        <span className="wipe-label">SERVER WIPE</span>
      </div>
      <div className="wipe-countdown-timer">
        <div className="time-segment">
          <span className="time-value">{countdown.days}</span>
          <span className="time-unit">DAYS</span>
        </div>
        <span className="time-separator">:</span>
        <div className="time-segment">
          <span className="time-value">{formatNumber(countdown.hours)}</span>
          <span className="time-unit">HRS</span>
        </div>
        <span className="time-separator">:</span>
        <div className="time-segment">
          <span className="time-value">{formatNumber(countdown.minutes)}</span>
          <span className="time-unit">MIN</span>
        </div>
        <span className="time-separator">:</span>
        <div className="time-segment">
          <span className="time-value">{formatNumber(countdown.seconds)}</span>
          <span className="time-unit">SEC</span>
        </div>
      </div>
    </div>
  );
}
