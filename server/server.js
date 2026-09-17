/**
 * ScoopCast – Standalone Node.js Realtime Multiplayer Server
 * Zero Cloudflare / Durable Object overhead. Optimized for Render Free Tier.
 */

import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { DEFAULT_FRAMES, createMatchPlaylist, sanitizeFrameForActiveRound } from './catalog.js';
import { FuzzyMatcher } from './fuzzyMatcher.js';

const PORT = process.env.PORT || 10000;

function generateMaskedHint(answer) {
  if (!answer) return '';
  return answer
    .split('')
    .map((ch, idx) => (ch === ' ' ? '  ' : idx % 2 === 0 ? ch : '_'))
    .join(' ');
}

class GameRoom {
  constructor(roomCode) {
    this.roomCode = roomCode;
    this.connections = new Map(); // connId -> WebSocket
    this.connectionToPlayerId = new Map(); // connId -> playerId
    this.fullPlaylist = [];
    this.timerInterval = null;
    this.revealTimeout = null;
    this.isPaused = false;
    this.remainingOnPause = 0;
    this.lastActivity = Date.now();
    this.lastRoundAdvanceTime = 0;
    this.hostMigrationTimeout = null;
    this.processedCommands = new Set();

    this.state = {
      version: 1,
      roomCode: this.roomCode,
      hostId: null,
      phase: 'LOBBY',
      settings: {
        timer: 30,
        rounds: 10,
        categories: ['frames', 'eyes', 'dialogues']
      },
      players: [],
      round: null,
      chat: [],
      lastCommandId: null,
      serverTime: Date.now()
    };
  }

  touch() {
    this.lastActivity = Date.now();
  }

  recordCommand(cmdId) {
    if (!cmdId) return false;
    if (this.processedCommands.has(cmdId)) return true;
    this.processedCommands.add(cmdId);
    if (this.processedCommands.size > 500) {
      const first = this.processedCommands.values().next().value;
      this.processedCommands.delete(first);
    }
    return false;
  }

