# ScoopCast Multiplayer Synchronization Audit

**Document Version:** 1.0.0  
**Date:** September 16, 2026  
**Auditor:** Senior Multiplayer Game Engineer & Distributed Systems Architect  
**Project:** ScoopCast – Guess the Frame (`asmitsharma-alt/guess-the-frame`)  
**Scope:** Complete Codebase Multiplayer Synchronization Audit & Authoritative Target Design  

---

## 1. Executive Summary

ScoopCast is a real-time multiplayer cinema guessing party game built with React, Vite, Tailwind CSS, Lucide React, and deployed on Vercel (`https://scoopcast.me`) with a backend running on Cloudflare Workers using PartyServer / Cloudflare Durable Objects (`guess-the-frame-party.asmit-sharma.workers.dev`).

Following the complete removal of the legacy Node.js/Express backend and public MQTT brokers, this audit was commissioned to analyze how game state is synchronized across independent devices and to establish a roadmap for making Cloudflare Durable Objects the single authoritative source of truth.

### Key Audit Findings:

1. **Split-Brain State Ownership (Host-Authoritative vs. Server-Authoritative)**:
   The codebase is currently in a transitional hybrid state. In the original design, the Host client's browser acted as the game server (generating playlists, evaluating guesses via Levenshtein distance, distributing points, controlling the round timer, and triggering transitions). When the Cloudflare Durable Object was introduced in `partykit/src/server.ts`, a second authoritative engine was introduced in parallel. As a result, both the Host client and Cloudflare Workers attempt to evaluate guesses, award scores, and advance rounds independently, leading to divergent scores, duplicate broadcast events, and race conditions.

2. **Client-Authoritative Playlist & Frame Leaks**:
   The Cloudflare Durable Object has no catalog of game frames. Instead, when the Host clicks "Start Match", the Host client transmits the entire match playlist (including all raw answer strings) over the WebSocket. This exposes all game answers in client memory and network packets, creates vulnerability to tampering, and causes desynchronization if the Host client's transmission is corrupted or partial.

3. **Dual Client/Server Timer Drift**:
   Both `GameContext.jsx` on every client and `GameRoomServer` in `server.ts` maintain independent `setInterval(..., 1000)` loops. When a browser tab is throttled or backgrounded (especially on mobile OSes), client timer loops drift or halt. Clients independently trigger round-end logic (`isRoundFinished = true`) based on local clocks rather than relying on an authoritative server epoch timestamp (`roundStartedAt + duration`).

4. **Zero State Versioning & Missing Command Deduplication**:
   No state packets carry monotonic version numbers (`version` or `sequenceNumber`). Older state updates arriving out-of-order can overwrite newer state. Furthermore, commands lack unique identifiers (`commandId`), meaning host double-clicks on "Next Round" or network retries advance rounds multiple times.

5. **`BroadcastChannel` Test-Harness Cross-Contamination**:
   `BroadcastChannel` is actively instantiated in `MultiplayerContext.jsx` and `testBridge.js`. While useful for same-browser cross-tab tests, it completely bypasses Cloudflare Workers for same-device tabs, masking real cross-device network latency, serialization issues, and edge behavior during automated local testing.

6. **Incomplete Reconnection & Page-Refresh State Loss**:
   While `server.ts` broadcasts `SYNC_ROOM_STATE` upon WebSocket connection, `MultiplayerContext.jsx` does not restore the active screen (`currentScreen`), active match flag (`isMatchActive`), or chat history upon receiving `SYNC_ROOM_STATE`. Consequently, refreshing the browser during a match drops the user onto the Home Screen or Player Lobby with a desynchronized view.

---

## 2. Current Architecture

The actual data flow in the repository does not follow a pure client-to-server-to-client topology. Instead, it operates across two intertwined pipelines:

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                             CURRENT HYBRID PIPELINE                             │
└─────────────────────────────────────────────────────────────────────────────────┘

                [ Host Device Browser ]
                   │               │
      (Local UI /  │               │ (PartySocket /
       Broadcast)  │               │  WebSocket)
                   ▼               ▼
     ┌───────────────────┐    ┌──────────────────────────────────────────────┐
     │ BroadcastChannel  │    │ Cloudflare Worker / Durable Object           │
     │ (Same-device tab  │    │ (GameRoomServer in partykit/src/server.ts)   │
     │  synchronization) │    │                                              │
     └─────────┬─────────┘    │  - Stores RoomState in memory (volatile)     │
               │              │  - Runs parallel setInterval timer           │
               │              │  - Validates exact string match guesses      │
               │              │  - Reassigns host on connection close        │
               │              └──────────────────────┬───────────────────────┘
               │                                     │
               │  (Local cross-tab)                  │ (Edge WebSockets)
               ▼                                     ▼
      [ Same-Browser Tabs ]               [ Independent Guest Devices ]
      (Receives duplicate                  - Mobile Android / iOS
       packets & races edge)               - Remote Desktops
```

### Architectural Deficiencies of Current Setup:
1. **Durable Object Storage Unused**: Although `wrangler.jsonc` specifies `new_sqlite_classes: ["GameRoomServer"]`, `server.ts` maintains all state purely in volatile instance memory (`this.state`). If the Durable Object hibernates or restarts, all room data is lost.
2. **Double Evaluation**: Both the Host client (via `MultiplayerContext.jsx` line 349) and `server.ts` (line 397) evaluate incoming guesses, applying different algorithms and awarding conflicting point values.
3. **Dual Global States**: The React application utilizes `GameContext.jsx` for React state, but `testBridge.js` simultaneously maintains `window.GS`, creating two divergent sources of truth within the exact same browser window.

---

## 3. Current Data Flow

### 3.1 Room Creation Flow
1. User enters name/avatar on `HomeScreen` and clicks "Create Room".
2. `App.jsx` (`handleCreateRoomConfirm`) generates a local 4-letter code (or reads `MultiplayerEngine.roomCode`).
3. `GameContext.jsx` updates `roomCode` and `isHost = true`.
4. `MultiplayerContext.jsx` mounts `usePartySocket` with `roomCode`.
5. `usePartySocket.js` opens WebSocket to `wss://guess-the-frame-party.asmit-sharma.workers.dev/parties/main/{ROOM_CODE}`.
6. On socket open, `usePartySocket.js` sends `PLAYER_JOIN` with `isHost: true`.
7. `GameRoomServer.onMessage` in `server.ts` receives `PLAYER_JOIN`, adds player to `this.state.players`, sets `this.state.hostId`, and replies with `JOIN_ACK` and broadcasts `SYNC_ROOM_STATE`.

