# ScoopCast Audio System Implementation & Hardening

**Date**: September 16, 2026  
**Status**: Verified & Deployed to Production (`https://scoopcast.me`)  
**Author**: Senior Frontend Audio & Web Game Production Engineer  

---

## 1. Existing Audio Architecture

Prior to this refactor, ScoopCast used a basic procedural audio synthesizer singleton (`react-app/src/services/soundManager.js`) that created oscillators and white noise buffers on demand using the Web Audio API (`AudioContext`).

The legacy implementation lacked:
- Centralized voice management and active node tracking.
- Autoplay and user-gesture unlock handling for mobile and desktop browsers.
- Sound event deduplication for state transitions and network retransmissions.
- Separation of concerns for Background Music (BGM) vs Sound Effects (SFX).
- Clean teardown and timeout tracking (leading to orphaned voice synthesis).

---

## 2. Problems Found & Root Causes

| Issue | Root Cause |
|---|---|
| **Silent hint failure (`BUG-01`)** | `SoundManager.play('flare')` was called on `HINT_BROADCAST`, but `playFlare()` was never implemented in `soundManager.js`. |
| **Double sounds on screen changes (`BUG-02`)** | `GameContext.showScreen()` hardcoded `SoundManager.playClick()`, so programmatic network transitions (`MATCH_START`, `ROUND_START`, `GAME_OVER`) played a button click on top of the round start or winner sound. |
| **Double winner fanfare (`BUG-03`)** | Both `MultiplayerContext.jsx` (on `GAME_OVER`) and `WinnerScreen.jsx` (inside `useEffect([isActive])`) called `SoundManager.playWinner()`, playing two fanfares simultaneously. |
| **Chat pop noise spam (`BUG-04`)** | `CHAT_MESSAGE` played `SoundManager.playPop()` for ALL messages: local user's own sent messages, every guess attempted in chat, and spoiler masks. |
| **Mobile autoplay blocks (`BUG-05`)** | `AudioContext` was lazily created without global gesture listeners (`pointerdown`, `touchstart`, `keydown`). When a remote host started the match, the context remained in `'suspended'` state and dropped incoming sounds. |
| **Unrhythmic timer ticks (`BUG-06`)** | The countdown effect in `GameContext.jsx` re-ran on every state dependency change, playing ticks indiscriminately instead of deriving one-shot milestone warnings. |
| **Voice & timeout leaks (`BUG-07`)** | Multi-note fanfares and reveals scheduled unmanaged `setTimeout` calls that continued executing even after round changes or match ends. |
| **Volume & mute glitches (`BUG-08`)** | Instant gain changes via `setValueAtTime` caused audible popping artifacts; no separate SFX vs Music volume control existed. |
| **Missing guess feedback (`BUG-09`)** | Guess submissions had no immediate acoustic response. |
| **Mobile background drain (`BUG-10`)** | No `visibilitychange` listener to suspend `AudioContext` when the tab was hidden. |

---

## 3. Files Changed

1. **`react-app/src/services/audio/AudioSynth.js`** [NEW]:
   - Complete procedural Web Audio synthesizer.
   - Implemented missing `playFlare()` shimmer for hints.
   - Added distinct `playWrong()` buzzer, `playChat()` gentle notification, `playOpponentCorrect()`, `playTimeout()`, and `playGuessSubmit()`.
   - Added active node tracking and `stopAll()` voice cancellation.
2. **`react-app/src/services/audio/MusicManager.js`** [NEW]:
   - Procedural ambient cinema BGM synthesizer (Dm9 -> BbMaj7 -> FMaj7 -> C).
   - Strict single-instance enforcement; automatic ducking during reveals and stops on game over.
3. **`react-app/src/services/audio/AudioManager.js`** [NEW]:
   - Global audio engine orchestrator managing `AudioContext`, unlock listeners, mobile `visibilitychange`, volume hierarchy, deduplication cache (`playOnce`), and routing.
4. **`react-app/src/services/audio/index.js`** [NEW]:
   - Clean barrel export module.
5. **`react-app/src/services/soundManager.js`** [MODIFIED]:
   - Refactored into a 100% backward-compatible facade delegating directly to `AudioManager`.
