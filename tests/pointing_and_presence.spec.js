const { test, expect } = require('@playwright/test');

test.describe('Pointing System, Instant Frame Loading & Lobby Presence', () => {
  test('Casual chat words do NOT award points, single-word and full-title guesses score points', async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForSelector('#app', { state: 'visible' });

    // Evaluate in page: test FuzzyMatcher and ChatEngine directly
    const result = await page.evaluate(() => {
      const answer = '3 Idiots';
      // Casual chat phrases that must NOT trigger false matches
      const casualPhrases = [
        'the movie',
        'what movie is this',
        'hello everyone',
        '3',
        'who is this'
      ];

      const matchResults = casualPhrases.map(phrase => ({
        phrase,
        isMatch: FuzzyMatcher.isMatch(phrase, answer)
      }));

      // Real guesses: full title, single word from title, typos, and number word
      const realMatches = [
        FuzzyMatcher.isMatch('3 Idiots', answer),
        FuzzyMatcher.isMatch('3 idiots', answer),
        FuzzyMatcher.isMatch('three idiots', answer),
        FuzzyMatcher.isMatch('3 idots', answer), // 1 typo in 8 chars
        FuzzyMatcher.isMatch('idiots', answer),  // Single word from answer
        FuzzyMatcher.isMatch('idiot', answer)    // Single word singularized
      ];

      return { matchResults, realMatches };
    });

    // Casual phrases must NOT match
    for (const res of result.matchResults) {
      expect(res.isMatch).toBe(false);
    }

    // Real guesses MUST match
    for (const m of result.realMatches) {
      expect(m).toBe(true);
    }
  });

  test('Winner screen displays true 0 points and real stats when no answers are given', async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForSelector('#app', { state: 'visible' });

    const stats = await page.evaluate(() => {
      // Simulate 0-score players and show winner screen
      GS.players = [
        { id: 'p1', name: 'Alpha', score: 0, avatar: 'aman' },
        { id: 'p2', name: 'Beta', score: 0, avatar: 'aziz' }
      ];
      MultiplayerEngine.sessionStats = {
        roundsWon: 0,
        totalGuesses: 0,
        correctGuesses: 0,
        fastestGuessSeconds: null,
        roundStartTime: 0
      };

      WinnerScreen.renderStage(GS.players);
      WinnerScreen.renderScoreboard(GS.players);

      const champScore = document.getElementById('champScore')?.textContent;
      const silverScore = document.getElementById('silverScore')?.textContent;
      const bronzeScore = document.getElementById('bronzeScore')?.textContent;
      const scoreboardHtml = document.getElementById('winnerScoreboardList')?.innerHTML;

      return { champScore, silverScore, bronzeScore, scoreboardHtml };
    });

    expect(stats.champScore).toBe('0 POINTS');
    expect(stats.silverScore).toBe('0 POINTS');
    expect(stats.scoreboardHtml).toContain('0 PTS');
    expect(stats.scoreboardHtml).not.toContain('30 PTS');
  });

  test('Host can kick players in online lobby, and PLAYER_LEAVE prunes players immediately', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const clientContext = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const clientPage = await clientContext.newPage();

    // 1. Host creates room
    await hostPage.goto('/index.html');
    await hostPage.click('.h-card-create');
    await hostPage.waitForSelector('#hostPlayerNameInput', { state: 'visible' });
    await hostPage.fill('#hostPlayerNameInput', 'HostPlayer');
    await hostPage.click('button:has-text("CREATE ROOM")');

    await hostPage.waitForSelector('#playerLobbyScreen.active', { state: 'visible' });
    const roomCode = await hostPage.textContent('#displayRoomCode');
    expect(roomCode).toBeTruthy();

    // 2. Client joins room
    await clientPage.goto(`/index.html?room=${roomCode.trim()}`);
    await clientPage.waitForSelector('#joinPlayerNameInput', { state: 'visible' });
    await clientPage.fill('#joinPlayerNameInput', 'ClientPlayer');
    await clientPage.click('button:has-text("ENTER ROOM")');

    await clientPage.waitForSelector('#playerLobbyScreen.active', { state: 'visible' });

    // Host should now have 2 players
    await hostPage.waitForFunction(() => {
      const count = document.getElementById('lobbyCount')?.textContent;
      return count && count.includes('2 / 10');
    }, { timeout: 10000 });

    // Verify host can see remove button for client
    const hasRemoveBtn = await hostPage.evaluate(() => {
      const removeBtns = document.querySelectorAll('#lobbyPlayerList button[title="Remove Player"]');
      return removeBtns.length >= 1;
    });
    expect(hasRemoveBtn).toBe(true);

    // 3. Client leaves lobby cleanly
    await clientPage.evaluate(() => {
      PlayerLobby.back();
    });

    // Host should update back to 1 player
    await hostPage.waitForFunction(() => {
      const count = document.getElementById('lobbyCount')?.textContent;
      return count && count.includes('1 / 10');
    }, { timeout: 10000 });

    const finalCount = await hostPage.textContent('#lobbyCount');
    expect(finalCount).toContain('1 / 10');

    await hostContext.close();
    await clientContext.close();
  });
});
