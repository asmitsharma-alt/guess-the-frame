import { useState, useEffect, useRef, useCallback } from 'react';
import { MQTT_BROKERS } from '../config/env';
import { validateMqttMessage } from '../services/mqttSchemas';
import { NetworkSecurity } from '../services/securityUtil';

/**
 * Enterprise Resilient Distributed MQTT Client Hook
 * Strictly satisfies Section 4 (Distributed MQTT Pipeline & Telemetry Engine)
 *
 * States: 'IDLE' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'OFFLINE' | 'ERROR'
 */
export const useMqttClient = ({
  roomCode,
  playerId,
  playerName,
  isHost,
  onMessage
}) => {
  const [connectionState, setConnectionState] = useState('IDLE');
  const [currentBrokerName, setCurrentBrokerName] = useState('');
  const [queuedCount, setQueuedCount] = useState(0);

  const clientsRef = useRef([]);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef(null);
  const offlineQueueRef = useRef([]);
  const lastPacketReceivedRef = useRef(Date.now());
  const heartbeatTimerRef = useRef(null);
  const seenMessagesRef = useRef(new Map());
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const isHostRef = useRef(isHost);
  isHostRef.current = isHost;
  const playerNameRef = useRef(playerName);
  playerNameRef.current = playerName;

  // Flush queued messages across active connected brokers
  const flushOfflineQueue = useCallback(() => {
    const activeClients = (clientsRef.current || []).filter(c => c && c.connected);
    if (activeClients.length === 0) return;
    const queue = offlineQueueRef.current;
    if (queue.length === 0) return;

    console.log(`[MQTT Buffer] Flushing ${queue.length} offline queued messages...`);
    while (queue.length > 0) {
      const item = queue.shift();
      activeClients.forEach(client => {
        try {
          client.publish(item.topic, item.payload, { qos: item.qos || 1 });
        } catch (err) {
          console.error('[MQTT Buffer] Failed to flush queued message:', err);
        }
      });
    }
    setQueuedCount(0);
  }, []);

  // Publish message with offline fallback across all connected brokers
  const publish = useCallback((topic, messageObj, qos = 1) => {
    const payload = typeof messageObj === 'string' ? messageObj : JSON.stringify(messageObj);
    const activeClients = (clientsRef.current || []).filter(c => c && c.connected);

    if (activeClients.length > 0) {
      let published = false;
      activeClients.forEach(client => {
        try {
          client.publish(topic, payload, { qos });
          published = true;
        } catch (e) {
          console.warn('[MQTT Client Publish Error]:', e);
        }
      });
      if (published) return true;
    }

    // Queue in memory when offline
    if (offlineQueueRef.current.length < 500) {
      offlineQueueRef.current.push({ topic, payload, qos });
      setQueuedCount(offlineQueueRef.current.length);
      console.log(`[MQTT Offline Queue] Buffered message for "${topic}". Total pending: ${offlineQueueRef.current.length}`);
    }
    return false;
  }, []);

  // Connect to multiple brokers concurrently for cross-network reliability
  const connect = useCallback(() => {
    if (!roomCode || !playerId) return;

    const mqttLib = typeof window !== 'undefined' ? (window.mqtt || null) : null;
    if (!mqttLib) {
      console.warn('[MQTT Client] mqtt.js library not loaded yet in window.');
      return;
    }

    // Teardown previous instances cleanly
    if (clientsRef.current && Array.isArray(clientsRef.current)) {
      clientsRef.current.forEach(c => {
        try { c.end(true); } catch (e) {}
      });
    }
    clientsRef.current = [];

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    const pool = MQTT_BROKERS;
    // Connect to top 2 brokers concurrently (EMQX + HiveMQ)
    const targetBrokers = pool.slice(0, 2);
    setCurrentBrokerName(targetBrokers.map(b => b.name.split(' ')[0]).join(' + '));
    setConnectionState(reconnectAttemptRef.current > 0 ? 'RECONNECTING' : 'CONNECTING');

    const cleanRoom = roomCode.trim().toUpperCase();
    const roomEventsTopic = NetworkSecurity.getRoomTopic(cleanRoom);
    const legacyEventsTopic = `gtf/${cleanRoom}/events`;
    const presenceTopic = `${roomEventsTopic}/presence/${playerId}`;

    const lwtPayload = JSON.stringify({
      type: 'PLAYER_OFFLINE',
      playerId,
      playerName: playerNameRef.current || 'Player',
      status: 'offline',
      lastSeen: Date.now()
    });

    targetBrokers.forEach((broker, idx) => {
      console.log(`[MQTT Engine] Connecting to ${broker.name} (${broker.url})...`);

      try {
        const client = mqttLib.connect(broker.url, {
          keepalive: 30,
          reconnectPeriod: 3000,
          connectTimeout: 7000,
          clientId: `gtf_${playerId}_${idx === 0 ? 'e' : 'h'}_${Math.random().toString(16).substr(2, 6)}`,
          clean: true,
          will: {
            topic: presenceTopic,
            payload: lwtPayload,
            qos: 1,
            retain: false
          }
        });

        client.on('connect', () => {
          reconnectAttemptRef.current = 0;
          setConnectionState('CONNECTED');
          lastPacketReceivedRef.current = Date.now();
          console.log(`[MQTT Engine] Connected to ${broker.name}! Subscribing to: ${roomEventsTopic}`);

          // Subscribe to secure topic, legacy topic, and presence
          client.subscribe(roomEventsTopic, { qos: 1 });
          client.subscribe(legacyEventsTopic, { qos: 1 });
          client.subscribe(presenceTopic, { qos: 1 });

          // Announce online presence
          const onlinePayload = JSON.stringify({
            type: 'PLAYER_ONLINE',
            playerId,
            playerName: playerNameRef.current || 'Player',
            status: 'online',
            isHost: !!isHostRef.current,
            timestamp: Date.now()
          });
          client.publish(presenceTopic, onlinePayload, { qos: 1 });

          // Flush buffered messages
          flushOfflineQueue();
        });

        client.on('message', (receivedTopic, payloadBuffer) => {
          lastPacketReceivedRef.current = Date.now();
          try {
            const raw = JSON.parse(payloadBuffer.toString());
            // Packet deduplication for dual-broker stream
            const msgKey = `${raw.type}_${raw.senderId || raw.id || ''}_${raw.timestamp || ''}_${raw.roundIndex ?? ''}`;
            const now = Date.now();
            if (seenMessagesRef.current.has(msgKey)) {
              const prev = seenMessagesRef.current.get(msgKey);
              if (now - prev < 6000) return;
            }
            seenMessagesRef.current.set(msgKey, now);
            if (seenMessagesRef.current.size > 200) {
              for (const [k, t] of seenMessagesRef.current.entries()) {
                if (now - t > 10000) seenMessagesRef.current.delete(k);
              }
            }

            const validated = validateMqttMessage(raw);
            if (validated.success) {
              if (onMessageRef.current) {
                onMessageRef.current(validated.data, receivedTopic);
              }
            } else {
              console.warn('[MQTT Validation Warning] Quarantined invalid message:', validated.error);
            }
          } catch (err) {
            console.warn('[MQTT Parse Warning] Malformed JSON message ignored:', err.message);
          }
        });

        client.on('error', (err) => {
          console.warn(`[MQTT Notice from ${broker.name}]:`, err.message);
        });

        client.on('close', () => {
          const anyConnected = (clientsRef.current || []).some(c => c && c.connected);
          if (!anyConnected) {
            setConnectionState('OFFLINE');
          }
        });

        clientsRef.current.push(client);
      } catch (e) {
        console.error(`[MQTT Client Exception on ${broker.name}]`, e);
      }
    });
  }, [roomCode, playerId, flushOfflineQueue]);

  // Keep-alive heartbeat monitor (every 15s checks if connection is stale)
  useEffect(() => {
    heartbeatTimerRef.current = setInterval(() => {
      if (connectionState === 'CONNECTED') {
        const timeSinceLastPacket = Date.now() - lastPacketReceivedRef.current;
        if (timeSinceLastPacket > 45000) { // 1.5 * 30s keepalive
          console.warn('[MQTT Watchdog] No packet received for 45s. Forcing client reconnect.');
          connect();
        }
      }
    }, 15000);

    return () => {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
    };
  }, [connectionState, connect]);

  // Connect on mount or when roomCode changes
  useEffect(() => {
    if (roomCode) {
      connect();
    }
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (clientsRef.current && Array.isArray(clientsRef.current)) {
        clientsRef.current.forEach(c => {
          try { c.end(true); } catch (e) {}
        });
        clientsRef.current = [];
      }
      setConnectionState('IDLE');
    };
  }, [roomCode, connect]);

  return {
    connectionState,
    currentBrokerName,
    queuedCount,
    publish,
    reconnect: connect
  };
};

export default useMqttClient;
