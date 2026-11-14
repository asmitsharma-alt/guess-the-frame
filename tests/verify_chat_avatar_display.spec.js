const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:/Users/admin/.gemini/antigravity-cli/brain/f6f7defb-2368-4c78-8e57-7ec41aed59e0';
if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

test('Verify player avatars render properly in lobby chat and in-game chat', async ({ page }) => {
  const failed404s = [];
  page.on('response', response => {
    if (response.status() === 404 && response.url().includes('avvtar/')) {
      failed404s.push(response.url());
    }
  });

  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  // Verify chat rendering logic directly with player avatars in lobbyChatStream
  const lobbyChatResults = await page.evaluate(() => {
    const stream = document.getElementById('lobbyChatStream');
    if (stream) stream.innerHTML = '';

    const testMessages = [
      { id: 'm1', senderId: 'p1', senderName: 'Ayank', senderAvatar: 'ayank', text: 'Hey from Ayank!' },
      { id: 'm2', senderId: 'p2', senderName: 'Ayush', senderAvatar: 'ayush', text: 'Hey from Ayush!' },
      { id: 'm3', senderId: 'p3', senderName: 'Joel', senderAvatar: 'joel', text: 'Hey from Joel!' },
      { id: 'm4', senderId: 'p4', senderName: 'Praggya', senderAvatar: 'praggya', text: 'Hey from Praggya!' },
      { id: 'm5', senderId: 'p5', senderName: 'Ruhaan', senderAvatar: 'ruhaan', text: 'Hey from Ruhaan!' }
    ];

    testMessages.forEach(msg => ChatEngine.renderMessage(msg));

    const rendered = Array.from(document.querySelectorAll('#lobbyChatStream .chat-msg')).map(el => {
      const img = el.querySelector('.chat-avatar img');
      const avatarDiv = el.querySelector('.chat-avatar');
      const name = el.querySelector('.chat-msg-header span')?.textContent;
      const text = el.querySelector('.chat-msg-text')?.textContent;
      return {
        name,
        text,
        src: img?.getAttribute('src'),
        bg: avatarDiv?.style?.backgroundColor
      };
    });

    return rendered;
  });

  console.log('LOBBY CHAT RENDERED:', JSON.stringify(lobbyChatResults, null, 2));

  expect(lobbyChatResults.length).toBe(5);
  expect(lobbyChatResults[0].src).toBe('avvtar/ayank.webp');
  expect(lobbyChatResults[1].src).toBe('avvtar/ayush.webp');
  expect(lobbyChatResults[2].src).toBe('avvtar/joel.webp');
  expect(lobbyChatResults[3].src).toBe('avvtar/praggya.webp');
  expect(lobbyChatResults[4].src).toBe('avvtar/ruhaan.webp');

  // Ensure NONE of them tried to use missing .png
  lobbyChatResults.forEach(r => {
    expect(r.src).not.toContain('.png');
  });

  // Verify in-game liveChatStream as well
  const liveChatResults = await page.evaluate(() => {
    const stream = document.getElementById('liveChatStream');
    if (stream) stream.innerHTML = '';

    // Simulate active players in GS.players
    GS.players = [
      { id: 'p1', name: 'Ayank', avatar: 'ayank', score: 0, color: '#ff6b9d' },
      { id: 'p2', name: 'Ayush', avatar: 'ayush', score: 0, color: '#3b82f6' },
      { id: 'p3', name: 'Joel', avatar: 'joel', score: 0, color: '#84cc16' },
      { id: 'p4', name: 'Praggya', avatar: 'praggya', score: 0, color: '#facc15' },
      { id: 'p5', name: 'Ruhaan', avatar: 'ruhaan', score: 0, color: '#a855f7' }
    ];

    const testMessages = [
      { id: 'lm1', senderId: 'p1', senderName: 'Ayank', senderAvatar: 'ayank', text: 'Live guess 1' },
      { id: 'lm2', senderId: 'p2', senderName: 'Ayush', senderAvatar: 'ayush', text: 'Live guess 2' },
      { id: 'lm3', senderId: 'p3', senderName: 'Joel', senderAvatar: 'joel', text: 'Live guess 3' },
      { id: 'lm4', senderId: 'p4', senderName: 'Praggya', senderAvatar: 'praggya', text: 'Live guess 4' },
      { id: 'lm5', senderId: 'p5', senderName: 'Ruhaan', senderAvatar: 'ruhaan', text: 'Live guess 5' }
    ];

    testMessages.forEach(msg => ChatEngine.renderMessage(msg));

    const rendered = Array.from(document.querySelectorAll('#liveChatStream .chat-msg')).map(el => {
      const img = el.querySelector('.chat-avatar img');
      const avatarDiv = el.querySelector('.chat-avatar');
      const name = el.querySelector('.chat-msg-header span')?.textContent;
      return {
        name,
        src: img?.getAttribute('src'),
        bg: avatarDiv?.style?.backgroundColor
      };
    });

    return rendered;
  });

  console.log('LIVE CHAT RENDERED:', JSON.stringify(liveChatResults, null, 2));

  expect(liveChatResults.length).toBe(5);
  expect(liveChatResults[0].src).toBe('avvtar/ayank.webp');
  expect(liveChatResults[1].src).toBe('avvtar/ayush.webp');
  expect(liveChatResults[2].src).toBe('avvtar/joel.webp');
  expect(liveChatResults[3].src).toBe('avvtar/praggya.webp');
  expect(liveChatResults[4].src).toBe('avvtar/ruhaan.webp');

  // Verify actual image files render without 404
  await page.waitForTimeout(500);
  expect(failed404s).toEqual([]);

  // Check that naturalWidth of rendered chat avatar images is > 0
  const imagesLoaded = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('.chat-avatar img'));
    return imgs.map(img => ({
      src: img.src,
      complete: img.complete,
      naturalWidth: img.naturalWidth
    }));
  });

  console.log('IMAGE LOAD STATUS:', JSON.stringify(imagesLoaded, null, 2));
  imagesLoaded.forEach(item => {
    expect(item.complete).toBe(true);
    expect(item.naturalWidth).toBeGreaterThan(0);
  });

  // Switch to player lobby screen to capture rendered lobby chat in context
  await page.evaluate(() => {
    UI.showScreen('playerLobbyScreen');
  });
  await page.waitForTimeout(300);

  const lobbyStreamEl = page.locator('#lobbyChatStream');
  await lobbyStreamEl.screenshot({ path: path.join(ARTIFACT_DIR, 'chat_avatars_verified.png') });
});
