/**
 * PresetLibrary.jsx — Full-page preset gallery with live overlay previews.
 * Shows both personal (globalPresets) and shared presets as visual cards.
 */
import React, { useState, useRef, useEffect, useMemo, memo, useCallback } from 'react';
import { getWidgetDef } from './widgets/widgetRegistry';

// Register built-in widgets (idempotent)
import './widgets/builtinWidgets';

const CANVAS_W = 1920;
const CANVAS_H = 1080;

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
  const wrapRef = useRef(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    if (!wrapRef.current) return;
    const measure = () => {
      const w = wrapRef.current?.offsetWidth;
      if (w) setScale(w / CANVAS_W);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const visibleSnaps = useMemo(
    () => (snapshot || []).filter(s => s.is_visible !== false),
    [snapshot]
  );

  return (
    <div className="pl-thumb-wrap" ref={wrapRef}>
      <div className="pl-thumb-canvas" style={{
        width: CANVAS_W,
        height: CANVAS_H,
        transform: `scale(${scale})`,
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
            color: 'rgba(201,184,232,0.45)', fontSize: 32, fontFamily: 'Inter, sans-serif',
          }}>
            Empty
          </div>
        )}
      </div>
    </div>
  );
});

/* ─── Preset Card ─── */
function getPresetDate(preset) {
  if (preset?.savedAt) return new Date(preset.savedAt);
  if (preset?.created_at) return new Date(preset.created_at);
  return null;
}

