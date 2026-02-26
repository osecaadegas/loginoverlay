/**
 * RaidShoutoutWidget.jsx — OBS Overlay Widget
 *
 * Clean, minimal raid shoutout alert:
 * - Starts collapsed: "RAID ALERT" header + "Check them out at twitch.tv/username" footer
 * - After 1.5s, expands to reveal the clip (muted autoplay, no "Start Watching" gate)
 * - After 30s max, collapses back and disappears
 * - Queues multiple alerts
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../../../config/supabaseClient';
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

/* ─── Build Twitch clip embed URL using current hostname, MUTED for autoplay ─── */
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
  // Phases: idle → entering → collapsed → expanding → playing → collapsing → exiting → idle
  const [phase, setPhase] = useState('idle');
  const channelRef = useRef(null);
  const dismissTimerRef = useRef(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const MAX_DURATION = c.alertDuration ?? 30; // hard cap in seconds
  const soundUrl = c.soundUrl ?? '';
  const accentColor = c.accentColor ?? '#9146FF';
  const bgColor = c.bgColor ?? 'rgba(13, 13, 20, 0.95)';
  const textColor = c.textColor ?? '#ffffff';
  const subtextColor = c.subtextColor ?? '#a0a0b4';
  const borderRadius = c.borderRadius ?? 16;
  const fontFamily = c.fontFamily ?? "'Inter', sans-serif";

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

  // ── Phase machine ──
  useEffect(() => {
    let timer;
    switch (phase) {
      case 'entering':
        // Card slides in (collapsed — just header + footer)
        timer = setTimeout(() => setPhase('collapsed'), 700);
        break;
      case 'collapsed':
        // Pause so viewer reads header+footer, then expand to reveal clip
        timer = setTimeout(() => setPhase('expanding'), 1500);
        break;
      case 'expanding':
        // CSS transition handles the expand, wait for it then mark playing
        timer = setTimeout(() => setPhase('playing'), 600);
        break;
      case 'playing':
        // Hard cap: auto-collapse after MAX_DURATION
        timer = setTimeout(() => setPhase('collapsing'), MAX_DURATION * 1000);
        dismissTimerRef.current = timer;
        break;
      case 'collapsing':
        // Collapse the clip area, then exit
        timer = setTimeout(() => setPhase('exiting'), 600);
        break;
      case 'exiting':
        // Slide out, then go idle
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
  const clipExpanded = ['expanding', 'playing'].includes(phase);
  const clipCollapsing = phase === 'collapsing';

  // Wrapper classes
  const wrapperClass = [
    'rs-alert-wrapper',
    phase === 'entering' ? 'rs-phase-enter' : '',
    phase === 'exiting'  ? 'rs-phase-exit' : '',
    phase !== 'entering' && phase !== 'exiting' ? 'rs-phase-visible' : '',
  ].filter(Boolean).join(' ');

  const alertStyle = {
    '--rs-accent': accentColor,
    '--rs-bg': bgColor,
    '--rs-text': textColor,
    '--rs-subtext': subtextColor,
    '--rs-radius': `${borderRadius}px`,
    '--rs-font': fontFamily,
    fontFamily,
  };

  return (
    <div className={wrapperClass} style={alertStyle}>
      <div className="rs-alert-card">

        {/* ── RAID ALERT header ── */}
        <div className="rs-header">
          <div className="rs-raid-badge">
            <svg className="rs-raid-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            <span>RAID ALERT</span>
          </div>
          {queue.length > 0 && (
            <div className="rs-queue-badge">+{queue.length} more</div>
          )}
        </div>

        {/* ── Expandable clip area ── */}
        <div className={`rs-clip-reveal ${clipExpanded ? 'rs-clip-reveal--open' : ''} ${clipCollapsing ? 'rs-clip-reveal--closing' : ''}`}>
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

        {/* ── Footer: twitch.tv/username ── */}
        <div className="rs-footer">
          <div className="rs-follow-cta">
            Check them out at{' '}
            <span className="rs-twitch-link">twitch.tv/{currentAlert.raider_username}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
