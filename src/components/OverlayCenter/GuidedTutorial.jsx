/**
 * GuidedTutorial.jsx — Step-by-step onboarding tour with spotlight + tooltip.
 *
 * Shows once on first visit, or when triggered via the "🎓 Tutorial" sidebar button.
 * Steps attach to DOM elements by `data-tour="stepKey"` attributes.
 * Steps can specify a `page` field — the tour will auto-navigate between pages.
 * Persists completion in localStorage.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'oc_tutorial_done';

const STEPS = [
  /* ── Welcome ── */
  {
    target: null,
    title: 'Welcome to your Overlay Center! 🎉',
    body: 'This quick tour walks you through every feature — from building your overlay to going live on OBS. Takes about 2 minutes. Press Next to start!',
    position: 'center',
    page: 'widgets',
  },

  /* ── Widgets page ── */
  {
    target: '[data-tour="live-preview"]',
    title: '1. Live Preview Canvas',
    body: 'This is your real-time canvas — it mirrors exactly what your viewers see in OBS. Every change updates here instantly.',
    position: 'bottom',
    page: 'widgets',
  },
  {
    target: '[data-tour="available-widgets"]',
    title: '2. Add Widgets',
    body: 'These grey tiles are all the widgets you can add. Click "+ Add" on any tile to activate it — it will appear on the preview above.',
    position: 'top',
    page: 'widgets',
  },
  {
    target: '[data-tour="active-widgets"]',
    title: '3. Active Widgets',
    body: 'Your active widgets glow green here. Click LIVE/OFF to toggle visibility, click 🗑️ to remove, or drag to reorder layers.',
    position: 'top',
    page: 'widgets',
  },
  {
    target: '[data-tour="tile-gear"]',
    title: '4. Widget Settings ⚙️',
    body: 'Click the gear icon on any active tile to open its settings — change colors, fonts, sizes, content, and even connect accounts like Spotify.',
    position: 'left',
    page: 'widgets',
  },
  {
    target: '[data-tour="preview-drag"]',
    title: '5. Drag & Resize',
    body: 'Click a widget on the canvas to select it. Drag to move, use corner handles to resize. Arrow keys = 1px nudge, Shift+Arrow = 10px.',
    position: 'bottom',
    page: 'widgets',
  },
  {
    target: '[data-tour="sync-colors"]',
    title: '6. Sync Colors 🔗',
    body: 'Set your Navbar\'s colors first, then hit "Sync Colors" to copy the same palette across every widget in one click. Keeps your overlay consistent.',
    position: 'bottom',
    page: 'widgets',
  },
  {
    target: null,
    title: '7. Background & Effects 🎨',
    body: 'Add the "Background" widget and open its settings to pick gradients, images, video, particles, and blur effects for your overlay backdrop.',
    position: 'center',
    page: 'widgets',
  },
  /* ── Profile page ── */
  {
    target: '[data-tour="profile-identity"]',
    title: '8. Your Identity 🪪',
    body: 'Set your display name, motto, and avatar URL. This info is synced to your Navbar and other widgets so viewers always see your branding.',
    position: 'bottom',
    page: 'profile',
  },
  {
    target: '[data-tour="profile-platforms"]',
    title: '9. Connect Platforms 🔗',
    body: 'Enter your Twitch, Kick, YouTube, and Discord usernames. The green dot shows which platforms are connected. These are pushed to your overlay widgets.',
    position: 'right',
    page: 'profile',
  },
  {
    target: '[data-tour="profile-spotify"]',
    title: '10. Spotify 🎵',
    body: 'Click "Connect" to link your Spotify account. Once connected, your Navbar and Spotify Now Playing widgets auto-update with the song you\'re listening to.',
    position: 'left',
    page: 'profile',
  },
  {
    target: '[data-tour="profile-streamelements"]',
    title: '11. StreamElements 🎮',
    body: 'Paste your StreamElements Channel ID and JWT Token, then hit "Test Connection" to verify. This powers the Community Games widget with live viewer data.',
    position: 'left',
    page: 'profile',
  },
  {
    target: '[data-tour="profile-preferences"]',
    title: '12. Preferences ⚙️',
    body: 'Pick your default currency — it\'s used across Bonus Hunt, Tournament, and any widget that shows money values.',
    position: 'left',
    page: 'profile',
  },
  {
    target: '[data-tour="profile-sync"]',
    title: '13. Sync to Widgets 📡',
    body: 'After filling in your profile, hit "Sync All" to push every field (name, avatar, platforms, tokens) into all matching widgets at once. No need to update them one by one.',
    position: 'top',
    page: 'profile',
  },
  {
    target: '[data-tour="profile-obs-guide"]',
    title: '14. OBS Setup Guide 🖥️',
    body: 'Scroll down for a quick checklist to make your overlay pixel-perfect in OBS — browser source dimensions, canvas resolution, and common fixes for blurry overlays.',
    position: 'top',
    page: 'profile',
  },

  /* ── Bonus Hunt page ── */
  {
    target: '[data-tour="bonus-hunt-page"]',
    title: '15. Bonus Hunt 🎯',
    body: 'This is where you run your bonus hunts! Add bonuses with name, bet, and slot info. Start the hunt, open bonuses, record results — the overlay widget updates in real-time for your viewers.',
    position: 'float-top',
    page: 'bonus_hunt',
  },

  /* ── Tournament page ── */
  {
    target: '[data-tour="tournament-page"]',
    title: '16. Tournament 🏆',
    body: 'Set up slot battles and tournaments here. Add players, assign slots, track scores, and run brackets. The Tournament widget on your overlay shows the leaderboard live.',
    position: 'float-top',
    page: 'tournament',
  },

  /* ── Library page ── */
  {
    target: '[data-tour="library-page"]',
    title: '17. Library 📚',
    body: 'Every bonus hunt you finish is saved here automatically. Browse your past hunts, view detailed stats and results, and see your full history.',
    position: 'bottom',
    page: 'library',
  },

  /* ── Presets page ── */
  {
    target: '[data-tour="presets-page"]',
    title: '18. Presets — Save Layouts 💾',
    body: 'Save your current widget layout as a preset. Give it a name and click Save — it captures all widget positions, sizes, colors, and styles.',
    position: 'float-top',
    page: 'presets',
  },
  {
    target: '[data-tour="presets-shared"]',
    title: '19. Presets — Load & Share',
    body: 'Load any saved preset to instantly restore a layout. Admins can share presets so all users can pick from ready-made layouts in the Shared section.',
    position: 'float-top',
    page: 'presets',
  },

  /* ── Submit Slots page ── */
  {
    target: '[data-tour="slots-page"]',
    title: '20. Submit Slots 🎰',
    body: 'Add new slot games to the database. Fill in the name, provider, RTP, volatility, and max win — then use the 🔍 Search button to find an image. An admin will review your submission.',
    position: 'bottom',
    page: 'slots',
  },

  /* ── OBS setup ── */
  {
    target: '[data-tour="obs-url"]',
    title: '21. OBS — Full Overlay',
    body: 'Copy this URL and add it as a Browser Source in OBS (width: 1920, height: 1080). This loads your entire overlay with all widgets in one source.',
    position: 'right',
    page: 'widgets',
  },
  {
    target: null,
    title: '22. OBS — Single Widget',
    body: 'Want just one widget in OBS? Open its settings ⚙️ → expand "OBS Browser Source URL" → copy the link. Add it as a separate Browser Source.',
    position: 'center',
    page: 'widgets',
  },

  /* ── Finish ── */
  {
    target: null,
    title: 'You\'re all set! 🚀',
    body: 'You now know every feature. Restart this tour anytime from the 🎓 Tutorial button in the sidebar. Go build an awesome overlay!',
    position: 'center',
    page: 'widgets',
  },
];

