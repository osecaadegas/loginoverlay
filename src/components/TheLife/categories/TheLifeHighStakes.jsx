import { useState, useRef } from 'react';
import { useDragScroll } from '../hooks/useDragScroll';
import '../TheLife.css';

// Import game components
import TheLifeBlackjack from '../games/TheLifeBlackjack';
import TheLifeStockMarket from '../games/TheLifeStockMarket';
import CasinoLobby from '../games/casino/CasinoLobby';

/**
 * High Stakes Category Component
 * Contains 2 subcategories: Casino and Stock Market
 */
export default function TheLifeHighStakes({
  player,
  setPlayer,
  setMessage,
  showEventMessage,
  user,
  isInJail,
  isInHospital
}) {
  const [activeSubTab, setActiveSubTab] = useState('casino');
  const [activeGame, setActiveGame] = useState(null); // Which game is being played
  const contentScrollRef = useRef(null);
  const contentDragScroll = useDragScroll(contentScrollRef);

  // Subcategory definitions
  const subcategories = [
    { key: 'casino', name: 'Casino', image: '/thelife/subcategories/casino.png' },
    { key: 'stockmarket', name: 'Stock Market', image: '/thelife/subcategories/stock-market.png' }
  ];

  // Casino game options
  const casinoGames = [
    { 
      key: 'mines', 
      name: 'Mines', 
      description: 'Avoid the mines and cash out big!',
      image: '/thelife/games/mines.png',
      minBet: 10,
      maxBet: 1000
    },
    { 
      key: 'blackjack', 
      name: 'Blackjack', 
      description: 'Beat the dealer to 21!',
      image: '/thelife/games/blackjack.png',
      minBet: 10,
      maxBet: 500
    },
    { 
      key: 'poker', 
      name: 'Poker Tables', 
      description: 'Join multiplayer tables!',
      image: '/thelife/games/poker.png',
      minBet: 50,
      maxBet: 10000
    },
    { 
      key: 'roulette', 
      name: 'Roulette', 
      description: 'Place your bets on the wheel!',
      image: '/thelife/games/roulette.png',
      minBet: 10,
      maxBet: 1000
    }
  ];

  // Handle going back from a game to game selection
  const handleBackToGames = () => {
    setActiveGame(null);
  };

  // Render casino game selection cards
  const renderCasinoGames = () => {
    return (
      <div className="casino-games-grid">
        {casinoGames.map(game => (
          <div 
            key={game.key}
            className="casino-game-card"
            onClick={() => setActiveGame(game.key)}
          >
            <div className="casino-game-image">
              <img src={game.image} alt={game.name} />
            </div>
            <div className="casino-game-info">
              <h3>{game.name}</h3>
              <p>{game.description}</p>
              <div className="casino-game-limits">
                <span>Min: ${game.minBet}</span>
                <span>Max: ${game.maxBet}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render the active game component
  const renderActiveGame = () => {
    switch (activeGame) {
      case 'mines':
        return (
          <div className="game-container">
            <button className="back-to-games-btn" onClick={handleBackToGames}>
              ← Back to Casino
            </button>
            <div className="game-placeholder">
              <h3>Mines Game</h3>
              <p>Game component will be loaded here</p>
            </div>
          </div>
        );
      case 'blackjack':
        return (
          <TheLifeBlackjack
            player={player}
            setPlayer={setPlayer}
            setMessage={setMessage}
            user={user}
            onBack={handleBackToGames}
          />
        );
      case 'poker':
        return (
          <CasinoLobby
            player={player}
            setPlayer={setPlayer}
            setMessage={setMessage}
            user={user}
            onBack={handleBackToGames}
          />
        );
      case 'roulette':
        return (
          <div className="game-container">
            <button className="back-to-games-btn" onClick={handleBackToGames}>
              ← Back to Casino
            </button>
            <div className="game-placeholder">
              <h3>Roulette Game</h3>
              <p>Game component will be loaded here</p>
            </div>
          </div>
        );
      default:
        return renderCasinoGames();
    }
  };

  const renderSubcategoryContent = () => {
    switch (activeSubTab) {
      case 'casino':
        return (
          <div className="highstakes-content casino-content">
            {renderActiveGame()}
          </div>
        );
      case 'stockmarket':
        return (
          <div className="highstakes-content stockmarket-content">
            <TheLifeStockMarket
              player={player}
              setPlayer={setPlayer}
              setMessage={setMessage}
              user={user}
              onBack={() => setActiveSubTab('casino')}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="category-content highstakes-category">
      {/* Subcategory Tabs */}
      <div className="subcategory-tabs">
        {subcategories.map(sub => (
          <button
            key={sub.key}
            className={`subcategory-tab ${activeSubTab === sub.key ? 'active' : ''}`}
            onClick={() => {
              setActiveSubTab(sub.key);
              setActiveGame(null); // Reset game when switching tabs
            }}
          >
            <img src={sub.image} alt={sub.name} />
          </button>
        ))}
      </div>

      {/* Subcategory Content */}
      <div 
        className="subcategory-content-scroll"
        ref={contentScrollRef}
        {...contentDragScroll}
      >
        {renderSubcategoryContent()}
      </div>
    </div>
  );
}
