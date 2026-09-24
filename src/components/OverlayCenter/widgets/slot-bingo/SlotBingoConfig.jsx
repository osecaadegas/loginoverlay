import { useState } from "react";
import {
  Check,
  CheckCircle2,
  Circle,
  Eye,
  LayoutGrid,
  Palette,
  RotateCcw,
  SlidersHorizontal,
  Star,
} from "lucide-react";
import { WIDGET_COLOUR_THEMES, getWidgetColourTheme } from "../shared/colourThemePalettes";
import {
  countCompletedSlotBingoSquares,
  formatSlotBingoMultiplier,
  getSlotBingoSquareCount,
  SLOT_BINGO_DEFAULT_CONFIG,
  normalizeSlotBingoConfig,
} from "./slotBingoModel";
import "./SlotBingoConfig.css";

const COLOR_FIELDS = [
  ["backgroundColor", "Background"], ["panelColor", "Glass panel"],
  ["cardColor", "Incomplete squares"], ["borderColor", "Border"],
  ["accentColor", "Primary accent"], ["secondaryColor", "Secondary accent"],
  ["completedColor", "Completed glow"], ["textColor", "Main text"],
  ["mutedColor", "Muted text"],
];

const LAYOUT_FIELDS = [
  ["borderRadius", "Widget corners", 0, 72, "px"],
  ["cardRadius", "Square corners", 0, 40, "px"],
  ["cardGap", "Square gap", 2, 24, "px"],
  ["padding", "Panel padding", 8, 40, "px"],
  ["glowIntensity", "Glow strength", 0, 100, "%"],
];

const TYPE_FIELDS = [
  ["titleSize", "Title", 18, 56, "px"],
  ["squareTextSize", "Square label", 9, 28, "px"],
  ["multiplierTextSize", "Payout multiplier", 7, 22, "px"],
];

const FONT_OPTIONS = [
  ["'Rajdhani', sans-serif", "Rajdhani"],
  ["'Orbitron', sans-serif", "Orbitron"],
  ["Inter, sans-serif", "Inter"],
  ["system-ui, sans-serif", "System UI"],
];

const APPEARANCE_KEYS = [
  ...COLOR_FIELDS.map(([key]) => key),
  ...LAYOUT_FIELDS.map(([key]) => key),
  ...TYPE_FIELDS.map(([key]) => key),
  "fontFamily",
];

