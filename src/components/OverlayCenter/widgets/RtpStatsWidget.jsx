import React, { useMemo, useState, useEffect, useRef } from 'react';
import { supabase } from '../../../config/supabaseClient';
import { findUserSlotRecord, getSlotIdentity, hydrateSlotPersonalBestFromHistory, recordMatchesSlot } from '../../../services/slotRecordService';
import { getProviderImage } from '../../../utils/gameProviders';
import { subValue } from './shared/appearanceStyles';

/* ─── Fetch slot info from the database (slots table) ─── */
async function fetchSlotFromDB(slotRef) {
  const slot = getSlotIdentity(slotRef);
  if (!slot.name && !slot.id) return null;

  try {
    if (slot.id) {
      const { data, error } = await supabase
        .from('slots')
        .select('id, name, provider, image, rtp, volatility, max_win_multiplier, reels, min_bet, max_bet, features')
        .eq('id', slot.id)
        .limit(1)
        .single();

      if (!error && data) return { ...data, source: 'database', confidence: 'exact' };
    }

    if (slot.name && slot.provider) {
      const { data, error } = await supabase
        .from('slots')
        .select('id, name, provider, image, rtp, volatility, max_win_multiplier, reels, min_bet, max_bet, features')
        .ilike('name', slot.name)
        .ilike('provider', slot.provider)
        .limit(1)
        .single();

      if (!error && data) return { ...data, source: 'database', confidence: 'high' };
    }

    // Exact match (case-insensitive via ilike)
    let { data, error } = await supabase
      .from('slots')
      .select('id, name, provider, image, rtp, volatility, max_win_multiplier, reels, min_bet, max_bet, features')
      .ilike('name', slot.name)
      .limit(1)
      .single();

    if (!error && data) return { ...data, source: 'database', confidence: 'high' };

    // Fuzzy match (contains) is metadata-only fallback, never used for PB lookup.
    ({ data, error } = await supabase
      .from('slots')
      .select('id, name, provider, image, rtp, volatility, max_win_multiplier, reels, min_bet, max_bet, features')
      .ilike('name', `%${slot.name}%`)
      .limit(1)
      .single());

    if (!error && data) return { ...data, source: 'database', confidence: 'medium' };
  } catch {
    // DB not reachable — fall through to API
  }
  return null;
}

