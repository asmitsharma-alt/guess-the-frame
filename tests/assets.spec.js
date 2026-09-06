const { test, expect } = require("@playwright/test");

test.describe("Asset & Frame Loading Reliability", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
  });

  test("Core movie frames in Section 1 contains all 34 frames and resolve over HTTP 200", async ({ page, request }) => {
    const frames = await page.evaluate(() => {
      const s1 = GS.sections.find(s => s.id === 1);
      return s1 ? s1.frames.map(f => f.content) : [];
    });

    expect(frames.length).toBe(34);

    for (const framePath of frames) {
      const response = await request.get("/" + encodeURI(framePath));
      expect(response.status(), "Frame failed to load: " + framePath).toBe(200);
    }
  });

  test("Only Section 1 (Guess the Frame) is active; dialogue and eyes modes are removed", async ({ page }) => {
    const sections = await page.evaluate(() => GS.sections);
    expect(sections.length).toBe(1);
    expect(sections[0].id).toBe(1);
    expect(sections[0].name).toBe("Guess the Frame");
    expect(sections.some(s => s.id === 2 || s.id === 3)).toBe(false);
  });

  test("Tie-breaker frames resolve over HTTP with status 200", async ({ page, request }) => {
    const tieFrames = await page.evaluate(() => {
      return (GS.tieBreaker && GS.tieBreaker.frames) ? GS.tieBreaker.frames.map(f => f.content) : [];
    });

    expect(tieFrames.length).toBeGreaterThan(0);

    for (const framePath of tieFrames.slice(0, 8)) {
      const response = await request.get("/" + encodeURI(framePath));
      expect(response.status(), "Tie breaker frame failed to load: " + framePath).toBe(200);
    }
  });

  test("Avatar SVGs for core players resolve with status 200", async ({ request }) => {
    const avatars = ["aman", "amish", "aziz", "vish"];
    for (const av of avatars) {
      const response = await request.get("/avvtar/" + av + ".svg");
      expect(response.status(), "Avatar failed to load: " + av).toBe(200);
      const ct = response.headers()["content-type"] || "";
      expect(ct.includes("svg") || ct.includes("xml") || ct.includes("image")).toBe(true);
    }
  });

  test("FrameDisplay handles missing or broken images gracefully without crashing", async ({ page }) => {
    const handledGracefully = await page.evaluate(async () => {
      try {
        UI.showScreen("gameScreen");
        const brokenFrame = {
          type: "image",
          content: "non_existent_folder/broken_frame_9999.webp",
          answer: "BROKEN",
          year: "2099"
        };
        FrameDisplay.showFrame(brokenFrame);
        return true;
      } catch (e) {
        return false;
      }
    });

    expect(handledGracefully).toBe(true);
  });
});
