/**
 * RaidShoutoutWidget.jsx — OBS Overlay Widget
 *
 * Raid shoutout: autoplays a Twitch clip via iframe embed.
 * OBS uses Chromium which blocks <video> autoplay but reliably
 * autoplays muted iframes with allow="autoplay".
 *
 * Strategy:
 *  1. Primary: Twitch iframe embed (muted, autoplay) — works in OBS
 *  2. Fallback: avatar display if no clip available
 *  3. Alert sound plays separately (not from the clip)
 *  4. Iframe destroyed after phase exits (clean lifecycle)
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

/* ─── Sound Effect (plays separately from clip — OBS best practice) ─── */
function playAlertSound(soundUrl) {
  if (!soundUrl) return;
  try {
    const audio = new Audio(soundUrl);
    audio.volume = 0.6;
    audio.play().catch(() => {});
  } catch {}
}

/**
 * Build the Twitch clip iframe embed URL.
 * parent= must match the page's hostname for Twitch to allow embedding.
 */
function buildIframeSrc(clipId, clipEmbedUrl) {
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  // Support multiple parents for dev + prod
  const parents = [host];
  if (host !== 'localhost') parents.push('localhost');

  if (clipId) {
    const parentParams = parents.map(p => `&parent=${p}`).join('');
    return `https://clips.twitch.tv/embed?clip=${encodeURIComponent(clipId)}${parentParams}&autoplay=true&muted=true`;
  }
  if (clipEmbedUrl) {
    try {
      const url = new URL(clipEmbedUrl);
      parents.forEach(p => url.searchParams.append('parent', p));
      url.searchParams.set('autoplay', 'true');
      url.searchParams.set('muted', 'true');
      return url.toString();
    } catch {
      const parentParams = parents.map(p => `&parent=${p}`).join('');
      return `${clipEmbedUrl}${parentParams}&autoplay=true&muted=true`;
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
  const channelRef = useRef(null);
  const dismissTimerRef = useRef(null);

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
          setCurrentAlert(null);   // Destroys iframe (clean lifecycle)
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

  // Build iframe src — primary playback method for OBS
  const iframeSrc = buildIframeSrc(currentAlert.clip_id, currentAlert.clip_embed_url);

  const wrapperClass = [
    'rs-alert-wrapper',
    phase === 'entering' ? 'rs-phase-enter' : '',
    phase === 'exiting'  ? 'rs-phase-exit'  : '',
    phase === 'playing'  ? 'rs-phase-visible' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={wrapperClass} style={{ '--rs-radius': `${borderRadius}px`, width: '100%', height: '100%', overflow: 'hidden' }}>
      <div className="rs-alert-card rs-alert-card--clip-only">
        {iframeSrc ? (
          /* ── Twitch iframe embed — muted autoplay, OBS-compatible ── */
          <div className="rs-clip-container">
            <iframe
              key={currentAlert.id + '-iframe'}
              src={iframeSrc}
              className="rs-clip-iframe"
              title={currentAlert.clip_title || 'Raid clip'}
              allow="autoplay; encrypted-media; fullscreen"
              allowFullScreen
              muted
              frameBorder="0"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        ) : (
          /* ── No clip available — avatar fallback ── */
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
