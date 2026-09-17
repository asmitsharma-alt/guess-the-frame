# ScoopCast Audio System Audit

**Date**: September 16, 2026  
**Auditor**: Senior Frontend Audio & Web Game Production Engineer  
**Target Codebase**: ScoopCast – Guess the Frame (`react-app`)  
**Scope**: Complete audit of existing audio architecture, Web Audio synthesis, lifecycle integrations, mobile autoplay compliance, and identified bugs.

---

## 1. Current Audio Architecture

ScoopCast currently implements a singleton procedural audio synthesizer located at `react-app/src/services/soundManager.js`.

- **Engine Core**: Native Web Audio API (`window.AudioContext` or `window.webkitAudioContext`).
- **Synthesis Model**: 100% Procedural synthesis on the fly. No static audio media files (.mp3, .wav, .ogg) are loaded from disk or CDN for sound effects.
- **Signal Chain**:
  ```
  [Oscillators / BufferSource] 
             │
             ▼
        [GainNode] (Per-voice envelope)
             │
             ▼
       [Master Gain] (Master volume & mute control)
             │
             ▼
  [DynamicsCompressorNode] (Limiter: -6dB threshold, 12:1 ratio)
             │
             ▼
   [AudioContext.destination] (Speakers / Headphones)
  ```
- **Consumer Layer**:
  - `GameContext.jsx`: Timer countdown tick loop, `showScreen` navigation clicks, modal open/close clicks, mute toggling.
  - `MultiplayerContext.jsx`: WebSocket message event reactions (`PLAYER_JOINED`, `MATCH_START`, `ROUND_START`, `HINT_BROADCAST`, `CORRECT_ANSWER_BROADCAST`, `ROUND_REVEAL`, `CHAT_MESSAGE`, `GAME_OVER`).
  - `GameScreen.jsx`: Host control buttons, scoring overlay player selection, skip round, hint triggers.
  - `WinnerScreen.jsx`: Mount lifecycle effect, confetti popper clicks.
  - `Modals`: JoinRoomModal, CreateRoomModal, AdminModal volume configuration.
  - `testBridge.js`: Playwright E2E automation global bridge (`window.SoundManager`).

---

## 2. Audio Files / Assets

- **Static Audio Files**: None in `react-app/public` (0 audio assets).
- **Procedural Sound Generators**:
  1. `tone({ f, d, type, v, a, dec, sus, rel })`: Configurable ADSR synthesizer (sine, triangle, square, sawtooth).
  2. `_noise(name, { vol, hp, dur })`: Procedural white noise buffer passed through a highpass `BiquadFilterNode`.
  3. `_glide(name, from, to, dur, vol, type)`: Pitch gliding oscillator using `exponentialRampToValueAtTime`.
  4. `_thock(name, f, vol, dur)`: Pitch drop transient simulator for physical button/game feel.
  5. `_tap(name, f, vol, hp)`: Composite transient blending filtered noise and pitch thock.

---

## 3. Audio Loading Strategy

- `SoundManager.init()` is lazily invoked:
  - Invoked upon the first sound playback call via `_ensure()`.
  - Invoked when unmuting via `toggleMute()`.
- **Deficiency**: There is **no early initialization or unlock mechanism** attached to user gesture events (`pointerdown`, `touchstart`, `keydown`). If the first audio event is triggered by a WebSocket broadcast (such as `MATCH_START` or `PLAYER_JOINED`), the `AudioContext` is created in a `suspended` state and fails to play.

---

## 4. Audio Playback Strategy

- Playback is triggered directly via imperative function calls (e.g., `SoundManager.playClick()`, `SoundManager.playRoundStart()`, `SoundManager.play('reveal')`).
- There is **no queue, no voice allocation cap, and no deduplication layer**.
- Simultaneous network messages or re-renders trigger overlapping instances of identical sounds, resulting in audio distortion, loudness spikes, and unpleasant phase cancellation.

---

## 5. Background Music (BGM)

- Currently, there is **no background music manager** in `soundManager.js`.
- There are no functions for `playMusic()`, `stopMusic()`, or `setMusicVolume()`.
- When screens transition or rounds restart, there is no BGM state tracking.
- **Requirement**: Provide a clean, low-latency, procedural ambient BGM loop generator with strict single-instance management, screen-aware playback, and independent music volume control.

