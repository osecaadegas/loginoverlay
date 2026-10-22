import React, { useEffect, useMemo, useState } from "react";
import { Flame, Gift, TrendingUp, Zap } from "lucide-react";
import SlotImage from "../SlotImage";

function money(value, currency) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  const unit = String(currency || "€").trim();
  if (/^[A-Z]{3}$/.test(unit)) {
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: unit, maximumFractionDigits: 2 }).format(amount);
    } catch {}
  }
  return `${unit}${amount.toFixed(2)}`;
}

function slotName(bonus, index) {
  return bonus?.slotName || bonus?.slot?.name || bonus?.name || `Bonus ${index + 1}`;
}

function slotImage(bonus) {
  return bonus?.imageUrl || bonus?.image_url || bonus?.slotImageUrl || bonus?.slot_image_url || bonus?.slot?.image || bonus?.slot?.image_url || bonus?.slot?.imageUrl || "";
}

export default function StreamerSourceBonusPanel({ config = {}, bonuses = [], stats = {}, currency }) {
  const ordered = useMemo(() => bonuses.map((bonus, index) => ({ bonus, index })), [bonuses]);
  const pending = ordered.filter(({ bonus }) => !bonus?.opened);
  const opened = ordered.filter(({ bonus }) => Boolean(bonus?.opened));
  const superCount = bonuses.filter((bonus) => bonus?.isSuperBonus || bonus?.is_super_bonus).length;
  const extremeCount = bonuses.filter((bonus) => bonus?.isExtremeBonus || bonus?.isExtreme || bonus?.is_extreme_bonus).length;
  const isOpening = Boolean(config.bonusOpening && pending.length);
  const isEnded = bonuses.length > 0 && pending.length === 0;
  const active = pending[0];
  const resultSlots = useMemo(() => [stats.bestSlot, stats.worstSlot]
    .filter((slot, index, slots) => slot && slots.indexOf(slot) === index), [stats.bestSlot, stats.worstSlot]);
  const [resultSlotIndex, setResultSlotIndex] = useState(0);
  useEffect(() => {
    setResultSlotIndex(0);
    if (isOpening || resultSlots.length < 2) return undefined;
    const timer = window.setInterval(() => setResultSlotIndex((index) => (index + 1) % resultSlots.length), 10000);
    return () => window.clearInterval(timer);
  }, [isOpening, resultSlots.length, bonuses.length]);
  const resultSlot = resultSlots[resultSlotIndex] || stats.bestSlot;
  const progress = bonuses.length ? Math.min(100, Math.round((opened.length / bonuses.length) * 100)) : 0;
  const streamerName = config.streamerName || config.twitchUsername || config.brandName || "";
  const amountUnit = currency || config.currency || "€";

  const row = ({ bonus, index }, repeated = false) => {
    const name = slotName(bonus, index);
    const provider = bonus?.provider || bonus?.slot?.provider || "";
    const bet = bonus?.betSize ?? bonus?.bet_size ?? bonus?.bet ?? 0;
    const payout = bonus?.payout ?? bonus?.result ?? bonus?.win ?? 0;
    const multiplier = Number(bonus?.multiplier ?? bonus?.multi ?? (Number(bet) > 0 ? Number(payout) / Number(bet) : 0));
    const tier = bonus?.isExtremeBonus || bonus?.isExtreme || bonus?.is_extreme_bonus ? "extreme" : bonus?.isSuperBonus || bonus?.is_super_bonus ? "super" : "";
    return (
      <article className={`streamer-source-bonus-row${tier ? ` is-${tier}` : ""}${isOpening && active?.index === index ? " is-current" : ""}`} key={`${repeated ? "repeat-" : ""}${bonus?.id || index}`}>
        <div className="streamer-source-bonus-art"><SlotImage src={slotImage(bonus)} alt={name} fit="cover" /></div>
        <div className="streamer-source-bonus-info">
          <strong title={name}>{name}</strong>
          {provider && <span title={provider}>{provider}</span>}
          <small>{money(bet, amountUnit)} bet</small>
        </div>
        <div className="streamer-source-bonus-result">
          <span>{bonus?.opened ? "WIN" : "MULTI"}</span>
          <b>{bonus?.opened ? money(payout, amountUnit) : `${Number.isFinite(multiplier) && multiplier > 0 ? `${multiplier.toFixed(0)}x` : "—"}`}</b>
          {bonus?.opened && <small>{Number.isFinite(multiplier) && multiplier > 0 ? `${multiplier.toFixed(1)}x` : "0x"}</small>}
        </div>
        {tier && <span className="streamer-source-bonus-tier">{tier}</span>}
      </article>
    );
  };

  return (
    <section className={`streamer-source-bonus-panel${isOpening ? " is-opening" : ""}`} aria-label={isOpening ? "Bonus opening" : isEnded ? "Bonus ended" : "Bonus hunt"}>
      <style>{`
        .streamer-source-bonus-panel{--ss-blue:#4da6ff;--ss-violet:#8b5cf6;position:relative;box-sizing:border-box;width:100%;height:100%;min-height:0;overflow:hidden;display:flex;flex-direction:column;color:#f8fafc;font-family:Inter,ui-sans-serif,system-ui,sans-serif;background:linear-gradient(145deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);border:1px solid rgba(255,255,255,.18);border-radius:16px;box-shadow:0 14px 36px rgba(0,0,0,.38),inset 0 1px 0 rgba(255,255,255,.08)}
        .streamer-source-bonus-panel *{box-sizing:border-box}.streamer-source-bonus-header{padding:13px 12px 10px;background:rgba(0,0,0,.27);border-bottom:1px solid rgba(255,255,255,.1)}.streamer-source-bonus-brand{display:flex;align-items:center;gap:8px;min-width:0}.streamer-source-bonus-icon{width:30px;height:30px;display:grid;place-items:center;flex:none;color:#bfdbfe;background:linear-gradient(145deg,rgba(59,130,246,.3),rgba(124,58,237,.24));border:1px solid rgba(147,197,253,.36);border-radius:10px}.streamer-source-bonus-heading{min-width:0;flex:1}.streamer-source-bonus-heading h2{margin:0;color:#fff;font-size:12px;font-weight:950;letter-spacing:.12em;line-height:1.15}.streamer-source-bonus-heading span{display:block;margin-top:3px;color:rgba(226,232,240,.72);font-size:9px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.streamer-source-bonus-number{padding:4px 7px;color:#dbeafe;font-size:9px;font-weight:900;background:rgba(15,23,42,.55);border:1px solid rgba(148,163,184,.22);border-radius:999px;white-space:nowrap}.streamer-source-bonus-opening-stats{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px}.streamer-source-bonus-opening-stats .streamer-source-bonus-stat{padding:6px 7px}.streamer-source-bonus-opening-total{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;padding:6px 8px;color:#c4b5fd;background:rgba(15,23,42,.68);border:1px solid rgba(124,58,237,.35);border-radius:8px;font-size:8px;font-weight:800;letter-spacing:.08em}.streamer-source-bonus-opening-total b{color:white;font-size:13px;font-weight:950;letter-spacing:0}.streamer-source-bonus-opening-counters{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;margin-top:6px}.streamer-source-bonus-opening-counters .streamer-source-bonus-counter{padding:5px 6px}.streamer-source-bonus-opening-progress{margin-top:7px;padding:0 2px}.streamer-source-bonus-opening-progress .streamer-source-bonus-progress-track{height:6px;background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.12)}.streamer-source-bonus-opening-progress .streamer-source-bonus-progress-track i{background:linear-gradient(90deg,#10b981,#059669)}.streamer-source-bonus-opening-progress-label{display:flex;justify-content:space-between;margin-top:4px;color:rgba(255,255,255,.66);font-size:8px;font-weight:850}
        .streamer-source-bonus-statgrid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:10px}.streamer-source-bonus-stat{position:relative;min-width:0;padding:7px 8px;background:radial-gradient(ellipse at center,rgba(124,58,237,.25),rgba(15,23,42,.68));border:1px solid rgba(124,58,237,.35);border-radius:9px}.streamer-source-bonus-stat label{display:flex;align-items:center;gap:4px;color:#c4b5fd;font-size:8px;font-weight:800;letter-spacing:.08em}.streamer-source-bonus-stat label svg{width:10px;height:10px}.streamer-source-bonus-stat b{display:block;margin-top:3px;color:white;font-size:15px;font-weight:950;line-height:1.05;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.streamer-source-bonus-counters{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px}.streamer-source-bonus-counter{display:flex;align-items:center;justify-content:space-between;gap:4px;padding:6px 7px;color:#fef3c7;background:rgba(234,179,8,.13);border:1px solid rgba(234,179,8,.34);border-radius:8px}.streamer-source-bonus-counter.extreme{color:#fecaca;background:rgba(239,68,68,.13);border-color:rgba(239,68,68,.34)}.streamer-source-bonus-counter span{display:flex;align-items:center;gap:3px;font-size:8px;font-weight:850;letter-spacing:.05em}.streamer-source-bonus-counter svg{width:10px;height:10px}.streamer-source-bonus-counter b{font-size:12px;font-weight:950}.streamer-source-bonus-listhead{display:flex;align-items:center;justify-content:space-between;padding:10px 12px 7px;color:#fbbf24;font-size:9px;font-weight:950;letter-spacing:.13em}.streamer-source-bonus-list{flex:1;min-height:0;overflow:hidden;padding:0 10px 8px}.streamer-source-bonus-track{display:grid;gap:7px}.streamer-source-bonus-row{position:relative;display:flex;align-items:center;min-height:58px;overflow:hidden;background:linear-gradient(135deg,rgba(251,191,36,.14),rgba(15,23,42,.72));border:1px solid rgba(251,191,36,.28);border-radius:11px;box-shadow:inset 0 1px 0 rgba(255,255,255,.04)}.streamer-source-bonus-row.is-super{border:2px solid rgba(255,215,0,.86)}.streamer-source-bonus-row.is-extreme{border:2px solid rgba(239,68,68,.86)}.streamer-source-bonus-row.is-current{outline:2px solid #60a5fa;outline-offset:1px}.streamer-source-bonus-art{width:48px;height:56px;flex:none;overflow:hidden;border-radius:9px}.streamer-source-bonus-info{display:flex;flex:1;min-width:0;flex-direction:column;gap:2px;padding:5px 6px}.streamer-source-bonus-info strong{overflow:hidden;color:#fff;font-size:10px;font-weight:850;text-overflow:ellipsis;white-space:nowrap}.streamer-source-bonus-info span{overflow:hidden;color:#cbd5e1;font-size:8px;font-weight:650;text-overflow:ellipsis;white-space:nowrap}.streamer-source-bonus-info small{color:#fbbf24;font-size:8px;font-weight:800}.streamer-source-bonus-result{display:flex;flex:none;flex-direction:column;align-items:flex-end;gap:3px;padding:0 7px}.streamer-source-bonus-result span{color:rgba(191,219,254,.72);font-size:7px;font-weight:900;letter-spacing:.07em}.streamer-source-bonus-result b{max-width:56px;overflow:hidden;color:#f8fafc;font-size:10px;font-weight:950;text-overflow:ellipsis;white-space:nowrap}.streamer-source-bonus-result small{max-width:56px;overflow:hidden;color:#c4b5fd;font-size:8px;font-weight:900;text-overflow:ellipsis;white-space:nowrap}.streamer-source-bonus-tier{position:absolute;top:2px;left:3px;padding:1px 3px;color:#fef3c7;background:rgba(120,53,15,.9);border-radius:3px;font-size:6px;font-weight:900;letter-spacing:.06em;text-transform:uppercase}.streamer-source-bonus-summary{display:flex;align-items:center;gap:8px;margin:0 10px 8px;padding:7px;background:linear-gradient(120deg,rgba(251,191,36,.13),rgba(15,23,42,.72));border:1px solid rgba(251,191,36,.3);border-radius:10px;min-height:58px}.streamer-source-bonus-summary-art{width:38px;height:46px;flex:none;overflow:hidden;border-radius:6px;background:rgba(251,191,36,.15)}.streamer-source-bonus-summary-copy{display:flex;min-width:0;flex:1;flex-direction:column;gap:2px}.streamer-source-bonus-summary-copy span{color:#fbbf24;font-size:7px;font-weight:950;letter-spacing:.1em}.streamer-source-bonus-summary-copy strong{overflow:hidden;color:#fff;font-size:9px;text-overflow:ellipsis;white-space:nowrap}.streamer-source-bonus-summary-copy small{color:#cbd5e1;font-size:8px}.streamer-source-bonus-summary-value{flex:none;text-align:right}.streamer-source-bonus-summary-value b{display:block;color:#fbbf24;font-size:11px;font-weight:950}.streamer-source-bonus-summary-value small{color:#c4b5fd;font-size:8px;font-weight:900}.streamer-source-bonus-progress{padding:0 12px 9px}.streamer-source-bonus-total{display:flex;align-items:center;justify-content:space-between;margin:0 0 6px;padding:5px 7px;background:rgba(2,6,23,.42);border:1px solid rgba(148,163,184,.16);border-radius:7px}.streamer-source-bonus-total span{color:#bfdbfe;font-size:7px;font-weight:900;letter-spacing:.1em}.streamer-source-bonus-total b{color:#fff;font-size:10px;font-weight:950}.streamer-source-bonus-progress-label{display:flex;justify-content:space-between;margin-bottom:5px;color:#e2e8f0;font-size:8px;font-weight:800}.streamer-source-bonus-progress-label b{color:#7dd3fc}.streamer-source-bonus-progress-track{height:5px;overflow:hidden;background:rgba(15,23,42,.8);border-radius:999px}.streamer-source-bonus-progress-track i{display:block;height:100%;background:linear-gradient(90deg,#60a5fa,#a78bfa);border-radius:inherit}.streamer-source-bonus-empty{display:grid;min-height:130px;place-items:center;color:rgba(226,232,240,.72);font-size:10px;font-weight:750;text-align:center;border:1px dashed rgba(148,163,184,.25);border-radius:12px}.streamer-source-bonus-opening{margin:0 10px 10px;padding:8px;background:rgba(59,130,246,.14);border:1px solid rgba(96,165,250,.42);border-radius:11px}.streamer-source-bonus-opening small{display:block;margin-bottom:6px;color:#bfdbfe;font-size:7px;font-weight:900;letter-spacing:.1em}.streamer-source-bonus-opening .streamer-source-bonus-row{min-height:54px;background:rgba(2,6,23,.45);border-color:rgba(96,165,250,.28)}
      `}</style>
      <style>{`.streamer-source-bonus-panel.is-opening .streamer-source-bonus-list{position:relative;display:block;padding-bottom:136px}.streamer-source-bonus-panel.is-opening .streamer-source-bonus-opening{position:absolute;top:50%;left:10px;right:10px;transform:translateY(-50%);margin:0;padding:10px;z-index:2}.streamer-source-bonus-panel.is-opening .streamer-source-bonus-opening .streamer-source-bonus-row{min-height:78px;border-color:rgba(96,165,250,.72);box-shadow:0 0 20px rgba(59,130,246,.22)}.streamer-source-bonus-panel.is-opening .streamer-source-bonus-art{width:66px;height:76px}.streamer-source-bonus-panel.is-opening .streamer-source-bonus-info strong{font-size:12px}.streamer-source-bonus-panel.is-opening .streamer-source-bonus-info span,.streamer-source-bonus-panel.is-opening .streamer-source-bonus-info small{font-size:9px}.streamer-source-bonus-panel.is-opening .streamer-source-bonus-result b{font-size:12px}.streamer-source-bonus-panel.is-opening .streamer-source-bonus-track{position:absolute;left:10px;right:10px;bottom:8px;max-height:116px;overflow:hidden}.streamer-source-bonus-panel.is-opening .streamer-source-bonus-summary{display:none}`}</style>
      <header className="streamer-source-bonus-header">
        <div className="streamer-source-bonus-brand">
          <div className="streamer-source-bonus-icon"><Gift size={16} /></div>
          <div className="streamer-source-bonus-heading"><h2>{isOpening ? "BONUS OPENING" : isEnded ? "BONUS ENDED" : "BONUS HUNT"}</h2><span>{streamerName || config.huntName || "Live bonus session"}</span></div>
          <span className="streamer-source-bonus-number">{opened.length}/{bonuses.length} OPENED</span>
        </div>
        {isOpening ? (
          <div className="streamer-source-bonus-opening-stats">
            <div className="streamer-source-bonus-stat"><label><TrendingUp /> AVERAGE</label><b>{Number(stats.avgMulti || 0).toFixed(0)}x</b></div>
            <div className="streamer-source-bonus-stat"><label><TrendingUp /> BE ATUAL</label><b>{Number(stats.liveBE || stats.breakEven || 0).toFixed(0)}x</b></div>
            <div className="streamer-source-bonus-opening-total"><span>TOTAL PAY</span><b>{money(stats.totalWin, amountUnit)}</b></div>
            <div className="streamer-source-bonus-opening-counters">
              <div className="streamer-source-bonus-counter"><span><Gift /> BONUSES</span><b>{bonuses.length}</b></div>
              <div className="streamer-source-bonus-counter"><span><Zap /> SUPER</span><b>{bonuses.filter((bonus) => (bonus?.isSuperBonus || bonus?.is_super_bonus) && bonus?.opened).length}/{superCount}</b></div>
              <div className="streamer-source-bonus-counter extreme"><span><Flame /> EXTREME</span><b>{bonuses.filter((bonus) => (bonus?.isExtremeBonus || bonus?.isExtreme || bonus?.is_extreme_bonus) && bonus?.opened).length}/{extremeCount}</b></div>
            </div>
            <div className="streamer-source-bonus-opening-progress">
              <div className="streamer-source-bonus-progress-track"><i style={{ width: `${progress}%` }} /></div>
              <div className="streamer-source-bonus-opening-progress-label"><span>{opened.length}/{bonuses.length} OPENED</span><span>{progress}%</span></div>
            </div>
          </div>
        ) : (
          <>
            <div className="streamer-source-bonus-statgrid">
              <div className="streamer-source-bonus-stat"><label><Gift /> START</label><b>{money(config.startMoney, amountUnit)}</b></div>
              <div className="streamer-source-bonus-stat"><label><TrendingUp /> BREAKEVEN</label><b>{Number(stats.liveBE || stats.breakEven || 0).toFixed(0)}x</b></div>
              <div className="streamer-source-bonus-stat"><label><Gift /> BONUSES</label><b>{bonuses.length}</b></div>
              <div className="streamer-source-bonus-stat"><label><TrendingUp /> AVG WIN</label><b>{Number(stats.avgMulti || 0).toFixed(0)}x</b></div>
            </div>
            <div className="streamer-source-bonus-counters">
              <div className="streamer-source-bonus-counter"><span><Zap /> SUPER</span><b>{bonuses.filter((bonus) => (bonus?.isSuperBonus || bonus?.is_super_bonus) && bonus?.opened).length}/{superCount}</b></div>
              <div className="streamer-source-bonus-counter extreme"><span><Flame /> EXTREME</span><b>{bonuses.filter((bonus) => (bonus?.isExtremeBonus || bonus?.isExtreme || bonus?.is_extreme_bonus) && bonus?.opened).length}/{extremeCount}</b></div>
            </div>
          </>
        )}
      </header>
      <div className="streamer-source-bonus-listhead"><span>{isOpening ? "OPENING NOW" : "BONUSES"}</span><span>{pending.length} REMAINING</span></div>
      <div className="streamer-source-bonus-list">
        {isOpening && active && <div className="streamer-source-bonus-opening"><small>NOW OPENING</small>{row(active)}</div>}
        <div className="streamer-source-bonus-track">
          {pending.filter(({ index }) => !isOpening || active?.index !== index).length === 0 && !isOpening
            ? opened.slice().reverse().map((item) => row(item))
            : pending.filter(({ index }) => !isOpening || active?.index !== index).map((item) => row(item))}
          {pending.length === 0 && opened.length === 0 && <div className="streamer-source-bonus-empty">No bonuses added yet</div>}
        </div>
      </div>
      {resultSlot && !isOpening && (
        <div className="streamer-source-bonus-summary" aria-label="Best opened bonus">
          <div className="streamer-source-bonus-summary-art"><SlotImage src={slotImage(resultSlot)} alt={slotName(resultSlot, 0)} fit="cover" /></div>
          <div className="streamer-source-bonus-summary-copy"><span>{resultSlot === stats.worstSlot && stats.worstSlot !== stats.bestSlot ? "LOWEST RESULT" : "BEST RESULT"}</span><strong title={slotName(resultSlot, 0)}>{slotName(resultSlot, 0)}</strong><small>{money(resultSlot.betSize ?? resultSlot.bet_size ?? 0, amountUnit)} BET</small></div>
          <div className="streamer-source-bonus-summary-value"><b>{money(resultSlot.payout ?? resultSlot._payout, amountUnit)}</b><small>{Number(resultSlot._multi || 0).toFixed(1)}x</small></div>
        </div>
      )}
      <footer className="streamer-source-bonus-progress">
        <div className="streamer-source-bonus-total"><span>TOTAL PAYOUT</span><b>{money(stats.totalWin, amountUnit)}</b></div>
        <div className="streamer-source-bonus-progress-label"><span>OPENED <b>{opened.length} / {bonuses.length}</b></span><b>{progress}%</b></div>
        <div className="streamer-source-bonus-progress-track"><i style={{ width: `${progress}%` }} /></div>
      </footer>
    </section>
  );
}