6. **`react-app/src/context/GameContext.jsx`** [MODIFIED]:
   - Added `{ silent: true }` option to `showScreen` for programmatic transitions.
   - Overhauled countdown timer loop: deduplicated one-shot milestone warnings at 10s (`tickWarn`), <=5s (`tickWarn`), and 0s (`timeout`).
7. **`react-app/src/context/MultiplayerContext.jsx`** [MODIFIED]:
   - Passed `{ silent: true }` to `showScreen` on network transitions.
   - Deduplicated `MATCH_START`, `ROUND_START`, `REMATCH`, and `GAME_OVER` using `playOnce`.
   - Replaced broken hint sound with `SoundManager.playFlare()`.
   - Differentiated local player victory (`playCorrect()`) vs remote player victory (`playOpponentCorrect()`).
   - Filtered chat sounds: suppressed for self, guesses, and spoilers; subtle `playChat()` for genuine remote chatter.
8. **`react-app/src/pages/WinnerScreen.jsx`** [MODIFIED]:
   - Deduplicated victory fanfare with `SoundManager.playOnce('winner', 'match_gameover')`.
9. **`react-app/src/pages/GameScreen.jsx`** [MODIFIED]:
   - Added responsive acoustic feedback `SoundManager.playGuessSubmit()` upon guess submission.
10. **`react-app/src/App.jsx`** [MODIFIED]:
    - Added early `SoundManager.init()` and unlock listener initialization on app mount.

---

## 4. Audio Architecture After Fix

```
                      [ User Gesture / Window Events ]
                                      │
                                      ▼
                             [ AudioManager ]
                        (Unlock, Lifecycle, Dedup)
                                      │
            ┌─────────────────────────┴─────────────────────────┐
            ▼                                                   ▼
     [ AudioSynth ]                                      [ MusicManager ]
 (Procedural SFX Engine)                              (Ambient Cinema Loop)
            │                                                   │
            ▼                                                   ▼
       [ sfxGain ]                                         [ musicGain ]
            │                                                   │
            └─────────────────────────┬─────────────────────────┘
                                      ▼
                                [ masterGain ]
                                (Mute / Volume)
                                      │
                                      ▼
                           [ DynamicsCompressor ]
                                  (Limiter)
                                      │
                                      ▼
                         [ AudioContext.destination ]
```

---

## 5. Audio Event Mapping

| Event | Trigger | Audio Method | Policy / Dedup Key |
|---|---|---|---|
| Player Joined | WebSocket `PLAYER_JOINED` | `playOnce('pop', 'join_${id}')` | Deduplicated per player |
| Match Start | WebSocket `MATCH_START` | `playOnce('roundStart', 'round_0_start')` | Silent screen switch + round start sound |
| Round Start | WebSocket `ROUND_START` | `playOnce('roundStart', 'round_${idx}_start')` | Silent screen switch + round start sound |
| Hint Used | WebSocket `HINT_BROADCAST` | `playFlare()` | Magical shimmer sound |
| Guess Submit | User submit button / Enter | `playGuessSubmit()` | Immediate acoustic feedback |
| Local Won | WebSocket `CORRECT_ANSWER_BROADCAST` | `playOnce('correct', 'winner_${id}_r${idx}')` | Ascending celebratory fanfare |
| Opponent Won | WebSocket `CORRECT_ANSWER_BROADCAST` | `playOnce('opponentCorrect', 'winner_${id}_r${idx}')` | Non-intrusive notification chime |
| Reveal | WebSocket `ROUND_REVEAL` | `playOnce('reveal', 'reveal_r${idx}')` | Dramatic low chord reveal |
| Timer 10s | Authoritative epoch timer | `playOnce('tickWarn', 'timer_${key}_10s')` | One-shot threshold warning |
| Timer 5-1s | Authoritative epoch timer | `playOnce('tickWarn', 'timer_${key}_${s}s')` | One-shot urgency warning |
| Timer 0s | Authoritative epoch timer | `playOnce('timeout', 'timer_${key}_0s')` | Low-register timeout sound |
| Remote Chat | WebSocket `CHAT_MESSAGE` | `playChat()` (throttled 280ms) | Soft ping (filtered out for self/guesses) |
| Game Over | WebSocket `GAME_OVER` | `playOnce('winner', 'match_gameover')` | Single grand victory fanfare |
| Return to Lobby | WebSocket `RETURN_TO_LOBBY` | `stopAll()` | Clears all voices, timeouts, and music |