---

## 6. Sound Effects (SFX)

Existing methods in `soundManager.js`:
- `playClick()`: Throttled UI click (45ms debounce window).
- `playTap()`: Soft UI interaction.
- `playPop()`: Filtered bubble pop sound.
- `playWhoosh()`: Downward noise sweep for screen transitions.
- `playCountBeep(n)`: Numeric countdown beeps (1, 2, 3 and final triple beep).
- `playGameStart()`: 4-tone rising fanfare arpeggio (160, 220, 294, 392 Hz).
- `playSectionIntro()`: 3-tone chime sequence.
- `playRoundStart()`: Sharp tap followed by a resonant thock.
- `playFrameIn()`: Upward frequency glide (220 -> 440 Hz).
- `playReveal()`: Heavy thock followed by a dual minor-third resolution chord (330 + 440 Hz).
- `playScoring()`: Two-beat point tally chime.
- `playSelPlayer()`: 3-step ascending player select chime (also used as `'correct'`).
- `playSkip()`: Descending double-buzz thock (also used as `'wrong'` and `'skip'`).
- `playTransition()`: Mid-tone transition tap.
- `playWinner()` / `playFanfare()`: 5-tone victory fanfare arpeggio.
- `playTick()`: Subdued 320 Hz timer tick.
- `playTickWarn()`: Urgent 440 Hz timer tick for low time warnings.

---

## 7. Game Event → Sound Mapping

| Game Event | Source | Current Sound Call | Intended UX | Issues Identified |
|---|---|---|---|---|
| `PLAYER_JOINED` | WebSocket | `SoundManager.playPop()` | Pleasant entrance chime | Fires on initial sync; duplicates if player list re-sent |
| `MATCH_START` | WebSocket | `showScreen('gameScreen')` (`playClick`) + `playRoundStart()` | Rising fanfare / round start | Overlaps click and round start simultaneously |
| `ROUND_START` | WebSocket | `showScreen('gameScreen')` (`playClick`) + `playRoundStart()` | Crisp round launch cue | Overlaps click and round start; replays on state resync |
| `HINT_BROADCAST` | WebSocket | `SoundManager.play('flare')` | Subtle flare/whoosh cue | **CRITICAL BUG**: `playFlare` is undefined; silent failure |
| `SUBMIT_GUESS` (wrong) | User Action | None | Distinct negative feedback | Silent on wrong guess; missing immediate feedback |
| `CORRECT_ANSWER` | WebSocket | `SoundManager.play('correct')` | Reward chime for local player; distinct cue for other | Does not distinguish local vs remote winner; stacks 3x |
| `ROUND_REVEAL` | WebSocket | `SoundManager.playReveal()` | Cinematic reveal chord | Collides with 3rd winner chime; plays on skip as well |
| `HOST_SKIP` | User / WS | `playSkip()` (client) + `playReveal()` (WS) | Skip buzz followed by reveal | Two conflicting sounds trigger in rapid succession |
| `CHAT_MESSAGE` | WebSocket | `SoundManager.playPop()` | Gentle chatter ping | Fires on own messages, guesses, and spoilers |
| `TIMER_TICK` | Local Interval | `playTick()` / `playTickWarn()` | Authoritative countdown warnings | Ticks every single second + replays on every re-render |
| `GAME_OVER` | WebSocket | `playWinner()` (WS) + `playClick()` (`showScreen`) + `playWinner()` (`WinnerScreen.useEffect`) + `play('correct')` (poppers) | Grand match finale fanfare | **Quadruple sound stacking** causing severe loudness |
| `MUTE_TOGGLE` | User Action | `toggleMute()` | Immediate silence / acoustic feedback | Works, but gains can glitch if ramped during active nodes |

---

## 8. React Lifecycle Problems

