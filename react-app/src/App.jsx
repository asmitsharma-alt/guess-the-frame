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
    SoundManager.init();

    // Check URL parameters for ?room=
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    let session = null;
    try {
      const raw = localStorage.getItem('gtf_active_session');
      if (raw) session = JSON.parse(raw);
    } catch (e) {}

    if (roomParam) {
      const upper = roomParam.trim().toUpperCase();
      if (session && session.roomCode === upper && session.playerName) {
        // Active participant refreshing or returning to same room -> restore directly
        if (session.playerId && game.setPlayerId) game.setPlayerId(session.playerId);
        game.setRoomCode(upper);
        game.setPlayerName(session.playerName);
        if (session.playerAvatar) game.setPlayerAvatar(session.playerAvatar);
        if (typeof session.isHost === 'boolean') game.setIsHost(session.isHost);
        const isMatch = Boolean(session.isMatchActive || session.gameState === 'playing' || session.gameState === 'round_reveal');
        if (isMatch) {
          game.setIsMatchActive(true);
          game.showScreen('gameScreen', { silent: true });
        } else {
          game.setIsMatchActive(false);
          game.showScreen(session.isHost ? 'lobbyScreen' : 'playerLobbyScreen', { silent: true });
        }
      } else {
        game.setRoomCode(upper);
        game.openModal('joinRoom');
        const input = document.getElementById('joinCodeInput');
        if (input) input.value = upper;
      }
    } else if (session && session.roomCode && (Date.now() - (session.timestamp || 0) < 15 * 60 * 1000)) {
      if (typeof window !== 'undefined' && window.MultiplayerEngine) {
        window.MultiplayerEngine.pendingRejoinSession = session;
      }
      game.setPendingRejoinSession(session);
      game.openModal('rejoinRoom');
    }
  }, []);

  const handleCreateRoomConfirm = (name, avatar) => {
    game.setPlayerName(name);
    game.setPlayerAvatar(avatar);
    game.setIsHost(true);

    let roomCodeToSet = '';
    if (typeof window !== 'undefined' && window.MultiplayerEngine) {
      window.MultiplayerEngine.playerName = name;
      window.MultiplayerEngine.playerAvatar = avatar;
      window.MultiplayerEngine.confirmCreateRoom();
      roomCodeToSet = window.MultiplayerEngine.roomCode;
      game.setRoomCode(roomCodeToSet);
      if (window.GS?.players) {
        game.setPlayers([...window.GS.players]);
      }
    } else {
      roomCodeToSet = Math.random().toString(36).substring(2, 6).toUpperCase();
      game.setRoomCode(roomCodeToSet);
      game.setPlayers([
        { id: game.playerId, name, avatar, score: 0, isHost: true, loaded: true, color: getAvatarColor(avatar) }
      ]);
    }

    try {
      localStorage.setItem('gtf_active_session', JSON.stringify({
        roomCode: roomCodeToSet,
        playerName: name,
        playerAvatar: avatar,
        playerId: game.playerId,
        isHost: true,
        timestamp: Date.now()
      }));
    } catch (e) {}

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

    try {
      localStorage.setItem('gtf_active_session', JSON.stringify({
        roomCode: code,
        playerName: name,
        playerAvatar: avatar,
        playerId: game.playerId,
        isHost: false,
        timestamp: Date.now()
      }));
    } catch (e) {}

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
          isActive={game.currentScreen === 'playerLobbyScreen' || game.currentScreen === 'lobbyScreen'}
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
            const p = game.players[idx];
            if (p) {
              multiplayer.sendEvent('UPDATE_PLAYER_NAME', { playerId: p.id, name });
            }
          }}
          onRemovePlayer={(idx) => {
            const kicked = game.players[idx];
            if (kicked && game.isHost) {
              multiplayer.sendEvent('KICK_PLAYER', { targetPlayerId: kicked.id });
            }
          }}
          onUpdateAvatar={(avatar) => {
            game.setPlayerAvatar(avatar);
            multiplayer.sendEvent('UPDATE_PLAYER_AVATAR', { avatar, color: getAvatarColor(avatar) });
          }}
          onToggleReady={(ready) => {
            multiplayer.sendEvent('PLAYER_READY', { ready });
          }}
          onStartMatch={() => {
            multiplayer.sendEvent('START_MATCH', {});
            if (typeof window !== 'undefined' && window.PlayerLobby?.start) {
              window.PlayerLobby.start();
            }
          }}
          onLeaveLobby={() => {
            multiplayer.sendEvent('LEAVE_ROOM', {});
            if (typeof window !== 'undefined' && window.PlayerLobby?.back) {
              window.PlayerLobby.back();
            }
            if (game.clearActiveSession) {
              game.clearActiveSession();
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
          roundWinners={game.roundWinners || []}
          onSkipRound={() => {
            multiplayer.sendEvent('SKIP_ROUND', {});
          }}
          onNextRound={() => {
            multiplayer.sendEvent('NEXT_ROUND', {
              currentRoundIndex: game.currentPlayIndex
            });
          }}
          onTogglePause={() => {
            multiplayer.sendEvent('TOGGLE_PAUSE', {});
          }}
          onEndMatch={() => {
            multiplayer.sendEvent('END_MATCH', {});
          }}
          onRequestHint={() => {
            multiplayer.sendEvent('REQUEST_HINT', {});
          }}
          onSubmitGuess={(text) => {
            const pid = (typeof window !== 'undefined' && window.MultiplayerEngine?.playerId) || game.playerId;
            const pname = (typeof window !== 'undefined' && window.MultiplayerEngine?.playerName) || game.playerName;
            const pav = (typeof window !== 'undefined' && window.MultiplayerEngine?.playerAvatar) || game.playerAvatar;
            multiplayer.sendEvent('SUBMIT_GUESS', {
              guess: text,
              text,
              playerId: pid,
              senderId: pid,
              playerName: pname,
              playerAvatar: pav
            });
          }}
          onSendChatMessage={(text) => {
            const pid = (typeof window !== 'undefined' && window.MultiplayerEngine?.playerId) || game.playerId;
            const pname = (typeof window !== 'undefined' && window.MultiplayerEngine?.playerName) || game.playerName;
            const pav = (typeof window !== 'undefined' && window.MultiplayerEngine?.playerAvatar) || game.playerAvatar;
            const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
            multiplayer.sendEvent('CHAT_MESSAGE', {
              senderId: pid,
              id: msgId,
              text,
              msg: {
                id: msgId,
                senderId: pid,
                senderName: pname,
                senderAvatar: pav,
                text,
                timestamp: Date.now()
              }
            });
          }}
          onAdjustScore={(playerIdx, points) => {
            const target = game.players[playerIdx];
            if (target && game.isHost) {
              multiplayer.sendEvent('ADJUST_SCORE', {
                targetPlayerId: target.id,
                playerId: target.id,
                points: points
              });
            }
          }}
          onSendReaction={(messageId, reaction) => {
            if (multiplayer.sendReaction) {
              multiplayer.sendReaction(messageId, reaction);
            }
          }}
        />

        <WinnerScreen
          isActive={game.currentScreen === 'winnerScreen'}
          players={game.players}
          onPlayAgain={() => {
            multiplayer.sendEvent('REMATCH', {});
          }}
          onRematch={() => {
            multiplayer.sendEvent('REMATCH', {});
          }}
          onReturnToLobby={() => {
            multiplayer.sendEvent('RETURN_TO_LOBBY', {});
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
        score={game.pendingRejoinSession?.score}
        isHost={game.pendingRejoinSession?.isHost}
        isMatchActive={Boolean(game.pendingRejoinSession?.isMatchActive || game.pendingRejoinSession?.gameState === 'playing' || game.pendingRejoinSession?.gameState === 'round_reveal')}
        currentRound={game.pendingRejoinSession?.currentPlayIndex !== undefined ? (game.pendingRejoinSession.currentPlayIndex + 1) : null}
        onConfirm={() => {
          const session = game.pendingRejoinSession || (() => {
            try {
              const raw = localStorage.getItem('gtf_active_session');
              return raw ? JSON.parse(raw) : null;
            } catch (e) { return null; }
          })();

          if (multiplayer?.rejoinRoom && session) {
            multiplayer.rejoinRoom(session);
          } else if (typeof window !== 'undefined' && window.MultiplayerEngine?.confirmRejoinRoom) {
            window.MultiplayerEngine.confirmRejoinRoom();
          }

          game.closeModals();
        }}
        onDismiss={() => {
          if (typeof window !== 'undefined' && window.MultiplayerEngine?.dismissRejoinAndStartNew) {
            window.MultiplayerEngine.dismissRejoinAndStartNew();
          }
          if (game.clearActiveSession) {
            game.clearActiveSession();
          } else {
            try { localStorage.removeItem('gtf_active_session'); } catch (e) {}
            game.setPendingRejoinSession(null);
            game.setRoomCode('');
          }
          game.closeModals();
          game.showScreen('homeScreen');
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
        aria-label={game.isMuted ? 'Unmute Sound' : 'Mute Sound'}
        title={game.isMuted ? 'Unmute Sound' : 'Mute Sound'}
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
