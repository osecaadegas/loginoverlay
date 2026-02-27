/**
 * RaidShoutoutWidget.jsx — OBS Overlay Widget
 *
 * Minimal raid shoutout: instantly autoplays the Twitch clip.
 * Strategy: try native <video> with direct .mp4 URL first (no play-button).
 * If the .mp4 fails to load, fall back to Twitch iframe embed.
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
    return thumbnailUrl.replace(/-preview-\d+x\d+\.jpg$/i, '.mp4');
  } catch {
    return null;
  }
}

/** Build Twitch iframe embed URL (fallback) */
function buildIframeSrc(clipId, clipEmbedUrl) {
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  if (clipId) {
    return `https://clips.twitch.tv/embed?clip=${encodeURIComponent(clipId)}&parent=${host}&autoplay=true&muted=true`;
  }
  if (clipEmbedUrl) {
    try {
      const url = new URL(clipEmbedUrl);
      url.searchParams.set('parent', host);
      url.searchParams.set('autoplay', 'true');
      url.searchParams.set('muted', 'true');
      return url.toString();
    } catch {
      return `${clipEmbedUrl}&parent=${host}&autoplay=true&muted=true`;
    }
  }
  return null;
}

/* ─── Main Widget ─── */
export default function RaidShoutoutWidget({ config, theme, allWidgets }) {
  const c = config || {};
  const [queue, setQueue] = useState([]);
  const [currentAlert, setCurrentAlert] = useState(null);
  const [phase, setPhase] = useState('idle');           // idle → entering → playing → exiting → idle
  const [videoFailed, setVideoFailed] = useState(false); // true = .mp4 failed, use iframe
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

  const enqueueAlert = useCallback((alert) => {
    setQueue(prev => [...prev, alert]);
  }, []);

  // ── Process next alert ──
  useEffect(() => {
    if (phase !== 'idle' || queue.length === 0) return;
    const next = queue[0];
    setQueue(prev => prev.slice(1));
    setCurrentAlert(next);
    setVideoFailed(false);
    setPhase('entering');
    markAlertShown(next.id);
    playAlertSound(soundUrl);
  }, [phase, queue, soundUrl]);

  // ── Phase machine ──
  useEffect(() => {
    let timer;
    switch (phase) {
      case 'entering':
        timer = setTimeout(() => setPhase('playing'), 600);
        break;
      case 'playing':
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

  // ── Force-play the <video> whenever it becomes available or phase changes ──
  useEffect(() => {
    if (videoRef.current && (phase === 'entering' || phase === 'playing')) {
      videoRef.current.play().catch(() => {});
    }
  }, [phase, videoFailed]);

  const handleVideoEnded = useCallback(() => {
    if (phase === 'playing') {
      clearTimeout(dismissTimerRef.current);
      setPhase('exiting');
    }
  }, [phase]);

  // If the .mp4 fails (404, CORS, etc.), switch to iframe fallback
  const handleVideoError = useCallback(() => {
    console.warn('[RaidShoutout] Direct .mp4 failed, falling back to iframe');
    setVideoFailed(true);
  }, []);

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

  if (!currentAlert || phase === 'idle') return null;

  const videoUrl = getClipVideoUrl(currentAlert.clip_thumbnail_url);
  const hasClip = !!(currentAlert.clip_id || currentAlert.clip_embed_url);
  const iframeSrc = hasClip ? buildIframeSrc(currentAlert.clip_id, currentAlert.clip_embed_url) : null;
  // Use native video if we have a URL and it hasn't errored; otherwise iframe
  const useNativeVideo = videoUrl && !videoFailed;

  const wrapperClass = [
    'rs-alert-wrapper',
    phase === 'entering' ? 'rs-phase-enter' : '',
    phase === 'exiting'  ? 'rs-phase-exit'  : '',
    phase === 'playing'  ? 'rs-phase-visible' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={wrapperClass} style={{ '--rs-radius': `${borderRadius}px` }}>
      <div className="rs-alert-card rs-alert-card--clip-only">
        {useNativeVideo ? (
          /* ── Native <video> — no play button, instant autoplay ── */
          <div className="rs-clip-container">
            <video
              key={currentAlert.id + '-video'}
              ref={videoRef}
              className="rs-clip-video"
              src={videoUrl}
              autoPlay
              muted
              playsInline
              onEnded={handleVideoEnded}
              onError={handleVideoError}
              onCanPlay={() => { videoRef.current?.play().catch(() => {}); }}
              poster={currentAlert.clip_thumbnail_url}
            />
          </div>
        ) : iframeSrc ? (
          /* ── Iframe fallback ── */
          <div className="rs-clip-container">
            <iframe
              key={currentAlert.id + '-iframe'}
              src={iframeSrc}
              className="rs-clip-iframe"
              title={currentAlert.clip_title || 'Raid clip'}
              allowFullScreen
              allow="autoplay; encrypted-media; fullscreen"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        ) : (
          /* ── No clip at all — avatar fallback ── */
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
