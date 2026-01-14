import { useState, useEffect, useRef } from 'react';
import { useStreamElements } from '../../context/StreamElementsContext';
import { useAuth } from '../../context/AuthContext';
import * as THREE from 'three';
import './BlackjackPremium.css';

const CARD_VALUES = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 10, 'Q': 10, 'K': 10, 'A': 11
};

const SUITS = {
  hearts: { symbol: '♥', color: '#e74c3c' },
  diamonds: { symbol: '♦', color: '#e74c3c' },
  clubs: { symbol: '♣', color: '#2c3e50' },
  spades: { symbol: '♠', color: '#2c3e50' }
};

const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const CHIP_VALUES = [10, 25, 50, 100, 200];
const MAX_BET = 200;
const MAX_SIDE_BET = 10;

export default function BlackjackPremium() {
  const { points, isConnected, seAccount, updateUserPoints, refreshPoints } = useStreamElements();
  const { user } = useAuth();
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  
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
  const [message, setMessage] = useState('Place Your Bet');
  const [canDoubleDown, setCanDoubleDown] = useState(false);
  const [canSplit, setCanSplit] = useState(false);
  const [gameHistory, setGameHistory] = useState([]);
  const [dealerDrawing, setDealerDrawing] = useState(false);

  // Initialize 3D scene
  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current, 
      alpha: true, 
      antialias: true 
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 5);
    scene.add(directionalLight);

    // Add point light for dramatic effect
    const pointLight = new THREE.PointLight(0xd4af37, 1, 100);
    pointLight.position.set(0, 10, 0);
    scene.add(pointLight);

    // Create casino table
    const tableGeometry = new THREE.CylinderGeometry(15, 15, 1, 64);
    const tableMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x0a5c36,
      shininess: 30
    });
    const table = new THREE.Mesh(tableGeometry, tableMaterial);
    table.position.y = -2;
    scene.add(table);

    // Add table edge
    const edgeGeometry = new THREE.TorusGeometry(15, 0.5, 16, 100);
    const edgeMaterial = new THREE.MeshPhongMaterial({ color: 0x8b4513 });
    const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
    edge.position.y = -1.2;
    scene.add(edge);

    // Position camera
    camera.position.z = 25;
    camera.position.y = 10;
    camera.lookAt(0, 0, 0);

    sceneRef.current = { scene, camera, renderer, table, edge };

    // Animation loop (static table)
    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

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
    
    // Add chip animation
    animateChipAdd();
  };

  const animateChipAdd = () => {
    // 3D chip animation logic
    if (sceneRef.current) {
      const { scene } = sceneRef.current;
      const chipGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.1, 32);
      const chipMaterial = new THREE.MeshPhongMaterial({ color: 0xd4af37 });
      const chip = new THREE.Mesh(chipGeometry, chipMaterial);
      chip.position.set(0, 5, 0);
      scene.add(chip);
      
      setTimeout(() => scene.remove(chip), 1000);
    }
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
  const addToHistory = (result, netChange) => {
    const entry = {
      result,
      netChange,
      timestamp: new Date().toLocaleTimeString()
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
        <div className="blackjack-card card-back">
          <i className="fas fa-question"></i>
        </div>
      );
    }

    return (
      <div className="blackjack-card" style={{ color: card.color }}>
        <div className="card-corner top-left">
          <div className="card-rank">{card.rank}</div>
          <div className="card-suit">{card.suitSymbol}</div>
        </div>
        <div className="card-center">
          <div className="card-suit-large">{card.suitSymbol}</div>
        </div>
        <div className="card-corner bottom-right">
          <div className="card-rank">{card.rank}</div>
          <div className="card-suit">{card.suitSymbol}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="blackjack-premium-container">
      <canvas ref={canvasRef} className="game-canvas-3d"></canvas>
      
      <div className="game-overlay">
        {/* Header */}
        <header className="bj-header">
          <div className="bj-header-left">
            <h1 className="bj-title">
              <i className="fas fa-spade"></i>
              Blackjack Casino
            </h1>
            <p className="bj-subtitle">Live Dealer • SE Points</p>
          </div>

          <div className="bj-player-info">
            <div className="bj-info-card">
              <p className="bj-info-label">PLAYER</p>
              <p className="bj-info-value">{seAccount?.se_username || user?.email?.split('@')[0] || 'Guest'}</p>
            </div>
            <div className="bj-info-card">
              <p className="bj-info-label">BALANCE</p>
              <p className="bj-info-value bj-balance">
                {points?.toLocaleString() || 0} <span>pts</span>
              </p>
            </div>
            <div className="bj-info-card">
              <p className="bj-info-label">CURRENT BET</p>
              <p className="bj-info-value bj-bet">{currentBet}</p>
            </div>
          </div>
        </header>

        <div className="bj-layout">
          {/* Main Game Area */}
          <div className="bj-main">
            <div className="bj-table">
              {/* Dealer Area */}
              <div className="bj-dealer-area">
                <div className="bj-area-header">
                  <h2 className="bj-area-title">
                    <i className="fas fa-user-tie"></i>
                    DEALER
                    {dealerHand.length > 0 && (
                      <span className="bj-score-badge bj-dealer-badge">
                        {dealerRevealed ? calculateScore(dealerHand) : dealerHand[0].value}
                      </span>
                    )}
                  </h2>
                  <div className="bj-dealer-rule">Stand on 17</div>
                </div>
                <div className="bj-cards-area">
                  {dealerHand.map((card, index) => (
                    <Card 
                      key={index} 
                      card={card} 
                      hidden={index === 1 && !dealerRevealed} 
                    />
                  ))}
                  {dealerHand.length === 0 && (
                    <>
                      <Card hidden />
                      <Card hidden />
                    </>
                  )}
                </div>
              </div>

              {/* Player Area */}
              <div className="bj-player-area">
                <div className="bj-area-header">
                  <h2 className="bj-area-title">
                    <i className="fas fa-user"></i>
                    PLAYER
                    {playerHand.length > 0 && (
                      <span className="bj-score-badge bj-player-badge">
                        {calculateScore(splitHands.length > 0 ? splitHands[currentSplitIndex] : playerHand)}
                      </span>
                    )}
                  </h2>
                  <div className={`bj-game-status ${gamePhase === 'ended' ? 'bj-status-ended' : ''}`}>
                    {message}
                  </div>
                </div>
                
                <div className="bj-hands-container">
                  {splitHands.length > 0 ? (
                    splitHands.map((hand, index) => (
                      <div key={index} className={`bj-split-hand ${index === currentSplitIndex ? 'active' : ''}`}>
                        <div className="bj-hand-label">Hand {index + 1}</div>
                        <div className="bj-cards-area">
                          {hand.map((card, cardIndex) => (
                            <Card key={cardIndex} card={card} />
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bj-cards-area">
                      {playerHand.map((card, index) => (
                        <Card key={index} card={card} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Betting Area */}
                {gamePhase === 'betting' && (
                  <div className="bj-betting-area">
                    <h3 className="bj-betting-title">Place Your Bet</h3>
                    <div className="bj-chips-grid">
                      {CHIP_VALUES.map(value => (
                        <div
                          key={value}
                          className={`bj-chip bj-chip-${value}`}
                          onClick={() => addChipToBet(value)}
                        >
                          <div className="chip-inner">{value}</div>
                        </div>
                      ))}
                    </div>
                    <div className="bj-bet-actions">
                      <button onClick={clearBet} className="bj-btn bj-btn-secondary">
                        Clear Bet
                      </button>
                      <button 
                        onClick={startNewRound} 
                        className="bj-btn bj-btn-primary"
                        disabled={currentBet === 0 || !isConnected}
                      >
                        <i className="fas fa-play mr-2"></i>
                        Deal Cards
                      </button>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                {gamePhase === 'playing' && (
                  <div className="bj-action-buttons">
                    <button onClick={hit} className="bj-btn bj-btn-hit">
                      <i className="fas fa-plus"></i>
                      Hit
                    </button>
                    <button onClick={stand} className="bj-btn bj-btn-stand">
                      <i className="fas fa-hand-paper"></i>
                      Stand
                    </button>
                    <button 
                      onClick={doubleDown} 
                      className="bj-btn bj-btn-double"
                      disabled={!canDoubleDown || points < currentBet}
                    >
                      <i className="fas fa-times"></i>
                      Double
                    </button>
                    <button 
                      onClick={split} 
                      className="bj-btn bj-btn-split"
                      disabled={!canSplit || points < currentBet}
                    >
                      <i className="fas fa-code-branch"></i>
                      Split
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Game History */}
            <div className="bj-history-panel">
              <h3 className="bj-panel-title">
                <i className="fas fa-history"></i>
                Game History
              </h3>
              <div className="bj-history-list">
                {gameHistory.length === 0 ? (
                  <div className="bj-history-empty">No games played yet</div>
                ) : (
                  gameHistory.map((entry, index) => (
                    <div key={index} className="bj-history-item">
                      <div>
                        <span className="bj-history-result">{entry.result}</span>
                        <span className="bj-history-time">{entry.timestamp}</span>
                      </div>
                      <div className={`bj-history-change ${entry.netChange > 0 ? 'positive' : entry.netChange < 0 ? 'negative' : 'neutral'}`}>
                        {entry.netChange > 0 ? '+' : ''}{entry.netChange}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="bj-sidebar">
            {/* Side Bets */}
            <div className="bj-sidebar-panel">
              <h3 className="bj-panel-title">
                <i className="fas fa-star"></i>
                Side Bets
              </h3>
              <p className="bj-panel-subtitle">Boost your winnings!</p>

              <div className="bj-sidebet-list">
                {/* Perfect Pair */}
                <div className={`bj-sidebet ${sideBets.perfectPair > 0 ? 'active' : ''}`}>
                  <div className="bj-sidebet-header">
                    <div>
                      <h4 className="bj-sidebet-title">Perfect Pair</h4>
                      <p className="bj-sidebet-desc">First 2 cards match</p>
                    </div>
                    <div className="bj-sidebet-payout">
                      <p className="payout-value">25:1</p>
                      <p className="payout-label">Perfect</p>
                    </div>
                  </div>
                  <div className="bj-sidebet-input">
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={sideBets.perfectPair}
                      onChange={(e) => placeSideBet('perfectPair', parseInt(e.target.value) || 0)}
                      disabled={gamePhase !== 'betting'}
                      className="bj-sidebet-amount"
                    />
                    <span className="bj-sidebet-current">Bet: {sideBets.perfectPair}</span>
                  </div>
                </div>

                {/* 21+3 */}
                <div className={`bj-sidebet ${sideBets.twentyOneThree > 0 ? 'active' : ''}`}>
                  <div className="bj-sidebet-header">
                    <div>
                      <h4 className="bj-sidebet-title">21+3</h4>
                      <p className="bj-sidebet-desc">3-card poker hand</p>
                    </div>
                    <div className="bj-sidebet-payout">
                      <p className="payout-value">100:1</p>
                      <p className="payout-label">Suited Trips</p>
                    </div>
                  </div>
                  <div className="bj-sidebet-input">
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={sideBets.twentyOneThree}
                      onChange={(e) => placeSideBet('twentyOneThree', parseInt(e.target.value) || 0)}
                      disabled={gamePhase !== 'betting'}
                      className="bj-sidebet-amount"
                    />
                    <span className="bj-sidebet-current">Bet: {sideBets.twentyOneThree}</span>
                  </div>
                </div>
              </div>

              <div className="bj-sidebet-total">
                <span>Total Side Bets:</span>
                <span className="bj-total-value">
                  {sideBets.perfectPair + sideBets.twentyOneThree}
                </span>
              </div>
            </div>

            {/* Game Rules */}
            <div className="bj-sidebar-panel">
              <h3 className="bj-panel-title">
                <i className="fas fa-info-circle"></i>
                Game Rules
              </h3>
              <ul className="bj-rules-list">
                <li>
                  <i className="fas fa-check"></i>
                  Dealer stands on 17
                </li>
                <li>
                  <i className="fas fa-check"></i>
                  Blackjack pays 3:2
                </li>
                <li>
                  <i className="fas fa-check"></i>
                  Double on any 2 cards
                </li>
                <li>
                  <i className="fas fa-check"></i>
                  Split pairs allowed
                </li>
                <li>
                  <i className="fas fa-check"></i>
                  Perfect Pair: 25:1 (perfect), 12:1 (colored), 6:1 (mixed)
                </li>
                <li>
                  <i className="fas fa-check"></i>
                  21+3: Up to 100:1 for suited trips
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
