/**
 * RaidShoutoutConfig.jsx — Admin config panel for the Raid Shoutout Widget.
 *
 * Lets the streamer:
 * - Customize alert appearance (colors, animation, duration)
 * - Manually trigger a shoutout by typing a username
 * - Send a test alert
 * - View recent shoutout history
 * - Configure the webhook URL for StreamElements/Nightbot
 */
import React, { useState, useEffect, useCallback } from 'react';
import { triggerShoutout, triggerTestShoutout, getShoutoutHistory } from '../../../services/shoutoutService';
import { supabase } from '../../../config/supabaseClient';

/* ─── Constants ─── */
const ENTER_ANIMATIONS = [
  { value: 'slideUp',    icon: '⬆️', label: 'Slide Up' },
  { value: 'slideDown',  icon: '⬇️', label: 'Slide Down' },
  { value: 'slideLeft',  icon: '⬅️', label: 'Slide Left' },
  { value: 'slideRight', icon: '➡️', label: 'Slide Right' },
  { value: 'zoomIn',     icon: '🔍', label: 'Zoom In' },
  { value: 'fadeIn',     icon: '🌫️', label: 'Fade' },
];

const EXIT_ANIMATIONS = [
  { value: 'slideDown',  icon: '⬇️', label: 'Slide Down' },
  { value: 'slideUp',    icon: '⬆️', label: 'Slide Up' },
  { value: 'slideLeft',  icon: '⬅️', label: 'Slide Left' },
  { value: 'slideRight', icon: '➡️', label: 'Slide Right' },
  { value: 'zoomOut',    icon: '🔍', label: 'Zoom Out' },
  { value: 'fadeOut',    icon: '🌫️', label: 'Fade' },
];

const FONT_OPTIONS = [
  "'Inter', sans-serif",
  "'Roboto', sans-serif",
  "'Poppins', sans-serif",
  "'Montserrat', sans-serif",
  "'Fira Code', monospace",
  "'Arial', sans-serif",
  "'Georgia', serif",
];

/* ─── Helpers ─── */
function SliderField({ label, value, onChange, min = 0, max = 100, step = 1, suffix = '' }) {
  return (
    <label className="nb-slider-field">
      <span>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(+e.target.value)} />
        <span className="nb-slider-val">{value}{suffix}</span>
      </div>
    </label>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <label className="nb-color-field" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <input type="color" value={value} onChange={e => onChange(e.target.value)} style={{ width: 28, height: 28, border: 'none', borderRadius: 4, cursor: 'pointer' }} />
      <span style={{ fontSize: 12, color: '#cbd5e1' }}>{label}</span>
    </label>
  );
}

