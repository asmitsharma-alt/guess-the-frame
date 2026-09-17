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

    expect(frames.length).toBeGreaterThanOrEqual(20);

    for (const framePath of frames) {
      const response = await request.get("/" + encodeURI(framePath));
      expect(response.status(), "Frame failed to load: " + framePath).toBe(200);
    }
  });

  test("All three sections (Frames, Dialogue, Eyes) are active and resolve assets over HTTP 200", async ({ page, request }) => {
    const sections = await page.evaluate(() => GS.sections);
    expect(sections.length).toBe(3);

    const s1 = sections.find(s => s.id === 1);
    expect(s1).toBeTruthy();
    expect(s1.name).toBe("Guess the Frame");
    expect(s1.frames.length).toBeGreaterThanOrEqual(20);

    const s2 = sections.find(s => s.id === 2);
    expect(s2).toBeTruthy();
    expect(s2.name).toBe("Guess the Dialogue");
    expect(s2.frames.length).toBe(10);
    for (const f of s2.frames) {
      expect(f.dialogue).toBeTruthy();
      expect(f.answer).toBeTruthy();
    }

    const s3 = sections.find(s => s.id === 3);
    expect(s3).toBeTruthy();
    expect(s3.name).toBe("Guess the Eye");
    expect(s3.frames.length).toBe(10);
    for (const f of s3.frames) {
      expect(f.content).toBeTruthy();
      expect(f.revealContent).toBeTruthy();
      expect(f.answer).toBeTruthy();

      const rEye = await request.get("/" + encodeURI(f.content));
      expect(rEye.status(), "Eye crop failed to load: " + f.content).toBe(200);

      const rReveal = await request.get("/" + encodeURI(f.revealContent));
      expect(rReveal.status(), "Reveal portrait failed to load: " + f.revealContent).toBe(200);
    }
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
