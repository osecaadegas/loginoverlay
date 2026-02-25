import React from 'react';

export default function ChatWidget({ config }) {
  const c = config || {};
  return (
    <div className="overlay-chat">
      <div className="overlay-chat-header">
        {c.channel ? `#${c.channel}` : 'Chat'}
      </div>
      <div className="overlay-chat-messages">
        {(c.messages || []).slice(-(c.maxMessages || 15)).map((msg, i) => (
          <div key={i} className="overlay-chat-msg">
            <span className="overlay-chat-user">{msg.user}:</span> {msg.text}
          </div>
        ))}
        {(!c.messages || c.messages.length === 0) && (
          <div className="overlay-chat-empty">Waiting for messages...</div>
        )}
      </div>
    </div>
  );
}
