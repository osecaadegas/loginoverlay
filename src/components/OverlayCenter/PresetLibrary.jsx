/**
 * PresetLibrary.jsx — Full-page preset gallery with live overlay previews.
 * Shows both personal (globalPresets) and shared presets as visual cards.
 */
import React, { useState, useMemo, memo, useCallback } from 'react';
import { getWidgetDef } from './widgets/widgetRegistry';

// Register built-in widgets (idempotent)
import './widgets/builtinWidgets';

const CANVAS_W = 1920;
const CANVAS_H = 1080;
const THUMB_SCALE = 0.145; // scale factor for thumbnail

/* ─── Mini overlay renderer for preview thumbnails ─── */
const PreviewSlotMini = memo(function PreviewSlotMini({ snap, theme }) {
  const def = getWidgetDef(snap.widget_type);
  const Component = def?.component;
  if (!Component || snap.is_visible === false) return null;

  return (
    <div style={{
      position: 'absolute',
      left: snap.position_x ?? 0,
      top: snap.position_y ?? 0,
      width: snap.width ?? 300,
      height: snap.height ?? 200,
      zIndex: snap.z_index || 1,
      pointerEvents: 'none',
    }}>
      <Component config={snap.config || {}} theme={theme} allWidgets={[]} />
    </div>
  );
});

const PresetThumbnail = memo(function PresetThumbnail({ snapshot, theme }) {
  const visibleSnaps = useMemo(
    () => (snapshot || []).filter(s => s.is_visible !== false),
    [snapshot]
  );

  return (
    <div className="pl-thumb-wrap">
      <div className="pl-thumb-canvas" style={{
        width: CANVAS_W,
        height: CANVAS_H,
        transform: `scale(${THUMB_SCALE})`,
        transformOrigin: 'top left',
        position: 'relative',
        background: '#0a0a14',
      }}>
        {visibleSnaps.map((snap, i) => (
          <PreviewSlotMini key={snap.id || i} snap={snap} theme={theme} />
        ))}
        {visibleSnaps.length === 0 && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.2)', fontSize: 32, fontFamily: 'Inter, sans-serif',
          }}>
            Empty
          </div>
        )}
      </div>
    </div>
  );
});