  broadcast(payload) {
    const raw = typeof payload === 'string' ? payload : JSON.stringify(payload);
    for (const [_, ws] of this.connections) {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(raw);
        } catch (err) {
          console.error(`[${this.roomCode}] Broadcast send error:`, err.message);
        }
      }
    }
  }

  sendToConnection(ws, payload) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(typeof payload === 'string' ? payload : JSON.stringify(payload));
      } catch (err) {
        console.error(`[${this.roomCode}] Direct send error:`, err.message);
      }
    }
  }

  getSanitizedState() {
    const s = { ...this.state, serverTime: Date.now() };
    if (s.phase === 'ROUND_ACTIVE' && s.round && s.round.frame) {
      s.round = {
        ...s.round,
        frame: sanitizeFrameForActiveRound(s.round.frame)
      };
    }
    return s;
  }

  broadcastState(actionTag = 'STATE_UPDATE') {
    this.state.version += 1;
    this.state.serverTime = Date.now();
    const sanitized = this.getSanitizedState();
    this.broadcast({
      type: 'STATE_UPDATE',
      action: actionTag,
      state: sanitized,
      version: this.state.version,
      timestamp: this.state.serverTime
    });
  }

  clearTimers() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.revealTimeout) {
      clearTimeout(this.revealTimeout);
      this.revealTimeout = null;
    }
    if (this.hostMigrationTimeout) {
      clearTimeout(this.hostMigrationTimeout);
      this.hostMigrationTimeout = null;
    }
  }

  startRoundTimer(durationSeconds) {
    this.clearTimers();
    const endsAt = Date.now() + durationSeconds * 1000;
    if (this.state.round) {
      this.state.round.endsAt = endsAt;
    }

    this.timerInterval = setInterval(() => {
      if (this.isPaused) return;

      const timeLeft = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      this.broadcast({
        type: 'TICK',
        timeLeft,
        endsAt,
        serverTime: Date.now()
      });

      if (timeLeft <= 0) {
        this.clearTimers();
        this.handleRoundTimeout();
      }
    }, 1000);
  }

  handleRoundTimeout() {
    this.clearTimers();
    if (this.state.phase !== 'ROUND_ACTIVE') return;

    this.state.phase = 'ROUND_REVEAL';
    const currentIdx = this.state.round ? this.state.round.index : 0;
    const currentItem = this.fullPlaylist[currentIdx] || DEFAULT_FRAMES[0];

    this.broadcast({
      type: 'ROUND_REVEAL',
      answer: currentItem.answer,
      revealContent: currentItem.revealContent || currentItem.content,
      scoreboard: this.state.players,
      roundWinners: this.state.round?.winners || []
    });

    this.broadcastState('ROUND_REVEAL');

    // Reveal timer: 4 seconds then transition to next round or end of match
    this.revealTimeout = setTimeout(() => {
      if (this.state.phase !== 'ROUND_REVEAL') return;
      const nextIdx = currentIdx + 1;
      if (nextIdx >= this.fullPlaylist.length) {
        this.handleGameOver();
      } else {
        this.advanceToRound(nextIdx);
      }
    }, 4000);
  }

  advanceToRound(nextIdx) {
    this.clearTimers();
    if (nextIdx >= this.fullPlaylist.length) {
      this.handleGameOver();
      return;
    }

    const nextItem = this.fullPlaylist[nextIdx];
    const durationSeconds = this.state.settings.timer || 30;

    this.state.phase = 'ROUND_ACTIVE';
    this.isPaused = false;
    this.remainingOnPause = 0;
    this.state.chat = []; // Fresh chat stream for the round

    this.state.round = {
      index: nextIdx,
      total: this.fullPlaylist.length,
      category: nextItem.category,
      sectionName: nextItem.sectionName,
      frame: {
        id: nextItem.id,
        sectionId: nextItem.sectionId,
        sectionName: nextItem.sectionName,
        category: nextItem.category,
        type: nextItem.type,
        content: nextItem.content,
        year: nextItem.year
      },
      startedAt: Date.now(),
      endsAt: Date.now() + durationSeconds * 1000,
      maskedHint: null,
      winners: [],
      submissions: {},
      hintsUsed: {}
    };

    this.startRoundTimer(durationSeconds);
    this.broadcastState('ROUND_START');
  }

  handleGameOver() {
    this.clearTimers();
    this.state.phase = 'MATCH_OVER';
    this.state.round = null;
    this.broadcast({
      type: 'GAME_OVER_BROADCAST',
      scoreboard: this.state.players
    });
    this.broadcastState('GAME_OVER');
  }

  addConnection(connId, ws) {
    this.touch();
    this.connections.set(connId, ws);

    ws.on('message', (raw) => {
      this.touch();
      try {
        const msg = JSON.parse(raw.toString());
        this.handleMessage(connId, ws, msg);
      } catch (err) {
        console.error(`[${this.roomCode}] Message parse error:`, err.message);
      }
    });

    ws.on('close', () => {
      this.touch();
      this.removeConnection(connId);
    });

    ws.on('error', (err) => {
      console.warn(`[${this.roomCode}] Socket error on conn ${connId}:`, err.message);
    });
  }

  removeConnection(connId) {
    const playerId = this.connectionToPlayerId.get(connId);
    this.connections.delete(connId);
    this.connectionToPlayerId.delete(connId);

    if (!playerId) return;

    const player = this.state.players.find(p => p.id === playerId);
    if (player) {
      player.connected = false;
      player.disconnectedAt = Date.now();
      this.broadcast({
        type: 'PLAYER_LEFT',
        playerId,
        playerName: player.name,
        players: this.state.players
      });

      // Host reassignment grace period (60 seconds)
      // Prevents host stripping when host simply reloads or temporarily disconnects
      if (player.isHost || this.state.hostId === playerId) {
        if (this.hostMigrationTimeout) {
          clearTimeout(this.hostMigrationTimeout);
        }
        this.hostMigrationTimeout = setTimeout(() => {
          // Check if original host is still disconnected after grace period
          if (!player.connected && this.state.hostId === playerId) {
            const nextHost = this.state.players.find(p => p.connected && p.id !== playerId);
            if (nextHost) {
              player.isHost = false;
              nextHost.isHost = true;
              this.state.hostId = nextHost.id;
              console.log(`[${this.roomCode}] Host grace expired (60s). Reassigned to ${nextHost.name} (${nextHost.id})`);
              this.broadcast({
                type: 'HOST_MIGRATED',
                newHostId: nextHost.id,
                newHostName: nextHost.name,
                players: this.state.players
              });
              this.broadcastState('HOST_MIGRATED');
            }
          }
          this.hostMigrationTimeout = null;
        }, 60000); // 60-second grace window
      }

      this.broadcastState('ROOM_STATE');
    }
  }

  handleMessage(connId, ws, msg) {
    if (!msg || typeof msg !== 'object' || !msg.type) return;

    if (msg.commandId && this.recordCommand(msg.commandId)) {
      this.sendToConnection(ws, {
        type: 'COMMAND_REJECTED',
        reason: 'DUPLICATE_COMMAND_ID',
        code: 'DUPLICATE_COMMAND_ID',
        command: msg.type,
        commandId: msg.commandId
      });
      return;
    }

    const senderPlayerId = msg.playerId || msg.senderId || this.connectionToPlayerId.get(connId);
    const isSenderHost = Boolean(senderPlayerId && this.state.hostId === senderPlayerId);

    const requireHost = (cmd) => {
      if (!isSenderHost) {
        this.sendToConnection(ws, {
          type: 'COMMAND_REJECTED',
          reason: 'NOT_HOST',
          code: 'NOT_HOST',
          command: cmd,
          commandId: msg.commandId
        });
        return false;
      }
      return true;
    };

    switch (msg.type) {
      case 'JOIN_ROOM':
      case 'PLAYER_JOIN':
      case 'REJOIN_ROOM':
      case 'REQUEST_REJOIN_SYNC':
      case 'PLAYER_RECONNECT': {
        const playerId = msg.playerId || msg.id || msg.senderId || connId;
        const playerName = (msg.name || msg.playerName || 'Player').trim().slice(0, 25);
        const playerAvatar = msg.avatar || msg.playerAvatar || 'aman';
        const playerColor = msg.color || msg.playerColor || '#FACC15';
        const wantsHost = Boolean(msg.isHost);

        this.connectionToPlayerId.set(connId, playerId);

        let player = this.state.players.find(p => p.id === playerId);
        const isFirstPlayer = this.state.players.length === 0;

        // If player was previously host or room has no host and this is first or wants host:
        if (player && (player.isHost || this.state.hostId === playerId)) {
          // Host rejoining within grace period!
          if (this.hostMigrationTimeout) {
            clearTimeout(this.hostMigrationTimeout);
            this.hostMigrationTimeout = null;
          }
          this.state.hostId = playerId;
          player.isHost = true;
        } else if (!this.state.hostId && (wantsHost || isFirstPlayer)) {
          this.state.hostId = playerId;
        }

        const isThisPlayerHost = (playerId === this.state.hostId);

        let isRejoining = false;
        if (player) {
          isRejoining = true;
          player.name = playerName || player.name;
          player.avatar = playerAvatar || player.avatar;
          player.color = playerColor || player.color;
          player.connected = true;
          player.isHost = isThisPlayerHost;
          if (typeof msg.preloaded === 'boolean') player.preloaded = msg.preloaded;
          console.log(`[${this.roomCode}] Player reconnected: ${player.name} (${playerId}), isHost: ${isThisPlayerHost}`);
        } else {
          player = {
            id: playerId,
            name: playerName,
            avatar: playerAvatar,
            color: playerColor,
            score: 0,
            connected: true,
            isHost: isThisPlayerHost,
            role: isThisPlayerHost ? 'host' : 'player',
            preloaded: Boolean(msg.preloaded)
          };
          this.state.players.push(player);
          console.log(`[${this.roomCode}] Player joined: ${player.name} (${playerId}), isHost: ${isThisPlayerHost}`);
        }

        const currentState = this.getSanitizedState();

        // Send authoritative room state directly to connecting/rejoining player
        this.sendToConnection(ws, {
          type: 'ROOM_STATE',
          action: isRejoining ? 'REJOIN_SUCCESS' : 'JOIN_SUCCESS',
          state: currentState,
          version: this.state.version,
          serverTime: Date.now()
        });

        // Also send SYNC_ROOM_STATE for legacy client listeners
        this.sendToConnection(ws, {
          type: 'SYNC_ROOM_STATE',
          state: currentState,
          version: this.state.version,
          serverTime: Date.now()
        });

        // Broadcast join / reconnection to room
        this.broadcast({
          type: isRejoining ? 'PLAYER_RECONNECTED' : 'PLAYER_JOINED',
          playerId,
          player,
          players: this.state.players,
          hostId: this.state.hostId
        });

        this.broadcastState(isRejoining ? 'PLAYER_RECONNECTED' : 'ROOM_STATE');
        break;
      }

      case 'START_GAME':
      case 'START_MATCH': {
        if (!requireHost('START_GAME')) return;

        if (msg.settings) {
          this.state.settings = { ...this.state.settings, ...msg.settings };
        }

        const totalRounds = this.state.settings.rounds || 10;
        this.fullPlaylist = createMatchPlaylist(this.state.settings.categories, totalRounds);

        if (!this.fullPlaylist || this.fullPlaylist.length === 0) {
          this.fullPlaylist = [...DEFAULT_FRAMES];
        }

        this.state.players.forEach(p => { p.score = 0; });
        this.advanceToRound(0);
        break;
      }

      case 'NEXT_ROUND': {
        if (!requireHost('NEXT_ROUND')) return;
        const now = Date.now();
        if (this.lastRoundAdvanceTime && (now - this.lastRoundAdvanceTime < 500)) return;
        this.lastRoundAdvanceTime = now;

        const currentIdx = this.state.round ? this.state.round.index : 0;
        this.advanceToRound(currentIdx + 1);
        break;
      }

      case 'SKIP_ROUND':
      case 'SKIP_FRAME': {
        if (!requireHost('SKIP_ROUND')) return;
        if (this.state.phase === 'ROUND_ACTIVE') {
          this.handleRoundTimeout();
        }
        break;
      }

      case 'TOGGLE_PAUSE':
      case 'PAUSE_TOGGLE': {
        if (!requireHost('TOGGLE_PAUSE')) return;
        if (this.state.phase !== 'ROUND_ACTIVE' || !this.state.round) return;

        this.isPaused = !this.isPaused;
        if (this.isPaused) {
          this.remainingOnPause = Math.max(0, this.state.round.endsAt - Date.now());
        } else {
          this.state.round.endsAt = Date.now() + this.remainingOnPause;
          this.remainingOnPause = 0;
        }

        this.broadcast({
          type: 'PAUSE_STATE',
          isPaused: this.isPaused,
          endsAt: this.state.round.endsAt
        });
        this.broadcastState('PAUSE_TOGGLE');
        break;
      }

      case 'SUBMIT_GUESS': {
        const playerId = msg.playerId || msg.senderId || senderPlayerId;
        const guessText = (msg.guess || msg.text || '').trim();
        const timestamp = Date.now();

        if (!playerId || !guessText) return;

        if (this.state.phase !== 'ROUND_ACTIVE' || !this.state.round) {
          this.sendToConnection(ws, {
            type: 'GUESS_EVALUATED',
            result: 'REJECTED',
            reason: 'ROUND_NOT_ACTIVE',
            code: 'ROUND_NOT_ACTIVE',
            guess: guessText
          });
          return;
        }

        const player = this.state.players.find(p => p.id === playerId);
        const playerName = player ? player.name : (msg.playerName || 'Player');
        const playerAvatar = player ? player.avatar : (msg.playerAvatar || 'aman');

        // Check if player has already won this round
        const alreadyWon = this.state.round.winners.some(w => w.playerId === playerId);
        if (alreadyWon) {
          const secretItem = this.fullPlaylist[this.state.round.index] || null;
          const answer = secretItem?.answer || '';
          const isSpoiler = Boolean(
            answer &&
            (FuzzyMatcher.isMatch(guessText, answer) ||
             (answer.length >= 3 && guessText.toUpperCase().includes(answer.toUpperCase())))
          );

          const guessId = 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
          const displayText = isSpoiler ? '🤫 spoiler hidden' : guessText;
          const msgType = isSpoiler ? 'spoiler_hidden' : 'player_chat';

          const chatObj = {
            id: guessId,
            type: msgType,
            roundIndex: this.state.round.index,
            senderId: playerId,
            senderName: playerName,
            senderAvatar: playerAvatar,
            text: displayText,
            isGuess: false,
            timestamp
          };

          this.state.chat.push(chatObj);
          if (this.state.chat.length > 50) this.state.chat.shift();

          this.broadcast({
            type: 'CHAT_MESSAGE',
            roomCode: this.roomCode,
            senderId: playerId,
            id: guessId,
            timestamp,
            msg: chatObj
          });
          return;
        }

        const secretItem = this.fullPlaylist[this.state.round.index] || null;
        const answer = secretItem?.answer || '';
        const isMatch = Boolean(answer && FuzzyMatcher.isMatch(guessText, answer));

        if (isMatch) {
          const pos = this.state.round.winners.length + 1;
          const basePoints = pos === 1 ? 10 : pos === 2 ? 7 : 5;
          const usedHint = Boolean(this.state.round.hintsUsed[playerId]);
          const points = Math.max(1, basePoints - (usedHint ? 2 : 0));

          if (player) {
            player.score = (player.score || 0) + points;
          }

          const winnerRecord = {
            playerId,
            playerName,
            playerAvatar,
            points,
            position: pos,
            timestamp,
            hintsUsed: usedHint
          };

          this.state.round.winners.push(winnerRecord);
          this.state.round.submissions[playerId] = {
            submitted: true,
            submittedAt: timestamp,
            guess: guessText,
            result: 'CORRECT',
            points
          };

          this.sendToConnection(ws, {
            type: 'GUESS_EVALUATED',
            result: 'CORRECT',
            points,
            position: pos,
            playerId,
            guess: guessText
          });

          // Level 1 Winner Announcement Card in Activity Stream (Strictly zero movie title leak!)
          const winMsgId = 'win_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
          const winMsg = {
            id: winMsgId,
            type: 'winner',
            roundIndex: this.state.round.index,
            senderId: playerId,
            senderName: playerName,
            senderAvatar: playerAvatar,
            text: `${playerName.toUpperCase()} GUESSED +${points} PTS`,
            isGuess: false,
            timestamp,
            points,
            position: pos,
            reactions: { likes: [], dislikes: [] }
          };
          this.state.chat.push(winMsg);
          if (this.state.chat.length > 50) this.state.chat.shift();

          this.broadcast({
            type: 'CORRECT_ANSWER_BROADCAST',
            winner: winnerRecord,
            winnerId: playerId,
            winnerName: playerName,
            scoreboard: this.state.players,
            roundWinners: this.state.round.winners,
            chatMessage: winMsg,
            version: this.state.version
          });

          this.broadcast({
            type: 'CHAT_MESSAGE',
            roomCode: this.roomCode,
            senderId: playerId,
            id: winMsg.id,
            timestamp,
            msg: winMsg
          });

          // Check if round should end early (3 winners or all connected won)
          const connectedCount = this.state.players.filter(p => p.connected).length;
          if (this.state.round.winners.length >= 3 || this.state.round.winners.length >= connectedCount) {
            this.handleRoundTimeout();
            return;
          }

          // Accelerate countdown on 1st winner to 10s if > 10s left
          if (pos === 1) {
            const timeLeft = Math.max(0, this.state.round.endsAt - Date.now());
            if (timeLeft > 10000) {
              this.startRoundTimer(10);
              this.broadcastState('HURRY_UP_CLOCK');
              return;
            }
          }

          this.broadcastState('STATE_UPDATE');
        } else {
          // Incorrect guess: Record submission & notify submitter
          this.state.round.submissions[playerId] = {
            submitted: true,
            submittedAt: timestamp,
            guess: guessText,
            result: 'INCORRECT'
          };

          this.sendToConnection(ws, {
            type: 'GUESS_EVALUATED',
            result: 'INCORRECT',
            reason: 'INCORRECT_ANSWER',
            code: 'INCORRECT_ANSWER',
            playerId,
            guess: guessText
          });

          // Public activity stream wrong guess card
          const guessId = 'guess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
          const chatObj = {
            id: guessId,
            type: 'guess_attempt',
            roundIndex: this.state.round.index,
            senderId: playerId,
            senderName: playerName,
            senderAvatar: playerAvatar,
            text: `${playerName} guessed: "${guessText}"`,
            guessText: guessText,
            isGuess: true,
            timestamp
          };

          this.state.chat.push(chatObj);
          if (this.state.chat.length > 50) this.state.chat.shift();

          this.broadcast({
            type: 'CHAT_MESSAGE',
            roomCode: this.roomCode,
            senderId: playerId,
            id: guessId,
            timestamp,
            msg: chatObj
          });

          this.broadcastState('CHAT_EVENT');
        }
        break;
      }

      case 'SEND_CHAT':
      case 'CHAT_MESSAGE': {
        const rawMsg = msg.msg || msg;
        const text = (rawMsg.text || msg.text || '').trim();
        const senderId = msg.senderId || msg.playerId || senderPlayerId;
        const senderName = msg.senderName || msg.name || 'Player';
        const senderAvatar = msg.senderAvatar || msg.avatar || 'aman';
        const timestamp = Date.now();

        if (!text || !senderId) return;

        let displayText = text;
        let msgType = 'player_chat';

        if (this.state.phase === 'ROUND_ACTIVE' && this.state.round) {
          const secretItem = this.fullPlaylist[this.state.round.index] || null;
          const answer = secretItem?.answer || '';
          if (answer) {
            const isMatch = FuzzyMatcher.isMatch(text, answer);
            const containsAnswer = answer.length >= 3 && text.toUpperCase().includes(answer.toUpperCase());
            if (isMatch || containsAnswer) {
              const alreadyWon = this.state.round.winners.some(w => w.playerId === senderId);
              if (!alreadyWon && isMatch) {
                // Route chat as guess!
                this.handleMessage(connId, ws, {
                  type: 'SUBMIT_GUESS',
                  playerId: senderId,
                  senderId,
                  playerName: senderName,
                  playerAvatar: senderAvatar,
                  guess: text
                });
                return;
              } else {
                displayText = '🤫 spoiler hidden';
                msgType = 'spoiler_hidden';
              }
            }
          }
        }

        const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        const chatObj = {
          id: msgId,
          type: msgType,
          roundIndex: this.state.round?.index,
          senderId,
          senderName,
          senderAvatar,
          text: displayText,
          isGuess: Boolean(rawMsg.isGuess || msg.isGuess),
          timestamp
        };

        this.state.chat.push(chatObj);
        if (this.state.chat.length > 50) this.state.chat.shift();

        this.broadcast({
          type: 'CHAT_MESSAGE',
          roomCode: this.roomCode,
          senderId,
          id: msgId,
          timestamp,
          msg: chatObj
        });
        break;
      }

      case 'REACTION': {
        const senderId = msg.senderId || msg.playerId || senderPlayerId;
        const messageId = msg.messageId;
        const reaction = msg.reaction; // 'like' | 'dislike'

        if (!senderId || !messageId || !['like', 'dislike'].includes(reaction)) return;

        const targetMsg = this.state.chat.find(m => m.id === messageId);
        if (!targetMsg || targetMsg.type !== 'winner' || !targetMsg.reactions) return;

        if (targetMsg.senderId === senderId) {
          this.sendToConnection(ws, {
            type: 'COMMAND_REJECTED',
            reason: 'CANNOT_REACT_TO_SELF',
            code: 'CANNOT_REACT_TO_SELF',
            command: 'REACTION'
          });
          return;
        }

        const reactions = targetMsg.reactions;
        let isNowActive = false;

        if (reaction === 'like') {
          const idx = reactions.likes.indexOf(senderId);
          if (idx !== -1) {
            reactions.likes.splice(idx, 1);
            isNowActive = false;
          } else {
            reactions.likes.push(senderId);
            reactions.dislikes = reactions.dislikes.filter(id => id !== senderId);
            isNowActive = true;
          }
        } else if (reaction === 'dislike') {
          const idx = reactions.dislikes.indexOf(senderId);
          if (idx !== -1) {
            reactions.dislikes.splice(idx, 1);
            isNowActive = false;
          } else {
            reactions.dislikes.push(senderId);
            reactions.likes = reactions.likes.filter(id => id !== senderId);
            isNowActive = true;
          }
        }

        this.broadcast({
          type: 'CHAT_MESSAGE_UPDATE',
          messageId,
          reactions: targetMsg.reactions
        });

        // Private reaction notification sent strictly to the winner
        if (isNowActive && targetMsg.senderId) {
          const reactor = this.state.players.find(p => p.id === senderId);
          const reactorName = reactor?.name || 'Someone';
          const notifText = reaction === 'like' ? `${reactorName} liked your answer` : `${reactorName} disliked you`;
          const notifId = 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);

          const notifMsg = {
            id: notifId,
            type: 'reaction_notification',
            roundIndex: this.state.round?.index,
            senderId,
            senderName: reactorName,
            senderAvatar: reactor?.avatar || 'aman',
            text: notifText,
            timestamp: Date.now(),
            targetPlayerId: targetMsg.senderId
          };

          for (const [cId, targetWs] of this.connections) {
            if (this.connectionToPlayerId.get(cId) === targetMsg.senderId) {
              this.sendToConnection(targetWs, {
                type: 'CHAT_MESSAGE',
                roomCode: this.roomCode,
                senderId,
                id: notifId,
                timestamp: Date.now(),
                msg: notifMsg
              });
            }
          }
        }
        break;
      }

      case 'REQUEST_HINT': {
        const playerId = msg.playerId || msg.senderId || senderPlayerId;
        if (!playerId || this.state.phase !== 'ROUND_ACTIVE' || !this.state.round) return;

        this.state.round.hintsUsed[playerId] = true;
        const secretItem = this.fullPlaylist[this.state.round.index] || null;
        const answer = secretItem?.answer || '';
        const masked = generateMaskedHint(answer);
        this.state.round.maskedHint = masked;

        this.sendToConnection(ws, {
          type: 'HINT_BROADCAST',
          maskedHint: masked,
          cost: 2
        });
        break;
      }

      case 'ADJUST_SCORE': {
        if (!requireHost('ADJUST_SCORE')) return;
        const targetPlayerId = msg.targetPlayerId || msg.playerId;
        const points = Number(msg.points);
        if (!targetPlayerId || !Number.isInteger(points) || points < -50 || points > 50) {
          this.sendToConnection(ws, {
            type: 'COMMAND_REJECTED',
            reason: 'INVALID_SCORE_ADJUSTMENT',
            code: 'INVALID_SCORE_ADJUSTMENT',
            command: 'ADJUST_SCORE',
            commandId: msg.commandId
          });
          return;
        }
        const targetPlayer = this.state.players.find(p => p.id === targetPlayerId);
        if (!targetPlayer) {
          this.sendToConnection(ws, {
            type: 'COMMAND_REJECTED',
            reason: 'PLAYER_NOT_FOUND',
            code: 'PLAYER_NOT_FOUND',
            command: 'ADJUST_SCORE',
            commandId: msg.commandId
          });
          return;
        }
        targetPlayer.score = Math.max(0, (targetPlayer.score || 0) + points);
        this.broadcast({
          type: 'SCORE_UPDATE',
          targetPlayerId,
          score: targetPlayer.score,
          scoreboard: this.state.players
        });
        this.broadcastState('SCORE_UPDATE');
        break;
      }

      case 'KICK_PLAYER': {
        if (!requireHost('KICK_PLAYER')) return;
        const targetPlayerId = msg.targetPlayerId || msg.playerId;
        if (targetPlayerId) {
          this.state.players = this.state.players.filter(p => p.id !== targetPlayerId);
          for (const [cId, targetWs] of this.connections) {
            if (this.connectionToPlayerId.get(cId) === targetPlayerId) {
              this.sendToConnection(targetWs, {
                type: 'KICKED',
                reason: 'KICKED_BY_HOST'
              });
              try { targetWs.close(); } catch (e) {}
            }
          }
          this.broadcastState('PLAYER_KICKED');
        }
        break;
      }

      case 'REMATCH': {
        if (!requireHost('REMATCH')) return;
        this.clearTimers();
        this.state.players.forEach(p => { p.score = 0; });
        this.state.chat = [];
        this.fullPlaylist = createMatchPlaylist(this.state.settings.categories, this.state.settings.rounds || 10);
        this.advanceToRound(0);
        break;
      }

      case 'RETURN_TO_LOBBY': {
        if (!requireHost('RETURN_TO_LOBBY')) return;
        this.clearTimers();
        this.state.phase = 'LOBBY';
        this.state.round = null;
        this.state.chat = [];
        this.broadcastState('RETURN_TO_LOBBY');
        break;
      }

      case 'SYNC_STATE': {
        this.sendToConnection(ws, {
          type: 'SYNC_STATE',
          state: this.getSanitizedState(),
          version: this.state.version,
          serverTime: Date.now()
        });
        break;
      }

      case 'PING': {
        this.sendToConnection(ws, { type: 'PONG', timestamp: Date.now() });
        break;
      }

      default:
        break;
    }
  }
}