/* ─── Main Config Panel ─── */
export default function RaidShoutoutConfig({ config, onChange, allWidgets }) {
  const c = config || {};
  const set = (key, val) => onChange({ ...c, [key]: val });
  const [activeTab, setActiveTab] = useState('trigger');
  const [shoutoutUsername, setShoutoutUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [history, setHistory] = useState([]);
  const [webhookUrl, setWebhookUrl] = useState('');

  // Build webhook URL
  useEffect(() => {
    async function buildUrl() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const base = window.location.origin;
        setWebhookUrl(`${base}/api/raid-shoutout?userId=${session.user.id}&raider=\${user}&triggeredBy=chat_command&secret=YOUR_SECRET`);
      }
    }
    buildUrl();
  }, []);

  // Load history on tab switch
  useEffect(() => {
    if (activeTab !== 'history') return;
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const data = await getShoutoutHistory(session.user.id, 20);
        setHistory(data);
      }
    }
    load();
  }, [activeTab]);

  const handleTrigger = useCallback(async () => {
    if (!shoutoutUsername.trim()) return;
    setLoading(true);
    setMessage(null);
    try {
      const result = await triggerShoutout(shoutoutUsername.trim());
      setMessage({ type: 'success', text: `Shoutout sent for ${result.alert.raider}! ${result.alert.hasClip ? 'Clip found!' : 'No clips available.'}` });
      setShoutoutUsername('');
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }, [shoutoutUsername]);

  const handleTest = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      await triggerTestShoutout();
      setMessage({ type: 'success', text: 'Test shoutout sent! Check your overlay.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  const tabs = [
    { id: 'trigger',  label: '🎯 Trigger' },
    { id: 'style',    label: '🎨 Appearance' },
    { id: 'behavior', label: '⚙️ Behavior' },
    { id: 'webhook',  label: '🔗 Webhook' },
    { id: 'history',  label: '📜 History' },
  ];

  return (
    <div className="bh-config">
      {/* Tab nav */}
      <div className="nb-tabs" style={{ marginTop: 4 }}>
        {tabs.map(t => (
          <button
            key={t.id}
            className={`nb-tab ${activeTab === t.id ? 'nb-tab--active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══════ TRIGGER TAB ═══════ */}
      {activeTab === 'trigger' && (
        <div className="nb-section">
          <h4 className="nb-subtitle">Manual Shoutout</h4>
          <p className="oc-config-hint" style={{ marginBottom: 8 }}>
            Type a Twitch username to trigger a shoutout with a random clip.
          </p>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              type="text"
              placeholder="Twitch username..."
              value={shoutoutUsername}
              onChange={e => setShoutoutUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleTrigger()}
              disabled={loading}
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.06)', color: '#e2e8f0',
                fontSize: 13, outline: 'none',
              }}
            />
            <button
              onClick={handleTrigger}
              disabled={loading || !shoutoutUsername.trim()}
              style={{
                padding: '8px 16px', borderRadius: 8, border: 'none',
                background: '#9146FF', color: '#fff', fontWeight: 600,
                fontSize: 13, cursor: 'pointer', opacity: loading ? 0.5 : 1,
              }}
            >
              {loading ? '...' : '📢 Shoutout'}
            </button>
          </div>

          <button
            onClick={handleTest}
            disabled={loading}
            style={{
              width: '100%', padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.06)', color: '#94a3b8',
              fontSize: 12, cursor: 'pointer',
            }}
          >
            🧪 Send Test Alert
          </button>

          {message && (
            <div style={{
              marginTop: 8, padding: '8px 12px', borderRadius: 8, fontSize: 12,
              background: message.type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
              color: message.type === 'success' ? '#4ade80' : '#f87171',
              border: `1px solid ${message.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
            }}>
              {message.text}
            </div>
          )}
        </div>
      )}

      {/* ═══════ APPEARANCE TAB ═══════ */}
      {activeTab === 'style' && (
        <div className="nb-section">
          <h4 className="nb-subtitle">Colors</h4>
          <ColorField label="Accent Color (border glow)" value={c.accentColor || '#9146FF'} onChange={v => set('accentColor', v)} />
          <ColorField label="Background" value={c.bgColor || '#0d0d14'} onChange={v => set('bgColor', v)} />
          <ColorField label="Text Color" value={c.textColor || '#ffffff'} onChange={v => set('textColor', v)} />
          <ColorField label="Subtext Color" value={c.subtextColor || '#a0a0b4'} onChange={v => set('subtextColor', v)} />

          <h4 className="nb-subtitle" style={{ marginTop: 16 }}>Typography</h4>
          <label className="nb-select-field" style={{ display: 'block', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: '#cbd5e1', display: 'block', marginBottom: 4 }}>Font Family</span>
            <select
              value={c.fontFamily || "'Inter', sans-serif"}
              onChange={e => set('fontFamily', e.target.value)}
              style={{
                width: '100%', padding: '6px 10px', borderRadius: 6,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                color: '#e2e8f0', fontSize: 12,
              }}
            >
              {FONT_OPTIONS.map(f => (
                <option key={f} value={f} style={{ fontFamily: f }}>{f.split("'")[1]}</option>
              ))}
            </select>
          </label>

          <SliderField label="Border Radius" value={c.borderRadius ?? 16} onChange={v => set('borderRadius', v)} min={0} max={32} suffix="px" />

          <h4 className="nb-subtitle" style={{ marginTop: 16 }}>Animations</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <span style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Enter</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {ENTER_ANIMATIONS.map(a => (
                  <button
                    key={a.value}
                    onClick={() => set('enterAnimation', a.value)}
                    style={{
                      padding: '4px 8px', borderRadius: 6, border: 'none', fontSize: 11, cursor: 'pointer',
                      background: (c.enterAnimation || 'slideUp') === a.value ? '#9146FF' : 'rgba(255,255,255,0.06)',
                      color: (c.enterAnimation || 'slideUp') === a.value ? '#fff' : '#94a3b8',
                    }}
                  >
                    {a.icon} {a.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Exit</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {EXIT_ANIMATIONS.map(a => (
                  <button
                    key={a.value}
                    onClick={() => set('exitAnimation', a.value)}
                    style={{
                      padding: '4px 8px', borderRadius: 6, border: 'none', fontSize: 11, cursor: 'pointer',
                      background: (c.exitAnimation || 'slideDown') === a.value ? '#9146FF' : 'rgba(255,255,255,0.06)',
                      color: (c.exitAnimation || 'slideDown') === a.value ? '#fff' : '#94a3b8',
                    }}
                  >
                    {a.icon} {a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ BEHAVIOR TAB ═══════ */}
      {activeTab === 'behavior' && (
        <div className="nb-section">
          <h4 className="nb-subtitle">Timing</h4>
          <SliderField
            label="Alert Duration (seconds)"
            value={c.alertDuration ?? 30}
            onChange={v => set('alertDuration', v)}
            min={10} max={120} suffix="s"
          />
          <SliderField
            label="Max Clip Duration Filter"
            value={c.maxClipDuration ?? 60}
            onChange={v => set('maxClipDuration', v)}
            min={10} max={120} suffix="s"
          />

          <h4 className="nb-subtitle" style={{ marginTop: 16 }}>Display Options</h4>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={c.showClip !== false} onChange={e => set('showClip', e.target.checked)} />
            <span style={{ fontSize: 12, color: '#cbd5e1' }}>Show Twitch Clip</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={c.showGame !== false} onChange={e => set('showGame', e.target.checked)} />
            <span style={{ fontSize: 12, color: '#cbd5e1' }}>Show Game Name</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={c.showViewers !== false} onChange={e => set('showViewers', e.target.checked)} />
            <span style={{ fontSize: 12, color: '#cbd5e1' }}>Show Clip View Count</span>
          </label>

          <h4 className="nb-subtitle" style={{ marginTop: 16 }}>Sound</h4>
          <label style={{ display: 'block', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: '#cbd5e1', display: 'block', marginBottom: 4 }}>Alert Sound URL (optional)</span>
            <input
              type="text"
              placeholder="https://example.com/raid-alert.mp3"
              value={c.soundUrl || ''}
              onChange={e => set('soundUrl', e.target.value)}
              style={{
                width: '100%', padding: '6px 10px', borderRadius: 6,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                color: '#e2e8f0', fontSize: 12, outline: 'none',
              }}
            />
          </label>
          <p className="oc-config-hint" style={{ fontSize: 10, color: '#64748b' }}>
            Direct URL to an MP3 or WAV file. Leave empty for no sound.
          </p>
        </div>
      )}

      {/* ═══════ WEBHOOK TAB ═══════ */}
      {activeTab === 'webhook' && (
        <div className="nb-section">
          <h4 className="nb-subtitle">StreamElements / Nightbot Setup</h4>
          <p className="oc-config-hint" style={{ marginBottom: 12 }}>
            Create a custom command that hits this URL when someone types <code>!so username</code> in chat.
          </p>

          <div style={{ marginBottom: 16 }}>
            <span style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Webhook URL</span>
            <div style={{
              padding: '8px 12px', borderRadius: 8, fontSize: 11,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: '#60a5fa', wordBreak: 'break-all', fontFamily: "'Fira Code', monospace",
              lineHeight: 1.5,
            }}>
              {webhookUrl || 'Loading...'}
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(webhookUrl)}
              style={{
                marginTop: 6, padding: '4px 12px', borderRadius: 6, border: 'none',
                background: 'rgba(255,255,255,0.08)', color: '#94a3b8',
                fontSize: 11, cursor: 'pointer',
              }}
            >
              📋 Copy URL
            </button>
          </div>

          <div style={{
            padding: 12, borderRadius: 8, background: 'rgba(145,70,255,0.08)',
            border: '1px solid rgba(145,70,255,0.2)', fontSize: 12, color: '#c4b5fd',
          }}>
            <strong>StreamElements Custom Command:</strong>
            <pre style={{
              marginTop: 8, padding: 8, borderRadius: 6,
              background: 'rgba(0,0,0,0.3)', fontSize: 11, whiteSpace: 'pre-wrap',
              color: '#e2e8f0', fontFamily: "'Fira Code', monospace",
            }}>
              {`!command add !so \${urlfetch ${webhookUrl?.replace('${user}', '$(touser)') || '...'}}`}
            </pre>
            <p style={{ marginTop: 8, fontSize: 11, color: '#94a3b8' }}>
              Replace <code>YOUR_SECRET</code> with a secret you set in your Vercel env vars as <code>SHOUTOUT_WEBHOOK_SECRET</code>.
            </p>
          </div>

          <div style={{
            marginTop: 12, padding: 12, borderRadius: 8, background: 'rgba(59,130,246,0.08)',
            border: '1px solid rgba(59,130,246,0.2)', fontSize: 12, color: '#93c5fd',
          }}>
            <strong>Nightbot Custom Command:</strong>
            <pre style={{
              marginTop: 8, padding: 8, borderRadius: 6,
              background: 'rgba(0,0,0,0.3)', fontSize: 11, whiteSpace: 'pre-wrap',
              color: '#e2e8f0', fontFamily: "'Fira Code', monospace",
            }}>
              {`!addcom !so $(urlfetch ${webhookUrl?.replace('${user}', '$(touser)') || '...'})`}
            </pre>
          </div>
        </div>
      )}

      {/* ═══════ HISTORY TAB ═══════ */}
      {activeTab === 'history' && (
        <div className="nb-section">
          <h4 className="nb-subtitle">Recent Shoutouts</h4>
          {history.length === 0 ? (
            <p className="oc-config-hint">No shoutouts yet. Trigger one from the Trigger tab!</p>
          ) : (
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {history.map(h => (
                <div key={h.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}>
                  {h.raider_avatar_url && (
                    <img src={h.raider_avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: '50%' }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>
                      {h.raider_display_name}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      {h.raider_game || 'Unknown game'} · {h.clip_title ? `"${h.clip_title}"` : 'No clip'}
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: '#475569', textAlign: 'right' }}>
                    <div>{new Date(h.created_at).toLocaleDateString()}</div>
                    <div>{new Date(h.created_at).toLocaleTimeString()}</div>
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
