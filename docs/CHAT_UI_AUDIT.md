# ScoopCast – Guess the Frame: Comprehensive Chat System & Architecture Audit

**Document Version:** 1.0.0  
**Date:** September 16, 2026  
**Status:** Complete Technical Audit (Read-Only Analysis)  
**Target Codebase:** Cloudflare Workers Durable Objects Backend (`partykit/src/server.ts`) & React Frontend (`react-app`)  
**Scope:** Message models, rendering pipelines, server/client authority, spoiler protection, round reset behavior, mobile interaction, test harness compatibility, and UX expansion risk analysis.

---

## Executive Summary

The ScoopCast chat system serves a dual architectural purpose:
1. **Real-time player social communication** (text chat, player banter, winner chatter).
2. **Authoritative gameplay guess submission and activity streaming** (guess broadcasts, correct-answer winner alerts, masked hint notifications).

Because the live chat stream is intimately intertwined with authoritative answer evaluation and scoring, modifying chat UI or behavior touches both Cloudflare Workers Durable Objects on the edge and React state machines on the client.

This audit details the complete end-to-end architecture, message lifecycles, UI rendering trees, state synchronization guarantees, existing spoiler masking, and potential conflict zones for future chat UX enhancements.

---

## 1. System Architecture & Component Inventory

### 1.1 Architectural Overview

```
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                 CLOUDFLARE WORKERS DURABLE OBJECT (EDGE)                    │
 │                         `partykit/src/server.ts`                            │
 │                                                                             │
 │  ┌───────────────────────────────────────────────────────────────────────┐  │
 │  │ Authoritative State:                                                  │  │
 │  │  - `state.chat: ChatMessage[]` (Bounded FIFO queue, max 50 items)     │  │
 │  │  - `state.phase: GamePhase` (LOBBY | STARTING | ROUND_ACTIVE | etc.)   │  │
 │  │  - `state.round.winners: RoundWinner[]`                               │  │
 │  └───────────────────────────────────────────────────────────────────────┘  │
 │           ▲                                                      │          │
 │           │ 1. `SUBMIT_GUESS` / `CHAT_MESSAGE`                   │ 2. Broadcast
 │           │                                                      ▼          │
 └───────────┼──────────────────────────────────────────────────────┼──────────┘
             │ WebSocket (`usePartySocket.js`)                      │
 ┌───────────┴──────────────────────────────────────────────────────┴──────────┐
 │                         REACT CLIENT FRONTEND                               │
 │                                                                             │
 │  ┌───────────────────────────────────────────────────────────────────────┐  │
 │  │ `MultiplayerContext.jsx`:                                             │  │
 │  │  - Dedupes incoming packets (`seenMessagesRef`, 4s window)            │  │
 │  │  - Manages monotonic state versioning                                 │  │
 │  │  - Triggers audio effects via `SoundManager`                          │  │
 │  │  - Updates `GameContext.jsx` -> `chatMessages`                        │  │
 │  └───────────────────────────────────────────────────────────────────────┘  │
 │                                    │                                        │
 │                                    ▼                                        │
 │  ┌───────────────────────────────────────────────────────────────────────┐  │
 │  │ `GameScreen.jsx`:                                                     │  │
 │  │  - Desktop Right Sidebar: `.live-chat-panel#liveChatPanel`            │  │
 │  │  - Mobile Bottom Sheet Drawer: `.live-chat-panel.mobile-open`         │  │
 │  │  - Mobile Bottom Bar: `#mobileQuickForm`, `#mobileTypingPreview`,     │  │
 │  │    `#mobileSubmittedFeedback`, `#mobileIncomingChatToast`             │  │
 │  └───────────────────────────────────────────────────────────────────────┘  │
 └─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 File & Component Inventory

