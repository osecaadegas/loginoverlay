/**
 * BonusHuntWidgetV12.jsx — Classic + Slot Requests
 *
 * Exact copy of the v1 Classic layout but with the bonus list at ~50% height
 * and a fully functional Slot Requests widget embedded below the list.
 * The SR section is toggleable via config.showSlotRequests.
 */
import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../config/supabaseClient';
import SlotImage from './SlotImage';
import { subElementStyle, subValue } from './shared/appearanceStyles';

const FALLBACK_SR_IMG = 'https://i.imgur.com/8E3ucNx.png';

export default function BonusHuntWidgetV12({ config, theme, userId }) {
  const c = config || {};
  const bonuses = c.bonuses || [];
  const currency = c.currency || '€';
  const startMoney = Number(c.startMoney) || 0;
  const stopLoss = Number(c.stopLoss) || 0;
  const showSR = c.showSlotRequests !== false;

  /* ─── SR phased animation state ─── */
  const [srVisible, setSrVisible] = useState(showSR);
  const [srAnim, setSrAnim] = useState('idle');
  // OFF: idle → shatter-rows → slide-down → unmount (bonus list expands)
  // ON:  mount hidden → shrink-list (bonus list shrinks) → slide-up → assemble-rows → idle
  const srTimers = useRef([]);
  const clearSrTimers = () => { srTimers.current.forEach(clearTimeout); srTimers.current = []; };

  useEffect(() => {
    if (showSR && !srVisible) {
      // turning ON → mount hidden, bonus list shrinks first, then SR slides up, then rows assemble
      setSrVisible(true);
      setSrAnim('shrink-list');
      clearSrTimers();
      srTimers.current.push(
        setTimeout(() => setSrAnim('slide-up'), 800),
        setTimeout(() => setSrAnim('assemble-rows'), 2000),
        setTimeout(() => setSrAnim('idle'), 3400)
      );
    } else if (!showSR && srVisible) {
      // turning OFF → shatter rows first, then slide container down, bonus list expands
      setSrAnim('shatter-rows');
      clearSrTimers();
      srTimers.current.push(
        setTimeout(() => setSrAnim('slide-down'), 1200),
        setTimeout(() => { setSrVisible(false); setSrAnim('idle'); }, 2400)
      );
    }
    return clearSrTimers;
  }, [showSR]);

  /* ─── Stats ─── */
  const stats = useMemo(() => {
    const totalBetAll = bonuses.reduce((s, b) => s + (Number(b.betSize) || 0), 0);
    const openedBonuses = bonuses.filter(b => b.opened);
    const totalBetOpened = openedBonuses.reduce((s, b) => s + (Number(b.betSize) || 0), 0);
    const totalWin = openedBonuses.reduce((s, b) => s + (Number(b.payout) || 0), 0);
    const totalBetRemaining = Math.max(totalBetAll - totalBetOpened, 0);
    const superCount = bonuses.filter(b => b.isSuperBonus).length;
    const extremeCount = bonuses.filter(b => b.isExtremeBonus || b.isExtreme).length;
    const target = Math.max(startMoney - stopLoss, 0);
    const remaining = Math.max(target - totalWin, 0);
    const liveBE = totalBetRemaining > 0 ? remaining / totalBetRemaining : 0;
    const avgMulti = totalBetOpened > 0 ? totalWin / totalBetOpened : 0;
    let bestSlot = null, worstSlot = null;
    openedBonuses.forEach(b => {
      const bet = Number(b.betSize) || 0;
      const pay = Number(b.payout) || 0;
      const multi = bet > 0 ? pay / bet : 0;
      if (!bestSlot || multi > (bestSlot._multi || 0)) bestSlot = { ...b, _multi: multi, _payout: pay };
      if (!worstSlot || multi < (worstSlot._multi || Infinity)) worstSlot = { ...b, _multi: multi, _payout: pay };
    });
    return { totalBetAll, totalWin, superCount, extremeCount, liveBE, avgMulti, openedCount: openedBonuses.length, bestSlot, worstSlot };
  }, [bonuses, startMoney, stopLoss]);

  /* ─── Stats flip (show front 20s → flip to back 10s → repeat) ─── */
  const [statsFlipped, setStatsFlipped] = useState(false);
  useEffect(() => {
    if (!c.bonusOpening) { setStatsFlipped(false); return; }
    let flipTimer, backTimer;
    const cycle = () => {
      setStatsFlipped(true);
      backTimer = setTimeout(() => {
        setStatsFlipped(false);
        flipTimer = setTimeout(cycle, 20000);
      }, 10000);
    };
    flipTimer = setTimeout(cycle, 20000);
    return () => { clearTimeout(flipTimer); clearTimeout(backTimer); };
  }, [c.bonusOpening]);

  /* ─── Carousel ─── */
  const [carouselIdx, setCarouselIdx] = useState(0);
  useEffect(() => {
    if (bonuses.length < 2) return;
    const id = setInterval(() => setCarouselIdx(i => (i + 1) % bonuses.length), 2500);
    return () => clearInterval(id);
  }, [bonuses.length]);

  /* ─── Slot Requests data ─── */
  const [srRequests, setSrRequests] = useState([]);
  const srMounted = useRef(true);
  // Stale-fetch guard: discard results from in-flight fetches that started
  // before a newer fetch already completed.
  const srFetchSeqRef = useRef(0);

  const fetchSR = useCallback(async () => {
    if (!userId || !showSR) return;
    const seq = ++srFetchSeqRef.current;
    const { data, error } = await supabase
      .from('slot_requests')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(20);
    if (seq !== srFetchSeqRef.current) return; // stale — discard
    if (!error && data && srMounted.current) setSrRequests(data);
  }, [userId, showSR]);

  useEffect(() => { fetchSR(); }, [fetchSR]);

  /* ── SR Realtime — channel name is distinct from BonusHuntConfig's 'bh-sr-config-{id}' ── */
  useEffect(() => {
    if (!userId || !showSR) return;
    const channel = supabase
      .channel(`bh-sr-widget-${userId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'slot_requests',
        filter: `user_id=eq.${userId}`,
      }, () => fetchSR())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchSR, userId, showSR]);

  /* ── NOTE: SR IRC listener moved to useSlotRequestListener.js (app-level) ── */

  useEffect(() => {
    srMounted.current = true;
    return () => { srMounted.current = false; };
  }, []);

  /* ─── Style vars (same as classic v1) ─── */
  const huntTitle = c.bonusOpening ? 'BONUS OPENING' : 'BONUS HUNT';
  const explicitAppearanceConfig = Object.prototype.hasOwnProperty.call(c, '__appearanceExplicitSubElements')
    ? { subElements: c.__appearanceExplicitSubElements || {} }
    : { subElements: c.subElements || {} };
  const scopedValue = (elementId, property, fallback, stateId = 'default') => subValue(explicitAppearanceConfig, elementId, property, fallback, stateId);
  const scopedValueWithLegacy = (elementId, legacyElementId, property, fallback, stateId = 'default') => scopedValue(elementId, property, scopedValue(legacyElementId, property, fallback, stateId), stateId);
  const headerColor = scopedValueWithLegacy('headerContainer', 'header', 'background', c.headerColor || '#1e3a8a');
  const headerAccent = scopedValueWithLegacy('headerContainer', 'header', 'accentColor', c.headerAccent || '#60a5fa');
  const countCardColor = scopedValue('card', 'background', c.countCardColor || '#1e3a8a');
  const currentBonusColor = scopedValue('highlight', 'background', c.currentBonusColor || '#166534');
  const currentBonusAccent = scopedValue('highlight', 'accentColor', c.currentBonusAccent || '#86efac');
  const listCardColor = scopedValue('bonusCard', 'background', c.listCardColor || '#581c87');
  const listCardAccent = scopedValue('bonusCard', 'accentColor', c.listCardAccent || '#cbd5e1');
  const summaryColor = scopedValue('value', 'background', c.summaryColor || '#1e3a8a');
  const totalPayColor = scopedValue('profit', 'background', c.totalPayColor || '#eab308');
  const totalPayText = scopedValue('profit', 'textColor', c.totalPayText || '#ffffff');
  const superBadgeColor = scopedValue('openedState', 'accentColor', c.superBadgeColor || '#eab308');
  const extremeBadgeColor = scopedValue('loss', 'accentColor', c.extremeBadgeColor || '#ef4444');
  const textColor = scopedValue('bonusCard', 'textColor', c.textColor || '#ffffff');
  const mutedTextColor = scopedValue('label', 'textColor', c.mutedTextColor || '#93c5fd');
  const statValueColor = scopedValue('value', 'textColor', c.statValueColor || '#ffffff');
  const cardOutlineColor = scopedValue('bonusCard', 'borderColor', c.cardOutlineColor || 'transparent');
  const cardOutlineWidth = scopedValue('bonusCard', 'borderWidth', c.cardOutlineWidth ?? 2);
  const fontFamily = scopedValue('container', 'fontFamily', scopedValue('bonusCard', 'fontFamily', c.fontFamily || "'Inter', sans-serif"));
  const fontSize = scopedValue('container', 'fontSize', scopedValue('bonusCard', 'fontSize', c.fontSize ?? 15));
  const cardRadius = scopedValue('bonusCard', 'radius', c.cardRadius ?? 16);
  const cardGap = scopedValue('bonusCard', 'gap', c.cardGap ?? 12);
  const cardPadding = scopedValue('bonusCard', 'padding', c.cardPadding ?? 14);
  const slotImageHeight = scopedValue('slotImage', 'height', c.slotImageHeight ?? 180);
  const listMaxHeight = c.listMaxHeight ?? 400;
  const brightness = c.brightness ?? 100;
  const contrast = c.contrast ?? 100;
  const saturation = c.saturation ?? 100;

  const scopedStyle = (elementId, fallback = {}, stateId = 'default') => subElementStyle(explicitAppearanceConfig, elementId, fallback, stateId);
  const scopedStyleWithLegacy = (elementId, legacyElementId, fallback = {}, stateId = 'default') => scopedStyle(elementId, scopedStyle(legacyElementId, fallback, stateId), stateId);
  const headerContainerStyle = scopedStyleWithLegacy('headerContainer', 'header');
  const headerIconStyle = scopedStyle('headerIcon');
  const headerTitleStyle = scopedStyleWithLegacy('headerTitle', 'huntTitle');
  const mainStatsContainerStyle = scopedStyle('mainStatsContainer');
  const statCellStyle = scopedStyle('statCell');
  const statLabelStyle = scopedStyle('statLabel');
  const tagContainerStyle = scopedStyle('tagContainer');
  const tagTextStyle = scopedStyle('tagText');
  const slotCarouselContainerStyle = scopedStyleWithLegacy('slotCarouselContainer', 'carousel');
  const slotImageStyle = scopedStyle('slotImage');
  const progressBarStyle = scopedStyle('progressBar');
  const progressBarFillStyle = scopedStyle('progressBarFill');
  const progressCountStyle = scopedStyle('progressCount');
  const slotListContainerStyle = scopedStyleWithLegacy('slotListContainer', 'bonusCard');
  const slotPositionNumberStyle = scopedStyle('slotPositionNumber');
  const slotThumbnailStyle = scopedStyle('slotThumbnail', slotImageStyle);
  const slotTitleStyle = scopedStyle('slotTitle');
  const winLabelStyle = scopedStyle('winLabel');
  const winValueStyle = scopedStyleWithLegacy('winValue', 'payoutValue');
  const multiplierLabelStyle = scopedStyle('multiplierLabel');
  const multiplierValueStyle = scopedStyle('multiplierValue');
  const betLabelStyle = scopedStyle('betLabel');
  const betValueStyle = scopedStyle('betValue');
  const requestsSectionContainerStyle = scopedStyle('requestsSectionContainer');
  const requestsHeaderStyle = scopedStyle('requestsHeader');
  const requestsDescriptionStyle = scopedStyle('requestsDescription');
  const requestsEmptyStyle = scopedStyle('requestsEmpty');
  const footerContainerStyle = scopedStyleWithLegacy('footerContainer', 'footer');
  const footerLabelStyle = scopedStyle('footerLabel');
  const footerTotalValueStyle = scopedStyleWithLegacy('footerTotalValue', 'footer');

  const currentBonus = bonuses.find(b => !b.opened);
  const currentIndex = currentBonus ? bonuses.indexOf(currentBonus) : -1;
  const isOpening = !!c.bonusOpening && currentIndex >= 0;

  const rootStyle = {
    ...scopedStyle('container', {
      fontFamily,
      fontSize: `${fontSize}px`,
      gap: `${cardGap}px`,
      background: `linear-gradient(160deg, ${headerColor}f8, ${headerColor}f0)`,
      color: textColor,
    }),
    fontFamily,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    filter: (brightness !== 100 || contrast !== 100 || saturation !== 100)
      ? `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
      : undefined,
    '--bht-header-bg': headerColor,
    '--bht-header-accent': headerAccent,
    '--bht-count-bg': countCardColor,
    '--bht-current-bg': currentBonusColor,
    '--bht-current-accent': currentBonusAccent,
    '--bht-list-bg': listCardColor,
    '--bht-list-accent': listCardAccent,
    '--bht-summary-bg': summaryColor,
    '--bht-total-pay-bg': totalPayColor,
    '--bht-total-pay-text': totalPayText,
    '--bht-super-badge': superBadgeColor,
    '--bht-extreme-badge': extremeBadgeColor,
    '--bht-text': textColor,
    '--bht-muted': mutedTextColor,
    '--bht-stat-value': statValueColor,
    '--bht-card-outline': cardOutlineColor,
    '--bht-card-outline-width': `${cardOutlineWidth}px`,
    '--bht-card-radius': `${cardRadius}px`,
    '--bht-card-padding': `${cardPadding}px`,
    '--bht-slot-img-height': `${slotImageHeight}px`,
    '--bht-list-max-height': `${listMaxHeight}px`,
    '--bht-progress-bg': subValue(c, 'progressBar', 'background', 'rgba(255,255,255,0.08)'),
    '--bht-progress-fill': subValue(c, 'progressBar', 'fillColor', currentBonusAccent),
  };

  /* ─── SR auto-scroll ─── */
  const srListRef = useRef(null);
  const srNeedsScroll = srRequests.length > 3;
  const srScrollSpeed = 20;

  return (
    <div className="oc-widget-inner oc-bonushunt oc-bonushunt--v12" data-widget-element="container" style={{ ...rootStyle, height: '100%' }}>

      {/* ═══ Header — Classic full-card flip ═══ */}
      <div className="bht-card bht-header bht-header--fullflip" data-widget-element="headerContainer" style={{ ...headerContainerStyle, flex: '0 0 auto' }}>
        <div className={`bht-fullflip-container${statsFlipped ? ' bht-fullflip-container--flipped' : ''}`}>
          <div className="bht-fullflip-face bht-fullflip-front">
            <div className="bht-header-center">
              {c.avatarUrl ? (
                <img src={c.avatarUrl} alt="" className="bht-header-avatar" data-widget-element="headerIcon" style={headerIconStyle}
                  onError={e => { e.target.style.display = 'none'; }} />
              ) : (
                <div className="bht-icon-circle" data-widget-element="headerIcon" style={headerIconStyle}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" />
                  </svg>
                </div>
              )}
              <div className="bht-title" data-widget-element="headerTitle" style={headerTitleStyle}>{huntTitle}</div>
            </div>
            <div className="bht-header-stats bht-header-stats--4col" data-widget-element="mainStatsContainer" style={mainStatsContainerStyle}>
              <div className="bht-flip-face bht-flip-front">
                <div className="bht-stat-box" data-widget-element="statCell" style={statCellStyle}>
                  <div className="bht-stat-label" data-widget-element="statLabel" style={statLabelStyle}>START</div>
                  <div className="bht-stat-value" data-widget-element="statValue" style={scopedStyle('statValue')}>{currency}{startMoney.toFixed(0)}</div>
                </div>
                <div className="bht-stat-box" data-widget-element="statCell" style={statCellStyle}>
                  <div className="bht-stat-label" data-widget-element="statLabel" style={statLabelStyle}>STOP</div>
                  <div className="bht-stat-value" data-widget-element="statValue" style={scopedStyle('statValue')}>{currency}{stopLoss.toFixed(0)}</div>
                </div>
                <div className="bht-stat-box" data-widget-element="statCell" style={statCellStyle}>
                  <div className="bht-stat-label" data-widget-element="statLabel" style={statLabelStyle}>B.E.</div>
                  <div className="bht-stat-value" data-widget-element="statValue" style={scopedStyle('statValue', { color: stats.liveBE >= 100 ? '#f87171' : '#4ade80' }, stats.liveBE >= 100 ? 'negative' : 'positive')}>{stats.liveBE.toFixed(0)}x</div>
                </div>
                <div className="bht-stat-box" data-widget-element="statCell" style={statCellStyle}>
                  <div className="bht-stat-label" data-widget-element="statLabel" style={statLabelStyle}>AVG</div>
                  <div className="bht-stat-value" data-widget-element="statValue" style={scopedStyle('statValue', { color: stats.avgMulti >= 100 ? '#4ade80' : '#f87171' }, stats.avgMulti >= 100 ? 'positive' : 'negative')}>{stats.avgMulti.toFixed(0)}x</div>
                </div>
              </div>
            </div>
            {(stats.superCount > 0 || stats.extremeCount > 0) && (
              <div className="bht-badge-pills">
                {stats.superCount > 0 && (
                  <span className="bht-badge-pill bht-badge-pill--super" data-widget-element="tagContainer" style={{ ...tagContainerStyle, ...tagTextStyle }}>
                    {stats.superCount} SUPER
                  </span>
                )}
                {stats.extremeCount > 0 && (
                  <span className="bht-badge-pill bht-badge-pill--extreme" data-widget-element="tagContainer" style={{ ...tagContainerStyle, ...tagTextStyle }}>
                    {stats.extremeCount} EXTREME
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="bht-fullflip-face bht-fullflip-back">
            <div className="bht-flipback-layout">
              {/* Best side card (stats + image) */}
              <div className="bht-flipback-side">
                <div className="bht-flipback-stats">
                  <div className="bht-flipback-stat-label" data-widget-element="winLabel" style={winLabelStyle}>PAYOUT</div>
                  <div className="bht-flipback-stat-val" data-widget-element="winValue" style={scopedStyleWithLegacy('winValue', 'payoutValue', { color: '#4ade80' }, 'positive')}>{stats.bestSlot ? `${currency}${stats.bestSlot._payout.toFixed(0)}` : '—'}</div>
                  <div className="bht-flipback-stat-label" data-widget-element="multiplierLabel" style={multiplierLabelStyle}>MULTI</div>
                  <div className="bht-flipback-stat-val" data-widget-element="multiplierValue" style={multiplierValueStyle}>{stats.bestSlot ? `${stats.bestSlot._multi.toFixed(1)}x` : '—'}</div>
                  <div className="bht-flipback-stat-label" data-widget-element="betLabel" style={betLabelStyle}>BET</div>
                  <div className="bht-flipback-stat-val" data-widget-element="betValue" style={betValueStyle}>{stats.bestSlot ? `${currency}${(Number(stats.bestSlot.betSize) || 0).toFixed(2)}` : '—'}</div>
                </div>
                {stats.bestSlot ? (
                  <div className="bht-flipback-slot bht-flipback-slot--best">
                    {stats.bestSlot.slot?.image ? (
                      <SlotImage src={stats.bestSlot.slot.image} alt={stats.bestSlot.slotName || stats.bestSlot.slot?.name} className="bht-flipback-slot-img" data-widget-element="slotImage" style={slotImageStyle} />
                    ) : <div className="bht-flipback-slot-placeholder">🎰</div>}
                  </div>
                ) : <div className="bht-flipback-slot bht-flipback-slot--empty">—</div>}
              </div>
              {/* Center divider */}
              <div className="bht-flipback-divider" />
              {/* Worst side card (image + stats) */}
              <div className="bht-flipback-side">
                {stats.worstSlot ? (
                  <div className="bht-flipback-slot bht-flipback-slot--worst">
                    {stats.worstSlot.slot?.image ? (
                      <SlotImage src={stats.worstSlot.slot.image} alt={stats.worstSlot.slotName || stats.worstSlot.slot?.name} className="bht-flipback-slot-img" data-widget-element="slotImage" style={slotImageStyle} />
                    ) : <div className="bht-flipback-slot-placeholder">🎰</div>}
                  </div>
                ) : <div className="bht-flipback-slot bht-flipback-slot--empty">—</div>}
                <div className="bht-flipback-stats">
                  <div className="bht-flipback-stat-label" data-widget-element="winLabel" style={winLabelStyle}>PAYOUT</div>
                  <div className="bht-flipback-stat-val" data-widget-element="winValue" style={scopedStyleWithLegacy('winValue', 'payoutValue', { color: '#f87171' }, 'negative')}>{stats.worstSlot ? `${currency}${stats.worstSlot._payout.toFixed(0)}` : '—'}</div>
                  <div className="bht-flipback-stat-label" data-widget-element="multiplierLabel" style={multiplierLabelStyle}>MULTI</div>
                  <div className="bht-flipback-stat-val" data-widget-element="multiplierValue" style={multiplierValueStyle}>{stats.worstSlot ? `${stats.worstSlot._multi.toFixed(1)}x` : '—'}</div>
                  <div className="bht-flipback-stat-label" data-widget-element="betLabel" style={betLabelStyle}>BET</div>
                  <div className="bht-flipback-stat-val" data-widget-element="betValue" style={betValueStyle}>{stats.worstSlot ? `${currency}${(Number(stats.worstSlot.betSize) || 0).toFixed(2)}` : '—'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Bonus List ═══ */}
      {bonuses.length > 0 && (
        <div className="bht-card bht-list-card" data-widget-element="slotListContainer" style={{ ...slotListContainerStyle, flex: srVisible && srAnim !== 'slide-down' && srAnim !== 'shrink-list' ? '3 1 0' : '1 1 0', minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'flex 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }}>
          {/* ── 3D Animated Card Carousel ── */}
          <div className={`bht-stack${!isOpening ? ' bht-stack--spinning' : ''}`} data-widget-element="slotCarouselContainer" style={slotCarouselContainerStyle}>
            {(() => {
              const total = bonuses.length;
              if (total === 0) return null;
              const ci = isOpening && currentIndex >= 0 ? currentIndex : carouselIdx % total;
              const posMap = { '-2': 'bht-stack-card--far-left', '-1': 'bht-stack-card--left', '0': 'bht-stack-card--center', '1': 'bht-stack-card--right', '2': 'bht-stack-card--far-right' };
              return bonuses.map((bonus, bIdx) => {
                const rawDist = ((bIdx - ci) % total + total) % total;
                const dist = rawDist <= Math.floor(total / 2) ? rawDist : rawDist - total;
                const posCls = posMap[String(dist)] || 'bht-stack-card--hidden';
                return (
                  <div key={`stk-${bIdx}`}
                    className={`bht-stack-card ${posCls}${bonus.opened ? ' bht-stack-card--opened' : ''}${bonus.isSuperBonus ? ' bht-stack-card--super' : ''}${(bonus.isExtremeBonus || bonus.isExtreme) ? ' bht-stack-card--extreme' : ''}`}>
                    <div className="bht-stack-card-inner">
                      <div className="bht-stack-card-img-wrap">
                        {bonus.slot?.image ? (
                          <SlotImage src={bonus.slot.image} alt={bonus.slotName || bonus.slot?.name} className="bht-stack-card-img" data-widget-element="slotImage" style={slotImageStyle} />
                        ) : <div className="bht-stack-card-img-ph" />}
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
          {/* ── Progress bar ── */}
          {(() => {
            const total = bonuses.length;
            const opened = bonuses.filter(b => b.opened).length;
            const pct = total > 0 ? (opened / total) * 100 : 0;
            return (
              <div className="bht-progress">
                <div className="bht-progress-bar" data-widget-element="progressBar" style={progressBarStyle}>
                  <div className="bht-progress-fill" data-widget-element="progressBarFill" style={{ ...progressBarFillStyle, width: `${pct}%` }} />
                </div>
                <span className="bht-progress-text" data-widget-element="progressCount" style={progressCountStyle}>{opened}/{total}</span>
              </div>
            );
          })()}
          {/* ── Vertical list rows (half-height) ── */}
          <div className="bht-list-rows" data-widget-element="slotListContainer" style={{ flex: '1 1 0', minHeight: 0, overflow: 'hidden', position: 'relative' }}>
            <div className="bht-list-fade bht-list-fade--top" />
            <div className="bht-list-fade bht-list-fade--bottom" />
            {(() => {
              const itemH = 48, count = bonuses.length;
              const shouldScroll = count >= 4;
              if (!shouldScroll) {
                return (
                  <div key="lr-static" className="bht-list-rows-track">
                    {bonuses.map((bonus, i) => {
                      const payout = Number(bonus.payout) || 0;
                      const bet = Number(bonus.betSize) || 0;
                      const multi = bet > 0 ? payout / bet : 0;
                      return (
                        <div key={`lr-${bonus.id || i}-o`}
                          className={`bht-list-row${i === currentIndex ? ' bht-list-row--active' : ''}${bonus.opened ? ' bht-list-row--opened' : ''}${bonus.isSuperBonus ? ' bht-list-row--super' : ''}${bonus.isExtremeBonus || bonus.isExtreme ? ' bht-list-row--extreme' : ''}`}
                          data-widget-element="slotRow"
                          style={scopedStyle('slotRow', {}, i === currentIndex ? 'active' : bonus.opened ? 'opened' : 'default')}>
                          <span className="bht-list-row-idx" data-widget-element="slotPositionNumber" style={slotPositionNumberStyle}>{i + 1}</span>
                          <div className="bht-list-row-thumb" data-widget-element="slotThumbnail" style={slotThumbnailStyle}>
                            {bonus.slot?.image ? (
                              <SlotImage src={bonus.slot.image} alt={bonus.slotName || bonus.slot?.name} className="bht-list-row-img" data-widget-element="slotImage" style={slotImageStyle} />
                            ) : <div className="bht-list-row-img-ph" />}
                          </div>
                          <div className="bht-list-row-info">
                            <span className="bht-list-row-name" data-widget-element="slotTitle" style={slotTitleStyle}>{bonus.slotName || bonus.slot?.name}</span>
                            {bonus.requestedBy && bonus.requestedBy !== 'anonymous' && (
                              <span className="bht-list-row-requester" data-widget-element="requestsDescription" style={requestsDescriptionStyle}>by {bonus.requestedBy}</span>
                            )}
                          </div>
                          <div className="bht-list-row-stats">
                            <div className="bht-list-row-col">
                              <span className="bht-list-row-col-label" data-widget-element="winLabel" style={winLabelStyle}>WIN</span>
                              <span className="bht-list-row-col-val" data-widget-element="winValue" style={winValueStyle}>{currency}{payout.toFixed(0)}</span>
                            </div>
                            <div className="bht-list-row-col">
                              <span className="bht-list-row-col-label" data-widget-element="multiplierLabel" style={multiplierLabelStyle}>MULTI</span>
                              <span className="bht-list-row-col-val" data-widget-element="multiplierValue" style={multiplierValueStyle}>{multi.toFixed(1)}x</span>
                            </div>
                            <div className="bht-list-row-col">
                              <span className="bht-list-row-col-label" data-widget-element="betLabel" style={betLabelStyle}>BET</span>
                              <span className="bht-list-row-col-val" data-widget-element="betValue" style={betValueStyle}>{currency}{bet.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              }
              const renderRow = (bonus, idx, key) => {
                const payout = Number(bonus.payout) || 0;
                const bet = Number(bonus.betSize) || 0;
                const multi = bet > 0 ? payout / bet : 0;
                return (
                  <div key={key}
                    className={`bht-list-row${idx === currentIndex ? ' bht-list-row--active' : ''}${bonus.opened ? ' bht-list-row--opened' : ''}${bonus.isSuperBonus ? ' bht-list-row--super' : ''}${bonus.isExtremeBonus || bonus.isExtreme ? ' bht-list-row--extreme' : ''}`}
                    data-widget-element="slotRow"
                    style={scopedStyle('slotRow', {}, idx === currentIndex ? 'active' : bonus.opened ? 'opened' : 'default')}>
                    <span className="bht-list-row-idx" data-widget-element="slotPositionNumber" style={slotPositionNumberStyle}>{idx + 1}</span>
                    <div className="bht-list-row-thumb" data-widget-element="slotThumbnail" style={slotThumbnailStyle}>
                      {bonus.slot?.image ? (
                        <SlotImage src={bonus.slot.image} alt={bonus.slotName || bonus.slot?.name} className="bht-list-row-img" data-widget-element="slotImage" style={slotImageStyle} />
                      ) : <div className="bht-list-row-img-ph" />}
                    </div>
                    <div className="bht-list-row-info">
                      <span className="bht-list-row-name" data-widget-element="slotTitle" style={slotTitleStyle}>{bonus.slotName || bonus.slot?.name}</span>
                      {bonus.requestedBy && bonus.requestedBy !== 'anonymous' && (
                        <span className="bht-list-row-requester" data-widget-element="requestsDescription" style={requestsDescriptionStyle}>by {bonus.requestedBy}</span>
                      )}
                    </div>
                    <div className="bht-list-row-stats">
                      <div className="bht-list-row-col">
                        <span className="bht-list-row-col-label" data-widget-element="winLabel" style={winLabelStyle}>WIN</span>
                        <span className="bht-list-row-col-val" data-widget-element="winValue" style={winValueStyle}>{currency}{payout.toFixed(0)}</span>
                      </div>
                      <div className="bht-list-row-col">
                        <span className="bht-list-row-col-label" data-widget-element="multiplierLabel" style={multiplierLabelStyle}>MULTI</span>
                        <span className="bht-list-row-col-val" data-widget-element="multiplierValue" style={multiplierValueStyle}>{multi.toFixed(1)}x</span>
                      </div>
                      <div className="bht-list-row-col">
                        <span className="bht-list-row-col-label" data-widget-element="betLabel" style={betLabelStyle}>BET</span>
                        <span className="bht-list-row-col-val" data-widget-element="betValue" style={betValueStyle}>{currency}{bet.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                );
              };
              return (
                <div key="lr-scroll" className="bht-list-rows-track bht-list-rows-track--scroll"
                  style={{ '--bht-item-count': count + 1 }}>
                  {bonuses.map((b, i) => renderRow(b, i, `lr-${b.id || i}-o`))}
                  <div key="lr-spacer-a" className="bht-list-row-spacer" />
                  {bonuses.map((b, i) => renderRow(b, i, `lr-${b.id || i}-c`))}
                  <div key="lr-spacer-b" className="bht-list-row-spacer" />
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ═══ Slot Requests Section ═══ */}
      {srVisible && (
        <div className={`bht-card bht-v12-sr bht-v12-sr--${srAnim}`}
          data-widget-element="requestsSectionContainer"
          style={{
            ...requestsSectionContainerStyle,
            flex: (srAnim === 'slide-down' || srAnim === 'shrink-list') ? '0 0 0px' : '1 1 0',
            minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column',
            transition: 'flex 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}>
          <div className="bht-v12-sr-header" data-widget-element="requestsHeader" style={requestsHeaderStyle}>
            <span className="bht-v12-sr-icon">🎰</span>
            <span className="bht-v12-sr-title" data-widget-element="requestsHeader" style={requestsHeaderStyle}>Slot Requests</span>
            {srRequests.length > 0 && (
              <span className="bht-v12-sr-count" data-widget-element="tagContainer" style={{ ...tagContainerStyle, ...tagTextStyle }}>{srRequests.length}</span>
            )}
          </div>
          <div className="bht-v12-sr-list" ref={srListRef}>
            <div className="bht-list-fade bht-list-fade--top" />
            {srRequests.length === 0 ? (
              <div className="bht-v12-sr-empty" data-widget-element="requestsEmpty" style={requestsEmptyStyle}>
                <span className="bht-v12-sr-hint" data-widget-element="requestsDescription" style={requestsDescriptionStyle}>Type <strong>{c.commandTrigger || '!sr'} &lt;slot name&gt;</strong> in chat to request a slot</span>
              </div>
            ) : (
              <div className={`sr-min-scroll-track${srNeedsScroll ? ' sr-min-scroll-track--animate' : ''}`}
                style={srNeedsScroll ? { '--sr-scroll-duration': `${Math.max(8, srRequests.length * srScrollSpeed / 3)}s` } : undefined}>
                {[...(srNeedsScroll ? [0, 1] : [0])].map(setIdx =>
                  srRequests.map((r, i) => (
                    <div key={`${setIdx}-${r.id}`} className="bht-v12-sr-row" data-widget-element="slotRow" style={scopedStyle('slotRow')}>
                      <div className="bht-v12-sr-row-bg"
                        style={{ backgroundImage: `url(${r.slot_image || FALLBACK_SR_IMG})` }} />
                      <div className="bht-v12-sr-row-overlay" />
                      <div className="bht-v12-sr-row-content">
                        <span className="bht-v12-sr-row-idx" data-widget-element="slotPositionNumber" style={slotPositionNumberStyle}>{i + 1}</span>
                        <SlotImage src={r.slot_image || FALLBACK_SR_IMG} alt={r.slot_name}
                          className="bht-v12-sr-row-img"
                          data-widget-element="slotThumbnail"
                          style={slotThumbnailStyle}
                        />
                        <div className="bht-v12-sr-row-info">
                          <span className="bht-v12-sr-row-name" data-widget-element="slotTitle" style={slotTitleStyle}>{r.slot_name}</span>
                          {r.requested_by && r.requested_by !== 'anonymous' && (
                            <span className="bht-v12-sr-row-by" data-widget-element="requestsDescription" style={requestsDescriptionStyle}>by {r.requested_by}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
            <div className="bht-list-fade bht-list-fade--bottom" />
          </div>
        </div>
      )}

      {/* ═══ Total Pay Footer ═══ */}
      <div className="bht-card bht-footer" data-widget-element="footerContainer" style={{ ...footerContainerStyle, flex: '0 0 auto' }}>
        <div className="bht-footer-flip-wrap">
          <div className={`bht-footer-flip${statsFlipped ? ' bht-footer-flip--flipped' : ''}`}>
            <div className="bht-footer-flip-face bht-footer-flip-front">
              <span className="bht-footer-label" data-widget-element="footerLabel" style={footerLabelStyle}>TOTAL PAY</span>
              <span className="bht-footer-value" data-widget-element="footerTotalValue" style={footerTotalValueStyle}>{currency}{stats.totalWin.toFixed(2)}</span>
            </div>
            <div className="bht-footer-flip-face bht-footer-flip-back">
              {(() => {
                const target = Math.max(startMoney - stopLoss, 0);
                const profit = stats.totalWin - target;
                const isProfit = profit >= 0;
                return (
                  <>
                    <span className="bht-footer-label" data-widget-element="footerLabel" style={footerLabelStyle}>{isProfit ? 'PROFIT' : 'LOSS'}</span>
                    <span className="bht-footer-value" data-widget-element="footerTotalValue" style={scopedStyleWithLegacy('footerTotalValue', 'footer', { color: isProfit ? '#4ade80' : '#f87171' }, isProfit ? 'success' : 'error')}>
                      {isProfit ? '+' : ''}{currency}{profit.toFixed(2)}
                    </span>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
