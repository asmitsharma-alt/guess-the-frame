const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\admin\\.gemini\\antigravity\\brain\\bc0cd56f-3310-43bd-90d8-de2b4d09a9e8';
const BASE_URL = 'https://guess-the-frame-react.vercel.app';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('--- STARTING COMPREHENSIVE VERIFICATION ---');
  const browser = await chromium.launch({ headless: true });

  // 1. DESKTOP BASELINE (1440x900)
  console.log('\n[1] Verifying Desktop (1440x900)...');
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto(BASE_URL + '/?t=' + Date.now(), { waitUntil: 'networkidle' });
  await sleep(1000);
  await desktopPage.screenshot({ path: path.join(ARTIFACT_DIR, 'desktop_1_home.png') });
  console.log('Captured desktop_1_home.png');

  // Desktop Join Modal
  await desktopPage.click('#homeJoinBtn');
  await sleep(1000);
  await desktopPage.screenshot({ path: path.join(ARTIFACT_DIR, 'desktop_2_join_modal.png') });
  console.log('Captured desktop_2_join_modal.png');
  await desktopPage.click('#joinRoomModal .mp-modal-close');
  await sleep(500);

  // Desktop Create Modal
  await desktopPage.click('#homeCreateBtn');
  await sleep(1000);
  await desktopPage.screenshot({ path: path.join(ARTIFACT_DIR, 'desktop_3_create_modal.png') });
  console.log('Captured desktop_3_create_modal.png');

  // Desktop Lobby
  await desktopPage.click('#createRoomConfirmBtn');
  await sleep(1500);
  await desktopPage.screenshot({ path: path.join(ARTIFACT_DIR, 'desktop_4_lobby.png') });
  console.log('Captured desktop_4_lobby.png');

  // Desktop Game
  const startBtn = await desktopPage.$('#lobbyStartBtn');
  if (startBtn) {
    await startBtn.click();
    await sleep(2500);
    await desktopPage.screenshot({ path: path.join(ARTIFACT_DIR, 'desktop_5_game.png') });
    console.log('Captured desktop_5_game.png');
  }
  await desktopContext.close();

  // 2. ANDROID MOBILE (360x760, Redmi 8 / Compact Android)
  console.log('\n[2] Verifying Android Mobile 360x760...');
  const mobileContext360 = await browser.newContext({
    viewport: { width: 360, height: 760 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 10; Redmi 8 Build/QKQ1.191014.001) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
  });
  const mobilePage360 = await mobileContext360.newPage();
  await mobilePage360.goto(BASE_URL + '/?t=' + Date.now(), { waitUntil: 'networkidle' });
  await sleep(1000);
  await mobilePage360.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_360_1_home.png') });
  console.log('Captured mobile_360_1_home.png');

  // Join Room Modal on 360px
  await mobilePage360.click('#homeJoinBtn');
  await sleep(1200);
  await mobilePage360.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_360_2_join_modal.png') });
  console.log('Captured mobile_360_2_join_modal.png');
  await mobilePage360.click('#joinRoomModal .mp-modal-close');
  await sleep(500);

  // Create Room Modal on 360px
  await mobilePage360.click('#homeCreateBtn');
  await sleep(1200);
  await mobilePage360.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_360_3_create_modal.png') });
  console.log('Captured mobile_360_3_create_modal.png');

  // Create Lobby on 360px
  await mobilePage360.click('#createRoomConfirmBtn');
  await sleep(1500);
  await mobilePage360.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_360_4_lobby.png') });
  console.log('Captured mobile_360_4_lobby.png');

  // Launch Game on 360px
  const mobileStartBtn = await mobilePage360.$('#mobileLobbyStartBtn') || await mobilePage360.$('#lobbyStartBtn');
  if (mobileStartBtn) {
    await mobileStartBtn.click();
    console.log('Clicked start match in lobby, waiting for HowToAnswerScreen...');
    await sleep(2500);
    await mobilePage360.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_360_5_how_to_play.png') });
    console.log('Captured mobile_360_5_how_to_play.png');

    // Wait for HowToAnswerScreen countdown or accelerate it
    await mobilePage360.evaluate(() => {
      if (window.HowToAnswerGuide) {
        window.HowToAnswerGuide._secondsLeft = 0;
      }
    });
    await sleep(1500);

    const htaBtn = await mobilePage360.$('#htaHostStartBtn');
    if (htaBtn) {
      console.log('Clicking START GAME on HowToAnswerScreen...');
      await htaBtn.click({ force: true });
      await sleep(3000);
      await mobilePage360.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_360_6_game_round.png') });
      console.log('Captured mobile_360_6_game_round.png');

      // Open Mobile Chat Drawer
      try {
        await mobilePage360.waitForSelector('#mobileChatToggleBtn', { timeout: 8000 });
        await mobilePage360.click('#mobileChatToggleBtn');
        await sleep(1000);
        await mobilePage360.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_360_7_chat_drawer.png') });
        console.log('Captured mobile_360_7_chat_drawer.png');
      } catch (e) {
        console.log('Could not open mobile chat drawer:', e.message);
      }
    }
  }
  await mobileContext360.close();

  // 3. ANDROID MOBILE (390x844, Standard Android / Modern)
  console.log('\n[3] Verifying Android Mobile 390x844...');
  const mobileContext390 = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  const mobilePage390 = await mobileContext390.newPage();
  await mobilePage390.goto(BASE_URL + '/?t=' + Date.now(), { waitUntil: 'networkidle' });
  await sleep(1000);
  await mobilePage390.click('#homeJoinBtn');
  await sleep(1000);
  await mobilePage390.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_390_join_modal.png') });
  console.log('Captured mobile_390_join_modal.png');
  await mobileContext390.close();

  // 4. ANDROID MOBILE (412x915, Large Screen Android / Samsung S24)
  console.log('\n[4] Verifying Android Mobile 412x915...');
  const mobileContext412 = await browser.newContext({
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  const mobilePage412 = await mobileContext412.newPage();
  await mobilePage412.goto(BASE_URL + '/?t=' + Date.now(), { waitUntil: 'networkidle' });
  await sleep(1000);
  await mobilePage412.click('#homeCreateBtn');
  await sleep(1000);
  await mobilePage412.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_412_create_modal.png') });
  console.log('Captured mobile_412_create_modal.png');
  await mobileContext412.close();

  await browser.close();
  console.log('\n--- PLAYWRIGHT VERIFICATION COMPLETE ---');
}

run().catch(err => {
  console.error('Error running verification:', err);
  process.exit(1);
});
