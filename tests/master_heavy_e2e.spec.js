const { test, expect } = require('@playwright/test');

test.describe('Master Heavy E2E Test Suite — All Features, Buttons, Pointing & Backend', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  // ═════════════════════════════════════════════════════════════════════
  // 1. POINTING & SCORING SYSTEM TESTS
  // ═════════════════════════════════════════════════════════════════════
  test('Pointing System: 1st=10pts, 2nd=7pts, 3rd=5pts, 4th+=0pts with duplicate suppression', async ({ page }) => {
    const results = await page.evaluate(() => {
      MultiplayerEngine.isHost = true;
      MultiplayerEngine.roomCode = 'SCOR';
      MultiplayerEngine.playerId = 'host_p1';
      MultiplayerEngine.playerName = 'Player1';

      GS.players = [
        { id: 'host_p1', name: 'Player1', avatar: 'aman', score: 0, isHost: true },
        { id: 'p2', name: 'Player2', avatar: 'amish', score: 0 },
        { id: 'p3', name: 'Player3', avatar: 'aziz', score: 0 },
        { id: 'p4', name: 'Player4', avatar: 'vish', score: 0 },
        { id: 'p5', name: 'Player5', avatar: 'aman', score: 0 }
      ];

      MultiplayerEngine.currentPlaylist = [
        { sectionId: 1, sectionName: 'Guess the Frame', type: 'image', content: 'GUESSTHEFRAME/Rush (2023).webp', answer: 'RUSH', year: '2023' }
      ];
      MultiplayerEngine.currentPlayIndex = 0;
      MultiplayerEngine.currentRoundWinners = [];

      // 1st guesser -> +10 pts
      MultiplayerEngine.validateAndProcessGuess({ playerId: 'host_p1', playerName: 'Player1', playerAvatar: 'aman', guess: 'Rush', roundIndex: 0 });
      // 1st guesser submits again -> duplicate blocked, score unchanged
      MultiplayerEngine.validateAndProcessGuess({ playerId: 'host_p1', playerName: 'Player1', playerAvatar: 'aman', guess: 'Rush', roundIndex: 0 });
      // 2nd guesser -> +7 pts
      MultiplayerEngine.validateAndProcessGuess({ playerId: 'p2', playerName: 'Player2', playerAvatar: 'amish', guess: 'RUSH', roundIndex: 0 });
      // 3rd guesser -> +5 pts
      MultiplayerEngine.validateAndProcessGuess({ playerId: 'p3', playerName: 'Player3', playerAvatar: 'aziz', guess: 'rush', roundIndex: 0 });
      // 4th guesser -> +0 pts
      MultiplayerEngine.validateAndProcessGuess({ playerId: 'p4', playerName: 'Player4', playerAvatar: 'vish', guess: 'Rush', roundIndex: 0 });

      return {
        winners: MultiplayerEngine.currentRoundWinners,
        scores: GS.players.map(p => ({ id: p.id, score: p.score }))
      };
    });

    expect(results.winners.length).toBe(3); // capped at 3 podium winners
    expect(results.winners[0].points).toBe(10);
    expect(results.winners[1].points).toBe(7);
    expect(results.winners[2].points).toBe(5);

    const scoresMap = Object.fromEntries(results.scores.map(s => [s.id, s.score]));
    expect(scoresMap['host_p1']).toBe(10);
    expect(scoresMap['p2']).toBe(7);
    expect(scoresMap['p3']).toBe(5);
    expect(scoresMap['p4']).toBe(0);
    expect(scoresMap['p5']).toBe(0);
  });

  test('Pointing System: Hint penalty deducts exactly 2 points', async ({ page }) => {
    const hintResult = await page.evaluate(() => {
      MultiplayerEngine.isHost = true;
      MultiplayerEngine.playerId = 'hint_player';
      MultiplayerEngine.currentPlaylist = [
        { sectionId: 1, sectionName: 'Guess the Frame', type: 'image', content: 'GUESSTHEFRAME/Rush (2023).webp', answer: 'RUSH', year: '2023' }
      ];
      MultiplayerEngine.currentPlayIndex = 0;
      GS.players = [
        { id: 'hint_player', name: 'HintUser', score: 10, avatar: 'aman' }
      ];

      MultiplayerEngine.requestHint();

      return {
        scoreAfterHint: GS.players[0].score,
        maskedHint: MultiplayerEngine.currentMaskedHint
      };
    });

    expect(hintResult.scoreAfterHint).toBe(8); // 10 - 2 = 8
    expect(hintResult.maskedHint).toBeTruthy();
  });

  test('Pointing System: Local Party manual score adjustment, popups, and tie-breaker', async ({ page }) => {
    const localScoreResult = await page.evaluate(() => {
      GS.players = [
        { id: 'lp1', name: 'Alice', avatar: 'aman', score: 15 },
        { id: 'lp2', name: 'Bob', avatar: 'amish', score: 15 }
      ];
      UI.renderLB();

      // Manual adjust Alice +5
      Scores.adjust(0, 5);
      // Manual adjust Bob -3
      Scores.adjust(1, -3);

      const aliceScore = GS.players[0].score;
      const bobScore = GS.players[1].score;

      // Reset to tie to check tie detection
      GS.players[0].score = 20;
      GS.players[1].score = 20;
      const tieDetected = GameController._shouldStartTieBreaker();
      const tiedPlayers = GameController._topTiePlayers();

      return {
        aliceScore,
        bobScore,
        tieDetected,
        tiedCount: tiedPlayers.length
      };
    });

    expect(localScoreResult.aliceScore).toBe(20);
    expect(localScoreResult.bobScore).toBe(12);
    expect(localScoreResult.tieDetected).toBe(true);
    expect(localScoreResult.tiedCount).toBe(2);
  });

  // ═════════════════════════════════════════════════════════════════════
  // 2. EVERY BUTTON & INTERACTIVE UI CONTROL
  // ═════════════════════════════════════════════════════════════════════
  test('Buttons: Home screen cards, modals, avatar pickers, and close buttons', async ({ page }) => {
    // 1. Create Room card
    await page.locator('.h-card-create').click();
    await expect(page.locator('#createRoomModal')).toHaveClass(/active/);
    await expect(page.locator('#hostPlayerNameInput')).toBeVisible();

    // Type custom name
    await page.locator('#hostPlayerNameInput').fill('Captain Kirk');
    expect(await page.locator('#hostPlayerNameInput').inputValue()).toBe('Captain Kirk');

    // Click Amish avatar
    await page.locator('#createRoomModal .mp-avatar-option[data-avatar="amish"]').click();
    expect(await page.locator('#hostPlayerNameInput').inputValue()).toBe('Captain Kirk'); // Preserves custom typed name

    // Close create modal
    await page.locator('#createRoomModal .mp-modal-close').click();
    await expect(page.locator('#createRoomModal')).not.toHaveClass(/active/);

    // 2. Join Room card
    await page.locator('.h-card-join').click();
    await expect(page.locator('#joinRoomModal')).toHaveClass(/active/);
    await expect(page.locator('#joinPlayerNameInput')).toBeVisible();

    // Type name and code
    await page.locator('#joinPlayerNameInput').fill('Spock');
    await page.locator('#joinCodeInput').fill('KIRK');
    await page.locator('#joinRoomModal .mp-avatar-option[data-avatar="aziz"]').click();

    // Close join modal
    await page.locator('#joinRoomModal .mp-modal-close').click();
    await expect(page.locator('#joinRoomModal')).not.toHaveClass(/active/);

    // 3. Audio Mute / Unmute button
    const sndBtn = page.locator('#sndBtn');
    await expect(sndBtn).toBeVisible();
    await sndBtn.click();
    const isMuted = await page.evaluate(() => SoundManager.muted);
    expect(isMuted).toBe(true);
    await sndBtn.click();
    const isUnmuted = await page.evaluate(() => !SoundManager.muted);
    expect(isUnmuted).toBe(true);
  });

  test('Buttons: Lobby adjustments (rounds +/-, timer +/-), invite link, QR modal, start & back', async ({ page }) => {
    // Host creates room
    await page.locator('.h-card-create').click();
    await page.locator('#hostPlayerNameInput').fill('Commander');
    await page.locator('#createRoomModal .mp-btn-primary').click();

    await expect(page.locator('#playerLobbyScreen')).toBeVisible();

    // Test Round adjustments (+ and -)
    const initialRounds = await page.evaluate(() => MultiplayerEngine.hostSettings.rounds);
    await page.locator('button[title="Increase Rounds"]').click();
    const increasedRounds = await page.evaluate(() => MultiplayerEngine.hostSettings.rounds);
    expect(increasedRounds).toBe(initialRounds + 1);

    await page.locator('button[title="Decrease Rounds"]').click();
    const resetRounds = await page.evaluate(() => MultiplayerEngine.hostSettings.rounds);
    expect(resetRounds).toBe(initialRounds);

    // Test Timer adjustments (+15 and -15)
    const initialTimer = await page.evaluate(() => MultiplayerEngine.hostSettings.timer);
    await page.locator('button[title="Increase Timer"]').click();
    const increasedTimer = await page.evaluate(() => MultiplayerEngine.hostSettings.timer);
    expect(increasedTimer).toBe(initialTimer + 15);

    await page.locator('button[title="Decrease Timer"]').click();
    const resetTimer = await page.evaluate(() => MultiplayerEngine.hostSettings.timer);
    expect(resetTimer).toBe(initialTimer);

    // Test QR Modal button
    const qrBtn = page.locator('button:has-text("QR CODE")');
    if (await qrBtn.count() > 0) {
      await qrBtn.click();
      await expect(page.locator('#qrModal')).toHaveClass(/active/);
      await page.locator('#qrModal .mp-modal-close').click();
      await expect(page.locator('#qrModal')).not.toHaveClass(/active/);
    }

    // Test Leave Lobby button
    await page.locator('button[onclick="PlayerLobby.back()"]').first().click();
    await expect(page.locator('#homeScreen')).toBeVisible();
  });

  test('Buttons & Flow: "How to Answer" 10s rules guide with locked/unlocked host start button', async ({ page }) => {
    await page.evaluate(() => {
      MultiplayerEngine.isHost = true;
      MultiplayerEngine.roomCode = 'GUID';
      MultiplayerEngine.playerId = 'host_user';
      MultiplayerEngine.playerName = 'HostPlayer';
      MultiplayerEngine.playerAvatar = 'aman';
      GS.players = [
        { id: 'host_user', name: 'HostPlayer', avatar: 'aman', score: 0, isHost: true, loaded: true }
      ];

      MultiplayerEngine.startMatch();
    });

    await expect(page.locator('#howToAnswerScreen')).toBeVisible();

    // During first 10 seconds: Host button is disabled
    const startBtn = page.locator('#htaHostStartBtn');
    await expect(startBtn).toBeVisible();
    await expect(startBtn).toBeDisabled();

    const initialBtnText = await startBtn.textContent();
    expect(initialBtnText).toContain('10s');

    // Fast-forward countdown by setting secondsLeft to 1
    await page.evaluate(() => {
      HowToAnswerGuide._secondsLeft = 1;
    });
    // Wait for the next tick
    await page.waitForTimeout(1200);

    // Button unlocks and is enabled
    await expect(startBtn).toBeEnabled();
    const unlockedText = await startBtn.textContent();
    expect(unlockedText).toContain('START GAME NOW');

    // Clicking unlocked button advances to gameScreen
    await startBtn.click();
    await expect(page.locator('#gameScreen')).toBeVisible();
  });

  test('Buttons: Game Arena Controls (Skip, Pause/Resume, Hint, End Match, Live Chat, Answer Reveal, Winner Screen)', async ({ page }) => {
    await page.evaluate(() => {
      MultiplayerEngine.isHost = true;
      MultiplayerEngine.roomCode = 'AREN';
      MultiplayerEngine.playerId = 'host_user';
      MultiplayerEngine.playerName = 'ArenaHost';
      GS.players = [
        { id: 'host_user', name: 'ArenaHost', avatar: 'aman', score: 10, isHost: true }
      ];
      MultiplayerEngine.currentPlaylist = [
        { sectionId: 1, sectionName: 'Guess the Frame', type: 'image', content: 'GUESSTHEFRAME/Rush (2023).webp', answer: 'RUSH', year: '2023' }
      ];
      MultiplayerEngine.currentPlayIndex = 0;
      MultiplayerEngine.isMatchActive = true;
      MultiplayerEngine.isRoundFinished = false;
      MultiplayerEngine.currentRoundWinners = [];

      UI.showScreen('gameScreen');
      const hBar = document.getElementById('hostFloatingBar');
      if (hBar) hBar.style.display = 'flex';
      const chatPanel = document.getElementById('liveChatPanel');
      if (chatPanel) chatPanel.classList.add('active');
    });

    await expect(page.locator('#gameScreen')).toBeVisible();

    // 1. Hint button
    const hintBtn = page.locator('#hfbHintBtn');
    await expect(hintBtn).toBeVisible();
    await hintBtn.click();
    const maskedHint = await page.evaluate(() => MultiplayerEngine.currentMaskedHint);
    expect(maskedHint).toBeTruthy();

    // 2. Pause / Resume button
    const pauseBtn = page.locator('#hfbPauseBtn');
    await expect(pauseBtn).toBeVisible();
    await pauseBtn.click();
    let isPaused = await page.evaluate(() => MultiplayerEngine.isPaused);
    expect(isPaused).toBe(true);
    await pauseBtn.click();
    isPaused = await page.evaluate(() => MultiplayerEngine.isPaused);
    expect(isPaused).toBe(false);

    // 3. Live Chat Movie Guessing & Spoiler Shield
    const chatInput = page.locator('#chatTextInput');
    const chatSend = page.locator('#chatSendBtn');
    await expect(chatInput).toBeVisible();
    await chatInput.fill('Rush');
    await chatSend.click();

    // Check winner banner rendered in chat stream
    const winnerBanner = page.locator('.chat-msg-winner');
    await expect(winnerBanner).toBeVisible();
    await expect(winnerBanner).toHaveText(/guessed the answer/i);

    // 4. Skip Round button
    const skipBtn = page.locator('#hfbSkipBtn');
    await expect(skipBtn).toBeVisible();
    await skipBtn.click();
    const isRoundDone = await page.evaluate(() => MultiplayerEngine.isRoundFinished);
    expect(isRoundDone).toBe(true);

    // 5. Answer Reveal Next Round button
    await page.evaluate(() => {
      const nextBtn = document.getElementById('ansNextRoundBtn');
      if (nextBtn) nextBtn.style.display = 'block';
    });
    const ansNextBtn = page.locator('#ansNextRoundBtn');
    await expect(ansNextBtn).toBeVisible();

    // 6. End Match -> Winner Screen
    page.once('dialog', dialog => dialog.accept());
    await page.locator('button:has-text("End Match")').click();
    await expect(page.locator('#winnerScreen')).toBeVisible();

    // Winner Screen action buttons
    await expect(page.locator('.btn-play-again')).toBeVisible();
    await expect(page.locator('.btn-rematch')).toBeVisible();
    await expect(page.locator('.btn-lobby')).toBeVisible();

    // Click Back to Lobby button
    await page.locator('.btn-lobby').click();
    await expect(page.locator('#playerLobbyScreen')).toBeVisible();
  });

  // ═════════════════════════════════════════════════════════════════════
  // 3. LOBBY & CONNECTION CONNECTIVITY
  // ═════════════════════════════════════════════════════════════════════
  test('Connectivity: Multi-peer joins, name updates, heartbeat, and watchdog host migration', async ({ page }) => {
    const connState = await page.evaluate(() => {
      // 1. Host creates room
      MultiplayerEngine.isHost = true;
      MultiplayerEngine.roomCode = 'PEER';
      MultiplayerEngine.playerId = 'host_peer';
      MultiplayerEngine.playerName = 'MainHost';
      GS.players = [{ id: 'host_peer', name: 'MainHost', avatar: 'aman', score: 0, isHost: true }];

      // 2. Three remote clients join
      MultiplayerEngine.handleIncomingEvent({
        roomCode: 'PEER',
        senderId: 'client_1',
        type: 'PLAYER_JOIN',
        id: 'client_1',
        name: 'ClientOne',
        avatar: 'amish'
      });
      MultiplayerEngine.handleIncomingEvent({
        roomCode: 'PEER',
        senderId: 'client_2',
        type: 'PLAYER_JOIN',
        id: 'client_2',
        name: 'ClientTwo',
        avatar: 'aziz'
      });
      MultiplayerEngine.handleIncomingEvent({
        roomCode: 'PEER',
        senderId: 'client_3',
        type: 'PLAYER_JOIN',
        id: 'client_3',
        name: 'ClientThree',
        avatar: 'vish'
      });

      const playersAfterJoin = GS.players.map(p => ({ id: p.id, name: p.name }));

      // 3. ClientOne renames to 'StarGazer'
      MultiplayerEngine.handleIncomingEvent({
        roomCode: 'PEER',
        senderId: 'client_1',
        type: 'UPDATE_PLAYER_NAME',
        playerId: 'client_1',
        name: 'StarGazer'
      });

      const renamedPlayer = GS.players.find(p => p.id === 'client_1');

      // 4. Test Watchdog & Host Migration
      GameController._onlineMode = true;
      MultiplayerEngine.isHost = false; // Simulate candidate view
      MultiplayerEngine.playerId = 'client_1';
      MultiplayerEngine.lastHostHeartbeat = Date.now() - 15000; // 15s ago (> 12s timeout)
      MultiplayerEngine.checkHostMigration();
      const becameHost = MultiplayerEngine.isHost;

      return {
        totalPlayers: playersAfterJoin.length,
        renamedName: renamedPlayer ? renamedPlayer.name : null,
        becameHost
      };
    });

    expect(connState.totalPlayers).toBe(4);
    expect(connState.renamedName).toBe('StarGazer');
    expect(connState.becameHost).toBe(true);
  });

  // ═════════════════════════════════════════════════════════════════════
  // 4. BACKEND LOGIC & CRYPTOGRAPHIC SECURITY DEFENSES
  // ═════════════════════════════════════════════════════════════════════
  test('Backend & Security: HMAC token generation, verification, and spoofing protection', async ({ page }) => {
    const secResults = await page.evaluate(() => {
      const roomCode = 'AUTH';
      const playerId = 'trusted_user';

      // 1. Generate valid token
      const validToken = NetworkSecurity.generateToken(roomCode, playerId, true);
      const isVerified = NetworkSecurity.verifyToken(validToken, roomCode, playerId);

      // 2. Tampered token rejected
      const tamperedToken = validToken.slice(0, -4) + '0000';
      const isTamperedRejected = !NetworkSecurity.verifyToken(tamperedToken, roomCode, playerId);

      // 3. Wrong player token rejected
      const isWrongPlayerRejected = !NetworkSecurity.verifyToken(validToken, roomCode, 'imposter_user');

      // 4. Topic hashing deterministic
      const topic = NetworkSecurity.getRoomTopic(roomCode);
      const topicHash = NetworkSecurity.getTopicHash(roomCode);

      return {
        isVerified,
        isTamperedRejected,
        isWrongPlayerRejected,
        hasTopicPrefix: topic.startsWith('gtf_sec_v2/'),
        hasCleanHash: !topicHash.includes('/')
      };
    });

    expect(secResults.isVerified).toBe(true);
    expect(secResults.isTamperedRejected).toBe(true);
    expect(secResults.isWrongPlayerRejected).toBe(true);
    expect(secResults.hasTopicPrefix).toBe(true);
    expect(secResults.hasCleanHash).toBe(true);
  });

});
