// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Host Keyboard Pacing Shortcuts Suite', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/?bypass_restrict=1');
    await page.waitForLoadState('domcontentloaded');
  });

  test('1. Auto-Focus on Round Start (#chatTextInput)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    await page.evaluate(() => {
      MultiplayerEngine.isHost = true;
      MultiplayerEngine.playerId = 'host_p1';
      MultiplayerEngine.playerName = 'HOST_PLAYER';
      MultiplayerEngine.roomCode = 'KBD1';
      MultiplayerEngine.currentPlaylist = [
        { id: 1, type: 'image', content: 'GUESSTHEFRAME/13B Fear Has a New Address (2009).webp', answer: '13B', year: '2009', sectionName: 'Guess the Frame', sectionId: 1 }
      ];
      GS.players = [
        { id: 'host_p1', name: 'HOST_PLAYER', avatar: 'ayank', isHost: true, score: 0 }
      ];

      UI.showScreen('gameScreen');
      MultiplayerEngine.startRound(0);
    });

    // Wait for the 50ms buffer
    await page.waitForTimeout(100);

    // Verify #chatTextInput is focused
    const isFocused = await page.evaluate(() => {
      return document.activeElement === document.getElementById('chatTextInput');
    });
    expect(isFocused).toBe(true);
  });

  test('2. Global Keyboard Shortcut (Enter key) on Answer Reveal (Host vs Non-Host)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // Setup host and trigger answerOverlay
    await page.evaluate(() => {
      MultiplayerEngine.isHost = true;
      MultiplayerEngine.playerId = 'host_p1';
      MultiplayerEngine.playerName = 'HOST_PLAYER';
      MultiplayerEngine.roomCode = 'KBD2';
      MultiplayerEngine.currentPlayIndex = 0;
      MultiplayerEngine.currentPlaylist = [
        { id: 1, type: 'image', content: 'GUESSTHEFRAME/13B Fear Has a New Address (2009).webp', answer: '13B', year: '2009', sectionName: 'Guess the Frame', sectionId: 1 },
        { id: 2, type: 'image', content: 'GUESSTHEFRAME/Ankhon Dekhi (2014).webp', answer: 'ANKHON DEKHI', year: '2014', sectionName: 'Guess the Frame', sectionId: 1 }
      ];
      GS.players = [
        { id: 'host_p1', name: 'HOST_PLAYER', avatar: 'ayank', isHost: true, score: 0 },
        { id: 'p2', name: 'CLIENT_PLAYER', avatar: 'ayush', isHost: false, score: 0 }
      ];

      UI.showScreen('gameScreen');
      MultiplayerEngine.endRound();
      // Ensure focus is outside input (global body focus)
      document.body.focus();
    });

    const ansOv = page.locator('#answerOverlay');
    await expect(ansOv).toHaveClass(/visible/);

    // Track hostNextRound calls
    await page.evaluate(() => {
      window._nextRoundCalled = 0;
      const orig = MultiplayerEngine.hostNextRound.bind(MultiplayerEngine);
      MultiplayerEngine.hostNextRound = () => {
        window._nextRoundCalled++;
        orig();
      };
    });

    // Press Enter globally as host
    await page.keyboard.press('Enter');

    const nextCalls = await page.evaluate(() => window._nextRoundCalled);
    expect(nextCalls).toBe(1);

    // Non-host test: verify Enter does not advance
    await page.evaluate(() => {
      MultiplayerEngine.isHost = false;
      window._nextRoundCalled = 0;
      const ansOvEl = document.getElementById('answerOverlay');
      if (ansOvEl) ansOvEl.classList.add('visible');
      document.body.focus();
    });

    await page.keyboard.press('Enter');
    const nonHostCalls = await page.evaluate(() => window._nextRoundCalled);
    expect(nonHostCalls).toBe(0);
  });

  test('3. Empty Chat Input Enter Shortcut vs Non-Empty Chat Input', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // Setup host with visible answer overlay and focus inside #chatTextInput
    await page.evaluate(() => {
      MultiplayerEngine.isHost = true;
      MultiplayerEngine.playerId = 'host_p1';
      MultiplayerEngine.playerName = 'HOST_PLAYER';
      MultiplayerEngine.roomCode = 'KBD3';
      MultiplayerEngine.currentPlayIndex = 0;
      MultiplayerEngine.currentPlaylist = [
        { id: 1, type: 'image', content: 'GUESSTHEFRAME/13B Fear Has a New Address (2009).webp', answer: '13B', year: '2009', sectionName: 'Guess the Frame', sectionId: 1 },
        { id: 2, type: 'image', content: 'GUESSTHEFRAME/Ankhon Dekhi (2014).webp', answer: 'ANKHON DEKHI', year: '2014', sectionName: 'Guess the Frame', sectionId: 1 }
      ];
      GS.players = [
        { id: 'host_p1', name: 'HOST_PLAYER', avatar: 'ayank', isHost: true, score: 0 }
      ];

      UI.showScreen('gameScreen');
      MultiplayerEngine.endRound();

      window._nextRoundCalled = 0;
      window._outgoingMessages = [];

      MultiplayerEngine.hostNextRound = () => {
        window._nextRoundCalled++;
      };

      ChatEngine.processOutgoingMessage = (txt) => {
        window._outgoingMessages.push(txt);
      };

      const chatInput = document.getElementById('chatTextInput');
      chatInput.value = '';
      chatInput.focus();
    });

    const chatInput = page.locator('#chatTextInput');
    await expect(chatInput).toBeFocused();

    // 3a. Press Enter with empty input: must advance round
    await page.keyboard.press('Enter');
    let nextCalls = await page.evaluate(() => window._nextRoundCalled);
    let messages = await page.evaluate(() => window._outgoingMessages);
    expect(nextCalls).toBe(1);
    expect(messages.length).toBe(0);

    // 3b. Type message in input: must send message and NOT advance round
    await chatInput.fill('Good game everyone!');
    await page.keyboard.press('Enter');

    nextCalls = await page.evaluate(() => window._nextRoundCalled);
    messages = await page.evaluate(() => window._outgoingMessages);
    expect(nextCalls).toBe(1); // Still 1, did not advance
    expect(messages).toEqual(['Good game everyone!']);
  });

  test('4. Visual Button Affordance: NEXT ROUND ⏭ [Enter] and FINISH MATCH 🏁 [Enter]', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // 4a. Intermediate round: should show NEXT ROUND ⏭ [Enter]
    await page.evaluate(() => {
      MultiplayerEngine.isHost = true;
      MultiplayerEngine.playerId = 'host_p1';
      MultiplayerEngine.playerName = 'HOST_PLAYER';
      MultiplayerEngine.roomCode = 'KBD4';
      MultiplayerEngine.currentPlayIndex = 0;
      MultiplayerEngine.currentPlaylist = [
        { id: 1, type: 'image', content: 'GUESSTHEFRAME/13B Fear Has a New Address (2009).webp', answer: '13B', year: '2009', sectionName: 'Guess the Frame', sectionId: 1 },
        { id: 2, type: 'image', content: 'GUESSTHEFRAME/Ankhon Dekhi (2014).webp', answer: 'ANKHON DEKHI', year: '2014', sectionName: 'Guess the Frame', sectionId: 1 }
      ];
      GS.players = [
        { id: 'host_p1', name: 'HOST_PLAYER', avatar: 'ayank', isHost: true, score: 0 }
      ];

      UI.showScreen('gameScreen');
      MultiplayerEngine.endRound();
    });

    const nextBtn = page.locator('#ansNextRoundBtn');
    await expect(nextBtn).toBeVisible();
    const btnText = await nextBtn.textContent();
    expect(btnText).toContain('NEXT ROUND ⏭ [Enter]');

    // 4b. Final round: should show FINISH MATCH 🏁 [Enter]
    await page.evaluate(() => {
      MultiplayerEngine.currentPlayIndex = 1; // Last round
      MultiplayerEngine.endRound();
    });

    const finalBtnText = await nextBtn.textContent();
    expect(finalBtnText).toContain('FINISH MATCH 🏁 [Enter]');
  });

});
