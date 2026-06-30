import React, { useCallback, useState } from 'react';
import { DarkInput, GlowButton } from './CosmicPrimitives';

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
        <DarkInput readOnly value={value || ''} onClick={handleCopy} title="Click to copy" className="oc-ui-copyfield__input" />
        <GlowButton type="button" className="oc-ui-btn oc-ui-btn--primary" onClick={handleCopy}>
          {isCopied ? copiedLabel : copyLabel}
        </GlowButton>
        {onRegen && (
          <GlowButton type="button" variant="secondary" className="oc-ui-btn oc-ui-btn--ghost" onClick={onRegen} title="Generate a new OBS URL">
            {regenLabel}
          </GlowButton>
        )}
      </div>
    </div>
  );
}
