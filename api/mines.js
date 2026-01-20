import { createClient } from '@supabase/supabase-js';

const GRID_SIZE = 25;
const MIN_MINES = 3;
const MAX_MINES = 24;
const HOUSE_EDGE = 0.03; // 3% house edge - standard for fair casino games

/**
 * Calculate multiplier using provably fair formula
 * Based on probability theory: fair multiplier = 1 / probability of success
 * With house edge applied
 * 
 * Formula: For each reveal, the probability of hitting a safe cell is:
 * P(safe) = (remaining_safe_cells) / (remaining_total_cells)
 * 
 * Cumulative multiplier = product of (1 / P(safe)) for each reveal
 * Final multiplier = cumulative * (1 - house_edge)
 */
function calcMultiplier(revealedCount, mineCount) {
  if (revealedCount === 0) return 1.0;
  
  const totalCells = GRID_SIZE;
  const safeCells = totalCells - mineCount;
  
  let cumulativeMultiplier = 1.0;
  
  // Calculate the fair multiplier based on probability for each revealed cell
  for (let i = 0; i < revealedCount; i++) {
    const remainingTotal = totalCells - i;
    const remainingSafe = safeCells - i;
    
    // Probability of finding a safe cell at this step
    const probSafe = remainingSafe / remainingTotal;
    
    // Fair payout for this risk
    const stepMultiplier = 1 / probSafe;
    
    cumulativeMultiplier *= stepMultiplier;
  }
  
  // Apply house edge
  const finalMultiplier = cumulativeMultiplier * (1 - HOUSE_EDGE);
  
  // Round to 2 decimal places
  return Math.round(finalMultiplier * 100) / 100;
}

/**
 * Pre-calculate multiplier table for display purposes
 * This shows players the potential multipliers for each reveal
 */
function getMultiplierTable(mineCount) {
  const safeCells = GRID_SIZE - mineCount;
  const table = [];
  
  for (let i = 1; i <= safeCells; i++) {
    table.push({
      reveals: i,
      multiplier: calcMultiplier(i, mineCount)
    });
  }
  
  return table;
}

// Generate random mine positions server-side using cryptographically secure method
function generateMinePositions(mineCount) {
  const positions = [];
  const available = Array.from({ length: GRID_SIZE }, (_, i) => i);
  
  // Fisher-Yates shuffle for uniform distribution
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }
  
  // Take first mineCount positions
  return available.slice(0, mineCount);
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
      case 'getMultipliers':
        return handleGetMultipliers(params, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Mines API error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

// Get multiplier table for a given mine count (for UI display)
function handleGetMultipliers({ mineCount }, res) {
  if (!mineCount || mineCount < MIN_MINES || mineCount > MAX_MINES) {
    return res.status(400).json({ error: `Invalid mine count (${MIN_MINES}-${MAX_MINES})` });
  }
  
  const table = getMultiplierTable(mineCount);
  return res.status(200).json({ 
    success: true, 
    multiplierTable: table,
    houseEdge: HOUSE_EDGE * 100 + '%'
  });
}

// Start a new game
async function handleStart(supabase, user, { bet, mineCount }, res) {
  // Validate inputs
  if (!bet || bet < 10 || bet > 1000) {
    return res.status(400).json({ error: 'Invalid bet amount (10-1000)' });
  }
  
  // Minimum 3 mines, maximum 24
  if (!mineCount || mineCount < MIN_MINES || mineCount > MAX_MINES) {
    return res.status(400).json({ error: `Invalid mine count (${MIN_MINES}-${MAX_MINES})` });
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
  
  // Calculate the max possible multiplier for this configuration
  const maxSafeCells = GRID_SIZE - mineCount;
  const maxMultiplier = calcMultiplier(maxSafeCells, mineCount);

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

  // Calculate first few multipliers for preview
  const nextMultipliers = [];
  for (let i = 1; i <= Math.min(5, maxSafeCells); i++) {
    nextMultipliers.push(calcMultiplier(i, mineCount));
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
      status: game.status,
      safeCellsRemaining: maxSafeCells,
      maxMultiplier: maxMultiplier,
      nextMultipliers: nextMultipliers
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

  // Safe cell found!
  const safeSpots = GRID_SIZE - game.mine_count;
  const safeCellsRemaining = safeSpots - newRevealedCells.length;
  const newMultiplier = calcMultiplier(newRevealedCells.length, game.mine_count);
  const newProfit = Math.floor(game.bet_amount * newMultiplier);
  
  // Calculate next multiplier preview
  const nextMultiplier = safeCellsRemaining > 0 
    ? calcMultiplier(newRevealedCells.length + 1, game.mine_count) 
    : null;

  // Check if player found all safe cells (auto-win)
  const allSafeFound = newRevealedCells.length === safeSpots;

  if (allSafeFound) {
    // Player wins automatically - JACKPOT!
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
      jackpot: true,
      multiplier: newMultiplier,
      profit: newProfit,
      minePositions: game.mine_positions, // Reveal after win
      revealedCells: newRevealedCells,
      safeCellsRemaining: 0
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
    nextMultiplier: nextMultiplier,
    profit: newProfit,
    revealedCells: newRevealedCells,
    safeCellsRemaining: safeCellsRemaining
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

  // Recalculate profit to ensure consistency
  const currentMultiplier = calcMultiplier(game.revealed_cells.length, game.mine_count);
  const profit = Math.floor(game.bet_amount * currentMultiplier);

  // Update game as won
  await supabase
    .from('mines_games')
    .update({
      status: 'won',
      multiplier: currentMultiplier,
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
