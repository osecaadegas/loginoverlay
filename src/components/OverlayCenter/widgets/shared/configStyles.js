/**
 * Shared inline styles for config panels (SingleSlotConfig, BonusBuysConfig, etc.)
 *
 * Usage:
 *   import { configStyles } from './shared/configStyles';
 *   const S = configStyles('#7c3aed'); // pass accent color
 */
export function configStyles(accent = '#3b82f6') {
  return {
    section: { marginBottom: 16 },
    label: {
      display: 'block', fontSize: '0.78rem', color: '#a0a0b4', fontWeight: 600,
      marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em',
    },
    input: {
      width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
      color: '#fff', fontSize: '0.82rem', boxSizing: 'border-box',
    },
    select: {
      width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
      color: '#fff', fontSize: '0.82rem', boxSizing: 'border-box',
    },
    btn: {
      padding: '8px 16px', borderRadius: 8, border: 'none', fontWeight: 600,
      fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s',
    },
    tabs: {
      display: 'flex', gap: 4, marginBottom: 14,
      borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 2,
    },
    tab: (active) => ({
      padding: '6px 12px', borderRadius: '8px 8px 0 0', border: 'none',
      cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
      background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
      color: active ? '#fff' : '#a0a0b4',
      borderBottom: active ? `2px solid ${accent}` : '2px solid transparent',
    }),
    msg: {
      padding: '6px 10px', borderRadius: 8, fontSize: '0.78rem',
      marginTop: 8, background: 'rgba(255,255,255,0.04)',
    },
    searchResult: (selected) => ({
      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
      borderRadius: 8, cursor: 'pointer',
      background: selected ? `${accent}26` : 'rgba(255,255,255,0.03)',
      border: `1px solid ${selected ? `${accent}4D` : 'rgba(255,255,255,0.06)'}`,
    }),
    statRow: {
      display: 'flex', justifyContent: 'space-between', padding: '6px 0',
      borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '0.82rem',
    },
    statLabel: { color: '#a0a0b4' },
    statValue: { color: '#fff', fontWeight: 700 },
  };
}
