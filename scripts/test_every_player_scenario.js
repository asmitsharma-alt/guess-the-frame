const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

function createLocalServer(port = 4173) {
  const rootDir = path.resolve(__dirname, '..');
  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/') reqPath = '/index.html';
    const filePath = path.join(rootDir, reqPath);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const contentTypes = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml'
      };
      res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  return new Promise((resolve, reject) => {
    server.listen(port, () => resolve(server));
    server.on('error', reject);
  });
}

async function waitForCondition(fn, timeoutMs = 15000, intervalMs = 500) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const ok = await fn();
      if (ok) return true;
    } catch(e) {}
    await new Promise(r => setTimeout(r, intervalMs));
  }
  return false;
}

async function runAllPlayerScenarios() {
  console.log('================================================================');
  console.log('🎮 COMPREHENSIVE MULTIPLAYER LIFECYCLE & RESILIENCE TEST SUITE');
  console.log('================================================================');

  let localServer = null;
  let URL = process.env.TEST_URL;

  if (!URL) {
    const port = 4173;
    localServer = await createLocalServer(port);
    URL = `http://localhost:${port}`;
    console.log(`🚀 Serving local build on ${URL}`);
  } else {
    console.log(`🌐 Testing against remote URL: ${URL}`);
  }

  const browser = await chromium.launch({ headless: true });

  const hostCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const p2Ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const p3Ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const strangerCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });

  const hostPage = await hostCtx.newPage();
  const p2Page = await p2Ctx.newPage();
  const p3Page = await p3Ctx.newPage();
  const strangerPage = await strangerCtx.newPage();

  function attachListeners(page, label) {
    page.on('pageerror', err => console.log(`[${label} ERROR]:`, err.message));
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[JoinRejected]') || text.includes('Error') || text.includes('left the room') || text.includes('reconnected')) {
        console.log(`[${label} CONSOLE]:`, text);
      }
    });
  }

  attachListeners(hostPage, 'HOST');
  attachListeners(p2Page, 'P2');
  attachListeners(p3Page, 'P3');
  attachListeners(strangerPage, 'STRANGER');

  try {
    console.log('\n--- SCENARIO 1: ROOM CREATION & MULTI-PLAYER LOBBY JOIN ---');
    console.log(`Loading Host, Player 2, and Player 3...`);
    await Promise.all([
      hostPage.goto(URL, { waitUntil: 'domcontentloaded' }),
      p2Page.goto(URL, { waitUntil: 'domcontentloaded' }),
      p3Page.goto(URL, { waitUntil: 'domcontentloaded' })
    ]);

    await new Promise(r => setTimeout(r, 1000));

    // Host creates room
    const roomCode = await hostPage.evaluate(() => {
      document.getElementById('hostPlayerNameInput').value = 'AMAN (Host)';
      MultiplayerEngine.confirmCreateRoom();
      return MultiplayerEngine.roomCode;
    });
    console.log(`✅ Host created Room Code: "${roomCode}"`);

    await new Promise(r => setTimeout(r, 1500));

    // Player 2 joins
    await p2Page.evaluate((code) => {
      document.getElementById('joinCodeInput').value = code;
      document.getElementById('joinPlayerNameInput').value = 'VISH (Player 2)';
      MultiplayerEngine.confirmJoinRoom();
    }, roomCode);
    console.log(`✅ Player 2 (VISH) joined room "${roomCode}"`);

    await new Promise(r => setTimeout(r, 1500));

    // Player 3 joins
    await p3Page.evaluate((code) => {
      document.getElementById('joinCodeInput').value = code;
      document.getElementById('joinPlayerNameInput').value = 'AZIZ (Player 3)';
      MultiplayerEngine.confirmJoinRoom();
    }, roomCode);
    console.log(`✅ Player 3 (AZIZ) joined room "${roomCode}"`);

    console.log('Waiting for all 3 players to synchronize in lobby...');
    const syncedLobby = await waitForCondition(async () => {
      const [h, p2, p3] = await Promise.all([
        hostPage.evaluate(() => GS.players.length),
        p2Page.evaluate(() => GS.players.length),
        p3Page.evaluate(() => GS.players.length)
      ]);
      return h === 3 && p2 === 3 && p3 === 3;
    }, 20000, 500);

    const hostPlayers = await hostPage.evaluate(() => GS.players.map(p => p.name));
    const p2Players = await p2Page.evaluate(() => GS.players.map(p => p.name));
    const p3Players = await p3Page.evaluate(() => GS.players.map(p => p.name));

    console.log(`- Host Lobby count: ${hostPlayers.length} players [${hostPlayers.join(', ')}]`);
    console.log(`- Player 2 Lobby count: ${p2Players.length} players [${p2Players.join(', ')}]`);
    console.log(`- Player 3 Lobby count: ${p3Players.length} players [${p3Players.join(', ')}]`);

    if (syncedLobby) {
      console.log(`✅ SCENARIO 1 PASSED: All 3 players synchronized in lobby!`);
    } else {
      throw new Error(`Scenario 1 Failed: Player counts mismatch in lobby (Host: ${hostPlayers.length}, P2: ${p2Players.length}, P3: ${p3Players.length})`);
    }

    console.log('\n--- SCENARIO 2: GAME START & ROUND 1 ANSWERING ---');
    console.log('Host starts match...');
    await hostPage.evaluate(() => MultiplayerEngine.startMatch());

    console.log('Waiting for gameScreen activation across all clients...');
    const matchStarted = await waitForCondition(async () => {
      const [h, p2, p3] = await Promise.all([
        hostPage.evaluate(() => document.getElementById('gameScreen')?.classList.contains('active')),
        p2Page.evaluate(() => document.getElementById('gameScreen')?.classList.contains('active')),
        p3Page.evaluate(() => document.getElementById('gameScreen')?.classList.contains('active'))
      ]);
      return h && p2 && p3;
    }, 15000, 500);

    console.log(`- GameScreen active on all players: ${matchStarted ? '✅ YES' : '❌ NO'}`);
    if (!matchStarted) throw new Error('Scenario 2 Failed: gameScreen not active on all contexts');

    console.log('Player 2 submits guess for active round...');
    const p2WinResult = await p2Page.evaluate(async () => {
      const guess = (MultiplayerEngine.currentClientFrame && MultiplayerEngine.currentClientFrame.answer) || 'welcome';
      MultiplayerEngine.submitGuessDirect(guess);
      await new Promise(r => setTimeout(r, 1000));
      return {
        myScore: GS.players.find(p => p.id === MultiplayerEngine.playerId)?.score || 0,
        winnersCount: (MultiplayerEngine.currentRoundWinners || []).length
      };
    });

    console.log(`- Player 2 score after guess: ${p2WinResult.myScore} pts`);
    console.log(`✅ SCENARIO 2 PASSED: Game started and round in progress!`);

    console.log('\n--- SCENARIO 3: MID-GAME PLAYER DISCONNECT (PLAYER 3 LEAVES) ---');
    console.log('Player 3 leaves room mid-match...');
    await p3Page.evaluate(() => MultiplayerEngine.leaveRoom());

    console.log('Waiting for host to update player count to 2...');
    const hostPrunedP3 = await waitForCondition(async () => {
      const hCount = await hostPage.evaluate(() => GS.players.length);
      return hCount === 2;
    }, 12000, 500);

    const hostAfterLeave = await hostPage.evaluate(() => ({
      playersRemaining: GS.players.length,
      playerNames: GS.players.map(p => p.name),
      isMatchStillActive: MultiplayerEngine.isMatchActive
    }));

    console.log(`- Players remaining on Host: ${hostAfterLeave.playersRemaining} [${hostAfterLeave.playerNames.join(', ')}]`);
    console.log(`- Match still active: ${hostAfterLeave.isMatchStillActive ? '✅ YES' : '❌ NO'}`);

    if (hostPrunedP3 && hostAfterLeave.isMatchStillActive) {
      console.log(`✅ SCENARIO 3 PASSED: Game runs smoothly after player departure without freezing!`);
    } else {
      throw new Error('Scenario 3 Failed: Host state incorrect after player leave');
    }

    console.log('\n--- SCENARIO 4: MID-GAME RECONNECT & SCORE RESTORATION (PLAYER 3 REJOINS) ---');
    console.log('Player 3 re-enters the active room mid-game...');
    await p3Page.evaluate((code) => {
      document.getElementById('joinCodeInput').value = code;
      document.getElementById('joinPlayerNameInput').value = 'AZIZ (Player 3)';
      MultiplayerEngine.confirmJoinRoom();
    }, roomCode);

    console.log('Waiting for Player 3 to be restored into game screen with 3 total players...');
    const p3Rejoined = await waitForCondition(async () => {
      const hCount = await hostPage.evaluate(() => GS.players.length);
      const p3Active = await p3Page.evaluate(() => document.getElementById('gameScreen')?.classList.contains('active'));
      return hCount === 3 && p3Active;
    }, 15000, 500);

    const p3RejoinState = await p3Page.evaluate(() => ({
      isMatchActive: MultiplayerEngine.isMatchActive,
      gameScreenActive: document.getElementById('gameScreen')?.classList.contains('active'),
      playersCount: GS.players.length,
      currentPlayIndex: MultiplayerEngine.currentPlayIndex
    }));

    const hostAfterRejoin = await hostPage.evaluate(() => ({
      playersCount: GS.players.length,
      playerNames: GS.players.map(p => p.name)
    }));

    console.log(`- Player 3 recovered active game screen: ${p3RejoinState.gameScreenActive ? '✅ YES' : '❌ NO'}`);
    console.log(`- Host sees restored player count: ${hostAfterRejoin.playersCount} [${hostAfterRejoin.playerNames.join(', ')}]`);

    if (p3Rejoined) {
      console.log(`✅ SCENARIO 4 PASSED: Reconnecting player restored into active game round seamlessly!`);
    } else {
      throw new Error('Scenario 4 Failed: Rejoin did not restore player to game screen');
    }

    console.log('\n--- SCENARIO 5: MID-MATCH STRANGER JOIN ATTEMPT ---');
    console.log('Stranger (new player who never joined) attempts to join active match...');
    await strangerPage.goto(URL, { waitUntil: 'domcontentloaded' });
    
    await strangerPage.evaluate(async (code) => {
      document.getElementById('joinCodeInput').value = code;
      document.getElementById('joinPlayerNameInput').value = 'STRANGER';
      MultiplayerEngine.confirmJoinRoom();
    }, roomCode);

    await new Promise(r => setTimeout(r, 2500));

    const hostStrangerCheck = await hostPage.evaluate(() => GS.players.map(p => p.name));
    console.log(`- Host players list intact: [${hostStrangerCheck.join(', ')}] (Stranger rejected as expected)`);
    if (hostStrangerCheck.length === 3 && !hostStrangerCheck.includes('STRANGER')) {
      console.log(`✅ SCENARIO 5 PASSED: Unauthorized mid-game strangers blocked from corrupting match!`);
    } else {
      throw new Error('Scenario 5 Failed: Stranger was not rejected');
    }

    console.log('\n--- SCENARIO 6: HOST ADVANCES TO NEXT ROUND ---');
    console.log('Host triggers hostNextRound()...');
    await hostPage.evaluate(() => MultiplayerEngine.hostNextRound());

    console.log('Waiting for round index 1 across all 3 contexts...');
    const round2Synced = await waitForCondition(async () => {
      const [hIdx, p2Idx, p3Idx] = await Promise.all([
        hostPage.evaluate(() => MultiplayerEngine.currentPlayIndex),
        p2Page.evaluate(() => MultiplayerEngine.currentPlayIndex),
        p3Page.evaluate(() => MultiplayerEngine.currentPlayIndex)
      ]);
      return hIdx === 1 && p2Idx === 1 && p3Idx === 1;
    }, 12000, 500);

    const round2Indices = await Promise.all([
      hostPage.evaluate(() => MultiplayerEngine.currentPlayIndex),
      p2Page.evaluate(() => MultiplayerEngine.currentPlayIndex),
      p3Page.evaluate(() => MultiplayerEngine.currentPlayIndex)
    ]);

    console.log(`- Host round index: ${round2Indices[0]}`);
    console.log(`- Player 2 round index: ${round2Indices[1]}`);
    console.log(`- Rejoined Player 3 round index: ${round2Indices[2]}`);

    if (round2Synced) {
      console.log(`✅ SCENARIO 6 PASSED: All players advanced to Round 2 simultaneously!`);
    } else {
      throw new Error('Scenario 6 Failed: Round advance desync');
    }

    console.log('\n--- SCENARIO 7: FINISH MATCH & WINNER SCREEN TRANSITION ---');
    console.log('Host finishes game...');
    await hostPage.evaluate(() => MultiplayerEngine.finishGame());

    console.log('Waiting for winnerScreen activation across all players...');
    const winnerSynced = await waitForCondition(async () => {
      const [hWin, p2Win, p3Win] = await Promise.all([
        hostPage.evaluate(() => document.getElementById('winnerScreen')?.classList.contains('active')),
        p2Page.evaluate(() => document.getElementById('winnerScreen')?.classList.contains('active')),
        p3Page.evaluate(() => document.getElementById('winnerScreen')?.classList.contains('active'))
      ]);
      return hWin && p2Win && p3Win;
    }, 12000, 500);

    const winnerScreenStates = await Promise.all([
      hostPage.evaluate(() => document.getElementById('winnerScreen')?.classList.contains('active')),
      p2Page.evaluate(() => document.getElementById('winnerScreen')?.classList.contains('active')),
      p3Page.evaluate(() => document.getElementById('winnerScreen')?.classList.contains('active'))
    ]);

    console.log(`- Host winner screen active: ${winnerScreenStates[0] ? '✅' : '❌'}`);
    console.log(`- Player 2 winner screen active: ${winnerScreenStates[1] ? '✅' : '❌'}`);
    console.log(`- Rejoined Player 3 winner screen active: ${winnerScreenStates[2] ? '✅' : '❌'}`);

    if (winnerSynced) {
      console.log(`✅ SCENARIO 7 PASSED: Clean winner screen transition for all players!`);
    } else {
      throw new Error('Scenario 7 Failed: Winner screen not active on all contexts');
    }

    console.log('\n================================================================');
    console.log('🏆 ALL MULTIPLAYER LIFECYCLE & RESILIENCE SCENARIOS PASSED (7/7)!');
    console.log('================================================================');

  } finally {
    await browser.close();
    if (localServer) {
      localServer.close();
      console.log('🛑 Local test server stopped.');
    }
  }
}

runAllPlayerScenarios().catch(err => {
  console.error('\n❌ Scenario test suite failed:', err);
  process.exit(1);
});
