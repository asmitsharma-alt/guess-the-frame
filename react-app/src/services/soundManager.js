/**
 * SoundManager - Backward-Compatible Facade for ScoopCast Audio Subsystem
 * Delegates all audio operations to the centralized, production-hardened AudioManager.
 * Preserves 100% compatibility with legacy callers, React components, and Playwright testBridge.
 */

import { audioManager } from './audio/AudioManager.js';

export const SoundManager = {
  get ctx() {
    return audioManager.getAudioContext();
  },
  set ctx(val) {
    audioManager.ctx = val;
  },

  get masterGain() {
    return audioManager.masterGain;
  },
  get limiter() {
    return audioManager.limiter;
  },

  get vol() {
    return audioManager.masterVolume;
  },
  set vol(v) {
    audioManager.setVolume(v);
  },

  get muted() {
    return audioManager.isMuted;
  },
  set muted(m) {
    audioManager.setMuted(m);
  },

  get soundConfig() {
    return audioManager.synth.soundConfig;
  },
  set soundConfig(cfg) {
    audioManager.synth.soundConfig = cfg;
  },

  init() {
    audioManager.init();
  },

  _ensure() {
    audioManager.init();
  },

  tone(opts) {
    audioManager.synth.tone(opts);
  },

  _noise(name, opts) {
    audioManager.synth._noise(name, opts);
  },

  _glide(name, from, to, dur, vol, type) {
    audioManager.synth._glide(name, from, to, dur, vol, type);
  },

  _thock(name, f, vol, dur) {
    audioManager.synth._thock(name, f, vol, dur);
  },

  _tap(name, f, vol, hp) {
    audioManager.synth._tap(name, f, vol, hp);
  },

  play(name, options) {
    audioManager.play(name, options);
  },

  playOnce(name, eventKey) {
    audioManager.playOnce(name, eventKey);
  },

  playTick() { audioManager.playTick(); },
  playTickWarn() { audioManager.playTickWarn(); },
  playTimeout() { audioManager.playTimeout(); },
  playClick() { audioManager.playClick(); },
  playHover() { audioManager.synth._noise('hover', { vol: 0.04, hp: 3600, dur: 0.006 }); },
  playTap() { audioManager.playTap(); },
  playPop() { audioManager.playPop(); },
  playWhoosh() { audioManager.playWhoosh(); },
  playCountBeep(n) { audioManager.playCountBeep(n); },
  playGameStart() { audioManager.playGameStart(); },
  playSectionIntro() { audioManager.playSectionIntro(); },
  playRoundStart() { audioManager.playRoundStart(); },
  playFrameIn() { audioManager.playFrameIn(); },
  playReveal() { audioManager.playReveal(); },
  playScoring() { audioManager.playScoring(); },
  playSelPlayer() { audioManager.playSelPlayer(); },
  playCorrect() { audioManager.playCorrect(); },
  playOpponentCorrect() { audioManager.playOpponentCorrect(); },
  playSkip() { audioManager.playSkip(); },
  playWrong() { audioManager.playWrong(); },
  playTransition() { audioManager.playTransition(); },
  playWinner() { audioManager.playWinner(); },
  playFanfare() { audioManager.playFanfare(); },
  playFlare() { audioManager.playFlare(); },
  playChat() { audioManager.playChat(); },
  playGuessSubmit() { audioManager.playGuessSubmit(); },

  playMusic(track) { audioManager.playMusic(track); },
  stopMusic(fadeSec) { audioManager.stopMusic(fadeSec); },
  resumeMusic() { audioManager.resumeMusic(); },
  duckMusic(amount, durationMs) { audioManager.duckMusic(amount, durationMs); },

  stopAll() { audioManager.stopAll(); },
  cancelPendingVoices() { audioManager.cancelPendingVoices(); },
  unlockAudio() { audioManager.unlockAudio(); },
  setScreenState(screen, isMatchActive) { audioManager.setScreenState(screen, isMatchActive); },

  toggleMute() {
    return audioManager.toggleMute();
  },

  setVolume(v) {
    audioManager.setVolume(v);
  },

  setSfxVolume(v) {
    audioManager.setSfxVolume(v);
  },

  setMusicVolume(v) {
    audioManager.setMusicVolume(v);
  },

  resetSounds() {
    audioManager.resetSounds();
  }
};

export default SoundManager;
