import {
  calculateHuntStatistics,
  calculateLibraryStatistics,
  getPeriodRange,
  normalizeBonusPayload,
  normalizeHuntPayload,
  ValidationError,
} from '../src/features/playerBonusHunt/domain.js';
import {
  createSupabaseAdmin,
  parseBody,
  requireUser,
  sendCsv,
  setCors,
} from './_lib/api-auth.js';
import { getPlayerAccess, requirePlayerAccess } from './_lib/player-access.js';

function parsePositiveInt(value, fallback, max = 100) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(n, max);
}

function statusCode(err) {
  if (err instanceof ValidationError) return 400;
  return err.statusCode || 500;
}

async function loadHunt(supabase, userId, huntId) {
  const { data: hunt, error } = await supabase
    .from('player_hunts')
    .select('*')
    .eq('id', huntId)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw error;
  if (!hunt) {
    const err = new Error('Hunt not found');
    err.statusCode = 404;
    throw err;
  }
  return hunt;
}

async function loadBonuses(supabase, userId, huntIds) {
  if (!huntIds.length) return [];
  const { data, error } = await supabase
    .from('player_hunt_bonuses')
    .select('*')
    .eq('user_id', userId)
    .in('hunt_id', huntIds)
    .is('deleted_at', null)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

function withStats(hunt, bonuses) {
  return {
    ...hunt,
    bonuses,
    stats: calculateHuntStatistics(hunt, bonuses),
  };
}

async function handleAccess(req, res, supabase, user) {
  const access = await getPlayerAccess(supabase, user.id);
  return res.status(200).json(access);
}

async function handleDashboard(req, res, supabase, user) {
  await requirePlayerAccess(supabase, user.id);
  const { data: hunts, error } = await supabase
    .from('player_hunts')
    .select('*')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('hunt_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;

  const bonuses = await loadBonuses(supabase, user.id, (hunts || []).map((hunt) => hunt.id));
  const byHunt = new Map();
  for (const bonus of bonuses) {
    byHunt.set(bonus.hunt_id, [...(byHunt.get(bonus.hunt_id) || []), bonus]);
  }
  const enriched = (hunts || []).map((hunt) => withStats(hunt, byHunt.get(hunt.id) || []));
  const active = enriched.filter((hunt) => hunt.status === 'active');
  const current = active[0] || enriched[0] || null;
  return res.status(200).json({
    current,
    activeHunts: active,
    history: enriched,
    library: calculateLibraryStatistics(hunts || [], bonuses),
  });
}

async function handleListHunts(req, res, supabase, user) {
  await requirePlayerAccess(supabase, user.id);
  const page = parsePositiveInt(req.query.page, 1, 9999);
  const limit = parsePositiveInt(req.query.limit, 20, 100);
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  let query = supabase
    .from('player_hunts')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .is('deleted_at', null);
  if (req.query.status) query = query.eq('status', req.query.status);
  const { data, error, count } = await query
    .order('hunt_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) throw error;
  const bonuses = await loadBonuses(supabase, user.id, (data || []).map((hunt) => hunt.id));
  const byHunt = new Map();
  for (const bonus of bonuses) byHunt.set(bonus.hunt_id, [...(byHunt.get(bonus.hunt_id) || []), bonus]);
  return res.status(200).json({
    hunts: (data || []).map((hunt) => withStats(hunt, byHunt.get(hunt.id) || [])),
    page,
    limit,
    total: count || 0,
  });
}

async function handleCreateHunt(req, res, supabase, user) {
  await requirePlayerAccess(supabase, user.id);
  const body = parseBody(req);
  const huntPayload = {
    ...normalizeHuntPayload(body),
    user_id: user.id,
  };

  const { data: hunt, error } = await supabase
    .from('player_hunts')
    .insert(huntPayload)
    .select('*')
    .single();
  if (error) throw error;

  const bonusesInput = Array.isArray(body.bonuses) ? body.bonuses : [];
  let bonuses = [];
  if (bonusesInput.length) {
    const rows = bonusesInput.map((bonus, index) => ({
      ...normalizeBonusPayload({ ...bonus, position: index }),
      user_id: user.id,
      hunt_id: hunt.id,
    }));
    const result = await supabase
      .from('player_hunt_bonuses')
      .insert(rows)
      .select('*');
    if (result.error) throw result.error;
    bonuses = result.data || [];
  }

  return res.status(201).json({ hunt: withStats(hunt, bonuses) });
}

async function handleGetHunt(req, res, supabase, user) {
  await requirePlayerAccess(supabase, user.id);
  const hunt = await loadHunt(supabase, user.id, req.query.huntId);
  const bonuses = await loadBonuses(supabase, user.id, [hunt.id]);
  return res.status(200).json({ hunt: withStats(hunt, bonuses) });
}

async function handleUpdateHunt(req, res, supabase, user) {
  await requirePlayerAccess(supabase, user.id);
  const body = parseBody(req);
  const hunt = await loadHunt(supabase, user.id, body.huntId || req.query.huntId);
  const payload = normalizeHuntPayload(body, { partial: true });
  if (payload.status === 'completed' && hunt.status !== 'completed') payload.completed_at = new Date().toISOString();
  if (payload.status === 'archived' && hunt.status !== 'archived') payload.archived_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('player_hunts')
    .update(payload)
    .eq('id', hunt.id)
    .eq('user_id', user.id)
    .select('*')
    .single();
  if (error) throw error;
  const bonuses = await loadBonuses(supabase, user.id, [hunt.id]);
  return res.status(200).json({ hunt: withStats(data, bonuses) });
}

async function handleAddBonus(req, res, supabase, user) {
  await requirePlayerAccess(supabase, user.id);
  const body = parseBody(req);
  const hunt = await loadHunt(supabase, user.id, body.huntId || req.query.huntId);
  const existing = await loadBonuses(supabase, user.id, [hunt.id]);
  const payload = {
    ...normalizeBonusPayload({ ...body, position: body.position ?? existing.length }),
    user_id: user.id,
    hunt_id: hunt.id,
  };
  const { data, error } = await supabase
    .from('player_hunt_bonuses')
    .insert(payload)
    .select('*')
    .single();
  if (error) throw error;
  return res.status(201).json({ bonus: data });
}

async function handleUpdateBonus(req, res, supabase, user) {
  await requirePlayerAccess(supabase, user.id);
  const body = parseBody(req);
  const bonusId = body.bonusId || req.query.bonusId;
  const { data: existing, error: loadError } = await supabase
    .from('player_hunt_bonuses')
    .select('*')
    .eq('id', bonusId)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .maybeSingle();
  if (loadError) throw loadError;
  if (!existing) {
    const err = new Error('Bonus not found');
    err.statusCode = 404;
    throw err;
  }
  await loadHunt(supabase, user.id, existing.hunt_id);
  const payload = normalizeBonusPayload(body, { partial: true });
  const { data, error } = await supabase
    .from('player_hunt_bonuses')
    .update(payload)
    .eq('id', existing.id)
    .eq('user_id', user.id)
    .select('*')
    .single();
  if (error) throw error;
  return res.status(200).json({ bonus: data });
}

async function handleDeleteBonus(req, res, supabase, user) {
  await requirePlayerAccess(supabase, user.id);
  const bonusId = req.query.bonusId || parseBody(req).bonusId;
  const { data, error } = await supabase
    .from('player_hunt_bonuses')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', bonusId)
    .eq('user_id', user.id)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) return res.status(404).json({ error: 'Bonus not found' });
  return res.status(200).json({ ok: true });
}

async function handleArchiveHunt(req, res, supabase, user) {
  await requirePlayerAccess(supabase, user.id);
  const body = parseBody(req);
  const hunt = await loadHunt(supabase, user.id, body.huntId || req.query.huntId);
  const { data, error } = await supabase
    .from('player_hunts')
    .update({ status: 'archived', archived_at: new Date().toISOString() })
    .eq('id', hunt.id)
    .eq('user_id', user.id)
    .select('*')
    .single();
  if (error) throw error;
  return res.status(200).json({ hunt: data });
}

async function handleDeleteHunt(req, res, supabase, user) {
  await requirePlayerAccess(supabase, user.id);
  const huntId = req.query.huntId || parseBody(req).huntId;
  const { data, error } = await supabase
    .from('player_hunts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', huntId)
    .eq('user_id', user.id)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) return res.status(404).json({ error: 'Hunt not found' });
  return res.status(200).json({ ok: true });
}

async function handleDuplicateHunt(req, res, supabase, user) {
  await requirePlayerAccess(supabase, user.id);
  const body = parseBody(req);
  const hunt = await loadHunt(supabase, user.id, body.huntId || req.query.huntId);
  const bonuses = await loadBonuses(supabase, user.id, [hunt.id]);
  const { id, created_at, updated_at, completed_at, archived_at, deleted_at, ...copy } = hunt;
  const { data: newHunt, error } = await supabase
    .from('player_hunts')
    .insert({
      ...copy,
      name: `${hunt.name} copy`,
      status: 'active',
      completed_at: null,
      archived_at: null,
      user_id: user.id,
    })
    .select('*')
    .single();
  if (error) throw error;
  const rows = bonuses.map((bonus, index) => {
    const { id: bonusId, created_at: bCreated, updated_at: bUpdated, deleted_at: bDeleted, opened_at, ...bonusCopy } = bonus;
    return {
      ...bonusCopy,
      hunt_id: newHunt.id,
      user_id: user.id,
      status: 'unopened',
      payout: 0,
      multiplier: null,
      profit_loss: -Number(bonus.bonus_cost || 0),
      opened_at: null,
      position: index,
    };
  });
  let newBonuses = [];
  if (rows.length) {
    const result = await supabase.from('player_hunt_bonuses').insert(rows).select('*');
    if (result.error) throw result.error;
    newBonuses = result.data || [];
  }
  return res.status(201).json({ hunt: withStats(newHunt, newBonuses) });
}

async function loadLibraryData(supabase, userId, query) {
  const period = query.period || 'all';
  const range = getPeriodRange(period, query.anchor || new Date(), {
    start: query.start,
    end: query.end,
  });
  let huntsQuery = supabase
    .from('player_hunts')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null);
  if (range.start) huntsQuery = huntsQuery.gte('hunt_date', range.start.slice(0, 10));
  if (range.end) huntsQuery = huntsQuery.lte('hunt_date', range.end.slice(0, 10));
  const { data: hunts, error } = await huntsQuery.order('hunt_date', { ascending: false });
  if (error) throw error;
  const huntIds = (hunts || []).map((hunt) => hunt.id);
  let bonuses = await loadBonuses(supabase, userId, huntIds);
  const search = String(query.search || '').trim().toLowerCase();
  if (search) {
    bonuses = bonuses.filter((bonus) =>
      `${bonus.slot_name || ''} ${bonus.provider_name || ''}`.toLowerCase().includes(search)
    );
  }
  const provider = String(query.provider || '').trim().toLowerCase();
  if (provider) bonuses = bonuses.filter((bonus) => (bonus.provider_name || '').toLowerCase() === provider);
  return { hunts: hunts || [], bonuses, range };
}

