const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const OUT_DIR = 'C:/Users/admin/.gemini/antigravity-ide/brain/0affb5d1-46b4-421f-a8ee-e171ac909d55/screenshots';
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

test.describe('Avatar Studio & Widescreen Modals', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('1. Create Room modal is 90% widescreen and features Avatar Studio', async ({ page }) => {
    await page.locator('.h-card-create').click();
    await page.waitForSelector('#createRoomModal', { state: 'visible' });

    const modalBox = page.locator('#createRoomModal .mp-modal-box');
    const box = await modalBox.boundingBox();
    expect(box).not.toBeNull();
    
    // Check width is >= 85% of viewport width (1440 * 0.85 = 1224px)
    console.log('Create Modal Width:', box.width, 'Viewport Width: 1440', 'Ratio:', (box.width / 1440).toFixed(2));
    expect(box.width).toBeGreaterThanOrEqual(1440 * 0.85);

    // Verify dual-pane layout components
    await expect(page.locator('#hostPreviewCard')).toBeVisible();
    await expect(page.locator('#hostAvatarSearch')).toBeVisible();
    await expect(page.locator('#hostCategoryPills')).toBeVisible();
    await expect(page.locator('#hostAvatarGrid')).toBeVisible();

    await page.screenshot({ path: path.join(OUT_DIR, '01_create_modal_widescreen.png') });
  });

  test('2. Instant Search and Live Preview in Create Modal', async ({ page }) => {
    await page.locator('.h-card-create').click();
    await page.waitForSelector('#createRoomModal', { state: 'visible' });

    // Type host name
    await page.locator('#hostPlayerNameInput').fill('Ash Ketchum');

    // Search for Pikachu
    await page.locator('#hostAvatarSearch').fill('Pikachu');
    await page.waitForTimeout(300);

    const pikachuCard = page.locator('#hostAvatarGrid .mp-studio-card').first();
    await expect(pikachuCard).toBeVisible();
    await expect(pikachuCard).toContainText('Pikachu');

    // Click Pikachu card
    await pikachuCard.click();
    await page.waitForTimeout(200);

    // Verify Live Preview Card updates
    const playerTag = await page.locator('#hostPreviewPlayerName').textContent();
    expect(playerTag).toContain('Ash Ketchum');

    const charName = await page.locator('#hostPreviewCharName').textContent();
    expect(charName).toContain('Pikachu');

    const previewImg = page.locator('#hostPreviewImg');
    const imgSrc = await previewImg.getAttribute('src');
    expect(imgSrc).toContain('Pikachu.gif');

    // Verify Animation Badge
    const badgeText = await page.locator('#hostPreviewBadge').textContent();
    expect(badgeText).toContain('Animated');

    await page.screenshot({ path: path.join(OUT_DIR, '02_pikachu_search_preview.png') });
  });

  test('3. Category Pills Filtering and Scrollable Grid', async ({ page }) => {
    await page.locator('.h-card-create').click();
    await page.waitForSelector('#createRoomModal', { state: 'visible' });

    // Click on Anime Category
    const animePill = page.locator('#hostCategoryPills button:has-text("Anime")');
    await animePill.click();
    await page.waitForTimeout(200);

    // Search inside Anime category
    await page.locator('#hostAvatarSearch').fill('Goku');
    await page.waitForTimeout(300);

    const gokuCard = page.locator('#hostAvatarGrid .mp-studio-card:has-text("Goku")').first();
    await expect(gokuCard).toBeVisible();
    await gokuCard.click();

    // Check preview updated to Goku
    const charName = await page.locator('#hostPreviewCharName').textContent();
    expect(charName.toLowerCase()).toContain('goku');

    await page.screenshot({ path: path.join(OUT_DIR, '03_anime_category_goku.png') });
  });

  test('4. Join Room modal is 90% widescreen with synchronized avatar selection', async ({ page }) => {
    await page.locator('.h-card-join').click();
    await page.waitForSelector('#joinRoomModal', { state: 'visible' });

    const modalBox = page.locator('#joinRoomModal .mp-modal-box');
    const box = await modalBox.boundingBox();
    expect(box).not.toBeNull();
    expect(box.width).toBeGreaterThanOrEqual(1440 * 0.85);

    // Type join name
    await page.locator('#joinPlayerNameInput').fill('Challenger 99');
    
    // Pick Gaming category
    const gamingPill = page.locator('#joinCategoryPills button:has-text("Gaming")');
    await gamingPill.click();
    await page.waitForTimeout(200);

    const firstGaming = page.locator('#joinAvatarGrid .mp-studio-card').first();
    await firstGaming.click();

    const playerTag = await page.locator('#joinPreviewPlayerName').textContent();
    expect(playerTag).toContain('Challenger 99');

    await page.screenshot({ path: path.join(OUT_DIR, '04_join_modal_widescreen.png') });
  });

  test('5. Square/Squircle avatar geometry and Ambient Cinema Backdrop', async ({ page }) => {
    const result = await page.evaluate(() => {
      const rectPlayer = {
        name: 'Goku',
        avatar: 'anime_goku',
        avatarImg: 'avvtar_assets/Anime/Dragon_Ball/Goku.webp'
      };
      const renderedHtml = renderAvatar(rectPlayer, 'lb');
      
      const div = document.createElement('div');
      div.className = 'lp-avatar-wrap';
      div.style.width = '64px';
      div.style.height = '64px';
      div.innerHTML = renderedHtml;
      document.body.appendChild(div);

      const computed = window.getComputedStyle(div);
      const borderRadius = computed.borderRadius;
      const hasAmbientBox = !!div.querySelector('.av-ambient-box');
      const hasBg = !!div.querySelector('.av-ambient-bg');
      const hasFg = !!div.querySelector('.av-ambient-fg');

      div.remove();

      return {
        borderRadius,
        hasAmbientBox,
        hasBg,
        hasFg
      };
    });

    console.log('Avatar Geometry Evaluation:', result);
    expect(result.borderRadius).not.toBe('50%');
    expect(result.hasAmbientBox).toBe(true);
    expect(result.hasBg).toBe(true);
    expect(result.hasFg).toBe(true);
  });
});
