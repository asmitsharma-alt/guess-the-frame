const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const viewports = [
    { name: 'desktop-1280', width: 1280, height: 800 },
    { name: 'tablet-960', width: 960, height: 700 },
    { name: 'mobile-390', width: 390, height: 844 },
  ];

  for (const vp of viewports) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    await page.goto('file:///C:/Users/admin/Documents/projects/scoop main/scoopcast-live/index.html', { waitUntil: 'domcontentloaded' });

    // bypass screen restrict
    await page.evaluate(() => document.body.classList.add('bypass-restrict'));

    // Show winner screen
    await page.evaluate(() => {
      document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
      const ws = document.getElementById('winnerScreen');
      ws.style.display = 'flex';
    });

    await page.waitForTimeout(500);

    // Check credits pill bar overflow
    const metrics = await page.evaluate(() => {
      const pill = document.querySelector('.cw-credits-pill-bar');
      if (!pill) return { error: 'pill not found' };
      const cs = getComputedStyle(pill);
      return {
        scrollWidth: pill.scrollWidth,
        offsetWidth: pill.offsetWidth,
        scrollHeight: pill.scrollHeight,
        offsetHeight: pill.offsetHeight,
        overflow: pill.scrollWidth > pill.offsetWidth || pill.scrollHeight > pill.offsetHeight,
        minHeight: cs.minHeight,
        height: cs.height,
        flexShrink: cs.flexShrink,
      };
    });

    const status = metrics.overflow ? '❌ OVERFLOW' : '✅ OK';
    console.log(`\n${vp.name} (${vp.width}x${vp.height}): ${status}`);
    console.log(`  scrollW=${metrics.scrollWidth} offsetW=${metrics.offsetWidth} scrollH=${metrics.scrollHeight} offsetH=${metrics.offsetHeight}`);
    console.log(`  min-height=${metrics.minHeight} height=${metrics.height} flex-shrink=${metrics.flexShrink}`);

    // Screenshot
    await page.screenshot({ path: `scripts/test-artifacts/credits-${vp.name}.png`, fullPage: false });
    console.log(`  Screenshot: scripts/test-artifacts/credits-${vp.name}.png`);

    await ctx.close();
  }

  await browser.close();
  console.log('\nDone!');
})();
