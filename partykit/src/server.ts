import { Server, routePartykitRequest, type Connection, type ConnectionContext } from 'partyserver';
import { CatalogItem, createMatchPlaylist, DEFAULT_FRAMES } from './catalog';
import { FuzzyMatcher } from './fuzzyMatcher';

export type GamePhase = 'LOBBY' | 'STARTING' | 'ROUND_ACTIVE' | 'ROUND_REVEAL' | 'MATCH_OVER';

export interface Player {
  id: string;
  name: string;
  avatar: string;
  color: string;
  score: number;
  isHost: boolean;
  connected: boolean;
  preloaded: boolean;
}

export interface HostSettings {
  timer: number;
  rounds: number;
  categories: string[];
}

export interface RoundWinner {
  playerId: string;
  playerName: string;
  playerAvatar: string;
  position: 1 | 2 | 3;
  points: number;
  guessedAt: number;
}

export interface RoundSubmission {
  submitted: boolean;
  submittedAt: number;
  guess: string;
  result: 'CORRECT' | 'INCORRECT';
}

export interface ActiveRound {
  index: number;
  total: number;
  category: string;
  sectionName: string;
  frame: {
    id?: string;
    sectionId?: number;
    sectionName?: string;
    category?: string;
    type: 'image' | 'dialogue';
    content: string;
    year?: string;
    answer?: string;         // Secret: Omitted during ROUND_ACTIVE!
    revealContent?: string;  // Secret: Omitted during ROUND_ACTIVE!
  };
  startedAt: number;
  endsAt: number;
  maskedHint: string | null;
  winners: RoundWinner[];
  submissions: Record<string, RoundSubmission>;
  hintsUsed: Record<string, boolean>;
}

export type ChatEventType =
  | 'winner'
  | 'spoiler_hidden'
  | 'guess_attempt'
  | 'player_chat'
  | 'reaction_notification'
  | 'system';

export interface ReactionRecord {
  likes: string[];
  dislikes: string[];
}

export interface ChatMessage {
  id: string;
  type?: ChatEventType | string;
  roundIndex?: number;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  isGuess?: boolean;
  guessText?: string;
  timestamp: number;
  points?: number;
  position?: 1 | 2 | 3;
  reactions?: ReactionRecord;
  targetPlayerId?: string;
}

export interface AuthoritativeGameState {
  version: number;
  roomCode: string;
  hostId: string | null;
  phase: GamePhase;
  settings: HostSettings;
  players: Player[];
  round: ActiveRound | null;
  chat: ChatMessage[];
  lastCommandId: string | null;
  serverTime: number;
}

function generateMaskedHint(answer: string): string {
  if (!answer) return '';
  return answer
    .split('')
    .map((ch, idx) => (ch === ' ' ? '  ' : idx % 2 === 0 ? ch : '_'))
    .join(' ');
}

export class GameRoomServer extends Server {
  state!: AuthoritativeGameState;
  fullPlaylist: CatalogItem[] = [];
  seenCommandIds = new Set<string>();
  seenCommandOrder: string[] = [];
  connectionToPlayerId = new Map<string, string>();
  activeTimeout: ReturnType<typeof setTimeout> | null = null;
  hostMigrationTimeout: ReturnType<typeof setTimeout> | null = null;
  isPaused: boolean = false;
  remainingOnPause: number = 0;
  lastRoundAdvanceTime: number = 0;

  async onStart() {
    const roomCode = this.name.toUpperCase();

    // Hydrate state from SQLite storage if available
    let savedState: AuthoritativeGameState | null = null;
    try {
      savedState = (await this.ctx.storage.get<AuthoritativeGameState>('state')) || null;
      const savedPlaylist = await this.ctx.storage.get<CatalogItem[]>('playlist');
      if (savedPlaylist && Array.isArray(savedPlaylist)) {
        this.fullPlaylist = savedPlaylist;
      }
    } catch (e) {
      console.warn('[GameRoomServer] Could not load persisted state from storage:', e);
    }

    if (savedState) {
      this.state = savedState;
      this.state.roomCode = roomCode;
    } else {
      this.state = {
        version: 1,
        roomCode,
        hostId: null,
        phase: 'LOBBY',
        settings: {
          timer: 30,
          rounds: 20,
          categories: ['frames', 'eyes', 'dialogues']
        },
        players: [],
        round: null,
        chat: [],
        lastCommandId: null,
        serverTime: Date.now()
      };
    }
  }

  async persistState() {
    try {
      await this.ctx.storage.put('state', this.state);
      if (this.fullPlaylist && this.fullPlaylist.length > 0) {
        await this.ctx.storage.put('playlist', this.fullPlaylist);
      }
    } catch (e) {
      console.warn('[GameRoomServer] Error persisting state to SQLite:', e);
    }
  }

  recordCommand(commandId?: string): boolean {
    if (!commandId || typeof commandId !== 'string' || !commandId.trim()) return false;
    if (this.seenCommandIds.has(commandId)) {
      return true; // Already processed -> duplicate!
    }
    this.seenCommandIds.add(commandId);
    this.seenCommandOrder.push(commandId);
    if (this.seenCommandOrder.length > 200) {
      const oldest = this.seenCommandOrder.shift();
      if (oldest) this.seenCommandIds.delete(oldest);
    }
    this.state.lastCommandId = commandId;
    return false;
  }

