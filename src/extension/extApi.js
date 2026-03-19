/**
 * Twitch Extension API Client
 * Handles communication between Extension frontend ↔ EBS (Vercel API)
 */

const EBS_URL = import.meta.env.VITE_EBS_URL || '';

let _jwt = null;
let _twitchAuth = null;

export function setTwitchAuth(auth) {
  _twitchAuth = auth;
  _jwt = auth?.token || null;
}

export function getTwitchAuth() {
  return _twitchAuth;
}

async function ebsFetch(action, body = {}, method = 'POST') {
  if (!_jwt) throw new Error('Twitch auth not initialized');

  const url = method === 'GET'
    ? `${EBS_URL}/api/twitch-ext?action=${action}&${new URLSearchParams(body)}`
    : `${EBS_URL}/api/twitch-ext`;

  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-extension-jwt': _jwt,
    },
  };

  if (method === 'POST') {
    opts.body = JSON.stringify({ action, ...body });
  }

  const res = await fetch(url, opts);
  const data = await res.json();

  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ─── Points ─────────────────────────────────────────────

export const getPoints = () => ebsFetch('get_points', {}, 'GET');
export const getConfig = () => ebsFetch('get_config', {}, 'GET');

// ─── Predictions ────────────────────────────────────────

export const getPrediction = () => ebsFetch('get_prediction', {}, 'GET');
export const submitPrediction = (prediction_id, multiplier, wager = 0) =>
  ebsFetch('submit_prediction', {
    prediction_id,
    multiplier,
    wager,
    display_name: _twitchAuth?.displayName || '',
  });
export const getLeaderboard = () => ebsFetch('get_leaderboard', {}, 'GET');

// ─── Total Guess ────────────────────────────────────────

export const getTotalGuess = () => ebsFetch('get_total_guess', {}, 'GET');
export const submitTotalGuess = (guess_id, total) =>
  ebsFetch('submit_total_guess', {
    guess_id,
    total,
    display_name: _twitchAuth?.displayName || '',
  });

// ─── Slot Picker ────────────────────────────────────────

export const getSuggestions = (session_id) =>
  ebsFetch('get_suggestions', { session_id }, 'GET');
export const submitSuggestion = (slot_name, session_id) =>
  ebsFetch('submit_suggestion', {
    slot_name,
    session_id,
    display_name: _twitchAuth?.displayName || '',
  });
export const voteSuggestion = (suggestion_id) =>
  ebsFetch('vote_suggestion', { suggestion_id });
export const lockSuggestion = (suggestion_id) =>
  ebsFetch('lock_suggestion', {
    suggestion_id,
    display_name: _twitchAuth?.displayName || '',
  });

// ─── Bets ───────────────────────────────────────────────

export const getBets = () => ebsFetch('get_bets', {}, 'GET');
export const placeBet = (bet_id, option_id, wager) =>
  ebsFetch('place_bet', {
    bet_id,
    option_id,
    wager,
    display_name: _twitchAuth?.displayName || '',
  });

// ─── Giveaway ───────────────────────────────────────────

export const getGiveaways = () => ebsFetch('get_giveaways', {}, 'GET');
export const enterGiveaway = (giveaway_id, tickets = 1) =>
  ebsFetch('enter_giveaway', {
    giveaway_id,
    tickets,
    display_name: _twitchAuth?.displayName || '',
  });

// ─── Stats ──────────────────────────────────────────────

export const getSessionStats = () => ebsFetch('get_session_stats', {}, 'GET');
export const getAllTimeStats = () => ebsFetch('get_all_time_stats', {}, 'GET');
export const getFavouriteSlots = () => ebsFetch('get_favourite_slots', {}, 'GET');
export const getSessionHistory = () => ebsFetch('get_session_history', {}, 'GET');

// ─── Wheel ──────────────────────────────────────────────

export const getWheelPrizes = () => ebsFetch('get_wheel_prizes', {}, 'GET');
export const spinWheel = () =>
  ebsFetch('spin_wheel', { display_name: _twitchAuth?.displayName || '' });
