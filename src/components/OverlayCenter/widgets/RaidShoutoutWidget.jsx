/**
 * RaidShoutoutWidget.jsx — OBS Overlay Widget
 *
 * Minimal raid shoutout: just instantly autoplays the Twitch clip.
 * No header, no footer — pure clip playback that fades in, plays, and fades out.
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

/* ─── Build Twitch clip embed URL — MUTED so browsers allow autoplay ─── */
function buildClipEmbedSrc(clipId, clipEmbedUrl) {
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
  // Phases: idle → entering → playing → exiting → idle
  const [phase, setPhase] = useState('idle');
  const channelRef = useRef(null);
  const dismissTimerRef = useRef(null);

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
        // Fade in, then immediately start playing
        timer = setTimeout(() => setPhase('playing'), 600);
        break;
      case 'playing':
        // Auto-dismiss after MAX_DURATION
        timer = setTimeout(() => setPhase('exiting'), MAX_DURATION * 1000);
        dismissTimerRef.current = timer;
        break;
      case 'exiting':
        // Fade out, then go idle
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

  const hasClip = !!(currentAlert.clip_id || currentAlert.clip_embed_url);
  const embedSrc = hasClip ? buildClipEmbedSrc(currentAlert.clip_id, currentAlert.clip_embed_url) : null;

  // Wrapper classes
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
        {hasClip && embedSrc ? (
          <div className="rs-clip-container">
            {currentAlert.clip_thumbnail_url && (
              <img src={currentAlert.clip_thumbnail_url} alt="" className="rs-clip-poster" />
            )}
            <iframe
              src={embedSrc}
              className="rs-clip-iframe"
              title={currentAlert.clip_title || 'Raid clip'}
              allowFullScreen
              allow="autoplay; encrypted-media; fullscreen"
              referrerPolicy="no-referrer-when-downgrade"
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
