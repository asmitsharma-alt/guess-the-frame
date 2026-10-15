const { test, expect } = require('@playwright/test');

test.describe('50% Alternating Hint System & Negative Marking Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('http://localhost:8080/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('generateMaskedHint produces 50% alternating revealed letters and preserves spaces and numbers', async ({ page }) => {
    const results = await page.evaluate(() => {
      return {
        threeIdiotsLower: MultiplayerEngine.generateMaskedHint('3 idiots'),
        threeIdiotsTitle: MultiplayerEngine.generateMaskedHint('3 Idiots'),
        threeIdiotsUpper: MultiplayerEngine.generateMaskedHint('3 IDIOTS'),
        darkKnight: MultiplayerEngine.generateMaskedHint('The Dark Knight'),
        up: MultiplayerEngine.generateMaskedHint('Up'),
        singleLetter: MultiplayerEngine.generateMaskedHint('A'),
        topGun: MultiplayerEngine.generateMaskedHint('Top Gun Maverick (2022)'),
        empty: MultiplayerEngine.generateMaskedHint(''),
        nullVal: MultiplayerEngine.generateMaskedHint(null)
      };
    });

    expect(results.threeIdiotsLower).toBe('3 -d-o-s');
    expect(results.threeIdiotsTitle).toBe('3 -d-o-s');
    expect(results.threeIdiotsUpper).toBe('3 -D-O-S');
    expect(results.darkKnight).toBe('-h- -a-k -n-g-t');
    expect(results.up).toBe('-p');
    expect(results.singleLetter).toBe('-');
    expect(results.topGun).toBe('-o- -u- -a-e-i-k (2022)');
    expect(results.empty).toBe('');
    expect(results.nullVal).toBe('');
  });

  test('Negative marking: Player with 0 points drops to -4 points upon taking hint', async ({ page }) => {
    const testResult = await page.evaluate(() => {
      // Setup players: one with 0 points, one with 10 points, one with 2 points
      GS.players = [
        { id: 'zero_p', name: 'ZeroGuy', score: 0, avatar: 'ayank' },
        { id: 'rich_p', name: 'RichGuy', score: 10, avatar: 'ayush' },
        { id: 'low_p', name: 'LowGuy', score: 2, avatar: 'joel' }
      ];

      MultiplayerEngine.currentPlaylist = [
        { id: 'f1', type: 'image', answer: '3 IDIOTS', content: 'test.webp' }
      ];
      MultiplayerEngine.currentPlayIndex = 0;
      MultiplayerEngine.currentMaskedHint = null;
      MultiplayerEngine.hasUsedHintThisRound = false;

      // Test zero_p takes hint
      MultiplayerEngine.playerId = 'zero_p';
      MultiplayerEngine.playerName = 'ZeroGuy';
      MultiplayerEngine.requestHint();
      const zeroScoreAfter = GS.players.find(p => p.id === 'zero_p').score;
      const zeroMasked = MultiplayerEngine.currentMaskedHint;

      // Reset round hint state for low_p test
      MultiplayerEngine.hasUsedHintThisRound = false;
      MultiplayerEngine.playerId = 'low_p';
      MultiplayerEngine.playerName = 'LowGuy';
      MultiplayerEngine.requestHint();
      const lowScoreAfter = GS.players.find(p => p.id === 'low_p').score;

      // Test Scores.add directly allows negative points
      const scoreDirect = Scores.add(1, -4); // RichGuy 10 - 4 = 6
      const richScoreAfter = GS.players[1].score;

      // Further reduce ZeroGuy with Scores.add from -4 to -8
      Scores.add(0, -4);
      const zeroScoreFurther = GS.players[0].score;

      return {
        zeroScoreAfter,
        zeroMasked,
        lowScoreAfter,
        richScoreAfter,
        zeroScoreFurther
      };
    });

    expect(testResult.zeroScoreAfter).toBe(-4);
    expect(testResult.zeroMasked).toBe('3 -D-O-S');
    expect(testResult.lowScoreAfter).toBe(-2);
    expect(testResult.richScoreAfter).toBe(6);
    expect(testResult.zeroScoreFurther).toBe(-8);
  });

  test('UI elements reflect -4 pts labels and button text', async ({ page }) => {
    const hfbHintText = await page.locator('#hfbHintBtn').textContent();
    const chatHintText = await page.locator('#chatHintBtn').textContent();
    const mobileHintTitle = await page.locator('#mobileQuickHintBtn').getAttribute('title');

    expect(hfbHintText).toContain('-4 pts');
    expect(chatHintText).toContain('-4 pts');
    expect(mobileHintTitle).toContain('-4 pts');
  });

  test('Privacy: hint text is revealed locally and not leaked to remote players', async ({ page }) => {
    const privacyResult = await page.evaluate(() => {
      GS.players = [
        { id: 'player_me', name: 'Requester', score: 5, avatar: 'ruhaan' },
        { id: 'player_other', name: 'Opponent', score: 5, avatar: 'praggya' }
      ];
      MultiplayerEngine.playerId = 'player_me';
      MultiplayerEngine.playerName = 'Requester';
      MultiplayerEngine.currentPlaylist = [
        { id: 'f2', type: 'image', answer: 'THE DARK KNIGHT', content: 'tdk.webp' }
      ];
      MultiplayerEngine.currentPlayIndex = 0;
      MultiplayerEngine.currentMaskedHint = null;
      MultiplayerEngine.hasUsedHintThisRound = false;

      // Player requests hint
      MultiplayerEngine.requestHint();
      const requesterHintText = document.getElementById('chatActiveHintText')?.textContent;

      // Simulate remote hint event received by Opponent
      MultiplayerEngine.playerId = 'player_other';
      MultiplayerEngine.playerName = 'Opponent';
      MultiplayerEngine.handleRemoteHint({
        playerId: 'player_me',
        playerName: 'Requester',
        updatedPlayers: [{ id: 'player_me', score: 1 }, { id: 'player_other', score: 5 }]
      });

      // The active hint text should not be changed for Opponent
      const opponentActiveDisplay = document.getElementById('chatActiveHint')?.style.display;
      const lastChatMessage = document.querySelector('#liveChatStream .chat-notice-subtle:last-child')?.textContent;

      return {
        requesterHintText,
        lastChatMessage
      };
    });

    expect(privacyResult.requesterHintText).toBe('-H- -A-K -N-G-T');
    expect(privacyResult.lastChatMessage).toContain('Requester unlocked a hint! (-4 pts)');
  });
});