async function handleLibrary(req, res, supabase, user) {
  await requirePlayerAccess(supabase, user.id);
  const { hunts, bonuses, range } = await loadLibraryData(supabase, user.id, req.query);
  const stats = calculateLibraryStatistics(hunts, bonuses);
  const view = req.query.view || 'overview';
  const sort = req.query.sort || 'payout';
  const limit = parsePositiveInt(req.query.limit, 50, 200);
  const opened = bonuses.filter((bonus) => bonus.status === 'opened');
  let results = opened;
  if (view === 'best-wins') results = [...opened].sort((a, b) => Number(b.payout || 0) - Number(a.payout || 0));
  else if (view === 'worst-wins') results = [...opened].sort((a, b) => Number(a.payout || 0) - Number(b.payout || 0));
  else if (view === 'multipliers') results = [...opened].sort((a, b) => Number(b.multiplier || 0) - Number(a.multiplier || 0));
  else if (sort === 'slot') results = [...opened].sort((a, b) => String(a.slot_name).localeCompare(String(b.slot_name)));
  else if (sort === 'profit') results = [...opened].sort((a, b) => Number(b.profit_loss || 0) - Number(a.profit_loss || 0));
  else results = [...opened].sort((a, b) => Number(b.payout || 0) - Number(a.payout || 0));
  return res.status(200).json({
    range,
    hunts: stats.hunts,
    results: results.slice(0, limit),
    stats,
  });
}

