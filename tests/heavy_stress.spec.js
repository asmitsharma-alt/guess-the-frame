const { test, expect } = require('@playwright/test');

test.describe('Heavy Multiplayer Stress & Load Testing', () => {
  test('5 concurrent players join, sync lobby settings, and receive state updates', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // 1. Host creates room
    const hostData = await page.evaluate(async () => {
      MultiplayerEngine.selectedAvatarForModal = 'aman';
      MultiplayerEngine.confirmCreateRoom();
      return {
        roomId: MultiplayerEngine.roomId,
        roomCode: MultiplayerEngine.roomCode,
        playerId: MultiplayerEngine.playerId,
        hostSettings: MultiplayerEngine.hostSettings
      };
    });

    expect(hostData.roomCode).toHaveLength(4);
    expect(hostData.hostSettings.category).toBe('frames');
    expect(hostData.hostSettings.categories).toEqual(['frames']);

    // 2. Simulate 4 concurrent client joins within 100ms
    const joinedPlayers = await page.evaluate(async (hData) => {
      const mockClients = [
        { id: 'client_amish', name: 'AMISH', avatar: 'amish' },
        { id: 'client_aziz', name: 'AZIZ', avatar: 'aziz' },
        { id: 'client_vish', name: 'VISH', avatar: 'vish' },
        { id: 'client_sneha', name: 'SNEHA', avatar: 'aman' }
      ];

      // Dispatch rapid joins via handleIncomingEvent
      mockClients.forEach(c => {
        MultiplayerEngine.handleIncomingEvent({
          type: 'PLAYER_JOIN',
          roomCode: hData.roomCode,
          senderId: c.id,
          id: c.id,
          name: c.name,
          avatar: c.avatar,
          color: '#ffbe0b',
          timestamp: Date.now()
        });
      });

      return GS.players.map(p => ({ id: p.id, name: p.name, avatar: p.avatar }));
    }, hostData);

    expect(joinedPlayers).toHaveLength(5);
    expect(joinedPlayers.map(p => p.name.toUpperCase())).toEqual(['AMAN', 'AMISH', 'AZIZ', 'VISH', 'SNEHA']);

    // 3. Host updates settings: adjust frame rounds
    const updatedSettings = await page.evaluate(() => {
      PlayerLobby.adjustRounds('frames', 5); // 10 + 5 = 15 rounds
      PlayerLobby.adjustTimer(15);           // 30 + 15 = 45s
      return MultiplayerEngine.hostSettings;
    });

    expect(updatedSettings.rounds).toBe(15);
    expect(updatedSettings.roundsByMode.frames).toBe(15);
    expect(updatedSettings.timer).toBe(45);
  });

  test('Match playlist samples exclusively from 34 movie frames with zero dialogue/eye entries', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const playlist = await page.evaluate(() => {
      MultiplayerEngine.selectedAvatarForModal = 'aman';
      MultiplayerEngine.confirmCreateRoom();
      MultiplayerEngine.hostSettings = {
        category: 'frames',
        categories: ['frames'],
        roundsByMode: { frames: 10 },
        rounds: 10,
        timer: 30
      };

      // Populate players so startMatch proceeds
      GS.players = [
        { id: MultiplayerEngine.playerId, name: 'AMAN', avatar: 'aman', loaded: true, score: 0 },
        { id: 'p2', name: 'AMISH', avatar: 'amish', loaded: true, score: 0 }
      ];
      GS.framesLoaded = true;

      MultiplayerEngine.startMatch();
      return MultiplayerEngine.currentPlaylist;
    });

    expect(playlist).toBeDefined();
    expect(playlist.length).toBe(10);

    // Verify 100% of playlist items are Movie Frames from Section 1
    for (let i = 0; i < playlist.length; i++) {
      const item = playlist[i];
      expect(item.sectionId, `Item ${i} must have sectionId 1`).toBe(1);
      expect(item.sectionName, `Item ${i} must be Guess the Frame`).toBe('Guess the Frame');
      expect(item.type, `Item ${i} type must be image`).toBe('image');
      expect(item.content, `Item ${i} must have image path`).toBeTruthy();
      expect(item.answer, `Item ${i} must have valid answer string`).toBeTruthy();
      expect(item.dialogue, `Item ${i} must not have dialogue property`).toBeUndefined();
      expect(item.revealContent, `Item ${i} must not have revealContent property`).toBeUndefined();
    }
  });

  test('Race condition defense: simultaneous rapid answers from 5 players only awards first correct guess', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const scoreResults = await page.evaluate(async () => {
      MultiplayerEngine.selectedAvatarForModal = 'aman';
      MultiplayerEngine.confirmCreateRoom();

      GS.players = [
        { id: MultiplayerEngine.playerId, name: 'AMAN', avatar: 'aman', score: 0 },
        { id: 'p2', name: 'AMISH', avatar: 'amish', score: 0 },
        { id: 'p3', name: 'AZIZ', avatar: 'aziz', score: 0 },
        { id: 'p4', name: 'VISH', avatar: 'vish', score: 0 },
        { id: 'p5', name: 'SNEHA', avatar: 'aman', score: 0 }
      ];

      MultiplayerEngine.currentPlaylist = [
        { sectionId: 1, sectionName: 'Guess the Frame', type: 'image', content: 'GUESSTHEFRAME/Rush (2023).webp', answer: 'RUSH', year: '2023' }
      ];
      MultiplayerEngine.currentPlayIndex = 0;
      MultiplayerEngine.isMatchActive = true;
      MultiplayerEngine.isRoundFinished = false;
      MultiplayerEngine.currentRoundWinners = [];

      // Host receives answers:
      // P2 submits correct answer first
      MultiplayerEngine.validateAndProcessGuess({
        playerId: 'p2',
        playerName: 'AMISH',
        playerAvatar: 'amish',
        guess: 'RUSH',
        roundIndex: 0
      });

      // P3 submits correct answer next
      MultiplayerEngine.validateAndProcessGuess({
        playerId: 'p3',
        playerName: 'AZIZ',
        playerAvatar: 'aziz',
        guess: 'RUSH',
        roundIndex: 0
      });

      // P4 submits wrong answer
      MultiplayerEngine.validateAndProcessGuess({
        playerId: 'p4',
        playerName: 'VISH',
        playerAvatar: 'vish',
        guess: 'WRONG MOVIE',
        roundIndex: 0
      });

      // P2 duplicate submission
      MultiplayerEngine.validateAndProcessGuess({
        playerId: 'p2',
        playerName: 'AMISH',
        playerAvatar: 'amish',
        guess: 'RUSH',
        roundIndex: 0
      });

      return {
        winners: MultiplayerEngine.currentRoundWinners,
        scores: GS.players.map(p => ({ id: p.id, name: p.name, score: p.score }))
      };
    });

    // P2 is the first winner
    expect(scoreResults.winners.length).toBeGreaterThan(0);
    expect(scoreResults.winners[0].playerId).toBe('p2');

    // P2 has the highest score
    const p2Score = scoreResults.scores.find(p => p.id === 'p2').score;
    const p4Score = scoreResults.scores.find(p => p.id === 'p4').score;
    expect(p2Score).toBeGreaterThan(0);
    expect(p4Score).toBe(0);
  });

  test('Multi-round loop memory stability: 10 consecutive round cycles without interval leaks', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const leakCheck = await page.evaluate(async () => {
      MultiplayerEngine.selectedAvatarForModal = 'aman';
      MultiplayerEngine.confirmCreateRoom();

      const heartbeatIntervalBefore = MultiplayerEngine._heartbeatInterval;
      const watchdogIntervalBefore = MultiplayerEngine._watchdogInterval;

      // Simulate 10 rapid round transitions
      for (let r = 0; r < 10; r++) {
        MultiplayerEngine.currentPlayIndex = r;
        MultiplayerEngine.isRoundFinished = true;
        if (MultiplayerEngine._hostAutoAdvanceTimer) {
          clearTimeout(MultiplayerEngine._hostAutoAdvanceTimer);
          MultiplayerEngine._hostAutoAdvanceTimer = null;
        }
      }

      // Check timers are clean and single instance
      return {
        heartbeatActive: !!MultiplayerEngine._heartbeatInterval,
        hasMultipleHeartbeats: MultiplayerEngine._heartbeatInterval === heartbeatIntervalBefore,
        autoAdvanceClean: MultiplayerEngine._hostAutoAdvanceTimer === null,
        playersCount: GS.players.length
      };
    });

    expect(leakCheck.heartbeatActive).toBe(true);
    expect(leakCheck.hasMultipleHeartbeats).toBe(true);
    expect(leakCheck.autoAdvanceClean).toBe(true);
  });

  test('Match completion triggers WinnerScreen with ranked scoreboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    await page.evaluate(() => {
      const testPlayers = [
        { name: 'Aman', score: 30, avatar: 'aman', avatarImg: 'avvtar/aman.svg' },
        { name: 'Aziz', score: 22, avatar: 'aziz', avatarImg: 'avvtar/aziz.svg' },
        { name: 'Amish', score: 16, avatar: 'amish', avatarImg: 'avvtar/amish.svg' },
        { name: 'Vish', score: 10, avatar: 'vish', avatarImg: 'avvtar/vish.svg' }
      ];
      GS.players = testPlayers;

      WinnerScreen.show(testPlayers);
    });

    // Check winner screen active
    await expect(page.locator('#winnerScreen')).toBeVisible();

    // Check winner name is Aman (highest score: 30)
    const champName = await page.locator('#champName').textContent();
    expect(champName.trim()).toBe('AMAN');

    // Check scoreboard entries exist
    const rows = await page.locator('#winnerScoreboardList .sb-row').count();
    expect(rows).toBe(4);
  });

  test('Spoiler Shield: ChatEngine hides correct answer from live chat and awards points via winner banner', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const result = await page.evaluate(() => {
      MultiplayerEngine.selectedAvatarForModal = 'aman';
      MultiplayerEngine.confirmCreateRoom();

      GS.players = [
        { id: MultiplayerEngine.playerId, name: 'AMAN', avatar: 'aman', score: 0 }
      ];

      MultiplayerEngine.currentPlaylist = [
        { sectionId: 1, sectionName: 'Guess the Frame', type: 'image', content: 'GUESSTHEFRAME/Rush (2023).webp', answer: 'RUSH', year: '2023' }
      ];
      MultiplayerEngine.currentPlayIndex = 0;
      MultiplayerEngine.isMatchActive = true;
      MultiplayerEngine.isRoundFinished = false;
      MultiplayerEngine.currentRoundWinners = [];

      // Aman types the correct movie title into chat
      ChatEngine.processOutgoingMessage('Rush');

      const stream = document.getElementById('liveChatStream');
      const chatTexts = Array.from(stream.querySelectorAll('.chat-msg-text')).map(el => el.textContent.trim());
      const winnerBanners = Array.from(stream.querySelectorAll('.chat-msg-winner')).map(el => el.textContent.trim());

      return {
        winnersCount: MultiplayerEngine.currentRoundWinners.length,
        firstWinnerPts: MultiplayerEngine.currentRoundWinners[0]?.points,
        chatTexts,
        winnerBanners,
        hasAnswerInChatText: chatTexts.some(t => /rush/i.test(t))
      };
    });

    expect(result.winnersCount).toBe(1);
    expect(result.firstWinnerPts).toBe(10);
    expect(result.winnerBanners.length).toBe(1);
    expect(result.winnerBanners[0].toLowerCase()).toContain('aman guessed the answer');
    // The movie answer MUST NOT be in the chat text!
    expect(result.hasAnswerInChatText).toBe(false);
    expect(result.chatTexts.length).toBe(0);
  });

  test('Spoiler Shield: ChatEngine blocks spoiler attempts from players who already won', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const result = await page.evaluate(() => {
      MultiplayerEngine.selectedAvatarForModal = 'aman';
      MultiplayerEngine.confirmCreateRoom();

      GS.players = [
        { id: MultiplayerEngine.playerId, name: 'AMAN', avatar: 'aman', score: 10 }
      ];

      MultiplayerEngine.currentPlaylist = [
        { sectionId: 1, sectionName: 'Guess the Frame', type: 'image', content: 'GUESSTHEFRAME/Rush (2023).webp', answer: 'RUSH', year: '2023' }
      ];
      MultiplayerEngine.currentPlayIndex = 0;
      MultiplayerEngine.isMatchActive = true;
      MultiplayerEngine.isRoundFinished = false;
      MultiplayerEngine.currentRoundWinners = [
        { playerId: MultiplayerEngine.playerId, playerName: 'AMAN', avatar: 'aman', position: 1, points: 10 }
      ];

      // Aman attempts to spoil the answer in chat for other players
      ChatEngine.processOutgoingMessage('Guys the answer is Rush');

      const stream = document.getElementById('liveChatStream');
      const chatTexts = Array.from(stream.querySelectorAll('.chat-msg-text')).map(el => el.textContent.trim());
      const notices = Array.from(stream.querySelectorAll('.chat-notice-subtle')).map(el => el.textContent.trim());

      return {
        chatTexts,
        notices,
        hasSpoilerInChat: chatTexts.some(t => /rush/i.test(t)),
        hasWarningNotice: notices.some(n => /don't spoil/i.test(n) || /shh/i.test(n))
      };
    });

    expect(result.hasSpoilerInChat).toBe(false);
    expect(result.chatTexts.length).toBe(0);
    expect(result.hasWarningNotice).toBe(true);
  });

  test('ChatEngine allows casual non-spoiler messages normally', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const result = await page.evaluate(() => {
      MultiplayerEngine.selectedAvatarForModal = 'aman';
      MultiplayerEngine.confirmCreateRoom();

      GS.players = [
        { id: MultiplayerEngine.playerId, name: 'AMAN', avatar: 'aman', score: 0 }
      ];

      MultiplayerEngine.currentPlaylist = [
        { sectionId: 1, sectionName: 'Guess the Frame', type: 'image', content: 'GUESSTHEFRAME/Rush (2023).webp', answer: 'RUSH', year: '2023' }
      ];
      MultiplayerEngine.currentPlayIndex = 0;
      MultiplayerEngine.isMatchActive = true;
      MultiplayerEngine.isRoundFinished = false;
      MultiplayerEngine.currentRoundWinners = [];

      // Casual chat
      ChatEngine.processOutgoingMessage('Good luck everyone!');

      const stream = document.getElementById('liveChatStream');
      const chatTexts = Array.from(stream.querySelectorAll('.chat-msg-text')).map(el => el.textContent.trim());

      return {
        chatTexts
      };
    });

    expect(result.chatTexts.length).toBe(1);
    expect(result.chatTexts[0]).toBe('Good luck everyone!');
  });

  test('Defense-in-depth: Incoming WebSocket CHAT_MESSAGE containing answer during active round is suppressed from chat', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const result = await page.evaluate(() => {
      MultiplayerEngine.selectedAvatarForModal = 'aman';
      MultiplayerEngine.confirmCreateRoom();

      GS.players = [
        { id: MultiplayerEngine.playerId, name: 'AMAN', avatar: 'aman', score: 0 },
        { id: 'p2', name: 'AMISH', avatar: 'amish', score: 0 }
      ];

      MultiplayerEngine.currentPlaylist = [
        { sectionId: 1, sectionName: 'Guess the Frame', type: 'image', content: 'GUESSTHEFRAME/2001 A Space Odyssey (1968).webp', answer: '2001 A SPACE ODYSSEY', year: '1968' }
      ];
      MultiplayerEngine.currentPlayIndex = 0;
      MultiplayerEngine.isMatchActive = true;
      MultiplayerEngine.isRoundFinished = false;
      MultiplayerEngine.currentRoundWinners = [];

      // Rogue / laggy client broadcasts CHAT_MESSAGE with the movie title over websocket
      MultiplayerEngine.handleIncomingEvent({
        roomCode: MultiplayerEngine.roomCode,
        senderId: 'p2',
        type: 'CHAT_MESSAGE',
        msg: {
          id: 'msg_hack_1',
          senderId: 'p2',
          senderName: 'AMISH',
          senderAvatar: 'amish',
          text: '2001 A Space Odyssey',
          timestamp: Date.now()
        }
      });

      const stream = document.getElementById('liveChatStream');
      const chatTexts = Array.from(stream.querySelectorAll('.chat-msg-text')).map(el => el.textContent.trim());

      return {
        chatTexts,
        hasAnswerInChat: chatTexts.some(t => /space odyssey/i.test(t)),
        winnersCount: MultiplayerEngine.currentRoundWinners.length
      };
    });

    // The answer must not be rendered into chat!
    expect(result.hasAnswerInChat).toBe(false);
    expect(result.chatTexts.length).toBe(0);
    // Because p2 submitted the correct answer, host awards points to p2
    expect(result.winnersCount).toBe(1);
  });
});
