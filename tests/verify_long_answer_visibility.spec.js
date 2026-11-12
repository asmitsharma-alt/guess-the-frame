import { test, expect } from '@playwright/test';

test.describe('Answer Title Visibility & Formatting Across Viewports', () => {
  const longFilename = 'The.Odyssey.2026.2160p.IMAX.UHD.Blu-ray.Remux.HDR.HEVC.DTS-HD.MA.5.1-CiNEPHiLES.mkv';

  test('Long filename is 100% visible on Desktop (1280x720)', async ({ page }) => {
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

      return {
        titleText: ansTitle.textContent,
        titleWidth: titleRect.width,
        cardWidth: cardRect.width,
        titleOverflowsCardHorizontally: titleRect.right > cardRect.right + 2 || titleRect.left < cardRect.left - 2,
        cardOverflowsOvHorizontally: cardRect.right > ovRect.right + 2 || cardRect.left < ovRect.left - 2,
        cardOverflowsOvVertically: cardRect.bottom > ovRect.bottom + 2 || cardRect.top < ovRect.top - 2
      };
    }, longFilename);

    expect(result.titleText).toBe(longFilename);
    expect(result.titleOverflowsCardHorizontally).toBe(false);
    expect(result.cardOverflowsOvHorizontally).toBe(false);
    expect(result.cardOverflowsOvVertically).toBe(false);
  });

  test('Long filename is 100% visible on Mobile (375x667)', async ({ page }) => {
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

      return {
        titleText: ansTitle.textContent,
        titleWidth: titleRect.width,
        cardWidth: cardRect.width,
        titleOverflowsCardHorizontally: titleRect.right > cardRect.right + 2 || titleRect.left < cardRect.left - 2,
        cardOverflowsOvHorizontally: cardRect.right > ovRect.right + 2 || cardRect.left < ovRect.left - 2,
        cardOverflowsOvVertically: cardRect.bottom > ovRect.bottom + 2 || cardRect.top < ovRect.top - 2
      };
    }, longFilename);

    expect(result.titleText).toBe(longFilename);
    expect(result.titleOverflowsCardHorizontally).toBe(false);
    expect(result.cardOverflowsOvHorizontally).toBe(false);
    expect(result.cardOverflowsOvVertically).toBe(false);
  });

  test('Long filename is 100% visible on Android (412x915)', async ({ page }) => {
    await page.setViewportSize({ width: 412, height: 915 });
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

      return {
        titleText: ansTitle.textContent,
        titleWidth: titleRect.width,
        cardWidth: cardRect.width,
        titleOverflowsCardHorizontally: titleRect.right > cardRect.right + 2 || titleRect.left < cardRect.left - 2,
        cardOverflowsOvHorizontally: cardRect.right > ovRect.right + 2 || cardRect.left < ovRect.left - 2,
        cardOverflowsOvVertically: cardRect.bottom > ovRect.bottom + 2 || cardRect.top < ovRect.top - 2
      };
    }, longFilename);

    expect(result.titleText).toBe(longFilename);
    expect(result.titleOverflowsCardHorizontally).toBe(false);
    expect(result.cardOverflowsOvHorizontally).toBe(false);
    expect(result.cardOverflowsOvVertically).toBe(false);
  });

  test('Long filename is 100% visible on Tablet (768x1024)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
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

      return {
        titleText: ansTitle.textContent,
        titleWidth: titleRect.width,
        cardWidth: cardRect.width,
        titleOverflowsCardHorizontally: titleRect.right > cardRect.right + 2 || titleRect.left < cardRect.left - 2,
        cardOverflowsOvHorizontally: cardRect.right > ovRect.right + 2 || cardRect.left < ovRect.left - 2,
        cardOverflowsOvVertically: cardRect.bottom > ovRect.bottom + 2 || cardRect.top < ovRect.top - 2
      };
    }, longFilename);

    expect(result.titleText).toBe(longFilename);
    expect(result.titleOverflowsCardHorizontally).toBe(false);
    expect(result.cardOverflowsOvHorizontally).toBe(false);
    expect(result.cardOverflowsOvVertically).toBe(false);
  });

  test('Standard movie titles (INCEPTION) render boldly without overflow', async ({ page }) => {
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

      return {
        titleText: ansTitle.textContent,
        isLong: ansTitle.classList.contains('ans-title-long'),
        isXLong: ansTitle.classList.contains('ans-title-xlong'),
        titleOverflows: titleRect.right > cardRect.right + 2 || titleRect.left < cardRect.left - 2
      };
    });

    expect(result.titleText).toBe('INCEPTION');
    expect(result.isLong).toBe(false);
    expect(result.isXLong).toBe(false);
    expect(result.titleOverflows).toBe(false);
  });
});
