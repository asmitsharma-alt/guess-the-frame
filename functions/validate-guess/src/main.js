import { Client, Databases } from 'node-appwrite';

// Master Private Answer Catalog
const MASTER_PLAYLIST = [
  // SECTION 1: Guess the Frame (20 Rounds)
  { id: 1, type: 'image', answer: 'AMERICAN HISTORY X', title: 'American History X' },
  { id: 2, type: 'image', answer: 'AVENGERS INFINITY WAR', title: 'Avengers Infinity War' },
  { id: 3, type: 'image', answer: 'BAAHUBALI 2 THE CONCLUSION', title: 'Baahubali 2 The Conclusion' },
  { id: 4, type: 'image', answer: 'BALAN - THE BOY', title: 'Balan - The Boy' },
  { id: 5, type: 'image', answer: 'BEFORE SUNSET', title: 'Before Sunset' },
  { id: 6, type: 'image', answer: 'BILLU', title: 'Billu' },
  { id: 7, type: 'image', answer: 'CERTIFIED COPY', title: 'Certified Copy' },
  { id: 8, type: 'image', answer: 'DALLAS BUYERS CLUB', title: 'Dallas Buyers Club' },
  { id: 9, type: 'image', answer: 'DUNE PART TWO', title: 'Dune Part Two' },
  { id: 10, type: 'image', answer: 'GO GOA GONE', title: 'Go Goa Gone' },
  { id: 11, type: 'image', answer: 'I SAW THE DEVIL', title: 'I Saw the Devil' },
  { id: 12, type: 'image', answer: 'IRUMUDI', title: 'Irumudi' },
  { id: 13, type: 'image', answer: 'KARWAAN', title: 'Karwaan' },
  { id: 14, type: 'image', answer: 'NIRVANNA THE BAND THE SHOW THE MOVIE', title: 'Nirvanna the Band the Show the Movie' },
  { id: 15, type: 'image', answer: 'OCTOBER', title: 'October' },
  { id: 16, type: 'image', answer: 'PREMALU', title: 'Premalu' },
  { id: 17, type: 'image', answer: 'RANG DE BASANTI', title: 'Rang De Basanti' },
  { id: 18, type: 'image', answer: 'REQUIEM FOR A DREAM', title: 'Requiem for a Dream' },
  { id: 19, type: 'image', answer: 'S/O SATYAMURTHY', title: 'S/O Satyamurthy' },
  { id: 20, type: 'image', answer: 'STAND BY ME', title: 'Stand by Me' },

  // SECTION 2: Guess the Dialogue (10 Rounds)
  { id: 21, type: 'dialogue', answer: 'SCARFACE', title: 'Scarface' },
  { id: 22, type: 'dialogue', answer: 'THE DARK KNIGHT', title: 'The Dark Knight' },
  { id: 23, type: 'dialogue', answer: 'CAPTAIN AMERICA: THE WINTER SOLDIER', title: 'Captain America: The Winter Soldier' },
  { id: 24, type: 'dialogue', answer: 'THERE WILL BE BLOOD', title: 'There Will Be Blood' },
  { id: 25, type: 'dialogue', answer: 'GLADIATOR', title: 'Gladiator' },
  { id: 26, type: 'dialogue', answer: 'AVENGERS: AGE OF ULTRON', title: 'Avengers: Age of Ultron' },
  { id: 27, type: 'dialogue', answer: 'DAMINI', title: 'Damini' },
  { id: 28, type: 'dialogue', answer: 'ANDAZ APNA APNA', title: 'Andaz Apna Apna' },
  { id: 29, type: 'dialogue', answer: 'SHAHENSHAH', title: 'Shahenshah' },
  { id: 30, type: 'dialogue', answer: 'ZINDAGI NA MILEGI DOBARA', title: 'Zindagi Na Milegi Dobara' },

  // SECTION 3: Guess the Eye (10 Rounds)
  { id: 31, type: 'eye', answer: 'BHUVAN BAM', title: 'Bhuvan Bam' },
  { id: 32, type: 'eye', answer: 'DAISY EDGAR-JONES', title: 'Daisy Edgar-Jones' },
  { id: 33, type: 'eye', answer: 'DAKOTA JOHNSON', title: 'Dakota Johnson' },
  { id: 34, type: 'eye', answer: 'DULQUER SALMAAN', title: 'Dulquer Salmaan' },
  { id: 35, type: 'eye', answer: 'ELLE FANNING', title: 'Elle Fanning' },
  { id: 36, type: 'eye', answer: 'KICCHA SUDEEP', title: 'Kiccha Sudeep' },
  { id: 37, type: 'eye', answer: 'KYLE CHANDLER', title: 'Kyle Chandler' },
  { id: 38, type: 'eye', answer: 'ROBERT PATTINSON', title: 'Robert Pattinson' },
  { id: 39, type: 'eye', answer: 'SALMA HAYEK', title: 'Salma Hayek' },
  { id: 40, type: 'eye', answer: 'SOPHIE TURNER', title: 'Sophie Turner' }
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
    'baahubali 2': 'baahubali 2 the conclusion',
    'bahubali 2': 'baahubali 2 the conclusion',
    'bahubali 2 the conclusion': 'baahubali 2 the conclusion',
    'balan': 'balan the boy',
    'billu barber': 'billu',
    'dune 2': 'dune part two',
    'nirvanna': 'nirvanna the band the show the movie',
    'nirvanna the band the show': 'nirvanna the band the show the movie',
    'rdb': 'rang de basanti',
    'so satyamurthy': 's o satyamurthy',
    's o satyamurthy': 's o satyamurthy',
    'son of satyamurthy': 's o satyamurthy',
    'dark knight': 'the dark knight',
    'winter soldier': 'captain america the winter soldier',
    'captain america 2': 'captain america the winter soldier',
    'age of ultron': 'avengers age of ultron',
    'avengers 2': 'avengers age of ultron',
    'znmd': 'zindagi na milegi dobara',
    'daisy edgar jones': 'daisy edgar jones',
    'dulquer salman': 'dulquer salmaan',
    'sudeep': 'kiccha sudeep',
    'kichcha sudeep': 'kiccha sudeep'
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
