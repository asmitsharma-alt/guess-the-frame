const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:/Users/admin/.gemini/antigravity-cli/brain/f6f7defb-2368-4c78-8e57-7ec41aed59e0';

test.describe('Frame Loading & Visibility Verification', () => {
  test.setTimeout(60000);

  test('Localhost: Test Section 1 Movie Frame loading, rendering, and visibility', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Start a match directly into Section 1 Frame 1
    const frameStatus = await page.evaluate(async () => {
      // 1. Setup local match state
      UI.showScreen('gameScreen');
      const s1 = GS.sections.find(s => s.id === 1);
      const frameItem = { ...s1.frames[0], sectionName: 'Guess the Frame', sectionId: 1 };
      MultiplayerEngine.currentPlaylist = [frameItem];
      MultiplayerEngine.currentPlayIndex = 0;
      MultiplayerEngine.hostSettings = { rounds: 1, timer: 30 };

      // 2. Start round
      MultiplayerEngine.startRound(0);

      // Wait for image load and 400ms CSS fade-in transition
      let loaded = false;
      for (let i = 0; i < 50; i++) {
        const img = document.querySelector('#imageContainer img.frame-image');
        if (img && img.classList.contains('loaded') && img.complete && img.naturalWidth > 0) {
          loaded = true;
          break;
        }
        await new Promise(r => setTimeout(r, 100));
      }
      await new Promise(r => setTimeout(r, 600));

      const img = document.querySelector('#imageContainer img.frame-image');
      const container = document.getElementById('imageContainer');
      const display = document.getElementById('frameDisplay');
      const ph = document.getElementById('framePlaceholder');
      const loader = document.getElementById('frameStageLoader');

      const imgComputed = img ? window.getComputedStyle(img) : null;
      const rect = img ? img.getBoundingClientRect() : null;

      const matchingRules = [];
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule.selectorText && img.matches(rule.selectorText)) {
              if (rule.style.opacity) {
                matchingRules.push({ selector: rule.selectorText, opacity: rule.style.opacity });
              }
            }
          }
        } catch (e) {}
      }

      return {
        loaded,
        imgSrc: img ? img.src : null,
        imgOuterHTML: img ? img.outerHTML : null,
        naturalWidth: img ? img.naturalWidth : 0,
        naturalHeight: img ? img.naturalHeight : 0,
        matchingRules,
        opacity: imgComputed ? imgComputed.opacity : null,
        display: imgComputed ? imgComputed.display : null,
        visibility: imgComputed ? imgComputed.visibility : null,
        rect: rect ? { width: rect.width, height: rect.height, top: rect.top, left: rect.left } : null,
        placeholderHidden: ph ? ph.classList.contains('hidden') : false,
        loaderDisplay: loader ? window.getComputedStyle(loader).display : null,
        displayVisible: display ? window.getComputedStyle(display).display !== 'none' : false,
        containerVisible: container ? window.getComputedStyle(container).display !== 'none' : false
      };
    });

    console.log('FRAME LOADING STATUS (Localhost):', JSON.stringify(frameStatus, null, 2));

    expect(frameStatus.loaded).toBe(true);
    expect(frameStatus.naturalWidth).toBeGreaterThan(0);
    expect(frameStatus.naturalHeight).toBeGreaterThan(0);
    expect(Number(frameStatus.opacity)).toBe(1);
    expect(frameStatus.display).not.toBe('none');
    expect(frameStatus.visibility).not.toBe('hidden');
    expect(frameStatus.rect.width).toBeGreaterThan(100);
    expect(frameStatus.rect.height).toBeGreaterThan(100);
    expect(frameStatus.placeholderHidden).toBe(true);
    expect(frameStatus.displayVisible).toBe(true);
    expect(frameStatus.containerVisible).toBe(true);
    expect(frameStatus.display).not.toBe('none');
    expect(frameStatus.visibility).not.toBe('hidden');
    expect(frameStatus.rect.width).toBeGreaterThan(100);
    expect(frameStatus.rect.height).toBeGreaterThan(100);
    expect(frameStatus.placeholderHidden).toBe(true);
    expect(frameStatus.displayVisible).toBe(true);
    expect(frameStatus.containerVisible).toBe(true);

    // Save screenshot of loaded frame
    const screenshotPath = path.join(ARTIFACT_DIR, 'frame_loading_visible_desktop.png');
    await page.screenshot({ path: screenshotPath });
    expect(fs.existsSync(screenshotPath)).toBe(true);
  });

  test('Localhost Mobile (412x915): Test Frame loading and visibility on Android viewport', async ({ page }) => {
    await page.setViewportSize({ width: 412, height: 915 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const frameStatus = await page.evaluate(async () => {
      document.body.classList.add('bypass-restrict');
      UI.showScreen('gameScreen');
      const s1 = GS.sections.find(s => s.id === 1);
      const frameItem = { ...s1.frames[0], sectionName: 'Guess the Frame', sectionId: 1 };
      MultiplayerEngine.currentPlaylist = [frameItem];
      MultiplayerEngine.currentPlayIndex = 0;
      MultiplayerEngine.hostSettings = { rounds: 1, timer: 30 };

      MultiplayerEngine.startRound(0);

      let loaded = false;
      for (let i = 0; i < 50; i++) {
        const img = document.querySelector('#imageContainer img.frame-image');
        if (img && img.classList.contains('loaded') && img.complete && img.naturalWidth > 0) {
          loaded = true;
          break;
        }
        await new Promise(r => setTimeout(r, 100));
      }
      await new Promise(r => setTimeout(r, 600));

      const img = document.querySelector('#imageContainer img.frame-image');
      const rect = img ? img.getBoundingClientRect() : null;
      const imgComputed = img ? window.getComputedStyle(img) : null;

      return {
        loaded,
        naturalWidth: img ? img.naturalWidth : 0,
        naturalHeight: img ? img.naturalHeight : 0,
        opacity: imgComputed ? imgComputed.opacity : null,
        rect: rect ? { width: rect.width, height: rect.height } : null
      };
    });

    console.log('FRAME LOADING STATUS (Mobile):', JSON.stringify(frameStatus, null, 2));

    expect(frameStatus.loaded).toBe(true);
    expect(frameStatus.naturalWidth).toBeGreaterThan(0);
    expect(Number(frameStatus.opacity)).toBe(1);
    expect(frameStatus.rect.width).toBeGreaterThan(100);

    const mobileScreenshot = path.join(ARTIFACT_DIR, 'frame_loading_visible_mobile.png');
    await page.screenshot({ path: mobileScreenshot });
    expect(fs.existsSync(mobileScreenshot)).toBe(true);
  });

  test('Production (www.scoopcast-live.in): Test live frame loading & visibility', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('https://www.scoopcast-live.in', { timeout: 30000 });
    await page.waitForLoadState('domcontentloaded');

    const liveStatus = await page.evaluate(async () => {
      document.body.classList.add('bypass-restrict');
      UI.showScreen('gameScreen');
      const s1 = GS.sections.find(s => s.id === 1);
      const frameItem = { ...s1.frames[0], sectionName: 'Guess the Frame', sectionId: 1 };
      MultiplayerEngine.currentPlaylist = [frameItem];
      MultiplayerEngine.currentPlayIndex = 0;
      MultiplayerEngine.hostSettings = { rounds: 1, timer: 30 };

      MultiplayerEngine.startRound(0);

      let loaded = false;
      for (let i = 0; i < 60; i++) {
        const img = document.querySelector('#imageContainer img.frame-image');
        if (img && img.classList.contains('loaded') && img.complete && img.naturalWidth > 0) {
          loaded = true;
          break;
        }
        await new Promise(r => setTimeout(r, 100));
      }
      await new Promise(r => setTimeout(r, 600));

      const img = document.querySelector('#imageContainer img.frame-image');
      const rect = img ? img.getBoundingClientRect() : null;
      const imgComputed = img ? window.getComputedStyle(img) : null;

      return {
        loaded,
        imgSrc: img ? img.src : null,
        imgClasses: img ? img.className : null,
        naturalWidth: img ? img.naturalWidth : 0,
        naturalHeight: img ? img.naturalHeight : 0,
        opacity: imgComputed ? imgComputed.opacity : null,
        display: imgComputed ? imgComputed.display : null,
        rect: rect ? { width: rect.width, height: rect.height } : null
      };
    });

    console.log('FRAME LOADING STATUS (Production):', JSON.stringify(liveStatus, null, 2));

    expect(liveStatus.naturalWidth).toBeGreaterThan(0);
    expect(liveStatus.rect.width).toBeGreaterThan(100);

    const prodScreenshot = path.join(ARTIFACT_DIR, 'frame_loading_visible_production.png');
    await page.screenshot({ path: prodScreenshot });
    expect(fs.existsSync(prodScreenshot)).toBe(true);
  });
});
