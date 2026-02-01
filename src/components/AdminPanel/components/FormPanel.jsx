import { useState, createContext, useContext } from 'react';
import './FormPanel.css';

// Density context for the entire form
const DensityContext = createContext('default');

export function useDensity() {
  return useContext(DensityContext);
}

/**
 * FormPanel - A SaaS-grade form container with density modes
 * Supports: compact | default | comfortable
 */
export function FormPanel({ 
  children, 
  density = 'default',
  onDensityChange,
  showDensityToggle = true 
}) {
  const [currentDensity, setCurrentDensity] = useState(density);

  const handleDensityChange = (newDensity) => {
    setCurrentDensity(newDensity);
    onDensityChange?.(newDensity);
  };

  return (
    <DensityContext.Provider value={currentDensity}>
      <div className={`form-panel-v2 density-${currentDensity}`}>
        {showDensityToggle && (
          <div className="density-toggle">
            <button 
              className={`density-btn ${currentDensity === 'compact' ? 'active' : ''}`}
              onClick={() => handleDensityChange('compact')}
              title="Compact view"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <button 
              className={`density-btn ${currentDensity === 'default' ? 'active' : ''}`}
              onClick={() => handleDensityChange('default')}
              title="Default view"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
              </svg>
            </button>
            <button 
              className={`density-btn ${currentDensity === 'comfortable' ? 'active' : ''}`}
              onClick={() => handleDensityChange('comfortable')}
              title="Comfortable view"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="5" width="18" height="14" rx="2"/>
              </svg>
            </button>
          </div>
        )}
        <div className="form-panel-content">
          {children}
        </div>
      </div>
    </DensityContext.Provider>
  );
}

/**
 * FormSection - Collapsible section with sticky header
 * Use for grouping related fields
 */
