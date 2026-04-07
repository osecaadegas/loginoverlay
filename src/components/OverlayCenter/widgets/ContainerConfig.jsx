import React, { useState, useMemo } from 'react';
import { getWidgetDef } from './widgetRegistry';

const S = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 12 },
  label: { fontSize: '0.78rem', fontWeight: 600, color: '#e2e8f0', margin: 0 },
  hint: { fontSize: '0.7rem', color: '#64748b', margin: 0, lineHeight: 1.4 },
  row: { display: 'flex', alignItems: 'center', gap: 8 },
  select: {
    flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6, color: '#e2e8f0', padding: '5px 8px', fontSize: '0.78rem',
  },
  input: {
    width: 60, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6, color: '#e2e8f0', padding: '4px 6px', fontSize: '0.78rem', textAlign: 'center',
  },
  colorInput: {
    width: 28, height: 28, padding: 0, border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 6, cursor: 'pointer', background: 'none',
  },
  btn: {
    padding: '5px 10px', fontSize: '0.75rem', fontWeight: 600, borderRadius: 6,
    border: '1px solid rgba(139,92,246,0.4)', background: 'rgba(139,92,246,0.15)',
    color: '#c4b5fd', cursor: 'pointer',
  },
  btnDanger: {
    padding: '3px 8px', fontSize: '0.7rem', borderRadius: 4,
    border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)',
    color: '#fca5a5', cursor: 'pointer',
  },
  childCard: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
    background: 'rgba(255,255,255,0.04)', borderRadius: 6,
    border: '1px solid rgba(255,255,255,0.08)',
  },
  childIcon: { fontSize: 16, flexShrink: 0 },
  childName: { flex: 1, fontSize: '0.78rem', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  arrowBtn: {
    padding: '2px 5px', fontSize: '0.7rem', borderRadius: 4,
    border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
    color: '#94a3b8', cursor: 'pointer', lineHeight: 1,
  },
  emptyMsg: { fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', textAlign: 'center', padding: 12 },
};

export default function ContainerConfig({ config, onChange, allWidgets }) {
  const c = config || {};
  const children = c.children || [];

  const set = (key, val) => onChange({ ...c, [key]: val });
  const setChildren = (newChildren) => onChange({ ...c, children: newChildren });

  // Widgets available to add (not already in this container, not background, not another container)
  const available = useMemo(() => {
    const childSet = new Set(children);
    // Also collect all container children across all containers so a widget can't be in two containers
    const allContainered = new Set();
    (allWidgets || []).forEach(w => {
      if (w.widget_type === 'container' && Array.isArray(w.config?.children)) {
        w.config.children.forEach(id => allContainered.add(id));
      }
    });
    return (allWidgets || []).filter(w =>
      w.widget_type !== 'background' &&
      w.widget_type !== 'container' &&
      !childSet.has(w.id) &&
      !allContainered.has(w.id)
    );
  }, [allWidgets, children]);

  // Resolved child widgets in order
  const resolvedChildren = useMemo(() => {
    return children.map(id => (allWidgets || []).find(w => w.id === id)).filter(Boolean);
  }, [children, allWidgets]);

  const [addId, setAddId] = useState('');

  const handleAdd = () => {
    if (!addId) return;
    setChildren([...children, addId]);
    setAddId('');
  };

  const handleRemove = (id) => {
    setChildren(children.filter(cid => cid !== id));
  };

  const handleMoveUp = (idx) => {
    if (idx <= 0) return;
    const arr = [...children];
    [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
    setChildren(arr);
  };

  const handleMoveDown = (idx) => {
    if (idx >= children.length - 1) return;
    const arr = [...children];
    [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
    setChildren(arr);
  };

  return (
    <div style={S.wrap}>
      {/* Header */}
      <div>
        <p style={S.label}>📦 Container Widget</p>
        <p style={S.hint}>
          Group multiple widgets into a single container. Child widgets are hidden from the main canvas
          and rendered inside this container instead.
        </p>
      </div>

      {/* Layout */}
      <div>
        <p style={S.label}>Layout</p>
        <div style={S.row}>
          {['vertical', 'horizontal', 'free'].map(l => (
            <button
              key={l}
              style={{
                ...S.btn,
                background: (c.layout || 'vertical') === l ? 'rgba(139,92,246,0.35)' : 'rgba(139,92,246,0.1)',
                borderColor: (c.layout || 'vertical') === l ? 'rgba(139,92,246,0.7)' : 'rgba(139,92,246,0.3)',
              }}
              onClick={() => set('layout', l)}
            >
              {l === 'vertical' ? '↕ Vertical' : l === 'horizontal' ? '↔ Horizontal' : '🔲 Free'}
            </button>
          ))}
        </div>
        <p style={S.hint}>
          {(c.layout || 'vertical') === 'free'
            ? 'Free: children use absolute position inside the container.'
            : 'Stack: children flow in order with a configurable gap.'}
        </p>
      </div>

      {/* Gap + Padding */}
      <div style={S.row}>
        <label style={{ ...S.label, flex: '0 0 auto' }}>Gap</label>
        <input
          type="number"
          style={S.input}
          value={c.gap ?? 8}
          min={0}
          max={200}
          onChange={e => set('gap', Number(e.target.value))}
        />
        <label style={{ ...S.label, flex: '0 0 auto' }}>Padding</label>
        <input
          type="number"
          style={S.input}
          value={c.padding ?? 8}
          min={0}
          max={200}
          onChange={e => set('padding', Number(e.target.value))}
        />
      </div>

      {/* Align items */}
      {(c.layout || 'vertical') !== 'free' && (
        <div>
          <p style={S.label}>Align</p>
          <div style={S.row}>
            {['stretch', 'start', 'center', 'end'].map(a => (
              <button
                key={a}
                style={{
                  ...S.btn,
                  fontSize: '0.7rem', padding: '3px 8px',
                  background: (c.alignItems || 'stretch') === a ? 'rgba(139,92,246,0.35)' : 'rgba(139,92,246,0.08)',
                  borderColor: (c.alignItems || 'stretch') === a ? 'rgba(139,92,246,0.7)' : 'rgba(139,92,246,0.2)',
                }}
                onClick={() => set('alignItems', a)}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Background */}
      <div style={S.row}>
        <label style={{ ...S.label, flex: '0 0 auto' }}>Background</label>
        <input
          type="color"
          style={S.colorInput}
          value={c.bgColor || '#0f172a'}
          onChange={e => set('bgColor', e.target.value)}
        />
        <label style={{ ...S.label, flex: '0 0 auto', fontWeight: 400 }}>Opacity</label>
        <input
          type="range"
          min={0}
          max={100}
          value={c.bgOpacity ?? 0}
          onChange={e => set('bgOpacity', Number(e.target.value))}
          style={{ flex: 1 }}
        />
        <span style={{ fontSize: '0.72rem', color: '#94a3b8', width: 30, textAlign: 'right' }}>{c.bgOpacity ?? 0}%</span>
      </div>

      {/* Border Radius */}
      <div style={S.row}>
        <label style={{ ...S.label, flex: '0 0 auto' }}>Corner Radius</label>
        <input
          type="range"
          min={0}
          max={100}
          value={c.cardRadius ?? 0}
          onChange={e => set('cardRadius', Number(e.target.value))}
          style={{ flex: 1 }}
        />
        <span style={{ fontSize: '0.72rem', color: '#94a3b8', width: 30, textAlign: 'right' }}>{c.cardRadius ?? 0}px</span>
      </div>

      {/* Scrollable */}
      <label style={{ ...S.row, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={!!c.scrollable}
          onChange={e => set('scrollable', e.target.checked)}
        />
        <span style={{ fontSize: '0.78rem', color: '#e2e8f0' }}>Scrollable overflow</span>
      </label>

      {/* ── Children ── */}
      <div>
        <p style={S.label}>Child Widgets ({children.length})</p>
      </div>

      {resolvedChildren.length === 0 && (
        <p style={S.emptyMsg}>No widgets added yet. Use the dropdown below to add widgets to this container.</p>
      )}

      {resolvedChildren.map((child, idx) => {
        const def = getWidgetDef(child.widget_type);
        return (
          <div key={child.id} style={S.childCard}>
            <span style={S.childIcon}>{def?.icon || '📦'}</span>
            <span style={S.childName}>{child.label || def?.label || child.widget_type}</span>
            <button style={S.arrowBtn} onClick={() => handleMoveUp(idx)} title="Move up" disabled={idx === 0}>▲</button>
            <button style={S.arrowBtn} onClick={() => handleMoveDown(idx)} title="Move down" disabled={idx === resolvedChildren.length - 1}>▼</button>
            <button style={S.btnDanger} onClick={() => handleRemove(child.id)} title="Remove from container">✕</button>
          </div>
        );
      })}

      {/* Add widget */}
      {available.length > 0 && (
        <div style={S.row}>
          <select style={S.select} value={addId} onChange={e => setAddId(e.target.value)}>
            <option value="">— Select widget to add —</option>
            {available.map(w => {
              const def = getWidgetDef(w.widget_type);
              return (
                <option key={w.id} value={w.id}>
                  {def?.icon || '📦'} {w.label || def?.label || w.widget_type}
                </option>
              );
            })}
          </select>
          <button style={S.btn} onClick={handleAdd} disabled={!addId}>+ Add</button>
        </div>
      )}

      {available.length === 0 && children.length > 0 && (
        <p style={S.hint}>All widgets are either in a container or are containers/backgrounds.</p>
      )}
    </div>
  );
}
