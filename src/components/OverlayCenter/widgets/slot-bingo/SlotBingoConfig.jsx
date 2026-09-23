import { useState } from "react";
import { Check, RotateCcw, Star } from "lucide-react";
import {
  formatSlotBingoMultiplier,
  getSlotBingoSquareCount,
  SLOT_BINGO_DEFAULT_CONFIG,
  normalizeSlotBingoConfig,
} from "./slotBingoModel";
import "./SlotBingoConfig.css";

const COLOR_FIELDS = [
  ["backgroundColor", "Background"], ["panelColor", "Glass panel"],
  ["cardColor", "Incomplete squares"], ["borderColor", "Purple border"],
  ["accentColor", "Gold accent"], ["secondaryColor", "Purple accent"],
  ["completedColor", "Completed glow"], ["textColor", "Text"],
  ["mutedColor", "Muted text"],
];

export default function SlotBingoConfig({ config = {}, onChange }) {
  const c = normalizeSlotBingoConfig(config);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const squareCount = getSlotBingoSquareCount(c.boardRows);
  const visibleSquares = c.squares.slice(0, squareCount);
  const safeSelectedIndex = Math.min(selectedIndex, squareCount - 1);
  const selected = visibleSquares[safeSelectedIndex] || visibleSquares[0];
  const set = (patch) => onChange(normalizeSlotBingoConfig({ ...c, ...patch }));
  const updateSquare = (patch) => {
    const squares = c.squares.map((square, index) =>
      index === safeSelectedIndex ? { ...square, ...patch } : square,
    );
    set({ squares });
  };

  return (
    <div className="slot-bingo-config">
      <section>
        <h3>Widget content</h3>
        <label><span>Title</span><input value={c.title} maxLength={32} onChange={(event) => set({ title: event.target.value })} /></label>
        <label><span>Board size</span><select value={c.boardRows} onChange={(event) => { setSelectedIndex(0); set({ boardRows: Number(event.target.value) }); }}><option value={3}>3 rows × 5 columns</option><option value={5}>5 rows × 5 columns</option></select></label>
        <label><span>Footer</span><select value={c.footerMode} onChange={(event) => set({ footerMode: event.target.value })}><option value="bingo">BINGO x3</option><option value="lines">Lines: 3</option></select></label>
        <div className="slot-bingo-config__toggles">
          <label><input type="checkbox" checked={c.showProgress} onChange={(event) => set({ showProgress: event.target.checked })} /><span>Show progress</span></label>
          <label><input type="checkbox" checked={c.showFooter} onChange={(event) => set({ showFooter: event.target.checked })} /><span>Show footer</span></label>
        </div>
      </section>

      <section>
        <h3>{c.boardRows} × 5 board · {squareCount} options</h3>
        <div className="slot-bingo-config__grid" role="list" aria-label="Bingo squares">
          {visibleSquares.map((square, index) => (
            <button
              key={square.id}
              type="button"
              className={`${safeSelectedIndex === index ? "is-selected" : ""}${square.completed ? " is-complete" : ""}${square.free ? " is-free" : ""}`}
              onClick={() => setSelectedIndex(index)}
              aria-label={`Edit ${square.label}`}
            >
              {square.free ? <Star aria-hidden="true" /> : square.completed ? <Check aria-hidden="true" /> : null}
              <span>{square.label}</span>
              {!square.free && <small>{formatSlotBingoMultiplier(square.multiplier)}</small>}
            </button>
          ))}
        </div>
        <div className="slot-bingo-config__square-editor">
          <strong>Square {safeSelectedIndex + 1}</strong>
          <label><span>Label</span><input value={selected.label} maxLength={18} disabled={selected.free} onChange={(event) => updateSquare({ label: event.target.value })} /></label>
          <label><span>Payout multiplier</span><input type="number" min="0" max="100000" step="0.1" value={selected.multiplier} disabled={selected.free} onChange={(event) => updateSquare({ multiplier: Number(event.target.value) })} /></label>
          <label className="slot-bingo-config__check"><input type="checkbox" checked={selected.completed} disabled={selected.free} onChange={(event) => updateSquare({ completed: event.target.checked })} /><span>Completed</span></label>
        </div>
      </section>

      <section>
        <h3>Appearance</h3>
        <div className="slot-bingo-config__colors">
          {COLOR_FIELDS.map(([key, label]) => <label key={key}><span>{label}</span><input type="color" value={c[key]} onChange={(event) => set({ [key]: event.target.value })} /></label>)}
        </div>
        {[
          ["borderRadius", "Widget corners", 0, 72], ["cardRadius", "Square corners", 0, 40],
          ["cardGap", "Square gap", 2, 24], ["padding", "Panel padding", 8, 40],
          ["glowIntensity", "Glow", 0, 100], ["titleSize", "Title size", 18, 56],
          ["squareTextSize", "Square text", 9, 28], ["footerSize", "Footer size", 16, 44],
        ].map(([key, label, min, max]) => (
          <label key={key}><span>{label}: {c[key]}</span><input type="range" min={min} max={max} value={c[key]} onChange={(event) => set({ [key]: Number(event.target.value) })} /></label>
        ))}
      </section>

      <button type="button" className="slot-bingo-config__reset" onClick={() => onChange(normalizeSlotBingoConfig(SLOT_BINGO_DEFAULT_CONFIG))}>
        <RotateCcw size={15} /> Reset Slot Bingo
      </button>
    </div>
  );
}
