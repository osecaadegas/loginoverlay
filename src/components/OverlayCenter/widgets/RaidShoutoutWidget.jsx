/**
 * RaidShoutoutWidget.jsx — OBS Overlay Widget
 *
 * Minimal raid shoutout: instantly autoplays the Twitch clip as a native
 * <video> element (no iframe, no play-button gate).
 * Queues multiple alerts.
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  subscribeToShoutoutAlerts,
  unsubscribeShoutoutAlerts,
  markAlertShown,
  markAlertDismissed,
  getPendingAlerts,
} from '../../../services/shoutoutService';

/* ─── Sound Effect ─── */
function playAlertSound(soundUrl) {
  if (!soundUrl) return;
  try {
    const audio = new Audio(soundUrl);
    audio.volume = 0.6;
    audio.play().catch(() => {});
  } catch {}
}

/**
 * Derive the direct .mp4 URL from a Twitch clip thumbnail URL.
 * Twitch thumbnails look like:
 *   https://clips-media-assets2.twitch.tv/xxxxx-preview-480x272.jpg
 * The video is at:
 *   https://clips-media-assets2.twitch.tv/xxxxx.mp4
 */
function getClipVideoUrl(thumbnailUrl) {
  if (!thumbnailUrl) return null;
  try {
    // Strip the "-preview-{W}x{H}.jpg" suffix → ".mp4"
    return thumbnailUrl.replace(/-preview-\d+x\d+\.jpg$/i, '.mp4');
  } catch {
    return null;
  }
}

/* ─── Main Widget ─── */
export default function RaidShoutoutWidget({ config, theme, allWidgets }) {
  const c = config || {};
  const [queue, setQueue] = useState([]);
  const [currentAlert, setCurrentAlert] = useState(null);
  // Phases: idle → entering → playing → exiting → idle
  const [phase, setPhase] = useState('idle');
  const channelRef = useRef(null);
  const dismissTimerRef = useRef(null);
  const videoRef = useRef(null);

  const MAX_DURATION = c.alertDuration ?? 30;
  const soundUrl = c.soundUrl ?? '';
  const borderRadius = c.borderRadius ?? 12;

  const userId = useMemo(() => {
    const w = (allWidgets || []).find(w => w.user_id);
    return w?.user_id || null;
  }, [allWidgets]);

  // ── Queue ──
  const enqueueAlert = useCallback((alert) => {
    setQueue(prev => [...prev, alert]);
  }, []);

  // ── Process next alert ──
  useEffect(() => {
    if (phase !== 'idle' || queue.length === 0) return;
    const next = queue[0];
    setQueue(prev => prev.slice(1));
    setCurrentAlert(next);
    setPhase('entering');
    markAlertShown(next.id);
    playAlertSound(soundUrl);
  }, [phase, queue, soundUrl]);

  // ── Simplified phase machine: enter → play → exit ──
  useEffect(() => {
    let timer;
    switch (phase) {
      case 'entering':
        timer = setTimeout(() => setPhase('playing'), 600);
        break;
      case 'playing':
        // Try to force-play the video element
        if (videoRef.current) {
          videoRef.current.play().catch(() => {});
        }
        timer = setTimeout(() => setPhase('exiting'), MAX_DURATION * 1000);
        dismissTimerRef.current = timer;
        break;
      case 'exiting':
        timer = setTimeout(() => {
          if (currentAlert) markAlertDismissed(currentAlert.id);
          setCurrentAlert(null);
          setPhase('idle');
        }, 500);
        break;
      default:
        break;
    }
    return () => clearTimeout(timer);
  }, [phase, MAX_DURATION, currentAlert]);

  // ── When video ends naturally, exit early ──
  const handleVideoEnded = useCallback(() => {
    if (phase === 'playing') {
      clearTimeout(dismissTimerRef.current);
      setPhase('exiting');
    }
  }, [phase]);

  // ── Subscribe to realtime ──
  useEffect(() => {
    if (!userId) return;
    getPendingAlerts(userId).then(pending => {
      pending.forEach(alert => enqueueAlert(alert));
    });
    channelRef.current = subscribeToShoutoutAlerts(userId, (alert) => {
      enqueueAlert(alert);
    });
    return () => unsubscribeShoutoutAlerts(channelRef.current);
  }, [userId, enqueueAlert]);

  // ── Nothing to show ──
  if (!currentAlert || phase === 'idle') return null;

  const videoUrl = getClipVideoUrl(currentAlert.clip_thumbnail_url);

  const wrapperClass = [
    'rs-alert-wrapper',
    phase === 'entering' ? 'rs-phase-enter' : '',
    phase === 'exiting'  ? 'rs-phase-exit'  : '',
    phase === 'playing'  ? 'rs-phase-visible' : '',
  ].filter(Boolean).join(' ');

  const alertStyle = {
    '--rs-radius': `${borderRadius}px`,
  };

  return (
    <div className={wrapperClass} style={alertStyle}>
      <div className="rs-alert-card rs-alert-card--clip-only">
        {videoUrl ? (
          <div className="rs-clip-container">
            <video
              ref={videoRef}
              className="rs-clip-video"
              src={videoUrl}
              autoPlay
              muted
              playsInline
              onEnded={handleVideoEnded}
              poster={currentAlert.clip_thumbnail_url}
            />
          </div>
        ) : (
          /* No clip available — just show the avatar briefly */
          <div className="rs-no-clip">
            <div className="rs-no-clip-avatar-large">
              {currentAlert.raider_avatar_url ? (
                <img src={currentAlert.raider_avatar_url} alt="" />
              ) : (
                <span>{(currentAlert.raider_display_name || '?')[0]}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