export function FormSection({ 
  title, 
  icon, 
  children, 
  defaultExpanded = true,
  badge,
  variant = 'default' // default | highlight | warning
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={`form-section-v2 ${variant} ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div 
        className="form-section-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="section-title-group">
          {icon && <span className="section-icon">{icon}</span>}
          <h3 className="section-title">{title}</h3>
          {badge && <span className={`section-badge ${badge.type || ''}`}>{badge.text}</span>}
        </div>
        <button className="section-toggle" aria-label={isExpanded ? 'Collapse' : 'Expand'}>
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
      </div>
      <div className="form-section-body">
        {children}
      </div>
    </div>
  );
}

/**
 * StatGrid - Two-column grid for displaying stat fields
 * Perfect for numeric values that need to be compared
 */
export function StatGrid({ children }) {
  return (
    <div className="stat-grid-v2">
      {children}
    </div>
  );
}

/**
 * StatField - Individual stat with icon, label, and large value
 * Use inside StatGrid
 */
export function StatField({ 
  icon, 
  label, 
  value, 
  suffix = '',
  prefix = '',
  delta,
  hint 
}) {
  return (
    <div className="stat-field-v2">
      <div className="stat-field-header">
        {icon && <span className="stat-icon">{icon}</span>}
        <span className="stat-label">{label}</span>
      </div>
      <div className="stat-field-value">
        {prefix && <span className="stat-prefix">{prefix}</span>}
        <span className="stat-number">{value}</span>
        {suffix && <span className="stat-suffix">{suffix}</span>}
        {delta !== undefined && (
          <span className={`stat-delta ${delta >= 0 ? 'positive' : 'negative'}`}>
            {delta >= 0 ? '+' : ''}{delta}
          </span>
        )}
      </div>
      {hint && <p className="stat-hint">{hint}</p>}
    </div>
  );
}

/**
 * FormRow - Horizontal layout for form fields (2, 3, or 4 columns)
 */
export function FormRow({ children, columns = 2 }) {
  return (
    <div className={`form-row-v2 cols-${columns}`}>
      {children}
    </div>
  );
}

/**
 * FormField - Enhanced form field with better typography
 */
export function FormField({ 
  label, 
  icon,
  required,
  hint,
  error,
  children,
  fullWidth = false
}) {
  return (
    <div className={`form-field-v2 ${fullWidth ? 'full-width' : ''} ${error ? 'has-error' : ''}`}>
      <label className="form-field-label">
        {icon && <span className="field-icon">{icon}</span>}
        <span className="label-text">{label}</span>
        {required && <span className="required-mark">*</span>}
      </label>
      <div className="form-field-input">
        {children}
      </div>
      {hint && !error && <p className="field-hint">{hint}</p>}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

/**
 * ImagePreview - Enhanced image preview with upload state
 */
export function ImagePreview({ src, alt = 'Preview', size = 'medium' }) {
  if (!src) return null;
  
  return (
    <div className={`image-preview-v2 size-${size}`}>
      <img src={src} alt={alt} />
    </div>
  );
}

/**
 * InfoCard - Compact card for displaying related data items
 * Use for things like item drops, required items, etc.
 */
export function InfoCard({ 
  icon, 
  title, 
  subtitle, 
  stats,
  actions,
  variant = 'default' // default | highlight | muted
}) {
  return (
    <div className={`info-card-v2 ${variant}`}>
      {icon && (
        <div className="info-card-icon">
          {typeof icon === 'string' ? <img src={icon} alt="" /> : icon}
        </div>
      )}
      <div className="info-card-content">
        <div className="info-card-title">{title}</div>
        {subtitle && <div className="info-card-subtitle">{subtitle}</div>}
        {stats && (
          <div className="info-card-stats">
            {stats.map((stat, i) => (
              <span key={i} className="info-stat">
                {stat.icon && <span className="info-stat-icon">{stat.icon}</span>}
                {stat.value}
              </span>
            ))}
          </div>
        )}
      </div>
      {actions && (
        <div className="info-card-actions">
          {actions}
        </div>
      )}
    </div>
  );
}

/**
 * ToggleField - Styled toggle switch with label
 */
export function ToggleField({ 
  label, 
  checked, 
  onChange, 
  hint,
  icon
}) {
  return (
    <div className="toggle-field-v2">
      <label className="toggle-label">
        <div className="toggle-switch">
          <input 
            type="checkbox" 
            checked={checked} 
            onChange={(e) => onChange(e.target.checked)}
          />
          <span className="toggle-slider"></span>
        </div>
        <div className="toggle-text">
          {icon && <span className="toggle-icon">{icon}</span>}
          <span className="toggle-label-text">{label}</span>
        </div>
      </label>
      {hint && <p className="toggle-hint">{hint}</p>}
    </div>
  );
}

/**
 * QuickStats - Horizontal bar of key statistics
 * Use at top of form for at-a-glance info
 */
export function QuickStats({ stats }) {
  return (
    <div className="quick-stats-v2">
      {stats.map((stat, i) => (
        <div key={i} className={`quick-stat ${stat.highlight ? 'highlight' : ''}`}>
          {stat.icon && <span className="quick-stat-icon">{stat.icon}</span>}
          <div className="quick-stat-content">
            <span className="quick-stat-value">{stat.value}</span>
            <span className="quick-stat-label">{stat.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Divider - Visual separator between form sections
 */
export function Divider({ label }) {
  return (
    <div className="form-divider-v2">
      {label && <span className="divider-label">{label}</span>}
    </div>
  );
}

/**
 * ControlBlock - Sticky operational inputs at top of panel
 * CRITICAL: This is always visible and first thing users see
 */
export function ControlBlock({ children, title }) {
  return (
    <div className="control-block-v2">
      {title && <div className="control-block-title">{title}</div>}
      <div className="control-block-grid">
        {children}
      </div>
    </div>
  );
}

/**
 * ControlInput - Single input within ControlBlock
 * Compact, inline, always editable
 */
export function ControlInput({ 
  label, 
  value, 
  onChange, 
  type = 'number',
  unit = '',
  min,
  max,
  step = 1,
  icon,
  placeholder,
  options // For select type
}) {
  return (
    <div className="control-input-v2">
      <label className="control-input-label">
        {icon && <span className="control-icon">{icon}</span>}
        {label}
        {unit && <span className="control-unit">({unit})</span>}
      </label>
      {type === 'select' ? (
        <select 
          value={value} 
          onChange={(e) => onChange(e.target.value)}
          className="control-select"
        >
          {options?.map((opt, i) => (
            <option key={i} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : (
        <div className="control-input-wrapper">
          {type === 'number' && (
            <button 
              type="button"
              className="stepper-btn stepper-minus"
              onClick={() => onChange(Math.max(min ?? -Infinity, (parseFloat(value) || 0) - step))}
            >−</button>
          )}
          <input 
            type={type}
            value={value}
            onChange={(e) => onChange(type === 'number' ? (parseFloat(e.target.value) || 0) : e.target.value)}
            min={min}
            max={max}
            step={step}
            placeholder={placeholder}
            className="control-input-field"
          />
          {type === 'number' && (
            <button 
              type="button"
              className="stepper-btn stepper-plus"
              onClick={() => onChange(Math.min(max ?? Infinity, (parseFloat(value) || 0) + step))}
            >+</button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * LiveOutput - Real-time calculated values display
 * Shows profit/ROI/rates based on inputs
 */
export function LiveOutput({ outputs }) {
  return (
    <div className="live-output-v2">
      <div className="live-output-header">
        <span className="live-indicator"></span>
        <span className="live-label">Live Calculations</span>
      </div>
      <div className="live-output-grid">
        {outputs.map((output, i) => (
          <div key={i} className={`live-output-item ${output.variant || ''} ${output.highlight ? 'highlight' : ''}`}>
            <span className="live-output-icon">{output.icon}</span>
            <div className="live-output-content">
              <span className="live-output-value">{output.value}</span>
              <span className="live-output-label">{output.label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * InputGrid - Grid layout specifically for control inputs
 * Ensures uniform width and alignment
 */
export function InputGrid({ children, columns = 4 }) {
  return (
    <div className={`input-grid-v2 cols-${columns}`}>
      {children}
    </div>
  );
}

// Export all components
export default {
  FormPanel,
  FormSection,
  StatGrid,
  StatField,
  FormRow,
  FormField,
  ImagePreview,
  InfoCard,
  ToggleField,
  QuickStats,
  Divider,
  ControlBlock,
  ControlInput,
  LiveOutput,
  InputGrid
};
