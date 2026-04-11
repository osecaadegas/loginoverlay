/**
 * BonusHuntWidgetV12.jsx — Classic + Slot Requests
 *
 * Exact copy of the v1 Classic layout but with the bonus list at ~50% height
 * and a fully functional Slot Requests widget embedded below the list.
 * The SR section is toggleable via config.showSlotRequests.
 */
import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../config/supabaseClient';
import useTwitchChannel from '../../../hooks/useTwitchChannel';

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
    const id = setInterval(() => setCarouselIdx(i => (i + 1) % bonuses.length), 3500);
    return () => clearInterval(id);
  }, [bonuses.length]);

  /* ─── Slot Requests data ─── */
  const [srRequests, setSrRequests] = useState([]);
  const srMounted = useRef(true);
  const srWsRef = useRef(null);
  const srReconnect = useRef(null);
  const srDedup = useRef(new Map());

  const fetchSR = useCallback(async () => {
    if (!userId || !showSR) return;
    const { data, error } = await supabase
      .from('slot_requests')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(20);
    if (!error && data && srMounted.current) setSrRequests(data);
  }, [userId, showSR]);

  useEffect(() => { fetchSR(); }, [fetchSR]);

  /* ── SR Realtime ── */
  useEffect(() => {
    if (!userId || !showSR) return;
    const channel = supabase
      .channel(`bh-sr-${userId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'slot_requests',
        filter: `user_id=eq.${userId}`,
      }, () => fetchSR())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchSR, userId, showSR]);

  /* ── SR IRC listener ── */
  const srChatEnabled = showSR && c.srChatEnabled !== false;
  const cmdTrigger = (c.commandTrigger || '!sr').trim().toLowerCase();

  // Auto-resolve Twitch channel from auth
  const twitchChannel = useTwitchChannel();

  useEffect(() => {
    if (!srChatEnabled || !twitchChannel || !userId) {
      if (srWsRef.current) { srWsRef.current.close(); srWsRef.current = null; }
      return;
    }
    let alive = true;
    const escaped = cmdTrigger.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const cmdRegex = new RegExp(`:([\\w]+)![\\w]+@[\\w.]+\\.tmi\\.twitch\\.tv PRIVMSG #\\w+ :${escaped}\\s+(.+)`, 'i');

    const connect = () => {
      if (!alive) return;
      const ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
      srWsRef.current = ws;
      ws.onopen = () => {
        ws.send('PASS SCHMOOPIIE');
        ws.send('NICK justinfan' + Math.floor(Math.random() * 100000));
        ws.send('JOIN #' + twitchChannel);
      };
      ws.onmessage = async (event) => {
        for (const line of event.data.split('\r\n')) {
          if (line.startsWith('PING')) { ws.send('PONG :tmi.twitch.tv'); continue; }
          const m = line.match(cmdRegex);
          if (m) {
            const requester = m[1];
            const slotName = m[2].trim();
            if (slotName) {
              const dedupKey = `${requester.toLowerCase()}|${slotName.toLowerCase()}`;
              const now = Date.now();
              if (srDedup.current.has(dedupKey) && now - srDedup.current.get(dedupKey) < 15000) continue;
              srDedup.current.set(dedupKey, now);
              if (srDedup.current.size > 50) {
                for (const [k, t] of srDedup.current) { if (now - t > 30000) srDedup.current.delete(k); }
              }
              try {
                await fetch(`${window.location.origin}/api/chat-commands?cmd=sr&user_id=${encodeURIComponent(userId)}&requester=${encodeURIComponent(requester)}&slot=${encodeURIComponent(slotName)}`);
              } catch (err) { console.error('[V12-SR-IRC]', err); }
            }
          }
        }
      };
      ws.onclose = () => { if (alive) srReconnect.current = setTimeout(connect, 5000); };
      ws.onerror = () => ws.close();
    };

    const debounce = setTimeout(connect, 600);
    return () => {
      alive = false;
      clearTimeout(debounce);
      clearTimeout(srReconnect.current);
      if (srWsRef.current) { srWsRef.current.close(); srWsRef.current = null; }
    };
  }, [srChatEnabled, twitchChannel, cmdTrigger, userId]);

  useEffect(() => {
    srMounted.current = true;
    return () => { srMounted.current = false; };
  }, []);

  /* ─── Style vars (same as classic v1) ─── */
  const huntTitle = c.bonusOpening ? 'BONUS OPENING' : 'BONUS HUNT';
  const headerColor = c.headerColor || '#1e3a8a';
  const headerAccent = c.headerAccent || '#60a5fa';
  const countCardColor = c.countCardColor || '#1e3a8a';
  const currentBonusColor = c.currentBonusColor || '#166534';
  const currentBonusAccent = c.currentBonusAccent || '#86efac';
  const listCardColor = c.listCardColor || '#581c87';
  const listCardAccent = c.listCardAccent || '#d8b4fe';
  const summaryColor = c.summaryColor || '#1e3a8a';
  const totalPayColor = c.totalPayColor || '#eab308';
  const totalPayText = c.totalPayText || '#ffffff';
  const superBadgeColor = c.superBadgeColor || '#eab308';
  const extremeBadgeColor = c.extremeBadgeColor || '#ef4444';
  const textColor = c.textColor || '#ffffff';
  const mutedTextColor = c.mutedTextColor || '#93c5fd';
  const statValueColor = c.statValueColor || '#ffffff';
  const cardOutlineColor = c.cardOutlineColor || 'transparent';
  const cardOutlineWidth = c.cardOutlineWidth ?? 2;
  const fontFamily = c.fontFamily || "'Inter', sans-serif";
  const fontSize = c.fontSize ?? 15;
  const cardRadius = c.cardRadius ?? 16;
  const cardGap = c.cardGap ?? 12;
  const cardPadding = c.cardPadding ?? 14;
  const slotImageHeight = c.slotImageHeight ?? 180;
  const listMaxHeight = c.listMaxHeight ?? 400;
  const brightness = c.brightness ?? 100;
  const contrast = c.contrast ?? 100;
  const saturation = c.saturation ?? 100;

  const currentBonus = bonuses.find(b => !b.opened);
  const currentIndex = currentBonus ? bonuses.indexOf(currentBonus) : -1;
  const isOpening = !!c.bonusOpening && currentIndex >= 0;

  const rootStyle = {
    fontFamily,
    fontSize: `${fontSize}px`,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    gap: `${cardGap}px`,
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
  };

  /* ─── SR auto-scroll ─── */
  const srListRef = useRef(null);
  const srNeedsScroll = srRequests.length > 3;
  const srScrollSpeed = 20;

  return (
    <div className="oc-widget-inner oc-bonushunt oc-bonushunt--v12" style={{ ...rootStyle, height: '100%' }}>

      {/* ═══ Header — Classic full-card flip ═══ */}
      <div className="bht-card bht-header bht-header--fullflip" style={{ flex: '0 0 auto' }}>
        <div className={`bht-fullflip-container${statsFlipped ? ' bht-fullflip-container--flipped' : ''}`}>
          <div className="bht-fullflip-face bht-fullflip-front">
            <div className="bht-header-center">
              {c.avatarUrl ? (
                <img src={c.avatarUrl} alt="" className="bht-header-avatar"
                  onError={e => { e.target.style.display = 'none'; }} />
              ) : (
                <div className="bht-icon-circle">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" />
                  </svg>
                </div>
              )}
              <div className="bht-title">{huntTitle}</div>
            </div>
            <div className="bht-header-stats bht-header-stats--4col">
              <div className="bht-flip-face bht-flip-front">
                <div className="bht-stat-box">
                  <div className="bht-stat-label">START</div>
                  <div className="bht-stat-value">{currency}{startMoney.toFixed(0)}</div>
                </div>
                <div className="bht-stat-box">
                  <div className="bht-stat-label">STOP</div>
                  <div className="bht-stat-value">{currency}{stopLoss.toFixed(0)}</div>
                </div>
                <div className="bht-stat-box">
                  <div className="bht-stat-label">B.E.</div>
                  <div className="bht-stat-value" style={{ color: stats.liveBE >= 100 ? '#f87171' : '#4ade80' }}>{stats.liveBE.toFixed(0)}x</div>
                </div>
                <div className="bht-stat-box">
                  <div className="bht-stat-label">AVG</div>
                  <div className="bht-stat-value" style={{ color: stats.avgMulti >= 100 ? '#4ade80' : '#f87171' }}>{stats.avgMulti.toFixed(0)}x</div>
                </div>
              </div>
            </div>
            {(stats.superCount > 0 || stats.extremeCount > 0) && (
              <div className="bht-badge-pills">
                {stats.superCount > 0 && (
                  <span className="bht-badge-pill bht-badge-pill--super">
                    {stats.superCount} SUPER
                  </span>
                )}
                {stats.extremeCount > 0 && (
                  <span className="bht-badge-pill bht-badge-pill--extreme">
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
                  <div className="bht-flipback-stat-label">PAYOUT</div>
                  <div className="bht-flipback-stat-val" style={{ color: '#4ade80' }}>{stats.bestSlot ? `${currency}${stats.bestSlot._payout.toFixed(0)}` : '—'}</div>
                  <div className="bht-flipback-stat-label">MULTI</div>
                  <div className="bht-flipback-stat-val">{stats.bestSlot ? `${stats.bestSlot._multi.toFixed(1)}x` : '—'}</div>
                  <div className="bht-flipback-stat-label">BET</div>
                  <div className="bht-flipback-stat-val">{stats.bestSlot ? `${currency}${(Number(stats.bestSlot.betSize) || 0).toFixed(2)}` : '—'}</div>
                </div>
                {stats.bestSlot ? (
                  <div className="bht-flipback-slot bht-flipback-slot--best">
                    {stats.bestSlot.slot?.image ? (
                      <img src={stats.bestSlot.slot.image} alt="" className="bht-flipback-slot-img"
                        onError={e => { e.target.style.display = 'none'; }} />
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
                      <img src={stats.worstSlot.slot.image} alt="" className="bht-flipback-slot-img"
                        onError={e => { e.target.style.display = 'none'; }} />
                    ) : <div className="bht-flipback-slot-placeholder">🎰</div>}
                  </div>
                ) : <div className="bht-flipback-slot bht-flipback-slot--empty">—</div>}
                <div className="bht-flipback-stats">
                  <div className="bht-flipback-stat-label">PAYOUT</div>
                  <div className="bht-flipback-stat-val" style={{ color: '#f87171' }}>{stats.worstSlot ? `${currency}${stats.worstSlot._payout.toFixed(0)}` : '—'}</div>
                  <div className="bht-flipback-stat-label">MULTI</div>
                  <div className="bht-flipback-stat-val">{stats.worstSlot ? `${stats.worstSlot._multi.toFixed(1)}x` : '—'}</div>
                  <div className="bht-flipback-stat-label">BET</div>
                  <div className="bht-flipback-stat-val">{stats.worstSlot ? `${currency}${(Number(stats.worstSlot.betSize) || 0).toFixed(2)}` : '—'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Bonus List ═══ */}
      {bonuses.length > 0 && (
        <div className="bht-card bht-list-card" style={{ flex: srVisible && srAnim !== 'slide-down' && srAnim !== 'shrink-list' ? '3 1 0' : '1 1 0', minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'flex 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }}>
          {/* ── 3D Animated Card Carousel ── */}
          <div className={`bht-stack${isOpening ? ' bht-stack--spinning' : ''}`}>
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
                          <img src={bonus.slot.image} alt={bonus.slotName} className="bht-stack-card-img"
                            onError={e => { e.target.style.display = 'none'; }} />
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
                <div className="bht-progress-bar">
                  <div className="bht-progress-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="bht-progress-text">{opened}/{total}</span>
              </div>
            );
          })()}
          {/* ── Vertical list rows (half-height) ── */}
          <div className="bht-list-rows" style={{ flex: '1 1 0', minHeight: 0, overflow: 'hidden', position: 'relative' }}>
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
                          className={`bht-list-row${i === currentIndex ? ' bht-list-row--active' : ''}${bonus.opened ? ' bht-list-row--opened' : ''}${bonus.isSuperBonus ? ' bht-list-row--super' : ''}${bonus.isExtremeBonus || bonus.isExtreme ? ' bht-list-row--extreme' : ''}`}>
                          <span className="bht-list-row-idx">{i + 1}</span>
                          <div className="bht-list-row-thumb">
                            {bonus.slot?.image ? (
                              <img src={bonus.slot.image} alt={bonus.slotName} className="bht-list-row-img"
                                onError={e => { e.target.style.display = 'none'; }} />
                            ) : <div className="bht-list-row-img-ph" />}
                          </div>
                          <div className="bht-list-row-info">
                            <span className="bht-list-row-name">{bonus.slotName || bonus.slot?.name}</span>
                            {bonus.requestedBy && bonus.requestedBy !== 'anonymous' && (
                              <span className="bht-list-row-requester">by {bonus.requestedBy}</span>
                            )}
                          </div>
                          <div className="bht-list-row-stats">
                            <div className="bht-list-row-col">
                              <span className="bht-list-row-col-label">WIN</span>
                              <span className="bht-list-row-col-val">{currency}{payout.toFixed(0)}</span>
                            </div>
                            <div className="bht-list-row-col">
                              <span className="bht-list-row-col-label">MULTI</span>
                              <span className="bht-list-row-col-val">{multi.toFixed(1)}x</span>
                            </div>
                            <div className="bht-list-row-col">
                              <span className="bht-list-row-col-label">BET</span>
                              <span className="bht-list-row-col-val">{currency}{bet.toFixed(2)}</span>
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
                    className={`bht-list-row${idx === currentIndex ? ' bht-list-row--active' : ''}${bonus.opened ? ' bht-list-row--opened' : ''}${bonus.isSuperBonus ? ' bht-list-row--super' : ''}${bonus.isExtremeBonus || bonus.isExtreme ? ' bht-list-row--extreme' : ''}`}>
                    <span className="bht-list-row-idx">{idx + 1}</span>
                    <div className="bht-list-row-thumb">
                      {bonus.slot?.image ? (
                        <img src={bonus.slot.image} alt={bonus.slotName} className="bht-list-row-img"
                          onError={e => { e.target.style.display = 'none'; }} />
                      ) : <div className="bht-list-row-img-ph" />}
                    </div>
                    <div className="bht-list-row-info">
                      <span className="bht-list-row-name">{bonus.slotName || bonus.slot?.name}</span>
                      {bonus.requestedBy && bonus.requestedBy !== 'anonymous' && (
                        <span className="bht-list-row-requester">by {bonus.requestedBy}</span>
                      )}
                    </div>
                    <div className="bht-list-row-stats">
                      <div className="bht-list-row-col">
                        <span className="bht-list-row-col-label">WIN</span>
                        <span className="bht-list-row-col-val">{currency}{payout.toFixed(0)}</span>
                      </div>
                      <div className="bht-list-row-col">
                        <span className="bht-list-row-col-label">MULTI</span>
                        <span className="bht-list-row-col-val">{multi.toFixed(1)}x</span>
                      </div>
                      <div className="bht-list-row-col">
                        <span className="bht-list-row-col-label">BET</span>
                        <span className="bht-list-row-col-val">{currency}{bet.toFixed(2)}</span>
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
          style={{
            flex: (srAnim === 'slide-down' || srAnim === 'shrink-list') ? '0 0 0px' : '1 1 0',
            minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column',
            transition: 'flex 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}>
          <div className="bht-v12-sr-header">
            <span className="bht-v12-sr-icon">🎰</span>
            <span className="bht-v12-sr-title">Slot Requests</span>
            {srRequests.length > 0 && (
              <span className="bht-v12-sr-count">{srRequests.length}</span>
            )}
          </div>
          <div className="bht-v12-sr-list" ref={srListRef}>
            <div className="bht-list-fade bht-list-fade--top" />
            {srRequests.length === 0 ? (
              <div className="bht-v12-sr-empty">
                <span className="bht-v12-sr-hint">Type <strong>{cmdTrigger} &lt;slot name&gt;</strong> in chat to request a slot</span>
              </div>
            ) : (
              <div className={`sr-min-scroll-track${srNeedsScroll ? ' sr-min-scroll-track--animate' : ''}`}
                style={srNeedsScroll ? { '--sr-scroll-duration': `${Math.max(8, srRequests.length * srScrollSpeed / 3)}s` } : undefined}>
                {[...(srNeedsScroll ? [0, 1] : [0])].map(setIdx =>
                  srRequests.map((r, i) => (
                    <div key={`${setIdx}-${r.id}`} className="bht-v12-sr-row">
                      <div className="bht-v12-sr-row-bg"
                        style={{ backgroundImage: `url(${r.slot_image || FALLBACK_SR_IMG})` }} />
                      <div className="bht-v12-sr-row-overlay" />
                      <div className="bht-v12-sr-row-content">
                        <span className="bht-v12-sr-row-idx">{i + 1}</span>
                        <img src={r.slot_image || FALLBACK_SR_IMG} alt=""
                          className="bht-v12-sr-row-img"
                          onError={e => { e.target.src = FALLBACK_SR_IMG; }} />
                        <div className="bht-v12-sr-row-info">
                          <span className="bht-v12-sr-row-name">{r.slot_name}</span>
                          {r.requested_by && r.requested_by !== 'anonymous' && (
                            <span className="bht-v12-sr-row-by">by {r.requested_by}</span>
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
      <div className="bht-card bht-footer" style={{ flex: '0 0 auto' }}>
        <div className="bht-footer-flip-wrap">
          <div className={`bht-footer-flip${statsFlipped ? ' bht-footer-flip--flipped' : ''}`}>
            <div className="bht-footer-flip-face bht-footer-flip-front">
              <span className="bht-footer-label">TOTAL PAY</span>
              <span className="bht-footer-value">{currency}{stats.totalWin.toFixed(2)}</span>
            </div>
            <div className="bht-footer-flip-face bht-footer-flip-back">
              {(() => {
                const target = Math.max(startMoney - stopLoss, 0);
                const profit = stats.totalWin - target;
                const isProfit = profit >= 0;
                return (
                  <>
                    <span className="bht-footer-label">{isProfit ? 'PROFIT' : 'LOSS'}</span>
                    <span className="bht-footer-value" style={{ color: isProfit ? '#4ade80' : '#f87171' }}>
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
