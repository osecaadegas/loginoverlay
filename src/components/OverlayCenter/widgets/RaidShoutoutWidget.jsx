/**
 * RaidShoutoutWidget.jsx — OBS Overlay Widget
 *
 * Displays an animated raid shoutout alert with:
 * - Raider's profile picture + display name + game
 * - Random clip from the raider embedded in a player
 * - Auto-dismisses after the clip ends (or timeout)
 * - Queues multiple alerts if they arrive in sequence
 *
 * This widget manages its OWN Supabase Realtime subscription
 * (separate from the overlay widget system) because alerts are
 * event-driven rather than config-driven.
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

/* ─── Sound Effect (optional, can be configured) ─── */
function playAlertSound(soundUrl) {
  if (!soundUrl) return;
  try {
    const audio = new Audio(soundUrl);
    audio.volume = 0.6;
    audio.play().catch(() => {}); // Ignore autoplay restrictions
  } catch {}
}

/* ─── Clip Embed (iframe-based Twitch clip player) ─── */
function ClipPlayer({ clipEmbedUrl, clipThumbnail, clipTitle, onEnded, duration, config }) {
  const [loaded, setLoaded] = useState(false);
  const timerRef = useRef(null);

  // Auto-advance after clip duration + buffer
  useEffect(() => {
    if (!duration) return;
    const timeout = (duration + 3) * 1000; // clip length + 3s buffer
    timerRef.current = setTimeout(() => onEnded?.(), timeout);
    return () => clearTimeout(timerRef.current);
  }, [duration, onEnded]);

  if (!clipEmbedUrl) {
    // No clip available — show profile card with thumbnail
    return (
      <div className="rs-clip-fallback">
        <div className="rs-no-clip-text">No clips available</div>
      </div>
    );
  }

  return (
    <div className="rs-clip-container">
      {!loaded && clipThumbnail && (
        <img src={clipThumbnail} alt="" className="rs-clip-poster" />
      )}
      <iframe
        src={`${clipEmbedUrl}&autoplay=true&muted=false`}
        className="rs-clip-iframe"
        title={clipTitle || 'Raid clip'}
        allowFullScreen
        allow="autoplay"
        onLoad={() => setLoaded(true)}
      />
      {clipTitle && (
        <div className="rs-clip-title-bar">
          <span className="rs-clip-title-text">{clipTitle}</span>
        </div>
      )}
    </div>
  );
}

