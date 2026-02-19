import { useState, useEffect, useCallback } from 'react';
import { useStreamElements } from '../../context/StreamElementsContext';
import { useAuth } from '../../context/AuthContext';
import './BlackjackPremium.css';

const CARD_VALUES = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 10, 'Q': 10, 'K': 10, 'A': 11
};

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const CHIP_VALUES = [10, 25, 50, 100, 200];
const MAX_BET = 200;
const MAX_SIDE_BET = 10;

const GAME_PHASE_LABELS = {
  betting: 'Place your bet',
  playing: 'Your turn',
  'dealer-turn': 'Dealer playing...',
  ended: 'Round complete'
};

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

  // UI state
  const [showRules, setShowRules] = useState(false);
  const [sideBetsOpen, setSideBetsOpen] = useState(false);
  const [betInput, setBetInput] = useState('');
  const [lastBet, setLastBet] = useState(0);
  const [winInfo, setWinInfo] = useState(null);

  const playerName = seAccount?.se_username || user?.email?.split('@')[0] || 'Guest';
  const availablePoints = points || 0;

  // Create and shuffle deck (6 decks)
  const createDeck = () => {
    const singleDeck = [];
    SUITS.forEach(suit => {
      RANKS.forEach(rank => {
        singleDeck.push({
          suit,
          rank,
          value: CARD_VALUES[rank]
        });
      });
    });

    const newDeck = [];
    for (let i = 0; i < 6; i++) {
      newDeck.push(...singleDeck);
    }

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

  // Betting helpers
  const setBetAmount = (amount) => {
    const clamped = Math.max(0, Math.min(Math.floor(amount || 0), availablePoints, MAX_BET));
    setCurrentBet(clamped);
    setBetInput(clamped > 0 ? clamped.toString() : '');
  };

  const addChipToBet = (value) => {
    if (gamePhase !== 'betting') return;
    const nextBet = Math.min(currentBet + value, availablePoints, MAX_BET);
    setBetAmount(nextBet);
  };

  const clearBet = () => {
    if (gamePhase !== 'betting') return;
    setCurrentBet(0);
    setBetInput('');
    setSideBets({ perfectPair: 0, twentyOneThree: 0 });
  };

  const placeSideBet = (type, amount) => {
    if (gamePhase !== 'betting') return;
    if (amount > MAX_SIDE_BET) return;
    const totalBet = currentBet + sideBets.perfectPair + sideBets.twentyOneThree + amount;
    if (totalBet > availablePoints) return;

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
    if (totalBet > availablePoints) {
      setMessage('Insufficient balance!');
      return;
    }

    setLastBet(currentBet);
    await updateUserPoints(-totalBet);

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

    const playerScore = calculateScore(newPlayerHand);
    if (playerScore === 21) {
      setTimeout(() => dealerTurn([newPlayerHand], newDealerHand, remainingDeck), 900);
      return;
    }

    setCanDoubleDown(true);
    setCanSplit(
      newPlayerHand[0].rank === newPlayerHand[1].rank &&
      availablePoints >= currentBet
    );

    checkSideBets(newPlayerHand, newDealerHand);
  };

  const checkSideBets = async (playerCards, dealerCards) => {
    let sideBetWinnings = 0;
    let sideBetMessage = '';

    if (sideBets.perfectPair > 0) {
      const card1 = playerCards[0];
      const card2 = playerCards[1];

      if (card1.rank === card2.rank && card1.suit === card2.suit) {
        sideBetWinnings += sideBets.perfectPair * 25;
        sideBetMessage += ' Perfect Pair! +' + (sideBets.perfectPair * 25);
      } else if (card1.rank === card2.rank && isRed(card1.suit) === isRed(card2.suit)) {
        sideBetWinnings += sideBets.perfectPair * 12;
        sideBetMessage += ' Colored Pair! +' + (sideBets.perfectPair * 12);
      } else if (card1.rank === card2.rank) {
        sideBetWinnings += sideBets.perfectPair * 6;
        sideBetMessage += ' Mixed Pair! +' + (sideBets.perfectPair * 6);
      }
    }

    if (sideBets.twentyOneThree > 0) {
      const threeCards = [...playerCards, dealerCards[0]];
      const suits = threeCards.map(c => c.suit);
      const ranks = threeCards.map(c => c.rank);
      const sortedRanks = ranks.map(r => RANKS.indexOf(r)).sort((a, b) => a - b);

      const isSuitedTrips = suits.every(s => s === suits[0]) && ranks.every(r => r === ranks[0]);
      const isFlush = suits.every(s => s === suits[0]);
      const isStraight = sortedRanks[1] === sortedRanks[0] + 1 && sortedRanks[2] === sortedRanks[1] + 1;
      const isStraightFlush = isFlush && isStraight;
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
      if (splitHands.length > 0 && currentSplitIndex < splitHands.length - 1) {
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
    if (!canDoubleDown || availablePoints < currentBet) return;

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
    if (!canSplit || availablePoints < currentBet) return;

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

  const dealerTurn = (finalPlayerHands, currentDealerHand, currentDeck) => {
    dealerTurnWithBet(finalPlayerHands, currentDealerHand, currentDeck, currentBet);
  };

  const dealerTurnWithBet = (finalPlayerHands, currentDealerHand, currentDeck, betAmount) => {
    setGamePhase('dealer-turn');
    setDealerRevealed(true);

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
        determineWinner(finalPlayerHands, dealerCards, betAmount);
      }
    }, 900);
  };

  const determineWinner = async (finalPlayerHands, finalDealerHand, betAmount = currentBet) => {
    const dealerScore = calculateScore(finalDealerHand);
    let totalWinnings = 0;
    let results = [];

    finalPlayerHands.forEach((hand) => {
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

    const totalBet = betAmount * finalPlayerHands.length;
    const netResult = totalWinnings - totalBet;

    setMessage(results.join(' | '));
    setGamePhase('ended');
    addToHistory(results.join(' | '), netResult, betAmount, sideBets.perfectPair + sideBets.twentyOneThree);

    if (netResult > 0) {
      setWinInfo({ result: results.some(r => r.includes('BLACKJACK')) ? 'BLACKJACK' : 'WIN', amount: netResult, bet: totalBet });
    } else if (netResult === 0) {
      setWinInfo({ result: 'PUSH', amount: totalBet, bet: totalBet });
    }

    setTimeout(() => resetRound(), 4000);
  };

  const addToHistory = (result, netChange, betAmount = currentBet, totalSideBet = sideBets.perfectPair + sideBets.twentyOneThree) => {
    const entry = {
      username: playerName,
      bet: betAmount,
      sideBet: totalSideBet,
      result,
      profitLoss: netChange,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setGameHistory(prev => [entry, ...prev].slice(0, 10));
  };

  const resetRound = async () => {
    await refreshPoints();
    setCurrentBet(0);
    setBetInput('');
    setSideBets({ perfectPair: 0, twentyOneThree: 0 });
    setPlayerHand([]);
    setDealerHand([]);
    setSplitHands([]);
    setCurrentSplitIndex(0);
    setGamePhase('betting');
    setDealerRevealed(false);
    setMessage('');
    setCanDoubleDown(false);
    setCanSplit(false);
    setWinInfo(null);
  };

  useEffect(() => {
    if (gamePhase === 'betting') {
      setBetInput(currentBet > 0 ? currentBet.toString() : '');
    }
  }, [gamePhase, currentBet]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-[#0c1117] to-gray-950">
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-gray-950/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/20">
              <span className="text-lg font-black text-white">♠</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-white leading-tight">Blackjack</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-amber-500/80 font-semibold -mt-0.5">Pro Casino</p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full bg-white/[0.04] border border-white/[0.06] px-4 py-1.5">
            <div className={`h-2 w-2 rounded-full ${gamePhase === 'playing' ? 'bg-emerald-500 animate-pulse' : gamePhase === 'dealer-turn' ? 'bg-blue-500 animate-pulse' : gamePhase === 'ended' ? 'bg-gray-400' : 'bg-amber-500'}`} />
            <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
              {GAME_PHASE_LABELS[gamePhase]}
            </span>
          </div>

          <div className="flex items-center gap-4 md:gap-6">
            {currentBet > 0 && (
              <>
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Bet</p>
                  <p className="text-lg font-bold text-amber-400 tabular-nums leading-tight">
                    {currentBet.toLocaleString()} pts
                  </p>
                </div>
                <div className="hidden sm:block h-8 w-px bg-white/[0.06]" />
              </>
            )}
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Balance</p>
              <p className="text-lg font-bold text-white tabular-nums leading-tight">
                {availablePoints.toLocaleString()} pts
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 md:py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8 space-y-5">
            <BlackjackTable
              dealerHand={dealerHand}
              playerHand={playerHand}
              splitHands={splitHands}
              currentSplitIndex={currentSplitIndex}
              currentBet={currentBet}
              gamePhase={gamePhase}
              message={message || GAME_PHASE_LABELS[gamePhase]}
              dealerRevealed={dealerRevealed}
              calculateScore={calculateScore}
            />
          </div>

          <div className="lg:col-span-4 space-y-5">
            <SideBetsPanel
              isOpen={sideBetsOpen}
              onToggle={() => setSideBetsOpen(!sideBetsOpen)}
              gamePhase={gamePhase}
              sideBets={sideBets}
              onChange={placeSideBet}
            />

            <button
              onClick={() => setShowRules(true)}
              className="w-full rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-4 text-left transition-all hover:bg-white/[0.04] group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <span className="text-amber-500 text-sm">📖</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Game Rules</h3>
                    <p className="text-[11px] text-gray-500">How to play blackjack</p>
                  </div>
                </div>
                <svg className="h-4 w-4 text-gray-600 group-hover:text-gray-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <div className="w-full max-w-4xl lg:translate-x-8">
            <BettingControls
              gamePhase={gamePhase}
              currentBet={currentBet}
              balance={availablePoints}
              betInput={betInput}
              lastBet={lastBet}
              canHit={gamePhase === 'playing'}
              canStand={gamePhase === 'playing'}
              canDouble={canDoubleDown}
              canSplit={canSplit}
              onSetBet={setBetAmount}
              onInputChange={setBetInput}
              onAddChip={addChipToBet}
              onClearBet={clearBet}
              onPlaceBet={startNewRound}
              onHit={hit}
              onStand={stand}
              onDouble={doubleDown}
              onSplit={split}
              onNextRound={resetRound}
              chipValues={CHIP_VALUES}
            />
          </div>
        </div>

        <div className="mt-6">
          <BetHistory entries={gameHistory} />
        </div>
      </div>

      <WinOverlay winInfo={winInfo} onDismiss={() => setWinInfo(null)} />
      <GameRules isOpen={showRules} onClose={() => setShowRules(false)} />
    </div>
  );
}

function BlackjackTable({ dealerHand, playerHand, splitHands, currentSplitIndex, currentBet, gamePhase, message, dealerRevealed, calculateScore }) {
  const hasCards = dealerHand.length > 0 || playerHand.length > 0;

  const renderHandValue = (hand, label, isDealer) => {
    if (hand.length === 0) return null;
    const hasHidden = isDealer && !dealerRevealed;
    const value = hasHidden ? '?' : calculateScore(hand);
    const busted = !hasHidden && value > 21;
    const isBlackjack = !hasHidden && value === 21 && hand.length === 2;

    return (
      <div className="inline-flex items-center gap-2 rounded-xl px-4 py-1.5 bg-gray-950/70 border border-white/[0.08] animate-slide-down">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{label}</span>
        <div className="h-3 w-px bg-white/10" />
        <span className={`text-lg font-black tabular-nums ${busted ? 'text-red-400' : isBlackjack ? 'text-amber-400' : value === 21 ? 'text-emerald-400' : 'text-white'}`}>
          {value}
        </span>
        {isBlackjack && (
          <span className="text-[10px] font-bold text-amber-400 animate-pulse">BJ!</span>
        )}
        {busted && (
          <span className="text-[10px] font-bold text-red-400">BUST</span>
        )}
      </div>
    );
  };

  const renderCards = (hand, isDealer) => (
    <div className="flex items-center">
      {hand.map((card, index) => (
        <div key={index} style={{ marginLeft: index > 0 ? '-28px' : '0', zIndex: index }}>
          <Card card={card} index={index} hidden={isDealer && index === 1 && !dealerRevealed} />
        </div>
      ))}
    </div>
  );

  const renderPlayerArea = () => {
    if (splitHands.length > 0) {
      return (
        <div className="flex flex-wrap justify-center gap-6">
          {splitHands.map((hand, index) => (
            <div key={index} className={`rounded-2xl border px-4 py-3 ${index === currentSplitIndex ? 'border-blue-400/40 bg-blue-500/10' : 'border-white/[0.08] bg-white/[0.02]'}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-white/60">Hand {index + 1}</span>
                {renderHandValue(hand, 'Hand')}
              </div>
              <div className="flex min-h-[150px] items-center justify-center">
                {hand.length > 0 ? renderCards(hand, false) : renderPlaceholders()}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-blue-500/30 flex items-center justify-center border border-blue-400/30">
              <span className="text-[10px] font-bold text-blue-300">P</span>
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-white/60">Player</span>
          </div>
          {renderHandValue(playerHand, 'Hand')}
        </div>
        <div className="flex min-h-[150px] items-center justify-center">
          {playerHand.length > 0 ? renderCards(playerHand, false) : renderPlaceholders()}
        </div>
      </div>
    );
  };

  const renderPlaceholders = () => (
    <div className="flex items-center gap-3">
      <div className="h-[140px] w-[100px] rounded-xl border-2 border-dashed border-white/10" />
      <div className="h-[140px] w-[100px] rounded-xl border-2 border-dashed border-white/10" />
    </div>
  );

  return (
    <div className="relative rounded-3xl overflow-hidden">
      <div className="relative bg-gradient-to-b from-[#11612b] via-[#157a36] to-[#11612b] px-6 py-8 md:px-10 md:py-10">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, black 1px, transparent 0)',
            backgroundSize: '4px 4px'
          }}
        />
        <div className="absolute inset-0 rounded-3xl shadow-[inset_0_2px_30px_rgba(0,0,0,0.4)]" />
        <div className="absolute inset-0 rounded-3xl border-2 border-emerald-950/80" />
        <div className="absolute inset-[2px] rounded-[22px] border border-emerald-500/10" />

        <div className="relative space-y-6 md:space-y-10">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-gray-900/60 flex items-center justify-center border border-white/10">
                  <span className="text-[10px] font-bold text-gray-300">D</span>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-white/60">Dealer</span>
              </div>
              {renderHandValue(dealerHand, 'Hand', true)}
            </div>

            <div className="flex min-h-[150px] items-center justify-center">
              {dealerHand.length > 0 ? renderCards(dealerHand, true) : renderPlaceholders()}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
            <div className={`px-5 py-2 rounded-full text-sm font-bold transition-all duration-300 ${gamePhase === 'ended' && message.toLowerCase().includes('bust') ? 'bg-red-500/15 text-red-400 border border-red-500/20' : gamePhase === 'ended' && message.toLowerCase().includes('win') ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : gamePhase === 'playing' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-white/[0.06] text-white/70 border border-white/[0.08]'}`}>
              {message}
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
          </div>

          {renderPlayerArea()}

          {hasCards && currentBet > 0 && (
            <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6">
              <div className="flex items-center gap-2 rounded-full bg-gray-950/70 border border-amber-500/20 pl-3 pr-4 py-1.5">
                <div className="h-5 w-5 rounded-full bg-gradient-to-b from-amber-400 to-amber-600 flex items-center justify-center">
                  <span className="text-[8px] font-black text-white">$</span>
                </div>
                <span className="text-sm font-bold text-amber-400 tabular-nums">{currentBet.toLocaleString()} pts</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BettingControls({
  gamePhase,
  currentBet,
  balance,
  betInput,
  lastBet,
  canHit,
  canStand,
  canDouble,
  canSplit,
  onSetBet,
  onInputChange,
  onAddChip,
  onClearBet,
  onPlaceBet,
  onHit,
  onStand,
  onDouble,
  onSplit,
  onNextRound,
  chipValues
}) {
  const handleInputChange = (val) => {
    const num = val.replace(/[^0-9]/g, '');
    onInputChange(num);
    const parsed = parseFloat(num);
    if (!isNaN(parsed)) {
      onSetBet(parsed);
    } else if (num === '') {
      onSetBet(0);
    }
  };

  const handleHalfBet = () => {
    if (currentBet < 2) return;
    onSetBet(Math.floor(currentBet / 2));
  };

  const handleDoubleBetAmount = () => {
    const doubled = currentBet * 2;
    onSetBet(Math.min(doubled, balance + currentBet));
  };

  const handleAllIn = () => {
    onSetBet(balance + currentBet);
  };

  const handleRebet = () => {
    if (lastBet > 0 && lastBet <= balance + currentBet) {
      onSetBet(lastBet);
    }
  };

  if (gamePhase === 'betting') {
    return (
      <div className="animate-slide-up space-y-4 mx-auto w-full max-w-3xl">
        <div className="mx-auto w-full max-w-2xl rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1">
              <label className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500 mb-1.5">
                Bet Amount
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-bold text-gray-500">pts</span>
                <input
                  type="number"
                  value={betInput}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-xl border bg-white/[0.04] pl-14 pr-4 py-3 text-2xl font-bold text-white tabular-nums placeholder:text-gray-600 outline-none transition-all duration-200 border-white/[0.08] focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
                  min={0}
                  max={balance + currentBet}
                  step={1}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5 pt-5">
              <button
                onClick={handleHalfBet}
                disabled={currentBet < 2}
                className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:bg-white/[0.1] hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ½
              </button>
              <button
                onClick={handleDoubleBetAmount}
                disabled={currentBet === 0 || currentBet * 2 > balance + currentBet}
                className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:bg-white/[0.1] hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                2×
              </button>
              <button
                onClick={handleAllIn}
                disabled={balance + currentBet === 0}
                className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-[11px] font-bold text-amber-500/80 hover:bg-amber-500/10 hover:text-amber-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                MAX
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 mb-4 justify-center">
            {chipValues.map((value) => (
              <button
                key={value}
                onClick={() => onAddChip(value)}
                disabled={value > balance + currentBet}
                className={`relative h-[52px] w-[52px] rounded-full bg-gradient-to-b border-2 shadow-lg flex items-center justify-center transition-all duration-150 disabled:opacity-20 disabled:saturate-0 disabled:cursor-not-allowed hover:scale-110 hover:shadow-xl active:scale-95 ${getChipColor(value)}`}
              >
                <div className="absolute inset-[4px] rounded-full border border-white/20" />
                <div className="absolute inset-[8px] rounded-full border border-dashed border-white/15" />
                <span className="relative text-xs font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                  {value}
                </span>
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            {lastBet > 0 && (
              <button
                onClick={handleRebet}
                disabled={lastBet > balance + currentBet}
                className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] py-2.5 text-xs font-semibold text-gray-400 hover:bg-white/[0.06] hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ↺ Rebet {lastBet} pts
              </button>
            )}
            {currentBet > 0 && (
              <button
                onClick={onClearBet}
                className="flex-1 rounded-xl border border-red-500/20 bg-red-500/5 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-all"
              >
                ✕ Clear
              </button>
            )}
          </div>
        </div>

        <button
          onClick={onPlaceBet}
          disabled={currentBet === 0}
          className={`relative w-full overflow-hidden rounded-2xl py-4 text-lg font-black uppercase tracking-[0.1em] transition-all duration-200 ${currentBet > 0 ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 hover:from-emerald-400 hover:to-emerald-500 active:scale-[0.98]' : 'bg-white/[0.04] text-gray-600 cursor-not-allowed border border-white/[0.06]'}`}
        >
          {currentBet > 0 ? `Deal · ${currentBet.toLocaleString()} pts` : 'Enter Bet to Deal'}
        </button>
      </div>
    );
  }

  if (gamePhase === 'dealer-turn') {
    return (
      <div className="flex justify-center py-4 mx-auto w-full max-w-2xl">
        <div className="flex items-center gap-3 rounded-2xl bg-white/[0.04] border border-white/[0.06] px-8 py-4">
          <div className="flex gap-1">
            <div className="h-2 w-2 animate-bounce rounded-full bg-amber-500" style={{ animationDelay: '0ms' }} />
            <div className="h-2 w-2 animate-bounce rounded-full bg-amber-500" style={{ animationDelay: '150ms' }} />
            <div className="h-2 w-2 animate-bounce rounded-full bg-amber-500" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-sm font-semibold text-gray-400">Dealer is playing...</span>
        </div>
      </div>
    );
  }

  if (gamePhase === 'playing') {
    return (
      <div className="animate-slide-up grid grid-cols-2 gap-3 mx-auto w-full max-w-2xl">
        <button
          onClick={onHit}
          disabled={!canHit}
          className="group relative overflow-hidden rounded-2xl py-4 font-black text-base uppercase tracking-wider transition-all duration-150 bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 hover:from-blue-400 hover:to-blue-500 hover:shadow-xl active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
        >
          <span className="relative z-10">Hit</span>
          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-medium text-blue-200/60 normal-case tracking-normal">
            Draw a card
          </span>
        </button>

        <button
          onClick={onStand}
          disabled={!canStand}
          className="group relative overflow-hidden rounded-2xl py-4 font-black text-base uppercase tracking-wider transition-all duration-150 bg-gradient-to-b from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25 hover:from-red-400 hover:to-red-500 hover:shadow-xl active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
        >
          <span className="relative z-10">Stand</span>
          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-medium text-red-200/60 normal-case tracking-normal">
            Keep hand
          </span>
        </button>

        {canDouble && (
          <button
            onClick={onDouble}
            className="col-span-2 group relative overflow-hidden rounded-2xl py-3.5 font-black text-base uppercase tracking-wider transition-all duration-150 bg-gradient-to-b from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/25 hover:from-amber-400 hover:to-amber-500 hover:shadow-xl active:scale-[0.97]"
          >
            Double Down · {currentBet.toLocaleString()} pts
          </button>
        )}

        {canSplit && (
          <button
            onClick={onSplit}
            className="col-span-2 group relative overflow-hidden rounded-2xl py-3.5 font-black text-base uppercase tracking-wider transition-all duration-150 bg-gradient-to-b from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/25 hover:from-purple-400 hover:to-purple-500 hover:shadow-xl active:scale-[0.97]"
          >
            Split Hand
          </button>
        )}
      </div>
    );
  }

  if (gamePhase === 'ended') {
    return (
      <div className="animate-slide-up mx-auto w-full max-w-2xl">
        <button
          onClick={onNextRound}
          className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-4 text-lg font-black uppercase tracking-[0.1em] text-white shadow-lg shadow-emerald-500/25 transition-all hover:from-emerald-400 hover:to-emerald-500 hover:shadow-xl hover:shadow-emerald-500/30 active:scale-[0.98]"
        >
          New Round
        </button>
      </div>
    );
  }

  return null;
}

function SideBetsPanel({ isOpen, onToggle, gamePhase, sideBets, onChange }) {
  const sideBetTotal = sideBets.perfectPair + sideBets.twentyOneThree;

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-white/[0.02]"
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <span className="text-purple-400 text-sm">🎲</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Side Bets</h3>
            <p className="text-[11px] text-gray-500">
              {sideBetTotal > 0 ? `${sideBetTotal} pts active` : 'Optional'}
            </p>
          </div>
        </div>
        <svg
          className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="border-t border-white/[0.04] p-4 space-y-3">
          <SideBetRow
            title="Perfect Pair"
            description="First 2 cards match"
            payout="25:1"
            value={sideBets.perfectPair}
            onChange={(val) => onChange('perfectPair', val)}
            disabled={gamePhase !== 'betting'}
          />
          <SideBetRow
            title="21+3"
            description="3-card poker hand"
            payout="100:1"
            value={sideBets.twentyOneThree}
            onChange={(val) => onChange('twentyOneThree', val)}
            disabled={gamePhase !== 'betting'}
          />
        </div>
      )}
    </div>
  );
}

function SideBetRow({ title, description, payout, value, onChange, disabled }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="text-sm font-semibold text-white">{title}</h4>
          <p className="text-[11px] text-gray-500 mt-0.5">{description}</p>
        </div>
        <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-400">
          {payout}
        </span>
      </div>
      <input
        type="number"
        min="0"
        max={MAX_SIDE_BET}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value || '0', 10))}
        disabled={disabled}
        className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-gray-600 outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 disabled:opacity-40"
      />
    </div>
  );
}

function BetHistory({ entries }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4">
        <h2 className="text-sm font-bold text-white">Recent Bets</h2>
        <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold text-gray-500 tabular-nums">
          {entries.length}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-y border-white/[0.04] bg-white/[0.02]">
              <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500">Player</th>
              <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500">Bet</th>
              <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500 hidden md:table-cell">Side Bet</th>
              <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500">Result</th>
              <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500">P/L</th>
              <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500 hidden sm:table-cell">Time</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => (
              <tr
                key={index}
                className={`transition-colors hover:bg-white/[0.02] ${index % 2 === 0 ? 'bg-white/[0.01]' : 'bg-transparent'}`}
              >
                <td className="px-5 py-3 text-sm font-medium text-white whitespace-nowrap">{entry.username}</td>
                <td className="px-5 py-3 text-sm text-gray-400 tabular-nums">{entry.bet.toLocaleString()} pts</td>
                <td className="px-5 py-3 text-sm text-gray-500 hidden md:table-cell">{entry.sideBet || '—'}</td>
                <td className="px-5 py-3">
                  <span className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase ${entry.result.toLowerCase().includes('blackjack') ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : entry.result.toLowerCase().includes('win') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : entry.result.toLowerCase().includes('lose') || entry.result.toLowerCase().includes('bust') ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                    {entry.result}
                  </span>
                </td>
                <td className={`px-5 py-3 text-sm font-bold tabular-nums ${entry.profitLoss > 0 ? 'text-emerald-400' : entry.profitLoss < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                  {entry.profitLoss > 0 ? '+' : ''}{entry.profitLoss.toLocaleString()} pts
                </td>
                <td className="px-5 py-3 text-sm text-gray-500 hidden sm:table-cell whitespace-nowrap">{entry.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {entries.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-500">No bet history yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

function GameRules({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-xl rounded-2xl border border-white/[0.08] bg-gray-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <h2 className="text-lg font-bold text-white">How to Play</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-6 space-y-6">
          <section>
            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-2">Objective</h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              Beat the dealer by getting a hand value as close to 21 as possible without going over.
            </p>
          </section>

          <section>
            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-2">Card Values</h3>
            <div className="space-y-1.5 text-sm text-gray-300">
              <p>• Number cards (2–10): Face value</p>
              <p>• Face cards (J, Q, K): 10 points</p>
              <p>• Aces: 1 or 11 (best for your hand)</p>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-2">Game Flow</h3>
            <ol className="space-y-1.5 text-sm text-gray-300 list-decimal list-inside">
              <li>Enter your bet amount and click Deal</li>
              <li>You and the dealer each get two cards</li>
              <li>Choose Hit (draw), Stand (keep), Double, or Split (when available)</li>
              <li>Going over 21 = bust, you lose</li>
              <li>Dealer reveals and must hit until 17+</li>
              <li>Closest to 21 wins!</li>
            </ol>
          </section>

          <section>
            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-2">Payouts</h3>
            <div className="space-y-1.5 text-sm">
              <p><span className="text-emerald-400 font-semibold">Blackjack:</span> <span className="text-gray-300">3:2</span></p>
              <p><span className="text-emerald-400 font-semibold">Win:</span> <span className="text-gray-300">1:1</span></p>
              <p><span className="text-gray-400 font-semibold">Push:</span> <span className="text-gray-300">Bet returned</span></p>
              <p><span className="text-red-400 font-semibold">Loss:</span> <span className="text-gray-300">Bet forfeited</span></p>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-2">Side Bets</h3>
            <div className="space-y-1.5 text-sm text-gray-300">
              <p>• Perfect Pair: 25:1 (perfect), 12:1 (colored), 6:1 (mixed)</p>
              <p>• 21+3: Up to 100:1 for suited trips</p>
            </div>
          </section>
        </div>

        <div className="border-t border-white/[0.06] px-6 py-4">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-2.5 text-sm font-bold text-white transition-all hover:from-amber-400 hover:to-amber-500"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}

function WinOverlay({ winInfo, onDismiss }) {
  const [show, setShow] = useState(false);
  const [confetti, setConfetti] = useState([]);
  const [coins, setCoins] = useState([]);
  const [displayAmount, setDisplayAmount] = useState(0);

  const generateEffects = useCallback(() => {
    const colors = ['#FFD700', '#FFA500', '#FF6347', '#00FF7F', '#1E90FF', '#FF69B4', '#ADFF2F', '#FF4500'];
    const shapes = ['square', 'circle', 'strip'];

    const pieces = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 1.5,
      duration: 2 + Math.random() * 2,
      size: 6 + Math.random() * 8,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
    }));

    const floatingCoins = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      left: 20 + Math.random() * 60,
      delay: 0.2 + Math.random() * 0.8,
    }));

    setConfetti(pieces);
    setCoins(floatingCoins);
  }, []);

  useEffect(() => {
    if (!winInfo) {
      setShow(false);
      return;
    }

    setShow(true);
    setDisplayAmount(0);
    generateEffects();

    const target = winInfo.amount;
    const steps = 30;
    const stepTime = 40;
    let step = 0;

    const counter = setInterval(() => {
      step++;
      const progress = step / steps;
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayAmount(Math.round(target * eased));

      if (step >= steps) {
        clearInterval(counter);
        setDisplayAmount(target);
      }
    }, stepTime);

    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(onDismiss, 400);
    }, 3500);

    return () => {
      clearInterval(counter);
      clearTimeout(timer);
    };
  }, [winInfo, onDismiss, generateEffects]);

  if (!winInfo) return null;

  const isBlackjack = winInfo.result === 'BLACKJACK';
  const isPush = winInfo.result === 'PUSH';

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${show ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      onClick={() => {
        setShow(false);
        setTimeout(onDismiss, 300);
      }}
    >
      <div className={`absolute inset-0 transition-all duration-500 ${show ? 'bg-black/60 backdrop-blur-sm' : 'bg-transparent'}`} />

      {show && !isPush && confetti.map((piece) => (
        <div
          key={piece.id}
          className="absolute top-0 pointer-events-none"
          style={{
            left: `${piece.left}%`,
            width: piece.shape === 'strip' ? piece.size * 0.4 : piece.size,
            height: piece.shape === 'strip' ? piece.size * 2 : piece.size,
            backgroundColor: piece.color,
            borderRadius: piece.shape === 'circle' ? '50%' : piece.shape === 'strip' ? '2px' : '2px',
            animation: `confettiFall ${piece.duration}s linear ${piece.delay}s forwards`,
            opacity: 0,
            animationFillMode: 'forwards',
          }}
        />
      ))}

      {show && !isPush && coins.map((coin) => (
        <div
          key={coin.id}
          className="absolute pointer-events-none animate-float-up"
          style={{
            left: `${coin.left}%`,
            top: '55%',
            animationDelay: `${coin.delay}s`,
            fontSize: '28px',
          }}
        >
          💰
        </div>
      ))}

      <div className={`relative flex flex-col items-center gap-4 transition-all duration-500 ${show ? 'scale-100 translate-y-0' : 'scale-75 translate-y-8'}`}>
        <div className={`px-6 py-2 rounded-full text-sm font-bold uppercase tracking-[0.2em] ${show ? 'animate-slide-down' : ''} ${isBlackjack ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : isPush ? 'bg-gray-500/20 text-gray-300 border border-gray-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
          {isBlackjack ? '🃏 BLACKJACK!' : isPush ? 'PUSH' : '🎉 YOU WIN!'}
        </div>

        <div className={`relative ${show ? 'animate-fade-in-scale' : ''}`}>
          {!isPush && (
            <div className={`absolute inset-0 rounded-3xl blur-2xl ${isBlackjack ? 'bg-yellow-500/30' : 'bg-emerald-500/20'}`} />
          )}

          <div className={`relative px-12 py-8 rounded-3xl border-2 ${!isPush ? 'animate-win-glow' : ''} ${isBlackjack ? 'bg-gradient-to-b from-yellow-900/80 to-yellow-950/90 border-yellow-500/40' : isPush ? 'bg-gradient-to-b from-gray-800/80 to-gray-900/90 border-gray-600/40' : 'bg-gradient-to-b from-emerald-900/80 to-emerald-950/90 border-emerald-500/40'}`}>
            <div className="text-center">
              <p className={`text-xs font-semibold uppercase tracking-[0.15em] mb-2 ${isBlackjack ? 'text-yellow-400/80' : isPush ? 'text-gray-400' : 'text-emerald-400/80'}`}>
                {isPush ? 'Bet Returned' : 'You Won'}
              </p>

              <div className="flex items-baseline justify-center gap-1">
                <span className={`text-3xl font-bold ${isBlackjack ? 'text-yellow-400' : isPush ? 'text-gray-300' : 'text-emerald-400'}`}>
                  {isPush ? '' : '+'}
                </span>
                <span className={`text-6xl md:text-7xl font-black tabular-nums ${isBlackjack ? 'text-yellow-300' : isPush ? 'text-gray-200' : 'text-emerald-300'}`}>
                  {displayAmount.toLocaleString()}
                </span>
              </div>

              {!isPush && (
                <p className="text-gray-400 text-sm mt-2">
                  from {winInfo.bet.toLocaleString()} pts bet
                </p>
              )}
            </div>
          </div>
        </div>

        <p className={`text-gray-500 text-xs animate-pulse mt-2 ${show ? 'animate-slide-up' : ''}`} style={{ animationDelay: '1s' }}>
          Tap anywhere to continue
        </p>
      </div>
    </div>
  );
}

function Card({ card, hidden, index = 0 }) {
  if (hidden) {
    return (
      <div
        style={{ animationDelay: `${index * 0.15}s` }}
        className="relative h-[140px] w-[100px] rounded-xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.5)] animate-card-deal opacity-0"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-700 via-blue-800 to-blue-900" />
        <div className="absolute inset-[3px] rounded-[9px] border border-blue-500/30 overflow-hidden">
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `repeating-linear-gradient(
                45deg,
                transparent,
                transparent 8px,
                rgba(96,165,250,0.15) 8px,
                rgba(96,165,250,0.15) 9px
              ), repeating-linear-gradient(
                -45deg,
                transparent,
                transparent 8px,
                rgba(96,165,250,0.15) 8px,
                rgba(96,165,250,0.15) 9px
              )`
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full border-2 border-blue-400/40 flex items-center justify-center">
              <span className="text-blue-300/60 text-2xl">♠</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const suit = card.suit;
  const rank = card.rank;
  const red = isRed(suit);
  const suitSymbol = getSuitSymbol(suit);
  const isFaceCard = ['J', 'Q', 'K'].includes(rank);
  const isAce = rank === 'A';
  const pipCount = getPipCount(rank);

  const textColor = red ? 'text-red-500' : 'text-gray-800';
  const accentColor = red ? 'text-red-400' : 'text-gray-600';

  return (
    <div
      style={{ animationDelay: `${index * 0.15}s` }}
      className="relative h-[140px] w-[100px] rounded-xl overflow-hidden bg-gradient-to-br from-white via-gray-50 to-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.4)] border border-gray-200/80 animate-card-deal opacity-0"
    >
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, black 1px, transparent 0)',
          backgroundSize: '6px 6px'
        }}
      />

      <div className="absolute top-1.5 left-2 flex flex-col items-center leading-none">
        <span className={`text-[15px] font-black tracking-tight ${textColor}`}>{rank}</span>
        <span className={`text-[13px] -mt-0.5 ${textColor}`}>{suitSymbol}</span>
      </div>

      <div className="absolute bottom-1.5 right-2 flex flex-col items-center leading-none rotate-180">
        <span className={`text-[15px] font-black tracking-tight ${textColor}`}>{rank}</span>
        <span className={`text-[13px] -mt-0.5 ${textColor}`}>{suitSymbol}</span>
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        {isAce && (
          <span className={`text-[52px] leading-none drop-shadow-sm ${textColor}`}>{suitSymbol}</span>
        )}

        {isFaceCard && (
          <div className="flex flex-col items-center">
            <span className={`text-[42px] leading-none ${accentColor}`}>{getFaceCardArt(rank)}</span>
            <span className={`text-[11px] mt-0.5 font-bold opacity-60 ${textColor}`}>{suitSymbol}</span>
          </div>
        )}

        {!isAce && !isFaceCard && pipCount > 0 && (
          <PipLayout count={pipCount} suit={suit} />
        )}
      </div>
    </div>
  );
}

function PipLayout({ count, suit }) {
  const symbol = getSuitSymbol(suit);
  const red = isRed(suit);
  const color = red ? 'text-red-500' : 'text-gray-800';
  const size = count <= 4 ? 'text-[18px]' : count <= 6 ? 'text-[15px]' : 'text-[13px]';

  const pips = [];

  switch (count) {
    case 2:
      pips.push({ x: 50, y: 25 }, { x: 50, y: 75, flip: true });
      break;
    case 3:
      pips.push({ x: 50, y: 22 }, { x: 50, y: 50 }, { x: 50, y: 78, flip: true });
      break;
    case 4:
      pips.push({ x: 35, y: 25 }, { x: 65, y: 25 }, { x: 35, y: 75, flip: true }, { x: 65, y: 75, flip: true });
      break;
    case 5:
      pips.push({ x: 35, y: 25 }, { x: 65, y: 25 }, { x: 50, y: 50 }, { x: 35, y: 75, flip: true }, { x: 65, y: 75, flip: true });
      break;
    case 6:
      pips.push(
        { x: 35, y: 22 }, { x: 65, y: 22 },
        { x: 35, y: 50 }, { x: 65, y: 50 },
        { x: 35, y: 78, flip: true }, { x: 65, y: 78, flip: true }
      );
      break;
    case 7:
      pips.push(
        { x: 35, y: 20 }, { x: 65, y: 20 },
        { x: 50, y: 35 },
        { x: 35, y: 50 }, { x: 65, y: 50 },
        { x: 35, y: 80, flip: true }, { x: 65, y: 80, flip: true }
      );
      break;
    case 8:
      pips.push(
        { x: 35, y: 20 }, { x: 65, y: 20 },
        { x: 50, y: 33 },
        { x: 35, y: 46 }, { x: 65, y: 46 },
        { x: 50, y: 60 },
        { x: 35, y: 80, flip: true }, { x: 65, y: 80, flip: true }
      );
      break;
    case 9:
      pips.push(
        { x: 35, y: 18 }, { x: 65, y: 18 },
        { x: 35, y: 36 }, { x: 65, y: 36 },
        { x: 50, y: 50 },
        { x: 35, y: 64 }, { x: 65, y: 64 },
        { x: 35, y: 82, flip: true }, { x: 65, y: 82, flip: true }
      );
      break;
    case 10:
      pips.push(
        { x: 35, y: 16 }, { x: 65, y: 16 },
        { x: 50, y: 28 },
        { x: 35, y: 38 }, { x: 65, y: 38 },
        { x: 35, y: 60 }, { x: 65, y: 60 },
        { x: 50, y: 72 },
        { x: 35, y: 84, flip: true }, { x: 65, y: 84, flip: true }
      );
      break;
    default:
      break;
  }

  return (
    <div className="absolute inset-x-5 inset-y-6 relative">
      {pips.map((pip, i) => (
        <span
          key={i}
          className={`${size} ${color} absolute leading-none ${pip.flip ? 'rotate-180' : ''}`}
          style={{
            left: `${pip.x}%`,
            top: `${pip.y}%`,
            transform: `translate(-50%, -50%)${pip.flip ? ' rotate(180deg)' : ''}`,
          }}
        >
          {symbol}
        </span>
      ))}
    </div>
  );
}

function getSuitSymbol(suit) {
  const symbols = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
  };
  return symbols[suit] || '♠';
}

function isRed(suit) {
  return suit === 'hearts' || suit === 'diamonds';
}

function getFaceCardArt(rank) {
  if (rank === 'K') return '♚';
  if (rank === 'Q') return '♛';
  if (rank === 'J') return '♞';
  return rank;
}

function getPipCount(rank) {
  const num = parseInt(rank, 10);
  if (!isNaN(num)) return num;
  return 0;
}

function getChipColor(value) {
  if (value <= 5) return 'from-red-500 to-red-700 border-red-400 shadow-red-500/30';
  if (value <= 10) return 'from-blue-500 to-blue-700 border-blue-400 shadow-blue-500/30';
  if (value <= 25) return 'from-emerald-500 to-emerald-700 border-emerald-400 shadow-emerald-500/30';
  if (value <= 50) return 'from-amber-500 to-amber-700 border-amber-400 shadow-amber-500/30';
  if (value <= 100) return 'from-purple-500 to-purple-700 border-purple-400 shadow-purple-500/30';
  return 'from-yellow-400 to-yellow-600 border-yellow-300 shadow-yellow-500/30';
}
