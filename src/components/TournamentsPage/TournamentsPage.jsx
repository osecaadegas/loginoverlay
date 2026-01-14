import './TournamentsPage.css';

export default function TournamentsPage() {
  return (
    <div className="tournaments-page">
      <div className="tournaments-container">
        <div className="tournaments-header">
          <h1>🏆 Tournaments</h1>
          <p className="tournaments-subtitle">Compete in exciting tournaments and win amazing prizes</p>
        </div>

        <div className="tournaments-content">
          <div className="coming-soon-banner">
            <div className="banner-icon">🏆</div>
            <h2>Tournaments Coming Soon!</h2>
            <p>We're working hard to bring you exciting tournament competitions. Stay tuned for updates!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
