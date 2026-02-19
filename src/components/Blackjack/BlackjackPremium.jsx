import { useState } from 'react';
import { useStreamElements } from '../../context/StreamElementsContext';
import { useAuth } from '../../context/AuthContext';
import './BlackjackPremium.css';

const CARD_VALUES = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 10, 'Q': 10, 'K': 10, 'A': 11
};

const SUITS = {
  hearts: { symbol: '♥', color: '#EF4444' },
  diamonds: { symbol: '♦', color: '#EF4444' },
  clubs: { symbol: '♣', color: '#1F2937' },
  spades: { symbol: '♠', color: '#1F2937' }
};

const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const CHIP_VALUES = [10, 25, 50, 100, 200];
const MAX_BET = 200;
const MAX_SIDE_BET = 10;

export default function BlackjackPremium() {
  const { points, isConnected, seAccount, updateUserPoints, refreshPoints } = useStreamElements();
  const { user } = useAuth();
  
  // Game state
  const [deck, setDeck] = useState([]);
  const [playerHand, setPlayerHand] = useState([]);
  const [dealerHand, setDealerHand] = useState([]);
  const [splitHands, setSplitHands] = useState([]);
  const [currentSplitIndex, setCurrentSplitIndex] = useState(0);
  const [gamePhase, setGamePhase] = useState('betting');
  const [dealerRevealed, setDealerRevealed] = useState(false);
  
  // Betting
  const [currentBet, setCurrentBet] = useState(0);
  const [sideBets, setSideBets] = useState({
    perfectPair: 0,
    twentyOneThree: 0
  });
  
  // Game controls
  const [message, setMessage] = useState('');
  const [canDoubleDown, setCanDoubleDown] = useState(false);
  const [canSplit, setCanSplit] = useState(false);
  const [gameHistory, setGameHistory] = useState([]);
  const [dealerDrawing, setDealerDrawing] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [selectedChip, setSelectedChip] = useState(null);

  // Create and shuffle deck (6 decks)
  const createDeck = () => {
    const singleDeck = [];
    Object.keys(SUITS).forEach(suit => {
      RANKS.forEach(rank => {
        singleDeck.push({
          suit,
          rank,
          value: CARD_VALUES[rank],
          suitSymbol: SUITS[suit].symbol,
          color: SUITS[suit].color
        });
      });
    });
    
    // Create 6 decks (312 cards total)
    const newDeck = [];
    for (let i = 0; i < 6; i++) {
      newDeck.push(...singleDeck);
    }
    
    // Fisher-Yates shuffle
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    
    return newDeck;
  };

  // Calculate hand value
  const calculateScore = (hand) => {
    let value = 0;
    let aces = 0;
    
    hand.forEach(card => {
      if (card.rank === 'A') {
        aces++;
        value += 11;
      } else {
        value += card.value;
      }
    });
    
    while (value > 21 && aces > 0) {
      value -= 10;
      aces--;
    }
    
    return value;
  };

  // Add chip to bet
  const addChipToBet = (value) => {
    if (gamePhase !== 'betting') return;
    if (currentBet + value > points) return;
    if (currentBet + value > MAX_BET) return;
    setCurrentBet(prev => prev + value);
    setSelectedChip(value);
    setTimeout(() => setSelectedChip(null), 200);
  };

  // Clear bet
  const clearBet = () => {
    if (gamePhase !== 'betting') return;
    setCurrentBet(0);
    setSideBets({ perfectPair: 0, twentyOneThree: 0 });
  };

  // Place side bet
  const placeSideBet = (type, amount) => {
    if (gamePhase !== 'betting') return;
    if (amount > MAX_SIDE_BET) return;
    const totalBet = currentBet + sideBets.perfectPair + sideBets.twentyOneThree + amount;
    if (totalBet > points) return;
    
    setSideBets(prev => ({ ...prev, [type]: amount }));
  };

  // Start new round
  const startNewRound = async () => {
    if (!isConnected) {
      setMessage('Please connect StreamElements first!');
      return;
    }

    if (currentBet === 0) {
      setMessage('Please place a bet!');
      return;
    }

    const totalBet = currentBet + sideBets.perfectPair + sideBets.twentyOneThree;
    if (totalBet > points) {
      setMessage('Insufficient balance!');
      return;
    }

    // Deduct bet from balance
    await updateUserPoints(-totalBet);

    // Create and deal cards
    const freshDeck = createDeck();
    const newPlayerHand = [freshDeck[0], freshDeck[2]];
    const newDealerHand = [freshDeck[1], freshDeck[3]];
    const remainingDeck = freshDeck.slice(4);

    setPlayerHand(newPlayerHand);
    setDealerHand(newDealerHand);
    setDeck(remainingDeck);
    setGamePhase('playing');
    setDealerRevealed(false);
    setSplitHands([]);
    setCurrentSplitIndex(0);
    setMessage('');

    // Check for blackjack
    const playerScore = calculateScore(newPlayerHand);
    if (playerScore === 21) {
      setTimeout(() => dealerTurn([newPlayerHand], newDealerHand, remainingDeck), 1000);
      return;
    }

    // Check for double down and split
    setCanDoubleDown(true);
    setCanSplit(
      newPlayerHand[0].rank === newPlayerHand[1].rank && 
      points >= currentBet
    );

    // Check side bets
    checkSideBets(newPlayerHand, newDealerHand);
  };

  // Check side bet wins
  const checkSideBets = async (playerCards, dealerCards) => {
    let sideBetWinnings = 0;
    let sideBetMessage = '';

    // Perfect Pair check
    if (sideBets.perfectPair > 0) {
      const card1 = playerCards[0];
      const card2 = playerCards[1];
      
      if (card1.rank === card2.rank && card1.suit === card2.suit) {
        // Perfect pair - same rank and suit
        sideBetWinnings += sideBets.perfectPair * 25;
        sideBetMessage += ' Perfect Pair! +' + (sideBets.perfectPair * 25);
      } else if (card1.rank === card2.rank && card1.color === card2.color) {
        // Colored pair - same rank and color
        sideBetWinnings += sideBets.perfectPair * 12;
        sideBetMessage += ' Colored Pair! +' + (sideBets.perfectPair * 12);
      } else if (card1.rank === card2.rank) {
        // Mixed pair - same rank, different color
        sideBetWinnings += sideBets.perfectPair * 6;
        sideBetMessage += ' Mixed Pair! +' + (sideBets.perfectPair * 6);
      }
    }

    // 21+3 check
    if (sideBets.twentyOneThree > 0) {
      const threeCards = [...playerCards, dealerCards[0]];
      const suits = threeCards.map(c => c.suit);
      const ranks = threeCards.map(c => c.rank);
      const sortedRanks = ranks.map(r => RANKS.indexOf(r)).sort((a, b) => a - b);
      
      // Check for suited trips
      const isSuitedTrips = suits.every(s => s === suits[0]) && ranks.every(r => r === ranks[0]);
      
      // Check for straight flush
      const isFlush = suits.every(s => s === suits[0]);
      const isStraight = sortedRanks[1] === sortedRanks[0] + 1 && sortedRanks[2] === sortedRanks[1] + 1;
      const isStraightFlush = isFlush && isStraight;
      
      // Check for three of a kind
      const isThreeOfKind = ranks.every(r => r === ranks[0]);
      
      if (isSuitedTrips) {
        sideBetWinnings += sideBets.twentyOneThree * 100;
        sideBetMessage += ' Suited Trips! +' + (sideBets.twentyOneThree * 100);
      } else if (isStraightFlush) {
        sideBetWinnings += sideBets.twentyOneThree * 40;
        sideBetMessage += ' Straight Flush! +' + (sideBets.twentyOneThree * 40);
      } else if (isThreeOfKind) {
        sideBetWinnings += sideBets.twentyOneThree * 30;
        sideBetMessage += ' Three of a Kind! +' + (sideBets.twentyOneThree * 30);
      } else if (isStraight) {
        sideBetWinnings += sideBets.twentyOneThree * 10;
        sideBetMessage += ' Straight! +' + (sideBets.twentyOneThree * 10);
      } else if (isFlush) {
        sideBetWinnings += sideBets.twentyOneThree * 5;
        sideBetMessage += ' Flush! +' + (sideBets.twentyOneThree * 5);
      }
    }

    if (sideBetWinnings > 0) {
      await updateUserPoints(sideBetWinnings);
      setMessage('Side Bet Win!' + sideBetMessage);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // Player hits
  const hit = () => {
    if (gamePhase !== 'playing') return;

    const activeHand = splitHands.length > 0 ? splitHands[currentSplitIndex] : playerHand;
    const newCard = deck[0];
    const newDeck = deck.slice(1);
    const newHand = [...activeHand, newCard];

    let finalHands;
    if (splitHands.length > 0) {
      const newSplitHands = [...splitHands];
      newSplitHands[currentSplitIndex] = newHand;
      setSplitHands(newSplitHands);
      finalHands = newSplitHands;
    } else {
      setPlayerHand(newHand);
      finalHands = [newHand];
    }
    
    setDeck(newDeck);
    setCanDoubleDown(false);
    setCanSplit(false);

    const score = calculateScore(newHand);
    if (score > 21) {
      // Bust
      if (splitHands.length > 0 && currentSplitIndex < splitHands.length - 1) {
        // Move to next split hand
        setCurrentSplitIndex(prev => prev + 1);
        setMessage(`Hand ${currentSplitIndex + 1} Busts! Playing Hand ${currentSplitIndex + 2}`);
      } else {
        setMessage('BUST! You lose.');
        setGamePhase('ended');
        addToHistory('Bust', -currentBet * (splitHands.length > 0 ? splitHands.length : 1));
        setTimeout(() => resetRound(), 3000);
      }
    } else if (score === 21) {
      if (splitHands.length > 0 && currentSplitIndex < splitHands.length - 1) {
        setCurrentSplitIndex(prev => prev + 1);
        setMessage(`21! Playing Hand ${currentSplitIndex + 2}`);
      } else {
        setTimeout(() => dealerTurn(finalHands, dealerHand, newDeck), 500);
      }
    }
  };

  // Player stands
  const stand = () => {
    if (gamePhase !== 'playing') return;
    
    if (splitHands.length > 0 && currentSplitIndex < splitHands.length - 1) {
      setCurrentSplitIndex(prev => prev + 1);
      setMessage(`Playing Hand ${currentSplitIndex + 2}`);
    } else {
      const finalHands = splitHands.length > 0 ? splitHands : [playerHand];
      dealerTurn(finalHands, dealerHand, deck);
    }
  };

  // Player doubles down
  const doubleDown = async () => {
    if (!canDoubleDown || points < currentBet) return;

    await updateUserPoints(-currentBet);
    const newBet = currentBet * 2;
    setCurrentBet(newBet);

    const newCard = deck[0];
    const newDeck = deck.slice(1);
    const newHand = [...playerHand, newCard];

    setPlayerHand(newHand);
    setDeck(newDeck);
    setCanDoubleDown(false);

    const score = calculateScore(newHand);
    if (score > 21) {
      setMessage('BUST! You lose.');
      setGamePhase('ended');
      addToHistory('Double Down Bust', -newBet);
      setTimeout(() => resetRound(), 3000);
    } else {
      setTimeout(() => dealerTurnWithBet([newHand], dealerHand, newDeck, newBet), 500);
    }
  };

  // Player splits
  const split = async () => {
    if (!canSplit || points < currentBet) return;

    await updateUserPoints(-currentBet);
    
    const hand1 = [playerHand[0], deck[0]];
    const hand2 = [playerHand[1], deck[1]];
    const newDeck = deck.slice(2);

    setSplitHands([hand1, hand2]);
    setPlayerHand(hand1);
    setCurrentSplitIndex(0);
    setDeck(newDeck);
    setCanSplit(false);
    setCanDoubleDown(false);
    setMessage('Playing Hand 1 of 2');
  };

  // Dealer's turn
  const dealerTurn = (finalPlayerHands, currentDealerHand, currentDeck) => {
    dealerTurnWithBet(finalPlayerHands, currentDealerHand, currentDeck, currentBet);
  };

  // Dealer's turn with custom bet amount
  const dealerTurnWithBet = (finalPlayerHands, currentDealerHand, currentDeck, betAmount) => {
    setGamePhase('dealer-turn');
    setDealerRevealed(true);
    setDealerDrawing(true);

    let dealerCards = [...currentDealerHand];
    let dealerScore = calculateScore(dealerCards);
    let deckCopy = [...currentDeck];

    const dealerDrawInterval = setInterval(() => {
      if (dealerScore < 17) {
        const newCard = deckCopy[0];
        deckCopy = deckCopy.slice(1);
        dealerCards = [...dealerCards, newCard];
        dealerScore = calculateScore(dealerCards);
        
        setDealerHand(dealerCards);
        setDeck(deckCopy);
      } else {
        clearInterval(dealerDrawInterval);
        setDealerDrawing(false);
        determineWinner(finalPlayerHands, dealerCards, betAmount);
      }
    }, 1000);
  };

  // Determine winner
  const determineWinner = async (finalPlayerHands, finalDealerHand, betAmount = currentBet) => {
    const dealerScore = calculateScore(finalDealerHand);
    let totalWinnings = 0;
    let results = [];

    finalPlayerHands.forEach((hand, index) => {
      const playerScore = calculateScore(hand);
      let result = '';
      let payoutMultiplier = 0;

      const playerBlackjack = playerScore === 21 && hand.length === 2;
      const dealerBlackjack = dealerScore === 21 && finalDealerHand.length === 2;

      if (playerBlackjack && !dealerBlackjack) {
        result = 'BLACKJACK!';
        payoutMultiplier = 2.5;
      } else if (dealerBlackjack && !playerBlackjack) {
        result = 'Dealer Blackjack';
        payoutMultiplier = 0;
      } else if (dealerScore > 21) {
        result = 'Dealer Bust!';
        payoutMultiplier = 2;
      } else if (playerScore > 21) {
        result = 'Bust';
        payoutMultiplier = 0;
      } else if (playerScore > dealerScore) {
        result = 'Win!';
        payoutMultiplier = 2;
      } else if (playerScore < dealerScore) {
        result = 'Lose';
        payoutMultiplier = 0;
      } else {
        result = 'Push';
        payoutMultiplier = 1;
      }

      const winnings = Math.floor(betAmount * payoutMultiplier);
      totalWinnings += winnings;
      results.push(result);
    });

    if (totalWinnings > 0) {
      await updateUserPoints(totalWinnings);
    }

    const netResult = totalWinnings - (betAmount * finalPlayerHands.length);
    setMessage(results.join(' | '));
    setGamePhase('ended');
    addToHistory(results.join(' | '), netResult);

    setTimeout(() => resetRound(), 4000);
  };

  // Add to game history
  const addToHistory = (result, netChange, betAmount = currentBet, totalSideBet = sideBets.perfectPair + sideBets.twentyOneThree) => {
    const entry = {
      username: seAccount?.se_username || user?.email?.split('@')[0] || 'Guest',
      bet: betAmount,
      sideBet: totalSideBet,
      result,
      profitLoss: netChange,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setGameHistory(prev => [entry, ...prev].slice(0, 10));
  };

  // Reset round
  const resetRound = async () => {
    await refreshPoints();
    setCurrentBet(0);
    setSideBets({ perfectPair: 0, twentyOneThree: 0 });
    setPlayerHand([]);
    setDealerHand([]);
    setSplitHands([]);
    setCurrentSplitIndex(0);
    setGamePhase('betting');
    setDealerRevealed(false);
    setMessage('Place Your Bet');
    setCanDoubleDown(false);
    setCanSplit(false);
  };

  // Card component
  const Card = ({ card, hidden }) => {
    if (hidden) {
      return (
        <div className="bj-card bj-card-back">
          <div className="bj-card-pattern"></div>
        </div>
      );
    }

    return (
      <div className="bj-card" style={{ '--card-color': card.color }}>
        <span className="bj-card-corner bj-card-tl">
          <span className="bj-card-rank">{card.rank}</span>
          <span className="bj-card-suit">{card.suitSymbol}</span>
        </span>
        <span className="bj-card-center">{card.suitSymbol}</span>
        <span className="bj-card-corner bj-card-br">
          <span className="bj-card-rank">{card.rank}</span>
          <span className="bj-card-suit">{card.suitSymbol}</span>
        </span>
      </div>
    );
  };

  // Get dynamic action button
  const getActionButton = () => {
    if (gamePhase === 'betting') {
      return {
        label: currentBet === 0 ? 'Place Bet' : 'Deal',
        onClick: startNewRound,
        disabled: currentBet === 0 || !isConnected,
        variant: 'primary'
      };
    }
    if (gamePhase === 'ended') {
      return {
        label: 'New Round',
        onClick: resetRound,
        disabled: false,
        variant: 'primary'
      };
    }
    return null;
  };

  const actionButton = getActionButton();

  return (
    <div className="bj-container">
      {/* Top Bar */}
      <header className="bj-topbar">
        <div className="bj-topbar-left">
          <h1 className="bj-logo">Blackjack</h1>
          <span className="bj-badge">Live</span>
        </div>
        <div className="bj-topbar-right">
          <div className="bj-stat">
            <span className="bj-stat-label">Balance</span>
            <span className="bj-stat-value bj-stat-balance">{points?.toLocaleString() || 0}</span>
          </div>
          <div className="bj-stat">
            <span className="bj-stat-label">Current Bet</span>
            <span className="bj-stat-value bj-stat-bet">{currentBet}</span>
          </div>
          <button 
            className="bj-rules-btn" 
            onClick={() => setShowRules(!showRules)}
            aria-label="Game Rules"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4M12 8h.01"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Rules Modal */}
      {showRules && (
        <div className="bj-rules-overlay" onClick={() => setShowRules(false)}>
          <div className="bj-rules-modal" onClick={e => e.stopPropagation()}>
            <div className="bj-rules-header">
              <h2>Game Rules</h2>
              <button className="bj-rules-close" onClick={() => setShowRules(false)}>×</button>
            </div>
            <div className="bj-rules-content">
              <div className="bj-rule-item">
                <span className="bj-rule-icon">🎯</span>
                <div>
                  <strong>Objective</strong>
                  <p>Beat the dealer by getting closer to 21 without going over.</p>
                </div>
              </div>
              <div className="bj-rule-item">
                <span className="bj-rule-icon">🃏</span>
                <div>
                  <strong>Card Values</strong>
                  <p>Face cards = 10, Aces = 1 or 11, Number cards = face value.</p>
                </div>
              </div>
              <div className="bj-rule-item">
                <span className="bj-rule-icon">🏆</span>
                <div>
                  <strong>Blackjack</strong>
                  <p>21 with first 2 cards pays 3:2. Regular win pays 1:1.</p>
                </div>
              </div>
              <div className="bj-rule-item">
                <span className="bj-rule-icon">🤵</span>
                <div>
                  <strong>Dealer Rules</strong>
                  <p>Dealer must stand on 17 and draw on 16 or less.</p>
                </div>
              </div>
              <div className="bj-rules-sidebets">
                <h3>Side Bets</h3>
                <div className="bj-sidebet-info">
                  <strong>Perfect Pair:</strong> 25:1 (same suit), 12:1 (same color), 6:1 (mixed)
                </div>
                <div className="bj-sidebet-info">
                  <strong>21+3:</strong> Suited Trips 100:1, Straight Flush 40:1, Three of a Kind 30:1
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="bj-main">
        {/* Game Table */}
        <div className="bj-table">
          {/* Dealer Section */}
          <section className="bj-section bj-dealer-section">
            <div className="bj-section-header">
              <span className="bj-section-title">Dealer</span>
              {dealerHand.length > 0 && (
                <span className="bj-score bj-score-dealer">
                  {dealerRevealed ? calculateScore(dealerHand) : '?'}
                </span>
              )}
            </div>
            <div className="bj-cards">
              {dealerHand.length === 0 ? (
                <>
                  <div className="bj-card bj-card-placeholder"></div>
                  <div className="bj-card bj-card-placeholder"></div>
                </>
              ) : (
                dealerHand.map((card, index) => (
                  <Card key={index} card={card} hidden={index === 1 && !dealerRevealed} />
                ))
              )}
            </div>
          </section>

          {/* Game Status */}
          {message && (
            <div className={`bj-status ${gamePhase === 'ended' ? 'bj-status-result' : ''}`}>
              {message}
            </div>
          )}

          {/* Player Section */}
          <section className="bj-section bj-player-section">
            <div className="bj-section-header">
              <span className="bj-section-title">Your Hand</span>
              {playerHand.length > 0 && (
                <span className="bj-score bj-score-player">
                  {calculateScore(splitHands.length > 0 ? splitHands[currentSplitIndex] : playerHand)}
                </span>
              )}
            </div>
            
            {splitHands.length > 0 ? (
              <div className="bj-split-container">
                {splitHands.map((hand, index) => (
                  <div key={index} className={`bj-split-hand ${index === currentSplitIndex ? 'bj-split-active' : ''}`}>
                    <span className="bj-split-label">Hand {index + 1}</span>
                    <div className="bj-cards">
                      {hand.map((card, cardIndex) => (
                        <Card key={cardIndex} card={card} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bj-cards">
                {playerHand.length === 0 ? (
                  <>
                    <div className="bj-card bj-card-placeholder"></div>
                    <div className="bj-card bj-card-placeholder"></div>
                  </>
                ) : (
                  playerHand.map((card, index) => <Card key={index} card={card} />)
                )}
              </div>
            )}
          </section>

          {/* Betting Panel */}
          {gamePhase === 'betting' && (
            <div className="bj-betting">
              {/* Chips */}
              <div className="bj-chips">
                {CHIP_VALUES.map(value => (
                  <button
                    key={value}
                    className={`bj-chip bj-chip-${value} ${selectedChip === value ? 'bj-chip-selected' : ''}`}
                    onClick={() => addChipToBet(value)}
                    disabled={currentBet + value > points || currentBet + value > MAX_BET}
                  >
                    {value}
                  </button>
                ))}
              </div>
              
              {/* Side Bets - Compact */}
              <div className="bj-sidebets-compact">
                <div className="bj-sidebet-row">
                  <label className="bj-sidebet-label">
                    <span>Perfect Pair</span>
                    <span className="bj-sidebet-payout">25:1</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={MAX_SIDE_BET}
                    value={sideBets.perfectPair}
                    onChange={(e) => placeSideBet('perfectPair', parseInt(e.target.value) || 0)}
                    className="bj-sidebet-input"
                  />
                </div>
                <div className="bj-sidebet-row">
                  <label className="bj-sidebet-label">
                    <span>21+3</span>
                    <span className="bj-sidebet-payout">100:1</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={MAX_SIDE_BET}
                    value={sideBets.twentyOneThree}
                    onChange={(e) => placeSideBet('twentyOneThree', parseInt(e.target.value) || 0)}
                    className="bj-sidebet-input"
                  />
                </div>
              </div>

              {/* Bet Summary */}
              <div className="bj-bet-summary">
                <span>Total: {currentBet + sideBets.perfectPair + sideBets.twentyOneThree}</span>
                <button className="bj-clear-btn" onClick={clearBet} disabled={currentBet === 0}>
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="bj-actions">
            {gamePhase === 'playing' && (
              <>
                <button className="bj-action bj-action-hit" onClick={hit}>Hit</button>
                <button className="bj-action bj-action-stand" onClick={stand}>Stand</button>
                <button 
                  className="bj-action bj-action-double" 
                  onClick={doubleDown}
                  disabled={!canDoubleDown || points < currentBet}
                >
                  Double
                </button>
                <button 
                  className="bj-action bj-action-split" 
                  onClick={split}
                  disabled={!canSplit || points < currentBet}
                >
                  Split
                </button>
              </>
            )}
            {actionButton && (
              <button 
                className={`bj-action bj-action-${actionButton.variant}`}
                onClick={actionButton.onClick}
                disabled={actionButton.disabled}
              >
                {actionButton.label}
              </button>
            )}
          </div>
        </div>

        {/* Recent Bets Panel */}
        <div className="bj-history-panel">
          <h2 className="bj-panel-title">Recent Bets</h2>
          {gameHistory.length === 0 ? (
            <p className="bj-history-empty">No bets placed yet</p>
          ) : (
            <div className="bj-history-table-wrap">
              <table className="bj-history-table">
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Bet</th>
                    <th>Side</th>
                    <th>Result</th>
                    <th>P/L</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {gameHistory.map((entry, index) => (
                    <tr key={index}>
                      <td className="bj-history-user">{entry.username}</td>
                      <td>{entry.bet}</td>
                      <td>{entry.sideBet || '-'}</td>
                      <td className="bj-history-result">{entry.result}</td>
                      <td className={`bj-history-pl ${entry.profitLoss > 0 ? 'bj-pl-win' : entry.profitLoss < 0 ? 'bj-pl-loss' : 'bj-pl-push'}`}>
                        {entry.profitLoss > 0 ? '+' : ''}{entry.profitLoss}
                      </td>
                      <td className="bj-history-time">{entry.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
