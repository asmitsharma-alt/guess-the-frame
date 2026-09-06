const { test, expect } = require('@playwright/test');

test('Homepage loads correctly', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Guess The Frame By Asmit/);
  await expect(page.locator('#homeScreen.active')).toBeVisible();
  await expect(page.locator('.h-hero')).toBeVisible();
  await expect(page.locator('.h-card-mp, .h-card-play').first()).toBeVisible();
});

test('Primary screens do not create horizontal page overflow', async ({ page }) => {
  await page.goto('/');
  const overflow = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth - window.innerWidth,
    bodyWidth: document.body.scrollWidth - window.innerWidth,
  }));
  expect(overflow.width).toBeLessThanOrEqual(1);
  expect(overflow.bodyWidth).toBeLessThanOrEqual(1);
});

test('Section intro transition overlay renders and toggles properly', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const ov = document.getElementById('secIntroOv');
    if (ov) ov.classList.add('on');
  });
  await expect(page.locator('#secIntroOv.on')).toBeVisible();
  await page.evaluate(() => {
    const ov = document.getElementById('secIntroOv');
    if (ov) ov.classList.remove('on');
  });
  await expect(page.locator('#secIntroOv')).not.toHaveClass(/on/);
});