| Component / File | Role & Current Usage | Status |
|---|---|---|
| `partykit/src/server.ts` | Authoritative Cloudflare Durable Object server. Evaluates guesses, masks spoilers, generates winner announcements, stores 50-message FIFO buffer, broadcasts events. | **Active & Authoritative** |
| `react-app/src/context/MultiplayerContext.jsx` | Client network layer. Routes incoming `CHAT_MESSAGE`, `CORRECT_ANSWER_BROADCAST`, and `STATE_UPDATE`. Deduplicates messages, triggers sounds. | **Active & Authoritative** |
| `react-app/src/context/GameContext.jsx` | Global state container. Holds `chatMessages` array and exports `setChatMessages`. | **Active & Authoritative** |
| `react-app/src/pages/GameScreen.jsx` | Primary UI component. Inlines the entire desktop chat panel, mobile bottom sheet drawer, and sticky bottom bar. | **Active & Authoritative** |
| `react-app/src/components/Game/ChatDrawer.jsx` | Standalone chat drawer component. | **Orphaned** (Not imported anywhere; `GameScreen.jsx` inlines its own chat panel) |
| `react-app/src/services/testBridge.js` | Contains `ChatEngine` implementation for offline/legacy mock transport and automated Playwright assertions. | **Active for E2E / Automation** |
| `react-app/src/styles/neobrutalism.css` | Styles `.live-chat-panel`, mobile drawer transform (`translateY(100%)` to `0`), header, stream, bubbles, toasts. | **Active Styling** |
| `react-app/src/styles/claymorphism.css` | Legacy responsive layout rules and fallback classes for `.live-chat-panel`. | **Active Styling** |

---

## 2. Message Types & Data Models

### 2.1 Authoritative Server Data Model (`server.ts`)

```typescript
export interface ChatMessage {
  id: string;              // Unique identifier (e.g. 'guess_17265...', 'winner_17265...', 'msg_...')
  senderId: string;        // Player ID or 'server'
  senderName: string;      // Display name
  senderAvatar: string;    // Avatar key (e.g. 'aman', 'amish', 'vish')
  text: string;            // Message text (or masked spoiler text)
  isGuess: boolean;        // True if message originated from an incorrect guess attempt
  timestamp: number;       // Epoch milliseconds
  type?: string;           // Optional: 'winner' | 'system' | 'chat'
}
```

### 2.2 Client In-Memory Data Model (`GameContext.jsx` & `GameScreen.jsx`)

On the client, messages in `chatMessages` can have slight field variations depending on whether they arrived from the server or were created locally:

```javascript
// Guess Message (from server):
{
  id: "guess_1726512345_abc12",
  senderId: "p_987654",
  senderName: "Rohan",
  senderAvatar: "rohan",
  text: "DILWALE DULHANIA LE JAYENGE",
  isGuessed: true,
  timestamp: 1726512345678
}

// Winner Announcement Message:
{
  id: "winner_1726512345_xyz99",
  senderId: "server",
  senderName: "System",
  senderAvatar: "aman",
  text: "Aman guessed the answer! (+10 pts - 1st)",
  isGuess: false,
  timestamp: 1726512345678,
  type: "winner"
}

// Casual Chat Message (Winner or General):
{
  id: "msg_1726512345_def45",
  senderId: "p_123456",
  senderName: "Aman",
  senderAvatar: "aman",
  text: "That was an easy one!",
  isGuessed: false,
  timestamp: 1726512345678
}

// System Notice:
{
  id: "welcome",
  type: "system",
  text: "Welcome to Live Guess Stream!"
}
```

---

## 3. End-to-End Rendering Flow & Component Hierarchy

### 3.1 Desktop Layout (`GameScreen.jsx`)

