const { test, expect } = require('@playwright/test');

test('Homepage loads correctly', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Guess The Frame By Asmit/);
  await expect(page.locator('#homeScreen.active')).toBeVisible();
  await expect(page.locator('.h-hero')).toBeVisible();
  await expect(page.locator('.h-card-mp, .h-card-play').first()).toBeVisible();
});

test('Primary screens do not create page scrolling', async ({ page }) => {
  await page.goto('/');
  const overflow = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth - window.innerWidth,
    height: document.documentElement.scrollHeight - window.innerHeight,
    bodyWidth: document.body.scrollWidth - window.innerWidth,
    bodyHeight: document.body.scrollHeight - window.innerHeight,
  }));
  expect(overflow.width).toBeLessThanOrEqual(1);
  expect(overflow.height).toBeLessThanOrEqual(1);
  expect(overflow.bodyWidth).toBeLessThanOrEqual(1);
  expect(overflow.bodyHeight).toBeLessThanOrEqual(1);
});
test('Cinematic transition overlay supports host states', async ({ page }) => {
  await page.goto('/');
  const states = ['next', 'skip', 'pause', 'resume', 'end'];
  for (const state of states) {
    await page.evaluate((value) => {
      const ov = document.getElementById('cinematicTransition');
      ov.className = `cinematic-transition on ${value}`;
    }, state);
    await expect(page.locator(`#cinematicTransition.${state}`)).toBeVisible();
    await page.waitForTimeout(100);
  }
});
