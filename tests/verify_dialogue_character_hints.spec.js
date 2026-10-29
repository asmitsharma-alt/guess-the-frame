import { test, expect } from '@playwright/test';

test.describe('Dialogue Rounds & Character Hint System', () => {
  test('Section 2 contains the 10 exact new dialogues with characters', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const dialogues = await page.evaluate(() => {
      const s2 = GS.sections.find(s => s.id === 2);
      return s2 ? s2.frames : [];
    });

    expect(dialogues.length).toBe(10);

    // Verify key dialogues and character names
    expect(dialogues[0].dialogue).toContain('Hamare parivaar ne 2 aur 3 October ko Panaji mein satsang suna');
    expect(dialogues[0].answer).toBe('DRISHYAM');
    expect(dialogues[0].character).toBe('Vijay Salgaonkar (Ajay Devgn)');

    expect(dialogues[1].dialogue).toContain('Sirf piano bajane gaya tha main');
    expect(dialogues[1].answer).toBe('ANDHADHUN');
    expect(dialogues[1].character).toBe('Akash (Ayushmann Khurrana)');

    expect(dialogues[2].dialogue).toContain('Har subah jab main aankh kholta hoon');
    expect(dialogues[2].answer).toBe('GHAJINI');
    expect(dialogues[2].character).toBe('Sanjay Singhania (Aamir Khan)');

    expect(dialogues[3].dialogue).toContain('Maine chaar aatankwadiyon ko azaad karane ke liye phone nahi kiya tha');
    expect(dialogues[3].answer).toBe('A WEDNESDAY!');
    expect(dialogues[3].character).toBe('The Common Man (Naseeruddin Shah)');

    expect(dialogues[4].dialogue).toContain('Rajouri Garden mein ladkiyon ko akele sadak paar karne nahi dete');
    expect(dialogues[4].answer).toBe('QUEEN');
    expect(dialogues[4].character).toBe('Rani Mehra (Kangana Ranaut)');

    expect(dialogues[5].dialogue).toContain('Seven years per hour on that water planet');
    expect(dialogues[5].answer).toBe('INTERSTELLAR');
    expect(dialogues[5].character).toBe('Joseph Cooper (Matthew McConaughey)');

    expect(dialogues[6].dialogue).toContain('There is a bomb on a bus');
    expect(dialogues[6].answer).toBe('SPEED');
    expect(dialogues[6].character).toBe('Howard Payne (Dennis Hopper)');

    expect(dialogues[7].dialogue).toContain("It's not easy for me to raise my hand and send a boy to the electric chair");
    expect(dialogues[7].answer).toBe('12 ANGRY MEN');
    expect(dialogues[7].character).toBe('Juror 8 (Henry Fonda)');

    expect(dialogues[8].dialogue).toContain("Their language doesn't have a past or future");
    expect(dialogues[8].answer).toBe('ARRIVAL');
    expect(dialogues[8].character).toBe('Dr. Louise Banks (Amy Adams)');

    expect(dialogues[9].dialogue).toContain("They don't see each other. They only see what they want to see");
    expect(dialogues[9].answer).toBe('THE SIXTH SENSE');
    expect(dialogues[9].character).toBe('Cole Sear (Haley Joel Osment)');
  });

  test('Requesting hint on a dialogue round reveals character/actor name with readable font style', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const result = await page.evaluate(() => {
      const s2 = GS.sections.find(s => s.id === 2);
      const testDialogueFrame = s2.frames[1]; // Akash (Ayushmann Khurrana)

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
    expect(result.maskedHint).toContain('Akash (Ayushmann Khurrana)');
    expect(result.chatHintText).toContain('Akash (Ayushmann Khurrana)');
    expect(result.mobileHintText).toContain('Akash (Ayushmann Khurrana)');
    expect(result.hfbHintText).toContain('Akash (Ayushmann Khurrana)');

    // Verify readable typography
    expect(result.fontFamily.toLowerCase()).toContain('dm sans');
  });

  test('Player score is deducted by 4 when hint is requested on a dialogue round', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const scoreCheck = await page.evaluate(() => {
      const s2 = GS.sections.find(s => s.id === 2);
      const testDialogueFrame = s2.frames[0];

      GS.players = [{ id: 'p1', name: 'Tester', score: 10, avatar: 'aman' }];
      MultiplayerEngine.playerId = 'p1';
      MultiplayerEngine.playerName = 'Tester';
      MultiplayerEngine.currentPlaylist = [{ ...testDialogueFrame, sectionName: 'Guess the Dialogue', sectionId: 2 }];
      MultiplayerEngine.currentPlayIndex = 0;
      MultiplayerEngine.currentMaskedHint = null;
      MultiplayerEngine.hasUsedHintThisRound = false;

      const initialScore = GS.players[0].score;
      MultiplayerEngine.requestHint();
      const afterScore = GS.players[0].score;

      return { initialScore, afterScore };
    });

    expect(scoreCheck.initialScore).toBe(10);
    expect(scoreCheck.afterScore).toBe(6);
  });
});
