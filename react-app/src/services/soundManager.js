/**
 * Procedural Sound Effects Synthesizer using Web Audio API
 * Generates all acoustic game sounds, clicks, chimes, buzzers, and fanfares on the fly.
 */
const SoundManager = {
  ctx: null,
  masterGain: null,
  limiter: null,
  vol: 0.25,
  muted: false,
  _lastClickTime: 0,
  soundConfig: {},

  _defaultCfg: () => ({ enabled: true, pitch: 1, speed: 1, style: 'default' }),
  _sc(name) {
    if (!this.soundConfig) this.soundConfig = {};
    if (!this.soundConfig[name]) this.soundConfig[name] = this._defaultCfg();
    return this.soundConfig[name];
  },
  _ok(name) { return !this.muted && this._sc(name).enabled; },

  init() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      this.ctx = new AudioContextClass();

      this.masterGain = this.ctx.createGain();

      try {
        const savedVol = localStorage.getItem('gtf_sound_vol');
        if (savedVol !== null) this.vol = Math.max(0, Math.min(1, parseFloat(savedVol)));
        const savedMuted = localStorage.getItem('gtf_sound_muted');
        if (savedMuted !== null) this.muted = savedMuted === 'true';
      } catch (e) {}

      this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.vol, this.ctx.currentTime);

      this.limiter = this.ctx.createDynamicsCompressor();
      this.limiter.threshold.setValueAtTime(-6, this.ctx.currentTime);
      this.limiter.knee.setValueAtTime(10, this.ctx.currentTime);
      this.limiter.ratio.setValueAtTime(12, this.ctx.currentTime);
      this.limiter.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.limiter.release.setValueAtTime(0.15, this.ctx.currentTime);

      this.masterGain.connect(this.limiter);
      this.limiter.connect(this.ctx.destination);
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  _ensure() { if (!this.ctx) this.init(); },

  tone({ f = 440, d = 0.15, type = 'sine', v = 0.8, a = 0.008, dec = 0.06, sus = 0.3, rel = 0.08 }) {
    if (this.muted) return; this._ensure();
    if (!this.ctx || !this.masterGain) return;
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
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
    g.connect(this.masterGain);
    o.onended = () => { try { o.disconnect(); g.disconnect(); } catch (e) {} };
    o.start(t);
    o.stop(t + dur + 0.03);
  },

  _noise(name, { vol = 0.2, hp = 2400, dur = 0.01 } = {}) {
    if (this.muted) return; this._ensure();
    if (!this.ctx || !this.masterGain) return;
    const c = this.ctx, cfg = this._sc(name), t = c.currentTime, D = Math.max(0.004, dur / cfg.speed);
    const buf = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * D)), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);

    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = Math.max(100, hp * cfg.pitch);
    const g = c.createGain();
    g.gain.setValueAtTime(Math.max(0.0001, vol), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + D);

    src.connect(f); f.connect(g); g.connect(this.masterGain);
    src.onended = () => { try { src.disconnect(); f.disconnect(); g.disconnect(); } catch (e) {} };
    src.start(t);
  },

  _glide(name, from, to, dur = 0.1, vol = 0.25, type = 'sine') {
    if (this.muted) return; this._ensure();
    if (!this.ctx || !this.masterGain) return;
    const c = this.ctx, cfg = this._sc(name), t = c.currentTime, D = Math.max(0.02, dur / cfg.speed);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(20, from * cfg.pitch), t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, to * cfg.pitch), t + D);

    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(Math.max(0.0001, vol), t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + D);

    o.connect(g); g.connect(this.masterGain);
    o.onended = () => { try { o.disconnect(); g.disconnect(); } catch (e) {} };
    o.start(t);
    o.stop(t + D + 0.02);
  },

  _thock(name, f = 190, vol = 0.28, dur = 0.09) { this._glide(name, f, f * 0.72, dur, vol, 'sine'); },
  _tap(name, f = 190, vol = 0.25, hp = 1800) { this._noise(name, { vol: vol * 0.75, hp }); this._thock(name, f, vol, 0.08); },

  play(name) {
    if (!name) return;
    switch (name.toLowerCase()) {
      case 'click': this.playClick(); break;
      case 'correct': case 'selplayer': this.playSelPlayer(); break;
      case 'wrong': case 'skip': this.playSkip(); break;
      case 'reveal': this.playReveal(); break;
      case 'scoring': this.playScoring(); break;
      case 'winner': case 'fanfare': this.playWinner(); break;
      case 'start': case 'gamestart': this.playGameStart(); break;
      case 'transition': this.playTransition(); break;
      case 'tick': this.playTick(); break;
      case 'tickwarn': this.playTickWarn(); break;
      default:
        const fn = 'play' + name.charAt(0).toUpperCase() + name.slice(1);
        if (typeof this[fn] === 'function') this[fn]();
        break;
    }
  },

  playTick() {
    if (!this._ok('tick')) return;
    this._tap('tick', 320, 0.08, 2400);
  },

  playTickWarn() {
    if (!this._ok('tickWarn')) return;
    this._tap('tickWarn', 440, 0.12, 3200);
  },

  playClick() {
    if (!this._ok('click')) return;
    const now = performance.now();
    if (now - this._lastClickTime < 45) return;
    this._lastClickTime = now;
    this._noise('click', { vol: 0.18, hp: 2800, dur: 0.008 });
    this._glide('click', 220, 160, 0.07, 0.26, 'sine');
  },

  playHover() {
    if (!this._ok('hover')) return;
    this._noise('hover', { vol: 0.04, hp: 3600, dur: 0.006 });
  },

  playTap() {
    if (!this._ok('tap')) return;
    this._tap('tap', 210, 0.22, 2200);
  },

  playPop() {
    if (!this._ok('pop')) return;
    this._noise('pop', { vol: 0.1, hp: 3000, dur: 0.008 });
    this._thock('pop', 320, 0.22, 0.07);
  },

  playWhoosh() {
    if (!this._ok('whoosh')) return;
    this._noise('whoosh', { vol: 0.14, hp: 800, dur: 0.22 });
    this._glide('whoosh', 440, 140, 0.24, 0.15, 'sine');
  },

  playCountBeep(n) {
    if (!this._ok('countBeep')) return;
    const sm = this._sc('countBeep').speed;
    if (n > 0) {
      this._noise('countBeep', { vol: 0.14, hp: 2600, dur: 0.008 });
      this._thock('countBeep', 180 + (3 - n) * 35, 0.24, 0.12);
    } else {
      [0, 80, 160].forEach((dl, i) => setTimeout(() => {
        this._noise('countBeep', { vol: 0.12, hp: 3000, dur: 0.008 });
        this._thock('countBeep', 260 + i * 65, 0.26, 0.16);
      }, dl / sm));
    }
  },

  playGameStart() {
    if (!this._ok('gameStart')) return;
    const cfg = this._sc('gameStart');
    [160, 220, 294, 392].forEach((f, i) => setTimeout(() => {
      this._noise('gameStart', { vol: 0.14, hp: 2600, dur: 0.01 });
      this._thock('gameStart', f, 0.26, 0.14);
    }, i * 75 / cfg.speed));
    setTimeout(() => this._glide('gameStart', 330, 660, 0.28, 0.18, 'sine'), 320 / cfg.speed);
  },

  playSectionIntro() {
    if (!this._ok('sectionIntro')) return;
    const cfg = this._sc('sectionIntro');
    [180, 240, 320].forEach((f, i) => setTimeout(() => {
      this._noise('sectionIntro', { vol: 0.12, hp: 2400, dur: 0.01 });
      this._thock('sectionIntro', f, 0.25, 0.16);
    }, i * 90 / cfg.speed));
  },

  playRoundStart() {
    if (!this._ok('roundStart')) return;
    const cfg = this._sc('roundStart');
    this._tap('roundStart', 190, 0.26, 2000);
    setTimeout(() => this._thock('roundStart', 290, 0.28, 0.16), 110 / cfg.speed);
  },

  playFrameIn() {
    if (!this._ok('frameIn')) return;
    this._noise('frameIn', { vol: 0.08, hp: 2800, dur: 0.008 });
    this._glide('frameIn', 220, 440, 0.18, 0.18, 'sine');
  },

  playReveal() {
    if (!this._ok('reveal')) return;
    this._noise('reveal', { vol: 0.14, hp: 2200, dur: 0.012 });
    this._thock('reveal', 150, 0.26, 0.24);
    this.tone({ f: 330, d: 0.35, v: 0.2, type: 'triangle', a: 0.02, dec: 0.12, sus: 0.4, rel: 0.18 });
    setTimeout(() => this.tone({ f: 440, d: 0.45, v: 0.24, type: 'sine', a: 0.02, dec: 0.14, sus: 0.5, rel: 0.22 }), 60);
  },

  playScoring() {
    if (!this._ok('scoring')) return;
    const cfg = this._sc('scoring');
    this._thock('scoring', 220, 0.24, 0.12);
    setTimeout(() => this._thock('scoring', 294, 0.26, 0.14), 100 / cfg.speed);
  },

  playSelPlayer() {
    if (!this._ok('selPlayer')) return;
    const cfg = this._sc('selPlayer');
    [0, 70, 140].forEach((dl, i) => setTimeout(() => {
      this._noise('selPlayer', { vol: 0.14, hp: 2800, dur: 0.008 });
      this._thock('selPlayer', 180 + i * 60, 0.25, 0.12);
    }, dl / cfg.speed));
  },

  playSkip() {
    if (!this._ok('skip')) return;
    const cfg = this._sc('skip');
    this._noise('skip', { vol: 0.12, hp: 1600, dur: 0.01 });
    this._thock('skip', 190, 0.24, 0.14);
    setTimeout(() => this._thock('skip', 130, 0.22, 0.18), 70 / cfg.speed);
  },

  playTransition() {
    if (!this._ok('transition')) return;
    this._tap('transition', 240, 0.2, 2200);
  },

  playWinner() {
    if (!this._ok('winner')) return;
    const cfg = this._sc('winner');
    [220, 277, 330, 440, 554].forEach((f, i) => setTimeout(() => {
      this._noise('winner', { vol: 0.12, hp: 3000, dur: 0.01 });
      this.tone({ f, d: 0.35, v: 0.22, type: 'sine', a: 0.02, dec: 0.1, sus: 0.4, rel: 0.2 });
    }, i * 90 / cfg.speed));
  },

  playFanfare() { this.playWinner(); },

  toggleMute() {
    this.muted = !this.muted;
    try { localStorage.setItem('gtf_sound_muted', String(this.muted)); } catch (e) {}
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.vol, this.ctx.currentTime);
    }
    const b = document.getElementById('sndBtn');
    if (b) {
      b.innerHTML = this.muted ? '<svg class="svg-icon"><use href="#icon-volume-x" /></svg>' : '<svg class="svg-icon"><use href="#icon-volume-2" /></svg>';
      b.classList.toggle('muted', this.muted);
    }
    if (!this.muted) this.init();
    return this.muted;
  },

  setVolume(v) {
    this.vol = Math.max(0, Math.min(1, v));
    try { localStorage.setItem('gtf_sound_vol', String(this.vol)); } catch (e) {}
    if (this.masterGain && this.ctx && !this.muted) {
      this.masterGain.gain.setValueAtTime(this.vol, this.ctx.currentTime);
    }
  },

  resetSounds() {
    this.soundConfig = {};
  }
};

export default SoundManager;
