import { Client, Databases } from 'node-appwrite';

// Master Private Answer Catalog
const MASTER_PLAYLIST = [
  // SECTION 1: Guess the Frame (20 Rounds)
  { id: 1, type: 'image', answer: '3 IDIOTS', title: '3 Idiots' },
  { id: 2, type: 'image', answer: 'ALL WE IMAGINE AS LIGHT', title: 'All We Imagine As Light' },
  { id: 3, type: 'image', answer: 'ANORA', title: 'Anora' },
  { id: 4, type: 'image', answer: 'BABYLON', title: 'Babylon' },
  { id: 5, type: 'image', answer: 'BADLANDS', title: 'Badlands' },
  { id: 6, type: 'image', answer: 'BHAVESH JOSHI SUPERHERO', title: 'Bhavesh Joshi Superhero' },
  { id: 7, type: 'image', answer: 'CHALLENGERS', title: 'Challengers' },
  { id: 8, type: 'image', answer: 'CHUNGKING EXPRESS', title: 'Chungking Express' },
  { id: 9, type: 'image', answer: 'DIL CHAHTA HAI', title: 'Dil Chahta Hai' },
  { id: 10, type: 'image', answer: 'DRISHYAM', title: 'Drishyam' },
  { id: 11, type: 'image', answer: 'FIGHT CLUB', title: 'Fight Club' },
  { id: 12, type: 'image', answer: 'PIKU', title: 'Piku' },
  { id: 13, type: 'image', answer: 'SATLUJ', title: 'Satluj' },
  { id: 14, type: 'image', answer: 'THE END OF OAK STREET', title: 'The End of Oak Street' },
  { id: 15, type: 'image', answer: 'THE FRENCH DISPATCH', title: 'The French Dispatch' },
  { id: 16, type: 'image', answer: 'THE MENU', title: 'The Menu' },
  { id: 17, type: 'image', answer: 'THE REVENANT', title: 'The Revenant' },
  { id: 18, type: 'image', answer: 'THE RIVALS OF AMZIAH KING', title: 'The Rivals of Amziah King' },
  { id: 19, type: 'image', answer: 'KHOSLA KA GHOSLA', title: 'Khosla Ka Ghosla' },
  { id: 20, type: 'image', answer: 'TONY', title: 'Tony' },

  // SECTION 2: Guess the Dialogue (10 Rounds)
  { id: 21, type: 'dialogue', answer: '96', title: '96' },
  { id: 22, type: 'dialogue', answer: 'SUPERMAN', title: 'Superman' },
  { id: 23, type: 'dialogue', answer: 'LANTERNS', title: 'Lanterns' },
  { id: 24, type: 'dialogue', answer: 'KOI MIL GAYA', title: 'Koi Mil Gaya' },
  { id: 25, type: 'dialogue', answer: 'MY NAME IS KHAN', title: 'My Name Is Khan' },
  { id: 26, type: 'dialogue', answer: 'AVENGERS INFINITY WAR', title: 'Avengers Infinity War' },
  { id: 27, type: 'dialogue', answer: 'THE GODFATHER', title: 'The Godfather' },
  { id: 28, type: 'dialogue', answer: 'A FEW GOOD MEN', title: 'A Few Good Men' },
  { id: 29, type: 'dialogue', answer: 'BATMAN BEGINS', title: 'Batman Begins' },
  { id: 30, type: 'dialogue', answer: 'THE BADS OF BOLLYWOOD', title: 'The Bads of Bollywood' },

  // SECTION 3: Guess the Eye (10 Rounds)
  { id: 31, type: 'eye', answer: 'AARON PIERRE', title: 'Aaron Pierre' },
  { id: 32, type: 'eye', answer: 'ALEXANDRA DADDARIO', title: 'Alexandra Daddario' },
  { id: 33, type: 'eye', answer: 'ANGELINA JOLIE', title: 'Angelina Jolie' },
  { id: 34, type: 'eye', answer: 'DISHA PATANI', title: 'Disha Patani' },
  { id: 35, type: 'eye', answer: 'HUNTER SCHAFER', title: 'Hunter Schafer' },
  { id: 36, type: 'eye', answer: 'LEONARDO DICAPRIO', title: 'Leonardo DiCaprio' },
  { id: 37, type: 'eye', answer: 'MERYL STREEP', title: 'Meryl Streep' },
  { id: 38, type: 'eye', answer: 'NICOLE KIDMAN', title: 'Nicole Kidman' },
  { id: 39, type: 'eye', answer: 'WAMIQA GABBI', title: 'Wamiqa Gabbi' },
  { id: 40, type: 'eye', answer: 'YASH', title: 'Yash' }
];

