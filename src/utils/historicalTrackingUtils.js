/**
 * Historical Tracking Calculation Utilities
 * Production-grade stat calculations for slots, bonuses, and tournaments
 */

// ============================================================================
// SLOT HISTORY CALCULATIONS
// ============================================================================

export const calculateSlotStats = (plays) => {
  if (!plays || plays.length === 0) {
    return {
      totalPlays: 0,
      totalWins: 0,
      totalWagered: 0,
      totalWon: 0,
      totalProfitLoss: 0,
      biggestWin: 0,
      bestMultiplier: 0,
      averagePayout: 0,
      winRate: 0,
      rtp: 0
    };
  }

  const totalPlays = plays.length;
  const totalWins = plays.filter(p => p.win_amount > 0).length;
  const totalWagered = plays.reduce((sum, p) => sum + (p.bet_amount || 0), 0);
  const totalWon = plays.reduce((sum, p) => sum + (p.win_amount || 0), 0);
  const totalProfitLoss = totalWon - totalWagered;
  
  const biggestWin = Math.max(...plays.map(p => p.win_amount || 0));
  const bestMultiplier = Math.max(...plays.map(p => p.multiplier || 0));
  
  const averagePayout = totalPlays > 0 ? totalWon / totalPlays : 0;
  const winRate = totalPlays > 0 ? (totalWins / totalPlays) * 100 : 0;
  const rtp = totalWagered > 0 ? (totalWon / totalWagered) * 100 : 0;

  return {
    totalPlays,
    totalWins,
    totalWagered: parseFloat(totalWagered.toFixed(2)),
    totalWon: parseFloat(totalWon.toFixed(2)),
    totalProfitLoss: parseFloat(totalProfitLoss.toFixed(2)),
    biggestWin: parseFloat(biggestWin.toFixed(2)),
    bestMultiplier: parseFloat(bestMultiplier.toFixed(2)),
    averagePayout: parseFloat(averagePayout.toFixed(2)),
    winRate: parseFloat(winRate.toFixed(2)),
    rtp: parseFloat(rtp.toFixed(2))
  };
};

export const updateSlotHistory = async (supabase, userId, slotData) => {
  const { slot_name, provider, image_url, bet_amount, win_amount, multiplier } = slotData;

  // Call the database function that handles all logic
  const { error } = await supabase.rpc('update_slot_stats', {
    p_user_id: userId,
    p_slot_name: slot_name,
    p_provider: provider || 'Unknown',
    p_image_url: image_url || '',
    p_bet_amount: bet_amount,
    p_win_amount: win_amount,
    p_multiplier: multiplier || (win_amount / bet_amount)
  });

  if (error) {
    console.error('Error updating slot stats:', error);
    throw error;
  }

  return true;
};

// ============================================================================
// BONUS HUNT CALCULATIONS
// ============================================================================

export const calculateBonusHuntStats = (bonuses) => {
  if (!bonuses || bonuses.length === 0) {
    return {
      totalBonuses: 0,
      totalBet: 0,
      totalCost: 0,
      totalWon: 0,
      totalProfitLoss: 0,
      averageBetSize: 0,
      averageBonusCost: 0,
      averageBonusWin: 0,
      averageMultiplier: 0,
      bestBonusPayout: 0,
      bestBonusMultiplier: 0,
      bestBonusSlot: null,
      winRate: 0,
      breakevenRate: 0,
      requiredMultiplier: 0,
      requiredAverage: 0
    };
  }

  const totalBonuses = bonuses.length;
  const totalBet = bonuses.reduce((sum, b) => sum + (b.bet_size || 0), 0);
  const totalCost = bonuses.reduce((sum, b) => sum + (b.bonus_cost || 0), 0);
  const totalWon = bonuses.reduce((sum, b) => sum + (b.bonus_win || 0), 0);
  const totalProfitLoss = totalWon - totalCost;

  const averageBetSize = totalBonuses > 0 ? totalBet / totalBonuses : 0;
  const averageBonusCost = totalBonuses > 0 ? totalCost / totalBonuses : 0;
  const averageBonusWin = totalBonuses > 0 ? totalWon / totalBonuses : 0;
  
  const totalMultiplier = bonuses.reduce((sum, b) => sum + (b.bonus_multiplier || 0), 0);
  const averageMultiplier = totalBonuses > 0 ? totalMultiplier / totalBonuses : 0;

  const bestBonus = bonuses.reduce((best, b) => 
    (b.bonus_win || 0) > (best.bonus_win || 0) ? b : best, 
    bonuses[0]
  );
  const bestBonusPayout = bestBonus?.bonus_win || 0;
  const bestBonusMultiplier = Math.max(...bonuses.map(b => b.bonus_multiplier || 0));
  const bestBonusSlot = bestBonus?.slot_name || null;

  const wins = bonuses.filter(b => b.is_win || (b.bonus_win > 0)).length;
  const breakevens = bonuses.filter(b => (b.profit_loss || 0) >= 0).length;
  
  const winRate = totalBonuses > 0 ? (wins / totalBonuses) * 100 : 0;
  const breakevenRate = totalBonuses > 0 ? (breakevens / totalBonuses) * 100 : 0;

  const requiredMultiplier = averageBetSize > 0 ? totalCost / averageBetSize : 0;
  const requiredAverage = totalBonuses > 0 ? totalCost / totalBonuses : 0;

  return {
    totalBonuses,
    totalBet: parseFloat(totalBet.toFixed(2)),
    totalCost: parseFloat(totalCost.toFixed(2)),
    totalWon: parseFloat(totalWon.toFixed(2)),
    totalProfitLoss: parseFloat(totalProfitLoss.toFixed(2)),
    averageBetSize: parseFloat(averageBetSize.toFixed(2)),
    averageBonusCost: parseFloat(averageBonusCost.toFixed(2)),
    averageBonusWin: parseFloat(averageBonusWin.toFixed(2)),
    averageMultiplier: parseFloat(averageMultiplier.toFixed(2)),
    bestBonusPayout: parseFloat(bestBonusPayout.toFixed(2)),
    bestBonusMultiplier: parseFloat(bestBonusMultiplier.toFixed(2)),
    bestBonusSlot,
    winRate: parseFloat(winRate.toFixed(2)),
    breakevenRate: parseFloat(breakevenRate.toFixed(2)),
    requiredMultiplier: parseFloat(requiredMultiplier.toFixed(2)),
    requiredAverage: parseFloat(requiredAverage.toFixed(2))
  };
};

