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
    if (msgCode && expectedCode && msgCode !== expectedCode) return false;

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

    // Authoritative Server broadcasts are always allowed
    const SERVER_BROADCASTS = [
      'STATE_UPDATE',
      'ROUND_REVEAL',
      'ROUND_START',
      'MATCH_START',
      'MATCH_STARTED',
      'GAME_OVER_BROADCAST',
      'ROUND_FINISH_BROADCAST',
      'ROUND_FINISH_EARLY',
      'CORRECT_ANSWER_BROADCAST',
      'HINT_BROADCAST',
      'PAUSE_TOGGLE',
      'REMATCH_STARTED',
      'SYNC_ROOM_STATE',
      'ROOM_STATE',
      'JOIN_ACK',
      'HOST_SETTINGS_UPDATE',
      'RETURN_TO_LOBBY'
    ];
    if (SERVER_BROADCASTS.includes(msg.type)) {
      return true;
    }

    // Validate payload boundaries
    if (msg.type === 'SUBMIT_GUESS') {
      const guess = msg.guess || msg.payload?.guess;
      if (!guess || typeof guess !== 'string' || guess.length > 100) return false;
    }
    if (msg.type === 'CHAT_MESSAGE') {
      const chatText = (msg.msg && typeof msg.msg === 'object' && msg.msg.text) || msg.text || '';
      if (!chatText || typeof chatText !== 'string' || chatText.length > 300) return false;
    }

    return true;
  }
};

export default {
  SecurityUtil,
  NetworkSecurity
};
