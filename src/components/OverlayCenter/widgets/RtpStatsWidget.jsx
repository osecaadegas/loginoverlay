import React, { useMemo, useState, useEffect, useRef } from 'react';
import { supabase } from '../../../config/supabaseClient';

/* ─── Fetch slot info from the database (slots table) ─── */
async function fetchSlotFromDB(name) {
  if (!name) return null;
  const normalized = name.trim();

  try {
    // 1. Exact match (case-insensitive via ilike)
    let { data, error } = await supabase
      .from('slots')
      .select('name, provider, image, rtp, volatility, max_win_multiplier, reels, min_bet, max_bet, features')
      .ilike('name', normalized)
      .limit(1)
      .single();

    if (!error && data) return { ...data, source: 'database', confidence: 'high' };

    // 2. Fuzzy match (contains)
    ({ data, error } = await supabase
      .from('slots')
      .select('name, provider, image, rtp, volatility, max_win_multiplier, reels, min_bet, max_bet, features')
      .ilike('name', `%${normalized}%`)
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

/* ─── Main widget ─── */
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
  const previewSlot = bhConfig.previewSlotName || '';
  const slotName = previewSlot
    || (bonusOpening && currentBonus?.slotName ? currentBonus.slotName : '')
    || tournamentSlotName || currentBonus?.slotName || '';

  /* ── Slot info from DB (primary) or API (fallback) ── */
  const [slotInfo, setSlotInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const lastSlotRef = useRef('');

  useEffect(() => {
    if (!slotName || slotName === lastSlotRef.current) return;
    lastSlotRef.current = slotName;
    let cancelled = false;

    async function lookup() {
      setLoading(true);
      // 1. Try database first
      const dbResult = await fetchSlotFromDB(slotName);
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
  }, [slotName]);

  /* ── Best win for this slot (from user_slot_records) ── */
  const [bestWinData, setBestWinData] = useState(null);

  // Fallback: read bestWin cached in widget config (works in OBS where DB is blocked by RLS)
  const configBestWin = useMemo(() => {
    if (!slotName) return null;
    // Check own widget config first (persisted by dashboard fetch)
    if (c._cachedBestWin?.slotName === slotName && c._cachedBestWin?.best_win) {
      return { best_win: c._cachedBestWin.best_win, best_multiplier: c._cachedBestWin.best_multiplier || 0 };
    }
    // Fallback: check single_slot widgets
    if (!allWidgets) return null;
    const ssWidget = allWidgets.find(w =>
      (w.widget_type === 'single_slot' || w.widget_type === 'current_slot') &&
      w.config?.slotName === slotName && w.config?.bestWin
    );
    if (ssWidget?.config?.bestWin) {
      return { best_win: ssWidget.config.bestWin, best_multiplier: ssWidget.config.bestMulti || 0 };
    }
    return null;
  }, [slotName, c._cachedBestWin, allWidgets]);

  // Persist bestWin to widget config so OBS can read it (OBS has no auth → can't query DB)
  const persistRef = useRef('');
  const configRef = useRef(c);
  configRef.current = c;
  useEffect(() => {
    if (!bestWinData || !widgetId || !slotName) return;
    const key = `${slotName}:${bestWinData.best_win}:${bestWinData.best_multiplier}`;
    if (persistRef.current === key) return; // already persisted
    persistRef.current = key;
    const latest = configRef.current;
    supabase
      .from('overlay_widgets')
      .update({ config: { ...latest, _cachedBestWin: { slotName, best_win: bestWinData.best_win, best_multiplier: bestWinData.best_multiplier } } })
      .eq('id', widgetId)
      .then(); // fire-and-forget
  }, [bestWinData, widgetId, slotName]);

  // Fetch best win on slot change + subscribe to realtime updates
  useEffect(() => {
    if (!slotName || !userId) { setBestWinData(null); return; }
    let cancelled = false;

    async function fetchBestWin() {
      try {
        const { data } = await supabase
          .from('user_slot_records')
          .select('best_win, best_multiplier')
          .eq('user_id', userId)
          .eq('slot_name', slotName)
          .maybeSingle();
        if (!cancelled && data) setBestWinData(data);
      } catch {
        // DB fetch failed (e.g. RLS in OBS) — configBestWin fallback will be used
      }
    }

    fetchBestWin();

    // Subscribe to changes so bestWin updates live when a new result is recorded
    const channel = supabase
      .channel(`bestwin_${userId}_${slotName}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_slot_records',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        const rec = payload.new;
        if (rec && rec.slot_name === slotName) {
          setBestWinData({ best_win: rec.best_win, best_multiplier: rec.best_multiplier });
        }
      })
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [slotName, userId]);

  /* ── Style config ── */
  const displayStyle = c.displayStyle || 'v1';
  const isVertical = displayStyle === 'vertical';
  const isNeon = displayStyle === 'neon';
  const isMinimal = displayStyle === 'minimal';
  const isGlassStyle = displayStyle === 'glass';
  const barBgFrom = c.barBgFrom || (isNeon ? '#050510' : isMinimal ? '#0a0a14' : isGlassStyle ? '#0f172a' : '#111827');
  const barBgVia = c.barBgVia || (isNeon ? '#0a0a2e' : isMinimal ? '#0a0a14' : isGlassStyle ? '#1e293b' : '#1e3a5f');
  const barBgTo = c.barBgTo || (isNeon ? '#050510' : isMinimal ? '#0a0a14' : isGlassStyle ? '#0f172a' : '#111827');
  const borderColor = c.borderColor || (isNeon ? '#00ffcc' : isMinimal ? 'rgba(255,255,255,0.08)' : isGlassStyle ? 'rgba(255,255,255,0.2)' : '#1d4ed8');
  const borderWidth = c.borderWidth ?? (isMinimal ? 0 : isNeon ? 1 : isGlassStyle ? 1 : 1);
  const borderRadius = c.borderRadius ?? (isMinimal ? 4 : isGlassStyle ? 16 : 8);
  const textColor = c.textColor || '#ffffff';
  const providerColor = c.providerColor || '#ffffff';
  const slotNameColor = c.slotNameColor || '#ffffff';
  const labelColor = c.labelColor || '#94a3b8';
  const rtpIconColor = c.rtpIconColor || '#60a5fa';
  const potentialIconColor = c.potentialIconColor || '#facc15';
  const volatilityIconColor = c.volatilityIconColor || '#3b82f6';
  const dividerColor = c.dividerColor || '#3b82f6';
  const fontFamily = c.fontFamily || "'Inter', sans-serif";
  const fontSize = c.fontSize ?? 14;
  const providerFontSize = c.providerFontSize ?? 16;
  const paddingX = c.paddingX ?? 16;
  const paddingY = c.paddingY ?? 8;
  const brightness = c.brightness ?? 100;
  const contrast = c.contrast ?? 100;
  const saturation = c.saturation ?? 100;
  const showSpinner = c.showSpinner !== false;
  const showProvider = c.showProvider !== false;
  const showRtp = c.showRtp !== false;
  const showPotential = c.showPotential !== false;
  const showVolatility = c.showVolatility !== false;
  const showBestWin = c.showBestWin !== false;
  const bestWinIconColor = c.bestWinIconColor || '#22c55e';
  const spinnerColor = c.spinnerColor || '#60a5fa';
  const previewMode = c.previewMode === true;

  /* ── Determine what to display ── */
  const isLive = bonusOpening && !!currentBonus;

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
    ? (slotInfo?.provider || currentBonus?.slot?.provider || '')
    : (showDemoData ? demoProvider : '');
  const displayInfo = isLive ? slotInfo : (showDemoData ? demoInfo : null);
  const displayBestWin = isLive ? (bestWinData || configBestWin) : (showDemoData ? demoBestWin : null);

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
    '--rtp-icon-rtp': rtpIconColor,
    '--rtp-icon-potential': potentialIconColor,
    '--rtp-icon-volatility': volatilityIconColor,
    '--rtp-divider': dividerColor,
    '--rtp-spinner': spinnerColor,
    '--rtp-px': `${paddingX}px`,
    '--rtp-py': `${paddingY}px`,
    '--rtp-provider-size': `${providerFontSize}px`,
    '--rtp-icon-bestwin': bestWinIconColor,
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
              <span className="rtp-stats-provider">{displayProvider.toUpperCase()}</span>
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(RtpStatsWidget);
