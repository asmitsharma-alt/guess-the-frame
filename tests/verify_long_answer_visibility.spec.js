import { test, expect } from '@playwright/test';

test.describe('Expanded Answer Reveal Area with Original Font Size', () => {
  const longFilename = 'The.Odyssey.2026.2160p.IMAX.UHD.Blu-ray.Remux.HDR.HEVC.DTS-HD.MA.5.1-CiNEPHiLES.mkv';

  test('Long filename is fully visible on Desktop with expanded card and original font size', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const result = await page.evaluate(async (titleText) => {
      document.body.classList.add('bypass-restrict');
      UI.showScreen('gameScreen');
      const curFrame = {
        id: 9999,
        answer: titleText,
        displayAnswer: titleText,
        year: 2026,
        type: 'frame',
        sectionName: 'Guess the Frame'
      };
      MultiplayerEngine.currentFrame = curFrame;
      MultiplayerEngine.isRoundFinished = true;
      await FrameDisplay.revealAnswer(curFrame);

      const ansTitle = document.getElementById('ansTitle');
      const ansCard = document.querySelector('.ans-card');
      const ansOv = document.getElementById('answerOverlay');

      const titleRect = ansTitle.getBoundingClientRect();
      const cardRect = ansCard.getBoundingClientRect();
      const ovRect = ansOv.getBoundingClientRect();
      const titleStyle = window.getComputedStyle(ansTitle);

      return {
        titleText: ansTitle.textContent,
        fontSize: parseFloat(titleStyle.fontSize),
        titleWidth: titleRect.width,
        cardWidth: cardRect.width,
        ovWidth: ovRect.width,
        titleLeft: titleRect.left,
        titleRight: titleRect.right,
        cardLeft: cardRect.left,
        cardRight: cardRect.right,
        titleOverflowsCardHorizontally: titleRect.right > cardRect.right + 2 || titleRect.left < cardRect.left - 2,
        cardOverflowsOvHorizontally: cardRect.right > ovRect.right + 2 || cardRect.left < ovRect.left - 2,
        cardIsExpanded: cardRect.width > 700 // Expanded well past the old 560px cap
      };
    }, longFilename);

    console.log('Desktop 1280x720 Expanded Result:', JSON.stringify(result, null, 2));
    expect(result.titleText).toBe(longFilename);
    // Original old font size is clamp(26px, 5vw, 44px) -> at 1280px, 5vw is 64px, so capped at 44px
    expect(result.fontSize).toBeGreaterThanOrEqual(26);
    expect(result.cardIsExpanded).toBe(true);
    expect(result.titleOverflowsCardHorizontally).toBe(false);
    expect(result.cardOverflowsOvHorizontally).toBe(false);
  });

  test('Long filename is fully visible on Mobile (375x667) with expanded card and original font size', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const result = await page.evaluate(async (titleText) => {
      document.body.classList.add('bypass-restrict');
      UI.showScreen('gameScreen');
      const curFrame = {
        id: 9999,
        answer: titleText,
        displayAnswer: titleText,
        year: 2026,
        type: 'frame',
        sectionName: 'Guess the Frame'
      };
      MultiplayerEngine.currentFrame = curFrame;
      MultiplayerEngine.isRoundFinished = true;
      await FrameDisplay.revealAnswer(curFrame);

      const ansTitle = document.getElementById('ansTitle');
      const ansCard = document.querySelector('.ans-card');
      const ansOv = document.getElementById('answerOverlay');

      const titleRect = ansTitle.getBoundingClientRect();
      const cardRect = ansCard.getBoundingClientRect();
      const ovRect = ansOv.getBoundingClientRect();
      const titleStyle = window.getComputedStyle(ansTitle);

      return {
        titleText: ansTitle.textContent,
        fontSize: parseFloat(titleStyle.fontSize),
        titleWidth: titleRect.width,
        cardWidth: cardRect.width,
        ovWidth: ovRect.width,
        titleLeft: titleRect.left,
        titleRight: titleRect.right,
        cardLeft: cardRect.left,
        cardRight: cardRect.right,
        titleOverflowsCardHorizontally: titleRect.right > cardRect.right + 2 || titleRect.left < cardRect.left - 2,
        cardOverflowsOvHorizontally: cardRect.right > ovRect.right + 2 || cardRect.left < ovRect.left - 2
      };
    }, longFilename);

    console.log('Mobile 375x667 Expanded Result:', JSON.stringify(result, null, 2));
    expect(result.titleText).toBe(longFilename);
    // Original old font size on mobile is clamp(26px, 5vw, 44px) -> at 375px, 5vw is 18.75px, clamped at 26px
    expect(result.fontSize).toBeGreaterThanOrEqual(26);
    expect(result.titleOverflowsCardHorizontally).toBe(false);
    expect(result.cardOverflowsOvHorizontally).toBe(false);
  });

  test('Standard movie titles (INCEPTION) render boldly at old font size without overflow', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const result = await page.evaluate(async () => {
      UI.showScreen('gameScreen');
      const curFrame = {
        id: 1001,
        answer: 'INCEPTION',
        displayAnswer: 'INCEPTION',
        year: 2010,
        type: 'frame',
        sectionName: 'Guess the Frame'
      };
      MultiplayerEngine.currentFrame = curFrame;
      MultiplayerEngine.isRoundFinished = true;
      await FrameDisplay.revealAnswer(curFrame);

      const ansTitle = document.getElementById('ansTitle');
      const ansCard = document.querySelector('.ans-card');
      const titleRect = ansTitle.getBoundingClientRect();
      const cardRect = ansCard.getBoundingClientRect();
      const titleStyle = window.getComputedStyle(ansTitle);

      return {
        titleText: ansTitle.textContent,
        fontSize: parseFloat(titleStyle.fontSize),
        titleOverflows: titleRect.right > cardRect.right + 2 || titleRect.left < cardRect.left - 2
      };
    });

    expect(result.titleText).toBe('INCEPTION');
    expect(result.fontSize).toBe(44); // Exact original 44px clamp max on desktop
    expect(result.titleOverflows).toBe(false);
  });
});
