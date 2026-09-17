/**
 * AudioSynth - Procedural Web Audio Synthesizer for ScoopCast
 * Generates all acoustic game sound effects on the fly with zero external asset dependencies.
 * Includes active node tracking, safe timeout management, and graceful cancellation.
 */

export class AudioSynth {
  constructor(audioManager) {
    this.mgr = audioManager;
    this.activeTimeouts = new Set();
    this.activeNodes = new Set();
    this.soundConfig = {};
    this._lastClickTime = 0;
    this._lastChatTime = 0;
    this._lastGuessSubmitTime = 0;
  }

  get ctx() {
    return this.mgr.getAudioContext();
  }

  get masterGain() {
    return this.mgr.sfxGain;
  }

  _safeTimeout(fn, delay) {
    const timerId = setTimeout(() => {
      this.activeTimeouts.delete(timerId);
      try {
        fn();
      } catch (err) {
        // Suppress audio callback errors during teardown
      }
    }, delay);
    this.activeTimeouts.add(timerId);
    return timerId;
  }

  stopAll() {
    // Clear all pending scheduled multi-tone timeouts
    for (const tid of this.activeTimeouts) {
      clearTimeout(tid);
    }
    this.activeTimeouts.clear();
  }

  _trackNode(node) {
    if (!node) return;
    this.activeNodes.add(node);
    const cleanup = () => {
      this.activeNodes.delete(node);
      try {
        if (node.disconnect) node.disconnect();
      } catch (e) {}
    };
    if ('onended' in node) {
      const prev = node.onended;
      node.onended = (e) => {
        cleanup();
        if (typeof prev === 'function') prev(e);
      };
    } else {
      setTimeout(cleanup, 2000);
    }
  }

  _defaultCfg() {
    return { enabled: true, pitch: 1, speed: 1, style: 'default' };
  }

  _sc(name) {
    if (!this.soundConfig[name]) this.soundConfig[name] = this._defaultCfg();
    return this.soundConfig[name];
  }

  _ok(name) {
    return !this.mgr.isMuted && this._sc(name).enabled;
  }

  tone({ f = 440, d = 0.15, type = 'sine', v = 0.35, a = 0.012, dec = 0.06, sus = 0.3, rel = 0.08 } = {}) {
    if (!this._ok('tone')) return;
    const c = this.ctx;
    const out = this.masterGain;
    if (!c || !out) return;

    const t = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(20, f), t);

    const A = Math.max(0.006, a);
    const dur = Math.max(d, A + dec + rel + 0.02);
    const susT = Math.max(A + dec, dur - rel);

    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(Math.max(0.0001, v), t + A);
    g.gain.linearRampToValueAtTime(Math.max(0.0001, v * sus), t + A + dec);
    g.gain.setValueAtTime(Math.max(0.0001, v * sus), t + susT);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    o.connect(g);
    g.connect(out);

    this._trackNode(o);
    this._trackNode(g);

