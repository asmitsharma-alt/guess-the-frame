const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 950 } });
  await page.goto('file:///' + path.resolve('index.html').replace(/\\/g, '/'));

  await page.evaluate(() => {
    GS.players = [
      { id: '1', name: 'Aman', score: 25, avatar: 'aman', isHost: true },
      { id: '2', name: 'Vish', score: 18, avatar: 'vish' },
      { id: '3', name: 'Aziz', score: 12, avatar: 'aziz' }
    ];
    UI.showScreen('winnerScreen');
    if (typeof UI.renderFinalLB === 'function') {
      UI.renderFinalLB();
    }
  });

  if (!fs.existsSync('scripts/test-artifacts')) {
    fs.mkdirSync('scripts/test-artifacts', { recursive: true });
  }

  const barInfo = await page.evaluate(() => {
    const bar = document.querySelector('.cw-credits-pill-bar');
    const badge = document.querySelector('.cw-credit-badge');
    const names = document.querySelector('.cw-credit-names');
    const msg = document.getElementById('creatorMsg');
    return {
      bar: {
        width: bar.offsetWidth,
        scrollWidth: bar.scrollWidth,
        height: bar.offsetHeight,
        scrollHeight: bar.scrollHeight,
        overflowX: bar.scrollWidth > bar.offsetWidth,
        overflowY: bar.scrollHeight > bar.offsetHeight
      },
      badge: {
        text: badge?.innerText,
        box: badge?.getBoundingClientRect()
      },
      names: {
        text: names?.innerText,
        box: names?.getBoundingClientRect()
      },
      creatorMsg: {
        text: msg?.innerText,
        box: msg?.getBoundingClientRect()
      }
    };
  });

  console.log('Desktop Credits Info:', JSON.stringify(barInfo, null, 2));
  await page.locator('.cw-credits-pill-bar').screenshot({ path: 'scripts/test-artifacts/credits_bar_desktop.png' });
  await page.screenshot({ path: 'scripts/test-artifacts/winner_screen_desktop.png' });

  // Mobile
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileBarInfo = await page.evaluate(() => {
    const bar = document.querySelector('.cw-credits-pill-bar');
    return {
      width: bar.offsetWidth,
      scrollWidth: bar.scrollWidth,
      height: bar.offsetHeight,
      scrollHeight: bar.scrollHeight,
      overflowX: bar.scrollWidth > bar.offsetWidth,
      overflowY: bar.scrollHeight > bar.offsetHeight
    };
  });
  console.log('Mobile Credits Info:', JSON.stringify(mobileBarInfo, null, 2));
  await page.locator('.cw-credits-pill-bar').screenshot({ path: 'scripts/test-artifacts/credits_bar_mobile.png' });
  await page.screenshot({ path: 'scripts/test-artifacts/winner_screen_mobile.png' });

  await browser.close();
})();
