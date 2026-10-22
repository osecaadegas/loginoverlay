import React, { useEffect, useMemo, useState } from "react";
import {
  DollarSign,
  Flame,
  Gift,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import SlotImage from "../SlotImage";

function money(value, currency) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  const unit = String(currency || "€").trim();
  if (/^[A-Z]{3}$/.test(unit)) {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: unit,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      // Fall through to the configured currency prefix.
    }
  }
  return `${unit}${amount.toFixed(2)}`;
}

function slotName(item, index) {
  return item?.slotName || item?.slot_name || item?.slot?.name || item?.name || `Bonus ${index + 1}`;
}

function slotImage(item) {
  return item?.imageUrl || item?.image_url || item?.slotImageUrl || item?.slot_image_url || item?.slot_image || item?.slot?.image || item?.slot?.image_url || item?.slot?.imageUrl || "";
}

function SourceStat({ icon: Icon, label, value, tone = "purple" }) {
  const tones = {
    purple: {
      icon: "#d8b4fe",
      label: "#e9d5ff",
      background: "radial-gradient(ellipse at center, rgba(124,58,237,.35) 0%, rgba(15,23,42,.7) 100%)",
      border: "rgba(124,58,237,.4)",
    },
    gold: {
      icon: "#fde047",
      label: "#fef08a",
      background: "radial-gradient(ellipse at center, rgba(234,179,8,.4) 0%, rgba(15,23,42,.7) 100%)",
      border: "rgba(234,179,8,.5)",
    },
    red: {
      icon: "#fca5a5",
      label: "#fecaca",
      background: "radial-gradient(ellipse at center, rgba(239,68,68,.4) 0%, rgba(15,23,42,.7) 100%)",
      border: "rgba(239,68,68,.5)",
    },
  }[tone];
  return (
    <div className="source-overlay-stat" style={{ background: tones.background, border: `1px solid ${tones.border}` }}>
      <span className="source-overlay-stat__label" style={{ color: tones.label }}>
        <Icon aria-hidden="true" style={{ color: tones.icon }} />{label}
      </span>
      <strong>{value}</strong>
    </div>
  );
}

