import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useGame } from './GameContext';
import SoundManager from '../services/soundManager';
import { NetworkSecurity } from '../services/securityUtil';
import { getAvatarColor } from '../services/gameConstants';
import { usePartySocket } from '../hooks/usePartySocket';
import { AssetPreloader } from '../services/assetPreloader';

const MultiplayerContext = createContext(null);

export const useMultiplayer = () => {
  const context = useContext(MultiplayerContext);
  if (!context) {
    throw new Error('useMultiplayer must be used within a MultiplayerProvider');
  }
  return context;
};

export const MultiplayerProvider = ({ children }) => {
  const game = useGame();
  const [socketStatus, setSocketStatus] = useState('offline'); // 'connected' | 'connecting' | 'offline'
  const handleIncomingMessageRef = useRef(null);
  const seenMessagesRef = useRef(new Map());
  const latestStateVersionRef = useRef(0);
  if (typeof window !== 'undefined') window.__latestStateVersionRef = latestStateVersionRef;

  // Inbound PartyKit message router
  const handlePartyMessage = useCallback((msg) => {
    if (handleIncomingMessageRef.current) {
      handleIncomingMessageRef.current(msg);
    }
  }, []);

  // Cloudflare Workers PartyKit Socket Hook (Authoritative Edge Transport)
  const party = usePartySocket({
    roomCode: game.roomCode,
    playerId: game.playerId,
    playerName: game.playerName,
    playerAvatar: game.playerAvatar,
    playerColor: game.playerColor,
    isHost: game.isHost,
    preloaded: Boolean(game.preloadProgress?.isComplete),
    onMessage: handlePartyMessage
  });

  // Reactive Connection Status Sync directly from PartySocket
  useEffect(() => {
    if (party.connectionState === 'CONNECTED') {
      setSocketStatus('connected');
    } else if (party.connectionState === 'CONNECTING' || party.connectionState === 'RECONNECTING') {
      setSocketStatus('connecting');
    } else {
      setSocketStatus('offline');
    }
  }, [party.connectionState]);

  useEffect(() => {
    window.__setMultiplayerSocketStatus = (status) => setSocketStatus(status);
    window.__handleMultiplayerIncomingMessage = (msg) => {
      try {
        if (handleIncomingMessageRef.current) {
          handleIncomingMessageRef.current(msg);
        }
      } catch (e) {
        console.error('[MultiplayerContext] Incoming message error:', e);
      }
    };

    return () => {
      window.__setMultiplayerSocketStatus = null;
      window.__handleMultiplayerIncomingMessage = null;
    };
  }, []);

  // Socket reconnection helper
  const connectSocket = useCallback((roomCodeToJoin) => {
    if (roomCodeToJoin && game.setRoomCode) {
      game.setRoomCode(roomCodeToJoin);
    }
    if (party.reconnect) {
      party.reconnect();
    }
  }, [game.setRoomCode, party]);

  // Authoritative Command Dispatcher to Cloudflare Workers PartyKit Edge Socket
  const sendEvent = useCallback((type, payload = {}) => {
    const commandId = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : ('cmd_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9));

    const msg = {
      commandId,
      type,
      roomCode: game.roomCode,
      playerId: game.playerId,
      senderId: game.playerId,
      clientVersion: game.stateVersion || 0,
      timestamp: Date.now(),
      payload,
      ...payload
    };

    // 1. Dispatch via Cloudflare Workers PartyKit Edge Socket (Authoritative Transport)
    party.send(msg);

    // 2. Dispatch to window.MultiplayerEngine (strictly if mock transport is requested)
    if (typeof window !== 'undefined' && window.__E2E_MOCK_TRANSPORT__ && window.MultiplayerEngine?.sendEvent) {
      if (game.roomCode && !window.MultiplayerEngine.roomCode) {
        window.MultiplayerEngine.roomCode = game.roomCode;
        window.MultiplayerEngine.roomId = 'room_' + game.roomCode;
      }
      try {
        window.MultiplayerEngine.sendEvent(type, payload);
      } catch (e) {}
    }
  }, [game.roomCode, game.playerId, game.stateVersion, party]);

  // Reaction Dispatcher (Thumbs up / Thumbs down on winner announcements)
  const sendReaction = useCallback((targetMessageId, reaction) => {
    if (!targetMessageId || !reaction) return;
    sendEvent('REACTION', {
      targetMessageId,
      reaction,
      playerId: game.playerId,
      playerName: game.playerName
    });
  }, [sendEvent, game.playerId, game.playerName]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__sendMultiplayerReaction = sendReaction;
      if (window.MultiplayerEngine) {
        window.MultiplayerEngine.sendReaction = sendReaction;
      }
    }
  }, [sendReaction]);

  // Background parallel asset preloading & peer status broadcast
  useEffect(() => {
    const unsub = AssetPreloader.subscribe((prog) => {
      if (game.setPreloadProgress) {
        game.setPreloadProgress(prog);
      }
    });

    AssetPreloader.preloadAll().then(() => {
      if (game.roomCode) {
        sendEvent('PLAYER_PRELOAD_STATUS', {
          playerId: game.playerId,
          percent: 100,
          ready: true
        });
      }
    });

    return () => unsub();
  }, [game.roomCode, game.playerId, sendEvent]);

  // Incoming Authoritative Event Router
  const handleIncomingMessage = useCallback((msg) => {
    if (!msg || !msg.type) return;

    // Deduplicate incoming packets
    const effId = msg.commandId || msg.id || msg.msg?.id || msg.guess || '';
    const effSender = msg.senderId || msg.msg?.senderId || msg.playerId || '';
    const effTime = msg.timestamp || msg.msg?.timestamp || '';
    const msgKey = `${msg.type}_${effSender}_${effId}_${effTime}`;
    const now = Date.now();

    if (msgKey && seenMessagesRef.current.has(msgKey)) {
      const seenTime = seenMessagesRef.current.get(msgKey);
      if (now - seenTime < 4000) {
        return; // Duplicate ignored
      }
    }
    seenMessagesRef.current.set(msgKey, now);
    if (seenMessagesRef.current.size > 200) {
      for (const [k, time] of seenMessagesRef.current.entries()) {
        if (now - time > 10000) seenMessagesRef.current.delete(k);
      }
    }

    // Security validation
    if (typeof NetworkSecurity !== 'undefined' && NetworkSecurity.validateIncomingMessage) {
      if (!NetworkSecurity.validateIncomingMessage(msg, game.roomCode, game.players, game.isHost)) {
        return;
      }
    }

    // Monotonic State Versioning Guard across all packets
    const version = msg.version ?? msg.state?.version;
    if (typeof version === 'number') {
      if (version < latestStateVersionRef.current) {
        console.warn(`[MultiplayerContext] Discarding stale packet: v${version} < v${latestStateVersionRef.current} (${msg.type})`);
        return; // Out-of-order stale packet discarded synchronously
      }
      latestStateVersionRef.current = version;
      if (game.setStateVersion) {
        game.setStateVersion(version);
      }
    }

    switch (msg.type) {
      case 'COMMAND_REJECTED': {
        console.warn(`[MultiplayerContext] Command rejected: ${msg.command} (${msg.reason || msg.code})`);
        if (typeof window !== 'undefined') {
          window.__lastCommandRejected = msg;
          window.dispatchEvent(new CustomEvent('command_rejected', { detail: msg }));
        }
        break;
      }

      case 'STATE_UPDATE':
      case 'SYNC_ROOM_STATE':
      case 'ROOM_STATE': {
        const state = msg.state || msg;

        // Synchronize Server Clock Offset
        if (msg.serverTime && game.setClockOffset) {
          game.setClockOffset(msg.serverTime - Date.now());
        }

        // Authoritative Players List & Host Role
        if (state.players && Array.isArray(state.players)) {
          game.setPlayers(state.players);
          if (typeof window !== 'undefined') {
            if (window.GS) window.GS.players = state.players;
            if (window.MultiplayerEngine) window.MultiplayerEngine.players = state.players;
          }
          const myPlayer = state.players.find(p => p.id === game.playerId);
          if (myPlayer && typeof myPlayer.isHost === 'boolean') {
            game.setIsHost(myPlayer.isHost);
            if (typeof window !== 'undefined' && window.MultiplayerEngine) {
              window.MultiplayerEngine.isHost = myPlayer.isHost;
            }
          }
        }

        // Host Settings
        const settings = state.settings || state.hostSettings;
        if (settings) {
          game.setHostSettings(settings);
        }

        // Playlist
        const playlist = state.currentPlaylist || state.playlist;
        if (playlist && Array.isArray(playlist) && playlist.length > 0) {
          game.setCurrentPlaylist(playlist);
          if (typeof window !== 'undefined' && window.MultiplayerEngine) {
            window.MultiplayerEngine.currentPlaylist = playlist;
          }
        }

        // Round State
        if (state.round) {
          const roundIdx = state.round.index ?? 0;
          game.setCurrentPlayIndex(roundIdx);
          if (typeof window !== 'undefined' && window.MultiplayerEngine) {
            window.MultiplayerEngine.currentPlayIndex = roundIdx;
          }

          if (state.round.frame) {
            game.setCurrentFrame(state.round.frame);
            if (typeof window !== 'undefined' && window.FrameDisplay?.showFrame) {
              window.FrameDisplay.showFrame(state.round.frame);
            }
          }

          if (state.round.startedAt && game.setRoundStartedAt) {
            game.setRoundStartedAt(state.round.startedAt);
          }
          if (state.round.endsAt && game.setRoundEndsAt) {
            game.setRoundEndsAt(state.round.endsAt);
          }
          if (state.round.maskedHint !== undefined) {
            game.setMaskedHint(state.round.maskedHint);
          }
          if (state.round.winners) {
            game.setRoundWinners(state.round.winners);
          }
        } else if (msg.frame) {
          game.setCurrentFrame(msg.frame);
          if (msg.currentPlayIndex !== undefined) {
            game.setCurrentPlayIndex(msg.currentPlayIndex);
          }
        }

        // Paused State
        if (typeof state.isPaused === 'boolean') {
          game.setIsPaused(state.isPaused);
        }

        // Time Remaining
        if (typeof state.timeRemaining === 'number') {
          game.setTimeRemaining(state.timeRemaining);
        }

        // Phase & Authoritative Screen Restoration (e.g. on Reconnect / Refresh)
        const phase = state.phase;
        if (phase) {
          if (phase === 'LOBBY') {
            game.setIsMatchActive(false);
            game.setIsRoundFinished(false);
            game.setIsAnswerRevealed(false);
            game.showScreen('playerLobbyScreen');
          } else if (phase === 'ROUND_ACTIVE') {
            game.setIsMatchActive(true);
            game.setIsRoundFinished(false);
            game.setIsAnswerRevealed(false);
            game.showScreen('gameScreen');
          } else if (phase === 'ROUND_REVEAL') {
            game.setIsMatchActive(true);
            game.setIsRoundFinished(true);
            game.setIsAnswerRevealed(true);
            game.showScreen('gameScreen');
          } else if (phase === 'MATCH_OVER') {
            game.setIsMatchActive(false);
            game.setIsRoundFinished(true);
            game.setIsAnswerRevealed(true);
            game.showScreen('winnerScreen');
          }
        } else if (msg.currentScreen) {
          game.showScreen(msg.currentScreen);
        }

        // Authoritative Chat History
        const chatItems = state.chat || state.chatMessages;
        if (chatItems && Array.isArray(chatItems)) {
          game.setChatMessages(prev => {
            if (chatItems.length === 0 && prev.length > 0) {
              return [];
            }
            const existingIds = new Set(prev.map(c => c.id));
            const additions = chatItems.filter(c => !existingIds.has(c.id));
            if (additions.length === 0) {
              return prev.map(m => {
                const serverItem = chatItems.find(c => c.id === m.id);
                if (serverItem?.reactions && JSON.stringify(serverItem.reactions) !== JSON.stringify(m.reactions)) {
                  return { ...m, reactions: serverItem.reactions };
                }
                return m;
              });
            }
            return [...prev, ...additions].slice(-50);
          });
        }

        break;
      }

      case 'PLAYER_JOIN': {
        const joinId = msg.id || msg.senderId || msg.playerId;
        const rawAvatar = msg.avatar || 'aman';
        const isCustomUrl = rawAvatar.startsWith('http://') || rawAvatar.startsWith('https://') || rawAvatar.startsWith('/') || rawAvatar.startsWith('data:');
        const avKey = isCustomUrl ? rawAvatar : rawAvatar.toLowerCase().replace(/[^a-z0-9]/g, '');
        const playerColor = getAvatarColor(rawAvatar);
        const newPlayer = {
          id: joinId,
          name: msg.name || 'Player',
          avatar: avKey,
          score: msg.score || 0,
          isHost: !!msg.isHost,
          loaded: true,
          preloaded: Boolean(msg.preloaded),
          color: playerColor
        };
        game.setPlayers(prev => {
          if (prev.some(p => p.id === joinId)) return prev;
          return [...prev, newPlayer];
        });
        SoundManager.playOnce('pop', `join_${joinId}`);
        break;
      }

      case 'UPDATE_PLAYER_NAME': {
        game.setPlayers(prev => prev.map(p => {
          if (p.id === msg.playerId || p.id === msg.senderId) {
            return { ...p, name: msg.name };
          }
          return p;
        }));
        break;
      }

      case 'PLAYER_PRELOAD_STATUS':
      case 'PLAYER_PRELOAD_READY': {
        const targetPid = msg.playerId || msg.senderId;
        const isReady = Boolean(msg.ready ?? (msg.percent === 100));
        game.setPlayers(prev => prev.map(p => {
          if (p.id === targetPid) {
            return { ...p, preloaded: isReady };
          }
          return p;
        }));
        break;
      }

      case 'UPDATE_HOST_SETTINGS':
      case 'HOST_SETTINGS_UPDATE': {
        const newSettings = msg.settings || msg.payload;
        if (newSettings) {
          game.setHostSettings(newSettings);
        }
        break;
      }

      case 'MATCH_START':
      case 'MATCH_STARTED': {
        const playlist = msg.currentPlaylist || msg.playlist;
        const startIdx = msg.currentPlayIndex ?? msg.roundIndex ?? 0;
        const targetFrame = msg.frame || (playlist && playlist[startIdx]);

        if (playlist && Array.isArray(playlist) && playlist.length > 0) {
          game.setCurrentPlaylist(playlist);
          game.setCurrentPlayIndex(startIdx);
          if (typeof window !== 'undefined' && window.MultiplayerEngine) {
            window.MultiplayerEngine.currentPlaylist = playlist;
            window.MultiplayerEngine.currentPlayIndex = startIdx;
          }
        }
        if (targetFrame) {
          game.setCurrentFrame(targetFrame);
          if (typeof window !== 'undefined' && window.FrameDisplay?.showFrame) {
            window.FrameDisplay.showFrame(targetFrame);
          }
        }
        if (msg.players) {
          game.setPlayers(msg.players);
        }
        if (msg.state?.round?.startedAt) game.setRoundStartedAt(msg.state.round.startedAt);
        if (msg.state?.round?.endsAt) game.setRoundEndsAt(msg.state.round.endsAt);

        game.setIsMatchActive(true);
        game.setIsRoundFinished(false);
        game.setIsAnswerRevealed(false);
        game.setRoundWinners([]);
        game.setMaskedHint(null);
        game.setChatMessages([]); // Fresh chat stream for Match Start
        const timerDuration = msg.duration || game.hostSettings?.timer || 30;
        game.setTimeRemaining(timerDuration);
        game.setTimerMax(timerDuration);
        game.showScreen('gameScreen', { silent: true });
        SoundManager.playOnce('roundStart', `round_${startIdx}_start`);
        break;
      }

      case 'ROUND_START': {
        const nextIdx = msg.roundIndex ?? msg.currentPlayIndex ?? 0;
        const targetPlaylist = msg.currentPlaylist || msg.playlist || game.currentPlaylist;
        const targetFrame = msg.frame || (targetPlaylist && targetPlaylist[nextIdx]);

        if (targetPlaylist && Array.isArray(targetPlaylist) && targetPlaylist.length > 0) {
          game.setCurrentPlaylist(targetPlaylist);
          if (typeof window !== 'undefined' && window.MultiplayerEngine) {
            window.MultiplayerEngine.currentPlaylist = targetPlaylist;
          }
        }
        game.setCurrentPlayIndex(nextIdx);
        if (targetFrame) {
          game.setCurrentFrame(targetFrame);
          if (typeof window !== 'undefined' && window.FrameDisplay?.showFrame) {
            window.FrameDisplay.showFrame(targetFrame);
          }
        }
        if (typeof window !== 'undefined' && window.MultiplayerEngine) {
          window.MultiplayerEngine.currentPlayIndex = nextIdx;
          window.MultiplayerEngine.currentRoundWinners = [];
          window.MultiplayerEngine.isRoundFinished = false;
          window.MultiplayerEngine.currentMaskedHint = null;
        }

        if (msg.state?.round?.startedAt) game.setRoundStartedAt(msg.state.round.startedAt);
        if (msg.state?.round?.endsAt) game.setRoundEndsAt(msg.state.round.endsAt);

        game.setIsMatchActive(true);
        game.setIsRoundFinished(false);
        game.setIsAnswerRevealed(false);
        game.setMaskedHint(null);
        game.setRoundWinners([]);
        game.setChatMessages([]); // Fresh chat stream for Round Start
        const timerDur = msg.duration || game.hostSettings?.timer || 30;
        game.setTimeRemaining(timerDur);
        game.setTimerMax(timerDur);
        game.showScreen('gameScreen', { silent: true });
        SoundManager.playOnce('roundStart', `round_${nextIdx}_start`);
        break;
      }

      case 'HINT_BROADCAST': {
        const hint = msg.maskedHint || msg.state?.round?.maskedHint;
        if (hint) game.setMaskedHint(hint);
        if (msg.scoreboard) game.setPlayers(msg.scoreboard);
        SoundManager.playFlare();
        break;
      }

      case 'PAUSE_TOGGLE': {
        game.setIsPaused(!!msg.isPaused);
        break;
      }

      case 'SUBMIT_GUESS': {
        // Guesses are logged to chat stream; server evaluates authoritatively
        break;
      }

      case 'CORRECT_ANSWER_BROADCAST': {
        const winner = msg.winner;
        if (winner) {
          game.setRoundWinners(prev => {
            if (prev.some(w => w.playerId === winner.playerId)) return prev;
            return [...prev, winner];
          });
          if (winner.points > 0) {
            game.adjustPlayerScore(winner.playerId, winner.points);
          }

          // If authoritative chatMessage included, ensure it's recorded in chat stream
          if (msg.chatMessage) {
            const cm = msg.chatMessage;
            game.setChatMessages(prev => {
              if (prev.some(m => m.id === cm.id)) return prev;
              return [...prev, cm].slice(-50);
            });
          }

          const myPid = (typeof window !== 'undefined' && window.MultiplayerEngine?.playerId) || game.playerId;
          const isMyWin = Boolean(winner && (winner.playerId === myPid || winner.id === myPid));
          const curIdx = game.currentPlayIndex ?? 0;
          const winnerKey = `winner_${winner.playerId || winner.id}_r${curIdx}`;
          if (isMyWin) {
            SoundManager.playOnce('correct', winnerKey);
          } else {
            SoundManager.playOnce('opponentCorrect', winnerKey);
          }
        }
        if (msg.scoreboard) {
          game.setPlayers(msg.scoreboard);
        }
        if (msg.answer) {
          game.setCurrentFrame(prev => prev ? { ...prev, answer: msg.answer, revealContent: msg.revealContent || prev.revealContent } : prev);
        }
        game.setIsRoundFinished(true);
        game.setIsAnswerRevealed(true);
        break;
      }

      case 'ROUND_REVEAL':
      case 'ROUND_FINISH_EARLY':
      case 'ROUND_FINISH_BROADCAST':
      case 'ANSWER_REVEALED': {
        game.setIsRoundFinished(true);
        game.setIsAnswerRevealed(true);
        if (msg.answer) {
          game.setCurrentFrame(prev => prev ? { ...prev, answer: msg.answer, revealContent: msg.revealContent || prev.revealContent } : prev);
        }
        if (msg.roundWinners) {
          game.setRoundWinners(msg.roundWinners);
        }
        if (msg.scoreboard) {
          game.setPlayers(msg.scoreboard);
        }
        const curIdx = game.currentPlayIndex ?? 0;
        SoundManager.playOnce('reveal', `reveal_r${curIdx}`);
        break;
      }

      case 'JOIN_ACK': {
        if (msg.players && Array.isArray(msg.players) && msg.players.length > 0) {
          game.setPlayers(msg.players);
          const myPlayer = msg.players.find(p => p.id === game.playerId);
          if (myPlayer && typeof myPlayer.isHost === 'boolean') {
            game.setIsHost(myPlayer.isHost);
          }
        }
        if (msg.hostSettings) {
          game.setHostSettings(msg.hostSettings);
        }
        break;
      }

      case 'REMATCH':
      case 'REMATCH_STARTED': {
        game.setPlayers(prev => prev.map(p => ({ ...p, score: 0 })));
        const playlist = msg.currentPlaylist || msg.playlist;
        if (playlist && playlist.length > 0) {
          game.setCurrentPlaylist(playlist);
          game.setCurrentFrame(playlist[0]);
          game.setCurrentPlayIndex(0);
        }
        game.setIsMatchActive(true);
        game.setIsRoundFinished(false);
        game.setIsAnswerRevealed(false);
        game.setRoundWinners([]);
        game.setMaskedHint(null);
        game.setChatMessages([]); // Fresh chat stream for Rematch
        const timerDuration = msg.duration || game.hostSettings?.timer || 30;
        game.setTimeRemaining(timerDuration);
        game.setTimerMax(timerDuration);
        game.showScreen('gameScreen', { silent: true });
        SoundManager.playOnce('roundStart', 'round_0_start');
        break;
      }

      case 'RETURN_TO_LOBBY': {
        if (msg.players) {
          game.setPlayers(msg.players);
        }
        SoundManager.stopAll();
        game.setIsMatchActive(false);
        game.setIsRoundFinished(false);
        game.setIsAnswerRevealed(false);
        game.setChatMessages([]); // Clear chat on returning to lobby
        game.showScreen(game.isHost ? 'lobbyScreen' : 'playerLobbyScreen', { silent: true });
        break;
      }

      case 'HOST_MIGRATED': {
        if (msg.newHostId) {
          game.setPlayers(prev => prev.map(p => ({
            ...p,
            isHost: p.id === msg.newHostId
          })));
          if (msg.newHostId === game.playerId) {
            game.setIsHost(true);
          }
        }
        break;
      }

      case 'PLAYER_LEFT': {
        if (msg.players) {
          game.setPlayers(msg.players);
        } else if (msg.playerId) {
          game.setPlayers(prev => prev.filter(p => p.id !== msg.playerId));
        }
        break;
      }

      case 'CHAT_MESSAGE': {
        const chatItem = msg.msg || msg;
        const text = chatItem.text || msg.text;
        if (text) {
          const msgId = chatItem.id || msg.id || ('msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5));
          const itemType = chatItem.type || (chatItem.isGuess ? 'guess_attempt' : 'player_chat');
          game.setChatMessages(prev => {
            if (prev.some(p => p.id === msgId)) return prev;
            return [...prev, {
              id: msgId,
              type: itemType,
              roundIndex: chatItem.roundIndex,
              senderId: chatItem.senderId || msg.senderId,
              senderName: chatItem.senderName || msg.senderName || 'Player',
              senderAvatar: chatItem.senderAvatar || msg.senderAvatar || 'aman',
              text: text,
              guessText: chatItem.guessText || msg.guessText || null,
              isGuessed: Boolean(chatItem.isGuess || chatItem.isGuessed || msg.isGuess),
              points: chatItem.points,
              position: chatItem.position,
              reactions: chatItem.reactions || { likes: [], dislikes: [] },
              targetPlayerId: chatItem.targetPlayerId
            }].slice(-50);
          });

          // Filter sound: do not play for self, guess attempts, winner announcements, spoiler masks, or private notifications
          const myPid = (typeof window !== 'undefined' && window.MultiplayerEngine?.playerId) || game.playerId;
          const senderPid = chatItem.senderId || msg.senderId;
          const isMyMessage = Boolean(senderPid && senderPid === myPid);
          const isGuess = Boolean(chatItem.isGuess || chatItem.isGuessed || msg.isGuess || itemType === 'guess_attempt');
          const isSpoiler = itemType === 'spoiler_hidden' || String(text).includes('spoiler hidden');
          const isWinner = itemType === 'winner';
          const isReactionNotif = itemType === 'reaction_notification';

          if (!isMyMessage && !isGuess && !isSpoiler && !isWinner && !isReactionNotif) {
            SoundManager.playChat();
          }
        }
        break;
      }

      case 'CHAT_MESSAGE_UPDATE': {
        const messageId = msg.messageId;
        const reactions = msg.reactions;
        if (messageId && reactions) {
          game.setChatMessages(prev => prev.map(m => {
            if (m.id === messageId) {
              return { ...m, reactions };
            }
            return m;
          }));
        }
        break;
      }

      case 'GAME_OVER':
      case 'GAME_OVER_BROADCAST': {
        if (msg.scoreboard) {
          game.setPlayers(msg.scoreboard);
        }
        SoundManager.stopMusic();
        game.setIsMatchActive(false);
        game.setIsRoundFinished(true);
        game.setIsAnswerRevealed(true);
        game.showScreen('winnerScreen', { silent: true });
        SoundManager.playOnce('winner', 'match_gameover');
        break;
      }

      default:
        break;
    }
  }, [game]);

  handleIncomingMessageRef.current = handleIncomingMessage;

  const value = {
    connectSocket,
    sendEvent,
    sendReaction,
    handleIncomingMessage,
    socketStatus,
    partyConnectionState: party.connectionState,
    selectedAvatar: game.selectedAvatarForModal,
    setSelectedAvatar: game.setSelectedAvatarForModal
  };

  return (
    <MultiplayerContext.Provider value={value}>
      {children}
    </MultiplayerContext.Provider>
  );
};

export default MultiplayerContext;
