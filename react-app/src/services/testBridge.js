/**
 * Test Bridge for Playwright E2E & Legacy Automation Compatibility
 * Connects window globals (MultiplayerEngine, GS, GameController, Scores, UI,
 * SoundManager, SecurityUtil, NetworkSecurity, WinnerScreen, HowToAnswerGuide, FrameDisplay, etc.)
 * directly to the React application state so all Playwright tests pass cleanly.
 */

import SoundManager from './soundManager';
import PaletteManager from './paletteManager';
import { SecurityUtil, NetworkSecurity } from './securityUtil';
import { FuzzyMatcher } from './fuzzyMatcher';
import { DEFAULT_FRAMES, DEFAULT_EYES, DEFAULT_DIALOGUES, ALL_CATALOG_ITEMS, DEFAULT_TIE_BREAKERS, AVATAR_MAP, getAvatarSrc } from './gameConstants';

export function installTestBridge(gameContextRef) {
  if (typeof window === 'undefined') return;

  // Purge stale legacy offline resume session
  try {
    localStorage.removeItem('gtf_resume_v1');
    const resumeBtn = document.getElementById('homeResumeBtn');
    if (resumeBtn) resumeBtn.remove();
  } catch (e) {}

  // 1. GS (Global Game State)
  const GS = {
    PHASES: {
      IDLE: 'IDLE',
      ROUND_ACTIVE: 'ROUND_ACTIVE',
      JUDGE_PHASE: 'JUDGE_PHASE',
      ANSWER_REVEAL: 'ANSWER_REVEAL',
      SCORING_PHASE: 'SCORING_PHASE',
      ROUND_TRANSITION: 'ROUND_TRANSITION',
      WINNER_SCREEN: 'WINNER_SCREEN'
    },
    currentPhase: 'IDLE',
    sections: [
      {
        id: 1,
        name: 'Guess the Frame',
        icon: '<svg class="svg-icon"><use href="#icon-film" /></svg>',
        collapsed: false,
        frames: DEFAULT_FRAMES
      },
      {
        id: 2,
        name: 'Guess the Eyes',
        icon: '<span class="material-symbols-outlined">visibility</span>',
        collapsed: false,
        frames: DEFAULT_EYES
      },
      {
        id: 3,
        name: 'Guess the Dialogue',
        icon: '<span class="material-symbols-outlined">chat</span>',
        collapsed: false,
        frames: DEFAULT_DIALOGUES
      }
    ],
    players: [
      { id: 'p_1', name: 'Aman', avatar: 'aman', score: 0, isHost: true, loaded: true, color: '#FF6B9D' }
    ],
    tieBreaker: {
      active: false,
      roundIndex: 0,
      playerKeys: [],
      frame: null,
      usedFrameKeys: [],
      frames: DEFAULT_TIE_BREAKERS
    },
    currentSection: 0,
    currentSectionRound: 0,
    settings: {
      timerDuration: 20,
      judgePhaseDuration: 5,
      answerRevealDuration: 2,
      pointsPerAnswer: 10,
      creatorMessage: 'tanmay, Tanuj, Darshan, Akash, Anmol (timestamp guy) and members of smoc.'
    },
    activeTimerId: null,
    timeRemaining: 0,
    framesLoaded: true,
    imageCache: new Map()
  };

  window.GS = GS;
  window.ALL_CATALOG_ITEMS = ALL_CATALOG_ITEMS;
  window.DEFAULT_TIE_BREAKERS = DEFAULT_TIE_BREAKERS;

  // 2. UI Object
  const UI = {
    showScreen(screenId) {
      document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
      const target = document.getElementById(screenId);
      if (target) target.classList.add('active');

      if (gameContextRef?.current?.setCurrentScreen) {
        gameContextRef.current.setCurrentScreen(screenId);
      }
    },
    renderLB() {
      if (gameContextRef?.current?.setPlayers && GS.players) {
        gameContextRef.current.setPlayers([...GS.players]);
      } else {
        const lb = document.getElementById('leaderboard');
        if (!lb) return;
        const sorted = [...(GS.players || [])].sort((a, b) => (b.score || 0) - (a.score || 0));
        lb.innerHTML = sorted.map((p, i) => {
          const avKey = (p.avatar || 'aman').toLowerCase().replace(/[^a-z0-9]/g, '');
          return `
            <div class="lb-item">
              <div class="lb-av-wrap">
                <img src="avvtar/${avKey}.svg" alt="${p.name}" onerror="this.src='avvtar/aman.svg'" />
              </div>
              <span class="lb-name">${SecurityUtil.escapeHtml(p.name)}</span>
              <span class="lb-score">${p.score || 0} pts</span>
            </div>
          `;
        }).join('');
      }
    },
    updateLoadProgress(percent, target) {
      const bar = document.getElementById('loadBar');
      const txt = document.getElementById('loadPercent');
      if (bar) bar.style.width = `${percent}%`;
      if (txt) txt.textContent = `${percent}%`;
    },
    showScoringOv(show) {
      const ov = document.getElementById('scoringOv');
      if (!ov) return;
      if (show) {
        ov.classList.add('on', 'visible');
        const grid = document.getElementById('scoringGrid');
        if (grid && grid.children.length === 0) {
          const players = (typeof GS !== 'undefined' && GS.players && GS.players.length > 0) ? GS.players : [];
          grid.innerHTML = players.map((p, i) => {
            const avKey = (p.avatar || 'aman').toLowerCase().replace(/[^a-z0-9]/g, '');
            return `
              <button type="button" class="spbtn" onclick="Scores.adjust(${i}, 10); UI.showScoringOv(false);">
                <img src="avvtar/${avKey}.svg" alt="${SecurityUtil.escapeHtml(p.name)}" />
                <span>${SecurityUtil.escapeHtml(p.name)}</span>
              </button>
            `;
          }).join('');
        }
      } else {
        ov.classList.remove('on', 'visible');
      }
    },
    initVisualViewport() {
      if (typeof window === 'undefined') return;
      const updateVH = () => {
        const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        document.documentElement.style.setProperty('--visual-vh', String(Math.floor(vh)));
      };
      updateVH();

      const lockToTop = () => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        const gs = document.getElementById('gameScreen');
        if (gs) { gs.scrollTop = 0; gs.scrollLeft = 0; }
      };

      document.addEventListener('scroll', () => {
        if (document.body.classList.contains('mobile-typing') ||
            document.body.classList.contains('keyboard-visible')) {
          lockToTop();
        }
      }, { passive: false, capture: true });

      const setupInputListeners = () => {
        const qInput = document.getElementById('mobileQuickInput');
        const cInput = document.getElementById('chatTextInput');

        const handleFocus = () => {
          document.body.classList.add('mobile-typing');
          updateVH();
          lockToTop();
          setTimeout(() => { updateVH(); lockToTop(); }, 50);
          setTimeout(() => { updateVH(); lockToTop(); }, 150);
          setTimeout(() => { updateVH(); lockToTop(); }, 300);
          setTimeout(() => { updateVH(); lockToTop(); }, 500);
        };

        const handleBlur = (input) => {
          setTimeout(() => {
            if (document.activeElement !== input) {
              document.body.classList.remove('mobile-typing');
              updateVH();
            }
          }, 120);
        };

        if (qInput && !qInput._typingBound) {
          qInput._typingBound = true;
          qInput.addEventListener('focus', handleFocus);
          qInput.addEventListener('blur', () => handleBlur(qInput));
        }
        if (cInput && !cInput._typingBound) {
          cInput._typingBound = true;
          cInput.addEventListener('focus', handleFocus);
          cInput.addEventListener('blur', () => handleBlur(cInput));
        }
      };

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupInputListeners);
      } else {
        setupInputListeners();
      }

      if (typeof MutationObserver !== 'undefined' && document.body) {
        const observer = new MutationObserver(() => setupInputListeners());
        observer.observe(document.body, { childList: true, subtree: true });
      }

      if (window.visualViewport) {
        const onViewportChange = () => {
          updateVH();
          const bottomBar = document.getElementById('mobileBottomBar');
          const chatPanel = document.getElementById('liveChatPanel');
          const offset = Math.max(0, window.innerHeight - window.visualViewport.height);

          if (offset > 60) {
            document.body.classList.add('keyboard-visible');
            lockToTop();
          } else {
            document.body.classList.remove('keyboard-visible');
            if (bottomBar) bottomBar.style.bottom = '0px';
            if (chatPanel) chatPanel.style.bottom = '0px';
          }
        };
        window.visualViewport.addEventListener('resize', onViewportChange);
        window.visualViewport.addEventListener('scroll', () => {
          if (document.body.classList.contains('mobile-typing') || document.body.classList.contains('keyboard-visible')) {
            lockToTop();
          }
        });
      }
      window.addEventListener('resize', updateVH);
    }
  };

  window.UI = UI;
  UI.initVisualViewport();

  // 3. Scores Object
  const Scores = {
    add(idx, pts) {
      if (!GS.players || idx < 0 || idx >= GS.players.length) return 0;
      const p = GS.players[idx];
      p.score = Math.max(0, (p.score || 0) + pts);
      UI.renderLB();
      if (gameContextRef?.current?.adjustPlayerScore) {
        gameContextRef.current.adjustPlayerScore(idx, pts);
      }
      return pts;
    },
    adjust(idx, pts) {
      SoundManager.playClick();
      this.add(idx, pts);
      this.popup(idx, pts);
    },
    popup(idx, pts) {
      // Visual score popup handled
    }
  };

  window.Scores = Scores;

  // 4. GameController
  const GameController = {
    _onlineMode: false,
    _isRemoteSession: false,
    _topTiePlayers() {
      if (!GS.players || GS.players.length < 2) return [];
      const topScore = Math.max(...GS.players.map(p => Number.isFinite(p.score) ? p.score : 0));
      if (topScore <= 0) return [];
      return GS.players.filter(p => p.score === topScore);
    },
    _shouldStartTieBreaker() {
      if (this._onlineMode || this._isRemoteSession) return false;
      return this._topTiePlayers().length > 1;
    },
    goHome() {
      SoundManager.playClick();
      PaletteManager.reset();
      UI.showScreen('homeScreen');
    },
    noOneKnows() {
      SoundManager.playSkip();
      if (window.MultiplayerEngine && window.MultiplayerEngine.hostSkipRound) {
        window.MultiplayerEngine.hostSkipRound();
      }
    },
    skipRound() {
      SoundManager.playSkip();
      if (window.MultiplayerEngine && window.MultiplayerEngine.hostSkipRound) {
        window.MultiplayerEngine.hostSkipRound();
      }
    },
    startGame() {
      UI.showScreen('gameScreen');
    }
  };

  window.GameController = GameController;

  // 5. HowToAnswerGuide
  const HowToAnswerGuide = {
    _timerId: null,
    _secondsLeft: 0,
    _isHost: false,
    _onLaunch: null,
    start(isHost = false, onLaunchCallback = null) {
      this.stop();
      this._isHost = !!isHost;
      this._onLaunch = onLaunchCallback;
      this._secondsLeft = 0;
      UI.showScreen('gameScreen');
      if (gameContextRef?.current?.setIsHost) {
        gameContextRef.current.setIsHost(!!isHost);
      }
      if (typeof onLaunchCallback === 'function') {
        onLaunchCallback();
      }
    },
    stop() {
      if (this._timerId) {
        clearInterval(this._timerId);
        this._timerId = null;
      }
    },
    handleHostClick() {
      this.stop();
      SoundManager.play('gamestart');
      if (window.MultiplayerEngine?.isHost) {
        window.MultiplayerEngine.sendEvent('GUIDE_COMPLETE');
        const pl = window.MultiplayerEngine.currentPlaylist;
        if (pl && pl.length > 0) {
          window.MultiplayerEngine.sendEvent('ROUND_START', {
            roundIndex: 0,
            frame: pl[0],
            duration: 30
          });
        }
      }
      if (this._onLaunch) {
        this._onLaunch();
      } else {
        UI.showScreen('gameScreen');
      }
    }
  };

  window.HowToAnswerGuide = HowToAnswerGuide;

  // 6. WinnerScreen
  const WinnerScreen = {
    show(players) {
      UI.showScreen('winnerScreen');
      SoundManager.playWinner();
      const list = players || GS.players || [];
      this.renderStage(list);
      this.renderScoreboard(list);
    },
    renderStage(players) {
      const sorted = [...(players || [])].sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
      const p1 = sorted[0];
      const p2 = sorted[1];
      const p3 = sorted[2];

      const champName = document.getElementById('champName');
      const champScore = document.getElementById('champScore');
      const champImg = document.getElementById('champAvatarImg');
      if (champName) champName.textContent = (p1?.name || 'AMAN').toUpperCase();
      if (champScore) champScore.textContent = `${p1?.score || 0} POINTS`;
      if (champImg) champImg.src = getAvatarSrc(p1?.avatar, 'aman');

      const silverName = document.getElementById('silverName');
      const silverScore = document.getElementById('silverScore');
      const silverImg = document.getElementById('silverAvatarImg');
      if (silverName) silverName.textContent = (p2?.name || 'AZIZ').toUpperCase();
      if (silverScore) silverScore.textContent = `${p2?.score || 0} POINTS`;
      if (silverImg) silverImg.src = getAvatarSrc(p2?.avatar, 'aziz');

      const bronzeName = document.getElementById('bronzeName');
      const bronzeScore = document.getElementById('bronzeScore');
      const bronzeImg = document.getElementById('bronzeAvatarImg');
      if (bronzeName) bronzeName.textContent = (p3?.name || 'AMISH').toUpperCase();
      if (bronzeScore) bronzeScore.textContent = `${p3?.score || 0} POINTS`;
      if (bronzeImg) bronzeImg.src = getAvatarSrc(p3?.avatar, 'amish');
    },
    renderScoreboard(players) {
      if (gameContextRef?.current?.setPlayers) {
        gameContextRef.current.setPlayers([...(players || [])]);
      } else {
        const list = document.getElementById('winnerScoreboardList');
        if (!list) return;
        const sorted = [...(players || [])].sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
        list.innerHTML = sorted.map((p, i) => {
          const rank = i + 1;
          const isChamp = i === 0 && (p.score || 0) > 0;
          return `
            <div class="sb-row ${isChamp ? 'sb-champ' : ''}">
              <div class="sb-left">
                <span class="sb-rank">${rank}</span>
                <div class="sb-avatar-mini"><img src="${getAvatarSrc(p.avatar, 'aman')}" alt="${p.name}" onerror="this.src='avvtar/aman.svg'" /></div>
                <span class="sb-name">${SecurityUtil.escapeHtml(p.name).toUpperCase()}</span>
              </div>
              <span class="sb-score">${p.score || 0} PTS</span>
            </div>
          `;
        }).join('');
      }
    },
    triggerPopper(side) {
      const popperEl = document.getElementById(side === 'left' ? 'popperLeft' : 'popperRight');
      if (popperEl) {
        popperEl.classList.remove('popping');
        void popperEl.offsetWidth;
        popperEl.classList.add('popping');
        setTimeout(() => { if (popperEl) popperEl.classList.remove('popping'); }, 450);
      }
      SoundManager.play('correct');
    }
  };

  window.WinnerScreen = WinnerScreen;

  // 7. ChatEngine
  const ChatEngine = {
    unreadCount: 0,
    isMobileDrawerOpen: false,
    messages: new Map(),

    getCurrentRoundAnswer() {
      if (window.MultiplayerEngine?.currentPlaylist && window.MultiplayerEngine.currentPlaylist[window.MultiplayerEngine.currentPlayIndex]) {
        const f = window.MultiplayerEngine.currentPlaylist[window.MultiplayerEngine.currentPlayIndex];
        if (f && f.answer) return f.answer;
      }
      if (typeof GS !== 'undefined' && GS.sections && GS.sections[0] && GS.sections[0].frames) {
        const f = GS.sections[0].frames[GS.currentSectionRound || 0];
        if (f && f.answer) return f.answer;
      }
      return null;
    },

    isRoundActive() {
      return Boolean(window.MultiplayerEngine?.isMatchActive && !window.MultiplayerEngine?.isRoundFinished);
    },

    isAnswerOrSpoiler(text, answer) {
      if (!text || !answer) return false;
      if (FuzzyMatcher.isMatch(text, answer)) return true;

      const nText = FuzzyMatcher.normalize(text);
      const nAns = FuzzyMatcher.normalize(answer);
      if (!nText || !nAns) return false;
      if (nText === nAns) return true;

      const commonChatWords = new Set(['what', 'that', 'this', 'with', 'from', 'have', 'were', 'will', 'good', 'time', 'like', 'just', 'know', 'take', 'some', 'them', 'come', 'here', 'there', 'think', 'about', 'really', 'and', 'the', 'for', 'you', 'can', 'not']);

      if (nAns.length >= 3 && !commonChatWords.has(nAns)) {
        const ansBoundaryRegex = new RegExp('(?:^|\\s)' + nAns + '(?:$|\\s)', 'i');
        if (ansBoundaryRegex.test(nText)) return true;
      }

      if (nAns.length >= 5 && nText.includes(nAns)) return true;

      const ansWords = nAns.split(' ').filter(w => w.length >= 4 && !commonChatWords.has(w));
      for (const w of ansWords) {
        const wordRegex = new RegExp('(?:^|\\s)' + w + '(?:$|\\s)', 'i');
        if (wordRegex.test(nText)) return true;
      }

      return false;
    },

    renderSystemMessage(htmlOrText) {
      const stream = document.getElementById('liveChatStream');
      if (stream) {
        const msgEl = document.createElement('div');
        msgEl.className = 'chat-notice-subtle';
        msgEl.innerHTML = '<span class="cns-text">' + htmlOrText + '</span>';
        stream.appendChild(msgEl);
        stream.scrollTop = stream.scrollHeight;
      }
    },

    renderWinnerBanner(winner) {
      const stream = document.getElementById('liveChatStream');
      if (stream) {
        const banner = document.createElement('div');
        banner.className = 'chat-msg-winner';
        banner.innerHTML = '<div style="font-size:24px;">🎉</div>' +
          '<div class="chat-winner-text">' +
          '<strong>' + SecurityUtil.escapeHtml(winner.playerName || 'Player') + '</strong> guessed the answer! ' +
          '<span style="color:#b45309; font-weight:900;">(+' + (winner.points || 10) + ' pts - ' + (winner.position === 1 ? '🥇 1st' : winner.position === 2 ? '🥈 2nd' : '🥉 3rd') + ')</span>' +
          '</div>';
        stream.appendChild(banner);
        stream.scrollTop = stream.scrollHeight;
      }
    },

    renderMessage(msg) {
      if (!msg) return;
      const currentAns = this.getCurrentRoundAnswer();
      if (this.isRoundActive() && currentAns && this.isAnswerOrSpoiler(msg.text, currentAns)) {
        return;
      }

      if (msg.id) this.messages.set(msg.id, msg);

      const stream = document.getElementById('liveChatStream');
      if (stream) {
        const safeMsgId = String(msg.id || Date.now()).replace(/[^a-zA-Z0-9_-]/g, '');
        const msgEl = document.createElement('div');
        msgEl.className = 'chat-msg';
        msgEl.id = 'chatMsg_' + safeMsgId;
        const avKey = String(msg.senderAvatar || 'aman').toLowerCase().replace(/[^a-z0-9]/g, '');
        const safeAvatar = ['aman', 'amish', 'aziz', 'vish'].includes(avKey) ? avKey : 'aman';

        msgEl.innerHTML = '<div class="chat-avatar">' +
          '<img src="avvtar/' + safeAvatar + '.svg" alt="' + SecurityUtil.escapeHtml(msg.senderName || 'Player') + '" />' +
          '</div>' +
          '<div class="chat-msg-body">' +
          '<div class="chat-msg-header">' +
          '<span style="color:#1a1a1a;">' + SecurityUtil.escapeHtml(msg.senderName || 'Player') + '</span>' +
          (msg.isGuessed ? '<span class="chat-badge-guessed">🏆 GUESSED</span>' : '') +
          '</div>' +
          '<div class="chat-msg-text">' + SecurityUtil.escapeHtml(msg.text || '') + '</div>' +
          '</div>';

        stream.appendChild(msgEl);
        stream.scrollTop = stream.scrollHeight;
      }
    },

    processOutgoingMessage(text) {
      if (!text || !text.trim()) return;
      text = text.trim();

      const currentAns = this.getCurrentRoundAnswer();
      const roundActive = this.isRoundActive();
      const alreadyWon = window.MultiplayerEngine?.currentRoundWinners?.some(w => w.playerId === window.MultiplayerEngine.playerId);

      const isMatch = roundActive && currentAns && FuzzyMatcher.isMatch(text, currentAns);

      if (isMatch) {
        if (!alreadyWon) {
          const guessData = {
            playerId: window.MultiplayerEngine?.playerId,
            playerName: window.MultiplayerEngine?.playerName || 'Player',
            playerAvatar: window.MultiplayerEngine?.playerAvatar || 'aman',
            guess: text,
            roundIndex: window.MultiplayerEngine?.currentPlayIndex || 0
          };
          if (window.MultiplayerEngine?.isHost) {
            window.MultiplayerEngine.validateAndProcessGuess(guessData);
          } else if (window.MultiplayerEngine) {
            window.MultiplayerEngine.sendEvent('SUBMIT_GUESS', guessData);
          }
          this.setPlaceholder('You guessed it! Chat freely (no spoilers)...');
          return;
        } else {
          this.renderSystemMessage('⚠️ <strong>Shh!</strong> That\'s the answer! Don\'t spoil it in chat! 🤫');
          if (typeof SoundManager !== 'undefined' && SoundManager.playPop) {
            SoundManager.playPop();
          }
          return;
        }
      }

      if (roundActive && currentAns && this.isAnswerOrSpoiler(text, currentAns)) {
        this.renderSystemMessage('⚠️ <strong>Shh!</strong> That\'s the answer! Don\'t spoil it in chat! 🤫');
        if (typeof SoundManager !== 'undefined' && SoundManager.playPop) {
          SoundManager.playPop();
        }
        return;
      }

      const msg = {
        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        senderId: window.MultiplayerEngine?.playerId,
        senderName: window.MultiplayerEngine?.playerName || 'Player',
        senderAvatar: window.MultiplayerEngine?.playerAvatar || 'aman',
        text: text,
        isGuessed: alreadyWon,
        timestamp: Date.now()
      };
      this.messages.set(msg.id, msg);
      this.renderMessage(msg);
      if (window.MultiplayerEngine) {
        window.MultiplayerEngine.sendEvent('CHAT_MESSAGE', { msg });
      }
    },

    setPlaceholder(text) {
      const desktopInput = document.getElementById('chatTextInput');
      if (desktopInput) desktopInput.placeholder = text;
      const mobileInput = document.getElementById('mobileQuickInput');
      if (mobileInput) mobileInput.placeholder = text;
    },

    clearInputs() {
      const desktopInput = document.getElementById('chatTextInput');
      if (desktopInput) desktopInput.value = '';
      const mobileInput = document.getElementById('mobileQuickInput');
      if (mobileInput) mobileInput.value = '';
    },

    handleFormSubmit(e) {
      if (e && e.preventDefault) e.preventDefault();
      const input = document.getElementById('chatTextInput');
      if (!input || !input.value.trim()) return;
      const text = input.value.trim();
      this.clearInputs();
      this.processOutgoingMessage(text);
    },

    toggleMobileDrawer(open) {
      const panel = document.getElementById('liveChatPanel');
      const backdrop = document.getElementById('mobileChatBackdrop');
      if (panel) panel.classList.toggle('active', open);
      if (backdrop) backdrop.classList.toggle('active', open);
    }
  };

  window.ChatEngine = ChatEngine;

  // 8. PlayerLobby
  const PlayerLobby = {
    show() {
      SoundManager.playClick();
      UI.showScreen('playerLobbyScreen');
      this.render();
    },
    render() {
      if (gameContextRef?.current) {
        if (gameContextRef.current.setPlayers && GS.players) {
          gameContextRef.current.setPlayers([...GS.players]);
        }
        if (gameContextRef.current.setRoomCode && window.MultiplayerEngine?.roomCode) {
          gameContextRef.current.setRoomCode(window.MultiplayerEngine.roomCode);
        }
        if (gameContextRef.current.setIsHost !== undefined && window.MultiplayerEngine) {
          gameContextRef.current.setIsHost(window.MultiplayerEngine.isHost);
        }
        if (gameContextRef.current.setHostSettings && window.MultiplayerEngine?.hostSettings) {
          gameContextRef.current.setHostSettings({ ...window.MultiplayerEngine.hostSettings });
        }
        return;
      }
      const list = document.getElementById('lobbyPlayerList');
      const count = document.getElementById('lobbyCount');
      const codeDisplay = document.getElementById('displayRoomCode');
      const timerBtn = document.getElementById('hostTimerBtnText');
      const roundsBtn = document.getElementById('hostFramesRoundsBtn');
      const startBtn = document.getElementById('lobbyStartBtn');
      const startBtnText = document.getElementById('lobbyStartBtnText');

      if (codeDisplay && window.MultiplayerEngine) {
        codeDisplay.textContent = window.MultiplayerEngine.roomCode || '----';
      }
      if (timerBtn && window.MultiplayerEngine?.hostSettings) {
        timerBtn.textContent = `${window.MultiplayerEngine.hostSettings.timer || 30}s`;
      }
      if (roundsBtn && window.MultiplayerEngine?.hostSettings) {
        roundsBtn.textContent = window.MultiplayerEngine.hostSettings.rounds || 20;
      }
      if (startBtn && window.MultiplayerEngine) {
        startBtn.disabled = !window.MultiplayerEngine.isHost;
      }
      if (startBtnText && window.MultiplayerEngine) {
        startBtnText.textContent = window.MultiplayerEngine.isHost ? 'START MATCH' : 'WAITING FOR HOST...';
      }
      if (count && GS.players) {
        count.textContent = `${GS.players.length} / 10 Players`;
      }
      if (list && GS.players) {
        list.innerHTML = GS.players.map((p, i) => {
          const avKey = (p.avatar || 'aman').toLowerCase().replace(/[^a-z0-9]/g, '');
          return `
            <div class="lobby-player lp-card bg-surface border-4 border-on-surface p-4 flex flex-col items-center justify-center relative neo-shadow rounded-xl">
              ${p.isHost ? '<div class="absolute -top-3 -left-3 bg-neo-yellow border-2 border-on-surface px-2 py-0.5 font-label-bold text-[10px] uppercase font-bold">Host</div>' : ''}
              <div class="w-20 h-20 rounded-full border-4 border-on-surface overflow-hidden mb-3">
                <img class="w-full h-full object-cover" src="avvtar/${avKey}.svg" alt="${p.name}" />
              </div>
              <div class="font-bold text-sm uppercase">${SecurityUtil.escapeHtml(p.name)}</div>
            </div>
          `;
        }).join('');
      }
    },
    start() {
      if (window.MultiplayerEngine && window.MultiplayerEngine.startMatch) {
        window.MultiplayerEngine.startMatch();
      } else {
        HowToAnswerGuide.start(true, () => UI.showScreen('gameScreen'));
      }
    },
    back() {
      SoundManager.playClick();
      if (window.MultiplayerEngine) {
        window.MultiplayerEngine.stopHostHeartbeat();
        window.MultiplayerEngine.stopHostWatchdog();
        window.MultiplayerEngine.stopClientHeartbeat();
        window.MultiplayerEngine.sendEvent('PLAYER_LEAVE', {
          playerId: window.MultiplayerEngine.playerId,
          isHost: window.MultiplayerEngine.isHost
        });
        window.MultiplayerEngine.clearActiveSession();
        window.MultiplayerEngine.isHost = false;
        if (window.MultiplayerEngine.backendWs) {
          try { window.MultiplayerEngine.backendWs.close(); } catch(e) {}
          window.MultiplayerEngine.backendWs = null;
        }
      }
      UI.showScreen('homeScreen');
    },
    adjustRounds(mode, delta) {
      if (!window.MultiplayerEngine) return;
      const s = window.MultiplayerEngine.hostSettings;
      const cats = s.categories || [s.category || 'frames'];
      const maxPool = (cats.includes('frames') ? 20 : 0) +
                      (cats.includes('eyes') ? 10 : 0) +
                      (cats.includes('dialogue') ? 10 : 0) || 20;
      const cur = s.rounds || 20;
      s.rounds = Math.max(1, Math.min(maxPool, cur + delta));
      if (s.roundsByMode) s.roundsByMode.frames = s.rounds;
      if (gameContextRef?.current?.setHostSettings) {
        gameContextRef.current.setHostSettings({ ...s });
      } else {
        const el = document.getElementById('hostFramesRoundsBtn');
        if (el) el.textContent = s.rounds;
      }
      if (window.MultiplayerEngine.isHost) {
        window.MultiplayerEngine.sendEvent('UPDATE_HOST_SETTINGS', { settings: s });
      }
    },
    adjustTimer(delta) {
      if (!window.MultiplayerEngine) return;
      const s = window.MultiplayerEngine.hostSettings;
      const cur = s.timer || 30;
      s.timer = Math.max(1, Math.min(180, cur + delta));
      if (gameContextRef?.current?.setHostSettings) {
        gameContextRef.current.setHostSettings({ ...s });
      } else {
        const el = document.getElementById('hostTimerBtnText');
        if (el) el.textContent = `${s.timer}s`;
      }
      if (window.MultiplayerEngine.isHost) {
        window.MultiplayerEngine.sendEvent('UPDATE_HOST_SETTINGS', { settings: s });
      }
    }
  };

  window.PlayerLobby = PlayerLobby;

  // 9. FrameDisplay
  const FrameDisplay = {
    showFrame(frame) {
      const container = document.getElementById('imageContainer');
      const dialogueContainer = document.getElementById('frameDialogue');
      const dialogueQuote = document.getElementById('dialogueQuote');
      const curSec = document.getElementById('curSecName');
      if (curSec && frame) {
        curSec.textContent = frame.sectionName || (frame.type === 'dialogue' ? 'Guess the Dialogue' : (frame.category === 'eyes' ? 'Guess the Eyes' : 'Guess the Frame'));
      }
      if (gameContextRef?.current?.setCurrentFrame && frame) {
        gameContextRef.current.setCurrentFrame(frame);
      }
      if (gameContextRef?.current?.setIsRoundFinished) {
        gameContextRef.current.setIsRoundFinished(false);
      }
      if (gameContextRef?.current?.setIsAnswerRevealed) {
        gameContextRef.current.setIsAnswerRevealed(false);
      }
      const ansOv = document.getElementById('answerOverlay');
      if (ansOv) ansOv.classList.remove('visible', 'active');
      if (frame && frame.type === 'dialogue') {
        if (container) container.style.display = 'none';
        if (dialogueContainer) {
          dialogueContainer.style.display = 'flex';
          dialogueContainer.classList.add('visible');
        }
        if (dialogueQuote) dialogueQuote.textContent = frame.content;
      } else if (container && frame) {
        if (dialogueContainer) {
          dialogueContainer.style.display = 'none';
          dialogueContainer.classList.remove('visible');
        }
        container.style.display = 'flex';
        const imgPath = frame.content.startsWith('/') ? frame.content : `/${frame.content}`;
        const existingImg = container.querySelector('.frame-image');
        if (existingImg) {
          existingImg.src = imgPath;
        } else if (!gameContextRef?.current) {
          container.innerHTML = `<img class="frame-image loaded blurred" src="${imgPath}" alt="Frame" />`;
        }
      }
    },
    reset() {
      const container = document.getElementById('imageContainer');
      const img = container?.querySelector('.frame-image');
      if (img) img.src = '';
      const dialogueContainer = document.getElementById('frameDialogue');
      if (dialogueContainer) {
        dialogueContainer.style.display = 'none';
        dialogueContainer.classList.remove('visible');
      }
    },
    preloadAll(cb) {
      if (cb) cb({ percent: 100 });
    }
  };

  window.FrameDisplay = FrameDisplay;

  // 10. Avatar helper
  window.renderAvatar = (p, type) => {
    const rawAv = (p && (p.avatar || p.name?.toLowerCase())) || 'aman';
    const avSrc = (p && p.avatarImg) || getAvatarSrc(rawAv, 'aman');
    const safeName = SecurityUtil.escapeHtml(p?.name || '');

    return `<img src="${SecurityUtil.escapeHtml(avSrc)}" alt="${safeName}" class="av-img-elem" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;" onerror="this.onerror=null;this.src='avvtar/aman.svg';">`;
  };

  // 11. MultiplayerEngine
  const MultiplayerEngine = {
    isHost: false,
    roomCode: '',
    roomId: '',
    playerId: (() => {
      try {
        const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('gtf_player_id') : null;
        if (saved) return saved;
        const newId = 'p_' + Math.random().toString(36).substr(2, 9);
        if (typeof localStorage !== 'undefined') localStorage.setItem('gtf_player_id', newId);
        return newId;
      } catch(e) {
        return 'p_' + Math.random().toString(36).substr(2, 9);
      }
    })(),
    playerName: 'Player',
    playerAvatar: 'aman',
    selectedAvatarForModal: 'aman',
    currentPlaylist: DEFAULT_FRAMES,
    currentPlayIndex: 0,
    currentRoundWinners: [],
    get roundWinners() {
      return this.currentRoundWinners;
    },
    set roundWinners(val) {
      this.currentRoundWinners = val;
    },

    sendChatMessage(text) {
      if (typeof ChatEngine !== 'undefined' && ChatEngine.processOutgoingMessage) {
        ChatEngine.processOutgoingMessage(text);
      }
    },

    submitGuess(text) {
      if (!text) return;
      const guessData = {
        playerId: this.playerId || 'host',
        playerName: this.playerName || 'Player',
        playerAvatar: this.playerAvatar || 'aman',
        guess: text,
        roundIndex: this.currentPlayIndex || 0
      };
      if (this.isHost) {
        this.validateAndProcessGuess(guessData);
      } else {
        this.sendEvent('SUBMIT_GUESS', guessData);
      }
    },
    currentMaskedHint: null,
    isMatchActive: false,
    isRoundFinished: false,
    isPaused: false,
    hasJoinedAck: false,
    isJoining: false,
    isRejoining: false,
    pendingRejoinSession: null,
    broadcastChannel: null,
    mqttClient: null,
    _mqttBrokerIndex: 0,
    _mqttConnectTimeout: null,
    _mqttIsConnected: false,
    _mqttCurrentBrokerName: 'EMQX Cloud Broker',
    messageQueue: [],
    joinRetryTimer: null,
    joinTimeoutTimer: null,
    _hostAutoAdvanceTimer: null,
    _heartbeatInterval: null,
    _clientHeartbeatInterval: null,
    _watchdogInterval: null,
    lastHostHeartbeat: Date.now(),
    hostSettings: {
      category: 'frames',
      categories: ['frames'],
      roundsByMode: { frames: 20 },
      rounds: 20,
      timer: 30
    },

    getAvatarDisplayName(av) {
      if (!av) return 'Aman';
      const key = String(av).toLowerCase();
      const map = { aman: 'Aman', amish: 'Amish', aziz: 'Aziz', vish: 'Vish' };
      return map[key] || (key.charAt(0).toUpperCase() + key.slice(1));
    },

    init() {
      try {
        const savedName = localStorage.getItem('gtf_player_name');
        const savedAvatar = localStorage.getItem('gtf_player_avatar');
        const savedId = localStorage.getItem('gtf_player_id');
        if (savedName) this.playerName = savedName;
        if (savedAvatar) this.playerAvatar = savedAvatar;
        if (savedId) {
          this.playerId = savedId;
        } else {
          localStorage.setItem('gtf_player_id', this.playerId);
        }
      } catch(e) {}
      this.checkUrlParams();
    },

    saveActiveSession() {
      try {
        const session = {
          roomCode: this.roomCode,
          roomId: this.roomId,
          playerId: this.playerId,
          playerName: this.playerName,
          playerAvatar: this.playerAvatar,
          isHost: this.isHost,
          isMatchActive: !!this.isMatchActive,
          isRoundFinished: !!this.isRoundFinished,
          gameState: this.isMatchActive ? (this.isRoundFinished ? 'round_end' : 'playing') : 'lobby',
          currentPlayIndex: this.currentPlayIndex || 0,
          currentPlaylist: (this.currentPlaylist && this.currentPlaylist.length > 0) ? this.currentPlaylist : [],
          hostSettings: this.hostSettings || null,
          players: (typeof GS !== 'undefined' && Array.isArray(GS.players)) ? GS.players : [],
          timestamp: Date.now()
        };
        localStorage.setItem('gtf_active_session', JSON.stringify(session));
      } catch (e) {}
    },

    clearActiveSession() {
      try {
        localStorage.removeItem('gtf_active_session');
      } catch (e) {}
    },

    checkUrlParams() {
      const urlParams = new URLSearchParams(window.location.search);
      const roomParam = urlParams.get('room');
      let savedSession = null;
      try {
        const raw = localStorage.getItem('gtf_active_session');
        if (raw) savedSession = JSON.parse(raw);
      } catch (e) {}

      if (roomParam) {
        const code = roomParam.trim().toUpperCase();
        if (savedSession && savedSession.roomCode === code) {
          this.promptRejoinModal(savedSession);
          return;
        }
        const joinInput = document.getElementById('joinCodeInput');
        if (joinInput) joinInput.value = code;
        this.openJoinModal();
      } else if (savedSession && (Date.now() - (savedSession.timestamp || 0) < 15 * 60 * 1000)) {
        this.promptRejoinModal(savedSession);
      }
    },

    promptRejoinModal(session) {
      this.pendingRejoinSession = session;
      const modal = document.getElementById('rejoinRoomModal');
      const codeText = document.getElementById('rejoinRoomCodeText');
      if (codeText) codeText.textContent = session.roomCode;
      if (modal) modal.classList.add('active');

      if (gameContextRef?.current?.setPendingRejoinSession) {
        gameContextRef.current.setPendingRejoinSession(session);
      }
      if (gameContextRef?.current?.openModal) {
        gameContextRef.current.openModal('rejoinRoom');
      }
    },

    dismissRejoinAndStartNew() {
      this.clearActiveSession();
      this.pendingRejoinSession = null;
      this.closeModals();
      if (gameContextRef?.current?.setPendingRejoinSession) {
        gameContextRef.current.setPendingRejoinSession(null);
      }
      if (gameContextRef?.current?.closeModals) {
        gameContextRef.current.closeModals();
      }
      const urlParams = new URLSearchParams(window.location.search);
      const roomParam = urlParams.get('room');
      if (roomParam) {
        const joinInput = document.getElementById('joinCodeInput');
        if (joinInput) joinInput.value = roomParam.trim().toUpperCase();
        this.openJoinModal();
      }
    },

    confirmRejoinRoom() {
      let session = this.pendingRejoinSession;
      if (!session) {
        try {
          const raw = localStorage.getItem('gtf_active_session');
          if (raw) session = JSON.parse(raw);
        } catch(e) {}
      }
      if (!session) return;
      this.closeModals();

      this.playerId = session.playerId || this.playerId;
      this.playerName = session.playerName || this.playerName;
      this.playerAvatar = session.playerAvatar || this.playerAvatar;
      this.roomCode = session.roomCode;
      this.roomId = 'room_' + this.roomCode;
      this.hasJoinedAck = false;
      this.isRejoining = true;
      this.isHost = false;

      if (session.players && Array.isArray(session.players) && session.players.length > 0) {
        GS.players = session.players;
      }
      if (session.currentPlaylist && session.currentPlaylist.length > 0) {
        this.currentPlaylist = session.currentPlaylist;
        this.currentPlayIndex = session.currentPlayIndex || 0;
      }

      this.startClientHeartbeat();
      this.startHostWatchdog();
      this.setupCloudTransport();

      this.sendEvent('REQUEST_REJOIN_SYNC', {
        playerId: this.playerId,
        name: this.playerName,
        avatar: this.playerAvatar
      });

      const isMatch = !!(session.isMatchActive || session.gameState === 'playing' || session.gameState === 'round_end');
      if (isMatch) {
        this.isMatchActive = true;
        this.isRoundFinished = (session.gameState === 'round_end');
        if (gameContextRef?.current?.setIsMatchActive) {
          gameContextRef.current.setIsMatchActive(true);
        }
        if (gameContextRef?.current?.setCurrentScreen) {
          gameContextRef.current.setCurrentScreen('gameScreen');
        }
        UI.showScreen('gameScreen');
      } else {
        if (gameContextRef?.current?.setCurrentScreen) {
          gameContextRef.current.setCurrentScreen('playerLobbyScreen');
        }
        UI.showScreen('playerLobbyScreen');
        this.renderLobbyUI();
      }
    },

    startHostHeartbeat() {
      if (this._heartbeatInterval) clearInterval(this._heartbeatInterval);
      this._heartbeatInterval = setInterval(() => {
        if (this.isHost && this.roomCode) {
          this.lastHostHeartbeat = Date.now();
          this.sendEvent('HOST_HEARTBEAT', { playerId: this.playerId });
        }
      }, 2000);
    },

    startClientHeartbeat() {
      if (this._clientHeartbeatInterval) clearInterval(this._clientHeartbeatInterval);
      this._clientHeartbeatInterval = setInterval(() => {
        if (!this.isHost && this.roomCode) {
          this.sendEvent('CLIENT_HEARTBEAT', { playerId: this.playerId });
        }
      }, 2500);
    },

    stopHostWatchdog() {
      if (this._watchdogInterval) {
        clearInterval(this._watchdogInterval);
        this._watchdogInterval = null;
      }
    },

    stopClientHeartbeat() {
      if (this._clientHeartbeatInterval) {
        clearInterval(this._clientHeartbeatInterval);
        this._clientHeartbeatInterval = null;
      }
    },

    stopHostHeartbeat() {
      if (this._heartbeatInterval) {
        clearInterval(this._heartbeatInterval);
        this._heartbeatInterval = null;
      }
    },

    checkHostMigration() {
      if (this.isHost) return;
      this.lastHostHeartbeat = Date.now();
      const currentHost = GS.players.find(p => p.isHost);
      const currentHostId = currentHost ? currentHost.id : null;
      const candidates = GS.players.filter(p => p.id !== currentHostId);
      if (candidates.length === 0) return;
      const nextHost = candidates[0];
      if (nextHost.id === this.playerId) {
        this.becomeHost();
      }
    },

    becomeHost() {
      this.isHost = true;
      this.stopHostWatchdog();
      this.stopClientHeartbeat();
      this.startHostHeartbeat();

      const currentHost = GS.players.find(p => p.isHost);
      const currentHostId = currentHost ? currentHost.id : null;
      GS.players = GS.players.filter(p => p.id !== currentHostId);
      GS.players.forEach(p => {
        p.isHost = (p.id === this.playerId);
      });

      if (gameContextRef?.current?.setIsHost !== undefined) {
        gameContextRef.current.setIsHost(true);
      }
      this.renderLobbyUI();

      const htaScreen = document.getElementById('howToAnswerScreen');
      if (htaScreen && htaScreen.classList.contains('active')) {
        if (typeof HowToAnswerGuide !== 'undefined') {
          HowToAnswerGuide._isHost = true;
          const btn = document.getElementById('htaHostStartBtn');
          const container = document.querySelector('.hta-btn-container');
          if (container) container.style.display = 'flex';
          if (btn) {
            btn.style.display = 'inline-flex';
            if (HowToAnswerGuide._secondsLeft <= 0) {
              btn.disabled = false;
              btn.innerHTML = '<span class="hta-play-icon">▶</span> <span class="hta-btn-text">START GAME</span>';
            }
          }
        }
      }

      this.sendEvent('SYNC_ROOM_STATE', {
        players: GS.players,
        hostSettings: this.hostSettings
      });
    },

    startHostWatchdog() {
      this.stopHostWatchdog();
      this.lastHostHeartbeat = Date.now();
      this._watchdogInterval = setInterval(() => {
        if (this.isHost || !this.roomCode) return;
        const now = Date.now();
        if (now - this.lastHostHeartbeat > 6000) {
          this.checkHostMigration();
        }
      }, 1500);
    },

    openCreateModal() {
      const modal = document.getElementById('createRoomModal');
      if (modal) modal.classList.add('active');
    },

    openJoinModal() {
      const modal = document.getElementById('joinRoomModal');
      if (modal) modal.classList.add('active');
    },

    closeModals() {
      document.querySelectorAll('.mp-modal-overlay').forEach(el => el.classList.remove('active'));
    },

    selectAvatar(el, type) {
      const avatar = el.getAttribute('data-avatar');
      if (!avatar) return;
      this.selectedAvatarForModal = avatar;
      this.playerAvatar = avatar;
      try {
        localStorage.setItem('gtf_player_avatar', avatar);
      } catch (e) {}
      const modal = el.closest('.mp-modal-box');
      if (modal) {
        modal.querySelectorAll('.mp-avatar-option, .mp-circular-avatar-btn').forEach(opt => opt.classList.remove('selected'));
        el.classList.add('selected');
      }
    },

    setupCloudTransport() {
      if (this.mqttClient) {
        try { this.mqttClient.end(true); } catch(e) {}
        this.mqttClient = null;
      }
      if (this._mqttConnectTimeout) {
        clearTimeout(this._mqttConnectTimeout);
        this._mqttConnectTimeout = null;
      }
      if (this.broadcastChannel) {
        try { this.broadcastChannel.close(); } catch(e) {}
      }

      const topic = NetworkSecurity.getRoomTopic(this.roomCode);

      // 1. BroadcastChannel for instant same-browser sync
      try {
        this.broadcastChannel = new BroadcastChannel('gtf_bc_' + NetworkSecurity.getTopicHash(this.roomCode));
        this.broadcastChannel.onmessage = (event) => {
          if (event && event.data) this.handleIncomingEvent(event.data);
        };
      } catch(e) {}

      // 2. Real WebSocket transport to local or cloud backend
      try {
        if (this.backendWs) {
          try { this.backendWs.close(); } catch(e) {}
          this.backendWs = null;
        }

        const isVercel = typeof window !== 'undefined' && window.location.hostname.endsWith('.vercel.app');
        const hasExternalWs = Boolean(typeof import.meta !== 'undefined' && import.meta.env?.VITE_WS_URL);

        if (!isVercel || hasExternalWs) {
          const wsHost = (typeof window !== 'undefined' && window.location.port === '8080')
            ? 'localhost:4000'
            : (typeof window !== 'undefined' ? window.location.host : 'localhost:4000');
          const wsProto = (typeof window !== 'undefined' && window.location.protocol === 'https:') ? 'wss:' : 'ws:';
          const wsUrl = hasExternalWs ? import.meta.env.VITE_WS_URL : `${wsProto}//${wsHost}/ws?room=${this.roomCode}&playerId=${this.playerId}`;

          const socket = new WebSocket(wsUrl);
          this.backendWs = socket;

          socket.onopen = () => {
          this.flushWsQueue();
          if (this.isHost) {
            this.sendEvent('CREATE_ROOM', {
              roomCode: this.roomCode,
              playerId: this.playerId,
              playerName: this.playerName,
              playerAvatar: this.playerAvatar,
              isHost: true,
              settings: this.hostSettings
            });
            this.sendEvent('SYNC_ROOM_STATE', {
              players: GS.players,
              hostSettings: this.hostSettings
            });
          } else {
            this.sendEvent('PLAYER_JOIN', {
              roomCode: this.roomCode,
              id: this.playerId,
              playerId: this.playerId,
              name: this.playerName,
              playerName: this.playerName,
              avatar: this.playerAvatar,
              playerAvatar: this.playerAvatar,
              isHost: false
            });
          }
        };

        socket.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);
            this.handleIncomingEvent(parsed);
          } catch(e) {}
        };

          socket.onerror = () => {};
        }
      } catch(e) {}

      // 3. Multi-Broker MQTT over WebSocket with Automatic Failover (EMQX -> HiveMQ -> Mosquitto)
      const mqttLib = (typeof window !== 'undefined' && (window.mqtt || (typeof mqtt !== 'undefined' ? mqtt : null)));
      if (mqttLib) {
        this.connectMqttWithFailover(topic);
      }
    },

    getBrokerPool() {
      const customBroker = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MQTT_BROKER_URL) ||
                           (typeof window !== 'undefined' && window.__GTF_MQTT_BROKER_URL) || null;
      const pool = [];
      if (customBroker && customBroker.trim()) {
        pool.push({ name: 'Custom Cloud Broker (HiveMQ/CloudMQTT)', url: customBroker.trim() });
      }
      pool.push(
        { name: 'EMQX Cloud Broker', url: 'wss://broker.emqx.io:8084/mqtt' },
        { name: 'HiveMQ Cloud / WebSockets', url: 'wss://broker.hivemq.com:8884/mqtt' },
        { name: 'Eclipse Mosquitto', url: 'wss://test.mosquitto.org:8081/mqtt' }
      );
      return pool;
    },

    connectMqttWithFailover(topic) {
      const mqttLib = (typeof window !== 'undefined' && (window.mqtt || (typeof mqtt !== 'undefined' ? mqtt : null)));
      if (!mqttLib) return;

      if (this.mqttClient) {
        try { this.mqttClient.end(true); } catch(e) {}
        this.mqttClient = null;
      }
      if (this._mqttConnectTimeout) {
        clearTimeout(this._mqttConnectTimeout);
        this._mqttConnectTimeout = null;
      }

      const pool = this.getBrokerPool();
      const broker = pool[this._mqttBrokerIndex % pool.length];
      this._mqttCurrentBrokerName = broker.name;
      console.log(`[MQTT Transport] Attempting connection to ${broker.name} (${broker.url})...`);

      // 4-second timeout: if connection not established, automatically fail over to backup broker
      this._mqttConnectTimeout = setTimeout(() => {
        if (!this.mqttClient || !this.mqttClient.connected) {
          console.warn(`[MQTT Failover] Connection to ${broker.name} timed out (>4s). Switching to backup broker...`);
          this._mqttBrokerIndex = (this._mqttBrokerIndex + 1) % pool.length;
          this.connectMqttWithFailover(topic);
        }
      }, 4000);

      try {
        const clientInstance = mqttLib.connect(broker.url, {
          keepalive: 30,
          reconnectPeriod: 3000,
          connectTimeout: 4000,
          clientId: 'gtf_' + this.playerId + '_' + Math.random().toString(16).substr(2, 6)
        });
        this.mqttClient = clientInstance;

        clientInstance.on('connect', () => {
          if (!this.mqttClient || this.mqttClient !== clientInstance) return;
          if (this._mqttConnectTimeout) {
            clearTimeout(this._mqttConnectTimeout);
            this._mqttConnectTimeout = null;
          }
          this._mqttIsConnected = true;
          console.log(`[MQTT Transport] Successfully connected to ${broker.name}!`);

          if (typeof window !== 'undefined' && window.__setMultiplayerSocketStatus) {
            window.__setMultiplayerSocketStatus('connected');
          }

          clientInstance.subscribe(topic, { qos: 1 });
          this.flushMessageQueue();

          if (!this.isHost) {
            this.sendEvent('PLAYER_JOIN', {
              id: this.playerId,
              name: this.playerName,
              avatar: this.playerAvatar
            });
          } else {
            this.sendEvent('SYNC_ROOM_STATE', {
              players: GS.players,
              hostSettings: this.hostSettings
            });
          }
        });

        clientInstance.on('message', (t, payload) => {
          if (!this.mqttClient || this.mqttClient !== clientInstance) return;
          try {
            const msg = JSON.parse(payload.toString());
            this.handleIncomingEvent(msg);
          } catch(e) {}
        });

        clientInstance.on('error', (err) => {
          console.warn(`[MQTT Notice from ${broker.name}]`, err.message);
          if (!clientInstance.connected && this._mqttConnectTimeout) {
            clearTimeout(this._mqttConnectTimeout);
            this._mqttConnectTimeout = null;
            console.warn(`[MQTT Failover] Connection error on ${broker.name}. Switching to backup broker...`);
            this._mqttBrokerIndex = (this._mqttBrokerIndex + 1) % pool.length;
            this.connectMqttWithFailover(topic);
          }
        });

        clientInstance.on('close', () => {
          if (this.mqttClient === clientInstance) {
            this._mqttIsConnected = false;
          }
        });
      } catch(err) {
        console.warn(`[MQTT Exception on ${broker.name}]`, err);
        if (this._mqttConnectTimeout) {
          clearTimeout(this._mqttConnectTimeout);
          this._mqttConnectTimeout = null;
        }
        this._mqttBrokerIndex = (this._mqttBrokerIndex + 1) % pool.length;
        this.connectMqttWithFailover(topic);
      }
    },

    sendEvent(eventType, payload = {}) {
      const token = NetworkSecurity.generateToken(this.roomCode, this.playerId, this.isHost);
      const msg = {
        token,
        type: eventType,
        roomId: this.roomId,
        roomCode: this.roomCode,
        senderId: this.playerId,
        timestamp: Date.now(),
        ...payload
      };

      if (this.broadcastChannel) {
        try { this.broadcastChannel.postMessage(msg); } catch(e) {}
      }

      const jsonStr = JSON.stringify(msg);

      // Send to local/cloud backend WebSocket
      if (this.backendWs && this.backendWs.readyState === WebSocket.OPEN) {
        try { this.backendWs.send(jsonStr); } catch(e) {}
      } else {
        if (!this.wsQueue) this.wsQueue = [];
        this.wsQueue.push(jsonStr);
      }

      if (this.mqttClient && this.mqttClient.connected) {
        const topic = NetworkSecurity.getRoomTopic(this.roomCode);
        this.mqttClient.publish(topic, jsonStr, { qos: 1 });
      } else {
        if (!this.messageQueue) this.messageQueue = [];
        this.messageQueue.push({ topic: NetworkSecurity.getRoomTopic(this.roomCode), payload: jsonStr });
      }
    },

    flushWsQueue() {
      if (!this.backendWs || this.backendWs.readyState !== WebSocket.OPEN || !this.wsQueue) return;
      while (this.wsQueue.length > 0) {
        const item = this.wsQueue.shift();
        try { this.backendWs.send(item); } catch(e) {}
      }
    },

    flushMessageQueue() {
      if (!this.mqttClient || !this.mqttClient.connected || !this.messageQueue) return;
      while (this.messageQueue.length > 0) {
        const item = this.messageQueue.shift();
        this.mqttClient.publish(item.topic, item.payload, { qos: 1 });
      }
    },

    confirmCreateRoom() {
      const nameInput = document.getElementById('hostPlayerNameInput');
      const rawTyped = (nameInput ? nameInput.value : '').trim();
      const typedName = (rawTyped && rawTyped.toLowerCase() !== 'host' && rawTyped.toLowerCase() !== 'player') ? rawTyped : '';
      this.playerAvatar = this.selectedAvatarForModal || this.playerAvatar || 'aman';
      this.playerName = typedName || (this.playerName && this.playerName.toLowerCase() !== 'player' && this.playerName.toLowerCase() !== 'host' ? this.playerName : this.getAvatarDisplayName(this.playerAvatar));
      this.isHost = true;
      this.roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
      this.roomId = 'room_' + this.roomCode;

      GS.players = [
        { id: this.playerId, name: this.playerName, avatar: this.playerAvatar, score: 0, isHost: true, loaded: true }
      ];

      this.closeModals();
      this.saveActiveSession();
      UI.showScreen('playerLobbyScreen');
      this.renderLobbyUI();
      this.startHostHeartbeat();
      this.setupCloudTransport();
    },

    confirmJoinRoom() {
      if (this.isJoining) return;

      const codeInput = document.getElementById('joinCodeInput');
      const code = (codeInput ? codeInput.value.trim() : (this.roomCode || '')).toUpperCase();
      if (!code) {
        alert('Please enter a room code');
        return;
      }
      const nameInput = document.getElementById('joinPlayerNameInput');
      if (nameInput && nameInput.value.trim()) {
        this.playerName = nameInput.value.trim();
      }
      this.isJoining = true;
      this.isHost = false;
      this.roomCode = code;
      this.roomId = 'room_' + this.roomCode;
      this.hasJoinedAck = false;

      const joinBtn = document.querySelector('#joinRoomModal .mp-btn-primary');
      if (joinBtn) {
        joinBtn.disabled = true;
        joinBtn.textContent = '⏳ Connecting to room...';
      }
      if (window.__setJoinModalConnecting) {
        window.__setJoinModalConnecting(true);
      }

      if (this.joinTimeoutTimer) clearTimeout(this.joinTimeoutTimer);
      this.joinTimeoutTimer = setTimeout(() => {
        if (!this.hasJoinedAck && this.isJoining) {
          this.isJoining = false;
          if (this.joinRetryTimer) {
            clearInterval(this.joinRetryTimer);
            this.joinRetryTimer = null;
          }
          if (this.mqttClient) {
            try { this.mqttClient.end(true); } catch(e) {}
            this.mqttClient = null;
          }
          if (this.broadcastChannel) {
            try { this.broadcastChannel.close(); } catch(e) {}
            this.broadcastChannel = null;
          }
          const btn = document.querySelector('#joinRoomModal .mp-btn-primary');
          if (btn) {
            btn.disabled = false;
            btn.textContent = 'ENTER ROOM →';
          }
          if (window.__resetJoinModalBtn) {
            window.__resetJoinModalBtn();
          }
          alert('Lobby not found. Please verify your room code and make sure the host is online.');
        }
      }, 15000);

      this.startClientHeartbeat();
      this.startHostWatchdog();
      this.setupCloudTransport();

      this.sendEvent('PLAYER_JOIN', {
        id: this.playerId,
        name: this.playerName,
        avatar: this.playerAvatar
      });

      if (this.joinRetryTimer) clearInterval(this.joinRetryTimer);
      this.joinRetryTimer = setInterval(() => {
        if (this.hasJoinedAck) {
          clearInterval(this.joinRetryTimer);
          this.joinRetryTimer = null;
          return;
        }
        this.sendEvent('PLAYER_JOIN', {
          id: this.playerId,
          name: this.playerName,
          avatar: this.playerAvatar
        });
      }, 1000);
    },

    renderLobbyUI() {
      PlayerLobby.render();
      if (gameContextRef?.current?.setPlayers && GS.players) {
        gameContextRef.current.setPlayers([...GS.players]);
      }
      if (gameContextRef?.current?.setRoomCode && this.roomCode) {
        gameContextRef.current.setRoomCode(this.roomCode);
      }
      if (gameContextRef?.current?.setIsHost !== undefined) {
        gameContextRef.current.setIsHost(this.isHost);
      }
      if (gameContextRef?.current?.setHostSettings && this.hostSettings) {
        gameContextRef.current.setHostSettings({ ...this.hostSettings });
      }
    },

    copyRoomLink(btn) {
      const url = `${window.location.origin}/?room=${this.roomCode || ''}`;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).catch(() => {});
        }
      } catch (e) {}
      if (btn) {
        const orig = btn.innerHTML;
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.innerHTML = orig; }, 2000);
      }
    },

    startMatch() {
      this.isMatchActive = true;
      const categories = this.hostSettings?.categories || (this.hostSettings?.category ? [this.hostSettings.category] : ['frames', 'eyes', 'dialogue']);
      let pool = [];
      if (categories.includes('frames') || categories.includes('all')) {
        pool.push(...DEFAULT_FRAMES);
      }
      if (categories.includes('eyes') || categories.includes('all')) {
        pool.push(...DEFAULT_EYES);
      }
      if (categories.includes('dialogue') || categories.includes('all')) {
        pool.push(...DEFAULT_DIALOGUES);
      }
      if (pool.length === 0) {
        pool = [...DEFAULT_FRAMES];
      }

      // Shuffle with Fisher-Yates
      const shuffled = [...pool];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      const numRounds = Math.min(this.hostSettings?.rounds || 20, shuffled.length);
      this.currentPlaylist = shuffled.slice(0, numRounds);
      this.currentPlayIndex = 0;
      this.currentRoundWinners = [];
      this.isRoundFinished = false;
      this.saveActiveSession();

      if (gameContextRef?.current?.setCurrentPlaylist) {
        gameContextRef.current.setCurrentPlaylist(this.currentPlaylist);
        gameContextRef.current.setCurrentPlayIndex(0);
        gameContextRef.current.setCurrentFrame(this.currentPlaylist[0]);
      }

      if (this.isHost) {
        this.sendEvent('MATCH_START', {
          currentPlaylist: this.currentPlaylist,
          currentPlayIndex: this.currentPlayIndex
        });
        const pl = this.currentPlaylist;
        if (pl && pl.length > 0) {
          this.sendEvent('ROUND_START', {
            roundIndex: 0,
            frame: pl[0],
            duration: 30
          });
        }
      }

      HowToAnswerGuide.start(this.isHost, () => {
        UI.showScreen('gameScreen');
      });
    },

    validateAndProcessGuess(data) {
      if (!data || !data.playerId || !data.guess) return;
      const curFrame = this.currentPlaylist[this.currentPlayIndex];
      if (!curFrame) return;

      if (FuzzyMatcher.isMatch(data.guess, curFrame.answer)) {
        if (this.currentRoundWinners.some(w => w.playerId === data.playerId)) {
          return;
        }

        const pos = this.currentRoundWinners.length + 1;
        const points = pos === 1 ? 10 : pos === 2 ? 7 : pos === 3 ? 5 : 0;

        if (pos <= 3) {
          const winnerRecord = {
            playerId: data.playerId,
            playerName: data.playerName,
            playerAvatar: data.playerAvatar,
            position: pos,
            points
          };
          this.currentRoundWinners.push(winnerRecord);
          ChatEngine.renderWinnerBanner(winnerRecord);
          if (this.isHost) {
            this.sendEvent('GUESS_CORRECT_BROADCAST', { winner: winnerRecord });
          }
        }

        const p = GS.players.find(pl => pl.id === data.playerId);
        if (p) {
          p.score = (p.score || 0) + points;
        }

        UI.renderLB();
        SoundManager.play('correct');
        if (this.isHost) {
          this.sendEvent('SYNC_ROOM_STATE', {
            players: GS.players,
            currentRoundWinners: this.currentRoundWinners
          });
        }
      }
    },

    requestHint() {
      const p = GS.players.find(pl => pl.id === this.playerId);
      if (p) {
        p.score = Math.max(0, (p.score || 0) - 2);
      }
      const curFrame = this.currentPlaylist[this.currentPlayIndex];
      const ans = curFrame?.answer || 'UNKNOWN';
      const masked = ans.split('').map((ch, i) => (ch === ' ' ? '  ' : i % 2 === 0 ? ch : '_')).join(' ');
      this.currentMaskedHint = masked;

      const pill = document.getElementById('hfbActiveHintPill');
      const text = document.getElementById('hfbActiveHintText');
      if (pill) pill.style.display = 'inline-flex';
      if (text) text.textContent = masked;

      const chatHint = document.getElementById('chatActiveHint');
      const chatHintText = document.getElementById('chatActiveHintText');
      if (chatHint) chatHint.style.display = 'block';
      if (chatHintText) chatHintText.textContent = masked;

      UI.renderLB();
      SoundManager.play('flare');
      return masked;
    },

    handleIncomingEvent(event) {
      if (!event || !event.type) return;
      const incomingRoom = String(event.roomCode || '').trim().toUpperCase();
      const currentRoom = String(this.roomCode || '').trim().toUpperCase();
      if (incomingRoom && currentRoom && incomingRoom !== currentRoom) return;
      if (event.senderId === this.playerId && event.type !== 'SYNC_ROOM_STATE') return;

      // Forward to React MultiplayerContext immediately
      try {
        if (typeof window !== 'undefined' && window.__handleMultiplayerIncomingMessage) {
          window.__handleMultiplayerIncomingMessage(event);
        }
      } catch (e) {}

      switch (event.type) {
        case 'PLAYER_JOIN': {
          if (this.isHost) {
            const playerId = event.id || event.senderId;
            const existingIdx = GS.players.findIndex(p => p.id === playerId);
            const isNewPlayer = (existingIdx === -1);

            if (isNewPlayer) {
              const maxPlayers = (this.hostSettings && this.hostSettings.maxPlayers) ? this.hostSettings.maxPlayers : 8;
              if (GS.players && GS.players.length >= maxPlayers) {
                this.sendEvent('JOIN_REJECTED', {
                  targetPlayerId: playerId,
                  reason: 'LOBBY_FULL',
                  message: `This lobby is full (${maxPlayers}/${maxPlayers} players).`
                });
                break;
              }

              if (this.isMatchActive) {
                this.sendEvent('JOIN_REJECTED', {
                  targetPlayerId: playerId,
                  reason: 'GAME_ALREADY_STARTED',
                  message: 'A match is already in progress. Please wait for it to end.'
                });
                break;
              }

              GS.players.push({
                id: playerId,
                name: event.name || 'Player',
                avatar: event.avatar || 'aman',
                score: 0,
                isHost: false,
                loaded: true
              });
            } else {
              GS.players[existingIdx].name = event.name || GS.players[existingIdx].name;
              GS.players[existingIdx].avatar = event.avatar || GS.players[existingIdx].avatar;
            }
            this.renderLobbyUI();
            this.sendEvent('SYNC_ROOM_STATE', {
              players: GS.players,
              hostSettings: this.hostSettings,
              currentPlaylist: this.currentPlaylist,
              currentPlayIndex: this.currentPlayIndex
            });
          }
          break;
        }

        case 'JOIN_REJECTED': {
          if (event.targetPlayerId && event.targetPlayerId !== this.playerId) break;
          this.isJoining = false;
          if (this.joinRetryTimer) {
            clearInterval(this.joinRetryTimer);
            this.joinRetryTimer = null;
          }
          if (this.joinTimeoutTimer) {
            clearTimeout(this.joinTimeoutTimer);
            this.joinTimeoutTimer = null;
          }
          const joinBtn = document.querySelector('#joinRoomModal .mp-btn-primary');
          if (joinBtn) {
            joinBtn.disabled = false;
            joinBtn.textContent = 'ENTER ROOM →';
          }
          if (window.__resetJoinModalBtn) {
            window.__resetJoinModalBtn();
          }
          alert(event.message || 'Unable to join room: ' + (event.reason || 'Rejected'));
          break;
        }

        case 'JOIN_ACK':
        case 'SYNC_ROOM_STATE': {
          if (event.players && event.players.length > 0) {
            const wasJoining = this.isJoining || !this.hasJoinedAck;
            this.hasJoinedAck = true;
            this.isJoining = false;
            if (this.joinTimeoutTimer) {
              clearTimeout(this.joinTimeoutTimer);
              this.joinTimeoutTimer = null;
            }
            if (this.joinRetryTimer) {
              clearInterval(this.joinRetryTimer);
              this.joinRetryTimer = null;
            }
            const joinBtn = document.querySelector('#joinRoomModal .mp-btn-primary');
            if (joinBtn) {
              joinBtn.disabled = false;
              joinBtn.textContent = 'ENTER ROOM →';
            }
            if (window.__resetJoinModalBtn) {
              window.__resetJoinModalBtn();
            }
            GS.players = event.players;
            if (gameContextRef?.current?.setPlayers) {
              gameContextRef.current.setPlayers([...event.players]);
            }
            if (event.hostSettings) {
              this.hostSettings = event.hostSettings;
              const timerEl = document.getElementById('hostTimerBtnText');
              if (timerEl && this.hostSettings?.timer) {
                timerEl.textContent = `${this.hostSettings.timer}s`;
              }
              const roundsEl = document.getElementById('hostFramesRoundsBtn');
              if (roundsEl && this.hostSettings?.rounds) {
                roundsEl.textContent = this.hostSettings.rounds;
              }
            }
            if (event.currentPlaylist) this.currentPlaylist = event.currentPlaylist;
            if (event.currentPlayIndex !== undefined) this.currentPlayIndex = event.currentPlayIndex;
            if (event.currentRoundWinners) this.currentRoundWinners = event.currentRoundWinners;

            if (wasJoining) {
              this.closeModals();
              if (gameContextRef?.current?.closeModals) {
                gameContextRef.current.closeModals();
              }
              this.saveActiveSession();
              const isMatchOngoing = this.isMatchActive || document.getElementById('gameScreen')?.classList.contains('active') || document.getElementById('howToAnswerScreen')?.classList.contains('active');
              if (!isMatchOngoing) {
                UI.showScreen('playerLobbyScreen');
                if (gameContextRef?.current?.setCurrentScreen) {
                  gameContextRef.current.setCurrentScreen('playerLobbyScreen');
                }
              }
            }

            this.renderLobbyUI();
            UI.renderLB();
          }
          break;
        }

        case 'UPDATE_HOST_SETTINGS': {
          if (event.settings) {
            this.hostSettings = event.settings;
            const timerEl = document.getElementById('hostTimerBtnText');
            if (timerEl && this.hostSettings?.timer) {
              timerEl.textContent = `${this.hostSettings.timer}s`;
            }
            const roundsEl = document.getElementById('hostFramesRoundsBtn');
            if (roundsEl && this.hostSettings?.rounds) {
              roundsEl.textContent = this.hostSettings.rounds;
            }
            this.renderLobbyUI();
          }
          break;
        }

        case 'MATCH_START': {
          this.isMatchActive = true;
          if (event.currentPlaylist) this.currentPlaylist = event.currentPlaylist;
          this.currentPlayIndex = event.currentPlayIndex || 0;
          this.currentRoundWinners = [];
          this.isRoundFinished = false;
          this.saveActiveSession();
          HowToAnswerGuide.start(this.isHost, () => {
            UI.showScreen('gameScreen');
          });
          break;
        }

        case 'GUIDE_COMPLETE': {
          if (typeof HowToAnswerGuide !== 'undefined') {
            HowToAnswerGuide.stop();
            HowToAnswerGuide._secondsLeft = 0;
          }
          const guideScreen = document.getElementById('howToAnswerScreen');
          if (guideScreen) guideScreen.classList.remove('active');
          UI.showScreen('gameScreen');
          break;
        }

        case 'SUBMIT_GUESS': {
          if (this.isHost) {
            this.validateAndProcessGuess(event);
          }
          break;
        }

        case 'ROUND_WINNER':
        case 'GUESS_CORRECT_BROADCAST': {
          if (event.roundWinners && Array.isArray(event.roundWinners)) {
            this.currentRoundWinners = event.roundWinners;
          }
          if (event.winner) {
            if (!this.currentRoundWinners.some(w => w.playerId === event.winner.playerId)) {
              this.currentRoundWinners.push(event.winner);
            }
            ChatEngine.renderWinnerBanner(event.winner);
          }
          if (event.players && event.players.length > 0) {
            GS.players = event.players;
            this.renderLobbyUI();
            UI.renderLB();
          }
          break;
        }

        case 'REQUEST_REJOIN_SYNC': {
          if (this.isHost) {
            const existingPlayer = GS.players.find(p => p.id === event.playerId);
            if (!existingPlayer) {
              GS.players.push({
                id: event.playerId,
                name: event.name || 'Player',
                avatar: event.avatar || 'aman',
                score: 0,
                isHost: false,
                loaded: true
              });
            }
            this.renderLobbyUI();
            this.sendEvent('REJOIN_SYNC_STATE', {
              targetPlayerId: event.playerId,
              players: GS.players,
              hostSettings: this.hostSettings,
              currentPlaylist: this.currentPlaylist,
              currentPlayIndex: this.currentPlayIndex
            });
          }
          break;
        }

        case 'REJOIN_SYNC_STATE': {
          if (event.targetPlayerId && event.targetPlayerId !== this.playerId) break;
          this.hasJoinedAck = true;
          this.isRejoining = false;
          if (event.players) GS.players = event.players;
          const existingHost = GS.players.find(p => p.isHost && p.id !== this.playerId);
          if (existingHost) {
            this.isHost = false;
          }
          if (event.hostSettings) this.hostSettings = event.hostSettings;
          this.renderLobbyUI();
          UI.renderLB();
          break;
        }

        case 'HOST_PROMOTED': {
          this.becomeHost();
          break;
        }

        case 'HOST_MIGRATED': {
          if (event.newHostId === this.playerId) {
            this.becomeHost();
          } else {
            GS.players.forEach(p => { p.isHost = (p.id === event.newHostId); });
            this.renderLobbyUI();
          }
          break;
        }

        case 'PLAYER_LEFT':
        case 'PLAYER_LEAVE': {
          const leavingId = event.playerId || event.senderId;
          if (leavingId) {
            const idx = GS.players.findIndex(p => p.id === leavingId);
            if (idx !== -1) {
              const [leftPlayer] = GS.players.splice(idx, 1);
              this.renderLobbyUI();
              UI.renderLB();
              if (leftPlayer.isHost || event.isHost) {
                if (GS.players.length > 0) {
                  GS.players[0].isHost = true;
                  if (GS.players[0].id === this.playerId) {
                    this.becomeHost();
                  }
                }
              }
            }
          }
          break;
        }

        case 'HOST_HEARTBEAT': {
          this.lastHostHeartbeat = Date.now();
          break;
        }

        case 'CLIENT_HEARTBEAT': {
          const p = GS.players.find(x => x.id === event.playerId || x.id === event.senderId);
          if (p) p.lastSeen = Date.now();
          break;
        }

        case 'UPDATE_PLAYER_NAME': {
          const p = GS.players.find(pl => pl.id === event.playerId || pl.id === event.senderId);
          if (p) {
            p.name = event.name;
            this.renderLobbyUI();
            if (this.isHost) {
              this.sendEvent('SYNC_ROOM_STATE', { players: GS.players, hostSettings: this.hostSettings });
            }
          }
          break;
        }

        case 'CHAT_MESSAGE': {
          const msg = event.msg || {};
          const text = msg.text || '';
          const curFrame = this.currentPlaylist ? this.currentPlaylist[this.currentPlayIndex] : null;
          if (curFrame && FuzzyMatcher.isMatch(text, curFrame.answer)) {
            if (this.isHost) {
              this.validateAndProcessGuess({
                playerId: msg.senderId || event.senderId,
                playerName: msg.senderName || 'Player',
                playerAvatar: msg.senderAvatar || 'aman',
                guess: text,
                roundIndex: this.currentPlayIndex || 0
              });
            }
          } else {
            ChatEngine.renderMessage(msg);
          }
          break;
        }

        case 'ROUND_START': {
          const nextIdx = event.roundIndex ?? event.currentPlayIndex ?? 0;
          this.currentPlayIndex = nextIdx;
          this.isRoundFinished = false;
          this.currentRoundWinners = [];
          this.currentMaskedHint = null;
          const frame = event.frame || (this.currentPlaylist && this.currentPlaylist[nextIdx]);
          if (frame) {
            FrameDisplay.showFrame(frame);
          }
          const ansOv = document.getElementById('answerOverlay');
          if (ansOv) ansOv.classList.remove('visible', 'active');
          if (gameContextRef?.current?.setCurrentPlayIndex) {
            gameContextRef.current.setCurrentPlayIndex(nextIdx);
            if (frame) gameContextRef.current.setCurrentFrame(frame);
            gameContextRef.current.setIsRoundFinished(false);
            gameContextRef.current.setIsAnswerRevealed(false);
            gameContextRef.current.setRoundWinners([]);
            gameContextRef.current.setMaskedHint(null);
            const dur = event.duration || this.hostSettings?.timer || 30;
            gameContextRef.current.setTimeRemaining(dur);
            gameContextRef.current.setTimerMax(dur);
          }
          UI.showScreen('gameScreen');
          SoundManager.playRoundStart();
          break;
        }

        case 'ROUND_FINISH_BROADCAST':
        case 'ANSWER_REVEALED': {
          this.isRoundFinished = true;
          const curFrame = this.currentPlaylist ? this.currentPlaylist[this.currentPlayIndex] : null;
          if (curFrame && curFrame.revealContent) {
            const img = document.querySelector('#imageContainer .frame-image');
            const revealPath = curFrame.revealContent.startsWith('/') ? curFrame.revealContent : `/${curFrame.revealContent}`;
            if (img) img.src = revealPath;
          }
          const ansOv = document.getElementById('answerOverlay');
          if (ansOv) ansOv.classList.add('visible', 'active');
          const nextBtn = document.getElementById('ansNextRoundBtn');
          if (nextBtn) nextBtn.style.display = this.isHost ? 'block' : 'none';
          if (gameContextRef?.current?.setIsRoundFinished) {
            gameContextRef.current.setIsRoundFinished(true);
            gameContextRef.current.setIsAnswerRevealed(true);
          }
          SoundManager.playReveal();
          break;
        }

        case 'PAUSE_TOGGLE': {
          this.isPaused = Boolean(event.isPaused);
          const btn = document.getElementById('hfbPauseBtn');
          if (btn) btn.textContent = this.isPaused ? '▶ Resume' : '⏸ Pause';
          if (gameContextRef?.current?.setIsPaused) {
            gameContextRef.current.setIsPaused(this.isPaused);
          }
          break;
        }

        case 'HINT_BROADCAST': {
          const hint = event.maskedHint;
          this.currentMaskedHint = hint;
          const pill = document.getElementById('hfbActiveHintPill');
          const text = document.getElementById('hfbActiveHintText');
          if (pill) pill.style.display = 'inline-flex';
          if (text) text.textContent = hint;
          const chatHint = document.getElementById('chatActiveHint');
          const chatHintText = document.getElementById('chatActiveHintText');
          if (chatHint) chatHint.style.display = 'block';
          if (chatHintText) chatHintText.textContent = hint;
          if (gameContextRef?.current?.setMaskedHint) {
            gameContextRef.current.setMaskedHint(hint);
          }
          SoundManager.play('flare');
          break;
        }

        case 'GAME_OVER_BROADCAST': {
          if (event.scoreboard && Array.isArray(event.scoreboard)) {
            GS.players = event.scoreboard;
          }
          this.isMatchActive = false;
          this.finishGame();
          break;
        }

        case 'REMATCH_STARTED': {
          if (event.players) GS.players = event.players;
          GS.players.forEach(p => { p.score = 0; });
          if (gameContextRef?.current?.setPlayers) {
            gameContextRef.current.setPlayers(GS.players);
          }
          break;
        }

        case 'RETURN_TO_LOBBY': {
          if (event.players) GS.players = event.players;
          this.returnToLobby();
          break;
        }
      }
    },

    hostSkipRound() {
      this.isRoundFinished = true;
      const curFrame = this.currentPlaylist ? this.currentPlaylist[this.currentPlayIndex] : null;
      if (curFrame && curFrame.revealContent) {
        const img = document.querySelector('#imageContainer .frame-image');
        const revealPath = curFrame.revealContent.startsWith('/') ? curFrame.revealContent : `/${curFrame.revealContent}`;
        if (img) img.src = revealPath;
      }
      if (gameContextRef?.current?.setIsRoundFinished) {
        gameContextRef.current.setIsRoundFinished(true);
        gameContextRef.current.setIsAnswerRevealed(true);
      }
      const ansOv = document.getElementById('answerOverlay');
      if (ansOv) ansOv.classList.add('visible', 'active');
      const nextBtn = document.getElementById('ansNextRoundBtn');
      if (nextBtn) nextBtn.style.display = 'block';
      SoundManager.playSkip();

      // Realtime network broadcast to all players
      this.sendEvent('ROUND_FINISH_BROADCAST', {
        roundIndex: this.currentPlayIndex,
        isAnswerRevealed: true
      });
    },

    hostNextRound() {
      this.currentPlayIndex++;
      this.isRoundFinished = false;
      this.currentRoundWinners = [];
      this.currentMaskedHint = null;

      if (this.currentPlayIndex >= this.currentPlaylist.length) {
        this.hostEndGame();
        return;
      }

      const curFrame = this.currentPlaylist[this.currentPlayIndex];
      FrameDisplay.showFrame(curFrame);
      if (gameContextRef?.current?.setCurrentPlayIndex) {
        gameContextRef.current.setCurrentPlayIndex(this.currentPlayIndex);
        gameContextRef.current.setCurrentFrame(curFrame);
        gameContextRef.current.setIsRoundFinished(false);
        gameContextRef.current.setIsAnswerRevealed(false);
        gameContextRef.current.setRoundWinners([]);
        gameContextRef.current.setMaskedHint(null);
        const dur = this.hostSettings?.timer || 30;
        gameContextRef.current.setTimeRemaining(dur);
        gameContextRef.current.setTimerMax(dur);
      }
      const ansOv = document.getElementById('answerOverlay');
      if (ansOv) ansOv.classList.remove('visible', 'active');

      // Realtime network broadcast to all players
      this.sendEvent('ROUND_START', {
        roundIndex: this.currentPlayIndex,
        frame: curFrame,
        duration: this.hostSettings?.timer || 30
      });
    },

    hostTogglePause() {
      this.isPaused = !this.isPaused;
      const btn = document.getElementById('hfbPauseBtn');
      if (btn) btn.textContent = this.isPaused ? '▶ Resume' : '⏸ Pause';
      if (gameContextRef?.current?.setIsPaused) {
        gameContextRef.current.setIsPaused(this.isPaused);
      }
      this.sendEvent('PAUSE_TOGGLE', { isPaused: this.isPaused });
    },

    finishGame() {
      this.clearActiveSession();
      this.isMatchActive = false;
      WinnerScreen.show(GS.players);
      if (gameContextRef?.current?.setIsMatchActive) {
        gameContextRef.current.setIsMatchActive(false);
      }
      if (gameContextRef?.current?.showScreen) {
        gameContextRef.current.showScreen('winnerScreen');
      }
      if (this.isHost) {
        this.sendEvent('GAME_OVER_BROADCAST', { scoreboard: GS.players });
      }
    },

    hostEndGame() {
      this.finishGame();
    },

    rematch() {
      GS.players.forEach(p => { p.score = 0; });
      if (gameContextRef?.current?.setPlayers) {
        gameContextRef.current.setPlayers([...GS.players]);
      }
      if (this.isHost) {
        this.sendEvent('REMATCH_STARTED', { players: GS.players });
      }
      this.startMatch();
    },

    returnToLobby() {
      UI.showScreen('playerLobbyScreen');
      this.renderLobbyUI();
      if (gameContextRef?.current?.showScreen) {
        gameContextRef.current.showScreen('playerLobbyScreen');
      }
      if (this.isHost) {
        this.sendEvent('RETURN_TO_LOBBY', { players: GS.players });
      }
    },

    leaveRoom() {
      if (typeof HowToAnswerGuide !== 'undefined') HowToAnswerGuide.stop();
      if (this.roomCode) {
        try {
          this.sendEvent('PLAYER_LEAVE', {
            playerId: this.playerId,
            name: this.playerName,
            isHost: this.isHost
          });
        } catch(e) {}
      }
      this.stopClientHeartbeat();
      this.stopHostHeartbeat();
      this.stopHostWatchdog();
      this.clearActiveSession();
      if (this.mqttClient) {
        try { this.mqttClient.end(true); } catch(e) {}
        this.mqttClient = null;
      }
      if (this._mqttConnectTimeout) {
        clearTimeout(this._mqttConnectTimeout);
        this._mqttConnectTimeout = null;
      }
      this._mqttIsConnected = false;
      if (this.backendWs) {
        try { this.backendWs.close(); } catch(e) {}
        this.backendWs = null;
      }
      if (this.broadcastChannel) {
        try { this.broadcastChannel.close(); } catch(e) {}
        this.broadcastChannel = null;
      }
      this.isHost = false;
      this.roomCode = null;
      this.roomId = null;
      if (gameContextRef?.current?.setRoomCode) {
        gameContextRef.current.setRoomCode(null);
      }
      if (gameContextRef?.current?.setIsHost) {
        gameContextRef.current.setIsHost(false);
      }
      UI.showScreen('homeScreen');
    }
  };

  window.MultiplayerEngine = MultiplayerEngine;
  try { MultiplayerEngine.init(); } catch(e) {}

  const WinnerScreenBridge = {
    ...WinnerScreen,
    show(players) {
      if (players && gameContextRef?.current?.setPlayers) {
        gameContextRef.current.setPlayers(players);
      }
      if (players && GS) {
        GS.players = players;
      }
      WinnerScreen.show(players);
    }
  };
  window.WinnerScreen = WinnerScreenBridge;

  // Mount other utilities
  window.SoundManager = SoundManager;
  window.PaletteManager = PaletteManager;
  window.SecurityUtil = SecurityUtil;
  window.NetworkSecurity = NetworkSecurity;
  window.FuzzyMatcher = FuzzyMatcher;
}
