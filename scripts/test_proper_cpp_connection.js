const https = require('https');
const mqtt = require('mqtt');

// Helper to make HTTPS requests with redirect support
function httpRequest(url, options = {}, postData = null, maxRedirects = 3) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: 15000
    };

    const client = parsedUrl.protocol === 'https:' ? https : require('http');
    const req = client.request(reqOptions, (res) => {
      // Handle redirect
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location && maxRedirects > 0) {
        let redirectUrl = res.headers.location;
        if (!redirectUrl.startsWith('http')) {
          redirectUrl = new URL(redirectUrl, url).toString();
        }
        return httpRequest(redirectUrl, options, postData, maxRedirects - 1)
          .then(resolve)
          .catch(reject);
      }

      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request to ${url} timed out`));
    });

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runConnectionTests() {
  console.log('====================================================');
  console.log('🚀 TESTING FULL STACK CONNECTION: FRONTEND, BACKEND & CPP P2P');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function report(name, success, details) {
    totalTests++;
    if (success) {
      passedTests++;
      console.log(`✅ [PASS] ${name}`);
      if (details) console.log(`   └─ ${details}`);
    } else {
      console.error(`❌ [FAIL] ${name}`);
      if (details) console.error(`   └─ ${details}`);
    }
  }

  // --- 1. TEST VERCEL PRODUCTION FRONTEND & ASSETS ---
  console.log('--- 1. Testing Vercel Production Frontend & Assets (https://www.scoopcast-live.in) ---');
  const vercelBase = 'https://www.scoopcast-live.in';

  try {
    const resHome = await httpRequest(`${vercelBase}/`);
    report('Vercel HTML Root (index.html)', resHome.statusCode === 200, `Status: ${resHome.statusCode}, Size: ${resHome.body.length} bytes`);
  } catch (err) {
    report('Vercel HTML Root (index.html)', false, err.message);
  }

  try {
    const resAvatar = await httpRequest(`${vercelBase}/avvtar/ayank.png`);
    report('Vercel New Character Avatar (avvtar/ayank.png)', resAvatar.statusCode === 200, `Status: ${resAvatar.statusCode}`);
  } catch (err) {
    report('Vercel New Character Avatar (avvtar/ayank.png)', false, err.message);
  }

  try {
    const resFrame = await httpRequest(`${vercelBase}/GUESSTHEFRAME/American%20History%20X%20(1998).webp`);
    report('Vercel Movie Frame WebP (Section 1)', resFrame.statusCode === 200, `Status: ${resFrame.statusCode}`);
  } catch (err) {
    report('Vercel Movie Frame WebP (Section 1)', false, err.message);
  }

  try {
    const resDialogue = await httpRequest(`${vercelBase}/dialogues.txt`);
    report('Vercel Dialogues Catalog (Section 2)', resDialogue.statusCode === 200, `Status: ${resDialogue.statusCode}, Lines: ${resDialogue.body.split('\n').length}`);
  } catch (err) {
    report('Vercel Dialogues Catalog (Section 2)', false, err.message);
  }

  try {
    const resEyeCrop = await httpRequest(`${vercelBase}/GUESSTHEEYES/Bhuvan%20Bam%20copy.webp`);
    report('Vercel Eye Crop WebP (Section 3)', resEyeCrop.statusCode === 200, `Status: ${resEyeCrop.statusCode}`);
  } catch (err) {
    report('Vercel Eye Crop WebP (Section 3)', false, err.message);
  }

  try {
    const resEyeReveal = await httpRequest(`${vercelBase}/GUESSTHEEYES/Bhuvan%20Bam.webp`);
    report('Vercel Eye Reveal WebP (Section 3)', resEyeReveal.statusCode === 200, `Status: ${resEyeReveal.statusCode}`);
  } catch (err) {
    report('Vercel Eye Reveal WebP (Section 3)', false, err.message);
  }

  // --- 2. TEST APPWRITE STATIC SITE DEPLOYMENT ---
  console.log('\n--- 2. Testing Appwrite Cloud Site Deployment ---');
  try {
    const appwriteSiteRes = await httpRequest('https://6a9a6a18002d67382503.appwrite.network');
    report('Appwrite Cloud Site (guesstheframe)', appwriteSiteRes.statusCode === 200, `Status: ${appwriteSiteRes.statusCode}, Content-Length: ${appwriteSiteRes.body.length}`);
  } catch (err) {
    report('Appwrite Cloud Site (guesstheframe)', false, err.message);
  }

  // --- 3. TEST APPWRITE CLOUD BACKEND FUNCTION (validate-guess) ---
  console.log('\n--- 3. Testing Appwrite Cloud Backend Function (validate-guess) ---');
  const functionUrl = 'https://validate-guess.sgp.appwrite.run';

  try {
    const payloadFrame = {
      roomId: 'room_TEST_CPP',
      playerId: 'player_test_1',
      playerName: 'Tester',
      playerAvatar: 'ayank',
      guess: 'American History X',
      roundIndex: 0
    };
    const resFuncFrame = await httpRequest(functionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, payloadFrame);

    let parsed = null;
    try { parsed = JSON.parse(resFuncFrame.body); } catch(e) {}

    const isFrameValid = resFuncFrame.statusCode === 200 && parsed && parsed.isCorrect === true;
    report('Backend Function: Section 1 (Frame: "American History X")', isFrameValid, `Status: ${resFuncFrame.statusCode}, Response: ${resFuncFrame.body}`);
  } catch (err) {
    report('Backend Function: Section 1 (Frame: "American History X")', false, err.message);
  }

  try {
    const payloadDialogue = {
      roomId: 'room_TEST_CPP',
      playerId: 'player_test_1',
      playerName: 'Tester',
      playerAvatar: 'ayank',
      guess: 'Scarface',
      roundIndex: 20
    };
    const resFuncDialogue = await httpRequest(functionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, payloadDialogue);

    let parsed = null;
    try { parsed = JSON.parse(resFuncDialogue.body); } catch(e) {}

    const isDialogueValid = resFuncDialogue.statusCode === 200 && parsed && parsed.isCorrect === true;
    report('Backend Function: Section 2 (Dialogue: "Scarface")', isDialogueValid, `Status: ${resFuncDialogue.statusCode}, Response: ${resFuncDialogue.body}`);
  } catch (err) {
    report('Backend Function: Section 2 (Dialogue: "Scarface")', false, err.message);
  }

  try {
    const payloadEye = {
      roomId: 'room_TEST_CPP',
      playerId: 'player_test_1',
      playerName: 'Tester',
      playerAvatar: 'ayank',
      guess: 'Bhuvan Bam',
      roundIndex: 30
    };
    const resFuncEye = await httpRequest(functionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, payloadEye);

    let parsed = null;
    try { parsed = JSON.parse(resFuncEye.body); } catch(e) {}

    const isEyeValid = resFuncEye.statusCode === 200 && parsed && parsed.isCorrect === true;
    report('Backend Function: Section 3 (Eye: "Bhuvan Bam")', isEyeValid, `Status: ${resFuncEye.statusCode}, Response: ${resFuncEye.body}`);
  } catch (err) {
    report('Backend Function: Section 3 (Eye: "Bhuvan Bam")', false, err.message);
  }

  try {
    const payloadWrong = {
      roomId: 'room_TEST_CPP',
      playerId: 'player_test_1',
      playerName: 'Tester',
      playerAvatar: 'ayank',
      guess: 'Totally Incorrect Movie Name 12345',
      roundIndex: 0
    };
    const resFuncWrong = await httpRequest(functionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, payloadWrong);

    let parsed = null;
    try { parsed = JSON.parse(resFuncWrong.body); } catch(e) {}

    const isWrongValid = resFuncWrong.statusCode === 200 && parsed && parsed.isCorrect === false;
    report('Backend Function: Incorrect Guess Rejection', isWrongValid, `Status: ${resFuncWrong.statusCode}, isCorrect: ${parsed?.isCorrect}`);
  } catch (err) {
    report('Backend Function: Incorrect Guess Rejection', false, err.message);
  }

  // --- 4. TEST APPWRITE REST API AUTH & ANONYMOUS SESSION ---
  console.log('\n--- 4. Testing Appwrite Singapore REST API Auth & Connection ---');
  try {
    const resApi = await httpRequest('https://sgp.cloud.appwrite.io/v1/account/sessions/anonymous', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': '6a95a01e0028db20a16f'
      }
    });

    let session = null;
    try { session = JSON.parse(resApi.body); } catch(e) {}
    const isSessionOk = resApi.statusCode === 201 || resApi.statusCode === 200;
    report('Appwrite Anonymous Session (sgp.cloud.appwrite.io)', isSessionOk, `Status: ${resApi.statusCode}, UserId: ${session?.userId}, Provider: ${session?.provider}`);
  } catch (err) {
    report('Appwrite Anonymous Session (sgp.cloud.appwrite.io)', false, err.message);
  }

  // --- 5. TEST REALTIME CPP (CLOUD PEER PROTOCOL) / MQTT BROKER CONNECTION ---
  console.log('\n--- 5. Testing Realtime CPP / MQTT P2P Broker Connection ---');
  const testTopic = `scoopcast/test_cpp_${Date.now()}`;
  const testMsg = JSON.stringify({ event: 'CPP_TEST_PING', timestamp: Date.now() });

  const mqttSuccess = await new Promise((resolve) => {
    let client;
    const timeout = setTimeout(() => {
      if (client) client.end();
      resolve({ ok: false, error: 'MQTT connection timed out after 10 seconds' });
    }, 10000);

    try {
      client = mqtt.connect('wss://broker.emqx.io:8084/mqtt', {
        clientId: `cpp_test_${Math.random().toString(16).slice(2, 8)}`,
        clean: true,
        connectTimeout: 8000
      });

      client.on('connect', () => {
        client.subscribe(testTopic, (err) => {
          if (err) {
            clearTimeout(timeout);
            client.end();
            resolve({ ok: false, error: err.message });
            return;
          }
          client.publish(testTopic, testMsg);
        });
      });

      client.on('message', (topic, message) => {
        if (topic === testTopic) {
          clearTimeout(timeout);
          client.end();
          resolve({ ok: true, details: `Topic: ${topic}, Roundtrip payload verified: ${message.toString()}` });
        }
      });

      client.on('error', (err) => {
        clearTimeout(timeout);
        client.end();
        resolve({ ok: false, error: err.message });
      });
    } catch (e) {
      clearTimeout(timeout);
      resolve({ ok: false, error: e.message });
    }
  });

  report('CPP Realtime MQTT/WebSocket P2P Broker (broker.emqx.io:8084)', mqttSuccess.ok, mqttSuccess.ok ? mqttSuccess.details : mqttSuccess.error);

  console.log('\n====================================================');
  console.log(`📊 FINAL RESULT: ${passedTests} / ${totalTests} CHECKS PASSED`);
  console.log('====================================================');

  if (passedTests === totalTests) {
    console.log('🎉 ALL PRODUCTION CONNECTIONS & LAYERS FULLY OPERATIONAL!');
    process.exit(0);
  } else {
    console.error('⚠️ SOME CHECKS FAILED');
    process.exit(1);
  }
}

runConnectionTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
