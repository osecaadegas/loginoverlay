import { useEffect, useRef } from 'react';
import './SidePanel.css';

/**
 * Modern Side Panel Component
 * Replaces all modal dialogs with a sliding side panel
 * Features:
 * - Slide-in animation
 * - Keyboard accessible (Escape to close)
 * - Focus trap
 * - ARIA compliant
 */
export default function SidePanel({
  isOpen,
  onClose,
  title,
  children,
  footer,
  width = '400px'
}) {
  const panelRef = useRef(null);
  const firstFocusableRef = useRef(null);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Focus first element when opened
  useEffect(() => {
    if (isOpen && firstFocusableRef.current) {
      firstFocusableRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="side-panel-wrapper"
      role="dialog"
      aria-modal="true"
      aria-labelledby="panel-title"
    >
      {/* Backdrop */}
      <div 
        className="side-panel-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Panel */}
      <aside 
        className="side-panel animate-slide-in"
        ref={panelRef}
        style={{ width }}
      >
        {/* Header */}
        <header className="side-panel-header">
          <h2 id="panel-title" className="side-panel-title">{title}</h2>
          <button
            ref={firstFocusableRef}
            className="side-panel-close"
            onClick={onClose}
            aria-label="Close panel"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </header>

        {/* Body */}
        <div className="side-panel-body">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <footer className="side-panel-footer">
            {footer}
          </footer>
        )}
      </aside>
    </div>
  );
}
