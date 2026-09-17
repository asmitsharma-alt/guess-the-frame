const { execSync } = require('child_process');

const dbId = 'guess_the_frame';

function run(cmd) {
  console.log(`> ${cmd}`);
  try {
    const out = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    console.log(out.trim());
  } catch (err) {
    console.error(`ERROR: ${err.stderr || err.message}`);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('--- Creating Attributes for `rooms` ---');
  run(`appwrite databases create-string-attribute --database-id ${dbId} --collection-id rooms --key roomId --size 64 --required --json`);
  await sleep(1000);
  run(`appwrite databases create-string-attribute --database-id ${dbId} --collection-id rooms --key roomCode --size 16 --required --json`);
  await sleep(1000);
  run(`appwrite databases create-string-attribute --database-id ${dbId} --collection-id rooms --key hostId --size 64 --required --json`);
  await sleep(1000);
  run(`appwrite databases create-string-attribute --database-id ${dbId} --collection-id rooms --key status --size 32 --xdefault lobby --json`);
  await sleep(1000);
  run(`appwrite databases create-integer-attribute --database-id ${dbId} --collection-id rooms --key currentRound --xdefault 0 --json`);
  await sleep(1000);
  run(`appwrite databases create-string-attribute --database-id ${dbId} --collection-id rooms --key currentSection --size 32 --xdefault frames --json`);
  await sleep(1000);
  run(`appwrite databases create-integer-attribute --database-id ${dbId} --collection-id rooms --key timer --xdefault 30 --json`);
  await sleep(1000);
  run(`appwrite databases create-integer-attribute --database-id ${dbId} --collection-id rooms --key totalRounds --xdefault 40 --json`);
  await sleep(1000);
  run(`appwrite databases create-string-attribute --database-id ${dbId} --collection-id rooms --key categories --size 255 --xdefault "frames,eyes,dialogue" --json`);
  await sleep(1000);
  run(`appwrite databases create-integer-attribute --database-id ${dbId} --collection-id rooms --key createdAt --xdefault 0 --json`);
  await sleep(1000);
  run(`appwrite databases create-integer-attribute --database-id ${dbId} --collection-id rooms --key updatedAt --xdefault 0 --json`);
  await sleep(1000);

  console.log('--- Creating Attributes for `players` ---');
  run(`appwrite databases create-string-attribute --database-id ${dbId} --collection-id players --key playerId --size 64 --required --json`);
  await sleep(1000);
  run(`appwrite databases create-string-attribute --database-id ${dbId} --collection-id players --key roomId --size 64 --required --json`);
  await sleep(1000);
  run(`appwrite databases create-string-attribute --database-id ${dbId} --collection-id players --key name --size 64 --required --json`);
  await sleep(1000);
  run(`appwrite databases create-string-attribute --database-id ${dbId} --collection-id players --key avatar --size 64 --xdefault aman --json`);
  await sleep(1000);
  run(`appwrite databases create-string-attribute --database-id ${dbId} --collection-id players --key status --size 32 --xdefault connected --json`);
  await sleep(1000);
  run(`appwrite databases create-integer-attribute --database-id ${dbId} --collection-id players --key lastHeartbeat --xdefault 0 --json`);
  await sleep(1000);
  run(`appwrite databases create-integer-attribute --database-id ${dbId} --collection-id players --key score --xdefault 0 --json`);
  await sleep(1000);
  run(`appwrite databases create-boolean-attribute --database-id ${dbId} --collection-id players --key isHost --xdefault false --json`);
  await sleep(1000);
  run(`appwrite databases create-string-attribute --database-id ${dbId} --collection-id players --key color --size 32 --xdefault "#57c3e0" --json`);
  await sleep(1000);

  console.log('--- Creating Attributes for `game_state` ---');
  run(`appwrite databases create-string-attribute --database-id ${dbId} --collection-id game_state --key roomId --size 64 --required --json`);
  await sleep(1000);
  run(`appwrite databases create-integer-attribute --database-id ${dbId} --collection-id game_state --key roundNumber --xdefault 1 --json`);
  await sleep(1000);
  run(`appwrite databases create-string-attribute --database-id ${dbId} --collection-id game_state --key phase --size 32 --xdefault guessing --json`);
  await sleep(1000);
  run(`appwrite databases create-string-attribute --database-id ${dbId} --collection-id game_state --key currentImage --size 1024 --xdefault "" --json`);
  await sleep(1000);
  run(`appwrite databases create-string-attribute --database-id ${dbId} --collection-id game_state --key dialogueText --size 1024 --xdefault "" --json`);
  await sleep(1000);
  run(`appwrite databases create-string-attribute --database-id ${dbId} --collection-id game_state --key dialogueContext --size 255 --xdefault "" --json`);
  await sleep(1000);
  run(`appwrite databases create-string-attribute --database-id ${dbId} --collection-id game_state --key maskedHint --size 255 --xdefault "" --json`);
  await sleep(1000);
  run(`appwrite databases create-string-attribute --database-id ${dbId} --collection-id game_state --key revealedAnswer --size 255 --xdefault "" --json`);
  await sleep(1000);
  run(`appwrite databases create-string-attribute --database-id ${dbId} --collection-id game_state --key winners --size 4096 --xdefault "[]" --json`);
  await sleep(1000);
  run(`appwrite databases create-integer-attribute --database-id ${dbId} --collection-id game_state --key startedAt --xdefault 0 --json`);
  await sleep(1000);
  run(`appwrite databases create-integer-attribute --database-id ${dbId} --collection-id game_state --key version --xdefault 1 --json`);
  await sleep(1000);

  console.log('--- Creating Attributes for `match_history` ---');
  run(`appwrite databases create-string-attribute --database-id ${dbId} --collection-id match_history --key matchId --size 64 --required --json`);
  await sleep(1000);
  run(`appwrite databases create-string-attribute --database-id ${dbId} --collection-id match_history --key roomId --size 64 --required --json`);
  await sleep(1000);
  run(`appwrite databases create-string-attribute --database-id ${dbId} --collection-id match_history --key winner --size 128 --required --json`);
  await sleep(1000);
  run(`appwrite databases create-string-attribute --database-id ${dbId} --collection-id match_history --key players --size 4096 --xdefault "[]" --json`);
  await sleep(1000);
  run(`appwrite databases create-string-attribute --database-id ${dbId} --collection-id match_history --key scores --size 4096 --xdefault "{}" --json`);
  await sleep(1000);
  run(`appwrite databases create-string-attribute --database-id ${dbId} --collection-id match_history --key date --size 64 --required --json`);
  await sleep(1000);

  console.log('--- All Attributes Created! ---');
}

main();
