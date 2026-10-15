import { test, expect } from '@playwright/test';

test.describe('Dialogue Rounds & Character Hint System', () => {
  test('Section 2 contains the 10 exact new dialogues with characters', async ({ page }) => {
    await page.goto('http://localhost:8080/');
    await page.waitForLoadState('domcontentloaded');

    const dialogues = await page.evaluate(() => {
      const s2 = GS.sections.find(s => s.id === 2);
      return s2 ? s2.frames : [];
    });

    expect(dialogues.length).toBe(10);

    // Verify key dialogues and character names
    expect(dialogues[0].dialogue).toContain('Bete ko haath lagane se pehle');
    expect(dialogues[0].answer).toBe('JAWAN');
    expect(dialogues[0].character).toBe('Vikram Rathore (Shah Rukh Khan)');

    expect(dialogues[1].dialogue).toContain('Duniya mein sabse bada yoddha maa hoti hai');
    expect(dialogues[1].answer).toBe('KGF');
    expect(dialogues[1].character).toBe('Rocky (Yash)');

    expect(dialogues[2].dialogue).toContain('Imaandari ki third division');
    expect(dialogues[2].answer).toBe('12TH FAIL');
    expect(dialogues[2].character).toBe('Manoj Kumar Sharma (Vikrant Massey)');

    expect(dialogues[3].dialogue).toContain('Pushpa, Pushpa Raj');
    expect(dialogues[3].answer).toBe('PUSHPA');
    expect(dialogues[3].character).toBe('Pushpa Raj (Allu Arjun)');

    expect(dialogues[4].dialogue).toContain('Woh stree hai');
    expect(dialogues[4].answer).toBe('STREE');
    expect(dialogues[4].character).toBe('Rudra (Pankaj Tripathi)');

    expect(dialogues[5].dialogue).toContain('destroyer of worlds');
    expect(dialogues[5].answer).toBe('OPPENHEIMER');
    expect(dialogues[5].character).toBe('J. Robert Oppenheimer (Cillian Murphy)');

    expect(dialogues[6].dialogue).toContain('Mankind was born on Earth');
    expect(dialogues[6].answer).toBe('INTERSTELLAR');
    expect(dialogues[6].character).toBe('Cooper (Matthew McConaughey)');

    expect(dialogues[7].dialogue).toContain('Fear is the mind-killer');
    expect(dialogues[7].answer).toBe('DUNE');
    expect(dialogues[7].character).toBe('Paul Atreides (Timothée Chalamet)');

    expect(dialogues[8].dialogue).toContain('In case I don\'t see ya');
    expect(dialogues[8].answer).toBe('THE TRUMAN SHOW');
    expect(dialogues[8].character).toBe('Truman Burbank (Jim Carrey)');

    expect(dialogues[9].dialogue).toContain('difference between knowing the path');
    expect(dialogues[9].answer).toBe('THE MATRIX');
    expect(dialogues[9].character).toBe('Morpheus (Laurence Fishburne)');
  });

  test('Requesting hint on a dialogue round reveals character/actor name with readable font style', async ({ page }) => {
    await page.goto('http://localhost:8080/');
    await page.waitForLoadState('domcontentloaded');

    const result = await page.evaluate(() => {
      const s2 = GS.sections.find(s => s.id === 2);
      const testDialogueFrame = s2.frames[1]; // Rocky / KGF

      GS.players = [{ id: 'p1', name: 'Tester', score: 10, avatar: 'aman' }];
      MultiplayerEngine.playerId = 'p1';
      MultiplayerEngine.playerName = 'Tester';
      MultiplayerEngine.currentPlaylist = [{ ...testDialogueFrame, sectionName: 'Guess the Dialogue', sectionId: 2 }];
      MultiplayerEngine.currentPlayIndex = 0;
      MultiplayerEngine.currentMaskedHint = null;
      MultiplayerEngine.hasUsedHintThisRound = false;

      // Trigger hint
      MultiplayerEngine.requestHint();

      const chatHintEl = document.getElementById('chatActiveHintText');
      const mobileHintEl = document.getElementById('mobileHintText');
      const hfbHintEl = document.getElementById('hfbActiveHintText');

      const style = window.getComputedStyle(chatHintEl);

      return {
        scoreAfter: GS.players[0].score,
        maskedHint: MultiplayerEngine.currentMaskedHint,
        chatHintText: chatHintEl ? chatHintEl.textContent : '',
        mobileHintText: mobileHintEl ? mobileHintEl.textContent : '',
        hfbHintText: hfbHintEl ? hfbHintEl.textContent : '',
        fontFamily: style.fontFamily,
        letterSpacing: style.letterSpacing
      };
    });

    // Verify character/actor name is revealed in hint
    expect(result.maskedHint).toContain('Rocky (Yash)');
    expect(result.chatHintText).toContain('Rocky (Yash)');
    expect(result.mobileHintText).toContain('Rocky (Yash)');
    expect(result.hfbHintText).toContain('Rocky (Yash)');

    // Verify readable typography
    expect(result.fontFamily.toLowerCase()).toContain('dm sans');
    expect(parseFloat(result.letterSpacing)).toBeLessThan(1);

    // Verify -4 points penalty
    expect(result.scoreAfter).toBe(6);
  });
});
