import { useState, useEffect } from 'react';
import { useStreamElements } from '../../context/StreamElementsContext';
import { supabase } from '../../config/supabaseClient';
import './Blackjack3D.css';

const CARD_VALUES = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 10, 'Q': 10, 'K': 10, 'A': 11
};

const SUITS = ['♥', '♦', '♣', '♠'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export default function Blackjack() {
  const { points, isConnected, updateUserPoints } = useStreamElements();
  const [deck, setDeck] = useState([]);
  const [playerHand, setPlayerHand] = useState([]);
  const [dealerHand, setDealerHand] = useState([]);
  const [betAmount, setBetAmount] = useState(10);
  const [perfectPairsBet, setPerfectPairsBet] = useState(0);
  const [twentyOnePlusThreeBet, setTwentyOnePlusThreeBet] = useState(0);
  const [gameState, setGameState] = useState('betting'); // betting, playing, dealer, finished
  const [message, setMessage] = useState('');
  const [showDealerCard, setShowDealerCard] = useState(false);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    setBalance(points);
  }, [points]);

  const createDeck = () => {
    const newDeck = [];
    for (let suit of SUITS) {
      for (let rank of RANKS) {
        newDeck.push({ suit, rank, value: CARD_VALUES[rank] });
      }
    }
    return shuffleDeck(newDeck);
  };

  const shuffleDeck = (deck) => {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const calculateHandValue = (hand) => {
    let value = 0;
    let aces = 0;

    for (let card of hand) {
      if (card.rank === 'A') {
        aces++;
        value += 11;
      } else {
        value += card.value;
      }
    }

    // Adjust for aces
    while (value > 21 && aces > 0) {
      value -= 10;
      aces--;
    }

    return value;
  };

  const dealCard = (currentDeck) => {
    const card = currentDeck[0];
    const remainingDeck = currentDeck.slice(1);
    return { card, remainingDeck };
  };

  const startGame = async () => {
    if (!isConnected) {
      setMessage('Please connect your StreamElements account first!');
      return;
    }

    if (betAmount > balance || betAmount <= 0) {
      setMessage('Invalid bet amount!');
      return;
    }

    // Deduct bet from balance
    await updateUserPoints(-betAmount);

    // Create and shuffle deck
    let newDeck = createDeck();
    
    // Deal initial cards
    const { card: playerCard1, remainingDeck: deck1 } = dealCard(newDeck);
    const { card: dealerCard1, remainingDeck: deck2 } = dealCard(deck1);
    const { card: playerCard2, remainingDeck: deck3 } = dealCard(deck2);
    const { card: dealerCard2, remainingDeck: deck4 } = dealCard(deck3);

    setDeck(deck4);
    setPlayerHand([playerCard1, playerCard2]);
    setDealerHand([dealerCard1, dealerCard2]);
    setShowDealerCard(false);
    setGameState('playing');
    setMessage('');

    // Check for instant blackjack
    const playerValue = calculateHandValue([playerCard1, playerCard2]);
    if (playerValue === 21) {
      setTimeout(() => dealerPlay([playerCard1, playerCard2], [dealerCard1, dealerCard2], deck4), 500);
    }
  };

  const hit = () => {
    if (gameState !== 'playing') return;

    const { card, remainingDeck } = dealCard(deck);
    const newPlayerHand = [...playerHand, card];
    setPlayerHand(newPlayerHand);
    setDeck(remainingDeck);

    const playerValue = calculateHandValue(newPlayerHand);
    if (playerValue > 21) {
      setShowDealerCard(true);
      setGameState('finished');
      setMessage('Bust! You lose.');
    } else if (playerValue === 21) {
      setTimeout(() => dealerPlay(newPlayerHand, dealerHand, remainingDeck), 500);
    }
  };

  const stand = () => {
    if (gameState !== 'playing') return;
    setGameState('dealer');
    dealerPlay(playerHand, dealerHand, deck);
  };

  const dealerPlay = async (finalPlayerHand, currentDealerHand, currentDeck) => {
    setShowDealerCard(true);
    setGameState('dealer');
    
    let newDealerHand = [...currentDealerHand];
    let newDeck = [...currentDeck];
    let dealerValue = calculateHandValue(newDealerHand);

    // Dealer draws until 17 or higher
    while (dealerValue < 17) {
      await new Promise(resolve => setTimeout(resolve, 800));
      const { card, remainingDeck } = dealCard(newDeck);
      newDealerHand = [...newDealerHand, card];
      newDeck = remainingDeck;
      setDealerHand(newDealerHand);
      dealerValue = calculateHandValue(newDealerHand);
    }

    // Determine winner
    const playerValue = calculateHandValue(finalPlayerHand);
    let resultAmount = 0; // Net win/loss (excluding original bet)
    let resultMessage = '';

    if (dealerValue > 21) {
      resultAmount = betAmount; // Won the bet amount
      resultMessage = `Dealer busts! You win ${betAmount} points!`;
    } else if (playerValue > dealerValue) {
      resultAmount = betAmount; // Won the bet amount
      resultMessage = `You win ${betAmount} points!`;
    } else if (playerValue === dealerValue) {
      resultAmount = betAmount; // Return original bet (push)
      resultMessage = 'Push! Bet returned.';
    } else {
      resultAmount = 0; // Lost the bet (already deducted)
      resultMessage = 'Dealer wins!';
    }

    if (resultAmount > 0) {
      await updateUserPoints(resultAmount);
    }

    // Save game session to database
    await saveGameSession(resultAmount - betAmount, finalPlayerHand, newDealerHand);

    setMessage(resultMessage);
    setGameState('finished');
  };

  const saveGameSession = async (netResult, finalPlayerHand, finalDealerHand) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('game_sessions').insert({
        user_id: user.id,
        game_type: 'blackjack',
        bet_amount: betAmount,
        result_amount: netResult,
        game_data: {
          player_hand: finalPlayerHand,
          dealer_hand: finalDealerHand,
          side_bets: {
            perfect_pairs: perfectPairsBet,
            twenty_one_plus_three: twentyOnePlusThreeBet
          }
        }
      });
    } catch (err) {
      console.error('Error saving game session:', err);
    }
  };

  const resetGame = () => {
    setPlayerHand([]);
    setDealerHand([]);
    setDeck([]);
    setGameState('betting');
    setMessage('');
    setShowDealerCard(false);
  };

  const getCardColor = (suit) => {
    return suit === '♥' || suit === '♦' ? 'red' : 'black';
  };

  return (
    <div className="blackjack-container">
      <div className="blackjack-header">
        <h1>🃏 Blackjack</h1>
        <div className="balance-display">
          <span className="balance-label">Balance:</span>
          <span className="balance-amount">{balance} pts</span>
        </div>
      </div>

      {!isConnected && (
        <div className="connection-warning">
          <p>⚠️ Connect with Twitch to access the games</p>
        </div>
      )}

      <div className="game-layout">
        {/* Left Panel - Betting */}
        <div className="betting-panel">
          <h2>Place Your Bet</h2>
          
          {/* Main Bet */}
          <div className="bet-section">
            <label>Bet Amount (Max 200)</label>
            <div className="bet-input-group">
              <button onClick={() => setBetAmount(Math.max(10, betAmount - 10))}>-</button>
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(Math.min(200, Math.max(10, parseInt(e.target.value) || 10)))}
                min="10"
                max="200"
              />
              <button onClick={() => setBetAmount(Math.min(200, betAmount + 10))}>+</button>
            </div>
            <div className="quick-bet-chips">
              <button onClick={() => setBetAmount(10)}>10</button>
              <button onClick={() => setBetAmount(25)}>25</button>
              <button onClick={() => setBetAmount(50)}>50</button>
              <button onClick={() => setBetAmount(100)}>100</button>
              <button onClick={() => setBetAmount(200)}>200</button>
            </div>
          </div>

          {/* Side Bets */}
          <div className="side-bets-section">
            <h3>Side Bets (Max 10 each)</h3>
            
            <div className="side-bet">
              <label>Perfect Pairs</label>
              <div className="bet-input-group">
                <button onClick={() => setPerfectPairsBet(Math.max(0, perfectPairsBet - 5))}>-</button>
                <input
                  type="number"
                  value={perfectPairsBet}
                  onChange={(e) => setPerfectPairsBet(Math.min(10, Math.max(0, parseInt(e.target.value) || 0)))}
                  min="0"
                  max="10"
                />
                <button onClick={() => setPerfectPairsBet(Math.min(10, perfectPairsBet + 5))}>+</button>
              </div>
            </div>

            <div className="side-bet">
              <label>21+3</label>
              <div className="bet-input-group">
                <button onClick={() => setTwentyOnePlusThreeBet(Math.max(0, twentyOnePlusThreeBet - 5))}>-</button>
                <input
                  type="number"
                  value={twentyOnePlusThreeBet}
                  onChange={(e) => setTwentyOnePlusThreeBet(Math.min(10, Math.max(0, parseInt(e.target.value) || 0)))}
                  min="0"
                  max="10"
                />
                <button onClick={() => setTwentyOnePlusThreeBet(Math.min(10, twentyOnePlusThreeBet + 5))}>+</button>
              </div>
            </div>
          </div>

          {gameState === 'betting' && (
            <button className="deal-button" onClick={startGame} disabled={!isConnected}>
              Deal Cards
            </button>
          )}

          {gameState === 'finished' && (
            <button className="deal-button" onClick={resetGame}>
              New Game
            </button>
          )}
        </div>

        {/* Right Panel - Game Table */}
        <div className="game-table">
          {/* Dealer Hand */}
          <div className="hand dealer-hand">
            <h3>Dealer's Hand {showDealerCard && `(${calculateHandValue(dealerHand)})`}</h3>
            <div className="cards">
              {dealerHand.map((card, index) => (
                <div
                  key={index}
                  className={`card ${!showDealerCard && index === 1 ? 'card-hidden' : ''}`}
                >
                  {(!showDealerCard && index === 1) ? (
                    <div className="card-back">🂠</div>
                  ) : (
                    <>
                      <div className={`card-rank ${getCardColor(card.suit)}`}>{card.rank}</div>
                      <div className={`card-suit ${getCardColor(card.suit)}`}>{card.suit}</div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Player Hand */}
          <div className="hand player-hand">
            <h3>Your Hand ({calculateHandValue(playerHand)})</h3>
            <div className="cards">
              {playerHand.map((card, index) => (
                <div key={index} className="card">
                  <div className={`card-rank ${getCardColor(card.suit)}`}>{card.rank}</div>
                  <div className={`card-suit ${getCardColor(card.suit)}`}>{card.suit}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Game Controls */}
          {gameState === 'playing' && (
            <div className="game-controls">
              <button className="action-button hit-button" onClick={hit}>
                Hit
              </button>
              <button className="action-button stand-button" onClick={stand}>
                Stand
              </button>
            </div>
          )}

          {gameState === 'finished' && (
            <div className="game-result">
              <p className="result-message">{message}</p>
              <button className="play-again-button" onClick={resetGame}>
                Play Again
              </button>
            </div>
          )}

          {message && gameState !== 'finished' && (
            <p className="game-message">{message}</p>
          )}

          {gameState === 'betting' && (
            <div className="waiting-message">
              <p>Place your bet to start the game</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
