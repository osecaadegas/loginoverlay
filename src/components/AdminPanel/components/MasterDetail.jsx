import React, { useState, useEffect, useRef } from 'react';
import './MasterDetail.css';

/**
 * MasterDetail - SaaS-style master-detail layout
 * Left side: List/table/grid (master)
 * Right side: Dynamic detail panel
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.master - List/table content
 * @param {React.ReactNode} props.detail - Detail panel content
 * @param {boolean} props.detailOpen - Whether detail panel is visible
 * @param {Function} props.onDetailClose - Close detail panel handler
 * @param {string} props.detailTitle - Title for detail panel
 * @param {string} props.detailWidth - Width of detail panel (default: 480px)
 * @param {boolean} props.stickyDetail - Keep detail panel sticky on scroll
 */
export default function MasterDetail({
  master,
  detail,
  detailOpen = false,
  onDetailClose,
  detailTitle = '',
  detailWidth = '480px',
  stickyDetail = true,
  detailActions,
  className = '',
}) {
  const detailRef = useRef(null);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && detailOpen && onDetailClose) {
        onDetailClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [detailOpen, onDetailClose]);

  // Focus detail panel when opened
  useEffect(() => {
    if (detailOpen && detailRef.current) {
      detailRef.current.focus();
    }
  }, [detailOpen]);

  return (
    <div className={`master-detail ${detailOpen ? 'detail-open' : ''} ${className}`}>
      <div className="master-panel">
        {master}
      </div>
      
      <div 
        className={`detail-panel ${detailOpen ? 'open' : ''} ${stickyDetail ? 'sticky' : ''}`}
        style={{ '--detail-width': detailWidth }}
        ref={detailRef}
        tabIndex={-1}
        role="region"
        aria-label={detailTitle || 'Detail panel'}
      >
        {detailOpen && (
          <>
            <div className="detail-header">
              <h3 className="detail-title">{detailTitle}</h3>
              <button 
                className="detail-close" 
                onClick={onDetailClose}
                aria-label="Close panel"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="detail-body">
              {detail}
            </div>
            {detailActions && (
              <div className="detail-actions">
                {detailActions}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * DetailSection - Section within detail panel
 */
export function DetailSection({ title, children, collapsible = false, defaultOpen = true }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`detail-section ${collapsible ? 'collapsible' : ''} ${isOpen ? 'open' : ''}`}>
      {title && (
        <div 
          className="detail-section-header"
          onClick={collapsible ? () => setIsOpen(!isOpen) : undefined}
          role={collapsible ? 'button' : undefined}
          tabIndex={collapsible ? 0 : undefined}
          onKeyDown={collapsible ? (e) => e.key === 'Enter' && setIsOpen(!isOpen) : undefined}
        >
          <span className="detail-section-title">{title}</span>
          {collapsible && (
            <svg 
              className="collapse-icon" 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          )}
        </div>
      )}
      {(!collapsible || isOpen) && (
        <div className="detail-section-content">
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * DetailField - Field display in detail panel
 */
export function DetailField({ label, value, editable = false, onEdit, type = 'text' }) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleSave = () => {
    if (onEdit) {
      onEdit(editValue);
    }
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(value);
      setEditing(false);
    }
  };

  return (
    <div className="detail-field">
      <label className="detail-field-label">{label}</label>
      {editing ? (
        <div className="detail-field-edit">
          <input
            ref={inputRef}
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className="detail-field-input"
          />
        </div>
      ) : (
        <div 
          className={`detail-field-value ${editable ? 'editable' : ''}`}
          onClick={editable ? () => setEditing(true) : undefined}
          role={editable ? 'button' : undefined}
          tabIndex={editable ? 0 : undefined}
          onKeyDown={editable ? (e) => e.key === 'Enter' && setEditing(true) : undefined}
        >
          {value || <span className="empty-value">Not set</span>}
          {editable && (
            <svg className="edit-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          )}
        </div>
      )}
    </div>
  );
}
