const { test, expect } = require("@playwright/test");

test.describe("Security, Input Sanitization & Authorization Defenses", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
  });

  test("SecurityUtil.escapeHtml neutralizes XSS payloads", async ({ page }) => {
    const escaped = await page.evaluate(() => {
      const maliciousPayload = "<script>alert('XSS')</script>";
      return SecurityUtil.escapeHtml(maliciousPayload);
    });

    expect(escaped).not.toContain("<script>");
    expect(escaped).toContain("&lt;script&gt;");
    expect(escaped).toContain("&#039;XSS&#039;");
  });

  test("NetworkSecurity.checkRateLimit throttles abusive message bursts", async ({ page }) => {
    const rateLimitResults = await page.evaluate(() => {
      const sender = "attacker_123";
      const results = [];
      for (let i = 0; i < 30; i++) {
        results.push(NetworkSecurity.checkRateLimit(sender));
      }
      return results;
    });

    // First 25 allowed, subsequent requests dropped
    expect(rateLimitResults.slice(0, 25).every(r => r === true)).toBe(true);
    expect(rateLimitResults.slice(25).every(r => r === false)).toBe(true);
  });

  test("NetworkSecurity.validateIncomingMessage rejects replay attacks with stale timestamps", async ({ page }) => {
    const isStaleAccepted = await page.evaluate(() => {
      const staleMsg = {
        roomCode: "SEC1",
        senderId: "player_1",
        type: "CHAT_MESSAGE",
        timestamp: Date.now() - 120000, // 2 minutes ago (limit is 60s)
        msg: { text: "Hello from the past" }
      };
      return NetworkSecurity.validateIncomingMessage(staleMsg, "SEC1", [], false);
    });

    expect(isStaleAccepted).toBe(false);
  });

  test("NetworkSecurity.validateIncomingMessage rejects oversized payload boundaries", async ({ page }) => {
    const validationResults = await page.evaluate(() => {
      const oversizedGuess = {
        roomCode: "SEC1",
        senderId: "player_1",
        type: "SUBMIT_GUESS",
        timestamp: Date.now(),
        guess: "A".repeat(150) // limit is 100
      };

      const oversizedChat = {
        roomCode: "SEC1",
        senderId: "player_1",
        type: "CHAT_MESSAGE",
        timestamp: Date.now(),
        msg: { text: "B".repeat(350) } // limit is 300
      };

      return {
        guessAccepted: NetworkSecurity.validateIncomingMessage(oversizedGuess, "SEC1", [], false),
        chatAccepted: NetworkSecurity.validateIncomingMessage(oversizedChat, "SEC1", [], false)
      };
    });

    expect(validationResults.guessAccepted).toBe(false);
    expect(validationResults.chatAccepted).toBe(false);
  });

  test("Security Audit Verification: HOST_COMMANDS blocks non-host command injection", async ({ page }) => {
    const isUnauthorizedBlockWorking = await page.evaluate(() => {
      const registeredPlayers = [
        { id: "legit_host", name: "Host", isHost: true },
        { id: "rogue_player", name: "Rogue", isHost: false }
      ];

      const spoofedStartCommand = {
        roomCode: "SEC1",
        senderId: "rogue_player",
        type: "ROUND_START",
        timestamp: Date.now()
      };

      return NetworkSecurity.validateIncomingMessage(spoofedStartCommand, "SEC1", registeredPlayers, false);
    });

    // Should be rejected because rogue_player is not the host
    expect(isUnauthorizedBlockWorking).toBe(false);
  });
});
