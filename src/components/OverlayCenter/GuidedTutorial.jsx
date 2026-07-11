/**
 * GuidedTutorial.jsx — Step-by-step onboarding tour with spotlight + tooltip.
 *
 * Shows once on first visit, or when triggered from the Overlay Center menu.
 * Steps attach to DOM elements by `data-tour="stepKey"` attributes.
 * Steps can specify a `page` field — the tour will auto-navigate between pages.
 * Persists completion in localStorage.
 */
import React, { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'oc_tutorial_done';

const STEPS = [
  {
    target: null,
    title: 'Start with integrations',
    body: 'The first stop is Integrations. Connect identity, platforms, music, StreamElements and preferences before building the overlay tools.',
    position: 'center',
    page: 'integrations',
  },
  {
    target: '[data-tour="integrations-overview"]',
    title: 'Required services',
    body: 'This area shows which services matter for your selected tools, so you can set up only what the overlay actually needs.',
    position: 'bottom',
    page: 'integrations',
  },
  {
    target: '[data-tour="profile-identity"]',
    title: 'Identity and branding',
    body: 'Set the display name, avatar and identity information that widgets can reuse across the overlay.',
    position: 'bottom',
    page: 'integrations',
  },
  {
    target: '[data-tour="profile-platforms"]',
    title: 'Platform accounts',
    body: 'Add your Twitch, Kick, YouTube and Discord details here. Connected platform data powers chat, requests and viewer-facing widgets.',
    position: 'right',
    page: 'integrations',
  },
  {
    target: '[data-tour="profile-spotify"]',
    title: 'Spotify connection',
    body: 'Connect Spotify when you want music data in Navbar or Spotify Now Playing widgets.',
    position: 'left',
    page: 'integrations',
  },
  {
    target: '[data-tour="profile-streamelements"]',
    title: 'StreamElements connection',
    body: 'Add StreamElements credentials when chat commands, points or request tools need them.',
    position: 'left',
    page: 'integrations',
  },
  {
    target: '[data-tour="profile-sync"]',
    title: 'Sync connected information',
    body: 'After updating profile and integration details, sync them into matching widgets so every tool uses the same source information.',
    position: 'top',
    page: 'integrations',
  },
  {
    target: '[data-tour="tools-page"]',
    title: 'Choose overlay tools',
    body: 'Tools are the widgets that appear on stream. Open an existing tool or add a new one from this page.',
    position: 'bottom',
    page: 'tools',
  },
  {
    target: '[data-tour="your-tools"]',
    title: 'Your active tools',
    body: 'Enabled tools are listed here with readiness status. Use each card to open setup, enable, disable or remove that tool.',
    position: 'bottom',
    page: 'tools',
  },
  {
    target: '[data-tour="add-tools"]',
    title: 'Add more tools',
    body: 'Install new overlay tools from this section. Any missing setup will show as a status warning after the tool is added.',
    position: 'top',
    page: 'tools',
  },
  {
    target: '[data-tour="widget-detail-page"]',
    title: 'Configure one tool at a time',
    body: 'Each tool opens directly to its setup page. Any extra tool-specific sections are shown inside that tool when needed.',
    position: 'float-top',
    page: 'bonus_hunt',
  },
  {
    target: '[data-tour="appearance-page"]',
    title: 'Appearance Center',
    body: 'Use Appearance to edit exact widget instances and style variants without opening a separate Layout page.',
    position: 'float-top',
    page: 'appearance',
  },
  {
    target: '[data-tour="preview-page"]',
    title: 'Preview and OBS',
    body: 'Preview uses the same browser-source route as OBS. Open it, focus it or copy the source URL from this page.',
    position: 'float-top',
    page: 'preview',
  },
  {
    target: '[data-tour="obs-url"]',
    title: 'Copy OBS URL',
    body: 'Copy this URL into OBS as a Browser Source when you are ready to go live.',
    position: 'left',
    page: 'preview',
  },
  {
    target: '[data-tour="library-page"]',
    title: 'Assets and library',
    body: 'Assets contains saved hunts, media and reusable resources connected to your overlay workflow.',
    position: 'float-top',
    page: 'assets',
  },
  {
    target: '[data-tour="presets-page"]',
    title: 'Presets',
    body: 'Save and reuse complete overlay presets once you have a setup you want to keep.',
    position: 'float-top',
    page: 'presets',
  },
  {
    target: '[data-tour="slots-page"]',
    title: 'Submit slots',
    body: 'Submit missing slot metadata here so Bonus Hunt, Current Slot and request tools can use accurate game data.',
    position: 'bottom',
    page: 'slots',
  },
  {
    target: '[data-tour="approvals-page"]',
    title: 'Approvals',
    body: 'Admins can review and approve submitted slot metadata from this page.',
    position: 'float-top',
    page: 'approvals',
  },
  {
    target: null,
    title: 'Tutorial complete',
    body: 'The tour has moved across the actual pages. Restart it any time from More, then Restart tutorial.',
    position: 'center',
    page: 'integrations',
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

  const TOOLTIP_W = 396; // matches CSS .gt-tooltip width
  const TOOLTIP_H_EST = 260; // rough max height
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
    // Return to the onboarding start page on skip.
    if (goToPage) goToPage('integrations');
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

  const pageLabels = {
    home: 'Home',
    integrations: 'Integrations',
    tools: 'Tools',
    appearance: 'Appearance',
    preview: 'Preview',
    assets: 'Assets',
    bonus_hunt: 'Bonus Hunt',
    tournament: 'Tournament',
    bonus_buys: 'Bonus Buys',
    current_slot: 'Current Slot',
    slot_requests: 'Slot Requests',
    library: 'Library',
    presets: 'Presets',
    slots: 'Submit Slots',
    approvals: 'Approvals',
  };
  const pageLabel = pageLabels[current.page] || '';
  const totalSteps = STEPS.length;
  const progressPercent = Math.round(((step + 1) / totalSteps) * 100);
  const nextStep = isLast ? null : STEPS[step + 1];
  const nextPageLabel = nextStep ? pageLabels[nextStep.page] || 'Next Step' : '';
  const stepKind = current.position === 'center'
    ? 'Overview'
    : current.position === 'float-top'
      ? 'Page Focus'
      : 'Spotlight';

  return (
    <div className="gt-overlay">
      {/* Dark backdrop with spotlight cutout */}
      <div className={`gt-backdrop${current.position === 'float-top' ? ' gt-backdrop--passthrough' : ''}`} onClick={handleSkip} />
      {spotlightStyle && current.position !== 'float-top' && (
        <div className="gt-spotlight" style={spotlightStyle} />
      )}

      {/* Tooltip card */}
      <div className={`gt-tooltip gt-tooltip--${current.position || 'bottom'}${waitingForPage ? ' gt-tooltip--waiting' : ''}`} style={tooltipStyle}>
        <div className="gt-tooltip-header">
          <div className="gt-tooltip-badges">
            <span className="gt-tooltip-step">{step + 1} / {totalSteps}</span>
            <span className="gt-tooltip-kind">{stepKind}</span>
            {pageLabel && <span className="gt-tooltip-page">{pageLabel}</span>}
          </div>
          <button className="gt-tooltip-skip" onClick={handleSkip}>Skip tour ✕</button>
        </div>

        <div className="gt-tooltip-kicker">
          <span className="gt-tooltip-kicker-label">Overlay Center Tour</span>
          {waitingForPage && <span className="gt-tooltip-sync">Loading page…</span>}
        </div>

        <h3 className="gt-tooltip-title">{current.title}</h3>
        <p className="gt-tooltip-body">{current.body}</p>

        <div className="gt-tooltip-summary">
          <div className="gt-tooltip-summary-card">
            <span className="gt-tooltip-summary-label">Current Focus</span>
            <strong className="gt-tooltip-summary-value">{pageLabel || 'Overview'}</strong>
          </div>
          <div className="gt-tooltip-summary-card">
            <span className="gt-tooltip-summary-label">Up Next</span>
            <strong className="gt-tooltip-summary-value">{isLast ? 'Complete Tour' : nextPageLabel || 'Next Step'}</strong>
          </div>
        </div>

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
              <div className="gt-progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
          <button className="gt-btn gt-btn--primary" onClick={handleNext}>
            {isLast ? 'Finish ✓' : 'Next →'}
          </button>
        </div>

        <div className="gt-progress-meta">
          <span className="gt-progress-label">{progressPercent}% complete</span>
          {!isLast && <span className="gt-progress-next">Next: {nextStep?.title}</span>}
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
