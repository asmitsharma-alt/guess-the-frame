import React, { useState, useRef, useEffect } from 'react';
import { SecurityUtil } from '../../services/securityUtil';
import { getAvatarSrc } from '../../services/gameConstants';
import { Lightbulb } from 'lucide-react';

export const ChatDrawer = ({ messages = [], onSendMessage, placeholder = 'Type your guess or chat...' }) => {
  const [inputText, setInputText] = useState('');
  const streamRef = useRef(null);

  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const clean = inputText.trim();
    if (!clean) return;
    setInputText('');
    if (typeof onSendMessage === 'function') {
      onSendMessage(clean);
    }
  };

  return (
    <div className="panel-sec chat-panel" id="chatPanel">
      <div className="chat-header">
        <h3>
          <svg className="svg-icon"><use href="#icon-message-circle" /></svg> Live Guess &amp; Chat
        </h3>
      </div>

      <div className="chat-stream" id="liveChatStream" ref={streamRef}>
        {messages.map((m, idx) => (
          <div key={m.id || idx} className={`chat-msg ${m.isSystem ? 'chat-notice-subtle' : ''}`}>
            {m.isSystem ? (
              <span className="cns-text" dangerouslySetInnerHTML={{ __html: m.text }} />
            ) : m.isHint ? (
              <div className="chat-msg-hint">
                <div className="cmh-header"><Lightbulb size={14} strokeWidth={2.5} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> YOUR PRIVATE HINT (-2 PTS)</div>
                <div className="cmh-body">{m.text}</div>
              </div>
            ) : (
              <div className="chat-msg-row" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div className="chat-av" style={{ width: '28px', height: '28px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #1a1a1a' }}>
                  <img src={getAvatarSrc(m.senderAvatar, 'aman')} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/avvtar/aman.svg'; }} />
                </div>
                <div className="chat-body" style={{ flex: 1 }}>
                  <span className="chat-sender" style={{ fontWeight: 800, fontSize: '12px', marginRight: '6px' }}>{m.senderName}:</span>
                  <span className="chat-text" style={{ fontSize: '13px' }}>{m.text}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <form className="chat-input-row" onSubmit={handleSubmit}>
        <input
          type="text"
          id="chatTextInput"
          className="chat-text-input"
          placeholder={placeholder}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          autoComplete="off"
        />
        <button type="submit" className="chat-send-btn">
          SEND
        </button>
      </form>
    </div>
  );
};

export default ChatDrawer;