export default function SlotBingoConfig({ config = {}, onChange }) {
  const c = normalizeSlotBingoConfig(config);
  const [activeTab, setActiveTab] = useState("board");
  const squareCount = getSlotBingoSquareCount(c.boardRows);
  const visibleSquares = c.squares.slice(0, squareCount);
  const completed = countCompletedSlotBingoSquares(c.squares, c.boardRows);
  const set = (patch) => onChange(normalizeSlotBingoConfig({ ...c, ...patch }));

  const updateSquare = (index, patch) => {
    const squares = c.squares.map((square, squareIndex) =>
      squareIndex === index ? { ...square, ...patch } : square,
    );
    set({ squares });
  };

  const updateVisibleSquares = (updater) => {
    const squares = c.squares.map((square, index) =>
      index < squareCount ? updater(square, index) : square,
    );
    set({ squares });
  };

  const applyColourTheme = (themeKey) => {
    const theme = getWidgetColourTheme(themeKey);
    if (!theme) return;
    set({
      colourTheme: themeKey,
      backgroundColor: theme.background,
      panelColor: theme.surface,
      cardColor: theme.raised,
      borderColor: theme.border,
      accentColor: theme.accent,
      secondaryColor: theme.secondary,
      completedColor: theme.accent,
      textColor: theme.text,
      mutedColor: theme.muted,
    });
  };

  const resetAppearance = () => {
    const patch = Object.fromEntries(
      APPEARANCE_KEYS.map((key) => [key, SLOT_BINGO_DEFAULT_CONFIG[key]]),
    );
    set({ ...patch, colourTheme: null });
  };

  const focusOption = (index) => {
    document.getElementById(`slot-bingo-option-${index}`)?.focus();
  };

  return (
    <div className="slot-bingo-config">
      <header className="slot-bingo-config__hero">
        <div>
          <span className="slot-bingo-config__eyebrow">Slot Bingo setup</span>
          <h2>Build a readable Bingo card</h2>
          <p>Edit every challenge and payout directly. Changes save automatically to the widget and OBS output.</p>
        </div>
        <dl className="slot-bingo-config__summary" aria-label="Board summary">
          <div><dt>Board</dt><dd>{c.boardRows} × 5</dd></div>
          <div><dt>Completed</dt><dd>{completed} / {squareCount}</dd></div>
          <div><dt>Lines</dt><dd>{lines}</dd></div>
        </dl>
      </header>

      <nav className="slot-bingo-config__tabs" role="tablist" aria-label="Slot Bingo settings">
        {[
          ["board", LayoutGrid, "Board & payouts"],
          ["display", Eye, "Display"],
          ["appearance", Palette, "Appearance"],
        ].map(([id, Icon, label]) => (
          <button key={id} type="button" role="tab" aria-selected={activeTab === id} className={activeTab === id ? "is-active" : ""} onClick={() => setActiveTab(id)}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </nav>

      {activeTab === "board" && (
        <div className="slot-bingo-config__tab-panel" role="tabpanel">
          <section className="slot-bingo-config__section">
            <div className="slot-bingo-config__section-head">
              <div><span>Layout</span><h3>Choose the board size</h3><p>Switching layouts keeps all 25 saved options. The extra ten return when you switch back to 5 × 5.</p></div>
              <div className="slot-bingo-config__layout-choice" role="group" aria-label="Board size">
                {[3, 5].map((rows) => (
                  <button key={rows} type="button" className={c.boardRows === rows ? "is-active" : ""} onClick={() => set({ boardRows: rows })}>
                    <strong>{rows} × 5</strong><small>{rows * 5} squares</small>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="slot-bingo-config__section">
            <div className="slot-bingo-config__section-head slot-bingo-config__section-head--actions">
              <div><span>Board map</span><h3>{squareCount} visible options</h3><p>Select a square to jump to its editable row below.</p></div>
              <div className="slot-bingo-config__actions">
                <button type="button" onClick={() => updateVisibleSquares((square) => ({ ...square, completed: true }))}><CheckCircle2 size={14} /> Complete all</button>
                <button type="button" onClick={() => updateVisibleSquares((square) => ({ ...square, completed: square.free }))}><Circle size={14} /> Clear board</button>
                <button type="button" onClick={() => set({ squares: SLOT_BINGO_DEFAULT_CONFIG.squares })}><RotateCcw size={14} /> Reset options</button>
              </div>
            </div>
            <div className="slot-bingo-config__grid" role="list" aria-label="Bingo board map">
              {visibleSquares.map((square, index) => (
                <button key={square.id} type="button" className={`${square.completed ? "is-complete" : ""}${square.free ? " is-free" : ""}`} onClick={() => focusOption(index)} aria-label={`Edit square ${index + 1}: ${square.label}`}>
                  <span className="slot-bingo-config__square-number">{String(index + 1).padStart(2, "0")}</span>
                  {square.free ? <Star aria-hidden="true" /> : square.completed ? <Check aria-hidden="true" /> : null}
                  <strong>{square.label}</strong>
                  {!square.free && <small>{formatSlotBingoMultiplier(square.multiplier)}</small>}
                </button>
              ))}
            </div>
          </section>

          <section className="slot-bingo-config__section">
            <div className="slot-bingo-config__section-head">
              <div><span>Option editor</span><h3>Edit every square</h3><p>Labels allow 18 characters. Payouts accept whole or decimal multipliers from 0x to 100,000x.</p></div>
            </div>
            <div className="slot-bingo-config__option-table" role="list" aria-label="Editable Bingo options">
              <div className="slot-bingo-config__option-head" aria-hidden="true"><span>Square</span><span>Challenge label</span><span>Payout</span><span>Status</span></div>
              {visibleSquares.map((square, index) => (
                <div key={square.id} className={`slot-bingo-config__option-row${square.free ? " is-free" : ""}`} role="listitem">
                  <span className="slot-bingo-config__option-index">{square.free ? <Star size={15} /> : `#${String(index + 1).padStart(2, "0")}`}</span>
                  <label>
                    <span className="slot-bingo-config__mobile-label">Challenge label</span>
                    <input id={`slot-bingo-option-${index}`} value={square.label} maxLength={18} disabled={square.free} onChange={(event) => updateSquare(index, { label: event.target.value })} />
                  </label>
                  <label className="slot-bingo-config__multiplier-field">
                    <span className="slot-bingo-config__mobile-label">Payout multiplier</span>
                    <input type="number" min="0" max="100000" step="0.1" value={square.multiplier} disabled={square.free} onChange={(event) => updateSquare(index, { multiplier: Number(event.target.value) })} />
                    <strong>x</strong>
                  </label>
                  <label className="slot-bingo-config__status-toggle">
                    <input type="checkbox" checked={square.completed} disabled={square.free} onChange={(event) => updateSquare(index, { completed: event.target.checked })} />
                    <span>{square.free ? "Always complete" : square.completed ? "Completed" : "Incomplete"}</span>
                  </label>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {activeTab === "display" && (
        <div className="slot-bingo-config__tab-panel slot-bingo-config__display-grid" role="tabpanel">
          <section className="slot-bingo-config__section">
            <div className="slot-bingo-config__section-head"><div><span>Content</span><h3>Title and typeface</h3></div></div>
            <label className="slot-bingo-config__field"><span>Widget title</span><input value={c.title} maxLength={32} onChange={(event) => set({ title: event.target.value })} /></label>
            <label className="slot-bingo-config__field"><span>Typeface</span><select value={c.fontFamily} onChange={(event) => set({ fontFamily: event.target.value })}>{!FONT_OPTIONS.some(([value]) => value === c.fontFamily) && <option value={c.fontFamily}>Custom font</option>}{FONT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          </section>

          <section className="slot-bingo-config__section">
            <div className="slot-bingo-config__section-head"><div><span>Visibility</span><h3>Choose what viewers see</h3></div></div>
            <div className="slot-bingo-config__toggle-list">
              {[
                ["showProgress", "Progress counter", `Show ${completed} / ${squareCount} in the header`],
                ["showMultipliers", "Payout multipliers", "Show the editable x value on every challenge"],
                ["showCompletionIcons", "Completion icons", "Show checks and the FREE star inside squares"],
              ].map(([key, label, hint]) => (
                <label key={key} className="slot-bingo-config__toggle">
                  <span><strong>{label}</strong><small>{hint}</small></span>
                  <input type="checkbox" checked={c[key]} onChange={(event) => set({ [key]: event.target.checked })} />
                  <i aria-hidden="true" />
                </label>
              ))}
            </div>
          </section>

          <section className="slot-bingo-config__section slot-bingo-config__section--wide">
            <div className="slot-bingo-config__section-head"><div><span>Readability</span><h3>Text sizes</h3><p>These controls affect both the editor preview and OBS browser source.</p></div></div>
            <div className="slot-bingo-config__range-grid">
              {TYPE_FIELDS.map(([key, label, min, max, unit]) => (
                <label key={key} className="slot-bingo-config__range"><span><strong>{label}</strong><output>{c[key]}{unit}</output></span><input type="range" min={min} max={max} value={c[key]} onChange={(event) => set({ [key]: Number(event.target.value) })} /></label>
              ))}
            </div>
          </section>
        </div>
      )}

      {activeTab === "appearance" && (
        <div className="slot-bingo-config__tab-panel" role="tabpanel">
          <section className="slot-bingo-config__section">
            <div className="slot-bingo-config__section-head"><div><span>Quick themes</span><h3>Apply a complete colour palette</h3><p>The same shared themes are available across Streamers Center widgets.</p></div></div>
            <div className="slot-bingo-config__themes" role="list" aria-label="Colour themes">
              {WIDGET_COLOUR_THEMES.map((theme) => (
                <button key={theme.key} type="button" className={c.colourTheme === theme.key ? "is-active" : ""} onClick={() => applyColourTheme(theme.key)}>
                  <span className="slot-bingo-config__swatches" aria-hidden="true">{theme.swatches.map((colour) => <i key={colour} style={{ background: colour }} />)}</span>
                  <strong>{theme.name}</strong>
                </button>
              ))}
            </div>
          </section>

          <div className="slot-bingo-config__appearance-grid">
            <section className="slot-bingo-config__section">
              <div className="slot-bingo-config__section-head"><div><span>Custom colours</span><h3>Fine tune the palette</h3></div></div>
              <div className="slot-bingo-config__colors">
                {COLOR_FIELDS.map(([key, label]) => (
                  <label key={key}><span><strong>{label}</strong><small>{c[key]}</small></span><input type="color" value={c[key]} onChange={(event) => set({ [key]: event.target.value, colourTheme: null })} /></label>
                ))}
              </div>
            </section>

            <section className="slot-bingo-config__section">
              <div className="slot-bingo-config__section-head"><div><span>Shape and spacing</span><h3>Panel layout</h3></div></div>
              <div className="slot-bingo-config__range-list">
                {LAYOUT_FIELDS.map(([key, label, min, max, unit]) => (
                  <label key={key} className="slot-bingo-config__range"><span><strong>{label}</strong><output>{c[key]}{unit}</output></span><input type="range" min={min} max={max} value={c[key]} onChange={(event) => set({ [key]: Number(event.target.value) })} /></label>
                ))}
              </div>
              <button type="button" className="slot-bingo-config__secondary-action" onClick={resetAppearance}><RotateCcw size={14} /> Reset appearance</button>
            </section>
          </div>
        </div>
      )}

      <footer className="slot-bingo-config__footer">
        <div><SlidersHorizontal size={17} /><span><strong>Automatic saving</strong><small>Every change updates this widget configuration.</small></span></div>
        <button type="button" className="slot-bingo-config__reset" onClick={() => onChange(normalizeSlotBingoConfig(SLOT_BINGO_DEFAULT_CONFIG))}><RotateCcw size={15} /> Reset entire widget</button>
      </footer>
    </div>
  );
}
