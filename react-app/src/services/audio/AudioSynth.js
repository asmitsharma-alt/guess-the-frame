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

    // Ramp down and disconnect all active nodes immediately
    const c = this.ctx;
    if (c) {
      const now = c.currentTime;
      for (const node of this.activeNodes) {
        try {
          if (node.gain) {
            node.gain.cancelScheduledValues(now);
            node.gain.linearRampToValueAtTime(0.0001, now + 0.02);
          }
          if (node.stop) {
            node.stop(now + 0.025);
          }
        } catch (e) {}
      }
    }
    this.activeNodes.clear();
  }

  _trackNode(node) {
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

  tone({ f = 440, d = 0.15, type = 'sine', v = 0.8, a = 0.008, dec = 0.06, sus = 0.3, rel = 0.08 } = {}) {
    if (!this._ok('tone')) return;
    const c = this.ctx;
    const out = this.masterGain;
    if (!c || !out) return;

    const t = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(20, f), t);

    const A = Math.max(0.002, a);
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

  _noise(name, { vol = 0.2, hp = 2400, dur = 0.01 } = {}) {
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

    const f = c.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.setValueAtTime(Math.max(100, hp * cfg.pitch), t);

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

  _glide(name, from, to, dur = 0.1, vol = 0.25, type = 'sine') {
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
    g.gain.linearRampToValueAtTime(Math.max(0.0001, vol), t + 0.004);
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

  _thock(name, f = 190, vol = 0.28, dur = 0.09) {
    this._glide(name, f, f * 0.72, dur, vol, 'sine');
  }

  _tap(name, f = 190, vol = 0.25, hp = 1800) {
    this._noise(name, { vol: vol * 0.75, hp });
    this._thock(name, f, vol, 0.08);
  }

  // --- Sound Effects Implementations ---

  playClick() {
    if (!this._ok('click')) return;
    const now = performance.now();
    if (now - this._lastClickTime < 45) return;
    this._lastClickTime = now;
    this._noise('click', { vol: 0.18, hp: 2800, dur: 0.008 });
    this._glide('click', 220, 160, 0.07, 0.26, 'sine');
  }

  playTap() {
    if (!this._ok('tap')) return;
    this._tap('tap', 210, 0.22, 2200);
  }

  playPop() {
    if (!this._ok('pop')) return;
    this._noise('pop', { vol: 0.1, hp: 3000, dur: 0.008 });
    this._thock('pop', 320, 0.22, 0.07);
  }

  playWhoosh() {
    if (!this._ok('whoosh')) return;
    this._noise('whoosh', { vol: 0.14, hp: 800, dur: 0.22 });
    this._glide('whoosh', 440, 140, 0.24, 0.15, 'sine');
  }

  playCountBeep(n) {
    if (!this._ok('countBeep')) return;
    const sm = this._sc('countBeep').speed;
    if (n > 0) {
      this._noise('countBeep', { vol: 0.14, hp: 2600, dur: 0.008 });
      this._thock('countBeep', 180 + (3 - n) * 35, 0.24, 0.12);
    } else {
      [0, 80, 160].forEach((dl, i) => this._safeTimeout(() => {
        this._noise('countBeep', { vol: 0.12, hp: 3000, dur: 0.008 });
        this._thock('countBeep', 260 + i * 65, 0.26, 0.16);
      }, dl / sm));
    }
  }

  playGameStart() {
    if (!this._ok('gameStart')) return;
    const cfg = this._sc('gameStart');
    [160, 220, 294, 392].forEach((f, i) => this._safeTimeout(() => {
      this._noise('gameStart', { vol: 0.14, hp: 2600, dur: 0.01 });
      this._thock('gameStart', f, 0.26, 0.14);
    }, (i * 75) / cfg.speed));
    this._safeTimeout(() => this._glide('gameStart', 330, 660, 0.28, 0.18, 'sine'), 320 / cfg.speed);
  }

  playSectionIntro() {
    if (!this._ok('sectionIntro')) return;
    const cfg = this._sc('sectionIntro');
    [180, 240, 320].forEach((f, i) => this._safeTimeout(() => {
      this._noise('sectionIntro', { vol: 0.12, hp: 2400, dur: 0.01 });
      this._thock('sectionIntro', f, 0.25, 0.16);
    }, (i * 90) / cfg.speed));
  }

  playRoundStart() {
    if (!this._ok('roundStart')) return;
    const cfg = this._sc('roundStart');
    this._tap('roundStart', 190, 0.26, 2000);
    this._safeTimeout(() => this._thock('roundStart', 290, 0.28, 0.16), 110 / cfg.speed);
  }

  playFrameIn() {
    if (!this._ok('frameIn')) return;
    this._noise('frameIn', { vol: 0.08, hp: 2800, dur: 0.008 });
    this._glide('frameIn', 220, 440, 0.18, 0.18, 'sine');
  }

  playReveal() {
    if (!this._ok('reveal')) return;
    this._noise('reveal', { vol: 0.14, hp: 2200, dur: 0.012 });
    this._thock('reveal', 150, 0.26, 0.24);
    this.tone({ f: 330, d: 0.35, v: 0.2, type: 'triangle', a: 0.02, dec: 0.12, sus: 0.4, rel: 0.18 });
    this._safeTimeout(() => {
      this.tone({ f: 440, d: 0.45, v: 0.24, type: 'sine', a: 0.02, dec: 0.14, sus: 0.5, rel: 0.22 });
    }, 60);
  }

  playScoring() {
    if (!this._ok('scoring')) return;
    const cfg = this._sc('scoring');
    this._thock('scoring', 220, 0.24, 0.12);
    this._safeTimeout(() => this._thock('scoring', 294, 0.26, 0.14), 100 / cfg.speed);
  }

  /**
   * Correct answer celebratory chime (for local player)
   */
  playSelPlayer() {
    if (!this._ok('selPlayer')) return;
    const cfg = this._sc('selPlayer');
    [0, 70, 140].forEach((dl, i) => this._safeTimeout(() => {
      this._noise('selPlayer', { vol: 0.14, hp: 2800, dur: 0.008 });
      this._thock('selPlayer', 180 + i * 60, 0.25, 0.12);
    }, dl / cfg.speed));
  }

  playCorrect() {
    this.playSelPlayer();
  }

  /**
   * Opponent solved the frame (gentle notification, non-intrusive)
   */
  playOpponentCorrect() {
    if (!this._ok('opponentCorrect')) return;
    this._tap('opponentCorrect', 300, 0.18, 2200);
    this._safeTimeout(() => {
      this.tone({ f: 440, d: 0.16, v: 0.15, type: 'triangle', a: 0.01, dec: 0.05, sus: 0.2, rel: 0.08 });
    }, 80);
  }

  playSkip() {
    if (!this._ok('skip')) return;
    const cfg = this._sc('skip');
    this._noise('skip', { vol: 0.12, hp: 1600, dur: 0.01 });
    this._thock('skip', 190, 0.24, 0.14);
    this._safeTimeout(() => this._thock('skip', 130, 0.22, 0.18), 70 / cfg.speed);
  }

  /**
   * Distinct wrong answer buzzer
   */
  playWrong() {
    if (!this._ok('wrong')) return;
    this._glide('wrong', 190, 110, 0.18, 0.22, 'sawtooth');
    this._noise('wrong', { vol: 0.1, hp: 1200, dur: 0.02 });
  }

  playTransition() {
    if (!this._ok('transition')) return;
    this._tap('transition', 240, 0.2, 2200);
  }

  playWinner() {
    if (!this._ok('winner')) return;
    const cfg = this._sc('winner');
    [220, 277, 330, 440, 554].forEach((f, i) => this._safeTimeout(() => {
      this._noise('winner', { vol: 0.12, hp: 3000, dur: 0.01 });
      this.tone({ f, d: 0.35, v: 0.22, type: 'sine', a: 0.02, dec: 0.1, sus: 0.4, rel: 0.2 });
    }, (i * 90) / cfg.speed));
  }

  playFanfare() {
    this.playWinner();
  }

  playTick() {
    if (!this._ok('tick') || (this.mgr && !this.mgr.isGameplayActive())) return;
    this._tap('tick', 320, 0.07, 2400);
  }

  playTickWarn() {
    if (!this._ok('tickWarn') || (this.mgr && !this.mgr.isGameplayActive())) return;
    this._tap('tickWarn', 440, 0.13, 3200);
  }

  playTimeout() {
    if (!this._ok('timeout') || (this.mgr && !this.mgr.isGameplayActive())) return;
    this._thock('timeout', 140, 0.28, 0.25);
    this._glide('timeout', 160, 80, 0.3, 0.22, 'triangle');
  }

  /**
   * Magical hint shimmer (Fix for BUG-01)
   */
  playFlare() {
    if (!this._ok('flare')) return;
    this._noise('flare', { vol: 0.09, hp: 3200, dur: 0.03 });
    [392, 523.25, 659.25, 783.99].forEach((f, i) => this._safeTimeout(() => {
      this.tone({ f, d: 0.2, v: 0.16, type: 'triangle', a: 0.008, dec: 0.05, sus: 0.3, rel: 0.1 });
    }, i * 45));
  }

  /**
   * Gentle chat notification ping (Fix for BUG-04)
   */
  playChat() {
    if (!this._ok('chat')) return;
    const now = performance.now();
    if (now - this._lastChatTime < 280) return; // 280ms chat cooldown
    this._lastChatTime = now;
    this.tone({ f: 659.25, d: 0.12, v: 0.12, type: 'sine', a: 0.005, dec: 0.04, sus: 0.2, rel: 0.06 });
  }

  /**
   * Soft guess submission feedback
   */
  playGuessSubmit() {
    if (!this._ok('guessSubmit')) return;
    const now = performance.now();
    if (now - this._lastGuessSubmitTime < 150) return;
    this._lastGuessSubmitTime = now;
    this._tap('guessSubmit', 240, 0.12, 2600);
  }
}

export default AudioSynth;