### 3.2 Guest Joining Flow
1. Guest visits `/?room=ABCD`.
2. `App.jsx` extracts `room` URL parameter and opens `JoinRoomModal`.
3. Guest enters name, picks avatar, clicks "Enter Room".
4. `MultiplayerContext.jsx` initializes `usePartySocket` to room `ABCD`.
5. Guest client sends `PLAYER_JOIN`.
6. Server pushes guest into `this.state.players`, acknowledges with `JOIN_ACK`, and broadcasts `SYNC_ROOM_STATE` to all clients.
7. Host client receives `PLAYER_JOIN` / `SYNC_ROOM_STATE` and, in `MultiplayerContext.jsx` line 219, **the Host client also broadcasts another `SYNC_ROOM_STATE` and `JOIN_ACK` back to the server and all peers**, creating an echo loop.

### 3.3 Gameplay Start Flow
1. Host clicks "START MATCH" on `LobbyScreen`.
2. `App.jsx` calls `onStartMatch()`, which immediately sets `game.setIsMatchActive(true)` locally, switches to `'gameScreen'`, and emits `START_GAME` with `playlist: game.currentPlaylist`.
3. Server receives `START_GAME`, sets `this.state.playlist = msg.playlist`, resets scores to 0, starts server timer, and broadcasts `MATCH_START` and `ROUND_START`.
4. Clients receive `ROUND_START`, set `isMatchActive = true`, start local `setInterval` countdown timers, and render the frame.

### 3.4 Guess Submission & Scoring Flow
1. Player types a guess and submits.
2. `GameScreen.jsx` calls `onSubmitGuess(clean)`.
3. If submitter is Host, `GameScreen.jsx` lines 145-155 routes directly to local `MultiplayerEngine.validateAndProcessGuess` instead of sending over WebSocket!
4. If submitter is Guest, `onSubmitGuess` emits `SUBMIT_GUESS` to Cloudflare Workers.
5. Server receives `SUBMIT_GUESS`, pushes it to `chatMessages`, broadcasts `CHAT_MESSAGE` and `SUBMIT_GUESS`.
6. Server checks `normalizedGuess === normalizedAnswer`. If match: adds +10 pts, stops timer, broadcasts `CORRECT_ANSWER_BROADCAST` and `ROUND_FINISH_EARLY`.
7. Meanwhile, Host client receives `SUBMIT_GUESS` in `MultiplayerContext.jsx` line 337, executes Levenshtein `FuzzyMatcher.isMatch(...)`. If match: adds +10 (or +7, +5) pts, emits `GUESS_CORRECT_BROADCAST`.
8. Other clients receive both broadcasts from Server and Host, risking double scoring and state desynchronization.

---

## 4. Multiplayer State Ownership

The following table documents every piece of multiplayer state in the active codebase:

| State Field | Current Owner | Current Storage | Synchronization Method | Authoritative? | Problems Identified |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Room Code** | Client (Host) | `GameContext` & `testBridge.js` | Sent in URL path `/parties/main/{CODE}` | ❌ Client | Host generates random 4-char string locally without checking server for collisions. |
| **Players List** | Split (Host & Server) | `server.ts` (`state.players`) & `GameContext` (`players`) | `SYNC_ROOM_STATE`, `PLAYER_JOIN`, `PLAYER_LEFT` | ⚠️ Contested | Host client can override server player list via `SYNC_ROOM_STATE`. Disconnects only tracked if socket cleanly closes. |
| **Host Role** | Split (Client & Server) | `server.ts` (`state.hostId`) & `GameContext` (`isHost`) | `JOIN_ACK`, `HOST_MIGRATED`, client watchdog | ⚠️ Contested | `testBridge.js` has a client-side host migration watchdog that can reassign host locally, conflicting with server host migration. |
| **Player Ready / Preload** | Client | `server.ts` (`player.preloaded`) & `GameContext` | `PLAYER_PRELOAD_STATUS` | ❌ Client | Client reports arbitrary preloaded boolean. `LobbyScreen` bypasses wait so games start regardless of preload. |
| **Game Phase** | Split | `server.ts` (`isMatchActive`, `isRoundFinished`) & `GameContext` | `MATCH_START`, `ROUND_START`, `ROUND_FINISH_*` | ⚠️ Contested | Client can advance local screen to `winnerScreen` or `gameScreen` before server confirms transition. |
| **Playlist / Category** | Host Client | `GameContext` (`currentPlaylist`) & `server.ts` | Sent in payload of `START_GAME` | ❌ Host Client | Server possesses no frame catalog; trusts Host payload completely. All movie answers exposed in plaintext JSON over network. |
| **Round Index** | Split | `server.ts` (`currentPlayIndex`) & `GameContext` | `ROUND_START`, `NEXT_ROUND`, `ROUND_CHANGED` | ⚠️ Contested | In `App.jsx` line 205, Host increments `nextIdx = currentIdx + 1` locally, then emits `ROUND_START` instead of asking server to increment. |
| **Current Frame** | Host Client | `GameContext` (`currentFrame`) | Sent in `ROUND_START` payload | ❌ Host Client | If client frame differs from server or other clients, mismatched frames render across devices. |
| **Timer** | Dual Independent Timers | `server.ts` (`timeRemaining`) & `GameContext` (`timeRemaining`) | `TIMER_TICK` broadcast vs local `setInterval` | ❌ Neither (Broken) | Server ticks every 1s via `setInterval`. Client ALSO runs local `setInterval`. Backgrounded mobile tabs freeze local timer, causing time drift. |
| **Guesses** | Submitting Client | `server.ts` (`chatMessages`) & local inputs | `SUBMIT_GUESS` | ⚠️ Contested | Host does not send own guesses to server when `MultiplayerEngine` is mounted; evaluates own guesses locally. |
| **Answer Correctness** | Dual Evaluators | `server.ts` (exact match) & Host client (`FuzzyMatcher`) | `CORRECT_ANSWER_BROADCAST` & `GUESS_CORRECT_BROADCAST` | ❌ Conflicted | Server awards 10 pts on exact match. Host awards 10/7/5 on fuzzy match. Clients receive conflicting winner packets. |
| **Scores** | Split | `server.ts` (`player.score`) & `GameContext` (`players[i].score`) | Mutated inside guess handlers; synced in `SCORE_UPDATE` | ❌ Unsynchronized | No single authoritative ledger. Conflicting points awarded by server and host cause score divergence. |
| **Chat Stream** | Server (with client echo) | `server.ts` (`state.chatMessages`) & `GameContext` | `CHAT_MESSAGE` | ✅ Partially Server | Server caps history at 50 messages, but does not send full history upon late join/reconnect. |

