const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('http://127.0.0.1:8080/');
  await page.waitForLoadState('domcontentloaded');

  console.log('--- SCENE 1 ---');
  const b1 = await page.locator('.h-card-create').boundingBox();
  console.log('Create Card:', b1 ? { cx: b1.x + b1.width/2, cy: b1.y + b1.height/2, w: b1.width, h: b1.height } : null);

  console.log('--- SCENE 2 ---');
  await page.locator('.h-card-create').click();
  await page.waitForTimeout(400);
  const b2Modal = await page.locator('#createRoomModal').boundingBox();
  console.log('Create Modal:', b2Modal ? { cx: b2Modal.x + b2Modal.width/2, cy: b2Modal.y + b2Modal.height/2, w: b2Modal.width, h: b2Modal.height } : null);
  const b2Input = await page.locator('#hostPlayerNameInput').boundingBox();
  console.log('Name Input:', b2Input ? { cx: b2Input.x + b2Input.width/2, cy: b2Input.y + b2Input.height/2, w: b2Input.width, h: b2Input.height } : null);
  const b2Avatar = await page.locator('#createRoomModal .mp-avatar-option[data-avatar="aman"]').boundingBox();
  console.log('Aman Avatar:', b2Avatar ? { cx: b2Avatar.x + b2Avatar.width/2, cy: b2Avatar.y + b2Avatar.height/2, w: b2Avatar.width, h: b2Avatar.height } : null);
  const b2Btn = await page.locator('#createRoomModal .mp-btn-primary').boundingBox();
  console.log('Create & Get Code Btn:', b2Btn ? { cx: b2Btn.x + b2Btn.width/2, cy: b2Btn.y + b2Btn.height/2, w: b2Btn.width, h: b2Btn.height } : null);

  console.log('--- SCENE 3 ---');
  await page.locator('#hostPlayerNameInput').fill('Aman');
  await page.locator('#createRoomModal .mp-avatar-option[data-avatar="aman"]').click();
  await page.locator('#createRoomModal .mp-btn-primary').click();
  await page.waitForTimeout(600);

  const b3ModeCard = await page.locator('#modeCard-frames').boundingBox();
  console.log('Rounds Card:', b3ModeCard ? { cx: b3ModeCard.x + b3ModeCard.width/2, cy: b3ModeCard.y + b3ModeCard.height/2, w: b3ModeCard.width, h: b3ModeCard.height } : null);
  const b3Stepper = await page.locator('#modeCard-frames button[title="Increase Rounds"]').boundingBox();
  console.log('Rounds Stepper +:', b3Stepper ? { cx: b3Stepper.x + b3Stepper.width/2, cy: b3Stepper.y + b3Stepper.height/2, w: b3Stepper.width, h: b3Stepper.height } : null);
  const b3Copy = await page.locator('button:has-text("Copy Link")').boundingBox();
  console.log('Copy Link Btn:', b3Copy ? { cx: b3Copy.x + b3Copy.width/2, cy: b3Copy.y + b3Copy.height/2, w: b3Copy.width, h: b3Copy.height } : null);
  const b3Lobby = await page.locator('#playerLobby, .player-grid, #lobbyPlayerList').boundingBox();
  console.log('Player Lobby:', b3Lobby ? { cx: b3Lobby.x + b3Lobby.width/2, cy: b3Lobby.y + b3Lobby.height/2, w: b3Lobby.width, h: b3Lobby.height } : null);
  const b3Start = await page.locator('#lobbyStartBtn').boundingBox();
  console.log('Lobby Start Btn:', b3Start ? { cx: b3Start.x + b3Start.width/2, cy: b3Start.y + b3Start.height/2, w: b3Start.width, h: b3Start.height } : null);

  console.log('--- SCENE 4 ---');
  await page.evaluate(() => {
    PlayerLobby.start();
  });
  await page.waitForTimeout(600);
  const b4Modal = await page.locator('#howToAnswerModal').boundingBox();
  console.log('HowToAnswer Modal:', b4Modal ? { cx: b4Modal.x + b4Modal.width/2, cy: b4Modal.y + b4Modal.height/2, w: b4Modal.width, h: b4Modal.height } : null);
  const b4Card1 = await page.locator('.hta-step-card.step-1').boundingBox();
  console.log('HTA Step 1:', b4Card1 ? { cx: b4Card1.x + b4Card1.width/2, cy: b4Card1.y + b4Card1.height/2, w: b4Card1.width, h: b4Card1.height } : null);
  const b4Card2 = await page.locator('.hta-step-card.step-2').boundingBox();
  console.log('HTA Step 2:', b4Card2 ? { cx: b4Card2.x + b4Card2.width/2, cy: b4Card2.y + b4Card2.height/2, w: b4Card2.width, h: b4Card2.height } : null);
  const b4Card3 = await page.locator('.hta-step-card.step-3').boundingBox();
  console.log('HTA Step 3:', b4Card3 ? { cx: b4Card3.x + b4Card3.width/2, cy: b4Card3.y + b4Card3.height/2, w: b4Card3.width, h: b4Card3.height } : null);
  const b4HostBtn = await page.locator('#htaHostStartBtn').boundingBox();
  console.log('HTA Host Start Btn:', b4HostBtn ? { cx: b4HostBtn.x + b4HostBtn.width/2, cy: b4HostBtn.y + b4HostBtn.height/2, w: b4HostBtn.width, h: b4HostBtn.height } : null);

  console.log('--- SCENE 5 & 6 (Game Screen) ---');
  await page.evaluate(() => {
    HowToAnswerGuide.stop();
    if (document.getElementById('howToAnswerModal')) {
      document.getElementById('howToAnswerModal').style.display = 'none';
      document.getElementById('howToAnswerModal').classList.remove('open', 'active');
    }
  });
  await page.waitForTimeout(500);

  const b5Frame = await page.locator('#cinemaFrame, #frameContainer, .cinema-screen, #frameImage, #gameFrame').boundingBox();
  console.log('Cinema Frame:', b5Frame ? { cx: b5Frame.x + b5Frame.width/2, cy: b5Frame.y + b5Frame.height/2, w: b5Frame.width, h: b5Frame.height } : null);
  const b5Chat = await page.locator('#chatInput, #chatTextInput, .chat-input-wrapper').boundingBox();
  console.log('Chat Input:', b5Chat ? { cx: b5Chat.x + b5Chat.width/2, cy: b5Chat.y + b5Chat.height/2, w: b5Chat.width, h: b5Chat.height } : null);
  const b5Send = await page.locator('#chatSendBtn').boundingBox();
  console.log('Chat Send Btn:', b5Send ? { cx: b5Send.x + b5Send.width/2, cy: b5Send.y + b5Send.height/2, w: b5Send.width, h: b5Send.height } : null);
  const b6Hint = await page.locator('#chatHintBtn').boundingBox();
  console.log('Hint Btn:', b6Hint ? { cx: b6Hint.x + b6Hint.width/2, cy: b6Hint.y + b6Hint.height/2, w: b6Hint.width, h: b6Hint.height } : null);
  const b5LB = await page.locator('#leaderboard, #leaderboardCard, .leaderboard-panel').boundingBox();
  console.log('Leaderboard:', b5LB ? { cx: b5LB.x + b5LB.width/2, cy: b5LB.y + b5LB.height/2, w: b5LB.width, h: b5LB.height } : null);

  console.log('--- SCENE 7 (Host Floating Bar) ---');
  await page.evaluate(() => {
    const hBar = document.getElementById('hostFloatingBar');
    if (hBar) {
      hBar.style.display = 'flex';
      hBar.style.opacity = '1';
    }
  });
  await page.waitForTimeout(300);
  const b7Bar = await page.locator('#hostFloatingBar').boundingBox();
  console.log('Host Floating Bar:', b7Bar ? { cx: b7Bar.x + b7Bar.width/2, cy: b7Bar.y + b7Bar.height/2, w: b7Bar.width, h: b7Bar.height } : null);
  const b7Pause = await page.locator('#hfbPauseBtn').boundingBox();
  console.log('Pause Btn:', b7Pause ? { cx: b7Pause.x + b7Pause.width/2, cy: b7Pause.y + b7Pause.height/2, w: b7Pause.width, h: b7Pause.height } : null);
  const b7Skip = await page.locator('#hfbSkipBtn').boundingBox();
  console.log('Skip Btn:', b7Skip ? { cx: b7Skip.x + b7Skip.width/2, cy: b7Skip.y + b7Skip.height/2, w: b7Skip.width, h: b7Skip.height } : null);

  console.log('--- SCENE 8 (Answer Overlay) ---');
  await page.evaluate(() => {
    const ao = document.getElementById('answerOverlay');
    if (ao) {
      ao.style.display = 'flex';
      ao.style.opacity = '1';
      ao.classList.add('visible', 'active');
    }
  });
  await page.waitForTimeout(300);
  const b8Card = await page.locator('#answerOverlay .ans-card, #answerOverlay > div, #answerOverlay').first().boundingBox();
  console.log('Answer Card:', b8Card ? { cx: b8Card.x + b8Card.width/2, cy: b8Card.y + b8Card.height/2, w: b8Card.width, h: b8Card.height } : null);
  const b8Next = await page.locator('#ansNextRoundBtn').boundingBox();
  console.log('Next Round Btn:', b8Next ? { cx: b8Next.x + b8Next.width/2, cy: b8Next.y + b8Next.height/2, w: b8Next.width, h: b8Next.height } : null);

  console.log('--- SCENE 9 (Winner Stage) ---');
  await page.evaluate(() => {
    WinnerScreen.show([
      { name: 'AMAN', score: 30, avatar: 'aman' },
      { name: 'AMISH', score: 15, avatar: 'amish' },
      { name: 'AZIZ', score: 10, avatar: 'aziz' },
      { name: 'VISH', score: 5, avatar: 'vish' }
    ]);
  });
  await page.waitForTimeout(300);
  const b9Podium = await page.locator('#winnerStage, .winner-screen, #winnerModal').boundingBox();
  console.log('Winner Podium:', b9Podium ? { cx: b9Podium.x + b9Podium.width/2, cy: b9Podium.y + b9Podium.height/2, w: b9Podium.width, h: b9Podium.height } : null);
  const b9Hero = await page.locator('#champHeroCard, .runner-gold').boundingBox();
  console.log('Champ Hero Card:', b9Hero ? { cx: b9Hero.x + b9Hero.width/2, cy: b9Hero.y + b9Hero.height/2, w: b9Hero.width, h: b9Hero.height } : null);
  const b9Rematch = await page.locator('.btn-rematch').boundingBox();
  console.log('Rematch Btn:', b9Rematch ? { cx: b9Rematch.x + b9Rematch.width/2, cy: b9Rematch.y + b9Rematch.height/2, w: b9Rematch.width, h: b9Rematch.height } : null);

  await browser.close();
})();
