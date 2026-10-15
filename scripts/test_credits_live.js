const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const viewports = [
    { name: 'live-desktop-1280', width: 1280, height: 800 },
    { name: 'live-mobile-390', width: 390, height: 844 },
  ];

  for (const vp of viewports) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    await page.goto('https://www.scoopcast-live.in', { waitUntil: 'domcontentloaded', timeout: 15000 });

    // bypass screen restrict
    await page.evaluate(() => document.body.classList.add('bypass-restrict'));

    // Show winner screen
    await page.evaluate(() => {
      document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
      const ws = document.getElementById('winnerScreen');
      ws.style.display = 'flex';
    });

    await page.waitForTimeout(800);

    // Check credits pill bar
    const metrics = await page.evaluate(() => {
      const pill = document.querySelector('.cw-credits-pill-bar');
      if (!pill) return { error: 'pill not found' };
      return {
        scrollWidth: pill.scrollWidth,
        offsetWidth: pill.offsetWidth,
        overflow: pill.scrollWidth > pill.offsetWidth,
        minHeight: getComputedStyle(pill).minHeight,
        flexShrink: getComputedStyle(pill).flexShrink,
      };
    });

    const status = metrics.overflow ? '❌ OVERFLOW' : '✅ OK';
    console.log(`${vp.name}: ${status} (scrollW=${metrics.scrollWidth} offsetW=${metrics.offsetWidth} min-h=${metrics.minHeight} shrink=${metrics.flexShrink})`);

    await page.screenshot({ path: `scripts/test-artifacts/credits-${vp.name}.png`, fullPage: false });
    console.log(`  Screenshot saved`);

    await ctx.close();
  }

  await browser.close();
  console.log('Done!');
})();