1. **`showScreen` Side Effect**: In `GameContext.jsx:118`, `showScreen` unconditionally executes `SoundManager.playClick()`. Any programmatic screen change (from WebSocket `ROUND_START`, `MATCH_START`, `RETURN_TO_LOBBY`, `GAME_OVER`) plays a UI click on top of the actual game event sound.
2. **`WinnerScreen` Double Execution**: `WinnerScreen.jsx:22` calls `SoundManager.playWinner()` inside `useEffect([isActive])`. Since `MultiplayerContext.jsx:626` already calls `SoundManager.playWinner()` when `GAME_OVER` is received, two separate victory fanfares play overlapping each other.
3. **Timer Effect Instability**: In `GameContext.jsx:162-205`, the countdown effect lists `[isMatchActive, isPaused, isRoundFinished, currentScreen, roundEndsAt, clockOffset]` as dependencies. Every time `clockOffset` or state changes, the effect tears down and re-executes `calculateTimeRemaining()`, immediately firing an extra tick sound out of rhythm.

---

## 9. Duplicate Playback Risks

1. **No Event Deduplication Key**: Sounds lack unique identifiers (e.g. `round:3:start` or `msg:abc1234`).
2. **WebSocket Retransmissions & Reconnects**: When a player reconnects, the server sends the current game state (`ROUND_START` or `MATCH_START`). The client treats this as a new event and replays the round start sound.
3. **Multi-winner Cascades**: If three players solve a frame within 500ms, three separate `CORRECT_ANSWER_BROADCAST` messages arrive, playing `playSelPlayer()` three times in rapid, overlapping bursts.

---

## 10. Mobile Browser Restrictions

- **Autoplay Security**: Chrome Android and Safari iOS block audio playback until a direct user gesture (click, tap, keypress).
- **Context Suspension**: If `AudioContext` is created before user interaction, it remains in the `'suspended'` state. Attempting to play audio yields a rejected promise or warning.
- **Audio Routing**: Backgrounding the browser or locking the screen does not suspend the audio loop, causing timer ticks or synth nodes to accumulate or misfire in the background.

---

## 11. Autoplay Problems

- Currently, `SoundManager` has no global gesture listeners registered on `window` or `document`.
- If a player joins a lobby via a direct URL (`?room=CODE`) and doesn't click any button, when the host starts the match, `AudioContext.state === 'suspended'`. The round start sound fails silently.
- When the user finally taps an input or button later, all deferred sounds or an un-resumed context can suddenly burst.

---

## 12. AudioContext State

- `SoundManager.ctx.state` can be `'suspended'`, `'running'`, or `'closed'`.
- `SoundManager._ensure()` attempts:
  ```javascript
  if (this.ctx && this.ctx.state === 'suspended') {
    this.ctx.resume();
  }
  ```
  `ctx.resume()` returns a Promise that is neither awaited nor caught, risking unhandled promise rejections on strict browsers.
- No handling for `ctx.onstatechange`.

---

## 13. Volume / Mute Management

- `SoundManager` stores `vol` (0.0 to 1.0) and `muted` (boolean) in `localStorage` under `gtf_sound_vol` and `gtf_sound_muted`.
- `GameContext` duplicates `isMuted` in React state.
- `AdminModal` directly manipulates `SoundManager.setVolume()`.
- **Flaws**:
  - No separation between SFX volume and Music volume.
  - No master volume multiplier formula: `effectiveSfx = muted ? 0 : masterVol * sfxVol`.
  - Calling `masterGain.gain.setValueAtTime` directly can produce audible pop/click artifacts if transitioned during active playback without a micro-ramp.

---

## 14. Cleanup / Memory Leaks

- Multi-note fanfares and chimes (`playWinner`, `playReveal`, `playGameStart`, `playCountBeep`, `playScoring`) schedule notes using `setTimeout(() => ..., delay)`.
- **None of these timeouts are tracked or stored in an array/set**.
- If a round ends, a player navigates to the lobby, or the user clicks "Mute" while a fanfare is playing, the scheduled `setTimeout` callbacks still fire, creating new `OscillatorNode` and `GainNode` instances in the background!
- There is no `stopAll()` or `cancelPendingVoices()` method.

---

## 15. Reconnect / Refresh Behavior

- On page refresh or network reconnection:
  - Client restores session and syncs state from server.
  - Client re-enters `gameScreen`.
  - Currently, `showScreen('gameScreen')` fires click audio, and if a round state is processed, it replays round audio even if 20 seconds have already elapsed in the round.
  - Historical chat messages replay `playPop()`.

---

## 16. Round Transition Problems

