import React, { useState, useEffect } from 'react';
import { useMultiplayer } from '../../context/MultiplayerContext';
import SoundManager from '../../services/soundManager';

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

  useEffect(() => {
    window.__setJoinModalConnecting = (val) => setIsConnecting(!!val);
    window.__resetJoinModalBtn = () => setIsConnecting(false);
    return () => {
      window.__setJoinModalConnecting = null;
      window.__resetJoinModalBtn = null;
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setIsConnecting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (propRoomCode) {
      setRoomCode(propRoomCode);
    } else if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('room');
      if (p) setRoomCode(p.trim().toUpperCase());
    }
  }, [propRoomCode, isOpen]);

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
    if (isConnecting) return;
    SoundManager.playClick();
    const cleanCode = roomCode.trim().toUpperCase();
    if (!cleanCode) {
      alert('Please enter a valid 4-letter room code.');
      return;
    }

    const cleanName = playerName.trim() || 'Player';
    localStorage.setItem('gtf_player_name', cleanName);
    localStorage.setItem('gtf_player_avatar', selectedAvatar);

    setIsConnecting(true);

    if (typeof onConfirm === 'function') {
      onConfirm(cleanCode, cleanName, selectedAvatar);
    }
  };

  return (
    <div className={`mp-modal-overlay ${isOpen ? 'active' : ''}`} id="joinRoomModal">
      <div className="mp-modal-box">
        <div className="mp-modal-header">
          <div className="mp-modal-title">🎮 Join Online Room</div>
          <button className="mp-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="mp-form-group">
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

        <div className="mp-form-group">
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
        <button
          className="mp-btn-primary"
          disabled={isConnecting}
          onClick={handleConfirm}
        >
          {isConnecting ? '⏳ Connecting to room...' : 'ENTER ROOM →'}
        </button>
      </div>
    </div>
  );
};

export default JoinRoomModal;