```
<div id="gameScreen">
  <div className="game-main-row">
    <!-- LEFT: HERO FRAME COLUMN -->
    <div className="game-stage-col"> ... </div>

    <!-- RIGHT: SIDEBAR COLUMN -->
    <aside className="game-sidebar-col">
      <!-- Card 1: Round Controls -->
      <div className="panel-sec"> ... </div>

      <!-- Card 2: Leaderboard -->
      <div className="panel-sec"> ... </div>

      <!-- Card 3: Live Chat & Guess Stream Panel -->
      <div className="live-chat-panel" id="liveChatPanel">
        <div className="chat-header">
          <div className="chat-header-title">
            <MessageCircle /> Live Chat & Guesses
          </div>
          <button id="chatHintBtn">Hint (-2 pts)</button>
          <button id="mobileChatCloseBtn">Close</button>
        </div>

        <!-- Masked Hint Banner -->
        <div className="chat-active-hint" id="chatActiveHint"> ... </div>

        <!-- Chat Scroll Stream -->
        <div className="chat-stream" id="liveChatStream" ref={chatStreamRef}>
          <div id="chatMessages" className="chat-messages-wrap">
            <div className="chat-msg-round">🎬 Welcome to Live Guess Stream!</div>
            {chatMessages.map(m => (
              <div className="chat-msg ...">
                <img className="chat-avatar" ... />
                <div className="chat-msg-body">
                  <div className="chat-msg-header">
                    <span>{m.senderName}</span>
                    {m.isGuessed && <span className="chat-badge-guessed">GUESSED</span>}
                  </div>
                  <div className="chat-msg-text">{m.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <!-- Desktop Input Form -->
        <form className="chat-input-form" id="chatInputForm" onSubmit={handleGuessSubmit}>
          <input id="chatTextInput" placeholder={inputPlaceholder} ... />
          <button id="chatSendBtn" type="submit">Send</button>
        </form>
      </div>
    </aside>
  </div>
</div>
```

### 3.2 Mobile Layout & Bottom Sheet Drawer (`GameScreen.jsx`)

On mobile ($< 768\text{px}$), the sidebar is hidden (`display: none`), except when `mobileDrawerOpen === true`. The `.live-chat-panel` transforms via CSS into a slide-up bottom-sheet drawer:

```
┌─────────────────────────────────────────────────────────────┐
│                    FRAME DISPLAY AREA                       │
├─────────────────────────────────────────────────────────────┤
│                    HOST CONTROLS BAR                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   [#mobileTypingPreview: "Typing: SHOLAY... [X]"]          │
│   [#mobileSubmittedFeedback: "GUESS SENT: \"SHOLAY\""]      │
│   [#mobileIncomingChatToast: "CHAT Aman: \"Hey!\" VIEW >"]  │
│   [#mobileHintBanner: "💡 HINT: S _ O _ A Y"]              │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ [#mobileQuickInput]  │ [GUESS/CHAT] │ [💡] │ [💬 2] │   │
│   └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

When `#mobileChatToggleBtn` is tapped:
1. `mobileDrawerOpen` toggles to `true`.
2. `#mobileChatBackdrop` receives `.active` (`opacity: 1; pointer-events: auto`).
3. `.live-chat-panel` receives `.mobile-open.active` (`transform: translateY(0); z-index: 9999999`).
4. `#mobileBottomBar` receives `.drawer-open` (`pointer-events: none !important; opacity: 0 !important`).
5. `unreadChatCount` resets to `0` and `latestIncomingChat` clears.

---

## 4. Server vs. Client Responsibilities

| Responsibility | Server (`server.ts`) | Client (`MultiplayerContext` / `GameScreen`) |
|---|---|---|
| **Secret Answer Authority** | **Sole Authority**. Stores `fullPlaylist` with answers. Strips `answer` and `revealContent` from `round.frame` during `ROUND_ACTIVE`. | Never possesses the secret answer during `ROUND_ACTIVE`. |
| **Guess Evaluation** | **Authoritative**. Performs `FuzzyMatcher.isMatch(guessText, answer)`. | Submits plain guess string via `SUBMIT_GUESS`. Plays click/submit audio. |
| **Spoiler Masking** | **Authoritative**. Intercepts matching text from winners or casual chats and replaces with `'🤫 (spoiler hidden)'`. | Renders masked text verbatim. Suppresses incoming chat audio notification for spoiler messages. |
| **Guess-to-Chat Routing** | **Authoritative**. If non-winner types the answer in `SEND_CHAT`, server transparently redirects to `SUBMIT_GUESS`. | Treats all submissions through `submitGuess()` routing. |
| **Message Ordering & History** | **Authoritative FIFO**. Capped at 50 messages. Persisted to Cloudflare DO SQLite storage. | Merges server history on `STATE_UPDATE`. Keeps local reactive state in React memory. |
| **Notification Audio** | Silent (server only transmits data). | **Client-side SoundManager**: plays `correct` / `opponentCorrect` for winners, `chat` sound for other players' casual chat, and suppresses sound for guesses/spoilers. |
| **Unread Counters & Mobile Toasts** | Agnostic (server broadcasts all messages). | **Client-side**: tracks `unreadChatCount` and schedules 4.5-second auto-dismissal for `#mobileIncomingChatToast`. |

