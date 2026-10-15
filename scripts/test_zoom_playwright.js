const { chromium } = require('playwright');
const path = require('path');

async function testViewport(browser, width, height, name) {
  console.log(`\n======================================================`);
  console.log(`Testing Viewport: ${name} (${width}x${height})`);
  console.log(`======================================================`);

  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();

  const indexPath = path.resolve(__dirname, '..', 'index.html');
  await page.goto('file:///' + indexPath.replace(/\\/g, '/'));
  await page.waitForSelector('#app', { state: 'visible' });

  // Switch to gameScreen
  await page.evaluate(() => {
    UI.showScreen('gameScreen');
  });

  await page.waitForTimeout(400);

  // Measure dimensions BEFORE focus
  const before = await page.evaluate(() => {
    const sidebar = document.querySelector('#gameScreen .game-sidebar-col');
    const strip = document.querySelector('#gameScreen .sidebar-top-strip');
    const timer = document.querySelector('#gameScreen .timer-circle');
    const lb = document.querySelector('#gameScreen .leaderboard');
    const chat = document.querySelector('#gameScreen .live-chat-panel');
    return {
      sidebarWidth: sidebar ? Math.round(sidebar.getBoundingClientRect().width) : null,
      stripDirection: strip ? window.getComputedStyle(strip).flexDirection : null,
      timerWidth: timer ? Math.round(timer.getBoundingClientRect().width) : null,
      timerHeight: timer ? Math.round(timer.getBoundingClientRect().height) : null,
      lbHeight: lb ? Math.round(lb.getBoundingClientRect().height) : null,
      chatHeight: chat ? Math.round(chat.getBoundingClientRect().height) : null
    };
  });
  console.log('BEFORE FOCUS (Idle):', before);

  // Focus on #chatTextInput
  console.log('Focusing #chatTextInput...');
  await page.focus('#chatTextInput');
  await page.waitForTimeout(400);

  // Measure dimensions AFTER focus
  const after = await page.evaluate(() => {
    const sidebar = document.querySelector('#gameScreen .game-sidebar-col');
    const strip = document.querySelector('#gameScreen .sidebar-top-strip');
    const timer = document.querySelector('#gameScreen .timer-circle');
    const lb = document.querySelector('#gameScreen .leaderboard');
    const chat = document.querySelector('#gameScreen .live-chat-panel');
    return {
      hasAnsweringMode: document.body.classList.contains('answering-mode'),
      sidebarWidth: sidebar ? Math.round(sidebar.getBoundingClientRect().width) : null,
      stripDirection: strip ? window.getComputedStyle(strip).flexDirection : null,
      timerWidth: timer ? Math.round(timer.getBoundingClientRect().width) : null,
      timerHeight: timer ? Math.round(timer.getBoundingClientRect().height) : null,
      lbHeight: lb ? Math.round(lb.getBoundingClientRect().height) : null,
      chatHeight: chat ? Math.round(chat.getBoundingClientRect().height) : null
    };
  });
  console.log('AFTER FOCUS (Typing):', after);

  // Blur (unfocus)
  console.log('Blurring (unfocusing)...');
  await page.evaluate(() => {
    const input = document.getElementById('chatTextInput');
    if (input) input.blur();
  });
  await page.waitForTimeout(400);

  const afterBlur = await page.evaluate(() => {
    const sidebar = document.querySelector('#gameScreen .game-sidebar-col');
    const strip = document.querySelector('#gameScreen .sidebar-top-strip');
    const timer = document.querySelector('#gameScreen .timer-circle');
    const lb = document.querySelector('#gameScreen .leaderboard');
    const chat = document.querySelector('#gameScreen .live-chat-panel');
    return {
      sidebarWidth: sidebar ? Math.round(sidebar.getBoundingClientRect().width) : null,
      stripDirection: strip ? window.getComputedStyle(strip).flexDirection : null,
      timerWidth: timer ? Math.round(timer.getBoundingClientRect().width) : null,
      timerHeight: timer ? Math.round(timer.getBoundingClientRect().height) : null,
      lbHeight: lb ? Math.round(lb.getBoundingClientRect().height) : null,
      chatHeight: chat ? Math.round(chat.getBoundingClientRect().height) : null
    };
  });
  console.log('AFTER BLUR (Idle):', afterBlur);

  // Verification checks:
  const isJumping = (
    before.sidebarWidth !== after.sidebarWidth ||
    before.stripDirection !== after.stripDirection ||
    before.timerWidth !== after.timerWidth ||
    before.timerHeight !== after.timerHeight ||
    before.lbHeight !== after.lbHeight ||
    before.chatHeight !== after.chatHeight
  );

  const stripAlwaysColumn = (before.stripDirection === 'column' && after.stripDirection === 'column');
  const timerStable = (before.timerWidth === after.timerWidth && after.timerWidth === afterBlur.timerWidth);
  const sidebarStable = (before.sidebarWidth === after.sidebarWidth && after.sidebarWidth === afterBlur.sidebarWidth);

  console.log(`\nResults for ${name}:`);
  console.log(`- Layout jumping/zooming on focus: ${isJumping ? '❌ YES (FAILED)' : '✅ NONE (STABLE)'}`);
  console.log(`- Strip direction: ${before.stripDirection} -> ${after.stripDirection} (${stripAlwaysColumn ? '✅ STABLE COLUMN' : '❌ CHANGED'})`);
  console.log(`- Timer size stability: ${before.timerWidth}px -> ${after.timerWidth}px -> ${afterBlur.timerWidth}px (${timerStable ? '✅ 100% STABLE' : '❌ RESIZED'})`);
  console.log(`- Sidebar width stability: ${before.sidebarWidth}px -> ${after.sidebarWidth}px -> ${afterBlur.sidebarWidth}px (${sidebarStable ? '✅ 100% STABLE' : '❌ RESIZED'})`);

  await context.close();
  return !isJumping && stripAlwaysColumn && timerStable && sidebarStable;
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });

  const viewports = [
    { width: 1280, height: 800, name: 'Standard Laptop (800p)' },
    { width: 1440, height: 900, name: 'MacBook / Desktop (900p)' },
    { width: 1920, height: 1080, name: 'Full HD Monitor (1080p)' },
    { width: 1024, height: 768, name: 'Small Screen / Tablet (768p)' }
  ];

  let allPassed = true;
  for (const vp of viewports) {
    const passed = await testViewport(browser, vp.width, vp.height, vp.name);
    if (!passed) allPassed = false;
  }

  await browser.close();

  console.log('\n======================================================');
  if (allPassed) {
    console.log('🎉 ALL PLAYWRIGHT VIEWPORT & FOCUS TESTS PASSED! ZERO ZOOM/JUMP DETECTED.');
    process.exit(0);
  } else {
    console.error('⚠️ SOME VIEWPORTS FAILED ZOOM/JUMP VERIFICATION');
    process.exit(1);
  }
})();