export const addBonusToHistory = async (supabase, userId, bonusData) => {
  const profitLoss = (bonusData.bonus_win || 0) - (bonusData.bonus_cost || 0);
  const isWin = bonusData.bonus_win > 0;
  const multiplier = bonusData.bonus_multiplier || 
    (bonusData.bet_size > 0 ? bonusData.bonus_win / bonusData.bet_size : 0);

  const { data, error } = await supabase
    .from('bonus_hunt_history')
    .insert([{
      user_id: userId,
      hunt_name: bonusData.hunt_name || `Hunt ${new Date().toLocaleDateString()}`,
      slot_name: bonusData.slot_name,
      provider: bonusData.provider || 'Unknown',
      bet_size: bonusData.bet_size,
      bonus_cost: bonusData.bonus_cost,
      bonus_win: bonusData.bonus_win || 0,
      bonus_multiplier: multiplier,
      is_win: isWin,
      profit_loss: profitLoss,
      notes: bonusData.notes || '',
      video_url: bonusData.video_url || ''
    }])
    .select()
    .single();

  if (error) {
    console.error('Error adding bonus to history:', error);
    throw error;
  }

  // Stats are auto-recalculated by trigger
  return data;
};

export const updateBonusInHistory = async (supabase, bonusId, updates) => {
  // Recalculate derived fields
  if (updates.bonus_win !== undefined || updates.bonus_cost !== undefined || updates.bet_size !== undefined) {
    const bonus_win = updates.bonus_win ?? 0;
    const bonus_cost = updates.bonus_cost ?? 0;
    const bet_size = updates.bet_size ?? 0;
    
    updates.profit_loss = bonus_win - bonus_cost;
    updates.is_win = bonus_win > 0;
    updates.bonus_multiplier = bet_size > 0 ? bonus_win / bet_size : 0;
  }

  const { data, error } = await supabase
    .from('bonus_hunt_history')
    .update(updates)
    .eq('id', bonusId)
    .select()
    .single();

  if (error) {
    console.error('Error updating bonus:', error);
    throw error;
  }

  return data;
};

// ============================================================================
// TOURNAMENT CALCULATIONS
// ============================================================================

export const calculateTournamentStats = (tournament, rounds) => {
  if (!rounds || rounds.length === 0) {
    return {
      totalRounds: 0,
      roundsWon: 0,
      totalScore: 0,
      averageScorePerRound: 0,
      bestRoundScore: 0,
      bestRoundSlot: null,
      netProfit: 0,
      roi: 0
    };
  }

  const totalRounds = rounds.length;
  const roundsWon = rounds.filter(r => r.is_winner).length;
  const totalScore = rounds.reduce((sum, r) => sum + (r.score || 0), 0);
  const averageScorePerRound = totalRounds > 0 ? totalScore / totalRounds : 0;

  const bestRound = rounds.reduce((best, r) => 
    (r.score || 0) > (best.score || 0) ? r : best,
    rounds[0]
  );
  const bestRoundScore = bestRound?.score || 0;
  const bestRoundSlot = bestRound?.slot_name || null;

  const entryFee = tournament?.entry_fee || 0;
  const prizeWon = tournament?.prize_won || 0;
  const netProfit = prizeWon - entryFee;
  const roi = entryFee > 0 ? (netProfit / entryFee) * 100 : 0;

  return {
    totalRounds,
    roundsWon,
    totalScore: parseFloat(totalScore.toFixed(2)),
    averageScorePerRound: parseFloat(averageScorePerRound.toFixed(2)),
    bestRoundScore: parseFloat(bestRoundScore.toFixed(2)),
    bestRoundSlot,
    netProfit: parseFloat(netProfit.toFixed(2)),
    roi: parseFloat(roi.toFixed(2))
  };
};

