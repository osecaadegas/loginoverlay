import React, { useMemo, useState } from 'react';
import './widgets/builtinWidgets';
import { getAllWidgetDefs } from './widgets/widgetRegistry';
import {
  AssetCard,
  DashboardPageShell,
  EmptyState,
  FilterBar,
  PageHero,
  SectionHeader,
  StatusBadge,
} from './ui';

const CATEGORY_LABELS = {
  casino: 'Casino',
  stream: 'Stream',
  layout: 'Layout',
  general: 'General',
};

const CONFIG_PANELS = new Set(['bonus_hunt', 'tournament', 'bonus_buys', 'current_slot', 'slot_requests', 'bets']);
const RECOMMENDED = new Set(['bonus_hunt', 'current_slot', 'slot_requests', 'giveaway', 'bets', 'tournament']);
const POPULAR = new Set(['bonus_hunt', 'current_slot', 'chat', 'navbar', 'slot_requests', 'bets']);
const NEW_ASSETS = new Set(['bonus_buys', 'bh_stats', 'image_slideshow', 'raid_shoutout', 'spotify_now_playing']);
const PREMIUM_READY = new Set(['tournament', 'bonus_buys', 'bets', 'bh_stats', 'spotify_now_playing']);

function needsSetup(type, config = {}) {
  switch (type) {
    case 'giveaway':
      return !(config.keyword && config.prize);
    case 'bets':
      return !Array.isArray(config.options) || config.options.length < 2;
    case 'slot_requests':
      return config.srChatEnabled !== false && !config.commandTrigger;
    case 'current_slot':
      return !(config.slotName || config.imageUrl);
    case 'bonus_hunt':
      return !Array.isArray(config.bonuses) || config.bonuses.length === 0;
    case 'tournament':
      return !(config.title || config.data || config.setupMatches?.length);
    default:
      return false;
  }
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function buildAssets(widgets) {
  const activeByType = new Map((widgets || []).map(widget => [widget.widget_type, widget]));

  return getAllWidgetDefs().map(def => {
    const widget = activeByType.get(def.type);
    const active = !!widget;
    const visible = active && widget.is_visible !== false;
    const setup = active && needsSetup(def.type, widget.config);
    const category = def.category || 'general';
    const flags = [
      RECOMMENDED.has(def.type) ? 'Recommended' : null,
      POPULAR.has(def.type) ? 'Popular' : null,
      NEW_ASSETS.has(def.type) ? 'New' : null,
      PREMIUM_READY.has(def.type) ? 'Premium-ready' : null,
    ].filter(Boolean);

    return {
      ...def,
      active,
      visible,
      setup,
      widget,
      category,
      categoryLabel: CATEGORY_LABELS[category] || category,
      flags,
      styleCount: def.styles?.length || 0,
      updatedAt: widget?.updated_at || widget?.created_at || '',
    };
  });
}

function assetMatches(asset, search) {
  if (!search.trim()) return true;
  const q = search.toLowerCase();
  return [
    asset.label,
    asset.description,
    asset.categoryLabel,
    asset.type,
    ...asset.flags,
    ...(asset.styles || []).map(style => style.label),
  ].filter(Boolean).some(value => String(value).toLowerCase().includes(q));
}

function assetStatus(asset) {
  if (!asset.active) return { label: 'Available', tone: 'neutral' };
  if (asset.setup) return { label: 'Needs setup', tone: 'setup' };
  if (asset.visible) return { label: 'Live', tone: 'live' };
  return { label: 'Hidden', tone: 'inactive' };
}

function AssetSection({ title, eyebrow, description, assets, renderAsset, empty }) {
  if (!assets.length) {
    if (!empty) return null;
    return (
      <section className="oal-section">
        <SectionHeader eyebrow={eyebrow} title={title} description={description} pill="0 items" />
        {empty}
      </section>
    );
  }

  return (
    <section className="oal-section">
      <SectionHeader eyebrow={eyebrow} title={title} description={description} pill={`${assets.length} item${assets.length === 1 ? '' : 's'}`} />
      <div className="oc-ui-card-grid">
        {assets.map(renderAsset)}
      </div>
    </section>
  );
}

export default function OverlayAssetLibrary({
  widgets = [],
  onAddWidget,
  onOpenPanel,
  huntArchive,
  presetLibrary,
}) {
  const [tab, setTab] = useState('assets');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [sortBy, setSortBy] = useState('recommended');
  const [addingType, setAddingType] = useState('');

  const assets = useMemo(() => buildAssets(widgets), [widgets]);
  const activeCount = assets.filter(asset => asset.active).length;
  const liveCount = assets.filter(asset => asset.visible).length;
  const setupCount = assets.filter(asset => asset.setup).length;

  const categoryFilters = useMemo(() => {
    const counts = assets.reduce((acc, asset) => {
      acc[asset.category] = (acc[asset.category] || 0) + 1;
      return acc;
    }, {});
    return [
      { key: 'all', label: 'All', count: assets.length },
      ...Object.entries(counts).map(([key, count]) => ({ key, label: CATEGORY_LABELS[key] || key, count })),
    ];
  }, [assets]);

  const statusFilters = useMemo(() => [
    { key: 'all', label: 'All states', count: assets.length },
    { key: 'active', label: 'Active', count: activeCount },
    { key: 'live', label: 'Live', count: liveCount },
    { key: 'setup', label: 'Needs setup', count: setupCount },
    { key: 'available', label: 'Available', count: assets.length - activeCount },
  ], [assets.length, activeCount, liveCount, setupCount]);

  const filtered = useMemo(() => {
    let list = assets.filter(asset => assetMatches(asset, search));
    if (category !== 'all') list = list.filter(asset => asset.category === category);
    if (status === 'active') list = list.filter(asset => asset.active);
    if (status === 'live') list = list.filter(asset => asset.visible);
    if (status === 'setup') list = list.filter(asset => asset.setup);
    if (status === 'available') list = list.filter(asset => !asset.active);

    return [...list].sort((a, b) => {
      if (sortBy === 'name') return a.label.localeCompare(b.label);
      if (sortBy === 'active') return Number(b.active) - Number(a.active) || a.label.localeCompare(b.label);
      if (sortBy === 'category') return a.categoryLabel.localeCompare(b.categoryLabel) || a.label.localeCompare(b.label);
      const aScore = (RECOMMENDED.has(a.type) ? 4 : 0) + (POPULAR.has(a.type) ? 3 : 0) + (a.active ? 2 : 0) + (NEW_ASSETS.has(a.type) ? 1 : 0);
      const bScore = (RECOMMENDED.has(b.type) ? 4 : 0) + (POPULAR.has(b.type) ? 3 : 0) + (b.active ? 2 : 0) + (NEW_ASSETS.has(b.type) ? 1 : 0);
      return bScore - aScore || a.label.localeCompare(b.label);
    });
  }, [assets, category, search, sortBy, status]);

  const recentlyUsed = useMemo(() => (
    filtered
      .filter(asset => asset.active)
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
      .slice(0, 6)
  ), [filtered]);
  const recommended = filtered.filter(asset => RECOMMENDED.has(asset.type)).slice(0, 8);
  const popular = filtered.filter(asset => POPULAR.has(asset.type)).slice(0, 8);
  const newest = filtered.filter(asset => NEW_ASSETS.has(asset.type)).slice(0, 8);
  const premium = filtered.filter(asset => PREMIUM_READY.has(asset.type)).slice(0, 8);

  const openConfig = (type) => {
    onOpenPanel?.(CONFIG_PANELS.has(type) ? type : 'widgets');
  };

  const handlePrimary = async (asset) => {
    if (asset.active) {
      openConfig(asset.type);
      return;
    }
    if (!onAddWidget) return;
    setAddingType(asset.type);
    try {
      await onAddWidget(asset.type, asset.defaults || {});
      openConfig(asset.type);
    } catch (err) {
      console.error('[OverlayAssetLibrary] add widget failed:', asset.type, err);
      alert(`Could not add ${asset.label}: ${err?.message || 'Unknown error'}`);
    } finally {
      setAddingType('');
    }
  };

  const renderAsset = (asset) => {
    const statusMeta = assetStatus(asset);
    const tags = [
      asset.styleCount ? `${asset.styleCount} styles` : 'Configurable',
      ...asset.flags,
      asset.updatedAt ? `Used ${formatDate(asset.updatedAt)}` : null,
    ].filter(Boolean);

    return (
      <AssetCard
        key={asset.type}
        icon={asset.icon}
        title={asset.label}
        description={asset.description}
        category={asset.categoryLabel}
        tags={tags}
        status={statusMeta.label}
        statusTone={statusMeta.tone}
        active={asset.active}
        primaryLabel={asset.active ? (asset.setup ? 'Finish setup' : 'Configure') : 'Add to overlay'}
        secondaryLabel={asset.active ? 'Open widgets' : 'Preview'}
        onPrimary={() => handlePrimary(asset)}
        onSecondary={() => onOpenPanel?.('widgets')}
        disabled={addingType === asset.type}
      />
    );
  };

  const tabs = [
    { key: 'assets', label: 'Assets', count: assets.length },
    { key: 'archive', label: 'Hunt Archive' },
    { key: 'presets', label: 'Presets' },
  ];

  return (
    <DashboardPageShell className="oal-page" dataTour="library-page">
      <PageHero
        eyebrow="Asset Control Hub"
        title="Library"
        description="Add widgets, review stream tools, jump into setup, and keep reusable hunt and preset assets close to the live overlay workflow."
        note="This is the control hub for what can appear on stream. Active cards are already installed; live cards are visible in OBS."
        metrics={[
          { label: 'Assets', value: assets.length, meta: 'Available overlay tools' },
          { label: 'Active', value: activeCount, meta: `${liveCount} currently visible` },
          { label: 'Needs Setup', value: setupCount, meta: 'Installed assets needing attention' },
          { label: 'Categories', value: categoryFilters.length - 1, meta: 'Casino, stream, layout, general' },
        ]}
        actions={(
          <>
            <button type="button" className="oc-ui-btn oc-ui-btn--primary" onClick={() => onOpenPanel?.('widgets')}>
              Open Widget Manager
            </button>
            <button type="button" className="oc-ui-btn oc-ui-btn--ghost" onClick={() => setTab('archive')}>
              Hunt Archive
            </button>
          </>
        )}
      />

      <div className="oal-tabs" role="tablist" aria-label="Library sections">
        {tabs.map(item => (
          <button
            key={item.key}
            type="button"
            className={`oal-tab${tab === item.key ? ' oal-tab--active' : ''}`}
            onClick={() => setTab(item.key)}
          >
            {item.label}
            {item.count != null && <StatusBadge tone={tab === item.key ? 'active' : 'neutral'}>{item.count}</StatusBadge>}
          </button>
        ))}
      </div>

      {tab === 'assets' && (
        <>
          <FilterBar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search widgets, games, alerts, stream tools..."
            filters={categoryFilters}
            activeFilter={category}
            onFilterChange={setCategory}
            statusFilters={statusFilters}
            activeStatus={status}
            onStatusChange={setStatus}
            sortValue={sortBy}
            onSortChange={setSortBy}
            sortOptions={[
              { value: 'recommended', label: 'Recommended first' },
              { value: 'active', label: 'Active first' },
              { value: 'category', label: 'Category' },
              { value: 'name', label: 'A to Z' },
            ]}
            meta={`${filtered.length} shown`}
          />

          {filtered.length === 0 ? (
            <EmptyState title="No assets match this view" icon="Search">
              Try clearing the search or switching back to All states. Casino, Stream, Layout, and General tools all live here.
            </EmptyState>
          ) : (
            <>
              <AssetSection
                eyebrow="Recently Used"
                title="Active on this overlay"
                description="Jump straight back into the tools that are already installed."
                assets={recentlyUsed}
                renderAsset={renderAsset}
              />
              <AssetSection
                eyebrow="Recommended"
                title="Core streamer stack"
                description="The tools most casino streamers need first: slot info, requests, hunts, giveaways, and bets."
                assets={recommended}
                renderAsset={renderAsset}
              />
              <AssetSection
                eyebrow="Popular"
                title="High-use overlay assets"
                description="Fast access to the controls that usually live on-screen during a session."
                assets={popular}
                renderAsset={renderAsset}
              />
              <AssetSection
                eyebrow="New"
                title="Fresh tools to try"
                description="Use these for richer stream moments, alerts, media, and secondary panels."
                assets={newest}
                renderAsset={renderAsset}
              />
              <AssetSection
                eyebrow="Premium-ready"
                title="Advanced broadcast tools"
                description="Deeper tools for streamers who want more production value and stronger session control."
                assets={premium}
                renderAsset={renderAsset}
              />
              <AssetSection
                eyebrow="All Assets"
                title="Complete library"
                description="Everything available from the widget registry, filtered by your current search and chips."
                assets={filtered}
                renderAsset={renderAsset}
              />
            </>
          )}
        </>
      )}

      {tab === 'archive' && (
        <div className="oal-tab-panel">
          {huntArchive || (
            <EmptyState title="Hunt archive unavailable" icon="Archive">
              The saved hunt library could not be mounted in this workspace.
            </EmptyState>
          )}
        </div>
      )}

      {tab === 'presets' && (
        <div className="oal-tab-panel">
          {presetLibrary || (
            <EmptyState title="Preset gallery unavailable" icon="Preset">
              The preset gallery could not be mounted in this workspace.
            </EmptyState>
          )}
        </div>
      )}
    </DashboardPageShell>
  );
}
