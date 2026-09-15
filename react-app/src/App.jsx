import React, { useEffect, useRef } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { MultiplayerProvider, useMultiplayer } from './context/MultiplayerContext';
import { SvgIcons } from './components/Common/SvgIcons';
import { ScreenFlash } from './components/Common/ScreenFlash';
import { HomeScreen } from './pages/HomeScreen';
import { LobbyScreen } from './pages/LobbyScreen';
import { GameScreen } from './pages/GameScreen';
import { WinnerScreen } from './pages/WinnerScreen';
import { CreateRoomModal } from './components/Modals/CreateRoomModal';
import { JoinRoomModal } from './components/Modals/JoinRoomModal';
import { RejoinRoomModal } from './components/Modals/RejoinRoomModal';
import { AdminModal } from './components/Modals/AdminModal';
import { SecIntroOverlay } from './components/Overlays/SecIntroOverlay';
import { RoundIntroOverlay } from './components/Overlays/RoundIntroOverlay';
import { JudgeOverlay } from './components/Overlays/JudgeOverlay';
import { TieVsOverlay } from './components/Overlays/TieVsOverlay';
import { installTestBridge } from './services/testBridge';
import SoundManager from './services/soundManager';
import { getAvatarColor } from './services/gameConstants';

const AppContent = () => {
  const game = useGame();
  const multiplayer = useMultiplayer();
  const gameRef = useRef(game);
  gameRef.current = game;

  // Mount Test Bridge for Playwright & Window Globals
  useEffect(() => {
    installTestBridge(gameRef);

    // Check URL parameters for ?room=
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      const upper = roomParam.trim().toUpperCase();
      game.setRoomCode(upper);
      game.openModal('joinRoom');
      const input = document.getElementById('joinCodeInput');
      if (input) input.value = upper;
    } else {
      try {
        const raw = localStorage.getItem('gtf_active_session');
        if (raw) {
          const session = JSON.parse(raw);
          if (session && session.roomCode && (Date.now() - (session.timestamp || 0) < 15 * 60 * 1000)) {
            if (typeof window !== 'undefined' && window.MultiplayerEngine) {
              window.MultiplayerEngine.pendingRejoinSession = session;
            }
            game.setPendingRejoinSession(session);
            game.openModal('rejoinRoom');
          }
        }
      } catch (e) {}
    }
  }, []);

  const handleCreateRoomConfirm = (name, avatar) => {
    game.setPlayerName(name);
    game.setPlayerAvatar(avatar);
    game.setIsHost(true);

    if (typeof window !== 'undefined' && window.MultiplayerEngine) {
      window.MultiplayerEngine.playerName = name;
      window.MultiplayerEngine.playerAvatar = avatar;
      window.MultiplayerEngine.confirmCreateRoom();
      const code = window.MultiplayerEngine.roomCode;
      game.setRoomCode(code);
      if (window.GS?.players) {
        game.setPlayers([...window.GS.players]);
      }
    } else {
      const newCode = Math.random().toString(36).substring(2, 6).toUpperCase();
      game.setRoomCode(newCode);
      game.setPlayers([
        { id: game.playerId, name, avatar, score: 0, isHost: true, loaded: true, color: getAvatarColor(avatar) }
      ]);
    }
    game.closeModals();
    game.showScreen('playerLobbyScreen');
  };

  const handleJoinRoomConfirm = (code, name, avatar) => {
    game.setPlayerName(name);
    game.setPlayerAvatar(avatar);
    game.setIsHost(false);
    game.setRoomCode(code);

    if (typeof window !== 'undefined' && window.MultiplayerEngine) {
      window.MultiplayerEngine.roomCode = code;
      window.MultiplayerEngine.playerName = name;
      window.MultiplayerEngine.playerAvatar = avatar;
      window.MultiplayerEngine.confirmJoinRoom();
      if (window.GS?.players) {
        game.setPlayers([...window.GS.players]);
      }
    } else {
      game.setPlayers([
        { id: game.playerId, name, avatar, score: 0, isHost: false, loaded: true, color: getAvatarColor(avatar) }
      ]);
    }
    game.closeModals();
    game.showScreen('playerLobbyScreen');
  };

  return (
    <>
      <SvgIcons />

      {/* Backdrop & Scrim */}
      <div id="bgBackdrop" className="bg-backdrop" aria-hidden="true"></div>
      <div id="bgFocusScrim" className="bg-focus-scrim" aria-hidden="true"></div>

      {/* Main Screens */}
      <div id="app">
        <HomeScreen
          isActive={game.currentScreen === 'homeScreen'}
          onCreateRoom={() => game.openModal('createRoom')}
          onJoinRoom={() => game.openModal('joinRoom')}
        />

        <LobbyScreen
          isActive={game.currentScreen === 'playerLobbyScreen'}
          roomCode={game.roomCode}
          isHost={game.isHost}
          playerId={game.playerId}
          playerName={game.playerName}
          players={game.players}
          hostSettings={game.hostSettings}
          socketStatus={multiplayer.socketStatus}
          preloadProgress={game.preloadProgress}
          onUpdateSettings={(s) => {
            game.setHostSettings(s);
            multiplayer.sendEvent('UPDATE_HOST_SETTINGS', { settings: s });
          }}
          onRenamePlayer={(idx, name) => {
            game.setPlayers(prev => {
              const copy = [...prev];
              if (copy[idx]) copy[idx].name = name;
              return copy;
            });
            multiplayer.sendEvent('UPDATE_PLAYER_NAME', { playerId: game.players[idx]?.id, name });
          }}
          onRemovePlayer={(idx) => {
            const kicked = game.players[idx];
            game.setPlayers(prev => prev.filter((_, i) => i !== idx));
            if (kicked) multiplayer.sendEvent('PLAYER_KICKED', { targetPlayerId: kicked.id });
          }}
          onStartMatch={() => {
            game.setIsMatchActive(true);
            game.setCurrentPlayIndex(0);
            game.setRoundWinners([]);
            game.showScreen('gameScreen');
            multiplayer.sendEvent('START_GAME', {
              playlist: game.currentPlaylist,
              currentPlaylist: game.currentPlaylist,
              duration: game.hostSettings.timer || 30
            });
            if (typeof window !== 'undefined' && window.MultiplayerEngine?.startMatch) {
              window.MultiplayerEngine.startMatch();
            } else if (typeof window !== 'undefined' && window.PlayerLobby?.start) {
              window.PlayerLobby.start();
            } else {
              multiplayer.sendEvent('ROUND_START', {
                roundIndex: 0,
                frame: game.currentPlaylist[0],
                duration: game.hostSettings.timer || 30
              });
            }
          }}
          onLeaveLobby={() => {
            if (typeof window !== 'undefined' && window.PlayerLobby?.back) {
              window.PlayerLobby.back();
            }
            game.showScreen('homeScreen');
          }}
        />

        <GameScreen
          isActive={game.currentScreen === 'gameScreen'}
          isHost={game.isHost}
          playerId={game.playerId}
          playerName={game.playerName}
          playerAvatar={game.playerAvatar}
          players={game.players}
          currentPlaylist={game.currentPlaylist}
          currentPlayIndex={game.currentPlayIndex}
          currentFrame={game.currentFrame}
          timeRemaining={game.timeRemaining}
          timerMax={game.timerMax}
          isPaused={game.isPaused}
          isRoundFinished={game.isRoundFinished}
          isAnswerRevealed={game.isAnswerRevealed}
          maskedHint={game.maskedHint}
          chatMessages={game.chatMessages}
          onSkipRound={() => {
            game.setIsRoundFinished(true);
            game.setIsAnswerRevealed(true);
            multiplayer.sendEvent('ROUND_FINISH_BROADCAST', {});
          }}
          onNextRound={() => {
            const currentIdx = (typeof window !== 'undefined' && window.MultiplayerEngine?.currentPlayIndex !== undefined)
              ? window.MultiplayerEngine.currentPlayIndex
              : game.currentPlayIndex;
            const nextIdx = currentIdx + 1;
            const activePlaylist = (typeof window !== 'undefined' && window.MultiplayerEngine?.currentPlaylist?.length > 0)
              ? window.MultiplayerEngine.currentPlaylist
              : (game.currentPlaylist && game.currentPlaylist.length > 0 ? game.currentPlaylist : DEFAULT_FRAMES);
            if (nextIdx >= activePlaylist.length) {
              game.showScreen('winnerScreen');
              multiplayer.sendEvent('GAME_OVER_BROADCAST', {});
              return;
            }
            const nextFrame = activePlaylist[nextIdx];
            game.setCurrentPlayIndex(nextIdx);
            game.setCurrentFrame(nextFrame);
            game.setIsRoundFinished(false);
            game.setIsAnswerRevealed(false);
            game.setMaskedHint(null);
            game.setTimeRemaining(game.hostSettings.timer || 30);
            game.setRoundWinners([]);
            if (typeof window !== 'undefined' && window.MultiplayerEngine) {
              window.MultiplayerEngine.currentPlayIndex = nextIdx;
              window.MultiplayerEngine.currentPlaylist = activePlaylist;
              window.MultiplayerEngine.isRoundFinished = false;
              window.MultiplayerEngine.currentRoundWinners = [];
              window.MultiplayerEngine.currentMaskedHint = null;
            }
            if (typeof window !== 'undefined' && window.FrameDisplay?.showFrame && nextFrame) {
              window.FrameDisplay.showFrame(nextFrame);
            }
            multiplayer.sendEvent('ROUND_START', {
              roundIndex: nextIdx,
              frame: nextFrame,
              currentPlaylist: activePlaylist,
              duration: game.hostSettings.timer || 30
            });
          }}
          onTogglePause={() => {
            const next = !game.isPaused;
            game.setIsPaused(next);
            if (typeof window !== 'undefined' && window.MultiplayerEngine) {
              window.MultiplayerEngine.isPaused = next;
            }
            multiplayer.sendEvent('PAUSE_TOGGLE', { isPaused: next });
          }}
          onEndMatch={() => {
            game.setIsMatchActive(false);
            game.showScreen('winnerScreen');
            multiplayer.sendEvent('GAME_OVER_BROADCAST', {});
          }}
          onRequestHint={() => {
            game.adjustPlayerScore(game.playerId, -2);
            const curFrame = game.currentPlaylist[game.currentPlayIndex];
            const ans = curFrame?.answer || 'UNKNOWN';
            const hint = ans.split('').map((ch, i) => (ch === ' ' ? '  ' : i % 2 === 0 ? ch : '_')).join(' ');
            game.setMaskedHint(hint);
            if (typeof window !== 'undefined' && window.MultiplayerEngine) {
              window.MultiplayerEngine.currentMaskedHint = hint;
            }
            multiplayer.sendEvent('HINT_BROADCAST', { maskedHint: hint });
          }}
          onSubmitGuess={(text) => {
            multiplayer.sendEvent('SUBMIT_GUESS', {
              guess: text,
              playerId: game.playerId,
              senderId: game.playerId,
              playerName: game.playerName,
              playerAvatar: game.playerAvatar
            });
          }}
          onSendChatMessage={(text) => {
            multiplayer.sendEvent('CHAT_MESSAGE', {
              msg: {
                id: 'msg_' + Date.now(),
                senderName: game.playerName,
                senderAvatar: game.playerAvatar,
                text
              }
            });
          }}
          onAdjustScore={game.adjustPlayerScore}
        />

        <WinnerScreen
          isActive={game.currentScreen === 'winnerScreen'}
          players={game.players}
          onPlayAgain={() => {
            game.setPlayers(prev => prev.map(p => ({ ...p, score: 0 })));
            game.setIsMatchActive(true);
            game.setCurrentPlayIndex(0);
            game.showScreen('gameScreen');
          }}
          onRematch={() => {
            game.setPlayers(prev => prev.map(p => ({ ...p, score: 0 })));
            game.setIsMatchActive(true);
            game.setCurrentPlayIndex(0);
            game.showScreen('gameScreen');
          }}
          onReturnToLobby={() => {
            game.showScreen('playerLobbyScreen');
          }}
        />
      </div>

      {/* Modals */}
      <CreateRoomModal
        isOpen={game.activeModal === 'createRoom'}
        onClose={game.closeModals}
        onConfirm={handleCreateRoomConfirm}
      />

      <JoinRoomModal
        isOpen={game.activeModal === 'joinRoom'}
        roomCode={game.roomCode}
        onClose={game.closeModals}
        onConfirm={handleJoinRoomConfirm}
      />

      <RejoinRoomModal
        isOpen={game.activeModal === 'rejoinRoom'}
        roomCode={game.pendingRejoinSession?.roomCode}
        playerName={game.pendingRejoinSession?.playerName}
        avatar={game.pendingRejoinSession?.playerAvatar}
        onConfirm={() => {
          let isMatch = false;
          if (typeof window !== 'undefined' && window.MultiplayerEngine?.confirmRejoinRoom) {
            window.MultiplayerEngine.confirmRejoinRoom();
            isMatch = window.MultiplayerEngine.isMatchActive;
          } else {
            isMatch = !!(game.pendingRejoinSession?.isMatchActive || game.pendingRejoinSession?.gameState === 'playing');
          }
          game.closeModals();
          if (isMatch) {
            game.setIsMatchActive(true);
            game.showScreen('gameScreen');
          } else {
            game.showScreen('playerLobbyScreen');
          }
        }}
        onDismiss={() => {
          if (typeof window !== 'undefined' && window.MultiplayerEngine?.dismissRejoinAndStartNew) {
            window.MultiplayerEngine.dismissRejoinAndStartNew();
          }
          game.closeModals();
        }}
      />



      <AdminModal
        isOpen={game.activeModal === 'admin'}
        onClose={game.closeModals}
        onPreviewWinner={() => game.showScreen('winnerScreen')}
      />

      {/* Overlays */}
      <SecIntroOverlay />
      <RoundIntroOverlay />
      <JudgeOverlay />
      <TieVsOverlay />

      {/* Screen Flash */}
      <ScreenFlash />

      {/* Sound Mute/Unmute Button (hidden on winner screen) */}
      <button
        className={`snd-btn ${game.isMuted ? 'muted' : ''}`}
        id="sndBtn"
        onClick={game.toggleMute}
        style={{ display: game.currentScreen === 'winnerScreen' ? 'none' : 'flex' }}
      >
        <svg className="svg-icon">
          <use href={game.isMuted ? '#icon-volume-x' : '#icon-volume-2'} />
        </svg>
      </button>
    </>
  );
};

export const App = () => {
  return (
    <GameProvider>
      <MultiplayerProvider>
        <AppContent />
      </MultiplayerProvider>
    </GameProvider>
  );
};

export default App;
