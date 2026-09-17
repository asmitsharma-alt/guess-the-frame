import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import SoundManager from '../services/soundManager';
import PaletteManager from '../services/paletteManager';
import { SecurityUtil } from '../services/securityUtil';
import { DEFAULT_FRAMES, DEFAULT_TIE_BREAKERS, AVATAR_MAP, getAvatarColor } from '../services/gameConstants';

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
    { id: playerId, name: playerName, avatar: playerAvatar, score: 0, isHost: false, loaded: true, color: getAvatarColor(playerAvatar) }
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
  const [chatMessages, setChatMessages] = useState([]);
  const [pendingRejoinSession, setPendingRejoinSession] = useState(null);
  const [preloadProgress, setPreloadProgress] = useState({
    loaded: 0,
    total: 0,
    percent: 0,
    isComplete: false,
    isLoading: false
  });

  // Tie breaker state
  const [tieBreakerState, setTieBreakerState] = useState({
    active: false,
    roundIndex: 0,
    playerKeys: [],
    frame: null,
    usedFrameKeys: [],
    frames: DEFAULT_TIE_BREAKERS
  });

  // Authoritative State Versioning and Timestamps
  const [stateVersion, setStateVersion] = useState(0);
  const [roundStartedAt, setRoundStartedAt] = useState(0);
  const [roundEndsAt, setRoundEndsAt] = useState(0);
  const [clockOffset, setClockOffset] = useState(0);

  const timerRef = useRef(null);
  const lastTickSecRef = useRef(null);
  const lastRoundKeyRef = useRef(null);

  // Synchronize player name/avatar changes to localStorage
  useEffect(() => {
    if (playerName) localStorage.setItem('gtf_player_name', playerName);
  }, [playerName]);

  useEffect(() => {
    if (playerAvatar) {
      localStorage.setItem('gtf_player_avatar', playerAvatar);
      setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, avatar: playerAvatar, color: getAvatarColor(playerAvatar) } : p));
    }
  }, [playerAvatar, playerId]);

  // Synchronize active screen and match state to audio orchestrator
  useEffect(() => {
    SoundManager.setScreenState(currentScreen, isMatchActive);
  }, [currentScreen, isMatchActive]);

  // Screen change wrapper (supports silent=true for programmatic/network transitions)
  const showScreen = useCallback((screenId, options = {}) => {
    setCurrentScreen(prevScreen => {
      if (!options?.silent && prevScreen !== screenId) {
        SoundManager.playClick();
      }
      return screenId;
    });
    if (screenId === 'homeScreen') {
      PaletteManager.reset();
    }
    if (screenId === 'playerLobbyScreen' || screenId === 'lobbyScreen') {
      SoundManager.stopMusic();
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

  // Server-authoritative epoch timer loop with deduplicated milestone warnings
  useEffect(() => {
    if (!isMatchActive || isPaused || isRoundFinished || currentScreen !== 'gameScreen') {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      lastTickSecRef.current = null;
      return;
    }

    const roundKey = `${currentPlayIndex}_${roundStartedAt}`;
    if (lastRoundKeyRef.current !== roundKey) {
      lastRoundKeyRef.current = roundKey;
      lastTickSecRef.current = null;
    }

    const calculateTimeRemaining = () => {
      let secs = 0;
      if (roundEndsAt > 0) {
        const now = Date.now() + clockOffset;
        const msRemaining = Math.max(0, roundEndsAt - now);
        secs = Math.ceil(msRemaining / 1000);
        setTimeRemaining(secs);
      } else {
        setTimeRemaining(prev => {
          secs = Math.max(0, prev - 1);
          return secs;
        });
      }

      // Authoritative milestone warnings (10s warning, <=5s countdown urgency, 0s timeout)
      // Strictly guarded to active gameplay
      if (currentScreen === 'gameScreen' && isMatchActive && !isPaused && !isRoundFinished) {
        if (secs > 0 && secs !== lastTickSecRef.current) {
          lastTickSecRef.current = secs;
          if (secs === 10) {
            SoundManager.playOnce('tickWarn', `timer_${roundKey}_10s`);
          } else if (secs <= 5) {
            SoundManager.playOnce('tickWarn', `timer_${roundKey}_${secs}s`);
          }
        } else if (secs === 0 && lastTickSecRef.current !== 0) {
          lastTickSecRef.current = 0;
          SoundManager.playOnce('timeout', `timer_${roundKey}_0s`);
        }
      }
    };

    calculateTimeRemaining();
    timerRef.current = setInterval(calculateTimeRemaining, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      lastTickSecRef.current = null;
    };
  }, [isMatchActive, isPaused, isRoundFinished, currentScreen, roundEndsAt, clockOffset]);

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
    setTieBreakerState,
    preloadProgress,
    setPreloadProgress,
    stateVersion,
    setStateVersion,
    roundStartedAt,
    setRoundStartedAt,
    roundEndsAt,
    setRoundEndsAt,
    clockOffset,
    setClockOffset
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};

export default GameContext;
