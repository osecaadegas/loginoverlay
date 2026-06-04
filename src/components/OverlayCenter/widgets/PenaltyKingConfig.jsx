/**
 * Config panel for the Penalty King overlay widget.
 * Allows the streamer to link their Supabase user ID
 * so the overlay knows which game session to display.
 */
export default function PenaltyKingConfig({ config = {}, onChange }) {
  function handleChange(key, value) {
    if (onChange) onChange({ ...config, [key]: value });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ fontSize: '0.75rem', color: 'var(--theme-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Streamer User ID
        </label>
        <input
          type="text"
          value={config.streamer_id ?? ''}
          onChange={e => handleChange('streamer_id', e.target.value.trim())}
          placeholder="Your Supabase user UUID"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '6px',
            padding: '8px 10px',
            color: 'inherit',
            fontSize: '0.875rem',
            width: '100%',
            boxSizing: 'border-box',
          }}
        />
        <span style={{ fontSize: '0.7rem', color: 'var(--theme-muted, #64748b)' }}>
          Found in your Penalty King admin page under Streamer User ID.
        </span>
      </div>
    </div>
  );
}