  /**
   * Generates client-safe state: strips answers during ROUND_ACTIVE
   */
  getClientSafeState(): AuthoritativeGameState {
    const safeRound = this.state.round ? { ...this.state.round } : null;

    if (safeRound && safeRound.frame) {
      if (this.state.phase === 'ROUND_ACTIVE') {
        const { answer, revealContent, ...safeFrame } = safeRound.frame;
        safeRound.frame = safeFrame as any;
      } else {
        // ROUND_REVEAL or MATCH_OVER: reveal answer
        const secretItem = this.fullPlaylist[safeRound.index];
        if (secretItem) {
          safeRound.frame = {
            ...safeRound.frame,
            answer: secretItem.answer,
            revealContent: secretItem.revealContent || secretItem.content
          };
        }
      }
    }

    return {
      ...this.state,
      round: safeRound,
      serverTime: Date.now()
    };
  }

  deriveCurrentScreen(): string {
    switch (this.state.phase) {
      case 'LOBBY':
        return 'playerLobbyScreen';
      case 'STARTING':
      case 'ROUND_ACTIVE':
      case 'ROUND_REVEAL':
        return 'gameScreen';
      case 'MATCH_OVER':
        return 'winnerScreen';
      default:
        return 'playerLobbyScreen';
    }
  }

  broadcastState(eventOverride?: string) {
    this.state.version += 1;
    this.state.serverTime = Date.now();

    const clientSafe = this.getClientSafeState();
    const currentIdx = this.state.round ? this.state.round.index : 0;
    const curFrame = clientSafe.round ? clientSafe.round.frame : null;
    const timeRemaining = clientSafe.round && clientSafe.round.endsAt
      ? Math.max(0, Math.ceil((clientSafe.round.endsAt - Date.now()) / 1000))
      : (this.state.settings.timer || 30);

    const payload = {
      type: eventOverride || 'STATE_UPDATE',
      state: clientSafe,
      version: this.state.version,
      // Backward-compatibility properties for existing components:
      roomCode: this.state.roomCode,
      hostId: this.state.hostId,
      players: this.state.players,
      hostSettings: this.state.settings,
      currentPlaylist: this.fullPlaylist.map(item => {
        if (this.state.phase === 'ROUND_ACTIVE') {
          const { answer, revealContent, ...safe } = item;
          return safe;
        }
        return item;
      }),
      currentPlayIndex: currentIdx,
      frame: curFrame,
      isMatchActive: this.state.phase === 'ROUND_ACTIVE' || this.state.phase === 'ROUND_REVEAL' || this.state.phase === 'STARTING',
      isRoundFinished: this.state.phase === 'ROUND_REVEAL' || this.state.phase === 'MATCH_OVER',
      isAnswerRevealed: this.state.phase === 'ROUND_REVEAL' || this.state.phase === 'MATCH_OVER',
      isPaused: this.isPaused,
      timeRemaining: this.isPaused ? this.remainingOnPause : timeRemaining,
      roundWinners: this.state.round?.winners || [],
      maskedHint: this.state.round?.maskedHint || null,
      submissions: this.state.round?.submissions || {},
      hintsUsed: this.state.round?.hintsUsed || {},
      currentScreen: this.deriveCurrentScreen(),
      timestamp: Date.now()
    };

    this.broadcast(JSON.stringify(payload));
  }

  sendToConnection(conn: Connection, msg: any) {
    try {
      conn.send(JSON.stringify(msg));
    } catch (e) {
      console.error('[GameRoomServer] Send error:', e);
    }
  }

  async scheduleRoundTimer(durationSeconds: number) {
    this.clearRoundTimer();
    const durationMs = durationSeconds * 1000;
    const now = Date.now();
    const endsAt = now + durationMs;

    if (this.state.round) {
      this.state.round.startedAt = now;
      this.state.round.endsAt = endsAt;
    }

    try {
      await this.ctx.storage.setAlarm(endsAt);
    } catch (e) {
      // Storage alarm error fallback
    }

    this.activeTimeout = setTimeout(() => {
      this.handleRoundTimeout();
    }, durationMs);
  }

  async clearRoundTimer() {
    if (this.activeTimeout) {
      clearTimeout(this.activeTimeout);
      this.activeTimeout = null;
    }
    try {
      await this.ctx.storage.deleteAlarm();
    } catch (e) {}
  }

  async onAlarm() {
    if (this.state.phase === 'ROUND_ACTIVE' && this.state.round && Date.now() >= this.state.round.endsAt) {
      this.handleRoundTimeout();
    }
  }

  handleRoundTimeout() {
    if (this.state.phase !== 'ROUND_ACTIVE' || !this.state.round) return;

    this.clearRoundTimer();
    this.state.phase = 'ROUND_REVEAL';

    const secretItem = this.fullPlaylist[this.state.round.index];
    const answer = secretItem?.answer || '';
    const revealContent = secretItem?.revealContent || secretItem?.content || '';

    this.state.round.frame.answer = answer;
    this.state.round.frame.revealContent = revealContent;

    // Broadcast authoritative state and round end notice
    this.broadcastState('ROUND_REVEAL');

    this.broadcast(JSON.stringify({
      type: 'ROUND_FINISH_BROADCAST',
      answer,
      revealContent,
      roundWinners: this.state.round.winners,
      roundIndex: this.state.round.index
    }));

    this.persistState();
  }