/* ─── Preset Card ─── */
function PresetCard({
  preset, type, theme, isAdmin,
  onLoad, onDelete, onShare, onUnshare,
}) {
  const [hovered, setHovered] = useState(false);
  const name = preset.name || 'Untitled';
  const date = preset.savedAt
    ? new Date(preset.savedAt)
    : preset.created_at
      ? new Date(preset.created_at)
      : null;
  const snapshot = preset.snapshot || [];
  const widgetCount = snapshot.filter(s => s.is_visible !== false).length;
  const widgetTypes = [...new Set(snapshot.map(s => {
    const def = getWidgetDef(s.widget_type);
    return def?.icon || '🧩';
  }))];

  return (
    <div
      className={`pl-card ${hovered ? 'pl-card--hover' : ''} ${type === 'shared' ? 'pl-card--shared' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Preview thumbnail */}
      <div className="pl-card__preview">
        <PresetThumbnail snapshot={snapshot} theme={theme} />
        {type === 'shared' && (
          <span className="pl-card__badge pl-card__badge--shared">🌐 Shared</span>
        )}
        {type === 'personal' && (
          <span className="pl-card__badge pl-card__badge--personal">👤 Mine</span>
        )}
      </div>

      {/* Info */}
      <div className="pl-card__body">
        <div className="pl-card__header">
          <h3 className="pl-card__name">{name}</h3>
          {date && (
            <span className="pl-card__date">{date.toLocaleDateString()}</span>
          )}
        </div>

        <div className="pl-card__meta">
          <span className="pl-card__widget-count">
            {widgetTypes.slice(0, 6).join(' ')} · {widgetCount} widget{widgetCount !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Actions */}
        <div className="pl-card__actions">
          <button className="pl-card__btn pl-card__btn--load" onClick={() => onLoad(preset)}>
            ▶ Load
          </button>
          {type === 'personal' && isAdmin && onShare && (
            <button className="pl-card__btn pl-card__btn--share" onClick={() => onShare(preset)} title="Share with everyone">
              🌐 Share
            </button>
          )}
          {type === 'shared' && isAdmin && onUnshare && (
            <button className="pl-card__btn pl-card__btn--unshare" onClick={() => onUnshare(preset.id)} title="Remove from shared">
              Unshare
            </button>
          )}
          {((type === 'personal' && onDelete) || (type === 'shared' && isAdmin && onDelete)) && (
            <button className="pl-card__btn pl-card__btn--delete" onClick={() => onDelete(type === 'shared' ? preset.id : preset.name)} title="Delete">
              🗑️
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Library Component ─── */
export default function PresetLibrary({
  widgets, theme, isAdmin,
  globalPresets, sharedPresets,
  onLoadPreset, onDeletePreset,
  onSharePreset, onUnsharePreset,
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | personal | shared
  const [sortBy, setSortBy] = useState('newest');

  const allPresets = useMemo(() => {
    const personal = (globalPresets || []).map(p => ({ ...p, _type: 'personal' }));
    const shared = (sharedPresets || []).map(p => ({ ...p, _type: 'shared' }));
    return [...shared, ...personal];
  }, [globalPresets, sharedPresets]);

  const filtered = useMemo(() => {
    let list = allPresets;

    // Filter by type
    if (filter === 'personal') list = list.filter(p => p._type === 'personal');
    if (filter === 'shared') list = list.filter(p => p._type === 'shared');

    // Search by name
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => (p.name || '').toLowerCase().includes(q));
    }

    // Sort
    list = [...list].sort((a, b) => {
      const dateA = a.savedAt || new Date(a.created_at).getTime() || 0;
      const dateB = b.savedAt || new Date(b.created_at).getTime() || 0;
      if (sortBy === 'newest') return dateB - dateA;
      if (sortBy === 'oldest') return dateA - dateB;
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'widgets') {
        const countA = (a.snapshot || []).filter(s => s.is_visible !== false).length;
        const countB = (b.snapshot || []).filter(s => s.is_visible !== false).length;
        return countB - countA;
      }
      return 0;
    });

    return list;
  }, [allPresets, filter, search, sortBy]);

  const handleDeletePersonal = useCallback((name) => {
    if (onDeletePreset) onDeletePreset(name);
  }, [onDeletePreset]);

  const handleDeleteShared = useCallback((id) => {
    if (onUnsharePreset) onUnsharePreset(id);
  }, [onUnsharePreset]);

  const personalCount = (globalPresets || []).length;
  const sharedCount = (sharedPresets || []).length;
  const totalCount = personalCount + sharedCount;

  return (
    <div className="pl-page">
      {/* Header */}
      <div className="pl-header">
        <div className="pl-header__top">
          <h2 className="pl-header__title">💾 Preset Library</h2>
          <span className="pl-header__count">{totalCount} preset{totalCount !== 1 ? 's' : ''}</span>
        </div>
        <p className="pl-header__subtitle">
          Browse, preview and load your overlay presets. Each card shows a live preview of how the overlay looks.
        </p>
      </div>

      {/* Toolbar */}
      <div className="pl-toolbar">
        <div className="pl-toolbar__search">
          <span className="pl-toolbar__search-icon">🔍</span>
          <input
            className="pl-toolbar__search-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search presets…"
          />
        </div>

        <div className="pl-toolbar__filters">
          {[
            { key: 'all', label: `All (${totalCount})` },
            { key: 'personal', label: `Mine (${personalCount})` },
            { key: 'shared', label: `Shared (${sharedCount})` },
          ].map(f => (
            <button
              key={f.key}
              className={`pl-toolbar__filter ${filter === f.key ? 'pl-toolbar__filter--active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <select
          className="pl-toolbar__sort"
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name">A → Z</option>
          <option value="widgets">Most widgets</option>
        </select>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="pl-empty">
          <span className="pl-empty__icon">📭</span>
          <h3 className="pl-empty__title">No presets found</h3>
          <p className="pl-empty__text">
            {search ? 'Try a different search term.' : 'Save your first preset from the sidebar to get started.'}
          </p>
        </div>
      ) : (
        <div className="pl-grid">
          {filtered.map((preset, idx) => (
            <PresetCard
              key={preset.id || preset.name || idx}
              preset={preset}
              type={preset._type}
              theme={theme}
              isAdmin={isAdmin}
              onLoad={onLoadPreset}
              onDelete={preset._type === 'personal' ? handleDeletePersonal : handleDeleteShared}
              onShare={onSharePreset}
              onUnshare={onUnsharePreset}
            />
          ))}
        </div>
      )}
    </div>
  );
}
