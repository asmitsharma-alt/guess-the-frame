const { chromium } = require('playwright');

async function testConnectivity() {
  console.log('=====================================================');
  console.log('🕵️ TESTING MULTIPLAYER PLAYER JOIN & INVISIBILITY BUG');
  console.log('=====================================================');

  const browser = await chromium.launch({ headless: true });

  // 1. Host Context
  const hostContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const hostPage = await hostContext.newPage();

  // 2. Client / Joining Player Context
  const clientContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const clientPage = await clientContext.newPage();

  const hostLogs = [];
  const clientLogs = [];

  hostPage.on('console', msg => hostLogs.push(`[HOST] ${msg.text()}`));
  clientPage.on('console', msg => clientLogs.push(`[CLIENT] ${msg.text()}`));

  try {
    const URL = 'https://www.scoopcast-live.in';
    console.log(`\n1. Loading host page: ${URL}`);
    await hostPage.goto(URL, { waitUntil: 'networkidle' });

    console.log(`2. Loading client page: ${URL}`);
    await clientPage.goto(URL, { waitUntil: 'networkidle' });

    // Host creates room
    console.log(`\n3. Host creates room...`);
    const roomCode = await hostPage.evaluate(() => {
      const nameInput = document.getElementById('hostPlayerNameInput');
      if (nameInput) nameInput.value = 'HOST_AMAN';
      MultiplayerEngine.confirmCreateRoom();
      return MultiplayerEngine.roomCode;
    });

    console.log(`- Created Room Code: ${roomCode}`);

    // Give MQTT a second to subscribe
    await new Promise(r => setTimeout(r, 2000));

    // Client joins room
    console.log(`\n4. Client joins room ${roomCode}...`);
    await clientPage.evaluate((code) => {
      const codeInput = document.getElementById('joinCodeInput');
      if (codeInput) codeInput.value = code;
      const nameInput = document.getElementById('joinPlayerNameInput');
      if (nameInput) nameInput.value = 'CLIENT_VISH';
      MultiplayerEngine.confirmJoinRoom();
    }, roomCode);

    // Wait for handshake
    await new Promise(r => setTimeout(r, 3000));

    // Check presence on both Host and Client
    async function checkState(label) {
      const hostState = await hostPage.evaluate(() => {
        return {
          roomCode: MultiplayerEngine.roomCode,
          isHost: MultiplayerEngine.isHost,
          players: GS.players.map(p => ({ id: p.id, name: p.name, lastSeen: p.lastSeen })),
          lobbyRenderedNames: Array.from(document.querySelectorAll('#lobbyPlayersList .player-card, #lobbyPlayersList .cw-runner-card, .player-name, .nb-lobby-name')).map(el => el.textContent.trim()),
          lbRenderedNames: Array.from(document.querySelectorAll('#leaderboard .lb-name')).map(el => el.textContent.trim())
        };
      });

      const clientState = await clientPage.evaluate(() => {
        return {
          roomCode: MultiplayerEngine.roomCode,
          isHost: MultiplayerEngine.isHost,
          players: GS.players.map(p => ({ id: p.id, name: p.name })),
          lobbyRenderedNames: Array.from(document.querySelectorAll('#lobbyPlayersList .player-card, #lobbyPlayersList .cw-runner-card, .player-name, .nb-lobby-name')).map(el => el.textContent.trim()),
          lbRenderedNames: Array.from(document.querySelectorAll('#leaderboard .lb-name')).map(el => el.textContent.trim())
        };
      });

      console.log(`\n--- Presence Check: ${label} ---`);
      console.log(`Host sees players in GS.players (${hostState.players.length}):`, hostState.players.map(p => p.name));
      console.log(`Client sees players in GS.players (${clientState.players.length}):`, clientState.players.map(p => p.name));
      return { hostState, clientState };
    }

    await checkState('Immediately After Join');

    // Wait 12 seconds to observe heartbeat and watchdog (Watchdog threshold is 9.5s!)
    console.log('\n⏳ Waiting 12 seconds to observe presence watchdog (9.5s threshold)...');
    await new Promise(r => setTimeout(r, 12000));

    const checkAfter12s = await checkState('After 12 seconds');

    // Host starts match
    console.log('\n🎮 Host starts the match (startMatch)...');
    await hostPage.evaluate(() => {
      MultiplayerEngine.startMatch();
    });

    await new Promise(r => setTimeout(r, 3000));

    const checkDuringGame = await checkState('During Active Game Round');

    // Wait another 12 seconds during the game
    console.log('\n⏳ Waiting 12 seconds during active gameplay...');
    await new Promise(r => setTimeout(r, 12000));

    const checkAfterGame12s = await checkState('After 12s in Active Gameplay');

    console.log('\n--- HOST RECENT CONSOLE LOGS ---');
    console.log(hostLogs.filter(l => l.includes('Presence') || l.includes('Prun') || l.includes('Heartbeat') || l.includes('Security') || l.includes('Drop')).slice(-10).join('\n') || 'None');

    console.log('\n--- CLIENT RECENT CONSOLE LOGS ---');
    console.log(clientLogs.filter(l => l.includes('Heartbeat') || l.includes('Join') || l.includes('Security') || l.includes('Drop')).slice(-10).join('\n') || 'None');

  } finally {
    await browser.close();
  }
}

testConnectivity().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
