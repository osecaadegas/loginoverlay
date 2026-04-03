import { useState, useEffect } from 'react';

/**
 * AIChatBotConfig — Config panel for the AI Chat Bot widget.
 */
export default function AIChatBotConfig({ config, onChange, allWidgets }) {
  const c = config || {};
  const set = (key, val) => onChange({ ...c, [key]: val });
  const [voices, setVoices] = useState([]);
  const [showKey, setShowKey] = useState(false);

  // Load TTS voices
  useEffect(() => {
    const load = () => {
      const v = window.speechSynthesis?.getVoices() || [];
      setVoices(v);
    };
    load();
    window.speechSynthesis?.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', load);
  }, []);

  // Try to auto-fill twitch channel from other widgets
  useEffect(() => {
    if (!c.twitchChannel && allWidgets) {
      for (const w of allWidgets) {
        const ch = w.config?.twitchChannel;
        if (ch) { set('twitchChannel', ch); break; }
      }
    }
  }, []);

  const sectionStyle = {
    marginBottom: 16, padding: '12px 14px', borderRadius: 8,
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
  };
  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' };
  const inputStyle = {
    width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box',
  };
  const checkboxRow = { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 13, color: '#e2e8f0' };
  const headingStyle = { fontSize: 12, fontWeight: 700, color: '#e2e8f0', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 };

  return (
    <div className="bh-config">

      {/* ── AI Setup ── */}
      <div style={sectionStyle}>
        <div style={headingStyle}>🤖 AI Setup</div>

        <label style={labelStyle}>Gemini API Key (free)</label>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <input
            type={showKey ? 'text' : 'password'}
            value={c.geminiApiKey || ''}
            onChange={e => set('geminiApiKey', e.target.value)}
            placeholder="AIzaSy..."
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            onClick={() => setShowKey(!showKey)}
            style={{ padding: '6px 10px', borderRadius: 6, border: 'none', background: 'rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: 11, cursor: 'pointer' }}
          >{showKey ? '🙈' : '👁️'}</button>
        </div>
        <div style={{ fontSize: 10, color: '#64748b', marginBottom: 10 }}>
          Get a free key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8' }}>aistudio.google.com/apikey</a>
        </div>

        <label style={labelStyle}>Model</label>
        <select
          value={c.geminiModel || 'gemini-2.0-flash'}
          onChange={e => set('geminiModel', e.target.value)}
          style={{ ...inputStyle, marginBottom: 10 }}
        >
          <option value="gemini-2.0-flash">Gemini 2.0 Flash (fastest, free)</option>
          <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash Lite (lightest)</option>
          <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
          <option value="gemini-1.5-pro">Gemini 1.5 Pro (smartest)</option>
        </select>

        <label style={labelStyle}>System Prompt / Personality</label>
        <textarea
          value={c.systemPrompt || ''}
          onChange={e => set('systemPrompt', e.target.value)}
          placeholder="You are a fun and friendly stream chatbot. Keep answers short (1-2 sentences max)."
          rows={4}
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
        />
      </div>

      {/* ── 3D Avatar ── */}
      <div style={sectionStyle}>
        <div style={headingStyle}>🧍 3D Avatar (Jarvis Mode)</div>

        <div style={checkboxRow}>
          <input type="checkbox" checked={!!c.avatar3dEnabled} onChange={e => set('avatar3dEnabled', e.target.checked)} />
          <span>Enable 3D animated avatar</span>
        </div>
        <div style={{ fontSize: 10, color: '#64748b', marginBottom: 10 }}>
          Uses a 3D GLB avatar with idle breathing, eye blinks, lip sync when speaking, and thinking animations.
        </div>

        {c.avatar3dEnabled && (
          <>
            <label style={labelStyle}>Avatar GLB URL</label>
            <input
              value={c.avatar3dUrl || ''}
              onChange={e => set('avatar3dUrl', e.target.value)}
              placeholder="https://api.avaturn.me/avatars/YOUR_ID/export?format=glb"
              style={{ ...inputStyle, marginBottom: 6 }}
            />
            <div style={{ fontSize: 10, color: '#64748b', marginBottom: 10 }}>
              Create a free avatar at{' '}
              <a href="https://avaturn.me" target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8' }}>avaturn.me</a>
              {' '}or download from{' '}
              <a href="https://sketchfab.com/search?q=avatar&type=models" target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8' }}>Sketchfab</a>
              {' '}→ paste the .glb URL. Any GLB with morph targets works
            </div>

            <label style={labelStyle}>Avatar Size (px)</label>
            <input
              type="number"
              min={150}
              max={800}
              value={c.avatar3dSize || 300}
              onChange={e => set('avatar3dSize', parseInt(e.target.value) || 300)}
              style={{ ...inputStyle, width: 100, marginBottom: 10 }}
            />

            <label style={labelStyle}>Avatar Position</label>
            <select
              value={c.avatar3dPosition || 'top'}
              onChange={e => set('avatar3dPosition', e.target.value)}
              style={{ ...inputStyle, marginBottom: 10 }}
            >
              <option value="top">Above chat</option>
              <option value="left">Left of chat</option>
              <option value="right">Right of chat</option>
            </select>

            <div style={checkboxRow}>
              <input type="checkbox" checked={c.avatar3dParticles !== false} onChange={e => set('avatar3dParticles', e.target.checked)} />
              <span>Floating particles effect</span>
            </div>
          </>
        )}
      </div>

      {/* ── Bot Identity ── */}
      <div style={sectionStyle}>
        <div style={headingStyle}>🎭 Bot Identity</div>

        <label style={labelStyle}>Bot Name</label>
        <input
          value={c.botName || ''}
          onChange={e => set('botName', e.target.value)}
          placeholder="AI Bot"
          style={{ ...inputStyle, marginBottom: 10 }}
        />

        <label style={labelStyle}>Bot Avatar URL</label>
        <input
          value={c.botAvatar || ''}
          onChange={e => set('botAvatar', e.target.value)}
          placeholder="https://..."
          style={{ ...inputStyle, marginBottom: 6 }}
        />
        {c.botAvatar && (
          <div style={{ marginBottom: 6 }}>
            <img src={c.botAvatar} alt="preview" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.1)' }} />
          </div>
        )}
      </div>

      {/* ── Twitch Chat ── */}
      <div style={sectionStyle}>
        <div style={headingStyle}>💬 Twitch Chat</div>

        <label style={labelStyle}>Twitch Channel</label>
        <input
          value={c.twitchChannel || ''}
          onChange={e => set('twitchChannel', e.target.value)}
          placeholder="your_channel"
          style={{ ...inputStyle, marginBottom: 10 }}
        />

        <label style={labelStyle}>Trigger Command</label>
        <input
          value={c.triggerWord || ''}
          onChange={e => set('triggerWord', e.target.value)}
          placeholder="!ai"
          style={{ ...inputStyle, marginBottom: 6 }}
        />
        <div style={{ fontSize: 10, color: '#64748b', marginBottom: 10 }}>
          Viewers type this + their question in chat (e.g. <code style={{ color: '#818cf8' }}>!ai what slot should I play?</code>)
        </div>

        <label style={labelStyle}>Max Chat History</label>
        <input
          type="number"
          min={5}
          max={100}
          value={c.maxMessages || 20}
          onChange={e => set('maxMessages', parseInt(e.target.value) || 20)}
          style={{ ...inputStyle, width: 80 }}
        />
      </div>

      {/* ── Microphone / Voice Input ── */}
      <div style={sectionStyle}>
        <div style={headingStyle}>🎙️ Voice Input (Your Mic)</div>

        <div style={checkboxRow}>
          <input type="checkbox" checked={c.micEnabled !== false} onChange={e => set('micEnabled', e.target.checked)} />
          <span>Enable microphone listening</span>
        </div>
        <div style={{ fontSize: 10, color: '#64748b', marginBottom: 10 }}>
          Click the 🎙️ button in the widget header to start/stop. Your spoken words are sent to the AI as prompts.
          Uses browser Speech Recognition (free, works in Chrome/Edge).
        </div>

        {c.micEnabled !== false && (
          <>
            <label style={labelStyle}>Your Name (shown in chat)</label>
            <input
              value={c.streamerName || ''}
              onChange={e => set('streamerName', e.target.value)}
              placeholder="Streamer"
              style={{ ...inputStyle, marginBottom: 10 }}
            />

            <label style={labelStyle}>Recognition Language</label>
            <select
              value={c.micLang || 'en-US'}
              onChange={e => set('micLang', e.target.value)}
              style={inputStyle}
            >
              <option value="en-US">English (US)</option>
              <option value="en-GB">English (UK)</option>
              <option value="pt-PT">Português (Portugal)</option>
              <option value="pt-BR">Português (Brasil)</option>
              <option value="es-ES">Español</option>
              <option value="fr-FR">Français</option>
              <option value="de-DE">Deutsch</option>
              <option value="it-IT">Italiano</option>
              <option value="nl-NL">Nederlands</option>
              <option value="ja-JP">日本語</option>
              <option value="ko-KR">한국어</option>
              <option value="zh-CN">中文 (简体)</option>
              <option value="ru-RU">Русский</option>
              <option value="ar-SA">العربية</option>
              <option value="tr-TR">Türkçe</option>
              <option value="pl-PL">Polski</option>
              <option value="sv-SE">Svenska</option>
              <option value="no-NO">Norsk</option>
              <option value="da-DK">Dansk</option>
            </select>
          </>
        )}
      </div>

      {/* ── TTS ── */}
      <div style={sectionStyle}>
        <div style={headingStyle}>🔊 Text-to-Speech</div>

        <div style={checkboxRow}>
          <input type="checkbox" checked={c.ttsEnabled !== false} onChange={e => set('ttsEnabled', e.target.checked)} />
          <span>Enable TTS (reads AI responses aloud)</span>
        </div>

        {c.ttsEnabled !== false && (
          <>
            <label style={labelStyle}>Voice</label>
            <select
              value={c.ttsVoice || ''}
              onChange={e => set('ttsVoice', e.target.value)}
              style={{ ...inputStyle, marginBottom: 10 }}
            >
              <option value="">System Default</option>
              {voices.map(v => (
                <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
              ))}
            </select>

            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Speed ({c.ttsRate || 1}x)</label>
                <input type="range" min="0.5" max="2" step="0.1" value={c.ttsRate || 1} onChange={e => set('ttsRate', parseFloat(e.target.value))}
                  style={{ width: '100%' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Pitch ({c.ttsPitch || 1})</label>
                <input type="range" min="0.5" max="2" step="0.1" value={c.ttsPitch || 1} onChange={e => set('ttsPitch', parseFloat(e.target.value))}
                  style={{ width: '100%' }} />
              </div>
            </div>

            <button
              onClick={() => {
                const msg = `Hello! I'm ${c.botName || 'AI Bot'}, your stream assistant!`;
                const utt = new SpeechSynthesisUtterance(msg);
                if (c.ttsVoice) {
                  const found = window.speechSynthesis.getVoices().find(v => v.name === c.ttsVoice);
                  if (found) utt.voice = found;
                }
                utt.rate = c.ttsRate || 1;
                utt.pitch = c.ttsPitch || 1;
                window.speechSynthesis.speak(utt);
              }}
              style={{
                padding: '6px 14px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: 'rgba(145,70,255,0.15)', color: '#a78bfa',
              }}
            >▶ Test Voice</button>
          </>
        )}
      </div>

      {/* ── Appearance ── */}
      <div style={sectionStyle}>
        <div style={headingStyle}>🎨 Appearance</div>

        <div style={checkboxRow}>
          <input type="checkbox" checked={c.showHeader !== false} onChange={e => set('showHeader', e.target.checked)} />
          <span>Show header</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <label style={labelStyle}>Width (px)</label>
            <input type="number" value={c.width || 380} onChange={e => set('width', parseInt(e.target.value) || 380)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Height (px)</label>
            <input type="number" value={c.height || 500} onChange={e => set('height', parseInt(e.target.value) || 500)} style={inputStyle} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <div>
            <label style={labelStyle}>Background</label>
            <input type="color" value={c.bgColor || '#0f172a'} onChange={e => set('bgColor', e.target.value)} style={{ width: '100%', height: 32, border: 'none', borderRadius: 4, cursor: 'pointer' }} />
          </div>
          <div>
            <label style={labelStyle}>Text</label>
            <input type="color" value={c.textColor || '#e2e8f0'} onChange={e => set('textColor', e.target.value)} style={{ width: '100%', height: 32, border: 'none', borderRadius: 4, cursor: 'pointer' }} />
          </div>
          <div>
            <label style={labelStyle}>Accent</label>
            <input type="color" value={c.accentColor || '#9146FF'} onChange={e => set('accentColor', e.target.value)} style={{ width: '100%', height: 32, border: 'none', borderRadius: 4, cursor: 'pointer' }} />
          </div>
        </div>

        <label style={{ ...labelStyle, marginTop: 10 }}>Font Size</label>
        <input type="number" min={10} max={24} value={c.fontSize || 14} onChange={e => set('fontSize', parseInt(e.target.value) || 14)} style={{ ...inputStyle, width: 80 }} />
      </div>
    </div>
  );
}
