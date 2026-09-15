import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useGame } from './GameContext';
import SoundManager from '../services/soundManager';
import { NetworkSecurity, SecurityUtil } from '../services/securityUtil';
import { FuzzyMatcher } from '../services/fuzzyMatcher';
import { AVATAR_MAP, getAvatarColor } from '../services/gameConstants';
import { WS_BASE_URL } from '../config/env';
import { useMqttClient } from '../hooks/useMqttClient';

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
  const wsRef = useRef(null);
  const broadcastChannelRef = useRef(null);
  const heartbeatTimerRef = useRef(null);
  const lastHeartbeatRef = useRef(Date.now());
  const [socketStatus, setSocketStatus] = useState('offline'); // 'connected' | 'connecting' | 'offline'
  const handleIncomingMessageRef = useRef(null);
  const seenMessagesRef = useRef(new Map());

  // Inbound MQTT message router
  const handleMqttMessage = useCallback((msg, topic) => {
    if (handleIncomingMessageRef.current) {
      handleIncomingMessageRef.current(msg);
    }
  }, []);

  // Resilient Distributed MQTT Client Hook
  const mqtt = useMqttClient({
    roomCode: game.roomCode,
    playerId: game.playerId,
    playerName: game.playerName,
    isHost: game.isHost,
    onMessage: handleMqttMessage
  });

  // Reactive Connection Status Sync without polling
  useEffect(() => {
    if (mqtt.connectionState === 'CONNECTED') {
      setSocketStatus('connected');
    } else if (mqtt.connectionState === 'CONNECTING' || mqtt.connectionState === 'RECONNECTING') {
      setSocketStatus('connecting');
    } else if (mqtt.connectionState === 'OFFLINE' || mqtt.connectionState === 'ERROR') {
      const isWs = Boolean(wsRef.current && wsRef.current.readyState === WebSocket.OPEN);
      setSocketStatus(isWs ? 'connected' : 'offline');
    }
  }, [mqtt.connectionState]);

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

  // WebSocket connection management
  const connectSocket = useCallback((roomCodeToJoin, isHostUser = false) => {
    if (wsRef.current) {
      try { wsRef.current.close(); } catch (e) {}
      wsRef.current = null;
    }

    const isVercelHost = typeof window !== 'undefined' && (
      window.location.hostname.endsWith('.vercel.app') ||
      window.location.hostname === 'scoopcast.me' ||
      window.location.hostname.endsWith('scoopcast.me')
    );
    const hasExternalWs = Boolean(typeof import.meta !== 'undefined' && import.meta.env?.VITE_WS_URL);

    // Skip native WebSocket on static SPA hosts (Vercel/scoopcast.me) if no explicit external WS server is configured
    if (isVercelHost && !hasExternalWs) {
      return;
    }

    setSocketStatus('connecting');

    let baseUrl = WS_BASE_URL;
    if (baseUrl.startsWith('/')) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      baseUrl = `${protocol}//${window.location.host}${baseUrl}`;
    }
    const sep = baseUrl.includes('?') ? '&' : '?';
    const wsUrl = `${baseUrl}${sep}room=${roomCodeToJoin}&playerId=${game.playerId}&name=${encodeURIComponent(game.playerName)}&avatar=${game.playerAvatar}&isHost=${isHostUser}`;

    try {
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        console.log('[WebSocket] Connected to room:', roomCodeToJoin);
        setSocketStatus('connected');

        // Setup BroadcastChannel for cross-tab sync
        try {
          const topicHash = NetworkSecurity.getTopicHash(roomCodeToJoin);
          if (broadcastChannelRef.current) broadcastChannelRef.current.close();
          broadcastChannelRef.current = new BroadcastChannel('gtf_bc_' + topicHash);
          broadcastChannelRef.current.onmessage = (event) => {
            if (event?.data && handleIncomingMessageRef.current) {
              handleIncomingMessageRef.current(event.data);
            }
          };
        } catch (e) {}

        // Send handshake
        const token = NetworkSecurity.generateToken(roomCodeToJoin, game.playerId, isHostUser);
        socket.send(JSON.stringify({
          type: 'PLAYER_JOIN',
          roomCode: roomCodeToJoin,
          senderId: game.playerId,
          id: game.playerId,
          name: game.playerName,
          avatar: game.playerAvatar,
          isHost: isHostUser,
          token,
          timestamp: Date.now()
        }));
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (handleIncomingMessageRef.current) {
            handleIncomingMessageRef.current(data);
          }
        } catch (e) {
          console.error('[WebSocket] Failed to parse message:', e);
        }
      };

      socket.onclose = () => {
        console.log('[WebSocket] Disconnected from room');
        if (typeof window !== 'undefined' && window.MultiplayerEngine?._mqttIsConnected) {
          setSocketStatus('connected');
        } else {
          setSocketStatus('offline');
        }
      };

      socket.onerror = (err) => {
        console.warn('[WebSocket] Error:', err);
        if (typeof window !== 'undefined' && window.MultiplayerEngine?._mqttIsConnected) {
          setSocketStatus('connected');
        } else {
          setSocketStatus('offline');
        }
      };
    } catch (e) {
      console.error('[WebSocket] Setup exception:', e);
      setSocketStatus('offline');
    }
  }, [game.playerId, game.playerName, game.playerAvatar]);

  // Dispatch events to WebSocket, BroadcastChannel & Resilient MQTT Hook
  const sendEvent = useCallback((type, payload = {}) => {
    const msg = {
      type,
      roomCode: game.roomCode,
      senderId: game.playerId,
      timestamp: Date.now(),
      ...payload
    };

    // 1. Publish via Resilient MQTT Hook (Primary Cloud Transport with offline buffer)
    const cleanRoom = game.roomCode ? game.roomCode.trim().toUpperCase() : '';
    if (cleanRoom) {
      const secTopic = NetworkSecurity.getRoomTopic(cleanRoom);
      mqtt.publish(secTopic, msg, 1);
      mqtt.publish(`gtf/${cleanRoom}/events`, msg, 1);
    }

    // 2. Cross-tab broadcast (for local fast sync)
    try {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage(msg);
      }
    } catch (e) {}

    // 3. Native WebSocket send (if open)
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(msg));
      } catch (e) {}
    }

    // 4. Fallback dispatch to window.MultiplayerEngine (for test suites)
    if (typeof window !== 'undefined' && window.MultiplayerEngine?.sendEvent) {
      if (game.roomCode && !window.MultiplayerEngine.roomCode) {
        window.MultiplayerEngine.roomCode = game.roomCode;
        window.MultiplayerEngine.roomId = 'room_' + game.roomCode;
      }
      try {
        window.MultiplayerEngine.sendEvent(type, payload);
      } catch (e) {}
    }
  }, [game.roomCode, game.playerId, mqtt]);

  // Incoming event router
  const handleIncomingMessage = useCallback((msg) => {
    if (!msg || !msg.type) return;

    // Deduplicate packets arriving via multiple transports/brokers
    const msgKey = `${msg.type}_${msg.senderId || msg.id || ''}_${msg.timestamp || ''}_${msg.roundIndex ?? ''}`;
    const now = Date.now();
    if (seenMessagesRef.current.has(msgKey)) {
      const seenTime = seenMessagesRef.current.get(msgKey);
      if (now - seenTime < 6000) {
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

    lastHeartbeatRef.current = Date.now();

    switch (msg.type) {
      case 'PLAYER_JOIN': {
        const joinId = msg.id || msg.senderId;
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
          color: playerColor
        };
        game.setPlayers(prev => {
          if (prev.some(p => p.id === joinId)) return prev;
          const nextList = [...prev, newPlayer];
          if (game.isHost) {
            // Immediate authoritative response to joining player
            sendEvent('SYNC_ROOM_STATE', {
              players: nextList,
              hostSettings: game.hostSettings,
              currentPlaylist: game.currentPlaylist,
              currentPlayIndex: game.currentPlayIndex
            });
            sendEvent('JOIN_ACK', {
              targetPlayerId: joinId,
              players: nextList,
              hostSettings: game.hostSettings
            });
          }
          return nextList;
        });
        SoundManager.playPop();
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

      case 'UPDATE_HOST_SETTINGS': {
        if (msg.settings) {
          game.setHostSettings(msg.settings);
        }
        break;
      }

      case 'GAME_START_COUNTDOWN': {
        game.setIsMatchActive(true);
        game.showScreen('gameScreen');
        break;
      }

      case 'GUIDE_COMPLETE': {
        if (typeof window !== 'undefined' && window.HowToAnswerGuide) {
          window.HowToAnswerGuide.stop();
          window.HowToAnswerGuide._secondsLeft = 0;
        }
        game.setIsMatchActive(true);
        game.setIsRoundFinished(false);
        game.setIsAnswerRevealed(false);
        game.showScreen('gameScreen');
        break;
      }

      case 'ROUND_START': {
        if (msg.frame) {
          game.setCurrentFrame(msg.frame);
          game.setCurrentPlayIndex(msg.roundIndex || 0);
        }
        game.setIsRoundFinished(false);
        game.setIsAnswerRevealed(false);
        game.setMaskedHint(null);
        game.setTimeRemaining(msg.duration || game.hostSettings.timer || 30);
        game.setTimerMax(msg.duration || game.hostSettings.timer || 30);
        game.showScreen('gameScreen');
        SoundManager.playRoundStart();
        break;
      }

      case 'HINT_BROADCAST': {
        game.setMaskedHint(msg.maskedHint);
        SoundManager.play('flare');
        break;
      }

      case 'PAUSE_TOGGLE': {
        game.setIsPaused(!!msg.isPaused);
        break;
      }

      case 'SUBMIT_GUESS': {
        if (game.isHost) {
          // Authoritative evaluation
          const curFrame = game.currentPlaylist[game.currentPlayIndex];
          if (curFrame && FuzzyMatcher.isMatch(msg.guess, curFrame.answer)) {
            // Correct guess!
            const alreadyWon = game.roundWinners.some(w => w.playerId === msg.senderId);
            if (!alreadyWon) {
              const pos = game.roundWinners.length + 1;
              const points = pos === 1 ? 10 : pos === 2 ? 7 : pos === 3 ? 5 : 0;
              const winnerRecord = {
                playerId: msg.senderId,
                playerName: msg.playerName,
                playerAvatar: msg.playerAvatar,
                position: pos,
                points
              };
              game.setRoundWinners(prev => [...prev, winnerRecord]);
              if (points > 0) {
                game.adjustPlayerScore(msg.senderId, points);
              }
              sendEvent('GUESS_CORRECT_BROADCAST', {
                winner: winnerRecord,
                roundIndex: game.currentPlayIndex
              });
              SoundManager.play('correct');
            }
          }
        }
        break;
      }

      case 'ROUND_WINNER':
      case 'GUESS_CORRECT_BROADCAST': {
        const winner = msg.winner;
        if (winner) {
          game.setRoundWinners(prev => {
            if (prev.some(w => w.playerId === winner.playerId)) return prev;
            return [...prev, winner];
          });
          if (winner.points > 0) {
            game.adjustPlayerScore(winner.playerId, winner.points);
          }
          if (msg.players) {
            game.setPlayers(msg.players);
          }
          // Add winner banner to chat
          game.setChatMessages(prev => [
            ...prev,
            {
              id: 'winner_' + Date.now(),
              type: 'winner',
              text: `${winner.playerName} guessed the answer! (+${winner.points} pts)`,
              avatar: winner.playerAvatar
            }
          ]);
          SoundManager.play('correct');
        }
        break;
      }

      case 'ROUND_FINISH_EARLY':
      case 'ROUND_FINISH_BROADCAST':
      case 'ANSWER_REVEALED': {
        game.setIsRoundFinished(true);
        game.setIsAnswerRevealed(true);
        SoundManager.playReveal();
        break;
      }

      case 'JOIN_ACK':
      case 'SYNC_ROOM_STATE':
      case 'ROOM_STATE': {
        if (msg.players && Array.isArray(msg.players) && msg.players.length > 0) {
          game.setPlayers(msg.players);
        }
        if (msg.hostSettings) {
          game.setHostSettings(msg.hostSettings);
        }
        if (msg.currentPlaylist && Array.isArray(msg.currentPlaylist) && msg.currentPlaylist.length > 0) {
          game.setCurrentPlaylist(msg.currentPlaylist);
        }
        if (msg.currentPlayIndex !== undefined) {
          game.setCurrentPlayIndex(msg.currentPlayIndex);
        }
        if (msg.currentRoundWinners) {
          game.setRoundWinners(msg.currentRoundWinners);
        }
        break;
      }

      case 'MATCH_START':
      case 'MATCH_STARTED': {
        const playlist = msg.currentPlaylist || msg.playlist;
        if (playlist && playlist.length > 0) {
          game.setCurrentPlaylist(playlist);
          game.setCurrentFrame(playlist[msg.currentPlayIndex || 0]);
          game.setCurrentPlayIndex(msg.currentPlayIndex || 0);
        }
        if (msg.players) {
          game.setPlayers(msg.players);
        }
        game.setIsMatchActive(true);
        game.setIsRoundFinished(false);
        game.setIsAnswerRevealed(false);
        game.setRoundWinners([]);
        game.setMaskedHint(null);
        const timerDuration = msg.duration || game.hostSettings?.timer || 30;
        game.setTimeRemaining(timerDuration);
        game.setTimerMax(timerDuration);
        game.showScreen('gameScreen');
        SoundManager.playRoundStart();
        break;
      }

      case 'NEXT_ROUND':
      case 'ROUND_CHANGED': {
        const nextIdx = msg.currentPlayIndex ?? msg.roundIndex ?? (game.currentPlayIndex + 1);
        const pl = msg.currentPlaylist || game.currentPlaylist;
        if (pl && pl[nextIdx]) {
          game.setCurrentFrame(pl[nextIdx]);
          game.setCurrentPlayIndex(nextIdx);
        }
        game.setIsRoundFinished(false);
        game.setIsAnswerRevealed(false);
        game.setMaskedHint(null);
        game.setRoundWinners([]);
        const duration = msg.duration || game.hostSettings?.timer || 30;
        game.setTimeRemaining(duration);
        game.setTimerMax(duration);
        game.showScreen('gameScreen');
        SoundManager.playRoundStart();
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
        const timerDuration = msg.duration || game.hostSettings?.timer || 30;
        game.setTimeRemaining(timerDuration);
        game.setTimerMax(timerDuration);
        game.showScreen('gameScreen');
        SoundManager.playRoundStart();
        break;
      }

      case 'SCORE_UPDATE': {
        if (msg.players) {
          game.setPlayers(msg.players);
        } else if (msg.playerId && typeof msg.score === 'number') {
          game.adjustPlayerScore(msg.playerId, msg.score);
        }
        break;
      }

      case 'RETURN_TO_LOBBY': {
        if (msg.players) {
          game.setPlayers(msg.players);
        }
        game.showScreen('lobbyScreen');
        break;
      }

      case 'HOST_PROMOTED': {
        game.setIsHost(true);
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
        if (msg.msg) {
          game.setChatMessages(prev => [...prev, {
            id: msg.msg.id || 'msg_' + Date.now(),
            type: 'chat',
            senderName: msg.msg.senderName,
            senderAvatar: msg.msg.senderAvatar,
            text: msg.msg.text
          }]);
        }
        break;
      }

      case 'GAME_OVER':
      case 'GAME_OVER_BROADCAST': {
        if (msg.scoreboard) {
          game.setPlayers(msg.scoreboard);
        }
        game.showScreen('winnerScreen');
        SoundManager.playWinner();
        break;
      }

      case 'HOST_HEARTBEAT': {
        lastHeartbeatRef.current = Date.now();
        break;
      }

      default:
        break;
    }
  }, [game, sendEvent]);

  handleIncomingMessageRef.current = handleIncomingMessage;

  // Host heartbeat
  useEffect(() => {
    if (game.isHost && game.roomCode) {
      heartbeatTimerRef.current = setInterval(() => {
        sendEvent('HOST_HEARTBEAT', { hostId: game.playerId });
      }, 4000);
    } else {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
    }
    return () => {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
    };
  }, [game.isHost, game.roomCode, sendEvent, game.playerId]);

  const value = {
    connectSocket,
    sendEvent,
    handleIncomingMessage,
    socketStatus,
    mqttState: mqtt.connectionState,
    mqttBrokerName: mqtt.currentBrokerName,
    mqttQueuedCount: mqtt.queuedCount,
    reconnectMqtt: mqtt.reconnect,
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
