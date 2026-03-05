import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getAllSlots, DEFAULT_SLOT_IMAGE, sortSlotsByProviderPriority } from '../../../utils/slotUtils';
import { getMySubmissions, submitSlot } from '../../../services/pendingSlotService';
import ColorPicker from './shared/ColorPicker';
import { supabase } from '../../../config/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { getBonusHuntHistory, saveBonusHuntToHistory, deleteBonusHuntHistory } from '../../../services/overlayService';
import { updateSlotRecordsFromHunt } from '../../../services/slotRecordService';
import TabBar from './shared/TabBar';

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

export default function BonusHuntConfig({ config, onChange, allWidgets, mode = 'full' }) {
  const c = config || {};
  const [activeTab, setActiveTab] = useState(mode === 'widget' ? 'style' : 'content');
  const set = (key, val) => onChange({ ...c, [key]: val });
  const setMulti = (obj) => onChange({ ...c, ...obj });

  // Auth for history
  const { user } = useAuth();

  // Auto-fill streamer avatar from Twitch
  const twitchAvatar = user?.user_metadata?.avatar_url || '';
  useEffect(() => {
    if (twitchAvatar && !c.avatarUrl) {
      set('avatarUrl', twitchAvatar);
    }
  }, [twitchAvatar]);

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

  const allTabs = [
    { id: 'content', label: '📋 Content' },
    { id: 'history', label: '📜 History' },
    { id: 'style', label: '🎨 Style' },
    { id: 'filters', label: '✨ Filters' },
    { id: 'presets', label: '💾 Presets' },
  ];
  const SIDEBAR_TABS = new Set(['content', 'history']);
  const WIDGET_TABS  = new Set(['style', 'filters', 'presets']);
  const tabs = mode === 'sidebar' ? allTabs.filter(t => SIDEBAR_TABS.has(t.id))
             : mode === 'widget'  ? allTabs.filter(t => WIDGET_TABS.has(t.id))
             : allTabs;

  return (
    <div className="bh-config">
      {/* Top quick toggles — only in sidebar or full mode */}
      {mode !== 'widget' && <div className="bh-quick-row">
        <label className="oc-config-field" style={{ flex: 1 }}>
          <span>Currency</span>
          <input value={c.currency || '€'} onChange={e => set('currency', e.target.value)} />
        </label>
        <label className="oc-config-field" style={{ flex: 1 }}>
          <span>Display Style</span>
          <select value={c.displayStyle || 'v1'} onChange={e => set('displayStyle', e.target.value)}>
            <option value="v1">Style 1 — Classic</option>
            <option value="v2">Style 2 — Sleek Dark</option>
            <option value="v3">Style 3 — Flip Card</option>
            <option value="v4_neon">Style 4 — Neon</option>
            <option value="v5_horizontal">Style 5 — Horizontal</option>
            <option value="v6_compact">Style 6 — Compact</option>
            <option value="v7_carousel">Style 7 — Carousel</option>
            <option value="v8_card_stack">Style 8 — Card Stack</option>
          </select>
        </label>
        <label className="bh-check-row">
          <input type="checkbox" checked={!!c.huntActive} onChange={e => set('huntActive', e.target.checked)} />
          <span>Hunt Active</span>
        </label>
      </div>}

      {/* Tab nav */}
      <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} style={{ marginTop: 8 }} />

      {/* ═══════ CONTENT TAB ═══════ */}
      {activeTab === 'content' && (
        <BonusHuntPanel config={c} onChange={onChange} userId={user?.id} userAvatar={user?.user_metadata?.avatar_url} currency={c.currency || '€'} />
      )}

      {/* ═══════ HISTORY TAB ═══════ */}
      {activeTab === 'history' && (
        <BonusHuntHistoryTab config={c} onChange={onChange} userId={user?.id} currency={c.currency || '€'} />
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

          <h4 className="nb-subtitle" style={{ marginTop: 18 }}>Custom CSS</h4>
          <p className="oc-config-hint" style={{ marginBottom: 6, fontSize: 11 }}>Override styles for this widget in OBS.</p>
          <textarea
            className="oc-widget-css-input"
            value={c.custom_css || ''}
            onChange={e => set('custom_css', e.target.value)}
            rows={4}
            placeholder={`/* custom CSS for this widget */`}
            spellCheck={false}
          />
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
                <div key={p.name} className="nb-preset-pill">
                  <div className="nb-preset-pill__info">
                    <span className="nb-preset-pill__name">{p.name}</span>
                    <span className="nb-preset-pill__date">
                      {p.savedAt ? new Date(p.savedAt).toLocaleDateString() : ''}
                    </span>
                    <div className="nb-preset-pill__swatches">
                      {['headerColor', 'currentBonusColor', 'listCardColor', 'totalPayColor'].map(k =>
                        p.values[k] ? (
                          <span key={k} className="nb-preset-pill__swatch" style={{ background: p.values[k] }} title={k} />
                        ) : null
                      )}
                    </div>
                  </div>
                  <div className="nb-preset-pill__actions">
                    <button className="nb-preset-pill__load" onClick={() => loadPreset(p)}>Load</button>
                    <button className="nb-preset-pill__delete" onClick={() => deletePreset(p.name)} title="Delete preset">🗑️</button>
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
function BonusHuntPanel({ config, onChange, userId, userAvatar, currency: panelCurrency }) {
  const c = config || {};
  const [startMoney, setStartMoney] = useState(c.startMoney || '');
  const [targetMoney, setTargetMoney] = useState(c.targetMoney || '');
  const [stopLoss, setStopLoss] = useState(c.stopLoss || '');
  const [huntNumber, setHuntNumber] = useState(c.huntNumber || '');
  const [betSize, setBetSize] = useState('');
  const [slotSearch, setSlotSearch] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [isSuperBonus, setIsSuperBonus] = useState(false);
  const [isExtremeBonus, setIsExtremeBonus] = useState(false);
  const [showStatistics, setShowStatistics] = useState(c.showStatistics ?? true);
  const [animatedTracker, setAnimatedTracker] = useState(c.animatedTracker ?? true);
  const [bonusList, setBonusList] = useState(c.bonuses || []);
  const [sortBy, setSortBy] = useState(c.sortBy || 'default');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [slots, setSlots] = useState([]);
  const [bonusOpening, setBonusOpening] = useState(c.bonusOpening ?? false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editBet, setEditBet] = useState('');
  const searchRef = useRef(null);

  // Submit slot state
  const [showSubmitSlot, setShowSubmitSlot] = useState(false);
  const [submitForm, setSubmitForm] = useState({});
  const [submitSaving, setSubmitSaving] = useState(false);
  const [submitImageResults, setSubmitImageResults] = useState([]);
  const [submitImageSearching, setSubmitImageSearching] = useState(false);

  const setField = (k, v) => setSubmitForm(p => ({ ...p, [k]: v }));

  const searchSlotImages = async () => {
    const q = `${submitForm.name || ''} ${submitForm.provider || ''} slot stake`.trim();
    if (!q || q === 'slot') return;
    setSubmitImageSearching(true);
    setSubmitImageResults([]);
    try {
      const res = await fetch(`/api/image-search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (res.ok && data.images?.length) setSubmitImageResults(data.images);
    } catch { /* noop */ }
    setSubmitImageSearching(false);
  };

  const handleSlotSubmit = async () => {
    if (!submitForm.name?.trim() || !submitForm.provider?.trim() || !submitForm.image?.trim()) {
      return alert('Name, Provider, and Image URL are required.');
    }
    setSubmitSaving(true);
    try {
      await submitSlot(userId, {
        name: submitForm.name.trim(),
        provider: submitForm.provider.trim(),
        image: submitForm.image.trim(),
        rtp: submitForm.rtp ? parseFloat(submitForm.rtp) : null,
        volatility: submitForm.volatility || null,
        max_win_multiplier: submitForm.max_win_multiplier ? parseFloat(submitForm.max_win_multiplier) : null,
      });
      // Refresh slots to include the new pending one
      const [allSlots, myPending] = await Promise.all([
        getAllSlots(),
        getMySubmissions(userId),
      ]);
      const liveSlots = allSlots || [];
      const pendingAsSlots = (myPending || [])
        .filter(p => p.status === 'pending')
        .map(p => ({
          id: `pending_${p.id}`,
          name: p.name, provider: p.provider, image: p.image,
          rtp: p.rtp, volatility: p.volatility,
          max_win_multiplier: p.max_win_multiplier, _isPending: true,
        }));
      const liveNames = new Set(liveSlots.map(s => s.name?.toLowerCase()));
      const unique = pendingAsSlots.filter(p => !liveNames.has(p.name?.toLowerCase()));
      setSlots([...liveSlots, ...unique]);
      setSubmitForm({});
      setSubmitImageResults([]);
      setShowSubmitSlot(false);
      alert('Slot submitted for approval! You can now use it in your bonus hunt.');
    } catch (e) {
      alert(e.message?.includes('duplicate') ? 'Slot already exists or pending.' : `Error: ${e.message}`);
    } finally {
      setSubmitSaving(false);
    }
  };

  const slotProviders = [...new Set(slots.map(s => s.provider).filter(Boolean))].sort();

  // Save & Close state
  const [saveHuntName, setSaveHuntName] = useState('');
  const [savingHunt, setSavingHunt] = useState(false);
  const [saveHuntMsg, setSaveHuntMsg] = useState('');
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  // GTB Transfer state
  const [showGtbModal, setShowGtbModal] = useState(false);
  const [gtbPassword, setGtbPassword] = useState('');
  const [gtbSessionTitle, setGtbSessionTitle] = useState('');
  const [gtbCasinoBrand, setGtbCasinoBrand] = useState('');
  const [gtbCasinoImage, setGtbCasinoImage] = useState('');
  const [gtbTransferring, setGtbTransferring] = useState(false);
  const [gtbMessage, setGtbMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    const loadSlots = async () => {
      try {
        const [allSlots, myPending] = await Promise.all([
          getAllSlots(),
          userId ? getMySubmissions(userId) : Promise.resolve([]),
        ]);
        const liveSlots = allSlots || [];
        // Add user's pending slots (not yet approved) so they can use them
        const pendingAsSlots = (myPending || [])
          .filter(p => p.status === 'pending')
          .map(p => ({
            id: `pending_${p.id}`,
            name: p.name,
            provider: p.provider,
            image: p.image,
            rtp: p.rtp,
            volatility: p.volatility,
            max_win_multiplier: p.max_win_multiplier,
            _isPending: true,
          }));
        // Merge, avoiding duplicates by name
        const liveNames = new Set(liveSlots.map(s => s.name?.toLowerCase()));
        const unique = pendingAsSlots.filter(p => !liveNames.has(p.name?.toLowerCase()));
        setSlots([...liveSlots, ...unique]);
      } catch {
        setSlots([]);
      }
    };
    loadSlots();
  }, [userId]);

  const filteredSlots = slotSearch.trim().length > 0 && slots.length > 0
    ? sortSlotsByProviderPriority(slots.filter(s => s?.name?.toLowerCase().includes(slotSearch.toLowerCase())))
    : [];

  const save = useCallback((list = bonusList, extras = {}) => {
    onChange({
      ...config,
      startMoney: Number(startMoney) || 0,
      targetMoney: Number(targetMoney) || 0,
      stopLoss: Number(stopLoss) || 0,
      huntNumber: huntNumber,
      showStatistics, animatedTracker, bonusOpening,
      sortBy,
      bonuses: list,
      huntActive: config?.huntActive ?? false,
      ...extras,
    });
  }, [config, onChange, startMoney, targetMoney, stopLoss, huntNumber, showStatistics, animatedTracker, bonusOpening, sortBy, bonusList]);

  const handleAddBonus = () => {
    const betNum = Number(betSize);
    if (!selectedSlot || !betSize || betNum <= 0) return;
    const newBonus = {
      id: Date.now(),
      slot: selectedSlot,
      slotName: selectedSlot.name,
      betSize: betNum,
      isSuperBonus,
      isExtremeBonus,
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
    setIsExtremeBonus(false);
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

  const handleCopyName = (bonus) => {
    const name = bonus.slotName || bonus.slot?.name || '';
    navigator.clipboard.writeText(name).catch(() => {});
  };

  const handleStartEdit = (bonus) => {
    setEditingId(bonus.id);
    setEditName(bonus.slotName || bonus.slot?.name || '');
    setEditBet(String(bonus.betSize || ''));
  };

  const handleSaveEdit = (bonusId) => {
    const updated = bonusList.map(b =>
      b.id === bonusId ? { ...b, slotName: editName, betSize: Number(editBet) || b.betSize } : b
    );
    setBonusList(updated);
    save(updated);
    setEditingId(null);
  };

  const handleCancelEdit = () => setEditingId(null);

  const handlePayoutChange = (bonusId, value) => {
    const payout = Number(value) || 0;
    const updated = bonusList.map(b =>
      b.id === bonusId ? { ...b, opened: payout > 0, payout, result: payout } : b
    );
    setBonusList(updated);
    save(updated);
  };

  // SHA-256 hash helper (must match admin panel)
  const hashPassword = async (password) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Transfer bonuses to GTB
  const handleTransferToGtb = async () => {
    if (!gtbPassword.trim()) {
      setGtbMessage({ type: 'error', text: 'Please enter the transfer password.' });
      return;
    }
    if (!gtbSessionTitle.trim()) {
      setGtbMessage({ type: 'error', text: 'Please enter a session title.' });
      return;
    }
    if (bonusList.length === 0) {
      setGtbMessage({ type: 'error', text: 'No bonuses to transfer.' });
      return;
    }

    setGtbTransferring(true);
    setGtbMessage({ type: '', text: '' });

    try {
      const hash = await hashPassword(gtbPassword.trim());

      // Map bonus list to GTB slot format
      const slotsPayload = bonusList.map(bonus => ({
        slot_name: bonus.slotName || bonus.slot?.name || 'Unknown',
        slot_image_url: bonus.slot?.image || '',
        provider: bonus.slot?.provider || '',
        bet_value: bonus.betSize || 0,
        is_super: bonus.isSuperBonus || false,
        is_extreme: bonus.isExtremeBonus || false,
      }));

      const startValue = Number(startMoney) || 0;

      const { data, error } = await supabase.rpc('verify_gtb_transfer_password', {
        p_password_hash: hash,
        p_session_title: gtbSessionTitle.trim(),
        p_start_value: startValue,
        p_casino_brand: gtbCasinoBrand.trim(),
        p_casino_image_url: gtbCasinoImage.trim(),
        p_slots: slotsPayload,
      });

      if (error) throw error;

      setGtbMessage({ type: 'success', text: `✅ Transferred ${bonusList.length} bonuses to GTB session! Session ID: ${data}` });
      setGtbPassword('');
      // Close modal after a brief delay
      setTimeout(() => {
        setShowGtbModal(false);
        setGtbMessage({ type: '', text: '' });
        setGtbSessionTitle('');
        setGtbCasinoBrand('');
        setGtbCasinoImage('');
      }, 2500);
    } catch (err) {
      setGtbMessage({ type: 'error', text: err.message || 'Transfer failed. Check your password.' });
    } finally {
      setGtbTransferring(false);
    }
  };

  // Save hunt to library & start new
  const handleSaveAndClose = async () => {
    if (!userId) { setSaveHuntMsg('⚠️ Not logged in'); return; }
    if (bonusList.length === 0) { setSaveHuntMsg('⚠️ No bonuses to save'); return; }
    const name = saveHuntName.trim() || `Hunt ${new Date().toLocaleDateString()}`;
    setSavingHunt(true);
    setSaveHuntMsg('');
    try {
      const totalBet = bonusList.reduce((s, b) => s + (Number(b.betSize) || 0), 0);
      const opened = bonusList.filter(b => b.opened);
      const totalWin = opened.reduce((s, b) => s + (Number(b.payout) || 0), 0);
      const profit = totalWin - (Number(startMoney) || 0);
      const avgMulti = opened.length > 0
        ? opened.reduce((s, b) => s + ((Number(b.payout) || 0) / (Number(b.betSize) || 1)), 0) / opened.length
        : 0;
      let bestMulti = 0, bestSlotName = '';
      opened.forEach(b => {
        const m = (Number(b.payout) || 0) / (Number(b.betSize) || 1);
        if (m > bestMulti) { bestMulti = m; bestSlotName = b.slotName || b.slot?.name || ''; }
      });
      const record = {
        hunt_name: name,
        currency: panelCurrency,
        start_money: Number(startMoney) || 0,
        stop_loss: Number(stopLoss) || 0,
        total_bet: totalBet,
        total_win: totalWin,
        profit,
        bonus_count: bonusList.length,
        bonuses_opened: opened.length,
        avg_multi: Math.round(avgMulti * 100) / 100,
        best_multi: Math.round(bestMulti * 100) / 100,
        best_slot_name: bestSlotName,
        bonuses: bonusList,
      };
      await saveBonusHuntToHistory(userId, record);
      // Auto-update per-user slot records
      try { await updateSlotRecordsFromHunt(userId, bonusList, name); } catch (e) { console.warn('Slot records update failed:', e); }
      // Reset the hunt
      setBonusList([]);
      setStartMoney('');
      setTargetMoney('');
      setStopLoss('');
      setHuntNumber('');
      setBonusOpening(false);
      setSaveHuntName('');
      setShowSaveConfirm(false);
      onChange({
        ...config,
        bonuses: [],
        startMoney: 0,
        targetMoney: 0,
        stopLoss: 0,
        bonusOpening: false,
        huntActive: false,
      });
      setSaveHuntMsg('✅ Hunt saved to Library! Ready for a new hunt.');
      setTimeout(() => setSaveHuntMsg(''), 4000);
    } catch (err) {
      const msg = err?.message || '';
      if (msg.includes('42P01')) {
        setSaveHuntMsg('⚠️ Table not found. Run the migration: add_bonus_hunt_history.sql');
      } else {
        setSaveHuntMsg('⚠️ ' + (msg || 'Save failed'));
      }
    } finally {
      setSavingHunt(false);
    }
  };

  const currency = config?.currency || '€';

  return (
    <div className="bh-panel">

      {/* ─── Hunt Settings ─── */}
      <div className="bh-panel-section">
        <h4 className="bh-panel-label">Hunt Settings</h4>
        <div className="bh-settings-row">
          <label className="bh-input-group bh-input-sm">
            <span>Hunt #</span>
            <input type="text" value={huntNumber}
              placeholder="42"
              onChange={e => setHuntNumber(e.target.value)}
              onBlur={() => save()} />
          </label>
          <label className="bh-input-group">
            <span>Start ({currency})</span>
            <input type="number" value={startMoney}
              placeholder="0"
              onChange={e => setStartMoney(e.target.value)}
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h4 className="bh-panel-label" style={{ margin: 0 }}>Add Bonus</h4>
          <button
            className={`bh-submit-slot-btn${showSubmitSlot ? ' active' : ''}`}
            onClick={() => {
              if (!showSubmitSlot && slotSearch.trim() && !selectedSlot) {
                setField('name', slotSearch.trim());
              }
              setShowSubmitSlot(p => !p);
            }}
          >
            {showSubmitSlot ? '✕ Close' : '+ Submit Slot'}
          </button>
        </div>

        {/* Inline Submit Slot Form */}
        {showSubmitSlot && (
          <div className="bh-submit-dropdown">
            <div className="bh-submit-grid">
              <label className="bh-submit-field">
                <span>Name <em>*</em></span>
                <input value={submitForm.name || ''} onChange={e => setField('name', e.target.value)} placeholder="Sweet Bonanza" />
              </label>
              <label className="bh-submit-field">
                <span>Provider <em>*</em></span>
                <input list="bh-prov-list" value={submitForm.provider || ''} onChange={e => setField('provider', e.target.value)} placeholder="Pragmatic Play" />
                <datalist id="bh-prov-list">{slotProviders.map(p => <option key={p} value={p} />)}</datalist>
              </label>
              <label className="bh-submit-field">
                <span>RTP (%)</span>
                <input type="number" value={submitForm.rtp || ''} onChange={e => setField('rtp', e.target.value || null)} placeholder="96.50" step="0.01" min="80" max="100" />
              </label>
              <label className="bh-submit-field">
                <span>Volatility</span>
                <select value={submitForm.volatility || ''} onChange={e => setField('volatility', e.target.value || null)}>
                  <option value="">Select…</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="very_high">Very High</option>
                </select>
              </label>
              <label className="bh-submit-field">
                <span>Max Win (x)</span>
                <input type="number" value={submitForm.max_win_multiplier || ''} onChange={e => setField('max_win_multiplier', e.target.value || null)} placeholder="10000" />
              </label>
              <label className="bh-submit-field">
                <span>Image <em>*</em></span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <input style={{ flex: 1, fontSize: '0.68rem' }} value={submitForm.image || ''} onChange={e => setField('image', e.target.value)} placeholder="URL or search →" />
                  <button type="button" className="bh-submit-search-btn" onClick={searchSlotImages} disabled={!submitForm.name || submitImageSearching}>
                    {submitImageSearching ? '⏳' : '🔍'}
                  </button>
                  {userAvatar && (
                    <button type="button" className="bh-submit-search-btn" title="Use my stream logo" onClick={() => { setField('image', userAvatar); setSubmitImageResults([]); }}>
                      📷
                    </button>
                  )}
                </div>
              </label>
            </div>
            {/* Image results + preview */}
            {(submitImageResults.length > 0 || submitForm.image) && (
              <div className="bh-submit-images">
                {submitForm.image && (
                  <img src={submitForm.image} alt="" className="bh-submit-preview" onError={e => (e.target.src = DEFAULT_SLOT_IMAGE)} />
                )}
                {submitImageResults.slice(0, 6).map((img, i) => (
                  <button key={i} type="button" className={`bh-submit-img-btn${submitForm.image === img.url ? ' selected' : ''}`}
                    onClick={() => { setField('image', img.url); setSubmitImageResults([]); }}>
                    <img src={img.thumb} alt="" />
                  </button>
                ))}
              </div>
            )}
            {/* Submit actions */}
            <div className="bh-submit-actions">
              <button className="bh-submit-cancel" onClick={() => { setShowSubmitSlot(false); setSubmitForm({}); setSubmitImageResults([]); }}>Cancel</button>
              <button className="bh-submit-save" onClick={handleSlotSubmit} disabled={submitSaving}>
                {submitSaving ? 'Submitting…' : '📤 Submit for Approval'}
              </button>
            </div>
          </div>
        )}

        {/* Search + Bet + Add – compact single row */}
        <div className="bh-add-row">
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
                        <span className="bh-suggestion-name">
                          {slot.name}
                          {slot._isPending && <span className="bh-pending-badge">Pending</span>}
                        </span>
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

          <input type="number" className="bh-bet-field" value={betSize}
            onChange={e => setBetSize(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddBonus(); } }}
            placeholder={`Bet (${currency})`} step="0.1" />
          <button
            type="button"
            className={`bh-super-btn${isSuperBonus ? ' active' : ''}`}
            title="Super Bonus"
            disabled={!betSize}
            onClick={() => { setIsSuperBonus(p => !p); if (!isSuperBonus) setIsExtremeBonus(false); }}
          >Super</button>
          <button
            type="button"
            className={`bh-extreme-btn${isExtremeBonus ? ' active' : ''}`}
            title="Extreme Bonus"
            disabled={!betSize}
            onClick={() => { setIsExtremeBonus(p => !p); if (!isExtremeBonus) setIsSuperBonus(false); }}
          >Extreme</button>
          <button className="bh-add-btn" onClick={handleAddBonus} disabled={!selectedSlot || !betSize}>
            + Add
          </button>
        </div>
      </div>

      {/* ─── Send to GTB ─── */}
      {bonusList.length > 0 && (
        <div className="bh-panel-section">
          <div className="bh-gtb-action-bar">
            <div className="bh-gtb-action-info">
              <span className="bh-gtb-action-icon">📤</span>
              <div className="bh-gtb-action-text">
                <span className="bh-gtb-action-title">Send to Guess the Balance</span>
                <span className="bh-gtb-action-desc">Transfer {bonusList.length} bonus{bonusList.length !== 1 ? 'es' : ''} to a new GTB session</span>
              </div>
            </div>
            <button
              className="bh-gtb-send-btn"
              onClick={() => { setShowGtbModal(prev => !prev); setGtbMessage({ type: '', text: '' }); }}
            >
              {showGtbModal ? 'Close ✕' : 'Send to GTB →'}
            </button>
          </div>

          {/* Inline dropdown form */}
          {showGtbModal && (
            <div className="bh-gtb-dropdown">
              <p className="bh-gtb-dropdown-info">
                Creates a new GTB session with <strong>{bonusList.length}</strong> bonus{bonusList.length !== 1 ? 'es' : ''}. Requires an admin transfer password.
              </p>

              <div className="bh-gtb-form-group">
                <label>Session Title *</label>
                <input
                  type="text"
                  value={gtbSessionTitle}
                  onChange={e => setGtbSessionTitle(e.target.value)}
                  placeholder="e.g. Bonus Hunt #42"
                  className="bh-gtb-input"
                />
              </div>

              <div className="bh-gtb-form-group">
                <label>Casino Brand</label>
                <input
                  type="text"
                  value={gtbCasinoBrand}
                  onChange={e => setGtbCasinoBrand(e.target.value)}
                  placeholder="e.g. Stake, Duelbits..."
                  className="bh-gtb-input"
                />
              </div>

              <div className="bh-gtb-form-group">
                <label>Casino Logo URL</label>
                <input
                  type="text"
                  value={gtbCasinoImage}
                  onChange={e => setGtbCasinoImage(e.target.value)}
                  placeholder="https://..."
                  className="bh-gtb-input"
                />
              </div>

              <div className="bh-gtb-form-group">
                <label>Transfer Password *</label>
                <input
                  type="password"
                  value={gtbPassword}
                  onChange={e => setGtbPassword(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleTransferToGtb(); }}
                  placeholder="Enter admin transfer password"
                  className="bh-gtb-input bh-gtb-input--password"
                  autoComplete="off"
                />
              </div>

              {gtbMessage.text && (
                <div className={`bh-gtb-message bh-gtb-message--${gtbMessage.type}`}>
                  {gtbMessage.text}
                </div>
              )}

              <div className="bh-gtb-dropdown-summary">
                <span>🎰 {bonusList.length} bonuses</span>
                <span>💰 Start: {currency}{Number(startMoney) || 0}</span>
                <span>📊 Total bet: {currency}{bonusList.reduce((s, b) => s + (b.betSize || 0), 0).toFixed(2)}</span>
              </div>

              <button
                className="bh-gtb-confirm"
                onClick={handleTransferToGtb}
                disabled={gtbTransferring || !gtbPassword.trim() || !gtbSessionTitle.trim()}
              >
                {gtbTransferring ? '⏳ Transferring...' : '📤 Transfer to GTB'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── Bonus List ─── */}
      <div className="bh-panel-section">
        {/* ── Bonus Opening toggle — prominent ── */}
        <div className={`bh-opening-toggle ${bonusOpening ? 'bh-opening-toggle--active' : ''}`}>
          <label className="bh-opening-label">
            <input type="checkbox" checked={bonusOpening}
              onChange={e => { setBonusOpening(e.target.checked); save(bonusList, { bonusOpening: e.target.checked }); }} />
            <span className="bh-opening-switch" />
            <span className="bh-opening-text">
              {bonusOpening ? '🎰 Bonus Opening — ACTIVE' : '🔒 Bonus Opening — OFF'}
            </span>
          </label>
          {!bonusOpening && (
            <span className="bh-opening-hint">Enable to unlock payout inputs</span>
          )}
        </div>

        <h4 className="bh-panel-label">
          Bonuses <span className="bh-count">{bonusList.length}</span>
        </h4>

        {/* Sort controls */}
        {bonusList.length > 1 && (
          <div className="bh-sort-controls">
            <span className="bh-sort-label">Sort by:</span>
            {['default', 'bet', 'provider'].map(opt => (
              <button
                key={opt}
                className={`bh-sort-btn${sortBy === opt ? ' bh-sort-btn--active' : ''}`}
                onClick={() => { setSortBy(opt); save(bonusList, { sortBy: opt }); }}
              >
                {opt === 'default' ? '📋 Order Added' : opt === 'bet' ? '💰 Bet' : '🏢 Provider'}
              </button>
            ))}
          </div>
        )}

        <div className="bh-list">
          {bonusList.length === 0 ? (
            <p className="bh-list-empty">No bonuses added yet</p>
          ) : [...bonusList].sort((a, b) => {
            if (sortBy === 'bet') return (a.betSize || 0) - (b.betSize || 0);
            if (sortBy === 'provider') {
              const pa = (a.slot?.provider || '').toLowerCase();
              const pb = (b.slot?.provider || '').toLowerCase();
              if (pa !== pb) return pa.localeCompare(pb);
              return (a.slotName || '').localeCompare(b.slotName || '');
            }
            return 0; // default = insertion order
          }).map((bonus, i) => (
            <div key={bonus.id} className={`bh-list-item ${bonus.opened ? 'bh-list-item--opened' : ''} ${bonus.isSuperBonus ? 'bh-list-item--super' : ''} ${bonus.isExtremeBonus ? 'bh-list-item--extreme' : ''}`}>

              {/* Drag handle + number */}
              <span className="bh-list-grip">⠿</span>
              <span className="bh-list-num">#{i + 1}</span>

              {/* Slot image */}
              {bonus.slot?.image && (
                <img src={bonus.slot.image} alt={bonus.slotName} className="bh-list-img"
                  onError={e => { e.target.style.display = 'none'; }} />
              )}

              {/* Name + provider — or inline edit */}
              {editingId === bonus.id ? (
                <div className="bh-list-edit-row">
                  <input className="bh-list-edit-input" value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(bonus.id); if (e.key === 'Escape') handleCancelEdit(); }}
                    placeholder="Slot name" autoFocus />
                  <input className="bh-list-edit-input bh-list-edit-bet" value={editBet}
                    type="number" step="0.1"
                    onChange={e => setEditBet(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(bonus.id); if (e.key === 'Escape') handleCancelEdit(); }}
                    placeholder="Bet" />
                  <button className="bh-list-edit-save" onClick={() => handleSaveEdit(bonus.id)}>✓</button>
                  <button className="bh-list-edit-cancel" onClick={handleCancelEdit}>✕</button>
                </div>
              ) : (
                <>
                  <div className="bh-list-info">
                    <span className="bh-list-name">
                      {bonus.slotName || bonus.slot?.name}
                      {bonus.isSuperBonus && <span className="bh-list-super-badge">SUPER</span>}
                      {bonus.isExtremeBonus && <span className="bh-list-extreme-badge">EXTREME</span>}
                    </span>
                    {bonus.slot?.provider && <span className="bh-list-provider">{bonus.slot.provider}</span>}
                  </div>

                  {/* Copy + Edit buttons */}
                  <button className="bh-list-icon-btn" title="Copy name" onClick={() => handleCopyName(bonus)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                    </svg>
                  </button>
                  <button className="bh-list-icon-btn" title="Edit" onClick={() => handleStartEdit(bonus)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                    </svg>
                  </button>

                  {/* Bet */}
                  <div className="bh-list-field">
                    <span className="bh-list-field-label">Bet</span>
                    <span className="bh-list-field-value">{bonus.betSize}</span>
                  </div>

                  {/* Payment — locked unless bonusOpening */}
                  <div className="bh-list-field">
                    <span className="bh-list-field-label">Payment {!bonusOpening && '🔒'}</span>
                    {bonusOpening ? (
                      <input className="bh-list-payout-input" type="number"
                        value={bonus.payout || ''}
                        placeholder="0"
                        onChange={e => handlePayoutChange(bonus.id, e.target.value)}
                        step="0.01" />
                    ) : (
                      <span className="bh-list-field-value bh-list-field-locked">Locked</span>
                    )}
                  </div>

                  {/* Mult */}
                  <div className="bh-list-field bh-list-field--mult">
                    <span className="bh-list-field-label">Mult</span>
                    <span className="bh-list-field-value bh-list-field-mult">
                      {bonus.betSize > 0 && bonus.payout > 0
                        ? ((bonus.payout / bonus.betSize).toFixed(1)) + 'x'
                        : '0x'}
                    </span>
                  </div>

                  {/* Delete */}
                  <button className="bh-list-remove" onClick={() => handleRemoveBonus(bonus.id)} title="Remove bonus">
                    🗑️
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ─── Save Hunt to Library & Start New ─── */}
      {bonusList.length > 0 && (
        <div className="bh-panel-section">
          <div className="bh-save-hunt-section">
            <div className="bh-save-hunt-header">
              <span className="bh-save-hunt-icon">📚</span>
              <div>
                <span className="bh-save-hunt-title">Save Hunt to Library</span>
                <span className="bh-save-hunt-desc">Archive this hunt and start fresh</span>
              </div>
            </div>

            {saveHuntMsg && (
              <div className={`bh-gtb-message ${saveHuntMsg.startsWith('✅') ? 'bh-gtb-message--success' : 'bh-gtb-message--error'}`}>
                {saveHuntMsg}
              </div>
            )}

            {!showSaveConfirm ? (
              <button
                className="bh-save-hunt-btn"
                onClick={() => setShowSaveConfirm(true)}
              >
                💾 Save & Close Hunt
              </button>
            ) : (
              <div className="bh-save-hunt-form">
                <input
                  className="bh-gtb-input"
                  value={saveHuntName}
                  onChange={e => setSaveHuntName(e.target.value)}
                  placeholder={`Hunt name (default: Hunt ${new Date().toLocaleDateString()})`}
                  maxLength={60}
                  onKeyDown={e => e.key === 'Enter' && handleSaveAndClose()}
                  autoFocus
                />
                <div className="bh-save-hunt-summary">
                  <span>🎰 {bonusList.length} bonuses</span>
                  <span>💰 Start: {currency}{Number(startMoney) || 0}</span>
                  <span>📊 Total bet: {currency}{bonusList.reduce((s, b) => s + (b.betSize || 0), 0).toFixed(2)}</span>
                </div>
                <div className="bh-save-hunt-actions">
                  <button
                    className="bh-save-hunt-confirm"
                    onClick={handleSaveAndClose}
                    disabled={savingHunt}
                  >
                    {savingHunt ? '⏳ Saving...' : '✅ Confirm Save & Reset'}
                  </button>
                  <button
                    className="bh-save-hunt-cancel"
                    onClick={() => { setShowSaveConfirm(false); setSaveHuntMsg(''); }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating stats FAB */}
      <FloatingStatsFab
        bonusList={bonusList}
        startMoney={startMoney}
        targetMoney={targetMoney}
        currency={currency}
      />

    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   FLOATING STATS FAB — draggable, bottom-right default
   ═══════════════════════════════════════════════════════ */
function FloatingStatsFab({ bonusList, startMoney, targetMoney, currency }) {
  const [open, setOpen] = useState(false);
  const [useFixed, setUseFixed] = useState({ right: 24, bottom: 24 }); // tracks right/bottom
  const dragging = useRef(false);
  const didDrag = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });
  const fabRef = useRef(null);

  /* Convert right/bottom to left/top for dragging, then back */
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragging.current = true;
    didDrag.current = false;
    const rect = fabRef.current.getBoundingClientRect();
    dragStart.current = { x: e.clientX, y: e.clientY };
    startPos.current = { x: rect.left, y: rect.top };
    document.body.style.userSelect = 'none';

    const onMove = (ev) => {
      if (!dragging.current) return;
      const dx = ev.clientX - dragStart.current.x;
      const dy = ev.clientY - dragStart.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDrag.current = true;
      const newLeft = startPos.current.x + dx;
      const newTop = startPos.current.y + dy;
      const newRight = window.innerWidth - newLeft - 56;
      const newBottom = window.innerHeight - newTop - 56;
      setUseFixed({
        right: Math.max(0, newRight),
        bottom: Math.max(0, newBottom),
      });
    };
    const onUp = () => {
      dragging.current = false;
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  /* Touch support */
  const handleTouchStart = useCallback((e) => {
    const t = e.touches[0];
    dragging.current = true;
    didDrag.current = false;
    const rect = fabRef.current.getBoundingClientRect();
    dragStart.current = { x: t.clientX, y: t.clientY };
    startPos.current = { x: rect.left, y: rect.top };

    const onTouchMove = (ev) => {
      if (!dragging.current) return;
      const touch = ev.touches[0];
      const dx = touch.clientX - dragStart.current.x;
      const dy = touch.clientY - dragStart.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDrag.current = true;
      const newLeft = startPos.current.x + dx;
      const newTop = startPos.current.y + dy;
      setUseFixed({
        right: Math.max(0, window.innerWidth - newLeft - 56),
        bottom: Math.max(0, window.innerHeight - newTop - 56),
      });
    };
    const onTouchEnd = () => {
      dragging.current = false;
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
  }, []);

  /* Compute stats */
  const total = bonusList.length;
  const opened = bonusList.filter(b => b.opened);
  const openedCount = opened.length;
  const totalBet = bonusList.reduce((s, b) => s + (Number(b.betSize) || 0), 0);
  const totalPayout = opened.reduce((s, b) => s + (Number(b.payout) || 0), 0);
  const start = Number(startMoney) || 0;
  const target = Number(targetMoney) || 0;
  const profit = totalPayout - start;
  const avgMulti = openedCount > 0
    ? opened.reduce((s, b) => s + ((Number(b.payout) || 0) / (Number(b.betSize) || 1)), 0) / openedCount
    : 0;
  let bestMulti = 0, bestSlot = '';
  opened.forEach(b => {
    const m = (Number(b.payout) || 0) / (Number(b.betSize) || 1);
    if (m > bestMulti) { bestMulti = m; bestSlot = b.slotName || b.slot?.name || ''; }
  });
  let worstMulti = Infinity, worstSlot = '';
  opened.forEach(b => {
    const m = (Number(b.payout) || 0) / (Number(b.betSize) || 1);
    if (m < worstMulti) { worstMulti = m; worstSlot = b.slotName || b.slot?.name || ''; }
  });
  if (!isFinite(worstMulti)) worstMulti = 0;

  const progressPct = target > 0 ? Math.min(100, (totalPayout / target) * 100) : 0;
  const neededToBreakEven = Math.max(0, start - totalPayout);
  const remainingBonuses = total - openedCount;
  const avgNeeded = remainingBonuses > 0 && neededToBreakEven > 0
    ? neededToBreakEven / remainingBonuses
    : 0;

  const currentBE = totalBet > 0 ? start / totalBet : 0;

  const fmtV = (v) => `${currency}${v.toFixed(2)}`;

  return (
    <>
      {/* FAB button */}
      <div
        ref={fabRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onClick={() => { if (!didDrag.current) setOpen(o => !o); }}
        style={{
          position: 'fixed',
          right: useFixed.right,
          bottom: useFixed.bottom,
          width: 52, height: 52, borderRadius: '50%',
          background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, cursor: 'grab', zIndex: 99999,
          boxShadow: '0 4px 20px rgba(124,58,237,0.5), 0 2px 8px rgba(0,0,0,0.3)',
          border: '2px solid rgba(255,255,255,0.15)',
          transition: dragging.current ? 'none' : 'box-shadow 0.2s',
          userSelect: 'none', WebkitUserSelect: 'none',
          touchAction: 'none',
        }}
        title="Hunt Stats"
      >
        📊
      </div>

      {/* Stats panel */}
      {open && (
        <div style={{
          position: 'fixed',
          right: useFixed.right,
          bottom: useFixed.bottom + 62,
          width: 300, maxHeight: '70vh', overflowY: 'auto',
          background: 'linear-gradient(135deg, #1a1040 0%, #0f0a2a 100%)',
          borderRadius: 16,
          border: '1px solid rgba(124,58,237,0.35)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 20px rgba(124,58,237,0.15)',
          zIndex: 99998,
          padding: '16px 18px',
          color: '#e2e8f0',
          fontFamily: "'Inter', sans-serif",
          fontSize: 13,
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>📊</span>
              <span style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>Hunt Stats</span>
            </div>
            <button onClick={() => setOpen(false)} style={{
              background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8,
              color: '#94a3b8', cursor: 'pointer', padding: '4px 8px', fontSize: 13, fontWeight: 600,
            }}>✕</button>
          </div>

          {total === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: '20px 0' }}>
              No bonuses added yet
            </div>
          ) : (
            <>
              {/* Progress bar */}
              {target > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>
                    <span>Progress to Target</span>
                    <span>{progressPct.toFixed(1)}%</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 3, width: `${progressPct}%`,
                      background: progressPct >= 100 ? '#22c55e' : 'linear-gradient(90deg, #7c3aed, #a78bfa)',
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                </div>
              )}

              {/* Stats grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <StatCard label="Total Bonuses" value={total} />
                <StatCard label="Opened" value={`${openedCount} / ${total}`} />
                <StatCard label="Start Money" value={fmtV(start)} />
                <StatCard label="Total Bet" value={fmtV(totalBet)} />
                <StatCard label="Total Payout" value={fmtV(totalPayout)} color={totalPayout > 0 ? '#4ade80' : '#94a3b8'} />
                <StatCard label="Profit / Loss" value={fmtV(profit)} color={profit > 0 ? '#4ade80' : profit < 0 ? '#f87171' : '#94a3b8'} />
                <StatCard label="Avg Multiplier" value={`${avgMulti.toFixed(2)}x`} />
                <StatCard label="Current BE x" value={`${currentBE.toFixed(2)}x`} color="#fbbf24" />
              </div>

              {/* Best & Worst */}
              {openedCount > 0 && (
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{
                    background: 'rgba(34,197,94,0.08)', borderRadius: 10, padding: '8px 12px',
                    border: '1px solid rgba(34,197,94,0.2)',
                  }}>
                    <div style={{ fontSize: 10, color: '#4ade80', fontWeight: 600, marginBottom: 2 }}>🏆 BEST</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: 12, color: '#fff', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bestSlot}</span>
                      <span style={{ fontWeight: 800, color: '#4ade80' }}>{bestMulti.toFixed(1)}x</span>
                    </div>
                  </div>
                  <div style={{
                    background: 'rgba(248,113,113,0.08)', borderRadius: 10, padding: '8px 12px',
                    border: '1px solid rgba(248,113,113,0.2)',
                  }}>
                    <div style={{ fontSize: 10, color: '#f87171', fontWeight: 600, marginBottom: 2 }}>💀 WORST</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: 12, color: '#fff', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{worstSlot}</span>
                      <span style={{ fontWeight: 800, color: '#f87171' }}>{worstMulti.toFixed(1)}x</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Break-even tracker */}
              {openedCount > 0 && neededToBreakEven > 0 && remainingBonuses > 0 && (
                <div style={{
                  marginTop: 10, background: 'rgba(250,204,21,0.06)', borderRadius: 10,
                  padding: '8px 12px', border: '1px solid rgba(250,204,21,0.15)',
                }}>
                  <div style={{ fontSize: 10, color: '#fbbf24', fontWeight: 600, marginBottom: 4 }}>⚡ BREAK-EVEN TRACKER</div>
                  <div style={{ fontSize: 12, color: '#e2e8f0' }}>
                    Need <strong style={{ color: '#fbbf24' }}>{fmtV(neededToBreakEven)}</strong> more from <strong>{remainingBonuses}</strong> bonus{remainingBonuses !== 1 ? 'es' : ''}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                    Avg needed per bonus: <strong>{fmtV(avgNeeded)}</strong>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}

/* Tiny stat card for the panel */
function StatCard({ label, value, color }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '8px 10px',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: color || '#fff' }}>{value}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   BONUS HUNT HISTORY TAB
   ═══════════════════════════════════════════════════════ */
function BonusHuntHistoryTab({ config, onChange, userId, currency }) {
  const c = config || {};
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [saveName, setSaveName] = useState(c.huntName || '');
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Load history on mount
  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    getBonusHuntHistory(userId)
      .then(data => setHistory(data))
      .catch(err => setMessage('⚠️ Could not load history. Run the migration first.'))
      .finally(() => setLoading(false));
  }, [userId]);

  const bonuses = c.bonuses || [];

  // Calculate current hunt stats
  const calcStats = (bonusList, startMoney, stopLoss) => {
    const totalBet = bonusList.reduce((s, b) => s + (Number(b.betSize) || 0), 0);
    const opened = bonusList.filter(b => b.opened);
    const totalWin = opened.reduce((s, b) => s + (Number(b.payout) || 0), 0);
    const profit = totalWin - (Number(startMoney) || 0);
    const avgMulti = opened.length > 0
      ? opened.reduce((s, b) => s + ((Number(b.payout) || 0) / (Number(b.betSize) || 1)), 0) / opened.length
      : 0;

    let bestMulti = 0;
    let bestSlotName = '';
    opened.forEach(b => {
      const m = (Number(b.payout) || 0) / (Number(b.betSize) || 1);
      if (m > bestMulti) { bestMulti = m; bestSlotName = b.slotName || b.slot?.name || ''; }
    });

    return { totalBet, totalWin, profit, avgMulti, bestMulti, bestSlotName, bonusesOpened: opened.length };
  };

  // Save current hunt to history
  const handleSave = async () => {
    if (!userId) { setMessage('⚠️ Not logged in'); return; }
    if (bonuses.length === 0) { setMessage('⚠️ No bonuses to save'); return; }
    if (!saveName.trim()) { setMessage('⚠️ Enter a name for this hunt'); return; }

    setSaving(true);
    setMessage('');

    try {
      const stats = calcStats(bonuses, c.startMoney, c.stopLoss);
      const record = {
        hunt_name: saveName.trim(),
        currency: currency,
        start_money: Number(c.startMoney) || 0,
        stop_loss: Number(c.stopLoss) || 0,
        total_bet: stats.totalBet,
        total_win: stats.totalWin,
        profit: stats.profit,
        bonus_count: bonuses.length,
        bonuses_opened: stats.bonusesOpened,
        avg_multi: Math.round(stats.avgMulti * 100) / 100,
        best_multi: Math.round(stats.bestMulti * 100) / 100,
        best_slot_name: stats.bestSlotName,
        bonuses: bonuses,
      };

      const saved = await saveBonusHuntToHistory(userId, record);
      // Auto-update per-user slot records
      try { await updateSlotRecordsFromHunt(userId, bonuses, saveName.trim()); } catch (e) { console.warn('Slot records update failed:', e); }
      setHistory(prev => [saved, ...prev]);
      setMessage('✅ Hunt saved to history!');
      setSaveName('');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      const msg = err?.message || '';
      if (msg.includes('42P01')) {
        setMessage('⚠️ Table not found. Run the migration: add_bonus_hunt_history.sql');
      } else {
        setMessage('⚠️ ' + msg);
      }
    } finally {
      setSaving(false);
    }
  };

  // Load a hunt from history onto the overlay
  const handleLoad = (record) => {
    onChange({
      ...c,
      huntName: record.hunt_name,
      currency: record.currency || currency,
      startMoney: record.start_money,
      stopLoss: record.stop_loss,
      bonuses: record.bonuses || [],
      huntActive: true,
    });
    setMessage(`✅ Loaded "${record.hunt_name}" onto overlay`);
    setTimeout(() => setMessage(''), 3000);
  };

  // Delete from history
  const handleDelete = async (id) => {
    try {
      await deleteBonusHuntHistory(id);
      setHistory(prev => prev.filter(h => h.id !== id));
      setConfirmDelete(null);
      setMessage('🗑️ Deleted');
      setTimeout(() => setMessage(''), 2000);
    } catch (err) {
      setMessage('⚠️ ' + (err?.message || 'Delete failed'));
    }
  };

  // Format date
  const fmtDate = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const fmtNum = (n) => {
    const num = Number(n) || 0;
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="nb-section">
      {/* ── Save current hunt ── */}
      <h4 className="nb-subtitle">Save Current Hunt</h4>
      <p className="oc-config-hint" style={{ marginBottom: 8 }}>
        Archive the current bonus hunt. You can load it back anytime to view or display on overlay.
      </p>
      <div className="nb-preset-save-row">
        <input
          className="nb-preset-input"
          value={saveName}
          onChange={e => setSaveName(e.target.value)}
          placeholder="Hunt name (e.g. Bonus Hunt #42)"
          maxLength={60}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
        />
        <button className="nb-preset-save-btn" onClick={handleSave} disabled={saving || bonuses.length === 0}>
          {saving ? '⏳' : '💾'} Save
        </button>
      </div>

      {/* Current hunt quick stats */}
      {bonuses.length > 0 && (() => {
        const s = calcStats(bonuses, c.startMoney, c.stopLoss);
        return (
          <div className="bh-history-current-stats">
            <span>🎰 {bonuses.length} bonuses</span>
            <span>💰 {currency}{fmtNum(s.totalWin)} won</span>
            <span>{s.profit >= 0 ? '📈' : '📉'} {currency}{fmtNum(s.profit)}</span>
          </div>
        );
      })()}

      {message && (
        <div className={`bh-history-msg ${message.startsWith('✅') ? 'bh-history-msg--ok' : message.startsWith('🗑') ? 'bh-history-msg--del' : 'bh-history-msg--err'}`}>
          {message}
        </div>
      )}

      {/* ── History list ── */}
      <h4 className="nb-subtitle" style={{ marginTop: 16 }}>Hunt History</h4>

      {loading && <p className="oc-config-hint">Loading history...</p>}

      {!loading && history.length === 0 && (
        <p className="oc-config-hint" style={{ opacity: 0.6 }}>
          No hunts saved yet. Complete a hunt and save it above to build your history.
        </p>
      )}

      {!loading && history.length > 0 && (
        <div className="bh-history-list">
          {history.map(h => {
            const isExpanded = expandedId === h.id;
            const prof = Number(h.profit) || 0;
            const isProfit = prof >= 0;

            return (
              <div key={h.id} className={`bh-history-card ${isExpanded ? 'bh-history-card--expanded' : ''}`}>
                {/* Main row */}
                <div className="bh-history-row" onClick={() => setExpandedId(isExpanded ? null : h.id)}>
                  <div className="bh-history-main">
                    <div className="bh-history-name">{h.hunt_name}</div>
                    <div className="bh-history-date">{fmtDate(h.created_at)}</div>
                  </div>
                  <div className="bh-history-quick">
                    <span className="bh-history-stat-pill">🎰 {h.bonus_count}</span>
                    <span className={`bh-history-stat-pill ${isProfit ? 'bh-history-pill--profit' : 'bh-history-pill--loss'}`}>
                      {isProfit ? '+' : ''}{h.currency || currency}{fmtNum(prof)}
                    </span>
                  </div>
                  <svg className={`bh-history-chevron ${isExpanded ? 'bh-history-chevron--open' : ''}`}
                    width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 5l4 4 4-4" strokeLinecap="round" />
                  </svg>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="bh-history-details">
                    <div className="bh-history-stats-grid">
                      <div className="bh-history-stat-box">
                        <span className="bh-history-stat-label">Start</span>
                        <span className="bh-history-stat-val">{h.currency || currency}{fmtNum(h.start_money)}</span>
                      </div>
                      <div className="bh-history-stat-box">
                        <span className="bh-history-stat-label">Total Bet</span>
                        <span className="bh-history-stat-val">{h.currency || currency}{fmtNum(h.total_bet)}</span>
                      </div>
                      <div className="bh-history-stat-box">
                        <span className="bh-history-stat-label">Total Win</span>
                        <span className="bh-history-stat-val">{h.currency || currency}{fmtNum(h.total_win)}</span>
                      </div>
                      <div className="bh-history-stat-box">
                        <span className="bh-history-stat-label">Profit</span>
                        <span className={`bh-history-stat-val ${isProfit ? 'bh-history-val--profit' : 'bh-history-val--loss'}`}>
                          {isProfit ? '+' : ''}{h.currency || currency}{fmtNum(prof)}
                        </span>
                      </div>
                      <div className="bh-history-stat-box">
                        <span className="bh-history-stat-label">Avg Multi</span>
                        <span className="bh-history-stat-val">{Number(h.avg_multi || 0).toFixed(2)}x</span>
                      </div>
                      <div className="bh-history-stat-box">
                        <span className="bh-history-stat-label">Best Multi</span>
                        <span className="bh-history-stat-val">{Number(h.best_multi || 0).toFixed(2)}x</span>
                      </div>
                      <div className="bh-history-stat-box">
                        <span className="bh-history-stat-label">Bonuses</span>
                        <span className="bh-history-stat-val">{h.bonuses_opened || 0}/{h.bonus_count || 0}</span>
                      </div>
                      {h.best_slot_name && (
                        <div className="bh-history-stat-box bh-history-stat-box--wide">
                          <span className="bh-history-stat-label">🏆 Best Slot</span>
                          <span className="bh-history-stat-val">{h.best_slot_name}</span>
                        </div>
                      )}
                    </div>

                    {/* Bonus list preview (collapsed by default in details) */}
                    {Array.isArray(h.bonuses) && h.bonuses.length > 0 && (
                      <div className="bh-history-bonus-preview">
                        <span className="bh-history-bonus-preview-label">
                          {h.bonuses.length} bonus{h.bonuses.length !== 1 ? 'es' : ''} in this hunt
                        </span>
                        <div className="bh-history-bonus-chips">
                          {h.bonuses.slice(0, 12).map((b, i) => (
                            <span key={i} className={`bh-history-bonus-chip ${b.opened ? 'bh-history-chip--opened' : ''} ${b.isSuperBonus ? 'bh-history-chip--super' : ''}`}>
                              {b.slotName || b.slot?.name || '?'}
                              {b.opened && <em> {((Number(b.payout) || 0) / (Number(b.betSize) || 1)).toFixed(1)}x</em>}
                            </span>
                          ))}
                          {h.bonuses.length > 12 && (
                            <span className="bh-history-bonus-chip bh-history-chip--more">+{h.bonuses.length - 12} more</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="bh-history-actions">
                      <button className="oc-btn oc-btn--sm oc-btn--primary" onClick={() => handleLoad(h)}>
                        📥 Load to Overlay
                      </button>
                      {confirmDelete === h.id ? (
                        <div className="bh-history-confirm-row">
                          <span className="bh-history-confirm-text">Delete?</span>
                          <button className="oc-btn oc-btn--sm oc-btn--danger" onClick={() => handleDelete(h.id)}>Yes</button>
                          <button className="oc-btn oc-btn--sm" onClick={() => setConfirmDelete(null)}>No</button>
                        </div>
                      ) : (
                        <button className="oc-btn oc-btn--sm oc-btn--danger" onClick={() => setConfirmDelete(h.id)}>
                          🗑️ Delete
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Sub-components ─── */
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
