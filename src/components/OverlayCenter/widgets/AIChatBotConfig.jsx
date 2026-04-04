import { useState, useEffect } from 'react';

/**
 * AIChatBotConfig — Config panel for the AI Chat Bot widget.
 */
export default function AIChatBotConfig({ config, onChange, allWidgets }) {
  const c = config || {};
  const set = (key, val) => onChange({ ...c, [key]: val });
  const [voices, setVoices] = useState([]);
  const [showKey, setShowKey] = useState(false);
  const [avatarList, setAvatarList] = useState([]);
  const [voiceFilter, setVoiceFilter] = useState('');
  const [previewingVoice, setPreviewingVoice] = useState(null);

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

  // Load avatar gallery
  useEffect(() => {
    fetch('/avatars/avatars.json')
      .then(r => r.ok ? r.json() : [])
      .then(list => setAvatarList(Array.isArray(list) ? list : []))
      .catch(() => setAvatarList([]));
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

        <label style={labelStyle}>AI Provider</label>
        <select
          value={c.aiProvider || 'gemini'}
          onChange={e => set('aiProvider', e.target.value)}
          style={{ ...inputStyle, marginBottom: 10 }}
        >
          <option value="gemini">Google Gemini (free, 1,500 req/day)</option>
          <option value="groq">Groq (free, 14,400 req/day — recommended)</option>
        </select>

        {(c.aiProvider || 'gemini') === 'gemini' && (
          <>
            <label style={labelStyle}>Gemini API Key</label>
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
          </>
        )}

        {(c.aiProvider) === 'groq' && (
          <>
            <label style={labelStyle}>Groq API Key</label>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              <input
                type={showKey ? 'text' : 'password'}
                value={c.geminiApiKey || ''}
                onChange={e => set('geminiApiKey', e.target.value)}
                placeholder="gsk_..."
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                onClick={() => setShowKey(!showKey)}
                style={{ padding: '6px 10px', borderRadius: 6, border: 'none', background: 'rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: 11, cursor: 'pointer' }}
              >{showKey ? '🙈' : '👁️'}</button>
            </div>
            <div style={{ fontSize: 10, color: '#64748b', marginBottom: 10 }}>
              Get a free key at <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8' }}>console.groq.com/keys</a>
            </div>
            <div style={{ padding: '8px 10px', borderRadius: 6, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', marginBottom: 10, fontSize: 10, color: '#86efac' }}>
              ✅ Groq is free with 14,400 requests/day — 10× more than Gemini. Ultra-fast inference!
            </div>

            <label style={labelStyle}>Model</label>
            <select
              value={c.groqModel || 'llama-3.3-70b-versatile'}
              onChange={e => set('groqModel', e.target.value)}
              style={{ ...inputStyle, marginBottom: 10 }}
            >
              <option value="llama-3.3-70b-versatile">Llama 3.3 70B (smartest, recommended)</option>
              <option value="llama-3.1-8b-instant">Llama 3.1 8B Instant (fastest)</option>
              <option value="mixtral-8x7b-32768">Mixtral 8x7B (balanced)</option>
              <option value="gemma2-9b-it">Gemma 2 9B (Google)</option>
            </select>
          </>
        )}

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
            {/* Avatar Gallery */}
            {avatarList.length > 0 && (
              <>
                <label style={labelStyle}>Choose an Avatar</label>
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12,
                  maxHeight: 240, overflowY: 'auto', padding: 2,
                }}>
                  {avatarList.map(av => {
                    const selected = c.avatar3dUrl === av.file;
                    return (
                      <div
                        key={av.id}
                        onClick={() => set('avatar3dUrl', av.file)}
                        style={{
                          borderRadius: 8, overflow: 'hidden', cursor: 'pointer',
                          border: selected ? `2px solid ${c.accentColor || '#9146FF'}` : '2px solid rgba(255,255,255,0.08)',
                          background: selected ? `${c.accentColor || '#9146FF'}15` : 'rgba(255,255,255,0.02)',
                          transition: 'all 0.2s',
                        }}
                      >
                        <div style={{
                          width: '100%', aspectRatio: '1', background: 'rgba(0,0,0,0.3)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          overflow: 'hidden',
                        }}>
                          {av.thumbnail ? (
                            <img
                              src={av.thumbnail}
                              alt={av.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                            />
                          ) : null}
                          <div style={{
                            display: av.thumbnail ? 'none' : 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            fontSize: 28, width: '100%', height: '100%',
                          }}>🧍</div>
                        </div>
                        <div style={{
                          padding: '5px 6px', fontSize: 10, fontWeight: 600, textAlign: 'center',
                          color: selected ? '#e2e8f0' : '#94a3b8',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {av.name}
                          {selected && <span style={{ color: c.accentColor || '#9146FF', marginLeft: 4 }}>✓</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <label style={labelStyle}>Or paste a custom GLB URL</label>
            <input
              value={c.avatar3dUrl || ''}
              onChange={e => set('avatar3dUrl', e.target.value)}
              placeholder="https://example.com/avatar.glb"
              style={{ ...inputStyle, marginBottom: 6 }}
            />
            <div style={{ fontSize: 10, color: '#64748b', marginBottom: 10 }}>
              Download GLB avatars from{' '}
              <a href="https://avaturn.me" target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8' }}>avaturn.me</a>
              {' '}or{' '}
              <a href="https://sketchfab.com/search?q=avatar&type=models" target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8' }}>Sketchfab</a>
              . Add your own to <code style={{ color: '#818cf8' }}>/public/avatars/</code> and update <code style={{ color: '#818cf8' }}>avatars.json</code>
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

            <div style={checkboxRow}>
              <input type="checkbox" checked={c.avatar3dFlip === true} onChange={e => set('avatar3dFlip', e.target.checked)} />
              <span>Flip avatar (face camera)</span>
            </div>

            {/* ── Animation Controls ── */}
            <div style={{ marginTop: 8, padding: '10px 12px', borderRadius: 6, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>🎬 Animation Controls</div>

              <label style={labelStyle}>Model Scale ({(c.avatar3dScale || 1).toFixed(1)}x)</label>
              <input type="range" min="0.5" max="2" step="0.1" value={c.avatar3dScale || 1}
                onChange={e => set('avatar3dScale', parseFloat(e.target.value))} style={{ width: '100%', marginBottom: 8 }} />

              <label style={labelStyle}>Camera Height ({(c.avatar3dCamHeight ?? 0.85).toFixed(2)})</label>
              <input type="range" min="0" max="2" step="0.05" value={c.avatar3dCamHeight ?? 0.85}
                onChange={e => set('avatar3dCamHeight', parseFloat(e.target.value))} style={{ width: '100%', marginBottom: 8 }} />

              <label style={labelStyle}>Camera Distance ({(c.avatar3dCamDist ?? 2.2).toFixed(1)})</label>
              <input type="range" min="0.5" max="5" step="0.1" value={c.avatar3dCamDist ?? 2.2}
                onChange={e => set('avatar3dCamDist', parseFloat(e.target.value))} style={{ width: '100%', marginBottom: 8 }} />

              <label style={labelStyle}>Breathing ({Math.round((c.avatar3dBreathing ?? 1) * 100)}%)</label>
              <input type="range" min="0" max="3" step="0.1" value={c.avatar3dBreathing ?? 1}
                onChange={e => set('avatar3dBreathing', parseFloat(e.target.value))} style={{ width: '100%', marginBottom: 8 }} />

              <label style={labelStyle}>Body Sway ({Math.round((c.avatar3dSway ?? 1) * 100)}%)</label>
              <input type="range" min="0" max="3" step="0.1" value={c.avatar3dSway ?? 1}
                onChange={e => set('avatar3dSway', parseFloat(e.target.value))} style={{ width: '100%', marginBottom: 8 }} />

              <label style={labelStyle}>Head Movement ({Math.round((c.avatar3dHeadMove ?? 1) * 100)}%)</label>
              <input type="range" min="0" max="3" step="0.1" value={c.avatar3dHeadMove ?? 1}
                onChange={e => set('avatar3dHeadMove', parseFloat(e.target.value))} style={{ width: '100%', marginBottom: 8 }} />

              <label style={labelStyle}>Arm Movement ({Math.round((c.avatar3dArmMove ?? 1) * 100)}%)</label>
              <input type="range" min="0" max="3" step="0.1" value={c.avatar3dArmMove ?? 1}
                onChange={e => set('avatar3dArmMove', parseFloat(e.target.value))} style={{ width: '100%', marginBottom: 8 }} />

              <label style={labelStyle}>Gesture Intensity ({Math.round((c.avatar3dGestures ?? 1) * 100)}%)</label>
              <input type="range" min="0" max="3" step="0.1" value={c.avatar3dGestures ?? 1}
                onChange={e => set('avatar3dGestures', parseFloat(e.target.value))} style={{ width: '100%', marginBottom: 8 }} />

              <label style={labelStyle}>Animation Speed ({(c.avatar3dSpeed ?? 1).toFixed(1)}x)</label>
              <input type="range" min="0.2" max="3" step="0.1" value={c.avatar3dSpeed ?? 1}
                onChange={e => set('avatar3dSpeed', parseFloat(e.target.value))} style={{ width: '100%', marginBottom: 4 }} />

              <button
                onClick={() => {
                  set('avatar3dScale', 1); set('avatar3dCamHeight', 0.85); set('avatar3dCamDist', 2.2);
                  set('avatar3dBreathing', 1); set('avatar3dSway', 1); set('avatar3dHeadMove', 1);
                  set('avatar3dArmMove', 1); set('avatar3dGestures', 1); set('avatar3dSpeed', 1);
                }}
                style={{ marginTop: 6, padding: '5px 12px', borderRadius: 5, border: 'none', fontSize: 10, fontWeight: 600, cursor: 'pointer', background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}
              >↺ Reset All to Defaults</button>
            </div>

            {/* ── Animation Controls ── */}
            <div style={{ marginTop: 8, padding: '10px 12px', borderRadius: 6, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>🎬 Animation Controls</div>

              <label style={labelStyle}>Model Scale ({(c.avatar3dScale || 1).toFixed(1)}x)</label>
              <input type="range" min="0.5" max="2" step="0.1" value={c.avatar3dScale || 1}
                onChange={e => set('avatar3dScale', parseFloat(e.target.value))} style={{ width: '100%', marginBottom: 8 }} />

              <label style={labelStyle}>Camera Height ({(c.avatar3dCamHeight ?? 0.85).toFixed(2)})</label>
              <input type="range" min="0" max="2" step="0.05" value={c.avatar3dCamHeight ?? 0.85}
                onChange={e => set('avatar3dCamHeight', parseFloat(e.target.value))} style={{ width: '100%', marginBottom: 8 }} />

              <label style={labelStyle}>Camera Distance ({(c.avatar3dCamDist ?? 2.2).toFixed(1)})</label>
              <input type="range" min="0.5" max="5" step="0.1" value={c.avatar3dCamDist ?? 2.2}
                onChange={e => set('avatar3dCamDist', parseFloat(e.target.value))} style={{ width: '100%', marginBottom: 8 }} />

              <label style={labelStyle}>Breathing ({Math.round((c.avatar3dBreathing ?? 1) * 100)}%)</label>
              <input type="range" min="0" max="3" step="0.1" value={c.avatar3dBreathing ?? 1}
                onChange={e => set('avatar3dBreathing', parseFloat(e.target.value))} style={{ width: '100%', marginBottom: 8 }} />

              <label style={labelStyle}>Body Sway ({Math.round((c.avatar3dSway ?? 1) * 100)}%)</label>
              <input type="range" min="0" max="3" step="0.1" value={c.avatar3dSway ?? 1}
                onChange={e => set('avatar3dSway', parseFloat(e.target.value))} style={{ width: '100%', marginBottom: 8 }} />

              <label style={labelStyle}>Head Movement ({Math.round((c.avatar3dHeadMove ?? 1) * 100)}%)</label>
              <input type="range" min="0" max="3" step="0.1" value={c.avatar3dHeadMove ?? 1}
                onChange={e => set('avatar3dHeadMove', parseFloat(e.target.value))} style={{ width: '100%', marginBottom: 8 }} />

              <label style={labelStyle}>Arm Movement ({Math.round((c.avatar3dArmMove ?? 1) * 100)}%)</label>
              <input type="range" min="0" max="3" step="0.1" value={c.avatar3dArmMove ?? 1}
                onChange={e => set('avatar3dArmMove', parseFloat(e.target.value))} style={{ width: '100%', marginBottom: 8 }} />

              <label style={labelStyle}>Gesture Intensity ({Math.round((c.avatar3dGestures ?? 1) * 100)}%)</label>
              <input type="range" min="0" max="3" step="0.1" value={c.avatar3dGestures ?? 1}
                onChange={e => set('avatar3dGestures', parseFloat(e.target.value))} style={{ width: '100%', marginBottom: 8 }} />

              <label style={labelStyle}>Animation Speed ({(c.avatar3dSpeed ?? 1).toFixed(1)}x)</label>
              <input type="range" min="0.2" max="3" step="0.1" value={c.avatar3dSpeed ?? 1}
                onChange={e => set('avatar3dSpeed', parseFloat(e.target.value))} style={{ width: '100%', marginBottom: 4 }} />

              <button
                onClick={() => {
                  set('avatar3dScale', 1); set('avatar3dCamHeight', 0.85); set('avatar3dCamDist', 2.2);
                  set('avatar3dBreathing', 1); set('avatar3dSway', 1); set('avatar3dHeadMove', 1);
                  set('avatar3dArmMove', 1); set('avatar3dGestures', 1); set('avatar3dSpeed', 1);
                }}
                style={{ marginTop: 6, padding: '5px 12px', borderRadius: 5, border: 'none', fontSize: 10, fontWeight: 600, cursor: 'pointer', background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}
              >↺ Reset All to Defaults</button>
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
            {/* Voice filter */}
            <label style={labelStyle}>Search voices</label>
            <input
              value={voiceFilter}
              onChange={e => setVoiceFilter(e.target.value)}
              placeholder="Filter by name or language (e.g. Portuguese, Google, David...)"
              style={{ ...inputStyle, marginBottom: 6 }}
            />
            <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
              {['🇵🇹 PT', '🇬🇧 EN', '🇪🇸 ES', '🇫🇷 FR', '🇩🇪 DE'].map(tag => {
                const langCode = tag.split(' ')[1].toLowerCase();
                const active = voiceFilter.toLowerCase() === langCode;
                return (
                  <button key={tag} onClick={() => setVoiceFilter(active ? '' : langCode)}
                    style={{
                      padding: '3px 8px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 600,
                      background: active ? 'rgba(145,70,255,0.2)' : 'rgba(255,255,255,0.05)',
                      color: active ? '#a78bfa' : '#64748b',
                    }}>{tag}</button>
                );
              })}
            </div>

            <div style={{ fontSize: 10, color: '#64748b', marginBottom: 8, padding: '6px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.02)' }}>
              💡 Want more PT voices? Use <strong>Microsoft Edge</strong> browser — it has 5+ high-quality Portuguese voices including <em>Microsoft Francisca</em> and <em>Microsoft António</em>. Chrome has fewer PT voices.
            </div>

            {/* Voice cards */}
            <div style={{ maxHeight: 260, overflowY: 'auto', marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {/* System default option */}
              <div
                onClick={() => set('ttsVoice', '')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, cursor: 'pointer',
                  background: !c.ttsVoice ? `${c.accentColor || '#9146FF'}20` : 'rgba(255,255,255,0.02)',
                  border: !c.ttsVoice ? `1px solid ${c.accentColor || '#9146FF'}55` : '1px solid rgba(255,255,255,0.06)',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: 16 }}>🔊</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>System Default</div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>Browser default voice</div>
                </div>
                {!c.ttsVoice && <span style={{ color: c.accentColor || '#9146FF', fontSize: 12, fontWeight: 700 }}>✓</span>}
              </div>

              {voices
                .filter(v => {
                  if (!voiceFilter) return true;
                  const q = voiceFilter.toLowerCase();
                  return v.name.toLowerCase().includes(q) || v.lang.toLowerCase().includes(q);
                })
                .sort((a, b) => {
                  // Sort PT voices first
                  const aPt = a.lang.startsWith('pt') ? 0 : 1;
                  const bPt = b.lang.startsWith('pt') ? 0 : 1;
                  if (aPt !== bPt) return aPt - bPt;
                  return a.name.localeCompare(b.name);
                })
                .map(v => {
                  const selected = c.ttsVoice === v.name;
                  const isPreviewing = previewingVoice === v.name;
                  return (
                    <div
                      key={v.name}
                      onClick={() => set('ttsVoice', v.name)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, cursor: 'pointer',
                        background: selected ? `${c.accentColor || '#9146FF'}20` : 'rgba(255,255,255,0.02)',
                        border: selected ? `1px solid ${c.accentColor || '#9146FF'}55` : '1px solid rgba(255,255,255,0.06)',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ fontSize: 14 }}>{v.lang.startsWith('en') ? '🇬🇧' : v.lang.startsWith('pt') ? '🇵🇹' : v.lang.startsWith('es') ? '🇪🇸' : v.lang.startsWith('fr') ? '🇫🇷' : v.lang.startsWith('de') ? '🇩🇪' : v.lang.startsWith('ja') ? '🇯🇵' : v.lang.startsWith('ko') ? '🇰🇷' : v.lang.startsWith('zh') ? '🇨🇳' : v.lang.startsWith('it') ? '🇮🇹' : v.lang.startsWith('ru') ? '🇷🇺' : '🌐'}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {v.name}
                        </div>
                        <div style={{ fontSize: 10, color: '#64748b' }}>{v.lang}</div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.speechSynthesis.cancel();
                          setPreviewingVoice(v.name);
                          const previewText = v.lang.startsWith('pt') ? `Olá, eu sou o ${c.botName || 'AI Bot'}, o teu assistente de stream!` : `Hello, I'm ${c.botName || 'AI Bot'}.`;
                          const utt = new SpeechSynthesisUtterance(previewText);
                          utt.voice = v;
                          utt.rate = c.ttsRate || 1;
                          utt.pitch = c.ttsPitch || 1;
                          utt.onend = () => setPreviewingVoice(null);
                          utt.onerror = () => setPreviewingVoice(null);
                          window.speechSynthesis.speak(utt);
                        }}
                        title="Preview this voice"
                        style={{
                          width: 26, height: 26, borderRadius: '50%', border: 'none', cursor: 'pointer',
                          background: isPreviewing ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)',
                          color: isPreviewing ? '#ef4444' : 'rgba(255,255,255,0.5)',
                          fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, transition: 'all 0.15s',
                        }}
                      >{isPreviewing ? '⏹' : '▶'}</button>
                      {selected && <span style={{ color: c.accentColor || '#9146FF', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>✓</span>}
                    </div>
                  );
                })}
              {voices.length === 0 && (
                <div style={{ textAlign: 'center', color: '#64748b', fontSize: 11, padding: 16 }}>
                  Loading voices… (try refreshing if empty)
                </div>
              )}
            </div>

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
