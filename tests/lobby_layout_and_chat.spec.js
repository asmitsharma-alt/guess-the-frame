import { test, expect } from '@playwright/test';

test.describe('Lobby Screen Layout & Live Chat Suite', () => {
  test('Lobby layout reorganization and interactive chat test', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1050 });
    await page.goto('http://localhost:8080');

    // 1. Host clicks create room card and enters lobby
    const hostCard = page.locator('.h-card-create');
    await hostCard.click();

    const modal = page.locator('#createRoomModal');
    await expect(modal).toHaveClass(/active/);

    const hostNameInput = page.locator('#hostPlayerNameInput');
    await expect(hostNameInput).toBeVisible();
    await hostNameInput.fill('Aman');

    const confirmBtn = page.locator('#createRoomModal .mp-btn-primary');
    await confirmBtn.click();

    // Wait for playerLobbyScreen
    await expect(page.locator('#playerLobbyScreen')).toBeVisible({ timeout: 10000 });

    // 2. Verify Match Preparation section is NOT visible in the lobby
    const matchPrepHeading = page.locator('#playerLobbyScreen h3:has-text("Match Preparation")');
    await expect(matchPrepHeading).toHaveCount(0);

    // 3. Verify Match Configuration is in the left column (inside md:col-span-2)
    const leftCol = page.locator('#playerLobbyScreen .md\\:col-span-2');
    await expect(leftCol).toBeVisible();

    const matchConfigHeader = leftCol.locator('h3:has-text("Match Configuration")');
    await expect(matchConfigHeader).toBeVisible();

    // Verify round steppers and timer inside left column
    await expect(leftCol.locator('#hostFramesRoundsBtn')).toHaveText('20');
    await expect(leftCol.locator('#hostEyesRoundsBtn')).toHaveText('10');
    await expect(leftCol.locator('#hostDialogueRoundsBtn')).toHaveText('10');
    await expect(leftCol.locator('#hostTimerBtnText')).toHaveText('30s');

    // Test stepper adjustment in new location (decrease from 20 max to 19, then increase back to 20)
    const framesMinusBtn = leftCol.locator('button[onclick*="adjustRounds(\'frames\', -1)"]');
    await framesMinusBtn.click();
    await expect(leftCol.locator('#hostFramesRoundsBtn')).toHaveText('19');

    const framesPlusBtn = leftCol.locator('button[onclick*="adjustRounds(\'frames\', 1)"]');
    await framesPlusBtn.click();
    await expect(leftCol.locator('#hostFramesRoundsBtn')).toHaveText('20');

    // Test timer adjustment
    const timerPlusBtn = leftCol.locator('button[onclick*="adjustTimer(1)"]');
    await timerPlusBtn.click();
    await expect(leftCol.locator('#hostTimerBtnText')).toHaveText('31s');

    // 4. Verify Lobby Live Chat is in the right column (inside md:col-span-1)
    const rightCol = page.locator('#playerLobbyScreen .md\\:col-span-1');
    await expect(rightCol).toBeVisible();

    const chatHeader = rightCol.locator('h3:has-text("Lobby Chat")');
    await expect(chatHeader).toBeVisible();

    const chatStream = rightCol.locator('#lobbyChatStream');
    await expect(chatStream).toBeVisible();

    const chatInput = rightCol.locator('#lobbyChatInput');
    await expect(chatInput).toBeVisible();
    await expect(chatInput).toHaveAttribute('placeholder', 'Chat with lobby...');

    const chatSendBtn = rightCol.locator('#lobbyChatSendBtn');
    await expect(chatSendBtn).toBeVisible();

    // 5. Test sending message in Lobby Chat via Click
    await chatInput.fill('Hey everyone, welcome to the game!');
    await chatSendBtn.click();

    // Verify message appears in lobbyChatStream
    const sentMsg = chatStream.locator('.chat-msg').filter({ hasText: 'Hey everyone, welcome to the game!' });
    await expect(sentMsg).toBeVisible();
    await expect(sentMsg.locator('.chat-msg-header')).toContainText('Aman');
    await expect(chatInput).toHaveValue('');

    // Send a second message via Enter key
    await chatInput.fill('Ready when you are! 🚀');
    await chatInput.press('Enter');

    const secondMsg = chatStream.locator('.chat-msg').filter({ hasText: 'Ready when you are! 🚀' });
    await expect(secondMsg).toBeVisible();
    await expect(chatInput).toHaveValue('');

    // Take element screenshot of playerLobbyScreen
    await page.locator('#playerLobbyScreen').screenshot({ path: 'C:/Users/admin/.gemini/antigravity-cli/brain/f6f7defb-2368-4c78-8e57-7ec41aed59e0/lobby_screen_card.png' });
  });
});
