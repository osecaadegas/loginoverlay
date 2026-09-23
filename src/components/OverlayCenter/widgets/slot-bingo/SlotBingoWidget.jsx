import { Check, Star } from "lucide-react";
import {
  appearanceAttrs,
  subElementStyle,
} from "../shared/appearanceStyles";
import {
  countCompletedSlotBingoSquares,
  countSlotBingoLines,
  formatSlotBingoMultiplier,
  getSlotBingoSquareCount,
  normalizeSlotBingoConfig,
} from "./slotBingoModel";
import "./SlotBingoWidget.css";

export default function SlotBingoWidget({ config = {}, widgetId }) {
  const c = normalizeSlotBingoConfig(config);
  const squareCount = getSlotBingoSquareCount(c.boardRows);
  const visibleSquares = c.squares.slice(0, squareCount);
  const completed = countCompletedSlotBingoSquares(c.squares, c.boardRows);
  const lines = countSlotBingoLines(c.squares, c.boardRows);
  const footer = c.footerMode === "lines" ? `Lines: ${lines}` : `BINGO x${lines}`;
  const rootStyle = {
    "--sb-bg": c.backgroundColor,
    "--sb-panel": c.panelColor,
    "--sb-card": c.cardColor,
    "--sb-border": c.borderColor,
    "--sb-accent": c.accentColor,
    "--sb-secondary": c.secondaryColor,
    "--sb-completed": c.completedColor,
    "--sb-text": c.textColor,
    "--sb-muted": c.mutedColor,
    "--sb-radius": `${c.borderRadius}px`,
    "--sb-card-radius": `${c.cardRadius}px`,
    "--sb-gap": `${c.cardGap}px`,
    "--sb-padding": `${c.padding}px`,
    "--sb-glow": c.glowIntensity / 100,
    "--sb-title-size": `${c.titleSize}px`,
    "--sb-square-size": `${c.squareTextSize}px`,
    "--sb-multiplier-size": `${c.multiplierTextSize}px`,
    "--sb-footer-size": `${c.footerSize}px`,
    "--sb-font": c.fontFamily,
    "--sb-rows": c.boardRows,
    ...subElementStyle(c, "container", {}),
  };

  return (
    <section
      className="slot-bingo-widget"
      aria-label={c.title}
      style={rootStyle}
      {...appearanceAttrs({ config: c, widgetId, widgetType: "slot_bingo", elementId: "container" })}
    >
      <header
        className="slot-bingo-widget__header"
        style={subElementStyle(c, "header", {})}
        {...appearanceAttrs({ config: c, widgetId, widgetType: "slot_bingo", elementId: "header" })}
      >
        <h2
          style={subElementStyle(c, "title", {})}
          {...appearanceAttrs({ config: c, widgetId, widgetType: "slot_bingo", elementId: "title" })}
        >
          {c.title}
        </h2>
        {c.showProgress && (
          <div
            className="slot-bingo-widget__progress"
            aria-label={`${completed} of ${squareCount} squares complete`}
            style={subElementStyle(c, "progressBadge", {})}
            {...appearanceAttrs({ config: c, widgetId, widgetType: "slot_bingo", elementId: "progressBadge" })}
          >
            <strong>{completed}</strong><span>/ {squareCount}</span>
          </div>
        )}
      </header>

      <div
        className="slot-bingo-widget__board"
        style={subElementStyle(c, "board", {})}
        {...appearanceAttrs({ config: c, widgetId, widgetType: "slot_bingo", elementId: "board" })}
      >
        {visibleSquares.map((square, index) => {
          const elementId = square.free
            ? "freeSquare"
            : square.completed
              ? "completedSquare"
              : "incompleteSquare";
          const squareStyle = {
            ...subElementStyle(c, "square", {}),
            ...subElementStyle(c, elementId, {}),
          };
          return (
            <div
              key={square.id}
              className={`slot-bingo-widget__square${square.completed ? " is-complete" : ""}${square.free ? " is-free" : ""}`}
              aria-label={`${square.label}${square.free ? "" : `, pays ${formatSlotBingoMultiplier(square.multiplier)}`}${square.completed ? ", complete" : ", incomplete"}`}
              style={squareStyle}
              data-square-index={index}
              {...appearanceAttrs({ config: c, widgetId, widgetType: "slot_bingo", elementId })}
            >
              <span
                className="slot-bingo-widget__status-icon"
                style={subElementStyle(c, "completionIcon", {})}
                {...appearanceAttrs({ config: c, widgetId, widgetType: "slot_bingo", elementId: "completionIcon" })}
              >
                {c.showCompletionIcons
                  ? square.free
                    ? <Star aria-hidden="true" />
                    : square.completed
                      ? <Check aria-hidden="true" />
                      : null
                  : null}
              </span>
              <strong
                className="slot-bingo-widget__label"
                style={subElementStyle(c, "squareLabel", {})}
                {...appearanceAttrs({ config: c, widgetId, widgetType: "slot_bingo", elementId: "squareLabel" })}
              >
                {square.label}
              </strong>
              {!square.free && c.showMultipliers && (
                <span
                  className="slot-bingo-widget__multiplier"
                  style={subElementStyle(c, "squareMultiplier", {})}
                  {...appearanceAttrs({ config: c, widgetId, widgetType: "slot_bingo", elementId: "squareMultiplier" })}
                >
                  {formatSlotBingoMultiplier(square.multiplier)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {c.showFooter && (
        <footer
          className="slot-bingo-widget__footer"
          style={subElementStyle(c, "footer", {})}
          {...appearanceAttrs({ config: c, widgetId, widgetType: "slot_bingo", elementId: "footer" })}
        >
          <span aria-hidden="true" />
          <strong
            style={subElementStyle(c, "footerValue", {})}
            {...appearanceAttrs({ config: c, widgetId, widgetType: "slot_bingo", elementId: "footerValue" })}
          >
            {footer}
          </strong>
          <span aria-hidden="true" />
        </footer>
      )}
    </section>
  );
}
