import React from 'react';
import './ActionBar.css';

/**
 * ActionBar - Floating action bar for contextual actions
 * Appears at bottom of screen when items are selected
 */
export default function ActionBar({
  isVisible,
  selectedCount = 0,
  onClearSelection,
  children,
  position = 'bottom', // 'bottom' | 'top'
}) {
  if (!isVisible) return null;

  return (
    <div className={`action-bar action-bar-${position}`}>
      <div className="action-bar-info">
        <span className="action-bar-count">{selectedCount}</span>
        <span className="action-bar-label">selected</span>
        {onClearSelection && (
          <button className="action-bar-clear" onClick={onClearSelection}>
            Clear
          </button>
        )}
      </div>
      <div className="action-bar-actions">
        {children}
      </div>
    </div>
  );
}

/**
 * StickyToolbar - Toolbar that sticks to top when scrolling
 */
export function StickyToolbar({ children, className = '' }) {
  return (
    <div className={`sticky-toolbar ${className}`}>
      {children}
    </div>
  );
}

/**
 * ToolbarGroup - Group of toolbar items
 */
export function ToolbarGroup({ children, align = 'left' }) {
  return (
    <div className={`toolbar-group toolbar-group-${align}`}>
      {children}
    </div>
  );
}

/**
 * ToolbarButton - Button for toolbar
 */
export function ToolbarButton({ 
  icon, 
  label, 
  onClick, 
  variant = 'default', 
  disabled = false,
  active = false,
}) {
  return (
    <button 
      className={`toolbar-btn toolbar-btn-${variant} ${active ? 'active' : ''}`}
      onClick={onClick}
      disabled={disabled}
      type="button"
    >
      {icon && <span className="toolbar-btn-icon">{icon}</span>}
      {label && <span className="toolbar-btn-label">{label}</span>}
    </button>
  );
}

/**
 * ToolbarDivider - Visual separator
 */
export function ToolbarDivider() {
  return <div className="toolbar-divider" />;
}

/**
 * ToolbarSearch - Search input for toolbar
 */
export function ToolbarSearch({ 
  value, 
  onChange, 
  placeholder = 'Search...', 
  onClear,
}) {
  return (
    <div className="toolbar-search">
      <svg className="toolbar-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="toolbar-search-input"
      />
      {value && onClear && (
        <button className="toolbar-search-clear" onClick={onClear} type="button">
          ✕
        </button>
      )}
    </div>
  );
}
