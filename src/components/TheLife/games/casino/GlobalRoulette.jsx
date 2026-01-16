import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import RouletteWheel, { WHEEL_NUMBERS, getNumberColor } from './RouletteWheel';
import './GlobalRoulette.css';

/**
 * GlobalRoulette - Multiplayer browser-based roulette
 * Features:
 * - Single global table for all players
 * - Continuous automatic rounds
 * - Real-time bet synchronization
 * - European roulette rules (0-36)
 * - Full betting system with real casino payouts
 */

// Bet types and their payouts
const BET_TYPES = {
  STRAIGHT: { payout: 35, name: 'Straight Up' },
  SPLIT: { payout: 17, name: 'Split' },
  STREET: { payout: 11, name: 'Street' },
  CORNER: { payout: 8, name: 'Corner' },
  LINE: { payout: 5, name: 'Line' },
  DOZEN: { payout: 2, name: 'Dozen' },
  COLUMN: { payout: 2, name: 'Column' },
  RED: { payout: 1, name: 'Red' },
  BLACK: { payout: 1, name: 'Black' },
  EVEN: { payout: 1, name: 'Even' },
  ODD: { payout: 1, name: 'Odd' },
  LOW: { payout: 1, name: '1-18' },
  HIGH: { payout: 1, name: '19-36' }
};

// Red numbers on the wheel
const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

// Phase timing (in seconds)
const PHASE_TIMING = {
  BETTING: 30,
  NO_MORE_BETS: 5,
  SPINNING: 12,
  PAYOUT: 5
};

// Chip values
const CHIP_VALUES = [1, 5, 10, 25, 100, 500];

