import { test, expect } from '@playwright/test';

test.describe('Section 2: Guess the Plot & Hint System', () => {
  test('Section 2 contains the 10 exact new plots', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const plots = await page.evaluate(() => {
      const s2 = GS.sections.find(s => s.id === 2);
      return s2 ? s2.frames : [];
    });

    expect(plots.length).toBe(10);

    // Verify key plots and answers
    expect(plots[0].plot).toContain('Durga Puja festival');
    expect(plots[0].answer).toBe('KAHAANI');
    expect(plots[0].year).toBe('2012');

    expect(plots[1].plot).toContain('dabbawalas');
    expect(plots[1].answer).toBe('THE LUNCHBOX');
    expect(plots[1].year).toBe('2013');

    expect(plots[2].plot).toContain('colossal waterfall');
    expect(plots[2].answer).toBe('BAAHUBALI: THE BEGINNING');
    expect(plots[2].year).toBe('2015');

    expect(plots[3].plot).toContain('extraterrestrial stranded in Rajasthan');
    expect(plots[3].answer).toBe('PK');
    expect(plots[3].year).toBe('2014');

    expect(plots[4].plot).toContain('buffalo-race champion');
    expect(plots[4].answer).toBe('KANTARA');
    expect(plots[4].year).toBe('2022');

    expect(plots[5].plot).toContain('insurance salesman');
    expect(plots[5].answer).toBe('THE TRUMAN SHOW');
    expect(plots[5].year).toBe('1998');

    expect(plots[6].plot).toContain('anterograde amnesia');
    expect(plots[6].answer).toBe('MEMENTO');
    expect(plots[6].year).toBe('2000');

    expect(plots[7].plot).toContain('squalid semi-basement');
    expect(plots[7].answer).toBe('PARASITE');
    expect(plots[7].year).toBe('2019');

    expect(plots[8].plot).toContain('Black photographer');
    expect(plots[8].answer).toBe('GET OUT');
    expect(plots[8].year).toBe('2017');

    expect(plots[9].plot).toContain('poster of Rita Hayworth');
    expect(plots[9].answer).toBe('THE SHAWSHANK REDEMPTION');
    expect(plots[9].year).toBe('1994');
  });

  test('Requesting hint on a plot round generates masked hint and deducts 4 points', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const result = await page.evaluate(() => {
      const s2 = GS.sections.find(s => s.id === 2);
      const testPlotFrame = s2.frames[9]; // The Shawshank Redemption

      GS.players = [{ id: 'p1', name: 'Tester', score: 10, avatar: 'aman' }];
      MultiplayerEngine.playerId = 'p1';
      MultiplayerEngine.playerName = 'Tester';
      MultiplayerEngine.currentPlaylist = [{ ...testPlotFrame, sectionName: 'Guess the Plot', sectionId: 2 }];
      MultiplayerEngine.currentPlayIndex = 0;
      MultiplayerEngine.currentMaskedHint = null;
      MultiplayerEngine.hasUsedHintThisRound = false;

      // Trigger hint
      MultiplayerEngine.requestHint();

      return {
        scoreAfter: GS.players[0].score,
        maskedHint: MultiplayerEngine.currentMaskedHint
      };
    });

    // Verify points deducted
    expect(result.scoreAfter).toBe(6);
    expect(result.maskedHint).toBeTruthy();
    expect(result.maskedHint).toContain('-');
  });
});
