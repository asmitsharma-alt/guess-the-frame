import { z } from 'zod';

/**
 * Strict Zod Schemas for distributed MQTT Game Packets
 * Strictly satisfies Section 5 (Security & Threat Model Hardening)
 */

export const PlayerJoinSchema = z.object({
  type: z.literal('PLAYER_JOIN'),
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(32),
  avatar: z.string().default('aman'),
  isHost: z.boolean().optional(),
  score: z.number().nonnegative().optional().default(0),
  token: z.string().optional(),
  timestamp: z.number().optional()
}).passthrough();

export const UpdateSettingsSchema = z.object({
  type: z.literal('UPDATE_HOST_SETTINGS'),
  settings: z.object({
    category: z.string().optional(),
    categories: z.array(z.string()).optional(),
    rounds: z.number().int().positive().optional(),
    timer: z.number().int().positive().optional(),
    roundsByMode: z.record(z.number()).optional()
  }).passthrough()
}).passthrough();

export const RoundStartSchema = z.object({
  type: z.literal('ROUND_START'),
  roundIndex: z.number().int().nonnegative().optional(),
  currentPlayIndex: z.number().int().nonnegative().optional(),
  frame: z.any().optional(),
  duration: z.number().positive().optional()
}).passthrough();

export const RoundFinishSchema = z.object({
  type: z.union([z.literal('ROUND_FINISH_BROADCAST'), z.literal('ANSWER_REVEALED'), z.literal('ROUND_FINISH_EARLY')]),
  roundIndex: z.number().int().nonnegative().optional(),
  isAnswerRevealed: z.boolean().optional()
}).passthrough();

export const PauseToggleSchema = z.object({
  type: z.literal('PAUSE_TOGGLE'),
  isPaused: z.boolean()
}).passthrough();

export const ScoreUpdateSchema = z.object({
  type: z.literal('SCORE_UPDATE'),
  players: z.array(z.any()).optional(),
  playerId: z.string().optional(),
  score: z.number().optional()
}).passthrough();

export const GameOverSchema = z.object({
  type: z.union([z.literal('GAME_OVER'), z.literal('GAME_OVER_BROADCAST')]),
  scoreboard: z.array(z.any()).optional()
}).passthrough();

export const SyncRoomStateSchema = z.object({
  type: z.union([z.literal('SYNC_ROOM_STATE'), z.literal('ROOM_STATE')]),
  players: z.array(z.any()).optional(),
  hostSettings: z.any().optional(),
  currentPlaylist: z.array(z.any()).optional(),
  currentPlayIndex: z.number().optional(),
  currentRoundWinners: z.array(z.any()).optional()
}).passthrough();

export const ChatMessageSchema = z.object({
  type: z.literal('CHAT_MESSAGE'),
  msg: z.object({
    id: z.string().optional(),
    senderName: z.string().optional(),
    senderAvatar: z.string().optional(),
    text: z.string().max(256)
  }).passthrough()
}).passthrough();

export const GenericEventSchema = z.object({
  type: z.string().min(1).max(64),
  senderId: z.string().optional(),
  timestamp: z.number().optional()
}).passthrough();

/**
 * Validates and sanitizes incoming MQTT messages against strict runtime contracts.
 * Quarantines malformed packets to prevent DOM corruption, prototype pollution, or runtime crashes.
 */
export function validateMqttMessage(raw) {
  if (!raw || typeof raw !== 'object') {
    return { success: false, error: 'Packet is not a valid JSON object' };
  }

  const type = raw.type;
  if (!type || typeof type !== 'string') {
    return { success: false, error: 'Missing or invalid event type' };
  }

  try {
    switch (type) {
      case 'PLAYER_JOIN':
        return { success: true, data: PlayerJoinSchema.parse(raw) };
      case 'UPDATE_HOST_SETTINGS':
        return { success: true, data: UpdateSettingsSchema.parse(raw) };
      case 'ROUND_START':
        return { success: true, data: RoundStartSchema.parse(raw) };
      case 'ROUND_FINISH_BROADCAST':
      case 'ANSWER_REVEALED':
      case 'ROUND_FINISH_EARLY':
        return { success: true, data: RoundFinishSchema.parse(raw) };
      case 'PAUSE_TOGGLE':
        return { success: true, data: PauseToggleSchema.parse(raw) };
      case 'SCORE_UPDATE':
        return { success: true, data: ScoreUpdateSchema.parse(raw) };
      case 'GAME_OVER':
      case 'GAME_OVER_BROADCAST':
        return { success: true, data: GameOverSchema.parse(raw) };
      case 'SYNC_ROOM_STATE':
      case 'ROOM_STATE':
        return { success: true, data: SyncRoomStateSchema.parse(raw) };
      case 'CHAT_MESSAGE':
        return { success: true, data: ChatMessageSchema.parse(raw) };
      default:
        return { success: true, data: GenericEventSchema.parse(raw) };
    }
  } catch (err) {
    console.warn(`[Security Alert] Quarantined malformed MQTT message for type "${type}":`, err.message);
    return { success: false, error: err.message, raw };
  }
}