export default function StreamerSourceBonusPanel({ config = {}, bonuses = [], stats = {}, currency }) {
  const items = useMemo(() => bonuses.map((item, index) => ({ item, index })), [bonuses]);
  const opened = items.filter(({ item }) => Boolean(item?.opened || item?.status === "opened"));
  const isOpening = Boolean(config.bonusOpening);
  const isEnded = items.length > 0 && opened.length === items.length && !isOpening;
  const superItems = items.filter(({ item }) => item?.isSuperBonus || item?.is_super_bonus || item?.super_bonus === true);
  const extremeItems = items.filter(({ item }) => item?.isExtremeBonus || item?.isExtreme || item?.is_extreme_bonus || item?.super_bonus === false);
  const resultSlots = useMemo(
    () => [stats.bestSlot, stats.worstSlot].filter((item, index, all) => item && all.indexOf(item) === index),
    [stats.bestSlot, stats.worstSlot],
  );
  const [resultIndex, setResultIndex] = useState(0);
  const [showInitialBE, setShowInitialBE] = useState(true);

  useEffect(() => {
    setResultIndex(0);
    if (resultSlots.length < 2) return undefined;
    const timer = window.setInterval(() => setResultIndex((index) => (index + 1) % resultSlots.length), 4000);
    return () => window.clearInterval(timer);
  }, [resultSlots.length, bonuses.length]);

  useEffect(() => {
    if (!isOpening) {
      setShowInitialBE(true);
      return undefined;
    }
    const timer = window.setInterval(() => setShowInitialBE((value) => !value), 30000);
    return () => window.clearInterval(timer);
  }, [isOpening]);

  const resultSlot = resultSlots[resultIndex] || null;
  const currencyUnit = currency || config.currency || "€";
  const startMoney = Number(config.startMoney) || 0;
  const totalPay = Number(stats.totalWin) || 0;
  // The supplied overlay defines AVERAGE as the arithmetic mean of opened
  // bonus multipliers (rather than total payout divided by total stake).
  const openedMultipliers = opened
    .map(({ item }) => {
      const storedMultiplier = item?.multiplier ?? item?.multi ?? item?._multi;
      if (storedMultiplier !== undefined && storedMultiplier !== null && storedMultiplier !== "") {
        const multiplier = Number(storedMultiplier);
        if (Number.isFinite(multiplier)) return multiplier;
      }
      const bet = Number(item?.betSize ?? item?.bet_size ?? item?.payment_amount ?? item?.payment ?? item?.bet_amount ?? item?.bet) || 0;
      const payout = Number(item?.payout ?? item?.result ?? item?.win ?? item?.result_amount) || 0;
      return bet > 0 ? payout / bet : 0;
    })
    .filter(Number.isFinite);
  const average = openedMultipliers.length
    ? `${(openedMultipliers.reduce((sum, value) => sum + value, 0) / openedMultipliers.length).toFixed(2)}x`
    : "0.00x";
  const currentBreakEven = Number(stats.liveBE ?? stats.breakEven ?? 0);
  const initialBreakEven = Number(stats.breakEven ?? 0);
  const streamerName = config.streamerName || config.twitchUsername || config.brandName || config.huntName || "Live bonus session";
  const bonusTitle = isOpening ? "BONUS OPENING" : isEnded ? "BONUS ENDED" : "BONUS HUNT";

  const renderBonus = ({ item, index }) => {
    const name = slotName(item, index);
    const image = slotImage(item);
    const bet = Number(item?.betSize ?? item?.bet_size ?? item?.payment_amount ?? item?.payment ?? item?.bet_amount ?? item?.bet) || 0;
    const payout = Number(item?.payout ?? item?.result ?? item?.win ?? item?.result_amount) || 0;
    const multiplier = Number(item?.multiplier ?? item?.multi ?? item?._multi ?? (bet > 0 ? payout / bet : 0)) || 0;
    const isOpened = Boolean(item?.opened || item?.status === "opened");
    const isWin = isOpened && payout > bet;
    const isSuper = item?.isSuperBonus || item?.is_super_bonus || item?.super_bonus === true;
    const isExtreme = item?.isExtremeBonus || item?.isExtreme || item?.is_extreme_bonus || item?.super_bonus === false;
    const badge = (value, color, background) => (
      <span className="source-overlay-bonus-chip" style={{ color, background }}>{value}</span>
    );

    return (
      <article
        className="source-overlay-bonus-row"
        key={item?.id || `${name}-${index}`}
        style={{
          background: isOpened
            ? (isWin ? "rgba(16,185,129,.15)" : "rgba(239,68,68,.15)")
            : "rgba(251,191,36,.15)",
          border: isSuper
            ? "3px solid rgba(255,215,0,.95)"
            : isExtreme
              ? "3px solid rgba(239,68,68,.95)"
              : isOpened
                ? `1px solid ${isWin ? "rgba(16,185,129,.3)" : "rgba(239,68,68,.3)"}`
                : "1px solid rgba(251,191,36,.3)",
        }}
      >
        {image ? <div className="source-overlay-bonus-blur" style={{ backgroundImage: `url("${image}")` }} aria-hidden="true" /> : null}
        <div className="source-overlay-bonus-row-inner">
          {image ? (
            <div className="source-overlay-bonus-art"><SlotImage src={image} alt={name} fit="contain" /></div>
          ) : (
            <div className="source-overlay-bonus-art source-overlay-bonus-art--empty" aria-label="Slot artwork unavailable">?</div>
          )}
          <div className="source-overlay-bonus-copy">
            <strong title={name}>{name}</strong>
            <div className="source-overlay-bonus-values">
              {isOpened ? (
                <>
                  {badge(money(bet, currencyUnit), "#fbbf24", "rgba(251,191,36,.2)")}
                  {badge(money(payout, currencyUnit), isWin ? "#10b981" : "#ef4444", isWin ? "rgba(16,185,129,.2)" : "rgba(239,68,68,.2)")}
                  {badge(`${multiplier.toFixed(0)}x`, "#a855f7", "rgba(168,85,247,.2)")}
                </>
              ) : <span className="source-overlay-pending-bet">{money(bet, currencyUnit)}</span>}
            </div>
          </div>
          <span className="source-overlay-bonus-index">#{index + 1}</span>
        </div>
      </article>
    );
  };

  return (
    <section className="streamer-source-bonus-panel" aria-label={bonusTitle}>
      <style>{`
        .streamer-source-bonus-panel{box-sizing:border-box;position:relative;display:flex;width:100%;height:100%;min-width:0;min-height:0;flex-direction:column;overflow:hidden;border:1px solid rgba(255,255,255,.15);border-radius:16px;color:#fff;background:linear-gradient(145deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);font-family:Rubik,Inter,ui-sans-serif,system-ui,sans-serif}
        .streamer-source-bonus-panel *{box-sizing:border-box}
        .source-overlay-bonus-header{position:relative;flex:none;width:100%;padding:10px 12px;background:rgba(0,0,0,.3)}
        .source-overlay-bonus-title{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
        .source-overlay-bonus-brand{display:flex;min-width:0;align-items:center;gap:6px}
        .source-overlay-bonus-brand>svg{width:16px;height:16px;flex:none;color:#60a5fa}
        .source-overlay-bonus-brand-copy{display:flex;min-width:0;flex-direction:column;gap:2px}
        .source-overlay-bonus-brand-copy strong{color:#fff;font-size:10px;font-weight:900;letter-spacing:.05em;line-height:1;text-transform:uppercase}
        .source-overlay-bonus-brand-copy span{max-width:150px;overflow:hidden;color:rgba(255,255,255,.8);font-size:9px;font-weight:600;line-height:1;text-overflow:ellipsis;white-space:nowrap}
        .source-overlay-bonus-number{color:rgba(255,255,255,.7);font-size:11px;font-weight:900}
        .source-overlay-opening-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-bottom:8px}
        .source-overlay-stat{position:relative;display:flex;min-width:0;min-height:45px;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;padding:6px 8px;border-radius:9px}
        .source-overlay-stat::before{position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,rgba(124,58,237,.25) 25%,transparent 100%);content:""}
        .source-overlay-stat__label{position:relative;z-index:1;display:flex;align-items:center;gap:4px;margin-bottom:2px;font-size:7px;font-weight:650;letter-spacing:.06em;line-height:1;text-transform:uppercase;white-space:nowrap}
        .source-overlay-stat__label svg{width:10px;height:10px}
        .source-overlay-stat strong{position:relative;z-index:1;max-width:100%;overflow:hidden;color:#fff;font-size:13px;font-weight:900;line-height:1;text-overflow:ellipsis;text-shadow:0 2px 6px rgba(0,0,0,.5);white-space:nowrap}
        .source-overlay-total{margin-bottom:8px}
        .source-overlay-total .source-overlay-stat{min-height:42px}
        .source-overlay-counter-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-bottom:8px}
        .source-overlay-counter-grid .source-overlay-stat{min-height:43px;padding:5px 4px}
        .source-overlay-counter-grid .source-overlay-stat__label{gap:3px;font-size:7px;letter-spacing:.04em}
        .source-overlay-counter-grid .source-overlay-stat__label svg{width:10px;height:10px}
        .source-overlay-counter-grid .source-overlay-stat strong{font-size:13px}
        .source-overlay-opening-progress{padding:0 0 8px}
        .source-overlay-progress-track{height:8px;overflow:hidden;border:1px solid rgba(255,255,255,.1);border-radius:999px;background:rgba(0,0,0,.4)}
        .source-overlay-progress-track i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#10b981 0%,#059669 100%)}
        .source-overlay-progress-label{display:flex;justify-content:space-between;margin-top:4px;padding:0 4px;color:rgba(255,255,255,.6);font-size:8px;font-weight:700}
        .source-overlay-bonus-body{display:flex;min-height:0;flex:1;flex-direction:column;overflow:hidden;background:linear-gradient(to bottom,rgba(0,0,0,.3),rgba(0,0,0,.5))}
        .source-overlay-bonus-list{display:flex;min-height:0;flex:1;flex-direction:column;overflow:hidden;padding:16px 16px 8px}
        .source-overlay-bonus-list-title{display:flex;flex:none;align-items:center;gap:8px;margin:0 0 12px;color:#fbbf24;font-size:10px;font-weight:900;letter-spacing:.08em;line-height:1;text-transform:uppercase}
        .source-overlay-bonus-list-title i{width:4px;height:20px;flex:none;border-radius:99px;background:#fbbf24}
        .source-overlay-bonus-list-viewport{display:flex;min-height:0;flex:1;flex-direction:column;overflow:hidden}
        .source-overlay-bonus-track{display:flex;flex:none;flex-direction:column;gap:8px;overflow:visible;will-change:transform}
        .source-overlay-bonus-row{position:relative;min-height:58px;flex:none;overflow:hidden;border-radius:12px;box-shadow:inset 0 1px 0 rgba(255,255,255,.04)}
        .source-overlay-bonus-row-inner{position:relative;z-index:1;display:flex;min-height:58px;align-items:center}
        .source-overlay-bonus-blur{position:absolute;inset:0;transform:scale(1.1);background-position:center;background-size:cover;filter:blur(8px);opacity:.2}
        .source-overlay-bonus-art{display:flex;width:48px;height:58px;flex:none;align-items:center;justify-content:center;overflow:hidden;border-radius:0 12px 12px 0}
        .source-overlay-bonus-art img{width:100%;height:100%;object-fit:contain;border-radius:0 12px 12px 0}
        .source-overlay-bonus-art--empty{color:#fbbf24;background:rgba(251,191,36,.3);font-size:16px;font-weight:900}
        .source-overlay-bonus-copy{display:flex;min-width:0;flex:1;flex-direction:column;gap:5px;padding:8px 8px 8px 12px}
        .source-overlay-bonus-copy>strong{overflow:hidden;color:#fff;font-size:12px;font-weight:700;text-overflow:ellipsis;white-space:nowrap}
        .source-overlay-bonus-values{display:flex;min-width:0;align-items:center;gap:5px;overflow:hidden}
        .source-overlay-bonus-chip{max-width:70px;overflow:hidden;padding:2px 5px;border-radius:4px;font-size:9px;font-weight:700;text-overflow:ellipsis;white-space:nowrap}
        .source-overlay-pending-bet{color:#fbbf24;font-size:10px;font-weight:600}
        .source-overlay-bonus-index{position:absolute;top:-6px;right:6px;color:rgba(251,191,36,.4);font-size:10px;font-weight:900}
        .source-overlay-bonus-empty{display:grid;min-height:100px;flex:1;place-items:center;color:rgba(255,255,255,.5);font-size:11px;text-align:center}
        .source-overlay-best{flex:none;padding:0 16px 16px}
        .source-overlay-best-title{display:flex;align-items:center;gap:8px;margin:0 0 12px;color:#fbbf24;font-size:10px;font-weight:900;letter-spacing:.08em;line-height:1;text-transform:uppercase}
        .source-overlay-best-title i{width:4px;height:20px;flex:none;border-radius:99px;background:#fbbf24}
        .source-overlay-best-row{display:flex;height:104px;gap:12px}
        .source-overlay-best-art{width:72px;height:104px;flex:none;overflow:hidden;border-radius:8px;background:rgba(251,191,36,.2)}
        .source-overlay-best-art img{width:100%;height:100%;object-fit:contain;border-radius:8px}
        .source-overlay-best-empty{display:grid;width:100%;height:100%;place-items:center;color:#fbbf24;font-size:32px;font-weight:900}
        .source-overlay-result-dots{display:flex;flex:none;flex-direction:column;justify-content:center;gap:6px}
        .source-overlay-result-dots i{width:6px;height:6px;border-radius:999px;background:rgba(255,255,255,.3)}
        .source-overlay-best-copy{display:flex;min-width:0;flex:1;flex-direction:column;justify-content:space-between;padding:4px 0}
        .source-overlay-best-stat{display:flex;align-items:center;gap:6px}
        .source-overlay-best-icon{display:grid;width:24px;height:24px;flex:none;place-items:center;border-radius:5px;background:rgba(251,191,36,.2);font-size:12px}
        .source-overlay-best-stat strong{display:block;max-width:100px;overflow:hidden;color:#fbbf24;font-size:14px;font-weight:900;line-height:1.1;text-overflow:ellipsis;white-space:nowrap}
        .source-overlay-best-stat small{display:block;margin-top:2px;color:rgba(255,255,255,.5);font-size:8px;font-weight:700;letter-spacing:.04em;line-height:1;text-transform:uppercase}
        @keyframes streamer-source-bonus-scroll{from{transform:translateY(0)}to{transform:translateY(-50%)}}
        @media(prefers-reduced-motion:reduce){.streamer-source-bonus-panel *{animation:none!important;transition:none!important}}
      `}</style>

      <header className="source-overlay-bonus-header">
        <div className="source-overlay-bonus-title">
          <div className="source-overlay-bonus-brand">
            <Gift aria-hidden="true" />
            <div className="source-overlay-bonus-brand-copy"><strong>{bonusTitle}</strong><span>{streamerName}</span></div>
          </div>
          <span className="source-overlay-bonus-number">#{config.huntNumber || config.openingNumber || "1"}</span>
        </div>

        <div className="source-overlay-opening-grid">
          <SourceStat icon={TrendingUp} label="AVERAGE" value={average} />
          <div className="source-overlay-stat source-overlay-be-stat" style={{ background: "radial-gradient(ellipse at center, rgba(124,58,237,.35) 0%, rgba(15,23,42,.7) 100%)", border: "1px solid rgba(124,58,237,.4)" }}>
            <span className="source-overlay-stat__label" style={{ color: "#e9d5ff" }}>
              {showInitialBE ? <Target aria-hidden="true" style={{ color: "#d8b4fe" }} /> : <TrendingUp aria-hidden="true" style={{ color: "#d8b4fe" }} />}
              {showInitialBE ? "BE INICIAL" : "BE ATUAL"}
            </span>
            <strong>{showInitialBE ? `${initialBreakEven.toFixed(2)}x` : `${currentBreakEven.toFixed(0)}x`}</strong>
          </div>
        </div>

        <div className="source-overlay-total"><SourceStat icon={DollarSign} label="TOTAL PAY" value={money(totalPay, currencyUnit)} /></div>
        <div className="source-overlay-counter-grid">
          <SourceStat icon={Gift} label="BONUSES" value={items.length} />
          <SourceStat icon={Zap} label="SUPER" value={superItems.length} tone="gold" />
          <SourceStat icon={Flame} label="EXTREME" value={extremeItems.length} tone="red" />
        </div>
        <div className="source-overlay-opening-progress">
          <div className="source-overlay-progress-track"><i style={{ width: `${items.length ? (opened.length / items.length) * 100 : 0}%` }} /></div>
          <div className="source-overlay-progress-label"><span>{opened.length}/{items.length}</span><span>{items.length ? Math.round((opened.length / items.length) * 100) : 0}%</span></div>
        </div>
      </header>

      <div className="source-overlay-bonus-body">
        <section className="source-overlay-bonus-list">
          <h2 className="source-overlay-bonus-list-title"><i />BONUS</h2>
          {items.length ? (
            <div className="source-overlay-bonus-list-viewport">
              <div className="source-overlay-bonus-track" style={{ animation: items.length > 5 ? "streamer-source-bonus-scroll 30s linear infinite" : "none" }}>
                {(items.length > 5 ? [...items, ...items] : items).map((entry, index) => (
                  <React.Fragment key={`bonus-loop-${index}`}>
                    {renderBonus(entry)}
                    {items.length > 5 && (index + 1) % items.length === 0 ? <div key={`bonus-loop-spacer-${index}`} style={{ height: 8, flex: "none" }} /> : null}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ) : (
            <div className="source-overlay-bonus-empty">No bonuses added yet</div>
          )}
        </section>

        {resultSlot ? (
          <section className="source-overlay-best">
            <h2 className="source-overlay-best-title">{resultSlots.length === 1 ? "BEST SLOT" : "BEST AND WORST"}</h2>
            <div className="source-overlay-best-row">
              <div className="source-overlay-best-art">
                {slotImage(resultSlot) ? <SlotImage src={slotImage(resultSlot)} alt={slotName(resultSlot, 0)} fit="contain" /> : <div className="source-overlay-best-empty">?</div>}
              </div>
              {resultSlots.length > 1 ? <div className="source-overlay-result-dots" aria-hidden="true">{resultSlots.map((_, index) => <i key={index} style={{ background: index === resultIndex ? "#fbbf24" : "rgba(255,255,255,.3)" }} />)}</div> : null}
              <div className="source-overlay-best-copy">
                <div className="source-overlay-best-stat"><span className="source-overlay-best-icon">🏆</span><div><strong>{money(resultSlot.payout ?? resultSlot._payout ?? resultSlot.result ?? resultSlot.win, currencyUnit)}</strong><small>BEST WIN</small></div></div>
                <div className="source-overlay-best-stat"><span className="source-overlay-best-icon" style={{ background: "rgba(168,85,247,.2)" }}>⚡</span><div><strong style={{ color: "#a855f7" }}>{Number(resultSlot._multi ?? resultSlot.multiplier ?? resultSlot.multi ?? 0).toFixed(1)}x</strong><small>BEST MULTI</small></div></div>
                <div className="source-overlay-best-stat"><span className="source-overlay-best-icon" style={{ background: "rgba(34,197,94,.2)" }}>💰</span><div><strong style={{ color: "#22c55e" }}>{money(resultSlot.betSize ?? resultSlot.bet_size ?? resultSlot.payment_amount ?? resultSlot.bet ?? 0, currencyUnit)}</strong><small>BET SIZE</small></div></div>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </section>
  );
}
