import { createClient } from '@supabase/supabase-js';

const GRID_SIZE = 25;

// Calculate multiplier based on revealed cells and mine count
function calcMultiplier(revealedCount, mineCount) {
  if (revealedCount === 0) return 1.0;
  // Simple exponential multiplier
  return Math.pow(1.15, revealedCount);
}

// Generate random mine positions server-side
function generateMinePositions(mineCount) {
  const positions = [];
  while (positions.length < mineCount) {
    const pos = Math.floor(Math.random() * GRID_SIZE);
    if (!positions.includes(pos)) {
      positions.push(pos);
    }
  }
  return positions;
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
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
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
      case 'start':
        return await handleStart(supabase, user, params, res);
      case 'reveal':
        return await handleReveal(supabase, user, params, res);
      case 'cashout':
        return await handleCashout(supabase, user, params, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Mines API error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

// Start a new game
async function handleStart(supabase, user, { bet, mineCount }, res) {
  // Validate inputs
  if (!bet || bet < 10 || bet > 1000) {
    return res.status(400).json({ error: 'Invalid bet amount (10-1000)' });
  }
  if (!mineCount || mineCount < 1 || mineCount > 24) {
    return res.status(400).json({ error: 'Invalid mine count (1-24)' });
  }

  // Check for existing active game
  const { data: existingGame } = await supabase
    .from('mines_games')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  if (existingGame) {
    return res.status(400).json({ error: 'You already have an active game', gameId: existingGame.id });
  }

  // Generate mine positions SERVER-SIDE (never sent to client)
  const minePositions = generateMinePositions(mineCount);

  // Create the game
  const { data: game, error: gameError } = await supabase
    .from('mines_games')
    .insert({
      user_id: user.id,
      bet_amount: bet,
      mine_count: mineCount,
      mine_positions: minePositions,
      revealed_cells: [],
      multiplier: 1.0,
      status: 'active'
    })
    .select('id, bet_amount, mine_count, multiplier, status')
    .single();

  if (gameError) {
    console.error('Create game error:', gameError);
    return res.status(500).json({ error: 'Failed to create game' });
  }

  // Return game info WITHOUT mine positions
  return res.status(200).json({
    success: true,
    game: {
      id: game.id,
      bet: game.bet_amount,
      mineCount: game.mine_count,
      multiplier: game.multiplier,
      revealedCells: [],
      status: game.status
    }
  });
}

// Reveal a cell
async function handleReveal(supabase, user, { gameId, cellIndex }, res) {
  if (cellIndex === undefined || cellIndex < 0 || cellIndex >= GRID_SIZE) {
    return res.status(400).json({ error: 'Invalid cell index' });
  }

  // Get the active game (including mine positions for server-side check)
  const { data: game, error: gameError } = await supabase
    .from('mines_games')
    .select('*')
    .eq('id', gameId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  if (gameError || !game) {
    return res.status(404).json({ error: 'Active game not found' });
  }

  // Check if cell already revealed
  if (game.revealed_cells.includes(cellIndex)) {
    return res.status(400).json({ error: 'Cell already revealed' });
  }

  const newRevealedCells = [...game.revealed_cells, cellIndex];
  const isMine = game.mine_positions.includes(cellIndex);

  if (isMine) {
    // Player hit a mine - GAME OVER
    await supabase
      .from('mines_games')
      .update({
        revealed_cells: newRevealedCells,
        status: 'lost',
        result_amount: 0,
        ended_at: new Date().toISOString()
      })
      .eq('id', gameId);

    // Return game over with all mine positions revealed
    return res.status(200).json({
      success: true,
      result: 'mine',
      gameOver: true,
      won: false,
      minePositions: game.mine_positions, // Only reveal positions after game ends
      revealedCells: newRevealedCells
    });
  }

  // Safe cell
  const safeSpots = GRID_SIZE - game.mine_count;
  const newMultiplier = calcMultiplier(newRevealedCells.length, game.mine_count);
  const newProfit = Math.floor(game.bet_amount * newMultiplier);

  // Check if player found all safe cells (auto-win)
  const allSafeFound = newRevealedCells.length === safeSpots;

  if (allSafeFound) {
    // Player wins automatically
    await supabase
      .from('mines_games')
      .update({
        revealed_cells: newRevealedCells,
        multiplier: newMultiplier,
        status: 'won',
        result_amount: newProfit,
        ended_at: new Date().toISOString()
      })
      .eq('id', gameId);

    return res.status(200).json({
      success: true,
      result: 'safe',
      gameOver: true,
      won: true,
      multiplier: newMultiplier,
      profit: newProfit,
      minePositions: game.mine_positions, // Reveal after win
      revealedCells: newRevealedCells
    });
  }

  // Game continues
  await supabase
    .from('mines_games')
    .update({
      revealed_cells: newRevealedCells,
      multiplier: newMultiplier
    })
    .eq('id', gameId);

  return res.status(200).json({
    success: true,
    result: 'safe',
    gameOver: false,
    multiplier: newMultiplier,
    profit: newProfit,
    revealedCells: newRevealedCells
    // NOTE: minePositions NOT sent while game is active
  });
}

// Cash out current winnings
async function handleCashout(supabase, user, { gameId }, res) {
  // Get the active game
  const { data: game, error: gameError } = await supabase
    .from('mines_games')
    .select('*')
    .eq('id', gameId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  if (gameError || !game) {
    return res.status(404).json({ error: 'Active game not found' });
  }

  if (game.revealed_cells.length === 0) {
    return res.status(400).json({ error: 'Must reveal at least one cell before cashing out' });
  }

  const profit = Math.floor(game.bet_amount * game.multiplier);

  // Update game as won
  await supabase
    .from('mines_games')
    .update({
      status: 'won',
      result_amount: profit,
      ended_at: new Date().toISOString()
    })
    .eq('id', gameId);

  return res.status(200).json({
    success: true,
    won: true,
    profit: profit,
    multiplier: game.multiplier,
    minePositions: game.mine_positions, // Reveal after cashout
    revealedCells: game.revealed_cells
  });
}