  onConnect(conn: Connection, ctx: ConnectionContext) {
    console.log(`[GameRoomServer] Client connected: ${conn.id} in room ${this.name}`);
    const clientSafe = this.getClientSafeState();

    const timeRemaining = clientSafe.round && clientSafe.round.endsAt
      ? Math.max(0, Math.ceil((clientSafe.round.endsAt - Date.now()) / 1000))
      : (this.state.settings.timer || 30);

    // Immediately send authoritative state sync to connecting client
    this.sendToConnection(conn, {
      type: 'STATE_UPDATE',
      state: clientSafe,
      version: this.state.version,
      roomCode: this.state.roomCode,
      hostId: this.state.hostId,
      players: this.state.players,
      hostSettings: this.state.settings,
      currentPlayIndex: clientSafe.round ? clientSafe.round.index : 0,
      frame: clientSafe.round ? clientSafe.round.frame : null,
      isMatchActive: this.state.phase === 'ROUND_ACTIVE' || this.state.phase === 'ROUND_REVEAL' || this.state.phase === 'STARTING',
      isRoundFinished: this.state.phase === 'ROUND_REVEAL' || this.state.phase === 'MATCH_OVER',
      isAnswerRevealed: this.state.phase === 'ROUND_REVEAL' || this.state.phase === 'MATCH_OVER',
      isPaused: this.isPaused,
      timeRemaining: this.isPaused ? this.remainingOnPause : timeRemaining,
      roundWinners: this.state.round?.winners || [],
      maskedHint: this.state.round?.maskedHint || null,
      submissions: this.state.round?.submissions || {},
      hintsUsed: this.state.round?.hintsUsed || {},
      currentScreen: this.deriveCurrentScreen(),
      chatMessages: this.state.chat,
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
      console.log(`[GameRoomServer] Player ${player.name} (${playerId}) disconnected`);

      // 60-second host grace period: prevent host loss on page reload or WiFi blip
      if (player.isHost || this.state.hostId === playerId) {
        if (this.hostMigrationTimeout) {
          clearTimeout(this.hostMigrationTimeout);
        }
        this.hostMigrationTimeout = setTimeout(() => {
          if (!player.connected && this.state.hostId === playerId) {
            const nextHost = this.state.players.find(p => p.id !== playerId && p.connected);
            if (nextHost) {
              player.isHost = false;
              nextHost.isHost = true;
              this.state.hostId = nextHost.id;
              console.log(`[GameRoomServer] Host grace expired (60s). Reassigned to ${nextHost.name} (${nextHost.id})`);
              this.broadcastState('HOST_MIGRATED');
              this.persistState();
            }
          }
          this.hostMigrationTimeout = null;
        }, 60000);
      }

      this.broadcastState('ROOM_STATE');
      this.persistState();
    }
  }

  onMessage(sender: Connection, messageStr: string | ArrayBuffer) {
    try {
      const msg = JSON.parse(typeof messageStr === 'string' ? messageStr : new TextDecoder().decode(messageStr));
      if (!msg || typeof msg !== 'object' || !msg.type) return;

      // Deduplication guard for commands
      if (msg.commandId && this.recordCommand(msg.commandId)) {
        console.log(`[GameRoomServer] Ignored duplicate command: ${msg.commandId} (${msg.type})`);
        this.sendToConnection(sender, {
          type: 'COMMAND_REJECTED',
          reason: 'DUPLICATE_COMMAND_ID',
          code: 'DUPLICATE_COMMAND_ID',
          command: msg.type,
          commandId: msg.commandId
        });
        return;
      }

      const senderPlayerId = msg.playerId || msg.senderId || this.connectionToPlayerId.get(sender.id);
      const isSenderHost = Boolean(senderPlayerId && this.state.hostId === senderPlayerId);

      const requireHost = (commandName: string): boolean => {
        if (!isSenderHost) {
          console.warn(`[GameRoomServer] ${commandName} rejected: sender ${senderPlayerId} is not host (host is ${this.state.hostId})`);
          this.sendToConnection(sender, {
            type: 'COMMAND_REJECTED',
            reason: 'NOT_HOST',
            code: 'NOT_HOST',
            command: commandName,
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
          const playerId = msg.playerId || msg.id || msg.senderId || sender.id;
          const playerName = (msg.name || msg.playerName || 'Player').trim().slice(0, 25);
          const playerAvatar = msg.avatar || msg.playerAvatar || 'aman';
          const playerColor = msg.color || msg.playerColor || '#FACC15';
          const wantsHost = Boolean(msg.isHost);

          this.connectionToPlayerId.set(sender.id, playerId);

          let player = this.state.players.find(p => p.id === playerId);
          const isFirstPlayer = this.state.players.length === 0;

          // Host rejoining within grace period
          if (player && (player.isHost || this.state.hostId === playerId)) {
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

          if (player) {
            // Reconnecting player
            player.name = playerName || player.name;
            player.avatar = playerAvatar || player.avatar;
            player.color = playerColor || player.color;
            player.connected = true;
            player.isHost = isThisPlayerHost;
            if (typeof msg.preloaded === 'boolean') {
              player.preloaded = msg.preloaded;
            }
          } else {
            // New player
            player = {
              id: playerId,
              name: playerName,
              avatar: playerAvatar,
              color: playerColor,
              score: 0,
              isHost: isThisPlayerHost,
              connected: true,
              preloaded: Boolean(msg.preloaded)
            };
            this.state.players.push(player);
          }

          // Invariant: exactly one host among players
          this.state.players.forEach(p => {
            p.isHost = (p.id === this.state.hostId);
          });

          // Acknowledge join
          this.sendToConnection(sender, {
            type: 'JOIN_ACK',
            targetPlayerId: playerId,
            roomCode: this.state.roomCode,
            hostSettings: this.state.settings,
            isHost: player.isHost,
            players: this.state.players
          });

          this.broadcastState('SYNC_ROOM_STATE');
          this.persistState();
          break;
        }

        case 'UPDATE_SETTINGS':
        case 'UPDATE_HOST_SETTINGS': {
          if (!requireHost('UPDATE_SETTINGS')) return;
          const newSettings = msg.payload || msg.settings;
          if (newSettings) {
            this.state.settings = {
              timer: Math.max(10, Math.min(120, Number(newSettings.timer || newSettings.timerDuration || this.state.settings.timer))),
              rounds: Math.max(1, Math.min(50, Number(newSettings.rounds || this.state.settings.rounds))),
              categories: Array.isArray(newSettings.categories) ? newSettings.categories : this.state.settings.categories
            };
            this.broadcastState('HOST_SETTINGS_UPDATE');
            this.persistState();
          }
          break;
        }

        case 'PLAYER_READY':
        case 'PLAYER_PRELOAD_STATUS':
        case 'PLAYER_PRELOAD_READY': {
          const playerId = msg.playerId || msg.senderId || senderPlayerId;
          const player = this.state.players.find(p => p.id === playerId);
          if (player) {
            player.preloaded = Boolean(msg.ready ?? (msg.percent === 100));
            this.broadcastState('SYNC_ROOM_STATE');
          }
          break;
        }

        case 'START_MATCH':
        case 'START_GAME':
        case 'GAME_START': {
          if (!requireHost('START_MATCH')) return;

          // Authoritative Server-Side Playlist Generation from Internal Catalog
          const totalRounds = this.state.settings.rounds || 20;
          const categories = this.state.settings.categories || ['frames', 'eyes', 'dialogues'];
          this.fullPlaylist = createMatchPlaylist(categories, totalRounds);

          // Reset all player scores to 0
          this.state.players.forEach(p => { p.score = 0; });

          const firstItem = this.fullPlaylist[0] || DEFAULT_FRAMES[0];
          const durationSeconds = this.state.settings.timer || 30;

          this.state.phase = 'ROUND_ACTIVE';
          this.isPaused = false;
          this.remainingOnPause = 0;
          this.state.chat = []; // Clear chat for Round 1

          this.state.round = {
            index: 0,
            total: this.fullPlaylist.length,
            category: firstItem.category,
            sectionName: firstItem.sectionName,
            frame: {
              id: firstItem.id,
              sectionId: firstItem.sectionId,
              sectionName: firstItem.sectionName,
              category: firstItem.category,
              type: firstItem.type,
              content: firstItem.content,
              year: firstItem.year
              // answer is withheld!
            },
            startedAt: Date.now(),
            endsAt: Date.now() + durationSeconds * 1000,
            maskedHint: null,
            winners: [],
            submissions: {},
            hintsUsed: {}
          };

          this.scheduleRoundTimer(durationSeconds);

          this.broadcastState('MATCH_START');
          this.broadcastState('ROUND_START');
          this.persistState();
          break;
        }

        case 'NEXT_ROUND': {
          if (!requireHost('NEXT_ROUND')) return;

          // Double click debounce guard (500ms cooldown)
          const now = Date.now();
          if (this.lastRoundAdvanceTime && (now - this.lastRoundAdvanceTime < 500)) {
            console.warn(`[GameRoomServer] NEXT_ROUND debounced (rapid double click ignored)`);
            return;
          }

          // Idempotency round guard: check if client is advancing from current round
          if (msg.currentRoundIndex !== undefined && this.state.round && msg.currentRoundIndex !== this.state.round.index) {
            console.warn(`[GameRoomServer] NEXT_ROUND ignored: round index mismatch (${msg.currentRoundIndex} vs ${this.state.round.index})`);
            return;
          }

          this.lastRoundAdvanceTime = now;
          const currentIdx = this.state.round ? this.state.round.index : 0;
          const nextIdx = currentIdx + 1;

          if (nextIdx >= this.fullPlaylist.length) {
            // Match complete -> Game Over
            this.handleGameOver();
            return;
          }

          const nextItem = this.fullPlaylist[nextIdx];
          const durationSeconds = this.state.settings.timer || 30;

          this.state.phase = 'ROUND_ACTIVE';
          this.isPaused = false;
          this.remainingOnPause = 0;
          this.state.chat = []; // Clear round chat for fresh stream

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
              // answer is withheld!
            },
            startedAt: Date.now(),
            endsAt: Date.now() + durationSeconds * 1000,
            maskedHint: null,
            winners: [],
            submissions: {},
            hintsUsed: {}
          };

          this.scheduleRoundTimer(durationSeconds);

          this.broadcastState('ROUND_START');
          this.persistState();
          break;
        }

        case 'SKIP_ROUND':
        case 'SKIP_FRAME':
        case 'HOST_SKIP_BROADCAST':
        case 'ROUND_FINISH_BROADCAST': {
          if (!requireHost('SKIP_ROUND')) return;
          if (this.state.phase === 'ROUND_ACTIVE') {
            this.handleRoundTimeout();
          }
          break;
        }

        case 'TOGGLE_PAUSE':
        case 'PAUSE_TOGGLE': {
          if (!requireHost('TOGGLE_PAUSE')) return;
          if (this.state.round) {
            this.isPaused = !this.isPaused;
            const now = Date.now();

            if (this.isPaused) {
              // Pause active timer
              this.remainingOnPause = Math.max(0, Math.ceil((this.state.round.endsAt - now) / 1000));
              this.clearRoundTimer();
            } else {
              // Resume active timer
              this.scheduleRoundTimer(this.remainingOnPause || this.state.settings.timer || 30);
            }

            this.broadcastState('PAUSE_TOGGLE');
          }
          break;
        }

        case 'SUBMIT_GUESS': {
          const guessText = String(msg.guess || msg.text || msg.payload?.guess || '').trim().slice(0, 300);
          if (!guessText) return;

          const playerId = senderPlayerId || msg.playerId || msg.senderId;
          const player = this.state.players.find(p => p.id === playerId);
          const playerName = player?.name || msg.playerName || 'Player';
          const playerAvatar = player?.avatar || msg.playerAvatar || 'aman';
          const timestamp = Date.now();

          // Reject if match or round is already finished / revealing
          if (this.state.phase === 'ROUND_REVEAL' || this.state.phase === 'MATCH_OVER') {
            this.sendToConnection(sender, {
              type: 'COMMAND_REJECTED',
              reason: 'ROUND_ALREADY_FINISHED',
              code: 'ROUND_ALREADY_FINISHED',
              command: 'SUBMIT_GUESS',
              commandId: msg.commandId,
              playerId
            });
            return;
          }

          // Reject if not in active round
          if (this.state.phase !== 'ROUND_ACTIVE' || !this.state.round) {
            this.sendToConnection(sender, {
              type: 'COMMAND_REJECTED',
              reason: 'ROUND_NOT_ACTIVE',
              code: 'ROUND_NOT_ACTIVE',
              command: 'SUBMIT_GUESS',
              commandId: msg.commandId,
              playerId
            });
            return;
          }

          // Reject if match is paused
          if (this.isPaused) {
            this.sendToConnection(sender, {
              type: 'COMMAND_REJECTED',
              reason: 'ROUND_PAUSED',
              code: 'ROUND_PAUSED',
              command: 'SUBMIT_GUESS',
              commandId: msg.commandId,
              playerId
            });
            return;
          }

          // Reject if server timer expired
          if (Date.now() >= this.state.round.endsAt) {
            this.handleRoundTimeout();
            this.sendToConnection(sender, {
              type: 'COMMAND_REJECTED',
              reason: 'ROUND_ALREADY_FINISHED',
              code: 'ROUND_ALREADY_FINISHED',
              command: 'SUBMIT_GUESS',
              commandId: msg.commandId,
              playerId
            });
            return;
          }

          // Ensure tracking maps exist
          if (!this.state.round.submissions) {
            this.state.round.submissions = {};
          }
          if (!this.state.round.hintsUsed) {
            this.state.round.hintsUsed = {};
          }

          // Check if player has already won this round
          const alreadyWon = this.state.round.winners.some(w => w.playerId === playerId);
          if (alreadyWon) {
            // Player already won! They cannot gain points again, but can write unlimited and answers are hidden in chat
            const secretItem = this.fullPlaylist[this.state.round.index] || null;
            const answer = secretItem?.answer || '';
            const isSpoiler = Boolean(
              answer &&
              (FuzzyMatcher.isMatch(guessText, answer) ||
               (answer.length >= 3 && guessText.toUpperCase().includes(answer.toUpperCase())))
            );

            const guessId = 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
            const displayText = isSpoiler ? '🤫 spoiler hidden' : guessText;
            const msgType: ChatEventType = isSpoiler ? 'spoiler_hidden' : 'player_chat';

            const chatObj: ChatMessage = {
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

            this.broadcast(JSON.stringify({
              type: 'CHAT_MESSAGE',
              roomCode: this.state.roomCode,
              senderId: playerId,
              id: guessId,
              timestamp,
              msg: chatObj
            }));

            this.broadcastState('CHAT_EVENT');
            this.persistState();
            return;
          }

          // Guard: Maximum 3 winners already recorded
          if (this.state.round.winners.length >= 3) {
            this.sendToConnection(sender, {
              type: 'COMMAND_REJECTED',
              reason: 'ROUND_ALREADY_FINISHED',
              code: 'ROUND_ALREADY_FINISHED',
              command: 'SUBMIT_GUESS',
              commandId: msg.commandId,
              playerId
            });
            return;
          }

          // Authoritative Server Guess Evaluation
          const secretItem = this.fullPlaylist[this.state.round.index] || null;
          const answer = secretItem?.answer || '';
          const isMatch = Boolean(answer && FuzzyMatcher.isMatch(guessText, answer));

          if (isMatch) {
            // Record submission
            this.state.round.submissions[playerId] = {
              submitted: true,
              submittedAt: timestamp,
              guess: guessText,
              result: 'CORRECT'
            };

            const pos = (this.state.round.winners.length + 1) as 1 | 2 | 3;
            const points = pos === 1 ? 10 : pos === 2 ? 7 : pos === 3 ? 5 : 0;

            const winnerRecord: RoundWinner = {
              playerId,
              playerName,
              playerAvatar,
              position: pos,
              points,
              guessedAt: timestamp
            };

            this.state.round.winners.push(winnerRecord);

            if (player && points > 0) {
              player.score += points;
            }

            console.log(`[GameRoomServer] Authoritative Winner! ${playerName} guessed "${guessText}" (rank #${pos}, +${points} pts)`);

            // Winner announcement to chat (without revealing answer text to remaining guessers!)
            const winMsg: ChatMessage = {
              id: 'winner_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
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

            this.broadcast(JSON.stringify({
              type: 'CORRECT_ANSWER_BROADCAST',
              winner: winnerRecord,
              winnerId: playerId,
              winnerName: playerName,
              scoreboard: this.state.players,
              roundWinners: this.state.round.winners,
              chatMessage: winMsg,
              version: this.state.version
            }));

            this.broadcast(JSON.stringify({
              type: 'CHAT_MESSAGE',
              roomCode: this.state.roomCode,
              senderId: playerId,
              id: winMsg.id,
              timestamp,
              msg: winMsg
            }));

            // If 3 winners reached or all connected players won -> end round immediately
            const connectedCount = this.state.players.filter(p => p.connected).length;
            if (this.state.round.winners.length >= 3 || this.state.round.winners.length >= connectedCount) {
              this.handleRoundTimeout();
              return;
            }

            // On 1st winner, accelerate countdown to 10s if > 10s left
            if (pos === 1) {
              const timeLeft = Math.max(0, this.state.round.endsAt - Date.now());
              if (timeLeft > 10000) {
                this.scheduleRoundTimer(10);
                this.broadcastState('HURRY_UP_CLOCK');
                this.persistState();
                return;
              }
            }

            this.broadcastState('STATE_UPDATE');
            this.persistState();
            return;
          } else {
            // Non-matching guess: record submission as INCORRECT
            this.state.round.submissions[playerId] = {
              submitted: true,
              submittedAt: timestamp,
              guess: guessText,
              result: 'INCORRECT'
            };

            // Send notification to the submitter
            this.sendToConnection(sender, {
              type: 'GUESS_EVALUATED',
              result: 'INCORRECT',
              reason: 'INCORRECT_ANSWER',
              code: 'INCORRECT_ANSWER',
              playerId,
              guess: guessText
            });

            // Broadcast incorrect guess attempt to chat stream with incorrect answer text
            const guessId = 'guess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
            const chatObj: ChatMessage = {
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
            if (this.state.chat.length > 50) {
              this.state.chat.shift();
            }

            this.broadcast(JSON.stringify({
              type: 'CHAT_MESSAGE',
              roomCode: this.state.roomCode,
              senderId: playerId,
              id: guessId,
              timestamp,
              msg: chatObj
            }));

            this.broadcastState('CHAT_EVENT');
            this.persistState();
          }
          break;
        }

        case 'REQUEST_HINT': {
          if (this.state.phase !== 'ROUND_ACTIVE' || !this.state.round) {
            this.sendToConnection(sender, {
              type: 'COMMAND_REJECTED',
              reason: 'ROUND_NOT_ACTIVE',
              code: 'ROUND_NOT_ACTIVE',
              command: 'REQUEST_HINT',
              commandId: msg.commandId
            });
            return;
          }

          if (this.isPaused) {
            this.sendToConnection(sender, {
              type: 'COMMAND_REJECTED',
              reason: 'ROUND_PAUSED',
              code: 'ROUND_PAUSED',
              command: 'REQUEST_HINT',
              commandId: msg.commandId
            });
            return;
          }

          const playerId = senderPlayerId || msg.playerId;
          if (!this.state.round.hintsUsed) {
            this.state.round.hintsUsed = {};
          }

          if (playerId && this.state.round.hintsUsed[playerId]) {
            this.sendToConnection(sender, {
              type: 'COMMAND_REJECTED',
              reason: 'HINT_ALREADY_USED',
              code: 'HINT_ALREADY_USED',
              command: 'REQUEST_HINT',
              commandId: msg.commandId,
              playerId
            });
            return;
          }

          if (playerId) {
            this.state.round.hintsUsed[playerId] = true;
          }

          const player = this.state.players.find(p => p.id === playerId);
          if (player) {
            player.score = Math.max(0, player.score - 2);
          }

          if (!this.state.round.maskedHint) {
            const secretItem = this.fullPlaylist[this.state.round.index];
            if (secretItem?.answer) {
              this.state.round.maskedHint = generateMaskedHint(secretItem.answer);
            }
          }

          this.broadcastState('HINT_BROADCAST');
          this.persistState();
          break;
        }

        case 'SEND_CHAT':
        case 'CHAT_MESSAGE': {
          const rawMsg = msg.msg || msg.payload || msg;
          const text = String(rawMsg.text || msg.text || '').trim().slice(0, 300);
          if (text) {
            const senderId = senderPlayerId || rawMsg.senderId || msg.playerId;
            const player = this.state.players.find(p => p.id === senderId);
            const senderName = rawMsg.senderName || player?.name || 'Player';
            const senderAvatar = rawMsg.senderAvatar || player?.avatar || 'aman';
            const msgId = rawMsg.id || msg.id || ('msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5));
            const timestamp = Date.now();

            let displayText = text;
            let msgType: ChatEventType = 'player_chat';

            // Spoiler protection & guess routing during ROUND_ACTIVE
            if (this.state.phase === 'ROUND_ACTIVE' && this.state.round) {
              const secretItem = this.fullPlaylist[this.state.round.index];
              const answer = secretItem?.answer || '';
              if (answer) {
                const isMatch = FuzzyMatcher.isMatch(text, answer);
                const containsAnswer = answer.length >= 3 && text.toUpperCase().includes(answer.toUpperCase());
                if (isMatch || containsAnswer) {
                  const alreadyWon = this.state.round.winners.some(w => w.playerId === senderId);
                  if (!alreadyWon && isMatch) {
                    // Route chat text as a guess!
                    this.onMessage(sender, JSON.stringify({
                      type: 'SUBMIT_GUESS',
                      playerId: senderId,
                      senderId,
                      playerName: senderName,
                      playerAvatar: senderAvatar,
                      guess: text
                    }));
                    return;
                  } else {
                    // Already won or spoiler text: hide answer from chat!
                    displayText = '🤫 spoiler hidden';
                    msgType = 'spoiler_hidden';
                  }
                }
              }
            }

            const chatObj: ChatMessage = {
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
            if (this.state.chat.length > 50) {
              this.state.chat.shift();
            }

            this.broadcast(JSON.stringify({
              type: 'CHAT_MESSAGE',
              roomCode: this.state.roomCode,
              senderId,
              id: msgId,
              timestamp,
              msg: chatObj
            }));
          }
          break;
        }

        case 'REACTION': {
          const targetMessageId = msg.targetMessageId || msg.messageId;
          const reaction = msg.reaction; // 'like' | 'dislike'
          const senderId = senderPlayerId || msg.playerId || msg.senderId;
          const player = this.state.players.find(p => p.id === senderId);
          const senderName = player?.name || msg.playerName || 'Someone';

          if (!targetMessageId || !reaction || (reaction !== 'like' && reaction !== 'dislike')) {
            this.sendToConnection(sender, {
              type: 'COMMAND_REJECTED',
              reason: 'INVALID_REACTION',
              code: 'INVALID_REACTION',
              command: 'REACTION',
              commandId: msg.commandId
            });
            return;
          }

          // Find target message in chat
          const targetMsg = this.state.chat.find(m => m.id === targetMessageId);
          if (!targetMsg || targetMsg.type !== 'winner') {
            this.sendToConnection(sender, {
              type: 'COMMAND_REJECTED',
              reason: 'INVALID_TARGET_MESSAGE',
              code: 'INVALID_TARGET_MESSAGE',
              command: 'REACTION',
              commandId: msg.commandId
            });
            return;
          }

          // Self-reaction guard: players cannot react to their own winner announcement
          if (targetMsg.senderId === senderId) {
            this.sendToConnection(sender, {
              type: 'COMMAND_REJECTED',
              reason: 'CANNOT_REACT_TO_SELF',
              code: 'CANNOT_REACT_TO_SELF',
              command: 'REACTION',
              commandId: msg.commandId
            });
            return;
          }

          // Initialize reactions if needed
          if (!targetMsg.reactions) {
            targetMsg.reactions = { likes: [], dislikes: [] };
          }
          if (!Array.isArray(targetMsg.reactions.likes)) targetMsg.reactions.likes = [];
          if (!Array.isArray(targetMsg.reactions.dislikes)) targetMsg.reactions.dislikes = [];

          let reactionAdded = false;

          if (reaction === 'like') {
            const idx = targetMsg.reactions.likes.indexOf(senderId);
            if (idx >= 0) {
              targetMsg.reactions.likes.splice(idx, 1);
            } else {
              targetMsg.reactions.likes.push(senderId);
              targetMsg.reactions.dislikes = targetMsg.reactions.dislikes.filter(id => id !== senderId);
              reactionAdded = true;
            }
          } else if (reaction === 'dislike') {
            const idx = targetMsg.reactions.dislikes.indexOf(senderId);
            if (idx >= 0) {
              targetMsg.reactions.dislikes.splice(idx, 1);
            } else {
              targetMsg.reactions.dislikes.push(senderId);
              targetMsg.reactions.likes = targetMsg.reactions.likes.filter(id => id !== senderId);
              reactionAdded = true;
            }
          }

          // Broadcast updated reactions for target message to ALL players
          this.broadcast(JSON.stringify({
            type: 'CHAT_MESSAGE_UPDATE',
            roomCode: this.state.roomCode,
            messageId: targetMsg.id,
            reactions: targetMsg.reactions
          }));

          // If reaction was added, send private notification strictly to the target winner
          if (reactionAdded && targetMsg.senderId) {
            const notifText = reaction === 'dislike'
              ? `${senderName} disliked you`
              : `${senderName} liked your answer`;

            const privateNotifMsg: ChatMessage = {
              id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
              type: 'reaction_notification',
              roundIndex: targetMsg.roundIndex,
              senderId,
              senderName,
              senderAvatar: player?.avatar || 'aman',
              text: notifText,
              targetPlayerId: targetMsg.senderId,
              timestamp: Date.now()
            };

            // Deliver ONLY to target winner's connection(s)
            for (const conn of this.getConnections()) {
              if (this.connectionToPlayerId.get(conn.id) === targetMsg.senderId) {
                this.sendToConnection(conn, {
                  type: 'CHAT_MESSAGE',
                  roomCode: this.state.roomCode,
                  senderId,
                  id: privateNotifMsg.id,
                  timestamp: privateNotifMsg.timestamp,
                  msg: privateNotifMsg
                });
              }
            }
          }

          this.persistState();
          break;
        }

        case 'END_MATCH':
        case 'GAME_OVER': {
          if (!requireHost('END_MATCH')) return;
          this.handleGameOver();
          break;
        }

        case 'REMATCH':
        case 'REMATCH_STARTED': {
          if (!requireHost('REMATCH')) return;
          const totalRounds = this.state.settings.rounds || 20;
          const categories = this.state.settings.categories || ['frames', 'eyes', 'dialogues'];
          this.fullPlaylist = createMatchPlaylist(categories, totalRounds);

          this.state.players.forEach(p => { p.score = 0; });
          const firstItem = this.fullPlaylist[0] || DEFAULT_FRAMES[0];
          const durationSeconds = this.state.settings.timer || 30;

          this.state.phase = 'ROUND_ACTIVE';
          this.isPaused = false;
          this.remainingOnPause = 0;
          this.state.chat = []; // Clear round chat for Rematch Round 1

          this.state.round = {
            index: 0,
            total: this.fullPlaylist.length,
            category: firstItem.category,
            sectionName: firstItem.sectionName,
            frame: {
              id: firstItem.id,
              sectionId: firstItem.sectionId,
              sectionName: firstItem.sectionName,
              category: firstItem.category,
              type: firstItem.type,
              content: firstItem.content,
              year: firstItem.year
            },
            startedAt: Date.now(),
            endsAt: Date.now() + durationSeconds * 1000,
            maskedHint: null,
            winners: [],
            submissions: {},
            hintsUsed: {}
          };

          this.scheduleRoundTimer(durationSeconds);
          this.broadcastState('REMATCH_STARTED');
          this.persistState();
          break;
        }

        case 'RETURN_TO_LOBBY': {
          if (!requireHost('RETURN_TO_LOBBY')) return;
          this.clearRoundTimer();
          this.state.phase = 'LOBBY';
          this.state.round = null;
          this.isPaused = false;
          this.remainingOnPause = 0;
          this.state.chat = []; // Clear chat on returning to lobby

          this.broadcastState('RETURN_TO_LOBBY');
          this.persistState();
          break;
        }

        case 'ADJUST_SCORE': {
          if (!requireHost('ADJUST_SCORE')) return;
          const targetPlayerId = msg.targetPlayerId || msg.playerId;
          const points = Number(msg.points);
          if (!targetPlayerId || !Number.isInteger(points) || points < -50 || points > 50) {
            this.sendToConnection(sender, {
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
            this.sendToConnection(sender, {
              type: 'COMMAND_REJECTED',
              reason: 'PLAYER_NOT_FOUND',
              code: 'PLAYER_NOT_FOUND',
              command: 'ADJUST_SCORE',
              commandId: msg.commandId
            });
            return;
          }
          targetPlayer.score = Math.max(0, (targetPlayer.score || 0) + points);
          this.broadcastState('STATE_UPDATE');
          this.persistState();
          break;
        }

        case 'KICK_PLAYER':
        case 'PLAYER_KICKED': {
          if (!requireHost('KICK_PLAYER')) return;
          const targetPlayerId = msg.targetPlayerId || msg.playerId;
          if (targetPlayerId) {
            this.state.players = this.state.players.filter(p => p.id !== targetPlayerId);
            this.broadcast(JSON.stringify({
              type: 'PLAYER_LEFT',
              playerId: targetPlayerId,
              players: this.state.players
            }));
            this.broadcastState('SYNC_ROOM_STATE');
            this.persistState();
          }
          break;
        }

        case 'UPDATE_PLAYER_NAME': {
          const targetPlayerId = msg.playerId || senderPlayerId;
          const isSelf = Boolean(senderPlayerId && senderPlayerId === targetPlayerId);
          if (!isSenderHost && !isSelf) {
            this.sendToConnection(sender, {
              type: 'COMMAND_REJECTED',
              reason: 'UNAUTHORIZED',
              command: 'UPDATE_PLAYER_NAME',
              commandId: msg.commandId
            });
            return;
          }
          const newName = String(msg.name || '').trim().slice(0, 25);
          if (newName) {
            const p = this.state.players.find(pl => pl.id === targetPlayerId);
            if (p) {
              p.name = newName;
              this.broadcastState('SYNC_ROOM_STATE');
              this.persistState();
            }
          }
          break;
        }

        case 'PING': {
          this.sendToConnection(sender, {
            type: 'PONG',
            serverTime: Date.now()
          });
          break;
        }

        case 'REQUEST_SYNC': {
          const clientSafe = this.getClientSafeState();
          this.sendToConnection(sender, {
            type: 'STATE_UPDATE',
            state: clientSafe,
            version: this.state.version,
            serverTime: Date.now()
          });
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error('[GameRoomServer] Message handling error:', err);
    }
  }

  handleGameOver() {
    this.clearRoundTimer();
    this.state.phase = 'MATCH_OVER';

    const sorted = [...this.state.players].sort((a, b) => (b.score || 0) - (a.score || 0));

    this.broadcastState('GAME_OVER_BROADCAST');

    this.broadcast(JSON.stringify({
      type: 'GAME_OVER_BROADCAST',
      scoreboard: sorted,
      players: sorted
    }));

    this.persistState();
  }
}

export interface Env {
  Main: DurableObjectNamespace;
  [key: string]: any;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return (
      (await routePartykitRequest(request, env)) ||
      new Response('Not Found', { status: 404 })
    );
  }
} satisfies ExportedHandler<Env>;
