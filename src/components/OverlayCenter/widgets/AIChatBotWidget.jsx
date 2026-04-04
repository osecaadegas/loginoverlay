import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';

const AIChatBot3DAvatar = lazy(() => import('./AIChatBot3DAvatar'));

/**
 * AIChatBotWidget — Overlay widget that shows an AI chatbot.
 * Reads messages from Twitch IRC chat, responds via Google Gemini,
 * and optionally speaks responses using Web Speech API TTS.
 * Supports a 3D animated avatar (GLB model + Three.js).
 *
 * Props: config, theme, allWidgets
 */

/* ── AI Provider helpers ─────────────────────────────── */
async function askGemini(apiKey, model, systemPrompt, history, userMsg) {
  const contents = [];
  if (systemPrompt) {
    contents.push({ role: 'user', parts: [{ text: `[System Instruction]\n${systemPrompt}` }] });
    contents.push({ role: 'model', parts: [{ text: 'Understood.' }] });
  }
  for (const m of history.slice(-10)) {
    contents.push({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] });
  }
  contents.push({ role: 'user', parts: [{ text: userMsg }] });

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents, generationConfig: { maxOutputTokens: 256 } }),
    }
  );
  const data = await res.json();
  if (data?.error) {
    console.error('[AIChatBot] Gemini API error:', data.error.message || data.error);
    return `(API error: ${data.error.message || 'unknown'})`;
  }
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    console.error('[AIChatBot] Unexpected Gemini response:', JSON.stringify(data).slice(0, 500));
    const blocked = data?.candidates?.[0]?.finishReason;
    if (blocked === 'SAFETY') return "(Response blocked by safety filter — try rephrasing!)";
    return "Hmm, I got an empty response. Try again!";
  }
  return text;
}

async function askGroq(apiKey, model, systemPrompt, history, userMsg) {
  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  for (const m of history.slice(-10)) {
    messages.push({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text });
  }
  messages.push({ role: 'user', content: userMsg });

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, max_tokens: 256 }),
  });
  const data = await res.json();
  if (data?.error) {
    console.error('[AIChatBot] Groq API error:', data.error.message || data.error);
    return `(API error: ${data.error.message || 'unknown'})`;
  }
  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    console.error('[AIChatBot] Unexpected Groq response:', JSON.stringify(data).slice(0, 500));
    return "Hmm, I got an empty response. Try again!";
  }
  return text;
}

async function askAI(provider, apiKey, model, systemPrompt, history, userMsg) {
  if (provider === 'groq') return askGroq(apiKey, model, systemPrompt, history, userMsg);
  return askGemini(apiKey, model, systemPrompt, history, userMsg);
}

/* ── TTS helper (returns callbacks for speaking state) ─ */
function speak(text, voice, rate, pitch, onStart, onEnd) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  if (voice) {
    const voices = window.speechSynthesis.getVoices();
    const found = voices.find(v => v.name === voice);
    if (found) utt.voice = found;
  }
  utt.rate = rate || 1;
  utt.pitch = pitch || 1;
  utt.onstart = () => onStart?.();
  utt.onend = () => onEnd?.();
  utt.onerror = () => onEnd?.();
  window.speechSynthesis.speak(utt);
}

