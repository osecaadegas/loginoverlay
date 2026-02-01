import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../../../config/supabaseClient';
import { SidePanel, PanelSection, PanelButton, PanelButtonGroup } from '../../components/SidePanel';
import './PokerTable.css';

// ============================================
// POKER CONFIGURATION
// ============================================
const POKER_CONFIG = {
  actionTimeout: 30, // seconds
  animationDuration: 500, // ms
  handRankings: [
    'High Card', 'Pair', 'Two Pair', 'Three of a Kind', 
    'Straight', 'Flush', 'Full House', 'Four of a Kind', 
    'Straight Flush', 'Royal Flush'
  ]
};

const CARD_SUITS = ['♠', '♥', '♦', '♣'];
const CARD_VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// ============================================
// POKER TABLE COMPONENT
// ============================================
export default function PokerTable({
  table,
  player,
  setPlayer,
  setMessage,
  user,
  onLeave,
  isSpectator = false
}) {
  // Game State
  const [seats, setSeats] = useState([]);
  const [mySeat, setMySeat] = useState(null);
  const [myBalance, setMyBalance] = useState(0);
  const [gameState, setGameState] = useState({
    phase: 'waiting', // waiting, preflop, flop, turn, river, showdown
    pot: 0,
    communityCards: [],
    currentBet: 0,
    dealerSeat: 0,
    activeSeat: -1,
    round: 0
  });
  
  // UI State
  const [showBuyInModal, setShowBuyInModal] = useState(false);
  const [buyInAmount, setBuyInAmount] = useState(table.min_buyin);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [betAmount, setBetAmount] = useState(0);
  const [actionTimer, setActionTimer] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [myCards, setMyCards] = useState([]);
  const [isActing, setIsActing] = useState(false);

  // Refs
  const subscriptionRef = useRef(null);
  const timerRef = useRef(null);
  const chatRef = useRef(null);

  // ============================================
  // SEAT POSITIONS (for visual layout)
  // ============================================
  const getSeatPosition = (seatNumber, totalSeats) => {
    const positions = {
      2: [{ bottom: '10%', left: '25%' }, { bottom: '10%', right: '25%' }],
      4: [
        { bottom: '5%', left: '50%', transform: 'translateX(-50%)' },
        { top: '40%', left: '5%' },
        { top: '5%', left: '50%', transform: 'translateX(-50%)' },
        { top: '40%', right: '5%' }
      ],
      6: [
        { bottom: '5%', left: '50%', transform: 'translateX(-50%)' },
        { bottom: '20%', left: '10%' },
        { top: '20%', left: '10%' },
        { top: '5%', left: '50%', transform: 'translateX(-50%)' },
        { top: '20%', right: '10%' },
        { bottom: '20%', right: '10%' }
      ],
      8: [
        { bottom: '5%', left: '50%', transform: 'translateX(-50%)' },
        { bottom: '15%', left: '15%' },
        { top: '35%', left: '5%' },
        { top: '10%', left: '20%' },
        { top: '5%', left: '50%', transform: 'translateX(-50%)' },
        { top: '10%', right: '20%' },
        { top: '35%', right: '5%' },
        { bottom: '15%', right: '15%' }
      ],
      10: [
        { bottom: '5%', left: '50%', transform: 'translateX(-50%)' },
        { bottom: '10%', left: '20%' },
        { bottom: '25%', left: '5%' },
        { top: '25%', left: '5%' },
        { top: '10%', left: '20%' },
        { top: '5%', left: '50%', transform: 'translateX(-50%)' },
        { top: '10%', right: '20%' },
        { top: '25%', right: '5%' },
        { bottom: '25%', right: '5%' },
        { bottom: '10%', right: '20%' }
      ]
    };
    
    const seatPositions = positions[totalSeats] || positions[6];
    return seatPositions[seatNumber] || {};
  };

  // ============================================
  // LOAD SEATS & GAME STATE
  // ============================================
  const loadTableData = useCallback(async () => {
    try {
      // Load seats
      const { data: seatsData, error: seatsError } = await supabase
        .from('casino_seats')
        .select('*')
        .eq('table_id', table.id)
        .order('seat_number');

      if (seatsError) throw seatsError;
      setSeats(seatsData || []);

      // Check if user has a seat
      const userSeat = seatsData?.find(s => s.player_id === player?.id);
      if (userSeat) {
        setMySeat(userSeat.seat_number);
        setMyBalance(userSeat.chips);
        // Load player's cards from game state if exists
        if (userSeat.hand_data) {
          setMyCards(JSON.parse(userSeat.hand_data));
        }
      }

      // Load game state
      const { data: tableData, error: tableError } = await supabase
        .from('casino_tables')
        .select('game_state, current_pot')
        .eq('id', table.id)
        .single();

      if (tableError) throw tableError;
      
      if (tableData?.game_state) {
        const state = typeof tableData.game_state === 'string' 
          ? JSON.parse(tableData.game_state) 
          : tableData.game_state;
        setGameState(prev => ({ 
          ...prev, 
          ...state,
          pot: tableData.current_pot || 0
        }));
      }

      // Load chat messages
      const { data: chatData } = await supabase
        .from('casino_chat')
        .select('*')
        .eq('table_id', table.id)
        .order('created_at', { ascending: false })
        .limit(50);

      setChatMessages((chatData || []).reverse());

    } catch (error) {
      console.error('Error loading table data:', error);
    }
  }, [table.id, user.id]);

  // ============================================
  // REAL-TIME SUBSCRIPTIONS
  // ============================================
  useEffect(() => {
    loadTableData();

    // Subscribe to table changes
    subscriptionRef.current = supabase
      .channel(`table_${table.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'casino_seats', filter: `table_id=eq.${table.id}` },
        () => loadTableData()
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'casino_tables', filter: `id=eq.${table.id}` },
        (payload) => {
          if (payload.new.game_state) {
            const state = typeof payload.new.game_state === 'string'
              ? JSON.parse(payload.new.game_state)
              : payload.new.game_state;
            setGameState(prev => ({
              ...prev,
              ...state,
              pot: payload.new.current_pot || prev.pot
            }));
          }
        }
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'casino_chat', filter: `table_id=eq.${table.id}` },
        (payload) => {
          setChatMessages(prev => [...prev, payload.new]);
          // Auto-scroll chat
          if (chatRef.current) {
            setTimeout(() => {
              chatRef.current.scrollTop = chatRef.current.scrollHeight;
            }, 100);
          }
        }
      )
      .subscribe();

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [table.id, loadTableData]);

  // ============================================
  // ACTION TIMER
  // ============================================
  useEffect(() => {
    if (gameState.activeSeat === mySeat && gameState.phase !== 'waiting' && gameState.phase !== 'showdown') {
      setActionTimer(POKER_CONFIG.actionTimeout);
      
      timerRef.current = setInterval(() => {
        setActionTimer(prev => {
          if (prev <= 1) {
            // Auto-fold on timeout
            handleAction('fold');
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setActionTimer(null);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [gameState.activeSeat, mySeat, gameState.phase]);

  // ============================================
  // BUY SEAT
  // ============================================
  const handleBuySeat = async () => {
    if (buyInAmount < table.min_buyin || buyInAmount > table.max_buyin) {
      setMessage({ type: 'error', text: `Buy-in must be between $${table.min_buyin} and $${table.max_buyin}` });
      return;
    }

    if (buyInAmount > player.cash) {
      setMessage({ type: 'error', text: 'Not enough cash!' });
      return;
    }

    try {
      // Check if seat is still available
      const { data: existingSeat } = await supabase
        .from('casino_seats')
        .select('id')
        .eq('table_id', table.id)
        .eq('seat_number', selectedSeat)
        .eq('is_active', true)
        .single();

      if (existingSeat) {
        setMessage({ type: 'error', text: 'Seat is no longer available!' });
        setShowBuyInModal(false);
        loadTableData();
        return;
      }

      // Deduct from player cash
      const newCash = player.cash - buyInAmount;
      await supabase
        .from('the_life_players')
        .update({ cash: Math.round(newCash * 100) / 100 })
        .eq('user_id', user.id);

      // Create seat
      const { error: seatError } = await supabase
        .from('casino_seats')
        .insert({
          table_id: table.id,
          seat_number: selectedSeat,
          player_id: player.id,
          player_name: player.se_username || 'Player',
          player_avatar: player.avatar_url,
          chips: buyInAmount,
          is_active: true
        });

      if (seatError) throw seatError;

      setPlayer(prev => ({ ...prev, cash: newCash }));
      setMySeat(selectedSeat);
      setMyBalance(buyInAmount);
      setShowBuyInModal(false);
      setMessage({ type: 'success', text: `Seat purchased! You have $${buyInAmount} at the table.` });

      // Check if we should start the game
      checkGameStart();
    } catch (error) {
      console.error('Error buying seat:', error);
      setMessage({ type: 'error', text: 'Failed to buy seat' });
    }
  };

  // ============================================
  // STAND UP (LEAVE SEAT)
  // ============================================
  const handleStandUp = async () => {
    if (gameState.phase !== 'waiting' && gameState.activeSeat === mySeat) {
      setMessage({ type: 'error', text: 'Cannot leave during your turn!' });
      return;
    }

    try {
      // Return chips to player cash
      if (myBalance > 0) {
        const newCash = player.cash + myBalance;
        await supabase
          .from('the_life_players')
          .update({ cash: Math.round(newCash * 100) / 100 })
          .eq('id', player.id);

        setPlayer(prev => ({ ...prev, cash: newCash }));
      }

      // Remove seat
      await supabase
        .from('casino_seats')
        .delete()
        .eq('table_id', table.id)
        .eq('player_id', player.id);

      setMySeat(null);
      setMyBalance(0);
      setMyCards([]);
      setMessage({ type: 'success', text: `You stood up. $${myBalance} returned to your wallet.` });

    } catch (error) {
      console.error('Error standing up:', error);
      setMessage({ type: 'error', text: 'Failed to leave seat' });
    }
  };

  // ============================================
  // CHECK IF GAME SHOULD START
  // ============================================
  const checkGameStart = async () => {
    const activeSeats = seats.filter(s => s.is_active);
    if (activeSeats.length >= 2 && gameState.phase === 'waiting') {
      // Start game after a delay
      setTimeout(() => startNewHand(), 3000);
    }
  };

  // ============================================
  // START NEW HAND
  // ============================================
  const startNewHand = async () => {
    try {
      // Generate and shuffle deck
      const deck = [];
      for (const suit of CARD_SUITS) {
        for (const value of CARD_VALUES) {
          deck.push({ suit, value });
        }
      }
      shuffleArray(deck);

      // Deal cards to each player
      const activeSeats = seats.filter(s => s.is_active);
      for (const seat of activeSeats) {
        const hand = [deck.pop(), deck.pop()];
        await supabase
          .from('casino_seats')
          .update({ 
            hand_data: JSON.stringify(hand),
            current_bet: 0,
            has_folded: false,
            has_acted: false
          })
          .eq('id', seat.id);
      }

      // Update game state
      const newState = {
        phase: 'preflop',
        pot: table.small_blind + table.big_blind,
        communityCards: [],
        currentBet: table.big_blind,
        dealerSeat: (gameState.dealerSeat + 1) % activeSeats.length,
        activeSeat: (gameState.dealerSeat + 3) % activeSeats.length, // UTG
        deck: JSON.stringify(deck),
        round: gameState.round + 1
      };

      await supabase
        .from('casino_tables')
        .update({ 
          game_state: JSON.stringify(newState),
          current_pot: newState.pot
        })
        .eq('id', table.id);

      // Post blinds
      const sbSeat = activeSeats[(newState.dealerSeat + 1) % activeSeats.length];
      const bbSeat = activeSeats[(newState.dealerSeat + 2) % activeSeats.length];

      await supabase
        .from('casino_seats')
        .update({ 
          chips: sbSeat.chips - table.small_blind,
          current_bet: table.small_blind
        })
        .eq('id', sbSeat.id);

      await supabase
        .from('casino_seats')
        .update({ 
          chips: bbSeat.chips - table.big_blind,
          current_bet: table.big_blind
        })
        .eq('id', bbSeat.id);

    } catch (error) {
      console.error('Error starting hand:', error);
    }
  };

  // ============================================
  // PLAYER ACTIONS
  // ============================================
  const handleAction = async (action, amount = 0) => {
    if (mySeat === null || gameState.activeSeat !== mySeat || isActing) return;

    setIsActing(true);

    try {
      const mySeatData = seats.find(s => s.seat_number === mySeat);
      if (!mySeatData) return;

      let newBalance = myBalance;
      let newPot = gameState.pot;
      let newCurrentBet = gameState.currentBet;

      switch (action) {
        case 'fold':
          await supabase
            .from('casino_seats')
            .update({ has_folded: true, has_acted: true })
            .eq('id', mySeatData.id);
          break;

        case 'check':
          if (mySeatData.current_bet < gameState.currentBet) {
            setMessage({ type: 'error', text: 'Cannot check, you must call or raise!' });
            setIsActing(false);
            return;
          }
          await supabase
            .from('casino_seats')
            .update({ has_acted: true })
            .eq('id', mySeatData.id);
          break;

        case 'call':
          const callAmount = gameState.currentBet - (mySeatData.current_bet || 0);
          if (callAmount > myBalance) {
            setMessage({ type: 'error', text: 'Not enough chips!' });
            setIsActing(false);
            return;
          }
          newBalance = myBalance - callAmount;
          newPot += callAmount;
          await supabase
            .from('casino_seats')
            .update({ 
              balance: newBalance,
              current_bet: gameState.currentBet,
              has_acted: true
            })
            .eq('id', mySeatData.id);
          setMyBalance(newBalance);
          break;

        case 'raise':
          const raiseTotal = amount;
          const raiseAmount = raiseTotal - (mySeatData.current_bet || 0);
          if (raiseAmount > myBalance) {
            setMessage({ type: 'error', text: 'Not enough chips!' });
            setIsActing(false);
            return;
          }
          newBalance = myBalance - raiseAmount;
          newPot += raiseAmount;
          newCurrentBet = raiseTotal;
          await supabase
            .from('casino_seats')
            .update({ 
              balance: newBalance,
              current_bet: raiseTotal,
              has_acted: true
            })
            .eq('id', mySeatData.id);
          setMyBalance(newBalance);
          // Reset other players' has_acted
          await supabase
            .from('casino_seats')
            .update({ has_acted: false })
            .eq('table_id', table.id)
            .neq('id', mySeatData.id)
            .eq('has_folded', false);
          break;

        case 'allin':
          newPot += myBalance;
          const allInBet = (mySeatData.current_bet || 0) + myBalance;
          if (allInBet > newCurrentBet) {
            newCurrentBet = allInBet;
            // Reset other players' has_acted
            await supabase
              .from('casino_seats')
              .update({ has_acted: false })
              .eq('table_id', table.id)
              .neq('id', mySeatData.id)
              .eq('has_folded', false);
          }
          await supabase
            .from('casino_seats')
            .update({ 
              balance: 0,
              current_bet: allInBet,
              has_acted: true,
              is_all_in: true
            })
            .eq('id', mySeatData.id);
          setMyBalance(0);
          break;
      }

      // Move to next player or next phase
      await advanceGame(newPot, newCurrentBet);

      // Send chat message for action
      await supabase
        .from('casino_chat')
        .insert({
          table_id: table.id,
          player_id: player.id,
          player_name: player.se_username || 'Player',
          player_avatar: player.avatar_url,
          message: `${action}${amount > 0 ? ` $${amount}` : ''}`,
          message_type: 'action'
        });

    } catch (error) {
      console.error('Error performing action:', error);
      setMessage({ type: 'error', text: 'Failed to perform action' });
    } finally {
      setIsActing(false);
    }
  };

  // ============================================
  // ADVANCE GAME
  // ============================================
  const advanceGame = async (newPot, newCurrentBet) => {
    const activeSeats = seats.filter(s => s.is_active && !s.has_folded);
    
    // Check if only one player left
    if (activeSeats.length === 1) {
      await handleWinner(activeSeats[0]);
      return;
    }

    // Check if round is complete
    const allActed = activeSeats.every(s => s.has_acted || s.is_all_in);
    const allMatched = activeSeats.every(s => s.current_bet === newCurrentBet || s.is_all_in);

    if (allActed && allMatched) {
      // Move to next phase
      await advancePhase(newPot);
    } else {
      // Move to next player
      const currentIndex = activeSeats.findIndex(s => s.seat_number === gameState.activeSeat);
      const nextIndex = (currentIndex + 1) % activeSeats.length;
      const nextSeat = activeSeats[nextIndex];

      await supabase
        .from('casino_tables')
        .update({
          game_state: JSON.stringify({
            ...gameState,
            activeSeat: nextSeat.seat_number,
            currentBet: newCurrentBet
          }),
          current_pot: newPot
        })
        .eq('id', table.id);
    }
  };

  // ============================================
  // ADVANCE PHASE
  // ============================================
  const advancePhase = async (pot) => {
    const phases = ['preflop', 'flop', 'turn', 'river', 'showdown'];
    const currentPhaseIndex = phases.indexOf(gameState.phase);
    const nextPhase = phases[currentPhaseIndex + 1];

    let deck = gameState.deck ? JSON.parse(gameState.deck) : [];
    let communityCards = [...gameState.communityCards];

    // Deal community cards
    if (nextPhase === 'flop') {
      communityCards = [deck.pop(), deck.pop(), deck.pop()];
    } else if (nextPhase === 'turn' || nextPhase === 'river') {
      communityCards.push(deck.pop());
    }

    // Reset bets for new round
    await supabase
      .from('casino_seats')
      .update({ current_bet: 0, has_acted: false })
      .eq('table_id', table.id)
      .eq('has_folded', false);

    const activeSeats = seats.filter(s => s.is_active && !s.has_folded);
    const firstToAct = activeSeats[(gameState.dealerSeat + 1) % activeSeats.length];

    await supabase
      .from('casino_tables')
      .update({
        game_state: JSON.stringify({
          ...gameState,
          phase: nextPhase,
          communityCards,
          deck: JSON.stringify(deck),
          currentBet: 0,
          activeSeat: nextPhase === 'showdown' ? -1 : firstToAct.seat_number
        }),
        current_pot: pot
      })
      .eq('id', table.id);

    if (nextPhase === 'showdown') {
      await handleShowdown(pot);
    }
  };

  // ============================================
  // HANDLE WINNER
  // ============================================
  const handleWinner = async (winner) => {
    const pot = gameState.pot;
    
    await supabase
      .from('casino_seats')
      .update({ chips: winner.chips + pot })
      .eq('id', winner.id);

    await supabase
      .from('casino_chat')
      .insert({
        table_id: table.id,
        player_name: 'System',
        message: `🏆 ${winner.player_name} wins $${pot}!`,
        message_type: 'system'
      });

    // Reset for new hand after delay
    setTimeout(() => resetForNewHand(), 5000);
  };

  // ============================================
  // HANDLE SHOWDOWN
  // ============================================
  const handleShowdown = async (pot) => {
    // In a real implementation, evaluate hands and determine winner
    // For now, pick random winner from remaining players
    const activeSeats = seats.filter(s => s.is_active && !s.has_folded);
    const winner = activeSeats[Math.floor(Math.random() * activeSeats.length)];
    
    await handleWinner(winner);
  };

  // ============================================
  // RESET FOR NEW HAND
  // ============================================
  const resetForNewHand = async () => {
    await supabase
      .from('casino_seats')
      .update({ 
        hand_data: null,
        current_bet: 0,
        has_folded: false,
        has_acted: false,
        is_all_in: false
      })
      .eq('table_id', table.id);

    await supabase
      .from('casino_tables')
      .update({
        game_state: JSON.stringify({
          phase: 'waiting',
          pot: 0,
          communityCards: [],
          currentBet: 0,
          dealerSeat: gameState.dealerSeat,
          activeSeat: -1,
          round: gameState.round
        }),
        current_pot: 0
      })
      .eq('id', table.id);

    setMyCards([]);

    // Check if enough players to start new hand
    setTimeout(() => checkGameStart(), 3000);
  };

  // ============================================
  // SEND CHAT MESSAGE
  // ============================================
  const handleSendChat = async () => {
    if (!chatInput.trim()) return;

    try {
      await supabase
        .from('casino_chat')
        .insert({
          table_id: table.id,
          player_id: player.id,
          player_name: player.se_username || 'Player',
          player_avatar: player.avatar_url,
          message: chatInput.trim(),
          message_type: 'chat'
        });

      setChatInput('');
    } catch (error) {
      console.error('Error sending chat:', error);
    }
  };

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================
  const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  const renderCard = (card, faceDown = false) => {
    if (faceDown || !card) {
      return <div className="card card-back">🂠</div>;
    }
    const isRed = card.suit === '♥' || card.suit === '♦';
    return (
      <div className={`card ${isRed ? 'red' : 'black'}`}>
        <span className="card-value">{card.value}</span>
        <span className="card-suit">{card.suit}</span>
      </div>
    );
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="poker-table-container">
      {/* Header */}
      <div className="table-header">
        <button className="leave-btn" onClick={onLeave}>← Leave Table</button>
        <div className="table-info">
          <h2>{table.name}</h2>
          <span className="blinds">Blinds: ${table.small_blind}/${table.big_blind}</span>
        </div>
        <div className="my-info">
          {mySeat !== null ? (
            <>
              <span className="my-balance">Table: ${myBalance.toLocaleString()}</span>
              <span className="my-wallet">Wallet: ${player.cash?.toLocaleString()}</span>
            </>
          ) : (
            <span className="spectator-badge">{isSpectator ? '👁 Spectating' : 'Select a seat'}</span>
          )}
        </div>
      </div>

      {/* Table Area */}
      <div className="table-area">
        <div className="poker-table">
          {/* Community Cards */}
          <div className="community-cards">
            {gameState.phase !== 'waiting' && gameState.phase !== 'preflop' && (
              <>
                {gameState.communityCards.map((card, i) => (
                  <div key={i} className="community-card">
                    {renderCard(card)}
                  </div>
                ))}
                {/* Placeholder for unrevealed cards */}
                {Array.from({ length: 5 - gameState.communityCards.length }).map((_, i) => (
                  <div key={`empty-${i}`} className="community-card empty"></div>
                ))}
              </>
            )}
          </div>

          {/* Pot */}
          <div className="pot-display">
            <span className="pot-label">POT</span>
            <span className="pot-amount">${gameState.pot.toLocaleString()}</span>
          </div>

          {/* Seats */}
          {Array.from({ length: table.max_seats }).map((_, seatNum) => {
            const seat = seats.find(s => s.seat_number === seatNum && s.is_active);
            const isMyTurn = gameState.activeSeat === seatNum;
            const isMe = seat?.user_id === user.id;
            const position = getSeatPosition(seatNum, table.max_seats);

            return (
              <div 
                key={seatNum}
                className={`seat ${seat ? 'occupied' : 'empty'} ${isMyTurn ? 'active-turn' : ''} ${isMe ? 'my-seat' : ''} ${seat?.has_folded ? 'folded' : ''}`}
                style={position}
                onClick={() => {
                  if (!seat && !isSpectator && mySeat === null) {
                    setSelectedSeat(seatNum);
                    setBuyInAmount(table.min_buyin);
                    setShowBuyInModal(true);
                  }
                }}
              >
                {seat ? (
                  <>
                    <div className="seat-avatar">
                      <img src={seat.player_avatar || '/default-avatar.png'} alt="" />
                      {seat.seat_number === gameState.dealerSeat && (
                        <span className="dealer-button">D</span>
                      )}
                    </div>
                    <div className="seat-info">
                      <span className="seat-name">{seat.player_name}</span>
                      <span className="seat-balance">${seat.chips?.toLocaleString()}</span>
                    </div>
                    {/* Player's cards */}
                    <div className="seat-cards">
                      {isMe && myCards.length > 0 ? (
                        myCards.map((card, i) => (
                          <div key={i}>{renderCard(card)}</div>
                        ))
                      ) : seat && gameState.phase !== 'waiting' ? (
                        <>
                          {renderCard(null, true)}
                          {renderCard(null, true)}
                        </>
                      ) : null}
                    </div>
                    {/* Current bet */}
                    {seat.current_bet > 0 && (
                      <div className="seat-bet">
                        <span className="bet-chips">${seat.current_bet}</span>
                      </div>
                    )}
                    {/* Timer */}
                    {isMyTurn && isMe && actionTimer !== null && (
                      <div className="action-timer">
                        <div className="timer-bar" style={{ width: `${(actionTimer / POKER_CONFIG.actionTimeout) * 100}%` }}></div>
                        <span>{actionTimer}s</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="empty-seat-content">
                    <span className="seat-number">Seat {seatNum + 1}</span>
                    {!isSpectator && mySeat === null && (
                      <span className="sit-here">Click to sit</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons (only show if seated and it's my turn) */}
      {mySeat !== null && gameState.activeSeat === mySeat && gameState.phase !== 'waiting' && gameState.phase !== 'showdown' && (
        <div className="action-panel">
          <button 
            className="action-btn fold"
            onClick={() => handleAction('fold')}
            disabled={isActing}
          >
            Fold
          </button>
          
          {seats.find(s => s.seat_number === mySeat)?.current_bet >= gameState.currentBet ? (
            <button 
              className="action-btn check"
              onClick={() => handleAction('check')}
              disabled={isActing}
            >
              Check
            </button>
          ) : (
            <button 
              className="action-btn call"
              onClick={() => handleAction('call')}
              disabled={isActing}
            >
              Call ${gameState.currentBet - (seats.find(s => s.seat_number === mySeat)?.current_bet || 0)}
            </button>
          )}

          <div className="raise-controls">
            <input
              type="range"
              min={gameState.currentBet * 2}
              max={myBalance + (seats.find(s => s.seat_number === mySeat)?.current_bet || 0)}
              value={betAmount || gameState.currentBet * 2}
              onChange={(e) => setBetAmount(parseInt(e.target.value))}
            />
            <button 
              className="action-btn raise"
              onClick={() => handleAction('raise', betAmount || gameState.currentBet * 2)}
              disabled={isActing || myBalance < gameState.currentBet * 2}
            >
              Raise ${betAmount || gameState.currentBet * 2}
            </button>
          </div>

          <button 
            className="action-btn allin"
            onClick={() => handleAction('allin')}
            disabled={isActing}
          >
            All-In ${myBalance}
          </button>
        </div>
      )}

      {/* Stand Up Button */}
      {mySeat !== null && (
        <button 
          className="stand-up-btn"
          onClick={handleStandUp}
          disabled={gameState.phase !== 'waiting' && gameState.activeSeat === mySeat}
        >
          Stand Up (Return ${myBalance})
        </button>
      )}

      {/* Chat Panel */}
      <div className="chat-panel">
        <div className="chat-header">
          <h4>Table Chat</h4>
        </div>
        <div className="chat-messages" ref={chatRef}>
          {chatMessages.map((msg, i) => (
            <div key={i} className={`chat-message ${msg.is_system ? 'system' : ''}`}>
              {!msg.is_system && <span className="chat-name">{msg.player_name}:</span>}
              <span className="chat-text">{msg.message}</span>
            </div>
          ))}
        </div>
        {!isSpectator && (
          <div className="chat-input">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendChat()}
              placeholder="Type a message..."
              maxLength={100}
            />
            <button onClick={handleSendChat}>Send</button>
          </div>
        )}
      </div>

      {/* Buy-In Side Panel */}
      <SidePanel
        isOpen={showBuyInModal}
        onClose={() => setShowBuyInModal(false)}
        title={`Buy Seat #${(selectedSeat || 0) + 1}`}
        subtitle="Join the table"
        width="400px"
        footer={
          <PanelButtonGroup>
            <PanelButton variant="secondary" onClick={() => setShowBuyInModal(false)}>
              Cancel
            </PanelButton>
            <PanelButton 
              variant="primary" 
              onClick={handleBuySeat}
              disabled={buyInAmount > player.cash}
            >
              Buy Seat (${buyInAmount})
            </PanelButton>
          </PanelButtonGroup>
        }
      >
        <PanelSection title="Buy-in Range">
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '10px', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
            <span style={{ color: '#8a8d96' }}>Min: <span style={{ color: '#22c55e', fontWeight: '600' }}>${table.min_buyin?.toLocaleString()}</span></span>
            <span style={{ color: '#8a8d96' }}>Max: <span style={{ color: '#22c55e', fontWeight: '600' }}>${table.max_buyin?.toLocaleString()}</span></span>
          </div>
        </PanelSection>

        <PanelSection title="Amount">
          <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0, 0, 0, 0.5)', border: '1px solid rgba(212, 175, 55, 0.3)', borderRadius: '10px', padding: '0 16px', height: '56px' }}>
            <span style={{ color: '#22c55e', fontWeight: '700', fontSize: '1.5rem', marginRight: '4px' }}>$</span>
            <input
              type="number"
              value={buyInAmount}
              onChange={(e) => setBuyInAmount(Math.max(table.min_buyin, Math.min(table.max_buyin, parseInt(e.target.value) || 0)))}
              min={table.min_buyin}
              max={Math.min(table.max_buyin, player.cash)}
              style={{ flex: 1, background: 'transparent', border: 'none', color: '#22c55e', fontSize: '1.5rem', fontWeight: '700', padding: 0 }}
            />
          </div>

          {/* Quick amount buttons */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button
              onClick={() => setBuyInAmount(table.min_buyin)}
              style={{ flex: 1, padding: '10px', background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(212, 175, 55, 0.3)', borderRadius: '8px', color: '#d4af37', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}
            >Min</button>
            <button
              onClick={() => setBuyInAmount(Math.floor((table.min_buyin + Math.min(table.max_buyin, player.cash)) / 2))}
              style={{ flex: 1, padding: '10px', background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(212, 175, 55, 0.3)', borderRadius: '8px', color: '#d4af37', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}
            >Half</button>
            <button
              onClick={() => setBuyInAmount(Math.min(table.max_buyin, player.cash))}
              style={{ flex: 1, padding: '10px', background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(212, 175, 55, 0.3)', borderRadius: '8px', color: '#d4af37', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}
            >Max</button>
          </div>

          {/* Slider */}
          <div style={{ marginTop: '16px' }}>
            <input
              type="range"
              min={table.min_buyin}
              max={Math.min(table.max_buyin, player.cash)}
              value={buyInAmount}
              onChange={(e) => setBuyInAmount(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: '#d4af37' }}
            />
          </div>
        </PanelSection>

        <PanelSection title="Your Balance">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '10px', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
            <span style={{ color: '#8a8d96' }}>Available Cash</span>
            <span style={{ color: '#22c55e', fontWeight: '700', fontSize: '1.1rem' }}>${player.cash?.toLocaleString()}</span>
          </div>
          {buyInAmount > player.cash && (
            <p style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '8px', textAlign: 'center' }}>⚠️ Insufficient funds</p>
          )}
        </PanelSection>
      </SidePanel>
    </div>
  );
}
