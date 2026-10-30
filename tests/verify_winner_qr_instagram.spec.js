import { test, expect } from '@playwright/test';

test.describe('Winner Screen Dual QR Pop-ups (Left Services + Right Instagram)', () => {
  test('Both QR pop-ups open on desktop Winner Screen with correct Neobrutalist contents', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:8080/');
    await page.waitForLoadState('domcontentloaded');

    // Trigger Winner Screen
    await page.evaluate(() => {
      WinnerScreen.show([
        { id: 'p1', name: 'Winner 1', score: 100, avatar: 'aman' },
        { id: 'p2', name: 'Winner 2', score: 80, avatar: 'amish' }
      ]);
    });

    const leftPopup = page.locator('#cwQrPopup');
    const rightPopup = page.locator('#cwQrPopupRight');

    // Left QR removed per user request
    expect(await leftPopup.count()).toBe(0);
    await expect(rightPopup).toBeVisible();

    // Verify Right (Instagram) Popup content
    const rightHeader = rightPopup.locator('.cw-qr-title');
    await expect(rightHeader).toHaveText('SUBMIT FRAMES');

    const rightBadge = rightPopup.locator('.cw-qr-link-badge-insta');
    await expect(rightBadge).toHaveText(/@tanny_irl2/);
    await expect(rightBadge).toHaveAttribute('href', 'https://instagram.com/tanny_irl2');

    const rightDesc = rightPopup.locator('.cw-qr-desc');
    await expect(rightDesc).toContainText('Agr kisiko frames bhejna ho to is scan karke contact kare Instagram');
    await expect(rightDesc).toContainText('tanny_irl2');

    // Verify SVG QR code rendered
    const rightSvg = rightPopup.locator('.cw-qr-svg');
    await expect(rightSvg).toBeVisible();

    // Take screenshot of desktop winner screen for artifact
    await page.screenshot({ path: 'winner_screen_dual_qr_desktop.png' });
  });

  test('Closing right QR pop-up reveals right trigger pill and clicking it re-opens pop-up', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:8080/');
    await page.waitForLoadState('domcontentloaded');

    await page.evaluate(() => {
      WinnerScreen.show([
        { id: 'p1', name: 'Winner 1', score: 100, avatar: 'aman' },
        { id: 'p2', name: 'Winner 2', score: 80, avatar: 'amish' }
      ]);
    });

    const rightPopup = page.locator('#cwQrPopupRight');
    const rightPill = page.locator('#cwQrPillTriggerRight');

    // Close right popup
    const rightCloseBtn = rightPopup.locator('.cw-qr-close-btn');
    await rightCloseBtn.click();

    await expect(rightPopup).toBeHidden();
    await expect(rightPill).toBeVisible();
    await expect(rightPill.locator('.pill-text')).toHaveText('SEND FRAMES');

    // Click right pill to re-open
    await rightPill.click();
    await expect(rightPopup).toBeVisible();
    await expect(rightPill).toBeHidden();
  });
});
