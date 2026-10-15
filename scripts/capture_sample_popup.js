const { chromium } = require('playwright');
const path = require('path');

(async () => {
  console.log('Capturing Neo-Brutalism Scoopcast launch modal screenshots with transparent QR...');
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true
  });

  // Desktop
  const desktopPage = await browser.newPage({
    viewport: { width: 1280, height: 850 }
  });
  const filePath = 'file://' + path.resolve(__dirname, '../sample_winner_popup.html').replace(/\\/g, '/');
  await desktopPage.goto(filePath, { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(3500);
  await desktopPage.screenshot({ path: 'screenshot_transparent_desktop.png' });
  console.log('Saved screenshot_transparent_desktop.png');

  // Android Mobile (360x780 standard Android screen)
  const mobilePage = await browser.newPage({
    viewport: { width: 360, height: 780 }
  });
  await mobilePage.goto(filePath, { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(3500);
  await mobilePage.screenshot({ path: 'screenshot_transparent_mobile.png' });
  console.log('Saved screenshot_transparent_mobile.png');

  await browser.close();
  console.log('Capture complete!');
})();