// Global Room Registry
const rooms = new Map();

function getOrCreateRoom(rawCode) {
  const code = (rawCode || 'DEFAULT').trim().toUpperCase();
  let room = rooms.get(code);
  if (!room) {
    room = new GameRoom(code);
    rooms.set(code, room);
    console.log(`[Server] Created new room: ${code}`);
  }
  return room;
}

// Inactive Room Garbage Collector (prunes rooms empty for > 15 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    const hasActiveConns = room.connections.size > 0;
    const isOld = (now - room.lastActivity) > (15 * 60 * 1000);
    if (!hasActiveConns && isOld) {
      room.clearTimers();
      rooms.delete(code);
      console.log(`[Server] Pruned inactive room: ${code}`);
    }
  }
}, 5 * 60 * 1000);

// HTTP Server
const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // Health check endpoint for Render & UptimeRobot
  if (url.pathname === '/health' || url.pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      activeRooms: rooms.size,
      uptime: Math.floor(process.uptime()),
      timestamp: Date.now()
    }));
    return;
  }

  // Root endpoint
  if (url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`ScoopCast Multiplayer Server is operational. Active rooms: ${rooms.size}`);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

// WebSocket Server
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const pathname = url.pathname;

  // Supports /parties/main/:roomCode OR /ws/:roomCode OR /:roomCode
  let roomCode = 'MAIN';
  const matchParty = pathname.match(/^\/parties\/main\/([A-Za-z0-9_-]+)/);
  const matchWs = pathname.match(/^\/ws\/([A-Za-z0-9_-]+)/);

  if (matchParty) {
    roomCode = matchParty[1];
  } else if (matchWs) {
    roomCode = matchWs[1];
  } else {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length > 0) {
      roomCode = parts[parts.length - 1];
    }
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    const connId = 'conn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const room = getOrCreateRoom(roomCode);
    room.addConnection(connId, ws);
  });
});

server.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 ScoopCast Realtime Server listening on port ${PORT}`);
  console.log(`   Health Check: http://localhost:${PORT}/health`);
  console.log(`   WebSocket URL: ws://localhost:${PORT}/parties/main/:roomCode`);
  console.log(`=========================================`);
});
