import { WS_BASE_URL } from '../config/env';

/**
 * Client WebSocket Realtime Client for Guess The Frame
 */
class SocketClient {
  constructor() {
    this.ws = null;
    this.listeners = new Map(); // eventType -> Set of callbacks
    this.connected = false;
    this.reconnectTimer = null;
    this.reconnectAttempts = 0;
    this.messageQueue = [];
    this.roomCode = null;
  }

  connect() {
    if (typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const url = WS_BASE_URL;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.connected = true;
        this.reconnectAttempts = 0;
        this.emit('connection_change', true);

        // Flush queued messages
        while (this.messageQueue.length > 0) {
          const queued = this.messageQueue.shift();
          this.send(queued.type, queued.payload);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.emit(msg.type, msg);
          this.emit('*', msg);
        } catch (err) {
          console.warn('[SocketClient] Failed to parse message:', err);
        }
      };

      this.ws.onclose = () => {
        this.connected = false;
        this.emit('connection_change', false);
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.warn('[SocketClient] WebSocket error:', err);
      };
    } catch (err) {
      console.warn('[SocketClient] Connection failed:', err);
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 10000);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  send(type, payload = {}) {
    const message = { type, ...payload, timestamp: Date.now() };

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.messageQueue.push({ type, payload });
      this.connect();
    }
  }

  on(type, callback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type).add(callback);
    return () => this.off(type, callback);
  }

  off(type, callback) {
    if (this.listeners.has(type)) {
      this.listeners.get(type).delete(callback);
    }
  }

  emit(type, data) {
    if (this.listeners.has(type)) {
      for (const cb of this.listeners.get(type)) {
        try {
          cb(data);
        } catch (e) {
          console.error(`[SocketClient] Error in listener for ${type}:`, e);
        }
      }
    }
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }
}

const socketClient = new SocketClient();
export default socketClient;