---

## 5. Lobby Synchronization Audit

### Lifecycle Trace:

```text
Host creates room ────► Connects WS ────► Server sets hostId ────► Sends JOIN_ACK
                                                                          │
Guest joins ──────────► Connects WS ────► Server adds player ◄───────────┘
                                                │
                                                ├──► Broadcasts SYNC_ROOM_STATE to all
                                                │
                                                └──► (BUG) Host client echoes back SYNC_ROOM_STATE
```

### Critical Findings:
1. **Echo Storm on Join**:
   In `MultiplayerContext.jsx` lines 217–224:
   ```javascript
   if (game.isHost) {
     sendEvent('SYNC_ROOM_STATE', { players: nextList, ... });
     sendEvent('JOIN_ACK', { targetPlayerId: joinId, ... });
   }
   ```
   When a new player joins, the server broadcasts `SYNC_ROOM_STATE`. When the Host client receives this, its `PLAYER_JOIN` handler fires and immediately issues *another* `SYNC_ROOM_STATE` and `JOIN_ACK` back to the server and all peers. This creates unnecessary network churn and can overwrite server-authoritative player state.

2. **Player 2 Appearance Guarantee**:
   - When Player 2 joins room `ABCD`, `server.ts` adds Player 2 to `this.state.players` and calls `this.broadcastState('SYNC_ROOM_STATE')`.
   - All connected sockets receive the full player list.
   - However, if Player 2's connection dropped and reconnected before `JOIN_ACK`, `server.ts` checks `this.state.players.find(p => p.id === playerId)`. Because `playerId` is generated in `localStorage` (`gtf_player_id`), the server re-identifies the player correctly, but does not guarantee atomic room locking during game transitions.

3. **Settings Synchronization**:
   When the Host alters categories or round limits in `LobbyScreen.jsx`, `onUpdateSettings` sends `UPDATE_HOST_SETTINGS`. The server updates `this.state.hostSettings` and broadcasts `HOST_SETTINGS_UPDATE`. Guests update their local `hostSettings`. This flow is clean, but settings are not validated on the server (e.g. negative timers or invalid category arrays are accepted without verification).

---

## 6. Round Synchronization Audit

### Trace of "NEXT ROUND":

```text
Host clicks "Next Round"
   │
   ├──► (Current code in App.jsx L205): Host calculates nextIdx = currentPlayIndex + 1 locally
   ├──► Host sets currentPlayIndex = nextIdx in React state
   ├──► Host selects nextFrame = activePlaylist[nextIdx] locally
   │
   └──► Host sends: { type: 'ROUND_START', roundIndex: nextIdx, frame: nextFrame }
           │
           ▼
   Cloudflare Durable Object (partykit/src/server.ts)
           │
           ├──► PROBLEM: server.ts onMessage has NO case for 'ROUND_START'!
           ├──► Message hits default: break; (IGNORED BY SERVER)
           │
           └──► Result: Round ONLY updates on other devices if BroadcastChannel delivers it,
                OR if Host sends 'NEXT_ROUND' via another codepath!
```

### Critical Race Conditions & Flaws:
1. **Ignored `ROUND_START`**: `server.ts` does not handle `ROUND_START` as an incoming client command. It expects `NEXT_ROUND`. In `App.jsx` line 232, the UI handler emits `ROUND_START`. If guest devices rely on the server WebSocket relay without `NEXT_ROUND`, the server never increments `this.state.currentPlayIndex`!
2. **Double-Click Command Multiplication**: `NEXT_ROUND` has no `commandId` or round guard (`currentRoundIndex !== expectedRoundIndex`). If the host double-clicks or experiences packet stutter, the server increments `currentPlayIndex` twice in rapid succession, skipping a round entirely.
3. **No Stale Message Protection**: If `ROUND_START` (round 2) arrives before a delayed `ROUND_FINISH` (round 1), the client UI enters an inconsistent state.
4. **Host Drop During Transition**: If the Host disconnects while clicking Next Round, guests remain frozen in the finished round state indefinitely because the server does not auto-advance rounds without host intervention.

---

## 7. Frame Synchronization Audit

### Frame Selection Analysis:
- **Who chooses the frame?** The **Host Client** chooses the frame.
- In `App.jsx` line 155, the Host takes `DEFAULT_FRAMES` from its local bundle, shuffles them via `MultiplayerEngine.startMatch()`, and transmits the entire JSON array to the server.
- The server simply stores this array in `this.state.playlist`.
- **Can different devices select different frames?** YES. If a guest does not receive the full `currentPlaylist` in `SYNC_ROOM_STATE`, or if their local bundle has different indices, the guest falls back to `game.currentPlaylist[nextIdx]`, which may have an entirely different order if shuffled locally.

### Asset Loading & Display Synchronization:
1. **Preloading Mechanism**:
   - `AssetPreloader.js` extracts all image paths from `DEFAULT_FRAMES`, `DEFAULT_EYES`, `DEFAULT_TIE_BREAKERS`, and avatars.
   - It iterates through with concurrency pool of 2 (`CONCURRENCY = 2`) and calls `img.decode()`.
   - Each image has a 7000ms safety timeout.
2. **Upcoming Frame Decoding**:
   - `GameScreen.jsx` lines 61-78 preloads the next 3 upcoming frames during active gameplay.
3. **Loading Failures**:
   - If an image fails to load (`img.onerror`), the preloader calls `finish()`, counting it as loaded to prevent UI hangs.
4. **Desynchronization via Network Delay**:
   - When a round starts, Device A (fast connection) displays the frame in 50ms.
   - Device B (poor cellular connection) takes 2500ms to download and render the frame.
   - The round timer continues ticking down for both devices simultaneously. Device B loses 2.5 seconds of guess time.
   - Under the current system, there is no server-coordinated "all players ready / frame loaded" barrier before the timer starts.

---

## 8. Timer Synchronization Audit

### Current Timer Architecture:

```text
SERVER (server.ts L118):
  setInterval(() => {
    this.state.timeRemaining -= 1;
    broadcast({ type: 'TIMER_TICK', timeRemaining: this.state.timeRemaining });
    if (this.state.timeRemaining <= 0) handleRoundTimeout();
  }, 1000);

CLIENT (GameContext.jsx L165):
  setInterval(() => {
    setTimeRemaining(prev => {
      if (prev <= 1) { setIsRoundFinished(true); return 0; }
      return prev - 1;
    });
  }, 1000);
```

