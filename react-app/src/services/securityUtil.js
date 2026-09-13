/**
 * Network Security & Sanitization Utilities
 * Protects against XSS injection, stale packet replays, and non-host command injection.
 */

export const SecurityUtil = {
  escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};

export const NetworkSecurity = {
  _secretKey: 'GTF_PROD_SEC_KEY_9921#*!',
  _rateLimits: {},

  getRoomTopic(roomCode) {
    if (!roomCode) return 'gtf_sec_v2/default';
    const code = String(roomCode).toUpperCase().trim();
    let hash = 0x811c9dc5;
    const seed = this._secretKey + ':' + code;
    for (let i = 0; i < seed.length; i++) {
      hash ^= seed.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    const hex = (hash >>> 0).toString(16).padStart(8, '0');
    return 'gtf_sec_v2/' + hex + '_' + code;
  },

  getTopicHash(roomCode) {
    const t = this.getRoomTopic(roomCode);
    return t.replace(/[^a-zA-Z0-9_]/g, '_');
  },

  generateToken(roomCode, playerId, isHost) {
    const code = String(roomCode || '').toUpperCase().trim();
    const pid = String(playerId || '').trim();
    const role = isHost ? '1' : '0';
    const ts = Date.now().toString(36);
    const payload = code + '|' + pid + '|' + role + '|' + ts;
    let hash = 0x811c9dc5;
    const input = this._secretKey + '|' + payload;
    for (let i = 0; i < input.length; i++) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    const sig = (hash >>> 0).toString(16).padStart(8, '0');
    return payload + '|' + sig;
  },

  verifyToken(token, expectedRoomCode, expectedSenderId) {
    if (!token || typeof token !== 'string') return false;
    const parts = token.split('|');
    if (parts.length !== 5) return false;
    const [code, pid, role, ts, sig] = parts;
    if (code !== String(expectedRoomCode).toUpperCase().trim()) return false;
    if (pid !== String(expectedSenderId).trim()) return false;
    const payload = code + '|' + pid + '|' + role + '|' + ts;
    let hash = 0x811c9dc5;
    const input = this._secretKey + '|' + payload;
    for (let i = 0; i < input.length; i++) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    const expectedSig = (hash >>> 0).toString(16).padStart(8, '0');
    return sig === expectedSig;
  },

  checkRateLimit(senderId) {
    const now = Date.now();
    const record = this._rateLimits[senderId] || { count: 0, resetTime: now + 1000 };
    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + 1000;
    } else {
      record.count++;
      if (record.count > 25) {
        return false;
      }
    }
    this._rateLimits[senderId] = record;
    return true;
  },

  validateIncomingMessage(msg, currentRoomCode, players = [], isLocalHost = false) {
    if (!msg || typeof msg !== 'object') return false;
    const msgCode = String(msg.roomCode || '').trim().toUpperCase();
    const expectedCode = String(currentRoomCode || '').trim().toUpperCase();
    if (msgCode !== expectedCode) return false;

    // Timestamp drift check (replay attack protection: 60s for game/chat, 5min for join/sync handshakes)
    const isJoinHandshake = msg.type === 'PLAYER_JOIN' || msg.type === 'SYNC_ROOM_STATE';
    const maxDrift = isJoinHandshake ? 300000 : 60000;
    if (msg.timestamp && Math.abs(Date.now() - msg.timestamp) > maxDrift) {
      return false;
    }

    // Rate limiting per sender
    if (msg.senderId && !this.checkRateLimit(msg.senderId)) {
      return false;
    }

    // Authoritative Host command verification
    const HOST_COMMANDS = [
      'SYNC_ROOM_STATE',
      'UPDATE_HOST_SETTINGS',
      'GAME_START_COUNTDOWN',
      'ROUND_START',
      'GUESS_CORRECT_BROADCAST',
      'ROUND_FINISH_BROADCAST',
      'HOST_SKIP_BROADCAST',
      'HOST_PAUSE_BROADCAST',
      'TIE_BREAKER_TRIGGER',
      'GAME_OVER_BROADCAST',
      'HOST_HEARTBEAT',
      'REJOIN_SYNC_STATE'
    ];

    if (HOST_COMMANDS.includes(msg.type)) {
      const registeredHost = (players || []).find(p => p.isHost);
      if (registeredHost && msg.senderId !== registeredHost.id) {
        return false;
      }
    }

    // Validate payload boundaries
    if (msg.type === 'SUBMIT_GUESS') {
      if (!msg.guess || typeof msg.guess !== 'string' || msg.guess.length > 100) return false;
    }
    if (msg.type === 'CHAT_MESSAGE') {
      if (!msg.msg || typeof msg.msg !== 'object' || !msg.msg.text || msg.msg.text.length > 300) return false;
    }

    return true;
  }
};

export default {
  SecurityUtil,
  NetworkSecurity
};
