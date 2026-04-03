import React, { useState, useEffect, useRef } from 'react';

/**
 * AIChatBotWidget — Overlay widget that shows an AI chatbot.
 * Reads messages from Twitch IRC chat, responds via Google Gemini,
 * and optionally speaks responses using Web Speech API TTS.
 *
 * Props: config, theme, allWidgets
 */

/* ── Gemini helper ───────────────────────────────────── */
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
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't think of anything to say!";
}

/* ── TTS helper ──────────────────────────────────────── */
function speak(text, voice, rate, pitch) {
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
  const apiKey = c.geminiApiKey || '';
  const model = c.geminiModel || 'gemini-2.0-flash';
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
  const scrollRef = useRef(null);
  const historyRef = useRef([]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleChatMessage = async ({ username, text }) => {
    if (!apiKey || !text) return;

    const userMsg = { id: Date.now(), role: 'user', username, text, time: new Date() };
    setMessages(prev => [...prev.slice(-(maxMessages - 2)), userMsg]);
    historyRef.current.push({ role: 'user', text: `${username}: ${text}` });

    setThinking(true);
    try {
      const reply = await askGemini(apiKey, model, systemPrompt, historyRef.current, `${username}: ${text}`);
      const botMsg = { id: Date.now() + 1, role: 'bot', username: botName, text: reply, time: new Date() };
      setMessages(prev => [...prev.slice(-(maxMessages - 1)), botMsg]);
      historyRef.current.push({ role: 'model', text: reply });
      if (ttsEnabled) speak(reply, ttsVoice, ttsRate, ttsPitch);
    } catch (err) {
      console.error('[AIChatBot]', err);
    } finally {
      setThinking(false);
    }
  };

  useTwitchIRC(twitchChannel, triggerWord, handleChatMessage);

  return (
    <div style={{
      width, height, background: bgColor, color: textColor, borderRadius: 12,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      fontFamily: "'Inter', sans-serif", fontSize,
      border: `1px solid rgba(255,255,255,0.08)`,
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
              {thinking ? 'Thinking…' : `Type ${triggerWord} in chat`}
            </div>
          </div>
          {ttsEnabled && (
            <div style={{ marginLeft: 'auto', fontSize: 12, opacity: 0.4 }} title="TTS enabled">🔊</div>
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
  );
}

export default React.memo(AIChatBotWidget);