- When advancing from Round N to Round N+1:
  - Round N reveal sounds may still be playing when Round N+1 begins.
  - Timer tick sounds from Round N do not cleanly stop before Round N+1 starts.
  - Host action triggers local `playClick()`, followed immediately by remote `playRoundStart()`.

---

## 17. Identified Bugs

| Bug ID | Severity | Description | Root Cause |
|---|---|---|---|
| **BUG-01** | High | `SoundManager.play('flare')` fails silently on hints | `playFlare()` method was never implemented in `soundManager.js`. |
| **BUG-02** | High | Duplicate sound on screen transitions (`MATCH_START`, `ROUND_START`, `GAME_OVER`) | `game.showScreen()` hardcodes `SoundManager.playClick()` regardless of programmatic vs user action. |
| **BUG-03** | High | Duplicate winner fanfare on `GAME_OVER` | Both `MultiplayerContext.jsx:626` and `WinnerScreen.jsx:22` trigger `playWinner()`. |
| **BUG-04** | Medium | Annoying chat pop spam during guessing | `CHAT_MESSAGE` handler plays `playPop()` for self-messages, guesses, and spoiler events. |
| **BUG-05** | High | Audio blocked on mobile when host starts game | Missing global user-gesture unlock listener (`pointerdown`, `touchstart`, `keydown`). |
| **BUG-06** | Medium | Unrhythmic timer ticks & double-ticks | Timer effect re-executes immediately on state changes and plays ticks every 1000ms indiscriminately. |
| **BUG-07** | Medium | Orphaned oscillator voice leaks across rounds | Unmanaged `setTimeout` calls in `playWinner`, `playReveal`, `playGameStart` cannot be cancelled. |
| **BUG-08** | Medium | Audible pops/clicks on mute and volume changes | Gain values set instantly via `setValueAtTime` without exponential or linear micro-smoothing. |
| **BUG-09** | Low | No distinct audio feedback for incorrect guesses | Submitting an incorrect guess provides no acoustic response. |
| **BUG-10** | Medium | Mobile background battery drain & tab resume stutter | No `visibilitychange` listener to suspend/resume `AudioContext`. |
| **BUG-11** | Low | Lack of structured BGM support | No background music controller exists to play, stop, and duck music during gameplay. |

---

## 18. Recommended Audio Architecture

Refactor the audio subsystem into a robust, centralized, and hardened audio engine:
`react-app/src/services/audio/`

```
react-app/src/services/audio/
├── AudioManager.js      # Central orchestrator: unlock, state, volume, deduplication, cleanup
├── AudioSynth.js        # Procedural Web Audio synthesizer (oscillator pools, noise, envelopes)
├── MusicManager.js      # Dedicated background music synthesizer & lifecycle manager
└── AudioTypes.js        # Sound events, priorities, and configuration types
```

### Key Architectural Principles:
1. **Single-Instance Controlled AudioContext**:
   - Single shared `AudioContext` across the entire application lifecycle.
   - Proactive, idempotent user gesture unlock listener attached to `window` (`pointerdown`, `touchstart`, `keydown`).
   - Graceful Promise handling for `resume()` and `suspend()`.
   - `visibilitychange` support to suspend audio when the tab is hidden and resume when visible.
2. **Deterministic Event Deduplication (`playOnce`)**:
   - Every state-derived sound uses a canonical deduplication key (e.g., `round:${roundIndex}:start`, `reveal:${roundIndex}`, `winner:${matchId}`).
   - An event cannot replay within the same round or match baseline.
3. **Sound Priorities & Playback Policies**:
   - **Policies**: `replace` (stops existing), `restart` (re-triggers), `throttle` (debounce window), `allow-overlap`.
   - **Priorities**: `GAME_OVER` (100) > `ROUND_REVEAL` (80) > `CORRECT_ANSWER` (70) > `ROUND_START` (60) > `TIMER_WARNING` (40) > `CHAT_NOTIFICATION` (20) > `UI_CLICK` (10).
4. **Active Voice & Timeout Cancellation**:
   - All scheduled timeouts tracked in a `Set`.
   - `stopAll()` cancels all pending voice timeouts and smoothly ramps down all active voices to zero gain in 30ms.
5. **Separation of Intentional UI Clicks vs Programmatic Transitions**:
   - `showScreen(screenId, { silent: true })` option to prevent click sounds during network-driven transitions.
