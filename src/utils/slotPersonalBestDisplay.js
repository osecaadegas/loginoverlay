import { recordMatchesSlot } from "../../shared/slotPersonalBest.js";

function cachedBestWinMatchesUser(cached, userId) {
  if (!cached) return false;
  const cachedUserId = cached.userId || cached.user_id;
  return !cachedUserId || !userId || cachedUserId === userId;
}

function normalizeBestWinRecord(record) {
  if (!record || !(Number(record.best_win || record.bestWin) > 0)) return null;
  return {
    slot_id: record.slot_id || record.slotId || null,
    slot_name: record.slot_name || record.slotName || "",
    slot_provider: record.slot_provider || record.provider || null,
    best_win: Number(record.best_win || record.bestWin || 0),
    best_multiplier: Number(record.best_multiplier || record.bestMulti || 0),
  };
}

export function pickBestWinRecord(records) {
  return (
    records
      .map(normalizeBestWinRecord)
      .filter((record) => record?.best_win > 0)
      .sort(
        (a, b) =>
          Number(b.best_win || 0) - Number(a.best_win || 0) ||
          Number(b.best_multiplier || 0) - Number(a.best_multiplier || 0),
      )[0] || null
  );
}

function cachedBestWinRecord(cached, userId, activeSlot) {
  const cachedRecord = cached
    ? {
        slot_id: cached.slotId || cached.slot_id || null,
        slot_name: cached.slotName || cached.slot_name,
        slot_provider: cached.provider || cached.slot_provider || null,
      }
    : null;
  const isExactEnough =
    cachedRecord &&
    cachedBestWinMatchesUser(cached, userId) &&
    recordMatchesSlot(cachedRecord, activeSlot);
  if (!cached?.best_win || !isExactEnough) return null;
  return {
    ...cachedRecord,
    best_win: cached.best_win,
    best_multiplier: cached.best_multiplier || 0,
  };
}

function widgetBestWinRecord(widget, activeSlot) {
  const widgetRecord = {
    slot_id: widget.config.slotId || null,
    slot_name: widget.config.slotName,
    slot_provider: widget.config.provider || null,
  };
  const matches = recordMatchesSlot(widgetRecord, activeSlot);
  if (!matches) return null;
  return {
    slot_id: widget.config.slotId || null,
    slot_name: widget.config.slotName,
    slot_provider: widget.config.provider || null,
    best_win: widget.config.bestWin,
    best_multiplier: widget.config.bestMulti || 0,
  };
}

export function resolveConfigBestWin({
  slotName,
  cached,
  userId,
  allWidgets,
  activeSlot,
}) {
  if (!slotName) return null;
  const cachedRecord = cachedBestWinRecord(cached, userId, activeSlot);
  if (cachedRecord) return cachedRecord;
  const matchingWidget = (allWidgets || []).find((widget) => {
    const isSlotWidget =
      widget.widget_type === "single_slot" ||
      widget.widget_type === "current_slot";
    return (
      isSlotWidget &&
      widget.config?.bestWin &&
      widgetBestWinRecord(widget, activeSlot)
    );
  });
  return matchingWidget
    ? widgetBestWinRecord(matchingWidget, activeSlot)
    : null;
}

export function resolveCurrentHuntBestWin({ activeSlot, bonuses, isLive }) {
  if (!isLive) return null;
  let best = null;
  for (const bonus of bonuses || []) {
    const payout = Number(bonus.payout) || Number(bonus.result) || 0;
    if (payout <= 0) continue;
    const record = {
      slot_id: bonus.slot?.id || bonus.slot_id || bonus.slotId || null,
      slot_name: bonus.slotName || bonus.slot_name || bonus.slot?.name || "",
      slot_provider: bonus.slot?.provider || bonus.provider || bonus.slot_provider || null,
    };
    if (!recordMatchesSlot(record, activeSlot)) continue;
    const bet = Number(bonus.betSize) || Number(bonus.bet_size) || Number(bonus.bet) || 0;
    const candidate = {
      ...record,
      best_win: payout,
      best_multiplier: bet > 0 ? Math.round((payout / bet) * 100) / 100 : 0,
    };
    best = pickBestWinRecord([best, candidate]);
  }
  return best;
}
