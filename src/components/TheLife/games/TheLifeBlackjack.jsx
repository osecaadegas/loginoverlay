import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../config/supabaseClient';
import './TheLifeBlackjack.css';

// Game Constants
const SUITS = ['♠', '♣', '♥', '♦'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const NUM_DECKS = 6;
const SHUFFLE_POINT = 0.25; // Shuffle when 25% of cards remain
const MIN_BET = 10;
const MAX_BET = 5000;
const BET_OPTIONS = [10, 50, 100, 500, 1000];

/**
 * TheLife Blackjack Game Component
 * Uses player's cash (not bank) for betting
 */
export default function TheLifeBlackjack({
  player,
  setPlayer,
  setMessage,
  user,
  onBack
}) {
  // Game State
  const [shoe, setShoe] = useState([]);
  const [playerHand, setPlayerHand] = useState([]);
  const [dealerHand, setDealerHand] = useState([]);
  const [currentBet, setCurrentBet] = useState(100);
  const [gameState, setGameState] = useState('betting'); // betting, playing, dealer_turn, resolved
  const [gameMessage, setGameMessage] = useState({ text: '', type: '' });
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize shoe on mount
  useEffect(() => {
    initShoe();
  }, []);

  // Create and shuffle a new shoe
  const initShoe = useCallback(() => {
    const newShoe = [];
    for (let i = 0; i < NUM_DECKS; i++) {
      for (const suit of SUITS) {
        for (const val of VALUES) {
          newShoe.push({ suit, val });
        }
      }
    }
    // Fisher-Yates shuffle
    for (let i = newShoe.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newShoe[i], newShoe[j]] = [newShoe[j], newShoe[i]];
    }
    setShoe(newShoe);
  }, []);

  // Draw a card from the shoe
  const drawCard = useCallback(() => {
    if (shoe.length === 0) return null;
    const newShoe = [...shoe];
    const card = newShoe.pop();
    setShoe(newShoe);
    return card;
  }, [shoe]);

  // Calculate hand score
  const calculateScore = (hand) => {
    let score = 0;
    let aces = 0;
    for (const card of hand) {
      if (card.val === 'A') {
        aces++;
        score += 11;
      } else if (['J', 'Q', 'K'].includes(card.val)) {
        score += 10;
      } else {
        score += parseInt(card.val);
      }
    }
    while (score > 21 && aces > 0) {
      score -= 10;
      aces--;
    }
    return score;
  };

  // Update player cash via secure RPC
  const updatePlayerCash = async (newCash) => {
    try {
      const cashChange = newCash - player.cash;
      const { data: cashResult, error } = await supabase.rpc('adjust_player_cash', { p_amount: cashChange });
      if (error) throw error;
      if (!cashResult.success) throw new Error(cashResult.error);

      setPlayer(prev => ({ ...prev, cash: cashResult.player.cash }));
      return true;
    } catch (error) {
      console.error('Error updating cash:', error);
      setMessage({ type: 'error', text: `Failed to update cash: ${error.message}` });
      return false;
    }
  };

  // Adjust bet amount
  const adjustBet = (amount) => {
    if (gameState !== 'betting') return;
    if (amount <= player.cash && amount >= MIN_BET && amount <= MAX_BET) {
      setCurrentBet(amount);
    }
  };

  // Deal initial hands
  const dealHand = async () => {
    if (isProcessing) return;
    if (player.cash < currentBet) {
      showGameMessage("NOT ENOUGH CASH", 'bad');
      return;
    }

    setIsProcessing(true);

    // Check if shoe needs shuffle
    if (shoe.length < (NUM_DECKS * 52 * SHUFFLE_POINT)) {
      initShoe();
      showGameMessage("SHUFFLING DECK...", 'neutral');
      await new Promise(r => setTimeout(r, 1000));
    }

    // Deduct bet from player cash
    const newCash = player.cash - currentBet;
    const success = await updatePlayerCash(newCash);
    if (!success) {
      setIsProcessing(false);
      return;
    }

    // Draw cards for player and dealer
    const newShoe = [...shoe];
    const pCard1 = newShoe.pop();
    const dCard1 = newShoe.pop();
    const pCard2 = newShoe.pop();
    const dCard2 = newShoe.pop();
    setShoe(newShoe);

    const newPlayerHand = [pCard1, pCard2];
    const newDealerHand = [dCard1, dCard2];
    
    setPlayerHand(newPlayerHand);
    setDealerHand(newDealerHand);
    setGameState('playing');
    setGameMessage({ text: '', type: '' });
    setIsProcessing(false);

    // Check for natural blackjack
    const playerScore = calculateScore(newPlayerHand);
    const dealerScore = calculateScore(newDealerHand);
    
    if (playerScore === 21) {
      if (dealerScore === 21) {
        resolve('push', newPlayerHand, newDealerHand, newShoe);
      } else {
        resolve('blackjack', newPlayerHand, newDealerHand, newShoe);
      }
    }
  };

  // Player hits
  const hit = () => {
    if (gameState !== 'playing' || isProcessing) return;

    const newShoe = [...shoe];
    const newCard = newShoe.pop();
    setShoe(newShoe);

    const newHand = [...playerHand, newCard];
    setPlayerHand(newHand);

    if (calculateScore(newHand) > 21) {
      resolve('bust', newHand, dealerHand, newShoe);
    }
  };

  // Player stands
  const stand = () => {
    if (gameState !== 'playing' || isProcessing) return;
    dealerTurn([...shoe]);
  };

  // Player doubles down
  const doubleDown = async () => {
    if (gameState !== 'playing' || playerHand.length !== 2 || isProcessing) return;
    if (player.cash < currentBet) {
      showGameMessage("NOT ENOUGH CASH TO DOUBLE", 'bad');
      return;
    }

    setIsProcessing(true);

    // Deduct additional bet
    const newCash = player.cash - currentBet;
    const success = await updatePlayerCash(newCash);
    if (!success) {
      setIsProcessing(false);
      return;
    }

    // Double the current bet
    setCurrentBet(prev => prev * 2);

    // Draw one card
    const newShoe = [...shoe];
    const newCard = newShoe.pop();
    setShoe(newShoe);

    const newHand = [...playerHand, newCard];
    setPlayerHand(newHand);

    setIsProcessing(false);

    if (calculateScore(newHand) > 21) {
      resolve('bust', newHand, dealerHand, newShoe);
    } else {
      dealerTurn(newShoe, newHand);
    }
  };

  // Dealer's turn
  const dealerTurn = async (currentShoe, pHand = playerHand) => {
    setGameState('dealer_turn');
    setIsProcessing(true);

    let newShoe = [...currentShoe];
    let newDealerHand = [...dealerHand];
    let dealerScore = calculateScore(newDealerHand);

    // Dealer draws until 17
    while (dealerScore < 17) {
      await new Promise(r => setTimeout(r, 800));
      const newCard = newShoe.pop();
      newDealerHand = [...newDealerHand, newCard];
      setDealerHand(newDealerHand);
      setShoe(newShoe);
      dealerScore = calculateScore(newDealerHand);
    }

    const playerScore = calculateScore(pHand);

    if (dealerScore > 21) {
      resolve('win', pHand, newDealerHand, newShoe);
    } else if (dealerScore > playerScore) {
      resolve('lose', pHand, newDealerHand, newShoe);
    } else if (dealerScore < playerScore) {
      resolve('win', pHand, newDealerHand, newShoe);
    } else {
      resolve('push', pHand, newDealerHand, newShoe);
    }
  };

  // Resolve the game
  const resolve = async (result, pHand, dHand, currentShoe) => {
    setGameState('resolved');
    setPlayerHand(pHand);
    setDealerHand(dHand);
    setShoe(currentShoe);

    let msg = "";
    let winAmount = 0;
    let msgType = 'neutral';

    switch (result) {
      case 'win':
        msg = "YOU TOOK THEIR CUT";
        winAmount = currentBet * 2;
        msgType = 'good';
        break;
      case 'blackjack':
        msg = "BLACKJACK!";
        winAmount = Math.floor(currentBet * 2.5);
        msgType = 'good';
        break;
      case 'lose':
        msg = "THEY GOT YOU";
        winAmount = 0;
        msgType = 'bad';
        break;
      case 'bust':
        msg = "BUSTED";
        winAmount = 0;
        msgType = 'bad';
        break;
      case 'push':
        msg = "PUSH - BET RETURNED";
        winAmount = currentBet;
        msgType = 'neutral';
        break;
      default:
        break;
    }

    // Add winnings to player cash
    if (winAmount > 0) {
      const newCash = player.cash + winAmount;
      await updatePlayerCash(newCash);
    }

    showGameMessage(msg, msgType);
    setIsProcessing(false);

    // Auto-reset after delay
    setTimeout(() => {
      resetGame();
    }, 3000);
  };

  // Show game message
  const showGameMessage = (text, type) => {
    setGameMessage({ text, type });
  };

  // Reset for new game
  const resetGame = () => {
    setCurrentBet(100);
    setGameState('betting');
    setPlayerHand([]);
    setDealerHand([]);
    setGameMessage({ text: '', type: '' });
  };

  // Render a card
  const renderCard = (card, hidden = false) => {
    const isRed = card.suit === '♥' || card.suit === '♦';
    
    return (
      <div className="bj-card-slot" key={`${card.suit}-${card.val}-${Math.random()}`}>
        <div className={`bj-card ${hidden ? 'flipped' : ''}`}>
          <div className={`bj-card-front ${isRed ? 'red' : 'black'}`}>
            <div className="bj-card-corner top-left">
              <span className="bj-card-value">{card.val}</span>
              <span className="bj-card-suit">{card.suit}</span>
            </div>
            <div className="bj-card-center">{card.suit}</div>
            <div className="bj-card-corner bottom-right">
              <span className="bj-card-value">{card.val}</span>
              <span className="bj-card-suit">{card.suit}</span>
            </div>
          </div>
          <div className="bj-card-back"></div>
        </div>
      </div>
    );
  };

  const playerScore = calculateScore(playerHand);
  const dealerScore = calculateScore(dealerHand);
  const showDealerCards = gameState === 'dealer_turn' || gameState === 'resolved';

  return (
    <div className="bj-game-container">
      {/* Header */}
      <div className="bj-header">
        <button className="bj-back-btn" onClick={onBack}>
          ← Back to Casino
        </button>
        <div className="bj-title">
          <h1>BLACKJACK</h1>
          <p>6 Decks • Dealer stands on 17 • Pays 3:2</p>
        </div>
        <div className="bj-balance">
          <span className="bj-balance-label">CASH</span>
          <span className="bj-balance-amount">${player.cash?.toLocaleString() || 0}</span>
        </div>
      </div>

      {/* Table */}
      <div className="bj-table">
        {/* Dealer Area */}
        <div className="bj-dealer-area">
          <div className="bj-label">Dealer</div>
          <div className="bj-score">{dealerHand.length > 0 ? (showDealerCards ? dealerScore : '?') : ''}</div>
          <div className="bj-cards">
            {dealerHand.map((card, i) => renderCard(card, !showDealerCards && i === 1))}
          </div>
        </div>

        {/* Game Message */}
        {gameMessage.text && (
          <div className={`bj-game-message ${gameMessage.type}`}>
            {gameMessage.text}
          </div>
        )}

        {/* Player Area */}
        <div className="bj-player-area">
          <div className="bj-cards">
            {playerHand.map((card) => renderCard(card, false))}
          </div>
          <div className="bj-score">{playerHand.length > 0 ? playerScore : ''}</div>
          <div className="bj-label">Your Hand</div>
        </div>
      </div>

      {/* Controls */}
      <div className="bj-controls">
        {/* Betting Controls */}
        {gameState === 'betting' && (
          <div className="bj-betting-controls">
            <div className="bj-bet-buttons">
              {BET_OPTIONS.map(amount => (
                <button
                  key={amount}
                  className={`bj-bet-btn ${currentBet === amount ? 'active' : ''}`}
                  onClick={() => adjustBet(amount)}
                  disabled={amount > player.cash}
                >
                  ${amount}
                </button>
              ))}
            </div>
            <div className="bj-current-bet">
              <span className="bj-bet-label">Current Bet</span>
              <span className="bj-bet-amount">${currentBet}</span>
            </div>
            <button 
              className="bj-deal-btn"
              onClick={dealHand}
              disabled={isProcessing || player.cash < currentBet}
            >
              DEAL
            </button>
          </div>
        )}

        {/* Action Controls */}
        {gameState === 'playing' && (
          <div className="bj-action-controls">
            <button className="bj-action-btn hit" onClick={hit} disabled={isProcessing}>
              HIT
            </button>
            <button className="bj-action-btn stand" onClick={stand} disabled={isProcessing}>
              STAND
            </button>
            <button 
              className="bj-action-btn double" 
              onClick={doubleDown}
              disabled={isProcessing || playerHand.length !== 2 || player.cash < currentBet}
            >
              DOUBLE
            </button>
          </div>
        )}

        {/* Deck Status */}
        <div className="bj-deck-status">
          Shoe: {shoe.length} cards remaining
        </div>
      </div>
    </div>
  );
}