6. **Smart Chat & Guess Sound Routing**:
   - Local user's own sent message: silent (or subtle sent tick).
   - Remote chat: pleasant pop.
   - Guess submissions in chat: suppressed or distinct guess blip.
   - Spoilers / system messages: silent.
7. **Authoritative Timer Warning Thresholds**:
   - Instead of ticking every single second, play authoritative warning milestones:
     - 10 seconds remaining: Warning chime (plays once).
     - 5 seconds remaining: Rapid urgency warning (plays once).
     - 0 seconds remaining: Timeout buzz (plays once).
     - Standard ambient ticks are optional and strictly throttled.

---

## 19. Implementation Plan

1. **Phase 1: Centralized Audio Engine (`react-app/src/services/audio/`)**:
   - Implement `AudioSynth.js`: Clean procedural synthesis for all SFX, adding missing `playFlare()`, improving `playWrong()`, and adding smooth micro-ramps.
   - Implement `MusicManager.js`: Procedural ambient soundtrack generator with loop tracking, smooth fade-in/fade-out, and pause on round reveal/game over.
   - Implement `AudioManager.js`: Unified facade exposing `playSfx`, `playOnce`, `playMusic`, `stopMusic`, `stopAll`, `setMasterVolume`, `setSfxVolume`, `setMusicVolume`, `toggleMute`, and `unlockAudio`.
   - Maintain full backward compatibility with `SoundManager` interface so existing components and `testBridge.js` continue working without regression.
2. **Phase 2: Fix Screen & Context Sound Triggers**:
   - Update `GameContext.jsx`:
     - Add `{ silent: true }` option to `showScreen` so programmatic transitions don't play click sounds.
     - Overhaul timer countdown audio to trigger deduplicated threshold warnings (10s, 5s, 0s) rather than raw noisy per-second intervals.
   - Update `MultiplayerContext.jsx`:
     - Deduplicate `ROUND_START`, `MATCH_START`, `GAME_OVER`, and `CORRECT_ANSWER_BROADCAST`.
     - Differentiate `MY_CORRECT_ANSWER` vs `OTHER_PLAYER_CORRECT`.
     - Filter `CHAT_MESSAGE` audio so local messages and hidden spoilers do not spam pops.
     - Call `playFlare()` for hints properly.
   - Update `WinnerScreen.jsx`:
     - Remove duplicate `SoundManager.playWinner()` call on mount.
3. **Phase 3: Autoplay & Mobile Resilience**:
   - Attach global gesture unlock listeners in `App.jsx` and `AudioManager.init()`.
   - Add `document.addEventListener('visibilitychange')` to cleanly handle mobile backgrounding and tab return.
4. **Phase 4: Backward Compatibility & Test Bridge**:
   - Ensure `window.SoundManager` points to the hardened `AudioManager` with identical method signatures.

---

## 20. Test Plan

### Automated Tests (`scratch/test_audio_system.cjs` and frontend Vitest):
1. **Audio Engine Initialization**: Verify initialization without DOM exception or unhandled promise rejection.
2. **Autoplay & Unlock Simulation**: Verify `unlockAudio()` transitions context from `suspended` to `running`.
3. **Sound Deduplication (`playOnce`)**: Verify that dispatching the same event ID twice within the same round triggers audio only once.
4. **Timer Warning Thresholds**: Simulate time decrementing from 15s to 0s; verify exactly one 10s warning, one 5s warning, and one 0s timeout sound.
5. **Winner Screen Deduplication**: Verify that receiving `GAME_OVER` followed by `WinnerScreen` render does not duplicate fanfare.
6. **Chat Sound Filter**: Verify local player messages, guesses, and spoiler events do not trigger popup notifications.
7. **Voice Cancellation & Stop All**: Verify `stopAll()` clears scheduled timeouts and active oscillators.
8. **Volume & Mute Math**: Verify `setVolume(0)` and `toggleMute(true)` silence output immediately.
9. **Full Multiplayer Round Lifecycle**: Run end-to-end simulated match with multiple players answering and verify sound event sequence.

### Manual Verification:
- Desktop Chrome & Mobile emulation in Playwright.
- Verify zero console errors, zero unhandled rejections, and pristine audio behavior.
