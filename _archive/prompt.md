# Master Specification & Prompt: "ScoopCast / Guess The Frame" Multiplayer Party Game

You are tasked with building an exact, production-ready clone and replica of the **"Guess The Frame" (ScoopCast)** interactive web application as a self-contained, single-file HTML/CSS/JS application (`index.html`).

---

## 1. High-Level Architecture & Tech Stack

- **Format**: Single self-contained file (`index.html`) with embedded styles and JavaScript (no bundler/build step required).
- **Libraries / CDNs**:
  - Tailwind CSS (`https://cdn.tailwindcss.com`) with custom color extensions.
  - Google Fonts: `Anybody` (800, 900), `DM Sans` (400, 500, 700, 800, 900), `Space Grotesk`, `JetBrains Mono`, and `Space Mono`.
  - QRCode.js (`https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js`) for dynamic room QR codes.
  - Canvas Confetti (`https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js`) for victory celebrations.
- **Networking**: Native WebSockets (`WebSocket` API) connecting to a public WebSocket broker (e.g. `wss://socketsbay.com/wss/v2/1/demo/` or `wss://broker.hivemq.com:8884/mqtt` / custom broker) with automatic reconnection and fallback.
- **Persistence**: `localStorage` session caching for seamless match reconnection upon accidental leave or page refresh.
- **Audio**: Web Audio API synthesizer (`AudioContext` / `webkitAudioContext`) generating crisp retro sound effects (buzzer, success chime, countdown tick, fanfare) with zero external asset dependencies.

---

## 2. Neo-Brutalist Design System & Visual Tokens

The interface follows a bold, playful, esports-grade **Neo-Brutalist** aesthetic:

### Color Palette:
- **Canvas / Background**: `#FFFDF5` (Warm Cream) with subtle dot grid or floating geometric shapes.
- **Ink / Borders**: `#1a1a1a` (Hard Jet Black, 2.5px to 4px solid borders).
- **Hard Drop Shadows**: Solid `box-shadow: 4px 4px 0 #1a1a1a` to `6px 6px 0 #1a1a1a` (no blur, 0px radius).
- **Accent Yellow (Primary)**: `#FACC15` (Buttons, headers, highlights).
- **Accent Pink**: `#FF6B9D` (Guess button, hero badges).
- **Accent Blue**: `#3B82F6` (Send button, Frame badges).
- **Accent Green / Lime**: `#84CC16` (Active status dots, Eyes mode badge).
- **Accent Cyan**: `#cae6ff` (Frame mode badge).
- **Cinema Black**: `#0a0b10` / `#0c0d12` (Cinematic movie frame stage).

### Character Avatars & Color-Matched Badges:
Each character has a dedicated SVG illustration and matching background badge color:
1. **Aman**: Pink (`#FF6B9D`)
2. **Amish**: Blue (`#3B82F6`)
3. **Aziz**: Lime Green (`#84CC16`)
4. **Vish**: Yellow (`#FACC15`)

When rendering player badges or leaderboard pills, the pill background must match their exact avatar color with a solid 2.5px black border and black bold text.

---

## 3. Screen States & DOM Architecture

The application contains the following distinct screens toggled via `.screen.active` (`display: flex`):

### 1. Home Screen (`#homeScreen`)
- **Hero Header**: `ScoopCast` logo, subtitle, audio toggle button.
- **Action Cards**:
  - **Create Room Card**: Neo-Brutalist card with host icon, title "Host a Match", and "Create Room" primary button.
  - **Join Room Card**: Card with invite icon, "Join with Code", room code input, and "Join Match" button.
  - **Rules / Instructions Card**: Expandable accordion detailing scoring (+10 for 1st, +7 for 2nd, +5 for 3rd), round categories, and judge rules.

### 2. Modals
- **Create Room Modal (`#createRoomModal`)**:
  - Generates a 4-character alphanumeric Room Code (e.g. `R47B`).
  - Avatar selection grid (Aman, Amish, Aziz, Vish) with interactive selection border.
  - "Start Lobby" submit button.
- **Join Room Modal (`#joinRoomModal`)**:
  - Room code input field (auto-capitalized).
  - Avatar selection grid.
  - "Enter Lobby" submit button.
