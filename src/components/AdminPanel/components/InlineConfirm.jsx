import React, { useState, useRef, useEffect } from 'react';
import './InlineConfirm.css';

/**
 * InlineConfirm - Replaces confirm() dialogs with inline confirmation
 * Shows a confirmation UI in-place without blocking the page
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Trigger element (button)
 * @param {string} props.message - Confirmation message
 * @param {string} props.confirmText - Confirm button text (default: "Confirm")
 * @param {string} props.cancelText - Cancel button text (default: "Cancel")
 * @param {Function} props.onConfirm - Called when confirmed
 * @param {string} props.variant - 'danger' | 'warning' | 'default'
 */
export default function InlineConfirm({
  children,
  message = 'Are you sure?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  variant = 'danger',
  className = '',
}) {
  const [isConfirming, setIsConfirming] = useState(false);
  const confirmRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    if (!isConfirming) return;
    
    const handleClickOutside = (e) => {
      if (confirmRef.current && !confirmRef.current.contains(e.target)) {
        setIsConfirming(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isConfirming]);

  // Handle escape key
  useEffect(() => {
    if (!isConfirming) return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsConfirming(false);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isConfirming]);

  const handleTriggerClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsConfirming(true);
  };

  const handleConfirm = () => {
    setIsConfirming(false);
    onConfirm?.();
  };

  const handleCancel = () => {
    setIsConfirming(false);
  };

  if (isConfirming) {
    return (
      <div className={`inline-confirm inline-confirm-${variant} ${className}`} ref={confirmRef}>
        <span className="inline-confirm-message">{message}</span>
        <div className="inline-confirm-actions">
          <button 
            className="inline-confirm-cancel" 
            onClick={handleCancel}
            type="button"
          >
            {cancelText}
          </button>
          <button 
            className={`inline-confirm-btn inline-confirm-${variant}`}
            onClick={handleConfirm}
            type="button"
            autoFocus
          >
            {confirmText}
          </button>
        </div>
      </div>
    );
  }

  // Clone child and add click handler
  return React.cloneElement(children, {
    onClick: handleTriggerClick,
  });
}

/**
 * ConfirmButton - Standalone confirm button that shows inline confirmation
 */
export function ConfirmButton({
  label,
  message = 'Are you sure?',
  confirmText = 'Confirm',
  onConfirm,
  variant = 'danger',
  icon,
  disabled = false,
  className = '',
}) {
  const [isConfirming, setIsConfirming] = useState(false);

  if (isConfirming) {
    return (
      <div className={`confirm-button-inline confirm-${variant}`}>
        <span className="confirm-message">{message}</span>
        <button 
          className="confirm-cancel"
          onClick={() => setIsConfirming(false)}
          type="button"
        >
          Cancel
        </button>
        <button 
          className={`confirm-action confirm-${variant}`}
          onClick={() => {
            setIsConfirming(false);
            onConfirm?.();
          }}
          type="button"
        >
          {confirmText}
        </button>
      </div>
    );
  }

  return (
    <button
      className={`confirm-trigger ${className}`}
      onClick={() => setIsConfirming(true)}
      disabled={disabled}
      type="button"
    >
      {icon && <span className="btn-icon">{icon}</span>}
      {label}
    </button>
  );
}

/**
 * useInlineConfirm - Hook for programmatic inline confirmation
 */
export function useInlineConfirm() {
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    message: '',
    onConfirm: null,
    variant: 'danger',
  });

  const confirm = (message, onConfirm, variant = 'danger') => {
    setConfirmState({
      isOpen: true,
      message,
      onConfirm,
      variant,
    });
  };

  const handleConfirm = () => {
    confirmState.onConfirm?.();
    setConfirmState(prev => ({ ...prev, isOpen: false }));
  };

  const handleCancel = () => {
    setConfirmState(prev => ({ ...prev, isOpen: false }));
  };

  const ConfirmUI = confirmState.isOpen ? (
    <div className={`floating-confirm floating-confirm-${confirmState.variant}`}>
      <span>{confirmState.message}</span>
      <div className="floating-confirm-actions">
        <button onClick={handleCancel}>Cancel</button>
        <button onClick={handleConfirm} className="confirm-action">Confirm</button>
      </div>
    </div>
  ) : null;

  return { confirm, ConfirmUI, isConfirming: confirmState.isOpen };
}
