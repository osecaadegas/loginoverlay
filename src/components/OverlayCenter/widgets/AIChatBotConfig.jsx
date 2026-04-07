import { useState, useEffect, lazy, Suspense } from 'react';

const AvatarThumbnail = lazy(() => import('./AvatarThumbnail.jsx'));

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
            {/* Avatar Gallery with live 3D previews */}
            {avatarList.length > 0 && (
              <>
                <label style={labelStyle}>Choose an Avatar</label>
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12,
                  maxHeight: 360, overflowY: 'auto', padding: 2,
                }}>
                  {avatarList.map(av => {
                    const selected = c.avatar3dUrl === av.file;
                    return (
                      <div key={av.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Suspense fallback={
                          <div
                            onClick={() => set('avatar3dUrl', av.file)}
                            style={{
                              width: 80, height: 80, borderRadius: 8, cursor: 'pointer',
                              border: selected ? `2px solid ${c.accentColor || '#9146FF'}` : '2px solid rgba(255,255,255,0.08)',
                              background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 28,
                            }}
                          >🧍</div>
                        }>
                          <AvatarThumbnail
                            url={av.file}
                            size={80}
                            onClick={() => set('avatar3dUrl', av.file)}
                            selected={selected}
                            accentColor={c.accentColor || '#9146FF'}
                          />
                        </Suspense>
                        <div style={{
                          marginTop: 3, fontSize: 9, fontWeight: 600, textAlign: 'center',
                          color: selected ? '#e2e8f0' : '#94a3b8',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          maxWidth: 80,
                        }}>
                          {av.name}
                          {selected && <span style={{ color: c.accentColor || '#9146FF', marginLeft: 3 }}>✓</span>}
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

            {/* ── NPC Behavior ── */}
            <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 6, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>🎮 NPC Behavior</div>
              <div style={checkboxRow}>
                <input type="checkbox" checked={!!c.npcEnabled} onChange={e => set('npcEnabled', e.target.checked)} />
                <span>Enable NPC roaming</span>
              </div>
              <div style={{ fontSize: 10, color: '#64748b', margin: '-4px 0 8px 0', lineHeight: 1.3 }}>
                Avatar will roam the overlay — walk to the navbar and do push-ups, peek at the chat, wave, and wander around.
              </div>

              {c.npcEnabled && (
                <>
                  <label style={labelStyle}>Walk Speed ({c.npcSpeed || 120} px/s)</label>
                  <input type="range" min="40" max="300" step="10" value={c.npcSpeed || 120}
                    onChange={e => set('npcSpeed', parseInt(e.target.value))} style={{ width: '100%', marginBottom: 4 }} />
                </>
              )}
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

        {c.ttsEnabled !== false && (() => {
          // ── Voice classification helpers ──
          const FEMALE_NAMES = /\b(francisca|fernanda|raquel|maria|branca|in[eê]s|helia|catarina|ana|clara|alice|zira|hazel|susan|jenny|linda|heather|michelle|aria|sara|sabina|elsa|paulina|luciana|larissa|leticia|yara|camila|valentina|elena|karla|nuria|conchita|lucia|elvira|ines|amelie|sylvie|denise|caroline|coralie|hortense|katja|hedda|ingrid|astrid|hillevi|sofie|birgit|heera|swara|kalpana|madhur|naomi|nanami|ayumi|haruka|misaki|hanhan|huihui|xiaoxiao|xiaoyi|maat|damayanti|gadis|satu|noora|monika|iveta|lado|kendra|brenda|elza|giovanna|leila|manuella|manuela|thalita|gabriela|beatriz|joana|mariana|teresa|lidia|carolina|adriana|diana|rita|rosa|natasha|yelena|tatiana|olga|svetlana|anna|emma|olivia|sophia|isabella|mia|charlotte|amelia|harper|evelyn|abigail|chloe|ella|grace|lily|zoey|victoria|natalie|hannah|emily|madison|elizabeth|samantha|jessica|rachel|ashley|nicole|lauren|rebecca|amanda|katherine|stephanie|amber|danielle|catherine|courtney|brittany|diana|tiffany|jeanette|vivian|joanna|pamela|roxana|silvia|renata|claudia|pilar|amparo|soledad|rosario|milagros|remedios|socorro|guadalupe|dolores|concepcion|mercedes|paloma|esperanza|begona|marisol|rocio|ainhoa|gorka|nekane|edurne|miren|itziar|garazi|nerea|ainara)\b/i;
          const MALE_NAMES = /\b(ant[oó]nio|duarte|daniel|cristiano|hector|jorge|tiago|david|james|mark|george|richard|ryan|guy|sean|rishi|sam|liam|eric|ivan|bengt|stefan|filip|adam|bruce|reed|steffan|thomas|guillaume|claude|henri|alain|pablo|alvaro|diego|carlos|enrique|raul|luca|cosimo|hans|conrad|florian|ichiro|keita|kenzo|naoto|takeshi|kangkang|yun|yunyang|zhiwei|rafal|marek|pattara|andika|hemant|sami|rizwan|asad|karsten|heami|junichi|tolga|sergei|dmitry|maxim|pavel|gon[cç]alo|f[aá]bio|humberto|julio|j[uú]lio|nicolau|val[eé]rio|donato|bernardo|manuel|miguel|pedro|rafael|rodrigo|gustavo|lucas|leonardo|gabriel|henrique|mateus|vinicius|marcos|fernando|ricardo|joao|jo[aã]o|andre|andr[eé]|alessandro|giuseppe|giovanni|marco|matteo|lorenzo|francesco|roberto|william|michael|john|robert|joseph|charles|edward|henry|andrew|christopher|matthew|anthony|benjamin|jacob|ethan|noah|alexander|oliver|jack|harry|freddie|alfie|oscar|leo|max|archie|charlie|theodore|logan|mason|elijah|aiden|jayden|jackson|sebastian|caleb|owen|nathan|connor|dominic|tyler|dylan|lucas|gabriel|julian|jose|angel|kevin|adrian|javier|alejandro|fernando|ricardo|sergio|andres|santiago|nicolas|emilio|alfonso|ignacio|rodrigo|gonzalo|eduardo|arturo|ernesto|gerardo|gilberto|rogelio|ramiro|saul|abel|efrain|moises|oleg|nikolai|vladimir|aleksandr|boris|konstantin|stanislav|mikhail|yuri|aleksei|andrei|viktor)\b/i;
          const FAMOUS_NAMES = /\b(google|microsoft|apple|amazon|samsung|cortana|siri|alexa)\b/i;

          const classifyVoice = (v) => {
            const n = v.name.toLowerCase();
            const isFemale = FEMALE_NAMES.test(n) || /\bfemale\b/i.test(n);
            const isMale = MALE_NAMES.test(n) || /\bmale\b/i.test(n);
            const isFamous = FAMOUS_NAMES.test(n);
            // gender: guess from name patterns if not matched
            let gender = isFemale ? 'female' : isMale ? 'male' : 'unknown';
            // heuristic: "Online (Natural)" voices from Edge tend to have gendered first names already caught above
            return { gender, isFamous };
          };

          const getLangFlag = (lang) => {
            if (lang.startsWith('en')) return '🇬🇧';
            if (lang.startsWith('pt-PT')) return '🇵🇹';
            if (lang.startsWith('pt-BR')) return '🇧🇷';
            if (lang.startsWith('pt')) return '🇵🇹';
            if (lang.startsWith('es')) return '🇪🇸';
            if (lang.startsWith('fr')) return '🇫🇷';
            if (lang.startsWith('de')) return '🇩🇪';
            if (lang.startsWith('it')) return '🇮🇹';
            if (lang.startsWith('ja')) return '🇯🇵';
            if (lang.startsWith('ko')) return '🇰🇷';
            if (lang.startsWith('zh')) return '🇨🇳';
            if (lang.startsWith('ru')) return '🇷🇺';
            if (lang.startsWith('nl')) return '🇳🇱';
            if (lang.startsWith('pl')) return '🇵🇱';
            if (lang.startsWith('tr')) return '🇹🇷';
            if (lang.startsWith('sv')) return '🇸🇪';
            if (lang.startsWith('nb') || lang.startsWith('no')) return '🇳🇴';
            if (lang.startsWith('da')) return '🇩🇰';
            if (lang.startsWith('fi')) return '🇫🇮';
            if (lang.startsWith('ar')) return '🇸🇦';
            if (lang.startsWith('hi')) return '🇮🇳';
            if (lang.startsWith('th')) return '🇹🇭';
            if (lang.startsWith('id')) return '🇮🇩';
            return '🌐';
          };

          const getLangLabel = (lang) => {
            if (lang.startsWith('pt-PT')) return 'Portuguese (Portugal)';
            if (lang.startsWith('pt-BR')) return 'Portuguese (Brasil)';
            if (lang.startsWith('pt')) return 'Portuguese';
            if (lang.startsWith('en-US')) return 'English (US)';
            if (lang.startsWith('en-GB')) return 'English (UK)';
            if (lang.startsWith('en-AU')) return 'English (AU)';
            if (lang.startsWith('en')) return 'English';
            if (lang.startsWith('es')) return 'Spanish';
            if (lang.startsWith('fr')) return 'French';
            if (lang.startsWith('de')) return 'German';
            if (lang.startsWith('it')) return 'Italian';
            if (lang.startsWith('ja')) return 'Japanese';
            if (lang.startsWith('ko')) return 'Korean';
            if (lang.startsWith('zh')) return 'Chinese';
            if (lang.startsWith('ru')) return 'Russian';
            return lang;
          };

          const getPreviewText = (lang, botName) => {
            if (lang.startsWith('pt')) return `Olá, eu sou o ${botName}, o teu assistente de stream!`;
            if (lang.startsWith('es')) return `¡Hola! Soy ${botName}, tu asistente de stream.`;
            if (lang.startsWith('fr')) return `Bonjour, je suis ${botName}, ton assistant de stream!`;
            if (lang.startsWith('de')) return `Hallo, ich bin ${botName}, dein Stream-Assistent!`;
            if (lang.startsWith('it')) return `Ciao, sono ${botName}, il tuo assistente di stream!`;
            if (lang.startsWith('ja')) return `こんにちは、${botName}です。配信アシスタントです！`;
            if (lang.startsWith('ko')) return `안녕하세요, ${botName}입니다. 방송 도우미예요!`;
            if (lang.startsWith('zh')) return `你好，我是${botName}，你的直播助手！`;
            if (lang.startsWith('ru')) return `Привет! Я ${botName}, твой помощник для стримов!`;
            return `Hello, I'm ${botName}, your stream assistant!`;
          };

          // Classify all voices
          const classified = voices.map(v => ({ ...classifyVoice(v), voice: v }));

          // Filters
          const filterLang = voiceFilter;
          const [filterGender, setFilterGender] = [c._ttsFilterGender || '', (v) => set('_ttsFilterGender', v)];
          const [filterFamous, setFilterFamous] = [c._ttsFilterFamous || '', (v) => set('_ttsFilterFamous', v)];

          const filtered = classified.filter(({ voice: v, gender, isFamous }) => {
            if (filterLang) {
              const q = filterLang.toLowerCase();
              if (!v.name.toLowerCase().includes(q) && !v.lang.toLowerCase().includes(q)) return false;
            }
            // Gender filter: include matching + unknown (unclassified voices still show)
            if (filterGender === 'male' && gender === 'female') return false;
            if (filterGender === 'female' && gender === 'male') return false;
            if (filterFamous === 'famous' && !isFamous) return false;
            if (filterFamous === 'standard' && isFamous) return false;
            return true;
          });

          const sorted = filtered.sort((a, b) => {
            const aP = a.voice.lang.startsWith('pt') ? 0 : 1;
            const bP = b.voice.lang.startsWith('pt') ? 0 : 1;
            if (aP !== bP) return aP - bP;
            if (aP === 0) {
              const aPP = a.voice.lang.startsWith('pt-PT') ? 0 : 1;
              const bPP = b.voice.lang.startsWith('pt-PT') ? 0 : 1;
              if (aPP !== bPP) return aPP - bPP;
            }
            // When gender filter active, push unclassified voices to the bottom
            if (filterGender) {
              const aMatch = a.gender === filterGender ? 0 : 1;
              const bMatch = b.gender === filterGender ? 0 : 1;
              if (aMatch !== bMatch) return aMatch - bMatch;
            }
            // Sort famous first within same language
            if (a.isFamous !== b.isFamous) return a.isFamous ? -1 : 1;
            return a.voice.name.localeCompare(b.voice.name);
          });

          const accent = c.accentColor || '#9146FF';
          const pillStyle = (active) => ({
            padding: '4px 10px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 600,
            background: active ? `${accent}30` : 'rgba(255,255,255,0.04)',
            color: active ? '#a78bfa' : '#64748b',
            transition: 'all 0.15s',
          });

          return (
            <>
              {/* Search */}
              <input
                value={voiceFilter}
                onChange={e => setVoiceFilter(e.target.value)}
                placeholder="Search voices by name or language..."
                style={{ ...inputStyle, marginBottom: 8 }}
              />

              {/* ── Filter row: Language ── */}
              <div style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 9, color: '#475569', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, fontWeight: 700 }}>Language</div>
                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  {[
                    { label: 'All', code: '' },
                    { label: '🇵🇹 PT', code: 'pt' },
                    { label: '🇬🇧 EN', code: 'en' },
                    { label: '🇪🇸 ES', code: 'es' },
                    { label: '🇫🇷 FR', code: 'fr' },
                    { label: '🇩🇪 DE', code: 'de' },
                    { label: '🇮🇹 IT', code: 'it' },
                    { label: '🇯🇵 JA', code: 'ja' },
                    { label: '🇰🇷 KO', code: 'ko' },
                    { label: '🇨🇳 ZH', code: 'zh' },
                    { label: '🇷🇺 RU', code: 'ru' },
                  ].map(({ label, code }) => (
                    <button key={code} onClick={() => setVoiceFilter(voiceFilter === code ? '' : code)}
                      style={pillStyle(voiceFilter === code)}>{label}</button>
                  ))}
                </div>
              </div>

              {/* ── Filter row: Gender ── */}
              <div style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 9, color: '#475569', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, fontWeight: 700 }}>Gender</div>
                <div style={{ display: 'flex', gap: 3 }}>
                  {[
                    { label: 'All', code: '' },
                    { label: '♀️ Female', code: 'female' },
                    { label: '♂️ Male', code: 'male' },
                  ].map(({ label, code }) => (
                    <button key={code} onClick={() => setFilterGender(filterGender === code ? '' : code)}
                      style={pillStyle(filterGender === code)}>{label}</button>
                  ))}
                </div>
              </div>

              {/* ── Filter row: Type ── */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 9, color: '#475569', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, fontWeight: 700 }}>Type</div>
                <div style={{ display: 'flex', gap: 3 }}>
                  {[
                    { label: 'All', code: '' },
                    { label: '⭐ Famous (Google, Microsoft…)', code: 'famous' },
                    { label: '🔊 Standard', code: 'standard' },
                  ].map(({ label, code }) => (
                    <button key={code} onClick={() => setFilterFamous(filterFamous === code ? '' : code)}
                      style={pillStyle(filterFamous === code)}>{label}</button>
                  ))}
                </div>
              </div>

              <div style={{ fontSize: 10, color: '#64748b', marginBottom: 8, padding: '6px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.02)' }}>
                💡 <strong>Microsoft Edge</strong> has 100+ high-quality natural voices. Chrome has fewer options.
              </div>

              {/* ── Voice cards ── */}
              <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Auto option */}
                <div
                  onClick={() => set('ttsVoice', '')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, cursor: 'pointer',
                    background: !c.ttsVoice ? `${accent}20` : 'rgba(255,255,255,0.02)',
                    border: !c.ttsVoice ? `1px solid ${accent}55` : '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div style={{ fontSize: 14 }}>🤖</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>Auto (Portuguese)</div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>Auto-picks best PT voice available</div>
                  </div>
                  {!c.ttsVoice && <span style={{ color: accent, fontSize: 12, fontWeight: 700 }}>✓</span>}
                </div>

                {sorted.map(({ voice: v, gender, isFamous }) => {
                  const selected = c.ttsVoice === v.name;
                  const isPreviewing = previewingVoice === v.name;
                  const genderIcon = gender === 'female' ? '♀️' : gender === 'male' ? '♂️' : '';
                  return (
                    <div
                      key={v.name}
                      onClick={() => set('ttsVoice', v.name)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, cursor: 'pointer',
                        background: selected ? `${accent}20` : 'rgba(255,255,255,0.02)',
                        border: selected ? `1px solid ${accent}55` : '1px solid rgba(255,255,255,0.06)',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ fontSize: 14 }}>{getLangFlag(v.lang)}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: 4 }}>
                          {v.name}
                          {genderIcon && <span style={{ fontSize: 10 }}>{genderIcon}</span>}
                          {isFamous && <span style={{ fontSize: 8, background: 'rgba(250,204,21,0.15)', color: '#fbbf24', padding: '1px 5px', borderRadius: 8, fontWeight: 700 }}>⭐</span>}
                        </div>
                        <div style={{ fontSize: 10, color: '#64748b' }}>{getLangLabel(v.lang)}</div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.speechSynthesis.cancel();
                          setPreviewingVoice(v.name);
                          const utt = new SpeechSynthesisUtterance(getPreviewText(v.lang, c.botName || 'AI Bot'));
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
                          flexShrink: 0,
                        }}
                      >{isPreviewing ? '⏹' : '▶'}</button>
                      {selected && <span style={{ color: accent, fontSize: 12, fontWeight: 700, flexShrink: 0 }}>✓</span>}
                    </div>
                  );
                })}

                {sorted.length === 0 && voices.length > 0 && (
                  <div style={{ textAlign: 'center', color: '#64748b', fontSize: 11, padding: 16 }}>
                    No voices match your filters
                  </div>
                )}
                {voices.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#64748b', fontSize: 11, padding: 16 }}>
                    Loading voices… (try refreshing if empty)
                  </div>
                )}
              </div>

              {/* ── Speed & Pitch ── */}
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
                  window.speechSynthesis.cancel();
                  const lang = c.ttsVoice ? (voices.find(v => v.name === c.ttsVoice)?.lang || 'en') : 'pt';
                  const utt = new SpeechSynthesisUtterance(getPreviewText(lang, c.botName || 'AI Bot'));
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
          );
        })()}
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
