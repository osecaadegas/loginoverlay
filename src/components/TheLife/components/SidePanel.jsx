import { useEffect, useRef } from 'react';
import './SidePanel.css';

/* ═══════════════════════════════════════════
   SidePanel – Right-side slide-out panel
   Used for forms, item details, buying/selling
   ═══════════════════════════════════════════ */

export function SidePanel({ isOpen, onClose, title, subtitle, children, footer, width = '420px' }) {
  const panelRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && isOpen) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="sp-overlay" onClick={onClose}>
      <div
        ref={panelRef}
        className="sp"
        style={{ '--sp-w': width }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="sp-header">
          <div className="sp-header__text">
            <h2 className="sp-title">{title}</h2>
            {subtitle && <p className="sp-subtitle">{subtitle}</p>}
          </div>
          <button className="sp-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="sp-body">{children}</div>

        {footer && <div className="sp-footer">{footer}</div>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Sub-components (same API as before)
   ═══════════════════════════════════════════ */

export function PanelSection({ title, children, className = '' }) {
  return (
    <div className={`sp-section ${className}`}>
      {title && <h3 className="sp-section__title">{title}</h3>}
      {children}
    </div>
  );
}

export function PanelItemPreview({ icon, name, subtitle, rarity, badge }) {
  return (
    <div className="sp-item-preview" style={{ '--rarity': rarity }}>
      <div className="sp-item-preview__icon">
        {typeof icon === 'string' && icon.startsWith('http')
          ? <img src={icon} alt={name} />
          : <span>{icon}</span>}
      </div>
      <div className="sp-item-preview__info">
        <h4>{name}</h4>
        {subtitle && <p style={{ color: rarity || '#8a8d96' }}>{subtitle}</p>}
        {badge && <span className="sp-badge">{badge}</span>}
      </div>
    </div>
  );
}

export function PanelQuantityInput({ value, onChange, min = 1, max = 999, label, showMax = true }) {
  return (
    <div className="sp-field">
      {label && <label>{label}</label>}
      <div className="sp-qty">
        <button className="sp-qty__btn" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>−</button>
        <div className="sp-qty__display">
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(Math.min(max, Math.max(min, parseInt(e.target.value) || min)))}
            min={min}
            max={max}
          />
          {showMax && <span className="sp-qty__max">/ {max}</span>}
        </div>
        <button className="sp-qty__btn" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>+</button>
        <button className="sp-qty__maxbtn" onClick={() => onChange(max)} disabled={value === max}>MAX</button>
      </div>
    </div>
  );
}

export function PanelPriceInput({ value, onChange, label, placeholder = '0' }) {
  return (
    <div className="sp-field">
      {label && <label>{label}</label>}
      <div className="sp-price">
        <span className="sp-price__symbol">$</span>
        <input type="number" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      </div>
    </div>
  );
}

export function PanelDurationSelect({ value, onChange, label, options = [6, 12, 24, 48, 72] }) {
  return (
    <div className="sp-field">
      {label && <label>{label}</label>}
      <div className="sp-duration">
        {options.map((h) => (
          <button
            key={h}
            className={`sp-duration__btn${value === h.toString() ? ' sp-duration__btn--active' : ''}`}
            onClick={() => onChange(h.toString())}
          >{h}h</button>
        ))}
      </div>
    </div>
  );
}

export function PanelSelectableCard({ selected, onClick, icon, title, subtitle, badge, children }) {
  return (
    <div className={`sp-selcard${selected ? ' sp-selcard--selected' : ''}`} onClick={onClick}>
      <div className="sp-selcard__header">
        {icon && (
          <div className="sp-selcard__icon">
            {typeof icon === 'string' && icon.startsWith('http')
              ? <img src={icon} alt={title} />
              : <span>{icon}</span>}
          </div>
        )}
        <div className="sp-selcard__info">
          <h4>{title}</h4>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {badge && <span className="sp-selcard__badge">{badge}</span>}
      </div>
      {selected && children && <div className="sp-selcard__content">{children}</div>}
    </div>
  );
}

export function PanelButton({ onClick, disabled, variant = 'primary', children, fullWidth = false }) {
  return (
    <button
      className={`sp-btn sp-btn--${variant}${fullWidth ? ' sp-btn--full' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >{children}</button>
  );
}

export function PanelButtonGroup({ children }) {
  return <div className="sp-btn-group">{children}</div>;
}

export function PanelRewardPreview({ amount, label, fee }) {
  return (
    <div className="sp-reward">
      <span className="sp-reward__amount">💰 {label || 'Reward'}: ${amount.toLocaleString()}</span>
      {fee && <span className="sp-reward__fee">({fee}% fee applied)</span>}
    </div>
  );
}
