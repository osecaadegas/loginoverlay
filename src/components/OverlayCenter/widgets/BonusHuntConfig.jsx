import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getAllSlots } from '../../../utils/slotUtils';

const FONT_OPTIONS = [
  { value: "'Inter', sans-serif", label: 'Inter' },
  { value: "'Poppins', sans-serif", label: 'Poppins' },
  { value: "'Roboto', sans-serif", label: 'Roboto' },
  { value: "'Oswald', sans-serif", label: 'Oswald' },
  { value: "'Montserrat', sans-serif", label: 'Montserrat' },
  { value: "'Fira Code', monospace", label: 'Fira Code' },
  { value: "'Bebas Neue', cursive", label: 'Bebas Neue' },
  { value: "'Press Start 2P', cursive", label: 'Press Start 2P' },
];

export default function BonusHuntConfig({ config, onChange, allWidgets }) {
  const c = config || {};
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('content');
  const set = (key, val) => onChange({ ...c, [key]: val });
  const setMulti = (obj) => onChange({ ...c, ...obj });

  // Find navbar widget config for sync
  const navbarConfig = (allWidgets || []).find(w => w.widget_type === 'navbar')?.config || null;

  const syncFromNavbar = () => {
    if (!navbarConfig) return;
    const nb = navbarConfig;
    setMulti({
      headerColor: nb.bgColor || '#111318',
      headerAccent: nb.accentColor || '#f59e0b',
      countCardColor: nb.bgColor || '#111318',
      currentBonusColor: nb.bgColor || '#111318',
      currentBonusAccent: nb.accentColor || '#f59e0b',
      listCardColor: nb.bgColor || '#111318',
      listCardAccent: nb.accentColor || '#f59e0b',
      summaryColor: nb.bgColor || '#111318',
      totalPayColor: nb.accentColor || '#f59e0b',
      totalPayText: nb.textColor || '#f1f5f9',
      superBadgeColor: nb.ctaColor || '#f43f5e',
      extremeBadgeColor: nb.ctaColor || '#f43f5e',
      textColor: nb.textColor || '#f1f5f9',
      mutedTextColor: nb.mutedColor || '#94a3b8',
      statValueColor: nb.textColor || '#f1f5f9',
      cardOutlineColor: nb.borderColor || nb.accentColor || '#f59e0b',
      cardOutlineWidth: nb.borderWidth ?? 2,
      fontFamily: nb.fontFamily || "'Inter', sans-serif",
      fontSize: nb.fontSize ?? 13,
      ...(nb.brightness != null && { brightness: nb.brightness }),
      ...(nb.contrast != null && { contrast: nb.contrast }),
      ...(nb.saturation != null && { saturation: nb.saturation }),
    });
  };

  // ─── Preset system ───
  const [presetName, setPresetName] = useState('');
  const PRESET_KEYS = [
    'headerColor', 'headerAccent', 'countCardColor', 'currentBonusColor', 'currentBonusAccent',
    'listCardColor', 'listCardAccent', 'summaryColor', 'totalPayColor', 'totalPayText',
    'superBadgeColor', 'extremeBadgeColor', 'textColor', 'mutedTextColor', 'statValueColor',
    'cardOutlineColor', 'cardOutlineWidth',
    'fontFamily', 'fontSize', 'cardRadius', 'cardGap', 'widgetWidth', 'cardPadding',
    'slotImageHeight', 'listMaxHeight',
    'brightness', 'contrast', 'saturation',
    'displayStyle',
  ];

  const savePreset = () => {
    const name = presetName.trim();
    if (!name) return;
    const snapshot = {};
    PRESET_KEYS.forEach(k => { if (c[k] !== undefined) snapshot[k] = c[k]; });
    const existing = c.bhPresets || [];
    const idx = existing.findIndex(p => p.name === name);
    const updated = idx >= 0
      ? existing.map((p, i) => i === idx ? { name, values: snapshot, savedAt: Date.now() } : p)
      : [...existing, { name, values: snapshot, savedAt: Date.now() }];
    set('bhPresets', updated);
    setPresetName('');
  };

  const loadPreset = (preset) => setMulti(preset.values);
  const deletePreset = (name) => set('bhPresets', (c.bhPresets || []).filter(p => p.name !== name));

  const tabs = [
    { id: 'content', label: '📋 Content' },
    { id: 'style', label: '🎨 Style' },
    { id: 'filters', label: '✨ Filters' },
    { id: 'presets', label: '💾 Presets' },
  ];

  return (
    <div className="bh-config">
      {/* Top quick toggles */}
      <div className="bh-quick-row">
        <label className="oc-config-field" style={{ flex: 1 }}>
          <span>Currency</span>
          <input value={c.currency || '€'} onChange={e => set('currency', e.target.value)} />
        </label>
        <label className="oc-config-field" style={{ flex: 1 }}>
          <span>Display Style</span>
          <select value={c.displayStyle || 'v1'} onChange={e => set('displayStyle', e.target.value)}>
            <option value="v1">Style 1 — Classic</option>
            <option value="v2">Style 2 — Sleek Dark</option>
          </select>
        </label>
        <label className="bh-check-row">
          <input type="checkbox" checked={!!c.huntActive} onChange={e => set('huntActive', e.target.checked)} />
          <span>Hunt Active</span>
        </label>
      </div>

      {/* Tab nav */}
      <div className="nb-tabs" style={{ marginTop: 8 }}>
        {tabs.map(t => (
          <button key={t.id}
            className={`nb-tab ${activeTab === t.id ? 'nb-tab--active' : ''}`}
            onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══════ CONTENT TAB ═══════ */}
      {activeTab === 'content' && (
        <>
          {/* Toggle dropdown */}
          <button
            className={`bh-config-toggle ${open ? 'bh-config-toggle--open' : ''}`}
            onClick={() => setOpen(v => !v)}
          >
            <span>⚙️ Configure Bonus Hunt</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"
              style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
              <path d="M2 4.5L6 8.5L10 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            </svg>
          </button>

          {open && (
            <BonusHuntPanel config={c} onChange={onChange} />
          )}
        </>
      )}

      {/* ═══════ STYLE TAB ═══════ */}
      {activeTab === 'style' && (
        <div className="nb-section">
          {navbarConfig && (
            <button className="oc-btn oc-btn--sm oc-btn--primary" style={{ marginBottom: 12, width: '100%' }} onClick={syncFromNavbar}>
              🔗 Sync Colors from Navbar
            </button>
          )}
          <h4 className="nb-subtitle">Card Colors</h4>
          <div className="nb-color-grid">
            <ColorPicker label="Header BG" value={c.headerColor || '#1e3a8a'} onChange={v => set('headerColor', v)} />
            <ColorPicker label="Header Accent" value={c.headerAccent || '#60a5fa'} onChange={v => set('headerAccent', v)} />
            <ColorPicker label="Count Card BG" value={c.countCardColor || '#1e3a8a'} onChange={v => set('countCardColor', v)} />
            <ColorPicker label="Current Bonus BG" value={c.currentBonusColor || '#166534'} onChange={v => set('currentBonusColor', v)} />
            <ColorPicker label="Current Accent" value={c.currentBonusAccent || '#86efac'} onChange={v => set('currentBonusAccent', v)} />
            <ColorPicker label="Slot List BG" value={c.listCardColor || '#581c87'} onChange={v => set('listCardColor', v)} />
            <ColorPicker label="Slot List Accent" value={c.listCardAccent || '#d8b4fe'} onChange={v => set('listCardAccent', v)} />
            <ColorPicker label="Summary BG" value={c.summaryColor || '#1e3a8a'} onChange={v => set('summaryColor', v)} />
            <ColorPicker label="Card Outline" value={c.cardOutlineColor || 'transparent'} onChange={v => set('cardOutlineColor', v)} />
          </div>

          <h4 className="nb-subtitle">Badge Colors</h4>
          <div className="nb-color-grid">
            <ColorPicker label="Super Badge" value={c.superBadgeColor || '#eab308'} onChange={v => set('superBadgeColor', v)} />
            <ColorPicker label="Extreme Badge" value={c.extremeBadgeColor || '#ef4444'} onChange={v => set('extremeBadgeColor', v)} />
            <ColorPicker label="Total Pay BG" value={c.totalPayColor || '#eab308'} onChange={v => set('totalPayColor', v)} />
            <ColorPicker label="Total Pay Text" value={c.totalPayText || '#ffffff'} onChange={v => set('totalPayText', v)} />
          </div>

          <h4 className="nb-subtitle">Text Colors</h4>
          <div className="nb-color-grid">
            <ColorPicker label="Main Text" value={c.textColor || '#ffffff'} onChange={v => set('textColor', v)} />
            <ColorPicker label="Muted Text" value={c.mutedTextColor || '#93c5fd'} onChange={v => set('mutedTextColor', v)} />
            <ColorPicker label="Stat Values" value={c.statValueColor || '#ffffff'} onChange={v => set('statValueColor', v)} />
          </div>

          <h4 className="nb-subtitle">Typography</h4>
          <label className="nb-field">
            <span>Font</span>
            <select value={c.fontFamily || "'Inter', sans-serif"} onChange={e => set('fontFamily', e.target.value)}>
              {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </label>
          <SliderField label="Font Size" value={c.fontSize ?? 13} min={8} max={22} step={1} unit="px"
            onChange={v => set('fontSize', v)} />

          <h4 className="nb-subtitle">Dimensions</h4>
          <SliderField label="Widget Width" value={c.widgetWidth ?? 400} min={200} max={800} step={10} unit="px"
            onChange={v => set('widgetWidth', v)} />
          <SliderField label="Card Padding" value={c.cardPadding ?? 14} min={6} max={30} step={1} unit="px"
            onChange={v => set('cardPadding', v)} />
          <SliderField label="Card Radius" value={c.cardRadius ?? 16} min={0} max={32} step={1} unit="px"
            onChange={v => set('cardRadius', v)} />
          <SliderField label="Card Gap" value={c.cardGap ?? 12} min={4} max={24} step={1} unit="px"
            onChange={v => set('cardGap', v)} />
          <SliderField label="Outline Width" value={c.cardOutlineWidth ?? 2} min={0} max={6} step={1} unit="px"
            onChange={v => set('cardOutlineWidth', v)} />
          <SliderField label="Slot Image Height" value={c.slotImageHeight ?? 180} min={80} max={400} step={10} unit="px"
            onChange={v => set('slotImageHeight', v)} />
          <SliderField label="List Max Height" value={c.listMaxHeight ?? 400} min={200} max={1200} step={20} unit="px"
            onChange={v => set('listMaxHeight', v)} />
        </div>
      )}

      {/* ═══════ FILTERS TAB ═══════ */}
      {activeTab === 'filters' && (
        <div className="nb-section">
          <h4 className="nb-subtitle">Image Filters</h4>
          <p className="oc-config-hint" style={{ marginBottom: 12 }}>
            Adjust the overall look of the entire bonus hunt widget on the OBS overlay.
          </p>
          <SliderField label="Brightness" value={c.brightness ?? 100} min={0} max={200} step={1} unit="%"
            onChange={v => set('brightness', v)} />
          <SliderField label="Contrast" value={c.contrast ?? 100} min={0} max={200} step={1} unit="%"
            onChange={v => set('contrast', v)} />
          <SliderField label="Saturation" value={c.saturation ?? 100} min={0} max={200} step={1} unit="%"
            onChange={v => set('saturation', v)} />

          <button className="oc-btn oc-btn--sm" style={{ marginTop: 12 }}
            onClick={() => setMulti({ brightness: 100, contrast: 100, saturation: 100 })}>
            Reset Filters
          </button>
        </div>
      )}

      {/* ═══════ PRESETS TAB ═══════ */}
      {activeTab === 'presets' && (
        <div className="nb-section">
          <h4 className="nb-subtitle">Save Current Style</h4>
          <p className="oc-config-hint" style={{ marginBottom: 8 }}>
            Save your current colors, fonts, dimensions and filters as a reusable preset.
          </p>
          <div className="nb-preset-save-row">
            <input
              className="nb-preset-input"
              value={presetName}
              onChange={e => setPresetName(e.target.value)}
              placeholder="Preset name..."
              maxLength={30}
              onKeyDown={e => e.key === 'Enter' && savePreset()}
            />
            <button className="nb-preset-save-btn" onClick={savePreset} disabled={!presetName.trim()}>
              💾 Save
            </button>
          </div>

          <h4 className="nb-subtitle">Saved Presets</h4>
          {(!c.bhPresets || c.bhPresets.length === 0) ? (
            <p className="oc-config-hint">No presets saved yet. Customize your style and save it above.</p>
          ) : (
            <div className="nb-preset-list">
              {c.bhPresets.map(p => (
                <div key={p.name} className="nb-preset-card">
                  <div className="nb-preset-info">
                    <span className="nb-preset-name">{p.name}</span>
                    <span className="nb-preset-date">
                      {p.savedAt ? new Date(p.savedAt).toLocaleDateString() : ''}
                    </span>
                    <div className="nb-preset-swatches">
                      {['headerColor', 'currentBonusColor', 'listCardColor', 'totalPayColor'].map(k =>
                        p.values[k] ? (
                          <span key={k} className="nb-preset-swatch" style={{ background: p.values[k] }} title={k} />
                        ) : null
                      )}
                    </div>
                  </div>
                  <div className="nb-preset-actions">
                    <button className="oc-btn oc-btn--sm oc-btn--primary" onClick={() => loadPreset(p)}>Load</button>
                    <button className="oc-btn oc-btn--sm oc-btn--danger" onClick={() => deletePreset(p.name)}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Inline Dropdown Panel (replaces old modal) ─── */
function BonusHuntPanel({ config, onChange }) {
  const c = config || {};
  const [startMoney, setStartMoney] = useState(c.startMoney || '');
  const [targetMoney, setTargetMoney] = useState(c.targetMoney || '');
  const [stopLoss, setStopLoss] = useState(c.stopLoss || '');
  const [betSize, setBetSize] = useState('');
  const [slotSearch, setSlotSearch] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [isSuperBonus, setIsSuperBonus] = useState(false);
  const [showStatistics, setShowStatistics] = useState(c.showStatistics ?? true);
  const [animatedTracker, setAnimatedTracker] = useState(c.animatedTracker ?? true);
  const [bonusList, setBonusList] = useState(c.bonuses || []);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [slots, setSlots] = useState([]);
  const searchRef = useRef(null);

  useEffect(() => {
    getAllSlots().then(d => setSlots(d || [])).catch(() => setSlots([]));
  }, []);

  const filteredSlots = slotSearch.trim().length > 0 && slots.length > 0
    ? slots.filter(s => s?.name?.toLowerCase().includes(slotSearch.toLowerCase()))
    : [];

  const save = useCallback((list = bonusList, extras = {}) => {
    onChange({
      ...config,
      startMoney: Number(startMoney) || 0,
      targetMoney: Number(targetMoney) || 0,
      stopLoss: Number(stopLoss) || 0,
      showStatistics, animatedTracker,
      bonuses: list,
      huntActive: config?.huntActive ?? false,
      ...extras,
    });
  }, [config, onChange, startMoney, targetMoney, stopLoss, showStatistics, animatedTracker, bonusList]);

  const handleAddBonus = () => {
    const betNum = Number(betSize);
    if (!selectedSlot || !betSize || betNum <= 0) return;
    const newBonus = {
      id: Date.now(),
      slot: selectedSlot,
      slotName: selectedSlot.name,
      betSize: betNum,
      isSuperBonus,
      opened: false,
      result: 0,
      payout: 0,
    };
    const updated = [...bonusList, newBonus];
    setBonusList(updated);
    save(updated);
    setSelectedSlot(null);
    setSlotSearch('');
    setBetSize('');
    setIsSuperBonus(false);
  };

  const handleOpenBonus = (bonusId, result) => {
    const updated = bonusList.map(b =>
      b.id === bonusId ? { ...b, opened: true, result, payout: result } : b
    );
    setBonusList(updated);
    save(updated);
  };

  const handleRemoveBonus = (bonusId) => {
    const updated = bonusList.filter(b => b.id !== bonusId);
    setBonusList(updated);
    save(updated);
  };

  const currency = config?.currency || '€';

  return (
    <div className="bh-panel">

      {/* ─── Hunt Settings ─── */}
      <div className="bh-panel-section">
        <h4 className="bh-panel-label">Hunt Settings</h4>
        <div className="bh-settings-grid">
          <label className="bh-input-group">
            <span>Start ({currency})</span>
            <input type="number" value={startMoney}
              placeholder="0"
              onChange={e => setStartMoney(e.target.value)}
              onBlur={() => save()} />
          </label>
          <label className="bh-input-group">
            <span>Target ({currency})</span>
            <input type="number" value={targetMoney}
              placeholder="0"
              onChange={e => setTargetMoney(e.target.value)}
              onBlur={() => save()} />
          </label>
          <label className="bh-input-group">
            <span>Stop Loss ({currency})</span>
            <input type="number" value={stopLoss}
              placeholder="0"
              onChange={e => setStopLoss(e.target.value)}
              onBlur={() => save()} />
          </label>
        </div>
      </div>

      {/* ─── Add Bonus ─── */}
      <div className="bh-panel-section">
        <h4 className="bh-panel-label">Add Bonus</h4>

        {/* Slot search with dropdown suggestions */}
        <div className="bh-search-container" ref={searchRef}>
          <input
            type="text"
            className="bh-search-input"
            value={selectedSlot ? selectedSlot.name : slotSearch}
            onChange={e => { setSlotSearch(e.target.value); setSelectedSlot(null); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddBonus(); } }}
            placeholder={`Search ${slots.length} slots...`}
          />

          {showSuggestions && slotSearch.trim().length > 0 && (
            <div className="bh-suggestions-dropdown">
              {filteredSlots.length > 0 ? (
                filteredSlots.slice(0, 8).map(slot => (
                  <div key={slot.id} className="bh-suggestion-item"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => { setSelectedSlot(slot); setSlotSearch(slot.name); setShowSuggestions(false); }}>
                    <img
                      src={slot.image || 'https://via.placeholder.com/36x36/1a1d23/9346ff?text=S'}
                      alt={slot.name}
                      className="bh-suggestion-img"
                      onError={e => { e.target.src = 'https://via.placeholder.com/36x36/1a1d23/9346ff?text=S'; }}
                    />
                    <div className="bh-suggestion-info">
                      <span className="bh-suggestion-name">{slot.name}</span>
                      {slot.provider && <span className="bh-suggestion-provider">{slot.provider}</span>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="bh-suggestion-empty">
                  {slots.length === 0 ? 'Loading slots...' : `No slots found for "${slotSearch}"`}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bet + Super + Add button row */}
        <div className="bh-add-controls">
          <input type="number" className="bh-bet-field" value={betSize}
            onChange={e => setBetSize(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddBonus(); } }}
            placeholder={`Bet (${currency})`} step="0.1" />
          <label className="bh-super-check">
            <input type="checkbox" checked={isSuperBonus} onChange={e => setIsSuperBonus(e.target.checked)} />
            <span>⭐</span>
          </label>
          <button className="bh-add-btn" onClick={handleAddBonus} disabled={!selectedSlot || !betSize}>
            + Add
          </button>
        </div>

        {/* Options row */}
        <div className="bh-options-row">
          <label className="bh-option">
            <input type="checkbox" checked={showStatistics}
              onChange={e => { setShowStatistics(e.target.checked); save(bonusList, { showStatistics: e.target.checked }); }} />
            <span>Statistics</span>
          </label>
          <label className="bh-option">
            <input type="checkbox" checked={animatedTracker}
              onChange={e => { setAnimatedTracker(e.target.checked); save(bonusList, { animatedTracker: e.target.checked }); }} />
            <span>Animated</span>
          </label>
        </div>
      </div>

      {/* ─── Bonus List ─── */}
      <div className="bh-panel-section">
        <h4 className="bh-panel-label">
          Bonuses <span className="bh-count">{bonusList.length}</span>
        </h4>
        <div className="bh-list">
          {bonusList.length === 0 ? (
            <p className="bh-list-empty">No bonuses added yet</p>
          ) : bonusList.map((bonus, i) => (
            <div key={bonus.id} className={`bh-list-item ${bonus.opened ? 'bh-list-item--opened' : ''} ${bonus.isSuperBonus ? 'bh-list-item--super' : ''}`}>
              <span className="bh-list-num">{i + 1}</span>
              {bonus.slot?.image && (
                <img src={bonus.slot.image} alt={bonus.slotName} className="bh-list-img"
                  onError={e => { e.target.style.display = 'none'; }} />
              )}
              <div className="bh-list-info">
                <span className="bh-list-name">{bonus.slotName || bonus.slot?.name}</span>
                <span className="bh-list-bet">{currency}{bonus.betSize} {bonus.isSuperBonus && '⭐'}</span>
              </div>
              <div className="bh-list-actions">
                {bonus.opened ? (
                  <span className="bh-list-result">{currency}{bonus.result}</span>
                ) : (
                  <button className="bh-list-open" onClick={() => {
                    const result = prompt(`Enter result (${currency}):`);
                    if (result) handleOpenBonus(bonus.id, Number(result));
                  }}>Open</button>
                )}
                <button className="bh-list-remove" onClick={() => handleRemoveBonus(bonus.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ─── */
function ColorPicker({ label, value, onChange }) {
  return (
    <label className="nb-color-field">
      <input type="color" value={value} onChange={e => onChange(e.target.value)} />
      <span className="nb-color-label">{label}</span>
      <span className="nb-color-hex">{value}</span>
    </label>
  );
}

function SliderField({ label, value, min, max, step, unit, onChange }) {
  return (
    <div className="nb-slider-field">
      <div className="nb-slider-head">
        <span>{label}</span>
        <span className="nb-slider-val">{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))} />
    </div>
  );
}