export const createTournament = async (supabase, userId, tournamentData) => {
  const { data, error } = await supabase
    .from('tournament_history')
    .insert([{
      user_id: userId,
      tournament_name: tournamentData.tournament_name,
      entry_fee: tournamentData.entry_fee || 0,
      prize_pool: tournamentData.prize_pool || 0,
      status: 'active'
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating tournament:', error);
    throw error;
  }

  return data;
};

export const addTournamentRound = async (supabase, tournamentId, roundData) => {
  const { data, error } = await supabase
    .from('tournament_rounds')
    .insert([{
      tournament_id: tournamentId,
      round_number: roundData.round_number,
      slot_name: roundData.slot_name,
      bet_size: roundData.bet_size,
      score: roundData.score || 0,
      multiplier: roundData.multiplier || 0,
      is_winner: roundData.is_winner || false
    }])
    .select()
    .single();

  if (error) {
    console.error('Error adding tournament round:', error);
    throw error;
  }

  return data;
};

export const completeTournament = async (supabase, tournamentId, finalData) => {
  // Get all rounds to calculate stats
  const { data: rounds } = await supabase
    .from('tournament_rounds')
    .select('*')
    .eq('tournament_id', tournamentId);

  const stats = calculateTournamentStats({ 
    entry_fee: finalData.entry_fee, 
    prize_won: finalData.prize_won 
  }, rounds);

  const { data, error } = await supabase
    .from('tournament_history')
    .update({
      total_rounds: stats.totalRounds,
      rounds_won: stats.roundsWon,
      total_score: stats.totalScore,
      average_score_per_round: stats.averageScorePerRound,
      best_round_score: stats.bestRoundScore,
      best_round_slot: stats.bestRoundSlot,
      final_placement: finalData.final_placement,
      prize_won: finalData.prize_won || 0,
      net_profit: stats.netProfit,
      roi: stats.roi,
      status: 'completed',
      completed_at: new Date().toISOString()
    })
    .eq('id', tournamentId)
    .select()
    .single();

  if (error) {
    console.error('Error completing tournament:', error);
    throw error;
  }

  return data;
};

// ============================================================================
// DAILY SESSION TRACKING
// ============================================================================

export const updateDailySession = async (supabase, userId, sessionData) => {
  const sessionDate = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('daily_sessions')
    .upsert({
      user_id: userId,
      session_date: sessionDate,
      total_wagered: sessionData.total_wagered || 0,
      total_won: sessionData.total_won || 0,
      total_profit_loss: (sessionData.total_won || 0) - (sessionData.total_wagered || 0),
      total_spins: sessionData.total_spins || 0,
      total_bonuses: sessionData.total_bonuses || 0,
      unique_slots_played: sessionData.unique_slots_played || 0,
      biggest_win: sessionData.biggest_win || 0,
      best_slot: sessionData.best_slot || null,
      session_duration_minutes: sessionData.session_duration_minutes || 0,
      ended_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,session_date'
    })
    .select()
    .single();

  if (error) {
    console.error('Error updating daily session:', error);
    throw error;
  }

  return data;
};

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

export const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount || 0);
};

export const formatPercentage = (value) => {
  return `${(value || 0).toFixed(2)}%`;
};

export const formatMultiplier = (value) => {
  return `${(value || 0).toFixed(2)}x`;
};

export const formatNumber = (value) => {
  return new Intl.NumberFormat('en-US').format(value || 0);
};

// ============================================================================
// VALIDATION
// ============================================================================

export const validateSlotData = (data) => {
  if (!data.slot_name || data.slot_name.trim() === '') {
    throw new Error('Slot name is required');
  }
  if (typeof data.bet_amount !== 'number' || data.bet_amount < 0) {
    throw new Error('Valid bet amount is required');
  }
  if (typeof data.win_amount !== 'number' || data.win_amount < 0) {
    throw new Error('Valid win amount is required');
  }
  return true;
};

export const validateBonusData = (data) => {
  if (!data.slot_name || data.slot_name.trim() === '') {
    throw new Error('Slot name is required');
  }
  if (typeof data.bet_size !== 'number' || data.bet_size <= 0) {
    throw new Error('Valid bet size is required');
  }
  if (typeof data.bonus_cost !== 'number' || data.bonus_cost <= 0) {
    throw new Error('Valid bonus cost is required');
  }
  return true;
};

export const validateTournamentData = (data) => {
  if (!data.tournament_name || data.tournament_name.trim() === '') {
    throw new Error('Tournament name is required');
  }
  if (typeof data.entry_fee !== 'number' || data.entry_fee < 0) {
    throw new Error('Valid entry fee is required');
  }
  return true;
};
