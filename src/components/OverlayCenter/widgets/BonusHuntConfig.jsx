import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getAllSlots, DEFAULT_SLOT_IMAGE, sortSlotsByProviderPriority } from '../../../utils/slotUtils';
import { getMySubmissions, submitSlot } from '../../../services/pendingSlotService';
import ColorPicker from './shared/ColorPicker';
import { supabase } from '../../../config/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { getBonusHuntHistory, saveBonusHuntToHistory, deleteBonusHuntHistory } from '../../../services/overlayService';
import { updateSlotRecordsFromHunt } from '../../../services/slotRecordService';
import TabBar from './shared/TabBar';
import { makePerStyleSetters } from './shared/perStyleConfig';
import { BONUS_HUNT_STYLE_KEYS } from './styleKeysRegistry';

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
  const currentStyle = c.displayStyle || 'v1';
  const { set, setMulti } = makePerStyleSetters(onChange, c, currentStyle, BONUS_HUNT_STYLE_KEYS);

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
    'slotImageHeight', 'listMaxHeight', 'flipBackImage',
    'flipShowProvider', 'flipShowRTP', 'flipShowPotential', 'flipShowVolatility', 'flipShowBetSize', 'flipShowWin',
    'flipBackColor1', 'flipBackColor2', 'flipBackBorder',
    'brightness', 'contrast', 'saturation',
    'displayStyle',
    'v8CardWidth', 'v8CardHeight', 'v8FontSize', 'v8AutoSpeed', 'v8ShowStats', 'v8ShowProgress',
    'v8CardSpacing', 'v8CardRadius', 'v8StatsFontSize', 'v8NameFontSize',
    'v9CardWidth', 'v9CardHeight', 'v9FontSize', 'v9AutoSpeed', 'v9ShowStats', 'v9ShowProgress',
    'v9CardSpacing', 'v9CardRadius', 'v9StatsFontSize', 'v9TitleFontSize', 'v9ContainerRadius',
    'v9ContainerBg', 'v9ShowHeader',
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
        <label className="oc-config-field">
          <span>Currency</span>
          <select value={c.currency || '€'} onChange={e => set('currency', e.target.value)} style={{ width: 80 }}>
            <option value="€">€ EUR</option>
            <option value="$">$ USD</option>
            <option value="£">£ GBP</option>
            <option value="R$">R$ BRL</option>
            <option value="kr">kr SEK/NOK</option>
            <option value="¥">¥ JPY/CNY</option>
            <option value="₹">₹ INR</option>
            <option value="₿">₿ BTC</option>
            <option value="C$">C$ CAD</option>
            <option value="A$">A$ AUD</option>
            <option value="CHF">CHF</option>
            <option value="PLN">PLN</option>
            <option value="TRY">₺ TRY</option>
          </select>
        </label>
      </div>}

      {/* Tab nav */}
      <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} style={{ marginTop: 8 }} />

      {/* ═══════ CONTENT TAB ═══════ */}
      {activeTab === 'content' && (
        <BonusHuntPanel config={c} onChange={onChange} userId={user?.id} userAvatar={user?.user_metadata?.avatar_url} currency={c.currency || '€'} allWidgets={allWidgets} />
      )}

      {/* ═══════ HISTORY TAB ═══════ */}
      {activeTab === 'history' && (
        <BonusHuntHistoryTab config={c} onChange={onChange} userId={user?.id} currency={c.currency || '€'} />
      )}

      {/* ═══════ STYLE TAB ═══════ */}
      {activeTab === 'style' && (
        <div className="nb-section">
          <p className="oc-config-hint" style={{ marginBottom: 10, fontSize: 11, textAlign: 'center', background: 'rgba(99,102,241,0.08)', padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(99,102,241,0.15)' }}>
            🎨 Settings below are saved <b>per style</b> — each style remembers its own config.
          </p>

          {navbarConfig && (
            <button className="oc-btn oc-btn--sm oc-btn--primary" style={{ marginBottom: 12, width: '100%' }} onClick={syncFromNavbar}>
              🔗 Sync Colors from Navbar
            </button>
          )}

          {/* ── Shared Colors (V1/V3/V5/V6) ── */}
          {['v1','v3','v5_horizontal','v6_compact','v11_fever','v12_classic_sr'].includes(currentStyle) && (<>
            <h4 className="nb-subtitle">Card Colors</h4>
            <div className="nb-color-grid">
              <ColorPicker label="Header BG" value={c.headerColor || '#1e3a8a'} onChange={v => set('headerColor', v)} />
              <ColorPicker label="Header Accent" value={c.headerAccent || '#60a5fa'} onChange={v => set('headerAccent', v)} />
              {currentStyle !== 'v3' && <>
                <ColorPicker label="Count Card BG" value={c.countCardColor || '#1e3a8a'} onChange={v => set('countCardColor', v)} />
                <ColorPicker label="Current Bonus BG" value={c.currentBonusColor || '#166534'} onChange={v => set('currentBonusColor', v)} />
                <ColorPicker label="Current Accent" value={c.currentBonusAccent || '#86efac'} onChange={v => set('currentBonusAccent', v)} />
              </>}
              <ColorPicker label="Slot List BG" value={c.listCardColor || '#581c87'} onChange={v => set('listCardColor', v)} />
              {currentStyle !== 'v3' &&
                <ColorPicker label="Slot List Accent" value={c.listCardAccent || '#d8b4fe'} onChange={v => set('listCardAccent', v)} />
              }
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

            {/* Dimensions — only for styles that use them */}
            {['v1','v5_horizontal','v6_compact','v11_fever','v12_classic_sr'].includes(currentStyle) && (<>
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
            </>)}

            {/* V3 only — widgetWidth + cardRadius + slotImageHeight */}
            {currentStyle === 'v3' && (<>
              <h4 className="nb-subtitle">Dimensions</h4>
              <SliderField label="Widget Width" value={c.widgetWidth ?? 420} min={200} max={800} step={10} unit="px"
                onChange={v => set('widgetWidth', v)} />
              <SliderField label="Card Radius" value={c.cardRadius ?? 16} min={0} max={32} step={1} unit="px"
                onChange={v => set('cardRadius', v)} />
              <SliderField label="Slot Image Height" value={c.slotImageHeight ?? 220} min={80} max={400} step={10} unit="px"
                onChange={v => set('slotImageHeight', v)} />
            </>)}
          </>)}

          {/* ── V12 Classic + Requests settings ── */}
          {currentStyle === 'v12_classic_sr' && (<>
            <h4 className="nb-subtitle">🎰 Slot Requests</h4>
            <label className="nb-field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={c.showSlotRequests !== false}
                onChange={e => set('showSlotRequests', e.target.checked)} />
              <span>Show Slot Requests Panel</span>
            </label>
            {c.showSlotRequests !== false && (<>
              <label className="nb-field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={c.srChatEnabled !== false}
                  onChange={e => set('srChatEnabled', e.target.checked)} />
                <span>Listen to Chat for !sr Commands</span>
              </label>
              <label className="nb-field">
                <span>Twitch Channel</span>
                <input type="text" value={c.twitchChannel || ''} placeholder="your_channel"
                  onChange={e => set('twitchChannel', e.target.value)} />
              </label>
              <label className="nb-field">
                <span>Command Trigger</span>
                <input type="text" value={c.commandTrigger || '!sr'} placeholder="!sr"
                  onChange={e => set('commandTrigger', e.target.value)} />
              </label>
            </>)}
          </>)}

          {/* ── V8 Card Stack ── */}
          {currentStyle === 'v8_card_stack' && (<>
            <h4 className="nb-subtitle">🎴 Card Stack Colors</h4>
            <div className="nb-color-grid">
              <ColorPicker label="Accent" value={c.headerAccent || '#7c3aed'} onChange={v => set('headerAccent', v)} />
              <ColorPicker label="Main Text" value={c.textColor || '#ffffff'} onChange={v => set('textColor', v)} />
              <ColorPicker label="Muted Text" value={c.mutedTextColor || '#94a3b8'} onChange={v => set('mutedTextColor', v)} />
              <ColorPicker label="Payout Color" value={c.totalPayColor || '#eab308'} onChange={v => set('totalPayColor', v)} />
            </div>
            <h4 className="nb-subtitle">Typography</h4>
            <label className="nb-field">
              <span>Font</span>
              <select value={c.fontFamily || "'Inter', sans-serif"} onChange={e => set('fontFamily', e.target.value)}>
                {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </label>
            <h4 className="nb-subtitle">Card Dimensions</h4>
            <SliderField label="Card Width" value={c.v8CardWidth ?? 180} min={100} max={400} step={5} unit="px"
              onChange={v => set('v8CardWidth', v)} />
            <SliderField label="Card Height" value={c.v8CardHeight ?? 260} min={140} max={500} step={5} unit="px"
              onChange={v => set('v8CardHeight', v)} />
            <SliderField label="Card Spacing" value={c.v8CardSpacing ?? 120} min={60} max={250} step={5} unit="px"
              onChange={v => set('v8CardSpacing', v)} />
            <SliderField label="Card Radius" value={c.v8CardRadius ?? 16} min={0} max={40} step={1} unit="px"
              onChange={v => set('v8CardRadius', v)} />
            <SliderField label="Name Font Size" value={c.v8NameFontSize ?? 14} min={8} max={32} step={1} unit="px"
              onChange={v => set('v8NameFontSize', v)} />
            <SliderField label="Stats Font Size" value={c.v8StatsFontSize ?? 13} min={8} max={28} step={1} unit="px"
              onChange={v => set('v8StatsFontSize', v)} />
            <SliderField label="Auto-Cycle Speed" value={c.v8AutoSpeed ?? 4000} min={1000} max={12000} step={500} unit="ms"
              onChange={v => set('v8AutoSpeed', v)} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', marginTop: 8 }}>
              <input type="checkbox" checked={c.v8ShowStats !== false} onChange={e => set('v8ShowStats', e.target.checked)} />
              Show Stats Bar
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', marginTop: 2 }}>
              <input type="checkbox" checked={c.v8ShowProgress !== false} onChange={e => set('v8ShowProgress', e.target.checked)} />
              Show Progress Bar
            </label>
          </>)}

          {/* ── V9 Hunt Board ── */}
          {currentStyle === 'v9_hunt_board' && (<>
            <h4 className="nb-subtitle">🎯 Hunt Board Colors</h4>
            <div className="nb-color-grid">
              <ColorPicker label="Accent" value={c.headerAccent || '#e844d0'} onChange={v => set('headerAccent', v)} />
              <ColorPicker label="Main Text" value={c.textColor || '#ffffff'} onChange={v => set('textColor', v)} />
              <ColorPicker label="Muted Text" value={c.mutedTextColor || '#94a3b8'} onChange={v => set('mutedTextColor', v)} />
              <ColorPicker label="Payout Color" value={c.totalPayColor || '#eab308'} onChange={v => set('totalPayColor', v)} />
              <ColorPicker label="Container BG" value={c.v9ContainerBg || 'rgba(15,23,42,0.85)'} onChange={v => set('v9ContainerBg', v)} />
            </div>
            <h4 className="nb-subtitle">Typography</h4>
            <label className="nb-field">
              <span>Font</span>
              <select value={c.fontFamily || "'Inter', sans-serif"} onChange={e => set('fontFamily', e.target.value)}>
                {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </label>
            <h4 className="nb-subtitle">Card Dimensions</h4>
            <SliderField label="Card Width" value={c.v9CardWidth ?? 160} min={100} max={400} step={5} unit="px"
              onChange={v => set('v9CardWidth', v)} />
            <SliderField label="Card Height" value={c.v9CardHeight ?? 230} min={140} max={500} step={5} unit="px"
              onChange={v => set('v9CardHeight', v)} />
            <SliderField label="Card Spacing" value={c.v9CardSpacing ?? 110} min={60} max={250} step={5} unit="px"
              onChange={v => set('v9CardSpacing', v)} />
            <SliderField label="Card Radius" value={c.v9CardRadius ?? 14} min={0} max={40} step={1} unit="px"
              onChange={v => set('v9CardRadius', v)} />
            <SliderField label="Container Radius" value={c.v9ContainerRadius ?? 18} min={0} max={40} step={1} unit="px"
              onChange={v => set('v9ContainerRadius', v)} />
            <SliderField label="Title Font Size" value={c.v9TitleFontSize ?? 18} min={10} max={36} step={1} unit="px"
              onChange={v => set('v9TitleFontSize', v)} />
            <SliderField label="Stats Font Size" value={c.v9StatsFontSize ?? 13} min={8} max={28} step={1} unit="px"
              onChange={v => set('v9StatsFontSize', v)} />
            <SliderField label="Auto-Cycle Speed" value={c.v9AutoSpeed ?? 4000} min={1000} max={12000} step={500} unit="ms"
              onChange={v => set('v9AutoSpeed', v)} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', marginTop: 8 }}>
              <input type="checkbox" checked={c.v9ShowHeader !== false} onChange={e => set('v9ShowHeader', e.target.checked)} />
              Show Header
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', marginTop: 2 }}>
              <input type="checkbox" checked={c.v9ShowStats !== false} onChange={e => set('v9ShowStats', e.target.checked)} />
              Show Stats Grid
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', marginTop: 2 }}>
              <input type="checkbox" checked={c.v9ShowProgress !== false} onChange={e => set('v9ShowProgress', e.target.checked)} />
              Show Progress Bar
            </label>
          </>)}

          {/* ── V3 Flip Card Back (only for Flip Card style) ── */}
          {currentStyle === 'v3' && (<>
            <h4 className="nb-subtitle" style={{ marginTop: 18 }}>Flip Card Back Colors</h4>
            <p className="oc-config-hint" style={{ marginBottom: 6, fontSize: 11 }}>Background gradient and border for the back face of the 3D flip card.</p>
            <div className="nb-color-grid">
              <ColorPicker label="Back BG Start" value={c.flipBackColor1 || '#0f172a'} onChange={v => set('flipBackColor1', v)} />
              <ColorPicker label="Back BG Middle" value={c.flipBackColor2 || '#1a1040'} onChange={v => set('flipBackColor2', v)} />
              <ColorPicker label="Back Border" value={c.flipBackBorder || '#818cf8'} onChange={v => set('flipBackBorder', v)} />
            </div>

            <h4 className="nb-subtitle" style={{ marginTop: 18 }}>Flip Card Back Image</h4>
            <p className="oc-config-hint" style={{ marginBottom: 6, fontSize: 11 }}>Image URL for the back face of the 3D flip card. Default: /badges/back.png</p>
            <input
              className="oc-widget-css-input"
              value={c.flipBackImage || '/badges/back.png'}
              onChange={e => set('flipBackImage', e.target.value)}
              placeholder="/badges/back.png"
              style={{ width: '100%', padding: '6px 8px', marginBottom: 8, fontSize: 12 }}
            />

            <h4 className="nb-subtitle" style={{ marginTop: 18 }}>Flip Card Back — Visible Stats</h4>
            <p className="oc-config-hint" style={{ marginBottom: 6, fontSize: 11 }}>Choose which stats appear on the back face.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              {[
                ['flipShowProvider', 'Provider Logo'],
                ['flipShowRTP', 'RTP'],
                ['flipShowPotential', 'Max Win (Potential)'],
                ['flipShowVolatility', 'Volatility'],
                ['flipShowBetSize', 'Bet Size'],
                ['flipShowWin', 'Win Result'],
              ].map(([key, label]) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                  <input type="checkbox" checked={c[key] !== false} onChange={e => set(key, e.target.checked)} />
                  {label}
                </label>
              ))}
            </div>
          </>)}

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
function BonusHuntPanel({ config, onChange, userId, userAvatar, currency: panelCurrency, allWidgets }) {
  const c = config || {};
  const [startMoney, setStartMoney] = useState(c.startMoney || '');
  const [targetMoney, setTargetMoney] = useState(c.targetMoney || '');
  const [stopLoss, setStopLoss] = useState(c.stopLoss || '');
  const [huntNumber, setHuntNumber] = useState(c.huntNumber || '');
  const [casinoName, setCasinoName] = useState(c.casinoName || '');
  const [betSize, setBetSize] = useState('');
  const [slotSearch, setSlotSearch] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [isSuperBonus, setIsSuperBonus] = useState(false);
  const [isExtremeBonus, setIsExtremeBonus] = useState(false);
  const [showStatistics, setShowStatistics] = useState(c.showStatistics ?? true);
  const [animatedTracker, setAnimatedTracker] = useState(c.animatedTracker ?? true);
  const [bonusList, setBonusList] = useState(c.bonuses || []);
  const [sortBy, setSortBy] = useState(c.sortBy || 'default');
  const [sortDir, setSortDir] = useState(c.sortDir || 'asc');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [slots, setSlots] = useState([]);
  const slotsRef = useRef([]);
  useEffect(() => { slotsRef.current = slots; }, [slots]);
  const [bonusOpening, setBonusOpening] = useState(c.bonusOpening ?? false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editBet, setEditBet] = useState('');
  const [editBonusType, setEditBonusType] = useState('none');
  const [dragIdx, setDragIdx] = useState(null);
  const searchRef = useRef(null);

  // Submit slot state — restore from localStorage cache
  const [showSubmitSlot, setShowSubmitSlot] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bh_submitOpen')) || false; } catch { return false; }
  });
  const [submitForm, setSubmitForm] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bh_submitForm')) || {}; } catch { return {}; }
  });
  const [submitSaving, setSubmitSaving] = useState(false);
  const [submitImageResults, setSubmitImageResults] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bh_submitImages')) || []; } catch { return []; }
  });
  const [submitImageSearching, setSubmitImageSearching] = useState(false);
  const [imageShowCount, setImageShowCount] = useState(10);

  // Slot requests queue
  const [slotRequests, setSlotRequests] = useState([]);
  const [prettyImage, setPrettyImage] = useState(false);

  // Persist submit slot state to localStorage
  useEffect(() => { localStorage.setItem('bh_submitForm', JSON.stringify(submitForm)); }, [submitForm]);
  useEffect(() => { localStorage.setItem('bh_submitOpen', JSON.stringify(showSubmitSlot)); }, [showSubmitSlot]);
  useEffect(() => { localStorage.setItem('bh_submitImages', JSON.stringify(submitImageResults)); }, [submitImageResults]);

  const setField = (k, v) => setSubmitForm(p => ({ ...p, [k]: v }));

  const searchSlotImages = async (nameOverride, providerOverride) => {
    const n = nameOverride || submitForm.name || '';
    const p = providerOverride || submitForm.provider || '';
    const q = `${n} ${p} slot${prettyImage ? '' : ' stake'}`.trim();
    if (!q || q === 'slot') return;
    setSubmitImageSearching(true);
    setSubmitImageResults([]);
    setImageShowCount(10);
    try {
      const res = await fetch(`/api/image-search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (res.ok && data.images?.length) setSubmitImageResults(data.images);
    } catch { /* noop */ }
    setSubmitImageSearching(false);
  };

  // Auto-fetch images when name + provider are both filled
  const autoFetchRef = useRef('');
  useEffect(() => {
    const n = (submitForm.name || '').trim();
    const p = (submitForm.provider || '').trim();
    if (!n || !p || !showSubmitSlot) return;
    const key = `${n}|${p}|${prettyImage}`;
    if (key === autoFetchRef.current) return;
    autoFetchRef.current = key;
    const timer = setTimeout(() => searchSlotImages(n, p), 400);
    return () => clearTimeout(timer);
  }, [submitForm.name, submitForm.provider, showSubmitSlot, prettyImage]);

  // Auto-fetch slot info from demoslot.com when name is filled
  const slotInfoFetchRef = useRef('');
  const [slotInfoLoading, setSlotInfoLoading] = useState(false);
  const [scrapedImages, setScrapedImages] = useState([]); // images from demoslot + slotark
  useEffect(() => {
    const n = (submitForm.name || '').trim();
    if (!n || n.length < 3 || !showSubmitSlot) return;
    if (n === slotInfoFetchRef.current) return;
    slotInfoFetchRef.current = n;
    const timer = setTimeout(async () => {
      setSlotInfoLoading(true);
      try {
        const res = await fetch(`/api/fetch-slot-info?name=${encodeURIComponent(n)}`);
        if (res.ok) {
          const { info } = await res.json();
          if (info) {
            // Store all scraped images (demoslot + slotark)
            setScrapedImages(info.images || (info.image ? [info.image] : []));
            setSubmitForm(prev => ({
              ...prev,
              ...(info.provider && !prev.provider ? { provider: info.provider } : {}),
              ...(info.rtp && !prev.rtp ? { rtp: String(info.rtp) } : {}),
              ...(info.volatility && !prev.volatility ? { volatility: info.volatility } : {}),
              ...(info.max_win_multiplier && !prev.max_win_multiplier ? { max_win_multiplier: String(info.max_win_multiplier) } : {}),
              ...(info.image && !prev.image ? { image: info.image } : {}),
            }));
          } else {
            setScrapedImages([]);
          }
        } else {
          setScrapedImages([]);
        }
      } catch { setScrapedImages([]); }
      setSlotInfoLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [submitForm.name, showSubmitSlot]);

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
  const autoSaveTimerRef = useRef(null);
  const autoSaveFiredRef = useRef(false);

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

  // Best-match: normalize, then pick the slot with the longest matching name
  function bestSlotMatch(slotList, queryName) {
    const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const q = norm(queryName);
    if (!q) return null;
    // Exact normalized match first
    const exact = slotList.find(s => s.name && norm(s.name) === q);
    if (exact) return exact;
    // Fuzzy: collect all slots whose normalized name is contained in query or vice-versa
    const candidates = slotList.filter(s => {
      if (!s.name) return false;
      const n = norm(s.name);
      return n.length >= 3 && (q.includes(n) || n.includes(q));
    });
    if (!candidates.length) return null;
    // Pick the one with the longest name (most specific)
    return candidates.reduce((best, c) => (c.name.length > best.name.length ? c : best), candidates[0]);
  }

  /* ─── Auto-Tracker: listen for browser extension slot detections ─── */
  const [autoTrackEnabled, setAutoTrackEnabled] = useState(c.autoTrackEnabled ?? false);
  const [lastDetected, setLastDetected] = useState(null);

  useEffect(() => {
    if (!userId || !autoTrackEnabled) return;

    const channel = supabase
      .channel(`detected_slots:${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'detected_slots',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        const detected = payload.new;
        if (!detected?.slot_name) return;

        // Only process entries targeting bonus_hunt
        const detectedTarget = detected.target || '';
        const detectedName = detected.slot_name.toLowerCase().trim();
        setLastDetected(detected.slot_name);

        if (bonusOpening) {
          // During opening: find matching unopened bonus and highlight it
          setBonusList(prev => {
            const matchIdx = prev.findIndex(b =>
              !b.opened &&
              !(Number(b.payout) > 0) &&
              ((b.slotName || b.slot?.name || '').toLowerCase().trim().includes(detectedName) ||
              detectedName.includes((b.slotName || b.slot?.name || '').toLowerCase().trim()))
            );

            if (matchIdx === -1) return prev;

            const updated = prev.map((b, i) => {
              if (i === matchIdx) return b;
              return b;
            });
            return updated;
          });
        } else if (detectedTarget === 'bonus_hunt' && detected.bet_size > 0) {
          // BH target with bet: auto-add directly to the bonus list
          const currentSlots = slotsRef.current;
          const matchSlot = bestSlotMatch(currentSlots, detected.slot_name);

          const newBonus = {
            id: Date.now(),
            slot: matchSlot || { name: detected.slot_name, provider: detected.provider || '' },
            slotName: matchSlot?.name || detected.slot_name,
            betSize: Number(detected.bet_size),
            isSuperBonus: !!detected.is_super_bonus,
            isExtremeBonus: !!detected.is_extreme_bonus,
            opened: false,
            result: 0,
            payout: 0,
          };

          setBonusList(prev => {
            const updated = [...prev, newBonus];
            // Save immediately (use setTimeout to avoid state race)
            setTimeout(() => save(updated), 0);
            return updated;
          });
        } else {
          // Non-BH target or no bet: auto-fill the search input + bet size
          const currentSlots = slotsRef.current;
          const matchSlot = bestSlotMatch(currentSlots, detected.slot_name);
          if (matchSlot) {
            setSelectedSlot(matchSlot);
            setSlotSearch(matchSlot.name);
          } else {
            setSelectedSlot(null);
            setSlotSearch(detected.slot_name);
          }
          if (detected.bet_size != null && detected.bet_size > 0) {
            setBetSize(String(detected.bet_size));
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, autoTrackEnabled, bonusOpening]);

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
      casinoName: casinoName,
      showStatistics, animatedTracker, bonusOpening, autoTrackEnabled,
      sortBy, sortDir,
      bonuses: list,
      huntActive: config?.huntActive ?? false,
      ...extras,
    });
  }, [config, onChange, startMoney, targetMoney, stopLoss, huntNumber, casinoName, showStatistics, animatedTracker, bonusOpening, autoTrackEnabled, sortBy, sortDir, bonusList]);

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
    setEditBonusType(bonus.isExtremeBonus ? 'extreme' : bonus.isSuperBonus ? 'super' : 'none');
  };

  const handleSaveEdit = (bonusId) => {
    const updated = bonusList.map(b =>
      b.id === bonusId ? { ...b, slotName: editName, betSize: Number(editBet) || b.betSize, isSuperBonus: editBonusType === 'super', isExtremeBonus: editBonusType === 'extreme' } : b
    );
    setBonusList(updated);
    save(updated);
    setEditingId(null);
  };

  const handleCancelEdit = () => setEditingId(null);

  const handleDragDrop = (fromIdx, toIdx) => {
    if (fromIdx === toIdx) return;
    const updated = [...bonusList];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    setBonusList(updated);
    save(updated);
  };

  const handlePayoutChange = (bonusId, rawInput) => {
    const digits = rawInput.replace(/\D/g, '').replace(/^0+/, '') || '0';
    const cents = parseInt(digits, 10);
    const payout = cents / 100;
    const updated = bonusList.map(b =>
      b.id === bonusId ? { ...b, opened: payout > 0, payout, result: payout } : b
    );
    setBonusList(updated);
    save(updated);

    // Auto-save: if all bonuses now have a payout > 0, save the hunt after 3s
    if (bonusOpening && updated.length > 0 && updated.every(b => b.opened && Number(b.payout) > 0)) {
      if (!autoSaveFiredRef.current) {
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        setSaveHuntMsg('✅ All bonuses paid — auto-saving in 3s…');
        autoSaveTimerRef.current = setTimeout(() => {
          autoSaveFiredRef.current = true;
          handleSaveAndClose();
        }, 3000);
      }
    } else {
      // If user clears a payout, cancel the pending auto-save
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
        setSaveHuntMsg('');
      }
      autoSaveFiredRef.current = false;
    }
  };
  const formatPayoutDisplay = (val) => {
    if (!val && val !== 0) return '';
    const n = Number(val);
    if (n === 0) return '';
    return n.toFixed(2);
  };

  // SHA-256 hash helper (must match admin panel)
  // Save hunt to library & start new
  const handleSaveAndClose = async () => {
    if (!userId) { setSaveHuntMsg('⚠️ Not logged in'); return; }
    if (bonusList.length === 0) { setSaveHuntMsg('⚠️ No bonuses to save'); return; }
    const parts = [casinoName.trim(), huntNumber ? `Hunt #${huntNumber}` : '', new Date().toLocaleDateString()].filter(Boolean);
    const name = saveHuntName.trim() || parts.join(' / ') || `Hunt ${new Date().toLocaleDateString()}`;
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
      setCasinoName('');
      setBonusOpening(false);
      setSaveHuntName('');
      setShowSaveConfirm(false);
      // Reset auto-save state for next hunt
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
      autoSaveFiredRef.current = false;
      onChange({
        ...config,
        bonuses: [],
        startMoney: 0,
        targetMoney: 0,
        stopLoss: 0,
        casinoName: '',
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

  // Reset hunt without saving — start fresh
  const handleResetHunt = () => {
    setBonusList([]);
    setStartMoney('');
    setTargetMoney('');
    setStopLoss('');
    setHuntNumber('');
    setCasinoName('');
    setBonusOpening(false);
    setSaveHuntName('');
    setShowSaveConfirm(false);
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = null;
    autoSaveFiredRef.current = false;
    onChange({
      ...config,
      bonuses: [],
      startMoney: 0,
      targetMoney: 0,
      stopLoss: 0,
      casinoName: '',
      huntNumber: '',
      bonusOpening: false,
      huntActive: false,
    });
    setSaveHuntMsg('🔄 Hunt reset. Ready for a new hunt!');
    setTimeout(() => setSaveHuntMsg(''), 3000);
  };

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const currency = config?.currency || '€';

  // Fetch slot requests
  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const { data } = await supabase
        .from('slot_requests')
        .select('id, slot_name, slot_image, requested_by, created_at')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      if (data) setSlotRequests(data);
    };
    load();
    const chan = supabase.channel('bh-sr-' + userId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'slot_requests', filter: `user_id=eq.${userId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(chan); };
  }, [userId]);

  const handlePickRequest = (req) => {
    const match = slots.find(s => s.name.toLowerCase() === req.slot_name.toLowerCase());
    if (match) {
      setSelectedSlot(match);
      setSlotSearch(match.name);
    } else {
      setSelectedSlot(null);
      setSlotSearch(req.slot_name);
    }
  };

  const handleDismissRequest = async (id) => {
    await supabase.from('slot_requests').update({ status: 'dismissed' }).eq('id', id);
    setSlotRequests(prev => prev.filter(r => r.id !== id));
  };

  const srWidget = allWidgets?.find(w => w.widget_type === 'slot_requests');
  const srConfig = srWidget?.config || {};
  const srSeEnabled = srConfig.srSeEnabled;

  const handleRejectRequest = async (id) => {
    try {
      await fetch(`${window.location.origin}/api/chat-commands?cmd=sr-reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: id,
          user_id: userId,
          message_template: srConfig.srMsgRejected || undefined,
        }),
      });
      setSlotRequests(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error('[bh-reject] error:', err);
    }
  };

  const handleClearAllRequests = async () => {
    if (!userId || slotRequests.length === 0) return;
    const ids = slotRequests.map(r => r.id);
    await supabase.from('slot_requests').update({ status: 'dismissed' }).in('id', ids);
    setSlotRequests([]);
  };

  const handleAddToBH = (req) => {
    const match = slots.find(s => s.name.toLowerCase() === req.slot_name.toLowerCase());
    if (match) {
      setSelectedSlot(match);
      setSlotSearch(match.name);
    } else {
      setSelectedSlot(null);
      setSlotSearch(req.slot_name);
    }
    handleDismissRequest(req.id);
  };

  return (
    <div className="bh-panel">

      {/* ─── Hunt Settings ─── */}
      <div className="bh-panel-section">
        {/* Casino name (optional) */}
        <div className="bh-settings-row" style={{ marginBottom: 8 }}>
          <label className="bh-input-group" style={{ flex: 1 }}>
            <span>🏛️ Casino (optional)</span>
            <input type="text" value={casinoName}
              placeholder="e.g. Stake, Gamdom, Roobet…"
              onChange={e => setCasinoName(e.target.value)}
              onBlur={() => save()} />
          </label>
        </div>
        <div className="bh-hunt-split">
          {/* Left half: Hunt Settings */}
          <div className="bh-hunt-split-left">
            <h4 className="bh-panel-label">Hunt Settings</h4>
            <div className="bh-settings-row">
              <label className="bh-input-group bh-input-sm">
                <span>Hunt #</span>
                <input type="text" value={huntNumber}
                  placeholder="42"
                  onChange={e => setHuntNumber(e.target.value)}
                  onBlur={() => save()} />
              </label>
              <label className="bh-input-group bh-input-md">
                <span>Start ({currency})</span>
                <input type="number" value={startMoney}
                  placeholder="0"
                  onChange={e => setStartMoney(e.target.value)}
                  onBlur={() => save()} />
              </label>
              <label className="bh-input-group bh-input-md">
                <span>Stop Loss ({currency})</span>
                <input type="number" value={stopLoss}
                  placeholder="0"
                  onChange={e => setStopLoss(e.target.value)}
                  onBlur={() => save()} />
              </label>
            </div>
          </div>

          {/* Right half: Slot Requests queue */}
          <div className="bh-hunt-split-right">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span className="bh-sr-queue-title">🎰 Requests <span className="bh-sr-queue-count">{slotRequests.length}</span></span>
              {slotRequests.length > 0 && (
                <button className="bh-sr-queue-btn" onClick={handleClearAllRequests}
                  style={{ fontSize: 10, padding: '2px 8px', background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 4, cursor: 'pointer' }}
                  title="Clear all requests">🗑️ Clear All</button>
              )}
            </div>
            {slotRequests.length > 0 ? (
              <div className="bh-sr-queue-list">
                {slotRequests.map(req => (
                  <div key={req.id} className="bh-sr-queue-item" onClick={() => handlePickRequest(req)} title={`Click to search "${req.slot_name}"`}>
                    {req.slot_image && <img src={req.slot_image} alt="" className="bh-sr-queue-img" onError={e => { e.target.style.display = 'none'; }} />}
                    <div className="bh-sr-queue-info">
                      <span className="bh-sr-queue-name">{req.slot_name}</span>
                      <span className="bh-sr-queue-by">by {req.requested_by}</span>
                    </div>
                    <div className="bh-sr-queue-actions" style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                      <button className="bh-sr-queue-btn" onClick={e => { e.stopPropagation(); handleAddToBH(req); }} title="Add to Bonus Hunt"
                        style={{ fontSize: 10, padding: '3px 8px', background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 4, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>+ Add to BH</button>
                      {srSeEnabled && <button className="bh-sr-queue-btn bh-sr-queue-btn--reject" onClick={e => { e.stopPropagation(); handleRejectRequest(req.id); }} title="Reject &amp; refund points" style={{ fontSize: 10, whiteSpace: 'nowrap' }}>Points Back</button>}
                      <button className="bh-sr-queue-btn bh-sr-queue-btn--dismiss" onClick={e => { e.stopPropagation(); handleDismissRequest(req.id); }} title="Dismiss" style={{ fontSize: 16, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bh-sr-queue-empty">No requests yet</div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Add Bonus ─── */}
      <div className="bh-panel-section">
        <h4 className="bh-panel-label" style={{ margin: '0 0 4px 0' }}>Add Bonus</h4>

        {/* Row 1: Search */}
        <div className="bh-add-row">
          <div className="bh-search-container bh-search-half" ref={searchRef}>
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
                  <div className="bh-suggestion-empty bh-suggestion-submit"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => {
                      setField('name', slotSearch.trim());
                      setShowSubmitSlot(true);
                      setShowSuggestions(false);
                    }}>
                    {slots.length === 0 ? 'Loading slots...' : (
                      <>
                        <span className="bh-notfound-label">"{slotSearch.trim()}" isn't in the database yet</span>
                        <span className="bh-submit-cta">
                          <span className="bh-submit-cta-icon">&#x2b;</span>
                          Click here to add it
                        </span>
                        <span className="bh-submit-hint">👆 Press to open the submit form</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Bet */}
        <div className="bh-add-row">
          <input type="number" className="bh-bet-field" value={betSize}
            onChange={e => setBetSize(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddBonus(); } }}
            placeholder={`Bet (${currency})`} step="0.1" />
          {showSubmitSlot && (
            <button
              className="bh-submit-slot-btn active"
              onClick={() => setShowSubmitSlot(false)}
            >✕ Close</button>
          )}
        </div>

        {/* Row 3: Add + Super + Extreme */}
        <div className="bh-add-row">
          <button className="bh-add-btn" onClick={handleAddBonus} disabled={!selectedSlot || !betSize}>
            + Add
          </button>
          <button
            type="button"
            className={`bh-super-btn${isSuperBonus ? ' active' : ''}`}
            title="Super Bonus (double-click to add)"
            disabled={!betSize}
            onClick={() => { setIsSuperBonus(p => !p); if (!isSuperBonus) setIsExtremeBonus(false); }}
            onDoubleClick={() => { if (!betSize || !selectedSlot) return; setIsSuperBonus(true); setIsExtremeBonus(false); setTimeout(() => handleAddBonus(), 0); }}
          >Super</button>
          <button
            type="button"
            className={`bh-extreme-btn${isExtremeBonus ? ' active' : ''}`}
            title="Extreme Bonus (double-click to add)"
            disabled={!betSize}
            onClick={() => { setIsExtremeBonus(p => !p); if (!isExtremeBonus) setIsSuperBonus(false); }}
            onDoubleClick={() => { if (!betSize || !selectedSlot) return; setIsExtremeBonus(true); setIsSuperBonus(false); setTimeout(() => handleAddBonus(), 0); }}
          >Extreme</button>
        </div>

        {/* Row 4: Submit Slot Form */}
        {showSubmitSlot && (
          <div className="bh-submit-dropdown">
            <div className="bh-submit-grid">
              <label className="bh-submit-field">
                <span>Name <em>*</em>{slotInfoLoading && ' ⏳'}</span>
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
            {(submitImageResults.length > 0 || submitForm.image || scrapedImages.length > 0) && (<>
              <div className="bh-submit-images">
                {submitForm.image && (
                  <img src={submitForm.image} alt="" className="bh-submit-preview" onError={e => (e.target.src = DEFAULT_SLOT_IMAGE)} />
                )}
                {scrapedImages.map((imgUrl, i) => {
                  const src = imgUrl.includes('slotslaunch') ? 'SlotsLaunch' : imgUrl.includes('slotark') ? 'SlotArk' : 'DemoSlot';
                  return (
                  <button key={`scraped-${i}`} type="button"
                    className={`bh-submit-img-btn bh-demoslot-img${submitForm.image === imgUrl ? ' selected' : ''}`}
                    onClick={() => setField('image', imgUrl)}
                    title={`Image from ${src}`}>
                    <img src={imgUrl} alt="" />
                    <span className="bh-demoslot-badge">{src}</span>
                  </button>
                  );
                })}
                {submitImageResults.slice(0, imageShowCount).map((img, i) => (
                  <button key={i} type="button" className={`bh-submit-img-btn${submitForm.image === img.url ? ' selected' : ''}`}
                    onClick={() => setField('image', img.url)}>
                    <img src={img.url} alt="" />
                  </button>
                ))}
                {submitImageResults.length > imageShowCount && (
                  <button type="button" className="bh-show-more-btn"
                    onClick={() => setImageShowCount(c => c + 10)}>
                    Show more
                  </button>
                )}
              </div>
              <div className="bh-image-toolbar">
                <button type="button" className={`bh-pretty-toggle${prettyImage ? ' active' : ''}`}
                  onClick={() => setPrettyImage(p => !p)}>
                  {prettyImage ? '✨ Pretty Image: ON' : '✨ Pretty Image: OFF'}
                </button>
              </div>
            </>)}
            <div className="bh-submit-actions">
              <button className="bh-submit-cancel" onClick={() => { setShowSubmitSlot(false); setSubmitForm({}); setSubmitImageResults([]); setScrapedImages([]); slotInfoFetchRef.current = ''; setImageShowCount(10); setPrettyImage(false); }}>Cancel</button>
              <button className="bh-submit-save" onClick={handleSlotSubmit} disabled={submitSaving}>
                {submitSaving ? 'Submitting…' : '📤 Submit for Approval'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Bonus List ─── */}
      <div className="bh-panel-section">
        {/* ── Bonus Opening + Auto-Tracker toggles ── */}
        <div className="bh-toggles-row">
          <label className={`bh-compact-toggle ${bonusOpening ? 'bh-compact-toggle--active' : ''}`}>
            <input type="checkbox" checked={bonusOpening}
              onChange={e => { setBonusOpening(e.target.checked); save(bonusList, { bonusOpening: e.target.checked }); }} />
            <span className="bh-opening-switch" />
            <span className="bh-compact-text">{bonusOpening ? '🎰 Opening' : '🔒 Opening'}</span>
          </label>
          <label className={`bh-compact-toggle ${autoTrackEnabled ? 'bh-compact-toggle--active' : ''}`}>
            <input type="checkbox" checked={autoTrackEnabled}
              onChange={e => { setAutoTrackEnabled(e.target.checked); save(bonusList, { autoTrackEnabled: e.target.checked }); }} />
            <span className="bh-opening-switch" />
            <span className="bh-compact-text">{autoTrackEnabled ? '🔗 Tracker' : '🔗 Tracker'}</span>
          </label>
        </div>

        <h4 className="bh-panel-label">
          Bonuses <span className="bh-count">{bonusList.length}</span>
        </h4>

        {/* Sort controls */}
        {bonusList.length > 1 && (
          <div className="bh-sort-controls">
            <span className="bh-sort-label">Sort by:</span>
            {['default', 'bet', 'provider', 'type'].map(opt => {
              const labels = { default: '📋 Order Added', bet: '💰 Bet', provider: '🏢 Provider', type: '⭐ Type' };
              const isActive = sortBy === opt;
              const showArrow = isActive && opt !== 'default';
              return (
                <button
                  key={opt}
                  className={`bh-sort-btn${isActive ? ' bh-sort-btn--active' : ''}`}
                  onClick={() => {
                    if (isActive && opt !== 'default') {
                      const newDir = sortDir === 'asc' ? 'desc' : 'asc';
                      setSortDir(newDir);
                      save(bonusList, { sortBy: opt, sortDir: newDir });
                    } else {
                      setSortBy(opt);
                      setSortDir('asc');
                      save(bonusList, { sortBy: opt, sortDir: 'asc' });
                    }
                  }}
                >
                  {labels[opt]}{showArrow ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                </button>
              );
            })}
          </div>
        )}

        <div className="bh-list">
          {bonusList.length === 0 ? (
            <p className="bh-list-empty">No bonuses added yet</p>
          ) : (() => {
            const canDrag = sortBy === 'default';
            const sorted = [...bonusList].sort((a, b) => {
              const dir = sortDir === 'desc' ? -1 : 1;
              if (sortBy === 'bet') return ((a.betSize || 0) - (b.betSize || 0)) * dir;
              if (sortBy === 'provider') {
                const pa = (a.slot?.provider || '').toLowerCase();
                const pb = (b.slot?.provider || '').toLowerCase();
                if (pa !== pb) return pa.localeCompare(pb) * dir;
                return (a.slotName || '').localeCompare(b.slotName || '') * dir;
              }
              if (sortBy === 'type') {
                const rank = (x) => x.isExtremeBonus ? 2 : x.isSuperBonus ? 1 : 0;
                return (rank(b) - rank(a)) * dir;
              }
              return 0;
            });
            const firstUnopenedId = bonusOpening ? sorted.find(b => !b.opened && !(Number(b.payout) > 0))?.id : null;
            return sorted.map((bonus, i) => {
              const realIdx = canDrag ? bonusList.indexOf(bonus) : i;
              const needsInput = bonusOpening && bonus.id === firstUnopenedId;
              return (
            <div key={bonus.id}
              className={`bh-list-item ${bonus.opened ? 'bh-list-item--opened' : ''} ${bonus.isSuperBonus ? 'bh-list-item--super' : ''} ${bonus.isExtremeBonus ? 'bh-list-item--extreme' : ''}${dragIdx === realIdx ? ' bh-list-item--dragging' : ''}${needsInput ? ' bh-list-item--needs-input' : ''}`}
              draggable={canDrag}
              onDragStart={e => { if (!canDrag) return; setDragIdx(realIdx); e.dataTransfer.effectAllowed = 'move'; }}
              onDragOver={e => { if (!canDrag || dragIdx === null) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
              onDrop={e => { if (!canDrag || dragIdx === null) return; e.preventDefault(); handleDragDrop(dragIdx, realIdx); setDragIdx(null); }}
              onDragEnd={() => setDragIdx(null)}
            >

              {/* Drag handle + number */}
              <span className={`bh-list-grip${canDrag ? ' bh-list-grip--active' : ''}`} title={canDrag ? 'Drag to reorder' : 'Set sort to Default to reorder'}>⠿</span>
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
                  <select className="bh-list-edit-input bh-list-edit-type" value={editBonusType}
                    onChange={e => setEditBonusType(e.target.value)}>
                    <option value="none">Normal</option>
                    <option value="super">Super</option>
                    <option value="extreme">Extreme</option>
                  </select>
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
                      <input className="bh-list-payout-input" type="text" inputMode="numeric"
                        data-payout-idx={i}
                        value={formatPayoutDisplay(bonus.payout)}
                        placeholder="0.00"
                        onChange={e => handlePayoutChange(bonus.id, e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const next = document.querySelector(`[data-payout-idx="${i + 1}"]`);
                            if (next) next.focus();
                          }
                        }} />
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
              );
            });
          })()}
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
              <div className={`bh-gtb-message ${saveHuntMsg.startsWith('✅') || saveHuntMsg.startsWith('🔄') ? 'bh-gtb-message--success' : 'bh-gtb-message--error'}`}>
                {saveHuntMsg}
              </div>
            )}

            {!showSaveConfirm ? (
              <div className="bh-save-hunt-actions" style={{ gap: 8 }}>
                <button
                  className="bh-save-hunt-btn"
                  onClick={() => setShowSaveConfirm(true)}
                >
                  💾 Save & Close Hunt
                </button>
                {!showResetConfirm ? (
                  <button
                    className="bh-save-hunt-btn"
                    style={{ background: 'linear-gradient(135deg, #991b1b 0%, #dc2626 100%)' }}
                    onClick={() => setShowResetConfirm(true)}
                  >
                    🔄 Reset Hunt
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#fca5a5' }}>Discard without saving?</span>
                    <button className="bh-save-hunt-confirm" style={{ background: '#dc2626', fontSize: 12, padding: '4px 10px' }} onClick={() => { setShowResetConfirm(false); handleResetHunt(); }}>
                      Yes, Reset
                    </button>
                    <button className="bh-save-hunt-cancel" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => setShowResetConfirm(false)}>
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bh-save-hunt-form">
                <input
                  className="bh-gtb-input"
                  value={saveHuntName}
                  onChange={e => setSaveHuntName(e.target.value)}
                  placeholder={[casinoName.trim(), huntNumber ? `Hunt #${huntNumber}` : '', new Date().toLocaleDateString()].filter(Boolean).join(' / ') || `Hunt ${new Date().toLocaleDateString()}`}
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
        stopLoss={stopLoss}
        currency={currency}
        config={c}
      />

    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   FLOATING STATS FAB — draggable, bottom-right default
   ═══════════════════════════════════════════════════════ */
function FloatingStatsFab({ bonusList, startMoney, targetMoney, stopLoss, currency, config }) {
  /* Theme colors from widget config */
  const accentColor = config?.headerAccent || '#7c3aed';
  const bgColor = config?.headerColor || 'rgba(15, 10, 35, 0.65)';
  const textColor = config?.textColor || '#e2e8f0';
  const mutedColor = config?.mutedTextColor || '#94a3b8';

  /* Compute stats */
  const total = bonusList.length;
  const opened = bonusList.filter(b => b.opened);
  const openedCount = opened.length;
  const totalBet = bonusList.reduce((s, b) => s + (Number(b.betSize) || 0), 0);
  const totalPayout = opened.reduce((s, b) => s + (Number(b.payout) || 0), 0);
  const start = Number(startMoney) || 0;
  const sl = Number(stopLoss) || 0;
  const target = sl > 0 ? start - sl : start;
  const profit = totalPayout - target;
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

  const neededToBreakEven = Math.max(0, target - totalPayout);
  const remainingBonuses = total - openedCount;
  const remainingBet = bonusList.filter(b => !b.opened).reduce((s, b) => s + (Number(b.betSize) || 0), 0);
  const liveBE = remainingBet > 0 ? neededToBreakEven / remainingBet : 0;
  const avgNeeded = remainingBonuses > 0 && neededToBreakEven > 0 ? neededToBreakEven / remainingBonuses : 0;

  const fmtV = (v) => `${currency}${v.toFixed(2)}`;

  if (total === 0) return null;

  const profitColor = profit > 0 ? '#4ade80' : profit < 0 ? '#f87171' : '#cbd5e1';

  return (
    <div style={{
      position: 'fixed', top: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 99999,
      background: bgColor,
      backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      border: `1px solid ${accentColor}40`,
      borderRadius: 999,
      boxShadow: `0 4px 24px rgba(0,0,0,0.4), 0 0 12px ${accentColor}1a`,
      padding: '6px 20px',
      display: 'flex', alignItems: 'center', gap: 14,
      fontFamily: config?.fontFamily || "'Inter', sans-serif",
      color: textColor,
      whiteSpace: 'nowrap',
    }}>
      <StatChip label="Bonuses" value={`${openedCount} / ${total}`} mutedColor={mutedColor} />
      <StatChip label="Start" value={fmtV(start)} mutedColor={mutedColor} />
      <StatChip label="Total Bet" value={fmtV(totalBet)} mutedColor={mutedColor} />
      <StatChip label="Payout" value={fmtV(totalPayout)} color={totalPayout > 0 ? '#4ade80' : mutedColor} mutedColor={mutedColor} />
      <StatChip label="Target" value={fmtV(target)} color={accentColor} mutedColor={mutedColor} />
      <StatChip label="Avg x" value={`${avgMulti.toFixed(2)}x`} mutedColor={mutedColor} />
      <StatChip label="BE x" value={`${liveBE.toFixed(2)}x`} color="#fbbf24" mutedColor={mutedColor} />

      {openedCount > 0 && (
        <>
          <div style={{ width: 1, height: 24, background: `${accentColor}4d` }} />
          <StatChip label="🏆 Best" value={`${bestSlot.length > 14 ? bestSlot.slice(0, 14) + '…' : bestSlot} ${bestMulti.toFixed(1)}x`} color="#4ade80" mutedColor={mutedColor} />
          <StatChip label="💀 Worst" value={`${worstSlot.length > 14 ? worstSlot.slice(0, 14) + '…' : worstSlot} ${worstMulti.toFixed(1)}x`} color="#f87171" mutedColor={mutedColor} />
        </>
      )}
    </div>
  );
}

/* Compact stat chip for the top bar */
function StatChip({ label, value, color, mutedColor }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', whiteSpace: 'nowrap' }}>
      <span style={{ fontSize: 10, color: mutedColor || '#94a3b8', fontWeight: 500, lineHeight: 1.2 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: color || '#fff', lineHeight: 1.3 }}>{value}</span>
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
