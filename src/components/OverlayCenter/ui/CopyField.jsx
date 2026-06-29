import React, { useCallback, useState } from 'react';

export default function CopyField({
  label,
  value,
  onCopy,
  copied = false,
  copyLabel = 'Copy',
  copiedLabel = 'Copied',
  onRegen,
  regenLabel = 'Regenerate',
  className = '',
}) {
  const [localCopied, setLocalCopied] = useState(false);
  const isCopied = copied || localCopied;

  const handleCopy = useCallback(() => {
    if (onCopy) {
      onCopy();
      return;
    }
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      setLocalCopied(true);
      setTimeout(() => setLocalCopied(false), 1800);
    });
  }, [onCopy, value]);

  return (
    <div className={`oc-ui-copyfield${className ? ` ${className}` : ''}`}>
      {label && <label className="oc-ui-copyfield__label">{label}</label>}
      <div className="oc-ui-copyfield__row">
        <input readOnly value={value || ''} onClick={handleCopy} title="Click to copy" />
        <button type="button" className="oc-ui-btn oc-ui-btn--primary" onClick={handleCopy}>
          {isCopied ? copiedLabel : copyLabel}
        </button>
        {onRegen && (
          <button type="button" className="oc-ui-btn oc-ui-btn--ghost" onClick={onRegen} title="Generate a new OBS URL">
            {regenLabel}
          </button>
        )}
      </div>
    </div>
  );
}