### Fatal Synchronization Flaws:
1. **Dual Competing Timers**: Both server and client execute independent 1-second interval timers.
2. **Mobile Background Throttling**: When a mobile player switches apps or pulls down their notification shade, the browser freezes JavaScript execution. The local timer pauses. When the user returns, their local timer is out of sync with the server by several seconds until the next `TIMER_TICK` packet arrives.
3. **Premature Client Round Termination**: Because `GameContext.jsx` triggers `setIsRoundFinished(true)` when its *local* timer hits 0, a slightly faster client will reveal the answer and lock the guess input before the server has officially ended the round.
4. **High Network Overhead**: Broadcasting `TIMER_TICK` every second across all connections generates 60 packets per minute per room on Cloudflare Workers, consuming unnecessary WebSocket message operations.
5. **No Absolute Time Authority**: The system relies on relative decrements (`timeRemaining -= 1`) rather than an absolute server timestamp (`roundEndsAt = Date.now() + durationMs`).

---

## 9. Answer and Scoring Audit

### Detailed Comparison of Guess Evaluation:

| Feature | Server Implementation (`server.ts`) | Host Client Implementation (`MultiplayerContext` & `testBridge`) |
| :--- | :--- | :--- |
| **Normalization** | Strips diacritics, lowercase, alphanumeric only (`normalizeAnswer`) | Strips years, punctuation, leading articles ("the", "a", "an"), multi-spaces (`FuzzyMatcher.normalize`) |
| **Matching Algorithm** | Exact string comparison (`normalizedGuess === normalizedAnswer`) | Levenshtein distance: allows 1 edit (≤8 chars), 2 edits (>8 chars); handles subtitle splits and 2-word prefixes |
| **Points Awarded** | Flat 10 points to winner (`player.score += 10`) | Ranked positions: 1st = 10 pts, 2nd = 7 pts, 3rd = 5 pts |
| **Round Termination** | Ends round immediately upon first correct answer | Allows up to 3 winners before terminating round |
| **Broadcast Event** | `CORRECT_ANSWER_BROADCAST` & `ROUND_FINISH_EARLY` | `GUESS_CORRECT_BROADCAST` |

### Consequences of This Discrepancy:
- If a player guesses "monarch" for "Monarch: Legacy of Monsters":
  - Host client evaluates it as **CORRECT** (subtitle match), awards 10 points, and broadcasts `GUESS_CORRECT_BROADCAST`.
  - Cloudflare Server evaluates it as **INCORRECT** (`"monarch" !== "monarchlegacyofmonsters"`), does nothing, and keeps the round running.
  - Clients receive conflicting instructions: Host says round is finished; Server says round is active!
- If the Host submits a guess, line 145 of `GameScreen.jsx` bypasses the server completely and executes local validation, meaning the server never even knows the Host guessed!

---

## 10. Chat Synchronization Audit

### Current Topology:
```text
Client types message ──► PartySocket.send('CHAT_MESSAGE') ──► Server pushes to chatMessages[]
                                                                      │
                                                                      └──► Broadcasts CHAT_MESSAGE to room
```

### Strengths & Flaws:
- **Ordering**: Server broadcasts chat messages sequentially; ordering across clients is consistent.
- **Deduplication**: Message IDs are generated with timestamps (`msg_Date.now()_rand`) and deduplicated via `seenMessagesRef` (window of 6000ms).
- **Answer Spoilers**: Guesses are displayed directly in the chat stream (`isGuess: true`). If a guess is close but incorrect, it is visible to all players. However, if a guess is correct, there is no masking mechanism—the plaintext answer is visible in the chat log immediately.
- **Late Joiners**: The server stores up to 50 recent messages in `this.state.chatMessages`, but does **not** include them in `SYNC_ROOM_STATE`. Anyone joining or reconnecting receives an empty chat history.

---

## 11. Reconnection Audit

### Scenario: Player disconnects (network loss) and reconnects 10 seconds later:

1. `usePartySocket` detects `onclose`, enters `RECONNECTING` state with exponential backoff (1s, 1.5s, 2.25s...).
2. Re-establishes WebSocket connection to Cloudflare Workers.
3. On open, `usePartySocket` sends `PLAYER_JOIN` with preserved `playerId` from `localStorage`.
4. Server finds existing player in `this.state.players`, sets `player.connected = true`, and replies with `JOIN_ACK` and `SYNC_ROOM_STATE`.
5. **Where Reconnection Fails**:
   - In `MultiplayerContext.jsx`, the `SYNC_ROOM_STATE` handler sets players, current playlist, and current play index.
   - **It fails to update `currentScreen`**: The user remains stuck on whatever screen React was on, or resets to `homeScreen` if the page reloaded.
   - **It fails to restore active match state**: `isMatchActive` is not set to `true` on reconnection.
   - **It fails to restore round timer**: The local countdown timer is not synchronized with the remaining time on the server.
   - **It fails to restore chat messages**: Chat history is wiped on refresh.

### Scenario: Host disconnects:
1. When Host connection closes, `server.ts` lines 193–201 detects `player.isHost === true`.
2. Server selects the next connected player (`nextHost`), sets `nextHost.isHost = true`, and broadcasts `ROOM_STATE`.
3. If the original Host reconnects 5 seconds later, the server still has `hostId = nextHost.id`.
4. However, `App.jsx` still believes the original player is Host (stored in React state), causing conflicting host actions to be dispatched from both clients.

---

## 12. State Versioning Audit

### Current Status: **ZERO STATE VERSIONING**
- There is no `version`, `seq`, or `epoch` field in any server packet or client state object.
- All incoming state packets are applied unconditionally:
  ```javascript
  // MultiplayerContext.jsx L440
  case 'SYNC_ROOM_STATE':
    game.setPlayers(msg.players);
    game.setCurrentPlayIndex(syncIndex);
    game.setCurrentFrame(syncFrame);
  ```
- **Consequence**: If a packet for Round 1 is delayed in transit and arrives *after* Round 2 has already started, Round 1's data will overwrite Round 2 in client state.
- **Vulnerability**: Out-of-order delivery over erratic cellular connections causes state regression.

---

## 13. Duplicate Command / Race Condition Audit