---

## 6. Strategies Implemented

### Autoplay & Gesture Unlock Strategy
- Listeners for `pointerdown`, `touchstart`, `keydown`, and `click` are registered with `{ capture: true, once: true, passive: true }`.
- First user interaction safely resumes the `AudioContext` and sets `isUnlocked = true`.
- Handled with promise rejection guards to prevent console noise.

### Mobile Browser Lifecycle Strategy
- `document.addEventListener('visibilitychange')` suspends `AudioContext` and stops music when the mobile browser tab is hidden (`document.hidden === true`).
- Restores cleanly without audio bursts or desync when returning to the foreground.

### Sound Deduplication Strategy
- `playOnce(soundName, eventKey)` stores event timestamps in an LRU-managed `Map`.
- If an event with the same canonical key occurs within the TTL window (30s) or during the same round, subsequent triggers are dropped.

### Cleanup Strategy
- All multi-note `setTimeout` identifiers are tracked in an `activeTimeouts` Set.
- `stopAll()` clears all pending timeouts and ramps down all active voice gains to 0 in 20ms, preventing orphaned oscillators from leaking across rounds.

---

## 7. Tests Executed & Results

### Automated Test Suite 1: Audio Engine (`scratch/test_audio_system.cjs`)
```
================================================================
  TESTING SCOOPCAST AUDIOMANAGER & AUDIO SUBSYSTEM
================================================================

1. Testing initialization & state...
   ✅ PASS: AudioContext successfully initialized in safe suspended state.
2. Testing proactive user gesture unlock...
   ✅ PASS: AudioContext unlocked on user gesture.
3. Testing sound deduplication with event keys...
   ✅ PASS: Event deduplication strictly prevents duplicate audio playback.
4. Testing BUG-01 fix: playFlare hint shimmer exists and executes...
   ✅ PASS: playFlare is fully implemented and synthesizes cleanly.
5. Testing volume & mute state math...
   ✅ PASS: Volume & mute settings persist and compute accurately.
6. Testing voice cancellation on stopAll()...
   ✅ PASS: stopAll() cancels all pending timeouts, preventing memory leaks.
7. Testing MusicManager single-instance state & ducking...
   ✅ PASS: MusicManager enforces strict single-track playback and smooth ducking.
8. Testing smart chat sound filtering...
   ✅ PASS: Chat filter eliminates noise spam from self, guesses, and spoilers.
9. Testing SoundManager facade interface compatibility...
   ✅ PASS: 100% backward compatibility maintained for all callers and Playwright.

================================================================
  ALL 9 AUDIO SYSTEM ACCEPTANCE TESTS PASSED 100%!
================================================================
```

### Automated Test Suite 2: Full Multiplayer Acceptance (`scratch/test_game_rules_authoritative.cjs`)
```
================================================================
  VERIFICATION RESULTS: 15 / 15 PASSED (100%)
================================================================
🎉 ALL 15 AUTHORITATIVE GAME RULES ACCEPTANCE TESTS PASSED 100%!
```

### Automated Test Suite 3: Unlimited Guessing & Chat (`scratch/test_unlimited_guesses_and_chat.cjs`)
```
================================================================
  ALL UNLIMITED GUESS & CHAT SPOILER TESTS PASSED 100%!
================================================================
```

### Live Browser E2E Check on Production (`https://scoopcast.me`)
```
Audio Engine Check: {
  hasSoundManager: true,
  hasPlay: true,
  hasPlayOnce: true,
  hasPlayFlare: true,
  hasStopAll: true,
  isMuted: false
}
Console Errors: None (Clean)
Post-Audio-Trigger Errors: None (Clean)
```

---

## 8. Remaining Limitations

1. **User Interaction Prerequisite**: Per browser security standards (W3C Autoplay Policy), audio cannot be heard if a user opens a link in a fresh tab and performs zero interactions before an audio event arrives. The proactive unlock listener ensures that the very first touch anywhere unlocks full audio immediately.
2. **Procedural Synthesis Limits**: Synthesis relies on client Web Audio capabilities. Extremely low-end hardware with high CPU load may experience minor buffer underruns if dozens of other heavy tabs are active simultaneously, though the DynamicsCompressor limiter prevents distortion.
