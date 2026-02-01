import React, { useState, useRef, useEffect } from 'react';
import './ExpandableRow.css';

/**
 * ExpandableRow - Table row that expands to show inline edit form
 * Replaces modal-based editing with in-place editing
 * 
 * @param {Object} props
 * @param {Array} props.columns - Column data for the row
 * @param {React.ReactNode} props.expandedContent - Content shown when expanded
 * @param {boolean} props.isExpanded - Controlled expansion state
 * @param {Function} props.onToggle - Toggle expansion
 * @param {Function} props.onSelect - Called when row is selected (click without expand)
 * @param {boolean} props.isSelected - Whether row is selected
 */
export default function ExpandableRow({
  columns,
  expandedContent,
  isExpanded = false,
  onToggle,
  onSelect,
  isSelected = false,
  actions,
  className = '',
}) {
  const contentRef = useRef(null);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(isExpanded ? contentRef.current.scrollHeight : 0);
    }
  }, [isExpanded, expandedContent]);

  return (
    <>
      <tr 
        className={`expandable-row ${isExpanded ? 'expanded' : ''} ${isSelected ? 'selected' : ''} ${className}`}
        onClick={onSelect}
      >
        {columns.map((col, idx) => (
          <td key={idx} className={col.className}>
            {col.content}
          </td>
        ))}
        {actions && (
          <td className="row-actions" onClick={(e) => e.stopPropagation()}>
            {actions}
          </td>
        )}
        {onToggle && (
          <td className="expand-toggle" onClick={(e) => { e.stopPropagation(); onToggle(); }}>
            <button className="expand-btn" aria-expanded={isExpanded} aria-label="Expand row">
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </td>
        )}
      </tr>
      {expandedContent && (
        <tr className={`expanded-content-row ${isExpanded ? 'open' : ''}`}>
          <td colSpan={columns.length + (actions ? 1 : 0) + (onToggle ? 1 : 0)}>
            <div 
              className="expanded-content-wrapper"
              style={{ height: contentHeight }}
            >
              <div ref={contentRef} className="expanded-content">
                {expandedContent}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/**
 * ListItem - Expandable list item for non-table layouts
 */
export function ListItem({
  title,
  subtitle,
  meta,
  icon,
  expandedContent,
  actions,
  isSelected = false,
  onSelect,
  badge,
  className = '',
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const contentRef = useRef(null);

  return (
    <div 
      className={`list-item ${isExpanded ? 'expanded' : ''} ${isSelected ? 'selected' : ''} ${className}`}
      onClick={onSelect}
    >
      <div className="list-item-main">
        {icon && <div className="list-item-icon">{icon}</div>}
        <div className="list-item-content">
          <div className="list-item-header">
            <span className="list-item-title">{title}</span>
            {badge && <span className={`list-item-badge badge-${badge.type || 'default'}`}>{badge.text}</span>}
          </div>
          {subtitle && <span className="list-item-subtitle">{subtitle}</span>}
          {meta && <div className="list-item-meta">{meta}</div>}
        </div>
        <div className="list-item-actions" onClick={(e) => e.stopPropagation()}>
          {actions}
          {expandedContent && (
            <button 
              className="list-item-expand" 
              onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
              aria-expanded={isExpanded}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          )}
        </div>
      </div>
      {expandedContent && isExpanded && (
        <div className="list-item-expanded" ref={contentRef}>
          {expandedContent}
        </div>
      )}
    </div>
  );
}

/**
 * CardGrid - Grid of expandable cards
 */
export function CardGrid({ children, columns = 3 }) {
  return (
    <div className="card-grid" style={{ '--grid-columns': columns }}>
      {children}
    </div>
  );
}

/**
 * Card - Individual card that can expand inline
 */
export function Card({
  title,
  subtitle,
  image,
  icon,
  badge,
  actions,
  children,
  expandedContent,
  isSelected = false,
  onSelect,
  className = '',
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div 
      className={`admin-card ${isExpanded ? 'expanded' : ''} ${isSelected ? 'selected' : ''} ${className}`}
      onClick={onSelect}
    >
      {image && (
        <div className="card-image">
          <img src={image} alt={title} />
          {badge && <span className={`card-badge badge-${badge.type || 'default'}`}>{badge.text}</span>}
        </div>
      )}
      <div className="card-body">
        <div className="card-header">
          {icon && <span className="card-icon">{icon}</span>}
          <div className="card-titles">
            <h4 className="card-title">{title}</h4>
            {subtitle && <p className="card-subtitle">{subtitle}</p>}
          </div>
        </div>
        {children && <div className="card-content">{children}</div>}
        {(actions || expandedContent) && (
          <div className="card-footer" onClick={(e) => e.stopPropagation()}>
            {actions}
            {expandedContent && (
              <button 
                className="card-expand-btn"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? 'Collapse' : 'Edit'}
              </button>
            )}
          </div>
        )}
      </div>
      {expandedContent && isExpanded && (
        <div className="card-expanded">
          {expandedContent}
        </div>
      )}
    </div>
  );
}
