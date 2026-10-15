const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function checkSymmetry() {
  const artifactDir = path.resolve('C:/Users/admin/.gemini/antigravity-cli/brain/a54b6ceb-9d32-4bb5-8f71-7de2893bbccb');
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const page = await browser.newPage();

  console.log('--- SYMMETRY AUDIT START ---');
  console.log('Navigating to http://localhost:8080/ ...');
  await page.goto('http://localhost:8080/', { waitUntil: 'domcontentloaded' });
  console.log('Page loaded!');

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

  // Test standard desktop (1280x800)
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(400);

  const stageBox = await page.locator('#gameScreen .game-stage-col').boundingBox();
  const sidebarBox = await page.locator('#gameScreen .game-sidebar-col').boundingBox();
  const topStripBox = await page.locator('#sidebarTopStrip').boundingBox();
  const card1Box = await page.locator('#sidebarTopStrip .panel-sec-controls').boundingBox();
  const card2Box = await page.locator('#sidebarTopStrip .panel-sec-leaderboard').boundingBox();
  const chatPanelBox = await page.locator('.live-chat-panel').boundingBox();

  console.log('\n[Column Level Alignment]');
  console.log(`Stage Col:   y=${stageBox.y}, height=${stageBox.height}, bottom=${stageBox.y + stageBox.height}`);
  console.log(`Sidebar Col: y=${sidebarBox.y}, height=${sidebarBox.height}, bottom=${sidebarBox.y + sidebarBox.height}`);
  console.log(`Top Alignment Delta:    ${Math.abs(stageBox.y - sidebarBox.y).toFixed(2)}px`);
  console.log(`Bottom Alignment Delta: ${Math.abs((stageBox.y + stageBox.height) - (sidebarBox.y + sidebarBox.height)).toFixed(2)}px`);

  console.log('\n[Side-by-Side Cards Alignment (Row Mode)]');
  console.log(`Card 1 (Timer):       y=${card1Box.y}, height=${card1Box.height}, width=${card1Box.width}`);
  console.log(`Card 2 (Leaderboard): y=${card2Box.y}, height=${card2Box.height}, width=${card2Box.width}`);
  console.log(`Cards Top Delta:    ${Math.abs(card1Box.y - card2Box.y).toFixed(2)}px`);
  console.log(`Cards Height Delta: ${Math.abs(card1Box.height - card2Box.height).toFixed(2)}px`);
  console.log(`Cards Width Delta:  ${Math.abs(card1Box.width - card2Box.width).toFixed(2)}px`);

  // Chat Header Buttons Alignment
  const toggleBtnBox = await page.locator('.chat-layout-toggle-btn').boundingBox();
  const hintBtnBox = await page.locator('.chat-hint-btn').boundingBox();
  const closeBtnBox = await page.locator('.chat-close-btn').boundingBox();
  console.log('\n[Chat Header Buttons Alignment]');
  console.log(`Toggle Btn: y=${toggleBtnBox?.y}, height=${toggleBtnBox?.height}`);
  console.log(`Hint Btn:   y=${hintBtnBox?.y}, height=${hintBtnBox?.height}`);
  console.log(`Close Btn:  y=${closeBtnBox?.y}, height=${closeBtnBox?.height}`);

  // Chat Form Alignment
  const inputFormBox = await page.locator('#chatInputForm').boundingBox();
  const inputBox = await page.locator('#chatTextInput').boundingBox();
  const sendBtnBox = await page.locator('#chatSendBtn').boundingBox();
  console.log('\n[Chat Input Bar Alignment]');
  console.log(`Form:     y=${inputFormBox?.y}, height=${inputFormBox?.height}`);
  console.log(`Input:    y=${inputBox?.y}, height=${inputBox?.height}`);
  console.log(`Send Btn: y=${sendBtnBox?.y}, height=${sendBtnBox?.height}`);
  console.log(`Input vs Send Y Delta:      ${Math.abs((inputBox?.y || 0) - (sendBtnBox?.y || 0)).toFixed(2)}px`);
  console.log(`Input vs Send Height Delta: ${Math.abs((inputBox?.height || 0) - (sendBtnBox?.height || 0)).toFixed(2)}px`);

  // Save screenshot of 1280x800 layout
  const screenshotPath = path.join(artifactDir, 'symmetry_verification_800.png');
  await page.screenshot({ path: screenshotPath });
  console.log(`\nScreenshot saved to: ${screenshotPath}`);

  // Also capture zoomed in 1280x680
  await page.setViewportSize({ width: 1280, height: 680 });
  await page.waitForTimeout(300);
  const zoomedPath = path.join(artifactDir, 'zoomed_side_by_side.png');
  await page.screenshot({ path: zoomedPath });
  console.log(`Zoomed screenshot updated: ${zoomedPath}`);

  await browser.close();
  console.log('\n--- SYMMETRY AUDIT COMPLETE ---');
}

checkSymmetry().catch(err => {
  console.error(err);
  process.exit(1);
});
