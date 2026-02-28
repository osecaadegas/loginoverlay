/**
 * RaidShoutoutWidget.jsx — OBS Overlay Widget
 *
 * Minimal raid shoutout: instantly autoplays the Twitch clip.
 * Uses our /api/clip-video proxy to serve the MP4 from our own domain,
 * bypassing Twitch's iframe play-button and CORS restrictions.
 * Falls back to Twitch iframe embed if the proxy fails.
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
 * Build a proxied video URL through our own API.
 * The proxy fetches from Twitch CDN server-side (no CORS, no play-button gate).
 *
 * Priority: clip_video_url (pre-verified by API) → thumbnail derivation
 */
function getProxiedVideoUrl(alert) {
  // If the API already stored a verified direct .mp4 URL, proxy that
  if (alert.clip_video_url) {
    return `/api/clip-video?url=${encodeURIComponent(alert.clip_video_url)}`;
  }
  // Otherwise derive from thumbnail and let the proxy do the conversion
  if (alert.clip_thumbnail_url) {
    return `/api/clip-video?thumbnail=${encodeURIComponent(alert.clip_thumbnail_url)}`;
  }
  return null;
}

/** Build Twitch iframe embed URL (final fallback) */
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

  // ── Callback ref: set muted as DOM property (React bug workaround) + instant play ──
  const videoCallbackRef = useCallback((node) => {
    videoRef.current = node;
    if (node) {
      node.muted = true;           // React doesn't set the DOM property reliably
      node.playsInline = true;
      node.play().catch(() => {});  // Instant play attempt on mount
    }
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
      videoRef.current.muted = true;  // Re-enforce muted DOM property
      videoRef.current.play().catch(() => {});
    }
  }, [phase, videoFailed, currentAlert]);

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

  if (!currentAlert || phase === 'idle') {
    return (
      <div className="rs-alert-wrapper rs-phase-visible" style={{ '--rs-radius': `${borderRadius}px`, width: '100%', height: '100%', overflow: 'hidden' }}>
        <div className="rs-alert-card rs-alert-card--clip-only">
          <div className="rs-no-clip">
            <div className="rs-no-clip-avatar-large">
              <span>⚡</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Route video through our proxy (same-origin, no CORS, no play-button)
  const proxyVideoUrl = getProxiedVideoUrl(currentAlert);
  const hasClip = !!(currentAlert.clip_id || currentAlert.clip_embed_url);
  const iframeSrc = hasClip ? buildIframeSrc(currentAlert.clip_id, currentAlert.clip_embed_url) : null;
  // Use native video via proxy if available; otherwise iframe
  const useNativeVideo = proxyVideoUrl && !videoFailed;

  const wrapperClass = [
    'rs-alert-wrapper',
    phase === 'entering' ? 'rs-phase-enter' : '',
    phase === 'exiting'  ? 'rs-phase-exit'  : '',
    phase === 'playing'  ? 'rs-phase-visible' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={wrapperClass} style={{ '--rs-radius': `${borderRadius}px`, width: '100%', height: '100%', overflow: 'hidden' }}>
      <div className="rs-alert-card rs-alert-card--clip-only">
        {useNativeVideo ? (
          /* ── Native <video> — no play button, instant autoplay ── */
          <div className="rs-clip-container">
            <video
              key={currentAlert.id + '-video'}
              ref={videoCallbackRef}
              className="rs-clip-video"
              src={proxyVideoUrl}
              autoPlay
              muted
              playsInline
              crossOrigin="anonymous"
              onEnded={handleVideoEnded}
              onError={handleVideoError}
              onCanPlay={() => { if (videoRef.current) { videoRef.current.muted = true; videoRef.current.play().catch(() => {}); } }}
              onLoadedData={() => { if (videoRef.current) { videoRef.current.muted = true; videoRef.current.play().catch(() => {}); } }}
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
