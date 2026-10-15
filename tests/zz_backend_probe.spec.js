const { test, expect } = require('@playwright/test');
test.setTimeout(120000);

test('BACKEND PROBE: answer exposure to peers + host impersonation over realtime', async ({ browser }) => {
  const hc = await browser.newContext(); const h = await hc.newPage();
  await h.goto('/');
  await h.locator('.h-card-create').click();
  await h.locator('#hostPlayerNameInput').fill('Host');
  await h.locator('#createRoomModal .mp-btn-primary').click();
  await expect(h.locator('#playerLobbyScreen')).toBeVisible({ timeout: 20000 });
  const code = await h.evaluate(() => MultiplayerEngine.roomCode);

  const pc = await browser.newContext(); const p = await pc.newPage();
  await p.goto(`/?room=${code}`);
  await p.locator('#joinPlayerNameInput').fill('Attacker');
  await p.locator('#joinRoomModal .mp-btn-primary').click();
  await expect(p.locator('#playerLobbyScreen')).toBeVisible({ timeout: 20000 });
  await h.waitForFunction(() => GS.players.length >= 2, null, { timeout: 25000 });

  await h.locator('#lobbyStartBtn').click();
  await expect(h.locator('#gameScreen')).toBeVisible({ timeout: 25000 });
  await expect(p.locator('#gameScreen')).toBeVisible({ timeout: 25000 });
  await p.waitForTimeout(3000);

  // 1) Does a regular PLAYER's browser hold the correct answers in memory?
  const peerView = await p.evaluate(() => {
    const pl = MultiplayerEngine.currentPlaylist || [];
    const cur = pl[MultiplayerEngine.currentPlayIndex];
    return { playlistLen: pl.length, answersPresent: pl.filter(x => x && x.answer).length, currentAnswer: cur ? cur.answer : null };
  });
  console.log('PEER MEMORY  ->', JSON.stringify(peerView));

  // 2) Can a PLAYER impersonate the host (no verification of senderId/token)?
  const hostId = await h.evaluate(() => MultiplayerEngine.playerId);
  const before = await h.evaluate(() => ({ paused: MultiplayerEngine.isPaused, active: MultiplayerEngine.isMatchActive }));
  await p.evaluate((hostId) => {
    const e = MultiplayerEngine;
    const orig = e.playerId;
    e.playerId = hostId;            // attacker claims host's id
    e.isHost = false;
    e.sendEvent('HOST_PAUSE_BROADCAST', { paused: true });
    e.playerId = orig;
  }, hostId);
  await h.waitForTimeout(2500);
  const after = await h.evaluate(() => ({ paused: MultiplayerEngine.isPaused, active: MultiplayerEngine.isMatchActive }));
  console.log('HOST PAUSE BEFORE', JSON.stringify(before), 'AFTER forged message from player ->', JSON.stringify(after));

  await p.evaluate((hostId) => {
    const e = MultiplayerEngine; const orig = e.playerId; e.playerId = hostId;
    e.sendEvent('GAME_OVER_BROADCAST', { players: GS.players.map(x => ({ ...x, score: x.name === 'Attacker' ? 9999 : x.score })) });
    e.playerId = orig;
  }, hostId);
  await h.waitForTimeout(3000);
  const end = await h.evaluate(() => ({ winnerVisible: document.getElementById('winnerScreen')?.classList.contains('active'), scores: GS.players.map(x => x.name + ':' + x.score).join(', ') }));
  console.log('AFTER forged GAME_OVER from player -> host sees', JSON.stringify(end));
  await hc.close(); await pc.close();
});
