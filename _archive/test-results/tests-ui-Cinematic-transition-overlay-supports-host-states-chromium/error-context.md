# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\ui.spec.js >> Cinematic transition overlay supports host states
- Location: tests\ui.spec.js:24:1

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8080/
Call log:
  - navigating to "http://localhost:8080/", waiting until "load"

```

# Test source

```ts
  1  | const { test, expect } = require('@playwright/test');
  2  | 
  3  | test('Homepage loads correctly', async ({ page }) => {
  4  |   await page.goto('/');
  5  |   await expect(page).toHaveTitle(/Guess The Frame By Asmit/);
  6  |   await expect(page.locator('#homeScreen.active')).toBeVisible();
  7  |   await expect(page.locator('.h-hero')).toBeVisible();
  8  |   await expect(page.locator('.h-card-mp, .h-card-play').first()).toBeVisible();
  9  | });
  10 | 
  11 | test('Primary screens do not create page scrolling', async ({ page }) => {
  12 |   await page.goto('/');
  13 |   const overflow = await page.evaluate(() => ({
  14 |     width: document.documentElement.scrollWidth - window.innerWidth,
  15 |     height: document.documentElement.scrollHeight - window.innerHeight,
  16 |     bodyWidth: document.body.scrollWidth - window.innerWidth,
  17 |     bodyHeight: document.body.scrollHeight - window.innerHeight,
  18 |   }));
  19 |   expect(overflow.width).toBeLessThanOrEqual(1);
  20 |   expect(overflow.height).toBeLessThanOrEqual(1);
  21 |   expect(overflow.bodyWidth).toBeLessThanOrEqual(1);
  22 |   expect(overflow.bodyHeight).toBeLessThanOrEqual(1);
  23 | });
  24 | test('Cinematic transition overlay supports host states', async ({ page }) => {
> 25 |   await page.goto('/');
     |              ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8080/
  26 |   const states = ['next', 'skip', 'pause', 'resume', 'end'];
  27 |   for (const state of states) {
  28 |     await page.evaluate((value) => {
  29 |       const ov = document.getElementById('cinematicTransition');
  30 |       ov.className = `cinematic-transition on ${value}`;
  31 |     }, state);
  32 |     await expect(page.locator(`#cinematicTransition.${state}`)).toBeVisible();
  33 |     await page.waitForTimeout(100);
  34 |   }
  35 | });
  36 | 
```