import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import SoundManager from '../services/soundManager';
import PaletteManager from '../services/paletteManager';
import { SecurityUtil } from '../services/securityUtil';
import { DEFAULT_FRAMES, DEFAULT_TIE_BREAKERS, AVATAR_MAP } from '../services/gameConstants';

const GameContext = createContext(null);

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

export const GameProvider = ({ children }) => {
  // Screen and modal states
  const [currentScreen, setCurrentScreen] = useState('homeScreen');
  const [activeModal, setActiveModal] = useState(null);
  const [activeOverlay, setActiveOverlay] = useState(null);
  const [isMuted, setIsMuted] = useState(SoundManager.muted);

  // Player identity
  const [playerId, setPlayerId] = useState(() => {
    let pid = localStorage.getItem('gtf_player_id');
    if (!pid) {
      pid = 'p_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('gtf_player_id', pid);
    }
    return pid;
  });

  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem('gtf_player_name') || 'Aman';
  });

  const [playerAvatar, setPlayerAvatar] = useState(() => {
    return localStorage.getItem('gtf_player_avatar') || 'aman';
  });

  const [selectedAvatarForModal, setSelectedAvatarForModal] = useState(() => {
    return localStorage.getItem('gtf_player_avatar') || 'aman';
  });
  const [isHost, setIsHost] = useState(false);
  const [roomCode, setRoomCode] = useState('');

  // Players list in current game/lobby
  const [players, setPlayers] = useState([
    { id: playerId, name: playerName, avatar: playerAvatar, score: 0, isHost: true, loaded: true, color: '#FF6B9D' }
  ]);

  // Host game settings
  const [hostSettings, setHostSettings] = useState({
    category: 'frames',
    categories: ['frames'],
    roundsByMode: { frames: 20 },
    rounds: 20,
    timer: 30
  });

  // Gameplay state
  const [isMatchActive, setIsMatchActive] = useState(false);
  const [currentPlaylist, setCurrentPlaylist] = useState(DEFAULT_FRAMES);
  const [currentPlayIndex, setCurrentPlayIndex] = useState(0);
  const [currentFrame, setCurrentFrame] = useState(DEFAULT_FRAMES[0] || null);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [timerMax, setTimerMax] = useState(30);
  const [isPaused, setIsPaused] = useState(false);
  const [isRoundFinished, setIsRoundFinished] = useState(false);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [maskedHint, setMaskedHint] = useState(null);
  const [roundWinners, setRoundWinners] = useState([]);
  const [chatMessages, setChatMessages] = useState([
    { id: 'welcome', type: 'system', text: '🎬 Welcome to Live Guess Stream!' }
  ]);
  const [pendingRejoinSession, setPendingRejoinSession] = useState(null);

  // Tie breaker state
  const [tieBreakerState, setTieBreakerState] = useState({
    active: false,
    roundIndex: 0,
    playerKeys: [],
    frame: null,
    usedFrameKeys: [],
    frames: DEFAULT_TIE_BREAKERS
  });

  const timerRef = useRef(null);

  // Synchronize player name/avatar changes to localStorage
  useEffect(() => {
    if (playerName) localStorage.setItem('gtf_player_name', playerName);
  }, [playerName]);

  useEffect(() => {
    if (playerAvatar) localStorage.setItem('gtf_player_avatar', playerAvatar);
  }, [playerAvatar]);

  // Screen change wrapper
  const showScreen = useCallback((screenId) => {
    SoundManager.playClick();
    setCurrentScreen(screenId);
    if (screenId === 'homeScreen') {
      PaletteManager.reset();
    }
  }, []);

  // Modal handlers
  const openModal = useCallback((modalName) => {
    SoundManager.playClick();
    setActiveModal(modalName);
  }, []);

  const closeModals = useCallback(() => {
    SoundManager.playClick();
    setActiveModal(null);
  }, []);

  // Sound toggle
  const toggleMute = useCallback(() => {
    const nextMuted = SoundManager.toggleMute();
    setIsMuted(nextMuted);
    return nextMuted;
  }, []);

  // Score adjustments
  const adjustPlayerScore = useCallback((playerIndexOrId, delta) => {
    setPlayers(prev => {
      const copy = [...prev];
      let idx = typeof playerIndexOrId === 'number' 
        ? playerIndexOrId 
        : copy.findIndex(p => p.id === playerIndexOrId || p.name === playerIndexOrId);
      
      if (idx >= 0 && idx < copy.length) {
        copy[idx] = {
          ...copy[idx],
          score: Math.max(0, (copy[idx].score || 0) + delta)
        };
      }
      return copy;
    });
  }, []);

  // Timer loop
  useEffect(() => {
    if (!isMatchActive || isPaused || isRoundFinished || currentScreen !== 'gameScreen') {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          // Auto finish round on timeout
          setIsRoundFinished(true);
          setIsAnswerRevealed(true);
          SoundManager.playReveal();
          return 0;
        }
        if (prev <= 6) {
          SoundManager.playTickWarn();
        } else {
          SoundManager.playTick();
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isMatchActive, isPaused, isRoundFinished, currentScreen]);

  // Value object exposed to components
  const value = {
    currentScreen,
    setCurrentScreen,
    showScreen,
    activeModal,
    setActiveModal,
    openModal,
    closeModals,
    activeOverlay,
    setActiveOverlay,
    isMuted,
    toggleMute,
    playerId,
    setPlayerId,
    playerName,
    setPlayerName,
    playerAvatar,
    setPlayerAvatar,
    selectedAvatarForModal,
    setSelectedAvatarForModal,
    isHost,
    setIsHost,
    roomCode,
    setRoomCode,
    players,
    setPlayers,
    adjustPlayerScore,
    hostSettings,
    setHostSettings,
    isMatchActive,
    setIsMatchActive,
    currentPlaylist,
    setCurrentPlaylist,
    currentPlayIndex,
    setCurrentPlayIndex,
    currentFrame,
    setCurrentFrame,
    timeRemaining,
    setTimeRemaining,
    timerMax,
    setTimerMax,
    isPaused,
    setIsPaused,
    isRoundFinished,
    setIsRoundFinished,
    isAnswerRevealed,
    setIsAnswerRevealed,
    maskedHint,
    setMaskedHint,
    roundWinners,
    setRoundWinners,
    chatMessages,
    setChatMessages,
    pendingRejoinSession,
    setPendingRejoinSession,
    tieBreakerState,
    setTieBreakerState
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};

export default GameContext;
