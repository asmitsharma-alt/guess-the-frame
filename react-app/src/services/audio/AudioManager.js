/**
 * AudioManager - Production-Hardened Audio Orchestrator for ScoopCast
 * Handles Web Audio lifecycle, proactive user gesture unlock, mobile backgrounding,
 * sound event deduplication, volume hierarchy, and procedural SFX/music synthesis.
 */

import { AudioSynth } from './AudioSynth.js';
import { MusicManager } from './MusicManager.js';

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.limiter = null;

    // Volume settings (0.0 to 1.0)
    this.masterVolume = 0.8;
    this.sfxVolume = 1.0;
    this.musicVolume = 0.5;
    this.isMuted = false;

    // Deduplication tracking: Map<eventKey, timestamp>
    this.playedEvents = new Map();
    this.dedupTtlMs = 30000; // 30s cache retention

    // Active game & screen tracking for strict SFX gating
    this.activeScreen = 'homeScreen';
    this.isMatchActive = false;

    // Autoplay & Unlock state
    this.isUnlocked = false;
    this._unlockHandlerBound = this.unlockAudio.bind(this);
    this._visibilityHandlerBound = this._handleVisibilityChange.bind(this);
    this._wasPlayingBeforeHide = false;

    // Submodules
    this.synth = new AudioSynth(this);
    this.music = new MusicManager(this);

    this._loadSettings();
  }

  _loadSettings() {
    if (typeof window === 'undefined') return;
    try {
      const savedVol = localStorage.getItem('gtf_sound_vol');
      if (savedVol !== null) {
        this.masterVolume = Math.max(0, Math.min(1, parseFloat(savedVol)));
      }
      const savedMuted = localStorage.getItem('gtf_sound_muted');
      if (savedMuted !== null) {
        this.isMuted = savedMuted === 'true';
      }
      const savedSfx = localStorage.getItem('gtf_sfx_vol');
      if (savedSfx !== null) {
        this.sfxVolume = Math.max(0, Math.min(1, parseFloat(savedSfx)));
      }
      const savedMusic = localStorage.getItem('gtf_music_vol');
      if (savedMusic !== null) {
        this.musicVolume = Math.max(0, Math.min(1, parseFloat(savedMusic)));
      }
    } catch (e) {}
  }

  // Compatibility getter for legacy SoundManager.muted & SoundManager.vol
  get muted() {
    return this.isMuted;
  }
  set muted(val) {
    this.setMuted(Boolean(val));
  }
  get vol() {
    return this.masterVolume;
  }
  set vol(val) {
    this.setVolume(val);
  }

  getAudioContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      this.init();
    }
    return this.ctx;
  }

  init() {
    if (typeof window === 'undefined') return;
    if (this.ctx) {
      if (this.ctx.state === 'suspended' && this.isUnlocked) {
        this.ctx.resume().catch(() => {});
      }
      return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    try {
      this.ctx = new AudioContextClass();

      // Master output stage
      this.masterGain = this.ctx.createGain();
      const now = this.ctx.currentTime;
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0.0001 : this.masterVolume, now);

      // SFX Bus
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, now);
      this.sfxGain.connect(this.masterGain);

      // Music Bus
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.musicVolume, now);
      this.musicGain.connect(this.masterGain);

      // Dynamic limiter to prevent clipping and protect ears
      this.limiter = this.ctx.createDynamicsCompressor();
      this.limiter.threshold.setValueAtTime(-6, now);
      this.limiter.knee.setValueAtTime(10, now);
      this.limiter.ratio.setValueAtTime(12, now);
      this.limiter.attack.setValueAtTime(0.003, now);
      this.limiter.release.setValueAtTime(0.15, now);

      this.masterGain.connect(this.limiter);
      this.limiter.connect(this.ctx.destination);

      // Register proactive user interaction unlock listeners
      this._registerUnlockListeners();

      // Register mobile lifecycle listeners (tab switch / backgrounding)
      document.addEventListener('visibilitychange', this._visibilityHandlerBound);
    } catch (e) {
      console.warn('[AudioManager] Failed to initialize Web Audio:', e);
    }
  }

  _registerUnlockListeners() {
    if (typeof window === 'undefined' || this.isUnlocked) return;
    const events = ['pointerdown', 'touchstart', 'keydown', 'click'];
    events.forEach(evt => {
      window.addEventListener(evt, this._unlockHandlerBound, { capture: true, once: true, passive: true });
    });
  }

  unlockAudio() {
    if (this.isUnlocked && this.ctx?.state === 'running') return;
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => {
        this.isUnlocked = true;
      }).catch(() => {});
    } else if (this.ctx && this.ctx.state === 'running') {
      this.isUnlocked = true;
    }

    // Clean up unlock event listeners
    if (typeof window !== 'undefined') {
      const events = ['pointerdown', 'touchstart', 'keydown', 'click'];
      events.forEach(evt => {
        window.removeEventListener(evt, this._unlockHandlerBound, { capture: true });
      });
    }
  }

  _handleVisibilityChange() {
    if (typeof document === 'undefined' || !this.ctx) return;
    if (document.hidden) {
      // Mobile backgrounded or tab hidden -> suspend audio to prevent battery drain
      this._wasPlayingBeforeHide = (this.ctx.state === 'running');
      if (this.music.isPlaying) {
        this.music.stopMusic(0.2);
        this._wasPlayingBeforeHide = true;
      }
      this.stopAll();
      if (this.ctx.state === 'running') {
        this.ctx.suspend().catch(() => {});
      }
    } else {
      // Tab restored to foreground -> resume audio safely
      if (this._wasPlayingBeforeHide && !this.isMuted) {
        if (this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
      }
    }
  }

  // --- Sound Deduplication Core ---

  /**
   * Plays a sound only once for a given canonical event key.
   * Useful for network-driven events (e.g. `round:${roundIdx}:start`) and state renders.
   */
  playOnce(soundName, eventKey) {
    if (!eventKey) {
      this.play(soundName);
      return;
    }

    const now = Date.now();
    const lastPlayed = this.playedEvents.get(eventKey);
    if (lastPlayed && (now - lastPlayed < this.dedupTtlMs)) {
      return; // Deduplicated! Suppress replay
    }

    this.playedEvents.set(eventKey, now);

    // Housekeeping: remove old keys periodically
    if (this.playedEvents.size > 200) {
      for (const [k, timestamp] of this.playedEvents) {
        if (now - timestamp > this.dedupTtlMs) {
          this.playedEvents.delete(k);
        }
      }
    }

    this.play(soundName);
  }

  clearDeduplicationHistory() {
    this.playedEvents.clear();
  }

  // --- Screen State & Audio Gating ---

  setScreenState(screen, isMatchActive) {
    this.activeScreen = screen || 'homeScreen';
    if (typeof isMatchActive === 'boolean') {
      this.isMatchActive = isMatchActive;
    }
    if (this.isLobbyOrHome()) {
      this.stopAll();
      this.stopMusic();
    }
  }

  isLobbyOrHome() {
    return this.activeScreen === 'homeScreen' || 
           this.activeScreen === 'playerLobbyScreen' || 
           this.activeScreen === 'lobbyScreen';
  }

  isGameplayActive() {
    return this.activeScreen === 'gameScreen' && Boolean(this.isMatchActive);
  }

  // --- Unified Audio Routing ---

  play(name, options = {}) {
    if (!name || this.isMuted) return;
    if (!this.ctx) this.init();

    switch (name.toLowerCase()) {
      case 'click': this.synth.playClick(); break;
      case 'tap': this.synth.playTap(); break;
      case 'pop': this.synth.playPop(); break;
      case 'whoosh': this.synth.playWhoosh(); break;
      case 'countbeep': this.synth.playCountBeep(options.n ?? 1); break;
      case 'gamestart': case 'start': this.synth.playGameStart(); break;
      case 'sectionintro': this.synth.playSectionIntro(); break;
      case 'roundstart': this.synth.playRoundStart(); break;
      case 'framein': this.synth.playFrameIn(); break;
      case 'reveal': this.synth.playReveal(); break;
      case 'scoring': this.synth.playScoring(); break;
      case 'selplayer': case 'correct': this.synth.playCorrect(); break;
      case 'opponentcorrect': this.synth.playOpponentCorrect(); break;
      case 'skip': this.synth.playSkip(); break;
      case 'wrong': this.synth.playWrong(); break;
      case 'transition': this.synth.playTransition(); break;
      case 'winner': case 'fanfare': this.synth.playWinner(); break;
      case 'tick': 
        if (!this.isGameplayActive()) return;
        this.synth.playTick(); 
        break;
      case 'tickwarn': 
        if (!this.isGameplayActive()) return;
        this.synth.playTickWarn(); 
        break;
      case 'timeout': this.synth.playTimeout(); break;
      case 'flare': this.synth.playFlare(); break;
      case 'chat': this.synth.playChat(); break;
      case 'guesssubmit': this.synth.playGuessSubmit(); break;
      default:
        const fn = 'play' + name.charAt(0).toUpperCase() + name.slice(1);
        if (typeof this.synth[fn] === 'function') {
          this.synth[fn]();
        } else {
          console.warn(`[AudioManager] Unknown sound effect: ${name}`);
        }
        break;
    }
  }

  // Explicit helper delegates for ergonomics
  playClick() { this.play('click'); }
  playTap() { this.play('tap'); }
  playPop() { this.play('pop'); }
  playWhoosh() { this.play('whoosh'); }
  playCountBeep(n) { this.play('countBeep', { n }); }
  playGameStart() { this.play('gameStart'); }
  playSectionIntro() { this.play('sectionIntro'); }
  playRoundStart() { this.play('roundStart'); }
  playFrameIn() { this.play('frameIn'); }
  playReveal() { this.play('reveal'); }
  playScoring() { this.play('scoring'); }
  playSelPlayer() { this.play('selPlayer'); }
  playCorrect() { this.play('correct'); }
  playOpponentCorrect() { this.play('opponentCorrect'); }
  playSkip() { this.play('skip'); }
  playWrong() { this.play('wrong'); }
  playTransition() { this.play('transition'); }
  playWinner() { this.play('winner'); }
  playFanfare() { this.play('winner'); }
  playTick() { 
    if (!this.isGameplayActive()) return;
    this.play('tick'); 
  }
  playTickWarn() { 
    if (!this.isGameplayActive()) return;
    this.play('tickWarn'); 
  }
  playTimeout() { this.play('timeout'); }
  playFlare() { this.play('flare'); }
  playChat() { this.play('chat'); }
  playGuessSubmit() { this.play('guessSubmit'); }

  // Background Music Delegates
  playMusic(track) {
    this.music.playMusic(track);
  }
  stopMusic(fadeSec = 0.4) {
    this.music.stopMusic(fadeSec);
  }
  resumeMusic() {
    this.music.resumeMusic();
  }
  duckMusic(amount = 0.2, durationMs = 2500) {
    this.music.duck(amount, durationMs);
  }

  // --- Volume & Mute Management ---

  toggleMute() {
    return this.setMuted(!this.isMuted);
  }

  setMuted(muted) {
    this.isMuted = Boolean(muted);
    try {
      localStorage.setItem('gtf_sound_muted', String(this.isMuted));
    } catch (e) {}

    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(this.isMuted ? 0.0001 : this.masterVolume, now + 0.03);
    }

    if (!this.isMuted) {
      this.unlockAudio();
    } else {
      this.stopAll();
    }

    // Sync legacy DOM icon if present
    if (typeof document !== 'undefined') {
      const b = document.getElementById('sndBtn');
      if (b) {
        b.innerHTML = this.isMuted
          ? '<svg class="svg-icon"><use href="#icon-volume-x" /></svg>'
          : '<svg class="svg-icon"><use href="#icon-volume-2" /></svg>';
        b.classList.toggle('muted', this.isMuted);
      }
    }

    return this.isMuted;
  }

  setVolume(vol) {
    this.setMasterVolume(vol);
  }

  setMasterVolume(vol) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    try {
      localStorage.setItem('gtf_sound_vol', String(this.masterVolume));
    } catch (e) {}

    if (this.masterGain && this.ctx && !this.isMuted) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(this.masterVolume, now + 0.03);
    }
  }

  setSfxVolume(vol) {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    try {
      localStorage.setItem('gtf_sfx_vol', String(this.sfxVolume));
    } catch (e) {}

    if (this.sfxGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.sfxGain.gain.cancelScheduledValues(now);
      this.sfxGain.gain.linearRampToValueAtTime(this.sfxVolume, now + 0.03);
    }
  }

  setMusicVolume(vol) {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    try {
      localStorage.setItem('gtf_music_vol', String(this.musicVolume));
    } catch (e) {}

    if (this.musicGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.musicGain.gain.cancelScheduledValues(now);
      this.musicGain.gain.linearRampToValueAtTime(this.musicVolume, now + 0.03);
    }
  }

  // --- Voice Cancellation & Teardown ---

  stopAll() {
    this.synth.stopAll();
  }

  cancelPendingVoices() {
    this.stopAll();
  }

  resetSounds() {
    this.synth.soundConfig = {};
  }
}

// Global Singleton Instance
export const audioManager = new AudioManager();
export default audioManager;
