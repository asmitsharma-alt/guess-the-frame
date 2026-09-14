import React, { useState, useEffect } from 'react';
import { useMultiplayer } from '../../context/MultiplayerContext';
import SoundManager from '../../services/soundManager';
import AvatarPicker, { CharacterPreviewBadge } from '../Common/AvatarPicker';

export const CreateRoomModal = ({ isOpen, onClose, onConfirm }) => {
  const { selectedAvatar, setSelectedAvatar } = useMultiplayer();
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('gtf_player_name') || '');
  const [showMobileAvatarPicker, setShowMobileAvatarPicker] = useState(false);
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false));

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isOpen) {
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
    SoundManager.playClick();
    const effectiveAvatar = selectedAvatar || localStorage.getItem('gtf_player_avatar') || 'aman';
    const defaultName = (typeof window !== 'undefined' && window.MultiplayerEngine?.getAvatarDisplayName)
      ? window.MultiplayerEngine.getAvatarDisplayName(effectiveAvatar)
      : 'Aman';
    const cleanName = playerName.trim() || defaultName;
    localStorage.setItem('gtf_player_name', cleanName);
    localStorage.setItem('gtf_player_avatar', effectiveAvatar);
    if (typeof window !== 'undefined' && window.MultiplayerEngine) {
      window.MultiplayerEngine.playerName = cleanName;
      window.MultiplayerEngine.playerAvatar = effectiveAvatar;
      window.MultiplayerEngine.selectedAvatarForModal = effectiveAvatar;
    }
    if (typeof onConfirm === 'function') {
      onConfirm(cleanName, effectiveAvatar);
    }
  };

  return (
    <div className={`mp-modal-overlay ${isOpen ? 'active' : ''}`} id="createRoomModal">
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
                  Done ✓
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
            /* MOBILE INITIAL VIEW: HOST NAME & AVATAR TRIGGER CARD + CONFIRM */
            <>
              <div className="mp-badge-pass-header">
                <div className="mp-badge-pass-title">
                  <span>⚡ CREATE ONLINE ROOM</span>
                  <span className="mp-badge-pill-tag">HOST PASS</span>
                </div>
                <button className="mp-modal-close" onClick={onClose}>✕</button>
              </div>

              <div className="mp-credentials-row mp-credentials-row-create">
                {/* 1. Host Name */}
                <div className="mp-form-group" style={{ marginBottom: 0 }}>
                  <label className="mp-label">Your Host Player Name</label>
                  <input
                    type="text"
                    id="hostPlayerNameInput"
                    className="mp-input font-bold"
                    placeholder="Enter your name (e.g. Maverick)"
                    maxLength={16}
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                  />
                </div>

                {/* 2. Select Avatar / Preview Trigger Card */}
                <div className="mp-form-group" style={{ marginBottom: 0 }}>
                  <label className="mp-label">Character Preview (Tap to change)</label>
                  <div
                    className="mp-mobile-avatar-trigger-card"
                    id="createAvatarTriggerCard"
                    onClick={() => setShowMobileAvatarPicker(true)}
                    role="button"
                    tabIndex={0}
                  >
                    <CharacterPreviewBadge selectedAvatar={selectedAvatar || 'aman'} />
                    <div className="mp-mobile-avatar-change-hint">
                      <span>🎨 Select</span>
                      <span className="mp-arrow">➔</span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                id="createRoomConfirmBtn"
                className="mp-btn-primary"
                onClick={handleConfirm}
                style={{ marginTop: '14px' }}
              >
                CREATE ROOM &amp; GET CODE →
              </button>
            </>
          )
        ) : (
          /* DESKTOP LAYOUT (100% UNCHANGED) */
          <>
            <div className="mp-badge-pass-header">
              <div className="mp-badge-pass-title">
                <span>⚡ CREATE ONLINE ROOM</span>
                <span className="mp-badge-pill-tag">HOST PASS</span>
              </div>
              <button className="mp-modal-close" onClick={onClose}>✕</button>
            </div>

            <div className="mp-credentials-row mp-credentials-row-create">
              <div className="mp-form-group" style={{ marginBottom: 0 }}>
                <label className="mp-label">Your Host Player Name</label>
                <input
                  type="text"
                  id="hostPlayerNameInput"
                  className="mp-input font-bold"
                  placeholder="Enter your name (e.g. Maverick)"
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
            <button id="createRoomConfirmBtn" className="mp-btn-primary" onClick={handleConfirm}>
              CREATE ROOM &amp; GET CODE →
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default CreateRoomModal;