/* ── Twitch IRC hook ─────────────────────────────────── */
function useTwitchIRC(channel, triggerWord, onMessage) {
  const wsRef = useRef(null);
  const channelRef = useRef(channel);
  const triggerRef = useRef(triggerWord);
  channelRef.current = channel;
  triggerRef.current = triggerWord;

  useEffect(() => {
    if (!channel) return;
    const ch = channel.toLowerCase().replace(/^#/, '');
    const ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send('CAP REQ :twitch.tv/tags');
      ws.send('NICK justinfan' + Math.floor(Math.random() * 99999));
      ws.send('JOIN #' + ch);
    };

    ws.onmessage = (event) => {
      const lines = event.data.split('\r\n');
      for (const line of lines) {
        if (line.startsWith('PING')) { ws.send('PONG :tmi.twitch.tv'); continue; }
        const m = line.match(/display-name=([^;]*)/i);
        const msgMatch = line.match(/PRIVMSG\s+#\S+\s+:(.+)/);
        if (!msgMatch) continue;
        const text = msgMatch[1].trim();
        const name = m?.[1] || 'viewer';
        const trigger = triggerRef.current || '!ai';
        if (text.toLowerCase().startsWith(trigger.toLowerCase())) {
          onMessage({ username: name, text: text.slice(trigger.length).trim() });
        }
      }
    };

    return () => { ws.close(); };
  }, [channel]);
}

/* ── Main Widget Component ───────────────────────────── */
function AIChatBotWidget({ config }) {
  const c = config || {};
  const aiProvider = c.aiProvider || 'gemini';
  const apiKey = c.geminiApiKey || '';
  const model = aiProvider === 'groq' ? (c.groqModel || 'llama-3.3-70b-versatile') : (c.geminiModel || 'gemini-2.0-flash');
  const systemPrompt = c.systemPrompt || 'You are a fun and friendly stream chatbot. Keep answers short (1-2 sentences max).';
  const twitchChannel = c.twitchChannel || '';
  const triggerWord = c.triggerWord || '!ai';
  const ttsEnabled = c.ttsEnabled !== false;
  const ttsVoice = c.ttsVoice || '';
  const ttsRate = c.ttsRate || 1;
  const ttsPitch = c.ttsPitch || 1;
  const botName = c.botName || 'AI Bot';
  const botAvatar = c.botAvatar || '';
  const maxMessages = c.maxMessages || 20;
  const bgColor = c.bgColor || 'rgba(15,23,42,0.95)';
  const textColor = c.textColor || '#e2e8f0';
  const accentColor = c.accentColor || '#9146FF';
  const fontSize = c.fontSize || 14;
  const width = c.width || 380;
  const height = c.height || 500;
  const showHeader = c.showHeader !== false;

  const [messages, setMessages] = useState([]);
  const [thinking, setThinking] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [avatarState, setAvatarState] = useState('idle'); // 'idle' | 'speaking' | 'thinking'
  const [reactionCount, setReactionCount] = useState(0); // bumped on each new question → triggers jump
  const scrollRef = useRef(null);
  const historyRef = useRef([]);
  const recognitionRef = useRef(null);
  const micEnabled = c.micEnabled !== false;
  const streamerName = c.streamerName || 'Streamer';

  // 3D avatar config
  const avatar3dEnabled = !!c.avatar3dEnabled;
  const avatar3dUrl = c.avatar3dUrl || '';
  const avatar3dSize = c.avatar3dSize || 300;
  const avatar3dParticles = c.avatar3dParticles !== false;
  const avatar3dFlip = !!c.avatar3dFlip;
  const avatar3dPosition = c.avatar3dPosition || 'top'; // 'top', 'left', 'right'

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleChatMessage = async ({ username, text }) => {
    if (!apiKey || !text) return;

    // Trigger jump reaction on new question
    setReactionCount(prev => prev + 1);

    const userMsg = { id: Date.now(), role: 'user', username, text, time: new Date() };
    setMessages(prev => [...prev.slice(-(maxMessages - 2)), userMsg]);
    historyRef.current.push({ role: 'user', text: `${username}: ${text}` });

    setThinking(true);
    setAvatarState('thinking');
    try {
      const reply = await askAI(aiProvider, apiKey, model, systemPrompt, historyRef.current, `${username}: ${text}`);
      const botMsg = { id: Date.now() + 1, role: 'bot', username: botName, text: reply, time: new Date() };
      setMessages(prev => [...prev.slice(-(maxMessages - 1)), botMsg]);
      historyRef.current.push({ role: 'model', text: reply });
      if (ttsEnabled) {
        speak(reply, ttsVoice, ttsRate, ttsPitch,
          () => setAvatarState('speaking'),
          () => setAvatarState('idle'));
      } else {
        setAvatarState('idle');
      }
    } catch (err) {
      console.error('[AIChatBot]', err);
      setAvatarState('idle');
    } finally {
      setThinking(false);
    }
  };

  useTwitchIRC(twitchChannel, triggerWord, handleChatMessage);

  /* ── Speech Recognition (mic) ──────────────────────── */
  const toggleMic = () => {
    if (micActive) {
      recognitionRef.current?.stop();
      setMicActive(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { console.warn('[AIChatBot] Speech Recognition not supported'); return; }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = c.micLang || 'en-US';
    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const transcript = event.results[i][0].transcript.trim();
          if (transcript) handleChatMessage({ username: streamerName, text: transcript });
        }
      }
    };
    recognition.onerror = (e) => { if (e.error !== 'no-speech') { console.error('[AIChatBot mic]', e.error); setMicActive(false); } };
    recognition.onend = () => { if (micActive) recognition.start(); }; // Auto-restart
    recognitionRef.current = recognition;
    recognition.start();
    setMicActive(true);
  };

  // Cleanup on unmount
  useEffect(() => () => { recognitionRef.current?.stop(); window.speechSynthesis?.cancel(); }, []);

  /* ── 3D-only mode: just the avatar, no chat box ─── */
  if (avatar3dEnabled && avatar3dUrl) {
    return (
      <Suspense fallback={
        <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>Loading 3D…</div>
      }>
        <AIChatBot3DAvatar
          avatarUrl={avatar3dUrl}
          state={avatarState}
          accentColor={accentColor}
          width={width}
          height={height}
          showParticles={avatar3dParticles}
          flipModel={avatar3dFlip}
          modelScale={c.avatar3dScale || 1}
          cameraHeight={c.avatar3dCamHeight ?? 0.85}
          cameraDistance={c.avatar3dCamDist ?? 2.2}
          breathing={c.avatar3dBreathing ?? 1}
          sway={c.avatar3dSway ?? 1}
          headMove={c.avatar3dHeadMove ?? 1}
          armMove={c.avatar3dArmMove ?? 1}
          gestures={c.avatar3dGestures ?? 1}
          animSpeed={c.avatar3dSpeed ?? 1}
          reaction={reactionCount}
        />
      </Suspense>
    );
  }

  /* ── Standard chat-only mode ─────────────────────── */
  return (
    <div style={{
      width, height,
      display: 'flex', flexDirection: 'column',
      borderRadius: 12, overflow: 'hidden',
    }}>
      <div style={{
        flex: 1, minWidth: 0,
        background: bgColor, color: textColor,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        fontFamily: "'Inter', sans-serif", fontSize,
        border: `1px solid rgba(255,255,255,0.08)`,
        borderRadius: 12,
      }}>
      {/* Header */}
      {showHeader && (
        <div style={{
          padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          {botAvatar ? (
            <img src={botAvatar} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{
              width: 28, height: 28, borderRadius: '50%', background: accentColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
            }}>🤖</div>
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: fontSize + 1, lineHeight: 1.2 }}>{botName}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
              {thinking ? 'Thinking…' : micActive ? '🎙️ Listening to your mic…' : `Type ${triggerWord} in chat`}
            </div>
          </div>
          {ttsEnabled && (
            <div style={{ fontSize: 12, opacity: 0.4 }} title="TTS enabled">🔊</div>
          )}
          {micEnabled && (
            <button
              onClick={toggleMic}
              title={micActive ? 'Stop listening' : 'Start listening to your mic'}
              style={{
                marginLeft: ttsEnabled ? 0 : 'auto',
                width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                background: micActive ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.08)',
                color: micActive ? '#ef4444' : 'rgba(255,255,255,0.4)',
                animation: micActive ? 'ai-mic-pulse 1.5s ease infinite' : 'none',
                transition: 'all 0.2s',
              }}
            >🎙️</button>
          )}
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', padding: 40, fontSize: 12 }}>
            Waiting for chat messages…<br />Type <strong>{triggerWord}</strong> in Twitch chat
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} style={{
            display: 'flex', flexDirection: 'column',
            alignItems: msg.role === 'bot' ? 'flex-start' : 'flex-end',
          }}>
            <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 2, color: msg.role === 'bot' ? accentColor : 'rgba(255,255,255,0.5)' }}>
              {msg.username}
            </div>
            <div style={{
              padding: '8px 12px', borderRadius: 10, maxWidth: '85%', lineHeight: 1.4, wordBreak: 'break-word',
              background: msg.role === 'bot'
                ? `${accentColor}22`
                : 'rgba(255,255,255,0.06)',
              border: msg.role === 'bot'
                ? `1px solid ${accentColor}44`
                : '1px solid rgba(255,255,255,0.06)',
            }}>
              {msg.text}
            </div>
          </div>
        ))}
        {thinking && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: accentColor, fontSize: 12, opacity: 0.7 }}>
            <span className="ai-typing-dots">●●●</span> {botName} is thinking…
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

export default React.memo(AIChatBotWidget);

/* Inject mic pulse animation */
if (typeof document !== 'undefined' && !document.getElementById('ai-mic-pulse-style')) {
  const style = document.createElement('style');
  style.id = 'ai-mic-pulse-style';
  style.textContent = `@keyframes ai-mic-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); } 50% { box-shadow: 0 0 0 8px rgba(239,68,68,0); } }`;
  document.head.appendChild(style);
}