- **QR Code Modal (`#qrModal`)**:
  - Displays generated QR code pointing to `https://<domain>/?room=<code>`.
  - Room code copy pill + "Copy Link" button.
- **Accidental Leave Rejoin Modal (`#rejoinRoomModal`)**:
  - Automatically triggers if `localStorage.getItem('gtf_active_session')` contains an active match for the current room code in URL parameters (`?room=XXXX`).
  - Displays character avatar, player name, room code, and "Rejoin Match" / "Start New Game" buttons.

### 3. Player Lobby Screen (`#playerLobbyScreen`)
- **Header Bar**: Room code badge with click-to-copy tooltip + "Show QR Code" button.
- **Category Mode Selector**:
  - Interactive clickable badges: **Frames** (Cyan `#cae6ff`), **Eyes** (Green `#2ecc71`), **Dialogue** (Yellow `#f1c40f`).
  - Clicking any badge toggles its active state, changes card opacity/colors, and updates the total calculated rounds in real-time.
  - Real-time multiplayer synchronization of settings from host to all guests (`UPDATE_HOST_SETTINGS`).
- **Round Configuration**: Slider / selector to set total rounds (6 to 30) and round timer (15s to 60s).
- **Connected Players Grid**: Real-time player cards displaying the SVG avatar, color-matched name badge pill, and host crown indicator.
- **Action Footer**: "Start Match 🚀" button (disabled if < 1 player or not host).

### 4. Game Screen (`#gameScreen`) — 2-Column Neo-Brutalist Layout
The game screen uses a high-performance 2-column grid/flex layout:
- **Left Stage Column (~75% Width)**:
  - **Top Game Header**:
    - Left: Clickable `ScoopCast` logo (returns home with confirmation).
    - Center: **Host Controls Pill** (`👑 HOST CONTROLS: ⏭ Skip Frame | ⏸ Pause | 🏁 End Match`) — only visible to the host.
    - Right: Category badge (e.g., `GUESS THE FRAME`), Round counter badge (e.g., `ROUND 1 / 10`), and Judge indicator badge (`3 LEFT`).
  - **Cinematic Hero Stage (`.frame-area`)**:
    - Pure dark background (`#0a0b10`), 3.5px black border, 6px drop-shadow.
    - Status pill in top-left (`IDLE` / `ACTIVE` / `JUDGING` / `REVEAL`).
    - Media Container supporting:
      - High-resolution movie stills with aspect-ratio containment.
      - Actor eye crops (zoomed panoramic slice).
      - Dialogue quotes with stylized quotation marks and movie hint tag.
    - **Answer Overlay (`#answerOverlay`)**: Animated card revealing movie title, release year, and context upon round completion.
    - **Scoring Overlay (`#scoringOv`)**: Interactive judge grid to manually award points to players if played in judge mode.
- **Right Sidebar Column (~25% Width)**:
  - **Card 1: Round Controls**: Circular SVG countdown timer with stroke animation and remaining seconds counter.
  - **Card 2: Leaderboard**: Live player standings with real-time score updates, manual `+` / `-` adjustments, and `Skip` / `Super Skip` buttons.
  - **Card 3: Live Chat & Guess Stream Panel (`#liveChatPanel`)**:
    - Yellow header (`💬 LIVE CHAT & GUESSES`).
    - Real-time chat feed displaying player guesses, correct guess celebrations, system round announcements, and chat messages.
    - Chat & Guess Input Form with text box and blue `Send` button.

### 5. Winner Screen (`#winnerScreen`)
- **Victory Podium**: 1st, 2nd, and 3rd place champion cards with character avatar illustrations, trophy badges, and total scores.
- **Celebration Effects**: Automatic multi-stage canvas confetti cannons and victory fanfare audio.
- **Actions**: "Play Again 🔄" button (resets match to lobby) and "Return to Home 🏠" button.

---

## 4. Multiplayer Protocol & Real-Time Sync

Implement the following JSON-RPC WebSocket messaging protocol:

| Event Type | Direction | Payload Description |
|---|---|---|
| `PLAYER_JOINED` | Guest → Host / Room | `{ playerId, playerName, playerAvatar, roomCode }` |
| `UPDATE_HOST_SETTINGS` | Host → Room | `{ hostSettings: { categories, roundsByMode, rounds, timer } }` |
| `GAME_START_COUNTDOWN` | Host → Room | `{ playlist, timerDuration, totalRounds }` |
| `ROUND_START` | Host → Room | `{ roundIndex, currentFrame, remainingSeconds }` |
| `SUBMIT_GUESS` | Guest → Room | `{ playerId, text, timestamp }` |
| `ROUND_WINNER` | Host/Client → Room | `{ playerId, playerName, points, position, answer }` |
| `ROUND_END` | Host → Room | `{ roundIndex, answer, scores }` |
| `REQUEST_REJOIN_SYNC` | Rejoining Guest → Host | `{ playerId, roomCode }` |
| `REJOIN_SYNC_STATE` | Host → Rejoining Guest | `{ playlist, currentPlayIndex, phase, remainingSeconds, players, hostSettings }` |
| `HOST_SKIP` | Host → Room | `{ roundIndex }` |
| `HOST_PAUSE` | Host → Room | `{ isPaused, remainingSeconds }` |
| `HOST_END_GAME` | Host → Room | `{ finalScores }` |

### Fuzzy Guess Matcher:
Implement `FuzzyMatcher.isMatch(guess, targetAnswer)`:
- Strips punctuation, articles ("the", "a", "an"), casing, and excessive whitespace.
- Calculates Levenshtein edit distance and threshold (allows 1 typo for words > 4 chars, 2 typos for words > 8 chars).
- Instantly awards points upon match (+10 for 1st player, +7 for 2nd player, +5 for 3rd player).

---

## 5. Accidental Leave & Reconnection Protocol

1. **State Persistence**:
   - On room create or join, persist `{ roomCode, playerId, playerName, playerAvatar, isHost, timestamp }` in `localStorage['gtf_active_session']`.
2. **Detection**:
   - When a user lands on the page (or clicks an invite link `?room=XXXX`), check if a stored session matches `room=XXXX`.
   - If active, pop up `#rejoinRoomModal`.
3. **Synchronization**:
   - On confirmation, connect WebSocket, broadcast `REQUEST_REJOIN_SYNC`, and transition to `#gameScreen`.
   - Host responds with `REJOIN_SYNC_STATE`.
   - Guest calculates `remainingSeconds = timerDuration - ((Date.now() - roundStartTime) / 1000)` and syncs `TC.start(remainingSeconds)`.

---

## 6. Audio Synthesis Engine (`SoundManager`)

Synthesize all sounds with the Web Audio API:
- **Click**: Short 800Hz sine wave pop (40ms).
- **Correct Guess / Success**: 3-note ascending arpeggio (C5 → E5 → G5) with triangle waves and decay.
- **Buzzer / Wrong**: Low frequency saw-tooth pulse (120Hz, 150ms).
- **Tick**: High-frequency click (1200Hz, 15ms) for timer countdown.
- **Victory Fanfare**: Multi-harmonic fanfare chord sequence with celebratory vibrato.
- **Mute / Unmute State**: Stored in `localStorage['gtf_sound_enabled']` with global toggle button in bottom corner.

---

## 7. Sample Data Structure (`FRAMES_DATA`)

Embed comprehensive sample dataset arrays:
- **Frames**: Iconic film frames (e.g. *Inception*, *Interstellar*, *The Dark Knight*, *Pulp Fiction*, *Spirited Away*, *The Matrix*, *Parasite*).
- **Eyes**: Cropped actor eye images (e.g. Cillian Murphy, Margot Robbie, Robert Downey Jr., Shah Rukh Khan, Emma Stone).
- **Dialogue**: Iconic movie quotes in Hindi and English (e.g. `"May the Force be with you"`, `"Why so serious?"`, `"Mogambo khush hua"`).

---

## 8. Mobile Responsiveness Directives

- At `@media (max-width: 900px)`:
  - Game screen converts into a single-column layout.
  - Cinematic movie frame retains responsive height (`38vh`).
  - Right sidebar cards stack vertically below the hero stage.
  - Live chat transforms into a smooth bottom drawer toggled by a floating pill button (`💬 Live Chat`) in the bottom-right corner.
  - Touch-friendly tap targets (minimum 44px height).

---

## Deliverable
Generate the complete, robust, bug-free `index.html` file adhering 100% to this specification with all JavaScript functions, CSS rules, SVG definitions, and event handlers fully implemented.
