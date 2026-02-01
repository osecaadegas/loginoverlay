import { useState } from 'react';
import '../styles/TheLifeLeaderboard.css';

export default function TheLifeLeaderboard({ leaderboard, player, loadLeaderboard }) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (refreshing || !loadLeaderboard) return;
    setRefreshing(true);
    await loadLeaderboard();
    setTimeout(() => setRefreshing(false), 500);
  };

  return (
    <div className="leaderboard-section">
      <div className="leaderboard-header">
        <h2>🏆 Top Players</h2>
        <button 
          className={`refresh-btn ${refreshing ? 'refreshing' : ''}`}
          onClick={handleRefresh}
          disabled={refreshing}
          title="Refresh leaderboard"
        >
          🔄
        </button>
      </div>
      <div className="leaderboard-table">
        <div className="leaderboard-row header">
          <span>Rank</span>
          <span>Player</span>
          <span>Level</span>
          <span>XP</span>
          <span>Net Worth</span>
          <span>PvP Wins</span>
        </div>
        {leaderboard.map((p, index) => (
          <div 
            key={p.id} 
            className={`leaderboard-row ${p.user_id === player?.user_id ? 'current-player' : ''}`}
          >
            <span className="rank">
              {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
            </span>
            <span>{p.username}</span>
            <span>{p.level}</span>
            <span>{Math.floor(p.xp || 0).toLocaleString()}</span>
            <span>${Math.floor(p.net_worth || 0).toLocaleString()}</span>
            <span>{p.pvp_wins || 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
