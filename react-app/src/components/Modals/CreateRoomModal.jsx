import React, { useState, useEffect } from 'react';
import { useMultiplayer } from '../../context/MultiplayerContext';
import SoundManager from '../../services/soundManager';
import AvatarPicker from '../Common/AvatarPicker';

export const CreateRoomModal = ({ isOpen, onClose, onConfirm }) => {
  const { selectedAvatar, setSelectedAvatar } = useMultiplayer();
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('gtf_player_name') || '');

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
      <div className="mp-modal-box">
        <div className="mp-modal-header">
          <div className="mp-modal-title">⚡ Create Online Room</div>
          <button className="mp-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="mp-form-group">
          <label className="mp-label">Your Player Name</label>
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

        <div className="mp-form-group">
          <label className="mp-label">Select Your Animated Avatar</label>
          <AvatarPicker
            selectedAvatar={selectedAvatar || 'aman'}
            onSelectAvatar={handleSelectAvatar}
          />
        </div>
        <button className="mp-btn-primary" onClick={handleConfirm}>
          CREATE ROOM &amp; GET CODE →
        </button>
      </div>
    </div>
  );
};

export default CreateRoomModal;
