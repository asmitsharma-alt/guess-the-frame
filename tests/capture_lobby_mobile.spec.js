// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:/Users/admin/.gemini/antigravity/brain/bc0cd56f-3310-43bd-90d8-de2b4d09a9e8';

test('Capture full lobby page on mobile screen', async ({ page }) => {
  // Mobile device viewport (375x812 with deviceScaleFactor 2 for crisp resolution)
  await page.setViewportSize({ width: 375, height: 812 });

  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  // Open create room modal
  await page.locator('.h-card-create').click();
  await expect(page.locator('#createRoomModal')).toHaveClass(/active/);

  // Fill host name and create room
  await page.locator('#hostPlayerNameInput').fill('Aman');
  await page.locator('#createRoomModal .mp-btn-primary').click();

  // Wait for lobby to be visible
  await expect(page.locator('#playerLobbyScreen')).toBeVisible();

  // Populate realistic multiplayer lobby with 4 players
  await page.evaluate(() => {
    GS.players = [
      { id: 'p1', name: 'Aman', avatar: 'aman', score: 0, isHost: true, color: '#FF6B9D', loaded: true },
      { id: 'p2', name: 'Amish', avatar: 'amish', score: 0, isHost: false, color: '#57c3e0', loaded: true },
      { id: 'p3', name: 'Aziz', avatar: 'aziz', score: 0, isHost: false, color: '#f0a828', loaded: true },
      { id: 'p4', name: 'Vish', avatar: 'vish', score: 0, isHost: false, color: '#84cc16', loaded: true }
    ];
    MultiplayerEngine.renderLobbyUI();
  });

  await page.waitForTimeout(600);

  const childrenInfo = await page.evaluate(() => {
    const list = document.getElementById('lobbyPlayerList');
    const sections = Array.from(document.querySelectorAll('#playerLobbyScreen section'));
    return {
      playerCardCount: list?.children?.length,
      playerNames: Array.from(list?.querySelectorAll('.font-bold, input, .runner-nameplate') || []).map(el => el.value || el.textContent?.trim()),
      sectionsCount: sections.length,
      sectionsTitles: sections.map(s => s.querySelector('h2, h3')?.textContent?.trim()),
      mainHeight: document.querySelector('#playerLobbyScreen main')?.offsetHeight,
      bodyHeight: document.body.offsetHeight
    };
  });
  console.log('CHILDREN_INFO:', JSON.stringify(childrenInfo, null, 2));

  // Capture viewport mobile screen
  const screenPath = path.join(ARTIFACT_DIR, 'lobby_mobile_screen.png');
  await page.screenshot({
    path: screenPath,
    fullPage: false
  });

  // Temporarily set overflow visible on playerLobbyScreen so fullPage screenshot captures all 1950px+
  await page.evaluate(() => {
    const el = document.getElementById('playerLobbyScreen');
    if (el) {
      el.style.setProperty('overflow', 'visible', 'important');
      el.style.setProperty('height', 'auto', 'important');
      el.style.setProperty('max-height', 'none', 'important');
    }
    const app = document.getElementById('app');
    if (app) {
      app.style.setProperty('overflow', 'visible', 'important');
      app.style.setProperty('height', 'auto', 'important');
    }
  });

  // Capture full element (entire scrollable lobby from top banner to bottom buttons)
  const fullPagePath = path.join(ARTIFACT_DIR, 'lobby_mobile_fullpage.png');
  const lobbyBox = await page.locator('#playerLobbyScreen').boundingBox();
  console.log('PLAYER_LOBBY_BOX:', lobbyBox);
  
  const targetH = Math.max(812, Math.ceil(lobbyBox ? lobbyBox.height : 2000));
  await page.setViewportSize({ width: 375, height: targetH });
  await page.waitForTimeout(500);

  await page.locator('#playerLobbyScreen').screenshot({
    path: fullPagePath
  });

  // Now populate with 8 players for 8-player lobby fullpage screenshot
  await page.evaluate(() => {
    GS.players = [
      { id: 'p1', name: 'Aman', avatar: 'aman', score: 0, isHost: true, color: '#FF6B9D', loaded: true },
      { id: 'p2', name: 'Amish', avatar: 'amish', score: 0, isHost: false, color: '#57c3e0', loaded: true },
      { id: 'p3', name: 'Aziz', avatar: 'aziz', score: 0, isHost: false, color: '#f0a828', loaded: true },
      { id: 'p4', name: 'Vish', avatar: 'vish', score: 0, isHost: false, color: '#84cc16', loaded: true },
      { id: 'p5', name: 'Karan', avatar: 'aman', score: 0, isHost: false, color: '#ec4899', loaded: true },
      { id: 'p6', name: 'Priya', avatar: 'amish', score: 0, isHost: false, color: '#3b82f6', loaded: true },
      { id: 'p7', name: 'Rahul', avatar: 'aziz', score: 0, isHost: false, color: '#10b981', loaded: true },
      { id: 'p8', name: 'Rohan', avatar: 'vish', score: 0, isHost: false, color: '#a855f7', loaded: true }
    ];
    MultiplayerEngine.renderLobbyUI();
  });

  await page.waitForTimeout(600);

  const lobbyBox8p = await page.locator('#playerLobbyScreen').boundingBox();
  const targetH8p = Math.max(812, Math.ceil(lobbyBox8p ? lobbyBox8p.height : 1200));
  await page.setViewportSize({ width: 375, height: targetH8p });
  await page.waitForTimeout(400);

  const fullPage8pPath = path.join(ARTIFACT_DIR, 'lobby_mobile_8p_fullpage.png');
  await page.screenshot({
    path: fullPage8pPath,
    fullPage: true
  });

  console.log('SCREENSHOTS_CAPTURED:', {
    screenPath,
    fullPagePath,
    fullPage8pPath
  });
});