### Current Status: **NO COMMAND IDENTIFIERS**
- Client commands do not include a `commandId` (UUID).
- The server does not maintain an LRU cache of recently processed command IDs.

### Concrete Failure Modes:
1. **Host Double-Click on Next Round**:
   - Host clicks button twice within 100ms.
   - Two `NEXT_ROUND` events are dispatched.
   - Server processes both sequentially: `currentPlayIndex` increments from 0 to 1, and then immediately from 1 to 2.
   - Round 2 is skipped completely without players seeing the frame.
2. **Duplicate Guess Penalty / Double Scoring**:
   - A player with poor connectivity taps "Submit" twice.
   - Two `SUBMIT_GUESS` messages arrive at the server.
   - If points were awarded per submission or if hint penalties apply, points are deducted twice.
3. **Simultaneous Correct Guesses**:
   - Player A and Player B submit the correct answer within 5ms of each other.
   - Cloudflare Durable Objects processes messages single-threaded in order of arrival. The first message processed triggers `ROUND_FINISH_EARLY` and awards 10 points. The second message arrives when `isRoundFinished === true`, so Player B gets 0 points and no acknowledgement, even though their inputs were virtually simultaneous.

---

## 14. Client State Audit

The application currently has severe state duplication across React contexts and window globals:

| State Variable | Located In | Should Be | Remediation |
| :--- | :--- | :--- | :--- |
| `currentPlayIndex` | `GameContext`, `testBridge (GS)`, `MultiplayerEngine` | Server-authoritative | Derive strictly from server `GameState.roundIndex`. Remove client-side mutation. |
| `currentPlaylist` | `GameContext`, `testBridge (GS)`, `MultiplayerEngine` | Server-authoritative | Server should store catalog IDs. Clients only receive the current active frame + prefetch hints. |
| `currentFrame` | `GameContext`, `testBridge (GS)` | Server-authoritative | Derive from server `GameState.currentFrame`. |
| `players` | `GameContext`, `testBridge (GS)`, `server.ts` | Server-authoritative | Server is sole ledger of players, scores, and host status. |
| `timeRemaining` | `GameContext`, `testBridge (GS)`, `server.ts` | Derived on client | Client computes: `Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))`. |
| `isMatchActive` | `GameContext`, `testBridge`, `server.ts` | Server-authoritative | Driven by `GameState.phase === 'PLAYING'`. |
| `isRoundFinished` | `GameContext`, `testBridge`, `server.ts` | Server-authoritative | Driven by `GameState.phase === 'ROUND_END'`. |
| `chatMessages` | `GameContext`, `testBridge`, `server.ts` | Server-authoritative | Server maintains authoritative log; synced on connect. |

---

## 15. BroadcastChannel Audit

### Usage in Repository:
1. `react-app/src/context/MultiplayerContext.jsx` (Lines 59–82, 126–130):
   ```javascript
   broadcastChannelRef.current = new BroadcastChannel('gtf_bc_' + topicHash);
   // On sendEvent:
   broadcastChannelRef.current.postMessage(msg);
   ```
2. `react-app/src/services/testBridge.js` (Lines 1243–1256, 1450–1453):
   ```javascript
   this.broadcastChannel = new BroadcastChannel('gtf_bc_' + NetworkSecurity.getTopicHash(this.roomCode));
   this.broadcastChannel.postMessage(msg);
   ```

### Findings & Recommendation:
- **Why it exists**: It was introduced as a test bridge helper so multi-page Playwright tests running on the same machine could pass without network dependencies.
- **Production Hazard**: In production, two tabs on the same browser communicate via `BroadcastChannel` with 0ms latency, while communicating with Cloudflare Workers with 50–150ms latency. Messages arrive out-of-order, triggering deduplication blocks and race conditions. Across real mobile devices, `BroadcastChannel` does nothing.
- **Recommendation**:
  - **Completely remove `BroadcastChannel` from production `MultiplayerContext.jsx`**.
  - All clients must route 100% of events through the Cloudflare Durable Object via `PartySocket`.
  - Retain `BroadcastChannel` inside `testBridge.js` strictly when a mock flag (`window.__E2E_MOCK_TRANSPORT__`) is present.

---

## 16. Security Audit

1. **Client Guess Spoofing**:
   Clients send `{ type: 'SUBMIT_GUESS', playerId: '...', guess: '...' }`. The server validates that `senderId` matches the connection, but does not sanitize string input beyond basic trimming.
2. **Plaintext Answer Leaks in Network Traffic**:
   Because the Host client sends the entire playlist in `START_GAME`, the answer to every single movie frame in the game is broadcast in cleartext JSON to all clients at the start of the match. Anyone opening the browser DevTools Network tab can read the answers for all 20 rounds before round 1 begins!
3. **Arbitrary Score Manipulation**:
   In `server.ts` line 551:
   ```typescript
   case 'ADJUST_SCORE': {
     const targetPlayerId = msg.playerId;
     const pts = Number(msg.points) || 0;
     target.score = Math.max(0, target.score + pts);
   }
   ```
   Any client connection can send `ADJUST_SCORE` with arbitrary points (`points: 99999`) and award themselves or any player unlimited score! The server does not check whether the sender is Host or authorized.
4. **Forged Host Settings**:
   Any connected client can send `UPDATE_HOST_SETTINGS` and modify game rules, category selections, or timer values without checking `sender.id === state.hostId`.

---

## 17. Identified Bugs and Risks Summary

1. **P0 - Split-Brain Guess Validation**: Host client and Cloudflare server both evaluate answers, resulting in double scoring, differing point values (10 vs 10/7/5), and conflicting round-end events.
2. **P0 - Plaintext Answer Leak**: Full playlist containing all answers is transmitted in client packets on game start.
3. **P0 - Missing Server Handler for `ROUND_START`**: Host emits `ROUND_START` on next round; server only accepts `NEXT_ROUND`, causing state divergence across independent devices.
4. **P0 - Dual Timer De-synchronization**: Independent client `setInterval` timers drift from the server and prematurely terminate rounds on throttled mobile devices.
5. **P1 - No Command Deduplication**: Rapid clicks on "Next Round" or "Start Match" trigger multiple round skips or score corruptions.
6. **P1 - Missing Reconnection State Restoration**: Reconnecting players are not returned to the active game screen and lose chat/timer context.
7. **P1 - Unauthenticated Admin Commands**: `ADJUST_SCORE`, `UPDATE_HOST_SETTINGS`, and `SKIP_ROUND` can be dispatched by any client.
8. **P2 - Echo Storm on Join**: Host client re-broadcasts `SYNC_ROOM_STATE` and `JOIN_ACK` whenever a guest joins, doubling WebSocket message consumption.
9. **P2 - `BroadcastChannel` Masking Network Failures**: Local testing with `BroadcastChannel` hides cross-device bugs that appear in live production.

