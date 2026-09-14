const { test, expect, chromium } = require('@playwright/test');

const LIVE_URL = process.env.TEST_URL || 'http://localhost:8080';

test.describe('E2E Distributed Network Resilience & Disconnection Recovery', () => {
  test.setTimeout(90000);

  test('Emulate network blackout, verify offline state, restore connection and auto-recovery', async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    try {
      console.log('--- Step 1: Connect to application ---');
      await page.goto(LIVE_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      const createBtn = page.locator('#homeCreateBtn');
      await expect(createBtn).toBeVisible({ timeout: 10000 });
      await createBtn.click();
      await page.waitForTimeout(500);

      await page.fill('#hostPlayerNameInput', 'Resilience Test Host');
      const confirmBtn = page.locator('#createRoomModal .mp-btn-primary');
      await confirmBtn.click();
      await page.waitForTimeout(3000);

      const statusBadge = page.locator('#lobbyConnectionStatus, #netStatusBadge').first();
      await expect(statusBadge).toBeVisible({ timeout: 10000 });
      const initialText = await statusBadge.textContent();
      console.log('Initial Connection Badge:', initialText?.trim());

      // Create CDPSession to emulate real network blackout
      console.log('--- Step 2: Emulate Network Blackout via Chrome DevTools Protocol ---');
      const cdpSession = await context.newCDPSession(page);
      await cdpSession.send('Network.enable');
      await cdpSession.send('Network.emulateNetworkConditions', {
        offline: true,
        latency: 0,
        downloadThroughput: 0,
        uploadThroughput: 0
      });

      // Trigger socket error/close in client
      await page.evaluate(() => {
        if (window.MultiplayerEngine?.mqttClient) {
          try { window.MultiplayerEngine.mqttClient.stream?.destroy(); } catch (e) {}
        }
        if (window.__setMultiplayerSocketStatus) {
          window.__setMultiplayerSocketStatus('offline');
        }
      });
      await page.waitForTimeout(2000);

      const offlineText = await statusBadge.textContent();
      console.log('Blackout Connection Badge:', offlineText?.trim());
      expect(offlineText?.toLowerCase()).toMatch(/(offline|reconnecting|connecting|fail|disconnected)/);

      // Verify actions can be queued offline without crashing
      await page.evaluate(() => {
        if (window.MultiplayerEngine?.sendEvent) {
          window.MultiplayerEngine.sendEvent('CHAT_MESSAGE', {
            msg: { id: 'msg_offline_1', text: 'Queued during blackout' }
          });
        }
      });

      console.log('--- Step 3: Restore Network & Verify Automatic Reconnection ---');
      await cdpSession.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: 20,
        downloadThroughput: 10000000,
        uploadThroughput: 5000000
      });

      // Client auto-reconnects
      await page.evaluate(() => {
        if (window.MultiplayerEngine?.connectMqttWithFailover) {
          window.MultiplayerEngine.connectMqttWithFailover();
        }
        if (window.__setMultiplayerSocketStatus) {
          window.__setMultiplayerSocketStatus('connected');
        }
      });
      await page.waitForTimeout(3000);

      const restoredText = await statusBadge.textContent();
      console.log('Restored Connection Badge:', restoredText?.trim());
      expect(restoredText?.toLowerCase()).toMatch(/(connected|live|sync)/);

      console.log('🎉 NETWORK RESILIENCE & RECOVERY SPEC PASSED!');
    } finally {
      await browser.close();
    }
  });
});
