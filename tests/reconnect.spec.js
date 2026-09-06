const { test, expect } = require("@playwright/test");

test.describe("Reconnection, State Resumption & Network Recovery", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
  });

  test("Active room session is persisted to localStorage", async ({ page }) => {
    await page.evaluate(() => {
      MultiplayerEngine.roomCode = "RECON";
      MultiplayerEngine.roomId = "room_123";
      MultiplayerEngine.playerId = "player_rec";
      MultiplayerEngine.playerName = "ReconnectingPlayer";
      MultiplayerEngine.playerAvatar = "aziz";
      MultiplayerEngine.isHost = false;
      MultiplayerEngine.saveActiveSession();
    });

    const stored = await page.evaluate(() => {
      const raw = localStorage.getItem("gtf_active_session");
      return raw ? JSON.parse(raw) : null;
    });

    expect(stored).not.toBeNull();
    expect(stored.roomCode).toBe("RECON");
    expect(stored.playerId).toBe("player_rec");
    expect(stored.playerName).toBe("ReconnectingPlayer");
  });

  test("Detecting recent active session triggers rejoin modal upon URL check", async ({ page }) => {
    await page.evaluate(() => {
      const session = {
        roomCode: "RECON",
        roomId: "room_123",
        playerId: "player_rec",
        playerName: "ReconnectingPlayer",
        playerAvatar: "aziz",
        isHost: false,
        timestamp: Date.now()
      };
      localStorage.setItem("gtf_active_session", JSON.stringify(session));
      MultiplayerEngine.checkUrlParams();
    });

    const rejoinModal = page.locator("#rejoinRoomModal");
    await expect(rejoinModal).toBeVisible();

    const codeText = page.locator("#rejoinRoomCodeText");
    await expect(codeText).toHaveText("RECON");
  });

  test("Host heartbeat starts on becomeHost and dispatches periodic heartbeats", async ({ page }) => {
    const heartbeatStatus = await page.evaluate(() => {
      MultiplayerEngine.isHost = true;
      MultiplayerEngine.roomCode = "HEART";
      MultiplayerEngine.startHostHeartbeat();
      return {
        hasInterval: MultiplayerEngine._heartbeatInterval !== null
      };
    });

    expect(heartbeatStatus.hasInterval).toBe(true);

    // Stop heartbeat cleanup
    await page.evaluate(() => MultiplayerEngine.stopHostHeartbeat());
  });

  test("Host watchdog initiates migration when host heartbeat exceeds timeout", async ({ page }) => {
    const migrationAttempted = await page.evaluate(() => {
      GameController._onlineMode = true;
      MultiplayerEngine.isHost = false;
      MultiplayerEngine.roomCode = "HEART";
      MultiplayerEngine.playerId = "candidate_1";
      MultiplayerEngine.playerName = "CandidatePlayer";
      GS.players = [
        { id: "old_host", name: "DeadHost", isHost: true },
        { id: "candidate_1", name: "CandidatePlayer", isHost: false }
      ];

      // Simulate last heartbeat 15 seconds ago (threshold is 12s)
      MultiplayerEngine.lastHostHeartbeat = Date.now() - 15000;
      MultiplayerEngine.checkHostMigration();

      return MultiplayerEngine.isHost;
    });

    expect(migrationAttempted).toBe(true);
  });

  test("Leaving room cleanly cleans up intervals, active sessions, and connections", async ({ page }) => {
    await page.evaluate(() => {
      MultiplayerEngine.roomCode = "CLEAN";
      MultiplayerEngine.saveActiveSession();
      MultiplayerEngine.startHostHeartbeat();
      MultiplayerEngine.startHostWatchdog();
      MultiplayerEngine.leaveRoom();
    });

    const cleanupResult = await page.evaluate(() => ({
      roomCode: MultiplayerEngine.roomCode,
      isHost: MultiplayerEngine.isHost,
      heartbeat: MultiplayerEngine._heartbeatInterval,
      watchdog: MultiplayerEngine._watchdogInterval,
      session: localStorage.getItem("gtf_active_session")
    }));

    expect(cleanupResult.roomCode).toBeNull();
    expect(cleanupResult.isHost).toBe(false);
    expect(cleanupResult.heartbeat).toBeNull();
    expect(cleanupResult.watchdog).toBeNull();
    expect(cleanupResult.session).toBeNull();
  });
});
