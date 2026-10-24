const { test, expect } = require('@playwright/test');

// Full sync + recovery coverage: lobby settings, late join, dropped-message self-heal,
// match start, scoring, pause/skip, offline recovery, rejoin (lobby + match),
// host migration and kick. Every test uses real independent browser contexts.

test.setTimeout(150000);

async function mkCtx(browser) {
  return browser.newContext({ viewport: { width: 1280, height: 720 } });
}

async function createRoom(browser, name) {
  const ctx = await mkCtx(browser);
  const page = await ctx.newPage();
  await page.goto('/');
  await page.locator('.h-card-create').click();
  await page.locator('#hostPlayerNameInput').fill(name);
  await page.locator('#createRoomModal .mp-btn-primary').click();
  await expect(page.locator('#playerLobbyScreen')).toBeVisible({ timeout: 20000 });
  const code = await page.evaluate(() => MultiplayerEngine.roomCode);
  return { ctx, page, code };
}

async function joinRoom(browser, code, name, avatar = 'praggya') {
  const ctx = await mkCtx(browser);
  const page = await ctx.newPage();
  await page.goto(`/?room=${code}`);
  await page.locator('#joinPlayerNameInput').fill(name);
  await page.locator(`#joinRoomModal .mp-avatar-option[data-avatar="${avatar}"]`).click();
  await page.locator('#joinRoomModal .mp-btn-primary').click();
  await expect(page.locator('#playerLobbyScreen')).toBeVisible({ timeout: 20000 });
  return { ctx, page };
}

const playersCount = (page) => page.evaluate(() => (GS.players || []).length);
const waitPlayers = (page, n) =>
  page.waitForFunction((n) => typeof GS !== 'undefined' && GS.players && GS.players.length >= n, n, { timeout: 25000 });
const settingsTimer = (page) => page.evaluate(() => MultiplayerEngine.hostSettings.timer);
const scoreOf = (page, name) =>
  page.evaluate((n) => { const p = (GS.players || []).find(x => x.name === n); return p ? p.score : null; }, name);
const currentAnswer = (page) =>
  page.evaluate(() => {
    const cur = MultiplayerEngine.currentPlaylist?.[MultiplayerEngine.currentPlayIndex];
    return cur ? cur.answer : null;
  });

async function startMatch(host, others) {
  await host.locator('#lobbyStartBtn').click();
  await expect(host.locator('#gameScreen')).toBeVisible({ timeout: 25000 });
  for (const o of others) await expect(o.locator('#gameScreen')).toBeVisible({ timeout: 25000 });
}

async function closeAll(...ctxs) { for (const c of ctxs) { try { await c.close(); } catch (e) {} } }

test('SYNC 1: host lobby settings change reaches every peer', async ({ browser }) => {
  const h = await createRoom(browser, 'HostA');
  const p1 = await joinRoom(browser, h.code, 'PeerB');
  const p2 = await joinRoom(browser, h.code, 'PeerC', 'joel');
  await waitPlayers(h.page, 3); await waitPlayers(p1.page, 3); await waitPlayers(p2.page, 3);

  const before = await settingsTimer(h.page);
  await h.page.evaluate(() => PlayerLobby.adjustTimer(1));
  const after = await settingsTimer(h.page);
  expect(after).not.toBe(before);
  for (const p of [p1, p2]) {
    await p.page.waitForFunction((t) => MultiplayerEngine.hostSettings.timer === t, after, { timeout: 10000 });
  }
  await closeAll(h.ctx, p1.ctx, p2.ctx);
});

test('SYNC 2: late joiner receives the already-changed settings and full roster', async ({ browser }) => {
  const h = await createRoom(browser, 'HostA');
  const p1 = await joinRoom(browser, h.code, 'PeerB');
  await h.page.evaluate(() => PlayerLobby.adjustTimer(1));
  const t = await settingsTimer(h.page);
  const late = await joinRoom(browser, h.code, 'LateD', 'ayush');
  await waitPlayers(late.page, 3);
  await late.page.waitForFunction((t) => MultiplayerEngine.hostSettings.timer === t, t, { timeout: 10000 });
  const names = await late.page.evaluate(() => GS.players.map(p => p.name).sort());
  expect(names).toEqual(['HostA', 'LateD', 'PeerB']);
  await closeAll(h.ctx, p1.ctx, late.ctx);
});

test('SYNC 3: dropped lobby message self-heals via periodic host resync', async ({ browser }) => {
  const h = await createRoom(browser, 'HostA');
  const p1 = await joinRoom(browser, h.code, 'PeerB');
  await waitPlayers(h.page, 2); await waitPlayers(p1.page, 2);
  // Simulate a lost broadcast: change host state with NO message sent.
  await h.page.evaluate(() => { MultiplayerEngine.hostSettings = { ...MultiplayerEngine.hostSettings, timer: 17 }; });
  await p1.page.waitForFunction(() => MultiplayerEngine.hostSettings.timer === 17, null, { timeout: 12000 });
  await closeAll(h.ctx, p1.ctx);
});

