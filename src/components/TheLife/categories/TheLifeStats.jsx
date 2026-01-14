import '../styles/TheLifeStats.css';

export default function TheLifeStats({ player }) {
  const successRate = player?.total_robberies 
    ? ((player.successful_robberies / player.total_robberies) * 100).toFixed(1)
    : 0;

  return (
    <div className="stats-section">
      <h2>📊 Your Statistics</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-icon">⭐</span>
          <span className="stat-value">{player?.level}</span>
          <span className="stat-label">Level</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🎯</span>
          <span className="stat-value">{player?.total_robberies || 0}</span>
          <span className="stat-label">Total Crimes</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">✅</span>
          <span className="stat-value">{player?.successful_robberies || 0}</span>
          <span className="stat-label">Successful</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">📈</span>
          <span className="stat-value">{successRate}%</span>
          <span className="stat-label">Success Rate</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">⚔️</span>
          <span className="stat-value">{player?.pvp_wins || 0}</span>
          <span className="stat-label">PvP Wins</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🔥</span>
          <span className="stat-value">{player?.consecutive_logins || 0}</span>
          <span className="stat-label">Login Streak</span>
        </div>
      </div>
    </div>
  );
}
