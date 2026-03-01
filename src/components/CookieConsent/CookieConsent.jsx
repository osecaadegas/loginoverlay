import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './CookieConsent.css';

const COOKIE_KEY = 'cookie_consent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState({
    essential: true,   // Always on — auth, session, language
    analytics: false,   // Vercel Speed Insights, etc.
    functional: false,  // StreamElements, theme preferences
  });

  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_KEY);
    if (!stored) {
      // Small delay so the page loads first
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const saveChoice = (consent) => {
    localStorage.setItem(COOKIE_KEY, JSON.stringify(consent));
    setVisible(false);
  };

  const handleAcceptAll = () => {
    saveChoice({ essential: true, analytics: true, functional: true, timestamp: Date.now() });
  };

  const handleRejectAll = () => {
    saveChoice({ essential: true, analytics: false, functional: false, timestamp: Date.now() });
  };

  const handleSavePreferences = () => {
    saveChoice({ ...preferences, timestamp: Date.now() });
  };

  if (!visible) return null;

  return (
    <div className="cookie-overlay">
      <div className="cookie-banner">
        {/* Cookie icon */}
        <div className="cookie-banner__icon">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-1 4 4 0 0 1-1-5 4 4 0 0 1-4-4Z" />
            <circle cx="7.5" cy="11.5" r="1" fill="currentColor" />
            <circle cx="11" cy="16" r="1" fill="currentColor" />
            <circle cx="15.5" cy="13.5" r="1" fill="currentColor" />
          </svg>
        </div>

        <div className="cookie-banner__content">
          <h3 className="cookie-banner__title">We use cookies 🍪</h3>
          <p className="cookie-banner__text">
            We use cookies and similar technologies to keep you logged in, remember your preferences,
            and improve your experience. You can choose which cookies to accept.
            {' '}
            <Link to="/privacy" className="cookie-banner__link">Privacy Policy</Link>
          </p>

          {/* Settings panel */}
          {showSettings && (
            <div className="cookie-settings">
              <label className="cookie-toggle">
                <span className="cookie-toggle__info">
                  <strong>Essential</strong>
                  <small>Authentication, session, language — always required</small>
                </span>
                <input type="checkbox" checked disabled />
                <span className="cookie-toggle__slider cookie-toggle__slider--locked" />
              </label>

              <label className="cookie-toggle">
                <span className="cookie-toggle__info">
                  <strong>Analytics</strong>
                  <small>Anonymous usage data to improve performance</small>
                </span>
                <input
                  type="checkbox"
                  checked={preferences.analytics}
                  onChange={(e) => setPreferences(p => ({ ...p, analytics: e.target.checked }))}
                />
                <span className="cookie-toggle__slider" />
              </label>

              <label className="cookie-toggle">
                <span className="cookie-toggle__info">
                  <strong>Functional</strong>
                  <small>StreamElements integration, theme &amp; display preferences</small>
                </span>
                <input
                  type="checkbox"
                  checked={preferences.functional}
                  onChange={(e) => setPreferences(p => ({ ...p, functional: e.target.checked }))}
                />
                <span className="cookie-toggle__slider" />
              </label>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="cookie-banner__actions">
          {showSettings ? (
            <button className="cookie-btn cookie-btn--accept" onClick={handleSavePreferences}>
              Save Preferences
            </button>
          ) : (
            <>
              <button className="cookie-btn cookie-btn--accept" onClick={handleAcceptAll}>
                Accept All
              </button>
              <button className="cookie-btn cookie-btn--reject" onClick={handleRejectAll}>
                Reject All
              </button>
              <button
                className="cookie-btn cookie-btn--settings"
                onClick={() => setShowSettings(true)}
              >
                Customize
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Helper hook — other components can check consent status.
 * Usage: const { analytics, functional } = useCookieConsent();
 */
export function useCookieConsent() {
  const [consent, setConsent] = useState({ essential: true, analytics: false, functional: false });

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(COOKIE_KEY));
      if (stored) setConsent(stored);
    } catch { /* defaults */ }
  }, []);

  return consent;
}