// Production Fuzzy Matcher Engine
const FuzzyMatcher = {
  STOP_WORDS: new Set([
    'the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with',
    'by', 'from', 'as', 'is', 'was', 'are', 'were', 'it', 'its', 'part', 'movie', 'film'
  ]),

  ALIASES: {
    'spiderman': 'spider man',
    'batman': 'the batman',
    'avengers 3': 'avengers infinity war',
    'infinity war': 'avengers infinity war',
    'godfather': 'the godfather',
    'few good men': 'a few good men',
    '3idiots': '3 idiots',
    'three idiots': '3 idiots',
    'khosla ka ghosla': 'khosla ka gholsa',
    'french dispatch': 'the french dispatch',
    'menu': 'the menu',
    'revenant': 'the revenant'
  },

  normalize(str) {
    if (!str) return '';
    let s = String(str).toLowerCase().trim();
    s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    s = s.replace(/['’`]/g, '');
    s = s.replace(/[^a-z0-9\s]/g, ' ');
    s = s.replace(/\s+/g, ' ').trim();
    return this.ALIASES[s] || s;
  },

  levenshtein(s1, s2) {
    if (s1 === s2) return 0;
    if (!s1.length) return s2.length;
    if (!s2.length) return s1.length;
    let prev = Array.from({ length: s2.length + 1 }, (_, i) => i);
    for (let i = 0; i < s1.length; i++) {
      let curr = [i + 1];
      for (let j = 0; j < s2.length; j++) {
        let ins = prev[j + 1] + 1;
        let del = curr[j] + 1;
        let sub = prev[j] + (s1[i] === s2[j] ? 0 : 1);
        curr[j + 1] = Math.min(ins, del, sub);
      }
      prev = curr;
    }
    return prev[s2.length];
  },

  canonicalWord(w) {
    if (!w) return '';
    if (w.length >= 4 && w.endsWith('s') && !w.endsWith('ss')) {
      return w.slice(0, -1);
    }
    return w;
  },

  isWordMatch(w1, w2) {
    if (!w1 || !w2) return false;
    if (w1 === w2) return true;
    const c1 = this.canonicalWord(w1);
    const c2 = this.canonicalWord(w2);
    if (c1 === c2) return true;
    if (Math.abs(c1.length - c2.length) > 2) return false;
    if (Math.min(c1.length, c2.length) >= 4) {
      const dist = this.levenshtein(c1, c2);
      if (Math.max(c1.length, c2.length) <= 6 && dist <= 1) return true;
      if (Math.max(c1.length, c2.length) > 6 && dist <= 2) return true;
    }
    return false;
  },

  getSignificantWords(normalizedStr) {
    if (!normalizedStr) return [];
    return normalizedStr.split(' ')
      .map(w => w.trim())
      .filter(w => w.length >= 3 && !this.STOP_WORDS.has(w));
  },

  isMatch(guess, answer) {
    if (!guess || !answer) return false;
    const nGuess = this.normalize(guess);
    const nAns = this.normalize(answer);
    if (!nGuess || !nAns) return false;
    if (nGuess === nAns) return true;

    const compactGuess = nGuess.replace(/\s+/g, '');
    const compactAns = nAns.replace(/\s+/g, '');
    if (compactGuess === compactAns) return true;
    if (Math.abs(compactGuess.length - compactAns.length) <= 2) {
      const cDist = this.levenshtein(compactGuess, compactAns);
      if (compactAns.length <= 6 && cDist <= 1) return true;
      if (compactAns.length > 6 && cDist <= 2) return true;
    }

    const lenDiff = Math.abs(nGuess.length - nAns.length);
    if (lenDiff <= 3) {
      const dist = this.levenshtein(nGuess, nAns);
      if (nAns.length <= 4) {
        if (dist === 0) return true;
      } else if (nAns.length <= 8) {
        if (dist <= 1) return true;
      } else if (nAns.length <= 15) {
        if (dist <= 2) return true;
      } else {
        if (dist <= 3) return true;
      }
    }

    const ansSigWords = this.getSignificantWords(nAns);
    const guessSigWords = this.getSignificantWords(nGuess);

    if (ansSigWords.length === 0) {
      return nGuess === nAns || compactGuess === compactAns || this.levenshtein(nGuess, nAns) <= 1;
    }

    if (guessSigWords.length > 1) {
      let matchedCount = 0;
      for (const gw of guessSigWords) {
        if (ansSigWords.some(aw => this.isWordMatch(gw, aw))) {
          matchedCount++;
        }
      }
      if (matchedCount === guessSigWords.length) return true;
      if (guessSigWords.length >= 3 && (matchedCount / guessSigWords.length) >= 0.66) return true;
      return false;
    }

    const singleWord = guessSigWords.length === 1 ? guessSigWords[0] : (nGuess.split(' ').length === 1 ? nGuess : null);
    if (singleWord && !this.STOP_WORDS.has(singleWord) && singleWord.length >= 3) {
      for (const aw of ansSigWords) {
        if (this.isWordMatch(singleWord, aw)) return true;
      }
    }

    return false;
  }
};

// In-memory idempotency cache for deduplicating rapid duplicate submissions
const RECENT_GUESSES = new Map();
function isDuplicateGuess(key) {
  const now = Date.now();
  for (const [k, t] of RECENT_GUESSES.entries()) {
    if (now - t > 5000) RECENT_GUESSES.delete(k);
  }
  if (RECENT_GUESSES.has(key)) return true;
  RECENT_GUESSES.set(key, now);
  return false;
}

// Per-player sliding window rate limiter: max 5 requests per 3 seconds
const PLAYER_RATE_LIMITS = new Map();
function checkRateLimit(playerId) {
  const now = Date.now();
  let timestamps = PLAYER_RATE_LIMITS.get(playerId) || [];
  timestamps = timestamps.filter(t => now - t < 3000);
  if (timestamps.length >= 5) {
    PLAYER_RATE_LIMITS.set(playerId, timestamps);
    return false;
  }
  timestamps.push(now);
  PLAYER_RATE_LIMITS.set(playerId, timestamps);
  return true;
}

export default async ({ req, res, log, error }) => {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { roomId, roundIndex, roundNumber, guess, playerId, playerName, playerAvatar, guessId } = body;

    // Strict schema validation
    if (!roomId || typeof roomId !== 'string' || !/^room_[A-Z0-9_-]{4,32}$/i.test(roomId)) {
      return res.json({ success: false, error: 'Invalid or missing roomId parameter' }, 400);
    }
    if (!playerId || typeof playerId !== 'string' || playerId.length < 1 || playerId.length > 64) {
      return res.json({ success: false, error: 'Invalid or missing playerId parameter' }, 400);
    }
    if (!guess || typeof guess !== 'string' || guess.trim().length === 0 || guess.length > 80) {
      return res.json({ success: false, error: 'Invalid guess parameter (must be 1-80 characters)' }, 400);
    }

    const idx = (typeof roundIndex === 'number') ? roundIndex : ((roundNumber || 1) - 1);
    if (typeof idx !== 'number' || idx < 0 || idx >= MASTER_PLAYLIST.length) {
      return res.json({ success: false, error: `Invalid round index: ${idx}` }, 400);
    }

    // Rate limiting check
    if (!checkRateLimit(playerId)) {
      return res.json({
        success: false,
        error: 'Too many guesses submitted. Please slow down.'
      }, 429);
    }

    const cleanGuess = guess.replace(/[\x00-\x1F\x7F]/g, '').trim();
    const dedupeKey = guessId || `${playerId}_${roomId}_r${idx}_${cleanGuess.toLowerCase()}`;

    if (isDuplicateGuess(dedupeKey)) {
      return res.json({
        success: true,
        isDuplicate: true,
        message: 'Duplicate guess submission ignored'
      });
    }

    const targetItem = MASTER_PLAYLIST[idx];

    if (!targetItem) {
      return res.json({ success: false, error: 'Round not found in playlist' }, 404);
    }

    const isCorrect = FuzzyMatcher.isMatch(cleanGuess, targetItem.answer);

    if (!isCorrect) {
      return res.json({
        success: true,
        isCorrect: false,
        playerId
      });
    }

    // Authenticate Server SDK
    const serverKey = req.headers['x-appwrite-key'] || process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || '';
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1')
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID || '6a95a01e0028db20a16f');

    if (serverKey) {
      client.setKey(serverKey);
    }

    const databases = new Databases(client);

    // Fetch Game State
    let gameState;
    try {
      gameState = await databases.getDocument('guess_the_frame', 'game_state', `state_${roomId}`);
    } catch (e) {
      try {
        gameState = await databases.getDocument('guess_the_frame', 'game_state', roomId);
      } catch (err) {
        log(`No game_state doc found, scoring in-memory: ${err.message}`);
      }
    }

    let winners = [];
    if (gameState && gameState.winners) {
      try {
        winners = typeof gameState.winners === 'string' ? JSON.parse(gameState.winners) : gameState.winners;
      } catch (e) {
        winners = [];
      }
    }

    // Check if player already won this round
    if (winners.some(w => w.playerId === playerId)) {
      return res.json({
        success: true,
        isCorrect: true,
        alreadyScored: true,
        playerId
      });
    }

    const position = winners.length + 1;
    const points = position === 1 ? 10 : (position === 2 ? 7 : (position === 3 ? 5 : 0));

    const winRecord = {
      playerId,
      playerName: playerName || 'Player',
      avatar: playerAvatar || 'aman',
      position,
      points,
      timestamp: Date.now()
    };

    winners.push(winRecord);

    let serverDbUpdated = false;
    let newTotalScore = points;
    // Update game_state and player score in database if server key is available
    if (gameState && serverKey) {
      try {
        const nextVersion = ((gameState && gameState.version) || 0) + 1;
        await databases.updateDocument('guess_the_frame', 'game_state', gameState.$id, {
          winners: JSON.stringify(winners),
          version: nextVersion
        });

        const playerDocId = `${roomId}_${playerId}`;
        try {
          const playerDoc = await databases.getDocument('guess_the_frame', 'players', playerDocId);
          if (playerDoc) {
            newTotalScore = (playerDoc.score || 0) + points;
            await databases.updateDocument('guess_the_frame', 'players', playerDocId, {
              score: newTotalScore
            });
            serverDbUpdated = true;
          }
        } catch (pErr) {
          log(`Player doc lookup by ID fallback: ${pErr.message}`);
        }
      } catch (dbErr) {
        error(`Failed to update DB from function: ${dbErr.message}`);
      }
    }

    return res.json({
      success: true,
      isCorrect: true,
      position,
      points,
      newTotalScore,
      winRecord,
      serverDbUpdated
    });
  } catch (err) {
    error(`Validation error: ${err.message}`);
    return res.json({ success: false, error: err.message }, 500);
  }
};