export default function GlobalRoulette({ 
  player, 
  setPlayer, 
  setMessage, 
  user, 
  onBack 
}) {
  // Game state
  const [gamePhase, setGamePhase] = useState('betting'); // betting, no_more_bets, spinning, payout
  const [timeLeft, setTimeLeft] = useState(PHASE_TIMING.BETTING);
  const [winningNumber, setWinningNumber] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [roundId, setRoundId] = useState(null);

  // Betting state
  const [selectedChip, setSelectedChip] = useState(10);
  const [myBets, setMyBets] = useState([]);
  const [allBets, setAllBets] = useState({});
  const [totalBetAmount, setTotalBetAmount] = useState(0);
  const [lastBets, setLastBets] = useState([]);

  // Results state
  const [recentNumbers, setRecentNumbers] = useState([]);
  const [hotNumbers, setHotNumbers] = useState([]);
  const [coldNumbers, setColdNumbers] = useState([]);
  const [myWinnings, setMyWinnings] = useState(0);
  const [showWinModal, setShowWinModal] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [onlinePlayers, setOnlinePlayers] = useState([]);

  // Stats
  const [sessionStats, setSessionStats] = useState({
    totalBet: 0,
    totalWon: 0,
    roundsPlayed: 0,
    biggestWin: 0
  });

  const timerRef = useRef(null);
  const chatEndRef = useRef(null);

  // Calculate bet coverage (which numbers a bet covers)
  const getBetNumbers = useCallback((betType, betValue) => {
    switch (betType) {
      case 'STRAIGHT':
        return [betValue];
      case 'SPLIT':
        return betValue; // Array of 2 numbers
      case 'STREET':
        const streetStart = (betValue - 1) * 3 + 1;
        return [streetStart, streetStart + 1, streetStart + 2];
      case 'CORNER':
        return betValue; // Array of 4 numbers
      case 'LINE':
        const lineStart = (betValue - 1) * 3 + 1;
        return [lineStart, lineStart + 1, lineStart + 2, lineStart + 3, lineStart + 4, lineStart + 5];
      case 'DOZEN':
        const dozenStart = (betValue - 1) * 12 + 1;
        return Array.from({ length: 12 }, (_, i) => dozenStart + i);
      case 'COLUMN':
        return Array.from({ length: 12 }, (_, i) => betValue + i * 3);
      case 'RED':
        return RED_NUMBERS;
      case 'BLACK':
        return Array.from({ length: 36 }, (_, i) => i + 1).filter(n => !RED_NUMBERS.includes(n));
      case 'EVEN':
        return Array.from({ length: 18 }, (_, i) => (i + 1) * 2);
      case 'ODD':
        return Array.from({ length: 18 }, (_, i) => i * 2 + 1);
      case 'LOW':
        return Array.from({ length: 18 }, (_, i) => i + 1);
      case 'HIGH':
        return Array.from({ length: 18 }, (_, i) => i + 19);
      default:
        return [];
    }
  }, []);

  // Check if a bet wins
  const checkBetWin = useCallback((bet, result) => {
    const coveredNumbers = getBetNumbers(bet.type, bet.value);
    return coveredNumbers.includes(result);
  }, [getBetNumbers]);

  // Calculate winnings for a bet
  const calculateWinnings = useCallback((bet, result) => {
    if (!checkBetWin(bet, result)) return 0;
    return bet.amount * (BET_TYPES[bet.type].payout + 1);
  }, [checkBetWin]);

  // Place a bet
  const placeBet = useCallback((betType, betValue, position) => {
    if (gamePhase !== 'betting') {
      setMessage({ type: 'error', text: 'Betting is closed!' });
      return;
    }

    if (selectedChip > player.cash - totalBetAmount) {
      setMessage({ type: 'error', text: 'Not enough cash!' });
      return;
    }

    const newBet = {
      id: Date.now() + Math.random(),
      type: betType,
      value: betValue,
      amount: selectedChip,
      position,
      playerId: player.id,
      playerName: player.name
    };

    setMyBets(prev => [...prev, newBet]);
    setTotalBetAmount(prev => prev + selectedChip);

    // Broadcast bet to all players (in production, this goes through the server)
    broadcastBet(newBet);

    // Play chip sound
    playSound('chip');
  }, [gamePhase, selectedChip, player, totalBetAmount, setMessage]);

  // Broadcast bet to other players
  const broadcastBet = async (bet) => {
    try {
      await supabase.from('roulette_bets').insert({
        round_id: roundId,
        player_id: player.id,
        player_name: player.name,
        bet_type: bet.type,
        bet_value: JSON.stringify(bet.value),
        bet_amount: bet.amount,
        position: bet.position
      });
    } catch (error) {
      console.error('Error broadcasting bet:', error);
    }
  };

  // Undo last bet
  const undoLastBet = useCallback(() => {
    if (gamePhase !== 'betting' || myBets.length === 0) return;
    
    const lastBet = myBets[myBets.length - 1];
    setMyBets(prev => prev.slice(0, -1));
    setTotalBetAmount(prev => prev - lastBet.amount);
    playSound('chip');
  }, [gamePhase, myBets]);

  // Clear all bets
  const clearBets = useCallback(() => {
    if (gamePhase !== 'betting') return;
    setMyBets([]);
    setTotalBetAmount(0);
  }, [gamePhase]);

  // Repeat last round's bets
  const repeatBets = useCallback(() => {
    if (gamePhase !== 'betting' || lastBets.length === 0) return;
    
    const totalNeeded = lastBets.reduce((sum, bet) => sum + bet.amount, 0);
    if (totalNeeded > player.cash) {
      setMessage({ type: 'error', text: 'Not enough cash to repeat bets!' });
      return;
    }

    setMyBets([...lastBets]);
    setTotalBetAmount(totalNeeded);
    lastBets.forEach(bet => broadcastBet(bet));
  }, [gamePhase, lastBets, player.cash, setMessage]);

  // Double all bets
  const doubleBets = useCallback(() => {
    if (gamePhase !== 'betting' || myBets.length === 0) return;
    
    const additionalAmount = totalBetAmount;
    if (additionalAmount > player.cash - totalBetAmount) {
      setMessage({ type: 'error', text: 'Not enough cash to double!' });
      return;
    }

    const doubledBets = myBets.map(bet => ({
      ...bet,
      id: Date.now() + Math.random(),
      amount: bet.amount * 2
    }));

    setMyBets(doubledBets);
    setTotalBetAmount(additionalAmount * 2);
  }, [gamePhase, myBets, totalBetAmount, player.cash, setMessage]);

  // Play sound effect
  const playSound = (type) => {
    // Audio implementation - sounds would be loaded from public folder
    const sounds = {
      chip: '/sounds/chip.mp3',
      spin: '/sounds/spin.mp3',
      ball: '/sounds/ball.mp3',
      win: '/sounds/win.mp3',
      lose: '/sounds/lose.mp3',
      countdown: '/sounds/countdown.mp3'
    };
    
    try {
      const audio = new Audio(sounds[type]);
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch (e) {
      // Audio not available
    }
  };

  // Generate winning number (in production, this comes from the server)
  const generateWinningNumber = useCallback(() => {
    return Math.floor(Math.random() * 37); // 0-36
  }, []);

  // Process round results
  const processResults = useCallback((result) => {
    let totalWinnings = 0;

    myBets.forEach(bet => {
      const winAmount = calculateWinnings(bet, result);
      totalWinnings += winAmount;
    });

    // Update stats
    setSessionStats(prev => ({
      totalBet: prev.totalBet + totalBetAmount,
      totalWon: prev.totalWon + totalWinnings,
      roundsPlayed: prev.roundsPlayed + 1,
      biggestWin: Math.max(prev.biggestWin, totalWinnings)
    }));

    // Calculate net win/loss
    const netWin = totalWinnings - totalBetAmount;

    if (totalWinnings > 0) {
      setMyWinnings(totalWinnings);
      setShowWinModal(true);
      playSound('win');

      // Update player cash
      const newCash = player.cash + netWin;
      setPlayer(prev => ({ ...prev, cash: newCash }));

      // Update in database
      supabase.from('the_life_players')
        .update({ cash: newCash })
        .eq('id', player.id)
        .then(() => {});
    } else if (totalBetAmount > 0) {
      playSound('lose');
      
      // Deduct losses
      const newCash = player.cash - totalBetAmount;
      setPlayer(prev => ({ ...prev, cash: newCash }));

      supabase.from('the_life_players')
        .update({ cash: newCash })
        .eq('id', player.id)
        .then(() => {});
    }

    // Update recent numbers
    setRecentNumbers(prev => [result, ...prev].slice(0, 20));

    // Save last bets for repeat function
    setLastBets([...myBets]);

    // Clear current bets
    setMyBets([]);
    setTotalBetAmount(0);
    setAllBets({});
  }, [myBets, totalBetAmount, calculateWinnings, player, setPlayer]);

  // Game loop
  useEffect(() => {
    const runGameLoop = async () => {
      switch (gamePhase) {
        case 'betting':
          if (timeLeft <= 0) {
            setGamePhase('no_more_bets');
            setTimeLeft(PHASE_TIMING.NO_MORE_BETS);
            playSound('countdown');
          }
          break;

        case 'no_more_bets':
          if (timeLeft <= 0) {
            // Generate result and start spin
            const result = generateWinningNumber();
            setWinningNumber(result);
            setIsSpinning(true);
            setGamePhase('spinning');
            setTimeLeft(PHASE_TIMING.SPINNING);
            playSound('spin');
          }
          break;

        case 'spinning':
          if (timeLeft <= 0) {
            setIsSpinning(false);
            setGamePhase('payout');
            setTimeLeft(PHASE_TIMING.PAYOUT);
            processResults(winningNumber);
          }
          break;

        case 'payout':
          if (timeLeft <= 0) {
            // Reset for new round
            setWinningNumber(null);
            setShowWinModal(false);
            setRoundId(Date.now());
            setGamePhase('betting');
            setTimeLeft(PHASE_TIMING.BETTING);
          }
          break;
      }
    };

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
      runGameLoop();
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gamePhase, timeLeft, generateWinningNumber, winningNumber, processResults]);

  // Initialize round
  useEffect(() => {
    setRoundId(Date.now());
    
    // Load recent numbers from database
    const loadHistory = async () => {
      const { data } = await supabase
        .from('roulette_history')
        .select('winning_number')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (data) {
        setRecentNumbers(data.map(r => r.winning_number));
      }
    };

    loadHistory();

    // Subscribe to bets
    const betsChannel = supabase
      .channel('roulette-bets')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'roulette_bets'
      }, (payload) => {
        if (payload.new.player_id !== player.id) {
          // Add other player's bet to display
          setAllBets(prev => {
            const key = `${payload.new.bet_type}-${payload.new.position}`;
            return {
              ...prev,
              [key]: (prev[key] || 0) + payload.new.bet_amount
            };
          });
        }
      })
      .subscribe();

    // Subscribe to chat
    const chatChannel = supabase
      .channel('roulette-chat')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'roulette_chat'
      }, (payload) => {
        setChatMessages(prev => [...prev, payload.new].slice(-50));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(betsChannel);
      supabase.removeChannel(chatChannel);
    };
  }, [player.id]);

  // Send chat message
  const sendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    await supabase.from('roulette_chat').insert({
      player_id: player.id,
      player_name: player.name,
      player_avatar: player.avatar,
      message: chatInput.trim()
    });

    setChatInput('');
  };

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Calculate hot/cold numbers
  useEffect(() => {
    if (recentNumbers.length < 5) return;

    const counts = {};
    recentNumbers.forEach(num => {
      counts[num] = (counts[num] || 0) + 1;
    });

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    setHotNumbers(sorted.slice(0, 5).map(([num]) => parseInt(num)));
    
    const allNumbers = Array.from({ length: 37 }, (_, i) => i);
    const cold = allNumbers.filter(n => !counts[n] || counts[n] === 1);
    setColdNumbers(cold.slice(0, 5));
  }, [recentNumbers]);

  // Render betting table
  const renderBettingTable = () => {
    const numbers = [];
    
    // Build 3-column number grid
    for (let row = 0; row < 12; row++) {
      for (let col = 2; col >= 0; col--) {
        const num = row * 3 + col + 1;
        numbers.push(num);
      }
    }

    return (
      <div className="betting-table">
        {/* Zero */}
        <div 
          className="bet-zero"
          onClick={() => placeBet('STRAIGHT', 0, 'zero')}
        >
          <span>0</span>
          {renderChipsOnSpot('STRAIGHT-zero')}
        </div>

        {/* Number grid */}
        <div className="number-grid">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(row => (
            <div key={row} className="number-row">
              {[3, 2, 1].map(col => {
                const num = (row - 1) * 3 + col;
                const isRed = RED_NUMBERS.includes(num);
                return (
                  <div
                    key={num}
                    className={`number-cell ${isRed ? 'red' : 'black'}`}
                    onClick={() => placeBet('STRAIGHT', num, `num-${num}`)}
                  >
                    <span>{num}</span>
                    {renderChipsOnSpot(`STRAIGHT-num-${num}`)}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Column bets */}
        <div className="column-bets">
          {[1, 2, 3].map(col => (
            <div
              key={col}
              className="column-bet"
              onClick={() => placeBet('COLUMN', col, `col-${col}`)}
            >
              <span>2:1</span>
              {renderChipsOnSpot(`COLUMN-col-${col}`)}
            </div>
          ))}
        </div>

        {/* Dozen bets */}
        <div className="dozen-bets">
          <div 
            className="dozen-bet"
            onClick={() => placeBet('DOZEN', 1, 'dozen-1')}
          >
            <span>1st 12</span>
            {renderChipsOnSpot('DOZEN-dozen-1')}
          </div>
          <div 
            className="dozen-bet"
            onClick={() => placeBet('DOZEN', 2, 'dozen-2')}
          >
            <span>2nd 12</span>
            {renderChipsOnSpot('DOZEN-dozen-2')}
          </div>
          <div 
            className="dozen-bet"
            onClick={() => placeBet('DOZEN', 3, 'dozen-3')}
          >
            <span>3rd 12</span>
            {renderChipsOnSpot('DOZEN-dozen-3')}
          </div>
        </div>

        {/* Outside bets */}
        <div className="outside-bets">
          <div 
            className="outside-bet"
            onClick={() => placeBet('LOW', null, 'low')}
          >
            <span>1-18</span>
            {renderChipsOnSpot('LOW-low')}
          </div>
          <div 
            className="outside-bet"
            onClick={() => placeBet('EVEN', null, 'even')}
          >
            <span>EVEN</span>
            {renderChipsOnSpot('EVEN-even')}
          </div>
          <div 
            className="outside-bet red-bet"
            onClick={() => placeBet('RED', null, 'red')}
          >
            <span>◆</span>
            {renderChipsOnSpot('RED-red')}
          </div>
          <div 
            className="outside-bet black-bet"
            onClick={() => placeBet('BLACK', null, 'black')}
          >
            <span>◆</span>
            {renderChipsOnSpot('BLACK-black')}
          </div>
          <div 
            className="outside-bet"
            onClick={() => placeBet('ODD', null, 'odd')}
          >
            <span>ODD</span>
            {renderChipsOnSpot('ODD-odd')}
          </div>
          <div 
            className="outside-bet"
            onClick={() => placeBet('HIGH', null, 'high')}
          >
            <span>19-36</span>
            {renderChipsOnSpot('HIGH-high')}
          </div>
        </div>
      </div>
    );
  };

  // Render chips on a betting spot
  const renderChipsOnSpot = (spotKey) => {
    const myChips = myBets.filter(bet => `${bet.type}-${bet.position}` === spotKey);
    const otherAmount = allBets[spotKey] || 0;
    
    if (myChips.length === 0 && otherAmount === 0) return null;

    const myTotal = myChips.reduce((sum, bet) => sum + bet.amount, 0);

    return (
      <div className="spot-chips">
        {myTotal > 0 && (
          <div className="my-chip">
            <span>${myTotal}</span>
          </div>
        )}
        {otherAmount > 0 && (
          <div className="other-chips">
            <span>+${otherAmount}</span>
          </div>
        )}
      </div>
    );
  };

  // Get phase display text
  const getPhaseText = () => {
    switch (gamePhase) {
      case 'betting': return 'PLACE YOUR BETS';
      case 'no_more_bets': return 'NO MORE BETS';
      case 'spinning': return 'SPINNING...';
      case 'payout': return winningNumber !== null ? `RESULT: ${winningNumber}` : 'CALCULATING...';
      default: return '';
    }
  };

  return (
    <div className="global-roulette">
      {/* Header */}
      <header className="roulette-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        
        <div className="header-center">
          <h1>UNDERGROUND <span>ROULETTE</span></h1>
          <p className="subtitle">European Single Zero</p>
        </div>

        <div className="player-info">
          <span className="balance-label">CASH</span>
          <span className="balance-amount">${(player.cash - totalBetAmount).toLocaleString()}</span>
        </div>
      </header>

      {/* Main content */}
      <div className="roulette-content">
        {/* Left panel - Wheel and info */}
        <div className="left-panel">
          {/* Wheel */}
          <div className="wheel-section">
            <RouletteWheel
              isSpinning={isSpinning}
              targetNumber={winningNumber}
              onSpinComplete={(num) => console.log('Landed on:', num)}
              size={350}
            />

            {/* Timer and phase */}
            <div className={`phase-display ${gamePhase}`}>
              <div className="phase-text">{getPhaseText()}</div>
              <div className="timer">
                <span className={timeLeft <= 5 ? 'urgent' : ''}>{timeLeft}s</span>
              </div>
            </div>
          </div>

          {/* Recent numbers */}
          <div className="recent-numbers">
            <h3>Recent Numbers</h3>
            <div className="numbers-track">
              {recentNumbers.slice(0, 15).map((num, i) => (
                <div 
                  key={i} 
                  className={`recent-number ${num === 0 ? 'green' : RED_NUMBERS.includes(num) ? 'red' : 'black'}`}
                >
                  {num}
                </div>
              ))}
            </div>
          </div>

          {/* Statistics */}
          <div className="stats-panel">
            <div className="stats-section">
              <h4>🔥 Hot Numbers</h4>
              <div className="stat-numbers hot">
                {hotNumbers.map((num, i) => (
                  <span key={i} className={num === 0 ? 'green' : RED_NUMBERS.includes(num) ? 'red' : 'black'}>
                    {num}
                  </span>
                ))}
              </div>
            </div>
            <div className="stats-section">
              <h4>❄️ Cold Numbers</h4>
              <div className="stat-numbers cold">
                {coldNumbers.map((num, i) => (
                  <span key={i} className={num === 0 ? 'green' : RED_NUMBERS.includes(num) ? 'red' : 'black'}>
                    {num}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Session stats */}
          <div className="session-stats">
            <div className="stat">
              <span className="label">Rounds</span>
              <span className="value">{sessionStats.roundsPlayed}</span>
            </div>
            <div className="stat">
              <span className="label">Total Bet</span>
              <span className="value">${sessionStats.totalBet.toLocaleString()}</span>
            </div>
            <div className="stat">
              <span className="label">Total Won</span>
              <span className="value win">${sessionStats.totalWon.toLocaleString()}</span>
            </div>
            <div className="stat">
              <span className="label">Profit</span>
              <span className={`value ${sessionStats.totalWon - sessionStats.totalBet >= 0 ? 'win' : 'loss'}`}>
                ${(sessionStats.totalWon - sessionStats.totalBet).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Center - Betting table */}
        <div className="center-panel">
          {renderBettingTable()}

          {/* Chip selector and controls */}
          <div className="betting-controls">
            <div className="chip-selector">
              {CHIP_VALUES.map(value => (
                <button
                  key={value}
                  className={`chip-btn ${selectedChip === value ? 'selected' : ''} chip-${value}`}
                  onClick={() => setSelectedChip(value)}
                  disabled={value > player.cash - totalBetAmount}
                >
                  ${value}
                </button>
              ))}
            </div>

            <div className="bet-actions">
              <button 
                className="action-btn undo"
                onClick={undoLastBet}
                disabled={gamePhase !== 'betting' || myBets.length === 0}
              >
                ↩ Undo
              </button>
              <button 
                className="action-btn clear"
                onClick={clearBets}
                disabled={gamePhase !== 'betting' || myBets.length === 0}
              >
                ✕ Clear
              </button>
              <button 
                className="action-btn repeat"
                onClick={repeatBets}
                disabled={gamePhase !== 'betting' || lastBets.length === 0}
              >
                🔄 Repeat
              </button>
              <button 
                className="action-btn double"
                onClick={doubleBets}
                disabled={gamePhase !== 'betting' || myBets.length === 0 || totalBetAmount * 2 > player.cash}
              >
                ×2 Double
              </button>
            </div>

            <div className="current-bet-info">
              <span>Total Bet:</span>
              <strong>${totalBetAmount.toLocaleString()}</strong>
            </div>
          </div>
        </div>

        {/* Right panel - Chat and players */}
        <div className="right-panel">
          {/* Online players */}
          <div className="online-players">
            <h3>🟢 Players Online <span>{onlinePlayers.length + 1}</span></h3>
            <div className="player-list">
              <div className="player-item me">
                <img src={player.avatar || '/default-avatar.png'} alt="" />
                <span>{player.name} (You)</span>
              </div>
              {onlinePlayers.map((p, i) => (
                <div key={i} className="player-item">
                  <img src={p.avatar || '/default-avatar.png'} alt="" />
                  <span>{p.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Chat */}
          <div className="chat-section">
            <h3>💬 Table Chat</h3>
            <div className="chat-messages">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`chat-message ${msg.player_id === player.id ? 'mine' : ''}`}>
                  <img src={msg.player_avatar || '/default-avatar.png'} alt="" />
                  <div className="msg-content">
                    <span className="author">{msg.player_name}</span>
                    <span className="text">{msg.message}</span>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <form className="chat-input" onSubmit={sendChatMessage}>
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Say something..."
                maxLength={100}
              />
              <button type="submit">Send</button>
            </form>
          </div>

          {/* Payout info */}
          <div className="payout-info">
            <h3>💰 Payouts</h3>
            <div className="payout-list">
              <div><span>Straight</span><span>35:1</span></div>
              <div><span>Split</span><span>17:1</span></div>
              <div><span>Street</span><span>11:1</span></div>
              <div><span>Corner</span><span>8:1</span></div>
              <div><span>Line</span><span>5:1</span></div>
              <div><span>Dozen/Column</span><span>2:1</span></div>
              <div><span>Even Chances</span><span>1:1</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Win modal */}
      {showWinModal && (
        <div className="win-modal">
          <div className="win-content">
            <div className="win-number" style={{ background: getNumberColor(winningNumber) }}>
              {winningNumber}
            </div>
            <h2>🎉 YOU WON!</h2>
            <div className="win-amount">${myWinnings.toLocaleString()}</div>
            <button onClick={() => setShowWinModal(false)}>Continue</button>
          </div>
        </div>
      )}
    </div>
  );
}
