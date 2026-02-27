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
  {
    target: null,
    title: '8. Connect Profiles 🔌',
    body: 'Open the Navbar widget\'s settings to link your Spotify (Now Playing), Twitch, or Kick accounts. Other widgets can also have connection fields.',
    position: 'center',
    page: 'widgets',
  },

  /* ── Bonus Hunt page ── */
  {
    target: '[data-tour="bonus-hunt-page"]',
    title: '9. Bonus Hunt 🎯',
    body: 'This is where you run your bonus hunts! Add bonuses with name, bet, and slot info. Start the hunt, open bonuses, record results — the overlay widget updates in real-time for your viewers.',
    position: 'float-top',
    page: 'bonus_hunt',
  },

  /* ── Tournament page ── */
  {
    target: '[data-tour="tournament-page"]',
    title: '10. Tournament 🏆',
    body: 'Set up slot battles and tournaments here. Add players, assign slots, track scores, and run brackets. The Tournament widget on your overlay shows the leaderboard live.',
    position: 'float-top',
    page: 'tournament',
  },

  /* ── Library page ── */
  {
    target: '[data-tour="library-page"]',
    title: '11. Library 📚',
    body: 'Every bonus hunt you finish is saved here automatically. Browse your past hunts, view detailed stats and results, and see your full history.',
    position: 'bottom',
    page: 'library',
  },

  /* ── Presets page ── */
  {
    target: '[data-tour="presets-page"]',
    title: '12. Presets — Save Layouts 💾',
    body: 'Save your current widget layout as a preset. Give it a name and click Save — it captures all widget positions, sizes, colors, and styles.',
    position: 'bottom',
    page: 'presets',
  },
  {
    target: '[data-tour="presets-shared"]',
    title: '13. Presets — Load & Share',
    body: 'Load any saved preset to instantly restore a layout. Admins can share presets so all users can pick from ready-made layouts in the Shared section.',
    position: 'top',
    page: 'presets',
  },

  /* ── Submit Slots page ── */
  {
    target: '[data-tour="slots-page"]',
    title: '14. Submit Slots 🎰',
    body: 'Add new slot games to the database. Fill in the name, provider, RTP, volatility, and max win — then use the 🔍 Search button to find an image. An admin will review your submission.',
    position: 'bottom',
    page: 'slots',
  },

  /* ── OBS setup ── */
  {
    target: '[data-tour="obs-url"]',
    title: '15. OBS — Full Overlay',
    body: 'Copy this URL and add it as a Browser Source in OBS (width: 1920, height: 1080). This loads your entire overlay with all widgets in one source.',
    position: 'right',
    page: 'widgets',
  },
  {
    target: null,
    title: '16. OBS — Single Widget',
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
      // Element not found — center the tooltip
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

    // Tooltip position
    const pos = current.position || 'bottom';
    const gap = 14;
    let style = { position: 'fixed' };

    if (pos === 'bottom') {
      style.top = rect.bottom + gap;
      style.left = rect.left + rect.width / 2;
      style.transform = 'translateX(-50%)';
    } else if (pos === 'top') {
      style.bottom = window.innerHeight - rect.top + gap;
      style.left = rect.left + rect.width / 2;
      style.transform = 'translateX(-50%)';
    } else if (pos === 'left') {
      style.top = rect.top + rect.height / 2;
      style.right = window.innerWidth - rect.left + gap;
      style.transform = 'translateY(-50%)';
    } else if (pos === 'right') {
      style.top = rect.top + rect.height / 2;
      style.left = rect.right + gap;
      style.transform = 'translateY(-50%)';
    } else if (pos === 'float-top') {
      // Fixed near top-left of the content area — doesn't block scrolling
      style.top = 80;
      style.right = 40;
      style.transform = 'none';
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
          <div className="gt-dots">
            {STEPS.map((_, i) => (
              <span key={i} className={`gt-dot ${i === step ? 'gt-dot--active' : ''} ${i < step ? 'gt-dot--done' : ''}`} />
            ))}
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