function PresetCard({
  preset, type, theme, isAdmin,
  onLoad, onDelete, onShare, onUnshare,
}) {
  const [hovered, setHovered] = useState(false);
  const name = preset.name || 'Untitled';
  const date = getPresetDate(preset);
  const snapshot = preset.snapshot || [];
  const widgetCount = snapshot.filter(s => s.is_visible !== false).length;
  const widgetTypes = [...new Set(snapshot.map(s => {
    const def = getWidgetDef(s.widget_type);
    return def?.icon || '🧩';
  }))];
  const backupLabel = preset.fullBackup ? 'Full backup' : 'Style preset';

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
        {preset.fullBackup && (
          <span className="pl-card__badge pl-card__badge--backup">Full backup</span>
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
            {widgetTypes.slice(0, 6).join(' ')} · {widgetCount} widget{widgetCount !== 1 ? 's' : ''} · {backupLabel}
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
  onSavePreset, presetName, setPresetName, presetMsg,
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

  const handleLoadPreset = useCallback((preset) => {
    const name = preset?.name || 'this saved build';
    const message = preset?.fullBackup
      ? `Load "${name}" and restore its saved widget setup? Current widget settings will be replaced, but connected account secrets stay untouched.`
      : `Load "${name}" and apply its saved widget styles/layout?`;
    if (typeof window !== 'undefined' && !window.confirm(message)) return;
    onLoadPreset?.(preset);
  }, [onLoadPreset]);

  const personalCount = (globalPresets || []).length;
  const sharedCount = (sharedPresets || []).length;
  const totalCount = personalCount + sharedCount;
  const filteredCount = filtered.length;
  const totalVisibleWidgets = allPresets.reduce(
    (sum, preset) => sum + ((preset.snapshot || []).filter(s => s.is_visible !== false).length),
    0
  );
  const largestPreset = allPresets.reduce((largest, preset) => {
    const count = (preset.snapshot || []).filter(s => s.is_visible !== false).length;
    if (!largest || count > largest.count) {
      return { name: preset.name || 'Untitled', count };
    }
    return largest;
  }, null);
  const sharedRatio = totalCount > 0 ? Math.round((sharedCount / totalCount) * 100) : 0;
  const pageNote = totalCount > 0
    ? 'Preview saved widget builds, restore older versions after experiments, and promote sanitized style presets into the shared gallery when they are stream-ready.'
    : 'Save the current overlay as a full widget backup before big edits, so you can return to a working build if something goes wrong.';

  return (
    <div className="pl-page" data-tour="presets-page">
      <div className="pl-page-shell">
      <div className="pl-hero">
        <div className="pl-hero__copy">
          <span className="pl-hero__eyebrow">Widget Backup Vault</span>
          <h2 className="pl-hero__title">Widget library</h2>
          <p className="pl-hero__subtitle">
            Save full widget builds, compare live previews, and reload stable overlay versions from one polished gallery.
          </p>
          <p className="pl-hero__note">{pageNote}</p>
        </div>

        <div className="pl-hero__metrics">
          <div className="pl-hero__metric-card">
            <span className="pl-hero__metric-label">Catalog</span>
            <strong className="pl-hero__metric-value">{totalCount}</strong>
            <span className="pl-hero__metric-meta">{personalCount} personal, {sharedCount} shared</span>
          </div>
          <div className="pl-hero__metric-card">
            <span className="pl-hero__metric-label">Visible</span>
            <strong className="pl-hero__metric-value">{filteredCount}</strong>
            <span className="pl-hero__metric-meta">{search ? `Matching "${search}"` : `Filter: ${filter}`}</span>
          </div>
          <div className="pl-hero__metric-card">
            <span className="pl-hero__metric-label">Shared Mix</span>
            <strong className="pl-hero__metric-value">{sharedRatio}%</strong>
            <span className="pl-hero__metric-meta">Shared availability across the vault</span>
          </div>
          <div className="pl-hero__metric-card">
            <span className="pl-hero__metric-label">Largest Layout</span>
            <strong className="pl-hero__metric-value pl-hero__metric-value--name">{largestPreset?.name || 'No presets yet'}</strong>
            <span className="pl-hero__metric-meta">{largestPreset ? `${largestPreset.count} visible widgets` : 'Save a preset to start ranking layouts'}</span>
          </div>
        </div>
      </div>

      {/* Save new preset */}
      <div className="pl-section-heading">
        <div>
          <span className="pl-section-heading__eyebrow">Save Backup</span>
          <h3 className="pl-section-heading__title">Capture the current overlay into your widget library</h3>
        </div>
        <span className="pl-section-heading__pill">{totalVisibleWidgets} widgets across all presets</span>
      </div>

      <div className="pl-save-card">
        <div className="pl-save-bar">
          <input
            className="pl-save-bar__input"
            type="text"
            placeholder="Backup name..."
            value={presetName || ''}
            onChange={e => setPresetName?.(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onSavePreset?.(); }}
          />
          <button
            className="pl-save-bar__btn"
            onClick={onSavePreset}
            disabled={!(presetName || '').trim() || !widgets?.length}
          >
            Save Widget Backup
          </button>
          {presetMsg && <span className="pl-save-bar__msg">{presetMsg}</span>}
        </div>
        <p className="pl-save-card__note">
          Save the current widget setup, positions, sizes, visibility, V2 appearance edits, and non-secret configuration so you can restore a working build after major edits.
        </p>
      </div>

      {/* Toolbar */}
      <div className="pl-section-heading pl-section-heading--compact">
        <div>
          <span className="pl-section-heading__eyebrow">Explore</span>
          <h3 className="pl-section-heading__title">Search the gallery, switch catalogs, and reorder what matters</h3>
        </div>
        <span className="pl-section-heading__pill">{filteredCount} shown</span>
      </div>

      <div className="pl-toolbar-card">
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
        <p className="pl-toolbar-card__note">
          Every preset card below keeps its live thumbnail, load flow, share controls, and delete controls exactly as before.
        </p>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="pl-empty" data-tour="presets-shared">
          <span className="pl-empty__icon">📭</span>
          <h3 className="pl-empty__title">No presets found</h3>
          <p className="pl-empty__text">
            {search ? 'Try a different search term.' : 'Save your first preset from the sidebar to get started.'}
          </p>
        </div>
      ) : (
        <>
          <div className="pl-section-heading pl-section-heading--compact">
            <div>
              <span className="pl-section-heading__eyebrow">Backup Gallery</span>
              <h3 className="pl-section-heading__title">Browse saved builds and restore the right version</h3>
            </div>
            <span className="pl-section-heading__pill">{sortBy}</span>
          </div>

          <div className="pl-grid" data-tour="presets-shared">
            {filtered.map((preset, idx) => (
              <PresetCard
                key={preset.id || preset.name || idx}
                preset={preset}
                type={preset._type}
                theme={theme}
                isAdmin={isAdmin}
                onLoad={handleLoadPreset}
                onDelete={preset._type === 'personal' ? handleDeletePersonal : handleDeleteShared}
                onShare={onSharePreset}
                onUnshare={onUnsharePreset}
              />
            ))}
          </div>
        </>
      )}
      </div>
    </div>
  );
}
