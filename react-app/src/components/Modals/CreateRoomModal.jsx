import React, { useState } from 'react';
import { useMultiplayer } from '../../context/MultiplayerContext';
import SoundManager from '../../services/soundManager';

export const CreateRoomModal = ({ isOpen, onClose, onConfirm }) => {
  const { selectedAvatar, setSelectedAvatar } = useMultiplayer();
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('gtf_player_name') || '');

  const avatars = [
    { id: 'aman', name: 'Aman', src: '/avvtar/aman.svg' },
    { id: 'amish', name: 'Amish', src: '/avvtar/amish.svg' },
    { id: 'aziz', name: 'Aziz', src: '/avvtar/aziz.svg' },
    { id: 'vish', name: 'Vish', src: '/avvtar/vish.svg' }
  ];

  const handleSelectAvatar = (avId) => {
    SoundManager.playClick();
    setSelectedAvatar(avId);
    if (typeof window !== 'undefined' && window.MultiplayerEngine) {
      window.MultiplayerEngine.selectedAvatarForModal = avId;
      window.MultiplayerEngine.playerAvatar = avId;
    }
  };

  const handleConfirm = () => {
    SoundManager.playClick();
    const defaultName = (typeof window !== 'undefined' && window.MultiplayerEngine?.getAvatarDisplayName)
      ? window.MultiplayerEngine.getAvatarDisplayName(selectedAvatar)
      : 'Aman';
    const cleanName = playerName.trim() || defaultName;
    localStorage.setItem('gtf_player_name', cleanName);
    localStorage.setItem('gtf_player_avatar', selectedAvatar);
    if (typeof window !== 'undefined' && window.MultiplayerEngine) {
      window.MultiplayerEngine.playerName = cleanName;
      window.MultiplayerEngine.playerAvatar = selectedAvatar;
      window.MultiplayerEngine.selectedAvatarForModal = selectedAvatar;
    }
    if (typeof onConfirm === 'function') {
      onConfirm(cleanName, selectedAvatar);
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
          <div className="mp-avatar-grid">
            {avatars.map((av) => (
              <div
                key={av.id}
                className={`mp-avatar-option ${selectedAvatar === av.id ? 'selected' : ''}`}
                data-avatar={av.id}
                onClick={() => handleSelectAvatar(av.id)}
              >
                <img src={av.src} alt={av.name} />
                <div className="mp-avatar-name">{av.name}</div>
              </div>
            ))}
          </div>
        </div>
        <button className="mp-btn-primary" onClick={handleConfirm}>
          CREATE ROOM &amp; GET CODE →
        </button>
      </div>
    </div>
  );
};

export default CreateRoomModal;
