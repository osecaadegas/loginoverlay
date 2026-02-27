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
export default function RtpStatsWidget({ config, theme, allWidgets }) {
  const c = config || {};

  /* ── Find bonus hunt widget ── */
  const bhWidget = useMemo(() => {
    return (allWidgets || []).find(w =>
      w.widget_type === 'bonus_hunt' && w.config
    );
  }, [allWidgets]);

  const bhConfig = bhWidget?.config || {};
  const bonusOpening = bhConfig.bonusOpening === true;
  const bonuses = bhConfig.bonuses || [];

  /* ── Current bonus (first unopened) ── */
  const currentBonus = useMemo(() => bonuses.find(b => !b.opened), [bonuses]);
  const slotName = currentBonus?.slotName || '';

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

  /* ── Style config ── */
  const barBgFrom = c.barBgFrom || '#111827';
  const barBgVia = c.barBgVia || '#1e3a5f';
  const barBgTo = c.barBgTo || '#111827';
  const borderColor = c.borderColor || '#1d4ed8';
  const borderWidth = c.borderWidth ?? 1;
  const borderRadius = c.borderRadius ?? 8;
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
  const spinnerColor = c.spinnerColor || '#60a5fa';
  const previewMode = c.previewMode === true;

  /* ── Determine what to display ── */
  const isLive = bonusOpening && !!currentBonus;

  /* ── Demo data for preview / empty state ── */
  const demoSlotName = 'SWEET BONANZA';
  const demoProvider = 'PRAGMATIC PLAY';
  const demoInfo = { rtp: 96.48, max_win_multiplier: 21175, volatility: 'high' };

  /* ── When not live, show empty bar with dashes (widget stays visible in OBS) ── */
  const showDemoData = previewMode && !isLive;
  const showEmptyState = !isLive && !previewMode;

  const displaySlotName = isLive ? slotName : (showDemoData ? demoSlotName : '—');
  const displayProvider = isLive
    ? (slotInfo?.provider || currentBonus?.slot?.provider || '')
    : (showDemoData ? demoProvider : '');
  const displayInfo = isLive ? slotInfo : (showDemoData ? demoInfo : null);

  const rootStyle = {
    fontFamily,
    fontSize: `${fontSize}px`,
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
  };

  return (
    <div className="oc-widget-inner rtp-stats-bar" style={rootStyle}>
      <div className={`rtp-stats-inner ${!isLive && previewMode ? 'rtp-stats-inner--preview' : ''} ${showEmptyState ? 'rtp-stats-inner--empty' : ''}`}>

        {/* Preview badge */}
        {!isLive && previewMode && (
          <span className="rtp-stats-preview-badge">PREVIEW</span>
        )}

        {/* ═══ Left Section — Provider + Slot Name ═══ */}
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
        </div>

        {/* ═══ Right Section — RTP / Potential / Volatility ═══ */}
        <div className="rtp-stats-right">
          {showRtp && (
            <div className="rtp-stats-item rtp-stats-item--rtp">
              <span className="rtp-stats-icon">⚡</span>
              <span className="rtp-stats-value">
                <span className="rtp-stats-label">RTP </span>
                {displayInfo?.rtp ? `${displayInfo.rtp}%` : '—'}
              </span>
            </div>
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
      </div>
    </div>
  );
}
