const { test, expect } = require("@playwright/test");

test.describe("Multiplayer & Game State Synchronization", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
  });

  test("MultiplayerEngine initializes with unique playerId and active session capabilities", async ({ page }) => {
    const playerState = await page.evaluate(() => {
      MultiplayerEngine.init();
      return {
        id: MultiplayerEngine.playerId,
        name: MultiplayerEngine.playerName,
        avatar: MultiplayerEngine.playerAvatar
      };
    });

    expect(playerState.id).toBeTruthy();
    expect(playerState.id.startsWith("p_")).toBe(true);
    expect(playerState.name).toBeTruthy();
    expect(playerState.avatar).toBeTruthy();
  });

  test("Host receives PLAYER_JOIN event and updates GS.players array", async ({ page }) => {
    await page.evaluate(() => {
      MultiplayerEngine.isHost = true;
      MultiplayerEngine.roomCode = "GAME1";
      MultiplayerEngine.playerId = "host_1";
      MultiplayerEngine.playerName = "HostUser";
      GS.players = [
        { id: "host_1", name: "HostUser", avatar: "aman", score: 0, isHost: true, loaded: true }
      ];

      // Simulate incoming PLAYER_JOIN message
      MultiplayerEngine.handleIncomingEvent({
        type: "PLAYER_JOIN",
        roomCode: "GAME1",
        senderId: "player_2",
        id: "player_2",
        name: "GuestUser",
        avatar: "aziz",
        timestamp: Date.now()
      });
    });

    const players = await page.evaluate(() => GS.players);
    expect(players.length).toBe(2);
    expect(players[1].id).toBe("player_2");
    expect(players[1].name).toBe("GuestUser");
  });

  test("Host startMatch creates authoritative playlist and transitions to gameScreen", async ({ page }) => {
    await page.evaluate(() => {
      MultiplayerEngine.isHost = true;
      MultiplayerEngine.roomCode = "GAME1";
      MultiplayerEngine.playerId = "host_1";
      MultiplayerEngine.playerName = "HostUser";
      GS.players = [
        { id: "host_1", name: "HostUser", avatar: "aman", score: 0, isHost: true, loaded: true },
        { id: "player_2", name: "GuestUser", avatar: "aziz", score: 0, isHost: false, loaded: true }
      ];

      MultiplayerEngine.startMatch();
    });

    await expect(page.locator("#howToAnswerScreen")).toBeVisible();

    // Complete the guide to advance to game screen
    await page.evaluate(() => {
      if (typeof HowToAnswerGuide !== 'undefined') {
        HowToAnswerGuide._secondsLeft = 0;
        HowToAnswerGuide.handleHostClick();
      }
    });

    await expect(page.locator("#gameScreen")).toBeVisible();

    const matchState = await page.evaluate(() => ({
      isActive: MultiplayerEngine.isMatchActive,
      playlistLen: MultiplayerEngine.currentPlaylist ? MultiplayerEngine.currentPlaylist.length : 0,
      currentIndex: MultiplayerEngine.currentPlayIndex
    }));

    expect(matchState.isActive).toBe(true);
    expect(matchState.playlistLen).toBeGreaterThan(0);
    expect(matchState.currentIndex).toBe(0);
  });

  test("Host authoritative validation validates guess and awards points", async ({ page }) => {
    await page.evaluate(() => {
      MultiplayerEngine.isHost = true;
      MultiplayerEngine.roomCode = "GAME1";
      MultiplayerEngine.playerId = "host_1";
      MultiplayerEngine.currentPlayIndex = 0;
      MultiplayerEngine.currentRoundWinners = [];
      MultiplayerEngine.currentPlaylist = [
        { id: 1, type: "image", content: "GUESSTHEFRAME/A Wednesday (2008).webp", answer: "A WEDNESDAY", year: "2008" }
      ];
      GS.players = [
        { id: "host_1", name: "HostUser", avatar: "aman", score: 0, isHost: true },
        { id: "p_guesser", name: "Guesser", avatar: "vish", score: 0, isHost: false }
      ];

      // Submit correct guess
      MultiplayerEngine.validateAndProcessGuess({
        playerId: "p_guesser",
        playerName: "Guesser",
        playerAvatar: "vish",
        guess: "A Wednesday",
        roundIndex: 0
      });
    });

    const scoreState = await page.evaluate(() => {
      const winner = MultiplayerEngine.currentRoundWinners.find(w => w.playerId === "p_guesser");
      const player = GS.players.find(p => p.id === "p_guesser");
      return { winner, score: player ? player.score : 0 };
    });

    expect(scoreState.winner).toBeDefined();
    expect(scoreState.winner.position).toBe(1);
    expect(scoreState.score).toBe(10);
  });

  test("Game over broadcast invokes WinnerScreen and renders scoreboard correctly", async ({ page }) => {
    await page.evaluate(() => {
      MultiplayerEngine.isHost = false;
      MultiplayerEngine.roomCode = "GAME1";
      const testPlayers = [
        { name: "Aman", score: 30, avatar: "aman", avatarImg: "avvtar/aman.svg" },
        { name: "Aziz", score: 22, avatar: "aziz", avatarImg: "avvtar/aziz.svg" },
        { name: "Amish", score: 16, avatar: "amish", avatarImg: "avvtar/amish.svg" },
        { name: "Vish", score: 10, avatar: "vish", avatarImg: "avvtar/vish.svg" }
      ];
      GS.players = testPlayers;

      // Remote game over
      WinnerScreen.show(testPlayers);
    });

    await expect(page.locator("#winnerScreen")).toBeVisible();
    await expect(page.locator("#winnerScoreboardList")).toBeVisible();

    const scoreboardRows = page.locator("#winnerScoreboardList .sb-row");
    await expect(scoreboardRows).toHaveCount(4);
  });
});
