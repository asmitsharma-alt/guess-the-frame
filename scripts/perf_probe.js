// Live performance probe. Usage: node scripts/perf_probe.js [url]
const { chromium } = require('@playwright/test');
const URL = process.argv[2] || 'https://www.scoopcast-live.in/';

const PROFILES = [
  { name: 'Desktop / no throttle', cpu: 1, net: null },
  { name: 'Slow 4G + 4x CPU slowdown (mid phone/laptop)', cpu: 4, net: { latency: 150, down: 1.6 * 1024 * 1024 / 8, up: 750 * 1024 / 8 } },
  { name: 'Fast 3G + 6x CPU slowdown (weak device)', cpu: 6, net: { latency: 300, down: 750 * 1024 / 8, up: 250 * 1024 / 8 } },
];

(async () => {
  const browser = await chromium.launch();
  for (const p of PROFILES) {
    for (const warm of [false, true]) {
      const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
      const page = await ctx.newPage();
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Network.clearBrowserCache');
      if (p.net) await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: p.net.latency, downloadThroughput: p.net.down, uploadThroughput: p.net.up });
      if (p.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: p.cpu });

      await page.addInitScript(() => {
        window.__perf = { lcp: 0, cls: 0, longTasks: 0, tbt: 0 };
        new PerformanceObserver(l => { for (const e of l.getEntries()) window.__perf.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
        new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__perf.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
        new PerformanceObserver(l => { for (const e of l.getEntries()) { window.__perf.longTasks++; if (e.duration > 50) window.__perf.tbt += e.duration - 50; } }).observe({ type: 'longtask', buffered: true });
      });

      const reqs = [];
      page.on('response', async r => {
        const h = r.headers();
        reqs.push({ url: r.url(), status: r.status(), type: r.request().resourceType(), len: Number(h['content-length'] || 0), enc: h['content-encoding'] || '', cache: h['cache-control'] || '' });
      });

      if (warm) { await page.goto(URL, { waitUntil: 'load' }); await page.waitForTimeout(2500); reqs.length = 0; }
      const t0 = Date.now();
      await page.goto(URL, { waitUntil: 'load', timeout: 90000 });
      const loadMs = Date.now() - t0;
      await page.waitForTimeout(3000);
      const nav = await page.evaluate(() => {
        const n = performance.getEntriesByType('navigation')[0];
        const fcp = performance.getEntriesByName('first-contentful-paint')[0];
        return { ttfb: Math.round(n.responseStart), dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd), fcp: fcp ? Math.round(fcp.startTime) : null, transfer: n.transferSize, ...window.__perf };
      });
      const res = await page.evaluate(() => performance.getEntriesByType('resource').map(r => ({ n: r.name, t: r.initiatorType, size: r.transferSize, dur: Math.round(r.duration) })));
      const total = res.reduce((a, r) => a + (r.size || 0), 0) + (nav.transfer || 0);
      const byType = {};
      res.forEach(r => { byType[r.t] = byType[r.t] || { n: 0, b: 0 }; byType[r.t].n++; byType[r.t].b += r.size || 0; });
      const biggest = res.sort((a, b) => b.size - a.size).slice(0, 5);

      console.log(`\n### ${p.name} | ${warm ? 'WARM (repeat visit)' : 'COLD (first visit)'}`);
      console.log(`TTFB ${nav.ttfb}ms | FCP ${nav.fcp}ms | LCP ${Math.round(nav.lcp)}ms | DOMContentLoaded ${nav.dcl}ms | load ${nav.load}ms | CLS ${nav.cls.toFixed(3)} | TBT ${Math.round(nav.tbt)}ms (${nav.longTasks} long tasks)`);
      console.log(`Requests ${res.length + 1} | Transferred ${(total / 1024).toFixed(0)} KB | HTML ${(nav.transfer / 1024).toFixed(0)} KB`);
      console.log('By type: ' + Object.entries(byType).map(([k, v]) => `${k}:${v.n}/${(v.b / 1024).toFixed(0)}KB`).join('  '));
      console.log('Heaviest: ' + biggest.map(b => `${decodeURIComponent(b.n.split('/').slice(-2).join('/')).slice(0, 40)} ${(b.size / 1024).toFixed(0)}KB`).join(' | '));
      await ctx.close();
    }
  }
  await browser.close();
})();