---

## 5. Existing Spoiler Behavior & Masking Rules

### 5.1 Where Masking Occurs

Spoiler masking is implemented on the server in two distinct code paths:

#### Path A: Winner Submissions in `SUBMIT_GUESS` (`server.ts` lines 741–780)
When a player has already guessed correctly (`alreadyWon === true`):
1. The server allows unlimited chatting.
2. It retrieves the current round's secret answer from `fullPlaylist[this.state.round.index]`.
3. It computes `isSpoiler`:
   ```typescript
   const isSpoiler = Boolean(
     answer &&
     (FuzzyMatcher.isMatch(guessText, answer) ||
      (answer.length >= 3 && guessText.toUpperCase().includes(answer.toUpperCase())))
   );
   ```
4. If `isSpoiler === true`, `displayText` becomes `'🤫 (spoiler hidden)'`.
5. The message is pushed to `this.state.chat` with `isGuess: false` and broadcasted to all participants via `CHAT_MESSAGE`.

#### Path B: General Messages in `SEND_CHAT` / `CHAT_MESSAGE` (`server.ts` lines 986–1053)
During `ROUND_ACTIVE`:
1. If a message matches the secret answer:
   - **If the sender has NOT won yet**: The server invokes `SUBMIT_GUESS` internally on behalf of the player. This awards them the win and broadcasts the winner announcement, preventing the answer string from ever entering the chat log.
   - **If the sender HAS already won** OR the text contains the answer as a substring: `displayText` is masked as `'🤫 (spoiler hidden)'`.

### 5.2 What Happens After Round Ends (`ROUND_REVEAL` / `MATCH_OVER`)?
- Once `state.phase` shifts to `ROUND_REVEAL`, `isRoundActive()` is `false`.
- **New messages** are no longer checked for spoilers. Players can freely discuss the revealed title.
- **Historical messages** that were masked as `'🤫 (spoiler hidden)'` remain permanently masked in `state.chat`.

---

## 6. Round Initialization and Reset Behavior

### 6.1 Server-Side Chat Persistence
In `server.ts`:
- `START_MATCH`: Resets player scores to 0; generates playlist; sets `phase = 'ROUND_ACTIVE'`. **Does NOT clear `this.state.chat`.**
- `NEXT_ROUND`: Advances `round.index`; schedules timer; broadcasts `ROUND_START`. **Does NOT clear `this.state.chat`.**
- `RETURN_TO_LOBBY`: Sets `phase = 'LOBBY'`; sets `round = null`. **Does NOT clear `this.state.chat`.**
- `REMATCH`: Resets scores to 0; restarts playlist at round 0. **Does NOT clear `this.state.chat`.**

> **Current Behavior**: The server maintains a continuous 50-message rolling chat buffer across the entire room lifecycle. Round transitions do not purge or demarcate the chat history on the server.

### 6.2 Client-Side Chat Synchronization
In `MultiplayerContext.jsx`:
- On `MATCH_START` and `ROUND_START`, the client resets local round-specific state (`roundWinners`, `isRoundFinished`, `maskedHint`), but **does NOT empty `chatMessages`**.
- On `STATE_UPDATE`, the client merges the incoming `state.chat` with existing client messages:
  ```javascript
  const chatItems = state.chat || state.chatMessages;
  if (chatItems && Array.isArray(chatItems) && chatItems.length > 0) {
    game.setChatMessages(prev => {
      const existingIds = new Set(prev.map(c => c.id));
      const additions = chatItems.filter(c => !existingIds.has(c.id));
      if (additions.length === 0) return prev;
      return [...prev, ...additions];
    });
  }
  ```