    try {
      o.start(t);
      o.stop(t + dur + 0.03);
    } catch (e) {}
  }

  _noise(name, { vol = 0.06, hp = 1400, dur = 0.01 } = {}) {
    if (!this._ok(name)) return;
    const c = this.ctx;
    const out = this.masterGain;
    if (!c || !out) return;

    const cfg = this._sc(name);
    const t = c.currentTime;
    const D = Math.max(0.004, dur / cfg.speed);
    const buf = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * D)), c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }

    const src = c.createBufferSource();
    src.buffer = buf;

    // Gentle bandpass filter instead of harsh highpass to create warm acoustic texture
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(Math.max(100, hp * cfg.pitch), t);
    f.Q.setValueAtTime(1.2, t);

    const g = c.createGain();
    g.gain.setValueAtTime(Math.max(0.0001, vol), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + D);

    src.connect(f);
    f.connect(g);
    g.connect(out);

    this._trackNode(src);
    this._trackNode(g);

    try {
      src.start(t);
    } catch (e) {}
  }

  _glide(name, from, to, dur = 0.08, vol = 0.18, type = 'sine') {
    if (!this._ok(name)) return;
    const c = this.ctx;
    const out = this.masterGain;
    if (!c || !out) return;

    const cfg = this._sc(name);
    const t = c.currentTime;
    const D = Math.max(0.02, dur / cfg.speed);
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;

    o.frequency.setValueAtTime(Math.max(20, from * cfg.pitch), t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, to * cfg.pitch), t + D);

    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(Math.max(0.0001, vol), t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + D);

    o.connect(g);
    g.connect(out);

    this._trackNode(o);
    this._trackNode(g);

    try {
      o.start(t);
      o.stop(t + D + 0.02);
    } catch (e) {}
  }

  _thock(name, f = 190, vol = 0.2, dur = 0.08) {
    this._glide(name, f, f * 0.72, dur, vol, 'sine');
  }

  _tap(name, f = 190, vol = 0.16, hp = 1400) {
    this._noise(name, { vol: vol * 0.4, hp });
    this._thock(name, f, vol, 0.06);
  }

  // --- Sound Effects Implementations ---

  playClick() {
    if (!this._ok('click')) return;
    const now = performance.now();
    if (now - this._lastClickTime < 40) return;
    this._lastClickTime = now;
    this._noise('click', { vol: 0.05, hp: 1500, dur: 0.008 });
    this._glide('click', 420, 240, 0.04, 0.18, 'sine');
  }

  playTap() {
    if (!this._ok('tap')) return;
    this._noise('tap', { vol: 0.04, hp: 1400, dur: 0.008 });
    this._glide('tap', 360, 220, 0.05, 0.15, 'sine');
  }

  playPop() {
    if (!this._ok('pop')) return;
    this._glide('pop', 280, 520, 0.06, 0.18, 'sine');
  }

  playWhoosh() {
    if (!this._ok('whoosh')) return;
    this._noise('whoosh', { vol: 0.06, hp: 900, dur: 0.18 });
    this._glide('whoosh', 360, 160, 0.2, 0.12, 'sine');
  }

  playCountBeep(n) {
    if (!this._ok('countBeep')) return;
    const sm = this._sc('countBeep').speed;
    if (n > 0) {
      this.tone({ f: 392 + (3 - n) * 44, d: 0.1, v: 0.14, type: 'sine', a: 0.01, dec: 0.04, sus: 0.3, rel: 0.05 });
    } else {
      [440, 554.37, 659.25].forEach((f, i) => this._safeTimeout(() => {
        this.tone({ f, d: 0.18, v: 0.16, type: 'sine', a: 0.01, dec: 0.05, sus: 0.4, rel: 0.08 });
      }, (i * 65) / sm));
    }
  }

  playGameStart() {
    if (!this._ok('gameStart')) return;
    const cfg = this._sc('gameStart');
    [261.63, 329.63, 392.0, 523.25].forEach((f, i) => this._safeTimeout(() => {
      this.tone({ f, d: 0.2, v: 0.16, type: 'sine', a: 0.012, dec: 0.06, sus: 0.3, rel: 0.1 });
    }, (i * 75) / cfg.speed));
  }

  playSectionIntro() {
    if (!this._ok('sectionIntro')) return;
    const cfg = this._sc('sectionIntro');
    [330, 440, 554].forEach((f, i) => this._safeTimeout(() => {
      this.tone({ f, d: 0.18, v: 0.15, type: 'sine', a: 0.012, dec: 0.06, sus: 0.3, rel: 0.08 });
    }, (i * 80) / cfg.speed));
  }

  playRoundStart() {
    if (!this._ok('roundStart')) return;
    const cfg = this._sc('roundStart');
    this.tone({ f: 392, d: 0.15, v: 0.16, type: 'sine', a: 0.012, dec: 0.05, sus: 0.3, rel: 0.08 });
    this._safeTimeout(() => {
      this.tone({ f: 523.25, d: 0.22, v: 0.18, type: 'sine', a: 0.012, dec: 0.06, sus: 0.4, rel: 0.12 });
    }, 90 / cfg.speed);
  }

  playFrameIn() {
    if (!this._ok('frameIn')) return;
    this._noise('frameIn', { vol: 0.04, hp: 1400, dur: 0.01 });
    this._glide('frameIn', 280, 420, 0.12, 0.14, 'sine');
  }

  playReveal() {
    if (!this._ok('reveal')) return;
    [330, 440, 554.37].forEach((f, i) => this._safeTimeout(() => {
      this.tone({ f, d: 0.26, v: 0.16, type: 'sine', a: 0.012, dec: 0.07, sus: 0.4, rel: 0.12 });
    }, i * 40));
  }

  playScoring() {
    if (!this._ok('scoring')) return;
    const cfg = this._sc('scoring');
    this._glide('scoring', 330, 440, 0.1, 0.15, 'sine');
    this._safeTimeout(() => this._glide('scoring', 440, 523.25, 0.12, 0.16, 'sine'), 85 / cfg.speed);
  }

  /**
   * Correct answer celebratory chime (soft, gentle, uplifting)
   */
  playSelPlayer() {
    if (!this._ok('selPlayer')) return;
    const cfg = this._sc('selPlayer');
    // Sweet, cozy celesta triad (C5, E5, G5)
    [523.25, 659.25, 783.99].forEach((f, i) => this._safeTimeout(() => {
      this.tone({ f, d: 0.22, v: 0.18, type: 'sine', a: 0.012, dec: 0.06, sus: 0.3, rel: 0.12 });
    }, (i * 65) / cfg.speed));
  }

  playCorrect() {
    this.playSelPlayer();
  }

  /**
   * Opponent solved the frame (gentle notification, non-intrusive)
   */
  playOpponentCorrect() {
    if (!this._ok('opponentCorrect')) return;
    this.tone({ f: 587.33, d: 0.14, v: 0.11, type: 'sine', a: 0.01, dec: 0.04, sus: 0.3, rel: 0.08 });
    this._safeTimeout(() => {
      this.tone({ f: 783.99, d: 0.16, v: 0.13, type: 'sine', a: 0.01, dec: 0.05, sus: 0.3, rel: 0.09 });
    }, 70);
  }

  playSkip() {
    if (!this._ok('skip')) return;
    const cfg = this._sc('skip');
    this._glide('skip', 280, 160, 0.1, 0.14, 'sine');
  }

  /**
   * Gentle, friendly wrong answer feedback (no harsh buzz)
   */
  playWrong() {
    if (!this._ok('wrong')) return;
    this._glide('wrong', 220, 140, 0.18, 0.18, 'sine');
    this.tone({ f: 150, d: 0.18, v: 0.14, type: 'triangle', a: 0.012, dec: 0.06, sus: 0.3, rel: 0.08 });
  }

  playTransition() {
    if (!this._ok('transition')) return;
    this._glide('transition', 300, 420, 0.1, 0.14, 'sine');
  }

  playWinner() {
    if (!this._ok('winner')) return;
    const cfg = this._sc('winner');
    [392, 440, 523.25, 659.25].forEach((f, i) => this._safeTimeout(() => {
      this.tone({ f, d: 0.3, v: 0.18, type: 'sine', a: 0.015, dec: 0.08, sus: 0.4, rel: 0.15 });
    }, (i * 85) / cfg.speed));
  }

  playFanfare() {
    this.playWinner();
  }

  playTick() {
    if (!this._ok('tick') || (this.mgr && !this.mgr.isGameplayActive())) return;
    this._tap('tick', 440, 0.05, 1800);
  }

  playTickWarn() {
    if (!this._ok('tickWarn') || (this.mgr && !this.mgr.isGameplayActive())) return;
    this.tone({ f: 587.33, d: 0.07, v: 0.14, type: 'sine', a: 0.006, dec: 0.03, sus: 0.2, rel: 0.03 });
  }

  playTimeout() {
    if (!this._ok('timeout') || (this.mgr && !this.mgr.isGameplayActive())) return;
    this._glide('timeout', 280, 150, 0.25, 0.16, 'sine');
  }

  /**
   * Magical soft hint shimmer
   */
  playFlare() {
    if (!this._ok('flare')) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this._safeTimeout(() => {
      this.tone({ f, d: 0.18, v: 0.1, type: 'sine', a: 0.01, dec: 0.04, sus: 0.3, rel: 0.1 });
    }, i * 40));
  }

  /**
   * Gentle waterdrop chat ping
   */
  playChat() {
    if (!this._ok('chat')) return;
    const now = performance.now();
    if (now - this._lastChatTime < 250) return;
    this._lastChatTime = now;
    this.tone({ f: 587.33, d: 0.12, v: 0.12, type: 'sine', a: 0.008, dec: 0.04, sus: 0.2, rel: 0.08 });
    this._safeTimeout(() => {
      this.tone({ f: 783.99, d: 0.14, v: 0.14, type: 'sine', a: 0.008, dec: 0.04, sus: 0.2, rel: 0.08 });
    }, 45);
  }

  /**
   * Soft tactile guess submission
   */
  playGuessSubmit() {
    if (!this._ok('guessSubmit')) return;
    const now = performance.now();
    if (now - this._lastGuessSubmitTime < 150) return;
    this._lastGuessSubmitTime = now;
    this._glide('guessSubmit', 340, 220, 0.04, 0.13, 'sine');
  }
}

export default AudioSynth;
