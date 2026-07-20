import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Check,
  Eye,
  EyeOff,
  Italic,
  Lock,
  RotateCcw,
  Type,
  Unlock,
} from 'lucide-react';
import { FONT_OPTIONS, RESET_VALUE, validateEditorValue } from './editorSchema';

function optionValue(option) {
  return typeof option === 'object' ? option.value : option;
}

function optionLabel(option) {
  return typeof option === 'object' ? option.label || option.value : String(option);
}

function iconForSegment(value) {
  if (value === 'left') return <AlignLeft size={15} />;
  if (value === 'center') return <AlignCenter size={15} />;
  if (value === 'right') return <AlignRight size={15} />;
  if (value === 'italic') return <Italic size={15} />;
  return null;
}

export function ControlShell({ control, value, inheritedLabel, children, onReset, disabled = false }) {
  return (
    <label className={`ve-control${disabled ? ' ve-control--disabled' : ''}`}>
      <span className="ve-control__header">
        <span>
          {control.label}
          {control.help && <small>{control.help}</small>}
        </span>
        <span className="ve-control__meta">
          {inheritedLabel && <em>{inheritedLabel}</em>}
          {onReset && (
            <button
              type="button"
              className="ve-icon-button ve-icon-button--small"
              onClick={onReset}
              disabled={disabled || value === undefined}
              aria-label={`Reset ${control.label}`}
              title={`Reset ${control.label}`}
            >
              <RotateCcw size={14} />
            </button>
          )}
        </span>
      </span>
      {children}
    </label>
  );
}

