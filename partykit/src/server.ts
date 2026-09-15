import { Server, routePartykitRequest, type Connection, type ConnectionContext } from 'partyserver';

export interface Player {
  id: string;
  name: string;
  avatar: string;
  color: string;
  score: number;
  isHost: boolean;
  connected: boolean;
}

export interface HostSettings {
  timer: number;
  rounds: number;
  categories: string[];
}

export interface RoomState {
  roomCode: string;
  hostId: string | null;
  players: Player[];
  hostSettings: HostSettings;
  playlist: any[];
  currentPlayIndex: number;
  currentFrame: any | null;
  isMatchActive: boolean;
  isRoundFinished: boolean;
  isAnswerRevealed: boolean;
  isPaused: boolean;
  timeRemaining: number;
  roundWinners: string[];
  maskedHint: string | null;
  chatMessages: any[];
}

function normalizeAnswer(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function generateMaskedHint(answer: string): string {
  if (!answer) return '';
  return answer
    .split('')
    .map((ch, idx) => (ch === ' ' ? '  ' : idx % 2 === 0 ? ch : '_'))
    .join(' ');
}

export class GameRoomServer extends Server {
  state!: RoomState;
  timerInterval: ReturnType<typeof setInterval> | null = null;
  connectionToPlayerId = new Map<string, string>();

  onStart() {
    const roomCode = this.name.toUpperCase();
    this.state = {
      roomCode,
      hostId: null,
      players: [],
      hostSettings: {
        timer: 30,
        rounds: 20,
        categories: ['frames', 'eyes', 'dialogues']
      },
      playlist: [],
      currentPlayIndex: 0,
      currentFrame: null,
      isMatchActive: false,
      isRoundFinished: false,
      isAnswerRevealed: false,
      isPaused: false,
      timeRemaining: 30,
      roundWinners: [],
      maskedHint: null,
      chatMessages: []
    };
  }

  broadcastState(eventOverride?: string) {
    const payload = {
      type: eventOverride || 'SYNC_ROOM_STATE',
      roomCode: this.state.roomCode,
      hostId: this.state.hostId,
      players: this.state.players,
      hostSettings: this.state.hostSettings,
      currentPlaylist: this.state.playlist,
      currentPlayIndex: this.state.currentPlayIndex,
      frame: this.state.currentFrame,
      isMatchActive: this.state.isMatchActive,
      isRoundFinished: this.state.isRoundFinished,
      isAnswerRevealed: this.state.isAnswerRevealed,
      isPaused: this.state.isPaused,
      timeRemaining: this.state.timeRemaining,
      roundWinners: this.state.roundWinners,
      maskedHint: this.state.maskedHint,
      timestamp: Date.now()
    };
    this.broadcast(JSON.stringify(payload));
  }

  sendToConnection(conn: Connection, msg: any) {
    try {
      conn.send(JSON.stringify(msg));
    } catch (e) {
      console.error('[PartyServer] Send error:', e);
    }
  }

  startRoundTimer() {
    this.stopRoundTimer();
    this.timerInterval = setInterval(() => {
      if (!this.state.isMatchActive || this.state.isPaused || this.state.isRoundFinished) {
        return;
      }

      if (this.state.timeRemaining > 0) {
        this.state.timeRemaining -= 1;
        // Broadcast timer tick
        this.broadcast(JSON.stringify({
          type: 'TIMER_TICK',
          timeRemaining: this.state.timeRemaining
        }));
      }

      if (this.state.timeRemaining <= 0) {
        this.handleRoundTimeout();
      }
    }, 1000);
  }

  stopRoundTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  handleRoundTimeout() {
    this.state.isRoundFinished = true;
    this.state.isAnswerRevealed = true;
    this.stopRoundTimer();

    this.broadcast(JSON.stringify({
      type: 'ROUND_FINISH_BROADCAST',
      answer: this.state.currentFrame?.answer || '',
      revealContent: this.state.currentFrame?.revealContent || this.state.currentFrame?.content,
      roundWinners: this.state.roundWinners
    }));
  }

  onConnect(conn: Connection, ctx: ConnectionContext) {
    console.log(`[PartyServer] Client connected: ${conn.id} in room ${this.name}`);
    
    // Immediately send current room state to connecting client
    this.sendToConnection(conn, {
      type: 'SYNC_ROOM_STATE',
      roomCode: this.state.roomCode,
      hostId: this.state.hostId,
      players: this.state.players,
      hostSettings: this.state.hostSettings,
      currentPlaylist: this.state.playlist,
      currentPlayIndex: this.state.currentPlayIndex,
      frame: this.state.currentFrame,
      isMatchActive: this.state.isMatchActive,
      isRoundFinished: this.state.isRoundFinished,
      isAnswerRevealed: this.state.isAnswerRevealed,
      isPaused: this.state.isPaused,
      timeRemaining: this.state.timeRemaining,
      roundWinners: this.state.roundWinners,
      maskedHint: this.state.maskedHint,
      timestamp: Date.now()
    });
  }

  onClose(conn: Connection, code: number, reason: string, wasClean: boolean) {
    const playerId = this.connectionToPlayerId.get(conn.id);
    if (!playerId) return;

    this.connectionToPlayerId.delete(conn.id);
    const player = this.state.players.find(p => p.id === playerId);
    if (player) {
      player.connected = false;
      console.log(`[PartyServer] Player ${player.name} (${playerId}) disconnected`);

      // If host disconnected, reassign host to next connected player
      if (player.isHost) {
        const nextHost = this.state.players.find(p => p.id !== playerId && p.connected);
        if (nextHost) {
          player.isHost = false;
          nextHost.isHost = true;
          this.state.hostId = nextHost.id;
          console.log(`[PartyServer] Reassigned host to ${nextHost.name} (${nextHost.id})`);
        }
      }

      this.broadcastState('ROOM_STATE');
    }
  }

  // NOTE: partyserver API has reversed argument order: (connection, message) instead of (message, connection)
  onMessage(sender: Connection, messageStr: string | ArrayBuffer) {
    try {
      const msg = JSON.parse(typeof messageStr === 'string' ? messageStr : new TextDecoder().decode(messageStr));
      if (!msg || !msg.type) return;

      switch (msg.type) {
        case 'PLAYER_JOIN': {
          const playerId = msg.id || msg.senderId || sender.id;
          const playerName = msg.name || 'Player';
          const playerAvatar = msg.avatar || 'aman';
          const playerColor = msg.color || '#FACC15';
          const wantsHost = Boolean(msg.isHost);

          this.connectionToPlayerId.set(sender.id, playerId);

          let player = this.state.players.find(p => p.id === playerId);
          const isFirstPlayer = this.state.players.length === 0;
          const shouldBeHost = wantsHost || isFirstPlayer;

          if (player) {
            // Reconnecting player
            player.name = playerName;
            player.avatar = playerAvatar;
            player.color = playerColor;
            player.connected = true;
            if (shouldBeHost && !this.state.hostId) {
              player.isHost = true;
              this.state.hostId = player.id;
            }
          } else {
            // New player
            player = {
              id: playerId,
              name: playerName,
              avatar: playerAvatar,
              color: playerColor,
              score: 0,
              isHost: shouldBeHost,
              connected: true
            };
            this.state.players.push(player);
            if (shouldBeHost && !this.state.hostId) {
              this.state.hostId = player.id;
            }
          }

          // Acknowledge join
          this.sendToConnection(sender, {
            type: 'JOIN_ACK',
            targetPlayerId: playerId,
            roomCode: this.state.roomCode,
            hostSettings: this.state.hostSettings,
            isHost: player.isHost,
            players: this.state.players
          });

          // Broadcast updated player list to room
          this.broadcastState('SYNC_ROOM_STATE');
          break;
        }

        case 'UPDATE_HOST_SETTINGS': {
          if (msg.settings) {
            this.state.hostSettings = {
              ...this.state.hostSettings,
              ...msg.settings
            };
            this.broadcast(JSON.stringify({
              type: 'HOST_SETTINGS_UPDATE',
              settings: this.state.hostSettings
            }));
          }
          break;
        }

        case 'START_GAME':
        case 'GAME_START': {
          const playlist = msg.playlist || msg.currentPlaylist || [];
          if (Array.isArray(playlist) && playlist.length > 0) {
            this.state.playlist = playlist;
          }
          this.state.currentPlayIndex = 0;
          this.state.currentFrame = this.state.playlist[0] || null;
          this.state.isMatchActive = true;
          this.state.isRoundFinished = false;
          this.state.isAnswerRevealed = false;
          this.state.isPaused = false;
          this.state.timeRemaining = this.state.hostSettings.timer || 30;
          this.state.roundWinners = [];
          this.state.maskedHint = null;

          // Reset all players scores to 0
          this.state.players.forEach(p => { p.score = 0; });

          this.startRoundTimer();

          this.broadcast(JSON.stringify({
            type: 'ROUND_START',
            roundIndex: 0,
            frame: this.state.currentFrame,
            currentPlaylist: this.state.playlist,
            duration: this.state.timeRemaining
          }));
          break;
        }

        case 'SUBMIT_GUESS': {
          const playerId = msg.playerId || msg.senderId;
          const guessText = (msg.guess || msg.text || '').trim();
          const player = this.state.players.find(p => p.id === playerId);
          const playerName = player?.name || msg.playerName || 'Player';

          // Broadcast guess to chat stream
          this.broadcast(JSON.stringify({
            type: 'CHAT_MESSAGE',
            msg: {
              id: 'guess_' + Date.now(),
              senderId: playerId,
              senderName: playerName,
              senderAvatar: player?.avatar || 'aman',
              text: guessText,
              isGuess: true
            }
          }));

          // Validate guess if round is active
          if (this.state.isMatchActive && !this.state.isRoundFinished && this.state.currentFrame?.answer) {
            const normalizedGuess = normalizeAnswer(guessText);
            const normalizedAnswer = normalizeAnswer(this.state.currentFrame.answer);

            if (normalizedGuess && normalizedAnswer && normalizedGuess === normalizedAnswer) {
              // CORRECT ANSWER!
              console.log(`[PartyServer] Correct guess by ${playerName}: "${guessText}"`);
              
              if (player) {
                player.score += 10;
              }
              if (!this.state.roundWinners.includes(playerName)) {
                this.state.roundWinners.push(playerName);
              }

              this.state.isRoundFinished = true;
              this.state.isAnswerRevealed = true;
              this.stopRoundTimer();

              // Broadcast correct guess winner announcement
              this.broadcast(JSON.stringify({
                type: 'CORRECT_ANSWER_BROADCAST',
                winnerId: playerId,
                winnerName: playerName,
                answer: this.state.currentFrame.answer,
                scoreboard: this.state.players
              }));

              this.broadcast(JSON.stringify({
                type: 'ROUND_FINISH_EARLY',
                winner: playerName,
                answer: this.state.currentFrame.answer,
                revealContent: this.state.currentFrame.revealContent || this.state.currentFrame.content,
                scoreboard: this.state.players
              }));
            }
          }
          break;
        }

        case 'SKIP_ROUND':
        case 'SKIP_FRAME': {
          this.state.isRoundFinished = true;
          this.state.isAnswerRevealed = true;
          this.stopRoundTimer();

          this.broadcast(JSON.stringify({
            type: 'ROUND_FINISH_BROADCAST',
            answer: this.state.currentFrame?.answer || '',
            revealContent: this.state.currentFrame?.revealContent || this.state.currentFrame?.content,
            roundWinners: this.state.roundWinners
          }));
          break;
        }

        case 'NEXT_ROUND': {
          const nextIdx = this.state.currentPlayIndex + 1;
          if (nextIdx >= this.state.playlist.length) {
            // All rounds complete -> Game Over
            this.handleGameOver();
            return;
          }

          this.state.currentPlayIndex = nextIdx;
          this.state.currentFrame = this.state.playlist[nextIdx];
          this.state.isRoundFinished = false;
          this.state.isAnswerRevealed = false;
          this.state.isPaused = false;
          this.state.timeRemaining = this.state.hostSettings.timer || 30;
          this.state.roundWinners = [];
          this.state.maskedHint = null;

          this.startRoundTimer();

          this.broadcast(JSON.stringify({
            type: 'ROUND_START',
            roundIndex: nextIdx,
            frame: this.state.currentFrame,
            currentPlaylist: this.state.playlist,
            duration: this.state.timeRemaining
          }));
          break;
        }

        case 'REQUEST_HINT': {
          const playerId = msg.playerId || msg.senderId;
          const player = this.state.players.find(p => p.id === playerId);
          if (player) {
            player.score = Math.max(0, player.score - 2);
          }

          if (this.state.currentFrame?.answer && !this.state.maskedHint) {
            this.state.maskedHint = generateMaskedHint(this.state.currentFrame.answer);
          }

          this.broadcast(JSON.stringify({
            type: 'HINT_BROADCAST',
            maskedHint: this.state.maskedHint,
            scoreboard: this.state.players
          }));
          break;
        }

        case 'PAUSE_TOGGLE': {
          const nextPaused = typeof msg.isPaused === 'boolean' ? msg.isPaused : !this.state.isPaused;
          this.state.isPaused = nextPaused;

          this.broadcast(JSON.stringify({
            type: 'PAUSE_TOGGLE',
            isPaused: this.state.isPaused
          }));
          break;
        }

        case 'END_MATCH':
        case 'GAME_OVER': {
          this.handleGameOver();
          break;
        }

        case 'CHAT_MESSAGE': {
          if (msg.msg) {
            this.state.chatMessages.push(msg.msg);
            if (this.state.chatMessages.length > 50) {
              this.state.chatMessages.shift();
            }
            this.broadcast(JSON.stringify({
              type: 'CHAT_MESSAGE',
              msg: msg.msg
            }));
          }
          break;
        }

        case 'ADJUST_SCORE': {
          const targetPlayerId = msg.playerId;
          const pts = Number(msg.points) || 0;
          const target = this.state.players.find(p => p.id === targetPlayerId);
          if (target) {
            target.score = Math.max(0, target.score + pts);
            this.broadcastState('SCORE_UPDATE');
          }
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error('[PartyServer] Message handling error:', err);
    }
  }

  handleGameOver() {
    this.state.isMatchActive = false;
    this.stopRoundTimer();

    // Sort players by score
    const sorted = [...this.state.players].sort((a, b) => (b.score || 0) - (a.score || 0));

    this.broadcast(JSON.stringify({
      type: 'GAME_OVER_BROADCAST',
      scoreboard: sorted
    }));
  }
}

// Worker fetch handler — routes PartyKit-compatible URLs to the Durable Object
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return (
      (await routePartykitRequest(request, env)) ||
      new Response('Not Found', { status: 404 })
    );
  }
} satisfies ExportedHandler<Env>;
