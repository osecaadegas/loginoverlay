import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../config/supabaseClient';
import { adjustPlayerCash } from '../utils/safeRpc';
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

  // Update player cash via secure RPC (with fallback)
  const updatePlayerCash = async (newCash) => {
    try {
      const cashChange = newCash - player.cash;
      const cashResult = await adjustPlayerCash(cashChange, player, user.id);
      if (!cashResult.success) throw new Error(cashResult.error || 'Cash update failed');

      setPlayer(prev => ({ ...prev, cash: cashResult.player?.cash ?? newCash }));
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

  /* ── Chip colors ── */
  const chipColor = (v) => {
    if (v >= 1000) return 'from-amber-400 to-amber-600 border-amber-300';
    if (v >= 500) return 'from-purple-500 to-purple-700 border-purple-400';
    if (v >= 100) return 'from-orange-400 to-orange-600 border-orange-300';
    if (v >= 50) return 'from-emerald-400 to-emerald-600 border-emerald-300';
    return 'from-blue-500 to-blue-700 border-blue-400';
  };

  /* ── Score badge ── */
  const renderScore = (score, label, hidden) => {
    if (score === 0 && !hidden) return null;
    const busted = !hidden && score > 21;
    const isBJ = !hidden && score === 21;
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', borderRadius: '12px', padding: '4px 14px', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)' }}>{label}</span>
        <span style={{ width: '1px', height: '12px', background: 'rgba(255,255,255,0.1)' }} />
        <span style={{ fontSize: '18px', fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: busted ? '#f87171' : isBJ ? '#fbbf24' : '#fff' }}>
          {hidden ? '?' : score}
        </span>
        {isBJ && <span style={{ fontSize: '10px', fontWeight: 700, color: '#fbbf24' }}>BJ!</span>}
        {busted && <span style={{ fontSize: '10px', fontWeight: 700, color: '#f87171' }}>BUST</span>}
      </span>
    );
  };

  /* ── Card renderer (overlapping) ── */
  const renderCards = (hand, hideSecond) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '120px' }}>
      {hand.length === 0 ? (
        <>
          <div style={{ width: '80px', height: '110px', borderRadius: '12px', border: '2px dashed rgba(255,255,255,0.1)' }} />
          <div style={{ width: '80px', height: '110px', borderRadius: '12px', border: '2px dashed rgba(255,255,255,0.1)', marginLeft: '-28px' }} />
        </>
      ) : hand.map((card, i) => {
        const hidden = hideSecond && i === 1;
        return (
          <div key={i} style={{ marginLeft: i > 0 ? '-28px' : '0', zIndex: i }}>
            {renderCard(card, hidden)}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="tl-bj-wrapper">
      {/* Header */}
      <header className="tl-bj-header">
        <button className="tl-bj-back" onClick={onBack}>← Back</button>
        <div className="tl-bj-title-area">
          <h1 className="tl-bj-title">BLACKJACK</h1>
          <p className="tl-bj-subtitle">6 Decks • Dealer stands on 17 • Pays 3:2</p>
        </div>
        <div className="tl-bj-cash">
          <span className="tl-bj-cash-label">CASH</span>
          <span className="tl-bj-cash-val">${player.cash?.toLocaleString() || 0}</span>
        </div>
      </header>

      {/* Green felt table */}
      <div className="tl-bj-felt">
        {/* Felt overlays */}
        <div className="tl-bj-felt-texture" />
        <div className="tl-bj-felt-shadow" />
        <div className="tl-bj-felt-border-outer" />
        <div className="tl-bj-felt-border-inner" />

        <div className="tl-bj-felt-content">
          {/* Dealer zone */}
          <div className="tl-bj-zone">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: '#ccc' }}>D</span>
                <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)' }}>Dealer</span>
              </div>
              {dealerHand.length > 0 && renderScore(dealerScore, 'Hand', !showDealerCards)}
            </div>
            {renderCards(dealerHand, !showDealerCards)}
          </div>

          {/* Status divider */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '16px' }}>
            <div style={{ height: '1px', background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.15), transparent)' }} />
            {gameMessage.text ? (
              <span className={`tl-bj-msg tl-bj-msg-${gameMessage.type}`}>{gameMessage.text}</span>
            ) : (
              <span style={{ padding: '8px 20px', borderRadius: '9999px', fontSize: '14px', fontWeight: 700, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {gameState === 'betting' ? 'Place your bet' : gameState === 'playing' ? 'Your turn' : gameState === 'dealer_turn' ? 'Dealer playing...' : ''}
              </span>
            )}
            <div style={{ height: '1px', background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.15), transparent)' }} />
          </div>

          {/* Player zone */}
          <div className="tl-bj-zone">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(59,130,246,0.3)', border: '1px solid rgba(96,165,250,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: '#93c5fd' }}>P</span>
                <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)' }}>Player</span>
              </div>
              {playerHand.length > 0 && renderScore(playerScore, 'Hand', false)}
            </div>
            {renderCards(playerHand, false)}
          </div>

          {/* ─── Betting / Action controls (bottom of felt) ─── */}
          <div style={{ height: '1px', background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.12), transparent)' }} />

          {gameState === 'betting' && (
            <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              {/* Chips */}
              <nav style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                {BET_OPTIONS.map((val) => (
                  <button
                    key={val}
                    onClick={() => adjustBet(val)}
                    disabled={val > player.cash}
                    style={{ width: '48px', height: '48px', borderRadius: '50%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(255,255,255,0.2)', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s', opacity: val > player.cash ? 0.2 : 1 }}
                    className={`bg-gradient-to-b shadow-lg hover:scale-110 hover:-translate-y-1 active:scale-95 ${currentBet === val ? 'ring-2 ring-white/40 scale-110' : ''} ${chipColor(val)}`}
                  >
                    <span style={{ position: 'absolute', inset: '3px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)', pointerEvents: 'none' }} />
                    <span style={{ position: 'absolute', inset: '7px', borderRadius: '50%', border: '1px dashed rgba(255,255,255,0.15)', pointerEvents: 'none' }} />
                    <span style={{ position: 'relative', fontSize: val >= 1000 ? '9px' : '11px', fontWeight: 900, color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{val >= 1000 ? `${val/1000}K` : val}</span>
                  </button>
                ))}
              </nav>

              {/* Current bet display */}
              <span style={{ fontSize: '22px', fontWeight: 900, color: '#fbbf24', textShadow: '0 0 15px rgba(251,191,36,0.4)', fontVariantNumeric: 'tabular-nums' }}>
                ${currentBet}
              </span>

              {/* Deal button */}
              <button
                onClick={dealHand}
                disabled={isProcessing || player.cash < currentBet}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ borderRadius: '12px', padding: '12px 40px', fontSize: '16px', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'white', cursor: 'pointer', border: 'none', transition: 'all 0.2s', boxShadow: '0 4px 20px rgba(245,158,11,0.3)' }}
              >
                DEAL
              </button>
            </section>
          )}

          {gameState === 'playing' && (
            <section style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px' }}>
              <button
                onClick={hit}
                disabled={isProcessing}
                className="bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 hover:-translate-y-0.5 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ borderRadius: '12px', padding: '12px 32px', fontWeight: 900, fontSize: '16px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'white', cursor: 'pointer', border: 'none', transition: 'all 0.15s', boxShadow: '0 4px 15px rgba(59,130,246,0.3)' }}
              >
                Hit
              </button>
              <button
                onClick={stand}
                disabled={isProcessing}
                className="bg-gradient-to-b from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 hover:-translate-y-0.5 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ borderRadius: '12px', padding: '12px 32px', fontWeight: 900, fontSize: '16px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'white', cursor: 'pointer', border: 'none', transition: 'all 0.15s', boxShadow: '0 4px 15px rgba(239,68,68,0.3)' }}
              >
                Stand
              </button>
              {playerHand.length === 2 && player.cash >= currentBet && (
                <button
                  onClick={doubleDown}
                  disabled={isProcessing}
                  className="bg-gradient-to-b from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 hover:-translate-y-0.5 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ borderRadius: '12px', padding: '12px 32px', fontWeight: 900, fontSize: '16px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'white', cursor: 'pointer', border: 'none', transition: 'all 0.15s', boxShadow: '0 4px 15px rgba(245,158,11,0.3)' }}
                >
                  Double · ${currentBet}
                </button>
              )}
            </section>
          )}

          {gameState === 'dealer_turn' && (
            <section style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', borderRadius: '9999px', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 24px' }}>
                <span style={{ display: 'flex', gap: '4px' }}>
                  <span className="h-2 w-2 animate-bounce rounded-full bg-amber-400" style={{ animationDelay: '0ms' }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-amber-400" style={{ animationDelay: '150ms' }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-amber-400" style={{ animationDelay: '300ms' }} />
                </span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Dealer is playing...</span>
              </span>
            </section>
          )}
        </div>
      </div>

      {/* Deck status */}
      <div className="tl-bj-deck-info">Shoe: {shoe.length} cards remaining</div>
    </div>
  );
}
