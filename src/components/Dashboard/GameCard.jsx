import { memo, useState, useCallback } from 'react';
import './GameCard.css';

const DEFAULT_IMAGE = 'https://i.imgur.com/8E3ucNx.png';

/**
 * Volatility badge color mapping
 */
function getVolatilityColor(vol) {
  if (!vol) return 'var(--gc-vol-medium)';
  const v = vol.toLowerCase();
  if (v.includes('extreme') || v.includes('very high')) return 'var(--gc-vol-extreme)';
  if (v.includes('high')) return 'var(--gc-vol-high)';
  if (v.includes('medium') || v.includes('mid')) return 'var(--gc-vol-medium)';
  if (v.includes('low')) return 'var(--gc-vol-low)';
  return 'var(--gc-vol-medium)';
}

/**
 * Format max win multiplier
 */
function formatMaxWin(val) {
  if (!val) return '—';
  if (val >= 1000) return `${(val / 1000).toFixed(val >= 10000 ? 0 : 1)}k×`;
  return `${val}×`;
}

/**
 * GameCard — displays a slot/game with image, stats (RTP, volatility, hit rate, max win).
 * Supports skeleton loading state, lazy image loading, and hover interactions.
 */
const GameCard = memo(function GameCard({
  slot,
  onClick,
  size = 'default', // 'compact' | 'default' | 'large'
  showStats = true,
  className = '',
}) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleClick = useCallback(() => {
    if (onClick) onClick(slot);
  }, [onClick, slot]);

  if (!slot) return <GameCardSkeleton size={size} />;

  const {
    name,
    provider,
    image,
    rtp,
    volatility,
    hit_rate,
    max_win_multiplier,
    is_featured,
    popularity_score,
  } = slot;

  const imgSrc = imgError ? DEFAULT_IMAGE : (image || DEFAULT_IMAGE);

  return (
    <article
      className={`gc-card gc-card--${size} ${is_featured ? 'gc-card--featured' : ''} ${className}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter') handleClick(); }}
    >
      {/* Image */}
      <div className="gc-image-wrap">
        {!imgLoaded && <div className="gc-image-skeleton gc-shimmer" />}
        <img
          src={imgSrc}
          alt={name}
          className={`gc-image ${imgLoaded ? 'gc-image--loaded' : ''}`}
          loading="lazy"
          decoding="async"
          onLoad={() => setImgLoaded(true)}
          onError={() => { setImgError(true); setImgLoaded(true); }}
        />
        {is_featured && <span className="gc-badge gc-badge--featured">FEATURED</span>}
        {popularity_score > 80 && <span className="gc-badge gc-badge--hot">HOT</span>}

        {/* Hover overlay */}
        <div className="gc-overlay">
          <span className="gc-play-icon">▶</span>
        </div>
      </div>

      {/* Info */}
      <div className="gc-info">
        <h3 className="gc-name" title={name}>{name}</h3>
        <span className="gc-provider">{provider}</span>
      </div>

      {/* Stats bar */}
      {showStats && (
        <div className="gc-stats">
          {rtp != null && (
            <div className="gc-stat">
              <span className="gc-stat-label">RTP</span>
              <span className="gc-stat-value">{rtp}%</span>
            </div>
          )}
          {volatility && (
            <div className="gc-stat">
              <span className="gc-stat-label">VOL</span>
              <span
                className="gc-stat-value gc-stat-vol"
                style={{ color: getVolatilityColor(volatility) }}
              >
                {volatility}
              </span>
            </div>
          )}
          {hit_rate != null && (
            <div className="gc-stat">
              <span className="gc-stat-label">HIT</span>
              <span className="gc-stat-value">{hit_rate}%</span>
            </div>
          )}
          {max_win_multiplier != null && (
            <div className="gc-stat">
              <span className="gc-stat-label">MAX</span>
              <span className="gc-stat-value gc-stat-max">{formatMaxWin(max_win_multiplier)}</span>
            </div>
          )}
        </div>
      )}
    </article>
  );
});

/**
 * GameCardSkeleton — animated placeholder shown during loading.
 */
export function GameCardSkeleton({ size = 'default' }) {
  return (
    <div className={`gc-card gc-card--${size} gc-card--skeleton`} aria-hidden="true">
      <div className="gc-image-wrap">
        <div className="gc-image-skeleton gc-shimmer" />
      </div>
      <div className="gc-info">
        <div className="gc-skel-line gc-shimmer" style={{ width: '70%', height: 14 }} />
        <div className="gc-skel-line gc-shimmer" style={{ width: '40%', height: 10, marginTop: 6 }} />
      </div>
      <div className="gc-stats">
        <div className="gc-skel-line gc-shimmer" style={{ width: '100%', height: 12 }} />
      </div>
    </div>
  );
}

export default GameCard;
