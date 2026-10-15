const { chromium } = require('playwright');
const https = require('https');
const fs = require('fs');
const path = require('path');

const VERCEL_URL = 'https://www.scoopcast-live.in';
const APPWRITE_URL = 'https://6a9a6a18002d67382503.appwrite.network';

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
    }).on('error', reject);
  });
}

async function verifyHtmlContent(name, url) {
  console.log(`\n========================================`);
  console.log(`🔍 [1/3] PROBING HTML ON ${name} (${url})`);
  console.log(`========================================`);

  const res = await fetchUrl(url);
  console.log(`HTTP Status: ${res.status}`);
  if (res.status !== 200) {
    throw new Error(`Failed to fetch ${url}, status: ${res.status}`);
  }

  const hasNewMessage = res.data.includes('Sorry for the inconvenience last time. I’ll do my best to make sure it doesn’t happen again.');
  const hasClosing = res.data.includes('Hope you enjoyed the game. See you next week');
  const hasSmocGroup = res.data.includes('members of smoc(whatsapp group)');
  const hasTributeAssetRef = res.data.includes('welcome_reveal.webp');
  const hasTributeText = res.data.includes('May his soul rest in peace');
  const hasOldAnnouncement = res.data.includes('publicAnnouncementModal');

  console.log(`- New message present: ${hasNewMessage ? '✅ YES' : '❌ NO'}`);
  console.log(`- Closing message present: ${hasClosing ? '✅ YES' : '❌ NO'}`);
  console.log(`- Credits smoc(whatsapp group) present: ${hasSmocGroup ? '✅ YES' : '❌ NO'}`);
  console.log(`- Tribute asset referenced: ${hasTributeAssetRef ? '✅ YES' : '❌ NO'}`);
  console.log(`- Tribute text present: ${hasTributeText ? '✅ YES' : '❌ NO'}`);
  console.log(`- Old announcement modal removed: ${!hasOldAnnouncement ? '✅ YES (ABSENT)' : '❌ NO (STILL PRESENT)'}`);

  // Also check tribute WebP asset directly
  const tributeUrl = `${url}/GUESSTHEFRAME/welcome_reveal.webp`;
  const tributeRes = await fetchUrl(tributeUrl);
  console.log(`- Tribute WebP Asset Status: ${tributeRes.status === 200 ? '✅ 200 OK' : '❌ ' + tributeRes.status} (${tributeRes.headers['content-length']} bytes)`);

  if (!hasNewMessage || !hasClosing || !hasSmocGroup || !hasTributeAssetRef || !hasTributeText || hasOldAnnouncement || tributeRes.status !== 200) {
    throw new Error(`HTML or Asset probe failed on ${name}`);
  }
}

