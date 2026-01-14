import '../styles/TheLifeLeaderboard.css';

export default function TheLifeLeaderboard({ leaderboard, player }) {
  return (
    <div className="leaderboard-section">
      <h2>🏆 Top Players</h2>
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
            <span>{p.xp?.toLocaleString()}</span>
            <span>${p.net_worth?.toLocaleString()}</span>
            <span>{p.pvp_wins || 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
