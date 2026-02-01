import { useEffect, useRef } from 'react';
import './SidePanel.css';

/**
 * SidePanel Component for The Life game
 * Slides in from the right side of the screen
 * Used instead of modals for better UX with forms
 */
export function SidePanel({ 
  isOpen, 
  onClose, 
  title, 
  subtitle,
  children,
  footer,
  width = '420px'
}) {
  const panelRef = useRef(null);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="thelife-sidepanel-overlay" onClick={onClose}>
      <div 
        ref={panelRef}
        className="thelife-sidepanel"
        style={{ '--panel-width': width }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="thelife-sidepanel-header">
          <div className="thelife-sidepanel-title-group">
            <h2 className="thelife-sidepanel-title">{title}</h2>
            {subtitle && <p className="thelife-sidepanel-subtitle">{subtitle}</p>}
          </div>
          <button 
            className="thelife-sidepanel-close" 
            onClick={onClose}
            aria-label="Close panel"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="thelife-sidepanel-content">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="thelife-sidepanel-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Pre-built form components for SidePanel
 */
export function PanelSection({ title, children, className = '' }) {
  return (
    <div className={`thelife-panel-section ${className}`}>
      {title && <h3 className="thelife-panel-section-title">{title}</h3>}
      {children}
    </div>
  );
}

export function PanelItemPreview({ icon, name, subtitle, rarity, badge }) {
  return (
    <div className="thelife-panel-item-preview" style={{ '--rarity-color': rarity }}>
      <div className="thelife-panel-item-icon">
        {typeof icon === 'string' && icon.startsWith('http') ? (
          <img src={icon} alt={name} />
        ) : (
          <span>{icon}</span>
        )}
      </div>
      <div className="thelife-panel-item-info">
        <h4>{name}</h4>
        {subtitle && <p style={{ color: rarity || '#8a8d96' }}>{subtitle}</p>}
        {badge && <span className="thelife-panel-item-badge">{badge}</span>}
      </div>
    </div>
  );
}

export function PanelQuantityInput({ 
  value, 
  onChange, 
  min = 1, 
  max = 999, 
  label,
  showMax = true 
}) {
  return (
    <div className="thelife-panel-field">
      {label && <label>{label}</label>}
      <div className="thelife-panel-quantity">
        <button 
          className="qty-btn" 
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
        >−</button>
        <div className="qty-display">
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(Math.min(max, Math.max(min, parseInt(e.target.value) || min)))}
            min={min}
            max={max}
          />
          {showMax && <span className="qty-max">/ {max}</span>}
        </div>
        <button 
          className="qty-btn" 
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
        >+</button>
        <button 
          className="qty-max-btn" 
          onClick={() => onChange(max)}
          disabled={value === max}
        >MAX</button>
      </div>
    </div>
  );
}

export function PanelPriceInput({ value, onChange, label, placeholder = '0' }) {
  return (
    <div className="thelife-panel-field">
      {label && <label>{label}</label>}
      <div className="thelife-panel-price">
        <span className="price-symbol">$</span>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}

export function PanelDurationSelect({ value, onChange, label, options = [6, 12, 24, 48, 72] }) {
  return (
    <div className="thelife-panel-field">
      {label && <label>{label}</label>}
      <div className="thelife-panel-duration">
        {options.map(hours => (
          <button
            key={hours}
            className={`duration-btn ${value === hours.toString() ? 'active' : ''}`}
            onClick={() => onChange(hours.toString())}
          >
            {hours}h
          </button>
        ))}
      </div>
    </div>
  );
}

export function PanelSelectableCard({ 
  selected, 
  onClick, 
  icon, 
  title, 
  subtitle, 
  badge,
  children 
}) {
  return (
    <div 
      className={`thelife-panel-selectable-card ${selected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <div className="card-header">
        {icon && (
          <div className="card-icon">
            {typeof icon === 'string' && icon.startsWith('http') ? (
              <img src={icon} alt={title} />
            ) : (
              <span>{icon}</span>
            )}
          </div>
        )}
        <div className="card-info">
          <h4>{title}</h4>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {badge && <span className="card-badge">{badge}</span>}
      </div>
      {selected && children && (
        <div className="card-content">
          {children}
        </div>
      )}
    </div>
  );
}

export function PanelButton({ 
  onClick, 
  disabled, 
  variant = 'primary', 
  children,
  fullWidth = false 
}) {
  return (
    <button 
      className={`thelife-panel-btn ${variant} ${fullWidth ? 'full-width' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function PanelButtonGroup({ children }) {
  return (
    <div className="thelife-panel-btn-group">
      {children}
    </div>
  );
}

export function PanelRewardPreview({ amount, label, fee }) {
  return (
    <div className="thelife-panel-reward">
      <span className="reward-amount">💰 {label || 'Reward'}: ${amount.toLocaleString()}</span>
      {fee && <span className="reward-fee">({fee}% fee applied)</span>}
    </div>
  );
}
