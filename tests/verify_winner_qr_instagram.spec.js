import { test, expect } from '@playwright/test';

test.describe('Winner Screen Pop-ups (Left Special Meme + Right Instagram QR)', () => {
  test('Winner Screen opens Special Meme popup, Instagram QR, and updated hindi message', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:8080/');
    await page.waitForLoadState('domcontentloaded');

    // Trigger Winner Screen
    await page.evaluate(() => {
      WinnerScreen.show([
        { id: 'p1', name: 'Winner 1', score: 100, avatar: 'ayank' },
        { id: 'p2', name: 'Winner 2', score: 80, avatar: 'ayush' }
      ]);
    });

    const memePopup = page.locator('#cwMemePopup');
    const rightPopup = page.locator('#cwQrPopupRight');

    await expect(memePopup).toBeVisible();
    await expect(rightPopup).toBeVisible();

    // Verify Winner Message text
    const msgText = page.locator('.cw-info-text');
    await expect(msgText).toContainText('Umeed hai ki aap logon ko game khelne mein maza aaya hoga! Milte hain agle hafte');

    // Verify Left Meme Popup content
    const memeHeader = memePopup.locator('.cw-qr-title');
    await expect(memeHeader).toHaveText('SPECIAL MEME');

    const memeImg = memePopup.locator('.cw-meme-img');
    await expect(memeImg).toBeVisible();
    await expect(memeImg).toHaveAttribute('src', 'bg/winner_meme.webp');

    // Verify Right (Instagram) Popup content
    const rightHeader = rightPopup.locator('.cw-qr-title');
    await expect(rightHeader).toHaveText('SUBMIT FRAMES');

    const rightBadge = rightPopup.locator('.cw-qr-link-badge-insta');
    await expect(rightBadge).toHaveText(/@tanny_irl2/);
    await expect(rightBadge).toHaveAttribute('href', 'https://instagram.com/tanny_irl2');

    const rightDesc = rightPopup.locator('.cw-qr-desc');
    await expect(rightDesc).toContainText('Agr kisiko frames bhejna ho to is scan karke contact kare Instagram');
    await expect(rightDesc).toContainText('tanny_irl2');

    // Verify SVG QR code rendered on right popup
    const rightSvg = rightPopup.locator('.cw-qr-svg');
    await expect(rightSvg).toBeVisible();

    // Take screenshot of desktop winner screen for artifact
    await page.screenshot({ path: 'winner_screen_dual_popups_desktop.png' });
  });

  test('Closing and re-opening meme popup and Instagram QR pop-up via trigger pills', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:8080/');
    await page.waitForLoadState('domcontentloaded');

    await page.evaluate(() => {
      WinnerScreen.show([
        { id: 'p1', name: 'Winner 1', score: 100, avatar: 'ayank' },
        { id: 'p2', name: 'Winner 2', score: 80, avatar: 'ayush' }
      ]);
    });

    const memePopup = page.locator('#cwMemePopup');
    const memePill = page.locator('#cwMemePillTrigger');
    const rightPopup = page.locator('#cwQrPopupRight');
    const rightPill = page.locator('#cwQrPillTriggerRight');

    // Close meme popup
    const memeCloseBtn = memePopup.locator('.cw-qr-close-btn');
    await memeCloseBtn.click();
    await expect(memePopup).toBeHidden();
    await expect(memePill).toBeVisible();
    await expect(memePill.locator('.pill-text')).toHaveText('VIEW MEME');

    // Click meme pill to re-open
    await memePill.click();
    await expect(memePopup).toBeVisible();
    await expect(memePill).toBeHidden();

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
