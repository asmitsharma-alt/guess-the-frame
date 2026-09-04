
    /* ═══ NAV ═══ */
    function showHowToPlay() {
      SoundManager.playClick();
      PlayerLobby.show();
    }
    function goHome() { SoundManager.playClick(); PaletteManager.reset(); UI.showScreen('homeScreen'); }

        /* ═══ SECURITY & SANITIZATION UTILITIES ═══ */
    const SecurityUtil = {
      escapeHtml(str) {
        if (str == null) return '';
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      }
    };

    /* ═══ PLAYER LOBBY ═══ */
    const PlayerLobby = {
      _originalPlayers: [],
      show() {
        SoundManager.playClick();
        this._originalPlayers = GS.players.map(p => ({ ...p }));
        this.render();
        UI.showScreen('playerLobbyScreen');
        if (GS.players.length === 1) {
          // Solo games load the current frame on demand instead of blocking here.
          UI.updateLoadProgress(100, 'lobby');
        } else {
          UI.updateLoadProgress(0, 'lobby');
          FrameDisplay.preloadAll(p => UI.updateLoadProgress(p, 'lobby'));
        }
      },
      render() {
        const list = document.getElementById('lobbyPlayerList');
        const count = document.getElementById('lobbyCount');
        const warn = document.getElementById('lobbyMinWarn');
        const startBtn = document.getElementById('lobbyStartBtn');
        const colors = ['var(--nb-pink, #FF6B9D)', 'var(--nb-blue, #3B82F6)', 'var(--nb-yellow, #FACC15)', 'var(--nb-green, #84CC16)', 'var(--nb-orange, #FB923C)'];
        list.innerHTML = GS.players.map((p, i) => {
          const color = colors[i % colors.length];
          const avHtml = renderAvatar(p, 'lp');
          const safeName = SecurityUtil.escapeHtml(p.name);
          const pSlot = `P${i + 1}`;
          return `<div class="lobby-player" style="background: ${color};" data-index="${i}">
            <div class="lp-top-bar">
              <span class="lp-tag">${pSlot}</span>
              <button class="lp-remove" onclick="PlayerLobby.remove(${i})" title="Remove ${safeName}" aria-label="Remove ${safeName}">✕</button>
            </div>
            <div class="lp-avatar-wrap">${avHtml}</div>
            <div class="lp-name-badge">
              <span class="lp-name-text">${safeName}</span>
            </div>
          </div>`;
        }).join('');
        
        const dots = Array.from({ length: 4 }, (_, idx) => 
          `<span class="lobby-dot ${idx < GS.players.length ? 'active' : ''}"></span>`
        ).join('');
        
        count.innerHTML = `<div class="lobby-dots">${dots}</div><span>${GS.players.length} / 4 PLAYERS READY</span>`;
        const canStart = GS.players.length === 1 || (GS.players.length > 1 && GS.framesLoaded);
        startBtn.disabled = !canStart;
        if (warn) {
          if (GS.players.length < 1) {
            warn.innerHTML = '<svg class="svg-icon"><use href="#icon-triangle-alert" /></svg> Need at least 1 player to start';
            warn.classList.add('visible');
          } else {
            warn.classList.remove('visible');
          }
        }
      },
      remove(i) {
        if (GS.players.length <= 1) {
          SoundManager.playSkip();
          const warn = document.getElementById('lobbyMinWarn');
          if (warn) warn.classList.add('visible');
          return;
        }
        SoundManager.playClick();
        const player = GS.players[i];
        const doRemove = () => {
          if (GS.players.length <= 1) { this.render(); return; }
          const idx = GS.players.indexOf(player);
          if (idx !== -1) GS.players.splice(idx, 1);
          this.render();
        };
        const items = document.querySelectorAll('#lobbyPlayerList .lobby-player');
        if (items[i]) {
          items[i].classList.add('removing');
          setTimeout(doRemove, 220);
        } else {
          doRemove();
        }
      },
      start() {
        if (GameController._onlineMode && MultiplayerEngine.isHost) { MultiplayerEngine.startMatch(); return; }
        if (GS.players.length < 1 || (GS.players.length > 1 && !GS.framesLoaded)) return;
        SoundManager.playClick();
        GameController.startGame();
      },
      back() {
        SoundManager.playClick();
        GS.players = this._originalPlayers.map(p => ({ ...p }));
        UI.showScreen('homeScreen');
      }
    };

    /* ═══ PREMIUM SOUND DESIGN ENGINE (Synthesized, Ear-Safe, 60fps) ═══ */
    const SoundManager = {
      ctx: null,
      masterGain: null,
      limiter: null,
      vol: 0.25,
      muted: false,
      _lastClickTime: 0,
      soundConfig: {},

      /* ── Per-sound config ── */
      _defaultCfg: () => ({ enabled: true, pitch: 1, speed: 1, style: 'default' }),
      _sc(name) {
        if (!this.soundConfig) this.soundConfig = {};
        if (!this.soundConfig[name]) this.soundConfig[name] = SoundManager._defaultCfg();
        return this.soundConfig[name];
      },
      _ok(name) { return !this.muted && this._sc(name).enabled; },

      /* ── Audio Engine Initialization with Ear-Safe Master Bus ── */
      init() {
        if (!this.ctx) {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          if (!AudioContextClass) return;
          this.ctx = new AudioContextClass();

          // Master Gain Stage
          this.masterGain = this.ctx.createGain();
          
          // Restore saved volume preference
          try {
            const savedVol = localStorage.getItem('gtf_sound_vol');
            if (savedVol !== null) this.vol = Math.max(0, Math.min(1, parseFloat(savedVol)));
            const savedMuted = localStorage.getItem('gtf_sound_muted');
            if (savedMuted !== null) this.muted = savedMuted === 'true';
          } catch(e){}

          this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.vol, this.ctx.currentTime);

          // Professional Dynamics Compressor (Prevents ear fatigue & distortion)
          this.limiter = this.ctx.createDynamicsCompressor();
          this.limiter.threshold.setValueAtTime(-6, this.ctx.currentTime);
          this.limiter.knee.setValueAtTime(10, this.ctx.currentTime);
          this.limiter.ratio.setValueAtTime(12, this.ctx.currentTime);
          this.limiter.attack.setValueAtTime(0.003, this.ctx.currentTime);
          this.limiter.release.setValueAtTime(0.15, this.ctx.currentTime);

          // Connect Chain: Source -> MasterGain -> Limiter -> Output
          this.masterGain.connect(this.limiter);
          this.limiter.connect(this.ctx.destination);
        }
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume();
        }
      },
      _ensure() { if (!this.ctx) this.init(); },

      /* ── Clean Tone & Oscillator Synthesizer ── */
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
        o.onended = () => { try { o.disconnect(); g.disconnect(); } catch(e){} };
        o.start(t);
        o.stop(t + dur + 0.03);
      },

      /* ── Soft Tactile Noise Generator (Crisp Physical Press Transient) ── */
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
        src.onended = () => { try { src.disconnect(); f.disconnect(); g.disconnect(); } catch(e){} };
        src.start(t);
      },

      /* ── Pitch Glide (Warm Resonant Body) ── */
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
        o.onended = () => { try { o.disconnect(); g.disconnect(); } catch(e){} };
        o.start(t);
        o.stop(t + D + 0.02);
      },

      _thock(name, f = 190, vol = 0.28, dur = 0.09) { this._glide(name, f, f * 0.72, dur, vol, 'sine'); },
      _tap(name, f = 190, vol = 0.25, hp = 1800) { this._noise(name, { vol: vol * 0.75, hp }); this._thock(name, f, vol, 0.08); },

      /* ── Tactile Acoustic UI Sound Palette ── */
      playClick() {
        if (!this._ok('click')) return;
        const now = performance.now();
        if (now - this._lastClickTime < 45) return; // Anti-spam debounce
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

      /* ── User Accessibility Controls & Settings ── */
      toggleMute() {
        this.muted = !this.muted;
        try { localStorage.setItem('gtf_sound_muted', String(this.muted)); } catch(e){}
        if (this.masterGain && this.ctx) {
          this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.vol, this.ctx.currentTime);
        }
        const b = document.getElementById('sndBtn');
        if (b) {
          b.innerHTML = this.muted ? '<svg class="svg-icon"><use href="#icon-volume-x" /></svg>' : '<svg class="svg-icon"><use href="#icon-volume-2" /></svg>';
          b.classList.toggle('muted', this.muted);
        }
        if (!this.muted) this.init();
      },

      setVolume(v) {
        this.vol = Math.max(0, Math.min(1, v));
        try { localStorage.setItem('gtf_sound_vol', String(this.vol)); } catch(e){}
        if (this.masterGain && this.ctx && !this.muted) {
          this.masterGain.gain.setValueAtTime(this.vol, this.ctx.currentTime);
        }
      },

      resetSounds() {
        this.soundConfig = {};
      }
    };

    document.addEventListener('click', () => SoundManager.init(), { once: true });
    document.addEventListener('keydown', () => SoundManager.init(), { once: true });

    /* ═══ GAME STATE ═══ */
    const GS = {
      PHASES: { IDLE: 'IDLE', ROUND_ACTIVE: 'ROUND_ACTIVE', JUDGE_PHASE: 'JUDGE_PHASE', ANSWER_REVEAL: 'ANSWER_REVEAL', SCORING_PHASE: 'SCORING_PHASE', ROUND_TRANSITION: 'ROUND_TRANSITION', WINNER_SCREEN: 'WINNER_SCREEN' },
      currentPhase: 'IDLE',
      sections: [
        {
          id: 1, name: 'Guess the Frame', icon: '<svg class="svg-icon"><use href="#icon-film" /></svg>', collapsed: false, frames: [
            { type: 'image', content: 'GUESSTHEFRAME/2001 A Space Odyssey (1968).png', answer: '2001 A SPACE ODYSSEY', year: '1968' },
            { type: 'image', content: 'GUESSTHEFRAME/A Wednesday (2008).jpg', answer: 'A WEDNESDAY', year: '2008' },
            { type: 'image', content: 'GUESSTHEFRAME/Athiradi(2026).png', answer: 'ATHIRADI', year: '2026' },
            { type: 'image', content: 'GUESSTHEFRAME/Boogie Nights (1997).png', answer: 'BOOGIE NIGHTS', year: '1997' },
            { type: 'image', content: 'GUESSTHEFRAME/Drishyam 3(2026).png', answer: 'DRISHYAM 3', year: '2026' },
            { type: 'image', content: 'GUESSTHEFRAME/Ferrari Ki Sawaari (2012).jpg', answer: 'FERRARI KI SAWAARI', year: '2012' },
            { type: 'image', content: 'GUESSTHEFRAME/Gram Chikitsalaya Season 2 (2026).png', answer: 'GRAM CHIKITSALAYA SEASON 2', year: '2026' },
            { type: 'image', content: 'GUESSTHEFRAME/I Swear (2025).png', answer: 'I SWEAR', year: '2025' },
            { type: 'image', content: 'GUESSTHEFRAME/Licorice Pizza (2021).png', answer: 'LICORICE PIZZA', year: '2021' },
            { type: 'image', content: 'GUESSTHEFRAME/Made In India A Titan Story(2026).png', answer: 'MADE IN INDIA A TITAN STORY', year: '2026' },
            { type: 'image', content: 'GUESSTHEFRAME/Mulholland Drive (2001).jpg', answer: 'MULHOLLAND DRIVE', year: '2001' },
            { type: 'image', content: 'GUESSTHEFRAME/No Smoking (2007).jpg', answer: 'NO SMOKING', year: '2007' },
            { type: 'image', content: 'GUESSTHEFRAME/Peepli Live (2010).jpg', answer: 'PEEPLI LIVE', year: '2010' },
            { type: 'image', content: 'GUESSTHEFRAME/Rush (2023).png', answer: 'RUSH', year: '2023' },
            { type: 'image', content: 'GUESSTHEFRAME/Sapne Vs Everyone(2023).png', answer: 'SAPNE VS EVERYONE', year: '2023' },
            { type: 'image', content: 'GUESSTHEFRAME/The Drama (2026).jpg', answer: 'THE DRAMA', year: '2026' },
            { type: 'image', content: 'GUESSTHEFRAME/The Sheep Detectives (2026).png', answer: 'THE SHEEP DETECTIVES', year: '2026' },
            { type: 'image', content: 'GUESSTHEFRAME/Widow_s Bay (2026).png', answer: "WIDOW'S BAY", year: '2026' },
            { type: 'image', content: 'GUESSTHEFRAME/Wind River (2017).jpg', answer: 'WIND RIVER', year: '2017' },
            { type: 'image', content: 'GUESSTHEFRAME/Zero (2018).jpg', answer: 'ZERO', year: '2018' }
          ]
        },
        {
          id: 2, name: 'Guess the Dialogue', icon: '<svg class="svg-icon"><use href="#icon-message-circle" /></svg>', collapsed: false, frames: [
            { type: 'dialogue', dialogue: "Aaya hoon, kuch toh loot kar jaunga... Khandani chor hoon main, khandani!", answer: 'ANDAAZ APNA APNA', year: '1994' },
            { type: 'dialogue', dialogue: "Khoon kharabe wale khandan se aata hoon... roz subah uthkar 2-4 khoon na karoon toh mera naashta hazam nahi hota!", answer: 'HUNGAMA', year: '2003' },
            { type: 'dialogue', dialogue: "Yeh koi tareeka hai bheek maangne ka?!", answer: 'GOLMAAL', year: '2006' },
            { type: 'dialogue', dialogue: "Meri ek taang nakli hai, main hockey ka bohot bada khiladi tha...", answer: 'WELCOME', year: '2007' },
            { type: 'dialogue', dialogue: "Arey \u20b95 mein chicken biryani de raha hai re woh!", answer: 'RUN', year: '2004' },
            { type: 'dialogue', dialogue: "Hi, guys. We're going on a national bikini tour, and we're looking for two oil boys who can grease us up before each competition.", answer: 'DUMB AND DUMBER', year: '1994' },
            { type: 'dialogue', dialogue: "It\u2019s not a purse, it\u2019s a satchel. Gods and Indiana Jones wears one.", answer: 'THE HANGOVER', year: '2009' },
            { type: 'dialogue', dialogue: "I'm not Bad. I'm just Drawn That Way.", answer: 'WHO FRAMED ROGER RABBIT', year: '1988' },
            { type: 'dialogue', dialogue: "I don't want to survive. I want to live.", answer: 'WALL-E', year: '2008' },
            { type: 'dialogue', dialogue: "I wasted so much time worrying what could go wrong, but what did go wrong, was never the things I worried about.", answer: 'THE WORST PERSON IN THE WORLD', year: '2021' }
          ]
        },
        {
          id: 3, name: 'Guess the Eye', icon: '<svg class="svg-icon"><use href="#icon-eye" /></svg>', collapsed: false, frames: [
            { type: 'eye', content: 'GUESSTHEEYES/Adria Arjona copy.png', revealContent: 'GUESSTHEEYES/Adria Arjona.png', answer: 'ADRIA ARJONA', year: '' },
            { type: 'eye', content: 'GUESSTHEEYES/Anthony Mackie copy.png', revealContent: 'GUESSTHEEYES/Anthony Mackie.png', answer: 'ANTHONY MACKIE', year: '' },
            { type: 'eye', content: 'GUESSTHEEYES/Antony Starr copy.png', revealContent: 'GUESSTHEEYES/Antony Starr.png', answer: 'ANTONY STARR', year: '' },
            { type: 'eye', content: 'GUESSTHEEYES/Emily Blunt copy.png', revealContent: 'GUESSTHEEYES/Emily Blunt.png', answer: 'EMILY BLUNT', year: '' },
            { type: 'eye', content: 'GUESSTHEEYES/Emma Stone copy.png', revealContent: 'GUESSTHEEYES/Emma Stone.png', answer: 'EMMA STONE', year: '' },
            { type: 'eye', content: 'GUESSTHEEYES/Kate Hudson copy.png', revealContent: 'GUESSTHEEYES/Kate Hudson.png', answer: 'KATE HUDSON', year: '' },
            { type: 'eye', content: 'GUESSTHEEYES/Olivia Cooke copy.png', revealContent: 'GUESSTHEEYES/Olivia Cooke.png', answer: 'OLIVIA COOKE', year: '' },
            { type: 'eye', content: 'GUESSTHEEYES/Rachel Brosnahan copy.png', revealContent: 'GUESSTHEEYES/Rachel Brosnahan.png', answer: 'RACHEL BROSNAHAN', year: '' },
            { type: 'eye', content: 'GUESSTHEEYES/Shraddha Kapoor copy.png', revealContent: 'GUESSTHEEYES/Shraddha Kapoor.png', answer: 'SHRADDHA KAPOOR', year: '' },
            { type: 'eye', content: 'GUESSTHEEYES/Zoe Saldan\u0303a copy.png', revealContent: 'GUESSTHEEYES/Zoe Saldan\u0303a.png', answer: 'ZOE SALDA\u00d1A', year: '' }
          ]
        }
      ],
      players: [
        { name: 'AMAN', score: 0, avatar: 'cat', avatarImg: 'avvtar/aman.svg' },
        { name: 'AMISH', score: 0, avatar: 'ghost', avatarImg: 'avvtar/amish.svg' },
        { name: 'VISH', score: 0, avatar: 'dog', avatarImg: 'avvtar/vish.svg' },
        { name: 'AZIZ', score: 0, avatar: 'circle', avatarImg: 'avvtar/aziz.svg' }
      ],
      judge: { totalRounds: 0, totalPlayers: 0, roundsPerJudge: 1, globalRoundIndex: 0, currentJudge: null, currentJudgeIndex: -1, currentJudgeRoundsServed: 0, usedJudges: [], cycleCount: 0, judgeAnswered: false, judgeRewardGiven: false },
      scoring: { locked: false, completed: false },
      roundSkipped: false,
      tieBreaker: {
        active: false,
        roundIndex: 0,
        playerKeys: [],
        frame: null,
        usedFrameKeys: [],
        frames: [
          { type: 'image', content: 'tie breaker/Anatomy of a Fall (2023).jpg', answer: 'ANATOMY OF A FALL', year: '2023' },
          { type: 'image', content: 'tie breaker/Eyes Wide Shut (1999).png', answer: 'EYES WIDE SHUT', year: '1999' },
          { type: 'image', content: 'tie breaker/Ghilli (2004).png', answer: 'GHILLI', year: '2004' },
          { type: 'image', content: 'tie breaker/La Haine(1995).jpg', answer: 'LA HAINE', year: '1995' },
          { type: 'image', content: 'tie breaker/Mad Max 2.jpg.jpeg', answer: 'MAD MAX 2', year: '1981' },
          { type: 'image', content: 'tie breaker/Moonrise Kingdom (2012).png', answer: 'MOONRISE KINGDOM', year: '2012' },
          { type: 'image', content: 'tie breaker/The Batman (2022).png', answer: 'THE BATMAN', year: '2022' },
          { type: 'image', content: 'tie breaker/The Holdovers(2023).jpg', answer: 'THE HOLDOVERS', year: '2023' },
          { type: 'image', content: 'tie breaker/The Life of Chuck(2024).jpg', answer: 'THE LIFE OF CHUCK', year: '2024' },
          { type: 'image', content: 'tie breaker/The Lighthouse (2019).png', answer: 'THE LIGHTHOUSE', year: '2019' },
          { type: 'image', content: 'tie breaker/The Wolf of Wall Street (2013).png', answer: 'THE WOLF OF WALL STREET', year: '2013' },
          { type: 'image', content: 'tie breaker/They Call Him OG (2025).jpg', answer: 'THEY CALL HIM OG', year: '2025' },
          { type: 'image', content: 'tie breaker/Top Gun Maverick (2022).jpg', answer: 'TOP GUN MAVERICK', year: '2022' },
          { type: 'image', content: 'tie breaker/Under the Silver Lake (2018).jpg', answer: 'UNDER THE SILVER LAKE', year: '2018' }
        ]
      },
      currentSection: 0, currentSectionRound: 0,
      settings: {
        timerDuration: 20, judgePhaseDuration: 5, answerRevealDuration: 2, pointsPerAnswer: 10, judgePoints: 20, creatorMessage: 'tanmayy, Tanuj, Darshan, Akash, Anmol and members of smoc.',

      },
      activeTimerId: null, timeRemaining: 0, nextSectionId: 4,
      imageCache: new Map(),
      currentFrameLoader: null,
      framesLoaded: false
    };

    const sectionIcons = ['<svg class="svg-icon"><use href="#icon-clapperboard" /></svg>', '<svg class="svg-icon"><use href="#icon-video" /></svg>', '<svg class="svg-icon"><use href="#icon-message-circle" /></svg>', '<svg class="svg-icon"><use href="#icon-tv" /></svg>', '<svg class="svg-icon"><use href="#icon-smile" /></svg>', '<svg class="svg-icon"><use href="#icon-tent" /></svg>', '<svg class="svg-icon"><use href="#icon-palette" /></svg>', '<svg class="svg-icon"><use href="#icon-gamepad-2" /></svg>', '<svg class="svg-icon"><use href="#icon-target" /></svg>', '<svg class="svg-icon"><use href="#icon-music" /></svg>', '<svg class="svg-icon"><use href="#icon-audio-lines" /></svg>'];
    const taglines = ['Get Ready!', 'Here We Go!', 'Eyes on Screen!', 'Think Fast!', 'Can You Guess?'];

    /* ═══ STATE MACHINE ═══ */
    /* ═══ AVATAR HELPER ═══ */
    function renderAvatar(p, type) {
      if (p && p.avatarImg) {
        return `<img src="${p.avatarImg}" alt="${p.name || ''}" class="av-img-elem" style="width:100%;height:100%;max-width:100%;max-height:100%;object-fit:contain;object-position:center;border-radius:50%;display:block;">`;
      }
      const icon = (p && p.avatar) ? `<svg class="svg-icon" style="width:1.4em;height:1.4em;"><use href="#icon-${p.avatar}" /></svg>` : (p && p.name ? p.name.charAt(0).toUpperCase() : '?');
      return `<span style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:18px;font-family:'DM Sans',sans-serif;font-weight:900;">${icon}</span>`;
    }

    function playerKey(p) {
      return [p && p.id || '', p && p.name || '', p && p.avatar || '', p && p.avatarImg || ''].join('::');
    }

    const PaletteManager = {
      framePalettesEnabled: true,
      defaults: {
        '--bg-dark': '#e9e4ff',
        '--bg-light': '#ffe9f3',
        '--neon-pink': '#ff7eb6',
        '--neon-blue': '#57c3e0',
        '--neon-purple': '#a06bd6',
        '--gold': '#f0a828',
        '--teal': '#3fb9ad',
        /* clay-pastel frame-adaptive vars (default = clay theme) */
        '--frame-bg-1': '#e9e4ff',
        '--frame-bg-2': '#ffe9f3',
        '--frame-accent': '#ff9ecb',
        '--frame-accent-2': '#c3a9e6'
      },
      /* force hue from a colour, but clamp saturation/lightness to stay clay-soft */
      _pastel(rgb, s, l) {
        const hsl = this._rgbToHsl(rgb);
        return this._hslToRgb({ h: hsl.h, s, l });
      },
      apply(vars) {
        const root = document.documentElement;
        Object.entries(vars).forEach(([key, val]) => root.style.setProperty(key, val));
      },
      reset() {
        this.apply(this.defaults);
      },
      fromImage(img) {
        if (!this.framePalettesEnabled) return;
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) return;

          const w = 48, h = 48;
          canvas.width = w;
          canvas.height = h;
          ctx.drawImage(img, 0, 0, w, h);

          const data = ctx.getImageData(0, 0, w, h).data;
          const buckets = new Map();
          let totalR = 0, totalG = 0, totalB = 0, totalWeight = 0;

          for (let i = 0; i < data.length; i += 16) {
            const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
            if (a < 180) continue;
            const max = Math.max(r, g, b), min = Math.min(r, g, b);
            if (max < 22 || min > 238) continue;

            const sat = max === 0 ? 0 : (max - min) / max;
            const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            const weight = 0.45 + sat * 1.8 + (lum > 45 && lum < 215 ? 0.8 : 0);
            const key = `${Math.round(r / 32) * 32},${Math.round(g / 32) * 32},${Math.round(b / 32) * 32}`;
            const bucket = buckets.get(key) || { r: 0, g: 0, b: 0, w: 0, score: 0 };

            bucket.r += r * weight;
            bucket.g += g * weight;
            bucket.b += b * weight;
            bucket.w += weight;
            bucket.score += weight * (0.6 + sat);
            buckets.set(key, bucket);

            totalR += r * weight;
            totalG += g * weight;
            totalB += b * weight;
            totalWeight += weight;
          }

          if (!totalWeight || !buckets.size) return;

          const colors = [...buckets.values()]
            .map(c => this._boost({ r: c.r / c.w, g: c.g / c.w, b: c.b / c.w }, 1.18, 1.08, c.score))
            .sort((a, b) => b.score - a.score);

          const primary = colors[0];
          const secondary = this._pickDistinct(colors, primary, 44) || this._rotate(primary, 110);
          const tertiary = this._pickDistinct(colors, primary, 78, secondary) || this._rotate(primary, -95);
          const average = this._boost({ r: totalR / totalWeight, g: totalG / totalWeight, b: totalB / totalWeight }, 0.8, 0.58);
          const dark = this._shade(average, 0.18);
          const light = this._shade(average, 0.32);
          const goldish = this._warm(primary, secondary);

          this.apply({
            '--bg-dark': this._hex(dark),
            '--bg-light': this._hex(light),
            '--neon-pink': this._hex(primary),
            '--neon-blue': this._hex(secondary),
            '--neon-purple': this._hex(tertiary),
            '--gold': this._hex(goldish),
            '--teal': this._hex(this._rotate(secondary, 34)),
            /* clay-soft tints derived from the frame — hue follows the image,
               lightness stays high so the page keeps its pastel clay feel */
            '--frame-bg-1': this._hex(this._pastel(primary, 0.46, 0.89)),
            '--frame-bg-2': this._hex(this._pastel(secondary, 0.44, 0.82)),
            '--frame-accent': this._hex(this._pastel(primary, 0.74, 0.73)),
            '--frame-accent-2': this._hex(this._pastel(secondary, 0.64, 0.70))
          });
        } catch (e) {
          console.warn('Could not extract frame palette:', e);
        }
      },
      _boost(color, satMul, lightMul, score = 0) {
        const hsl = this._rgbToHsl(color);
        hsl.s = Math.min(0.92, Math.max(0.42, hsl.s * satMul));
        hsl.l = Math.min(0.68, Math.max(0.42, hsl.l * lightMul));
        return { ...this._hslToRgb(hsl), score };
      },
      _shade(color, amount) {
        const hsl = this._rgbToHsl(color);
        hsl.s = Math.min(0.55, hsl.s * 0.9);
        hsl.l = amount;
        return this._hslToRgb(hsl);
      },
      _warm(a, b) {
        const ah = this._rgbToHsl(a), bh = this._rgbToHsl(b);
        const hue = ah.h >= 25 && ah.h <= 70 ? ah.h : (bh.h >= 25 && bh.h <= 70 ? bh.h : 43);
        return this._hslToRgb({ h: hue, s: 0.88, l: 0.58 });
      },
      _rotate(color, deg) {
        const hsl = this._rgbToHsl(color);
        hsl.h = (hsl.h + deg + 360) % 360;
        hsl.s = Math.min(0.9, Math.max(0.5, hsl.s));
        hsl.l = Math.min(0.65, Math.max(0.46, hsl.l));
        return this._hslToRgb(hsl);
      },
      _pickDistinct(colors, base, minHue, other) {
        const baseHue = this._rgbToHsl(base).h;
        const otherHue = other ? this._rgbToHsl(other).h : null;
        return colors.find(c => {
          const hue = this._rgbToHsl(c).h;
          const d1 = this._hueDist(hue, baseHue);
          const d2 = otherHue === null ? 999 : this._hueDist(hue, otherHue);
          return d1 >= minHue && d2 >= 28;
        });
      },
      _hueDist(a, b) {
        const d = Math.abs(a - b);
        return Math.min(d, 360 - d);
      },
      _hex({ r, g, b }) {
        return '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
      },
      _rgbToHsl({ r, g, b }) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s = 0;
        const l = (max + min) / 2;
        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            default: h = (r - g) / d + 4;
          }
          h *= 60;
        }
        return { h, s, l };
      },
      _hslToRgb({ h, s, l }) {
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = l - c / 2;
        let r = 0, g = 0, b = 0;
        if (h < 60) { r = c; g = x; }
        else if (h < 120) { r = x; g = c; }
        else if (h < 180) { g = c; b = x; }
        else if (h < 240) { g = x; b = c; }
        else if (h < 300) { r = x; b = c; }
        else { r = c; b = x; }
        return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
      }
    };

    const SM = {
      get() { return GS.currentPhase; },
      set(p) {
        GS.currentPhase = p;
        const ind = document.getElementById('stateInd');
        if (ind) {
          const hideIndicator = p === GS.PHASES.ROUND_ACTIVE || p === GS.PHASES.JUDGE_PHASE;
          ind.textContent = hideIndicator ? '' : p.replace(/_/g, ' ');
          ind.className = 'state-ind ' + p.toLowerCase().replace(/_/g, '-');
          ind.style.display = hideIndicator ? 'none' : '';
        }
        const jb = document.getElementById('judgeBadge');
        if (jb) jb.classList.toggle('jp', p === GS.PHASES.JUDGE_PHASE);
        const tl = document.getElementById('timerLbl');
        if (tl) { tl.classList.toggle('jp', p === GS.PHASES.JUDGE_PHASE); tl.classList.toggle('sp', p === GS.PHASES.SCORING_PHASE); }
      },
      is(p) { return GS.currentPhase === p; }
    };

    /* ═══ TIMER ═══ */
    const TC = {
      clear() {
        if (GS.activeTimerId !== null) { clearInterval(GS.activeTimerId); GS.activeTimerId = null; }
        // Also clear any stale timer IDs that leaked
        const tc = document.getElementById('timerCircle');
        if (tc) tc.classList.remove('t-pulse');
      },
      _broadcastTick(type, val, max, color, pulse) {
        return;
      },
      // Render a tick received from host on client side
      renderTick(data) {
        const C = 2 * Math.PI * 42;
        const tp = document.getElementById('timerProg'), tt = document.getElementById('timerTxt'), tc = document.getElementById('timerCircle'), tl = document.getElementById('timerLbl');
        if (!tp || !tt || !tc) return;
        tt.textContent = Math.max(0, data.val);
        const maxVal = data.max > 0 ? data.max : 1; // Prevent division by zero
        tp.style.strokeDashoffset = C * (1 - data.val / maxVal);
        tp.style.stroke = data.color || '#4ade80';
        if (data.pulse) tc.classList.add('t-pulse'); else tc.classList.remove('t-pulse');
        if (data.timerType === 'main' && tl) tl.textContent = 'Time Remaining';
        if (data.timerType === 'judge' && tl) tl.textContent = 'Judge Time';
        if (data.val <= 0) { tp.style.strokeDashoffset = C; tc.classList.remove('t-pulse'); }
      },
      startMain(cb) {
        this.clear();
        const duration = GS.settings.timerDuration;
        GS.timeRemaining = duration;
        const endTime = Date.now() + duration * 1000;
        const C = 2 * Math.PI * 42;
        const tp = document.getElementById('timerProg'), tt = document.getElementById('timerTxt'), tc = document.getElementById('timerCircle'), tl = document.getElementById('timerLbl');
        if (!tp || !tt || !tc || !tl) return;
        tp.style.strokeDasharray = C; tp.style.strokeDashoffset = 0; tp.style.stroke = '#4ade80';
        tt.textContent = duration; tl.textContent = 'Time Remaining'; tc.classList.remove('t-pulse');
        let last = duration;
        const timerId = setInterval(() => {
          if (GS.activeTimerId !== timerId) { clearInterval(timerId); return; }
          GS.timeRemaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
          if (GS.timeRemaining !== last) { if (GS.timeRemaining > 0) { GS.timeRemaining <= 5 ? SoundManager.playTickWarn() : SoundManager.playTick(); } last = GS.timeRemaining; }
          tt.textContent = GS.timeRemaining;
          tp.style.strokeDashoffset = C * (1 - Math.max(0, endTime - Date.now()) / 1000 / duration);
          let color = '#4ade80', pulse = false;
          if (GS.timeRemaining > duration * .5) color = '#4ade80';
          else if (GS.timeRemaining > duration * .2) color = '#fbbf24';
          else { color = '#ef4444'; pulse = true; }
          tp.style.stroke = color;
          if (pulse) tc.classList.add('t-pulse'); else tc.classList.remove('t-pulse');
          this._broadcastTick('main', GS.timeRemaining, duration, color, pulse);
          if (GS.timeRemaining <= 0) { this.clear(); tc.classList.remove('t-pulse'); tp.style.strokeDashoffset = C; this._broadcastTick('main', 0, duration, '#ef4444', false); if (cb) cb(); }
        }, 100);
        GS.activeTimerId = timerId;
      },
      startJudge(cb) {
        this.clear();
        const duration = GS.settings.judgePhaseDuration;
        GS.timeRemaining = duration;
        const endTime = Date.now() + duration * 1000;
        const C = 2 * Math.PI * 42;
        const tp = document.getElementById('timerProg'), tt = document.getElementById('timerTxt'), tc = document.getElementById('timerCircle');
        if (!tp || !tt || !tc) return;
        tp.style.strokeDasharray = C; tp.style.strokeDashoffset = 0; tp.style.stroke = '#ffd700';
        tt.textContent = duration;
        let last = duration;
        const timerId = setInterval(() => {
          if (GS.activeTimerId !== timerId) { clearInterval(timerId); return; }
          GS.timeRemaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
          if (GS.timeRemaining !== last) { last = GS.timeRemaining; }
          tt.textContent = GS.timeRemaining;
          tp.style.strokeDashoffset = C * (1 - Math.max(0, endTime - Date.now()) / 1000 / duration);
          let color = '#ffd700', pulse = false;
          if (GS.timeRemaining <= 2) { color = '#ef4444'; pulse = true; }
          tp.style.stroke = color;
          if (pulse) tc.classList.add('t-pulse'); else tc.classList.remove('t-pulse');
          this._broadcastTick('judge', GS.timeRemaining, duration, color, pulse);
          if (GS.timeRemaining <= 0) { this.clear(); tc.classList.remove('t-pulse'); tp.style.strokeDashoffset = C; this._broadcastTick('judge', 0, duration, '#ef4444', false); if (cb) cb(); }
        }, 100);
        GS.activeTimerId = timerId;
      }
    };

    /* ═══ SCORES ═══ */
    const Scores = {
      add(idx, pts) {
        if (idx < 0 || idx >= GS.players.length) return null;
        const p = GS.players[idx];
        const before = Number.isFinite(p.score) ? p.score : 0;
        p.score = Math.max(0, before + pts);
        UI.renderLB();

        return p.score - before;
      },
      adjust(idx, pts) {
        if (GameController._onlineMode && typeof RoomLobby !== 'undefined' && !RoomLobby.isHost) return;
        SoundManager.playClick();
        if (typeof idx === 'string') {
          idx = GS.players.findIndex(p => p.name === idx);
        }
        if (idx < 0 || idx >= GS.players.length) return;
        const delta = this.add(idx, pts);
        if (delta !== null && delta !== 0) {
          this.popup(idx, delta);
        }
        if (typeof GameController !== 'undefined' && GameController._broadcast) {
          GameController._broadcast('manual-score', { index: idx, delta: pts });
        }
      },
      popup(idx, pts) {
        const sorted = [...GS.players].sort((a, b) => b.score - a.score);
        const p = GS.players[idx]; const si = sorted.findIndex(x => x.name === p.name && x.avatar === p.avatar);
        const items = document.querySelectorAll('#leaderboard .lb-item');
        if (si >= 0 && items[si]) {
          const item = items[si], sc = item.querySelector('.lb-score');
          if (sc) {
            const el = document.createElement('span'); el.className = `score-pop ${pts < 0 ? 'neg' : ''}`; el.textContent = pts > 0 ? `+${pts}` : `${pts}`; sc.style.position = 'relative'; sc.appendChild(el); setTimeout(() => el.remove(), 1000);
            // Score Zoom — the number zooms big then settles back.
            const zoomColor = pts < 0 ? '#e5568a' : '#f0a828';
            sc.style.transformOrigin = 'right center';
            sc.style.transition = 'transform .5s cubic-bezier(.34,1.56,.64,1), color .5s';
            sc.style.transform = 'scale(2)';
            sc.style.color = zoomColor;
            setTimeout(() => { sc.style.transform = 'scale(1)'; sc.style.color = ''; }, 520);
            // Jelly Wobble — the whole row squishes like jelly.
            if (item.animate) {
              item.animate([
                { transform: 'scale(1,1)' },
                { transform: 'scale(1.08,.86)' },
                { transform: 'scale(.93,1.07)' },
                { transform: 'scale(1.03,.97)' },
                { transform: 'scale(1,1)' }
              ], { duration: 600, easing: 'ease-out' });
            }
          }
        }
      }
    };

    /* ═══ JUDGES ═══ */
    const Judges = {
      calcTotal() { return GS.sections.reduce((s, sec) => s + sec.frames.filter(f => (f.content && f.answer) || (f.type === 'dialogue' && f.dialogue && f.answer)).length, 0); },
      init() {
        const j = GS.judge;
        j.totalRounds = this.calcTotal(); j.totalPlayers = GS.players.length;
        j.roundsPerJudge = j.totalPlayers > 0 ? Math.max(1, Math.floor(j.totalRounds / j.totalPlayers)) : 1;
        j.globalRoundIndex = 0; j.currentJudge = null; j.currentJudgeIndex = -1;
        j.currentJudgeRoundsServed = 0; j.usedJudges = []; j.cycleCount = 0;
        this.clearFlags();
      },
      clearFlags() { GS.judge.judgeAnswered = false; GS.judge.judgeRewardGiven = false; },
      needNew() { const j = GS.judge; if (j.currentJudge === null) return true; if (j.totalPlayers <= 1) return false; return j.currentJudgeRoundsServed >= j.roundsPerJudge; },
      eligible() { const j = GS.judge; let e = GS.players.filter(p => !j.usedJudges.includes(p.name)); if (!e.length) { j.usedJudges = []; j.cycleCount++; e = [...GS.players]; } return e; },
      selectNew() {
        const j = GS.judge;
        if (j.totalPlayers <= 1) { const p = GS.players[0]; j.currentJudge = p ? p.name : null; j.currentJudgeIndex = 0; j.currentJudgeRoundsServed = 0; return p; }
        const e = this.eligible(); const s = e[Math.floor(Math.random() * e.length)];
        j.currentJudge = s.name; j.currentJudgeIndex = GS.players.findIndex(p => p.name === s.name); j.usedJudges.push(s.name); j.currentJudgeRoundsServed = 0; return s;
      },
      incRound() { GS.judge.globalRoundIndex++; GS.judge.currentJudgeRoundsServed++; },
      remaining() { const j = GS.judge; return Math.max(0, j.roundsPerJudge - j.currentJudgeRoundsServed); },
      updateDisplay() {
        const j = GS.judge;
        const n = document.getElementById('curJudge'), r = document.getElementById('judgeRoundsLeft');
        if (n) n.textContent = j.currentJudge || '-';
        if (r) { const rem = this.remaining(); r.textContent = rem === 1 ? '1 left' : `${rem} left`; }
      },
      showAnim(cb) {
        const j = GS.judge, ov = document.getElementById('judgeOv'), cont = document.getElementById('joCandidates'), sel = document.getElementById('joSelMsg');
        if (!ov || !cont || !sel) { if (cb) cb(); return; }
        sel.classList.remove('on');
        const sr = document.getElementById('joServeRounds'); if (sr) sr.textContent = j.roundsPerJudge;
        const eligibleList = this.eligible();
        const eligibleNames = new Set(eligibleList.map(p => p.name));
        const colors = ['var(--nb-pink, #FF6B9D)', 'var(--nb-blue, #3B82F6)', 'var(--nb-yellow, #FACC15)', 'var(--nb-green, #84CC16)', 'var(--nb-orange, #FB923C)'];
        
        cont.innerHTML = GS.players.map((p, i) => {
          const was = !eligibleNames.has(p.name);
          const av = renderAvatar(p, 'c');
          const color = colors[i % colors.length];
          return `<div class="jo-cand ${was ? 'was eliminated' : ''}" data-name="${p.name}" style="background: ${color};">
            <div class="jo-circle">${av}</div>
            <span class="jo-cname">${p.name}</span>
          </div>`;
        }).join('');
        
        ov.classList.add('on');
        SoundManager.playClick();
        const chosen = this.selectNew();
        if (!chosen) { ov.classList.remove('on'); if (cb) cb(); return; }

        const allCands = Array.from(cont.querySelectorAll('.jo-cand'));
        const eligibleCands = allCands.filter(c => eligibleNames.has(c.dataset.name));
        const joSelName = document.getElementById('joSelName');

        // Solo game or single eligible candidate: reveal immediately
        if (eligibleCands.length <= 1) {
          const chosenEl = allCands.find(c => c.dataset.name === chosen.name);
          if (chosenEl) chosenEl.classList.add('sel');
          if (joSelName) joSelName.textContent = chosen.name;
          sel.classList.add('on');
          SoundManager.playSelPlayer();
          this.updateDisplay();
          UI.renderLB();
          setTimeout(() => { ov.classList.remove('on'); if (cb) cb(); }, 1400);
          return;
        }

        // ══ Step-by-Step One-by-One Elimination Animation ══
        const losers = eligibleCands.filter(c => c.dataset.name !== chosen.name);
        // Randomise elimination order
        for (let i = losers.length - 1; i > 0; i--) {
          const r = Math.floor(Math.random() * (i + 1));
          [losers[i], losers[r]] = [losers[r], losers[i]];
        }

        const chosenEl = allCands.find(c => c.dataset.name === chosen.name);
        let elimIndex = 0;

        const elimStep = () => {
          if (elimIndex < losers.length) {
            const victim = losers[elimIndex];
            victim.classList.add('eliminated');
            
            // Add red X stamp
            const stamp = document.createElement('div');
            stamp.className = 'jo-elim-stamp';
            stamp.textContent = '✖';
            victim.appendChild(stamp);

            SoundManager.playSkip();
            elimIndex++;
            setTimeout(elimStep, 520);
          } else {
            // Only the Chosen Judge remains standing!
            if (chosenEl) {
              chosenEl.classList.add('sel');
              chosenEl.style.transform = 'scale(1.22) translateY(-6px)';
              chosenEl.style.boxShadow = '0 0 0 5px var(--nb-green, #84CC16), 8px 8px 0 var(--nb-ink, #1a1a1a)';
              chosenEl.style.zIndex = '10';
            }
            if (joSelName) joSelName.textContent = chosen.name;
            sel.classList.add('on');
            SoundManager.playSelPlayer();
            this.updateDisplay();
            UI.renderLB();

            // Finish and proceed to round
            setTimeout(() => {
              ov.classList.remove('on');
              if (cb) cb();
            }, 1900);
          }
        };

        // Initial suspense pause before elimination starts
        setTimeout(elimStep, 500);
      },
      process(cb) { if (this.needNew()) this.showAnim(cb); else { this.updateDisplay(); UI.renderLB(); if (cb) cb(); } }
    };

    /* ═══ UI ═══ */
    
    /* ══════════════════════════════════════════════════════════════════
       SMART FUZZY MATCHER (Levenshtein Distance + Article/Year Normalization)
       ══════════════════════════════════════════════════════════════════ */
    const FuzzyMatcher = {
      normalize(text) {
        if (!text) return '';
        let t = String(text).toLowerCase();
        // Remove year patterns like (1968) or 1968
        t = t.replace(/\(\d{4}\)|\b\d{4}\b/g, '');
        // Remove all punctuation
        t = t.replace(/[^\w\s]/g, '');
        // Strip leading common articles
        t = t.replace(/^(the|a|an|el|la)\s+/i, '').trim();
        // Collapse multiple spaces
        t = t.replace(/\s+/g, ' ');
        return t;
      },
      levenshtein(s1, s2) {
        if (s1.length < s2.length) return this.levenshtein(s2, s1);
        if (s2.length === 0) return s1.length;
        let prev = [];
        for (let i = 0; i <= s2.length; i++) prev[i] = i;
        for (let i = 0; i < s1.length; i++) {
          let curr = [i + 1];
          for (let j = 0; j < s2.length; j++) {
            let ins = prev[j + 1] + 1;
            let del = curr[j] + 1;
            let sub = prev[j] + (s1[i] === s2[j] ? 0 : 1);
            curr[j + 1] = Math.min(ins, del, sub);
          }
          prev = curr;
        }
        return prev[s2.length];
      },
      isMatch(guess, answer) {
        const nGuess = this.normalize(guess);
        const nAns = this.normalize(answer);
        if (!nGuess || !nAns) return false;
        // Exact normalized match
        if (nGuess === nAns) return true;
        // Substring match if guess is at least 4 characters long
        if (nGuess.length >= 4 && (nAns.includes(nGuess) || nGuess.includes(nAns))) return true;
        // Levenshtein distance check (tolerance 1 for short, 2 for longer titles)
        const dist = this.levenshtein(nGuess, nAns);
        const maxLen = Math.max(nGuess.length, nAns.length);
        if (maxLen >= 8 && dist <= 2) return true;
        if (maxLen >= 4 && dist <= 1) return true;
        return false;
      }
    };

    /* ══════════════════════════════════════════════════════════════════
       APPWRITE REALTIME MULTIPLAYER ENGINE
       ══════════════════════════════════════════════════════════════════ */
    const MultiplayerEngine = {
      appwriteClient: null,
      appwriteRealtime: null,
      realtimeChannel: null,
      broadcastChannel: null,
      roomId: null,
      roomCode: null,
      playerId: null,
      playerName: 'Player',
      playerAvatar: 'aman',
      isHost: false,
      selectedAvatarForModal: 'aman',
      currentRoundWinners: [],
      currentPlaylist: [],
      currentPlayIndex: 0,
      hostSettings: {
        category: 'all',
        rounds: 10,
        timer: 30
      },
      isPaused: false,

      init() {
        // Load saved identity from localStorage
        const savedName = localStorage.getItem('gtf_player_name');
        const savedAvatar = localStorage.getItem('gtf_player_avatar');
        if (savedName) this.playerName = savedName;
        if (savedAvatar) {
          this.playerAvatar = savedAvatar;
          this.selectedAvatarForModal = savedAvatar;
        }
        if (!this.playerId) {
          this.playerId = 'p_' + Math.random().toString(36).substr(2, 9);
        }

        // Initialize Appwrite Web SDK if available
        try {
          if (typeof Appwrite !== 'undefined') {
            this.appwriteClient = new Appwrite.Client()
              .setEndpoint('https://cloud.appwrite.io/v1')
              .setProject('guesstheframe');
            this.appwriteRealtime = new Appwrite.Realtime(this.appwriteClient);
          }
        } catch (e) {
          console.log('[Multiplayer] Appwrite offline fallback active.');
        }

        // Check URL parameters for direct room joining (e.g. ?room=FILM)
        this.checkUrlParams();
      },

      checkUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const roomCode = urlParams.get('room');
        if (roomCode) {
          const joinInput = document.getElementById('joinCodeInput');
          if (joinInput) joinInput.value = roomCode.toUpperCase();
          const joinNick = document.getElementById('joinNicknameInput');
          if (joinNick && this.playerName) joinNick.value = this.playerName;
          this.openJoinModal();
        }
      },

      openCreateModal() {
        const nickInput = document.getElementById('hostNicknameInput');
        if (nickInput) nickInput.value = this.playerName;
        this.highlightSelectedAvatar('host', this.playerAvatar);
        document.getElementById('createRoomModal').classList.add('active');
      },

      openJoinModal() {
        const nickInput = document.getElementById('joinNicknameInput');
        if (nickInput) nickInput.value = this.playerName;
        this.highlightSelectedAvatar('join', this.playerAvatar);
        document.getElementById('joinRoomModal').classList.add('active');
      },

      closeModals() {
        document.querySelectorAll('.mp-modal-overlay').forEach(m => m.classList.remove('active'));
      },

      selectAvatar(element, modalType) {
        const parent = element.parentElement;
        parent.querySelectorAll('.mp-avatar-option').forEach(el => el.classList.remove('selected'));
        element.classList.add('selected');
        this.selectedAvatarForModal = element.getAttribute('data-avatar') || 'aman';
      },

      highlightSelectedAvatar(modalType, avatarName) {
        const modal = modalType === 'host' ? document.getElementById('createRoomModal') : document.getElementById('joinRoomModal');
        if (!modal) return;
        modal.querySelectorAll('.mp-avatar-option').forEach(el => {
          if (el.getAttribute('data-avatar') === avatarName) {
            el.classList.add('selected');
          } else {
            el.classList.remove('selected');
          }
        });
      },

      generateRoomCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 4; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
      },

      confirmCreateRoom() {
        const nick = (document.getElementById('hostNicknameInput').value || 'Host').trim();
        this.playerName = nick;
        this.playerAvatar = this.selectedAvatarForModal || 'aman';
        this.isHost = true;
        this.roomCode = this.generateRoomCode();
        this.roomId = 'room_' + this.roomCode;

        localStorage.setItem('gtf_player_name', this.playerName);
        localStorage.setItem('gtf_player_avatar', this.playerAvatar);

        this.closeModals();
        this.setupChannel();

        // Register host in GS.players
        GS.players = [{
          id: this.playerId,
          name: this.playerName,
          avatar: this.playerAvatar,
          score: 0,
          isHost: true,
          loaded: true,
          color: '#ff7eb6'
        }];

        GameController._onlineMode = true;
        GameController._isRemoteSession = false;

        // Show lobby screen
        UI.showScreen('playerLobbyScreen');
        this.renderLobbyUI();
        this.broadcastState('ROOM_SYNC');
      },

      confirmJoinRoom() {
        const code = (document.getElementById('joinCodeInput').value || '').trim().toUpperCase();
        if (!code || code.length < 3) {
          alert('Please enter a valid Room Code.');
          return;
        }
        const nick = (document.getElementById('joinNicknameInput').value || 'Player').trim();
        this.playerName = nick;
        this.playerAvatar = this.selectedAvatarForModal || 'aman';
        this.isHost = false;
        this.roomCode = code;
        this.roomId = 'room_' + this.roomCode;

        localStorage.setItem('gtf_player_name', this.playerName);
        localStorage.setItem('gtf_player_avatar', this.playerAvatar);

        this.closeModals();
        this.setupChannel();

        GameController._onlineMode = true;
        GameController._isRemoteSession = true;

        UI.showScreen('playerLobbyScreen');
        this.renderLobbyUI();

        // Broadcast join request to host
        this.sendEvent('PLAYER_JOIN', {
          id: this.playerId,
          name: this.playerName,
          avatar: this.playerAvatar
        });
      },

      setupChannel() {
        if (this.broadcastChannel) {
          try { this.broadcastChannel.close(); } catch(e) {}
        }
        const channelName = 'gtf_' + this.roomId;
        this.broadcastChannel = new BroadcastChannel(channelName);
        this.broadcastChannel.onmessage = (event) => {
          this.handleIncomingEvent(event.data);
        };
      },

      sendEvent(eventType, payload = {}) {
        const msg = {
          type: eventType,
          roomId: this.roomId,
          senderId: this.playerId,
          timestamp: Date.now(),
          ...payload
        };
        if (this.broadcastChannel) {
          this.broadcastChannel.postMessage(msg);
        }
      },

      broadcastState(reason = 'UPDATE') {
        if (!this.isHost) return;
        this.sendEvent('SYNC_ROOM_STATE', {
          reason,
          players: GS.players,
          hostSettings: this.hostSettings,
          currentPlaylist: this.currentPlaylist,
          currentPlayIndex: this.currentPlayIndex,
          currentPhase: GS.currentPhase,
          currentRoundWinners: this.currentRoundWinners,
          timeRemaining: GS.timeRemaining
        });
      },

      handleIncomingEvent(msg) {
        if (!msg || msg.roomId !== this.roomId) return;

        switch (msg.type) {
          case 'PLAYER_JOIN':
            if (this.isHost) {
              const existingIdx = GS.players.findIndex(p => p.id === msg.id);
              if (existingIdx === -1) {
                const colors = ['#ff7eb6', '#57c3e0', '#f0a828', '#84cc16', '#a06bd6', '#3fb9ad'];
                const nextColor = colors[GS.players.length % colors.length];
                GS.players.push({
                  id: msg.id,
                  name: msg.name,
                  avatar: msg.avatar,
                  score: 0,
                  isHost: false,
                  loaded: true,
                  color: nextColor
                });
              } else {
                GS.players[existingIdx].name = msg.name;
                GS.players[existingIdx].avatar = msg.avatar;
              }
              this.renderLobbyUI();
              this.broadcastState('PLAYER_JOINED');
            }
            break;

          case 'SYNC_ROOM_STATE':
            if (!this.isHost && msg.players) {
              GS.players = msg.players;
              if (msg.hostSettings) this.hostSettings = msg.hostSettings;
              if (msg.currentPlaylist) this.currentPlaylist = msg.currentPlaylist;
              if (msg.currentPlayIndex !== undefined) this.currentPlayIndex = msg.currentPlayIndex;
              if (msg.currentRoundWinners) this.currentRoundWinners = msg.currentRoundWinners;
              this.renderLobbyUI();
              UI.renderLB();
            }
            break;

          case 'UPDATE_HOST_SETTINGS':
            if (msg.settings) {
              this.hostSettings = msg.settings;
              this.renderLobbyUI();
            }
            break;

          case 'GAME_START_COUNTDOWN':
            this.handleRemoteGameStart(msg);
            break;

          case 'ROUND_START':
            this.handleRemoteRoundStart(msg);
            break;

          case 'GUESS_CORRECT_BROADCAST':
            this.handleRemoteCorrectGuess(msg);
            break;

          case 'ROUND_FINISH_BROADCAST':
            this.handleRemoteRoundFinish(msg);
            break;

          case 'HOST_SKIP_BROADCAST':
            this.handleRemoteSkip();
            break;

          case 'HOST_PAUSE_BROADCAST':
            this.handleRemotePause(msg.paused);
            break;

          case 'TIE_BREAKER_TRIGGER':
            this.handleRemoteTieBreaker(msg);
            break;

          case 'GAME_OVER_BROADCAST':
            this.handleRemoteGameOver(msg);
            break;

          case 'REMATCH_BROADCAST':
            this.handleRemoteRematch();
            break;

          case 'RETURN_LOBBY_BROADCAST':
            this.handleRemoteReturnLobby();
            break;
        }
      },

      renderLobbyUI() {
        const roomBar = document.getElementById('onlineRoomBar');
        const codeDisplay = document.getElementById('displayRoomCode');
        const hostBox = document.getElementById('hostSettingsBox');
        const startBtn = document.getElementById('lobbyStartBtn');
        const playerList = document.getElementById('lobbyPlayerList');
        const lobbyCount = document.getElementById('lobbyCount');

        if (GameController._onlineMode) {
          if (roomBar) roomBar.style.display = 'flex';
          if (codeDisplay) codeDisplay.textContent = this.roomCode || 'FILM';
          if (hostBox) hostBox.style.display = this.isHost ? 'block' : 'none';

          if (startBtn) {
            startBtn.innerHTML = this.isHost 
              ? '<div class="h-card-body"><div class="h-card-title">▶ START MATCH!</div></div>' 
              : '<div class="h-card-body"><div class="h-card-title">⏳ Waiting for Host to Start...</div></div>';
            startBtn.disabled = !this.isHost || GS.players.length === 0;
            startBtn.style.opacity = (!this.isHost || GS.players.length === 0) ? '0.7' : '1';
          }
        } else {
          if (roomBar) roomBar.style.display = 'none';
          if (hostBox) hostBox.style.display = 'none';
        }

        // Render connected player cards
        if (playerList) {
          playerList.innerHTML = GS.players.map((p, idx) => {
            const isMe = p.id === this.playerId;
            const isH = p.isHost;
            return `
              <div class="lobby-player-slot" style="border: 3px solid #1a1a1a; border-radius: 16px; padding: 12px; background: #fff; box-shadow: 4px 4px 0 #1a1a1a; display: flex; align-items: center; gap: 12px;">
                <div style="width: 52px; height: 52px; border-radius: 50%; background: ${p.color || '#ff7eb6'}; border: 2px solid #1a1a1a; overflow: hidden; display: flex; align-items: center; justify-content: center;">
                  <img src="avvtar/${p.avatar || 'aman'}.png" style="width: 44px; height: 44px; object-fit: contain;" />
                </div>
                <div style="flex: 1;">
                  <div style="font-size: 16px; font-weight: 900; color: #1a1a1a; display: flex; align-items: center; gap: 6px;">
                    ${p.name}
                    ${isH ? '<span style="font-size: 11px; background: #FACC15; padding: 2px 6px; border-radius: 4px; border: 1.5px solid #1a1a1a;">👑 HOST</span>' : ''}
                    ${isMe ? '<span style="font-size: 11px; background: #3B82F6; color: #fff; padding: 2px 6px; border-radius: 4px; border: 1.5px solid #1a1a1a;">YOU</span>' : ''}
                  </div>
                  <div style="font-size: 12px; font-weight: 700; color: #666; text-transform: uppercase;">Avatar: ${p.avatar || 'aman'}</div>
                </div>
              </div>
            `;
          }).join('');
        }

        if (lobbyCount) {
          lobbyCount.innerHTML = `<span>${GS.players.length} PLAYER${GS.players.length !== 1 ? 'S' : ''} CONNECTED</span>`;
        }
      },

      updateHostSettings() {
        if (!this.isHost) return;
        const cat = document.getElementById('hostCategorySelect').value;
        const rds = document.getElementById('hostRoundsSelect').value;
        const tmr = parseInt(document.getElementById('hostTimerSelect').value, 10);
        this.hostSettings = {
          category: cat,
          rounds: rds === 'all' ? 'all' : parseInt(rds, 10),
          timer: tmr || 30
        };
        this.sendEvent('UPDATE_HOST_SETTINGS', { settings: this.hostSettings });
      },

      copyRoomLink() {
        const link = window.location.origin + window.location.pathname + '?room=' + this.roomCode;
        navigator.clipboard.writeText(link).then(() => {
          alert('📋 Room invite link copied to clipboard!\n' + link);
        }).catch(() => {
          prompt('Copy this room link:', link);
        });
      },

      showQrCode() {
        const link = window.location.origin + window.location.pathname + '?room=' + this.roomCode;
        const modal = document.getElementById('qrModal');
        const container = document.getElementById('qrcodeCanvasContainer');
        const codeText = document.getElementById('qrRoomCodeText');
        if (codeText) codeText.textContent = this.roomCode;
        if (container) {
          container.innerHTML = '';
          if (typeof QRCode !== 'undefined') {
            new QRCode(container, {
              text: link,
              width: 180,
              height: 180,
              colorDark: '#1a1a1a',
              colorLight: '#ffffff',
              correctLevel: QRCode.CorrectLevel.H
            });
          } else {
            container.innerHTML = `<div style="font-weight:800; padding:20px;">${link}</div>`;
          }
        }
        if (modal) modal.classList.add('active');
      },

      // Build game playlist and launch match
      startMatch() {
        if (!this.isHost) return;
        let pool = [];
        const cat = this.hostSettings.category;

        if (cat === 'all' || cat === 'frames') {
          const s1 = GS.sections.find(s => s.id === 1);
          if (s1) pool.push(...s1.frames.map(f => ({ ...f, sectionName: 'Guess the Frame', sectionId: 1 })));
        }
        if (cat === 'all' || cat === 'eyes') {
          const s3 = GS.sections.find(s => s.id === 3);
          if (s3) pool.push(...s3.frames.map(f => ({ ...f, sectionName: 'Guess the Eye', sectionId: 3 })));
        }
        if (cat === 'all' || cat === 'dialogue') {
          const s2 = GS.sections.find(s => s.id === 2);
          if (s2) pool.push(...s2.frames.map(f => ({ ...f, sectionName: 'Guess the Dialogue', sectionId: 2 })));
        }

        // Shuffle pool
        for (let i = pool.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [pool[i], pool[j]] = [pool[j], pool[i]];
        }

        // Slice to rounds limit
        if (this.hostSettings.rounds !== 'all') {
          pool = pool.slice(0, this.hostSettings.rounds);
        }

        this.currentPlaylist = pool;
        this.currentPlayIndex = 0;

        // Reset scores
        GS.players.forEach(p => p.score = 0);

        this.sendEvent('GAME_START_COUNTDOWN', {
          playlist: this.currentPlaylist,
          hostSettings: this.hostSettings,
          players: GS.players
        });

        this.executeGameStart();
      },

      handleRemoteGameStart(msg) {
        this.currentPlaylist = msg.playlist;
        this.hostSettings = msg.hostSettings;
        GS.players = msg.players;
        this.currentPlayIndex = 0;
        this.executeGameStart();
      },

      executeGameStart() {
        UI.showScreen('gameScreen');
        document.getElementById('onlineGuessPanel').classList.add('active');
        if (this.isHost) {
          document.getElementById('hostFloatingBar').style.display = 'flex';
        } else {
          document.getElementById('hostFloatingBar').style.display = 'none';
        }
        this.startRound(0);
      },

      startRound(roundIndex) {
        this.currentPlayIndex = roundIndex;
        this.currentRoundWinners = [];
        const frame = this.currentPlaylist[roundIndex];
        if (!frame) {
          this.finishGame();
          return;
        }

        // Reset input UI
        const input = document.getElementById('onlineGuessInput');
        const submitBtn = document.getElementById('onlineGuessSubmitBtn');
        const pill = document.getElementById('guessFeedbackPill');
        if (input) {
          input.value = '';
          input.disabled = false;
          input.focus();
        }
        if (submitBtn) submitBtn.disabled = false;
        if (pill) pill.style.display = 'none';

        // Update HUD
        const roundInfo = document.getElementById('roundInfo');
        if (roundInfo) roundInfo.textContent = `Round ${roundIndex + 1} / ${this.currentPlaylist.length}`;
        const secName = document.getElementById('curSecName');
        if (secName) secName.textContent = frame.sectionName || 'Guess the Frame';

        // Load and display frame
        FrameDisplay.show(frame);
        document.getElementById('answerOverlay').classList.remove('active');
        document.getElementById('scoringOv').classList.remove('active');

        // Start progressive unblur timer
        const timerDuration = this.hostSettings.timer || 30;
        TC.start(timerDuration, () => {
          this.endRound();
        });

        if (this.isHost) {
          this.sendEvent('ROUND_START', {
            roundIndex,
            frame,
            timerDuration
          });
        }
      },

      handleRemoteRoundStart(msg) {
        this.currentPlayIndex = msg.roundIndex;
        this.currentRoundWinners = [];

        const input = document.getElementById('onlineGuessInput');
        const submitBtn = document.getElementById('onlineGuessSubmitBtn');
        const pill = document.getElementById('guessFeedbackPill');
        if (input) {
          input.value = '';
          input.disabled = false;
          input.focus();
        }
        if (submitBtn) submitBtn.disabled = false;
        if (pill) pill.style.display = 'none';

        const roundInfo = document.getElementById('roundInfo');
        if (roundInfo) roundInfo.textContent = `Round ${msg.roundIndex + 1} / ${this.currentPlaylist.length}`;
        const secName = document.getElementById('curSecName');
        if (secName) secName.textContent = msg.frame.sectionName || 'Guess the Frame';

        FrameDisplay.show(msg.frame);
        document.getElementById('answerOverlay').classList.remove('active');
        document.getElementById('scoringOv').classList.remove('active');

        TC.start(msg.timerDuration || 30, () => {
          this.endRound();
        });
      },

      submitGuess(event) {
        if (event) event.preventDefault();
        const input = document.getElementById('onlineGuessInput');
        if (!input || !input.value.trim()) return;
        const guess = input.value.trim();
        const currentFrame = this.currentPlaylist[this.currentPlayIndex];
        if (!currentFrame) return;

        // Check if player already won this round
        if (this.currentRoundWinners.some(w => w.playerId === this.playerId)) return;

        const isCorrect = FuzzyMatcher.isMatch(guess, currentFrame.answer);

        if (isCorrect) {
          const pos = this.currentRoundWinners.length + 1;
          const pts = pos === 1 ? 10 : (pos === 2 ? 7 : (pos === 3 ? 5 : 0));

          if (pts > 0) {
            // Immediate point awarding
            const me = GS.players.find(p => p.id === this.playerId);
            if (me) me.score += pts;

            const winRecord = {
              playerId: this.playerId,
              playerName: this.playerName,
              avatar: this.playerAvatar,
              position: pos,
              points: pts,
              timestamp: Date.now()
            };
            this.currentRoundWinners.push(winRecord);

            // Audio & visual feedback
            SoundManager.play('correct');
            this.showGuessFeedback(true, `🎉 Correct! +${pts} Pts (${pos === 1 ? '1st' : pos === 2 ? '2nd' : '3rd'} Place!)`);

            input.disabled = true;
            document.getElementById('onlineGuessSubmitBtn').disabled = true;

            UI.renderLB();

            // Broadcast correct guess
            this.sendEvent('GUESS_CORRECT_BROADCAST', {
              winRecord,
              updatedPlayers: GS.players
            });

            // If 3 correct guesses reached, finish round immediately!
            if (this.currentRoundWinners.length >= 3) {
              setTimeout(() => this.endRound(), 800);
            }
          }
        } else {
          // Wrong guess
          SoundManager.play('wrong');
          this.showGuessFeedback(false, '❌ Not quite, try again!');
          input.classList.add('shake-input');
          setTimeout(() => input.classList.remove('shake-input'), 400);
        }
      },

      showGuessFeedback(isCorrect, text) {
        const pill = document.getElementById('guessFeedbackPill');
        if (!pill) return;
        pill.textContent = text;
        pill.className = 'guess-feedback-pill ' + (isCorrect ? 'guess-feedback-correct' : 'guess-feedback-wrong');
        pill.style.display = 'inline-flex';
      },

      handleRemoteCorrectGuess(msg) {
        const winRecord = msg.winRecord;
        if (winRecord && !this.currentRoundWinners.some(w => w.playerId === winRecord.playerId)) {
          this.currentRoundWinners.push(winRecord);
        }
        if (msg.updatedPlayers) {
          GS.players = msg.updatedPlayers;
        }
        UI.renderLB();

        if (this.currentRoundWinners.length >= 3 && this.isHost) {
          this.endRound();
        }
      },

      endRound() {
        TC.stop();
        const currentFrame = this.currentPlaylist[this.currentPlayIndex];
        if (!currentFrame) return;

        // Fully unblur
        const img = document.querySelector('#imageContainer img');
        if (img) img.style.filter = 'blur(0px)';

        // Display Answer Overlay with Winners Spotlight
        const ansTitle = document.getElementById('ansTitle');
        const ansYear = document.getElementById('ansYear');
        const ansOverlay = document.getElementById('answerOverlay');

        if (ansTitle) ansTitle.textContent = currentFrame.answer || '';
        if (ansYear) ansYear.textContent = currentFrame.year ? `(${currentFrame.year})` : '';

        // Render winners spotlight
        let spotlightHtml = '';
        if (this.currentRoundWinners.length > 0) {
          spotlightHtml = '<div class="winners-spotlight">' + this.currentRoundWinners.map(w => {
            const badgeClass = w.position === 1 ? 'winner-pill-1' : (w.position === 2 ? 'winner-pill-2' : 'winner-pill-3');
            return `<div class="winner-pill ${badgeClass}"><span>${w.position === 1 ? '🥇' : w.position === 2 ? '🥈' : '🥉'} ${w.playerName}</span><span>+${w.points} pts</span></div>`;
          }).join('') + '</div>';
        } else {
          spotlightHtml = '<div style="margin-top:10px; font-weight:800; color:#ff6b6b;">⏭ No one got it in time!</div>';
        }

        const ansDialogue = document.getElementById('ansDialogue');
        if (ansDialogue) ansDialogue.innerHTML = spotlightHtml;

        if (ansOverlay) ansOverlay.classList.add('active');

        SoundManager.play('reveal');

        if (this.isHost) {
          this.sendEvent('ROUND_FINISH_BROADCAST', {
            currentRoundWinners: this.currentRoundWinners,
            currentPlayIndex: this.currentPlayIndex
          });

          // 5-second automatic countdown to next round
          setTimeout(() => {
            if (this.currentPlayIndex + 1 < this.currentPlaylist.length) {
              this.startRound(this.currentPlayIndex + 1);
            } else {
              this.checkForTieBreakerOrFinish();
            }
          }, 5000);
        }
      },

      handleRemoteRoundFinish(msg) {
        TC.stop();
        this.currentRoundWinners = msg.currentRoundWinners || [];
        const currentFrame = this.currentPlaylist[this.currentPlayIndex];
        if (!currentFrame) return;

        const img = document.querySelector('#imageContainer img');
        if (img) img.style.filter = 'blur(0px)';

        const ansTitle = document.getElementById('ansTitle');
        const ansYear = document.getElementById('ansYear');
        const ansOverlay = document.getElementById('answerOverlay');

        if (ansTitle) ansTitle.textContent = currentFrame.answer || '';
        if (ansYear) ansYear.textContent = currentFrame.year ? `(${currentFrame.year})` : '';

        let spotlightHtml = '';
        if (this.currentRoundWinners.length > 0) {
          spotlightHtml = '<div class="winners-spotlight">' + this.currentRoundWinners.map(w => {
            const badgeClass = w.position === 1 ? 'winner-pill-1' : (w.position === 2 ? 'winner-pill-2' : 'winner-pill-3');
            return `<div class="winner-pill ${badgeClass}"><span>${w.position === 1 ? '🥇' : w.position === 2 ? '🥈' : '🥉'} ${w.playerName}</span><span>+${w.points} pts</span></div>`;
          }).join('') + '</div>';
        } else {
          spotlightHtml = '<div style="margin-top:10px; font-weight:800; color:#ff6b6b;">⏭ No one got it in time!</div>';
        }

        const ansDialogue = document.getElementById('ansDialogue');
        if (ansDialogue) ansDialogue.innerHTML = spotlightHtml;

        if (ansOverlay) ansOverlay.classList.add('active');
        SoundManager.play('reveal');
      },

      // Check for sudden death tie breaker
      checkForTieBreakerOrFinish() {
        const sorted = [...GS.players].sort((a, b) => b.score - a.score);
        if (sorted.length >= 2 && sorted[0].score > 0 && sorted[0].score === sorted[1].score) {
          // Tie detected for 1st place!
          const tiedPlayers = sorted.filter(p => p.score === sorted[0].score);
          this.triggerTieBreaker(tiedPlayers);
        } else {
          this.finishGame();
        }
      },

      triggerTieBreaker(tiedPlayers) {
        // Load tie breaker frame
        const tieFrames = [
          { type: 'image', content: 'tie breaker/Anatomy of a Fall (2023).jpg', answer: 'ANATOMY OF A FALL', year: '2023', sectionName: 'Tie Breaker' },
          { type: 'image', content: 'tie breaker/Dune 2 (2024).png', answer: 'DUNE 2', year: '2024', sectionName: 'Tie Breaker' },
          { type: 'image', content: 'tie breaker/Baby Driver (2017).jpg', answer: 'BABY DRIVER', year: '2017', sectionName: 'Tie Breaker' },
          { type: 'image', content: 'tie breaker/The Batman (2022).jpg', answer: 'THE BATMAN', year: '2022', sectionName: 'Tie Breaker' },
          { type: 'image', content: 'tie breaker/Oppenheimer (2023).png', answer: 'OPPENHEIMER', year: '2023', sectionName: 'Tie Breaker' }
        ];
        const tieFrame = tieFrames[Math.floor(Math.random() * tieFrames.length)];
        this.currentPlaylist = [tieFrame];
        this.currentPlayIndex = 0;

        const tieOv = document.getElementById('tieVsOv');
        const tiePlayersEl = document.getElementById('tieVsPlayers');
        if (tiePlayersEl) {
          tiePlayersEl.innerHTML = tiedPlayers.map(p => `<div style="font-size:20px; font-weight:900; color:#1a1a1a;">⚡ ${p.name}</div>`).join('');
        }
        if (tieOv) tieOv.classList.add('on');

        this.sendEvent('TIE_BREAKER_TRIGGER', {
          tiedPlayers,
          tieFrame
        });

        setTimeout(() => {
          if (tieOv) tieOv.classList.remove('on');
          this.startRound(0);
        }, 3500);
      },

      handleRemoteTieBreaker(msg) {
        this.currentPlaylist = [msg.tieFrame];
        this.currentPlayIndex = 0;
        const tieOv = document.getElementById('tieVsOv');
        const tiePlayersEl = document.getElementById('tieVsPlayers');
        if (tiePlayersEl) {
          tiePlayersEl.innerHTML = msg.tiedPlayers.map(p => `<div style="font-size:20px; font-weight:900; color:#1a1a1a;">⚡ ${p.name}</div>`).join('');
        }
        if (tieOv) tieOv.classList.add('on');
        setTimeout(() => {
          if (tieOv) tieOv.classList.remove('on');
          this.startRound(0);
        }, 3500);
      },

      finishGame() {
        document.getElementById('onlineGuessPanel').classList.remove('active');
        document.getElementById('hostFloatingBar').style.display = 'none';

        UI.showScreen('winnerScreen');
        UI.renderFinalLB();

        if (this.isHost) {
          this.sendEvent('GAME_OVER_BROADCAST', {
            players: GS.players
          });
        }
      },

      handleRemoteGameOver(msg) {
        document.getElementById('onlineGuessPanel').classList.remove('active');
        document.getElementById('hostFloatingBar').style.display = 'none';
        if (msg.players) GS.players = msg.players;
        UI.showScreen('winnerScreen');
        UI.renderFinalLB();
      },

      // Host In-Game Emergency Controls
      hostSkipRound() {
        if (!this.isHost) return;
        this.endRound();
      },

      hostTogglePause() {
        if (!this.isHost) return;
        this.isPaused = !this.isPaused;
        const btn = document.getElementById('hfbPauseBtn');
        if (this.isPaused) {
          TC.pause();
          if (btn) btn.textContent = '▶ Resume';
        } else {
          TC.resume();
          if (btn) btn.textContent = '⏸ Pause';
        }
        this.sendEvent('HOST_PAUSE_BROADCAST', { paused: this.isPaused });
      },

      handleRemotePause(paused) {
        if (paused) TC.pause();
        else TC.resume();
      },

      hostEndGame() {
        if (!this.isHost) return;
        if (confirm('Are you sure you want to end the match early?')) {
          this.finishGame();
        }
      },

      // Post-Match Actions
      rematch() {
        if (this.isHost) {
          this.sendEvent('REMATCH_BROADCAST');
          this.startMatch();
        } else {
          alert('Waiting for the host to restart the match!');
        }
      },

      handleRemoteRematch() {
        alert('👑 Host has initiated a rematch! Get ready!');
      },

      returnToLobby() {
        if (this.isHost) {
          this.sendEvent('RETURN_LOBBY_BROADCAST');
          UI.showScreen('playerLobbyScreen');
          this.renderLobbyUI();
        } else {
          UI.showScreen('playerLobbyScreen');
          this.renderLobbyUI();
        }
      },

      handleRemoteReturnLobby() {
        UI.showScreen('playerLobbyScreen');
        this.renderLobbyUI();
      }
    };

    const UI = {
      showScreen(id) { document.querySelectorAll('.screen').forEach(s => s.classList.remove('active')); const el = document.getElementById(id); if (el) el.classList.add('active'); },
      updateLoadProgress(progress, type) {
        const isOnline = type === 'online';
        const barId = isOnline ? 'onlineLoadBar' : 'loadBar';
        const txtId = isOnline ? 'onlineLoadPercent' : 'loadPercent';
        const contId = isOnline ? 'onlineLobbyLoading' : 'lobbyLoading';
        const titleId = isOnline ? 'onlineLoadTitleText' : 'loadTitleText';

        const bar = document.getElementById(barId);
        const txt = document.getElementById(txtId);
        const cont = document.getElementById(contId);
        const title = document.getElementById(titleId);

        const normalized = typeof progress === 'number'
          ? { loaded: 0, total: 0, percent: progress }
          : (progress || { loaded: 0, total: 0, percent: 0 });
        const percent = Math.max(0, Math.min(100, normalized.percent ?? 0));

        GS.framesLoaded = percent >= 100;

        if (cont) cont.style.display = 'block';
        if (bar) {
          bar.style.width = `${percent}%`;
          if (percent >= 100) {
            bar.style.background = 'var(--nb-green, #84CC16)';
            bar.style.animation = 'none';
          } else {
            bar.style.background = 'linear-gradient(135deg, var(--nb-green, #84CC16) 25%, #a3e635 25%, #a3e635 50%, var(--nb-green, #84CC16) 50%, var(--nb-green, #84CC16) 75%, #a3e635 75%, #a3e635 100%)';
            bar.style.animation = 'nbBarberPole 0.8s linear infinite';
          }
        }
        if (txt) {
          txt.textContent = `${Math.round(percent)}%`;
          txt.style.background = percent >= 100 ? 'var(--nb-green, #84CC16)' : 'var(--nb-yellow, #FACC15)';
        }
        if (title) {
          title.textContent = percent >= 100 ? 'All Frames Loaded & Ready!' : 'Preloading Game Frames...';
        }

        if (isOnline) {
          if (typeof RoomLobby !== 'undefined' && RoomLobby.channel) RoomLobby.updatePlayerLoadProgress(normalized);
        } else {
          const startBtn = document.getElementById('lobbyStartBtn');
          const canStart = GS.players.length === 1 || (GS.players.length > 1 && GS.framesLoaded);
          if (startBtn) startBtn.disabled = !canStart;
        }
      },
      renderLB() {
        const c = document.getElementById('leaderboard'); if (!c) return;
        const sorted = [...GS.players].sort((a, b) => b.score - a.score);
        const cj = GS.judge.currentJudge, isJP = SM.is(GS.PHASES.JUDGE_PHASE);
        const colors = ['var(--nb-yellow, #FACC15)', 'var(--nb-blue, #3B82F6)', 'var(--nb-pink, #FF6B9D)', 'var(--nb-green, #84CC16)', 'var(--nb-orange, #FB923C)'];
        let rank = 1;
        c.innerHTML = sorted.map((p, i) => {
          if (i > 0 && p.score < sorted[i - 1].score) rank = i + 1;
          const isJ = p.name === cj, ja = isJ && isJP;
          const color = colors[i % colors.length];
          const av = renderAvatar(p, 'lb');
          const rankDisplay = (i === 0 && p.score > 0) ? '👑' : `${rank}`;
          const realIdx = GS.players.findIndex(x => x.name === p.name && (x.avatar === p.avatar || x.avatarImg === p.avatarImg));
          const safeName = SecurityUtil.escapeHtml(p.name);
          return `<div class="lb-item ${i === 0 && p.score > 0 ? 'top' : ''} ${isJ ? 'is-j' : ''} ${ja ? 'j-act' : ''}">
            <span class="lb-rank">${rankDisplay}</span>
            <div class="lb-av-wrap" style="background:${color};">${av}</div>
            <div class="lb-name-group" title="${safeName}">
              <span class="lb-name">${safeName}</span>
              ${isJ ? '<span class="lb-judge-badge">JUDGE</span>' : ''}
            </div>
            <div class="lb-score-cluster">
              <span class="lb-score">${p.score}</span>
              <div class="score-controls">
                <button class="lb-score-btn" onclick="GameController.modScore(${realIdx}, 10); event.stopPropagation();" title="Add 10 points to ${safeName}" aria-label="Add 10 points to ${safeName}">+</button>
                <button class="lb-score-btn minus" onclick="GameController.modScore(${realIdx}, -10); event.stopPropagation();" title="Subtract 10 points from ${safeName}" aria-label="Subtract 10 points from ${safeName}">−</button>
              </div>
            </div>
          </div>`;
        }).join('');
      },
      renderScoring() {
        const c = document.getElementById('scoringGrid'); if (!c) return;
        const cj = GS.judge.currentJudge;
        const isOnline = GameController._onlineMode;
        const isHost = typeof RoomLobby !== 'undefined' && RoomLobby.isHost;
        const disableAll = isOnline && !isHost;
        const tieActive = GS.tieBreaker && GS.tieBreaker.active;
        const tieKeys = tieActive ? new Set(GS.tieBreaker.playerKeys || []) : null;
        const scoringPlayers = GS.players
          .map((p, i) => ({ p, i }))
          .filter(({ p }) => !tieActive || tieKeys.has(playerKey(p)));

        const colors = ['var(--nb-pink, #FF6B9D)', 'var(--nb-blue, #3B82F6)', 'var(--nb-yellow, #FACC15)', 'var(--nb-green, #84CC16)', 'var(--nb-orange, #FB923C)'];
        c.innerHTML = scoringPlayers.map(({ p, i }) => {
          const isJ = !tieActive && p.name === cj;
          const pts = isJ ? GS.settings.judgePoints : GS.settings.pointsPerAnswer;
          const av = renderAvatar(p, 'sp');
          const color = colors[i % colors.length];
          const keyBadge = i < 8 ? `<span class="sp-key" aria-hidden="true">${i + 1}</span>` : '';
          const safeName = SecurityUtil.escapeHtml(p.name);
          return `<div class="sp-wrap ${isJ ? 'is-j' : ''} ${tieActive ? 'tie-eligible' : ''}">
            <div class="sp-btn-anchor">
              <button class="spbtn ${tieActive ? 'tie-eligible' : ''}" style="background: ${color} !important;" onclick="GameController.scoringClick(${i})" data-pi="${i}" aria-label="Award point to ${safeName}" ${disableAll ? 'disabled' : ''}>${av}</button>
              ${keyBadge}
            </div>
            <span class="sp-name">${safeName}${isJ ? ' <span class="sp-judge-tag">JUDGE</span>' : ''}</span>
          </div>`;
        }).join('');

        const sub = document.getElementById('scoringSub');
        const wait = document.getElementById('waitingHostInd');
        if (isOnline && !isHost) {
          if (sub) sub.style.display = 'none';
          if (wait) wait.style.display = 'block';
        } else {
          if (sub) sub.style.display = 'block';
          if (wait) wait.style.display = 'none';
          if (sub) sub.textContent = tieActive ? 'Pick the tied player who answered correctly' : 'Click the player who answered correctly';
        }
      },
      disableScoring() { document.querySelectorAll('.spbtn').forEach(b => b.disabled = true); },
      markSelected(idx) { const b = document.querySelector(`.spbtn[data-pi="${idx}"]`); if (b) { b.classList.add('sel'); b.disabled = true; } },
      showScoringOv(v) { const o = document.getElementById('scoringOv'); if (!o) return; o.classList.toggle('on', v); if (v) { this.renderScoring(); const locked = document.getElementById('lockedInd'); const skipped = document.getElementById('skippedInd'); if (locked) locked.classList.remove('on'); if (skipped) skipped.classList.remove('on'); } },
      showNonk(v) {
        const p = document.getElementById('nonkPanel'); if (!p) return;
        p.classList.toggle('on', v);
        if (v) {
          const btn = document.getElementById('nonkBtn');
          const isOnline = GameController._onlineMode;
          const isHost = typeof RoomLobby !== 'undefined' && RoomLobby.isHost;
          if (btn) btn.disabled = isOnline && !isHost;
          const skipMsg = document.getElementById('skipMsgEl'); if (skipMsg) skipMsg.classList.remove('on');
        }
      },
      setSkipControlsDisabled(disabled) {
        ['skipBtn', 'superSkipBtn'].forEach(id => {
          const btn = document.getElementById(id);
          if (btn) btn.disabled = disabled;
        });
      },
      showLocked() { const e = document.getElementById('lockedInd'); if (e) e.classList.add('on'); },
      showSkipped() { const e = document.getElementById('skippedInd'); if (e) e.classList.add('on'); },
      renderFinalLB() {
        const c = document.getElementById('finalLB'); if (!c) return;
        const sorted = [...GS.players].sort((a, b) => b.score - a.score);
        let rank = 1;
        c.innerHTML = sorted.map((p, i) => {
          if (i > 0 && p.score < sorted[i - 1].score) rank = i + 1;
          const av = p.avatarImg
            ? `<img src="${p.avatarImg}" alt="${p.name}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;">`
            : `<span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:18px;">${p.avatar ? `<svg class="svg-icon" style="width:1.5em;height:1.5em"><use href="#icon-${p.avatar}" /></svg>` : ''}</span>`;
          return `<div class="lb-item ${i === 0 ? 'top' : ''}">
            <span class="lb-rank">${rank}</span>
            <div class="lb-av-wrap">${av}</div>
            <span class="lb-name">${p.name}</span>
            <span class="lb-score">${p.score}</span>
          </div>`;
        }).join('');
      }
    };

    /* ═══ FRAME DISPLAY with smooth transitions ═══ */
    const FrameDisplay = {
      _currentFrame: null,
      _currentImage: null,
      _loadingImage: null,

      /* Preload and cache images */
      preloadImage(src) {
        if (GS.imageCache.has(src)) return Promise.resolve(GS.imageCache.get(src));
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => { GS.imageCache.set(src, img); resolve(img); };
          img.onerror = reject;
          img.src = src;
        });
      },

      /* Preload all frames for progress tracking */
      async preloadAll(onProgress) {
        const allImages = [];
        const collect = frames => frames.forEach(f => {
          if ((f.type === 'image' || f.type === 'eye') && f.content) {
            allImages.push(f.content);
          }
          if (f.type === 'eye' && f.revealContent) allImages.push(f.revealContent);
        });
        GS.sections.forEach(s => collect(s.frames));
        // Also warm the tie-breaker pool so sudden-death rounds appear instantly
        if (GS.tieBreaker && Array.isArray(GS.tieBreaker.frames)) collect(GS.tieBreaker.frames);
        // Player assets: avatars + winner trophy images (avvtar/name.png → "avvtar/name trophy.png")
        GS.players.forEach(p => {
          if (p.avatarImg) {
            allImages.push(p.avatarImg);
            allImages.push(p.avatarImg.replace(/\.(png|jpe?g|webp)$/i, ' trophy.$1'));
          }
        });
        // Winner champion animation frames (avvtar/name/frame_0001.png …) — load them
        // here too so the winner screen plays instantly with zero delay.
        GS.players.forEach(p => {
          if (!p.avatarImg) return;
          const folder = p.avatarImg.replace(/\.(png|jpe?g|webp)$/i, '');
          const maxF = folder.toLowerCase().includes('aman') ? 96 : 92;
          for (let i = 1; i <= maxF; i++) {
            allImages.push(`${folder}/frame_${String(i).padStart(4, '0')}.png`);
          }
        });

        let loaded = 0;
        const total = allImages.length;
        if (total === 0) { if (onProgress) onProgress({ loaded: 0, total: 0, percent: 100 }); return; }

        // Batch load 5 images concurrently for faster loading
        const BATCH = 8;
        for (let i = 0; i < allImages.length; i += BATCH) {
          const batch = allImages.slice(i, i + BATCH);
          const results = await Promise.allSettled(batch.map(src => this.preloadImage(src)));
          loaded += results.length;
          if (onProgress) onProgress({ loaded, total, percent: (loaded / total) * 100 });
        }
      },

      /* Preload next few frames */
      async preloadUpcoming() {
        // Solo mode is fully on-demand: do not warm future frame assets.
        if (GS.players.length === 1) return;
        let count = 0;
        for (let s = GS.currentSection; s < GS.sections.length && count < 3; s++) {
          const sec = GS.sections[s];
          const startRound = (s === GS.currentSection) ? GS.currentSectionRound + 1 : 0;
          const valid = sec.frames.filter(f => (f.content && f.answer) || (f.type === 'dialogue' && f.dialogue && f.answer));
          for (let r = startRound; r < valid.length && count < 3; r++) {
            const frame = valid[r];
            if ((frame.type === 'image' || frame.type === 'eye') && frame.content) this.preloadImage(frame.content).catch(() => { });
            if (frame.type === 'eye' && frame.revealContent) this.preloadImage(frame.revealContent).catch(() => { });
            count++;
          }
        }
      },

      /* Reset display */
      reset() {
        const ph = document.getElementById('framePlaceholder');
        const layer = document.getElementById('frameLayer');
        const dialogue = document.getElementById('frameDialogue');
        const imageContainer = document.getElementById('imageContainer');
        const ansOv = document.getElementById('answerOverlay');
        const ansDivider = ansOv ? ansOv.querySelector('.ans-divider') : null;

        layer.innerHTML = '';
        layer.classList.remove('blurred');
        layer.style.opacity = '0';

        // Clean up dialogue filter/state
        dialogue.style.filter = '';
        dialogue.classList.remove('visible');
        // Release image src before removing to prevent memory leaks.
        // Detach handlers first: clearing src fires 'error', and the stale
        // onerror would repaint the fallback into the layer we just cleared.
        imageContainer.querySelectorAll('img').forEach(img => { img.onload = null; img.onerror = null; img.removeAttribute('src'); });
        imageContainer.innerHTML = '';

        ansOv.classList.remove('visible', 'eye-answer');
        // Reset answer divider animation so it replays on next reveal
        if (ansDivider) { ansDivider.style.animation = 'none'; void ansDivider.offsetWidth; ansDivider.style.animation = ''; }
        if (ph) ph.classList.remove('hidden');

        this._currentFrame = null;
        this._currentImage = null;
        GS.currentFrameLoader = null;
      },

      /* Show a frame with smooth loading */
      async showFrame(f) {
        this._currentFrame = f;
        GS.currentFrameLoader = f;

        const ph = document.getElementById('framePlaceholder');
        const layer = document.getElementById('frameLayer');
        const dialogue = document.getElementById('frameDialogue');
        const imageContainer = document.getElementById('imageContainer');
        const ansOv = document.getElementById('answerOverlay');

        // Hide answer overlay
        ansOv.classList.remove('visible', 'eye-answer');

        // Handle dialogue type
        if (f.type === 'dialogue') {
          PaletteManager.reset();
          layer.style.opacity = '0';
          imageContainer.innerHTML = '';

          // Show dialogue text instantly (no typewriter animation)
          const dialogueQuote = document.getElementById('dialogueQuote');
          const dialogueContext = document.getElementById('dialogueContext');
          if (dialogueQuote) dialogueQuote.textContent = f.dialogue || '';
          if (dialogueContext) dialogueContext.textContent = f.context || 'Guess the Movie / Show';

          if (ph) ph.classList.add('hidden');
          dialogue.classList.add('visible');
          SoundManager.playDialogueIn();

          this.preloadUpcoming();
          return;
        }

        // Handle emoji type — plain emoji text, or a built-in icon slug (e.g. "clapperboard")
        if (f.type === 'emoji') {
          PaletteManager.reset();
          imageContainer.innerHTML = '';
          dialogue.classList.remove('visible');
          if (ph) ph.classList.add('hidden');
          const c = (f.content || '').trim();
          const isIconName = /^[a-z0-9-]+$/i.test(c);
          layer.innerHTML = `<span class="frame-emoji-big">${isIconName ? `<svg class="svg-icon"><use href="#icon-${c}" /></svg>` : c}</span>`;
          layer.style.opacity = '1';
          SoundManager.playFrameIn();
          this.preloadUpcoming();
          return;
        }

        // Hide dialogue if visible
        dialogue.classList.remove('visible');

        // Fade out placeholder
        if (ph) ph.classList.add('hidden');

        // Clean up any stale images in the container before adding new ones
        while (imageContainer.children.length > 1) {
          imageContainer.removeChild(imageContainer.firstChild);
        }

        const stageLoader = document.getElementById('frameStageLoader');
        if (stageLoader) stageLoader.style.display = 'block';

        // Create and load new image with crossfade
        const newImg = document.createElement('img');
        newImg.className = f.type === 'eye' ? 'frame-image eye-image' : 'frame-image';
        const frameRef = f; // capture reference for async callback

        try {
          await this.preloadImage(f.content);

          // Check if still valid after async preload
          if (GS.currentFrameLoader !== frameRef) return;

          newImg.onload = async () => {
            // Check if still valid
            if (GS.currentFrameLoader !== frameRef) {
              newImg.onload = null; newImg.onerror = null; newImg.removeAttribute('src'); // release without firing onerror
              return;
            }

            // Decode off main thread for jank-free rendering
            try { if (newImg.decode) await newImg.decode(); } catch (e) { }

            newImg.classList.add('loaded');
            PaletteManager.fromImage(newImg);

            // Crossfade: fade out old images
            const oldImages = imageContainer.querySelectorAll('.frame-image.loaded');
            oldImages.forEach(old => {
              if (old !== newImg) {
                old.style.transition = 'opacity 0.4s ease';
                old.style.opacity = '0';
                setTimeout(() => { if (old.parentNode) old.parentNode.removeChild(old); }, 450);
              }
            });

            imageContainer.appendChild(newImg);
            this._currentImage = newImg;
            SoundManager.playFrameIn();
          };

          newImg.onerror = () => {
            // Fallback to placeholder
            PaletteManager.reset();
            layer.innerHTML = `<span class="frame-emoji-big"><svg class="svg-icon"><use href="#icon-clapperboard" /></svg></span>`;
            layer.style.opacity = '1';
          };

          newImg.src = f.content;

        } catch (e) {
          // Fallback
          if (GS.currentFrameLoader !== frameRef) return;
          PaletteManager.reset();
          layer.innerHTML = `<span class="frame-emoji-big"><svg class="svg-icon"><use href="#icon-clapperboard" /></svg></span>`;
          layer.style.opacity = '1';
        }

        this.preloadUpcoming();
      },

      /* Dialogue display (typewriter removed — instant text) */

      /* Reveal answer with blur */
      async revealAnswer(f) {
        const layer = document.getElementById('frameLayer');
        const imageContainer = document.getElementById('imageContainer');
        const dialogue = document.getElementById('frameDialogue');
        const ansOv = document.getElementById('answerOverlay');
        const ansTitle = document.getElementById('ansTitle');
        const ansYear = document.getElementById('ansYear');
        const ansDialogue = document.getElementById('ansDialogue');

        ansTitle.textContent = f.answer || '';
        ansYear.textContent = f.year ? `${f.year}` : '';

        if (f.type === 'dialogue' && f.dialogue) {
          ansDialogue.textContent = `"${f.dialogue}"`;
          ansDialogue.style.display = 'block';
        } else {
          ansDialogue.style.display = 'none';
        }

        // Blur effect
        if (f.type === 'dialogue') {
          dialogue.style.filter = 'blur(5px) brightness(0.5)';
        } else if (f.type === 'eye' && f.revealContent) {
          const loadedImg = imageContainer.querySelector('.frame-image.loaded:not(.eye-full-reveal)');
          if (loadedImg) {
            loadedImg.style.transition = 'filter 0.55s ease, transform 0.75s ease, opacity 0.55s ease';
            loadedImg.style.filter = 'blur(12px) brightness(.48)';
            loadedImg.style.transform = 'scale(1.08)';
            loadedImg.style.opacity = '.55';
          }

          try {
            await this.preloadImage(f.revealContent);
            const fullImg = document.createElement('img');
            fullImg.className = 'frame-image eye-full-reveal';
            fullImg.alt = f.answer || 'Full reveal photo';
            fullImg.onload = () => {
              if (GS.currentFrameLoader !== f) {
                fullImg.onload = null; fullImg.onerror = null; fullImg.removeAttribute('src');
                return;
              }
              imageContainer.appendChild(fullImg);
              requestAnimationFrame(() => fullImg.classList.add('visible', 'loaded'));
              PaletteManager.fromImage(fullImg);
            };
            fullImg.onerror = () => { fullImg.onerror = null; fullImg.removeAttribute('src'); };
            fullImg.src = f.revealContent;
            ansOv.classList.add('eye-answer');
          } catch (e) {
            ansOv.classList.remove('eye-answer');
          }
        } else {
          const loadedImg = imageContainer.querySelector('.frame-image.loaded');
          if (loadedImg) {
            loadedImg.style.transition = 'filter 0.5s ease';
            loadedImg.style.filter = 'blur(28px) brightness(.4)';
          } else if (layer.innerHTML) {
            layer.classList.add('blurred'); // emoji frames live in the layer, not imageContainer
          }
        }

        await new Promise(r => setTimeout(r, 180));
        ansOv.classList.add('visible');
        SoundManager.playReveal();
      },
    };

    /* ═══ GAME CONTROLLER ═══ */
    const GameController = {
      modScore(nameOrIdx, delta) {
        const idx = typeof nameOrIdx === 'number' ? nameOrIdx : GS.players.findIndex(p => p.name === nameOrIdx);
        if (idx >= 0) Scores.adjust(idx, delta);
      },
      _onlineMode: false,
      _isRemoteSession: false, // true for non-host clients
      _buildPayload(event, payload = {}) {
        return {
          event,
          ...payload,
          players: GS.players.map(p => ({ name: p.name, score: p.score, avatar: p.avatar, id: p.id, isHost: p.isHost, loaded: p.loaded })),
          currentSection: GS.currentSection,
          currentSectionRound: GS.currentSectionRound,
          currentPhase: GS.currentPhase,
          timeRemaining: GS.timeRemaining,
          judgeState: {
            currentJudge: GS.judge.currentJudge,
            currentJudgeIndex: GS.judge.currentJudgeIndex,
            currentJudgeRoundsServed: GS.judge.currentJudgeRoundsServed,
            globalRoundIndex: GS.judge.globalRoundIndex,
            usedJudges: GS.judge.usedJudges,
            cycleCount: GS.judge.cycleCount,
            judgeAnswered: GS.judge.judgeAnswered,
            judgeRewardGiven: GS.judge.judgeRewardGiven
          },
          scoringState: {
            locked: GS.scoring.locked,
            completed: GS.scoring.completed
          },
          tieBreakerState: {
            active: GS.tieBreaker.active,
            roundIndex: GS.tieBreaker.roundIndex,
            playerKeys: GS.tieBreaker.playerKeys,
            frame: GS.tieBreaker.frame,
            usedFrameKeys: GS.tieBreaker.usedFrameKeys
          },
          roundSkipped: GS.roundSkipped
        };
      },
      _broadcast(event, payload = {}) {
        return;
      },
      // Called on non-host clients to sync state from host broadcast data
      _syncFromHost(data) {
        ConnectionStatus.markSyncing();
        if (data.players) {
          GS.players = data.players.map(rp => ({
            ...rp,
            score: Number.isFinite(rp.score) ? rp.score : 0
          }));
        }
        if (data.currentSection !== undefined) GS.currentSection = data.currentSection;
        if (data.currentSectionRound !== undefined) GS.currentSectionRound = data.currentSectionRound;
        if (data.currentPhase !== undefined) GS.currentPhase = data.currentPhase;
        if (data.timeRemaining !== undefined) GS.timeRemaining = data.timeRemaining;
        if (data.judgeState) {
          const j = GS.judge;
          j.currentJudge = data.judgeState.currentJudge;
          j.currentJudgeIndex = data.judgeState.currentJudgeIndex;
          j.currentJudgeRoundsServed = data.judgeState.currentJudgeRoundsServed;
          j.globalRoundIndex = data.judgeState.globalRoundIndex;
          j.usedJudges = data.judgeState.usedJudges || [];
          j.cycleCount = data.judgeState.cycleCount || 0;
          j.judgeAnswered = data.judgeState.judgeAnswered || false;
          j.judgeRewardGiven = data.judgeState.judgeRewardGiven || false;
          Judges.updateDisplay();
        }
        if (data.scoringState) {
          GS.scoring.locked = data.scoringState.locked || false;
          GS.scoring.completed = data.scoringState.completed || false;
        }
        if (data.tieBreakerState) {
          GS.tieBreaker.active = !!data.tieBreakerState.active;
          GS.tieBreaker.roundIndex = data.tieBreakerState.roundIndex || 0;
          GS.tieBreaker.playerKeys = data.tieBreakerState.playerKeys || [];
          GS.tieBreaker.frame = data.tieBreakerState.frame || null;
          GS.tieBreaker.usedFrameKeys = data.tieBreakerState.usedFrameKeys || [];
        }
        if (data.roundSkipped !== undefined) GS.roundSkipped = data.roundSkipped;
        UI.renderLB();
      },
      _resetTieBreaker(fullReset = false) {
        GS.tieBreaker.active = false;
        GS.tieBreaker.playerKeys = [];
        GS.tieBreaker.frame = null;
        if (fullReset) {
          GS.tieBreaker.roundIndex = 0;
          GS.tieBreaker.usedFrameKeys = [];
        }
        const tieOv = document.getElementById('tieVsOv');
        if (tieOv) tieOv.classList.remove('on');
        const secBadge = document.querySelector('.sec-badge');
        if (secBadge) secBadge.classList.remove('tie-mode');
      },
      _validFramesForSection(sec) {
        return sec ? sec.frames.filter(f => (f.content && f.answer) || (f.type === 'dialogue' && f.dialogue && f.answer)) : [];
      },
      _currentValidFrames() {
        return GS.tieBreaker.active && GS.tieBreaker.frame ? [GS.tieBreaker.frame] : this._validFramesForSection(GS.sections[GS.currentSection]);
      },
      _currentFrame() {
        const valid = this._currentValidFrames();
        return GS.tieBreaker.active ? valid[0] : valid[GS.currentSectionRound];
      },
      _allPlayableFrames() {
        return GS.sections.flatMap(sec => this._validFramesForSection(sec));
      },
      _tieBreakerFramePool() {
        const frames = Array.isArray(GS.tieBreaker.frames) ? GS.tieBreaker.frames.filter(f => (f.content && f.answer) || (f.type === 'dialogue' && f.dialogue && f.answer)) : [];
        return frames.length ? frames : this._allPlayableFrames();
      },
      _frameKey(frame) {
        return [frame && frame.type || '', frame && frame.content || '', frame && frame.dialogue || '', frame && frame.answer || '', frame && frame.year || ''].join('::');
      },
      _pickTieBreakerFrame() {
        const frames = this._tieBreakerFramePool();
        if (!frames.length) return null;
        const used = new Set(GS.tieBreaker.usedFrameKeys || []);
        let pool = frames.filter(frame => !used.has(this._frameKey(frame)));
        if (!pool.length) {
          GS.tieBreaker.usedFrameKeys = [];
          pool = frames;
        }
        const chosen = pool[Math.floor(Math.random() * pool.length)];
        GS.tieBreaker.usedFrameKeys.push(this._frameKey(chosen));
        return { ...chosen };
      },
      _topTiePlayers() {
        if (GS.players.length < 2) return [];
        const topScore = Math.max(...GS.players.map(p => Number.isFinite(p.score) ? p.score : 0));
        return GS.players.filter(p => p.score === topScore);
      },
      _shouldStartTieBreaker() {
        if (this._onlineMode || this._isRemoteSession) return false;
        return this._topTiePlayers().length > 1;
      },
      _tieBreakerPlayers() {
        const keys = new Set(GS.tieBreaker.playerKeys || []);
        return GS.players.filter(p => keys.has(playerKey(p)));
      },
      _renderTieVsPlayers(players) {
        const box = document.getElementById('tieVsPlayers');
        if (!box) return;
        box.innerHTML = players.map((p, i) => {
          const avatar = p.avatarImg
            ? `<img src="${p.avatarImg}" alt="${p.name}" onerror="this.remove()">`
            : `${p.avatar ? `<svg class="svg-icon"><use href="#icon-${p.avatar}" /></svg>` : '?'}`;
          const mark = i < players.length - 1 ? '<div class="tie-vs-mark">VS</div>' : '';
          return `<div class="tie-vs-card" style="animation-delay:${i * 90}ms">
            <div class="tie-vs-avatar">${avatar}</div>
            <div class="tie-vs-name">${p.name}</div>
            <div class="tie-vs-score">${p.score} pts</div>
          </div>${mark}`;
        }).join('');
      },
      _showTieVs(players, cb) {
        this._renderTieVsPlayers(players);
        const ov = document.getElementById('tieVsOv');
        this._broadcast('tie-vs');
        SoundManager.playFanfare();
        if (!ov) { if (cb) cb(); return; }
        ov.classList.add('on');
        setTimeout(() => {
          ov.classList.remove('on');
          if (cb) cb();
        }, 3200);
      },
      startTieBreaker(tiedPlayers = null) {
        const players = tiedPlayers || this._topTiePlayers();
        const frame = this._pickTieBreakerFrame();
        if (players.length <= 1 || !frame) { this._resetTieBreaker(); this._showEndGameUI(); return; }

        TC.clear();
        FrameDisplay.reset();
        UI.showScoringOv(false);
        UI.showNonk(false);
        UI.showScreen('gameScreen');
        GS.tieBreaker.active = true;
        GS.tieBreaker.roundIndex++;
        GS.tieBreaker.playerKeys = players.map(playerKey);
        GS.tieBreaker.frame = frame;
        GS.scoring.locked = false;
        GS.scoring.completed = false;
        GS.roundSkipped = false;
        GS.judge.currentJudge = null;
        GS.judge.currentJudgeIndex = -1;
        GS.judge.currentJudgeRoundsServed = 0;
        Judges.updateDisplay();
        UI.renderLB();
        this._showTieVs(players, () => this.prepareRound());
      },
      _finishTieBreaker() {
        const stillTied = this._topTiePlayers();
        this._resetTieBreaker(false);
        FrameDisplay.reset();
        if (stillTied.length > 1) {
          setTimeout(() => { if (this._gameActive()) this.startTieBreaker(stillTied); }, 700);
        } else {
          this.endGame();
        }
      },
      startGame(isOnline = false) {
        SoundManager.playClick();
        if (!isOnline && Judges.calcTotal() === 0) { alert('Add at least one section with valid rounds!'); return; }
        if (!isOnline && !GS.players.length) { alert('Add at least one player!'); return; }
        this._onlineMode = isOnline || false;
        this._isRemoteSession = false;
        SoundManager.playGameStart();
        GS.players.forEach(p => p.score = 0);
        GS.currentSection = 0; GS.currentSectionRound = 0;
        GS.scoring.locked = false; GS.scoring.completed = false; GS.roundSkipped = false;
        this._resetTieBreaker(true);
        Judges.init(); TC.clear(); SM.set(GS.PHASES.IDLE);
        this._broadcast('start-game');
        UI.renderLB(); FrameDisplay.reset(); UI.showScreen('gameScreen'); this.showSectionIntro();
      },
      // Remote start for non-host clients
      _remoteStartGame(data) {
        this._onlineMode = true;
        this._isRemoteSession = true;
        this._syncFromHost(data);
        SoundManager.playGameStart();
        GS.players.forEach(p => p.score = 0);
        GS.scoring.locked = false; GS.scoring.completed = false; GS.roundSkipped = false;
        this._resetTieBreaker(true);
        TC.clear(); SM.set(GS.PHASES.IDLE);
        UI.renderLB(); FrameDisplay.reset(); UI.showScreen('gameScreen');
        // Client waits for host to send section-intro, does NOT drive its own chain
      },
      // True while the game screen is showing — used to stop un-cancellable
      // driver timeouts from advancing the game after the user has left it.
      _gameActive() { const el = document.getElementById('gameScreen'); return !!(el && el.classList.contains('active')); },
      showSectionIntro() {
        while (GS.currentSection < GS.sections.length) { const s = GS.sections[GS.currentSection]; if (this._validFramesForSection(s).length > 0) break; GS.currentSection++; }
        if (GS.currentSection >= GS.sections.length) { this.endGame(); return; }
        this._broadcast('section-intro');
        this._showSectionIntroUI();
        // Host drives the timer to move to prepareRound
        setTimeout(() => { const ov = document.getElementById('secIntroOv'); if (ov) ov.classList.remove('on'); if (!this._gameActive()) return; GS.currentSectionRound = 0; this.prepareRound(); }, 1200);
      },
      _showSectionIntroUI() {
        const sec = GS.sections[GS.currentSection];
        if (!sec) return;
        const sioIcon = document.getElementById('sioIcon');
        const sioName = document.getElementById('sioName');
        const sioRounds = document.getElementById('sioRounds');
        const curSecIcon = document.getElementById('curSecIcon');
        const curSecName = document.getElementById('curSecName');
        const sioDots = document.getElementById('sioDots');
        const secIntroOv = document.getElementById('secIntroOv');
        if (sioIcon) sioIcon.innerHTML = sec.icon;
        if (sioName) sioName.textContent = sec.name;
        if (sioRounds) sioRounds.textContent = this._validFramesForSection(sec).length;
        if (curSecIcon) curSecIcon.innerHTML = sec.icon;
        if (curSecName) curSecName.textContent = sec.name;
        if (sioDots) sioDots.innerHTML = GS.sections.map((_, i) => `<div class="sio-dot ${i < GS.currentSection ? 'c' : ''} ${i === GS.currentSection ? 'a' : ''}"></div>`).join('');
        SoundManager.playSectionIntro();
        if (secIntroOv) {
          secIntroOv.classList.add('on');
          // Respawn particles each time
          const pBox = document.getElementById('sioParticles');
          if (pBox) {
            pBox.innerHTML = '';
            for (let i = 0; i < 22; i++) {
              const p = document.createElement('span');
              p.className = 'sio-particle';
              const sz = Math.random() * 4 + 2;
              p.style.cssText = `
                width:${sz}px; height:${sz}px;
                left:${Math.random() * 100}%;
                animation-duration:${Math.random() * 6 + 5}s;
                animation-delay:${Math.random() * 4}s;
                opacity:0;
              `;
              pBox.appendChild(p);
            }
          }
          // Re-trigger entrance animation on content
          const sc = secIntroOv.querySelector('.sio-content');
          if (sc) { sc.style.animation = 'none'; sc.offsetWidth; sc.style.animation = ''; }
        }
      },
      prepareRound() {
        if (!this._gameActive()) return;
        if (GS.tieBreaker.active) {
          Judges.clearFlags();
          GS.scoring.locked = false; GS.scoring.completed = false; GS.roundSkipped = false;
          UI.showScoringOv(false); UI.showNonk(false);
          UI.setSkipControlsDisabled(false);
          this._broadcast('prepare-round');
          this.showRoundIntro();
          return;
        }
        const sec = GS.sections[GS.currentSection];
        const valid = this._validFramesForSection(sec);
        if (GS.currentSectionRound >= valid.length) { GS.currentSection++; this.showSectionIntro(); return; }
        Judges.clearFlags();
        GS.scoring.locked = false; GS.scoring.completed = false; GS.roundSkipped = false;
        UI.showScoringOv(false); UI.showNonk(false);
        UI.setSkipControlsDisabled(false);
        this._broadcast('prepare-round');
        // Host runs judge selection; after selection, host broadcasts round-intro
        Judges.process(() => this.showRoundIntro());
      },
      _roundIntroIntervalId: null,
      showRoundIntro() {
        if (!this._gameActive()) return;
        this._broadcast('round-intro');
        this._showRoundIntroUI();
        // Host drives timer: after countdown dots, move to startRound
        // Clear any previous interval to prevent leaks
        if (this._roundIntroIntervalId) { clearInterval(this._roundIntroIntervalId); this._roundIntroIntervalId = null; }
        const dots = ['rd1', 'rd2', 'rd3'].map(id => document.getElementById(id));
        let i = 0;
        this._roundIntroIntervalId = setInterval(() => {
          if (i < 3) {
            if (dots[i]) dots[i].classList.add('a');
            SoundManager.playClick();
            i++;
          } else {
            clearInterval(this._roundIntroIntervalId);
            this._roundIntroIntervalId = null;
            setTimeout(() => {
              const ov = document.getElementById('roundIntroOv');
              if (ov) ov.classList.remove('on');
              this.startRound();
            }, 250);
          }
        }, 300);
      },
      _showRoundIntroUI() {
        const ov = document.getElementById('roundIntroOv');
        const rioNum = document.getElementById('rioNum');
        const rioTag = document.getElementById('rioTag');
        const rioBadge = ov ? ov.querySelector('.rio-badge') : null;
        if (rioBadge) rioBadge.textContent = GS.tieBreaker.active ? 'TIE BREAKER' : 'ROUND';
        if (rioNum) rioNum.textContent = GS.tieBreaker.active ? GS.tieBreaker.roundIndex : GS.currentSectionRound + 1;
        if (rioTag) rioTag.textContent = GS.tieBreaker.active ? 'SUDDEN DEATH' : taglines[Math.floor(Math.random() * taglines.length)];
        ['rd1', 'rd2', 'rd3'].forEach(id => { const el = document.getElementById(id); if (el) el.classList.remove('a'); });
        SoundManager.playRoundStart();
        if (ov) ov.classList.add('on');
      },
      async startRound() {
        this._broadcast('start-round');
        await this._showRoundUI();
        // Only host runs the main timer
        TC.startMain(() => this.onMainDone());
      },
      async _showRoundUI() {
        const valid = this._currentValidFrames();
        const frame = this._currentFrame();
        if (!frame) return;
        const roundInfo = document.getElementById('roundInfo');
        if (roundInfo) roundInfo.textContent = GS.tieBreaker.active ? `Tie Breaker ${GS.tieBreaker.roundIndex}` : `Round ${GS.currentSectionRound + 1} / ${valid.length}`;
        const secBadge = document.querySelector('.sec-badge');
        if (secBadge) secBadge.classList.toggle('tie-mode', GS.tieBreaker.active);
        const curSecIcon = document.getElementById('curSecIcon');
        const curSecName = document.getElementById('curSecName');
        if (GS.tieBreaker.active) {
          if (curSecIcon) curSecIcon.innerHTML = '<svg class="svg-icon"><use href="#icon-trophy" /></svg>';
          if (curSecName) curSecName.textContent = 'Tie Breaker';
          const curJudge = document.getElementById('curJudge');
          const judgeRoundsLeft = document.getElementById('judgeRoundsLeft');
          if (curJudge) curJudge.textContent = 'No Judge';
          if (judgeRoundsLeft) judgeRoundsLeft.textContent = 'Sudden death';
        }
        UI.renderLB(); UI.showNonk(false);

        // Only host can skip
        UI.setSkipControlsDisabled(this._onlineMode && typeof RoomLobby !== 'undefined' && !RoomLobby.isHost);

        FrameDisplay.reset();
        await FrameDisplay.showFrame(frame);
        SM.set(GS.PHASES.ROUND_ACTIVE);
        this._persist();
      },
      onMainDone() {
        if (!SM.is(GS.PHASES.ROUND_ACTIVE)) return;
        TC.clear(); // ensure main timer is stopped
        this._broadcast('main-done');
        UI.setSkipControlsDisabled(true);
        if (GS.tieBreaker.active) { this.startReveal(); return; }
        this.startJudgePhase();
      },
      startJudgePhase() {
        this._broadcast('judge-phase');
        SM.set(GS.PHASES.JUDGE_PHASE); UI.renderLB();
        // Only host runs judge timer
        TC.startJudge(() => this.onJudgeDone());
      },
      onJudgeDone() {
        this._broadcast('judge-done');
        this.startReveal();
      },
      async startReveal() {
        this._broadcast('reveal-answer');
        await this._showRevealUI();
        // Host drives the reveal-to-scoring transition
        setTimeout(() => this.startScoring(), GS.settings.answerRevealDuration * 1000);
      },
      async _showRevealUI() {
        SM.set(GS.PHASES.ANSWER_REVEAL);
        UI.renderLB();
        const frame = this._currentFrame();
        if (!frame) return;
        await FrameDisplay.revealAnswer(frame);
      },
      startScoring() {
        // Guard: the reveal→scoring timeout isn't cancellable — if the game was
        // exited/reset during the reveal, don't ghost-start a scoring phase.
        if (!SM.is(GS.PHASES.ANSWER_REVEAL)) return;
        this._broadcast('scoring-start');
        this._showScoringUI();
      },
      _showScoringUI() {
        SM.set(GS.PHASES.SCORING_PHASE); GS.scoring.locked = false; GS.scoring.completed = false; GS.roundSkipped = false;
        // Populate answer into scoring overlay
        {
          const frame = this._currentFrame();
          const sabTitle = document.getElementById('scoringAnswerTitle');
          const sabYear = document.getElementById('scoringAnswerYear');
          if (frame && sabTitle) sabTitle.textContent = frame.answer || '—';
          if (frame && sabYear) sabYear.textContent = frame.year ? `(${frame.year})` : '';
        }
        SoundManager.playScoring(); UI.showScoringOv(true); UI.showNonk(true); UI.renderLB();
      },
      scoringClick(idx) {
        if (this._onlineMode && !RoomLobby.isHost) return;
        SoundManager.playClick();
        if (!SM.is(GS.PHASES.SCORING_PHASE) || GS.scoring.locked) return;
        if (GS.tieBreaker.active && !GS.tieBreaker.playerKeys.includes(playerKey(GS.players[idx]))) return;
        this._broadcast('scoring-click', { index: idx });
        this._applyScoringClick(idx);
      },
      _applyScoringClick(idx) {
        if (GS.scoring.locked) return;
        GS.scoring.locked = true; UI.showNonk(false); UI.disableScoring(); UI.markSelected(idx); UI.showLocked();
        const isJ = !GS.tieBreaker.active && idx === GS.judge.currentJudgeIndex; const pts = isJ ? GS.settings.judgePoints : GS.settings.pointsPerAnswer;
        Scores.add(idx, pts); Scores.popup(idx, pts); SoundManager.playSelPlayer(); GS.scoring.completed = true;
        setTimeout(() => this.endScoring(), 1200);
      },
      noOneKnows() {
        if (this._onlineMode && !RoomLobby.isHost) return;
        SoundManager.playClick();
        if (!SM.is(GS.PHASES.SCORING_PHASE) || GS.scoring.locked) return;
        this._broadcast('no-one-knows');
        this._applyNoOneKnows();
      },
      _applyNoOneKnows() {
        if (GS.scoring.locked) return;
        GS.scoring.locked = true; GS.roundSkipped = true; SoundManager.playSkip();
        const btn = document.getElementById('nonkBtn'), msg = document.getElementById('skipMsgEl');
        if (btn) btn.disabled = true; if (msg) msg.classList.add('on');
        UI.disableScoring(); UI.showSkipped();
        setTimeout(() => UI.showNonk(false), 800);
        setTimeout(() => this.endScoring(), 1500);
      },
      endScoring() {
        // Guard: fired from a 1.2–1.5s timeout — bail if the game was exited meanwhile.
        if (!SM.is(GS.PHASES.SCORING_PHASE)) return;
        this._broadcast('end-scoring');
        UI.showScoringOv(false); UI.showNonk(false); this.roundTransition();
      },
      roundTransition() {
        SM.set(GS.PHASES.ROUND_TRANSITION); SoundManager.playTransition(); TC.clear();
        if (GS.tieBreaker.active) { this._finishTieBreaker(); return; }
        Judges.incRound(); GS.currentSectionRound++;
        FrameDisplay.reset();
        const sec = GS.sections[GS.currentSection];
        const valid = this._validFramesForSection(sec);
        if (GS.currentSectionRound >= valid.length) { GS.currentSection++; if (GS.currentSection >= GS.sections.length) { this.endGame(); return; } this.showSectionIntro(); }
        else this.prepareRound();
      },
      _showCurrentDialogueText() {
        const frame = this._currentFrame();
        if (frame && frame.type === 'dialogue') {
          const dq = document.getElementById('dialogueQuote');
          if (dq) dq.textContent = frame.dialogue;
        }
      },
      skipRound() {
        if (this._onlineMode && typeof RoomLobby !== 'undefined' && !RoomLobby.isHost) return;
        SoundManager.playClick();
        if (!SM.is(GS.PHASES.ROUND_ACTIVE)) return;
        this._broadcast('skip-round');
        // Show full dialogue text before leaving round (in case typewriter was mid-word)
        this._showCurrentDialogueText();
        SoundManager.playSkip(); TC.clear(); this.onMainDone();
      },
      superSkipRound() {
        if (this._onlineMode && typeof RoomLobby !== 'undefined' && !RoomLobby.isHost) return;
        if (!SM.is(GS.PHASES.ROUND_ACTIVE) && !SM.is(GS.PHASES.JUDGE_PHASE)) return;
        if (this._skipping) return; // re-entrancy guard: block same-tick double-click before disabled attr takes effect
        this._skipping = true;
        SoundManager.playClick();
        UI.setSkipControlsDisabled(true);
        this._showCurrentDialogueText();
        TC.clear();
        this.startReveal();
        this._skipping = false;
      },
      endGame() {
        if (this._shouldStartTieBreaker()) { this.startTieBreaker(); return; }
        this._broadcast('end-game');
        this._showEndGameUI();
      },
      _playChampionFrames(playerFolder, fallbackHtml) {
        // Cancel any previous animation loop.
        if (this._champFrameTimer) { cancelAnimationFrame(this._champFrameTimer); this._champFrameTimer = null; }
        const canvas = document.getElementById('championFrames');
        if (!canvas || canvas.tagName !== 'CANVAS') return;
        const ctx = canvas.getContext('2d');
        const folder = playerFolder || 'avvtar/aman';
        const pad = n => String(n).padStart(4, '0');
        const MAX_FRAMES = folder.toLowerCase().includes('aman') ? 96 : 92;
        const FPS = 30;
        const frameDuration = 1000 / FPS;
        // Normalised canvas size — all characters render to the same box.
        const CW = 620, CH = 780;
        canvas.width = CW;
        canvas.height = CH;

        // Preload every frame into Image objects.
        const frames = [];
        let loaded = 0;

        const beginPlayback = () => {
          const valid = frames.filter(f => f.complete && f.naturalWidth > 0);
          if (!valid.length) {
            // Animation frames unavailable → show the static trophy image instead of a blank box.
            if (fallbackHtml && canvas.parentElement) canvas.parentElement.innerHTML = fallbackHtml;
            return;
          }
          let idx = 0;
          let lastTime = performance.now();

          const tick = (now) => {
            // Stop when the canvas was replaced OR the winner screen is no longer
            // showing — otherwise this 30fps loop would keep drawing forever
            // after Play Again / Home (winnerScreen is hidden, not removed).
            const el = document.getElementById('championFrames');
            const ws = document.getElementById('winnerScreen');
            if (el !== canvas || !ws || !ws.classList.contains('active')) { this._champFrameTimer = null; return; }
            const elapsed = now - lastTime;
            if (elapsed >= frameDuration) {
              lastTime = now - (elapsed % frameDuration);
              const f = valid[idx];
              // Fit frame into canvas preserving aspect ratio, anchored bottom-center.
              const srcW = f.naturalWidth, srcH = f.naturalHeight;
              const scale = Math.min(CW / srcW, CH / srcH);
              const dw = srcW * scale, dh = srcH * scale;
              const dx = (CW - dw) / 2;   // center horizontally
              const dy = CH - dh;           // anchor to bottom
              ctx.clearRect(0, 0, CW, CH);
              ctx.drawImage(f, dx, dy, dw, dh);
              idx = (idx + 1) % valid.length;
            }
            this._champFrameTimer = requestAnimationFrame(tick);
          };
          this._champFrameTimer = requestAnimationFrame(tick);
        };

        // Use frames already preloaded on the lobby loading screen (GS.imageCache);
        // only fall back to a network load for anything not cached yet.
        for (let i = 1; i <= MAX_FRAMES; i++) {
          const src = `${folder}/frame_${pad(i)}.png`;
          const cached = GS.imageCache.get(src);
          if (cached) {
            loaded++;
            frames.push(cached);
            continue;
          }
          const pre = new Image();
          pre.onload = pre.onerror = () => { loaded++; if (loaded >= MAX_FRAMES) beginPlayback(); };
          pre.src = src;
          frames.push(pre);
        }
        if (loaded >= MAX_FRAMES) beginPlayback();
      },
      _showEndGameUI(clearSave = true) {
        TC.clear(); SM.set(GS.PHASES.WINNER_SCREEN); SoundManager.playWinner();
        if (clearSave) this._clearPersist();
        UI.showScreen('winnerScreen');
        const sorted = [...GS.players].sort((a, b) => b.score - a.score);
        if (sorted.length === 0) return;

        // Group players into score tiers (1st, 2nd, 3rd unique score values)
        const tiers = [];
        sorted.forEach(p => {
          if (!tiers.length || p.score < tiers[tiers.length - 1][0].score)
            tiers.push([p]);
          else
            tiers[tiers.length - 1].push(p);
        });

        // Build circle HTML for a group of players
        const buildCircles = (players) => {
          const count = players.length;
          return `<div class="podium-avatar" data-count="${count}">${players.map(p => {
            const inner = p.avatarImg
              ? `<img src="${p.avatarImg}" alt="${p.name}" onerror="this.remove()">`
              : `<span>${p.avatar ? `<svg class="svg-icon"><use href="#icon-${p.avatar}" /></svg>` : '?'}</span>`;
            return `<div class="p-circle">${inner}</div>`;
          }).join('')
            }</div>`;
        };

        // winner-only: full-body trophy image (derived from avatar path, e.g. avvtar/aman.png -> "avvtar/aman trophy.png")
        const trophyImg = (p) => p.avatarImg ? p.avatarImg.replace(/(\.[a-z0-9]+)$/i, ' trophy$1') : null;
        const buildTrophies = (players) => {
          const count = players.length;
          // Single champion → play the trophy-lifting frame sequence (transparent, no border).
          if (count === 1) {
            const p = players[0];
            const tp = trophyImg(p);
            const fallback = tp
              ? `<img class='trophy-fig' src='${tp}' alt='${p.name}' onerror="this.onerror=null;${p.avatarImg ? `this.src='${p.avatarImg}';this.classList.add('is-fallback')` : `this.remove()`}">`
              : (p.avatarImg
                ? `<img class='trophy-fig is-fallback' src='${p.avatarImg}' alt='${p.name}' onerror="this.remove()">`
                : `<span class='trophy-fig is-fallback'><svg class='svg-icon'><use href='#icon-${p.avatar || 'user'}' /></svg></span>`);
            // Derive player-specific frame folder from avatarImg (e.g. avvtar/aman.png → avvtar/aman)
            const champFolder = p.avatarImg ? p.avatarImg.replace(/\.[a-z0-9]+$/i, '') : 'avvtar/aman';
            setTimeout(() => this._playChampionFrames(champFolder, fallback), 30);
            return `<div class="podium-avatar podium-trophy" data-count="1">
              <canvas class="trophy-vid" id="championFrames"></canvas>
            </div>`;
          }
          return `<div class="podium-avatar podium-trophy" data-count="${count}">${players.map(p => {
            const tp = trophyImg(p);
            if (tp) return `<img class="trophy-fig" src="${tp}" alt="${p.name}" onerror="this.onerror=null;${p.avatarImg ? `this.src='${p.avatarImg}';this.classList.add('is-fallback')` : `this.remove()`}">`;
            if (p.avatarImg) return `<img class="trophy-fig is-fallback" src="${p.avatarImg}" alt="${p.name}" onerror="this.remove()">`;
            return `<span class="trophy-fig is-fallback"><svg class="svg-icon"><use href="#icon-${p.avatar || 'user'}" /></svg></span>`;
          }).join('')}</div>`;
        };

        const tierLabel = (players) => players.map(p => p.name).join(' + ');
        const tierScore = (players) => `${players[0].score} pts`;

        // Fill up to 3 podium slots
        const slotIds = ['podiumAv1', 'podiumAv2', 'podiumAv3'];
        const slotEls = ['podiumSlot1', 'podiumSlot2', 'podiumSlot3'];
        const nameIds = ['podiumName1', 'podiumName2', 'podiumName3'];
        const scoreIds = ['podiumScore1', 'podiumScore2', 'podiumScore3'];
        slotEls.forEach((id, i) => {
          const slot = document.getElementById(id);
          const avEl = document.getElementById(slotIds[i]);
          const nameEl = document.getElementById(nameIds[i]);
          const scoreEl = document.getElementById(scoreIds[i]);
          if (!slot) return;
          if (!tiers[i] || !avEl) { slot.style.display = 'none'; return; }
          slot.style.display = '';
          avEl.outerHTML = (i === 0 ? buildTrophies(tiers[i]) : buildCircles(tiers[i]));
          // re-query since outerHTML replaced it
          const newAv = slot.querySelector('.podium-avatar');
          if (newAv) newAv.id = slotIds[i];
          if (nameEl) {
            nameEl.textContent = tierLabel(tiers[i]);
            nameEl.title = tierLabel(tiers[i]);
          }
          if (scoreEl) scoreEl.textContent = tierScore(tiers[i]);
        });

        const creatorMsgEl = document.getElementById('creatorMsg');
        if (creatorMsgEl) creatorMsgEl.textContent = GS.settings.creatorMessage;
        UI.renderFinalLB(); this.confetti();
      },
      confetti() {
        const box = document.getElementById('confettiBox');
        if (!box) return;
        box.innerHTML = '';
        const cols = ['#ff2e92', '#ffd700', '#4ade80', '#60a5fa', '#f472b6', '#a78bfa'];
        for (let i = 0; i < 100; i++) {
          const el = document.createElement('div'); el.className = 'confetti';
          el.style.cssText = `left:${Math.random() * 100}%;background:${cols[Math.floor(Math.random() * cols.length)]};animation-duration:${3 + Math.random() * 3}s;animation-delay:${Math.random() * 2}s;${Math.random() > .5 ? 'border-radius:50%' : ''}`;
          box.appendChild(el);
          if (i % 10 === 0) setTimeout(() => SoundManager.playPop(), Math.random() * 1000);
        }
        // Auto-cleanup confetti after animations finish to prevent memory leak
        setTimeout(() => { if (box) box.innerHTML = ''; }, 8000);
      },
      playAgain() {
        SoundManager.playClick();
        this._broadcast('play-again');
        FrameDisplay.reset();
        GS.players.forEach(p => p.score = 0);
        GS.currentSection = 0; GS.currentSectionRound = 0;
        GS.scoring.locked = false; GS.scoring.completed = false; GS.roundSkipped = false;
        this._resetTieBreaker(true);
        Judges.init(); TC.clear(); SM.set(GS.PHASES.IDLE);
        UI.renderLB(); UI.showScreen('gameScreen'); this.showSectionIntro();
      },
      goHome() {
        SoundManager.playClick();
        this._broadcast('go-home');
        // Clear any lingering round intro intervals
        if (this._roundIntroIntervalId) { clearInterval(this._roundIntroIntervalId); this._roundIntroIntervalId = null; }
        // Stop the champion trophy animation loop
        if (this._champFrameTimer) { cancelAnimationFrame(this._champFrameTimer); this._champFrameTimer = null; }
        // Hide fixed overlays that live outside the screen containers
        ['secIntroOv', 'roundIntroOv', 'judgeOv'].forEach(id => { const el = document.getElementById(id); if (el) el.classList.remove('on'); });
        Spectator.stopBroadcast();
        this._resetTieBreaker(true);
        this._clearPersist();
        TC.clear(); SM.set(GS.PHASES.IDLE); FrameDisplay.reset(); PaletteManager.reset(); UI.showScreen('homeScreen');
      },

      /* ═══ AUTO-RESUME — snapshot an in-progress game to localStorage ═══ */
      _RESUME_KEY: 'gtf_resume_v1',
      _persist() {
        // Called at the START of each round → captures scores entering the round,
        // so resuming replays the current round without double-counting awards.
        try {
          if (this._onlineMode || this._isRemoteSession) return;
          const snap = {
            v: 1, ts: Date.now(),
            sections: GS.sections, players: GS.players,
            currentSection: GS.currentSection, currentSectionRound: GS.currentSectionRound,
            judge: GS.judge, settings: GS.settings,
            tie: { active: GS.tieBreaker.active, roundIndex: GS.tieBreaker.roundIndex, playerKeys: GS.tieBreaker.playerKeys, frame: GS.tieBreaker.frame, usedFrameKeys: GS.tieBreaker.usedFrameKeys }
          };
          localStorage.setItem(this._RESUME_KEY, JSON.stringify(snap));
        } catch (e) { /* storage unavailable */ }
        this._checkResume();
      },
      _clearPersist() { try { localStorage.removeItem(this._RESUME_KEY); } catch (e) { } this._checkResume(); },
      _readSnap() {
        try {
          const raw = localStorage.getItem(this._RESUME_KEY);
          if (!raw) return null;
          const s = JSON.parse(raw);
          if (!s || s.v !== 1 || !Array.isArray(s.players) || !Array.isArray(s.sections)) return null;
          if (typeof s.currentSection !== 'number' || s.currentSection >= s.sections.length) return null;
          return s;
        } catch (e) { return null; }
      },
      _checkResume() {
        const btn = document.getElementById('homeResumeBtn');
        if (!btn) return;
        const s = this._readSnap();
        if (!s) { btn.style.display = 'none'; return; }
        const sec = s.sections[s.currentSection];
        const meta = document.getElementById('resumeMeta');
        if (meta) meta.textContent = sec ? `${sec.name} · Round ${(s.currentSectionRound || 0) + 1}` : 'Continue where you left off';
        btn.style.display = '';
      },
      resumeGame() {
        const s = this._readSnap();
        if (!s) { this._checkResume(); return; }
        SoundManager.playClick();
        this._onlineMode = false; this._isRemoteSession = false;
        GS.sections = s.sections;
        GS.players = s.players.map(p => ({ ...p, score: Number.isFinite(p.score) ? p.score : 0 }));
        GS.currentSection = s.currentSection;
        GS.currentSectionRound = s.currentSectionRound || 0;
        if (s.settings) Object.assign(GS.settings, s.settings);
        if (s.judge) Object.assign(GS.judge, s.judge);
        if (s.tie) { GS.tieBreaker.active = !!s.tie.active; GS.tieBreaker.roundIndex = s.tie.roundIndex || 0; GS.tieBreaker.playerKeys = s.tie.playerKeys || []; GS.tieBreaker.frame = s.tie.frame || null; GS.tieBreaker.usedFrameKeys = s.tie.usedFrameKeys || []; }
        GS.scoring.locked = false; GS.scoring.completed = false; GS.roundSkipped = false;
        GS.framesLoaded = true;
        TC.clear(); SM.set(GS.PHASES.IDLE);
        UI.renderLB(); FrameDisplay.reset(); UI.showScreen('gameScreen');
        this.prepareRound();
      }
    };


    /* ═══ ADMIN ═══ */
    const AdminPanel = {
      open() { SoundManager.playClick(); const modal = document.getElementById('adminModal'); if (modal) modal.classList.add('active'); this.renderSections(); this.renderPlayers(); this.updatePreview(); this.loadCfg(); this.tab('players'); },
      close() { SoundManager.playClick(); this.saveCfg(); const modal = document.getElementById('adminModal'); if (modal) modal.classList.remove('active'); UI.renderLB(); },
      previewWinner() {
        SoundManager.playClick(); this.saveCfg();
        const modal = document.getElementById('adminModal'); if (modal) modal.classList.remove('active');
        // give players a demo spread so the podium/standings look populated
        // (any real game start/replay resets every score to 0)
        const n = GS.players.length;
        GS.players.forEach((p, i) => { p.score = Math.max(0, (n - i) * 50 - (i % 2) * 10); });
        GameController._resetTieBreaker(true);
        GameController._showEndGameUI(false); // preview must not wipe a saved in-progress game
      },
      tab(name) {
        SoundManager.playClick();
        document.querySelectorAll('.admin-tab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
        document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
        const activeTab = document.querySelector(`[onclick="AdminPanel.tab('${name}')"]`);
        const tabContent = document.getElementById(`tab-${name}`);
        if (activeTab) { activeTab.classList.add('active'); activeTab.setAttribute('aria-selected', 'true'); }
        if (tabContent) tabContent.classList.add('active');
        if (name === 'players') this.updatePreview();
        if (name === 'sounds') this.renderSounds();
      },
      loadCfg() {
        const cfgTimer = document.getElementById('cfgTimer');
        const cfgJudgeTimer = document.getElementById('cfgJudgeTimer');
        const cfgReveal = document.getElementById('cfgReveal');
        const cfgPts = document.getElementById('cfgPts');
        const cfgJPts = document.getElementById('cfgJPts');
        const cfgMsg = document.getElementById('cfgMsg');
        const cfgVol = document.getElementById('cfgVol');
        if (cfgTimer) cfgTimer.value = GS.settings.timerDuration;
        if (cfgJudgeTimer) cfgJudgeTimer.value = GS.settings.judgePhaseDuration;
        if (cfgReveal) cfgReveal.value = GS.settings.answerRevealDuration;
        if (cfgPts) cfgPts.value = GS.settings.pointsPerAnswer;
        if (cfgJPts) cfgJPts.value = GS.settings.judgePoints;
        if (cfgMsg) cfgMsg.value = GS.settings.creatorMessage;
        if (cfgVol) cfgVol.value = SoundManager.vol * 100;
      },
      saveCfg() {
        const cfgTimer = document.getElementById('cfgTimer');
        const cfgJudgeTimer = document.getElementById('cfgJudgeTimer');
        const cfgReveal = document.getElementById('cfgReveal');
        const cfgPts = document.getElementById('cfgPts');
        const cfgJPts = document.getElementById('cfgJPts');
        const cfgMsg = document.getElementById('cfgMsg');
        const cfgVol = document.getElementById('cfgVol');
        GS.settings.timerDuration = parseInt(cfgTimer && cfgTimer.value) || 20;
        GS.settings.judgePhaseDuration = parseInt(cfgJudgeTimer && cfgJudgeTimer.value) || 5;
        GS.settings.answerRevealDuration = parseInt(cfgReveal && cfgReveal.value) || 2;
        GS.settings.pointsPerAnswer = parseInt(cfgPts && cfgPts.value) || 10;
        GS.settings.judgePoints = parseInt(cfgJPts && cfgJPts.value) || 20;
        GS.settings.creatorMessage = (cfgMsg && cfgMsg.value) || 'tanmayy, Tanuj, Darshan, Akash, Anmol and members of smoc.';
        { const volVal = cfgVol ? parseFloat(cfgVol.value) : NaN; SoundManager.setVolume(Number.isFinite(volVal) ? volVal / 100 : 0.25); }
      },

      /* ── Sounds tab ── */
      _soundDefs: [
        {
          category: 'UI', sounds: [
            { key: 'click', label: 'Button Click', play: () => SoundManager.playClick() },
            { key: 'hover', label: 'Button Hover', play: () => SoundManager.playHover() },
            { key: 'skip', label: 'Skip / Error', play: () => SoundManager.playSkip() },
          ]
        },
        {
          category: '⏳ Countdown', sounds: [
            { key: 'countBeep', label: 'Count Beep (3/2/1)', play: () => SoundManager.playCountBeep(2) },
            { key: 'fanfare', label: 'GO! Fanfare', play: () => SoundManager.playCountBeep(0) },
          ]
        },
        {
          category: '<svg class="svg-icon"><use href="#icon-clapperboard" /></svg> Cinematic Intro', sounds: [
            { key: 'hum', label: 'Ambient Hum', play: () => SoundManager.playHum() },
            { key: 'whoosh', label: 'Whoosh', play: () => SoundManager.playWhoosh() },
            { key: 'flare', label: 'Flare Burst', play: () => SoundManager.playFlare() },
            { key: 'typing', label: 'Typing Effect', play: () => { SoundManager.playTyping(); SoundManager.playTyping(); SoundManager.playTyping(); } },
            { key: 'divider', label: 'Divider Expand', play: () => SoundManager.playDivider() },
            { key: 'tagline', label: 'Tagline Appear', play: () => SoundManager.playTagline() },
            { key: 'sweepOut', label: 'Sweep Out', play: () => SoundManager.playSweepOut() },
          ]
        },
        {
          category: '<svg class="svg-icon"><use href="#icon-gamepad-2" /></svg> Game Flow', sounds: [
            { key: 'gameStart', label: 'Game Start', play: () => SoundManager.playGameStart() },
            { key: 'sectionIntro', label: 'Section Intro', play: () => SoundManager.playSectionIntro() },
            { key: 'roundStart', label: 'Round Start', play: () => SoundManager.playRoundStart() },
            { key: 'transition', label: 'Round Transition', play: () => SoundManager.playTransition() },
          ]
        },
        {
          category: '<svg class="svg-icon"><use href="#icon-image" /></svg> Frame', sounds: [
            { key: 'frameIn', label: 'Frame Reveal', play: () => SoundManager.playFrameIn() },
            { key: 'dialogueIn', label: 'Dialogue Typing', play: () => SoundManager.playDialogueIn() },
          ]
        },
        {
          category: 'Timer', sounds: [
            { key: 'tick', label: 'Timer Tick', play: () => SoundManager.playTick() },
            { key: 'tickWarn', label: 'Timer Warning', play: () => SoundManager.playTickWarn() },
          ]
        },
        {
          category: '<svg class="svg-icon"><use href="#icon-target" /></svg> Scoring', sounds: [
            { key: 'reveal', label: 'Answer Reveal', play: () => SoundManager.playReveal() },
            { key: 'scoring', label: 'Scoring Phase', play: () => SoundManager.playScoring() },
            { key: 'selPlayer', label: 'Player Selected', play: () => SoundManager.playSelPlayer() },
          ]
        },
        {
          category: '<svg class="svg-icon"><use href="#icon-trophy" /></svg> End', sounds: [
            { key: 'winner', label: 'Winner Fanfare', play: () => SoundManager.playWinner() },
            { key: 'pop', label: 'Confetti Pop', play: () => SoundManager.playPop() },
          ]
        },
      ],
      renderSounds() {
        const container = document.getElementById('soundsTabContent');
        if (!container) return;
        let html = '';
        this._soundDefs.forEach(cat => {
          html += `<div class="snd-category"><div class="snd-category-title">${cat.category}</div>`;
          cat.sounds.forEach(snd => {
            const cfg = SoundManager._sc(snd.key);
            html += `<div class="snd-row ${cfg.enabled ? '' : 'disabled'}" id="srow-${snd.key}">
              <label class="snd-toggle">
                <input type="checkbox" ${cfg.enabled ? 'checked' : ''} onchange="AdminPanel.setSoundEnabled('${snd.key}',this.checked)">
                <span class="snd-slider-bg"></span>
              </label>
              <span class="snd-name">${snd.label}</span>
              <div class="snd-range-wrap">
                <span class="snd-range-lbl">Pitch ${Math.round(cfg.pitch * 100)}%</span>
                <input type="range" min="0.25" max="3" step="0.05" value="${cfg.pitch}"
                  oninput="AdminPanel.setSoundPitch('${snd.key}',parseFloat(this.value));this.previousElementSibling.textContent='Pitch '+Math.round(this.value*100)+'%'">
              </div>
              <div class="snd-range-wrap">
                <span class="snd-range-lbl">Speed ${Math.round(cfg.speed * 100)}%</span>
                <input type="range" min="0.25" max="3" step="0.05" value="${cfg.speed}"
                  oninput="AdminPanel.setSoundSpeed('${snd.key}',parseFloat(this.value));this.previousElementSibling.textContent='Speed '+Math.round(this.value*100)+'%'">
              </div>
              <select class="snd-style-sel" onchange="AdminPanel.setSoundStyle('${snd.key}',this.value)">
                <option value="default" ${cfg.style === 'default' ? 'selected' : ''}>Default</option>
                <option value="retro"   ${cfg.style === 'retro' ? 'selected' : ''}>Retro</option>
                <option value="soft"    ${cfg.style === 'soft' ? 'selected' : ''}>Soft</option>
                <option value="arcade"  ${cfg.style === 'arcade' ? 'selected' : ''}>Arcade</option>
              </select>
              <button class="snd-play-btn" onclick="AdminPanel.previewSound('${snd.key}')" title="Preview">▶</button>
            </div>`;
          });
          html += '</div>';
        });
        container.innerHTML = html;
      },
      setSoundEnabled(key, val) {
        SoundManager._sc(key).enabled = val;
        const row = document.getElementById('srow-' + key);
        if (row) row.classList.toggle('disabled', !val);
      },
      setSoundPitch(key, val) { SoundManager._sc(key).pitch = val; },
      setSoundSpeed(key, val) { SoundManager._sc(key).speed = val; },
      setSoundStyle(key, val) { SoundManager._sc(key).style = val; },
      previewSound(key) {
        SoundManager.init();
        const def = this._soundDefs.flatMap(c => c.sounds).find(s => s.key === key);
        if (def) def.play();
      },
      resetAllSounds() {
        SoundManager.resetSounds();
        this.renderSounds();
        SoundManager.playClick();
      },
      updatePreview() {
        const t = Judges.calcTotal(), n = GS.players.length, p = n > 0 ? Math.max(1, Math.floor(t / n)) : 0;
        const prevTotal = document.getElementById('prevTotalRounds');
        const prevRPJ = document.getElementById('prevRPJ');
        if (prevTotal) prevTotal.textContent = t;
        if (prevRPJ) prevRPJ.textContent = p;
      },
      renderSections() {
        const c = document.getElementById('sectionList');
        if (!c) return;
        if (!GS.sections.length) { c.innerHTML = '<div style="text-align:center;color:#888;padding:36px;">No sections yet</div>'; return; }
        c.innerHTML = GS.sections.map((sec, si) => `
      <div class="section-card ${sec.collapsed ? 'collapsed' : ''}" data-s="${si}">
        <div class="section-card-header" onclick="AdminPanel.toggleSec(${si})">
          <select class="section-icon-select" onclick="event.stopPropagation()" onchange="AdminPanel.setSecIcon(${si},this.value)">${sectionIcons.map((ic, ii) => { const m = ic.match(/#icon-([a-z0-9-]+)/); return `<option value="${ii}" ${sec.icon === ic ? 'selected' : ''}>${m ? m[1].replace(/-/g, ' ') : 'icon'}</option>`; }).join('')}</select>
          <input type="text" value="${sec.name}" placeholder="Section Name" onclick="event.stopPropagation()" onchange="AdminPanel.setSecName(${si},this.value)">
          <div class="section-meta"><span class="rc">${sec.frames.filter(f => (f.content && f.answer) || (f.type === 'dialogue' && f.dialogue && f.answer)).length} rounds</span><button onclick="event.stopPropagation();AdminPanel.delSec(${si})"><svg class="svg-icon"><use href="#icon-trash-2" /></svg></button></div>
        </div>
        <div class="section-content">
          <div class="frame-list">${sec.frames.map((fr, fi) => `
            <div class="frame-item">
              <div class="frame-item-hdr"><span class="fn">Round #${fi + 1}</span><button onclick="AdminPanel.delFrame(${si},${fi})">×</button></div>
              <div class="frame-item-row"><label>Type:</label><select onchange="AdminPanel.setFrType(${si},${fi},this.value)"><option value="emoji" ${fr.type === 'emoji' ? 'selected' : ''}><svg class="svg-icon"><use href="#icon-smile" /></svg> Emoji</option><option value="image" ${fr.type === 'image' ? 'selected' : ''}><svg class="svg-icon"><use href="#icon-image" /></svg> Image URL</option><option value="eye" ${fr.type === 'eye' ? 'selected' : ''}><svg class="svg-icon"><use href="#icon-eye" /></svg> Eye Reveal</option><option value="dialogue" ${fr.type === 'dialogue' ? 'selected' : ''}><svg class="svg-icon"><use href="#icon-message-circle" /></svg> Dialogue</option></select></div>
              ${fr.type === 'dialogue' ? `
                <div class="frame-item-row"><label>Dialogue:</label><input type="text" value="${fr.dialogue || ''}" placeholder="Enter the famous dialogue..." onchange="AdminPanel.setFrDialogue(${si},${fi},this.value)"></div>
                <div class="frame-item-row"><label>Context:</label><input type="text" value="${fr.context || ''}" placeholder="Optional hint/context..." onchange="AdminPanel.setFrContext(${si},${fi},this.value)"></div>
              `: fr.type === 'eye' ? `
                <div class="frame-item-row"><label>Eye Image:</label><input type="text" value="${fr.content || ''}" placeholder="guesstheeye/name-eye.jpg" onchange="AdminPanel.setFrContent(${si},${fi},this.value)"></div>
                <div class="frame-item-row"><label>Full Photo:</label><input type="text" value="${fr.revealContent || ''}" placeholder="guesstheeye/name-full.jpg" onchange="AdminPanel.setFrRevealContent(${si},${fi},this.value)"></div>
              `: `
                <div class="frame-item-row"><label>${fr.type === 'emoji' ? 'Emoji:' : 'URL:'}</label><input type="text" value="${fr.content || ''}" placeholder="${fr.type === 'emoji' ? 'Enter emoji...' : 'Enter image URL...'}" onchange="AdminPanel.setFrContent(${si},${fi},this.value)"></div>
              `}
              <div class="frame-item-row"><label>Answer:</label><input type="text" value="${fr.answer || ''}" placeholder="Movie/Show name..." onchange="AdminPanel.setFrAnswer(${si},${fi},this.value)"></div>
              <div class="frame-item-row"><label>Year:</label><input type="text" value="${fr.year || ''}" placeholder="Year (optional)" onchange="AdminPanel.setFrYear(${si},${fi},this.value)"></div>
            </div>`).join('')}
          </div>
          <button class="add-frame-btn" onclick="AdminPanel.addFrame(${si})"><svg class="svg-icon"><use href="#icon-plus" /></svg> Add Round</button>
        </div>
      </div>`).join('');
        this.updatePreview();
      },
      addSection() { SoundManager.playClick(); GS.sections.push({ id: GS.nextSectionId++, name: `Section ${GS.sections.length + 1}`, icon: sectionIcons[Math.floor(Math.random() * sectionIcons.length)], collapsed: false, frames: [] }); this.renderSections(); },
      delSec(si) { SoundManager.playClick(); if (GS.sections.length <= 1) { alert('Need at least one section!'); return; } if (confirm(`Delete "${GS.sections[si].name}"?`)) { GS.sections.splice(si, 1); this.renderSections(); } },
      toggleSec(si) { SoundManager.playClick(); GS.sections[si].collapsed = !GS.sections[si].collapsed; this.renderSections(); },
      setSecName(si, v) { GS.sections[si].name = v; },
      setSecIcon(si, v) { const ic = sectionIcons[parseInt(v, 10)]; if (ic) GS.sections[si].icon = ic; },
      addFrame(si) { SoundManager.playClick(); const isEyeSection = /guess the eye/i.test(GS.sections[si].name || ''); GS.sections[si].frames.push(isEyeSection ? { type: 'eye', content: '', revealContent: '', answer: 'Person Name', year: '' } : { type: 'emoji', content: 'clapperboard', answer: 'New Movie', year: '' }); this.renderSections(); },
      setFrType(si, fi, v) { const fr = GS.sections[si].frames[fi]; fr.type = v; if (v === 'dialogue') { delete fr.content; delete fr.revealContent; fr.dialogue = 'Famous dialogue here'; fr.context = 'Guess the movie'; } else { delete fr.dialogue; delete fr.context; fr.content = v === 'emoji' ? 'clapperboard' : ''; if (v === 'eye') { fr.revealContent = ''; fr.answer = fr.answer || 'Person Name'; } else { delete fr.revealContent; } } this.renderSections(); },
      setFrContent(si, fi, v) { GS.sections[si].frames[fi].content = v; this.updatePreview(); },
      setFrRevealContent(si, fi, v) { GS.sections[si].frames[fi].revealContent = v; this.updatePreview(); },
      setFrDialogue(si, fi, v) { GS.sections[si].frames[fi].dialogue = v; this.updatePreview(); },
      setFrContext(si, fi, v) { GS.sections[si].frames[fi].context = v; },
      setFrAnswer(si, fi, v) { GS.sections[si].frames[fi].answer = v; this.updatePreview(); },
      setFrYear(si, fi, v) { GS.sections[si].frames[fi].year = v; },
      delFrame(si, fi) { SoundManager.playClick(); GS.sections[si].frames.splice(fi, 1); this.renderSections(); },
      renderPlayers() {
        const avatarList = ["cat", "ghost", "dog", "circle", "sparkles", "bird", "smile", "eye", "activity", "waves", "square", "hexagon", "octagon", "music", "scissors", "sun", "meh"];
        const c = document.getElementById('playerList');
        if (!c) return;
        c.innerHTML = GS.players.map((p, i) => {
          const av = p.avatar ? `<svg class="svg-icon"><use href="#icon-${p.avatar}" /></svg>` : '<svg class="svg-icon"><use href="#icon-meh" /></svg>';
          const opts = avatarList.map(a => `<button class="av-opt" title="${a}" onclick="event.stopPropagation();AdminPanel.setAvatar(${i},'${a}')"><svg class='svg-icon'><use href='#icon-${a}' /></svg></button>`).join('');
          return `<div class="player-item">
            <div class="av-pick" onclick="AdminPanel.toggleAvPicker(${i})">${av}<div class="av-dropdown" id="avDrop${i}">${opts}</div></div>
            <input type="text" value="${p.name}" placeholder="Player Name" onchange="AdminPanel.setPlayer(${i},this.value)">
            <button onclick="AdminPanel.delPlayer(${i})">×</button>
          </div>`;
        }).join('');
      },
      toggleAvPicker(i) { SoundManager.playClick(); const d = document.getElementById('avDrop' + i); if (!d) return; document.querySelectorAll('.av-dropdown').forEach(dd => { if (dd !== d) dd.classList.remove('open'); }); d.classList.toggle('open'); },
      setAvatar(i, av) { SoundManager.playClick(); GS.players[i].avatar = av; document.querySelectorAll('.av-dropdown').forEach(d => d.classList.remove('open')); this.renderPlayers(); UI.renderLB(); },
      addPlayer() { SoundManager.playClick(); const avatarList = ['cat', 'ghost', 'dog', 'circle', 'sparkles', 'bird', 'smile', 'eye', 'activity', 'waves', 'square', 'hexagon', 'octagon', 'music', 'scissors', 'sun', 'meh']; const usedAv = GS.players.map(p => p.avatar); const freeAv = avatarList.filter(a => !usedAv.includes(a)); GS.players.push({ name: 'Player ' + (GS.players.length + 1), score: 0, avatar: freeAv[0] || avatarList[GS.players.length % avatarList.length] }); this.renderPlayers(); this.updatePreview(); UI.renderLB(); },
      setPlayer(i, v) { GS.players[i].name = v; UI.renderLB(); },
      delPlayer(i) { SoundManager.playClick(); if (GS.players.length <= 1) { alert('Need at least one player!'); return; } GS.players.splice(i, 1); this.renderPlayers(); this.updatePreview(); UI.renderLB(); }
    };

    /* ═══ CONNECTION STATUS MANAGER ═══ */
    const ConnectionStatus = {
      _status: 'disconnected',
      _lastSync: 0,

      setStatus(status) {
        this._status = status;
        const el = document.getElementById('connectionStatus');
        const txt = document.getElementById('connectionStatusText');
        if (!el || !txt) return;

        // Only show for online games
        const isOnline = GameController._onlineMode || (typeof RoomLobby !== 'undefined' && RoomLobby.channel);
        el.classList.toggle('online', isOnline);

        el.classList.remove('connected', 'syncing', 'disconnected');
        el.classList.add(status);

        switch (status) {
          case 'connected':
            txt.textContent = 'Live';
            break;
          case 'syncing':
            txt.textContent = 'Syncing...';
            break;
          case 'disconnected':
            txt.textContent = 'Offline';
            break;
        }
      },

      markSyncing() {
        this.setStatus('syncing');
        this._lastSync = Date.now();
        // Auto-reset to connected after a short delay
        setTimeout(() => {
          if (Date.now() - this._lastSync >= 300) {
            this.setStatus('connected');
          }
        }, 350);
      },

      markConnected() {
        this.setStatus('connected');
      },

      markDisconnected() {
        this.setStatus('disconnected');
      },

      hide() {
        const el = document.getElementById('connectionStatus');
        if (el) el.classList.remove('online');
      }
    };

    /* Offline-only compatibility stubs. Online rooms were removed. */
    const RoomLobby = {
      channel: null,
      roomId: null,
      roomCode: null,
      playerId: null,
      isHost: false,
      init() { this.channel = null; },
      checkUrlParams() {
        if (window.location.search.includes('room=') || window.location.search.includes('spectate=')) {
          history.replaceState(null, '', window.location.pathname + window.location.hash);
        }
      },
      showOptions() { PlayerLobby.show(); },
      createRoom() { alert('Online play has been removed. Use local offline play.'); },
      joinRoom() { alert('Online play has been removed. Use local offline play.'); },
      startOnlineGame() { MultiplayerEngine.startMatch(); },
      leaveRoom() { UI.showScreen('homeScreen'); },
      broadcast() { },
      renderLobby() { },
      updatePlayerLoadProgress() { },
      _disconnectChannel() { this.channel = null; },
      _resetRoomState() {
        this.roomId = null;
        this.roomCode = null;
        this.playerId = null;
        this.isHost = false;
        GameController._onlineMode = false;
        GameController._isRemoteSession = false;
      }
    };
    /* Chat was tied to online play and is disabled in offline-only mode. */
    const LobbyChat = {
      clear() { },
      send() { },
      receive() { },
      append() { }
    };
    /* Spectator mode was removed for offline-only play. */
    const Spectator = {
      active: false,
      channel: null,
      code: null,
      _isSpectator: false,
      startBroadcast() { this.active = false; },
      stopBroadcast() { this.active = false; this.channel = null; this.code = null; },
      broadcast() { },
      togglePanel() { },
      copyCode() { },
      copyLink() { },
      joinAsSpectator() { alert('Spectator mode has been removed. Use local offline play.'); }
    };
    /* Secret Admin Access (Space x 5 on Home Screen) */
    let _spacePressCount = 0;
    let _spacePressTimer = null;
    document.addEventListener('keydown', e => {
      // Only watch if home screen is active and no inputs are focused
      if (document.getElementById('homeScreen').classList.contains('active') &&
        document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {

        if (e.code === 'Space') {
          e.preventDefault();
          _spacePressCount++;

          if (_spacePressTimer) clearTimeout(_spacePressTimer);

          const hint = document.getElementById('hSecretHint');
          if (hint) {
            if (_spacePressCount >= 2 && _spacePressCount < 5) {
              hint.textContent = `OVERRIDE: ${5 - _spacePressCount} MORE`;
              hint.classList.add('show');
            } else {
              hint.classList.remove('show');
            }
          }

          if (_spacePressCount >= 5) {
            _spacePressCount = 0;
            if (hint) hint.classList.remove('show');
            SoundManager.playClick();
            AdminPanel.open();
          } else {
            // Reset counter if too much time passes between presses
            _spacePressTimer = setTimeout(() => {
              _spacePressCount = 0;
              if (hint) hint.classList.remove('show');
            }, 600);
          }
        } else {
          // Pressing any other key resets the combo
          _spacePressCount = 0;
          const hint = document.getElementById('hSecretHint');
          if (hint) hint.classList.remove('show');
        }
      }
    });

    /* ═══ KEYBOARD SHORTCUTS ═══
       Enter  : Home→Play Game · Rules→Let's Play · Lobby→Start · Game→Super Skip
       1..8   : during scoring, award the correct answer to that player (in order) */
    document.addEventListener('keydown', e => {
      const tag = document.activeElement && document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const adminOpen = document.getElementById('adminModal') && document.getElementById('adminModal').classList.contains('active');
      if (adminOpen) return;
      const on = id => { const el = document.getElementById(id); return el && el.classList.contains('active'); };

      if (e.key === 'Enter') {
        if (on('homeScreen')) {
          e.preventDefault();
          showHowToPlay();
        } else if (on('playerLobbyScreen')) {
          const btn = document.getElementById('lobbyStartBtn');
          if (btn && !btn.disabled) { e.preventDefault(); PlayerLobby.start(); }
        } else if (on('gameScreen')) {
          e.preventDefault();
          if (SM.is(GS.PHASES.SCORING_PHASE)) {
            const nonkBtn = document.getElementById('nonkBtn');
            if (nonkBtn && !nonkBtn.disabled) GameController.noOneKnows();
          } else {
            GameController.superSkipRound();
          }
        }
        return;
      }

      // number keys award points during the scoring phase
      if (on('gameScreen') && /^[1-8]$/.test(e.key) && SM.is(GS.PHASES.SCORING_PHASE)) {
        const idx = parseInt(e.key, 10) - 1;
        if (idx >= 0 && idx < GS.players.length) { e.preventDefault(); GameController.scoringClick(idx); }
      }
    });

    /* hover sounds — debounced to prevent audio spam */
    let _lastHoverTime = 0;
    document.addEventListener('mouseover', e => {
      const now = Date.now();
      if (now - _lastHoverTime < 80) return;
      const sel = 'button,.btn-primary,.btn-secondary,.btn-outline,.admin-tab,.add-frame-btn,.add-section-btn,.add-player-btn,.close-btn,.skip-btn,.spbtn,.nonk-btn,.btn-start,.back-lnk';
      if (e.target.matches(sel) || e.target.closest(sel)) { _lastHoverTime = now; SoundManager.playHover(); }
    });

    /* Cleanup on page unload - prevent orphaned connections */
    window.addEventListener('beforeunload', () => {
      // Clean up RoomLobby connection
      if (RoomLobby._heartbeatId) { clearInterval(RoomLobby._heartbeatId); }
      if (RoomLobby._stateSyncId) { clearInterval(RoomLobby._stateSyncId); }
      if (RoomLobby._clientRoundIntroInterval) { clearInterval(RoomLobby._clientRoundIntroInterval); }
      if (RoomLobby.channel) { try { RoomLobby.channel.unsubscribe(); } catch (e) { } }

      // Clean up Spectator connection
      if (Spectator._specHeartbeatId) { clearInterval(Spectator._specHeartbeatId); }
      if (Spectator._specViewerHeartbeat) { clearInterval(Spectator._specViewerHeartbeat); }
      if (Spectator._specRoundIntroInterval) { clearInterval(Spectator._specRoundIntroInterval); }
      if (Spectator.channel) { try { Spectator.channel.unsubscribe(); } catch (e) { } }

      // Clean up timer
      TC.clear();

      // Clean up GameController round intro
      if (GameController._roundIntroIntervalId) { clearInterval(GameController._roundIntroIntervalId); }
    });

    
    

    /* boot */
    AdminPanel.renderSections();
    AdminPanel.renderPlayers();
    UI.renderLB();
    AdminPanel.updatePreview();
    RoomLobby.init();
    SM.set(GS.PHASES.IDLE);
    GameController._checkResume();



    /* ══════════════════════════════════════════════════════════════
       AVATAR MAGNIFIER POPOVER ENGINE (3X - 4X ZERO OVERLAP)
       ══════════════════════════════════════════════════════════════ */
    const AvatarPreview = {
      elem: null,
      init() {
        if (this.elem || typeof document === 'undefined') return;
        let el = document.getElementById('avatarMagnifierPreview');
        if (!el) {
          el = document.createElement('div');
          el.id = 'avatarMagnifierPreview';
          el.className = 'nb-av-popover';
          el.innerHTML = `
            <div class="nb-popover-circle">
              <img src="" id="nbPopoverImg" alt="Avatar Preview" />
            </div>
            <div class="nb-popover-name" id="nbPopoverName">Player</div>
          `;
          document.body.appendChild(el);
        }
        this.elem = el;

        document.addEventListener('mouseover', (e) => {
          const avWrap = e.target.closest('.lp-avatar-wrap, .lb-av-wrap, .jo-circle, .p-circle, .spbtn');
          if (!avWrap) return;
          
          const img = avWrap.querySelector('img');
          if (!img || !img.src) return;

          const playerCard = avWrap.closest('.lobby-player, .lb-item, .jo-cand, .sp-wrap, .podium-slot');
          let name = '';
          if (playerCard) {
            const nameEl = playerCard.querySelector('.lp-name, .lb-name, .jo-cname, .sp-name, .podium-name');
            if (nameEl) {
              name = nameEl.textContent.replace(/JUDGE|👑|\d+/g, '').trim();
            }
          }
          if (!name && avWrap.getAttribute('aria-label')) {
            name = avWrap.getAttribute('aria-label').replace('Award point to ', '').trim();
          }

          this.show(img.src, name, avWrap);
        });

        document.addEventListener('mouseout', (e) => {
          const avWrap = e.target.closest('.lp-avatar-wrap, .lb-av-wrap, .jo-circle, .p-circle, .spbtn');
          if (avWrap) this.hide();
        });
      },
      show(src, name, targetEl) {
        if (!this.elem) this.init();
        const pImg = document.getElementById('nbPopoverImg');
        const pName = document.getElementById('nbPopoverName');
        if (pImg) pImg.src = src;
        if (pName) {
          pName.textContent = name || 'PLAYER';
          pName.style.display = name ? 'block' : 'none';
        }

        const rect = targetEl.getBoundingClientRect();
        const circleSize = 140;
        const popWidth = 140;

        // Position circle concentric with target avatar center
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        let left = cx - popWidth / 2;
        let top = cy - circleSize / 2;

        // Keep inside screen boundaries if near viewport edge
        if (top < 10) top = 10;
        if (left < 10) left = 10;
        if (left + popWidth > window.innerWidth - 10) left = window.innerWidth - popWidth - 10;

        this.elem.style.left = `${left}px`;
        this.elem.style.top = `${top}px`;
        this.elem.style.transformOrigin = `center ${circleSize / 2}px`;
        this.elem.classList.add('visible');
      },
      hide() {
        if (this.elem) this.elem.classList.remove('visible');
      }
    };

    AvatarPreview.init();

  
    // Initialize Multiplayer Engine on load
    window.addEventListener('DOMContentLoaded', () => {
      MultiplayerEngine.init();
    });

  