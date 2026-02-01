import React, { useState, useRef, useEffect } from 'react';
import './InlineEditor.css';

/**
 * InlineEditor - Component for inline editing with save/cancel functionality
 * 
 * @param {Object} props
 * @param {string} props.value - Initial value
 * @param {Function} props.onSave - Callback when saving (receives new value)
 * @param {Function} props.onCancel - Callback when canceling
 * @param {string} props.type - Input type: 'text', 'number', 'textarea', 'select'
 * @param {Array} props.options - Options for select type [{value, label}]
 * @param {string} props.placeholder - Input placeholder
 * @param {boolean} props.autoFocus - Auto focus on mount
 * @param {boolean} props.selectOnFocus - Select all text on focus
 * @param {number} props.min - Min value for number type
 * @param {number} props.max - Max value for number type
 * @param {string} props.className - Additional CSS class
 */
export default function InlineEditor({
  value: initialValue,
  onSave,
  onCancel,
  type = 'text',
  options = [],
  placeholder = '',
  autoFocus = true,
  selectOnFocus = true,
  min,
  max,
  className = '',
  label,
  helperText,
  required = false,
  disabled = false,
  rows = 3,
}) {
  const [value, setValue] = useState(initialValue ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
      if (selectOnFocus && inputRef.current.select) {
        inputRef.current.select();
      }
    }
  }, [autoFocus, selectOnFocus]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && type !== 'textarea') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleSave = async () => {
    if (required && !value.toString().trim()) {
      setError('This field is required');
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      await onSave?.(value);
    } catch (err) {
      setError(err.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setValue(initialValue ?? '');
    setError(null);
    onCancel?.();
  };

  const renderInput = () => {
    const commonProps = {
      ref: inputRef,
      value,
      onChange: (e) => setValue(e.target.value),
      onKeyDown: handleKeyDown,
      placeholder,
      disabled: disabled || isSaving,
      className: `inline-editor-input ${error ? 'has-error' : ''}`,
      'aria-invalid': !!error,
      'aria-describedby': error ? 'inline-editor-error' : undefined,
    };

    switch (type) {
      case 'textarea':
        return <textarea {...commonProps} rows={rows} />;

      case 'select':
        return (
          <select {...commonProps}>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'number':
        return (
          <input
            {...commonProps}
            type="number"
            min={min}
            max={max}
            onChange={(e) => setValue(e.target.valueAsNumber || '')}
          />
        );

      default:
        return <input {...commonProps} type={type} />;
    }
  };

  return (
    <div className={`inline-editor ${className}`}>
      {label && (
        <label className="inline-editor-label">
          {label}
          {required && <span className="required-star">*</span>}
        </label>
      )}

      <div className="inline-editor-field">
        {renderInput()}
      </div>

      {helperText && !error && (
        <p className="inline-editor-helper">{helperText}</p>
      )}

      {error && (
        <p id="inline-editor-error" className="inline-editor-error" role="alert">
          {error}
        </p>
      )}

      <div className="inline-editor-actions">
        <button
          type="button"
          className="inline-editor-btn cancel"
          onClick={handleCancel}
          disabled={isSaving}
        >
          Cancel
        </button>
        <button
          type="button"
          className="inline-editor-btn save"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}

/**
 * InlineEditField - Wrapper component that toggles between display and edit mode
 */
export function InlineEditField({
  value,
  displayValue,
  onSave,
  type = 'text',
  options = [],
  placeholder = 'Click to edit',
  emptyText = 'Not set',
  className = '',
  ...editorProps
}) {
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = async (newValue) => {
    await onSave?.(newValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <InlineEditor
        value={value}
        onSave={handleSave}
        onCancel={handleCancel}
        type={type}
        options={options}
        placeholder={placeholder}
        className={className}
        {...editorProps}
      />
    );
  }

  return (
    <button
      type="button"
      className={`inline-edit-display ${className}`}
      onClick={() => setIsEditing(true)}
      title="Click to edit"
    >
      <span className={!value && !displayValue ? 'empty' : ''}>
        {displayValue || value || emptyText}
      </span>
      <svg
        className="edit-icon"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    </button>
  );
}
