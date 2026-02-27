/**
 * GuidedTutorial.jsx — Step-by-step onboarding tour with spotlight + tooltip.
 *
 * Shows once on first visit, or when triggered via the "🎓 Tutorial" sidebar button.
 * Steps attach to DOM elements by `data-tour="stepKey"` attributes.
 * Persists completion in localStorage.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'oc_tutorial_done';

const STEPS = [
  {
    target: null, // welcome — no element
    title: 'Welcome to your Overlay Center! 🎉',
    body: 'This quick tour will show you how to build, customize, and connect your stream overlay. Takes about 1 minute.',
    position: 'center',
  },
  {
    target: '[data-tour="live-preview"]',
    title: 'Live Preview',
    body: 'This is your real-time canvas. Every change you make updates here instantly — just like OBS.',
    position: 'bottom',
  },
  {
    target: '[data-tour="available-widgets"]',
    title: 'Add Widgets',
    body: 'All available widgets are listed here. Click "+\u00A0Add" on any grey tile to activate it. It will appear on the preview above.',
    position: 'top',
  },
  {
    target: '[data-tour="active-widgets"]',
    title: 'Your Active Widgets',
    body: 'Active widgets show up here with a green glow. Click LIVE/OFF to toggle visibility, or 🗑️ to remove.',
    position: 'top',
  },
  {
    target: '[data-tour="tile-gear"]',
    title: 'Widget Settings ⚙️',
    body: 'Click the gear icon to open any widget\'s settings panel — change colors, fonts, sizes, and content.',
    position: 'left',
  },
  {
    target: '[data-tour="preview-drag"]',
    title: 'Drag & Resize',
    body: 'Click any widget on the preview to select it, then drag to reposition. Use corner handles to resize, or arrow keys for pixel-perfect nudging (Shift = 10px).',
    position: 'bottom',
  },
  {
    target: '[data-tour="sync-colors"]',
    title: 'Sync Colors 🔗',
    body: 'Set up your Navbar\'s colors first, then hit "Sync Colors" to copy the same palette to every other widget in one click.',
    position: 'bottom',
  },
  {
    target: null,
    title: 'Background & Effects 🎨',
    body: 'Add a "Background" widget and open its settings to choose gradients, images, particles, and blur effects for your overlay backdrop.',
    position: 'center',
  },
  {
    target: null,
    title: 'Connect Your Profiles 🔌',
    body: 'Some widgets (like the Navbar) let you link your Spotify, Twitch, or Kick accounts. Open the widget settings and look for the profile/connection fields.',
    position: 'center',
  },
  {
    target: null,
    title: 'Bonus Hunt & Tournament 🎯🏆',
    body: 'Use the Bonus Hunt and Tournament pages in the sidebar to fill in your session data. The matching widgets on the overlay update automatically in real-time.',
    position: 'center',
  },
  {
    target: '[data-tour="obs-url"]',
    title: 'Add to OBS — Full Overlay',
    body: 'Copy the OBS URL from the sidebar and add it as a Browser Source in OBS. This loads your entire overlay in one source.',
    position: 'right',
  },
  {
    target: null,
    title: 'Single Widget in OBS',
    body: 'Want just one widget? Open its settings (⚙️), expand "OBS Browser Source URL", and copy the link. Add it as a separate Browser Source in OBS.',
    position: 'center',
  },
  {
    target: null,
    title: 'You\'re all set! 🚀',
    body: 'You can restart this tutorial anytime from the 🎓 Tutorial button in the sidebar. Now go build something awesome!',
    position: 'center',
  },
];

export default function GuidedTutorial({ active, onClose }) {
  const [step, setStep] = useState(0);
  const [tooltipStyle, setTooltipStyle] = useState({});
  const [spotlightStyle, setSpotlightStyle] = useState(null);
  const rafRef = useRef(null);

  const current = STEPS[step];
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  /* Position the tooltip relative to the target element */
  const positionTooltip = useCallback(() => {
    if (!current) return;
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
    }

    // Clamp to viewport
    setTooltipStyle(style);
  }, [current]);

  useEffect(() => {
    if (!active) return;
    positionTooltip();
    const onResize = () => positionTooltip();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [active, step, positionTooltip]);

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
  }, [onClose]);

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

  return (
    <div className="gt-overlay">
      {/* Dark backdrop with spotlight cutout */}
      <div className="gt-backdrop" onClick={handleSkip} />
      {spotlightStyle && (
        <div className="gt-spotlight" style={spotlightStyle} />
      )}

      {/* Tooltip card */}
      <div className="gt-tooltip" style={tooltipStyle}>
        <div className="gt-tooltip-header">
          <span className="gt-tooltip-step">{step + 1} / {STEPS.length}</span>
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