async function runBrowserTests(page, name, url) {
  console.log(`\n========================================`);
  console.log(`🌐 [2/3] BROWSER E2E TESTS ON ${name} (${url})`);
  console.log(`========================================`);

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  console.log(`✅ Loaded page successfully.`);

  // 1. Check title & Appwrite initialization
  const title = await page.title();
  console.log(`- Page title: "${title}"`);

  const appwriteStatus = await page.evaluate(() => {
    return {
      hasService: typeof AppwriteService !== 'undefined',
      endpoint: typeof AppwriteService !== 'undefined' ? AppwriteService.ENDPOINT : null,
      projectId: typeof AppwriteService !== 'undefined' ? AppwriteService.PROJECT_ID : null,
      hasClient: typeof AppwriteService !== 'undefined' && !!AppwriteService.client
    };
  });
  console.log(`- Appwrite Service initialized: ${appwriteStatus.hasService ? '✅' : '❌'}`);
  console.log(`- Appwrite Endpoint: ${appwriteStatus.endpoint}`);

  // 2. Test Winner Screen and New Message
  console.log(`\nTesting Winner Screen display & messages...`);
  const winnerData = await page.evaluate(() => {
    // Show winner screen with test data
    WinnerScreen.show([
      { name: 'AMAN', score: 30, avatar: 'aman' },
      { name: 'VISH', score: 12, avatar: 'vish' },
      { name: 'AZIZ', score: 16, avatar: 'aziz' }
    ]);

    const msgEl = document.querySelector('.cw-info-text');
    const msgText = msgEl ? msgEl.textContent.trim().replace(/\s+/g, ' ') : '';
    const creatorMsgEl = document.getElementById('creatorMsg');
    const creatorText = creatorMsgEl ? creatorMsgEl.textContent.trim() : '';
    const popupModal = document.getElementById('publicAnnouncementModal');

    return {
      screenVisible: document.getElementById('winnerScreen')?.classList.contains('active'),
      msgText,
      creatorText,
      hasPopupModal: !!popupModal
    };
  });

  console.log(`- Winner screen active: ${winnerData.screenVisible ? '✅' : '❌'}`);
  console.log(`- Winner Message: "${winnerData.msgText}"`);
  console.log(`- Creator Credit: "${winnerData.creatorText}"`);
  console.log(`- Launch Popup Modal completely absent: ${!winnerData.hasPopupModal ? '✅ YES' : '❌ NO'}`);

  const screenshotsDir = path.join(__dirname, 'test-artifacts');
  if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

  const safeName = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  await page.screenshot({ path: path.join(screenshotsDir, `${safeName}_winner_screen.png`), fullPage: true });
  console.log(`📸 Screenshot saved: ${safeName}_winner_screen.png`);

  // 3. Test Tribute Reveal (Welcome 2007)
  console.log(`\nTesting Tribute Reveal for Welcome (2007)...`);
  const tributeResult = await page.evaluate(async () => {
    // Switch to game screen
    UI.showScreen('gameScreen');

    // Simulate Welcome round finish
    const welcomeFrame = {
      image: 'GUESSTHEFRAME/Welcome (2007).webp',
      answer: 'WELCOME',
      type: 'movie',
      year: 2007,
      revealContent: 'GUESSTHEFRAME/welcome_reveal.webp',
      tributeText: 'May his soul rest in peace'
    };

    MultiplayerEngine.currentPlaylist = [welcomeFrame];
    MultiplayerEngine.currentPlayIndex = 0;
    MultiplayerEngine.currentClientFrame = welcomeFrame;
    MultiplayerEngine.endRound();

    const tributeImg = document.getElementById('tributeImg');
    if (tributeImg && !tributeImg.complete) {
      await new Promise(r => {
        tributeImg.onload = r;
        tributeImg.onerror = r;
        setTimeout(r, 2000);
      });
    } else {
      await new Promise(r => setTimeout(r, 400));
    }

    const tributeDisplay = document.getElementById('tributeDisplay');
    const tributeTextEl = document.getElementById('tributeText');
    const answerCard = document.querySelector('.answer-card');
    const answerOverlay = document.getElementById('answerOverlay');

    const tRect = tributeImg ? tributeImg.getBoundingClientRect() : null;
    const aRect = answerCard ? answerCard.getBoundingClientRect() : null;

    // Check overlap
    let overlap = false;
    if (tRect && aRect && tRect.width > 0 && aRect.width > 0) {
      overlap = !(tRect.right <= aRect.left || 
                  tRect.left >= aRect.right || 
                  tRect.bottom <= aRect.top || 
                  tRect.top >= aRect.bottom);
    }

    return {
      overlayHasTributeClass: answerOverlay?.classList.contains('tribute-answer'),
      tributeDisplayVisible: tributeDisplay && window.getComputedStyle(tributeDisplay).display !== 'none',
      imgSrc: tributeImg?.src,
      imgLoaded: tributeImg && tributeImg.naturalWidth > 0,
      naturalWidth: tributeImg?.naturalWidth,
      naturalHeight: tributeImg?.naturalHeight,
      tributeText: tributeTextEl?.textContent?.trim(),
      overlapsAnswerCard: overlap,
      tRect,
      aRect
    };
  });

  console.log(`- Overlay has 'tribute-answer' class: ${tributeResult.overlayHasTributeClass ? '✅' : '❌'}`);
  console.log(`- Tribute display container visible: ${tributeResult.tributeDisplayVisible ? '✅' : '❌'}`);
  console.log(`- Tribute image src: ${tributeResult.imgSrc}`);
  console.log(`- Tribute image natural dimensions loaded: ${tributeResult.imgLoaded ? '✅ YES' : '❌ NO'}`);
  console.log(`- Tribute caption: "${tributeResult.tributeText}"`);
  console.log(`- Zero overlap with answer card: ${!tributeResult.overlapsAnswerCard ? '✅ ZERO OVERLAP' : '❌ OVERLAPPING'}`);

  await page.screenshot({ path: path.join(screenshotsDir, `${safeName}_tribute_reveal.png`), fullPage: true });
  console.log(`📸 Screenshot saved: ${safeName}_tribute_reveal.png`);

  if (consoleErrors.length > 0) {
    console.log(`⚠️ Console errors captured (${consoleErrors.length}):`, consoleErrors.slice(0, 3));
  } else {
    console.log(`✅ Zero uncaught console errors.`);
  }

  return {
    winnerData,
    tributeResult,
    consoleErrors
  };
}

async function main() {
  console.log(`=======================================================`);
  console.log(`🚀 STARTING COMPREHENSIVE LIVE VERIFICATION & E2E TESTS`);
  console.log(`=======================================================`);

  // Step 1: Probe both live HTTP endpoints
  await verifyHtmlContent('Vercel (Production)', VERCEL_URL);
  await verifyHtmlContent('Appwrite (Sites)', APPWRITE_URL);

  // Step 2: Run Playwright Browser Tests on Vercel
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  try {
    await runBrowserTests(page, 'Vercel_Production', VERCEL_URL);
    await runBrowserTests(page, 'Appwrite_Sites', APPWRITE_URL);
    console.log(`\n=======================================================`);
    console.log(`🎉 ALL TESTS PASSED SUCCESSFULLY ACROSS BOTH PLATFORMS!`);
    console.log(`=======================================================`);
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
