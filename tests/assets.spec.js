const { test, expect } = require("@playwright/test");

test.describe("Asset & Frame Loading Reliability", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
  });

  test("Core movie frames in Section 1 resolve over HTTP with status 200", async ({ page, request }) => {
    const frames = await page.evaluate(() => {
      const s1 = GS.sections.find(s => s.id === 1);
      return s1 ? s1.frames.map(f => f.content) : [];
    });

    expect(frames.length).toBeGreaterThan(0);

    for (const framePath of frames.slice(0, 10)) {
      const response = await request.get("/" + encodeURI(framePath));
      expect(response.status(), "Frame failed to load: " + framePath).toBe(200);
    }
  });

  test("Eye puzzle assets in Section 3 resolve over HTTP with status 200", async ({ page, request }) => {
    const eyeAssets = await page.evaluate(() => {
      const s3 = GS.sections.find(s => s.id === 3);
      return s3 ? s3.frames.map(f => f.content) : [];
    });

    expect(eyeAssets.length).toBeGreaterThan(0);

    for (const assetPath of eyeAssets.slice(0, 8)) {
      const response = await request.get("/" + encodeURI(assetPath));
      expect(response.status(), "Eye asset failed to load: " + assetPath).toBe(200);
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
