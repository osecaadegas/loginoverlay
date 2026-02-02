import { useState, useEffect } from 'react';
import { supabase } from '../../../config/supabaseClient';
import '../styles/TheLifeLeaderboard.css';

const PLAYERS_PER_PAGE = 15;

export default function TheLifeLeaderboard({ leaderboard: initialLeaderboard, player, loadLeaderboard }) {
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [leaderboard, setLeaderboard] = useState(initialLeaderboard || []);
  const [sortBy, setSortBy] = useState('level');
  const [loading, setLoading] = useState(false);

  const totalPages = Math.ceil(totalPlayers / PLAYERS_PER_PAGE);

  // Fetch total count on mount
  useEffect(() => {
    fetchTotalCount();
  }, []);

  // Update local state when prop changes
  useEffect(() => {
    if (initialLeaderboard?.length > 0 && currentPage === 1) {
      setLeaderboard(initialLeaderboard);
    }
  }, [initialLeaderboard]);

  const fetchTotalCount = async () => {
    const { count } = await supabase
      .from('the_life_players')
      .select('*', { count: 'exact', head: true });
    setTotalPlayers(count || 0);
  };

  const fetchPage = async (page, sort = sortBy) => {
    setLoading(true);
    try {
      const offset = (page - 1) * PLAYERS_PER_PAGE;
      
      let query = supabase
        .from('the_life_players')
        .select('id, user_id, level, xp, cash, bank_balance, pvp_wins, total_robberies, se_username, twitch_username');

      // Apply sorting
      if (sort === 'level') {
        query = query.order('level', { ascending: false }).order('xp', { ascending: false });
      } else if (sort === 'networth') {
        query = query.order('cash', { ascending: false }).order('bank_balance', { ascending: false });
      } else if (sort === 'pvp') {
        query = query.order('pvp_wins', { ascending: false });
      }

      const { data, error } = await query
        .range(offset, offset + PLAYERS_PER_PAGE - 1)
        .throwOnError();

      if (error) throw error;

      if (data?.length > 0) {
        // Batch fetch usernames
        const userIds = data.filter(p => !p.se_username && !p.twitch_username).map(p => p.user_id);
        let usernameMap = {};
        
        if (userIds.length > 0) {
          const { data: seConnections } = await supabase
            .from('streamelements_connections')
            .select('user_id, se_username')
            .in('user_id', userIds);
          
          seConnections?.forEach(conn => {
            if (conn.se_username) usernameMap[conn.user_id] = conn.se_username;
          });

          const { data: profiles } = await supabase
            .from('user_profiles')
            .select('user_id, twitch_username')
            .in('user_id', userIds);
          
          profiles?.forEach(p => {
            if (p.twitch_username && !usernameMap[p.user_id]) {
              usernameMap[p.user_id] = p.twitch_username;
            }
          });
        }

        const enrichedData = data.map(playerData => ({
          ...playerData,
          username: playerData.se_username || playerData.twitch_username || usernameMap[playerData.user_id] || 'Player',
          net_worth: (playerData.cash || 0) + (playerData.bank_balance || 0)
        }));

        setLeaderboard(enrichedData);
      }
    } catch (err) {
      console.error('Error fetching leaderboard page:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    await fetchTotalCount();
    await fetchPage(currentPage, sortBy);
    if (loadLeaderboard) await loadLeaderboard();
    setTimeout(() => setRefreshing(false), 300);
  };

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    setCurrentPage(page);
    fetchPage(page, sortBy);
  };

  const handleSortChange = (newSort) => {
    if (newSort === sortBy) return;
    setSortBy(newSort);
    setCurrentPage(1);
    fetchPage(1, newSort);
  };

  const getRankDisplay = (index) => {
    const rank = (currentPage - 1) * PLAYERS_PER_PAGE + index + 1;
    if (rank === 1) return <span className="rank-badge gold">1</span>;
    if (rank === 2) return <span className="rank-badge silver">2</span>;
    if (rank === 3) return <span className="rank-badge bronze">3</span>;
    return <span className="rank-number">{rank}</span>;
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num?.toLocaleString() || '0';
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    
    const pages = [];
    const showEllipsis = totalPages > 7;
    
    if (showEllipsis) {
      // Always show first page
      pages.push(1);
      
      if (currentPage > 3) pages.push('...');
      
      // Show pages around current
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      
      if (currentPage < totalPages - 2) pages.push('...');
      
      // Always show last page
      if (totalPages > 1) pages.push(totalPages);
    } else {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    }

    return (
      <div className="lb-pagination">
        <button 
          className="lb-page-btn nav" 
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          ‹
        </button>
        {pages.map((page, idx) => (
          page === '...' ? (
            <span key={`ellipsis-${idx}`} className="lb-ellipsis">…</span>
          ) : (
            <button
              key={page}
              className={`lb-page-btn ${currentPage === page ? 'active' : ''}`}
              onClick={() => handlePageChange(page)}
            >
              {page}
            </button>
          )
        ))}
        <button 
          className="lb-page-btn nav" 
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          ›
        </button>
      </div>
    );
  };

  return (
    <div className="lb-container">
      <div className="lb-header">
        <div className="lb-title-row">
          <h2>🏆 Leaderboard</h2>
          <div className="lb-meta">
            <span className="lb-total">{totalPlayers} players</span>
            <button 
              className={`lb-refresh ${refreshing ? 'spinning' : ''}`}
              onClick={handleRefresh}
              disabled={refreshing || loading}
              title="Refresh"
            >
              ⟳
            </button>
          </div>
        </div>
        <div className="lb-sort-tabs">
          <button 
            className={`lb-sort-btn ${sortBy === 'level' ? 'active' : ''}`}
            onClick={() => handleSortChange('level')}
          >
            Level
          </button>
          <button 
            className={`lb-sort-btn ${sortBy === 'networth' ? 'active' : ''}`}
            onClick={() => handleSortChange('networth')}
          >
            Net Worth
          </button>
          <button 
            className={`lb-sort-btn ${sortBy === 'pvp' ? 'active' : ''}`}
            onClick={() => handleSortChange('pvp')}
          >
            PvP Wins
          </button>
        </div>
      </div>

      <div className={`lb-table-wrapper ${loading ? 'loading' : ''}`}>
        <table className="lb-table">
          <thead>
            <tr>
              <th className="col-rank">#</th>
              <th className="col-player">Player</th>
              <th className="col-level">Lvl</th>
              <th className="col-xp">XP</th>
              <th className="col-networth">Net Worth</th>
              <th className="col-pvp">PvP</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((p, index) => (
              <tr 
                key={p.id} 
                className={`lb-row ${p.user_id === player?.user_id ? 'is-you' : ''}`}
              >
                <td className="col-rank">{getRankDisplay(index)}</td>
                <td className="col-player">
                  <span className="player-name">{p.username}</span>
                  {p.user_id === player?.user_id && <span className="you-tag">YOU</span>}
                </td>
                <td className="col-level">{p.level}</td>
                <td className="col-xp">{formatNumber(Math.floor(p.xp || 0))}</td>
                <td className="col-networth">${formatNumber(Math.floor(p.net_worth || 0))}</td>
                <td className="col-pvp">{p.pvp_wins || 0}</td>
              </tr>
            ))}
            {leaderboard.length === 0 && !loading && (
              <tr><td colSpan="6" className="lb-empty">No players found</td></tr>
            )}
          </tbody>
        </table>
        {loading && <div className="lb-loading-overlay"><span className="lb-spinner"></span></div>}
      </div>

      {renderPagination()}
    </div>
  );
}
