import React, { useState } from 'react';
import { RefreshCw, X, Crown, Gamepad2, Clapperboard, Users } from 'lucide-react';
import SoundManager from '../../services/soundManager';
import { getAvatarColor, getAvatarSrc } from '../../services/gameConstants';

export const RejoinRoomModal = ({
  isOpen,
  roomCode,
  playerName,
  avatar,
  score = 0,
  isHost,
  isMatchActive,
  currentRound,
  onConfirm,
  onDismiss
}) => {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleConfirm = () => {
    setIsSyncing(true);
    SoundManager.playClick();
    if (onConfirm) {
      onConfirm();
    }
  };

  const handleDismiss = () => {
    setIsSyncing(false);
    SoundManager.playClick();
    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <div className={`mp-modal-overlay ${isOpen ? 'active' : ''}`} id="rejoinRoomModal">
      <div className="mp-modal-box" style={{ textAlign: 'center', maxWidth: '450px' }}>
        <div className="mp-modal-header" style={{ justifyContent: 'center', position: 'relative' }}>
          <div className="mp-modal-title" style={{ fontSize: '20px' }}>
            <RefreshCw size={18} strokeWidth={2.5} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} /> Active Match Found!
          </div>
          <button
            className="mp-modal-close"
            onClick={handleDismiss}
            aria-label="Close modal"
            style={{ position: 'absolute', right: '12px', top: '12px' }}
          >
            <X size={16} strokeWidth={3} />
          </button>
        </div>

        <p style={{ fontSize: '13px', color: '#4a4a4a', fontWeight: 700, marginBottom: '14px' }}>
          You were in an active cinema trivia room. Would you like to sync back into the game?
        </p>

        {/* Match status banner */}
        <div style={{
          background: isMatchActive ? '#FEF3C7' : '#EFF6FF',
          border: '2px solid #1a1a1a',
          borderRadius: '8px',
          padding: '8px 12px',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          fontSize: '12px',
          fontWeight: 800,
          color: '#1a1a1a',
          textTransform: 'uppercase'
        }}>
          {isMatchActive ? (
            <>
              <Clapperboard size={15} strokeWidth={2.5} color="#D97706" />
              <span>Round {currentRound || 1} In Progress</span>
            </>
          ) : (
            <>
              <Users size={15} strokeWidth={2.5} color="#2563EB" />
              <span>Lobby Waiting Room</span>
            </>
          )}
        </div>

        <div style={{ background: '#fafaf4', border: '3px solid #1a1a1a', borderRadius: '12px', padding: '14px', marginBottom: '16px', boxShadow: '4px 4px 0 #1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div id="rejoinAvatarContainer" style={{ width: '52px', height: '52px', borderRadius: '12px', border: '3px solid #1a1a1a', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: getAvatarColor(avatar), '--avatar-bg': getAvatarColor(avatar) }}>
              <img id="rejoinAvatarImg" src={getAvatarSrc(avatar, 'aman')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Avatar" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div id="rejoinPlayerName" style={{ fontSize: '16px', fontWeight: 900, color: '#1a1a1a', textTransform: 'uppercase' }}>{playerName || 'AMAN'}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                <div id="rejoinRoleTag" style={{ fontSize: '11px', fontWeight: 800, color: isHost ? '#B45309' : '#666', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {isHost ? (
                    <>
                      <Crown size={13} strokeWidth={2.5} color="#F59E0B" />
                      <span>Host Controls</span>
                    </>
                  ) : (
                    <>
                      <Gamepad2 size={13} strokeWidth={2.5} color="#6B7280" />
                      <span>Player</span>
                    </>
                  )}
                </div>
                {typeof score === 'number' && score > 0 && (
                  <div id="rejoinScoreBadge" style={{ fontSize: '11px', fontWeight: 900, background: '#FEF08A', border: '1.5px solid #1a1a1a', borderRadius: '6px', padding: '1px 6px', color: '#1a1a1a' }}>
                    {score} PTS
                  </div>
                )}
              </div>
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
            onClick={handleConfirm}
            disabled={isSyncing}
            style={{
              background: '#2ecc71',
              fontSize: '15px',
              padding: '13px 18px',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: isSyncing ? 'not-allowed' : 'pointer',
              opacity: isSyncing ? 0.8 : 1
            }}
          >
            <RefreshCw size={16} strokeWidth={2.5} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'SYNCING MATCH STATE...' : 'REJOIN ACTIVE MATCH'}
          </button>

          <button
            type="button"
            className="mp-btn-secondary"
            onClick={handleDismiss}
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
