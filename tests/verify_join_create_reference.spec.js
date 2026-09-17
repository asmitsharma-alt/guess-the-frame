const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const OUT_DIR = 'C:/Users/admin/.gemini/antigravity-ide/brain/f97db537-e465-49aa-b617-4bc07aa0eda5/screenshots';
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

test.describe('Join & Create Room - Reference Replication Suite', () => {

  test('Desktop Create Room Modal matches reference', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    await page.locator('.h-card-create').click();
    await page.waitForSelector('#createRoomModal.active', { state: 'visible' });

    // Check Badge modal box dimensions & styling
    const modalBox = page.locator('#createRoomModalBox');
    await expect(modalBox).toBeVisible();

    // Verify Pass Header
    await expect(page.locator('#createRoomModal .mp-badge-pass-title')).toContainText('CREATE ONLINE ROOM');
    await expect(page.locator('#createRoomModal .mp-badge-pill-tag')).toContainText('HOST PASS');

    // Verify Credentials Row has Host Name & Desktop Preview
    await expect(page.locator('#hostPlayerNameInput')).toBeVisible();
    await expect(page.locator('#hostDesktopPreviewBadge')).toBeVisible();

    // Verify Avatar Studio controls
    await expect(page.locator('#hostAvatarSearch')).toBeVisible();
    await expect(page.locator('#hostCategoryBar')).toBeVisible();
    await expect(page.locator('#hostAvatarGrid')).toBeVisible();
    await expect(page.locator('#createRoomConfirmBtn')).toBeVisible();

    // Test Search for a character (e.g. Naruto or Goku or Pikachu)
    await page.locator('#hostAvatarSearch').fill('goku');
    await page.waitForTimeout(300);

    const firstCard = page.locator('#hostAvatarGrid .mp-circular-avatar-btn').first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();
    await page.waitForTimeout(200);

    // Verify Desktop Preview updated
    const charName = await page.locator('#hostDesktopPreviewCharName').textContent();
    expect(charName.toLowerCase()).toContain('goku');

    // Screenshot Desktop Create Modal
    await page.screenshot({ path: path.join(OUT_DIR, 'desktop_create_modal.png'), fullPage: false });
  });

  test('Desktop Join Room Modal matches reference', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    await page.locator('.h-card-join').click();
    await page.waitForSelector('#joinRoomModal.active', { state: 'visible' });

    const modalBox = page.locator('#joinRoomModalBox');
    await expect(modalBox).toBeVisible();

    // Verify Pass Header
    await expect(page.locator('#joinRoomModal .mp-badge-pass-title')).toContainText('ONLINE ROOM PASS');
    await expect(page.locator('#joinRoomModal .mp-badge-pill-tag')).toContainText('BADGE PASS');

    // Verify 3 credentials inputs: Code, Name, Character Preview
    await expect(page.locator('#joinCodeInput')).toBeVisible();
    await expect(page.locator('#joinPlayerNameInput')).toBeVisible();
    await expect(page.locator('#joinDesktopPreviewBadge')).toBeVisible();

    // Verify Avatar Studio controls
    await expect(page.locator('#joinAvatarSearch')).toBeVisible();
    await expect(page.locator('#joinCategoryBar')).toBeVisible();
    await expect(page.locator('#joinAvatarGrid')).toBeVisible();
    await expect(page.locator('#joinRoomConfirmBtn')).toBeVisible();

    // Screenshot Desktop Join Modal
    await page.screenshot({ path: path.join(OUT_DIR, 'desktop_join_modal.png'), fullPage: false });
  });

  test('Mobile Join Room Modal - Initial View and Dedicated Avatar Picker Flow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    await page.locator('.h-card-join').click();
    await page.waitForSelector('#joinRoomModal.active', { state: 'visible' });

    // Initial mobile view: Code, Name, Trigger Card, Sticky Button
    await expect(page.locator('#joinCodeInput')).toBeVisible();
    await expect(page.locator('#joinPlayerNameInput')).toBeVisible();
    await expect(page.locator('#joinAvatarTriggerCard')).toBeVisible();
    await expect(page.locator('#joinRoomConfirmBtn')).toBeVisible();

    // Desktop studio must be hidden on mobile
    await expect(page.locator('#joinDesktopAvatarStudio')).not.toBeVisible();

    // Capture initial mobile join screen
    await page.screenshot({ path: path.join(OUT_DIR, 'mobile_join_initial.png') });

    // Tap trigger card to open Dedicated Avatar Picker
    await page.locator('#joinAvatarTriggerCard').click();
    await page.waitForTimeout(300);

    // Dedicated picker view should now be visible
    await expect(page.locator('#joinDedicatedView')).toBeVisible();
    await expect(page.locator('#joinDedicatedView .mp-dedicated-title')).toContainText('CHOOSE AVATAR');
    await expect(page.locator('#joinDedicatedView .mp-back-btn')).toBeVisible();
    await expect(page.locator('#joinDedicatedView .mp-done-btn')).toBeVisible();

    // Capture dedicated picker screen
    await page.screenshot({ path: path.join(OUT_DIR, 'mobile_join_dedicated_picker.png') });

    // Select an avatar in the dedicated picker (e.g. 2nd avatar)
    const secondAv = page.locator('#joinDedicatedAvatarGrid .mp-circular-avatar-btn').nth(1);
    await expect(secondAv).toBeVisible();
    await secondAv.click();
    await page.waitForTimeout(300);

    // Tapping avatar closes dedicated view and returns to initial view
    await expect(page.locator('#joinDedicatedView')).not.toBeVisible();
    await expect(page.locator('#joinAvatarTriggerCard')).toBeVisible();

    // Capture mobile screen after selection
    await page.screenshot({ path: path.join(OUT_DIR, 'mobile_join_after_selection.png') });
  });

  test('Mobile Create Room Modal - Initial View and Dedicated Avatar Picker Flow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    await page.locator('.h-card-create').click();
    await page.waitForSelector('#createRoomModal.active', { state: 'visible' });

    // Initial mobile view: Host Name, Trigger Card, Sticky Button
    await expect(page.locator('#hostPlayerNameInput')).toBeVisible();
    await expect(page.locator('#createAvatarTriggerCard')).toBeVisible();
    await expect(page.locator('#createRoomConfirmBtn')).toBeVisible();

    // Capture initial mobile create screen
    await page.screenshot({ path: path.join(OUT_DIR, 'mobile_create_initial.png') });

    // Tap trigger card
    await page.locator('#createAvatarTriggerCard').click();
    await page.waitForTimeout(300);

    await expect(page.locator('#hostDedicatedView')).toBeVisible();
    await expect(page.locator('#hostDedicatedView .mp-dedicated-title')).toContainText('CHOOSE AVATAR');

    // Capture mobile create dedicated picker screen
    await page.screenshot({ path: path.join(OUT_DIR, 'mobile_create_dedicated_picker.png') });

    // Tap Done button to return
    await page.locator('#hostDedicatedView .mp-done-btn').click();
    await page.waitForTimeout(200);

    await expect(page.locator('#hostDedicatedView')).not.toBeVisible();
    await expect(page.locator('#createAvatarTriggerCard')).toBeVisible();
  });

});
