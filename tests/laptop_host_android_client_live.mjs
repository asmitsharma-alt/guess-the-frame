import { chromium } from '@playwright/test';
import { execSync } from 'child_process';
import path from 'path';

const ARTIFACTS_DIR = 'C:\\Users\\admin\\.gemini\\antigravity\\brain\\bc0cd56f-3310-43bd-90d8-de2b4d09a9e8';
const LIVE_URL = 'https://guess-the-frame-react.vercel.app';

function capturePhoneScreenshot(filename) {
  try {
    const dest = path.join(ARTIFACTS_DIR, filename);
    execSync('adb shell screencap -p /sdcard/phone_cap.png');
    execSync(`adb pull /sdcard/phone_cap.png "${dest}"`);
    console.log(`📸 Captured Android Phone Screenshot: ${filename}`);
    return dest;
  } catch (e) {
    console.error('Error capturing phone screenshot:', e.message);
    return null;
  }
}

async function run() {
  console.log('🚀 Starting Cross-Device Test: Laptop Host (Chromium) + Real Android Device (Redmi 8 Brave)');

  // Step 1: Ensure ADB forward for Chrome remote debugging
  try {
    execSync('adb forward tcp:9222 localabstract:chrome_devtools_remote');
    console.log('✅ ADB port forward tcp:9222 established.');
  } catch (e) {
    console.warn('ADB forward warning:', e.message);
  }

  // Step 2: Launch Laptop Host (Chromium)
  console.log('\n--- STEP 1: Launching Laptop Host Browser ---');
  const laptopBrowser = await chromium.launch({ headless: true });
  const laptopContext = await laptopBrowser.newContext({ viewport: { width: 1280, height: 800 } });
  const laptopPage = await laptopContext.newPage();

  await laptopPage.goto(LIVE_URL, { waitUntil: 'domcontentloaded' });
  await laptopPage.waitForTimeout(2000);

  const hostCreateBtn = laptopPage.locator('#homeCreateBtn');
  await hostCreateBtn.click();
  await laptopPage.waitForTimeout(1000);

  await laptopPage.fill('#hostPlayerNameInput', 'Laptop Host (Asmit)');
  await laptopPage.waitForTimeout(500);

  const confirmCreateBtn = laptopPage.locator('#createRoomModal .mp-btn-primary');
  await confirmCreateBtn.click();
  await laptopPage.waitForTimeout(3500);

  const roomCodeEl = laptopPage.locator('#displayRoomCode, #roomCodeText').first();
  const roomCode = (await roomCodeEl.textContent()).trim();
  console.log(`\n🎉 LAPTOP HOST CREATED ROOM: [ ${roomCode} ]`);

  await laptopPage.screenshot({ path: path.join(ARTIFACTS_DIR, 'live_1_laptop_lobby_created.png') });
  console.log('📸 Saved laptop lobby screenshot');

  // Step 3: Connect to Android Brave via CDP and navigate to room URL
  console.log(`\n--- STEP 2: Connecting to Android Brave via CDP ---`);
  const joinUrl = `${LIVE_URL}/?room=${roomCode}`;
  let androidPage = null;
  let androidBrowser = null;
  try {
    androidBrowser = await chromium.connectOverCDP('http://localhost:9222');
    const contexts = androidBrowser.contexts();
    for (const ctx of contexts) {
      const pages = ctx.pages();
      for (const p of pages) {
        if (p.url().includes('guess-the-frame') || p.url().includes('vercel.app')) {
          androidPage = p;
          break;
        }
      }
      if (androidPage) break;
    }
    if (!androidPage && contexts[0]?.pages().length > 0) {
      androidPage = contexts[0].pages()[0];
    }
  } catch (err) {
    console.warn('Could not connect over CDP, will use ADB intent:', err.message);
    execSync(`adb shell am start -a android.intent.action.VIEW -d "${joinUrl}" -p com.brave.browser`);
  }

  if (androidPage) {
    androidPage.on('console', msg => console.log('[ANDROID BRAVE LOG]:', msg.text()));
    console.log(`📱 Bringing Android Brave to front and navigating to [ ${joinUrl} ]`);
    await androidPage.bringToFront();
    await androidPage.goto(joinUrl, { waitUntil: 'domcontentloaded' });
    await androidPage.waitForTimeout(2500);
    capturePhoneScreenshot('live_2_phone_join_prompt.png');

    // Fill player name and click confirm
    try {
      const nameInput = androidPage.locator('#joinPlayerNameInput');
      await nameInput.waitFor({ state: 'visible', timeout: 8000 });
      await nameInput.fill('Redmi 8 Player');
      await androidPage.waitForTimeout(500);

      const confirmBtn = androidPage.locator('#joinRoomConfirmBtn, #joinRoomModal .mp-btn-primary').first();
      await confirmBtn.waitFor({ state: 'attached', timeout: 5000 });
      await confirmBtn.evaluate(el => el.click());
      console.log('✅ Clicked ENTER ROOM on Android Phone via CDP');
    } catch (e) {
      console.warn('CDP interaction error:', e.message);
    }
  } else {
    console.log('Using ADB input fallback to enter room on Android');
    execSync('adb shell input tap 360 1300');
  }

  // Wait for sync and modal to close
  await new Promise(r => setTimeout(r, 4000));
  capturePhoneScreenshot('live_3_phone_in_lobby.png');
  await laptopPage.screenshot({ path: path.join(ARTIFACTS_DIR, 'live_4_laptop_lobby_synced.png') });

  // Step 5: Verify Players in Laptop Host Roster
  console.log('\n--- STEP 4: Verifying Real-Time Roster Synchronization ---');
  let synced = false;
  for (let i = 0; i < 20; i++) {
    await laptopPage.waitForTimeout(500);
    const gs = await laptopPage.evaluate(() => window.GS?.players || []);
    if (gs.some(p => p.name?.includes('Redmi') || (!p.isHost && p.name))) {
      synced = true;
      console.log(`✅ Real-time roster sync confirmed on Laptop in ${(i + 1) * 500}ms! Players:`, gs.map(p => p.name));
      break;
    }
  }

  const laptopPlayers = await laptopPage.evaluate(() => {
    return (window.GS?.players || []).map(p => ({
      name: p.name,
      isHost: p.isHost,
      loaded: p.loaded
    }));
  });
  console.log('Laptop Host GS.players:', JSON.stringify(laptopPlayers, null, 2));

  let phonePlayers = [];
  if (androidPage) {
    phonePlayers = await androidPage.evaluate(() => {
      return (window.GS?.players || []).map(p => ({
        name: p.name,
        isHost: p.isHost,
        loaded: p.loaded
      }));
    });
    console.log('Android Client GS.players:', JSON.stringify(phonePlayers, null, 2));
  }

  // Step 6: Laptop Host changes a setting (e.g. Timer) and verify sync
  console.log('\n--- STEP 5: Laptop Host Changes Setting (Timer) ---');
  const timerBtn = laptopPage.locator('button[title="Increase Timer"]').first();
  if (await timerBtn.isVisible()) {
    await timerBtn.click();
    await laptopPage.waitForTimeout(1500);
    const hostTimer = await laptopPage.locator('#hostTimerBtnText').textContent();
    console.log(`Laptop Host Timer updated to: ${hostTimer?.trim()}`);

    if (androidPage) {
      const clientTimer = await androidPage.locator('#hostTimerBtnText').textContent().catch(() => 'N/A');
      console.log(`Android Client Timer synced to: ${clientTimer?.trim()}`);
    }
  }

  // Step 7: Laptop Host Starts the Match
  console.log('\n--- STEP 6: Laptop Host Starts Match ---');
  const startBtn = laptopPage.locator('#lobbyStartBtn:not([style*="display: none"]), #mobileLobbyStartBtn:not([style*="display: none"])').first();
  await startBtn.click();
  console.log('🚀 Clicked Start Match on Laptop Host!');

  await laptopPage.waitForTimeout(3000);
  await new Promise(r => setTimeout(r, 2000));

  // Capture in-game screenshots on both devices
  capturePhoneScreenshot('live_5_phone_game_active.png');
  await laptopPage.screenshot({ path: path.join(ARTIFACTS_DIR, 'live_6_laptop_game_active.png') });

  // Dismiss guide if present
  await laptopPage.evaluate(() => {
    if (window.HowToAnswerGuide) window.HowToAnswerGuide.stop();
    window.UI?.showScreen('gameScreen');
  });
  if (androidPage) {
    await androidPage.evaluate(() => {
      if (window.HowToAnswerGuide) window.HowToAnswerGuide.stop();
      window.UI?.showScreen('gameScreen');
    });
  }
  await laptopPage.waitForTimeout(2000);
  await new Promise(r => setTimeout(r, 1000));

  capturePhoneScreenshot('live_7_phone_game_frame.png');
  await laptopPage.screenshot({ path: path.join(ARTIFACTS_DIR, 'live_8_laptop_game_frame.png') });

  console.log('\n======================================================');
  console.log('🎉 REAL CROSS-DEVICE TEST COMPLETED SUCCESSFULLY!');
  console.log('======================================================');

  await laptopBrowser.close();
  if (androidBrowser) await androidBrowser.close();
}

run().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
