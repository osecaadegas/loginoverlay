import './GuessBalancePage.css';

export default function GuessBalancePage() {
  return (
    <div className="guess-balance-page">
      <div className="guess-balance-container">
        <div className="guess-balance-header">
          <h1>💰 Guess the Balance</h1>
          <p className="guess-balance-subtitle">Test your skills and guess the balance to win big prizes</p>
        </div>

        <div className="guess-balance-content">
          <div className="coming-soon-banner">
            <div className="banner-icon">💰</div>
            <h2>Guess the Balance Coming Soon!</h2>
            <p>We're preparing an exciting guessing game for you. Check back soon for more details!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
