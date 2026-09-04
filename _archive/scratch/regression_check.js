const { chromium } = require('playwright');
const fs = require('fs');

const viewports = [
  { name: 'desktop_1920', width: 1920, height: 1080 },
  { name: 'mobile_375', width: 375, height: 667 }
];

async function runDiagnostics() {
  console.log('Starting Playwright Regression Diagnostics...');
  
  if (!fs.existsSync('scratch/screenshots_restored')) {
    fs.mkdirSync('scratch/screenshots_restored', { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  
  for (const vp of viewports) {
    console.log(`\nTesting viewport: ${vp.name} (${vp.width}x${vp.height})`);
    
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height }
    });
    const page = await context.newPage();

    // 1. Home Screen
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });
    await page.screenshot({ path: `scratch/screenshots_restored/${vp.name}_01_home.png` });
    console.log(`  - Home screen OK`);

    // 2. Create Modal
    await page.click('.h-card-create');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `scratch/screenshots_restored/${vp.name}_02_create_modal.png` });
    console.log(`  - Create modal OK`);

    // 3. Lobby
    await page.fill('#hostNicknameInput', 'TestHost');
    await page.click('button.mp-btn-primary:has-text("CREATE ROOM")');
    
    // Wait for lobby to show up
    await page.waitForSelector('#playerLobbyScreen', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(1000); // wait for qr code and avatars to render
    await page.screenshot({ path: `scratch/screenshots_restored/${vp.name}_03_lobby.png` });
    console.log(`  - Lobby OK`);

    // 4. Start Game
    await page.click('#lobbyStartBtn');
    await page.waitForSelector('#gameScreen', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(1000);
    
    // 5. If mobile, try to open the chat drawer
    if (vp.width <= 768) {
        // Open drawer
        try {
            await page.click('#mobileChatToggleBtn');
            await page.waitForTimeout(500);
            await page.screenshot({ path: `scratch/screenshots_restored/${vp.name}_04_game_chat_open.png` });
            console.log(`  - Mobile Chat Drawer OK`);
        } catch (e) {
            console.log(`  - Could not open chat drawer: ${e.message}`);
        }
    } else {
        await page.screenshot({ path: `scratch/screenshots_restored/${vp.name}_04_game.png` });
        console.log(`  - Desktop Game Screen OK`);
    }

    await context.close();
  }

  await browser.close();
  console.log('\nDiagnostics completed successfully!');
}

runDiagnostics().catch(err => {
  console.error(err);
  process.exit(1);
});