---

## 18. Recommended Target Architecture

The recommended architecture establishes the **Cloudflare Durable Object as the single, indisputable authority for all game state**. Clients become pure display terminals that send user intents and render the authoritative state.

```text
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           AUTHORITATIVE CLOUDFLARE BACKEND                              │
│                                                                                         │
│   Cloudflare Worker (Entrypoint) ──► Durable Object (GameRoomServer)                   │
│                                       │                                                 │
│                                       ├── Authoritative SQLite Storage                  │
│                                       │   (Persists room, players, round, scores)       │
│                                       │                                                 │
│                                       ├── Authoritative Game Logic Engine               │
│                                       │   - Levenshtein Fuzzy Matcher                   │
│                                       │   - Frame Catalog & Server-Side Shuffling       │
│                                       │   - Absolute Epoch Timers (roundEndsAt)         │
│                                       │   - Rank-based Scoring (10/7/5 pts)             │
│                                       │   - Monotonic State Versioning (v1, v2, v3...)  │
│                                       │   - Idempotent Command Pipeline (commandId)     │
│                                       │                                                 │
│                                       └── WebSocket Broadcast Engine                    │
└───────────────────────────────────────────────────┬─────────────────────────────────────┘
                                                    │
                                   PartySocket (WSS / JSON)
                                                    │
         ┌──────────────────────────────────────────┼──────────────────────────────────────────┐
         │                                          │                                          │
         ▼                                          ▼                                          ▼
┌──────────────────┐                       ┌──────────────────┐                       ┌──────────────────┐
│   Host Device    │                       │  Player 1 Device │                       │  Player 2 Device │
│                  │                       │                  │                       │                  │
│  - React UI      │                       │  - React UI      │                       │  - React UI      │
│  - Sends intents │                       │  - Sends intents │                       │  - Sends intents │
│    (START, NEXT) │                       │    (GUESS, CHAT) │                       │    (GUESS, CHAT) │
│  - Renders state │                       │  - Renders state │                       │  - Renders state │
└──────────────────┘                       └──────────────────┘                       └──────────────────┘
```

---

## 19. Authoritative GameState Design

The canonical `GameState` object managed by the Durable Object and broadcast to all clients:

```typescript
export interface AuthoritativeGameState {
  /** Monotonically increasing version counter; increments on every mutation */
  version: number;

  /** 4-character uppercase room identifier */
  roomCode: string;

  /** Player ID of current room host */
  hostId: string;

  /** Current lifecycle phase of the room */
  phase: 'LOBBY' | 'STARTING' | 'ROUND_ACTIVE' | 'ROUND_REVEAL' | 'MATCH_OVER';

  /** Host-configurable game settings */
  settings: {
    timerDuration: number;     // e.g. 30 seconds
    rounds: number;            // e.g. 20 rounds
    categories: ('frames' | 'eyes' | 'dialogue')[];
  };

  /** Connected and disconnected players ledger */
  players: {
    id: string;
    name: string;
    avatar: string;
    color: string;
    score: number;
    isHost: boolean;
    connected: boolean;
    preloaded: boolean;
  }[];

  /** Round progress */
  round: {
    index: number;             // 0-based index
    total: number;             // Total rounds in match
    category: string;          // 'frames' | 'eyes' | 'dialogue'
    sectionName: string;       // e.g. "Guess the Frame"

    /** Active frame metadata sent to players (EXCLUDES plain-text answer during active phase!) */
    frame: {
      id: string;
      type: 'image' | 'dialogue';
      content: string;         // Image path or dialogue quote
      year?: string;
      // answer is OMITTED while phase === 'ROUND_ACTIVE'
      answer?: string;         // Included ONLY when phase === 'ROUND_REVEAL' or 'MATCH_OVER'
      revealContent?: string;  // Included ONLY when phase === 'ROUND_REVEAL'
    };

    /** Absolute server timestamps for precision timing */
    startedAt: number;         // Server timestamp (epoch ms)
    endsAt: number;            // Server timestamp (epoch ms)

    /** Masked clue string (e.g. "A _ _ E N _ _ _ Y") */
    maskedHint: string | null;

    /** Winners of the current round in order of completion */
    winners: {
      playerId: string;
      playerName: string;
      playerAvatar: string;
      position: 1 | 2 | 3;
      points: number;
      guessedAt: number;
    }[];
  } | null;

  /** Chat and guess activity feed (capped at 50) */
  chat: {
    id: string;
    senderId: string;
    senderName: string;
    senderAvatar: string;
    text: string;
    isGuess: boolean;
    timestamp: number;
  }[];

  /** ID of the last command processed by the server (for client ACK/idempotency) */
  lastCommandId: string | null;

  /** Server timestamp when this state packet was emitted */
  serverTime: number;
}
```

---

## 20. Client → Server Protocol

Every client mutation command must follow this strict contract:

```typescript
export interface ClientCommand<T = any> {
  /** Unique UUID generated by client for deduplication/idempotency */
  commandId: string;

  /** Action type */
  type:
    | 'JOIN_ROOM'
    | 'UPDATE_SETTINGS'
    | 'PLAYER_READY'
    | 'START_MATCH'
    | 'NEXT_ROUND'
    | 'SKIP_ROUND'
    | 'TOGGLE_PAUSE'
    | 'SUBMIT_GUESS'
    | 'REQUEST_HINT'
    | 'SEND_CHAT'
    | 'END_MATCH'
    | 'REMATCH'
    | 'RETURN_TO_LOBBY';

  /** Sender's persistent player ID */
  playerId: string;

  /** Current room code */
  roomCode: string;

  /** Client's current known state version */
  clientVersion: number;

  /** Payload specific to command */
  payload: T;
}
```

