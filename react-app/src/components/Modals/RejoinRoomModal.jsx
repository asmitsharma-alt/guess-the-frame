import React from 'react';
import { RefreshCw, X } from 'lucide-react';
import SoundManager from '../../services/soundManager';
import { getAvatarColor, getAvatarSrc } from '../../services/gameConstants';

export const RejoinRoomModal = ({ isOpen, roomCode, playerName, avatar, onConfirm, onDismiss }) => {
  return (
    <div className={`mp-modal-overlay ${isOpen ? 'active' : ''}`} id="rejoinRoomModal">
      <div className="mp-modal-box" style={{ textAlign: 'center', maxWidth: '440px' }}>
        <div className="mp-modal-header" style={{ justifyContent: 'center', position: 'relative' }}>
          <div className="mp-modal-title" style={{ fontSize: '20px' }}><RefreshCw size={18} strokeWidth={2.5} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} /> Active Match Found!</div>
          <button
            className="mp-modal-close"
            onClick={() => {
              SoundManager.playClick();
              if (onDismiss) onDismiss();
            }}
            aria-label="Close modal"
            style={{ position: 'absolute', right: '12px', top: '12px' }}
          >
            <X size={16} strokeWidth={3} />
          </button>
        </div>

        <p style={{ fontSize: '13px', color: '#4a4a4a', fontWeight: 700, marginBottom: '16px' }}>
          You were in an active cinema trivia match. Would you like to rejoin and sync back into the game?
        </p>

        <div style={{ background: '#fafaf4', border: '3px solid #1a1a1a', borderRadius: '12px', padding: '14px', marginBottom: '16px', boxShadow: '4px 4px 0 #1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div id="rejoinAvatarContainer" style={{ width: '52px', height: '52px', borderRadius: '12px', border: '3px solid #1a1a1a', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: getAvatarColor(avatar), '--avatar-bg': getAvatarColor(avatar) }}>
              <img id="rejoinAvatarImg" src={getAvatarSrc(avatar, 'aman')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Avatar" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div id="rejoinPlayerName" style={{ fontSize: '16px', fontWeight: 900, color: '#1a1a1a', textTransform: 'uppercase' }}>{playerName || 'AMAN'}</div>
              <div id="rejoinRoleTag" style={{ fontSize: '11px', fontWeight: 800, color: '#666', textTransform: 'uppercase' }}>Player</div>
            </div>
          </div>

          <div id="rejoinRoomCode" style={{ background: '#FACC15', border: '2px solid #1a1a1a', borderRadius: '8px', padding: '6px 12px', textAlign: 'center', boxShadow: '2px 2px 0 #1a1a1a' }}>
            <div style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', color: '#1a1a1a' }}>ROOM</div>
            <div id="rejoinRoomCodeText" style={{ fontSize: '18px', fontWeight: 900, color: '#1a1a1a', letterSpacing: '1px' }}>{roomCode || '----'}</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            type="button"
            className="mp-btn-primary"
            onClick={() => {
              SoundManager.playClick();
              if (onConfirm) onConfirm();
            }}
            style={{ background: '#2ecc71', fontSize: '15px', padding: '13px 18px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
          >
            <span className="material-symbols-outlined">sync</span>
            REJOIN ACTIVE MATCH
          </button>

          <button
            type="button"
            className="mp-btn-secondary"
            onClick={() => {
              SoundManager.playClick();
              if (onDismiss) onDismiss();
            }}
            style={{ background: '#ffffff', border: '2px solid #1a1a1a', fontSize: '12px', padding: '10px', width: '100%', fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase', boxShadow: '2px 2px 0 #1a1a1a' }}
          >
            Start Fresh / New Game
          </button>
        </div>
      </div>
    </div>
  );
};

export default RejoinRoomModal;
