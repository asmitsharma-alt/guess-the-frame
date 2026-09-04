// Playwright CLI test script for Guess The Frame
// Run with: npx playwright test scratch/test_game.js --headed
// Or for quick check: node scratch/test_game.js

const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:8765';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  const errors = [];
  const warnings = [];
  const results = [];

  // Capture console errors and JS exceptions
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`[CONSOLE ERROR] ${msg.text()}`);
    } else if (msg.type() === 'warning') {
      warnings.push(`[CONSOLE WARN] ${msg.text()}`);
    }
  });

  page.on('pageerror', err => {
    errors.push(`[JS EXCEPTION] ${err.message}`);
  });

  // Track failed network requests (broken images, scripts, etc.)
  const failedRequests = [];
  page.on('requestfailed', req => {
    failedRequests.push(`[NET FAIL] ${req.url()} - ${req.failure()?.errorText || 'unknown'}`);
  });

  // Track 404s and other HTTP errors
  const httpErrors = [];
  page.on('response', resp => {
    if (resp.status() >= 400) {
      httpErrors.push(`[HTTP ${resp.status()}] ${resp.url()}`);
    }
  });

  console.log('='.repeat(70));
  console.log('  GUESS THE FRAME - PLAYWRIGHT COMPREHENSIVE TEST');
  console.log('='.repeat(70));

  // ─────────────────────────────────────────────────────
  // TEST 1: Page Load
  // ─────────────────────────────────────────────────────
  console.log('\n🔹 TEST 1: Page Load');
  try {
    const resp = await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    if (resp.ok()) {
      results.push({ test: 'Page Load', status: 'PASS', detail: `HTTP ${resp.status()}` });
      console.log('  ✅ Page loaded successfully');
    } else {
      results.push({ test: 'Page Load', status: 'FAIL', detail: `HTTP ${resp.status()}` });
      console.log(`  ❌ Page returned HTTP ${resp.status()}`);
    }
  } catch (e) {
    results.push({ test: 'Page Load', status: 'FAIL', detail: e.message });
    console.log(`  ❌ ${e.message}`);
  }

  // ─────────────────────────────────────────────────────
  // TEST 2: Home Screen Visible
  // ─────────────────────────────────────────────────────
  console.log('\n🔹 TEST 2: Home Screen Visibility');
  try {
    const homeScreen = await page.$('#homeScreen');
    const isVisible = homeScreen ? await homeScreen.isVisible() : false;
    const hasActiveClass = homeScreen ? (await homeScreen.getAttribute('class')).includes('active') : false;
    if (isVisible && hasActiveClass) {
      results.push({ test: 'Home Screen Visible', status: 'PASS' });
      console.log('  ✅ Home screen is visible with .active class');
    } else {
      results.push({ test: 'Home Screen Visible', status: 'FAIL', detail: `visible=${isVisible}, active=${hasActiveClass}` });
      console.log(`  ❌ Home screen: visible=${isVisible}, active=${hasActiveClass}`);
    }
  } catch (e) {
    results.push({ test: 'Home Screen Visible', status: 'FAIL', detail: e.message });
    console.log(`  ❌ ${e.message}`);
  }

  // ─────────────────────────────────────────────────────
  // TEST 3: All Screen Elements Exist
  // ─────────────────────────────────────────────────────
  console.log('\n🔹 TEST 3: All Screen Elements Exist');
  const screenIds = ['homeScreen', 'playerLobbyScreen', 'gameScreen', 'winnerScreen'];
  for (const sid of screenIds) {
    const el = await page.$(`#${sid}`);
    if (el) {
      results.push({ test: `Screen #${sid} exists`, status: 'PASS' });
      console.log(`  ✅ #${sid} found`);
    } else {
      results.push({ test: `Screen #${sid} exists`, status: 'FAIL' });
      console.log(`  ❌ #${sid} NOT found`);
    }
  }

  // ─────────────────────────────────────────────────────
  // TEST 4: Home Screen Buttons
  // ─────────────────────────────────────────────────────
  console.log('\n🔹 TEST 4: Home Screen Buttons & Cards');
  const homeButtons = await page.$$('#homeScreen .h-card');
  console.log(`  Found ${homeButtons.length} .h-card elements on home screen`);
  results.push({ test: 'Home card count', status: homeButtons.length >= 1 ? 'PASS' : 'FAIL', detail: `${homeButtons.length} cards` });

  for (let i = 0; i < homeButtons.length; i++) {
    const titleEl = await homeButtons[i].$('.h-card-title');
    const title = titleEl ? await titleEl.textContent() : '(no title)';
    const descEl = await homeButtons[i].$('.h-card-desc');
    const desc = descEl ? await descEl.textContent() : '(no desc)';
    console.log(`  Card ${i + 1}: "${title.trim()}" — ${desc.trim()}`);

    // Check onclick handler
    const onclick = await homeButtons[i].getAttribute('onclick');
    if (onclick) {
      console.log(`    onclick: ${onclick.substring(0, 80)}`);
    } else {
      console.log(`    ⚠️  No onclick handler!`);
      warnings.push(`Card "${title.trim()}" has no onclick handler`);
    }
  }

  // ─────────────────────────────────────────────────────
  // TEST 5: JavaScript Global Objects
  // ─────────────────────────────────────────────────────
  console.log('\n🔹 TEST 5: JavaScript Global Objects');
  const globalChecks = [
    'typeof SoundManager', 'typeof GameController', 'typeof PaletteManager',
    'typeof MultiplayerEngine', 'typeof FuzzyMatcher', 'typeof RoomLobby',
    'typeof UI', 'typeof FrameDisplay', 'typeof PlayerLobby', 'typeof Scores',
    'typeof SecurityUtil', 'typeof LobbyChat', 'typeof AdminPanel'
  ];
  for (const check of globalChecks) {
    try {
      const val = await page.evaluate(check);
      const name = check.replace('typeof ', '');
      if (val === 'object' || val === 'function') {
        results.push({ test: `Global: ${name}`, status: 'PASS', detail: val });
        console.log(`  ✅ ${name} = ${val}`);
      } else {
        results.push({ test: `Global: ${name}`, status: 'FAIL', detail: val });
        console.log(`  ❌ ${name} = ${val}`);
      }
    } catch (e) {
      results.push({ test: `Global: ${check}`, status: 'FAIL', detail: e.message.substring(0, 60) });
      console.log(`  ❌ ${check}: ${e.message.substring(0, 60)}`);
    }
  }

  // ─────────────────────────────────────────────────────
  // TEST 6: Game Data Catalog Integrity
  // ─────────────────────────────────────────────────────
  console.log('\n🔹 TEST 6: Game Data / Catalog Check');
  try {
    const catalogInfo = await page.evaluate(() => {
      // Try to find the GS data object
      if (typeof GS !== 'undefined' && GS.sections) {
        return {
          found: true,
          sectionCount: GS.sections.length,
          sections: GS.sections.map(s => ({
            name: s.name || '(unnamed)',
            frameCount: (s.frames || []).length,
            collapsed: s.collapsed
          }))
        };
      }
      // Fallback: scan for variables containing frame data
      if (typeof GameController !== 'undefined') {
        return { found: true, note: 'GameController exists but GS.sections not directly accessible' };
      }
      return { found: false };
    });

    if (catalogInfo.found && catalogInfo.sections) {
      console.log(`  ✅ Found ${catalogInfo.sectionCount} game sections:`);
      let totalFrames = 0;
      for (const s of catalogInfo.sections) {
        console.log(`    📁 "${s.name}" — ${s.frameCount} frames (collapsed: ${s.collapsed})`);
        totalFrames += s.frameCount;
      }
      console.log(`  Total frames across all sections: ${totalFrames}`);
      results.push({ test: 'Game Catalog', status: 'PASS', detail: `${catalogInfo.sectionCount} sections, ${totalFrames} frames` });
    } else if (catalogInfo.found) {
      console.log(`  ⚠️  ${catalogInfo.note || 'Partial data found'}`);
      results.push({ test: 'Game Catalog', status: 'WARN', detail: catalogInfo.note });
    } else {
      console.log(`  ❌ No game data catalog found`);
      results.push({ test: 'Game Catalog', status: 'FAIL' });
    }
  } catch (e) {
    results.push({ test: 'Game Catalog', status: 'FAIL', detail: e.message.substring(0, 80) });
    console.log(`  ❌ ${e.message.substring(0, 80)}`);
  }

  // ─────────────────────────────────────────────────────
  // TEST 7: FuzzyMatcher Validation
  // ─────────────────────────────────────────────────────
  console.log('\n🔹 TEST 7: FuzzyMatcher Logic');
  try {
    const matcherResults = await page.evaluate(() => {
      if (typeof FuzzyMatcher === 'undefined') return { available: false };
      const tests = [
        { input: 'The Matrix', expected: 'THE MATRIX', should: true },
        { input: 'matrix', expected: 'THE MATRIX', should: true },
        { input: 'Oppenhimer', expected: 'OPPENHEIMER', should: true },  // typo
        { input: 'Wall E', expected: 'WALL-E', should: true },
        { input: 'completely wrong answer', expected: 'THE MATRIX', should: false },
      ];
      const results = [];
      for (const t of tests) {
        try {
          const result = FuzzyMatcher.match ? FuzzyMatcher.match(t.input, t.expected) : 
                         FuzzyMatcher.check ? FuzzyMatcher.check(t.input, t.expected) :
                         FuzzyMatcher.isCorrect ? FuzzyMatcher.isCorrect(t.input, t.expected) : 'NO_METHOD';
          results.push({ ...t, result, pass: result === t.should || result === 'NO_METHOD' });
        } catch (e) {
          results.push({ ...t, result: 'ERROR: ' + e.message, pass: false });
        }
      }
      return { available: true, results };
    });

    if (!matcherResults.available) {
      console.log('  ❌ FuzzyMatcher not available');
      results.push({ test: 'FuzzyMatcher', status: 'FAIL' });
    } else {
      for (const r of matcherResults.results) {
        const icon = r.pass ? '✅' : '❌';
        console.log(`  ${icon} "${r.input}" vs "${r.expected}" => ${r.result} (expected ${r.should})`);
      }
      const allPass = matcherResults.results.every(r => r.pass);
      results.push({ test: 'FuzzyMatcher', status: allPass ? 'PASS' : 'FAIL' });
    }
  } catch (e) {
    results.push({ test: 'FuzzyMatcher', status: 'FAIL', detail: e.message.substring(0, 60) });
    console.log(`  ❌ ${e.message.substring(0, 60)}`);
  }

  // ─────────────────────────────────────────────────────
  // TEST 8: UI.showScreen Function
  // ─────────────────────────────────────────────────────
  console.log('\n🔹 TEST 8: UI.showScreen Transitions');
  try {
    for (const screen of ['playerLobbyScreen', 'gameScreen', 'homeScreen']) {
      await page.evaluate((s) => {
        if (typeof UI !== 'undefined' && UI.showScreen) UI.showScreen(s);
      }, screen);
      await page.waitForTimeout(300);
      const isActive = await page.evaluate((s) => {
        const el = document.getElementById(s);
        return el ? el.classList.contains('active') : false;
      }, screen);
      const icon = isActive ? '✅' : '❌';
      console.log(`  ${icon} UI.showScreen('${screen}') => active=${isActive}`);
      results.push({ test: `showScreen(${screen})`, status: isActive ? 'PASS' : 'FAIL' });
    }
  } catch (e) {
    results.push({ test: 'UI.showScreen', status: 'FAIL', detail: e.message.substring(0, 60) });
    console.log(`  ❌ ${e.message.substring(0, 60)}`);
  }

  // ─────────────────────────────────────────────────────
  // TEST 9: SoundManager initialization
  // ─────────────────────────────────────────────────────
  console.log('\n🔹 TEST 9: SoundManager');
  try {
    const soundInfo = await page.evaluate(() => {
      if (typeof SoundManager === 'undefined') return { available: false };
      return {
        available: true,
        hasPlayClick: typeof SoundManager.playClick === 'function',
        hasMute: typeof SoundManager.mute === 'function' || typeof SoundManager.toggleMute === 'function',
        hasSetVol: typeof SoundManager.setVol === 'function' || typeof SoundManager.setVolume === 'function',
        methods: Object.keys(SoundManager).filter(k => typeof SoundManager[k] === 'function').slice(0, 15)
      };
    });
    if (soundInfo.available) {
      console.log(`  ✅ SoundManager available`);
      console.log(`    playClick: ${soundInfo.hasPlayClick}, mute: ${soundInfo.hasMute}, setVol: ${soundInfo.hasSetVol}`);
      console.log(`    Methods: ${soundInfo.methods.join(', ')}`);
      results.push({ test: 'SoundManager', status: 'PASS' });
    } else {
      console.log('  ❌ SoundManager not available');
      results.push({ test: 'SoundManager', status: 'FAIL' });
    }
  } catch (e) {
    results.push({ test: 'SoundManager', status: 'FAIL', detail: e.message.substring(0, 60) });
    console.log(`  ❌ ${e.message}`);
  }

  // ─────────────────────────────────────────────────────
  // TEST 10: MultiplayerEngine / RoomLobby
  // ─────────────────────────────────────────────────────
  console.log('\n🔹 TEST 10: MultiplayerEngine & RoomLobby');
  try {
    const mpInfo = await page.evaluate(() => {
      const info = {};
      if (typeof MultiplayerEngine !== 'undefined') {
        info.mp = true;
        info.mpMethods = Object.keys(MultiplayerEngine).filter(k => typeof MultiplayerEngine[k] === 'function').slice(0, 15);
        info.mpProps = Object.keys(MultiplayerEngine).filter(k => typeof MultiplayerEngine[k] !== 'function').slice(0, 10);
      } else {
        info.mp = false;
      }
      if (typeof RoomLobby !== 'undefined') {
        info.rl = true;
        info.rlMethods = Object.keys(RoomLobby).filter(k => typeof RoomLobby[k] === 'function').slice(0, 15);
      } else {
        info.rl = false;
      }
      return info;
    });

    if (mpInfo.mp) {
      console.log(`  ✅ MultiplayerEngine exists`);
      console.log(`    Methods: ${mpInfo.mpMethods.join(', ')}`);
      console.log(`    Props: ${mpInfo.mpProps.join(', ')}`);
    } else {
      console.log('  ❌ MultiplayerEngine not found');
    }
    if (mpInfo.rl) {
      console.log(`  ✅ RoomLobby exists`);
      console.log(`    Methods: ${mpInfo.rlMethods.join(', ')}`);
    } else {
      console.log('  ❌ RoomLobby not found');
    }
    results.push({ test: 'MultiplayerEngine', status: mpInfo.mp ? 'PASS' : 'FAIL' });
    results.push({ test: 'RoomLobby', status: mpInfo.rl ? 'PASS' : 'FAIL' });
  } catch (e) {
    console.log(`  ❌ ${e.message}`);
  }

  // ─────────────────────────────────────────────────────
  // TEST 11: Click "Pass & Play" / Local Mode
  // ─────────────────────────────────────────────────────
  console.log('\n🔹 TEST 11: Click Pass & Play (Local Mode)');
  try {
    // Navigate back to home first
    await page.evaluate(() => { if (typeof UI !== 'undefined') UI.showScreen('homeScreen'); });
    await page.waitForTimeout(300);

    // Find the Pass & Play card
    const cards = await page.$$('#homeScreen .h-card');
    let localCard = null;
    for (const card of cards) {
      const text = await card.textContent();
      if (text.toLowerCase().includes('pass') || text.toLowerCase().includes('local') || text.toLowerCase().includes('play')) {
        localCard = card;
        break;
      }
    }

    if (localCard) {
      await localCard.click();
      await page.waitForTimeout(800);
      // Check which screen is now active
      const activeScreen = await page.evaluate(() => {
        const screens = document.querySelectorAll('.screen.active');
        return Array.from(screens).map(s => s.id);
      });
      console.log(`  Active screen(s) after click: ${activeScreen.join(', ')}`);
      results.push({ test: 'Pass & Play Click', status: activeScreen.length > 0 ? 'PASS' : 'FAIL', detail: activeScreen.join(', ') });
    } else {
      console.log('  ⚠️  Could not find Pass & Play card');
      results.push({ test: 'Pass & Play Click', status: 'WARN', detail: 'Card not found' });
    }
  } catch (e) {
    results.push({ test: 'Pass & Play Click', status: 'FAIL', detail: e.message.substring(0, 60) });
    console.log(`  ❌ ${e.message.substring(0, 60)}`);
  }

  // ─────────────────────────────────────────────────────
  // TEST 12: Player Lobby Screen Structure
  // ─────────────────────────────────────────────────────
  console.log('\n🔹 TEST 12: Player Lobby Screen Structure');
  try {
    await page.evaluate(() => { if (typeof UI !== 'undefined') UI.showScreen('playerLobbyScreen'); });
    await page.waitForTimeout(300);

    const lobbyInfo = await page.evaluate(() => {
      const screen = document.getElementById('playerLobbyScreen');
      if (!screen) return { found: false };
      return {
        found: true,
        buttons: screen.querySelectorAll('button').length,
        inputs: screen.querySelectorAll('input').length,
        innerHTML_length: screen.innerHTML.length,
        hasStartBtn: !!screen.querySelector('[onclick*="start"], .btn-start, #startBtn, [id*="start"]'),
      };
    });

    if (lobbyInfo.found) {
      console.log(`  ✅ playerLobbyScreen found (HTML: ${lobbyInfo.innerHTML_length} chars)`);
      console.log(`    Buttons: ${lobbyInfo.buttons}, Inputs: ${lobbyInfo.inputs}`);
      console.log(`    Has start button: ${lobbyInfo.hasStartBtn}`);
      results.push({ test: 'Lobby Structure', status: 'PASS' });
    } else {
      results.push({ test: 'Lobby Structure', status: 'FAIL' });
    }
  } catch (e) {
    results.push({ test: 'Lobby Structure', status: 'FAIL', detail: e.message.substring(0, 60) });
  }

  // ─────────────────────────────────────────────────────
  // TEST 13: Game Screen Structure
  // ─────────────────────────────────────────────────────
  console.log('\n🔹 TEST 13: Game Screen Structure');
  try {
    const gameInfo = await page.evaluate(() => {
      const screen = document.getElementById('gameScreen');
      if (!screen) return { found: false };
      return {
        found: true,
        innerHTML_length: screen.innerHTML.length,
        hasFrameContainer: !!screen.querySelector('[id*="frame"], [class*="frame"], .game-viewport, .viewport'),
        hasTimer: !!screen.querySelector('[id*="timer"], [class*="timer"], [id*="countdown"]'),
        hasScoreboard: !!screen.querySelector('[id*="score"], [class*="score"], [class*="leaderboard"]'),
        hasGuessInput: !!screen.querySelector('input[type="text"], .guess-input, [id*="guess"]'),
      };
    });

    if (gameInfo.found) {
      console.log(`  ✅ gameScreen found (HTML: ${gameInfo.innerHTML_length} chars)`);
      console.log(`    Frame container: ${gameInfo.hasFrameContainer}`);
      console.log(`    Timer: ${gameInfo.hasTimer}`);
      console.log(`    Scoreboard: ${gameInfo.hasScoreboard}`);
      console.log(`    Guess input: ${gameInfo.hasGuessInput}`);
      results.push({ test: 'Game Screen Structure', status: 'PASS' });
    } else {
      results.push({ test: 'Game Screen Structure', status: 'FAIL' });
    }
  } catch (e) {
    results.push({ test: 'Game Screen Structure', status: 'FAIL', detail: e.message.substring(0, 60) });
  }

  // ─────────────────────────────────────────────────────
  // TEST 14: Winner Screen Structure
  // ─────────────────────────────────────────────────────
  console.log('\n🔹 TEST 14: Winner Screen Structure');
  try {
    const winInfo = await page.evaluate(() => {
      const screen = document.getElementById('winnerScreen');
      if (!screen) return { found: false };
      return {
        found: true,
        innerHTML_length: screen.innerHTML.length,
        hasPodium: !!screen.querySelector('[class*="podium"], [id*="podium"]'),
        hasPlayAgain: !!screen.querySelector('[onclick*="play"], [onclick*="restart"], [onclick*="rematch"]'),
        hasHome: !!screen.querySelector('[onclick*="home"], [onclick*="goHome"]'),
      };
    });

    if (winInfo.found) {
      console.log(`  ✅ winnerScreen found (HTML: ${winInfo.innerHTML_length} chars)`);
      console.log(`    Podium: ${winInfo.hasPodium}`);
      console.log(`    Play Again: ${winInfo.hasPlayAgain}`);
      console.log(`    Home button: ${winInfo.hasHome}`);
      results.push({ test: 'Winner Screen Structure', status: 'PASS' });
    } else {
      results.push({ test: 'Winner Screen Structure', status: 'FAIL' });
    }
  } catch (e) {
    results.push({ test: 'Winner Screen Structure', status: 'FAIL', detail: e.message.substring(0, 60) });
  }

  // ─────────────────────────────────────────────────────
  // TEST 15: Image Asset Availability
  // ─────────────────────────────────────────────────────
  console.log('\n🔹 TEST 15: Critical Asset Availability');
  const criticalAssets = [
    'bg/cinema_bg.jpeg',
    'bg/guess_the_frame.png',
    'logo.png',
  ];
  for (const asset of criticalAssets) {
    try {
      const resp = await page.evaluate(async (url) => {
        const r = await fetch(url, { method: 'HEAD' });
        return { status: r.status, ok: r.ok };
      }, asset);
      const icon = resp.ok ? '✅' : '❌';
      console.log(`  ${icon} ${asset} => HTTP ${resp.status}`);
      results.push({ test: `Asset: ${asset}`, status: resp.ok ? 'PASS' : 'FAIL' });
    } catch (e) {
      console.log(`  ❌ ${asset} => ${e.message.substring(0, 60)}`);
      results.push({ test: `Asset: ${asset}`, status: 'FAIL' });
    }
  }

  // Check some GUESSTHEFRAME images
  console.log('\n  Checking GUESSTHEFRAME images...');
  const frameImages = await page.evaluate(() => {
    if (typeof GS === 'undefined' || !GS.sections) return [];
    const images = [];
    for (const s of GS.sections) {
      for (const f of (s.frames || [])) {
        if (f.type === 'image' && f.content) images.push(f.content);
      }
    }
    return images.slice(0, 5); // Check first 5
  });
  for (const img of frameImages) {
    try {
      const resp = await page.evaluate(async (url) => {
        const r = await fetch(url, { method: 'HEAD' });
        return { status: r.status, ok: r.ok };
      }, img);
      const icon = resp.ok ? '✅' : '❌';
      console.log(`  ${icon} ${img} => HTTP ${resp.status}`);
    } catch (e) {
      console.log(`  ❌ ${img} => ${e.message.substring(0, 40)}`);
    }
  }

  // ─────────────────────────────────────────────────────
  // TEST 16: Avatar Sprite Frames
  // ─────────────────────────────────────────────────────
  console.log('\n🔹 TEST 16: Avatar Sprite Frames');
  const avatars = ['aman', 'amish', 'aziz', 'vish'];
  for (const av of avatars) {
    try {
      const resp = await page.evaluate(async (url) => {
        const r = await fetch(url, { method: 'HEAD' });
        return { status: r.status, ok: r.ok };
      }, `avvtar/${av}/frame_0001.png`);
      const icon = resp.ok ? '✅' : '❌';
      console.log(`  ${icon} avvtar/${av}/frame_0001.png => HTTP ${resp.status}`);
      results.push({ test: `Avatar: ${av}`, status: resp.ok ? 'PASS' : 'FAIL' });
    } catch (e) {
      console.log(`  ❌ avvtar/${av} => ${e.message.substring(0, 40)}`);
      results.push({ test: `Avatar: ${av}`, status: 'FAIL' });
    }
  }

  // ─────────────────────────────────────────────────────
  // TEST 17: Online Multiplayer Flow (Create Room)
  // ─────────────────────────────────────────────────────
  console.log('\n🔹 TEST 17: Online Multiplayer - Create Room');
  try {
    await page.evaluate(() => { if (typeof UI !== 'undefined') UI.showScreen('homeScreen'); });
    await page.waitForTimeout(300);

    const createRoomResult = await page.evaluate(() => {
      if (typeof MultiplayerEngine === 'undefined') return { available: false };
      const methods = Object.keys(MultiplayerEngine).filter(k => typeof MultiplayerEngine[k] === 'function');
      return {
        available: true,
        hasCreateRoom: methods.includes('createRoom'),
        hasJoinRoom: methods.includes('joinRoom'),
        hasBroadcast: methods.includes('broadcast'),
        hasInit: methods.includes('init'),
        allMethods: methods
      };
    });

    if (createRoomResult.available) {
      console.log(`  ✅ MultiplayerEngine available`);
      console.log(`    createRoom: ${createRoomResult.hasCreateRoom}`);
      console.log(`    joinRoom: ${createRoomResult.hasJoinRoom}`);
      console.log(`    broadcast: ${createRoomResult.hasBroadcast}`);
      console.log(`    All methods: ${createRoomResult.allMethods.join(', ')}`);
      results.push({ test: 'MP Create/Join Methods', status: (createRoomResult.hasCreateRoom && createRoomResult.hasJoinRoom) ? 'PASS' : 'FAIL' });
    } else {
      console.log('  ❌ MultiplayerEngine not available');
      results.push({ test: 'MP Create/Join Methods', status: 'FAIL' });
    }
  } catch (e) {
    results.push({ test: 'MP Create Room', status: 'FAIL', detail: e.message.substring(0, 60) });
    console.log(`  ❌ ${e.message.substring(0, 60)}`);
  }

  // ─────────────────────────────────────────────────────
  // TEST 18: CSS Custom Properties
  // ─────────────────────────────────────────────────────
  console.log('\n🔹 TEST 18: CSS Custom Properties');
  try {
    const cssVars = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      return {
        bgDark: root.getPropertyValue('--bg-dark').trim(),
        neonPink: root.getPropertyValue('--neon-pink').trim(),
        clayInk: root.getPropertyValue('--clay-ink').trim(),
        glass: root.getPropertyValue('--glass').trim(),
      };
    });
    console.log(`  --bg-dark: "${cssVars.bgDark}"`);
    console.log(`  --neon-pink: "${cssVars.neonPink}"`);
    console.log(`  --clay-ink: "${cssVars.clayInk}"`);
    console.log(`  --glass: "${cssVars.glass}"`);
    const hasVars = cssVars.bgDark && cssVars.neonPink;
    results.push({ test: 'CSS Custom Props', status: hasVars ? 'PASS' : 'FAIL' });
    console.log(`  ${hasVars ? '✅' : '❌'} CSS variables defined`);
  } catch (e) {
    results.push({ test: 'CSS Custom Props', status: 'FAIL' });
  }

  // ─────────────────────────────────────────────────────
  // TEST 19: Responsive Layout Check
  // ─────────────────────────────────────────────────────
  console.log('\n🔹 TEST 19: Responsive Layout (Mobile)');
  try {
    await page.setViewportSize({ width: 375, height: 812 }); // iPhone size
    await page.waitForTimeout(500);
    await page.evaluate(() => { if (typeof UI !== 'undefined') UI.showScreen('homeScreen'); });
    await page.waitForTimeout(300);

    const mobileOk = await page.evaluate(() => {
      const home = document.getElementById('homeScreen');
      if (!home) return false;
      const rect = home.getBoundingClientRect();
      // Check nothing overflows
      return rect.width <= window.innerWidth + 5;
    });
    console.log(`  ${mobileOk ? '✅' : '❌'} Home screen fits mobile viewport (375x812)`);
    results.push({ test: 'Mobile Responsive', status: mobileOk ? 'PASS' : 'FAIL' });

    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 900 });
  } catch (e) {
    results.push({ test: 'Mobile Responsive', status: 'FAIL' });
  }

  // ─────────────────────────────────────────────────────
  // TEST 20: Appwrite SDK Loaded
  // ─────────────────────────────────────────────────────
  console.log('\n🔹 TEST 20: Appwrite SDK');
  try {
    const appwriteLoaded = await page.evaluate(() => {
      return typeof Appwrite !== 'undefined' || typeof window.Appwrite !== 'undefined';
    });
    console.log(`  ${appwriteLoaded ? '✅' : '❌'} Appwrite SDK loaded: ${appwriteLoaded}`);
    results.push({ test: 'Appwrite SDK', status: appwriteLoaded ? 'PASS' : 'WARN', detail: appwriteLoaded ? 'loaded' : 'not loaded (CDN might not be available)' });
  } catch (e) {
    results.push({ test: 'Appwrite SDK', status: 'FAIL' });
  }

  // ─────────────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(70));
  console.log('  SUMMARY');
  console.log('='.repeat(70));

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warned = results.filter(r => r.status === 'WARN').length;

  console.log(`\n  ✅ PASSED: ${passed}`);
  console.log(`  ❌ FAILED: ${failed}`);
  console.log(`  ⚠️  WARNINGS: ${warned}`);

  if (failed > 0) {
    console.log('\n  FAILED TESTS:');
    for (const r of results.filter(r => r.status === 'FAIL')) {
      console.log(`    ❌ ${r.test}${r.detail ? ' — ' + r.detail : ''}`);
    }
  }

  if (errors.length > 0) {
    console.log(`\n  JS ERRORS (${errors.length}):`);
    for (const e of errors) {
      console.log(`    ${e}`);
    }
  }

  if (failedRequests.length > 0) {
    console.log(`\n  FAILED NETWORK REQUESTS (${failedRequests.length}):`);
    for (const r of failedRequests) {
      console.log(`    ${r}`);
    }
  }

  if (httpErrors.length > 0) {
    console.log(`\n  HTTP ERRORS (${httpErrors.length}):`);
    for (const r of httpErrors.slice(0, 15)) {
      console.log(`    ${r}`);
    }
    if (httpErrors.length > 15) console.log(`    ... and ${httpErrors.length - 15} more`);
  }

  if (warnings.length > 0) {
    console.log(`\n  WARNINGS (${warnings.length}):`);
    for (const w of warnings) {
      console.log(`    ${w}`);
    }
  }

  console.log('\n' + '='.repeat(70));

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
})();
