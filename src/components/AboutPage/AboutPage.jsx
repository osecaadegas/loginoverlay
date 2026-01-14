import './AboutPage.css';

export default function AboutPage() {
  return (
    <div className="about-page">
      <div className="about-container">
        <h1>ℹ️ About Us</h1>
        
        <div className="about-content">
          <div className="about-section">
            <h2>Our Mission</h2>
            <p>
              We provide professional streaming overlay solutions for casino streamers,
              helping content creators engage their audience with interactive features
              and beautiful designs.
            </p>
          </div>

          <div className="features-grid">
            <div className="feature-box">
              <span className="feature-icon">🎰</span>
              <h3>Bonus Hunt Tracker</h3>
              <p>Track your bonus hunts with real-time statistics</p>
            </div>
            <div className="feature-box">
              <span className="feature-icon">🏆</span>
              <h3>Tournaments</h3>
              <p>Create and manage slot tournaments</p>
            </div>
            <div className="feature-box">
              <span className="feature-icon">🎁</span>
              <h3>Giveaways</h3>
              <p>Run interactive giveaways for your viewers</p>
            </div>
            <div className="feature-box">
              <span className="feature-icon">🎨</span>
              <h3>Customizable</h3>
              <p>Multiple themes and layouts to choose from</p>
            </div>
          </div>

          <div className="about-section">
            <h2>Contact Us</h2>
            <p>Have questions or need support? Reach out to us!</p>
            <div className="contact-info">
              <div className="contact-item">
                <span>📧</span>
                <span>support@streamoverlay.com</span>
              </div>
              <div className="contact-item">
                <span>💬</span>
                <span>Discord: StreamOverlay#1234</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
