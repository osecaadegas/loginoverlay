/**
 * Shared ColorPicker component — replaces 6 identical definitions.
 *
 * Usage:
 *   <ColorPicker label="Background" value="#ff0000" onChange={setColor} />
 *   <ColorPicker label="Text" value="#000" onChange={setColor} showHex={false} className="nb-color-item" />
 */
export default function ColorPicker({
  label,
  value,
  onChange,
  showHex = true,
  className = 'nb-color-field',
}) {
  return (
    <label className={className}>
      <input type="color" value={value} onChange={e => onChange(e.target.value)} />
      <span className={showHex ? 'nb-color-label' : undefined}>{label}</span>
      {showHex && <span className="nb-color-hex">{value}</span>}
    </label>
  );
}
