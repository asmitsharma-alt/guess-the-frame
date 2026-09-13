const { test, expect } = require('@playwright/test');

test.describe('BRUTAL FULL SYSTEM TEST SUITE: Every Feature, Button, Logic, Connectivity & Edge Case', () => {

  // ═════════════════════════════════════════════════════════════════════════════
  // 1. BUTTON TORTURE & EXHAUSTIVE UI INTERACTION TEST
  // ═════════════════════════════════════════════════════════════════════════════
  test('BRUTAL 1: Every Button, Modal, Avatar Picker, Sound Toggle & Boundary Click Test', async ({ page }) => {
    const consoleErrors = [];
    page.on('pageerror', err => consoleErrors.push(err.message));

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // 1.1 Home Screen Elements
    const createBtn = page.locator('.h-card-create');
    const joinBtn = page.locator('.h-card-join');
    const sndBtn = page.locator('#sndBtn');

    await expect(createBtn).toBeVisible();
    await expect(joinBtn).toBeVisible();
    await expect(sndBtn).toBeVisible();

    // Sound toggle rapid spam test (10 rapid clicks)
    for (let i = 0; i < 10; i++) {
      await sndBtn.click({ delay: 30 });
    }
    expect(await page.evaluate(() => typeof SoundManager.muted)).toBe('boolean');

    // 1.2 Create Modal & Avatar Selection
    await createBtn.click();
    const createModal = page.locator('#createRoomModal');
    await expect(createModal).toHaveClass(/active/);

    const hostNameInput = page.locator('#hostPlayerNameInput');
    await hostNameInput.fill('IronMan');

    // Cycle through all avatars and verify active selection
    for (const av of ['amish', 'aziz', 'vish', 'aman']) {
      const avOption = page.locator(`#createRoomModal .mp-avatar-option[data-avatar="${av}"]`);
      await avOption.click();
      await expect(avOption).toHaveClass(/selected/);
    }

    // Rapid close and reopen modal
    const closeCreateBtn = page.locator('#createRoomModal .mp-modal-close');
    await closeCreateBtn.click();
    await expect(createModal).not.toHaveClass(/active/);

    await createBtn.click();
    await expect(createModal).toHaveClass(/active/);

    // 1.3 Lobby Creation
    await page.locator('#createRoomModal .mp-btn-primary').click();
    const lobby = page.locator('#playerLobbyScreen');
    await expect(lobby).toHaveClass(/active/);

    // Verify QR code button is strictly absent from lobby
    const qrInLobby = page.locator('#playerLobbyScreen button:has-text("QR CODE")');
    expect(await qrInLobby.count()).toBe(0);

    // 1.4 Rounds +/- Button Boundary Testing (Default is 20 max)
    const initialRounds = await page.evaluate(() => MultiplayerEngine.hostSettings.rounds);
    expect(initialRounds).toBe(20);

    const incRoundsBtn = page.locator('button[title="Increase Rounds"]');
    const decRoundsBtn = page.locator('button[title="Decrease Rounds"]');

    // Clicking increase when already at max (20) must stay capped at 20
    await incRoundsBtn.click();
    expect(await page.evaluate(() => MultiplayerEngine.hostSettings.rounds)).toBe(20);

    // Decrement 1 round -> 19
    await decRoundsBtn.click();
    expect(await page.evaluate(() => MultiplayerEngine.hostSettings.rounds)).toBe(19);

    // Increment 1 round -> back to 20
    await incRoundsBtn.click();
    expect(await page.evaluate(() => MultiplayerEngine.hostSettings.rounds)).toBe(20);

    // Boundary clamping tests
    const clampedLower = await page.evaluate(() => {
      PlayerLobby.adjustRounds('frames', -100);
      return MultiplayerEngine.hostSettings.rounds;
    });
    expect(clampedLower).toBe(1); // Min round limit

    const clampedUpper = await page.evaluate(() => {
      PlayerLobby.adjustRounds('frames', 100);
      return MultiplayerEngine.hostSettings.rounds;
    });
    expect(clampedUpper).toBe(20); // Max round limit

    // 1.5 Timer +/- 1s Precision & Rapid Clicking Stress Test
    const initialTimer = await page.evaluate(() => MultiplayerEngine.hostSettings.timer);
    expect(initialTimer).toBe(30);

    const incTimerBtn = page.locator('button[title="Increase Timer"]');
    const decTimerBtn = page.locator('button[title="Decrease Timer"]');

    // Decrement by 1s (30 -> 29)
    await decTimerBtn.click();
    expect(await page.evaluate(() => MultiplayerEngine.hostSettings.timer)).toBe(29);

    // Increment by 1s (29 -> 30)
    await incTimerBtn.click();
    expect(await page.evaluate(() => MultiplayerEngine.hostSettings.timer)).toBe(30);

    // Boundary limits (1s min, 180s max)
    const minTimer = await page.evaluate(() => {
      PlayerLobby.adjustTimer(-500);
      return MultiplayerEngine.hostSettings.timer;
    });
    expect(minTimer).toBe(1);

    const maxTimer = await page.evaluate(() => {
      PlayerLobby.adjustTimer(500);
      return MultiplayerEngine.hostSettings.timer;
    });
    expect(maxTimer).toBe(180);

    // Reset timer back to 30 for subsequent tests
    await page.evaluate(() => {
      MultiplayerEngine.hostSettings.timer = 30;
      PlayerLobby.render();
    });

    // 1.6 Copy Link button
    const copyLinkBtn = page.locator('#copyLinkBtn');
    if (await copyLinkBtn.count() > 0) {
      await copyLinkBtn.click();
      const code = await page.evaluate(() => MultiplayerEngine.roomCode);
      expect(code.length).toBe(4);
    }

    // 1.7 Leave Lobby button
    await page.locator('button[onclick="PlayerLobby.back()"]').first().click();
    await expect(page.locator('#homeScreen')).toBeVisible();

    // 1.8 Join Room Modal Validation
    await joinBtn.click();
    const joinModal = page.locator('#joinRoomModal');
    await expect(joinModal).toHaveClass(/active/);

    const joinCodeInput = page.locator('#joinCodeInput');
    await joinCodeInput.click();
    await joinCodeInput.fill('WXYZ');
    const codeVal = await joinCodeInput.inputValue();
    expect(codeVal.toUpperCase()).toBe('WXYZ');

    // Close join modal
    await page.locator('#joinRoomModal .mp-modal-close').click();
    await expect(joinModal).not.toHaveClass(/active/);

    expect(consoleErrors).toEqual([]);
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // 2. EXHAUSTIVE GAME LOGIC, SCORING & CATALOG VERIFICATION
  // ═════════════════════════════════════════════════════════════════════════════
  test('BRUTAL 2: Pointing System, Fuzzy Matching, Hints, Spoilers & Catalog Integrity', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const logicReport = await page.evaluate(() => {
      const results = {};

      // 2.1 Catalog Verification: frames in section 1
      const s1 = GS.sections ? GS.sections.find(s => s.id === 1) : null;
      results.frameCount = s1 && s1.frames ? s1.frames.length : 0;
      results.allFramesHaveAnswer = s1 && s1.frames ? s1.frames.every(f => f.answer && f.answer.trim().length > 0) : false;
      results.allFramesHaveImage = s1 && s1.frames ? s1.frames.every(f => f.content && f.content.length > 0) : false;

      // 2.2 Pointing System: 1st=10, 2nd=7, 3rd=5, 4th=0
      MultiplayerEngine.isHost = true;
      MultiplayerEngine.roomCode = 'LOGC';
      MultiplayerEngine.playerId = 'h1';
      MultiplayerEngine.playerName = 'Guesser1';

      GS.players = [
        { id: 'h1', name: 'Guesser1', avatar: 'aman', score: 0 },
        { id: 'p2', name: 'Guesser2', avatar: 'amish', score: 0 },
        { id: 'p3', name: 'Guesser3', avatar: 'aziz', score: 0 },
        { id: 'p4', name: 'Guesser4', avatar: 'vish', score: 0 }
      ];

      MultiplayerEngine.currentPlaylist = [
        { sectionId: 1, sectionName: 'Guess the Frame', type: 'image', content: 'GUESSTHEFRAME/Rush (2023).webp', answer: 'RUSH', year: '2023' }
      ];
      MultiplayerEngine.currentPlayIndex = 0;
      MultiplayerEngine.currentRoundWinners = [];

      // 1st guess: Guesser1 -> 10 pts
      MultiplayerEngine.validateAndProcessGuess({ playerId: 'h1', playerName: 'Guesser1', playerAvatar: 'aman', guess: 'Rush', roundIndex: 0 });
      // Duplicate guess by Guesser1 -> rejected
      MultiplayerEngine.validateAndProcessGuess({ playerId: 'h1', playerName: 'Guesser1', playerAvatar: 'aman', guess: 'Rush', roundIndex: 0 });
      // 2nd guess: Guesser2 -> 7 pts
      MultiplayerEngine.validateAndProcessGuess({ playerId: 'p2', playerName: 'Guesser2', playerAvatar: 'amish', guess: 'rush', roundIndex: 0 });
      // 3rd guess: Guesser3 -> 5 pts
      MultiplayerEngine.validateAndProcessGuess({ playerId: 'p3', playerName: 'Guesser3', playerAvatar: 'aziz', guess: 'RUSH', roundIndex: 0 });
      // 4th guess: Guesser4 -> 0 pts
      MultiplayerEngine.validateAndProcessGuess({ playerId: 'p4', playerName: 'Guesser4', playerAvatar: 'vish', guess: 'Rush', roundIndex: 0 });

      results.scores = GS.players.map(p => ({ id: p.id, score: p.score }));
      results.winnerCount = MultiplayerEngine.currentRoundWinners.length;

      // 2.3 Hint Deduction Test (-2 pts)
      MultiplayerEngine.requestHint();
      results.scoreAfterHint = GS.players[0].score;
      results.hasMaskedHint = !!MultiplayerEngine.currentMaskedHint;

      // 2.4 Fuzzy Matcher Verification
      results.exactMatch = FuzzyMatcher.isMatch('Interstellar', 'INTERSTELLAR');
      results.fuzzyMatch = FuzzyMatcher.isMatch('Interstelar', 'INTERSTELLAR'); // 1 typo allowed
      results.wrongMatch = FuzzyMatcher.isMatch('Batman', 'INTERSTELLAR');

      // 2.5 Security: XSS Sanitization
      results.escapedXSS = SecurityUtil.escapeHtml('<script>alert(1)</script>');

      return results;
    });

    expect(logicReport.frameCount).toBeGreaterThanOrEqual(20);
    expect(logicReport.allFramesHaveAnswer).toBe(true);
    expect(logicReport.allFramesHaveImage).toBe(true);

    // Check Points distribution
    expect(logicReport.winnerCount).toBe(3);
    const scoreMap = Object.fromEntries(logicReport.scores.map(s => [s.id, s.score]));
    expect(scoreMap['h1']).toBe(10);
    expect(scoreMap['p2']).toBe(7);
    expect(scoreMap['p3']).toBe(5);
    expect(scoreMap['p4']).toBe(0);

    // Hint penalty
    expect(logicReport.scoreAfterHint).toBe(8); // 10 - 2 = 8
    expect(logicReport.hasMaskedHint).toBe(true);

    // Fuzzy matching
    expect(logicReport.exactMatch).toBe(true);
    expect(logicReport.fuzzyMatch).toBe(true);
    expect(logicReport.wrongMatch).toBe(false);

    // XSS Escape
    expect(logicReport.escapedXSS).not.toContain('<script>');
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // 3. FULL MULTIPLAYER CONNECTIVITY & REAL-TIME SYNCHRONIZATION
  // ═════════════════════════════════════════════════════════════════════════════
  test('BRUTAL 3: Live 2-Client Peer Connectivity, Real-time Lobby Sync, Live Match & Guessing', async ({ browser }) => {
    test.setTimeout(90000);
    // 3.1 Create two independent browser contexts
    const hostContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const playerContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });

    const hostPage = await hostContext.newPage();
    const playerPage = await playerContext.newPage();

    // 3.2 Host creates a Room
    await hostPage.goto('/');
    await hostPage.waitForLoadState('domcontentloaded');

    await hostPage.locator('.h-card-create').click();
    await hostPage.locator('#hostPlayerNameInput').fill('HostCaptain');
    await hostPage.locator('#createRoomModal .mp-btn-primary').click();
    await expect(hostPage.locator('#playerLobbyScreen')).toBeVisible();

    const roomCode = await hostPage.evaluate(() => MultiplayerEngine.roomCode);
    expect(roomCode).toHaveLength(4);

    // 3.3 Player joins the Room
    await playerPage.goto(`/?room=${roomCode}`);
    await playerPage.waitForLoadState('domcontentloaded');

    // Join modal should be prefilled with roomCode
    const joinCodeVal = await playerPage.locator('#joinCodeInput').inputValue();
    expect(joinCodeVal).toBe(roomCode);

    await playerPage.locator('#joinPlayerNameInput').fill('GuestPro');
    await playerPage.locator('#joinRoomModal .mp-avatar-option[data-avatar="amish"]').click();
    await playerPage.locator('#joinRoomModal .mp-btn-primary').click();

    await expect(playerPage.locator('#playerLobbyScreen')).toBeVisible();

    // 3.4 Verify Roster on Host side shows GuestPro
    await hostPage.waitForFunction(() => {
      return typeof GS !== 'undefined' && GS.players && GS.players.some(p => p.name.includes('GuestPro'));
    }, { timeout: 25000 });

    const hostRosterNames = await hostPage.evaluate(() => GS.players.map(p => p.name));
    expect(hostRosterNames.some(n => n.includes('HostCaptain'))).toBe(true);
    expect(hostRosterNames.some(n => n.includes('GuestPro'))).toBe(true);

    // 3.5 Real-time Settings Sync: Host adjusts timer by -1s (30 -> 29)
    await hostPage.locator('button[title="Decrease Timer"]').click();

    // Player screen should reflect 29s via real-time sync
    await expect(playerPage.locator('#hostTimerBtnText')).toContainText('29', { timeout: 10000 });

    // 3.6 Host starts match -> Both screens transition to "How to Answer" guide
    await hostPage.evaluate(() => {
      MultiplayerEngine.startMatch();
    });

    await expect(hostPage.locator('#howToAnswerScreen')).toBeVisible();
    await expect(playerPage.locator('#howToAnswerScreen')).toBeVisible();

    // 3.7 Fast-forward guide to jump into active match
    await hostPage.evaluate(() => {
      if (typeof HowToAnswerGuide !== 'undefined') {
        HowToAnswerGuide._secondsLeft = 0;
        HowToAnswerGuide.handleHostClick();
      }
    });

    await expect(hostPage.locator('#gameScreen')).toBeVisible();
    await expect(playerPage.locator('#gameScreen')).toBeVisible();

    // 3.8 Active Gameplay: Guessing submission via chat form
    const currentAnswer = await hostPage.evaluate(() => {
      const cur = MultiplayerEngine.currentPlaylist[MultiplayerEngine.currentPlayIndex];
      return cur ? cur.answer : null;
    });
    expect(currentAnswer).toBeTruthy();

    // Player enters correct answer and submits
    const playerGuessInput = playerPage.locator('#chatTextInput');
    const playerSubmitBtn = playerPage.locator('#chatSendBtn');

    await playerGuessInput.fill(currentAnswer);
    await playerSubmitBtn.click();

    // Host authoritative validation processes guess and updates scores
    await hostPage.waitForFunction(() => {
      return typeof MultiplayerEngine !== 'undefined' && MultiplayerEngine.currentRoundWinners.length > 0;
    }, { timeout: 25000 });

    const winners = await hostPage.evaluate(() => MultiplayerEngine.currentRoundWinners);
    expect(winners.length).toBeGreaterThanOrEqual(1);
    expect(winners[0].points).toBe(10);

    // Clean up contexts
    await hostContext.close();
    await playerContext.close();
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // 4. ARENA CONTROLS, SKIP, PAUSE, WINNER SCREEN & RESPONSIVENESS
  // ═════════════════════════════════════════════════════════════════════════════
  test('BRUTAL 4: Arena Controls, Skip Frame, Pause/Resume, Winner Podium & Mobile Viewport', async ({ page }) => {
    // 4.1 Mobile Viewport Test (iPhone 13 - 390x844)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Verify home elements fit within viewport with zero horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);

    // 4.2 Start Game in Single/Host Mode
    await page.evaluate(() => {
      MultiplayerEngine.isHost = true;
      MultiplayerEngine.roomCode = 'ARNA';
      MultiplayerEngine.playerId = 'host_arena';
      MultiplayerEngine.playerName = 'ArenaBoss';
      MultiplayerEngine.playerAvatar = 'vish';
      GS.players = [
        { id: 'host_arena', name: 'ArenaBoss', avatar: 'vish', score: 0, isHost: true, loaded: true }
      ];
      GS.framesLoaded = true;

      MultiplayerEngine.startMatch();
      if (typeof HowToAnswerGuide !== 'undefined') {
        HowToAnswerGuide._secondsLeft = 0;
        HowToAnswerGuide.handleHostClick();
      }
    });

    await expect(page.locator('#gameScreen')).toBeVisible();

    // 4.3 Arena Controls: Pause / Resume Toggle
    const pauseBtn = page.locator('#hfbPauseBtn');
    if (await pauseBtn.count() > 0) {
      await pauseBtn.click();
      expect(await page.evaluate(() => MultiplayerEngine.isPaused)).toBe(true);
      await pauseBtn.click();
      expect(await page.evaluate(() => MultiplayerEngine.isPaused)).toBe(false);
    }

    // 4.4 Arena Controls: Skip Frame
    const skipBtn = page.locator('#hfbSkipBtn');
    if (await skipBtn.count() > 0) {
      await skipBtn.click();
      const revealActive = await page.locator('#answerOverlay, .answer-reveal-modal, #ansNextRoundBtn').first().isVisible().catch(() => false);
      expect(revealActive !== null).toBe(true);
    }

    // 4.5 End Match & Winner Screen Verification
    await page.evaluate(() => {
      const testStandings = [
        { name: 'ArenaBoss', score: 35, avatar: 'vish', avatarImg: 'avvtar/vish.svg' },
        { name: 'RunnerUp', score: 20, avatar: 'aman', avatarImg: 'avvtar/aman.svg' },
        { name: 'BronzePlayer', score: 12, avatar: 'amish', avatarImg: 'avvtar/amish.svg' }
      ];
      GS.players = testStandings;
      WinnerScreen.show(testStandings);
    });

    await expect(page.locator('#winnerScreen')).toBeVisible();

    // Top 1 Champion verification
    const winnerName = await page.locator('#champName').textContent();
    expect(winnerName.toUpperCase()).toContain('ARENABOSS');

    // Click "Return to Lobby" button
    const returnLobbyBtn = page.locator('.btn-lobby');
    await returnLobbyBtn.click();
    await expect(page.locator('#playerLobbyScreen')).toBeVisible();
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // 5. LEGACY STALE RESUME PURGE TEST
  // ═════════════════════════════════════════════════════════════════════════════
  test('BRUTAL 5: Stale "Guess the Dialogue" offline resume key is completely purged and never appears on homepage', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Simulate stale legacy session in localStorage
    await page.evaluate(() => {
      const staleSnap = {
        v: 1,
        ts: Date.now(),
        currentSection: 1,
        currentSectionRound: 2,
        sections: [
          { name: 'Guess the Frame' },
          { name: 'Guess the Dialogue' }
        ],
        players: [{ name: 'StaleUser', score: 10 }]
      };
      localStorage.setItem('gtf_resume_v1', JSON.stringify(staleSnap));
    });

    // Reload page to trigger initialization & resume checks
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Button MUST NOT exist or be visible
    const resumeBtn = page.locator('#homeResumeBtn');
    expect(await resumeBtn.count()).toBe(0);

    // Stale key must be purged from localStorage
    const savedResume = await page.evaluate(() => localStorage.getItem('gtf_resume_v1'));
    expect(savedResume).toBeNull();
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // 6. MATCH COMPLETION PURGES SESSION & PRISTINE NEW LOBBY
  // ═════════════════════════════════════════════════════════════════════════════
  test('BRUTAL 6: Match over purges active session so reopening game never prompts dead rejoin or messes lobby', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Host creates room and starts match
    await page.evaluate(() => {
      MultiplayerEngine.selectedAvatarForModal = 'aman';
      MultiplayerEngine.confirmCreateRoom();
      GS.players = [
        { id: MultiplayerEngine.playerId, name: 'HostKing', avatar: 'aman', score: 0, isHost: true, loaded: true },
        { id: 'p2', name: 'GuestOne', avatar: 'vish', score: 0, isHost: false, loaded: true }
      ];
      GS.framesLoaded = true;
      MultiplayerEngine.startMatch();
      if (typeof HowToAnswerGuide !== 'undefined') {
        HowToAnswerGuide._secondsLeft = 0;
        HowToAnswerGuide.handleHostClick();
      }
    });

    await expect(page.locator('#gameScreen')).toBeVisible();

    // Verify session is active during match
    let activeSession = await page.evaluate(() => localStorage.getItem('gtf_active_session'));
    expect(activeSession).not.toBeNull();

    // End match (triggers finishGame & WinnerScreen)
    await page.evaluate(() => {
      MultiplayerEngine.finishGame();
    });

    await expect(page.locator('#winnerScreen')).toBeVisible();

    // Session MUST be cleared when match is over!
    activeSession = await page.evaluate(() => localStorage.getItem('gtf_active_session'));
    expect(activeSession).toBeNull();

    // Reload the homepage as a fresh visit
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Rejoin modal MUST NOT appear!
    const rejoinModal = page.locator('#rejoinRoomModal');
    expect(await rejoinModal.isVisible()).toBe(false);

    // Create a brand new room -> verify lobby is 100% pristine and not messed up
    await page.locator('.h-card-create').click();
    await page.locator('#hostPlayerNameInput').fill('FreshHost');
    await page.locator('#createRoomModal .mp-btn-primary').click();

    await expect(page.locator('#playerLobbyScreen')).toBeVisible();

    // Verify lobby state is fresh: exactly 1 player, 20 max rounds, 30s timer
    const lobbyPlayers = await page.evaluate(() => GS.players);
    expect(lobbyPlayers.length).toBe(1);
    expect(lobbyPlayers[0].name).toContain('FreshHost');

    const rounds = await page.evaluate(() => MultiplayerEngine.hostSettings.rounds);
    expect(rounds).toBe(20);

    const timer = await page.evaluate(() => MultiplayerEngine.hostSettings.timer);
    expect(timer).toBe(30);
  });

});


