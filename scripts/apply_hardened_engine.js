const fs = require('fs');
const path = require('path');

const targetFiles = [
  path.join(__dirname, '..', 'index.html'),
  path.join(__dirname, '..', 'sites', 'guess-the-frame', 'index.html')
];

function generateHardenedAppwriteEngine() {
  return `    /* ══════════════════════════════════════════════════════════════════
       PRODUCTION APPWRITE MULTIPLAYER ENGINE & MONITORING
       ══════════════════════════════════════════════════════════════════ */
    window.ScoopCastDebug = window.ScoopCastDebug || {
      network: {
        status: (typeof navigator !== 'undefined' && navigator.onLine) ? 'online' : 'offline',
        latency: 0,
        lastPing: Date.now()
      },
      realtime: {
        status: 'disconnected',
        reconnects: 0,
        disconnectCount: 0,
        lastEventTimestamp: 0
      },
      api: {
        failures: 0,
        retries: 0,
        successes: 0,
        lastError: null
      },
      function: {
        latency: 0,
        lastCallTime: 0,
        callCount: 0
      },
      errors: {
        jsCrashes: 0,
        lastJsError: null
      },
      images: {
        lastLoadTime: 0,
        cachedCount: 0
      },
      getSummary() {
        return {
          network: this.network.status,
          realtime: this.realtime.status,
          reconnects: this.realtime.reconnects,
          apiFailures: this.api.failures,
          apiRetries: this.api.retries,
          apiSuccesses: this.api.successes,
          jsCrashes: this.errors.jsCrashes,
          functionLatencyMs: this.function.latency,
          functionCalls: this.function.callCount,
          imageLoadTimeMs: this.images.lastLoadTime,
          cachedImages: this.images.cachedCount
        };
      }
    };

    if (typeof window !== 'undefined' && !window._scErrorHookInstalled) {
      window._scErrorHookInstalled = true;
      window.addEventListener('error', function(e) {
        if (window.ScoopCastDebug) {
          window.ScoopCastDebug.errors.jsCrashes++;
          window.ScoopCastDebug.errors.lastJsError = (e && e.message) || String(e);
        }
      });
      window.addEventListener('unhandledrejection', function(e) {
        if (window.ScoopCastDebug) {
          window.ScoopCastDebug.errors.jsCrashes++;
          window.ScoopCastDebug.errors.lastJsError = (e && e.reason && (e.reason.message || String(e.reason))) || 'Unhandled rejection';
        }
      });
    }

    window.SCOOPCAST_PROD_MODE = true;
    function _scLog(...args) {
      if (window.SCOOPCAST_DEBUG || !window.SCOOPCAST_PROD_MODE) {
        console.log(...args);
      }
    }
    function _scWarn(...args) {
      if (window.SCOOPCAST_DEBUG || !window.SCOOPCAST_PROD_MODE) {
        console.warn(...args);
      }
    }

    async function withNetworkRetry(operation, maxRetries = 3, baseDelayMs = 350) {
      let attempt = 0;
      while (true) {
        try {
          const result = await operation();
          if (window.ScoopCastDebug) window.ScoopCastDebug.api.successes++;
          return result;
        } catch (err) {
          attempt++;
          if (window.ScoopCastDebug) {
            window.ScoopCastDebug.api.failures++;
            window.ScoopCastDebug.api.lastError = err.message || String(err);
          }
          const isClientError = err && err.code && (err.code === 400 || err.code === 401 || err.code === 403 || err.code === 404 || err.code === 429);
          if (attempt >= maxRetries || isClientError) {
            throw err;
          }
          if (window.ScoopCastDebug) window.ScoopCastDebug.api.retries++;
          const delay = baseDelayMs * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 100);
          _scWarn(\`[Network Retry] Attempt \${attempt}/\${maxRetries} failed: \${err.message}. Retrying in \${delay}ms...\`);
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }

    const APPWRITE_CONFIG = {
      endpoint: 'https://sgp.cloud.appwrite.io/v1',
      projectId: '6a95a01e0028db20a16f',
      databaseId: 'guess_the_frame'
    };

    let _appwriteClient = null;
    let _appwriteAccount = null;
    let _appwriteDatabases = null;
    let _appwriteStorage = null;
    let _appwriteFunctions = null;

    function getAppwrite() {
      if (!_appwriteClient && typeof Appwrite !== 'undefined') {
        _appwriteClient = new Appwrite.Client()
          .setEndpoint(APPWRITE_CONFIG.endpoint)
          .setProject(APPWRITE_CONFIG.projectId);
        _appwriteAccount = new Appwrite.Account(_appwriteClient);
        _appwriteDatabases = new Appwrite.Databases(_appwriteClient);
        _appwriteStorage = new Appwrite.Storage(_appwriteClient);
        _appwriteFunctions = new Appwrite.Functions(_appwriteClient);
      }
      return {
        client: _appwriteClient,
        account: _appwriteAccount,
        databases: _appwriteDatabases,
        storage: _appwriteStorage,
        functions: _appwriteFunctions
      };
    }

    const MultiplayerEngine = {
      broadcastChannel: null,
      realtimeUnsubscribe: null,
      roomId: null,
      roomCode: null,
      playerId: null,
      playerName: 'Player',
      playerAvatar: 'aman',
      playerAvatarImg: 'avvtar/aman.svg',
      playerAvatarColor: '#ff7eb6',
      isHost: false,
      selectedAvatarForModal: 'aman',
      currentMaskedHint: null,
      currentRoundWinners: [],
      currentPlaylist: [],
      currentPlayIndex: 0,
      currentClientFrame: null,
      hostSettings: {
        category: 'all',
        categories: ['frames', 'eyes', 'dialogue'],
        roundsByMode: { frames: 20, eyes: 10, dialogue: 10 },
        rounds: 40,
        timer: 30
      },
      isPaused: false,
      hasJoinedAck: false,
      isJoining: false,
      isRejoining: false,
      isConnected: false,
      connectionState: 'CONNECTED',
      _isReconnecting: false,
      heartbeatTimer: null,
      presenceWatchdogTimer: null,
      _hostAutoAdvanceTimer: null,
      _clientWaitTimer: null,
      lastHostHeartbeat: 0,
      gameStateVersion: 1,
      sessionStats: {
        roundsWon: 0,
        totalGuesses: 0,
        correctGuesses: 0,
        fastestGuessSeconds: null,
        roundStartTime: 0
      },
      playerScoresArchive: {},
      pendingRejoinSession: null,

      async init() {
        const savedName = localStorage.getItem('gtf_player_name');
        const savedAvatar = localStorage.getItem('gtf_player_avatar');
        if (savedName) this.playerName = savedName;
        if (savedAvatar) {
          this.playerAvatar = savedAvatar;
          this.selectedAvatarForModal = savedAvatar;
        }

        try {
          this.broadcastChannel = new BroadcastChannel('gtf_multiplayer_channel');
          this.broadcastChannel.onmessage = (event) => {
            if (!event.data) return;
            const { type, payload, roomId } = event.data;
            if (roomId && this.roomId && roomId !== this.roomId) return;
            if (type === 'CHAT_MESSAGE' && payload && payload.msg) {
              if (typeof ChatEngine !== 'undefined') {
                ChatEngine.renderMessage(payload.msg);
              }
            }
          };
        } catch(e) {}

        await this.ensureAuth();
        this.setupLifecycleListeners();
        this.checkPendingRejoin();
        this.checkUrlParams();
      },

      async ensureAuth() {
        const { account } = getAppwrite();
        if (!account) return;
        try {
          const user = await account.get();
          this.playerId = user.$id;
          localStorage.setItem('gtf_player_id', this.playerId);
        } catch (e) {
          try {
            const session = await account.createAnonymousSession();
            this.playerId = session.userId;
            localStorage.setItem('gtf_player_id', this.playerId);
          } catch (err) {
            this.playerId = localStorage.getItem('gtf_player_id') || ('anon_' + Math.random().toString(36).slice(2, 10));
            localStorage.setItem('gtf_player_id', this.playerId);
          }
        }
      },

      setupLifecycleListeners() {
        // Online / Offline network switching
        window.addEventListener('online', () => {
          _scLog('[Network] Device back online.');
          if (window.ScoopCastDebug) window.ScoopCastDebug.network.status = 'online';
          this.reconnect();
        });
        window.addEventListener('offline', () => {
          _scLog('[Network] Device offline.');
          if (window.ScoopCastDebug) {
            window.ScoopCastDebug.network.status = 'offline';
            window.ScoopCastDebug.realtime.disconnectCount++;
          }
          this.setConnectionState('RECONNECTING');
        });

        // Tab Visibility & Background Sleep
        document.addEventListener('visibilitychange', async () => {
          if (!this.roomId || !this.playerId) return;
          const { databases } = getAppwrite();
          if (!databases) return;
          const playerDocId = \`\${this.roomId}_\${this.playerId}\`;

          if (document.hidden) {
            this.setConnectionState('AWAY');
            try {
              await databases.updateDocument(APPWRITE_CONFIG.databaseId, 'players', playerDocId, {
                status: 'away'
              });
            } catch (e) {}
          } else {
            _scLog('[Lifecycle] Tab woke up. Refreshing state...');
            this.reconnect();
          }
        });
      },

      setConnectionState(state) {
        this.connectionState = state;
        if (window.ScoopCastDebug) {
          window.ScoopCastDebug.realtime.status = state.toLowerCase();
        }

        let badge = document.getElementById('scConnectionBanner');
        if (!badge) {
          badge = document.createElement('div');
          badge.id = 'scConnectionBanner';
          badge.style.cssText = 'position:fixed; bottom:16px; left:50%; transform:translateX(-50%); z-index:99999; padding:6px 14px; border-radius:9999px; font-size:12px; font-weight:800; font-family:"Lilita One", sans-serif; letter-spacing:0.5px; transition:all 0.3s ease; pointer-events:none; display:none;';
          document.body.appendChild(badge);
        }

        if (state !== 'DISCONNECTED') {
          badge.style.pointerEvents = 'none';
          badge.style.cursor = 'default';
          badge.onclick = null;
        }

        if (state === 'RECONNECTING') {
          badge.textContent = '🔄 Reconnecting to Match...';
          badge.style.background = '#f59e0b';
          badge.style.color = '#ffffff';
          badge.style.border = '2px solid #b45309';
          badge.style.display = 'inline-block';
          badge.style.opacity = '1';
        } else if (state === 'CONNECTED') {
          badge.textContent = '🟢 Connected';
          badge.style.background = '#10b981';
          badge.style.color = '#ffffff';
          badge.style.border = '2px solid #047857';
          badge.style.display = 'inline-block';
          badge.style.opacity = '1';
          setTimeout(() => {
            if (this.connectionState === 'CONNECTED' && badge) {
              badge.style.opacity = '0';
              setTimeout(() => { if (badge.style.opacity === '0') badge.style.display = 'none'; }, 300);
            }
          }, 1500);
        } else if (state === 'AWAY') {
          badge.textContent = '🌙 Away (Background)';
          badge.style.background = '#6b7280';
          badge.style.color = '#ffffff';
          badge.style.border = '2px solid #374151';
          badge.style.display = 'inline-block';
        } else if (state === 'DISCONNECTED') {
          badge.innerHTML = '⚠️ Connection Lost • <span style="text-decoration:underline; cursor:pointer;">Tap to Reconnect</span>';
          badge.style.background = '#ef4444';
          badge.style.color = '#ffffff';
          badge.style.border = '2px solid #b91c1c';
          badge.style.display = 'inline-block';
          badge.style.opacity = '1';
          badge.style.pointerEvents = 'auto';
          badge.style.cursor = 'pointer';
          badge.onclick = () => {
            this.reconnect();
          };
        }
      },

      async reconnect() {
        if (!this.roomId || !this.playerId) return;
        if (this._isReconnecting) return;
        this._isReconnecting = true;
        this.setConnectionState('RECONNECTING');
        if (window.ScoopCastDebug) window.ScoopCastDebug.realtime.reconnects++;

        const startTime = Date.now();
        _scLog('[Reconnect] Fast recovery started...');

        try {
          this.subscribeRealtime();

          const { databases } = getAppwrite();
          if (databases) {
            const playerDocId = \`\${this.roomId}_\${this.playerId}\`;
            await withNetworkRetry(() => databases.updateDocument(APPWRITE_CONFIG.databaseId, 'players', playerDocId, {
              status: 'connected',
              lastHeartbeat: Date.now()
            })).catch(() => {});

            await this.syncActiveRoomState();
          }

          this.setConnectionState('CONNECTED');
          _scLog(\`[Reconnect] Restored in \${Date.now() - startTime}ms\`);
        } catch (err) {
          _scWarn('[Reconnect Error]', err.message);
          this.setConnectionState('DISCONNECTED');
        } finally {
          this._isReconnecting = false;
        }
      },

      saveActiveSession() {
        try {
          const session = {
            roomId: this.roomId,
            roomCode: this.roomCode,
            playerId: this.playerId,
            playerName: this.playerName,
            playerAvatar: this.playerAvatar,
            isHost: this.isHost,
            hostSettings: this.hostSettings,
            timestamp: Date.now()
          };
          localStorage.setItem('gtf_active_session', JSON.stringify(session));
        } catch (e) {}
      },

      clearActiveSession() {
        localStorage.removeItem('gtf_active_session');
      },

      checkUrlParams() {
        const params = new URLSearchParams(window.location.search);
        const roomCode = params.get('room');
        if (roomCode) {
          const joinInput = document.getElementById('joinCodeInput');
          if (joinInput) joinInput.value = roomCode.trim().toUpperCase();
          this.openJoinModal();
        }
      },

      getAvatarDisplayName(av) {
        if (typeof AvatarCatalog !== 'undefined' && AvatarCatalog.getById) {
          const item = AvatarCatalog.getById(av);
          if (item) return item.name;
        }
        const map = { aman: 'Aman', amish: 'Amish', aziz: 'Aziz', vish: 'Vish' };
        const key = (av || 'aman').toLowerCase().replace(/[^a-z0-9_]/g, '');
        return map[key] || (key ? key.charAt(0).toUpperCase() + key.slice(1) : 'Aman');
      },

      openCreateModal() {
        this.playerAvatar = this.playerAvatar || 'aman';
        this.selectedAvatarForModal = this.playerAvatar;
        const savedName = localStorage.getItem('gtf_player_name');
        this.playerName = savedName || this.playerName || this.getAvatarDisplayName(this.playerAvatar);
        const nameInput = document.getElementById('hostPlayerNameInput');
        if (nameInput) nameInput.value = this.playerName;
        document.getElementById('createRoomModal').classList.add('active');
        if (typeof AvatarStudio !== 'undefined') AvatarStudio.init('host');
        this.highlightSelectedAvatar('host', this.playerAvatar);
        if (nameInput) setTimeout(() => nameInput.focus(), 150);
      },

      openJoinModal() {
        this.playerAvatar = this.playerAvatar || 'aman';
        this.selectedAvatarForModal = this.playerAvatar;
        const savedName = localStorage.getItem('gtf_player_name');
        this.playerName = savedName || this.playerName || this.getAvatarDisplayName(this.playerAvatar);
        const nameInput = document.getElementById('joinPlayerNameInput');
        if (nameInput) nameInput.value = this.playerName;
        this.isJoining = false;
        const joinBtn = document.querySelector('#joinRoomModal .mp-btn-primary');
        if (joinBtn) {
          joinBtn.disabled = false;
          joinBtn.innerHTML = 'ENTER ROOM →';
        }
        document.getElementById('joinRoomModal').classList.add('active');
        if (typeof AvatarStudio !== 'undefined') AvatarStudio.init('join');
        this.highlightSelectedAvatar('join', this.playerAvatar);
        const codeInput = document.getElementById('joinCodeInput');
        if (codeInput && !codeInput.value) setTimeout(() => codeInput.focus(), 150);
      },

      closeModals() {
        document.querySelectorAll('.mp-modal-overlay').forEach(m => m.classList.remove('active'));
      },

      selectAvatar(mode, avatarKey) {
        this.selectedAvatarForModal = avatarKey;
        this.highlightSelectedAvatar(mode, avatarKey);
      },

      highlightSelectedAvatar(mode, avatarKey) {
        const modal = mode === 'host' ? document.getElementById('createRoomModal') : document.getElementById('joinRoomModal');
        if (!modal) return;
        modal.querySelectorAll('.avatar-option').forEach(el => {
          if (el.dataset.avatar === avatarKey) el.classList.add('selected');
          else el.classList.remove('selected');
        });
      },

      generateRoomCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
      },

      async confirmCreateRoom() {
        const nameInput = document.getElementById('hostPlayerNameInput');
        const typedName = (nameInput ? nameInput.value : '').trim();
        if (!typedName) {
          alert('Please enter your name.');
          if (nameInput) nameInput.focus();
          return;
        }

        await this.ensureAuth();

        this.playerName = typedName;
        this.playerAvatar = this.selectedAvatarForModal || 'aman';
        localStorage.setItem('gtf_player_name', this.playerName);
        localStorage.setItem('gtf_player_avatar', this.playerAvatar);

        this.roomCode = this.generateRoomCode();
        this.roomId = 'room_' + this.roomCode;
        this.isHost = true;
        this.hasJoinedAck = true;
        GameController._onlineMode = true;

        const av = (this.playerAvatar || 'aman').toLowerCase().replace(/[^a-z0-9]/g, '');
        const avConfig = (typeof AVATAR_MAP !== 'undefined' && AVATAR_MAP[av]) ? AVATAR_MAP[av] : { color: '#ff7eb6' };
        this.playerAvatarColor = avConfig.color || '#ff7eb6';

        GS.players = [{
          id: this.playerId,
          name: this.playerName,
          avatar: this.playerAvatar,
          avatarImg: 'avvtar/' + av + '.svg',
          score: 0,
          isHost: true,
          loaded: true,
          status: 'connected',
          lastHeartbeat: Date.now(),
          color: this.playerAvatarColor
        }];

        const { databases } = getAppwrite();
        if (databases) {
          try {
            await databases.createDocument(APPWRITE_CONFIG.databaseId, 'rooms', this.roomId, {
              roomId: this.roomId,
              roomCode: this.roomCode,
              hostId: this.playerId,
              status: 'lobby',
              currentRound: 0,
              currentSection: 'frames',
              timer: (this.hostSettings && this.hostSettings.timer) || 30,
              totalRounds: (this.hostSettings && this.hostSettings.rounds) || 40,
              categories: (this.hostSettings && this.hostSettings.categories) ? this.hostSettings.categories.join(',') : 'frames,eyes,dialogue',
              createdAt: Date.now(),
              updatedAt: Date.now()
            });

            await databases.createDocument(APPWRITE_CONFIG.databaseId, 'game_state', this.roomId, {
              roomId: this.roomId,
              roundNumber: 1,
              phase: 'lobby',
              currentImage: '',
              dialogueText: '',
              dialogueContext: '',
              maskedHint: '',
              revealedAnswer: '',
              winners: '[]',
              startedAt: 0,
              version: 1
            });

            const playerDocId = \`\${this.roomId}_\${this.playerId}\`;
            await databases.createDocument(APPWRITE_CONFIG.databaseId, 'players', playerDocId, {
              playerId: this.playerId,
              roomId: this.roomId,
              name: this.playerName,
              avatar: this.playerAvatar,
              status: 'connected',
              lastHeartbeat: Date.now(),
              score: 0,
              isHost: true,
              color: this.playerAvatarColor
            });
          } catch (err) {
            console.error('[Appwrite Create Room Error]', err);
          }
        }

        this.closeModals();
        this.saveActiveSession();
        this.subscribeRealtime();
        this.startHeartbeat();
        this.setConnectionState('CONNECTED');

        UI.showScreen('playerLobbyScreen');
        this.renderLobbyUI();

        if (typeof FrameDisplay !== 'undefined' && FrameDisplay.preloadAll) {
          FrameDisplay.preloadAll(p => { if (typeof UI !== 'undefined' && UI.updateLoadProgress) UI.updateLoadProgress(p, 'lobby'); });
        }
      },

      async confirmJoinRoom() {
        const codeInput = document.getElementById('joinCodeInput');
        const code = (codeInput ? codeInput.value : '').trim().toUpperCase();
        if (!code) {
          alert('Please enter a 6-letter Room Code.');
          if (codeInput) codeInput.focus();
          return;
        }
        const nameInput = document.getElementById('joinPlayerNameInput');
        const typedName = (nameInput ? nameInput.value : '').trim();
        if (!typedName) {
          alert('Please enter your name.');
          if (nameInput) nameInput.focus();
          return;
        }

        await this.ensureAuth();

        this.playerName = typedName;
        this.playerAvatar = this.selectedAvatarForModal || 'aman';
        localStorage.setItem('gtf_player_name', this.playerName);
        localStorage.setItem('gtf_player_avatar', this.playerAvatar);

        const joinBtn = document.querySelector('#joinRoomModal .mp-btn-primary');
        if (joinBtn) {
          joinBtn.disabled = true;
          joinBtn.innerHTML = '<span class="mp-spinner"></span> CONNECTING...';
        }

        const { databases } = getAppwrite();
        if (!databases) {
          alert('Appwrite connection unavailable.');
          if (joinBtn) { joinBtn.disabled = false; joinBtn.innerHTML = 'ENTER ROOM →'; }
          return;
        }

        try {
          const roomsQuery = await withNetworkRetry(() => databases.listDocuments(APPWRITE_CONFIG.databaseId, 'rooms', [
            Appwrite.Query.equal('roomCode', code)
          ]));

          if (roomsQuery.total === 0) {
            alert(\`Room "\${code}" not found. Check the code and try again.\`);
            if (joinBtn) { joinBtn.disabled = false; joinBtn.innerHTML = 'ENTER ROOM →'; }
            return;
          }

          const roomDoc = roomsQuery.documents[0];
          this.roomId = roomDoc.roomId;
          this.roomCode = roomDoc.roomCode;
          this.isHost = false;
          this.hasJoinedAck = true;
          GameController._onlineMode = true;

          const av = (this.playerAvatar || 'aman').toLowerCase().replace(/[^a-z0-9]/g, '');
          const avConfig = (typeof AVATAR_MAP !== 'undefined' && AVATAR_MAP[av]) ? AVATAR_MAP[av] : { color: '#57c3e0' };
          this.playerAvatarColor = avConfig.color || '#57c3e0';

          const playerDocId = \`\${this.roomId}_\${this.playerId}\`;
          try {
            await withNetworkRetry(() => databases.createDocument(APPWRITE_CONFIG.databaseId, 'players', playerDocId, {
              playerId: this.playerId,
              roomId: this.roomId,
              name: this.playerName,
              avatar: this.playerAvatar,
              status: 'connected',
              lastHeartbeat: Date.now(),
              score: 0,
              isHost: false,
              color: this.playerAvatarColor
            }));
          } catch (err) {
            await withNetworkRetry(() => databases.updateDocument(APPWRITE_CONFIG.databaseId, 'players', playerDocId, {
              status: 'connected',
              name: this.playerName,
              avatar: this.playerAvatar,
              lastHeartbeat: Date.now()
            })).catch(() => {});
          }

          this.closeModals();
          this.saveActiveSession();
          this.subscribeRealtime();
          this.startHeartbeat();
          this.setConnectionState('CONNECTED');

          await this.syncActiveRoomState();

          if (roomDoc.status === 'playing') {
            this.executeGameStart();
          } else {
            UI.showScreen('playerLobbyScreen');
            this.renderLobbyUI();
          }

          if (typeof FrameDisplay !== 'undefined' && FrameDisplay.preloadAll) {
            FrameDisplay.preloadAll(p => { if (typeof UI !== 'undefined' && UI.updateLoadProgress) UI.updateLoadProgress(p, 'lobby'); });
          }
        } catch (err) {
          _scWarn('[Appwrite Join Room Error]', err);
          alert('Could not join room: ' + (err && err.message ? err.message : 'Server unavailable. Please try again.'));
          if (joinBtn) { joinBtn.disabled = false; joinBtn.innerHTML = 'ENTER ROOM →'; }
        }
      },

      subscribeRealtime() {
        if (this.realtimeUnsubscribe) {
          try { this.realtimeUnsubscribe(); } catch(e) {}
          this.realtimeUnsubscribe = null;
        }
        const { client } = getAppwrite();
        if (!client || !this.roomId) return;

        const channels = [
          \`databases.\${APPWRITE_CONFIG.databaseId}.collections.rooms.documents.\${this.roomId}\`,
          \`databases.\${APPWRITE_CONFIG.databaseId}.collections.game_state.documents.\${this.roomId}\`,
          \`databases.\${APPWRITE_CONFIG.databaseId}.collections.players.documents\`
        ];

        _scLog('[Realtime] Subscribing to Appwrite channels for room:', this.roomId);
        try {
          this.realtimeUnsubscribe = client.subscribe(channels, (response) => {
            this.handleRealtimeEvent(response);
          });
          if (window.ScoopCastDebug) window.ScoopCastDebug.realtime.status = 'connected';
        } catch (subErr) {
          _scWarn('[Realtime Subscribe Error]', subErr);
          if (window.ScoopCastDebug) {
            window.ScoopCastDebug.api.failures++;
            window.ScoopCastDebug.realtime.status = 'disconnected';
          }
        }
      },

      handleRealtimeEvent(response) {
        if (window.ScoopCastDebug) {
          window.ScoopCastDebug.realtime.lastEventTimestamp = Date.now();
        }
        const eventName = (response.events && response.events[0]) || '';
        const payload = response.payload;

        if (eventName.includes('.rooms.')) {
          if (payload.status === 'playing' && !this.isMatchActive) {
            this.executeGameStart();
          } else if (payload.status === 'finished') {
            this.handleRemoteGameOver();
          }
        } else if (eventName.includes('.game_state.')) {
          if (payload.roomId !== this.roomId) return;
          this.handleGameStateUpdate(payload);
        } else if (eventName.includes('.players.')) {
          if (payload.roomId !== this.roomId) return;
          this.handlePlayerUpdate(payload, eventName);
        }
      },

      handlePlayerUpdate(player, eventName) {
        if (!Array.isArray(GS.players)) GS.players = [];
        const idx = GS.players.findIndex(p => p.id === player.playerId);

        if (eventName.includes('.create')) {
          if (idx === -1) {
            GS.players.push({
              id: player.playerId,
              name: player.name,
              avatar: player.avatar,
              avatarImg: 'avvtar/' + (player.avatar || 'aman').toLowerCase() + '.svg',
              score: player.score || 0,
              isHost: player.isHost || false,
              loaded: true,
              status: player.status || 'connected',
              lastHeartbeat: player.lastHeartbeat || Date.now(),
              color: player.color || '#57c3e0'
            });
            SoundManager.play('pop');
            ChatEngine.renderSystemMessage(\`👋 <strong>\${SecurityUtil.escapeHtml(player.name)}</strong> joined the room!\`);
          }
        } else if (eventName.includes('.update')) {
          if (idx !== -1) {
            GS.players[idx].score = player.score;
            GS.players[idx].status = player.status;
            GS.players[idx].lastHeartbeat = player.lastHeartbeat;
            GS.players[idx].name = player.name;
            GS.players[idx].avatar = player.avatar;
          }
        } else if (eventName.includes('.delete')) {
          if (idx !== -1) {
            const [removed] = GS.players.splice(idx, 1);
            ChatEngine.renderSystemMessage(\`🚪 <strong>\${SecurityUtil.escapeHtml(removed.name)}</strong> left the room.\`);
          }
        }

        this.renderLobbyUI();
        UI.renderLB();
      },

      handleGameStateUpdate(state) {
        if (!state) return;
        // Enforce strict monotonic event versioning
        if (typeof state.version === 'number') {
          if (state.version <= this.gameStateVersion) {
            _scLog(\`[Realtime] Stale state event ignored (v\${state.version} <= v\${this.gameStateVersion})\`);
            return;
          }
          this.gameStateVersion = state.version;
        }

        let winners = [];
        try {
          winners = typeof state.winners === 'string' ? JSON.parse(state.winners) : (state.winners || []);
        } catch (e) { winners = []; }
        this.currentRoundWinners = winners;

        if (state.phase === 'guessing' && !this.isHost) {
          const roundIdx = (state.roundNumber || 1) - 1;
          if (roundIdx !== this.currentPlayIndex || !this.currentClientFrame || !this.isMatchActive) {
            this.handleRemoteRoundStart({
              roundIndex: roundIdx,
              maskedHint: state.maskedHint,
              frame: {
                type: state.dialogueText ? 'dialogue' : ((state.currentImage && state.currentImage.includes('EYES')) ? 'eye' : 'image'),
                content: state.currentImage,
                dialogue: state.dialogueText,
                context: state.dialogueContext,
                sectionName: state.dialogueText ? 'Guess the Dialogue' : ((state.currentImage && state.currentImage.includes('EYES')) ? 'Guess the Eye' : 'Guess the Frame')
              }
            });
          }
        } else if (state.phase === 'revealed' && !this.isHost) {
          this.handleRemoteRoundFinish({
            revealedAnswer: state.revealedAnswer,
            currentRoundWinners: winners,
            currentPlayIndex: (state.roundNumber || 1) - 1
          });
        } else if (state.phase === 'paused' && !this.isHost) {
          this.isPaused = true;
          TC.pause();
          const stateInd = document.getElementById('stateInd');
          if (stateInd) {
            stateInd.textContent = 'PAUSED BY HOST';
            stateInd.style.background = '#fbbf24';
          }
        } else if (state.phase === 'guessing' && this.isPaused && !this.isHost) {
          this.isPaused = false;
          TC.resume();
          const stateInd = document.getElementById('stateInd');
          if (stateInd) {
            stateInd.textContent = 'GUESSING';
            stateInd.style.background = '';
          }
        }
      },

      async syncActiveRoomState() {
        const { databases } = getAppwrite();
        if (!databases || !this.roomId) return;
        try {
          const pList = await withNetworkRetry(() => databases.listDocuments(APPWRITE_CONFIG.databaseId, 'players', [
            Appwrite.Query.equal('roomId', this.roomId)
          ]));
          GS.players = pList.documents.map(d => ({
            id: d.playerId,
            name: d.name,
            avatar: d.avatar,
            avatarImg: 'avvtar/' + (d.avatar || 'aman').toLowerCase() + '.svg',
            score: d.score || 0,
            isHost: d.isHost || false,
            loaded: true,
            status: d.status || 'connected',
            lastHeartbeat: d.lastHeartbeat || Date.now(),
            color: d.color || '#57c3e0'
          }));

          const state = await withNetworkRetry(() => databases.getDocument(APPWRITE_CONFIG.databaseId, 'game_state', this.roomId));
          this.handleGameStateUpdate(state);

          this.renderLobbyUI();
          UI.renderLB();
        } catch (err) {
          _scWarn('[Sync Active Room State]', err.message);
        }
      },

      startHeartbeat() {
        this.stopHeartbeat();
        const { databases } = getAppwrite();
        if (!databases) return;

        // Throttled heartbeat: 15 seconds interval (reduces write load by 66%)
        this.heartbeatTimer = setInterval(async () => {
          if (!this.roomId || !this.playerId || !navigator.onLine || document.hidden) return;
          const playerDocId = \`\${this.roomId}_\${this.playerId}\`;
          try {
            await databases.updateDocument(APPWRITE_CONFIG.databaseId, 'players', playerDocId, {
              lastHeartbeat: Date.now(),
              status: 'connected'
            });
          } catch (e) {
            if (window.ScoopCastDebug) window.ScoopCastDebug.api.failures++;
          }
        }, 15000);

        // Presence Watchdog: runs locally every 5s with realistic thresholds
        this.presenceWatchdogTimer = setInterval(() => {
          if (!Array.isArray(GS.players)) return;
          const now = Date.now();
          let changed = false;
          GS.players.forEach(p => {
            if (p.id === this.playerId) return;
            const lastSeen = p.lastHeartbeat || now;
            const diff = now - lastSeen;
            let newStatus = 'connected';
            if (diff > 60000) newStatus = 'disconnected';
            else if (diff > 45000) newStatus = 'reconnecting';
            else if (diff > 25000) newStatus = 'away';

            if (p.status !== newStatus) {
              p.status = newStatus;
              changed = true;
            }
          });
          if (changed) {
            this.renderLobbyUI();
            UI.renderLB();
          }
        }, 5000);
      },

      stopHeartbeat() {
        if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
        if (this.presenceWatchdogTimer) clearInterval(this.presenceWatchdogTimer);
        this.heartbeatTimer = null;
        this.presenceWatchdogTimer = null;
      },

      startMatch() {
        if (!this.isHost) return;
        let pool = [];
        if (!this.hostSettings) {
          this.hostSettings = {
            category: 'all',
            categories: ['frames', 'eyes', 'dialogue'],
            roundsByMode: { frames: 20, eyes: 10, dialogue: 10 },
            rounds: 40,
            timer: 30
          };
        }

        const counts = this.hostSettings.roundsByMode || { frames: 20, eyes: 10, dialogue: 10 };

        const numFrames = counts.frames !== undefined ? counts.frames : 20;
        if (numFrames > 0) {
          const s1 = GS.sections.find(s => s.id === 1);
          if (s1 && s1.frames) {
            const shuf = [...s1.frames].sort(() => 0.5 - Math.random());
            pool.push(...shuf.slice(0, numFrames).map(f => ({ ...f, sectionName: 'Guess the Frame', sectionId: 1 })));
          }
        }

        const numDialogue = counts.dialogue !== undefined ? counts.dialogue : 10;
        if (numDialogue > 0) {
          const s2 = GS.sections.find(s => s.id === 2);
          if (s2 && s2.frames) {
            const shuf = [...s2.frames].sort(() => 0.5 - Math.random());
            pool.push(...shuf.slice(0, numDialogue).map(f => ({ ...f, sectionName: 'Guess the Dialogue', sectionId: 2 })));
          }
        }

        const numEyes = counts.eyes !== undefined ? counts.eyes : 10;
        if (numEyes > 0) {
          const s3 = GS.sections.find(s => s.id === 3);
          if (s3 && s3.frames) {
            const shuf = [...s3.frames].sort(() => 0.5 - Math.random());
            pool.push(...shuf.slice(0, numEyes).map(f => ({ ...f, sectionName: 'Guess the Eye', sectionId: 3 })));
          }
        }

        if (pool.length === 0) {
          const s1 = GS.sections.find(s => s.id === 1);
          if (s1) pool = [...s1.frames.slice(0, 20).map(f => ({ ...f, sectionName: 'Guess the Frame', sectionId: 1 }))];
        }

        this.currentPlaylist = pool;
        this.currentPlayIndex = 0;
        this.isMatchActive = true;
        this.isRoundFinished = false;
        this.currentRoundStartTime = Date.now();

        GS.players.forEach(p => p.score = 0);
        this.sessionStats = {
          roundsWon: 0,
          totalGuesses: 0,
          correctGuesses: 0,
          fastestGuessSeconds: null,
          roundStartTime: 0
        };

        const { databases } = getAppwrite();
        if (databases) {
          databases.updateDocument(APPWRITE_CONFIG.databaseId, 'rooms', this.roomId, {
            status: 'playing',
            currentRound: 1,
            totalRounds: pool.length,
            updatedAt: Date.now()
          }).catch(err => console.error('[Start Match DB Error]', err));
        }

        this.executeGameStart();
      },

      executeGameStart() {
        this.isMatchActive = true;
        GameController._onlineMode = true;
        GameController._isRemoteSession = !this.isHost;

        if (!this.isHost) {
          this.currentPlayIndex = -1;
          this.currentClientFrame = null;
        }

        UI.showScreen('gameScreen');
        UI.renderLB();

        if (this.isHost) {
          this.startRound(0);
        }
      },

      startRound(roundIndex) {
        this.isMatchActive = true;
        this.isRoundFinished = false;
        this.currentPlayIndex = roundIndex;
        this.currentRoundWinners = [];
        this.hasUsedHintThisRound = false;
        this.currentRoundStartTime = Date.now();
        ChatEngine.clearInputs();

        if (!this.currentPlaylist || this.currentPlaylist.length === 0) {
          const s1 = (typeof GS !== 'undefined' && GS.sections) ? GS.sections.find(s => s.id === 1) : null;
          if (s1 && s1.frames) {
            this.currentPlaylist = [...s1.frames.slice(0, 20).map(f => ({ ...f, sectionName: 'Guess the Frame', sectionId: 1 }))];
          } else {
            this.currentPlaylist = [];
          }
        }

        const frame = this.currentPlaylist[roundIndex];
        if (!frame) {
          this.finishGame();
          return;
        }

        // Preload ONLY the next round (roundIndex + 1) in background
        const nextIdx = roundIndex + 1;
        if (this.currentPlaylist && this.currentPlaylist[nextIdx]) {
          const nextFrame = this.currentPlaylist[nextIdx];
          if (nextFrame.content && typeof FrameDisplay !== 'undefined' && FrameDisplay.preloadImage) {
            FrameDisplay.preloadImage(nextFrame.content).catch(() => {});
          }
        }

        const chatPrompt = (frame.sectionId === 3 || frame.type === 'eye') ? 'Type celebrity guess or chat...' : 'Type movie guess or chat...';
        ChatEngine.setPlaceholder(chatPrompt);

        this.currentMaskedHint = this.generateMaskedHint(frame.answer);
        this.setHostSkipButtonState('skip');

        const hintBtns = document.querySelectorAll('#chatHintBtn, #hfbHintBtn, #mobileQuickHintBtn');
        hintBtns.forEach(b => {
          b.disabled = false;
          b.style.opacity = '1';
          b.textContent = b.id === 'mobileQuickHintBtn' ? '💡' : '💡 Hint (-2 pts)';
        });
        const cah = document.getElementById('chatActiveHint'); if (cah) cah.style.display = 'none';
        const hfbHintPill = document.getElementById('hfbActiveHintPill'); if (hfbHintPill) hfbHintPill.style.display = 'none';
        const mbHintBanner = document.getElementById('mobileHintBanner'); if (mbHintBanner) mbHintBanner.style.display = 'none';

        const input = document.getElementById('onlineGuessInput');
        const submitBtn = document.getElementById('onlineGuessSubmitBtn');
        const pill = document.getElementById('guessFeedbackPill');
        if (input) {
          input.value = '';
          input.disabled = false;
          input.placeholder = (frame.sectionId === 3 || frame.type === 'eye') ? 'Enter celebrity name...' : 'Enter movie name...';
          input.focus();
        }
        if (submitBtn) submitBtn.disabled = false;
        if (pill) { pill.style.display = 'none'; pill.textContent = ''; }

        const roundInfo = document.getElementById('roundInfo');
        if (roundInfo) roundInfo.textContent = \`Round \${roundIndex + 1} / \${this.currentPlaylist.length}\`;
        const secName = document.getElementById('curSecName');
        if (secName) secName.textContent = frame.sectionName || 'Guess the Frame';

        FrameDisplay.showFrame(frame);
        ChatEngine.renderRoundSeparator(roundIndex);
        const ansOvEl = document.getElementById('answerOverlay');
        if (ansOvEl) ansOvEl.classList.remove('active', 'eye-answer');
        const hfbNext = document.getElementById('hfbNextBtn'); if (hfbNext) hfbNext.style.display = 'none';
        document.getElementById('scoringOv').classList.remove('active');

        const timerDuration = (this.hostSettings && this.hostSettings.timer) || 30;
        this.playRoundIntroAnimation(roundIndex + 1, this.currentPlaylist.length, () => {
          TC.start(timerDuration, () => {
            this.endRound();
          });
        });

        if (this.isHost) {
          this.gameStateVersion++;
          const { databases } = getAppwrite();
          if (databases) {
            databases.updateDocument(APPWRITE_CONFIG.databaseId, 'game_state', this.roomId, {
              roundNumber: roundIndex + 1,
              phase: 'guessing',
              currentImage: frame.content || '',
              dialogueText: frame.dialogue || '',
              dialogueContext: frame.context || '',
              maskedHint: this.currentMaskedHint || '',
              revealedAnswer: '',
              winners: '[]',
              startedAt: Date.now(),
              version: this.gameStateVersion
            }).catch(e => console.warn('[Update Game State Error]', e.message));

            databases.updateDocument(APPWRITE_CONFIG.databaseId, 'rooms', this.roomId, {
              currentRound: roundIndex + 1,
              currentSection: frame.sectionName || 'frames',
              updatedAt: Date.now()
            }).catch(() => {});
          }
        }
      },

      handleRemoteRoundStart(msg) {
        this.isMatchActive = true;
        this.isRoundFinished = false;
        this.currentPlayIndex = msg.roundIndex;
        this.currentRoundWinners = [];
        this.currentClientFrame = msg.frame;
        this.currentMaskedHint = msg.maskedHint || null;
        this.currentRoundStartTime = Date.now();

        ChatEngine.clearInputs();
        const frame = msg.frame || {};
        const chatPrompt = (frame.sectionId === 3 || frame.type === 'eye') ? 'Type celebrity guess or chat...' : 'Type movie guess or chat...';
        ChatEngine.setPlaceholder(chatPrompt);

        const input = document.getElementById('onlineGuessInput');
        const submitBtn = document.getElementById('onlineGuessSubmitBtn');
        const pill = document.getElementById('guessFeedbackPill');
        if (input) {
          input.value = '';
          input.disabled = false;
          input.placeholder = (frame.sectionId === 3 || frame.type === 'eye') ? 'Enter celebrity name...' : 'Enter movie name...';
          input.focus();
        }
        if (submitBtn) submitBtn.disabled = false;
        if (pill) { pill.style.display = 'none'; pill.textContent = ''; }

        const totalRounds = (this.hostSettings && this.hostSettings.rounds) || 40;
        const roundInfo = document.getElementById('roundInfo');
        if (roundInfo) roundInfo.textContent = \`Round \${msg.roundIndex + 1} / \${totalRounds}\`;
        const secName = document.getElementById('curSecName');
        if (secName) secName.textContent = frame.sectionName || 'Guess the Frame';

        FrameDisplay.showFrame(frame);
        ChatEngine.renderRoundSeparator(msg.roundIndex);
        const ansOvEl = document.getElementById('answerOverlay');
        if (ansOvEl) ansOvEl.classList.remove('active', 'eye-answer');

        const timerDuration = (this.hostSettings && this.hostSettings.timer) || 30;
        this.playRoundIntroAnimation(msg.roundIndex + 1, totalRounds, () => {
          TC.start(timerDuration, () => {});
        });
      },

      playRoundIntroAnimation(current, total, onComplete) {
        const ov = document.getElementById('roundIntroOverlay');
        if (!ov) { if (onComplete) onComplete(); return; }
        const rNum = document.getElementById('rioRoundNumber');
        const rTotal = document.getElementById('rioTotalRounds');
        if (rNum) rNum.textContent = String(current);
        if (rTotal) rTotal.textContent = String(total);
        ov.style.display = 'flex';
        ov.classList.remove('active');
        void ov.offsetWidth;
        ov.classList.add('active');
        SoundManager.play('whoosh');

        setTimeout(() => {
          ov.classList.remove('active');
          setTimeout(() => {
            ov.style.display = 'none';
            if (onComplete) onComplete();
          }, 350);
        }, 1100);
      },

      setHostSkipButtonState(state) {
        const btn = document.getElementById('hfbSkipBtn');
        if (!btn) return;
        if (state === 'skip') {
          btn.textContent = '⏭ Skip Frame';
          btn.style.opacity = '1';
        } else {
          btn.textContent = '⏭ Next Frame';
        }
      },

      async submitGuessDirect(guess) {
        if (!guess || !guess.trim()) return;
        guess = guess.trim();
        if (this.currentRoundWinners.some(w => w.playerId === this.playerId)) return;

        this.showGuessFeedback(null, '⏳ Checking guess...');

        const { functions } = getAppwrite();
        let validated = false;
        const callStart = Date.now();

        if (functions) {
          try {
            const guessId = \`\${this.playerId}_\${this.roomId}_r\${this.currentPlayIndex + 1}_\${Date.now()}\`;
            if (window.ScoopCastDebug) {
              window.ScoopCastDebug.function.callCount++;
            }
            const execution = await withNetworkRetry(() => functions.createExecution(
              'validate-guess',
              JSON.stringify({
                roomId: this.roomId,
                roundIndex: this.currentPlayIndex,
                roundNumber: this.currentPlayIndex + 1,
                guess: guess,
                playerId: this.playerId,
                playerName: this.playerName,
                playerAvatar: this.playerAvatar,
                guessId: guessId
              })
            ), 2, 200);

            if (window.ScoopCastDebug) {
              window.ScoopCastDebug.function.latency = Date.now() - callStart;
              window.ScoopCastDebug.function.lastCallTime = Date.now();
            }

            const result = JSON.parse(execution.responseBody || '{}');
            if (result.success) {
              if (result.isDuplicate) {
                return;
              }
              validated = true;
              if (result.isCorrect) {
                if (result.alreadyScored) {
                  this.showGuessFeedback(true, '🎉 Already correct!');
                  return;
                }
                SoundManager.play('correct');
                this.showGuessFeedback(true, \`🎉 Correct! +\${result.points} Pts (\${result.position === 1 ? '1st' : result.position === 2 ? '2nd' : '3rd'} Place!)\`);
                const input = document.getElementById('chatTextInput') || document.getElementById('onlineGuessInput');
                if (input) input.disabled = true;
                const submitBtn = document.getElementById('chatSendBtn') || document.getElementById('onlineGuessSubmitBtn');
                if (submitBtn) submitBtn.disabled = true;

                const p = GS.players.find(x => x.id === this.playerId);
                if (p) {
                  if (typeof result.newTotalScore === 'number') {
                    p.score = result.newTotalScore;
                  } else if (!result.serverDbUpdated) {
                    p.score = (p.score || 0) + result.points;
                  }
                }
                UI.renderLB();

                const { databases } = getAppwrite();
                if (databases && !result.serverDbUpdated) {
                  const pDocId = \`\${this.roomId}_\${this.playerId}\`;
                  databases.updateDocument(APPWRITE_CONFIG.databaseId, 'players', pDocId, {
                    score: p ? p.score : result.points
                  }).catch(err => console.error('[Score Update Error]', err));

                  try {
                    databases.getDocument(APPWRITE_CONFIG.databaseId, 'game_state', this.roomId).then(gsDoc => {
                      let curWinners = [];
                      try { curWinners = JSON.parse(gsDoc.winners || '[]'); } catch(e) { curWinners = []; }
                      if (!curWinners.some(w => w.playerId === this.playerId)) {
                        curWinners.push(result.winRecord);
                        this.gameStateVersion++;
                        databases.updateDocument(APPWRITE_CONFIG.databaseId, 'game_state', this.roomId, {
                          winners: JSON.stringify(curWinners),
                          version: this.gameStateVersion
                        }).catch(() => {});
                      }
                    }).catch(() => {});
                  } catch(e) {}
                }

                if (typeof ChatEngine !== 'undefined' && ChatEngine.renderWinnerBanner) {
                  ChatEngine.renderWinnerBanner(result.winRecord);
                }

                if (this.isHost) {
                  await this.recordRoundWinner(result.winRecord, 0);
                }
              } else {
                SoundManager.play('wrong');
                this.showGuessFeedback(false, '❌ Not quite, try again!');
                const input = document.getElementById('chatTextInput') || document.getElementById('onlineGuessInput');
                if (input) {
                  input.classList.add('shake-input');
                  setTimeout(() => input.classList.remove('shake-input'), 400);
                }
                if (typeof ChatEngine !== 'undefined') {
                  ChatEngine.renderMessage({
                    id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
                    senderId: this.playerId,
                    senderName: this.playerName,
                    senderAvatar: this.playerAvatar,
                    text: guess,
                    isGuessed: false,
                    timestamp: Date.now()
                  });
                }
              }
            }
          } catch (e) {
            _scWarn('[Appwrite Function Check Fallback]', e.message);
          }
        }

        if (!validated) {
          if (this.isHost) {
            this.validateAndProcessGuessLocal(guess);
          } else {
            this.showGuessFeedback(false, '⚠️ Network delay, please retry!');
            const input = document.getElementById('chatTextInput') || document.getElementById('onlineGuessInput');
            if (input) input.disabled = false;
            const submitBtn = document.getElementById('chatSendBtn') || document.getElementById('onlineGuessSubmitBtn');
            if (submitBtn) submitBtn.disabled = false;
          }
        }
      },

      validateAndProcessGuessLocal(guess) {
        const frame = this.currentPlaylist[this.currentPlayIndex];
        if (!frame || !frame.answer) return;
        const isMatch = FuzzyMatcher.isMatch(guess, frame.answer);

        if (isMatch) {
          const pos = this.currentRoundWinners.length + 1;
          const pts = pos === 1 ? 10 : (pos === 2 ? 7 : (pos === 3 ? 5 : 0));
          if (pts > 0) {
            const winRecord = {
              playerId: this.playerId,
              playerName: this.playerName,
              avatar: this.playerAvatar,
              position: pos,
              points: pts,
              timestamp: Date.now()
            };
            this.recordRoundWinner(winRecord, pts);
            SoundManager.play('correct');
            this.showGuessFeedback(true, \`🎉 Correct! +\${pts} Pts\`);
            const input = document.getElementById('onlineGuessInput'); if (input) input.disabled = true;
            const submitBtn = document.getElementById('onlineGuessSubmitBtn'); if (submitBtn) submitBtn.disabled = true;
          }
        } else {
          SoundManager.play('wrong');
          this.showGuessFeedback(false, '❌ Not quite, try again!');
        }
      },

      async recordRoundWinner(winRecord, pts) {
        if (!this.currentRoundWinners.some(w => w.playerId === winRecord.playerId)) {
          this.currentRoundWinners.push(winRecord);
        }

        const p = GS.players.find(x => x.id === winRecord.playerId);
        if (p && pts > 0) p.score = (p.score || 0) + pts;

        UI.renderLB();
        ChatEngine.renderWinnerBanner(winRecord);

        const { databases } = getAppwrite();
        if (databases && this.isHost) {
          try {
            this.gameStateVersion++;
            await databases.updateDocument(APPWRITE_CONFIG.databaseId, 'game_state', this.roomId, {
              winners: JSON.stringify(this.currentRoundWinners),
              version: this.gameStateVersion
            });
            const pDocId = \`\${this.roomId}_\${winRecord.playerId}\`;
            await databases.updateDocument(APPWRITE_CONFIG.databaseId, 'players', pDocId, {
              score: (p ? p.score : 0)
            });
          } catch(e) {}
        }

        if (this.currentRoundWinners.length >= 3) {
          setTimeout(() => this.endRound(), 800);
        }
      },

      showGuessFeedback(isCorrect, text) {
        let pill = document.getElementById('guessFeedbackPill');
        if (!pill) {
          const form = document.getElementById('chatInputForm');
          if (form && form.parentNode) {
            pill = document.createElement('div');
            pill.id = 'guessFeedbackPill';
            form.parentNode.insertBefore(pill, form);
          }
        }
        if (!pill) return;
        pill.textContent = text;
        pill.className = 'guess-feedback-pill ' + (isCorrect === true ? 'guess-feedback-correct' : (isCorrect === false ? 'guess-feedback-wrong' : ''));
        pill.style.display = 'inline-flex';
        pill.style.background = isCorrect === true ? '#22c55e' : (isCorrect === false ? '#ef4444' : '#3b82f6');
        pill.style.color = '#ffffff';
        pill.style.marginBottom = '6px';
        pill.style.padding = '6px 14px';
        pill.style.borderRadius = '9999px';
        pill.style.fontWeight = '800';
        pill.style.fontSize = '13px';
        pill.style.alignSelf = 'center';
      },

      endRound() {
        TC.stop();
        this.isRoundFinished = true;
        const currentFrame = (this.currentPlaylist && this.currentPlaylist[this.currentPlayIndex]) || this.currentClientFrame;
        if (!currentFrame) return;

        const img = document.querySelector('#imageContainer img');
        if (img) img.style.filter = 'blur(0px)';

        const ansTitle = document.getElementById('ansTitle');
        const ansYear = document.getElementById('ansYear');
        const ansBadge = document.getElementById('ansBadge');
        const ansOverlay = document.getElementById('answerOverlay');

        if (ansBadge) ansBadge.textContent = (currentFrame && currentFrame.type === 'eye') ? 'CELEBRITY REVEAL' : 'ANSWER';
        if (ansTitle) ansTitle.textContent = currentFrame.answer || '';
        if (ansYear) ansYear.textContent = currentFrame.year ? \`(\${currentFrame.year})\` : '';

        if (currentFrame.type === 'eye' && currentFrame.revealContent) {
          const imageContainer = document.getElementById('imageContainer');
          if (imageContainer) {
            const loadedImg = imageContainer.querySelector('.frame-image.loaded:not(.eye-full-reveal)');
            const fullImg = document.createElement('img');
            fullImg.className = 'frame-image eye-full-reveal';
            fullImg.alt = currentFrame.answer || 'Full reveal photo';
            const showFull = () => {
              if (loadedImg) loadedImg.style.display = 'none';
              if (!fullImg.parentNode) imageContainer.appendChild(fullImg);
              requestAnimationFrame(() => fullImg.classList.add('visible', 'loaded'));
              if (typeof PaletteManager !== 'undefined') PaletteManager.fromImage(fullImg);
            };
            fullImg.onload = showFull;
            fullImg.src = currentFrame.revealContent;
            if (fullImg.complete && fullImg.naturalWidth > 0) showFull();
          }
          if (ansOverlay) ansOverlay.classList.add('eye-answer');
        } else {
          if (ansOverlay) ansOverlay.classList.remove('eye-answer');
        }

        let spotlightHtml = '';
        if (currentFrame.type === 'dialogue' && currentFrame.dialogue) {
          spotlightHtml += \`<div class="ans-dialogue-quote" style="margin-bottom:12px; font-style:italic; font-weight:700; color:var(--text-secondary,#666); font-size:1.05rem;">"\${SecurityUtil.escapeHtml(currentFrame.dialogue)}"</div>\`;
        }
        if (this.currentRoundWinners.length > 0) {
          spotlightHtml += '<div class="winners-spotlight">' + this.currentRoundWinners.map(w => {
            const badgeClass = w.position === 1 ? 'winner-pill-1' : (w.position === 2 ? 'winner-pill-2' : 'winner-pill-3');
            return \`<div class="winner-pill \${badgeClass}"><span>\${w.position === 1 ? '🥇' : w.position === 2 ? '🥈' : '🥉'} \${SecurityUtil.escapeHtml(w.playerName)}</span><span>+\${Number(w.points) || 0} pts</span></div>\`;
          }).join('') + '</div>';
        } else {
          spotlightHtml += '<div style="margin-top:10px; font-weight:800; color:#ff6b6b;">⏭ No one got it in time!</div>';
        }

        const ansDialogue = document.getElementById('ansDialogue');
        if (ansDialogue) ansDialogue.innerHTML = spotlightHtml;

        if (ansOverlay) ansOverlay.classList.add('visible', 'active');
        SoundManager.play('reveal');

        if (this.isHost) {
          this.gameStateVersion++;
          const { databases } = getAppwrite();
          if (databases) {
            databases.updateDocument(APPWRITE_CONFIG.databaseId, 'game_state', this.roomId, {
              phase: 'revealed',
              revealedAnswer: currentFrame.answer || '',
              winners: JSON.stringify(this.currentRoundWinners),
              version: this.gameStateVersion
            }).catch(() => {});
          }

          const nextBtn = document.getElementById('ansNextRoundBtn');
          const waitPill = document.getElementById('ansWaitingHostPill');
          const isLast = (this.currentPlayIndex + 1 >= this.currentPlaylist.length);
          const baseLabel = isLast ? 'FINISH MATCH 🏁' : 'NEXT ROUND ⏭';
          if (nextBtn) {
            nextBtn.style.display = 'inline-flex';
            nextBtn.textContent = baseLabel + ' (20s)';
          }
          if (waitPill) waitPill.style.display = 'none';

          if (this._hostAutoAdvanceTimer) clearInterval(this._hostAutoAdvanceTimer);
          let hostCountdown = 20;
          this._hostAutoAdvanceTimer = setInterval(() => {
            hostCountdown--;
            if (nextBtn && nextBtn.style.display !== 'none') {
              nextBtn.textContent = baseLabel + ' (' + hostCountdown + 's)';
            }
            if (hostCountdown <= 0) {
              clearInterval(this._hostAutoAdvanceTimer);
              if (this.isHost && document.getElementById('answerOverlay') && document.getElementById('answerOverlay').classList.contains('visible')) {
                this.hostNextRound();
              }
            }
          }, 1000);
        }
      },

      handleRemoteRoundFinish(msg) {
        TC.stop();
        this.isRoundFinished = true;
        this.currentRoundWinners = msg.currentRoundWinners || [];
        const currentFrame = (this.currentPlaylist && this.currentPlaylist[msg.currentPlayIndex]) || this.currentClientFrame;

        const ansTitle = document.getElementById('ansTitle');
        const ansBadge = document.getElementById('ansBadge');
        const ansOverlay = document.getElementById('answerOverlay');

        if (ansBadge) ansBadge.textContent = (currentFrame && currentFrame.type === 'eye') ? 'CELEBRITY REVEAL' : 'ANSWER';
        if (ansTitle) ansTitle.textContent = msg.revealedAnswer || (currentFrame ? currentFrame.answer : '');

        let spotlightHtml = '';
        if (this.currentRoundWinners.length > 0) {
          spotlightHtml += '<div class="winners-spotlight">' + this.currentRoundWinners.map(w => {
            const badgeClass = w.position === 1 ? 'winner-pill-1' : (w.position === 2 ? 'winner-pill-2' : 'winner-pill-3');
            return \`<div class="winner-pill \${badgeClass}"><span>\${w.position === 1 ? '🥇' : w.position === 2 ? '🥈' : '🥉'} \${SecurityUtil.escapeHtml(w.playerName)}</span><span>+\${Number(w.points) || 0} pts</span></div>\`;
          }).join('') + '</div>';
        } else {
          spotlightHtml += '<div style="margin-top:10px; font-weight:800; color:#ff6b6b;">⏭ No one got it in time!</div>';
        }

        const ansDialogue = document.getElementById('ansDialogue');
        if (ansDialogue) ansDialogue.innerHTML = spotlightHtml;

        const nextBtn = document.getElementById('ansNextRoundBtn');
        const waitPill = document.getElementById('ansWaitingHostPill');
        if (nextBtn) nextBtn.style.display = 'none';
        if (waitPill) waitPill.style.display = 'inline-flex';

        if (ansOverlay) ansOverlay.classList.add('visible', 'active');
        SoundManager.play('reveal');
      },

      hostNextRound() {
        if (!this.isHost) return;
        if (this._hostAutoAdvanceTimer) clearInterval(this._hostAutoAdvanceTimer);
        const ansOverlay = document.getElementById('answerOverlay');
        if (ansOverlay) ansOverlay.classList.remove('visible', 'active');

        const nextIndex = this.currentPlayIndex + 1;
        if (nextIndex < this.currentPlaylist.length) {
          this.startRound(nextIndex);
        } else {
          this.finishGame();
        }
      },

      generateMaskedHint(answer) {
        if (!answer) return '';
        return answer.split(' ').map(word => {
          const len = word.length;
          if (len <= 2) return '_ '.repeat(len).trim();
          const first = word[0];
          const last = len > 3 ? word[len - 1] : '_';
          const middle = '_ '.repeat(Math.max(0, len - (len > 3 ? 2 : 1))).trim();
          return \`\${first} \${middle} \${last !== '_' ? last : ''}\`.trim();
        }).join('   ');
      },

      requestHint() {
        if (this.hasUsedHintThisRound) return;
        this.hasUsedHintThisRound = true;

        const p = GS.players.find(x => x.id === this.playerId);
        if (p) {
          p.score = Math.max(0, (p.score || 0) - 2);
          UI.renderLB();
        }

        const cah = document.getElementById('chatActiveHint');
        if (cah && this.currentMaskedHint) {
          cah.textContent = '💡 Hint: ' + this.currentMaskedHint;
          cah.style.display = 'block';
        }
        const mbHintBanner = document.getElementById('mobileHintBanner');
        if (mbHintBanner && this.currentMaskedHint) {
          mbHintBanner.textContent = '💡 Hint: ' + this.currentMaskedHint;
          mbHintBanner.style.display = 'block';
        }
      },

      finishGame() {
        this.isMatchActive = false;
        const { databases } = getAppwrite();
        if (databases && this.isHost) {
          const sorted = [...GS.players].sort((a, b) => b.score - a.score);
          const winner = sorted[0] || { name: 'Player', id: this.playerId };
          databases.createDocument(APPWRITE_CONFIG.databaseId, 'match_history', 'match_' + Date.now(), {
            matchId: 'match_' + Date.now(),
            roomId: this.roomId,
            winner: winner.name,
            players: JSON.stringify(GS.players),
            scores: JSON.stringify(Object.fromEntries(GS.players.map(p => [p.id, p.score]))),
            date: new Date().toISOString()
          }).catch(() => {});

          databases.updateDocument(APPWRITE_CONFIG.databaseId, 'rooms', this.roomId, {
            status: 'finished',
            updatedAt: Date.now()
          }).catch(() => {});
        }

        WinnerScreen.show(GS.players);
      },

      handleRemoteGameOver() {
        this.isMatchActive = false;
        WinnerScreen.show(GS.players);
      },

      hostSkipRound() {
        if (!this.isHost) return;
        this.endRound();
      },

      hostTogglePause() {
        this.isPaused = !this.isPaused;
        const btn = document.getElementById('hfbPauseBtn');
        if (btn) btn.textContent = this.isPaused ? '▶ Resume' : '⏸ Pause';
        if (this.isPaused) TC.pause();
        else TC.resume();
      },

      hostEndGame() {
        if (!this.isHost) return;
        this.finishGame();
      },

      rematch() {
        if (!this.isHost) return;
        this.startMatch();
      },

      returnToLobby() {
        this.isMatchActive = false;
        this.isRoundFinished = false;
        if (this.isHost) {
          const { databases } = getAppwrite();
          if (databases) {
            databases.updateDocument(APPWRITE_CONFIG.databaseId, 'rooms', this.roomId, {
              status: 'lobby',
              currentRound: 0
            }).catch(() => {});
          }
        }
        UI.showScreen('playerLobbyScreen');
        this.renderLobbyUI();
      },

      leaveRoom() {
        this.stopHeartbeat();
        if (this.realtimeUnsubscribe) {
          try { this.realtimeUnsubscribe(); } catch(e) {}
          this.realtimeUnsubscribe = null;
        }
        const { databases } = getAppwrite();
        if (databases && this.roomId && this.playerId) {
          const pDocId = \`\${this.roomId}_\${this.playerId}\`;
          databases.updateDocument(APPWRITE_CONFIG.databaseId, 'players', pDocId, {
            status: 'disconnected'
          }).catch(() => {});
        }
        this.clearActiveSession();
        this.roomId = null;
        this.roomCode = null;
        this.isHost = false;
        this.isMatchActive = false;
        this.setConnectionState('DISCONNECTED');
        UI.showScreen('homeScreen');
      },

      renderLobbyUI() {
        PlayerLobby.render();
      },

      copyRoomLink() {
        const link = \`\${window.location.origin}\${window.location.pathname}?room=\${this.roomCode}\`;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(link).then(() => {
            alert('Room link copied to clipboard: ' + link);
          }).catch(() => this._fallbackCopy(link));
        } else {
          this._fallbackCopy(link);
        }
      },

      _fallbackCopy(text) {
        const el = document.createElement('textarea');
        el.value = text;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        alert('Room link copied: ' + text);
      },

      checkPendingRejoin() {
        try {
          const raw = localStorage.getItem('gtf_active_session');
          if (!raw) return;
          const session = JSON.parse(raw);
          if (session && session.roomId && (Date.now() - (session.timestamp || 0) < 1000 * 60 * 60 * 2)) {
            this.promptRejoinModal(session);
          } else {
            this.clearActiveSession();
          }
        } catch(e) {}
      },

      promptRejoinModal(session) {
        this.pendingRejoinSession = session;
        const modal = document.getElementById('rejoinRoomModal');
        if (!modal) return;
        const codeEl = document.getElementById('rejoinRoomCodeText');
        const nameEl = document.getElementById('rejoinPlayerName');
        const roleEl = document.getElementById('rejoinRoleTag');
        const avImg = document.getElementById('rejoinAvatarImg');
        const avContainer = document.getElementById('rejoinAvatarContainer');

        const av = (session.playerAvatar || 'aman').toLowerCase().replace(/[^a-z0-9]/g, '');
        const avConfig = (typeof AVATAR_MAP !== 'undefined' && AVATAR_MAP[av]) ? AVATAR_MAP[av] : { color: '#FF6B9D', img: \`avvtar/\${av}.svg\` };

        if (codeEl) codeEl.textContent = session.roomCode;
        if (nameEl) nameEl.textContent = session.playerName || this.getAvatarDisplayName(av);
        if (roleEl) roleEl.textContent = session.isHost ? 'Host 👑' : 'Player';
        if (avImg) avImg.src = \`avvtar/\${av}.svg\`;
        if (avContainer) avContainer.style.backgroundColor = avConfig.color;

        modal.classList.add('active');
      },

      async confirmRejoinRoom() {
        const session = this.pendingRejoinSession;
        if (!session) return;
        this.closeModals();

        this.playerId = session.playerId;
        this.playerName = session.playerName;
        this.playerAvatar = session.playerAvatar;
        this.roomCode = session.roomCode;
        this.roomId = session.roomId || ('room_' + this.roomCode);
        this.isHost = !!session.isHost;
        this.hostSettings = session.hostSettings || this.hostSettings;
        GameController._onlineMode = true;

        await this.ensureAuth();
        this.subscribeRealtime();
        this.startHeartbeat();
        this.setConnectionState('CONNECTED');
        await this.syncActiveRoomState();

        const { databases } = getAppwrite();
        if (databases) {
          try {
            const roomDoc = await withNetworkRetry(() => databases.getDocument(APPWRITE_CONFIG.databaseId, 'rooms', this.roomId));
            if (roomDoc.status === 'playing') {
              this.executeGameStart();
            } else {
              UI.showScreen('playerLobbyScreen');
              this.renderLobbyUI();
            }
          } catch (e) {
            UI.showScreen('playerLobbyScreen');
            this.renderLobbyUI();
          }
        }
      },

      dismissRejoinAndStartNew() {
        this.clearActiveSession();
        this.pendingRejoinSession = null;
        this.closeModals();
        const urlParams = new URLSearchParams(window.location.search);
        const roomParam = urlParams.get('room');
        if (roomParam) {
          const joinInput = document.getElementById('joinCodeInput');
          if (joinInput) joinInput.value = roomParam.trim().toUpperCase();
          this.openJoinModal();
        }
      },

      sendEvent(type, payload) {
        if (type === 'CHAT_MESSAGE' && this.broadcastChannel && payload) {
          try {
            this.broadcastChannel.postMessage({ type: 'CHAT_MESSAGE', payload, roomId: this.roomId });
          } catch(e) {}
        }
        const { databases } = getAppwrite();
        if (!databases || !this.roomId) return;
        if (type === 'UPDATE_HOST_SETTINGS' && this.isHost && payload && payload.settings) {
          const s = payload.settings;
          databases.updateDocument(APPWRITE_CONFIG.databaseId, 'rooms', this.roomId, {
            timer: Number(s.timer) || 30,
            totalRounds: Number(s.rounds) || 40,
            categories: (s.categories && Array.isArray(s.categories)) ? s.categories.join(',') : (s.category || 'all')
          }).catch(() => {});
        } else if (type === 'UPDATE_PLAYER_NAME' && payload && payload.playerId && payload.name) {
          const pDocId = \`\${this.roomId}_\${payload.playerId}\`;
          databases.updateDocument(APPWRITE_CONFIG.databaseId, 'players', pDocId, {
            name: payload.name
          }).catch(() => {});
        } else if (type === 'PLAYER_KICKED' && this.isHost && payload && payload.targetPlayerId) {
          const pDocId = \`\${this.roomId}_\${payload.targetPlayerId}\`;
          databases.deleteDocument(APPWRITE_CONFIG.databaseId, 'players', pDocId).catch(() => {});
        }
      },

      // Compatibility methods
      stopClientHeartbeat() {},
      stopHostHeartbeat() {},
      stopHostPresenceWatchdog() {},
      stopHostWatchdog() {},
      checkHostMigration() {},
      broadcastState(reason) {}
    };

    window.MultiplayerEngine = MultiplayerEngine;
`;
}

function updateHtmlFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  console.log('Processing:', filePath);
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Remove mqtt script tag if present
  content = content.replace(/<script\s+src="https:\/\/unpkg\.com\/mqtt@[^"]+"><\/script>\s*/gi, '');

  // 2. Locate MultiplayerEngine boundaries (replacing old config and engine entirely)
  let startIdx = -1;
  const p1 = content.indexOf('PRODUCTION APPWRITE MULTIPLAYER ENGINE');
  if (p1 !== -1) {
    startIdx = content.lastIndexOf('/* ═══', p1);
  } else {
    startIdx = content.indexOf('const MultiplayerEngine = {');
  }
  const endMarker = '/* ═══ EXACT REPLICA: AAA COMIC VICTORY WINNER CONTROLLER ═══ */';
  const endIdx = content.indexOf(endMarker);

  if (startIdx === -1 || endIdx === -1) {
    console.error('Could not find exact MultiplayerEngine markers in', filePath, { startIdx, endIdx });
    return;
  }

  const newEngine = generateHardenedAppwriteEngine().trim() + '\n\n    ';
  content = content.slice(0, startIdx) + newEngine + content.slice(endIdx);

  // 3. Optimize FrameDisplay (preloadImage, preloadAll, preloadUpcoming)
  const preloadStartMarker = '/* Preload and cache images */';
  const preloadEndMarker = '/* Reset display */';
  const pPreloadStart = content.indexOf(preloadStartMarker);
  const pPreloadEnd = content.indexOf(preloadEndMarker, pPreloadStart);

  if (pPreloadStart !== -1 && pPreloadEnd !== -1) {
    const optimizedPreloadBlock = `/* Preload and cache images (bounded LRU 15 images, WebP priority, telemetry) */
      preloadImage(src) {
        if (!src) return Promise.resolve(null);
        let webpSrc = src;
        if (/\\.(png|jpg|jpeg)$/i.test(src) && !src.includes('avvtar/') && !src.includes('logo.png')) {
          webpSrc = src.replace(/\\.(png|jpg|jpeg)$/i, '.webp');
        }
        if (GS.imageCache.has(webpSrc)) return Promise.resolve(GS.imageCache.get(webpSrc));
        if (GS.imageCache.has(src)) return Promise.resolve(GS.imageCache.get(src));

        const imgStart = Date.now();
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            if (GS.imageCache.size >= 15) {
              const firstKey = GS.imageCache.keys().next().value;
              GS.imageCache.delete(firstKey);
            }
            GS.imageCache.set(webpSrc, img);
            if (window.ScoopCastDebug && window.ScoopCastDebug.images) {
              window.ScoopCastDebug.images.lastLoadTime = Date.now() - imgStart;
              window.ScoopCastDebug.images.cachedCount = GS.imageCache.size;
            }
            resolve(img);
          };
          img.onerror = () => {
            if (webpSrc !== src) {
              const fallback = new Image();
              fallback.onload = () => {
                if (GS.imageCache.size >= 15) {
                  const firstKey = GS.imageCache.keys().next().value;
                  GS.imageCache.delete(firstKey);
                }
                GS.imageCache.set(src, fallback);
                if (window.ScoopCastDebug && window.ScoopCastDebug.images) {
                  window.ScoopCastDebug.images.lastLoadTime = Date.now() - imgStart;
                  window.ScoopCastDebug.images.cachedCount = GS.imageCache.size;
                }
                resolve(fallback);
              };
              fallback.onerror = () => resolve(null);
              fallback.src = src;
            } else {
              resolve(null);
            }
          };
          img.src = webpSrc;
        });
      },

      /* Preload all frames for progress tracking - Round 1 only (instant lobby entry) */
      async preloadAll(onProgress) {
        const round1 = (GS.sections && GS.sections[0] && GS.sections[0].frames[0]) ? GS.sections[0].frames[0] : null;
        const priorityImages = [];

        if (round1) {
          if (round1.content) priorityImages.push(round1.content);
          if (round1.revealContent) priorityImages.push(round1.revealContent);
        }

        GS.players.forEach(p => {
          const avKey = (p.avatar || 'aman').toLowerCase().replace(/[^a-z0-9]/g, '');
          priorityImages.push('avvtar/' + avKey + '.svg');
        });

        let loaded = 0;
        const totalPriority = priorityImages.length || 1;
        for (const src of priorityImages) {
          await this.preloadImage(src).catch(() => {});
          loaded++;
          if (onProgress) onProgress({ loaded, total: totalPriority, percent: Math.round((loaded / totalPriority) * 100) });
        }
        if (onProgress) onProgress({ loaded: totalPriority, total: totalPriority, percent: 100 });
      },

      /* Preload next round ONLY (Strict memory efficiency: Never download all future assets) */
      async preloadUpcoming() {
        if (GS.players.length === 1 && !GameController._onlineMode) return;
        const nextRoundIdx = GS.currentSectionRound + 1;
        const curSec = GS.sections[GS.currentSection];
        if (!curSec || !curSec.frames) return;
        const valid = curSec.frames.filter(f => (f.content && f.answer) || (f.type === 'dialogue' && f.dialogue && f.answer));
        if (nextRoundIdx < valid.length) {
          const nextFrame = valid[nextRoundIdx];
          if ((nextFrame.type === 'image' || nextFrame.type === 'eye') && nextFrame.content) {
            this.preloadImage(nextFrame.content).catch(() => {});
          }
          if (nextFrame.type === 'eye' && nextFrame.revealContent) {
            this.preloadImage(nextFrame.revealContent).catch(() => {});
          }
        }
      },

      `;
    content = content.slice(0, pPreloadStart) + optimizedPreloadBlock + content.slice(pPreloadEnd);
  }

  // Remove any stray duplicate window.MultiplayerEngine = MultiplayerEngine; after FrameDisplay
  content = content.replace(
    /ansOv\.classList\.add\('visible'\);\s*SoundManager\.playReveal\(\);\s*\}\,\s*\}\;\s*window\.MultiplayerEngine\s*=\s*MultiplayerEngine\;\s*\/\* ═══ GAME CONTROLLER ═══ \*\//g,
    "ansOv.classList.add('visible');\n        SoundManager.playReveal();\n      },\n    };\n\n    /* ═══ GAME CONTROLLER ═══ */"
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully updated', filePath);
}

for (const f of targetFiles) {
  updateHtmlFile(f);
}
console.log('Appwrite production hardening applied to all target files!');
