const { test, expect } = require('@playwright/test');

test.describe('Multiplayer Mode: Section Loading & Gameplay Reliability', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('Section 1 (Guess The Frame): Loads frame still, sets placeholder, and awards points on correct guess in multiplayer', async ({ page }) => {
    const result = await page.evaluate(async () => {
      // 1. Setup Host & Room
      MultiplayerEngine.selectedAvatarForModal = 'aman';
      MultiplayerEngine.confirmCreateRoom();
      MultiplayerEngine.isHost = true;
      MultiplayerEngine.playerId = 'host_aman';
      MultiplayerEngine.playerName = 'AMAN';

      // 2. Add players
      GS.players = [
        { id: 'host_aman', name: 'AMAN', avatar: 'aman', score: 0, isHost: true },
        { id: 'client_amish', name: 'AMISH', avatar: 'amish', score: 0 }
      ];

      // 3. Set Section 1 playlist
      const s1 = GS.sections.find(s => s.id === 1);
      const frameItem = { ...s1.frames[0], sectionName: 'Guess the Frame', sectionId: 1 };
      MultiplayerEngine.currentPlaylist = [frameItem];
      MultiplayerEngine.hostSettings = { rounds: 1, timer: 30 };

      // 4. Start match & round 0
      UI.showScreen('gameScreen');
      MultiplayerEngine.startRound(0);

      // Give frame image a moment to load and attach to DOM
      await new Promise(r => setTimeout(r, 300));

      // Verify DOM state during active round
      const secName = document.getElementById('curSecName')?.textContent;
      const chatPlaceholder = document.getElementById('chatTextInput')?.placeholder;
      const isGameVisible = document.getElementById('gameScreen')?.classList.contains('active');
      const frameImg = document.querySelector('#imageContainer img.frame-image');
      const dialogueVisible = document.getElementById('frameDialogue')?.classList.contains('visible');

      // 5. Client submits guess
      MultiplayerEngine.validateAndProcessGuess({
        playerId: 'client_amish',
        playerName: 'AMISH',
        playerAvatar: 'amish',
        guess: frameItem.answer,
        roundIndex: 0
      });

      // 6. End Round
      MultiplayerEngine.endRound();

      const revealedTitle = document.getElementById('ansTitle')?.textContent;
      const ansOverlayVisible = document.getElementById('answerOverlay')?.classList.contains('visible');
      const winnerRecord = MultiplayerEngine.currentRoundWinners[0];

      return {
        secName,
        chatPlaceholder,
        isGameVisible,
        hasFrameImg: !!frameImg,
        frameSrc: frameImg ? decodeURIComponent(frameImg.src) : null,
        dialogueVisible,
        revealedTitle,
        ansOverlayVisible,
        winnerRecord,
        playerScores: GS.players.map(p => ({ id: p.id, score: p.score }))
      };
    });

    expect(result.secName).toBe('Guess the Frame');
    expect(result.chatPlaceholder).toBe('Type movie guess or chat...');
    expect(result.isGameVisible).toBe(true);
    expect(result.hasFrameImg).toBe(true);
    expect(result.frameSrc).toContain('GUESSTHEFRAME');
    expect(result.dialogueVisible).toBe(false);
    expect(result.revealedTitle).toBeTruthy();
    expect(result.ansOverlayVisible).toBe(true);
    expect(result.winnerRecord.playerName).toBe('AMISH');
    expect(result.winnerRecord.points).toBe(10);
    expect(result.playerScores.find(p => p.id === 'client_amish').score).toBe(10);
  });

  test('Section 2 (Guess The Dialogue): Loads quote card for both host and non-host client in multiplayer', async ({ page }) => {
    const hostResult = await page.evaluate(async () => {
      MultiplayerEngine.selectedAvatarForModal = 'aman';
      MultiplayerEngine.confirmCreateRoom();
      MultiplayerEngine.isHost = true;
      MultiplayerEngine.playerId = 'host_aman';

      GS.players = [
        { id: 'host_aman', name: 'AMAN', avatar: 'aman', score: 0, isHost: true },
        { id: 'client_amish', name: 'AMISH', avatar: 'amish', score: 0 }
      ];

      const s2 = GS.sections.find(s => s.id === 2);
      const dialogueItem = { ...s2.frames[0], sectionName: 'Guess the Dialogue', sectionId: 2 };
      MultiplayerEngine.currentPlaylist = [dialogueItem];
      MultiplayerEngine.hostSettings = { rounds: 1, timer: 30 };

      // Host starts round
      UI.showScreen('gameScreen');
      MultiplayerEngine.startRound(0);

      const secName = document.getElementById('curSecName')?.textContent;
      const chatPlaceholder = document.getElementById('chatTextInput')?.placeholder;
      const dialogueEl = document.getElementById('frameDialogue');
      const dialogueQuote = document.getElementById('dialogueQuote')?.textContent;
      const isDialogueVisible = dialogueEl?.classList.contains('visible');
      const imgCount = document.querySelectorAll('#imageContainer img').length;

      return {
        secName,
        chatPlaceholder,
        dialogueQuote,
        isDialogueVisible,
        imgCount,
        expectedQuote: dialogueItem.dialogue,
        expectedAnswer: dialogueItem.answer
      };
    });

    expect(hostResult.secName).toBe('Guess the Dialogue');
    expect(hostResult.chatPlaceholder).toBe('Type movie guess or chat...');
    expect(hostResult.isDialogueVisible).toBe(true);
    expect(hostResult.dialogueQuote).toBe(hostResult.expectedQuote);
    expect(hostResult.imgCount).toBe(0); // Dialogue rounds should not display movie frame image

    // Now test client side receiving ROUND_START event with sanitized clientFrame
    const clientResult = await page.evaluate(async (expectedQuote) => {
      // Switch perspective to non-host client
      MultiplayerEngine.isHost = false;
      MultiplayerEngine.playerId = 'client_amish';

      const s2 = GS.sections.find(s => s.id === 2);
      const dialogueFrame = s2.frames[0];

      // Simulated ROUND_START message dispatched to client
      MultiplayerEngine.handleRemoteRoundStart({
        roundIndex: 0,
        totalRounds: 1,
        timerDuration: 30,
        frame: {
          id: dialogueFrame.id,
          type: 'dialogue',
          dialogue: dialogueFrame.dialogue,
          context: 'Guess the Movie / Show',
          sectionName: 'Guess the Dialogue',
          sectionId: 2
        }
      });

      const clientSecName = document.getElementById('curSecName')?.textContent;
      const clientChatPlaceholder = document.getElementById('chatTextInput')?.placeholder;
      const clientDialogueVisible = document.getElementById('frameDialogue')?.classList.contains('visible');
      const clientDialogueQuote = document.getElementById('dialogueQuote')?.textContent;

      // Remote client also receives ROUND_FINISH_BROADCAST
      MultiplayerEngine.handleRemoteRoundFinish({
        currentPlayIndex: 0,
        revealedAnswer: dialogueFrame.answer,
        revealedYear: dialogueFrame.year,
        currentRoundWinners: [
          { playerId: 'client_amish', playerName: 'AMISH', points: 10, position: 1 }
        ]
      });

      const ansTitle = document.getElementById('ansTitle')?.textContent;
      const ansOverlayVisible = document.getElementById('answerOverlay')?.classList.contains('visible');
      const ansDialogueQuote = document.querySelector('.ans-dialogue-quote')?.textContent;

      return {
        clientSecName,
        clientChatPlaceholder,
        clientDialogueVisible,
        clientDialogueQuote,
        ansTitle,
        ansOverlayVisible,
        ansDialogueQuote
      };
    }, hostResult.expectedQuote);

    expect(clientResult.clientSecName).toBe('Guess the Dialogue');
    expect(clientResult.clientChatPlaceholder).toBe('Type movie guess or chat...');
    expect(clientResult.clientDialogueVisible).toBe(true);
    expect(clientResult.clientDialogueQuote).toBe(hostResult.expectedQuote);
    expect(clientResult.ansTitle).toBe(hostResult.expectedAnswer);
    expect(clientResult.ansOverlayVisible).toBe(true);
    expect(clientResult.ansDialogueQuote).toContain(hostResult.expectedQuote);
  });

  test('Section 3 (Guess The Eye): Loads crop photo, changes placeholder to celebrity name, and reveals full celebrity photo on finish', async ({ page }) => {
    const eyeResult = await page.evaluate(async () => {
      MultiplayerEngine.selectedAvatarForModal = 'aman';
      MultiplayerEngine.confirmCreateRoom();
      MultiplayerEngine.isHost = true;
      MultiplayerEngine.playerId = 'host_aman';

      GS.players = [
        { id: 'host_aman', name: 'AMAN', avatar: 'aman', score: 0, isHost: true },
        { id: 'client_amish', name: 'AMISH', avatar: 'amish', score: 0 }
      ];

      const s3 = GS.sections.find(s => s.id === 3);
      const eyeItem = { ...s3.frames[0], sectionName: 'Guess the Eye', sectionId: 3 };
      MultiplayerEngine.currentPlaylist = [eyeItem];
      MultiplayerEngine.hostSettings = { rounds: 1, timer: 30 };

      // Host starts round
      UI.showScreen('gameScreen');
      MultiplayerEngine.startRound(0);

      // Give eye crop image time to attach
      await new Promise(r => setTimeout(r, 300));

      const secName = document.getElementById('curSecName')?.textContent;
      const chatPlaceholder = document.getElementById('chatTextInput')?.placeholder;
      const eyeCropImg = document.querySelector('#imageContainer img.eye-image');
      const dialogueVisible = document.getElementById('frameDialogue')?.classList.contains('visible');

      // Client guesses celebrity correctly
      MultiplayerEngine.validateAndProcessGuess({
        playerId: 'client_amish',
        playerName: 'AMISH',
        playerAvatar: 'amish',
        guess: eyeItem.answer,
        roundIndex: 0
      });

      // Round ends
      MultiplayerEngine.endRound();

      // Wait a moment for full reveal image to attach
      await new Promise(r => setTimeout(r, 300));

      const ansTitle = document.getElementById('ansTitle')?.textContent;
      const ansBadge = document.getElementById('ansBadge')?.textContent;
      const ansOverlayHasEyeAnswer = document.getElementById('answerOverlay')?.classList.contains('eye-answer');
      const fullRevealImg = document.querySelector('#imageContainer img.eye-full-reveal');

      const card = document.querySelector('#answerOverlay .ans-card');
      const frameEl = document.getElementById('frameDisplay');
      let isCardAtBottom = false;
      if (card && frameEl) {
        const cardRect = card.getBoundingClientRect();
        const frameRect = frameEl.getBoundingClientRect();
        // Card bottom is near frame bottom and card center is in the bottom portion
        isCardAtBottom = (cardRect.bottom <= frameRect.bottom + 10) && (cardRect.top > frameRect.top + frameRect.height * 0.35);
      }

      return {
        secName,
        chatPlaceholder,
        hasCropImg: !!eyeCropImg,
        cropSrc: eyeCropImg ? decodeURIComponent(eyeCropImg.src) : null,
        dialogueVisible,
        ansTitle,
        ansBadge,
        expectedAnswer: eyeItem.answer,
        ansOverlayHasEyeAnswer,
        hasFullRevealImg: !!fullRevealImg,
        fullRevealSrc: fullRevealImg ? decodeURIComponent(fullRevealImg.src) : null,
        expectedRevealContent: eyeItem.revealContent,
        isCardAtBottom
      };
    });

    expect(eyeResult.secName).toBe('Guess the Eye');
    expect(eyeResult.chatPlaceholder).toBe('Type celebrity guess or chat...');
    expect(eyeResult.hasCropImg).toBe(true);
    expect(eyeResult.cropSrc).toContain('copy.png');
    expect(eyeResult.dialogueVisible).toBe(false);
    expect(eyeResult.ansTitle).toBe(eyeResult.expectedAnswer);
    expect(eyeResult.ansBadge).toBe('CELEBRITY REVEAL');
    expect(eyeResult.ansOverlayHasEyeAnswer).toBe(true);
    expect(eyeResult.hasFullRevealImg).toBe(true);
    expect(eyeResult.fullRevealSrc).toContain(eyeResult.expectedRevealContent);
    expect(eyeResult.isCardAtBottom).toBe(true);
  });

  test('Seamless Section Transitions: Frames -> Dialogue -> Eyes sequence cleanly resets state and renders correct UI in multiplayer', async ({ page }) => {
    const transitions = await page.evaluate(async () => {
      MultiplayerEngine.selectedAvatarForModal = 'aman';
      MultiplayerEngine.confirmCreateRoom();
      MultiplayerEngine.isHost = true;

      GS.players = [
        { id: 'p1', name: 'AMAN', avatar: 'aman', score: 0, isHost: true }
      ];

      const s1 = GS.sections.find(s => s.id === 1);
      const s2 = GS.sections.find(s => s.id === 2);
      const s3 = GS.sections.find(s => s.id === 3);

      MultiplayerEngine.currentPlaylist = [
        { ...s1.frames[0], sectionName: 'Guess the Frame', sectionId: 1 },
        { ...s2.frames[0], sectionName: 'Guess the Dialogue', sectionId: 2 },
        { ...s3.frames[0], sectionName: 'Guess the Eye', sectionId: 3 }
      ];

      const results = [];
      UI.showScreen('gameScreen');

      // Round 0: Frame
      MultiplayerEngine.startRound(0);
      await new Promise(r => setTimeout(r, 200));
      results.push({
        round: 1,
        sec: document.getElementById('curSecName')?.textContent,
        hasImage: !!document.querySelector('#imageContainer img.frame-image:not(.eye-image)'),
        dialogueVisible: document.getElementById('frameDialogue')?.classList.contains('visible')
      });
      MultiplayerEngine.endRound();

      // Round 1: Dialogue
      MultiplayerEngine.startRound(1);
      await new Promise(r => setTimeout(r, 200));
      results.push({
        round: 2,
        sec: document.getElementById('curSecName')?.textContent,
        hasImage: !!document.querySelector('#imageContainer img'),
        dialogueVisible: document.getElementById('frameDialogue')?.classList.contains('visible'),
        quoteText: document.getElementById('dialogueQuote')?.textContent
      });
      MultiplayerEngine.endRound();

      // Round 2: Eyes
      MultiplayerEngine.startRound(2);
      await new Promise(r => setTimeout(r, 200));
      results.push({
        round: 3,
        sec: document.getElementById('curSecName')?.textContent,
        hasEyeCrop: !!document.querySelector('#imageContainer img.eye-image'),
        dialogueVisible: document.getElementById('frameDialogue')?.classList.contains('visible')
      });
      MultiplayerEngine.endRound();

      return results;
    });

    // Verify Round 1 (Frame)
    expect(transitions[0].round).toBe(1);
    expect(transitions[0].sec).toBe('Guess the Frame');
    expect(transitions[0].hasImage).toBe(true);
    expect(transitions[0].dialogueVisible).toBe(false);

    // Verify Round 2 (Dialogue)
    expect(transitions[1].round).toBe(2);
    expect(transitions[1].sec).toBe('Guess the Dialogue');
    expect(transitions[1].hasImage).toBe(false);
    expect(transitions[1].dialogueVisible).toBe(true);
    expect(transitions[1].quoteText).toBeTruthy();

    // Verify Round 3 (Eyes)
    expect(transitions[2].round).toBe(3);
    expect(transitions[2].sec).toBe('Guess the Eye');
    expect(transitions[2].hasEyeCrop).toBe(true);
    expect(transitions[2].dialogueVisible).toBe(false);
  });

  test('Spoiler Shield: Blocks leaks for Frames, Dialogue, and Eyes in multiplayer chat', async ({ page }) => {
    const shieldResults = await page.evaluate(async () => {
      MultiplayerEngine.selectedAvatarForModal = 'aman';
      MultiplayerEngine.confirmCreateRoom();
      MultiplayerEngine.isHost = true;
      MultiplayerEngine.playerId = 'host_aman';

      GS.players = [
        { id: 'host_aman', name: 'AMAN', avatar: 'aman', score: 0, isHost: true }
      ];

      const s1 = GS.sections.find(s => s.id === 1);
      const s2 = GS.sections.find(s => s.id === 2);
      const s3 = GS.sections.find(s => s.id === 3);

      const items = [
        { ...s1.frames[0], sectionName: 'Guess the Frame', sectionId: 1 },
        { ...s2.frames[0], sectionName: 'Guess the Dialogue', sectionId: 2 },
        { ...s3.frames[0], sectionName: 'Guess the Eye', sectionId: 3 }
      ];

      MultiplayerEngine.currentPlaylist = items;

      const results = [];
      for (let i = 0; i < 3; i++) {
        MultiplayerEngine.startRound(i);
        const ans = ChatEngine.getCurrentRoundAnswer();
        const isAnswerSpoiler = ChatEngine.isAnswerOrSpoiler(ans, ans);
        results.push({ round: i + 1, sectionId: items[i].sectionId, ans, isAnswerSpoiler });
      }

      return results;
    });

    expect(shieldResults[0].isAnswerSpoiler).toBe(true);
    expect(shieldResults[1].isAnswerSpoiler).toBe(true);
    expect(shieldResults[2].isAnswerSpoiler).toBe(true);
  });

});