test('SYNC 4: match start moves all clients to the arena with the same playlist and index', async ({ browser }) => {
  const h = await createRoom(browser, 'HostA');
  const p1 = await joinRoom(browser, h.code, 'PeerB');
  const p2 = await joinRoom(browser, h.code, 'PeerC', 'joel');
  await waitPlayers(h.page, 3);
  await startMatch(h.page, [p1.page, p2.page]);
  await h.page.waitForTimeout(2500);
  const [a, b, c] = await Promise.all([h.page, p1.page, p2.page].map(p =>
    p.evaluate(() => ({
      len: MultiplayerEngine.currentPlaylist?.length,
      idx: MultiplayerEngine.currentPlayIndex,
      first: MultiplayerEngine.currentPlaylist?.[0]?.answer,
      active: MultiplayerEngine.isMatchActive
    }))));
  expect(b).toEqual(a);
  expect(c).toEqual(a);
  expect(a.active).toBe(true);
  await closeAll(h.ctx, p1.ctx, p2.ctx);
});

test('SYNC 5: correct answer awards the same score on host and all peers', async ({ browser }) => {
  const h = await createRoom(browser, 'HostA');
  const p1 = await joinRoom(browser, h.code, 'PeerB');
  const p2 = await joinRoom(browser, h.code, 'PeerC', 'joel');
  await waitPlayers(h.page, 3);
  await startMatch(h.page, [p1.page, p2.page]);
  const ans = await currentAnswer(h.page);
  await p1.page.locator('#chatTextInput').fill(ans);
  await p1.page.locator('#chatSendBtn').click();
  for (const pg of [h.page, p1.page, p2.page]) {
    await pg.waitForFunction(() => (GS.players.find(p => p.name === 'PeerB') || {}).score >= 10, null, { timeout: 15000 });
  }
  const scores = await Promise.all([h.page, p1.page, p2.page].map(p => scoreOf(p, 'PeerB')));
  expect(new Set(scores).size).toBe(1);
  expect(scores[0]).toBe(10);
  await closeAll(h.ctx, p1.ctx, p2.ctx);
});

test('SYNC 6: wrong answer awards nothing anywhere', async ({ browser }) => {
  const h = await createRoom(browser, 'HostA');
  const p1 = await joinRoom(browser, h.code, 'PeerB');
  await waitPlayers(h.page, 2);
  await startMatch(h.page, [p1.page]);
  await p1.page.locator('#chatTextInput').fill('zzqxjkv');
  await p1.page.locator('#chatSendBtn').click();
  await h.page.waitForTimeout(3000);
  expect(await scoreOf(h.page, 'PeerB')).toBe(0);
  expect(await scoreOf(p1.page, 'PeerB')).toBe(0);
  await closeAll(h.ctx, p1.ctx);
});

test('SYNC 7: host pause and resume propagate to peers', async ({ browser }) => {
  const h = await createRoom(browser, 'HostA');
  const p1 = await joinRoom(browser, h.code, 'PeerB');
  await waitPlayers(h.page, 2);
  await startMatch(h.page, [p1.page]);
  await h.page.evaluate(() => MultiplayerEngine.hostTogglePause());
  await p1.page.waitForFunction(() => MultiplayerEngine.isPaused === true, null, { timeout: 10000 });
  await h.page.evaluate(() => MultiplayerEngine.hostTogglePause());
  await p1.page.waitForFunction(() => MultiplayerEngine.isPaused === false, null, { timeout: 10000 });
  await closeAll(h.ctx, p1.ctx);
});

test('SYNC 8: host skip advances every client to the same frame', async ({ browser }) => {
  const h = await createRoom(browser, 'HostA');
  const p1 = await joinRoom(browser, h.code, 'PeerB');
  const p2 = await joinRoom(browser, h.code, 'PeerC', 'joel');
  await waitPlayers(h.page, 3);
  await startMatch(h.page, [p1.page, p2.page]);
  const startIdx = await h.page.evaluate(() => MultiplayerEngine.currentPlayIndex);
  await h.page.evaluate(() => MultiplayerEngine.hostSkipRound());
  await h.page.waitForTimeout(1500);
  await h.page.evaluate(() => { try { MultiplayerEngine.hostNextRound(); } catch (e) {} });
  await h.page.waitForFunction((s) => MultiplayerEngine.currentPlayIndex > s, startIdx, { timeout: 20000 });
  const hostIdx = await h.page.evaluate(() => MultiplayerEngine.currentPlayIndex);
  for (const p of [p1, p2]) {
    await p.page.waitForFunction((i) => MultiplayerEngine.currentPlayIndex === i, hostIdx, { timeout: 15000 });
  }
  await closeAll(h.ctx, p1.ctx, p2.ctx);
});

