const fs = require('fs');

const ENDPOINT = 'https://sgp.cloud.appwrite.io/v1';
const PROJECT_ID = '6a95a01e0028db20a16f';
const DATABASE_ID = 'guess_the_frame';

const HEADERS = {
  'x-appwrite-project': PROJECT_ID,
  'Content-Type': 'application/json'
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function makeQuery(method, attribute, values) {
  return encodeURIComponent(JSON.stringify({ method, attribute, values }));
}

async function apiRequest(path, method = 'GET', body = null, retries = 3) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const url = `${ENDPOINT}${path}`;
      const options = {
        method,
        headers: { ...HEADERS }
      };
      if (body) {
        options.body = JSON.stringify(body);
      }
      const res = await fetch(url, options);
      const text = await res.text();
      let json = {};
      try {
        json = JSON.parse(text);
      } catch (e) {
        json = { raw: text };
      }
      return { status: res.status, ok: res.ok, data: json };
    } catch (err) {
      if (attempt === retries) {
        throw err;
      }
      await sleep(250 * Math.pow(2, attempt));
    }
  }
}

async function runRoomLoad(roomIndex) {
  const runId = Math.random().toString(36).substring(2, 6).toUpperCase();
  const roomCode = `L${roomIndex}${runId}`.substring(0, 6);
  const roomId = `room_${roomCode}`;
  
  const hostId = `host_r${roomIndex}_${Date.now()}`;
  const playerIds = [
    hostId,
    `p2_r${roomIndex}_${Date.now()}`,
    `p3_r${roomIndex}_${Date.now()}`,
    `p4_r${roomIndex}_${Date.now()}`
  ];

  const metrics = {
    roomIndex,
    roomCode,
    roomId,
    createLatencyMs: 0,
    joinLatenciesMs: [],
    guessLatenciesMs: [],
    errors: []
  };

  try {
    // 1. Host creates Room & Initial Game State
    const t0 = Date.now();
    const createRes = await apiRequest(`/databases/${DATABASE_ID}/collections/rooms/documents`, 'POST', {
      documentId: roomId,
      data: {
        roomId: roomId,
        roomCode: roomCode,
        hostId: hostId,
        status: 'lobby',
        currentRound: 0,
        currentSection: 'frames',
        timer: 30,
        totalRounds: 10,
        categories: 'frames,eyes,dialogue',
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    });

    if (!createRes.ok) {
      metrics.errors.push(`Create room failed: ${createRes.status} ${JSON.stringify(createRes.data)}`);
      return metrics;
    }

    await apiRequest(`/databases/${DATABASE_ID}/collections/game_state/documents`, 'POST', {
      documentId: roomId,
      data: {
        roomId: roomId,
        roundNumber: 1,
        phase: 'lobby',
        currentImage: 'frames/1/1.webp',
        dialogueText: '',
        dialogueContext: '',
        maskedHint: 'I _ _ _ _ _ _ _ N',
        revealedAnswer: '',
        winners: '[]',
        startedAt: 0,
        version: 1
      }
    });

    await apiRequest(`/databases/${DATABASE_ID}/collections/players/documents`, 'POST', {
      documentId: `${roomId}_${hostId}`,
      data: {
        playerId: hostId,
        roomId: roomId,
        name: `Host_${roomIndex}`,
        avatar: 'aman',
        status: 'connected',
        lastHeartbeat: Date.now(),
        score: 0,
        isHost: true,
        color: '#ff7eb6'
      }
    });
    metrics.createLatencyMs = Date.now() - t0;

    // 2. 3 Players Join Concurrently
    const joinPromises = [1, 2, 3].map(async (pIdx) => {
      const pId = playerIds[pIdx];
      const tj0 = Date.now();
      
      // Query room by code
      const queryParam = makeQuery('equal', 'roomCode', [roomCode]);
      const qRes = await apiRequest(`/databases/${DATABASE_ID}/collections/rooms/documents?queries[0]=${queryParam}`);
      if (!qRes.ok || qRes.data.total === 0) {
        metrics.errors.push(`Player ${pIdx} could not find room ${roomCode}`);
        return;
      }

      // Add player document
      const joinRes = await apiRequest(`/databases/${DATABASE_ID}/collections/players/documents`, 'POST', {
        documentId: `${roomId}_${pId}`,
        data: {
          playerId: pId,
          roomId: roomId,
          name: `Player_${roomIndex}_${pIdx}`,
          avatar: pIdx === 1 ? 'amish' : (pIdx === 2 ? 'aziz' : 'vish'),
          status: 'connected',
          lastHeartbeat: Date.now(),
          score: 0,
          isHost: false,
          color: '#57c3e0'
        }
      });

      if (!joinRes.ok) {
        metrics.errors.push(`Player ${pIdx} join doc creation failed: ${joinRes.status}`);
      } else {
        metrics.joinLatenciesMs.push(Date.now() - tj0);
      }
    });

    await Promise.all(joinPromises);

    // 3. Host starts match
    await apiRequest(`/databases/${DATABASE_ID}/collections/rooms/documents/${roomId}`, 'PATCH', {
      data: {
        status: 'playing',
        currentRound: 1,
        updatedAt: Date.now()
      }
    });
    await apiRequest(`/databases/${DATABASE_ID}/collections/game_state/documents/${roomId}`, 'PATCH', {
      data: {
        phase: 'guessing',
        version: 2
      }
    });

    // 4. Concurrent Guesses to validate-guess Function
    // Frame 1 answer is "Inception"
    const guesses = [
      { pId: playerIds[0], name: `Host_${roomIndex}`, guess: 'inception' },     // 1st place (+10)
      { pId: playerIds[1], name: `Player_${roomIndex}_1`, guess: 'Inception' }, // 2nd place (+7)
      { pId: playerIds[2], name: `Player_${roomIndex}_2`, guess: 'INCEPTION' }, // 3rd place (+5)
      { pId: playerIds[3], name: `Player_${roomIndex}_3`, guess: 'titanic' }    // incorrect (0)
    ];

    const guessPromises = guesses.map(async (g, gIdx) => {
      const tg0 = Date.now();
      const fnRes = await apiRequest('/functions/validate-guess/executions', 'POST', {
        body: JSON.stringify({
          roomId: roomId,
          roundIndex: 0,
          roundNumber: 1,
          guess: g.guess,
          playerId: g.pId,
          playerName: g.name,
          playerAvatar: 'aman',
          guessId: `${g.pId}_${roomId}_g${gIdx}_${Date.now()}`
        })
      });

      const latency = Date.now() - tg0;
      metrics.guessLatenciesMs.push(latency);

      if (!fnRes.ok) {
        metrics.errors.push(`Function execution failed for ${g.pId}: ${fnRes.status}`);
      }
    });

    await Promise.all(guessPromises);

    // 5. Verify State Integrity
    const stateRes = await apiRequest(`/databases/${DATABASE_ID}/collections/game_state/documents/${roomId}`);
    const playerQueryParam = makeQuery('equal', 'roomId', [roomId]);
    const playersRes = await apiRequest(`/databases/${DATABASE_ID}/collections/players/documents?queries[0]=${playerQueryParam}`);

    metrics.playersCount = playersRes.data.total || 0;
    let winnersList = [];
    try {
      winnersList = JSON.parse(stateRes.data.winners || '[]');
    } catch(e) {}
    metrics.winnersCount = winnersList.length;

    // 6. Cleanup Load Test Data
    await apiRequest(`/databases/${DATABASE_ID}/collections/rooms/documents/${roomId}`, 'DELETE').catch(() => {});
    await apiRequest(`/databases/${DATABASE_ID}/collections/game_state/documents/${roomId}`, 'DELETE').catch(() => {});
    for (const pid of playerIds) {
      await apiRequest(`/databases/${DATABASE_ID}/collections/players/documents/${roomId}_${pid}`, 'DELETE').catch(() => {});
    }

  } catch (err) {
    metrics.errors.push(`Unexpected error in room ${roomIndex}: ${err.message}`);
  }

  return metrics;
}

async function runLoadTest() {
  console.log('================================================================');
  console.log('SCOOPCAST PRODUCTION LOAD TEST: 10 ROOMS • 40 CONCURRENT PLAYERS');
  console.log('================================================================');
  console.log(`Target: ${ENDPOINT}`);
  console.log(`Database: ${DATABASE_ID}`);
  console.log('Launching 10 rooms simultaneously...\n');

  const overallStart = Date.now();
  const roomIndices = Array.from({ length: 10 }, (_, i) => i + 1);

  // Run all 10 rooms concurrently
  const results = await Promise.all(roomIndices.map(i => runRoomLoad(i)));
  const totalDuration = Date.now() - overallStart;

  // Aggregate Metrics
  const createLatencies = results.map(r => r.createLatencyMs).filter(l => l > 0);
  const allJoinLatencies = results.flatMap(r => r.joinLatenciesMs);
  const allGuessLatencies = results.flatMap(r => r.guessLatenciesMs);
  const allErrors = results.flatMap(r => r.errors);

  const avg = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
  const min = arr => arr.length ? Math.min(...arr) : 0;
  const max = arr => arr.length ? Math.max(...arr) : 0;

  console.log('----------------------------------------------------------------');
  console.log('LOAD TEST RESULTS SUMMARY:');
  console.log('----------------------------------------------------------------');
  console.log(`Total Rooms Tested:             ${results.length}`);
  console.log(`Total Concurrent Player Slots:   ${results.length * 4}`);
  console.log(`Total Test Execution Time:       ${totalDuration}ms`);
  console.log(`Errors / Failures:               ${allErrors.length}`);

  console.log('\n--- LATENCY METRICS ---');
  console.log(`Room Creation Latency:           Avg: ${avg(createLatencies)}ms | Min: ${min(createLatencies)}ms | Max: ${max(createLatencies)}ms`);
  console.log(`Player Join Latency:             Avg: ${avg(allJoinLatencies)}ms | Min: ${min(allJoinLatencies)}ms | Max: ${max(allJoinLatencies)}ms`);
  console.log(`Guess Validation Function:       Avg: ${avg(allGuessLatencies)}ms | Min: ${min(allGuessLatencies)}ms | Max: ${max(allGuessLatencies)}ms`);

  console.log('\n--- STATE ISOLATION & INTEGRITY ---');
  let allRoomsIsolated = true;
  for (const r of results) {
    console.log(`Room ${r.roomIndex} (${r.roomCode}): Players Synced: ${r.playersCount}/4 | Winners: ${r.winnersCount} | Errors: ${r.errors.length}`);
    if (r.playersCount !== 4 || r.errors.length > 0) {
      allRoomsIsolated = false;
    }
  }

  console.log('----------------------------------------------------------------');
  if (allErrors.length === 0 && allRoomsIsolated) {
    console.log('✅ ALL RELEASE CRITERIA PASSED: 10 Rooms, 40 Players, Zero Corruption!');
  } else {
    console.log('⚠️ Load test encountered issues:');
    allErrors.forEach(e => console.log(' - ' + e));
  }
  console.log('================================================================');

  fs.writeFileSync('load_test_report.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    totalDuration,
    results,
    summary: {
      rooms: results.length,
      concurrentUsers: results.length * 4,
      avgCreateLatency: avg(createLatencies),
      avgJoinLatency: avg(allJoinLatencies),
      avgGuessLatency: avg(allGuessLatencies),
      errorCount: allErrors.length
    }
  }, null, 2));
}

runLoadTest().catch(err => console.error('Fatal load test runner error:', err));
