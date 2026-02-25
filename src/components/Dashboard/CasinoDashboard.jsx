import { useState, useCallback, lazy, Suspense } from 'react';
import { useDashboard, useProviderSlots, useSlotSearch } from '../../hooks/useDashboard';
import { GAME_PROVIDERS } from '../../utils/gameProviders';
import CarouselSection from './CarouselSection';
import './Dashboard.css';

// Lazy-load heavy panel components
const TournamentBracketModule = lazy(() => import('./TournamentBracket'));
const LeaderboardPanel = lazy(() => import('./LeaderboardPanel'));

// Lazy wrapper for TournamentCard (re-exported from the bracket module)
const LazyTournamentCard = lazy(() =>
  import('./TournamentBracket').then(mod => ({ default: mod.TournamentCard }))
);

/**
 * ProviderCarousel — lazy-loaded carousel for a single provider.
 * Only fetches data when the provider section is rendered.
 */
function ProviderCarousel({ provider, onSlotClick }) {
  const { slots, loading } = useProviderSlots(provider.name, 30);
  const providerData = GAME_PROVIDERS.find(
    p => p.name.toLowerCase() === provider.name.toLowerCase() ||
         p.id === provider.name.toLowerCase().replace(/\s+/g, '-')
  );

  if (!loading && slots.length === 0) return null;

  return (
    <CarouselSection
      title={providerData?.name || provider.name}
      subtitle={`${provider.count} games`}
      icon={
        providerData?.image
          ? <img src={providerData.image} alt="" className="db-provider-logo" />
          : '🎰'
      }
      slots={slots}
      loading={loading}
      onSlotClick={onSlotClick}
      cardSize="default"
    />
  );
}

/**
 * SearchOverlay — fullscreen search with debounced results
 */
function SearchOverlay({ onClose, onSlotClick }) {
  const { query, setQuery, results, searching } = useSlotSearch(300);

  return (
    <div className="db-search-overlay" onClick={onClose}>
      <div className="db-search-panel" onClick={e => e.stopPropagation()}>
        <div className="db-search-input-wrap">
          <svg className="db-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            className="db-search-input"
            type="text"
            placeholder="Search slots, providers..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
          <button className="db-search-close" onClick={onClose}>✕</button>
        </div>

        <div className="db-search-results">
          {searching && <div className="db-search-status">Searching...</div>}
          {!searching && query && results.length === 0 && (
            <div className="db-search-status">No results found</div>
          )}
          {results.map(slot => (
            <div
              key={slot.id}
              className="db-search-result"
              onClick={() => { onSlotClick?.(slot); onClose(); }}
            >
              <img
                src={slot.image || 'https://i.imgur.com/8E3ucNx.png'}
                alt=""
                className="db-search-result-img"
                loading="lazy"
              />
              <div className="db-search-result-info">
                <span className="db-search-result-name">{slot.name}</span>
                <span className="db-search-result-provider">{slot.provider}</span>
              </div>
              {slot.rtp && <span className="db-search-result-rtp">{slot.rtp}%</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * CasinoDashboard — Main page with:
 * - Hero / Featured carousel
 * - Trending / Popular section
 * - Provider-based carousels
 * - Tournament cards
 * - Leaderboard panel
 * - Search overlay
 */
export default function CasinoDashboard() {
  const { trending, featured, providers, tournaments, loading, error, refresh } = useDashboard();
  const [showSearch, setShowSearch] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [showProviders, setShowProviders] = useState(6); // lazy-load providers

  const handleSlotClick = useCallback((slot) => {
    // Future: navigate to slot detail page or open modal
    console.log('Slot clicked:', slot.name);
  }, []);

  const handleTournamentClick = useCallback((t) => {
    setSelectedTournament(prev => prev?.id === t.id ? null : t);
  }, []);

  return (
    <div className="db-page">
      {/* =============== TOP BAR =============== */}
      <header className="db-topbar">
        <div className="db-topbar-left">
          <h1 className="db-topbar-title">Casino</h1>
        </div>
        <div className="db-topbar-right">
          <button className="db-search-btn" onClick={() => setShowSearch(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <span>Search</span>
          </button>
          <button className="db-refresh-btn" onClick={refresh} title="Refresh">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          </button>
        </div>
      </header>

      {/* =============== ERROR =============== */}
      {error && (
        <div className="db-error">
          <span>Failed to load dashboard</span>
          <button onClick={refresh}>Retry</button>
        </div>
      )}

      {/* =============== FEATURED =============== */}
      <CarouselSection
        title="Featured"
        subtitle="Handpicked by the team"
        icon="⭐"
        slots={featured}
        loading={loading}
        onSlotClick={handleSlotClick}
        cardSize="large"
        autoplay
        autoplayInterval={6000}
        className="db-featured-section"
      />

      {/* =============== TRENDING / POPULAR =============== */}
      <CarouselSection
        title="Trending Now"
        subtitle="Most played this week"
        icon="🔥"
        slots={trending}
        loading={loading}
        onSlotClick={handleSlotClick}
        cardSize="default"
      />

      {/* =============== TOURNAMENTS =============== */}
      {tournaments.length > 0 && (
        <section className="db-section">
          <div className="db-section-header">
            <span className="db-section-icon">🏆</span>
            <div>
              <h2 className="db-section-title">Tournaments</h2>
              <p className="db-section-subtitle">Compete and win prizes</p>
            </div>
          </div>

          <div className="db-tournaments-grid">
            {tournaments.map(t => (
              <Suspense key={t.id} fallback={<div className="db-loading-panel">Loading...</div>}>
                <LazyTournamentCard
                  tournament={t}
                  onClick={handleTournamentClick}
                />
              </Suspense>
            ))}
          </div>

          {/* Expanded: bracket + leaderboard */}
          {selectedTournament && (
            <Suspense fallback={<div className="db-loading-panel">Loading bracket...</div>}>
              <div className="db-tournament-detail">
                <div className="db-tournament-detail-header">
                  <h3>{selectedTournament.name}</h3>
                  <button onClick={() => setSelectedTournament(null)} className="db-close-detail">✕</button>
                </div>
                <div className="db-tournament-detail-body">
                  <div className="db-bracket-wrap">
                    <TournamentBracketModule tournament={selectedTournament} />
                  </div>
                  <div className="db-leaderboard-wrap">
                    <LeaderboardPanel
                      tournamentId={selectedTournament.id}
                      tournamentName={selectedTournament.name}
                    />
                  </div>
                </div>
              </div>
            </Suspense>
          )}
        </section>
      )}

      {/* =============== PROVIDER CAROUSELS =============== */}
      <section className="db-section">
        <div className="db-section-header">
          <span className="db-section-icon">🎰</span>
          <div>
            <h2 className="db-section-title">Browse by Provider</h2>
            <p className="db-section-subtitle">{providers.length} providers available</p>
          </div>
        </div>

        {providers.slice(0, showProviders).map(p => (
          <ProviderCarousel
            key={p.name}
            provider={p}
            onSlotClick={handleSlotClick}
          />
        ))}

        {showProviders < providers.length && (
          <button
            className="db-load-more-providers"
            onClick={() => setShowProviders(prev => prev + 6)}
          >
            Show More Providers ({providers.length - showProviders} remaining)
          </button>
        )}
      </section>

      {/* =============== SEARCH OVERLAY =============== */}
      {showSearch && (
        <SearchOverlay
          onClose={() => setShowSearch(false)}
          onSlotClick={handleSlotClick}
        />
      )}
    </div>
  );
}