### Command Specifications:
1. `JOIN_ROOM`: `{ name: string, avatar: string, color: string }`
2. `UPDATE_SETTINGS`: `{ timerDuration: number, rounds: number, categories: string[] }` (Host only)
3. `START_MATCH`: `{}` (Host only; server creates authoritative playlist from internal catalog)
4. `NEXT_ROUND`: `{ currentRoundIndex: number }` (Host only; guards against double clicks)
5. `SKIP_ROUND`: `{}` (Host only; immediately ends current round)
6. `SUBMIT_GUESS`: `{ guess: string }` (Any player; server checks fuzzy match against hidden answer)
7. `REQUEST_HINT`: `{}` (Any player; costs 2 points, generates server-side masked hint)
8. `SEND_CHAT`: `{ text: string }` (Any player)
9. `REMATCH`: `{}` (Host only; resets scores, creates new shuffled playlist)
10. `RETURN_TO_LOBBY`: `{}` (Host only; sets phase to `'LOBBY'`)

---

## 21. Server → Client Protocol

The server communicates via a minimal, structured packet protocol:

```typescript
export type ServerMessage =
  | { type: 'STATE_UPDATE'; state: AuthoritativeGameState }
  | { type: 'ROUND_REVEAL'; answer: string; revealContent?: string; winners: any[]; state: AuthoritativeGameState }
  | { type: 'CHAT_EVENT'; message: AuthoritativeGameState['chat'][0] }
  | { type: 'COMMAND_REJECTED'; commandId: string; reason: string; currentVersion: number }
  | { type: 'PONG'; serverTime: number };
```

- **`STATE_UPDATE`**: Full state synchronization containing incremented `version`. Sent on join, round transition, phase changes, and score updates.
- **`COMMAND_REJECTED`**: Returned if a non-host attempts a host command, if a duplicate `commandId` is detected, or if a state version conflict occurs.

---

## 22. Frame Loading Strategy

1. **Server-Side Catalog Authority**:
   Move `DEFAULT_FRAMES`, `DEFAULT_EYES`, `DEFAULT_DIALOGUES`, and `DEFAULT_TIE_BREAKERS` into `partykit/src/catalog.ts` (shared or bundled with the Worker).
2. **Catalog ID References**:
   The server selects and shuffles frames using server-side Fisher-Yates shuffle. It transmits only the active frame for the current round, plus the `content` URL.
3. **Secret Answer Protection**:
   The server **never sends `frame.answer`** while `phase === 'ROUND_ACTIVE'`. The answer is revealed only when `phase === 'ROUND_REVEAL'`.
4. **Predictive Asset Prefetching**:
   The server includes a lightweight array of upcoming asset URLs in the state: `prefetchUrls: string[]` (the next 3 frame URLs, without answers or titles). Clients preload these in the background using `AssetPreloader.preloadImage(url)`.
5. **Decoupled Loading**:
   If a client takes 1 second to render an image, `AssetPreloader` renders a sleek neobrutalist skeleton placeholder while the image loads. Game state and timers remain strictly in sync.

---

## 23. Timer Synchronization Strategy

### Epoch Timestamp Architecture (Replacing `setInterval` decrements):
Instead of broadcasting 1-second ticks, the server computes:
```typescript
// On Round Start:
const durationMs = this.state.settings.timerDuration * 1000;
this.state.round.startedAt = Date.now();
this.state.round.endsAt = Date.now() + durationMs;

// Server schedules exact alarm / timeout:
this.ctx.storage.setAlarm(this.state.round.endsAt);
// Or standard setTimeout fallback
```

### Client Time Derivation:
Clients receive `startedAt` and `endsAt`. The client React component calculates:
```javascript
const calculateRemaining = () => {
  if (!round || phase !== 'ROUND_ACTIVE') return 0;
  const now = Date.now() + clockOffset; // clockOffset synced via PING/PONG
  const msLeft = Math.max(0, round.endsAt - now);
  return Math.ceil(msLeft / 1000);
};
```
- **Immune to Tab Backgrounding**: If a mobile user backgrounds the tab for 15 seconds, returning instantly recalculates `endsAt - Date.now()`, showing the exact accurate time without drift.
- **Zero Periodic Bandwidth**: No `TIMER_TICK` packets needed over WebSocket.

---

## 24. Reconnection Strategy

### Exact Reconnection Flow:
```text
1. Disconnect occurs (transport drops or user refreshes page)
      │
2. PartySocket reconnects automatically (exponential backoff)
      │
3. Socket opens ──► Sends 'JOIN_ROOM' with:
      - roomId: (from URL query ?room=XXXX or path)
      - playerId: localStorage.getItem('gtf_player_id')
      - lastVersion: knownVersion
      │
4. Server receives 'JOIN_ROOM':
      - Locates existing player with playerId in state.players
      - Marks player.connected = true
      - If player was host and still connected, preserves host
      - Replies with full AuthoritativeGameState
      │
5. Client receives AuthoritativeGameState:
      - Replaces entire local game state
      - Automatically sets currentScreen based on state.phase:
          * phase === 'LOBBY'        ──► 'playerLobbyScreen'
          * phase === 'ROUND_ACTIVE' ──► 'gameScreen'
          * phase === 'ROUND_REVEAL' ──► 'gameScreen'
          * phase === 'MATCH_OVER'   ──► 'winnerScreen'
      - Restores scores, player roster, active frame, and chat log
```

---

## 25. Failure Recovery Strategy

| Scenario | Expected Behavior | Failure Prevention Mechanism |
| :--- | :--- | :--- |
| **Host loses internet for 10s** | Room stays alive; Host reconnects and resumes control. | Durable Object holds state in memory/SQLite. Disconnected host has 30s grace period before host migration triggers. |
| **Player loses internet for 10s** | Reconnects and instantly catches up to current round. | Reconnecting receives current `AuthoritativeGameState`; UI immediately jumps to active round. |
| **Host double-clicks "Next Round"** | Round advances exactly once. | `NEXT_ROUND` command includes `currentRoundIndex: N`. Server rejects second command because round is now `N+1`. |
| **Two players guess simultaneously** | Deterministic 1st and 2nd place awarded. | Durable Object single-threaded execution queue processes guesses strictly in order of arrival. 1st gets 10 pts, 2nd gets 7 pts. |
| **Frame fails to load on client** | Client displays fallback placeholder; gameplay continues. | `AssetPreloader` timeout resolves on error; UI displays fallback badge and dialogue/movie year. |
| **Stale packet arrives out of order** | Client ignores packet. | Client compares `msg.state.version <= localState.version`. If stale, discards immediately. |

---

## 26. Automated Testing Strategy

To verify cross-device synchronization without reliance on `BroadcastChannel`, automated testing must employ **isolated Playwright browser contexts**:

