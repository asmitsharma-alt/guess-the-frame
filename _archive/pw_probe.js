// Probe the site: capture console messages, page errors, failed requests, and screenshots.
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  const logs = [];
  page.on('console', (m) => logs.push(`[console.${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  page.on('requestfailed', (r) => logs.push(`[requestfailed] ${r.url()} :: ${r.failure()?.errorText}`));
  page.on('response', (r) => { if (r.status() >= 400) logs.push(`[http ${r.status()}] ${r.url()}`); });

  await page.goto('http://127.0.0.1:8321/index.html', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(2500);

  await page.screenshot({ path: 'pw_shots/01_home.png', fullPage: false });

  // Basic structural info
  const info = await page.evaluate(() => {
    const screens = [...document.querySelectorAll('.screen')].map(s => ({
      id: s.id,
      active: s.classList.contains('active'),
      visible: getComputedStyle(s).display !== 'none'
    }));
    return {
      title: document.title,
      bodyChildren: document.body.children.length,
      screens,
      hasApp: !!document.getElementById('app')
    };
  });
  console.log('STRUCTURE:', JSON.stringify(info, null, 2));
  console.log('LOGS:\n' + logs.join('\n'));

  await browser.close();
})().catch((e) => { console.error('SCRIPT FAILED:', e); process.exit(1); });