test('RECOVERY 1: player going offline mid-match catches up on missed scores after reconnecting', async ({ browser }) => {
  const h = await createRoom(browser, 'HostA');
  const p1 = await joinRoom(browser, h.code, 'PeerB');
  const p2 = await joinRoom(browser, h.code, 'PeerC', 'joel');
  await waitPlayers(h.page, 3);
  await startMatch(h.page, [p1.page, p2.page]);

  await p2.ctx.setOffline(true);
  const ans = await currentAnswer(h.page);
  await p1.page.locator('#chatTextInput').fill(ans);
  await p1.page.locator('#chatSendBtn').click();
  await h.page.waitForFunction(() => (GS.players.find(p => p.name === 'PeerB') || {}).score >= 10, null, { timeout: 15000 });
  await p2.page.waitForTimeout(4000);
  await p2.ctx.setOffline(false);

  await p2.page.waitForFunction(() => (GS.players.find(p => p.name === 'PeerB') || {}).score >= 10, null, { timeout: 40000 });
  expect(await scoreOf(p2.page, 'PeerB')).toBe(await scoreOf(h.page, 'PeerB'));
  await closeAll(h.ctx, p1.ctx, p2.ctx);
});

test('RECOVERY 2: player refresh in the lobby rejoins without duplicating the roster', async ({ browser }) => {
  const h = await createRoom(browser, 'HostA');
  const p1 = await joinRoom(browser, h.code, 'PeerB');
  await waitPlayers(h.page, 2);
  await p1.page.close();
  const np = await p1.ctx.newPage();
  await np.goto('/');
  await expect(np.locator('#rejoinRoomModal')).toBeVisible({ timeout: 15000 });
  await np.locator('#rejoinRoomModal .mp-btn-primary').click();
  await expect(np.locator('#playerLobbyScreen')).toBeVisible({ timeout: 20000 });
  await h.page.waitForTimeout(4000);
  const names = await h.page.evaluate(() => GS.players.map(p => p.name));
  expect(names.filter(n => n === 'PeerB').length).toBe(1);
  expect(names.length).toBe(2);
  await closeAll(h.ctx, p1.ctx);
});

test('RECOVERY 3: mid-match rejoin restores arena, score and current frame index', async ({ browser }) => {
  const h = await createRoom(browser, 'HostA');
  const p1 = await joinRoom(browser, h.code, 'PeerB');
  await waitPlayers(h.page, 2);
  await startMatch(h.page, [p1.page]);
  const ans = await currentAnswer(h.page);
  await p1.page.locator('#chatTextInput').fill(ans);
  await p1.page.locator('#chatSendBtn').click();
  await p1.page.waitForFunction(() => (GS.players.find(p => p.name === 'PeerB') || {}).score >= 10, null, { timeout: 15000 });
  const hostIdx = await h.page.evaluate(() => MultiplayerEngine.currentPlayIndex);

  await p1.page.close();
  await h.page.waitForTimeout(2000);
  const np = await p1.ctx.newPage();
  await np.goto('/');
  await expect(np.locator('#rejoinRoomModal')).toBeVisible({ timeout: 15000 });
  await np.locator('#rejoinRoomModal .mp-btn-primary').click();
  await expect(np.locator('#gameScreen')).toBeVisible({ timeout: 20000 });
  await np.waitForFunction(() => (GS.players.find(p => p.name === 'PeerB') || {}).score === 10, null, { timeout: 15000 });
  const idx = await np.evaluate(() => MultiplayerEngine.currentPlayIndex);
  expect(idx).toBe(hostIdx);
  await closeAll(h.ctx, p1.ctx);
});

test('RECOVERY 4: host disappears mid-match and a peer is promoted to the single host', async ({ browser }) => {
  const h = await createRoom(browser, 'HostA');
  const p1 = await joinRoom(browser, h.code, 'PeerB');
  const p2 = await joinRoom(browser, h.code, 'PeerC', 'joel');
  await waitPlayers(h.page, 3);
  await startMatch(h.page, [p1.page, p2.page]);

  await h.ctx.setOffline(true);
  await h.page.close();

  await expect.poll(async () => {
    const flags = await Promise.all([p1.page, p2.page].map(p => p.evaluate(() => MultiplayerEngine.isHost)));
    return flags.filter(Boolean).length;
  }, { timeout: 60000, intervals: [2000] }).toBe(1);

  await closeAll(h.ctx, p1.ctx, p2.ctx);
});

test('RECOVERY 5: host removes a player and that player is returned home, roster updates', async ({ browser }) => {
  const h = await createRoom(browser, 'HostA');
  const p1 = await joinRoom(browser, h.code, 'PeerB');
  await waitPlayers(h.page, 2);
  const idx = await h.page.evaluate(() => GS.players.findIndex(p => p.name === 'PeerB'));
  await h.page.evaluate((i) => PlayerLobby.remove(i), idx);
  await expect(p1.page.locator('#homeScreen')).toBeVisible({ timeout: 15000 });
  await h.page.waitForFunction(() => GS.players.length === 1, null, { timeout: 10000 });
  await closeAll(h.ctx, p1.ctx);
});
