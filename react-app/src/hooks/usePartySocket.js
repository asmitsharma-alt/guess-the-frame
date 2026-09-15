import { useState, useEffect, useRef, useCallback } from 'react';
import { PARTYKIT_HOST } from '../config/env';

/**
 * Enterprise Resilient PartyKit WebSocket Client Hook
 * Provides ultra-low-latency edge-native synchronization for Guess The Frame
 *
 * States: 'IDLE' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'OFFLINE' | 'ERROR'
 */
export const usePartySocket = ({
  roomCode,
  playerId,
  playerName,
  playerAvatar,
  playerColor,
  isHost,
  preloaded = false,
  onMessage
}) => {
  const [connectionState, setConnectionState] = useState('IDLE');
  const wsRef = useRef(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef(null);
  const offlineQueueRef = useRef([]);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const playerIdRef = useRef(playerId);
  playerIdRef.current = playerId;
  const playerNameRef = useRef(playerName);
  playerNameRef.current = playerName;
  const playerAvatarRef = useRef(playerAvatar);
  playerAvatarRef.current = playerAvatar;
  const playerColorRef = useRef(playerColor);
  playerColorRef.current = playerColor;
  const isHostRef = useRef(isHost);
  isHostRef.current = isHost;
  const preloadedRef = useRef(preloaded);
  preloadedRef.current = preloaded;

  const cleanRoom = roomCode ? roomCode.trim().toUpperCase() : '';

  // Flush offline queue when reconnected
  const flushQueue = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const queue = offlineQueueRef.current;
    while (queue.length > 0) {
      const payload = queue.shift();
      try {
        ws.send(payload);
      } catch (err) {
        console.error('[PartySocket] Failed to flush message:', err);
      }
    }
  }, []);

  // Send message or queue if not connected
  const send = useCallback((messageObj) => {
    const payload = typeof messageObj === 'string' ? messageObj : JSON.stringify(messageObj);
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(payload);
      } catch (err) {
        console.warn('[PartySocket] Send error, queuing:', err);
        offlineQueueRef.current.push(payload);
      }
    } else {
      offlineQueueRef.current.push(payload);
    }
  }, []);

  const connect = useCallback(() => {
    if (!cleanRoom) {
      setConnectionState('IDLE');
      return;
    }

    if (wsRef.current) {
      try { wsRef.current.close(); } catch (e) {}
      wsRef.current = null;
    }

    const host = PARTYKIT_HOST || '127.0.0.1:1999';
    const isLocal = host.startsWith('127.0.0.1') || host.startsWith('localhost');
    const protocol = isLocal ? 'ws:' : 'wss:';
    const wsUrl = `${protocol}//${host}/parties/main/${cleanRoom}`;

    console.log(`[PartySocket] Connecting to ${wsUrl}...`);
    setConnectionState(reconnectAttemptRef.current > 0 ? 'RECONNECTING' : 'CONNECTING');

    try {
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        console.log(`[PartySocket] Connected to PartyKit room [${cleanRoom}]!`);
        setConnectionState('CONNECTED');
        reconnectAttemptRef.current = 0;

        // Automatically perform PLAYER_JOIN handshake
        socket.send(JSON.stringify({
          type: 'PLAYER_JOIN',
          id: playerIdRef.current,
          name: playerNameRef.current,
          avatar: playerAvatarRef.current || 'aman',
          color: playerColorRef.current || '#FACC15',
          isHost: Boolean(isHostRef.current),
          preloaded: Boolean(preloadedRef.current),
          timestamp: Date.now()
        }));

        flushQueue();
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (onMessageRef.current) {
            onMessageRef.current(data);
          }
        } catch (err) {
          console.error('[PartySocket] Message parsing error:', err);
        }
      };

      socket.onclose = (ev) => {
        console.log(`[PartySocket] Disconnected from room [${cleanRoom}] (code: ${ev.code})`);
        setConnectionState('OFFLINE');

        // Automatic exponential backoff reconnection
        const delay = Math.min(1000 * Math.pow(1.5, reconnectAttemptRef.current), 8000);
        reconnectAttemptRef.current += 1;
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = setTimeout(() => {
          connect();
        }, delay);
      };

      socket.onerror = (err) => {
        console.warn('[PartySocket] Socket error:', err);
        setConnectionState('ERROR');
      };
    } catch (err) {
      console.error('[PartySocket] Failed to initialize WebSocket:', err);
      setConnectionState('ERROR');
    }
  }, [cleanRoom, flushQueue]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        try { wsRef.current.close(); } catch (e) {}
        wsRef.current = null;
      }
    };
  }, [connect]);

  return {
    connectionState,
    send,
    reconnect: connect
  };
};
