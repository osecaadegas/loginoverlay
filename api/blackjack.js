import { createClient } from '@supabase/supabase-js';

const CARD_VALUES = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 10, 'Q': 10, 'K': 10, 'A': 11
};
const SUITS = ['♥', '♦', '♣', '♠'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// Create and shuffle a deck server-side
function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, value: CARD_VALUES[rank] });
    }
  }
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// Calculate hand value
function calculateHandValue(hand) {
  let value = 0;
  let aces = 0;

  for (const card of hand) {
    if (card.rank === 'A') {
      aces++;
      value += 11;
    } else {
      value += card.value;
    }
  }

  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }

  return value;
}

// Deal a card from the deck
function dealCard(deck) {
  const card = deck[0];
  const remainingDeck = deck.slice(1);
  return { card, remainingDeck };
}

// Get card color
function getCardColor(suit) {
  return suit === '♥' || suit === '♦' ? 'red' : 'black';
}

// Format hand for client (with color info)
function formatHand(hand) {
  return hand.map(card => ({
    ...card,
    color: getCardColor(card.suit)
  }));
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    );

    // Get user from auth header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { action, ...params } = req.body;

    switch (action) {
      case 'deal':
        return await handleDeal(supabase, user, params, res);
      case 'hit':
        return await handleHit(supabase, user, params, res);
      case 'stand':
        return await handleStand(supabase, user, params, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Blackjack API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Deal initial cards
async function handleDeal(supabase, user, { bet, perfectPairsBet = 0, twentyOnePlusThreeBet = 0 }, res) {
  // Validate bet
  if (!bet || bet < 10 || bet > 200) {
    return res.status(400).json({ error: 'Invalid bet amount (10-200)' });
  }
  if (perfectPairsBet < 0 || perfectPairsBet > 10) {
    return res.status(400).json({ error: 'Invalid Perfect Pairs bet (0-10)' });
  }
  if (twentyOnePlusThreeBet < 0 || twentyOnePlusThreeBet > 10) {
    return res.status(400).json({ error: 'Invalid 21+3 bet (0-10)' });
  }

  // Check for existing active game
  const { data: existingGame } = await supabase
    .from('blackjack_games')
    .select('id')
    .eq('user_id', user.id)
    .in('status', ['playing', 'dealer_turn'])
    .single();

  if (existingGame) {
    return res.status(400).json({ error: 'You already have an active game', gameId: existingGame.id });
  }

  // Create deck and deal initial cards
  let deck = createDeck();
  
  const { card: playerCard1, remainingDeck: deck1 } = dealCard(deck);
  const { card: dealerCard1, remainingDeck: deck2 } = dealCard(deck1);
  const { card: playerCard2, remainingDeck: deck3 } = dealCard(deck2);
  const { card: dealerCard2, remainingDeck: deck4 } = dealCard(deck3);

  const playerHand = [playerCard1, playerCard2];
  const dealerHand = [dealerCard1, dealerCard2];
  const playerValue = calculateHandValue(playerHand);
  const dealerValue = calculateHandValue(dealerHand);

  // Check for player blackjack
  const playerBlackjack = playerValue === 21;
  const dealerBlackjack = dealerValue === 21;

  let status = 'playing';
  let result = null;
  let resultAmount = 0;
  let dealerRevealed = false;

  if (playerBlackjack || dealerBlackjack) {
    status = 'finished';
    dealerRevealed = true;

    if (playerBlackjack && dealerBlackjack) {
      result = 'push';
      resultAmount = bet; // Return bet
    } else if (playerBlackjack) {
      result = 'blackjack';
      resultAmount = Math.floor(bet * 2.5); // 3:2 payout
    } else {
      result = 'dealer_win';
      resultAmount = 0;
    }
  }

  // Create the game
  const { data: game, error: gameError } = await supabase
    .from('blackjack_games')
    .insert({
      user_id: user.id,
      bet_amount: bet,
      perfect_pairs_bet: perfectPairsBet,
      twenty_one_three_bet: twentyOnePlusThreeBet,
      deck: deck4,
      player_hand: playerHand,
      dealer_hand: dealerHand,
      status,
      result,
      result_amount: resultAmount,
      dealer_revealed: dealerRevealed,
      ended_at: status === 'finished' ? new Date().toISOString() : null
    })
    .select('id, bet_amount, status, result, result_amount, dealer_revealed')
    .single();

  if (gameError) {
    console.error('Create game error:', gameError);
    return res.status(500).json({ error: 'Failed to create game' });
  }

  // Return game state (hide dealer's second card if game continues)
  return res.status(200).json({
    success: true,
    game: {
      id: game.id,
      bet: game.bet_amount,
      status: game.status,
      result: game.result,
      resultAmount: game.result_amount,
      playerHand: formatHand(playerHand),
      playerValue,
      // Only show first dealer card unless game is over
      dealerHand: dealerRevealed 
        ? formatHand(dealerHand)
        : [{ ...formatHand([dealerCard1])[0] }, { hidden: true }],
      dealerValue: dealerRevealed ? dealerValue : null
    }
  });
}

// Player hits
async function handleHit(supabase, user, { gameId }, res) {
  // Get the active game
  const { data: game, error: gameError } = await supabase
    .from('blackjack_games')
    .select('*')
    .eq('id', gameId)
    .eq('user_id', user.id)
    .eq('status', 'playing')
    .single();

  if (gameError || !game) {
    return res.status(404).json({ error: 'Active game not found' });
  }

  let deck = game.deck;
  let playerHand = game.player_hand;

  // Deal a card to player
  const { card, remainingDeck } = dealCard(deck);
  playerHand = [...playerHand, card];
  const playerValue = calculateHandValue(playerHand);

  let status = 'playing';
  let result = null;
  let resultAmount = 0;
  let dealerRevealed = false;

  if (playerValue > 21) {
    // Player busts
    status = 'finished';
    result = 'bust';
    resultAmount = 0;
    dealerRevealed = true;
  } else if (playerValue === 21) {
    // Auto-stand on 21
    return await processDealerTurn(supabase, gameId, remainingDeck, playerHand, game.dealer_hand, game.bet_amount, res);
  }

  // Update game state
  await supabase
    .from('blackjack_games')
    .update({
      deck: remainingDeck,
      player_hand: playerHand,
      status,
      result,
      result_amount: resultAmount,
      dealer_revealed: dealerRevealed,
      ended_at: status === 'finished' ? new Date().toISOString() : null
    })
    .eq('id', gameId);

  return res.status(200).json({
    success: true,
    game: {
      id: gameId,
      status,
      result,
      resultAmount,
      playerHand: formatHand(playerHand),
      playerValue,
      dealerHand: dealerRevealed 
        ? formatHand(game.dealer_hand)
        : [{ ...formatHand([game.dealer_hand[0]])[0] }, { hidden: true }],
      dealerValue: dealerRevealed ? calculateHandValue(game.dealer_hand) : null
    }
  });
}

// Player stands
async function handleStand(supabase, user, { gameId }, res) {
  // Get the active game
  const { data: game, error: gameError } = await supabase
    .from('blackjack_games')
    .select('*')
    .eq('id', gameId)
    .eq('user_id', user.id)
    .eq('status', 'playing')
    .single();

  if (gameError || !game) {
    return res.status(404).json({ error: 'Active game not found' });
  }

  return await processDealerTurn(supabase, gameId, game.deck, game.player_hand, game.dealer_hand, game.bet_amount, res);
}

// Process dealer's turn
async function processDealerTurn(supabase, gameId, deck, playerHand, dealerHand, bet, res) {
  let currentDeck = [...deck];
  let currentDealerHand = [...dealerHand];
  let dealerValue = calculateHandValue(currentDealerHand);
  
  // Dealer draws until 17 or higher
  while (dealerValue < 17) {
    const { card, remainingDeck } = dealCard(currentDeck);
    currentDealerHand = [...currentDealerHand, card];
    currentDeck = remainingDeck;
    dealerValue = calculateHandValue(currentDealerHand);
  }

  const playerValue = calculateHandValue(playerHand);
  let result;
  let resultAmount;

  if (dealerValue > 21) {
    result = 'player_win';
    resultAmount = bet * 2; // Original bet + winnings
  } else if (playerValue > dealerValue) {
    result = 'player_win';
    resultAmount = bet * 2;
  } else if (playerValue === dealerValue) {
    result = 'push';
    resultAmount = bet; // Return original bet
  } else {
    result = 'dealer_win';
    resultAmount = 0;
  }

  // Update game
  await supabase
    .from('blackjack_games')
    .update({
      deck: currentDeck,
      dealer_hand: currentDealerHand,
      status: 'finished',
      result,
      result_amount: resultAmount,
      dealer_revealed: true,
      ended_at: new Date().toISOString()
    })
    .eq('id', gameId);

  return res.status(200).json({
    success: true,
    game: {
      id: gameId,
      status: 'finished',
      result,
      resultAmount,
      playerHand: formatHand(playerHand),
      playerValue,
      dealerHand: formatHand(currentDealerHand),
      dealerValue
    }
  });
}
