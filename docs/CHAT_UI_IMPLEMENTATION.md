# ScoopCast Live Chat & Activity Stream Implementation Report

## 1. Architecture Overview

The ScoopCast live chat system has been upgraded from a generic messaging box into an authoritative, real-time multiplayer **Activity Stream**. The system serves dual purposes:
1. **Interactive Guessing Stream**: Real-time ticker of player guessing activity with zero guess leakage to opponents.
2. **Social Stream & Reaction Hub**: Community reactions (👍 / 👎) on authoritative winner cards with strictly private direct notifications and spoiler masking.

The architecture maintains strict compliance with ScoopCast's Neo-Brutalist design language, Cloudflare Durable Object edge authority, and low-latency PartySocket transport.

---

## 2. Server vs Client Responsibilities

| Responsibility | Authoritative Server (`partykit/src/server.ts`) | React Client (`MultiplayerContext` & `GameScreen`) |
| :--- | :--- | :--- |
| **Guess Evaluation** | Validates against secret playlist answers using `FuzzyMatcher`. Computes points and winner ranks (#1st, #2nd, #3rd). | Submits guess strings via `SUBMIT_GUESS` command. Renders local submission feedback chip. |
| **Guess Privacy** | Broadcasts `type: 'guess_attempt'` with `${playerName} guessed`. Raw guess text is withheld from all opponents. | Displays `${playerName} guessed` in subtle typography. Shows raw guess only in private submitter bubble. |
| **Winner Broadcasting** | Emits `CORRECT_ANSWER_BROADCAST` and `type: 'winner'` chat card with points, rank, and initialized reaction buckets. | Renders high-prominence `#FFE600` gold winner card with reaction buttons and rank badges. |
| **Reaction Handling** | Validates reaction validity, rejects self-reactions (`CANNOT_REACT_TO_SELF`), toggles votes, broadcasts `CHAT_MESSAGE_UPDATE`. | Optimistically renders active reaction states, disables self-voting, and calls `sendReaction()`. |
| **Private Notifications** | Dispatches `type: 'reaction_notification'` exclusively to target winner's WebSocket connection; never added to room state. | Displays private pill (`"Aman liked your answer"`) strictly to the recipient; never rendered for opponents. |
| **Spoiler Protection** | Detects fuzzy matches or answer substrings from already-won players; masks text as `🤫 spoiler hidden`. | Renders minimalist pill badge (`🤫 spoiler hidden`) in muted gray with zero audio triggers. |
| **Round Reset** | Clears `this.state.chat = []` on `ROUND_START`, `START_MATCH`, `REMATCH`, and `RETURN_TO_LOBBY`. | Clears `game.chatMessages = []` on all phase and round advance transitions for a fresh canvas. |

---

## 3. Message Types & Data Models

All chat events conform to the authoritative TypeScript schema:

```typescript
export type ChatEventType =
  | 'winner'
  | 'spoiler_hidden'
  | 'guess_attempt'
  | 'player_chat'
  | 'reaction_notification'
  | 'system';

export interface ReactionRecord {
  likes: string[];     // Array of player IDs who liked
  dislikes: string[];  // Array of player IDs who disliked
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
  timestamp: number;
  points?: number;
  position?: 1 | 2 | 3;
  reactions?: ReactionRecord;
  targetPlayerId?: string;
}
```

---

## 4. Guess Privacy Architecture

### The Problem
Previously, incorrect guesses were broadcast with the raw user input text to the entire room. Opponents could monitor the chat stream to deduce what films had been tried, piggyback on close titles, or eliminate genres.

### The Solution
1. **Server Sanitization**: When an incorrect guess arrives at `SUBMIT_GUESS`:
   - Public broadcast payload:
     ```json
     {
       "id": "guess_1726500000_abc",
       "type": "guess_attempt",
       "senderId": "player_2",
       "senderName": "Aman",
       "text": "Aman guessed",
       "isGuess": true
     }
     ```
   - Targeted response to submitter:
     ```json
     {
       "type": "GUESS_EVALUATED",
       "result": "INCORRECT",
       "reason": "INCORRECT_ANSWER",
       "guess": "Inception"
     }
     ```
2. **Zero Opponent Leakage**: Opponents receive confirmation that Aman made an attempt, creating active multiplayer energy without exposing the attempted film title.

---

## 5. Winner Announcement & Golden Highlight Flow

When a player submits a matching guess:
1. Server computes rank position (1st = 10 pts, 2nd = 7 pts, 3rd = 5 pts).
2. Server broadcasts:
   - `CORRECT_ANSWER_BROADCAST` to update scores and trigger winner fanfare audio.
   - `CHAT_MESSAGE` of type `'winner'` formatted with:
     ```typescript
     {
       id: "winner_1726500000_xyz",
       type: "winner",
       roundIndex: state.round.index,
       senderId: playerId,
       senderName: playerName,
       senderAvatar: playerAvatar,
       text: `${playerName.toUpperCase()} GUESSED +${points} PTS`,
       points: points,
       position: pos,
       reactions: { likes: [], dislikes: [] }
     }
     ```
3. UI renders the Level 1 Neo-Brutalist card with gold background `#FFE600`, 2px solid `#1a1a1a` border, `#1ST` / `#2ND` / `#3RD` badge, and interactive reaction buttons.

---

## 6. Reaction System (Like / Dislike) Implementation

### Rules & Mechanics
- **Target Message**: Only messages with `type === 'winner'` can receive reactions.
- **Self-Reaction Prevention**: If `targetMsg.senderId === senderId`, the server returns `COMMAND_REJECTED` (`CANNOT_REACT_TO_SELF`). The client additionally disables the button.
- **Toggle**: Tapping an active reaction removes the user's vote.
- **Flip**: Tapping the opposite reaction atomically flips the vote (e.g., from Like to Dislike). A user can never hold both.
- **Broadcast**: On change, the server broadcasts `CHAT_MESSAGE_UPDATE`:
  ```json
  {
    "type": "CHAT_MESSAGE_UPDATE",
    "roomCode": "ABCD",
    "messageId": "winner_1726500000_xyz",
    "reactions": {
      "likes": ["player_3"],
      "dislikes": []
    }
  }
  ```

---

## 7. Private Notification Flow & Security (No Room Leaks)

### Preventing Public Leaks
When an opponent reacts to a winner card:
1. Server creates a targeted `reaction_notification` message:
   ```typescript
   {
     id: "notif_" + Date.now(),
     type: "reaction_notification",
     text: reaction === 'dislike' ? `${senderName} disliked you` : `${senderName} liked your answer`,
     targetPlayerId: targetMsg.senderId
   }
   ```
2. **Direct Connection Delivery**:
   - The server iterates `this.getConnections()` to locate the WebSocket connection associated with `targetMsg.senderId`.
   - The notification is transmitted **only** through that specific socket.
   - **Crucial Security Decision**: The notification is **NOT** pushed into `this.state.chat`. This ensures that room state syncs, new joins, or reconnects cannot leak private notifications to opponents.
3. Client displays a soft amber pill (`.personal-reaction-pill`) in the winner's stream.

---

## 8. Spoiler Masking & Routing Logic

1. **Active Round Protection**: While `state.phase === 'ROUND_ACTIVE'`, all messages sent via `SEND_CHAT` or `SUBMIT_GUESS` are inspected by `FuzzyMatcher`.
2. **Already-Won Players**:
   - Winners can chat and guess without limits.
   - Any message matching or containing the secret movie title is rewritten to `'🤫 spoiler hidden'` with `type: 'spoiler_hidden'`.
3. **Non-Winners Typing in Chat Box**:
   - If an un-awarded player types the answer into the standard chat box, the server intercepts it and automatically re-routes the command as `SUBMIT_GUESS`, awarding them points if eligible!

---

## 9. Round Reset & State Synchronization

- Every new round starts with a clean slate.
- `this.state.chat = []` is executed in:
  - `START_MATCH`: Match initialization.
  - `NEXT_ROUND`: Advancing to the next frame.
  - `REMATCH`: Restarting a playlist.
  - `RETURN_TO_LOBBY`: Returning to lobby.
- Client `MultiplayerContext` mirrors this by calling `game.setChatMessages([])` on `ROUND_START`, `MATCH_START`, `REMATCH_STARTED`, and `RETURN_TO_LOBBY`.
- Reconnecting players receive the current round's chat history capped at 50 messages.

---

## 10. UI Tiers & Styling Details (Neo-Brutalist Design Tokens)

### Level 1: Authoritative Winner Banner
- **Background**: `#FFE600` (Gold highlight)
- **Border**: `2px solid #1a1a1a`
- **Shadow**: `2px 2px 0px #1a1a1a`
- **Typography**: 12px font, weight 900, uppercase, `Plus Jakarta Sans`
- **Reactions**: White pill buttons (`#ffffff`, border `1.5px solid #1a1a1a`) with count badge; active state switches to `#1a1a1a` with `#FFE600` text.

### Level 2: Normal Activity Stream
- **Guess Attempts**: 12px font, color `#4b5563`, bold name + muted `guessed` indicator.
- **Player Chat**: Classic white card, 2px border, 2px shadow, full sender avatar.

### Level 3: Subtle & Private Badges
- **Spoiler Mask**: Capsule pill, `#f1f5f9` background, `1px solid #cbd5e1`, 11px italic text.
- **Personal Notification**: Amber capsule, `#FEF3C7` background, `1.5px solid #D97706`, `#92400E` bold text.

---

## 11. Mobile Quick Guess Bar & Auto-Scroll Mechanics

1. **Smart Auto-Scroll**:
   - Calculates distance from bottom: `scrollHeight - scrollTop - clientHeight <= 100`.
   - If the user is near the bottom or the stream just reset, it auto-scrolls down.
   - If the user scrolled up to read earlier chatter, incoming messages do not jerk their view.
2. **Mobile Floating Toasts**:
   - Repetitive `guess_attempt` and `spoiler_hidden` events are filtered from popping up the intrusive mobile toast, keeping the screen clear for actual chatter and winner alerts.
3. **Typing & Guess Feedback**:
   - Preserves live typing preview `#mobileTypingPreview` and submission feedback `#mobileSubmittedFeedback`.

---

## 12. Sound Filtering & Audio Experience

Chat audio (`SoundManager.playChat()`) is strictly filtered in `MultiplayerContext`:
- Suppressed for:
  - Messages sent by oneself (`isMyMessage`).
  - Guess attempts (`isGuess || itemType === 'guess_attempt'`).
  - Masked spoilers (`itemType === 'spoiler_hidden'`).
  - Winner announcements (`itemType === 'winner'` - already accompanied by round winner fanfare).
  - Private notifications (`itemType === 'reaction_notification'`).
- Result: **Zero audio spamming** during rapid multi-player guessing sessions.

---

## 13. Preserved Selectors & DOM Contract

The following DOM elements are preserved and verified:
- `#chatTextInput`: Desktop input box
- `#chatSendBtn`: Desktop send button
- `#mobileQuickInput`: Mobile bottom-bar input box
- `#mobileQuickBtn`: Mobile bottom-bar submit button
- `#liveChatStream`: Live chat scroll container
- `#chatMessages`: Messages container wrapper
- `#mobileChatToggleBtn`: Mobile drawer trigger
- `#mobileChatBadge`: Mobile unread badge

---

## 14. Automated Test Matrix & Results

| # | Test Scenario | Verified Status |
| :--- | :--- | :--- |
| 1 | Initial chat state in `GameContext` is empty array | ✅ PASS |
| 2 | Static welcome message removed from `GameScreen` | ✅ PASS |
| 3 | Core DOM selectors and input IDs preserved | ✅ PASS |
| 4 | Server `SUBMIT_GUESS` conceals raw guess text from opponents | ✅ PASS |
| 5 | Submitter receives private `GUESS_EVALUATED` feedback | ✅ PASS |
| 6 | Winner message formatted with uppercase name, gold points & reactions | ✅ PASS |
| 7 | Server clears `state.chat` on all round/match transitions | ✅ PASS |
| 8 | Client clears `chatMessages` on round start, match start & rematch | ✅ PASS |
| 9 | Server rejects self-reactions with `CANNOT_REACT_TO_SELF` | ✅ PASS |
| 10 | Server implements reaction toggle & flip logic | ✅ PASS |
| 11 | Private reaction notifications routed to winner socket without room leak | ✅ PASS |
| 12 | Spoiler text masked as `🤫 spoiler hidden` with type `spoiler_hidden` | ✅ PASS |
| 13 | GameScreen renders 3 visual tiers and interactive reaction buttons | ✅ PASS |
| 14 | `neobrutalism.css` defines all styling rules with Neo-Brutalist tokens | ✅ PASS |
| 15 | SoundManager suppresses chat audio for non-chat activity noise | ✅ PASS |

---

## 15. Backward Compatibility & Edge Cases

- **Legacy Clients**: If a client sends an un-typed `CHAT_MESSAGE`, server defaults `type: 'player_chat'`.
- **Duplicate Commands**: `commandId` deduplication prevents double-reaction dispatch.
- **Host Migration**: Host migration events preserve chat stream and reaction records.
- **Reconnections**: Connecting players receive authoritative `chatMessages` array with updated reactions.

---

## 16. Deployment Verification & Production Checklist

1. `partykit/src/server.ts`: Verified via `npx tsc --noEmit` (0 errors).
2. `react-app`: Verified via `npm run build` (Vite production build succeeded in 8.24s).
3. Test Suite: 15 / 15 automated scenarios passed.
4. Security: Zero answer leakage in `CORRECT_ANSWER_BROADCAST`, zero raw guess leakage in `guess_attempt`, zero leak of private reaction notifications.
