import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './GamesPage.css';

export default function GamesPage({ gameType }) {
  const { user } = useAuth();

  const gameInfo = {
    coinflip: {
      title: '🪙 Coin Flip',
      description: 'Bet on heads or tails. Double or nothing!',
      minBet: 10,
      icon: '🪙',
      multiplier: '2x'
    },
    dice: {
      title: '🎲 Dice Roll',
      description: 'Roll the dice and predict the outcome!',
      minBet: 20,
      icon: '🎲',
      multiplier: '6x'
    },
    roulette: {
      title: '🎰 Roulette',
      description: 'Spin the wheel and test your luck!',
      minBet: 50,
      icon: '🎰',
      multiplier: 'up to 35x'
    },
    slots: {
      title: '🎰 Slot Machine',
      description: 'Pull the lever and win big!',
      minBet: 25,
      icon: '🎰',
      multiplier: 'up to 10x'
    }
  };

  const currentGame = gameInfo[gameType];

  return (
    <div className="games-page">
      <div className="games-container">
        <h1>{currentGame.icon} {currentGame.title.replace(currentGame.icon + ' ', '')}</h1>
        <p className="games-subtitle">{currentGame.description}</p>

        {!user ? (
          <div className="games-login-notice">
            <div className="login-notice-icon">🔒</div>
            <h3>Twitch Login Required</h3>
            <p>Please log in with your Twitch account to play this game.</p>
          </div>
        ) : (
          <div className="game-play-area">
            <div className="game-info-card">
              <div className="game-info-row">
                <span className="info-label">Min Bet:</span>
                <span className="info-value">{currentGame.minBet} pts</span>
              </div>
              <div className="game-info-row">
                <span className="info-label">Max Payout:</span>
                <span className="info-value">{currentGame.multiplier}</span>
              </div>
            </div>

            <div className="coming-soon-container">
              <div className="coming-soon-icon">🚧</div>
              <h2>Coming Soon!</h2>
              <p>This game is currently under development.</p>
              <p>Check back later for exciting gameplay!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
