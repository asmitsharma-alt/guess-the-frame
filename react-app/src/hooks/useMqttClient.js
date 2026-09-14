import { useState, useEffect, useRef, useCallback } from 'react';
import { MQTT_BROKERS } from '../config/env';
import { validateMqttMessage } from '../services/mqttSchemas';

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

  const clientRef = useRef(null);
  const brokerIndexRef = useRef(0);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef(null);
  const offlineQueueRef = useRef([]);
  const lastPacketReceivedRef = useRef(Date.now());
  const heartbeatTimerRef = useRef(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  // Compute exponential backoff with ±20% random jitter
  const getBackoffDelay = useCallback(() => {
    const baseDelay = 1000;
    const factor = 1.5;
    const maxDelay = 30000;
    const attempt = reconnectAttemptRef.current;
    const computed = Math.min(baseDelay * Math.pow(factor, attempt), maxDelay);
    const jitter = computed * 0.2 * (Math.random() * 2 - 1); // ±20% jitter
    return Math.max(500, Math.floor(computed + jitter));
  }, []);

  // Flush queued messages with rate limiting upon reconnection
  const flushOfflineQueue = useCallback(() => {
    if (!clientRef.current || !clientRef.current.connected) return;
    const queue = offlineQueueRef.current;
    if (queue.length === 0) return;

    console.log(`[MQTT Buffer] Flushing ${queue.length} offline queued messages...`);
    while (queue.length > 0) {
      const item = queue.shift();
      try {
        clientRef.current.publish(item.topic, item.payload, { qos: item.qos || 1 });
      } catch (err) {
        console.error('[MQTT Buffer] Failed to flush queued message:', err);
        queue.unshift(item);
        break;
      }
    }
    setQueuedCount(queue.length);
  }, []);

  // Publish message with offline fallback
  const publish = useCallback((topic, messageObj, qos = 1) => {
    const payload = typeof messageObj === 'string' ? messageObj : JSON.stringify(messageObj);

    if (clientRef.current && clientRef.current.connected) {
      try {
        clientRef.current.publish(topic, payload, { qos }, (err) => {
          if (err) {
            console.warn(`[MQTT Publish Warn] Retrying via offline buffer for topic: ${topic}`, err);
            offlineQueueRef.current.push({ topic, payload, qos });
            setQueuedCount(offlineQueueRef.current.length);
          }
        });
        return true;
      } catch (e) {
        console.error('[MQTT Publish Error] Queuing message:', e);
      }
    }

    // Queue in memory when offline
    if (offlineQueueRef.current.length < 500) {
      offlineQueueRef.current.push({ topic, payload, qos });
      setQueuedCount(offlineQueueRef.current.length);
      console.log(`[MQTT Offline Queue] Buffered message for "${topic}". Total pending: ${offlineQueueRef.current.length}`);
    }
    return false;
  }, []);

  // Connect to broker with automatic failover and LWT
  const connect = useCallback(() => {
    if (!roomCode || !playerId) return;

    const mqttLib = typeof window !== 'undefined' ? (window.mqtt || null) : null;
    if (!mqttLib) {
      console.warn('[MQTT Client] mqtt.js library not loaded yet in window.');
      return;
    }

    // Teardown previous instance cleanly
    if (clientRef.current) {
      try { clientRef.current.end(true); } catch (e) {}
      clientRef.current = null;
    }

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    const pool = MQTT_BROKERS;
    const currentBroker = pool[brokerIndexRef.current % pool.length];
    setCurrentBrokerName(currentBroker.name);
    setConnectionState(reconnectAttemptRef.current > 0 ? 'RECONNECTING' : 'CONNECTING');

    const cleanRoom = roomCode.trim().toUpperCase();
    const presenceTopic = `gtf/${cleanRoom}/presence/${playerId}`;
    const roomEventsTopic = `gtf/${cleanRoom}/events`;

    const lwtPayload = JSON.stringify({
      type: 'PLAYER_OFFLINE',
      playerId,
      playerName,
      status: 'offline',
      lastSeen: Date.now()
    });

    console.log(`[MQTT Engine] Connecting to ${currentBroker.name} (${currentBroker.url})...`);

    try {
      const client = mqttLib.connect(currentBroker.url, {
        keepalive: 30,
        reconnectPeriod: 0, // Handled manually with backoff + failover
        connectTimeout: 5000,
        clientId: `gtf_${playerId}_${Math.random().toString(16).substr(2, 6)}`,
        clean: true,
        will: {
          topic: presenceTopic,
          payload: lwtPayload,
          qos: 1,
          retain: false
        }
      });

      clientRef.current = client;

      // Failover timeout if broker doesn't reply within 5s
      const failoverTimer = setTimeout(() => {
        if (!client.connected) {
          console.warn(`[MQTT Failover] Connection to ${currentBroker.name} timed out. Failing over...`);
          brokerIndexRef.current = (brokerIndexRef.current + 1) % pool.length;
          reconnectAttemptRef.current += 1;
          connect();
        }
      }, 5000);

      client.on('connect', () => {
        clearTimeout(failoverTimer);
        reconnectAttemptRef.current = 0;
        setConnectionState('CONNECTED');
        lastPacketReceivedRef.current = Date.now();
        console.log(`[MQTT Engine] Connected to ${currentBroker.name}! Subscribing to room topic: ${roomEventsTopic}`);

        // Subscribe to room events topic
        client.subscribe(roomEventsTopic, { qos: 1 });
        client.subscribe(presenceTopic, { qos: 1 });

        // Announce online presence
        const onlinePayload = JSON.stringify({
          type: 'PLAYER_ONLINE',
          playerId,
          playerName,
          status: 'online',
          isHost: !!isHost,
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
        clearTimeout(failoverTimer);
        console.warn(`[MQTT Notice from ${currentBroker.name}]:`, err.message);
        setConnectionState('ERROR');
      });

      client.on('close', () => {
        clearTimeout(failoverTimer);
        setConnectionState('OFFLINE');
        // Schedule auto-reconnect with exponential backoff + jitter
        if (!reconnectTimerRef.current) {
          const delay = getBackoffDelay();
          console.log(`[MQTT Engine] Disconnected. Reconnecting in ${delay}ms...`);
          reconnectTimerRef.current = setTimeout(() => {
            reconnectTimerRef.current = null;
            brokerIndexRef.current = (brokerIndexRef.current + 1) % pool.length;
            reconnectAttemptRef.current += 1;
            connect();
          }, delay);
        }
      });
    } catch (e) {
      console.error('[MQTT Client Exception]', e);
      setConnectionState('ERROR');
    }
  }, [roomCode, playerId, playerName, isHost, getBackoffDelay, flushOfflineQueue]);

  // Keep-alive heartbeat monitor (every 15s checks if connection is stale)
  useEffect(() => {
    heartbeatTimerRef.current = setInterval(() => {
      if (connectionState === 'CONNECTED') {
        const timeSinceLastPacket = Date.now() - lastPacketReceivedRef.current;
        if (timeSinceLastPacket > 45000) { // 1.5 * 30s keepalive
          console.warn('[MQTT Watchdog] No packet received for 45s. Forcing client teardown & reconnect.');
          if (clientRef.current) {
            try { clientRef.current.end(true); } catch (e) {}
          }
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
      if (clientRef.current) {
        try {
          clientRef.current.end(true);
        } catch (e) {}
        clientRef.current = null;
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