export default function GuidedTutorial({ active, onClose, goToPage }) {
  const [step, setStep] = useState(0);
  const [tooltipStyle, setTooltipStyle] = useState({});
  const [spotlightStyle, setSpotlightStyle] = useState(null);
  const [waitingForPage, setWaitingForPage] = useState(false);

  const current = STEPS[step];
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  /* Navigate to the correct page when step changes */
  useEffect(() => {
    if (!active || !current) return;
    if (current.page && goToPage) {
      goToPage(current.page);
      // Give the page time to render before positioning
      setWaitingForPage(true);
      const timer = setTimeout(() => setWaitingForPage(false), 350);
      return () => clearTimeout(timer);
    }
  }, [active, step]); // eslint-disable-line react-hooks/exhaustive-deps

  const TOOLTIP_W = 360; // matches CSS .gt-tooltip width
  const TOOLTIP_H_EST = 200; // rough max height
  const EDGE_PAD = 16; // min distance from viewport edge

  /* Position the tooltip relative to the target element */
  const positionTooltip = useCallback(() => {
    if (!current || waitingForPage) return;
    const sel = current.target;
    if (!sel || current.position === 'center') {
      setSpotlightStyle(null);
      setTooltipStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      });
      return;
    }

    const el = document.querySelector(sel);
    if (!el) {
      setSpotlightStyle(null);
      setTooltipStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      });
      return;
    }

    const rect = el.getBoundingClientRect();
    const pad = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Spotlight
    setSpotlightStyle({
      top: rect.top - pad,
      left: rect.left - pad,
      width: rect.width + pad * 2,
      height: rect.height + pad * 2,
      borderRadius: 12,
    });

    // Scroll into view
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Tooltip position with viewport clamping
    const pos = current.position || 'bottom';
    const gap = 14;
    let style = { position: 'fixed' };

    if (pos === 'float-top') {
      style.top = 80;
      style.right = 40;
      style.transform = 'none';
    } else if (pos === 'bottom') {
      let top = rect.bottom + gap;
      let left = rect.left + rect.width / 2 - TOOLTIP_W / 2;
      // flip to top if tooltip would overflow bottom
      if (top + TOOLTIP_H_EST > vh - EDGE_PAD) {
        top = Math.max(EDGE_PAD, rect.top - gap - TOOLTIP_H_EST);
      }
      left = Math.max(EDGE_PAD, Math.min(left, vw - TOOLTIP_W - EDGE_PAD));
      style.top = top;
      style.left = left;
    } else if (pos === 'top') {
      let top = rect.top - gap - TOOLTIP_H_EST;
      let left = rect.left + rect.width / 2 - TOOLTIP_W / 2;
      // flip to bottom if tooltip would overflow top
      if (top < EDGE_PAD) {
        top = rect.bottom + gap;
      }
      left = Math.max(EDGE_PAD, Math.min(left, vw - TOOLTIP_W - EDGE_PAD));
      style.top = top;
      style.left = left;
    } else if (pos === 'left') {
      let top = rect.top + rect.height / 2 - TOOLTIP_H_EST / 2;
      let left = rect.left - gap - TOOLTIP_W;
      // flip to right if it overflows left
      if (left < EDGE_PAD) {
        left = rect.right + gap;
      }
      top = Math.max(EDGE_PAD, Math.min(top, vh - TOOLTIP_H_EST - EDGE_PAD));
      style.top = top;
      style.left = left;
    } else if (pos === 'right') {
      let top = rect.top + rect.height / 2 - TOOLTIP_H_EST / 2;
      let left = rect.right + gap;
      // flip to left if it overflows right
      if (left + TOOLTIP_W > vw - EDGE_PAD) {
        left = Math.max(EDGE_PAD, rect.left - gap - TOOLTIP_W);
      }
      top = Math.max(EDGE_PAD, Math.min(top, vh - TOOLTIP_H_EST - EDGE_PAD));
      style.top = top;
      style.left = left;
    }

    setTooltipStyle(style);
  }, [current, waitingForPage]);

  useEffect(() => {
    if (!active || waitingForPage) return;
    positionTooltip();
    const onResize = () => positionTooltip();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [active, step, positionTooltip, waitingForPage]);

  const handleNext = useCallback(() => {
    if (isLast) {
      localStorage.setItem(STORAGE_KEY, 'true');
      onClose();
    } else {
      setStep(s => s + 1);
    }
  }, [isLast, onClose]);

  const handlePrev = useCallback(() => {
    if (!isFirst) setStep(s => s - 1);
  }, [isFirst]);

  const handleSkip = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    onClose();
    // Return to Widgets page on skip
    if (goToPage) goToPage('widgets');
  }, [onClose, goToPage]);

  /* Keyboard navigation */
  useEffect(() => {
    if (!active) return;
    function onKey(e) {
      if (e.key === 'Escape') handleSkip();
      if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, handleNext, handlePrev, handleSkip]);

  // Reset step when activated
  useEffect(() => {
    if (active) setStep(0);
  }, [active]);

  if (!active || !current) return null;

  /* Category label for current step */
  const pageLabels = {
    widgets: 'Widgets',
    profile: 'Profile',
    bonus_hunt: 'Bonus Hunt',
    tournament: 'Tournament',
    library: 'Library',
    presets: 'Presets',
    slots: 'Submit Slots',
  };
  const pageLabel = pageLabels[current.page] || '';

  return (
    <div className="gt-overlay">
      {/* Dark backdrop with spotlight cutout */}
      <div className={`gt-backdrop${current.position === 'float-top' ? ' gt-backdrop--passthrough' : ''}`} onClick={handleSkip} />
      {spotlightStyle && current.position !== 'float-top' && (
        <div className="gt-spotlight" style={spotlightStyle} />
      )}

      {/* Tooltip card */}
      <div className="gt-tooltip" style={tooltipStyle}>
        <div className="gt-tooltip-header">
          <span className="gt-tooltip-step">{step + 1} / {STEPS.length}</span>
          {pageLabel && <span className="gt-tooltip-page">{pageLabel}</span>}
          <button className="gt-tooltip-skip" onClick={handleSkip}>Skip tour ✕</button>
        </div>
        <h3 className="gt-tooltip-title">{current.title}</h3>
        <p className="gt-tooltip-body">{current.body}</p>
        <div className="gt-tooltip-actions">
          <button
            className="gt-btn gt-btn--ghost"
            onClick={handlePrev}
            disabled={isFirst}
          >
            ← Back
          </button>
          <div className="gt-progress">
            <div className="gt-progress-bar">
              <div className="gt-progress-fill" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
            </div>
          </div>
          <button className="gt-btn gt-btn--primary" onClick={handleNext}>
            {isLast ? 'Finish ✓' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Check if user has completed the tutorial */
export function isTutorialDone() {
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

/** Reset tutorial so it shows again */
export function resetTutorial() {
  localStorage.removeItem(STORAGE_KEY);
}
