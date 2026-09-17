/**
 * MusicManager - Procedural Ambient Music Synthesizer for ScoopCast
 * Provides a soothing, low-fi cinema background ambiance using Web Audio oscillators.
 * Zero external mp3 dependencies, zero download size, strict single-instance management.
 */

export class MusicManager {
  constructor(audioManager) {
    this.mgr = audioManager;
    this.isPlaying = false;
    this.currentTrack = null;
    this.intervalId = null;
    this.activeNodes = new Set();
    this.duckTimer = null;
    this.baseGain = 0.08; // subtle ambient background
  }

  get ctx() {
    return this.mgr.getAudioContext();
  }

  get out() {
    return this.mgr.musicGain;
  }

  playMusic(track = 'gameplay') {
    if (this.isPlaying && this.currentTrack === track) {
      return; // Already playing this track
    }
    this.stopMusic();

    const c = this.ctx;
    if (!c || this.mgr.isMuted) return;

    this.isPlaying = true;
    this.currentTrack = track;

    // Start procedural ambient chord progression
    // Cinema chords: Dm9 -> BbMaj7 -> FMaj7 -> C
    const chordProgression = [
      [146.83, 220.0, 261.63, 329.63], // Dm9 (D3, A3, C4, E4)
      [116.54, 174.61, 233.08, 293.66], // BbMaj7 (Bb2, F3, Bb3, D4)
      [174.61, 220.0, 261.63, 349.23], // FMaj7 (F3, A3, C4, F4)
      [130.81, 196.0, 261.63, 329.63]  // C (C3, G3, C4, E4)
    ];

    let chordIdx = 0;
    const playNextChord = () => {
      if (!this.isPlaying) return;
      const chord = chordProgression[chordIdx % chordProgression.length];
      chordIdx++;
      this._playAmbientPad(chord, 3.8);
    };

    playNextChord();
    this.intervalId = setInterval(playNextChord, 4000);
  }

  _playAmbientPad(frequencies, duration) {
    const c = this.ctx;
    const out = this.out;
    if (!c || !out || !this.isPlaying) return;

    const now = c.currentTime;
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(480, now);
    filter.Q.setValueAtTime(1.5, now);

    const padGain = c.createGain();
    padGain.gain.setValueAtTime(0.0001, now);
    padGain.gain.linearRampToValueAtTime(this.baseGain, now + 1.2);
    padGain.gain.setValueAtTime(this.baseGain, now + duration - 1.0);
    padGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    filter.connect(padGain);
    padGain.connect(out);

    const oscs = [];
    frequencies.forEach(f => {
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(f, now);
      // Subtle gentle detune for warmth
      o.detune.setValueAtTime((Math.random() * 6) - 3, now);
      o.connect(filter);
      try {
        o.start(now);
        o.stop(now + duration + 0.1);
      } catch (e) {}
      oscs.push(o);
      this.activeNodes.add(o);
    });

    this.activeNodes.add(padGain);
    this.activeNodes.add(filter);

    setTimeout(() => {
      oscs.forEach(o => {
        try { o.disconnect(); } catch (e) {}
        this.activeNodes.delete(o);
      });
      try {
        filter.disconnect();
        padGain.disconnect();
      } catch (e) {}
      this.activeNodes.delete(filter);
      this.activeNodes.delete(padGain);
    }, (duration + 0.2) * 1000);
  }

  duck(amount = 0.2, durationMs = 2500) {
    const c = this.ctx;
    if (!c || !this.out || !this.isPlaying) return;
    const now = c.currentTime;
    try {
      this.out.gain.cancelScheduledValues(now);
      this.out.gain.linearRampToValueAtTime(this.mgr.musicVolume * amount, now + 0.2);
      if (this.duckTimer) clearTimeout(this.duckTimer);
      this.duckTimer = setTimeout(() => {
        if (!this.isPlaying || !this.ctx) return;
        const cur = this.ctx.currentTime;
        this.out.gain.cancelScheduledValues(cur);
        this.out.gain.linearRampToValueAtTime(this.mgr.musicVolume, cur + 0.8);
      }, durationMs);
    } catch (e) {}
  }

  stopMusic(fadeDuration = 0.4) {
    this.isPlaying = false;
    this.currentTrack = null;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.duckTimer) {
      clearTimeout(this.duckTimer);
      this.duckTimer = null;
    }

    const c = this.ctx;
    if (c && this.out) {
      const now = c.currentTime;
      try {
        this.out.gain.cancelScheduledValues(now);
        this.out.gain.linearRampToValueAtTime(0.0001, now + fadeDuration);
        setTimeout(() => {
          if (!this.isPlaying && this.ctx && this.out) {
            this.out.gain.setValueAtTime(this.mgr.musicVolume, this.ctx.currentTime);
          }
        }, (fadeDuration + 0.05) * 1000);
      } catch (e) {}
    }

    for (const node of this.activeNodes) {
      try {
        if (node.stop) node.stop();
        if (node.disconnect) node.disconnect();
      } catch (e) {}
    }
    this.activeNodes.clear();
  }

  resumeMusic() {
    if (!this.isPlaying && this.currentTrack) {
      this.playMusic(this.currentTrack);
    }
  }
}

export default MusicManager;
