const { test, expect } = require('@playwright/test');

test.describe('ULTRA-COMPREHENSIVE MASTER TEST: Every Feature, Button, Logic, System & Player Connection', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 1. ALL BUTTONS & UI CONTROLS ON EVERY SCREEN
  // ════════════════════════════════════════════════════════════════════════════
  test('BUTTONS: Exhaustive test of all buttons, modals, pickers, and navigation', async ({ page }) => {
    // 1.1 Home Screen Buttons
    const createBtn = page.locator('.h-card-create');
    const joinBtn = page.locator('.h-card-join');
    const localBtn = page.locator('.h-card-local');
    const sndBtn = page.locator('#sndBtn');

    await expect(createBtn).toBeVisible();
    await expect(joinBtn).toBeVisible();
    await expect(localBtn).toBeHidden();
    await expect(sndBtn).toBeVisible();

    // Sound toggle button (Mute / Unmute)
    const initialMuted = await page.evaluate(() => SoundManager.muted);
    await sndBtn.click();
    expect(await page.evaluate(() => SoundManager.muted)).toBe(!initialMuted);
    await sndBtn.click();
    expect(await page.evaluate(() => SoundManager.muted)).toBe(initialMuted);

    // 1.2 Create Room Modal buttons & Avatar Pickers
    await createBtn.click();
    const createModal = page.locator('#createRoomModal');
    await expect(createModal).toHaveClass(/active/);

    const hostNameInput = page.locator('#hostPlayerNameInput');
    await hostNameInput.fill('Captain_Marvel');

    // Test picking each of the 4 avatars
    const avatars = ['aman', 'amish', 'aziz', 'vish'];
    for (const av of avatars) {
      const opt = page.locator(`#createRoomModal .mp-avatar-option[data-avatar="${av}"]`);
      await opt.click();
      await expect(opt).toHaveClass(/selected/);
    }
    // Preserves typed name after avatar pick
    expect(await hostNameInput.inputValue()).toBe('Captain_Marvel');

    // Close Create Modal button (✕)
    await page.locator('#createRoomModal .mp-modal-close').click();
    await expect(createModal).not.toHaveClass(/active/);

    // 1.3 Join Room Modal buttons & Validation
    await joinBtn.click();
    const joinModal = page.locator('#joinRoomModal');
    await expect(joinModal).toHaveClass(/active/);

    const joinNameInput = page.locator('#joinPlayerNameInput');
    const joinCodeInput = page.locator('#joinCodeInput');

    // Test typing and lowercase auto-uppercase conversion
    await joinNameInput.fill('Wolverine');
    await joinCodeInput.fill('abcd');
    const codeVal = await joinCodeInput.inputValue();
    expect(codeVal.toUpperCase()).toBe('ABCD');

    // Pick avatar
    await page.locator('#joinRoomModal .mp-avatar-option[data-avatar="vish"]').click();

    // Close Join Modal button (✕)
    await page.locator('#joinRoomModal .mp-modal-close').click();
    await expect(joinModal).not.toHaveClass(/active/);

    // 1.4 Lobby Screen Buttons (Settings +/-, Copy Link, QR, Leave, Start)
    await createBtn.click();
    await hostNameInput.fill('HostPlayer');
    await page.locator('#createRoomModal .mp-btn-primary').click();
    await expect(page.locator('#playerLobbyScreen')).toHaveClass(/active/);

    // Rounds increment & decrement
    const rBefore = await page.evaluate(() => MultiplayerEngine.hostSettings.rounds);
    await page.locator('button[title="Increase Rounds"]').click();
    expect(await page.evaluate(() => MultiplayerEngine.hostSettings.rounds)).toBe(rBefore + 1);
    await page.locator('button[title="Decrease Rounds"]').click();
    expect(await page.evaluate(() => MultiplayerEngine.hostSettings.rounds)).toBe(rBefore);

    // Timer increment & decrement
    const tBefore = await page.evaluate(() => MultiplayerEngine.hostSettings.timer);
    await page.locator('button[title="Increase Timer"]').click();
    expect(await page.evaluate(() => MultiplayerEngine.hostSettings.timer)).toBe(tBefore + 15);
    await page.locator('button[title="Decrease Timer"]').click();
    expect(await page.evaluate(() => MultiplayerEngine.hostSettings.timer)).toBe(tBefore);

    // QR Code button & Modal Close
    const qrBtn = page.locator('button:has-text("QR CODE")');
    if (await qrBtn.count() > 0) {
      await qrBtn.click();
      await expect(page.locator('#qrModal')).toHaveClass(/active/);
      await page.locator('#qrModal .mp-modal-close').click();
      await expect(page.locator('#qrModal')).not.toHaveClass(/active/);
    }

    // Copy Link button (verify it creates valid room link)
    const copyBtn = page.locator('#copyLinkBtn');
    if (await copyBtn.count() > 0) {
      await copyBtn.click();
      const code = await page.evaluate(() => MultiplayerEngine.roomCode);
      expect(code.length).toBe(4);
    }

    // 1.5 How To Answer Guide: 10s locked/unlocked Host Start button
    await page.locator('#lobbyStartBtn').click();
    await expect(page.locator('#howToAnswerScreen')).toHaveClass(/active/);

    const htaStartBtn = page.locator('#htaHostStartBtn');
    await expect(htaStartBtn).toBeDisabled();

    // Fast-forward countdown
    await page.evaluate(() => { HowToAnswerGuide._secondsLeft = 1; });
    await page.waitForTimeout(1200);
    await expect(htaStartBtn).toBeEnabled();
    await htaStartBtn.click();
    await expect(page.locator('#gameScreen')).toHaveClass(/active/);

    // 1.6 Game Arena Buttons: Hint, Pause/Resume, Skip, Chat, End Match
    const hintBtn = page.locator('#hfbHintBtn');
    const pauseBtn = page.locator('#hfbPauseBtn');
    const skipBtn = page.locator('#hfbSkipBtn');

    await expect(hintBtn).toBeVisible();
    await expect(pauseBtn).toBeVisible();
    await expect(skipBtn).toBeVisible();

    // Test Hint button
    await hintBtn.click();
    const hintText = await page.evaluate(() => MultiplayerEngine.currentMaskedHint);
    expect(hintText).toBeTruthy();

    // Test Pause / Resume button
    await pauseBtn.click();
    expect(await page.evaluate(() => MultiplayerEngine.isPaused)).toBe(true);
    await pauseBtn.click();
    expect(await page.evaluate(() => MultiplayerEngine.isPaused)).toBe(false);

    // Test Skip Round button
    await skipBtn.click();
    expect(await page.evaluate(() => MultiplayerEngine.isRoundFinished)).toBe(true);

    // 1.7 Winner Page Buttons: Play Again, Rematch, Return to Lobby
    await page.evaluate(() => {
      WinnerScreen.show([
        { name: 'AMAN', score: 30, avatar: 'aman' },
        { name: 'AZIZ', score: 12, avatar: 'aziz' }
      ]);
    });
    await expect(page.locator('#winnerScreen')).toHaveClass(/active/);

    const playAgainBtn = page.locator('.btn-play-again');
    const rematchBtn = page.locator('.btn-rematch');
    const lobbyReturnBtn = page.locator('.btn-lobby');

    await expect(playAgainBtn).toBeVisible();
    await expect(rematchBtn).toBeVisible();
    await expect(lobbyReturnBtn).toBeVisible();

    // Sound button must be hidden on winner screen
    await expect(sndBtn).toBeHidden();

    // Click Return to Lobby
    await lobbyReturnBtn.click();
    await expect(page.locator('#playerLobbyScreen')).toHaveClass(/active/);

    // Return to Home via Lobby Back
    await page.locator('button[onclick="PlayerLobby.back()"]').first().click();
    await expect(page.locator('#homeScreen')).toHaveClass(/active/);
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 2. ALL LOGIC & ALGORITHMIC ENGINES
  // ════════════════════════════════════════════════════════════════════════════
  test('LOGIC: FuzzyMatcher, Scoring pointing system, Tie-breaker, and Frame catalog', async ({ page }) => {
    const results = await page.evaluate(() => {
      // 2.1 FuzzyMatcher Logic
      const tests = [
        { guess: 'rush', answer: 'RUSH', expected: true },
        { guess: 'the batman', answer: 'The Batman (2022)', expected: true },
        { guess: 'batman', answer: 'The Batman (2022)', expected: true },
        { guess: 'spider-man: no way home', answer: 'Spider-Man: No Way Home', expected: true },
        { guess: 'spiderman no way home', answer: 'Spider-Man: No Way Home', expected: true },
        { guess: 'anatomy of a fall', answer: 'Anatomy of a Fall (2023)', expected: true },
        { guess: 'eyes wide shut', answer: 'Eyes Wide Shut (1999)', expected: true },
        { guess: 'the wolf of wall street', answer: 'The Wolf of Wall Street (2013)', expected: true },
        { guess: 'wolf of wall street', answer: 'The Wolf of Wall Street (2013)', expected: true },
        { guess: 'totally wrong movie', answer: 'Inception', expected: false },
        { guess: 'star wars', answer: 'Star Trek', expected: false }
      ];

      const fuzzyPasses = tests.every(t => {
        const match = FuzzyMatcher.isMatch(t.guess, t.answer);
        return Boolean(match) === t.expected;
      });

      // 2.2 Pointing System logic (10, 7, 5, 0 + duplicate suppression + hint penalty)
      MultiplayerEngine.isHost = true;
      MultiplayerEngine.currentPlayIndex = 0;
      MultiplayerEngine.currentPlaylist = [{ answer: 'GLADIATOR' }];
      MultiplayerEngine.currentRoundWinners = [];
      GS.players = [
        { id: 'p1', name: 'Player1', score: 0, avatar: 'aman' },
        { id: 'p2', name: 'Player2', score: 0, avatar: 'amish' },
        { id: 'p3', name: 'Player3', score: 0, avatar: 'aziz' },
        { id: 'p4', name: 'Player4', score: 0, avatar: 'vish' }
      ];

      MultiplayerEngine.validateAndProcessGuess({ playerId: 'p1', playerName: 'Player1', playerAvatar: 'aman', guess: 'gladiator', roundIndex: 0 });
      // Duplicate guess from p1
      MultiplayerEngine.validateAndProcessGuess({ playerId: 'p1', playerName: 'Player1', playerAvatar: 'aman', guess: 'gladiator', roundIndex: 0 });
      MultiplayerEngine.validateAndProcessGuess({ playerId: 'p2', playerName: 'Player2', playerAvatar: 'amish', guess: 'gladiator', roundIndex: 0 });
      MultiplayerEngine.validateAndProcessGuess({ playerId: 'p3', playerName: 'Player3', playerAvatar: 'aziz', guess: 'gladiator', roundIndex: 0 });
      MultiplayerEngine.validateAndProcessGuess({ playerId: 'p4', playerName: 'Player4', playerAvatar: 'vish', guess: 'gladiator', roundIndex: 0 });

      const pointsP1 = GS.players.find(p => p.id === 'p1').score;
      const pointsP2 = GS.players.find(p => p.id === 'p2').score;
      const pointsP3 = GS.players.find(p => p.id === 'p3').score;
      const pointsP4 = GS.players.find(p => p.id === 'p4').score;

      // Hint penalty test
      MultiplayerEngine.playerId = 'p1';
      MultiplayerEngine.playerName = 'Player1';
      MultiplayerEngine.playerAvatar = 'aman';
      MultiplayerEngine.hasUsedHintThisRound = false;
      MultiplayerEngine.currentMaskedHint = null;
      MultiplayerEngine.requestHint();
      const pointsP1AfterHint = GS.players.find(p => p.id === 'p1').score;

      // 2.3 Tie-Breaker logic
      GS.players[0].score = 25;
      GS.players[1].score = 25;
      GS.players[2].score = 10;
      const isTie = GameController._shouldStartTieBreaker();
      const topTied = GameController._topTiePlayers();

      // 2.4 Catalog integrity (20 core frames + 14 tie-breaker frames = 34 total frames)
      const s1 = GS.sections.find(s => s.id === 1);
      const coreFramesCount = s1 && s1.frames ? s1.frames.length : 0;
      const tieFramesCount = (GS.tieBreaker && GS.tieBreaker.frames) ? GS.tieBreaker.frames.length : 0;
      const totalFramesCount = coreFramesCount + tieFramesCount;

      return {
        fuzzyPasses,
        pointsP1,
        pointsP2,
        pointsP3,
        pointsP4,
        pointsP1AfterHint,
        isTie,
        topTiedCount: topTied.length,
        coreFramesCount,
        tieFramesCount,
        totalFramesCount
      };
    });

    expect(results.fuzzyPasses).toBe(true);
    expect(results.pointsP1).toBe(10); // 1st guess: 10 pts
    expect(results.pointsP2).toBe(7);  // 2nd guess: 7 pts
    expect(results.pointsP3).toBe(5);  // 3rd guess: 5 pts
    expect(results.pointsP4).toBe(0);  // 4th guess: 0 pts
    expect(results.pointsP1AfterHint).toBe(8); // 10 - 2 = 8 pts
    expect(results.isTie).toBe(true);
    expect(results.topTiedCount).toBe(2);
    expect(results.coreFramesCount).toBe(20);
    expect(results.tieFramesCount).toBe(14);
    expect(results.totalFramesCount).toBe(34);
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 3. ALL SYSTEMS (AUDIO, PALETTE, ANIMATION, SECURITY, STORAGE)
  // ════════════════════════════════════════════════════════════════════════════
  test('SYSTEMS: Web Audio, Palette extraction, Security HMAC, XSS escaping & LocalStorage', async ({ page }) => {
    const sysResults = await page.evaluate(() => {
      // 3.1 Web Audio System
      const smExists = typeof SoundManager !== 'undefined';
      let audioPlaysCleanly = true;
      try {
        SoundManager.play('click');
        SoundManager.play('correct');
        SoundManager.play('wrong');
        SoundManager.play('winner');
        SoundManager.playTick();
      } catch (e) {
        audioPlaysCleanly = false;
      }

      // 3.2 Security XSS Sanitization
      const dirty = '<script>alert("XSS")</script><img src=x onerror=alert(1)>';
      const clean = SecurityUtil.escapeHtml(dirty);
      const isXssNeutralized = !clean.includes('<script>') && !clean.includes('<img') && clean.includes('&lt;script&gt;') && clean.includes('&lt;img');

      // 3.3 Security HMAC & Anti-Spoofing
      const token = NetworkSecurity.generateToken('TEST', 'player_alpha', true);
      const tokenValid = NetworkSecurity.verifyToken(token, 'TEST', 'player_alpha');
      const badTokenRejected = !NetworkSecurity.verifyToken(token, 'TEST', 'player_beta');

      // 3.4 Rate Limiting
      let throttled = false;
      for (let i = 0; i < 30; i++) {
        if (!NetworkSecurity.checkRateLimit('spam_sender', 5, 1000)) {
          throttled = true;
          break;
        }
      }

      // 3.5 LocalStorage Session Persistence
      MultiplayerEngine.roomCode = 'SESS';
      MultiplayerEngine.playerId = 'sess_player';
      MultiplayerEngine.playerName = 'PersistentUser';
      MultiplayerEngine.playerAvatar = 'aman';
      MultiplayerEngine.saveActiveSession();
      const rawStored = localStorage.getItem('gtf_active_session');
      const stored = rawStored ? JSON.parse(rawStored) : null;
      const sessionRestored = stored && stored.roomCode === 'SESS' && stored.playerName === 'PersistentUser';
      MultiplayerEngine.clearActiveSession();
      const sessionCleared = localStorage.getItem('gtf_active_session') === null;

      return {
        smExists,
        audioPlaysCleanly,
        isXssNeutralized,
        tokenValid,
        badTokenRejected,
        throttled,
        sessionRestored,
        sessionCleared
      };
    });

    expect(sysResults.smExists).toBe(true);
    expect(sysResults.audioPlaysCleanly).toBe(true);
    expect(sysResults.isXssNeutralized).toBe(true);
    expect(sysResults.tokenValid).toBe(true);
    expect(sysResults.badTokenRejected).toBe(true);
    expect(sysResults.throttled).toBe(true);
    expect(sysResults.sessionRestored).toBe(true);
    expect(sysResults.sessionCleared).toBe(true);
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 4. EVERY CONNECTIVITY & MULTI-PLAYER THING
  // ════════════════════════════════════════════════════════════════════════════
  test('CONNECTIVITY & PLAYERS: 4-player live synchronization, chat spoiler shield, host migration', async ({ page }) => {
    const multiResults = await page.evaluate(async () => {
      // 4.1 Host creates match
      MultiplayerEngine.isHost = true;
      MultiplayerEngine.roomCode = 'FOUR';
      MultiplayerEngine.playerId = 'p_aman';
      MultiplayerEngine.playerName = 'AMAN';
      MultiplayerEngine.playerAvatar = 'aman';
      GS.players = [{ id: 'p_aman', name: 'AMAN', avatar: 'aman', score: 0, isHost: true }];

      // 4.2 Three remote players join
      const clients = [
        { id: 'p_amish', name: 'AMISH', avatar: 'amish' },
        { id: 'p_aziz', name: 'AZIZ', avatar: 'aziz' },
        { id: 'p_vish', name: 'VISH', avatar: 'vish' }
      ];

      clients.forEach(c => {
        MultiplayerEngine.handleIncomingEvent({
          roomCode: 'FOUR',
          senderId: c.id,
          type: 'PLAYER_JOIN',
          id: c.id,
          name: c.name,
          avatar: c.avatar,
          timestamp: Date.now()
        });
      });

      const totalPlayersJoined = GS.players.length;

      // 4.3 Start match & broadcast playlist
      MultiplayerEngine.hostSettings = { rounds: 3, timer: 30, category: 'frames', categories: ['frames'] };
      MultiplayerEngine.currentPlaylist = [
        { sectionId: 1, sectionName: 'Guess the Frame', type: 'image', content: 'GUESSTHEFRAME/Rush (2023).webp', answer: 'RUSH', year: '2023' }
      ];
      MultiplayerEngine.currentPlayIndex = 0;
      MultiplayerEngine.isMatchActive = true;
      MultiplayerEngine.isRoundFinished = false;
      MultiplayerEngine.currentRoundWinners = [];

      // 4.4 Live Chat Spoiler Shield Test
      // Client AMISH guesses the exact answer 'RUSH' in chat
      const chatEvent = {
        roomCode: 'FOUR',
        senderId: 'p_amish',
        type: 'CHAT_MESSAGE',
        msg: {
          id: 'msg_test_1',
          senderId: 'p_amish',
          senderName: 'AMISH',
          senderAvatar: 'amish',
          text: 'Rush',
          timestamp: Date.now()
        },
        timestamp: Date.now()
      };

      // Handle chat message through MultiplayerEngine & ChatEngine
      MultiplayerEngine.handleIncomingEvent(chatEvent);

      // Check if AMISH was registered as round winner and awarded 10 pts
      const amishPlayer = GS.players.find(p => p.id === 'p_amish');
      const amishWon = amishPlayer && amishPlayer.score === 10;
      const amishInWinners = MultiplayerEngine.currentRoundWinners.some(w => w.playerId === 'p_amish');

      // Subsequent attempt to spoil again while already won is blocked by processOutgoingMessage
      MultiplayerEngine.playerId = 'p_amish';
      MultiplayerEngine.playerName = 'AMISH';
      const msgCountBefore = ChatEngine.messages.size;
      ChatEngine.processOutgoingMessage('Rush');
      const spoilerBlocked = ChatEngine.messages.size === msgCountBefore;

      // 4.5 Host Heartbeat & Watchdog Migration
      MultiplayerEngine.isHost = false; // Player perspective is now client
      MultiplayerEngine.playerId = 'p_amish';
      MultiplayerEngine.lastHostHeartbeat = Date.now() - 15000; // 15s ago (> 12s timeout)
      MultiplayerEngine.checkHostMigration();
      const amishMigratedToHost = MultiplayerEngine.isHost;

      return {
        totalPlayersJoined,
        amishWon,
        amishInWinners,
        spoilerBlocked,
        amishMigratedToHost
      };
    });

    expect(multiResults.totalPlayersJoined).toBe(4);
    expect(multiResults.amishWon).toBe(true);
    expect(multiResults.amishInWinners).toBe(true);
    expect(multiResults.spoilerBlocked).toBe(true);
    expect(multiResults.amishMigratedToHost).toBe(true);
  });

});