/* ─── Main Widget ─── */
export default function RaidShoutoutWidget({ config, theme, allWidgets }) {
  const c = config || {};
  const [queue, setQueue] = useState([]);
  const [currentAlert, setCurrentAlert] = useState(null);
  const [phase, setPhase] = useState('idle'); // idle | entering | playing | exiting
  const channelRef = useRef(null);
  const dismissTimerRef = useRef(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  // ── Config values with defaults ──
  const alertDuration = c.alertDuration ?? 30;     // seconds before auto-dismiss
  const enterAnimation = c.enterAnimation ?? 'slideUp';
  const exitAnimation = c.exitAnimation ?? 'slideDown';
  const soundUrl = c.soundUrl ?? '';
  const showClip = c.showClip !== false;
  const showGame = c.showGame !== false;
  const showViewers = c.showViewers !== false;
  const accentColor = c.accentColor ?? '#9146FF';  // Twitch purple
  const bgColor = c.bgColor ?? 'rgba(13, 13, 20, 0.95)';
  const textColor = c.textColor ?? '#ffffff';
  const subtextColor = c.subtextColor ?? '#a0a0b4';
  const borderRadius = c.borderRadius ?? 16;
  const maxClipDuration = c.maxClipDuration ?? 60;
  const fontFamily = c.fontFamily ?? "'Inter', sans-serif";

  // ── Resolve userId from overlay context ──
  // The overlay renderer passes allWidgets which each have user_id
  const userId = useMemo(() => {
    const w = (allWidgets || []).find(w => w.user_id);
    return w?.user_id || null;
  }, [allWidgets]);

  // ── Queue management ──
  const enqueueAlert = useCallback((alert) => {
    setQueue(prev => [...prev, alert]);
  }, []);

  // Process next alert from queue
  useEffect(() => {
    if (phase !== 'idle' || queue.length === 0) return;

    const next = queue[0];
    setQueue(prev => prev.slice(1));
    setCurrentAlert(next);
    setPhase('entering');

    // Mark as shown in DB
    markAlertShown(next.id);

    // Play sound
    playAlertSound(soundUrl);

    // Transition to "playing" after entrance animation
    const enterTimeout = setTimeout(() => {
      setPhase('playing');
    }, 800); // match CSS enter animation duration

    return () => clearTimeout(enterTimeout);
  }, [phase, queue, soundUrl]);

  // Auto-dismiss timer
  useEffect(() => {
    if (phase !== 'playing') return;

    const clipDur = currentAlert?.clip_duration;
    const timeout = showClip && clipDur
      ? Math.min(clipDur + 5, alertDuration) * 1000
      : alertDuration * 1000;

    dismissTimerRef.current = setTimeout(() => {
      setPhase('exiting');
    }, timeout);

    return () => clearTimeout(dismissTimerRef.current);
  }, [phase, currentAlert, alertDuration, showClip]);

  // Handle exit animation completion
  useEffect(() => {
    if (phase !== 'exiting') return;

    const exitTimeout = setTimeout(() => {
      if (currentAlert) markAlertDismissed(currentAlert.id);
      setCurrentAlert(null);
      setPhase('idle');
    }, 600); // match CSS exit animation duration

    return () => clearTimeout(exitTimeout);
  }, [phase, currentAlert]);

  // ── Subscribe to realtime alerts ──
  useEffect(() => {
    if (!userId) return;

    // Fetch any pending alerts on mount
    getPendingAlerts(userId).then(pending => {
      pending.forEach(alert => enqueueAlert(alert));
    });

    // Subscribe to new alerts
    channelRef.current = subscribeToShoutoutAlerts(userId, (alert) => {
      enqueueAlert(alert);
    });

    return () => unsubscribeShoutoutAlerts(channelRef.current);
  }, [userId, enqueueAlert]);

  // ── Manual dismiss handler ──
  const handleDismiss = useCallback(() => {
    clearTimeout(dismissTimerRef.current);
    setPhase('exiting');
  }, []);

  const handleClipEnded = useCallback(() => {
    // Add 2s delay after clip ends for a nice feel
    setTimeout(() => {
      if (phaseRef.current === 'playing') {
        setPhase('exiting');
      }
    }, 2000);
  }, []);

  // ── Nothing to render ──
  if (!currentAlert || phase === 'idle') return null;

  // ── Build dynamic styles ──
  const alertStyle = {
    '--rs-accent': accentColor,
    '--rs-bg': bgColor,
    '--rs-text': textColor,
    '--rs-subtext': subtextColor,
    '--rs-radius': `${borderRadius}px`,
    '--rs-font': fontFamily,
    fontFamily,
  };

  const animClass =
    phase === 'entering' ? `rs-enter--${enterAnimation}` :
    phase === 'exiting'  ? `rs-exit--${exitAnimation}` :
    'rs-visible';

  return (
    <div className={`rs-alert-wrapper ${animClass}`} style={alertStyle}>
      {/* Glow border effect */}
      <div className="rs-glow-border" />

      {/* Main alert card */}
      <div className="rs-alert-card">

        {/* ── Header: "RAID ALERT" banner ── */}
        <div className="rs-header">
          <div className="rs-raid-badge">
            <svg className="rs-raid-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            <span>RAID ALERT</span>
          </div>
          <div className="rs-queue-badge" style={{ display: queue.length > 0 ? 'flex' : 'none' }}>
            +{queue.length} more
          </div>
        </div>

        {/* ── Raider Info ── */}
        <div className="rs-raider-info">
          <div className="rs-avatar-container">
            {currentAlert.raider_avatar_url ? (
              <img
                src={currentAlert.raider_avatar_url}
                alt={currentAlert.raider_display_name}
                className="rs-avatar"
              />
            ) : (
              <div className="rs-avatar rs-avatar-fallback">
                {(currentAlert.raider_display_name || '?')[0].toUpperCase()}
              </div>
            )}
            <div className="rs-avatar-ring" />
          </div>

          <div className="rs-raider-details">
            <div className="rs-raider-name">{currentAlert.raider_display_name}</div>
            {showGame && currentAlert.raider_game && (
              <div className="rs-raider-game">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="rs-game-icon">
                  <rect x="2" y="6" width="20" height="12" rx="2" />
                  <path d="M6 12h4M8 10v4M15 11h.01M18 13h.01" />
                </svg>
                <span>Was streaming {currentAlert.raider_game}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Clip Player ── */}
        {showClip && currentAlert.clip_embed_url && (
          <ClipPlayer
            clipEmbedUrl={currentAlert.clip_embed_url}
            clipThumbnail={currentAlert.clip_thumbnail_url}
            clipTitle={currentAlert.clip_title}
            duration={currentAlert.clip_duration}
            onEnded={handleClipEnded}
            config={c}
          />
        )}

        {/* ── No clip fallback ── */}
        {showClip && !currentAlert.clip_embed_url && (
          <div className="rs-no-clip">
            <div className="rs-no-clip-avatar-large">
              {currentAlert.raider_avatar_url ? (
                <img src={currentAlert.raider_avatar_url} alt="" />
              ) : (
                <span>{(currentAlert.raider_display_name || '?')[0]}</span>
              )}
            </div>
            <div className="rs-no-clip-text">
              Go check out <strong>{currentAlert.raider_display_name}</strong>!
            </div>
            {currentAlert.raider_game && (
              <div className="rs-no-clip-game">{currentAlert.raider_game}</div>
            )}
          </div>
        )}

        {/* ── Clip metadata bar ── */}
        {showClip && currentAlert.clip_title && (
          <div className="rs-clip-meta">
            {showViewers && currentAlert.clip_view_count > 0 && (
              <span className="rs-clip-views">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="rs-views-icon">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                {currentAlert.clip_view_count.toLocaleString()} views
              </span>
            )}
            {currentAlert.clip_game_name && (
              <span className="rs-clip-game">{currentAlert.clip_game_name}</span>
            )}
          </div>
        )}

        {/* ── Footer: Follow CTA ── */}
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