export function ColorControl({ control, value, onChange, onReset, inheritedLabel, disabled }) {
  const resolved = typeof value === 'string' && value ? value : '#ffffff';
  const textValue = typeof value === 'string' ? value : '';
  return (
    <ControlShell control={control} value={value} onReset={onReset} inheritedLabel={inheritedLabel} disabled={disabled}>
      <div className="ve-color-control">
        <input
          type="color"
          value={/^#[0-9a-f]{6}$/i.test(resolved) ? resolved : '#ffffff'}
          onChange={event => onChange(validateEditorValue(control, event.target.value))}
          disabled={disabled}
          aria-label={control.label}
        />
        <input
          type="text"
          value={textValue}
          onChange={event => onChange(validateEditorValue(control, event.target.value))}
          placeholder="#ffffff or rgba(...)"
          disabled={disabled}
        />
      </div>
    </ControlShell>
  );
}

export function RangeControl({ control, value, onChange, onReset, inheritedLabel, disabled }) {
  const current = value === undefined || value === '' ? control.min ?? 0 : Number(value);
  return (
    <ControlShell control={control} value={value} onReset={onReset} inheritedLabel={inheritedLabel} disabled={disabled}>
      <div className="ve-range-control">
        <input
          type="range"
          min={control.min}
          max={control.max}
          step={control.step || 1}
          value={Number.isFinite(current) ? current : control.min ?? 0}
          onChange={event => onChange(validateEditorValue(control, event.target.value))}
          disabled={disabled}
        />
        <input
          type="number"
          min={control.min}
          max={control.max}
          step={control.step || 1}
          value={Number.isFinite(current) ? current : ''}
          onChange={event => onChange(validateEditorValue(control, event.target.value))}
          disabled={disabled}
          aria-label={`${control.label} exact value`}
        />
        {control.unit && <span>{control.unit}</span>}
      </div>
    </ControlShell>
  );
}

export function SelectControl({ control, value, onChange, onReset, inheritedLabel, disabled }) {
  const options = control.type === 'font' ? FONT_OPTIONS : control.options || [];
  if (control.type === 'font') {
    return (
      <ControlShell control={control} value={value} onReset={onReset} inheritedLabel={inheritedLabel} disabled={disabled}>
        <FontSelectInput
          value={value}
          options={options}
          onChange={nextValue => onChange(validateEditorValue(control, nextValue))}
          disabled={disabled}
          inheritedLabel="Use inherited"
        />
      </ControlShell>
    );
  }
  return (
    <ControlShell control={control} value={value} onReset={onReset} inheritedLabel={inheritedLabel} disabled={disabled}>
      <select
        value={value ?? ''}
        onChange={event => onChange(validateEditorValue(control, event.target.value))}
        disabled={disabled}
        style={control.type === 'font' ? { fontFamily: value || undefined } : undefined}
      >
        <option value="">Use inherited</option>
        {options.map(option => (
          <option
            key={optionValue(option)}
            value={optionValue(option)}
            style={control.type === 'font' ? { fontFamily: optionValue(option) } : undefined}
          >
            {optionLabel(option)}
          </option>
        ))}
      </select>
    </ControlShell>
  );
}

export function FontSelectInput({
  value,
  options = FONT_OPTIONS,
  onChange,
  disabled = false,
  inheritedLabel = '',
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const selectedOption = useMemo(
    () => options.find(option => optionValue(option) === value),
    [options, value]
  );
  const selectedLabel = selectedOption ? optionLabel(selectedOption) : (inheritedLabel || 'Choose font');
  const selectedFont = selectedOption ? optionValue(selectedOption) : undefined;

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event) => {
      if (!wrapRef.current?.contains(event.target)) setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div className={`ve-font-select ${className}`.trim()} ref={wrapRef}>
      <button
        type="button"
        className="ve-font-select__button"
        onClick={() => setOpen(current => !current)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={selectedFont ? { fontFamily: selectedFont } : undefined}
      >
        <span>{selectedLabel}</span>
        <em aria-hidden="true">v</em>
      </button>
      {open && (
        <div className="ve-font-select__menu" role="listbox" aria-label="Font choices">
          {inheritedLabel && (
            <button
              type="button"
              className={`ve-font-select__option${!value ? ' is-selected' : ''}`}
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
              role="option"
              aria-selected={!value}
            >
              {inheritedLabel}
            </button>
          )}
          {options.map(option => {
            const nextValue = optionValue(option);
            const label = optionLabel(option);
            const selected = nextValue === value;
            return (
              <button
                key={nextValue}
                type="button"
                className={`ve-font-select__option${selected ? ' is-selected' : ''}`}
                onClick={() => {
                  onChange(nextValue);
                  setOpen(false);
                }}
                role="option"
                aria-selected={selected}
                style={{ fontFamily: nextValue }}
              >
                <span>{label}</span>
                {selected && <Check size={14} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SegmentedControl({ control, value, onChange, onReset, inheritedLabel, disabled }) {
  const options = control.options || [];
  return (
    <ControlShell control={control} value={value} onReset={onReset} inheritedLabel={inheritedLabel} disabled={disabled}>
      <div className="ve-segmented" role="group" aria-label={control.label}>
        {options.map(option => {
          const val = optionValue(option);
          const active = value === val;
          return (
            <button
              key={val}
              type="button"
              className={active ? 'is-active' : ''}
              onClick={() => onChange(validateEditorValue(control, val))}
              disabled={disabled}
              aria-pressed={active}
            >
              {iconForSegment(val)}
              <span>{optionLabel(option)}</span>
            </button>
          );
        })}
      </div>
    </ControlShell>
  );
}

export function ToggleValueControl({ control, value, onChange, onReset, inheritedLabel, disabled }) {
  const active = value === control.onValue;
  return (
    <ControlShell control={control} value={value} onReset={onReset} inheritedLabel={inheritedLabel} disabled={disabled}>
      <button
        type="button"
        className={`ve-toggle-value${active ? ' is-active' : ''}`}
        onClick={() => onChange(active ? control.offValue : control.onValue)}
        disabled={disabled}
        aria-pressed={active}
      >
        <span>{active ? <Check size={15} /> : <Type size={15} />}</span>
        {active ? 'On' : 'Off'}
      </button>
    </ControlShell>
  );
}

export function TextControl({ control, value, onChange, onReset, inheritedLabel, disabled }) {
  return (
    <ControlShell control={control} value={value} onReset={onReset} inheritedLabel={inheritedLabel} disabled={disabled}>
      <input
        type="text"
        value={value ?? ''}
        onChange={event => onChange(event.target.value || RESET_VALUE)}
        disabled={disabled}
        placeholder="Use inherited"
      />
    </ControlShell>
  );
}

export function PropertyControl({ control, value, onChange, onReset, inheritedLabel, disabled }) {
  if (!control) return null;
  if (control.type === 'color') return <ColorControl control={control} value={value} onChange={onChange} onReset={onReset} inheritedLabel={inheritedLabel} disabled={disabled} />;
  if (control.type === 'range' || control.type === 'number') return <RangeControl control={control} value={value} onChange={onChange} onReset={onReset} inheritedLabel={inheritedLabel} disabled={disabled} />;
  if (control.type === 'font' || control.type === 'select') return <SelectControl control={control} value={value} onChange={onChange} onReset={onReset} inheritedLabel={inheritedLabel} disabled={disabled} />;
  if (control.type === 'segmented') return <SegmentedControl control={control} value={value} onChange={onChange} onReset={onReset} inheritedLabel={inheritedLabel} disabled={disabled} />;
  if (control.type === 'toggle-value') return <ToggleValueControl control={control} value={value} onChange={onChange} onReset={onReset} inheritedLabel={inheritedLabel} disabled={disabled} />;
  return <TextControl control={control} value={value} onChange={onChange} onReset={onReset} inheritedLabel={inheritedLabel} disabled={disabled} />;
}

export function LayerToggleButton({ active, onClick, label, type = 'visible' }) {
  const Icon = type === 'locked' ? (active ? Lock : Unlock) : (active ? Eye : EyeOff);
  return (
    <button
      type="button"
      className={`ve-icon-button ve-icon-button--small${active ? ' is-active' : ''}`}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <Icon size={14} />
    </button>
  );
}