- **Identified Idiosyncrasy**: While the server caps its array at 50 with `shift()`, the client's `setChatMessages` append logic never trims `prev`. If a game runs for 20 rounds with 100+ total messages, the client's React memory retains all of them unless a hard browser refresh occurs.

### 6.3 Round Boundary Demarcation
- There are currently **no round demarcation lines** (e.g. `--- ROUND 2: GUESS THE FRAME ---`) injected into `chatMessages`.
- Only a single static welcome header (`🎬 Welcome to Live Guess Stream!`) is hardcoded at the top of `#chatMessages`.
- Players scrolling through chat cannot easily distinguish which guesses belonged to Round 1 vs. Round 2.

---

## 7. Exact Files and Components Requiring Modification for Chat UX Enhancements

If new chat UX capabilities are requested (e.g., visual round dividers, dedicated guess vs. chat styling, message reactions, typing indicators, auto-scroll controls, sound toggles), the following files must be modified:

### 1. `partykit/src/server.ts`
- **Why**:
  - To inject authoritative round separator messages (e.g. `{ id: 'round_sep_2', type: 'round_boundary', roundIndex: 2, text: 'ROUND 2 STARTED' }`) upon `START_MATCH`, `NEXT_ROUND`, and `REMATCH`.
  - To support typing indicator events (`TYPING_INDICATOR`) or message reactions (`CHAT_REACTION`).
  - To manage chat retention policies (clearing chat per match vs. persistent room stream).

### 2. `react-app/src/pages/GameScreen.jsx`
- **Why**:
  - Inlines the actual rendering of `#chatMessages`, `#chatInputForm`, `#mobileQuickForm`, and mobile drawer toggles.
  - Controls auto-scrolling behavior (`chatStreamRef.current.scrollTop = scrollHeight`).
  - Renders the badge for `.chat-badge-guessed` and winner announcements.
  - Manages mobile notifications (`#mobileIncomingChatToast`) and unread badges (`#mobileChatBadge`).

### 3. `react-app/src/context/MultiplayerContext.jsx`
- **Why**:
  - Handles incoming `CHAT_MESSAGE` packets and deduplication.
  - Triggers audio notifications (`SoundManager.playChat()`).
  - Merges `state.chat` into `game.setChatMessages`. If round boundaries or message limits are enforced on the client, the merge algorithm in `STATE_UPDATE` must be updated.

### 4. `react-app/src/context/GameContext.jsx`
- **Why**:
  - Holds initial state for `chatMessages`.
  - Can expose helper methods such as `clearChat()`, `markChatRead()`, or `addSystemChatMessage()`.

### 5. `react-app/src/styles/neobrutalism.css`
- **Why**:
  - Defines the appearance of `.chat-msg`, `.chat-msg-winner`, `.chat-badge-guessed`, `.chat-notice-subtle`.
  - Controls mobile drawer positioning, animations, z-index (`--z-drawer: 30000`), and safe-area padding.
  - Styles mobile typing preview bubble (`#mobileTypingPreview`) and incoming chat toast (`#mobileIncomingChatToast`).

### 6. `react-app/src/services/testBridge.js`
- **Why**:
  - Contains `ChatEngine` methods (`renderMessage`, `renderWinnerBanner`, `renderSystemMessage`).
  - Playwright E2E automation tests exercise chat through `window.MultiplayerEngine.sendChatMessage` and test bridge hooks. Any markup or structural changes must maintain compatibility.

### 7. `react-app/src/components/Game/ChatDrawer.jsx`
- **Why**:
  - Currently dead/orphaned code. If the team decides to refactor `GameScreen.jsx` to use a modular component rather than inlining 150 lines of chat JSX, `ChatDrawer.jsx` should be rewritten or formally deleted to prevent confusion.

---

## 8. Potential Conflicts & Invariants with Multiplayer/Game Rules

Any modification to the chat subsystem must carefully avoid breaking the existing multiplayer architecture:

### 8.1 Critical Game Rule & Multiplayer Invariants

