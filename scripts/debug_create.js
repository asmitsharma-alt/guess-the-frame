const { chromium } = require('playwright');

async function debugCreate() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('BROWSER PAGE ERROR:', err.message));

  console.log('Loading page...');
  await page.goto('http://localhost:8080/');
  await page.waitForTimeout(1500);

  console.log('Clicking Create Room...');
  await page.click('.h-card-create');
  await page.waitForTimeout(500);

  console.log('Typing name...');
  await page.fill('#hostPlayerNameInput', 'HostAman');

  console.log('Clicking confirm button...');
  await page.click('#createRoomModal .mp-btn-primary');

  await page.waitForTimeout(4000);
  const activeScreen = await page.evaluate(() => {
    const active = document.querySelector('.screen.active');
    return active ? active.id : 'NONE';
  });
  console.log('Active screen after click:', activeScreen);

  await browser.close();
}

debugCreate();
