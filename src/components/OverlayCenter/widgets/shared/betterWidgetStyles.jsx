import React, { useMemo } from "react";
import SlotImage from "../SlotImage";
import {
  appearanceAttrs,
  subElementStyle,
  subValue,
} from "./appearanceStyles";

function attrs(widgetType, config, elementId, stateId) {
  return {
    "data-appearance-part": elementId,
    ...appearanceAttrs({ config, widgetType, elementId, stateId }),
  };
}

function numberValue(value, fallback = 0) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function cssPx(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback === undefined ? undefined : cssPx(fallback);
  }
  if (typeof value === "number") return `${value}px`;
  return value;
}

function alphaColor(value, opacity) {
  const raw = String(value || "").trim();
  const hex = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(raw);
  if (!hex) {
    if (/^rgba?\(/i.test(raw)) return raw;
    return `rgba(59,130,246,${opacity})`;
  }
  const full =
    hex[1].length === 3
      ? hex[1]
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : hex[1];
  const int = Number.parseInt(full, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r},${g},${b},${opacity})`;
}

function formatCompactNumber(value, fallback = "0") {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return number.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatMoney(value, currency = "EUR") {
  const number = Number(value) || 0;
  return `${currency}${number.toLocaleString(undefined, {
    minimumFractionDigits: number % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatMultiplier(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return "-";
  return `${number.toLocaleString(undefined, { maximumFractionDigits: 0 })}x`;
}

function initials(value) {
  const source = String(value || "SC").trim();
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function betOptionLabel(option, index) {
  if (typeof option === "string") return option;
  return option?.label || option?.name || `Option ${index + 1}`;
}

function bonusSlotName(bonus, index) {
  return (
    bonus?.slotName ||
    bonus?.slot?.name ||
    bonus?.name ||
    bonus?.title ||
    `Bonus ${index + 1}`
  );
}

function bonusProvider(bonus) {
  return bonus?.slot?.provider || bonus?.provider || "";
}

function bonusImage(bonus) {
  return (
    bonus?.image ||
    bonus?.imageUrl ||
    bonus?.slotImage ||
    bonus?.cover ||
    bonus?.slot?.image ||
    ""
  );
}

function bonusTier(bonus) {
  if (bonus?.isExtremeBonus) return "extreme";
  if (bonus?.isSuperBonus) return "super";
  return "normal";
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function BetterStyleSheet() {
  return (
    <style>{`
      @keyframes better-soft-pulse{0%,100%{opacity:.72;transform:scale(1)}50%{opacity:1;transform:scale(1.04)}}
      @keyframes better-sheen{0%{transform:translateX(-120%)}100%{transform:translateX(120%)}}
      @keyframes better-rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      @keyframes better-float{0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(var(--float-x,12px),var(--float-y,-10px),0)}}
    `}</style>
  );
}

export function BetterBetsStyle({ config, countdown, statusLabel }) {
  const c = config || {};
  const options = safeArray(c.options);
  const bets = c.bets || {};
  const betters = c.betters || {};
  const visibleOptions = options.slice(0, Math.max(2, Math.min(8, numberValue(c.betterVisibleOptions, 6))));
  const totalPool = visibleOptions.reduce(
    (sum, _, index) => sum + (Number(bets[`opt_${index}`]) || 0),
    0,
  );
  const maxBet = Math.max(
    1,
    ...visibleOptions.map((_, index) => Number(bets[`opt_${index}`]) || 0),
  );
  const totalBetters = Object.keys(betters).length;
  const winnerIdx = c.winnerOption ?? null;
  const status = c.gameStatus || "idle";
  const accent = subValue(c, "cardNumberBadge", "background", c.accentColor || c.barFill || "#f59e0b");
  const bg = subValue(c, "widgetBackground", "background", c.bgColor || "#061126");
  const text = subValue(c, "widgetBackground", "textColor", c.textColor || "#eef6ff");
  const muted = c.mutedColor || "rgba(226,232,240,0.68)";
  const border = subValue(c, "widgetBackground", "borderColor", c.borderColor || alphaColor(accent, 0.45));
  const font = subValue(c, "widgetBackground", "fontFamily", c.fontFamily || "'Inter', sans-serif");
  const baseFontSize = numberValue(subValue(c, "widgetBackground", "fontSize", c.fontSize || 14), 14);
  const radius = cssPx(subValue(c, "widgetBackground", "radius", c.borderRadius ?? 16), "16px");
  const columns = Math.max(2, Math.min(4, numberValue(c.betterColumns, visibleOptions.length > 4 ? 3 : 2)));

  const rootStyle = subElementStyle(c, "widgetBackground", {
    width: "100%",
    height: "100%",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: 14,
    background: `linear-gradient(145deg, ${bg}, ${alphaColor(accent, 0.18)})`,
    color: text,
    border: `1px solid ${border}`,
    borderRadius: radius,
    overflow: "hidden",
    fontFamily: font,
    fontSize: baseFontSize,
    boxShadow: `0 18px 42px rgba(0,0,0,0.36), 0 0 28px ${alphaColor(accent, 0.22)}`,
    position: "relative",
  });
  const headerStyle = subElementStyle(c, "header", {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    minHeight: 38,
    padding: "8px 10px",
    borderRadius: 12,
    background: `linear-gradient(90deg, ${alphaColor(accent, 0.24)}, rgba(15,23,42,0.34))`,
    border: `1px solid ${alphaColor(accent, 0.22)}`,
  });
  const cardBase = {
    background: c.cardBg || "rgba(255,255,255,0.07)",
    border: `1px solid ${alphaColor(accent, 0.22)}`,
    borderRadius: cssPx(subValue(c, "individualBetCard", "radius", c.cardRadius ?? 12), "12px"),
  };

  return (
    <div className="better-bets-widget" style={rootStyle} {...attrs("bets", c, "widgetBackground")}>
      <BetterStyleSheet />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: "-40% -30% auto auto",
          width: "70%",
          height: "70%",
          background: `radial-gradient(circle, ${alphaColor(accent, 0.22)}, transparent 68%)`,
          pointerEvents: "none",
        }}
      />
      <div style={headerStyle} {...attrs("bets", c, "header")}>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: baseFontSize * 0.72,
              color: muted,
              fontWeight: 800,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}
          >
            Live bracket
          </div>
          <div
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontWeight: 900,
              fontSize: baseFontSize * 1.12,
              lineHeight: 1.1,
            }}
          >
            {c.question || "Place Your Bets"}
          </div>
        </div>
        <span
          style={subElementStyle(c, "status", {
            flexShrink: 0,
            borderRadius: 999,
            padding: "7px 10px",
            background: status === "open" ? accent : "rgba(148,163,184,0.18)",
            color: status === "open" ? "#061126" : text,
            fontSize: baseFontSize * 0.72,
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }, status)}
          {...attrs("bets", c, "status", status)}
        >
          {status === "open" ? statusLabel || `${countdown}s` : statusLabel || status}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
        {[
          ["poolStat", "Pool", formatCompactNumber(totalPool)],
          ["timerStat", status === "open" ? "Timer" : "State", status === "open" ? `${countdown}s` : status.toUpperCase()],
          ["betsStat", "Bets", formatCompactNumber(totalBetters)],
        ].map(([part, label, value]) => (
          <div
            key={part}
            style={subElementStyle(c, part, {
              minWidth: 0,
              borderRadius: 10,
              background: "rgba(255,255,255,0.055)",
              border: "1px solid rgba(255,255,255,0.08)",
              padding: "8px 6px",
              textAlign: "center",
            })}
            {...attrs("bets", c, part)}
          >
            <div style={{ fontWeight: 950, fontSize: baseFontSize * 1.1, lineHeight: 1 }}>{value}</div>
            <div style={{ marginTop: 3, color: muted, fontSize: baseFontSize * 0.66, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      <div
        style={subElementStyle(c, "betCards", {
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))`,
          gap: 9,
          minHeight: 0,
          flex: 1,
        })}
        {...attrs("bets", c, "betCards")}
      >
        {visibleOptions.map((option, index) => {
          const amount = Number(bets[`opt_${index}`]) || 0;
          const pct = totalPool > 0 ? Math.round((amount / totalPool) * 100) : 0;
          const fill = Math.max(4, Math.round((amount / maxBet) * 100));
          const isWinner = winnerIdx === index;
          const isLoser = winnerIdx !== null && winnerIdx !== index;
          const optionAccent = c.barColorMode === "rainbow"
            ? ["#f59e0b", "#22c55e", "#38bdf8", "#a78bfa", "#fb7185", "#eab308"][index % 6]
            : accent;
          return (
            <div
              key={`${index}-${betOptionLabel(option, index)}`}
              style={subElementStyle(c, "individualBetCard", {
                ...cardBase,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: 86,
                padding: 10,
                position: "relative",
                overflow: "hidden",
                opacity: isLoser ? 0.62 : 1,
                boxShadow: isWinner ? `0 0 22px ${alphaColor(optionAccent, 0.5)}` : undefined,
                animation: "better-rise 220ms ease-out both",
                animationDelay: `${index * 35}ms`,
              }, isWinner ? "winner" : isLoser ? "loser" : "default")}
              {...attrs("bets", c, "individualBetCard", isWinner ? "winner" : isLoser ? "loser" : "default")}
            >
                <span
                  aria-hidden="true"
                  style={subElementStyle(c, "progressBar", {
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: `${fill}%`,
                    background: `linear-gradient(180deg, ${alphaColor(optionAccent, 0.06)}, ${alphaColor(optionAccent, 0.34)})`,
                    transition: "height 300ms ease",
                  }, isWinner ? "winner" : isLoser ? "loser" : "default")}
                  {...attrs("bets", c, "progressBar", isWinner ? "winner" : isLoser ? "loser" : "default")}
                />
              <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={subElementStyle(c, "cardNumberBadge", {
                    width: 28,
                    height: 28,
                    borderRadius: 9,
                    display: "grid",
                    placeItems: "center",
                    background: optionAccent,
                    color: "#061126",
                    fontWeight: 950,
                  })}
                  {...attrs("bets", c, "cardNumberBadge")}
                >
                  {index + 1}
                </span>
                <strong
                  style={subElementStyle(c, "cardRangeText", {
                    minWidth: 0,
                    color: text,
                    fontSize: baseFontSize * 0.86,
                    lineHeight: 1.15,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  })}
                  {...attrs("bets", c, "cardRangeText")}
                >
                  {betOptionLabel(option, index)}
                </strong>
              </div>
              <div style={{ position: "relative", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
                <span
                  style={subElementStyle(c, "cardLabel", {
                    color: muted,
                    fontSize: baseFontSize * 0.72,
                  })}
                  {...attrs("bets", c, "cardLabel")}
                >
                  {formatCompactNumber(amount)} pts
                </span>
                <span
                  style={subElementStyle(c, "cardPercentageText", {
                    color: optionAccent,
                    fontSize: baseFontSize * 1.35,
                    fontWeight: 950,
                    lineHeight: 0.95,
                  })}
                  {...attrs("bets", c, "cardPercentageText")}
                >
                  {pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {status === "open" && (
        <div
          style={subElementStyle(c, "footerInstruction", {
            color: muted,
            fontSize: baseFontSize * 0.76,
            fontWeight: 700,
            textAlign: "center",
          })}
          {...attrs("bets", c, "footerInstruction")}
        >
          Type {c.chatCommand || "!bet"} &lt;number&gt; to join
        </div>
      )}
    </div>
  );
}

export function BetterBonusHuntStyle({ config, bonuses, stats, currency }) {
  const c = config || {};
  const rows = safeArray(bonuses);
  const opened = rows.filter((bonus) => bonus?.opened);
  const current = rows.find((bonus) => !bonus?.opened) || rows[0] || null;
  const accent = subValue(c, "headerContainer", "accentColor", c.headerAccent || c.accentColor || "#f59e0b");
  const bg = subValue(c, "container", "background", c.headerColor || c.bgColor || "#061126");
  const text = subValue(c, "container", "textColor", c.textColor || "#eef6ff");
  const muted = c.mutedTextColor || c.mutedColor || "rgba(226,232,240,0.68)";
  const cardBg = subValue(c, "slotListContainer", "background", c.listCardColor || "rgba(255,255,255,0.07)");
  const font = subValue(c, "container", "fontFamily", c.fontFamily || "'Inter', sans-serif");
  const fontSize = numberValue(subValue(c, "container", "fontSize", c.fontSize || 13), 13);
  const radius = cssPx(subValue(c, "container", "radius", c.cardRadius ?? 18), "18px");
  const totalPay = stats?.totalWin || opened.reduce((sum, bonus) => sum + (Number(bonus?.payout) || 0), 0);
  const totalBet = stats?.totalBetAll || rows.reduce((sum, bonus) => sum + (Number(bonus?.betSize) || 0), 0);
  const avgMulti = stats?.avgMulti || (totalBet ? totalPay / totalBet : 0);
  const progress = rows.length ? Math.round((opened.length / rows.length) * 100) : 0;

  return (
    <div
      style={subElementStyle(c, "container", {
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        display: "grid",
        gridTemplateRows: "auto minmax(0,1fr) auto",
        gap: 10,
        padding: 14,
        borderRadius: radius,
        overflow: "hidden",
        position: "relative",
        color: text,
        background: `linear-gradient(145deg, ${bg}, ${alphaColor(accent, 0.17)})`,
        border: `1px solid ${alphaColor(accent, 0.38)}`,
        boxShadow: `0 20px 46px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.08)`,
        fontFamily: font,
        fontSize,
      })}
      {...attrs("bonus_hunt", c, "container")}
    >
      <BetterStyleSheet />
      <div
        style={subElementStyle(c, "headerContainer", {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        })}
        {...attrs("bonus_hunt", c, "headerContainer")}
      >
        <div>
          <div style={{ color: muted, fontSize: fontSize * 0.72, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase" }}>
            {c.bonusOpening ? "Bonus opening" : "Bonus hunt"}
          </div>
          <strong
            style={{ display: "block", fontSize: fontSize * 1.5, lineHeight: 1.05, textTransform: "uppercase" }}
            {...attrs("bonus_hunt", c, "headerTitle")}
          >
            {c.title || c.huntTitle || "Hunt session"}
          </strong>
        </div>
        <span
          style={subElementStyle(c, "statValue", {
            borderRadius: 999,
            background: alphaColor(accent, 0.18),
            color: accent,
            border: `1px solid ${alphaColor(accent, 0.42)}`,
            padding: "7px 10px",
            fontWeight: 900,
          })}
          {...attrs("bonus_hunt", c, "statValue")}
        >
          {opened.length}/{rows.length}
        </span>
      </div>

      <div
        style={subElementStyle(c, "slotCarouselContainer", {
          display: "grid",
          gridTemplateColumns: "minmax(0,1.25fr) minmax(0,1fr)",
          gap: 10,
          minHeight: 0,
        })}
        {...attrs("bonus_hunt", c, "slotCarouselContainer")}
      >
        <div
          style={subElementStyle(c, "carouselBackdrop", {
            minWidth: 0,
            display: "grid",
            gridTemplateRows: "minmax(0,1fr) auto",
            borderRadius: 16,
            overflow: "hidden",
            background: `linear-gradient(180deg, ${alphaColor(accent, 0.16)}, rgba(15,23,42,0.64))`,
            border: `1px solid ${alphaColor(accent, 0.32)}`,
          })}
          {...attrs("bonus_hunt", c, "carouselBackdrop")}
        >
          <div style={{ minHeight: 0, position: "relative" }}>
            {current ? (
              <SlotImage
                src={bonusImage(current)}
                alt={bonusSlotName(current, 0)}
                style={{ width: "100%", height: "100%", objectFit: "cover", filter: "saturate(1.08) contrast(1.02)" }}
                {...attrs("bonus_hunt", c, "slotImage")}
              />
            ) : (
              <div style={{ width: "100%", height: "100%", background: alphaColor(accent, 0.12) }} />
            )}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 25%, rgba(0,0,0,0.78))" }} />
          </div>
          <div style={{ padding: 12, position: "relative" }}>
            <div style={{ color: muted, fontSize: fontSize * 0.76, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.14em" }}>
              Current slot
            </div>
            <strong style={{ display: "block", fontSize: fontSize * 1.28, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {current ? bonusSlotName(current, 0) : "No bonuses yet"}
            </strong>
            <div style={{ display: "flex", gap: 8, marginTop: 6, color: muted, fontSize: fontSize * 0.84 }}>
              {current?.betSize ? <span>{formatMoney(current.betSize, currency)} bet</span> : null}
              {bonusProvider(current) ? <span>{bonusProvider(current)}</span> : null}
            </div>
          </div>
        </div>

        <div
          style={subElementStyle(c, "mainStatsContainer", {
            display: "grid",
            gridTemplateRows: "repeat(4,minmax(0,1fr))",
            gap: 8,
            minHeight: 0,
          })}
          {...attrs("bonus_hunt", c, "mainStatsContainer")}
        >
          {[
            ["Total bet", formatMoney(totalBet, currency)],
            ["Total pay", formatMoney(totalPay, currency)],
            ["Average", formatMultiplier(avgMulti)],
            ["Progress", `${progress}%`],
          ].map(([label, value]) => (
            <div
              key={label}
              style={subElementStyle(c, "statCell", {
                minWidth: 0,
                borderRadius: 12,
                background: cardBg,
                border: "1px solid rgba(255,255,255,0.08)",
                padding: "8px 10px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              })}
              {...attrs("bonus_hunt", c, "statCell")}
            >
              <span
                style={subElementStyle(c, "statLabel", {
                  color: muted,
                  fontSize: fontSize * 0.7,
                  fontWeight: 800,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                })}
                {...attrs("bonus_hunt", c, "statLabel")}
              >
                {label}
              </span>
              <strong
                style={subElementStyle(c, "statValue", {
                  color: label === "Total pay" ? accent : text,
                  fontSize: fontSize * 1.08,
                })}
                {...attrs("bonus_hunt", c, "statValue")}
              >
                {value}
              </strong>
            </div>
          ))}
        </div>
      </div>

      <div
        style={subElementStyle(c, "footerContainer", {
          display: "grid",
          gap: 8,
          minHeight: 0,
        })}
        {...attrs("bonus_hunt", c, "footerContainer")}
      >
        <div
          style={subElementStyle(c, "progressBar", {
            height: 6,
            borderRadius: 999,
            background: "rgba(255,255,255,0.08)",
            overflow: "hidden",
          })}
          {...attrs("bonus_hunt", c, "progressBar")}
        >
          <span
            style={subElementStyle(c, "progressBarFill", {
              display: "block",
              width: `${progress}%`,
              height: "100%",
              borderRadius: "inherit",
              background: `linear-gradient(90deg, ${accent}, ${alphaColor(accent, 0.48)})`,
            })}
            {...attrs("bonus_hunt", c, "progressBarFill")}
          />
        </div>
        <div
          style={subElementStyle(c, "slotListContainer", {
            display: "grid",
            gridAutoFlow: "column",
            gridAutoColumns: "minmax(120px, 1fr)",
            gap: 8,
            overflow: "hidden",
          })}
          {...attrs("bonus_hunt", c, "slotListContainer")}
        >
          {rows.slice(0, 6).map((bonus, index) => {
            const tier = bonusTier(bonus);
            const isCurrent = current === bonus;
            return (
              <div
                key={`${bonusSlotName(bonus, index)}-${index}`}
                style={subElementStyle(c, "slotRow", {
                  borderRadius: 12,
                  background: isCurrent ? alphaColor(accent, 0.22) : cardBg,
                  border: `1px solid ${isCurrent ? alphaColor(accent, 0.48) : "rgba(255,255,255,0.08)"}`,
                  padding: 8,
                  minWidth: 0,
                }, bonus?.opened ? "opened" : "unopened")}
                {...attrs("bonus_hunt", c, "slotRow", bonus?.opened ? "opened" : "unopened")}
              >
                <div
                  style={subElementStyle(c, "statLabel", {
                    fontSize: fontSize * 0.74,
                    color: tier === "extreme" ? "#fb7185" : tier === "super" ? "#facc15" : muted,
                    fontWeight: 900,
                    textTransform: "uppercase",
                  })}
                  {...attrs("bonus_hunt", c, "statLabel")}
                >
                  {tier}
                </div>
                <strong
                  style={subElementStyle(c, "slotTitle", {
                    display: "block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    marginTop: 3,
                  })}
                  {...attrs("bonus_hunt", c, "slotTitle")}
                >
                  {bonusSlotName(bonus, index)}
                </strong>
                <span
                  style={subElementStyle(c, "statValue", {
                    color: muted,
                    fontSize: fontSize * 0.78,
                  })}
                  {...attrs("bonus_hunt", c, "statValue")}
                >
                  {bonus?.opened ? formatMoney(bonus?.payout, currency) : formatMoney(bonus?.betSize, currency)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function BetterGiveawayStyle({ config }) {
  const c = config || {};
  const participants = safeArray(c.participants);
  const winner = c.winner || "";
  const spinningWinner = c.spinningWinner || "";
  const isActive = !!c.isActive;
  const keyword = String(c.keyword || "").replace(/^!+/, "");
  const accent = subValue(c, "celebration", "accentColor", c.accentColor || "#f59e0b");
  const bg = subValue(c, "container", "background", c.bgColor || "#081226");
  const text = subValue(c, "container", "textColor", c.textColor || "#f8fafc");
  const muted = subValue(c, "label", "textColor", c.mutedColor || "rgba(226,232,240,0.68)");
  const font = subValue(c, "container", "fontFamily", c.fontFamily || "'Inter', sans-serif");
  const chips = participants.length ? participants.slice(-10) : [keyword ? `!${keyword}` : "waiting"];
  const hasWinner = Boolean(winner);

  return (
    <div
      style={subElementStyle(c, "container", {
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        display: "grid",
        gridTemplateRows: "auto minmax(0,1fr) auto",
        gap: 12,
        padding: 16,
        overflow: "hidden",
        borderRadius: cssPx(c.borderRadius ?? 18, "18px"),
        border: `1px solid ${alphaColor(accent, 0.4)}`,
        background: `linear-gradient(145deg, ${bg}, ${alphaColor(accent, 0.16)})`,
        color: text,
        fontFamily: font,
        boxShadow: `0 18px 44px rgba(0,0,0,0.38), 0 0 26px ${alphaColor(accent, 0.2)}`,
        position: "relative",
      })}
      {...attrs("giveaway", c, "container")}
    >
      <BetterStyleSheet />
      <div
        style={subElementStyle(c, "header", {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        })}
        {...attrs("giveaway", c, "header")}
      >
        <div>
          <div style={{ color: muted, fontSize: 11, fontWeight: 850, letterSpacing: "0.18em", textTransform: "uppercase" }}>
            {hasWinner ? "Winner selected" : isActive ? "Live giveaway" : "Giveaway"}
          </div>
          <strong style={{ display: "block", fontSize: "clamp(18px,5cqw,28px)", lineHeight: 1.05 }}>
            {c.title || "Giveaway"}
          </strong>
        </div>
        <span
          style={subElementStyle(c, "statusBadge", {
            borderRadius: 999,
            padding: "7px 11px",
            background: isActive && !hasWinner ? accent : "rgba(148,163,184,0.16)",
            color: isActive && !hasWinner ? "#081226" : text,
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }, hasWinner ? "winner" : isActive ? "live" : "closed")}
          {...attrs("giveaway", c, "statusBadge", hasWinner ? "winner" : isActive ? "live" : "closed")}
        >
          {hasWinner ? "Done" : isActive ? "Live" : "Off"}
        </span>
      </div>

      <div
        style={subElementStyle(c, "progressSection", {
          minHeight: 0,
          borderRadius: 18,
          border: `1px solid ${alphaColor(accent, 0.28)}`,
          background: "rgba(255,255,255,0.055)",
          display: "grid",
          gridTemplateRows: "auto minmax(0,1fr)",
          overflow: "hidden",
        })}
        {...attrs("giveaway", c, "progressSection")}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "rgba(255,255,255,0.08)" }}>
          <div
            style={subElementStyle(c, "keyword", {
              background: "rgba(8,18,38,0.82)",
              padding: 12,
            })}
            {...attrs("giveaway", c, "keyword")}
          >
            <span style={{ color: muted, fontSize: 11, fontWeight: 850, textTransform: "uppercase", letterSpacing: "0.14em" }}>Command</span>
            <strong style={{ display: "block", color: accent, fontSize: 22 }}>{keyword ? `!${keyword}` : "-"}</strong>
          </div>
          <div
            style={subElementStyle(c, "participantCount", {
              background: "rgba(8,18,38,0.82)",
              padding: 12,
            })}
            {...attrs("giveaway", c, "participantCount")}
          >
            <span style={{ color: muted, fontSize: 11, fontWeight: 850, textTransform: "uppercase", letterSpacing: "0.14em" }}>Entries</span>
            <strong style={{ display: "block", fontSize: 22 }}>{participants.length}</strong>
          </div>
        </div>
        <div style={{ position: "relative", display: "grid", placeItems: "center", padding: 14, minHeight: 0 }}>
          {hasWinner ? (
            <div
              style={subElementStyle(c, "winnerArea", {
                textAlign: "center",
                animation: "better-rise 260ms ease-out both",
              }, "winner")}
              {...attrs("giveaway", c, "winnerArea", "winner")}
            >
              <div style={{ color: muted, fontSize: 12, fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase" }}>Winner</div>
              <strong style={{ display: "block", color: accent, fontSize: "clamp(28px,11cqw,52px)", lineHeight: 1 }}>
                {winner}
              </strong>
              {c.prize ? <div style={{ marginTop: 8, color: text, fontWeight: 800 }}>{c.prize}</div> : null}
            </div>
          ) : spinningWinner ? (
            <strong
              style={subElementStyle(c, "winnerArea", {
                color: accent,
                fontSize: "clamp(26px,10cqw,46px)",
              }, "drawing")}
              {...attrs("giveaway", c, "winnerArea", "drawing")}
            >
              {spinningWinner}
            </strong>
          ) : (
            <div
              style={subElementStyle(c, participants.length ? "winnerArea" : "emptyState", {
                width: "100%",
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: 8,
              }, participants.length ? "live" : "empty")}
              {...attrs("giveaway", c, participants.length ? "winnerArea" : "emptyState", participants.length ? "live" : "empty")}
            >
              {chips.map((name, index) => (
                <span
                  key={`${name}-${index}`}
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    background: alphaColor(accent, index % 3 === 0 ? 0.32 : 0.18),
                    border: `1px solid ${alphaColor(accent, 0.4)}`,
                    color: text,
                    fontWeight: 950,
                    animation: `better-float ${4 + index * 0.25}s ease-in-out infinite`,
                    "--float-x": `${index % 2 ? -8 : 8}px`,
                    "--float-y": `${index % 3 ? -6 : 6}px`,
                  }}
                  title={name}
                >
                  {initials(name)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div
        style={subElementStyle(c, "prize", {
          color: c.prize ? text : muted,
          fontWeight: 800,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          textAlign: "center",
        })}
        {...attrs("giveaway", c, "prize")}
      >
        {c.prize || (isActive ? "Waiting for chat entries" : "Set a prize and start the giveaway")}
      </div>
    </div>
  );
}

export function BetterChatHeader({ config, chatHeaderName, headerText, accentColor }) {
  const c = config || {};
  return (
    <div
      style={subElementStyle(c, "header", {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        padding: "10px 12px",
        borderBottom: `1px solid ${alphaColor(accentColor, 0.28)}`,
        background: `linear-gradient(90deg, ${alphaColor(accentColor, 0.18)}, rgba(2,8,23,0.18))`,
      })}
      {...attrs("chat", c, "header")}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: accentColor,
            boxShadow: `0 0 12px ${accentColor}`,
            animation: "better-soft-pulse 1.8s ease-in-out infinite",
          }}
          {...attrs("chat", c, "badge")}
        />
        <strong style={{ color: headerText, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.12em" }}>
          {chatHeaderName}
        </strong>
      </span>
      <span style={{ color: alphaColor(headerText, 0.72), fontWeight: 900, fontSize: "0.72em", textTransform: "uppercase", letterSpacing: "0.16em" }}>
        Live
      </span>
    </div>
  );
}

export function BetterChatMessage({
  msg,
  platform,
  nameColor,
  followerMessage = false,
  context,
  msgIdx,
}) {
  const c = context.config || {};
  const accent = context.badgeBg || context.usernameColor || "#38bdf8";
  const baseBg = context.messageBg || "rgba(255,255,255,0.07)";
  const rowPart = followerMessage ? "highlightedMessage" : "message";
  const resolveRowStyle = followerMessage
    ? context.highlightedMessageStyle || context.messagePartStyle
    : context.messagePartStyle;
  const messageStyle = resolveRowStyle({
    display: "grid",
    gridTemplateColumns: "34px minmax(0,1fr)",
    gap: 9,
    margin: `${Math.max(2, Number(context.msgSpacing) || 2)}px 8px`,
    padding: "8px 10px",
    borderRadius: Math.max(10, Number(context.borderRadius) || 12),
    background: followerMessage
      ? `linear-gradient(135deg, ${alphaColor(accent, 0.26)}, rgba(2,8,23,0.44))`
      : `linear-gradient(135deg, ${baseBg}, rgba(2,8,23,0.3))`,
    border: `${Number(context.borderWidth) || 1}px solid ${followerMessage ? alphaColor(accent, 0.5) : context.borderColor || alphaColor(accent, 0.24)}`,
    boxShadow: followerMessage
      ? `0 0 22px ${alphaColor(accent, 0.26)}, inset 0 1px 0 rgba(255,255,255,0.08)`
      : `0 8px 22px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.05)`,
    animation: followerMessage
      ? "better-rise 200ms ease-out both, better-soft-pulse 2.2s ease-in-out infinite"
      : "better-rise 200ms ease-out both",
    animationDelay: `${Math.min(msgIdx * 25, 180)}ms`,
  });
  return (
    <div style={messageStyle} {...attrs("chat", c, rowPart)}>
      <span
        style={context.avatarStyle({
          width: 34,
          height: 34,
          borderRadius: 10,
          display: "grid",
          placeItems: "center",
          background: alphaColor(nameColor || accent, 0.2),
          border: `1px solid ${alphaColor(nameColor || accent, 0.42)}`,
          color: nameColor || accent,
          fontWeight: 950,
          fontSize: 12,
        })}
        {...attrs("chat", c, "avatar")}
      >
        {initials(msg.username)}
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <strong
            style={context.usernameStyle({
              color: nameColor,
              fontWeight: 900,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            })}
            {...attrs("chat", c, "username")}
          >
            {msg.username || "viewer"}
          </strong>
          <span
            style={context.badgeStyle({
              flexShrink: 0,
              borderRadius: 999,
              background: alphaColor(platform?.color || accent, 0.18),
              color: platform?.color || accent,
              fontSize: 10,
              fontWeight: 900,
              padding: "1px 6px",
            })}
            {...attrs("chat", c, "badge")}
          >
            {platform?.icon || "C"}
          </span>
        </span>
        <span
          style={context.messageTextStyle({
            display: "block",
            marginTop: 2,
            color: context.textColor,
            lineHeight: context.msgLineHeight,
            overflowWrap: "anywhere",
          })}
          {...attrs("chat", c, "messageText")}
        >
          {msg.message}
        </span>
      </span>
    </div>
  );
}

export function BetterRtpStatsStyle({
  config,
  displaySlotName,
  displayProvider,
  displayProviderLogo,
  displayInfo,
  displayBestWin,
  currency,
  bestWinEmptyText,
  isLive,
  previewMode,
  showRtp = true,
  showPotential = true,
  showVolatility = true,
  showBestWin = true,
}) {
  const c = config || {};
  const accent = subValue(c, "rtpValue", "accentColor", c.rtpIconColor || c.accentColor || "#f59e0b");
  const bgFrom = subValue(c, "container", "background", c.barBgFrom || "#071226");
  const bgTo = c.barBgTo || "#030712";
  const text = subValue(c, "slotTitle", "textColor", c.slotNameColor || c.textColor || "#f8fafc");
  const muted = subValue(c, "label", "textColor", c.labelColor || "rgba(226,232,240,0.66)");
  const font = subValue(c, "container", "fontFamily", c.fontFamily || "'Inter', sans-serif");
  const fontSize = numberValue(subValue(c, "container", "fontSize", c.fontSize || 14), 14);
  const bestAmount = displayBestWin?.best_win
    ? `${currency}${Number(displayBestWin.best_win).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
    : bestWinEmptyText || "-";
  const bestMulti = displayBestWin?.best_multiplier ? ` / ${formatMultiplier(displayBestWin.best_multiplier)}` : "";

  return (
    <div
      className="oc-widget-inner rtp-stats-bar rtp-stats-bar--better"
      style={subElementStyle(c, "container", {
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "8px 14px",
        borderRadius: cssPx(c.borderRadius ?? 14, "14px"),
        background: `linear-gradient(180deg, ${bgFrom}, ${bgTo})`,
        border: `1px solid ${subValue(c, "container", "borderColor", c.borderColor || alphaColor(accent, 0.46))}`,
        color: text,
        fontFamily: font,
        fontSize,
        boxShadow: `0 14px 34px rgba(0,0,0,0.35), 0 0 20px ${alphaColor(accent, 0.22)}`,
        overflow: "hidden",
        position: "relative",
      })}
      {...attrs("rtp_stats", c, "container")}
    >
      <BetterStyleSheet />
      {!isLive && previewMode ? (
        <span style={{ position: "absolute", top: 5, right: 8, color: muted, fontSize: 9, fontWeight: 900, letterSpacing: "0.12em" }}>
          PREVIEW
        </span>
      ) : null}
      {displayProvider ? (
        <div
          style={subElementStyle(c, "provider", {
            display: "flex",
            alignItems: "center",
            gap: 8,
            minWidth: 0,
            flexShrink: 0,
          })}
          {...attrs("rtp_stats", c, "provider")}
        >
          {displayProviderLogo ? (
            <img src={displayProviderLogo} alt="" style={{ height: 30, maxWidth: 110, objectFit: "contain", borderRadius: 6 }} />
          ) : null}
          <span style={{ color: accent, fontWeight: 950, letterSpacing: "0.16em", textTransform: "uppercase", fontSize: fontSize * 0.78 }}>
            {displayProvider}
          </span>
        </div>
      ) : null}
      <div
        style={subElementStyle(c, "slotTitle", {
          minWidth: 0,
          flex: "1 1 auto",
        })}
        {...attrs("rtp_stats", c, "slotTitle")}
      >
        <strong style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: fontSize * 1.3, textTransform: "uppercase" }}>
          {displaySlotName || "-"}
        </strong>
      </div>
      {[
        ["rtpValue", "RTP", displayInfo?.rtp ? `${displayInfo.rtp}%` : "-"],
        ["maxWin", "Potential", formatMultiplier(displayInfo?.max_win_multiplier)],
        ["volatility", "Volatility", String(displayInfo?.volatility || "-").replace(/_/g, " ").toUpperCase()],
        ["personalBest", "Best win", `${bestAmount}${bestMulti}`],
      ]
        .filter(([part]) => {
          if (part === "rtpValue") return showRtp;
          if (part === "maxWin") return showPotential;
          if (part === "volatility") return showVolatility;
          if (part === "personalBest") return showBestWin;
          return true;
        })
        .map(([part, label, value]) => (
        <div
          key={part}
          style={subElementStyle(c, "statCard", {
            flexShrink: 0,
            minWidth: part === "personalBest" ? 150 : 92,
            padding: "6px 9px",
            borderRadius: 10,
            background: "rgba(255,255,255,0.055)",
            border: "1px solid rgba(255,255,255,0.08)",
          })}
          {...attrs("rtp_stats", c, "statCard")}
        >
          <span
            style={subElementStyle(c, "label", {
              display: "block",
              color: muted,
              fontSize: fontSize * 0.62,
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
            })}
            {...attrs("rtp_stats", c, "label")}
          >
            {label}
          </span>
          <strong
            style={subElementStyle(c, part, {
              display: "block",
              color: part === "rtpValue" ? accent : text,
              fontSize: fontSize * 0.95,
              whiteSpace: "nowrap",
            })}
            {...attrs("rtp_stats", c, part)}
          >
            {value}
          </strong>
        </div>
      ))}
    </div>
  );
}

export function BetterBackgroundStyle({ config }) {
  const c = config || {};
  const color1 = subValue(c, "texture", "background", c.color1 || "#030712");
  const color2 = subValue(c, "texture", "accentColor", c.color2 || "#1d4ed8");
  const color3 = subValue(c, "texture", "fillColor", c.color3 || "#f59e0b");
  const imageUrl = subValue(c, "media", "imageUrl", c.imageUrl || "");
  const videoUrl = subValue(c, "media", "videoUrl", c.videoUrl || "");
  const imageFit = subValue(c, "media", "imageFit", c.imageFit || "cover");
  const sourceMode = subValue(c, "source", "bgMode", c.bgMode || "texture");
  const opacity = Math.max(0, Math.min(100, numberValue(subValue(c, "canvas", "opacity", c.opacity ?? 100), 100))) / 100;
  const speed = Math.max(4, numberValue(subValue(c, "texture", "animSpeed", c.animSpeed || 10), 10));
  const mediaOpacityRaw = numberValue(subValue(c, "media", "opacity", c.mediaOpacity ?? 88), 88);
  const mediaOpacity = mediaOpacityRaw > 1 ? mediaOpacityRaw / 100 : mediaOpacityRaw;
  const mediaFilter = [
    `brightness(${subValue(c, "media", "brightness", c.brightness ?? 100)}%)`,
    `contrast(${subValue(c, "media", "contrast", c.contrast ?? 100)}%)`,
    `saturate(${subValue(c, "media", "saturation", c.saturation ?? 100)}%)`,
    `blur(${subValue(c, "media", "blur", c.blur ?? 0)}px)`,
    `hue-rotate(${subValue(c, "media", "hueRotate", c.hueRotate ?? 0)}deg)`,
    `grayscale(${subValue(c, "media", "grayscale", c.grayscale ?? 0)}%)`,
    `sepia(${subValue(c, "media", "sepia", c.sepia ?? 0)}%)`,
  ].join(" ");
  const imagePosition = subValue(c, "media", "backgroundPosition", c.imagePosition || "center");
  const tintColor = subValue(c, "tint", "background", c.overlayColor || "transparent");
  const tintOpacityRaw = numberValue(subValue(c, "tint", "opacity", c.overlayOpacity ?? 0), 0);
  const tintOpacity = tintOpacityRaw > 1 ? tintOpacityRaw / 100 : tintOpacityRaw;
  const particles = useMemo(
    () =>
      Array.from({ length: 22 }, (_, index) => ({
        left: `${(index * 37) % 100}%`,
        top: `${(index * 53) % 100}%`,
        size: 60 + ((index * 19) % 90),
        delay: `${(index % 8) * -0.8}s`,
        duration: `${speed + (index % 5)}s`,
        color: index % 3 === 0 ? color3 : color2,
      })),
    [color2, color3, speed],
  );

  const layerBase = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
  };

  return (
    <div
      className="oc-bg-widget oc-bg-widget--better"
      style={subElementStyle(c, "canvas", {
        width: "100%",
        height: "100%",
        borderRadius: cssPx(c.borderRadius ?? 0, "0px"),
        overflow: "hidden",
        opacity,
        position: "relative",
        background: color1,
      })}
      {...attrs("background", c, "canvas")}
    >
      <BetterStyleSheet />
      <div
        style={subElementStyle(c, "texture", {
          ...layerBase,
          background: `radial-gradient(circle at 20% 20%, ${alphaColor(color3, 0.28)}, transparent 30%), radial-gradient(circle at 82% 35%, ${alphaColor(color2, 0.32)}, transparent 34%), linear-gradient(135deg, ${color1}, ${alphaColor(color2, 0.48)} 52%, ${color1})`,
          filter: `saturate(${c.saturation ?? 100}%) contrast(${c.contrast ?? 100}%) brightness(${c.brightness ?? 100}%)`,
        })}
        {...attrs("background", c, "texture")}
      />
      {sourceMode === "image" && imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          style={subElementStyle(c, "media", {
            ...layerBase,
            objectFit: imageFit,
            objectPosition: imagePosition,
            opacity: mediaOpacity,
            filter: mediaFilter,
          })}
          {...attrs("background", c, "media")}
        />
      ) : null}
      {sourceMode === "video" && videoUrl ? (
        <video
          src={videoUrl}
          autoPlay
          loop
          muted
          playsInline
          style={subElementStyle(c, "media", {
            ...layerBase,
            objectFit: imageFit,
            objectPosition: imagePosition,
            opacity: mediaOpacity,
            filter: mediaFilter,
          })}
          {...attrs("background", c, "media")}
        />
      ) : null}
      <div
        style={subElementStyle(c, "tint", {
          ...layerBase,
          background: tintColor,
          opacity: tintOpacity,
          pointerEvents: "none",
        })}
        {...attrs("background", c, "tint")}
      />
      <div
        style={subElementStyle(c, "effects", {
          ...layerBase,
          overflow: "hidden",
          pointerEvents: "none",
        })}
        {...attrs("background", c, "effects")}
      >
        {particles.map((particle, index) => (
          <span
            key={index}
            style={{
              position: "absolute",
              left: particle.left,
              top: particle.top,
              width: particle.size,
              height: particle.size,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${alphaColor(particle.color, 0.26)}, transparent 68%)`,
              filter: "blur(14px)",
              animation: `better-float ${particle.duration} ease-in-out ${particle.delay} infinite`,
              "--float-x": `${index % 2 ? -26 : 22}px`,
              "--float-y": `${index % 3 ? -18 : 20}px`,
            }}
          />
        ))}
      </div>
      <div
        style={{
          ...layerBase,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "54px 54px",
          maskImage: "linear-gradient(180deg, rgba(0,0,0,0.9), rgba(0,0,0,0.18))",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