1. **Never Leak the Answer String**:
   - The secret answer is completely absent from the client during `ROUND_ACTIVE`.
   - Any client-side "optimistic chat rendering" that displays a user's text before the server evaluates it could leak the answer to observers or via screen-share.
   - **Constraint**: Plain text messages must either be evaluated on the server first or strictly checked against client-side rules before rendering locally.

2. **Durable Object Payload Size Limits**:
   - `state.chat` is included in `STATE_UPDATE` broadcasts.
   - If chat history is allowed to grow unbounded (e.g. 500 messages), every state sync packet (sent multiple times per round on hints, pauses, joins) will swell to hundreds of kilobytes, degrading latency on mobile connections and consuming Cloudflare Workers bandwidth.
   - **Constraint**: Server-side chat buffer must remain strictly bounded (50–100 items maximum).

3. **Packet Deduplication Collisions**:
   - `MultiplayerContext.jsx` deduplicates packets using `${type}_${senderId}_${id}_${timestamp}` within a 4000ms window.
   - If rapid chat messages share an identical millisecond timestamp or default ID format, legitimate consecutive messages could be dropped as duplicates.
   - **Constraint**: All chat message dispatchers must generate cryptographically unique IDs (`crypto.randomUUID()` or timestamp + high-entropy suffix).

4. **Double Submission Elimination**:
   - As resolved in Phase 21, the submit buttons (`#chatSendBtn`, `#mobileQuickBtn`) rely strictly on `<form onSubmit>`.
   - **Constraint**: Do NOT re-introduce `onClick` handlers on submit buttons alongside `form.onSubmit`.

5. **Layer Collision & Mobile Keyboard Geometry**:
   - On Android and iOS, opening the soft keyboard triggers dynamic viewport resizing (`100dvh`).
   - If the mobile chat drawer has hardcoded heights without factoring in `safe-area-inset-bottom` and virtual keyboards, the chat input field can be pushed beneath the visible screen.
   - When the drawer is open, `.mobile-bottom-bar.drawer-open` must maintain `pointer-events: none` to prevent clicks from leaking into hidden game controls.

6. **Audio Throttling & Sound Storms**:
   - Currently, `SoundManager.playChat()` is filtered so it does NOT play for:
     - The sender's own messages.
     - Guess submissions (`isGuess: true`).
     - Spoiler masks (`text.includes('🤫 (spoiler hidden)')`).
   - If player chat is styled differently or animations are added, this sound suppression filter must remain intact to avoid deafening players during rapid guessing.

7. **E2E Test Selector Stability**:
   - Existing Playwright test suites (`tests/verify_*.spec.js`, `scratch/test_unlimited_guesses_and_chat.cjs`, and `verify_mobile.cjs`) explicitly query:
     - `#chatTextInput`
     - `#chatSendBtn`
     - `#mobileQuickInput`
     - `#mobileQuickBtn`
     - `#liveChatStream`
     - `#mobileChatToggleBtn`
     - `#mobileChatBadge`
   - **Constraint**: These DOM IDs and their core interaction behaviors must be preserved.

---

## 9. Conclusion & Recommendations

The ScoopCast chat architecture is performant, secure against XSS, and resiliently synchronized via Cloudflare Workers Durable Objects. However, several UX and technical opportunities exist for clean, non-breaking improvement:

1. **Demarcate Rounds**: Inject lightweight `{ type: 'round_boundary', roundIndex }` messages into the stream when rounds advance so players can follow match progression.
2. **Cap Client-Side Memory**: Update `MultiplayerContext.jsx` so `chatMessages` enforces the same rolling limit (e.g. 50 items) as the server, preventing unbounded array growth in long matches.
3. **Consolidate Component Architecture**: Either remove `react-app/src/components/Game/ChatDrawer.jsx` or refactor `GameScreen.jsx` to cleanly consume it as a subcomponent.
4. **Visual Distinction**: Provide distinct visual container styles for incorrect movie guesses vs. player social messages to improve readability during frantic rounds.

*This report concludes the comprehensive Chat System Audit.*
