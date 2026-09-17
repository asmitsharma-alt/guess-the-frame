import React, { useState, useEffect } from 'react';
import { Ticket, X, Palette, ArrowRight, Check } from 'lucide-react';
import { useMultiplayer } from '../../context/MultiplayerContext';
import SoundManager from '../../services/soundManager';
import AvatarPicker, { CharacterPreviewBadge } from '../Common/AvatarPicker';

export const JoinRoomModal = ({ isOpen, roomCode: propRoomCode = '', onClose, onConfirm }) => {
  const { selectedAvatar, setSelectedAvatar } = useMultiplayer();
  const [roomCode, setRoomCode] = useState(() => {
    if (propRoomCode) return propRoomCode;
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('room');
      if (p) return p.trim().toUpperCase();
    }
    return '';
  });
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('gtf_player_name') || 'Guest');
  const [isConnecting, setIsConnecting] = useState(false);
  const [showMobileAvatarPicker, setShowMobileAvatarPicker] = useState(false);
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false));

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setIsConnecting(false);
      setShowMobileAvatarPicker(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const savedAvatar = localStorage.getItem('gtf_player_avatar');
      if (savedAvatar && !selectedAvatar) {
        setSelectedAvatar(savedAvatar);
      }
    }
  }, [isOpen, selectedAvatar, setSelectedAvatar]);

  useEffect(() => {
    window.__setJoinModalConnecting = (val) => setIsConnecting(!!val);
    window.__resetJoinModalBtn = () => setIsConnecting(false);
    return () => {
      window.__setJoinModalConnecting = null;
      window.__resetJoinModalBtn = null;
    };
  }, []);

  useEffect(() => {
    if (propRoomCode) {
      setRoomCode(propRoomCode);
    } else if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('room');
      if (p) setRoomCode(p.trim().toUpperCase());
    }
  }, [propRoomCode, isOpen]);

  const handleSelectAvatar = (avId) => {
    SoundManager.playClick();
    setSelectedAvatar(avId);
    try {
      localStorage.setItem('gtf_player_avatar', avId);
    } catch (e) {}
    if (typeof window !== 'undefined' && window.MultiplayerEngine) {
      window.MultiplayerEngine.selectedAvatarForModal = avId;
      window.MultiplayerEngine.playerAvatar = avId;
    }
  };

  const handleConfirm = () => {
    if (isConnecting) return;
    SoundManager.playClick();
    const codeEl = document.getElementById('joinCodeInput');
    const cleanCode = ((codeEl && codeEl.value) ? codeEl.value : roomCode).trim().toUpperCase();
    if (!cleanCode) {
      alert('Please enter a valid 4-letter room code.');
      return;
    }

    const effectiveAvatar = selectedAvatar || localStorage.getItem('gtf_player_avatar') || 'aman';
    const nameEl = document.getElementById('joinPlayerNameInput');
    const cleanName = ((nameEl && nameEl.value) ? nameEl.value : playerName).trim() || 'Player';
    localStorage.setItem('gtf_player_name', cleanName);
    localStorage.setItem('gtf_player_avatar', effectiveAvatar);

    setIsConnecting(true);

    if (typeof onConfirm === 'function') {
      onConfirm(cleanCode, cleanName, effectiveAvatar);
    }
  };

  return (
    <div className={`mp-modal-overlay ${isOpen ? 'active' : ''}`} id="joinRoomModal">
      <div className={`mp-modal-box mp-badge-modal-box ${showMobileAvatarPicker ? 'mp-modal-box-dedicated' : ''}`}>
        {isMobile ? (
          showMobileAvatarPicker ? (
            /* DEDICATED MOBILE AVATAR SELECTOR MENU */
            <div className="mp-dedicated-avatar-view">
              <div className="mp-dedicated-avatar-header">
                <button
                  type="button"
                  className="mp-back-btn"
                  onClick={() => setShowMobileAvatarPicker(false)}
                >
                  ← Back
                </button>
                <div className="mp-dedicated-title">CHOOSE AVATAR</div>
                <button
                  type="button"
                  className="mp-done-btn"
                  onClick={() => setShowMobileAvatarPicker(false)}
                >
                  Done <Check size={14} strokeWidth={3} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: '4px' }} />
                </button>
              </div>

              <div className="mp-dedicated-picker-body">
                <AvatarPicker
                  selectedAvatar={selectedAvatar || 'aman'}
                  onSelectAvatar={(avId) => {
                    handleSelectAvatar(avId);
                    setShowMobileAvatarPicker(false);
                  }}
                  hideHeroPreview={true}
                />
              </div>
            </div>
          ) : (
            /* MOBILE INITIAL VIEW: ONLY 3 MAIN OPTIONS (Room Code, Name, Select Avatar) + Confirm */
            <>
              <div className="mp-badge-pass-header">
                <div className="mp-badge-pass-title">
                  <span><Ticket size={16} strokeWidth={2.5} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} /> ONLINE ROOM PASS</span>
                  <span className="mp-badge-pill-tag">BADGE PASS</span>
                </div>
                <button type="button" className="mp-modal-close" onClick={onClose} aria-label="Close modal"><X size={16} strokeWidth={3} /></button>
              </div>

              <div className="mp-credentials-row mp-credentials-row-join">
                {/* 1. Room Code */}
                <div className="mp-form-group" style={{ marginBottom: 0 }}>
                  <label className="mp-label">4-Letter Room Code</label>
                  <input
                    type="text"
                    id="joinCodeInput"
                    className="mp-input mp-code-input"
                    placeholder="FILM"
                    maxLength={6}
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  />
                </div>

                {/* 2. Player Name */}
                <div className="mp-form-group" style={{ marginBottom: 0 }}>
                  <label className="mp-label">Your Player Name</label>
                  <input
                    type="text"
                    id="joinPlayerNameInput"
                    className="mp-input font-bold"
                    placeholder="Enter your name (e.g. Neo)"
                    maxLength={16}
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                  />
                </div>

                {/* 3. Select Avatar / Preview Trigger Card */}
                <div className="mp-form-group" style={{ marginBottom: 0 }}>
                  <label className="mp-label">Player Avatar (Tap to change)</label>
                  <div
                    className="mp-mobile-avatar-trigger-card"
                    id="joinAvatarTriggerCard"
                    onClick={() => setShowMobileAvatarPicker(true)}
                    role="button"
                    tabIndex={0}
                  >
                    <CharacterPreviewBadge selectedAvatar={selectedAvatar || 'aman'} />
                    <div className="mp-mobile-avatar-change-hint">
                      <span><Palette size={14} strokeWidth={2.5} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> Select</span>
                      <span className="mp-arrow"><ArrowRight size={14} strokeWidth={2.5} /></span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                id="joinRoomConfirmBtn"
                className="mp-btn-primary"
                disabled={isConnecting}
                onClick={handleConfirm}
                style={{ marginTop: '14px' }}
              >
                {isConnecting ? '⏳ Connecting to room...' : 'ENTER ROOM →'}
              </button>
            </>
          )
        ) : (
          /* DESKTOP LAYOUT (100% UNCHANGED) */
          <>
            <div className="mp-badge-pass-header">
              <div className="mp-badge-pass-title">
                <span><Ticket size={16} strokeWidth={2.5} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} /> ONLINE ROOM PASS</span>
                <span className="mp-badge-pill-tag">BADGE PASS</span>
              </div>
              <button type="button" className="mp-modal-close" onClick={onClose} aria-label="Close modal"><X size={16} strokeWidth={3} /></button>
            </div>

            <div className="mp-credentials-row mp-credentials-row-join">
              <div className="mp-form-group" style={{ marginBottom: 0 }}>
                <label className="mp-label">4-Letter Room Code</label>
                <input
                  type="text"
                  id="joinCodeInput"
                  className="mp-input mp-code-input"
                  placeholder="FILM"
                  maxLength={6}
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                />
              </div>

              <div className="mp-form-group" style={{ marginBottom: 0 }}>
                <label className="mp-label">Your Player Name</label>
                <input
                  type="text"
                  id="joinPlayerNameInput"
                  className="mp-input font-bold"
                  placeholder="Enter your name (e.g. Neo)"
                  maxLength={16}
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                />
              </div>

              <div className="mp-form-group" style={{ marginBottom: 0 }}>
                <label className="mp-label">Character Preview</label>
                <CharacterPreviewBadge selectedAvatar={selectedAvatar || 'aman'} />
              </div>
            </div>

            <div className="mp-form-group" style={{ marginBottom: 0, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <label className="mp-label">Choose Character From All Avatars</label>
              <AvatarPicker
                selectedAvatar={selectedAvatar || 'aman'}
                onSelectAvatar={handleSelectAvatar}
                hideHeroPreview={true}
              />
            </div>

            <button
              id="joinRoomConfirmBtn"
              className="mp-btn-primary"
              disabled={isConnecting}
              onClick={handleConfirm}
            >
              {isConnecting ? '⏳ Connecting to room...' : 'ENTER ROOM →'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default JoinRoomModal;