```text
┌─────────────────────────────────────────────────────────────────┐
│              AUTOMATED 4-CLIENT PLAYWRIGHT HARNESS              │
└─────────────────────────────────────────────────────────────────┘
  Context 1 (Host): Desktop Chrome (1280x800)
  Context 2 (Player 1): Android Chromium Mobile (390x844)
  Context 3 (Player 2): Desktop Firefox / WebKit
  Context 4 (Player 3): Incognito / Secondary Desktop Context
```

### Test Suite Matrix:
1. **`tests/sync/lobby_sync.spec.js`**:
   - Host creates room.
   - Players 1, 2, 3 join via URL link.
   - Assert: All 4 contexts show identical roster of 4 players within 500ms.
2. **`tests/sync/game_start_sync.spec.js`**:
   - Host clicks Start Match.
   - Assert: All 4 contexts transition to `gameScreen` simultaneously; all display the exact same frame image and round index.
3. **`tests/sync/simultaneous_guesses.spec.js`**:
   - Player 1 and Player 2 submit correct answers within 10ms of each other.
   - Assert: Player 1 awarded 10 points; Player 2 awarded 7 points; scores verified across all 4 screens.
4. **`tests/sync/midgame_reconnect.spec.js`**:
   - Player 2 triggers `page.reload()` during round 3.
   - Assert: Player 2 automatically returns to `gameScreen` at round 3 with synchronized timer and scores.
5. **`tests/sync/host_migration.spec.js`**:
   - Host context closes browser.
   - Assert: Player 1 is designated host on all remaining devices; Player 1 successfully clicks "Next Round".

---

## 27. Files That Need Modification

| File Path | Component / Service | Responsibility | Required Changes |
| :--- | :--- | :--- | :--- |
| `partykit/src/server.ts` | `GameRoomServer` | Authoritative Backend | Integrate frame catalog; implement fuzzy matching; calculate ranked scores (10/7/5); replace timer interval with epoch timestamps; add state versioning and command idempotency; hide answers during active rounds. |
| `partykit/src/catalog.ts` | Game Catalog | Server Assets | New file containing static metadata for all frames, eyes, and dialogues. |
| `react-app/src/context/MultiplayerContext.jsx` | `MultiplayerProvider` | Client Transport | Remove `BroadcastChannel`; strip local guess validation; accept server `AuthoritativeGameState` as single source of truth; route all client commands with `commandId`. |
| `react-app/src/context/GameContext.jsx` | `GameProvider` | Client State | Remove local `setInterval` countdown timer; derive timer and round phase strictly from server state; support screen restoration on reconnect. |
| `react-app/src/App.jsx` | App Root | UI Routing | Wire `onPlayAgain`, `onRematch`, `onReturnToLobby` to `multiplayer.sendEvent`; remove local playlist generation on start match. |
| `react-app/src/pages/GameScreen.jsx` | Game UI | In-Game View | Remove host client-side guess bypass (line 145); always send guesses through server; display server-derived timer. |
| `react-app/src/services/securityUtil.js` | `NetworkSecurity` | Client Security | Remove client-side host command drop rules that block server broadcasts lacking `senderId`. |
| `react-app/src/services/testBridge.js` | Test Bridge | E2E Testing | Align window globals with server-authoritative state; remove legacy heartbeat loops that conflict with server. |

---

## 28. Files That Can Be Removed

| File Path | Reason for Removal |
| :--- | :--- |
| `react-app/src/services/socket.js` | Dead code. Unused client WebSocket implementation pointing to old non-existent `WS_BASE_URL`. |

---

## 29. Implementation Plan

### Phase 1: Server-Side Authoritative Core (`partykit/`)
1. Create `partykit/src/catalog.ts` containing the frame catalog.
2. Implement Levenshtein `FuzzyMatcher` inside `partykit/src/fuzzyMatcher.ts`.
3. Refactor `GameRoomServer` in `partykit/src/server.ts`:
   - Implement `AuthoritativeGameState` schema with `version` and `roundEndsAt`.
   - Implement server-side playlist shuffling on `START_MATCH`.
   - Strip answers from active frame broadcasts.
   - Implement ranked scoring (1st=10, 2nd=7, 3rd=5).
   - Implement idempotent command processing with `commandId`.
4. Deploy updated Worker to Cloudflare (`npm --prefix partykit run deploy`).

### Phase 2: Client Transport & State Streamlining (`react-app/`)
1. Delete unused `react-app/src/services/socket.js`.
2. Clean `MultiplayerContext.jsx`:
   - Remove `BroadcastChannel` instantiation.
   - Remove duplicate guess validation and scoring logic.
   - Route incoming `STATE_UPDATE` directly into React state.
3. Clean `GameContext.jsx`:
   - Remove local countdown timer interval.
   - Derive screen transitions from server phase (`LOBBY`, `ROUND_ACTIVE`, `MATCH_OVER`).
4. Update `App.jsx` and `GameScreen.jsx`:
   - Host actions dispatch server commands (`START_MATCH`, `NEXT_ROUND`, `REMATCH`).
   - Host guesses follow the exact same path as player guesses.

### Phase 3: Comprehensive Multi-Device E2E Testing
1. Implement 4-context Playwright test suite in `tests/sync/`.
2. Validate lobby joining, game transitions, rapid-fire guesses, mobile app-switching, and mid-game reloads across isolated browser instances.
3. Deploy frontend to Vercel production (`npx vercel --prod --yes`).

---

## 30. Final Acceptance Criteria

- [ ] **Single Source of Truth**: 100% of game state (players, scores, playlist, current frame, timer, phase) is owned and stored by the Cloudflare Durable Object.
- [ ] **Answer Security**: No plaintext answers exist in client memory or network packets prior to `ROUND_REVEAL`.
- [ ] **Zero Timer Drift**: Timers are synchronized using server epoch timestamps (`endsAt`); backgrounding a mobile device results in zero second drift upon returning.
- [ ] **Deterministic Scoring**: All guesses are evaluated on Cloudflare using server-side fuzzy matching; identical point values are awarded regardless of which player hosts.
- [ ] **Idempotent Commands**: Double-clicking "Next Round" or "Start Match" causes zero duplicate round skips.
- [ ] **Seamless Reconnection**: Reloading the page or recovering from a 10s network drop immediately restores the active game screen, round, scores, and chat.
- [ ] **Isolated Transport**: `BroadcastChannel` is removed from production multiplayer; all devices communicate strictly through Cloudflare Workers.
- [ ] **Verified Cross-Device**: Automated tests pass with 4 concurrent, independent browser contexts (Desktop Host, Android Guest, Desktop Guest 1, Desktop Guest 2).
