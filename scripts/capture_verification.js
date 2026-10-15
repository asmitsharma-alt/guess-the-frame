const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function runVerification() {
  const artifactDir = path.resolve('C:/Users/admin/.gemini/antigravity-cli/brain/a54b6ceb-9d32-4bb5-8f71-7de2893bbccb');
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const page = await browser.newPage();

  console.log('1. Loading game on localhost:8080...');
  await page.goto('http://localhost:8080/');
  await page.waitForLoadState('domcontentloaded');

  // Setup game state with players and active game screen
  await page.evaluate(() => {
    GS.players = [
      { id: 'p1', name: 'Asmit (Host)', score: 30, avatar: 'aman' },
      { id: 'p2', name: 'Rohan', score: 20, avatar: 'aziz' },
      { id: 'p3', name: 'Priya', score: 10, avatar: 'vish' }
    ];
    document.getElementById('timerTxt').textContent = '24';
    UI.renderLB();
    UI.showScreen('gameScreen');
  });

  // 1. Tall Desktop Screen (1280x950) -> Default Stacked
  await page.setViewportSize({ width: 1280, height: 950 });
  await page.waitForTimeout(400);

  const tallStripDir = await page.locator('#sidebarTopStrip').evaluate(el => window.getComputedStyle(el).flexDirection);
  console.log(`[Tall Viewport 1280x950] Top strip direction: ${tallStripDir}`);

  const tallPath = path.join(artifactDir, 'tall_stacked_view.png');
  await page.screenshot({ path: tallPath });
  console.log(`Saved: ${tallPath}`);

  // 2. Zoomed-in Simulation (1280x680) -> Automatically Side-by-Side
  await page.setViewportSize({ width: 1280, height: 680 });
  await page.waitForTimeout(400);

  const zoomedStripDir = await page.locator('#sidebarTopStrip').evaluate(el => window.getComputedStyle(el).flexDirection);
  const controlsBox = await page.locator('#sidebarTopStrip .panel-sec-controls').boundingBox();
  const lbBox = await page.locator('#sidebarTopStrip .panel-sec-leaderboard').boundingBox();
  const chatInputBox = await page.locator('#chatTextInput').boundingBox();

  console.log(`[Zoomed Viewport 1280x680] Top strip direction: ${zoomedStripDir}`);
  console.log(`[Timer Box] y: ${controlsBox.y}, height: ${controlsBox.height}, width: ${controlsBox.width}`);
  console.log(`[Scoreboard Box] y: ${lbBox.y}, height: ${lbBox.height}, width: ${lbBox.width}`);
  console.log(`[Y Difference]: ${Math.abs(controlsBox.y - lbBox.y)}px (Same line if <= 5px)`);
  console.log(`[Chat Input Box] y: ${chatInputBox.y} (Visible in viewport height 680: ${chatInputBox.y < 680})`);

  const zoomedPath = path.join(artifactDir, 'zoomed_side_by_side.png');
  await page.screenshot({ path: zoomedPath });
  console.log(`Saved: ${zoomedPath}`);

  // 3. Answering Mode with Input Focused
  await page.locator('#chatTextInput').focus();
  await page.locator('#chatTextInput').fill('Interstellar');
  await page.waitForTimeout(300);

  const answeringPath = path.join(artifactDir, 'answering_mode_focused.png');
  await page.screenshot({ path: answeringPath });
  console.log(`Saved: ${answeringPath}`);

  // 4. Mobile / Android Screen (412x915)
  await page.setViewportSize({ width: 412, height: 915 });
  await page.waitForTimeout(400);

  const overlayVisible = await page.locator('#screenRestrictOverlay').isVisible();
  const appVisible = await page.locator('#app').isVisible();
  console.log(`[Mobile 412x915] Restriction overlay visible: ${overlayVisible}, App visible: ${appVisible}`);

  const mobilePath = path.join(artifactDir, 'mobile_restricted_view.png');
  await page.screenshot({ path: mobilePath });
  console.log(`Saved: ${mobilePath}`);

  await browser.close();
  console.log('Verification completed successfully!');
}

runVerification().catch(err => {
  console.error('Error during verification:', err);
  process.exit(1);
});
