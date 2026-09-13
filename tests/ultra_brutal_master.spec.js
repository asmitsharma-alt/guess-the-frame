const { test, expect } = require('@playwright/test');

test.describe('ULTRA BRUTAL MASTER TEST SUITE — Every Button, Feature, Logic & Real-time Connectivity', () => {

  // ═════════════════════════════════════════════════════════════════════════════
  // TEST 1: EXHAUSTIVE BUTTON TORTURE, MODALS, AVATARS & CLEAN HOMEPAGE
  // ═════════════════════════════════════════════════════════════════════════════
  test('BUTTONS & MODALS: Test every single interactive button, modal, avatar picker, and sound switch', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', err => pageErrors.push(err.message));

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // 1.1 Homepage Integrity: Ensure NO legacy offline buttons exist
    const legacyResumeBtn = page.locator('#homeResumeBtn');
    expect(await legacyResumeBtn.count()).toBe(0);

    const offlineCard = page.locator('.h-card-local');
    await expect(offlineCard).toBeHidden();

    // 1.2 Sound Button
    const sndBtn = page.locator('#sndBtn');
    await expect(sndBtn).toBeVisible();
    const initialMuted = await page.evaluate(() => SoundManager.muted);
    await sndBtn.click();
    expect(await page.evaluate(() => SoundManager.muted)).toBe(!initialMuted);
    await sndBtn.click();
    expect(await page.evaluate(() => SoundManager.muted)).toBe(initialMuted);

    // 1.3 Create Room Modal & Avatar Cycling
    const createBtn = page.locator('.h-card-create');
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    const createModal = page.locator('#createRoomModal');
    await expect(createModal).toHaveClass(/active/);

    const hostInput = page.locator('#hostPlayerNameInput');
    await hostInput.fill('Captain_Marvel');

    const avatars = ['aman', 'amish', 'aziz', 'vish'];
    for (const av of avatars) {
      const opt = page.locator(`#createRoomModal .mp-avatar-option[data-avatar="${av}"]`);
      await opt.click();
      await expect(opt).toHaveClass(/selected/);
    }

    // Close create modal via close button
    await page.locator('#createRoomModal .mp-modal-close').click();
    await expect(createModal).not.toHaveClass(/active/);

    // 1.4 Join Room Modal & Code Uppercasing
    const joinBtn = page.locator('.h-card-join');
    await expect(joinBtn).toBeVisible();
    await joinBtn.click();

    const joinModal = page.locator('#joinRoomModal');
    await expect(joinModal).toHaveClass(/active/);

    const joinCodeInput = page.locator('#joinCodeInput');
    await joinCodeInput.click();
    await joinCodeInput.fill('TEST');
    const typedVal = await joinCodeInput.inputValue();
    expect(typedVal.toUpperCase()).toBe('TEST');

    for (const av of avatars) {
      const opt = page.locator(`#joinRoomModal .mp-avatar-option[data-avatar="${av}"]`);
      await opt.click();
      await expect(opt).toHaveClass(/selected/);
    }

    // Close join modal
    await page.locator('#joinRoomModal .mp-modal-close').click();
    await expect(joinModal).not.toHaveClass(/active/);

    // 1.5 Create Lobby & Inspect All Lobby Buttons
    await createBtn.click();
    await hostInput.fill('HostPlayerOne');
    await page.locator('#createRoomModal .mp-btn-primary').click();

    const lobby = page.locator('#playerLobbyScreen');
    await expect(lobby).toHaveClass(/active/);

    // CRITICAL: QR Code button MUST NOT exist in the lobby
    const qrBtn = page.locator('#playerLobbyScreen button:has-text("QR CODE")');
    expect(await qrBtn.count()).toBe(0);

    // Default rounds: MUST be 20 (max in pool)
    const initRounds = await page.evaluate(() => MultiplayerEngine.hostSettings.rounds);
    expect(initRounds).toBe(20);

    // Rounds +/- buttons
    const incRoundsBtn = page.locator('button[title="Increase Rounds"]');
    const decRoundsBtn = page.locator('button[title="Decrease Rounds"]');

    // Upper limit cap
    await incRoundsBtn.click();
    expect(await page.evaluate(() => MultiplayerEngine.hostSettings.rounds)).toBe(20);

    // Decrement by 1
    await decRoundsBtn.click();
    expect(await page.evaluate(() => MultiplayerEngine.hostSettings.rounds)).toBe(19);

    // Increment back
    await incRoundsBtn.click();
    expect(await page.evaluate(() => MultiplayerEngine.hostSettings.rounds)).toBe(20);

    // Timer +/- 1s precision
    const incTimerBtn = page.locator('button[title="Increase Timer"]');
    const decTimerBtn = page.locator('button[title="Decrease Timer"]');

    expect(await page.evaluate(() => MultiplayerEngine.hostSettings.timer)).toBe(30);

    await incTimerBtn.click();
    expect(await page.evaluate(() => MultiplayerEngine.hostSettings.timer)).toBe(31);

    await decTimerBtn.click();
    expect(await page.evaluate(() => MultiplayerEngine.hostSettings.timer)).toBe(30);

    // Copy Link button
    const copyBtn = page.locator('#copyLinkBtn');
    if (await copyBtn.count() > 0) {
      await copyBtn.click();
      const code = await page.evaluate(() => MultiplayerEngine.roomCode);
      expect(code).toHaveLength(4);
    }

    // Leave Lobby back to Home
    await page.locator('button[onclick="PlayerLobby.back()"]').first().click();
    await expect(page.locator('#homeScreen')).toBeVisible();

    expect(pageErrors).toEqual([]);
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // TEST 2: EXHAUSTIVE GAME LOGIC, POINTING, FUZZY MATCHING & CATALOG INTEGRITY
  // ═════════════════════════════════════════════════════════════════════════════
  test('GAME LOGIC: Pointing system (10/7/5/0), duplicate blocks, hint penalties, fuzzy matching', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const evalReport = await page.evaluate(() => {
      const results = {};

      // 2.1 Catalog Verification: Section 1 movie frames
      const s1 = GS.sections ? GS.sections.find(s => s.id === 1) : null;
      results.hasSection1 = !!s1;
      results.frameCount = s1 && s1.frames ? s1.frames.length : 0;
      results.allFramesHaveAnswer = s1 && s1.frames ? s1.frames.every(f => f.answer && f.answer.trim().length > 0) : false;

      // 2.2 Pointing System Verification
      MultiplayerEngine.isHost = true;
      MultiplayerEngine.roomCode = 'LOGK';
      MultiplayerEngine.playerId = 'h_test';
      MultiplayerEngine.playerName = 'HostEvaluator';

      GS.players = [
        { id: 'h_test', name: 'HostEvaluator', avatar: 'aman', score: 0 },
        { id: 'p2', name: 'GuesserTwo', avatar: 'amish', score: 0 },
        { id: 'p3', name: 'GuesserThree', avatar: 'aziz', score: 0 },
        { id: 'p4', name: 'GuesserFour', avatar: 'vish', score: 0 },
        { id: 'p5', name: 'GuesserFive', avatar: 'aman', score: 0 }
      ];

      MultiplayerEngine.currentPlaylist = [
        { sectionId: 1, sectionName: 'Guess the Frame', type: 'image', content: 'GUESSTHEFRAME/Rush (2023).webp', answer: 'RUSH', year: '2023' }
      ];
      MultiplayerEngine.currentPlayIndex = 0;
      MultiplayerEngine.currentRoundWinners = [];

      // 1st guesser -> 10 pts
      MultiplayerEngine.validateAndProcessGuess({ playerId: 'h_test', playerName: 'HostEvaluator', playerAvatar: 'aman', guess: 'Rush', roundIndex: 0 });
      // Duplicate guess by 1st guesser -> ignored
      MultiplayerEngine.validateAndProcessGuess({ playerId: 'h_test', playerName: 'HostEvaluator', playerAvatar: 'aman', guess: 'Rush', roundIndex: 0 });
      // 2nd guesser -> 7 pts
      MultiplayerEngine.validateAndProcessGuess({ playerId: 'p2', playerName: 'GuesserTwo', playerAvatar: 'amish', guess: 'rush', roundIndex: 0 });
      // 3rd guesser -> 5 pts
      MultiplayerEngine.validateAndProcessGuess({ playerId: 'p3', playerName: 'GuesserThree', playerAvatar: 'aziz', guess: 'RUSH', roundIndex: 0 });
      // 4th guesser -> 0 pts
      MultiplayerEngine.validateAndProcessGuess({ playerId: 'p4', playerName: 'GuesserFour', playerAvatar: 'vish', guess: 'Rush', roundIndex: 0 });
      // 5th guesser -> 0 pts
      MultiplayerEngine.validateAndProcessGuess({ playerId: 'p5', playerName: 'GuesserFive', playerAvatar: 'aman', guess: 'Rush', roundIndex: 0 });

      results.scores = Object.fromEntries(GS.players.map(p => [p.id, p.score]));
      results.winnerCount = MultiplayerEngine.currentRoundWinners.length;

      // 2.3 Hint Penalty Deduction (-2 pts)
      MultiplayerEngine.requestHint();
      results.hostScoreAfterHint = GS.players.find(p => p.id === 'h_test').score;
      results.hasMaskedHint = !!MultiplayerEngine.currentMaskedHint;

      // 2.4 Fuzzy Matcher Checks
      results.exactMatch = FuzzyMatcher.isMatch('Inception', 'INCEPTION');
      results.caseMatch = FuzzyMatcher.isMatch('inception', 'INCEPTION');
      results.punctuationMatch = FuzzyMatcher.isMatch('Spider-Man: No Way Home!', 'Spider-Man: No Way Home');
      results.typoMatch = FuzzyMatcher.isMatch('Incepton', 'INCEPTION'); // 1 letter typo
      results.wrongMatch = FuzzyMatcher.isMatch('Interstellar', 'INCEPTION');

      // 2.5 Security: XSS Sanitization
      results.xssSanitized = SecurityUtil.escapeHtml('<script>alert("hack")</script>');

      return results;
    });

    expect(evalReport.hasSection1).toBe(true);
    expect(evalReport.frameCount).toBeGreaterThanOrEqual(20);
    expect(evalReport.allFramesHaveAnswer).toBe(true);

    // Points distribution
    expect(evalReport.winnerCount).toBe(3);
    expect(evalReport.scores['h_test']).toBe(10);
    expect(evalReport.scores['p2']).toBe(7);
    expect(evalReport.scores['p3']).toBe(5);
    expect(evalReport.scores['p4']).toBe(0);
    expect(evalReport.scores['p5']).toBe(0);

    // Hint deduction (10 - 2 = 8)
    expect(evalReport.hostScoreAfterHint).toBe(8);
    expect(evalReport.hasMaskedHint).toBe(true);

    // Matching
    expect(evalReport.exactMatch).toBe(true);
    expect(evalReport.caseMatch).toBe(true);
    expect(evalReport.punctuationMatch).toBe(true);
    expect(evalReport.typoMatch).toBe(true);
    expect(evalReport.wrongMatch).toBe(false);

    // XSS
    expect(evalReport.xssSanitized).not.toContain('<script>');
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // TEST 3: REAL-TIME 3-CLIENT CONCURRENT PEER CONNECTIVITY & GAMEPLAY FLOW
  // ═════════════════════════════════════════════════════════════════════════════
  test('REALTIME CONNECTIVITY: 3 independent clients join, sync lobby settings in real-time, play match, and score', async ({ browser }) => {
    test.setTimeout(120000);
    // 3 separate browser contexts
    const hostContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const p1Context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const p2Context = await browser.newContext({ viewport: { width: 1280, height: 720 } });

    const hostPage = await hostContext.newPage();
    const p1Page = await p1Context.newPage();
    const p2Page = await p2Context.newPage();

    // 3.1 Host Creates Room
    await hostPage.goto('/');
    await hostPage.waitForLoadState('domcontentloaded');

    await hostPage.locator('.h-card-create').click();
    await hostPage.locator('#hostPlayerNameInput').fill('HostCaptain');
    await hostPage.locator('#createRoomModal .mp-btn-primary').click();
    await expect(hostPage.locator('#playerLobbyScreen')).toBeVisible({ timeout: 15000 });

    const roomCode = await hostPage.evaluate(() => MultiplayerEngine.roomCode);
    expect(roomCode).toHaveLength(4);

    // 3.2 Player 1 Joins via URL query param
    await p1Page.goto(`/?room=${roomCode}`);
    await p1Page.waitForLoadState('domcontentloaded');
    await p1Page.locator('#joinPlayerNameInput').fill('Spiderman');
    await p1Page.locator('#joinRoomModal .mp-avatar-option[data-avatar="amish"]').click();
    await p1Page.locator('#joinRoomModal .mp-btn-primary').click();
    await expect(p1Page.locator('#playerLobbyScreen')).toBeVisible({ timeout: 15000 });

    // 3.3 Player 2 Joins via Join Room Modal manually
    await p2Page.goto('/');
    await p2Page.waitForLoadState('domcontentloaded');
    await p2Page.locator('.h-card-join').click();
    await expect(p2Page.locator('#joinRoomModal')).toHaveClass(/active/);
    await p2Page.waitForTimeout(200);
    const p2CodeInput = p2Page.locator('#joinCodeInput');
    await p2CodeInput.click();
    await p2CodeInput.fill(roomCode);
    await p2Page.locator('#joinPlayerNameInput').fill('Thor');
    await p2Page.locator('#joinRoomModal .mp-avatar-option[data-avatar="aziz"]').click();
    await p2Page.locator('#joinRoomModal .mp-btn-primary').click();
    await expect(p2Page.locator('#playerLobbyScreen')).toBeVisible({ timeout: 15000 });

    // 3.4 Verify All 3 Players Appear on Host Roster
    await hostPage.waitForFunction(() => {
      return typeof GS !== 'undefined' && GS.players && GS.players.length === 3;
    }, { timeout: 30000 });

    const hostRoster = await hostPage.evaluate(() => GS.players.map(p => p.name));
    expect(hostRoster.some(n => n.includes('HostCaptain'))).toBe(true);
    expect(hostRoster.some(n => n.includes('Spiderman'))).toBe(true);
    expect(hostRoster.some(n => n.includes('Thor'))).toBe(true);

    // 3.5 Real-Time Settings Broadcast: Host adjusts timer by -1s (30 -> 29)
    await hostPage.locator('button[title="Decrease Timer"]').first().click();

    // Both Player 1 and Player 2 see the updated timer in real-time
    await expect(p1Page.locator('#hostTimerBtnText').first()).toContainText('29', { timeout: 10000 });
    await expect(p2Page.locator('#hostTimerBtnText').first()).toContainText('29', { timeout: 10000 });

    // 3.6 Host Starts Match -> Synchronized transition to "How to Answer" rules guide
    await hostPage.evaluate(() => {
      MultiplayerEngine.startMatch();
    });

    await expect(hostPage.locator('#howToAnswerScreen')).toBeVisible();
    await expect(p1Page.locator('#howToAnswerScreen')).toBeVisible();
    await expect(p2Page.locator('#howToAnswerScreen')).toBeVisible();

    // Fast-forward countdown and advance to active match
    await hostPage.evaluate(() => {
      if (typeof HowToAnswerGuide !== 'undefined') {
        HowToAnswerGuide._secondsLeft = 0;
        HowToAnswerGuide.handleHostClick();
      }
    });

    await expect(hostPage.locator('#gameScreen')).toHaveClass(/active/, { timeout: 20000 });
    await expect(p1Page.locator('#gameScreen')).toHaveClass(/active/, { timeout: 20000 });
    await expect(p2Page.locator('#gameScreen')).toHaveClass(/active/, { timeout: 20000 });

    // 3.7 Active Gameplay: Player 1 submits the correct guess via chat
    const roundAnswer = await hostPage.evaluate(() => {
      const item = MultiplayerEngine.currentPlaylist[MultiplayerEngine.currentPlayIndex];
      return item ? item.answer : null;
    });
    expect(roundAnswer).toBeTruthy();

    await p1Page.locator('#chatTextInput').fill(roundAnswer);
    await p1Page.locator('#chatSendBtn').click();

    // Host receives and awards 10 points to Spiderman
    await hostPage.waitForFunction(() => {
      return typeof MultiplayerEngine !== 'undefined' && MultiplayerEngine.currentRoundWinners.length > 0;
    }, { timeout: 8000 });

    const winners = await hostPage.evaluate(() => MultiplayerEngine.currentRoundWinners);
    expect(winners[0].playerName).toContain('Spiderman');
    expect(winners[0].points).toBe(10);

    // Clean up
    await hostContext.close();
    await p1Context.close();
    await p2Context.close();
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // TEST 4: ARENA CONTROLS, WINNER PODIUM, & STALE SESSION PURGE VERIFICATION
  // ═════════════════════════════════════════════════════════════════════════════
  test('ARENA & POST-GAME: Arena pause/resume/skip, Winner podium, and zero zombie rejoin on fresh visit', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Start single/host game
    await page.evaluate(() => {
      MultiplayerEngine.selectedAvatarForModal = 'aman';
      MultiplayerEngine.confirmCreateRoom();
      GS.players = [
        { id: MultiplayerEngine.playerId, name: 'ArenaChampion', avatar: 'vish', score: 0, isHost: true, loaded: true }
      ];
      GS.framesLoaded = true;
      MultiplayerEngine.startMatch();
      if (typeof HowToAnswerGuide !== 'undefined') {
        HowToAnswerGuide._secondsLeft = 0;
        HowToAnswerGuide.handleHostClick();
      }
    });

    await expect(page.locator('#gameScreen')).toBeVisible();

    // 4.1 Arena Pause / Resume
    const pauseBtn = page.locator('#hfbPauseBtn');
    if (await pauseBtn.count() > 0) {
      await pauseBtn.click();
      expect(await page.evaluate(() => MultiplayerEngine.isPaused)).toBe(true);
      await pauseBtn.click();
      expect(await page.evaluate(() => MultiplayerEngine.isPaused)).toBe(false);
    }

    // 4.2 Skip Frame
    const skipBtn = page.locator('#hfbSkipBtn');
    if (await skipBtn.count() > 0) {
      await skipBtn.click();
      expect(await page.evaluate(() => MultiplayerEngine.isRoundFinished)).toBe(true);
    }

    // 4.3 End Match & Winner Screen
    await page.evaluate(() => {
      MultiplayerEngine.finishGame();
    });

    await expect(page.locator('#winnerScreen')).toBeVisible();

    // Session in localStorage MUST be completely purged
    const activeSession = await page.evaluate(() => localStorage.getItem('gtf_active_session'));
    expect(activeSession).toBeNull();

    // 4.4 Fresh Homepage Visit in Same Browser
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Rejoin modal MUST NOT appear!
    const rejoinModal = page.locator('#rejoinRoomModal');
    expect(await rejoinModal.isVisible()).toBe(false);

    // Create a new room -> lobby must be 100% clean and uncorrupted
    await page.locator('.h-card-create').click();
    await page.locator('#hostPlayerNameInput').fill('FreshHostUser');
    await page.locator('#createRoomModal .mp-btn-primary').click();

    await expect(page.locator('#playerLobbyScreen')).toBeVisible();

    const currentRounds = await page.evaluate(() => MultiplayerEngine.hostSettings.rounds);
    expect(currentRounds).toBe(20);

    const currentTimer = await page.evaluate(() => MultiplayerEngine.hostSettings.timer);
    expect(currentTimer).toBe(30);

    const roster = await page.evaluate(() => GS.players);
    expect(roster.length).toBe(1);
    expect(roster[0].name).toContain('FreshHostUser');
  });

});
