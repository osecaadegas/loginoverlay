import { supabase } from '../config/supabaseClient';

/**
 * Games utility functions for StreamElements point integration
 * All betting and payouts use StreamElements points system
 */

const SE_API_BASE = 'https://api.streamelements.com/kappa/v2';

/**
 * Get user's StreamElements connection
 */
export async function getUserSEConnection(userId) {
  const { data, error } = await supabase
    .from('streamelements_connections')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching SE connection:', error);
    return { connection: null, error };
  }

  return { connection: data, error: null };
}

/**
 * Get user's current StreamElements points balance
 */
export async function getSEPointsBalance(seChannelId, seJwtToken, username) {
  try {
    const response = await fetch(
      `${SE_API_BASE}/points/${seChannelId}/${username}`,
      {
        headers: {
          'Authorization': `Bearer ${seJwtToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch points balance');
    }

    const data = await response.json();
    return { points: data.points || 0, error: null };
  } catch (error) {
    console.error('Error fetching SE points:', error);
    return { points: 0, error };
  }
}

/**
 * Deduct points for a bet (when game starts)
 */
export async function deductBetPoints(seChannelId, seJwtToken, username, betAmount) {
  try {
    const response = await fetch(
      `${SE_API_BASE}/points/${seChannelId}/${username}/${-betAmount}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${seJwtToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to deduct bet points');
    }

    const data = await response.json();
    return { newBalance: data.newAmount, error: null };
  } catch (error) {
    console.error('Error deducting bet points:', error);
    return { newBalance: 0, error };
  }
}

/**
 * Add points for a win (when game completes)
 */
export async function addWinPoints(seChannelId, seJwtToken, username, winAmount) {
  try {
    const response = await fetch(
      `${SE_API_BASE}/points/${seChannelId}/${username}/${winAmount}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${seJwtToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to add win points');
    }

    const data = await response.json();
    return { newBalance: data.newAmount, error: null };
  } catch (error) {
    console.error('Error adding win points:', error);
    return { newBalance: 0, error };
  }
}

/**
 * Record a game session in the database
 */
export async function recordGameSession(userId, seChannelId, gameData) {
  const { data, error } = await supabase
    .from('game_sessions')
    .insert({
      user_id: userId,
      se_channel_id: seChannelId,
      game_type: gameData.gameType,
      bet_amount: gameData.betAmount,
      result: gameData.result,
      payout: gameData.payout,
      multiplier: gameData.multiplier,
      points_before: gameData.pointsBefore,
      points_after: gameData.pointsAfter,
      session_data: gameData.sessionData || {}
    })
    .select()
    .single();

  if (error) {
    console.error('Error recording game session:', error);
    return { session: null, error };
  }

  return { session: data, error: null };
}

/**
 * Get user's game statistics
 */
export async function getUserGameStats(userId, gameType = null) {
  let query = supabase
    .from('game_stats')
    .select('*')
    .eq('user_id', userId);

  if (gameType) {
    query = query.eq('game_type', gameType);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching game stats:', error);
    return { stats: null, error };
  }

  return { stats: gameType ? data[0] : data, error: null };
}

/**
 * Get leaderboard
 */
export async function getLeaderboard(limit = 10) {
  const { data, error } = await supabase
    .from('game_leaderboard')
    .select(`
      *,
      user:user_id (
        email,
        user_metadata
      )
    `)
    .order('rank', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error fetching leaderboard:', error);
    return { leaderboard: [], error };
  }

  return { leaderboard: data, error: null };
}

/**
 * Play a game - complete workflow
 * 1. Check SE connection
 * 2. Check sufficient points
 * 3. Deduct bet
 * 4. Play game logic
 * 5. Add payout if win
 * 6. Record session
 */
export async function playGame(userId, gameType, betAmount, gameLogicFn) {
  // 1. Get SE connection
  const { connection, error: connError } = await getUserSEConnection(userId);
  if (connError || !connection) {
    return { success: false, error: 'Not connected to StreamElements' };
  }

  // 2. Check current balance
  const { points: currentPoints, error: balanceError } = await getSEPointsBalance(
    connection.se_channel_id,
    connection.se_jwt_token,
    connection.se_username
  );

  if (balanceError || currentPoints < betAmount) {
    return { success: false, error: 'Insufficient points' };
  }

  // 3. Deduct bet
  const { newBalance: balanceAfterBet, error: deductError } = await deductBetPoints(
    connection.se_channel_id,
    connection.se_jwt_token,
    connection.se_username,
    betAmount
  );

  if (deductError) {
    return { success: false, error: 'Failed to place bet' };
  }

  // 4. Execute game logic
  const gameResult = gameLogicFn(betAmount);

  // 5. Add payout if win
  let finalBalance = balanceAfterBet;
  if (gameResult.payout > 0) {
    const { newBalance: balanceAfterWin, error: winError } = await addWinPoints(
      connection.se_channel_id,
      connection.se_jwt_token,
      connection.se_username,
      gameResult.payout
    );

    if (winError) {
      console.error('Error adding win points:', winError);
    } else {
      finalBalance = balanceAfterWin;
    }
  }

  // 6. Record session
  await recordGameSession(userId, connection.se_channel_id, {
    gameType,
    betAmount,
    result: gameResult.result,
    payout: gameResult.payout,
    multiplier: gameResult.multiplier,
    pointsBefore: currentPoints,
    pointsAfter: finalBalance,
    sessionData: gameResult.data
  });

  return {
    success: true,
    result: gameResult,
    pointsBefore: currentPoints,
    pointsAfter: finalBalance
  };
}

/**
 * Example game logic functions
 */
export const gameLogic = {
  coinflip: (betAmount, choice) => {
    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    const isWin = result === choice;
    return {
      result,
      payout: isWin ? betAmount * 2 : 0,
      multiplier: isWin ? 2 : 0,
      data: { choice, outcome: result, won: isWin }
    };
  },

  dice: (betAmount, prediction) => {
    const roll = Math.floor(Math.random() * 6) + 1;
    const isWin = roll === prediction;
    return {
      result: roll.toString(),
      payout: isWin ? betAmount * 6 : 0,
      multiplier: isWin ? 6 : 0,
      data: { prediction, roll, won: isWin }
    };
  },

  roulette: (betAmount, betType, betValue) => {
    const number = Math.floor(Math.random() * 37); // 0-36
    let isWin = false;
    let multiplier = 0;

    if (betType === 'number' && number === betValue) {
      isWin = true;
      multiplier = 35;
    } else if (betType === 'color') {
      const redNumbers = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
      const color = number === 0 ? 'green' : (redNumbers.includes(number) ? 'red' : 'black');
      if (color === betValue) {
        isWin = true;
        multiplier = 2;
      }
    } else if (betType === 'even-odd') {
      if (number !== 0 && ((number % 2 === 0 && betValue === 'even') || (number % 2 === 1 && betValue === 'odd'))) {
        isWin = true;
        multiplier = 2;
      }
    }

    return {
      result: number.toString(),
      payout: isWin ? betAmount * multiplier : 0,
      multiplier,
      data: { betType, betValue, number, won: isWin }
    };
  },

  slots: (betAmount) => {
    const symbols = ['🍒', '🍋', '🍊', '🍇', '💎', '7️⃣'];
    const reel1 = symbols[Math.floor(Math.random() * symbols.length)];
    const reel2 = symbols[Math.floor(Math.random() * symbols.length)];
    const reel3 = symbols[Math.floor(Math.random() * symbols.length)];

    let multiplier = 0;
    if (reel1 === reel2 && reel2 === reel3) {
      multiplier = reel1 === '7️⃣' ? 10 : (reel1 === '💎' ? 7 : 5);
    } else if (reel1 === reel2 || reel2 === reel3) {
      multiplier = 2;
    }

    return {
      result: `${reel1}${reel2}${reel3}`,
      payout: multiplier > 0 ? betAmount * multiplier : 0,
      multiplier,
      data: { reels: [reel1, reel2, reel3], won: multiplier > 0 }
    };
  }
};
