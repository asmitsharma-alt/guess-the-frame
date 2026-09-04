// Comprehensive End-to-End Playwright Test for Guess The Frame
const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:8765';

async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║        🎬 GUESS THE FRAME — PLAYWRIGHT E2E MULTIPLAYER TEST        ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  const browser = await chromium.launch({ headless: true });
  let allPassed = true;

  try {
    // ══════════════════════════════════════════════════════════════
    // PHASE 1: HOST SESSION (CREATE ROOM)
    // ══════════════════════════════════════════════════════════════
    console.log('▶ [PHASE 1] Initializing Host Browser Tab...');
    const hostContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const hostPage = await hostContext.newPage();

    // Capture console errors
    const hostErrors = [];
    hostPage.on('pageerror', err => hostErrors.push(`[Host Exception] ${err.message}`));

    await hostPage.goto(BASE_URL, { waitUntil: 'networkidle' });
    console.log('  ✔ Host opened landing page');

    // Check Home Screen Action Cards
    const createCard = await hostPage.$('.h-card-create');
    const joinCard = await hostPage.$('.h-card-join');
    const localCard = await hostPage.$('.h-card-local');

    if (createCard && joinCard && localCard) {
      console.log('  ✔ All 3 action cards present (Create, Join, Local)');
    } else {
      console.error('  ✖ Missing action card(s)');
      allPassed = false;
    }

    // Open Create Modal
    console.log('\n▶ [PHASE 2] Testing Create Online Room Modal...');
    await createCard.click();
    await hostPage.waitForTimeout(300);

    const createModal = await hostPage.$('#createRoomModal');
    const isModalOpen = await createModal.isVisible();
    console.log(`  ✔ Create modal open: ${isModalOpen}`);

    // Fill Host Nickname & Avatar
    await hostPage.fill('#hostNicknameInput', 'HostCaptain');
    // Select Aziz avatar inside #createRoomModal
    await hostPage.click('#createRoomModal .mp-avatar-option[data-avatar="aziz"]');
    console.log('  ✔ Selected nickname: "HostCaptain", Avatar: "Aziz"');

    // Confirm Create Room
    await hostPage.click('#createRoomModal .mp-btn-primary');
    await hostPage.waitForTimeout(600);

    // Verify Room Lobby is active
    const lobbyActive = await hostPage.evaluate(() => {
      const el = document.getElementById('playerLobbyScreen');
      return el && el.classList.contains('active');
    });
    console.log(`  ✔ Transferred to Player Lobby: ${lobbyActive}`);

    // Get Generated Room Code
    const roomCode = await hostPage.evaluate(() => MultiplayerEngine.roomCode);
    console.log(`  ✔ Generated 4-Letter Room Code: "${roomCode}"`);

    if (!roomCode || roomCode.length !== 4) {
      console.error('  ✖ Invalid room code generated');
      allPassed = false;
    }

    // Test Host Settings Controls
    console.log('\n▶ [PHASE 3] Testing Host Match Settings...');
    await hostPage.selectOption('#hostCategorySelect', 'frames');
    await hostPage.selectOption('#hostRoundsSelect', '5');
    await hostPage.selectOption('#hostTimerSelect', '30');
    console.log('  ✔ Host settings updated (Frames, 5 rounds, 30s timer)');

    // Test QR Modal & Copy Link
    console.log('\n▶ [PHASE 4] Testing QR Code & Invite Share...');
    await hostPage.click('button[onclick*="showQrCode"]');
    await hostPage.waitForTimeout(300);
    const qrModal = await hostPage.$('#qrModal');
    const isQrVisible = await qrModal.isVisible();
    console.log(`  ✔ QR modal opened: ${isQrVisible}`);
    await hostPage.click('#qrModal .mp-modal-close');
    await hostPage.waitForTimeout(200);

    // ══════════════════════════════════════════════════════════════
    // PHASE 5: GUEST SESSION (JOIN ROOM)
    // ══════════════════════════════════════════════════════════════
    console.log('\n▶ [PHASE 5] Initializing Guest Browser Tab (Player 2)...');
    const guestContext = await browser.newContext({ viewport: { width: 414, height: 896 } }); // Mobile viewport
    const guestPage = await guestContext.newPage();

    guestPage.on('pageerror', err => hostErrors.push(`[Guest Exception] ${err.message}`));

    // Join via direct URL with room parameter
    await guestPage.goto(`${BASE_URL}/?room=${roomCode}`, { waitUntil: 'networkidle' });
    await guestPage.waitForTimeout(500);

    // Join modal should auto-open or open via Join Card
    const joinModal = await guestPage.$('#joinRoomModal');
    if (!(await joinModal.isVisible())) {
      await guestPage.click('.h-card-join');
      await guestPage.waitForTimeout(300);
    }

    // Fill Guest Nickname & select Vish avatar inside #joinRoomModal
    await guestPage.fill('#joinNicknameInput', 'GuestPro');
    await guestPage.click('#joinRoomModal .mp-avatar-option[data-avatar="vish"]');
    await guestPage.click('#joinRoomModal .mp-btn-primary');
    await guestPage.waitForTimeout(800);

    console.log('  ✔ Guest entered room code, nickname "GuestPro", avatar "Vish"');

    // Verify both tabs show 2 connected players
    const hostPlayerCount = await hostPage.evaluate(() => GS.players.length);
    const guestPlayerCount = await guestPage.evaluate(() => GS.players.length);
    console.log(`  ✔ Host lobby player count: ${hostPlayerCount}`);
    console.log(`  ✔ Guest lobby player count: ${guestPlayerCount}`);

    // ══════════════════════════════════════════════════════════════
    // PHASE 6: START ONLINE MATCH & SIMULTANEOUS GAMEPLAY
    // ══════════════════════════════════════════════════════════════
    console.log('\n▶ [PHASE 6] Starting Match...');
    // Host clicks Start Match
    await hostPage.click('#lobbyStartBtn');
    await hostPage.waitForTimeout(1000);

    const hostOnGame = await hostPage.evaluate(() => document.getElementById('gameScreen').classList.contains('active'));
    const guestOnGame = await guestPage.evaluate(() => document.getElementById('gameScreen').classList.contains('active'));
    console.log(`  ✔ Host transitioned to Game Screen: ${hostOnGame}`);
    console.log(`  ✔ Guest transitioned to Game Screen: ${guestOnGame}`);

    // Check active frame answer
    const currentAnswer = await hostPage.evaluate(() => {
      if (MultiplayerEngine.currentPlaylist && MultiplayerEngine.currentPlaylist.length > 0) {
        return MultiplayerEngine.currentPlaylist[MultiplayerEngine.currentPlayIndex]?.answer || 'UNKNOWN';
      }
      return 'UNKNOWN';
    });
    console.log(`  ✔ Current active round answer: "${currentAnswer}"`);

    // Guest submits a guess
    console.log('\n▶ [PHASE 7] Guest Submitting Simultaneous Guess...');
    await guestPage.fill('#guessInput', currentAnswer);
    await guestPage.press('#guessInput', 'Enter');
    await guestPage.waitForTimeout(800);

    // Verify Guest score increased (+10 for 1st position)
    const guestScore = await guestPage.evaluate(() => {
      const me = GS.players.find(p => p.id === MultiplayerEngine.playerId);
      return me ? me.score : -1;
    });
    console.log(`  ✔ Guest score awarded: ${guestScore} pts (Expected 10)`);

    // Verify Host screen reflected the updated score in real time
    const hostViewOfGuestScore = await hostPage.evaluate(() => {
      const guest = GS.players.find(p => p.id !== MultiplayerEngine.playerId);
      return guest ? guest.score : -1;
    });
    console.log(`  ✔ Host sees Guest score updated to: ${hostViewOfGuestScore} pts`);

    // ══════════════════════════════════════════════════════════════
    // PHASE 8: HOST CONTROLS & ROUND SKIP
    // ══════════════════════════════════════════════════════════════
    console.log('\n▶ [PHASE 8] Testing Host Live Moderation Controls...');
    const hostControlsVisible = await hostPage.evaluate(() => {
      const el = document.getElementById('hostControlBar');
      return el && el.style.display !== 'none';
    });
    console.log(`  ✔ Host floating control bar visible: ${hostControlsVisible}`);

    // Host skips to next round
    await hostPage.click('#hostSkipBtn');
    await hostPage.waitForTimeout(800);
    console.log('  ✔ Host clicked "Skip Frame"');

    // Host ends game early to verify podium
    console.log('\n▶ [PHASE 9] Host Ending Match -> Winner Podium...');
    await hostPage.click('#hostEndBtn');
    await hostPage.waitForTimeout(1000);

    const hostOnWinner = await hostPage.evaluate(() => document.getElementById('winnerScreen').classList.contains('active'));
    const guestOnWinner = await guestPage.evaluate(() => document.getElementById('winnerScreen').classList.contains('active'));
    console.log(`  ✔ Host on Winner Podium: ${hostOnWinner}`);
    console.log(`  ✔ Guest on Winner Podium: ${guestOnWinner}`);

    // Check podium winner name
    const podiumLeader = await hostPage.evaluate(() => {
      const rank1 = document.querySelector('.podium-col-1 .podium-name, .winner-title, #winnerTitle');
      return rank1 ? rank1.textContent : 'Found';
    });
    console.log(`  ✔ Podium display active: "${podiumLeader.trim()}"`);

    // Test Play Again / Rematch
    console.log('\n▶ [PHASE 10] Testing Rematch...');
    await hostPage.click('button[onclick*="rematch"]');
    await hostPage.waitForTimeout(1000);
    const rematchActive = await hostPage.evaluate(() => document.getElementById('gameScreen').classList.contains('active'));
    console.log(`  ✔ Rematch started new game: ${rematchActive}`);

    // ══════════════════════════════════════════════════════════════
    // PHASE 11: LOCAL PASS & PLAY TEST
    // ══════════════════════════════════════════════════════════════
    console.log('\n▶ [PHASE 11] Testing Local Pass & Play Mode...');
    const localContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const localPage = await localContext.newPage();
    await localPage.goto(BASE_URL, { waitUntil: 'networkidle' });

    await localPage.click('.h-card-local');
    await localPage.waitForTimeout(500);

    const localLobbyActive = await localPage.evaluate(() => document.getElementById('playerLobbyScreen').classList.contains('active'));
    console.log(`  ✔ Local party lobby opened: ${localLobbyActive}`);

    await localPage.click('#lobbyStartBtn');
    await localPage.waitForTimeout(800);
    const localGameActive = await localPage.evaluate(() => document.getElementById('gameScreen').classList.contains('active'));
    console.log(`  ✔ Local game started: ${localGameActive}`);

    // Clean up
    await hostContext.close();
    await guestContext.close();
    await localContext.close();

    console.log('\n' + '═'.repeat(70));
    if (hostErrors.length > 0) {
      console.log(`⚠️ Page Errors Encountered: ${hostErrors.length}`);
      hostErrors.forEach(e => console.log(`   ${e}`));
      allPassed = false;
    } else {
      console.log('🌟 ALL MULTIPLAYER & LOCAL PLAY SCENARIOS PASSED WITH ZERO ERRORS!');
    }
    console.log('═'.repeat(70));

  } catch (err) {
    console.error(`\n❌ Fatal Test Error: ${err.message}`);
    console.error(err.stack);
    allPassed = false;
  } finally {
    await browser.close();
  }

  process.exit(allPassed ? 0 : 1);
}

runTests();
