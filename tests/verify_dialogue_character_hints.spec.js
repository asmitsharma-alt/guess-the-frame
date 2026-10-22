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
    expect(dialogues[0].dialogue).toContain("What if my problem isn't that I don't understand people");
    expect(dialogues[0].answer).toBe('NIGHTCRAWLER');
    expect(dialogues[0].character).toBe('Lou Bloom (Jake Gyllenhaal)');

    expect(dialogues[1].dialogue).toContain('Yeh loktantra hai');
    expect(dialogues[1].answer).toBe('GULAAL');
    expect(dialogues[1].character).toBe('Dukey Bana (Kay Kay Menon)');

    expect(dialogues[2].dialogue).toContain('Get busy living, or get busy dying');
    expect(dialogues[2].answer).toBe('THE SHAWSHANK REDEMPTION');
    expect(dialogues[2].character).toBe('Andy Dufresne (Tim Robbins)');

    expect(dialogues[3].dialogue).toContain('I think this just might be my masterpiece');
    expect(dialogues[3].answer).toBe('INGLOURIOUS BASTERDS');
    expect(dialogues[3].character).toBe('Lt. Aldo Raine (Brad Pitt)');

    expect(dialogues[4].dialogue).toContain("I'm the guy who does his job");
    expect(dialogues[4].answer).toBe('THE DEPARTED');
    expect(dialogues[4].character).toBe('Staff Sergeant Sean Dignam (Mark Wahlberg)');

    expect(dialogues[5].dialogue).toContain('Yeh duniya kisi ki laalach ke liye nahi');
    expect(dialogues[5].answer).toBe('TUMBBAD');
    expect(dialogues[5].character).toBe('Vinayak Rao (Sohum Shah)');

    expect(dialogues[6].dialogue).toContain('Inteqaam se sirf inteqaam paida hota hai');
    expect(dialogues[6].answer).toBe('HAIDER');
    expect(dialogues[6].character).toBe('Ghazala Meer / Haider Meer (Tabu / Shahid Kapoor)');

    expect(dialogues[7].dialogue).toContain('Freedom is my birthright');
    expect(dialogues[7].answer).toBe('SARDAR UDHAM');
    expect(dialogues[7].character).toBe('Sardar Udham Singh (Vicky Kaushal)');

    expect(dialogues[8].dialogue).toContain('Jao pehle us aadmi ka sign le kar aao');
    expect(dialogues[8].answer).toBe('DEEWAAR');
    expect(dialogues[8].character).toBe('Vijay Verma (Amitabh Bachchan)');

    expect(dialogues[9].dialogue).toContain('Apne hi paani mein pighal jaana');
    expect(dialogues[9].answer).toBe('SWADES');
    expect(dialogues[9].character).toBe('Mohan Bhargava (Shah Rukh Khan)');
  });

  test('Requesting hint on a dialogue round reveals character/actor name with readable font style', async ({ page }) => {
    await page.goto('http://localhost:8080/');
    await page.waitForLoadState('domcontentloaded');

    const result = await page.evaluate(() => {
      const s2 = GS.sections.find(s => s.id === 2);
      const testDialogueFrame = s2.frames[1]; // Dukey Bana (Kay Kay Menon)

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
    expect(result.maskedHint).toContain('Dukey Bana (Kay Kay Menon)');
    expect(result.chatHintText).toContain('Dukey Bana (Kay Kay Menon)');
    expect(result.mobileHintText).toContain('Dukey Bana (Kay Kay Menon)');
    expect(result.hfbHintText).toContain('Dukey Bana (Kay Kay Menon)');

    // Verify readable typography
    expect(result.fontFamily.toLowerCase()).toContain('dm sans');
    expect(parseFloat(result.letterSpacing)).toBeLessThan(1);

    // Verify -4 points penalty
    expect(result.scoreAfter).toBe(6);
  });
});
