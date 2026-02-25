import { memo, useState, useEffect, useCallback } from 'react';
import { getLeaderboard, subscribeToLeaderboard } from '../../services/dashboardService';
import './LeaderboardPanel.css';

const MEDAL_ICONS = ['🥇', '🥈', '🥉'];

/**
 * LeaderboardPanel — Real-time leaderboard with:
 * - Sticky top 3 podium
 * - Animated rank transitions
 * - Pagination / load more
 * - Supabase realtime subscription
 */
const LeaderboardPanel = memo(function LeaderboardPanel({
  tournamentId,
  tournamentName,
  initialEntries = [],
  pageSize = 20,
  showPodium = true,
  className = '',
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [loading, setLoading] = useState(!initialEntries.length);
  const [displayCount, setDisplayCount] = useState(pageSize);

  // Fetch leaderboard
  useEffect(() => {
    if (!tournamentId) return;
    let cancelled = false;
    setLoading(true);

    getLeaderboard(tournamentId, 200).then(data => {
      if (!cancelled) {
        setEntries(data);
        setLoading(false);
      }
    });

    // Real-time subscription
    const unsub = subscribeToLeaderboard(tournamentId, async () => {
      const fresh = await getLeaderboard(tournamentId, 200);
      if (!cancelled) setEntries(fresh);
    });

    return () => { cancelled = true; unsub(); };
  }, [tournamentId]);

  const loadMore = useCallback(() => {
    setDisplayCount(prev => prev + pageSize);
  }, [pageSize]);

  // Separate top 3 and the rest
  const sorted = [...entries].sort((a, b) => b.score - a.score);
  const top3 = showPodium ? sorted.slice(0, 3) : [];
  const rest = showPodium ? sorted.slice(3, displayCount) : sorted.slice(0, displayCount);
  const hasMore = displayCount < sorted.length;

  if (loading) {
    return (
      <div className={`lb-panel ${className}`}>
        <div className="lb-header">
          <h3 className="lb-title">🏆 Leaderboard</h3>
          {tournamentName && <span className="lb-tournament">{tournamentName}</span>}
        </div>
        <div className="lb-loading">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="lb-skel-row gc-shimmer" />
          ))}
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className={`lb-panel ${className}`}>
        <div className="lb-header">
          <h3 className="lb-title">🏆 Leaderboard</h3>
        </div>
        <div className="lb-empty">
          <span>No entries yet</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`lb-panel ${className}`}>
      {/* Header */}
      <div className="lb-header">
        <h3 className="lb-title">🏆 Leaderboard</h3>
        {tournamentName && <span className="lb-tournament">{tournamentName}</span>}
        <span className="lb-count">{sorted.length} players</span>
      </div>

      {/* Podium (top 3) */}
      {showPodium && top3.length > 0 && (
        <div className="lb-podium">
          {/* 2nd place */}
          {top3[1] && (
            <div className="lb-podium-slot lb-podium-slot--2">
              <div className="lb-podium-avatar">
                {top3[1].avatar_url
                  ? <img src={top3[1].avatar_url} alt="" className="lb-avatar-img" />
                  : <span className="lb-avatar-placeholder">{top3[1].username?.[0]?.toUpperCase() || '?'}</span>
                }
              </div>
              <span className="lb-podium-medal">{MEDAL_ICONS[1]}</span>
              <span className="lb-podium-name">{top3[1].username}</span>
              <span className="lb-podium-score">{Number(top3[1].score).toLocaleString()}</span>
              <div className="lb-podium-bar lb-podium-bar--2" />
            </div>
          )}

          {/* 1st place */}
          {top3[0] && (
            <div className="lb-podium-slot lb-podium-slot--1">
              <div className="lb-podium-avatar lb-podium-avatar--gold">
                {top3[0].avatar_url
                  ? <img src={top3[0].avatar_url} alt="" className="lb-avatar-img" />
                  : <span className="lb-avatar-placeholder">{top3[0].username?.[0]?.toUpperCase() || '?'}</span>
                }
              </div>
              <span className="lb-podium-medal">{MEDAL_ICONS[0]}</span>
              <span className="lb-podium-name">{top3[0].username}</span>
              <span className="lb-podium-score">{Number(top3[0].score).toLocaleString()}</span>
              <div className="lb-podium-bar lb-podium-bar--1" />
            </div>
          )}

          {/* 3rd place */}
          {top3[2] && (
            <div className="lb-podium-slot lb-podium-slot--3">
              <div className="lb-podium-avatar">
                {top3[2].avatar_url
                  ? <img src={top3[2].avatar_url} alt="" className="lb-avatar-img" />
                  : <span className="lb-avatar-placeholder">{top3[2].username?.[0]?.toUpperCase() || '?'}</span>
                }
              </div>
              <span className="lb-podium-medal">{MEDAL_ICONS[2]}</span>
              <span className="lb-podium-name">{top3[2].username}</span>
              <span className="lb-podium-score">{Number(top3[2].score).toLocaleString()}</span>
              <div className="lb-podium-bar lb-podium-bar--3" />
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="lb-table">
        <div className="lb-table-header">
          <span className="lb-col-rank">#</span>
          <span className="lb-col-player">Player</span>
          <span className="lb-col-score">Score</span>
          <span className="lb-col-games">Games</span>
          <span className="lb-col-multi">Best ×</span>
        </div>
        {rest.map((entry, idx) => {
          const rank = showPodium ? idx + 4 : idx + 1;
          return (
            <div key={entry.id || idx} className="lb-row">
              <span className="lb-col-rank lb-rank">{rank}</span>
              <div className="lb-col-player lb-player-cell">
                <div className="lb-player-avatar-sm">
                  {entry.avatar_url
                    ? <img src={entry.avatar_url} alt="" className="lb-avatar-img-sm" />
                    : <span className="lb-avatar-placeholder-sm">{entry.username?.[0]?.toUpperCase() || '?'}</span>
                  }
                </div>
                <span className="lb-player-name">{entry.username}</span>
              </div>
              <span className="lb-col-score lb-score-value">{Number(entry.score).toLocaleString()}</span>
              <span className="lb-col-games">{entry.games_played || '—'}</span>
              <span className="lb-col-multi">{entry.best_multiplier ? `${entry.best_multiplier}×` : '—'}</span>
            </div>
          );
        })}
      </div>

      {/* Load more */}
      {hasMore && (
        <button className="lb-load-more" onClick={loadMore}>
          Show More ({sorted.length - displayCount} remaining)
        </button>
      )}
    </div>
  );
});

export default LeaderboardPanel;