/* ─── API fallback (slot-ai pipeline: DB + Gemini) ─── */
async function fetchSlotInfoAPI(name) {
  try {
    const res = await fetch('/api/slot-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    // slot-ai returns a flat object with name, provider, rtp, etc.
    if (json.source === 'blocked' || json.source === 'not_found' || json.error) return null;
    return json.name ? json : null;
  } catch {
    return null;
  }
}

/* ─── Volatility formatting ─── */
function fmtVolatility(v) {
  if (!v) return '—';
  return v.replace(/_/g, ' ').toUpperCase();
}

/* ─── Format max win multiplier ─── */
function fmtMultiplier(m) {
  if (!m) return '—';
  return `x${Number(m).toLocaleString()}`;
}

function cachedBestWinMatchesUser(cached, userId) {
  if (!cached) return false;
  const cachedUserId = cached.userId || cached.user_id;
  return !cachedUserId || !userId || cachedUserId === userId;
}

function normalizeBestWinRecord(record) {
  if (!record?.best_win) return null;
  return {
    slot_id: record.slot_id || record.slotId || null,
    slot_name: record.slot_name || record.slotName || '',
    slot_provider: record.slot_provider || record.provider || null,
    best_win: Number(record.best_win || record.bestWin || 0),
    best_multiplier: Number(record.best_multiplier || record.bestMulti || 0),
  };
}

function pickBestWinRecord(records) {
  return records
    .map(normalizeBestWinRecord)
    .filter(record => record?.best_win > 0)
    .sort((a, b) => (
      Number(b.best_win || 0) - Number(a.best_win || 0)
      || Number(b.best_multiplier || 0) - Number(a.best_multiplier || 0)
    ))[0] || null;
}

/* ─── Main widget ─── */
function RtpStatsProviderMark({ provider, logo }) {
  const [failedLogo, setFailedLogo] = useState('');

  useEffect(() => {
    setFailedLogo('');
  }, [provider, logo]);

  const canShowLogo = Boolean(logo) && failedLogo !== logo;
  const label = String(provider || '').trim();

  return (
    <span
      className={`rtp-stats-provider ${canShowLogo ? 'rtp-stats-provider--logo' : 'rtp-stats-provider--text'}`}
      title={label}
    >
      {canShowLogo ? (
        <img
          src={logo}
          alt={`${label} logo`}
          className="rtp-stats-provider-logo"
          draggable="false"
          decoding="async"
          onError={() => setFailedLogo(logo)}
        />
      ) : (
        label.toUpperCase()
      )}
    </span>
  );
}

function RtpStatsWidget({ config, theme, allWidgets, userId, widgetId }) {
  const c = config || {};

  /* ── Find bonus hunt widget ── */
  const bhWidget = useMemo(() => {
    return (allWidgets || []).find(w =>
      w.widget_type === 'bonus_hunt' && w.config
    );
  }, [allWidgets]);

  const bhConfig = bhWidget?.config || {};
  const bonusOpening = bhConfig.bonusOpening === true;

  /* ── Find tournament widget & current match slot ── */
  const tournamentSlotName = useMemo(() => {
    const tw = (allWidgets || []).find(w =>
      w.widget_type === 'tournament' && w.config?.data
    );
    if (!tw) return '';
    const tData = tw.config.data;
    const allMatches = tData.matches || [];
    const matches = allMatches.filter(m =>
      (m.player1 && m.player1 !== 'TBD') || (m.player2 && m.player2 !== 'TBD')
    );
    // Find current match: first in_progress, or use stored index
    const ipIdx = matches.findIndex(m => m.status === 'in_progress');
    const currentIdx = ipIdx >= 0 ? ipIdx : (() => {
      const orig = tData.currentMatchIdx ?? 0;
      const target = allMatches[orig];
      if (!target) return 0;
      const idx = matches.indexOf(target);
      return idx >= 0 ? idx : 0;
    })();
    const current = matches[currentIdx];
    if (!current) return '';
    // If match has no winner yet, use slot1 name (the "active" slot)
    // If match has a winner, show the winning slot
    if (current.winner) {
      const winSlot = current.winner === 'player1' ? current.slot1 : current.slot2;
      return winSlot?.name || '';
    }
    // No winner yet — prefer slot1 (left player)
    return current.slot1?.name || current.slot2?.name || '';
  }, [allWidgets]);

  /* ── Apply same sort as BonusHuntWidget so current bonus matches ── */
  const bonuses = useMemo(() => {
    const raw = bhConfig.bonuses || [];
    const sb = bhConfig.sortBy;
    const sd = bhConfig.sortDir || 'asc';
    if (!sb || sb === 'default') return raw;
    const dir = sd === 'desc' ? -1 : 1;
    return [...raw].sort((a, b) => {
      if (sb === 'bet') return ((a.betSize || 0) - (b.betSize || 0)) * dir;
      if (sb === 'provider') {
        const pa = (a.slot?.provider || '').toLowerCase();
        const pb = (b.slot?.provider || '').toLowerCase();
        if (pa !== pb) return pa.localeCompare(pb) * dir;
        return (a.slotName || '').localeCompare(b.slotName || '') * dir;
      }
      if (sb === 'type') {
        const rank = (x) => x.isExtremeBonus ? 2 : x.isSuperBonus ? 1 : 0;
        return (rank(b) - rank(a)) * dir;
      }
      return 0;
    });
  }, [bhConfig.bonuses, bhConfig.sortBy, bhConfig.sortDir]);

  /* ── Current bonus (first unopened) ── */
  const currentBonus = useMemo(() => bonuses.find(b => !b.opened), [bonuses]);
  /* Priority: search preview → bonus opening slot → tournament slot → bonus hunt slot */
  const currentBonusSlot = useMemo(() => {
    if (!currentBonus) return null;
    return getSlotIdentity({
      slotId: currentBonus.slot?.id || currentBonus.slot_id || currentBonus.slotId,
      slotName: currentBonus.slotName || currentBonus.slot?.name,
      provider: currentBonus.slot?.provider || currentBonus.provider,
      imageUrl: currentBonus.slot?.image || currentBonus.imageUrl,
      slot: currentBonus.slot,
    });
  }, [currentBonus]);

  const activeSlot = useMemo(() => {
    const previewName = bhConfig.previewSlotName || '';
    if (previewName) return getSlotIdentity({ slotName: previewName });
    if (bonusOpening && currentBonusSlot?.name) return currentBonusSlot;
    if (tournamentSlotName) return getSlotIdentity({ slotName: tournamentSlotName });
    if (currentBonusSlot?.name) return currentBonusSlot;
    return getSlotIdentity({});
  }, [bhConfig.previewSlotName, bonusOpening, currentBonusSlot, tournamentSlotName]);

  const slotName = activeSlot.name || '';
  const slotKey = `${activeSlot.id || ''}|${activeSlot.provider || ''}|${slotName}`;
  const localSlotInfo = useMemo(() => {
    if (!slotName) return null;
    if (currentBonus?.slot && recordMatchesSlot({ slot_id: currentBonus.slot.id, slot_name: currentBonus.slot.name || currentBonus.slotName, slot_provider: currentBonus.slot.provider }, activeSlot)) {
      return {
        ...currentBonus.slot,
        id: currentBonus.slot.id || activeSlot.id || null,
        name: currentBonus.slot.name || slotName,
        provider: currentBonus.slot.provider || activeSlot.provider || '',
        image: currentBonus.slot.image || activeSlot.image || '',
        source: 'selected_bonus',
      };
    }
    return {
      id: activeSlot.id || null,
      name: slotName,
      provider: activeSlot.provider || '',
      image: activeSlot.image || '',
      source: 'selected_slot',
    };
  }, [activeSlot, currentBonus, slotName]);

  /* ── Slot info from DB (primary) or API (fallback) ── */
  const [slotInfo, setSlotInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const lastSlotRef = useRef('');

  useEffect(() => {
    if (!slotName) {
      lastSlotRef.current = '';
      setSlotInfo(null);
      setLoading(false);
      return;
    }
    if (slotKey === lastSlotRef.current) return;
    lastSlotRef.current = slotKey;
    let cancelled = false;
    setSlotInfo(localSlotInfo);

    async function lookup() {
      setLoading(true);
      // 1. Try database first
      const dbResult = await fetchSlotFromDB(activeSlot);
      if (!cancelled && dbResult) {
        setSlotInfo(dbResult);
        setLoading(false);
        return;
      }
      // 2. Fallback to API (KNOWN_SLOTS + web scrape)
      const apiResult = await fetchSlotInfoAPI(slotName);
      if (!cancelled) {
        setSlotInfo(apiResult);
        setLoading(false);
      }
    }

    lookup();
    return () => { cancelled = true; };
  }, [activeSlot, localSlotInfo, slotKey, slotName]);

  /* ── Best win for this slot (from user_slot_records) ── */
  const [bestWinData, setBestWinData] = useState(null);

  // Fallback: read bestWin cached in widget config (works in OBS where DB is blocked by RLS)
  const configBestWin = useMemo(() => {
    if (!slotName) return null;
    // Check own widget config first (persisted by dashboard fetch)
    const cached = c._cachedBestWin;
    const cachedRecord = cached ? {
      slot_id: cached.slotId || cached.slot_id || null,
      slot_name: cached.slotName,
      slot_provider: cached.provider || cached.slot_provider || null,
    } : null;
    const cachedIsExactEnough = cachedRecord
      && cachedBestWinMatchesUser(cached, userId)
      && recordMatchesSlot(cachedRecord, activeSlot)
      && !(activeSlot.id && !cachedRecord.slot_id && activeSlot.provider && !cachedRecord.slot_provider);
    if (cached?.best_win && cachedIsExactEnough) {
      return {
        ...cachedRecord,
        best_win: cached.best_win,
        best_multiplier: cached.best_multiplier || 0,
      };
    }
    // Fallback: check single_slot widgets
    if (!allWidgets) return null;
    const ssWidget = allWidgets.find(w => {
      if ((w.widget_type !== 'single_slot' && w.widget_type !== 'current_slot') || !w.config?.bestWin) return false;
      const widgetRecord = {
        slot_id: w.config.slotId || null,
        slot_name: w.config.slotName,
        slot_provider: w.config.provider || null,
      };
      return recordMatchesSlot(widgetRecord, activeSlot)
        && !(activeSlot.id && !widgetRecord.slot_id && activeSlot.provider && !widgetRecord.slot_provider);
    });
    if (ssWidget?.config?.bestWin) {
      return {
        slot_id: ssWidget.config.slotId || null,
        slot_name: ssWidget.config.slotName,
        slot_provider: ssWidget.config.provider || null,
        best_win: ssWidget.config.bestWin,
        best_multiplier: ssWidget.config.bestMulti || 0,
      };
    }
    return null;
  }, [activeSlot, allWidgets, c._cachedBestWin, slotName, userId]);

  // Persist bestWin to widget config so OBS can read it (OBS has no auth → can't query DB)
  const persistRef = useRef('');
  const configRef = useRef(c);
  configRef.current = c;
  useEffect(() => {
    if (!bestWinData || !widgetId || !slotName || !userId) return;
    const key = `${userId}:${slotKey}:${bestWinData.best_win}:${bestWinData.best_multiplier}`;
    if (persistRef.current === key) return; // already persisted
    persistRef.current = key;
    const latest = configRef.current;
    const bestSlot = getSlotIdentity(bestWinData);
    supabase
      .from('overlay_widgets')
      .update({
        config: {
          ...latest,
          _cachedBestWin: {
            userId,
            slotId: bestSlot.id || activeSlot.id || null,
            slotName: bestSlot.name || slotName,
            provider: bestSlot.provider || activeSlot.provider || null,
            best_win: bestWinData.best_win,
            best_multiplier: bestWinData.best_multiplier,
          },
        },
      })
      .eq('id', widgetId)
      .eq('user_id', userId)
      .then(); // fire-and-forget
  }, [activeSlot, bestWinData, slotKey, userId, widgetId, slotName]);

  // Fetch best win on slot change + subscribe to realtime updates
  useEffect(() => {
    if (!slotName || !userId) { setBestWinData(null); return; }
    let cancelled = false;
    setBestWinData(null);

    async function fetchBestWin() {
      try {
        const data = await findUserSlotRecord(userId, activeSlot, 'slot_id, slot_name, slot_provider, best_win, best_multiplier');
        let record = data && recordMatchesSlot(data, activeSlot) ? data : null;
        if (!record) {
          record = await hydrateSlotPersonalBestFromHistory(userId, activeSlot);
        }
        if (!cancelled) {
          setBestWinData(record && recordMatchesSlot(record, activeSlot)
            ? normalizeBestWinRecord(record)
            : null);
        }
      } catch {
        if (!cancelled) setBestWinData(null);
        // DB fetch failed (e.g. RLS in OBS) — configBestWin fallback will be used
      }
    }

    fetchBestWin();

    // Subscribe to changes so bestWin updates live when a new result is recorded
    const channel = supabase
      .channel(`bestwin_${userId}_${slotKey}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_slot_records',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        const rec = payload.new || payload.old;
        if (recordMatchesSlot(rec, activeSlot)) {
          if (payload.eventType === 'DELETE' || !payload.new?.best_win) {
            setBestWinData(null);
            return;
          }
          setBestWinData(normalizeBestWinRecord(payload.new));
        }
      })
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [activeSlot, slotKey, slotName, userId]);

  /* ── Style config ── */
  const displayStyle = c.displayStyle || 'v1';
  const isVertical = displayStyle === 'vertical';
  const isNeon = displayStyle === 'neon';
  const isMinimal = displayStyle === 'minimal';
  const isGlassStyle = displayStyle === 'glass';
  const barBgFrom = subValue(c, 'container', 'background', c.barBgFrom || (isNeon ? '#050510' : isMinimal ? '#0a0a14' : isGlassStyle ? '#0f172a' : '#111827'));
  const barBgVia = c.barBgVia || (isNeon ? '#0a0a2e' : isMinimal ? '#0a0a14' : isGlassStyle ? '#1e293b' : '#1e3a5f');
  const barBgTo = c.barBgTo || (isNeon ? '#050510' : isMinimal ? '#0a0a14' : isGlassStyle ? '#0f172a' : '#111827');
  const borderColor = subValue(c, 'container', 'borderColor', c.borderColor || (isNeon ? '#00ffcc' : isMinimal ? 'rgba(255,255,255,0.08)' : isGlassStyle ? 'rgba(255,255,255,0.2)' : '#1d4ed8'));
  const borderWidth = subValue(c, 'container', 'borderWidth', c.borderWidth ?? (isMinimal ? 0 : isNeon ? 1 : isGlassStyle ? 1 : 1));
  const borderRadius = subValue(c, 'container', 'radius', c.borderRadius ?? (isMinimal ? 4 : isGlassStyle ? 16 : 8));
  const textColor = subValue(c, 'statCard', 'textColor', c.textColor || '#ffffff');
  const providerColor = subValue(c, 'provider', 'textColor', c.providerColor || '#ffffff');
  const slotNameColor = subValue(c, 'slotTitle', 'textColor', c.slotNameColor || '#ffffff');
  const labelColor = subValue(c, 'label', 'textColor', c.labelColor || '#94a3b8');
  const rtpIconColor = subValue(c, 'rtpValue', 'accentColor', c.rtpIconColor || '#60a5fa');
  const potentialIconColor = subValue(c, 'maxWin', 'accentColor', c.potentialIconColor || '#facc15');
  const volatilityIconColor = subValue(c, 'volatility', 'accentColor', c.volatilityIconColor || '#3b82f6');
  const dividerColor = subValue(c, 'divider', 'background', subValue(c, 'statCard', 'borderColor', c.dividerColor || '#3b82f6'));
  const fontFamily = subValue(c, 'container', 'fontFamily', c.fontFamily || "'Inter', sans-serif");
  const fontSize = subValue(c, 'container', 'fontSize', c.fontSize ?? 14);
  const barHeight = subValue(c, 'container', 'height', c.barHeight ?? null);
  const maxWidth = subValue(c, 'container', 'maxWidth', c.maxWidth ?? null);
  const providerFontFamily = subValue(c, 'provider', 'fontFamily', fontFamily);
  const providerFontSize = subValue(c, 'provider', 'fontSize', c.providerFontSize ?? 16);
  const providerFontWeight = subValue(c, 'provider', 'fontWeight', c.fontWeight || 700);
  const providerLogoHeight = subValue(c, 'provider', 'imageSize', c.providerLogoHeight ?? 34);
  const providerLogoWidth = subValue(c, 'provider', 'width', c.providerLogoWidth ?? Math.round((Number(providerLogoHeight) || 34) * 4.7));
  const providerLogoRadius = subValue(c, 'provider', 'radius', c.providerLogoRadius ?? 0);
  const providerLogoFit = subValue(c, 'provider', 'imageFit', c.providerLogoFit || 'contain');
  const slotTitleFontFamily = subValue(c, 'slotTitle', 'fontFamily', fontFamily);
  const slotTitleFontSize = subValue(c, 'slotTitle', 'fontSize', fontSize);
  const slotTitleFontWeight = subValue(c, 'slotTitle', 'fontWeight', c.fontWeight || 700);
  const rtpValueFontFamily = subValue(c, 'rtpValue', 'fontFamily', fontFamily);
  const rtpValueFontSize = subValue(c, 'rtpValue', 'fontSize', fontSize);
  const rtpValueFontWeight = subValue(c, 'rtpValue', 'fontWeight', c.fontWeight || 700);
  const potentialValueFontFamily = subValue(c, 'maxWin', 'fontFamily', fontFamily);
  const potentialValueFontSize = subValue(c, 'maxWin', 'fontSize', fontSize);
  const potentialValueFontWeight = subValue(c, 'maxWin', 'fontWeight', c.fontWeight || 700);
  const volatilityValueFontFamily = subValue(c, 'volatility', 'fontFamily', fontFamily);
  const volatilityValueFontSize = subValue(c, 'volatility', 'fontSize', fontSize);
  const volatilityValueFontWeight = subValue(c, 'volatility', 'fontWeight', c.fontWeight || 700);
  const bestWinValueFontFamily = subValue(c, 'personalBest', 'fontFamily', fontFamily);
  const bestWinValueFontSize = subValue(c, 'personalBest', 'fontSize', fontSize);
  const bestWinValueFontWeight = subValue(c, 'personalBest', 'fontWeight', c.fontWeight || 700);
  const labelFontFamily = subValue(c, 'label', 'fontFamily', fontFamily);
  const labelFontSize = subValue(c, 'label', 'fontSize', Math.max(10, Math.round(Number(fontSize) * 0.88)));
  const labelFontWeight = subValue(c, 'label', 'fontWeight', c.labelFontWeight || 700);
  const rtpValueColor = subValue(c, 'rtpValue', 'textColor', textColor);
  const potentialValueColor = subValue(c, 'maxWin', 'textColor', textColor);
  const volatilityValueColor = subValue(c, 'volatility', 'textColor', textColor);
  const bestWinValueColor = subValue(c, 'personalBest', 'textColor', textColor);
  const paddingX = subValue(c, 'container', 'padding', c.paddingX ?? 10);
  const paddingY = subValue(c, 'container', 'gap', c.paddingY ?? 4);
  const compactPaddingX = Math.max(0, Math.min(Number(paddingX) || 10, 32));
  const compactPaddingY = Math.max(0, Math.min(Number(paddingY) || 4, 18));
  const itemGap = Math.max(0, Math.min(subValue(c, 'container', 'gap', c.gap ?? 7), 32));
  const shadow = subValue(c, 'container', 'shadow', undefined);
  const glow = subValue(c, 'container', 'glow', undefined);
  const backdropBlur = subValue(c, 'container', 'backdropBlur', 0);
  const brightness = subValue(c, 'container', 'brightness', c.brightness ?? 100);
  const contrast = subValue(c, 'container', 'contrast', c.contrast ?? 100);
  const saturation = subValue(c, 'container', 'saturation', c.saturation ?? 100);
  const showSpinner = c.showSpinner !== false;
  const showProvider = c.showProvider !== false;
  const showRtp = c.showRtp !== false;
  const showPotential = c.showPotential !== false;
  const showVolatility = c.showVolatility !== false;
  const showBestWin = c.showBestWin !== false;
  const bestWinIconColor = subValue(c, 'personalBest', 'accentColor', c.bestWinIconColor || '#22c55e');
  const spinnerColor = subValue(c, 'spinner', 'accentColor', c.spinnerColor || '#60a5fa');
  const previewMode = c.previewMode === true;
  const currency = bhConfig.currency || c.currency || '€';

  /* ── Determine what to display ── */
  const isLive = !!slotName;

  /* ── Demo data for preview / empty state ── */
  const demoSlotName = 'SWEET BONANZA';
  const demoProvider = 'PRAGMATIC PLAY';
  const demoInfo = { rtp: 96.48, max_win_multiplier: 21175, volatility: 'high' };
  const demoBestWin = { best_win: 8450, best_multiplier: 845 };

  /* ── When not live, show empty bar with dashes (widget stays visible in OBS) ── */
  const showDemoData = previewMode && !isLive;
  const showEmptyState = !isLive && !previewMode;

  const displaySlotName = isLive ? slotName : (showDemoData ? demoSlotName : '—');
  const displayProvider = isLive
    ? (slotInfo?.provider || activeSlot.provider || currentBonus?.slot?.provider || '')
    : (showDemoData ? demoProvider : '');
  const configuredProviderLogo = subValue(c, 'provider', 'imageUrl', c.providerLogoUrl || c.providerImageUrl || '');
  const displayProviderLogo = configuredProviderLogo || (displayProvider ? getProviderImage(displayProvider) : null);
  const displayInfo = isLive ? (slotInfo || localSlotInfo) : (showDemoData ? demoInfo : null);
  const currentHuntBestWin = useMemo(() => {
    if (!isLive) return null;
    let best = null;
    for (const bonus of bhConfig.bonuses || []) {
      const payout = Number(bonus.payout) || Number(bonus.result) || 0;
      if (payout <= 0) continue;
      const record = {
        slot_id: bonus.slot?.id || bonus.slot_id || bonus.slotId || null,
        slot_name: bonus.slotName || bonus.slot?.name || '',
        slot_provider: bonus.slot?.provider || bonus.provider || null,
      };
      if (!recordMatchesSlot(record, activeSlot)) continue;
      const bet = Number(bonus.betSize) || 0;
      const candidate = {
        ...record,
        best_win: payout,
        best_multiplier: bet > 0 ? Math.round((payout / bet) * 100) / 100 : 0,
      };
      best = pickBestWinRecord([best, candidate]);
    }
    return best;
  }, [activeSlot, bhConfig.bonuses, isLive]);
  const scopedBestWinData = bestWinData && recordMatchesSlot(bestWinData, activeSlot) ? bestWinData : null;
  const displayBestWin = isLive ? pickBestWinRecord([scopedBestWinData, configBestWin, currentHuntBestWin]) : (showDemoData ? demoBestWin : null);
  const bestWinEmptyText = isLive ? 'No personal best yet' : '-';

  const styleClass = isVertical ? ' rtp-stats-bar--vertical'
    : isNeon ? ' rtp-stats-bar--neon'
    : isMinimal ? ' rtp-stats-bar--minimal'
    : isGlassStyle ? ' rtp-stats-bar--glass'
    : '';

  const rootStyle = {
    fontFamily,
    fontSize: `${fontSize}px`,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transform: c.widgetScale && Number(c.widgetScale) !== 1 ? `scale(${Number(c.widgetScale)})` : undefined,
    transformOrigin: 'center',
    filter: (brightness !== 100 || contrast !== 100 || saturation !== 100)
      ? `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
      : undefined,
    '--rtp-bg-from': barBgFrom,
    '--rtp-bg-via': barBgVia,
    '--rtp-bg-to': barBgTo,
    '--rtp-border-color': borderColor,
    '--rtp-border-width': `${borderWidth}px`,
    '--rtp-border-radius': `${borderRadius}px`,
    '--rtp-text': textColor,
    '--rtp-provider': providerColor,
    '--rtp-slot-name': slotNameColor,
    '--rtp-label': labelColor,
    '--rtp-value-rtp': rtpValueColor,
    '--rtp-value-potential': potentialValueColor,
    '--rtp-value-volatility': volatilityValueColor,
    '--rtp-value-bestwin': bestWinValueColor,
    '--rtp-icon-rtp': rtpIconColor,
    '--rtp-icon-potential': potentialIconColor,
    '--rtp-icon-volatility': volatilityIconColor,
    '--rtp-divider': dividerColor,
    '--rtp-spinner': spinnerColor,
    '--rtp-px': `${compactPaddingX}px`,
    '--rtp-py': `${compactPaddingY}px`,
    '--rtp-provider-family': providerFontFamily,
    '--rtp-provider-size': `${providerFontSize}px`,
    '--rtp-provider-weight': providerFontWeight,
    '--rtp-provider-logo-width': `${providerLogoWidth}px`,
    '--rtp-provider-logo-height': `${providerLogoHeight}px`,
    '--rtp-provider-logo-radius': typeof providerLogoRadius === 'number' ? `${providerLogoRadius}px` : providerLogoRadius,
    '--rtp-provider-logo-fit': providerLogoFit,
    '--rtp-slot-family': slotTitleFontFamily,
    '--rtp-slot-size': `${slotTitleFontSize}px`,
    '--rtp-slot-weight': slotTitleFontWeight,
    '--rtp-value-rtp-family': rtpValueFontFamily,
    '--rtp-value-rtp-size': `${rtpValueFontSize}px`,
    '--rtp-value-rtp-weight': rtpValueFontWeight,
    '--rtp-value-potential-family': potentialValueFontFamily,
    '--rtp-value-potential-size': `${potentialValueFontSize}px`,
    '--rtp-value-potential-weight': potentialValueFontWeight,
    '--rtp-value-volatility-family': volatilityValueFontFamily,
    '--rtp-value-volatility-size': `${volatilityValueFontSize}px`,
    '--rtp-value-volatility-weight': volatilityValueFontWeight,
    '--rtp-value-bestwin-family': bestWinValueFontFamily,
    '--rtp-value-bestwin-size': `${bestWinValueFontSize}px`,
    '--rtp-value-bestwin-weight': bestWinValueFontWeight,
    '--rtp-label-family': labelFontFamily,
    '--rtp-label-size': `${labelFontSize}px`,
    '--rtp-label-weight': labelFontWeight,
    '--rtp-label-rtp-family': rtpValueFontFamily,
    '--rtp-label-rtp-size': `${Math.max(10, Math.round(Number(rtpValueFontSize) * 0.88))}px`,
    '--rtp-label-rtp-weight': rtpValueFontWeight,
    '--rtp-label-potential-family': potentialValueFontFamily,
    '--rtp-label-potential-size': `${Math.max(10, Math.round(Number(potentialValueFontSize) * 0.88))}px`,
    '--rtp-label-potential-weight': potentialValueFontWeight,
    '--rtp-label-volatility-family': volatilityValueFontFamily,
    '--rtp-label-volatility-size': `${Math.max(10, Math.round(Number(volatilityValueFontSize) * 0.88))}px`,
    '--rtp-label-volatility-weight': volatilityValueFontWeight,
    '--rtp-label-bestwin-family': bestWinValueFontFamily,
    '--rtp-label-bestwin-size': `${Math.max(10, Math.round(Number(bestWinValueFontSize) * 0.88))}px`,
    '--rtp-label-bestwin-weight': bestWinValueFontWeight,
    '--rtp-gap': `${itemGap}px`,
    '--rtp-bar-height': barHeight != null ? `${barHeight}px` : '100%',
    '--rtp-max-width': maxWidth != null ? `${maxWidth}px` : '100%',
    '--rtp-icon-bestwin': bestWinIconColor,
    '--rtp-shadow': shadow,
    '--rtp-glow': glow,
    '--rtp-blur': `${Number(backdropBlur) || 0}px`,
    ...(isNeon ? { '--rtp-accent': borderColor } : {}),
  };

  return (
    <div className={`oc-widget-inner rtp-stats-bar${styleClass}`} style={rootStyle}>
      <div className={`rtp-stats-inner ${!isLive && previewMode ? 'rtp-stats-inner--preview' : ''} ${showEmptyState ? 'rtp-stats-inner--empty' : ''}`}>

        {/* Preview badge */}
        {!isLive && previewMode && (
          <span className="rtp-stats-preview-badge">PREVIEW</span>
        )}

        {/* ═══ Left Section — Provider + Slot Name + Stats ═══ */}
        <div className="rtp-stats-left">
          {showProvider && displayProvider && (
            <>
              <RtpStatsProviderMark provider={displayProvider} logo={displayProviderLogo} />
              <div className="rtp-stats-divider" />
            </>
          )}
          <div className="rtp-stats-slot">
            {showSpinner && (
              <svg className="rtp-stats-spinner" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2a10 10 0 1 0 10 10H12V2z" opacity="0.25" />
                <path d="M22 12A10 10 0 0 1 12 22v-2a8 8 0 0 0 8-8z" />
              </svg>
            )}
            <span className="rtp-stats-slot-name">{(displaySlotName || '').toUpperCase()}</span>
          </div>

          {/* Stats inline with left section */}
          {showRtp && (
            <>
              <div className="rtp-stats-divider" />
              <div className="rtp-stats-item rtp-stats-item--rtp">
                <span className="rtp-stats-icon">⚡</span>
                <span className="rtp-stats-value">
                  <span className="rtp-stats-label">RTP </span>
                  {displayInfo?.rtp ? `${displayInfo.rtp}%` : '—'}
                </span>
              </div>
            </>
          )}

          {showPotential && (
            <div className="rtp-stats-item rtp-stats-item--potential">
              <span className="rtp-stats-icon">⚡</span>
              <span className="rtp-stats-value">
                <span className="rtp-stats-label">POTENTIAL </span>
                {fmtMultiplier(displayInfo?.max_win_multiplier)}
              </span>
            </div>
          )}

          {showVolatility && (
            <div className="rtp-stats-item rtp-stats-item--volatility">
              <span className="rtp-stats-icon">⚡</span>
              <span className="rtp-stats-value">
                <span className="rtp-stats-label">VOLATILITY </span>
                {fmtVolatility(displayInfo?.volatility)}
              </span>
            </div>
          )}
        </div>

        {/* ═══ Right Section — Best Win ═══ */}
        {showBestWin && (
          <div className="rtp-stats-right">
            <div className="rtp-stats-item rtp-stats-item--bestwin">
              <span className="rtp-stats-icon">🏆</span>
              <span className="rtp-stats-value">
                <span className="rtp-stats-label">BEST WIN </span>
                {displayBestWin?.best_win
                  ? `€${Number(displayBestWin.best_win).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : '—'}
                {displayBestWin?.best_multiplier
                  ? ` (${Number(displayBestWin.best_multiplier).toLocaleString()}x)`
                  : ''}
              </span>
              <span className="rtp-stats-value rtp-stats-value--bestwin-current">
                <span className="rtp-stats-label">BEST WIN </span>
                {displayBestWin?.best_win
                  ? `${currency}${Number(displayBestWin.best_win).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : bestWinEmptyText}
                {displayBestWin?.best_multiplier
                  ? ` (${Number(displayBestWin.best_multiplier).toLocaleString()}x)`
                  : ''}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(RtpStatsWidget);