async function handleSlotSearch(req, res, supabase, user) {
  await requirePlayerAccess(supabase, user.id);
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.status(200).json({ slots: [] });
  const { data, error } = await supabase
    .from('slots')
    .select('id, name, provider, image')
    .or(`name.ilike.%${q.replace(/[%_,]/g, '')}%,provider.ilike.%${q.replace(/[%_,]/g, '')}%`)
    .limit(12);
  if (error) throw error;
  return res.status(200).json({ slots: data || [] });
}

async function handleExport(req, res, supabase, user) {
  await requirePlayerAccess(supabase, user.id);
  const { hunts, bonuses } = await loadLibraryData(supabase, user.id, req.query);
  const type = req.query.type || 'bonuses';
  if (type === 'hunts') {
    const rows = [
      ['Hunt name', 'Date', 'Casino', 'Currency', 'Deposited', 'Withdrawn', 'Current balance', 'Profit/Loss', 'Bonuses', 'Opened', 'Status'],
      ...hunts.map((hunt) => {
        const huntBonuses = bonuses.filter((bonus) => bonus.hunt_id === hunt.id);
        const stats = calculateHuntStatistics(hunt, huntBonuses);
        return [
          hunt.name,
          hunt.hunt_date,
          hunt.casino_name || '',
          hunt.currency,
          stats.totalDeposits,
          stats.totalWithdrawals,
          stats.currentBalance,
          stats.profitLoss,
          stats.totalBonuses,
          stats.openedBonuses,
          hunt.status,
        ];
      }),
    ];
    return sendCsv(res, 'player-bonus-hunts.csv', rows);
  }

  const rows = [
    ['Hunt', 'Date', 'Casino', 'Currency', 'Slot', 'Provider', 'Cost', 'Bet', 'Payout', 'Multiplier', 'Profit/Loss', 'Status', 'Notes'],
    ...bonuses.map((bonus) => {
      const hunt = hunts.find((h) => h.id === bonus.hunt_id) || {};
      return [
        hunt.name || '',
        hunt.hunt_date || '',
        hunt.casino_name || '',
        hunt.currency || '',
        bonus.slot_name,
        bonus.provider_name || '',
        bonus.bonus_cost,
        bonus.bet_size,
        bonus.payout,
        bonus.multiplier || '',
        bonus.profit_loss,
        bonus.status,
        bonus.notes || '',
      ];
    }),
  ];
  return sendCsv(res, 'player-bonus-results.csv', rows);
}

const handlers = {
  access: handleAccess,
  dashboard: handleDashboard,
  'list-hunts': handleListHunts,
  'create-hunt': handleCreateHunt,
  hunt: handleGetHunt,
  'update-hunt': handleUpdateHunt,
  'add-bonus': handleAddBonus,
  'update-bonus': handleUpdateBonus,
  'delete-bonus': handleDeleteBonus,
  'archive-hunt': handleArchiveHunt,
  'delete-hunt': handleDeleteHunt,
  'duplicate-hunt': handleDuplicateHunt,
  library: handleLibrary,
  'slot-search': handleSlotSearch,
  export: handleExport,
};

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const supabase = createSupabaseAdmin();
    const user = await requireUser(req, supabase);
    const action = req.query.action || (req.method === 'GET' ? 'dashboard' : '');
    const actionHandler = handlers[action];
    if (!actionHandler) return res.status(404).json({ error: 'Unknown action' });
    return actionHandler(req, res, supabase, user);
  } catch (err) {
    console.error('[player-bonus-hunt]', err);
    return res.status(statusCode(err)).json({
      error: err.message || 'Player Bonus Hunt request failed',
      access: err.access || undefined,
      details: err.details || undefined,
    });
  }
}
