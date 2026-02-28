/**
 * RaidShoutoutWidget.jsx — OBS Overlay Widget
 *
 * Raid shoutout: autoplays a Twitch clip in OBS.
 *
 * Strategy (handles Twitch's mature-content gate):
 *  1. ONLY uses proxied <video> via /api/clip-video — streams the raw .mp4
 *     from our own domain, completely bypassing Twitch's content warning
 *     and iframe play-button gate.
 *  2. Sound plays separately as an Audio() element.
 *  3. NO iframe fallback (iframes show content warnings on mature channels).
 *  4. If clip can't play, shows raider avatar instead.
 *
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

/* ─── Sound Effect (separate from clip — OBS best practice) ─── */
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
 * Send BOTH url and thumbnail so the proxy can try multiple CDN patterns.
 */
function getProxiedVideoUrl(alert) {
  const params = [];
  if (alert.clip_video_url) {
    params.push(`url=${encodeURIComponent(alert.clip_video_url)}`);
  }
  if (alert.clip_thumbnail_url) {
    params.push(`thumbnail=${encodeURIComponent(alert.clip_thumbnail_url)}`);
  }
  return params.length > 0 ? `/api/clip-video?${params.join('&')}` : null;
}

/* ─── Main Widget ─── */
export default function RaidShoutoutWidget({ config, theme, allWidgets }) {
  const c = config || {};
  const [queue, setQueue] = useState([]);
  const [currentAlert, setCurrentAlert] = useState(null);
  const [phase, setPhase] = useState('idle');
  const [videoFailed, setVideoFailed] = useState(false);
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

  /* ── Callback ref: force muted DOM property + instant play on mount ── */
  const videoCallbackRef = useCallback((node) => {
    videoRef.current = node;
    if (node) {
      node.muted = true;
      node.playsInline = true;
      node.play().catch(() => {});
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

  /* ── Re-attempt play on phase changes ── */
  useEffect(() => {
    if (videoRef.current && (phase === 'entering' || phase === 'playing')) {
      videoRef.current.muted = true;
      videoRef.current.play().catch(() => {});
    }
  }, [phase, videoFailed, currentAlert]);

  const handleVideoEnded = useCallback(() => {
    if (phase === 'playing') {
      clearTimeout(dismissTimerRef.current);
      setPhase('exiting');
    }
  }, [phase]);

  const handleVideoError = useCallback(() => {
    console.warn('[RaidShoutout] Proxy .mp4 failed — showing avatar fallback (no iframe)');
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

  /* ── Idle state ── */
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

  /* ── Resolve proxy video URL ── */
  const proxyVideoUrl = getProxiedVideoUrl(currentAlert);
  const canPlayVideo = proxyVideoUrl && !videoFailed;

  const wrapperClass = [
    'rs-alert-wrapper',
    phase === 'entering' ? 'rs-phase-enter' : '',
    phase === 'exiting'  ? 'rs-phase-exit'  : '',
    phase === 'playing'  ? 'rs-phase-visible' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={wrapperClass} style={{ '--rs-radius': `${borderRadius}px`, width: '100%', height: '100%', overflow: 'hidden' }}>
      <div className="rs-alert-card rs-alert-card--clip-only">
        {canPlayVideo ? (
          /* ── Proxied <video> — bypasses Twitch content warning entirely ── */
          <div className="rs-clip-container">
            <video
              key={currentAlert.id + '-video'}
              ref={videoCallbackRef}
              className="rs-clip-video"
              src={proxyVideoUrl}
              autoPlay
              muted
              playsInline
              onEnded={handleVideoEnded}
              onError={handleVideoError}
              onCanPlay={() => { if (videoRef.current) { videoRef.current.muted = true; videoRef.current.play().catch(() => {}); } }}
              onLoadedData={() => { if (videoRef.current) { videoRef.current.muted = true; videoRef.current.play().catch(() => {}); } }}
              poster={currentAlert.clip_thumbnail_url}
            />
          </div>
        ) : (
          /* ── Fallback: raider info (NO iframe — avoids content gate) ── */
          <div className="rs-no-clip rs-no-clip--shoutout">
            {currentAlert.raider_avatar_url && (
              <img className="rs-shoutout-avatar" src={currentAlert.raider_avatar_url} alt="" />
            )}
            <div className="rs-shoutout-info">
              <span className="rs-shoutout-name">{currentAlert.raider_display_name || currentAlert.raider_username}</span>
              {currentAlert.raider_game && (
                <span className="rs-shoutout-game">Playing {currentAlert.raider_game}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
